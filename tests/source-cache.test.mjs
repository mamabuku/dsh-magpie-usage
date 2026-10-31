import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, writeFile, mkdir } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createRoutes, ROUTE_PREFIX } from '../lib/host/routes.js';
import { writeSettings } from '../lib/host/settings.js';

function fakeReq(method, url) {
  return { method, url, async *[Symbol.asyncIterator]() {} };
}

function fakeRes() {
  return {
    status: 0,
    headers: {},
    payload: undefined,
    setHeader(name, value) {
      this.headers[name] = value;
    },
    writeHead(status) {
      this.status = status;
    },
    end(body) {
      this.payload = JSON.parse(body);
    },
  };
}

/** A cache dir with a real-shaped quotas.json + credits-daily.json. */
async function cacheDir() {
  const dir = await mkdtemp(join(tmpdir(), 'mq-source-'));
  await writeFile(
    join(dir, 'quotas.json'),
    JSON.stringify({
      'workbuddy/汪国伟': {
        at: '2026-10-30T23:03:19+08:00',
        quota: {
          provider: 'workbuddy',
          name: 'WorkBuddy',
          user: '汪国伟',
          windows: [{ name: 'Credits', used: 14 }],
          readAt: '2026-10-30T23:03:19+08:00',
        },
      },
    }),
  );
  await writeFile(
    join(dir, 'credits-daily.json'),
    JSON.stringify({ 'workbuddy|汪国伟|Credits': { since: '2026-10-01', days: { '2026-10-30': 1.5 } } }),
  );
  return dir;
}

const CONFIG = {
  baseUrl: 'http://127.0.0.1:3425',
  timeoutMs: 100,
  cacheTtlMs: 15000,
  negativeTtlMs: 10000,
  maxAgeMs: 86400000,
  period: '30d',
};

async function routesWith({ fetchJson, settingsPatch, withCache }) {
  const dir = withCache ? await cacheDir() : await mkdtemp(join(tmpdir(), 'mq-empty-'));
  const settingsFile = join(dir, 'settings.json');
  if (settingsPatch !== undefined) await writeSettings({ settingsFile }, settingsPatch);
  return createRoutes({ config: { ...CONFIG, configDir: dir, settingsFile }, fetchJson });
}

test('source=cache never calls the live endpoints and marks the snapshot', async () => {
  const seen = [];
  const routes = await routesWith({
    settingsPatch: { source: 'cache' },
    withCache: true,
    fetchJson: async (path) => {
      seen.push(path);
      return { data: [] };
    },
  });
  const res = fakeRes();
  await routes.snapshot(fakeReq('GET', ROUTE_PREFIX + '/snapshot'), res);
  assert.equal(res.status, 200);
  assert.deepEqual(seen, [], 'cache mode must not touch the network');
  assert.equal(res.payload.sourceMode, 'cache');
  assert.equal(res.payload.ok, true);
  assert.equal(res.payload.accounts[0].key, 'workbuddy|汪国伟');
  const live = res.payload.sources.find((s) => s.id === 'magpie-live');
  assert.equal(live.ok, false);
  assert.match(live.error, /source=cache/);
});

test('a failing live endpoint falls back to cache: ok=true, live source down', async () => {
  const routes = await routesWith({
    withCache: true,
    fetchJson: async () => {
      throw new Error('connect ECONNREFUSED 127.0.0.1:3425');
    },
  });
  const res = fakeRes();
  await routes.snapshot(fakeReq('GET', ROUTE_PREFIX + '/snapshot'), res);
  assert.equal(res.status, 200);
  assert.equal(res.payload.ok, true);
  assert.equal(res.payload.sourceMode, 'live');
  assert.equal(res.payload.error, null);
  assert.equal(res.payload.sources.find((s) => s.id === 'magpie-live').ok, false);
  assert.equal(res.payload.accounts[0].key, 'workbuddy|汪国伟');
});

test('a live failure opens a negative window: the next pull hits upstream zero times', async () => {
  let calls = 0;
  const routes = await routesWith({
    withCache: false,
    fetchJson: async () => {
      calls += 1;
      throw new Error('connect ECONNREFUSED 127.0.0.1:3425');
    },
  });
  const first = fakeRes();
  await routes.snapshot(fakeReq('GET', ROUTE_PREFIX + '/snapshot'), first);
  assert.equal(first.payload.ok, false);
  const afterFirst = calls;
  assert.ok(afterFirst > 0, 'the first pull must try upstream');

  const second = fakeRes();
  await routes.snapshot(fakeReq('GET', ROUTE_PREFIX + '/snapshot'), second);
  assert.equal(calls, afterFirst, 'the negative window must suppress the retry');
  assert.equal(second.payload.cached, true);
  assert.equal(second.payload.ok, false);
  assert.match(second.payload.error, /ECONNREFUSED/);

  const forced = fakeRes();
  await routes.snapshot(fakeReq('GET', ROUTE_PREFIX + '/snapshot?force=1'), forced);
  assert.ok(calls > afterFirst, 'force=1 must retry despite the window');
});

test('a failed body does not enter the positive cache: recovery is served fresh', async () => {
  let healthy = false;
  const routes = await routesWith({
    withCache: false,
    fetchJson: async (path) => {
      if (healthy && path.startsWith('/v1/magpie/quotas')) return { data: [] };
      if (healthy && path.startsWith('/v1/magpie/usage')) return { period: '30d', series: [] };
      throw new Error('connect ECONNREFUSED 127.0.0.1:3425');
    },
  });
  await routes.snapshot(fakeReq('GET', ROUTE_PREFIX + '/snapshot'), fakeRes());
  healthy = true;
  // Inside the negative window an unforced pull would still serve the failed
  // document; force=1 is the documented way to retry immediately.
  const recovered = fakeRes();
  await routes.snapshot(fakeReq('GET', ROUTE_PREFIX + '/snapshot?force=1'), recovered);
  assert.equal(recovered.payload.ok, true);
  assert.equal(recovered.payload.cached, false, 'a recovered snapshot must not be the stale failed one');
});

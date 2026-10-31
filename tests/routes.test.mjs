import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRoutes, ROUTES, ROUTE_PREFIX } from '../lib/host/routes.js';

/** Minimal Node http req/res doubles. */
function fakeReq(method, url, body) {
  const chunks = body === undefined ? [] : [Buffer.from(JSON.stringify(body))];
  return {
    method,
    url,
    async *[Symbol.asyncIterator]() {
      for (const chunk of chunks) yield chunk;
    },
  };
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

const CONFIG = {
  baseUrl: 'http://127.0.0.1:3425',
  timeoutMs: 100,
  cacheTtlMs: 15000,
  maxAgeMs: 86400000,
  period: '30d',
  configDir: '/nonexistent-magpie-dir',
  settingsFile: '/nonexistent-magpie-settings.json',
};

function routesWith(fetchJson) {
  return createRoutes({ config: CONFIG, fetchJson });
}

test('the plugin owns exactly five exact routes', () => {
  assert.equal(ROUTES.length, 5);
  assert.deepEqual(
    ROUTES.map((r) => r.path),
    [
      ROUTE_PREFIX + '/snapshot',
      ROUTE_PREFIX + '/refresh',
      ROUTE_PREFIX + '/history',
      ROUTE_PREFIX + '/icon',
      ROUTE_PREFIX + '/settings',
    ],
  );
  for (const route of ROUTES) assert.equal(route.kind, 'exact');
});

test('snapshot answers 200 with the merged document', async () => {
  const routes = routesWith(async (path) => {
    if (path === '/v1/magpie/quotas') {
      return { data: [{ provider: 'codex', name: 'Codex', user: 'a@b.c', windows: [{ name: '30 days', used: 62 }] }] };
    }
    if (path.startsWith('/v1/magpie/usage')) return { period: '30d', calls: 3, series: [] };
    throw new Error('unexpected ' + path);
  });
  const res = fakeRes();
  await routes.snapshot(fakeReq('GET', ROUTE_PREFIX + '/snapshot'), res);
  assert.equal(res.status, 200);
  assert.equal(res.payload.ok, true);
  assert.equal(res.payload.accounts.length, 1);
  assert.equal(res.payload.period, '30d');
  assert.equal(res.headers['content-type'], 'application/json; charset=utf-8');
});

test('a dead Magpie still answers 200 with ok:false and the reason', async () => {
  const routes = routesWith(async () => {
    throw new Error('connect ECONNREFUSED 127.0.0.1:3425');
  });
  const res = fakeRes();
  await routes.snapshot(fakeReq('GET', ROUTE_PREFIX + '/snapshot'), res);
  assert.equal(res.status, 200);
  assert.equal(res.payload.ok, false);
  assert.match(res.payload.error, /ECONNREFUSED/);
  assert.equal(res.payload.accounts.length, 0);
});

test('the snapshot cache is reused until forced', async () => {
  let calls = 0;
  const routes = routesWith(async (path) => {
    calls += 1;
    return path.startsWith('/v1/magpie/usage') ? { period: '30d', series: [] } : { data: [] };
  });
  await routes.snapshot(fakeReq('GET', ROUTE_PREFIX + '/snapshot'), fakeRes());
  const second = fakeRes();
  await routes.snapshot(fakeReq('GET', ROUTE_PREFIX + '/snapshot'), second);
  assert.equal(second.payload.cached, true);
  const before = calls;
  await routes.snapshot(fakeReq('GET', ROUTE_PREFIX + '/snapshot?force=1'), fakeRes());
  assert.ok(calls > before, 'force must refetch');
});

test('an unknown period falls back to the configured one', async () => {
  const seen = [];
  const routes = routesWith(async (path) => {
    seen.push(path);
    return path.startsWith('/v1/magpie/usage') ? { series: [] } : { data: [] };
  });
  const res = fakeRes();
  await routes.snapshot(fakeReq('GET', ROUTE_PREFIX + '/snapshot?period=99y'), res);
  assert.equal(res.payload.period, '30d');
  assert.ok(seen.some((p) => p.includes('period=30d')));
});

test('non-GET snapshot is rejected', async () => {
  const res = fakeRes();
  await routesWith(async () => ({ data: [] })).snapshot(fakeReq('POST', ROUTE_PREFIX + '/snapshot'), res);
  assert.equal(res.status, 405);
});

test('history requires a provider and returns its lines', async () => {
  const routes = routesWith(async () => ({
    data: [
      { provider: 'cline', user: 'u', lines: [{ name: 'Weekly', points: [{ at: '2026-10-30T00:00:00Z', left: 46 }] }] },
    ],
  }));
  const missing = fakeRes();
  await routes.history(fakeReq('GET', ROUTE_PREFIX + '/history'), missing);
  assert.equal(missing.status, 400);

  const found = fakeRes();
  await routes.history(fakeReq('GET', ROUTE_PREFIX + '/history?provider=cline'), found);
  assert.equal(found.status, 200);
  assert.equal(found.payload.lines[0].points[0].left, 46);
});

test('history reuses its 60s cache across calls', async () => {
  let calls = 0;
  const routes = routesWith(async () => {
    calls += 1;
    return {
      data: [{ provider: 'cline', user: 'u', lines: [{ name: 'Weekly', points: [{ at: 't', left: 1 }] }] }],
    };
  });
  const first = fakeRes();
  await routes.history(fakeReq('GET', ROUTE_PREFIX + '/history?provider=cline'), first);
  assert.equal(first.status, 200);
  const second = fakeRes();
  await routes.history(fakeReq('GET', ROUTE_PREFIX + '/history?provider=cline&user=u'), second);
  assert.equal(second.status, 200);
  assert.equal(calls, 1, 'the second call within 60s must reuse the cached history body');
});

test('settings GET answers defaults and POST persists a patch', async () => {
  const dir = await import('node:fs/promises').then((fs) => fs.mkdtemp('/tmp/magpie-usage-routes-'));
  const config = { ...CONFIG, settingsFile: dir + '/settings.json' };
  const routes = createRoutes({ config, fetchJson: async () => ({ data: [] }) });

  const got = fakeRes();
  await routes.settings(fakeReq('GET', ROUTE_PREFIX + '/settings'), got);
  assert.equal(got.status, 200);
  assert.equal(got.payload.settings.placement, 'dock');

  const posted = fakeRes();
  await routes.settings(fakeReq('POST', ROUTE_PREFIX + '/settings', { placement: 'orb' }), posted);
  assert.equal(posted.status, 200);
  assert.equal(posted.payload.settings.placement, 'orb');

  const reread = fakeRes();
  await routes.settings(fakeReq('GET', ROUTE_PREFIX + '/settings'), reread);
  assert.equal(reread.payload.settings.placement, 'orb');

  // `bottom` is gone; a saved value from an older release lands on the dock chip.
  const legacy = fakeRes();
  await routes.settings(fakeReq('POST', ROUTE_PREFIX + '/settings', { placement: 'bottom' }), legacy);
  assert.equal(legacy.payload.settings.placement, 'dock');
});

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { normalizeWindow, windowEta, buildSnapshot } from '../lib/host/snapshot.js';
import { readJsonFile } from '../lib/host/http.js';
import { createRoutes, ROUTE_PREFIX } from '../lib/host/routes.js';
import { writeSettings } from '../lib/host/settings.js';

const CFG = { maxAgeMs: 86400000 };
const NOW = Date.parse('2026-10-30T23:10:00+08:00');
const HOUR = 3600e3;

test('window periods are inferred from Magpie prose, unknown prose stays null', () => {
  const periodOf = (name) => normalizeWindow({ name, used: 1 }, 'p', 0).periodMs;
  assert.equal(periodOf('5 hours'), 5 * HOUR);
  assert.equal(periodOf('Droid Core · 5 hours'), 5 * HOUR, 'product prefixes are stripped like windowLabel does');
  assert.equal(periodOf('7 days'), 7 * 86400e3);
  assert.equal(periodOf('Weekly'), 7 * 86400e3);
  assert.equal(periodOf('30 days'), 30 * 86400e3);
  assert.equal(periodOf('24 hours'), 24 * HOUR);
  assert.equal(periodOf('Credits'), 24 * HOUR);
  assert.equal(periodOf('Month'), 30 * 86400e3);
  assert.equal(periodOf('Key quota'), null);
  assert.equal(periodOf('Free model tokens'), null);
  assert.equal(periodOf('Something else'), null);
  assert.equal(periodOf(''), null);
  assert.equal(normalizeWindow({}, 'p', 0).periodMs, null);
});

test('startsAt is resetsAt minus the period, and never fabricated', () => {
  const known = normalizeWindow(
    { name: '7 days', used: 10, resetsAt: '2026-11-06T00:00:00Z' },
    'p',
    0,
  );
  assert.equal(known.startsAt, '2026-10-30T00:00:00.000Z');

  const noReset = normalizeWindow({ name: '7 days', used: 10 }, 'p', 0);
  assert.equal(noReset.startsAt, null, 'no resetsAt, no start');

  const badReset = normalizeWindow({ name: '7 days', used: 10, resetsAt: 'not a date' }, 'p', 0);
  assert.equal(badReset.startsAt, null);

  const unknownPeriod = normalizeWindow(
    { name: 'Key quota', used: 10, resetsAt: '2026-11-06T00:00:00Z' },
    'p',
    0,
  );
  assert.equal(unknownPeriod.startsAt, null, 'unknown period, no start');
});

/** A perfectly linear decline so the least-squares fit is exact. */
function decliningPoints(t0, lefts, stepMs) {
  return lefts.map((left, i) => ({ at: new Date(t0 + i * stepMs).toISOString(), left }));
}

test('quotaEta extrapolates a real decline to left=0', () => {
  const t0 = Date.parse('2026-10-30T18:00:00Z');
  const points = decliningPoints(t0, [90, 60, 30], HOUR);
  const eta = windowEta(points, null, '2027-01-01T00:00:00Z', t0 + 7300e3);
  assert.equal(eta.etaPastReset, false);
  assert.equal(eta.etaAt, new Date(t0 + 3 * HOUR).toISOString(), '90→0 at −30/h crosses zero 3h in');

  // The same fit surfaces on the window inside a full snapshot. resetsAt is
  // chosen so the inferred cycle start (resetsAt − 7d) is exactly t0: the
  // cycle-start filter must keep all three points.
  const snapshot = buildSnapshot({
    live: {
      data: [
        {
          provider: 'codex',
          name: 'Codex',
          user: 'a@b.c',
          windows: [{ name: '7 days', used: 40, resetsAt: '2026-11-06T18:00:00Z' }],
        },
      ],
    },
    history: {
      data: [{ provider: 'codex', user: 'a@b.c', lines: [{ name: '7 days', points }] }],
    },
    config: CFG,
    nowMs: t0 + 7300e3,
    errors: {},
  });
  const win = snapshot.accounts[0].windows[0];
  assert.equal(win.etaAt, new Date(t0 + 3 * HOUR).toISOString());
  assert.equal(win.etaPastReset, false);
});

test('quotaEta refuses flat, short, short-span or already-gone readings', () => {
  const t0 = Date.parse('2026-10-30T18:00:00Z');
  const now = t0 + 7300e3;

  assert.equal(windowEta(decliningPoints(t0, [90, 60], HOUR), null, null, now), null, 'fewer than 3 points');
  assert.equal(
    windowEta(decliningPoints(t0, [90, 89, 88], 60e3), null, null, now),
    null,
    'span under an hour',
  );
  assert.equal(
    windowEta(decliningPoints(t0, [10, 20, 30], HOUR), null, null, now),
    null,
    'rising slope',
  );
  assert.equal(windowEta(decliningPoints(t0, [30, 30, 30], HOUR), null, null, now), null, 'flat slope');
  assert.equal(
    windowEta(decliningPoints(t0, [3, 2, 1], HOUR), null, null, t0 + 4 * HOUR),
    null,
    'crossing already in the past',
  );
  assert.equal(windowEta([], null, null, now), null);
  assert.equal(
    windowEta([{ at: 'garbage', left: 5 }, { at: t0, left: 'x' }], null, null, now),
    null,
    'unparsable points',
  );
});

test('a crossing at or after the reset is etaPastReset, not a time', () => {
  const t0 = Date.parse('2026-10-30T18:00:00Z');
  const points = decliningPoints(t0, [90, 60, 30], HOUR);
  const eta = windowEta(points, null, new Date(t0 + 2 * HOUR).toISOString(), t0 + 7300e3);
  assert.deepEqual(eta, { etaAt: null, etaPastReset: true });

  const justBefore = windowEta(points, null, new Date(t0 + 3 * HOUR + 1).toISOString(), t0 + 7300e3);
  assert.equal(justBefore.etaPastReset, false);
  assert.equal(justBefore.etaAt, new Date(t0 + 3 * HOUR).toISOString());
});

test('eta aligns by provider + user + window name and stays null on a miss', () => {
  const t0 = Date.parse('2026-10-30T18:00:00Z');
  const points = decliningPoints(t0, [90, 60, 30], HOUR);
  const snapshot = buildSnapshot({
    live: {
      data: [
        { provider: 'codex', name: 'Codex', user: 'a@b.c', windows: [{ name: '7 days', used: 40, resetsAt: '2026-11-06T18:00:00Z' }] },
      ],
    },
    history: {
      data: [{ provider: 'codex', user: 'someone-else', lines: [{ name: '7 days', points }] }],
    },
    config: CFG,
    nowMs: t0 + 7300e3,
    errors: {},
  });
  assert.equal(snapshot.accounts[0].windows[0].etaAt, null, 'user mismatch, no fit');
});

test('fx: a readable file gives rate and at, a missing one degrades to nulls', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'mq-fx-'));
  const fxFile = join(dir, 'fxrate.json');
  await writeFile(fxFile, JSON.stringify({ rate: 6.676858, at: '2026-10-30T22:17:21.31408+08:00' }));

  assert.deepEqual(await readJsonFile(fxFile), { rate: 6.676858, at: '2026-10-30T22:17:21.31408+08:00' });
  assert.equal(await readJsonFile(join(dir, 'absent.json')), null);

  const withFx = buildSnapshot({ config: CFG, nowMs: NOW, errors: {}, fx: { rate: 6.676858, at: '2026-10-30T22:17:21+08:00' } });
  assert.deepEqual(withFx.fx, { rate: 6.676858, at: '2026-10-30T22:17:21+08:00' });

  const withoutFx = buildSnapshot({ config: CFG, nowMs: NOW, errors: {}, fx: null });
  assert.deepEqual(withoutFx.fx, { rate: null, at: null });

  const junkFx = buildSnapshot({ config: CFG, nowMs: NOW, errors: {}, fx: { rate: 'n/a', at: 5 } });
  assert.deepEqual(junkFx.fx, { rate: null, at: null }, 'junk fields never become numbers');
});

test('the snapshot route reads the fx file and serves its rate', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'mq-fx-route-'));
  await writeFile(join(dir, 'fxrate.json'), JSON.stringify({ rate: 6.68, at: '2026-10-30T22:17:21+08:00' }));
  const settingsFile = join(dir, 'settings.json');
  await writeSettings({ settingsFile }, {});
  const routes = createRoutes({
    config: {
      baseUrl: 'http://127.0.0.1:3425',
      timeoutMs: 100,
      cacheTtlMs: 15000,
      maxAgeMs: 86400000,
      period: '30d',
      configDir: dir,
      settingsFile,
      fxFile: join(dir, 'fxrate.json'),
    },
    fetchJson: async (path) => {
      if (path === '/v1/magpie/quotas') return { data: [] };
      if (path.startsWith('/v1/magpie/usage')) return { period: '30d', series: [] };
      if (path === '/v1/magpie/quotas/cards') return { data: [] };
      if (path === '/v1/magpie/quotas/history') return { data: [] };
      throw new Error('unexpected ' + path);
    },
  });
  const res = {
    status: 0,
    headers: {},
    payload: undefined,
    setHeader(n, v) {
      this.headers[n] = v;
    },
    writeHead(s) {
      this.status = s;
    },
    end(b) {
      this.payload = JSON.parse(b);
    },
  };
  await routes.snapshot({ method: 'GET', url: ROUTE_PREFIX + '/snapshot', async *[Symbol.asyncIterator]() {} }, res);
  assert.equal(res.status, 200);
  assert.deepEqual(res.payload.fx, { rate: 6.68, at: '2026-10-30T22:17:21+08:00' });
});

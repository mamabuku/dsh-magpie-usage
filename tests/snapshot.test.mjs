import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  windowLabel,
  maskUser,
  normalizeWindow,
  normalizeLiveEntry,
  normalizeCacheEntry,
  mergeAccounts,
  normalizeUsage,
  buildSnapshot,
} from '../lib/host/snapshot.js';

const NOW = Date.parse('2026-10-30T23:10:00+08:00');
const CFG = { maxAgeMs: 24 * 60 * 60 * 1000 };

function liveEntry(over = {}) {
  return {
    provider: 'codex',
    name: 'Codex',
    kind: 'subscription',
    plan: 'free',
    user: 'a18606844604@gmail.com',
    windows: [{ name: '30 days', used: 62, remaining: 38, resetsAt: '2026-11-20T17:17:18+08:00' }],
    readAt: '2026-10-30T23:07:38.151123+08:00',
    ...over,
  };
}

test('windowLabel maps Magpie prose to panel labels', () => {
  assert.equal(windowLabel('5 hours'), '5 小时');
  assert.equal(windowLabel('Weekly'), '每周');
  assert.equal(windowLabel('Month'), '月度');
  assert.equal(windowLabel('30 days'), '30 天');
  assert.equal(windowLabel('Credits'), '积分');
  assert.equal(windowLabel('Key quota'), 'Key 额度');
  assert.equal(windowLabel('Something else'), 'Something else');
  assert.equal(windowLabel(''), '额度');
});

test('maskUser hides most of an address but keeps the domain', () => {
  assert.equal(maskUser('a18606844604@gmail.com'), 'a1860…@gmail.com');
  assert.equal(maskUser('wy'), 'wy');
  assert.equal(maskUser(''), null);
  assert.equal(maskUser(undefined), null);
});

test('normalizeWindow derives remaining from used and never invents a value', () => {
  const a = normalizeWindow({ name: 'Weekly', used: 54 }, 'cline', 0);
  assert.equal(a.remaining, 46);
  assert.equal(a.label, '每周');
  assert.equal(a.resetsAt, null);

  const b = normalizeWindow({ name: 'Weekly', used: null, remaining: null }, 'cline', 1);
  assert.equal(b.used, null);
  assert.equal(b.remaining, null);
});

test('a live entry with windows is a subscription with status ok', () => {
  const account = normalizeLiveEntry(liveEntry(), NOW, CFG.maxAgeMs);
  assert.equal(account.status, 'ok');
  assert.equal(account.kind, 'subscription');
  assert.equal(account.key, 'codex|a18606844604@gmail.com');
  assert.equal(account.userMasked, 'a1860…@gmail.com');
  assert.equal(account.windows.length, 1);
  assert.equal(account.windows[0].label, '30 天');
});

test('a balance-only account keeps its money string', () => {
  const account = normalizeLiveEntry(
    {
      provider: 'lobster',
      name: 'LobsterAI',
      kind: 'subscription',
      plan: '标准',
      user: 'urs-phone@163.com',
      windows: [],
      balance: '1155.86 点数',
      readAt: '2026-10-30T23:03:37.033265+08:00',
    },
    NOW,
    CFG.maxAgeMs,
  );
  assert.equal(account.balance.text, '1155.86 点数');
  assert.equal(account.shape, 'balance');
  assert.equal(account.kind, 'subscription');
  assert.equal(account.status, 'ok');
});

test('an errored account reports error and keeps the reason', () => {
  const account = normalizeLiveEntry(
    { provider: 'zcode', name: 'ZCode', user: 'ZCode', windows: [], error: 'no GLM Coding Plan' },
    NOW,
    CFG.maxAgeMs,
  );
  assert.equal(account.status, 'error');
  assert.equal(account.error, 'no GLM Coding Plan');
});

test('an account with neither window nor balance is unsupported, not zero', () => {
  const account = normalizeLiveEntry({ provider: 'ghost', name: 'Ghost', user: 'x' }, NOW, CFG.maxAgeMs);
  assert.equal(account.status, 'unsupported');
  assert.equal(account.shape, 'none');
  assert.equal(account.balance, null);
  assert.equal(account.windows.length, 0);
});

test('an old reading is stale, never silently dropped', () => {
  const account = normalizeLiveEntry(
    liveEntry({ readAt: '2026-10-20T00:05:48.490732+08:00' }),
    NOW,
    CFG.maxAgeMs,
  );
  assert.equal(account.status, 'stale');
});

test('the cache shape normalizes onto the same Account contract', () => {
  const account = normalizeCacheEntry(
    'cline/api key …d2c2',
    {
      at: '2026-10-30T23:03:19.562713+08:00',
      quota: {
        provider: 'cline',
        name: 'Cline',
        user: 'usr-01M56Y1M29D3C2PGE6N6RJQJKM',
        windows: [{ name: '5 hours', used: 1, resetsAt: '2026-10-30T16:10:05.228Z' }],
        balance: '$0.35',
        readAt: '2026-10-30T23:03:19.562701+08:00',
      },
    },
    NOW,
    CFG.maxAgeMs,
  );
  assert.equal(account.key, 'cline|usr-01M56Y1M29D3C2PGE6N6RJQJKM');
  assert.equal(account.balance.text, '$0.35');
  assert.equal(account.source, 'magpie-cache');
  assert.equal(account.windows[0].label, '5 小时');
});

test('live wins over cache for the same account', () => {
  const live = normalizeLiveEntry(liveEntry(), NOW, CFG.maxAgeMs);
  const cached = normalizeCacheEntry(
    'codex/a18606844604@gmail.com',
    { quota: { provider: 'codex', name: 'Codex', user: 'a18606844604@gmail.com', windows: [] } },
    NOW,
    CFG.maxAgeMs,
  );
  const merged = mergeAccounts([live], [cached]);
  assert.equal(merged.length, 1);
  assert.equal(merged[0].source, 'magpie-live');
});

test('four WorkBuddy logins stay four accounts (regression)', () => {
  const users = ['汪国伟', '何桂桂', '英子', '黑娃®'];
  const live = users.map((user) =>
    normalizeLiveEntry(
      { provider: 'workbuddy', name: 'WorkBuddy', user, windows: [{ name: 'Credits', used: 14 }] },
      NOW,
      CFG.maxAgeMs,
    ),
  );
  const merged = mergeAccounts(live, []);
  assert.equal(merged.length, 4);
  assert.deepEqual(
    merged.map((a) => a.user).sort(),
    [...users].sort(),
  );
});

test('usage totals and series normalize', () => {
  const usage = normalizeUsage({
    period: '30d',
    calls: 20060,
    cost: 74.15,
    unpriced: 16707,
    cache_read: 4814852415,
    series: [{ label: 'Oct 1', time: '2026-10-01T00:00:00+08:00', calls: 0, cost: 0 }],
  });
  assert.equal(usage.totals.calls, 20060);
  assert.equal(usage.totals.cacheRead, 4814852415);
  assert.equal(usage.series.length, 1);
  assert.equal(normalizeUsage(null), null);
});

test('buildSnapshot merges live and cache and reports per-source state', () => {
  const snapshot = buildSnapshot({
    live: { data: [liveEntry(), { provider: 'workbuddy', name: 'WorkBuddy', user: 'A', windows: [] }] },
    cache: {
      'deepseek/balance': {
        quota: { provider: 'deepseek', name: 'DeepSeek', windows: [], balance: '¥0.00' },
      },
    },
    usage: { period: '30d', calls: 5, series: [] },
    config: CFG,
    nowMs: NOW,
    errors: {},
  });
  assert.equal(snapshot.ok, true);
  assert.equal(snapshot.accounts.length, 3);
  assert.equal(snapshot.sources.find((s) => s.id === 'magpie-live').ok, true);
  assert.equal(snapshot.sources.find((s) => s.id === 'magpie-usage').ok, true);
  assert.equal(snapshot.version, 1);
});

test('buildSnapshot surfaces an offline Magpie without inventing accounts', () => {
  const snapshot = buildSnapshot({
    live: null,
    cache: null,
    usage: null,
    config: CFG,
    nowMs: NOW,
    errors: { live: 'timeout after 8000ms', cache: 'quotas.json 不可读' },
  });
  assert.equal(snapshot.ok, false);
  assert.equal(snapshot.accounts.length, 0);
  assert.match(snapshot.error, /timeout/);
});

test('buildSnapshot keeps serving cache when the live call fails', () => {
  const snapshot = buildSnapshot({
    live: null,
    cache: { 'cline/k': { quota: { provider: 'cline', name: 'Cline', windows: [{ name: 'Weekly', used: 54 }] } } },
    usage: null,
    config: CFG,
    nowMs: NOW,
    errors: { live: 'connect ECONNREFUSED' },
  });
  assert.equal(snapshot.ok, true);
  assert.equal(snapshot.accounts.length, 1);
  assert.equal(snapshot.sources.find((s) => s.id === 'magpie-live').ok, false);
});

test('a product-prefixed window still reads as its period', () => {
  assert.equal(windowLabel('Droid Core · 5 hours'), '5 小时');
  assert.equal(windowLabel('Droid Core · 30 days'), '30 天');
  assert.equal(windowLabel('7 days'), '7 天');
});

test('colliding window labels fall back to the raw names', () => {
  const account = normalizeLiveEntry(
    {
      provider: 'factory',
      name: 'Factory',
      user: 'API key …G4Ho',
      windows: [{ name: '5 hours', used: 0 }, { name: 'Droid Core · 5 hours', used: 0 }],
    },
    NOW,
    CFG.maxAgeMs,
  );
  assert.deepEqual(
    account.windows.map((w) => w.label),
    ['5 小时', '5 小时（Droid Core）'],
  );
});

test('a provider reported live is not duplicated by its cache entries', () => {
  const live = [
    normalizeLiveEntry({ provider: 'cline', name: 'Cline', user: 'API key …d2c2', windows: [{ name: 'Weekly', used: 55 }] }, NOW, CFG.maxAgeMs),
  ];
  const cached = [
    normalizeCacheEntry(
      'cline/usr-01M56Y1M29D3C2PGE6N6RJQJKM',
      { quota: { provider: 'cline', name: 'Cline', user: 'usr-01M56Y1M29D3C2PGE6N6RJQJKM', windows: [{ name: 'Weekly', used: 54 }] } },
      NOW,
      CFG.maxAgeMs,
    ),
  ];
  assert.equal(mergeAccounts(live, cached).length, 1);
});

test('a cache-only provider still appears, marked stale', () => {
  const live = [normalizeLiveEntry(liveEntry(), NOW, CFG.maxAgeMs)];
  const cached = [
    normalizeCacheEntry(
      'deepseek/balance 6c8214ebbe69390d',
      { at: '2026-10-20T00:05:48.49074+08:00', quota: { provider: 'deepseek', balance: '¥0.00', readAt: '2026-10-20T00:05:48.490732+08:00' } },
      NOW,
      CFG.maxAgeMs,
    ),
  ];
  const merged = mergeAccounts(live, cached);
  assert.equal(merged.length, 2);
  assert.equal(merged[1].provider, 'deepseek');
  assert.equal(merged[1].status, 'stale');
  assert.equal(merged[1].name, 'deepseek');
});

test('kind follows Magpie when it names one, even with no windows', () => {
  const account = normalizeLiveEntry(
    { provider: 'zcode', name: 'ZCode', user: 'ZCode', kind: 'subscription', windows: [], error: 'no plan' },
    NOW,
    CFG.maxAgeMs,
  );
  assert.equal(account.kind, 'subscription');
  assert.equal(account.shape, 'none');
  assert.equal(account.status, 'error');
});


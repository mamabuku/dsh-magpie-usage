/**
 * Field-by-field accuracy audit: compares the Snapshot the panel renders
 * against Magpie's own wire data, and prints one line per check.
 *
 *   node scripts/audit-data.mjs
 *
 * Read-only. Exits non-zero when any check fails, so it can gate a release.
 */
import { join } from 'node:path';
import { open, stat } from 'node:fs/promises';
import { resolveConfig } from '../lib/host/config.js';
import { createFetcher, readJsonFile } from '../lib/host/http.js';
import { buildSnapshot } from '../lib/host/snapshot.js';

const cfg = resolveConfig({});
const fetchJson = createFetcher(cfg);

const results = [];
function check(name, ok, detail) {
  results.push({ name, ok, detail });
}

async function tailRecord(file) {
  try {
    const info = await stat(file);
    const chunk = Math.min(info.size, 64 * 1024);
    const handle = await open(file, 'r');
    const buffer = Buffer.alloc(chunk);
    await handle.read(buffer, 0, chunk, info.size - chunk);
    await handle.close();
    const lines = buffer.toString('utf8').split('\n');
    for (let i = lines.length - 1; i >= 0; i -= 1) {
      const line = lines[i].trim();
      if (line === '') continue;
      try {
        const record = JSON.parse(line);
        if (record && typeof record.provider === 'string') return record;
      } catch { /* partial first line */ }
    }
  } catch { /* no log */ }
  return null;
}

const live = await fetchJson('/v1/magpie/quotas');
const usage = await fetchJson('/v1/magpie/usage?period=30d');
const cache = await readJsonFile(join(cfg.configDir, 'quotas.json'));
const creditsDaily = await readJsonFile(join(cfg.configDir, 'credits-daily.json'));
const lastUsage = await tailRecord(join(cfg.configDir, 'usage.jsonl'));
const snapshot = buildSnapshot({ live, cache, usage, creditsDaily, lastUsage, config: cfg, nowMs: Date.now(), errors: {} });

const raw = Array.isArray(live?.data) ? live.data : [];
const byKey = new Map(snapshot.accounts.map((a) => [a.key, a]));

/* 1. every live entry survives into the snapshot */
for (const entry of raw) {
  const key = entry.provider + '|' + (entry.user ?? entry.name ?? 'default');
  check('account present: ' + key, byKey.has(key), byKey.has(key) ? '' : 'missing from snapshot');
}

/* 2. windows: count, remaining, resetsAt */
for (const entry of raw) {
  const key = entry.provider + '|' + (entry.user ?? entry.name ?? 'default');
  const account = byKey.get(key);
  if (account === undefined) continue;
  const rawWindows = Array.isArray(entry.windows) ? entry.windows : [];
  check('window count: ' + key, account.windows.length === rawWindows.length, account.windows.length + ' vs ' + rawWindows.length);
  for (let i = 0; i < rawWindows.length; i += 1) {
    const rw = rawWindows[i];
    const ow = account.windows[i];
    if (ow === undefined) continue;
    const expected = Number.isFinite(Number(rw.remaining)) ? Number(rw.remaining) : Math.max(0, 100 - Number(rw.used));
    const delta = Math.abs((ow.remaining ?? NaN) - expected);
    check('remaining: ' + key + ' / ' + rw.name, delta < 0.01, 'ours ' + ow.remaining + ' vs raw ' + expected);
    check('resetsAt: ' + key + ' / ' + rw.name, (ow.resetsAt ?? null) === (rw.resetsAt ?? null), String(ow.resetsAt) + ' vs ' + String(rw.resetsAt));
  }
}

/* 3. balance text passes through untouched */
for (const entry of raw) {
  if (typeof entry.balance !== 'string') continue;
  const key = entry.provider + '|' + (entry.user ?? entry.name ?? 'default');
  const account = byKey.get(key);
  check('balance: ' + key, account !== undefined && account.balance?.text === entry.balance, (account?.balance?.text ?? 'null') + ' vs ' + entry.balance);
}

/* 4. usageByAccount joins to the same account row */
const usageRows = Array.isArray(usage?.accounts) ? usage.accounts : [];
for (const row of usageRows.slice(0, 5)) {
  const key = row.provider + '|' + row.account;
  const ours = snapshot.usageByAccount?.[key];
  check('usage join: ' + key, ours !== undefined && ours.calls === Number(row.calls), (ours?.calls ?? 'missing') + ' vs ' + row.calls);
}

/* 5. credits: today's value comes from credits-daily, not invented */
const today = (() => {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
})();
for (const [rawKey, value] of Object.entries(creditsDaily ?? {}).slice(0, 5)) {
  const parts = String(rawKey).split('|');
  const key = parts[0] + '|' + parts[1];
  const ours = snapshot.creditsByAccount?.[key];
  const expected = value?.days?.[today] ?? null;
  const actual = ours?.today ?? null;
  check('credits today: ' + key, actual === expected, String(actual) + ' vs ' + String(expected));
}

/* 6. the "in use" account is the last served request, and it exists */
check(
  'lastRequest matches tail record',
  snapshot.lastRequest !== null && lastUsage !== null && snapshot.lastRequest.provider === lastUsage.provider,
  (snapshot.lastRequest?.provider ?? 'null') + ' vs ' + (lastUsage?.provider ?? 'null'),
);
check(
  'lastRequest points at a real account',
  snapshot.lastRequest !== null && byKey.has(snapshot.lastRequest.key),
  snapshot.lastRequest?.key ?? 'null',
);

/* 7. no fabricated zeros: an unsupported account has no windows and no balance */
for (const account of snapshot.accounts) {
  if (account.status !== 'unsupported') continue;
  check('no fabricated zero: ' + account.key, account.windows.length === 0 && account.balance === null, 'ok');
}

const failed = results.filter((r) => !r.ok);
for (const r of results) {
  if (!r.ok) console.log('FAIL  ' + r.name + (r.detail ? '  [' + r.detail + ']' : ''));
}
console.log('\nchecks: ' + results.length + '  passed: ' + (results.length - failed.length) + '  failed: ' + failed.length);
process.exit(failed.length === 0 ? 0 : 1);

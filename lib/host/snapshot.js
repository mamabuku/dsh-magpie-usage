/**
 * dsh-magpie-usage — the frozen Snapshot contract.
 *
 * Everything the view layer sees is produced here, from Magpie's raw wire
 * shapes, and nowhere else. The panel never parses a Magpie payload itself.
 *
 * Two input shapes exist and both must land on one Account:
 *   live  `/v1/magpie/quotas` → { data: [ { provider, name, kind, plan, user,
 *          windows: [{ name, used, remaining, resetsAt, resetSecs, display }],
 *          balance, readAt, error } ] }        — one entry per ACCOUNT.
 *   cache `~/.config/magpie/quotas.json` → { "<provider>/<account>": { at,
 *          quota: { provider, name, plan, user, windows, balance, readAt } } }
 *
 * Rules that the product spec turns into hard requirements:
 *   - a missing number is never rendered as 0 (status/`null` instead);
 *   - accounts are keyed per ACCOUNT, so four WorkBuddy logins stay four cards
 *     (the previous plugin collapsed them to one — a real defect);
 *   - every reading carries the timestamp its owner wrote, not our read time.
 */

/** Window names Magpie sends in prose, mapped to the panel's labels. */
const WINDOW_LABELS = [
  [/^5\s*hours?$/i, '5 小时'],
  [/^7\s*days?$/i, '7 天'],
  [/^week(ly)?$/i, '每周'],
  [/^(month|monthly)$/i, '月度'],
  [/^(30|31)\s*days?$/i, '30 天'],
  [/^24\s*hours?$/i, '24 小时'],
  [/^credits?$/i, '积分'],
  [/^free\s*model\s*tokens?$/i, '免费模型 token'],
  [/^key\s*quota$/i, 'Key 额度'],
];

/**
 * Magpie names windows in prose, sometimes behind a product prefix
 * ("Droid Core · 5 hours"). The panel shows the period; the raw name stays
 * available for the tooltip and for disambiguation.
 * @param {string} raw
 * @returns {string}
 */
export function windowLabel(raw) {
  const full = typeof raw === 'string' ? raw.trim() : '';
  if (full === '') return '额度';
  const tail = full.includes('·') ? full.split('·').pop().trim() : full;
  for (const [re, label] of WINDOW_LABELS) if (re.test(tail)) return label;
  return tail;
}

/**
 * Two windows can collapse onto one label ("5 hours" and "Droid Core · 5
 * hours"). When that happens, fall back to the raw names so rows stay
 * distinguishable — a duplicated label on a quota bar is worse than a long one.
 * @param {object[]} windows
 * @returns {object[]}
 */
function disambiguate(windows) {
  const counts = new Map();
  for (const w of windows) counts.set(w.label, (counts.get(w.label) || 0) + 1);
  const seen = new Map();
  return windows.map((w) => {
    if (counts.get(w.label) <= 1) return w;
    const nth = (seen.get(w.label) || 0) + 1;
    seen.set(w.label, nth);
    const prefix = w.rawName.includes('·') ? w.rawName.split('·')[0].trim() : '';
    if (prefix !== '') return { ...w, label: w.label + '（' + prefix + '）' };
    // Two bare windows of the same period: keep the first clean, number the rest.
    return nth === 1 ? w : { ...w, label: w.label + ' ' + nth };
  });
}

/**
 * Mask an account identity for display. The full value stays available for
 * the tooltip; the panel never shows a raw address by default.
 * @param {string|null|undefined} user
 * @returns {string|null}
 */
export function maskUser(user) {
  const s = typeof user === 'string' ? user.trim() : '';
  if (s === '') return null;
  const at = s.indexOf('@');
  if (at > 0) {
    const head = s.slice(0, Math.min(5, at));
    return head + '…' + s.slice(at);
  }
  if (s.length <= 6) return s;
  return s.slice(0, 4) + '…' + s.slice(-2);
}

function toNumber(value) {
  if (value === null || value === undefined || value === '') return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

/** Window periods, inferred from the prose name; ms values the pace math uses. */
const PERIOD_RULES = [
  [/^(5|五)\s*(hours?|小时)$/i, 5 * 3600e3],
  [/^(24|二十四)\s*(hours?|小时)$/i, 24 * 3600e3],
  [/^日$/i, 24 * 3600e3],
  [/^(day|daily)$/i, 24 * 3600e3],
  [/^credits?$/i, 24 * 3600e3],
  [/^(30|31|三十)\s*(days?|天)$/i, 30 * 86400e3],
  [/^(7|七)\s*(days?|天)$/i, 7 * 86400e3],
  [/^(周|每周)$/i, 7 * 86400e3],
  [/^week(ly)?$/i, 7 * 86400e3],
  [/^(月|月度)$/i, 30 * 86400e3],
  [/^(month|monthly)$/i, 30 * 86400e3],
];

/**
 * The gateway never sends a window's start, but resetsAt minus the period is
 * exactly the cycle start the pace math needs. Unknown prose → null: a guessed
 * period would fabricate a cycle, which is worse than no pace at all.
 * @param {string} raw
 * @returns {number|null} period in ms, or null when it cannot be inferred.
 */
export function windowPeriodMs(raw) {
  const full = typeof raw === 'string' ? raw.trim() : '';
  if (full === '') return null;
  const tail = full.includes('·') ? full.split('·').pop().trim() : full;
  for (const [re, ms] of PERIOD_RULES) if (re.test(tail)) return ms;
  return null;
}

/**
 * One raw window → the panel's window shape.
 * `used` is a 0..100 percentage in both wire shapes; `remaining` is present on
 * the live shape and derived otherwise.
 */
export function normalizeWindow(raw, provider, index) {
  const w = raw && typeof raw === 'object' ? raw : {};
  const used = toNumber(w.used);
  let remaining = toNumber(w.remaining);
  if (remaining === null && used !== null) remaining = Math.max(0, 100 - used);
  const resetSecs = toNumber(w.resetSecs);
  const holds = w.holds && typeof w.holds === 'object' ? w.holds : null;
  const resetsAt = typeof w.resetsAt === 'string' && w.resetsAt !== '' ? w.resetsAt : null;
  const resetsMs = resetsAt === null ? NaN : Date.parse(resetsAt);
  const periodMs = windowPeriodMs(w.name);
  const startsAt =
    periodMs !== null && Number.isFinite(resetsMs) ? new Date(resetsMs - periodMs).toISOString() : null;
  return {
    key: provider + ':' + (typeof w.name === 'string' && w.name !== '' ? w.name : String(index)),
    rawName: typeof w.name === 'string' ? w.name : '',
    label: windowLabel(w.name),
    used,
    remaining,
    resetsAt,
    resetSecs: resetSecs === null ? null : Math.trunc(resetSecs),
    periodMs,
    startsAt,
    display: typeof w.display === 'string' && w.display !== '' ? w.display : null,
    amount: toNumber(w.amount),
    limit: toNumber(w.limit),
    unit: typeof w.unit === 'string' && w.unit !== '' ? w.unit : null,
    runsOutAt: typeof w.runsOutAt === 'string' && w.runsOutAt !== '' ? w.runsOutAt : null,
    runsOut: toNumber(w.runsOut),
    holds: holds === null ? null : {
      tokens: toNumber(holds.tokens),
      cost: toNumber(holds.cost),
      used: toNumber(holds.used),
      calls: holds.routed && typeof holds.routed === 'object' ? toNumber(holds.routed.calls) : null,
      since: typeof holds.since === 'string' ? holds.since : null,
    },
  };
}

function normalizeBalance(value) {
  if (typeof value !== 'string') return null;
  const text = value.trim();
  return text === '' ? null : { text };
}

function accountStatus(windows, balance, error, readAt, nowMs, maxAgeMs) {
  if (error) return 'error';
  if (windows.length === 0 && balance === null) return 'unsupported';
  const stamp = readAt === null ? NaN : Date.parse(readAt);
  if (Number.isFinite(stamp) && nowMs - stamp > maxAgeMs) return 'stale';
  return 'ok';
}

function finishAccount(partial, nowMs, maxAgeMs) {
  const status = accountStatus(
    partial.windows,
    partial.balance,
    partial.error,
    partial.readAt,
    nowMs,
    maxAgeMs,
  );
  // `kind` is Magpie's billing model (it calls a points wallet a
  // "subscription"); `shape` is what the panel must render. Keep both: the
  // panel keys its layout on `shape`, the tooltip can explain `kind`.
  const shape = partial.windows.length > 0 ? 'windows' : partial.balance !== null ? 'balance' : 'none';
  return { ...partial, shape, status };
}

/**
 * One live `/v1/magpie/quotas` entry → an Account.
 * @param {object} entry
 * @param {number} nowMs
 * @param {number} maxAgeMs
 */
export function normalizeLiveEntry(entry, nowMs, maxAgeMs) {
  const e = entry && typeof entry === 'object' ? entry : {};
  const provider = typeof e.provider === 'string' && e.provider !== '' ? e.provider : 'unknown';
  const user = typeof e.user === 'string' && e.user !== '' ? e.user : null;
  const windows = disambiguate(
    Array.isArray(e.windows) ? e.windows.map((w, i) => normalizeWindow(w, provider, i)) : [],
  );
  const balance = normalizeBalance(e.balance);
  const error = typeof e.error === 'string' && e.error !== '' ? e.error : null;
  return finishAccount(
    {
      key: provider + '|' + (user || e.name || 'default'),
      identity: user || e.name || 'default',
      provider,
      name: typeof e.name === 'string' && e.name !== '' ? e.name : provider,
      plan: typeof e.plan === 'string' && e.plan !== '' ? e.plan : null,
      user,
      userMasked: maskUser(user),
      icon: typeof e.icon === 'string' && e.icon !== '' ? e.icon : null,
      kind:
        e.kind === 'balance' || e.kind === 'subscription'
          ? e.kind
          : windows.length > 0
            ? 'subscription'
            : 'balance',
      windows,
      balance,
      error,
      readAt: typeof e.readAt === 'string' && e.readAt !== '' ? e.readAt : null,
      source: 'magpie-live',
    },
    nowMs,
    maxAgeMs,
  );
}

/**
 * One cached `quotas.json` value → an Account.
 * @param {string} mapKey - "<provider>/<account>"
 * @param {object} value
 * @param {number} nowMs
 * @param {number} maxAgeMs
 */
export function normalizeCacheEntry(mapKey, value, nowMs, maxAgeMs) {
  const v = value && typeof value === 'object' ? value : {};
  const q = v.quota && typeof v.quota === 'object' ? v.quota : {};
  const provider =
    typeof q.provider === 'string' && q.provider !== ''
      ? q.provider
      : String(mapKey).split('/')[0] || 'unknown';
  const accountFromKey = String(mapKey).split('/').slice(1).join('/');
  const user = typeof q.user === 'string' && q.user !== '' ? q.user : null;
  const identity = user || accountFromKey || 'default';
  const windows = disambiguate(
    Array.isArray(q.windows) ? q.windows.map((w, i) => normalizeWindow(w, provider, i)) : [],
  );
  const balance = normalizeBalance(q.balance);
  const readAt =
    typeof q.readAt === 'string' && q.readAt !== ''
      ? q.readAt
      : typeof v.at === 'string' && v.at !== ''
        ? v.at
        : null;
  return finishAccount(
    {
      key: provider + '|' + identity,
      identity,
      provider,
      name: typeof q.name === 'string' && q.name !== '' ? q.name : provider,
      plan: typeof q.plan === 'string' && q.plan !== '' ? q.plan : null,
      user,
      userMasked: maskUser(user),
      icon: typeof q.icon === 'string' && q.icon !== '' ? q.icon : null,
      kind: windows.length > 0 ? 'subscription' : 'balance',
      windows,
      balance,
      error: null,
      readAt,
      source: 'magpie-cache',
    },
    nowMs,
    maxAgeMs,
  );
}

/**
 * The live endpoint is authoritative for every provider it reports: it
 * enumerates each ACCOUNT, while the cache keys the same login differently
 * (a map key vs a user id), so a per-key merge would show the account twice.
 * A provider present live therefore contributes only its live accounts;
 * cached entries are used solely for providers the live call does not cover —
 * a provider switched off in Magpie still has a cached reading worth showing,
 * marked stale rather than hidden.
 *
 * @param {object[]} live
 * @param {object[]} cached
 * @returns {object[]}
 */
export function mergeAccounts(live, cached) {
  const liveProviders = new Set(live.map((account) => account.provider));
  const seen = new Set();
  const extra = [];
  for (const account of cached) {
    if (liveProviders.has(account.provider)) continue;
    if (seen.has(account.key)) continue;
    seen.add(account.key);
    extra.push(account);
  }
  return [...live, ...extra];
}

/** `/v1/magpie/usage` → the panel's usage block. */
export function normalizeUsage(raw) {
  const u = raw && typeof raw === 'object' ? raw : null;
  if (u === null) return null;
  const series = Array.isArray(u.series)
    ? u.series.map((s) => ({
        label: typeof s.label === 'string' ? s.label : '',
        time: typeof s.time === 'string' ? s.time : null,
        calls: toNumber(s.calls) ?? 0,
        cost: toNumber(s.cost) ?? 0,
      }))
    : [];
  return {
    period: typeof u.period === 'string' ? u.period : null,
    since: typeof u.since === 'string' ? u.since : null,
    totals: {
      calls: toNumber(u.calls) ?? 0,
      cost: toNumber(u.cost) ?? 0,
      unpriced: toNumber(u.unpriced) ?? 0,
      credits: toNumber(u.credits) ?? 0,
      input: toNumber(u.input) ?? 0,
      output: toNumber(u.output) ?? 0,
      cacheRead: toNumber(u.cache_read) ?? 0,
    },
    series,
  };
}

function sourceState(id, payload, error) {
  return {
    id,
    ok: error === null && payload !== null,
    readAt: null,
    error,
  };
}

/**
 * Fold the raw readings into the one document the panel consumes.
 *
 * @param {object} input
 * @param {object|null} input.live        - `/v1/magpie/quotas` body or null.
 * @param {object|null} input.cache       - parsed `quotas.json` or null.
 * @param {object|null} input.usage       - `/v1/magpie/usage` body or null.
 * @param {object} input.config           - resolved config.
 * @param {number} input.nowMs
 * @param {{live: string|null, cache: string|null, usage: string|null}} input.errors
 */
/** "YYYY-MM-DD" in the machine's local zone — Magpie writes credits-daily in local days. */
function localDay(nowMs) {
  const d = new Date(nowMs);
  const pad = (n) => String(n).padStart(2, '0');
  return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
}

/**
 * Per-account usage for the selected period (`/v1/magpie/usage` → accounts[])
 * and today's credit delta (Magpie's own `credits-daily.json`). Both are keyed
 * the same way as Account.key so the view can join them without guessing.
 */
export function buildAccountExtras(usage, creditsDaily, nowMs) {
  const usageByAccount = {};
  const rows = Array.isArray(usage?.accounts) ? usage.accounts : [];
  for (const row of rows) {
    if (!row || typeof row.provider !== 'string') continue;
    // Account.key never ends in "|": its identity falls back to 'default',
    // so an account-less usage row must land on the same fallback to join.
    const account = typeof row.account === 'string' && row.account !== '' ? row.account : 'default';
    usageByAccount[row.provider + '|' + account] = {
      calls: toNumber(row.calls) ?? 0,
      cost: toNumber(row.cost) ?? 0,
      credits: toNumber(row.credits) ?? 0,
      input: toNumber(row.input) ?? 0,
      output: toNumber(row.output) ?? 0,
    };
  }

  const creditsByAccount = {};
  const today = localDay(nowMs);
  if (creditsDaily !== null && typeof creditsDaily === 'object') {
    for (const [key, value] of Object.entries(creditsDaily)) {
      const parts = String(key).split('|');
      if (parts.length < 2) continue;
      const days = value && typeof value.days === 'object' && value.days !== null ? value.days : {};
      creditsByAccount[parts[0] + '|' + parts[1]] = {
        unit: parts.length > 2 ? parts[2] : null,
        today: toNumber(days[today]),
        lastUsed: toNumber(value?.last?.used),
        lastTotal: toNumber(value?.last?.total),
        since: typeof value?.since === 'string' ? value.since : null,
      };
    }
  }
  return { usageByAccount, creditsByAccount };
}

/**
 * The account that answered the most recent request, in Account.key terms.
 * `providerAccount` is what Magpie stores; `provider` disambiguates it.
 */
export function normalizeLastRequest(raw) {
  if (raw === null || typeof raw !== 'object') return null;
  const provider = typeof raw.provider === 'string' ? raw.provider : null;
  if (provider === null) return null;
  const account = typeof raw.providerAccount === 'string' ? raw.providerAccount : null;
  return {
    key: provider + '|' + (account ?? 'default'),
    provider,
    account,
    model: typeof raw.model === 'string' ? raw.model : null,
    agent: typeof raw.agent === 'string' ? raw.agent : null,
    at: typeof raw.t === 'string' ? raw.t : null,
    status: toNumber(raw.status),
  };
}

/** File extensions the icon route may serve, with their content types. */
const ICON_TYPES = {
  svg: 'image/svg+xml',
  png: 'image/png',
  webp: 'image/webp',
  jpg: 'image/jpeg',
};

/**
 * `file:<name>` → the same-origin icon URL served by the icon route; any other
 * icon value (Magpie's built-in names like "codex-color") has no local file
 * and gets null, so the view can fall back instead of requesting a 404.
 * The name is pre-validated here with the same rules the route enforces.
 * @param {string|null|undefined} icon
 * @returns {string|null}
 */
/** Icons extracted from the local Magpie app into this package's assets/icons. */
export const LOCAL_ICONS = new Set(['codex', 'cline', 'factory', 'deepseek', 'zcode', 'zhipu', 'workbuddy']);

export function iconUrlFor(icon) {
  if (typeof icon !== 'string' || icon === '') return null;
  if (!icon.startsWith('file:')) return localIconUrl(icon);
  const name = icon.slice(5);
  if (
    name === '' ||
    name.includes('/') ||
    name.includes('\\') ||
    name.includes('..') ||
    name.startsWith('.')
  ) {
    return null;
  }
  const dot = name.lastIndexOf('.');
  if (dot <= 0 || dot === name.length - 1) return null;
  if (!(name.slice(dot + 1).toLowerCase() in ICON_TYPES)) return null;
  return 'api/magpie-usage/icon?name=' + encodeURIComponent(name);
}

/** A built-in name like "codex-color" maps to our own extracted asset. */
function localIconUrl(icon) {
  const slug = icon.replace(/-color$/i, '').toLowerCase();
  return LOCAL_ICONS.has(slug) ? 'api/magpie-usage/icon?local=' + slug : null;
}

/**
 * `/v1/magpie/quotas/cards` → icon per Account.key. Cards share the quotas
 * row shape plus `icon`, which `/quotas` omits; the index is keyed the same
 * way Account.key is built so the view never joins by guesswork.
 * @param {object|null} cards
 * @returns {Map<string, string>}
 */
export function buildIconIndex(cards) {
  const index = new Map();
  const rows = Array.isArray(cards?.data) ? cards.data : [];
  for (const row of rows) {
    if (!row || typeof row.provider !== 'string') continue;
    const icon = typeof row.icon === 'string' && row.icon !== '' ? row.icon : null;
    if (icon === null) continue;
    const user = typeof row.user === 'string' && row.user !== '' ? row.user : null;
    index.set(row.provider + '|' + (user || row.name || 'default'), icon);
  }
  return index;
}

/**
 * `/v1/magpie/quotas/history` → lines per Account.key, so each window can be
 * fitted against its own readings. Rows key on provider+user like cards do.
 * @param {object|null} history
 * @returns {Map<string, object[]>}
 */
export function buildHistoryIndex(history) {
  const index = new Map();
  const rows = Array.isArray(history?.data) ? history.data : [];
  for (const row of rows) {
    if (!row || typeof row.provider !== 'string' || !Array.isArray(row.lines)) continue;
    const user = typeof row.user === 'string' && row.user !== '' ? row.user : null;
    index.set(row.provider + '|' + (user || 'default'), row.lines);
  }
  return index;
}

/** The one history series a window's name selects, or an empty list. */
function historyPoints(lines, name) {
  const line = Array.isArray(lines) ? lines.find((l) => l && l.name === name) : null;
  return Array.isArray(line?.points) ? line.points : [];
}

/** quotaEtaSpan (page.js): only the trailing week of readings is fitted. */
const ETA_SPAN_MS = 7 * 86400e3;

/**
 * Least-squares extrapolation of a window's remaining readings to left=0 —
 * magpie's "Runs out {when} at this pace" (quotaEta, page.js offset 32083935).
 * Only points since the cycle start count, trailing readings that did not
 * keep dropping are skipped, and the fit is trusted only when it is a real
 * decline: ≥3 points, ≥1h span, last reading still >0, den>0, slope<0 and
 * the crossing in the future. A crossing at or after the reset means the
 * window lasts past the reset — `etaPastReset` instead of a time.
 * @param {object[]} points - history points `{at, left}`.
 * @param {string|null} startsAt - cycle start (resetsAt − periodMs).
 * @param {string|null} resetsAt
 * @param {number} nowMs
 * @returns {{etaAt: string|null, etaPastReset: boolean}|null}
 */
export function windowEta(points, startsAt, resetsAt, nowMs) {
  let pts = (Array.isArray(points) ? points : [])
    .map((p) => ({ t: Date.parse(p?.at), left: Number(p?.left) }))
    .filter((p) => Number.isFinite(p.t) && Number.isFinite(p.left))
    .sort((a, b) => a.t - b.t);
  const startMs = Date.parse(startsAt ?? null);
  if (Number.isFinite(startMs)) pts = pts.filter((p) => p.t >= startMs);
  if (pts.length > 0) {
    const cutoff = pts[pts.length - 1].t - ETA_SPAN_MS;
    pts = pts.filter((p) => p.t >= cutoff);
  }
  let end = pts.length;
  while (end > 1 && pts[end - 1].left >= pts[end - 2].left) end -= 1;
  pts = pts.slice(0, end);

  if (pts.length < 3) return null;
  if (pts[pts.length - 1].t - pts[0].t < 3600e3) return null;
  if (pts[pts.length - 1].left <= 0) return null;

  let sumT = 0;
  let sumL = 0;
  let sumTT = 0;
  let sumTL = 0;
  // Epoch-millisecond t² overflows double precision (≈3e24) and skews the
  // crossing by tens of ms; fitting against the first reading as origin keeps
  // every intermediate sum exact without changing the slope.
  const base = pts[0].t;
  for (const p of pts) {
    const t = p.t - base;
    sumT += t;
    sumL += p.left;
    sumTT += t * t;
    sumTL += t * p.left;
  }
  const n = pts.length;
  const den = n * sumTT - sumT * sumT;
  if (den <= 0) return null;
  const slope = (n * sumTL - sumT * sumL) / den;
  const intercept = (sumL - slope * sumT) / n;
  if (!(slope < 0)) return null;
  const out = base - intercept / slope;
  if (!(out > nowMs)) return null;
  const resetMs = Date.parse(resetsAt ?? null);
  if (Number.isFinite(resetMs) && out >= resetMs) return { etaAt: null, etaPastReset: true };
  return { etaAt: new Date(out).toISOString(), etaPastReset: false };
}

export function buildSnapshot(input) {
  const { config, nowMs } = input;
  const errors = input.errors || {};
  const maxAgeMs = config.maxAgeMs;

  const live = Array.isArray(input.live?.data)
    ? input.live.data.map((e) => normalizeLiveEntry(e, nowMs, maxAgeMs))
    : [];
  const cached = input.cache && typeof input.cache === 'object'
    ? Object.entries(input.cache).map(([k, v]) => normalizeCacheEntry(k, v, nowMs, maxAgeMs))
    : [];

  const accounts = mergeAccounts(live, cached).sort((a, b) => {
    const rank = (x) => (x.status === 'error' ? 0 : x.status === 'ok' ? 1 : x.status === 'stale' ? 2 : 3);
    if (rank(a) !== rank(b)) return rank(a) - rank(b);
    return a.name.localeCompare(b.name, 'zh-Hans-CN');
  });

  const iconIndex = buildIconIndex(input.cards ?? null);
  const historyIndex = buildHistoryIndex(input.history ?? null);
  const withIcons = accounts.map((account) => {
    const cardIcon = iconIndex.get(account.key);
    const icon = cardIcon !== undefined ? cardIcon : account.icon;
    const lines = historyIndex.get(account.key);
    const windows = account.windows.map((w) => {
      const eta = windowEta(historyPoints(lines, w.rawName), w.startsAt, w.resetsAt, nowMs);
      return { ...w, etaAt: eta === null ? null : eta.etaAt, etaPastReset: eta === null ? false : eta.etaPastReset };
    });
    return { ...account, icon, iconUrl: iconUrlFor(icon), windows };
  });

  let freshest = null;
  for (const account of withIcons) {
    const stamp = account.readAt === null ? NaN : Date.parse(account.readAt);
    if (Number.isFinite(stamp) && (freshest === null || stamp > freshest)) freshest = stamp;
  }
  const readAt = freshest === null ? null : new Date(freshest).toISOString();

  const sources = [
    sourceState('magpie-live', input.live ?? null, errors.live ?? null),
    sourceState('magpie-cache', input.cache ?? null, errors.cache ?? null),
    sourceState('magpie-usage', input.usage ?? null, errors.usage ?? null),
  ];
  for (const source of sources) {
    if (source.id === 'magpie-live' && input.live) source.readAt = readAt;
  }

  const liveOk = sources.find((s) => s.id === 'magpie-live').ok;
  const cacheOk = sources.find((s) => s.id === 'magpie-cache').ok;

  const extras = buildAccountExtras(input.usage ?? null, input.creditsDaily ?? null, nowMs);

  return {
    ok: liveOk || cacheOk,
    version: 1,
    readAt,
    stale: readAt !== null && nowMs - Date.parse(readAt) > maxAgeMs,
    accounts: withIcons,
    usage: normalizeUsage(input.usage ?? null),
    usageByAccount: extras.usageByAccount,
    creditsByAccount: extras.creditsByAccount,
    lastRequest: normalizeLastRequest(input.lastUsage ?? null),
    fx: {
      rate: toNumber(input.fx?.rate),
      at: typeof input.fx?.at === 'string' ? input.fx.at : null,
    },
    sources,
    error:
      !liveOk && !cacheOk
        ? [errors.live, errors.cache].filter(Boolean).join('；') || 'Magpie 无响应'
        : null,
  };
}

/* GENERATED FILE — do not edit. Source: src/client/*.js (npm run build:client). */
/**
 * dsh-magpie-usage — browser half (classic script for the DSH module loader).
 *
 * Mirrors Magpie's own 「观测 / 用量 / 概览」 page: a period bar, a totals line,
 * then quota cards grouped by provider — each account shows its windows with
 * remaining bars, reset countdown, whole-window estimate and a remaining-quota
 * sparkline. Only data Magpie already serves is used; nothing is fetched from a
 * vendor and nothing is written.
 *
 * Styling uses only --dsw-* tokens, so light/dark and host theming are free.
 */
window.__ModuleLoader__.load({
  id: 'dsh-magpie-usage',
  factory(require) {
    const React = require('react');
    const h = React.createElement;

const ROUTE = 'api/magpie-usage/snapshot';
    const REFRESH_ROUTE = 'api/magpie-usage/refresh';
    const SETTINGS_ROUTE = 'api/magpie-usage/settings';
    const HISTORY_ROUTE = 'api/magpie-usage/history';
    const NS = 'magpie-usage';

    const PERIODS = [
      { id: '1d', label: '今天' },
      { id: '7d', label: '7 天' },
      { id: '30d', label: '30 天' },
      { id: 'all', label: '全部' },
    ];

const zh = {
      nav: 'Magpie 额度',
      title: '用量概览',
      sectionQuota: '额度',
      refresh: '刷新',
      refreshing: '刷新中…',
      calls: '次调用',
      unpriced: '未计价',
      empty: 'Magpie 还没有额度记录',
      offline: 'Magpie 离线',
      offlineHint: '保留上次读数；恢复后会自动刷新。',
      loading: '读取中…',
      stale: '数据较旧',
      error: '读取失败',
      unsupported: '未提供额度',
      balance: '余额',
      used: '已用',
      remaining: '剩余',
      resets: '重置于',
      plan: '套餐',
      moreWindows: '展开其余 {n} 个窗口',
      less: '收起',
      moreAccounts: '展开其余 {n} 个账号',
      fewerAccounts: '收起其余账号',
      accountsCount: '{n} 个账号',
      keysCount: '{n} 个密钥',
      trend: '剩余额度走势',
      wholeWindow: '整窗',
      windowUsed: '本窗口已用',
      runsOut: '按此速度，预计 {d} 用完',
      updated: '更新于',
      sumCrit: '个接近用尽',
      sumWarn: '个偏低',
      sumError: '个读取失败',
      sumStale: '个数据较旧',
      active: '当前',
      activeHint: '最近一次请求用的就是它',
      periodCalls: '本期 {n} 次',
      todayCredits: '今天用掉 {n}',
      now: '现在',
      spanDays: '{n} 天',
      placement: '承载位',
      placementDock: '输入框附近',
      placementOrb: '悬浮球',
      displayItems: '显示项',
      showBars: '进度条',
      showResetTimes: '重置时间',
      showBalance: '余额',
      showUsage: '本期用量',
      showToday: '今日积分',
      showUpdatedAt: '更新时间',
      accounts: '账号与分组',
      dataSource: '数据源与刷新',
      diagnostics: '诊断',
      sourceLive: '实时接口',
      sourceCache: '仅缓存',
      refreshEvery: '刷新间隔',
      save: '保存',
      saved: '已保存',
      hide: '隐藏',
      show: '显示',
      resetDefaults: '恢复默认',
      settingsTitle: 'Magpie 额度设置',
      settingsHint: '设置会立即生效；偏好保存在 ~/.dsh/magpie-usage.json。',
      collapse: '收起面板',
    };
    const en = {
      nav: 'Magpie quota',
      title: 'Usage overview',
      sectionQuota: 'Quota',
      refresh: 'Refresh',
      refreshing: 'Refreshing…',
      calls: 'calls',
      unpriced: 'unpriced',
      empty: 'Magpie has no quota readings yet',
      offline: 'Magpie is offline',
      offlineHint: 'Showing the last reading; it refreshes when Magpie returns.',
      loading: 'Loading…',
      stale: 'out of date',
      error: 'read failed',
      unsupported: 'no quota reported',
      balance: 'Balance',
      used: 'used',
      remaining: 'left',
      resets: 'Resets',
      plan: 'Plan',
      moreWindows: 'Show {n} more windows',
      less: 'Collapse',
      moreAccounts: 'Show {n} more accounts',
      fewerAccounts: 'Show fewer accounts',
      accountsCount: '{n} accounts',
      keysCount: '{n} keys',
      trend: 'Remaining quota',
      wholeWindow: 'whole window',
      windowUsed: 'used this window',
      runsOut: 'At this rate, out by {d}',
      updated: 'Updated',
      sumCrit: 'near exhaustion',
      sumWarn: 'running low',
      sumError: 'failed to read',
      sumStale: 'out of date',
      active: 'in use',
      activeHint: 'Served the most recent request',
      periodCalls: '{n} calls',
      todayCredits: '{n} today',
      now: 'now',
      spanDays: '{n}d',
      placement: 'Placement',
      placementDock: 'Near the composer',
      placementOrb: 'Floating orb',
      displayItems: 'Display',
      showBars: 'Progress bars',
      showResetTimes: 'Reset times',
      showBalance: 'Balance',
      showUsage: 'Period usage',
      showToday: 'Today credits',
      showUpdatedAt: 'Updated at',
      accounts: 'Accounts',
      dataSource: 'Data & refresh',
      diagnostics: 'Diagnostics',
      sourceLive: 'Live API',
      sourceCache: 'Cache only',
      refreshEvery: 'Refresh every',
      save: 'Save',
      saved: 'Saved',
      hide: 'Hide',
      show: 'Show',
      resetDefaults: 'Reset to defaults',
      settingsTitle: 'Magpie quota settings',
      settingsHint: 'Changes apply immediately; preferences live in ~/.dsh/magpie-usage.json.',
      collapse: 'Collapse',
    };

    let t = (key) => zh[key] ?? key;

    /* ------------------------------------------------------------------ io */

function apiUrl(path) {
      try {
        return new URL(path, document.baseURI).href;
      } catch {
        return '/' + path;
      }
    }
    function getJson(path) {
      return fetch(apiUrl(path), { credentials: 'same-origin', cache: 'no-store' }).then((r) => r.json());
    }

    /* --------------------------------------------------------------- format */

    function pct(value) {
      if (typeof value !== 'number' || !Number.isFinite(value)) return '—';
      return Math.round(value) + '%';
    }
    function money(value) {
      if (typeof value !== 'number' || !Number.isFinite(value)) return '—';
      return '¥' + value.toFixed(2);
    }
    function count(value) {
      if (typeof value !== 'number' || !Number.isFinite(value)) return '—';
      return value.toLocaleString('zh-CN');
    }
    /**
     * Magpie hands us display strings like "46327995 / 500000000"; its own page
     * groups the digits. Keep the shape, format each number.
     */
    function formatDisplay(text) {
      if (typeof text !== 'string') return '';
      return text.replace(/\d+(?:\.\d+)?/g, (n) => {
        const value = Number(n);
        if (!Number.isFinite(value)) return n;
        const decimals = n.includes('.') ? Math.min(2, (n.split('.')[1] || '').length) : 0;
        return value.toLocaleString('en-US', { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
      });
    }

    function tokenText(value) {
      if (typeof value !== 'number' || !Number.isFinite(value)) return null;
      if (value >= 1e8) return (value / 1e8).toFixed(2) + ' 亿';
      if (value >= 1e4) return (value / 1e4).toFixed(1) + ' 万';
      return String(Math.round(value));
    }
    function clock(iso) {
      const stamp = Date.parse(iso);
      if (!Number.isFinite(stamp)) return null;
      return new Date(stamp).toLocaleString('zh-CN', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' });
    }
    function dayOnly(iso) {
      const stamp = Date.parse(iso);
      if (!Number.isFinite(stamp)) return null;
      return new Date(stamp).toLocaleString('zh-CN', { month: 'numeric', day: 'numeric' });
    }
    function countdown(secs, iso) {
      let diff;
      if (typeof secs === 'number' && Number.isFinite(secs)) diff = secs * 1000;
      else if (typeof iso === 'string') diff = Date.parse(iso) - Date.now();
      else return null;
      if (!Number.isFinite(diff)) return null;
      if (diff <= 0) return '即将重置';
      const mins = Math.round(diff / 60000);
      if (mins < 60) return mins + ' 分钟后';
      const hours = Math.round(mins / 60);
      if (hours < 48) return hours + ' 小时后';
      return Math.round(hours / 24) + ' 天后';
    }

    /** Magpie writes units in its own words; show the words this panel uses. */
    function unitLabel(unit) {
      const value = String(unit ?? '').trim();
      if (/^credits?$/i.test(value)) return '积分';
      if (/^key\s*quota$/i.test(value)) return 'Key 额度';
      if (/^points?$/i.test(value)) return '点数';
      return value;
    }

    function level(remaining) {
      if (typeof remaining !== 'number' || !Number.isFinite(remaining)) return 'unknown';
      if (remaining <= 20) return 'crit';
      if (remaining <= 50) return 'warn';
      return 'ok';
    }
    const LEVEL_VAR = {
      ok: 'var(--dsw-alias-state-success-primary, #3fb950)',
      warn: 'var(--dsw-alias-state-warn-primary, #d29922)',
      crit: 'var(--dsw-alias-state-error-primary, #f85149)',
      unknown: 'var(--dsw-alias-label-tertiary, #8b949e)',
    };

    function friendlyError(message) {
      const s = String(message || '');
      if (/no GLM Coding Plan|has ended or was never started|gift plans to claim/i.test(s))
        return '该账号没有可用套餐（未开通对应计划）';
      if (/\b401\b|unauthor|invalid.*(key|token)/i.test(s)) return 'API key 无效或已过期（401）';
      if (/\b403\b|forbidden/i.test(s)) return '无权限（403）';
      if (/\b429\b|rate.?limit/i.test(s)) return '被限流（429）';
      if (/timeout|timed out/i.test(s)) return '读取超时';
      if (/ENOTFOUND|ECONNREFUSED|fetch failed|network/i.test(s)) return '连不上上游服务';
      return s.length > 64 ? s.slice(0, 64) + '…' : s;
    }

    /** The window a card is "about": tightest remaining (ignoring unknown). */
    function worstWindow(account) {
      let worst = null;
      for (const w of account.windows || []) {
        if (typeof w.remaining !== 'number' || !Number.isFinite(w.remaining)) continue;
        if (worst === null || w.remaining < worst.remaining) worst = w;
      }
      return worst;
    }
    function sortKey(account) {
      if (account.status === 'error') return -1;
      const w = worstWindow(account);
      if (w !== null) return w.remaining;
      if (account.balance !== null) return 999;
      return 1000;
    }

    /* ----------------------------------------------------------------- hooks */

function useSnapshot(period) {
      const [state, setState] = React.useState({ status: 'loading', data: null });
      const alive = React.useRef(true);
      const load = React.useCallback(
        (force) => {
          const target =
            force === true
              ? { path: REFRESH_ROUTE + '?period=' + encodeURIComponent(period), method: 'POST' }
              : { path: ROUTE + '?period=' + encodeURIComponent(period), method: 'GET' };
          fetch(apiUrl(target.path), { method: target.method, credentials: 'same-origin', cache: 'no-store' })
            .then((response) => response.json())
            .then((payload) => {
              if (!alive.current) return;
              if (payload === null || typeof payload !== 'object') {
                setState({ status: 'error', data: null });
                return;
              }
              setState({ status: 'ready', data: payload });
            })
            .catch(() => {
              if (alive.current) setState({ status: 'error', data: null });
            });
        },
        [period],
      );
      React.useEffect(() => {
        alive.current = true;
        setState((current) => ({ ...current, status: 'loading' }));
        load(false);
        const timer = setInterval(() => {
          if (document.visibilityState === 'visible') load(false);
        }, 30000);
        return () => {
          alive.current = false;
          clearInterval(timer);
        };
      }, [load]);
      return [state, load];
    }

    /**
     * Settings are shared, not fetched per component: the settings page writes
     * them and every surface must react at once (switching 承载位 used to need a
     * page reload, because each surface read the file once on mount).
     */
    const settingsStore = { value: null, listeners: new Set() };

    function publishSettings(next) {
      if (next === null || typeof next !== 'object') return;
      settingsStore.value = next;
      for (const listener of settingsStore.listeners) {
        try {
          listener(next);
        } catch {
          // A broken listener must not stop the others.
        }
      }
    }

    function useSettings() {
      const [prefs, setPrefs] = React.useState(() => settingsStore.value ?? { tier: 'detailed' });
      React.useEffect(() => {
        let alive = true;
        const onUpdate = (next) => {
          if (alive) setPrefs(next);
        };
        settingsStore.listeners.add(onUpdate);
        const load = () => {
          getJson(SETTINGS_ROUTE)
            .then((payload) => {
              if (!alive || !payload || payload.ok !== true) return;
              settingsStore.value = payload.settings;
              setPrefs(payload.settings);
            })
            .catch(() => {});
        };
        if (settingsStore.value === null) load();
        // Another window or a manual file edit: refresh when we come back.
        const onVisible = () => {
          if (document.visibilityState === 'visible') load();
        };
        document.addEventListener('visibilitychange', onVisible);
        return () => {
          alive = false;
          settingsStore.listeners.delete(onUpdate);
          document.removeEventListener('visibilitychange', onVisible);
        };
      }, []);
      return prefs;
    }

    /** Per-provider history, fetched once and shared across the provider's accounts. */
    const historyCache = new Map();
    function useHistory(provider, enabled) {
      const [lines, setLines] = React.useState(() => historyCache.get(provider) ?? null);
      React.useEffect(() => {
        if (enabled !== true || lines !== null) return undefined;
        if (historyCache.has(provider)) {
          setLines(historyCache.get(provider));
          return undefined;
        }
        let alive = true;
        getJson(HISTORY_ROUTE + '?provider=' + encodeURIComponent(provider))
          .then((payload) => {
            const value = payload && payload.ok === true && Array.isArray(payload.lines) ? payload.lines : [];
            historyCache.set(provider, value);
            if (alive) setLines(value);
          })
          .catch(() => {
            historyCache.set(provider, []);
            if (alive) setLines([]);
          });
        return () => {
          alive = false;
        };
      }, [provider, enabled, lines]);
      return lines;
    }

    /* ------------------------------------------------------------- primitives */

function Segmented(props) {
      return h(
        'div',
        { className: 'mq-seg', role: 'group', 'aria-label': props.label ?? '' },
        props.options.map((option) =>
          h(
            'button',
            {
              key: option.id,
              type: 'button',
              'aria-pressed': option.id === props.value,
              onClick: () => props.onChange(option.id),
            },
            option.label,
          ),
        ),
      );
    }

    function Bar(props) {
      const value = typeof props.value === 'number' ? props.value : null;
      const width = value === null ? 0 : Math.max(0, Math.min(100, value));
      return h(
        'div',
        {
          className: 'mq-bar',
          role: 'progressbar',
          'aria-valuemin': 0,
          'aria-valuemax': 100,
          'aria-valuenow': value === null ? 0 : Math.round(width),
          'aria-label': props.label,
        },
        h('i', { style: { width: width + '%', background: props.color } }),
      );
    }

    /** Round-tripped first letter of a provider name, on a semantic-color disc. */
    function Avatar(props) {
      const tone = LEVEL_VAR[props.tone] ? props.tone : 'unknown';
      const text = typeof props.text === 'string' && props.text !== '' ? [...props.text.trim()][0] ?? '?' : '?';
      return h(
        'span',
        {
          className: 'mq-avatar',
          'aria-hidden': true,
          style: { background: LEVEL_VAR[tone], color: 'var(--dsw-alias-bg-layer-1, #fff)' },
        },
        text,
      );
    }

    /** Compact magnitude for token counts: 28.4M / 1.2万 / 980K. */
    function compactNum(value) {
      if (typeof value !== 'number' || !Number.isFinite(value) || value <= 0) return null;
      const trim = (x) => String(Math.round(x * 10) / 10);
      if (value >= 1e6) return trim(value / 1e6) + 'M';
      if (value >= 1e4) return trim(value / 1e4) + '万';
      if (value >= 1e3) return trim(value / 1e3) + 'K';
      return String(Math.round(value));
    }

    /** Credits with at most two decimals, e.g. 1.42. */
    function creditNum(value) {
      if (typeof value !== 'number' || !Number.isFinite(value)) return null;
      return String(Math.round(value * 100) / 100);
    }

    /**
     * 40px remaining-quota trend. One header line: title, the run-out
     * projection from the window's own least-squares eta (quotaEta: a time,
     * or "lasts past the reset"), and the covered span on the right. Axis
     * below: first sample date left, "now" right. When the eta is past the
     * last real sample the domain stretches so the dashed continuation lands
     * exactly on the right edge — never past it — and "now" keeps its own
     * tick position instead of drifting to the edge.
     */
    function Sparkline(props) {
      const points = Array.isArray(props.points) ? props.points : [];
      if (points.length < 2) return null;
      const W = 300;
      const H = 40;
      const lefts = points.map((p) => Math.max(0, Math.min(100, p.left)));
      const times = points.map((p) => Date.parse(p.at));
      const timed = times.every((ms) => Number.isFinite(ms));
      const lastMs = timed ? times[times.length - 1] : NaN;
      const t0 = timed ? times[0] : NaN;
      // quotaEta: the fitted zero-crossing. etaPastReset means the fit says
      // the quota outlasts the window — text only, no projection line.
      const etaPastReset = props.etaPastReset === true;
      const etaMs = Date.parse(props.etaAt ?? null);
      const hasForecast = timed && !etaPastReset && Number.isFinite(etaMs) && etaMs > lastMs;

      const xOf = (i) => {
        if (!timed) return (i / (points.length - 1)) * W;
        const span = (hasForecast ? etaMs : lastMs) - t0;
        return span > 0 ? ((times[i] - t0) / span) * W : (i / (points.length - 1)) * W;
      };
      const yOf = (left) => H - (left / 100) * (H - 6) - 3;

      const d = points
        .map((_, i) => (i === 0 ? 'M' : 'L') + xOf(i).toFixed(1) + ' ' + yOf(lefts[i]).toFixed(1))
        .join(' ');
      const xN = xOf(points.length - 1);
      const yN = yOf(lefts[lefts.length - 1]);

      const spanMs = timed ? (hasForecast ? etaMs : lastMs) - t0 : 0;
      const days = spanMs / 86400000;
      const spanLabel = timed
        ? days >= 1
          ? t('spanDays').replace('{n}', days >= 10 ? String(Math.round(days)) : String(Math.round(days * 10) / 10))
          : Math.max(1, Math.round(spanMs / 3600000)) + ' 小时'
        : null;
      const etaLabel = etaPastReset
        ? '按此速度，撑得到重置'
        : Number.isFinite(etaMs)
          ? '按此速度，预计 ' + clock(props.etaAt) + ' 用完'
          : null;

      return h(
        'div',
        { className: 'mq-trend' },
        h(
          'div',
          { className: 'mq-trendhead' },
          h('span', { className: 'mq-trendtitle' }, t('trend')),
          etaLabel !== null ? h('span', { className: 'mq-trendruns' }, etaLabel) : null,          spanLabel !== null ? h('span', { className: 'mq-trendspan' }, spanLabel) : null,
        ),
        h(
          'svg',
          { className: 'mq-spark', viewBox: '0 0 ' + W + ' ' + H, preserveAspectRatio: 'none', role: 'img', 'aria-label': t('trend') },
          h('path', {
            d: d + ' L ' + xN.toFixed(1) + ' ' + H + ' L 0 ' + H + ' Z',
            fill: props.color,
            opacity: 0.08,
            stroke: 'none',
          }),
          h('path', {
            d,
            fill: 'none',
            stroke: props.color,
            'stroke-width': 1.4,
            'stroke-linejoin': 'round',
            vectorEffect: 'non-scaling-stroke',
          }),
          hasForecast
            ? h('path', {
                d: 'M ' + xN.toFixed(1) + ' ' + yN.toFixed(1) + ' L ' + W + ' ' + yOf(0).toFixed(1),
                fill: 'none',
                stroke: props.color,
                'stroke-width': 1.2,
                'stroke-dasharray': '3 3',
                opacity: 0.7,
                vectorEffect: 'non-scaling-stroke',
              })
            : null,
        ),
        h(
          'div',
          {
            className: 'mq-sparkaxis' + (hasForecast ? ' mq-sparkaxis-f' : ''),
            style: hasForecast ? { '--mq-now': ((xN / W) * 100).toFixed(2) + '%' } : null,
          },
          // A short history stretched by the forecast pushes "now" next to the
          // first-date tick; drop the date rather than let the labels collide.
          !(hasForecast && (xN / W) * 100 < 22) ? h('span', null, dayOnly(points[0].at) ?? '') : null,
          h('span', { className: 'mq-sparknow' }, t('now')),
        ),
      );
    }

    function Totals(props) {
      const usage = props.usage;
      if (usage === null || typeof usage !== 'object') return null;
      const totals = usage.totals ?? {};
      // usage.cost is USD at API list prices — Magpie converts it with its own
      // fx rate and marks "≈ … +" whenever some calls had no known price.
      const rate = props.fx !== null && typeof props.fx === 'object' ? props.fx.rate : null;
      const usd = typeof totals.cost === 'number' ? totals.cost : null;
      let cost = null;
      if (usd !== null && usd > 0) {
        const shown = Number.isFinite(rate) && rate > 0 ? money(usd * rate) : '$' + usd.toFixed(2);
        cost = '≈' + shown + (totals.unpriced > 0 ? '+' : '');
      }
      return h(
        'div',
        { className: 'mq-totals' },
        h('span', { className: 'mq-totalstrong', title: 'API 标价，按 Magpie 汇率换算' }, cost !== null ? cost : '—'),
        h('span', { className: 'mq-totalweak' }, count(totals.calls) + ' ' + t('calls')),
        totals.unpriced > 0 ? h('span', { className: 'mq-totalmeta' }, count(totals.unpriced) + ' ' + t('unpriced')) : null,
      );
    }

    function Style() {
      return h('style', { dangerouslySetInnerHTML: { __html: CSS } });
    }

    /* ------------------------------------------------------------------ views */


    const CSS_PRIMITIVES = `
.mq-root { font-family: var(--dsw-font-family, -apple-system, "PingFang SC", sans-serif); color: var(--dsw-alias-label-primary, #1f2328); font-size: var(--dsw-font-s-14-font-size, 14px); }
.mq-seg { display: inline-flex; gap: 2px; padding: 2px; border-radius: var(--dsw-radius-md, 8px); background: var(--dsw-alias-bg-layer-2, #f2f3f5); }
.mq-seg button { border: 0; background: transparent; color: var(--dsw-alias-label-secondary, #57606a); font: inherit; font-size: var(--dsw-font-xs-13-font-size, 13px); padding: 3px 9px; border-radius: var(--dsw-radius-sm, 6px); cursor: pointer; }
.mq-seg button[aria-pressed="true"] { background: var(--dsw-alias-bg-layer-1, #fff); color: var(--dsw-alias-label-primary, #1f2328); box-shadow: var(--dsw-elevation-soft, 0 1px 2px rgba(0,0,0,.08)); }
.mq-seg button:focus-visible, .mq-btn:focus-visible, .mq-linkbtn:focus-visible { outline: 2px solid var(--dsw-alias-brand-primary, #1f6feb); outline-offset: 2px; }
.mq-btn { border: 1px solid var(--dsw-alias-border-l2, #d8dee4); background: var(--dsw-alias-bg-layer-1, #fff); color: var(--dsw-alias-label-primary, #1f2328); font: inherit; font-size: var(--dsw-font-xs-13-font-size, 13px); padding: 4px 10px; border-radius: var(--dsw-radius-md, 8px); cursor: pointer; }
.mq-btn:hover:not(:disabled) { background: var(--dsw-alias-interactive-bg-hover, #f6f8fa); }
.mq-btn:disabled { opacity: .6; cursor: default; }
.mq-totals { display: flex; align-items: baseline; gap: 8px; }
.mq-totalstrong { color: var(--dsw-alias-label-primary, #1f2328); font-weight: 600; font-size: var(--dsw-font-base-16-font-size, 16px); font-variant-numeric: tabular-nums; }
.mq-totalweak { color: var(--dsw-alias-label-secondary, #57606a); font-size: var(--dsw-font-xs-13-font-size, 13px); font-variant-numeric: tabular-nums; }
.mq-totalmeta { color: var(--dsw-alias-label-caption, #8b949e); font-size: 12px; font-variant-numeric: tabular-nums; }
.mq-bar { height: 8px; border-radius: 999px; background: var(--dsw-alias-fill-l2, #eaeef2); overflow: hidden; }
.mq-bar > i { display: block; height: 100%; border-radius: 999px; transition: width .18s ease; }
.mq-spark { width: 100%; height: 40px; display: block; }
.mq-sparkaxis { position: relative; display: flex; justify-content: space-between; gap: 8px; margin-top: 4px; color: var(--dsw-alias-label-caption, #8b949e); font-size: 11px; line-height: 1.2; font-variant-numeric: tabular-nums; }
.mq-sparkaxis-f .mq-sparknow { position: absolute; left: var(--mq-now, 100%); transform: translateX(-100%); }
.mq-avatar { width: 22px; height: 22px; border-radius: 50%; display: inline-flex; align-items: center; justify-content: center; flex: 0 0 auto; font-size: 11px; font-weight: 600; line-height: 1; }
.mq-note { color: var(--dsw-alias-label-secondary, #57606a); font-size: var(--dsw-font-xs-13-font-size, 13px); }
.mq-note-crit { display: flex; align-items: flex-start; gap: 6px; color: var(--dsw-alias-label-error, #cf222e); font-size: 12px; line-height: 1.45; }
.mq-erricon { display: inline-flex; align-items: center; justify-content: center; width: 14px; height: 14px; border-radius: 50%; flex: 0 0 auto; margin-top: 1px; background: var(--dsw-alias-state-error-secondary, #ffebe9); color: var(--dsw-alias-label-error, #cf222e); font-size: 10px; font-weight: 700; line-height: 1; }
.mq-linkbtn { align-self: flex-start; border: 0; background: transparent; padding: 2px 0; color: var(--dsw-alias-brand-primary, #1f6feb); font: inherit; font-size: 12px; cursor: pointer; }
.mq-linkbtn:hover { text-decoration: underline; }
.mq-empty { padding: 28px 0; color: var(--dsw-alias-label-caption, #8b949e); font-size: var(--dsw-font-xs-13-font-size, 13px); }
.mq-foot { margin-top: 10px; color: var(--dsw-alias-label-caption, #8b949e); font-size: 12px; }
`;

    /** Hide-by-default display prefs; only an explicit false turns a row off. */
    function displayPrefs(prefs) {
      const p = prefs ?? null;
      return {
        bars: p?.showBars !== false,
        resetTimes: p?.showResetTimes !== false,
        balance: p?.showBalance !== false,
        usage: p?.showUsage !== false,
        today: p?.showToday !== false,
      };
    }

    /**
     * Magpie's quotaPace (MAGPIE-SPEC §1): used% less what an even pace
     * through the window would show by now, rounded. Null — never guessed —
     * without startsAt/resetsAt, when the span is degenerate, or outside the
     * window.
     */
    function paceOf(w) {
      const s = Date.parse(w.startsAt ?? null);
      const e = Date.parse(w.resetsAt ?? null);
      if (!Number.isFinite(s) || !Number.isFinite(e) || e <= s) return null;
      if (typeof w.used !== 'number' || !Number.isFinite(w.used)) return null;
      const now = Date.now();
      if (now < s || now >= e) return null;
      return Math.round(w.used - (100 * (now - s)) / (e - s));
    }

    /** +12% / −8% / ±0%, with a true minus sign (U+2212) like magpie. */
    function paceText(n) {
      if (n > 0) return '+' + n + '%';
      if (n < 0) return '−' + Math.abs(n) + '%';
      return '±0%';
    }

    function WindowBlock(props) {
      const w = props.window;
      const value = props.mode === 'used' ? w.used : w.remaining;
      const tone = level(w.remaining);
      const reset = clock(w.resetsAt);
      const left = countdown(w.resetSecs, w.resetsAt);

      // One caption line per window: reset · countdown · pace · whole-window.
      const meta = [];
      if (props.showResetTimes !== false && reset !== null)
        meta.push({ text: t('resets') + ' ' + reset + (left !== null ? ' · ' + left : '') });
      const pace = paceOf(w);
      if (pace !== null) {
        meta.push({
          text: '配速 ' + paceText(pace),
          className: 'mq-pace mq-pace-' + (pace > 0 ? 'over' : pace < 0 ? 'under' : 'zero'),
        });
      }
      if (w.holds !== null && w.holds.tokens !== null) {
        // holds.tokens/cost are the backend's whole-window estimate
        // (routed × 100/used, MAGPIE-SPEC §2), not this window's accrual.
        // The cost is USD at API list prices; convert with the snapshot's fx
        // rate when present, otherwise show the USD value as-is.
        let holdsText = t('wholeWindow') + ' ≈ ' + tokenText(w.holds.tokens) + ' tokens';
        if (w.holds.cost !== null) {
          const rate = props.fx !== null && typeof props.fx === 'object' ? props.fx.rate : null;
          holdsText +=
            ' · ≈ ' + (Number.isFinite(rate) && rate > 0 ? money(w.holds.cost * rate) : '$' + w.holds.cost.toFixed(2));
        }
        meta.push({ text: holdsText, title: '按 API 标价' });
      }

      // Status is never colour-only: low/exhausted values keep a "!" flag glyph.
      const flag = tone === 'crit' || tone === 'warn' ? h('span', { className: 'mq-flag mq-flag-' + tone, 'aria-hidden': true }, '!') : null;

      return h(
        'div',
        { className: 'mq-win' },
        h(
          'div',
          { className: 'mq-winhead' },
          h('span', { className: 'mq-winlabel', title: w.rawName || w.label }, w.label),
          h(
            'span',
            { className: 'mq-winvalue' },
            w.display !== null ? formatDisplay(w.display) : pct(value),
            flag,
          ),
        ),
        props.showBars === false ? null : h(Bar, { value, color: LEVEL_VAR[tone], label: w.label + ' ' + t('remaining') }),
        meta.length > 0
          ? h(
              'div',
              { className: 'mq-winmeta' },
              meta.map((part, i) =>
                h('span', { key: i, className: part.className, title: part.title }, (i > 0 ? ' · ' : '') + part.text),
              ),
            )
          : null,
      );
    }

    /** The two tightest windows in original order; everything rankable beats unknown. */
    function tightestWindows(windows, n) {
      const ranked = windows
        .map((w, i) => ({ w, i }))
        .filter((entry) => typeof entry.w.remaining === 'number' && Number.isFinite(entry.w.remaining));
      ranked.sort((a, b) => a.w.remaining - b.w.remaining);
      const picked = new Set(ranked.slice(0, n).map((entry) => entry.i));
      if (picked.size === 0) windows.slice(0, n).forEach((_, i) => picked.add(i));
      return windows.filter((_, i) => picked.has(i));
    }

    /** "刚刚更新 / N 分钟前更新 / N 小时前更新 / N 天前更新", null when unreadable. */
    function relTime(iso) {
      const stamp = Date.parse(iso);
      if (!Number.isFinite(stamp)) return null;
      const mins = (Date.now() - stamp) / 60000;
      if (mins < 1) return '刚刚更新';
      if (mins < 60) return Math.max(1, Math.round(mins)) + ' 分钟前更新';
      if (mins < 1440) return Math.round(mins / 60) + ' 小时前更新';
      return Math.round(mins / 1440) + ' 天前更新';
    }

    function AccountBlock(props) {
      const a = props.account;
      const lines = props.history;
      const [expanded, setExpanded] = React.useState(false);
      const prefs = displayPrefs(props.prefs);
      const tone = a.status === 'error' ? 'crit' : level(worstWindow(a)?.remaining ?? null);
      const windows = a.windows || [];
      const shown = expanded ? windows : windows.length > 2 ? tightestWindows(windows, 2) : windows;
      const hidden = windows.length - shown.length;

      const worst = worstWindow(a);
      const line = worst !== null && Array.isArray(lines) ? lines.find((l) => l.name === worst.rawName) ?? null : null;
      const spark = line !== null && Array.isArray(line.points) && line.points.length > 1
        ? h(Sparkline, { points: line.points, color: LEVEL_VAR[tone], etaAt: worst.etaAt, etaPastReset: worst.etaPastReset === true })
        : null;

      let body;
      if (a.status === 'error') {
        body = h(
          'div',
          { className: 'mq-note mq-note-crit' },
          h('span', { className: 'mq-erricon', 'aria-hidden': true }, '!'),
          h('span', { title: a.error ?? '' }, friendlyError(a.error)),
        );
      } else if (a.shape === 'windows') {
        body = shown.map((w, i) =>
          h(WindowBlock, {
            key: w.key + i,
            window: w,
            mode: props.mode,
            showBars: prefs.bars,
            showResetTimes: prefs.resetTimes,
            fx: props.fx,
          }),
        );
        if (hidden > 0) {
          body.push(h('button', { key: 'm', type: 'button', className: 'mq-linkbtn', onClick: () => setExpanded(true) }, t('moreWindows').replace('{n}', String(hidden))));
        } else if (expanded && windows.length > 2) {
          body.push(h('button', { key: 'l', type: 'button', className: 'mq-linkbtn', onClick: () => setExpanded(false) }, t('less')));
        }
      } else if (a.shape === 'balance' && a.balance !== null) {
        body = prefs.balance
          ? h('div', { className: 'mq-balance' }, h('span', { className: 'mq-balancelabel' }, t('balance')), h('span', { className: 'mq-balancevalue' }, a.balance.text))
          : null;
      } else {
        body = h('div', { className: 'mq-note' }, t('unsupported'));
      }

      // Period usage and today's credits share one caption row to save a line.
      const usageRow = a.status !== 'error' && props.usage ? props.usage[a.key] ?? null : null;
      const creditsRow = a.status !== 'error' && props.credits ? props.credits[a.key] ?? null : null;
      const todayCredits = creditsRow !== null ? creditNum(creditsRow.today) : null;
      const metaRow = [];
      if (prefs.usage && usageRow !== null && (usageRow.calls > 0 || usageRow.input > 0 || usageRow.output > 0)) {
        metaRow.push(h('span', { key: 'uk', className: 'mq-metakey' }, t('showUsage')));
        metaRow.push(h('span', { key: 'c', className: 'mq-metaval' }, count(usageRow.calls) + ' ' + t('calls')));
        const input = compactNum(usageRow.input);
        const output = compactNum(usageRow.output);
        if (input !== null || output !== null) {
          metaRow.push(h('span', { key: 'io', className: 'mq-metaval' }, '入 ' + (input ?? '—') + ' / 出 ' + (output ?? '—')));
        }
      }
      if (prefs.today && todayCredits !== null) {
        if (metaRow.length > 0) metaRow.push(h('span', { key: 'sep', className: 'mq-metasep', 'aria-hidden': true }, '·'));
        metaRow.push(h('span', { key: 'ck', className: 'mq-metakey' }, t('showToday')));
        metaRow.push(
          h(
            'span',
            { key: 'cv', className: 'mq-metaval' },
            t('todayCredits').replace('{n}', todayCredits) + (creditsRow.unit ? ' ' + unitLabel(creditsRow.unit) : ''),
          ),
        );
      }

      // Footer: tightest window at a glance left, relative read age right.
      const footTime = relTime(a.readAt);
      const footer = worst !== null || footTime !== null
        ? h(
            'div',
            { className: 'mq-accfoot' },
            worst !== null
              ? h(
                  'span',
                  { className: 'mq-accfootstat' },
                  h('i', { className: 'mq-accfootdot', style: { background: LEVEL_VAR[tone] }, 'aria-hidden': true }),
                  h('span', { className: 'mq-accfootlabel', title: worst.rawName || worst.label }, worst.label),
                  h('span', { className: 'mq-accfootvalue' }, pct(worst.remaining)),
                )
              : h('span', { className: 'mq-accfootstat' }),
            footTime !== null ? h('span', { className: 'mq-accfoottime' }, footTime) : null,
          )
        : null;

      return h(
        'div',
        { className: 'mq-account', 'data-status': a.status },
        props.showIdentity === true
          ? h(
              'div',
              { className: 'mq-accounthead' },
              h('span', { className: 'mq-dot', style: { background: LEVEL_VAR[tone] }, 'aria-hidden': true }),
              h('span', { className: 'mq-accname', title: a.user ?? a.name }, a.userMasked ?? a.name),
              a.plan !== null ? h('span', { className: 'mq-plan' }, a.plan) : null,
              props.isActive === true
                ? h('span', { className: 'mq-badge mq-badge-active', title: t('activeHint') }, t('active'))
                : null,
              a.status === 'error'
                ? h('span', { className: 'mq-badge mq-badge-crit' }, t('error'))
                : a.status === 'stale'
                  ? h('span', { className: 'mq-badge' }, t('stale'))
                  : null,
            )
          : null,
        h('div', { className: 'mq-body' }, body),
        metaRow.length > 0 ? h('div', { className: 'mq-accmeta' }, metaRow) : null,
        spark,
        footer,
      );
    }

    /** Tightest semantic level across a provider's accounts, for the avatar disc. */
    function groupTone(accounts) {
      let worst = null;
      let errored = false;
      for (const a of accounts) {
        if (a.status === 'error') {
          errored = true;
          continue;
        }
        const w = worstWindow(a);
        if (w !== null && (worst === null || w.remaining < worst)) worst = w.remaining;
      }
      if (worst !== null) return level(worst);
      return errored ? 'crit' : 'unknown';
    }

    /**
     * One line for an account that is not expanded: name + its tightest window.
     * Magpie's card lists every account, keeping the ones you are not looking at
     * in brief rather than hiding them.
     */
    function AccountBrief(props) {
      const a = props.account;
      const w = worstWindow(a);
      const tone = a.status === 'error' ? 'crit' : level(w?.remaining ?? null);
      const value =
        a.status === 'error'
          ? friendlyError(a.error)
          : w !== null
            ? w.label + ' ' + t('remaining') + ' ' + pct(w.remaining)
            : a.balance !== null
              ? a.balance.text
              : t('unsupported');
      return h(
        'div',
        { className: 'mq-brief', title: a.user ?? a.name },
        h('span', { className: 'mq-dot', style: { background: LEVEL_VAR[tone] }, 'aria-hidden': true }),
        h('span', { className: 'mq-briefname' }, a.userMasked ?? a.name),
        h('span', { className: 'mq-briefvalue' }, value),
      );
    }

    /**
     * Magpie's keys-card test (MAGPIE-SPEC §3): several members, every one
     * windowless and unplanned, at least one holding a balance.
     */
    function isKeysCard(accounts) {
      return accounts.length > 1 && accounts.every((a) => (a.windows || []).length === 0 && a.plan === null) && accounts.some((a) => a.balance !== null);
    }

    /**
     * Sum of the members' balance texts (magpie's keysSum): split each with
     * its number regex; any unparsable member or differing affixes → give up
     * entirely rather than show a wrong total.
     */
    function keysSumText(accounts) {
      let prefix = null;
      let suffix = null;
      let sum = 0;
      for (const a of accounts) {
        if (a.balance === null) continue;
        const m = /^([^\d-]*)(-?\d[\d,]*(?:\.\d+)?)(\D*)$/.exec(a.balance.text.trim());
        if (m === null) return null;
        if (prefix === null) {
          prefix = m[1];
          suffix = m[3];
        } else if (m[1] !== prefix || m[3] !== suffix) {
          return null;
        }
        sum += Number(m[2].replace(/,/g, ''));
      }
      if (prefix === null) return null;
      return prefix + sum.toLocaleString('zh-CN', { maximumFractionDigits: 2 }) + suffix;
    }

    function ProviderCard(props) {
      const group = props.group;
      const lines = useHistory(group.provider, props.historyEnabled);
      const [expanded, setExpanded] = React.useState(false);
      const [iconBroken, setIconBroken] = React.useState(false);
      const accounts = group.accounts;
      // The plan in use leads the card; the rest stay visible in brief.
      const primary = accounts.find((a) => a.key === props.activeKey) ?? accounts[0];
      const others = accounts.filter((a) => a.key !== primary.key);
      const single = accounts.length === 1;
      const plan = single ? group.planHint : null;
      const subtitle = single && accounts[0].userMasked !== null && accounts[0].userMasked !== accounts[0].name ? accounts[0].userMasked : null;
      const initial = [...String(group.title || group.provider || '?').trim()][0] ?? '?';
      const iconAccount = accounts.find((a) => typeof a.iconUrl === 'string' && a.iconUrl !== '') ?? null;
      const iconUrl = iconAccount !== null && !iconBroken ? iconAccount.iconUrl : null;
      const keysCard = isKeysCard(accounts);
      const sumText = keysCard ? keysSumText(accounts) : null;
      // Magpie folds big cards (ACCTS_FOLD=8): collapsed shows the primary
      // plus the first four members in brief, the rest stay hidden.
      const othersShown = !expanded && accounts.length > 8 ? others.slice(0, 4) : others;
      const hidden = others.length - othersShown.length;

      return h(
        'section',
        { className: 'mq-card' },
        h(
          'header',
          { className: 'mq-cardhead' },
          iconUrl !== null
            ? h('img', {
                className: 'mq-icon',
                src: iconUrl,
                width: 22,
                height: 22,
                alt: '',
                onError: () => setIconBroken(true),
              })
            : h(Avatar, { text: initial, tone: groupTone(accounts) }),
          h(
            'div',
            { className: 'mq-cardhead-main' },
            h('span', { className: 'mq-name' }, group.title),
            single
              ? null
              : h('span', { className: 'mq-count' }, (keysCard ? t('keysCount') : t('accountsCount')).replace('{n}', String(accounts.length))),
            sumText !== null ? h('span', { className: 'mq-count' }, '合计 ' + sumText) : null,
            subtitle !== null ? h('span', { className: 'mq-sub', title: accounts[0].user }, subtitle) : null,
          ),
          h(
            'span',
            { className: 'mq-cardmeta' },
            single && accounts.some((a) => a.key === props.activeKey)
              ? h('span', { className: 'mq-badge mq-badge-active', title: t('activeHint') }, t('active'))
              : null,
            plan !== null ? h('span', { className: 'mq-plan' }, plan) : null,
          ),
        ),
        h(AccountBlock, {
          key: primary.key,
          account: primary,
          mode: props.mode,
          history: lines,
          showIdentity: !single,
          isActive: primary.key === props.activeKey,
          usage: props.usage,
          credits: props.credits,
          prefs: props.prefs,
          fx: props.fx,
        }),
        othersShown.map((a) =>
          expanded
            ? h(AccountBlock, {
                key: a.key,
                account: a,
                mode: props.mode,
                history: lines,
                showIdentity: true,
                isActive: a.key === props.activeKey,
                usage: props.usage,
                credits: props.credits,
                prefs: props.prefs,
                fx: props.fx,
              })
            : h(AccountBrief, { key: a.key, account: a }),
        ),
        hidden > 0
          ? h('button', { type: 'button', className: 'mq-linkbtn', onClick: () => setExpanded(!expanded) }, t('moreAccounts').replace('{n}', String(hidden)))
          : others.length > 0
            ? h(
                'button',
                { type: 'button', className: 'mq-linkbtn', onClick: () => setExpanded(!expanded) },
                expanded ? t('fewerAccounts') : t('moreAccounts').replace('{n}', String(others.length)),
              )
            : null,
      );
    }

    function Overview(props) {
      const snapshot = props.snapshot;
      const [mode, setMode] = React.useState('remaining');
      const prefs = props.prefs ?? null;
      // Display prefs cut whole cards and accounts before anything renders.
      const hiddenProviders = new Set(Array.isArray(prefs?.hiddenProviders) ? prefs.hiddenProviders : []);
      const hiddenAccounts = new Set(Array.isArray(prefs?.hiddenAccounts) ? prefs.hiddenAccounts : []);
      const accounts = (Array.isArray(snapshot?.accounts) ? snapshot.accounts : [])
        .filter((a) => !hiddenAccounts.has(a.key) && !hiddenProviders.has(a.provider))
        .slice();
      accounts.sort((a, b) => sortKey(a) - sortKey(b));

      // "What am I using right now" outranks "what is tightest": Magpie reports
      // the account that served the most recent request, so lead with it.
      const activeKey = snapshot !== null && snapshot.lastRequest ? snapshot.lastRequest.key : null;
      if (activeKey !== null) {
        const index = accounts.findIndex((a) => a.key === activeKey);
        if (index > 0) accounts.unshift(accounts.splice(index, 1)[0]);
      }

      const groups = [];
      const index = new Map();
      for (const a of accounts) {
        if (!index.has(a.provider)) {
          const group = { provider: a.provider, title: a.name, planHint: a.plan, accounts: [] };
          index.set(a.provider, group);
          groups.push(group);
        }
        index.get(a.provider).accounts.push(a);
      }

      const counts = { crit: 0, warn: 0, error: 0, stale: 0 };
      for (const a of accounts) {
        if (a.status === 'error') {
          counts.error += 1;
          continue;
        }
        if (a.status === 'stale') counts.stale += 1;
        const w = worstWindow(a);
        if (w !== null) {
          const lv = level(w.remaining);
          if (lv === 'crit') counts.crit += 1;
          else if (lv === 'warn') counts.warn += 1;
        }
      }
      const chips = [];
      if (counts.crit) chips.push(h('span', { key: 'c', className: 'mq-chip mq-chip-crit' }, counts.crit + ' ' + t('sumCrit')));
      if (counts.warn) chips.push(h('span', { key: 'w', className: 'mq-chip mq-chip-warn' }, counts.warn + ' ' + t('sumWarn')));
      if (counts.error) chips.push(h('span', { key: 'e', className: 'mq-chip mq-chip-crit' }, counts.error + ' ' + t('sumError')));
      if (counts.stale) chips.push(h('span', { key: 's', className: 'mq-chip' }, counts.stale + ' ' + t('sumStale')));

      const banner =
        snapshot !== null && snapshot.ok === false
          ? h('div', { className: 'mq-banner', role: 'status' }, h('strong', null, t('offline')), h('span', null, snapshot.error ?? t('offlineHint')))
          : snapshot !== null && snapshot.stale === true
            ? h('div', { className: 'mq-banner mq-banner-soft', role: 'status' }, t('stale'))
            : null;

      let content;
      if (props.status === 'loading' && snapshot === null) {
        content = h('div', { className: 'mq-note' }, t('loading'));
      } else if (groups.length === 0) {
        content = h('div', { className: 'mq-empty' }, t('empty'));
      } else {
        content = h(
          'div',
          { className: 'mq-grid' },
          groups.map((group) =>
            h(ProviderCard, {
              activeKey,
              key: group.provider,
              group,
              mode,
              historyEnabled: props.historyEnabled,
              usage: snapshot?.usageByAccount ?? null,
              credits: snapshot?.creditsByAccount ?? null,
              prefs,
              fx: snapshot?.fx ?? null,
            }),
          ),
        );
      }

      return h(
        'div',
        { className: 'mq-root' },
        h(Style, null),
        h(
          'div',
          { className: 'mq-toolbar' },
          h(
            'div',
            { className: 'mq-toolbar-left' },
            h('h2', { className: 'mq-title' }, t('title')),
            h(Segmented, { value: props.period, options: PERIODS, onChange: props.onPeriod, label: t('title') }),
          ),
          h(
            'div',
            { className: 'mq-toolbar-right' },
            h(Totals, { usage: snapshot?.usage ?? null, fx: snapshot?.fx ?? null }),
            h(
              'button',
              { type: 'button', className: 'mq-btn', onClick: props.onRefresh, disabled: props.status === 'loading' },
              props.status === 'loading' ? t('refreshing') : t('refresh'),
            ),
          ),
        ),
        chips.length > 0 ? h('div', { className: 'mq-summary' }, chips) : null,
        banner,
        h(
          'div',
          { className: 'mq-sectionhead' },
          h('span', { className: 'mq-sectiontitle' }, t('sectionQuota')),
          h(
            Segmented,
            {
              value: mode,
              options: [
                { id: 'used', label: t('used') },
                { id: 'remaining', label: t('remaining') },
              ],
              onChange: setMode,
              label: t('sectionQuota'),
            },
          ),
        ),
        content,
        snapshot !== null && typeof snapshot.readAt === 'string'
          ? h('div', { className: 'mq-foot' }, t('updated') + ' ' + clock(snapshot.readAt))
          : null,
      );
    }

    /* ------------------------------------------------------------- settings page */


    const CSS_VIEWS = `
.mq-toolbar { display: flex; align-items: center; justify-content: space-between; gap: 12px; flex-wrap: wrap; margin: 0 0 8px; }
.mq-toolbar-left, .mq-toolbar-right { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }
.mq-title { margin: 0 12px 0 0; font-size: var(--dsw-font-base-16-font-size, 16px); font-weight: 600; }
.mq-summary { display: flex; gap: 6px; flex-wrap: wrap; margin: 0 0 8px; }
.mq-chip { font-size: 11px; padding: 1px 8px; border-radius: 999px; background: var(--dsw-alias-bg-layer-2, #f2f3f5); color: var(--dsw-alias-label-secondary, #57606a); }
.mq-chip-crit { background: var(--dsw-alias-state-error-secondary, #ffebe9); color: var(--dsw-alias-label-error, #cf222e); }
.mq-chip-warn { background: var(--dsw-alias-state-warn-secondary, #fff8c5); color: var(--dsw-alias-state-warn-label, #9a6700); }
.mq-banner { display: flex; gap: 8px; align-items: baseline; margin: 0 0 8px; padding: 7px 10px; border-radius: var(--dsw-radius-md, 8px); background: var(--dsw-alias-state-error-secondary, #ffebe9); font-size: 12px; }
.mq-banner-soft { background: var(--dsw-alias-state-warn-secondary, #fff8c5); }
.mq-sectionhead { display: flex; align-items: center; justify-content: space-between; gap: 10px; margin: 2px 0 8px; }
.mq-sectiontitle { font-weight: 600; font-size: var(--dsw-font-xs-13-font-size, 13px); color: var(--dsw-alias-label-secondary, #57606a); }
.mq-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(318px, 1fr)); gap: 12px; align-items: start; }
.mq-card { background: var(--dsw-alias-bg-layer-1, #fff); border: 1px solid var(--dsw-alias-border-l2, #d8dee4); border-radius: var(--dsw-radius-lg, 12px); padding: 14px 16px; }
.mq-cardhead { display: flex; align-items: center; gap: 9px; margin-bottom: 10px; }
.mq-cardhead-main { display: flex; flex-direction: column; gap: 1px; min-width: 0; }
.mq-icon { width: 22px; height: 22px; object-fit: contain; flex: 0 0 auto; border-radius: var(--dsw-radius-sm, 6px); }
.mq-sub { color: var(--dsw-alias-label-caption, #8b949e); font-size: 11px; }
.mq-name { font-weight: 600; font-size: var(--dsw-font-xs-13-font-size, 13px); }
.mq-plan { margin-left: auto; color: var(--dsw-alias-label-caption, #8b949e); font-size: 11px; }
.mq-account { display: flex; flex-direction: column; gap: 8px; }
.mq-account + .mq-account { margin-top: 12px; padding-top: 12px; border-top: 1px dashed var(--dsw-alias-border-l2, #d8dee4); }
.mq-accounthead { display: flex; align-items: center; gap: 7px; }
.mq-accname { color: var(--dsw-alias-label-secondary, #57606a); font-size: var(--dsw-font-xs-13-font-size, 13px); }
.mq-dot { width: 7px; height: 7px; border-radius: 50%; flex: 0 0 auto; }
.mq-badge { margin-left: 6px; padding: 1px 7px; border-radius: 999px; font-size: 11px; background: var(--dsw-alias-bg-layer-3, #eff1f3); color: var(--dsw-alias-label-secondary, #57606a); }
.mq-badge-crit { background: var(--dsw-alias-state-error-secondary, #ffebe9); color: var(--dsw-alias-label-error, #cf222e); }
.mq-badge-active { background: var(--dsw-alias-brand-primary, #1f6feb); color: var(--dsw-alias-label-primary-inverted, #fff); }
.mq-count { font-size: 12px; color: var(--dsw-alias-label-caption, #8b949e); }
.mq-brief { display: flex; align-items: baseline; gap: 7px; padding: 5px 0 5px 14px; font-size: var(--dsw-font-xs-13-font-size, 13px); border-top: 1px dashed var(--dsw-alias-border-l2, #d8dee4); margin-top: 8px; min-width: 0; }
.mq-briefname { color: var(--dsw-alias-label-secondary, #57606a); min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.mq-briefvalue { margin-left: auto; flex: 0 0 auto; white-space: nowrap; color: var(--dsw-alias-label-secondary, #57606a); font-variant-numeric: tabular-nums; }
.mq-pace-over { color: var(--dsw-alias-label-error, #cf222e); }
.mq-pace-under { color: var(--dsw-alias-state-success-primary, #3fb950); }
.mq-pace-zero { color: var(--dsw-alias-label-caption, #8b949e); }
.mq-cardmeta { margin-left: auto; display: inline-flex; align-items: center; gap: 6px; }
.mq-body { display: flex; flex-direction: column; gap: 10px; }
.mq-winhead { display: flex; align-items: baseline; justify-content: space-between; gap: 8px; margin-bottom: 6px; }
.mq-winlabel { color: var(--dsw-alias-label-secondary, #57606a); font-size: var(--dsw-font-xs-13-font-size, 13px); }
.mq-winvalue { color: var(--dsw-alias-label-primary, #1f2328); font-variant-numeric: tabular-nums; font-weight: 600; font-size: 15px; }
.mq-flag { margin-left: 4px; display: inline-flex; align-items: center; justify-content: center; min-width: 13px; height: 13px; padding: 0 3px; border-radius: 4px; font-size: 10px; font-weight: 700; line-height: 1; }
.mq-flag-crit { background: var(--dsw-alias-state-error-secondary, #ffebe9); color: var(--dsw-alias-label-error, #cf222e); }
.mq-flag-warn { background: var(--dsw-alias-state-warn-secondary, #fff8c5); color: var(--dsw-alias-state-warn-label, #9a6700); }
.mq-winmeta { margin-top: 4px; color: var(--dsw-alias-label-secondary, #57606a); font-size: 12px; line-height: 1.45; font-variant-numeric: tabular-nums; }
.mq-balance { display: flex; align-items: baseline; justify-content: space-between; }
.mq-balancelabel { color: var(--dsw-alias-label-secondary, #57606a); font-size: var(--dsw-font-xs-13-font-size, 13px); }
.mq-balancevalue { color: var(--dsw-alias-label-primary, #1f2328); font-weight: 600; font-variant-numeric: tabular-nums; font-size: 15px; }
.mq-trendhead { display: flex; align-items: baseline; gap: 8px; margin-bottom: 4px; }
.mq-trendtitle { color: var(--dsw-alias-label-secondary, #57606a); font-size: 12px; }
.mq-trendruns { color: var(--dsw-alias-label-caption, #8b949e); font-size: 12px; }
.mq-trendspan { margin-left: auto; color: var(--dsw-alias-label-caption, #8b949e); font-size: 12px; font-variant-numeric: tabular-nums; }
.mq-accmeta { display: flex; align-items: baseline; gap: 6px; flex-wrap: wrap; font-size: 12px; color: var(--dsw-alias-label-secondary, #57606a); }
.mq-metakey { color: var(--dsw-alias-label-caption, #8b949e); }
.mq-metaval { font-variant-numeric: tabular-nums; }
.mq-metasep { color: var(--dsw-alias-label-caption, #8b949e); }
.mq-accfoot { display: flex; align-items: center; justify-content: space-between; gap: 8px; margin-top: 2px; font-size: 12px; }
.mq-accfootstat { display: inline-flex; align-items: center; gap: 6px; min-width: 0; }
.mq-accfootdot { width: 7px; height: 7px; border-radius: 50%; flex: 0 0 auto; }
.mq-accfootlabel { color: var(--dsw-alias-label-secondary, #57606a); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.mq-accfootvalue { color: var(--dsw-alias-label-primary, #1f2328); font-weight: 600; font-variant-numeric: tabular-nums; }
.mq-accfoottime { margin-left: auto; flex: 0 0 auto; color: var(--dsw-alias-label-caption, #8b949e); }
@media (prefers-reduced-motion: reduce) { .mq-bar > i { transition: none; } }
`;

    /* ------------------------------------------------------------- settings page */

    /* Labels for the controls this fragment owns. 20-locale.js is not edited: the
     * zh/en dictionaries are plain objects in the same module scope, so missing
     * keys are added here (guarded, file-owned keys always win). */
    const SETTINGS_EXTRA_LOCALE = {
      zh: {
        density: '显示密度',
        densityCompact: '紧凑',
        densityDetailed: '详细',
        panelHeight: '面板高度',
        orbSize: '悬浮球大小',
        descPlacement: '额度信息出现的位置与尺寸',
        descDisplay: '选择面板上显示哪些信息',
        descSource: '额度数据的读取方式与频率',
      },
      en: {
        density: 'Density',
        densityCompact: 'Compact',
        densityDetailed: 'Detailed',
        panelHeight: 'Panel height',
        orbSize: 'Orb size',
        descPlacement: 'Where the panel lives and how big it is',
        descDisplay: 'Choose what the panel shows',
        descSource: 'How quota data is read and how often',
      },
    };
    for (const lang of ['zh', 'en']) {
      const dict = lang === 'zh' ? zh : en;
      for (const key of Object.keys(SETTINGS_EXTRA_LOCALE[lang])) {
        if (dict[key] === undefined) dict[key] = SETTINGS_EXTRA_LOCALE[lang][key];
      }
    }

    /** Mirror of lib/host/settings.js DEFAULT_SETTINGS; the host clamps on write. */
    const SETTINGS_DEFAULTS = Object.freeze({
      placement: 'dock',
      density: 'compact',
      panelHeight: 220,
      showBars: true,
      showResetTimes: true,
      showBalance: true,
      showUsage: true,
      showToday: true,
      showUpdatedAt: false,
      refreshMs: 30000,
      source: 'live',
      period: '30d',
      theme: 'auto',
      orbSize: 44,
      orbOpacity: 1,
      hiddenProviders: [],
      hiddenAccounts: [],
      accountOrder: [],
    });

    /** Booleans the host actually persists (lib/host/settings.js whitelist). */
    const SETTINGS_BOOLEANS = [
      { key: 'showBars', label: 'showBars' },
      { key: 'showResetTimes', label: 'showResetTimes' },
      { key: 'showBalance', label: 'showBalance' },
      { key: 'showUsage', label: 'showUsage' },
      { key: 'showToday', label: 'showToday' },
      { key: 'showUpdatedAt', label: 'showUpdatedAt' },
    ];

    const SETTINGS_REFRESH_CHOICES = [
      { id: 15000, label: '15s' },
      { id: 30000, label: '30s' },
      { id: 60000, label: '60s' },
    ];

    const SETTINGS_DENSITY_CHOICES = [
      { id: 'compact', key: 'densityCompact' },
      { id: 'detailed', key: 'densityDetailed' },
    ];

    function accountTone(account) {
      if (account.status === 'error') return 'crit';
      return level(worstWindow(account)?.remaining ?? null);
    }

    function SettingSection(props) {
      return h(
        'section',
        { className: 'mq-set-section', 'aria-labelledby': props.labelId },
        h('div', { className: 'mq-set-secthead' },
          h('h3', { id: props.labelId, className: 'mq-set-sectiontitle' }, props.title),
          props.desc ? h('p', { className: 'mq-set-sectdesc' }, props.desc) : null,
        ),
        props.children,
      );
    }

    function BooleanRow(props) {
      return h(
        'label',
        { className: 'mq-set-row mq-set-checkrow' },
        h('input', {
          type: 'checkbox',
          checked: props.checked === true,
          onChange: (event) => props.onChange(event.target.checked),
        }),
        h('span', null, props.label),
      );
    }

    /**
     * Range input with a live numeric readout. Dragging only updates the local
     * mirror; the write is committed on pointer-up / key-up / blur so one gesture
     * costs one POST.
     */
    function SliderRow(props) {
      const [value, setValue] = React.useState(props.value);
      const committed = React.useRef(props.value);
      React.useEffect(() => {
        setValue(props.value);
        committed.current = props.value;
      }, [props.value]);
      const commit = () => {
        if (committed.current !== value) {
          committed.current = value;
          props.onCommit(value);
        }
      };
      return h('div', { className: 'mq-set-field' },
        h('div', { className: 'mq-set-sliderhead' },
          h('span', { className: 'mq-set-fieldlabel' }, props.label),
          h('output', { className: 'mq-set-sliderval' }, String(value) + ' px'),
        ),
        h('input', {
          type: 'range',
          className: 'mq-set-slider',
          min: props.min,
          max: props.max,
          step: 1,
          value: value,
          'aria-label': props.label,
          'aria-valuemin': props.min,
          'aria-valuemax': props.max,
          'aria-valuenow': value,
          onChange: (event) => setValue(Number(event.target.value)),
          onPointerUp: commit,
          onKeyUp: commit,
          onBlur: commit,
        }),
      );
    }

    function SettingsSkeleton() {
      return h('div', { className: 'mq-set-skeleton', role: 'status' },
        h('span', { className: 'mq-set-sronly' }, t('loading')),
        h('div', { className: 'mq-set-skelhead', 'aria-hidden': true },
          h('div', { className: 'mq-skel mq-skel-title' }),
          h('div', { className: 'mq-skel mq-skel-line' }),
        ),
        [0, 1, 2].map((i) =>
          h('div', { className: 'mq-set-section', key: i, 'aria-hidden': true },
            h('div', { className: 'mq-skel mq-skel-title' }),
            h('div', { className: 'mq-skel mq-skel-line' }),
            h('div', { className: 'mq-skel mq-skel-row' }),
            h('div', { className: 'mq-skel mq-skel-row' }),
          ),
        ),
      );
    }

    function AccountRow(props) {
      const a = props.account;
      const tone = accountTone(a);
      const hidden = props.hidden;
      return h(
        'li',
        { className: 'mq-set-acct' },
        h('span', { className: 'mq-set-dot', style: { background: LEVEL_VAR[tone] }, 'aria-hidden': true }),
        h(
          'span',
          { className: 'mq-set-acctname', title: a.user ?? a.name },
          a.name,
          a.userMasked && a.userMasked !== a.name ? h('span', { className: 'mq-set-acctsub' }, a.userMasked) : null,
          a.status === 'error' ? h('span', { className: 'mq-set-badge' }, t('error')) : null,
        ),
        h('button', {
          type: 'button',
          className: 'mq-btn mq-set-toggle',
          'aria-pressed': hidden,
          onClick: () => props.onToggle(a.key),
        }, hidden ? t('show') : t('hide')),
      );
    }

    function SourceRow(props) {
      const s = props.source;
      const text = s.ok === true ? (typeof s.readAt === 'string' ? clock(s.readAt) : null) : friendlyError(s.error);
      return h(
        'li',
        { className: 'mq-set-acct' },
        h('span', {
          className: 'mq-set-dot',
          style: { background: LEVEL_VAR[s.ok === true ? 'ok' : 'crit'] },
          'aria-hidden': true,
        }),
        h('span', { className: 'mq-set-acctname' }, s.id),
        h(
          'span',
          { className: 'mq-set-srcmeta', title: s.error ?? '' },
          s.ok === true ? (text ?? '—') : (text ?? t('error')),
        ),
      );
    }

    function SettingsPage() {
      const [prefs, setPrefs] = React.useState(null);
      const [file, setFile] = React.useState('');
      const [loadError, setLoadError] = React.useState(null);
      const [saveError, setSaveError] = React.useState(null);
      const [savedTick, setSavedTick] = React.useState(0);
      const [snapshot, setSnapshot] = React.useState(null);
      const [snapError, setSnapError] = React.useState(null);
      const [saving, setSaving] = React.useState(false);
      const [nonce, setNonce] = React.useState(0);

      React.useEffect(() => {
        let alive = true;
        getJson(SETTINGS_ROUTE)
          .then((payload) => {
            if (!alive) return;
            if (payload && payload.ok === true) {
              setPrefs(payload.settings);
              // Push the new settings to every mounted surface right away.
              publishSettings(payload.settings);
              setFile(typeof payload.file === 'string' ? payload.file : '');
            } else {
              setLoadError(payload && payload.error ? String(payload.error) : t('error'));
            }
          })
          .catch((e) => {
            if (alive) setLoadError(String((e && e.message) || e));
          });
        getJson(ROUTE + '?period=30d')
          .then((payload) => {
            if (!alive) return;
            if (payload && payload.ok === true) setSnapshot(payload);
            else setSnapError(payload && payload.error ? String(payload.error) : t('error'));
          })
          .catch((e) => {
            if (alive) setSnapError(String((e && e.message) || e));
          });
        return () => {
          alive = false;
        };
      }, [nonce]);

      const save = React.useCallback((patch) => {
        setSaveError(null);
        setPrefs((cur) => (cur === null ? cur : { ...cur, ...patch }));
        setSaving(true);
        fetch(apiUrl(SETTINGS_ROUTE), {
          method: 'POST',
          credentials: 'same-origin',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(patch),
        })
          .then((response) => response.json())
          .then((payload) => {
            if (payload && payload.ok === true) {
              setPrefs(payload.settings);
              // Push the new settings to every mounted surface right away.
              publishSettings(payload.settings);
              setFile(typeof payload.file === 'string' ? payload.file : '');
              setSavedTick((n) => n + 1);
            } else {
              setSaveError(payload && payload.error ? String(payload.error) : t('error'));
            }
          })
          .catch((e) => setSaveError(String((e && e.message) || e)))
          .then(() => setSaving(false));
      }, []);

      const resetDefaults = React.useCallback(() => save({ ...SETTINGS_DEFAULTS }), [save]);

      const toggleAccount = React.useCallback(
        (key) => {
          const current = Array.isArray(prefs?.hiddenAccounts) ? prefs.hiddenAccounts : [];
          const next = current.includes(key) ? current.filter((k) => k !== key) : current.concat(key);
          save({ hiddenAccounts: next });
        },
        [prefs, save],
      );

      if (prefs === null) {
        return h(
          'div',
          { className: 'mq-root mq-set' },
          h(Style, null),
          loadError !== null
            ? h(React.Fragment, null,
                h('div', { className: 'mq-set-error', role: 'alert' }, loadError),
                h('div', null,
                  h('button', {
                    type: 'button',
                    className: 'mq-btn',
                    onClick: () => setNonce((n) => n + 1),
                  }, t('refresh')),
                ),
              )
            : h(SettingsSkeleton, null),
        );
      }

      const accounts = Array.isArray(snapshot?.accounts) ? snapshot.accounts : [];
      const sources = Array.isArray(snapshot?.sources) ? snapshot.sources : [];
      const hidden = Array.isArray(prefs.hiddenAccounts) ? prefs.hiddenAccounts : [];
      const placementOptions = [
        { id: 'dock', label: t('placementDock') },
        { id: 'orb', label: t('placementOrb') },
      ];
      const sourceOptions = [
        { id: 'live', label: t('sourceLive') },
        { id: 'cache', label: t('sourceCache') },
      ];
      const densityOptions = SETTINGS_DENSITY_CHOICES.map((choice) => ({ id: choice.id, label: t(choice.key) }));

      return h(
        'div',
        { className: 'mq-root mq-set' },
        h(Style, null),
        h('div', { className: 'mq-set-head' },
          h('h2', { className: 'mq-title' }, t('settingsTitle')),
          h('span', { className: 'mq-set-hint' }, t('settingsHint')),
        ),

        h(SettingSection, { labelId: 'mq-set-placement', title: t('placement'), desc: t('descPlacement') },
          h(Segmented, {
            value: prefs.placement,
            options: placementOptions,
            onChange: (id) => save({ placement: id }),
            label: t('placement'),
          }),
          prefs.placement === 'orb'
            ? h(SliderRow, {
                key: 'orbSize',
                label: t('orbSize'),
                min: 32,
                max: 72,
                value: typeof prefs.orbSize === 'number' ? prefs.orbSize : SETTINGS_DEFAULTS.orbSize,
                onCommit: (v) => save({ orbSize: v }),
              })
            : h(SliderRow, {
                key: 'panelHeight',
                label: t('panelHeight'),
                min: 120,
                max: 360,
                value: typeof prefs.panelHeight === 'number' ? prefs.panelHeight : SETTINGS_DEFAULTS.panelHeight,
                onCommit: (v) => save({ panelHeight: v }),
              }),
        ),

        h(SettingSection, { labelId: 'mq-set-display', title: t('displayItems'), desc: t('descDisplay') },
          h('div', { className: 'mq-set-field' },
            h('span', { className: 'mq-set-fieldlabel' }, t('density')),
            h(Segmented, {
              value: prefs.density,
              options: densityOptions,
              onChange: (id) => save({ density: id }),
              label: t('density'),
            }),
          ),
          h('div', { className: 'mq-set-rows' },
            SETTINGS_BOOLEANS.map((field) =>
              h(BooleanRow, {
                key: field.key,
                label: t(field.label),
                checked: prefs[field.key],
                onChange: (value) => save({ [field.key]: value }),
              }),
            ),
          ),
        ),

        h(SettingSection, { labelId: 'mq-set-accounts', title: t('accounts') },
          snapError !== null
            ? h('div', { className: 'mq-set-error', role: 'alert' }, snapError)
            : accounts.length === 0
              ? h('div', { className: 'mq-note' }, snapshot === null ? t('loading') : t('empty'))
              : h(
                  'ul',
                  { className: 'mq-set-accts' },
                  accounts.map((a) =>
                    h(AccountRow, { key: a.key, account: a, hidden: hidden.includes(a.key), onToggle: toggleAccount }),
                  ),
                ),
        ),

        h(SettingSection, { labelId: 'mq-set-source', title: t('dataSource'), desc: t('descSource') },
          h('div', { className: 'mq-set-field' },
            h(Segmented, {
              value: prefs.source,
              options: sourceOptions,
              onChange: (id) => save({ source: id }),
              label: t('dataSource'),
            }),
          ),
          h('div', { className: 'mq-set-field' },
            h('span', { className: 'mq-set-fieldlabel' }, t('refreshEvery')),
            h(Segmented, {
              value: prefs.refreshMs,
              options: SETTINGS_REFRESH_CHOICES,
              onChange: (id) => save({ refreshMs: id }),
              label: t('refreshEvery'),
            }),
          ),
        ),

        h(SettingSection, { labelId: 'mq-set-diag', title: t('diagnostics') },
          sources.length === 0
            ? h('div', { className: 'mq-note' }, snapshot === null ? t('loading') : t('empty'))
            : h('ul', { className: 'mq-set-accts' }, sources.map((s, i) => h(SourceRow, { key: s.id ?? i, source: s }))),
          file !== '' ? h('code', { className: 'mq-set-file' }, file) : null,
        ),

        h('div', { className: 'mq-set-foot' },
          h('button', {
            type: 'button',
            className: 'mq-btn',
            onClick: resetDefaults,
            disabled: saving,
          }, t('resetDefaults')),
          h('div', { className: 'mq-set-status', role: 'status', 'aria-live': 'polite' },
            saveError !== null
              ? h('span', { className: 'mq-set-error', role: 'alert' }, saveError)
              : savedTick > 0 && !saving
                ? h('span', { className: 'mq-set-ok' }, t('saved'))
                : null,
          ),
        ),
      );
    }

    const CSS_SETTINGS = `
.mq-set { display: flex; flex-direction: column; gap: 14px; max-width: 640px; }
.mq-set-head { display: flex; flex-direction: column; gap: 3px; }
.mq-set-hint { color: var(--dsw-alias-label-caption, #8b949e); font-size: 12px; }
.mq-set-section { display: flex; flex-direction: column; gap: 8px; background: var(--dsw-alias-bg-layer-1, #fff); border: 1px solid var(--dsw-alias-border-l2, #d8dee4); border-radius: var(--dsw-radius-lg, 12px); padding: 14px 16px 16px; }
.mq-set-secthead { display: flex; flex-direction: column; gap: 2px; }
.mq-set-sectiontitle { margin: 0; font-size: var(--dsw-font-base-16-font-size, 16px); font-weight: 600; color: var(--dsw-alias-label-primary, #1f2328); }
.mq-set-sectdesc { margin: 0; font-size: 12px; color: var(--dsw-alias-label-caption, #8b949e); }
.mq-set-rows { display: flex; flex-direction: column; }
.mq-set-row { display: flex; align-items: center; gap: 10px; min-height: 32px; }
.mq-set-row + .mq-set-row { border-top: 1px dashed var(--dsw-alias-border-l2, #d8dee4); }
.mq-set-checkrow { cursor: pointer; }
.mq-set-checkrow input { accent-color: var(--dsw-alias-brand-primary, #1f6feb); width: 16px; height: 16px; margin: 0; cursor: pointer; }
.mq-set-checkrow:focus-within { outline: 2px solid var(--dsw-alias-brand-primary, #1f6feb); outline-offset: 2px; border-radius: var(--dsw-radius-sm, 6px); }
.mq-set-accts { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; }
.mq-set-acct { display: flex; align-items: center; gap: 8px; min-height: 34px; }
.mq-set-acct + .mq-set-acct { border-top: 1px dashed var(--dsw-alias-border-l2, #d8dee4); }
.mq-set-dot { width: 7px; height: 7px; border-radius: 50%; flex: 0 0 auto; }
.mq-set-acctname { color: var(--dsw-alias-label-primary, #1f2328); font-size: var(--dsw-font-xs-13-font-size, 13px); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.mq-set-acctsub { margin-left: 7px; color: var(--dsw-alias-label-caption, #8b949e); font-size: 12px; }
.mq-set-badge { margin-left: 7px; padding: 1px 7px; border-radius: 999px; font-size: 11px; background: var(--dsw-alias-state-error-secondary, #ffebe9); color: var(--dsw-alias-label-error, #cf222e); }
.mq-set-toggle { margin-left: auto; flex: 0 0 auto; min-width: 58px; }
.mq-set-field { display: flex; flex-direction: column; gap: 6px; }
.mq-set-field .mq-seg, .mq-set-section > .mq-seg { align-self: flex-start; }
.mq-set-fieldlabel { color: var(--dsw-alias-label-caption, #8b949e); font-size: 12px; }
.mq-set-sliderhead { display: flex; align-items: baseline; gap: 8px; max-width: 300px; }
.mq-set-sliderval { margin-left: auto; color: var(--dsw-alias-label-secondary, #57606a); font-size: var(--dsw-font-xs-13-font-size, 13px); font-variant-numeric: tabular-nums; }
.mq-set-slider { width: 300px; max-width: 100%; accent-color: var(--dsw-alias-brand-primary, #1f6feb); margin: 2px 0 0; cursor: pointer; }
.mq-set-slider:focus-visible { outline: 2px solid var(--dsw-alias-brand-primary, #1f6feb); outline-offset: 2px; border-radius: var(--dsw-radius-sm, 6px); }
.mq-set-srcmeta { margin-left: auto; color: var(--dsw-alias-label-caption, #8b949e); font-size: 12px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.mq-set-file { align-self: flex-start; font-family: var(--dsw-font-mono, ui-monospace, SFMono-Regular, Menlo, monospace); font-size: 12px; color: var(--dsw-alias-label-secondary, #57606a); background: var(--dsw-alias-bg-layer-2, #f2f3f5); border-radius: var(--dsw-radius-sm, 6px); padding: 4px 8px; word-break: break-all; }
.mq-set-error { color: var(--dsw-alias-label-error, #cf222e); font-size: var(--dsw-font-xs-13-font-size, 13px); }
.mq-set-ok { color: var(--dsw-alias-state-success-primary, #3fb950); font-size: var(--dsw-font-xs-13-font-size, 13px); }
.mq-set-foot { display: flex; align-items: center; gap: 12px; }
.mq-set-status { margin-left: auto; min-height: 20px; display: flex; align-items: center; }
.mq-set-skeleton { display: flex; flex-direction: column; gap: 14px; }
.mq-set-skelhead { display: flex; flex-direction: column; gap: 6px; }
.mq-skel { border-radius: var(--dsw-radius-sm, 6px); background: var(--dsw-alias-fill-l2, #eaeef2); animation: mq-pulse 1.3s ease-in-out infinite; }
.mq-skel-title { width: 110px; height: 14px; }
.mq-skel-line { width: 100%; height: 12px; }
.mq-skel-row { width: 68%; height: 12px; }
@keyframes mq-pulse { 0%, 100% { opacity: 1; } 50% { opacity: .45; } }
.mq-set-sronly { position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0 0 0 0); white-space: nowrap; }
`;

    /* surfaces: composer dock chip / floating orb (owned by the surfaces owner) */

    const ORB_POSITION_KEY = 'magpie-usage:orb';
    const PANEL_POSITION_KEY = 'magpie-usage:panel-pos';
    const PANEL_EDGE = 8;
    const ORB_DEFAULT_SIZE = 44;
    const TOOLTIP_MAX_LINES = 6;

    /* ------------------------------------------------------------ shared helpers */

    /** Clamp an orb position so the ball stays fully inside the viewport. */
    function orbClamp(pos, size) {
      const maxX = Math.max(0, window.innerWidth - size);
      const maxY = Math.max(0, window.innerHeight - size);
      return { x: Math.min(Math.max(0, pos.x), maxX), y: Math.min(Math.max(0, pos.y), maxY) };
    }

    function orbHomePosition(size) {
      return { x: Math.max(0, window.innerWidth - size - 12), y: 96 };
    }

    function orbSavePosition(pos) {
      try {
        localStorage.setItem(ORB_POSITION_KEY, JSON.stringify(pos));
      } catch (error) {
        // storage unavailable: keep the position for this session only
      }
    }

    function orbLoadPosition(size) {
      try {
        const raw = localStorage.getItem(ORB_POSITION_KEY);
        const parsed = raw !== null ? JSON.parse(raw) : null;
        if (parsed !== null && typeof parsed.x === 'number' && typeof parsed.y === 'number') {
          return orbClamp(parsed, size);
        }
      } catch (error) {
        return orbHomePosition(size); // corrupted or unavailable storage: use the default corner
      }
      return orbHomePosition(size);
    }

    /**
     * The account the collapsed surface is "about": a failed read outranks any
     * numeric remaining; otherwise the account whose tightest window is lowest.
     */
    function tightestAccount(snapshot) {
      const accounts = Array.isArray(snapshot?.accounts) ? snapshot.accounts : [];
      let failed = null;
      let lowest = null;
      for (const a of accounts) {
        if (a.status === 'error') {
          if (failed === null) failed = a;
          continue;
        }
        const w = worstWindow(a);
        if (w !== null && (lowest === null || w.remaining < worstWindow(lowest).remaining)) lowest = a;
      }
      if (failed !== null) return { account: failed, window: null, level: 'crit' };
      if (lowest !== null) {
        const w = worstWindow(lowest);
        return { account: lowest, window: w, level: level(w.remaining) };
      }
      return null;
    }

    /**
     * The account a collapsed surface is "about": the plan in use wins, because
     * Magpie reports the account that served the most recent request. Falls back
     * to the tightest account when nothing has been served yet.
     */
    function preferredAccount(snapshot) {
      const key = snapshot !== null && snapshot.lastRequest ? snapshot.lastRequest.key : null;
      if (key !== null) {
        const accounts = Array.isArray(snapshot.accounts) ? snapshot.accounts : [];
        const match = accounts.find((a) => a.key === key);
        if (match !== undefined) {
          if (match.status === 'error') return { account: match, window: null, level: 'crit' };
          const w = worstWindow(match);
          if (w !== null) return { account: match, window: w, level: level(w.remaining) };
          if (match.balance !== null) return { account: match, window: null, level: 'ok', balance: true };
        }
      }
      return tightestAccount(snapshot);
    }

    function tightestText(worst) {
      if (worst === null) return t('loading');
      const a = worst.account;
      if (worst.window === null) return a.name + '：' + friendlyError(a.error);
      return a.name + ' ' + worst.window.label + ' ' + t('remaining') + ' ' + pct(worst.window.remaining);
    }

    /** One line per account, for the dock tooltip. */
    function surfaceTooltipLines(snapshot) {
      const accounts = Array.isArray(snapshot?.accounts) ? snapshot.accounts : [];
      if (accounts.length === 0) return [t('loading')];
      return accounts.map((a) => {
        if (a.status === 'error') return a.name + '：' + friendlyError(a.error);
        const w = worstWindow(a);
        if (w !== null) return a.name + ' · ' + w.label + ' ' + t('remaining') + ' ' + pct(w.remaining);
        if (a.balance !== null && a.balance !== undefined) return a.name + ' · ' + t('balance') + ' ' + a.balance.text;
        return a.name + ' · ' + t('unsupported');
      });
    }

    /** First N lines plus a "+more" tail so the tooltip never grows unbounded. */
    function surfaceTooltipTree(snapshot) {
      const lines = surfaceTooltipLines(snapshot);
      const shown = lines.slice(0, TOOLTIP_MAX_LINES);
      const hidden = lines.length - shown.length;
      if (hidden > 0) shown.push('… 还有 ' + hidden + ' 个账号');
      return h(
        React.Fragment,
        null,
        shown.map((line, i) => h('div', { key: i, className: i === shown.length - 1 && hidden > 0 ? 'mq-dock-tip-more' : '' }, line)),
      );
    }

    /* ------------------------------------------------------------ shared hooks */

    /** Clamp a floating panel so it never leaves the viewport (8px margin). */
    function panelClamp(pos, width, height) {
      const maxX = Math.max(PANEL_EDGE, window.innerWidth - width - PANEL_EDGE);
      const maxY = Math.max(PANEL_EDGE, window.innerHeight - height - PANEL_EDGE);
      return { x: Math.min(Math.max(PANEL_EDGE, pos.x), maxX), y: Math.min(Math.max(PANEL_EDGE, pos.y), maxY) };
    }

    function panelSavePosition(pos) {
      try {
        localStorage.setItem(PANEL_POSITION_KEY, JSON.stringify(pos));
      } catch (error) {
        // storage unavailable: keep the position for this session only
      }
    }

    function panelClearPosition() {
      try {
        localStorage.removeItem(PANEL_POSITION_KEY);
      } catch (error) {
        // storage unavailable: nothing to clear
      }
    }

    function panelLoadPosition() {
      try {
        const raw = localStorage.getItem(PANEL_POSITION_KEY);
        const parsed = raw !== null ? JSON.parse(raw) : null;
        if (parsed !== null && typeof parsed.x === 'number' && typeof parsed.y === 'number') return parsed;
      } catch (error) {
        return null; // corrupted storage: fall back to the anchored position
      }
      return null;
    }

    /** One snapshot/period/settings bundle per surface (hooks stay unconditional). */
    function useSurfaceData() {
      const [period, setPeriod] = React.useState('30d');
      const [state, load] = useSnapshot(period);
      const prefs = useSettings();
      return { period, setPeriod, state, load, prefs };
    }

    function useSurfaceOpen() {
      const [open, setOpen] = React.useState(false);
      const triggerRef = React.useRef(null);
      const close = React.useCallback(() => {
        setOpen(false);
        const el = triggerRef.current;
        if (el !== null && typeof el.focus === 'function') el.focus();
      }, []);
      return { open, setOpen, close, triggerRef };
    }

    /**
     * Shared dialog shell with a draggable head: Esc and outside pointerdown
     * close it, focus moves to the panel on open and back to the trigger on
     * close. The node stays inside the surface's own tree; only its position
     * is fixed. While dragged the panel is repositioned to explicit left/top;
     * the last position is remembered in localStorage and reset returns to the
     * default anchored spot (centered for dock). Listeners bind once per open
     * in single effects with stable deps, so nothing piles up.
     */
    function SurfacePopover(props) {
      const panelRef = React.useRef(null);
      const dragRef = React.useRef(null);
      const draggingRef = React.useRef(false);
      const defaultPosRef = React.useRef(null);
      const [pos, setPos] = React.useState(null); // null = anchored (props.style)
      const [dragging, setDragging] = React.useState(false);
      const [dragged, setDragged] = React.useState(false);

      React.useEffect(() => {
        const panel = panelRef.current;
        if (panel !== null) panel.focus();
        const onKey = (event) => {
          if (event.key === 'Escape') {
            event.stopPropagation();
            props.onClose();
          }
        };
        const onDown = (event) => {
          if (draggingRef.current === true) return; // a drag must never count as "outside"
          const node = panelRef.current;
          const anchor = props.anchorRef !== undefined ? props.anchorRef.current : null;
          if (node !== null && !node.contains(event.target) && !(anchor !== null && anchor.contains(event.target))) {
            props.onClose();
          }
        };
        document.addEventListener('keydown', onKey, true);
        document.addEventListener('pointerdown', onDown, true);
        return () => {
          document.removeEventListener('keydown', onKey, true);
          document.removeEventListener('pointerdown', onDown, true);
          document.body.style.userSelect = '';
        };
      }, [props.onClose, props.anchorRef]);

      // Measure the anchored layout once; adopt a stored position only if the
      // panel would still fit inside the viewport, otherwise drop it.
      React.useEffect(() => {
        const panel = panelRef.current;
        if (panel === null) return;
        const rect = panel.getBoundingClientRect();
        defaultPosRef.current = panelClamp({ x: rect.left, y: rect.top }, rect.width, rect.height);
        const stored = panelLoadPosition();
        if (
          stored !== null &&
          stored.x >= PANEL_EDGE &&
          stored.y >= PANEL_EDGE &&
          stored.x + rect.width <= window.innerWidth - PANEL_EDGE &&
          stored.y + rect.height <= window.innerHeight - PANEL_EDGE
        ) {
          setPos(panelClamp(stored, rect.width, rect.height));
          setDragged(true);
        } else if (stored !== null) {
          panelClearPosition(); // stale position from a smaller viewport: drop it
        }
      }, []);

      React.useEffect(() => {
        const onResize = () => {
          setPos((current) => {
            if (current === null) return current;
            const panel = panelRef.current;
            const rect = panel !== null ? panel.getBoundingClientRect() : null;
            return rect !== null ? panelClamp(current, rect.width, rect.height) : current;
          });
        };
        window.addEventListener('resize', onResize);
        return () => window.removeEventListener('resize', onResize);
      }, []);

      const onHeadPointerDown = (event) => {
        if (event.button !== 0) return;
        const target = event.target;
        if (target !== null && typeof target.closest === 'function'
          && target.closest('button, a, input, select, textarea, [role="tab"]') !== null) return;
        const panel = panelRef.current;
        if (panel === null) return;
        const rect = panel.getBoundingClientRect();
        dragRef.current = {
          startX: event.clientX,
          startY: event.clientY,
          origX: rect.left,
          origY: rect.top,
          width: rect.width,
          height: rect.height,
        };
        draggingRef.current = true;
        setDragging(true);
        document.body.style.userSelect = 'none';
        event.currentTarget.setPointerCapture(event.pointerId);
        event.preventDefault();
      };
      const onHeadPointerMove = (event) => {
        const drag = dragRef.current;
        if (drag === null) return;
        setDragged(true);
        setPos(panelClamp(
          { x: drag.origX + (event.clientX - drag.startX), y: drag.origY + (event.clientY - drag.startY) },
          drag.width,
          drag.height,
        ));
      };
      const onHeadPointerUp = () => {
        const drag = dragRef.current;
        dragRef.current = null;
        draggingRef.current = false;
        setDragging(false);
        document.body.style.userSelect = '';
        if (drag === null) return;
        setPos((current) => {
          if (current !== null) panelSavePosition(current);
          return current;
        });
      };
      const onHeadKeyDown = (event) => {
        const base = pos !== null ? pos : defaultPosRef.current;
        if (base === null) return;
        const step = event.shiftKey ? 1 : 8;
        let next = null;
        if (event.key === 'ArrowLeft') next = { x: base.x - step, y: base.y };
        else if (event.key === 'ArrowRight') next = { x: base.x + step, y: base.y };
        else if (event.key === 'ArrowUp') next = { x: base.x, y: base.y - step };
        else if (event.key === 'ArrowDown') next = { x: base.x, y: base.y + step };
        else return;
        event.preventDefault();
        const panel = panelRef.current;
        const rect = panel !== null ? panel.getBoundingClientRect() : { width: 0, height: 0 };
        const clamped = panelClamp(next, rect.width, rect.height);
        setPos(clamped);
        setDragged(true);
        panelSavePosition(clamped);
      };
      const resetPosition = () => {
        panelClearPosition();
        setPos(defaultPosRef.current);
        setDragged(false);
      };

      const style = pos !== null
        ? { ...props.style, left: pos.x, top: pos.y, right: 'auto', bottom: 'auto', transform: 'none' }
        : props.style;
      return h(
        'div',
        {
          ref: panelRef,
          className: 'mq-panel ' + props.className,
          style,
          role: 'dialog',
          'aria-modal': false,
          'aria-label': t('title'),
          tabIndex: -1,
          'data-dragging': dragging ? 'true' : 'false',
        },
        h(
          'div',
          {
            className: 'mq-panel-head',
            tabIndex: 0,
            'aria-label': '拖动面板',
            onPointerDown: onHeadPointerDown,
            onPointerMove: onHeadPointerMove,
            onPointerUp: onHeadPointerUp,
            onKeyDown: onHeadKeyDown,
            onDoubleClick: resetPosition,
          },
          h('span', { className: 'mq-panel-grip', 'aria-hidden': true }, '⋮⋮'),
          dragged
            ? h(
                'button',
                { type: 'button', className: 'mq-panel-reset', 'aria-label': '复位位置', title: '复位位置', onClick: resetPosition },
                '↺',
              )
            : null,
        ),
        h('div', { className: 'mq-panel-body' }, props.children),
      );
    }

    function SurfaceOverview(props) {
      return h(Overview, {
        status: props.state.status,
        snapshot: props.state.data,
        period: props.period,
        prefs: props.prefs,
        historyEnabled: true,
        onPeriod: props.setPeriod,
        onRefresh: () => props.load(true),
      });
    }

    /* ------------------------------------------------------------ three surfaces */

    function DockSurface() {
      const { period, setPeriod, state, load, prefs } = useSurfaceData();
      const { open, setOpen, close, triggerRef } = useSurfaceOpen();
      const [tipOn, setTipOn] = React.useState(false);
      if (prefs.placement !== 'dock') return null;

      const worst = preferredAccount(state.data);
      const dot = LEVEL_VAR[worst !== null ? worst.level : 'unknown'];
      let panelStyle = null;
      let tipStyle = null;
      if (open || tipOn) {
        const rect = triggerRef.current !== null ? triggerRef.current.getBoundingClientRect() : null;
        if (rect !== null) {
          // Default: horizontally centered in the viewport (user preference);
          // vertical stays anchored to the chip — opens downward, or upward
          // when the panel would fall off the bottom of the window.
          const GAP = 8;
          const panelWidth = Math.min(720, window.innerWidth - 32);
          const panelHeight = Math.min(560, window.innerHeight - 120);
          const vertical = rect.bottom + GAP + panelHeight > window.innerHeight
            ? { bottom: Math.max(8, window.innerHeight - rect.top + GAP) }
            : { top: rect.bottom + GAP };
          const horizontal = Math.max(GAP, (window.innerWidth - panelWidth) / 2);
          panelStyle = open ? { ...vertical, left: horizontal } : null;
          tipStyle = {
            top: Math.min(rect.bottom + 6, Math.max(8, window.innerHeight - 140)),
            left: Math.max(8, Math.min(rect.left, window.innerWidth - 308)),
          };
        } else if (open) {
          panelStyle = { bottom: 60, left: 16 };
        }
      }
      return h(
        'div',
        { className: 'mq-dock-wrap' },
        h(Style, null),
        h(
          'button',
          {
            ref: triggerRef,
            type: 'button',
            className: 'mq-dock-chip',
            'aria-expanded': open,
            'aria-haspopup': 'dialog',
            'aria-label': 'Magpie ' + t('title') + ' · ' + tightestText(worst),
            'aria-describedby': 'mq-dock-tip',
            onMouseEnter: () => setTipOn(true),
            onMouseLeave: () => setTipOn(false),
            onFocus: () => setTipOn(true),
            onBlur: () => setTipOn(false),
            onClick: () => (open ? close() : setOpen(true)),
          },
          h('span', { className: 'mq-dock-dot', style: { background: dot }, 'aria-hidden': true }),
          pct(worst !== null && worst.window !== null ? worst.window.remaining : null),
        ),
        h(
          'div',
          { id: 'mq-dock-tip', role: 'tooltip', className: 'mq-dock-tip', style: tipStyle, hidden: !tipOn || open },
          surfaceTooltipTree(state.data),
        ),
        open
          ? h(
              SurfacePopover,
              { className: 'mq-dock-panel', style: panelStyle, anchorRef: triggerRef, onClose: close },
              h(SurfaceOverview, { state, period, setPeriod, load, prefs }),
            )
          : null,
      );
    }

    function OrbSurface() {
      const { period, setPeriod, state, load, prefs } = useSurfaceData();
      const { open, setOpen, close, triggerRef } = useSurfaceOpen();
      const size = typeof prefs.orbSize === 'number' && prefs.orbSize >= 32 && prefs.orbSize <= 72
        ? prefs.orbSize
        : ORB_DEFAULT_SIZE;
      const [pos, setPos] = React.useState(() => orbLoadPosition(size));
      const [dragging, setDragging] = React.useState(false);
      const dragRef = React.useRef(null);
      React.useEffect(() => {
        const onResize = () => setPos((current) => orbClamp(current, size));
        window.addEventListener('resize', onResize);
        return () => window.removeEventListener('resize', onResize);
      }, [size]);
      if (prefs.placement !== 'orb') return null;

      const worst = preferredAccount(state.data);
      const lv = worst !== null ? worst.level : 'unknown';
      const orbText = worst !== null && worst.window !== null ? pct(worst.window.remaining) : worst !== null ? '!' : '—';
      const orbStyle = {
        width: size,
        height: size,
        left: 0,
        top: 0,
        transform: 'translate(' + pos.x + 'px, ' + pos.y + 'px)',
        willChange: 'transform',
        borderColor: LEVEL_VAR[lv],
        opacity: typeof prefs.orbOpacity === 'number' ? Math.max(0.2, Math.min(1, prefs.orbOpacity)) : 1,
      };

      const onPointerDown = (event) => {
        if (event.button !== 0) return;
        dragRef.current = { startX: event.clientX, startY: event.clientY, origX: pos.x, origY: pos.y, moved: false };
        event.currentTarget.setPointerCapture(event.pointerId);
        setDragging(true);
        event.preventDefault();
      };
      const onPointerMove = (event) => {
        const drag = dragRef.current;
        if (drag === null) return;
        const dx = event.clientX - drag.startX;
        const dy = event.clientY - drag.startY;
        if (!drag.moved && Math.abs(dx) + Math.abs(dy) <= 4) return;
        drag.moved = true;
        setPos(orbClamp({ x: drag.origX + dx, y: drag.origY + dy }, size));
      };
      const onPointerUp = () => {
        const drag = dragRef.current;
        dragRef.current = null;
        setDragging(false);
        if (drag === null) return;
        if (!drag.moved) {
          setOpen(!open);
          return;
        }
        setPos((current) => {
          const snapped = {
            x: current.x + size / 2 < window.innerWidth / 2 ? 8 : Math.max(8, window.innerWidth - size - 8),
            y: current.y,
          };
          orbSavePosition(snapped);
          return snapped;
        });
      };
      const onKeyDown = (event) => {
        const step = event.shiftKey ? 1 : 8;
        let next = null;
        if (event.key === 'ArrowLeft') next = { x: pos.x - step, y: pos.y };
        else if (event.key === 'ArrowRight') next = { x: pos.x + step, y: pos.y };
        else if (event.key === 'ArrowUp') next = { x: pos.x, y: pos.y - step };
        else if (event.key === 'ArrowDown') next = { x: pos.x, y: pos.y + step };
        else if (event.key === 'Home') next = orbHomePosition(size);
        else return;
        event.preventDefault();
        const clamped = orbClamp(next, size);
        setPos(clamped);
        orbSavePosition(clamped);
      };

      let panelStyle = null;
      if (open) {
        const anchorRight = pos.x + size / 2 > window.innerWidth / 2;
        const top = Math.min(pos.y, Math.max(16, window.innerHeight - 380));
        panelStyle = anchorRight
          ? { top, right: Math.max(8, window.innerWidth - pos.x + 10) }
          : { top, left: pos.x + size + 10 };
      }
      return h(
        'div',
        { className: 'mq-orb-layer' },
        h(Style, null),
        h(
          'button',
          {
            ref: triggerRef,
            type: 'button',
            className: 'mq-orb-ball',
            style: orbStyle,
            'data-dragging': dragging ? 'true' : 'false',
            'aria-expanded': open,
            'aria-haspopup': 'dialog',
            'aria-label': 'Magpie ' + t('title') + ' · ' + tightestText(worst),
            title: surfaceTooltipLines(state.data).join('\n'),
            onPointerDown,
            onPointerMove,
            onPointerUp,
            onKeyDown,
            onClick: (event) => {
              if (event.detail === 0) setOpen(!open); // keyboard Enter/Space only; pointer handled above
            },
          },
          orbText,
        ),
        open
          ? h(
              SurfacePopover,
              { className: 'mq-orb-panel', style: panelStyle, anchorRef: triggerRef, onClose: close },
              h(SurfaceOverview, { state, period, setPeriod, load, prefs }),
            )
          : null,
      );
    }

    /* ------------------------------------------------------------------ styles */

    const CSS_SURFACES = `
.mq-dock-wrap { position: relative; display: inline-flex; }
.mq-dock-chip { display: inline-flex; align-items: center; gap: 6px; border: 1px solid var(--dsw-alias-border-l2, #d8dee4); background: var(--dsw-alias-bg-layer-1, #fff); color: var(--dsw-alias-label-secondary, #57606a); font: inherit; font-size: 12px; padding: 3px 10px; border-radius: 999px; cursor: pointer; font-variant-numeric: tabular-nums; }
.mq-dock-chip:hover { background: var(--dsw-alias-interactive-bg-hover, #f6f8fa); }
.mq-dock-chip:focus-visible, .mq-orb-ball:focus-visible { outline: 2px solid var(--dsw-alias-brand-primary, #1f6feb); outline-offset: 2px; }
.mq-dock-dot { width: 7px; height: 7px; border-radius: 50%; flex: 0 0 auto; }
.mq-dock-tip { position: fixed; z-index: 1001; pointer-events: none; max-width: 300px; padding: 7px 10px; background: var(--dsw-alias-bg-layer-2, #f2f3f5); border: 1px solid var(--dsw-alias-border-l2, #d8dee4); border-radius: var(--dsw-radius-md, 8px); box-shadow: var(--dsw-elevation-soft, 0 1px 4px rgba(0,0,0,.12)); color: var(--dsw-alias-label-secondary, #57606a); font-size: 12px; line-height: 1.5; white-space: pre-line; }
.mq-dock-tip[hidden] { display: none; }
.mq-dock-tip-more { color: var(--dsw-alias-label-caption, #8b949e); }
.mq-dock-panel, .mq-orb-panel { position: fixed; z-index: 1000; display: flex; flex-direction: column; background: var(--dsw-alias-bg-layer-1, #fff); border: 1px solid var(--dsw-alias-border-l2, #d8dee4); border-radius: var(--dsw-radius-lg, 12px); box-shadow: var(--dsw-elevation-floating, 0 8px 24px rgba(0,0,0,.16)); animation: mq-fade .12s ease; }
.mq-dock-panel { width: min(720px, calc(100vw - 32px)); max-height: min(560px, calc(100vh - 120px)); }
.mq-panel-body { flex: 1 1 auto; min-height: 0; overflow: auto; overscroll-behavior: contain; padding: 0 16px 14px; }
.mq-panel-grip { color: var(--dsw-alias-label-caption, #8b949e); letter-spacing: -1px; font-size: 12px; }
.mq-panel-head { flex: 0 0 auto; justify-content: flex-start; display: flex; align-items: center; gap: 8px; padding: 9px 12px 8px; border-bottom: 1px solid var(--dsw-alias-border-l2, #d8dee4); border-radius: var(--dsw-radius-lg, 12px) var(--dsw-radius-lg, 12px) 0 0; cursor: grab; touch-action: none; user-select: none; }
.mq-panel-head:focus-visible { outline: 2px solid var(--dsw-alias-brand-primary, #1f6feb); outline-offset: -2px; }
.mq-panel[data-dragging="true"], .mq-panel[data-dragging="true"] .mq-panel-head { cursor: grabbing; }
.mq-panel[data-dragging="true"] { transition: none; animation: none; user-select: none; }
.mq-panel-grip { color: var(--dsw-alias-label-caption, #8b949e); letter-spacing: 2px; font-size: 10px; }
.mq-panel-headlabel { flex: 1; color: var(--dsw-alias-label-caption, #8b949e); font-size: 12px; }
.mq-panel-reset { border: 0; background: transparent; color: var(--dsw-alias-label-secondary, #57606a); font: inherit; font-size: 13px; line-height: 1; padding: 2px 5px; cursor: pointer; border-radius: var(--dsw-radius-sm, 6px); }
.mq-panel-reset:hover { background: var(--dsw-alias-interactive-bg-hover, #f6f8fa); color: var(--dsw-alias-label-primary, #1f2328); }
.mq-panel-reset:focus-visible { outline: 2px solid var(--dsw-alias-brand-primary, #1f6feb); outline-offset: 2px; }
.mq-dock-panel:focus, .mq-orb-panel:focus { outline: none; }
.mq-orb-layer { position: fixed; inset: 0; pointer-events: none; z-index: 1000; }
.mq-orb-ball { position: fixed; left: 0; top: 0; pointer-events: auto; display: flex; align-items: center; justify-content: center; border-radius: 50%; border: 2px solid var(--dsw-alias-border-l2, #d8dee4); background: var(--dsw-alias-bg-layer-1, #fff); color: var(--dsw-alias-label-primary, #1f2328); font: inherit; font-size: 12px; font-weight: 600; font-variant-numeric: tabular-nums; cursor: grab; touch-action: none; user-select: none; box-shadow: var(--dsw-elevation-soft, 0 1px 4px rgba(0,0,0,.12)); padding: 0; }
.mq-orb-ball:active, .mq-orb-ball[data-dragging="true"] { cursor: grabbing; }
.mq-orb-panel { width: min(560px, calc(100vw - 32px)); max-height: min(70vh, 640px); z-index: 1001; }
@keyframes mq-fade { from { opacity: 0; } to { opacity: 1; } }
@media (prefers-reduced-motion: reduce) { .mq-dock-panel, .mq-orb-panel { animation: none; } }
`;

    /* Composed from the fragments that own each rule; 85 runs last. */
    const CSS = [CSS_PRIMITIVES, CSS_VIEWS, CSS_SETTINGS, CSS_SURFACES].join('\n');

    return {
      inject: ['slots', 'locale'],
      apply(ctx) {
        const locale = ctx.get('locale');
        if (locale && typeof locale.register === 'function' && typeof locale.bind === 'function') {
          const dispose = locale.register(NS, { zh, en });
          ctx.effect(() => dispose, 'magpie-usage: locale dictionaries');
          const bound = locale.bind(NS);
          if (typeof bound === 'function') t = bound;
        }

        // One settings column: placement, display items, accounts, data source, diagnostics.
        ctx.slots.inject('settings.section', () =>
          ctx.slots.register(
            {
              name: 'settings.section',
              id: 'magpie-usage',
              order: 35,
              // Never fall back to the raw locale key: the Settings nav shows this
              // string verbatim, and "nav" is unrecognisable.
              label: () => {
                const value = t('nav');
                return typeof value === 'string' && value !== '' && value !== 'nav' ? value : 'Magpie 额度';
              },
              locale: NS,
            },
            SettingsPage,
          ),
        );

        // Three interchangeable surfaces. All are registered; each renders null
        // unless settings.placement selects it, so exactly one is ever visible.
        ctx.slots.inject('conversation.composer.dock', () =>
          ctx.slots.register(
            { name: 'conversation.composer.dock', id: 'magpie-usage-dock', order: 20, locale: NS },
            DockSurface,
          ),
        );
        ctx.slots.inject('shell.overlay', () =>
          ctx.slots.register(
            { name: 'shell.overlay', id: 'magpie-usage-orb', locale: NS },
            OrbSurface,
          ),
        );
      },
    };
  },
});

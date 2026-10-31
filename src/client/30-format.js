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

    
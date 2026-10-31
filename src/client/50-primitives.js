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

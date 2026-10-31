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

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

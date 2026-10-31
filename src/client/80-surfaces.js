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

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

    
/**
 * Same-origin JSON routes served by the DSH web server.
 *
 * The browser half can never call Magpie directly (no CORS headers), so these
 * routes are the plugin's whole network surface. Each one is read-only except
 * the settings write, and every failure is returned as structured JSON rather
 * than an HTML error page.
 */
import { join } from 'node:path';
import { readFile } from 'node:fs/promises';
import { buildSnapshot, LOCAL_ICONS } from './snapshot.js';
import { readSettings, writeSettings } from './settings.js';
import { readJsonFile } from './http.js';
import { PERIODS } from './config.js';

export const ROUTE_PREFIX = '/api/magpie-usage';

/** Fallback for config.negativeTtlMs: how long a live failure suppresses retries. */
const DEFAULT_NEGATIVE_TTL_MS = 10000;

/** The single icon name a request may read, validated and typed. */
const ICON_TYPES = {
  svg: 'image/svg+xml',
  png: 'image/png',
  webp: 'image/webp',
  jpg: 'image/jpeg',
};

/**
 * Only a single filename inside the icons dir is ever readable: no separators,
 * no traversal, no dotfiles, and an allow-listed extension. Anything else —
 * and any read failure — is a 404 that reveals nothing about the filesystem.
 * @param {string|null} raw
 * @returns {{name: string, type: string}|null}
 */
function parseIconName(raw) {
  if (typeof raw !== 'string') return null;
  const name = raw.trim();
  if (name === '' || name.includes('/') || name.includes('\\') || name.includes('..') || name.startsWith('.')) {
    return null;
  }
  const dot = name.lastIndexOf('.');
  if (dot <= 0 || dot === name.length - 1) return null;
  const type = ICON_TYPES[name.slice(dot + 1).toLowerCase()];
  return type ? { name, type } : null;
}

function writeJson(res, status, payload) {
  const body = JSON.stringify(payload);
  res.setHeader('content-type', 'application/json; charset=utf-8');
  res.setHeader('cache-control', 'no-store');
  res.writeHead(status);
  res.end(body);
}

/**
 * The most recent request Magpie served, read from the tail of its usage log.
 * This is what "the plan currently in use" means: the account that answered the
 * last call, not the account with the least quota left.
 * @param {string} file
 * @returns {Promise<object|null>}
 */
async function readLastRequest(file) {
  try {
    const { open, stat } = await import('node:fs/promises');
    const info = await stat(file);
    const chunk = Math.min(info.size, 64 * 1024);
    if (chunk <= 0) return null;
    const handle = await open(file, 'r');
    try {
      const buffer = Buffer.alloc(chunk);
      await handle.read(buffer, 0, chunk, info.size - chunk);
      const lines = buffer.toString('utf8').split('\n');
      for (let i = lines.length - 1; i >= 0; i -= 1) {
        const line = lines[i].trim();
        if (line === '') continue;
        try {
          const record = JSON.parse(line);
          if (record !== null && typeof record === 'object' && typeof record.provider === 'string') return record;
        } catch {
          // A tail read starts mid-record: skip until a line parses.
        }
      }
    } finally {
      await handle.close();
    }
  } catch {
    return null;
  }
  return null;
}

async function readBody(req) {
  const chunks = [];
  let size = 0;
  for await (const chunk of req) {
    size += chunk.length;
    if (size > 64 * 1024) throw new Error('body too large');
    chunks.push(chunk);
  }
  const text = Buffer.concat(chunks).toString('utf8');
  return text === '' ? null : JSON.parse(text);
}

function periodOf(url, fallback) {
  const value = url.searchParams.get('period');
  return PERIODS.includes(value) ? value : fallback;
}

/**
 * @param {object} deps
 * @param {object} deps.config
 * @param {(path: string) => Promise<any>} deps.fetchJson
 */
export function createRoutes({ config, fetchJson }) {
  /** @type {{key: string, at: number, body: object}|null} */
  let cache = null;
  /** Full quotas/history body, cached for 60s so N accounts cost one upstream read. */
  let historyCache = null;

  /**
   * Full quotas/history body, cached for 60s so N accounts cost one upstream
   * read; shared by the /history route and the snapshot's pace fit.
   * @returns {Promise<object>}
   */
  async function getHistory() {
    if (historyCache === null || Date.now() - historyCache.at > 60000) {
      historyCache = { at: Date.now(), body: await fetchJson('/v1/magpie/quotas/history') };
    }
    return historyCache.body;
  }
  /** Last built snapshot body — served while the negative window is open. */
  let lastBody = null;
  /** Most recent live failure; a retry inside the window would just fail again. */
  let negative = null;

  async function collect(period, force) {
    const key = period;
    const now = Date.now();
    if (!force && cache !== null && cache.key === key && now - cache.at < config.cacheTtlMs) {
      return { ...cache.body, cached: true };
    }

    const settings = await readSettings(config);
    const cacheOnly = settings.source === 'cache';
    const negativeTtlMs =
      Number.isFinite(config.negativeTtlMs) && config.negativeTtlMs > 0
        ? config.negativeTtlMs
        : DEFAULT_NEGATIVE_TTL_MS;
    const recentFailure =
      !force && !cacheOnly && negative !== null && now - negative.at < negativeTtlMs;
    // Negative cache: live failed moments ago, so it will fail again — serve
    // the last document instead of hammering a dead gateway on every pull.
    // `force` (POST /refresh) always means "try again now".
    if (!force && recentFailure && lastBody !== null) {
      return { ...lastBody, cached: true };
    }

    const errors = { live: null, cache: null, usage: null, cards: null, history: null };
    let live = null;
    let usage = null;
    let cards = null;
    let history = null;
    if (cacheOnly) {
      errors.live = '设置 source=cache：按偏好仅读本地缓存，未请求实时接口';
      errors.usage = errors.live;
    } else if (recentFailure) {
      errors.live = negative.error;
    } else {
      try {
        live = await fetchJson('/v1/magpie/quotas');
        negative = null;
      } catch (error) {
        errors.live = error instanceof Error ? error.message : String(error);
        negative = { at: now, error: errors.live };
      }
      try {
        usage = await fetchJson('/v1/magpie/usage?period=' + encodeURIComponent(period));
      } catch (error) {
        errors.usage = error instanceof Error ? error.message : String(error);
      }
      // Cards carry the per-account icon that /quotas omits. Cosmetic: a miss
      // costs the icons, never the panel.
      try {
        cards = await fetchJson('/v1/magpie/quotas/cards');
      } catch (error) {
        errors.cards = error instanceof Error ? error.message : String(error);
      }
      // History feeds the per-window pace fit; shares the /history route's 60s
      // cache so the panel pays one upstream read for both.
      try {
        history = await getHistory();
      } catch (error) {
        errors.history = error instanceof Error ? error.message : String(error);
      }
    }
    const cachedFile = await readJsonFile(join(config.configDir, 'quotas.json'));
    if (cachedFile === null) errors.cache = 'quotas.json 不可读';
    const creditsDaily = await readJsonFile(join(config.configDir, 'credits-daily.json'));
    const lastUsage = await readLastRequest(join(config.configDir, 'usage.jsonl'));
    const fx = await readJsonFile(config.fxFile);

    const body = buildSnapshot({
      live,
      cache: cachedFile,
      usage,
      cards,
      history,
      creditsDaily,
      lastUsage,
      fx,
      config,
      nowMs: now,
      errors,
    });
    body.period = period;
    body.cached = false;
    body.sourceMode = cacheOnly ? 'cache' : 'live';
    // A failed body must not enter the positive cache: the negative window
    // covers that interval, and once it lapses the next pull retries live.
    if (errors.live === null) cache = { key, at: now, body };
    lastBody = body;
    return body;
  }

  return {
    /** GET /api/magpie-usage/snapshot */
    async snapshot(req, res) {
      if (req.method !== 'GET') return writeJson(res, 405, { ok: false, error: 'method not allowed' });
      const url = new URL(req.url, 'http://localhost');
      const period = periodOf(url, config.period);
      const force = url.searchParams.get('force') === '1';
      try {
        writeJson(res, 200, await collect(period, force));
      } catch (error) {
        writeJson(res, 500, { ok: false, error: error instanceof Error ? error.message : String(error) });
      }
    },

    /** POST /api/magpie-usage/refresh */
    async refresh(req, res) {
      if (req.method !== 'POST') return writeJson(res, 405, { ok: false, error: 'method not allowed' });
      const url = new URL(req.url, 'http://localhost');
      try {
        writeJson(res, 200, await collect(periodOf(url, config.period), true));
      } catch (error) {
        writeJson(res, 500, { ok: false, error: error instanceof Error ? error.message : String(error) });
      }
    },

    /** GET /api/magpie-usage/history?provider=&user= */
    async history(req, res) {
      if (req.method !== 'GET') return writeJson(res, 405, { ok: false, error: 'method not allowed' });
      const url = new URL(req.url, 'http://localhost');
      const provider = url.searchParams.get('provider');
      const user = url.searchParams.get('user');
      if (provider === null || provider === '') {
        return writeJson(res, 400, { ok: false, error: 'provider is required' });
      }
      try {
        const raw = await getHistory();
        const rows = Array.isArray(raw?.data) ? raw.data : [];
        const match = rows.find(
          (row) => row?.provider === provider && (user === null || user === '' || row?.user === user),
        );
        const lines = Array.isArray(match?.lines)
          ? match.lines.map((line) => ({
              name: typeof line.name === 'string' ? line.name : '',
              points: Array.isArray(line.points)
                ? line.points
                    .filter((p) => Number.isFinite(Number(p?.left)))
                    .map((p) => ({ at: p.at ?? null, left: Number(p.left) }))
                : [],
            }))
          : [];
        writeJson(res, 200, { ok: match !== undefined, provider, user: user ?? null, lines });
      } catch (error) {
        writeJson(res, 502, { ok: false, error: error instanceof Error ? error.message : String(error) });
      }
    },

    /** GET /api/magpie-usage/icon?name= */
    async icon(req, res) {
      if (req.method !== 'GET') return writeJson(res, 405, { ok: false, error: 'method not allowed' });
      const url = new URL(req.url, 'http://localhost');
      const local = url.searchParams.get('local');
      if (local !== null) {
        if (!LOCAL_ICONS.has(local)) return writeJson(res, 404, { ok: false, error: 'icon not found' });
        try {
          const body = await readFile(join(config.assetsDir, local + '.svg'));
          res.setHeader('content-type', 'image/svg+xml');
          res.setHeader('cache-control', 'max-age=86400');
          res.writeHead(200);
          res.end(body);
        } catch {
          writeJson(res, 404, { ok: false, error: 'icon not found' });
        }
        return undefined;
      }
      const icon = parseIconName(url.searchParams.get('name'));
      if (icon === null) return writeJson(res, 404, { ok: false, error: 'icon not found' });
      try {
        const body = await readFile(join(config.iconsDir, icon.name));
        res.setHeader('content-type', icon.type);
        res.setHeader('cache-control', 'max-age=86400');
        res.writeHead(200);
        res.end(body);
      } catch {
        // Missing file, unreadable dir, a directory in place of a file —
        // every failure is the same anonymous 404.
        writeJson(res, 404, { ok: false, error: 'icon not found' });
      }
    },

    /** GET/POST /api/magpie-usage/settings */
    async settings(req, res) {
      if (req.method === 'GET') {
        return writeJson(res, 200, { ok: true, settings: await readSettings(config), file: config.settingsFile });
      }
      if (req.method !== 'POST') return writeJson(res, 405, { ok: false, error: 'method not allowed' });
      try {
        const patch = await readBody(req);
        const settings = await writeSettings(config, patch);
        writeJson(res, 200, { ok: true, settings, file: config.settingsFile });
      } catch (error) {
        writeJson(res, 400, { ok: false, error: error instanceof Error ? error.message : String(error) });
      }
    },
  };
}

/** The exact routes this plugin owns, for registration and for tests. */
export const ROUTES = [
  { kind: 'exact', path: ROUTE_PREFIX + '/snapshot', handler: 'snapshot' },
  { kind: 'exact', path: ROUTE_PREFIX + '/refresh', handler: 'refresh' },
  { kind: 'exact', path: ROUTE_PREFIX + '/history', handler: 'history' },
  { kind: 'exact', path: ROUTE_PREFIX + '/icon', handler: 'icon' },
  { kind: 'exact', path: ROUTE_PREFIX + '/settings', handler: 'settings' },
];

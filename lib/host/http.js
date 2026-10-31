/**
 * One JSON fetcher for the loopback Magpie gateway.
 *
 * Magpie sends no CORS headers, so the browser cannot call it directly; the
 * host half fetches here and the client reads a same-origin route instead.
 * Requests are loopback-only by construction (baseUrl defaults to 127.0.0.1)
 * and redirects are rejected so a configured host cannot bounce out.
 */

/**
 * @param {object} config - resolved config (see config.js).
 * @returns {(path: string) => Promise<any>}
 */
export function createFetcher(config) {
  return async function fetchJson(path) {
    const url = config.baseUrl + path;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), config.timeoutMs);
    try {
      const res = await fetch(url, {
        method: 'GET',
        headers: { accept: 'application/json' },
        signal: controller.signal,
        redirect: 'error',
      });
      const text = await res.text();
      if (!res.ok) throw new Error('HTTP ' + res.status + ': ' + text.slice(0, 200));
      return JSON.parse(text);
    } catch (error) {
      if (error && error.name === 'AbortError') throw new Error('timeout after ' + config.timeoutMs + 'ms');
      throw error;
    } finally {
      clearTimeout(timer);
    }
  };
}

/**
 * Read one JSON file, returning null when it is absent or unparsable.
 * Used for the cached Magpie files, which are best-effort fallbacks.
 * @param {string} file
 * @returns {Promise<any|null>}
 */
export async function readJsonFile(file) {
  try {
    const { readFile } = await import('node:fs/promises');
    const text = await readFile(file, 'utf8');
    return JSON.parse(text);
  } catch {
    return null;
  }
}

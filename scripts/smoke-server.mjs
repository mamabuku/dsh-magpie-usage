/**
 * Standalone smoke harness: mounts the plugin's four routes on a throwaway
 * http server so the real HTTP path can be exercised without installing into
 * a DSH profile. Read-only; binds 127.0.0.1 only.
 *
 *   node scripts/smoke-server.mjs [port]
 */
import http from 'node:http';
import { resolveConfig } from '../lib/host/config.js';
import { createFetcher } from '../lib/host/http.js';
import { createRoutes, ROUTES } from '../lib/host/routes.js';

const port = Number(process.argv[2] ?? 38217);
const config = resolveConfig({});
const routes = createRoutes({ config, fetchJson: createFetcher(config) });

const table = new Map(
  ROUTES.map((route) => [route.path, routes[route.handler]]),
);

const server = http.createServer((req, res) => {
  const { pathname } = new URL(req.url, 'http://127.0.0.1');
  const handler = table.get(pathname);
  if (handler === undefined) {
    res.writeHead(404, { 'content-type': 'application/json' });
    res.end(JSON.stringify({ ok: false, error: 'not found' }));
    return;
  }
  Promise.resolve(handler(req, res)).catch((error) => {
    res.writeHead(500, { 'content-type': 'application/json' });
    res.end(JSON.stringify({ ok: false, error: String(error) }));
  });
});

server.listen(port, '127.0.0.1', () => {
  console.log('magpie-usage smoke listening on http://127.0.0.1:' + port + ' → ' + config.baseUrl);
});

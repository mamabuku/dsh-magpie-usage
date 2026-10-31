/**
 * dsh-magpie-usage — host half.
 *
 * Owns the only network surface of the plugin: four same-origin JSON routes
 * that read the loopback Magpie gateway and hand the panel a normalized
 * snapshot. It writes nothing to Magpie, holds no credentials, and reaches no
 * host other than the configured loopback base URL.
 */
import { resolveConfig } from './lib/host/config.js';
import { createFetcher } from './lib/host/http.js';
import { createRoutes, ROUTES } from './lib/host/routes.js';

export const name = 'dsh-magpie-usage';

/** `webServer` is the route seat; nothing else is required to serve reads. */
export const inject = ['webServer'];

/**
 * @param {import('@deepseek-ai/cordis').Context} ctx
 * @param {object} [config] - the row config from cordis.patch.yml.
 */
export function apply(ctx, config) {
  const resolved = resolveConfig(config);
  const routes = createRoutes({ config: resolved, fetchJson: createFetcher(resolved) });

  for (const route of ROUTES) {
    const handler = routes[route.handler];
    ctx.effect(
      () => ctx.webServer.register({ kind: route.kind, path: route.path, handler }),
      'dsh-magpie-usage: route ' + route.path,
    );
  }

  ctx.logger?.info?.(
    '[dsh-magpie-usage] routes registered against ' + resolved.baseUrl + ' (' + ROUTES.length + ')',
  );
}

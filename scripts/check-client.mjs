/**
 * Validate the client fragments WITHOUT writing client.js — safe to run while
 * another process owns the build.
 *
 *   node scripts/check-client.mjs
 *
 * Concatenates src/client/*.js into a temp file, syntax-checks it, then loads
 * it in a stubbed module-loader environment and asserts the slot registration.
 */
import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';
import vm from 'node:vm';
import { createRequire } from 'node:module';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const SRC = join(ROOT, 'src', 'client');
const TMP = '/tmp/mq-client-check.cjs';

const files = readdirSync(SRC).filter((n) => n.endsWith('.js')).sort();
const body = files.map((n) => readFileSync(join(SRC, n), 'utf8').replace(/\s+$/, '')).join('\n\n');
writeFileSync(TMP, body);

execFileSync(process.execPath, ['--check', TMP], { stdio: 'inherit' });

const req = createRequire(join(process.env.HOME, '.dsh/profiles/desktop/node_modules/'));
const React = req('react');
const sandbox = {
  window: { __ModuleLoader__: { load(opts) { sandbox.__mod = opts; } } },
  document: { baseURI: 'http://127.0.0.1:60012/', visibilityState: 'visible' },
  fetch: () => Promise.resolve({ json: () => Promise.resolve({ ok: true }) }),
  console,
  setTimeout,
  clearTimeout,
  setInterval,
  clearInterval,
};
sandbox.globalThis = sandbox;
vm.createContext(sandbox);
vm.runInContext(body, sandbox, { filename: 'client.fragments.js' });

const mod = sandbox.__mod.factory((name) => {
  if (name === 'react') return React;
  throw new Error('unexpected require ' + name);
});
if (!Array.isArray(mod.inject) || typeof mod.apply !== 'function') {
  console.error('module shape invalid');
  process.exit(1);
}

const registered = [];
const ctx = {
  get: (n) => (n === 'locale' ? { register: () => () => {}, bind: () => (k) => k } : undefined),
  effect: (fn) => {
    try { fn(); } catch {}
  },
  slots: {
    inject: (name, fn) => fn(),
    register: (def, Comp) => {
      registered.push({ slot: def.name, id: def.id, comp: typeof Comp });
      return () => {};
    },
  },
};
mod.apply(ctx);

const bad = registered.filter((r) => r.comp !== 'function');
console.log('fragments: ' + files.length);
console.log('registered: ' + JSON.stringify(registered));
if (bad.length > 0) {
  console.error('a registered component is not a function');
  process.exit(1);
}
console.log('CHECK OK');

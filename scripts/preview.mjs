/**
 * Dev-only visual harness: renders the real `client.js` (the same module the
 * page loads) against a real Magpie snapshot, so layout can be reviewed without
 * touching the running Harness.
 *
 *   PREVIEW_SLOT=settings.section PREVIEW_PLACEMENT=dock node scripts/preview.mjs 620 light
 *
 * Writes $PREVIEW_DIR (default /tmp/mq-preview) and prints the Chrome command.
 */
import { writeFileSync, mkdirSync, copyFileSync, readFileSync } from 'node:fs';
import { resolveConfig } from '../lib/host/config.js';
import { createFetcher, readJsonFile } from '../lib/host/http.js';
import { buildSnapshot } from '../lib/host/snapshot.js';
import { readSettings } from '../lib/host/settings.js';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const OUT = process.env.PREVIEW_DIR || '/tmp/mq-preview';
const width = Number(process.argv[2] ?? 620);
const theme = process.argv[3] === 'dark' ? 'dark' : 'light';
const slot = process.env.PREVIEW_SLOT || 'settings.section';
const placement = process.env.PREVIEW_PLACEMENT || 'dock';
const autoOpen = process.env.PREVIEW_OPEN === '1';
const bottomAnchor = process.env.PREVIEW_BOTTOM === '1';

const cfg = resolveConfig({});
const fetchJson = createFetcher(cfg);
const errors = {};
let live = null;
let usage = null;
let history = { data: [] };
try { live = await fetchJson('/v1/magpie/quotas'); } catch (e) { errors.live = String(e.message); }
try { usage = await fetchJson('/v1/magpie/usage?period=30d'); } catch (e) { errors.usage = String(e.message); }
try { history = await fetchJson('/v1/magpie/quotas/history'); } catch { /* sparkline stays empty */ }
let cards = null;
try { cards = await fetchJson('/v1/magpie/quotas/cards'); } catch { /* icons fall back to letters */ }
let fx = null;
try { fx = JSON.parse(await (await import('node:fs/promises')).readFile(cfg.fxFile, 'utf8')); } catch { /* amounts stay USD */ }
const cache = await readJsonFile(join(cfg.configDir, 'quotas.json'));
const creditsDaily = await readJsonFile(join(cfg.configDir, 'credits-daily.json'));
// Tail of Magpie's request log: the account that served the most recent call.
let lastUsage = null;
try {
  const { open, stat } = await import('node:fs/promises');
  const file = join(cfg.configDir, 'usage.jsonl');
  const info = await stat(file);
  const chunk = Math.min(info.size, 64 * 1024);
  const handle = await open(file, 'r');
  const buffer = Buffer.alloc(chunk);
  await handle.read(buffer, 0, chunk, info.size - chunk);
  await handle.close();
  const lines = buffer.toString('utf8').split('\n');
  for (let i = lines.length - 1; i >= 0; i -= 1) {
    const line = lines[i].trim();
    if (line === '') continue;
    try {
      const record = JSON.parse(line);
      if (record && typeof record.provider === 'string') { lastUsage = record; break; }
    } catch { /* partial first line */ }
  }
} catch { /* no usage log */ }
const snapshot = buildSnapshot({ live, cache, usage, creditsDaily, lastUsage, cards, history, fx, config: cfg, nowMs: Date.now(), errors });
// Screenshots go into the README, so never render a real account identifier:
// replace every name/email with a synthetic label unless PREVIEW_MASK=0.
if (process.env.PREVIEW_MASK !== '0') {
  const seen = new Map();
  const label = (key) => {
    if (!seen.has(key)) seen.set(key, '示例账号 ' + String.fromCharCode(65 + seen.size % 26));
    return seen.get(key);
  };
  for (const account of snapshot.accounts) {
    // `name` is the provider's display name — keep it. Only the account
    // identity is personal.
    const name = label(account.key);
    account.user = name;
    account.userMasked = name;
  }
  if (snapshot.lastRequest !== null && typeof snapshot.lastRequest === 'object') {
    snapshot.lastRequest.account = null;
  }
}

snapshot.period = '30d';
const settings = { ...(await readSettings(cfg)), placement };

// The harness has no host route, so rewrite icon URLs to the real local files
// and let the browser load them straight from disk.
const ICONS_DIR = join(ROOT, 'assets', 'icons');
for (const account of snapshot.accounts) {
  if (typeof account.iconUrl !== 'string') continue;
  const local = /local=([a-z0-9-]+)$/.exec(account.iconUrl);
  const named = /name=([^&]+)$/.exec(account.iconUrl);
  if (local !== null) account.iconUrl = 'file://' + join(ICONS_DIR, local[1] + '.svg');
  else if (named !== null) account.iconUrl = 'file://' + join(cfg.configDir, 'icons', decodeURIComponent(named[1]));
}

mkdirSync(OUT, { recursive: true });
const REACT = '/Users/superblack/.dsh/backups/bridge-next-2.0.2-20261030-093303/stale-bridge-node_modules';
copyFileSync(REACT + '/react/umd/react.production.min.js', OUT + '/react.js');
copyFileSync(REACT + '/react-dom/umd/react-dom.production.min.js', OUT + '/react-dom.js');
copyFileSync(ROOT + '/client.js', OUT + '/client.js');

const html = `<!doctype html><html lang="zh" data-theme="${theme}"><head><meta charset="utf-8">
<base href="http://preview.local/">
<style>
  html,body{margin:0;padding:0;background:${theme === 'dark' ? '#1b1f24' : '#f2f3f5'};}
  #root{padding:20px;${bottomAnchor ? 'position:absolute;left:0;right:0;bottom:0;' : ''}}
  ${theme === 'dark' ? ':root{--dsw-alias-bg-layer-1:#22272e;--dsw-alias-bg-layer-2:#1b1f24;--dsw-alias-bg-layer-3:#2d333b;--dsw-alias-label-primary:#e6edf3;--dsw-alias-label-secondary:#adbac7;--dsw-alias-label-caption:#768390;--dsw-alias-label-tertiary:#768390;--dsw-alias-label-error:#f85149;--dsw-alias-border-l2:#373e47;--dsw-alias-fill-l2:#2d333b;--dsw-alias-interactive-bg-hover:#2d333b;--dsw-alias-state-error-secondary:#4a1f1f;--dsw-alias-state-warn-secondary:#4a3d1f;--dsw-alias-state-warn-label:#d29922;}' : ''}
</style></head><body><div id="root"></div>
<script>window.__ModuleLoader__={load:function(o){window.__MOD=o;}};</script>
<script src="file://${OUT}/react.js"></script><script src="file://${OUT}/react-dom.js"></script>
<script>var AUTO_OPEN=${autoOpen ? 'true' : 'false'};window.__SNAPSHOT__=${JSON.stringify(snapshot)};window.__SETTINGS__=${JSON.stringify({ ok: true, settings, file: cfg.settingsFile })};window.__HISTORY__=${JSON.stringify(history)};</script>
<script src="file://${OUT}/client.js"></script>
<script>
window.onerror=function(m,s,l,c){document.getElementById('root').textContent='PAGE-ERR '+m+' @'+l+':'+c;};
try{
  var React=window.React, ReactDOM=window.ReactDOM;
  var req=function(m){ if(m==='react') return React; throw new Error('unexpected '+m); };
  var mod=window.__MOD.factory(req);
  var captured={};
  var dicts={};
  var ctx={
    get:function(n){ return n==='locale'?{register:function(ns,d){dicts[ns]=d;return function(){}},bind:function(ns){return function(k){var d=dicts[ns]||{};var m=d.zh||d.en||{};return m[k]!=null?m[k]:k}}} : undefined; },
    effect:function(fn){ try{fn();}catch(e){} },
    slots:{ inject:function(n,fn){ return fn(); }, register:function(def,Comp){ captured[def.name]=Comp; return function(){}; } }
  };
  mod.apply(ctx);
  var SLOT=${JSON.stringify(slot)};
  var Comp=captured[SLOT];
  if(!Comp){ document.getElementById('root').textContent='no component registered for slot '+SLOT+' (have: '+Object.keys(captured).join(', ')+')'; }
  else{
    window.fetch=function(url){ var u=String(url);
      if(u.indexOf('settings')>=0) return Promise.resolve({json:function(){return Promise.resolve(window.__SETTINGS__);}});
      if(u.indexOf('history')>=0){ var m=/provider=([^&]+)/.exec(u); var prov=m?decodeURIComponent(m[1]):'';
        var rows=(window.__HISTORY__&&window.__HISTORY__.data)||[]; var hit=rows.filter(function(r){return r.provider===prov;})[0];
        return Promise.resolve({json:function(){return Promise.resolve({ok:!!hit,provider:prov,lines:(hit&&hit.lines)||[]});}});}
      return Promise.resolve({json:function(){return Promise.resolve(window.__SNAPSHOT__);}});
    };
    ReactDOM.createRoot(document.getElementById('root')).render(React.createElement(Comp));
    if (AUTO_OPEN) {
      setTimeout(function(){
        var btn=document.querySelector('#root button');
        if(btn) btn.click();
      }, 400);
    }
  }
}catch(e){document.getElementById('root').textContent='THROW '+(e&&e.stack||e);}
</script></body></html>`;
writeFileSync(OUT + '/index.html', html);
console.log('wrote ' + OUT + '/index.html  slot=' + slot + ' placement=' + placement + ' accounts=' + snapshot.accounts.length);
console.log(
  '"/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" --headless=new --disable-gpu --hide-scrollbars --allow-file-access-from-files --force-device-scale-factor=2 --window-size=' +
    width + ',1300 --virtual-time-budget=5000 --screenshot=' + OUT + '/shot.png file://' + OUT + '/index.html',
);

/**
 * Concatenate src/client/*.js into the single classic script the DSH module
 * loader expects. The runtime artifact must stay one file (no relative
 * imports), but authoring is split into fragments so several people can work
 * without touching the same file.
 *
 *   node scripts/build-client.mjs [--check]
 *
 * `--check` exits non-zero when client.js is out of date, for CI.
 */
import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const SRC = join(ROOT, 'src', 'client');
const OUT = join(ROOT, 'client.js');

const BANNER = `/* GENERATED FILE — do not edit. Source: src/client/*.js (npm run build:client). */\n`;

const files = readdirSync(SRC)
  .filter((name) => name.endsWith('.js'))
  .sort();

if (files.length === 0) {
  console.error('no fragments in src/client');
  process.exit(1);
}

const body = files.map((name) => readFileSync(join(SRC, name), 'utf8').replace(/\s+$/, '')).join('\n\n');
const output = BANNER + body + '\n';

const check = process.argv.includes('--check');
if (check) {
  const current = readFileSync(OUT, 'utf8');
  if (current !== output) {
    console.error('client.js is stale — run: node scripts/build-client.mjs');
    process.exit(1);
  }
  console.log('client.js is up to date (' + files.length + ' fragments)');
  process.exit(0);
}

writeFileSync(OUT, output);
console.log('client.js ← ' + files.length + ' fragments (' + output.split('\n').length + ' lines)');

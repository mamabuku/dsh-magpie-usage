/**
 * One-off extractor: pulls the vendored provider icons out of the local Magpie
 * app (Go + Wails embeds its web assets in the Mach-O binary) and writes them
 * under assets/icons/. Read-only against the app; writes only into this package.
 *
 *   node scripts/extract-magpie-icons.mjs
 *
 * Each SVG carries a <title> naming its provider, which is how we match — never
 * by file order, which is not stable across builds.
 */
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const BINARY = '/Applications/magpie.app/Contents/MacOS/magpie';
const OUT = join(ROOT, 'assets', 'icons');

/** provider id → the <title> Magpie gives that icon. */
const WANT = {
  codex: 'Codex',
  cline: 'Cline',
  factory: 'Factory',
  deepseek: 'DeepSeek',
  zcode: 'Z.ai',
  zhipu: 'Zhipu',
};

if (!existsSync(BINARY)) {
  console.error('Magpie binary not found at ' + BINARY);
  process.exit(1);
}

const buffer = readFileSync(BINARY);
const text = buffer.toString('latin1');
const svgs = [];
const re = /<svg[\s\S]{0,200000}?<\/svg>/g;
let match;
while ((match = re.exec(text)) !== null) svgs.push(Buffer.from(match[0], 'latin1'));

function titleOf(svg) {
  const m = /<title[^>]*>([\s\S]*?)<\/title>/.exec(svg.toString('utf8'));
  return m ? m[1].trim() : '';
}

mkdirSync(OUT, { recursive: true });
let saved = 0;
for (const [slug, title] of Object.entries(WANT)) {
  const hit = svgs.find((svg) => titleOf(svg) === title);
  if (hit === undefined) {
    console.warn('missing: ' + slug + ' (' + title + ')');
    continue;
  }
  writeFileSync(join(OUT, slug + '.svg'), hit);
  saved += 1;
}
console.log('extracted ' + saved + '/' + Object.keys(WANT).length + ' icons → ' + OUT);

#!/usr/bin/env node
/**
 * Install dsh-magpie-usage into a DSH profile:
 *
 *   node scripts/install.mjs [--profile <dir>] [--source <dir>] [--dry-run]
 *
 * Mount shape (mirrors how this repo is actually loaded):
 *   1. profile package.json gains  "dsh-magpie-usage": "link:<source>"
 *   2. profile node_modules/dsh-magpie-usage  ->  <source>   (symlink)
 *   3. profile cordis.patch.yml gains a top-level insert block
 *
 * Every step is idempotent: running twice changes nothing the second time.
 * Files are backed up (*.bak-install-<timestamp>) before the first write.
 * It never touches ~/.dsh/magpie-usage.json or the source tree.
 */
import { existsSync, lstatSync, mkdirSync, readFileSync, readlinkSync, symlinkSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { dirname, isAbsolute, join, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const PLUGIN_ID = 'dsh-magpie-usage';
const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');

function parseArgs(argv) {
  const args = { profile: join(homedir(), '.dsh', 'profiles', 'desktop'), source: REPO_ROOT, dryRun: false };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--profile') args.profile = resolve(argv[++i] ?? '');
    else if (a === '--source') args.source = resolve(argv[++i] ?? '');
    else if (a === '--dry-run') args.dryRun = true;
    else {
      console.error(`错误：无法识别的参数 ${a}（支持 --profile <dir> --source <dir> --dry-run）`);
      process.exit(1);
    }
  }
  return args;
}

function stamp() {
  const d = new Date();
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}-${p(d.getHours())}${p(d.getMinutes())}${p(d.getSeconds())}`;
}

/** Resolved absolute target of a symlink (relative links resolved against its dir). */
function linkTarget(linkPath) {
  const raw = readlinkSync(linkPath);
  return isAbsolute(raw) ? raw : resolve(dirname(linkPath), raw);
}

function fail(message) {
  console.error(`错误：${message}`);
  process.exit(1);
}

const args = parseArgs(process.argv.slice(2));
const pkgPath = join(args.profile, 'package.json');
const patchPath = join(args.profile, 'cordis.patch.yml');
const linkPath = join(args.profile, 'node_modules', PLUGIN_ID);
const tag = `bak-install-${stamp()}`;
const plan = { backup: [], pkg: null, link: null, patch: null };

/* ---- step 1: validate ---------------------------------------------------- */

if (!existsSync(args.source) || !existsSync(join(args.source, 'package.json'))) {
  fail(`source 目录无效：${args.source}（缺少 package.json）`);
}
if (!existsSync(args.profile) || !lstatSync(args.profile).isDirectory()) {
  fail(`profile 目录不存在：${args.profile}（用 --profile <dir> 指定）`);
}
for (const [label, path] of [['package.json', pkgPath], ['cordis.patch.yml', patchPath]]) {
  if (!existsSync(path)) fail(`profile 里读不到 ${label}：${path}`);
  try {
    readFileSync(path, 'utf8');
  } catch (e) {
    fail(`profile 里的 ${label} 不可读：${path}（${e.message}）`);
  }
}

/* ---- compute the changes (no writes yet) --------------------------------- */

const pkgDoc = JSON.parse(readFileSync(pkgPath, 'utf8'));
const deps = pkgDoc.dependencies ?? {};
const wantValue = `link:${args.source}`;
const pkgNeedsChange = deps[PLUGIN_ID] !== wantValue;
const depAction =
  !(PLUGIN_ID in deps) ? '新增依赖' : deps[PLUGIN_ID] === wantValue ? null : `把 ${deps[PLUGIN_ID]} 改为 ${wantValue}`;

let linkAction = null;
if (existsSync(linkPath)) {
  if (!lstatSync(linkPath).isSymbolicLink()) {
    fail(`${linkPath} 已存在且不是软链，不肯覆盖，请人工处理后重试`);
  }
  const current = linkTarget(linkPath);
  if (current !== args.source) {
    fail(`${linkPath} 软链当前指向 ${current}，不是 ${args.source}，请人工处理（rm 后重跑或改用 --source）`);
  }
} else {
  linkAction = '创建软链';
}

const patchText = readFileSync(patchPath, 'utf8');
const patchHasBlock = /^\s*-\s+id:\s*dsh-magpie-usage\s*(?:$|#)/m.test(patchText);
const patchNeedsChange = !patchHasBlock;
const blockText = `\n- insert:\n    - id: ${PLUGIN_ID}\n      name: '${PLUGIN_ID}'\n`;

if (pkgNeedsChange) plan.backup.push(pkgPath);
if (patchNeedsChange) plan.backup.push(patchPath);
plan.pkg = pkgNeedsChange ? (depAction ?? '新增依赖') : null;
plan.link = linkAction;
plan.patch = patchNeedsChange ? '在文件末尾追加 insert 块' : null;

/* ---- report -------------------------------------------------------------- */

const DRY = args.dryRun;
console.log(`→ profile: ${args.profile}`);
console.log(`→ source : ${args.source}`);
if (DRY) console.log('（--dry-run 预演模式，不会写入任何文件）');

if (!pkgNeedsChange && linkAction === null && !patchNeedsChange) {
  console.log('→ 全部就绪：依赖、软链、patch 块都已存在，无需改动。');
} else {
  if (plan.backup.length > 0) {
    for (const path of plan.backup) {
      const bak = `${path}.${tag}`;
      console.log(`→ 备份 ${path} → ${bak}`);
      if (!DRY) writeFileSync(bak, readFileSync(path));
    }
  }
  if (pkgNeedsChange) {
    console.log(`→ package.json：${plan.pkg}`);
    if (!DRY) {
      pkgDoc.dependencies = { ...deps, [PLUGIN_ID]: wantValue };
      writeFileSync(pkgPath, JSON.stringify(pkgDoc, null, 2) + '\n');
    }
  }
  if (linkAction !== null) {
    console.log(`→ ${linkPath} → ${args.source}`);
    if (!DRY) {
      mkdirSync(dirname(linkPath), { recursive: true });
      symlinkSync(args.source, linkPath);
    }
  }
  if (patchNeedsChange) {
    console.log(`→ cordis.patch.yml：${plan.patch}`);
    if (!DRY) {
      const separator = patchText.endsWith('\n') ? '' : '\n';
      writeFileSync(patchPath, patchText + separator + blockText);
    }
  }
}

/* ---- next steps ----------------------------------------------------------- */

const backups = plan.backup.map((path) => `${path}.${tag}`);
if (DRY) {
  console.log('→ 预演结束。去掉 --dry-run 正式执行。');
} else {
  console.log('→ 完成。**重启 DSH 才会生效**。');
  if (backups.length > 0) {
    console.log('→ 本次备份：');
    for (const bak of backups) console.log(`    ${bak}`);
    console.log('→ 回滚（二选一）：');
    console.log(`    node ${join(REPO_ROOT, 'scripts', 'uninstall.mjs')} --profile ${args.profile}`);
    for (const bak of backups) {
      const [target] = bak.split(`.${tag}`);
      console.log(`    cp ${JSON.stringify(bak)} ${JSON.stringify(target)}`);
    }
  }
}

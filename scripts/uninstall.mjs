#!/usr/bin/env node
/**
 * Uninstall dsh-magpie-usage from a DSH profile (reverse of install.mjs):
 *
 *   node scripts/uninstall.mjs [--profile <dir>] [--dry-run]
 *
 * Removes: the link dependency in package.json, the node_modules symlink, and
 * the insert block in cordis.patch.yml (plus its adjacent comment lines).
 * Keeps: ~/.dsh/magpie-usage.json (preferences), the source tree and its
 * assets. Every step is idempotent; files are backed up
 * (*.bak-uninstall-<timestamp>) before the first write.
 */
import { existsSync, lstatSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const PLUGIN_ID = 'dsh-magpie-usage';
const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');

function parseArgs(argv) {
  const args = { profile: join(homedir(), '.dsh', 'profiles', 'desktop'), dryRun: false };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--profile') args.profile = resolve(argv[++i] ?? '');
    else if (a === '--dry-run') args.dryRun = true;
    else {
      console.error(`错误：无法识别的参数 ${a}（支持 --profile <dir> --dry-run）`);
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

function fail(message) {
  console.error(`错误：${message}`);
  process.exit(1);
}

const args = parseArgs(process.argv.slice(2));
const pkgPath = join(args.profile, 'package.json');
const patchPath = join(args.profile, 'cordis.patch.yml');
const linkPath = join(args.profile, 'node_modules', PLUGIN_ID);
const tag = `bak-uninstall-${stamp()}`;

/* ---- validate -------------------------------------------------------------- */

if (!existsSync(args.profile) || !lstatSync(args.profile).isDirectory()) {
  fail(`profile 目录不存在：${args.profile}（用 --profile <dir> 指定）`);
}
const patchText = existsSync(patchPath) ? readFileSync(patchPath, 'utf8') : null;
if (patchText === null) fail(`profile 里读不到 cordis.patch.yml：${patchPath}`);
const pkgText = existsSync(pkgPath) ? readFileSync(pkgPath, 'utf8') : null;
if (pkgText === null) fail(`profile 里读不到 package.json：${pkgPath}`);

/* ---- compute the changes ---------------------------------------------------- */

let pkgDoc = null;
try {
  pkgDoc = JSON.parse(pkgText);
} catch (e) {
  fail(`package.json 不是合法 JSON：${pkgPath}（${e.message}）`);
}
const pkgNeedsChange = pkgDoc?.dependencies ? PLUGIN_ID in pkgDoc.dependencies : false;

let linkState = 'absent';
if (existsSync(linkPath)) {
  if (!lstatSync(linkPath).isSymbolicLink()) {
    fail(`${linkPath} 不是软链（可能是普通目录），不肯删除，请人工确认`);
  }
  linkState = 'present';
}

/**
 * Drop the top-level `- insert:` block that contains `- id: dsh-magpie-usage`,
 * together with contiguous comment lines directly above it that mention the
 * plugin. Returns null when no such block exists.
 */
function removeInsertBlock(text) {
  const lines = text.split('\n');
  const idRe = /^\s*-\s+id:\s*dsh-magpie-usage\s*(?:$|#)/;
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].trim() !== '- insert:') continue;
    let end = i + 1;
    while (end < lines.length && !/^- /.test(lines[end])) end++;
    if (!lines.slice(i, end).some((l) => idRe.test(l))) continue;
    let start = i;
    while (start > 0 && /^#/.test(lines[start - 1]) && /magpie-usage/i.test(lines[start - 1])) start--;
    const removed = lines.splice(start, end - start);
    return { text: lines.join('\n').replace(/\n{3,}$/, '\n\n').replace(/\n+$/, '\n'), removed };
  }
  return null;
}

const patchResult = patchText !== null ? removeInsertBlock(patchText) : null;
const patchNeedsChange = patchResult !== null;

/* ---- report + write ---------------------------------------------------------- */

const DRY = args.dryRun;
console.log(`→ profile: ${args.profile}`);
if (DRY) console.log('（--dry-run 预演模式，不会写入任何文件）');

const touched = [];
if (pkgNeedsChange) touched.push(pkgPath);
if (linkState === 'present') touched.push(linkPath);
if (patchNeedsChange) touched.push(patchPath);

if (touched.length === 0) {
  console.log('→ 全部干净：依赖、软链、patch 块都不存在，无需改动。');
} else {
  for (const path of [pkgPath, patchPath]) {
    if (touched.includes(path)) {
      const bak = `${path}.${tag}`;
      console.log(`→ 备份 ${path} → ${bak}`);
      if (!DRY) writeFileSync(bak, readFileSync(path));
    }
  }
  if (pkgNeedsChange) {
    console.log(`→ package.json：移除依赖 ${PLUGIN_ID}`);
    if (!DRY) {
      delete pkgDoc.dependencies[PLUGIN_ID];
      writeFileSync(pkgPath, JSON.stringify(pkgDoc, null, 2) + '\n');
    }
  }
  if (linkState === 'present') {
    console.log(`→ ${linkPath}：删除软链`);
    if (!DRY) rmSync(linkPath);
  }
  if (patchNeedsChange) {
    console.log(`→ cordis.patch.yml：移除 insert 块（${patchResult.removed.length} 行）`);
    if (!DRY) writeFileSync(patchPath, patchResult.text);
  }
  console.log('→ 保留：~/.dsh/magpie-usage.json（偏好）与源码树/图标资产不动。');
}

const backups = [pkgPath, patchPath]
  .filter((p) => touched.includes(p))
  .map((p) => `${p}.${tag}`);
if (DRY) {
  console.log('→ 预演结束。去掉 --dry-run 正式执行。');
} else {
  console.log('→ 完成。**重启 DSH 才会卸载生效**。');
  if (backups.length > 0) {
    console.log('→ 本次备份（可整体回滚重装：node ' + join(REPO_ROOT, 'scripts', 'install.mjs') + ` --profile ${args.profile}）：`);
    for (const bak of backups) {
      const [target] = bak.split(`.${tag}`);
      console.log(`    ${bak}   （恢复：cp ${JSON.stringify(bak)} ${JSON.stringify(target)}）`);
    }
  }
}

# 发布清单（dsh-magpie-usage）

从 v1.0.0 起的每次发布都按本清单走一遍。语义化版本：破坏性改动升 major（如 2.0.0，同步确认 DSH 兼容门与 `cordis.patch.yml` 注入点仍成立）、新功能升 minor、修复升 patch。

## 1. 发布前检查

- [ ] `npm run build:client -- --check`：构建产物与 `client.js` 完全一致（有 diff 说明改了 src 忘了重建，先 `npm run build:client` 提交再继续）。
- [ ] `npm test`：全绿。
- [ ] `npm run audit` 在**你本机 Magpie 正在跑**时全绿——它连 `127.0.0.1:3425` 的本机网关，CI 与无 Magpie 的机器上必失败，所以 CI（`.github/workflows/ci.yml`）刻意不跑这一步。
- [ ] CI 全绿（push 到 main 或开 PR 自动触发：install → build:client → check:client → test）。

## 2. 仓库元信息（首次发布必改）

`package.json` 里这三处现在是 `mamabuku`，发布前必须替换成真实 GitHub 地址，否则 npm 页面指向无效仓库：

- `repository.url` → `https://github.com/<org>/<dsh-magpie-usage>.git`
- `homepage` → `https://github.com/<org>/dsh-magpie-usage#readme`
- `bugs.url` → `https://github.com/<org>/dsh-magpie-usage/issues`

## 3. 包内容检查

```bash
npm pack --dry-run
```

应当包含（与 `package.json` 的 `files` 一致）：`index.js`、`client.js`、`lib/`、`assets/`、`cordis.patch.yml`、`locale/*.json`、`icon.svg`、`docs/*.md`、`README.md`、`LICENSE`、`NOTICE`。`npm publish` 还会自动跑 `prepublishOnly`（build:client + check:client）兜底。

**注意**：`docs/*.md` 这个 glob 只匹配 docs 顶层 md；`docs/reference/` 与 `docs/preview-*.png` 按设计不进包（参考素材不上 npm）。若未来想让某些素材进包，改 `files` 数组，不要改目录结构。

## 4. 当前包内容（实测：2026-10-31，v1.0.0，`npm pack --dry-run --json`）

共 31 个文件，unpacked 234.0 kB，pack 后 78.7 kB：

```
LICENSE  NOTICE  README.md  package.json
index.js  client.js  icon.svg  cordis.patch.yml
assets/icons/{README.md,index.json,cline,codex,deepseek,factory,workbuddy,zcode,zhipu}.svg(+json)
docs/{ARCHITECTURE,CONVENTIONS,DESIGN,INSTALL,MAGPIE-SPEC,PLAN,SPEC}.md
lib/host/{config,http,routes,settings,snapshot}.js
locale/{en,zh}.json
```

核对结论：**无缺失、无多余**。`LICENSE`/`NOTICE` 在磁盘与包里都有；`docs/reference/`、预览 png、`src/`、`scripts/`、`tests/` 均按设计排除。

## 5. 发布

```bash
npm publish --dry-run   # 最后确认包名/版本/内容
npm publish --access public
```

## 6. 打 tag

```bash
git tag v1.0.0 && git push --tags
```

tag 名与 `package.json` 的 `version` 严格一致（`v` + 版本号）。发完在 GitHub Release 里贴 CHANGELOG 摘要。

# Magpie 额度 · 工程规范 (CONVENTIONS)

## 语言与风格
- 纯 JavaScript (ESM)，不引入 TypeScript；公开函数写 JSDoc 类型注解。
- 两个空格缩进；单引号；行宽 ≤ 110。
- 不用 `any` 式裸 `catch` 吞错：捕获后必须转成结构化 `{ ok:false, error }` 或重新抛出。
- 视图侧不得 `require('@deepseek-ai/*')`，只用 `react` + 平台注入的 `ctx`。

## 命名
- 包名 `dsh-magpie-usage`；插件 id `dsh-magpie-usage`；设置页 locale 命名空间 `magpie-usage`。
- 文件：`lib/host/*.js` 小写连字符；组件用 `PascalCase` 导出函数。
- CSS 类前缀 `mq-`，避免与宿主冲突。

## 契约纪律
- `lib/host/normalize.js` 的 Snapshot 是**冻结契约**。改字段 = 升 `stateVersion` + 同时改客户端 + 补测试，三件齐全才算改完。
- 新增数据源必须落在 `sources` 里并在 `sources[].status` 暴露状态，禁止悄悄拼接。

## 提交与版本
- 语义化版本；`CHANGELOG.md` 每条写「改了什么 + 为什么」。
- 提交信息：`<area>: <动词> <对象>`，如 `host: 增加 quotas/history 取数`、`client: 面板支持两栏`.
- 一次提交只做一件事；数据层与视图层分开提交。

## 改动流程（强制）
1. 改前 `git commit`（干净基线）+ 备份 `cordis.patch.yml` / profile `package.json`（带时间戳）。
2. 写/改失败测试 → 最小实现 → 跑全绿。
3. `node --check` 所有 js；`node --test tests/*.test.mjs` 全绿。
4. 主控亲自读 diff（不只信摘要），关键路径本地探测。
5. 涉及 profile 改动（安装/切换）单独一步，先说明再动。

## 多代理文件所有权
- 同一文件**只允许一个**写入者；并行时按目录切分：
  - A：`lib/host/**` + `tests/{normalize,merge,routes,settings}`
  - B：`client.js` + `tests/client-render`
  - 主控：`package.json` / `cordis.patch.yml` / `docs/**` / 安装切换
- 交接前确认上一个写入者已停（连续采样 mtime），不并行覆盖同一文件。

## 回滚
- 安装前写 `scripts/rollback.sh`：移除 patch 行、删软链、还原 profile `package.json`、`pnpm install`。
- 卸载清单：bundle 行 → `node_modules/dsh-magpie-usage` 软链 → `pnpm-lock` → `~/.dsh/magpie-usage.json`（偏好，可选保留）。
- 归档不删除：旧源码移 `90_归档/`，带 README 说明捞回方式。

## 安全
- 不读 `.env` / 凭据文件；不打印 key；日志脱敏。
- 只连 `127.0.0.1:3425`（可配），拒绝重定向与外部 host。

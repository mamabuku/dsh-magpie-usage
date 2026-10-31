# Magpie 额度 · 架构 (ARCHITECTURE)

## 目录结构

```
dsh-magpie-usage/
  package.json              # name: dsh-magpie-usage, dsh.bundle.patch
  cordis.patch.yml          # insert: [{ id: dsh-magpie-usage, name: 'dsh-magpie-usage' }]
  icon.svg
  index.js                  # 宿主入口：export function apply(ctx, config)
  lib/host/
    config.js               # 端口/超时/缓存/周期/路径，env 可覆盖
    http.js                 # fetchJson（8s 超时、拒重定向）+ readJsonFile
    snapshot.js             # 归一化 + 合并 + 状态判定（纯函数，冻结契约）
    settings.js             # ~/.dsh/magpie-usage.json 读写 + 白名单夹取
    routes.js               # 四条同源路由 + 15s 快照缓存
  src/client/*.js           # 浏览器端分片（作者分文件，构建成单文件）
  client.js                 # 生成物：src/client/*.js 按名排序拼接（勿手改）
  scripts/
    build-client.mjs        # 分片 → client.js
    check-client.mjs        # 拼接 + 语法 + 模拟加载（不写 client.js）
    preview.mjs             # 用真实数据离线渲染并截图（PREVIEW_DIR 可换目录）
    smoke-server.mjs        # 四条路由挂到临时 http server
    rollback.sh             # 卸载
  tests/
    snapshot.test.mjs
    settings.test.mjs
    routes.test.mjs
```

## 客户端分片（为什么）

运行时必须是**单文件 classic script**（loader 只接受这一种形态），但单文件无法并行开发。所以源码拆成：

| 分片 | 负责 | 内容 |
|---|---|---|
| `00-head.js` | Lead | loader 外壳 + React |
| `10-constants.js` | Lead | 路由/周期/命名空间 |
| `20-locale.js` | Lead | zh/en 字典 |
| `30-format.js` | Lead | 取数与格式化 |
| `40-hooks.js` | Lead | useSnapshot / useSettings / useHistory |
| `50-primitives.js` | 视图 | Segmented / Bar / Sparkline / Totals / Style + CSS_PRIMITIVES |
| `60-views.js` | 视图 | 概览页（ProviderCard / AccountBlock / WindowBlock / Overview）+ CSS_VIEWS |
| `70-settings.js` | 设置 | 设置列（`SettingsPage`）+ CSS_SETTINGS |
| `80-surfaces.js` | 承载位 | Dock / Bottom / Orb 三种外壳 + CSS_SURFACES |
| `85-css.js` | Lead | 组合四段 CSS |
| `90-tail.js` | Lead | 槽位注册 |

规则：**只有 Lead 跑 `build-client.mjs`**；其他人用 `check-client.mjs` 自测，避免并发写 `client.js`。

> 客户端保持**单文件、无构建**，且必须是 **classic script**（`window.__ModuleLoader__.load({id, factory(require){ … return module.exports }})`），不能写成 ESM——平台 loader 只接受这一种形态。`require('react')` 是唯一外部依赖。

> 客户端保持**单文件、无构建**（照官方 `templates/decoration`）：`require('react')` 是唯一外部依赖。超过 1500 行再考虑引入构建，届时产物仍是同一 loader 格式。

## 宿主侧（Host）

`index.js` 只做装配：

```js
export const inject = ['subprocess', 'timer']   // curl 兜底 + 轮询缓存
export function apply(ctx, config) { ... }
```

注册的路由（同源，解决 CORS）：

| 路由 | 作用 |
|---|---|
| `GET /api/magpie-usage/snapshot?period=30d` | 归一化 Snapshot（含 accounts + usage 汇总 + sources 状态） |
| `GET /api/magpie-usage/history?provider=&user=` | 单账号走势点（按需，不进首屏） |
| `GET /api/magpie-usage/settings` / `POST` | 读写偏好 |
| `POST /api/magpie-usage/refresh` | 强制刷新（清缓存，body 可带 provider 定向） |

取数：`http.js` 先 `fetch`，失败退 `ctx.subprocess` 跑 `curl -sS --max-time`。Magpie 端口默认 3425，`MAGPIE_URL` 可覆盖。


## 已核实的平台事实（2026-10-30，DSH 0.2.1-rc.3）

| 事实 | 证据 |
|---|---|
| `webServer` 服务名与 `register({kind,path,handler})` | `dsh-host-webserver/lib/index.js:286,326` |
| `shell.bottom` 是整宽底栏（**已弃用**，1.0 只保留 dock/orb），空内容不占位 | `dsh-client-ui-layout/README.md:34` |
| `shell.overlay` 覆盖整个框架，子项需 `pointer-events:auto` | 同上 + `dsh-client-ui-workspace/lib/client.js:5306` |
| `settings.section` 注册一整页，左导航按 order 生成 | `dsh-client-ui-settings-general/lib/client.js:1300` |
| 禁止 iframe / 禁止追加到 `document.body` / 只用 `--dsw-alias-*` | 官方 skill `cordis-plugin-development/references/practices.md` |
| 主题令牌族 | `bg-layer-*`、`label-*`、`border-l*`、`state-*`、`radius-*`、`font-*`、`shadow-*` |

## 两个语义要分清

- `kind`：Magpie 的计费模型（它把点数钱包也叫 `subscription`）。
- `shape`：面板该怎么画——`windows` / `balance` / `none`。**视图只认 `shape`。**

## 合并规则（M1 实测后定稿）

`/v1/magpie/quotas` 对每个**账号**各出一条（workbuddy 四个登录就是四条）；缓存 `quotas.json` 用 `<provider>/<account>` 作键，同一账号的键与 live 的 `user` 对不上。

所以：**live 覆盖到哪个 provider，就只用它的 live 条目**；缓存只补 live 完全没有的 provider（例如在 Magpie 里被关掉的 DeepSeek），并标 `stale`。实测结果：13 live + 1 cache-only = 14 张卡，无重复。

## 数据流

```
magpie /v1/magpie/quotas ─┐
magpie /v1/magpie/usage   ├─► sources.js ─► merge.js ─► normalize.js ─► Snapshot ─► routes
magpie 缓存 json ─────────┘                                   ▲
                                                     settings.js (显示哪些)
```

`normalize.js` 是**冻结契约**：视图只消费 Snapshot，永不解析原始 JSON。改契约必须同时改两侧 + 升 `stateVersion`。

## 客户端侧（Client）

`client.js` 结构：

```js
window.__ModuleLoader__.load({
  id: 'dsh-magpie-usage',
  factory(require) {
    const React = require('react')
    // components: Summary(三种外壳) / Panel(= 用量概览页) / Card / Sparkline / SettingsPage
    return {
      inject: ['slots', 'locale'],
      apply(ctx) {
        // 位置由设置决定，三选一注册
        ctx.slots.inject('conversation.composer.dock', () => /* dock */)
        // ctx.slots.inject('shell.bottom', ...) — 已弃用
        ctx.slots.inject('shell.overlay',           () => /* orb */)
        ctx.slots.inject('settings.section', () => ctx.slots.register({
          name: 'settings.section', id: 'magpie-usage', order: 60,
          label: () => t('nav'), locale: 'magpie-usage',
        }, SettingsPage))
      }
    }
  }
})
```

槽位映射（均已核实）：

| 承载位 | slot | 说明 |
|---|---|---|
| dock | `conversation.composer.dock` | 输入框右侧，order 由宿主分配 |
| ~~bottom~~ | `shell.bottom` | 已弃用（1.0 起只保留 dock / orb） |
| orb | `shell.overlay` | 满屏浮层，自绘可拖拽球 |
| settings | `settings.section` | 左导航新增一列 |

共享状态：单个 `Store`（订阅式）持有 Snapshot + prefs，三处外壳与设置页都订阅同一份，避免多处轮询。

## 与旧插件的关系

- 旧：`@local/dsh-quota-glance`（工作区 `dsh-quota-glance/`）。它已验证「读 magpie 缓存 + 归一化 + 面板」这套逻辑，249/2 测试。
- 新：本工程**重写视图层与承载位**，数据归一化思路沿用但独立实现（不 import 旧包，避免连带它 12k 行的历史包袱）。
- 切换：新插件安装并验收通过后，停止并归档旧插件（见 PLAN M5）。二者同时启用会撞 `webserver` 重复 exact 路由，必须二选一。

## 测试策略

- 纯函数（normalize / merge / settings 校验）：`node --test`，喂真实快照 + 边界（缺字段、负数、超阈值、重复 provider）。
- 路由：起一个最小 http server 打桩，断言状态码 + 契约字段。
- 客户端：抽出纯渲染函数（`renderCard(account, prefs) -> vdom`）单测，不依赖 DOM；交互（拖拽/展开）用真实页面手验，写进 `docs/VERIFY.md`。
- 每次交付：`node --check` + 全量 `node --test` 必须绿。

## 依赖

零运行时依赖（除 react 平台注入）。不 `require('@deepseek-ai/dsh-client-ui-primitives')`（官方明令禁止），控件自写、样式只用 `--dsw-alias-*`。

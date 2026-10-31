# Magpie 额度 · 产品规范 (SPEC)

> 版本 v0.1 · 2026-10-30 · 状态：待用户确认
> 一句话：把 Magpie 已经知道的一切（谁快用完了、还剩多少钱），以可信、克制、随手可及的方式放进 DSH。

---

## 0. 第一性原理

Magpie 是本机唯一的 AI 网关，所有订阅账号都登录在它里面，它已经在收每个账号的额度、余额、用量、历史。**用户不缺数据，缺的是「在写代码的那个窗口里，抬头看一眼」的那一下。**

所以本插件不是「又一个余额挂件」，而是 Magpie 数据的**一个视图**：

1. 单一事实源 = Magpie（`127.0.0.1:3425`）。插件自己不登录任何厂商、不存凭据。
2. 只读。不写 Magpie 配置、不点签到、不改重置卡。用户要操作就去 Magpie。
3. 一个面板，三种承载位，任意切换。
4. 数字宁可缺，也不编。读不到就是「未接入 / 读取失败 + 原因」，绝不显示 0。

## 1. 用户与任务

- 主用户：单人重度用户，十几家订阅/中转挂在 Magpie（Cline、Codex、WorkBuddy ×4、WorkBuddy-AI ×3、Factory、ZCode、sub2api、Lobster…）。
- 三个任务，按频率排序：
  1. **瞥 (Glance)** — 1 秒内知道「有没有哪家快见底」。→ 输入框 chip / 悬浮球。
  2. **看 (Inspect)** — 展开后逐账号看窗口、剩余、重置倒计时、余额、走势。→ 面板 / 设置页。
  3. **配 (Control)** — 决定显示哪些账号、摆在哪里、多密。→ 设置里的独立一列。

## 2. 承载位（Placement）

同一份数据、同一套面板组件，三种外壳：

| 代号 | 槽位（已核实存在） | 形态 | 默认 |
|---|---|---|---|
| `dock` | `conversation.composer.dock` | 输入框右侧一枚 chip，点开两栏面板 | ✅ 默认 |
| `orb` | `shell.overlay` | 可拖拽悬浮球，吸附边缘，显示最紧张账号 | 可选 |

约束（来自官方插件规范，不可违反）：
- 不许 `document.body` 二次挂载、不许替换 app root、不许 iframe。
- 只用 `--dsw-alias-*` 主题令牌，自动跟随明暗。
- 每个承载位注册在 `ctx.slots.inject/register` 里，卸载即回收。

## 3. 信息架构

**L0 · 摘要**（chip / 悬浮球）
- 只回答一个问题：最紧张的那一项是谁、剩多少。
- chip 文案固定「用量/额度」，数值进 tooltip；悬浮球显示最紧张账号的环形百分比。
- 状态色：ok 绿 / warn 琥珀 / critical 红 / unknown 灰。

**L1 · 用量概览（= Magpie「观测/用量/概览」这一页，原生重做）**——只在三种承载位点开后出现，**不放在设置里**
- 顶部工具条：周期分段（今天 / 7 天 / 30 天 / 全部 / 自定义）+ 刷新 + 汇总「≈¥xx · N 次调用未计价」。
- 主体：账号卡网格（响应式 1–2 列）。每张卡：
  - 账号名 + 计划 + 用户（默认打码，hover 显示）
  - 每窗口：标签 / 进度条 / 剩余% / 重置时间 + 倒计时
  - 距速与整窗估算（有 `holds` 时）
  - 余额账号：余额行（`¥9.87` / `1155.86 点数`）
  - 「剩余额度走势」迷你折线（`/quotas/history`）
  - 失败账号：置顶 + 红点 + 可读原因
- 设置里的独立一列是**插件自己的设置页**（承载位/显示项/账号与分组/数据源/诊断），不是这页。

**L2 · 账号详情（popover）**
- 数据来源、最近读取时间、原始窗口、诊断信息（不泄露 key）。

## 4. 数据契约

统一归一化后交给视图，视图永不直接碰原始 JSON。

```
Snapshot {
  readAt: ISO | null,
  stale: boolean,
  sources: [{ id, kind:'magpie-live'|'magpie-cache'|'dsh-deepseek', ok, readAt, error? }],
  accounts: Account[],
  usage: { period, totals:{calls,cost,unpriced,credits,input,output,cacheRead}, series:[{label,time,calls,cost}], models:[{name,cost,calls}] }
}

Account {
  key,                      // provider|user 稳定 id
  provider, name, plan?, user?(masked), icon?,
  kind: 'subscription'|'balance',
  windows: [{ key, label, rawName, used, remaining, resetsAt?, resetSecs?, display? }],
  balance: { text, amount?, unit? } | null,
  history?: [{ at, left }],  // 仅 L2/走势用
  status: 'ok'|'stale'|'error'|'unsupported',
  error?: string,
  readAt: ISO
}
```

数据源优先级：**magpie-live 覆盖 magpie-cache 覆盖 直连兜底**。同一 `provider|user` 只出一张卡。

### 数据源映射（已实测 200）

| 用途 | 接口 |
|---|---|
| 账号 + 窗口 + 余额 | `GET /v1/magpie/quotas` |
| 走势 | `GET /v1/magpie/quotas/history` |
| 用量汇总 + 日序列 | `GET /v1/magpie/usage?period=` |
| 按模型/调用方明细 | `GET /v1/magpie/usage/requests?period=&offset=&pageSize=` |
| 缓存兜底 | `~/.config/magpie/{quotas,quota-history,providers}.json` |

宿主侧起同源路由转一手（Magpie 无 CORS 头），带 15s 缓存与 8s 超时。

## 5. 状态与可信度

| 状态 | 表现 |
|---|---|
| 正常 | 卡片正常；状态点小绿点 |
| 数据较旧（超阈值） | 卡片降透明度 + 「x 分钟前」，不隐藏 |
| 读取失败 | 置顶 + 红点 + 原因（如「API key 无效 (401)」） |
| 未接入（provider 关/无适配） | 灰行「未提供额度」 |
| Magpie 离线 | 顶部横幅「Magpie 离线」，保留上次数据并标注时间 |

铁律：**从不把缺失渲染成 0**。

## 6. 视觉系统

- 令牌优先：`--dsw-alias-*`（背景/文字/描边/主色），自绘图形才用字面色。
- 语义色：`ok #3fb950` / `warn #d29922` / `crit #f85149` / `unknown #8b949e`（深浅两套取令牌）。
- 间距 4 的倍数；圆角随宿主；字号 12/13/16/20 四档。
- 密度两档：紧凑（单行摘要） / 详细（卡片全展开）。
- 动效 150ms ease，`prefers-reduced-motion` 时关闭。
- 可达性：不只靠颜色（配图标/文字）；键盘可聚焦；`aria-label`；可见 focus ring。

## 7. 设置（独立一列 `settings.section`）

分区：
1. **承载位** — 输入框 / 悬浮球（单选），悬浮球可设大小/透明度。
2. **显示项** — 窗口名、剩余%、重置倒计时、余额、预计用完、更新时间（复选）。
3. **密度与尺寸** — 紧凑/详细；面板高度 120–360px。
4. **账号与分组** — 逐账号显示开关、上移/下移、别名。
5. **数据源与刷新** — 实时/仅缓存；刷新间隔 15/30/60s。
6. **诊断** — 每个源的状态、最近读取、错误原文。

偏好持久化：`~/.dsh/magpie-usage.json`（宿主读写，客户端经路由）。

## 8. 性能

- 全插件**一个轮询器**，所有承载位共享；页面隐藏时暂停。
- 宿主路由缓存 15s；客户端 30s 拉一次（可配）。
- 单次 payload 目标 < 40KB（`history` 按需再拉，不在首屏）。

## 9. 隐私与安全

- 不读、不存、不打印任何 key。
- 账号 email / id 默认打码（`a1860…@gmail.com`），hover 才全文。
- 只监听 `127.0.0.1`，不对外。

## 10. 非目标

- 不做计费、不做预测、不做告警外发。
- 不写 Magpie 配置、不代签到、不代换号。
- 不替换宿主 UI、不 iframe。

## 11. 验收标准（Definition of Done）

- [ ] 三种承载位都能单独开启，切换即时生效。
- [ ] 设置里出现「Magpie 额度」独立一列，六个分区可用且持久化。
- [ ] 首屏可见全部 magpie-live 账号（当前 13 个），余额账号显示金额。
- [ ] 断开 Magpie 时不崩，显示离线横幅 + 上次数据。
- [ ] 明暗主题下都不出现字面写死的背景/文字色（令牌审计通过）。
- [ ] 键盘可达、`aria` 完整、无仅靠颜色的状态。
- [ ] 全部单测/集成测试绿；`node --check` 通过。
- [ ] 一键回滚脚本可用，卸载后无残留（patch/软链/lock）。

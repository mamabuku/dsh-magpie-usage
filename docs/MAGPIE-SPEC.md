# MAGPIE-SPEC — magpie 用量页真实算法与数值（二进制取证）

证据来源：`/Applications/magpie.app/Contents/MacOS/magpie`（64,193,696 字节，版本 2026-10-30 构建）。
内嵌明文资产（Go:embed，均完整提取至 `docs/reference/`）：

| 资产 | 二进制 offset | 提取文件 |
|---|---|---|
| usage.js（用量账页代码，头部自述 "The Usage page's code"） | 28667680–28873013 | （未单独落盘，见 spec 内引用） |
| app.css | 29561888–29937806 | `docs/reference/magpie-app.css` |
| page.js（主前端脚本，含额度卡片全部逻辑） | 31203008–32516213 | `docs/reference/magpie-usage-page.js` |
| i18n（`const I18N = { zh: … }` 等，键=英文原文） | 35760128–37682165 | `docs/reference/magpie-i18n-zh.json`（用量相关 1176 对，非全表） |
| Go 源码 main 包（`windowHolds` 等，明文注释） | ≈25631115–26270000 一带 | 见下文逐条引用 |

下文 offset 一律指**原始二进制**中的偏移。所有结论均可对照上述文件 grep 复核。

---

## 1. 配速（Pace）

`page.js` offset **31963286**：

```js
// quotaPace: how far a window is from an even pace through it, as a
// number: the figure the meter shows less what an even pace would show
// by now, in points of the window, rounded — used 60% halfway through is
// +10, and left it is −10; null where the window's start or reset isn't
// known (startsAt is the gateway's, provider.WithWindowStarts).
function quotaPace(w, now = Date.now()) {
  if (w.unlimited || quotaNoShare(w) || w.historyMissing || !w.startsAt || !w.resetsAt) return null;
  const s = Date.parse(w.startsAt), e = Date.parse(w.resetsAt);
  if (!(e > s) || now < s || now >= e) return null;
  const d = to100(w.used) - (100 * (now - s)) / (e - s);
  const n = Math.round(quotaLeft ? -d : d);
  return { n: n === 0 ? 0 : n, over: Math.round(d) > 0, under: Math.round(d) < 0, by: Math.abs(Math.round(d)) };
}
```

- **公式**：`d = 已用% − 100 × (now − 窗口开始) / (重置 − 窗口开始)`；显示值 `n = round(d)`（读"已用"时）或 `round(−d)`（读"剩余"时）。
- 显示格式 `paceNumber`（offset 31963809）：`+12%`、`−8%`（**真减号 U+2212**，不是连字符）、`±0%`。
- **边界**：`unlimited` / 无 share / `historyMissing` / 缺 `startsAt`（由网关 `provider.WithWindowStarts` 填） / 缺 `resetsAt` / `e<=s` / `now<s` / `now>=e` → 不显示（null）。除零被 `!(e>s)` 挡住；窗口刚开始（now≈s）时 d≈used，可正常显示。
- 语义文案（I18N zh，offset 35865686 起）：`Pace {n}` → `配速 {n}`；`over` 时 tooltip = "比匀速多用了 {n}：按这个速度，会在重置前用完"，`under` 时 "比匀速少用了 {n}：按这个速度，能撑到重置"，否则 "正好是匀速"。红色/警示 class 由 `p.over` 决定（`quota-pace over`）。
- **另一条"配速"线是 `quotaEta`**（offset 32083935）：按当前窗口内最近 ≤7 天（`quotaEtaSpan = 7*86400e3`）的读数做**最小二乘直线拟合**，外推到 `left=0` 的时刻，即"按此速度预计 X 用完"。要点：
  - 只取**自上次回填（cycle start）以来**的点；回退跳过连续不下降的尾部，最多回看 7 天；
  - `pts.length < 3`、首尾跨度 `< 1 小时`、`last.left <= 0`、`den <= 0`、`slope >= 0`（不在降）、`out <= now` → 不显示；
  - `out >= reset` → 显示 `Lasts past the reset at this pace`（撑得到重置）而不是时刻。
  - 这是 magpie 卡片头部 "Runs out {when} at this pace" 的来源；**不是** `runsOutAt`（那是 vendor 侧给的字段）。

## 2. 整窗 ≈ N tokens / ≈ ¥M

**结论：`holds.tokens` / `holds.cost` 本身就是整窗估算值，不是本窗累计。** 由 Go 后端 `windowHolds` 算好下发，前端 `holdsLine` 直接显示。

Go，offset **26259228**（`func windowHolds`）核心段：

```go
for s, h := range sums {
    if why[s] != "" { continue }
    w := window(s)
    h.Used = w.Used
    scale := 100 / w.Used
    h.Tokens = int64(math.Round(float64(h.Routed.Tokens) * scale))
    if !unpriced[s] && h.Routed.Cost > 0 {
        h.Priced = true
        h.Cost = h.Routed.Cost * scale
    }
    w.Holds = h
}
```

- **公式**：`整窗 tokens = round(routed.tokens × 100 / used)`，`整窗 cost = routed.cost × 100 / used`；`routed.*` 是 magpie 在本窗口内经手该账号的调用合计（input+output，cache 读/写单列，见同函数 `h.Routed.Tokens += int64(r.Input + r.Output)`）。
- **实测验证**（/v1/magpie/quotas，2026-10-31）：Factory 7d `routed.tokens=78,241, used=18` → 78,241/0.18 = **434,672** = `holds.tokens` ✓；`routed.cost=15.8203` → **87.8906** = `holds.cost` ✓。Codex 30d `3,117,224/0.62 = 5,027,781` ✓，`1.61446/0.62 = 2.6040` ✓。**所以"面板显示 502.8 万 = holds.tokens"不是巧合，是取值正确。**
- **`≈ ¥17.39` 与 `holds.cost=2.60` 的关系**：holds.cost 的**计价单位是 USD（API 标价）**，见 tooltip 键 "The whole window ≈ {tokens} tokens of input and output, ≈ {cost} **at API list prices**"；magpie 自己的 `fmtCost`（page.js offset 32043890）在设置 `currency==="cny"` 时 `c = c * fx.rate; sign = "¥"`。2.604 × 6.678 ≈ **17.39**，即 magpie 页面上按当时汇率换算后的显示值。**我们插件 `money()` 直接加 `¥` 前缀不换算（30-format.js），把 USD 标成了 ¥——¥87.89 实为 $87.89，这是标错币种。**
- **成本价口径**：`apiPricer`（同区域，offset 26260 后段）：每调用按「厂商 maker 价 → 该 provider 清单价 → 同模型别名价（SamePriceIn）→ 实际服务模型价」取第一个非零 API 标价；**绝不用用户给订阅设的价格**。有任一调用无价 → `unpriced` → 不显示金额，只显示 tokens。
- **前端显示**：`holdsLine`，page.js offset **32181949**：

```js
function holdsLine(h) {
  const line = el("span", "quota-holds");
  line.append(el("span", "", t("Whole ≈ {n} tokens", { n: fmtN(h.tokens) }) + (h.priced ? " ·" : "")));
  if (h.priced) line.append(" ", el("span", "", "≈ " + cost(h.cost)));
  ...
}
```

- **不能估算时的护栏（holdsWhy）**，`holdsUnknownLine` offset 32183917 + `holdsBounds` Go offset 26254722：
  - `low`：已用 < **HoldsFloor**（前端提示语写死 `n:5`，即 5%；Go 常量本体在 provider 包，未嵌出，数值 5 为前端证据，**Go 侧未直接确认**）——"取整比例太粗，没法按比例推算"；
  - `clock`：`w.Bounds(at)` 失败（无重置时间）；
  - `log`：窗口开始早于 magpie 请求日志（`first.After(start)`）；
  - `none`：本窗无一笔经手调用（`Routed.Tokens <= 0`）；
  - `credits`：窗口处在"读数为 0 后厂商仍应答"的 dry-run 段，调用可能由积分/额外用量支付（Go `dryRun`，offset 26255400 后）；
  - `-`（静默）：balance 卡、错误卡、`User==""`、unlimited、family/pool 窗口（除非 pool 成员已知）、`Used` 为 NaN。
  - 显示为 `Whole: not enough data`（"整窗：数据不足"），弱化样式，原因进 tooltip。

## 3. 卡片分组与折叠

分组（page.js offset **32045955** `renderQuotas` 内）：

```js
const shown = overviewCards(quotas);
// an agent with several accounts is one card, a section per account
const groups = [];
for (const sub of byUsageOrder(keyCards(shown))) {
  const g = sub.user && groups.find((x) => x[0].user && x[0].provider === sub.provider);
  if (g) g.push(sub); else groups.push([sub]);
}
```

- **一 provider 一卡**；有 `user` 的账号按 `provider` 归并进同一卡；无 user（插件/密钥卡）单列。卡片顺序按设置 `usageOrder`（拖拽记忆），未记忆的按 magpie 下发序跟在后面（`byUsageOrder`，offset 32061837）。
- **keyCards**（offset 32062792）：把密钥的 balance 挂到其 plan 的卡上，避免同名双卡。
- **full / brief**：`brief = several && !usageAcctOpen(sub, subs)`（offset 32055859）。开合状态三级记忆：单账号开关 `usageAccounts`（localStorage，per 账号）→ 卡级 `usageOpen`（per provider）→ 默认只展开 `usageShown(subs)` 那一个。brief 态只画每窗"名字 + 数值 + 条"，重置时间进 tooltip，另有 `autoResetBrief` 摘要；曲线、holds 行、签到行、每日积分等只在 full 画。
- **`{n} accounts` / `{n} keys` 的判定**：`keys = several && subs.every(q => !q.windows?.length && !q.plan) && subs.some(q => q.balance)`（offset 32046500 一带）——**全部成员都无窗口无 plan 且至少一个有余额**才算"密钥卡"，走 `keysFolded`/`keysMore`（KEYS_SHOWN=3，offset 32056887）；否则是账号卡，`acctsFolded`（ACCTS_FOLD=8, ACCTS_SHOWN=5，offset 32058027）。
- **`Show {n} more accounts`**（`usageMore`，offset 32059929）触发条件：有账号处于 brief（`closed.length>0`）；面板模式下一张都不展开时按钮只算"再展开 1 个"。计数 = 处于 brief 的账号数；全部展开后按钮变 "Show fewer accounts"/"Show every account in brief"。另外 `acctsFolded` 会在前 5 个之外**强制露出**"带签到开关的该厂商第一个账号"（checkinRow 需要可见，#694）。单账号自己的折叠按钮 `usageAcctFold`（offset 32061162）只影响该账号，不改卡级按钮计数。
- **`{sum} in all`（合计）**：`keysSum`（page.js 内 offset 32059226）——把每个密钥的 `balance` 文本用正则 `^([^\d-]*)(-?\d[\d,]*(?:\.\d+)?)(\D*)$` 拆出数字与前后缀，**前后缀不完全一致就放弃合计**，全一致则求和并按 `balanceAmount` 格式化。只对"密钥卡"（上一条判定）显示，普通账号卡不显示合计。WorkBuddy 多账号不属密钥卡，故无 `{sum} in all`。

## 4. 排布算法 packUsage

page.js offset **32064431**；常量 `USAGE_MIN=260, USAGE_GAP=7`（offset 32064349）。

- **列数**：`most = max(1, min(卡数, floor((宽+GAP)/(MIN+GAP))))`；在 `{most, most-1}` 两档里选：`p.tall <= best.tall*1.3 && p.empty < best.empty*0.6` 才换档（宁可少一列也求底部齐）；选完**再量一次**定稿。
- **放置**：逐卡放入"当前结束高度最低（容差 1px）的列"（next-fit 的最矮列变体），`grid-area = row / col / span h / span 1`；每列最后一张卡的 `min-height` 拉到与最高列齐平。
- **时机**：`packUsageNow` 挂 `ResizeObserver`（观察 list、每张卡、卡的每个直接子节点），回调里 `requestAnimationFrame` 去抖；视口不可见时清空 grid 设置，等再出现再 pack；`usageArranging`（拖拽中）时跳过并记 pending。
- **照搬评估**：算法本身 ~80 行、零依赖，可直接移植；代价是要复刻它依赖的两个测量前提——`fitQuota`（对 `.quota-windows` 先量一次行高，offset 32171096）和"卡片 minHeight 锁行"约定，否则会抖动/循环触发 observer。我们面板若卡数少（≤4）可以不做分档选列，只做最矮列放置，收益接近、复杂度减半。

## 5. 图标解析

`icon(name, lazy)`，page.js offset **31222274**：

```js
const pngIcons = new Set(["crush","zcode","alma","hanako","cindy","lody","typesafe","atomcode","snow","mlx-serve","mothx","zoo-code"]);
function icon(name, lazy) {
  const e = el("span", "ic");
  e.dataset.icon = name || "";
  if (name === "generic") { ...内置六边形 svg... }
  if (name?.startsWith("file:")) {          // 用户自传图片
    img.src = "/api/icons/" + encodeURIComponent(name.slice(5)); ... }
  if (/[:/]/.test(name)) return icon("generic");  // 其他带冒号/斜杠 → generic
  if (name.endsWith("-color") || pngIcons.has(name)) {   // <img>
    img.src = `icons/${name}.${pngIcons.has(name) ? "png" : "svg"}`; ... }
  else e.append(maskSpan(`icons/${name}.svg`, ...));     // CSS mask
}
```

- **三类来源**：`file:xxx` → `<img src="/api/icons/xxx">`（服务端保存的用户图片）；`xxx-color` 后缀或 pngIcons 成员 → `<img src="icons/NAME.svg|png">`（**相对路径资产，Wails assetserver 提供**）；其余纯名 → `<span class="mask">` + `-webkit-mask: var(--i)`（`maskSpan` 把 svg 地址写进 `--i`），加载失败降级 generic。名字里含 `:` 或 `/` 且非 `file:` → 直接 generic。
- **CSS**（app.css，提取件 21–23 行）：`.ic` 16×16；`.ic .mask { background: currentColor; mask: var(--i) center/contain no-repeat }` —— mask 图标随文字色变色；`.ic:is([data-icon="…-color"],…)` 名单内缩到 82%。卡片头 logo 即 `icon(first.icon)`，拖拽手柄是 `usageHandle`（offset 32068433，同一 logo 加拖拽行为）。
- **内置图标清单**：二进制里以 `icons/<name>.svg|.png` 路径字符串存在，共 **191 个**（已全量列出）。规则：`-color` 为彩色的 `-color.svg`，12 个 png（pngIcons 名单），其余单色 mask 用 `.svg`。样例：`codex-color.svg`、`workbuddy-color.svg`、`factory.svg`、`zcode.png`、`openai.svg`、`deepseek-color.svg` 等；完整清单见下（按字母序，191 个）：

<details><summary>icons/ 资产全名单（grep 自二进制）</summary>

ai21, ai302-color, ai360-color, aihubmix-color, aionui, air, alibaba-color, alibabacloud-color, alma(png), anthropic, antigravity-color, anyscale-color, app-alma(png), app-cc-switch(png), apple-touch-icon(png), aside, astrbot, atomcode(png), aws, azure-color, azureai-color, baichuan-color, baidu-color, baiducloud-color, bailian-color, baseten, bedrock-color, burncloud-color, bytedance-color, cerebras, chatglm-color, cherryin-color, chutes, cindy(png), claude-color, claudecode-color, cline, cloudflare-color, codebuddy-color, codex-color, cohere-color, cometapi-color, commandcode, copilot-color, coze, crush(png), curl, cursor, deepinfra-color, deepmind-color, deepseek-color, deveco-color, devin, doubao-color, empryo-color, factory, favicon, featherless-color, fireworks-color, friendli, fx, gemini-color, geminicli-color, gemma-color, giteeai, github, githubcopilot, glama, gmicloud, google-color, googlecloud-color, goose, grok, groq, hanako(png), hermes, huawei-color, huaweicloud-color, huggingface-color, hunyuan-color, hyperbolic-color, icon-512(png), iflytekcloud-color, inference, infinigence-color, internlm-color, jcode, jina, kilo, kilocode, kimi, kiro-color, kling-color, lambda, leptonai-color, liquid, llmapi, lmstudio, lody(png), longcat, magpie, meta-color, metaai-color, microsoft-color, mimocode, minimax-color, mistermorph-color, mistral-color, mlx-serve(png), modelscope-color, monica-color, moonshot, morph-color, mothx(png), nebius, newapi-color, nousresearch, nova-color, novita-color, nvidia-color, ollama, omlx, omo, omp, openai, openchamber, openclaw, opencode, openrouter, openwebui, parasail, penguin-color, perplexity-color, phala-color, pi, pipellm-color, poe, ppio-color, prime-agent, qiniu-color, qoder, qwen-color, raycast, reasonix-color, reka, replicate, roocode, rtk(png), sambanova-color, sensenova-color, siliconcloud-color, snow(png), snowflake-color, sophnet-color, spark-color, stepfun-color, straico-color, submodel-color, t3code, targon-color, tencent-color, tencentcloud-color, tiangong-color, together-color, trae, typesafe(png), upstage-color, venice-color, vercel, vertexai-color, vllm-color, volcengine-color, voyage-color, vscode, wenxin-color, windsurf, workbuddy-color, workersai-color, xai, xiaomimimo, xinference-color, yi, yuanbao-color, yylx, zai, zcode(png), zed, zenmux, zeroone, zhipu-color, zoo-code(png)

</details>

## 6. 其余行为清单

- **签到行 `checkinRow`**（page.js offset **32159018**）：条件 `q.checkin` 存在。厂商映射 `CHECKINS`（offset 32156049）：`""→workbuddy`、`trae`、`minimax`、`qoder`，另有 `pluginCheckin`（`checkinBy: "plugin:<id>"`，插件自带签到）。显示：今天（**北京时间** `wbToday()`，offset 32165408）`claimed/done` → "Checked in today +{credit} · {n}-day streak"；`again` → "商家说已签但其日期可能未翻，稍后再试"（中午前不算数，#3326）；`ineligible/inactive` 等给原因；非今天 → "last checked in {day}"。每厂商**第一个**带签到的账号承载开关（与设置"Daily check-in"同 pref，`workbuddyCheckin` 等）。
- **自动使用重置卡 `autoResetRow`/`autoResetBrief`**（offset 32148119 / 32150915）：条件 `autoResetKept(q)`。卡片行显示 `q.resets?.count`（"↺ 3 ·"）与两档开关（week 用尽时、临期前 ~30 分钟），`resetsUsedLine`（offset 32149253）显示最近一次被使用的重置 `Last reset used: {when} · {why}`（why：`week` 自用 / `expiring` 临期 / 手动），全部历史进 tooltip。brief 态以 `acct-auto` 摘要出现（#801）。"Use a reset" 按钮只有 codex 账号有（GLM 团队要去 bigmodel.cn 用，见 3152 行注释）。
- **每天用掉的积分 `creditDays`**（offset 32071031）：条件 `sub.daily`（magpie 自己按日累计的积分，`credits-daily.json` 的来源，#568/#3321）；多 pool 时各自一行并命名。
- **"刚刚更新" `readWhen`**（offset 32174189）：优先 `q.readAt` → `Updated {when}`（`ago()` 相对时间，offset 32213635，每 30s 全量刷新）；`q.asOf`（历史替身数据）→ stale 样式；`q.history` → `Last reading {when}`。悬浮显示绝对时间的 `toLocaleString(intlLang())`。
- **单独刷新**：`quotaRefresh`（offset 32174300 后），只重读该账号，`keepRefreshedQuotas`（offset 32041734）防止整页重绘时丢掉刷新中卡片。
- **窗口上限（cap）**：`accountCapPill` / 单窗口 `aq-set`（"Cap {n}%"），magpie 读到窗口 ≥cap 即判该账号用尽并绕行；turn 已开始可越过，tooltip 明说不保证剩余。
- **并发 lanes**：`laneLimitOf` = 账号自设 > provider `maxConcurrency` > 插件 `pluginConcurrency`；在视野内时每 2s 读一次 `lanesNow`。
- **数字格式 `fmtN`**（offset 32042960）：中文且开"万/亿"设置时 ≥1e8 用 `亿`（TW `億`）、≥1e4 用 `万`（`萬`）；否则 1.33B/13.3M/133K 英式。**金额 `fmtCost`**（offset 32043890）：无价且 unpriced → 空（不显示 $0）；≥100 取整、≥1 两位、<1 三位小数；unpriced 加 `+`。

---

### 已知未确认

1. `provider.HoldsFloor`、`provider.Holds*` 常量字面值（provider 包 Go 源码未嵌入二进制；`low=5%` 来自前端提示语 `{ n: 5 }`）。
2. 汇率 `fx` 的取值时机（`/api/settings` 回答时填，见 fmtCost 注释）——具体接口字段未抓包验证。
3. `packUsage` 的 `USAGE_MIN=260` 是 CSS 像素还是逻辑像素（未做渲染实验），照搬时建议按我们面板实测再定。

# Magpie 额度看板 for DeepSeek Harness

**Magpie Usage Panel for DeepSeek Harness — a persistent dashboard for the accounts, quotas and balances of your local Magpie gateway.**
**It reproduces Magpie's own Usage page 1:1 inside DSH, with every derived number following Magpie's real algorithms (reverse-engineered and documented).**
**Read-only: no logins, no config changes, no requests that Magpie itself does not already make.**

把本机 [Magpie](https://github.com/yetone/magpie) 网关的账号额度、余额与用量，做成 DeepSeek Harness（DSH）里的常驻看板；面板结构与数值口径 1:1 复刻 Magpie 自己的「用量」页。

![用量概览](docs/preview-overview.png)

## 是什么 / 不是什么

- **是**：一个 DSH 插件，宿主侧定时读本机 Magpie 的 HTTP 接口与本地 JSON，客户端把结果渲染成「概览条 → 状态条 → Provider 卡」的看板，可在设置里独立一列打开，也可挂在输入框附近或做成悬浮球。
- **不是**：它不试图成为 Magpie 的替代品。它**只读**——不登录任何厂商、不写 Magpie 配置、不发出 Magpie 之外的任何请求。

## 环境要求

- macOS（图标提取与路径约定均按 macOS 写死）；
- DeepSeek Harness **0.2.1-rc.3**（实测版本）；
- 本机 Magpie 正在运行（默认 `127.0.0.1:3425`）；
- Node.js ≥ 22（安装脚本需要）。

## 安装

### 方式一：一键安装

```bash
npm run install
```

脚本会**先备份**再改写 `~/.dsh/profiles/desktop/cordis.patch.yml`（插入 4 行挂载块）与 `~/.dsh/profiles/desktop/package.json`（加 link 依赖），然后建好 `node_modules` 软链。完成后**重启 DSH** 生效。

### 方式二：手动安装（三步）

设仓库绝对路径为 `$REPO`（即本仓库根目录），profile 目录为 `~/.dsh/profiles/desktop`：

1. **profile 的 `package.json` 加 link 依赖**：

   ```json
   "dependencies": {
     "dsh-magpie-usage": "link:$REPO"
   }
   ```

2. **建软链**：

   ```bash
   mkdir -p ~/.dsh/profiles/desktop/node_modules
   ln -s "$REPO" ~/.dsh/profiles/desktop/node_modules/dsh-magpie-usage
   ```

3. **在 `~/.dsh/profiles/desktop/cordis.patch.yml` 里插入 4 行块**：

   ```yaml
   # Mount the Magpie usage bundle. Host routes live in ./index.js.
   - insert:
       - id: dsh-magpie-usage
         name: 'dsh-magpie-usage'
   ```

改完**重启 DSH**。三步的顺序不限，但三处都齐了才会被加载。

## 用法

安装后打开 **设置 → 「Magpie 用量」一列**，可调：

| 设置 | 说明 |
|---|---|
| 承载位 | 「输入框附近」（会话输入框旁的胶囊，点开面板）或「悬浮球」 |
| 悬浮球大小 / 面板高度 | 32–72px / 120–360px 滑杆，随承载位切换显示 |
| 密度 | 紧凑 / 标准 |
| 显示项 | 进度条、重置时间、余额、本期用量、今日积分、更新时间，逐项开关 |
| 数据源 | 实时（读 Magpie 接口）/ 仅缓存（只读本地快照） |
| 刷新频率 | 15s / 30s（默认）/ 60s |

面板本身：标题栏可**拖动**，**双击标题栏复位**位置；悬浮球同理可拖动、双击回默认角落。周期切换（今天 / 7 天 / 30 天 / 全部）只影响「汇总与调用数」，不影响额度卡。

## 数据口径（每个数都能追到 Magpie 的原始字段）

派生值一律按 Magpie 自己的真实算法计算（从 Magpie 二进制取证，见 [docs/MAGPIE-SPEC.md](docs/MAGPIE-SPEC.md)）：

- **整窗 ≈ N tokens / ≈ ¥M**：Magpie 后端已按 `routed × 100 / used` 换算好整窗估算（`holds.tokens` / `holds.cost`），面板直接取值；`holds.cost` 计价单位是 **USD（API 标价）**，面板按 `~/.cache/magpie/fxrate.json` 的汇率换算成 ¥ 后显示。
- **配速 ±N%**：`已用% − 100 × (now − startsAt) / (resetsAt − startsAt)`，负数用真减号 `−`（U+2212）。
- 「按此速度，预计 X 用完」对应 Magpie 的 `runsOutAt` 字段；vendor 侧未给的字段不冒充，显示「数据不足」。
- 逐字段核对可跑 `npm run audit`：把面板快照与 Magpie 原始接口逐项比对并逐行打印，失败退出码非零。**它需要本机 Magpie 在跑**；CI 或无 Magpie 的环境请跳过这一步。

设计契约见 [docs/DESIGN.md](docs/DESIGN.md)，面板结构见 [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)，产品规范见 [docs/SPEC.md](docs/SPEC.md)。

## 卸载 / 回滚

```bash
npm run uninstall
# 或
./scripts/rollback.sh          # 可选参数：profile 目录，默认 ~/.dsh/profiles/desktop
```

两者都只动 cordis.patch.yml 的插入块、profile package.json 的 link 依赖与 node_modules 软链，幂等，重复执行安全；不删源码树，也不动你的面板偏好。

## 已知限制

- 「输入框附近」的胶囊只在**已打开会话**的输入框区域出现（DSH 客户端槽位的注册范围决定的），空会话页看不到；悬浮球不受此限。
- `workbuddy`、`lobster`、`sub2api` 等没有内置图标的 provider，用**品牌色首字母块**代替；已覆盖的原生图标（codex / cline / factory / deepseek / zcode / zhipu）提取自本机 Magpie，见 [assets/icons/README.md](assets/icons/README.md) 与提取脚本 [scripts/extract-magpie-icons.mjs](scripts/extract-magpie-icons.mjs)。
- 仅数据源为「实时」时才能刷新到最新读数；Magpie 未运行时面板显示读取失败或较旧数据，不会编造数值。

## License

MIT，见 [LICENSE](LICENSE) 与 [NOTICE](NOTICE)（第三方商标与图标来源说明）。

# Magpie 额度 · 开发计划 (PLAN)

> 原则：每个里程碑可独立验收、可回滚；不跨阶段堆功能。主控每阶段亲自验收 diff + 本地探测。

## M0 · 规范与骨架（本次）
- [x] SPEC / ARCHITECTURE / CONVENTIONS / PLAN 四份文档
- [ ] 用户确认关键决策（见文末）
- 产出：`docs/` 四件套
- 验收：用户点头，或明确改哪几条

## M1 · 数据层（宿主）
- `lib/host/{http,sources,merge,normalize,config}.js`
- 实时 `/v1/magpie/quotas` + `/v1/magpie/usage` + 缓存兜底；合并去重；Snapshot 契约
- 路由 `/api/magpie-usage/snapshot`
- 测试：normalize / merge / routes，喂真实快照 + 边界
- 验收：`curl /api/magpie-usage/snapshot` 返回 13 个账号（含余额）、sources 状态正确；测试全绿
- 文件所有权：A

## M2 · 用量概览面板（= Magpie「观测/用量/概览」页）
- `client.js`：`Panel` / `Card` / `ProgressBar` / `Sparkline` / 周期切换 / 空旧错状态
- 先只挂在 `settings.section`（独立一列），方便验收整页
- 验收：设置里出现「Magpie 额度」列；13 卡全show；周期切换生效；明暗主题正常；断开 magpie 显示离线横幅
- 文件所有权：B

## M3 · 三种承载位
- `dock`（`conversation.composer.dock`）/ `orb`（`shell.overlay`，可拖拽吸附）——`bottom`（`shell.bottom`）已按用户决定在 1.0 前移除
- 一处共享 Store，位置由设置决定
- 验收：三种都能单独启用/切换即时生效；悬浮球拖动位置持久化；不写 document.body
- 文件所有权：B

## M4 · 设置页 + 视觉打磨 + 可达性
- 六个分区全部落地并持久化到 `~/.dsh/magpie-usage.json`
- 令牌审计（无字面色）、键盘可达、aria、reduced-motion
- 验收：SPEC §11 全部勾选
- 文件所有权：B（设置）/ 主控（审计）

## M5 · 安装 / 迁移 / 回滚
- `scripts/install.sh` / `rollback.sh`；软链 + patch 行 + profile package.json
- 停用并归档 `dsh-quota-glance`
- 验收：真机重启后可见可用；回滚脚本跑通；无残留
- 文件所有权：主控

## 待用户确认（挡住 M1 开工）

1. **底板选择**：新建 `dsh-magpie-usage` 独立工程（推荐，干净），还是在现有 `dsh-quota-glance` 上原地重构（省一次安装，但背着 12k 行历史）？
2. **默认承载位**：先做哪个当默认？（推荐 `dock`，其余可切）
3. **旧插件**：验收通过后归档 `dsh-quota-glance`，可以吗？
4. **只读边界**：签到 / 重置卡这类 magpie 自身操作，确认插件不碰？（推荐不碰）

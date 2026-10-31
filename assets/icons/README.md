# 供应商图标（本地识别用）

这些 SVG 来自本机安装的 **Magpie**（`/Applications/magpie.app`，Go + Wails，前端资源内嵌在二进制里），
按各自 `<title>` 精确提取，用于在 DSH 面板里标识对应的 provider。

- 仅在本地渲染、不对外分发；商标归各厂商所有。
- 覆盖：codex / cline / factory / deepseek / zcode(Z.ai) / zhipu。
- 未覆盖的 provider（workbuddy、lobster、sub2api 等）回退为「品牌色 + 首字母」字母块；
  lobster、sub2api 若 Magpie 提供 `file:` 图标，则由宿主路由读取 `~/.config/magpie/icons/` 渲染。
- `index.json` 是 provider → 文件名的映射，宿主按它解析。

提取脚本见 `scripts/extract-magpie-icons.mjs`（只读本机 Magpie 二进制）。

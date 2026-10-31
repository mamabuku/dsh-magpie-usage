# 安装 / 卸载

`dsh-magpie-usage` 通过 DSH 的插件挂载机制加载：profile 的 `package.json` 声明
`link:` 依赖，`node_modules/dsh-magpie-usage` 软链到本仓库源码树，
`cordis.patch.yml` 里有一个顶层 `insert` 块。三者齐了、**重启 DSH** 后生效。

## 一键安装

```bash
node scripts/install.mjs                # 默认 ~/.dsh/profiles/desktop
node scripts/install.mjs --dry-run      # 先看会改什么，不落盘
node scripts/install.mjs --profile ~/.dsh/profiles/另一个 --source /path/to/dsh-magpie-usage
```

脚本行为：

1. 校验 profile 目录与 `package.json` / `cordis.patch.yml` 可读，否则报错退出（码 1）；
2. **先备份再改**：被修改的文件存为 `*.bak-install-<时间戳>`；
3. `package.json`：新增/更新 `"dsh-magpie-usage": "link:<source 绝对路径>"`；
4. 建软链 `node_modules/dsh-magpie-usage` → source（已存在且指向正确则跳过；指向别处则报错，请人工处理，脚本不覆盖）；
5. `cordis.patch.yml`：没有 `id: dsh-magpie-usage` 的 insert 块时，在文件末尾追加：

   ```yaml
   - insert:
       - id: dsh-magpie-usage
         name: 'dsh-magpie-usage'
   ```

6. 打印备份文件名与回滚命令。

每步幂等：重复运行不重复插入、不重复备份（无改动就什么都不写）。

## 手动安装

1. `~/.dsh/profiles/desktop/package.json` 的 `dependencies` 加一行
   `"dsh-magpie-usage": "link:<本仓库绝对路径>"`；
2. `ln -s <本仓库绝对路径> ~/.dsh/profiles/desktop/node_modules/dsh-magpie-usage`；
3. `~/.dsh/profiles/desktop/cordis.patch.yml` 末尾追加上面的 insert 块；
4. 重启 DSH。

## 卸载

```bash
node scripts/uninstall.mjs              # 默认 ~/.dsh/profiles/desktop
node scripts/uninstall.mjs --dry-run    # 预演
```

反向移除依赖、软链和 patch 里的 insert 块（连同紧邻的注释行），同样先备份
（`*.bak-uninstall-<时间戳>`）再改、幂等。**保留** `~/.dsh/magpie-usage.json`
（偏好设置）与仓库内的图标资产，重装后原样可用。

## 回滚

- 恢复某个文件：`cp <文件>.bak-install-<时间戳> <文件>`（备份名在安装输出里）；
- 或整体反做：`node scripts/uninstall.mjs --profile <profile>`；
- 也可以用旧脚本 `./scripts/rollback.sh [profile-dir]`（针对 `@local/dsh-magpie-quota` 时代的块）。

改完记得重启 DSH。

## 常见问题

- **装完了，DSH 里没出现「Magpie 额度」？**
  挂载只在启动时读取，**重启 DSH** 才生效。重启后仍没有：确认 `cordis.patch.yml`
  里有 `id: dsh-magpie-usage` 块、软链
  `node_modules/dsh-magpie-usage` 指向本仓库（`ls -l` 看一眼），再看启动日志有没有
  loader 报错。

- **patch 里已经有这块了？**
  安装脚本按 `id: dsh-magpie-usage` 识别，已有就跳过，不会重复插入；重复运行安全。

- **重启后报 `failed to import` / 插件进入恢复模式？**
  先看报错指向哪个文件：
  - 软链断了（目标被移动/删除）→ 重新 `node scripts/install.mjs --source <仓库路径>`；
  - `package.json` 的 `exports` 与宿主期望不符或缺少入口 → 检查仓库 `package.json` 未被本地改动；
  - 临时把 patch 里那一块注释掉即可回到干净状态（备份文件就是为此准备的），
    然后带着报错文本回仓库排查，不要靠改 peerDependencies 硬闯。

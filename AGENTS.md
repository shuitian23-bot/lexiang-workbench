# 项目级维护规范

本项目服务 `https://leaibot.cn/`（生产正式版），前端静态页面位于 `/opt/projects/lexiang/public`。

> 注：2026-06-10 完成目录与域名归位后，本仓库（/opt/projects/lexiang，next 分支）即 leaibot.cn 正式版代码；
> new.leaibot.cn 由 /opt/projects/lexiang-new（main 分支）提供，是另一代代码线，两边不要混改。

## 必须读取的设计规范

在设计、修改、评审或发布 `leaibot.cn` 的页面样式、交互、组件、中文文案前，必须先读取并遵循（本仓库内路径）：

`/opt/projects/lexiang/.codex/skills/lenovo-leai-pc-design/SKILL.md`

按该 skill 的 workflow 继续读取相关引用文件，尤其是：

- `references/pc-design-system.md`
- `references/layout-rules.md`
- `references/component-patterns.md`
- `references/interaction-states.md`
- `references/content-voice.md`
- `references/real-pc-dialog-reference.md`
- `references/real-pc-dialog-states.md`
- `references/asset-inventory.md`

## 实施要求

- UI 必须使用联想乐享超级智能体 PC 端规范，不要自行引入不在规范内的主色、紫色渐变、玻璃拟态或营销页式大背景。
- 修改 `public/index.html` 或相关静态资源前，先对照 skill 中的色彩、字体、间距、圆角、导航、输入框、状态与中文文案规则。
- 线上发布前至少检查 `/`、`/shop-chat`、`/b-chat`、`/biz-chat` 四个路径。
- 如需替换静态页面，先备份 `/opt/projects/lexiang/public`。

## 版本管理与更新日志（强制，所有人 / 所有 AI session 适用）

线上更新日志页：`https://leaibot.cn/changelog.html`，数据源 `public/changelog.json`，页面自动渲染、无需重启服务。

**任何上线到 leaibot.cn 的改动（功能、页面、文案、数据、修复），发布后必须在 `public/changelog.json` 追加当日条目——不管改动出自哪个人、哪个 AI 工具/session。代他人补录也算数：发现已上线的改动没有记录，先补记再继续自己的工作。**

格式约定：

- `days` 数组按日期倒序（最新的一天在最前）。
- 当天（北京时间）已存在条目 → 在该天 `items` 末尾追加，编号由页面自动续接；新的一天 → 新建 `{ "date": "YYYY-MM-DD", "items": [...] }`，编号自动从 1 开始。
- **描述必须是不懂代码、不懂开发的人能看懂的大白话**：写「用户能感知到什么变了、对他有什么用」，不写文件名、函数名、技术词。仅影响内部运营的改动，句尾注明「（内部功能，不影响购物体验）」。
- **同一天内对同一功能块的多次迭代要合并展示**：当天已有该功能条目时，更新那条为最终状态，不要重复追加；重要新功能排前、修复类排后。
- **每条末尾署名改动人 + token**：格式「——观（约2万 token）」。本地开发者在 commit message 末尾附 `[tokens:12345]`（自己 AI 会话的消耗量），服务器自动解析进日志；服务器端 session 由 token-stats.js 自动计算。
- **每日自动合并**：当天最后一次提交或新一天首次提交时，当班 AI 主动按合并规则整理条目为最终状态（无需提醒）。
- **范围限定（强制）**：只记录乐享 POC 前台体验及直接配套内容；GEO 看板、workbench 通用后台、基础设施等不写入。
- changelog.json 的改动随当次代码提交一起 commit。

## 多人协作与防覆盖（强制）

**开工第一件事：确认你在自己的工作区，不在 `/opt/projects/lexiang`。**

```bash
pwd    # 必须是 /opt/wt/<你的名字>。是 /opt/projects/lexiang 就停下，先跑下面这条
cd /opt/projects/lexiang && scripts/dev-worktree.sh    # 零参数，名字取登录名、端口自动挑
cd /opt/wt/<你的名字> && ./run-dev                      # 起自己的实例，首次约 90s（加载 339M hnsw）
```

为什么强制：`/opt/projects/lexiang` 是 8 个人共用的一份文件。任何"整文件写入"——编辑器保存旧 buffer、AI 重写整文件、cp 部署——都会静默抹掉别人这期间的改动，**不报错、无冲突标记、git 也不知道**（因为改动没进 git）。这不是纪律问题：下面 5 条 + edit-lock 锁 + guard-markers 哨兵 + auto-checkpoint cron 四道机制都上过，覆盖照样发生。只要多人写同一个文件路径就必然发生，只能靠路径隔离消灭。

工作区共享同一个 `.git`，一份只占 230M；db / hnsw / uploads / node_modules 全部软链回生产，不复制。**注意软链的 db 是生产库**，要造脏数据先 `cp lexiang.db` 顶掉软链。

提交推自己的分支 `dev/<名字>`（上游是空的，`git push` 不带参数会安全报错，不会误推 main）。没有 GitHub key 也没关系——所有工作区共用一个 `.git`，在生产目录 `git merge dev/<名字>` 就能合，不需要先推远端。

不要再用 `cp -r` 复制整个项目当工作区（已有 `codex-lexiang`、`~wangyt50/lexiang`）。那样改动 merge 不回来，只能手工重敲成 `[同步prod xxx]` commit，还吃磁盘。

下面 5 条是**兜底**，只在还没建工作区、必须直接动生产目录时用：

1. git 唯一事实源：改完立即 commit+push；他人未提交改动先 `checkpoint:` 快照保护再开工。
2. 改共享热点文件（public/index.html、public/admin/*、server.js、core/*）前先 `scripts/edit-lock.sh claim <标识> <文件>`，BLOCKED 则先沟通；完工 release（锁 2 小时自动过期）。
3. 整文件覆盖（cp 部署/AI 重写）前必须 diff 现场 vs 编辑基线，不一致 = 有人并行改过 → 停止覆盖，对方改动入库后重取基线重放。
4. AI 编辑循环：取基线 → 编辑副本 → 部署前 diff 校验 → 覆盖 → commit+push → 释放锁。
5. 领域分工：前台 index.html / 后台 workbench 不跨域同时开工，跨域先打招呼。

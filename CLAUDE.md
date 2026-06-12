# 联想乐享（lexiang）— Claude Code 上手指南

> ⚠️ **2026-06-11 重要**：本文档前半部（目录地图/双AI架构/分屏/第十章「所有改动统一在 new 改」等）是**旧代码线的描述，已过时**——现 leaibot.cn 由本仓库 main 分支直接服务，前端已拆分为 public/index.html + css/main.css + js/portal.js + js/app.js，模型为火山 Ark。**以文末三个强制章节为准：「联想乐享 PC 端设计规范」「版本管理与更新日志」「多人协作与防覆盖」。**

> **生产**: https://leaibot.cn （leaiteam 服务器 `/opt/projects/lexiang`，PM2 进程 `lexiang`，端口 `:3001`）
> **业务**: 联想官方 B 端 AI 购物助手 — 商品导购、企业方案、订单售后、门店查询
> **Stack**: Node.js + Express + SQLite + dashscope (qwen) + 联想 AIGC 代理

---

## 一、目录地图

```
lexiang/
├── server.js              入口
├── core/
│   ├── agent.js           自研 AI 主流程（runAgent / runAgentStream，tool_calls 框架）
│   ├── skill-registry.js  Harness 技能注册中心，自动扫 skills/*.js
│   ├── memory.js          用户记忆 / 跨会话上下文
│   ├── compressor.js      长对话压缩
│   ├── reflector.js       AI 自我反思
│   ├── learner.js         经验积累
│   └── ...                evaluator/evolver/profiler/sandbox/sub_agents
├── routes/
│   ├── chat.js            自研 AI SSE 端点 /api/chat/stream
│   ├── leai.js            联想官方 AIGC 代理 /api/leai/*
│   ├── stores.js          百度地图门店查询 /api/stores/*
│   ├── auth.js            短信登录 / session
│   ├── harness.js         后台 workbench AI 控制台
│   ├── admin.js           管理面板
│   ├── knowledge.js       知识库 CRUD
│   └── ...
├── skills/                AI 工具（自动扫描注册到 LLM tool_calls）
│   ├── product_query.js   商品查询
│   ├── product_recommend.js
│   ├── knowledge_search.js
│   ├── frontend_navigate.js  ★ 控制 leaibot.cn 主页 landing 滚动
│   ├── page_navigate.js   ★ 控制后台 workbench 页面跳转（与上者不同）
│   ├── calculator.js / code_runner.js / web_search.js / ...
│   └── 共 15 个 skills
├── public/
│   ├── index.html         ★ leaibot.cn 主页 SPA（2700+ 行）
│   ├── split-layout.css   ★ PC 左右分屏样式
│   ├── split-layout.js    ★ PC 分屏逻辑（拖拽/换位/AI 导航）
│   ├── share.html         分享链接落地页
│   └── admin/             后台 workbench
├── db/                    SQLite schema
├── knowledge/             RAG 文档
└── lexiang.db             生产 SQLite（不入库）
```

---

## 二、双 AI 架构（关键！）

主页同时存在两套 chat：

| 端点 | 走向 | 模型 | 用途 |
|---|---|---|---|
| `/api/chat/stream` | `core/agent.js` runAgent | dashscope qwen-plus | **自研**，可控，支持 tool_calls / RAG / 反思 |
| `/api/leai/chat` | 联想 `aigc.lenovo.com.cn` 代理 | 联想官方模型 | 透传，不可控，仅做 A/B 对比展示 |

**默认走自研**。前端 `leaiCompare = false` 时只调自研；为 true 时双发并排显示（对比模式）。

> Tip: 想加 AI 能力，**改 skills/ 或 core/agent.js**，别去碰 leai.js（透传不可控）。

---

## 三、自研 AI 流程（runAgentStream）

```
用户消息
  ↓
core/agent.js runAgentStream
  ├── 检索知识库 (RAG, 79780 条向量)
  ├── 拼 system prompt + 历史 + 用户消息
  ├── callLLMStream (dashscope qwen, tools=skill-registry)
  ├── 流式 onChunk → SSE event:chunk
  ├── 若 finish_reason=tool_calls:
  │     ├── registry.execute(tool, input)
  │     ├── onStatus({type:'tool_done', name, success, result})
  │     └── 把 tool_result 喂回 LLM 下一轮
  └── onDone / onSuggestions
```

**SSE 事件协议**（`routes/chat.js` 发，`public/index.html` 解析）：

| event | data | 用途 |
|---|---|---|
| chunk | `{text}` | 流式文本 |
| status | `{type, name?, success?}` | RAG / 工具调用进度 |
| thinking / think_end | 思考块 | qwq-plus 推理过程 |
| products | `{products:[...]}` | 商品卡片 |
| nav | `{target}` | ★ AI 控制 landing 滚动（split-layout 加的） |
| done / suggestions | 收尾 |
| error | `{message}` |

---

## 四、PC 左右分屏（最近改动）

**触发条件**: viewport ≥ 769px（移动端不动，走原 `is-chat` 切换）

**首屏**: 仅 landing 全宽，splitter + chatApp 隐藏
**首次发送** (`startChat / quickAsk / openChatFresh / heroSend / findNearbyStores` 任一): 加 `html.chat-revealed` class → splitter + chatApp 滑出
**布局**: landing (calc% - 3px) | splitter 6px | chatApp (flex:1)
**localStorage key**: `lexiang.splitLayout.v1` 存 `{leftPct, swapped}`

**AI 控制 landing**:
- LLM 调 `frontend_navigate(target)` skill
- `core/agent.js` onStatus 把 result 透传
- `routes/chat.js` 拦 `result.action==='frontend_navigate'` → SSE `event:nav`
- `public/split-layout.js` `__navigateLandingTo(target)` 滚动 + nav-flash 高亮

**链接预览**: 分屏下覆盖在左侧 `#leftPreviewPanel`（z-index 200，盖过 landing nav z:100），原 chat 内 `.preview-panel` 强制 hide。`/api/preview?url=` 后端 proxy 绕 X-Frame-Options。

---

## 五、本地开发

```bash
git clone https://github.com/shuitian23-bot/lexiang-workbench.git
cd lexiang-workbench
pnpm install   # 或 npm
cp .env.example .env       # 填 DASHSCOPE_API_KEY / BAIDU_MAP_KEY 等
pnpm start                  # 跑 server.js 监听 :3001
```

环境变量（`.env`）:
- `DASHSCOPE_API_KEY` — 自研 AI 必填
- `BAIDU_MAP_KEY` — 门店查询用
- `LEAI_*` — 联想官方代理密钥
- `SMS_*` — 短信登录

---

## 六、生产部署

```bash
# 改完本地 → push → leaiteam 自动部署
git push origin main
# cron 1 分钟内自动 pull + reload
# 看日志
ssh leaiteam "sudo pm2 logs lexiang --lines 50"
```

**生产 PM2 进程**：leaiteam root 用户下的 `lexiang`。回滚：`git revert HEAD && git push`，等 cron 自动部署，或手动 `ssh leaiteam "cd /opt/projects/lexiang && git pull && sudo pm2 reload lexiang"`。

数据库 `lexiang.db` 是 SQLite WAL 模式，改 schema 走 `db/migrations/`。

---

## 七、协作约定

1. **不直接推 main**，开 feature 分支 → PR → review → merge
2. 改 `public/index.html` 前先 `cp index.html index.html.bak-$(date +%Y%m%d)` 保险
3. PM2 reload 前确认改的是 `pm_id=9 lexiang`，别误碰 `lexiang-shop / lenovo-shop` 等同名进程
4. 移动端兼容：任何分屏改动 must 在 `@media (max-width: 768px)` 退化到原逻辑
5. AI tool 加新的 → 放 `skills/` 即可，自动扫描注册

---

## 八、常见任务清单

| 任务 | 入口 |
|---|---|
| 新加 AI 能力 | `skills/<name>.js` 实现 `{name, description, parameters, execute}` |
| 改 chat 流式渲染 | `public/index.html` 搜 `lastEvent === 'chunk'` |
| 改 landing 板块 | `public/index.html` 行 565+ `<div id="landingPage">` |
| 加新 SSE 事件 | `routes/chat.js` `onStatus/onXxx` callback |
| 调 prompt | `core/agent.js` `getSystemPrompt / buildSystemPrompt` |
| 加路由 | `routes/<name>.js` + `server.js` 挂载 |

---

## 九、最近 commit 重点

- `da7eaa0` PC 导购预算解析修复：支持 5000元以内 / 5千以内 / 区间价，不再混入超预算商品
- `0f9bc1a` PC 分屏导航与首页状态收口：logo、导航高亮、回首页状态复位
- `263744a` PC 左右分屏 + AI 控制 landing 导航（本次）
- `3af9328` wiki-shop 子站
- `1f9f14e` GEO 看板优化
- `29c7ce8` product_recommend 改用 products 表实时数据
- `293f555` 右侧预览面板（旧逻辑，分屏后已被 split-layout.js 接管）

完整历史 `git log --oneline | head -30`。

---

## 十、团队协作约定（**所有人/所有 AI 必读**）

### 部署架构（2026-05-10 起）

- **生产**: leaiteam 服务器 `/opt/projects/lexiang`（不是 singapore 了）
- **域名**: leaibot.cn + 8 个二级域名 wiki/leai/ai/biz/b/admin/shop/www，全 HTTPS
- **进程**: PM2 fork mode，端口 3001
- **自动部署**: cron 每分钟 `git pull origin main && pm2 reload lexiang`（带 `--is-ancestor` 防循环）
- **每日备份**: 03:00 sqlite3 .backup → /opt/backups/lexiang/（保留 30 天）

### 改代码必须 commit + push（**强制**）

不管你用 Claude / GLM / Kimi / Sonnet，每次改完代码：

```bash
git add -A
git commit -m "feat|fix|chore|docs: 简短描述"
git push origin main
# cron 1 分钟内自动 pull + reload
```

**为什么**：cron 自动部署依赖 GitHub main 是最新。如果你只改不 commit，部署机制会卡住别人的改动。

**Commit message 格式**（Conventional Commits）：
- `feat:` 新功能
- `fix:` 修 bug
- `chore:` 杂事（依赖升级、配置）
- `docs:` 改文档
- `refactor:` 重构（功能不变）

### 紧急小调整可以直接改

改 CSS 颜色、文案、配置数值这种 1 分钟修复：
- 直接 vim 改 + 保存（前端文件即生效）
- 改完**当天必须 commit + push**，别养成漂着不 push 的坏习惯

### 后端代码必须 reload

改 `server.js` / `routes/` / `skills/` / `core/` / `db/` 后：
```bash
sudo pm2 reload lexiang
```
（如果你 push 了，cron 会自动 reload，不用手动）

### 所有改动统一在 new 改（**强制**，2026-05-26 起）

- **任何代码改动（前端 / 后端 / 后台 workbench）都在 `new` 改**：`/opt/projects/lexiang-new`（next 分支，new.leaibot.cn），改完 `commit + push origin next`，验证 OK 再同步到 prod。
- **禁止在 prod 工作树（`/opt/projects/lexiang`）裸改不提交**。prod 漂着未提交 WIP → 别人/AI 同步时拿不到、两边持续漂移、cron 自动部署被卡。
- **后台 workbench 同理**：在 `new.leaibot.cn/admin/workbench.html` 改 + commit push，不要直接改 prod 后台（new 已是 prod 后台的完整快照）。
- **prod 只接收同步过来的 commit**（cherry-pick / pull），不在 prod 上手改代码。
- 例外：CSS 颜色/文案这种 1 分钟改也尽量走 new；真要在 prod 救急，**当天必须 commit + push**。

### 多人协作防冲突

改之前先拉：
```bash
cd /opt/projects/lexiang
git pull origin main           # 先拉别人改动
# 然后改 + commit + push
```

push 失败 `rejected`：
```bash
git pull --rebase origin main  # rebase 别人改动到你之上
# 解冲突后
git push origin main
```

### 端口约定

| 用途 | 端口 |
|---|---|
| **生产** /opt/projects/lexiang | 3001 |
| baiyu 个人 dev ~/lexiang | 3002 |
| guanjf2（观）个人 dev ~/lexiang | 3011 |

### Backup 紧急恢复

```bash
# 列 backup
ls -lt /opt/backups/lexiang/ | head -5
# 恢复某个时间点（先 stop pm2）
sudo pm2 stop lexiang
sudo rm /opt/projects/lexiang/lexiang.db /opt/projects/lexiang/lexiang.db-wal /opt/projects/lexiang/lexiang.db-shm
gunzip -c /opt/backups/lexiang/lexiang_YYYYMMDD_HHMMSS.db.gz > /opt/projects/lexiang/lexiang.db
sudo chown ubuntu:dev /opt/projects/lexiang/lexiang.db
sudo pm2 start lexiang
```

---

## 联想乐享 PC 端设计规范（必须读取）

维护 `https://leaibot.cn/`、`public/index.html`、`public/assets/` 或任意 PC 端页面样式/交互/中文文案前，必须先读取（本仓库内路径）：

`/opt/projects/lexiang/.codex/skills/lenovo-leai-pc-design/SKILL.md`

并按该 skill 的 workflow 继续读取：

- `references/pc-design-system.md`
- `references/layout-rules.md`
- `references/component-patterns.md`
- `references/interaction-states.md`
- `references/content-voice.md`
- `references/real-pc-dialog-reference.md`
- `references/real-pc-dialog-states.md`
- `references/asset-inventory.md`

设计与实现必须优先遵循联想乐享超级智能体 PC 端规范。不要新增未在规范内定义的主色、紫色渐变、玻璃拟态、营销页式大背景或不符合 PC 助手工作台定位的组件。

---

## 版本管理与更新日志（强制，所有人 / 所有 AI session 适用）

线上有「更新日志」页面：`https://leaibot.cn/changelog.html`，数据源是 `public/changelog.json`，页面自动渲染、无需重启服务。

**规则：任何上线到 leaibot.cn 的改动（功能、页面、文案、数据、修复），发布后必须在 `public/changelog.json` 追加当日条目——不管改动出自哪个人、哪个 AI 工具/session。代他人补录也算数：如果发现已上线的改动没有记录，先补记再继续自己的工作。**

格式约定：

- `days` 数组按日期倒序（最新的一天在最前）。
- 当天（北京时间）已存在条目 → 在该天的 `items` 末尾追加，编号由页面自动续接；新的一天 → 新建 `{ "date": "YYYY-MM-DD", "items": [...] }`，编号自动从 1 开始。
- **描述必须是不懂代码、不懂开发的人能看懂的大白话**：写「用户能感知到什么变了、对他有什么用」，不写文件名、函数名、技术词。仅影响内部运营的改动，句尾注明「（内部功能，不影响购物体验）」。
- 例：「商品详情页新增『适合你』推荐理由：会根据你聊过的需求，用一句话告诉你这款为什么适合你。」
- **同一天内对同一功能块的多次迭代要合并展示**：不要每改一次就追加一条；当天已有该功能的条目时，更新那条描述为最终状态（中途的反复修正不必让用户看到）。重要新功能排前、修复类排后。
- **每条末尾署名改动人 + token 消耗**：格式「——白羽（约1.2万 token）」。token 口径=该功能 AI 会话的生成量。白羽侧由 scripts/token-stats.js 按提交时间窗自动计算；**观侧（或任何本地开发者）在 commit message 末尾附 `[tokens:12345]`**（自己会话统计的数字），auto-changelog 会自动解析写入日志。
- **每日自动合并**：当天最后一次提交（或新一天首次提交）时，当班 AI 必须主动按上述合并规则整理前一日/当日全部条目为最终状态视图（无需用户提醒），保持每天 15-25 条以内。
- **范围限定（强制）**：更新日志只记录乐享 POC（leaibot.cn 前台体验）及其直接配套（如 ops-lite 运营配置）的内容。GEO 看板、workbench 通用后台、基础设施/脚本/文档等一律不写入，即使是本仓库的提交。
- **自动补录兜底**：cron 每 10 分钟跑 scripts/auto-changelog.js——动了乐享前台但提交里没带 changelog.json 的，自动用 LLM 生成大白话条目并按提交人署名补录。所以忘了记也会被补上，但自动生成的不如手写准确，仍要求每次提交自带日志。
- changelog.json 的改动随当次代码提交一起 commit。

---

## 多人协作与防覆盖（强制，所有人 / 所有 AI session 适用）

多人 + 多 AI session 共改一个仓库，已发生多次互相覆盖事故（2026-06-11 又一起）。以下规则强制执行：

1. **git 是唯一事实源**：改动完成立即 commit + push，禁止改完不提交长期裸奔在工作区。开工前发现他人有未提交改动 → 先 `git add` + `checkpoint:` 快照提交保护起来，再开自己的工。
2. **编辑互斥锁**：修改共享热点文件（`public/index.html`、`public/css/main.css`、`public/js/portal.js`、`public/js/app.js`、`public/admin/*`、`server.js`、`core/*`）之前，先执行 `scripts/edit-lock.sh claim <你的标识> <文件>`。提示 BLOCKED 说明有人正在改 → 先沟通，不要硬改。完工后 `release`。锁超 2 小时自动过期。
   > 2026-06-11 起前台单文件已拆分：样式在 `public/css/main.css`，首页脚本在 `public/js/portal.js`，应用主逻辑在 `public/js/app.js`，`index.html` 只剩标记结构——改样式/逻辑请去对应文件，冲突面大幅缩小。js/css 已设为协商缓存，改完即生效无需担心浏览器缓存。
3. **覆盖前乐观锁检查**：任何「整文件覆盖」式写入（cp 部署、脚本生成、AI 重写整文件）之前，必须 diff 当前线上文件与你开始编辑时的基线副本；不一致 = 有人并行改过 → **停止覆盖**，先把对方改动 checkpoint 入库，重新取基线把自己的改动重放上去，再部署。
4. **AI session 标准编辑循环**：取基线（cp 现场文件 → 工作副本）→ 编辑工作副本 → 部署前 diff 基线 vs 现场（变了回到上一步）→ 覆盖部署 → 立即 commit + push → release 锁。
5. **领域分工**：前台 `public/index.html` 与后台 `public/admin/*` 尽量不跨域同时开工；需要跨域改动先在群里说一声。


# 联想乐享（lexiang）— Claude Code 上手指南

> **生产**: https://leaibot.cn （新加坡服务器 `/root/lexiang`，PM2 进程 `lexiang`，端口 `:3001`）
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
# 改完本地 → push → 服务器拉
git push origin main
ssh singapore "cd /root/lexiang && git pull && pm2 reload lexiang"
# 看日志
ssh singapore "pm2 logs lexiang --lines 50"
```

**生产 PM2 进程 id 9**。回滚：`git revert HEAD && git push && pm2 reload`。

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

- `263744a` PC 左右分屏 + AI 控制 landing 导航（本次）
- `3af9328` wiki-shop 子站
- `1f9f14e` GEO 看板优化
- `29c7ce8` product_recommend 改用 products 表实时数据
- `293f555` 右侧预览面板（旧逻辑，分屏后已被 split-layout.js 接管）

完整历史 `git log --oneline | head -30`。

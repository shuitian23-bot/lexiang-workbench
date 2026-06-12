---
name: lexiang-dev
description: lexiang 本地开发环境搭建、目录地图、常见任务入口清单。起本地环境/找代码入口/新加功能时读。
---

# lexiang 本地开发

> ⚠️ 目录地图为 06-11 前快照，前端已拆分为 `public/index.html`（仅结构）+ `css/main.css` + `js/portal.js`（首页）+ `js/app.js`（应用主逻辑），LLM 已切火山引擎 Ark。以现码为准。

## 本地起服务

```bash
git clone https://github.com/shuitian23-bot/lexiang-workbench.git
cd lexiang-workbench
pnpm install            # 或 npm
cp .env.example .env    # 填密钥
pnpm start              # server.js 监听 :3001
```

环境变量（`.env`）：LLM 密钥（火山 Ark）、`BAIDU_MAP_KEY`（门店查询）、`LEAI_*`（联想官方代理）、`SMS_*`（短信登录）。

## 端口约定

| 用途 | 端口 |
|---|---|
| 生产 /opt/projects/lexiang | 3001 |
| baiyu 个人 dev ~/lexiang | 3002 |
| guanjf2（观）个人 dev ~/lexiang | 3011 |

## 目录地图

```
lexiang/
├── server.js              入口
├── core/
│   ├── agent.js           自研 AI 主流程（runAgent / runAgentStream，tool_calls 框架）
│   ├── skill-registry.js  AI 技能注册中心，自动扫 skills/*.js
│   ├── memory.js          用户记忆 / 跨会话上下文
│   └── ...                compressor/reflector/learner/evaluator/sandbox 等
├── routes/
│   ├── chat.js            自研 AI SSE 端点 /api/chat/stream
│   ├── leai.js            联想官方 AIGC 代理 /api/leai/*
│   ├── stores.js          百度地图门店查询
│   ├── auth.js            短信登录 / session
│   ├── admin.js           管理面板；harness.js 后台 workbench；knowledge.js 知识库
│   └── ...
├── skills/                AI 工具（自动扫描注册到 LLM tool_calls，15+ 个）
├── public/
│   ├── index.html         主页 SPA 结构
│   ├── css/main.css       样式
│   ├── js/portal.js       首页脚本；js/app.js 应用主逻辑
│   ├── share.html         分享落地页；admin/ 后台 workbench
│   ├── changelog.json     更新日志数据源
├── db/                    SQLite schema 与 migrations
├── knowledge/             RAG 文档
└── lexiang.db             生产 SQLite（不入库）
```

## 常见任务入口

| 任务 | 入口 |
|---|---|
| 新加 AI 能力 | `skills/<name>.js` 实现 `{name, description, parameters, execute}`，自动注册 |
| 改 chat 流式渲染 | `public/js/app.js` 搜 SSE chunk 处理 |
| 改 landing 板块 | `public/index.html` + `public/js/portal.js` |
| 加新 SSE 事件 | `routes/chat.js` `onStatus/onXxx` callback |
| 调 prompt | `core/agent.js` `getSystemPrompt / buildSystemPrompt` |
| 加路由 | `routes/<name>.js` + `server.js` 挂载 |

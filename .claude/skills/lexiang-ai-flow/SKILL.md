---
name: lexiang-ai-flow
description: lexiang 双 AI 架构与自研 runAgentStream 流程、SSE 事件协议。改 AI 对话流程/加 SSE 事件/调 skills 时必读。
---

# lexiang AI 流程

> ⚠️ 06-11 前快照：LLM 已从 dashscope qwen 切到火山引擎 Ark（deepseek-v4-pro/flash 分场景），流程框架不变，模型细节以 `core/agent.js` 现码为准。

## 双 AI 架构（关键）

主页同时存在两套 chat：

| 端点 | 走向 | 模型 | 用途 |
|---|---|---|---|
| `/api/chat/stream` | `core/agent.js` runAgent | 火山 Ark | **自研**，可控，tool_calls / RAG / 反思 |
| `/api/leai/chat` | 联想 `aigc.lenovo.com.cn` 代理 | 联想官方模型 | 透传不可控，仅 A/B 对比展示 |

**默认走自研**。想加 AI 能力改 `skills/` 或 `core/agent.js`，**别碰 leai.js**（透传不可控）。

## runAgentStream 流程

```
用户消息
  ↓
core/agent.js runAgentStream
  ├── 检索知识库 (RAG, ~8万条向量)
  ├── 拼 system prompt + 历史 + 用户消息
  ├── callLLMStream (tools=skill-registry)
  ├── 流式 onChunk → SSE event:chunk
  ├── 若 finish_reason=tool_calls:
  │     ├── registry.execute(tool, input)
  │     ├── onStatus({type:'tool_done', name, success, result})
  │     └── tool_result 喂回 LLM 下一轮
  └── onDone / onSuggestions
```

## SSE 事件协议

`routes/chat.js` 发，前端 `public/js/app.js` 解析：

| event | data | 用途 |
|---|---|---|
| chunk | `{text}` | 流式文本 |
| status | `{type, name?, success?}` | RAG / 工具调用进度 |
| thinking / think_end | 思考块 | 推理过程展示 |
| products | `{products:[...]}` | 商品卡片 |
| nav | `{target}` | AI 控制 landing 滚动 |
| done / suggestions | 收尾 |
| error | `{message}` |

加新 SSE 事件：`routes/chat.js` 加 callback → 前端 `app.js` 加对应 event 处理。

## 两个易混 skill

- `frontend_navigate.js` — 控制 leaibot.cn 主页 landing 滚动
- `page_navigate.js` — 控制后台 workbench 页面跳转，两者不同

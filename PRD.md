# 联想乐享（leaibot）产品需求文档（PRD）

> 版本：v1.0（依据现有代码逆向梳理）
> 范围：leaibot.cn 联想官方 B 端 AI 购物助手（POC 体验验证版，仅 PC 端为主）
> 维护：所有改动在 `new`（next 分支 / new.leaibot.cn）验证后同步 prod，详见 CLAUDE.md 协作约定

---

## 一、产品概述

### 1.1 定位
联想官方商城的 **AI 原生购物助手**。以"对话即导购"为核心，把传统电商的浏览-搜索-比价-下单流程，重构成"用户一句话 → AI 理解意图 → 右侧实时展开对应网页（商品/对比/方案/门店等）"的双栏体验。不是在商城里塞一个客服机器人，而是 **AI 驱动整个购物界面**。

### 1.2 目标用户（按子站划分）
| 子站 | 标识 | 人群 | 主打 |
|---|---|---|---|
| 个人及家庭 | `shop` | C 端消费者、学生 | 小新 / 拯救者 / YOGA / 手机平板配件 |
| 中小企业 | `b` | 中小企业采购 | ThinkPad / ThinkBook / 打印外设，批采返点、专票、5 年质保 |
| 政教及大企业 | `biz` | 政企、教育、大客户 | 服务器 / 工作站 / 信创合规、招投标、等保国密 |
| 聚合首页 | `default` | 全部 | 全品类入口 |

### 1.3 核心价值
- **降低决策成本**：AI 结合用户画像做千人千面推荐、适配理由、快捷追问。
- **所见即所得**：对话与内容面板联动，推商品/对比/方案即时在右侧成可交互网页。
- **全链路覆盖**：导购、定制、以旧换新、批量采购、信创合规、售后、门店预约、会员，一站完成。

### 1.4 形态
- 主战场 **PC 端左右分屏**（≥769px）：左聊天 + 右内容面板（多标签）。
- 移动端退化为传统单栏 chat（不做分屏，POC 不重点投入移动/埋点/SEO）。

---

## 二、整体架构

### 2.1 技术栈
- 后端：Node.js + Express + SQLite（WAL）
- LLM：**火山引擎 Ark**（OpenAI 兼容，host `ark.cn-beijing.volces.com`，path `/api/coding/v3/chat/completions`），分场景模型：
  - 主入口/多模态：`doubao-seed-2.0-pro`
  - 快速场景（意图分类/划词/Pointer/后台/快答）：`doubao-seed-2.0-lite`
  - 默认关闭深度思考（`thinking:{type:'disabled'}`），仅用户显式开启才思考
- 前端：原生 SPA（`public/index.html` + `split-layout.js` + `split-layout.css`），无框架
- 检索：本地向量库（~8 万条 chunk）+ SQLite FTS

### 2.2 双 AI 通道
| 端点 | 走向 | 用途 |
|---|---|---|
| `/api/chat/stream` | `core/agent.js` runAgentStream（自研，可控，RAG + tool_calls + 反思） | **默认主通道** |
| `/api/chat/quick` | lite 模型，跳过 RAG/工具/dispatcher，纯流式直答 | 划词临时气泡等极速场景 |
| `/api/leai/chat` | 透传联想官方 AIGC 代理 | 仅 A/B 对比展示，不可控 |

### 2.3 双环境部署
| 环境 | 路径 | 分支 | 域名 | 端口 | 进程 |
|---|---|---|---|---|---|
| 生产 prod | `/opt/projects/lexiang` | main | leaibot.cn | 3001 | pm2 `lexiang` |
| 预发 new | `/opt/projects/lexiang-new` | next | new.leaibot.cn | 3010 | pm2 `lexiang-new` |

- 自动部署：cron 每分钟 `git pull + pm2 reload`
- 流程铁律：**new 改 → 验证 → 同步 prod**，prod 不裸改
- 数据/密钥：各自独立 `lexiang.db` + `.env`（ark key 一致）

---

## 三、核心交互框架

### 3.1 PC 分屏状态机（split-layout.js）
三态：
1. **首屏门户**：`#landingPage` 全宽，无聊天。
2. **全宽对话**（`html.in-chat`）：首次发送后 chatApp 居中全宽（max 900px）。
3. **分屏对话**（`html.in-chat.content-open`）：左聊天 + 右内容面板。AI 触发内容（商品/对比/方案等）或用户点商品卡时进入。

辅助态：`landing-collapsed`（收起右侧留纯聊天）、`layout-swapped`（左右换位）、`content-maximized`。
顶部统一控制条 `#splitControls`：`新建 | 换位 | 收起/展开(»↔«) | 关闭 | ☰菜单`，拖拽分隔条调宽度（localStorage 记忆 leftPct/swapped）。

### 3.2 内容面板标签系统（content panel tabs）
右侧多标签，13 类渲染器（`RENDERERS.*`）：

| 类型 | 内容 | 复用规则 |
|---|---|---|
| `sitehome` | 子站轻量首页（banner + 热销 grid） | 按 site，每子站独立 tab |
| `products` | 商品列表 grid | 按 category / title |
| `productDetail` | 商品详情（图/参数/适配理由/找相似/加购购买/评价） | 按 sku |
| `compare` | 参数对比表 | 同类复用 |
| `info` | 通用信息卡（服务/品牌/合作伙伴/订单确认等） | 按 title |
| `member` `coupon` `tradein` `customize` `stores` `form` `home` `preview` | 会员/优惠券/以旧换新/定制/门店/表单/首页/网页预览 | 同类复用 |

标签上限 5（home 常驻，超出驱逐最旧非 home）；支持拖拽换序、关闭。

### 3.3 SSE 流式协议（routes/chat.js ↔ index.html）
| event | data | 行为 |
|---|---|---|
| `chunk` | `{text}` | 流式正文 |
| `thinking`/`think_end` | 思考块 | 深度思考过程 |
| `status` | `{type,name,success}` | RAG/工具进度 |
| `products` | `{products}` | chat 插卡 **+ 右侧 openContent('products')** |
| `display` | `{title,products}` | 右侧展示（即时 send，不等答完）|
| `solutions` | `{solutions}` | 方案卡 |
| `compare` | `{products}` | 右侧对比表 |
| `stores` | `{stores,perks}` | 门店 + 预约 |
| `modal` | 弹层 | 抢购/确认等 |
| `nav` | `{target}` | AI 控制 landing 滚动高亮 |
| `suggestions` | 追问 chip | |
| `done`/`error` | 收尾 | |

重内容（商品/筛选/方案/门店）即时 send，右侧标签与左侧文字同步出现，消除等待延迟。

### 3.4 子站体系
- URL：`/`（聚合）`/shop-chat/` `/b-chat/` `/biz-chat/`；带会话 `/{site}-chat/{convId}`。
- 切站：有会话时 **SPA 切**（不刷新）——更新 `_siteType` + nav 高亮 + 重渲 landing（hero/mall/feed/subnav）+ 注入"已切换子站"提示 + 该子站推荐 chip + 右侧开/切该子站 `sitehome` 标签；无会话整页跳转。
- 商品按子站归类规则（`siteWhereClause`）：笔记本/台式机靠机型系列名归子站（小新/拯救者=shop，ThinkPad/开天=b，服务器/工作站=biz）。

---

## 四、AI 能力中枢（core/）

### 4.1 主流程 runAgentStream（agent.js）
用户消息 → RAG 检索（~8 万向量）→ 拼 system prompt（DB `bot_config.system_prompt_zh`，含子站语境、5s 缓存）+ 历史 → 流式 LLM（带 skill tools）→ 若 `tool_calls` 则执行 skill 并回灌下一轮 → onChunk/onStatus/onSuggestions。

### 4.2 技能注册中心（skill-registry.js，39 skills 自动扫描）
- **前端控制**：`frontend_display`（推商品到右侧）、`frontend_filter`（筛选）、`frontend_navigate`（控制 landing 滚动）、`frontend_customize`、`frontend_modal`、`page_navigate`（后台）
- **商品**：`product_query` `product_recommend` `solution_recommend` `showcase_template`
- **营销/转化**：`coupon_recommend` `benefit_orchestrator` `marketing_create` `live_schedule`
- **企业**：`bulk_purchase_quote` `enterprise_invoice` `tender_bid` `compliance_consult` `lead_collect`
- **售后/服务**：`warranty_check` `value_added_service` `tradein_estimate` `contact_service` `store_finder` `member_status`
- **知识**：`knowledge_rag` `knowledge_create`
- **运营/后台**：`product_create` `product_manage` `data_export` `lexiang_*`（classify/filter/intent/pipeline）、`pipeline_update_rules`
- **通用**：`calculator` `code_runner` `web_search` `task_planner`

### 4.3 调度与子智能体（dispatcher.js + sub_agents/）
短查询经 `intent_classifier`（lite）+ `dispatcher` 路由到子智能体：`faq_agent` / `support_agent` / `product_advisor`（均流式、禁客套开场）。

### 4.4 自进化体系
`memory`（跨会话用户记忆）、`profiler`（用户画像，供千人千面）、`compressor`（长对话压缩）、`reflector`（自我反思）、`learner`/`experience`（经验积累）、`evaluator`/`evolver`（评估进化）、`planner`、`monitor`、`sandbox`。

### 4.5 千人千面
- 商详「✨ 适合你」适配理由：`/api/products/:sku/reason`（lite + 用户画像 → ≤40 字一句话）
- Pointer 提示、划词简答均结合画像。

---

## 五、C 端功能模块

### 5.1 导购对话（主入口）
- 输入区：深度思考开关、联网搜索开关、图片上传、（音频）、@引用、发送。
- 多模态：图文（VL 模型）、音频转写分析。
- 对比模式：`leaiCompare` 开时自研 + 联想官方双发并排。
- 欢迎屏：6 个场景示例卡（多任务/CTO 定制/以旧换新/门店/信创/批量），首次发送自动消失。

### 5.2 商品推荐与右侧联动
- AI 推商品 → chat 内卡片 **+ 右侧 content tab 同步出现**（不论是否调 frontend_display）。
- 商品卡可点进详情、加对比、加购。

### 5.3 商品详情（productDetail）
- 大图 + 名 + 价 + 规格 + **千人千面适配理由** + **找相似**（同子站隔离，不串企业/消费）+ 用户评价区 + `🛒加入购物车` + `🎁一键领取优惠/立即下单`。

### 5.4 商品对比（compare）
- 白名单中文参数表（处理器/显卡/内存/存储/屏/分辨率/刷新率/电池/接口/无线/重量/系统/保修/定位/人群），差异高亮，去除内部英文字段与"数据源"行。
- 操作列：`🛒加购` + `立即购买`。

### 5.5 子站首页（sitehome）
- 每子站独立轻量首页 tab（主题 banner + 热销商品 grid），切站新建/已开切换，多 tab 并存。

### 5.6 客服与人工
- 副导航「客服」按钮 → inline AI 气泡（电话/工作时间/转人工，子站差异化电话）。
- 「进入人工」→ 副导航切人工模式菜单（退出/订单/图片/评价，退出按钮橙色），后端注入"客服小李"人设、口语化不暴露 AI。

### 5.7 营销转化
- **秒杀**：抢购 modal（库存倒计时、70% 进度 mock）；「更多秒杀」开全场 tab。
- **企业新人专享**：领券 toast + 开商品详情 tab。
- 优惠券（coupon tab）、国补教育特惠、乐豆商城、惠豆金。
- lxHint 情境转化条（chip 形式 + `config/lxhint.json` 开关）。

### 5.8 顶部导航全局入口
- 主导航：首页 / 个人及家庭 / 中小企业 / 政教及大企业。
- 次级（全子站）：**品牌**（联想品牌矩阵）、**合作伙伴**（芯片/渠道/生态）、服务、门店、会员 —— 点击开 content tab（非 quickAsk）。

### 5.9 企业/政企能力
CTO 定制（选配+刻字+礼盒）、以旧换新（旧机抵扣估价）、批量采购（阶梯价+留资）、信创合规（国产 OS 适配/涉密资质）、增值税专票、招投标支持、增值服务。

### 5.10 创新交互
- **划词提问**：选中 landing/内容面板正文 → 浮窗「问乐享」（独立临时气泡走 `/api/chat/quick` 极速直答，≤100 字结合偏好）/「带入对话」。
- **@引用**：输入框打 `@` → 选历史消息（我/乐享）作上下文 → ref chip（可删）→ 注入后端 prompt。
- **对话竖轴 timeline**：右侧轨道排布"打开过的网页标签历史"（pill 显商品名/标题），点击切到/重开那个网页 + 左侧聊天滚回打开时位置；当前激活高亮。
- **Pointer（AI 看）**：光标悬停商品/参数/评价 800ms → 火山 lite 出一句"比你想得更深一层"的促单提示（含数字/型号/钩子），5 分钟缓存，命中秒回。
- **AI 控制 landing**：LLM 调 `frontend_navigate` → 右侧首页滚动到对应板块并高亮。

---

## 六、B 端后台 workbench（admin/workbench.html）

| 模块 | 文件 | 职责 |
|---|---|---|
| AI 控制台 | workbench-ai.js + routes/harness.js | 后台 AI 助手（火山 lite），控制运营动作 |
| 数据看板 | workbench-data.js / -leai.js | 对话/商品数据分析 |
| GEO 看板 | workbench-geo.js + routes/geo-dashboard.js | 地域分析 |
| 质量分析 | workbench-quality.js | 回答质量评估 |
| Pipeline | workbench-pipeline.js + routes/pipeline.js + lexiang_pipeline | LLM 调用链路、规则更新（`pipeline_update_rules`） |
| 运营 | workbench-ops.js | 运营操作 |
| 页面管理 | workbench-pages.js | landing/内容配置 |
| 员工/贡献 | workbench-employee.js（lenovo_staff / workbench_contributions） | 员工与贡献统计 |
| 报表 | workbench-report.js | 报表导出 |
| 供应商 | routes/supplier.js | 供应商数据 |

配套：知识库 CRUD（routes/knowledge.js，docs/chunks/qa/fts/vectors）、商品管理（product_create/manage）、营销任务（marketing_tasks）、A/B 实验（ab_experiments/assignments）、短信登录（auth + sms）、wiki 自动化（每日 cron 刷新、规格抓补、飞书通知）。

---

## 七、数据模型（关键表）

- **商品**：`products`（sku/name/category/price/specs/image/status/stock）、`product_categories`、`product_detail_images`
- **会话**：`conversations`、`messages`、`conv_summaries`、`message_feedback`、`share_tokens`
- **用户**：`users`、`user_sessions`、`user_profiles`（画像）、`user_memories`、`personas`、`anon_uid_mapping`、`lenovo_staff`
- **知识**：`knowledge_docs/chunks/qa/vectors` + FTS 系列、`kg_entities`/`kg_relations`（知识图谱）
- **AI 自进化**：`experience_patterns` + FTS、`reflection_logs`、`regression_cases`、`metrics_snapshots`
- **运营**：`marketing_tasks`、`workbench_contributions`、`skills_config`、`bot_config`、`mcp_tools`、`upload_logs`、`fe_logs`/`embed_jobs`
- **实验/权限**：`ab_experiments/assignments`、`admin_users/roles`、`roles`

---

## 八、非功能需求

- **性能**：流式输出首字快；快速场景用 lite 模型；Pointer 5min 缓存；system prompt 5s 缓存；静态资源 7 天缓存（HTML 不缓存，dev 环境 JS/CSS 不缓存）。
- **鉴权**：短信登录 + session；匿名用户 `lexiang-uid` cookie；会话归属用统一 `getUid` 口径；后台 adminLimiter 限流 + admin_users/roles。
- **兼容**：PC 分屏（≥769px），移动端退化单栏；任何分屏改动须在 `@media(max-width:768px)` 降级。
- **部署/容灾**：cron 自动部署、03:00 SQLite 备份（保留 30 天）、优雅关闭。
- **协作**：所有改动 new 先行 + commit/push；prod 只接收同步 commit（CLAUDE.md）。

---

## 附录 A：SSE 事件总表
见 §3.3。

## 附录 B：内容标签类型
见 §3.2。

## 附录 C：术语
- **子站**：shop/b/biz/default 四套语境与商品集
- **content tab**：右侧内容面板的网页标签
- **sitehome**：子站轻量首页组件
- **Pointer / AI 看**：悬停提示
- **lxHint**：情境转化条
- **POC**：体验验证版，重交互/AI 体验，暂不做埋点/SEO/移动端深耕

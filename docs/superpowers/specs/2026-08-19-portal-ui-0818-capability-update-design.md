# 门户工作台 0818 设计基线与能力更新闭环设计

## 目标

在不改变工作台公共壳层、权限管理、右侧 Agent 和普通 Skill 生命周期的前提下，将项目设计治理基线升级到 `portal-workbench-ui-0818`，并补齐能力上下文受控更新 P0 中仍不完整的高风险暂不处理和多上下文更新指令。

## 执行基线

- 源码基线：GitLab `dev/zhangrui` 提交 `9585e3d`。
- 应用根目录：`vue-app/`。
- 设计基线：用户提供的 `portal-workbench-ui-0818.zip`。
- 产品基线：`portal-workbench-capability-context-controlled-update-product-plan-20260819.md`。

## 页面类型

- Skill Hub：T7 配置列表页，保留当前表格型信息架构。
- Skill 创建：T4 业务表单 + V2 Agent Domain 专项流程。
- 能力变化详情：Skill Hub 内 Overlay，主体为安全 Markdown 报告。

## 保护范围

本次不得修改：

- 左侧导航、Topbar、静态页签、AI 结果选择器。
- 右侧 Agent、消息、Composer、授权和队列行为。
- 权限管理页面及其审批、账号和数据范围逻辑。
- AI 报告卡与展开报告的既有产品规则，包括不显示“保存”。
- 普通 Skill 的创建、编辑、审批、发布和禁用状态机。
- `public/admin-vue/admin-runtime/workbench-geo.js`。
- `public/admin-vue/admin-runtime/workbench-pages.js`。

## 设计基线迁移

项目保留 `0803` 和 `0812` 历史 Skill 目录，只新增 `0818` 分发副本。`AGENTS.md`、`vue-app/design-baseline.lock.json` 和 `vue-app/design-skill.guard.json` 改为优先读取 0818。不得把 Skill 的 CSS 作为新的全局运行时样式导入产品。

0818 页面矩阵与视觉登记需要纳入当前已存在的路由：

- `lead.governmentPool`：`/lead/government-pool`，T2 长筛选列表。
- `order.agreement`：`/order/agreement`，T1 标准列表。
- `order.agreement.detail`：`/hidden/order/agreement-detail`，T4 详情/表单变体。
- `agent.permissions` 当前入口：`/agent/permissions/admin-cleanup-email`，T6 分栏设置专项。

0818 交互合同中报告卡“保存”的历史描述必须与已确认产品规则对齐为“下载和展开”，避免设计基线重新引入已删除行为。

## 能力更新状态

增强变化执行“忽略本次”后关闭当前变化记录。破坏性变化或权限变化执行“暂不处理”后：

- 不创建草稿，不改变绑定，不改变线上版本。
- 数据状态保持 `available`，处理结论记录为 `deferred`。
- Skill Hub 继续显示“高风险待处理”、查看变化和更新入口。
- 不重复显示“暂不处理”，但允许负责人稍后更新。
- 后续更高版本变化仍生成新变化记录。

## 多上下文更新指令

单上下文保持当前一句式指令。多个已绑定上下文同时变化时，第一条系统代填指令逐项列出：菜单路径、原版本和目标版本，然后追加统一业务变化摘要及更新约束。不能只取第一项。

## 交互约束

- 已绑定且发生变化的上下文自动升级到目标版本。
- 全新未绑定上下文仅显示“可选新增”，不得自动选择。
- 同一 `Skill ID + 变化记录 ID` 复用一个更新任务和编辑版本。
- 首轮澄清结果保存成功后才进入“更新编辑中”。
- 更新失败恢复原草稿并保留“有更新”重试入口。
- 待审批或待发布时不重复显示“更新处理中”。
- 已禁用摘要卡与能力更新筛选互不覆盖。

## 验收

- 高风险暂不处理后仍可在 Skill Hub 识别和继续更新。
- 多上下文 query 包含每个上下文的完整版本变化，单上下文文案不回归。
- 0818 Skill 校验能识别项目当前 38 个 pageId，不再报告上述路由缺失或漂移。
- 产品契约测试、能力更新测试、lint、typecheck、build 和 smoke 全部通过。
- 设计 Skill 不新增全局 CSS import，不修改封板区域。
- 只在隔离工作树提交任务文件，不部署 `new`、正式环境或推送 Git，除非用户另行确认。

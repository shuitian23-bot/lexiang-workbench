# 中间内容槽迁移计划

本文档记录 0702 Vue 项目的中间内容槽迁移计划。左侧导航、顶部区域、右侧 Agent 区已经是 Vue shell 边界；后续迁移只处理业务页中间内容槽。

## 当前基线

已进入 Vue route/page layer 的当前可见页面：

| 分组 | 页面 | 路由 | 组件 | 当前形态 |
|---|---|---|---|---|
| 首页 | 门户工作台 | `/portal/home` | `src/views/PortalHomeView.vue` | Vue 原生 |
| 乐享运营 | 运营总览 | `/dashboard/overview` | `src/views/dashboard/DashboardOverviewView.vue` | Vue 原生基线 |
| 乐享运营 | Query 分析 | `/pipeline/annotate` | `src/views/dashboard/PipelineAnnotateView.vue` | Vue 页面，仍有少量 DOM helper |
| 乐享运营 | 质量分析 | `/pipeline/quality` | `src/views/dashboard/PipelineQualityView.vue` | Vue route wrapper，`v-html` + quality runtime |
| 乐享运营 | 流量分析 | `/ops/traffic` | `src/views/dashboard/OpsTrafficView.vue` | Vue 状态 + ECharts，本地 HTML 字符串 |
| 乐享运营 | GMV 分析 | `/ops/gmv` | `src/views/dashboard/OpsGmvView.vue` | Vue 状态 + ECharts，本地 HTML 字符串 |
| GEO 看板 | 整体数据概览 | `/geo/overview` | `src/views/geo/GeoOverviewView.vue` | Vue route wrapper，原生样式承载 |
| GEO 看板 | 各平台信源分布 | `/geo/source` | `src/views/geo/GeoSourceView.vue` | Vue route wrapper，原生样式承载 |
| GEO 看板 | 各平台意图分布 | `/geo/intent` | `src/views/geo/GeoIntentView.vue` | Vue route wrapper，原生样式承载 |
| GEO 看板 | GEO 转化看板 | `/geo/conversion` | `src/views/geo/GeoConversionView.vue` | Vue route wrapper，原生样式承载 |
| GEO 看板 | 手工上传知识 | `/geo/knowledge` | `src/views/geo/GeoKnowledgeView.vue` | Vue route wrapper，原生样式承载 |
| 在职员工管理 | 概览 | `/employee/overview` | `src/views/employee/EmployeeOverviewView.vue` | Vue route wrapper，原生样式承载 |
| 在职员工管理 | 认证审核 | `/employee/cert` | `src/views/employee/EmployeeCertView.vue` | Vue route wrapper，原生样式承载 |
| 企业客户管理 | 线索看板 | `/lead/dashboard` | `src/views/lead/LeadDashboardView.vue` | Vue route wrapper，原生样式承载 |
| 企业客户管理 | 线索池 | `/lead/pool` | `src/views/lead/LeadPoolView.vue` | Vue route wrapper，原生样式承载 |
| 企业客户管理 | 打分模型 | `/lead/score` | `src/views/lead/LeadScoreView.vue` | Vue route wrapper，原生样式承载 |
| Agent | Skill Hub | `/agent/skills` | `src/views/agent/AgentSkillsView.vue` | Vue 原生 |
| Agent | 创建 Skill | `/agent/skill-create` | `src/views/agent/AgentSkillCreateView.vue` | Vue 原生 |
| Agent | 权限管理 | `/agent/permissions` | `src/views/agent/AgentPermissionsView.vue` | Vue 原生 |

这些页面不得重新路由回 `NativeWorkbenchPage.vue`，除非明确执行用户要求的回滚。

## 当前上线范围与后续边界

当前左侧可见目录为：乐享运营、GEO 看板、在职员工管理、企业客户管理。以上可见页面均已进入 Vue route/page layer，不再由 `NativeWorkbenchPage.vue` 直接承载。

搜索后台、风控管理已从当前第一版封板项目中删除，不保留左侧入口、路由、占位页或迁移计划。后续如重新需要，应按新的业务需求重新设计并新增。

隐藏详情页仍保留 `NativeWorkbenchPage.vue` 承载，用于兼容表格行点击、详情页和报告页等封板链路；后续如要迁移，应按隐藏页专项单独排期。

## 迁移原则

- 不影响已迁移的左导航、顶部区域、Agent 区和乐享运营 5 页。
- 不改变现有业务功能、交互、样式和视觉密度。
- 先让路由进入 Vue 组件，再逐步替换内部 `v-html` / DOM helper / runtime seam。
- 保留已有 class / id 作为样式锚点，除非确认不再被 CSS、图表、测试或 runtime 使用。
- 高复用、高风险模块才抽共享组件；页面专属逻辑先保持局部。
- 图表遵守当前项目规范：运营总览和 Query 分析色板、统一图例间距、首次进入动效、稳定容器尺寸。
- Agent 遵守当前规范：等待态透明；正式回答全部带外层气泡；报告卡进入动态页签。

## 待迁移目录

### 1. GEO 看板

当前已由独立 Vue SFC 承载：

- `/geo/overview` -> `dashboard.geo` -> `src/views/geo/GeoOverviewView.vue`
- `/geo/source` -> `dashboard.geoSource` -> `src/views/geo/GeoSourceView.vue`
- `/geo/intent` -> `dashboard.geoIntent` -> `src/views/geo/GeoIntentView.vue`
- `/geo/conversion` -> `dashboard.geoConversion` -> `src/views/geo/GeoConversionView.vue`
- `/geo/knowledge` -> `dashboard.geoKnowledge` -> `src/views/geo/GeoKnowledgeView.vue`

候选组件：

- GEO 指标卡 / 指标组
- 平台矩阵
- 信源、意图、转化图表卡
- 知识上传状态 / 列表
- GEO 报告入口卡

### 2. 在职员工管理

当前已由独立 Vue SFC 承载：

- `/employee/overview` -> `employee.overview` -> `src/views/employee/EmployeeOverviewView.vue`
- `/employee/cert` -> `employee.certification` -> `src/views/employee/EmployeeCertView.vue`

相关隐藏页：

- `/hidden/employee/list`
- `/hidden/employee/detail`
- `/hidden/employee/cert-detail`

候选组件：

- 员工筛选栏
- 员工表格
- 认证审核表格
- 员工详情卡 / 详情抽屉
- 审批操作区

### 3. 企业客户管理

当前已由独立 Vue SFC 承载：

- `/lead/dashboard` -> `lead.dashboard` -> `src/views/lead/LeadDashboardView.vue`
- `/lead/pool` -> `lead.pool` -> `src/views/lead/LeadPoolView.vue`
- `/lead/score` -> `lead.score` -> `src/views/lead/LeadScoreView.vue`

相关隐藏页：

- `/hidden/lead/detail`

候选组件：

- 线索 KPI / 漏斗卡
- 线索池表格
- 分配与跟进动作栏
- 打分规则编辑器
- 线索详情抽屉 / 详情页

## 单页迁移步骤

1. 读取当前 legacy renderer 和对应 runtime 行为。
2. 记录页面功能点：筛选、表格、图表、动作、状态、AI 入口、隐藏页跳转。
3. 新建 Vue 页面组件，保留视觉和交互。
4. 在 `src/router/index.ts` 将对应路由从 `NativeWorkbenchPage` 切到 Vue 组件。
5. 将页面状态迁移到 `ref/computed/store`。
6. 将事件迁移到 Vue handler。
7. 图表优先使用 ECharts module import。
8. 仅在风险较低时抽共享组件。
9. 执行“已确认基线不回退验收”：不仅看新页面，还要确认之前已确定的组件化、样式、交互、路由、Agent、图表和响应式能力没有被新改动影响。

## 每次迁移后必须做基线不回退验收

每迁移一个大目录，不能只看该目录是否迁移成功，还必须检查之前已确认过的项目基线是否被影响。

基线包括但不限于：

- 已封板的 Vue shell：左导航、顶部区域、静态页签、动态页签、右侧 Agent 区。
- 已确认的组件化边界：共享组件、页面局部组件、路由归属、内容槽责任边界。
- 已迁移页面：门户首页、乐享运营 5 页、Agent / Skill 页面。
- 已确认的业务能力：筛选、表格、图表、AI 报告展开、动态页签、详情/隐藏页跳转。
- 已确认的视觉规范：卡片密度、KPI 样式、表格样式、图标体系、字体、间距、图表色板、图例间距、入场动效。
- 已确认的 Agent 规范：等待态透明、正式回答全部带气泡、队列/停止、状态卡片、报告卡片。
- 已确认的响应式规则：先压缩中间内容，再收起侧栏，最后约束 Agent；不得出现页面内部提前裁切或横向溢出回退。

固定回归路由：

```text
/admin-vue/portal/home
/admin-vue/dashboard/overview
/admin-vue/pipeline/annotate
/admin-vue/pipeline/quality
/admin-vue/ops/traffic
/admin-vue/ops/gmv
/admin-vue/geo/overview
/admin-vue/geo/source
/admin-vue/geo/intent
/admin-vue/geo/conversion
/admin-vue/geo/knowledge
/admin-vue/employee/overview
/admin-vue/employee/cert
/admin-vue/lead/dashboard
/admin-vue/lead/pool
/admin-vue/lead/score
```

新增迁移路由也必须逐页打开验证。

如果本次迁移改到了共享组件、shell class、全局 CSS、图表 helper、Agent 行为、路由表、store 或复用数据模块，则必须扩大回归范围到所有使用这些共享能力的页面。

检查点：

- 左导航 active、顶部静态页签、面包屑正常。
- 右侧 Agent 关注页面正确。
- 业务功能点未丢失。
- 图表颜色、图例、动效、容器高度符合当前规范。
- AI 正式回答有外层气泡。
- 无页面级横向溢出；缩屏顺序正确。
- 浏览器控制台无项目 error。

## 必跑命令

```bash
pnpm lint
pnpm typecheck
pnpm build
pnpm smoke:shell
```

# 中间内容槽统一定义

这份说明用于约束 Vue 迁移版本的中间内容槽。左导航、顶部导航、Agent 区已经归入 shell 组件；中间内容槽按页面维度独立登记，后续研发可以基于登记结果判断组件沉淀方式。

## 定义入口

- 结构化台账：`src/content-slot/contentSlotDefinitions.js`
- 动态报告页：`src/components/TempTabView.vue`
- 原封板运行时承载页：`src/views/NativeWorkbenchPage.vue`
- Vue 原生首页：`src/views/PortalHomeView.vue`
- 迁移计划：`src/content-slot/CONTENT_SLOT_MIGRATION_PLAN.md`

## 分层标准

### 固定样式

适合只做样式规范，不抽业务组件：

- 页面标题区：标题、描述、左侧小方块、右侧刷新/操作按钮。
- 内容模块间距：页面 header 到首个模块、tab 到筛选区、筛选区到表格、表格到详情卡。
- 卡片外观：白底、浅边框、轻阴影、最大 8px 圆角。
- 标签、按钮、空状态、分页的基础视觉规范。

### 共享组件

适合跨多个目录复用：

- `PageHeader`：页面标题、描述、右侧动作。
- `SectionCard`：内容卡片、模块标题、模块副标题。
- `FilterBar`：搜索框、select、日期/范围筛选、刷新按钮。
- `DataTable`：表头、选择列、状态标签、分页、操作列。
- `StatusTabs`：内容槽内状态 tab。
- `MetricCard`：KPI/指标卡。
- `ChartPanel`：图表容器、loading、empty、error。
- `ConfirmModal`：高影响操作确认弹窗。

### 领域组件

适合在目录内复用，但不强行跨域：

- 乐享运营：指标卡组、趋势图、质量/流量/GMV 分析面板。
- GEO 看板：平台矩阵、信源/意图/转化图表、知识上传状态。
- 在职员工：认证审核表、审核详情卡、审批操作区。
- 企业客户：线索漏斗、线索卡、分配动作、打分规则编辑器。
- Agent/Skill：Skill 卡、流程 Stepper、评估卡、草稿生成工作区。

### 页面自定义

必须保留页面自定义：

- 每个页面的数据字段、接口参数、指标口径。
- 图表 option、业务计算逻辑、表格列定义。
- 写入/发布/导出/审批等高影响流程。
- 页面专属的二级详情、模型配置、审核表单。

## 当前页面范围

`contentSlotDefinitions.js` 已覆盖：

- 首页：门户工作台。
- 左导航所有目录：乐享运营、GEO 看板、在职员工管理、企业客户管理。
- 账号/Agent 入口：Skill Hub、Skill 创建、权限管理。
- 封板项目隐藏页：详情、报表、标注、员工、线索等内部跳转页。
- 动态页签：Agent 生成的报告页签。

## 当前迁移状态

当前可见左导航页面已经进入 Vue Router 页面层，不再由 `NativeWorkbenchPage.vue` 直接承载。

乐享运营 5 个菜单：

- `dashboard.overview` -> `src/views/dashboard/DashboardOverviewView.vue`
- `pipeline.annotate` -> `src/views/dashboard/PipelineAnnotateView.vue`
- `pipeline.quality` -> `src/views/dashboard/PipelineQualityView.vue`
- `ops.traffic` -> `src/views/dashboard/OpsTrafficView.vue`
- `ops.gmv` -> `src/views/dashboard/OpsGmvView.vue`

但它们的内部迁移深度不同：运营总览最接近原生 Vue 模板；Query 仍有少量 DOM helper；质量分析仍使用 `v-html` + `public/admin-runtime/workbench-quality.js`；流量和 GMV 仍使用本地 HTML 字符串模板。后续优化不能把它们重新挂回 `NativeWorkbenchPage`。

GEO 看板 5 个菜单：

- `dashboard.geo` -> `src/views/geo/GeoOverviewView.vue`
- `dashboard.geoSource` -> `src/views/geo/GeoSourceView.vue`
- `dashboard.geoIntent` -> `src/views/geo/GeoIntentView.vue`
- `dashboard.geoConversion` -> `src/views/geo/GeoConversionView.vue`
- `dashboard.geoKnowledge` -> `src/views/geo/GeoKnowledgeView.vue`

在职员工管理 2 个菜单：

- `employee.overview` -> `src/views/employee/EmployeeOverviewView.vue`
- `employee.certification` -> `src/views/employee/EmployeeCertView.vue`

企业客户管理 3 个菜单：

- `lead.dashboard` -> `src/views/lead/LeadDashboardView.vue`
- `lead.pool` -> `src/views/lead/LeadPoolView.vue`
- `lead.score` -> `src/views/lead/LeadScoreView.vue`

GEO、在职员工、企业客户目前采用“Vue route wrapper + 原生样式承载”的迁移方式：路由、页签、标题和生命周期归 Vue 管，页面主体 HTML/CSS/交互函数复用封板运行时，确保视觉样式一模一样。后续若继续组件化，只能在有明确对照和回归截图的前提下逐块替换内部结构。

搜索后台、风控管理已从当前第一版封板项目中删除；不保留路由、占位组件或迁移台账。后续如有新需求，按新需求重新新增。

## 后续研发建议

1. 先按目录认领页面，不要直接把所有内容槽做成一个巨型通用组件。
2. 每个目录先沉淀本域组件，再判断是否上升为共享组件。
3. 页面迁移时保持原封板样式优先，组件化不能改变现有布局密度、间距和交互。
4. 涉及 Agent 打开动态页签、静态页签联动、顶部面包屑和左导航状态的行为，仍归 shell 管理。
5. 中间内容槽只负责自身页面内容，不反向修改左导航、顶部、Agent 区。
6. 每迁移一个目录前后都要做“已确认基线不回退验收”：不仅回归乐享运营 5 页，还要确认所有已确定的组件化边界、shell 行为、Agent 行为、图表规范、视觉样式、路由归属、业务功能和响应式裁切顺序都没有被新改动影响。
7. 对已采用原生承载迁移的页面，验收口径为：路由绑定独立 Vue SFC、页面根节点不是 `.native-workbench-page`、关键 DOM 和初始化函数已挂载、样式与封板页一致。

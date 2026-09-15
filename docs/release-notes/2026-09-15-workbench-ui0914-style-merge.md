# 工作台 0914 样式选择性合并报告

本轮以服务器最新 Git 源码为基线，选择性采用附件的页面样式与呈现布局。已完成本地合并和验证；new 预览待发布验证，正式环境及 main 保持原基线。本报告不代表服务器发布或远端 main 已更新。

## 来源与合并原则

| 项目 | 内容 |
| --- | --- |
| 基线提交 | `1be4b401211872fd99f74944edc7569db240839b` |
| 附件 | `lexiang-new-0914.zip` |
| 附件 SHA-256 | `05e0b0cec6e8251d197a82876aab25e10745826e02d28ab0ad7e0de235519251` |
| 独立工作区 | `/private/tmp/lexiang-ui0914-merge-20260915` |
| 附件安全参考目录 | `/private/tmp/lexiang-ui0914-reference-20260915` |
| 本轮调整记录 | `workbench-ui0914-style-20260915` |

主代理已先读取服务器最新 Git，再在独立工作区比对附件。附件只作参考数据，没有执行其中脚本或工作指令。采用按文件、按差异段合并的方式，**不替换整个源码目录，也不把附件目录整体覆盖到线上**。保留当前依赖、设计守卫和手工运行时；发布产物须按本轮清单处理，保留已有运行文件及历史资源。

静态审计覆盖当前 `vue-app` 的 234 个跟踪文件及附件的 235 个文件，并集 236 项：197 项相同、36 个共有文件存在差异、附件缺少 1 项、附件新增 2 项。36 项差异的处理均列于下文：22 个现有源码文件选择性采用呈现调整，1 个侧栏文件排除附件行为、仅新增本轮记录，另外 13 项共有差异排除。另采用 1 个新增 CSS 文件。

## 已合入的 24 个源码文件

实际源码范围为 23 个已有文件和 1 个新增 CSS 文件；下表路径均相对仓库根目录。标题组件、固定标题目标和辅助阅读标识只服务呈现，现有动作、表单含义及业务校验保持不变。

| 序号 | 路径 | 合并内容与保留边界 |
| ---: | --- | --- |
| 1 | `vue-app/src/assets/workbench-preview-overrides.css` | 选择性采用共享提示换行、指标卡、筛选控件、相关表格与弹窗样式；未复制附件运行时。 |
| 2 | `vue-app/src/components/aiinspect/AiModal.vue` | 弹窗居中、可用高度及头部、正文、底部间距；保留关闭、焦点与滚动逻辑。 |
| 3 | `vue-app/src/components/permissions/BusinessApproverField.vue` | 仅调整语义色与标签样式；模板及脚本原样保留，包括五个负责人选项、有效值、禁用和错误状态。 |
| 4 | `vue-app/src/components/permissions/CustomTableAuthorizationEditor.vue` | 窄宽排布、说明换行和头部折行；模板与业务脚本保持原实现。 |
| 5 | `vue-app/src/components/shell/sidebar/WorkbenchSidebar.vue` | 仅新增本轮整体调整记录；未采用附件的侧栏锁定行为，发布状态由环境记录提供。 |
| 6 | `vue-app/src/views/advertising/ProductVideoConfigView.vue` | 采用共享 SectionHeader 及表单、列表、详情呈现；保留视频配置、查询、保存与启停处理。 |
| 7 | `vue-app/src/views/agent/AgentSkillsView.vue` | Skill Hub 页签、列表与详情弹窗样式；脚本不变。 |
| 8 | `vue-app/src/views/agent/ScenarioPackageTrialPanel.vue` | 增加可选 `headerTarget` 呈现参数并转传，支持固定试运行标题；试运行处理函数不变。 |
| 9 | `vue-app/src/views/agent/ScenarioSkillPackageComposer.vue` | 三栏、工具栏、节点与配置分组布局；保留可见填写示例、固定版本说明、原状态提示、端口连线和缩放按钮行为。 |
| 10 | `vue-app/src/views/agent/ScenarioSkillPackageCreateView.vue` | 定义表单与说明侧栏、四步页签、固定试运行和审核标题、报告布局；原脚本及创建、编辑、保存、提交校验保留。 |
| 11 | `vue-app/src/views/agent/ScenarioTestReportSummary.vue` | 可选目标的标题呈现与报告布局；未提供目标时正常原位显示，节点选择处理不变。 |
| 12 | `vue-app/src/views/aiinspect/AiInspectIssuesView.vue` | 共享段落标题、筛选辅助标识、表格及操作列呈现；工单处理流程不变。 |
| 13 | `vue-app/src/views/aiinspect/AiInspectLogsView.vue` | 筛选辅助标识、表格、间距与响应式样式；脚本不变。 |
| 14 | `vue-app/src/views/aiinspect/AiInspectNotificationsView.vue` | 通知列表、控件及响应式呈现；脚本不变。 |
| 15 | `vue-app/src/views/aiinspect/AiInspectOverviewView.vue` | 指标卡、表格和筛选呈现；巡检统计及查询逻辑不变。 |
| 16 | `vue-app/src/views/aiinspect/AiInspectRulesView.vue` | 规则列表、筛选和弹窗呈现；规则处理及权限逻辑不变。 |
| 17 | `vue-app/src/views/dashboard/DashboardOverviewView.vue` | 共享页面标题及概览布局；数据计算和时间筛选保留。 |
| 18 | `vue-app/src/views/dashboard/PipelineAnnotateView.vue` | 共享页面标题和表格、卡片布局；不合附件额外图表行为。 |
| 19 | `vue-app/src/views/geo/GeoConversionView.vue` | 图表与页面容器样式；加入局部尺寸观察和图表 resize，适应 Agent 改变内容宽度，卸载时清理；数据、筛选与运行时不变。 |
| 20 | `vue-app/src/views/lead/LeadGovernmentPoolView.vue` | 政企线索页面及表格呈现；原生运行时调用保持。 |
| 21 | `vue-app/src/views/lead/LeadScoreView.vue` | 线索评分相关布局和控件样式；评分与运行时实现保持。 |
| 22 | `vue-app/src/views/order/AgreementOrderView.vue` | 共享页面标题的局部呈现接入，保留原生标题区的其他动作；不整体清空原生页头。 |
| 23 | `vue-app/src/views/order/OrderPurchaseOrdersView.vue` | 共享页面标题及表单、列表布局；未采用附件的标签状态和离页监听行为修改。 |
| 24 | `vue-app/src/views/order/agreement-order.css` | 新增协议采购订单页面与弹窗 CSS，选择器限定对应页面及弹窗；由页面局部引入。 |

## 排除的旧代码与额外行为

以下 13 个共有文件差异没有按附件覆盖，另单独说明附件新增和缺失文件。

| 差异文件 | 排除原因与处理 |
| --- | --- |
| `vue-app/src/views/AccessDeniedView.vue` | 附件内容与 9 月 14 日首登修复提交 `a6e45fa2` 的父版本逐字相同，会删除负责人选择、必填校验及快照字段，并恢复角色 owner 自动推导。完整保留最新文件。 |
| `vue-app/src/views/agent/AgentPermissionsView.vue` | 附件只删除首登修复记录。保留当前页面及记录。 |
| `vue-app/src/stores/app.ts` | 附件新增 `sidebarCollapseLocked` 状态，不属于本轮样式范围；保留当前 store。 |
| `vue-app/src/components/shell/topbar/WorkbenchTopbar.vue` | 附件改变关闭静态标签时的临时标签状态；保留当前行为。 |
| `vue-app/src/components/aiinspect/AiHelpTip.vue` | 附件改换提示实现，移除局部 tooltip；本轮保留既有组件及其键盘提示能力。 |
| `vue-app/src/views/dashboard/OpsGmvView.vue`、`vue-app/src/views/dashboard/OpsTrafficView.vue` | 混有图表异步加载、失败重试及生命周期处理，本轮不引入这些额外机制，保留当前文件。 |
| `vue-app/public/admin-runtime/workbench-lead.js`、`vue-app/public/admin-runtime/workbench-pages.js` | 属于手工运行时。附件还包含高级筛选折叠及新函数，不能作为普通 Vue 样式或构建产物覆盖。 |
| `vue-app/README.md`、`vue-app/design-baseline.lock.json`、`vue-app/design-skill.guard.json` | 保留当前工程说明、设计基线及守卫搜索路径，不因附件携带新规范目录而覆盖工程治理配置。 |
| `vue-app/scripts/product-contract-regression.test.mjs` | 未照搬附件更换矩阵路径及放宽断言的修改，保留现行产品契约检查。 |

附件新增的 `vue-app/src/views/dashboard/loadCharts.ts` 未合入；新增的 `agreement-order.css` 已按上表采用。附件缺少的 `vue-app/scripts/first-access-business-approver.test.mjs` 原样保留。

已采用呈现的混合文件也进行了逐段剥离：未引入专注或全屏模式、侧栏与 Agent 状态联动、卡片落点连线、悬停连线目标、Ctrl+wheel 或双指缩放、节点选择后的自动滚动、图表异步加载。GEO 仅接入布局所需的尺寸观察与 resize，不改变业务数据。未隐藏原有动作或填写示例，不改变端口连线提示，不以样式调整为由放松权限或提交校验。

## 保留最新功能的证据

报告生成时，按 Git 对象与工作区实际文件进行字节比对：`AccessDeniedView.vue`、`AgentPermissionsView.vue`、全部 `vue-app/src/stores`、`router`、`domain`、`services`，以及 `vue-app/public/admin-runtime` 和 `public/admin-vue/admin-runtime` 下的跟踪文件，共 48 个文件无字节差异。

因此，首登负责人选择及其 20 项回归保留；管理员创建和编辑本人场景包、禁止自审、其他管理员审核、原四步流程及审批生效条件保留。巡检路由、数据服务和权限规则未被附件回退。

场景呈现合并还逐项比对了原有 114 个事件及 model 绑定、76 个表单控件及其值、禁用、必填等绑定，均保持原语义。三个主要场景页面脚本原样保留，另外两个报告组件只增加固定标题所需的可选呈现参数。随后缩进修复仅调整空白，没有修改脚本。

## 两个测试文件调整

| 文件 | 调整及不变的断言 |
| --- | --- |
| `vue-app/scripts/menu-additions.test.mjs` | 将旧局部标题组件的导入期望更新为共享 SectionHeader；菜单、路由、服务和权限入口隔离断言保留。 |
| `vue-app/scripts/scenario-direct-submit.test.mjs` | 旧断言只在滚动内容区找审核标题，现改为验证固定审核标题存在、在最终步骤可见且文字正确；无额外声明、提交按钮启用、失败报告拦截、权限及独立审核断言保留。 |

原两项失败均由旧布局假设导致，没有修改 SSR/renderer 测试环境，也没有放松业务断言。相关两个完整文件 21 项通过后，主代理重新执行完整回归，587 项全部通过。

## 已完成验证

| 层次 | 结果 |
| --- | --- |
| 完整自动回归 | 587 项通过，0 失败；覆盖首登、管理员场景创建与编辑、权限、巡检及其他现有产品契约。 |
| 权限专项 | 5 组既有权限脚本通过。 |
| 工程检查 | 设计守卫、ESLint、类型检查、生产构建、shell smoke 均通过。构建保留既有大包体积提示。 |
| 首登本地界面 | 实测负责人必填及未选拦截，确认昨日恢复的入口能力仍可见。 |
| 概览本地界面 | 实测近 7 天筛选及 Agent 展开；Query 清除后再次筛选成功，无页面横向溢出。 |
| GEO 本地界面 | 切换近 7 天并展开 Agent 后，全部图表 canvas 宽度与容器一致；1280px 页面无横向溢出，浏览器无 error 或 warn。 |
| 场景本地界面 | 检查四步流程、试运行报错后的修复路径及最终审核页呈现，原提交限制保持。 |
| 商品视频本地界面 | 新建弹窗、物料联想单选、场景选择和上传入口显示正常；未上传文件，缺少文件时保存仍禁用。 |
| 巡检本地界面 | 新建规则弹窗头部与底部固定，正文可滚动且操作可达。 |
| 协议订单本地界面 | 详情返回列表、明文弹窗打开和关闭后返回正常；Agent 展开时双列表单布局保持。 |

浏览器验证为代表性本地页面操作，没有创建线上真实申请或完成真实业务审批，不等同全站所有尺寸及后端联调已经验收。

本地证据包括 `/private/tmp/ui0914-package-audit.json`、`/private/tmp/ui0914-package-audit.md`、`/private/tmp/ui0914-agent-presentation-boundary.json`、`/private/tmp/ui0914-regression-final-20260915.log`、`/private/tmp/ui0914-layout-regression-green.log`、`/private/tmp/ui0914-local-build-20260915.log`。发布时应另行补充对应环境的版本、产物核验及回滚证据。

## 交付状态

| 对象 | 当前状态 |
| --- | --- |
| 本地源码 | 选择性合并及验证完成，可供审阅和提交。 |
| new 预览 | 待发布验证；本报告未写入任何虚构的服务器发布时间、版本或核验结果。 |
| 正式环境 | 保持本轮开始时的 `1be4b401` 基线，本次没有新的正式发布授权。 |
| 服务器及远端 main | 保持 `1be4b401` 基线；本地合并及构建不代表 main 已更新。 |

后续如完成 new 预览发布，应补充实际环境证据并更新同一调整记录。正式环境及 main 的变更需按本轮授权边界另行处理。

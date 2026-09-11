# Scenario Package Composer Implementation Plan

> **For agentic workers:** Use subagent-driven-development for the independent composer, followed by integration and review.

**Goal:** 预填创建表单并把 Skill 选择和链路设置合并为拖拽编排。

**Architecture:** 父创建页面维护四步状态、场景表单和最终评估。页面局部编排器接收 skills 与 modelValue，emit update:modelValue；复用现有固定版本和权限模型。

**Tech Stack:** Vue 3、TypeScript、Pinia、原生 HTML5 拖拽、Playwright。

## Global Constraints

- 只修改隔离工作区中的任务源码；保护共享工作目录 WIP、正式环境和 admin-runtime。
- 主内容使用既有 0818 token、SectionHeader 与 ContentPageHeader，页面局部 scoped 样式。
- 固定版本、条件字符串、required 与 kind、确认审批属性均保留原协议。

## Task 1: 创建流程

- [x] 在 scripts/verify-scenario-composer-browser.mjs 添加浏览器断言，先验证旧版缺少预填而失败。
- [x] 修改 ScenarioSkillPackageCreateView.vue：五个场景字段初始化示例，步骤 2 挂载 `<ScenarioSkillPackageComposer v-model="chain" :skills="publishedSkills" />`，原步骤 4/5 变为 3/4。
- [x] 合并步骤 2 的 Skill 与条件验证；所有评估/发布入口仍重算，回退保留草稿。

## Task 2: 拖拽编排器

- [x] 新增 ScenarioSkillPackageComposer.vue，实现分类搜索、插入、排序、移除、选中节点设置。
- [x] 保持 createPinnedScenarioStep 来源为可用目录，重复引用不生成新节点，切换必需步骤清除条件。
- [x] 适配内容宽度、焦点、键盘和空/失效状态；单独静态检查组件后交父页面集成。

## Task 3: 验证与交付

- [x] 将产品合同中的五步更新为四步，添加一个任务调整记录。
- [x] 跑浏览器行为测试、现有 Node 测试、guard、lint、typecheck、build、smoke；截图检查布局。
- [x] 独立评审最终 diff，修复问题后重新验证受影响范围。
- [x] 本地提交任务文件，推到专用 server preview 分支，在个人服务器工作区构建发布 new；登记发布台账与交付记录。

## 后续：参考工作流画布

用户提供已打开的工作流站点作为交互参考。只读核验后，在既有授权范围内更新同一创建流程。

- [x] 将列表编排替换为浅色自由画布，支持拖入、移动、端口连线、断线、缩放、整理与右侧配置。
- [x] 扩展 predecessorId/position 可选字段；旧链兼容，显式连线仅允许一条完整顺序链。
- [x] 统一发布/运行门禁解析连接关系并保留快照；父页面验证和发布预览使用同一连线顺序。
- [x] 新增图模型单测；通过浏览器实际核验拖入、移动、连线、断开、条件及页面布局。
- [x] 执行工程检查、独立复核，更新同一调整日志；new 发布结果另见实际发布台账与交付记录。

画布验收：178 项 Node 回归、guard、lint、typecheck、build、shell smoke 通过。CUA 独立浏览器实操验证表单编辑与必填、两次目录拖入落点、端口拖线、移动不改顺序、点击端口连接、分叉拒绝、条件必填/确认审批、线段选择与删除/重连、断线撤销确认和发布拦截；发布摘要确认为企业客户跟进→职场认证→人群经营（与添加顺序不同）。1440 桌面、Agent 380/492、1280+Agent492：页面和组件横溢均0，Agent展开时内容区809/697/666，窄内容标题高度74px。未宣称触屏或移动端整站验收。更新后的独立Playwright脚本完成语法检查，本轮未运行该脚本，浏览器结论来自上述CUA实操。

独立复核提出混合模型不应静默补前序、窄内容标题不能保留320px flex-basis，均已修复并复核。增量样式扫描2文件0违规；全量一致性仍为历史 advertising.productVideo 未登记问题，与原列表验收相同。

新的验收记录单独追加，以下是原列表编排的历史验收结果，不能替代画布核验。

## 场景定义视觉对齐

- [x] 对照 0818 表单、内容槽、专项工作区和响应式规范，保留数字文字导航与独立正文滚动。
- [x] 将第 1 步改为白底工作区中的 720px 居中单列表单，复用 SectionHeader，统一输入样式、必填标记和右对齐按钮。
- [x] 浏览器核验 1440 桌面及 Agent 380/492、1280×800 + Agent492；实测输入框36px、文本域88px、页头到步骤16px，页面横溢均0；编辑后往返保留、必填拦截正常。
- 工程检查完成后，将候选版本通过预览分支构建发布到 new；实际结果以本轮交付记录为准。

## 原列表编排验证边界

浏览器实际完成鼠标拖入/上下重排/重复引用、键盘移除焦点、条件编辑和清除、审批确认重置、失效目录移除、分类搜索/折叠、四步前进返回。1600/1440/1280 桌面及 380/492px Agent 形成的 1346–666px 内容槽横向溢出均为 0。原外壳最小宽度 1280px，680px 窗口仍受既有外壳约束，不宣称手机整站适配。

164 项 Node 回归、主设计 guard、lint、typecheck、build、shell smoke 通过。增量样式扫描本次两个 Vue 文件 0 违规；0818 总一致性检查仍有原有 advertising.productVideo 未登记到视觉记录/页面矩阵的问题（39 vs 38），相关路由与规范文件本次均未修改。

独立评审发现移除非选中节点丢键盘焦点，已红测复现并修复；浏览器发现长编排压缩导航，已禁止导航 flex 收缩并验证高度至少 46px。复核无剩余阻断问题。

---
name: portal-workbench-ui-design
description: >-
  Use this single combined design skill for the current 门户工作台 / 联想乐享 / 乐享 AI 工作台 / Leaibot admin project when Codex designs, generates, implements, prototypes, reviews, or improves PC desktop HTML preview pages or code pages. It combines the previous ai-admin-ui-design specification with stricter style-accuracy safeguards to prevent UI drift: align with current project source CSS, light Feishu-like three-column workbench, compact sidebar, right AI assistant, blue primary actions, Lenovo red accent, dense KPI cards, filters, tabs, tables, charts, drawers, customer message tickets, lead management, GEO/运营 dashboards, consistent icons/tooltips, and strict spacing. Do not use for unrelated admin systems, generic AI dashboards, marketing sites, or mobile consumer pages.
---

# 乐享 AI 工作台 UI 设计 Skill

## 目标

为当前本地项目 **联想乐享 / 乐享 AI 工作台 / Leaibot 管理台** 输出一致、专业、可落地的 PC 端 HTML 预览页面和代码页面。生成新需求、改造页面或做设计评审时，必须让结果与当前本地项目保持同一套视觉语言、组件样式、布局节奏和交互细节。

本 Skill 是项目专属的单一设计规范，不再作为通用 AI 后台规范使用。所有页面默认继承当前项目的三栏工作台：左侧紧凑导航、顶部工具栏、中间业务操作区、右侧 AI 助手。未覆盖的通用组件细节可以参考 `references/components.md` 等文件，但凡与 `references/leaibot-admin-ui.md` 冲突，一律以 Leaibot 项目规范为准。

本 Skill 已经把之前的设计规范和“样式应用准确度”规则结合到同一个入口。根目录只保留这一个 `SKILL.md`；旧设计规范的 reference、模板、基础 CSS、字体和 Logo 都直接放在本目录的 `references/` 与 `assets/` 下。

## 样式准确度增强

为了避免样式时不时跑偏，执行本 Skill 时必须先完成以下约束：

- 先读取当前项目真实源码，尤其是 `lexiang-workbench/public/admin/workbench.css`、目标页面 HTML / JS、已有 class、DOM 结构和交互状态。
- 再读取 `references/style-contract.md`，用当前源码中的 token、布局尺寸、组件语法和差异裁决规则约束生成结果。
- 当规范、历史页面和源码不一致时，按优先级裁决：当前正在修改的真实页面源码 > `workbench.css` 实际 token 与组件实现 > 本 `SKILL.md` 核心规则 > `references/` 专项规范 > 历史预览 HTML 或旧 demo。
- 不要仅凭记忆、旧截图或通用后台模板生成 UI；源码中的现行样式优先级高于历史 HTML 片段和口头描述。
- 不要把单次页面样式修正自动升级为全局规范；除非用户明确要求沉淀规范。
- 交付前必须读取 `references/style-qa-checklist.md`，检查是否复用了真实项目 token、保留三栏工作台节奏、避免旧 `240px` 侧栏、通用后台、营销页、shadcn / Ant Design 默认样式、暗色模式白底孤岛、文字溢出、按钮换行和卡片嵌套。

## 唯一规范与跨设备使用

- 本 Skill 是当前 **AI 工作台 / Leaibot 管理台** 的唯一设计规范源。后续项目页面设计、UI 重构、HTML 预览、组件样式调整和设计评审，默认都必须先遵守本 Skill。
- 本目录 `lexiang-workbench/skill/portal-workbench-ui-design/` 就是当前项目随包携带的 canonical design skill；后续打包到其他设备、账号或工作目录时，应直接携带这一整份目录，而不是依赖项目外的独立 skill 文件夹。
- 如果后续需要历史归档或公开预览模板副本，应从 `lexiang-workbench/skill/portal-workbench-ui-design/` 单向同步；当前运行页面样式仍以 `lexiang-workbench/public/admin/workbench.css`、`workbench-ui-polish.css` 和 `workbench-preview-overrides.css` 为准。
- 在其他电脑或设备上运行 AI 工作台项目时，必须随项目携带完整本 Skill 目录，并以根目录 `SKILL.md`、`references/` 和 `assets/` 为准，不再依赖某台电脑桌面的旧目录或绝对路径。
- 在任何其他电脑、设备、账号或新线程中，只要任务属于门户工作台 / Leaibot 的新增需求页面、HTML 预览页、代码页面、UI 优化或组件调整，必须先加载并遵守本 Skill 根目录的 `SKILL.md`，再读取本目录下所需的 `references/` 文件。
- 新增需求页面不得跳过本 Skill 自行套用通用后台、Ant Design 默认样式、shadcn 默认样式或其他外部模板；可以借鉴现代后台视觉语言，但最终输出必须落到本 Skill 的 Token、布局、组件、右侧 AI 助手、侧栏、品牌和 KPI 规则。
- 如果其他设备上缺少本目录或目录不完整，应先停止页面生成并提示补齐 / 同步完整本 Skill 目录，不要用记忆中的旧规范、嵌套旧 skill 副本或临时口头规范替代。
- 交付新增需求页面前，必须对照 `references/review-checklist.md` 做最终检查，尤其检查三层浅色表面、全站中间数据展示区平面化、中低饱和且辨识度足够的图表色板、右侧 AI 助手、侧栏收起态、品牌胶囊、交互状态和暗色模式跟随。
- Skill 内资源必须使用相对路径组织；HTML POC 可以引用 `assets/base.css`、`assets/logos/` 和 `assets/fonts/`，不要写死本机专属路径。
- 如果用户临时要求单次页面微调，可以先在项目页面中落地；当同一类调整在真实页面中成功复用 `3-5` 次，并且确认没有破坏既有页面时，自动把该规则沉淀回本 Skill 的对应 reference、Token 或 `assets/base.css`。
- 沉淀规则时优先更新专项文件：视觉/布局更新 `references/leaibot-admin-ui.md`，组件更新 `references/components.md`，颜色/间距/动效更新 `references/design-tokens.md`，可复用样式更新 `assets/base.css`。

## 适用场景

使用本 Skill 处理以下需求：

- 当前乐享 AI 工作台的新需求页面、HTML 预览页、代码文件页、功能原型和 UI 重设计。
- 当前项目已有模块：门户首页、乐享运营、运营总览、Query 分析、质量分析、流量分析、GMV 分析、GEO 看板、在职员工管理、认证审核。
- 当前项目新增模块：账号工作区入口、Skill 创建、Skill Hub、权限管理占位、客户留言、留言工单、线索管理、线索看板、线索池。
- 需要把需求文档转成与当前项目统一的 PC 端界面、表格、图表、抽屉、筛选、Tabs、AI 助手交互。
- 需要在其他设备上复刻当前本地项目风格，生成新的业务页面或维护既有页面。

不适用：其他品牌后台、通用 AI 控制台、营销官网、移动端 C 端页面、情绪化大视觉页面、任何不应该长得像当前乐享项目的产品。

## 设计优先级

遇到冲突时按以下顺序裁决：

1. **业务目标与用户任务**：先保证后台工具效率和信息可读性。
2. **当前项目规则**：所有页面优先遵守 `references/leaibot-admin-ui.md`。
3. **品牌与资产规则**：Logo、字体、品牌展示不可随意改造。
4. **Design Tokens**：颜色、字号、间距、圆角、阴影、层级、动效必须走 Token。
5. **布局与页型模板**：先判断页面类型，再套对应结构。
6. **组件规范**：按钮、表单、表格、卡片、标签、反馈、AI 专属组件必须复用规范。
7. **文案、可访问性与评审清单**：最后检查可读性、键盘焦点、错误恢复和交付质量。

## 必须遵守的核心规则

- 旧项目已有页面必须以本地设计稿对齐版源码为金标准逐页保持一致：导航顺序、父级目录、子菜单顺序、图标形态、侧栏展开/收起逻辑、顶部栏、内容区页头、KPI、筛选、Tabs、表格、图表、右侧 AI 助手结构都不得被新增功能顺手改写。
- 新增功能只能作为“旧风格扩展”接入：若旧项目没有该页面，先选择最接近的旧页面页型和组件组合，再按同样颜色、字号、间距、卡片、表格、Tab、按钮和 AI 交互规范落地；不得引入新的导航视觉、不同图标体系、不同卡片语言或不同 AI 面板结构。
- 迁移/合并时遵守“功能以新项目为准，视觉以旧项目为准”：新接口、新数据口径、新按钮可以保留，但必须使用旧项目的组件形态和色板承载；若新增内容会改变旧页面结构计数，应明确确认它属于功能新增，而不是样式回退。
- 桌面优先，最小应用宽度 `1280px`；低于该宽度允许横向滚动，不做手机适配。
- 主色默认 `#3370FF`；功能性 UI 颜色优先走 `--color-*` 语义变量。
- 正文 `14px`，表格 / 表单 / 按钮主力字号 `13px`，默认紧凑表格行高 `40px`。
- 默认控件高度 `36px`；表格内联操作 `28px`；突出主操作 `44px`。
- App Shell 使用侧栏 + 顶栏 + 内容区 + 右侧 AI 助手；侧栏展开 `168px`，收起 `56px`；左侧导航顶部、中间区顶部、AI 区顶部统一 `56px` 高度。
- 右侧 AI 助手默认宽度 `380px`，但不是锁死宽度：左侧拖拽手柄允许向左扩宽，最大宽度为 `492px`（即释放侧栏从 `168px` 收起到 `56px` 的 112px 空间）；拖到最大时自动收起左侧导航，往回拖离最大值时恢复由 AI 自动收起的导航；打开时隐藏顶栏 AI 助手开关，关闭后恢复顶栏开关；面板内部 gutter 默认 `16px`。
- 右侧 AI 助手头部必须显示头像、在线点、`AI 助手`、与当前导航同步的 `正在关注:{当前二级标题}` 胶囊，以及 4 个 icon-only 操作：管理技能 / 新开会话 / 历史对话 / 收起 AI 助手。
- 当右侧 AI 对话产生长篇数据、解读报告、复盘或结构化分析时，不要把全文堆在 380px AI 面板内；AI 面板中只展示统一“结论卡片”（标题、摘要、标签、保存、展开查看），点击展开后在面包屑下方显示临时页签栏，并把完整报告渲染到中间内容槽。临时页签必须可保存、可关闭、可多开对比；普通左侧导航仍保持“导航项与中间内容槽一一对应”，点击导航时回到对应业务页面。
- 门户首页是可操作工作台首屏，不是营销 landing：当前确认版左侧导航不渲染 `首页` 父级目录，点击左上 Logo 回到 `首页 / 门户工作台`；顶部保留页面标题、说明和主要入口按钮，本期不展示 `今日工作流 / 核心域联动` 工作流面板；下方使用四张能力卡、常用入口列表和基础流程卡，全部遵守白底/浅灰嵌套/细边框/轻 hover 规则。
- 左下角用户信息可打开账号工作区 Popover：包含 `创建 Skill`、`Skill Hub`、`权限管理` 三个入口。Popover 是产品操作入口，不是个人资料菜单；卡片应使用白底、细边框、8-10px 圆角、主色浅底 icon 容器和清晰说明文字。
- Skill Hub 使用数据管理页型：顶部摘要卡、搜索/状态/分类/标签筛选栏、紧凑表格、行内操作、详情弹窗、确认弹窗、评估验证弹窗。功能状态必须保留，视觉上统一到 Leaibot 表格和状态标签规范。
- `public/admin/index.html` / `preview.html` / `workbench.html?demo=1` 是项目固定本地预览入口；预览页必须加载同一套 `workbench.css`、`workbench-ui-polish.css`、`workbench-preview-overrides.css` 和 demo mock，不允许单独做一套脱离主工程的展示样式。
- 内容槽默认自适应填满中间可用宽度，左右内边距 `24px`，直接子内容必须 `width:100%`、`min-width:0`，不要用固定 `max-width` 造成大屏留白或右侧 AI 打开后挤压异常。
- 全站中间数据展示区必须区分“内容槽画布”“顶部主要信息色块”和“内容容器”：`.page-content` / `.content` 画布可使用从内容槽左上到右上、基于主色 `#3370FF` 的极浅蓝/青/靛连续渐变，alpha 约 `1%-3%`，必须自然过渡到浅灰画布；不要使用固定高度背景带、硬分割线、1px 高光线或明显色块断层。所有模块页面顶部 KPI / 概览指标使用基于主色推导的四种极浅辅助渐变循环（蓝、青、靛、紫），有色辅助色 alpha 必须低于 10%（推荐 2.5%-8%），白色收尾可为 100%，配同色低透明细边框 + 清晰文字层级；颜色只作为很轻的信息底，不要明显抢眼。下方链路步骤、拆解项、图表、表格、筛选区、待接口占位和大面板保持白底。该规则不是只针对“乐享运营”，必须覆盖 GEO、在职员工、企业客户、搜索后台、风控、数据查询、质量分析等全部页面。不要使用饱和色块、普通分类浅红、重复左侧线条或顶部粗色条；真正需要强调的结果卡可使用蓝色高亮底。
- 图表全站统一使用单色阶或协调的中低饱和色板，在克制的基础上提高类别辨识度；同一语义（类别 / 等级 / 状态）跨图表保持同色，饱和强色尤其红色只用于真实警示、失败、异常、严重风险。
- 后台界面使用三层浅色表面：浅灰画布、白色主卡片、浅灰嵌套/输入控件；以边框分隔为主，阴影克制但保留卡片 hover。
- 中间数据区域所有模块使用统一轻量 hover：主色浅描边、轻阴影、`translateY(-1px)`、`.14s` 过渡；不要让某个页面或某类卡片出现更重、更跳的 hover。
- 全站页面间距统一使用 `18px` section gap、`16px` module gap、`20px` card inner padding 的节奏；同页并列模块的 header 高度、行高、gap 和表格/筛选区边界必须对齐。筛选区宽屏可单行，窄屏必须用整齐网格换行，不能溢出卡片或依赖随意 margin。
- 亮/暗主题是整站能力，不是单页装饰：主题切换按钮必须同步 `body.dark-mode`、`html[data-theme]`、`localStorage.lexiang_dark`、按钮 `active/aria-pressed/title` 状态；侧栏、顶栏、中间画布、KPI 渐变卡、图表容器、表格、筛选/日期/下拉、弹窗、Popover、搜索浮层、AI 助手、AI 欢迎态、AI 气泡、AI 异常卡、状态标签、表格斑马行、首页入口序号和首页新增模块都必须跟随主题，不能出现白底孤岛或硬编码黑字；切回亮色后也不能残留暗底。
- 一种状态全站只使用一套颜色；状态标签统一为“浅底 + 实色文字 + 同色小圆点”。
- 模型 ID、API Key、哈希、日志、JSON、token 数、调用量等技术内容使用等宽字体。
- API Key / Token 默认掩码，旁边提供复制操作，绝不默认明文铺开。
- 所有交互元素必须有 hover、active、disabled、loading、focus、error 的可识别状态。
- 页面顶部筛选 / 时间范围 / 上传等操作按钮必须保持单行、`white-space: nowrap`；自定义日期范围优先用右对齐浮层承载，不得把按钮挤成两行。
- 全站日期时间输入和下拉选择统一 36px 高度、10px 圆角、白底细边框、主色 focus 外环；不得在同一个日期控件上出现内外双层重边框或旧式小号内联样式。
- Tab 选中态必须依赖 `.active` class，并显示主色文字 + 2px 主色底部指示线；切换逻辑不得只写 inline style，避免全局样式覆盖后丢失选中态。
- `AI 解读` / `问 AI` 等触发 AI 的按钮使用带小图标的主色浅渐变按钮，比普通次级按钮更突出，但仍保持 36px 紧凑高度。
- 错误提示要告诉用户“怎么修复”，不要只说“错误”。
- 不要硬编码规范外颜色；需要新颜色时先登记为 Token。

## 工作流程

只读取本次任务需要的 reference 文件，不要一次性加载全部规范。先用 `SKILL.md` 判断页面类型，再按下面顺序补充细节。

### 0. 固定使用当前项目规范

跨设备新增页面时，本步骤不可省略：先确认当前项目根目录下存在完整本 Skill 目录，再以该目录为唯一规范源。

所有设计默认都是 **联想乐享 / 乐享 AI 工作台 / Leaibot** 当前项目页面。开始前先读取 `references/leaibot-admin-ui.md`。该文件定义当前项目的视觉 DNA、三栏布局、右侧 AI 面板、KPI、筛选器、Tabs、图表、表格、客户留言、线索管理和交互行为。

如果本地有真实项目源码，必须同时读取目标页面附近代码和 `lexiang-workbench/public/admin/workbench.css`，再读取 `references/style-contract.md` 做样式准确度约束。

生成 HTML POC 时必须在 `<html>` 或根容器上使用 `data-product="leaibot"`。如果使用 `assets/page-template.html`，模板已经默认包含该标记。

### 1. 判断页面类型

先把需求归入以下页型之一：

- Dashboard / 概览页
- List / 表格列表页
- Detail / 详情页
- Form / 配置页
- Settings / 设置页
- Empty / 引导页
- Log / 技术内容页
- Permission / 成员权限页

页型结构详见 `references/page-templates.md` 与 `references/layout-grid.md`。

### 2. 读取 Token

打开 `references/design-tokens.md`。颜色、字号、间距、圆角、控件高度、阴影、层级、动效、图表色、深色模式全部从 Token 取值。生成 HTML 原型时可使用 `assets/base.css`。
如果 Token 与组件文件出现冲突，以 Token 为视觉源头；再同步修正组件或 CSS，不要在交付页面里临时覆盖。

### 3. 套布局骨架

使用 `references/layout-grid.md` 的 App Shell、12 栅格、间距节奏和页头规则。可从 `assets/page-template.html` 起步。

`assets/page-template.html` 只提供线上风格的壳层、可扩展导航、右侧 AI 助手和空白中间内容槽。中间内容必须根据用户需求和页型从零组织；模板不得预置摘要卡、筛选栏、表格、图表或辅助信息，避免影响新增需求判断。

### 4. 选择组件

使用 `references/components.md` 与专项文件：

- 表格与复杂列表：`references/table-patterns.md`
- 表单、弹窗、抽屉、反馈：`references/components.md`
- 日志、密钥、配额、分步配置：`references/components.md`
- 图标：`references/icon-rules.md`

### 5. 套品牌与字体

Logo、字体、资产使用见 `references/brand-assets.md`、`references/typography.md` 和 `references/asset-inventory.md`。本 Skill 随包提供思源黑体供 HTML POC 使用；业务工程生产接入仍需确认授权与加载方式。

### 6. 处理文案与可访问性

文案写法见 `references/content-guidelines.md`，可访问性见 `references/accessibility.md`。重点检查对比度、焦点环、Tab 顺序、错误恢复、Tooltip 和图标按钮说明。

### 7. 交付前自检

对照 `references/review-checklist.md` 与 `references/style-qa-checklist.md`。未确定的设计决策登记到 `references/gaps-to-fill.md`，不要在页面中临时发明规则。

## 输出要求

- 输出页面设计时，默认面向 PC 端，不生成移动端版本，除非用户明确要求。
- 用户没有特殊要求时，所有设计需求默认输出可直接预览的 HTML 页面；同时保留代码文件格式，方便后续迭代功能和修改样式。
- 输出 HTML POC 时，优先使用单文件 HTML 或引用 `assets/base.css` 的轻量原型，不引入重型框架。
- 对既有项目做 UI 重设计时，必须保持功能点、入口、表单、筛选、表格、图表、AI 辅助区和页面切换不丢失；只重做视觉、布局、间距、对齐和组件规范。
- 如果目标工程已经有组件库或设计系统，先映射当前乐享项目 token 与已有组件，不重复造一套无关样式。
- 页面内容用真实感中文业务示例，不使用 Lorem ipsum。
- 如果需要资产但包内缺失，使用保守占位并在说明中标记“待补充资产”。
- 评审页面时，按 Token、布局、组件、状态、可访问性、文案、品牌资产的顺序指出问题。

## 规范文件索引

| 文件 | 用途 |
|---|---|
| `references/design-tokens.md` | 颜色、状态色、图表色、排版、间距、控件、圆角、阴影、层级、动效、代码展示、深色模式 |
| `references/style-contract.md` | 样式准确度合同：源码优先级、当前 CSS 锚点、防跑偏硬规则和差异裁决 |
| `references/style-qa-checklist.md` | 样式准确度最终自检清单 |
| `references/leaibot-admin-ui.md` | 当前乐享 AI 工作台项目主规范：三栏管理台、右侧 AI 助手、Feishu-like 视觉、GEO / 运营看板、客户留言、线索管理 |
| `references/brand-assets.md` | Logo、品牌资产、品牌色关系、使用与禁止事项 |
| `references/typography.md` | 字体、字号、字重、行高、等宽内容规则 |
| `references/layout-grid.md` | App Shell、断点、栅格、间距节奏、页头规则 |
| `references/page-templates.md` | Dashboard、List、Detail、Form、Settings 等页型模板 |
| `references/components.md` | 按钮、表单、卡片、标签、反馈、导航、乐享项目专属组件 |
| `references/table-patterns.md` | 复杂表格、筛选、分页、批量操作、空/加载/错误状态 |
| `references/icon-rules.md` | 图标尺寸、颜色、按钮图标、空状态图标、缺口登记 |
| `references/content-guidelines.md` | 占位符、错误提示、空状态、Toast、数据格式、术语写法 |
| `references/accessibility.md` | 对比度、键盘、焦点、语义、状态可达性 |
| `references/asset-inventory.md` | 随包 Logo 资产与字体接入说明 |
| `references/review-checklist.md` | 最终评审清单 |
| `references/gaps-to-fill.md` | 团队待确认项与后续补充区 |
| `assets/base.css` | Token、基础组件样式、随包字体声明和 Leaibot `data-product` 变量覆盖 |
| `assets/page-template.html` | PC 后台页面起手模板；只提供线上风格壳层与空白中间内容槽，中间内容必须按需求页型生成 |
| `assets/logos/` | 随包 Logo 资产 |

## 维护规则

- 本目录是 AI 工作台项目内的唯一 canonical 设计 Skill 副本；不要再把项目外独立 skill 文件夹当作主规范直接维护。
- 修改设计决策时，优先改 Token 和专项 reference 文件，再同步到 `assets/base.css`。
- 需要兼顾历史归档或当前工作区兼容副本时，只能从 `lexiang-workbench/skill/portal-workbench-ui-design/` 单向同步出去；不要反过来长期只在归档副本里修改。
- 不要在多个文件里重复维护同一条规则；细节以专项文件为准，`SKILL.md` 只保留使用说明和核心事实。
- 新增组件时，先补 `components.md`；新增页型时，先补 `page-templates.md`；新增业务资产时，先补 `asset-inventory.md`。
- 单次页面调整不要立即写入规范；同类调整成功复用 `3-5` 次后，再自动归纳为可复用规则并更新本 Skill。
- 跨设备迁移项目时，必须确认本目录完整存在，并优先使用项目内这份 Skill，而不是用户桌面、嵌套旧 Skill 或其他机器上的旧副本。

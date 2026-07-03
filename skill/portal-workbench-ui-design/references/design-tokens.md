# 设计 Token（PC 端 · 乐享 AI 工作台）

整套规范面向当前 **联想乐享 / 乐享 AI 工作台 / Leaibot 管理台**，覆盖颜色、状态、图表、排版、间距、布局、控件、代码展示和深色模式。它是项目专属 token，不作为其他后台产品的通用视觉源。

## 设计目标

- 桌面优先，最小宽度：`1280px`
- 工具效率优先，视觉克制，信息密度偏高
- 所有页面颜色、排版、间距优先通过 CSS 变量落地
- 默认支持浅色白底工作台，可扩展深色模式
- 场景重点覆盖：运营看板、GEO 看板、流量/GMV 分析、客户留言工单、线索管理、认证审核、右侧 AI 助手

---

## 1. 总览

| 项目 | 值 | 说明 |
|------|-----|------|
| 品牌主色 | `#3370FF` | 主按钮、选中导航、链接、关键强调 |
| 表格 / 表单主力字号 | `13px` | 高密度后台的默认操作字号 |
| 默认紧凑表格行高 | `40px` | 推荐用于列表、模型表、任务表 |
| 侧栏展开宽度 | `168px` | 当前项目左侧紧凑导航宽度 |
| 右侧 AI 助手宽度 | `380px` | 当前项目默认 AI 助手面板宽度 |
| 最小应用宽度 | `1280px` | 桌面端最低适配宽度 |
| 内容区最大宽度 | `1440px` | 超宽屏居中控制 |

---

## 2. 配色

### 2.1 品牌色

| 变量 | 值 | 用途 | 状态 |
|------|-----|------|------|
| `--color-primary` | `#3370FF` | 主色；主按钮、选中导航、链接、关键强调 | 已确定 |
| `--color-primary-hover` | `#245BDB` | 主色悬停 | 推导 |
| `--color-primary-active` | `#1D4EBD` | 主色按下 | 推导 |
| `--color-primary-subtle` | `rgba(51,112,255,.08)` | 主色浅底；选中行、当前菜单、标签底 | 推导 |
| `--color-primary-border` | `rgba(51,112,255,.28)` | 主色浅边框 | 推导 |
| `--color-on-primary` | `#FFFFFF` | 主色之上的文字 | 推导 |
| `--color-accent` | `#3370FF` | 强调 / AI 点缀色，少量使用 | 已确定 |

> 当前项目用蓝色作为主操作与 AI 点缀主色，紫色只用于 GMV / 高级分析 / AI 分类辅助色，不替代主色。

### 2.2 中性梯度

| 变量 | 值 | 典型用途 |
|------|-----|----------|
| `--gray-0` | `#FFFFFF` | 卡片 / 弹窗白底 |
| `--gray-50` | `#F9F9F9` | 次级背景、表格斑马行、hover 区 |
| `--gray-100` | `#F2F2F2` | 表头底、分区底 |
| `--gray-200` | `#E5E5E5` | 浅分割线、表格内行线 |
| `--gray-300` | `#C9C9C9` | 主边框：输入框、卡片、分割线 |
| `--gray-400` | `#ABABAB` | 占位符、禁用文字、弱图标 |
| `--gray-500` | `#7B7B7B` | 次要 / 辅助文字 |
| `--gray-600` | `#5E5E5E` | 中等文字 |
| `--gray-700` | `#454545` | 强调正文、表格主文字 |
| `--gray-800` | `#252525` | 标题、最重要文字 |
| `--gray-900` | `#161616` | 侧栏深底、极深文字 |

### 2.3 语义化映射

组件开发优先使用语义变量，而不是直接使用灰阶变量。

| 变量 | 值 | 用途 |
|------|-----|------|
| `--color-canvas` | `#F5F6F8` | 页面工作台画布，非纯白 |
| `--color-bg` | `#F5F6F8` | 页面工作台背景，等同 canvas |
| `--color-bg-subtle` | `#F5F6F8` | 次级背景、表格斑马、hover 行 |
| `--color-bg-muted` | `#F1F3F5` | 嵌套元素、输入框、筛选条、表头底 |
| `--color-surface` | `#FFFFFF` | 主卡片、面板、表格容器 |
| `--color-surface-raised` | `#FFFFFF` | 浮起的主内容区 |
| `--color-surface-subtle` | `#F1F3F5` | 输入组合件、筛选条、嵌套分区 |
| `--color-surface-muted` | `#EEF1F4` | 更低层级嵌套底色 |
| `--color-border-subtle` | `#E7EAEE` | 表格内行线、faint 分隔 |
| `--color-border` | `#DDE1E6` | 主边框：输入框、卡片、分割线 |
| `--color-border-strong` | `#CBD1D8` | 强调 / hover 边框 |
| `--color-text` | `#1F2329` | 正文主文字、标题 |
| `--color-text-secondary` | `#646A73` | 次要文字、说明 |
| `--color-text-tertiary` | `#8F959E` | 辅助、占位、时间戳 |
| `--color-text-disabled` | `#ABABAB` | 禁用 |
| `--color-text-inverse` | `#FFFFFF` | 深底之上文字 |

### 2.4 语义色

| 变量 | 默认值 | 强色 | 浅底 | 用途 |
|------|--------|------|------|------|
| `--color-success` | `#16A34A` | `#15803D` | `#F0FDF4` | 成功、通过、在线 |
| `--color-warning` | `#D97706` | `#B45309` | `#FFFBEB` | 警告、待处理、配额将满 |
| `--color-danger` | `#DC2626` | `#B91C1C` | `#FEF2F2` | 错误、危险、删除、离线 |
| `--color-info` | `#0891B2` | `#0E7490` | `#ECFEFF` | 信息、中性提示、处理中 |
| `--color-purple` | `#722ED1` | `#5B21B6` | `#F5F0FF` | 新增、高级、AI、GMV 类辅助分类 |

---

### 2.5 顶部主要信息色块

页面顶部 KPI / 概览指标使用基于主色 `#3370FF` 推导的四色极浅渐变，不使用普通分类红色。有色辅助色 alpha 必须低于 `10%`，推荐 `2.5%-8%` 的信息色；白色收尾可为 `100%`，用于保持卡片干净通透。边框使用同色低透明描边，控制在 `8%-9%`。

| Token | 色系 | 推荐值 | 用途 |
|------|------|--------|------|
| `--info-grad-blue` | 主蓝 | `rgba(51,112,255,.08/.025) -> #fff` | 第 1 张 / 主总量 |
| `--info-grad-cyan` | 辅助青 | `rgba(20,184,166,.07/.025) -> #fff` | 第 2 张 / 互动、活跃、信息类 |
| `--info-grad-indigo` | 辅助靛 | `rgba(99,102,241,.07/.025) -> #fff` | 第 3 张 / 高级、月度、结构类 |
| `--info-grad-purple` | 辅助紫 | `rgba(139,92,246,.07/.025) -> #fff` | 第 4 张 / GMV、AI、补充类 |
| `--info-border-blue` | 主蓝边框 | `rgba(51,112,255,.09)` | 顶部信息卡边框 |
| `--info-border-cyan` | 辅助青边框 | `rgba(20,184,166,.08)` | 顶部信息卡边框 |
| `--info-border-indigo` | 辅助靛边框 | `rgba(99,102,241,.08)` | 顶部信息卡边框 |
| `--info-border-purple` | 辅助紫边框 | `rgba(139,92,246,.08)` | 顶部信息卡边框 |

只允许顶部主要信息色块使用这组渐变；下方链路步骤、图表、表格、筛选区、占位块、大面板保持白底。红色只用于危险 / 失败 / 告警，不用于普通分类 KPI 背景。

---

## 3. 乐享工作台状态标签

统一采用“浅底 + 实色文字 + 同色小圆点”的状态标签形式。一种状态在全站只使用一套颜色。

| 状态 | 推荐色 | 浅底 | 典型场景 |
|------|--------|------|----------|
| 运行中 / 在线 / 已部署 / 成功 | `#16A34A` | `#F0FDF4` | 模型在线、部署成功、任务通过 |
| 训练中 / 处理中 / 推理中 | `#0891B2` | `#ECFEFF` | 训练任务、推理任务、异步处理 |
| 排队 / 等待 / 草稿 | `#7B7B7B` | `#F9F9F9` | 队列、草稿、待开始 |
| 已暂停 / 已停用 | `#ABABAB` | `#F2F2F2` | 暂停部署、停用配置 |
| 警告 / 配额将满 / 降级 | `#D97706` | `#FFFBEB` | 配额预警、服务降级 |
| 失败 / 报错 / 离线 | `#DC2626` | `#FEF2F2` | 失败任务、接口错误、模型离线 |
| 进行中 / 选中 / 当前 | `#3370FF` | `rgba(51,112,255,.08)` | 当前页面、选中项、进行中状态 |

---

## 4. 数据可视化配色

### 4.1 分类色

全站图表优先使用单色阶或协调的中低饱和色板，在克制的基础上提高类别辨识度，避免高饱和原色拼接。同一语义（类别 / 等级 / 状态）在所有图表中使用同一套颜色。饱和强色，尤其红色，只用于真正需要警示的状态；普通分类数据使用中低饱和度。

落地到本地预览或业务页面时，必须同时处理三类来源：
- CSS token：在最终覆盖 CSS 中提供 `--chart-*`、`--chart-seq-*`、`--chart-danger / warning / success`。
- 图表库：ECharts、Chart.js 等应设置统一默认 palette；如果历史图表写死了旧高饱和色或过低辨识度色板，必须映射到中低饱和 token。
- DOM / Canvas 手写图：词云、进度条、迷你趋势、HTML 条形图等不走图表库的视觉元素，也必须使用同一套中低饱和 token。

| 变量 | 值 | 用途 |
|------|-----|------|
| `--chart-1` | `#3F78C5` | 默认主指标 / 普通分类 1 |
| `--chart-2` | `#3F9EAD` | 普通分类 2 |
| `--chart-3` | `#58A86A` | 普通分类 3 |
| `--chart-4` | `#C89532` | 普通分类 4 |
| `--chart-5` | `#9070C3` | 普通分类 5 |
| `--chart-6` | `#B45F86` | 普通分类 6 |
| `--chart-7` | `#6F879E` | 普通分类 7 |
| `--chart-8` | `#4F6578` | 普通分类 8 / 兜底分类 |
| `--chart-danger` | `#D24A4A` | 失败、异常、严重风险；不得用于普通分类 |
| `--chart-warning` | `#C47F24` | 预警、注意、待处理等级 |
| `--chart-success` | `#4F9B62` | 达标、完成、正向状态 |

### 4.2 顺序色

| 变量 | 值 | 用途 |
|------|-----|------|
| `--chart-seq-1` | `#EAF3FF` | 最低值 |
| `--chart-seq-2` | `#CFE3F8` | 较低值 |
| `--chart-seq-3` | `#9FC4EA` | 中间值 |
| `--chart-seq-4` | `#6EA2D7` | 较高值 |
| `--chart-seq-5` | `#3F78C5` | 最高值 |
| `--chart-grid` | `#E5E8EC` | 网格线 |
| `--chart-axis` | `#9AA3AF` | 坐标轴 / 刻度 |

---

## 5. 排版

### 5.1 字体族

| 变量 | 用途 | 默认值 | 状态 |
|------|------|--------|------|
| `--font-heading` | 标题 | `"Source Han Sans CN", "PingFang SC", "Microsoft YaHei", system-ui, sans-serif` | 已确定 |
| `--font-body` | 正文 / 界面 | `"Source Han Sans CN", "PingFang SC", "Microsoft YaHei", system-ui, sans-serif` | 已确定 |
| `--font-mono` | ID / Key / 日志 / 数字 | `"JetBrains Mono", "SF Mono", ui-monospace, monospace` | 待定 |

### 5.2 字号阶梯

| 变量 | 值 | 用途 |
|------|-----|------|
| `--text-xs` | `12px` | 标签、表格副信息 |
| `--text-sm` | `13px` | 表格、表单、按钮 |
| `--text-base` | `14px` | 正文 |
| `--text-md` | `16px` | 卡片标题 |
| `--text-lg` | `18px` | 区块标题 |
| `--text-xl` | `20px` | 页面标题 |
| `--text-2xl` | `24px` | 大标题 |
| `--text-3xl` | `30px` | 关键指标数字 |

### 5.3 字重与行高

| 变量 | 值 |
|------|-----|
| `--font-weight-normal` | `400` |
| `--font-weight-medium` | `500` |
| `--font-weight-semibold` | `600` |
| `--font-weight-bold` | `700` |
| `--leading-tight` | `1.3` |
| `--leading-normal` | `1.5` |
| `--leading-relaxed` | `1.7` |
| `--letter-spacing-default` | `0` |

字距约定：后台 UI 默认不使用负字距，也不根据视口缩放字号；英文大写分组标签仍保持 `letter-spacing: 0`，避免在高密度界面中产生抖动和截断风险。

---

## 6. 间距

采用 4px 基准。

| 变量 | 值 |
|------|-----|
| `--space-1` | `4px` |
| `--space-2` | `8px` |
| `--space-3` | `12px` |
| `--space-4` | `16px` |
| `--space-5` | `20px` |
| `--space-6` | `24px` |
| `--space-8` | `32px` |
| `--space-10` | `40px` |
| `--space-12` | `48px` |

推荐：
- 卡片内边距：`--space-4` ~ `--space-6`
- 表格单元格：纵向 `--space-2`，横向 `--space-3`
- 页面内容区左右边距：`--space-6`
- 右侧 AI 助手内部 gutter：`16px`。消息区使用 `18px 16px 16px`，输入区使用 `10px 16px 12px`，避免内容贴住面板边界。

---

## 7. 控件尺寸与表格密度

| 变量 | 值 | 用途 |
|------|-----|------|
| `--control-height-sm` | `28px` | 表格内联操作、紧凑筛选 |
| `--control-height-md` | `36px` | 默认按钮 / 输入框 |
| `--control-height-lg` | `44px` | 突出主操作 |
| `--row-height-compact` | `40px` | 紧凑表格行，默认推荐 |
| `--row-height-default` | `48px` | 常规表格行 |
| `--row-height-comfy` | `56px` | 含头像 / 多行信息的行 |
| `--icon-sm` | `16px` | 小图标 |
| `--icon-md` | `18px` | 默认图标 |
| `--icon-lg` | `20px` | 大图标 |

---

## 8. 桌面布局尺寸

| 变量 | 值 | 用途 |
|------|-----|------|
| `--header-height` | `48px` | 顶栏 |
| `--sidebar-width` | `168px` | 侧栏展开 |
| `--sidebar-width-collapsed` | `56px` | 侧栏收起，仅图标 |
| `--ai-panel-width` | `380px` | 右侧 AI 助手默认宽度 |
| `--content-max` | `1440px` | 内容区最大宽度 |
| `--content-padding` | `24px` | 内容区左右内边距 |
| `--min-app-width` | `1280px` | 最小支持宽度 |

当前项目骨架：
- 左侧栏：可收起，默认 168px
- 顶栏：48px，承载面包屑、搜索、亮暗切换、AI 助手开关
- 右侧 AI 助手：默认 380px，打开时顶栏 AI 开关隐藏，可拖拽扩宽到约 492px
- 内容区：最大 1440px，超宽屏居中

---

## 9. 圆角

| 变量 | 值 | 用途 |
|------|-----|------|
| `--radius-sm` | `4px` | 标签、徽标 |
| `--radius-md` | `8px` | 按钮、输入框、紧凑卡片 |
| `--radius-lg` | `12px` | 大卡片、弹窗 |
| `--radius-full` | `9999px` | 头像、圆点、胶囊 |

> 当前项目使用 8px 控件圆角和 12px 大卡片圆角，保持轻量、柔和但不做胶囊化。

---

## 10. 边框、阴影、层级与动效

### 10.1 焦点与边框

| 变量 | 值 |
|------|-----|
| `--border-width` | `1px` |
| `--focus-ring` | `0 0 0 3px var(--color-primary-subtle)` |

### 10.2 阴影

当前项目以边框分隔为主，阴影保持克制。

| 变量 | 值 | 用途 |
|------|-----|------|
| `--shadow-xs` | `0 1px 2px rgba(0,0,0,.05)` | 按钮 / 输入框 |
| `--shadow-surface` | `0 1px 2px rgba(15,23,42,.035)` | 主卡片默认轻浮起 |
| `--shadow-sm` | `0 1px 3px rgba(0,0,0,.08)` | 卡片 / 下拉 |
| `--shadow-md` | `0 4px 12px rgba(0,0,0,.08)` | 悬浮面板 |
| `--shadow-card-hover` | `0 1px 2px rgba(15,23,42,.035), 0 6px 14px rgba(15,23,42,.055)` | 中间数据模块轻量 hover |
| `--shadow-lg` | `0 12px 28px rgba(0,0,0,.14)` | 弹窗 / 抽屉 |
| `--central-module-hover-border` | `rgba(51,112,255,.36)` | 中间数据模块 hover / selected 主色描边 |
| `--central-module-hover-shadow` | `0 1px 2px rgba(15,23,42,.035), 0 6px 14px rgba(15,23,42,.055)` | 中间数据模块轻量浮起 |
| `--central-module-hover-transform` | `translateY(-1px)` | 中间数据模块轻微位移 |
| `--central-module-hover-transition` | `border-color .14s ease, box-shadow .14s ease, background-color .14s ease, transform .14s ease` | 中间数据模块统一过渡 |

### 10.3 层级

| 变量 | 值 | 用途 |
|------|-----|------|
| `--z-base` | `0` | 基础层 |
| `--z-sticky` | `100` | 吸顶 / 固定区域 |
| `--z-dropdown` | `1000` | 下拉 |
| `--z-overlay` | `1050` | 遮罩 |
| `--z-modal` | `1100` | 弹窗 |
| `--z-toast` | `1200` | 通知 |

### 10.4 动效

| 变量 | 值 |
|------|-----|
| `--duration-fast` | `120ms` |
| `--duration-normal` | `200ms` |
| `--duration-slow` | `300ms` |
| `--ease-out` | `cubic-bezier(.16,1,.3,1)` |
| `--ease-in-out` | `cubic-bezier(.4,0,.2,1)` |

中间数据区域的卡片、图表、表格容器、链路节点、筛选型指标卡等使用同一套轻量 hover：边框切到 `--central-module-hover-border`，阴影用 `--central-module-hover-shadow`，位移只允许 `translateY(-1px)`。该 hover 不套用到右侧 AI 面板、按钮、Tab、表格行或输入框。

---

## 11. 技术内容与日志展示

乐享工作台中，ID、Key、哈希、token 数、日志、JSON、关键数字等内容应统一使用等宽字体。

| 变量 | 值 | 用途 |
|------|-----|------|
| `--code-bg` | `#1A1A1A` | 代码块 / 日志深底 |
| `--code-bg-inline` | `#F2F2F2` | 行内 code 浅底 |
| `--code-text` | `#E5E5E5` | 代码块文字 |
| `--code-border` | `#333333` | 代码块边框 |
| `--log-debug` | `#ABABAB` | 日志 debug |
| `--log-info` | `#3370FF` | 日志 info |
| `--log-warn` | `#D97706` | 日志 warn |
| `--log-error` | `#EF4444` | 日志 error |

使用约定：
- 模型 ID / Key / 哈希 / token 数一律用等宽字体
- API Key 默认掩码，例如 `sk-••••3a9f`
- API Key 旁提供复制按钮
- 长 JSON / 日志放入可滚动深底代码面板
- 技术内容不要混入普通正文段落中

---

## 12. 深色模式

深色模式挂载在 `body.dark-mode` + `html[data-theme="dark"]` 上，亮色为 `html[data-theme="light"]`。切换状态写入 `localStorage.lexiang_dark`，并同步主题按钮的 `active`、`aria-pressed`、`title` 和 `aria-label`。主色在深色模式下提亮一档，提升可见性。

| 变量 | 深色值 |
|------|--------|
| `--color-bg` | `#121212` |
| `--color-surface` | `#1C1C1C` |
| `--color-bg-subtle` | `#1C1C1C` |
| `--color-bg-muted` | `#262626` |
| `--color-border` | `#3A3A3A` |
| `--color-border-strong` | `#4D4D4D` |
| `--color-text` | `#EDEDED` |
| `--color-text-secondary` | `#B5B5B5` |
| `--color-text-tertiary` | `#7B7B7B` |
| `--color-primary` | `#4B91FF` |
| `--color-purple` | `#A78BFA` |
| `--chart-1..8` | 深色主题下使用同组中低饱和提亮色，保持类别映射不变 |
| `--chart-seq-1..5` | 深色主题下使用同一蓝灰单色阶 |
| `--chart-danger / warning / success` | 深色主题下仅用于对应语义状态 |
| `--color-primary-subtle` | `#16264A` |
| `--code-bg` | `#0D0D0D` |
| `--central-module-hover-border` | `rgba(122,162,255,.42)` |
| `--central-module-hover-shadow` | `0 1px 2px rgba(0,0,0,.22), 0 6px 14px rgba(0,0,0,.20)` |

深色模式必须覆盖整站真实页面元素：侧栏、顶栏、中间画布、右侧 AI 助手、首页门户模块、KPI/概览渐变卡、表格、表格斑马行、图表容器、筛选条、日期时间输入、下拉选择、搜索浮层、Popover、Modal、Badge/Status pill、首页入口序号、AI 欢迎态、AI 异常卡、AI 解读按钮和 AI 对话气泡。新增页面只能使用语义变量和既有组件类扩展，不允许留下 `#fff` 背景、硬编码深色文字或与暗色主题脱节的原生控件；亮色恢复时不得残留深色 surface。

---

## 13. 乐享工作台界面骨架建议

### 13.1 侧栏

推荐结构：
- 乐享运营：运营总览、Query 分析、质量分析、流量分析、GMV 分析
- GEO 看板：整体数据概览、各平台信源分布、各平台意图分布、GEO 转化看板、手工上传知识
- 在职员工管理：概览、认证审核
- 客户留言：留言工单
- 线索管理：线索看板、线索池

侧栏默认使用浅色 `--color-surface`，右侧用 `--color-border` 分隔；当前菜单使用 `--color-primary-subtle` 底 + 主色文字。仅在明确启用深色主题时，侧栏才跟随深色模式 token。

### 13.2 顶栏

推荐高度：`48px`

承载内容：
- 面包屑
- 当前页面标题
- 搜索框
- 亮暗切换图标按钮
- AI 助手开关；右侧 AI 助手打开时隐藏

### 13.3 内容区

推荐内容组合：
- 筛选工具栏
- 主操作按钮
- 数据表格
- 状态标签
- 分页 / 批量操作

表格推荐：
- 表头背景：`#F2F2F2`
- 表格行高：`40px`
- 行分割线：`#E5E5E5`
- 斑马行：`#F9F9F9`

### 13.4 浅色表面层级

当前 Leaibot 后台保持浅色风格，但必须避免“整页纯白没有层次”：
- 页面画布使用 `--color-canvas`。当前确认版中间内容槽 `.page-content` / `.content` 可叠加很轻的连续渐变：使用低透明蓝/青径向面光叠加极浅 `105deg` 主色方向渐变，再叠加浅灰画布渐变；不要使用 `top / 220px no-repeat` 这类固定高度色带，也不要出现 1px 分割线、高光线或突然回灰的断层。
- 主卡片、侧栏、顶栏、右侧 AI 面板使用 `--color-surface` / `--color-surface-raised` 纯白。
- 输入框、筛选条、表头、AI 输入组合件、嵌套分区使用 `--color-surface-subtle`。
- 卡片默认只用轻边框和 `--shadow-surface`；中间数据模块 hover 使用主色浅描边 + `--central-module-hover-shadow` + `translateY(-1px)`，保持轻量过渡，不使用重浮层阴影。
- 阴影层级控制在 1-2 层以内，不让每个元素都像浮层。

---

## 14. 交付前自检清单

- [ ] 颜色全走 `--color-*` 语义变量，无硬编码 hex
- [ ] 字号来自字号阶梯；正文 14px、表格 13px
- [ ] 间距使用 4px 基准 token
- [ ] 表格默认使用紧凑行高
- [ ] 状态标签同状态全站同色
- [ ] ID / Key / 数字使用等宽字体
- [ ] API Key 默认掩码并提供复制操作
- [ ] 控件高度走 `--control-height-*`
- [ ] 键盘焦点环明显且一致
- [ ] 正文和辅助文字对比度达标
- [ ] 深色模式覆盖值与默认主题保持语义一致
- [ ] 图表颜色优先使用 `--chart-*`、`--chart-seq-*` 或语义图表变量；普通分类避免高饱和原色拼接，强红只用于警示状态

---

## 15. 适用范围

适用于：
- 当前联想乐享 / 乐享 AI 工作台 / Leaibot 管理台
- 当前项目新增需求 HTML 预览页
- 当前项目运营、GEO、员工管理、客户留言、线索管理、AI 助手相关页面

不建议直接用于：
- 其他品牌或其他系统的后台
- 通用 AI 后台管理系统
- 营销官网
- 移动端 C 端页面
- 大面积情绪化视觉设计
- 非高密度信息产品

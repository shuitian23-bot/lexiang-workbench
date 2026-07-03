# 门户工作台样式合同

本文件只用于提高现有项目样式应用准确度。它不是新的通用设计系统，也不替代根目录 `SKILL.md`。

需要完整设计规范时读取根目录 `SKILL.md` 和下列专项文件：

- `references/design-tokens.md`
- `references/leaibot-admin-ui.md`
- `references/components.md`
- `references/page-templates.md`

需要 HTML POC 模板、基础 CSS、字体或 Logo 时使用根目录 `assets/`。

## 真实源码锚点

优先从 `lexiang-workbench/public/admin/workbench.css` 提取当前有效样式。关键变量和结构如下：

```css
:root {
  --primary: #3370ff;
  --primary-light: rgba(51,112,255,0.08);
  --primary-hover: #245bdb;
  --red: #e2001a;
  --bg: #f5f6f7;
  --sidebar-bg: #fff;
  --card-bg: #fff;
  --border: #dee0e3;
  --border-light: #e5e6eb;
  --text: #1f2329;
  --text-secondary: #646a73;
  --text-tertiary: #8f959e;
  --shadow: 0 1px 2px rgba(0,0,0,0.06);
  --shadow-md: 0 4px 12px rgba(0,0,0,0.08);
  --radius: 8px;
  --radius-lg: 12px;
}
```

优先复用这些变量，不要硬编码同义新色。需要补充新色时，先判断是否已有语义变量或同类组件可复用。

## 布局合同

- 页面是工作台，不是 landing page。
- 默认结构为左侧导航、顶部栏、中间业务内容、右侧 AI 助手。
- 截图和 `assets/page-template.html` 只校准线上壳层、信息密度、控件尺寸和 AI 助手形态；模板中间内容槽必须保持空白，中间业务内容按具体需求选择 Dashboard / List / Detail / Form / Settings 等页型重新组织。
- 左侧导航现行紧凑宽度以真实 CSS 为准：展开 `168px`，收起 `56px`。历史 `240px` 侧栏只作为旧 demo 参考，不用于新增页面。
- 导航会随新增需求持续扩展；新增模块应追加到现有分组结构中，保持 168px 宽度、32-34px 行高、active 子菜单样式和收起态行为，不要为单个新需求重做导航视觉。
- 顶部栏以真实 CSS 为准，当前常见高度为 `48px`。如果某页面仍使用旧 `52px`，优先对齐同模块现行页面。
- 中间内容区使用 `padding: 20px 24px` 或同模块现有节奏，避免随意加大为营销页留白。
- 当前确认版中间内容槽可使用极浅连续渐变：从内容槽左上到右上，以 `#3370ff` 推导的蓝/青/靛低透明色（约 `1%-3%`）自然过渡到浅灰画布；不要做固定高度色带、1px 分割线、装饰光斑、硬断层或整页营销背景。
- AI 临时报告页签只在右侧 AI 长报告展开时出现，位置必须在面包屑下方、内容槽上方；其存在不能改变左侧导航选中态或普通页面切换逻辑。
- 内容最大宽度、KPI 栅格、筛选区换行规则优先参考当前页面实际实现。
- 右侧 AI 面板宽度以真实 CSS 和当前页面 JS 交互为准；当前确认版默认 `380px`，可拖拽扩宽到约 `492px`。

## 颜色合同

- 主操作、选中导航、链接、AI 轻强调：`--primary` / `#3370ff`。
- 主色 hover：`--primary-hover` / `#245bdb`。
- 主色浅底：`--primary-light` / `rgba(51,112,255,0.08)`。
- 联想红：`--red` / `#e2001a`，只用于品牌标识、危险提示或少量强调。
- 画布：`--bg` / `#f5f6f7`。
- 卡片：`--card-bg` / `#fff`。
- 主文字：`--text` / `#1f2329`。
- 次要文字：`--text-secondary` / `#646a73`。
- 辅助文字：`--text-tertiary` / `#8f959e`。
- 边框：`--border` / `#dee0e3`，轻边框：`--border-light` / `#e5e6eb`。

不要引入高饱和紫蓝渐变、大面积红色、彩虹图表色、深蓝黑控制台主题或纯白无层级背景。

## 排版合同

- 字体族沿用项目：`-apple-system, 'PingFang SC', 'Helvetica Neue', 'Microsoft YaHei', sans-serif`。
- 页面正文默认 `14px`。
- 导航、表格、筛选、按钮、状态标签多用 `12px` 到 `13px`。
- 页面标题常用 `18px` 到 `20px`，卡片标题常用 `15px` 到 `16px`。
- KPI 数字可用 `24px` 到 `30px`，但不要扩大成营销海报视觉。
- 字距保持 `0`，不要使用负字距或随视口缩放字号。
- ID、Key、日志、JSON、token、调用量等技术内容使用等宽字体。

## 组件合同

### 按钮

- 复用 `.btn`、`.btn-primary`、`.btn-secondary`、`.btn-danger`、`.btn-sm` 的结构。
- 常规按钮保持紧凑，不要做超大 CTA。
- 按钮文本不换行；图标和文字间距保持 `4px` 到 `6px`。
- 主要按钮只用于当前区域的主动作。

### 卡片

- 卡片使用白底、细边框、`8px` 或 `12px` 圆角、轻阴影 hover。
- 页面区块不要层层套卡片。需要嵌套信息时使用浅灰底、分隔线或紧凑表格。
- KPI 顶部信息卡可以有极浅主色衍生背景，下方表格、筛选、图表容器保持白底。

### 表格和筛选

- 表格字号 `13px`，表头 `12px`，行高偏紧凑。
- 表头使用弱文字色和底部分割线，不做大面积深色表头。
- 筛选区控件高度约 `36px`，边框、圆角、focus 与 `.form-input` 保持一致。
- 宽屏筛选尽量单行；窄屏用整齐 grid 换行，不让按钮或日期范围被挤成两行。

### 状态标签

- 状态标签使用浅底 + 实色文字。
- 红色只表示危险、失败、离线、删除，不用于普通分类。
- 同一种状态在全站保持同一颜色。

### AI 助手

- AI 面板必须作为工作台右侧辅助区，不做成全屏聊天应用。
- 面板背景、边框、头部、快捷问题、输入区跟随当前 CSS。
- 打开、关闭、拖拽、暗色模式等行为必须保留现有交互。

## 禁止混入的风格

- Ant Design 默认大间距后台。
- shadcn 默认圆角卡片堆叠。
- 营销官网 hero、宣传大标题、价值主张卡片。
- 玻璃拟态、霓虹渐变、装饰光斑、大面积深色科技风。
- 仅靠 inline style 实现状态，导致 class 和全局样式失效。
- 单页独立 CSS 与 `workbench.css` 明显冲突。
- 使用历史 demo 的 `240px` 侧栏、旧 chat 渐变头像作为新增页面标准。

## 样式差异处理

如果发现根目录 `SKILL.md`、reference、历史 HTML 和当前 CSS 不一致：

1. 不要临时发明新视觉规则。
2. 先按当前真实页面和 `workbench.css` 落地。
3. 在最终说明中简短记录采用了哪个来源。
4. 若用户要求沉淀规范，再单独修改根目录 `SKILL.md`、对应 reference 或 `assets/base.css`。

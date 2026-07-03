# 资产清单（Asset Inventory）

生成界面时优先复用以下随包资产，不要临时找替代字体或自造 Logo。
若需要的资产缺失，明确说明缺口并用保守占位，不要发明另一套品牌标识。

---

## 字体 Fonts

本 Skill 随包提供思源黑体（Source Han Sans CN）用于 HTML POC 和静态原型。字体规范见 `typography.md`；
业务工程落地时仍需确认授权与正式接入方式。

| 文件 | 字重 | 用途 |
|------|------|------|
| `assets/fonts/SourceHanSansCN-Regular.otf` | 400 | 正文、表格、表单 |
| `assets/fonts/SourceHanSansCN-Medium.otf` | 500 | 标签、按钮、强调文字 |
| `assets/fonts/SourceHanSansCN-Bold.otf` | 700 | 标题、关键数字 |

## Logo

横版（Horizontal，1600×321）：

| 文件 | 说明 | 使用场景 |
|------|------|---------|
| `assets/logos/lenovo-logo-red-h.png`    | 红底品牌主标（POS-Red） | 品牌强调、封面、白底之外的强展示 |
| `assets/logos/lenovo-logo-black-h.png`  | 正黑版（POS-Black） | 浅色背景的标准锁版 |
| `assets/logos/lenovo-logo-1color-h.png` | 单色版（POS-1Color） | 单色印刷 / 受限场景 |
| `assets/logos/lenovo-logo-rev-h.png`    | 反白版（REV-1Color） | **深色背景**（深色模式顶栏/侧栏） |

竖版与紧凑：

| 文件 | 说明 | 使用场景 |
|------|------|---------|
| `assets/logos/lenovo-logo-rev-v.png` | 竖版反白（REV-1Color-V，1600×7869） | 竖向排布、窄栏 |
| `assets/logos/lenovo-logo-small.jpg` | 紧凑小标（200×200） | 收起侧栏的缩略标、favicon 级场景 |

使用约定：
- 浅色背景用 `black-h` 或 `red-h`；深色背景用 `rev-h` / `rev-v`，保证对比度。
- 侧栏展开用横版，收起（56px）用紧凑小标。
- 不拉伸变形、不重新着色、不替换字体，保持锁版完整。
- 生成 HTML 原型时把用到的 Logo 复制进输出目录，用相对路径引用。

> ⚠️ 品牌色提醒：当前 UI 设计 token 主色为蓝色 `#3370FF`，而以上为联想红品牌标识。
> 二者并存时，建议：Logo 用品牌红，功能性 UI（按钮/选中/链接）仍用 `#3370FF`，
> 避免红蓝在同一界面争夺注意力。如需把产品主色也统一为联想红，请告知，会同步调整 token。

---

## 缺口登记（待补）

以下类别尚未随包提供，需要时补充：

- ⬅ UI 图标集（搜索/新建/发送/删除/复制/重试/更多等线性图标 SVG）
- ⬅ 助手 / 产品头像（如有对话或 AI 生成内容场景）
- ⬅ 空状态 / 引导插画

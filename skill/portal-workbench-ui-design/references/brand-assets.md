# 品牌与资产规范

## 1. 品牌标识 Logo

### 1.1 Logo 基础信息

| 属性 | 值 |
|---|---|
| Logo 图片地址 | `https://p4.lefile.cn/fes/cms/2021/09/24/skz7mq0zavm0hd8xfaq0nrofxcwje3959207.png` |
| 推荐用法 | `<img src="[上方地址]" alt="Lenovo 联想" />` |
| 本地资产 | 见 `assets/logos/` |

### 1.2 随包 Logo 资产

| 文件 | 说明 | 推荐场景 |
|---|---|---|
| `assets/logos/lenovo-logo-red-h.png` | 红底横版品牌主标 | 品牌露出、封面、较强品牌展示 |
| `assets/logos/lenovo-logo-black-h.png` | 黑色横版 | 浅色背景、后台侧栏顶部、普通品牌露出 |
| `assets/logos/lenovo-logo-1color-h.png` | 单色横版 | 受限色彩场景 |
| `assets/logos/lenovo-logo-rev-h.png` | 反白横版 | 深色背景、深色模式顶栏 / 侧栏 |
| `assets/logos/lenovo-logo-rev-v.png` | 反白竖版 | 竖向排布、窄栏特殊场景 |
| `assets/logos/lenovo-logo-small.jpg` | 紧凑小标 | 侧栏收起态、favicon 级场景 |

### 1.3 使用规则

- Logo 不可变色、不可拉伸、不可裁切、不可加描边、不可重排。
- 背景必须保持足够对比度；浅底优先黑色 / 红色横版，深底优先反白版。
- 侧栏展开态使用横版 Logo；侧栏收起态使用紧凑小标。
- Logo 周围保留安全区，不贴边、不与导航文字混排过近。
- 不要把 Logo 当作按钮、状态图标或装饰纹理使用。

## 2. 品牌色与 UI 主色关系

当前乐享工作台 UI 功能主色为 `#3370FF`，用于按钮、链接、选中态、焦点环和关键强调。Logo 保持品牌原色，不强制把所有 UI 主色改成 Logo 红。

建议关系：

- **Logo**：使用品牌资产原色。
- **功能 UI**：继续使用 `--color-primary: #3370FF`。
- **危险 / 删除**：使用 `--color-danger`，不要用 Logo 红代替。
- **AI 点缀色**：默认等于主色，如需区分可补紫色系并登记为 Token。

如团队决定将产品主色统一为联想红，必须同步修改 `design-tokens.md`、`assets/base.css`、图表主色、焦点环、选中态和状态映射，不能只改按钮。

## 3. 品牌落位建议

| 场景 | 建议 |
|---|---|
| App Shell 侧栏 | Logo 放侧栏顶部，与一级导航同列 |
| 侧栏收起 | 使用紧凑小标，居中展示 |
| 顶栏 | 不重复大 Logo，可放产品名 / 面包屑 |
| 登录 / 空状态 | 可适度增强品牌露出 |
| 深色模式 | Logo 不变色，调整承载背景或切换反白版本 |

## 4. 禁止事项

- 不要重新绘制 Lenovo Logo。
- 不要使用未经登记的品牌变体。
- 不要为了适配深色模式而给 Logo 临时加滤镜。
- 不要把 Logo 红作为错误色、警告色或状态色混用。

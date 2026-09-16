# 对话定位导航

- 用户约定名称：**对话定位导航**。
- 识别用语：圆点导航、点点点、对话问题列表、对话轮次索引。
- 用户说「恢复对话定位导航」「显示对话定位导航」，或在恢复功能的语境中直接说这个名称，即恢复本功能；无需重新设计。
- 2026-09-16 状态：暂时隐藏。分屏与全屏均隐藏圆点入口及其展开的问题列表，原有功能和对话数据保留。
- 适用页面：首页、个人及家庭、中小企业、政教及大企业、品牌。

## 恢复方式

从 p0.leaibot.cn 对应的当前生产代码取最新基线，按项目发布规则增量修改。不要用旧本地页面覆盖线上。

把以下五个文件的 html 元素上 `data-lx-conversation-location-nav="hidden"` 改为 `data-lx-conversation-location-nav="visible"`：

- `public/leaip0/index.html`
- `public/leaip0/shop-chat/index.html`
- `public/leaip0/b-chat/index.html`
- `public/leaip0/biz-chat/index.html`
- `public/leaip0/brand/index.html`

控制样式：`public/leaip0/assets/frontend/css/core/conversation-location-navigation-v1.css`。
原组件：分屏 `.assistant-panel .page-dots`（内含 `.prompt-menu`），全屏 `.lxfd-turn-index`（内含圆点与问题列表）。
隐藏通过根元素属性控制，不删除组件、不清空历史、不修改轮次定位逻辑，也不影响页面轮播圆点。
恢复后验证已有多轮对话时分屏/全屏的圆点、问题列表和点击定位，并更新此文档及当日更新日志。

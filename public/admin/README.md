# Legacy HTML Workbench

`public/admin/` 是门户工作台旧 HTML 版本目录，保留用途如下：

- 兼容历史 `/admin/workbench.html`、`/admin/index.html` 等访问链路。
- 回查早期 POC 交互、样式和演示数据。
- 作为 Vue 工作台重建时的历史参考。

当前主维护入口已经切到 Vue 架构：

- 源码：`vue-app/`
- Vue 页面：`vue-app/src/views/`
- Vue 样式：`vue-app/src/assets/`
- 运行时适配资源：`vue-app/public/admin-runtime/`
- 构建产物：`public/admin-vue/`，不入 Git。

维护约定：

- 新功能不要优先写入 `public/admin/*.js` 或 `public/admin/*.css`。
- 如需修复旧正式链接的兼容问题，可以局部修改本目录，但必须在提交说明里标明是 Legacy HTML 兼容修复。
- 与 Vue 工作台相同的业务逻辑，应以 `vue-app/` 为准。

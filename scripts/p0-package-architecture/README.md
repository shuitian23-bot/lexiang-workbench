# P0 前端业务模块

22 类页面、24 类弹窗/轻提示和 common、agent-content 两套公共包，均已拥有真实实现。唯一发布入口是 `public/leaip0/modules/` 下的 48 对 index.css/index.js，共96个文件。`registry.json` 记录实际路径。

JavaScript 业务函数位于对应模块的 factories 中，通过活绑定上下文读写原业务状态；页面初始化片段位于 sources 中。common 的兼容调度器按原文档位置和懒加载时机执行经典脚本，避免改变全局词法绑定、脚本顺序和 CSS 覆盖顺序。

CSS 文件保存原生业务规则，按 `@media (-p0-part: ...)` 标记片段。common 按原资源的顺序在原锚点挂载这些规则；不以模块文件排列顺序改变级联。JavaScript 里原有静态内嵌样式也迁入对应 CSS 包，动态样式表达式保留。

五个入口及所有动态加载器均引用新模块。旧199个公开JS/CSS已由迁移脚本从候选目录移除。`scripts/p0-source-runtime/` 等旧源码仅作为非公开历史输入保留，不会被浏览器加载或重新打包发布。

校验：`node scripts/validate-p0-public-assets.cjs` 或 `node scripts/build-p0-home-assets.cjs --check`。新增业务直接修改相应模块，保留 factory ID、上下文接口、执行槽位和已有业务事件；不能只编辑历史源码。

一次性迁移工具在 `scripts/p0-modules/`。它只从指定的隔离基线读取，不能在生产目录运行。工具依赖 acorn、eslint-scope、postcss 和 parse5；可通过 P0_NODE_MODULES 指定开发依赖目录。

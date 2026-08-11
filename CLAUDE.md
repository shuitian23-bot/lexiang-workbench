# 联想门户工作台 0803 上手说明

## 项目定位

- 项目：联想乐享 / 乐享 AI 工作台门户 POC
- 当前版本：`lexiang-new-0803`
- Vue 工程：`vue-app/`
- 本地预览前缀：`/admin-vue/`
- 统一设计规范：`skill/portal-workbench-ui-0803`
- 参考功能基线：0730

本项目用于本地设计验证、研发实现和交互演示，不对应 `leaibot.cn` 生产购物助手。不要套用旧的 `lenovo-leai-pc-design` 或线上部署规则。

## 开工顺序

1. 读取 `skill/portal-workbench-ui-0803/SKILL.md`。
2. 按页面和交互范围读取 Skill 中指定 references。
3. 将 `vue-app/` 作为 `<app-root>`，先检查目标源码、页面矩阵与用户需求，再做局部、可回退的修改。
4. 在真实浏览器中验证交互，不只检查静态代码。

项目内 Skill 是 PM、UI 与研发共用的分发副本，不依赖个人机器路径或项目/Skill 哈希。

## 常用命令

在 `vue-app/` 目录执行：

```bash
pnpm dev --host 127.0.0.1 --port 41730
pnpm guard:design-skill
pnpm lint
pnpm typecheck
pnpm build
pnpm smoke:shell
```

若系统找不到 `node`，使用当前开发环境提供的 Node 与 pnpm 可执行文件，不要修改项目依赖来规避环境问题。

## UI 验收重点

- Agent 默认收起且收起区域不可被键盘聚焦；展开、关闭和拖宽会触发内容槽重新布局。
- AI 报告使用 Topbar 单一结果选择器，不出现第二行动态页签。
- 弹窗操作区右对齐，具备对话框语义、焦点锁定、Esc 关闭与焦点恢复。
- 权限管理使用常驻分组二级导航，面板铺满内容区高度并在菜单增多时内部滚动。
- 最后一个静态页签可关闭，关闭后回到门户首页。
- 1280px 浏览器宽度并将 Agent 拖到 492px 时，业务页面不能出现页面级横向滚动。
- 当前发布保持浅色模式；主题切换入口隐藏。
- 使用源码对比、规则检查和工程验证判断兼容性，不使用项目或 Skill 哈希作为门槛。

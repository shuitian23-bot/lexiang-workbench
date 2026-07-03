# 乐享 AI 工作台 — Vue 3 源码包

本包是 Vue 源码，不是 `public/admin-vue` 运行产物。0703 版本已把权限管理 POC 回写到 `src/views/agent/AgentPermissionsView.vue`，并在源码侧引入 0702 设计规范样式 `src/assets/ui-0702-design-skill.css`。

## 快速启动（本地预览）

```bash
# 进入项目目录
cd vue-app

# 安装依赖（首次）
npm install

# 启动开发服务器（热更新）
npm run dev
# → 浏览器打开 http://localhost:5173

# 生产构建
npm run build
```

## 技术栈

| 层级 | 技术 |
|------|------|
| 框架 | Vue 3 (Composition API / \`<script setup>\`) |
| 构建 | Vite 5 |
| 路由 | vue-router 4（History 模式） |
| 状态 | Pinia |
| 图表 | ECharts 5 |
| 样式 | 复用原版 CSS，并叠加 0702 设计规范样式 |

## 目录结构

```
vue-app/
├── index.html              # 入口（含 data-product="leaibot"）
├── vite.config.js          # Vite 配置（/api 代理 → localhost:3000）
├── src/
│   ├── main.ts             # 挂载 App + 导入全部 CSS
│   ├── App.vue             # 根组件
│   ├── router/index.ts     # 路由表（所有页面路由）
│   ├── stores/
│   │   ├── app.js          # 全局状态（用户/菜单/页签/侧栏）
│   │   └── ai.js           # AI 面板状态
│   ├── components/
│   │   ├── AppLayout.vue   # 三栏布局容器
│   │   ├── AppSidebar.vue  # 侧边导航（含 peek 模式）
│   │   ├── AppTopbar.vue   # 面包屑 + 静态页签栏
│   │   ├── AppAIPanel.vue  # AI 助手面板（含拖拽调宽）
│   │   └── TempTabView.vue # AI 报告临时页签内容区
│   ├── views/              # 各模块页面（按分组目录）
│   └── assets/             # 原版 CSS + 设计规范覆盖层
└── public/assets/          # 静态图片资源
```

## 本次源码侧变更

- `src/views/agent/AgentPermissionsView.vue`：权限管理从占位页补成可操作 POC，包含权限申请五步链路、审批列表、角色管理、用户管理、组织管理、数据源管理、功能管理和删除备份。
- `src/components/shell/sidebar/WorkbenchSidebar.vue`：账号入口中的权限管理改为进入 `/agent/permissions`，并补充调整日志记录。
- `src/components/sidebar/SidebarFooter.vue`：权限管理入口说明改为当前可用能力描述。
- `src/main.ts`：引入 `src/assets/ui-0702-design-skill.css`，让样式覆盖存在于 Vue 源码层。

## 后端接口代理

开发时 Vite 将 `/api/*` 代理到 `http://localhost:3000`，与原版保持一致。

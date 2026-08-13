# 乐享 AI 工作台 0812 — Vue 3 源码包

本目录是门户工作台主维护源码。仓库根目录的 `public/admin-vue/` 是构建产物，不是源码入口。

## 技术栈

- Vue 3 + Vite 5
- Vue Router 4
- Pinia
- TypeScript strict mode
- ECharts 5
- 基础路径 `/admin-vue/`

## 设计合同

开始页面设计、实现或评审前，读取：

```text
../skill/portal-workbench-ui-0812/SKILL.md
```

该 Skill 是 PM、UI 和研发共用的可移植分发副本。将当前目录作为 `<app-root>`；不依赖个人机器路径、固定项目目录名或项目/Skill 哈希。

## 快速启动

```bash
pnpm install --frozen-lockfile
pnpm dev
```

默认访问 `/admin-vue/`。代理后端不可用时，部分页面会使用预览或回退数据；这不代表真实 API 状态已经验收。

## 验证

```bash
pnpm guard:design-skill
pnpm lint
pnpm typecheck
pnpm build
pnpm smoke:shell
```

如默认 smoke 端口被占用，可指定其他空闲端口：

```bash
PORTAL_SMOKE_PORT=4174 pnpm smoke:shell
```

guard 检查统一 Skill 类型、建议版本、全局 CSS 和封板表面；它不计算或要求内容哈希。

## 维护边界

- 页面和壳层实现位于 `src/`。
- 公共 token 与已登记全局样式位于 `src/assets/`；页面私有样式优先放在对应 Vue SFC。
- `public/admin-runtime/` 只承载已登记兼容资源，不新增散落的全局 DOM bridge。
- `NativeWorkbenchPage` 只用于页面矩阵中登记的隐藏/详情兼容路由。
- `public/admin-vue/`、`node_modules/`、`.vite/`、`dist/` 和 `tsconfig.tsbuildinfo` 不进入归档。

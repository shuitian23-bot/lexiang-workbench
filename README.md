# 联想乐享 AI 工作台 0803

本目录是门户工作台 0803 可移植源码交付版，以 0730 已确认项目及 2026-08-03 的最新修改为基础，并统一使用项目随附的 `portal-workbench-ui-0803` 设计 Skill。

## 主要入口

| 路径 | 用途 |
|---|---|
| `vue-app/` | Vue 3 工作台主维护源码与工程命令入口 |
| `vue-app/src/` | 页面、壳层、Agent、store、router、composable 和 service |
| `vue-app/public/admin-runtime/` | 已登记的兼容运行时资源 |
| `skill/portal-workbench-ui-0803/` | PM、UI 与研发共用的统一设计 Skill 分发副本 |
| `public/admin/` | Legacy HTML 历史兼容与对照 |
| `public/admin-vue/` | 构建生成目录，不是源码，不进入归档 |

## 使用方式

1. 先读取 `AGENTS.md` 和 `skill/portal-workbench-ui-0803/SKILL.md`。
2. 将 `vue-app/` 作为 `<app-root>`，使用仓库相对路径，不依赖个人机器目录。
3. 在 `vue-app/` 中安装依赖、开发和验证。
4. 使用源码检查、规则对比和工程命令判断兼容性，不使用项目或 Skill 哈希作为门槛。

```bash
cd vue-app
pnpm install --frozen-lockfile
pnpm guard:design-skill
pnpm lint
pnpm typecheck
pnpm build
pnpm smoke:shell
```

## 源码与归档边界

- 新功能优先修改 `vue-app/src/`；兼容运行时仅在明确需要时修改。
- 不直接维护 `public/admin-vue/`。
- 不在项目内单独维护研发版、PM 版或 UI 版 Skill。
- 归档不包含 `node_modules`、缓存、构建输出、`.DS_Store` 或个人工具配置。
- 本项目用于 POC、设计验证和研发交付，不代表生产部署授权。

## 可选兼容工具配置

根目录中的旧数据流水线和会员中心 E2E 脚本不依赖任何个人机器路径；仅在使用这些可选工具时配置：

- `PYTHON_SKILLS_DIR`：外部 Python Skill 根目录；未配置时使用项目内 `external-skills/` 约定目录。
- `CLAUDE_PROJECTS_DIR`：运行 `scripts/token-stats.js` 时必填的会话目录。
- `E2E_BASE_URL`：会员中心 E2E 地址，默认 `http://127.0.0.1:3001`。
- `PLAYWRIGHT_MODULE`：可选 Playwright 模块入口；未配置时使用当前环境已安装的 `playwright` 包。
- `GEO_DIANLIANG_USERNAME`、`GEO_DIANLIANG_PASSWORD`、`GEO_DIANLIANG_UID`：GEO 点亮接口登录信息；仅在启用对应代理路由时配置。
- `GEO_EXTERNAL_API_TOKEN`：GEO 外部接口令牌；仅在启用对应代理路由时配置。
- `GEO_EXTERNAL_CLIENT_CODE`：GEO 外部接口客户端标识，未配置时使用 `lenovo`。

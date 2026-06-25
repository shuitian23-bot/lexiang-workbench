# AGENTS.md — 联想乐享(lexiang) 开发约定

> 本文件供 **所有 AI 编码工具**（Codex / Cursor / Copilot / Claude / Gemini 等）读取。
> Claude 另见 `CLAUDE.md`（更详细）。本文件是各家 AI 的统一底线约定，**改代码前必读**。

---

## ⚠️ 最重要：前端一律 Vue3（强制，2026-06-25 起）

**所有人（团队成员 + 任何 AI）新写前端一律用 Vue3，不再写原生 HTML（innerHTML 拼字符串 + 全局函数 + inline onclick）那套。**

### 后台 workbench 已全量迁到 Vue3
- 源码工程：`admin-vue/`（Vite + Vue3 SFC + vue-router）
- 构建产物：`public/admin-vue/`（入库，cron 不跑 build）
- 线上访问：`new.leaibot.cn/admin-vue/`，且 `new.leaibot.cn/admin/` 已跳转到 Vue3 版
- 40 页 + AI panel 已转完，E2E 通过

### 改后台的正确姿势
```bash
cd admin-vue
npm install            # 首次
# 改 admin-vue/src/ 下的 .vue 组件 / src/router / src/components
npm run build          # 产物输出到 ../public/admin-vue/
git add admin-vue/src public/admin-vue && git commit && git push origin next
```

### ❌ 不要做
- **不要改 `public/admin/workbench*.js`**（旧原生版）——这些文件已废弃，顶部有警示注释，仅供 `/admin/workbench-native.html` 回退用。改了**不会生效**（`/admin/` 已跳 Vue3）。
- 不要新起原生 HTML 页。新前端模块建 Vue3 SFC，参考 `admin-vue/` 或 `public/ops-content-manager/`。

---

## 部署与协作（要点，详见 CLAUDE.md）

- **生产** leaibot.cn = `/opt/projects/lexiang`（main 分支，:3001）；**预发** new.leaibot.cn = `/opt/projects/lexiang-new`（next 分支，:3010）。
- **所有改动先在 new(next 分支) 改 + 验证，再同步 prod**。禁止在 prod 工作树裸改不提交。
- **改完必须 commit + push**（cron 自动部署依赖 GitHub 最新）。Conventional Commits 格式。
- 后端改 `server.js`/`routes/`/`core/`/`skills/` 后需 `pm2 reload`。

---

## 技术栈

Node.js + Express + SQLite + 火山方舟(Ark) LLM；前端 Vue3(后台) + 原生 SPA(主站 index.html 待迁)。

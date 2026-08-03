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
- **不要直接改 `public/admin-vue/` 产物**——那是 `npm run build` 生成的，`vite.config.js` 里 `emptyOutDir: true`，下次谁 build 就**全被清空丢失**。要改就改 `admin-vue/src/`（静态资源放 `admin-vue/public/`，build 会自动拷过去）。
- 不要新起原生 HTML 页。新前端模块建 Vue3 SFC，参考 `admin-vue/` 或 `public/ops-content-manager/`。

---

## UI 组件库：Element Plus（2026-06-29 起）

**后台 admin-vue 的新组件/新页面统一用 Element Plus**（Vue3 生态标准库，开发定的）。

### ✅ 已装好配好，直接用即可（不用自己装）
`element-plus@2` + 按需引入插件已装进 `admin-vue`，`vite.config.js` 已配 `AutoImport` / `Components` + `ElementPlusResolver`。

在任意 `.vue` 里**直接写，不需要 import**：
```vue
<template>
  <el-button type="primary" @click="save">保存</el-button>
  <el-table :data="rows"><el-table-column prop="name" label="名称" /></el-table>
</template>
<script setup>
function save() { ElMessage.success('已保存') }  // ElMessage/ElMessageBox 也自动引入
</script>
```
`npm run build` 时用到哪个组件才打包哪个（实测：一个 `el-button` 只给该页 chunk 加 ~40kB JS + ~28kB CSS，其他页零影响）。

**❌ 不要 `app.use(ElementPlus)` 全量注册** —— 会把整个库打进主包 + 全局样式污染。

### ⚠️ 样式冲突注意（重要）
admin-vue **复用了原版 workbench 的全套 CSS**（`workbench.css` / `workbench-ui-polish.css` / `workbench-preview-overrides.css`，共约 19000 行，含大量 `!important`）+ `html-skin.css`（对齐原版视觉的皮肤）。Element Plus 自带一套设计体系，混用会撞：

- **主题已对齐品牌色**：`admin-vue/src/styles/element-theme.css` 把 `--el-color-primary` 等设成 `#3370ff`（含浅色梯度 + 暗黑模式），选择器用 `html[data-product="leaibot"]`（特异性高于 EP 的 `:root`，不用 `!important` 就能覆盖）。改品牌色改这个文件。
- **EP 组件样式被压时**，优先改 EP 主题变量或加 `<style scoped>` 覆盖；**别再往全局 CSS 堆 `!important`**（现有 `!important` 已经坑过好几次：AI panel 宽度锁死、workspace-tabs 空白、账号菜单 v-show 失效）。
- **已转好的 40 页不强制返工改 EP**——它们已跟原版视觉对齐并通过 E2E，按需渐进替换即可，别为统一组件库大规模重写。

---

## 部署与协作（要点，详见 CLAUDE.md）

- **生产** leaibot.cn = `/opt/projects/lexiang`（main 分支，:3001）；**预发** new.leaibot.cn = `/opt/projects/lexiang-new`（next 分支，:3010）。
- **所有改动先在 new(next 分支) 改 + 验证，再同步 prod**。禁止在 prod 工作树裸改不提交。
- **改完必须 commit + push**（cron 自动部署依赖 GitHub 最新）。Conventional Commits 格式。
- 后端改 `server.js`/`routes/`/`core/`/`skills/` 后需 `pm2 reload`。

---

## 技术栈

Node.js + Express + SQLite + 火山方舟(Ark) LLM；前端 Vue3(后台) + 原生 SPA(主站 index.html 待迁)。

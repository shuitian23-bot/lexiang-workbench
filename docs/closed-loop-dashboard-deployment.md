# 闭环交易看板部署说明

## 目标

在 `leaibot.cn/admin-vue` 的“乐享运营”下提供两个入口，同时不修改或覆盖后台前端的构建目录：

- 闭环交易看板
- （内部）闭环交易看板

## 稳定方案

菜单扩展源码位于：

`public/lexiang-admin-extension/closed-loop-menu.js`

Nginx 在返回后台 HTML 时加载该扩展。两个看板页面由独立的 Vue 多页面应用提供，Vue 源码位于：

`/home/yejw2/lexiang-dashboard-vue-src`

生产构建输出到源码目录下的 `dist/`，再部署到 `/home/yejw2/lexiang-dashboard/`，由 `lexiang-dashboard-yejw2.service` 提供静态访问。两个入口文件共用 `src/DashboardApp.vue`，通过页面模式区分公开看板和内部看板；订单数据继续使用独立的 `orders-data.js`。后台重新构建或整包更新 `public/admin-vue` 时，不需要重做菜单，也不会覆盖其他人的后台页面。

后台 HTML 注入层必须禁用条件缓存：不向上游传递 `If-None-Match` / `If-Modified-Since`，不向浏览器返回 `ETag` / `Last-Modified`，并返回包含 `no-store` 的 `Cache-Control`。否则浏览器可能在服务器返回 `304` 后继续使用注入前的旧 HTML，表现为两个菜单偶发消失。带哈希的 `/admin-vue/assets/` 静态资源保持独立处理，不受此规则影响。

## 发布纪律

1. 不直接修改 `public/admin-vue/assets` 中带哈希的构建文件。
2. 不用旧版 `admin-vue` 目录覆盖当前目录。
3. 修改扩展前先使用 `scripts/edit-lock.sh` 申领编辑锁，并记录现场文件校验值。
4. 只更新扩展文件；Nginx 配置必须先备份、执行 `nginx -t`，再平滑重载。
5. 发布后运行 `scripts/check-closed-loop-dashboard-release.sh`。自检必须包含“携带旧缓存标识仍返回 `200` 且扩展只注入一次”；检查不通过时立即停止，不把异常版本视为上线完成。
6. 改动必须单独提交并推送。推送失败属于未完成状态，需要明确同步给仓库维护人。

## Vue 页面发布

1. 在 `/home/yejw2/lexiang-dashboard-vue-src` 修改 `.vue` 源码，不直接修改 `dist/assets` 中的哈希文件。
2. 执行 `npm ci` 和 `npm run build`，确保两个 HTML 入口共用同一套 Vue 组件与样式。
3. 部署前核对线上入口文件校验值，并完整备份 `/home/yejw2/lexiang-dashboard`。
4. 保留生产 `orders-data.js`，仅替换构建生成的两个 HTML 入口和 `assets/`。
5. 部署后验证两个页面存在 Vue 挂载标记，并回归顶部时间联动、订单“查询后生效”、分页及导出状态。

## 回滚

1. 恢复 `/etc/nginx/backups/` 中最近的 `lexiang-dashboard-location` 备份。
2. 执行 `nginx -t`，确认通过后平滑重载。
3. 菜单扩展停止加载后，后台恢复为原始构建；`public/admin-vue` 无需回滚。

## 验收地址

- `/admin-vue/ops/closed-loop-dashboard`
- `/admin-vue/ops/internal-closed-loop-dashboard`
- `/lexiang-dashboard/lenovo-joy-closed-loop-dashboard.html?embedded=1`
- `/lexiang-dashboard/index.html?embedded=1`

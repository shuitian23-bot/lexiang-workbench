# 订单管理 POC 交付说明

## 基线与范围

- 基线：当前 `lexiang-new-0803` 项目线。
- 范围：仅新增“订单管理 / 协议采购单管理”页面、路由、菜单入口和独立 mock/service 层。
- 公共框架：顶部导航、左侧公共导航结构、右侧 Agent、页签和账号区域保持 0803 基线；Agent 报告卡默认仍为“保存”。

## 数据方式

本次为纯页面演示 POC，暂未连接真实接口。模拟数据集中放在：

- `vue-app/src/services/purchaseOrders.ts`

后续接真实接口时，建议替换该 service 层，不把采购单、客户、商品、转化进度等数据直接写入页面组件。

## 已明确的交互口径

- 查询：输入条件后点击“查询”才刷新结果。
- 状态筛选：只保留状态下拉，不再叠加状态标签筛选。
- 重置：清空关键词、恢复全部状态、回到第一页。
- KPI：按“当前筛选结果”统计。
- 导出：导出当前筛选结果；详情页导出当前详情。
- 详情：使用独立路由 `/order/purchase-orders/:id`。

## 后续真实接口待确认

- 采购单列表接口及查询参数。
- 采购单详情接口。
- 状态筛选枚举和分页规则。
- 导出接口及导出范围。
- 用户权限和数据范围。

## 本次验证

- `pnpm install --frozen-lockfile`：通过。
- `pnpm lint`：通过。
- `pnpm typecheck`：通过。
- `pnpm build`：通过，已重新生成根目录 `public/admin-vue`。
- 本地预览 HTTP 检查：`/admin-vue/`、`/admin-vue/order/purchase-orders`、`/admin-vue/order/purchase-orders/POC-202608-001` 均返回 200。
- 构建产物：`public/admin-vue/assets` 当前为 58 个文件，未沿用历史累计产物目录。
- 响应式实现：订单页面包含 1440px、1280px 断点，表格使用局部横向滚动，操作列 sticky 到右侧，页面根容器设置 `min-width: 0` 避免外层横向溢出。

说明：当前机器没有可用的 Playwright/Chrome 自动浏览器，因此本包已完成命令和 HTTP 级验证；1280px、1440px、Agent 展开/关闭的截图级人工验收仍建议在浏览器中补充。

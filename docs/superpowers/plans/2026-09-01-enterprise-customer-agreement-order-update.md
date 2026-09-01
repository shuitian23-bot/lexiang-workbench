# 企业客户管理与协议采购订单更新实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将 `_0901_analysis.zip` 中企业客户管理和协议订单的新业务交互语义合入最新门户工作台，并将用户可见名称统一为“协议采购订单”。

**Architecture:** 保留现有 Vue 路由和外壳，以 `vue-app/public/admin-runtime` 为两个原生业务运行时的构建源，通过契约测试约束行为，再由 Vite 构建生成 `public/admin-vue`。压缩包只生成语义补丁，不覆盖工程或其他运行时；预览发布仅同步构建资源和两个获批运行时。

**Tech Stack:** Vue 3、TypeScript、Vite、Node.js test runner、原生 JavaScript runtime、Git worktree。

## Global Constraints

- 基于服务器最新 `main`，在隔离工作区和独立分支中实现。
- 修改前锁定目标热点文件，目标文件出现并行变化时停止并重新取基线。
- 不整包复制 `_0901_analysis.zip`，不采用其中的 `node_modules`、旧构建产物或公共模块。
- 只更新企业客户管理、协议订单及其直接测试和一条 POC 日志。
- 菜单、页面标题、返回文案、详情标题和导出文件统一使用“协议采购订单”。
- 保留 `order.agreement`、`order.agreement.detail` 和现有路由地址。
- 不修改协议采购单管理、商品视频管理、权限管理、AI 助手、Skill、公共外壳或其他业务运行时。
- 先更新 `new`；不自动合并正式环境或 Git 主线。
- 部署不得使用 `--delete`，并必须保护未授权 `admin-runtime`。

---

### Task 1: 用契约测试锁定新菜单和业务行为

**Files:**
- Modify: `vue-app/scripts/menu-additions.test.mjs`
- Modify: `vue-app/scripts/package-page-alignment.test.mjs`

**Interfaces:**
- Consumes: `MENU_TREE`、`workbench-lead.js`、`workbench-agreement-orders.js` 的源码文本。
- Produces: 新名称、企业客户新增交互和协议采购订单交互的静态契约。

- [ ] **Step 1: 更新菜单名称断言**

将 `order.agreement` 的菜单断言改为：

```js
assert.match(appStore, /'order\.agreement':\s*\{ label: '协议采购订单', path: '\/order\/agreement' \}/)
```

- [ ] **Step 2: 更新企业客户功能断言**

将“不得出现打分模型站点变化”的旧断言替换为以下能力断言：

```js
assert.match(leadRuntime, /const PRODUCT_TYPE_OPTIONS =/)
assert.match(leadRuntime, /function renderImportResultsPage\(\)/)
assert.match(leadRuntime, /function touchDropdown\(\)/)
assert.match(leadRuntime, /function mqlDropdown\(\)/)
assert.match(leadRuntime, /const RULE_SITES=/)
assert.match(leadRuntime, /window\.leadScoreSetSite/)
```

- [ ] **Step 3: 更新协议采购订单断言**

增加以下契约并删除旧版“无 CSV 导出”和静态地址断言：

```js
assert.match(orderRuntime, /var purchaseStates =/)
assert.match(orderRuntime, /function poShippingStatus\(o\)/)
assert.match(orderRuntime, /agreementProductOrderViewPlain/)
assert.match(orderRuntime, /URL\.createObjectURL/)
assert.match(orderRuntime, /采购单详情/)
assert.match(orderRuntime, /返回协议采购订单/)
```

- [ ] **Step 4: 运行测试确认 RED**

Run:

```bash
cd vue-app
node --test scripts/menu-additions.test.mjs scripts/package-page-alignment.test.mjs
```

Expected: 新名称、导入结果、站点规则和分层订单断言失败。

- [ ] **Step 5: 提交测试契约**

```bash
git add vue-app/scripts/menu-additions.test.mjs vue-app/scripts/package-page-alignment.test.mjs
git commit -m "test: define enterprise customer and agreement order update"
```

### Task 2: 语义合入企业客户管理运行时

**Files:**
- Modify: `vue-app/public/admin-runtime/workbench-lead.js`

**Interfaces:**
- Consumes: 当前 `LEAD` 状态、`PAGE_RENDERERS`、角色和现有导出/详情函数。
- Produces: `PRODUCT_TYPE_OPTIONS`、`renderImportResultsPage()`、`renderImportFailurePage()`、`touchDropdown()`、`mqlDropdown()`、`RULE_SITES` 和 `leadScoreSetSite()`。

- [ ] **Step 1: 对当前运行时应用压缩包语义补丁**

补丁只合入以下变化：

```text
线索看板：产品类型、客户分级筛选
线索池：导入结果、失败明细、客户经理编码、线索分、触达与 MQL 分组入口
打分模型：站点、行为组时间范围、领取优惠券、未浏览及对应校验
```

保留 `renderGovernmentPool()`、`governmentPoolRefresh()`、政企详情返回和当前角色权限。

- [ ] **Step 2: 检查运行时语法**

Run:

```bash
node --check vue-app/public/admin-runtime/workbench-lead.js
```

Expected: exit 0。

- [ ] **Step 3: 运行企业客户契约**

Run:

```bash
cd vue-app
node --test scripts/menu-additions.test.mjs scripts/package-page-alignment.test.mjs
```

Expected: 企业客户相关断言通过；协议采购订单断言仍失败。

- [ ] **Step 4: 提交企业客户更新**

```bash
git add vue-app/public/admin-runtime/workbench-lead.js
git commit -m "feat: update enterprise customer management flows"
```

### Task 3: 合入协议采购订单并统一名称

**Files:**
- Modify: `vue-app/public/admin-runtime/workbench-agreement-orders.js`
- Modify: `vue-app/src/stores/app.ts`
- Modify: `vue-app/src/views/order/AgreementOrderView.vue`

**Interfaces:**
- Consumes: `order.agreement` 和 `order.agreement.detail` 页面标识。
- Produces: 采购单/PO/SO 分层状态、脱敏列表、明文弹窗、按采购单聚合详情、筛选结果导出和统一名称。

- [ ] **Step 1: 对订单运行时应用压缩包语义补丁**

保留现有页面标识，合入：

```text
purchaseStates 与 purchaseOrders 独立状态
maskName、maskPhone、maskAddress
agreementProductOrderViewPlain
purchaseMembers、renderPoDetail
agreementProductOrderExport
```

- [ ] **Step 2: 增加可见导出入口**

在列表页头提供：

```html
<button class="btn btn-secondary" onclick="agreementProductOrderExport()">导出（脱敏）</button>
<button class="btn btn-primary" onclick="agreementProductOrderExport(true)">导出（明文）</button>
```

- [ ] **Step 3: 统一用户可见名称**

将用户可见的旧名称改为：

```text
协议采购订单
协议采购订单详情
返回协议采购订单
协议采购订单_脱敏_YYYY-MM-DD.csv
协议采购订单_明文_YYYY-MM-DD.csv
```

不得修改 `order.agreement`、`order.agreement.detail` 或内部函数名。

- [ ] **Step 4: 检查语法并运行契约**

Run:

```bash
node --check vue-app/public/admin-runtime/workbench-agreement-orders.js
cd vue-app
node --test scripts/menu-additions.test.mjs scripts/package-page-alignment.test.mjs
```

Expected: 全部通过。

- [ ] **Step 5: 提交订单更新**

```bash
git add vue-app/public/admin-runtime/workbench-agreement-orders.js vue-app/src/stores/app.ts vue-app/src/views/order/AgreementOrderView.vue
git commit -m "feat: update agreement purchase orders"
```

### Task 4: 更新日志并完成全量验证

**Files:**
- Modify: `vue-app/src/components/shell/sidebar/WorkbenchSidebar.vue`
- Generated: `public/admin-vue/**`

**Interfaces:**
- Consumes: 已通过契约的 Vue 源码和两个运行时源文件。
- Produces: 一条 `new` 发布日志和可部署构建资源。

- [ ] **Step 1: 增加一条合并日志**

日志内容使用一个发布键并记录：

```text
标题：企业客户管理与协议采购订单更新
范围：企业客户管理 / 订单管理
状态：已更新 new 预览
发布人：zhangrui
```

- [ ] **Step 2: 运行完整验证**

Run:

```bash
cd vue-app
node --test scripts/product-contract-regression.test.mjs
node --test scripts/menu-additions.test.mjs
node --test scripts/package-page-alignment.test.mjs
pnpm lint
pnpm typecheck
CI=true pnpm run build
```

Expected: 所有测试、lint、typecheck 和 build 通过。

- [ ] **Step 3: 检查保护范围**

Run:

```bash
git diff --name-only main...HEAD
git diff --check
```

Expected: 只出现设计、计划、测试、两个运行时源、菜单文案、订单页标题、日志和构建镜像；权限管理、AI、Skill、GEO、员工管理和其他运行时无差异。

- [ ] **Step 4: 提交日志和构建镜像**

```bash
git add vue-app/src/components/shell/sidebar/WorkbenchSidebar.vue public/admin-vue
git commit -m "chore: prepare enterprise and agreement order preview"
```

### Task 5: 更新 new 并验证预览

**Files:**
- Deploy: `/opt/projects/lexiang-new/public/admin-vue`

**Interfaces:**
- Consumes: 已验证构建资源。
- Produces: `new.leaibot.cn` 可操作预览，不修改正式环境。

- [ ] **Step 1: 记录预览前指纹和备份**

记录 `new` 的入口文件、`admin-runtime` 指纹，并创建排除未授权运行时的独立备份。

- [ ] **Step 2: 非删除式同步构建资源**

使用 `rsync -a`，排除整个 `admin-runtime/`，再单独同步：

```text
workbench-lead.js
workbench-agreement-orders.js
```

- [ ] **Step 3: 验证预览**

验证：

```text
/admin-vue/lead/dashboard
/admin-vue/lead/pool
/admin-vue/lead/government-pool
/admin-vue/lead/score
/admin-vue/order/agreement
```

页面及入口资源返回 200，菜单显示“协议采购订单”，目标运行时包含新功能文本，其他运行时指纹不变。

- [ ] **Step 4: 记录 new 发布信息并释放锁**

记录版本、北京时间、发布人 `zhangrui`、入口资源和回滚包路径，然后释放所有目标文件锁。

# Government Lead Pool And Agreement Orders Package Alignment Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Align “线索池-政企” and “协议产品订单管理” with `_0708_analysis (3).zip` while preserving every unrelated workbench module.

**Architecture:** Keep the current Vue menu, routes and wrapper views. Apply narrow changes to the two legacy runtime modules and add the missing content-slot metadata. Use package-derived contract tests to prevent whole-file replacement and to prove that only the two target page contracts changed.

**Tech Stack:** Vue 3, TypeScript, Vite, legacy browser runtime JavaScript, Node test runner, ESLint.

## Global Constraints

- Strictly follow the two target modules in `_0708_analysis (3).zip`, including removal of the agreement-order reset button and notification-only export.
- Do not copy the archive's `node_modules`, full `dist`, stale shared source, or unrelated business modules.
- Do not modify permissions, right-side AI assistant, public navigation, regular lead-pool behavior, score model behavior or purchase-order management.
- Preserve `workbench-geo.js` and `workbench-pages.js` exactly.
- Complete source, build and local verification only; do not update `new`, formal or GitLab in this plan.

---

### Task 1: Add Package Contract Tests

**Files:**
- Create: `vue-app/scripts/package-page-alignment.test.mjs`
- Reference: `vue-app/scripts/menu-additions.test.mjs`

**Interfaces:**
- Consumes: source files under `vue-app/src` and `vue-app/public/admin-runtime`.
- Produces: Node tests that fail when package-required government filters/table/metadata or agreement list/detail behavior is missing.

- [ ] **Step 1: Write the failing government contract tests**

Create Node tests that assert:

```js
assert.match(contentSlots, /pageId:\s*'lead\.governmentPool'[\s\S]*?path:\s*'\/lead\/government-pool'/)
assert.match(leadRuntime, /function clearGovernmentHiddenFilters\(\)/)
assert.doesNotMatch(governmentFilter, /fown|所属IS/)
assert.match(leadRuntime, /const governmentHead =/)
assert.match(leadRuntime, /const governmentCells =/)
assert.match(leadRuntime, /poolTableHtml\(government\)/)
```

- [ ] **Step 2: Write the failing agreement-order contract tests**

Assert the user-visible package behavior:

```js
assert.doesNotMatch(orderRenderer, /agreementProductOrderReset|>重置</)
assert.match(orderRuntime, /workspaceNotify\('协议产品订单导出已生成'\)/)
assert.match(orderRuntime, /<div class="apo-address-item"><b>地址 2<\/b>/)
assert.match(orderStyles, /\.apo-section h2:before/)
```

- [ ] **Step 3: Run the tests and verify RED**

Run: `node --test scripts/package-page-alignment.test.mjs`

Expected: FAIL because the content-slot registration, package government filter/table contract, address 2 and agreement export/reset behavior are absent.

- [ ] **Step 4: Commit the failing tests**

```bash
git add vue-app/scripts/package-page-alignment.test.mjs
git commit -m "test: capture package contracts for new workbench pages"
```

### Task 2: Align Government Lead Pool

**Files:**
- Modify: `vue-app/public/admin-runtime/workbench-lead.js`
- Modify: `vue-app/src/content-slot/contentSlotDefinitions.js`
- Test: `vue-app/scripts/package-page-alignment.test.mjs`

**Interfaces:**
- Consumes: existing `LEAD`, `capturePoolFilters()`, `poolBase()`, `poolRows()`, `poolMs()`, `dateRangeCtl()`, export and detail functions.
- Produces: `clearGovernmentHiddenFilters()`, `governmentPoolFilterHtml()`, `poolTableHtml(government)`, `governmentPoolRefresh()` and `lead.governmentPool` content-slot metadata.

- [ ] **Step 1: Add only the government-required data and shared filter fields**

Add the package fields without importing unrelated regular-pool features:

```js
const CUSTOMER_MANAGER_CODES = ['CM001', 'CM002', 'CM003', 'CM004'];

// in mkLead()
customerManagerCode: i % 4 === 0 ? '' : CUSTOMER_MANAGER_CODES[i % CUSTOMER_MANAGER_CODES.length],
relGabIs: i % 3 === 0 ? 'GAB-' + String(1001 + i) : '',
relKabIs: i % 3 === 1 ? 'KAB-' + String(2001 + i) : '',
relEmergingMarketIs: i % 3 === 2 ? 'EM-' + String(3001 + i) : '',
```

Add `fScoreMin`, `fScoreMax` and `fCustomerManagerCodes` to `LEAD`, filter snapshots, `poolBase()` and reset state. Do not add package changes to ordinary lead-pool columns or operations.

- [ ] **Step 2: Replace the isolated government state with the package shared-state renderer**

Implement `clearGovernmentHiddenFilters()` to clear non-government filters. Build `governmentPoolFilterHtml()` from `dateRangeCtl('create')`, text inputs, customer-manager multi-select, score bounds and customer grade. Remove the independent `GOVERNMENT` object and all `governmentLead*` filter/export functions.

- [ ] **Step 3: Give `poolTableHtml(government)` separate government and regular table contracts**

Use `governmentHead` and `governmentCells` for the exact 14-column package table. Government rows contain only a routed detail action. Keep the current regular `head`, `regularCells`, checkbox selection and regular operations unchanged.

- [ ] **Step 4: Register content-slot metadata**

Add after `lead.pool`:

```js
{
  pageId: 'lead.governmentPool',
  label: '线索池-政企',
  path: '/lead/government-pool',
  layout: CONTENT_SLOT_LAYOUTS.tableWorkbench,
  sourceRenderer: 'src/views/lead/LeadGovernmentPoolView.vue',
  fixedStyles: ['filter toolbar', 'lead table', 'read-only actions'],
  sharedCandidates: ['filter bar', 'data table', 'export action bar'],
  customAreas: ['政企线索只读查询', 'REL关系字段'],
  interactions: ['filter leads', 'export leads', 'open lead detail']
}
```

- [ ] **Step 5: Run focused tests and verify GREEN**

Run: `node --test scripts/package-page-alignment.test.mjs scripts/menu-additions.test.mjs`

Expected: government package tests and existing menu-preservation tests PASS.

- [ ] **Step 6: Commit the government alignment**

```bash
git add vue-app/public/admin-runtime/workbench-lead.js vue-app/src/content-slot/contentSlotDefinitions.js
git commit -m "feat: align government lead pool with delivery package"
```

### Task 3: Align Agreement Product Orders

**Files:**
- Modify: `vue-app/public/admin-runtime/workbench-agreement-orders.js`
- Test: `vue-app/scripts/package-page-alignment.test.mjs`

**Interfaces:**
- Consumes: existing `PAGE_RENDERERS`, `switchPage()` and `workspaceNotify()` bridge functions.
- Produces: package-aligned `renderProductOrders()`, `renderAgreementProductOrderDetail()` and agreement order page styles.

- [ ] **Step 1: Apply the package list contract**

Keep the current six-order fixture but add `agreement` and `agreementName` values from the package. Change the header action to `导出`, remove the reset button and remove `agreementProductOrderReset`.

- [ ] **Step 2: Apply the package export and detail contract**

Replace CSV generation with:

```js
window.agreementProductOrderExport = function () {
  if (window.workspaceNotify) window.workspaceNotify('协议产品订单导出已生成');
};
```

Use the arrow return label, add the second address row and add `.apo-section h2:before` plus the package's responsive address layout.

- [ ] **Step 3: Run focused tests and verify GREEN**

Run: `node --test scripts/package-page-alignment.test.mjs scripts/menu-additions.test.mjs`

Expected: all focused tests PASS, including no reset function/button, notification-only export, two addresses and section title marker.

- [ ] **Step 4: Commit the agreement alignment**

```bash
git add vue-app/public/admin-runtime/workbench-agreement-orders.js
git commit -m "feat: align agreement orders with delivery package"
```

### Task 4: Build And Regression Verification

**Files:**
- Modify: generated files under `public/admin-vue`
- Verify only: `vue-app/public/admin-runtime/workbench-geo.js`
- Verify only: `vue-app/public/admin-runtime/workbench-pages.js`
- Verify only: `vue-app/src/views/agent/AgentPermissionsView.vue`

**Interfaces:**
- Consumes: all source and runtime changes from Tasks 2 and 3.
- Produces: a locally verified Vite build and clean task-only commits.

- [ ] **Step 1: Run source and product verification**

Run:

```bash
pnpm guard:design-skill
pnpm lint
pnpm typecheck
node --test scripts/package-page-alignment.test.mjs scripts/menu-additions.test.mjs
pnpm test:product-contract
```

Expected: every command PASS.

- [ ] **Step 2: Build and run shell smoke**

Run: `pnpm build`

Run: `pnpm smoke:shell`

Expected: build succeeds and `/`, `/portal/home`, `/dashboard/overview` shell checks pass.

- [ ] **Step 3: Perform browser verification**

Verify at desktop width and with the Agent expanded:

- `/admin-vue/lead/government-pool`: exact filters, no 所属 IS, exact columns, detail returns correctly.
- `/admin-vue/order/agreement`: no reset, export notification, query and pagination.
- `/admin-vue/hidden/order/agreement-detail`: two address rows, blue section title marker and return behavior.
- `/admin-vue/order/purchase-orders`: original page remains available.

- [ ] **Step 4: Audit protected and unrelated files**

Run:

```bash
git diff --name-only 7a56d22..HEAD -- vue-app/public/admin-runtime/workbench-geo.js vue-app/public/admin-runtime/workbench-pages.js vue-app/src/views/agent/AgentPermissionsView.vue
git diff --check
```

Expected: protected/unrelated file list is empty and diff check reports no errors.

- [ ] **Step 5: Stage generated artifacts and commit**

Stage only the task source, tests and regenerated `public/admin-vue` artifacts. Remove `vue-app/tsconfig.tsbuildinfo` before committing.

```bash
git commit -m "chore: build package-aligned workbench pages"
```

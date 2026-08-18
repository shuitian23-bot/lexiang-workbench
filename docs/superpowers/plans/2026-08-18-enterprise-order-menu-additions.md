# Enterprise Customer And Order Menu Additions Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add the government lead pool and agreement product order entries without changing or removing any existing workbench feature.

**Architecture:** Extend the current Vue menu and router with two isolated page wrappers. Reuse the existing native runtime bridge, adding one standalone order runtime and only the government-pool hunks required in the shared lead runtime.

**Tech Stack:** Vue 3, TypeScript, Vue Router, Pinia, native workbench runtime scripts, Node test runner, Vite.

## Global Constraints

- Keep `order.purchaseOrders` and every existing menu entry unchanged.
- Do not replace the full shared lead runtime.
- Do not modify protected `workbench-geo.js` or `workbench-pages.js`.
- Do not deploy preview, formal, or Git without a separate confirmation.

---

### Task 1: Lock The Menu And Route Contract

**Files:**
- Create: `vue-app/scripts/menu-additions.test.mjs`
- Modify: `vue-app/src/stores/app.ts`
- Modify: `vue-app/src/router/index.ts`

**Interfaces:**
- Produces: page IDs `lead.governmentPool`, `order.agreement`, and `order.agreement.detail`.
- Preserves: page ID `order.purchaseOrders` and route `/order/purchase-orders`.

- [ ] **Step 1: Write the failing contract test**

Assert that both new menu entries and routes exist, that the existing purchase-order entry remains, and that unrelated menu group source slices are unchanged.

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test scripts/menu-additions.test.mjs`

Expected: FAIL because `lead.governmentPool` and `order.agreement` do not exist.

- [ ] **Step 3: Add the minimal menu and router declarations**

Add the new children in `MENU_TREE`, lazy imports for both wrappers, the two visible routes, and the hidden agreement-order detail route.

- [ ] **Step 4: Run test to verify the declarations pass**

Run: `node --test scripts/menu-additions.test.mjs`

Expected: route declarations pass while page/runtime assertions remain failing until Task 2.

### Task 2: Add The Two Isolated Page Implementations

**Files:**
- Create: `vue-app/src/views/lead/LeadGovernmentPoolView.vue`
- Create: `vue-app/src/views/order/AgreementOrderView.vue`
- Create: `vue-app/public/admin-runtime/workbench-agreement-orders.js`
- Modify: `vue-app/src/adapters/legacyWorkbench/nativeWorkbenchRuntime.ts`
- Modify: `vue-app/public/admin-runtime/workbench-lead.js`
- Test: `vue-app/scripts/menu-additions.test.mjs`

**Interfaces:**
- Consumes: the three page IDs from Task 1.
- Produces: renderer registrations for `lead.governmentPool`, `order.agreement`, and `order.agreement.detail`.

- [ ] **Step 1: Extend the failing test with page and runtime assertions**

Assert that wrappers use the correct page IDs, the loader includes only the new order runtime, the government renderer is registered, and the package's unrelated score-model changes are absent.

- [ ] **Step 2: Run test to verify it fails for missing implementations**

Run: `node --test scripts/menu-additions.test.mjs`

Expected: FAIL for missing wrappers and renderer registrations.

- [ ] **Step 3: Add the minimal wrappers and runtime logic**

Create both established native-page wrappers, add the standalone order runtime to the loader, and apply only government-pool-related hunks to `workbench-lead.js`.

- [ ] **Step 4: Run the focused test until it passes**

Run: `node --test scripts/menu-additions.test.mjs`

Expected: PASS.

### Task 3: Verify The Whole Workbench

**Files:**
- Verify: `vue-app/`

**Interfaces:**
- Consumes: the completed additions.
- Produces: a clean build artifact ready for a separately confirmed preview step.

- [ ] **Step 1: Run source and product checks**

Run: `pnpm guard:design-skill && pnpm lint && pnpm typecheck && pnpm test:product-contract`

Expected: all commands exit successfully.

- [ ] **Step 2: Build and run the shell smoke check**

Run: `pnpm build && pnpm smoke:shell`

Expected: build and smoke check exit successfully.

- [ ] **Step 3: Inspect the final diff and protected files**

Run: `git status --short && git diff --check && git diff --name-only`

Expected: only the approved source, runtime, tests, plan files, and generated build artifacts differ; protected runtime files remain unchanged.

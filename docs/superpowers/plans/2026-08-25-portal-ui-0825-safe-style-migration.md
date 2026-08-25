# Portal UI 0825 Safe Style Migration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Normalize four approved page headers to the 0825 visual contract without changing portal behavior or business logic.

**Architecture:** Introduce a focused Vue presentation component with scoped styles, then replace only the existing title/action wrappers in four current views. Keep all business content, handlers, stores, routes, and mock data untouched; use structural regression tests and Git diff checks as the protection boundary.

**Tech Stack:** Vue 3 SFC, TypeScript, scoped CSS, Node test runner, pnpm, Vite.

## Global Constraints

- Work only in `/private/tmp/lexiang-ui-0825` on `dev/zhangrui-ui-0825`.
- Never copy whole page files from the attached 0825 snapshot.
- Do not modify router, store, service, mock-data, shell, Agent, or protected runtime files.
- Keep every current button label and click handler unchanged.
- Update preview only after a separate release authorization.

---

### Task 1: Add a structural regression guard

**Files:**
- Modify: `vue-app/scripts/product-contract-regression.test.mjs`

**Interfaces:**
- Consumes: Existing `source(path)` helper and Node `assert`.
- Produces: A regression test proving the component contract and exactly four approved consumers exist.

- [ ] **Step 1: Write a failing test**

Add a test that reads `ContentPageHeader.vue` and the four approved views, asserts the component has one `h1`, and asserts every view imports and renders it.

- [ ] **Step 2: Verify the test fails**

Run: `pnpm test:product-contract`

Expected: the new test fails because `ContentPageHeader.vue` and its imports do not exist.

- [ ] **Step 3: Keep the failing test for Task 2**

Do not weaken the assertions or add functional requirements.

### Task 2: Add the shared presentation component

**Files:**
- Create: `vue-app/src/components/content/ContentPageHeader.vue`

**Interfaces:**
- Consumes: `title`, optional `description`, optional `status` slot, optional `actions` slot.
- Produces: One semantic page header with one `h1` and scoped 0825 visual geometry.

- [ ] **Step 1: Implement the minimal component**

Use the approved 18px marker, 19px title, 12px description, existing color tokens, and responsive action layout. Add no state, events, routing, or data access.

- [ ] **Step 2: Run the regression test**

Run: `pnpm test:product-contract`

Expected: the new test still fails because the four views do not yet consume the component.

### Task 3: Migrate only the four approved title blocks

**Files:**
- Modify: `vue-app/src/views/agent/AgentSkillsView.vue`
- Modify: `vue-app/src/views/agent/AgentSkillCreateView.vue`
- Modify: `vue-app/src/views/agent/AgentPermissionsView.vue`
- Modify: `vue-app/src/views/agent/AdminCleanupEmailMockView.vue`

**Interfaces:**
- Consumes: `ContentPageHeader` props and actions slot.
- Produces: Existing page actions and descriptions in the shared visual structure.

- [ ] **Step 1: Replace each legacy title wrapper**

Keep the original text, buttons, classes, and click handlers. Add only the component import and minimal page-flow spacing needed to avoid duplicate margins.

- [ ] **Step 2: Verify the regression test passes**

Run: `pnpm test:product-contract`

Expected: all tests pass, including the shared-header test.

- [ ] **Step 3: Inspect the source diff**

Run: `git diff -- vue-app/src/components/content/ContentPageHeader.vue vue-app/src/views/agent/AgentSkillsView.vue vue-app/src/views/agent/AgentSkillCreateView.vue vue-app/src/views/agent/AgentPermissionsView.vue vue-app/src/views/agent/AdminCleanupEmailMockView.vue`

Expected: only title markup, component imports, and narrowly scoped spacing styles change.

### Task 4: Complete engineering and visual verification

**Files:**
- Verify only; no additional production files unless a test exposes a scoped styling defect.

**Interfaces:**
- Consumes: Built Vue app and four approved routes.
- Produces: Build evidence, smoke evidence, screenshots, and a protected-file diff report.

- [ ] **Step 1: Run static and build checks**

Run `pnpm guard:design-skill`, `pnpm lint`, `pnpm typecheck`, `pnpm build`, and `pnpm smoke:shell` from `vue-app`.

- [ ] **Step 2: Verify protected scope**

Run `git diff --name-only origin/main...HEAD` after commit and confirm no router, store, service, mock-data, or `public/admin-vue/admin-runtime` file is included.

- [ ] **Step 3: Perform browser verification**

Open the built app through the local development server and inspect Skill Hub, Skill 创建, 权限管理, and 权限清理邮件预览 at desktop width. Confirm title alignment, action reachability, and no overlap.

- [ ] **Step 4: Commit the isolated change**

Stage only the approved source, regression test, and plan/spec files. Commit with a style-scoped message. Do not push, update `new`, merge formal, or upload Git without the corresponding authorization.

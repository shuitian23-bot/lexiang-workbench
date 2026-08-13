# Portal Workbench 0812 UI Update Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Incrementally apply the approved 0812 design baseline and its two Vue page adjustments to the current `dev/zhangrui` source, then publish only the `new.leaibot.cn` preview.

**Architecture:** Keep GitLab commit `fe71589` as the source baseline and preserve the 0803 skill as history. Add the 0812 skill as a new immutable directory, update the project's design pointers, apply only the two reviewed Vue diffs plus one grouped POC log record, rebuild `public/admin-vue`, and deploy through Git with protected runtime exclusions.

**Tech Stack:** Vue 3, TypeScript, Pinia, Vue Router, Vite, pnpm, Git, server-side SSH deployment.

## Global Constraints

- Work only in the isolated temporary clone and dedicated branch until verification is complete.
- Do not modify the user's dirty local `lexiang-new` checkout.
- Do not copy `__MACOSX`, `server 2.js`, backend files, `node_modules`, caches, downloads, archives, or `* 2.*` duplicates.
- Preserve `skill/portal-workbench-ui-0803/` as historical source.
- Preserve `public/admin-vue/admin-runtime/workbench-geo.js` and `workbench-pages.js` byte-for-byte.
- Do not use delete-style deployment sync and do not modify `/opt/projects/lexiang`.
- Publish `new.leaibot.cn` only; formal production requires a later explicit confirmation.

---

### Task 1: Install The 0812 Design Contract

**Files:**
- Create: `skill/portal-workbench-ui-0812/**`
- Modify: `vue-app/design-baseline.lock.json`
- Modify: `vue-app/design-skill.guard.json`
- Modify: `vue-app/README.md`

**Interfaces:**
- Consumes: approved `lexiang-new-0812.zip` and its SHA-256.
- Produces: a project-local 0812 design guard selected by `pnpm guard:design-skill` and `pnpm build`.

- [ ] **Step 1: Copy only the 0812 design Skill directory**

Use a directory-preserving local copy from the inspected package into `skill/portal-workbench-ui-0812/`. Do not remove or rename `portal-workbench-ui-0803/`.

- [ ] **Step 2: Apply the three reviewed project pointer changes**

Update the baseline version/release/name, the guard search directories, and the Vue README wording exactly as shown by the package diff. Do not copy the package root `AGENTS.md` or backend files.

- [ ] **Step 3: Run design-Skill structure and portability checks**

Run:

```bash
pnpm --dir vue-app guard:design-skill
node skill/portal-workbench-ui-0812/scripts/check-consistency.mjs --project vue-app
```

Expected: both commands exit `0`; the selected skill is release 0812 and no fixed personal path is required.

- [ ] **Step 4: Commit the design-contract update**

```bash
git add skill/portal-workbench-ui-0812 vue-app/design-baseline.lock.json vue-app/design-skill.guard.json vue-app/README.md
git commit -m "chore: adopt portal UI 0812 design baseline"
```

### Task 2: Apply The Two Reviewed Vue Page Diffs

**Files:**
- Modify: `vue-app/src/views/agent/AgentSkillCreateView.vue`
- Modify: `vue-app/src/views/order/OrderPurchaseOrdersView.vue`

**Interfaces:**
- Consumes: existing Skill creation state machine and order page query/service/route behavior.
- Produces: 0812 spacing ownership, token usage, scoped table/status classes, and content-width responsiveness without behavior changes.

- [ ] **Step 1: Record the pre-change design-guard failure**

Run the 0812 incremental guard against both current page files:

```bash
node skill/portal-workbench-ui-0812/scripts/check-consistency.mjs --project vue-app \
  --changed-file src/views/agent/AgentSkillCreateView.vue \
  --changed-file src/views/order/OrderPurchaseOrdersView.vue
```

Expected: non-zero exit because the old order page still contains hardcoded colors and page-local spacing that violate the 0812 changed-file contract. This is the RED evidence for the generated style integration.

- [ ] **Step 2: Apply the reviewed Skill creation diff**

Add `data-page-flow="skill-create"`, set the page flow gap to `16px`, and reset only the direct page-header bottom margin. Do not edit script logic, form state, permissions, Agent behavior, or fixed action flow.

- [ ] **Step 3: Apply the reviewed order-page diff**

Apply only the package hunks that:

- wrap list/detail business sections in `order-page-flow`;
- rename broad KPI/query/table/status selectors to order-scoped classes;
- use existing design tokens instead of hardcoded page colors;
- add progressbar ARIA values;
- use content-container breakpoints at `1039px` and `719px`;
- preserve all service, query, pagination, export and route functions unchanged.

- [ ] **Step 4: Re-run the incremental design guard**

Run the command from Step 1 again.

Expected: exit `0`, with no new hardcoded color, invalid spacing, radius, or font-size findings in the two changed files.

- [ ] **Step 5: Review the behavioral diff and commit**

Confirm that the `<script setup>` business logic has no diff, then commit only the two Vue files:

```bash
git add vue-app/src/views/agent/AgentSkillCreateView.vue vue-app/src/views/order/OrderPurchaseOrdersView.vue
git commit -m "style: apply 0812 workbench page rhythm"
```

### Task 3: Add The Grouped Preview Log And Verify The Build

**Files:**
- Modify: `vue-app/src/components/shell/sidebar/WorkbenchSidebar.vue`
- Generated: `public/admin-vue/**`

**Interfaces:**
- Consumes: final source from Tasks 1 and 2.
- Produces: traceable preview status and deployable Vite output.

- [ ] **Step 1: Add one newest POC log entry**

Add a single Beijing-time record describing the 0812 design baseline, Skill creation spacing, and agreement purchase-order page styling. Set status to `已更新 new 预览`; do not modify older records.

- [ ] **Step 2: Install exact dependencies**

```bash
pnpm --dir vue-app install --frozen-lockfile
```

Expected: exit `0` without lockfile changes.

- [ ] **Step 3: Run all required checks**

```bash
pnpm --dir vue-app guard:design-skill
pnpm --dir vue-app lint
pnpm --dir vue-app typecheck
pnpm --dir vue-app build
pnpm --dir vue-app smoke:shell
```

Expected: every command exits `0`; Vite writes the current build to project-root `public/admin-vue`.

- [ ] **Step 4: Verify routes and protected runtime**

Start a local preview and verify HTTP `200` for:

```text
/admin-vue/
/admin-vue/order/purchase-orders
/admin-vue/order/purchase-orders/POC-202608-001
/admin-vue/agent/skill-create
```

Record SHA-256 for both protected runtime files before any deployment and confirm the build did not alter them.

- [ ] **Step 5: Commit source, log and required build output**

Stage explicit task files only. Reject any staged path matching `node_modules`, `downloads`, `.zip`, `__MACOSX`, `* 2.*`, `server 2.js`, caches, or `tsconfig.tsbuildinfo`.

### Task 4: Reconcile GitLab And Publish The New Preview

**Files:**
- Git target: `origin/dev/zhangrui`
- Preview target: `/opt/projects/lexiang-new/public/admin-vue`

**Interfaces:**
- Consumes: verified commits and build output from Task 3.
- Produces: GitLab source at the new commit and a verified `new.leaibot.cn` preview; formal remains unchanged.

- [ ] **Step 1: Re-read the remote branch before push**

Fetch `origin/dev/zhangrui`. If it advanced beyond `fe71589`, rebase the dedicated branch and resolve only task-file conflicts; do not discard remote work.

- [ ] **Step 2: Audit the final diff and push**

Verify the diff from remote `dev/zhangrui`, staged file list, and commit history. Push the dedicated branch tip to `refs/heads/dev/zhangrui` only when it is a fast-forward.

- [ ] **Step 3: Inspect the preview server before deployment**

Through SSH, inspect `/opt/projects/lexiang-new` branch, remotes, status, current entry hashes, and protected runtime hashes. If source or target files contain unrelated uncommitted work, stop before modifying them and use a clean server-side clone/build source.

- [ ] **Step 4: Deploy without deletion or protected-runtime replacement**

Update preview from Git, build in the clean server-side source, and sync generated assets without `--delete`, excluding:

```text
admin-runtime/workbench-geo.js
admin-runtime/workbench-pages.js
```

- [ ] **Step 5: Verify the public preview**

Confirm the public entry references the new hashed JS/CSS, the four target routes return successfully, the order page contains the expected 0812 class names, and protected runtime hashes match their pre-deployment values.

- [ ] **Step 6: Report separate release states**

Report GitLab commit, `new` preview URL, protected-runtime result, and any unavailable browser-level checks. Explicitly state that `leaibot.cn` formal was not changed.

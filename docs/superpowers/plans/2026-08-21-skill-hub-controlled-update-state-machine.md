# Skill Hub Controlled Update State Machine Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement the 2026-08-21 controlled capability-update contract in the Skill Hub POC, including six lifecycle seed scenarios, action-code-driven buttons, failure/retry and subsequent-change flows, while preserving refresh-to-seed behavior.

**Architecture:** Keep the current Pinia POC store and Vue pages, but move all status and action decisions into `skillCapabilityChanges.js`. Add canonical three-dimensional status fields and a typed `allowedActionsFor(item, actor)` store adapter while retaining legacy fields for the existing Skill creation flow. The Skill Hub view renders labels and buttons from the centralized presentation contract instead of deriving operations from Chinese strings.

**Tech Stack:** Vue 3, TypeScript, Pinia, Vue Router, Node test runner, Vite.

## Global Constraints

- Work only in `dev/zhangrui-capability-state-matrix-20260821` inside the isolated clone.
- Preserve Sidebar, Topbar, right Agent, permissions, unrelated business pages, and the five Skill creation steps.
- Do not modify `public/admin-vue/admin-runtime/workbench-geo.js` or `workbench-pages.js`.
- Keep POC state in memory; a full refresh must restore the fixed seed records.
- Render at most one main status and one capability-update prompt per Skill row.
- When an update decision is pending, hide all lower-priority lifecycle actions.
- Use `allowedActions` codes as the UI contract; do not infer permissions from Chinese button text.
- Deploy to `new` only after all required checks pass; do not update formal or server `main`.

---

### Task 1: Canonical State And Action Contracts

**Files:**
- Modify: `vue-app/src/services/skillCapabilityChanges.js`
- Modify: `vue-app/src/stores/skillHub.ts`
- Test: `vue-app/scripts/skill-capability-sync.test.mjs`

**Interfaces:**
- Consumes: existing `SkillHubItem`, `SkillCapabilityUpdate`, current user role and user name.
- Produces: `onlineStatus`, `workflowStatus`, expanded `CapabilityUpdateStatus`, `SkillHubAllowedAction`, `skillHubRowPresentation(item)`, `resolveSkillHubAllowedActions(item, actor)`, and the store adapter `allowedActionsFor(item, actor)`.

- [ ] **Step 1: Write failing three-dimensional status tests**

Add assertions that normalized records expose independent online, workflow and capability-update status:

```js
assert.deepEqual(skillHubRowPresentation({
  onlineStatus: 'published',
  workflowStatus: 'review',
  capabilityUpdate: { ...update, status: 'available' }
}), {
  mainStatus: 'review',
  mainStatusLabel: '待审批',
  updateStatus: 'available',
  updateStatusLabel: '有更新'
})
```

Cover `available`, `preparing`, `failed`, `processing + draft`, `processing + review`, `processing + approved`, `processing + rejected`, `processing_with_available`, `ignored` and `resolved`.

- [ ] **Step 2: Run the targeted test and verify RED**

Run: `node --test scripts/skill-capability-sync.test.mjs`

Expected: FAIL because the new statuses and `skillHubRowPresentation` do not exist.

- [ ] **Step 3: Add canonical types and normalization**

In `skillHub.ts`, add:

```ts
export type OnlineStatus = 'unpublished' | 'published' | 'disabled'
export type WorkflowStatus = 'draft' | 'review' | 'approved' | 'published' | 'disabled' | 'rejected'
export type CapabilityUpdateStatus =
  | 'none'
  | 'available'
  | 'preparing'
  | 'processing'
  | 'processing_with_available'
  | 'failed'
  | 'ignored'
  | 'resolved'
```

Add `onlineStatus` and `workflowStatus` to `SkillHubItem`. Keep `status`, `statusText`, `online` and `editStatus` synchronized for existing creation-flow consumers. Define the typed action object separately because allowed actions depend on the current actor.

- [ ] **Step 4: Implement the row presentation resolver**

Add `skillHubRowPresentation(item)` in `skillCapabilityChanges.js`. It must return the single main state plus optional update prompt exactly as section 5 of the approved design specifies.

- [ ] **Step 5: Write failing action-priority tests**

For every lifecycle under `available`, assert the only maintainer actions are:

```js
['view_change', 'start_update', 'ignore_update']
```

Add separate assertions for `preparing`, `failed`, each `processing` workflow, `processing_with_available`, normal owner actions and normal administrator actions.

- [ ] **Step 6: Run the targeted test and verify RED**

Run: `node --test scripts/skill-capability-sync.test.mjs`

Expected: FAIL because action-code resolution is not implemented.

- [ ] **Step 7: Implement centralized allowed-action resolution**

Add:

```js
export function resolveSkillHubAllowedActions(item, actor) {
  // Apply update priority first, then role/ownership workflow rules.
}
```

Each result uses `{ code, enabled, payload }`. `preparing` returns disabled `start_update`; non-maintainers retain read-only actions only. Expose `allowedActionsFor(item, actor)` from the Store so the view recalculates the current actor's actions after every transition.

- [ ] **Step 8: Run targeted tests and verify GREEN**

Run: `node --test scripts/skill-capability-sync.test.mjs`

Expected: PASS for state presentation and action priority.

- [ ] **Step 9: Commit the contract layer**

```bash
git add vue-app/src/services/skillCapabilityChanges.js vue-app/src/stores/skillHub.ts vue-app/scripts/skill-capability-sync.test.mjs
git commit -m "feat: add Skill Hub controlled update contracts [tokens:12000]"
```

### Task 2: Six Lifecycle Seeds And Controlled Transitions

**Files:**
- Modify: `vue-app/src/services/skillCapabilityChanges.js`
- Modify: `vue-app/src/stores/skillHub.ts`
- Test: `vue-app/scripts/skill-capability-sync.test.mjs`

**Interfaces:**
- Consumes: Task 1 status and action resolvers.
- Produces: fixed seed updates for all six lifecycle states, `retryCapabilityUpdate`, additional-change merging, high-risk ignore validation, and disabled-state-preserving publish.

- [ ] **Step 1: Write failing seed-coverage tests**

Assert the reset dataset contains at least one `available` record for each workflow state:

```js
assert.deepEqual(
  [...new Set(seedItems.filter(hasAvailableUpdate).map(item => item.workflowStatus))].sort(),
  ['approved', 'disabled', 'draft', 'published', 'rejected', 'review']
)
```

Also assert existing `product-knowledge` and `voucher-recommend` updates remain present and one unaffected Skill remains.

- [ ] **Step 2: Run the targeted test and verify RED**

Run: `node --test scripts/skill-capability-sync.test.mjs`

Expected: FAIL because only published update seeds currently exist.

- [ ] **Step 3: Add additive seed scenarios**

Add one draft Skill and fixed update records for review, approved, disabled and rejected rows. Use distinct `recordId`, context path, source/target versions, summary, risk, detail and affected context data. Do not rewrite existing product or voucher update records.

- [ ] **Step 4: Write failing failure, retry and ignore tests**

Cover:

```js
assert.equal(failed.capabilityUpdate.status, 'failed')
assert.equal(retried.capabilityUpdate.status, 'preparing')
assert.equal(retried.capabilityUpdate.task.id, failed.capabilityUpdate.task.id)
assert.throws(() => ignoreCapabilityUpdate(highRiskItem, { reason: '' }), /处理原因/)
assert.equal(ignoreCapabilityUpdate(enhancementItem, { reason: '' }).capabilityUpdate.status, 'ignored')
```

- [ ] **Step 5: Run the targeted test and verify RED**

Run: `node --test scripts/skill-capability-sync.test.mjs`

Expected: FAIL because failure currently falls back to `available` and high-risk ignore remains deferred.

- [ ] **Step 6: Implement failed, retry and unified ignore**

Change `failCapabilityUpdate` to preserve rollback data and expose `failed`. Allow `beginCapabilityUpdate` to retry `failed` with the same task ID. Change ignore to accept `available` or `failed`, return `ignored`, and require a reason only for breaking or permission changes.

- [ ] **Step 7: Write failing subsequent-change and disabled-publish tests**

Assert a new record arriving during `processing` becomes `processing_with_available`, reuses the edit version, and returns to the previous processing workflow after update or ignore. Assert publishing an update whose original online state was disabled leaves `onlineStatus = disabled`.

- [ ] **Step 8: Run the targeted test and verify RED**

Run: `node --test scripts/skill-capability-sync.test.mjs`

Expected: FAIL because these transitions are not implemented.

- [ ] **Step 9: Implement subsequent-change merging and online-state inheritance**

Store the current processing workflow as `resumeWorkflowStatus`, track pending and active change IDs, merge later accepted changes into the same draft, invalidate evaluation, and restore the processing workflow after an accepted or ignored later change. On release, replace the online version but retain disabled state when applicable.

- [ ] **Step 10: Run targeted tests and verify GREEN**

Run: `node --test scripts/skill-capability-sync.test.mjs`

Expected: all state-transition and seed tests PASS.

- [ ] **Step 11: Commit the state transitions**

```bash
git add vue-app/src/services/skillCapabilityChanges.js vue-app/src/stores/skillHub.ts vue-app/scripts/skill-capability-sync.test.mjs
git commit -m "feat: cover capability updates across Skill lifecycles [tokens:14000]"
```

### Task 3: Action-Code-Driven Skill Hub UI

**Files:**
- Modify: `vue-app/src/views/agent/AgentSkillsView.vue`
- Modify: `vue-app/src/components/agent/SafeCapabilityMarkdown.vue` only if the existing component cannot render the new error block safely.
- Test: `vue-app/scripts/skill-capability-sync.test.mjs`

**Interfaces:**
- Consumes: `skillHubRowPresentation`, `SkillHubAllowedAction[]`, `allowedActionsFor(item, actor)` and store transition actions from Tasks 1-2.
- Produces: status rendering, action-code mapping, strict update gates, failure details and validated ignore confirmation.

- [ ] **Step 1: Write failing source-contract tests**

Assert the view iterates `allowedActionsFor(item, actor)`, switches on action codes, maps `ignore_update` to “忽略更新”, and no longer builds action arrays from Chinese lifecycle labels.

- [ ] **Step 2: Run the targeted test and verify RED**

Run: `node --test scripts/skill-capability-sync.test.mjs`

Expected: FAIL because the view still uses `skillHubActions(item)` and Chinese action strings.

- [ ] **Step 3: Replace status and action rendering**

Render `mainStatusLabel` and optional `updateStatusLabel`. Iterate the actions returned by `allowedActionsFor`; map each action code to one fixed label, tone and handler. Preserve the current compact action layout and T7 table structure.

- [ ] **Step 4: Implement confirmation and failure UI**

Use one “忽略更新” confirmation. Show a required reason and inline error for high-risk changes. Route `view_update_error` to the change detail with task phase, task ID, error and retry guidance. Disable the loading update action during `preparing`.

- [ ] **Step 5: Connect transitions without changing Skill creation structure**

`start_update`, `retry_update` and `continue_update` enter `/agent/skill-create` at clarification using the existing route/session draft. Continue update must not re-run the seeded instruction. Submission, approval, rejection and publish continue through the existing store hooks.

- [ ] **Step 6: Run targeted tests and verify GREEN**

Run: `node --test scripts/skill-capability-sync.test.mjs`

Expected: all action-code and UI contract tests PASS.

- [ ] **Step 7: Commit the UI integration**

```bash
git add vue-app/src/views/agent/AgentSkillsView.vue vue-app/scripts/skill-capability-sync.test.mjs
git commit -m "feat: render Skill Hub actions from update contract [tokens:12000]"
```

### Task 4: POC Log, Regression Checks And New Preview

**Files:**
- Modify: `vue-app/src/components/shell/sidebar/WorkbenchSidebar.vue`
- Modify: `public/admin-vue/index.html`
- Add: generated `public/admin-vue/assets/*` referenced by the new entry.
- Test: `vue-app/scripts/skill-capability-sync.test.mjs`

**Interfaces:**
- Consumes: completed source implementation.
- Produces: grouped POC adjustment log, production build and verified `new` preview.

- [ ] **Step 1: Add one grouped POC log entry**

Record the six-lifecycle decision gate, structured action codes, failure/retry, later-change handling and refresh reset as one Beijing-time entry with status `已更新 new 预览`.

- [ ] **Step 2: Run the complete engineering checks**

Run:

```bash
pnpm guard:design-skill
node --test scripts/skill-capability-sync.test.mjs
pnpm lint
pnpm typecheck
pnpm build
pnpm smoke:shell
```

Expected: every command exits successfully.

- [ ] **Step 3: Verify generated and protected file boundaries**

Run `git diff --check`, confirm there are no deletions in `public/admin-vue/assets`, and confirm neither protected runtime file is staged. Compare their hashes before and after build.

- [ ] **Step 4: Fetch and reconcile the latest server main**

Fetch `origin/main`. If it advanced, rebase the feature branch and rerun the targeted tests and build. Stop on any overlapping conflict instead of choosing a whole-file side.

- [ ] **Step 5: Commit final log and artifacts**

```bash
git add vue-app/src/components/shell/sidebar/WorkbenchSidebar.vue public/admin-vue/index.html public/admin-vue/assets
git commit -m "build: publish controlled update POC assets [tokens:10000]"
```

- [ ] **Step 6: Push only the personal preview branch**

Push to `preview/zhangrui/skill-capability-state-matrix-20260821`. Do not push `incoming/zhangrui` or merge `main`.

- [ ] **Step 7: Incrementally update `new`**

Create a server Git archive from the preview branch, collision-check same-name assets, copy assets without delete, recheck the current preview entry hash, then atomically replace only `public/admin-vue/index.html`. Do not sync `admin-runtime`.

- [ ] **Step 8: Verify the deployed preview**

Confirm server-local and public `new` both load the new hashed entry and return HTTP 200 for its assets. Verify Skill Hub route resources, expected status/action text, and unchanged protected runtime hashes.

- [ ] **Step 9: Report preview-only completion**

Report the `new` URL, final commit and branch, test evidence and protected-file result. Explicitly state that formal and Git main were not merged.

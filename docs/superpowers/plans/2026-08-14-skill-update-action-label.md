# Skill Hub Update Action Label Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Show “更新” until an ability-update draft is saved, then show “继续更新” consistently in the Skill Hub list and change-detail dialog.

**Architecture:** Persist a `hasDraftEdits` marker on the capability-update record. Entering the update flow keeps the marker false; saving or submitting the update draft sets it true. A single pure label helper in the Skill Hub view serves both button locations.

**Tech Stack:** Vue 3, Pinia, TypeScript, Node test runner, Vite.

## Global Constraints

- Merely opening and leaving the update page must continue to show “更新”.
- Saving or submitting a valid ability-update draft must show “继续更新”.
- Existing cached records without the new field must behave as `false`.
- Do not change approval, publish, disable, Agent, navigation, or formal-environment behavior.
- Deploy only to `new`; exclude `admin-runtime` and do not use delete-style synchronization.

---

### Task 1: Lock The State Transition With Tests

**Files:**
- Modify: `vue-app/scripts/skill-capability-sync.test.mjs`

**Interfaces:**
- Consumes: `beginCapabilityUpdate(item, updatedAt)`, `mergeCapabilityDraft(current, nextItem, draft, updatedAt)`, `mergeCapabilitySubmission(current, nextItem, updatedAt)`.
- Produces: Regression assertions for `capabilityUpdate.hasDraftEdits` and shared action-label rendering.

- [ ] **Step 1: Write the failing service test**

Extend the existing begin/update test with these assertions:

```js
assert.equal(started.capabilityUpdate.hasDraftEdits, false)

const saved = mergeCapabilityDraft(started, nextItem, started.draft, '2026-08-14 11:06')
assert.equal(saved.capabilityUpdate.hasDraftEdits, true)
```

Extend the submission test:

```js
assert.equal(submitted.capabilityUpdate.hasDraftEdits, true)
```

- [ ] **Step 2: Write the failing view test**

Require one helper to drive both action locations:

```js
assert.match(view, /function capabilityUpdateActionLabel/)
assert.match(view, /capabilityUpdateActionLabel\(capabilityChangeItem\)/)
assert.match(view, /capabilityUpdateActionLabel\(item\)/)
```

- [ ] **Step 3: Run the targeted test and verify RED**

Run: `node scripts/skill-capability-sync.test.mjs`

Expected: FAIL because `hasDraftEdits` and `capabilityUpdateActionLabel` do not exist.

---

### Task 2: Implement Persisted Edit State And Shared Label

**Files:**
- Modify: `vue-app/src/stores/skillHub.ts`
- Modify: `vue-app/src/services/skillCapabilityChanges.js`
- Modify: `vue-app/src/views/agent/AgentSkillsView.vue`

**Interfaces:**
- Consumes: `SkillCapabilityUpdate`, ability-update merge functions, Skill Hub item rows.
- Produces: `SkillCapabilityUpdate.hasDraftEdits?: boolean` and `capabilityUpdateActionLabel(item): '更新' | '继续更新'`.

- [ ] **Step 1: Add the persisted field**

Add the optional compatibility field:

```ts
export interface SkillCapabilityUpdate {
  // existing fields
  hasDraftEdits?: boolean
}
```

- [ ] **Step 2: Initialize and transition the marker**

In `beginCapabilityUpdate`, preserve a true marker and otherwise initialize false:

```js
update.hasDraftEdits = Boolean(update.hasDraftEdits)
```

In both `mergeCapabilityDraft` and `mergeCapabilitySubmission`, update the nested record without mutating the caller:

```js
capabilityUpdate: current.capabilityUpdate
  ? { ...current.capabilityUpdate, hasDraftEdits: true }
  : current.capabilityUpdate
```

- [ ] **Step 3: Add and reuse the label helper**

Add:

```ts
function capabilityUpdateActionLabel(item: SkillHubItem) {
  return item.capabilityUpdate?.hasDraftEdits ? '继续更新' : '更新'
}
```

Use it in the detail-dialog button and `skillHubActions`; leave `capabilityUpdateStatusLabel` unchanged because it describes workflow state, not the action label.

- [ ] **Step 4: Run targeted tests and verify GREEN**

Run: `node scripts/skill-capability-sync.test.mjs`

Expected: all tests pass.

- [ ] **Step 5: Run static and build verification**

Run from `vue-app`:

```bash
pnpm lint
pnpm typecheck
pnpm build
pnpm smoke:shell
```

Expected: all commands pass.

- [ ] **Step 6: Commit implementation**

```bash
git add vue-app/scripts/skill-capability-sync.test.mjs vue-app/src/stores/skillHub.ts vue-app/src/services/skillCapabilityChanges.js vue-app/src/views/agent/AgentSkillsView.vue
git commit -m "fix: distinguish new and continued skill updates"
```

---

### Task 3: Record And Publish The Preview

**Files:**
- Modify: `vue-app/src/components/shell/sidebar/WorkbenchSidebar.vue`

**Interfaces:**
- Consumes: verified implementation and current `new` preview.
- Produces: one updated POC log record and a verified preview deployment.

- [ ] **Step 1: Update the existing grouped POC record**

Extend the current Skill ability-change record with the action-label rule and set its status to pending preview before deployment. Do not add a duplicate record.

- [ ] **Step 2: Rebuild and back up preview**

Build from `vue-app`, back up `/opt/projects/lexiang-new/public/admin-vue` into the personal server backup directory, and record protected-runtime plus formal-entry hashes.

- [ ] **Step 3: Incrementally deploy**

Synchronize `public/admin-vue/` to `/opt/projects/lexiang-new/public/admin-vue/` without deletion and with `admin-runtime/` excluded.

- [ ] **Step 4: Verify public behavior**

Confirm the `new` entry and Skill Hub route return 200, deployed assets contain both labels and the shared helper behavior, and protected-runtime plus formal-entry hashes are unchanged.

- [ ] **Step 5: Mark the same POC record previewed**

Set the record to “已更新 new 预览”, rebuild and incrementally deploy once more, then repeat the public hash checks.

- [ ] **Step 6: Restore tracked build artifacts and commit the log**

Restore local tracked `public/admin-vue`, remove `vue-app/tsconfig.tsbuildinfo`, and commit only the POC log change:

```bash
git add vue-app/src/components/shell/sidebar/WorkbenchSidebar.vue
git commit -m "chore: record skill update label preview"
```

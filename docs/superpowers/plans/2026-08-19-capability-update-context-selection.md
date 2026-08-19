# Skill Capability Update Context Selection Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make capability-update drafts reopen in Skill creation step 2 with affected contexts selected, and align Skill Hub actions with the update draft lifecycle.

**Architecture:** Keep Skill Hub store data as the single source of truth. Merge required context codes into the update draft in the capability-change service, reload the draft whenever the Skill-create route query changes, and preserve internal update action identifiers while mapping their visible labels to the approved copy.

**Tech Stack:** Vue 3, TypeScript, Pinia, Vue Router, Node.js test runner, Vite.

## Global Constraints

- Preserve existing draft selections and add every code in `currentContextCodes` exactly once.
- Do not auto-select `contextId` entries shown as “可选新增”.
- Visible update actions follow `更新 -> 编辑 -> 审批/驳回 -> 发布`.
- The current online Skill remains active until the approved edit version is published.
- Do not modify permission management or protected runtime files.

---

### Task 1: Lock The Capability Draft And Action Contracts

**Files:**
- Modify: `vue-app/scripts/skill-capability-sync.test.mjs`

**Interfaces:**
- Consumes: `beginCapabilityUpdate(item, updatedAt)` and the Vue source files.
- Produces: regression contracts for context union, route-query reload, and visible action labels.

- [ ] **Step 1: Add a failing draft-union test**

Add a case where an existing draft selects `dashboard.geoOverview` and the capability update requires `dashboard.geoKnowledge`; assert the started draft contains both codes once and does not contain `product.knowledge`.

- [ ] **Step 2: Add failing Skill Hub action-copy assertions**

Assert the source maps `继续更新` away, returns `编辑` for a processing update, and renders `审批更新 / 驳回更新 / 发布更新` through a visible action-label function as `审批 / 驳回 / 发布`.

- [ ] **Step 3: Add a failing route-refresh assertion**

Assert `AgentSkillCreateView.vue` watches the `skill`, `edit`, and `capabilityUpdate` route query values and calls `loadEditDraft()` when they change.

- [ ] **Step 4: Run the focused test and verify failure**

Run: `node --test scripts/skill-capability-sync.test.mjs`

Expected: FAIL on the new union, label, and route-watch assertions.

- [ ] **Step 5: Commit the failing contract tests**

```bash
git add vue-app/scripts/skill-capability-sync.test.mjs
git commit -m "test: define capability update draft behavior"
```

### Task 2: Restore Required Contexts On Every Update Entry

**Files:**
- Modify: `vue-app/src/services/skillCapabilityChanges.js`
- Modify: `vue-app/src/views/agent/AgentSkillCreateView.vue`

**Interfaces:**
- Consumes: `SkillCapabilityUpdate.currentContextCodes`, existing `SkillDraftSnapshot.selectedContextCodes`, and route query values.
- Produces: a draft whose selected codes are the stable union of prior selections and required affected contexts; a route watcher that invokes `loadEditDraft()`.

- [ ] **Step 1: Add a focused context-code union helper**

Create a local helper that returns `Array.from(new Set([...(selected || []), ...(required || [])]))` and use it when starting a capability update, including when a draft already exists.

- [ ] **Step 2: Keep optional additions unselected**

Do not add `capabilityUpdate.contextId` to the union. Continue creating optional change cards with `selected: false`.

- [ ] **Step 3: Reload the draft when route intent changes**

Watch the normalized tuple `[route.query.skill, route.query.edit, route.query.capabilityUpdate]`. After mount, call `loadEditDraft()` when that tuple changes so an already-open Skill-create tab restores the requested update draft and selects step `clarify`.

- [ ] **Step 4: Run the focused test**

Run: `node --test scripts/skill-capability-sync.test.mjs`

Expected: context-union and route-refresh tests PASS; action-copy assertions remain failing until Task 3.

- [ ] **Step 5: Commit context restoration**

```bash
git add vue-app/src/services/skillCapabilityChanges.js vue-app/src/views/agent/AgentSkillCreateView.vue
git commit -m "fix: restore affected capability contexts"
```

### Task 3: Align Skill Hub Actions With The Edit Lifecycle

**Files:**
- Modify: `vue-app/src/views/agent/AgentSkillsView.vue`
- Modify: `vue-app/src/data/pocLogServerRecords.ts`

**Interfaces:**
- Consumes: `capabilityUpdate.status`, `editStatus`, existing internal actions `审批更新`, `驳回更新`, and `发布更新`.
- Produces: visible actions `更新`, `编辑`, `审批`, `驳回`, and `发布` without changing the existing capability transition handlers.

- [ ] **Step 1: Change the update-entry label**

Return `更新` only when the capability update status is `available`; return `编辑` once the update status is `processing`. Remove the visible `继续更新` path.

- [ ] **Step 2: Prevent edit actions during review and approval**

Only add the update-entry action for `editStatus` values `draft` or `rejected`. Keep review actions for administrators and publication after approval.

- [ ] **Step 3: Map internal governance actions to approved labels**

Add `actionLabel(action)` so `审批更新`, `驳回更新`, and `发布更新` render as `审批`, `驳回`, and `发布`, while handlers and confirmation descriptions remain update-specific.

- [ ] **Step 4: Record the grouped adjustment**

Add one Beijing-time POC log row covering route refresh, required-context selection, and the update action lifecycle. Set status to source-complete/pending preview; do not claim `new` or formal deployment.

- [ ] **Step 5: Run focused and project verification**

Run:

```bash
node --test scripts/skill-capability-sync.test.mjs
pnpm lint
pnpm typecheck
pnpm build
pnpm smoke:shell
```

Expected: all tests and checks PASS. If the smoke server is sandbox-blocked, rerun it with approved local-port permission.

- [ ] **Step 6: Commit the implementation**

```bash
git add vue-app/src/views/agent/AgentSkillsView.vue vue-app/src/data/pocLogServerRecords.ts public/admin-vue
git commit -m "fix: align capability update draft workflow"
```

### Task 4: Final Conflict And Scope Review

**Files:**
- Verify only; no planned source changes.

**Interfaces:**
- Consumes: completed branch and current `origin/dev/zhangrui`.
- Produces: a verified local branch ready for explicit `new` deployment confirmation.

- [ ] **Step 1: Fetch the latest GitLab branch**

Run: `git fetch origin --prune`

- [ ] **Step 2: Check merge compatibility without changing the worktree**

Run: `git merge-tree --write-tree HEAD origin/dev/zhangrui`

Expected: exit 0 with no conflict messages.

- [ ] **Step 3: Review scope and whitespace**

Run: `git diff --check origin/dev/zhangrui..HEAD` and inspect the name-status list. Confirm permission management and protected runtimes are absent.

- [ ] **Step 4: Report the local result**

Provide the branch and test evidence. Keep `new`, formal, and Git push unchanged until separately confirmed.

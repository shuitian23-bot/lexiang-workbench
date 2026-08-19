# Capability Update Auto-Scan Query Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Seed one visible auto-scan query when a capability update starts and stop repeating the detected-change summary after the update is in progress.

**Architecture:** Keep capability update initialization in `skillCapabilityChanges.js`, where affected context codes are already merged into the draft. Add a stable query message there and use a narrow view predicate in `AgentSkillsView.vue` for the pre-update-only summary.

**Tech Stack:** Vue 3, TypeScript, JavaScript service modules, Node test runner, Vite.

## Global Constraints

- The query text includes the current Skill Chinese name and is inserted exactly once.
- Legacy processing drafts are backfilled without duplicating existing messages.
- Optional new capabilities are not auto-selected.
- `查看变化`, update status, editing, approval, rejection, and publishing behavior remain unchanged.
- Do not modify permission management or protected `admin-runtime` files.

---

### Task 1: Lock the draft and list behavior with failing tests

**Files:**
- Modify: `vue-app/scripts/skill-capability-sync.test.mjs`

**Interfaces:**
- Consumes: `beginCapabilityUpdate(item, updatedAt)` and `hydrateCapabilityUpdate(item, seededUpdate)`.
- Produces: regression expectations for one query, legacy backfill, and pre-update-only summary visibility.

- [ ] **Step 1: Add service assertions**

Assert that a newly started update contains exactly one user message with `自动扫描`, the Skill Chinese name, and the existing affected context selection. Hydrate a processing legacy draft twice and assert the stable query message remains singular.

- [ ] **Step 2: Add the view behavior assertion**

Assert that the summary block uses a predicate whose result is true only when `item.capabilityUpdate.status === 'available'`.

- [ ] **Step 3: Run the focused test and verify RED**

Run: `node --test scripts/skill-capability-sync.test.mjs`

Expected: the new query and summary-visibility assertions fail because the production behavior is not present.

### Task 2: Implement one-time auto-scan query creation

**Files:**
- Modify: `vue-app/src/services/skillCapabilityChanges.js`

**Interfaces:**
- Produces: `buildCapabilityScanQuery(item, update)` and one stable `clarifyMessages` user entry per capability change record.

- [ ] **Step 1: Add the query builder and stable message id**

Build `请基于最新能力上下文，自动扫描「${item.cnName || item.name}」Skill 受影响的能力，并更新本次草稿的能力上下文。` and identify it with `capability-scan-${update.recordId}`.

- [ ] **Step 2: Seed and backfill exactly once**

Add the message when creating a draft and, during processing-draft hydration, prepend it only when the stable id is absent. Keep the existing affected-context merge unchanged.

- [ ] **Step 3: Run the focused test and verify the service assertions pass**

Run: `node --test scripts/skill-capability-sync.test.mjs`

Expected: query and context assertions pass; the summary-visibility assertion remains RED until Task 3.

### Task 3: Hide the processed change summary

**Files:**
- Modify: `vue-app/src/views/agent/AgentSkillsView.vue`
- Modify: `vue-app/src/data/pocLogServerRecords.ts`

**Interfaces:**
- Produces: `shouldShowCapabilityChangeSummary(item)` returning true only for `available` updates.

- [ ] **Step 1: Replace the summary render condition**

Use `shouldShowCapabilityChangeSummary(item)` for the orange summary while retaining `hasCapabilityUpdate(item)` for update status and actions.

- [ ] **Step 2: Extend the existing POC log record**

Update the current 2026-08-19 source-only record to include the auto-scan query and post-start summary hiding. Do not add a duplicate deployment record.

- [ ] **Step 3: Run focused tests and verify GREEN**

Run: `node --test scripts/skill-capability-sync.test.mjs`

Expected: all tests pass.

### Task 4: Build and verify without overwriting shared work

**Files:**
- Regenerate: `public/admin-vue`

**Interfaces:**
- Produces: production assets matching the verified Vue source.

- [ ] **Step 1: Run static verification**

Run: `pnpm lint && pnpm typecheck && pnpm build`

Expected: exit 0 for all commands.

- [ ] **Step 2: Run shell and browser verification**

Run: `pnpm smoke:shell`, then verify the four browser states from the design.

- [ ] **Step 3: Check collaboration boundaries**

Fetch `origin/dev/zhangrui`, run `git diff --check`, `git merge-tree --write-tree`, and confirm protected runtime and permission files are absent from the diff.

- [ ] **Step 4: Commit the implementation**

Stage only the focused source, test, log, documentation, and required generated assets. Keep `new`, formal, and Git deployment as separate user-confirmed actions.

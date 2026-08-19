# Portal UI 0818 Capability Update Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Adopt the 0818 design governance baseline and complete the remaining controlled capability-update P0 behavior without changing sealed workbench surfaces.

**Architecture:** Keep capability state transitions in `skillCapabilityChanges.js` and Pinia persistence in `skillHub.ts`. Distribute the authoritative 0818 design Skill without importing it at runtime, then align its project page registry with the current routes. Preserve all current Vue page structures and protected runtime files.

**Tech Stack:** Vue 3, TypeScript, Pinia, Vue Router, Vite, Node test runner, portal-workbench-ui-0818 consistency guard.

## Global Constraints

- Work only in `/private/tmp/lexiang-ui-0818-capability-20260819` on `dev/zhangrui-ui-0818-capability`.
- Do not modify shell, Agent, permissions, report actions, ordinary Skill lifecycle, or protected admin runtime files.
- Do not deploy or push without a separate user confirmation.
- Use tests before every product behavior change.

---

### Task 1: Adopt the 0818 design governance baseline

**Files:**
- Create: `skill/portal-workbench-ui-0818/**`
- Modify: `AGENTS.md`
- Modify: `vue-app/design-baseline.lock.json`
- Modify: `vue-app/design-skill.guard.json`
- Modify: `skill/portal-workbench-ui-0818/references/page-spec-coverage-matrix.md`
- Modify: `skill/portal-workbench-ui-0818/references/page-visual-acceptance.json`
- Modify: `skill/portal-workbench-ui-0818/references/workbench-interactions.md`

**Interfaces:**
- Consumes: `skill.meta.json` fields `skillVersion=2026-08-18` and `skillRelease=0818`.
- Produces: a portable project Skill selected by `verify-design-skill.mjs` and accepted by `check-consistency.mjs`.

- [ ] Copy the supplied 0818 Skill into `skill/portal-workbench-ui-0818` without deleting historical Skill folders.
- [ ] Update project design metadata to recommend release `0818` and search it first.
- [ ] Register the four current route differences in the 0818 page matrix and visual registry.
- [ ] Align the Agent report action contract with the existing no-save product contract.
- [ ] Run `node skill/portal-workbench-ui-0818/scripts/check-consistency.mjs --project vue-app` and confirm zero errors.
- [ ] Run `node vue-app/scripts/verify-design-skill.mjs` and confirm 0818 is selected.

### Task 2: Keep high-risk deferred changes visible

**Files:**
- Modify: `vue-app/scripts/skill-capability-sync.test.mjs`
- Modify: `vue-app/src/services/skillCapabilityChanges.js`

**Interfaces:**
- Consumes: `ignoreCapabilityUpdate(item, resolution, updatedAt)`.
- Produces: deferred high-risk records with `status='available'`, `resolution.action='deferred'`, and presentation label `高风险待处理`.

- [ ] Add a failing test asserting that a permission change remains visible after “暂不处理”.
- [ ] Run `node --test scripts/skill-capability-sync.test.mjs` and confirm the new assertion fails because the record becomes hidden.
- [ ] Change the high-risk branch to retain `available`, suppress the repeated defer action, and expose the risk label.
- [ ] Re-run the capability test and confirm it passes.

### Task 3: Generate complete multi-context update instructions

**Files:**
- Modify: `vue-app/scripts/skill-capability-sync.test.mjs`
- Modify: `vue-app/src/services/skillCapabilityChanges.js`

**Interfaces:**
- Consumes: `buildCapabilityScanQuery(item)` and `capabilityUpdate.affectedContexts`.
- Produces: stable single-context copy and a complete bullet list for multiple affected contexts.

- [ ] Add a failing test with two affected contexts and distinct version pairs.
- [ ] Run the focused test and confirm the second context is absent.
- [ ] Update `buildCapabilityScanQuery` to format every affected context while preserving the single-context wording.
- [ ] Re-run the focused test and the full capability test file.

### Task 4: Record and verify the bounded change

**Files:**
- Modify: `vue-app/src/data/pocLogServerRecords.ts`
- Verify only: protected runtime and unrelated page files.

**Interfaces:**
- Consumes: completed Tasks 1-3.
- Produces: one grouped Beijing-time POC log record and a reviewable isolated diff.

- [ ] Add one grouped POC log entry describing 0818 governance adoption and the two P0 fixes.
- [ ] Run `node --test scripts/*.test.mjs`.
- [ ] Run `./node_modules/.bin/eslint .` and `./node_modules/.bin/vue-tsc --noEmit`.
- [ ] Run `CI=true ./node_modules/.bin/vite build` and `node scripts/smoke-shell.mjs`.
- [ ] Run the 0818 consistency check with changed production files.
- [ ] Confirm `git diff --check`, protected runtime hashes, and explicit task-only file scope.
- [ ] Commit locally; do not push or deploy.

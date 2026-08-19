# Capability Context Controlled Update P0 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Complete the first-batch P0 controlled capability-context update flow in the portal workbench POC.

**Architecture:** Keep change orchestration in `skillCapabilityChanges.js`, persistence in the Skill Hub store, and presentation in the two existing Skill pages. Add one small safe Markdown component so change-report rendering is isolated and testable.

**Tech Stack:** Vue 3, Pinia, TypeScript, Node test runner, Vite.

## Global Constraints

- Use POC/localStorage data only; no real scanning, email, or backend integration.
- Do not change permission management, other Skill lifecycles, or `admin-runtime`.
- Online versions remain active until an approved edit version is published.
- Review score remains `>= 0.80`.
- Preview, formal, and Git upload remain separate confirmation gates.

---

### Task 1: Versioned bindings and update task state

**Files:**
- Modify: `vue-app/scripts/skill-capability-sync.test.mjs`
- Modify: `vue-app/src/services/skillCapabilityChanges.js`
- Modify: `vue-app/src/stores/skillHub.ts`

**Interfaces:**
- Produces: `beginCapabilityUpdate`, `completeCapabilityUpdate`, `failCapabilityUpdate`, `ignoreCapabilityUpdate`, and user-facing state selectors.

- [ ] Add failing tests for target context bindings, stable task IDs, preparing state, success, failure rollback, ignore/defer audit, and newer-record rediscovery.
- [ ] Run the capability test and confirm the new assertions fail for missing behavior.
- [ ] Implement the minimal state/data changes and store methods.
- [ ] Run the capability test and confirm the service tests pass.
- [ ] Commit the state-machine change.

### Task 2: Skill Hub actions, state copy, and reports

**Files:**
- Create: `vue-app/src/components/agent/SafeCapabilityMarkdown.vue`
- Modify: `vue-app/src/views/agent/AgentSkillsView.vue`
- Modify: `vue-app/scripts/skill-capability-sync.test.mjs`

**Interfaces:**
- Consumes: state selectors and ignore/update store methods from Task 1.
- Produces: correct update/ignore/retry/governance actions and a safe Markdown report dialog.

- [ ] Add failing contracts for the P0 status matrix, ignore/defer confirmation, safe Markdown report, and technical-details disclosure.
- [ ] Run tests and confirm failure against the current fixed-card implementation.
- [ ] Implement the minimal Skill Hub UI and report component.
- [ ] Run tests and confirm the Skill Hub contracts pass.
- [ ] Commit the Skill Hub change.

### Task 3: Automatic first clarification generation

**Files:**
- Modify: `vue-app/src/views/agent/AgentSkillCreateView.vue`
- Modify: `vue-app/scripts/skill-capability-sync.test.mjs`

**Interfaces:**
- Consumes: preparing task and versioned draft bindings from Task 1.
- Produces: one visible full update instruction, one automatic model execution, success/failure persistence, and an adopted/not-adopted summary.

- [ ] Add failing contracts for full query content, automatic execution, no duplicate execution, success completion, failure rollback, and decision summary before evaluation.
- [ ] Run tests and confirm the current generic non-executed message fails.
- [ ] Implement automatic execution and persistence using the existing model request path.
- [ ] Run tests and confirm the clarification contracts pass.
- [ ] Commit the automatic-generation change.

### Task 4: Context readability and selection semantics

**Files:**
- Modify: `vue-app/src/views/agent/AgentSkillCreateView.vue`
- Modify: `vue-app/scripts/skill-capability-sync.test.mjs`

**Interfaces:**
- Consumes: affected and optional context records from Task 1.
- Produces: two-line names, full path/code/version hints, and accurate affected-versus-optional sections.

- [ ] Add failing contracts for two-line titles and complete path/code/version hints.
- [ ] Run tests and confirm the current one-line ellipsis fails.
- [ ] Implement the context metadata and responsive CSS changes.
- [ ] Run tests and confirm readability contracts pass.
- [ ] Commit the readability change.

### Task 5: Integrated acceptance and build

**Files:**
- Modify: `vue-app/src/data/pocLogServerRecords.ts`
- Generated: `public/admin-vue/`

**Interfaces:**
- Consumes: all prior tasks.
- Produces: a verified local P0 build ready for separate `new` deployment confirmation.

- [ ] Run all capability and product-contract tests.
- [ ] Run lint, typecheck, build, and shell smoke.
- [ ] Verify protected runtime and permission-management files are unchanged.
- [ ] Exercise the ten PRD acceptance scenarios in a browser at desktop widths.
- [ ] Update one grouped POC log record with local-source status only.
- [ ] Commit source and build artifacts without pushing or deploying.

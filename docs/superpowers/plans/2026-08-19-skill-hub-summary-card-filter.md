# Skill Hub Summary Card Filter Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make all six Skill Hub summary cards filter the Skill list with matching counts and active state.

**Architecture:** Keep the behavior inside `AgentSkillsView.vue`, where summary counts and list filtering already live. Expand the existing summary-filter state and reuse one predicate for both card counts and visible rows so the two cannot drift.

**Tech Stack:** Vue 3 Composition API, TypeScript, Node test runner, Vite.

## Global Constraints

- Preserve the existing Skill lifecycle, capability-update flow, toolbar fields and table actions.
- Clear keyword, status and category when a summary card is selected.
- Do not modify protected `admin-runtime` files.
- Deploy only to `new` after verification.

---

### Task 1: Define the six-card filter contract

**Files:**
- Modify: `vue-app/scripts/skill-capability-sync.test.mjs`
- Modify: `vue-app/src/views/agent/AgentSkillsView.vue`

**Interfaces:**
- Consumes: `SkillHubItem`, current user and the existing `hasCapabilityUpdate(item)` predicate.
- Produces: `SummaryFilter` and `matchesSummaryFilter(item, filter)` used by both counts and rows.

- [ ] Add a failing source contract asserting all six summary entries have filters, the union includes all filter keys, and one shared predicate covers owner, review, published, updates and disabled.
- [ ] Run the focused test and confirm it fails because only `updates` and `disabled` are filterable.
- [ ] Expand `summaryFilter`, render every card as a button, implement the shared predicate, and preserve toggle/reset behavior.
- [ ] Run the focused test and full `skill-capability-sync` suite.
- [ ] Commit the source and test change.

### Task 2: Record, build and update new

**Files:**
- Modify: `vue-app/src/data/pocLogServerRecords.ts`
- Regenerate: `public/admin-vue/index.html`
- Regenerate: `public/admin-vue/assets/*`

**Interfaces:**
- Consumes: verified Vue source from Task 1.
- Produces: an incrementally deployable `admin-vue` build and one updated POC log record.

- [ ] Extend the existing 0818 POC log record with the six-card filtering behavior; keep status `已更新 new 预览`.
- [ ] Run all Node tests, ESLint, TypeScript, Vite build, design checks and shell smoke.
- [ ] Confirm protected runtime hashes and staged task-only scope.
- [ ] Commit the release artifacts, fast-forward preview `incoming/zhangrui`, and deploy only missing hash assets plus the entry file.
- [ ] Verify Skill Hub route, public asset hashes, active filter copy and protected runtime hashes on `new`.

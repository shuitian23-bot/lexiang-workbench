# Compact Capability Update Summary Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Move the ability-update summary from the page top into the existing ability-context module without losing information.

**Architecture:** Remove the page-level banner and render a compact metadata row inside the existing context header. Keep all state and update logic unchanged; this is a narrow template and style adjustment.

**Tech Stack:** Vue 3 SFC, CSS, Node test runner, Vite.

## Global Constraints

- Preserve all four summary values.
- Do not change context selection, draft, approval, Agent, navigation, or formal behavior.
- Deploy only to `new`; exclude `admin-runtime` and avoid delete-style synchronization.

---

### Task 1: Add Failing Layout Assertions

**Files:**
- Modify: `vue-app/scripts/skill-capability-sync.test.mjs`

- [ ] Assert the page-level `skill-capability-update-banner` is absent.
- [ ] Assert `skill-capability-context-meta` is rendered inside `skill-capability-context-panel`.
- [ ] Assert “查看能力上下文” is absent while the existing card-to-context focus behavior remains.
- [ ] Run `node scripts/skill-capability-sync.test.mjs` and confirm RED.

### Task 2: Move And Compact The Summary

**Files:**
- Modify: `vue-app/src/views/agent/AgentSkillCreateView.vue`

- [ ] Remove the page-level banner markup.
- [ ] Add a conditional metadata row under the context module title.
- [ ] Keep the focus function used by capability cards and remove only the banner CSS.
- [ ] Add wrapping compact metadata styles and a narrow container layout.
- [ ] Run the targeted test and confirm GREEN.

### Task 3: Verify And Publish Preview

**Files:**
- Modify: `vue-app/src/components/shell/sidebar/WorkbenchSidebar.vue`

- [ ] Run lint, typecheck, build, smoke, and responsive browser verification.
- [ ] Extend the existing grouped POC log record.
- [ ] Back up the current preview and record protected/formal hashes.
- [ ] Incrementally deploy to `new` with `admin-runtime` excluded.
- [ ] Verify public route/assets and unchanged protected/formal hashes.
- [ ] Commit the POC log status and keep Git/formal untouched.

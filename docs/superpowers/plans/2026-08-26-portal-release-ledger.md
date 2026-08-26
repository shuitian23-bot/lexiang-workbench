# Portal Release Ledger Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make every adjustment-log item show independent `new` and formal release attribution, and record future server releases without relying on Git authors.

**Architecture:** Keep functional change descriptions in the existing Vue log data. Add a small server-side JSON ledger writer that atomically records environment-specific release evidence and publishes one read-only ledger to both sites; the Vue shell loads and overlays that ledger with conservative historical fallbacks.

**Tech Stack:** Node.js, Vue 3, existing Vite build, Node test runner, shell wrapper.

## Global Constraints

- Never edit `/opt/projects/lexiang` source directly.
- Never replace the whole Vue source, `public/admin-vue`, or protected runtime files.
- `new` and formal releases remain separate operations.
- Historical publishers come only from explicit release evidence.
- Every log item always renders `new 预览` and `正式环境`.

---

### Task 1: Release ledger writer

**Files:**
- Create: `scripts/portal-release-ledger.mjs`
- Create: `scripts/record-portal-workbench-release.sh`
- Create: `scripts/portal-release-ledger.test.mjs`
- Modify: `package.json`

**Interfaces:**
- Produces: a JSON ledger keyed by log record key with `new` and `formal` release entries.
- Consumes: environment, record key, title, publisher, release time, version, ledger path and one or more public output paths.

- [ ] Write tests for first release, second-environment merge, same-environment update, output mirroring and invalid input.
- [ ] Run the tests and verify they fail because the writer does not exist.
- [ ] Implement locked, atomic JSON updates and the server-account wrapper.
- [ ] Run the focused test and verify all cases pass.

### Task 2: Vue release display

**Files:**
- Create: `vue-app/src/services/pocReleaseLedger.ts`
- Modify: `vue-app/src/components/shell/sidebar/WorkbenchSidebar.vue`
- Modify: `vue-app/src/assets/workbench.css`
- Modify: `vue-app/scripts/product-contract-regression.test.mjs`
- Modify: `vue-app/src/data/pocLogServerRecords.ts`

**Interfaces:**
- Consumes: `/admin-vue/poc-release-ledger.json` plus existing static log records.
- Produces: two environment rows for every adjustment-log item.

- [ ] Add failing source-contract tests for both environment rows, removal of the single publisher field, runtime-ledger loading and explicit historical release evidence.
- [ ] Run the tests and verify the missing release-row behavior fails.
- [ ] Implement ledger loading, evidence-first fallback and compact two-row rendering.
- [ ] Add only evidence-backed historical records for different server accounts.
- [ ] Run product-contract tests and verify the page contract passes.

### Task 3: Collaboration and release verification

**Files:**
- Modify: `AGENTS.md`
- Create/update generated Vue build under `public/admin-vue` through the normal build only.

**Interfaces:**
- Consumes: `scripts/record-portal-workbench-release.sh` after each environment deployment.
- Produces: durable release attribution visible on both links.

- [ ] Add the exact release-record command to the collaboration rules.
- [ ] Run ledger tests, product-contract tests, design guard, lint, typecheck, shell smoke and build.
- [ ] Confirm no protected runtime or permission-management source changed.
- [ ] Push the isolated commit to `incoming/zhangrui` and check current server main for conflicts.
- [ ] Deploy only `new`, write the `new` release record, and verify the public ledger and current hashed entry.
- [ ] Leave formal marked “未发布” until a separate formal-release confirmation.

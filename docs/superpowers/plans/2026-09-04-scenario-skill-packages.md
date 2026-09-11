# Scenario Skill Packages Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a separate cross-menu “场景技能包” object to Skill Hub, let `admin` compose and self-approve a fixed-version chain of published Skills, enforce the confirmed permission/version/degradation policies, and publish the verified result only to `new`.

**Architecture:** Keep the current Skill store, creation flow, and lifecycle untouched. Add a pure JavaScript policy/reducer module plus a thin independent Pinia store for scenario packages. Render `Skill / 场景技能包` as two views inside the existing `/agent/skills` route, and show the five-step package creator as a dedicated child workspace selected by query state. Use explicit dependency snapshots and derived health rather than mutating underlying Skill versions.

**Tech Stack:** Vue 3, TypeScript, JavaScript ES modules, Pinia, Vue Router query state, Node test runner, Vite, pnpm, scoped CSS, portal-workbench-ui-0818 design contract, Git-isolated worktree.

## Global Constraints

- Work only in `/private/tmp/lexiang-scenario-skill-packages-20260904` on branch `feat/scenario-skill-packages-20260904`.
- Preserve the dirty user checkout at `/Users/liz/Library/Mobile Documents/com~apple~CloudDocs/Codex/门户工作台/lexiang-new` without editing, staging, cleaning, or building in it.
- Do not modify `AgentSkillCreateView.vue`, the left navigation menu tree, global shell CSS, permission pages, AI Agent behavior, or anything under `admin-runtime`.
- Keep `/agent/skills` as the only route for the Hub and package creator in this POC; use `?tab=packages` and `?mode=create` so no new page ID or visual-evidence route is fabricated.
- Keep the existing Skill list in `AgentSkillsView.vue`; do not move it into a new file because the current product-contract and browser regressions inspect its default behavior.
- Store scenario packages separately from `skillHub.items`.
- Only published and enabled Skills may be selected. Every step must snapshot stable Skill ID and exact published version.
- Require at least two Skills spanning at least two first-level menus for this cross-menu POC.
- Allow the primary owner to self-approve. The `admin` POC actor may create, own, approve, and publish, but automated gates remain mandatory at the write boundary.
- Required dependency expiry/emergency disable pauses the package. Optional dependency expiry/emergency disable closes that branch and exposes a degradation explanation.
- A newer Skill version marks the package for upgrade while the old pinned version continues until its expiry. Never mutate a pinned version silently.
- Use `apply_patch` for source and documentation edits. Keep commits narrow and exclude generated dependencies.
- Publish only `new`. Do not update formal, and report Git transport separately from environment deployment.
- Back up preview assets and fingerprint the complete protected `admin-runtime` before deployment. Use non-deleting synchronization and exclude `admin-runtime` entirely.

---

## Task 1: Add a test-first scenario package policy and immutable state reducer

**Files:**

- Create: `vue-app/scripts/scenario-skill-packages.test.mjs`
- Create: `vue-app/src/domain/scenarioSkillPackages.js`
- Modify: `vue-app/package.json`

- [ ] **Step 1: Write failing public-behavior tests**

Create tests using Node's built-in runner. Cover these observable contracts with hand-written inputs:

```js
import {
  createPinnedScenarioStep,
  evaluatePackageForPublish,
  evaluatePackageHealth,
  evaluateRuntimeAccess,
  publishScenarioPackage
} from '../src/domain/scenarioSkillPackages.js'
```

Required cases:

- a Skill without an active published `online` version cannot become a pinned step;
- a published-online Skill from any first-level menu snapshots `skillId`, `menu`, and exact `online` as `pinnedVersion`, even while a newer edit version exists;
- a package with fewer than two Skills or fewer than two menus is blocked;
- a conditional step without a condition is blocked;
- a creator without cross-menu composition permission is blocked;
- creation requires `scenario-package:create`, `scenario-package:compose:cross-menu`, per-Skill metadata-read/reference permissions, and `scenario-package:approve:self` for owner self-approval;
- the write boundary rebuilds step identity, current version, and four non-empty permission buckets from the authoritative catalog, and rejects a stale pin;
- `admin` as owner can self-approve only when every automated gate passes;
- publish creates separate `approved` and `published` audit events;
- an available newer Skill marks `upgrade_required` without changing `pinnedVersion`;
- required expiry yields `paused`;
- optional expiry yields `degraded` and a user-readable branch explanation;
- a required caller permission failure blocks before execution;
- an optional active branch permission failure skips only that branch and returns a degradation explanation;
- runtime requires published status, separate approved/published audit evidence, and exact `scenario-package:<packageId>:use` permission;
- required confirmation/approval evidence blocks the package when absent, while an active optional step degrades and an inactive branch requires no evidence;
- an undeclared runtime Skill is rejected.

- [ ] **Step 2: Confirm the RED state**

From `vue-app` run:

```bash
node --test scripts/scenario-skill-packages.test.mjs
```

Expected: FAIL because `src/domain/scenarioSkillPackages.js` does not exist. Correct unrelated syntax/setup failures until the failure proves only the missing feature.

- [ ] **Step 3: Implement the minimal pure module**

Define JSDoc contracts for dependency state, step kind, permission buckets, actor, draft, package, health, policy result, runtime result, and audit event. Export pure functions with these responsibilities:

```js
createPinnedScenarioStep(skill, options)
deriveScenarioMenus(steps)
evaluatePackageForPublish(draft, actor)
evaluatePackageHealth(steps)
evaluateRuntimeAccess(packageItem, caller, activeOptionalStepIds, requestedSkillIds, evidence)
publishScenarioPackage(draft, actor, now, authoritativeSkills)
createSeedScenarioPackages()
```

Implementation rules:

- accept selection whenever the actual online state is `onlineStatus === 'published'` and `online !== '未发布'`, regardless of a separate newer edit workflow state;
- use `online`, never a potentially newer edit `version`, for the fixed version;
- derive menus from steps;
- require `scenario-package:create`, `scenario-package:compose:cross-menu`, every `skill:<skillId>:metadata:read`, every `skill:<skillId>:reference`, and `scenario-package:approve:self`, with `*` as the POC administrator wildcard;
- require non-empty matching `ownerId` / `actor.id` and consistent `kind` / `required` values;
- rebuild name, menu, current published version, and all four non-empty permission buckets from the authoritative catalog at publication; reject version drift instead of replacing the pin;
- compare `pinnedVersion` and `currentPublishedVersion` without replacing either;
- calculate `healthy`, `upgrade_required`, `degraded`, or `paused` deterministically;
- permission buckets are `menu`, `skill`, `data`, and `action`; wildcard `*` satisfies all;
- runtime output includes `status`, `effectiveSteps`, `skippedSteps`, `missingPermissions`, `missingEvidence`, and readable explanations;
- runtime accepts only published packages with independent approval/publication audit evidence and exact package-use permission, then checks activated-step permissions and confirmation/approval evidence;
- reject requested Skill IDs not declared in the package;
- throw before returning a published object when any write-boundary gate fails.

- [ ] **Step 4: Confirm GREEN and add the explicit package script**

Run:

```bash
node --test scripts/scenario-skill-packages.test.mjs
```

Then add:

```json
"test:scenario-skill-packages": "node --test scripts/scenario-skill-packages.test.mjs"
```

Run `pnpm test:scenario-skill-packages` and confirm every case passes.

- [ ] **Step 5: Self-review and commit the policy slice**

Check that tests assert outcomes instead of source strings, then run:

```bash
git diff --check
git add vue-app/scripts/scenario-skill-packages.test.mjs vue-app/src/domain/scenarioSkillPackages.js vue-app/package.json
git commit -m "feat: define scenario package policies [tokens:7000]"
```

---

## Task 2: Add an independent Pinia store and cross-menu published Skill fixtures

**Files:**

- Create: `vue-app/src/stores/scenarioSkillPackages.ts`
- Modify: `vue-app/src/stores/skillHub.ts`
- Modify: `vue-app/scripts/scenario-skill-packages.test.mjs`

- [ ] **Step 1: Add failing catalog and reducer tests**

Extend the behavior suite to verify:

- the selectable catalog includes every actually published-online Skill across arbitrary first-level menus, including the three seed menus;
- never-published/review-only/disabled Skills are excluded, while an online Skill with a newer edit draft remains selectable at its `online` version;
- seed package `职场人群认证经营管理` contains a required cross-menu core chain and one conditional optional branch;
- one seed dependency is pinned to an older still-valid version and therefore shows `upgrade_required`;
- publishing prepends one package without mutating the seed or producing duplicate IDs;
- resetting returns fresh, isolated seed objects.

- [ ] **Step 2: Confirm the new expectations fail**

```bash
node --test scripts/scenario-skill-packages.test.mjs
```

Expected: FAIL because the catalog fixtures/store adapter are absent.

- [ ] **Step 3: Add narrow published Skill fixtures**

Append three POC Skills to `defaultItems` in `skillHub.ts` without changing existing records or lifecycle behavior:

- `employee-certification-insight` / `职场认证状态查询` / `在职员工管理` / published;
- `workplace-segment-operations` / `职场人群经营分析` / `乐享运营` / published;
- `enterprise-customer-followup` / `企业客户跟进建议` / `企业客户管理` / published.

Their descriptions must make the input/output role clear to a non-technical user. Do not add new global permission fields to `SkillHubItem`; the scenario policy builds its explicit permission snapshot when the Skill is selected.

- [ ] **Step 4: Add the thin independent store**

`scenarioSkillPackages.ts` owns:

```ts
const storedPackages = ref<ScenarioSkillPackage[]>(createSeedScenarioPackages())
const packages = computed(() => storedPackages.value.map(refreshPackageFromSkillHub))
function publishDraft(draft, actor)
function findPackage(id)
function evaluateRuntimeAccess(packageId, caller, activeOptionalStepIds, requestedSkillIds, evidence)
function resetToInitialMock()
```

Export TypeScript interfaces used by the Vue components. Delegate policy and immutable transitions to the tested domain module. Keep POC state in memory, matching the existing Skill Hub seed-reset boundary. List/detail reads and the store runtime evaluator use refreshed clones: a disabled or withdrawn required Skill yields `paused`; the same state on an optional Skill yields `degraded`; a newer online version only yields `upgrade_required` and never changes the pin.

- [ ] **Step 5: Verify and commit**

```bash
pnpm test:scenario-skill-packages
pnpm typecheck
git diff --check
git add vue-app/src/stores/scenarioSkillPackages.ts vue-app/src/stores/skillHub.ts vue-app/scripts/scenario-skill-packages.test.mjs
git commit -m "feat: add scenario package store [tokens:5000]"
```

---

## Task 3: Build the five-step package creation workspace

**Files:**

- Create: `vue-app/src/views/agent/ScenarioSkillPackageCreateView.vue`
- Modify: `vue-app/scripts/product-contract-regression.test.mjs`

- [ ] **Step 1: Add a failing UI contract regression**

Add one focused source contract that verifies the new view has:

- the shared `ContentPageHeader`;
- exact five step labels;
- `role="tablist"`, `role="tab"`, `aria-selected`, and `aria-current="step"` semantics;
- published-Skill filtering via `onlineStatus === 'published'`;
- explicit `pinnedVersion` display;
- required/optional controls and an optional-condition input;
- four evaluation sections: composition permission, dependency versions, chain completeness, runtime permissions;
- a write-boundary call to the independent store, not direct array mutation;
- one “审批并发布” action guarded by automated evaluation and owner confirmation;
- a visible statement that the final caller still needs actual menu, Skill, data, and action permissions.

- [ ] **Step 2: Confirm RED**

```bash
node --test scripts/product-contract-regression.test.mjs
```

Expected: the new view contract fails because the file is missing.

- [ ] **Step 3: Implement steps 1–3**

Build the new scoped Vue view:

- Step 1 has name, description, target audience, trigger, completion criteria, and read-only primary owner.
- Step 2 groups published enabled Skills by first-level menu, supports accessible selection, and displays selected Skill/menu counts.
- Step 3 turns selection into an ordered chain, provides up/down actions, required/conditional selection, and requires a condition for optional steps.
- Validation uses a visible alert summary and moves focus to the first invalid section.

- [ ] **Step 4: Implement steps 4–5 and write-boundary behavior**

- Recompute policy evaluation on entry to step 4 and again when publishing.
- Render pass/warn/block cards with text and status labels, not color alone.
- Show exact dependency snapshots and the confirmed upgrade/expiry behavior.
- In step 5, require the owner confirmation checkbox.
- Disable the action while submitting, catch policy failures without mutating the store, then emit a `published` event with the new package.
- The parent controls URL state; this component only emits `cancel` and `published`.

- [ ] **Step 5: Add scoped responsive styles**

Use existing design tokens, `ContentPageHeader`, `.btn`, white section cards, small radii, and container queries at 1040/720-equivalent content thresholds. The body scrolls; the bottom action row remains visible. Do not introduce purple gradients, glass effects, oversized cards, or global selectors.

- [ ] **Step 6: Verify and commit**

```bash
node --test scripts/product-contract-regression.test.mjs
pnpm lint
pnpm typecheck
git diff --check
git add vue-app/src/views/agent/ScenarioSkillPackageCreateView.vue vue-app/scripts/product-contract-regression.test.mjs
git commit -m "feat: build scenario package creator [tokens:9000]"
```

---

## Task 4: Integrate Skill Hub tabs, package list, detail, and actions

**Files:**

- Modify: `vue-app/src/views/agent/AgentSkillsView.vue`
- Modify: `vue-app/scripts/product-contract-regression.test.mjs`

- [ ] **Step 1: Add failing Hub behavior contracts**

Verify:

- default query state renders `Skill` and preserves all six current Skill summary cards;
- the page contains one accessible `Skill / 场景技能包` tablist;
- package tab has independent keyword/status filters and empty state;
- the primary create action is chosen from the active tab;
- package cards/table show name, owner, menu count, Skill count, exact package version, health, and update warning;
- entering/canceling/publishing uses `tab=packages` and `mode=create` without adding a route;
- the existing Skill action methods and `/agent/skill-create` navigation remain present.

- [ ] **Step 2: Confirm RED**

```bash
node --test scripts/product-contract-regression.test.mjs
```

- [ ] **Step 3: Add accessible tab/query state**

Use `useRoute()` and `router.replace()` to synchronize:

```text
/agent/skills                         → Skill list
/agent/skills?tab=packages            → package list
/agent/skills?tab=packages&mode=create → package creator
```

Ignore unsupported query values and fall back to the Skill list. Do not reuse Skill filters for packages.

- [ ] **Step 4: Add the package list and detail dialog**

- Add package summaries for all, published, upgrade required, degraded, and paused.
- Use a compact table-first T7 layout.
- Render health labels as `已发布 / 待升级 / 降级运行 / 已暂停 / 已禁用`.
- Detail dialog shows ordered steps, exact versions, required/conditional markers, conditions, menu sources, governance statement, degradation note, and audit events.
- Support Escape close and restore focus to the opening control.

- [ ] **Step 5: Integrate create completion and preserve reload behavior**

On package publish, close create mode, keep `tab=packages`, select/show the new row, and notify success. Existing reload handling may reset both independent stores to their POC seeds, but must not remove the tab query before the view renders.

- [ ] **Step 6: Verify and commit**

```bash
node --test scripts/product-contract-regression.test.mjs
pnpm test:scenario-skill-packages
pnpm lint
pnpm typecheck
git diff --check
git add vue-app/src/views/agent/AgentSkillsView.vue vue-app/scripts/product-contract-regression.test.mjs
git commit -m "feat: add scenario packages to Skill Hub [tokens:9000]"
```

---

## Task 5: Register the design scope and preview-only POC log

**Files:**

- Modify: `vue-app/src/content-slot/contentSlotDefinitions.js`
- Modify: `skill/portal-workbench-ui-design/references/page-spec-coverage-matrix.md`
- Modify: `vue-app/src/components/shell/sidebar/WorkbenchSidebar.vue`
- Modify: `vue-app/scripts/product-contract-regression.test.mjs`

- [ ] **Step 1: Add failing registration/log contracts**

Require:

- `agent.skills` content-slot definition mentions Skill/package tabs, package creation workflow, version evaluation, and the runtime-permission validation strategy;
- the page matrix keeps Skill Hub as T7 and adds T4/V2 package-creation behavior inside the same route, without increasing route/page counts;
- no `scenario-skill-packages-20260904` row claims `new` before deployment;
- after actual deployment, the release ledger is the sole source of the `new` publication record and evidence.

- [ ] **Step 2: Confirm RED**

```bash
node --test scripts/product-contract-regression.test.mjs
```

- [ ] **Step 3: Update contracts and log narrowly**

Update only the `agent.skills` definitions/matrix row. Do not hardcode a successful release record before deployment; the release ledger adds it after the real `new` write. Do not change page totals or add a visual-evidence route because package creation remains within `/agent/skills` query state.

- [ ] **Step 4: Run consistency and regressions**

```bash
node skill/portal-workbench-ui-design/scripts/check-consistency.mjs --project vue-app
node --test scripts/*.test.mjs
pnpm guard:design-skill
pnpm lint
pnpm typecheck
git diff --check
```

If the raw consistency command reports existing baseline discrepancies, rerun the identical command in a detached worktree at base `09284d05d9e2fbd05d3592ec7fb7d3fc168be640`; only byte-identical inherited findings may be recorded as delta zero. Any new finding blocks release.

- [ ] **Step 5: Commit the registration slice**

```bash
git add vue-app/src/content-slot/contentSlotDefinitions.js skill/portal-workbench-ui-design/references/page-spec-coverage-matrix.md vue-app/src/components/shell/sidebar/WorkbenchSidebar.vue vue-app/scripts/product-contract-regression.test.mjs
git commit -m "docs: register scenario package workflow [tokens:5000]"
```

---

## Task 6: Full verification and two-stage code review

**Files:**

- Verify all changed files
- Do not edit generated `public/admin-vue` in the implementation worktree

- [ ] **Step 1: Run the fresh automated suite**

From `vue-app`:

```bash
pnpm test:scenario-skill-packages
node --test scripts/*.test.mjs
pnpm guard:design-skill
pnpm lint
pnpm typecheck
```

- [ ] **Step 2: Build from the candidate commit in a clean temporary worktree**

Create a detached verification worktree at the candidate commit. Install from the offline lockfile, build, and run the shell smoke test there:

```bash
pnpm install --offline --frozen-lockfile
pnpm build
pnpm smoke:shell
```

Confirm the generated entry references the new package creator chunk/text and no build step modified protected source/runtime files.

- [ ] **Step 3: Run focused browser acceptance locally**

Using the in-app browser against the clean candidate preview, verify:

- default Skill tab and six summaries;
- package tab, package health and exact versions;
- all five creation steps and validation messages;
- published-only selection;
- required/conditional configuration;
- automated evaluation and owner self-approval;
- published package returning to the package list;
- 1920-wide/Agent closed and 1280/Agent maximum layouts with no horizontal overflow;
- keyboard tab semantics, visible focus, dialog close, and no project console errors.

- [ ] **Step 4: Request independent reviews**

Run specification review first, fix all findings, then run code-quality review. Reviewers must compare against the confirmed design spec, check the old Skill flow for regression, and verify that permission/version enforcement exists at the state mutation boundary rather than only in display code.

- [ ] **Step 5: Record final candidate evidence**

Record commit SHA, build entry asset, test counts, browser routes/states, and hashes of `vue-app/public/admin-runtime/workbench-geo.js` plus `workbench-pages.js`. Confirm `git status --short` is clean.

---

## Task 7: Git-transfer and publish only to `new`

**Files:**

- Runtime output generated from the verified candidate
- Server target: `/opt/projects/lexiang-new/public/admin-vue`
- Protected target: `/opt/projects/lexiang-new/public/admin-vue/admin-runtime`

- [ ] **Step 1: Push the reviewed branch by Git**

Push the candidate directly to `/opt/projects/lexiang-new` as `refs/heads/preview/zhangrui-scenario-skill-packages-20260904`. Confirm the pushed commit SHA. Never push any `incoming/*` branch to the formal `/opt/projects/lexiang` repository, because its cron automatically merges that namespace into `main`. Do not use scp, SFTP, IDE upload, whole-file replacement, or an automatic merge into formal `main` as the deployment mechanism.

- [ ] **Step 2: Resolve the server candidate from Git**

Create or update an isolated server worktree at the exact reviewed commit, install from the lockfile, and build to a fresh external temporary directory. Compare its source SHA and generated entry SHA with the local reviewed candidate.

- [ ] **Step 3: Back up preview and fingerprint protected runtime**

Before writing preview assets:

- create a timestamped backup of `/opt/projects/lexiang-new/public/admin-vue`;
- hash the entry HTML and all files under `admin-runtime`;
- specifically record `workbench-geo.js` and `workbench-pages.js` hashes.

- [ ] **Step 4: Non-deleting preview synchronization**

Synchronize the new candidate into `/opt/projects/lexiang-new/public/admin-vue` without deletion and exclude the complete `admin-runtime/` directory. Do not touch `/opt/projects/lexiang/public/admin-vue` or any formal-serving path.

- [ ] **Step 5: Record the preview release**

From the server personal worktree run the release ledger script for:

```text
environment: new
release key: scenario-skill-packages-20260904
title: Skill Hub 场景技能包
```

Ensure both script output targets point to the preview ledger when required by the current server script. Do not record formal evidence.

- [ ] **Step 6: Verify `new` and formal separation**

Verify preview local origin and public `https://new.leaibot.cn/admin-vue/agent/skills?tab=packages`. Re-run the package creation happy path and inspect console/network failures. Confirm:

- the preview entry asset matches the reviewed build;
- protected runtime hashes are unchanged;
- formal entry HTML/asset hashes are exactly the pre-release values;
- the formal URL does not expose this candidate unless it already existed before this deployment.

- [ ] **Step 7: Final rollback readiness**

If any preview acceptance fails, restore the timestamped preview backup using the same non-deleting, `admin-runtime`-excluding method and verify restored entry/protected hashes. Keep formal untouched in either outcome.

---

## Task 8: Final self-review and handoff

**Files:**

- Review: design spec, implementation plan, source diff, release evidence

- [ ] **Step 1: Run final diff review**

Confirm no TODO/TBD placeholders, no unrelated source, no direct `public/admin-vue` edits in Git, no global CSS changes, no router/menu additions, no credentials, and one preview-only POC log record.

- [ ] **Step 2: Report chains separately**

The handoff must separately state:

- local isolated branch and commit;
- server Git transport/incoming status;
- `new` deployment version/time/publisher/entry asset/rollback backup;
- formal unchanged evidence;
- GitLab/GitHub synchronization status;
- automated/browser verification and any unverified runtime boundary.

- [ ] **Step 3: Stop before formal**

Do not update formal until the user explicitly asks after reviewing `new`.

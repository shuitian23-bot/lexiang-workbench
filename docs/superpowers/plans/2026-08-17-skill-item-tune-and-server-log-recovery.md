# Skill Item Tune And Server Log Recovery Implementation Plan

> **For Codex:** Use the executing-plans workflow to implement this plan task by task. Keep source, `new` preview, formal production, and Git synchronization as separate confirmation gates.

**Goal:** Restore the low-score evaluation item `AI 微调` action and recover complete portal adjustment records from the server's merged branches without overwriting unrelated work.

**Architecture:** Keep the current Skill creation view and global tune flow, adding an optional row-specific prompt path for low-score items. Move recovered server history into a dedicated data module, then merge and sort it with the current sidebar records while exposing source, branch, deployment, and overwrite trace metadata.

**Tech Stack:** Vue 3, TypeScript, Pinia, Node test runner, Vite, pnpm.

---

### Task 1: Add failing regression tests

**Files:**
- Create: `vue-app/scripts/skill-eval-tune-and-poc-log.test.mjs`
- Read: `vue-app/src/views/agent/AgentSkillCreateView.vue`
- Read: `vue-app/src/components/shell/sidebar/WorkbenchSidebar.vue`

**Steps:**
1. Add source-level regression tests that require a row action only for scores below the review threshold, while preserving the global tune action.
2. Require the row action to pass the selected evaluation item into the AI tune prompt.
3. Require the sidebar to import recovered server records and render deployment/source trace fields.
4. Require representative records from `zhangrui`, `baiyu`, and `yejw2`, plus the current server branch audit record.
5. Run the new test and confirm it fails because the behavior and recovered data do not yet exist.

### Task 2: Restore low-score item AI tuning

**Files:**
- Modify: `vue-app/src/views/agent/AgentSkillCreateView.vue`
- Modify: `vue-app/src/assets/workbench.css`

**Steps:**
1. Add an `AI 微调` button next to each evaluation score below `REVIEW_SCORE_THRESHOLD`.
2. Keep the existing global `打开 AI 助手微调` action unchanged.
3. Allow `startAiTune` to receive an optional evaluation item; row actions send only that item's title, score, and suggestion, while global actions keep the batch prompt.
4. Disable row and global actions while a tune request is in progress.
5. Keep the score column fixed and visually compact so the action does not lengthen the card.

### Task 3: Recover server branch records and trace metadata

**Files:**
- Create: `vue-app/src/data/pocLogServerRecords.ts`
- Modify: `vue-app/src/components/shell/sidebar/WorkbenchSidebar.vue`
- Modify: `vue-app/src/assets/workbench.css`

**Steps:**
1. Add the 25 historical portal records recovered from the formal server asset, preserving operator, source reference, deployment target, trace status, and overwrite impact where available.
2. Add a 2026-08-17 server branch audit record covering `main`, all personal `dev/*` worktrees, and the relevant `incoming/zhangrui` merge commits.
3. Merge current and recovered records by time without removing or rewriting existing records.
4. Show operator, deployment targets, source reference, trace status, and overwrite impact in the log detail view with readable fallbacks.
5. Keep unrelated server commits out of the portal product log and note that the personal branches currently contain no commits unique from `main`.

### Task 4: Verify and update the `new` preview only

**Files:**
- Verify: `vue-app/src/**`
- Build: `public/admin-vue/**`

**Steps:**
1. Run the new regression test, existing capability-sync tests, lint, typecheck, and production build.
2. Run the project smoke checks and visually verify the Skill evaluation row actions and adjustment log at 1280px and 1440px.
3. Compare protected `admin-runtime` hashes before deployment.
4. Back up the `new` preview and update only the generated `admin-vue` files needed by this build; never deploy `admin-runtime` from the local build.
5. Verify the public `new` route, assets, row-specific prompt behavior, recovered logs, and unchanged protected runtime hashes.
6. Leave formal production and Git push untouched until separately confirmed.

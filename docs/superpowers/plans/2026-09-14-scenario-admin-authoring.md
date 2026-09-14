# Scenario administrator authoring implementation plan

> **For agentic workers:** Use superpowers:subagent-driven-development to implement each bounded task and review the final integrated result.

**Goal:** Restore administrator creation and editing of their own scenario packages under the user-confirmed rule.

**Architecture:** Export an independent `canAuthorScenarioPackage(actor)` policy alongside the existing governance role. Use it consistently for domain write guards and UI entry visibility; preserve ownership, lifecycle and independent approval rules.

**Tech Stack:** Vue 3, Pinia, JavaScript domain policies, node:test, Vite.

## Global constraints

- Source baseline ab6afeeca841c2a418ef4f1d0c30529faca0bf7d; isolated fix branch.
- Four existing steps and other modules remain unchanged.
- Preserve independent approval, owner-only editing, review-state locking, exact trial evidence and PM seed ownership.
- Release through Git and isolated build, preserve all admin-runtime files and existing assets.

## Task 1: Domain policy and meaningful regression

- [x] Update role/action tests to reproduce wildcard and combined-permission administrators unable to author.
- [x] Export `canAuthorScenarioPackage(actor)` and remove role-exclusive creation/save gates in `vue-app/src/domain/scenarioSkillPackages.js`.
- [x] Test admin save, own revision, submission and rejection of self-review/other-owner editing; maintain permission and trial checks.

## Task 2: Entry, edit form and documentation

- [x] Update and run failing `vue-app/scripts/scenario-role-ui.test.mjs` for administrator direct/create entries.
- [x] Use author capability in WorkbenchSidebar.vue and AgentSkillsView.vue; remove exclusive admin rejection in ScenarioSkillPackageCreateView.vue and update author text.
- [x] Add one grouped POC log entry for this restoration; keep prior release history.
- [x] Check source diff and domain/UI regressions; independent code review.

## Task 3: Verify and deliver

- [x] Verify actual admin entry and local four-step creation, save/reopen, independent approval and role boundaries.
- [x] Run design guard, lint, typecheck, regression, build and shell smoke.
- [ ] Publish verified commit to new then formal using fresh baselines and rollback anchors; record each release after verification.
- [ ] Update server/GitHub and existing GitLab synchronization branch, preserving unrelated changes.
- [ ] Update full source archive with the same complete-project scope and documented packaging-only dependency/credential adjustments; verify manifest and archive integrity.

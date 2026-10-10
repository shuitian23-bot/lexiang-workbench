# Review Management Import Implementation Plan

> For agentic workers: Use subagent-driven-development for the bounded page import, independent review and preview release checks.

**Goal:** Add only 评价管理 / 评价总结 and 辅助生成 from the supplied POC.
**Architecture:** Append two lazy Vue routes and one menu group, port five review page components plus missing FilterField, and reuse current shared components and auth shell.
**Tech Stack:** Existing Vue, TypeScript, ECharts, local in-memory POC data and Playwright.

## Global Constraints

- Do not change other menus, routes, permissions, current personal skill feedback or source dependencies.
- Never copy attachment app.ts/router wholesale, global CSS, Skill directory, auth configuration or compiled runtime.
- Preserve server auth for released assets. Review role selection affects only local POC state.
- Publish new only and retire this task temporary worktree after merge and verified release.

## Task 1: Import isolated page content

- [x] Confirm the local browser fails to find the review summary heading before import.
- [x] Port ReviewSummaryEvaluationView.vue, ReviewSummaryView.vue, ReviewAssistView.vue, ReviewAnalysisPanel.vue and ReviewChart.vue into src/views/reviews.
- [x] Port missing components/content/FilterField.vue without modifying existing shared components. Load ECharts through the existing package, with page-local error state and teardown.
- [x] Wire date filters, summary pagination and list CSV exports; keep seed data and business workflow semantics.
- [x] Run incremental design checks and TypeScript validation on imported components.

## Task 2: Minimal menu and route integration

- [x] In stores/app.ts append reviews key/group (评价总结=/reviews/summary, 辅助生成=/reviews/assist) and only reviews to the existing authenticated default menu list.
- [x] In router/index.ts add two lazy page imports and routes with page IDs reviews.summary/reviews.assist and group reviews; leave every existing route and guard intact.
- [x] Register two T7 pages in design-page-extensions.json and add one POC log record workbench-review-management-20261010 with release state from ledger.
- [x] Assert unchanged existing menu values/order and old routes in browser/scope evidence.

## Task 3: Verify and deliver preview

- [x] Browser-test query, reset, details, charts, mark pass/fail/reason/undo, queue role actions, list exports and pagination with synthetic data; test login restriction and no unexpected network writes.
- [x] Check 1280/1440 layout with Agent open/closed, keyboard dismissal and return to old pages.
- [x] Run existing contract tests, lint, typecheck, build, shell smoke and independent scoped review.
- [ ] Commit explicit task source, normal Git merge with served-output preservation checks, build in own server worktree, publish only verified new output and official release record.
- [ ] Keep rollback evidence outside worktree; lock and recheck remote ancestry, ignored contents and references, then normally remove own task worktree/build.

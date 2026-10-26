# NEW Approval Mail Demo Implementation Plan

> **For agentic workers:** Use superpowers:executing-plans to implement these steps; the primary agent owns remote mutations and independent review owns verification.

**Goal:** Restore NEW approval-mail POC without enabling preview authentication.

**Architecture:** Keep server login intact and introduce a hostname-scoped approval-only flag. Change only approval demo gates, preserve the current NEW source, and publish a non-deleting build to NEW.

**Tech Stack:** Vue 3, Vite, TypeScript, Node test runner and Playwright.

## Global Constraints

- Base the NEW candidate on 54f2c9cad55a4486dde678c89a9e140e26062a70; preserve its additional points pages.
- Keep router authentication unchanged and do not deploy formal resources.
- Retain all admin-runtime files, old assets, backups, unrelated source changes and Git refs.

## Task 1: Separate the approval demo policy

- [x] Run `node --test scripts/approval-mail-review.test.mjs`; baseline 5 tests pass.
- [x] Add `scripts/approval-mail-demo-mode.test.mjs` and run it before source changes; all 11 cases fail because the export is absent.
- [ ] Add to `src/config/runtimeMode.ts`:

```ts
export const allowApprovalMailDemo = allowPreviewAuth || (
  typeof window !== 'undefined' && window.location.hostname === 'new.leaibot.cn'
)
```

- [ ] Replace only the import and six approval demo guards in `src/views/agent/AgentPermissionsView.vue`.
- [ ] Run the 11 configuration cases and existing approval/product/auth regressions.
- [ ] Update the same QA document, browser regression, and one NEW POC log record.

## Task 2: Verify and publish the candidate

- [ ] Run `pnpm typecheck`, `pnpm lint`, the existing design guard and an isolated `pnpm build -- --outDir <task-output>` equivalent without emptying shared output.
- [ ] Start only this task's local preview and run shell smoke.
- [ ] Run the browser regression with `PERMISSION_QA_BASE_URL=https://new.leaibot.cn/admin-vue`, `APPROVAL_QA_AUTH_MODE=server`, `APPROVAL_QA_STATIC_ORIGIN=http://127.0.0.1:19590`, and `APPROVAL_SERVER_QA_BASE_URL=http://127.0.0.1:19590/admin-vue`.
- [ ] Review source diff and unchanged NEW points files; preserve source commits and publish only after successful tests.
- [ ] Back up NEW; add resources and atomically switch its index without deleting old assets or publishing runtime copies.
- [ ] Record actual NEW publisher/time/version, verify public hashes and browser flow, and verify formal resources unchanged.
- [ ] Stop this task's temporary preview/tunnel and remove its clean merged worktree while retaining source, build evidence and backups.

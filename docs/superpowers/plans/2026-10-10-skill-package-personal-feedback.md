# Skill Package Personal Feedback Implementation Plan

> **For agentic workers:** Use superpowers:subagent-driven-development for the independent persistence and UI tasks, followed by review and preview release.

**Goal:** Add persistent personal up/down feedback to every business skill-package card.

**Architecture:** A small localStorage service owns per-account/per-skill state. A legacy adapter observes visible skill card footers; a Vue component uses Teleport to add two buttons without rewriting maintained runtime files.

**Tech Stack:** Existing Vue 3, TypeScript, browser localStorage and MutationObserver, node:test, Playwright.

## Global Constraints

- User approved personal feedback only: up/down mutually exclusive; repeated selection cancels; no counts.
- Obtain identity from useAppStore().user, never legacy STATE demo identity.
- Read current storage before each mutation. Failed writes preserve old state and report failure.
- No changes to permissions, enabled state, protected runtime, or formal deployment.

## Task 1: Feedback persistence

- [ ] Add behavioral tests for set/switch/cancel, reload, two skills, two accounts, malformed records, invalid inputs, blocked storage and failed cancellation.
- [ ] Implement `createSkillPackageFeedbackStore(storageProvider)` in `vue-app/src/services/skillPackageFeedback.js`, returning `read(account, skillKey)` and `toggle(account, skillKey, 'up'|'down')`; read returns `up|down|null`, toggle returns `{ok, value}`. Null accounts must not create storage records; values validate strictly.
- [ ] Run the real service tests and keep fail/pass evidence.

## Task 2: Card UI integration

- [ ] Add `observeSkillPackageCards(onChange)` in legacy adapter, returning disconnect; descriptors are `{element: HTMLElement, key: string, title: string}` with actual footer elements.
- [ ] Add `SkillPackageFeedback.vue`: Teleport into each footer, existing SVG icons, pressed state, tooltip/aria label, current account isolation, storage event refresh and cleanup.
- [ ] Mount once from AppLayout. Scope styling to this modal; order usage then feedback then original switch. Update one grouped POC log record.
- [ ] Browser-test real runtime cards and dynamically replaced cards; verify all controls and no overflow at 1280/1440.

## Task 3: Review and preview release

- [ ] Review implementation and targeted tests, run required typecheck/lint/build/design guard/shell smoke.
- [ ] Commit explicit source only; use existing Git collaboration path and isolated server build.
- [ ] Publish tested build only to new with backup, runtime/main/formal preservation checks and official release ledger entry.
- [ ] Verify preview resources and retire only the task's merged temporary worktree, retaining evidence and branches.

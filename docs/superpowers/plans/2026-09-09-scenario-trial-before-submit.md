# Scenario trial before submission implementation plan

> **For agentic workers:** Use superpowers:subagent-driven-development with disjoint domain, panel and integration ownership.

**Goal:** Require a current error-free simulated trial before submitting a scenario package, with node errors carried back into composition.

**Architecture:** Pure sample simulation and immutable reports; one shared submission gate validates current snapshots and complete node traces. The four-step create page owns requests/reports and passes node errors to the composer. Review stays independent.

**Tech Stack:** Vue 3, Pinia, JSDoc JavaScript domain, strict TypeScript, Node behavior tests.

## Global constraints

- Simulation is explicit, executionPerformed=false; no business API or fake approval.
- No tuning editor, suggestion, score or comparison controls.
- Rerun after semantic config/request changes; positions alone do not invalidate.
- Preview only; preserve formal and admin-runtime.

## Tasks

- [x] Domain: add evaluateScenarioTrialForSubmit; require current report/request, valid mode, full ordered node coverage, nonempty completed output and no blocked nodes. Apply at submit/resubmit without mutation; preserve independent review. Keep errors distinct from reminders. Migrate valid lifecycle fixtures to generate sample trials; test each gate and old-snapshot failure.
- [x] Panel: replace uncommitted TestPanel with ScenarioPackageTrialPanel, retain task/settings/trace, emit running and edit-chain(id), remove editor/buffer/tuning/score/comparison code. Summary displays error/current/stale/not-run honestly and offers node return action through slot.
- [x] Integration: four steps, fold permission/version checks into trial. Guard next/tab/final submission, reset owner confirmation on changes. Composer accepts trialErrors and stale, displays persistent node error hints and scrolls focused node into view. Submit/Hub details retain report/request.
- [x] Verification: focused domain tests and required checks; local browser from empty creation through error→return→modify→rerun→submit/detail, plus no-test/tab bypass/semantic staleness/position-only behavior and narrow content. Review and fix findings.
- [ ] Release: isolated preview ref, matching local/server assets, previous-entry check, backup and additive/atomic update, HTTP/resource hashes, protected fingerprints, publisher/time ledger and evidence archive.

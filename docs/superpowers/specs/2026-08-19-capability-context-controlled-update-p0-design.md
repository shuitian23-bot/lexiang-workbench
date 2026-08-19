# Capability Context Controlled Update P0 Design

## Goal

Bring the `new` POC in line with the first-batch P0 requirements in
`portal-workbench-capability-context-controlled-update-product-plan-20260819.md` without adding real scanning, email, or backend services.

## Scope

- Keep online and edit versions independent until release.
- Model `available`, `preparing`, `processing`, `ignored`, and `resolved` capability-change states.
- Create or reuse one edit draft per `Skill ID + change record ID`.
- Upgrade already-bound context snapshots to target versions; optional unbound contexts remain manual.
- Insert a visible update instruction containing path, old/new versions, and the business summary, then execute it once.
- Return to `available` with a retryable error when generation fails.
- Support ignore/temporary-defer confirmation and retain operator, time, and reason.
- Render a safe business Markdown report plus collapsed technical details.
- Show full capability names, menu paths, codes, and versions.
- Preserve the `0.80` review gate and invalidate stale evaluation results.

## Data Model

`SkillCapabilityUpdate` owns the immutable change record, risk, Markdown report,
context changes, task state, and resolution audit. `SkillDraftSnapshot` owns the
edit version's selected context IDs and versioned context bindings. A task uses a
stable ID derived from the change record so repeat clicks reuse one draft and one
task.

The POC keeps these records in the existing Pinia/localStorage store. Real API
contracts remain a later phase.

## State Flow

1. `available`: show `查看变化 / 更新 / 忽略本次` or `暂不处理`.
2. `preparing`: create/reuse the edit draft, bind affected contexts to target
   snapshots, show a loading update action, and execute the generated instruction.
3. Generation success: persist the first clarification result and draft, then
   move to `processing` with edit status `draft` and label `更新编辑中`.
4. Generation failure: restore the prior draft/version state, return to
   `available`, and expose the failure reason and retry action.
5. Review/approval/rejection use edit status labels without also displaying
   `更新处理中`.
6. Publish switches the online version and resolves the change record.
7. Ignore/defer records an audit result and hides only the current change record;
   a newer record becomes available again.

## UI Design

- Skill Hub derives user-facing status and actions from both change state and
  edit status.
- The change dialog retains top metadata, renders safe Markdown business content,
  and puts raw fields/API differences inside a technical-details disclosure.
- Requirement clarification shows `old -> target` at the top, keeps affected
  bound contexts selected at target versions, and separates optional additions.
- The generated instruction is the first visible user message; its assistant
  result and an adopted/not-adopted summary appear before evaluation.
- Capability cards allow two-line names. Hover/focus and selected chips expose
  full menu path, code, and version.

## Error And Safety Rules

- No production or preview deployment is implied by implementation.
- No update failure may leave a new invalid draft or edit version.
- Permission/breaking changes use `暂不处理`, not silent ignore.
- Markdown output is rendered as text nodes/structured blocks; report HTML and
  event attributes are never executed.
- Protected `admin-runtime` and permission-management files remain untouched.

## Verification

- Expand service tests for binding versions, task idempotency, success/failure,
  ignore/defer, new-record rediscovery, review states, and publish resolution.
- Add source-level contracts for status/action copy, Markdown report structure,
  automatic execution, decision summary, and readable capability names.
- Run capability tests, product contracts, lint, typecheck, build, shell smoke,
  protected-file diff checks, and browser interaction checks at desktop widths.

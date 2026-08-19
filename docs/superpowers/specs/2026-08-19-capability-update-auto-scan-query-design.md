# Capability Update Auto-Scan Query Design

## Context

When a Skill has a detected capability-context change, the Skill Hub row currently keeps showing the orange change summary after the user has already started an update. The update workspace also opens on step 2 without a visible user query explaining why the affected contexts were scanned and selected.

## Approved Behavior

- While the capability update status is `available`, the Skill Hub row shows the orange change summary and detection time.
- Once the update status becomes `processing`, the row hides that summary and time. The update status, `查看变化`, draft state, approval actions, and detail dialog remain available.
- Starting an update creates one visible user query in the step-2 conversation:

  `请基于最新能力上下文，自动扫描「<Skill 中文名>」Skill 受影响的能力，并更新本次草稿的能力上下文。`

- Creating that query and scanning the affected contexts are one update transaction. The existing `currentContextCodes` scan result is merged into the draft selection at the same time.
- Reopening an update draft does not duplicate the query.
- An older processing draft that predates this behavior receives the query once during hydration.
- Optional newly added capabilities remain unselected until the user explicitly adds them.

## Implementation Boundary

`skillCapabilityChanges.js` owns query construction, one-time insertion, and the existing context-code merge. `AgentSkillsView.vue` owns only whether the list summary is visible. The Skill creation view continues restoring the draft from the store and does not make an extra model request on every mount.

## Verification

- Service tests prove new and legacy update drafts contain exactly one auto-scan user query and retain the affected context selection.
- A view contract test proves the orange summary renders only for `available` updates.
- Browser verification covers: available summary visible, click update, step 2 shows the query and selected context, return to Skill Hub, summary hidden and `编辑` retained.
- Lint, typecheck, production build, shell smoke, protected runtime diff, and merge-tree checks must pass before completion.

## Release Boundary

This change remains in the isolated branch until the user separately confirms `new`, formal, and Git actions. It does not modify permission management, the right-side AI assistant, or protected `admin-runtime` files.

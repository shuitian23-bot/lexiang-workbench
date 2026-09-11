# Scenario package independent administrator review

The user's explicit prohibition of self-review supersedes the earlier scenario-package self-approval design. Runtime step confirmation/approval remains optional and separate from package publication review.

## Behavior

The four creation steps end with confirmation and submission. Submission creates a review record, without approval/publication events. Pending packages cannot run. A different administrator with review permission can approve and publish after fresh dependency checks, or reject with a required reason. The original owner can edit a rejected package and resubmit, retaining its history. Wildcard administrator permission does not bypass the owner/submitter exclusion or review-state gate.

Per the user's 2026-09-09 correction, review belongs inside Scenario package management. Skill Hub has only Skill and Scenario package tabs. The package list distinguishes pending review, rejected and published/dependency-health states; its pending-review card/filter and eligible rows' Review action open the existing detail/review dialog. Old tab=review links redirect to the Scenario package pending list. Package details show submission, fixed versions, node contracts, decision notes and audit history. Ordinary Skill review behavior stays unchanged.

## Scope

Use the existing Vue/Pinia preview data model, which restores seeded examples on full reload. This is not a server-backed approval service shared across user sessions. Add a clearly named pending example for administrator walkthroughs; do not add an identity switcher, backend, persistence, or real messages. Preserve placeholder values, drag composition, independent scrolling, runtime permissions, admin-runtime and formal. Release to new only.

## Acceptance

Test submission without publication, self-review denial including wildcard actors, missing review permission, direct-publication denial, approve/reject/resubmit, required rejection reason, repeated decisions, dependency revalidation and runtime denial before approval. Verify the two Hub tabs, package status filters, row review entry, old-link redirect, own submission readonly state, independent administrator decisions, status/audit updates, keyboard focus and narrow layouts in the local browser. Report the preview boundary accurately.

## Scenario usage description

The user removed the separate trigger and completion-criteria fields. Scenario description remains required and describes applicable business situations, user needs, expected results and exclusions, so callers can assess when to use the package. Remove trigger and completionCriteria from creation, validation, review summary, detail, typed package metadata and published output. Clear obsolete fields when processing older records. Package list and search use the scenario description. Preserve description across submission and independent review. Update examples and helper text. No new automatic matching/routing or execution service is introduced; current run preparation still selects by explicit package ID.

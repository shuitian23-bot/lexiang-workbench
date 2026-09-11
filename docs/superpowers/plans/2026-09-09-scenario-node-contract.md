# Scenario Node Contract Implementation Plan

> **For agentic workers:** Use superpowers:subagent-driven-development to implement the independent tasks below.

**Goal:** Make each composed Skill's task, fixed requirements, expected output and input sources editable or inspectable throughout creation and publication.

**Architecture:** Optional string snapshots on ScenarioPinnedStep, shared dependency-derived input descriptions, and a side-effect-free runtime preparation interface. Existing published Skill pins and permission gates remain authoritative.

**Tech Stack:** Vue 3, TypeScript, Pinia, plain JS domain functions and Node test runner.

## Global Constraints

- Base: verified new release 6393c178; isolated branch feat/scenario-node-contract-20260909.
- New preview only; protect all admin-runtime and formal files; no SCP/SFTP or deleting sync.
- Preserve drag connections, single-chain rules, checkbox optionality and 0818 styles.
- No real executor, retry, parallel graph, fake output or new required field.

## Tasks

- [x] Domain and catalog: add getScenarioNodeContract(step) and getScenarioNodeInputs(steps,stepId); add optional task/fixedRequirements/expectedOutput/inputDescription to types and constructor. Rebuild must preserve user overrides. Test defaults, legacy, cycle-safe ancestry, disconnected nodes and published snapshot stability in scenario-node-contracts.test.mjs.
- [x] Composer and reusable summary: three white textareas with existing field styles, readonly derived inputs, node ID details; ScenarioNodeContractSummary props `{steps: ScenarioPinnedStep[]}`. Preserve existing checkbox and canvas CSS. Root integrates summary in approval and published details.
- [x] Runtime preparation: buildScenarioRunPlan(packageItem,caller,request) returns executionPerformed:false, exact pinned steps and distinct requestInput; permission failure returns no steps. Test topology, optional skipped sources, missing inputs, permission/evidence blocks and snapshot isolation.
- [x] Integration: store.prepareRunPlan calls the pure interface; detail execution-configuration view shows pending states, no execute/JSON control. Update grouped POC release record for this date.
- [x] Run targeted tests, design guard, lint, typecheck, build and shell smoke. Inspect create/edit/back/publish flows in browser and scoped diff. Release the verified source after commit using the separate release procedure below.

## Release procedure after the implementation commit

Push the exact source to the independent server preview ref, build there and match the local manifest, then release to new only with protected runtime/formal fingerprints and a backup. Archive final release evidence separately in the workspace delivery record; the environment ledger records the actual publisher, time and source version.

## Validation

- 166 targeted scenario/capability tests and 4 Vue/SSR component checks passed.
- Design skill guard, lint, typecheck, production build and shell smoke passed.
- Four changed UI files have zero incremental design violations; the full design registry retains three pre-existing advertising.productVideo registration errors.
- Local browser confirmed edit/back/review/mock publish/detail, input ancestry, white controls, aligned optional checkboxes and responsive layout.
- Independent review found no remaining P1/P2 after the published-version snapshot repair.

## Follow-up: filling examples

1. Add page-local Skill-specific example copy and persistent helper text in ScenarioSkillPackageComposer.vue; reuse the existing condition-example action.
2. Extend the same grouped WorkbenchSidebar.vue release note. Do not change stores, domain contracts, permissions or initial values.
3. Verify example switching, filled/empty fields, no value overwrite, condition example action, narrow layout and checkbox optionality in the local browser. Run required engineering checks and existing regressions; avoid new tests that merely duplicate static copy.
4. Commit exact source files, push to the existing independent preview ref, compare independent builds and release to new with fingerprints and evidence.

Follow-up validation: six Skill examples switch correctly in the local browser; custom task text is preserved, the condition example action fills the matching condition, helpers stay visible with populated fields, and blank fixed requirements show an example. At 1280 pixels, page and main content have no horizontal overflow. Optional checkboxes remain unchecked at 16 × 16 with zero center offset. Existing 116 scenario tests and all five required engineering commands passed; incremental design scan has no new violations. Readonly review found no P1/P2.

## Follow-up: independent scrolling

1. Bound Step 2 to the remaining page height; keep validation above the composer and the page actions outside the scrolling content.
2. Stretch the three panels to equal height. Scroll the Skill list, canvas and configuration body separately, with headers, search and canvas tools kept visible. Add keyboard focus to scrolling regions and contain scroll chaining.
3. Preserve the existing two-column/single-column breakpoints. On narrow content widths, scroll the stacked panel layout while each panel retains a bounded internal scroll area.
4. Verify scroll isolation, short heights, validation errors, responsive reachability, and drag/connection coordinates after scrolling. Run required checks, update the existing grouped release note, and publish only the verified new preview.

Independent-scroll validation: at 1440 × 1000 the configuration, library and canvas scrolled independently (1097 / 189 / 176.5 pixels), while the main body remained at zero and page actions stayed at y=914. Error messages retain their own height. At 1440 × 500 the body safely scrolls around a 520-pixel composer; panel content is not reduced to zero. With the assistant open at 1280 × 900, 760-pixel and 650-pixel content widths use two and one column respectively; the last panel remains reachable above the footer, with no page horizontal overflow. Dragging a Skill onto an already-scrolled canvas, moving its node by 60 pixels on each axis, connecting three nodes and fitting the canvas all worked; the flow proceeds to evaluation and returns with configuration intact. Confirmation/approval remain optional, unchecked, 16 × 16 and vertically centered. Readonly review found no remaining P1/P2.

## Follow-up: placeholder text

- User clarified that the initial task/output text should be a light placeholder like fixed requirements. New composer nodes now explicitly begin with empty task/expectedOutput overrides, while published descriptions are hints only.
- Resolve hints only from a matching pinned published version, falling back to the existing examples. Preserve user-entered values, existing package snapshots, optional fields and input sources. Update helpers so they no longer claim the text has been filled.
- Verify initial empty values and placeholder colors, typing and clearing, switching nodes and steps, and keeping hints out of the publication summary. Reuse contract/component regressions and required checks; release to new only.

Placeholder validation: local browser confirmed all three fields initially have empty values and the same placeholder color rgb(160,166,176). Entered task/output survive node switching; clearing output restores its placeholder. Approval review shows entered task text and “未补充” for empty fields, with no hint text stored as values. Four component checks and 116 scenario tests passed; guard, lint, typecheck, build and shell smoke passed. One changed page has zero new design violations; the three existing video-page registration errors are unchanged. Readonly review confirmed empty values remain intact through reconstruction and publication and do not introduce a new required-field gate.

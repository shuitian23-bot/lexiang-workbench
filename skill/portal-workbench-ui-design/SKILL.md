---
name: portal-workbench-ui-0803
description: >-
  Use this single authoritative design and implementation skill for the 联想乐享 / 乐享 AI 工作台 / Leaibot portal workbench. It unifies PM requirement analysis, UI/UX design, page optimization, Figma/UAT audits, POC comparison, Vue implementation, responsive validation, accessibility, engineering handoff, and release governance in one contract based on the complete 0803 Vue project. Use it when PM, UI designers, frontend developers, reviewers, or Codex need to add or change portal pages, assess requirement differences, produce design specifications, implement approved work in Vue, or verify delivery. Earlier dated skills, developer editions, project-embedded copies, and historical screenshots are reference evidence only unless the user explicitly requests history. Do not use for unrelated admin systems, marketing sites, or mobile consumer apps.
---

# Portal Workbench UI 0803

## 1. Single Source Of Truth

Use this one skill for PM, UI and development work. Do not maintain a separate developer edition or a separately authored project/PM copy.

Use the target application's repository as the execution baseline. Resolve `<app-root>` to the directory that contains the target `package.json`, `src/` and build configuration:

```text
<app-root>
```

Use release 0803 as the current feature, interaction, implementation and acceptance baseline bundled into this skill. Treat release 0730 and earlier releases only as inherited historical and non-regression references. Do not require the target repository to use a particular folder name, operating-system user name or machine path.

Treat generated/install copies as distributions of this skill. Edit the authoritative 0803 folder first, validate it, then distribute an identical copy. Never merge rules back from a generated copy.

Current architecture:

- Use Vue 3, Vite, Pinia and Vue Router with base path `/admin-vue/`.
- Preserve TypeScript `strict` and `noImplicitAny`.
- Keep sidebar, Topbar, static tabs, AI result selector, right Agent, stores, router, composables and services owned by Vue.
- Keep visible business pages in the Vue route/page layer. Existing wrappers, local `v-html` and migration helpers are transition evidence, not preferred patterns.
- Use `NativeWorkbenchPage` only for registered hidden/detail compatibility routes.
- Reintroduce deleted search-backend or risk-management scope only from a fresh confirmed requirement.

Do not claim all content-slot internals are fully componentized. Do not route a visible migrated page back to `NativeWorkbenchPage` without an explicit rollback request.

## 2. Unified PM, UI And Development Workflow

Use one decision record and one page contract through the whole flow:

1. Compare the latest project baseline with the new PRD, POC, prototype, conversation or audit evidence.
2. Report additions, intentional changes, affected accepted behavior, protected scope, risks and unresolved decisions before changing source.
3. Wait for confirmation when a choice changes product behavior, scope, permissions, data semantics or sealed surfaces.
4. Register or locate the page in `page-spec-coverage-matrix.md`; select exactly one T1–T7 base page type and at most one necessary specialized variant.
5. Produce the design contract: information hierarchy, components, responsive behavior, states, copy, permissions, accessibility and acceptance criteria.
6. Implement only confirmed scope in the target Vue repository. Reuse current components, tokens, classes, stores, composables and services; keep page-private styles scoped.
7. Verify design and engineering results together. Record truthful evidence and do not convert source review or screenshots into unsupported acceptance claims.
8. Archive the confirmed project and this unified skill as matching dated releases; do not create a parallel developer skill.

Read `references/unified-role-workflow.md` for role-specific inputs, outputs and handoff rules. PM/UI work may stop after an approved design/acceptance package; development work continues from that same package without translating it into a second standard.

## 3. Reference Router

Load only the references needed for the task.

| Task | Required references |
|---|---|
| PM/UI/development handoff or release | `unified-role-workflow.md`, then the task-specific references below |
| Any middle content-slot page | `content-slot-design-contract.md`, `page-spec-coverage-matrix.md`, `page-templates.md` |
| Responsive layout or Agent squeeze | `responsive-layout-contract.md`, `layout-grid.md`, `workbench-interactions.md` |
| Visual style, tokens or typography | `style-contract.md`, `design-tokens.md`, `typography.md`; add `brand-assets.md` and `content-guidelines.md` when relevant |
| Components, filters, overlays or states | `components.md`; add `table-patterns.md` and `accessibility.md` when relevant |
| Shell, Agent, tabs, Composer, Skill 创建 or permissions | `workbench-interactions.md`, `vue-architecture-contract.md`; add `icon-rules.md` for icon/tooltip work |
| Vue implementation, route, auth, store or migration | `vue-architecture-contract.md`, `content-slot-migration-plan.md`, `style-contract.md` |
| PRD, conversation requirement or PM POC | `prd-to-ui-workflow.md`, `project-pattern-matching.md`, `reusable-interaction-rules.md`, `prd-ui-acceptance-checklist.md` |
| Design/UAT/Figma audit | `page-spec-coverage-matrix.md`, `page-visual-acceptance.json`, `review-checklist.md`, `style-qa-checklist.md`, `accessibility.md` |
| Static preview or asset production | `asset-inventory.md`, `brand-assets.md`, relevant templates; read `gaps-to-fill.md` only for unresolved asset/token decisions |
| Historical comparison only | `leaibot-admin-ui.md` and earlier project/skill folders; never use them as the default current contract |

For references longer than 100 lines, use the table of contents and load only the relevant section.

## 4. Decision Priority

When sources conflict, use:

1. User-confirmed current requirements and decisions.
2. Current 0803 Vue behavior, data and non-regression boundary.
3. This 0803 skill's content-slot, page-matrix, responsive, interaction and architecture contracts.
4. Applicable component, token, icon, chart, accessibility and content contracts.
5. Current loaded source CSS, token and class contracts.
6. Figma 01–03/05 as absorbed design evidence; Figma 04/UAT and dated files as audit/history only.
7. General design preference.

Record the chosen rule, reason, affected pages and whether the difference is intentional. Do not stack conflicting rules.

## 5. Current Product Contract

### Shell

- Use a three-column workbench: sidebar `168/58px`, Topbar `56px`, right Agent `380px` default and about `492px` maximum.
- Keep the Agent closed on first entry; open it only after explicit user action.
- Use the Topbar AI result selector for conversation-scoped AI result reports. Do not restore a second-row dynamic-tab strip.
- In every AI result detail header, label the exit action `关闭`, never `返回页面`. Closing removes the current result; switch to an adjacent result when available, otherwise restore the active static page.
- Keep the current release light-only in UI; hide the theme toggle and ignore persisted dark preference while retaining future token/runtime capability.
- Treat Topbar, sidebar, brand lockup, collapse controls, account entry, static tabs, AI result selector, right Agent/header, Composer and shared primitives as sealed unless explicitly included in the requirement.

### Content slot

- Use seven base types: standard list, long-filter list, dashboard, business form, task/import, split settings and configuration list.
- Use `20px 24px` normal page padding, white surfaces, fine borders, `8–12px` radii and dense `13–14px` operational typography.
- Use `#3370ff` as primary blue. Reserve Lenovo red for brand/danger. Use the calm project blue/green/purple chart palette.
- Treat Figma 04/UAT as problem evidence, not a correct-style source.

### Responsive

- Respond to measured content width: C-XL `>=1200`, C-L `1040–1199`, C-M `720–1039`, C-S `480–719`, C-XS `<480`.
- Start four-column filters at `1040px`, two columns at `720px`, and one column below `720px`; follow page-specific thresholds where documented.
- Keep content `width:100%`; use fluid grids with `minmax(0,1fr)`. Do not create a parallel `920/620px` general breakpoint system.
- Auto-collapse the sidebar at `<=1320px` and auto-expand a system-collapsed sidebar at `>=1480px`; validate desktop at `1280px` minimum.
- Keep page-root horizontal overflow at zero. Allow table scrolling only inside the table container with actions reachable.

### Agent and structured flows

- Use process block → answer bubble → conditional structured output for Agent and Skill 创建/需求澄清 flows.
- Keep the Composer as one rounded group: use a subtle neutral surface for the outer shortcut/attachment group, a white `--color-surface` editable row, tertiary placeholder text and the shared primary focus ring. Gray only the truly disabled send/control state; never make the default editable textarea look disabled.
- Render only reached states; do not expose chain-of-thought, duplicate waiting rows or run authorization-required actions before approval.
- Collapse completed process history while keeping it auditable; show at most three current active cards.
- Render TODO as direct independent list content after the answer and auto-collapse it when complete.

## 6. Implementation Rules

- Inspect the target repository before editing; adapt paths but do not weaken the design contract.
- Prefer existing components, Pinia stores, composables, services and adapters.
- Keep side effects in composables/services, not arbitrary store actions or scattered DOM calls.
- Do not add new `window.*`, `innerHTML` or ad hoc DOM bridges outside the registered adapter.
- Pass edit/review context through route query, typed state, store or session draft; do not patch fields after navigation as the primary data path.
- Extract shared components when reused by at least two domains or when interaction risk justifies it. Keep single-use or unstable business blocks page-local.
- Never copy a PM POC's complete CSS/runtime stack. Reject shell/shared selectors from broad POC CSS and extract only page-private intent into scoped styles.
- Do not add unregistered `*design-skill*.css` runtime shortcuts or late global imports that override sealed surfaces.
- Treat HTML templates as design references only. Implement final work in current Vue source.

## 7. Validation

From `<app-root>`, run the target repository's equivalent checks. For the reference Vue setup:

```bash
pnpm lint
pnpm typecheck
pnpm build
pnpm smoke:shell
```

If the target repository provides a design guard, run it for protected-surface and global-style warnings. Do not require project or skill fingerprints, fixed directory names or personal paths.

For skill/design work:

- Run `node scripts/check-consistency.mjs --project <target-vue-app>` after changing contracts, assets, templates, page mappings or evidence.
- Run the skill structure validator after changing `SKILL.md` or `agents/openai.yaml`.
- Read `style-qa-checklist.md`; use `review-checklist.md` for audits and implementations.
- Verify Agent closed/default/max layouts and relevant initial, loading, empty, error, no-permission, disabled, submitting, success, partial-success and stale-data states.
- Record `viewport/sidebar/agent/contentInnerWidth` and `scrollWidth-clientWidth` where responsive acceptance is claimed.
- Treat archived 0728 screenshots and 0729/0730 project evidence as historical reference only. Current 0803 acceptance requires new evidence from the target implementation.
- Keep VA-FAIL and VA-BLOCKED truthful. Never promote S1–S4 or VA-R2 into a full interaction/data/accessibility pass.

## 8. Delivery And Version Governance

- Keep `portal-workbench-ui-0803` as the single authored 0803 skill for PM, UI and development.
- Do not create `-dev`, `-pm`, `-ui` or project-specific authored variants.
- Distribute generated copies only when a consuming environment cannot reference this folder directly; run the structure, consistency and portability checks before use.
- Keep dated historical project and skill folders read-only. Create the next dated release from the latest confirmed pair.
- Keep compatibility rule-based: inspect the target source and compare behavior against this contract. Do not block use because a project or skill hash differs.
- Preserve the PM source package shape. Remove generated handoff artifacts only when they are known rebuild outputs; never delete source-owned `vue-app/public`.

## 9. Preview Assets And Evidence

- Use `assets/page-template.html` as a static shell snapshot; current Vue source and confirmed requirements win.
- Use `assets/content-*-template.html` and `assets/content-template.css` as page-type references, not runtime product files.
- Use bundled logos, fonts and assets through portable relative paths.
- Keep `references/page-visual-acceptance.json` and `references/visual-evidence/` as evidence, not reusable UI assets. Preserve their provenance and do not relabel historical captures as current.

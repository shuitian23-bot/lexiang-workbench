# Portal UI 0825 Safe Style Migration

## Goal

Apply the approved 0825 page-header visual treatment without importing the attached snapshot's routing, data, mock, lifecycle, or interaction changes.

## Approved Scope

- Add one shared `ContentPageHeader` presentation component.
- Replace only the page-level title blocks in:
  - Skill Hub
  - Skill 创建
  - 权限管理
  - 权限清理邮件预览
- Preserve every existing action button, click handler, visible label, page body, store call, and route.
- Keep the existing 0818 design guard in place; the 0825 package is a visual reference for this task, not a replacement project baseline.

## Protected Scope

- Do not copy the attached router, stores, services, mock data, or full page files.
- Do not change Skill lifecycle states, buttons, filters, evaluation, review, publish, disable, or refresh behavior.
- Do not change the right AI assistant, shell, navigation, permissions behavior, or protected admin runtime.
- Do not migrate the attached `LeadGovernmentPoolView.vue` or `AgreementOrderView.vue`; both contain full functional rewrites.
- Do not import the unrelated `OrderPurchaseOrdersView.vue` route watcher change.

## Visual Contract

- One page-level `h1` per migrated page.
- Marker: 18px square with the existing primary subtle color and border tokens.
- Title: 19px, line-height 1.35, weight 700.
- Description: 12px, line-height 1.65, tertiary text color, 3px below the title.
- Title marker gap: 8px.
- Actions remain right aligned on desktop and wrap below the title at the existing narrow breakpoint.
- The page root owns the 16px gap to the first business block; no duplicate bottom margin is introduced.

## Acceptance

- Product-contract regression includes a structural check for the shared header and four approved consumers.
- Existing product-contract tests remain green.
- Lint, typecheck, production build, and shell smoke checks pass.
- The final source diff contains no router, store, service, mock-data, or generated runtime changes.
- Browser screenshots verify the four pages at desktop width without overlap or missing actions.

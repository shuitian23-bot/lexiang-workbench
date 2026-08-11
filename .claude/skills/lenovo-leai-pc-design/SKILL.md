---
name: lenovo-leai-pc-design
description: Use when designing, implementing, or reviewing Lenovo Lexiang Super Agent PC interfaces, fullscreen dialog pages, design-system screens, HTML prototypes, Figma mockups, or frontend UI components. Applies Lenovo Lexiang brand identity, Simplified Chinese product voice, PC assistant layouts, full-screen conversation shell rules, component rules, interaction states, and AI-result disclaimers.
user-invocable: true
version: v0.9.2-stage
---

# Lenovo LeAI PC Design

Use this skill for 联想乐享超级智能体 PC 端界面、设计规范、原型、组件实现和设计评审。

For team usage, start with `README.md`. PM, design, and engineering should use the same source directory and follow the "POC first, skill update second" rule in `references/team-usage-workflow.md`.

## Workflow

Use the skill as one connected system, not as isolated example files. The source-of-truth order is:

1. Start with `standards/design-system-complete.html` for the full-site design standard: principles, tokens, page families, state rules, component categories, template map, and validation expectations.
2. Read `references/pc-design-system.md` before making brand, visual, typography, spacing, radius, elevation, or token decisions.
3. Read `references/layout-rules.md` when creating full PC screens, navigation, workspace layouts, side rails, panels, responsive rules, or page shells.
4. Read `references/component-patterns.md` and `assets/component/leai-component.html` when building or reviewing reusable components. `leai-component.html` is the callable component detail library with `PC-位置-功能` names, DOM/class guidance, states, and copyable snippets.
5. Read `assets/icons/icon-board.html` and `references/asset-inventory.md` when choosing icons, logos, fonts, or image assets. Use official SVG files under `assets/icons/`; do not invent replacement icons when an approved asset exists.
6. Read `references/interaction-states.md` when handling loading, streaming, empty, error, permission, disabled, focus, hover, task-running, or generated-answer states.
7. Read `references/content-voice.md` when writing Chinese UI copy, assistant messages, labels, disclaimers, CTA text, or guidance text.
8. Select the closest page template before designing a full page:
   - `assets/templates/home-fullscreen-dialog-template.html` for root/home fullscreen Lexiang conversation.
   - `assets/templates/shop-chat-page-template.html` for `/shop-chat/`, `/b-chat/`, `/biz-chat/` left assistant plus right content pages.
   - `assets/templates/product-detail-page-template.html` for product detail inside the assistant-commerce shell.
9. Read `references/fullscreen-dialog-framework.md` when creating, replacing, or reviewing fullscreen Lexiang conversation rules, then start from `assets/templates/home-fullscreen-dialog-template.html` for the current real POC/template baseline.
10. Read `references/real-pc-dialog-reference.md` and `references/real-pc-dialog-states.md` when creating default, conversation-start, hover, dropdown, floating-menu, shopping-guide, product discovery, or split assistant states.
11. Read `references/commerce-detail-and-home-rules.md` when working on homepage commerce, product category floors, product detail Scheme A, product comparison, or detail review Scheme B.
12. Read `references/shop-chat-page-template.md` when creating, downloading, refreshing, or reviewing the production `/shop-chat/` shopping-guide template, including the left assistant, right mall frame, product-card interactions, product-detail routing, drag-to-composer behavior, responsive commerce grid, and local-open fallback behavior.
13. Reuse assets from `assets/` when available. If required assets are missing, state the gap and use a conservative placeholder rather than inventing a different brand identity.
14. For production code, adapt tokens and assets to the local framework while preserving names and values where practical.
15. Read `references/design-system-governance.md` when maintaining the skill itself, adding components, adding page templates, refreshing icon usage, or checking whether the four-layer design-system relationship is still coherent.
16. For PM or cross-functional POC work, read `references/team-usage-workflow.md` and keep the skill unchanged until the POC has been reviewed.
17. For design or engineering handoff, use `references/acceptance-checklist.md` to check template, component, icon, state, accessibility, and release readiness.
18. For versioned releases or online sync, follow `references/release-and-governance.md`.

When a request needs accurate page reproduction, use all four layers together: `standards/design-system-complete.html` sets the rules, `icon-board.html` selects icon assets, `leai-component.html` defines component implementation details, and the closest `assets/templates/*.html` file provides the page-level composition and interaction baseline.

## Brand Rules

- Keep all product UI copy in Simplified Chinese unless the user explicitly asks otherwise.
- Use Source Han Sans CN / PingFang SC / Microsoft YaHei fallback typography.
- The assistant refers to itself as `联想乐享`.
- Preserve the Lenovo Lexiang identity: crimson Lenovo/Lexiang brand accents and deep aubergine product chrome.
- Prefer quiet, work-focused PC assistant surfaces over marketing-page composition.
- Use restrained lavender-tinted neutrals instead of generic cold gray when creating panels, rails, dividers, and hover states.
- Do not use emoji, heavy glassmorphism, decorative gradient blobs, bokeh backgrounds, stock photography, or oversized landing-page hero layouts for app screens.
- Always include a muted AI disclaimer on generated-answer, recommendation, search-summary, or task-result surfaces.

## PC Product Expectations

- Build the usable product screen first: assistant workspace, task execution, plugin/skill center, knowledge/file workspace, history, settings, or result review.
- Prioritize dense but readable information hierarchy for repeated PC use.
- Use stable dimensions for sidebars, rails, composer bars, toolbars, task cards, and result panels.
- Controls should be complete enough for the target workflow, including hover, active, disabled, loading, selected, error, and empty states when relevant.
- Avoid nested cards. Use cards for repeated items, modals, or framed tools only.

## Resource Map

- `references/pc-design-system.md`: color, typography, spacing, elevation, icon, and brand principles.
- `references/layout-rules.md`: PC shell, navigation, workspace, panel, and responsive rules.
- `references/component-patterns.md`: core component inventory and expected behavior.
- `references/interaction-states.md`: state patterns for AI generation and agent task flows.
- `references/content-voice.md`: Simplified Chinese naming, labels, messages, and disclaimers.
- `references/real-pc-dialog-reference.md`: real PC dialog/shopping-guide layout reference from Lenovo Lexiang.
- `references/real-pc-dialog-states.md`: strict default, conversation-start, hover, account menu, more-menu, and June 3 browser-fit update rules from real PC screenshots.
- `references/fullscreen-dialog-framework.md`: strict fullscreen conversation rules, tokens, 100vh shell, floating top navigation, side rail, suggestion chips, composer controls, turn index, motion/accessibility, and responsive behavior. It is a rule reference, not the current standalone template entry.
- `references/commerce-detail-and-home-rules.md`: production refinements for homepage hero centering, two-row suggestion chips, product detail Scheme A, detail long-image stacks, product category floors, and Scheme B review modules.
- `references/shop-chat-page-template.md`: current production `/shop-chat/` page framework, interaction contract, and template refresh rules for the left assistant plus right mall/product-detail area.
- `references/asset-inventory.md`: available logos, icons, fonts, and avatar art.
- `references/design-system-governance.md`: maintenance rules for the four-layer model, calling order, template requirements, component requirements, icon requirements, expansion roadmap, and version discipline.
- `references/team-usage-workflow.md`: PM, design, engineering, and design-system-owner workflow for POC-first feature updates.
- `references/acceptance-checklist.md`: PM POC, design review, engineering launch, and skill-update acceptance checklist.
- `references/release-and-governance.md`: versioning, release cadence, online sync, release notes, role permissions, and rollback rules.
- `assets/logos/`: Lenovo Lexiang and Lenovo logo assets.
- `assets/icons/`: approved SVG icon set.
- `assets/icons/icon-board.html`: searchable icon library and calling guide. Use it to choose exact icon files, copy paths, confirm category, and map icons to their intended locations.
- `assets/component/leai-component.html`: interactive Lenovo Lexiang PC component library with callable components named by the `PC-位置-功能` rule, including homepage composer, chat-state composer, homepage content tabs/cards, history drawer, floating top navigation, account utility menu, and future full-site component additions.
- `assets/fonts/`: Source Han Sans CN or approved Chinese fonts.
- `standards/design-system-complete.html`: full-site design standard and gateway. It defines the hierarchy of rules, icon usage, component library relationship, page template map, state matrix, and validation expectations.
- `assets/templates/home-fullscreen-dialog-template.html`: root/home fullscreen Lexiang conversation template. Use it for `.lxfd` welcome/chat/galleries, top floating navigation, rail/history, bottom dock composer, scope chips, and fullscreen-to-split handoff expectations.
- `assets/templates/shop-chat-page-template.html`: `/shop-chat/`, `/b-chat/`, and `/biz-chat/` assistant-commerce shell template with inlined CSS/JS and local-open support for interaction testing.
- `assets/templates/product-detail-page-template.html`: product-detail template inside the assistant-commerce shell, with left assistant panel, two-column product detail, configuration selection, AI reason card, sticky buy bar, cart/buy interactions, and review module behavior.
- `assets/templates/`: reusable HTML/Figma/frontend templates.

## Output Guidance

When generating HTML prototypes, copy required assets into the output folder and define CSS tokens from `pc-design-system.md`. When generating React/Vue/frontend code, prefer the existing project component system first, then apply this skill's tokens and component rules. When reviewing a design, report concrete mismatches against the references and propose focused corrections.

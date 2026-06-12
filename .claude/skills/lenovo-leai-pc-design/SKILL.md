---
name: lenovo-leai-pc-design
description: Use when designing, implementing, or reviewing Lenovo Lexiang Super Agent PC interfaces, fullscreen dialog pages, design-system screens, HTML prototypes, Figma mockups, or frontend UI components. Applies Lenovo Lexiang brand identity, Simplified Chinese product voice, PC assistant layouts, full-screen conversation shell rules, component rules, interaction states, and AI-result disclaimers.
user-invocable: true
---

# Lenovo LeAI PC Design

Use this skill for 联想乐享超级智能体 PC 端界面、设计规范、原型、组件实现和设计评审。

## Workflow

1. Read `references/pc-design-system.md` before making brand, visual, or typography decisions.
2. Read `references/layout-rules.md` when creating full PC screens, navigation, workspace layouts, or responsive rules.
3. Read `references/component-patterns.md` when building or reviewing components.
4. Read `references/interaction-states.md` when handling loading, streaming, empty, error, permission, or task-running states.
5. Read `references/content-voice.md` when writing Chinese UI copy, assistant messages, labels, or disclaimers.
6. Read `references/real-pc-dialog-reference.md` when creating a PC home, shopping-guide, product discovery, or lightweight assistant entry screen.
7. Read `references/real-pc-dialog-states.md` when creating default, conversation-start, hover, dropdown, or floating-menu states for the PC dialog shopping-guide screen.
8. Read `references/fullscreen-dialog-framework.md` when creating, replacing, or reviewing the fullscreen Lexiang conversation page, floating top navigation, side history rail, 3+2 suggestion chips, bottom composer, turn index, or full-screen chat interaction.
9. Read `references/commerce-detail-and-home-rules.md` when working on the Lexiang commerce homepage hero, product detail page, category floors, or the detail user-review section.
10. Reuse assets from `assets/` when available. If required assets are missing, state the gap and use a conservative placeholder rather than inventing a different brand identity.
11. Read `references/asset-inventory.md` when choosing logos, icons, fonts, or avatar art.
12. For PC dialog shopping-guide pages, start from `assets/templates/design-framework.html` when an HTML page framework or prototype shell is requested.
13. For fullscreen dialog pages, start from `assets/templates/fullscreen-dialog-framework.html`; use `assets/templates/fullscreen-dialog-framework.png` as the quick visual reference.
14. For complete HTML design-system galleries covering colors, type, buttons, cards, components, and interaction states, start from `assets/templates/design-system-complete.html`.
15. For design-system interaction demos or canonical reusable template files, start from `assets/templates/design-framework-standard-interactive.html`; for 乐享+ canonical interaction templates, start from `assets/templates/lexiang-plus-design-framework-interactive.html`; `assets/templates/design-framework-interactive.html` is the equivalent earlier template entry.
16. For production code, adapt tokens and assets to the local framework while preserving names and values where practical.

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
- `references/fullscreen-dialog-framework.md`: strict fullscreen conversation page rules, tokens, 100vh shell, floating top navigation, side rail, suggestion chips, composer controls, turn index, motion/accessibility, and responsive behavior.
- `references/commerce-detail-and-home-rules.md`: production refinements for homepage hero centering, two-row suggestion chips, product detail Scheme A, detail long-image stacks, product category floors, and Scheme B review modules.
- `references/asset-inventory.md`: available logos, icons, fonts, and avatar art.
- `assets/logos/`: Lenovo Lexiang and Lenovo logo assets.
- `assets/icons/`: UI icon set.
- `assets/fonts/`: Source Han Sans CN or approved Chinese fonts.
- `assets/templates/design-framework.html`: reusable PC dialog shopping-guide page framework with top navigation, fixed left assistant panel, scrollable right product area, bottom composer, and hover floating menus.
- `assets/templates/fullscreen-dialog-framework.html`: standalone fullscreen Lexiang conversation page framework with floating glass chrome, 100vh stage, side history rail, welcome chips, chat thread, turn index, and bottom composer.
- `assets/templates/fullscreen-dialog-framework.png`: rendered preview image for the fullscreen dialog framework.
- `assets/templates/design-system-complete.html`: complete HTML design-system gallery covering colors, typography, spacing, buttons, icons, forms, menus, cards, composer, messages, states, tables, modals, hover, focus, disabled, and AI disclaimers.
- `assets/templates/design-framework-standard-interactive.html`: canonical reusable design-system interaction template with token board, state switching, assistant collapse/restore, swap, menus, and composer interactions.
- `assets/templates/lexiang-plus-design-framework-interactive.html`: 乐享+ canonical reusable interaction template, strictly based on `design-framework.html`, with the same token, layout, menu, state, composer, collapse/restore, and swap behavior.
- `assets/templates/design-framework-interactive.html`: equivalent earlier interaction template entry.
- `assets/templates/`: reusable HTML/Figma/frontend templates.
- `examples/pc-assistant/`: screen examples to inspect only when useful.

## Output Guidance

When generating HTML prototypes, copy required assets into the output folder and define CSS tokens from `pc-design-system.md`. When generating React/Vue/frontend code, prefer the existing project component system first, then apply this skill's tokens and component rules. When reviewing a design, report concrete mismatches against the references and propose focused corrections.

# Layout Rules

## PC Shell

Use a product-app shell, not a marketing page. A typical PC screen includes:

- Left navigation rail or sidebar for history, feature areas, and settings.
- Central workspace for conversation, task orchestration, document analysis, or result review.
- Optional right panel for citations, files, task steps, plugin parameters, or metadata.
- Bottom or sticky composer for user input and command actions.

## Navigation

- Sidebar width: 240-288px for expanded state.
- Rail width: 56-72px for collapsed state.
- Keep new chat/task action visible near the top.
- Keep settings, account, and help actions near the bottom.
- History lists should support selected, hover, rename, delete, and empty states.

## Workspace

- Use a max readable text width for generated answers, usually 720-880px.
- Task/result workspaces may expand wider when tables, files, or comparison views are central.
- Keep the composer aligned with the active workspace, not arbitrarily centered on the full viewport when a sidebar is present.
- Keep the first viewport focused on usable controls and content.

## Panels

- Right panels should be 320-420px when used for details, references, citations, or task status.
- Avoid stacking multiple card containers inside a panel.
- Use dividers, section labels, and compact rows for dense metadata.

## Responsive Behavior

- Primary target is desktop PC.
- At narrow widths, collapse the sidebar to a rail before hiding it.
- Right panels can become drawers or tabs.
- Composer controls must wrap without overlapping text or icons.

## Screen Types

- Dialog shopping-guide home: top brand navigation, fixed left assistant panel, bottom-left composer, and right-side product/campaign content area. Use `real-pc-dialog-reference.md` for details.
- Home assistant: greeting, compact prompt suggestions, input composer, recent tasks/history.
- Lenovo Lexiang portal home first viewport: keep the hero assistant block short enough that the next product recommendation row with four product cards is visible on initial load across common desktop heights. Use viewport-aware hero min-height and clamp values, reduce bottom margin before the recommendation row, and tighten title, composer, and suggestion spacing at low viewport heights instead of allowing the hero background to consume the full first screen.
- Lenovo Lexiang portal home assistant group: headline, subtitle, composer, and suggestion chips must be horizontally centered as one unit. Do not use horizontal `translateX(...)` offsets to fake alignment. Suggestion chips stay two rows on desktop, first row 3 chips and second row 2 chips, with content-width pills and visible shadows.
- Conversation: message stream, answer blocks, citations, follow-up suggestions, persistent composer.
- Task execution: plan steps, current progress, tool/plugin activity, cancel/retry controls.
- Plugin center: searchable ability cards, categories, install/enable state, details panel.
- Knowledge/file workspace: upload, file list, extraction status, summary, source references.
- Settings: account, model/agent preferences, privacy, keyboard shortcuts, data controls.

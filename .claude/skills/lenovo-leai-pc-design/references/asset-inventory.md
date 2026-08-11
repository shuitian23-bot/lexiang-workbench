# Asset Inventory

Use these assets when generating Lenovo Lexiang Super Agent PC interfaces. This file maps the four design-system layers used by the skill:

1. `standards/design-system-complete.html` defines the full-site standard.
2. `assets/icons/icon-board.html` defines approved icons and calling snippets.
3. `assets/component/leai-component.html` defines reusable component details.
4. `assets/templates/*.html` files define page-level composition and interaction baselines.

For accurate page reproduction, do not use one layer in isolation. Start with the design-system standard, choose official icons from the icon board, pull specific component DOM/class/state guidance from the component library, then assemble the page from the closest template.

For maintenance rules, expansion requirements, and version discipline, read `references/design-system-governance.md`.

## Logos And Brand Art

- `assets/logos/logo-wordmark.png`: Lenovo Lexiang wordmark for light surfaces.
- `assets/logos/logo-wordmark-dark.png`: wordmark variant for dark aubergine surfaces.
- `assets/logos/logo-full-red.png`: red master logo.
- `assets/logos/logo-mark.png`: compact Lenovo Lexiang mark.
- `assets/logos/lenovo-logo.png`: Lenovo logo.
- `assets/logos/avatar-bot.png`: assistant avatar for chat and generated-answer surfaces.

## Icons

The authoritative visual index is `assets/icons/icon-board.html`. It is a searchable icon board with categories, descriptions, root-relative paths, local relative paths, HTML snippets, and CSS mask snippets.

Icon usage rules:

- Prefer real SVG image assets: `<img class="icon" src="assets/icons/icon-name.svg" alt="" />`.
- Use CSS mask only when the icon must inherit dynamic text color and the production component supports it.
- Icon-only buttons require `aria-label` on the button; decorative `<img>` children use `alt=""`.
- Do not redraw approved icons with inline SVG or text symbols unless the asset is missing.
- Icon size and hit target come from the owning component. The icon board chooses the file; the component library defines the dimensions.

- `assets/icons/sidebar-create.svg`: PC dialog page new chat or new task action.
- `assets/icons/sidebar-history.svg`: history list.
- `assets/icons/sidebar-toggle.svg`: split/side-by-side panel action.
- `assets/icons/shortcut-customization.svg`: shortcut entry for private customization.
- `assets/icons/shortcut-trial.svg`: shortcut entry for free trial.
- `assets/icons/shortcut-live.svg`: shortcut entry for live stream or event channel.
- `assets/icons/shortcut-membership.svg`: shortcut entry for member center.
- `assets/icons/shortcut-rewards.svg`: shortcut entry for points mall.
- `assets/icons/shortcut-referrals.svg`: shortcut entry for referral rewards.
- `assets/icons/shortcut-delivery.svg`: shortcut entry for store delivery.
- `assets/icons/composer-reasoning.svg`: composer deep-thinking chip.
- `assets/icons/composer-search.svg`: composer web-search chip, search fields, and history search.
- `assets/icons/composer-image.svg`: composer image upload action.
- `assets/icons/composer-send.svg`: composer send action.
- `assets/icons/mall-cart.svg`: top navigation cart.
- `assets/icons/mall-orders.svg`: top navigation orders.
- `assets/icons/mall-account.svg`: top navigation account.
- `assets/icons/global-cart.svg`: generic cart or add-to-cart action.
- `assets/icons/global-check.svg`: confirmation, selected, or checklist state.
- `assets/icons/global-next.svg`: quick-prompt row arrow or next action.
- `assets/icons/global-expand.svg`: dropdown chevron or expand action.
- `assets/icons/global-collapse.svg`: collapse, upward arrow, or back-to-top action.
- `assets/icons/global-switch.svg`: switch-position action.
- `assets/icons/global-refresh.svg`: refresh, shuffle, or regenerate action.
- `assets/icons/global-sparkle.svg`: AI recommendation, skill/plugin center, or generated insight.
- `assets/icons/shortcut-support.svg`: bottom shortcut customer service.
- `assets/icons/shortcut-education.svg`: bottom shortcut education subsidy.
- `assets/icons/shortcut-tradein.svg`: bottom shortcut trade-in.

### Icon Location Map

- Top navigation and fullscreen quick actions: `mall-cart.svg`, `mall-orders.svg`, `mall-account.svg`, `global-expand.svg`.
- Assistant top tools and history: `sidebar-create.svg`, `sidebar-history.svg`, `sidebar-toggle.svg`, `global-switch.svg`.
- Composer: `composer-reasoning.svg`, `composer-search.svg`, `composer-image.svg`, `composer-send.svg`.
- Shortcut bars: `shortcut-support.svg`, `shortcut-education.svg`, `shortcut-tradein.svg`, `shortcut-customization.svg`, `shortcut-trial.svg`, `shortcut-membership.svg`, `shortcut-rewards.svg`, `shortcut-referrals.svg`, `shortcut-delivery.svg`, `shortcut-live.svg`.
- Commerce actions: `global-cart.svg`, `global-check.svg`, `global-next.svg`, `global-refresh.svg`, `global-sparkle.svg`.
- Expand/collapse/navigation helpers: `global-expand.svg`, `global-collapse.svg`, `global-next.svg`, `global-switch.svg`.

### Icon Misuse Guards

- `composer-send.svg` is only for send buttons, never generic next/expand arrows.
- `mall-cart.svg` and `mall-orders.svg` are navigation/account utilities, not product-card CTA icons unless the component explicitly maps them there.
- `sidebar-history.svg` opens history or conversation lists; it must not open prompt-history hover menus.
- `global-sparkle.svg` is reserved for AI/generated insight, not generic decoration.
- Shortcut icons should stay inside shortcut bars or menu rows; do not use them as section decorations when a simpler text label works.

## Templates

- `standards/design-system-complete.html`: full-site design standard and resource gateway. Use it first when a task needs the complete visual and interaction standard covering rules, tokens, layout, components, icons, templates, channel pages, states, hover, focus, disabled, accessibility, and AI disclaimers.
- `assets/icons/icon-board.html`: full SVG icon board. Use it whenever icon choice, icon path, icon placement, or icon calling format matters.
- `assets/component/leai-component.html`: interactive Lenovo Lexiang PC component library. Use it when a task needs callable components with `PC-位置-功能` names, component usage notes, copyable snippets, DOM/class expectations, and interactive states.
- `assets/templates/home-fullscreen-dialog-template.html`: root/home fullscreen conversation template. Use it for `.lxfd` full-screen welcome, gallery, chat thread, floating navigation, history rail, scope chips, dock composer, and fullscreen-to-split handoff work.
- `assets/templates/shop-chat-page-template.html`: assistant-commerce shell template for `/shop-chat/`, `/b-chat/`, and `/biz-chat/`. Use it when the page needs the left assistant panel, right mall frame, category tabs, product grid/floors, product-card hover, drag-to-composer, history, more menu, and composer interactions.
- `assets/templates/product-detail-page-template.html`: product detail template inside the assistant-commerce shell. Use it for product-detail screenshot reproduction or local interactive detail-page prototypes with product visual, configuration choices, AI reason card, CTA hierarchy, sticky buy bar, user reviews, cart/buy actions, and assistant fallback replies.

### Template Version Discipline

- Treat templates as page-level baselines, not as loose visual inspiration.
- Each template must identify its intended route, dependencies, related components, related icons, and validation checklist in the header comment.
- If production CSS/JS query versions change, refresh the affected templates or mark the template as an older baseline before using it for exact visual matching.
- Current live resources should be checked before production work. As of the 2026-06-30 server sync, the live root references `main.css?v=2026063006`, `assistant-panel-ng-skin.css?v=202606222610`, `portal.js?v=202606183100`, and `app.js?v=2026063009`.
- Do not let old templates reintroduce deprecated portal-home behavior when the requested target is the current fullscreen `.lxfd` root experience.

### Recommended Future Templates

Add these when the corresponding full-site modules need repeatable reproduction:

- `brand-page-template.html`: brand page first viewport, story, values, timeline, and cases.
- `member-center-template.html`: personal/family membership card, points, benefits, tasks, and activity columns.
- `cart-orders-template.html`: cart, order list, order detail, and transactional modal patterns.
- `business-custom-template.html`: 中小企业企业定制 series cards and configuration flow.
- `business-benefits-template.html`: 企业会员权益 levels, benefits, account-period, invoice, and service tools.
- `business-store-template.html`: business store map/list split view.
- `enterprise-solution-template.html`: 政企行业解决方案 tabs, hero card, product pool, cases, and expert contact.
- `enterprise-materials-template.html`: 资料中心 filters, video cards, white paper/manual rows.
- `comparison-table-template.html`: lightweight `data-v="1"` product comparison table.
- `modal-standard-template.html`: `票据雅序` order, payment, address, invoice, and confirmation dialogs.

## Fonts

- `assets/fonts/SourceHanSansCN-Regular.otf`
- `assets/fonts/SourceHanSansCN-Medium.otf`
- `assets/fonts/SourceHanSansCN-Bold.otf`

Use these via `@font-face` in HTML prototypes when practical. In product code, prefer the local build system's font-loading pattern.

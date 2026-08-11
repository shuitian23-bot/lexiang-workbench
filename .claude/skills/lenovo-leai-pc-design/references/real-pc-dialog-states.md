# Real PC Dialog States

Use this reference for the latest real Lenovo Lexiang PC dialog shopping-guide screenshots. It defines the exact default state, conversation-start state, and hover/floating-menu state.

## Canvas And Shell

- Reference viewport: 1920px wide PC desktop.
- Top navigation height: about 108-112px, white background.
- Page background below the top navigation: pale lavender `#F7F3FA` / `#F8F6FA`.
- Main shell begins below the nav with about 20px top spacing.
- Left assistant panel: fixed white panel, about 560px wide, about 1130px tall in the reference viewport, 8px radius, no heavy shadow.
- Right content area starts about 48px after the left panel and contains the banner, category tabs, and product grid.
- Do not center the assistant panel as a generic card. It is a fixed left product assistant surface.
- In browser implementations, keep `.assistant-panel` visually fixed in the left column but do not set a `top` property on `.assistant-panel`; the vertical offset should come from the shell/page padding so the panel aligns with the content system.
- For browser-fit prototypes, scale the full 1920px reference composition down by about 20% in perceived size. Prefer recalculated dimensions, clamps, and fixed columns over `transform: scale()` so hit areas, sticky positioning, and right-side scrolling remain predictable.
- The left assistant panel must stay fixed in the left column while the right content area scrolls independently.

## Top Navigation

- Left: Lenovo Lexiang red logo and wordmark.
- Center nav items in this order: `首页`, `个人及家庭`, `中小企业`, `政教及大企业`, `品牌`, `服务`, `门店`, `会员`.
- Active item uses aubergine text with a short aubergine underline. The default portal state may activate `首页`; shopping-guide channel states activate `个人及家庭`, `中小企业`, or `政教及大企业`.
- `首页` is a full Lenovo Lexiang PC brand portal state, not a blank link. It should keep the same top navigation and assistant frame while the right content area becomes a high-end portal landing page.
- `首页` default state does not show the left assistant panel. The portal content uses the full available browser width under the top navigation. The assistant panel appears only after entering shopping-guide/channel states such as `个人及家庭`, `中小企业`, or `政教及大企业`.
- `首页` first viewport should make the intelligent input box the primary content, not just a decorative hero. Use a large centered prompt, a high-visibility composer, quick intent chips, image upload affordance, and send action. Submitting from this composer may enter the shopping-guide conversation state.
- On homepage refresh/load, stage the first viewport animation: show the eyebrow/title/summary text first, then reveal the large composer after a short delay. The composer should feel like it settles into place rather than appearing at the same time as the text.
- Portal homepage section order: `乐享智能体`, `商品推荐`, `解决方案`, `客户案例`, `新闻中心`, `热门推荐`, `底部导航`.
- Portal homepage tone should feel like a Fortune 500 PC brand gateway: premium, restrained, spacious, interactive, and browser-adaptive. A good direction is OpenAI-style editorial restraint: large direct headline, generous whitespace, flat content cards, crisp section rules, minimal decoration, and calm scroll rhythm. Do not copy OpenAI copy/content; adapt the style language to Lenovo Lexiang.
- Portal homepage modules should support subtle scroll reveal interaction: each section and its cards may fade in and move up slightly when entering the viewport, with small staggered delays. Scope this behavior to `首页` only and respect `prefers-reduced-motion`.
- `个人及家庭`, `中小企业`, and `政教及大企业` are full page/channel states in the PC dialog shopping-guide prototype. They share the same assistant-panel, hero, category-tab, product-grid, hover-menu, resize, collapse, and swap structure; only channel copy, categories, and product-card content should change.
- `中小企业` and `政教及大企业` must not open blank or placeholder pages. If implemented as one HTML file, support page state switching via nav clicks and optional query keys such as `?page=business` and `?page=enterprise`.
- Right utility icons: cart, order/clipboard, account/user.
- Account icon hover/active uses a pale lavender circular background.
- Top nav should feel like official Lenovo commerce navigation, not an app sidebar.

## Product Detail State

- Product cards in the right content area are clickable and keyboard accessible. Click or press Enter/Space on a card to enter a product detail state within the same content area.
- The product detail state keeps the top navigation and assistant panel unchanged. Only the right content area changes from hero/category/product grid to a detail page.
- Detail pages must provide a clear `返回商品列表` control that restores the original shopping-guide list state without resetting the assistant panel state.
- Product detail structure follows the same PC framework: white 8px-radius product media panel, product title/summary/price/action panel, service cells, and specification blocks on the lavender page background. Do not open a separate marketing page or remove the assistant frame.

## Left Assistant Panel Default State

- Top tool row sits near the upper-left of the panel and uses aubergine outline icons:
  - new chat/add
  - history/document
  - split/side-by-side
  - optional `换位` pill button
- Top tool row icons must align on the same visual centerline. Use a fixed icon-button box, typically `20px x 20px`, with `inline-flex`, `align-items: center`, and `justify-content: center`. The visible SVG/image inside `.tool-btn .icon` should be `16px x 16px`; `.history-button .icon` also uses `16px x 16px`. If an icon is wrapped for state management, the wrapper also needs the same fixed box and `line-height: 0`.
- The history/document icon is a click target, not a hover trigger. Clicking it may toggle an active/selected visual state; it must not open the prompt-history floating menu on hover.
- Default headline:
  - `我是联想官方AI助手`
  - `有任何问题随时告诉我`
- Headline is large, black, bold, and left aligned.
- Quick prompts are stacked rows:
  - `我要找商品`
  - `我要找优惠`
  - `我要查看活动`
  - `我要定制商品`
  - `我要对比商品`
- Quick rows are white with subtle border; selected/hovered first row may use a pale lavender-to-blue tint.
- Each quick row has a right arrow aligned to the row end.
- In the browser-fit prototype, the headline and quick-prompt stack share the same left visual start. The whole headline/quick-list block sits about 6px further left than the first rough browser draft, and the quick-prompt stack is about 8px wider overall, about 4px per side.
- A vertical carousel/page indicator appears along the right edge of the assistant panel; one active dot is aubergine red, inactive dots are pale lavender.

## Left Assistant Panel Conversation-Start State

- After the user starts a conversation, remove the large default headline and quick-prompt stack.
- Preserve the top tool row.
- Show the user message as a compact rounded bubble aligned to the upper-right of the assistant panel.
- Example user bubble text: `帮我推荐一款商品`.
- User bubble uses very pale pink/lavender fill with 8px radius.
- Show assistant response text below and left aligned. Example:
  - `直接给你 3 款 2026 年最值得买的联想机型，覆盖轻薄办公 / 全能 AI / 游戏创作 你按预算和用途选就行`
- Assistant response is black, bold enough for readability, and arranged as short lines, not a bordered chat card.
- Keep the bottom shortcut row and composer anchored at the bottom.
- The right content area remains visible and unchanged during the conversation-start state.

## Bottom Shortcuts And Composer

- A shortcut row sits directly above the composer:
  - `客服`
  - `教育特惠`
  - `以旧换新`
  - `更多`
- Shortcut buttons are compact white pills/rounded rectangles with pale border and small left icons.
- Shortcut labels such as `教育特惠`, `以旧换新`, and `更多` stay on one line; do not allow the shortcut row to wrap or split Chinese labels vertically in browser-fit implementations.
- Shortcut buttons should adapt to the assistant panel width, not only the viewport width. When the panel narrows, reduce shortcut font size, icon size, gap, and horizontal padding so `更多` stays inside the assistant panel.
- `更多` can show a dropdown/floating menu on hover.
- Composer is a bottom-left anchored white input box with 8px radius.
- Composer border uses a subtle red-to-aubergine emphasis. Keep it thin and clean.
- Placeholder: `最近有什么优惠活动？`
- Composer text input should use a multiline textarea behavior. As text wraps or the user enters new lines, the input area grows upward from the bottom composer, with a sensible max height and internal scrolling after the limit. Do not keep this as a single-line input that clips long text.
- Bottom composer chips in the current home fullscreen scheme:
  - mode area only keeps `深度思考`
  - scope visible pills are `商品导购 / 解决方案 / 门店查询`
  - `更多` menu only contains `职场认证 / 服务预约`
  - 1920px+ screens still keep the `3 visible + 更多` structure
- Right composer actions:
  - image/file icon
  - circular aubergine send button with upward arrow.
- The composer must not overlap the shortcut row or assistant conversation text.

## Right Content Area

- Hero banner: large rounded rectangle with official campaign imagery.
- Banner text example:
  - `2026 拯救者PC新品震撼来袭`
  - `拯救驾临 执御客川`
  - button `了解详情`
- Product category tabs in this order:
  - `推荐`, `小新`, `拯救者`, `YOGA`, `ThinkPad`, `手机`, `配件`
- Active category `推荐` uses a short red/aubergine underline.
- Product grid uses four columns at the reference desktop width. On wider browser viewports, it may expand, but cap each row at five product cards maximum.
- Product cards are white, 8px radius, generous image area, centered product image, centered title/spec/price.
- Product card text pattern:
  - title: `小新AIR13`
  - spec: `2.5K 120Hz｜轻至1.1kg`
  - price: `¥ 9799` or `国补后￥9799`
- Product price is Lenovo red and bold.
- Product specs such as `2.5K 120Hz｜轻至1.1kg` stay on one line in product cards.
- First product card may have a subtle active border.

## Hover And Floating Menus

- Prompt-history hover menu:
  - Appears only from hovering the right-side vertical carousel/page indicator dots, not from hovering the top history/document icon.
  - Appears as a white floating panel near the right-side dots and prompt/conversation area.
  - Width about 200px.
  - Uses 8px radius, subtle border, and light shadow.
  - Rows are single-line with ellipsis when too long.
  - Row text is smaller than the general floating-menu row text in the browser prototype, about 13px when the general menu row is 15px.
  - Active row uses pale lavender tint and aubergine text.
  - Example rows: `游戏本推荐`, `新品推荐一个`, `帮我找附近门店`, `对比这几款游戏本有...`.
- Account menu hover:
  - Opens below the account icon at top-right.
  - White rounded panel with subtle shadow.
  - Rows: `我的账号`, `我的服务`, `我的社区`, `会员中心`, `退出`.
  - Active row: `我的服务`, pale lavender background, aubergine text.
- Bottom `更多` hover menu:
  - Opens above the bottom shortcut row.
  - White rounded panel with subtle shadow.
  - Rows: `乐豆商城`, `0元试用`, `私人订制`, `会员中心`, `拉新返利`, `门店闪送`.
  - Active row: `0元试用`, pale lavender background, aubergine/red icon emphasis.
- Floating menus should sit above the page content with clear z-index and must not push layout.
- The right-side dots are the hover hotspot for this prompt-history menu; keep the active dot aubergine red and inactive dots pale lavender.
- The three floating menus, account menu, right-side-dot prompt menu, and bottom `更多` menu, must support mouse slide-in. Add transparent hover bridge / hit-area pseudo-elements between trigger and menu so the menu does not disappear while moving the pointer from the trigger into the floating panel.

## Wednesday Prototype Updates

These are the June 3 browser-prototype adjustments that should be preserved when generating or reviewing this page:

- Browser-fit scale: reduce the perceived 1920px reference composition by about 20% for normal browser preview while keeping the left assistant panel fixed and the right area scrollable.
- `.assistant-panel` remains controlled by shell/page padding; do not add a direct `top` property to the panel.
- Top tool icon buttons keep a `20px x 20px` box; `.tool-btn .icon` and `.history-button .icon` render at `16px x 16px`.
- The history/document icon is click-only for history state. It must not open the prompt-history menu on hover.
- The prompt-history floating menu is triggered by hovering the right-side vertical dots only.
- Account, right-side-dot prompt, and bottom `更多` floating menus need hover bridge hit areas so the mouse can slide into the menu without closing it.
- Default-state headline and quick-prompt stack shift left about 6px from the early browser draft and keep a shared visual left edge.
- Default-state quick-prompt stack is about 8px wider overall, about 4px added per side.
- Bottom shortcut labels and product-card specs stay on one line; avoid browser-width wrapping that splits compact labels.
- The assistant/content boundary can be resized by dragging the assistant panel edge itself. Do not add a separate visible drag line or an extra layout column for the resize handle; use a transparent hit area attached to the panel edge.
- The split/sidebar icon can collapse the entire assistant panel. In collapsed state, hide the assistant panel and let the product/content area adapt to the browser by occupying the full shell width. Provide a small restore control so the assistant can be expanded again.
- The `换位` pill button swaps the assistant panel and product content left/right. When swapped, both areas must remain on the same grid row; explicitly keep the assistant panel and content on `grid-row: 1` so the content does not fall below and leave a blank column.
- After `换位`, the resize hit area moves with the assistant panel edge: when the assistant is on the left, drag its right edge; when the assistant is on the right, drag its left edge.
- The swap state should preserve the current assistant width, bottom composer, right/content scrolling behavior, hover menus, and conversation/default state. The `换位` button may use `aria-pressed` to expose the current swapped state. Collapse/restore should also preserve the current default/conversation state and current assistant width.
- The bottom composer uses auto-growing multiline input behavior: default height matches the reference, typed text wraps to new lines, the composer grows upward, and the textarea scrolls internally only after reaching its max height.

## Strict Do/Don't

- Do match the official commerce UI density and spacing from the screenshots.
- Do keep the left panel white and stable across states.
- Do support assistant/content `换位` from the top pill button when this control is present.
- Do support collapsing the full assistant panel from the split/sidebar icon when this control is present; the content area must fill the available browser width after collapse.
- Do make the assistant panel edge draggable if resize is enabled; keep the handle visually quiet and attached to the panel border.
- Do let the composer input grow with multiline text while staying anchored to the bottom of the assistant panel.
- Do not add `top` to `.assistant-panel` when using sticky/fixed left-column behavior.
- Do not add a standalone visible resize rail between the assistant panel and content.
- Do not let swapped content auto-flow to a second grid row; this creates a blank left or right column and is considered a layout bug.
- Do not leave an empty assistant column after collapse; collapsed state must switch the shell to a full-width content layout.
- Do not use a fixed single-line composer input for long user prompts.
- Do keep the right product area visible while conversation begins.
- Do use real product cards rather than skeleton placeholders when designing this screen.
- Do not turn this screen into a generic chat app with a full-width chat transcript.
- Do not replace the top commerce nav with a SaaS app sidebar.
- Do not use decorative gradient blobs, glass panels, emoji, or oversized marketing copy inside the assistant panel.

- Primary top navigation items must be horizontally centered in the topbar: 首页, 个人及家庭, 中小企业, 政教及大企业, 品牌. Keep the logo anchored left and utility icons anchored right; do not let the nav cluster start immediately after the logo.

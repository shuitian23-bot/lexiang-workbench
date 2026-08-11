# Component Patterns

## Buttons

- Primary: brand red background, white text, used for send, confirm, run, save.
- Secondary: white or muted surface with border, used for cancel, neutral actions.
- Ghost: transparent hover surface, used in sidebars and toolbars.
- Icon buttons must have fixed size, visible hover, active state, and tooltip.
- Shopping-guide top tool icons must share one fixed visual box, typically `20px x 20px`, and be centered with `inline-flex`. Wrapper spans used for click state must also use the same fixed box so history, new chat, and split icons align vertically.
- The history/document top tool icon is click-based. It can toggle an active state, but it must not reveal the prompt-history menu on hover.

## Composer

- Supports text input, attachment, mode/model switch if relevant, send, stop generation.
- Send button uses brand red or red gradient only when active.
- Disabled send state appears when input is empty or invalid.
- Long placeholder text must not overflow.
- For the home fullscreen dialog composer, the mode area defaults to `深度思考` only. Scope labels use `visibleCount = 3`: `商品导购 / 解决方案 / 门店查询` stay visible, and `更多` contains only `职场认证 / 服务预约`.
- For the PC dialog shopping-guide page, the composer is anchored at the bottom of the left assistant panel, uses an 8px radius, a thin red/aubergine emphasis border, placeholder `最近有什么优惠活动？`, an image/file action, and a circular aubergine send button.
- In the integrated live shell, `.composer textarea` uses 14px type for compact density. Homepage hero composer placeholder/input can be one step larger, but long placeholder text must remain on one clean line without overflowing.

## Chat Messages

- User messages should be compact and visually distinct.
- Assistant messages should support markdown-like hierarchy, code blocks, tables, citations, and action buttons.
- Generated-answer surfaces need a muted AI disclaimer.
- Include copy, retry, like/dislike, and continue actions when relevant.
- In the shopping-guide conversation-start state, keep messages inside the left assistant panel. User message is a compact right-aligned pale pink/lavender bubble. Assistant text is left aligned, bold black, and not wrapped in a large bordered card.

## Shopping-Guide Shortcuts

- Bottom shortcuts above the composer use compact bordered pills: `客服`, `国补教育特惠`, `以旧换新`, `更多`.
- `更多` opens a floating menu above the shortcut row without pushing layout.
- More menu rows: `乐豆商城`, `0元试用`, `私人订制`, `会员中心`, `拉新返利`, `门店闪送`.
- Active/hover menu row uses pale lavender background and aubergine or red icon/text emphasis.
- The split/fullscreen assistant toggle uses the shared double-pane sidebar icon. In the split assistant panel it is positioned at `top:27px; right:28px`, with a `26px` square control and `17px` icon.

## Shopping-Guide Hover Recommendation Popover

- The hover recommendation popover replaces the old inline recommendation text plus capsule question tags inside the assistant panel.
- It is a card, not a free-floating text group: white-to-lavender gradient body, deep aubergine product header, 16px radius, 1px lavender border, hidden overflow, and `0 16px 44px rgba(91,20,82,.20)` shadow.
- Header contents are fixed: product thumbnail synced from the current product main image, product name with single-line ellipsis, pink price such as `¥14,999 起`, `你在看` badge with star icon, and a 22px translucent circular close button.
- Summary copy uses 13px text at 1.7 line-height. Product strengths can be emphasized with red bold text, for example `配置拉满`.
- The divider label is exactly `乐享建议你问问`, followed by a horizontal hairline.
- Question rows are full-width tappable rows with a lavender 26px star icon square, concise question copy, and a right `›` arrow. Hover state changes border/fill/arrow to the Aubergine family.
- Hover timing: 6 seconds dwell to open with a small expand animation, then 8 seconds visible before auto-closing with a small collapse animation. Manual close uses the same collapse motion.
- Question clicks submit that question to the active assistant conversation; they must not navigate or reset the page.

## Floating Menus

- Floating menus use white background, 8px radius, subtle border, and light shadow.
- Account menu rows: `我的账号`, `我的服务`, `我的社区`, `会员中心`, `退出`.
- Prompt-history menu rows are single-line and ellipsized when long.
- Prompt-history menu opens from hovering the right-side vertical page dots, not from the history/document icon.
- Floating menus must overlay the UI via z-index and must not change surrounding layout size.

## Product Cards

- Shopping-guide product cards use white background, 8px radius, centered product image, centered title, centered spec line, and bold Lenovo red price.
- Standard product text pattern: `小新AIR13`, `2.5K 120Hz｜轻至1.1kg`, `¥ 9799`.
- Product grid is four columns on the reference desktop width.
- Commerce category floors (`小新 / 拯救者 / YOGA / 手机 / 配件`) must use the same card style and responsive column count as the recommendation grid. Keep a stable image area so product images never escape the card top.

## Product Detail

- Product detail pages in the PC shopping-guide framework must follow the detailed rules in `real-pc-dialog-reference.md`: return button inside `.detail-main`, clean white gallery, no thumbnail strip, tabbed `商品详情 / 参数规格 / 用户评价`, API-driven detail images and `specs`, 60px specification rows, 17 review cards, and enlarged readable detail tag/review/spec typography.
- For the latest commerce detail refinements, read `commerce-detail-and-home-rules.md`: Scheme A detail top card, sticky product visual, no visual background or thumbnail strip, no forced product image height, no arbitrary detail max-width/margin, detail long-image stacks without white seams, and Scheme B `用户评价` with AI summary, rating bars, filter tags, horizontal review cards, likes, and arrow scrolling.

## Task Cards

- Show task title, status, current step, elapsed/progress indicator, and next action.
- States: queued, running, waiting for input, completed, failed, canceled.
- Running tasks should expose stop/cancel when safe.

## Plugin And Skill Cards

- Show icon, name, short capability summary, category, enabled/disabled state, and primary action.
- Do not make cards oversized; plugin centers are scanning interfaces.
- Details can open in a right panel or modal.

## Tabs And Segmented Controls

- Use tabs for major content views.
- Use segmented controls for modes such as 全部 / 已启用 / 推荐 or 对话 / 文件 / 任务.
- Keep labels short and Chinese.

## Inputs

- Inputs use 8px radius or less, visible border, and clear focus ring.
- Error text appears below the field and should be specific.
- Search fields need search icon, clear action, and empty-results state.

## Modals And Drawers

- Use modals for confirmation or focused configuration.
- Use drawers for secondary details that should not interrupt the task.
- Dialog text must be concise and action-oriented.

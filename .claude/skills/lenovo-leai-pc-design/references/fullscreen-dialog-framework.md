# Fullscreen Dialog Framework

Use this reference when creating, replacing, or reviewing the 联想乐享 fullscreen conversation rules. It covers the full-screen chat state that replaces the standard split commerce shell.

This file is a rule reference only. The old standalone fullscreen framework template and its preview image are deprecated and removed. For current POC and page reproduction, start from `assets/templates/home-fullscreen-dialog-template.html`.

## Shell Rules

- The fullscreen page is an app surface, not a marketing hero. It must lock `html` and `body` to 100% height with no outer vertical scroll.
- The main stage uses `height:100vh`, `min-height:100vh`, and `overflow:hidden`. Only the conversation thread scrolls internally.
- The canonical current template is `assets/templates/home-fullscreen-dialog-template.html`. Do not use the removed standalone fullscreen framework template or its outdated preview image as the current baseline.
- Production integrations may mount the fullscreen surface as an overlay, but the active state must hide the old page shell and prevent body scrolling.
- Use the exact token family from the template: brand red `#e42b20`, aubergine `#5b1452`, aubergine dark `#4e1646`, lavender background `rgba(247,243,250,.5)`, border `#e6dfea`, and the three shadow levels `--sh-1`, `--sh-2`, `--sh-3`.

## Background And Material

- Page background is layered: a right-cleaning white linear gradient plus left-top pink, right-top white, and bottom lavender radial gradients over the lavender base.
- Glass surfaces must have a solid fallback first: `rgba(255,255,255,.95)`.
- Wrap blur support in `@supports ((backdrop-filter:blur(1px)) or (-webkit-backdrop-filter:blur(1px)))`, then use `rgba(255,255,255,.66)`, `blur(20px)`, and `saturate(1.5)`.
- Gradient text must include `-webkit-background-clip:text` and a pure-color fallback through `@supports not (-webkit-background-clip:text)`.
- Respect `prefers-reduced-motion: reduce` by disabling transitions, animations, smooth scrolling, and title word rotation.

## Floating Topbar

- The topbar is fixed at `top:14px; left:18px; right:18px`, flexed between logo, center navigation cluster, and right action capsule.
- The red 联想乐享 wordmark stays at the left and does not move during conversation.
- The center navigation default state is only a suspended down-arrow tab: `88px × 30px`, `border-radius:0 0 16px 16px`, `translateY(-14px)`. The conversation name and dot remain in the DOM but hidden.
- Hovering the nav cluster opens the glass navigation sheet; leaving closes after about 260ms. Clicking the tab toggles. Clicking outside or pressing Esc closes it.
- The sheet uses `border-radius:18px`, `padding:8px`, top-center spring scale animation, and menu items `首页 / 个人及家庭 / 中小企业 / 政教及大企业 / 品牌`.
- The navigation items must use real page links and reload when already on the target route: `首页` -> `/`, `个人及家庭` -> `/shop-chat/`, `中小企业` -> `/b-chat/`, `政教及大企业` -> `/biz-chat/`, `品牌` -> `/brand/`.
- The right action capsule is 50px high, fully rounded glass, with icon buttons: collapse placeholder, cart badge 2, message/lightning badge 2, divider, and `乐` avatar. Icon buttons are 38px circles; avatar is 34px.

## Side Rail

- The rail is fixed at `top:78px; left:18px; bottom:18px`, width `268px`, radius `20px`, glass material, and slides in with `transform`.
- Wide screens (`innerWidth >= 1280`) open the rail by default and shift the stage left padding to `316px`.
- The integrated production fullscreen chat may open with the history rail collapsed by default when entered from the commerce homepage. Respect the user's current rail state; sending a message must not auto-expand a rail that the user had already collapsed.
- Narrow screens use the same rail as an overlay with a scrim. Collapsed state shows two glass FABs: expand rail at `top:80px`, new chat at `top:134px`.
- The new-chat button is `height:46px`, radius `14px`, white translucent fill, 1px lavender border, centered plus icon and text. Keep it separate from the 42px rail-toggle square.
- History rows are 38px high, single-line ellipsis, 10px radius; hover/active uses lavender tint and aubergine text, with a 3px left active indicator.
- The rail footer uses `--grad-light`, 12px text, and the copy `乐豆商城 · 积分可抵现，会员日翻倍，详情见会员中心。`.

## Split/Fullscreen Integration

- When fullscreen chat is entered from the split commerce assistant panel, remove duplicate hero collapse controls and keep one split/fullscreen toggle in the assistant panel.
- The split assistant toggle uses the double-pane sidebar icon, sits at `top:27px; right:28px`, and is compact: control `26px × 26px`, icon `17px × 17px`.
- Entering fullscreen should animate from the split assistant panel itself: clone the panel as a motion layer, expand horizontally toward the right until it reaches the fullscreen bounds, then fade in the fullscreen chat surface near the end of the motion.
- Exiting fullscreen should reverse the same relationship: clone the fullscreen surface at full width, shrink it back toward the split assistant panel/toggle origin, and fade the split commerce shell back in during the last part of the contraction.
- Use transform/clip/opacity motion with spring easing where possible, and disable the stretch/shrink animation under `prefers-reduced-motion: reduce`.

## Welcome State

- The welcome title is `clamp(25.5px,3.3vw,43.5px) / 700`, centered, with the structure `联想乐享帮你` + rotating word.
- Rotating words: `找商品 / 找门店 / 找服务 / 职场认证 / 教育优惠 / 找解决方案`.
- Start rotation after 2s and rotate every 2s. The outgoing word moves up 18px with blur; the incoming word moves up from 18px below. Disable this in reduced-motion.
- Suggestion chips are exactly five items in two rows. Desktop uses a 6-column grid, `width:min(100%,700px)`, `gap:10px 12px`, and fixed grid placement:
  - item 1: columns 1-2
  - item 2: columns 3-4
  - item 3: columns 5-6
  - item 4: columns 2-3
  - item 5: columns 4-5
- Chip cards should read like the fullscreen reference, not compressed tags: 60px min-height, 12px radius, 12.5px type, white translucent surface, soft shadow, right 20px arrow circle.
- Required chip copy: `想买游戏本，预算8000怎么选？`, `学生买轻薄本，国补和教育优惠能省多少？`, `小新和YOGA系列怎么选？`, `旧电脑换新能抵多少钱？`, `哪里有卖ThinkPad笔记本电脑门店`.

## Thread And Turn Index

- The thread is hidden in welcome state and shown after submit. It is centered, max-width 820px, flex column, gap 24px, and is the only scrolling area.
- User bubbles align right, max-width 70%, with pale pink-to-blue gradient, radius `16px 16px 5px 16px`, and a unique turn id.
- AI messages align left and use plain text structure, not cards. Section headings are aubergine, 15px/700, with a small gradient dash before each heading.
- Loading state is three 7px brand-red dots plus `检索知识库…`, replaced after 1100ms by the standard response.
- The standard response must include product selection, discount query, service support, and order assistance groups, three follow-up buttons, and the disclaimer `内容由联想乐享基于当前信息生成，请在使用前核对关键信息。`.
- The right turn index appears only in conversation state. It is fixed at right center, with a small vertical dot rail and a hover/focus glass panel titled `对话问题`. Clicking a question scrolls to that user turn and marks the active dot.

## Dock And Composer

- The dock is sticky at the bottom of the stage, max-width 820px, centered, and raised by `translateY(16px)`.
- Quick buttons are pure text pills, 36px high, 11px radius, with copy in this order: `教育特惠 / 以旧换新 / 乐豆商城 / 0元试用 / 私人订制 / 会员中心 / 拉新返利`.
- Composer uses 20px radius, `padding:16px 16px 12px`, gradient border `linear-gradient(#fff,#fff) padding-box, var(--grad-composer) border-box`, transparent 1px border, and `--sh-3`.
- Only the outer composer owns the focus affordance. The textarea itself must not draw a separate outline, border, or box-shadow.
- Textarea is transparent, auto-growing, min-height 30px, max-height 148px, and uses placeholder `最近有什么优惠活动？`. Standalone fullscreen templates may use 16px; the integrated production `.composer textarea` uses 14px to match the live shell density.
- Bottom action row uses `margin-top:10px`, `justify-content:space-between`.
- Toggle buttons are 34px high, 7px radius, white fill, 1px border, 14px type, `gap:8px`, and icon size `1em`. 首页全屏输入框 mode 区默认仅保留 `深度思考`，并默认开启；不要展示 `联网搜索`。
- 首页全屏输入框 scope 标签默认 `visibleCount = 3`：常驻展示 `商品导购 / 解决方案 / 门店查询`，`更多` 菜单只展示剩余能力 `职场认证 / 服务预约`。
- `更多` 菜单必须等于全部能力标签减去当前常驻标签，不得重复展示 `商品导购 / 解决方案 / 门店查询`。
- 1920px 及以上大屏仍保持 `3 个常驻标签 + 更多` 结构，不自动展开全部能力标签。
- 点击常驻标签或 `更多` 菜单项时，直接进入对话并发送对应意图。
- Image button is 38px square, 11px radius, white fill, 1px border.
- Send button is 40px circular with `--grad-brand`, inner highlight, and shadow. Empty input adds `.idle`: opacity `.4`, disabled cursor, no shadow.
- All icon buttons need `aria-label`; toggles need `aria-pressed`.

## Interaction Contract

- Toggle buttons update `.on` and `aria-pressed`.
- Textarea auto-sizes on input. Empty input keeps the send button idle.
- Enter sends unless Shift is held or IME composition is active. Shift+Enter inserts a new line.
- Clicking a suggestion chip, quick button, or follow-up sends that text as a user message.
- Homepage suggestion chips and assistant shortcut pills submit directly into the fullscreen conversation state with their own text. They must not route to `/` or reinitialize the homepage.
- Disable the text-selection helper/word-selection overlay inside the integrated agent conversation page unless the user explicitly enables it for debugging.
- Submitting hides welcome, shows thread, updates the conversation title truncated to 15 characters, appends the user turn, renders the right turn index, clears the textarea, shows typing, and after 1100ms replaces typing with the standard answer.
- New chat clears thread and turns, hides the turn index, restores welcome, resets the title to `新对话`, clears input, and focuses the textarea.

## Responsive Rules

- At `max-width:1100px`, cancel the stage rail shift, use 40px horizontal stage padding, and change chips to two columns without honeycomb placement.
- At `max-width:720px`, chips become one column.
- Do not allow outer page scrolling on any breakpoint.

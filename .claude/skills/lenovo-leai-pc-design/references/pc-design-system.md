# PC Design System

This file is the visual source of truth for 联想乐享 PC 端 screens. Use it with `standards/design-system-complete.html` and the current page templates; do not use removed historical framework files as the visual baseline.

## Identity

联想乐享超级智能体是面向 PC 端高频AI智能助手。界面应克制、清晰、可靠，优先支持对话导购、任务执行、商品浏览、文件理解、技能调用和结果复核。

The current PC visual direction is:

- 白色主内容面板 + 淡紫页面底色。
- 深紫红 `aubergine` 作为智能体、导航激活、图标和可交互强调色。
- Lenovo/Lexiang 红用于品牌、价格、营销高亮和少量强提示。
- 8px 以内圆角、细边框、轻阴影，避免厚重卡片感。

## Color Tokens

Use these tokens for PC prototypes and frontend mapping.

```css
:root {
  --lx-brand-red: #e42b20;
  --lx-price-red: #ff2b2b;
  --lx-aubergine: #5b1452;
  --lx-aubergine-dark: #4e1646;
  --lx-page-bg: #f7f3fa;
  --lx-surface: #ffffff;
  --lx-surface-weak: #f6f1f8;
  --lx-surface-hover: #f0eaf8;
  --lx-surface-blue: #eef0ff;
  --lx-gradient-light: linear-gradient(96deg, #FCF2F8 22.83%, #E3EAFD 98.41%);
  --lx-gradient-brand: linear-gradient(90deg, #4D144A 11.9%, #B8252E 100%);
  --lx-border: #e6dfea;
  --lx-border-strong: #d8c8dd;
  --lx-text: #101010;
  --lx-text-strong: #050505;
  --lx-text-soft: #5f5a64;
  --lx-text-muted: #9a929f;
  --lx-placeholder: #bcb4c1;
  --lx-menu-text: #2d2931;
  --lx-dot: #e6e0ed;
  --lx-dot-active: #971944;
  --lx-tab-active: #bb1836;
  --lx-orange: #ff6b21;
  --lx-hero-navy: #0c2342;
  --lx-shadow-popover: 0 10px 26px rgba(50, 29, 57, 0.12);
  --lx-shadow-soft: 0 6px 18px rgba(50, 29, 57, 0.08);
}
```

### Color Usage

- Page background: `--lx-page-bg`.
- Primary surfaces, cards, menus, composer: `--lx-surface`.
- Hover/selected tint: `--lx-surface-hover`.
- Light lavender section tint: `--lx-surface-weak`.
- Soft blue-lavender gradient endpoint: `--lx-surface-blue`.
- Lexiang light brand gradient: `--lx-gradient-light`, value `linear-gradient(96deg, #FCF2F8 22.83%, #E3EAFD 98.41%)`; use for soft selected rows, assistant prompt surfaces, light brand panels, and gentle section highlights.
- Lexiang brand red-purple gradient: `--lx-gradient-brand`, value `linear-gradient(90deg, #4D144A 11.9%, #B8252E 100%)`; use for primary brand emphasis, selected hero accents, progress bars, and high-attention CTA surfaces.
- Active nav, assistant icons, chips, swap button: `--lx-aubergine`.
- Price and direct commerce emphasis: `--lx-price-red`.
- Main text: `--lx-text`; nav/headline text can use `--lx-text-strong`.
- Popovers and hover menus use `--lx-shadow-popover`, white background, 1px `--lx-border`, 8px radius.

## Typography

- Font stack: `"Source Han Sans CN", "PingFang SC", "Microsoft YaHei", Arial, sans-serif`.
- Bundled weights: 400 regular, 500 medium, 700 bold.
- Letter spacing must be `0`.
- The framework uses responsive `clamp()` for large PC preview pages. For production apps, keep these as bounded ranges, not unbounded viewport scaling.

### Scale

- Main navigation: `clamp(16px, 1.1vw, 21px)`, weight 500.
- Menu row: 15px, 40px row height; compact prompt menu: 13px.
- Assistant headline: `clamp(24px, 1.68vw, 32px)`, line-height 1.42, weight 700.
- Quick question row: `clamp(15px, 0.95vw, 18px)`, weight 500.
- Composer input: `clamp(15px, 0.9vw, 17px)`, 24px line-height.
- Assistant answer: `clamp(16px, 1vw, 19px)`, line-height 1.62, weight 500.
- Product title and price: `clamp(18px, 1.15vw, 22px)`, 28px line-height, weight 700.
- Product spec: `clamp(15px, 1vw, 19px)`, 24px line-height.
- Hero product title: `clamp(28px, 2vw, 38px)`, line-height 1.16, weight 700.

## Layout

### Page Shell

- Body minimum width: 1100px.
- Topbar height: `clamp(76px, 7.2vh, 108px)`.
- Topbar columns: `clamp(178px, 13vw, 252px) 1fr clamp(132px, 10vw, 190px)`.
- Topbar horizontal padding: `0 clamp(22px, 2vw, 38px)`.
- Topbar has white background and a 4px `#f3f3f3` top border.
- Main shell columns: `var(--assistant-panel-width) minmax(0, 1fr)`.
- Assistant panel width: `clamp(390px, 29.2vw, 560px)`.
- Shell column gap: `clamp(24px, 2.5vw, 48px)`.
- Shell padding: `clamp(14px, 1.35vw, 20px) clamp(18px, 1.6vw, 30px) 0`.

### Assistant Panel

- Height: `calc(100vh - topbar - shell vertical padding)`.
- Min height: 680px; max height: 1096px.
- Padding: `clamp(34px, 2.9vw, 56px) clamp(24px, 2.35vw, 45px) 18px`.
- Background: white.
- Border: `1px solid rgba(230, 223, 234, 0.72)`.
- Radius: 8px.
- Top tool row: absolute at `clamp(34px, 2.9vw, 56px)` from top/left, gap 22px.
- Bottom shortcut/composer area: left `clamp(28px, 2.4vw, 46px)`, right `clamp(20px, 1.55vw, 29px)`, bottom 18px.
- Assistant can collapse, restore, swap left/right, and resize. Preserve these interaction affordances when building PC dialog pages.

### Content Area

- Content must use `min-width: 0` and avoid horizontal overflow.
- Shopping hero: height `clamp(176px, 26vh, 274px)`, radius 8px.
- Category tabs: height `clamp(70px, 8.4vh, 104px)`, horizontal gap `clamp(36px, 3.65vw, 70px)`.
- Product grid: `repeat(4, minmax(210px, 1fr))`, gap `clamp(16px, 1.25vw, 24px)`.
- Product cards: min-height `clamp(286px, 31.5vh, 390px)`, radius 8px, white surface.

### Homepage Hero

- Homepage headline is `联想乐享帮你` plus one rotating phrase. Default phrase is `找商品` and must render on first paint; never show a blank rotating-word slot after refresh.
- Keep `联想乐享帮你` and the rotating phrase on the same horizontal baseline. The rotating phrase width follows the active word, with no artificial blank gap between the static and rotating text.
- Supported rotating phrases: `找商品 / 找门店 / 找服务 / 职场认证 / 教育优惠 / 找解决方案 / 定制电脑`.
- The entire headline group stays horizontally centered relative to the hero composer for every phrase length.
- The production homepage hero can hide the subtitle `联想乐享，可以问我关于联想的任何问题`; when hidden, remove its layout footprint.
- `.hero-composer-bar` uses `margin-top: 16px`.
- Homepage suggestion chips send their text into the fullscreen conversation state. They must not navigate to or reset the homepage.
- Category tabs keep the same white surface before and after sticky positioning; do not add an extra white blank spacer on the right.
- Desktop and tablet footer navigation/customer-case sections keep the desktop multi-column layout. Collapse to stacked/mobile layout only on true mobile widths.

## Spacing

- Base rhythm remains 4px, but the PC framework uses precise bounded values for browser-fit rendering.
- Global top-level gutters: 18-38px depending on viewport.
- Assistant panel inner top/side padding: 24-56px.
- Assistant quick-list gap: `clamp(9px, 1vh, 13px)`.
- Shortcut row gap: 10px, with container fallbacks to 4px and 3px for narrow assistant widths.
- Composer internal gap: 10px.
- Product grid gap: 16-24px.
- Product card padding: vertical 20-30px, horizontal 16-22px.
- Product visual bottom margin: 26px.

## Radius

- Standard panels/cards/menus/composer: 8px.
- Compact controls and quick items: 7px.
- Menu rows: 6px.
- Active nav underline: 2px radius.
- Round icon or send buttons: 50%.
- Pills/chips: 999px only for swap, hero CTA, segmented modes, and rounded suggestion chips.
- Avoid large soft rounded cards except the home hero composer, which may use 26px when matching the framework.

## Borders And Elevation

- Prefer 1px lavender borders over heavy shadow.
- Default border: `--lx-border`.
- Strong border: `--lx-border-strong`.
- Assistant panel border should be softened with rgba: `rgba(230, 223, 234, 0.72)`.
- Popovers/menus: `--lx-shadow-popover`.
- Restore button: `--lx-shadow-soft`.
- Hover cards may use `0 10px 24px rgba(50, 29, 57, 0.1)`.

## Components

### Top Navigation

- Logo width: `clamp(146px, 10vw, 190px)`.
- Nav gap: `clamp(24px, 2.25vw, 43px)`.
- Nav buttons fill topbar height, have transparent background, weight 500.
- Active nav color: `--lx-aubergine`.
- Active underline: 40px wide, 2px high, bottom `clamp(14px, 1.5vh, 22px)`.
- Utility icon buttons: 32px square, circular, transparent by default, `--lx-surface-weak` on hover.

### Menus

- Account menu: top 44px, right -8px, width 136px, padding 9px 7px.
- Prompt menu: width 210px, padding 10px 8px.
- More menu: width 166px, padding 12px 10px.
- Menu rows: 40px height, gap 10px, padding 0 14px, radius 6px, 15px text.
- Active/hover row: `--lx-surface-hover` background and `--lx-aubergine` text.
- Add transparent hover bridges between trigger and menu to prevent flicker.

### Assistant Quick Items

- Height: `clamp(44px, 5vh, 58px)`.
- Padding: 0 22px.
- Border: `1px solid --lx-border`.
- Radius: 7px.
- Font: `clamp(15px, 0.95vw, 18px)`, weight 500.
- First item and hover use `linear-gradient(90deg, #fbf0f7 0%, #edf0ff 100%)`.
- Arrow icon: 20px, opacity 0.58.

### Composer

- Min height: `clamp(108px, 13vh, 134px)`.
- Max height: `min(220px, calc(100vh - 260px))`.
- Grid rows: input and action row.
- Padding: `clamp(13px, 1.3vw, 18px) 14px 13px`.
- Radius: 8px.
- Border treatment: transparent 1px border with gradient border:

```css
background:
  linear-gradient(#fff, #fff) padding-box,
  linear-gradient(120deg, #a262d7 0%, #ff3c3c 65%, #4f1649 100%) border-box;
```

- Textarea min-height 40px, max-height 118px, 24px line-height, no resize, transparent background.
- Placeholder color: `--lx-placeholder`.
- Chips: height `clamp(30px, 3.2vh, 34px)`, padding 0 12px, gap 8px, radius 7px.
- Image button: 28px square, transparent.
- Send button: `clamp(32px, 3.4vh, 36px)` circular, uses `composer-send.svg` at full size.

### Shortcut Buttons

- Height: `clamp(30px, 3.4vh, 36px)`.
- Gap: 8px.
- Padding: 0 14px.
- Radius: 7px.
- Border: `--lx-border-strong`.
- Text: `clamp(13px, 0.8vw, 15px)`.
- Narrow assistant container fallback: 28px height, 4-6px horizontal padding, 10px text, 12-13px icons.

### Product Cards

- Grid: four columns on desktop, min column 210px.
- Card background: white; radius 8px; transparent default border.
- First or selected card may use `--lx-border-strong`.
- Product visual height: `clamp(110px, 13vh, 158px)`.
- Product image width: `min(74%, 210px)`, `object-fit: contain`.
- Hover image: translateY(-3px) scale(1.025), mild saturation/contrast boost.
- Brand mini: 20px high, 10px bold; orange brand uses `--lx-orange`, 14px.
- Price uses `--lx-price-red`.

### Shopping-Guide Hover Recommendation Popover

- Replace the old inline recommendation copy plus capsule question tags with a card popover when product hover recommendation is needed.
- Hover dwell before opening: 6 seconds. Visible duration before auto-close: 8 seconds. Both opening and closing use a small scale/opacity animation; closing collapses rather than disappearing abruptly.
- The popover product thumbnail must synchronize with the current product main image.
- Popover container: `linear-gradient(165deg,#fff,#FBF6FC)`, `1px solid #EBDEEF`, 16px radius, `overflow:hidden`, shadow `0 16px 44px rgba(91,20,82,.20)`.
- Header: `linear-gradient(120deg,#2B0F28,#5b1452)`, padding `12px 40px 12px 14px`, gap 11px, with 42px thumbnail, one-line product name, pink price, and a `你在看` badge.
- Close button: absolute top/right 10px, 22px circle, `rgba(255,255,255,.18)` background, white `✕`, brightens on hover.
- Summary: 13px, line-height 1.7, `#2E2738`; the phrase `配置拉满` is highlighted red `#C8161E`, weight 700.
- Divider label: `乐享建议你问问`, 10.5px/700, `#A99FB4`, letter spacing .5px, followed by a 1px `#ECE3F0` line.
- Question rows: vertical gap 7px; each row uses padding `9px 12px`, 10px radius, `1px solid #ECE4F0`, white background, 12.5px/600 text, 26px lavender star icon block, and a right `›` arrow. Hover changes border to `#5b1452`, background to `#F4F2F8`, arrow to `#5b1452`.

## Icons

All framework icons are image assets under `assets/icons/`. Keep icons as real `<img class="icon">` assets rather than redrawing them in CSS when matching this page.

- Global icon class: width/height `1em`, `object-fit: contain`, `display: block`.
- Topbar utilities: `mall-cart.svg`, `mall-orders.svg`, `mall-account.svg`.
- Assistant tools: `sidebar-create.svg`, `sidebar-history.svg`, `sidebar-toggle.svg`, `global-switch.svg`.
- Quick row arrow: `global-next.svg`.
- Shortcuts: `shortcut-support.svg`, `shortcut-education.svg`, `shortcut-tradein.svg`, `shortcut-rewards.svg`, `shortcut-trial.svg`, `shortcut-customization.svg`, `shortcut-membership.svg`, `shortcut-referrals.svg`, `shortcut-delivery.svg`, `shortcut-live.svg`.
- Basic navigation helpers: `global-next.svg`, `global-expand.svg`, `global-collapse.svg`, `global-switch.svg`, `global-refresh.svg`, `global-sparkle.svg`.
- Composer: `composer-reasoning.svg`, `composer-search.svg`, `composer-image.svg`, `composer-send.svg`.
- Icon-only buttons require accessible labels and should preserve 24-34px hit targets depending on context.

## Interaction States

- Hover tint is `--lx-surface-hover`.
- Active menu row uses hover tint + aubergine text + weight 500.
- Active dots use `--lx-dot-active`; inactive dots use `--lx-dot`.
- Panel resize hover/focus shows `0 0 0 5px rgba(91, 20, 82, 0.035)`.
- Product/card hover may add border `--lx-border-strong`, soft shadow, and small transform.
- Buttons should keep visible `aria-label`, `aria-pressed`, or `aria-expanded` where state changes.

## Accessibility

- Text contrast must remain readable on all white, lavender, and aubergine surfaces.
- Focus states must be visible for keyboard users; do not remove focus without replacing it.
- Disabled controls should communicate unavailable state without disappearing.
- Icon-only controls require `aria-label` and, in product UI, a tooltip when the meaning is not obvious.
- Menus should use stable hover bridges or explicit click behavior so users can reach menu content.
- Streaming, loading, and AI-generated result states should expose clear status text and the standard AI disclaimer.

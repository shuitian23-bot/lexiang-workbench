# Commerce Detail And Home Rules

Use this reference for 联想乐享 commerce homepage, product listing/category floors, product detail pages, and detail-page user-review modules.

## Global Commerce Tokens

- Font stack: `Source Han Sans CN`, `PingFang SC`, `Hiragino Sans GB`, `Microsoft YaHei`, `-apple-system`, `sans-serif`.
- Page background: lavender neutral `#f7f3fa` or `#f4f2f8` for design-system demo surfaces.
- Main interaction color: Aubergine `#5b1452`; brand red `#e42b20`; price red `#ff2b2b`.
- Borders use `#e6dfea`; panels use 8px radius unless a reference module explicitly asks for 16px internal artwork.
- Controls use 7px radius. Focus uses Aubergine border plus a pale purple focus ring.
- Card hover moves up 1px and adds a light shadow. Avoid heavy shadows and nested cards.
- Desktop minimum width is 1180px. Three-column commerce floors collapse to two columns below about 1320px.

## Homepage Hero And Suggestion Chips

- The homepage first viewport assistant group (headline, subtitle, composer, suggestions) must be horizontally centered as a whole, independent of changing browser width.
- Do not compensate alignment with ad hoc horizontal transforms such as `translateX(...)`; use parent centering, `margin-inline: auto`, and explicit component widths.
- The suggestion chip cloud must stay exactly two rows on desktop: first row 3 chips, second row 2 chips. Do not allow a third row at any desktop ratio.
- Suggestion chips are content-width pills: `width: auto`, `white-space: nowrap`, visible overflow for the chip itself, equal row gaps, and centered rows.
- Keep the chip cloud shadow visible: containers around it need enough padding/overflow visibility so shadows are not clipped.
- The homepage input/composer, title, subtitle, and chip cloud share the same visual centerline.

## Product Category Floors

- Category floors such as `小新 / 拯救者 / YOGA / 手机 / 配件` must use the same product card style and responsive column count as the recommendation grid.
- Product cards must keep fixed-format image space so images never escape the card top.
- Cards use white surfaces, 8px radius, thin lavender border, centered image, two-line product title, muted spec line, promotion pills, and price-red price.
- Product grid columns should track the recommendation grid: 5 columns on wide desktop, 4 columns on normal desktop, 3 columns around 1280px, then fewer only for smaller screens.

## Product Detail Scheme A

- Detail top card uses a two-column layout: left sticky product visual, right product title, AI reason, SPU/series options, tags, price, CTAs, and service guarantees.
- The outer `.detail-main` uses 8px radius, no arbitrary `max-width` or outer margin when it lives inside the right content panel.
- Product visual area stays visually clean: no decorative background on `.detail-visual`, no thumbnail strip, no forced `width`, and no forced image `height`.
- Do not force geometry on the visual wrapper: `.detail-visual` should not carry decorative `background`, fixed `width`, `max-width`, `aspect-ratio`, or `min-height` rules in the production detail page.
- `.detail-gallery` must not enforce `min-height`; the gallery should size from its content and the sticky image column rather than reserving blank vertical space.
- The product image column may be sticky (`top: 16px`) so the main product image remains in the first screen while scrolling the detail content.
- SPU option label and price text should not force bold when the selected chip structure already provides hierarchy.
- SPU option labels are version configuration strings only, never product names, marketing version names, or prices. Standard order: `处理器 + 内存 + 硬盘 + 显卡 + 颜色`. Parse structured specs first; if data is missing, extract safe CPU/memory/storage/GPU/color tokens from product text. Fallback labels should be neutral such as `配置 01`, not `¥1499 版本` or a full 商品名称.
- Tabbar should not add a bottom border when the surrounding detail card already defines separation.
- Detail long-image stacks must not show white seams between images: set container `gap: 0`, avoid white gap backgrounds, use block images, and remove inline baseline spacing.

## Product Detail Review Scheme B

- The detail-page review module is an independent white panel with 8px outer radius in production detail pages. The design-system standalone demo may use a larger page-card radius only when shown as an isolated artifact.
- The review panel should fill the available detail content width; avoid centering it with a narrower `max-width` that creates extra side gutters inside the page.
- Header: `用户评价` at 20px/800/#17181A, with muted subtitle `由联想乐享 AI 总结的核心产品评价 · 仅供参考`.
- AI summary banner:
  - Margin inside panel: 20px 36px 0.
  - Radius 16px, padding 22px 28px.
  - Background: `linear-gradient(120deg, #2B0F28 0%, #571641 55%, #7C2058 100%)`.
  - Add a soft glow circle at top-right: 240px, `rgba(240,140,190,0.15)`, blur 40px.
  - Badge pill uses translucent white fill/border, 999px radius, 4px 12px padding.
  - Dot is 6px `#F2BFD9` with 2s pulse animation.
  - Summary text is 15px white at 1.75 line-height. Highlight keywords use `#F2BFD9` and 700 weight.
  - Sentiment tags use translucent white fill/border, 999px radius, 5px 12px, 12px text.
- Rating/filter area:
  - Margin 20px 36px 0, flex row, 16px gap, wraps when narrow.
  - Rating card background `linear-gradient(135deg, #FBF1F2, #FEF8F8)`, border `#F5DCDE`, radius 16px, padding 20px 28px.
  - Score `4.9` is 48px/900/#C8161E with tabular numbers. Caption is 12px/#A4555E.
  - Rating bars use 80px track, 5px height, `#F7E0E2` track and `#C8161E` fill.
  - Filter tags use `#F7F5FA`, border `#E9E5F0`, radius 12px, 10px 18px padding, 13px/600/#4A4453. Hover/active becomes border `#C9A3C4`, text `#6D3260`, fill `#F0E9F6`.
  - Filter tags are mutually exclusive on click.
- Review cards:
  - Horizontal scroll row, hidden scrollbar, 14px gap, smooth arrow scrolling by about 320px.
  - Card width 290px, no shrink, `#F7F5FA` background, transparent border, 16px radius, 20px padding.
  - Hover card becomes white with border `#D8C4E0` and shadow `0 8px 24px rgba(109,50,96,0.10)`.
  - Card title: 15px/700/#17181A. Body: 13px/#4A4453/1.7, clamped to 4 lines.
  - Sentiment tags: `#EFE5F5` fill, `#6D3260` text, 11px/600, 3px 9px, 999px radius.
  - Footer: user/date 11px/#B9B4C2; like action 12px/#95909E and turns `#C8161E` after click or hover.
  - Arrow buttons are 36px circles, white fill, border `#E5E0EC`, 18px chevron text, hover Aubergine border/text.

## Content Floor Scheme B

- White floor cards use 8px radius, 18px vertical floor spacing, thin border, and light shadow.
- Floor headers are consistent: left icon badge plus 20px/700 title and 13px muted subtitle; right action button.
- 秒杀 floor uses a red-purple gradient border, flip-like red countdown, and brand-red `更多秒杀` button.
- 秒杀 product cards are horizontal: left image, right title/spec/price/progress. Price uses `#ff2b2b`, original price is struck through.
- 教育特惠 uses three pale brand-gradient step cards with 01/02/03 watermark, icon, and action link.
- 门店与服务 uses two horizontal service cards with icon, title, and chip labels.
- 会员权益 uses a pale-purple weak background plus purple-pink gradient border; cards use numbers as anchors.

# Real PC Dialog Reference

Use `examples/pc-assistant/lexiang-dialog-page.jpg` as the first real Lenovo Lexiang PC dialog and shopping-guide reference. For the latest strict default, conversation-start, hover, and floating-menu states, also read `real-pc-dialog-states.md`.

## Use Case

This reference applies to PC home, shopping-guide, product discovery, campaign discovery, and lightweight assistant entry screens. It should not be treated as the only layout for task execution, file analysis, settings, or plugin management screens.

## Observed Structure

- Global top navigation uses the Lenovo Lexiang logo on the left, centered commerce/audience tabs, and utility icons on the right.
- Active navigation uses aubergine text with a short underline.
- Page background is a very light lavender neutral.
- The main content is split into a fixed left AI assistant panel and a wider right business content area.
- Left assistant panel uses a white rounded container with generous vertical spacing.
- Assistant headline is large, direct, and Chinese: `我是联想官方AI助手 有任何问题随时告诉我`.
- Prompt suggestions are stacked as compact rows with a right arrow.
- The assistant panel has a top tool row, right-side vertical page indicator, bottom shortcut row, and bottom composer in the latest screenshots.
- Composer is anchored at the bottom of the left panel.
- Composer supports placeholder text, thinking mode chip, image/file action, and circular send action.
- Right content area includes a large promotional hero/banner, category tabs, and product/content card grid.

## Layout Guidance

- Keep the left assistant panel visually stable and independent from the right content scroll area.
- Use the left panel for user intent capture, quick prompts, and conversation entry.
- Use the right area for current business content: products, campaigns, recommendations, or categorized results.
- Preserve clear separation between the white assistant panel and the lavender page background.
- Keep top navigation clean and sparse; avoid dense utility controls in the primary nav.
- For this layout type, the assistant composer should remain immediately visible near the lower-left area.
- Keep the right product area visible when the user starts chatting; the conversation happens inside the left assistant panel.
- Use four product columns at wide desktop sizes.
- Product detail pages in this PC shopping-guide framework should use an 80% density scale versus the full product card grid: reduce detail container spacing, media height, title/summary/price typography, tags, actions, service cells, thumbnails, and specification blocks proportionally. Do not apply `transform: scale()` or browser zoom because those leave incorrect layout space and hit targets.
- Product detail extended content should use a tabbed structure instead of stacked long sections: `商品详情`, `参数规格`, and `用户评价`. Keep the active tab in aubergine with a short underline, show one panel at a time, and preserve the white 8px-radius detail panel surface.
- Product detail hero should not add a decorative background inside `.detail-visual`; keep product imagery on a clean white gallery surface. Do not show placeholder thumbnail strips below the hero image. Avoid duplicate summary cards between the top detail hero and the tabbed extended content.
- Detail tabs use compact typography, about two thirds of the large reference tab size, while preserving strong active-state contrast and a short aubergine underline. The top product detail hero may be taller than the compact baseline by about one third when product imagery needs more vertical breathing room.
- Product detail images should follow the production site pattern: after opening a product, asynchronously request `/api/product/{sku}/detail-images`, read the returned `images` array, skip the first image when it duplicates the hero/main product image, and render the remaining official images in the `商品详情` tab. If the API returns no usable images or fails, fall back to the product's main `image_url` rather than leaving the panel blank.
- Do not draw a vertical divider between the product gallery and product information panel in the top detail hero; use spacing and panel alignment instead of a center border.
- Product detail info hierarchy should start directly with the product title, without a small category/brand line above it. Use `.detail-title { font-size: clamp(18px, 1.4vw, 30px); }`. Place `.detail-tags` between the summary and price, and use compact 6px-radius tag pills rather than fully rounded pills.
- Product detail tag pills use `border-radius: 6px`, brand lavender fill, aubergine text, and enlarged readable typography. For this production layout use `.detail-tag { height: 30px; padding: 0 14px; font-size: 14px; }`.
- The `返回商品列表` action belongs inside the product detail hero/card, not above it. Place `.detail-back` as an absolute-positioned pill in the top-left of `.detail-main` (`top: 14px; left: 14px`) with `font-size: 12px`, aubergine text, white fill, and the existing return-to-list behavior.
- Product detail service cards under the action buttons should use the production copy: `官方正品 / 联想乐享官方渠道保障`, `180天只换不修 / 商品放心购`, and `14天无理由退换 / 官方品质保障`.
- Product specification data must be driven by the production product API rather than static placeholder rows. After opening a product, use `/api/products/{sku}` and read the returned `specs` JSON. Filter non-display keys such as `url`, `pcDetailUrl`, `wapUrl`, `wapDetailUrl`, `mobileUrl`, `bu_ids`, `target_user`, `highlights`, `images`, `ad_picture`, `source`, `detail_images`, and `detail_images_at`; map common keys to Chinese labels such as `brand=品牌`, `color=颜色`, `weight=重量`, `screen_size=屏幕尺寸`, `screen_resolution/resolution=分辨率`, `battery=电池`, `os=操作系统`, `cpu=处理器`, `gpu=显卡`, `ram/memory=内存`, `storage/disk=存储/硬盘`, `lvl1=一级分类`, `lvl2=二级分类`, `lvl3=系列`, `lvl4=子系列`, `lvl5=细分`, `mtm=MTM 编码`, `bu=事业部`, `is_ai=AI 商品`.
- Product specification rows should be readable dense rows, not tiny metadata. Use `.detail-spec-row { min-height: 60px; }`, label text around `15px`, value text around `16px`, and keep the two-column grid on desktop. If the API has no usable `specs`, fall back to `商品名称`, `品类`, `SKU`, `核心描述`, `价格`, `服务支持`, and `咨询`.
- The `用户评价` tab should show a fuller list, not only three summary cards. Render 17 review cards per product, using the current product name/category/description to personalize the first few items. Increase review text by about two steps from the compact baseline: review card titles around `16px`, body text around `15px`, and review tag text around `14px` with 30px-high pills.

## Visual Guidance

- Favor white surfaces, soft lavender background, subtle borders, and light shadows.
- Use high-contrast black text for the main assistant headline.
- Use Lenovo red for master brand marks and aubergine for active states and assistant controls.
- Product cards should show real product image areas, centered product names, specs, and red prices in the standard/default screen. Skeleton placeholders are only for loading states.
- Banner imagery may be product/campaign photography or official campaign art when supplied.

## Do Not Overgeneralize

- Do not use this marketing-commerce composition for every super-agent workflow.
- For long-form chat, task execution, file understanding, or plugin configuration, use the broader layout rules in `layout-rules.md`.
- Do not replace the PC workbench with oversized campaign imagery unless the requested screen is commerce, campaign, or discovery oriented.

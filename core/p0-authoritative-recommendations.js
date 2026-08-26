const { cleanProductDescription } = require('./product-public-copy');

function parseSpecs(value) {
  try { return JSON.parse(value || '{}'); } catch { return {}; }
}

function siteFromPage(value) {
  const page = String(value || '').toLowerCase();
  if (page === 'business' || page === 'b') return 'b';
  if (page === 'enterprise' || page === 'biz') return 'biz';
  return 'shop';
}

function siteFromRequest(req) {
  const requested = req?.body?.site || req?.body?.page;
  if (requested) return siteFromPage(requested);
  const referer = String(req?.get?.('referer') || req?.headers?.referer || '');
  if (/\/biz-chat(?:\/|$)/.test(referer)) return 'biz';
  if (/\/b-chat(?:\/|$)/.test(referer)) return 'b';
  return 'shop';
}

function toCard(row) {
  const specs = parseSpecs(row.specs);
  return {
    official: false,
    catalog_source: 'leai product data',
    sku: String(row.sku || ''),
    name: specs.spu_name || row.name || '',
    full_name: row.name || specs.spu_name || '',
    description: cleanProductDescription(row.description),
    price: Number(row.price) || 0,
    original_price: Number(row.original_price) || 0,
    image_url: row.image_url || specs.white_image_url || '',
    url: specs.url || '',
    variants: 1,
    spu_id: specs.spu_id || '',
    category: row.category || specs.source_category || '',
    site: specs.site || '',
  };
}

function authoritativeRecommendations(db, upstreamProducts, options = {}) {
  const limit = Math.max(1, Math.min(Number(options.limit) || 6, 12));
  const site = siteFromPage(options.site);
  const upstream = Array.isArray(upstreamProducts) ? upstreamProducts : [];
  const exactBySku = db.prepare(`SELECT sku, name, price, original_price, image_url, description, category, specs
    FROM products WHERE status = 'active' AND sku = ? LIMIT 1`);
  const selected = [];
  const seenSpu = new Set();
  const seenSku = new Set();
  const accept = (row) => {
    if (!row) return false;
    const specs = parseSpecs(row.specs);
    if (specs.catalog_source !== 'leai product data' || specs.site !== site) return false;
    const sku = String(row.sku || '');
    const spu = `${specs.site}:${specs.spu_id || sku}`;
    if (!sku || seenSku.has(sku) || seenSpu.has(spu)) return false;
    seenSku.add(sku);
    seenSpu.add(spu);
    selected.push(toCard(row));
    return true;
  };

  upstream.forEach((product) => {
    if (selected.length >= limit) return;
    const sku = String(product?.sku || '').trim();
    if (sku) accept(exactBySku.get(sku));
  });

  if (selected.length < limit) {
    const prices = upstream.map((item) => Number(item?.price)).filter((price) => price > 0);
    const targetPrice = prices.length ? prices.reduce((sum, price) => sum + price, 0) / prices.length : 0;
    const rows = db.prepare(`SELECT sku, name, price, original_price, image_url, description, category, specs
      FROM products
      WHERE status = 'active' AND price > 0 AND image_url != ''
        AND json_extract(specs, '$.catalog_source') = 'leai product data'
        AND json_extract(specs, '$.site') = ?
      ORDER BY CASE WHEN ? > 0 THEN ABS(price - ?) ELSE sort_order END ASC, sort_order ASC
      LIMIT 96`).all(site, targetPrice, targetPrice);
    rows.some((row) => {
      accept(row);
      return selected.length >= limit;
    });
  }

  return selected;
}

module.exports = { authoritativeRecommendations, siteFromRequest, siteFromPage };

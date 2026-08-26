const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const EXPECTED_SPU_COUNT = 124;
const EXPECTED_SKU_COUNT = 188;
const PACKAGE_SITE = {
  'shop-chat product data': 'shop',
  'b-chat product data': 'b',
  'biz-chat product data': 'biz',
};

function catalogRoot() {
  return process.env.LEAI_PRODUCT_DATA_DIR || path.join(__dirname, '../public/leaip0/leai product data');
}

function manifestItems(payload) {
  if (Array.isArray(payload)) return payload;
  return payload.products || payload.items || payload.spus || [];
}

function publicAssetUrl(packageName, relativePath) {
  if (!relativePath) return '';
  return encodeURI(`/leaip0/leai product data/${packageName}/${String(relativePath).replace(/^\/+/, '')}`);
}

function numericPrice(value) {
  const match = String(value ?? '').replace(/,/g, '').match(/\d+(?:\.\d+)?/);
  return match ? Number(match[0]) : 0;
}

function loadCatalog(options = {}) {
  const root = options.root || catalogRoot();
  if (!fs.existsSync(root)) throw new Error(`商品数据目录不存在: ${root}`);
  const hash = crypto.createHash('sha256');
  const rows = [];
  const spus = new Set();
  const skus = new Set();

  for (const [packageName, site] of Object.entries(PACKAGE_SITE)) {
    const manifestFile = path.join(root, packageName, 'manifest.json');
    if (!fs.existsSync(manifestFile)) throw new Error(`缺少商品清单: ${manifestFile}`);
    const raw = fs.readFileSync(manifestFile);
    hash.update(packageName).update(raw);
    const items = manifestItems(JSON.parse(raw.toString('utf8')));
    items.forEach((spu, spuIndex) => {
      if (!spu.spu_id || !spu.short_name || !spu.category) throw new Error(`${packageName} 第 ${spuIndex + 1} 个 SPU 缺少必要字段`);
      const globalSpuId = `${site}:${spu.spu_id}`;
      if (spus.has(globalSpuId)) throw new Error(`SPU 重复: ${globalSpuId}`);
      spus.add(globalSpuId);
      const configurations = Array.isArray(spu.configurations) ? spu.configurations : [];
      if (!configurations.length) throw new Error(`SPU 没有 SKU 配置: ${globalSpuId}`);
      configurations.forEach((sku, skuIndex) => {
        const skuId = String(sku.sku_id || '').trim();
        if (!skuId) throw new Error(`${globalSpuId} 第 ${skuIndex + 1} 个配置缺少 sku_id`);
        if (skus.has(skuId)) throw new Error(`SKU 重复: ${skuId}`);
        skus.add(skuId);
        const files = sku.files || spu.representative_files || {};
        const copyPath = files.copywriting || spu.representative_files?.copywriting || '';
        let copywriting = '';
        if (copyPath) {
          const absoluteCopyPath = path.join(root, packageName, copyPath);
          if (fs.existsSync(absoluteCopyPath)) copywriting = fs.readFileSync(absoluteCopyPath, 'utf8').trim().slice(0, 6000);
        }
        const whiteImage = files.white_image || spu.representative_files?.white_image || '';
        const detailImage = files.detail_image || spu.representative_files?.detail_image || '';
        const specs = {
          catalog_source: 'leai product data', site, package: packageName,
          spu_id: spu.spu_id, spu_name: spu.short_name, source_category: spu.category,
          configuration_id: sku.configuration_id, configuration_name: sku.configuration_name,
          tags: sku.tags || [], url: sku.source || '', asset_mode: spu.asset_mode || '', folder: spu.folder || '',
          copywriting_url: publicAssetUrl(packageName, copyPath),
          white_image_url: publicAssetUrl(packageName, whiteImage),
          detail_image_url: publicAssetUrl(packageName, detailImage),
          stock_source: 'not_provided',
        };
        rows.push({
          name: sku.original_name || spu.short_name, sku: skuId, category: spu.category,
          price: numericPrice(sku.sale_price), originalPrice: numericPrice(sku.original_price),
          status: 'active', stock: 0, imageUrl: specs.white_image_url,
          description: [sku.description, copywriting].filter(Boolean).join('\n\n'),
          specs: JSON.stringify(specs),
          sortOrder: (Object.keys(PACKAGE_SITE).indexOf(packageName) + 1) * 100000 + spuIndex * 100 + skuIndex,
          detailImages: detailImage ? JSON.stringify([specs.detail_image_url]) : '[]',
        });
      });
    });
  }
  if (spus.size !== EXPECTED_SPU_COUNT || rows.length !== EXPECTED_SKU_COUNT) {
    throw new Error(`商品数据数量不符合预期: ${spus.size} SPU / ${rows.length} SKU，预期 ${EXPECTED_SPU_COUNT} SPU / ${EXPECTED_SKU_COUNT} SKU`);
  }
  return { root, hash: hash.digest('hex'), rows, spuCount: spus.size, skuCount: rows.length };
}

function ensureMetaTable(db) {
  db.exec(`CREATE TABLE IF NOT EXISTS product_catalog_meta (
    source TEXT PRIMARY KEY, manifest_hash TEXT NOT NULL, spu_count INTEGER NOT NULL,
    sku_count INTEGER NOT NULL, synced_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);
}

function syncCatalogToProducts(db, options = {}) {
  const catalog = loadCatalog(options);
  ensureMetaTable(db);
  const current = db.prepare('SELECT manifest_hash FROM product_catalog_meta WHERE source = ?').get('leai product data');
  const currentProductCount = db.prepare("SELECT COUNT(*) AS n FROM products WHERE status = 'active'").get().n;
  if (!options.force && current?.manifest_hash === catalog.hash && currentProductCount === catalog.skuCount) return { ...catalog, changed: false };
  db.transaction(() => {
    db.prepare('DELETE FROM products').run();
    db.prepare('DELETE FROM product_categories').run();
    const insertCategory = db.prepare('INSERT INTO product_categories (name, parent_id, sort_order, status) VALUES (?, 0, ?, ?)');
    [...new Set(catalog.rows.map((row) => row.category))].forEach((category, index) => insertCategory.run(category, index, 1));
    const insert = db.prepare(`INSERT INTO products
      (name, sku, category, price, original_price, status, stock, image_url, description, specs, sort_order, detail_images, detail_images_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`);
    const now = Date.now();
    catalog.rows.forEach((row) => insert.run(row.name, row.sku, row.category, row.price, row.originalPrice, row.status,
      row.stock, row.imageUrl, row.description, row.specs, row.sortOrder, row.detailImages, now));
    db.prepare(`INSERT INTO product_catalog_meta (source, manifest_hash, spu_count, sku_count, synced_at)
      VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP) ON CONFLICT(source) DO UPDATE SET manifest_hash=excluded.manifest_hash,
      spu_count=excluded.spu_count, sku_count=excluded.sku_count, synced_at=CURRENT_TIMESTAMP`)
      .run('leai product data', catalog.hash, catalog.spuCount, catalog.skuCount);
  })();
  return { ...catalog, changed: true };
}

module.exports = { loadCatalog, syncCatalogToProducts, EXPECTED_SPU_COUNT, EXPECTED_SKU_COUNT };

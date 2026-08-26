#!/usr/bin/env node
const path = require('path');
const rootArg = process.argv.find((arg) => arg.startsWith('--root='));
if (rootArg) process.env.LEAI_PRODUCT_DATA_DIR = path.resolve(rootArg.slice('--root='.length));
const { loadCatalog, syncCatalogToProducts } = require('../core/leai-product-catalog');
const dryRun = process.argv.includes('--dry-run');
const force = process.argv.includes('--force');
try {
  const result = dryRun ? loadCatalog() : syncCatalogToProducts(require('../db/schema'), { force });
  console.log(JSON.stringify({ ok: true, dryRun, changed: result.changed, root: result.root, hash: result.hash, spuCount: result.spuCount, skuCount: result.skuCount }, null, 2));
} catch (error) {
  console.error('[leai-product-catalog]', error.stack || error.message);
  process.exitCode = 1;
}

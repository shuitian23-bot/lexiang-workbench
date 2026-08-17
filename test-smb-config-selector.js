const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const selector = require("./public/js/smb-config-selector.js");

const variants = [
  { sku: "1047792", name: "ThinkPad X13 2025 酷睿Ultra 5 AI商旅本", description: "Windows 11 家庭中文版/Ultra 5 225H/32GB LPDDR5X/1TB SSD固态硬盘/集成显卡", specs: { os: "Windows11 家庭中文版", model: "ThinkPad X13 2025", cpu: "Ultra 5 225H", memory: "32GB LPDDR5X", disk: "1TB SSD固态硬盘" }, price: 12999, original_price: 13399 },
  { sku: "1044931", name: "【企业购】联想ThinkPad X13 2025 酷睿Ultra 7 AI商旅本 A7CD", description: "Windows 11 专业版/Ultra 7 255H/32GB LPDDR5x/1TB SSD/英特尔Arc显卡", specs: {}, price: 16799 },
  { sku: "1039976", name: "ThinkPad X13 锐龙版 笔记本电脑", description: "Windows 11 家庭中文版/AMD R7PRO 7840U/16GB LPDDR5/512GB SSD/集成显卡", specs: { url: "https://item.lenovo.com.cn/product/1039976.html", lvl5: "x13 2023 amd" }, price: 8999 },
  { sku: "1039977", name: "ThinkPad X13 锐龙版 笔记本电脑", description: "Windows 11 家庭中文版/AMD R7PRO 7840U/16GB LPDDR5/512GB SSD/集成显卡", specs: { url: "https://b.lenovo.com.cn/product/1039977.html", lvl5: "x13 2023 amd" }, price: 8799 },
  { sku: "1055315", name: "联想ThinkPad X13 2026 锐龙AI 7 便携AI商旅本 0QCD", description: "Windows 11 家庭中文版/AMD 锐龙AI 7 445/32GB LPDDR5x/512GB SSD/集成显卡", specs: { os: "Windows 11 家庭中文版", cpu: "AMD Ryzen AI 7 445", memory: "32GB LPDDR5X", disk: "512GB PCIe-NVMe 固态硬盘" }, price: 12499 }
];

test("builds normalized options from structured and fallback product data", () => {
  const matrix = selector.buildMatrix(variants);
  assert.deepEqual(matrix.options.os, ["Windows 11 家庭中文版", "Windows 11 专业版"]);
  assert.deepEqual(matrix.options.version, ["X13 2025", "X13 2023", "X13 2026"]);
  assert.match(matrix.records[0].config, /Ultra 5 225H \/ 32GB LPDDR5X \/ 1TB SSD固态硬盘/);
  assert.doesNotMatch(matrix.records[0].config, /Windows|X13 2025/);
});

test("excludes configurable container products that cannot resolve to a real combination", () => {
  const matrix = selector.buildMatrix([...variants, { sku: "1054101", name: "ThinkPad X13 Gen 6 AMD 笔记本电脑【可选配置】", description: "此商品为CTO选配，请在商详页选择需要的配置！", specs: { lvl4: "x13-qyg", url: "//b.lenovo.com.cn/product/1054101.html" }, price: 6659 }]);
  assert.equal(matrix.records.some((record) => record.sku === "1054101"), false);
  assert.equal(matrix.options.os.includes("系统以商品信息为准"), false);
  assert.equal(matrix.options.version.includes("当前版本"), false);
});

test("extracts complete CPU and memory tokens from comma-delimited legacy descriptions", () => {
  const intel = selector.normalizeVariant({ sku: "1047793", name: "ThinkPad X13 2025 酷睿Ultra 5 AI商旅本", description: "英特尔Ultra5-225H 最大睿频 4.9Ghz，Windows 11 家庭中文版，英特尔Arc集成显卡，32GB 8400MT/s LPDDR5x，1TB固态硬盘", specs: {}, price: 12999 });
  assert.match(intel.config, /^英特尔Ultra5-225H \/ 32GB 8400MT\/s LPDDR5x \/ 1TB固态硬盘/);
  assert.doesNotMatch(intel.config, /ThinkPad/);
  const amd = selector.normalizeVariant({ sku: "1052852", name: "ThinkPad X13 2025 锐龙AI 7 PRO AI商旅本", description: "AMD 锐龙AI 7 PRO 350 移动处理器/Windows 11 家庭中文版/32GB LPDDR5x/1T SSD/集成显卡", specs: {}, price: 12999 });
  assert.match(amd.config, /^AMD 锐龙AI 7 PRO 350/);
  assert.doesNotMatch(amd.config, /ThinkPad/);
});

test("clears dependent selections and disables unavailable combinations", () => {
  const matrix = selector.buildMatrix(variants);
  assert.deepEqual(selector.applySelection(matrix, { os: "Windows 11 家庭中文版", version: "X13 2025", config: "x" }, "os", "Windows 11 专业版"), { os: "Windows 11 专业版", version: "", config: "" });
  assert.deepEqual(selector.applySelection(matrix, { os: "Windows 11 家庭中文版", version: "X13 2025", config: "x" }, "version", "X13 2026"), { os: "Windows 11 家庭中文版", version: "X13 2026", config: "" });
  assert.equal(selector.availability(matrix, { os: "Windows 11 专业版", version: "", config: "" }, "version").get("X13 2026"), false);
  assert.equal(selector.resolveVariant(matrix, { os: "Windows 11 专业版", version: "X13 2026", config: "" }), null);
});

test("resolves only complete real combinations and handles duplicate channels deterministically", () => {
  const matrix = selector.buildMatrix(variants);
  const pro = matrix.records.find((record) => record.sku === "1044931");
  assert.equal(selector.resolveVariant(matrix, { os: pro.os, version: pro.version, config: pro.config }).sku, "1044931");
  const duplicate = matrix.records.find((record) => record.sku === "1039976");
  assert.match(duplicate.config, /^AMD R7PRO 7840U/);
  const selection = { os: duplicate.os, version: duplicate.version, config: duplicate.config };
  assert.equal(selector.resolveVariant(matrix, selection).sku, "1039977");
  assert.equal(selector.resolveVariant(matrix, selection, "1039976").sku, "1039976");
});

test("SMB detail source contains grouped selector and incomplete purchase guards", () => {
  const source = fs.readFileSync(path.join(__dirname, "public/js/app.js"), "utf8");
  assert.match(source, /function lxRenderSmbSpuSelector\(product\)/);
  assert.match(source, /data-spu-dimension="os"/);
  assert.match(source, /data-spu-dimension="version"/);
  assert.match(source, /data-spu-dimension="config"/);
  assert.match(source, /class="lx-spu-final-price"/);
  assert.match(source, /data-config-incomplete/);
  assert.match(source, /matrix\.records\.length\s*&&\s*matrix\.options\.os\.length/);
  assert.match(source, /data-config-loading/);
});

test("detail CSS contains two-column, disabled, focus, and mobile selector states", () => {
  const css = fs.readFileSync(path.join(__dirname, "public/css/main.css"), "utf8");
  assert.match(css, /\.lx-spu-option-grid\s*\{[^}]*grid-template-columns:\s*repeat\(2,/s);
  assert.match(css, /\.lx-spu-option\.is-active/);
  assert.match(css, /\.lx-spu-option:disabled/);
  assert.match(css, /\.lx-spu-option:focus-visible/);
  assert.match(css, /@media\s*\(max-width:\s*560px\)[\s\S]*\.lx-spu-option-grid\s*\{[^}]*grid-template-columns:\s*minmax\(0,\s*1fr\)/);
});

test("index loads the selector before app.js with the new asset version", () => {
  const html = fs.readFileSync(path.join(__dirname, "public/index.html"), "utf8");
  const moduleIndex = html.indexOf("/js/smb-config-selector.js?v=2026081701");
  const appIndex = html.indexOf("/js/app.js?v=2026081702");
  assert.ok(moduleIndex >= 0 && appIndex > moduleIndex);
  assert.match(html, /\/css\/main\.css\?v=2026081701/);
});

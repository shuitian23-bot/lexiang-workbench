const assert = require("node:assert/strict");
const configSelector = require("../public/js/smb-config-selector.js");

function variant(overrides = {}) {
  return {
    sku: "1045976",
    price: 17699,
    name: "联想ThinkPad X9 15 Aura 2025 酷睿Ultra 7 高能创作本 5JCD",
    description: "英特尔酷睿Ultra 7 258V/Windows 11 家庭中文版/32G/1TB M.2 PCIe Gen4 NVMe 固态硬盘/英特尔Arc Xe2/15英寸2.8K OLED触控屏",
    specs: {
      os: "Windows 11 家庭中文版",
      lvl5: "x9-15 aura intel",
      cpu: "Ultra 7 258V",
      memory: "32GB LPDDR5X",
      disk: "1TB M.2 PCIe Gen4 NVMe 固态硬盘"
    },
    ...overrides
  };
}

{
  const record = configSelector.normalizeVariant(variant());
  assert.equal(record.config, "Ultra 7 258V / 32GB / 1TB / Arc Xe2");
}

{
  const matrix = configSelector.buildMatrix([
    variant(),
    variant({
      sku: "1046058",
      name: "【企业购】联想ThinkPad X9-15 Aura 酷睿Ultra7 精英商务本 5JCD",
      description: "英特尔酷睿Ultra 7 258V/Windows 11 家庭中文版/32GB/1T PCIe-NVMe 固态硬盘/英特尔Arc Xe2/15.3英寸OLED触控屏",
      specs: {
        os: "Windows 11 家庭中文版",
        lvl5: "x9-15 aura intel"
      }
    })
  ]);
  assert.deepEqual(matrix.options.config, ["Ultra 7 258V / 32GB / 1TB / Arc Xe2"]);
}

console.log("SMB config selector tests: PASS");

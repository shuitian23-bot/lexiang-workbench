// 商品公开文案边界：内部 SPU 清单与配置台账不得进入消费者页面。
function cleanProductDescription(value) {
  const raw = String(value || '').replace(/\r/g, '').trim();
  if (!raw) return '';
  const first = raw.split('\n').map((line) => line.trim()).find(Boolean) || '';
  return first
    .split(/\s+#\s+/)[0]
    .replace(/\s*(?:[-·|｜]\s*)?(?:SPU名称|SPU编号|商品分类|配置数量|SKU编号)\s*[:：].*$/i, '')
    .trim();
}

module.exports = { cleanProductDescription };

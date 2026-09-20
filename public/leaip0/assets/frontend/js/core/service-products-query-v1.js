/* Share the existing cleaning-service catalog across all recommendation entrypoints. */
(() => {
  'use strict';
  function matches(query) {
    const text = String(query || '').trim().replace(/\s+/g, '');
    if (!text || text.length > 180) return false;
    // Device-specific warranty requests use their existing eligibility and plan flow.
    if (/^为.+推荐可购买的(?:保修|延保)商品[。！!]?$/.test(text)) return false;
    if (/^我的设备是.+所在地区是.+请推荐可购买、可预约的清灰换硅脂服务商品$/.test(text)) return false;
    if (/(?:不要|不用|无需|不想|不需要|取消|停止|关闭).{0,10}(?:推荐|服务|清灰|保养|维修)/.test(text)) return false;
    if (/订单|退款|退货|联系客服|人工客服|优惠券|领券|对比|比较|支付|立即下单|预约时间|预约进度|是什么|什么意思/.test(text)) return false;
    const catalog = /服务(?:类)?(?:商品|产品|套餐|项目)|(?:清灰|清洁|除尘|保养|换硅脂|维修|延保|保修)(?:类)?(?:服务|商品|产品|套餐)/.test(text);
    const request = /推荐|看看|查看|有哪些|有什么|有啥|选购|想买|想购买|挑选|找|列表|清单/.test(text);
    const bare = /^(?:服务(?:类)?(?:商品|产品|套餐|项目))(?:推荐|列表|清单)?[。！!？?]?$/.test(text);
    const general = /(?:推荐|挑选|看看|查看|找).{0,8}服务[。！!？?]?$|服务(?:有哪些|有什么|有啥|推荐)(?:可以|值得)?(?:推荐)?[。！!？?]?$/.test(text);
    return bare || catalog && request || general;
  }
  function load() {
    const catalog = window.__lxServiceRecommendationProducts?.();
    if (!Array.isArray(catalog)) return [];
    return catalog.filter(product => /^SERVICE-/.test(String(product?.sku || '')) && /^(服务产品|服务商品)$/.test(product?.category || '')).map(product => ({...product}));
  }
  const copy = count => `已为你整理 **${count} 款服务商品**，包括**笔记本深度清灰、清灰换硅脂和整机清洁保养**。可结合设备型号、使用状况和所在地区，比较服务内容、价格与预约方式。下方推荐均为服务商品，具体适用机型、服务范围和可预约时间，以商品详情及实际确认为准。`;
  async function run(host) {
    const gen = window.__lxGeneration, token = host.token;
    host.busy(true);
    try {
      host.trace(['已识别服务商品推荐需求', '正在调用 Skill(服务商品推荐)'], false);
      const products = await gen.wait(token, Promise.resolve().then(load));
      await gen.wait(token, new Promise(resolve => gen.timeout(token, resolve, 600)));
      if (!products.length) {
        host.trace(['Skill(服务商品推荐) 未找到可用服务商品'], true);
        await gen.wait(token, host.answer('暂时没有找到可推荐的**服务商品**，请稍后重试。'));
        return;
      }
      host.trace(['已匹配清灰、换硅脂与清洁保养服务商品', 'Skill(服务商品推荐) 已完成'], true);
      await gen.wait(token, host.answer(copy(products.length)));
      const result = host.card(products);
      await gen.wait(token, new Promise(resolve => gen.timeout(token, resolve, window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches ? 0 : 720)));
      if (gen.current(token)) host.open(products, result);
    } catch (error) {
      if (gen.current(token)) {
        host.trace(['Skill(服务商品推荐) 暂未完成'], true);
        await gen.wait(token, host.answer('**服务商品推荐**暂时未完成，请稍后重试。'));
      }
    } finally {
      if (gen.current(token)) { host.busy(false); host.save(); }
    }
  }
  window.__lxServiceProducts = {matches, load, copy, run};
})();

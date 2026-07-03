// Skill: 联想乐享官方口径直通车 — 政策/补贴/活动/账号/保修类问题调用官方 AI 获取权威答案
const leai = require('../core/leai_client');

module.exports = {
  name: 'leai_official_answer',
  description: '获取联想官方权威口径的回答。当用户询问以下内容时必须调用：国家补贴/国补/政府补贴政策及叠加规则、教育优惠政策细则、官方促销活动规则（如乐享补贴/抽奖活动）、保修与售后官方政策、会员乐豆官方规则、名下设备/账号信息。本工具直连联想官方乐享 AI，返回最新官方口径，比本地知识库更准确权威。商品推荐选购类问题不要用本工具（用 product_recommend）。',
  parameters: {
    type: 'object',
    properties: {
      question: { type: 'string', description: '要向官方查询的问题，用用户原话或贴近原话的表述' },
    },
    required: ['question'],
  },
  execute: async ({ question }) => {
    try {
      const r = await leai.qa(question, { timeoutMs: 45000 });
      // 门店/位置类：官方要求上报位置 → 让前端弹城市选择框
      if (r.needPosition && !r.text) {
        return {
          action: 'frontend_choices',
          title: '请选择您所在的城市',
          options: ['北京', '上海', '广州', '深圳', '成都', '杭州', '武汉', '西安'],
          ask_template: '我在{choice}，帮我查附近的联想门店',
          content: '官方门店查询需要位置信息，已请用户选择城市。请告知用户选择城市后可继续查询。',
        };
      }
      const result = {
        source: '联想乐享官方 AI（实时口径）',
        content: (r.text || '').slice(0, 2200) || '官方暂未返回内容，请稍后重试或换个问法。',
      };
      // 官方推荐了真实在售商品 → 直接推送右侧官方商品卡
      if (r.productList) {
        const products = leai.mapProductList(r.productList, 6);
        if (products.length) {
          result.action = 'frontend_official_products';
          result.title = '联想官方在售推荐';
          result.products = products;
          result.content += `\n\n（已同步展示 ${products.length} 款官方在售商品，含真实价格与购买链接）`;
        }
      }
      if (r.deviceList) result.device_list = r.deviceList;
      return result;
    } catch (err) {
      return { error: '官方接口暂时不可用：' + err.message + '。请基于本地知识回答，并提示用户官方口径以 lenovo.com.cn 为准。' };
    }
  },
};

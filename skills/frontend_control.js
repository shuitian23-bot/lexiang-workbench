// Skill: 页面操作执行器 — 让乐享能真正执行站内操作（关页面/切站/打开功能/发起认证）
module.exports = {
  name: 'frontend_control',
  description: '执行站内页面操作。当用户要求对页面/站点本身做动作时必须调用，例如：关闭所有页面或某个标签、回到首页、切换到个人及家庭/中小企业/政教及大企业子站、打开会员中心/优惠券/订单/购物车/门店/教育专区/对比页、发起学生认证或企业认证、清空对比清单。调用后前端会真实执行该操作，不要只口头答应。',
  parameters: {
    type: 'object',
    properties: {
      op: {
        type: 'string',
        enum: ['close_all_tabs', 'close_tab', 'go_home', 'switch_site', 'open_member', 'open_coupon', 'open_orders', 'open_cart', 'open_stores', 'open_edu_zone', 'open_compare', 'start_student_auth', 'start_enterprise_auth', 'clear_compare'],
        description: '要执行的操作',
      },
      target: { type: 'string', description: 'close_tab 时为标签名关键词；switch_site 时为 shop/b/biz 之一' },
    },
    required: ['op'],
  },
  execute: ({ op, target }) => ({
    action: 'frontend_control',
    op,
    target: target || '',
    message: '已下发页面操作：' + op,
    content: '操作指令已发送给页面执行。请用一句话向用户确认操作结果（如「已为您关闭所有页面」），不要长篇解释。',
  }),
};

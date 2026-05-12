// Skill: 弹出优惠券中心并高亮推荐的券
// 触发场景：用户问"有什么优惠"/"学生有折扣吗"/"企业批采能便宜多少"/"以旧换新有券吗"
module.exports = {
  name: 'coupon_recommend',
  description: '在左侧弹出优惠券中心面板，并按用户身份/场景高亮推荐的券。当用户表达「优惠 / 折扣 / 券 / 学生认证 / 教师 / 企业开户 / 政教大单 / 以旧换新优惠 / 新用户 / 创作者 / 电竞」等意图时调用。',
  parameters: {
    type: 'object',
    properties: {
      tags: { type: 'array', items: { type: 'string', enum: ['student','teacher','enterprise','gov','newuser','tradein','gaming','creator'] }, description: '推荐券标签，可多选。student=学生 / teacher=教师 / enterprise=企业新户 / gov=政教大单 / newuser=新用户 / tradein=以旧换新 / gaming=电竞 / creator=创作者' },
      title: { type: 'string', description: '弹窗标题，如「学生开学季 4 张券速领」' },
      desc:  { type: 'string', description: '弹窗副标，一句话说明推荐理由' },
    },
    required: ['tags'],
  },
  execute: ({ tags, title, desc }) => {
    return {
      action: 'frontend_coupon',
      highlight: tags || [],
      title: title || '为您推荐的优惠券',
      desc: desc || '已根据您的身份/场景高亮可领的券',
      message: '已为您打开优惠券中心',
    };
  },
};

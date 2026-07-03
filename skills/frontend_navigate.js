// Skill: 前端落地页导航 — AI 用此工具控制左侧浏览页滚动到指定 section
// 触发场景：用户说"看看新品"、"滚到热销"、"显示解决方案"等浏览意图，但又不希望深入对话
//
// 注意：此 skill 与 page_navigate（后台 workbench 用）是两个不同 skill，目标不同。
// 本 skill 的 target 对应 leaibot.cn 主页 landing 上的固定 section 锚点。

module.exports = {
  name: 'frontend_navigate',
  description: '导航左侧浏览页滚动到指定区块。当用户表达"看看 / 滚到 / 显示 / 跳到"某个区块（如新品、热销产品、解决方案、新闻、客户案例）但不需要深度对话时使用。可用 target：home（顶部）、featured（最新动态）、bestsellers（热销产品）、solutions（解决方案）、news（新闻中心）、cases（客户案例）、cta（探索联想）。仅当用户明确想"看页面"时才调用，普通问答不要调用。',
  parameters: {
    type: 'object',
    properties: {
      target: {
        type: 'string',
        enum: ['home', 'featured', 'bestsellers', 'solutions', 'news', 'cases', 'cta'],
        description: '目标区块标识。home=顶部 hero / featured=最新动态 / bestsellers=热销产品 / solutions=解决方案 / news=新闻中心 / cases=客户案例 / cta=立即咨询'
      },
      reason: {
        type: 'string',
        description: '简短说明为什么导航到此区块（用于日志，不展示给用户）'
      }
    },
    required: ['target']
  },
  execute: async ({ target, reason }) => {
    const validTargets = ['home', 'featured', 'bestsellers', 'solutions', 'news', 'cases', 'cta'];
    if (!validTargets.includes(target)) {
      return { error: 'invalid target', valid: validTargets };
    }
    return {
      action: 'frontend_navigate',
      target,
      reason: reason || '',
      message: `已导航左侧到 ${target}`
    };
  }
};

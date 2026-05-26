// Skill: 在左侧浏览页弹出 CTO 定制配置器
// 触发场景：用户问"能定制吗"/"我想配一台"/"自己选 CPU 内存"/"私人定制刻字"/"顶配多少钱"等
module.exports = {
  name: 'frontend_customize',
  description: '弹出商品 CTO 定制配置器（含基础配置：CPU/内存/硬盘/显卡/屏幕/颜色 + 私人定制：激光刻字/喷绘/礼盒包装），用户可实时调价并加入对比。当用户表达"定制 / DIY 配置 / 选 CPU 内存 / 私人定制 / 刻字 / 喷绘 / 礼盒"等意图时调用。',
  parameters: {
    type: 'object',
    properties: {
      product_name: { type: 'string', description: '机型名称，如 拯救者 Y9000P / 小新 Pro 14 / 工作站 P2，不知道时可留空，AI 会按用户场景推断' },
      schema: { type: 'string', enum: ['laptop','desktop'], description: '配置 schema，笔记本=laptop，台式机/工作站/电竞主机=desktop。默认 laptop。' },
      preset: { type: 'string', enum: ['default','top','value'], description: '预设方案：default=默认起步配置，top=顶配满配，value=性价比中配。可省略。' },
      reason: { type: 'string', description: '为什么打开定制器（用于日志，不展示给用户）' },
    },
    required: [],
  },
  execute: ({ product_name, schema, preset, reason }) => {
    return {
      action: 'frontend_customize',
      product_name: product_name || '',
      schema: schema || 'laptop',
      preset: preset || 'default',
      reason: reason || '',
      message: '已为您打开定制配置器',
    };
  },
};

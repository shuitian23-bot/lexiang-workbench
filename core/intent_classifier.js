// 意图分类器：dashscope qwen-turbo cheap call，单轮 JSON 输出
// 取代 agent.js 内 _KEYWORDS 正则强制 tool_choice 逻辑
// 输入：用户消息 + 当前 site_type
// 输出：{intent, confidence, requires_tool, suggested_tools, reason}

const https = require('https');

const API_KEY = process.env.DASHSCOPE_API_KEY;
const MODEL = process.env.INTENT_MODEL || 'qwen-turbo';

const INTENTS = {
  product_recommend: '推荐机型 / 选购 / 比型号 / 预算导购',
  solution: '行业解决方案 / 教育/医疗/金融/政府/中小企业/会议方案/数据中心',
  customize: 'CTO 定制 / 私人定制 / 刻字 / 喷绘 / 礼盒 / DIY 配置',
  coupon: '优惠券 / 折扣 / 学生认证 / 教师 / 企业开户 / 新用户 / 节日活动',
  tradein: '以旧换新 / 旧机抵扣 / 换购 / 回收',
  member: '我的会员 / 等级 / 乐豆 / 权益 / 订单 / 会员中心',
  warranty: '保修 / 质保 / SN 序列号 / 售后',
  showcase: '晒单 / 写评测 / 写体验',
  live: '直播 / 主播 / 直播间',
  vas: '增值服务 / 延保 / 意外保 / 上门安装 / 数据迁移 / 系统重装',
  store: '门店 / 体验店 / 线下店 / 预约到店',
  bulk_purchase: '批量采购 / 团购 / 几十台 / 阶梯价',
  invoice: '开票 / 增值税 / 专票 / 普票 / 对公',
  tender: '招投标 / 政采 / 央采 / 资质文件 / 授权书',
  compliance: '信创 / 等保 / 国密 / 国产化 / 麒麟系统 / 统信 UOS / 银河麒麟 / 涉密 / 国产 OS / 操作系统国产化（含「机器是否支持麒麟/统信」类问题）',
  lead: '请联系我 / 留下电话 / 安排上门 / BD 接洽 / 大额项目',
  filter: '在已展示商品上二次筛选（再贵一点 / 只看 ThinkPad / 5000 以下）',
  navigate: '滚到 / 跳到 / 看看主页某区块（新品/热销/方案/案例）',
  product_explain: '详细介绍某机型配置 / 对比某两台之间优劣（纯信息咨询，不一定要买）',
  chitchat: '闲聊 / 寒暄 / 与产品无关',
};

const FALLBACK = {
  intent: 'chitchat',
  confidence: 0.5,
  requires_tool: false,
  suggested_tools: [],
  reason: 'fallback (classifier failed)',
};

function buildPrompt(userMessage, siteType) {
  const intentList = Object.entries(INTENTS)
    .map(([k, v]) => `- ${k}: ${v}`)
    .join('\n');
  return `你是联想乐享 AI 助手的意图分类器，识别用户单条消息属于哪个意图，决定是否需要调用工具。

【可选 intent 列表】
${intentList}

【当前业务入口】site_type=${siteType || 'default'}（shop=个人/家庭，b=中小企业，biz=政教大企业）

【输出格式】严格 JSON 单行，无 markdown 代码块包裹：
{"intent":"xxx","confidence":0.0~1.0,"requires_tool":true/false,"suggested_tools":["xxx","yyy"],"reason":"一句话理由"}

【判断规则】
- product_explain（纯信息咨询）requires_tool 通常 false
- chitchat requires_tool 必为 false
- product_recommend / customize / coupon / member / tradein / store / lead / bulk_purchase / tender / compliance / warranty / vas / showcase / live / solution / filter / navigate 通常 requires_tool=true
- confidence < 0.6 时 requires_tool 设为 false（让 LLM 自己决定调不调工具）
- **关键词强信号**（命中即对应意图，优先级高于其他）：
  - 含「麒麟 / 统信 / UOS / 信创 / 国产 OS / 等保 / 国密」→ compliance
  - 含「招标 / 投标 / 政采 / 央采 / 资质」→ tender
  - 含「专票 / 增值税 / 普票 / 对公开票」→ invoice
  - 含「批量 / 团购 / 阶梯价 / N 台」→ bulk_purchase

【用户消息】"${(userMessage || '').replace(/"/g, '\\"').slice(0, 500)}"

直接输出 JSON：`;
}

function classifyIntent(userMessage, siteType = 'default', options = {}) {
  if (!API_KEY || !userMessage || userMessage.trim().length < 1) {
    return Promise.resolve(FALLBACK);
  }
  const timeoutMs = options.timeoutMs || 4000;
  const body = JSON.stringify({
    model: MODEL,
    messages: [{ role: 'user', content: buildPrompt(userMessage, siteType) }],
    temperature: 0,
    max_tokens: 200,
    response_format: { type: 'json_object' },
  });
  const opts = {
    hostname: 'dashscope.aliyuncs.com',
    path: '/compatible-mode/v1/chat/completions',
    method: 'POST',
    headers: {
      'Authorization': 'Bearer ' + API_KEY,
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(body),
    },
  };
  return new Promise((resolve) => {
    const req = https.request(opts, (res) => {
      let data = '';
      res.on('data', (c) => (data += c));
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          const text = json.choices?.[0]?.message?.content || '';
          // 容错剥 markdown
          const cleaned = text.replace(/^```(?:json)?\s*|\s*```$/g, '').trim();
          const parsed = JSON.parse(cleaned);
          resolve({
            intent: parsed.intent || 'chitchat',
            confidence: typeof parsed.confidence === 'number' ? parsed.confidence : 0.5,
            requires_tool: !!parsed.requires_tool,
            suggested_tools: Array.isArray(parsed.suggested_tools) ? parsed.suggested_tools : [],
            reason: parsed.reason || '',
          });
        } catch (e) {
          console.warn('[intent_classifier] parse failed:', e.message, '|', data.slice(0, 200));
          resolve(FALLBACK);
        }
      });
    });
    req.on('error', (e) => {
      console.warn('[intent_classifier] http error:', e.message);
      resolve(FALLBACK);
    });
    req.setTimeout(timeoutMs, () => {
      req.destroy();
      console.warn('[intent_classifier] timeout');
      resolve(FALLBACK);
    });
    req.write(body);
    req.end();
  });
}

module.exports = { classifyIntent, INTENTS };

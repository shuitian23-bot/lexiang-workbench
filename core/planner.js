// 多任务 planner：识别用户单条消息是否含 ≥2 个独立诉求
// 触发条件：意图分类后，confidence >= 0.6 且消息长度 ≥ 12
// 输出：{needs_planning, subtasks:[{intent,query,reason}], hint}
// 主 agent 把 hint 注入 system prompt，引导 LLM 一次性触发多个 tool_calls（dashscope 支持 parallel_tool_calls）

const https = require('https');
const { INTENTS } = require('./intent_classifier');

const API_KEY = process.env.DASHSCOPE_API_KEY;
const MODEL = process.env.PLANNER_MODEL || 'doubao-seed-2.0-lite';

const FALLBACK = { needs_planning: false, subtasks: [], hint: '', reason: 'fallback' };

function buildPrompt(userMessage, primaryIntent, siteType) {
  const intentList = Object.keys(INTENTS).join(' / ');
  return `你是联想乐享助手的任务规划器。判断用户消息是否包含 ≥2 个独立诉求需要并行处理。

【可选 intent】${intentList}
【主意图】${primaryIntent || 'unknown'}
【站点】${siteType || 'default'}

【判断规则】
- 单一意图（仅推荐 / 仅查询 / 仅咨询）→ needs_planning=false，subtasks=[]
- 同时含 ≥2 类**异质**诉求（如"推荐机型 + 查门店"、"以旧换新 + 查会员权益"、"推荐机型 + 看优惠券"）→ needs_planning=true
- **不要拆**：纯对比咨询（"A vs B 哪个好"是单 product_explain，不要再拆 product_recommend）；同类追问（"再贵一点"是 filter 单一）；闲聊；多个候选机型本身（"Yoga 还是小新"是 product_explain）
- **优惠/到手价/国补/学生便宜/以旧换新能抵多少**类 = 单一「权益编排」意图，needs_planning=false，由 AI 权益管家一个工具统办，**禁止拆成 推荐+优惠券+换新 多路**（会重复分散）
- 子任务最多 3 个，每个含 intent + 一句话 query

【输出格式】严格 JSON 单行：
{"needs_planning":true/false,"subtasks":[{"intent":"xxx","query":"xxx"}],"hint":"对主 LLM 的提示一句话"}

【用户消息】"${(userMessage || '').replace(/"/g, '\\"').slice(0, 500)}"

直接输出 JSON：`;
}

function planTasks(userMessage, primaryIntent = 'chitchat', siteType = 'default', options = {}) {
  if (!API_KEY || !userMessage || userMessage.trim().length < 12) {
    return Promise.resolve(FALLBACK);
  }
  const timeoutMs = options.timeoutMs || 4000;
  const body = JSON.stringify({
    model: MODEL, thinking: { type: 'disabled' },
    messages: [{ role: 'user', content: buildPrompt(userMessage, primaryIntent, siteType) }],
    temperature: 0,
    max_tokens: 300,
    response_format: { type: 'json_object' },
  });
  const opts = {
    hostname: 'ark.cn-beijing.volces.com',
    path: '/api/coding/v3/chat/completions',
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
          const cleaned = text.replace(/^```(?:json)?\s*|\s*```$/g, '').trim();
          const parsed = JSON.parse(cleaned);
          const subtasks = Array.isArray(parsed.subtasks) ? parsed.subtasks.slice(0, 3) : [];
          resolve({
            needs_planning: !!parsed.needs_planning && subtasks.length >= 2,
            subtasks,
            hint: parsed.hint || '',
            reason: 'ok',
          });
        } catch (e) {
          console.warn('[planner] parse failed:', e.message, '|', data.slice(0, 200));
          resolve(FALLBACK);
        }
      });
    });
    req.on('error', (e) => {
      console.warn('[planner] http error:', e.message);
      resolve(FALLBACK);
    });
    req.setTimeout(timeoutMs, () => {
      req.destroy();
      console.warn('[planner] timeout');
      resolve(FALLBACK);
    });
    req.write(body);
    req.end();
  });
}

function buildPlanHintMessage(plan) {
  if (!plan || !plan.needs_planning || !plan.subtasks.length) return null;
  const lines = plan.subtasks.map((t, i) => `  ${i + 1}. [${t.intent}] ${t.query}`);
  return `【任务规划】用户消息含 ${plan.subtasks.length} 个并行诉求，请尽量在同一轮内一次性触发多个工具调用以并行处理：\n${lines.join('\n')}\n${plan.hint ? '提示：' + plan.hint : ''}`;
}

module.exports = { planTasks, buildPlanHintMessage };

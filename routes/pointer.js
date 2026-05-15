// AI-Pointer MVP: 光标悬停 → 上下文文本 → qwen 主动 hint
// POST /api/pointer/infer  body: {context, page_url, recent_products?}
// 返回: {hint, ask}（hint=浮窗一句话，ask=点击后注入 chat 的 prompt）
const express = require('express');
const https = require('https');
const router = express.Router();

const API_KEY = process.env.DASHSCOPE_API_KEY;
const MODEL = process.env.POINTER_MODEL || 'qwen-turbo';
const TIMEOUT_MS = 4000;

// 简单内存缓存：context hash → result，5 分钟 TTL
const cache = new Map();
const CACHE_TTL = 5 * 60 * 1000;
function hash(s) { let h = 0; for (let i = 0; i < s.length; i++) { h = ((h << 5) - h) + s.charCodeAt(i); h |= 0; } return h; }
setInterval(() => { const now = Date.now(); for (const [k, v] of cache) if (now - v.ts > CACHE_TTL) cache.delete(k); }, 60000);

function buildPrompt(context, recent) {
  const recentText = (recent || []).slice(0, 3).map(p => '- ' + p.name + (p.price ? ' ¥' + p.price : '')).join('\n');
  return `你是联想官方导购员"小享"，用户光标悬停在某段商品/参数上。基于<pointed_element>，给一句具体、有用、可行动的提示。

【用户已浏览的相关商品】
${recentText || '（无）'}

【光标指向的页面区域文本】
<pointed_element>
${(context || '').slice(0, 800)}
</pointed_element>

【输出要求】严格 JSON 单行：
{"hint":"用一句话点破，含具体参数对比/搭配建议/性价比洞察，≤40 字","ask":"用户点确认后注入 chat 的 prompt（详细问题，AI 给完整答复）"}

【禁止】
- 通用回答（"这是好商品"）
- 重复用户已知信息
- 超过 40 字的 hint

直接输出 JSON：`;
}

function callQwen(prompt) {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify({
      model: MODEL,
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.3,
      max_tokens: 250,
      response_format: { type: 'json_object' },
    });
    const req = https.request({
      hostname: 'dashscope.aliyuncs.com',
      path: '/compatible-mode/v1/chat/completions',
      method: 'POST',
      headers: {
        'Authorization': 'Bearer ' + API_KEY,
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(body),
      },
    }, (res) => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          const text = json.choices?.[0]?.message?.content || '';
          const parsed = JSON.parse(text.replace(/^```(?:json)?\s*|\s*```$/g, '').trim());
          if (!parsed.hint || !parsed.ask) return reject(new Error('no hint/ask'));
          resolve(parsed);
        } catch (e) { reject(e); }
      });
    });
    req.on('error', reject);
    req.setTimeout(TIMEOUT_MS, () => req.destroy(new Error('timeout')));
    req.write(body); req.end();
  });
}

router.post('/infer', express.json({ limit: '32kb' }), async (req, res) => {
  if (!API_KEY) return res.status(503).json({ error: 'no api key' });
  const { context, page_url, recent_products } = req.body || {};
  if (!context || String(context).trim().length < 10) return res.status(400).json({ error: 'context too short' });
  const key = hash((page_url || '') + '|' + context.slice(0, 400));
  const cached = cache.get(key);
  if (cached && Date.now() - cached.ts < CACHE_TTL) {
    return res.json({ ...cached.data, cached: true });
  }
  try {
    const result = await callQwen(buildPrompt(context, recent_products));
    cache.set(key, { ts: Date.now(), data: result });
    res.json({ ...result, cached: false });
  } catch (err) {
    console.warn('[pointer]', err.message);
    res.status(502).json({ error: err.message });
  }
});

module.exports = router;

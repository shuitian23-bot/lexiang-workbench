// AI-Pointer MVP: 光标悬停 → 上下文文本 → qwen 主动 hint
// POST /api/pointer/infer  body: {context, page_url, recent_products?}
// 返回: {hint, ask}（hint=浮窗一句话，ask=点击后注入 chat 的 prompt）
const express = require('express');
const https = require('https');
const router = express.Router();

const API_KEY = process.env.DASHSCOPE_API_KEY;
const MODEL_TEXT = process.env.POINTER_MODEL || 'qwen-turbo';
const MODEL_VL = process.env.POINTER_VL_MODEL || 'qwen-vl-max-latest';
const TIMEOUT_MS = 6000;

// 简单内存缓存：context hash → result，5 分钟 TTL
const cache = new Map();
const CACHE_TTL = 5 * 60 * 1000;
function hash(s) { let h = 0; for (let i = 0; i < s.length; i++) { h = ((h << 5) - h) + s.charCodeAt(i); h |= 0; } return h; }
setInterval(() => { const now = Date.now(); for (const [k, v] of cache) if (now - v.ts > CACHE_TTL) cache.delete(k); }, 60000);

function buildSystemText(recent, lastPointed) {
  const recentText = (recent || []).slice(0, 3).map(p => '- ' + p.name + (p.price ? ' ¥' + p.price : '')).join('\n');
  const lastText = lastPointed ? `\n【30 分钟内你刚指过的另一处】\n${lastPointed.slice(0, 200)}` : '';
  return `你是联想官方导购员"小享"，用户光标悬停在某段商品/参数上（含图）。基于 <pointed> 块，给一句具体、有用、可行动的提示。

【用户已浏览的相关商品】
${recentText || '（无）'}${lastText}

【输出要求】严格 JSON 单行：
{"hint":"用一句话点破，含具体参数对比/搭配建议/性价比洞察，≤40 字","ask":"用户点确认后注入 chat 的 prompt（详细问题）"}

【禁止】通用回答 / 重复用户已知信息 / 超 40 字 hint。

【双指向支持】若用户之前指过另一处，hint 优先输出"跟刚才那个 [属性] 相比 X"型对比。

直接输出 JSON：`;
}

function callQwen(model, messages) {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify({
      model,
      messages,
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
          if (!parsed.hint || !parsed.ask) return reject(new Error('no hint/ask: ' + text.slice(0, 100)));
          resolve(parsed);
        } catch (e) { reject(e); }
      });
    });
    req.on('error', reject);
    req.setTimeout(TIMEOUT_MS, () => req.destroy(new Error('timeout')));
    req.write(body); req.end();
  });
}

router.post('/infer', express.json({ limit: '128kb' }), async (req, res) => {
  if (!API_KEY) return res.status(503).json({ error: 'no api key' });
  const { context, page_url, recent_products, image_urls, last_pointed } = req.body || {};
  if (!context || String(context).trim().length < 10) return res.status(400).json({ error: 'context too short' });
  const imgs = (Array.isArray(image_urls) ? image_urls : []).filter(u => typeof u === 'string' && /^https?:\/\//.test(u)).slice(0, 3);
  const useVl = imgs.length > 0;
  const cacheKey = hash((page_url || '') + '|' + context.slice(0, 400) + '|' + imgs.join(',') + '|' + (last_pointed || '').slice(0, 80));
  const cached = cache.get(cacheKey);
  if (cached && Date.now() - cached.ts < CACHE_TTL) {
    return res.json({ ...cached.data, cached: true, vl: useVl });
  }
  try {
    const sys = buildSystemText(recent_products, last_pointed);
    let messages;
    if (useVl) {
      // qwen-vl-max-latest 多模态：单 user message，content 为数组
      const userContent = imgs.map(u => ({ type: 'image_url', image_url: { url: u } }));
      userContent.push({ type: 'text', text: '【pointed_element 文本】\n' + context.slice(0, 800) + '\n\n' + sys });
      messages = [{ role: 'user', content: userContent }];
    } else {
      messages = [{ role: 'user', content: sys + '\n\n【pointed_element 文本】\n' + context.slice(0, 800) }];
    }
    const result = await callQwen(useVl ? MODEL_VL : MODEL_TEXT, messages);
    cache.set(cacheKey, { ts: Date.now(), data: result });
    res.json({ ...result, cached: false, vl: useVl });
  } catch (err) {
    console.warn('[pointer]', err.message);
    res.status(502).json({ error: err.message });
  }
});

module.exports = router;

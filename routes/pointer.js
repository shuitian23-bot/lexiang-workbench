// AI-Pointer MVP: 光标悬停 → 上下文文本 → qwen 主动 hint
// POST /api/pointer/infer  body: {context, page_url, recent_products?}
// 返回: {hint, ask}（hint=浮窗一句话，ask=点击后注入 chat 的 prompt）
const express = require('express');
const https = require('https');
const router = express.Router();

const API_KEY = process.env.DASHSCOPE_API_KEY;
const MODEL_TEXT = process.env.POINTER_MODEL || 'doubao-seed-2.0-lite';
const MODEL_VL = process.env.POINTER_VL_MODEL || 'doubao-seed-2.0-pro';
const TIMEOUT_MS = 6000;

// 简单内存缓存：context hash → result，5 分钟 TTL
const cache = new Map();
const CACHE_TTL = 5 * 60 * 1000;
function hash(s) { let h = 0; for (let i = 0; i < s.length; i++) { h = ((h << 5) - h) + s.charCodeAt(i); h |= 0; } return h; }
setInterval(() => { const now = Date.now(); for (const [k, v] of cache) if (now - v.ts > CACHE_TTL) cache.delete(k); }, 60000);

function buildSystemText(recent, lastPointed) {
  const recentText = (recent || []).slice(0, 3).map(p => p.name + (p.price ? '¥' + p.price : '')).join('、');
  const lastText = lastPointed ? `\n刚指过另一处：${lastPointed.slice(0, 120)}（hint 须是"比刚才那个X，本款Y"型对比）` : '';
  return `你是联想官方商城金牌导购"小享"。用户悬停某商品/参数/评价 800ms，给一句比他想得更深一层的提示。
已浏览：${recentText || '无'}${lastText}
hint 规则：含具体数字/型号/价格；含行动指向(看X/配X/省¥X)；揭示隐藏信息(焊死内存/散热差/捆绑省¥X/限时);≤40字;口语化;末尾带促单钩子(官方券/限时直降/赠品/库存紧)。禁说"比官网便宜"——我们就是官网。禁反问"要不要对比"。
ask：点"详细问"注入 chat 的完整问题，30-60字，导向下单/领券。
good："¥5999 下单领官方券再减¥300 到手¥5699"
输出严格 JSON 单行：{"hint":"...","ask":"..."}`;
}

function callQwen(model, messages) {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify({
      model,
      messages,
      temperature: 0.3,
      max_tokens: 140,
      thinking: { type: 'disabled' },
      response_format: { type: 'json_object' },
    });
    const req = https.request({
      hostname: 'ark.cn-beijing.volces.com',
      path: '/api/coding/v3/chat/completions',
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

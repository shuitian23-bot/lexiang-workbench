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
  const lastText = lastPointed ? `\n【30 分钟内用户刚指过的另一处】\n${lastPointed.slice(0, 200)}` : '';
  return `你是联想金牌导购"小享"。用户光标悬停某商品/参数/评价/方案区域 800ms。给一句**比用户自己想到更深一层**的提示。

【用户已浏览过】
${recentText || '（无）'}${lastText}

【hint 必须满足】（违反任一返回 chitchat fallback）
- 含至少 1 个**具体数字/型号/价格/参数**（不能含糊）
- 含**行动指向**（看 X / 配 X / 跟 X 比 / 升 X / 省 ¥X）
- 揭示**用户大概率不知道的隐藏信息**（焊死内存 / 同 SoC 但散热差 / 配件捆绑省 ¥X / 限时活动）
- ≤ 40 字
- 中文，口语化，像导购员当面说

【双指向激活】若有「刚指过的另一处」，hint 必须是"跟刚才那个 [具体属性] 相比，X"型对比。

【ask 字段】用户点「详细问」时注入 chat 的完整问题（30-60 字，给 AI 出长答复用）。

【bad 反例】"这是好商品"/ "性能不错"/ "适合办公"
【good 范例】
- "16GB 焊死，T14 可扩到 64G，做剪辑选 T14"（产品参数差异）
- "凑个 ¥99 内胆包到 ¥5000 满减 ¥200"（凑单计算）
- "RTX5070 比上代散热降 8°C，3A 大作不卡帧"（用户难知的提升）

输出严格 JSON 单行：{"hint":"...","ask":"..."}`;
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

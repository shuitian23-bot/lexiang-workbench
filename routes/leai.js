const express = require('express');
const router = express.Router();
const { getAuth, getFaq, mapProductList } = require('../core/leai_client');

const AIGC_BASE = 'https://aigc.lenovo.com.cn/v3';
const HEADERS = {
  'Origin': 'https://leai.lenovo.com.cn',
  'Referer': 'https://leai.lenovo.com.cn/'
};

// GET /api/leai/auth — 获取 guest session token
router.get('/auth', async (req, res) => {
  try {
    const resp = await fetch(`${AIGC_BASE}/api/user/auth?${Date.now()}&device=1`, { headers: HEADERS });
    const data = await resp.json();
    res.json(data);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// GET /api/leai/faq — FAQ热门问题
router.get('/faq', async (req, res) => {
  try {
    // 用带 token 的 getFaq（官方 faq 需 Authorization，否则 data 为 null）
    const data = await getFaq();
    res.json({ rc: 0, data: Array.isArray(data) ? data : [] });
  } catch (e) {
    res.status(500).json({ error: e.message, data: [] });
  }
});

// POST /api/leai/chat — SSE流式对话代理
router.post('/chat', async (req, res) => {
  const { sessionId, token, input, questionType = '1' } = req.body;
  if (!sessionId || !token || !input) return res.status(400).json({ error: '缺少参数' });

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');
  res.flushHeaders();

  try {
    const resp = await fetch(`${AIGC_BASE}/api/chat/qa`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
        'Accept': 'text/event-stream',
        ...HEADERS
      },
      body: JSON.stringify({ sessionId, input, questionType, timestamp: Date.now(), device: 1 })
    });

    const reader = resp.body.getReader();
    const decoder = new TextDecoder();
    let done = false;
    while (!done) {
      const { value, done: d } = await reader.read();
      done = d;
      if (value) res.write(decoder.decode(value, { stream: true }));
    }
    res.end();
  } catch (e) {
    res.write(`data: ${JSON.stringify({ error: e.message })}\n\n`);
    res.end();
  }
});

// POST /api/leai/stream — 翻译官方 SSE 为前端 chunk/status/display/done 格式
router.post('/stream', async (req, res) => {
  const { message, sessionId: bodySessionId } = req.body;
  if (!message) return res.status(400).json({ error: '缺少 message 参数' });

  res.set({
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
    'X-Accel-Buffering': 'no',
  });
  res.flushHeaders();

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 45000);

  try {
    let auth = await getAuth();
    let sessionId = bodySessionId || auth.sessionId;

    const callQa = (token, sid) => fetch(`${AIGC_BASE}/api/chat/qa`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'text/event-stream',
        'Authorization': `Bearer ${token}`,
        ...HEADERS,
      },
      body: JSON.stringify({
        input: message,
        sessionId: sid,
        entrySource: 'pc',
        timestamp: Date.now(),
        questionType: '1',
        extendParams: {},
      }),
      signal: controller.signal,
    });

    let upstream = await callQa(auth.token, sessionId);
    // 缓存的 guest token 可能比 20min 缓存先过期 → 401/403 时强制重新鉴权并重试一次
    if (upstream.status === 401 || upstream.status === 403) {
      auth = await getAuth(true);
      sessionId = bodySessionId || auth.sessionId;
      upstream = await callQa(auth.token, sessionId);
    }

    // 回传 sessionId，前端存为 conv_id 续接
    res.write('event: status\ndata:' + JSON.stringify({ conv_id: sessionId, sessionId }) + '\n\n');

    if (!upstream.ok || !upstream.body) {
      throw new Error('upstream http ' + upstream.status);
    }

    const reader = upstream.body.getReader();
    const decoder = new TextDecoder();
    let buf = '';
    let lastLen = 0;
    let sentProducts = false;
    let sentClicks = false;

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buf += decoder.decode(value, { stream: true });
      const lines = buf.split('\n');
      buf = lines.pop(); // 保留不完整行

      for (const line of lines) {
        if (!line.startsWith('data:')) continue;
        let d;
        try { d = JSON.parse(line.slice(5)); } catch { continue; }
        const r = d.response || {};

        // 思考/调用过程（官方 thinking_trace：分析意图 / 调用 skill / 查知识库）→ 翻成 status 让前端展示
        // 只在正文还没开始流式时展示（正文一来就被覆盖，符合"思考中→出答案"的官方体验）
        if (!lastLen && d.thinking_trace && Array.isArray(d.thinking_trace.trace) && d.thinking_trace.trace.length) {
          const steps = d.thinking_trace.trace;
          const last = steps[steps.length - 1];
          const tip = last && last.thinking ? String(last.thinking).slice(0, 60) : '';
          if (tip) res.write('event: status\ndata:' + JSON.stringify({ text: tip }) + '\n\n');
        }

        // 文本增量（官方是全量累积，必须切 delta）
        if (typeof r.response_text === 'string' && r.response_text.length > lastLen) {
          const delta = r.response_text.slice(lastLen);
          lastLen = r.response_text.length;
          res.write('event: chunk\ndata:' + JSON.stringify({ text: delta }) + '\n\n');
        }

        // 商品（只发一次）
        if (!sentProducts && Array.isArray(r.product_list) && r.product_list.length) {
          const products = mapProductList(r.product_list, 6);
          if (products.length) {
            sentProducts = true;
            res.write('event: display\ndata:' + JSON.stringify({ products, title: '为你推荐' }) + '\n\n');
          }
        }

        // 官方动作按钮 click_list（转人工 human_access / 在线客服等）→ 翻成 clicks 事件，前端渲染成按钮
        if (!sentClicks && Array.isArray(r.click_list) && r.click_list.length) {
          const clicks = r.click_list.map((c) => ({
            event_type: c.event_type || '',
            display_text: c.display_text || '',
            link_url: c.link_url || '',
            callback_data: c.callback_data || '',
          })).filter((c) => c.display_text);
          if (clicks.length) {
            sentClicks = true;
            res.write('event: clicks\ndata:' + JSON.stringify({ clicks }) + '\n\n');
          }
        }
      }
    }

    res.write('event: done\ndata:' + JSON.stringify({ conv_id: sessionId }) + '\n\n');
    res.end();
  } catch (err) {
    if (err.name !== 'AbortError') {
      console.error('[leai/stream] error:', err && err.message, err && err.name);
      res.write('event: chunk\ndata:' + JSON.stringify({ text: '当前服务暂时不可用，请稍后再试。' }) + '\n\n');
    }
    res.write('event: done\ndata:' + JSON.stringify({ conv_id: null }) + '\n\n');
    res.end();
  } finally {
    clearTimeout(timer);
  }
});

module.exports = router;

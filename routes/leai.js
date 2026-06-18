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
  const { message, sessionId: bodySessionId, lng, lat, enableThinking } = req.body;
  if (!message) return res.status(400).json({ error: '缺少 message 参数' });

  // 门店查询官方需定位，否则卡在 get_position 等死。前端传真实经纬度则用，否则默认北京(演示)。
  const extendParams = {
    longitude: String(lng || '116.404'),
    latitude: String(lat || '39.915'),
  };

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
        extendParams,
        enableThinking: !!enableThinking,
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

    if (!upstream.ok || !upstream.body) {
      throw new Error('upstream http ' + upstream.status);
    }

    // 读流翻译 + session 失效("参数有误")自动重试一次
    let buf = '';
    let lastLen = 0;
    let sentProducts = false;
    let sentClicks = false;
    let retried = false;

    // 首次进入前先回传当前 sessionId（重试时在重试分支里更新并重发）
    res.write('event: status\ndata:' + JSON.stringify({ conv_id: sessionId, sessionId }) + '\n\n');

    // eslint-disable-next-line no-constant-condition
    while (true) {
      let needRetry = false;
      const reader = upstream.body.getReader();
      const decoder = new TextDecoder();

      streamLoop: while (true) {
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

          // session 失效检测：正文未开始 + response_text 是"参数有误" → 丢弃并重试
          if (!retried && lastLen === 0 && typeof r.response_text === 'string') {
            const trimmed = r.response_text.replace(/\s/g, '');
            if (trimmed === '参数有误' || trimmed.startsWith('参数有误')) {
              needRetry = true;
              break streamLoop;
            }
          }

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

      if (needRetry && !retried) {
        retried = true;
        // session 失效：重新鉴权，拿全新 sessionId（忽略 bodySessionId）
        auth = await getAuth(true);
        sessionId = auth.sessionId;
        // 重置流状态
        buf = '';
        lastLen = 0;
        sentProducts = false;
        sentClicks = false;
        // 回传新 sessionId 让前端更新 conv_id
        res.write('event: status\ndata:' + JSON.stringify({ conv_id: sessionId, sessionId }) + '\n\n');
        upstream = await callQa(auth.token, sessionId);
        if (!upstream.ok || !upstream.body) throw new Error('upstream http ' + upstream.status + ' (retry)');
        continue; // 重新走流式循环
      }

      break; // 正常结束
    }

    // 意图检测：在 done 前发 action 事件（正文已流完再开功能标签，体验顺）
    // 保守匹配：宁可少触发，不误伤商品问题
    const intentPatterns = [
      { op: 'member',   re: /我的?会员|会员权益|会员中心|我的积分|乐豆|我的权益/ },
      { op: 'coupon',   re: /优惠券|领券|我的券|有什么券|卡券/ },
      { op: 'solution', re: /解决方案|行业方案|(企业|政教|金融|教育|医疗|制造).{0,4}方案/ },
      { op: 'edu',      re: /教育优惠|学生优惠|校园优惠|教育特惠|学生认证|教育商店/ },
    ];
    const matchedIntent = intentPatterns.find(({ re }) => re.test(message));
    if (matchedIntent) {
      res.write('event: action\ndata:' + JSON.stringify({ op: matchedIntent.op }) + '\n\n');
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

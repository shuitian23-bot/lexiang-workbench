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

  // 页面操作短路：纯操作指令（关标签/回首页/切站/开订单等）不走官方大模型——
  // 官方 LLM 不懂我们的标签/分页概念，会答"我是文字助手没有浏览器"。直接发 control 事件让前端执行 + 简短确认。
  const controlIntents = [
    { op: 'close_all_tabs', re: /关闭(所有|全部|这些|当前)?(标签|页面|分页|tab|页签).*|(把|将)?(所有|全部|这些)(标签|页面|分页|页签).{0,4}关(掉|闭)?|关(掉|闭)(所有|全部)?(标签|页面|分页|页签)|清空(标签|页面|分页|页签)/i, text: '好的，已为你关闭所有打开的页面标签。' },
    { op: 'go_home', re: /回(到)?首页|返回首页|去首页|回主页/, text: '好的，已为你回到首页。' },
    { op: 'open_orders', re: /(我的|查看?|打开|看看?)订单|订单(列表|页面|中心)/, text: '好的，已为你打开订单页面。' },
    { op: 'open_cart', re: /(我的|查看?|打开|看看?)购物车|购物车(里|有什么)?/, text: '好的，已为你打开购物车。' },
    { op: 'clear_compare', re: /清(空|除)对比|清(空|除)(对比)?清单|删(掉|除)对比/, text: '好的，已为你清空对比清单。' },
  ];
  const ctrl = controlIntents.find(({ re }) => re.test(message));
  if (ctrl) {
    res.write('event: chunk\ndata:' + JSON.stringify({ text: ctrl.text }) + '\n\n');
    res.write('event: control\ndata:' + JSON.stringify({ op: ctrl.op }) + '\n\n');
    res.write('event: done\ndata:' + JSON.stringify({ conv_id: bodySessionId || null }) + '\n\n');
    return res.end();
  }

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

          // 限流检测：正文还没开始 + response_text 含「访问用户过多」或「稍后再试」→ 发 fallback（重试无用）
          if (lastLen === 0 && typeof r.response_text === 'string') {
            const txt = r.response_text;
            if (txt.includes('访问用户过多') || txt.includes('稍后再试')) {
              res.write('event: fallback\ndata:' + JSON.stringify({}) + '\n\n');
              res.write('event: done\ndata:' + JSON.stringify({ conv_id: null }) + '\n\n');
              res.end();
              clearTimeout(timer);
              return;
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
      { op: 'stores',   re: /门店|实体店|线下店|体验店|专卖店|服务网点|服务中心|到店|附近.{0,4}店/ },
      { op: 'auth',     re: /职场.{0,2}认证|职场人群|在职.{0,2}认证|工牌认证|职场身份|员工认证/ },
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
      res.write('event: fallback\ndata:' + JSON.stringify({}) + '\n\n');
    }
    res.write('event: done\ndata:' + JSON.stringify({ conv_id: null }) + '\n\n');
    res.end();
  } finally {
    clearTimeout(timer);
  }
});

// POST /api/leai/followups — 火山 lite 生成追问 chips（非流式）
const https = require('https');
router.post('/followups', (req, res) => {
  const q = String((req.body && req.body.q) || '').trim().slice(0, 300);
  const a = String((req.body && req.body.a) || '').trim().slice(0, 300);
  if (!q) return res.json({ rc: 0, questions: [] });

  const sys = '基于问答生成3个用户可能接着问的简短追问，每个≤15字、口语化、不重复原问题。只返回JSON数组如["问题1","问题2","问题3"]，不要其它文字。';
  const userContent = `问:${q}\n答:${a}`;
  const body = JSON.stringify({
    model: 'doubao-seed-2.0-lite',
    messages: [{ role: 'system', content: sys }, { role: 'user', content: userContent }],
    max_tokens: 200, temperature: 0.7, stream: false, thinking: { type: 'disabled' }
  });

  try {
    const ar = https.request({
      hostname: 'ark.cn-beijing.volces.com',
      path: '/api/coding/v3/chat/completions',
      method: 'POST',
      headers: {
        'Authorization': 'Bearer ' + process.env.DASHSCOPE_API_KEY,
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(body)
      }
    }, (r) => {
      let buf = '';
      r.on('data', chunk => { buf += chunk.toString(); });
      r.on('end', () => {
        try {
          const j = JSON.parse(buf);
          const raw = j.choices?.[0]?.message?.content || '';
          // 容错：找 JSON 数组
          const m = raw.match(/\[[\s\S]*\]/);
          const arr = m ? JSON.parse(m[0]) : [];
          const questions = Array.isArray(arr) ? arr.slice(0, 3).map(String) : [];
          res.json({ rc: 0, questions });
        } catch (_) {
          res.json({ rc: 0, questions: [] });
        }
      });
      r.on('error', () => res.json({ rc: 0, questions: [] }));
    });
    ar.on('error', () => { try { res.json({ rc: 0, questions: [] }); } catch (_) {} });
    ar.setTimeout(10000, () => { ar.destroy(); try { res.json({ rc: 0, questions: [] }); } catch (_) {} });
    ar.write(body);
    ar.end();
  } catch (_) {
    res.json({ rc: 0, questions: [] });
  }
});

// POST /api/leai/compare-advice — 火山 lite 对比推荐（非流式）
router.post('/compare-advice', (req, res) => {
  const { products, q } = req.body || {};
  if (!Array.isArray(products) || products.length < 2) return res.json({ pick: '', reason: '' });
  const sys = '你是导购，从这几款里结合用户需求推荐最合适的一款，输出JSON {"pick":"商品名","reason":"≤40字理由"}。只返回JSON。';
  const summary = products.map(p => `${p.name || ''}（¥${p.price || ''}，${p.cpu || ''}，${p.ram || p.memory || ''}）`).join('；');
  const userContent = `商品：${summary}\n用户需求：${String(q || '').slice(0, 200)}`;
  const body = JSON.stringify({
    model: 'doubao-seed-2.0-lite',
    messages: [{ role: 'system', content: sys }, { role: 'user', content: userContent }],
    max_tokens: 200, temperature: 0.3, stream: false, thinking: { type: 'disabled' }
  });
  try {
    const ar = https.request({
      hostname: 'ark.cn-beijing.volces.com',
      path: '/api/coding/v3/chat/completions',
      method: 'POST',
      headers: {
        'Authorization': 'Bearer ' + process.env.DASHSCOPE_API_KEY,
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(body)
      }
    }, (r) => {
      let buf = '';
      r.on('data', chunk => { buf += chunk.toString(); });
      r.on('end', () => {
        try {
          const j = JSON.parse(buf);
          const raw = (j.choices?.[0]?.message?.content || '').trim();
          const m = raw.match(/\{[\s\S]*\}/);
          const obj = m ? JSON.parse(m[0]) : {};
          res.json({ pick: String(obj.pick || ''), reason: String(obj.reason || '') });
        } catch (_) { res.json({ pick: '', reason: '' }); }
      });
      r.on('error', () => { try { res.json({ pick: '', reason: '' }); } catch (_) {} });
    });
    ar.on('error', () => { try { res.json({ pick: '', reason: '' }); } catch (_) {} });
    ar.setTimeout(12000, () => { ar.destroy(); try { res.json({ pick: '', reason: '' }); } catch (_) {} });
    ar.write(body);
    ar.end();
  } catch (_) { res.json({ pick: '', reason: '' }); }
});

// POST /api/leai/intent — 火山 lite 意图路由（control vs chat）
router.post('/intent', (req, res) => {
  const { message } = req.body || {};
  const fallback = { type: 'chat', op: '', target: '' };
  if (!message) return res.json(fallback);
  const sys = `你是联想乐享 PC 助手的意图路由器。分析用户输入，判断是"页面操作指令"还是"问答/咨询"，严格按以下 JSON 格式返回，不输出任何其他文字：
{"type":"control","op":"<操作码>","target":"<目标或空字符串>"}
或
{"type":"chat","op":"","target":""}

操作码枚举（从以下选一个，不能自造）：
close_all_tabs / close_tab / go_home / switch_site / open_member / open_coupon / open_orders / open_cart / open_stores / open_edu_zone / open_compare / clear_compare / start_student_auth / start_enterprise_auth / open_product / enter_fullscreen / exit_fullscreen

判断规则：
1. 只有用户明确要求"操作界面/页面/标签/全屏"时才返回 type=control，选最贴切的 op。
2. 商品咨询、推荐、参数、价格、政策、闲聊、比较等一律 type=chat（op和target留空字符串）。
3. "打开/帮我看/看下 XX 商品""帮我打开拯救者Y9000P" → op=open_product，target填商品名/型号。
4. "全屏/放大/沉浸/专注模式" → op=enter_fullscreen；"退出全屏/缩小/分屏/恢复窗口" → op=exit_fullscreen。
5. "关所有标签/关掉所有页面/清空标签" → op=close_all_tabs。
6. "回首页/去首页" → op=go_home；"打开购物车" → op=open_cart；"看我的订单" → op=open_orders。
7. 拿不准的一律判 type=chat（宁可走问答，不误触发操作）。`;
  const body = JSON.stringify({
    model: 'doubao-seed-2.0-lite',
    messages: [{ role: 'system', content: sys }, { role: 'user', content: String(message).slice(0, 500) }],
    max_tokens: 100, temperature: 0, stream: false, thinking: { type: 'disabled' }
  });
  try {
    const ar = https.request({
      hostname: 'ark.cn-beijing.volces.com',
      path: '/api/coding/v3/chat/completions',
      method: 'POST',
      headers: {
        'Authorization': 'Bearer ' + process.env.DASHSCOPE_API_KEY,
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(body)
      }
    }, (r) => {
      let buf = '';
      r.on('data', chunk => { buf += chunk.toString(); });
      r.on('end', () => {
        try {
          const j = JSON.parse(buf);
          const raw = (j.choices?.[0]?.message?.content || '').trim();
          const m = raw.match(/\{[\s\S]*?\}/);
          const obj = m ? JSON.parse(m[0]) : {};
          const type = obj.type === 'control' ? 'control' : 'chat';
          const op = String(obj.op || '');
          const target = String(obj.target || '');
          res.json({ type, op, target });
        } catch (_) { try { res.json(fallback); } catch (__) {} }
      });
      r.on('error', () => { try { res.json(fallback); } catch (_) {} });
    });
    ar.on('error', () => { try { res.json(fallback); } catch (_) {} });
    ar.setTimeout(6000, () => { ar.destroy(); try { res.json(fallback); } catch (_) {} });
    ar.write(body);
    ar.end();
  } catch (_) { res.json(fallback); }
});

// GET /api/leai/member — 透传官方登录态会员信息（guest/memberLevel/loginName）
router.get('/member', async (req, res) => {
  try {
    const a = await getAuth();
    res.json({
      guest: !!a.guest,
      memberLevel: a.memberLevel || '',
      memberLevelCode: a.memberLevelCode || '',
      loginName: a.loginName || '',
    });
  } catch (_) {
    res.json({ guest: true });
  }
});

module.exports = router;

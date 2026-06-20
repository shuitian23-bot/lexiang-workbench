// 联想乐享官方 AIGC v3 客户端（aigc.lenovo.com.cn）
// 用途：官方口径直通车（政策/补贴/活动/账号）+ 官方货盘 product_list + FAQ 运营位
// guest token 全局缓存，过期/失效自动重取
const BASE = 'https://aigc.lenovo.com.cn/v3';

let _auth = null; // { token, sessionId, at }
const AUTH_TTL = 20 * 60 * 1000;

async function getAuth(force = false) {
  if (!force && _auth && Date.now() - _auth.at < AUTH_TTL) return _auth;
  // 有登录态 passport（.env LEAI_PASSPORT）→ 换认证 token（guest:false，会话持久不2轮过期）；
  // 无/过期则官方返回 guest token，自动降级，不报错。
  const headers = { Origin: 'https://leai.lenovo.com.cn', Referer: 'https://leai.lenovo.com.cn/' };
  if (process.env.LEAI_PASSPORT) headers.Cookie = `cerpreg-passport=${process.env.LEAI_PASSPORT}`;
  const res = await fetch(`${BASE}/api/user/auth?${Date.now()}&device=1`, { headers, signal: AbortSignal.timeout(8000) });
  const json = await res.json();
  if (json.rc !== 0 || !json.data?.token) throw new Error('leai auth failed: ' + (json.rm || res.status));
  _auth = {
    token: json.data.token,
    sessionId: json.data.sessionId,
    guest: json.data.guest,
    memberLevel: json.data.memberLevel || '',
    memberLevelCode: json.data.memberLevelCode || '',
    loginName: json.data.loginName || '',
    at: Date.now(),
  };
  return _auth;
}

// FAQ 运营位（缓存 10 分钟）
let _faqCache = null;
async function getFaq() {
  if (_faqCache && Date.now() - _faqCache.at < 10 * 60 * 1000) return _faqCache.data;
  const { token } = await getAuth();
  const res = await fetch(`${BASE}/api/chat/faq`, { headers: { Authorization: `Bearer ${token}` }, signal: AbortSignal.timeout(8000) });
  const json = await res.json();
  if (json.rc !== 0) throw new Error('leai faq failed: ' + json.rm);
  _faqCache = { data: json.data || [], at: Date.now() };
  return _faqCache.data;
}

// 主对话：消费 SSE 直至 answerFinal/超时，聚合为结构化结果
// 返回 { text, scenes, productList, deviceList, needPosition }
async function qa(input, { timeoutMs = 45000 } = {}) {
  const { token, sessionId } = await getAuth();
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  const result = { text: '', scenes: new Set(), productList: null, deviceList: null, needPosition: false };
  try {
    const res = await fetch(`${BASE}/api/chat/qa`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'text/event-stream', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ input, sessionId, entrySource: 'pc', timestamp: Date.now(), questionType: '1', extendParams: {} }),
      signal: controller.signal,
    });
    if (!res.ok || !res.body) throw new Error('leai qa http ' + res.status);
    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buf = '';
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buf += decoder.decode(value, { stream: true });
      const lines = buf.split('\n');
      buf = lines.pop();
      for (const line of lines) {
        if (!line.startsWith('data:')) continue;
        let d;
        try { d = JSON.parse(line.slice(5)); } catch { continue; }
        const scene = d.scene || '';
        result.scenes.add(scene);
        const r = d.response || {};
        if (typeof r.response_text === 'string' && r.response_text.length >= result.text.length) result.text = r.response_text;
        if (Array.isArray(r.product_list) && r.product_list.length) result.productList = r.product_list;
        if (r.device_list) result.deviceList = r.device_list;
        if (scene === 'get_position') result.needPosition = true;
      }
    }
  } catch (err) {
    if (err.name !== 'AbortError' && err.name !== 'TimeoutError') {
      // token 失效场景重试一次
      if (!result.text && String(err.message).includes('401')) { _auth = null; }
      if (!result.text) throw err;
    }
    // 超时但已有内容：返回已聚合部分
  } finally {
    clearTimeout(timer);
  }
  result.scenes = [...result.scenes];
  return result;
}

// 官方 product_list（SPU item_set → SKU item_list）映射为前端商品卡形态
function mapProductList(productList, limit = 6) {
  return (productList || []).slice(0, limit).map((set) => {
    const items = Array.isArray(set.item_list) ? set.item_list : [];
    const best = items[0] || {};
    return {
      official: true,
      sku: best.code || '',
      name: set.item_set_name || best.name || '',
      full_name: best.name || '',
      description: best.brief || '',
      price: Number(best.deliveryPrice || best.basePrice || 0),
      image_url: best.imgUrl || '',
      url: best.pcDetailUrl || best.url || '',
      variants: items.length,
      spu_id: best.spuId || set.item_set_id || '',
    };
  }).filter((p) => p.name);
}

module.exports = { getAuth, getFaq, qa, mapProductList };

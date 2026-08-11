/**
 * 火山引擎 Ark doubao-embedding-vision-251215 embedding wrapper
 * 1024维向量；multimodal 端点单请求单向量，内部并发池实现批量
 * （2026-07 从 DashScope text-embedding-v3 迁移，DashScope 已弃用）
 */
const API_KEY = process.env.ARK_API_KEY || process.env.DASHSCOPE_API_KEY || '';
const DIMENSION = 1024;
const MODEL = 'doubao-embedding-vision-251215';
const API_URL = 'https://ark.cn-beijing.volces.com/api/v3/embeddings/multimodal';
const CONCURRENCY = 16; // 服务端限流约4条/s，16为实测吞吐最优点

async function callOnce(text, retry = 3) {
  let res;
  try {
    res = await fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + API_KEY },
      body: JSON.stringify({
        model: MODEL,
        input: [{ type: 'text', text: String(text).slice(0, 3000) }],
        dimensions: DIMENSION
      }),
      signal: AbortSignal.timeout(30000)
    });
  } catch (e) {
    // 网络层失败（连接超时/reset）也重试
    if (retry > 0) {
      await new Promise(r => setTimeout(r, 1500));
      return callOnce(text, retry - 1);
    }
    throw e;
  }
  const j = await res.json().catch(() => ({}));
  const vec = j.data && j.data.embedding;
  if (!vec) {
    if (retry > 0 && (res.status === 429 || res.status >= 500)) {
      await new Promise(r => setTimeout(r, 1500));
      return callOnce(text, retry - 1);
    }
    throw new Error('API error: ' + JSON.stringify(j.error || j).slice(0, 300));
  }
  return vec;
}

/**
 * 对文本数组批量生成向量（内部并发池，顺序与入参一致）
 * @param {string[]} texts
 * @returns {Promise<number[][]>}
 */
async function embedTexts(texts) {
  const results = new Array(texts.length);
  let next = 0;
  async function worker() {
    while (next < texts.length) {
      const idx = next++;
      results[idx] = await callOnce(texts[idx]);
    }
  }
  await Promise.all(Array.from({ length: Math.min(CONCURRENCY, texts.length) }, worker));
  return results;
}

/**
 * 对单条文本生成向量
 */
async function embedOne(text) {
  return callOnce(text);
}

module.exports = { embedTexts, embedOne, DIMENSION };

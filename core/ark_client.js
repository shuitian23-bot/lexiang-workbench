const https = require('https');

const DEFAULT_BASE_URL = 'https://ark.cn-beijing.volces.com/api/coding/v3';
const DEFAULT_MODEL = 'doubao-seed-2.0-lite';

const API_KEY_ENV_KEYS = [
  'ARK_API_KEY',
  'VOLCENGINE_API_KEY',
  'VOLCENGINE_ARK_API_KEY',
  'DOUBAO_API_KEY',
  'DASHSCOPE_API_KEY'
];

function firstEnv(keys) {
  for (const key of keys) {
    const value = process.env[key];
    if (value && String(value).trim()) return String(value).trim();
  }
  return '';
}

function normalizeBaseUrl(baseUrl) {
  return String(baseUrl || DEFAULT_BASE_URL).replace(/\/+$/, '');
}

function getArkConfig() {
  const apiKey = firstEnv(API_KEY_ENV_KEYS);
  const model = firstEnv([
    'ARK_CHAT_MODEL',
    'VOLCENGINE_ARK_MODEL',
    'DOUBAO_MODEL',
    'HARNESS_CHAT_MODEL'
  ]) || DEFAULT_MODEL;
  const baseUrl = normalizeBaseUrl(firstEnv([
    'ARK_BASE_URL',
    'VOLCENGINE_ARK_BASE_URL',
    'DOUBAO_BASE_URL',
    'HARNESS_LLM_BASE_URL'
  ]) || DEFAULT_BASE_URL);
  const timeoutMs = Number(process.env.ARK_TIMEOUT_MS || process.env.HARNESS_LLM_TIMEOUT_MS || 60000);
  return { apiKey, model, baseUrl, timeoutMs };
}

function getChatUrl(config = getArkConfig()) {
  const explicitPath = firstEnv(['ARK_CHAT_PATH', 'VOLCENGINE_ARK_CHAT_PATH', 'DOUBAO_CHAT_PATH']);
  if (explicitPath) return new URL(explicitPath, config.baseUrl.includes('://') ? config.baseUrl : DEFAULT_BASE_URL);
  if (/\/chat\/completions$/.test(config.baseUrl)) return new URL(config.baseUrl);
  return new URL(config.baseUrl + '/chat/completions');
}

function missingKeyMessage() {
  return '未配置火山引擎 API Key。请配置 ARK_API_KEY 或 VOLCENGINE_API_KEY；当前兼容读取 DASHSCOPE_API_KEY。';
}

function assertConfigured(config) {
  if (!config.apiKey) throw new Error(missingKeyMessage());
}

function parseError(statusCode, raw) {
  let detail = raw;
  try {
    const json = JSON.parse(raw || '{}');
    detail = json.error?.message || json.message || JSON.stringify(json.error || json);
  } catch {}
  return new Error(`火山引擎调用失败（HTTP ${statusCode}）：${String(detail || '无返回内容').slice(0, 500)}`);
}

function requestJson(payload, timeoutMs) {
  const config = getArkConfig();
  assertConfigured(config);
  const chatUrl = getChatUrl(config);
  const body = JSON.stringify({ model: config.model, ...payload });

  return new Promise((resolve, reject) => {
    const req = https.request({
      hostname: chatUrl.hostname,
      path: chatUrl.pathname + chatUrl.search,
      method: 'POST',
      headers: {
        Authorization: `Bearer ${config.apiKey}`,
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(body)
      }
    }, (res) => {
      let data = '';
      res.on('data', chunk => { data += chunk; });
      res.on('end', () => {
        if (res.statusCode < 200 || res.statusCode >= 300) {
          reject(parseError(res.statusCode, data));
          return;
        }
        try {
          const json = JSON.parse(data || '{}');
          if (json.error) {
            reject(new Error(json.error.message || JSON.stringify(json.error)));
            return;
          }
          resolve(json);
        } catch (err) {
          reject(new Error(`火山引擎返回解析失败：${err.message}`));
        }
      });
    });

    req.on('error', reject);
    req.setTimeout(timeoutMs || config.timeoutMs, () => {
      req.destroy();
      reject(new Error('火山引擎调用超时'));
    });
    req.write(body);
    req.end();
  });
}

async function callArkChat(messages, tools, options = {}) {
  const payload = {
    thinking: { type: 'disabled' },
    messages,
    max_tokens: options.maxTokens || 1024,
    temperature: options.temperature ?? 0.3,
    ...(tools && tools.length ? { tools, tool_choice: options.toolChoice || 'auto' } : {})
  };
  const json = await requestJson(payload, options.timeoutMs || 30000);
  return json.choices?.[0]?.message || {};
}

function callArkChatStream(messages, onDelta, options = {}) {
  const config = getArkConfig();
  assertConfigured(config);
  const chatUrl = getChatUrl(config);
  const body = JSON.stringify({
    model: config.model,
    thinking: { type: 'disabled' },
    messages,
    max_tokens: options.maxTokens || 1024,
    temperature: options.temperature ?? 0.3,
    stream: true
  });

  return new Promise((resolve, reject) => {
    const req = https.request({
      hostname: chatUrl.hostname,
      path: chatUrl.pathname + chatUrl.search,
      method: 'POST',
      headers: {
        Authorization: `Bearer ${config.apiKey}`,
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(body)
      }
    }, (res) => {
      let buffer = '';
      let full = '';
      let errorBody = '';

      res.on('data', chunk => {
        if (res.statusCode < 200 || res.statusCode >= 300) {
          errorBody += chunk.toString();
          return;
        }
        buffer += chunk.toString();
        const lines = buffer.split('\n');
        buffer = lines.pop();
        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed.startsWith('data:')) continue;
          const payload = trimmed.slice(5).trim();
          if (!payload || payload === '[DONE]') continue;
          try {
            const json = JSON.parse(payload);
            if (json.error) throw new Error(json.error.message || JSON.stringify(json.error));
            const delta = json.choices?.[0]?.delta?.content || '';
            if (delta) {
              full += delta;
              try { onDelta(delta); } catch {}
            }
          } catch (err) {
            reject(new Error(`火山引擎流式响应解析失败：${err.message}`));
          }
        }
      });

      res.on('end', () => {
        if (res.statusCode < 200 || res.statusCode >= 300) {
          reject(parseError(res.statusCode, errorBody));
          return;
        }
        resolve(full);
      });
    });

    req.on('error', reject);
    req.setTimeout(options.timeoutMs || config.timeoutMs, () => {
      req.destroy();
      reject(new Error('火山引擎流式调用超时'));
    });
    req.write(body);
    req.end();
  });
}

function hasArkConfig() {
  return !!getArkConfig().apiKey;
}

function getArkRuntimeInfo() {
  const config = getArkConfig();
  return {
    provider: 'volcengine-ark',
    model: config.model,
    baseUrl: config.baseUrl,
    configured: !!config.apiKey
  };
}

module.exports = {
  callArkChat,
  callArkChatStream,
  getArkRuntimeInfo,
  hasArkConfig,
  missingKeyMessage
};

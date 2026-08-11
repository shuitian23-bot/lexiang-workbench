const express = require('express');
const router = express.Router();
const https = require('https');

const BASE = 'https://ai.idianliang.com';

function requireEnv(name) {
  const value = process.env[name];
  if (!value) throw new Error(`缺少环境变量 ${name}`);
  return value;
}

let cachedToken = null;
let tokenExpiry = 0;

async function getToken() {
  if (cachedToken && Date.now() < tokenExpiry) return cachedToken;
  const res = await fetchJSON(`${BASE}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      username: requireEnv('GEO_DIANLIANG_USERNAME'),
      password: requireEnv('GEO_DIANLIANG_PASSWORD')
    })
  });
  if (res.code === 200 && res.data?.token) {
    cachedToken = res.data.token;
    tokenExpiry = Date.now() + 23 * 60 * 60 * 1000; // 23h
    return cachedToken;
  }
  throw new Error('点亮AI登录失败: ' + JSON.stringify(res));
}

function fetchJSON(url, opts = {}) {
  return new Promise((resolve, reject) => {
    const u = new URL(url);
    const options = {
      hostname: u.hostname,
      port: u.port || 443,
      path: u.pathname + u.search,
      method: opts.method || 'GET',
      headers: { ...opts.headers }
    };
    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => {
        try { resolve(JSON.parse(data)); }
        catch { resolve({ raw: data }); }
      });
    });
    req.on('error', reject);
    if (opts.body) req.write(opts.body);
    req.end();
  });
}

async function proxyGet(apiPath, query) {
  const token = await getToken();
  const params = new URLSearchParams(query).toString();
  const url = `${BASE}${apiPath}${params ? '?' + params : ''}`;
  return fetchJSON(url, {
    headers: { Cookie: `token=${token}; uid=${requireEnv('GEO_DIANLIANG_UID')}` }
  });
}

// 外部API代理（overview等），替代nginx proxy
const EXT_BASE = 'https://api.dianliang.ai/api/external/geo';

function getExternalHeaders() {
  return {
    'X-Client-Code': process.env.GEO_EXTERNAL_CLIENT_CODE || 'lenovo',
    'Authorization': `Bearer ${requireEnv('GEO_EXTERNAL_API_TOKEN')}`,
    'Content-Type': 'application/json'
  };
}

function proxyExternalPost(endpoint, body) {
  return fetchJSON(`${EXT_BASE}/${endpoint}`, {
    method: 'POST',
    headers: getExternalHeaders(),
    body: JSON.stringify(body)
  });
}

router.post('/overview', async (req, res) => {
  try {
    const data = await proxyExternalPost('overview', req.body);
    res.json(data);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.post('/questions', async (req, res) => {
  try {
    const data = await proxyExternalPost('questions', req.body);
    res.json(data);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.post("/citations", async (req, res) => {
  try {
    const data = await proxyExternalPost('citations', req.body);
    res.json(data);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.post('/sites', async (req, res) => {
  try {
    const data = await proxyExternalPost('sites', req.body);
    res.json(data);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.post('/summary', async (req, res) => {
  try {
    const data = await proxyExternalPost('summary', req.body);
    res.json(data);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.post('/stable-intents', async (req, res) => {
  try {
    const data = await proxyExternalPost('stable-intents', req.body);
    res.json(data);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.post('/competitor-trends', async (req, res) => {
  try {
    const data = await proxyExternalPost('competitor-trends', req.body);
    res.json(data);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.post('/wiki-history', async (req, res) => {
  try {
    const data = await proxyExternalPost('wiki-history', req.body);
    res.json(data);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// 联想官网引用 URL Top10（固定项目143，2026-05-01累计）
router.post('/source-top10', async (req, res) => {
  try {
    const data = await proxyExternalPost('source-top10', req.body);
    res.json(data);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.post('/conversion', (req, res) => {
  res.status(501).json({
    code: 501,
    message: '待接口提供数据',
    data: null
  });
});

// 趋势折线图
router.get('/project-chart', async (req, res) => {
  try {
    const data = await proxyGet('/api/dashboard/project-chart', req.query);
    res.json(data);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// 信源分布
router.get('/source-distribution', async (req, res) => {
  try {
    const data = await proxyGet('/api/dashboard/source-distribution', req.query);
    res.json(data);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// 词云
router.get('/word-cloud', async (req, res) => {
  try {
    const data = await proxyGet('/api/dashboard/word-cloud', req.query);
    res.json(data);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;

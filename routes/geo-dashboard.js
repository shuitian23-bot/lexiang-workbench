const express = require('express');
const router = express.Router();
const https = require('https');

const BASE = 'https://ai.idianliang.com';
const CREDENTIALS = { username: '联想乐享', password: 'lianxiang' };

let cachedToken = null;
let tokenExpiry = 0;

async function getToken() {
  if (cachedToken && Date.now() < tokenExpiry) return cachedToken;
  const res = await fetchJSON(`${BASE}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(CREDENTIALS)
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
    headers: { Cookie: `token=${token}; uid=62` }
  });
}

// 外部API代理（overview等），替代nginx proxy
const EXT_BASE = 'https://api.dianliang.ai/api/external/geo';
const EXT_HEADERS = {
  'X-Client-Code': 'lenovo',
  'Authorization': 'Bearer 828c1e338a6297b45286ee676b8b8cfd',
  'Content-Type': 'application/json'
};

router.post('/overview', async (req, res) => {
  try {
    const data = await fetchJSON(`${EXT_BASE}/overview`, {
      method: 'POST',
      headers: EXT_HEADERS,
      body: JSON.stringify(req.body)
    });
    res.json(data);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.post('/questions', async (req, res) => {
  try {
    const data = await fetchJSON(`${EXT_BASE}/questions`, {
      method: 'POST',
      headers: EXT_HEADERS,
      body: JSON.stringify(req.body)
    });
    res.json(data);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.post('/sites', async (req, res) => {
  try {
    const data = await fetchJSON(`${EXT_BASE}/sites`, {
      method: 'POST',
      headers: EXT_HEADERS,
      body: JSON.stringify(req.body)
    });
    res.json(data);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
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

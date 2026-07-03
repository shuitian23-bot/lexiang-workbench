/**
 * API 封装层（对应原 workbench-data.js 中的各 fetch 调用）
 *
 * 统一处理：
 *   - 基础 URL（开发时通过 vite proxy 透传）
 *   - 错误抛出（HTTP 非 ok 时 throw，组件/store 中统一 catch）
 *   - JSON 序列化
 */

async function request(method, url, body) {
  const opts = {
    method,
    headers: { 'Content-Type': 'application/json' }
  }
  if (body !== undefined) opts.body = JSON.stringify(body)

  const res = await fetch(url, opts)
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`)
  return data
}

export const api = {
  get:    (url)         => request('GET', url),
  post:   (url, body)   => request('POST', url, body),
  patch:  (url, body)   => request('PATCH', url, body),
  put:    (url, body)   => request('PUT', url, body),
  delete: (url)         => request('DELETE', url)
}

// ===== 具体 API 函数（按模块分组，对应原各 workbench-*.js 中的 loadXxx 函数）=====

/** 员工管理 */
export const employeeApi = {
  getOverview:       ()         => api.get('/api/employee/overview'),
  getList:           (page, q)  => api.get(`/api/employee/list?page=${page}&q=${encodeURIComponent(q||'')}`)  ,
  getCertList:       (page)     => api.get(`/api/employee/certification?page=${page}`),
  approveCert:       (id)       => api.post(`/api/employee/certification/${id}/approve`),
  rejectCert:        (id, msg)  => api.post(`/api/employee/certification/${id}/reject`, { reason: msg })
}

/** 线索 / 企业客户 */
export const leadApi = {
  getDashboard:      ()         => api.get('/api/lead/dashboard'),
  getPool:           (page)     => api.get(`/api/lead/pool?page=${page}`),
  getScore:          ()         => api.get('/api/lead/score'),
  assignLead:        (id, uid)  => api.post(`/api/lead/${id}/assign`, { user_id: uid })
}

/** 运营看板 */
export const dashboardApi = {
  getOverview:       (range)    => api.get(`/api/dashboard/overview?range=${range||'7d'}`),
  getQueryAnalysis:  (page)     => api.get(`/api/pipeline/annotate?page=${page}`),
  getQuality:        ()         => api.get('/api/pipeline/quality'),
  getTraffic:        (range)    => api.get(`/api/ops/traffic?range=${range||'7d'}`),
  getGmv:            (range)    => api.get(`/api/ops/gmv?range=${range||'7d'}`)
}

/** GEO 看板 */
export const geoApi = {
  getOverview:       ()         => api.get('/api/geo/overview'),
  getSource:         ()         => api.get('/api/geo/source'),
  getIntent:         ()         => api.get('/api/geo/intent'),
  getConversion:     ()         => api.get('/api/geo/conversion'),
  uploadKnowledge:   (form)     => fetch('/api/geo/knowledge', { method: 'POST', body: form }).then(r => r.json())
}

/** Skill / Agent */
export const skillApi = {
  getGrouped:        ()         => api.get('/api/harness/skills/grouped'),
  toggle:            (name, en) => api.patch(`/api/admin/skills/${name}`, { enabled: en }),
  getRoles:          ()         => api.get('/api/harness/roles'),
  submitSkill:       (body)     => api.post('/api/harness/skills', body),
  getSkillDrafts:    ()         => api.get('/api/harness/skills/drafts')
}

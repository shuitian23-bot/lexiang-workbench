const express = require('express');
const crypto = require('crypto');
const db = require('../db/schema');
const { ingestText } = require('../knowledge/ingest');

const router = express.Router();

const CATEGORY_LABELS = {
  notebook: '笔记本',
  desktop: '台式机',
  monitor: '显示器',
  tablet_phone: '平板 / 手机',
  accessory: '配件 / 办公',
  smart_device: '智能设备',
  server: '服务器',
  workstation: '工作站',
  solution: '解决方案',
  service: '服务产品',
  knowledge: '技术支持 / 知识',
  brand_news: '品牌 / 新闻'
};
const CATEGORY_KEYS = new Set(Object.keys(CATEGORY_LABELS));
const STATUS_KEYS = new Set(['pending', 'approved', 'rejected', 'withdrawn']);

function apiError(res, status, error, details) {
  const body = { error };
  if (details && details.length) body.details = details;
  return res.status(status).json(body);
}

function authSupplier(req, res, next) {
  const key = String(req.get('X-Supplier-Key') || '').trim();
  if (!key) return apiError(res, 401, 'X-Supplier-Key 缺失');
  const supplier = db.prepare('SELECT * FROM supplier_api_keys WHERE api_key = ? AND enabled = 1').get(key);
  if (!supplier) return apiError(res, 401, 'X-Supplier-Key 无效或已停用');
  req.supplier = supplier;
  next();
}

function shanghaiDay() {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Shanghai' }).format(new Date());
}

function getUsage(supplierId) {
  const day = shanghaiDay();
  const row = db.prepare('SELECT used FROM supplier_daily_usage WHERE supplier_id = ? AND day = ?').get(supplierId, day);
  return { day, used: row?.used || 0 };
}

function bumpUsage(supplierId) {
  const day = shanghaiDay();
  db.prepare(`
    INSERT INTO supplier_daily_usage (supplier_id, day, used)
    VALUES (?, ?, 1)
    ON CONFLICT(supplier_id, day) DO UPDATE SET used = used + 1
  `).run(supplierId, day);
}

function parseAllowedCategories(raw) {
  if (!raw || raw === '*') return null;
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter(Boolean) : null;
  } catch {
    return String(raw).split(/[,，\s]+/).map(s => s.trim()).filter(Boolean);
  }
}

function validateUrl(value, field, requiredHttps = false) {
  if (!value) return null;
  try {
    const u = new URL(value);
    if (!['http:', 'https:'].includes(u.protocol)) return `${field} 必须是 http(s):// URL`;
    if (requiredHttps && u.protocol !== 'https:') return `${field} 必须是 https:// URL`;
    return null;
  } catch {
    return `${field} 必须是合法 URL`;
  }
}

function sanitizeMarkdown(input) {
  return String(input || '')
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<iframe[\s\S]*?<\/iframe>/gi, '')
    .replace(/\]\(\s*javascript:[^)]+\)/gi, '](#)')
    .replace(/<a\b([^>]*?)href\s*=\s*["']?\s*javascript:[^"'>\s]+["']?([^>]*)>/gi, '<a$1$2>');
}

function inferSummary(markdown) {
  const text = String(markdown || '')
    .replace(/!\[[^\]]*]\([^)]*\)/g, '')
    .replace(/\[[^\]]+]\([^)]*\)/g, '$1')
    .replace(/^#{1,6}\s+/gm, '')
    .replace(/[`*_>#|-]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
  return text.slice(0, 500);
}

function normalizeSubmissionBody(body, supplier) {
  const details = [];
  const b = body && typeof body === 'object' ? body : {};

  const external_id = b.external_id == null ? null : String(b.external_id).trim();
  if (external_id && external_id.length > 128) details.push('external_id 不能超过 128 字符');

  const title = String(b.title || '').trim();
  if (!title) details.push('title 必填');
  if (title.length > 200) details.push('title 不能超过 200 字符');

  const category = String(b.category || '').trim();
  if (!category) details.push('category 必填');
  else if (!CATEGORY_KEYS.has(category)) details.push(`category 不在白名单: ${Object.keys(CATEGORY_LABELS).join(', ')}`);

  const allowed = parseAllowedCategories(supplier.allowed_categories);
  if (category && allowed && !allowed.includes(category)) {
    details.push(`category ${category} 不在当前 supplier 可投分类白名单`);
  }

  const tags = b.tags == null ? [] : b.tags;
  if (!Array.isArray(tags)) details.push('tags 必须是数组');
  else if (tags.length > 20) details.push('tags 不能超过 20 项');
  const normalizedTags = Array.isArray(tags) ? tags.map(t => String(t).trim()).filter(Boolean).slice(0, 20) : [];

  const rawSummary = b.summary == null ? '' : String(b.summary).trim();
  if (rawSummary.length > 500) details.push('summary 不能超过 500 字符');

  const rawContent = b.content_md == null ? '' : String(b.content_md);
  if (!rawContent.trim()) details.push('content_md 必填');
  if (Buffer.byteLength(rawContent, 'utf8') > 200 * 1024) details.push('content_md 不能超过 200KB');
  const content_md = sanitizeMarkdown(rawContent);
  const summary = rawSummary || inferSummary(content_md);

  const source_url = b.source_url == null ? null : String(b.source_url).trim();
  const sourceErr = validateUrl(source_url, 'source_url');
  if (sourceErr) details.push(sourceErr);

  const images = b.images == null ? [] : b.images;
  if (!Array.isArray(images)) details.push('images 必须是数组');
  else if (images.length > 30) details.push('images 不能超过 30 项');
  const normalizedImages = [];
  if (Array.isArray(images)) {
    images.slice(0, 30).forEach((img, i) => {
      if (!img || typeof img !== 'object') {
        details.push(`images[${i}] 必须是对象`);
        return;
      }
      const url = String(img.url || '').trim();
      const err = validateUrl(url, `images[${i}].url`);
      if (!url) details.push(`images[${i}].url 必填`);
      else if (err) details.push(err);
      else normalizedImages.push({ url, alt: img.alt == null ? '' : String(img.alt).slice(0, 200) });
    });
  }

  const published_at = b.published_at == null ? null : String(b.published_at).trim();
  if (published_at && Number.isNaN(Date.parse(published_at))) details.push('published_at 必须是 ISO 8601 日期时间');

  return {
    valid: details.length === 0,
    details,
    data: {
      external_id,
      title,
      category,
      tags: normalizedTags,
      summary,
      content_md,
      content_hash: crypto.createHash('sha256').update(rawContent).digest('hex'),
      source_url,
      images: normalizedImages,
      published_at
    }
  };
}

function rowToDetail(row) {
  if (!row) return null;
  let tags = [];
  let images = [];
  try { tags = JSON.parse(row.tags_json || '[]'); } catch {}
  try { images = JSON.parse(row.images_json || '[]'); } catch {}
  return {
    id: row.id,
    external_id: row.external_id,
    title: row.title,
    category: row.category,
    tags,
    summary: row.summary,
    content_md: row.content_md,
    source_url: row.source_url,
    images,
    published_at: row.published_at,
    review_status: row.review_status,
    reviewer_note: row.reviewer_note,
    approved_doc_id: row.approved_doc_id,
    created_at: row.created_at,
    updated_at: row.updated_at,
    reviewed_at: row.reviewed_at
  };
}

function listFields(row) {
  return {
    id: row.id,
    external_id: row.external_id,
    title: row.title,
    category: row.category,
    review_status: row.review_status,
    reviewer_note: row.reviewer_note,
    approved_doc_id: row.approved_doc_id,
    created_at: row.created_at,
    updated_at: row.updated_at,
    reviewed_at: row.reviewed_at
  };
}

router.use(authSupplier);

router.get('/quota', (req, res) => {
  const quota = Number(req.supplier.quota_daily) || 50;
  const { used } = getUsage(req.supplier.id);
  res.json({ quota_daily: quota, used_today: used, remaining: Math.max(0, quota - used) });
});

router.post('/docs', async (req, res) => {
  const supplier = req.supplier;
  const normalized = normalizeSubmissionBody(req.body, supplier);
  if (!normalized.valid) {
    const status = normalized.details.some(d => d.includes('当前 supplier 可投分类白名单')) ? 403 : 400;
    return apiError(res, status, status === 403 ? '分类不在 supplier 白名单' : '请求体校验失败', normalized.details);
  }
  const item = normalized.data;

  const existing = item.external_id
    ? db.prepare('SELECT * FROM supplier_submissions WHERE supplier_id = ? AND external_id = ?').get(supplier.id, item.external_id)
    : null;

  if (existing && existing.content_hash === item.content_hash) {
    return res.json({
      submission_id: existing.id,
      review_status: existing.review_status,
      approved_doc_id: existing.approved_doc_id,
      action: 'unchanged'
    });
  }

  if (existing && existing.review_status === 'approved') {
    return apiError(res, 409, '已审通过的稿件不能覆盖更新，请使用新的 external_id 发布新版');
  }

  const quota = Number(supplier.quota_daily) || 50;
  const { used } = getUsage(supplier.id);
  if (used >= quota) return apiError(res, 429, '超出当日配额');

  let approvedDocId = null;
  const reviewStatus = existing ? 'pending' : (supplier.auto_approve === 0 ? 'pending' : 'approved');
  if (reviewStatus === 'approved') {
    const result = await ingestText(item.content_md, item.title, {
      source_type: 'supplier_markdown',
      source_url: item.source_url,
      filename: item.external_id ? `${item.external_id}.md` : null,
      content_limit: 200 * 1024
    });
    approvedDocId = result.docId;
  }

  const tagsJson = JSON.stringify(item.tags);
  const imagesJson = JSON.stringify(item.images);
  const action = existing ? 'updated' : 'created';

  const save = db.transaction(() => {
    bumpUsage(supplier.id);
    if (existing) {
      db.prepare(`
        UPDATE supplier_submissions
        SET title = ?, category = ?, tags_json = ?, summary = ?, content_md = ?, content_hash = ?,
            source_url = ?, images_json = ?, published_at = ?, review_status = ?, reviewer_note = NULL,
            approved_doc_id = ?, updated_at = CURRENT_TIMESTAMP,
            reviewed_at = CASE WHEN ? = 'approved' THEN CURRENT_TIMESTAMP ELSE NULL END
        WHERE id = ?
      `).run(
        item.title, item.category, tagsJson, item.summary, item.content_md, item.content_hash,
        item.source_url, imagesJson, item.published_at, reviewStatus, approvedDocId,
        reviewStatus, existing.id
      );
      return existing.id;
    }
    const info = db.prepare(`
      INSERT INTO supplier_submissions
        (supplier_id, external_id, title, category, tags_json, summary, content_md, content_hash,
         source_url, images_json, published_at, review_status, approved_doc_id, reviewed_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CASE WHEN ? = 'approved' THEN CURRENT_TIMESTAMP ELSE NULL END)
    `).run(
      supplier.id, item.external_id, item.title, item.category, tagsJson, item.summary, item.content_md,
      item.content_hash, item.source_url, imagesJson, item.published_at, reviewStatus, approvedDocId, reviewStatus
    );
    return info.lastInsertRowid;
  });

  const submissionId = save();
  res.status(action === 'created' ? 201 : 200).json({
    submission_id: submissionId,
    review_status: reviewStatus,
    approved_doc_id: approvedDocId,
    action
  });
});

router.get('/docs', (req, res) => {
  const page = Math.max(1, parseInt(req.query.page, 10) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 20));
  const status = req.query.status ? String(req.query.status) : '';
  if (status && !STATUS_KEYS.has(status)) return apiError(res, 400, '请求体校验失败', ['status 只能是 pending|approved|rejected|withdrawn']);

  const where = ['supplier_id = ?'];
  const params = [req.supplier.id];
  if (status) {
    where.push('review_status = ?');
    params.push(status);
  }
  const whereSql = where.join(' AND ');
  const total = db.prepare(`SELECT COUNT(*) AS n FROM supplier_submissions WHERE ${whereSql}`).get(...params).n;
  const items = db.prepare(`
    SELECT id, external_id, title, category, review_status, reviewer_note, approved_doc_id, created_at, updated_at, reviewed_at
    FROM supplier_submissions
    WHERE ${whereSql}
    ORDER BY updated_at DESC, id DESC
    LIMIT ? OFFSET ?
  `).all(...params, limit, (page - 1) * limit).map(listFields);
  res.json({ total, page, limit, items });
});

router.get('/docs/:id', (req, res) => {
  const row = db.prepare('SELECT * FROM supplier_submissions WHERE id = ? AND supplier_id = ?').get(req.params.id, req.supplier.id);
  if (!row) return apiError(res, 404, 'submission 不存在');
  res.json(rowToDetail(row));
});

router.delete('/docs/:id', (req, res) => {
  const row = db.prepare('SELECT * FROM supplier_submissions WHERE id = ? AND supplier_id = ?').get(req.params.id, req.supplier.id);
  if (!row) return apiError(res, 404, 'submission 不存在');
  if (row.review_status !== 'pending') return apiError(res, 409, '仅 pending 状态稿件可撤回');
  db.prepare(`
    UPDATE supplier_submissions
    SET review_status = 'withdrawn', updated_at = CURRENT_TIMESTAMP
    WHERE id = ? AND supplier_id = ?
  `).run(row.id, req.supplier.id);
  res.json({ success: true, submission_id: row.id, review_status: 'withdrawn' });
});

module.exports = router;

'use strict';

const express = require('express');
const session = require('express-session');
const crypto = require('node:crypto');
const { rateLimit } = require('express-rate-limit');
const { AccessError } = require('./service');

function createApp(service, { origin, cookieName = 'permission_lab_sid' }) {
  const url = new URL(origin);
  if (url.protocol !== 'http:' || !['127.0.0.1', 'localhost'].includes(url.hostname) || url.origin !== origin) throw new Error('测试页面必须是明确的本机 HTTP origin');
  const app = express();
  app.disable('x-powered-by');
  app.use((req, res, next) => {
    res.set({ 'Cache-Control': 'no-store', 'Referrer-Policy': 'no-referrer', 'X-Content-Type-Options': 'nosniff' });
    if (!['127.0.0.1', 'localhost'].includes(req.hostname)) return res.status(403).json({ error: '仅供本地隔离测试' });
    // No CORS. JSON + explicit header + fixed Origin protects cookie operations
    // from another site or another local application. GET never changes state.
    if (!['GET', 'HEAD'].includes(req.method)
      && (req.get('Origin') !== origin || req.get('X-Permission-Lab') !== '1' || !req.is('application/json'))) {
      return res.status(403).json({ error: '请求来源无效', code: 'INVALID_ORIGIN' });
    }
    next();
  });
  app.use(express.json({ limit: '32kb' }));
  app.use((req, res, next) => {
    if (req.method === 'POST' && (!req.body || typeof req.body !== 'object' || Array.isArray(req.body))) return res.status(400).json({ error: '请求格式无效', code: 'INVALID_INPUT' });
    next();
  });
  app.use(session({ name: cookieName, secret: crypto.randomBytes(32).toString('hex'), resave: false,
    saveUninitialized: false, cookie: { httpOnly: true, sameSite: 'strict', path: '/api', maxAge: 30 * 60000 } }));
  const actor = req => req.session.permissionIdentity;
  const workbench = req => {
    service.requireWorkbench(actor(req));
    if (req.session.permissionScope !== 'workbench') throw new AccessError(403, 'RELOGIN_REQUIRED', '审批已生效，请重新登录工作台');
  };
  const saveSession = req => new Promise((resolve, reject) => req.session.save(error => error ? reject(error) : resolve()));
  const regenerate = req => new Promise((resolve, reject) => req.session.regenerate(error => error ? reject(error) : resolve()));
  app.get('/api/permission-lab/health', (_req, res) => res.json({ mode: 'isolated-database', realEmail: false }));
  app.post('/api/admin/login', rateLimit({ windowMs: 60000, limit: 30, standardHeaders: true, legacyHeaders: false }), async (req, res) => {
    // Clear any previous identity even if this login fails.
    await regenerate(req);
    const identity = await service.authenticate(req.body.username, req.body.password, req.body.loginType);
    req.session.permissionIdentity = identity.username;
    req.session.permissionScope = identity.enabled && identity.workbenchAccess ? 'workbench' : 'request-only';
    await saveSession(req);
    if (!identity.enabled) return res.status(423).json({ code: 'ACCOUNT_DISABLED', error: '账号已禁用', identity });
    res.json({ success: true, username: identity.username, identity,
      next: identity.workbenchAccess ? 'workbench' : 'first-access' });
  });
  app.post('/api/admin/logout', async (req, res) => {
    await new Promise((resolve, reject) => req.session.destroy(error => error ? reject(error) : resolve()));
    res.clearCookie(cookieName, { path: '/api' }).json({ success: true });
  });
  app.get('/api/admin/me', (req, res) => {
    workbench(req);
    res.json(service.identity(actor(req)));
  });
  app.get('/api/harness/menu', (req, res) => { workbench(req); res.json(service.menu(actor(req))); });
  app.get('/api/permission-lab/identity', (req, res) => res.json(service.identity(actor(req))));
  app.get('/api/permission-lab/requests', (req, res) => res.json(service.list(actor(req))));
  app.post('/api/permission-lab/requests', (req, res) => res.json(service.submit(actor(req), req.body.kind, req.body)));
  app.get('/api/permission-lab/requests/:id', (req, res) => res.json(service.status(actor(req), req.params.id)));
  app.get('/api/permission-lab/requests/:id/mail', (req, res) => { workbench(req); res.json(service.mails(actor(req), req.params.id)); });
  app.post('/api/permission-lab/requests/:id/decision', (req, res) => { workbench(req); res.json(service.decide({ username: actor(req) }, req.params.id, req.body)); });
  app.get('/api/permission-lab/guest', (req, res) => res.json(service.guest(req.get('X-Approval-Token'))));
  app.post('/api/permission-lab/guest/:id/decision', (req, res) => res.json(service.decide({ token: req.get('X-Approval-Token') || 'invalid' }, req.params.id, req.body)));
  // Do not proxy unknown routes to the real backend.
  app.use((_req, res) => res.status(404).json({ error: '此接口不在隔离测试范围内', code: 'OUT_OF_SCOPE' }));
  app.use((error, _req, res, _next) => {
    const known = error instanceof AccessError;
    res.status(known ? error.status : error.type === 'entity.parse.failed' ? 400 : 500)
      .json({ error: known ? error.message : '请求处理失败，请检查本地服务', code: known ? error.code : 'REQUEST_FAILED' });
  });
  return app;
}

module.exports = { createApp };

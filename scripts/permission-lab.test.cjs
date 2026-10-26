'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { createDatabase, openDatabase } = require('../core/permission-lab/database');
const { createService, seedAccounts } = require('../core/permission-lab/service');
const { createApp } = require('../core/permission-lab/http');
const { loadCatalog } = require('../core/permission-lab/catalog');
const password = crypto.randomBytes(24).toString('hex');
const catalog = loadCatalog();
function fixture(t) {
  const { db, filename } = createDatabase();
  seedAccounts(db, { adminPassword: password, demoPassword: password });
  let time = Date.now();
  const service = createService(db, catalog, () => time);
  t.after(() => { if (db.open) db.close(); fs.unlinkSync(filename); fs.rmdirSync(path.dirname(filename)); });
  return { db, filename, service, advance: () => { time += 8 * 86400000; } };
}
const firstInput = () => ({ reason: '本地隔离测试', permissionSnapshot: {
  selectedRoleIds: ['product-op'], selectedFunctionPermissionIds: ['func.dashboard.view'],
  selectedDataPermissionIds: ['data.ops.region.north'], tenant: ['leaibot-cn'], businessApprover: 'zhangjq4'
} });
const decision = revision => ({ revision, decision: 'agree', opinion: '同意', ...(revision === 1 ? { organizations: ['乐享运营'] } : {}) });
const errorCode = code => error => error.code === code;

test('four account states use password authentication; manager has no login account', async t => {
  const { service, db } = fixture(t);
  assert.equal((await service.authenticate('admin', password, 'external')).systemAdmin, true);
  assert.deepEqual(service.menu('admin').permissions, ['*']);
  assert.equal((await service.authenticate('noaccess', password, 'adfs')).workbenchAccess, false);
  assert.throws(() => service.menu('noaccess'), errorCode('FORBIDDEN'));
  assert.equal((await service.authenticate('internal-disabled', password, 'adfs')).enabled, false);
  assert.throws(() => service.menu('internal-disabled'), errorCode('ACCOUNT_DISABLED'));
  await assert.rejects(service.authenticate('external-disabled', password, 'external'), errorCode('EXTERNAL_ACCOUNT_DISABLED'));
  await assert.rejects(service.authenticate('internal-disabled', 'incorrect', 'adfs'), errorCode('INVALID_CREDENTIALS'));
  await assert.rejects(service.authenticate('noaccess', password, 'external'), errorCode('INVALID_CREDENTIALS'));
  await assert.rejects(service.authenticate('poc-manager', password, 'adfs'), errorCode('INVALID_CREDENTIALS'));
  assert.equal(db.prepare("SELECT COUNT(*) n FROM accounts WHERE username='poc-manager'").get().n, 0);
});

test('only three non-admin lab accounts allow an empty password; identity and state checks remain enforced', async t => {
  const { service, db } = fixture(t);
  assert.equal((await service.authenticate(' NOACCESS ', '', 'adfs')).workbenchAccess, false);
  assert.equal((await service.authenticate('internal-disabled', undefined, 'internal')).enabled, false);
  await assert.rejects(service.authenticate('external-disabled', '', 'external'), errorCode('EXTERNAL_ACCOUNT_DISABLED'));
  for (const name of ['admin', 'poc-manager', 'unknown', 'noaccess-extra']) {
    await assert.rejects(service.authenticate(name, '', 'external'), errorCode('INVALID_CREDENTIALS'));
  }
  await assert.rejects(service.authenticate('admin', undefined, 'adfs'), errorCode('INVALID_CREDENTIALS'));
  await assert.rejects(service.authenticate('admin', 'incorrect', 'external'), errorCode('INVALID_CREDENTIALS'));
  await assert.rejects(service.authenticate('noaccess', '', 'external'), errorCode('INVALID_CREDENTIALS'));
  await assert.rejects(service.authenticate('external-disabled', '', 'adfs'), errorCode('INVALID_CREDENTIALS'));
  await assert.rejects(service.authenticate('noaccess', {}, 'adfs'), errorCode('INVALID_CREDENTIALS'));
  db.prepare("UPDATE accounts SET system_admin=1 WHERE username='noaccess'").run();
  await assert.rejects(service.authenticate('noaccess', '', 'adfs'), errorCode('INVALID_CREDENTIALS'));
  assert.equal((await service.authenticate('admin', password, 'external')).systemAdmin, true);
});

test('enable is deduplicated, one admin approval, preserves permission and remains enabled', t => {
  const { service, db } = fixture(t);
  const before = db.prepare("SELECT permissions FROM accounts WHERE username='internal-disabled'").get().permissions;
  const { request } = service.submit('internal-disabled', 'enable', { reason: '恢复业务工作' });
  assert.equal(service.submit('internal-disabled', 'enable', { reason: '重复点击' }).duplicate, true);
  assert.throws(() => service.decide({ username: 'noaccess' }, request.id, decision(0)), errorCode('FORBIDDEN'));
  const done = service.decide({ username: 'admin' }, request.id, decision(0));
  assert.equal(done.statusKey, 'done');
  assert.equal(service.identity('internal-disabled').enabled, true);
  assert.equal(db.prepare("SELECT permissions FROM accounts WHERE username='internal-disabled'").get().permissions, before);
  assert.throws(() => service.submit('internal-disabled', 'enable', { reason: '重复启用' }), errorCode('ALREADY_ENABLED'));
  assert.throws(() => service.decide({ username: 'admin' }, request.id, decision(0)), errorCode('STALE_APPROVAL'));
  assert.equal(service.identity('internal-disabled').enabled, true);
});

test('external account cannot self-enable; administrator can submit on behalf', t => {
  const { service } = fixture(t);
  assert.throws(() => service.submit('external-disabled', 'enable', { reason: '启用' }), errorCode('FORBIDDEN'));
  assert.throws(() => service.submit('noaccess', 'enable', { target: 'external-disabled', reason: '伪造身份' }), errorCode('FORBIDDEN'));
  const { request } = service.submit('admin', 'enable', { target: 'external-disabled', reason: '内部接口人代为申请' });
  service.decide({ username: 'admin' }, request.id, decision(0));
  assert.equal(service.identity('external-disabled').enabled, true);
});

test('first access: real database request → no-account manager → business owner → effective scope', t => {
  const { service, db } = fixture(t);
  const { request } = service.submit('noaccess', 'first-access', { ...firstInput(), applicantManager: 'admin', approver: 'admin' });
  assert.equal(request.approverItcode, 'poc-manager');
  assert.equal(service.submit('noaccess', 'first-access', firstInput()).request.id, request.id);
  assert.throws(() => service.decide({ username: 'admin' }, request.id, decision(0)), errorCode('FORBIDDEN'));
  assert.throws(() => service.mails('noaccess', request.id), errorCode('FORBIDDEN'));
  const mail = service.mails('admin', request.id)[0];
  assert.equal(service.guest(mail.token).state, 'ready');
  assert.throws(() => service.decide({ token: mail.token }, request.id, { ...decision(0), permissionSnapshot: { selectedRoleIds: ['admin'] } }), errorCode('IMMUTABLE_SCOPE'));
  service.decide({ token: mail.token }, request.id, decision(0));
  assert.equal(service.identity('noaccess').workbenchAccess, false);
  assert.equal(service.guest(mail.token).state, 'readonly');
  assert.throws(() => service.decide({ token: mail.token }, request.id, decision(0)), errorCode('STALE_APPROVAL'));
  const ownerMail = service.mails('admin', request.id)[1];
  const done = service.decide({ token: ownerMail.token }, request.id, decision(1));
  assert.equal(done.statusKey, 'done');
  assert.equal(service.identity('noaccess').workbenchAccess, true);
  assert.deepEqual(service.menu('noaccess').permissions, ['func.dashboard.view']);
  const saved = JSON.parse(db.prepare("SELECT scope FROM account_scope WHERE username='noaccess'").get().scope);
  assert.deepEqual(saved.selectedDataPermissionIds, ['data.ops.region.north']);
  assert.equal(db.prepare('SELECT COUNT(*) n FROM decisions WHERE request_id=?').get(request.id).n, 2);
});

test('invalid/expired grants, scope escalation, rejection and stale revision fail closed', t => {
  const { service, advance } = fixture(t);
  const bad = firstInput(); bad.permissionSnapshot.selectedRoleIds = ['admin'];
  assert.throws(() => service.submit('noaccess', 'first-access', bad), errorCode('INVALID_SCOPE'));
  const functions = firstInput(); functions.permissionSnapshot.selectedFunctionPermissionIds = ['*'];
  assert.throws(() => service.submit('noaccess', 'first-access', functions), errorCode('INVALID_SCOPE'));
  assert.throws(() => service.submit('noaccess', 'first-access', { ...firstInput(), target: 'admin' }), errorCode('FORBIDDEN'));
  const { request } = service.submit('noaccess', 'first-access', firstInput());
  const mail = service.mails('admin', request.id)[0];
  assert.throws(() => service.guest('forged'), errorCode('INVALID_LINK'));
  assert.throws(() => service.decide({ token: mail.token }, request.id, decision(99)), errorCode('STALE_APPROVAL'));
  service.decide({ token: mail.token }, request.id, { revision: 0, decision: 'reject', opinion: '信息不全' });
  assert.equal(service.identity('noaccess').workbenchAccess, false);
  assert.equal(service.status('noaccess', request.id).statusKey, 'rejected');
  advance();
  assert.throws(() => service.guest(mail.token), errorCode('EXPIRED_LINK'));
  assert.throws(() => service.decide({ token: mail.token }, request.id, decision(0)), errorCode('EXPIRED_LINK'));
});

test('database restart preserves requests, account state and audit without 20-row truncation', t => {
  const { service, db, filename } = fixture(t);
  for (let i = 0; i < 25; i++) {
    const { request } = service.submit('internal-disabled', 'enable', { reason: '测试记录保留' });
    service.decide({ username: 'admin' }, request.id, { revision: 0, decision: 'reject' });
  }
  const { request } = service.submit('internal-disabled', 'enable', { reason: '现在批准' });
  service.decide({ username: 'admin' }, request.id, decision(0));
  db.close();
  const reopened = openDatabase(filename).db;
  try {
    const restored = createService(reopened, catalog);
    assert.equal(restored.list('admin').length, 26);
    assert.equal(restored.identity('internal-disabled').enabled, true);
    assert.equal(restored.status('admin', request.id).approvalLogs.length, 2);
  } finally { reopened.close(); }
  assert.throws(() => openDatabase(path.join(path.dirname(filename), 'lexiang.db')));
});

test('a guest token cannot approve a different request or change non-business ownership', t => {
  const { service } = fixture(t);
  const first = service.submit('noaccess', 'first-access', firstInput()).request;
  const enable = service.submit('internal-disabled', 'enable', { reason: '启用' }).request;
  const mail = service.mails('admin', first.id)[0];
  assert.throws(() => service.decide({ token: mail.token }, enable.id, decision(0)), errorCode('STALE_APPROVAL'));
  assert.throws(() => service.decide({ token: mail.token }, first.id, { ...decision(0), organizations: ['乐享运营'] }), errorCode('IMMUTABLE_SCOPE'));
  assert.equal(service.status('noaccess', first.id).approvalRevision, 0);
  assert.throws(() => service.status('internal-disabled', first.id), errorCode('FORBIDDEN'));
});

test('failure at final execution rolls back decision, token consumption and account changes', t => {
  const { service, db } = fixture(t);
  const { request } = service.submit('noaccess', 'first-access', firstInput());
  service.decide({ token: service.mails('admin', request.id)[0].token }, request.id, decision(0));
  const token = service.mails('admin', request.id)[1].token;
  assert.throws(() => service.decide({ token }, request.id, { revision: 1, decision: 'agree' }), errorCode('INVALID_ORGANIZATIONS'));
  db.prepare("UPDATE accounts SET enabled=0 WHERE username='noaccess'").run();
  assert.throws(() => service.decide({ token }, request.id, decision(1)), errorCode('ACCOUNT_DISABLED'));
  assert.equal(service.status('admin', request.id).approvalRevision, 1);
  assert.equal(service.guest(token).state, 'ready');
  assert.equal(db.prepare('SELECT COUNT(*) n FROM decisions WHERE request_id=?').get(request.id).n, 1);
  assert.equal(service.identity('noaccess').workbenchAccess, false);
});

test('tenant-only access never becomes wildcard; server preserves inherited custom rules', t => {
  const { service, db } = fixture(t);
  const input = firstInput();
  input.permissionSnapshot.selectedRoleIds = ['bpo-collab'];
  input.permissionSnapshot.customDataRules = [{ logic: 'OR', rowFieldIds: ['nationwide'] }];
  const { request } = service.submit('noaccess', 'first-access', input);
  assert.equal(request.permissionSnapshot.customDataRules[0].logic, 'AND');
  assert.deepEqual(request.permissionSnapshot.customDataRules[0].rowFieldIds, ['south']);
  // Reject and resubmit a tenant-only request, allowed by the existing form.
  service.decide({ token: service.mails('admin', request.id)[0].token }, request.id, { revision: 0, decision: 'reject' });
  const tenantOnly = service.submit('noaccess', 'first-access', { permissionSnapshot: { tenant: ['leaibot-cn'], businessApprover: 'zhangjq4' } }).request;
  service.decide({ token: service.mails('admin', tenantOnly.id)[0].token }, tenantOnly.id, decision(0));
  service.decide({ token: service.mails('admin', tenantOnly.id)[1].token }, tenantOnly.id, decision(1));
  assert.deepEqual(service.menu('noaccess').permissions, ['workbench:access']);
  assert.equal(db.prepare("SELECT system_admin FROM accounts WHERE username='noaccess'").get().system_admin, 0);
  assert.throws(() => service.requireWorkbench('noaccess', true), errorCode('FORBIDDEN'));
});

test('HTTP restricted identity cannot access admin APIs; CSRF and unknown routes rejected', async t => {
  const { service } = fixture(t);
  const origin = 'http://127.0.0.1:5180';
  const app = createApp(service, { origin });
  const server = app.listen(0, '127.0.0.1');
  await new Promise(resolve => server.once('listening', resolve));
  t.after(() => { server.closeAllConnections(); server.close(); });
  const base = `http://127.0.0.1:${server.address().port}`;
  let cookie = '';
  async function call(url, body, extra = {}) {
    const response = await fetch(base + url, { method: body ? 'POST' : 'GET', headers: {
      Origin: origin, 'Content-Type': 'application/json', 'X-Permission-Lab': '1', Cookie: cookie, ...extra
    }, body: body ? JSON.stringify(body) : undefined });
    const setCookie = response.headers.get('set-cookie');
    if (setCookie) cookie = setCookie.split(';')[0];
    return { status: response.status, body: await response.json(), setCookie };
  }
  assert.equal((await call('/api/admin/login', { username: 'admin', password }, { Origin: 'https://other.example' })).status, 403);
  const disabled = await call('/api/admin/login', { username: 'internal-disabled', password, loginType: 'adfs' });
  assert.equal(disabled.status, 423);
  assert.match(disabled.setCookie, /permission_lab_sid=/);
  assert.equal((await call('/api/admin/me')).status, 423);
  assert.equal((await call('/api/harness/menu')).status, 423);
  const submission = await call('/api/permission-lab/requests', { kind: 'enable', reason: '正常申请' });
  assert.equal(submission.status, 200);
  service.decide({ username: 'admin' }, submission.body.request.id, decision(0));
  assert.equal((await call('/api/admin/me')).body.code, 'RELOGIN_REQUIRED');
  assert.equal((await call('/api/admin/users')).status, 404);
  assert.equal((await call('/api/admin/login', { username: 'admin', password })).status, 200);
  assert.equal((await call('/api/admin/me')).body.username, 'admin');
  assert.deepEqual((await call('/api/harness/menu')).body.permissions, ['*']);
  assert.equal((await call('/api/admin/login', { username: 'admin', password: 'wrong' })).status, 401);
  assert.equal((await call('/api/admin/me')).status, 401);
  assert.equal((await call('/api/admin/login', ['invalid'])).status, 400);
});

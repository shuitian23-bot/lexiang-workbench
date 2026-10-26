'use strict';

const crypto = require('node:crypto');
const bcrypt = require('bcrypt');
const BUSINESS_OWNERS = ['zhangjq4', 'huangjq5', 'zhangxy43', 'zhangrui32', 'zhangyi44'];
const ORGANIZATIONS = ['乐享运营', '平台运营', '商用业务运营', '系统管理', '外部协作', 'GEO 看板', '企业客户管理', '搜索后台'];
const EXTERNAL_DISABLED = '当前账号已被禁用，请联系对应的联想业务接口人申请启用。';
// This service is used only by the loopback-only, isolated database lab.
const PASSWORDLESS_DEMO_ACCOUNTS = new Set(['noaccess', 'internal-disabled', 'external-disabled']);
const hash = value => crypto.createHash('sha256').update(value).digest('hex');
const nodeLabels = { 'system-admin': '系统管理员审批', 'applicant-manager': '申请人直线经理审批', business: '业务负责人审批', done: '执行完成', rejected: '已驳回' };
class AccessError extends Error {
  constructor(status, code, message) { super(message); this.status = status; this.code = code; }
}
const fail = (status, code, message) => { throw new AccessError(status, code, message); };
function text(value, label, max = 2000) {
  if (typeof value !== 'string' || !value.trim() || value.length > max) fail(400, 'INVALID_INPUT', `${label}未填写或过长`);
  return value.trim();
}

function seedAccounts(db, { adminPassword, demoPassword }) {
  if (!adminPassword || !demoPassword || adminPassword.length < 12 || demoPassword.length < 12) throw new Error('隔离库管理员和演示密码须至少 12 位，由启动环境提供');
  if (db.prepare('SELECT COUNT(*) AS n FROM identities').get().n) throw new Error('已有数据，禁止重复初始化或重置');
  const adminHash = bcrypt.hashSync(adminPassword, 12);
  const demoHash = bcrypt.hashSync(demoPassword, 12);
  db.transaction(() => {
    const identity = db.prepare('INSERT INTO identities VALUES (?,?,?,?)');
    for (const username of ['poc-manager', ...BUSINESS_OWNERS]) identity.run(username, 'internal', `${username}@example.invalid`, null);
    for (const username of ['admin', 'noaccess', 'internal-disabled', 'external-disabled']) {
      identity.run(username, username === 'external-disabled' ? 'external' : 'internal', `${username}@example.invalid`, 'poc-manager');
    }
    const account = db.prepare('INSERT INTO accounts VALUES (?,?,?,?,?,?)');
    account.run('admin', adminHash, 1, 1, 1, JSON.stringify(['*']));
    account.run('noaccess', demoHash, 1, 0, 0, '[]');
    account.run('internal-disabled', demoHash, 0, 1, 0, JSON.stringify(['func.dashboard.view']));
    account.run('external-disabled', demoHash, 0, 1, 0, JSON.stringify(['func.dashboard.view']));
  })();
}

function createService(db, catalog, clock = Date.now) {
  const now = () => new Date(clock()).toISOString();
  const principal = username => db.prepare(`SELECT a.*, i.person_type, i.email, i.manager
    FROM accounts a JOIN identities i USING(username) WHERE a.username=?`).get(username || '');
  function requirePrincipal(username) {
    const account = principal(username);
    if (!account) fail(401, 'UNAUTHENTICATED', '请重新登录');
    return account;
  }
  function requireWorkbench(username, adminOnly = false) {
    const account = requirePrincipal(username);
    if (!account.enabled) fail(423, 'ACCOUNT_DISABLED', '账号已禁用');
    if (!account.workbench_access || (adminOnly && !account.system_admin)) fail(403, 'FORBIDDEN', '无权执行此操作');
    return account;
  }
  function publicIdentity(account) {
    return { username: account.username, personType: account.person_type, manager: account.manager, systemApprover: 'admin',
      enabled: !!account.enabled, workbenchAccess: !!account.workbench_access, systemAdmin: !!account.system_admin };
  }
  async function authenticate(username, password, loginType) {
    if (typeof username !== 'string' || username.length > 100
      || (password !== undefined && (typeof password !== 'string' || password.length > 256))) fail(401, 'INVALID_CREDENTIALS', '用户名或密码错误');
    const account = principal(username.trim().toLowerCase());
    const passwordless = account && !account.system_admin && PASSWORDLESS_DEMO_ACCOUNTS.has(account.username)
      && (password === undefined || password === '');
    const dummyHash = db.prepare("SELECT password_hash FROM accounts WHERE username='admin'").get().password_hash;
    const valid = passwordless || await bcrypt.compare(password || '', account?.password_hash || dummyHash);
    if (!account || !valid) fail(401, 'INVALID_CREDENTIALS', '用户名或密码错误');
    const fresh = requirePrincipal(account.username);
    const expectedType = loginType === 'adfs' || loginType === 'internal' ? 'internal' : 'external';
    if (!fresh.system_admin && expectedType !== fresh.person_type) fail(401, 'INVALID_CREDENTIALS', '用户名或密码错误');
    if (!fresh.enabled && fresh.person_type === 'external') fail(423, 'EXTERNAL_ACCOUNT_DISABLED', EXTERNAL_DISABLED);
    return publicIdentity(fresh);
  }
  function identity(username) { return publicIdentity(requirePrincipal(username)); }
  function menu(username) {
    const account = requireWorkbench(username);
    const permissions = JSON.parse(account.permissions);
    return { username: account.username, role: account.system_admin ? 'admin' : 'user', permissions: permissions.length ? permissions : ['workbench:access'], menus: account.system_admin ? ['dashboard', 'geo', 'employee', 'lead', 'order', 'advertising', 'reviews'] : [] };
  }
  function validateScope(input) {
    if (!input || typeof input !== 'object') fail(400, 'INVALID_SCOPE', '请选择权限范围');
    const ids = (field, allowed) => {
      const values = input[field] || [];
      if (!Array.isArray(values) || values.length > 100 || values.some(id => typeof id !== 'string' || !allowed.includes(id))) fail(400, 'INVALID_SCOPE', `权限范围无效：${field}`);
      return [...new Set(values)];
    };
    const roleIds = ids('selectedRoleIds', catalog.roles.filter(role => role.id !== 'admin').map(role => role.id));
    const copySource = input.copiedFromItcode ? catalog.copyableUsers.find(user => user.itcode === input.copiedFromItcode) : null;
    if (input.copiedFromItcode && !copySource) fail(400, 'INVALID_SCOPE', '权限复制来源无效');
    const copiedRoleIds = ids('copiedRoleIds', copySource?.roleIds.filter(id => id !== 'admin') || []);
    const allRoles = [...new Set([...roleIds, ...copiedRoleIds])];
    if (catalog.detectCustomDataRoleConflicts(catalog.roles.filter(role => allRoles.includes(role.id))).length) fail(400, 'CONFLICTING_SCOPE', '所选角色包含冲突的自定义数据权限');
    const availableFunctions = catalog.roles.filter(role => allRoles.includes(role.id)).flatMap(role => role.functionIds);
    const functions = ids('selectedFunctionPermissionIds', availableFunctions);
    const data = ids('selectedDataPermissionIds', catalog.dataPermissions.map(item => item.id));
    const tenant = ids('tenant', catalog.tenantOptions.map(item => typeof item === 'string' ? item : item.value));
    if (!tenant.length) fail(400, 'INVALID_SCOPE', '请选择所属租户');
    if (!BUSINESS_OWNERS.includes(input.businessApprover)) fail(400, 'INVALID_APPROVER', '请选择一位业务负责人');
    return { selectedRoleIds: roleIds, copiedRoleIds, copiedFromItcode: copySource?.itcode || '', selectedFunctionPermissionIds: functions,
      selectedDataPermissionIds: data, manualDataPermissionIds: data, tenant, businessApprover: input.businessApprover,
      customDataRules: catalog.roles.filter(role => allRoles.includes(role.id)).flatMap(role => role.customDataRules || []) };
  }
  function issueMail(row) {
    const hasAccount = !!db.prepare('SELECT 1 FROM accounts WHERE username=?').get(row.approver);
    let token = null;
    if (!hasAccount && ['applicant-manager', 'business'].includes(row.node)) {
      token = crypto.randomBytes(32).toString('base64url');
      db.prepare('INSERT INTO mail_grants VALUES (?,?,?,?,?,?,0)').run(hash(token), row.id, row.approver, row.node, row.revision, clock() + 7 * 86400000);
    }
    db.prepare('INSERT INTO mock_mail (request_id,recipient,node,token,created_at) VALUES (?,?,?,?,?)').run(row.id, row.approver, row.node, token, now());
  }
  function readRow(id) {
    const row = db.prepare('SELECT * FROM requests WHERE id=?').get(id || '');
    if (!row) fail(404, 'NOT_FOUND', '未找到申请');
    return row;
  }
  function view(row) {
    const payload = JSON.parse(row.payload);
    const events = db.prepare('SELECT * FROM decisions WHERE request_id=? ORDER BY revision').all(row.id);
    const approvalLogs = [{ node: '申请提交', action: 'submit', operator: row.applicant, opinion: payload.reason, time: row.created_at },
      ...events.map(event => ({ node: '审批处理', action: event.decision, operator: event.actor, opinion: event.opinion, time: event.created_at }))];
    return { ...payload, id: row.id, source: row.kind, typeKey: row.kind === 'enable' ? 'enable' : 'change',
      type: row.kind === 'enable' ? '启用账号' : '首次访问权限', applicant: row.applicant, applicantItcode: row.applicant,
      target: row.target, targetItcode: row.target, statusKey: row.status, status: row.status === 'pending' ? '待我审批' : nodeLabels[row.status],
      nodeType: row.node, node: nodeLabels[row.node], approverItcode: row.approver, handlers: [row.approver],
      approvalRevision: row.revision, time: row.created_at, approvalLogs,
      logs: approvalLogs.map(log => ({ node: log.node, detail: log.opinion, time: log.time })) };
  }
  const submit = db.transaction((username, kind, input) => {
    const account = requirePrincipal(username);
    if (!['first-access', 'enable'].includes(kind)) fail(400, 'INVALID_TYPE', '申请类型无效');
    let target = account;
    if (input.target && input.target !== username) {
      requireWorkbench(username, true);
      if (kind !== 'enable') fail(403, 'FORBIDDEN', '不能代为申请首次访问');
      target = requirePrincipal(input.target);
    }
    if (kind === 'enable') {
      if (target.enabled) fail(409, 'ALREADY_ENABLED', '账号已经启用，无需再次申请');
      if (target.person_type === 'external' && !account.system_admin) fail(403, 'FORBIDDEN', EXTERNAL_DISABLED);
    } else if (!account.enabled || account.person_type !== 'internal' || account.workbench_access) {
      fail(403, 'FORBIDDEN', '当前账号不能提交首次权限申请');
    }
    const reason = kind === 'first-access' && !input.reason ? '未填写' : text(input.reason, '申请原因');
    const scope = kind === 'first-access' ? validateScope(input.permissionSnapshot) : {};
    const existing = db.prepare("SELECT * FROM requests WHERE kind=? AND target=? AND status='pending'").get(kind, target.username);
    if (existing) return { request: view(existing), duplicate: true };
    const row = { id: `AP-${crypto.randomUUID()}`, kind, target: target.username, applicant: username, status: 'pending',
      node: kind === 'enable' ? 'system-admin' : 'applicant-manager', approver: kind === 'enable' ? 'admin' : account.manager, revision: 0 };
    if (!row.approver) fail(400, 'MISSING_MANAGER', '目录中未配置直线经理');
    const payload = { reason, personType: target.person_type, applicantPersonType: account.person_type,
      applicantManager: account.manager, targetManager: target.manager, systemApprover: 'admin',
      businessOwners: kind === 'first-access' ? [scope.businessApprover] : [], businessApprover: scope.businessApprover || '',
      mobile: kind === 'first-access' && input.mobile ? text(input.mobile, '手机号', 50) : '',
      email: kind === 'first-access' && input.email ? text(input.email, '邮箱', 254) : target.email,
      businessInfo: { tenant: scope.tenant || [], organizations: [] }, permissionSnapshot: scope };
    db.prepare('INSERT INTO requests VALUES (?,?,?,?,?,?,?,?,?,?)').run(row.id, kind, row.target, username, row.status, row.node, row.approver, 0, JSON.stringify(payload), now());
    issueMail(row);
    return { request: view(readRow(row.id)), duplicate: false };
  });
  function list(username) {
    const account = requirePrincipal(username);
    const rows = account.enabled && account.workbench_access && account.system_admin
      ? db.prepare('SELECT * FROM requests ORDER BY created_at DESC').all()
      : db.prepare('SELECT * FROM requests WHERE applicant=? OR (approver=? AND ?=1 AND ?=1) ORDER BY created_at DESC').all(username, username, account.enabled, account.workbench_access);
    return rows.map(view);
  }
  function status(username, id) {
    const row = readRow(id);
    const account = requirePrincipal(username);
    if (row.applicant !== username && !(account.enabled && account.workbench_access && account.system_admin) && row.approver !== username) fail(403, 'FORBIDDEN', '无权查看此申请');
    return view(row);
  }
  function grant(token) {
    if (typeof token !== 'string' || token.length < 40 || token.length > 100) fail(403, 'INVALID_LINK', '审批链接无效');
    const item = db.prepare('SELECT * FROM mail_grants WHERE token_hash=?').get(hash(token));
    if (!item) fail(403, 'INVALID_LINK', '审批链接无效');
    if (item.expires_at <= clock()) fail(410, 'EXPIRED_LINK', '审批链接已过期');
    return item;
  }
  function guest(token) {
    const item = grant(token);
    const row = readRow(item.request_id);
    const ready = !item.used && row.status === 'pending' && row.node === item.node && row.approver === item.approver && row.revision === item.revision;
    return { request: view(row), state: ready ? 'ready' : 'readonly', approver: item.approver, identity: item.node };
  }
  const decide = db.transaction(({ username, token }, id, input) => {
    const row = readRow(id);
    let actor;
    if (token) {
      const item = grant(token);
      if (item.request_id !== id || item.node !== row.node || item.approver !== row.approver || item.used || item.revision !== row.revision) fail(409, 'STALE_APPROVAL', '当前审批节点已变化或已处理');
      actor = item.approver;
    } else {
      requireWorkbench(username);
      if (row.approver !== username) fail(403, 'FORBIDDEN', '您不是当前审批人');
      actor = username;
    }
    if (row.status !== 'pending' || input.revision !== row.revision) fail(409, 'STALE_APPROVAL', '申请已更新，请刷新后再操作');
    if (!['agree', 'reject'].includes(input.decision)) fail(400, 'INVALID_DECISION', '请选择审批结果');
    if (Object.keys(input).some(key => !['revision', 'decision', 'opinion', 'organizations'].includes(key))) fail(400, 'IMMUTABLE_SCOPE', '此入口不能修改申请内容');
    const opinion = input.opinion == null || input.opinion === '' ? '无补充意见' : text(input.opinion, '审批意见');
    const payload = JSON.parse(row.payload);
    if (row.node === 'business' && input.decision === 'agree') {
      if (!Array.isArray(input.organizations) || !input.organizations.length || input.organizations.some(org => !ORGANIZATIONS.includes(org))) fail(400, 'INVALID_ORGANIZATIONS', '请选择有效的所属组织');
      payload.businessInfo.organizations = [...new Set(input.organizations)];
    } else if (input.organizations?.length) fail(400, 'IMMUTABLE_SCOPE', '当前节点不能修改业务归属');
    db.prepare('INSERT INTO decisions VALUES (?,?,?,?,?,?)').run(id, row.revision, actor, input.decision, opinion, now());
    db.prepare('UPDATE mail_grants SET used=1 WHERE request_id=? AND revision=?').run(id, row.revision);
    if (input.decision === 'reject') { row.status = 'rejected'; row.node = 'rejected'; }
    else if (row.node === 'applicant-manager') { row.node = 'business'; row.approver = payload.businessApprover; }
    else {
      if (row.kind === 'enable') {
        db.prepare('UPDATE accounts SET enabled=1 WHERE username=?').run(row.target);
      } else {
        const target = requirePrincipal(row.target);
        if (!target.enabled) fail(409, 'ACCOUNT_DISABLED', '账号已被禁用，请先完成启用流程');
        const permissions = [...new Set([...JSON.parse(target.permissions), ...payload.permissionSnapshot.selectedFunctionPermissionIds])];
        db.prepare('UPDATE accounts SET workbench_access=1, permissions=? WHERE username=?').run(JSON.stringify(permissions), row.target);
        db.prepare('INSERT INTO account_scope VALUES (?,?,?,?) ON CONFLICT(username) DO UPDATE SET request_id=excluded.request_id, scope=excluded.scope, updated_at=excluded.updated_at')
          .run(row.target, id, JSON.stringify({ ...payload.permissionSnapshot, organizations: payload.businessInfo.organizations }), now());
      }
      row.status = 'done'; row.node = 'done';
    }
    row.revision += 1;
    db.prepare('UPDATE requests SET status=?,node=?,approver=?,revision=?,payload=? WHERE id=?').run(row.status, row.node, row.approver, row.revision, JSON.stringify(payload), id);
    if (row.status === 'pending') issueMail(row);
    return view(readRow(id));
  });
  function mails(username, id) {
    requireWorkbench(username, true);
    readRow(id);
    return db.prepare('SELECT recipient,node,token,created_at FROM mock_mail WHERE request_id=? ORDER BY id').all(id);
  }
  return { authenticate, identity, menu, submit, list, status, guest, decide, mails, requireWorkbench };
}

module.exports = { createService, seedAccounts, AccessError, BUSINESS_OWNERS };

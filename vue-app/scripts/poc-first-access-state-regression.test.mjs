import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'
import ts from 'typescript'

async function service(name) {
  const source = readFileSync(new URL('../src/services/' + name + '.ts', import.meta.url), 'utf8')
  const { outputText } = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext } })
  return import('data:text/javascript;base64,' + Buffer.from(outputText).toString('base64'))
}
const { resolvePocLogin, POC_EXTERNAL_PASSWORD } = await service('pocExternalLogin')
const { scopedDemoStorage } = await service('pocIsolation')
const approvalsKey = 'leaibot-approval-mail-mock-rows'
// Final persisted shape from the existing first-access approval flow.
const completed = {
  id: 'PA-first-access-completed', source: 'first-access', typeKey: 'change',
  applicantItcode: 'noaccess', targetItcode: 'noaccess', personType: 'internal', applicantPersonType: 'internal',
  statusKey: 'done', nodeType: 'done', status: '已完成',
  businessApprovalTasks: [{ approver: 'zhangjq4', status: 'approved', organizations: ['乐享运营'] }],
  approvalLogs: [{ node: '系统执行结果', action: 'execute-success', operator: 'system', opinion: '执行结果：成功。' }]
}
const noRead = () => { throw new Error('This login must not read browser approval state') }
function login(rows, username = 'noaccess') {
  return resolvePocLogin(username, POC_EXTERNAL_PASSWORD, 'internal', true, () => '[]', () => JSON.stringify(rows))
}

test('first-access login becomes active only after final execution is persisted', () => {
  assert.equal(login([completed]), 'active')
  assert.equal(login([null, { id: 'unrelated' }, completed], ' NOACCESS '), 'active')
})
test('an unapproved first-access fixture remains at first access', () => {
  for (const rows of [[], [null], [{ ...completed, statusKey: 'pending' }], [{ ...completed, statusKey: 'rejected' }],
    [{ ...completed, nodeType: 'applicant-manager' }], [{ ...completed, nodeType: 'business' }],
    [{ ...completed, statusKey: undefined, nodeType: undefined, status: '执行完成' }]]) {
    assert.equal(login(rows), 'no-access')
  }
})
test('another applicant or target cannot grant the fixture access', () => {
  for (const changes of [{ applicantItcode: 'other' }, { targetItcode: 'other' }, { applicantItcode: undefined },
    { targetItcode: undefined }, { personType: 'external' }, { applicantPersonType: 'external' }]) {
    assert.equal(login([{ ...completed, ...changes }]), 'no-access')
  }
})
test('only first-access permission changes resolve a first-access login', () => {
  for (const changes of [{ source: 'user-management' }, { source: undefined }, { typeKey: 'enable' },
    { typeKey: 'disable' }, { typeKey: 'create' }, { typeKey: undefined }]) {
    assert.equal(login([{ ...completed, ...changes }]), 'no-access')
  }
})
test('done flags without successful system execution do not grant access', () => {
  for (const approvalLogs of [undefined, [], [{ action: 'agree', operator: 'system' }],
    [{ action: 'execute-failed', operator: 'system' }], [{ action: 'execute-success', operator: 'noaccess' }]]) {
    assert.equal(login([{ ...completed, approvalLogs }]), 'no-access')
  }
})
test('incomplete business approvals are not final execution', () => {
  for (const businessApprovalTasks of [undefined, [], [{ status: 'pending' }], [{ status: 'rejected' }],
    [{ status: 'approved' }, { status: 'pending' }]]) {
    assert.equal(login([{ ...completed, businessApprovalTasks }]), 'no-access')
  }
})
test('a newer pending or rejected application does not revoke an executed demo grant', () => {
  assert.equal(login([{ ...completed, id: 'new-pending', statusKey: 'pending' }, completed]), 'active')
  assert.equal(login([{ ...completed, id: 'new-rejected', statusKey: 'rejected' }, completed]), 'active')
})
test('malformed or unreadable approval storage fails closed', () => {
  for (const raw of ['broken-json', '{}', 'null']) {
    assert.throws(() => resolvePocLogin('noaccess', POC_EXTERNAL_PASSWORD, 'internal', true, () => '[]', () => raw))
  }
  assert.throws(() => resolvePocLogin('noaccess', POC_EXTERNAL_PASSWORD, 'internal', true, () => '[]',
    () => { throw new Error('unreadable approval storage') }), /unreadable approval storage/)
})
test('approval lookup uses only the caller scoped POC namespace', () => {
  const values = new Map([[approvalsKey, JSON.stringify([completed])]])
  const storage = { getItem: key => values.get(key) ?? null, setItem: (key, value) => values.set(key, value), removeItem: key => values.delete(key) }
  const demo = scopedDemoStorage(() => storage, true)
  const run = () => resolvePocLogin('noaccess', POC_EXTERNAL_PASSWORD, 'internal', true, () => '[]', () => demo.getItem(approvalsKey))
  assert.equal(run(), 'no-access', 'Ordinary records cannot unlock the POC identity')
  demo.setItem(approvalsKey, JSON.stringify([completed]))
  assert.equal(run(), 'active')
  assert.equal(values.get(approvalsKey), JSON.stringify([completed]), 'Ordinary records stay unchanged')
})
test('server authentication and real accounts never read first-access browser state', () => {
  assert.equal(resolvePocLogin('noaccess', POC_EXTERNAL_PASSWORD, 'internal', false, noRead, noRead), null)
  assert.equal(resolvePocLogin('ordinary-user', POC_EXTERNAL_PASSWORD, 'internal', true, noRead, noRead), null)
  assert.equal(resolvePocLogin('admin', POC_EXTERNAL_PASSWORD, 'external', true, noRead, noRead), null)
})
test('password and login-type checks precede first-access storage reads', () => {
  assert.equal(resolvePocLogin('noaccess', 'wrong', 'internal', true, noRead, noRead), 'invalid-password')
  assert.equal(resolvePocLogin('noaccess', POC_EXTERNAL_PASSWORD, 'external', true, noRead, noRead), 'wrong-login-type')
})
test('existing active and disabled fixtures keep their original state sources', () => {
  assert.equal(resolvePocLogin('internal-active', POC_EXTERNAL_PASSWORD, 'internal', true, noRead, noRead), 'active')
  assert.equal(resolvePocLogin('internal-disabled', POC_EXTERNAL_PASSWORD, 'internal', true, () => '[]', noRead), 'disabled')
  assert.equal(resolvePocLogin('internal-disabled', POC_EXTERNAL_PASSWORD, 'internal', true,
    () => JSON.stringify([{ typeKey: 'enable', targetItcode: 'internal-disabled', statusKey: 'done', nodeType: 'done' }]), noRead), 'active')
})

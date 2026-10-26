import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import ts from 'typescript'

const source = readFileSync(new URL('../src/services/applicationProgress.ts', import.meta.url), 'utf8')
const { outputText } = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext } })
const { applicationProgress, progressNodeTypes, applicantProgressQuery, readApplicantProgress, APPLICANT_PROGRESS_KEY, PROGRESS_APPROVAL_ROWS_KEY } = await import(`data:text/javascript;base64,${Buffer.from(outputText).toString('base64')}`)
const row = { id: 'AP-unit', typeKey: 'change', applicantItcode: 'user', targetItcode: 'user', applicantPersonType: 'internal', personType: 'internal', applicantManager: 'manager', targetManager: 'target-manager', businessApprover: 'business', systemApprover: 'admin', nodeType: 'applicant-manager', statusKey: 'pending' }
assert.deepEqual(progressNodeTypes(row), ['applicant-manager', 'business', 'done'])
assert.deepEqual(progressNodeTypes({ ...row, targetItcode: 'other' }), ['applicant-manager', 'target-manager', 'business', 'done'])
assert.deepEqual(progressNodeTypes({ ...row, typeKey: 'create', personType: 'external', relatedAccount: 'owner' }), ['relation', 'applicant-manager', 'business', 'done'])
assert.deepEqual(progressNodeTypes({ ...row, applicantPersonType: 'external' }), ['relation', 'business', 'done'])
assert.deepEqual(progressNodeTypes({ ...row, typeKey: undefined, type: '创建账号' }), ['relation', 'applicant-manager', 'target-manager', 'system-admin'])
for (const kind of ['enable', 'disable', 'create', 'change', 'workspace-access']) {
  for (const state of ['pending', 'done', 'rejected']) {
    const current = { ...row, typeKey: kind, statusKey: state, nodeType: state === 'done' ? 'done' : ['enable', 'disable', 'workspace-access'].includes(kind) ? 'system-admin' : 'applicant-manager' }
    const before = JSON.stringify(current)
    const result = applicationProgress(current)
    assert.equal(result.state, state)
    assert.equal(result.tone, state === 'rejected' ? 'danger' : 'success')
    assert.equal(result.steps.filter(step => step.state === 'current').length, state === 'pending' ? 1 : 0)
    if (state === 'done') assert(result.steps.every(step => step.state === 'done'))
    if (state === 'rejected') assert.equal(result.steps.filter(step => step.state === 'rejected').length, 1)
    assert.equal(JSON.stringify(current), before, 'Presentation must not mutate the request')
  }
}
assert.equal(applicationProgress({ ...row, statusKey: 'done' }).state, 'pending', 'Approval completion is not execution completion')
const rejected = applicationProgress({ ...row, statusKey: 'rejected', nodeType: 'rework', approvalLogs: [{ action: 'reject', operator: 'business' }] })
assert.deepEqual(rejected.steps.map(step => step.state), ['done', 'rejected', 'waiting'])
assert.equal(applicationProgress({ ...row, typeKey: 'disable', statusKey: 'rejected', nodeType: 'rework' }).steps[1].state, 'rejected')
const unknown = applicationProgress({ ...row, nodeType: 'rework', statusKey: 'rejected' })
assert.equal(unknown.steps.filter(step => step.state === 'current').length, 0, 'Never invent an active node after rejection')
const values = new Map()
const storage = { getItem: key => values.get(key) ?? null, setItem: (key, value) => values.set(key, value) }
const query = new URLSearchParams(applicantProgressQuery(storage, row))
assert.equal(query.get('source'), 'permissions')
assert(query.get('token'))
assert.equal(new URLSearchParams(applicantProgressQuery(storage, row)).get('token'), query.get('token'), 'Old applicant mail links remain valid')
assert.equal(storage.getItem(PROGRESS_APPROVAL_ROWS_KEY), null, 'Progress access does not write approval revisions or grant approval')
assert.equal(readApplicantProgress(storage, row.id, ''), null)
assert.equal(readApplicantProgress(storage, row.id, 'wrong-token'), null)
assert.equal(readApplicantProgress(storage, 'other', query.get('token')), null)
const before = JSON.stringify([...values])
assert.deepEqual(readApplicantProgress(storage, row.id, query.get('token')).row, row)
assert.equal(JSON.stringify([...values]), before, 'Lookup is read-only')
storage.setItem(PROGRESS_APPROVAL_ROWS_KEY, JSON.stringify([{ ...row, nodeType: 'business', approvalRevision: 2 }]))
assert.equal(readApplicantProgress(storage, row.id, query.get('token')).row.nodeType, 'business', 'An old mail link reads the latest approval state')
storage.setItem(APPLICANT_PROGRESS_KEY, '{}')
assert.throws(() => applicantProgressQuery(storage, row))
assert.equal(storage.getItem(APPLICANT_PROGRESS_KEY), '{}', 'Corrupt records must not be overwritten')
console.log('PASS: applicant progress types/states, real routes, rejection evidence, read-only links and revision refresh')

import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

async function source(path) {
  try {
    return await readFile(new URL(path, import.meta.url), 'utf8')
  } catch {
    return ''
  }
}

test('capability change service owns seeded changes and patch versioning', async () => {
  const service = await source('../src/services/skillCapabilityChanges.js')
  assert.match(service, /export function getSeedCapabilityUpdate/)
  assert.match(service, /export function nextPatchVersion/)
  assert.match(service, /Asia\/Shanghai/)
  assert.match(service, /product-knowledge/)
  assert.match(service, /voucher-recommend/)
})

test('capability change service returns isolated updates and increments patch versions', async () => {
  const { getSeedCapabilityUpdate, nextPatchVersion, formatShanghaiMinute } = await import('../src/services/skillCapabilityChanges.js')
  const first = getSeedCapabilityUpdate('product-knowledge')
  const second = getSeedCapabilityUpdate('product-knowledge')
  first.changes[0].after = 'changed in test'

  assert.equal(second.changes[0].after, '新增批量商品参数对比接口')
  assert.equal(nextPatchVersion('v1.0.7'), 'v1.0.8')
  assert.equal(nextPatchVersion('invalid'), 'v1.0.0')
  assert.match(formatShanghaiMinute(new Date('2026-08-14T01:05:00Z')), /^2026-08-14 09:05$/)
})

test('capability update clones current context and invalidates stale evaluation once', async () => {
  const { beginCapabilityUpdate, getSeedCapabilityUpdate } = await import('../src/services/skillCapabilityChanges.js')
  const update = getSeedCapabilityUpdate('product-knowledge')
  const item = {
    name: 'product-knowledge',
    cnName: '产品知识问答',
    category: '知识问答',
    desc: '产品知识查询',
    version: 'v1.0.7',
    online: 'v1.0.7',
    status: 'published',
    statusText: '已发布',
    owner: 'product-pm',
    capabilityUpdate: update,
    draft: {
      form: { name: 'product-knowledge', cnName: '产品知识问答', menu: 'GEO 看板', scene: '', input: '', output: '' },
      selectedContextCodes: ['dashboard.geoKnowledge'],
      clarifyMessages: [],
      summaryItems: [],
      summaryUpdated: '',
      aiTuned: true,
      evaluationCapabilityVersion: 'cap-2026.08.03',
      savedAt: '2026-08-13 09:00'
    }
  }
  const started = beginCapabilityUpdate(item, '2026-08-14 11:00')
  assert.equal(started.status, 'published')
  assert.equal(started.editStatus, 'draft')
  assert.equal(started.online, 'v1.0.7')
  assert.equal(started.editVersion, 'v1.0.8')
  assert.deepEqual(started.draft.selectedContextCodes, ['dashboard.geoKnowledge'])
  assert.equal(started.draft.aiTuned, false)
  assert.equal(started.draft.evaluationCapabilityVersion, undefined)

  started.draft.aiTuned = true
  started.draft.evaluationCapabilityVersion = update.targetCapabilityVersion
  const continued = beginCapabilityUpdate(started, '2026-08-14 11:05')
  assert.equal(continued.editVersion, 'v1.0.8')
  assert.equal(continued.draft.aiTuned, true)
})

test('legacy processing drafts receive missing seeded context once', async () => {
  const { getSeedCapabilityUpdate, hydrateCapabilityUpdate } = await import('../src/services/skillCapabilityChanges.js')
  const seededUpdate = getSeedCapabilityUpdate('product-knowledge')
  const legacy = hydrateCapabilityUpdate({
    capabilityUpdate: { ...seededUpdate, currentContextCodes: undefined, status: 'processing' },
    draft: { selectedContextCodes: [], aiTuned: false }
  }, seededUpdate)
  assert.deepEqual(legacy.capabilityUpdate.currentContextCodes, ['dashboard.geoKnowledge'])
  assert.deepEqual(legacy.draft.selectedContextCodes, ['dashboard.geoKnowledge'])
  assert.equal(legacy.draft.baselineContextSeeded, true)

  const userEdited = hydrateCapabilityUpdate({
    capabilityUpdate: { ...seededUpdate, status: 'processing' },
    draft: { selectedContextCodes: [], aiTuned: false, baselineContextSeeded: true }
  }, seededUpdate)
  assert.deepEqual(userEdited.draft.selectedContextCodes, [])

  const legacyReview = hydrateCapabilityUpdate({
    status: 'review',
    statusText: '待审批',
    online: 'v1.0.7',
    capabilityUpdate: { ...seededUpdate, status: 'processing' },
    draft: { selectedContextCodes: ['dashboard.geoKnowledge'], aiTuned: true, baselineContextSeeded: true }
  }, seededUpdate)
  assert.equal(legacyReview.status, 'published')
  assert.equal(legacyReview.statusText, '已发布')
  assert.equal(legacyReview.editStatus, 'review')
})

test('a newer capability record is not hidden by a resolved cache', async () => {
  const { getSeedCapabilityUpdate, hydrateCapabilityUpdate } = await import('../src/services/skillCapabilityChanges.js')
  const oldUpdate = getSeedCapabilityUpdate('product-knowledge')
  oldUpdate.status = 'resolved'
  const newerUpdate = {
    ...getSeedCapabilityUpdate('product-knowledge'),
    recordId: 'capability-change-product-knowledge-20260820',
    targetCapabilityVersion: 'cap-2026.08.20',
    detectedAt: '2026-08-20 09:30',
    summary: '第二次能力变化，新增配件兼容性字段。'
  }
  const hydrated = hydrateCapabilityUpdate({ capabilityUpdate: oldUpdate }, newerUpdate)
  assert.equal(hydrated.capabilityUpdate.recordId, newerUpdate.recordId)
  assert.equal(hydrated.capabilityUpdate.targetCapabilityVersion, 'cap-2026.08.20')
  assert.equal(hydrated.capabilityUpdate.status, 'available')
  assert.equal(hydrated.capabilityUpdate.history[0].recordId, oldUpdate.recordId)
  assert.equal(hydrated.capabilityUpdate.history[0].targetCapabilityVersion, oldUpdate.targetCapabilityVersion)
  assert.equal(hydrated.capabilityUpdate.history[0].changes.length, oldUpdate.changes.length)

  const processing = hydrateCapabilityUpdate({
    status: 'published',
    statusText: '已发布',
    online: 'v1.0.7',
    editStatus: 'review',
    capabilityUpdate: { ...oldUpdate, status: 'processing' },
    draft: {
      selectedContextCodes: ['dashboard.geoKnowledge'],
      aiTuned: true,
      evaluationCapabilityVersion: oldUpdate.targetCapabilityVersion,
      baselineContextSeeded: true,
      summaryItems: [{ label: '能力变化', text: oldUpdate.summary }],
      summaryUpdated: '能力变化检测于 2026-08-14 09:30'
    }
  }, newerUpdate)
  assert.equal(processing.capabilityUpdate.status, 'processing')
  assert.equal(processing.editStatus, 'draft')
  assert.equal(processing.draft.aiTuned, false)
  assert.equal(processing.draft.evaluationCapabilityVersion, undefined)
  assert.match(processing.draft.summaryItems[0].text, /后续变化/)
  assert.match(processing.draft.summaryItems[0].text, new RegExp(newerUpdate.summary))
  assert.match(processing.draft.summaryUpdated, /cap-2026\.08\.20/)
})

test('capability submission preserves online lifecycle and owner until approved release', async () => {
  const { beginCapabilityUpdate, getSeedCapabilityUpdate, mergeCapabilitySubmission, transitionCapabilityEdit } = await import('../src/services/skillCapabilityChanges.js')
  const current = beginCapabilityUpdate({
    name: 'product-knowledge',
    cnName: '产品知识问答',
    category: '知识问答',
    desc: '产品知识查询',
    version: 'v1.0.7',
    online: 'v1.0.7',
    status: 'published',
    statusText: '已发布',
    owner: 'product-pm',
    capabilityUpdate: getSeedCapabilityUpdate('product-knowledge')
  }, '2026-08-14 11:00')
  const submitted = mergeCapabilitySubmission(current, {
    cnName: current.cnName,
    desc: current.desc,
    category: 'GEO 看板',
    tags: ['手工上传知识'],
    owner: 'admin',
    score: '0.859',
    draft: { ...current.draft, aiTuned: true, evaluationCapabilityVersion: current.capabilityUpdate.targetCapabilityVersion }
  }, '2026-08-14 11:10')
  assert.equal(submitted.owner, 'product-pm')
  assert.equal(submitted.status, 'published')
  assert.equal(submitted.editStatus, 'review')
  assert.equal(submitted.online, 'v1.0.7')

  const approved = transitionCapabilityEdit(submitted, 'approved', 'admin', '2026-08-14 11:20')
  assert.equal(approved.status, 'published')
  assert.equal(approved.editStatus, 'approved')
  assert.equal(approved.online, 'v1.0.7')
  const published = transitionCapabilityEdit(approved, 'published', 'admin', '2026-08-14 11:30')
  assert.equal(published.online, 'v1.0.8')
  assert.equal(published.capabilityUpdate.status, 'resolved')
  assert.equal(published.editStatus, undefined)
})

test('Skill Hub exposes independent update discovery and change actions', async () => {
  const view = await source('../src/views/agent/AgentSkillsView.vue')
  assert.match(view, /只看有更新/)
  assert.match(view, /查看变化/)
  assert.match(view, /更新处理中/)
  assert.match(view, /能力变化详情/)
  assert.match(view, /startCapabilityUpdate/)
  assert.match(view, /canUpdateSkill/)
})

test('skill store preserves online version while an update draft is edited', async () => {
  const store = await source('../src/stores/skillHub.ts')
  assert.match(store, /capabilityUpdate\?: SkillCapabilityUpdate/)
  assert.match(store, /editVersion\?: string/)
  assert.match(store, /function startCapabilityUpdate/)
  assert.match(store, /updateCapabilityEditStatus/)
  assert.match(store, /mergeCapabilitySubmission/)
})

test('Skill create keeps capability context changes visible and gates review at 0.80', async () => {
  const view = await source('../src/views/agent/AgentSkillCreateView.vue')
  assert.match(view, /能力上下文已变化/)
  assert.match(view, /目标能力版本/)
  assert.match(view, /REVIEW_SCORE_THRESHOLD = 0\.80/)
  assert.match(view, /currentScore\.value < REVIEW_SCORE_THRESHOLD/)
  assert.match(view, /综合评分 ≥ 0\.80/)
  assert.doesNotMatch(view, /综合评分 ≥ 0\.60|已达到 0\.60|及格线 0\.60/)
})

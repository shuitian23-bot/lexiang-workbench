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
  const { beginCapabilityUpdate, getSeedCapabilityUpdate, mergeCapabilityDraft } = await import('../src/services/skillCapabilityChanges.js')
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
  assert.equal(started.capabilityUpdate.hasDraftEdits, false)

  started.draft.aiTuned = true
  started.draft.evaluationCapabilityVersion = update.targetCapabilityVersion
  const continued = beginCapabilityUpdate(started, '2026-08-14 11:05')
  assert.equal(continued.editVersion, 'v1.0.8')
  assert.equal(continued.draft.aiTuned, true)

  const saved = mergeCapabilityDraft(continued, {
    cnName: continued.cnName,
    desc: continued.desc,
    category: continued.category,
    tags: []
  }, continued.draft, '2026-08-14 11:06')
  assert.equal(saved.capabilityUpdate.hasDraftEdits, true)
})

test('capability update preserves draft selections and adds affected contexts once', async () => {
  const { beginCapabilityUpdate, getSeedCapabilityUpdate } = await import('../src/services/skillCapabilityChanges.js')
  const update = getSeedCapabilityUpdate('product-knowledge')
  const started = beginCapabilityUpdate({
    name: 'product-knowledge',
    cnName: '产品知识问答',
    category: 'GEO 看板',
    desc: '产品知识查询',
    version: 'v1.0.7',
    online: 'v1.0.7',
    status: 'published',
    statusText: '已发布',
    owner: 'product-pm',
    capabilityUpdate: update,
    draft: {
      form: { name: 'product-knowledge', cnName: '产品知识问答', menu: 'GEO 看板', scene: '', input: '', output: '' },
      selectedContextCodes: ['dashboard.geoOverview'],
      clarifyMessages: [],
      summaryItems: [],
      summaryUpdated: '',
      aiTuned: false,
      baselineContextSeeded: true,
      savedAt: '2026-08-18 10:00'
    }
  }, '2026-08-19 09:00')

  assert.deepEqual(started.draft.selectedContextCodes, ['dashboard.geoOverview', 'dashboard.geoKnowledge'])
  assert.equal(started.draft.selectedContextCodes.filter(code => code === 'dashboard.geoKnowledge').length, 1)
  assert.equal(started.draft.selectedContextCodes.includes('product.knowledge'), false)
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
  assert.equal(submitted.capabilityUpdate.hasDraftEdits, true)

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
  assert.match(view, /function capabilityUpdateActionLabel/)
  assert.match(view, /capabilityUpdateActionLabel\(capabilityChangeItem\)/)
  assert.match(view, /capabilityUpdateActionLabel\(item\)/)
})

test('Skill Hub uses the approved capability update action lifecycle copy', async () => {
  const view = await source('../src/views/agent/AgentSkillsView.vue')
  assert.doesNotMatch(view, /继续更新/)
  assert.match(view, /capabilityUpdate\?\.status === 'available'\s*\? '更新'\s*: '编辑'/)
  assert.match(view, /function actionLabel\(action: string\)/)
  assert.match(view, /审批更新:\s*'审批'/)
  assert.match(view, /驳回更新:\s*'驳回'/)
  assert.match(view, /发布更新:\s*'发布'/)
  assert.match(view, /\{\{ actionLabel\(action\) \}\}/)
})

test('Skill Hub loads fixed capability updates without user-side demo controls', async () => {
  const service = await source('../src/services/skillCapabilityChanges.js')
  const store = await source('../src/stores/skillHub.ts')
  const view = await source('../src/views/agent/AgentSkillsView.vue')
  assert.doesNotMatch(service, /export function activateCapabilityDemo|export function resetCapabilityDemo/)
  assert.match(store, /const seededUpdate = getSeedCapabilityUpdate\(item\.name\)/)
  assert.doesNotMatch(store, /const seededUpdate = item\.capabilityUpdate/)
  assert.doesNotMatch(store, /activateCapabilityDemo|resetCapabilityDemos/)
  assert.doesNotMatch(view, /模拟能力变化|重置演示数据|new\.leaibot\.cn/)
})

test('Skill Hub summary cards filter capability updates and disabled skills independently', async () => {
  const view = await source('../src/views/agent/AgentSkillsView.vue')
  const styles = await source('../src/assets/workbench.css')
  assert.match(view, /summaryFilter/)
  assert.match(view, /setSummaryFilter/)
  assert.match(view, /filter: 'updates'/)
  assert.match(view, /filter: 'disabled'/)
  assert.match(view, /published: \['禁用'/)
  assert.match(view, /disabled: \['启用'/)
  assert.match(styles, /grid-template-columns:repeat\(6,minmax\(0,1fr\)\)/)
  assert.match(styles, /\.skill-hub-stat\.is-active/)
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
  assert.doesNotMatch(view, /class="skill-capability-update-banner"/)
  assert.doesNotMatch(view, /查看能力上下文/)
  assert.match(view, /class="skill-chat-context skill-capability-context-panel"[\s\S]*class="skill-capability-context-meta"/)
  assert.match(view, /已选能力受影响/)
  assert.match(view, /可选新增/)
  assert.match(view, /目标能力版本/)
  assert.match(view, /检测于/)
  assert.match(view, /REVIEW_SCORE_THRESHOLD = 0\.80/)
  assert.match(view, /currentScore\.value < REVIEW_SCORE_THRESHOLD/)
  assert.match(view, /综合评分 ≥ 0\.80/)
  assert.doesNotMatch(view, /综合评分 ≥ 0\.60|已达到 0\.60|及格线 0\.60/)
})

test('Skill update combines selected context and capability changes without auto-selecting additions', async () => {
  const view = await source('../src/views/agent/AgentSkillCreateView.vue')
  assert.match(view, /已选能力受影响/)
  assert.match(view, /可选新增/)
  assert.match(view, /加入上下文/)
  assert.match(view, /affectedSelectedContextItems/)
  assert.match(view, /optionalNewContextItems/)
  assert.match(view, /function addOptionalContext/)
  assert.match(view, /function handleContextCardClick/)
  assert.match(view, /class="skill-context-card"[\s\S]*?@click="handleContextCardClick\(item\.code\)"/)
  assert.match(view, /optionalNewContextItems\.value\.some\(item => item\.code === code\)/)
  assert.match(view, /activeTab\.value = 'clarify'/)
  assert.match(view, /ref="capabilityContextEl"/)
  assert.match(view, /tabindex="-1"/)
  assert.match(view, /capabilityContextEl\.value\?\.focus/)
  assert.match(view, /:aria-disabled="!optionalNewContextItems\.length"/)
  assert.match(view, /selected: false/)
  assert.match(view, /\.skill-capability-context-panel\s*\{[^}]*flex:\s*0 0 auto;/s)
  assert.match(view, /container-type:\s*inline-size/)
  assert.match(view, /@container \(max-width: 480px\)/)
})

test('Skill create reloads an update draft when route intent changes in an open tab', async () => {
  const view = await source('../src/views/agent/AgentSkillCreateView.vue')
  assert.match(view, /watch\(\s*\(\) => \[\s*String\(route\.query\.skill \|\| ''\),\s*String\(route\.query\.edit \|\| ''\),\s*String\(route\.query\.capabilityUpdate \|\| ''\)\s*\]/s)
  assert.match(view, /\(nextIntent, previousIntent\)[\s\S]*loadEditDraft\(\)/)
})

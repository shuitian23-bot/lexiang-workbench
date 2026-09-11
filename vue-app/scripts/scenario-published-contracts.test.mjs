import assert from 'node:assert/strict'
import test, { after } from 'node:test'
import { createServer } from 'vite'
import { createPinnedScenarioStep } from '../src/domain/scenarioSkillPackages.js'
import { getSeedCapabilityUpdate } from '../src/services/skillCapabilityChanges.js'

let server
let modules
async function loadStores() {
  if (modules) return modules
  server = await createServer({ root: new URL('..', import.meta.url).pathname, logLevel: 'silent', server: { middlewareMode: true } })
  const [pinia, hub, scenario] = await Promise.all([
    import('pinia'), server.ssrLoadModule('/src/stores/skillHub.ts'), server.ssrLoadModule('/src/stores/scenarioSkillPackages.ts')
  ])
  modules = { pinia, hub, scenario }
  return modules
}
after(async () => { await server?.close() })
const actor = { role: 'admin', user: 'admin' }
const draft = (input = '已发布查询条件', output = '已发布客户摘要') => ({
  form: { name: 'custom-published-contract', cnName: '自定义客户查询', menu: '客户管理', scene: '已发布客户查询任务', input, output },
  selectedContextCodes: [], clarifyMessages: [], summaryItems: [], summaryUpdated: '', aiTuned: true, savedAt: '2026-09-09T00:00:00Z'
})
const payload = (snapshot = draft(), description = '已发布客户查询任务') => ({
  name: 'custom-published-contract', cnName: '自定义客户查询', category: '客户管理', desc: description, owner: 'admin', actor, score: '0.90', draft: snapshot
})
async function createFixture() {
  const { pinia, hub, scenario } = await loadStores()
  pinia.setActivePinia(pinia.createPinia())
  const skillHub = hub.useSkillHubStore()
  const submitted = payload()
  skillHub.upsertSubmittedSkill(submitted)
  const item = skillHub.findSkill(submitted.name)
  skillHub.updateStatus(item, 'approved')
  skillHub.updateStatus(item, 'published')
  return { skillHub, submitted, item: skillHub.findSkill(submitted.name), select: row => scenario.createSelectableScenarioSkills([row])[0] }
}
function prepareCapabilityEdit(item) {
  item.version = 'v1.1.0'
  item.editVersion = 'v1.1.0'
  item.editStatus = 'draft'
  item.workflowStatus = 'draft'
  item.capabilityUpdate = { ...getSeedCapabilityUpdate('product-knowledge'), status: 'processing', hasDraftEdits: false }
}

test('publishing a user-created Skill captures its own contract and feeds node defaults', async () => {
  const { submitted, item, select } = await createFixture()
  const catalogSkill = select(item)
  const node = createPinnedScenarioStep(catalogSkill)
  assert.equal(node.task, submitted.desc)
  assert.equal(node.inputDescription, submitted.draft.form.input)
  assert.equal(node.expectedOutput, submitted.draft.form.output)
  assert.equal(node.pinnedVersion, 'v1.0.0')
  assert.deepEqual(item.publishedContract, { version: 'v1.0.0', description: submitted.desc, input: submitted.draft.form.input, output: submitted.draft.form.output })
  const permissions = JSON.parse(JSON.stringify(catalogSkill.permissions))
  submitted.draft.form.input = '提交对象之后被修改'
  item.draft.form.output = '发布后草稿修改'
  assert.equal(select(item).inputDescription, '已发布查询条件')
  assert.equal(select(item).outputDescription, '已发布客户摘要')
  assert.deepEqual(select(item).permissions, permissions)
})

test('editing and submitting a future capability draft do not replace the online contract', async () => {
  const { skillHub, item, select } = await createFixture()
  const published = JSON.parse(JSON.stringify(select(item)))
  prepareCapabilityEdit(item)
  skillHub.upsertDraftSkill(payload(draft('未发布输入', '未发布输出'), '未发布新任务'))
  let current = skillHub.findSkill(item.name)
  assert.equal(current.online, 'v1.0.0')
  assert.equal(current.version, 'v1.1.0')
  assert.equal(select(current).description, published.description)
  assert.equal(select(current).inputDescription, published.inputDescription)
  assert.equal(select(current).outputDescription, published.outputDescription)
  skillHub.upsertSubmittedSkill(payload(draft('待审批输入', '待审批输出'), '待审批新任务'))
  current = skillHub.findSkill(item.name)
  assert.equal(current.workflowStatus, 'review')
  assert.equal(select(current).description, published.description)
  assert.equal(select(current).inputDescription, published.inputDescription)
  assert.equal(select(current).outputDescription, published.outputDescription)
  assert.deepEqual(select(current).permissions, published.permissions)
})

test('disabling and enabling a Skill preserves the old snapshot instead of recapturing a draft', async () => {
  const { skillHub, item, select } = await createFixture()
  const before = JSON.parse(JSON.stringify(select(item)))
  item.draft = draft('未来草稿输入', '未来草稿输出')
  item.desc = '未来草稿任务'
  item.version = 'v1.1.0'
  item.editVersion = 'v1.1.0'
  skillHub.updateStatus(item, 'disabled')
  assert.equal(select(item), undefined)
  skillHub.updateStatus(item, 'published')
  assert.equal(item.online, 'v1.0.0')
  assert.equal(item.version, 'v1.1.0')
  assert.equal(select(item).description, before.description)
  assert.equal(select(item).inputDescription, before.inputDescription)
  assert.equal(select(item).outputDescription, before.outputDescription)
})

test('only a successful approved capability publication switches the captured contract version', async () => {
  const { skillHub, item, select } = await createFixture()
  prepareCapabilityEdit(item)
  skillHub.upsertDraftSkill(payload(draft('下一版输入', '下一版输出'), '下一版任务'))
  let current = skillHub.findSkill(item.name)
  skillHub.updateCapabilityEditStatus(current, 'published')
  current = skillHub.findSkill(item.name)
  assert.equal(current.online, 'v1.0.0')
  assert.equal(select(current).outputDescription, '已发布客户摘要')
  skillHub.upsertSubmittedSkill(payload(draft('下一版输入', '下一版输出'), '下一版任务'))
  current = skillHub.findSkill(item.name)
  skillHub.updateCapabilityEditStatus(current, 'approved')
  current = skillHub.findSkill(item.name)
  assert.equal(current.online, 'v1.0.0')
  assert.equal(select(current).outputDescription, '已发布客户摘要')
  skillHub.updateCapabilityEditStatus(current, 'published')
  current = skillHub.findSkill(item.name)
  assert.equal(current.online, 'v1.1.0')
  assert.equal(current.version, 'v1.1.0')
  assert.equal(current.capabilityUpdate.status, 'resolved')
  assert.equal(current.publishedContract.version, 'v1.1.0')
  assert.equal(select(current).description, '下一版任务')
  assert.equal(select(current).inputDescription, '下一版输入')
  assert.equal(select(current).outputDescription, '下一版输出')
})

test('unversioned drafts and snapshots for a different online version are never used', async () => {
  const { item, select } = await createFixture()
  const legacy = { ...item, publishedContract: undefined, draft: draft('不能证实已发布输入', '不能证实已发布输出') }
  assert.equal(select(legacy).inputDescription, '')
  assert.equal(select(legacy).outputDescription, '')
  const mismatched = { ...legacy, publishedContract: { version: 'v9.0.0', description: '错误版本任务', input: '错误版本输入', output: '错误版本输出' } }
  assert.equal(select(mismatched).inputDescription, '')
  assert.equal(select(mismatched).outputDescription, '')
})

test('version-matched snapshots take precedence over demo contracts, including intentionally empty values', async () => {
  const { skillHub, select } = await createFixture()
  const seeded = skillHub.findSkill('product-knowledge')
  assert.equal(select(seeded).inputDescription, '产品名称、使用需求或对比对象')
  assert.equal(select(seeded).outputDescription, '配置参数、性能差异和可选机型说明')
  const cleared = { ...seeded, publishedContract: { version: seeded.online, description: '', input: '', output: '' } }
  assert.equal(select(cleared).description, '')
  assert.equal(select(cleared).inputDescription, '')
  assert.equal(select(cleared).outputDescription, '')
  assert.equal(select({ ...seeded, online: 'v9.0.0' }).outputDescription, '')
})

test('historical items without a published snapshot never fall back to future draft descriptions', async () => {
  const { skillHub, item, select } = await createFixture()
  delete item.publishedContract
  prepareCapabilityEdit(item)
  skillHub.upsertDraftSkill(payload(draft('未来输入', '未来输出'), '不可泄漏的未来任务说明'))
  const current = skillHub.findSkill(item.name)
  assert.equal(current.online, 'v1.0.0')
  assert.equal(current.desc, '不可泄漏的未来任务说明')
  assert.equal(select(current).description, '使用自定义客户查询完成本节点任务')
  assert.equal(select(current).inputDescription, '')
  assert.equal(select(current).outputDescription, '')
  const seeded = skillHub.findSkill('product-knowledge')
  const publishedDescription = seeded.desc
  prepareCapabilityEdit(seeded)
  skillHub.upsertDraftSkill({ ...payload(draft('未来产品输入', '未来产品输出'), '不可泄漏的产品新草稿'), name: seeded.name, cnName: seeded.cnName })
  const updatedSeed = skillHub.findSkill(seeded.name)
  assert.equal(updatedSeed.online, 'v1.0.7')
  assert.equal(select(updatedSeed).description, publishedDescription)
  assert.equal(select(updatedSeed).inputDescription, '产品名称、使用需求或对比对象')
})

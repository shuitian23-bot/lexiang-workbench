import assert from 'node:assert/strict'
import test, { after } from 'node:test'
import { createServer as createHttpServer } from 'node:http'
import { createServer } from 'vite'
import { createSSRApp, h } from 'vue'
import { renderToString } from 'vue/server-renderer'
import { fileURLToPath } from 'node:url'

const host = createHttpServer()
const server = await createServer({ root: fileURLToPath(new URL('../', import.meta.url)), server: { middlewareMode: true, hmr: { server: host } }, appType: 'custom', logLevel: 'error' })
after(async () => { await server.close(); host.close() })
const { default: Composer } = await server.ssrLoadModule('/src/views/agent/ScenarioSkillPackageComposer.vue')
const { createPinnedScenarioStep } = await server.ssrLoadModule('/src/domain/scenarioSkillPackages.js')
const skills = [{ id: 'employee-certification-insight', name: '职场认证状态查询', menu: '员工管理', version: 'v1.0.0', online: 'v1.0.0', status: 'published', onlineStatus: 'published', description: 'Skill 默认说明' }]
const step = createPinnedScenarioStep(skills[0], { id: 'node-a', task: '' })
const errors = ['未填写本节点任务，无法确定执行内容。']
const suggestions = ['返回编排填写“本节点任务”，说明处理对象、业务范围和具体动作，然后重新试运行。']
async function render(values) {
  const Wrapped = { ...Composer, setup(props, context) { const state = Composer.setup(props, context); state.selectedStepId.value = 'node-a'; return state } }
  return renderToString(createSSRApp({ render: () => h(Wrapped, { skills, modelValue: [structuredClone(step)], ...values }) }))
}

test('returning to the failed node displays its cause and actionable suggestion without changing configuration', async () => {
  const values = { trialErrors: { 'node-a': errors }, trialSuggestions: { 'node-a': suggestions } }
  const before = structuredClone(values)
  const html = await render(values)
  assert.ok(html.includes('报错原因'))
  assert.ok(html.includes(suggestions[0]))
  assert.match(html, /修改建议/)
  assert.doesNotMatch(html, /textarea[^>]*required/)
  assert.match(html, /未填写时按当前固定版本 Skill 的任务说明执行/)
  assert.doesNotMatch(html, /<textarea[^>]*>Skill 默认说明/)
  assert.deepEqual(values, before)
})

test('edited configuration keeps the last failure and suggestion until a new trial replaces it', async () => {
  const html = await render({ modelValue: [{ ...step, task: '查询本周认证记录并按状态汇总' }], trialErrors: { 'node-a': errors }, trialSuggestions: { 'node-a': suggestions }, trialStale: true })
  assert.ok(html.includes('上次试运行提示'))
  assert.ok(html.includes(suggestions[0]))
  assert.ok(html.includes('待重试'))
  assert.ok(html.includes('查询本周认证记录并按状态汇总'))
})

test('a successful retry removes the prior error and suggestion, while old errors have a fallback', async () => {
  const clean = await render({ trialErrors: {}, trialSuggestions: {} })
  assert.doesNotMatch(clean, /aria-label="节点试运行提示"/)
  const legacy = await render({ trialErrors: { 'node-a': errors } })
  assert.ok(legacy.includes('修改建议'))
  assert.ok(legacy.includes('重新试运行'))
})

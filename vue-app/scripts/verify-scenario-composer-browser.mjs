import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import { existsSync, mkdirSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import os from 'node:os'

const require = createRequire(import.meta.url)
const runtimePath = path.join(os.homedir(), '.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright')
const { chromium } = require(process.env.PLAYWRIGHT_MODULE_PATH || runtimePath)
const baseUrl = process.env.SCENARIO_QA_BASE_URL || 'http://127.0.0.1:5197/admin-vue'
const evidenceDir = process.env.SCENARIO_QA_OUTPUT || path.join(os.tmpdir(), 'scenario-composer-qa')
mkdirSync(evidenceDir, { recursive: true })
const chromePath = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
const browser = await chromium.launch({ headless: true, ...(existsSync(chromePath) ? { executablePath: chromePath } : {}) })
const errors = []
try {
  const context = await browser.newContext({ viewport: { width: 1600, height: 1000 } })
  await context.addInitScript(() => {
    localStorage.clear()
    localStorage.setItem('preview_user', 'admin')
  })
  const page = await context.newPage()
  page.on('pageerror', error => errors.push(error.message))
  await page.goto(`${baseUrl}/agent/skills?tab=packages&mode=create`, { waitUntil: 'domcontentloaded' })
  const create = page.locator('.scenario-package-create')
  await create.waitFor()
  const fields = create.locator('#scenario-package-panel-1 input:not([readonly]), #scenario-package-panel-1 textarea')
  assert.equal(await fields.count(), 5)
  for (let i = 0; i < 5; i++) {
    assert.ok((await fields.nth(i).inputValue()).trim(), `required field ${i + 1} must be prefilled`)
  }
  assert.equal(await create.getByRole('tab').count(), 4, 'creation has four steps')
  await fields.first().fill('浏览器验收场景技能包')
  await fields.nth(1).fill('')
  await create.getByRole('button', { name: '下一步', exact: true }).click()
  await create.getByText('请填写目标人群', { exact: true }).waitFor()
  await fields.nth(1).fill('企业运营人员')
  await page.screenshot({ path: path.join(evidenceDir, 'definition.png'), fullPage: true })
  await create.getByRole('button', { name: '下一步', exact: true }).click()
  await create.getByRole('heading', { name: 'Skill 链路编排', exact: true }).waitFor()
  assert.equal(await create.getByRole('tab', { selected: true }).innerText(), '2. Skill 链路编排')
  assert.equal(await create.locator('.scenario-package-body').evaluate(node => node.scrollTop), 0, 'step navigation keeps the content top spacing visible')
  await create.getByRole('button', { name: '下一步', exact: true }).click()
  await create.getByText('请至少选择两个不同的已发布 Skill', { exact: true }).waitFor()
  const composer = create.locator('.scenario-composer')
  const search = composer.getByRole('searchbox', { name: '搜索 Skill' })
  const ids = ['employee-certification-insight', 'workplace-segment-operations', 'enterprise-customer-followup']
  const nodeIds = () => composer.locator('[data-step-id]').evaluateAll(nodes => nodes.map(node => node.dataset.stepId))
  const edges = () => composer.locator('[data-edge-id]').evaluateAll(nodes => nodes.map(node => node.dataset.edgeId).sort())
  const executionOrder = () => composer.locator('[data-step-id]').evaluateAll(nodes => nodes
    .map(node => ({ id: node.dataset.stepId, order: Number(node.querySelector('.composer-node-order')?.textContent.match(/执行第 (\d+) 步/)?.[1]) }))
    .filter(node => Number.isFinite(node.order))
    .sort((left, right) => left.order - right.order)
    .map(node => node.id))
  const positions = () => composer.locator('[data-step-id]').evaluateAll(nodes => Object.fromEntries(nodes.map(node => [node.dataset.stepId, { x: Number.parseFloat(node.style.left), y: Number.parseFloat(node.style.top) }])))
  const config = composer.getByRole('region', { name: '节点配置' })
  const canvas = composer.locator('[data-canvas-drop]')
  const node = id => composer.locator(`[data-step-id="${id}"]`)
  const expectedEdges = [`${ids[0]}->${ids[1]}`, `${ids[1]}->${ids[2]}`].sort()
  async function fitCanvas() {
    await composer.getByRole('button', { name: '适应', exact: true }).click()
    await canvas.scrollIntoViewIfNeeded()
  }
  async function dragSkill(id, location = { x: 0.5, y: 0.5 }) {
    await search.fill(id)
    await canvas.scrollIntoViewIfNeeded()
    const size = await canvas.boundingBox()
    assert.ok(size, 'canvas drop target is visible')
    await composer.locator(`[data-skill-id="${id}"]`).dragTo(canvas, {
      targetPosition: { x: size.width * location.x, y: size.height * location.y }
    })
    await node(id).waitFor()
  }
  async function connectPorts(sourceId, targetId) {
    await fitCanvas()
    const source = await composer.locator(`[data-output-port="${sourceId}"]`).boundingBox()
    const target = await composer.locator(`[data-input-port="${targetId}"]`).boundingBox()
    assert.ok(source && target, 'both connection ports are visible')
    await page.mouse.move(source.x + source.width / 2, source.y + source.height / 2)
    await page.mouse.down()
    await page.mouse.move(target.x + target.width / 2, target.y + target.height / 2, { steps: 16 })
    await page.mouse.up()
  }
  async function selectEdge(sourceId, targetId) {
    await fitCanvas()
    const hit = composer.locator(`[data-edge-id="${sourceId}->${targetId}"] .composer-edge-hit`)
    const point = await hit.evaluate(path => {
      const midpoint = path.getPointAtLength(path.getTotalLength() / 2)
      const matrix = path.getScreenCTM()
      if (!matrix) throw new Error('connection path is not rendered')
      const screenPoint = new DOMPoint(midpoint.x, midpoint.y).matrixTransform(matrix)
      return { x: screenPoint.x, y: screenPoint.y }
    })
    await page.mouse.click(point.x, point.y)
    await config.getByRole('heading', { name: '连线配置', exact: true }).waitFor()
    assert.equal(await hit.getAttribute('aria-pressed'), 'true')
  }
  async function selectNode(id) {
    await node(id).locator('.composer-node-select').click()
    await config.getByRole('heading', { name: '节点配置', exact: true }).waitFor()
    await config.locator('.composer-static-value').waitFor()
    assert.equal(await node(id).locator('.composer-node-select').getAttribute('aria-pressed'), 'true')
  }
  async function deleteEdge(sourceId, targetId) {
    await selectEdge(sourceId, targetId)
    await config.getByRole('button', { name: '删除连线', exact: true }).click()
    await composer.locator(`[data-edge-id="${sourceId}->${targetId}"]`).waitFor({ state: 'detached' })
  }
  async function assertDisconnected() {
    await create.getByRole('button', { name: '下一步', exact: true }).click()
    await create.getByText('执行链必须只有一个起点，请连接所有节点。', { exact: true }).waitFor()
    assert.equal(await create.getByRole('tab', { selected: true }).innerText(), '2. Skill 链路编排')
  }
  // Real HTML5 dragging places independent nodes; adding or moving a node never creates an edge.
  for (const [i, id] of ids.entries()) {
    await dragSkill(id, [{ x: 0.35, y: 0.2 }, { x: 0.65, y: 0.45 }, { x: 0.45, y: 0.7 }][i])
    assert.equal((await nodeIds()).length, i + 1, `mouse drag adds ${id}`)
  }
  assert.deepEqual(await nodeIds(), ids)
  assert.equal(new Set(Object.values(await positions()).map(position => `${position.x},${position.y}`)).size, 3, 'drop points create distinct node positions')
  assert.deepEqual(await edges(), [])
  assert.deepEqual(await executionOrder(), [])
  await assertDisconnected()
  await composer.getByRole('button', { name: '整理布局', exact: true }).click()
  await fitCanvas()
  const beforeDuplicate = await positions()
  await dragSkill(ids[2], { x: 0.2, y: 0.3 })
  assert.deepEqual(await nodeIds(), ids, 'dragging an existing Skill selects its node without duplicating it')
  assert.deepEqual(await positions(), beforeDuplicate, 'duplicate drag preserves positions')
  await connectPorts(ids[0], ids[1])
  await connectPorts(ids[1], ids[2])
  assert.deepEqual(await edges(), expectedEdges)
  assert.deepEqual(await executionOrder(), ids)

  await fitCanvas()
  const beforeMove = await positions()
  const dragHandle = await node(ids[0]).locator('.composer-node-select').boundingBox()
  assert.ok(dragHandle, 'node move handle is visible')
  await page.mouse.move(dragHandle.x + dragHandle.width / 2, dragHandle.y + dragHandle.height / 3)
  await page.mouse.down()
  await page.mouse.move(dragHandle.x + dragHandle.width / 2 + 28, dragHandle.y + dragHandle.height / 3 + 72, { steps: 12 })
  await page.mouse.up()
  assert.notDeepEqual((await positions())[ids[0]], beforeMove[ids[0]], 'pointer dragging moves the node on the canvas')
  assert.deepEqual(await edges(), expectedEdges, 'moving a node preserves all connections')
  assert.deepEqual(await executionOrder(), ids, 'execution follows connections, not canvas coordinates')
  assert.equal(await composer.getByRole('button', { name: /^(上移|下移)$/ }).count(), 0)
  // Exercise invalid graph edits through ports and the connection inspector.
  await connectPorts(ids[2], ids[0])
  await composer.getByText('这条连接会形成循环，请选择其他节点。', { exact: true }).waitFor()
  assert.deepEqual(await edges(), expectedEdges, 'cycle attempt does not mutate the chain')
  await canvas.focus()
  await page.keyboard.press('Escape')
  const beforeDisconnect = await positions()
  await deleteEdge(ids[1], ids[2])
  assert.deepEqual(await edges(), [`${ids[0]}->${ids[1]}`])
  assert.deepEqual(await positions(), beforeDisconnect, 'deleting an edge preserves node positions')
  await assertDisconnected()
  await connectPorts(ids[0], ids[2])
  await composer.getByText('一个节点只能连接一个后续步骤，请先断开已有输出连线。', { exact: true }).waitFor()
  assert.deepEqual(await edges(), [`${ids[0]}->${ids[1]}`], 'branch attempt does not add a second output')
  await canvas.focus()
  await page.keyboard.press('Escape')
  await connectPorts(ids[1], ids[2])
  assert.deepEqual(await executionOrder(), ids, 'reconnecting ports restores the executable chain')
  await deleteEdge(ids[1], ids[2])
  await assertDisconnected()
  await connectPorts(ids[1], ids[2])
  assert.deepEqual(await edges(), expectedEdges, 'port dragging reconnects the node after deleting its incoming edge')
  assert.deepEqual(await executionOrder(), ids)
  // Rewire to an order different from insertion order using edge deletion and port dragging.
  await deleteEdge(ids[0], ids[1])
  await deleteEdge(ids[1], ids[2])
  await connectPorts(ids[0], ids[2])
  await connectPorts(ids[2], ids[1])
  assert.deepEqual(await nodeIds(), ids, 'rewiring preserves node identities and storage order')
  assert.deepEqual(await executionOrder(), [ids[0], ids[2], ids[1]], 'arrows determine execution order independently of insertion order')
  await deleteEdge(ids[2], ids[1])
  await deleteEdge(ids[0], ids[2])
  await connectPorts(ids[0], ids[1])
  await connectPorts(ids[1], ids[2])
  assert.deepEqual(await edges(), expectedEdges)
  assert.deepEqual(await executionOrder(), ids)
  await selectNode(ids[2])
  await config.getByLabel('所属链路').selectOption('conditional')
  await create.getByRole('button', { name: '下一步', exact: true }).click()
  await create.getByText('请为条件步骤“企业客户跟进建议”填写触发条件', { exact: true }).waitFor()
  await config.getByRole('button', { name: '使用示例：当用户需要企业客户跟进时', exact: true }).click()
  assert.equal(await config.getByRole('textbox', { name: '判断条件', exact: false }).inputValue(), '当用户需要企业客户跟进时', 'condition example fills the editable field')
  await config.getByRole('textbox', { name: '判断条件', exact: false }).fill('当认证未通过且需要企业客户跟进时')
  await config.getByLabel('执行前需要确认').check()
  await config.getByLabel('所属链路').selectOption('required')
  assert.equal(await config.getByRole('textbox', { name: '判断条件', exact: false }).count(), 0)
  await config.getByLabel('所属链路').selectOption('conditional')
  assert.equal(await config.getByRole('textbox', { name: '判断条件', exact: false }).inputValue(), '', 'switching to core clears stale conditions')
  await config.getByRole('textbox', { name: '判断条件', exact: false }).fill('当认证未通过且需要企业客户跟进时')
  assert.ok(await config.getByLabel('执行前需要确认').isChecked())
  await search.fill('不存在的能力')
  await composer.getByText('没有找到匹配的 Skill', { exact: true }).waitFor()
  await search.fill('')
  const firstGroup = composer.locator('.composer-group-toggle').first()
  await firstGroup.click()
  assert.equal(await firstGroup.getAttribute('aria-expanded'), 'false')
  await firstGroup.click()
  await create.getByRole('button', { name: '下一步', exact: true }).click()
  await create.getByRole('heading', { name: '权限和版本评估', exact: true }).waitFor()
  assert.equal(await create.locator('.scenario-package-evaluation.is-block').count(), 0)
  await create.getByRole('button', { name: '下一步', exact: true }).click()
  const confirmation = create.locator('.scenario-package-owner-confirm input')
  const publish = create.getByRole('button', { name: '审批并发布', exact: true })
  assert.ok(await publish.isDisabled())
  await confirmation.check()
  assert.ok(await publish.isEnabled())
  await create.getByRole('tab', { name: '2. Skill 链路编排', exact: true }).click()
  await selectNode(ids[2])
  assert.equal(await config.getByLabel('所属链路').inputValue(), 'conditional')
  assert.equal(await config.locator('.composer-static-value').textContent(), 'v1.0.0')
  assert.deepEqual(await edges(), expectedEdges, 'returning to composition preserves the graph')
  await config.getByRole('textbox', { name: '判断条件', exact: false }).fill('当用户需要企业客户跟进时')
  await create.getByRole('tab', { name: '4. 管理员审批发布', exact: true }).click()
  assert.equal(await confirmation.isChecked(), false, 'changing a condition revokes previous publication confirmation')
  await confirmation.check()
  await create.getByRole('tab', { name: '2. Skill 链路编排', exact: true }).click()
  await deleteEdge(ids[1], ids[2])
  await connectPorts(ids[1], ids[2])
  await create.getByRole('tab', { name: '4. 管理员审批发布', exact: true }).click()
  assert.equal(await confirmation.isChecked(), false, 'editing connections also revokes publication confirmation after the chain is restored')
  await create.getByRole('tab', { name: '2. Skill 链路编排', exact: true }).click()
  await selectNode(ids[2])
  // Exercise catalog withdrawal through the actual store on the local test page.
  await page.evaluate(async () => {
    const { useSkillHubStore } = await import('/admin-vue/src/stores/skillHub.ts')
    useSkillHubStore().items.find(item => item.name === 'enterprise-customer-followup').onlineStatus = 'disabled'
  })
  await composer.getByText('此 Skill 已失效，请在操作区移除后重新选择。', { exact: true }).waitFor()
  await create.getByRole('button', { name: '下一步', exact: true }).click()
  await create.getByText('请移除已禁用、撤回或不再发布的 Skill', { exact: true }).waitFor()
  await composer.getByRole('button', { name: '移除 企业客户跟进建议', exact: true }).click()
  assert.deepEqual(await nodeIds(), ids.slice(0, 2))
  assert.deepEqual(await edges(), [`${ids[0]}->${ids[1]}`], 'removing an unavailable node removes only its incident connections')
  await page.waitForFunction(() => document.activeElement?.getAttribute('aria-label')?.startsWith('配置节点 '))
  await page.evaluate(async () => {
    const { useSkillHubStore } = await import('/admin-vue/src/stores/skillHub.ts')
    useSkillHubStore().items.find(item => item.name === 'enterprise-customer-followup').onlineStatus = 'published'
  })
  await dragSkill(ids[2], { x: 0.7, y: 0.7 })
  await composer.getByRole('button', { name: '整理布局', exact: true }).click()
  await assertDisconnected()
  await connectPorts(ids[1], ids[2])
  await selectNode(ids[2])
  await config.getByLabel('所属链路').selectOption('conditional')
  await config.getByRole('textbox', { name: '判断条件', exact: false }).fill('当认证未通过且需要企业客户跟进时')
  // Clear previously reported validation with a complete forward/back round trip.
  await create.getByRole('button', { name: '下一步', exact: true }).click()
  await create.getByRole('button', { name: '上一步', exact: true }).click()
  const layouts = []
  for (const width of [1600, 1440, 1280]) {
    await page.setViewportSize({ width, height: 1000 })
    await page.evaluate(() => { document.querySelector('.scenario-package-body').scrollTop = 0 })
    await page.screenshot({ path: path.join(evidenceDir, `composer-${width}-closed.png`), fullPage: true })
    layouts.push(await page.evaluate(() => ({
      viewport: innerWidth, agent: 0,
      contentInnerWidth: document.querySelector('.scenario-composer').clientWidth,
      overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
      composerOverflow: document.querySelector('.scenario-composer').scrollWidth - document.querySelector('.scenario-composer').clientWidth
    })))
  }
  await page.setViewportSize({ width: 1440, height: 1000 })
  await page.getByRole('button', { name: '打开 AI 助手', exact: true }).click()
  for (const width of [380, 492]) {
    if (width === 492) {
      const handle = page.locator('.ai-resize-handle')
      const box = await handle.boundingBox()
      await page.mouse.move(box.x + box.width / 2, box.y + 200)
      await page.mouse.down()
      await page.mouse.move(box.x - 112, box.y + 200, { steps: 10 })
      await page.mouse.up()
    }
    await page.screenshot({ path: path.join(evidenceDir, `composer-1440-agent-${width}.png`), fullPage: true })
    layouts.push(await page.evaluate(() => ({
      viewport: innerWidth, agent: Math.round(document.querySelector('.ai-panel').getBoundingClientRect().width),
      contentInnerWidth: document.querySelector('.scenario-composer').clientWidth,
      overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
      composerOverflow: document.querySelector('.scenario-composer').scrollWidth - document.querySelector('.scenario-composer').clientWidth
    })))
  }
  await page.setViewportSize({ width: 1280, height: 1000 })
  await page.screenshot({ path: path.join(evidenceDir, 'composer-1280-agent-492.png'), fullPage: true })
  layouts.push(await page.evaluate(() => ({
    viewport: innerWidth, agent: Math.round(document.querySelector('.ai-panel').getBoundingClientRect().width),
    contentInnerWidth: document.querySelector('.scenario-composer').clientWidth,
    overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
    composerOverflow: document.querySelector('.scenario-composer').scrollWidth - document.querySelector('.scenario-composer').clientWidth
  })))
  assert.ok(await create.locator('.scenario-package-tabs').evaluate(node => node.clientHeight >= 46), 'long composition must not shrink the step bar')
  assert.ok(await create.locator(':scope > .content-page-header').evaluate(node => node.clientHeight <= 100), 'stacked page heading must not retain a 320px row flex basis')
  assert.ok(await composer.locator('.content-section-header').evaluate(node => node.clientHeight <= 100), 'stacked section heading must not introduce a large empty gap')
  for (const layout of layouts) {
    assert.equal(layout.overflow, 0, JSON.stringify(layout))
    assert.equal(layout.composerOverflow, 0, JSON.stringify(layout))
  }
  writeFileSync(path.join(evidenceDir, 'layouts.json'), JSON.stringify(layouts, null, 2))
  assert.deepEqual(errors, [])
  console.log('Scenario composer browser checks passed: mock/edit/validation, four steps, real mouse add/move/duplicate, port connections, disconnected-chain gate, cycle/branch rejection, edge inspector deletion/port reconnection, removal focus, condition example/config preservation, confirmation reset, withdrawn catalog removal, search/fold, responsive layout.')
  console.log(JSON.stringify(layouts))
} finally {
  await browser.close()
}

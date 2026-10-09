import assert from 'node:assert/strict'
import test, { after, afterEach } from 'node:test'
import { createServer as createHttpServer } from 'node:http'
import { fileURLToPath } from 'node:url'
import { createServer } from 'vite'
import { createPinia, setActivePinia } from 'pinia'
import { createRenderer, h, nextTick, reactive, ssrContextKey } from 'vue'

const previous = { storage: globalThis.localStorage, window: globalThis.window }
globalThis.localStorage = { getItem() { return null }, setItem() {}, removeItem() {} }
const events = new EventTarget()
globalThis.window = { addEventListener: events.addEventListener.bind(events), removeEventListener: events.removeEventListener.bind(events) }
const host = createHttpServer()
const server = await createServer({ root: fileURLToPath(new URL('..', import.meta.url)), logLevel: 'error', server: { middlewareMode: true, hmr: { server: host } } })
const [{ default: Create }, { default: Composer }, { useAppStore }, { useAIStore }] = await Promise.all([
  server.ssrLoadModule('/src/views/agent/ScenarioSkillPackageCreateView.vue'),
  server.ssrLoadModule('/src/views/agent/ScenarioSkillPackageComposer.vue'),
  server.ssrLoadModule('/src/stores/app.ts'),
  server.ssrLoadModule('/src/stores/ai.ts'),
])
const renderer = createRenderer({ createElement: () => ({}), createText: () => ({}), createComment: () => ({}), insert() {}, remove() {}, setText() {}, setElementText() {}, patchProp() {}, parentNode: () => null, nextSibling: () => null })
const mounted = []
afterEach(() => { for (const app of mounted.splice(0)) app.unmount() })
after(async () => {
  await server.close(); host.close()
  for (const [key, value] of [['localStorage', previous.storage], ['window', previous.window]]) {
    if (value === undefined) delete globalThis[key]
    else globalThis[key] = value
  }
})

function scope() {
  const pinia = createPinia()
  setActivePinia(pinia)
  return { pinia, account: useAppStore(), ai: useAIStore() }
}
function mount(component, current, props = {}) {
  let state
  const app = renderer.createApp({ setup() {
    state = component.setup(reactive(props), { expose() {}, emit() {} })
    return () => h('div')
  } })
  app.provide(ssrContextKey, {})
  app.use(current.pinia)
  app.mount({})
  mounted.push(app)
  return { state, app }
}

test('focus temporarily expands the canvas and Escape restores the previous shell without losing input', async () => {
  const current = scope()
  current.account.sidebarCollapsed = false
  current.ai.open = true
  current.ai.panelWidth = 456
  const { state } = mount(Create, current)
  state.activeStep.value = 2
  state.form.value.name = '保留正在编排的草稿'
  await nextTick()
  assert.equal(typeof state.toggleFocus, 'function', 'the composer offers focus mode')
  state.toggleFocus()
  assert.equal(state.focused.value, true)
  assert.equal(current.account.sidebarCollapsed, true)
  assert.equal(current.account.sidebarCollapseLocked, true)
  assert.equal(current.ai.open, false)
  const escape = new Event('keydown', { cancelable: true })
  Object.defineProperty(escape, 'key', { value: 'Escape' })
  events.dispatchEvent(escape)
  assert.equal(escape.defaultPrevented, true)
  assert.equal(state.focused.value, false)
  assert.equal(current.account.sidebarCollapsed, false)
  assert.equal(current.account.sidebarCollapseLocked, false)
  assert.equal(current.ai.open, true)
  assert.equal(current.ai.panelWidth, 456)
  assert.equal(state.form.value.name, '保留正在编排的草稿')
})

test('leaving composition or unmounting always restores the shell', async () => {
  const current = scope()
  current.account.sidebarCollapsed = false
  current.ai.open = true
  const { state, app } = mount(Create, current)
  state.activeStep.value = 2
  await nextTick()
  assert.equal(typeof state.toggleFocus, 'function')
  state.toggleFocus()
  state.activeStep.value = 1
  await nextTick()
  assert.equal(current.account.sidebarCollapsed, false)
  assert.equal(current.ai.open, true)
  state.activeStep.value = 2
  await nextTick()
  state.toggleFocus()
  app.unmount()
  mounted.splice(mounted.indexOf(app), 1)
  assert.equal(current.account.sidebarCollapseLocked, false)
  assert.equal(current.account.sidebarCollapsed, false)
  assert.equal(current.ai.open, true)
})

test('zoom keeps the graph point beneath the pointer fixed', async () => {
  const { state } = mount(Composer, scope(), { skills: [], modelValue: [] })
  const viewport = { scrollLeft: 100, scrollTop: 80, clientWidth: 800, clientHeight: 500, clientLeft: 0, clientTop: 0, getBoundingClientRect: () => ({ left: 50, top: 40 }) }
  state.viewport.value = viewport
  state.zoom.value = 1
  state.changeZoom(1.2, { x: 250, y: 140 })
  await nextTick()
  assert.equal(viewport.scrollLeft, 160)
  assert.equal(viewport.scrollTop, 116)
  assert.equal(state.zoom.value, 1.2)
})

test('ordinary canvas scrolling remains native and Ctrl-wheel is bounded', async () => {
  const { state } = mount(Composer, scope(), { skills: [], modelValue: [] })
  state.viewport.value = { scrollLeft: 100, scrollTop: 80, clientWidth: 800, clientHeight: 500, clientLeft: 0, clientTop: 0, getBoundingClientRect: () => ({ left: 0, top: 0 }) }
  assert.equal(typeof state.handleCanvasWheel, 'function')
  let prevented = 0
  const wheel = { ctrlKey: false, deltaY: 500, deltaMode: 0, clientX: 250, clientY: 200, preventDefault() { prevented++ } }
  state.handleCanvasWheel(wheel)
  assert.equal(prevented, 0)
  wheel.ctrlKey = true
  state.handleCanvasWheel(wheel)
  await nextTick()
  assert.equal(prevented, 1)
  assert.equal(state.zoom.value, 0.4)
  wheel.deltaY = -1000
  state.handleCanvasWheel(wheel)
  await nextTick()
  assert.equal(state.zoom.value, 1.5)
})

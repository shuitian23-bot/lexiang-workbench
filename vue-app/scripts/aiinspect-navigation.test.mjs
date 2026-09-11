import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'
import { runInNewContext } from 'node:vm'
import ts from 'typescript'
import * as vue from 'vue'
import * as inspectService from '../src/services/aiInspect.ts'

const pageSource = readFileSync(new URL('../src/views/aiinspect/AiInspectIssuesView.vue', import.meta.url), 'utf8')
const setupSource = pageSource.match(/<script setup[^>]*>([\s\S]*?)<\/script>/)?.[1]
assert.ok(setupSource, 'The issue page must expose its script setup for the navigation regression.')

// Run the actual page script with Vue's real reactive scheduler. Only the host
// router, lifecycle registration and unrelated display imports are replaced.
function mountIssuePage(t, query) {
  const route = vue.reactive({ path: '/aiinspect/issues', fullPath: '/aiinspect/issues?initial', query })
  const mounted = []
  const activated = []
  const scope = vue.effectScope()
  t.after(() => scope.stop())

  const rows = [
    { id: 'severe-open', level: '严重', status: '待处理', page: '商城首页', modules: [] },
    { id: 'severe-resolved', level: '严重', status: '已解决', page: '商品详情', modules: [] },
    { id: 'warning-resolved', level: '警告', status: '已解决', page: '商城首页', modules: [] }
  ]
  const dependencies = {
    vue: { ...vue, onMounted: callback => mounted.push(callback), onActivated: callback => activated.push(callback) },
    'vue-router': { useRoute: () => route },
    '@/stores/app': { useAppStore: () => ({ ensureStaticTab() {}, setActiveStaticTab() {}, notify() {} }) },
    '@/services/aiInspect': { ...inspectService, workOrders: rows }
  }
  const { outputText } = ts.transpileModule(`${setupSource}\nexport { filters, filteredOrders, selectedIds };`, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 }
  })
  const exports = {}
  scope.run(() => runInNewContext(outputText, {
    exports,
    document: { title: '' },
    require(name) {
      if (name in dependencies) return dependencies[name]
      if (name.endsWith('.vue')) return { default: {} }
      throw new Error(`Unexpected issue-page dependency: ${name}`)
    }
  }, { filename: 'AiInspectIssuesView.setup.js' }))
  mounted.forEach(callback => callback())
  activated.forEach(callback => callback())

  return {
    ...exports,
    async navigate(path, nextQuery) {
      route.path = path
      route.query = nextQuery
      route.fullPath = `${path}?${new URLSearchParams(nextQuery)}`
      await vue.nextTick()
    },
    ids: () => Array.from(exports.filteredOrders.value, row => row.id)
  }
}

test('a cached issue page replaces the severe filter when the next overview link requests resolved issues', async t => {
  const page = mountIssuePage(t, { level: '严重' })
  assert.equal(page.filters.level, '严重')
  assert.deepEqual(page.ids(), ['severe-open', 'severe-resolved'])
  page.selectedIds.value = ['severe-open']

  await page.navigate('/aiinspect/issues', { status: '已解决' })

  assert.equal(page.filters.level, '全部等级')
  assert.equal(page.filters.status, '已解决')
  assert.deepEqual(page.ids(), ['severe-resolved', 'warning-resolved'])
  assert.equal(page.selectedIds.value.length, 0)
})

test('another page cannot change cached inspection filters, and returning without query clears the prior filter', async t => {
  const page = mountIssuePage(t, { level: '严重' })
  page.selectedIds.value = ['severe-open']
  const before = { ...page.filters }

  await page.navigate('/geo/overview', {
    status: '处理中', level: '提示', page: '其他业务页面', dimension: '其他业务类型'
  })

  assert.deepEqual({ ...page.filters }, before)
  assert.deepEqual(page.ids(), ['severe-open', 'severe-resolved'])
  assert.deepEqual(Array.from(page.selectedIds.value), ['severe-open'])

  await page.navigate('/aiinspect/issues', {})

  assert.deepEqual({ ...page.filters }, {
    status: '全部状态', level: '全部等级', page: '全部页面', dimension: '全部类型'
  })
  assert.deepEqual(page.ids(), ['severe-open', 'severe-resolved', 'warning-resolved'])
  assert.equal(page.selectedIds.value.length, 0)
})

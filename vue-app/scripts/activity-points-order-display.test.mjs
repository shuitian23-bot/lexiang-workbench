import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import test from 'node:test'
import { createServer } from 'vite'
import vue from '@vitejs/plugin-vue'
import { createSSRApp } from 'vue'
import { renderToString } from 'vue/server-renderer'
import { createPinia } from 'pinia'
import { createMemoryHistory, createRouter } from 'vue-router'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const names = {
  'ActivityPointsDetail.vue': 'tab, orderId, rows, columns, tableRows, download',
  'ActivityPointsStatisticsView.vue': 'tab, detailKey, allRows, columns, tableRows, exportDetails, state, activityId',
  'PointsLedgerView.vue': 'state, draft, applied, page, rows, paged, query, reset, download, selectedKey, error'
}
// The harness selects a real page state before Vue renders it; all components,
// calculations and CSV generation remain the production implementation.
const server = await createServer({
  root,
  configFile: false,
  logLevel: 'error',
  resolve: { alias: { '@': resolve(root, 'src') } },
  plugins: [
    {
      name: 'points-display-test-state',
      enforce: 'pre',
      async load(id) {
        const file = id.split('/').at(-1)
        if (!names[file]) return
        const source = await readFile(id, 'utf8')
        return source.replace('</script>', `globalThis.__pointsDisplayState?.({ ${names[file]} });\n</script>`)
      }
    },
    vue()
  ],
  server: { middlewareMode: true, watch: null }
})
globalThis.localStorage = { getItem: () => null, setItem() {} }
let csvBlob
const originalCreateUrl = URL.createObjectURL
URL.createObjectURL = (blob) => { csvBlob = blob; return 'blob:points-display-test' }
globalThis.document = { createElement: () => ({ click() {} }) }

try {
  const { seedActivities, settle, calculate, ordersFor } = await server.ssrLoadModule('/src/services/activityPoints.ts')
  const { useActivityPointsDemo } = await server.ssrLoadModule('/src/views/points/useActivityPointsDemo.ts')
  const { useAppStore } = await server.ssrLoadModule('/src/stores/app.ts')
  const Detail = (await server.ssrLoadModule('/src/views/points/ActivityPointsDetail.vue')).default
  const Statistics = (await server.ssrLoadModule('/src/views/points/ActivityPointsStatisticsView.vue')).default
  const Ledger = (await server.ssrLoadModule('/src/views/points/PointsLedgerView.vue')).default
  async function render(Component, select, props = {}) {
    let bindings
    globalThis.__pointsDisplayState = (value) => { bindings = value; select(value) }
    const app = createSSRApp(Component, props)
    const pinia = createPinia()
    app.use(pinia)
    const store = useAppStore(pinia)
    store.user = 'display-test'
    store.role = '平台管理员'
    const router = createRouter({ history: createMemoryHistory(), routes: [
      { path: '/points', component: Component },
      { path: '/points/activity-details', component: Statistics }
    ] })
    app.use(router)
    await router.push('/points')
    const html = await renderToString(app)
    return { html, bindings }
  }
  const detailProps = (ended = false) => ({
    activity: structuredClone(seedActivities[0]), records: [],
    date: ended ? '2026-10-16' : '2026-09-16',
    canConfigure: true, canExtend: true, canExport: true, canSettle: true, resultVersion: 0
  })
  const dialog = (html) => html.match(/<dialog\b[\s\S]*?<\/dialog>/)?.[0] || ''
  const text = (html) => html.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim()
  const definitions = (html) => [...html.matchAll(/<dt[^>]*>([\s\S]*?)<\/dt>\s*<dd[^>]*>([\s\S]*?)<\/dd>/g)]
    .map((match) => [text(match[1]), text(match[2])])
  const metrics = (html) => definitions(dialog(html)).filter(([label]) => /有效金额|有效台数|活动积分/.test(label))
  const metricKeys = (bindings) => bindings.columns.value.filter((column) => column.align === 'right').map((column) => column.key)
  const readCsv = async () => (await csvBlob.text()).replace(/^\uFEFF/, '').split('\r\n')
    .map((line) => line.slice(1, -1).split('","').map((value) => value.replace(/""/g, '"')))
  const assertCsv = async (bindings, run) => {
    csvBlob = undefined
    run(bindings)
    assert.ok(csvBlob, 'the real export produces a CSV download')
    const [headers, ...rows] = await readCsv()
    assert.deepEqual(headers.filter((label) => label !== '积分流水号' && /数量|台数|金额|积分|倍数|退货|收款|退款|应发|应补|入账/.test(label)), ['有效金额', '有效台数', '预计活动积分'])
    const row = rows.find((values) => values.includes('D-609001-003'))
    assert.equal(row[headers.indexOf('有效金额')], '59328')
    assert.equal(row[headers.indexOf('有效台数')], '10')
    assert.equal(row[headers.indexOf('预计活动积分')], '2966')
    const unresolved = rows.find((values) => values.includes('D-609001-010'))
    const excluded = rows.find((values) => values.includes('D-609001-012'))
    assert.equal(unresolved[headers.indexOf('预计活动积分')], '待核对')
    assert.equal(excluded[headers.indexOf('预计活动积分')], '不适用')
    assert.equal(excluded[headers.indexOf('有效金额')], '0')
    assert.equal(excluded[headers.indexOf('有效台数')], '0')
    assert.ok(rows.every((values) => values.length === headers.length), 'CSV cells remain aligned')
  }
  await test('activity order detail shows final effective metrics without intermediate calculations', async () => {
    const result = await render(Detail, (b) => { b.tab.value = '订单明细'; b.orderId.value = b.rows.value[2].id }, detailProps())
    assert.deepEqual(metrics(result.html), [['有效金额', '¥ 59,328'], ['有效台数', '10 台'], ['预计活动积分', '2,966 分']])
    assert.deepEqual(metricKeys(result.bindings), ['amount', 'quantity', 'points'])
    assert.doesNotMatch(text(dialog(result.html)), /退货|退款|收款|倍数|基础积分|应发总积分|实际已发|÷|×|−/)
    await assertCsv(result.bindings, (b) => b.download())
  })
  await test('statistics order detail and CSV use the same three effective metrics', async () => {
    const result = await render(Statistics, (b) => { b.tab.value = '订单明细'; b.detailKey.value = b.allRows.value[2].key })
    assert.deepEqual(metrics(result.html), [['有效金额', '¥ 59,328.00'], ['有效台数', '10 台'], ['预计活动积分', '2,966 分']])
    assert.deepEqual(metricKeys(result.bindings), ['amount', 'quantity', 'required'])
    assert.doesNotMatch(text(dialog(result.html)), /退货|退款|收款|倍数|基础积分|应发总积分|实际已发|÷|×|−/)
    await assertCsv(result.bindings, (b) => b.exportDetails())
  })
  await test('unresolved and excluded orders keep an honest nonnumeric points result', async () => {
    for (const index of [9, 10, 11]) {
      const detail = await render(Detail, (b) => { b.tab.value = '订单明细'; b.orderId.value = b.rows.value[index].id }, detailProps())
      const expected = index === 11 ? '不适用' : '待核对'
      assert.equal(metrics(detail.html).at(-1)?.[1], expected)
      assert.equal(detail.bindings.tableRows.value[index].points, expected)
      const stats = await render(Statistics, (b) => { b.tab.value = '订单明细'; b.detailKey.value = b.allRows.value[index].key })
      assert.equal(metrics(stats.html).at(-1)?.[1], expected)
      assert.equal(stats.bindings.tableRows.value[index].required, expected)
      if (index === 11) {
        assert.equal(metrics(stats.html)[0][1], '¥ 0.00')
        assert.equal(metrics(stats.html)[1][1], '0 台')
      }
    }
  })
  await test('ended activity labels describe entitlement rather than a posted payment', async () => {
    const result = await render(Detail, (b) => { b.orderId.value = b.rows.value[2].id }, detailProps(true))
    assert.equal(metrics(result.html).at(-1)?.[0], '应获得活动积分')
    const stats = await render(Statistics, (b) => {
      b.state.date = '2026-10-16'
      b.detailKey.value = b.allRows.value[2].key
    })
    assert.equal(metrics(stats.html).at(-1)?.[0], '应获得活动积分')
  })
  await test('the separate payout record still exposes its audit trail', async () => {
    const props = detailProps(true)
    props.records = [{
      key: 'ACT202609001:D-609001-003', orderId: 'D-609001-003', account: 'LID-DEMO-B01',
      points: 2966, status: '成功', time: '2026-11-04 10:00', batch: 'BATCH-AUDIT',
      transaction: 'TX-AUDIT', attempts: 1, reason: '', history: ['2026-11-04 发放成功']
    }]
    const result = await render(Detail, (b) => {
      b.tab.value = '发放记录'
      b.orderId.value = b.rows.value[2].id
    }, props)
    assert.match(text(dialog(result.html)), /BATCH-AUDIT/)
    assert.match(text(dialog(result.html)), /TX-AUDIT/)
    assert.match(text(dialog(result.html)), /2026-11-04 发放成功/)
    assert.equal(result.bindings.tableRows.value[0].posted, '2,966')
  })
  const ledgerModes = [['export', '明细导出'], ['account', '账户明细']]
  const tbody = (html) => html.match(/<tbody\b[\s\S]*?<\/tbody>/)?.[0] || ''
  const ledgerPoints = (html) => [...tbody(html).matchAll(/class="points-highlight points-numeric"[^>]*>([^<]*)</g)]
    .map((match) => text(match[1]))
  const resetDemo = () => useActivityPointsDemo().reset()
  await test('both ledger modes render five actual awards totaling 22541 points and export the same ledger', async () => {
    for (const [mode, title] of ledgerModes) {
      resetDemo()
      const result = await render(Ledger, () => {}, { mode })
      assert.equal(text(result.html.match(/<h1\b[^>]*>([\s\S]*?)<\/h1>/)?.[1] || ''), title)
      assert.match(text(result.html), /已到账活动积分 22,541 分 · 5 条流水/)
      assert.deepEqual(ledgerPoints(result.html), ['+600', '+400', '+2,966', '+3,575', '+15,000'])
      assert.equal(result.bindings.rows.value.length, 5)
      assert.equal(result.bindings.rows.value.reduce((sum, row) => sum + row.points, 0), 22541)
      assert.equal(text(result.html).includes('导出当前筛选结果'), mode === 'export')
      csvBlob = undefined
      result.bindings.download()
      assert.ok(csvBlob)
      const [headers, ...rows] = await readCsv()
      assert.equal(rows.length, 5)
      assert.deepEqual(rows.map((row) => row[headers.indexOf('积分加减')]), ['600', '400', '2966', '3575', '15000'])
      assert.ok(rows.every((row) => row[headers.indexOf('积分来源')] === '活动积分'))
      assert.ok(rows.every((row) => row[headers.indexOf('编号')].startsWith('DEMO-TXN-ACT202608001-')))
      assert.ok(rows.every((row) => row.length === headers.length))
    }
  })
  await test('Lenovo account queries select the same actual awards and CSV rows in both modes', async () => {
    let expectedCsv
    for (const [mode] of ledgerModes) {
      resetDemo()
      const result = await render(Ledger, (b) => {
        b.draft.account = '  lid-demo-b01  '
        b.query()
      }, { mode })
      assert.equal(result.bindings.applied.value.account, 'lid-demo-b01')
      assert.equal(result.bindings.rows.value.length, 2)
      assert.match(text(result.html), /已到账活动积分 6,541 分 · 2 条流水/)
      assert.deepEqual(ledgerPoints(result.html), ['+2,966', '+3,575'])
      assert.doesNotMatch(tbody(result.html), /LID-DEMO-A01|LID-DEMO-B03/)
      csvBlob = undefined
      result.bindings.download()
      const csv = await readCsv()
      const [headers, ...rows] = csv
      assert.equal(rows.length, 2)
      assert.ok(rows.every((row) => row[headers.indexOf('Lenovo ID')] === 'LID-DEMO-B01'))
      assert.deepEqual(rows.map((row) => row[headers.indexOf('积分加减')]), ['2966', '3575'])
      if (expectedCsv) assert.deepEqual(csv, expectedCsv)
      expectedCsv = csv
    }
  })
  await test('reversed ledger dates hide old results and block stale CSV downloads in both modes', async () => {
    for (const [mode] of ledgerModes) {
      resetDemo()
      const result = await render(Ledger, (b) => {
        csvBlob = undefined
        b.download()
        assert.ok(csvBlob, 'the valid query can export before dates become invalid')
        const validCsv = csvBlob
        b.draft.start = '2026-09-20'
        b.draft.end = '2026-09-01'
        b.query()
        b.download()
        assert.equal(csvBlob, validCsv, 'the invalid query does not create a second CSV')
      }, { mode })
      assert.equal(result.bindings.rows.value.length, 0)
      assert.equal(result.bindings.paged.value.length, 0)
      assert.match(text(result.html), /操作开始日期不能晚于结束日期/)
      assert.match(text(result.html), /请调整查询日期/)
      assert.equal(tbody(result.html), '')
      assert.doesNotMatch(text(result.html), /22,541|\+2,966/)
      csvBlob = undefined
      result.bindings.download()
      assert.equal(csvBlob, undefined)
    }
  })
  await test('selected actual ledger awards show effective amount, units and the posted points', async () => {
    for (const [mode] of ledgerModes) {
      resetDemo()
      const result = await render(Ledger, (b) => {
        b.selectedKey.value = b.rows.value.find((row) => row.orderId === 'D-608001-003').key
      }, { mode })
      const values = definitions(dialog(result.html))
      assert.deepEqual(values.filter(([label]) => ['有效金额', '有效台数', '实际入账积分'].includes(label)), [
        ['有效金额', '¥ 59,328'], ['有效台数', '10 台'], ['实际入账积分', '2,966 分']
      ])
      assert.equal(values.find(([label]) => label === 'Lenovo ID')?.[1], 'LID-DEMO-B01')
      assert.equal(values.find(([label]) => label === '编号')?.[1], 'DEMO-TXN-ACT202608001-D-608001-003')
      assert.doesNotMatch(text(dialog(result.html)), /退款|退货|预计|应发总积分|基础积分/)
    }
  })
  await test('ledger CSV exports all eighteen filtered awards while page two displays eight', async () => {
    for (const [mode] of ledgerModes) {
      resetDemo()
      const result = await render(Ledger, (b) => {
        b.state.date = '2027-01-01'
        let records = []
        for (const activity of b.state.activities.filter((item) => !item.draft)) {
          records = settle(activity, calculate(activity, ordersFor(activity), b.state.date), records, b.state.date)
        }
        assert.equal(records.length, 18, 'three real activity settlements produce six successful awards each')
        assert.ok(records.every((record) => record.status === '成功'))
        b.state.records = records
        b.draft.channel = '企业购渠道'
        b.draft.ruleType = '活动积分'
        b.draft.start = '2027-01-01'
        b.draft.end = '2027-01-01'
        b.query()
        b.page.value = 2
      }, { mode })
      assert.equal(result.bindings.rows.value.length, 18)
      assert.equal(result.bindings.page.value, 2)
      assert.equal(result.bindings.paged.value.length, 8)
      assert.equal(ledgerPoints(result.html).length, 8)
      assert.doesNotMatch(tbody(result.html), /DEMO-TXN-ACT202609001-D-609001-001/)
      csvBlob = undefined
      result.bindings.download()
      const [headers, ...rows] = await readCsv()
      assert.equal(rows.length, 18)
      assert.equal(rows.length, result.bindings.rows.value.length)
      assert.notEqual(rows.length, result.bindings.paged.value.length)
      assert.ok(rows.some((row) => row[headers.indexOf('编号')] === 'DEMO-TXN-ACT202609001-D-609001-001'))
      assert.equal(new Set(rows.map((row) => row[headers.indexOf('编号')])).size, 18)
      assert.ok(rows.every((row) => row.length === headers.length))
    }
  })
} finally {
  delete globalThis.__pointsDisplayState
  URL.createObjectURL = originalCreateUrl
  await server.close()
}

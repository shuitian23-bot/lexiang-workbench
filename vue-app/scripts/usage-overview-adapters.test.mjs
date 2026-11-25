import assert from 'node:assert/strict'
import test from 'node:test'
import { register } from 'node:module'

register(`data:text/javascript,${encodeURIComponent(`
  export async function resolve(specifier, context, nextResolve) {
    const result = await nextResolve(specifier, context)
    return result.url.endsWith('/usageDailyReportData.json')
      ? { ...result, importAttributes: { type: 'json' } } : result
  }
`)}`, import.meta.url)

async function adapters() {
  try { return await import('../src/domain/usageOverviewAdapters.js') }
  catch (error) { assert.fail(`The period data-source adapters must exist: ${error.message}`) }
}

test('daily seven-day comparison reads the previous seven days and keeps weighted rates', async () => {
  const { getDailyPeriodOverview } = await adapters()
  const result = getDailyPeriodOverview({ startDate: '2026-10-30', endDate: '2026-11-05' })
  assert.equal(result.days, 7)
  assert.equal(result.previousStartDate, '2026-10-23')
  assert.equal(result.previousEndDate, '2026-10-29')
  assert.equal(result.current.queries, 206)
  assert.equal(result.previous.queries, 199)
  assert.equal(result.changes.queries.value, 7 / 199)
  assert.equal(result.current.tasks, 118)
  assert.equal(result.previous.tasks, 149)
  assert.equal(result.current.taskSuccessRate, 112 / 118)
  assert.equal(result.changes.taskSuccessRate.difference, (112 / 118 - 141 / 149) * 100)
  assert.equal(result.current.queriesPerUser, null, 'Daily source cannot deduplicate users across days')
  assert.equal(result.points.at(-1).queries, 36)
  assert.equal(result.points.at(-1).queriesPerUser, 36 / 11)
})

test('daily thirty-day comparison keeps platform queries and leaves excluded-scope inventory unavailable', async () => {
  const { getDailyPeriodOverview } = await adapters()
  const result = getDailyPeriodOverview({ startDate: '2026-10-07', endDate: '2026-11-05' })
  assert.equal(result.previousStartDate, '2026-09-07')
  assert.equal(result.previousEndDate, '2026-10-06')
  assert.equal(result.current.queries, 518)
  assert.equal(result.previous.queries, 894)
  assert.equal(result.current.newSkills, null)
  assert.equal(result.previous.newSkills, null)
  assert.equal(result.current.totalSkills, null)
  assert.equal(result.previous.totalSkills, null)
  assert.equal(result.current.skillCallRate, null)
  assert.equal(result.previous.skillCallRate, null)
  assert.equal(result.points.length, 30)
})

test('partial daily Skill coverage remains unknown rather than a partial-period zero or comparison', async () => {
  const { getDailyPeriodOverview } = await adapters()
  const result = getDailyPeriodOverview({ startDate: '2026-10-07', endDate: '2026-10-08' })
  for (const key of ['calledSkills', 'creatorCount', 'likeRate', 'skillCallRate']) {
    assert.equal(result.current[key], null, key)
    assert.equal(result.previous[key], null, key)
    assert.equal(result.changes[key].reason, 'missing', key)
  }
  assert.equal(result.points[0].calledSkills, null)
})

test('daily single-day Query averages require an exact positive AI user denominator', async () => {
  const { getDailyPeriodOverview } = await adapters()
  assert.equal(getDailyPeriodOverview({ startDate: '2026-11-05', endDate: '2026-11-05' }).current.queriesPerUser, 36 / 11)
  assert.equal(getDailyPeriodOverview({ startDate: '2026-10-06', endDate: '2026-10-06' }).current.queriesPerUser, null)
})

async function gappedDaily() {
  const { createDailyReportApi } = await import('../src/domain/usageDailyReport.js')
  return createDailyReportApi({
    overviewRows: [
      { date: '2026-11-01', queries: 4, aiDau: 2, totalSkills: 10, newSkills: 1, tasks: 3, taskSuccess: 2, calls: 2, success: 1, failed: 1, firstTokenSeconds: 4 },
      { date: '2026-11-03', queries: 8, aiDau: 4, totalSkills: 14, newSkills: 4, tasks: 5, taskSuccess: 4, calls: 6, success: 5, failed: 1, firstTokenSeconds: 2 },
    ],
    detailRows: [
      { date: '2026-11-01', skillId: 'one', creatorId: 'alice', calls: 2, success: 1, failed: 1, likes: 1, dislikes: 0 },
      { date: '2026-11-03', skillId: 'two', creatorId: 'bob', calls: 6, success: 5, failed: 1, likes: 1, dislikes: 1 },
    ],
  })
}

test('daily zero-activity trend dates show zero without changing weighted period metrics', async () => {
  const { createDailyReportApi } = await import('../src/domain/usageDailyReport.js')
  const { createUsageOverviewAdapters } = await adapters()
  const { getUsageMiniTrend } = await import('../src/domain/usageMiniTrend.js')
  const source = createDailyReportApi({
    overviewRows: [
      { date: '2026-11-01', queries: 4, tasks: 3, taskSuccess: 2, firstTokenSeconds: 4 },
      { date: '2026-11-02', queries: 0, tasks: 0, taskSuccess: 0, firstTokenSeconds: null },
      { date: '2026-11-03', queries: 8, tasks: 5, taskSuccess: 4, firstTokenSeconds: 2 },
    ],
    detailRows: [],
  })
  const result = createUsageOverviewAdapters({ dailyApi: source }).getDailyPeriodOverview({ startDate: '2026-11-01', endDate: '2026-11-03' })
  assert.deepEqual(result.points.map(point => point.taskSuccessRate), [2 / 3, 0, 4 / 5])
  assert.deepEqual(result.points.map(point => point.firstTokenSeconds), [4, 0, 2])
  assert.equal(result.current.taskSuccessRate, 6 / 8)
  assert.equal(result.current.firstTokenSeconds, 8 / 3)
  for (const key of ['taskSuccessRate', 'firstTokenSeconds']) {
    const line = getUsageMiniTrend([{ key, label: key, values: result.points.map(point => point[key]) }]).series[0]
    assert.equal(line.segments.length, 1)
    assert.equal(line.segments[0].points.length, 3)
    assert.equal(line.segments[0].points[1].value, 0)
  }
  const emptyDay = createUsageOverviewAdapters({ dailyApi: source }).getDailyPeriodOverview({ startDate: '2026-11-02', endDate: '2026-11-02' })
  assert.equal(emptyDay.current.taskSuccessRate, null, 'No denominator is invented for the aggregate')
  assert.equal(emptyDay.current.firstTokenSeconds, null)
  assert.equal(source.getDailyOverview({ startDate: '2026-11-02', endDate: '2026-11-02' }).dailyRows[0].firstTokenSeconds, null, 'Source remains unchanged')
})

test('real thirty-day task-rate and first-token trends connect known zero days while retaining positive values', async () => {
  const { getDailyPeriodOverview } = await adapters()
  const { getUsageMiniTrend } = await import('../src/domain/usageMiniTrend.js')
  const result = getDailyPeriodOverview({ startDate: '2026-10-07', endDate: '2026-11-05' })
  const october12 = result.points.find(point => point.date === '2026-10-12')
  assert.equal(october12.taskSuccessRate, 0)
  assert.equal(october12.firstTokenSeconds, 3.25, 'Query activity is independent of task activity')
  for (const key of ['taskSuccessRate', 'firstTokenSeconds']) {
    const line = getUsageMiniTrend([{ key, label: key, values: result.points.map(point => point[key]) }]).series[0]
    assert.equal(line.segments.length, 1, key)
    assert.equal(line.segments[0].points.length, 30, key)
  }
  const october31 = result.points.find(point => point.date === '2026-10-31')
  assert.equal(october31.taskSuccessRate, 0)
  assert.equal(october31.firstTokenSeconds, 0)
})

test('a reported active day with unavailable values is not rewritten as a zero-activity day', async () => {
  const { createDailyReportApi } = await import('../src/domain/usageDailyReport.js')
  const { createUsageOverviewAdapters } = await adapters()
  const source = createDailyReportApi({
    overviewRows: [{ date: '2026-11-02', queries: 4, tasks: 3, taskSuccess: null, firstTokenSeconds: null }],
    detailRows: [],
  })
  const result = createUsageOverviewAdapters({ dailyApi: source }).getDailyPeriodOverview({ startDate: '2026-11-02', endDate: '2026-11-02' })
  assert.equal(result.points[0].taskSuccessRate, null)
  assert.equal(result.points[0].firstTokenSeconds, null)
})

test('daily missing cutoff never falls back to an earlier stock or fills the daily point with zero', async () => {
  const { createUsageOverviewAdapters } = await adapters()
  const api = createUsageOverviewAdapters({ dailyApi: await gappedDaily() })
  const result = api.getDailyPeriodOverview({ startDate: '2026-11-01', endDate: '2026-11-02' })
  assert.equal(result.current.totalSkills, null, 'November1 inventory is not a November2 snapshot')
  assert.equal(result.current.queries, null)
  assert.equal(result.points[1].date, '2026-11-02')
  assert.equal(result.points[1].queries, null)
  assert.equal(result.points[1].totalSkills, null)
})

test('a core-data hole makes cumulative daily metrics unknown while an exact cutoff stock stays known', async () => {
  const { createUsageOverviewAdapters } = await adapters()
  const api = createUsageOverviewAdapters({ dailyApi: await gappedDaily() })
  const result = api.getDailyPeriodOverview({ startDate: '2026-11-01', endDate: '2026-11-03' })
  for (const key of ['queries', 'tasks', 'taskSuccessRate', 'newSkills', 'calls', 'success', 'failed', 'successRate', 'firstTokenSeconds']) {
    assert.equal(result.current[key], null, key)
  }
  assert.equal(result.current.totalSkills, 14)
})

test('sample records use the unfiltered catalog and keep unmodeled tasks unknown', async () => {
  const { getSamplePeriodOverview } = await adapters()
  const result = getSamplePeriodOverview({ startDate: '2026-11-03', endDate: '2026-11-03' })
  assert.equal(result.current.totalSkills, 9)
  assert.equal(result.current.calledSkills, 6)
  assert.equal(result.current.creatorCount, 5)
  assert.equal(result.current.queries, 20)
  assert.equal(result.current.queriesPerUser, 20 / 13)
  assert.equal(result.current.tasks, null)
  assert.equal(result.current.taskSuccessRate, null)
  assert.equal(result.points[0].tasks, null)
  assert.equal(result.current.likeRate, 1)
})

test('sample history outside the ninety-day source range stays missing instead of becoming an empty report', async () => {
  const { getSamplePeriodOverview } = await adapters()
  const earliest = getSamplePeriodOverview({ startDate: '2026-08-07', endDate: '2026-08-08' })
  assert.equal(earliest.previousStartDate, '2026-08-05')
  assert.equal(earliest.previousEndDate, '2026-08-06')
  assert.equal(earliest.previous, null)
  assert.equal(earliest.changes.queries.reason, 'missing')
  const outside = getSamplePeriodOverview({ startDate: '2026-08-06', endDate: '2026-08-07' })
  assert.equal(outside.current, null)
  assert.equal(outside.points[0].queries, null)
  assert.equal(typeof outside.points[1].queries, 'number')
  assert.equal(getSamplePeriodOverview({ startDate: '2026-11-05', endDate: '2026-11-05' }).current, null)
})

test('an entirely unavailable period preserves every metric as an explicit unknown daily point and change', async () => {
  const { getSamplePeriodOverview } = await adapters()
  const result = getSamplePeriodOverview({ startDate: '2027-01-01', endDate: '2027-01-02' })
  assert.equal(result.current, null)
  assert.equal(result.previous, null)
  for (const key of ['queries', 'queriesPerUser', 'tasks', 'taskSuccessRate', 'firstTokenSeconds', 'totalSkills', 'newSkills', 'calledSkills', 'creatorCount', 'calls', 'success', 'failed', 'successRate', 'likeRate', 'skillCallRate']) {
    assert.equal(result.points[0][key], null, key)
    assert.equal(result.changes[key].value, null, key)
    assert.equal(result.changes[key].reason, 'missing', key)
  }
})

test('single-day aggregate and trend callbacks share one cached source read per date', async () => {
  const { createUsageOverviewAdapters } = await adapters()
  const source = await gappedDaily()
  let overviewReads = 0
  let analysisReads = 0
  const api = createUsageOverviewAdapters({ dailyApi: {
    getDailyOverview: options => { overviewReads++; return source.getDailyOverview(options) },
    getDailyAnalysis: options => { analysisReads++; return source.getDailyAnalysis(options) },
  } })
  const result = api.getDailyPeriodOverview({ startDate: '2026-11-03', endDate: '2026-11-03' })
  assert.equal(result.current.queries, 8)
  assert.equal(result.points[0].queries, 8)
  assert.equal(overviewReads, 2, 'Current day and prior day are each read once')
  assert.equal(analysisReads, 2)
})

test('daily Skill call rate divides each period unique Skill count by its exact cutoff stock and compares percentage points', async () => {
  const { createDailyReportApi } = await import('../src/domain/usageDailyReport.js')
  const { createUsageOverviewAdapters } = await adapters()
  const source = createDailyReportApi({
    overviewRows: [
      { date: '2026-11-01', totalSkills: 4, calls: 1 },
      { date: '2026-11-02', totalSkills: 8, calls: 1 },
      { date: '2026-11-03', totalSkills: 10, calls: 1 },
      { date: '2026-11-04', totalSkills: 20, calls: 2 },
    ],
    detailRows: [
      { date: '2026-11-01', skillId: 'one', creatorId: 'alice', calls: 1 },
      { date: '2026-11-02', skillId: 'one', creatorId: 'alice', calls: 1 },
      { date: '2026-11-03', skillId: 'two', creatorId: 'alice', calls: 1 },
      { date: '2026-11-04', skillId: 'two', creatorId: 'alice', calls: 1 },
      { date: '2026-11-04', skillId: 'three', creatorId: 'alice', calls: 1 },
    ],
  })
  const result = createUsageOverviewAdapters({ dailyApi: source }).getDailyPeriodOverview({ startDate: '2026-11-03', endDate: '2026-11-04' })
  assert.equal(result.current.calledSkills, 2, 'A Skill repeated across days counts once in the selected period')
  assert.equal(result.current.skillCallRate, 2 / 20)
  assert.equal(result.previous.skillCallRate, 1 / 8)
  assert.ok(Math.abs(result.changes.skillCallRate.difference + 2.5) < 1e-12)
  assert.deepEqual(result.points.map(point => point.skillCallRate), [1 / 10, 2 / 20])
  assert.equal(result.current.creatorCount, 1, 'Creator count stays available in the underlying model')
})

test('sample Skill call rate independently uses the selected period and each daily catalog rather than averaging daily rates', async () => {
  const { getSamplePeriodOverview } = await adapters()
  const result = getSamplePeriodOverview({ startDate: '2026-11-03', endDate: '2026-11-04' })
  assert.equal(result.current.skillCallRate, 10 / 10)
  assert.equal(result.previous.skillCallRate, 9 / 9)
  assert.equal(result.changes.skillCallRate.difference, 0)
  assert.deepEqual(result.points.map(point => point.skillCallRate), [6 / 9, 10 / 10])
  assert.equal(result.current.creatorCount, 5)
})

test('Skill call rates reject missing, zero and inconsistent stocks while a known zero numerator remains zero in both sources', async () => {
  const { createDailyReportApi } = await import('../src/domain/usageDailyReport.js')
  const sample = await import('../src/domain/usageDashboard.js')
  const { createUsageOverviewAdapters } = await adapters()
  for (const scenario of [
    { stock: 0, called: 0, expected: null },
    { stock: null, called: 0, expected: null },
    { stock: 10, called: null, expected: null },
    { stock: 1, called: 2, expected: null },
    { stock: Infinity, called: 0, expected: null },
    { stock: 10, called: 0, expected: 0 },
  ]) {
    const dailyApi = createDailyReportApi({
      overviewRows: ['2026-11-02', '2026-11-03'].map(date => ({ date, totalSkills: scenario.stock, calls: scenario.called })),
      detailRows: ['2026-11-02', '2026-11-03'].flatMap(date => ['one', 'two'].map((skillId, index) => ({ date, skillId, creatorId: 'alice', calls: scenario.called == null ? null : index < scenario.called ? 1 : 0 }))),
    })
    const api = createUsageOverviewAdapters({ dailyApi, sampleApi: {
      getUsageReport: options => {
        const report = sample.getUsageReport(options)
        return { ...report, summary: { ...report.summary, publishedSkills: scenario.stock } }
      },
      getUsageAnalysis: options => {
        const analysis = sample.getUsageAnalysis(options)
        return { ...analysis, summary: { ...analysis.summary, calledSkills: scenario.called } }
      },
    } })
    for (const getOverview of [api.getDailyPeriodOverview, api.getSamplePeriodOverview]) {
      const result = getOverview({ startDate: '2026-11-03', endDate: '2026-11-03' })
      assert.equal(result.current.skillCallRate, scenario.expected)
      assert.equal(result.previous.skillCallRate, scenario.expected)
      assert.equal(result.points[0].skillCallRate, scenario.expected)
      assert.equal(result.changes.skillCallRate.difference, scenario.expected == null ? null : 0)
    }
  }
})

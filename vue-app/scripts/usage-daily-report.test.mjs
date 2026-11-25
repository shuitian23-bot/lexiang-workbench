import assert from 'node:assert/strict'
import test from 'node:test'
import { register } from 'node:module'

// Vite accepts static JSON imports. Supply Node's equivalent import attribute
// here without adding unsupported syntax to the project's production parser.
// module.register is supported across Node 22, including before 22.15.
register(`data:text/javascript,${encodeURIComponent(`
  export async function resolve(specifier, context, nextResolve) {
    const result = await nextResolve(specifier, context)
    return result.url.endsWith('/usageDailyReportData.json')
      ? { ...result, importAttributes: { type: 'json' } } : result
  }
`)}`, import.meta.url)

test('business scope excludes whole Skill identities across dates and recomputes supported aggregates', async () => {
  const api = await import('../src/domain/usageDailyReport.js')
  const overviewRows = [{ date: '2026-11-04', queries: 12, calls: 10, success: 10, failed: 0, totalSkills: 20, newSkills: 2 }, { date: '2026-11-05', queries: 9, calls: 7, success: 7, failed: 0, totalSkills: 22, newSkills: 2 }]
  const detail = (date, skillId, creatorId, calls) => ({ date, skillId, creatorId, creator: creatorId || '未标注', creatorKnown: !!creatorId, calls, success: calls, failed: 0, likes: 0, dislikes: 0, feedbackCount: 0 })
  const dataset = { overviewRows, detailRows: [detail('2026-11-04', 'good', 'alice', 2), detail('2026-11-04', 'bad', 'xinghy4', 3), detail('2026-11-04', 'unknown', '', 5), detail('2026-11-05', 'good', 'alice', 4), detail('2026-11-05', 'bad', 'bob', 3)] }
  const before = structuredClone(dataset)
  const range = { startDate: '2026-11-04', endDate: '2026-11-05' }
  const scoped = api.createDailyReportApi(dataset, { excludeSkillCreators: true })
  const report = scoped.getDailyAnalysis(range)
  assert.deepEqual(report.skills.map(row => row.id), ['good'])
  assert.deepEqual(report.creators.map(row => row.id), ['alice'])
  assert.equal(report.summary.calls, 6)
  assert.deepEqual(report.trend.map(row => row.calls), [2, 4])
  assert.equal(scoped.getDailyAnalysis({ ...range, skillId: 'bad' }).skills.length, 0)
  assert.equal(scoped.getDailyAnalysis({ ...range, creatorId: 'xinghy4' }).creators.length, 0)
  const overview = scoped.getDailyOverview(range)
  assert.equal(overview.summary.calls, 6)
  assert.equal(overview.summary.success, 6)
  assert.equal(overview.summary.queries, 21, 'Query remains a separately labelled platform aggregate')
  assert.equal(overview.summary.totalSkills, null)
  assert.equal(overview.summary.newSkills, null)
  assert.equal(report.creators[0].skillCallRate, null)
  assert.deepEqual(dataset, before)
  const lines = api.dailyCreatorRowsToCsv(report.creators).replace(/^\uFEFF/, '').split('\r\n').map(line => line.split(','))
  const at = lines[0].indexOf('Skill调用率')
  assert.ok(at > 0)
  assert.equal(lines[1][at], '')
  assert.ok(!api.dailySkillRowsToCsv(report.skills).includes('xinghy4'))
  assert.ok(!api.dailySkillRowsToCsv(report.skills).includes('unknown'))
})

test('distinguishes creator inventory from called Skills and preserves missing call counts in CSV', async () => {
  const api = await import('../src/domain/usageDailyReport.js')
  const scope = { startDate: '2026-11-04', endDate: '2026-11-05', dimension: 'creators' }
  const overviewRows = [{ date: scope.startDate }, { date: scope.endDate }]
  const ownership = { creatorId: 'alice', creator: 'alice', module: '会员管理' }
  const daily = api.createDailyReportApi({ overviewRows, detailRows: [
    { date: scope.startDate, skillId: 'used', ...ownership, calls: 2 },
    { date: scope.endDate, skillId: 'used', ...ownership, calls: 3 },
    { date: scope.endDate, skillId: 'not-called', ...ownership, calls: 0 },
  ] })
  const creator = daily.getDailyAnalysis(scope).creators[0]
  assert.equal(creator.skillCount, 2, 'Observed identities include the zero-call Skill and deduplicate days')
  assert.equal(creator.calledSkills, 1, 'Only the distinct Skill with positive calls was called')
  assert.equal(creator.createdSkills, null, 'Call reports cannot reveal the full creator inventory')

  const [header, values] = api.dailyCreatorRowsToCsv([creator]).split('\r\n').map(line => line.replace(/^\uFEFF/, '').split(','))
  const inventoryIndex = header.indexOf('创建总量')
  assert.ok(inventoryIndex >= 0)
  assert.deepEqual(header.slice(inventoryIndex, inventoryIndex + 2), ['创建总量', '被调用Skill数'])
  assert.deepEqual(values.slice(inventoryIndex, inventoryIndex + 2), ['', '1'])

  const incomplete = api.createDailyReportApi({ overviewRows, detailRows: [
    { date: scope.startDate, skillId: 'unknown-calls', ...ownership, calls: null },
    { date: scope.endDate, skillId: 'not-called', ...ownership, calls: 0 },
  ] }).getDailyAnalysis(scope).creators[0]
  assert.equal(incomplete.calledSkills, null, 'Missing calls do not prove that zero Skills were called')
  assert.equal(incomplete.createdSkills, null)
  const incompleteValues = api.dailyCreatorRowsToCsv([incomplete]).split('\r\n')[1].split(',')
  assert.deepEqual(incompleteValues.slice(inventoryIndex, inventoryIndex + 2), ['', ''])
})

test('daily-report API preserves source aggregates without inventing deduplicated users', async (t) => {
  let api
  try {
    const module = await import('../src/domain/usageDailyReport.js')
    const { default: source } = await import('../src/domain/usageDailyReportData.json')
    // Source provenance/parser tests verify the imported snapshot before exclusions.
    // Business exclusions have a separate runtime contract above and below.
    api = { ...module, ...module.createDailyReportApi(source) }
  }
  catch (error) { assert.fail(`The real daily-report API must exist: ${error.message}`) }

  await t.test('keeps the supplied source provenance and both distinct coverage ranges', () => {
    assert.equal(api.USAGE_DAILY_SOURCE.filename, 'aiwork日报-20261124.xlsx')
    assert.equal(api.USAGE_DAILY_SOURCE.sha256, 'a8259fbade7b18fc181c50bdc11ad80cdd54b4a542b26ef590fa48a759786097')
    assert.deepEqual(api.USAGE_DAILY_SOURCE.reportDetailRange, { startDate: '2026-10-27', endDate: '2026-11-24' })
    assert.deepEqual(api.USAGE_DAILY_SOURCE.detailRange, { startDate: '2026-10-08', endDate: '2026-11-24' })
    assert.deepEqual(api.USAGE_DAILY_SOURCE.detailHistory, {
      filename: 'aiwork日报-20261105.xlsx',
      sha256: '681df3d465f49298ea73e9493d0d3cc389a0c1a1c1b6c3f93a5abc2586bcf080',
      startDate: '2026-10-08', endDate: '2026-10-26', detailRows: 56,
    })
    assert.deepEqual(api.USAGE_DAILY_SOURCE.counts, { overviewRows: 99, detailRows: 267, skills: 86, creators: 15, unknownCreatorRows: 29, missingModuleRows: 48 })
    assert.equal(api.USAGE_DAILY_START_DATE, '2026-08-18')
    assert.equal(api.USAGE_DAILY_END_DATE, '2026-11-24')
    assert.equal(api.USAGE_DAILY_DEFINITIONS.length, 35)
  })

  await t.test('sums additive metrics but uses the cutoff snapshot and original rolling counts', () => {
    const report = api.getDailyOverview()
    assert.equal(report.startDate, '2026-11-18')
    assert.equal(report.endDate, '2026-11-24')
    assert.deepEqual(report.windows, { login: { dau: 57, wau: 112, mau: 156 }, ai: { dau: 8, wau: 34, mau: 68 } })
    for (const [key, expected] of Object.entries({ queries: 192, tasks: 136, taskSuccess: 118, taskFailed: 18, calls: 155, success: 136, failed: 19, newSkills: 0, totalUsers: 267, totalSkills: 152 })) assert.equal(report.summary[key], expected, key)
    assert.equal(report.summary.asOfDate, '2026-11-24')
    assert.equal(report.summary.loginUsers, null)
    assert.equal(report.summary.aiUsers, null)
    assert.equal(report.summary.calledSkills, null)
    assert.equal(report.dailyRows.at(-1).loginWauRate, 0.4195)
    assert.equal(report.dailyRows.at(-1).aiWauRate, 0.1273)
    assert.equal(report.summary.taskSuccessRate, 118 / 136)
    assert.equal(report.summary.successRate, 136 / 155)
    assert.ok(Math.abs(report.summary.firstTokenSeconds - 6.443958333333334) < 1e-12)
    assert.equal(report.quality.firstTokenEstimated, true)
    assert.equal(report.quality.missingQueryCount, 0)
  })

  await t.test('retains all twenty source overview fields and true zero-query missing latency', () => {
    const report = api.getDailyOverview({ startDate: '2026-10-31', endDate: '2026-10-31' })
    assert.equal(report.dailyRows[0].queries, 0)
    assert.equal(report.dailyRows[0].firstTokenSeconds, null)
    assert.equal(report.summary.firstTokenSeconds, null)
    assert.equal(report.summary.successRate, null)
    assert.equal(report.summary.taskSuccessRate, null)
    assert.equal(report.quality.missingQueryCount, 0)
  })

  await t.test('does not turn a missing positive-query latency into zero or a complete weighted mean', () => {
    const { getDailyOverview } = api.createDailyReportApi({
      overviewRows: [
        { date: '2026-11-04', queries: 3, firstTokenSeconds: 2 },
        { date: '2026-11-05', queries: 2, firstTokenSeconds: null },
      ], detailRows: [],
    })
    const report = getDailyOverview({ startDate: '2026-11-04', endDate: '2026-11-05' })
    assert.equal(report.summary.firstTokenSeconds, null)
    assert.equal(report.quality.missingQueryCount, 2)
    assert.deepEqual(report.quality.missingLatencyDates, ['2026-11-05'])
  })

  await t.test('keeps unknown attribution on its original rows rather than borrowing another day', () => {
    const report = api.getDailyAnalysis({ startDate: '2026-10-08', endDate: '2026-11-05' })
    assert.equal(report.dailyRows.length, 148)
    assert.equal(report.summary.skillCount, 66)
    assert.equal(report.summary.creatorCount, 13)
    assert.equal(report.quality.unknownCreatorRows, 18)
    assert.equal(report.quality.missingModuleRows, 28)
    assert.ok(report.creators.every(row => row.id !== 'unattributed'))
    assert.equal(report.dailyRows.find(row => row.skillId === 'report-generator').creatorId, 'unattributed')
    assert.equal(report.dailyRows.find(row => row.skillId === 'report-generator').module, '未标注')
    assert.equal(report.summary.newSkills, null)
    assert.equal(report.summary.users, null)
    assert.deepEqual(report.calls, [])
    assert.ok(report.creators.every(row => row.users === null))
  })

  await t.test('aggregates success and feedback from counts, and never adds distinct users', () => {
    const report = api.getDailyAnalysis({ startDate: '2026-10-08', endDate: '2026-11-05' })
    assert.equal(report.summary.calls, 376)
    assert.equal(report.summary.success, 353)
    assert.equal(report.summary.failed, 23)
    assert.equal(report.summary.likes, 1)
    assert.equal(report.summary.dislikes, 0)
    assert.equal(report.summary.likeRate, 1)
    assert.equal(report.summary.successRate, 353 / 376)
    const lastDay = api.getDailyAnalysis({ startDate: '2026-11-05', endDate: '2026-11-05' })
    assert.equal(lastDay.summary.calls, 30)
    assert.ok(lastDay.skills.every(row => row.users >= 1))
    assert.ok(report.skills.filter(row => row.activeDays > 1).every(row => row.users === null))
    assert.ok(report.skills.filter(row => row.feedbackCount === 0).every(row => row.likeRate === null))
  })

  await t.test('combines date, module, creator, Skill and case-insensitive search on real daily rows', () => {
    const report = api.getDailyAnalysis({ startDate: '2026-10-08', endDate: '2026-10-08', module: 'CMSSaaS', creatorId: 'zhangcj21', skillId: 'form-data-query-export', search: ' FORM-DATA ' })
    assert.equal(report.dailyRows.length, 1)
    assert.equal(report.summary.calls, 5)
    assert.equal(report.skills[0].users, 1)
    assert.equal(report.creators[0].users, null)
    assert.equal(report.summary.creatorCount, 1)
    const none = api.getDailyAnalysis({ module: '不存在' })
    assert.equal(none.summary.calls, 0)
    assert.deepEqual(none.skills, [])
    assert.equal(none.summary.successRate, null)
  })

  await t.test('counts Skill identities in scope rather than daily rows and excludes unknown creators', () => {
    const report = api.getDailyAnalysis({ startDate: '2026-10-08', endDate: '2026-11-05', creatorId: 'unattributed' })
    assert.equal(report.dailyRows.length, 18)
    assert.equal(report.summary.creatorCount, 0)
    assert.ok(report.summary.skillCount < report.dailyRows.length)
    assert.ok(report.dailyRows.every(row => row.creatorKnown === false))
  })

  await t.test('searches creator identities without reducing their contribution to matching Skill names', () => {
    const scope = { startDate: '2026-10-08', endDate: '2026-11-05' }
    const creator = api.getDailyAnalysis({ ...scope, dimension: 'creators', search: ' ZHANGCJ21 ' })
    assert.equal(creator.dailyRows.length, 13)
    assert.equal(creator.summary.calls, 27)
    assert.equal(creator.summary.skillCount, 7)
    const scopedCreator = api.getDailyAnalysis({ startDate: '2026-10-21', endDate: '2026-10-28', module: '内容管理', dimension: 'creators', search: 'zhangcj21' })
    assert.equal(scopedCreator.dailyRows.length, 6)
    assert.equal(scopedCreator.summary.calls, 9)
    assert.equal(scopedCreator.summary.skillCount, 3)
    const wrongDimension = api.getDailyAnalysis({ ...scope, dimension: 'creators', search: 'form-data-query-export' })
    assert.deepEqual(wrongDimension.creators, [])
    assert.deepEqual(wrongDimension.dailyRows, [])
    const skills = api.getDailyAnalysis({ ...scope, dimension: 'skills', search: 'form-data-query-export' })
    assert.equal(skills.dailyRows.length, 3)
    assert.equal(skills.summary.calls, 13)
  })

  await t.test('excludes unattributed contributions consistently from creator tables, quality, totals and exports', () => {
    const scope = { startDate: '2026-10-08', endDate: '2026-11-05' }
    const skills = api.getDailyAnalysis(scope)
    const creators = api.getDailyAnalysis({ ...scope, dimension: 'creators' })
    const knownRows = skills.dailyRows.filter(row => row.creatorKnown && row.creatorId !== 'unattributed')
    assert.equal(skills.dailyRows.length, 148, 'Skill analysis keeps every original daily row')
    assert.equal(skills.summary.calls, 376, 'Skill totals remain unchanged')
    assert.deepEqual(creators.dailyRows, knownRows)
    assert.equal(creators.creators.length, 13)
    assert.equal(creators.summary.creatorCount, creators.creators.length)
    for (const key of ['calls', 'success', 'failed', 'likes', 'dislikes', 'feedbackCount']) {
      const expected = knownRows.reduce((sum, row) => sum + row[key], 0)
      assert.equal(creators.summary[key], expected, key)
      assert.equal(creators.creators.reduce((sum, row) => sum + row[key], 0), expected, `creator groups: ${key}`)
      assert.equal(creators.trend.reduce((sum, row) => sum + row[key], 0), expected, `daily trend: ${key}`)
    }
    assert.equal(creators.summary.successRate, creators.summary.success / creators.summary.calls)
    assert.ok(creators.creators.every(row => row.id !== 'unattributed' && row.name !== '未标注'))
    const creatorCsv = api.dailyCreatorRowsToCsv(creators.creators).split('\r\n').slice(1)
    assert.equal(creatorCsv.length, 13)
    assert.ok(creatorCsv.every(line => !/^(?:未标注|unattributed),/.test(line)))
    const unknown = api.getDailyAnalysis({ ...scope, dimension: 'creators', search: '未标注' })
    assert.deepEqual(unknown.dailyRows, [])
    assert.deepEqual(unknown.creators, [])
    assert.equal(unknown.summary.calls, 0)
    assert.equal(unknown.summary.successRate, null)
  })

  await t.test('keeps a known creator with a missing menu while excluding unknown and reserved creator identities', () => {
    const date = '2026-11-05'
    const daily = api.createDailyReportApi({ overviewRows: [{ date }], detailRows: [
      { date, skillId: 'known', creatorId: 'alice', creator: 'alice', calls: 5 },
      { date, skillId: 'missing', calls: 8 },
      { date, skillId: 'flagged-unknown', creatorId: 'not-confirmed', creator: '未标注', creatorKnown: false, calls: 3 },
      { date, skillId: 'reserved', creatorId: 'unattributed', creator: '未标注', creatorKnown: true, calls: 9 },
    ] })
    const scope = { startDate: date, endDate: date }
    const creators = daily.getDailyAnalysis({ ...scope, dimension: 'creators' })
    assert.deepEqual(creators.dailyRows.map(row => row.skillId), ['known'])
    assert.equal(creators.creators[0].id, 'alice')
    assert.equal(creators.creators[0].module, '未标注', 'Missing menu does not discard a known creator')
    assert.equal(creators.summary.calls, 5)
    assert.equal(daily.getDailyAnalysis(scope).dailyRows.length, 4, 'Raw Skill contributions are preserved')
    assert.deepEqual(daily.getDailyAnalysis({ ...scope, dimension: 'creators', creatorId: 'unattributed' }).dailyRows, [])
  })

  await t.test('reconciles historical and latest detail, accepting zero-call dates without rows', () => {
    const report = api.getDailyOverview({ startDate: '2026-10-08', endDate: '2026-11-24' })
    assert.equal(report.reconciliation.length, 48)
    assert.ok(report.reconciliation.every(row => row.matches))
    assert.equal(report.reconciliation.find(row => row.date === '2026-10-11').detailCalls, 0)
    assert.equal(report.reconciliation.find(row => row.date === '2026-10-26').detailCalls, 20)
    assert.equal(report.reconciliation.find(row => row.date === '2026-10-27').detailCalls, 44)
    assert.equal(report.reconciliation.find(row => row.date === '2026-11-24').detailCalls, 24)
    const custom = api.createDailyReportApi({ overviewRows: [{ date: '2026-11-05', calls: 5, queries: 0 }], detailRows: [{ date: '2026-11-05', skillId: 'one', calls: 3 }] }).getDailyOverview({ startDate: '2026-11-05', endDate: '2026-11-05' })
    assert.equal(custom.reconciliation[0].delta, -2)
    assert.equal(custom.reconciliation[0].matches, false)
  })

  await t.test('rejects malformed, reversed and out-of-range windows without stale snapshots', () => {
    for (const [startDate, endDate] of [['2026-02-30', '2026-11-05'], ['2026-11-05', '2026-11-04'], ['2026-08-01', '2026-11-05'], ['2026-11-24', '2026-11-25']]) {
      const overview = api.getDailyOverview({ startDate, endDate })
      assert.deepEqual(overview.dailyRows, [])
      assert.equal(overview.summary.totalUsers, null)
      assert.equal(overview.summary.asOfDate, null)
      assert.ok(overview.quality.dateError)
    }
    const early = api.getDailyAnalysis({ startDate: '2026-08-18', endDate: '2026-08-18' })
    assert.deepEqual(early.dailyRows, [])
    assert.equal(early.summary.calls, null)
    assert.equal(early.summary.skillCount, null)
    assert.equal(early.quality.detailCoverageStart, '2026-10-08')
  })

  await t.test('exports aggregate and daily rows with empty unknown metrics and safe formula cells', () => {
    const daily = api.getDailyOverview({ startDate: '2026-11-05', endDate: '2026-11-05' })
    assert.ok(api.dailyOverviewToCsv(daily.dailyRows).includes('2026-11-05,59,117,145,11,29,43,255,45.88%,11.37%,36,24,20,4,138,2,8,30,25,5,3.67'))
    const report = api.getDailyAnalysis({ startDate: '2026-10-08', endDate: '2026-11-05' })
    const skillCsv = api.dailySkillRowsToCsv([{ ...report.skills[0], name: '=1+1', users: null }])
    assert.ok(skillCsv.includes("'=1+1"))
    assert.ok(!skillCsv.includes('null'))
    assert.equal(api.dailyCreatorRowsToCsv(report.creators).split('\r\n').length, report.creators.length + 1)
    assert.equal(api.dailyDetailRowsToCsv(report.dailyRows).split('\r\n').length, 149)
  })

  await t.test('returns detached objects so a view cannot modify later reports', () => {
    const report = api.getDailyOverview()
    report.dailyRows[0].queries = -1
    report.summary.totalUsers = -1
    assert.equal(api.getDailyOverview().dailyRows[0].queries, 19)
    assert.equal(api.getDailyOverview().summary.totalUsers, 267)
    const details = api.getDailyAnalysis()
    details.dailyRows[0].name = 'changed'
    assert.notEqual(api.getDailyAnalysis().dailyRows[0].name, 'changed')
  })
})

test('published daily API consistently removes excluded Skill data from overview, lists, filters and exports', async () => {
  const api = await import('../src/domain/usageDailyReport.js')
  const report = api.getDailyAnalysis()
  assert.equal(report.summary.calls, 71)
  assert.equal(report.summary.success, 67)
  assert.equal(report.creators.length, 7)
  assert.equal(report.skills.length, 17)
  const excludedCreators = ['xinghy4', 'yuanming3', 'yanxw1', 'unattributed']
  assert.ok(report.dailyRows.every(row => row.creatorKnown && !excludedCreators.includes(row.creatorId)))
  assert.equal(report.trend.reduce((sum, row) => sum + row.calls, 0), 71)
  assert.equal(api.getDailyOverview().summary.calls, report.summary.calls)
  assert.equal(api.getDailyOverview().summary.totalSkills, null)
  assert.equal(api.getDailyOverview().summary.newSkills, null)
  assert.ok(report.creators.every(row => row.skillCallRate === null))
  for (const creatorId of excludedCreators) {
    assert.deepEqual(api.getDailyAnalysis({ creatorId }).dailyRows, [])
  }
  assert.equal(api.getDailyOverview().summary.queries, 192)
  assert.equal(api.getDailyOverview().summary.tasks, 136)
  for (const skillId of ['chatbi-analysis', 'data-query', 'pg-data-query', 'all-data-analysis', 'operation-overview']) {
    assert.deepEqual(api.getDailyAnalysis({ skillId }).dailyRows, [])
  }
  for (const csv of [api.dailyCreatorRowsToCsv(report.creators), api.dailySkillRowsToCsv(report.skills)]) {
    assert.ok(excludedCreators.every(creatorId => !csv.includes(creatorId)))
    assert.ok(!csv.includes('chatbi-analysis'))
  }
  const full = api.getDailyAnalysis({ startDate: '2026-10-08', endDate: '2026-11-05' })
  assert.equal(full.summary.calls, 296)
  assert.ok(full.dailyRows.every(row => row.creatorKnown && row.creatorId !== 'xinghy4'))
  const recentMonth = api.getDailyAnalysis({ startDate: '2026-10-26', endDate: '2026-11-24' })
  assert.equal(recentMonth.quality.detailCoveragePartial, false)
  assert.equal(recentMonth.summary.calls, 451)
  assert.equal(recentMonth.summary.success, 429)
  assert.ok(recentMonth.dailyRows.every(row => !excludedCreators.includes(row.creatorId)))
})

test('Skill statistics exclusions do not revoke existing verified creator admission', async () => {
  const api = await import('../src/domain/usageDailyReport.js')
  const { resolveUsageDashboardAccess, canViewUsageDashboard, canExportUsageRows } = await import('../src/domain/usageDashboardAccess.js')
  assert.ok(Array.isArray(api.USAGE_DAILY_CREATOR_EVIDENCE), 'Admission evidence must remain independent of filtered statistics')
  const access = resolveUsageDashboardAccess({ identity: { verified: true, userId: 'xinghy4', permissions: [] }, creatorEvidence: api.USAGE_DAILY_CREATOR_EVIDENCE })
  assert.equal(access.scope, 'person')
  assert.equal(canViewUsageDashboard(access, 'rankings'), true)
  assert.equal(canViewUsageDashboard(access, 'overview'), false)
  const own = api.getDailyAnalysis({ creatorId: 'xinghy4' })
  assert.deepEqual(own.skills, [])
  assert.deepEqual(own.creators, [])
  assert.equal(canExportUsageRows(access, own.creators, 'creators'), false)
  assert.ok(api.USAGE_DAILY_CREATOR_EVIDENCE.every(row => row.creatorId !== 'unattributed'))
})

test('unreconciled internal days stay unknown in filtered overview, analysis and daily trends', async () => {
  const { createDailyReportApi } = await import('../src/domain/usageDailyReport.js')
  const dates = ['2026-11-03', '2026-11-04', '2026-11-05']
  const scoped = createDailyReportApi({
    overviewRows: dates.map(date => ({ date, calls: 2, success: 2, failed: 0 })),
    detailRows: [dates[0], dates[2]].map(date => ({ date, skillId: 'kept', creatorId: 'alice', creator: 'alice', calls: 2, success: 2, failed: 0 })),
  }, { excludeSkillCreators: true })
  const options = { startDate: dates[0], endDate: dates[2] }
  const analysis = scoped.getDailyAnalysis(options)
  assert.equal(scoped.getDailyOverview(options).summary.calls, null)
  assert.equal(analysis.summary.calls, null)
  assert.equal(analysis.summary.successRate, null)
  assert.equal(analysis.summary.skillCount, null)
  assert.equal(analysis.quality.detailCoveragePartial, true)
  assert.deepEqual(analysis.trend.map(row => row.calls), [2, null, 2])
  assert.deepEqual(analysis.quality.missingDetailDates, [dates[1]])
})

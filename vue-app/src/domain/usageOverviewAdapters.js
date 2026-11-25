import { getDailyOverview, getDailyAnalysis } from './usageDailyReport.js'
import { getUsageReport, getUsageAnalysis, USAGE_ANCHOR_DATE } from './usageDashboard.js'
import { getUsagePeriodOverview } from './usagePeriodOverview.js'

const DAY_MS = 86400000
const SAMPLE_START_DATE = new Date(Date.parse(`${USAGE_ANCHOR_DATE}T00:00:00Z`) - 89 * DAY_MS).toISOString().slice(0, 10)
const RATE_KEYS = ['taskSuccessRate', 'successRate', 'likeRate', 'skillCallRate']
const CORE_METRICS = /** @type {const} */ (['queries', 'tasks', 'taskSuccessRate', 'firstTokenSeconds', 'newSkills', 'calls', 'success', 'failed', 'successRate'])
const METRIC_KEYS = [...CORE_METRICS, 'queriesPerUser', 'totalSkills', 'calledSkills', 'creatorCount', 'likeRate', 'skillCallRate']

/** @param {number|null|undefined} top @param {number|null|undefined} bottom */
const ratio = (top, bottom) => top == null || bottom == null || bottom <= 0 ? null : top / bottom
/** @param {number|null|undefined} called @param {number|null|undefined} stock */
const skillRate = (called, stock) => typeof called !== 'number' || !Number.isFinite(called) || called < 0
  || typeof stock !== 'number' || !Number.isFinite(stock) || stock <= 0 || called > stock ? null : called / stock

/**
 * A request-local cache shares an exact single-day aggregate with its trend
 * point. Separate overview requests do not retain mutable source results.
 * @param {{ startDate?: string, endDate?: string }} options
 * @param {(startDate: string, endDate: string) => Record<string, number|null>|null} reader
 */
function periodOverview(options, reader) {
  /** @type {Map<string, Record<string, number|null>|null>} */
  const cache = new Map()
  /** @param {string} startDate @param {string} endDate */
  function read(startDate, endDate) {
    const key = `${startDate}/${endDate}`
    if (!cache.has(key)) cache.set(key, reader(startDate, endDate))
    return cache.get(key) ?? null
  }
  const result = getUsagePeriodOverview({
    ...options, rateKeys: RATE_KEYS,
    readPeriod: read,
    readDay: date => read(date, date),
  })
  for (const key of METRIC_KEYS) {
    result.changes[key] ??= { currentValue: null, previousValue: null, value: null, difference: null, reason: 'missing' }
  }
  const missing = Object.fromEntries(METRIC_KEYS.map(key => [key, null]))
  return { ...result, points: result.points.map(point => ({ ...missing, ...point })) }
}

/**
 * Source-specific readers keep aggregate coverage and exact cutoff snapshots
 * separate. The factory also supports another workbook through the existing
 * createDailyReportApi contract, without changing the period comparison model.
 * @param {{
 *   dailyApi?: { getDailyOverview: typeof getDailyOverview, getDailyAnalysis: typeof getDailyAnalysis },
 *   sampleApi?: { getUsageReport: typeof getUsageReport, getUsageAnalysis: typeof getUsageAnalysis }
 * }} [sources]
 */
export function createUsageOverviewAdapters({
  dailyApi = { getDailyOverview, getDailyAnalysis },
  sampleApi = { getUsageReport, getUsageAnalysis },
} = {}) {
  /** @param {string} startDate @param {string} endDate @returns {Record<string, number|null>|null} */
  function daily(startDate, endDate) {
    const range = { startDate, endDate }
    const overview = dailyApi.getDailyOverview(range)
    if (overview.quality.dateError) return null
    const analysis = dailyApi.getDailyAnalysis({ ...range, module: 'all', search: '', dimension: 'skills' })
    const complete = overview.quality.missingDates.length === 0
    const cutoff = overview.dailyRows.find(row => row.date === endDate)
    const detailComplete = complete && !analysis.quality.dateError && !analysis.quality.detailCoveragePartial
    const totalSkills = cutoff?.totalSkills ?? null
    const calledSkills = detailComplete && analysis.skills.every(row => row.calls != null)
      ? analysis.skills.filter(row => (row.calls ?? 0) > 0).length : null
    /** @type {Record<string, number|null>} */
    const values = Object.fromEntries(CORE_METRICS.map(key => [key, complete ? overview.summary[key] : null]))
    return {
      ...values,
      // A missing end-date snapshot never borrows the last supplied stock.
      totalSkills,
      queriesPerUser: startDate === endDate ? ratio(cutoff?.queries, cutoff?.aiDau) : null,
      calledSkills,
      skillCallRate: skillRate(calledSkills, totalSkills),
      creatorCount: detailComplete ? analysis.summary.creatorCount : null,
      likeRate: detailComplete ? analysis.summary.likeRate : null,
    }
  }

  /** @param {string} startDate @param {string} endDate @returns {Record<string, number|null>|null} */
  function sample(startDate, endDate) {
    // The sample APIs return a zero-filled empty report for invalid ranges;
    // distinguish source absence before consuming those aggregate values.
    if (startDate < SAMPLE_START_DATE || endDate > USAGE_ANCHOR_DATE) return null
    const range = { startDate, endDate, module: 'all', search: '' }
    const report = sampleApi.getUsageReport(range)
    const analysis = sampleApi.getUsageAnalysis({ ...range, dimension: 'skills' })
    const summary = report.summary
    return {
      queries: summary.queries,
      queriesPerUser: ratio(summary.queries, summary.aiUsers),
      tasks: null, taskSuccessRate: null,
      firstTokenSeconds: summary.firstTokenSeconds,
      totalSkills: summary.publishedSkills,
      newSkills: summary.newSkills,
      calledSkills: analysis.summary.calledSkills,
      skillCallRate: skillRate(analysis.summary.calledSkills, summary.publishedSkills),
      creatorCount: analysis.summary.creatorCount,
      calls: summary.calls, success: summary.success, failed: summary.failed,
      successRate: summary.successRate,
      likeRate: analysis.summary.likeRate,
    }
  }

  return {
    /** @param {{ startDate?: string, endDate?: string }} [options] */
    getDailyPeriodOverview: (options = {}) => {
      const result = periodOverview(options, daily)
      return {
        ...result,
        // Zero-event days have a visible baseline in the trend only; period
        // ratios and weighted latency retain their original denominators.
        points: result.points.map(point => ({
          ...point,
          taskSuccessRate: point.tasks === 0 ? 0 : point.taskSuccessRate,
          firstTokenSeconds: point.queries === 0 ? 0 : point.firstTokenSeconds,
        })),
      }
    },
    /** @param {{ startDate?: string, endDate?: string }} [options] */
    getSamplePeriodOverview: (options = {}) => periodOverview(options, sample),
  }
}

const adapters = createUsageOverviewAdapters()
export const getDailyPeriodOverview = adapters.getDailyPeriodOverview
export const getSamplePeriodOverview = adapters.getSamplePeriodOverview

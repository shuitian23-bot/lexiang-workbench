/**
 * @typedef {Record<string, number|null>} UsagePeriodValues
 * @typedef {{ currentValue: number|null, previousValue: number|null, value: number|null, difference: number|null, reason: null|'missing'|'zero-base' }} UsagePeriodChange
 * @typedef {{ date: string } & Record<string, string|number|null>} UsagePeriodPoint
 * @typedef {{ startDate: string|null, endDate: string|null, previousStartDate: string|null, previousEndDate: string|null, days: number, current: UsagePeriodValues|null, previous: UsagePeriodValues|null, changes: Record<string, UsagePeriodChange>, points: UsagePeriodPoint[] }} UsagePeriodOverview
 */

const DAY_MS = 86400000
/** @param {unknown} value @returns {number|null} */
function dateTime(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null
  const timestamp = Date.parse(`${value}T00:00:00Z`)
  return Number.isFinite(timestamp) && new Date(timestamp).toISOString().split('T')[0] === value ? timestamp : null
}
/** @param {number} timestamp */
const dateOf = timestamp => new Date(timestamp).toISOString().split('T')[0]

/** @param {number|null} currentValue @param {number|null} previousValue @param {boolean} rate @returns {UsagePeriodChange} */
function compare(currentValue, previousValue, rate) {
  if (currentValue == null || previousValue == null) return { currentValue, previousValue, value: null, difference: null, reason: 'missing' }
  const difference = (currentValue - previousValue) * (rate ? 100 : 1)
  if (previousValue === 0) return { currentValue, previousValue, value: null, difference, reason: 'zero-base' }
  const value = (currentValue - previousValue) / previousValue
  return { currentValue, previousValue, value: Number.isFinite(value) ? value : null, difference, reason: Number.isFinite(value) ? null : 'missing' }
}

/**
 * Read both complete periods independently; daily points never substitute for
 * a missing aggregate. Readers must return null for an unavailable whole range
 * and null per metric when a field is unavailable or only partly covered.
 * Count differences are absolute counts, rate differences are percentage
 * points. `value` is a relative ratio for either kind and is null at a zero
 * base even when the absolute/percentage-point difference remains known.
 * @param {{ startDate?: string, endDate?: string, readPeriod?: (startDate: string, endDate: string) => UsagePeriodValues|null, readDay?: (date: string) => UsagePeriodValues|null, rateKeys?: string[] }} [options]
 * @returns {UsagePeriodOverview}
 */
export function getUsagePeriodOverview({ startDate, endDate, readPeriod, readDay, rateKeys = [] } = {}) {
  const start = dateTime(startDate), end = dateTime(endDate)
  if (start == null || end == null || start > end) return {
    startDate: null, endDate: null, previousStartDate: null, previousEndDate: null, days: 0,
    current: null, previous: null, changes: {}, points: [],
  }
  const days = (end - start) / DAY_MS + 1
  const period = {
    startDate: dateOf(start), endDate: dateOf(end), days,
    previousStartDate: dateOf(start - days * DAY_MS), previousEndDate: dateOf(start - DAY_MS),
  }
  const rates = new Set(rateKeys)
  const keys = new Set(rateKeys.filter(key => key !== 'date'))
  /** @param {UsagePeriodValues|null|undefined} source @returns {UsagePeriodValues|null} */
  function normalize(source) {
    if (source == null) return null
    return Object.fromEntries(Object.entries(source).filter(([key]) => key !== 'date').map(([key, value]) => {
      keys.add(key)
      const valid = typeof value === 'number' && Number.isFinite(value) && value >= 0 && (!rates.has(key) || value <= 1)
      return [key, valid ? value : null]
    }))
  }
  const currentValues = normalize(readPeriod?.(period.startDate, period.endDate))
  const previousValues = normalize(readPeriod?.(period.previousStartDate, period.previousEndDate))
  /** @type {{ date: string, values: UsagePeriodValues|null }[]} */
  const dailyValues = []
  for (let timestamp = start; timestamp <= end; timestamp += DAY_MS) {
    const date = dateOf(timestamp)
    dailyValues.push({ date, values: normalize(readDay?.(date)) })
  }
  /** @param {UsagePeriodValues|null} values @returns {UsagePeriodValues} */
  const fields = values => Object.fromEntries([...keys].map(key => [key, values?.[key] ?? null]))
  return {
    ...period,
    current: currentValues == null ? null : fields(currentValues),
    previous: previousValues == null ? null : fields(previousValues),
    changes: Object.fromEntries([...keys].map(key => [key, compare(currentValues?.[key] ?? null, previousValues?.[key] ?? null, rates.has(key))])),
    points: dailyValues.map(({ date, values }) => ({ date, ...fields(values) })),
  }
}

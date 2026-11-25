/**
 * @typedef {{ dau: number|null, wau: number|null, mau: number|null }} ActivityWindow
 * @typedef {{ totalUsers: number|null, windows: { login: ActivityWindow, ai: ActivityWindow } }} ActivitySnapshot
 * @typedef {{ value: number|null, previousValue: number|null, previousDate: string|null, reason: null|'missing'|'zero-base' }} ActivityChange
 * @typedef {{ dau: ActivityChange, wau: ActivityChange, mau: ActivityChange }} ActivityWindowChanges
 * @typedef {{ startDate: string|null, endDate: string|null, days: number, previousStartDate: string|null, previousEndDate: string|null, asOfDate: string|null, current: ActivitySnapshot|null, changes: { totalUsers: ActivityChange, login: ActivityWindowChanges, ai: ActivityWindowChanges }, points: { date: string, totalUsers: number|null, login: ActivityWindow, ai: ActivityWindow }[] }} ActivityOverview
 */

const DAY_MS = 86400000
const emptyWindow = () => ({ dau: null, wau: null, mau: null })
/** @param {unknown} value */
const count = value => typeof value === 'number' && Number.isFinite(value) && value >= 0 ? value : null
/** @param {unknown} value @returns {number|null} */
function dateTime(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null
  const timestamp = Date.parse(`${value}T00:00:00Z`)
  return Number.isFinite(timestamp) && new Date(timestamp).toISOString().split('T')[0] === value ? timestamp : null
}
/** @param {number} timestamp */
const dateOf = timestamp => new Date(timestamp).toISOString().split('T')[0]
/** @param {Partial<ActivityWindow>|null|undefined} source @returns {ActivityWindow} */
const normalizeWindow = source => ({ dau: count(source?.dau), wau: count(source?.wau), mau: count(source?.mau) })
/** @param {Partial<ActivitySnapshot>|null|undefined} source @returns {ActivitySnapshot|null} */
function normalizeSnapshot(source) {
  return source == null ? null : {
    totalUsers: count(source.totalUsers),
    windows: { login: normalizeWindow(source.windows?.login), ai: normalizeWindow(source.windows?.ai) },
  }
}
/** @param {number|null} value @param {number|null} previousValue @param {string|null} previousDate @returns {ActivityChange} */
function change(value, previousValue, previousDate) {
  if (value == null || previousValue == null) return { value: null, previousValue, previousDate, reason: 'missing' }
  if (previousValue === 0) return { value: null, previousValue, previousDate, reason: 'zero-base' }
  const relative = (value - previousValue) / previousValue
  return { value: Number.isFinite(relative) ? relative : null, previousValue, previousDate, reason: Number.isFinite(relative) ? null : 'missing' }
}
/** @returns {ActivityWindowChanges} */
const emptyChanges = () => ({ dau: change(null, null, null), wau: change(null, null, null), mau: change(null, null, null) })

/**
 * Preserve exact daily snapshots and gaps. All metrics compare the explicit
 * cutoff with the date one selected inclusive period earlier. Period metadata
 * describes the selected ranges; previousDate records the exact snapshot date
 * when an explicit cutoff differs from the selected end.
 * readSnapshot must return that exact date; no previous-day fallback is used.
 * @param {{ startDate?: string, endDate?: string, asOfDate?: string, readSnapshot?: (date: string) => Partial<ActivitySnapshot>|null }} [options]
 * @returns {ActivityOverview}
 */
export function getUsageActivityOverview({ startDate, endDate, asOfDate = endDate, readSnapshot } = {}) {
  const start = dateTime(startDate), end = dateTime(endDate), cutoff = dateTime(asOfDate)
  if (start == null || end == null || cutoff == null || start > end) return {
    startDate: null, endDate: null, days: 0, previousStartDate: null, previousEndDate: null,
    asOfDate: null, current: null,
    changes: { totalUsers: change(null, null, null), login: emptyChanges(), ai: emptyChanges() }, points: [],
  }
  const days = (end - start) / DAY_MS + 1
  const period = {
    startDate: dateOf(start), endDate: dateOf(end), days,
    previousStartDate: dateOf(start - days * DAY_MS), previousEndDate: dateOf(start - DAY_MS),
  }
  /** @type {Map<string, ActivitySnapshot|null>} */
  const cache = new Map()
  /** @param {string} date */
  function read(date) {
    if (!cache.has(date)) cache.set(date, normalizeSnapshot(readSnapshot?.(date)))
    return cache.get(date) ?? null
  }
  const currentDate = dateOf(cutoff)
  const current = read(currentDate)
  const previousDate = dateOf(cutoff - days * DAY_MS)
  const previous = read(previousDate)
  /** @param {'login'|'ai'} type @returns {ActivityWindowChanges} */
  function windowChanges(type) {
    /** @param {keyof ActivityWindow} period */
    function compare(period) {
      return change(current?.windows[type][period] ?? null, previous?.windows[type][period] ?? null, previousDate)
    }
    return { dau: compare('dau'), wau: compare('wau'), mau: compare('mau') }
  }
  const changes = {
    totalUsers: change(current?.totalUsers ?? null, previous?.totalUsers ?? null, previousDate),
    login: windowChanges('login'), ai: windowChanges('ai'),
  }
  /** @type {ActivityOverview['points']} */
  const points = []
  for (let timestamp = start; timestamp <= end; timestamp += DAY_MS) {
    const date = dateOf(timestamp), snapshot = read(date)
    points.push({
      date, totalUsers: snapshot?.totalUsers ?? null,
      login: snapshot ? { ...snapshot.windows.login } : emptyWindow(),
      ai: snapshot ? { ...snapshot.windows.ai } : emptyWindow(),
    })
  }
  return { ...period, asOfDate: currentDate, current, changes, points }
}

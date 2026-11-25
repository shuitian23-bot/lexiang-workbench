/**
 * @typedef {{ key: string, label: string, values: ReadonlyArray<number|string|null|undefined> }} UsageMiniTrendInput
 * @typedef {{ x: number, y: number, index: number, value: number }} UsageMiniTrendPoint
 * @typedef {{ linePath: string, areaPath: string, points: UsageMiniTrendPoint[] }} UsageMiniTrendSegment
 * @typedef {{ key: string, label: string, segments: UsageMiniTrendSegment[], markers: UsageMiniTrendPoint[] }} UsageMiniTrendSeries
 * @typedef {{ hasData: boolean, min: number|null, max: number|null, series: UsageMiniTrendSeries[] }} UsageMiniTrend
 */

/** @param {number} value */
const coordinate = value => value.toFixed(2)

/** Daily chart projection only; aggregate values and source records stay intact.
 * @param {unknown} value @returns {number}
 */
export function getUsageTrendValue(value) {
  return typeof value === 'number' && Number.isFinite(value) ? value : 0
}

/** @param {UsageMiniTrendPoint[]} points */
function smoothLinePath(points) {
  const first = points[0]
  const start = `M ${coordinate(first.x)} ${coordinate(first.y)}`
  if (points.length === 1) return start
  const slopes = points.slice(1).map((point, index) => (point.y - points[index].y) / (point.x - points[index].x))
  const tangents = [slopes[0], ...slopes.slice(1).map((right, index) => {
    const left = slopes[index]
    // A shared, bounded tangent is flat at extrema and zero plateaus. Its
    // controls remain inside each interval, so interpolation cannot overshoot.
    return Math.sign(left) === Math.sign(right) ? Math.sign(left) * Math.min(Math.abs(left), Math.abs(right)) : 0
  }), slopes[slopes.length - 1]]
  return [start, ...points.slice(1).map((end, index) => {
    const begin = points[index]
    const third = (end.x - begin.x) / 3
    return `C ${coordinate(begin.x + third)} ${coordinate(begin.y + tangents[index] * third)} ${coordinate(end.x - third)} ${coordinate(end.y - tangents[index + 1] * third)} ${coordinate(end.x)} ${coordinate(end.y)}`
  })].join(' ')
}

/**
 * Pure SVG geometry on a shared 260×82 canvas. Missing values split runs and
 * keep their date positions; no source value is filled or aggregated.
 * @param {ReadonlyArray<UsageMiniTrendInput>} [seriesWithValues]
 * @returns {UsageMiniTrend}
 */
export function getUsageMiniTrend(seriesWithValues = []) {
  /** @type {number[]} */
  const values = []
  for (const entry of seriesWithValues) {
    for (const value of entry.values) {
      if (typeof value === 'number' && Number.isFinite(value)) values.push(value)
    }
  }
  if (!values.length) return {
    hasData: false, min: null, max: null,
    series: seriesWithValues.map(entry => ({ key: entry.key, label: entry.label, segments: [], markers: [] })),
  }
  const min = Math.min(0, ...values)
  const max = Math.max(0, ...values)
  const span = max - min || 1
  const length = Math.max(...seriesWithValues.map(entry => entry.values.length))
  /** @param {number} value */
  const y = value => 72 - (value - min) / span * 62
  const baseline = coordinate(y(0))
  const series = seriesWithValues.map(entry => {
    /** @type {UsageMiniTrendSegment[]} */
    const segments = []
    /** @type {UsageMiniTrendPoint[]} */
    const markers = []
    /** @type {UsageMiniTrendPoint[]} */
    let points = []
    function flush() {
      if (!points.length) return
      const first = points[0], last = points[points.length - 1]
      const linePath = smoothLinePath(points)
      const areaPath = points.length > 1 ? `${linePath} L ${coordinate(last.x)} ${baseline} L ${coordinate(first.x)} ${baseline} Z` : ''
      segments.push({ linePath, areaPath, points })
      markers.push({ ...last })
      points = []
    }
    entry.values.forEach((value, index) => {
      if (typeof value !== 'number' || !Number.isFinite(value)) { flush(); return }
      points.push({ index, value, x: length <= 1 ? 130 : 10 + 240 * index / (length - 1), y: y(value) })
    })
    flush()
    return { key: entry.key, label: entry.label, segments, markers }
  })
  return { hasData: true, min, max, series }
}

/** Nearest date on the existing 10..250 plot axis; exact ties select the next date.
 * @param {unknown} viewBoxX @param {unknown} length @returns {number|null}
 */
export function getUsageMiniTrendIndex(viewBoxX, length) {
  if (typeof viewBoxX !== 'number' || !Number.isFinite(viewBoxX)
    || typeof length !== 'number' || !Number.isInteger(length) || length <= 0) return null
  return length === 1 ? 0 : Math.max(0, Math.min(length - 1, Math.round((viewBoxX - 10) / 240 * (length - 1))))
}

/** Format real hover values without abbreviations or replacing missing values.
 * @param {unknown} value @param {'number'|'decimal'|'percent'} [format] @returns {string}
 */
export function formatUsageMiniTrendValue(value, format = 'number') {
  if (typeof value !== 'number' || !Number.isFinite(value)) return '—'
  if (format === 'percent') return `${(value * 100).toFixed(1)}%`
  return value.toLocaleString('zh-CN', format === 'decimal'
    ? { minimumFractionDigits: 2, maximumFractionDigits: 2 }
    : { maximumFractionDigits: 20 })
}

/**
 * Presentation only: no source metric, baseline, trend or ranking is changed.
 * @param {{ change?: { value?: number|null, difference?: number|null, reason?: string|null }, metricKey: string, startDate: string|null, endDate: string|null, format?: 'number'|'decimal'|'percent' }} options
 */
export function getUsageCardComparison({ change, metricKey, startDate, endDate, format = 'number' }) {
  const rate = format === 'percent'
  const actual = rate ? change?.difference : change?.value == null ? null : change.value * 100
  const valid = typeof actual === 'number' && Number.isFinite(actual) && (rate || !change?.reason)
  const isMock = !valid && Boolean(startDate && endDate)
  let number = valid ? actual : null
  if (isMock) {
    const seed = `${startDate}:${endDate}:${metricKey}`
    const hash = [...seed].reduce((value, char) => (Math.imul(value, 31) + char.charCodeAt(0)) >>> 0, 0)
    number = ((hash % (rate ? 30 : 180)) + (rate ? 1 : 5)) / 10 * (hash % 2 ? 1 : -1)
  }
  const prefix = isMock ? '环比（Mock）' : '环比'
  const rounded = number == null ? null : Math.round(number * 10) / 10
  const text = rounded == null ? `${prefix} —` : rounded === 0 ? `${prefix}持平` : `${prefix} ${rounded > 0 ? '↑ +' : '↓ '}${rounded.toFixed(1)}${rate ? ' 个百分点' : '%'}`
  const title = isMock
    ? '实际环比暂不可计算；此值仅用于 POC 展示，不代表实际变化，不计入指标、趋势或排行。'
    : rate ? '环比为当前比率与前期比率的百分点差。' : '环比 =（当前值 − 前期值）÷ 前期值。'
  return { text, title, isMock }
}

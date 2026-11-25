/**
 * @typedef {{ id: string, name: string, creator?: string, calls: number|null, successRate: number|null }} UsageRankingRow
 */

const RANK_LIMIT = 10

/**
 * Rank only the supplied scope. Known zero calls affect the median; missing or
 * invalid counts do not. Success rates cannot change the median population.
 * @template {UsageRankingRow} T
 * @param {ReadonlyArray<T>} [rows]
 * @returns {{ calls: T[], successRate: T[], medianCalls: number|null }}
 */
export function getUsageRankings(rows = []) {
  const known = rows.filter(row => typeof row.calls === 'number' && Number.isFinite(row.calls) && row.calls >= 0)
  const counts = known.map(row => row.calls ?? 0).sort((a, b) => a - b)
  const middle = Math.floor(counts.length / 2)
  const medianCalls = !counts.length ? null : counts.length % 2
    ? counts[middle]
    : counts[middle - 1] + (counts[middle] - counts[middle - 1]) / 2
  /** @param {T} a @param {T} b */
  const byCalls = (a, b) => (b.calls ?? 0) - (a.calls ?? 0) || a.id.localeCompare(b.id)
  const active = known.filter(row => (row.calls ?? 0) > 0)
  const calls = active.slice().sort(byCalls).slice(0, RANK_LIMIT)
  /** @param {T} a @param {T} b */
  const bySuccessRate = (a, b) => (a.successRate ?? 0) - (b.successRate ?? 0)
    || (a.calls ?? 0) - (b.calls ?? 0)
    || a.id.localeCompare(b.id)
  const eligible = active.filter(row => typeof row.successRate === 'number'
    && Number.isFinite(row.successRate) && row.successRate >= 0 && row.successRate <= 1).sort(bySuccessRate)
  const successRate = medianCalls == null ? [] : eligible.filter(row => (row.calls ?? 0) > medianCalls).slice(0, RANK_LIMIT)
  if (medianCalls != null && successRate.length < RANK_LIMIT) {
    const remaining = RANK_LIMIT - successRate.length
    const fill = eligible.filter(row => (row.calls ?? 0) <= medianCalls).slice(0, remaining)
    successRate.push(...fill)
    successRate.sort(bySuccessRate)
  }
  return { calls, successRate, medianCalls }
}

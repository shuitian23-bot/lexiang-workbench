import assert from 'node:assert/strict'
import test from 'node:test'
import { getUsageRankings } from '../src/domain/usageRankings.js'

const row = (id, calls, successRate = 1) => ({ id, name: id, creator: `creator-${id}`, calls, successRate })
const ids = rows => rows.map(item => item.id)

test('odd and even call medians include the whole supplied scope before success eligibility', () => {
  const odd = getUsageRankings([row('low', 1), row('median', 3), row('above', 8)])
  assert.equal(odd.medianCalls, 3)
  assert.deepEqual(ids(odd.successRate), ['above'])
  const even = getUsageRankings([row('low', 1), row('below', 3), row('above', 5, 0.8), row('high', 9, 0.9)])
  assert.equal(even.medianCalls, 4)
  assert.deepEqual(ids(even.successRate), ['high', 'above'])
})

test('calls equal to the median are strictly excluded from success rankings', () => {
  const result = getUsageRankings([row('zero', 0), row('equal-a', 2), row('equal-b', 2), row('above', 4)])
  assert.equal(result.medianCalls, 2)
  assert.deepEqual(ids(result.successRate), ['above'])
  for (const rows of [[], [row('single', 4)], [row('a', 4), row('b', 4), row('c', 4)]]) {
    const ranked = getUsageRankings(rows)
    assert.equal(ranked.medianCalls, rows.length ? 4 : null)
    assert.deepEqual(ranked.successRate, [])
  }
})

test('missing and invalid calls are excluded rather than silently counted as zero', () => {
  const result = getUsageRankings([
    row('missing', null), row('undefined', undefined), row('nan', NaN), row('infinite', Infinity),
    row('negative', -1), row('string', '4'), row('two', 2), row('four', 4), row('six', 6),
  ])
  assert.equal(result.medianCalls, 4)
  assert.deepEqual(ids(result.calls), ['six', 'four', 'two'])
  assert.deepEqual(ids(result.successRate), ['six'])
  const empty = getUsageRankings([row('missing', null), row('invalid', Infinity)])
  assert.equal(empty.medianCalls, null)
  assert.deepEqual(empty.calls, [])
  assert.deepEqual(empty.successRate, [])
})

test('known zero calls participate in the median and zero success rates remain valid', () => {
  const result = getUsageRankings([row('zero-a', 0), row('zero-b', 0), row('two', 2, 0), row('four', 4, 1)])
  assert.equal(result.medianCalls, 1)
  assert.deepEqual(ids(result.calls), ['four', 'two'])
  assert.deepEqual(ids(result.successRate), ['four', 'two'])
  assert.equal(result.successRate[1].successRate, 0)
  const zeros = getUsageRankings([row('a', 0), row('b', 0)])
  assert.equal(zeros.medianCalls, 0)
  assert.deepEqual(zeros.calls, [])
  assert.deepEqual(zeros.successRate, [])
})

test('missing or invalid success rates cannot change the call median or enter the success ranking', () => {
  const missing = getUsageRankings([row('one', 1, 1), row('two', 2, 0.9), row('high-missing', 100, null)])
  assert.equal(missing.medianCalls, 2)
  assert.deepEqual(missing.successRate, [])
  assert.equal(missing.calls[0].id, 'high-missing')
  const invalidRates = getUsageRankings([
    ...Array.from({ length: 6 }, (_, index) => row(`zero-${index}`, 0, null)),
    row('negative-rate', 2, -0.1), row('over-one', 3, 1.1), row('nan', 4, NaN),
    row('infinite', 5, Infinity), row('string', 6, '1'), row('valid', 7, 0.5),
  ])
  assert.equal(invalidRates.medianCalls, 1)
  assert.deepEqual(ids(invalidRates.successRate), ['valid'])
})

test('both Skill rankings apply Top10 after sorting more than ten eligible Skills without changing input rows', () => {
  const rows = [
    ...Array.from({ length: 14 }, (_, index) => row(`zero-${index}`, 0, null)),
    row('z', 40, 0.95), row('c', 30, 0.9), row('b', 30, 0.9), row('a', 25, 0.9),
    row('d', 20, 0.9), row('e', 19, 0.9), row('f', 50, 0.8), row('g', 60, 0.7),
    row('h', 70, 0.65), row('i', 80, 0.6), row('j', 90, 0.55), row('k', 100, 0.5),
  ]
  const before = structuredClone(rows)
  rows.forEach(Object.freeze)
  Object.freeze(rows)
  const result = getUsageRankings(rows)
  assert.equal(result.medianCalls, 0)
  assert.deepEqual(ids(result.calls), ['k', 'j', 'i', 'h', 'g', 'f', 'z', 'b', 'c', 'a'])
  assert.deepEqual(ids(result.successRate), ['z', 'b', 'c', 'a', 'd', 'e', 'f', 'g', 'h', 'i'])
  assert.equal(result.calls[0].creator, 'creator-k')
  assert.deepEqual(rows, before)
})

test('Top10 success eligibility keeps the full-scope median and strict threshold before truncating', () => {
  const rows = Array.from({ length: 25 }, (_, index) => row(`skill-${index + 1}`, index + 1))
  const result = getUsageRankings(rows)
  assert.equal(result.medianCalls, 13)
  assert.deepEqual(ids(result.successRate), ['skill-25', 'skill-24', 'skill-23', 'skill-22', 'skill-21', 'skill-20', 'skill-19', 'skill-18', 'skill-17', 'skill-16'])
  assert.equal(result.successRate.some(item => item.calls <= 13), false)
})

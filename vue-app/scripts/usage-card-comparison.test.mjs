import test from 'node:test'
import assert from 'node:assert/strict'
import { getUsageCardComparison } from '../src/domain/usageCardComparison.js'

const period = { metricKey: 'queries', startDate: '2026-10-30', endDate: '2026-11-05' }
test('real count change is explicitly an embedded period comparison', () => {
  const result = getUsageCardComparison({ ...period, change: { value: 0.035, difference: 7, reason: null } })
  assert.equal(result.text, '环比 ↑ +3.5%')
  assert.equal(result.isMock, false)
})
test('real zero stays flat and never uses a mock', () => {
  const result = getUsageCardComparison({ ...period, change: { value: 0, difference: 0, reason: null } })
  assert.equal(result.text, '环比持平')
  assert.equal(result.isMock, false)
})
test('rates use percentage points even when a zero baseline prevents a relative ratio', () => {
  const result = getUsageCardComparison({ ...period, format: 'percent', change: { value: null, difference: 0.3, reason: 'zero-base' } })
  assert.equal(result.text, '环比 ↑ +0.3 个百分点')
  assert.equal(result.isMock, false)
})
test('missing comparison is visibly mocked, stable for a range and does not mutate source values', () => {
  const change = Object.freeze({ currentValue: null, previousValue: null, value: null, difference: null, reason: 'missing' })
  const first = getUsageCardComparison({ ...period, change })
  assert.match(first.text, /^环比（Mock） [↑↓] [+-]\d+\.\d%$/)
  assert.equal(first.isMock, true)
  assert.match(first.title, /仅用于 POC 展示/)
  assert.deepEqual(first, getUsageCardComparison({ ...period, change }))
  assert.notEqual(first.text, getUsageCardComparison({ ...period, startDate: '2026-11-05', change }).text)
  assert.equal(change.currentValue, null)
  assert.equal(change.previousValue, null)
})
test('zero count baseline and unavailable rate comparisons stay demonstration-only', () => {
  const zero = getUsageCardComparison({ ...period, change: { value: null, difference: 10, reason: 'zero-base' } })
  assert.equal(zero.isMock, true)
  const missingRate = getUsageCardComparison({ ...period, format: 'percent', change: { value: NaN, difference: null, reason: 'missing' } })
  assert.match(missingRate.text, /^环比（Mock） [↑↓] [+-]\d+\.\d 个百分点$/)
})

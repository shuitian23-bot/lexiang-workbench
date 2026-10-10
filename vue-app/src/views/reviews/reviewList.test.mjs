import assert from 'node:assert/strict'
import test from 'node:test'

const helpers = import('./reviewList.ts')

test('date filtering includes both boundary days and excludes undated records only when filtered', async () => {
  const { matchesReviewDateRange } = await helpers
  assert.equal(matchesReviewDateRange('2026-09-10 23:59', '2026-09-10', '2026-09-10'), true)
  assert.equal(matchesReviewDateRange('2026-09-09 23:59', '2026-09-10', ''), false)
  assert.equal(matchesReviewDateRange('2026-09-11 00:00', '', '2026-09-10'), false)
  assert.equal(matchesReviewDateRange('2026-09-09 00:00', '', '2026-09-10'), true)
  assert.equal(matchesReviewDateRange('—', '', ''), true)
  assert.equal(matchesReviewDateRange('—', '2026-09-10', ''), false)
})

test('invalid or reversed ranges are rejected while a one-day or open range is accepted', async () => {
  const { reviewDateRangeError } = await helpers
  assert.notEqual(reviewDateRangeError('2026-09-11', '2026-09-10'), '')
  assert.notEqual(reviewDateRangeError('2026-02-30', ''), '')
  assert.equal(reviewDateRangeError('2026-09-10', '2026-09-10'), '')
  assert.equal(reviewDateRangeError('', '2026-09-10'), '')
  assert.equal(reviewDateRangeError('2026-09-10', ''), '')
})

test('CSV keeps quoted commas, quotes and line breaks and prevents formula cells', async () => {
  const { createReviewCsv } = await helpers
  assert.equal(createReviewCsv([
    ['商品', '说明', '数量'],
    ['ThinkBook,14', '说"好"\n第二行', 3],
    ['=1+1', '  @SUM(A1)', null],
    ['+123', '-123', '\t=1+1'],
  ]), '\uFEFF"商品","说明","数量"\r\n"ThinkBook,14","说""好""\n第二行","3"\r\n"\'=1+1","\'  @SUM(A1)",""\r\n"\'+123","\'-123","\'\t=1+1"')
})

test('pagination slices successive pages without dropping source records', async () => {
  const { reviewPageRecords } = await helpers
  const rows = ['A', 'B', 'C', 'D']
  assert.deepEqual(reviewPageRecords(rows, 1, 3), ['A', 'B', 'C'])
  assert.deepEqual(reviewPageRecords(rows, 2, 3), ['D'])
  assert.deepEqual(rows, ['A', 'B', 'C', 'D'])
  assert.deepEqual(reviewPageRecords([], 1, 3), [])
})

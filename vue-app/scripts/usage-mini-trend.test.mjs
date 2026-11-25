import assert from 'node:assert/strict'
import test from 'node:test'
import * as usageMiniTrend from '../src/domain/usageMiniTrend.js'

const { getUsageMiniTrend } = usageMiniTrend

const series = (key, values) => ({ key, label: key, values })

test('zero display projection connects every selected date while leaving the source untouched', () => {
  const { getUsageTrendValue: display } = usageMiniTrend
  assert.equal(typeof display, 'function')
  const raw = Object.freeze([0.98, null, undefined, 0, 0.96])
  const values = raw.map(display)
  assert.deepEqual(values, [0.98, 0, 0, 0, 0.96])
  const result = getUsageMiniTrend([series('rate', values)]).series[0]
  assert.equal(result.segments.length, 1)
  assert.deepEqual(result.segments[0].points.map(point => [point.index, point.value]), [[0, 0.98], [1, 0], [2, 0], [3, 0], [4, 0.96]])
  assert.equal((result.segments[0].linePath.match(/\bC\b/g) || []).length, 4)
  assert.equal(usageMiniTrend.formatUsageMiniTrendValue(values[1], 'percent'), '0.0%')
  assert.deepEqual(raw, [0.98, null, undefined, 0, 0.96])
})

test('all missing daily display values draw a zero baseline with matching count decimal and percentage readouts', () => {
  const { getUsageTrendValue: display } = usageMiniTrend
  assert.equal(typeof display, 'function')
  const values = [null, undefined, NaN, Infinity, -Infinity, '3'].map(display)
  assert.deepEqual(values, [0, 0, 0, 0, 0, 0])
  const model = getUsageMiniTrend([series('daily', values)])
  assert.equal(model.hasData, true)
  assert.equal(model.series[0].segments.length, 1)
  assert.ok(model.series[0].segments[0].points.every(point => point.value === 0 && point.y === 72))
  assert.deepEqual(['number', 'decimal', 'percent'].map(format => usageMiniTrend.formatUsageMiniTrendValue(values[0], format)), ['0', '0.00', '0.0%'])
  assert.equal(display(0), 0)
  assert.equal(display(8.178223938223937), 8.178223938223937)
  assert.equal(getUsageMiniTrend([series('no-dates', [])]).hasData, false)
})

function cubicSegments(path) {
  const tokens = path.match(/[MC]|-?\d+(?:\.\d+)?/g) || []
  assert.equal(tokens.shift(), 'M')
  let start = { x: Number(tokens.shift()), y: Number(tokens.shift()) }
  const curves = []
  while (tokens.length) {
    assert.equal(tokens.shift(), 'C', 'Every interval uses a cubic curve')
    const c1 = { x: Number(tokens.shift()), y: Number(tokens.shift()) }
    const c2 = { x: Number(tokens.shift()), y: Number(tokens.shift()) }
    const end = { x: Number(tokens.shift()), y: Number(tokens.shift()) }
    curves.push({ start, c1, c2, end })
    start = end
  }
  return curves
}

const bezier = (start, c1, c2, end, t) => (1 - t) ** 3 * start + 3 * (1 - t) ** 2 * t * c1 + 3 * (1 - t) * t ** 2 * c2 + t ** 3 * end

test('smooth curves pass through the real points and share a tangent at every joining vertex', () => {
  const input = [0, 1, 20, 10, 0]
  const segment = getUsageMiniTrend([series('calls', input)]).series[0].segments[0]
  const curves = cubicSegments(segment.linePath)
  assert.equal(curves.length, input.length - 1)
  assert.deepEqual(segment.points.map(point => point.value), input)
  assert.deepEqual(curves.map(curve => [curve.end.x, curve.end.y]), segment.points.slice(1).map(point => [Number(point.x.toFixed(2)), Number(point.y.toFixed(2))]))
  for (let index = 1; index < curves.length; index++) {
    const incoming = curves[index - 1]
    const outgoing = curves[index]
    const before = (incoming.end.y - incoming.c2.y) / (incoming.end.x - incoming.c2.x)
    const after = (outgoing.c1.y - outgoing.start.y) / (outgoing.c1.x - outgoing.start.x)
    assert.ok(Math.abs(before - after) < 0.002, 'Adjacent cubic intervals share their tangent despite SVG coordinate rounding')
  }
  assert.ok(segment.areaPath.startsWith(segment.linePath), 'The filled area follows the same curve as the line')
  assert.ok(segment.areaPath.endsWith(' L 250.00 72.00 L 10.00 72.00 Z'))
})

test('monotone curves stay between adjacent source values through spikes, negative values, zeros and plateaus', () => {
  for (const values of [[0, 1000, 1, 1, 999, 0, 0, 17], [-100, 0, -1, -2, -2, 200], [0, 0, 0], [0, 1, 100]]) {
    const segment = getUsageMiniTrend([series('calls', values)]).series[0].segments[0]
    for (const curve of cubicSegments(segment.linePath)) {
      const low = Math.min(curve.start.y, curve.end.y), high = Math.max(curve.start.y, curve.end.y)
      assert.ok(curve.c1.x > curve.start.x && curve.c2.x > curve.c1.x && curve.end.x > curve.c2.x)
      for (const control of [curve.c1, curve.c2]) assert.ok(control.y >= low && control.y <= high, 'Bezier controls cannot leave the adjacent source-value bounds')
      let previous = curve.start.y
      for (let step = 1; step <= 64; step++) {
        const y = bezier(curve.start.y, curve.c1.y, curve.c2.y, curve.end.y, step / 64)
        assert.ok(y >= low - 1e-9 && y <= high + 1e-9, 'No interpolated value exceeds the adjacent real values')
        assert.ok(curve.end.y >= curve.start.y ? y >= previous - 1e-9 : y <= previous + 1e-9, 'Every interval preserves the direction of the real values')
        previous = y
      }
    }
  }
})

test('smoothing restarts at missing dates and retains isolated zero markers without filled areas', () => {
  const result = getUsageMiniTrend([series('calls', [0, 5, null, 0, null, 1, 2, undefined])]).series[0]
  assert.deepEqual(result.segments.map(segment => segment.points.map(point => point.index)), [[0, 1], [3], [5, 6]])
  assert.deepEqual(result.segments.map(segment => cubicSegments(segment.linePath).length), [1, 0, 1])
  assert.equal(result.segments[1].linePath, 'M 112.86 72.00')
  assert.equal(result.segments[1].areaPath, '')
  assert.deepEqual(result.markers.map(point => [point.index, point.value]), [[1, 5], [3, 0], [6, 2]])
})

test('unavailable points stay empty rather than becoming zero or SVG geometry', () => {
  const result = getUsageMiniTrend([series('missing', [null, undefined, NaN, Infinity, '3'])])
  assert.equal(result.hasData, false)
  assert.equal(result.min, null)
  assert.equal(result.max, null)
  assert.deepEqual(result.series[0].segments, [])
  assert.deepEqual(result.series[0].markers, [])
  assert.deepEqual(getUsageMiniTrend().series, [])
})

test('all series share a vertical scale while complete date positions stay aligned', () => {
  const result = getUsageMiniTrend([series('login', [10, 20]), series('interaction', [100, 0])])
  assert.equal(result.hasData, true)
  assert.equal(result.min, 0)
  assert.equal(result.max, 100)
  const login = result.series[0].segments[0].points
  const interaction = result.series[1].segments[0].points
  assert.deepEqual(login.map(point => point.x), [10, 250])
  assert.deepEqual(interaction.map(point => point.x), [10, 250])
  assert.ok(Math.abs(login[0].y - 65.8) < 1e-9)
  assert.ok(Math.abs(login[1].y - 59.6) < 1e-9)
  assert.equal(interaction[0].y, 10)
  assert.equal(interaction[1].y, 72)
})

test('missing dates split both line and area paths into independent segments', () => {
  const result = getUsageMiniTrend([series('calls', [1, 2, null, 3, 4])])
  const line = result.series[0]
  assert.deepEqual(line.segments.map(segment => segment.points.map(point => point.index)), [[0, 1], [3, 4]])
  assert.equal(line.segments.length, 2)
  assert.ok(line.segments.every(segment => segment.linePath.startsWith('M ') && segment.areaPath.endsWith(' Z')))
  assert.deepEqual(line.markers.map(point => point.index), [1, 4])
  assert.deepEqual(line.segments.flatMap(segment => segment.points.map(point => point.x)), [10, 70, 190, 250])
})

test('a valid point on either side of gaps remains visible as its own marker', () => {
  const result = getUsageMiniTrend([series('calls', [null, 5, null, 0, undefined])])
  const line = result.series[0]
  assert.deepEqual(line.markers.map(point => [point.index, point.value, point.x]), [[1, 5, 70], [3, 0, 190]])
  assert.equal(line.segments.length, 2)
  assert.ok(line.segments.every(segment => segment.points.length === 1 && segment.areaPath === ''))
})

test('known zeros draw a flat line and a single day draws a centered point', () => {
  const zero = getUsageMiniTrend([series('calls', [0, 0, 0])])
  assert.equal(zero.hasData, true)
  assert.deepEqual(zero.series[0].segments[0].points.map(point => [point.x, point.y]), [[10, 72], [130, 72], [250, 72]])
  assert.deepEqual(zero.series[0].markers.map(point => [point.x, point.y]), [[250, 72]])
  const single = getUsageMiniTrend([series('calls', [4])])
  assert.deepEqual(single.series[0].markers.map(point => [point.x, point.y]), [[130, 10]])
  assert.equal(single.series[0].segments[0].areaPath, '')
})

test('geometry does not change input values and returned objects are detached across requests', () => {
  const input = Object.freeze([Object.freeze({ key: 'rate', label: '成功率', values: Object.freeze([0.5, null, 1]) })])
  const before = structuredClone(input)
  const first = getUsageMiniTrend(input)
  const second = getUsageMiniTrend(input)
  first.series[0].markers[0].value = 999
  assert.equal(second.series[0].markers[0].value, 0.5)
  assert.deepEqual(input, before)
})

test('nearest date selection respects the plotted axis, endpoints, ties and single-day ranges', () => {
  const { getUsageMiniTrendIndex: index } = usageMiniTrend
  assert.equal(typeof index, 'function')
  assert.equal(index(10, 7), 0)
  assert.equal(index(130, 7), 3)
  assert.equal(index(250, 7), 6)
  assert.equal(index(-100, 7), 0)
  assert.equal(index(999, 7), 6)
  assert.equal(index(29.99, 7), 0)
  assert.equal(index(30, 7), 1, 'An exact midpoint selects the next date')
  assert.equal(index(129.99, 2), 0)
  assert.equal(index(130, 2), 1)
  assert.equal(index(-100, 1), 0)
  assert.equal(index(250, 1), 0)
  for (const length of [0, -1, 2.5, NaN, Infinity, null, '3']) assert.equal(index(130, length), null)
  for (const x of [NaN, Infinity, -Infinity, null, undefined, '130']) assert.equal(index(x, 7), null)
})

test('hover values retain full grouped numbers, real zero, decimals and percentage units without filling gaps', () => {
  const { formatUsageMiniTrendValue: format } = usageMiniTrend
  assert.equal(typeof format, 'function')
  assert.equal(format(546391), '546,391')
  assert.equal(format(100000000), '100,000,000')
  assert.equal(format(1234567890.1), '1,234,567,890.1')
  assert.equal(format(0), '0')
  assert.equal(format(12.3, 'decimal'), '12.30')
  assert.equal(format(1546.391, 'decimal'), '1,546.39')
  assert.equal(format(0, 'decimal'), '0.00')
  assert.equal(format(0.246, 'percent'), '24.6%')
  assert.equal(format(0, 'percent'), '0.0%')
  assert.equal(format(1, 'percent'), '100.0%')
  for (const value of [null, undefined, NaN, Infinity, -Infinity, '0', {}]) {
    for (const kind of ['number', 'decimal', 'percent']) assert.equal(format(value, kind), '—')
  }
})

/**
 * leaiHelpers.js
 * 从 workbench-pages.js 行 1441-1604 搬运的 leai* 工具函数集。
 * 直接 import LEAI_DATA，不依赖 window 全局变量。
 */
import { LEAI_DATA } from './leaiData'

export function leaiGetData() {
  return LEAI_DATA != null ? LEAI_DATA : null
}

export function leaiRangeSize(range) {
  return range === '1d' ? 1 : range === '7d' ? 7 : range === '14d' ? 14 : 30
}

export function leaiRangeLabel(range) {
  return ({ '1d': '最近1天', '7d': '最近7天', '14d': '最近14天', '30d': '最近30天', custom: '自定义' })[range] || '最近1天'
}

export function leaiDataYear() {
  const L = leaiGetData()
  return (L?.updated || '2026').slice(0, 4)
}

export function leaiRowIso(d) {
  if (!d) return ''
  if (/^\d{4}-\d{2}-\d{2}$/.test(d)) return d
  const [m, day] = String(d).split('/')
  return `${leaiDataYear()}-${String(m || '').padStart(2, '0')}-${String(day || '').padStart(2, '0')}`
}

export function leaiDateBounds(source) {
  const L = leaiGetData()
  const rows = source || L?.daily || []
  return {
    min: leaiRowIso(rows[0]?.d || ''),
    max: leaiRowIso(rows[rows.length - 1]?.d || '')
  }
}

export function leaiRows(range, source, customStart, customEnd) {
  const L = leaiGetData()
  const rows = source || L?.daily || []
  if ((range || '1d') === 'custom') {
    const bounds = leaiDateBounds(rows)
    const start = customStart || bounds.min
    const end = customEnd || bounds.max
    const lo = start <= end ? start : end
    const hi = start <= end ? end : start
    return rows.filter(r => {
      const d = leaiRowIso(r.d)
      return (!lo || d >= lo) && (!hi || d <= hi)
    })
  }
  const n = Math.min(leaiRangeSize(range || '1d'), rows.length)
  return rows.slice(-n)
}

export function leaiSum(rows, key) {
  return rows.reduce((s, r) => s + (Number(r?.[key]) || 0), 0)
}

export function leaiAvg(rows, key) {
  return rows.length ? Math.round(leaiSum(rows, key) / rows.length) : 0
}

export function leaiFmtW(v) {
  v = Number(v) || 0
  return v >= 10000 ? (v / 10000).toFixed(1) + '万' : v.toLocaleString()
}

export function leaiFmtY(v) {
  v = Number(v) || 0
  return v >= 100000000 ? (v / 100000000).toFixed(2) + '亿' : v >= 10000 ? (v / 10000).toFixed(1) + '万' : v.toLocaleString()
}

export function leaiFmtPct(part, total) {
  return total ? (part / total * 100).toFixed(1) + '%' : '-'
}

export function leaiPctValue(part, total) {
  if (!total) return 0
  return Math.max(0, Math.min(100, part / total * 100))
}

export function leaiPctWidth(part, total, min = 4) {
  const v = leaiPctValue(part, total)
  return v ? Math.max(v, min).toFixed(1) : 0
}

export function leaiPeriodText(rows) {
  const first = rows[0]?.d || ''
  const last = rows[rows.length - 1]?.d || ''
  const toFull = d => d ? '2026.' + d.replace('/', '.') : '-'
  return first === last ? toFull(last) : `${toFull(first)} - ${toFull(last)}`
}

export function leaiBuildSummary(range, customStart, customEnd) {
  const rows = leaiRows(range, undefined, customStart, customEnd)
  return {
    rows,
    dau: leaiAvg(rows, 'dau'),
    wau: leaiAvg(rows, 'wau'),
    mau: leaiAvg(rows, 'mau'),
    login: leaiSum(rows, 'login'),
    loginAvg: leaiAvg(rows, 'login'),
    inter: leaiSum(rows, 'inter'),
    interAvg: leaiAvg(rows, 'inter'),
    buy: leaiSum(rows, 'buy'),
    gmv: leaiSum(rows, 'gmv'),
    offGmv: leaiSum(rows, 'offGmv'),
    nonGmv: leaiSum(rows, 'nonGmv'),
    offBuy: leaiSum(rows, 'offBuy'),
    nonBuy: leaiSum(rows, 'nonBuy'),
    loginM: leaiAvg(rows, 'loginM'),
    interM: leaiAvg(rows, 'interM')
  }
}

export function leaiBizSummary(rows, source) {
  const dates = new Set(rows.map(r => r.d))
  const picked = (source || []).filter(r => dates.has(r.d))
  return { gmv: leaiSum(picked, 'gmv'), buy: leaiSum(picked, 'buy'), login: leaiSum(picked, 'login'), inter: leaiSum(picked, 'inter') }
}

export function leaiDistributeAmount(total, weights) {
  total = Math.max(0, Math.round(Number(total) || 0))
  const sum = weights.reduce((s, v) => s + (Number(v) || 0), 0)
  const shares = sum ? weights.map(v => (Number(v) || 0) / sum) : weights.map(() => 1 / Math.max(weights.length, 1))
  const raw = shares.map(v => v * total)
  const ints = raw.map(Math.floor)
  let left = total - ints.reduce((s, v) => s + v, 0)
  raw.map((v, i) => ({ i, frac: v - Math.floor(v) }))
    .sort((a, b) => b.frac - a.frac)
    .forEach(({ i }) => { if (left > 0) { ints[i] += 1; left -= 1 } })
  return ints
}

export function leaiBizTradeSummaries(rows) {
  const L = leaiGetData()
  const meta = [
    { key: 'consumer', label: '消费业务', source: L?.consumer || [], color: '#2563eb' },
    { key: 'smb', label: 'SMB 业务', source: L?.smb || [], color: '#f59e0b' },
    { key: 'gov', label: '政企业务', source: L?.gov || [], color: '#8b5cf6' }
  ]
  const loginRows = meta.map(m => ({ ...m, ...leaiBizSummary(rows, m.source) }))
  const loginGmvTotal = loginRows.reduce((s, r) => s + r.gmv, 0)
  const loginBuyTotal = loginRows.reduce((s, r) => s + r.buy, 0)
  const extraGmv = Math.max(0, leaiSum(rows, 'gmv') - loginGmvTotal)
  const extraBuy = Math.max(0, leaiSum(rows, 'buy') - loginBuyTotal)
  const gmvAdds = leaiDistributeAmount(extraGmv, loginRows.map(r => r.gmv))
  const buyAdds = leaiDistributeAmount(extraBuy, loginRows.map(r => r.buy))
  return loginRows.map((r, i) => ({
    ...r,
    loginGmv: r.gmv,
    loginBuy: r.buy,
    platformGmv: gmvAdds[i],
    platformBuy: buyAdds[i],
    gmv: r.gmv + gmvAdds[i],
    buy: r.buy + buyAdds[i]
  }))
}

export function leaiMetricDelta(rows, key) {
  if (rows.length < 2) return '单日快照'
  const first = Number(rows[0]?.[key]) || 0
  const last = Number(rows[rows.length - 1]?.[key]) || 0
  if (!first) return '较首日 -'
  const pct = (last - first) / first * 100
  return `较首日 ${pct >= 0 ? '+' : ''}${pct.toFixed(1)}%`
}

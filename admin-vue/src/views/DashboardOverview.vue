<template>
  <div class="page-inner">
    <!-- 页头 -->
    <div class="page-header">
      <div>
        <div class="page-title">运营总览</div>
        <div class="page-desc">乐享全渠道数据 · {{ periodText }} · 数据更新于 {{ LEAI_DATA.updated }}</div>
      </div>
      <div style="display:flex;gap:8px;align-items:center">
        <div class="dash-filter-bar">
          <button
            v-for="r in rangeOptions"
            :key="r.value"
            :class="['dash-pill', activeRange === r.value ? 'active' : '']"
            @click="activeRange = r.value"
          >{{ r.label }}</button>
        </div>
      </div>
    </div>

    <!-- KPI 四格 -->
    <div class="kpi-grid">
      <div class="kpi-card">
        <div class="kpi-label">DAU（日活跃用户）</div>
        <div class="kpi-value">{{ fmtW(summary.dau) }}</div>
        <div class="kpi-sub">日均登录 {{ fmtW(summary.loginAvg) }} · {{ metricDelta(summary.rows, 'dau') }}</div>
      </div>
      <div class="kpi-card">
        <div class="kpi-label">WAU（周活跃用户）</div>
        <div class="kpi-value">{{ fmtW(summary.wau) }}</div>
        <div class="kpi-sub">{{ rangeLabel }}均值 · {{ metricDelta(summary.rows, 'wau') }}</div>
      </div>
      <div class="kpi-card">
        <div class="kpi-label">MAU（月活跃用户）</div>
        <div class="kpi-value">{{ fmtW(summary.mau) }}</div>
        <div class="kpi-sub">月登录均值 {{ fmtW(summary.loginM) }} · {{ metricDelta(summary.rows, 'mau') }}</div>
      </div>
      <div class="kpi-card">
        <div class="kpi-label">GMV</div>
        <div class="kpi-value">{{ fmtY(summary.gmv) }}</div>
        <div class="kpi-sub">购买 {{ summary.buy.toLocaleString() }}人 · {{ metricDelta(summary.rows, 'gmv') }}</div>
      </div>
    </div>

    <!-- 洞察区块 -->
    <div class="overview-insight-stack overview-insight-demo">

      <!-- 关键经营链路 -->
      <div class="card overview-chain-board">
        <div class="overview-board-head">
          <div class="overview-title-group">
            <div class="card-title">关键经营链路</div>
            <span class="overview-soft-tag">转化漏斗</span>
          </div>
          <div class="overview-board-actions">
            <span class="overview-flow-hint">登录 → 互动 → 购买 → 成交</span>
          </div>
        </div>
        <div class="overview-chain-flow">
          <div class="overview-chain-step" style="--chain-color:#3f78c5">
            <div class="overview-step-top"><span>01</span><b>登录用户</b></div>
            <div class="overview-step-label">当日登录</div>
            <div class="overview-step-value">{{ fmtW(summary.login) }}</div>
            <div class="overview-step-meta">登录率 {{ fmtPct(summary.login, activeBase) }}</div>
          </div>
          <div class="overview-chain-connector" style="--connector-color:#3f78c5">
            <i></i><span>{{ fmtPct(summary.inter, summary.login) }}</span><em>互动转化</em>
          </div>
          <div class="overview-chain-step" style="--chain-color:#3f78c5">
            <div class="overview-step-top"><span>02</span><b>互动用户</b></div>
            <div class="overview-step-label">产生有效互动</div>
            <div class="overview-step-value">{{ fmtW(summary.inter) }}</div>
            <div class="overview-step-meta">较登录漏出 {{ fmtPct(summary.login - summary.inter, summary.login) }}</div>
          </div>
          <div class="overview-chain-connector is-warn" style="--connector-color:#d97706">
            <i></i><span>{{ fmtPct(summary.buy, summary.inter) }}</span><em>购买转化</em>
          </div>
          <div class="overview-chain-step" style="--chain-color:#3f78c5">
            <div class="overview-step-top"><span>03</span><b>购买人数</b></div>
            <div class="overview-step-label">完成下单</div>
            <div class="overview-step-value">{{ summary.buy.toLocaleString() }}人</div>
            <div class="overview-step-meta">转化瓶颈 · 重点关注</div>
          </div>
          <div class="overview-chain-connector" style="--connector-color:#3f78c5">
            <i></i><span>¥{{ avgOrder.toLocaleString() }}</span><em>客单价</em>
          </div>
          <div class="overview-chain-step is-result" style="--chain-color:#3f78c5">
            <div class="overview-step-top"><span>04</span><b>成交 GMV</b></div>
            <div class="overview-step-label">当日成交额</div>
            <div class="overview-step-value">{{ fmtY(summary.gmv) }}</div>
            <div class="overview-step-meta">日均 {{ fmtY(gmvDayAvg) }}</div>
          </div>
        </div>
      </div>

      <!-- GMV 结构拆解 -->
      <div class="card overview-structure-card">
        <div class="overview-board-head">
          <div class="overview-title-group">
            <div class="card-title">GMV 结构拆解</div>
            <span class="overview-soft-tag">{{ fmtY(summary.gmv) }}</span>
          </div>
          <div class="dash-card-note">登录口径 + 平台交易回算</div>
        </div>
        <div class="overview-structure-grid">
          <!-- 分业务 -->
          <div class="overview-breakdown-pane">
            <div class="overview-pane-title">
              <span>分业务</span>
              <b>合计 {{ fmtY(summary.gmv) }} · {{ bizBuyTotal.toLocaleString() }}人</b>
            </div>
            <div class="overview-breakdown-row"
              :style="`--row-color:#3f78c5;--row-progress:${pctWidth(biz[0].gmv, summary.gmv)}%`">
              <div class="overview-row-main"><span>消费业务</span><b>{{ fmtY(biz[0].gmv) }}</b></div>
              <div class="overview-row-meta">购买 {{ biz[0].buy.toLocaleString() }} 人 <strong>{{ fmtPct(biz[0].gmv, summary.gmv) }}</strong></div>
              <div class="overview-row-track"><span></span></div>
            </div>
            <div class="overview-breakdown-row"
              :style="`--row-color:#5b8def;--row-progress:${pctWidth(biz[1].gmv, summary.gmv)}%`">
              <div class="overview-row-main"><span>SMB 业务</span><b>{{ fmtY(biz[1].gmv) }}</b></div>
              <div class="overview-row-meta">购买 {{ biz[1].buy.toLocaleString() }} 人 <strong>{{ fmtPct(biz[1].gmv, summary.gmv) }}</strong></div>
              <div class="overview-row-track"><span></span></div>
            </div>
            <div class="overview-breakdown-row"
              :style="`--row-color:#9bbcff;--row-progress:${pctWidth(biz[2].gmv, summary.gmv)}%`">
              <div class="overview-row-main"><span>政企业务</span><b>{{ fmtY(biz[2].gmv) }}</b></div>
              <div class="overview-row-meta">购买 {{ biz[2].buy.toLocaleString() }} 人 <strong>{{ fmtPct(biz[2].gmv, summary.gmv) }}</strong></div>
              <div class="overview-row-track"><span></span></div>
            </div>
          </div>
          <!-- 分平台 -->
          <div class="overview-breakdown-pane overview-platform-pane">
            <div class="overview-pane-title">
              <span>分平台</span>
              <b>官网占比 {{ fmtPct(summary.offGmv, platformTotal) }}</b>
            </div>
            <div class="overview-breakdown-row"
              :style="`--row-color:#58a86a;--row-progress:${pctWidth(summary.nonGmv, platformTotal)}%`">
              <div class="overview-row-main"><span>非官网</span><b>{{ fmtY(summary.nonGmv) }}</b></div>
              <div class="overview-row-meta">购买 {{ summary.nonBuy.toLocaleString() }} 人 <strong>{{ fmtPct(summary.nonGmv, platformTotal) }}</strong></div>
              <div class="overview-row-track"><span></span></div>
            </div>
            <div class="overview-breakdown-row"
              :style="`--row-color:#6ac69a;--row-progress:${pctWidth(summary.offGmv, platformTotal)}%`">
              <div class="overview-row-main"><span>官网</span><b>{{ fmtY(summary.offGmv) }}</b></div>
              <div class="overview-row-meta">购买 {{ summary.offBuy.toLocaleString() }} 人 <strong>{{ fmtPct(summary.offGmv, platformTotal) }}</strong></div>
              <div class="overview-row-track"><span></span></div>
            </div>
            <div class="overview-price-compare">
              <span>客单价对比</span>
              <b>官网 ¥{{ offAvgOrder.toLocaleString() }} · 非官网 ¥{{ nonAvgOrder.toLocaleString() }}</b>
            </div>
          </div>
        </div>
      </div>

      <!-- 核心趋势速览（SVG折线，原版同款） -->
      <div class="card overview-trend-card">
        <div class="overview-board-head">
          <div class="overview-title-group">
            <div class="card-title">核心趋势速览</div>
            <span class="overview-soft-tag">近14天</span>
          </div>
          <div class="dash-card-note">环比对比上一周期</div>
        </div>
        <div class="overview-line-grid">
          <!-- DAU -->
          <div class="overview-line-card" data-metric="dau" style="--trend-color:#3f78c5">
            <div class="overview-line-head">
              <span>DAU</span>
              <em :class="['overview-line-delta', 'is-' + trendDelta(trend14, 'dau').tone]">
                {{ trendDelta(trend14, 'dau').text }}
              </em>
            </div>
            <div class="overview-line-value">{{ fmtW(summary.dau) }}</div>
            <svg class="overview-line-chart" viewBox="0 0 260 82" preserveAspectRatio="none" role="img" aria-label="DAU 趋势">
              <path class="overview-line-area" :d="svgArea(trend14, 'dau')"></path>
              <polyline class="overview-line-stroke" :points="svgPoints(trend14, 'dau')"></polyline>
              <circle class="overview-line-dot"
                :cx="svgLastPoint(trend14, 'dau').x.toFixed(1)"
                :cy="svgLastPoint(trend14, 'dau').y.toFixed(1)"
                r="3.5"></circle>
            </svg>
            <div class="overview-line-sub">近14天日均 {{ fmtW(avg14(trend14, 'dau')) }} · {{ metricDelta(trend14, 'dau') }}</div>
          </div>
          <!-- 互动用户 -->
          <div class="overview-line-card" data-metric="inter" style="--trend-color:#7c5cff">
            <div class="overview-line-head">
              <span>互动用户</span>
              <em :class="['overview-line-delta', 'is-' + trendDelta(trend14, 'inter').tone]">
                {{ trendDelta(trend14, 'inter').text }}
              </em>
            </div>
            <div class="overview-line-value">{{ fmtW(summary.inter) }}</div>
            <svg class="overview-line-chart" viewBox="0 0 260 82" preserveAspectRatio="none" role="img" aria-label="互动用户 趋势">
              <path class="overview-line-area" :d="svgArea(trend14, 'inter')"></path>
              <polyline class="overview-line-stroke" :points="svgPoints(trend14, 'inter')"></polyline>
              <circle class="overview-line-dot"
                :cx="svgLastPoint(trend14, 'inter').x.toFixed(1)"
                :cy="svgLastPoint(trend14, 'inter').y.toFixed(1)"
                r="3.5"></circle>
            </svg>
            <div class="overview-line-sub">近14天累计 · {{ metricDelta(trend14, 'inter') }}</div>
          </div>
          <!-- GMV -->
          <div class="overview-line-card" data-metric="gmv" style="--trend-color:#58a86a">
            <div class="overview-line-head">
              <span>GMV</span>
              <em :class="['overview-line-delta', 'is-' + trendDelta(trend14, 'gmv').tone]">
                {{ trendDelta(trend14, 'gmv').text }}
              </em>
            </div>
            <div class="overview-line-value">{{ fmtY(summary.gmv) }}</div>
            <svg class="overview-line-chart" viewBox="0 0 260 82" preserveAspectRatio="none" role="img" aria-label="GMV 趋势">
              <path class="overview-line-area" :d="svgArea(trend14, 'gmv')"></path>
              <polyline class="overview-line-stroke" :points="svgPoints(trend14, 'gmv')"></polyline>
              <circle class="overview-line-dot"
                :cx="svgLastPoint(trend14, 'gmv').x.toFixed(1)"
                :cy="svgLastPoint(trend14, 'gmv').y.toFixed(1)"
                r="3.5"></circle>
            </svg>
            <div class="overview-line-sub">近14天累计 · {{ metricDelta(trend14, 'gmv') }}</div>
          </div>
        </div>
      </div>
    </div>

    <!-- 下方双列：场景分布(ECharts) + 热门商品 -->
    <div class="grid-2" style="margin-top:16px">
      <!-- Query 场景分布（ECharts 柱状图） -->
      <div class="card">
        <div class="card-header">
          <div class="card-title">Query 场景分布</div>
          <div class="dash-filter-bar">
            <button :class="['dash-pill', scenarioMode === 'all' ? 'active' : '']" @click="scenarioMode = 'all'">整体</button>
            <button :class="['dash-pill', scenarioMode === 'active' ? 'active' : '']" @click="scenarioMode = 'active'">主动</button>
          </div>
        </div>
        <div ref="scenarioChartEl" style="height:200px;width:100%"></div>
      </div>

      <!-- 热门商品 TOP5 -->
      <div class="card">
        <div class="card-header">
          <div class="card-title">热门商品 TOP5</div>
          <div class="dash-filter-bar">
            <button :class="['dash-pill', productMetric === 'views' ? 'active' : '']" @click="productMetric = 'views'">浏览</button>
            <button :class="['dash-pill', productMetric === 'buyers' ? 'active' : '']" @click="productMetric = 'buyers'">购买</button>
            <button :class="['dash-pill', productMetric === 'cvr' ? 'active' : '']" @click="productMetric = 'cvr'">转化率</button>
          </div>
        </div>
        <table>
          <tr><th>商品</th><th>浏览量</th><th>购买人数</th><th>转化率</th></tr>
          <tr v-for="p in sortedProducts" :key="p.name">
            <td>{{ p.name }}</td>
            <td>{{ p.views.toLocaleString() }}</td>
            <td>{{ p.buyers.toLocaleString() }}</td>
            <td><span :class="['badge', p.cvr >= 4 ? 'status-on' : 'status-warn']">{{ p.cvr.toFixed(1) }}%</span></td>
          </tr>
        </table>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted, onBeforeUnmount, nextTick } from 'vue'
import * as echarts from 'echarts'
import { LEAI_DATA } from '../data/leaiData.js'

// ── 常量 ──────────────────────────────────────────────────
const PRODUCT_ROWS = [
  { name: 'ThinkPad X9-14 Aura AI元启版', views: 15847, buyers: 761, cvr: 4.8 },
  { name: 'YOGA Air 14 Aura AI元启版', views: 13203, buyers: 700, cvr: 5.3 },
  { name: '拯救者 R7000P 2025 AI元启', views: 11876, buyers: 487, cvr: 4.1 },
  { name: '联想小新Pro14GT AI元启版', views: 9543, buyers: 305, cvr: 3.2 },
  { name: 'ThinkPad P14s 2025 AI元启版', views: 7810, buyers: 203, cvr: 2.6 }
]

const RANGE_OPTIONS = [
  { value: '1d', label: '最近1天' },
  { value: '7d', label: '最近7天' },
  { value: '14d', label: '近14天' },
  { value: '30d', label: '近30天' }
]

// ── 响应式状态 ─────────────────────────────────────────────
const activeRange = ref('1d')
const scenarioMode = ref('all')
const productMetric = ref('views')
const scenarioChartEl = ref(null)
let scenarioChart = null

// ── 工具函数 ───────────────────────────────────────────────
const rangeOptions = RANGE_OPTIONS

function rangeSize(r) {
  return r === '1d' ? 1 : r === '7d' ? 7 : r === '14d' ? 14 : 30
}

function getRows(range) {
  const rows = LEAI_DATA.daily || []
  const n = Math.min(rangeSize(range), rows.length)
  return rows.slice(-n)
}

function sum(rows, key) {
  return rows.reduce((s, r) => s + (Number(r?.[key]) || 0), 0)
}

function avg(rows, key) {
  return rows.length ? Math.round(sum(rows, key) / rows.length) : 0
}

function fmtW(v) {
  v = Number(v) || 0
  return v >= 10000 ? (v / 10000).toFixed(1) + '万' : v.toLocaleString()
}

function fmtY(v) {
  v = Number(v) || 0
  return v >= 100000000 ? (v / 100000000).toFixed(2) + '亿'
    : v >= 10000 ? (v / 10000).toFixed(1) + '万'
    : v.toLocaleString()
}

function fmtPct(part, total) {
  return total ? (part / total * 100).toFixed(1) + '%' : '-'
}

function pctWidth(part, total, min = 4) {
  if (!total) return min
  return Math.max(min, Math.min(100, part / total * 100))
}

function metricDelta(rows, key) {
  if (rows.length < 2) return '单日快照'
  const first = Number(rows[0]?.[key]) || 0
  const last = Number(rows[rows.length - 1]?.[key]) || 0
  if (!first) return '较首日 -'
  const pct = (last - first) / first * 100
  return `较首日 ${pct >= 0 ? '+' : ''}${pct.toFixed(1)}%`
}

function trendDelta(rows, key) {
  if (rows.length < 2) return { text: '单日', tone: 'flat' }
  const first = Number(rows[0]?.[key]) || 0
  const last = Number(rows[rows.length - 1]?.[key]) || 0
  if (!first) return { text: '持平', tone: 'flat' }
  const pct = (last - first) / first * 100
  return {
    text: `${pct >= 0 ? '▲' : '▼'} ${Math.abs(pct).toFixed(1)}%`,
    tone: pct >= 0 ? 'up' : 'down'
  }
}

function avg14(rows, key) {
  return avg(rows, key)
}

// ── SVG 折线图辅助（同原版 leaiLineTrendHtml 坐标逻辑）────
const SVG_W = 260, SVG_H = 82, SVG_PX = 10, SVG_PY = 10

function svgCalcPoints(rows, key) {
  const vals = rows.map(r => Number(r?.[key]) || 0)
  const minV = Math.min(...vals, 0)
  const maxV = Math.max(...vals, 1)
  const range = Math.max(maxV - minV, 1)
  return vals.map((v, i) => {
    const x = vals.length <= 1 ? SVG_W / 2
      : SVG_PX + (SVG_W - SVG_PX * 2) * i / (vals.length - 1)
    const y = SVG_H - SVG_PY - ((v - minV) / range) * (SVG_H - SVG_PY * 2)
    return { x, y }
  })
}

function svgPoints(rows, key) {
  return svgCalcPoints(rows, key)
    .map(p => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ')
}

function svgArea(rows, key) {
  const pts = svgCalcPoints(rows, key)
  if (!pts.length) return ''
  const first = pts[0]
  const last = pts[pts.length - 1]
  const ptStr = pts.map(p => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ')
  return `M ${first.x.toFixed(1)} ${(SVG_H - SVG_PY).toFixed(1)} L ${ptStr} L ${last.x.toFixed(1)} ${(SVG_H - SVG_PY).toFixed(1)} Z`
}

function svgLastPoint(rows, key) {
  const pts = svgCalcPoints(rows, key)
  return pts[pts.length - 1] || { x: SVG_W - SVG_PX, y: SVG_H - SVG_PY }
}

// ── 分业务拆解（对应原版 leaiBizTradeSummaries）────────────
function bizSummaryFromSource(rows, source) {
  const dates = new Set(rows.map(r => r.d))
  const picked = (source || []).filter(r => dates.has(r.d))
  return { gmv: sum(picked, 'gmv'), buy: sum(picked, 'buy') }
}

function distributeAmount(total, weights) {
  total = Math.max(0, Math.round(Number(total) || 0))
  const wsum = weights.reduce((s, v) => s + (Number(v) || 0), 0)
  const shares = wsum
    ? weights.map(v => (Number(v) || 0) / wsum)
    : weights.map(() => 1 / Math.max(weights.length, 1))
  const raw = shares.map(v => v * total)
  const ints = raw.map(Math.floor)
  let left = total - ints.reduce((s, v) => s + v, 0)
  raw.map((v, i) => ({ i, frac: v - Math.floor(v) }))
    .sort((a, b) => b.frac - a.frac)
    .forEach(({ i }) => { if (left > 0) { ints[i] += 1; left -= 1 } })
  return ints
}

// ── Computed ───────────────────────────────────────────────
const rangeLabel = computed(() => {
  return RANGE_OPTIONS.find(r => r.value === activeRange.value)?.label || '最近1天'
})

const summary = computed(() => {
  const rows = getRows(activeRange.value)
  return {
    rows,
    dau: avg(rows, 'dau'),
    wau: avg(rows, 'wau'),
    mau: avg(rows, 'mau'),
    login: sum(rows, 'login'),
    loginAvg: avg(rows, 'login'),
    inter: sum(rows, 'inter'),
    buy: sum(rows, 'buy'),
    gmv: sum(rows, 'gmv'),
    offGmv: sum(rows, 'offGmv'),
    nonGmv: sum(rows, 'nonGmv'),
    offBuy: sum(rows, 'offBuy'),
    nonBuy: sum(rows, 'nonBuy'),
    loginM: avg(rows, 'loginM')
  }
})

const periodText = computed(() => {
  const rows = summary.value.rows
  if (!rows.length) return '-'
  const first = rows[0]?.d || ''
  const last = rows[rows.length - 1]?.d || ''
  const toFull = d => d ? '2026.' + d.replace('/', '.') : '-'
  return first === last ? toFull(last) : `${toFull(first)} - ${toFull(last)}`
})

const activeBase = computed(() => {
  const s = summary.value
  return s.dau * Math.max(s.rows.length, 1)
})

const avgOrder = computed(() => {
  const s = summary.value
  return s.buy ? Math.round(s.gmv / s.buy) : 0
})

const offAvgOrder = computed(() => {
  const s = summary.value
  return s.offBuy ? Math.round(s.offGmv / s.offBuy) : 0
})

const nonAvgOrder = computed(() => {
  const s = summary.value
  return s.nonBuy ? Math.round(s.nonGmv / s.nonBuy) : 0
})

const platformTotal = computed(() => summary.value.offGmv + summary.value.nonGmv)

const gmvDayAvg = computed(() => avg(summary.value.rows, 'gmv'))

const biz = computed(() => {
  const rows = summary.value.rows
  const sources = [LEAI_DATA.consumer || [], LEAI_DATA.smb || [], LEAI_DATA.gov || []]
  const loginSums = sources.map(src => bizSummaryFromSource(rows, src))
  const loginGmvTotal = loginSums.reduce((s, r) => s + r.gmv, 0)
  const loginBuyTotal = loginSums.reduce((s, r) => s + r.buy, 0)
  const totalGmv = summary.value.gmv
  const totalBuy = summary.value.buy
  const extraGmv = Math.max(0, totalGmv - loginGmvTotal)
  const extraBuy = Math.max(0, totalBuy - loginBuyTotal)
  const gmvAdds = distributeAmount(extraGmv, loginSums.map(r => r.gmv))
  const buyAdds = distributeAmount(extraBuy, loginSums.map(r => r.buy))
  return loginSums.map((r, i) => ({
    gmv: r.gmv + gmvAdds[i],
    buy: r.buy + buyAdds[i]
  }))
})

const bizBuyTotal = computed(() => biz.value.reduce((s, r) => s + r.buy, 0))

// 近14天趋势（固定取最后14天，不受 range 影响，同原版）
const trend14 = computed(() => {
  const rows = LEAI_DATA.daily || []
  return rows.slice(-14)
})

// 场景分布数据
const scenarioRows = computed(() => {
  const s = summary.value
  const mode = scenarioMode.value
  const total = mode === 'active' ? s.login : s.inter
  const weights = mode === 'active'
    ? [0.16, 0.31, 0.18, 0.09, 0.12, 0.14]
    : [0.20, 0.27, 0.16, 0.10, 0.13, 0.14]
  return ['会员', '电商', '服务', '门店', '方案', '咨询'].map((name, i) => ({
    name,
    value: Math.round(total * weights[i])
  }))
})

// 热门商品排序
const sortedProducts = computed(() => {
  return [...PRODUCT_ROWS].sort((a, b) => {
    if (productMetric.value === 'buyers') return b.buyers - a.buyers
    if (productMetric.value === 'cvr') return b.cvr - a.cvr
    return b.views - a.views
  })
})

// ── ECharts 场景图 ─────────────────────────────────────────
function renderScenarioChart() {
  if (!scenarioChartEl.value) return
  if (!scenarioChart) {
    scenarioChart = echarts.init(scenarioChartEl.value)
  }
  const rows = scenarioRows.value
  scenarioChart.setOption({
    grid: { top: 16, right: 8, bottom: 36, left: 40 },
    xAxis: {
      type: 'category',
      data: rows.map(r => r.name),
      axisLine: { lineStyle: { color: '#e5e7eb' } },
      axisTick: { show: false },
      axisLabel: { color: '#9199a6', fontSize: 12 }
    },
    yAxis: {
      type: 'value',
      splitLine: { lineStyle: { color: '#f0f1f3', type: 'dashed' } },
      axisLabel: {
        color: '#9199a6',
        fontSize: 11,
        formatter: v => v >= 10000 ? (v / 10000).toFixed(0) + '万' : String(v)
      }
    },
    series: [{
      type: 'bar',
      data: rows.map(r => r.value),
      barMaxWidth: 36,
      itemStyle: {
        color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
          { offset: 0, color: '#5b8cff' },
          { offset: 1, color: '#2563eb' }
        ]),
        borderRadius: [5, 5, 2, 2]
      },
      label: {
        show: true,
        position: 'top',
        color: '#6b7280',
        fontSize: 11,
        formatter: p => p.value >= 10000
          ? (p.value / 10000).toFixed(1) + '万'
          : String(p.value)
      }
    }],
    tooltip: {
      trigger: 'axis',
      formatter: p => `${p[0].name}<br/>${p[0].value.toLocaleString()}`
    }
  }, true)
}

watch(scenarioRows, () => {
  nextTick(renderScenarioChart)
})

onMounted(() => {
  nextTick(renderScenarioChart)
})

onBeforeUnmount(() => {
  if (scenarioChart) {
    scenarioChart.dispose()
    scenarioChart = null
  }
})
</script>

<style scoped>
/* 进度条（CSS变量驱动） */
:deep(.overview-row-track) {
  height: 4px;
  background: #f0f1f4;
  border-radius: 3px;
  margin-top: 6px;
  overflow: hidden;
}
:deep(.overview-row-track span) {
  display: block;
  height: 100%;
  width: var(--row-progress, 0%);
  background: var(--row-color, #3f78c5);
  border-radius: 3px;
  transition: width 0.4s ease;
}
</style>

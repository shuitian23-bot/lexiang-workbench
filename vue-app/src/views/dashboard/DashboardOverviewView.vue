<template>
  <div class="dashboard-overview-page">
    <div class="page-header">
      <div>
        <div class="page-title">运营总览</div>
        <div class="page-desc">乐享全渠道数据 · {{ periodText(summary.rows) }} · 数据更新于 {{ LEAI_DATA.updated }}</div>
      </div>
      <div class="dashboard-overview-actions">
        <div class="ops-time-filter">
          <div class="dash-filter-bar">
            <button
              v-for="item in ranges"
              :key="item.value"
              class="dash-pill"
              :class="{ active: range === item.value }"
              type="button"
              @click="setRange(item.value)"
            >
              {{ item.label }}
            </button>
          </div>
          <span v-if="range === 'custom'" class="ops-custom-range">
            <input v-model="customStart" type="date" class="ops-date-input" :min="dateBounds.min" :max="dateBounds.max" @change="syncCustomRange('start')">
            <span>至</span>
            <input v-model="customEnd" type="date" class="ops-date-input" :min="dateBounds.min" :max="dateBounds.max" @change="syncCustomRange('end')">
          </span>
        </div>
        <button class="btn btn-sm btn-secondary ai-insight-btn" type="button" @click="askOverview('overview')">AI 解读</button>
      </div>
    </div>

    <div class="kpi-grid">
      <div v-for="item in kpis" :key="item.label" class="kpi-card">
        <div class="kpi-label">{{ item.label }}</div>
        <div class="kpi-value">{{ item.value }}</div>
        <div class="kpi-sub">{{ item.sub }}</div>
      </div>
    </div>

    <div class="overview-insight-stack overview-insight-demo">
      <div class="card overview-chain-board">
        <div class="overview-board-head">
          <div class="overview-title-group">
            <div class="card-title">关键经营链路</div>
            <span class="overview-soft-tag">转化漏斗</span>
          </div>
          <div class="overview-board-actions">
            <span class="overview-flow-hint">登录 → 互动 → 购买 → 成交</span>
            <button class="btn btn-sm btn-secondary ai-insight-btn compact" type="button" @click="askOverview('funnel')">问 AI</button>
          </div>
        </div>
        <div class="overview-chain-flow">
          <template v-for="(step, index) in chainSteps" :key="step.title">
            <div class="overview-chain-step" :class="{ 'is-result': step.result }" :style="{ '--chain-color': step.color }">
              <div class="overview-step-top"><span>{{ step.index }}</span><b>{{ step.title }}</b></div>
              <div class="overview-step-label">{{ step.label }}</div>
              <div class="overview-step-value">{{ step.value }}</div>
              <div class="overview-step-meta">{{ step.meta }}</div>
            </div>
            <div
              v-if="index < chainConnectors.length"
              class="overview-chain-connector"
              :class="{ 'is-warn': chainConnectors[index].warn }"
              :style="{ '--connector-color': chainConnectors[index].color }"
            >
              <i></i><span>{{ chainConnectors[index].value }}</span><em>{{ chainConnectors[index].label }}</em>
            </div>
          </template>
        </div>
      </div>

      <div class="card overview-structure-card">
        <div class="overview-board-head">
          <div class="overview-title-group">
            <div class="card-title">GMV 结构拆解</div>
            <span class="overview-soft-tag">{{ fmtY(summary.gmv) }}</span>
          </div>
          <div class="dash-card-note">登录口径 + 平台交易回算</div>
        </div>
        <div class="overview-structure-grid">
          <div class="overview-breakdown-pane">
            <div class="overview-pane-title">
              <span>分业务</span>
              <b>合计 {{ fmtY(summary.gmv) }} · {{ bizBuyTotal.toLocaleString() }}人</b>
            </div>
            <div
              v-for="item in bizRows"
              :key="item.label"
              class="overview-breakdown-row"
              :style="{ '--row-color': item.color, '--row-progress': `${pctValue(item.gmv, summary.gmv)}%` }"
            >
              <div class="overview-row-main"><span>{{ item.label }}</span><b>{{ fmtY(item.gmv) }}</b></div>
              <div class="overview-row-meta">购买 {{ item.buy.toLocaleString() }} 人 <strong>{{ fmtPct(item.gmv, summary.gmv) }}</strong></div>
              <div class="overview-row-track"><span></span></div>
            </div>
          </div>
          <div class="overview-breakdown-pane overview-platform-pane">
            <div class="overview-pane-title">
              <span>分平台</span>
              <b>官网占比 {{ fmtPct(summary.offGmv, platformTotal) }}</b>
            </div>
            <div
              v-for="item in platformRows"
              :key="item.label"
              class="overview-breakdown-row"
              :style="{ '--row-color': item.color, '--row-progress': `${pctValue(item.gmv, platformTotal)}%` }"
            >
              <div class="overview-row-main"><span>{{ item.label }}</span><b>{{ fmtY(item.gmv) }}</b></div>
              <div class="overview-row-meta">购买 {{ item.buy.toLocaleString() }} 人 <strong>{{ fmtPct(item.gmv, platformTotal) }}</strong></div>
              <div class="overview-row-track"><span></span></div>
            </div>
            <div class="overview-price-compare">
              <span>客单价对比</span>
              <b>官网 ¥{{ offAvgOrder.toLocaleString() }} · 非官网 ¥{{ nonAvgOrder.toLocaleString() }}</b>
            </div>
          </div>
        </div>
      </div>

      <div class="card overview-trend-card">
        <div class="overview-board-head">
          <div class="overview-title-group">
            <div class="card-title">核心趋势速览</div>
            <span class="overview-soft-tag">近14天</span>
          </div>
          <div class="dash-card-note">环比对比上一周期</div>
        </div>
        <div class="overview-line-grid">
          <TrendCard
            v-for="card in trendCards"
            :key="card.key"
            :metric-key="card.key"
            :label="card.label"
            :rows="trendRows"
            :value="card.value"
            :sub="card.sub"
            :color="card.color"
            :formatter="card.formatter"
          />
        </div>
      </div>
    </div>

    <div class="grid-2">
      <div class="card overview-scenario-card">
        <div class="card-header">
          <div class="card-title">Query 场景分布</div>
          <div class="dash-filter-bar">
            <button class="dash-pill" :class="{ active: scenarioMode === 'all' }" type="button" @click="scenarioMode = 'all'">整体</button>
            <button class="dash-pill" :class="{ active: scenarioMode === 'active' }" type="button" @click="scenarioMode = 'active'">主动</button>
          </div>
        </div>
        <div class="dash-bar-chart overview-scenario-chart">
          <div
            v-for="item in scenarioRows"
            :key="item.name"
            class="dash-bar-item"
            :style="{ '--scenario-color': item.color, '--scenario-soft': item.softColor }"
          >
            <div class="dash-bar-value">{{ fmtW(item.value) }}</div>
            <div class="dash-bar" :style="{ height: `${Math.max(item.value / scenarioMax * 128, 12)}px` }"></div>
            <div class="dash-bar-label">{{ item.name }}</div>
          </div>
        </div>
      </div>

      <div class="card">
        <div class="card-header">
          <div class="card-title">热门商品 TOP5</div>
          <div class="dash-filter-bar">
            <button class="dash-pill" :class="{ active: productMetric === 'views' }" type="button" @click="productMetric = 'views'">浏览</button>
            <button class="dash-pill" :class="{ active: productMetric === 'buyers' }" type="button" @click="productMetric = 'buyers'">购买</button>
            <button class="dash-pill" :class="{ active: productMetric === 'cvr' }" type="button" @click="productMetric = 'cvr'">转化率</button>
          </div>
        </div>
        <table>
          <thead><tr><th>商品</th><th>浏览量</th><th>购买人数</th><th>转化率</th></tr></thead>
          <tbody>
            <tr v-for="item in productRowsSorted" :key="item.name">
              <td>{{ item.name }}</td>
              <td>{{ item.views.toLocaleString() }}</td>
              <td>{{ item.buyers.toLocaleString() }}</td>
              <td><span class="badge" :class="item.cvr >= 4 ? 'status-on' : 'status-warn'">{{ item.cvr.toFixed(1) }}%</span></td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, defineComponent, h, onMounted, ref } from 'vue'
import { useAppStore } from '@/stores/app'
import { useAIStore } from '@/stores/ai'

type RangeKey = '1d' | '7d' | '14d' | '30d' | 'custom'
type Row = {
  d: string
  dau: number
  wau: number
  mau: number
  login: number
  inter: number
  buy: number
  gmv: number
  loginM: number
  offGmv: number
  nonGmv: number
  offBuy: number
  nonBuy: number
}

const appStore = useAppStore()
const aiStore = useAIStore()

const LEAI_DATA = {
  updated: '2026-06-16',
  daily: [
    { d: '05/18', dau: 238913, wau: 1167402, mau: 5486620, login: 165991, inter: 71083, buy: 851, gmv: 6333040, loginM: 804450, offGmv: 4014935, nonGmv: 2318105, offBuy: 518, nonBuy: 333 },
    { d: '05/19', dau: 288191, wau: 1263033, mau: 5503862, login: 189756, inter: 75171, buy: 947, gmv: 8878477, loginM: 808618, offGmv: 6388373, nonGmv: 2490104, offBuy: 563, nonBuy: 384 },
    { d: '05/20', dau: 233044, wau: 1289282, mau: 5468849, login: 164402, inter: 59020, buy: 1430, gmv: 11635981, loginM: 807657, offGmv: 7722977, nonGmv: 3913004, offBuy: 975, nonBuy: 455 },
    { d: '05/21', dau: 253780, wau: 1338745, mau: 5433521, login: 166514, inter: 59285, buy: 2234, gmv: 16594658, loginM: 810007, offGmv: 6237240, nonGmv: 10357417, offBuy: 1131, nonBuy: 1103 },
    { d: '05/22', dau: 236861, wau: 1296191, mau: 5353428, login: 127428, inter: 9678, buy: 2446, gmv: 26456463, loginM: 812187, offGmv: 13125700, nonGmv: 13330763, offBuy: 1097, nonBuy: 1349 },
    { d: '05/23', dau: 234204, wau: 1326475, mau: 5317806, login: 113568, inter: 8700, buy: 2192, gmv: 14056509, loginM: 812787, offGmv: 1295053, nonGmv: 12761457, offBuy: 808, nonBuy: 1384 },
    { d: '05/24', dau: 237053, wau: 1346791, mau: 5297845, login: 122167, inter: 7513, buy: 2053, gmv: 13568720, loginM: 811229, offGmv: 1114233, nonGmv: 12454487, offBuy: 705, nonBuy: 1348 },
    { d: '05/25', dau: 240527, wau: 1345444, mau: 5295557, login: 128671, inter: 7878, buy: 2094, gmv: 13246593, loginM: 811412, offGmv: 2777612, nonGmv: 10468981, offBuy: 919, nonBuy: 1175 },
    { d: '05/26', dau: 316825, wau: 1386860, mau: 5299485, login: 208517, inter: 11654, buy: 2108, gmv: 18711492, loginM: 840310, offGmv: 7961394, nonGmv: 10750098, offBuy: 930, nonBuy: 1178 },
    { d: '05/27', dau: 276721, wau: 1408539, mau: 5290635, login: 167314, inter: 9674, buy: 2331, gmv: 19564104, loginM: 842552, offGmv: 7707397, nonGmv: 11856707, offBuy: 1038, nonBuy: 1293 },
    { d: '05/28', dau: 285054, wau: 1408479, mau: 5273202, login: 180355, inter: 14906, buy: 3235, gmv: 25777848, loginM: 840639, offGmv: 5157077, nonGmv: 20620771, offBuy: 1244, nonBuy: 1991 },
    { d: '05/29', dau: 301667, wau: 1431853, mau: 5259007, login: 187384, inter: 14714, buy: 3862, gmv: 43408844, loginM: 855637, offGmv: 19971945, nonGmv: 23436899, offBuy: 1702, nonBuy: 2160 },
    { d: '05/30', dau: 339524, wau: 1509202, mau: 5298425, login: 159777, inter: 31060, buy: 5954, gmv: 49536550, loginM: 818114, offGmv: 24288440, nonGmv: 25248110, offBuy: 3343, nonBuy: 2611 },
    { d: '05/31', dau: 282355, wau: 1548663, mau: 5317461, login: 111165, inter: 31905, buy: 6048, gmv: 41399933, loginM: 819804, offGmv: 17798867, nonGmv: 23601067, offBuy: 3664, nonBuy: 2384 },
    { d: '06/01', dau: 358501, wau: 1615370, mau: 5360225, login: 176226, inter: 42826, buy: 5563, gmv: 37855719, loginM: 824379, offGmv: 21040051, nonGmv: 16815668, offBuy: 3929, nonBuy: 1634 },
    { d: '06/02', dau: 377386, wau: 1661936, mau: 5405033, login: 198390, inter: 71804, buy: 3945, gmv: 29640176, loginM: 829776, offGmv: 9606591, nonGmv: 20033585, offBuy: 1991, nonBuy: 1954 },
    { d: '06/03', dau: 334601, wau: 1710453, mau: 5418741, login: 177362, inter: 71362, buy: 3837, gmv: 32060268, loginM: 839898, offGmv: 8537580, nonGmv: 23522688, offBuy: 1720, nonBuy: 2117 },
    { d: '06/04', dau: 263135, wau: 1708779, mau: 5406712, login: 140799, inter: 59707, buy: 4995, gmv: 32967533, loginM: 841719, offGmv: 4606539, nonGmv: 28360995, offBuy: 2414, nonBuy: 2581 },
    { d: '06/05', dau: 275521, wau: 1716725, mau: 5423066, login: 137815, inter: 63024, buy: 4770, gmv: 56102417, loginM: 846950, offGmv: 22930331, nonGmv: 33172087, offBuy: 1944, nonBuy: 2826 },
    { d: '06/06', dau: 281210, wau: 1693464, mau: 5476764, login: 134767, inter: 62182, buy: 4820, gmv: 42508699, loginM: 861380, offGmv: 5500938, nonGmv: 37007761, offBuy: 1514, nonBuy: 3306 },
    { d: '06/07', dau: 302652, wau: 1709308, mau: 5528610, login: 141452, inter: 78121, buy: 3610, gmv: 30856874, loginM: 865717, offGmv: 1208068, nonGmv: 29648806, offBuy: 928, nonBuy: 2682 },
    { d: '06/08', dau: 316750, wau: 1711840, mau: 5597427, login: 146307, inter: 83743, buy: 7473, gmv: 79018019, loginM: 880300, offGmv: 13287631, nonGmv: 65730388, offBuy: 1431, nonBuy: 6042 },
    { d: '06/09', dau: 331403, wau: 1692126, mau: 5693345, login: 170107, inter: 73267, buy: 8281, gmv: 78755356, loginM: 874181, offGmv: 17571253, nonGmv: 61184103, offBuy: 2656, nonBuy: 5625 },
    { d: '06/10', dau: 307634, wau: 1684378, mau: 5805815, login: 156195, inter: 66689, buy: 8961, gmv: 92028949, loginM: 885004, offGmv: 20584711, nonGmv: 71444238, offBuy: 3359, nonBuy: 5602 },
    { d: '06/11', dau: 278918, wau: 1704971, mau: 5898290, login: 144547, inter: 65586, buy: 7923, gmv: 79883314, loginM: 894254, offGmv: 23028590, nonGmv: 56854724, offBuy: 2728, nonBuy: 5195 },
    { d: '06/12', dau: 323424, wau: 1755073, mau: 6016941, login: 155610, inter: 101861, buy: 9366, gmv: 90473844, loginM: 904592, offGmv: 23847964, nonGmv: 66625880, offBuy: 3592, nonBuy: 5774 },
    { d: '06/13', dau: 325211, wau: 1789499, mau: 6120550, login: 156874, inter: 98833, buy: 8349, gmv: 81450292, loginM: 915742, offGmv: 9329594, nonGmv: 72120698, offBuy: 1830, nonBuy: 6519 },
    { d: '06/14', dau: 291654, wau: 1789941, mau: 6188144, login: 140254, inter: 86622, buy: 8820, gmv: 73343177, loginM: 916614, offGmv: 5249415, nonGmv: 68093763, offBuy: 2661, nonBuy: 6159 },
    { d: '06/15', dau: 334067, wau: 1810554, mau: 6269828, login: 197418, inter: 70224, buy: 7843, gmv: 79493124, loginM: 925139, offGmv: 13448828, nonGmv: 66044295, offBuy: 2219, nonBuy: 5624 },
    { d: '06/16', dau: 390426, wau: 1840301, mau: 6398712, login: 191419, inter: 107026, buy: 9212, gmv: 98016522, loginM: 935807, offGmv: 31972227, nonGmv: 66044295, offBuy: 3588, nonBuy: 5624 }
  ] satisfies Row[]
}

const PRODUCT_ROWS = [
  { name: 'ThinkPad X9-14 Aura AI元启版', views: 15847, buyers: 761, cvr: 4.8 },
  { name: 'YOGA Air 14 Aura AI元启版', views: 13203, buyers: 700, cvr: 5.3 },
  { name: '拯救者 R7000P 2025 AI元启', views: 11876, buyers: 487, cvr: 4.1 },
  { name: '联想小新Pro14GT AI元启版', views: 9543, buyers: 305, cvr: 3.2 },
  { name: 'ThinkPad P14s 2025 AI元启版', views: 7810, buyers: 203, cvr: 2.6 }
]

const ranges: Array<{ value: RangeKey; label: string }> = [
  { value: '1d', label: '最近1天' },
  { value: '7d', label: '最近7天' },
  { value: '14d', label: '最近14天' },
  { value: '30d', label: '最近30天' },
  { value: 'custom', label: '自定义' }
]
const range = ref<RangeKey>('1d')
const customStart = ref(rowIso(LEAI_DATA.daily[0].d))
const customEnd = ref(rowIso(LEAI_DATA.daily[LEAI_DATA.daily.length - 1].d))
const scenarioMode = ref<'all' | 'active'>('all')
const productMetric = ref<'views' | 'buyers' | 'cvr'>('views')
const scenarioColorMap: Record<string, string> = {
  会员: '#7c5cff',
  电商: '#3f78c5',
  服务: '#58a86a',
  门店: '#5b8def',
  方案: '#8da2bf',
  咨询: '#6ac69a'
}

const dateBounds = computed(() => ({ min: rowIso(LEAI_DATA.daily[0].d), max: rowIso(LEAI_DATA.daily[LEAI_DATA.daily.length - 1].d) }))
const summary = computed(() => buildSummary(range.value, customStart.value, customEnd.value))
const trendRows = computed(() => rowsForRange('14d'))
const platformTotal = computed(() => summary.value.offGmv + summary.value.nonGmv)
const activeBase = computed(() => summary.value.dau * Math.max(summary.value.rows.length, 1))
const avgOrder = computed(() => summary.value.buy ? Math.round(summary.value.gmv / summary.value.buy) : 0)
const offAvgOrder = computed(() => summary.value.offBuy ? Math.round(summary.value.offGmv / summary.value.offBuy) : 0)
const nonAvgOrder = computed(() => summary.value.nonBuy ? Math.round(summary.value.nonGmv / summary.value.nonBuy) : 0)

const bizRows = computed(() => {
  const weights = [
    { label: '消费业务', color: '#3f78c5', weight: 0.66 },
    { label: 'SMB 业务', color: '#5b8def', weight: 0.30 },
    { label: '政企业务', color: '#9bbcff', weight: 0.04 }
  ]
  return weights.map(item => ({ ...item, gmv: Math.round(summary.value.gmv * item.weight), buy: Math.round(summary.value.buy * item.weight) }))
})
const bizBuyTotal = computed(() => bizRows.value.reduce((total, item) => total + item.buy, 0))
const platformRows = computed(() => [
  { label: '非官网', color: '#58a86a', gmv: summary.value.nonGmv, buy: summary.value.nonBuy },
  { label: '官网', color: '#6ac69a', gmv: summary.value.offGmv, buy: summary.value.offBuy }
])

const kpis = computed(() => [
  { label: 'DAU（日活跃用户）', value: fmtW(summary.value.dau), sub: `日均登录 ${fmtW(summary.value.loginAvg)} · ${metricDelta(summary.value.rows, 'dau')}` },
  { label: 'WAU（周活跃用户）', value: fmtW(summary.value.wau), sub: `${rangeLabel(range.value)}均值 · ${metricDelta(summary.value.rows, 'wau')}` },
  { label: 'MAU（月活跃用户）', value: fmtW(summary.value.mau), sub: `月登录均值 ${fmtW(summary.value.loginM)} · ${metricDelta(summary.value.rows, 'mau')}` },
  { label: 'GMV', value: fmtY(summary.value.gmv), sub: `购买 ${summary.value.buy.toLocaleString()}人 · ${metricDelta(summary.value.rows, 'gmv')}` }
])

const chainSteps = computed(() => [
  { index: '01', title: '登录用户', label: '当日登录', value: fmtW(summary.value.login), meta: `登录率 ${fmtPct(summary.value.login, activeBase.value)}`, color: '#3f78c5' },
  { index: '02', title: '互动用户', label: '产生有效互动', value: fmtW(summary.value.inter), meta: `较登录漏出 ${fmtPct(summary.value.login - summary.value.inter, summary.value.login)}`, color: '#3f78c5' },
  { index: '03', title: '购买人数', label: '完成下单', value: `${summary.value.buy.toLocaleString()}人`, meta: '转化瓶颈 · 重点关注', color: '#3f78c5' },
  { index: '04', title: '成交 GMV', label: '当日成交额', value: fmtY(summary.value.gmv), meta: `日均 ${fmtY(avg(summary.value.rows, 'gmv'))}`, color: '#3f78c5', result: true }
])
const chainConnectors = computed(() => [
  { value: fmtPct(summary.value.inter, summary.value.login), label: '互动转化', color: '#3f78c5' },
  { value: fmtPct(summary.value.buy, summary.value.inter), label: '购买转化', color: '#d97706', warn: true },
  { value: `¥${avgOrder.value.toLocaleString()}`, label: '客单价', color: '#3f78c5' }
])

const trendCards = computed(() => [
  { key: 'dau' as const, label: 'DAU', value: summary.value.dau, sub: `近14天日均 ${fmtW(avg(trendRows.value, 'dau'))} · ${metricDelta(trendRows.value, 'dau')}`, color: '#3f78c5', formatter: fmtW },
  { key: 'inter' as const, label: '互动用户', value: summary.value.inter, sub: `近14天累计 · ${metricDelta(trendRows.value, 'inter')}`, color: '#7c5cff', formatter: fmtW },
  { key: 'gmv' as const, label: 'GMV', value: summary.value.gmv, sub: `近14天累计 · ${metricDelta(trendRows.value, 'gmv')}`, color: '#58a86a', formatter: fmtY }
])

const scenarioRows = computed(() => {
  const total = scenarioMode.value === 'active' ? summary.value.login : summary.value.inter
  const weights = scenarioMode.value === 'active' ? [0.16, 0.31, 0.18, 0.09, 0.12, 0.14] : [0.20, 0.27, 0.16, 0.10, 0.13, 0.14]
  return ['会员', '电商', '服务', '门店', '方案', '咨询'].map((name, index) => {
    const color = scenarioColorMap[name]
    return {
      name,
      value: Math.round(total * weights[index]),
      color,
      softColor: hexToRgba(color, 0.66)
    }
  })
})
const scenarioMax = computed(() => Math.max(...scenarioRows.value.map(item => item.value), 1))
const productRowsSorted = computed(() => [...PRODUCT_ROWS].sort((a, b) => {
  if (productMetric.value === 'buyers') return b.buyers - a.buyers
  if (productMetric.value === 'cvr') return b.cvr - a.cvr
  return b.views - a.views
}))

function setRange(next: RangeKey) {
  range.value = next
  if (next === 'custom') {
    customStart.value ||= dateBounds.value.min
    customEnd.value ||= dateBounds.value.max
  }
}

function syncCustomRange(part: 'start' | 'end') {
  range.value = 'custom'
  if (customStart.value > customEnd.value) {
    if (part === 'start') customEnd.value = customStart.value
    else customStart.value = customEnd.value
  }
}

function rowsForRange(current: RangeKey) {
  if (current === 'custom') {
    const start = customStart.value <= customEnd.value ? customStart.value : customEnd.value
    const end = customStart.value <= customEnd.value ? customEnd.value : customStart.value
    return LEAI_DATA.daily.filter(row => rowIso(row.d) >= start && rowIso(row.d) <= end)
  }
  const size = current === '1d' ? 1 : current === '7d' ? 7 : current === '14d' ? 14 : 30
  return LEAI_DATA.daily.slice(-size)
}

function buildSummary(current: RangeKey, start: string, end: string) {
  const previousStart = customStart.value
  const previousEnd = customEnd.value
  customStart.value = start
  customEnd.value = end
  const selected = rowsForRange(current)
  customStart.value = previousStart
  customEnd.value = previousEnd
  return {
    rows: selected,
    dau: avg(selected, 'dau'),
    wau: avg(selected, 'wau'),
    mau: avg(selected, 'mau'),
    login: sum(selected, 'login'),
    loginAvg: avg(selected, 'login'),
    inter: sum(selected, 'inter'),
    buy: sum(selected, 'buy'),
    gmv: sum(selected, 'gmv'),
    offGmv: sum(selected, 'offGmv'),
    nonGmv: sum(selected, 'nonGmv'),
    offBuy: sum(selected, 'offBuy'),
    nonBuy: sum(selected, 'nonBuy'),
    loginM: avg(selected, 'loginM')
  }
}

function rowIso(value: string) {
  const [month, day] = value.split('/')
  return `2026-${month.padStart(2, '0')}-${day.padStart(2, '0')}`
}

function sum(rows: Row[], key: keyof Row) {
  return rows.reduce((total, row) => total + (Number(row[key]) || 0), 0)
}

function avg(rows: Row[], key: keyof Row) {
  return rows.length ? Math.round(sum(rows, key) / rows.length) : 0
}

function fmtW(value: number) {
  return value >= 10000 ? `${(value / 10000).toFixed(1)}万` : value.toLocaleString()
}

function fmtY(value: number) {
  if (value >= 100000000) return `${(value / 100000000).toFixed(2)}亿`
  return value >= 10000 ? `${(value / 10000).toFixed(1)}万` : value.toLocaleString()
}

function fmtPct(part: number, total: number) {
  return total ? `${(part / total * 100).toFixed(1)}%` : '-'
}

function hexToRgba(color: string, alpha: number) {
  const hex = color.replace('#', '')
  const r = parseInt(hex.slice(0, 2), 16)
  const g = parseInt(hex.slice(2, 4), 16)
  const b = parseInt(hex.slice(4, 6), 16)
  return `rgba(${r}, ${g}, ${b}, ${alpha})`
}

function pctValue(part: number, total: number, min = 4) {
  if (!total) return 0
  const value = Math.max(0, Math.min(100, part / total * 100))
  return value ? Math.max(value, min).toFixed(1) : '0'
}

function periodText(rows: Row[]) {
  const first = rows[0]?.d || ''
  const last = rows[rows.length - 1]?.d || ''
  const full = (value: string) => value ? `2026.${value.replace('/', '.')}` : '-'
  return first === last ? full(last) : `${full(first)} - ${full(last)}`
}

function rangeLabel(current: RangeKey) {
  return ranges.find(item => item.value === current)?.label || '最近1天'
}

function metricDelta(rows: Row[], key: keyof Row) {
  if (rows.length < 2) return '单日快照'
  const first = Number(rows[0]?.[key]) || 0
  const last = Number(rows[rows.length - 1]?.[key]) || 0
  if (!first) return '较首日 -'
  const pct = (last - first) / first * 100
  return `较首日 ${pct >= 0 ? '+' : ''}${pct.toFixed(1)}%`
}

function trendDelta(rows: Row[], key: keyof Row) {
  if (rows.length < 2) return { text: '单日', tone: 'flat' }
  const first = Number(rows[0]?.[key]) || 0
  const last = Number(rows[rows.length - 1]?.[key]) || 0
  if (!first) return { text: '持平', tone: 'flat' }
  const pct = (last - first) / first * 100
  return { text: `${pct >= 0 ? '▲' : '▼'} ${Math.abs(pct).toFixed(1)}%`, tone: pct >= 0 ? 'up' : 'down' }
}

function askOverview(kind: 'overview' | 'funnel') {
  const label = rangeLabel(range.value)
  const prompts = {
    overview: `基于当前运营总览看板，分析${label}的主要趋势、核心风险、增长机会和优先动作。`,
    funnel: `基于当前运营总览看板，重点分析${label}从登录、互动到购买和GMV的转化链路，指出瓶颈和需要补充的数据。`
  }
  aiStore.toggleOpen(true)
  aiStore.quickSend(prompts[kind], 'dashboard.overview')
}

const TrendCard = defineComponent({
  props: {
    rows: { type: Array<Row>, required: true },
    metricKey: { type: String, required: true },
    label: { type: String, required: true },
    value: { type: Number, required: true },
    sub: { type: String, required: true },
    color: { type: String, required: true },
    formatter: { type: Function, required: true }
  },
  setup(props) {
    return () => {
      const values = props.rows.map(row => Number(row[props.metricKey as keyof Row]) || 0)
      const min = Math.min(...values, 0)
      const max = Math.max(...values, 1)
      const rangeValue = Math.max(max - min, 1)
      const width = 260
      const height = 82
      const padX = 10
      const padY = 10
      const points = values.map((value, index) => {
        const x = values.length <= 1 ? width / 2 : padX + (width - padX * 2) * index / (values.length - 1)
        const y = height - padY - ((value - min) / rangeValue) * (height - padY * 2)
        return { x, y }
      })
      const pointStr = points.map(point => `${point.x.toFixed(1)},${point.y.toFixed(1)}`).join(' ')
      const first = points[0] || { x: padX, y: height - padY }
      const last = points[points.length - 1] || { x: width - padX, y: height - padY }
      const areaD = `M ${first.x.toFixed(1)} ${(height - padY).toFixed(1)} L ${pointStr} L ${last.x.toFixed(1)} ${(height - padY).toFixed(1)} Z`
      const delta = trendDelta(props.rows, props.metricKey as keyof Row)
      return h('div', { class: 'overview-line-card', 'data-metric': props.metricKey, style: { '--trend-color': props.color } }, [
        h('div', { class: 'overview-line-head' }, [
          h('span', props.label),
          h('em', { class: `overview-line-delta is-${delta.tone}` }, delta.text)
        ]),
        h('div', { class: 'overview-line-value' }, props.formatter(props.value)),
        h('svg', { class: 'overview-line-chart', viewBox: `0 0 ${width} ${height}`, preserveAspectRatio: 'none', role: 'img', 'aria-label': `${props.label} 趋势` }, [
          h('path', { class: 'overview-line-area', d: areaD }),
          h('polyline', { class: 'overview-line-stroke', points: pointStr }),
          h('circle', { class: 'overview-line-dot', cx: last.x.toFixed(1), cy: last.y.toFixed(1), r: '3.5' })
        ]),
        h('div', { class: 'overview-line-sub' }, props.sub)
      ])
    }
  }
})

onMounted(() => {
  appStore.ensureStaticTab('dashboard.overview')
  appStore.setActiveStaticTab('dashboard.overview')
  document.title = '运营总览 - 乐享 AI 工作台'
})
</script>

<style scoped>
.dashboard-overview-actions {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
  flex-wrap: wrap;
  justify-content: flex-end;
}

.overview-scenario-card {
  overflow: hidden;
}

.overview-scenario-chart {
  min-height: 220px;
  gap: 16px;
  padding: 22px 12px 8px;
  border-top: 1px solid var(--border-light);
}

.overview-scenario-chart .dash-bar-item {
  gap: 8px;
  animation: overviewChartItemIn 560ms cubic-bezier(.22, .8, .28, 1) both;
}

.overview-scenario-chart .dash-bar-item:nth-child(1) { animation-delay: 40ms; }
.overview-scenario-chart .dash-bar-item:nth-child(2) { animation-delay: 80ms; }
.overview-scenario-chart .dash-bar-item:nth-child(3) { animation-delay: 120ms; }
.overview-scenario-chart .dash-bar-item:nth-child(4) { animation-delay: 160ms; }
.overview-scenario-chart .dash-bar-item:nth-child(5) { animation-delay: 200ms; }
.overview-scenario-chart .dash-bar-item:nth-child(6) { animation-delay: 240ms; }

.overview-scenario-chart .dash-bar-item:hover .dash-bar {
  transform: translateY(-3px);
  filter: saturate(1.04);
}

.overview-line-card {
  animation: overviewChartCardIn 560ms cubic-bezier(.22, .8, .28, 1) both;
}

.overview-line-card:nth-child(1) { animation-delay: 40ms; }
.overview-line-card:nth-child(2) { animation-delay: 100ms; }
.overview-line-card:nth-child(3) { animation-delay: 160ms; }

.overview-line-chart .overview-line-stroke {
  stroke-dasharray: 620;
  stroke-dashoffset: 620;
  animation: overviewLineDraw 780ms cubic-bezier(.22, .8, .28, 1) 120ms both;
}

.overview-line-chart .overview-line-area {
  opacity: 0;
  animation: overviewAreaFade 620ms ease 220ms both;
}

.overview-line-chart .overview-line-dot {
  transform-box: fill-box;
  transform-origin: center;
  animation: overviewDotPop 420ms cubic-bezier(.2, .9, .28, 1.25) 620ms both;
}

.overview-scenario-chart .dash-bar-value {
  color: var(--scenario-color);
  font-weight: 600;
}

.overview-scenario-chart .dash-bar {
  width: 30px;
  border-radius: 6px 6px 2px 2px;
  background: linear-gradient(180deg, var(--scenario-soft) 0%, var(--scenario-color) 100%);
  box-shadow: 0 8px 18px rgba(63, 120, 197, 0.10);
  transform-origin: center bottom;
  transition: transform .16s ease, filter .16s ease;
}

.overview-scenario-chart .dash-bar-label {
  color: var(--text-tertiary);
  font-weight: 500;
}

@keyframes overviewChartItemIn {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@keyframes overviewChartCardIn {
  from {
    opacity: 0;
    transform: translateY(8px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@keyframes overviewLineDraw {
  to {
    stroke-dashoffset: 0;
  }
}

@keyframes overviewAreaFade {
  to {
    opacity: 1;
  }
}

@keyframes overviewDotPop {
  from {
    opacity: 0;
    transform: scale(.72);
  }
  to {
    opacity: 1;
    transform: scale(1);
  }
}

@media (prefers-reduced-motion: reduce) {
  .overview-scenario-chart .dash-bar-item,
  .overview-line-card,
  .overview-line-chart .overview-line-stroke,
  .overview-line-chart .overview-line-area,
  .overview-line-chart .overview-line-dot {
    animation: none;
  }
}
</style>

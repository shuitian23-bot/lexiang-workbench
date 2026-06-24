<template>
  <div class="page-inner">
    <!-- 页头 -->
    <div class="page-header">
      <div>
        <div class="page-title">质量分析</div>
        <div class="page-desc">服务满意度 · 性能 · 对话质量 · 异常监控 · 用户评分</div>
      </div>
      <div class="filter-bar">
        <div style="display:flex;align-items:center;gap:4px;background:var(--bg);border:1px solid var(--border-light);border-radius:6px;padding:3px 8px;font-size:11px">
          <span style="color:var(--text-tertiary);font-size:9px;font-family:monospace">FROM</span>
          <input type="date" v-model="dateFrom" style="padding:1px 4px;border:1px solid var(--border-light);border-radius:4px;font-size:11px;font-family:monospace;cursor:pointer;outline:none;width:100px;text-align:center">
        </div>
        <div style="display:flex;align-items:center;gap:4px;background:var(--bg);border:1px solid var(--border-light);border-radius:6px;padding:3px 8px;font-size:11px">
          <span style="color:var(--text-tertiary);font-size:9px;font-family:monospace">TO</span>
          <input type="date" v-model="dateTo" style="padding:1px 4px;border:1px solid var(--border-light);border-radius:4px;font-size:11px;font-family:monospace;cursor:pointer;outline:none;width:100px;text-align:center">
        </div>
        <button class="btn btn-primary" @click="applyFilter">筛选</button>
        <button class="btn btn-secondary" @click="clearFilter">清除</button>
        <button class="btn btn-secondary" @click="refresh">&#8635;</button>
      </div>
    </div>

    <!-- ====== 原生 ====== -->
    <div class="ops-section-title">原生</div>
    <div class="grid-4">
      <div class="ops-kpi highlight"><div class="ops-kpi-label">点踩率</div><div class="ops-kpi-val">{{ kpi.thumbdownRate }}</div><div class="ops-kpi-sub">点踩case / 主动query</div></div>
      <div class="ops-kpi"><div class="ops-kpi-label">低满意率</div><div class="ops-kpi-val">{{ kpi.lowSatRate }}</div><div class="ops-kpi-sub">低满意度case / 弹窗样本量</div></div>
      <div class="ops-kpi"><div class="ops-kpi-label">点踩case</div><div class="ops-kpi-val">{{ kpi.thumbdownCount }}</div><div class="ops-kpi-sub">T-1/筛选时段</div></div>
      <div class="ops-kpi"><div class="ops-kpi-label">低满意度case</div><div class="ops-kpi-val">{{ kpi.lowSatCount }}</div><div class="ops-kpi-sub">T-1/筛选时段</div></div>
    </div>
    <div class="grid-2" style="margin-top:12px">
      <div class="ops-card"><h3>乐享原生 Badcase 总数概况（堆积柱状图）</h3><div ref="cSatisfactionTrend" style="height:280px"></div></div>
      <div class="ops-card"><h3>点踩率 + 低满意率</h3><div ref="cRateTrend" style="height:280px"></div></div>
    </div>

    <!-- ====== 智能客服 ====== -->
    <div class="ops-section-title">智能客服</div>
    <div class="grid-4">
      <div class="ops-kpi highlight"><div class="ops-kpi-label">点踩率</div><div class="ops-kpi-val">{{ kpi.csThumbdownRate }}</div><div class="ops-kpi-sub">点踩case / 智能客服总量</div></div>
      <div class="ops-kpi"><div class="ops-kpi-label">点踩case</div><div class="ops-kpi-val">{{ kpi.csThumbdownCount }}</div><div class="ops-kpi-sub">T-1/筛选时段</div></div>
      <div class="ops-kpi"><div class="ops-kpi-label">智能客服总量</div><div class="ops-kpi-val">{{ kpi.csTotal }}</div><div class="ops-kpi-sub">T-1/筛选时段</div></div>
      <div class="ops-kpi"><div class="ops-kpi-label">转人工率</div><div class="ops-kpi-val">{{ kpi.csTransferRate }}</div><div class="ops-kpi-sub">转人工 / 智能客服</div></div>
    </div>
    <div class="ops-card" style="margin-top:12px"><h3>点踩 case 趋势</h3><div ref="cCsThumbdownTrend" style="height:260px"></div></div>

    <!-- ====== 性能 ====== -->
    <div class="ops-section-title">性能</div>
    <div class="grid-4">
      <div class="ops-kpi highlight"><div class="ops-kpi-label">首token avg</div><div class="ops-kpi-val">{{ kpi.firstTokenAvg }}</div><div class="ops-kpi-sub">T-1</div></div>
      <div class="ops-kpi"><div class="ops-kpi-label">首token p90</div><div class="ops-kpi-val">{{ kpi.firstTokenP90 }}</div><div class="ops-kpi-sub">T-1</div></div>
      <div class="ops-kpi"><div class="ops-kpi-label">首token p95</div><div class="ops-kpi-val">{{ kpi.firstTokenP95 }}</div><div class="ops-kpi-sub">T-1</div></div>
      <div class="ops-kpi"><div class="ops-kpi-label">首token p99</div><div class="ops-kpi-val">{{ kpi.firstTokenP99 }}</div><div class="ops-kpi-sub">T-1</div></div>
    </div>
    <div class="grid-2" style="margin-top:12px">
      <div class="ops-card">
        <h3>分意图首token平均耗时</h3>
        <div style="display:flex;gap:4px;margin-bottom:8px;background:var(--bg);border-radius:6px;padding:2px;width:fit-content">
          <span
            style="padding:3px 10px;border-radius:4px;font-size:10px;cursor:pointer"
            :style="firstTokenMode==='think'?{color:'var(--primary)',background:'#fff',boxShadow:'0 1px 2px rgba(0,0,0,0.06)'}:{color:'var(--text-tertiary)'}"
            @click="switchFirstTokenMode('think')">思考</span>
          <span
            style="padding:3px 10px;border-radius:4px;font-size:10px;cursor:pointer"
            :style="firstTokenMode==='nothink'?{color:'var(--primary)',background:'#fff',boxShadow:'0 1px 2px rgba(0,0,0,0.06)'}:{color:'var(--text-tertiary)'}"
            @click="switchFirstTokenMode('nothink')">非思考</span>
        </div>
        <div ref="cFirstTokenByIntent" style="height:300px"></div>
      </div>
      <div class="ops-card"><h3>问答类正文首token</h3><div ref="cQaFirstToken" style="height:300px"></div></div>
    </div>
    <div class="grid-2" style="margin-top:12px">
      <div class="ops-card"><h3>单次会话平均等待时长</h3><div ref="cSessionWait" style="height:240px"></div></div>
      <div class="ops-card"><h3>首token性能趋势（avg/p90/p95/p99）</h3><div ref="cFirstTokenTrend" style="height:300px"></div></div>
    </div>
    <div class="grid-2" style="margin-top:12px">
      <div class="ops-card"><h3>首token(非缓存/非思考) 趋势</h3><div ref="cFirstTokenNoCacheTrend" style="height:280px"></div></div>
      <div class="ops-card">
        <h3>单次回答平均等待时长</h3>
        <div style="display:flex;gap:4px;margin-bottom:8px;background:var(--bg);border-radius:6px;padding:2px;width:fit-content">
          <span
            style="padding:3px 10px;border-radius:4px;font-size:10px;cursor:pointer"
            :style="waitLenMode==='short'?{color:'var(--primary)',background:'#fff',boxShadow:'0 1px 2px rgba(0,0,0,0.06)'}:{color:'var(--text-tertiary)'}"
            @click="switchWaitLenMode('short')">&le;300字</span>
          <span
            style="padding:3px 10px;border-radius:4px;font-size:10px;cursor:pointer"
            :style="waitLenMode==='long'?{color:'var(--primary)',background:'#fff',boxShadow:'0 1px 2px rgba(0,0,0,0.06)'}:{color:'var(--text-tertiary)'}"
            @click="switchWaitLenMode('long')">&gt;300字</span>
        </div>
        <div ref="cAnswerWaitTrend" style="height:260px"></div>
      </div>
    </div>

    <!-- ====== 对话质量 ====== -->
    <div class="ops-section-title">对话质量</div>
    <div class="grid-4">
      <div class="ops-kpi highlight"><div class="ops-kpi-label">平均对话轮数</div><div class="ops-kpi-val">{{ kpi.avgTurns }}</div><div class="ops-kpi-sub">轮</div></div>
      <div class="ops-kpi"><div class="ops-kpi-label">人均交互次数</div><div class="ops-kpi-val">{{ kpi.avgInteractions }}</div><div class="ops-kpi-sub">次</div></div>
      <div class="ops-kpi"><div class="ops-kpi-label">多轮对话占比</div><div class="ops-kpi-val">{{ kpi.multiTurnPct }}</div><div class="ops-kpi-sub">&ge;2轮 / 总会话</div></div>
      <div class="ops-kpi"><div class="ops-kpi-label">单轮解决率</div><div class="ops-kpi-val">{{ kpi.singleTurnPct }}</div><div class="ops-kpi-sub">1轮 / 总会话</div></div>
    </div>
    <div class="grid-2" style="margin-top:12px">
      <div class="ops-card"><h3>多轮对话深度分布</h3><div ref="cTurnDepth" style="height:280px"></div></div>
      <div class="ops-card"><h3>人均交互次数趋势</h3><div ref="cInteractionTrend" style="height:280px"></div></div>
    </div>

    <!-- ====== 异常 ====== -->
    <div class="ops-section-title">异常</div>
    <div class="grid-4">
      <div class="ops-kpi" style="border-color:var(--red)"><div class="ops-kpi-label">异常占比</div><div class="ops-kpi-val" style="color:var(--red)">{{ kpi.errorPct }}</div><div class="ops-kpi-sub">异常case / 总case</div></div>
      <div class="ops-kpi" style="border-color:var(--orange)"><div class="ops-kpi-label">MCP异常次数</div><div class="ops-kpi-val" style="color:var(--orange)">{{ kpi.mcpError }}</div><div class="ops-kpi-sub">T-1/筛选时段</div></div>
      <div class="ops-kpi" style="border-color:var(--orange)"><div class="ops-kpi-label">用户中断率</div><div class="ops-kpi-val" style="color:var(--orange)">{{ kpi.interruptRate }}</div><div class="ops-kpi-sub">中断交互 / 总交互</div></div>
      <div class="ops-kpi" style="border-color:var(--red)"><div class="ops-kpi-label">回复空白率</div><div class="ops-kpi-val" style="color:var(--red)">{{ kpi.emptyRespRate }}</div><div class="ops-kpi-sub">空response / 总response</div></div>
    </div>
    <div class="grid-2" style="margin-top:12px">
      <div class="ops-card">
        <h3>各工具失败次数</h3>
        <div style="max-height:400px;overflow-y:auto">
          <table class="data-table">
            <thead><tr><th style="text-align:left">工具</th><th>失败次数</th></tr></thead>
            <tbody>
              <tr v-for="t in toolFailuresSorted" :key="t.tool">
                <td style="text-align:left">{{ t.tool }}</td>
                <td :style="{color: t.count > 5 ? 'var(--red)' : t.count > 2 ? 'var(--orange)' : 'var(--text)'}">{{ t.count }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
      <div class="ops-card"><h3>各场景工具失败次数</h3><div ref="cSceneFailure" style="height:300px"></div></div>
    </div>
    <div class="grid-2" style="margin-top:12px">
      <div class="ops-card">
        <h3>Agent 异常次数统计</h3>
        <div style="max-height:400px;overflow-y:auto">
          <table class="data-table">
            <thead><tr><th style="text-align:left">异常类型</th><th>次数</th></tr></thead>
            <tbody>
              <tr v-for="e in agentErrorsSorted" :key="e.type">
                <td style="text-align:left">{{ e.type }}</td>
                <td :style="{color: e.count > 5 ? 'var(--red)' : e.count > 2 ? 'var(--orange)' : 'var(--text)'}">{{ e.count }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
      <div class="ops-card">
        <h3>核心工具异常次数</h3>
        <div style="max-height:400px;overflow-y:auto">
          <table class="data-table">
            <thead><tr><th style="text-align:left">核心工具</th><th>异常次数</th></tr></thead>
            <tbody>
              <tr v-for="t in coreToolErrorsSorted" :key="t.tool">
                <td style="text-align:left">{{ t.tool }}</td>
                <td :style="{color: t.count > 3 ? 'var(--red)' : t.count > 1 ? 'var(--orange)' : 'var(--text)'}">{{ t.count }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>

    <!-- ====== 用户评分 ====== -->
    <div class="ops-section-title">用户评分</div>
    <div class="grid-3">
      <div class="ops-kpi highlight"><div class="ops-kpi-label">OSAT</div><div class="ops-kpi-val">{{ kpi.osat }}</div><div class="ops-kpi-sub">满意度</div></div>
      <div class="ops-kpi"><div class="ops-kpi-label">NPS</div><div class="ops-kpi-val">{{ kpi.nps }}</div><div class="ops-kpi-sub">净推荐值</div></div>
      <div class="ops-kpi"><div class="ops-kpi-label">净评价值</div><div class="ops-kpi-val">{{ kpi.netScore }}</div><div class="ops-kpi-sub">(点赞-点踩)/(点赞+点踩)</div></div>
    </div>
    <div class="grid-3" style="margin-top:12px">
      <div class="ops-card"><h3>满意度 / OSAT 趋势</h3><div ref="cOsatTrend" style="height:280px"></div></div>
      <div class="ops-card"><h3>NPS 趋势</h3><div ref="cNpsTrend" style="height:280px"></div></div>
      <div class="ops-card"><h3>净评价值趋势</h3><div ref="cNetScoreTrend" style="height:280px"></div></div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted, onBeforeUnmount } from 'vue'

// ---- 调色板 ----
const Q_PALETTE = ['#3370ff', '#34c724', '#722ed1', '#ff7d00', '#e2001a', '#8f959e', '#00b578', '#f59e0b', '#ec4899', '#14b8a6']

// ---- 筛选状态 ----
const dateFrom = ref('')
const dateTo = ref('')

// ---- 切换模式 ----
const firstTokenMode = ref('think')
const waitLenMode = ref('short')

// ---- KPI ----
const kpi = reactive({
  thumbdownRate: '--', lowSatRate: '--', thumbdownCount: '--', lowSatCount: '--',
  csThumbdownRate: '--', csThumbdownCount: '--', csTotal: '--', csTransferRate: '--',
  firstTokenAvg: '--', firstTokenP90: '--', firstTokenP95: '--', firstTokenP99: '--',
  avgTurns: '--', avgInteractions: '--', multiTurnPct: '--', singleTurnPct: '--',
  errorPct: '--', mcpError: '--', interruptRate: '--', emptyRespRate: '--',
  osat: '--', nps: '--', netScore: '--'
})

// ---- 表格数据 ----
const toolFailuresSorted = ref([])
const agentErrorsSorted = ref([])
const coreToolErrorsSorted = ref([])

// ---- chart refs ----
const cSatisfactionTrend = ref(null)
const cRateTrend = ref(null)
const cCsThumbdownTrend = ref(null)
const cFirstTokenByIntent = ref(null)
const cQaFirstToken = ref(null)
const cSessionWait = ref(null)
const cFirstTokenTrend = ref(null)
const cFirstTokenNoCacheTrend = ref(null)
const cAnswerWaitTrend = ref(null)
const cTurnDepth = ref(null)
const cInteractionTrend = ref(null)
const cSceneFailure = ref(null)
const cOsatTrend = ref(null)
const cNpsTrend = ref(null)
const cNetScoreTrend = ref(null)

let _charts = {}
let _qualityData = null
let _currentData = null
let _currentDates = []

// ---- ECharts 主题 ----
const TH = {
  backgroundColor: 'transparent',
  textStyle: { color: '#646a73' },
  legend: { textStyle: { color: '#646a73', fontSize: 10 } },
  tooltip: { backgroundColor: '#fff', borderColor: '#e5e6eb', borderWidth: 1, textStyle: { color: '#1f2329', fontSize: 12 }, extraCssText: 'box-shadow:0 4px 12px rgba(0,0,0,0.08)' }
}

function getChart(elRef) {
  const echarts = window.echarts
  if (!echarts || !elRef.value) return null
  const key = elRef.value.__chartKey || (elRef.value.__chartKey = Math.random())
  if (!_charts[key]) _charts[key] = echarts.init(elRef.value)
  return _charts[key]
}

// ---- Mock 数据生成（来自 workbench-quality.js _genMockData） ----
function genMockData() {
  const dates = []
  const today = new Date(); today.setHours(0, 0, 0, 0)
  for (let i = 29; i >= 0; i--) {
    const d = new Date(today); d.setDate(d.getDate() - i)
    dates.push(d.toISOString().slice(0, 10))
  }

  function walk(base, variance, min, max) {
    let val = base
    return dates.map((_, i) => {
      val += (Math.random() - 0.48) * variance
      val = Math.max(min, Math.min(max, val))
      const dow = new Date(today); dow.setDate(dow.getDate() - (29 - i))
      const day = dow.getDay()
      if (day === 0 || day === 6) val *= 0.75 + Math.random() * 0.1
      return +val.toFixed(2)
    })
  }
  function walkInt(base, variance, min, max) { return walk(base, variance, min, max).map(v => Math.round(v)) }

  const baseQueries = 9500
  const activeQueries = walkInt(baseQueries, 300, 7000, 13000)
  const csQueries = walkInt(2800, 150, 1800, 4200)
  const thumbdownRates = walk(1.6, 0.08, 0.8, 3.2)
  const lowSatRates = walk(3.5, 0.12, 1.8, 6.0)
  const surveyRate = walk(0.38, 0.01, 0.28, 0.50)

  const daily = dates.map((d, i) => {
    const aq = activeQueries[i], cq = csQueries[i]
    const tdRate = thumbdownRates[i], lsRate = lowSatRates[i], sr = surveyRate[i]
    const surveySamples = Math.round(aq * sr)
    const thumbdown = Math.round(aq * tdRate / 100)
    const lowSat = Math.round(surveySamples * lsRate / 100)
    const likeBase = Math.round(aq * (0.12 + Math.random() * 0.04))
    const dislike = Math.round(likeBase * (tdRate / 8 + 0.05))
    const perfBase = Math.max(200, 480 - i * 4 + (Math.random() - 0.5) * 40)
    const firstTokenAvg = Math.round(perfBase + (Math.random() - 0.5) * 30)
    const firstTokenP90 = Math.round(firstTokenAvg * 1.6 + (Math.random() - 0.5) * 50)
    const firstTokenP95 = Math.round(firstTokenP90 * 1.15 + (Math.random() - 0.5) * 40)
    const firstTokenP99 = Math.round(firstTokenP95 * 1.2 + (Math.random() - 0.5) * 60)
    const nocacheBase = Math.max(280, perfBase + 80 + (Math.random() - 0.5) * 30)
    const ftNoCacheAvg = Math.round(nocacheBase)
    const ftNoCacheP90 = Math.round(ftNoCacheAvg * 1.55 + (Math.random() - 0.5) * 50)
    const ftNoCacheP95 = Math.round(ftNoCacheP90 * 1.12 + (Math.random() - 0.5) * 40)
    const ftNoCacheP99 = Math.round(ftNoCacheP95 * 1.18 + (Math.random() - 0.5) * 60)
    const qaThinkBase = Math.max(300, 450 - i * 3 + (Math.random() - 0.5) * 30)
    const qaThinkP90 = Math.round(qaThinkBase * 1.55 + (Math.random() - 0.5) * 40)
    const qaThinkP99 = Math.round(qaThinkP90 * 1.18 + (Math.random() - 0.5) * 50)
    const qaNothinkBase = Math.max(140, 230 - i * 2 + (Math.random() - 0.5) * 20)
    const qaNothinkP90 = Math.round(qaNothinkBase * 1.5 + (Math.random() - 0.5) * 30)
    const qaNothinkP99 = Math.round(qaNothinkP90 * 1.15 + (Math.random() - 0.5) * 40)
    const osat = +(78 + i * 0.25 + (Math.random() - 0.5) * 2).toFixed(1)
    const nps = +(25 + i * 0.4 + (Math.random() - 0.5) * 5).toFixed(1)
    const netScore = +((likeBase - dislike) / (likeBase + dislike) * 100).toFixed(1)
    const turn1 = Math.round(aq * (0.38 + (Math.random() - 0.5) * 0.04))
    const turn2 = Math.round(aq * (0.22 + (Math.random() - 0.5) * 0.03))
    const turn3_4 = Math.round(aq * (0.18 + (Math.random() - 0.5) * 0.02))
    const turn5_9 = Math.round(aq * (0.12 + (Math.random() - 0.5) * 0.02))
    const turn10_19 = Math.round(aq * (0.06 + (Math.random() - 0.5) * 0.01))
    const turn20p = Math.round(aq * (0.04 + (Math.random() - 0.5) * 0.01))
    const totalSessions = turn1 + turn2 + turn3_4 + turn5_9 + turn10_19 + turn20p
    const avgTurns = +((1 * turn1 + 2 * turn2 + 3.5 * turn3_4 + 7 * turn5_9 + 14.5 * turn10_19 + 25 * turn20p) / totalSessions).toFixed(1)
    const avgInteractions = +(avgTurns * 1.15 + (Math.random() - 0.5) * 0.3).toFixed(1)
    return {
      date: d, active_queries: aq, cs_queries: cq,
      thumbdown_count: thumbdown, low_sat_count: lowSat, survey_samples: surveySamples,
      cs_thumbdown: Math.round(cq * (tdRate / 100 * 0.6 + 0.005)),
      cs_transfer_rate: +(3.5 - i * 0.03 + (Math.random() - 0.5) * 0.6).toFixed(1),
      first_token_avg: firstTokenAvg, first_token_p90: firstTokenP90,
      first_token_p95: firstTokenP95, first_token_p99: firstTokenP99,
      first_token_nocache_avg: ftNoCacheAvg, first_token_nocache_p90: ftNoCacheP90,
      first_token_nocache_p95: ftNoCacheP95, first_token_nocache_p99: ftNoCacheP99,
      session_wait_avg: +(1.6 - i * 0.012 + (Math.random() - 0.5) * 0.15).toFixed(2),
      answer_wait_short: +(1.0 - i * 0.008 + (Math.random() - 0.5) * 0.1).toFixed(2),
      answer_wait_long: +(2.0 - i * 0.012 + (Math.random() - 0.5) * 0.15).toFixed(2),
      avg_turns: avgTurns, avg_interactions: avgInteractions,
      multi_turn_pct: +((totalSessions - turn1) / totalSessions * 100).toFixed(1),
      single_turn_pct: +(turn1 / totalSessions * 100).toFixed(1),
      error_pct: +(1.2 - i * 0.01 + (Math.random() - 0.5) * 0.3).toFixed(1),
      mcp_error: Math.round(8 - i * 0.1 + (Math.random() - 0.5) * 4),
      interrupt_rate: +(2.5 - i * 0.02 + (Math.random() - 0.5) * 0.4).toFixed(1),
      empty_resp_rate: +(0.3 + (Math.random() - 0.5) * 0.15).toFixed(2),
      osat, nps, net_score: netScore, like_count: likeBase, dislike_count: dislike,
      qa_think_avg: Math.round(qaThinkBase), qa_think_p90: qaThinkP90, qa_think_p99: qaThinkP99,
      qa_nothink_avg: Math.round(qaNothinkBase), qa_nothink_p90: qaNothinkP90, qa_nothink_p99: qaNothinkP99,
    }
  })

  const intentBase = [
    { intent: '电商售前', think: 580, nothink: 280 }, { intent: '电商售后', think: 520, nothink: 250 },
    { intent: '服务场景', think: 650, nothink: 310 }, { intent: '门店场景', think: 450, nothink: 220 },
    { intent: '会员场景', think: 480, nothink: 230 }, { intent: '超级咨询', think: 560, nothink: 260 },
  ]
  const intentFirstToken = {
    think: intentBase.map(x => ({ intent: x.intent, avg: x.think + Math.round((Math.random() - 0.5) * 50) })),
    nothink: intentBase.map(x => ({ intent: x.intent, avg: x.nothink + Math.round((Math.random() - 0.5) * 30) })),
  }

  const toolFailureBase = [
    { tool: '通用知识服务', base: 8 }, { tool: '商品知识服务', base: 5 },
    { tool: '解决方案服务', base: 4 }, { tool: '商品推荐服务', base: 2 },
    { tool: '维修知识检索', base: 3 }, { tool: '活动优惠服务', base: 2 },
    { tool: '商品优惠服务', base: 1 }, { tool: '行情洞察分析', base: 1 },
    { tool: '会员权益服务', base: 2 }, { tool: '会员权益一键领取', base: 1 },
    { tool: '设备中心', base: 3 }, { tool: '设备绑定服务', base: 1 },
    { tool: '门店知识检索', base: 2 }, { tool: '联想门店服务', base: 1 },
    { tool: '门店预约服务-更新', base: 1 }, { tool: '门店预约服务-取消', base: 1 },
    { tool: '门店预约服务-创建', base: 1 }, { tool: '订单详情', base: 2 },
    { tool: '会员中心', base: 1 }, { tool: '资产中心', base: 1 },
    { tool: '教育优惠认证', base: 1 }, { tool: '臻选推荐服务', base: 1 },
    { tool: '立即支付', base: 1 }, { tool: '立即购买', base: 1 },
    { tool: '转人工', base: 2 }, { tool: '乐豆推荐商品', base: 1 },
    { tool: '维修工单中心', base: 1 },
  ]
  const toolFailures = toolFailureBase.map(t => ({ tool: t.tool, count: Math.max(0, t.base + Math.round((Math.random() - 0.5) * 3)) }))

  const sceneFailures = [
    { scene: '电商售前', count: 8 + Math.round(Math.random() * 6) },
    { scene: '电商售后', count: 6 + Math.round(Math.random() * 5) },
    { scene: '服务场景', count: 7 + Math.round(Math.random() * 6) },
    { scene: '门店场景', count: 4 + Math.round(Math.random() * 4) },
    { scene: '会员场景', count: 3 + Math.round(Math.random() * 3) },
    { scene: '超级咨询场景', count: 5 + Math.round(Math.random() * 5) },
  ]

  const agentErrors = [
    { type: '超出工具集范围', count: 4 + Math.round(Math.random() * 4) },
    { type: '结果形态-格式错乱', count: 3 + Math.round(Math.random() * 3) },
    { type: '参数校验异常', count: 5 + Math.round(Math.random() * 5) },
    { type: '结果形态-空结果', count: 2 + Math.round(Math.random() * 3) },
    { type: '响应超时', count: 3 + Math.round(Math.random() * 4) },
    { type: '权限调用异常', count: 1 + Math.round(Math.random() * 2) },
    { type: '风控拦截', count: 1 + Math.round(Math.random() * 2) },
    { type: '大模型调用失败', count: 2 + Math.round(Math.random() * 2) },
  ]

  const coreToolErrors = [
    { tool: '立即支付', count: Math.round(Math.random() * 2) },
    { tool: '立即购买', count: Math.round(Math.random() * 2) },
    { tool: '设备绑定服务', count: Math.round(Math.random()) },
    { tool: '设备解绑服务', count: Math.round(Math.random() * 0.5) },
    { tool: '订单详情', count: Math.round(Math.random() * 2) },
    { tool: '乐豆推荐商品', count: Math.round(Math.random()) },
    { tool: '会员中心', count: Math.round(Math.random()) },
    { tool: '资产中心', count: Math.round(Math.random() * 0.5) },
    { tool: '教育优惠认证', count: Math.round(Math.random()) },
  ]

  const turnDepth = [
    { label: '1轮', count: daily.reduce((s, d) => s + Math.round(d.active_queries * 0.38), 0) },
    { label: '2轮', count: daily.reduce((s, d) => s + Math.round(d.active_queries * 0.22), 0) },
    { label: '3-4轮', count: daily.reduce((s, d) => s + Math.round(d.active_queries * 0.18), 0) },
    { label: '5-9轮', count: daily.reduce((s, d) => s + Math.round(d.active_queries * 0.12), 0) },
    { label: '10-19轮', count: daily.reduce((s, d) => s + Math.round(d.active_queries * 0.06), 0) },
    { label: '20轮+', count: daily.reduce((s, d) => s + Math.round(d.active_queries * 0.04), 0) },
  ]

  return { daily, intentFirstToken, toolFailures, sceneFailures, agentErrors, coreToolErrors, turnDepth }
}

function filterData(data) {
  if (!dateFrom.value && !dateTo.value) return data
  return {
    ...data,
    daily: data.daily.filter(d => {
      if (dateFrom.value && d.date < dateFrom.value) return false
      if (dateTo.value && d.date > dateTo.value) return false
      return true
    })
  }
}

// ---- KPI 更新 ----
function updateKpi(data) {
  const t1Idx = Math.max(0, data.daily.length - 2)
  const latest = data.daily[t1Idx] || {}
  kpi.thumbdownRate = latest.active_queries ? (latest.thumbdown_count / (latest.active_queries - latest.cs_queries) * 100).toFixed(2) + '%' : '--'
  kpi.lowSatRate = latest.survey_samples ? (latest.low_sat_count / latest.survey_samples * 100).toFixed(2) + '%' : '--'
  kpi.thumbdownCount = fmtNum(latest.thumbdown_count || 0)
  kpi.lowSatCount = fmtNum(latest.low_sat_count || 0)
  kpi.csThumbdownRate = latest.cs_queries ? (latest.cs_thumbdown / latest.cs_queries * 100).toFixed(2) + '%' : '--'
  kpi.csThumbdownCount = fmtNum(latest.cs_thumbdown || 0)
  kpi.csTotal = fmtNum(latest.cs_queries || 0)
  kpi.csTransferRate = (latest.cs_transfer_rate || 0) + '%'
  kpi.firstTokenAvg = (latest.first_token_avg || 0) + 'ms'
  kpi.firstTokenP90 = (latest.first_token_p90 || 0) + 'ms'
  kpi.firstTokenP95 = (latest.first_token_p95 || 0) + 'ms'
  kpi.firstTokenP99 = (latest.first_token_p99 || 0) + 'ms'
  kpi.avgTurns = latest.avg_turns || '--'
  kpi.avgInteractions = latest.avg_interactions || '--'
  kpi.multiTurnPct = (latest.multi_turn_pct || 0) + '%'
  kpi.singleTurnPct = (latest.single_turn_pct || 0) + '%'
  kpi.errorPct = (latest.error_pct || 0) + '%'
  kpi.mcpError = latest.mcp_error || 0
  kpi.interruptRate = (latest.interrupt_rate || 0) + '%'
  kpi.emptyRespRate = (latest.empty_resp_rate || 0) + '%'
  kpi.osat = latest.osat || '--'
  kpi.nps = latest.nps || '--'
  kpi.netScore = latest.net_score || '--'
}

function fmtNum(n) {
  n = Number(n) || 0
  if (n >= 1e8) return (n / 1e8).toFixed(1).replace(/\.0$/, '') + '亿'
  if (n >= 1e4) return (n / 1e4).toFixed(1).replace(/\.0$/, '') + '万'
  return n.toLocaleString()
}

// ---- 图表渲染 ----
function _qLineSeries(dates, series, colors, extraYAxis) {
  const echarts = window.echarts
  return {
    tooltip: { trigger: 'axis' },
    legend: { data: series.map(s => s.name), bottom: 0, textStyle: { fontSize: 10, color: '#646a73' } },
    grid: { left: 50, right: 16, top: 20, bottom: 36 },
    xAxis: { type: 'category', data: dates, axisLabel: { color: '#8f959e', fontSize: 9, rotate: 30 }, axisLine: { lineStyle: { color: '#e5e6eb' } } },
    yAxis: extraYAxis || { type: 'value', axisLabel: { color: '#8f959e', fontSize: 10 }, splitLine: { lineStyle: { color: '#e5e6eb', type: 'dashed' } } },
    series: series.map((s, i) => ({
      name: s.name, type: 'line', data: s.data, smooth: true, symbol: 'circle', symbolSize: 4,
      lineStyle: { width: 2, color: colors[i] }, itemStyle: { color: colors[i] },
      areaStyle: s.area && echarts ? { color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [{ offset: 0, color: colors[i] + '33' }, { offset: 1, color: colors[i] + '05' }]) } : undefined,
    }))
  }
}

function renderAllCharts(data) {
  const echarts = window.echarts
  if (!echarts) return
  const dates = data.daily.map(d => d.date.slice(5))
  _currentData = data
  _currentDates = dates

  // 满意度堆积
  const ch1 = getChart(cSatisfactionTrend)
  if (ch1) ch1.setOption({ ...TH, tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } }, legend: { data: ['点踩case', '低满意度case'], bottom: 0, textStyle: { color: '#646a73', fontSize: 10 } }, grid: { left: 50, right: 16, top: 10, bottom: 36 }, xAxis: { type: 'category', data: dates, axisLabel: { color: '#8f959e', fontSize: 9, rotate: 30 }, axisLine: { lineStyle: { color: '#e5e6eb' } } }, yAxis: { type: 'value', axisLabel: { color: '#8f959e', fontSize: 10 }, splitLine: { lineStyle: { color: '#e5e6eb', type: 'dashed' } } }, series: [{ name: '点踩case', type: 'bar', stack: 'total', data: data.daily.map(d => d.thumbdown_count), itemStyle: { color: '#e2001a' }, barWidth: '55%' }, { name: '低满意度case', type: 'bar', stack: 'total', data: data.daily.map(d => d.low_sat_count), itemStyle: { color: '#ff7d00' } }] })

  // 点踩率双轴
  const ch2 = getChart(cRateTrend)
  if (ch2) {
    const tdRates = data.daily.map(d => d.active_queries ? +(d.thumbdown_count / (d.active_queries - d.cs_queries) * 100).toFixed(2) : 0)
    const lsRates = data.daily.map(d => d.survey_samples ? +(d.low_sat_count / d.survey_samples * 100).toFixed(2) : 0)
    ch2.setOption({ ...TH, tooltip: { trigger: 'axis' }, legend: { data: ['点踩率', '低满意率'], bottom: 0, textStyle: { color: '#646a73', fontSize: 10 } }, grid: { left: 50, right: 50, top: 10, bottom: 36 }, xAxis: { type: 'category', data: dates, axisLabel: { color: '#8f959e', fontSize: 9, rotate: 30 }, axisLine: { lineStyle: { color: '#e5e6eb' } } }, yAxis: [{ type: 'value', name: '点踩率', axisLabel: { color: '#e2001a', fontSize: 10, formatter: '{value}%' }, splitLine: { lineStyle: { color: '#e5e6eb', type: 'dashed' } }, nameTextStyle: { color: '#e2001a', fontSize: 10 } }, { type: 'value', name: '低满意率', axisLabel: { color: '#ff7d00', fontSize: 10, formatter: '{value}%' }, splitLine: { show: false }, nameTextStyle: { color: '#ff7d00', fontSize: 10 } }], series: [{ name: '点踩率', type: 'line', data: tdRates, smooth: true, symbol: 'circle', symbolSize: 4, lineStyle: { width: 2, color: '#e2001a' }, itemStyle: { color: '#e2001a' } }, { name: '低满意率', type: 'line', yAxisIndex: 1, data: lsRates, smooth: true, symbol: 'circle', symbolSize: 4, lineStyle: { width: 2, color: '#ff7d00' }, itemStyle: { color: '#ff7d00' } }] })
  }

  // 客服点踩趋势
  const ch3 = getChart(cCsThumbdownTrend)
  if (ch3) ch3.setOption({ ...TH, tooltip: { trigger: 'axis' }, legend: { data: ['点踩case'], bottom: 0, textStyle: { color: '#646a73', fontSize: 10 } }, grid: { left: 50, right: 16, top: 10, bottom: 36 }, xAxis: { type: 'category', data: dates, axisLabel: { color: '#8f959e', fontSize: 9, rotate: 30 }, axisLine: { lineStyle: { color: '#e5e6eb' } } }, yAxis: { type: 'value', axisLabel: { color: '#8f959e', fontSize: 10 }, splitLine: { lineStyle: { color: '#e5e6eb', type: 'dashed' } } }, series: [{ name: '点踩case', type: 'line', data: data.daily.map(d => d.cs_thumbdown), smooth: true, symbol: 'circle', symbolSize: 4, lineStyle: { width: 2, color: '#e2001a' }, itemStyle: { color: '#e2001a' }, areaStyle: { color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [{ offset: 0, color: '#e2001a33' }, { offset: 1, color: '#e2001a05' }]) } }] })

  // 首token by intent
  renderFirstTokenByIntent()

  // QA 首token
  renderQaFirstToken(data, dates)

  // 会话等待
  const ch6 = getChart(cSessionWait)
  if (ch6) ch6.setOption({ ...TH, ..._qLineSeries(dates, [{ name: '平均等待(s)', data: data.daily.map(d => d.session_wait_avg), area: true }], ['#3370ff'], { type: 'value', axisLabel: { color: '#8f959e', fontSize: 10, formatter: '{value}s' }, splitLine: { lineStyle: { color: '#e5e6eb', type: 'dashed' } } }) })

  // 首token 趋势
  const ch7 = getChart(cFirstTokenTrend)
  if (ch7) ch7.setOption({ ...TH, ..._qLineSeries(dates, ['avg', 'p90', 'p95', 'p99'].map((n, i) => ({ name: n, data: data.daily.map(d => [d.first_token_avg, d.first_token_p90, d.first_token_p95, d.first_token_p99][i]) })), ['#3370ff', '#34c724', '#ff7d00', '#e2001a'], { type: 'value', axisLabel: { color: '#8f959e', fontSize: 10, formatter: '{value}ms' }, splitLine: { lineStyle: { color: '#e5e6eb', type: 'dashed' } } }) })

  // 非缓存首token 趋势
  const ch8 = getChart(cFirstTokenNoCacheTrend)
  if (ch8) ch8.setOption({ ...TH, ..._qLineSeries(dates, ['avg', 'p90', 'p95', 'p99'].map((n, i) => ({ name: n, data: data.daily.map(d => [d.first_token_nocache_avg, d.first_token_nocache_p90, d.first_token_nocache_p95, d.first_token_nocache_p99][i]) })), ['#722ed1', '#34c724', '#ff7d00', '#e2001a'], { type: 'value', axisLabel: { color: '#8f959e', fontSize: 10, formatter: '{value}ms' }, splitLine: { lineStyle: { color: '#e5e6eb', type: 'dashed' } } }) })

  // 回答等待趋势
  renderAnswerWaitTrend(data)

  // 对话深度 pie
  const ch10 = getChart(cTurnDepth)
  if (ch10) {
    const td = data.turnDepth || _qualityData.turnDepth
    ch10.setOption({ backgroundColor: 'transparent', tooltip: { trigger: 'item', formatter: '{b}<br/>{c} ({d}%)' }, legend: { bottom: 0, textStyle: { color: '#646a73', fontSize: 10 } }, series: [{ type: 'pie', radius: ['40%', '68%'], center: ['50%', '46%'], padAngle: 1.5, itemStyle: { borderRadius: 4, borderColor: '#fff', borderWidth: 2 }, data: td.map((t, i) => ({ name: t.label, value: t.count, itemStyle: { color: Q_PALETTE[i % Q_PALETTE.length] } })), label: { color: '#646a73', fontSize: 10, formatter: '{b}\n{d}%' }, emphasis: { label: { fontSize: 12, fontWeight: 700, color: '#1f2329' } } }] })
  }

  // 交互次数趋势
  const ch11 = getChart(cInteractionTrend)
  if (ch11) ch11.setOption({ ...TH, ..._qLineSeries(dates, [{ name: '平均对话轮数', data: data.daily.map(d => d.avg_turns) }, { name: '人均交互次数', data: data.daily.map(d => d.avg_interactions) }], ['#3370ff', '#722ed1']) })

  // 工具失败表格
  toolFailuresSorted.value = [...(data.toolFailures || _qualityData.toolFailures)].sort((a, b) => b.count - a.count)

  // 场景失败条形图
  const ch12 = getChart(cSceneFailure)
  if (ch12) {
    const scenes = [...(data.sceneFailures || _qualityData.sceneFailures)].sort((a, b) => b.count - a.count)
    ch12.setOption({ backgroundColor: 'transparent', tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } }, grid: { left: 80, right: 20, top: 10, bottom: 20 }, xAxis: { type: 'value', axisLabel: { color: '#8f959e', fontSize: 10 }, splitLine: { lineStyle: { color: '#e5e6eb', type: 'dashed' } } }, yAxis: { type: 'category', data: scenes.map(s => s.scene).reverse(), axisLabel: { color: '#646a73', fontSize: 11 } }, series: [{ type: 'bar', data: scenes.map(s => s.count).reverse(), itemStyle: { color: function (p) { return p.value > 10 ? '#e2001a' : p.value > 5 ? '#ff7d00' : '#3370ff' }, borderRadius: [0, 3, 3, 0] }, barWidth: '55%', label: { show: true, position: 'right', fontSize: 10, color: '#646a73' } }] })
  }

  // Agent 异常表格
  agentErrorsSorted.value = [...(data.agentErrors || _qualityData.agentErrors)].sort((a, b) => b.count - a.count)
  coreToolErrorsSorted.value = [...(data.coreToolErrors || _qualityData.coreToolErrors)].sort((a, b) => b.count - a.count)

  // OSAT 趋势
  const chOsat = getChart(cOsatTrend)
  if (chOsat) chOsat.setOption({ ...TH, ..._qLineSeries(dates, [{ name: 'OSAT', data: data.daily.map(d => d.osat), area: true }], ['#34c724'], { type: 'value', min: 50, max: 100, axisLabel: { color: '#8f959e', fontSize: 10 }, splitLine: { lineStyle: { color: '#e5e6eb', type: 'dashed' } } }) })

  // NPS 趋势
  const chNps = getChart(cNpsTrend)
  if (chNps) chNps.setOption({ ...TH, ..._qLineSeries(dates, [{ name: 'NPS', data: data.daily.map(d => d.nps), area: true }], ['#722ed1']) })

  // 净评价值趋势
  const chNet = getChart(cNetScoreTrend)
  if (chNet) {
    const netScores = data.daily.map(d => {
      const like = d.like_count || 0, dislike = d.dislike_count || 0, total = like + dislike
      return total > 0 ? +((like - dislike) / total * 100).toFixed(2) : 0
    })
    chNet.setOption({ ...TH, tooltip: { trigger: 'axis' }, legend: { data: ['净评价值'], bottom: 0, textStyle: { color: '#646a73', fontSize: 10 } }, grid: { left: 50, right: 16, top: 10, bottom: 36 }, xAxis: { type: 'category', data: dates, axisLabel: { color: '#8f959e', fontSize: 9, rotate: 30 }, axisLine: { lineStyle: { color: '#e5e6eb' } } }, yAxis: { type: 'value', axisLabel: { color: '#8f959e', fontSize: 10, formatter: '{value}%' }, splitLine: { lineStyle: { color: '#e5e6eb', type: 'dashed' } } }, series: [{ name: '净评价值', type: 'line', data: netScores, smooth: true, symbol: 'circle', symbolSize: 4, lineStyle: { width: 2, color: '#3370ff' }, itemStyle: { color: '#3370ff' }, areaStyle: { color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [{ offset: 0, color: '#3370ff33' }, { offset: 1, color: '#3370ff05' }]) } }] })
  }
}

function renderFirstTokenByIntent() {
  const ch = getChart(cFirstTokenByIntent); if (!ch || !_qualityData) return
  const items = _qualityData.intentFirstToken[firstTokenMode.value]
  const sorted = [...items].sort((a, b) => a.avg - b.avg)
  ch.setOption({ backgroundColor: 'transparent', tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } }, grid: { left: 80, right: 30, top: 10, bottom: 20 }, xAxis: { type: 'value', axisLabel: { color: '#8f959e', fontSize: 10, formatter: '{value}ms' }, splitLine: { lineStyle: { color: '#e5e6eb', type: 'dashed' } } }, yAxis: { type: 'category', data: sorted.map(s => s.intent), axisLabel: { color: '#646a73', fontSize: 11 } }, series: [{ type: 'bar', data: sorted.map(s => s.avg), itemStyle: { color: '#3370ff', borderRadius: [0, 3, 3, 0] }, barWidth: '55%', label: { show: true, position: 'right', formatter: '{c}ms', fontSize: 10, color: '#646a73' } }] })
}

function renderQaFirstToken(data, dates) {
  const ch = getChart(cQaFirstToken); if (!ch) return
  const echarts = window.echarts
  const prefix = firstTokenMode.value === 'think' ? 'qa_think_' : 'qa_nothink_'
  ch.setOption({ ...TH, tooltip: { trigger: 'axis' }, legend: { data: ['avg', 'p90', 'p99'], bottom: 0, textStyle: { fontSize: 10, color: '#646a73' } }, grid: { left: 50, right: 20, top: 10, bottom: 36 }, xAxis: { type: 'category', data: dates, axisLabel: { color: '#8f959e', fontSize: 9, rotate: 30 }, axisLine: { lineStyle: { color: '#e5e6eb' } } }, yAxis: { type: 'value', axisLabel: { color: '#8f959e', fontSize: 10, formatter: '{value}ms' }, splitLine: { lineStyle: { color: '#e5e6eb', type: 'dashed' } } }, series: [{ name: 'avg', type: 'line', data: data.daily.map(d => d[prefix + 'avg']), smooth: true, symbol: 'circle', symbolSize: 4, lineStyle: { width: 2, color: '#3370ff' }, itemStyle: { color: '#3370ff' }, areaStyle: echarts ? { color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [{ offset: 0, color: '#3370ff33' }, { offset: 1, color: '#3370ff05' }]) } : undefined }, { name: 'p90', type: 'line', data: data.daily.map(d => d[prefix + 'p90']), smooth: true, symbol: 'circle', symbolSize: 4, lineStyle: { width: 2, color: '#ff7d00' }, itemStyle: { color: '#ff7d00' } }, { name: 'p99', type: 'line', data: data.daily.map(d => d[prefix + 'p99']), smooth: true, symbol: 'circle', symbolSize: 4, lineStyle: { width: 2, color: '#e2001a' }, itemStyle: { color: '#e2001a' } }] })
}

function renderAnswerWaitTrend(data) {
  const ch = getChart(cAnswerWaitTrend); if (!ch || !_qualityData) return
  const filtered = dateFrom.value || dateTo.value ? filterData(_qualityData) : _qualityData
  const dts = filtered.daily.map(d => d.date.slice(5))
  const key = waitLenMode.value === 'short' ? 'answer_wait_short' : 'answer_wait_long'
  const label = waitLenMode.value === 'short' ? '≤300字' : '>300字'
  ch.setOption({ ...TH, tooltip: { trigger: 'axis' }, legend: { data: [label + '平均等待'], bottom: 0, textStyle: { color: '#646a73', fontSize: 10 } }, grid: { left: 50, right: 16, top: 10, bottom: 36 }, xAxis: { type: 'category', data: dts, axisLabel: { color: '#8f959e', fontSize: 9, rotate: 30 }, axisLine: { lineStyle: { color: '#e5e6eb' } } }, yAxis: { type: 'value', axisLabel: { color: '#8f959e', fontSize: 10, formatter: '{value}s' }, splitLine: { lineStyle: { color: '#e5e6eb', type: 'dashed' } } }, series: [{ name: label + '平均等待', type: 'line', data: filtered.daily.map(d => d[key]), smooth: true, symbol: 'circle', symbolSize: 4, lineStyle: { width: 2, color: '#3370ff' }, itemStyle: { color: '#3370ff' } }] })
}

// ---- 事件 ----
function switchFirstTokenMode(mode) {
  firstTokenMode.value = mode
  renderFirstTokenByIntent()
  if (_currentData) renderQaFirstToken(_currentData, _currentDates)
}

function switchWaitLenMode(mode) {
  waitLenMode.value = mode
  renderAnswerWaitTrend(_currentData)
}

function refresh() {
  if (!_qualityData) _qualityData = genMockData()
  const data = filterData(_qualityData)
  updateKpi(data)
  renderAllCharts(data)
}

function applyFilter() { refresh() }

function clearFilter() {
  dateFrom.value = ''
  dateTo.value = ''
  refresh()
}

function handleResize() {
  Object.values(_charts).forEach(c => { try { c.resize() } catch (e) {} })
}

onMounted(() => {
  window.addEventListener('resize', handleResize)
  refresh()
})

onBeforeUnmount(() => {
  window.removeEventListener('resize', handleResize)
  Object.values(_charts).forEach(c => { try { c.dispose() } catch (e) {} })
  _charts = {}
})
</script>

<style scoped>
.grid-3 {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 16px;
  margin-bottom: 16px;
}
</style>

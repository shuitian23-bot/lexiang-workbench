<template>
  <div class="page-inner">
    <div class="page-header">
      <div>
        <div class="page-title">深度分析 · 趋势与性能</div>
        <div class="page-desc">交互趋势 · 用户行为 · 场景分布 · 响应性能</div>
      </div>
    </div>

    <div class="grid-2">
      <div class="rpt-card">
        <h3>有效交互 + COT覆盖率</h3>
        <div class="chart-wrap">
          <div ref="chartValid" style="width:100%;height:100%"></div>
        </div>
      </div>
      <div class="rpt-card">
        <h3>响应时长 P90</h3>
        <div class="chart-wrap">
          <div ref="chartDur" style="width:100%;height:100%"></div>
        </div>
      </div>
    </div>

    <div class="grid-2">
      <div class="rpt-card">
        <h3>会话轮次分布</h3>
        <div class="chart-wrap-sm">
          <div ref="chartTurn" style="width:100%;height:100%"></div>
        </div>
      </div>
      <div class="rpt-card">
        <h3>24h流量分布</h3>
        <div class="chart-wrap">
          <div ref="chartHourly" style="width:100%;height:100%"></div>
        </div>
      </div>
    </div>

    <div class="grid-2">
      <div class="rpt-card">
        <h3>主分类分布</h3>
        <div class="chart-wrap-sm">
          <div ref="chartTag" style="width:100%;height:100%"></div>
        </div>
      </div>
      <div class="rpt-card">
        <h3>二级场景 Top12</h3>
        <div class="chart-wrap">
          <div ref="chartTag3" style="width:100%;height:100%"></div>
        </div>
      </div>
    </div>

    <div class="grid-2">
      <div class="rpt-card">
        <h3>响应时长分布</h3>
        <div class="chart-wrap-sm">
          <div ref="chartDurDist" style="width:100%;height:100%"></div>
        </div>
      </div>
      <div class="rpt-card">
        <h3>渠道分布</h3>
        <div class="rpt-bar-list">
          <div v-for="c in REPORT_DATA.channels" :key="c.name" class="rpt-bar-row">
            <div class="rpt-bar-label">
              <span>{{ c.name }}</span>
              <span>{{ c.count.toLocaleString() }} ({{ c.pct }}%)</span>
            </div>
            <div class="rpt-bar-track">
              <div class="rpt-bar-fill" :style="{ width: (c.pct / 84.2 * 100).toFixed(1) + '%' }"></div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div class="rpt-card">
      <h3>回复长度分布</h3>
      <div class="rpt-bar-list">
        <div v-for="r in REPORT_DATA.performance.replyLen" :key="r.label" class="rpt-bar-row">
          <div class="rpt-bar-label">
            <span>{{ r.label }}</span>
            <span>{{ r.val.toLocaleString() }} ({{ r.pct }}%)</span>
          </div>
          <div class="rpt-bar-track">
            <div class="rpt-bar-fill" :style="{ width: (r.pct / 56.9 * 100).toFixed(1) + '%' }"></div>
          </div>
        </div>
      </div>
    </div>

    <div class="grid-4">
      <div class="rpt-kpi" style="color:#27ae60">
        <div class="rpt-kpi-val">{{ REPORT_DATA.performance.p50 }}s</div>
        <div class="rpt-kpi-label">P50</div>
      </div>
      <div class="rpt-kpi warning">
        <div class="rpt-kpi-val">{{ REPORT_DATA.performance.p90 }}s</div>
        <div class="rpt-kpi-label">P90</div>
      </div>
      <div class="rpt-kpi danger">
        <div class="rpt-kpi-val">{{ REPORT_DATA.performance.p95 }}s</div>
        <div class="rpt-kpi-label">P95</div>
      </div>
      <div class="rpt-kpi">
        <div class="rpt-kpi-val">{{ REPORT_DATA.performance.cotP90 }}s</div>
        <div class="rpt-kpi-label">COT P90</div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onBeforeUnmount } from 'vue'

const REPORT_DATA = {
  dates: ['03/18','03/19','03/20','03/21','03/22','03/23','03/24','03/25','03/26','03/27','03/28','03/29','03/30','03/31'],
  daily: [
    {d:'03/18',uv:6808,sess:10206,valid:49274,turns:6.6,cot:70.7,abort:460,retry:136,empty:234,bad:7,good:4,avgDur:4.4,p90:14},
    {d:'03/19',uv:9454,sess:12897,valid:86837,turns:6.3,cot:81.6,abort:2491,retry:170,empty:332,bad:13,good:3,avgDur:3.5,p90:12},
    {d:'03/20',uv:7794,sess:17587,valid:67602,turns:4.9,cot:78.7,abort:579,retry:161,empty:303,bad:14,good:4,avgDur:3.9,p90:14},
    {d:'03/21',uv:6909,sess:10040,valid:36842,turns:5.7,cot:56.8,abort:555,retry:132,empty:224,bad:12,good:3,avgDur:5.4,p90:16},
    {d:'03/22',uv:5293,sess:6332,valid:23735,turns:6.0,cot:38.2,abort:508,retry:108,empty:240,bad:18,good:3,avgDur:6.8,p90:18},
    {d:'03/23',uv:8642,sess:11207,valid:49318,turns:6.2,cot:67.7,abort:541,retry:140,empty:268,bad:16,good:4,avgDur:4.6,p90:15},
    {d:'03/24',uv:8163,sess:10379,valid:42796,turns:6.0,cot:63.1,abort:566,retry:143,empty:275,bad:15,good:5,avgDur:5.1,p90:17},
    {d:'03/25',uv:6595,sess:10402,valid:26387,turns:6.5,cot:67.0,abort:487,retry:122,empty:248,bad:10,good:3,avgDur:6.2,p90:19},
    {d:'03/26',uv:5869,sess:7373,valid:39820,turns:6.9,cot:75.2,abort:553,retry:126,empty:276,bad:19,good:2,avgDur:5.4,p90:17},
    {d:'03/27',uv:4781,sess:9130,valid:14737,turns:6.3,cot:74.0,abort:387,retry:125,empty:178,bad:7,good:8,avgDur:61.1,p90:60},
    {d:'03/28',uv:8865,sess:13715,valid:20647,turns:6.0,cot:66.1,abort:476,retry:141,empty:178,bad:8,good:3,avgDur:60.9,p90:60},
    {d:'03/29',uv:7003,sess:8743,valid:18798,turns:5.7,cot:54.0,abort:404,retry:115,empty:248,bad:13,good:5,avgDur:64.8,p90:60},
    {d:'03/30',uv:5552,sess:7491,valid:30088,turns:5.7,cot:60.3,abort:563,retry:142,empty:280,bad:5,good:1,avgDur:5.9,p90:18},
    {d:'03/31',uv:5389,sess:6466,valid:29121,turns:6.1,cot:53.4,abort:507,retry:123,empty:228,bad:8,good:3,avgDur:6.2,p90:18}
  ],
  scenarios: [
    {tag:'会员',count:447951},{tag:'电商',count:43443},{tag:'服务',count:28364},{tag:'其他',count:7056},{tag:'门店',count:3951},{tag:'多模态',count:3431}
  ],
  tag3: [
    {name:'官网活动',count:434918,pct:83.7},{name:'明确型号推荐',count:11136,pct:2.1},{name:'售后咨询',count:9881,pct:1.9},
    {name:'驱动与系统问题',count:5688,pct:1.1},{name:'意图不明',count:5166,pct:1.0},{name:'人工服务',count:4232,pct:0.8},
    {name:'查询订单',count:3966,pct:0.8},{name:'保修政策',count:3792,pct:0.7},{name:'国补政策',count:3614,pct:0.7},
    {name:'促销活动',count:3421,pct:0.7},{name:'特定用途需求',count:3353,pct:0.6},{name:'会员活动',count:3326,pct:0.6}
  ],
  sessionTurns: [{label:'1轮',val:98183},{label:'2-3轮',val:19407},{label:'4-6轮',val:6246},{label:'7-10轮',val:4084},{label:'11-20轮',val:12396},{label:'20+轮',val:506}],
  hourly: [12838,8626,6859,5877,5576,5463,6135,7027,9676,26331,39955,34107,28627,32013,43525,41568,36899,31768,31012,30182,27877,22946,21899,19216],
  performance: {
    p50: 1.0, p90: 17.0, p95: 21.0, cotP90: 6.5, over60s: 4457,
    durDist: [{label:'<5s',val:201474},{label:'5-15s',val:42714},{label:'15-30s',val:32213},{label:'30-60s',val:1828},{label:'>60s',val:4457}],
    replyLen: [{label:'<50字',val:303249,pct:56.9},{label:'50-200字',val:174238,pct:32.7},{label:'200-500字',val:34588,pct:6.5},{label:'500-1000字',val:18878,pct:3.5},{label:'>1000字',val:1538,pct:0.3}]
  },
  channels: [
    {name:'customer_service',count:44948,pct:84.2},{name:'xiaotian',count:5234,pct:9.8},{name:'club',count:1213,pct:2.3},
    {name:'ai_baji',count:760,pct:1.4},{name:'ko',count:578,pct:1.1},{name:'naMi',count:360,pct:0.7},{name:'product_detail',count:293,pct:0.5}
  ]
}

const chartValid = ref(null)
const chartDur = ref(null)
const chartTurn = ref(null)
const chartHourly = ref(null)
const chartTag = ref(null)
const chartTag3 = ref(null)
const chartDurDist = ref(null)
let _charts = []

onMounted(() => {
  if (typeof window.echarts === 'undefined') return
  const ec = window.echarts
  const dates = REPORT_DATA.dates
  const daily = REPORT_DATA.daily

  const c1 = ec.init(chartValid.value)
  _charts.push(c1)
  c1.setOption({
    tooltip: { trigger: 'axis' },
    legend: { data: ['有效交互', 'COT%'], top: 0, textStyle: { fontSize: 11 } },
    grid: { top: 36, right: 56, bottom: 24, left: 56 },
    xAxis: { type: 'category', data: dates, axisLabel: { fontSize: 10 } },
    yAxis: [
      { type: 'value', axisLabel: { fontSize: 10 } },
      { type: 'value', max: 100, position: 'right', axisLabel: { fontSize: 10, formatter: v => v + '%' }, splitLine: { show: false } }
    ],
    series: [
      { name: '有效交互', type: 'bar', data: daily.map(r => r.valid), itemStyle: { color: 'rgba(63,120,197,0.72)' }, yAxisIndex: 0 },
      { name: 'COT%', type: 'line', data: daily.map(r => r.cot), smooth: true, itemStyle: { color: '#c89532' }, lineStyle: { color: '#c89532' }, yAxisIndex: 1 }
    ]
  })

  const c2 = ec.init(chartDur.value)
  _charts.push(c2)
  c2.setOption({
    tooltip: { trigger: 'axis' },
    legend: { data: ['P90(s)'], top: 0, textStyle: { fontSize: 11 } },
    grid: { top: 36, right: 16, bottom: 24, left: 48 },
    xAxis: { type: 'category', data: dates, axisLabel: { fontSize: 10 } },
    yAxis: { type: 'value', axisLabel: { fontSize: 10 } },
    series: [{
      name: 'P90(s)', type: 'bar',
      data: daily.map(r => ({ value: r.p90, itemStyle: { color: r.p90 >= 60 ? 'rgba(200,74,74,0.82)' : r.p90 > 15 ? 'rgba(185,130,54,0.82)' : 'rgba(95,151,109,0.82)' } }))
    }]
  })

  const c3 = ec.init(chartTurn.value)
  _charts.push(c3)
  c3.setOption({
    tooltip: { trigger: 'item' },
    legend: { orient: 'vertical', right: 0, top: 'middle', textStyle: { fontSize: 11 } },
    series: [{
      type: 'pie', radius: '60%', center: ['40%', '50%'],
      data: REPORT_DATA.sessionTurns.map((t, i) => ({
        name: t.label, value: t.val,
        itemStyle: { color: ['#3f78c5','#3f9ead','#58a86a','#c89532','#9070c3','#b45f86'][i] }
      })),
      label: { show: false }
    }]
  })

  const hours = Array.from({ length: 24 }, (_, i) => i + ':00')
  const c4 = ec.init(chartHourly.value)
  _charts.push(c4)
  c4.setOption({
    tooltip: { trigger: 'axis' },
    grid: { top: 16, right: 16, bottom: 24, left: 56 },
    xAxis: { type: 'category', data: hours, axisLabel: { fontSize: 10 } },
    yAxis: { type: 'value', axisLabel: { fontSize: 10 } },
    series: [{
      type: 'bar',
      data: REPORT_DATA.hourly.map((v, i) => ({ value: v, itemStyle: { color: (i === 14 || i === 15) ? 'rgba(185,130,54,0.82)' : 'rgba(63,120,197,0.64)' } }))
    }]
  })

  const c5 = ec.init(chartTag.value)
  _charts.push(c5)
  c5.setOption({
    tooltip: { trigger: 'item' },
    legend: { orient: 'vertical', right: 0, top: 'middle', textStyle: { fontSize: 11 } },
    series: [{
      type: 'pie', radius: '60%', center: ['40%', '50%'],
      data: REPORT_DATA.scenarios.map((s, i) => ({
        name: s.tag, value: s.count,
        itemStyle: { color: ['#3f78c5','#3f9ead','#58a86a','#c89532','#9070c3','#6f879e'][i] }
      })),
      label: { show: false }
    }]
  })

  const c6 = ec.init(chartTag3.value)
  _charts.push(c6)
  c6.setOption({
    tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
    grid: { top: 16, right: 16, bottom: 16, left: 110 },
    xAxis: { type: 'value', axisLabel: { fontSize: 10 } },
    yAxis: { type: 'category', data: REPORT_DATA.tag3.map(t => t.name).reverse(), axisLabel: { fontSize: 10 } },
    series: [{ type: 'bar', data: REPORT_DATA.tag3.map(t => t.count).reverse(), itemStyle: { color: 'rgba(63,120,197,0.76)' } }]
  })

  const c7 = ec.init(chartDurDist.value)
  _charts.push(c7)
  c7.setOption({
    tooltip: { trigger: 'item' },
    legend: { orient: 'vertical', right: 0, top: 'middle', textStyle: { fontSize: 11 } },
    series: [{
      type: 'pie', radius: '60%', center: ['40%', '50%'],
      data: REPORT_DATA.performance.durDist.map((d, i) => ({
        name: d.label, value: d.val,
        itemStyle: { color: ['#4f9b62','#c89532','#c47f24','#d24a4a','#a94444'][i] }
      })),
      label: { show: false }
    }]
  })
})

onBeforeUnmount(() => {
  _charts.forEach(c => c && c.dispose())
  _charts = []
})
</script>

<style scoped>
.rpt-kpi { background: var(--bg-secondary, #f5f6f8); border-radius: 8px; padding: 16px; text-align: center; }
.rpt-kpi.warning { background: #fef9ec; }
.rpt-kpi.danger { background: #fef0f0; }
.rpt-kpi-val { font-size: 24px; font-weight: 700; color: var(--text-primary, #1a1d23); }
.rpt-kpi-label { font-size: 12px; color: var(--text-secondary, #6b7280); margin-top: 4px; }
.rpt-card { background: var(--bg-primary, #fff); border: 1px solid var(--border-color, #e8eaed); border-radius: 8px; padding: 16px; margin-bottom: 16px; }
.rpt-card h3 { font-size: 14px; font-weight: 600; margin: 0 0 12px; color: var(--text-primary, #1a1d23); }
.rpt-bar-list { display: flex; flex-direction: column; gap: 8px; }
.rpt-bar-row { display: flex; flex-direction: column; gap: 3px; }
.rpt-bar-label { display: flex; justify-content: space-between; font-size: 12px; color: #555; }
.rpt-bar-track { background: #f0f2f5; border-radius: 3px; height: 8px; overflow: hidden; }
.rpt-bar-fill { height: 100%; border-radius: 3px; background: #3f78c5; }
</style>

<template>
  <div class="page-inner">
    <div class="page-header">
      <div>
        <div class="page-title">深度分析 · 概览</div>
        <div class="page-desc">{{ REPORT_DATA.period }}</div>
      </div>
    </div>

    <div class="rpt-alerts">
      <div class="rpt-alert danger"><strong>⚠️ 0327-0329 响应超时（平均60s+）</strong> — 系统级故障或熔断</div>
      <div class="rpt-alert danger"><strong>⚠️ 0319 终止生成激增（2,491次）</strong> — 高并发下服务降级不足</div>
      <div class="rpt-alert warning"><strong>⚠️ 空回复持续（3,516条/0.66%）</strong> — 「转人工」「国补」等场景</div>
    </div>

    <div class="grid-4">
      <div class="rpt-kpi highlight">
        <div class="rpt-kpi-val">{{ REPORT_DATA.kpi.uv.toLocaleString() }}</div>
        <div class="rpt-kpi-label">UV</div>
        <div class="rpt-kpi-sub">复访率 22.2%</div>
      </div>
      <div class="rpt-kpi">
        <div class="rpt-kpi-val">{{ REPORT_DATA.kpi.sessions.toLocaleString() }}</div>
        <div class="rpt-kpi-label">会话数</div>
        <div class="rpt-kpi-sub">多轮 30.3%</div>
      </div>
      <div class="rpt-kpi">
        <div class="rpt-kpi-val">{{ REPORT_DATA.kpi.validInteractions.toLocaleString() }}</div>
        <div class="rpt-kpi-label">有效交互</div>
      </div>
      <div class="rpt-kpi">
        <div class="rpt-kpi-val">{{ REPORT_DATA.kpi.cotCoverage }}%</div>
        <div class="rpt-kpi-label">思维链覆盖</div>
      </div>
    </div>

    <div class="grid-4">
      <div class="rpt-kpi danger">
        <div class="rpt-kpi-val">{{ REPORT_DATA.kpi.emptyReplies.toLocaleString() }}</div>
        <div class="rpt-kpi-label">空回复</div>
      </div>
      <div class="rpt-kpi warning">
        <div class="rpt-kpi-val">{{ REPORT_DATA.kpi.aborts.toLocaleString() }}</div>
        <div class="rpt-kpi-label">终止生成</div>
      </div>
      <div class="rpt-kpi warning">
        <div class="rpt-kpi-val">{{ REPORT_DATA.kpi.retries.toLocaleString() }}</div>
        <div class="rpt-kpi-label">重新作答</div>
      </div>
      <div class="rpt-kpi danger">
        <div class="rpt-kpi-val">{{ REPORT_DATA.kpi.badRatings }}/{{ REPORT_DATA.kpi.goodRatings }}</div>
        <div class="rpt-kpi-label">差/好评</div>
      </div>
    </div>

    <div class="grid-2">
      <div class="rpt-card">
        <h3>日活 UV 与会话数</h3>
        <div class="chart-wrap">
          <div ref="chartUv" style="width:100%;height:100%"></div>
        </div>
      </div>
      <div class="rpt-card">
        <h3>每日异常指标</h3>
        <div class="chart-wrap">
          <div ref="chartAnomaly" style="width:100%;height:100%"></div>
        </div>
      </div>
    </div>

    <div class="rpt-card">
      <h3>🎯 优化建议</h3>
      <div class="rpt-recs">
        <div
          v-for="r in REPORT_DATA.recommendations"
          :key="r.title"
          class="rpt-rec"
          :class="r.pri.toLowerCase()"
        >
          <span class="rpt-rec-pri">{{ r.pri }}</span>
          <strong>{{ r.title }}</strong>
          <span style="font-size:12px;color:var(--text-secondary);margin-left:8px">{{ r.desc }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onBeforeUnmount } from 'vue'

const REPORT_DATA = {
  period: '2026.03.18 - 2026.03.31',
  kpi: { uv: 66479, sessions: 140822, validInteractions: 536007, cotCoverage: 68.15, emptyReplies: 3516, aborts: 9077, retries: 1884, badRatings: 165, goodRatings: 51 },
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
  recommendations: [
    {pri:'P0',title:'修复空回复 Bug（3,516 条）',desc:'「转人工客服」「国补政策」等场景持续触发空回复，每日稳定 178-332 条。'},
    {pri:'P0',title:'排查 3/27-3/29 服务端超时故障',desc:'连续3天平均响应 60s+，P90 触发60s上限。'},
    {pri:'P1',title:'优化 3/19 高并发应对策略',desc:'3/19 用户量最多（9,454人）同时终止生成最多（2,491次）。'},
    {pri:'P1',title:'改善 P90 响应时长（当前 17s）',desc:'10%用户等待超17秒。建议流式输出+缓存高频问题。'},
    {pri:'P1',title:'建立评价引导机制（评价率 0.04%）',desc:'差好评总计仅 216 条。建议会话结束主动弹出评价。'},
    {pri:'P2',title:'提升用户复访率（当前 22.2%）',desc:'77.8%用户仅来1天。建议推送个性化产品推荐。'},
    {pri:'P2',title:'国补政策专项能力建设',desc:'3,614条咨询，是空回复高发区。搭建国补政策知识库。'}
  ]
}

const chartUv = ref(null)
const chartAnomaly = ref(null)
let _charts = []

onMounted(() => {
  if (typeof window.echarts === 'undefined') return
  const ec = window.echarts
  const dates = REPORT_DATA.dates
  const daily = REPORT_DATA.daily

  const c1 = ec.init(chartUv.value)
  _charts.push(c1)
  c1.setOption({
    tooltip: { trigger: 'axis' },
    legend: { data: ['UV', '会话'], top: 0, textStyle: { fontSize: 11 } },
    grid: { top: 36, right: 16, bottom: 24, left: 48, containLabel: false },
    xAxis: { type: 'category', data: dates, axisLabel: { fontSize: 10 } },
    yAxis: { type: 'value', axisLabel: { fontSize: 10 } },
    series: [
      { name: 'UV', type: 'bar', data: daily.map(r => r.uv), itemStyle: { color: 'rgba(111,164,122,0.72)' } },
      { name: '会话', type: 'line', data: daily.map(r => r.sess), smooth: true, itemStyle: { color: '#3f78c5' }, lineStyle: { color: '#3f78c5' } }
    ]
  })

  const c2 = ec.init(chartAnomaly.value)
  _charts.push(c2)
  c2.setOption({
    tooltip: { trigger: 'axis' },
    legend: { data: ['终止', '重试', '空回复'], top: 0, textStyle: { fontSize: 11 } },
    grid: { top: 36, right: 16, bottom: 24, left: 48, containLabel: false },
    xAxis: { type: 'category', data: dates, axisLabel: { fontSize: 10 } },
    yAxis: { type: 'value', axisLabel: { fontSize: 10 } },
    series: [
      { name: '终止', type: 'bar', stack: 'a', data: daily.map(r => r.abort), itemStyle: { color: 'rgba(200,74,74,0.76)' } },
      { name: '重试', type: 'bar', stack: 'a', data: daily.map(r => r.retry), itemStyle: { color: 'rgba(185,130,54,0.76)' } },
      { name: '空回复', type: 'bar', stack: 'a', data: daily.map(r => r.empty), itemStyle: { color: 'rgba(154,136,181,0.76)' } }
    ]
  })
})

onBeforeUnmount(() => {
  _charts.forEach(c => c && c.dispose())
  _charts = []
})
</script>

<style scoped>
.rpt-alerts { display: flex; flex-direction: column; gap: 8px; margin-bottom: 16px; }
.rpt-alert { padding: 10px 14px; border-radius: 6px; font-size: 13px; border-left: 4px solid; }
.rpt-alert.danger { background: #fef0f0; border-color: #e74c3c; color: #c0392b; }
.rpt-alert.warning { background: #fef9ec; border-color: #f39c12; color: #8a6d00; }
.rpt-kpi { background: var(--bg-secondary, #f5f6f8); border-radius: 8px; padding: 16px; text-align: center; }
.rpt-kpi.highlight { background: #eaf1fb; }
.rpt-kpi.danger { background: #fef0f0; }
.rpt-kpi.warning { background: #fef9ec; }
.rpt-kpi-val { font-size: 24px; font-weight: 700; color: var(--text-primary, #1a1d23); }
.rpt-kpi-label { font-size: 12px; color: var(--text-secondary, #6b7280); margin-top: 4px; }
.rpt-kpi-sub { font-size: 11px; color: var(--text-tertiary, #9199a6); margin-top: 2px; }
.rpt-card { background: var(--bg-primary, #fff); border: 1px solid var(--border-color, #e8eaed); border-radius: 8px; padding: 16px; margin-bottom: 16px; }
.rpt-card h3 { font-size: 14px; font-weight: 600; margin: 0 0 12px; color: var(--text-primary, #1a1d23); }
.rpt-recs { display: flex; flex-direction: column; gap: 8px; }
.rpt-rec { display: flex; align-items: baseline; gap: 8px; padding: 8px 12px; border-radius: 6px; background: var(--bg-secondary, #f5f6f8); font-size: 13px; }
.rpt-rec.p0 { border-left: 3px solid #e74c3c; }
.rpt-rec.p1 { border-left: 3px solid #f39c12; }
.rpt-rec.p2 { border-left: 3px solid #3f78c5; }
.rpt-rec-pri { font-size: 11px; font-weight: 700; padding: 1px 6px; border-radius: 3px; background: rgba(0,0,0,0.08); flex-shrink: 0; }
</style>

<template>
  <div class="page-inner">
    <div class="page-header">
      <div>
        <div class="page-title">深度分析 · 质量与明细</div>
        <div class="page-desc">TOP Query · 问题样本 · 逐日数据</div>
      </div>
    </div>

    <div class="rpt-card">
      <h3>🔥 TOP 高频实问题</h3>
      <table class="data-table">
        <thead>
          <tr>
            <th style="text-align:left">#</th>
            <th style="text-align:left">问题</th>
            <th>次数</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="(q, i) in REPORT_DATA.topQueries" :key="q.q">
            <td>{{ i + 1 }}</td>
            <td style="text-align:left">{{ q.q }}</td>
            <td style="font-weight:600">{{ q.n.toLocaleString() }}</td>
          </tr>
        </tbody>
      </table>
    </div>

    <div class="grid-2">
      <div class="rpt-card">
        <h3>❌ 空回复样本（{{ REPORT_DATA.kpi.emptyReplies.toLocaleString() }}条）</h3>
        <div class="rpt-samples">
          <div v-for="s in REPORT_DATA.emptyReplySamples" :key="s" class="rpt-sample empty">{{ s }}</div>
        </div>
      </div>
      <div class="rpt-card">
        <h3>⏹ 终止生成样本（{{ REPORT_DATA.kpi.aborts.toLocaleString() }}条）</h3>
        <div class="rpt-samples">
          <div v-for="s in REPORT_DATA.abortSamples" :key="s" class="rpt-sample abort">{{ s }}</div>
        </div>
      </div>
    </div>

    <div class="rpt-card">
      <h3>📋 每日明细（{{ REPORT_DATA.dates.length }}天）</h3>
      <div style="overflow-x:auto">
        <table class="data-table" style="font-size:12px">
          <thead>
            <tr>
              <th>日期</th><th>UV</th><th>会话</th><th>有效交互</th><th>轮次</th><th>COT%</th>
              <th>终止</th><th>重试</th><th>空回复</th><th>差评</th><th>好评</th><th>均响应</th><th>P90</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="r in REPORT_DATA.daily" :key="r.d">
              <td>{{ r.d }}</td>
              <td>{{ r.uv.toLocaleString() }}</td>
              <td>{{ r.sess.toLocaleString() }}</td>
              <td>{{ r.valid.toLocaleString() }}</td>
              <td>{{ r.turns }}</td>
              <td>{{ r.cot }}%</td>
              <td :style="r.abort > 1000 ? 'color:#e74c3c;font-weight:600' : ''">{{ r.abort }}</td>
              <td>{{ r.retry }}</td>
              <td>{{ r.empty }}</td>
              <td>{{ r.bad }}</td>
              <td>{{ r.good }}</td>
              <td :style="r.avgDur > 30 ? 'color:#e74c3c;font-weight:600' : ''">{{ r.avgDur }}s</td>
              <td :style="r.p90 >= 60 ? 'color:#e74c3c;font-weight:600' : ''">{{ r.p90 }}s</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <div class="rpt-card">
      <h3>差评 / 好评趋势</h3>
      <div class="chart-wrap">
        <div ref="chartRating" style="width:100%;height:100%"></div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onBeforeUnmount } from 'vue'

const REPORT_DATA = {
  dates: ['03/18','03/19','03/20','03/21','03/22','03/23','03/24','03/25','03/26','03/27','03/28','03/29','03/30','03/31'],
  kpi: { emptyReplies: 3516, aborts: 9077 },
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
  topQueries: [
    {q:'(平板2026新品上市)乐享新品礼 购平板返100',n:2140},{q:'推荐一款电脑',n:1607},{q:'乐享新品礼：购平板返100',n:844},
    {q:'立即支付(30分支付宝/10分支付宝)',n:796},{q:'立即支付',n:521},{q:'立即购买',n:518},{q:'人工客服',n:468},
    {q:'登录乐享互动购平板，立返100乐享点',n:406},{q:'AI春耕场活动还有哪些好礼？',n:290},{q:'转人工',n:285}
  ],
  emptyReplySamples: ['转人工客服','质保多久呢','支持扩展内存吗？','这款可以用国家补贴吗','怎么用国补','学生优惠有哪些产品可以享受？'],
  abortSamples: ['重装系统','质保多久呢','支持扩展内存吗？','这两个鼠标看起来差不多','怎么用不了国补','怎么领取国补']
}

const chartRating = ref(null)
let _charts = []

onMounted(() => {
  if (typeof window.echarts === 'undefined') return
  const ec = window.echarts
  const c = ec.init(chartRating.value)
  _charts.push(c)
  c.setOption({
    tooltip: { trigger: 'axis' },
    legend: { data: ['差评', '好评'], top: 0, textStyle: { fontSize: 11 } },
    grid: { top: 36, right: 16, bottom: 24, left: 48 },
    xAxis: { type: 'category', data: REPORT_DATA.dates, axisLabel: { fontSize: 10 } },
    yAxis: { type: 'value', axisLabel: { fontSize: 10 } },
    series: [
      { name: '差评', type: 'bar', data: REPORT_DATA.daily.map(r => r.bad), itemStyle: { color: 'rgba(200,74,74,0.82)' } },
      { name: '好评', type: 'bar', data: REPORT_DATA.daily.map(r => r.good), itemStyle: { color: 'rgba(95,151,109,0.82)' } }
    ]
  })
})

onBeforeUnmount(() => {
  _charts.forEach(c => c && c.dispose())
  _charts = []
})
</script>

<style scoped>
.rpt-card { background: var(--bg-primary, #fff); border: 1px solid var(--border-color, #e8eaed); border-radius: 8px; padding: 16px; margin-bottom: 16px; }
.rpt-card h3 { font-size: 14px; font-weight: 600; margin: 0 0 12px; color: var(--text-primary, #1a1d23); }
.rpt-samples { display: flex; flex-direction: column; gap: 6px; }
.rpt-sample { padding: 8px 12px; border-radius: 5px; font-size: 13px; }
.rpt-sample.empty { background: #fef0f0; color: #c0392b; border-left: 3px solid #e74c3c; }
.rpt-sample.abort { background: #fef9ec; color: #8a6d00; border-left: 3px solid #f39c12; }
</style>

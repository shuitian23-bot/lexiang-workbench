// ===== 深度分析报告模块 =====
// 数据来源：乐享智能体全量深度分析报告 2026.03.18-03.31

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
  performance: {p50:1.0,p90:17.0,p95:21.0,cotP90:6.5,over60s:4457,
    durDist:[{label:'<5s',val:201474},{label:'5-15s',val:42714},{label:'15-30s',val:32213},{label:'30-60s',val:1828},{label:'>60s',val:4457}],
    replyLen:[{label:'<50字',val:303249,pct:56.9},{label:'50-200字',val:174238,pct:32.7},{label:'200-500字',val:34588,pct:6.5},{label:'500-1000字',val:18878,pct:3.5},{label:'>1000字',val:1538,pct:0.3}]
  },
  channels: [{name:'customer_service',count:44948,pct:84.2},{name:'xiaotian',count:5234,pct:9.8},{name:'club',count:1213,pct:2.3},{name:'ai_baji',count:760,pct:1.4},{name:'ko',count:578,pct:1.1},{name:'naMi',count:360,pct:0.7},{name:'product_detail',count:293,pct:0.5}],
  topQueries: [
    {q:'(平板2026新品上市)乐享新品礼 购平板返100',n:2140},{q:'推荐一款电脑',n:1607},{q:'乐享新品礼：购平板返100',n:844},
    {q:'立即支付(30分支付宝/10分支付宝)',n:796},{q:'立即支付',n:521},{q:'立即购买',n:518},{q:'人工客服',n:468},
    {q:'登录乐享互动购平板，立返100乐享点',n:406},{q:'AI春耕场活动还有哪些好礼？',n:290},{q:'转人工',n:285}
  ],
  emptyReplySamples: ['转人工客服','质保多久呢','支持扩展内存吗？','这款可以用国家补贴吗','怎么用国补','学生优惠有哪些产品可以享受？'],
  abortSamples: ['重装系统','质保多久呢','支持扩展内存吗？','这两个鼠标看起来差不多','怎么用不了国补','怎么领取国补'],
  recommendations: [
    {pri:'P0',title:'修复空回复 Bug（3,516 条）',desc:'「转人工客服」「国补政策」等场景持续触发空回复，每日稳定 178-332 条。'},
    {pri:'P0',title:'排查 3/27-3/29 服务端超时故障',desc:'连续3天平均响应 60s+，P90 触发60s上限。'},
    {pri:'P1',title:'优化 3/19 高并发应对策略',desc:'3/19 用户量最多（9,454人）同时终止生成最多（2,491次）。'},
    {pri:'P1',title:'改善 P90 响应时长（当前 17s）',desc:'10%用户等待超17秒。建议流式输出+缓存高频问题。'},
    {pri:'P1',title:'建立评价引导机制（评价率 0.04%）',desc:'差好评总计仅 216 条。建议会话结束主动弹出评价。'},
    {pri:'P2',title:'提升用户复访率（当前 22.2%）',desc:'77.8%用户仅来1天。建议推送个性化产品推荐。'},
    {pri:'P2',title:'国补政策专项能力建设',desc:'3,614条咨询，是空回复高发区。搭建国补政策知识库。'}
  ]
};

// ===== 3 PAGE RENDERERS (合并后) =====
Object.assign(PAGE_RENDERERS, {
  // 页面1：分析概览 — KPI + 告警 + 建议
  'report.overview': () => `
    <div class="page-header">
      <div><div class="page-title">深度分析 · 概览</div><div class="page-desc">${REPORT_DATA.period}</div></div>
    </div>
    <div class="rpt-alerts">
      <div class="rpt-alert danger"><strong>⚠️ 0327-0329 响应超时（平均60s+）</strong> — 系统级故障或熔断</div>
      <div class="rpt-alert danger"><strong>⚠️ 0319 终止生成激增（2,491次）</strong> — 高并发下服务降级不足</div>
      <div class="rpt-alert warning"><strong>⚠️ 空回复持续（3,516条/0.66%）</strong> — 「转人工」「国补」等场景</div>
    </div>
    <div class="grid-4">
      <div class="rpt-kpi highlight"><div class="rpt-kpi-val">${REPORT_DATA.kpi.uv.toLocaleString()}</div><div class="rpt-kpi-label">UV</div><div class="rpt-kpi-sub">复访率 22.2%</div></div>
      <div class="rpt-kpi"><div class="rpt-kpi-val">${REPORT_DATA.kpi.sessions.toLocaleString()}</div><div class="rpt-kpi-label">会话数</div><div class="rpt-kpi-sub">多轮 30.3%</div></div>
      <div class="rpt-kpi"><div class="rpt-kpi-val">${REPORT_DATA.kpi.validInteractions.toLocaleString()}</div><div class="rpt-kpi-label">有效交互</div></div>
      <div class="rpt-kpi"><div class="rpt-kpi-val">${REPORT_DATA.kpi.cotCoverage}%</div><div class="rpt-kpi-label">思维链覆盖</div></div>
    </div>
    <div class="grid-4">
      <div class="rpt-kpi danger"><div class="rpt-kpi-val">${REPORT_DATA.kpi.emptyReplies.toLocaleString()}</div><div class="rpt-kpi-label">空回复</div></div>
      <div class="rpt-kpi warning"><div class="rpt-kpi-val">${REPORT_DATA.kpi.aborts.toLocaleString()}</div><div class="rpt-kpi-label">终止生成</div></div>
      <div class="rpt-kpi warning"><div class="rpt-kpi-val">${REPORT_DATA.kpi.retries.toLocaleString()}</div><div class="rpt-kpi-label">重新作答</div></div>
      <div class="rpt-kpi danger"><div class="rpt-kpi-val">${REPORT_DATA.kpi.badRatings}/${REPORT_DATA.kpi.goodRatings}</div><div class="rpt-kpi-label">差/好评</div></div>
    </div>
    <div class="grid-2">
      <div class="rpt-card"><h3>日活 UV 与会话数</h3><div class="chart-wrap"><canvas id="rpt-uv-chart"></canvas></div></div>
      <div class="rpt-card"><h3>每日异常指标</h3><div class="chart-wrap"><canvas id="rpt-anomaly-chart"></canvas></div></div>
    </div>
    <div class="rpt-card"><h3>🎯 优化建议</h3><div class="rpt-recs">${REPORT_DATA.recommendations.map(r => `<div class="rpt-rec ${r.pri.toLowerCase()}"><span class="rpt-rec-pri">${r.pri}</span><strong>${r.title}</strong><span style="font-size:12px;color:var(--text-secondary);margin-left:8px">${r.desc}</span></div>`).join('')}</div></div>
  `,

  // 页面2：趋势与性能 — 趋势图 + 行为 + 场景 + 性能
  'report.detail': () => `
    <div class="page-header"><div><div class="page-title">深度分析 · 趋势与性能</div><div class="page-desc">交互趋势 · 用户行为 · 场景分布 · 响应性能</div></div></div>
    <div class="grid-2">
      <div class="rpt-card"><h3>有效交互 + COT覆盖率</h3><div class="chart-wrap"><canvas id="rpt-valid-chart"></canvas></div></div>
      <div class="rpt-card"><h3>响应时长 P90</h3><div class="chart-wrap"><canvas id="rpt-dur-chart"></canvas></div></div>
    </div>
    <div class="grid-2">
      <div class="rpt-card"><h3>会话轮次分布</h3><div class="chart-wrap-sm"><canvas id="rpt-turn-chart"></canvas></div></div>
      <div class="rpt-card"><h3>24h流量分布</h3><div class="chart-wrap"><canvas id="rpt-hourly-chart"></canvas></div></div>
    </div>
    <div class="grid-2">
      <div class="rpt-card"><h3>主分类分布</h3><div class="chart-wrap-sm"><canvas id="rpt-tag-chart"></canvas></div></div>
      <div class="rpt-card"><h3>二级场景 Top12</h3><div class="chart-wrap"><canvas id="rpt-tag3-chart"></canvas></div></div>
    </div>
    <div class="grid-2">
      <div class="rpt-card"><h3>响应时长分布</h3><div class="chart-wrap-sm"><canvas id="rpt-durdist-chart"></canvas></div></div>
      <div class="rpt-card"><h3>渠道分布</h3>
        <div id="rpt-channel-bars"></div>
      </div>
    </div>
    <div class="rpt-card"><h3>回复长度分布</h3><div id="rpt-replylen"></div></div>
    <div class="grid-4">
      <div class="rpt-kpi" style="color:#27ae60"><div class="rpt-kpi-val">${REPORT_DATA.performance.p50}s</div><div class="rpt-kpi-label">P50</div></div>
      <div class="rpt-kpi warning"><div class="rpt-kpi-val">${REPORT_DATA.performance.p90}s</div><div class="rpt-kpi-label">P90</div></div>
      <div class="rpt-kpi danger"><div class="rpt-kpi-val">${REPORT_DATA.performance.p95}s</div><div class="rpt-kpi-label">P95</div></div>
      <div class="rpt-kpi"><div class="rpt-kpi-val">${REPORT_DATA.performance.cotP90}s</div><div class="rpt-kpi-label">COT P90</div></div>
    </div>
  `,

  // 页面3：质量与明细 — 问题样本 + 每日明细表
  'report.quality': () => `
    <div class="page-header"><div><div class="page-title">深度分析 · 质量与明细</div><div class="page-desc">TOP Query · 问题样本 · 逐日数据</div></div></div>
    <div class="rpt-card"><h3>🔥 TOP 高频实问题</h3>
      <table class="data-table"><thead><tr><th style="text-align:left">#</th><th style="text-align:left">问题</th><th>次数</th></tr></thead>
      <tbody>${REPORT_DATA.topQueries.map((q,i) => `<tr><td>${i+1}</td><td style="text-align:left">${q.q}</td><td style="font-weight:600">${q.n.toLocaleString()}</td></tr>`).join('')}</tbody></table>
    </div>
    <div class="grid-2">
      <div class="rpt-card"><h3>❌ 空回复样本（${REPORT_DATA.kpi.emptyReplies.toLocaleString()}条）</h3>
        <div class="rpt-samples">${REPORT_DATA.emptyReplySamples.map(s => `<div class="rpt-sample empty">${s}</div>`).join('')}</div>
      </div>
      <div class="rpt-card"><h3>⏹ 终止生成样本（${REPORT_DATA.kpi.aborts.toLocaleString()}条）</h3>
        <div class="rpt-samples">${REPORT_DATA.abortSamples.map(s => `<div class="rpt-sample abort">${s}</div>`).join('')}</div>
      </div>
    </div>
    <div class="rpt-card"><h3>📋 每日明细（${REPORT_DATA.dates.length}天）</h3>
      <div style="overflow-x:auto"><table class="data-table" style="font-size:12px">
        <thead><tr><th>日期</th><th>UV</th><th>会话</th><th>有效交互</th><th>轮次</th><th>COT%</th><th>终止</th><th>重试</th><th>空回复</th><th>差评</th><th>好评</th><th>均响应</th><th>P90</th></tr></thead>
        <tbody>${REPORT_DATA.daily.map(r => `<tr>
          <td>${r.d}</td><td>${r.uv.toLocaleString()}</td><td>${r.sess.toLocaleString()}</td><td>${r.valid.toLocaleString()}</td>
          <td>${r.turns}</td><td>${r.cot}%</td><td${r.abort>1000?' style="color:#e74c3c;font-weight:600"':''}>${r.abort}</td>
          <td>${r.retry}</td><td>${r.empty}</td><td>${r.bad}</td><td>${r.good}</td>
          <td${r.avgDur>30?' style="color:#e74c3c;font-weight:600"':''}>${r.avgDur}s</td>
          <td${r.p90>=60?' style="color:#e74c3c;font-weight:600"':''}>${r.p90}s</td>
        </tr>`).join('')}</tbody>
      </table></div>
    </div>
    <div class="rpt-card"><h3>差评 / 好评趋势</h3><div class="chart-wrap"><canvas id="rpt-rating-chart"></canvas></div></div>
  `
});

// ===== CHART =====
let _rptCharts = {};
function rptDestroy() { Object.values(_rptCharts).forEach(c => c && c.destroy()); _rptCharts = {}; }

function rptChart(id, type, labels, datasets, opts) {
  const el = document.getElementById(id);
  if (!el || typeof Chart === 'undefined') return;
  if (_rptCharts[id]) _rptCharts[id].destroy();
  _rptCharts[id] = new Chart(el, {
    type, data: { labels, datasets },
    options: { responsive: true, maintainAspectRatio: true, aspectRatio: type === 'doughnut' ? 1.6 : 2,
      plugins: { legend: { position: type === 'doughnut' ? 'right' : 'top', labels: { font: { size: 11 }, boxWidth: 12 } } },
      ...(type === 'bar' || type === 'line' ? { scales: { x: { ticks: { font: { size: 10 } } }, y: { beginAtZero: true, ticks: { font: { size: 10 } } } } } : {}),
      ...opts }
  });
}

function rptRenderOverview() {
  rptDestroy();
  const D = REPORT_DATA, dates = D.dates;
  rptChart('rpt-uv-chart', 'bar', dates, [
    { label: 'UV', data: D.daily.map(r => r.uv), backgroundColor: 'rgba(111,164,122,0.72)' },
    { label: '会话', data: D.daily.map(r => r.sess), type: 'line', borderColor: '#3f78c5', tension: 0.3, fill: false }
  ]);
  rptChart('rpt-anomaly-chart', 'bar', dates, [
    { label: '终止', data: D.daily.map(r => r.abort), backgroundColor: 'rgba(200,74,74,0.76)' },
    { label: '重试', data: D.daily.map(r => r.retry), backgroundColor: 'rgba(185,130,54,0.76)' },
    { label: '空回复', data: D.daily.map(r => r.empty), backgroundColor: 'rgba(154,136,181,0.76)' }
  ], { scales: { x: { stacked: true }, y: { stacked: true, beginAtZero: true } } });
}

function rptRenderDetail() {
  rptDestroy();
  const D = REPORT_DATA, dates = D.dates;
  rptChart('rpt-valid-chart', 'bar', dates, [
    { label: '有效交互', data: D.daily.map(r => r.valid), backgroundColor: 'rgba(63,120,197,0.72)', yAxisID: 'y' },
    { label: 'COT%', data: D.daily.map(r => r.cot), type: 'line', borderColor: '#c89532', tension: 0.3, yAxisID: 'y1' }
  ], { scales: { y: { beginAtZero: true }, y1: { beginAtZero: true, max: 100, position: 'right', grid: { drawOnChartArea: false }, ticks: { callback: v => v + '%' } } } });

  rptChart('rpt-dur-chart', 'bar', dates, [
    { label: 'P90(s)', data: D.daily.map(r => r.p90), backgroundColor: D.daily.map(r => r.p90 >= 60 ? 'rgba(200,74,74,0.82)' : r.p90 > 15 ? 'rgba(185,130,54,0.82)' : 'rgba(95,151,109,0.82)') }
  ]);

  rptChart('rpt-turn-chart', 'doughnut', D.sessionTurns.map(t => t.label), [
    { data: D.sessionTurns.map(t => t.val), backgroundColor: ['#3f78c5','#3f9ead','#58a86a','#c89532','#9070c3','#b45f86'] }
  ]);

  const hours = Array.from({ length: 24 }, (_, i) => i + ':00');
  rptChart('rpt-hourly-chart', 'bar', hours, [
    { label: '交互', data: D.hourly, backgroundColor: D.hourly.map((_, i) => (i === 14 || i === 15) ? 'rgba(185,130,54,0.82)' : 'rgba(63,120,197,0.64)') }
  ]);

  rptChart('rpt-tag-chart', 'doughnut', D.scenarios.map(s => s.tag), [
    { data: D.scenarios.map(s => s.count), backgroundColor: ['#3f78c5','#3f9ead','#58a86a','#c89532','#9070c3','#6f879e'] }
  ]);

  rptChart('rpt-tag3-chart', 'bar', D.tag3.map(t => t.name), [
    { label: '交互次数', data: D.tag3.map(t => t.count), backgroundColor: 'rgba(63,120,197,0.76)' }
  ], { indexAxis: 'y', scales: { x: { beginAtZero: true }, y: { ticks: { font: { size: 10 } } } } });

  rptChart('rpt-durdist-chart', 'doughnut', D.performance.durDist.map(d => d.label), [
    { data: D.performance.durDist.map(d => d.val), backgroundColor: ['#4f9b62','#c89532','#c47f24','#d24a4a','#a94444'] }
  ]);

  const rl = document.getElementById('rpt-replylen');
  if (rl) rl.innerHTML = D.performance.replyLen.map(r => `<div style="margin-bottom:6px"><div style="display:flex;justify-content:space-between;font-size:12px;color:#555;margin-bottom:2px"><span>${r.label}</span><span>${r.val.toLocaleString()} (${r.pct}%)</span></div><div style="background:#f0f2f5;border-radius:3px;height:8px;overflow:hidden"><div style="height:100%;border-radius:3px;background:#3f78c5;width:${(r.pct / 56.9 * 100).toFixed(1)}%"></div></div></div>`).join('');

  const cb = document.getElementById('rpt-channel-bars');
  if (cb) cb.innerHTML = D.channels.map(c => `<div style="margin-bottom:6px"><div style="display:flex;justify-content:space-between;font-size:12px;color:#555;margin-bottom:2px"><span>${c.name}</span><span>${c.count.toLocaleString()} (${c.pct}%)</span></div><div style="background:#f0f2f5;border-radius:3px;height:8px;overflow:hidden"><div style="height:100%;border-radius:3px;background:#3f78c5;width:${(c.pct / 84.2 * 100).toFixed(1)}%"></div></div></div>`).join('');
}

function rptRenderQuality() {
  rptDestroy();
  rptChart('rpt-rating-chart', 'bar', REPORT_DATA.dates, [
    { label: '差评', data: REPORT_DATA.daily.map(r => r.bad), backgroundColor: 'rgba(200,74,74,0.82)' },
    { label: '好评', data: REPORT_DATA.daily.map(r => r.good), backgroundColor: 'rgba(95,151,109,0.82)' }
  ]);
}

// ===== HOOK switchPage =====
const _origSwitchReport = switchPage;
switchPage = function(pageId) {
  _origSwitchReport(pageId);
  if (pageId.startsWith('report.')) rptDestroy();
  const map = {
    'report.overview': rptRenderOverview,
    'report.detail': rptRenderDetail,
    'report.quality': rptRenderQuality
  };
  if (map[pageId]) setTimeout(map[pageId], 80);
};

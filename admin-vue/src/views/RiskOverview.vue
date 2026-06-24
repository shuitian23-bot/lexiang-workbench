<template>
  <div class="page-inner">
    <!-- 页头 -->
    <div class="page-header">
      <div>
        <div class="page-title">风控概况</div>
        <div class="page-desc">平台级风险态势、策略命中、拦截趋势与预警监控</div>
      </div>
      <div class="page-actions">
        <button class="btn btn-secondary">刷新</button>
        <button class="btn btn-primary">导出日报</button>
      </div>
    </div>

    <!-- KPI 卡片 -->
    <div class="kpi-grid">
      <div class="kpi-card">
        <div class="kpi-label">今日调用量</div>
        <div class="kpi-value">2,846,120</div>
        <div class="kpi-sub">每 5 分钟聚合一次</div>
      </div>
      <div class="kpi-card warning">
        <div class="kpi-label">拦截量</div>
        <div class="kpi-value">18,426</div>
        <div class="kpi-sub">拦截率 0.65%</div>
      </div>
      <div class="kpi-card danger">
        <div class="kpi-label">高危账户</div>
        <div class="kpi-value">1,284</div>
        <div class="kpi-sub"><span class="down">↓ 6.2%</span> 较昨日</div>
      </div>
      <div class="kpi-card success">
        <div class="kpi-label">生效策略</div>
        <div class="kpi-value">96</div>
        <div class="kpi-sub">运行正常 91 条</div>
      </div>
    </div>

    <!-- 拦截构成 + 实时事件流 -->
    <div class="risk-overview-grid">
      <!-- 拦截构成 -->
      <div class="card">
        <div class="card-header">
          <span class="card-title">拦截构成</span>
        </div>
        <div class="prd-bars">
          <div v-for="item in interceptItems" :key="item.label" class="prd-bar-row">
            <span>{{ item.label }}</span>
            <div class="prd-bar-track">
              <i :style="{ width: item.pct + '%', background: item.color }"></i>
            </div>
            <b>{{ item.count.toLocaleString() }}</b>
          </div>
        </div>
      </div>

      <!-- 实时事件流 -->
      <div class="card">
        <div class="card-header">
          <span class="card-title">实时事件流</span>
        </div>
        <div class="risk-event-table-wrap">
          <table class="risk-data-table">
            <thead>
              <tr>
                <th>时间</th>
                <th>场景</th>
                <th>账户</th>
                <th>风险等级</th>
                <th>处置</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="ev in realtimeEvents" :key="ev.time + ev.account">
                <td class="mono-cell">{{ ev.time }}</td>
                <td>{{ ev.scene }}</td>
                <td>{{ ev.account }}</td>
                <td>
                  <span class="status-pill" :class="ev.levelClass">{{ ev.level }}</span>
                </td>
                <td>{{ ev.action }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
const interceptItems = [
  { label: '下单风险',   pct: 82, color: '#d24a4a', count: 7912 },
  { label: '优惠券风险', pct: 58, color: '#c47f24', count: 5604 },
  { label: '登录异常',   pct: 37, color: '#d24a4a', count: 3118 },
  { label: 'DPL 命中',  pct: 18, color: '#9070c3', count: 422  },
]

const realtimeEvents = [
  { time: '17:08:22', scene: '下单',   account: '153****7206', level: '高危', levelClass: 'danger',  action: '禁止下单' },
  { time: '17:07:54', scene: '优惠券', account: '180****8855', level: '中危', levelClass: 'warning', action: '禁止用券' },
  { time: '17:06:31', scene: '登录',   account: '138****2568', level: '低危', levelClass: 'primary', action: '验证码挑战' },
]
</script>

<style scoped>
.risk-overview-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
}
.prd-bars {
  padding: 12px 16px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.prd-bar-row {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 13px;
}
.prd-bar-row > span {
  width: 90px;
  flex-shrink: 0;
  color: var(--text-secondary, #5c6776);
}
.prd-bar-track {
  flex: 1;
  height: 8px;
  background: var(--bg-tertiary, #f0f2f5);
  border-radius: 4px;
  overflow: hidden;
}
.prd-bar-track i {
  display: block;
  height: 100%;
  border-radius: 4px;
  transition: width 0.3s;
}
.prd-bar-row > b {
  width: 48px;
  text-align: right;
  font-size: 13px;
  color: var(--text-primary, #1a2232);
}
.risk-event-table-wrap {
  overflow-x: auto;
}
.risk-data-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 13px;
}
.risk-data-table th,
.risk-data-table td {
  padding: 10px 12px;
  text-align: left;
  border-bottom: 1px solid var(--border-primary, #e8eaed);
  white-space: nowrap;
}
.risk-data-table th {
  background: var(--bg-secondary, #f7f8fa);
  color: var(--text-secondary, #5c6776);
  font-weight: 500;
}
.mono-cell { font-family: monospace; }
</style>

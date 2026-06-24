<template>
  <div class="page-inner">
    <div class="page-header">
      <h2 class="page-title">运营总览</h2>
      <p class="page-desc">乐享运营核心指标看板（SFC 重构版）</p>
    </div>

    <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:16px;margin-bottom:24px;">
      <div class="card" v-for="m in metrics" :key="m.label">
        <div class="card-header">
          <div class="card-title">{{ m.label }}</div>
        </div>
        <div style="padding:0 16px 16px;">
          <div style="font-size:28px;font-weight:700;color:var(--primary,#3f78c5);">{{ m.value }}</div>
          <div style="font-size:12px;color:var(--text-tertiary,#9199a6);margin-top:4px;">{{ m.note }}</div>
        </div>
      </div>
    </div>

    <div style="display:grid;grid-template-columns:2fr 1fr;gap:16px;">
      <div class="card">
        <div class="card-header"><div class="card-title">访问趋势（图表占位）</div></div>
        <div style="height:200px;display:flex;align-items:center;justify-content:center;color:var(--text-tertiary,#9199a6);font-size:13px;">
          后续接入 ECharts / Chart.js 图表
        </div>
      </div>
      <div class="card">
        <div class="card-header"><div class="card-title">快速入口</div></div>
        <div style="padding:12px 16px;display:flex;flex-direction:column;gap:8px;">
          <router-link class="btn btn-secondary" style="text-align:center;text-decoration:none;" to="/employee/overview">在职员工管理</router-link>
          <router-link class="btn btn-secondary" style="text-align:center;text-decoration:none;" to="/lead/dashboard">企业客户管理</router-link>
          <router-link class="btn btn-secondary" style="text-align:center;text-decoration:none;" to="/risk/overview">风控管理</router-link>
        </div>
      </div>
    </div>

    <div style="margin-top:16px;padding:12px 16px;background:var(--bg-secondary,#f4f5f7);border-radius:8px;font-size:12px;color:var(--text-tertiary,#9199a6);">
      此页为 SFC 重构样板页，路由 + 布局 + CSS 验证通过后，后续逐步迁入 workbench-pages.js 中的各功能页。
    </div>
  </div>
</template>

<script setup>
const metrics = [
  { label: '今日访问量', value: '—', note: '待接入数据接口' },
  { label: '活跃用户', value: '—', note: '待接入数据接口' },
  { label: 'GMV（本月）', value: '—', note: '待接入数据接口' },
  { label: '认证审核', value: '—', note: '待接入数据接口' }
]
</script>

<template>
  <div class="page-inner">
    <div class="page-header">
      <div>
        <div class="page-title">数据查询</div>
        <div class="page-desc">全局数据、策略数据、限购数据、DPL 数据、验证码、地址与邮箱查询</div>
      </div>
      <div class="page-actions">
        <button class="btn btn-secondary">导出</button>
        <button class="btn btn-primary">新增</button>
      </div>
    </div>

    <!-- 筛选 -->
    <div class="risk-filter-card">
      <div class="risk-filter-grid">
        <input class="risk-input" v-model="filter.keyword" placeholder="策略 / 对象 / 账户 / 记录 ID" />
        <select class="risk-select" v-model="filter.scene">
          <option value="">场景 - 全部</option>
          <option>注册</option>
          <option>登录</option>
          <option>下单</option>
          <option>优惠券</option>
        </select>
        <select class="risk-select" v-model="filter.status">
          <option value="">状态 - 全部</option>
          <option>生效</option>
          <option>待审核</option>
          <option>已失效</option>
        </select>
        <select class="risk-select" v-model="filter.level">
          <option value="">风险等级 - 全部</option>
          <option>高危</option>
          <option>中危</option>
          <option>低危</option>
        </select>
        <input class="risk-date" type="date" v-model="filter.date" />
        <button class="btn btn-primary" @click="doSearch">查询</button>
      </div>
    </div>

    <div class="card">
      <div class="risk-table-wrap">
        <table class="risk-data-table">
          <thead>
            <tr>
              <th v-for="h in headers" :key="h">{{ h }}</th>
            </tr>
          </thead>
          <tbody>
            <tr v-if="filteredRows.length === 0">
              <td :colspan="headers.length" class="table-empty-cell">暂无数据</td>
            </tr>
            <tr v-for="(row, idx) in filteredRows" :key="idx">
              <td class="mono-cell">{{ row.id }}</td>
              <td>{{ row.account }}</td>
              <td>{{ row.scene }}</td>
              <td>{{ row.hitStrategy }}</td>
              <td><span class="status-pill" :class="row.riskClass">{{ row.risk }}</span></td>
              <td>{{ row.result }}</td>
              <td class="mono-cell">{{ row.requestTime }}</td>
              <td class="action-cell">
                <button class="btn btn-sm btn-secondary" @click="showDetail(row)">详情</button>
                <button class="btn btn-sm btn-secondary" @click="copyId(row.id)">复制 ID</button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, computed } from 'vue'

const headers = ['记录 ID', '账户', '场景', '命中策略', '风险等级', '处置结果', '请求时间', '操作']

const allRows = ref([
  { id: 'RISK202606050001', account: '153****7206', scene: '下单',   hitStrategy: '下单高危设备拦截', risk: '高危', riskClass: 'danger',  result: '禁止下单', requestTime: '2026-06-05 17:08:22' },
  { id: 'RISK202606050002', account: '180****8855', scene: '优惠券', hitStrategy: '优惠券异常领取',   risk: '中危', riskClass: 'warning', result: '禁止用券', requestTime: '2026-06-05 17:07:54' },
])

const filter = reactive({ keyword: '', scene: '', status: '', level: '', date: '' })
const applied = reactive({ ...filter })

const filteredRows = computed(() => {
  const kw = applied.keyword.trim().toLowerCase()
  const sc = applied.scene
  const lv = applied.level
  return allRows.value.filter(r => {
    if (kw && !(r.id + r.account + r.hitStrategy).toLowerCase().includes(kw)) return false
    if (sc && r.scene !== sc) return false
    if (lv && r.risk !== lv) return false
    return true
  })
})

function doSearch() {
  Object.assign(applied, filter)
}

function showDetail(row) {
  alert(`记录详情：${row.id}`)
}

function copyId(id) {
  if (navigator.clipboard) {
    navigator.clipboard.writeText(id)
  } else {
    const el = document.createElement('textarea')
    el.value = id
    document.body.appendChild(el)
    el.select()
    document.execCommand('copy')
    el.remove()
  }
}
</script>

<style scoped>
.risk-filter-card {
  background: var(--bg-primary, #fff);
  border: 1px solid var(--border-primary, #e8eaed);
  border-radius: 8px;
  padding: 14px 16px;
  margin-bottom: 16px;
}
.risk-filter-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  align-items: center;
}
.risk-input,
.risk-select,
.risk-date {
  height: 34px;
  padding: 0 10px;
  border: 1px solid var(--border-primary, #e8eaed);
  border-radius: 6px;
  font-size: 13px;
  background: var(--bg-primary, #fff);
  color: var(--text-primary, #1a2232);
}
.risk-input { min-width: 220px; }
.risk-select { min-width: 140px; }
.risk-table-wrap { overflow-x: auto; }
.risk-data-table {
  width: 100%;
  min-width: 1120px;
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
.action-cell { display: flex; gap: 6px; }
.mono-cell { font-family: monospace; }
.table-empty-cell { text-align: center; color: var(--text-tertiary, #9199a6); padding: 32px; }
</style>

<template>
  <div class="page-inner">
    <div class="page-header">
      <div>
        <div class="page-title">限购管理</div>
        <div class="page-desc">商品限购、活动限购、券码限购、相似地址与名单维护</div>
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
              <td>{{ row.name }}</td>
              <td>{{ row.type }}</td>
              <td>{{ row.dimension }}</td>
              <td>{{ row.cycle }}</td>
              <td>{{ row.scope }}</td>
              <td><span class="status-pill" :class="row.statusClass">{{ row.status }}</span></td>
              <td>{{ row.updatedAt }}</td>
              <td class="action-cell">
                <button class="btn btn-sm btn-secondary" @click="showDetail(row)">详情</button>
                <button class="btn btn-sm btn-secondary" @click="showList(row)">名单</button>
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

const headers = ['规则名称', '类型', '限制维度', '周期/次数', '适用范围', '状态', '更新时间', '操作']

const allRows = ref([
  { name: '国补笔记本限购', type: '商品限购', dimension: '同账户 + 同地址', cycle: '30 天 / 1 次', scope: '笔记本 / 国补', status: '生效', statusClass: 'success', updatedAt: '2026-06-04' },
  { name: '618 抽奖限购',   type: '活动限购', dimension: '同手机号',         cycle: '1 天 / 3 次',  scope: '活动 ACT618',  status: '生效', statusClass: 'success', updatedAt: '2026-06-03' },
])

const filter = reactive({ keyword: '', scene: '', status: '', level: '', date: '' })
const applied = reactive({ ...filter })

const filteredRows = computed(() => {
  const kw = applied.keyword.trim().toLowerCase()
  const st = applied.status
  return allRows.value.filter(r => {
    if (kw && !r.name.toLowerCase().includes(kw)) return false
    if (st && r.status !== st) return false
    return true
  })
})

function doSearch() {
  Object.assign(applied, filter)
}

function showDetail(row) {
  alert(`规则详情：${row.name}`)
}

function showList(row) {
  alert(`名单管理：${row.name}`)
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
.table-empty-cell { text-align: center; color: var(--text-tertiary, #9199a6); padding: 32px; }
</style>

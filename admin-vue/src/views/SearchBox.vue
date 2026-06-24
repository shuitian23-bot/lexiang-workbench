<template>
  <div class="page-inner">
    <div class="page-header">
      <div>
        <div class="page-title">搜索框管理</div>
        <div class="page-desc">维护默认搜索词、热搜词、下拉词、快速链接词和热搜榜</div>
      </div>
      <div class="prd-head-actions">
        <button class="btn btn-secondary">操作日志</button>
        <button class="btn btn-primary">新增配置</button>
      </div>
    </div>

    <div class="prd-filter-card">
      <div class="prd-filter-grid">
        <input class="ops-input" v-model="filter.keyword" placeholder="关键词 / 编码 / 配置名称" />
        <select class="ops-select" v-model="filter.mall">
          <option value="">商城 - 全部</option>
          <option>联想商城</option>
          <option>乐享商城</option>
        </select>
        <select class="ops-select" v-model="filter.terminal">
          <option value="">终端 - 全部</option>
          <option>PC</option>
          <option>H5</option>
          <option>APP</option>
          <option>小程序</option>
        </select>
        <select class="ops-select" v-model="filter.status">
          <option value="">状态 - 全部</option>
          <option>生效中</option>
          <option>待发布</option>
          <option>草稿</option>
        </select>
        <input class="ops-date-input" type="date" v-model="filter.date" />
        <button class="btn btn-primary" @click="doSearch">查询</button>
      </div>
    </div>

    <div class="card">
      <div class="prd-table-wrap">
        <table class="prd-data-table" style="min-width:1080px">
          <thead>
            <tr>
              <th v-for="h in headers" :key="h">{{ h }}</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(row, i) in filteredRows" :key="i">
              <td>{{ row.type }}</td>
              <td>{{ row.keyword }}</td>
              <td>{{ row.pageScope }}</td>
              <td>{{ row.terminal }}</td>
              <td>
                <span class="prd-badge" :class="row.statusType">
                  <i></i>{{ row.status }}
                </span>
              </td>
              <td>{{ row.period }}</td>
              <td>
                <a class="table-action-link" @click.prevent>编辑</a>
                <a class="table-action-link" @click.prevent>排序</a>
              </td>
            </tr>
            <tr v-if="filteredRows.length === 0">
              <td colspan="7" class="table-empty-cell">暂无数据</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, computed } from 'vue'

const headers = ['类型', '关键词', '页面范围', '终端', '状态', '有效期', '操作']

const allRows = [
  { type: '默认搜索词', keyword: 'AI PC 至高优惠', pageScope: '首页搜索框', terminal: 'PC/H5', status: '生效中', statusType: 'success', period: '2026-06-01 至 2026-06-18' },
  { type: '热搜词', keyword: 'thinkplus 充电器', pageScope: '热搜榜', terminal: 'APP/小程序', status: '待发布', statusType: 'orange', period: '2026-06-06 至 2026-06-30' },
]

const filter = reactive({ keyword: '', mall: '', terminal: '', status: '', date: '' })
const appliedKeyword = ref('')

function doSearch() {
  appliedKeyword.value = filter.keyword.trim()
}

const filteredRows = computed(() => {
  const kw = appliedKeyword.value.toLowerCase()
  if (!kw) return allRows
  return allRows.filter(r =>
    r.type.toLowerCase().includes(kw) || r.keyword.toLowerCase().includes(kw)
  )
})
</script>

<style scoped>
.table-action-link {
  color: var(--primary, #3f78c5);
  cursor: pointer;
  margin-right: 8px;
  font-size: 13px;
}
</style>

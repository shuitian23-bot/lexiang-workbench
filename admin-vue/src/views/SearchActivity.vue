<template>
  <div class="page-inner">
    <div class="page-header">
      <div>
        <div class="page-title">活动直达</div>
        <div class="page-desc">配置关键词命中后的 URL 直达、活动卡片、通栏和子模块</div>
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
              <td>{{ row.actName }}</td>
              <td>{{ row.keywords }}</td>
              <td>
                <span class="prd-badge" :class="row.statusType">
                  <i></i>{{ row.status }}
                </span>
              </td>
              <td>{{ row.shape }}</td>
              <td>{{ row.terminal }}</td>
              <td>{{ row.period }}</td>
              <td>
                <a class="table-action-link" @click.prevent>编辑</a>
                <a class="table-action-link" @click.prevent>日志</a>
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

const headers = ['活动名称', '关键词', '状态', '形态', '终端', '有效期', '操作']

const allRows = [
  { actName: '618 ThinkPad 会场', keywords: 'thinkpad, t14p', status: '生效中', statusType: 'success', shape: '活动卡片', terminal: 'PC/H5/APP', period: '2026-06-01 至 2026-06-18' },
  { actName: '国补会场直达', keywords: '国补, 补贴', status: '待发布', statusType: 'orange', shape: 'URL 直达', terminal: 'PC/H5', period: '2026-06-05 至 2026-07-31' },
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
    r.actName.toLowerCase().includes(kw) || r.keywords.toLowerCase().includes(kw)
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

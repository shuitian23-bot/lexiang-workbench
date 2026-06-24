<template>
  <div class="page-inner">
    <div class="page-header">
      <div>
        <div class="page-title">词典管理</div>
        <div class="page-desc">维护纠错词、同义词、转换词、停用词等搜索召回前处理规则</div>
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
              <td>{{ row.original }}</td>
              <td>{{ row.result }}</td>
              <td>{{ row.mall }}</td>
              <td>
                <span class="prd-badge" :class="row.statusType">
                  <i></i>{{ row.status }}
                </span>
              </td>
              <td>{{ row.updateTime }}</td>
              <td>
                <a class="table-action-link" @click.prevent>编辑</a>
                <a class="table-action-link" @click.prevent>删除</a>
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

const headers = ['类型', '原词/词组', '处理结果', '商城', '状态', '更新时间', '操作']

const allRows = [
  { type: '纠错词', original: 'thinkapd', result: 'thinkpad', mall: '联想商城', status: '有效', statusType: 'success', updateTime: '2026-06-04' },
  { type: '同义词', original: '小新, ideapad', result: '双向召回', mall: '全商城', status: '有效', statusType: 'success', updateTime: '2026-06-03' },
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
    r.type.toLowerCase().includes(kw) || r.original.toLowerCase().includes(kw) || r.result.toLowerCase().includes(kw)
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

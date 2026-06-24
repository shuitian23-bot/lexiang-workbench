<template>
  <div class="page-inner">
    <div class="page-header">
      <div>
        <div class="page-title">筛选条件</div>
        <div class="page-desc">维护筛选标签、参数名称、显示值和对应值，支撑前台筛选联动</div>
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
              <td>{{ row.labelName }}</td>
              <td>{{ row.filterType }}</td>
              <td>{{ row.paramName }}</td>
              <td>{{ row.device }}</td>
              <td>{{ row.valueCount }}</td>
              <td>{{ row.exampleValue }}</td>
              <td>
                <a class="table-action-link" @click.prevent>编辑</a>
                <a class="table-action-link" @click.prevent>导出</a>
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

const headers = ['标签名称', '筛选类型', '参数名称', '适用设备', '参数值数量', '示例值', '操作']

const allRows = [
  { labelName: '屏幕尺寸', filterType: '单选', paramName: 'screen_size', device: '笔记本', valueCount: '6', exampleValue: '14 / 16 / 18 英寸' },
  { labelName: '处理器', filterType: '多选', paramName: 'cpu', device: '台式机', valueCount: '12', exampleValue: 'Ultra 7 / AI 9 / i7' },
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
    r.labelName.toLowerCase().includes(kw) || r.paramName.toLowerCase().includes(kw)
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

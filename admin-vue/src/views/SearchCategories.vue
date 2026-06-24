<template>
  <div class="page-inner">
    <div class="page-header">
      <div>
        <div class="page-title">分类标签</div>
        <div class="page-desc">维护产品介绍与产品销售分类树、叶子节点、排序、发布状态和绑定关系</div>
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
              <td>{{ row.name }}</td>
              <td>{{ row.code }}</td>
              <td>{{ row.leaf }}</td>
              <td>{{ row.sort }}</td>
              <td>
                <span class="prd-badge" :class="row.statusType">
                  <i></i>{{ row.status }}
                </span>
              </td>
              <td>{{ row.operator }}</td>
              <td>{{ row.updateTime }}</td>
              <td>
                <a class="table-action-link" @click.prevent>编辑</a>
                <a class="table-action-link" @click.prevent>发布</a>
              </td>
            </tr>
            <tr v-if="filteredRows.length === 0">
              <td colspan="8" class="table-empty-cell">暂无数据</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, computed } from 'vue'

const headers = ['分类名称', '分类编码', '叶子节点', '排序', '发布状态', '操作人', '更新时间', '操作']

const allRows = [
  { name: '产品介绍 / 笔记本', code: 'NB-INTRO', leaf: '否', sort: '12', status: '已发布', statusType: 'success', operator: '王运营', updateTime: '2026-06-04 16:20' },
  { name: '产品销售 / ThinkPad', code: 'SALE-TP', leaf: '否', sort: '8', status: '草稿', statusType: 'orange', operator: '李品类', updateTime: '2026-06-04 11:02' },
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
    r.name.toLowerCase().includes(kw) || r.code.toLowerCase().includes(kw)
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

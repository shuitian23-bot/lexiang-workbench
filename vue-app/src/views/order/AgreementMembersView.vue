<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import ContentPageHeader from '@/components/content/ContentPageHeader.vue'
import { useAppStore } from '@/stores/app'
import './sales-workbench-pages.css'

const PAGE_ID = 'sales.agreementMembers'
const appStore = useAppStore()

const filters = reactive({ account: '', name: '', company: '', type: '全部', review: '全部', state: '全部' })
const applied = ref({ ...filters })
const members = [
  { id: 'U10086', account: '138****2201', email: 'chenjw@example.com', name: '陈嘉伟', company: '常州市昊刻数控科技有限公司', type: '企业客户', review: '审核通过', state: '启用', reviewedAt: '2026-10-20 10:28' },
  { id: 'U10092', account: 'liuhaifeng', email: 'liuhf@example.com', name: '刘海峰', company: '华北银行股份有限公司', type: '企业客户', review: '审核通过', state: '启用', reviewedAt: '2026-10-18 14:12' },
  { id: 'U10105', account: 'zhaomingyu', email: 'zhaomy@example.com', name: '赵明宇', company: '南岭通信服务有限公司', type: '代理商', review: '待审核', state: '停用', reviewedAt: '—' },
  { id: 'U10118', account: 'zhou***@mail.com', email: 'zhouwb@example.com', name: '周文博', company: '西川理工大学', type: '企业客户', review: '审核拒绝', state: '停用', reviewedAt: '2026-10-22 09:40' }
]
const rows = computed(() => members.filter(member => {
  const account = applied.value.account.trim().toLowerCase()
  const name = applied.value.name.trim().toLowerCase()
  const company = applied.value.company.trim().toLowerCase()
  return (!account || `${member.account} ${member.email}`.toLowerCase().includes(account))
    && (!name || member.name.toLowerCase().includes(name))
    && (!company || member.company.toLowerCase().includes(company))
    && (applied.value.type === '全部' || member.type === applied.value.type)
    && (applied.value.review === '全部' || member.review === applied.value.review)
    && (applied.value.state === '全部' || member.state === applied.value.state)
}))

function applyFilters() { applied.value = { ...filters } }
function resetFilters() {
  Object.assign(filters, { account: '', name: '', company: '', type: '全部', review: '全部', state: '全部' })
  applyFilters()
}

onMounted(() => appStore.ensureStaticTab(PAGE_ID))
</script>

<template>
  <main class="member-page sales-workbench-page">
    <ContentPageHeader title="协议会员管理" description="查询协议会员、审核状态及账号启停信息。" />
    <form class="member-filters" aria-label="协议会员查询" @submit.prevent="applyFilters">
      <input v-model="filters.account" aria-label="账号" placeholder="账号 - 手机号或邮箱" />
      <input v-model="filters.name" aria-label="姓名" placeholder="姓名" />
      <input v-model="filters.company" aria-label="公司名称" placeholder="公司名称" />
      <select v-model="filters.type" aria-label="用户类型"><option>全部</option><option>企业客户</option><option>代理商</option></select>
      <select v-model="filters.review" aria-label="审核状态"><option>全部</option><option>审核通过</option><option>审核拒绝</option><option>待审核</option></select>
      <select v-model="filters.state" aria-label="状态"><option>全部</option><option>启用</option><option>停用</option></select>
      <div class="filter-actions"><button class="btn btn-primary" type="submit">查询</button><button class="btn btn-secondary" type="button" @click="resetFilters">重置</button></div>
    </form>
    <section class="member-list">
      <div class="member-toolbar"><strong>会员列表</strong><span>共 {{ rows.length }} 条</span></div>
      <div class="member-table-wrap">
        <table>
          <thead><tr><th>用户ID</th><th>账号</th><th>邮箱</th><th>姓名</th><th>公司名称</th><th>用户类型</th><th>审核状态</th><th>状态</th><th>审核时间</th></tr></thead>
          <tbody><tr v-for="member in rows" :key="member.id"><td>{{ member.id }}</td><td>{{ member.account }}</td><td>{{ member.email }}</td><td>{{ member.name }}</td><td>{{ member.company }}</td><td>{{ member.type }}</td><td><span class="status-tag">{{ member.review }}</span></td><td>{{ member.state }}</td><td>{{ member.reviewedAt }}</td></tr></tbody>
        </table>
      </div>
      <p v-if="!rows.length" class="member-empty">没有符合条件的协议会员。</p>
    </section>
  </main>
</template>

<style scoped>
.member-page { display: grid; gap: var(--space-4, 16px); min-width: 0; overflow-x: clip; font-size: var(--text-sm, 13px); }
.member-page.sales-workbench-page :deep(.content-page-header__title) { font-weight: 400; }
.member-filters { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: var(--space-3, 12px); padding: var(--space-4, 16px); border: 1px solid var(--color-border-subtle); border-radius: var(--radius-lg); background: var(--color-surface); }
input, select { width: 100%; height: var(--control-height-md, 36px); padding: 0 var(--space-3, 12px); border: 1px solid var(--color-border); border-radius: var(--radius-md, 8px); background: var(--color-surface); color: var(--color-text); font: inherit; }
input:focus-visible, select:focus-visible, button:focus-visible { outline: 2px solid var(--color-primary); outline-offset: 2px; }
.filter-actions { display: flex; gap: var(--space-2, 8px); }
.filter-actions .btn { height: var(--control-height-md, 36px); padding: 0 var(--space-4, 16px); font-weight: 400; }
.filter-actions .btn-primary { color: var(--color-on-primary); }
.member-list { min-width: 0; overflow: hidden; border: 1px solid var(--color-border-subtle); border-radius: var(--radius-lg); background: var(--color-surface); }
.member-toolbar { display: flex; gap: var(--space-3, 12px); align-items: center; padding: var(--space-3, 12px) var(--space-4, 16px); border-bottom: 1px solid var(--color-border-subtle); }
.member-toolbar strong { font-weight: 400; }
.member-toolbar span { color: var(--color-text-tertiary); }
.member-table-wrap { max-width: 100%; overflow-x: auto; }
table { width: 100%; min-width: 1180px; border-collapse: collapse; }
th { padding: var(--space-3, 12px); background: var(--color-bg-muted); color: var(--color-text-secondary); text-align: left; font-size: var(--text-xs, 12px); font-weight: 500; }
td { height: 48px; padding: var(--space-2, 8px) var(--space-3, 12px); border-top: 1px solid var(--color-border-subtle); }
.status-tag { display: inline-flex; padding: var(--space-1, 4px) var(--space-2, 8px); border-radius: 9999px; background: var(--color-primary-subtle); color: var(--color-primary); }
.member-empty { margin: 0; padding: var(--space-7, 28px); color: var(--color-text-tertiary); text-align: center; }
@media (max-width: 1039px) { .member-filters { grid-template-columns: repeat(2, minmax(0, 1fr)); } }
@media (max-width: 719px) { .member-page { padding: var(--space-4, 16px); } .member-filters { grid-template-columns: 1fr; } }
</style>

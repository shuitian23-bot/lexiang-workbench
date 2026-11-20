<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import ContentPageHeader from '@/components/content/ContentPageHeader.vue'
import ContentTabs from '@/components/content/ContentTabs.vue'
import StatusTag from '@/components/content/StatusTag.vue'
import { useAppStore } from '@/stores/app'
import './sales-workbench-pages.css'

const PAGE_ID = 'sales.dashboard'
const appStore = useAppStore()
const activeView = ref('todos')
const tabs = [
  { key: 'todos', label: '待办事项' },
  { key: 'sales', label: '我的销售额' },
  { key: 'ranking', label: '榜单' },
  { key: 'customers', label: '客户分析' }
]

const mailItems = [
  { title: '支付提醒：常州市昊刻数控科技有限公司', category: '待付款', order: 'B2026102606485001X', time: '10:36', unread: true },
  { title: '订单核销完成：华北银行股份有限公司', category: '核销完成', order: 'B2026102506184001X', time: '09:12', unread: true },
  { title: '异常订单待处理：南岭通信服务有限公司', category: '订单异常', order: 'B2026102304932001X', time: '昨天', unread: false }
]
const selectedMail = ref(mailItems[0])
const unreadOnly = ref(false)
const visibleMail = computed(() => unreadOnly.value ? mailItems.filter(item => item.unread) : mailItems)

watch(visibleMail, (items) => {
  if (!items.some(item => item.order === selectedMail.value.order) && items[0]) selectedMail.value = items[0]
})

const salesRows = [
  { customer: '华北银行股份有限公司', channel: '直销', amount: 1540600, share: '34.8%' },
  { customer: '常州市昊刻数控科技有限公司', channel: '直销', amount: 1288700, share: '29.1%' },
  { customer: '南岭通信服务有限公司', channel: 'SI', amount: 862700, share: '19.5%' },
  { customer: '西川理工大学', channel: '渠道', amount: 734500, share: '16.6%' }
]
const totalSales = salesRows.reduce((total, row) => total + row.amount, 0)
const rankingRows = [
  { rank: 1, name: '杨明', department: '政企事业部', amount: 5289600 },
  { rank: 2, name: '苑建军', department: '渠道一队', amount: 4426500, current: true },
  { rank: 3, name: '赵欣', department: '消费事业部', amount: 3978200 },
  { rank: 4, name: '陈嘉伟', department: '华东区域', amount: 3586400 }
]
const customerRows = [
  { type: '直销客户', count: 128, ordered: 86, rate: '67.2%', sales: 3286000, average: 25672 },
  { type: 'SI 客户', count: 94, ordered: 57, rate: '60.6%', sales: 2215000, average: 23564 }
]
const numberFormatter = new Intl.NumberFormat('zh-CN')

onMounted(() => appStore.ensureStaticTab(PAGE_ID))
</script>

<template>
  <section class="sales-dashboard-page sales-workbench-page">
    <ContentPageHeader title="销售看板" description="集中查看销售待办、个人销售表现、榜单与客户结构。" />

    <div class="dashboard-surface">
      <ContentTabs :items="tabs" :model-value="activeView" label="销售看板视图" @update:model-value="activeView = $event" />
      <div class="dashboard-panel" aria-live="polite">
        <section v-if="activeView === 'todos'" aria-label="待办事项">
          <div class="dashboard-section-head">
            <div><h2>邮件工作台</h2><p>集中处理支付、核销与异常订单通知</p></div>
            <label class="dashboard-check"><input v-model="unreadOnly" type="checkbox" />仅看未读</label>
          </div>
          <div class="mail-workspace">
            <div class="mail-list" aria-label="邮件列表">
              <button v-for="item in visibleMail" :key="item.order" type="button" :class="{ 'is-selected': selectedMail.order === item.order }" @click="selectedMail = item">
                <span><i v-if="item.unread" aria-label="未读"></i>{{ item.category }}</span><time>{{ item.time }}</time><strong>{{ item.title }}</strong><small>{{ item.order }}</small>
              </button>
            </div>
            <article class="mail-reader">
              <StatusTag :tone="selectedMail.category === '订单异常' ? 'danger' : selectedMail.category === '待付款' ? 'warning' : 'success'">{{ selectedMail.category }}</StatusTag>
              <h3>{{ selectedMail.title }}</h3>
              <p>采购单编号：{{ selectedMail.order }}</p>
              <p>请进入客户订单管理查看订单明细，并按当前状态完成后续跟进。</p>
            </article>
          </div>
        </section>

        <section v-else-if="activeView === 'sales'" aria-label="我的销售额">
          <article class="sales-total-card"><span>总销售额</span><strong>¥{{ numberFormatter.format(totalSales) }}</strong><small>当前演示周期累计净销售额</small></article>
          <div class="dashboard-card">
            <div class="dashboard-section-head"><div><h2>客户销售明细</h2><p>按销售额从高到低排列</p></div></div>
            <div class="dashboard-table-wrap"><table><thead><tr><th>客户名称</th><th>客户渠道</th><th>销售额（元）</th><th>占总销售额</th></tr></thead><tbody><tr v-for="row in salesRows" :key="row.customer"><td>{{ row.customer }}</td><td>{{ row.channel }}</td><td class="number-cell">{{ numberFormatter.format(row.amount) }}</td><td class="number-cell">{{ row.share }}</td></tr></tbody></table></div>
          </div>
        </section>

        <section v-else-if="activeView === 'ranking'" aria-label="榜单">
          <div class="ranking-summary"><div><span>我的排名</span><strong>第 2 名</strong></div><div><span>销售姓名</span><strong>苑建军</strong></div><div><span>业务处</span><strong>渠道一队</strong></div><div><span>销售额</span><strong>¥4,426,500</strong></div></div>
          <div class="dashboard-card">
            <div class="dashboard-section-head"><div><h2>全国销售排名</h2><p>本月销售额排名</p></div></div>
            <div class="dashboard-table-wrap"><table><thead><tr><th>名次</th><th>姓名</th><th>业务处</th><th>销售额（元）</th></tr></thead><tbody><tr v-for="row in rankingRows" :key="row.rank" :class="{ 'is-current': row.current }"><td><span class="rank-badge">{{ row.rank }}</span></td><td>{{ row.name }}<small v-if="row.current" class="current-label">当前</small></td><td>{{ row.department }}</td><td class="number-cell">{{ numberFormatter.format(row.amount) }}</td></tr></tbody></table></div>
          </div>
        </section>

        <section v-else aria-label="客户分析">
          <div class="customer-metrics"><article><span>客户总数</span><strong>222</strong><small>直销与 SI 客户</small></article><article><span>下单客户</span><strong>143</strong><small>综合转化率 64.4%</small></article><article><span>净销售额</span><strong>¥550.1万</strong><small>当前年度累计</small></article><article><span>户均产出</span><strong>¥24,779</strong><small>净销售额 / 客户数</small></article></div>
          <div class="analysis-grid">
            <article class="dashboard-card"><h2>客户构成</h2><div class="composition"><div><span class="share-direct"></span><strong>直销 58%</strong></div><div><span class="share-si"></span><strong>SI 42%</strong></div></div></article>
            <article class="dashboard-card"><h2>客户产出</h2><div class="output-bars"><div><span>直销客户</span><i class="output-direct"></i><strong>328.6万</strong></div><div><span>SI 客户</span><i class="output-si"></i><strong>221.5万</strong></div></div></article>
          </div>
          <div class="dashboard-card"><div class="dashboard-section-head"><div><h2>客户类型对比</h2><p>客户规模、转化率与销售贡献</p></div></div><div class="dashboard-table-wrap"><table><thead><tr><th>客户类型</th><th>客户数</th><th>下单客户数</th><th>下单转化率</th><th>净销售额（元）</th><th>户均产出（元）</th></tr></thead><tbody><tr v-for="row in customerRows" :key="row.type"><td>{{ row.type }}</td><td class="number-cell">{{ row.count }}</td><td class="number-cell">{{ row.ordered }}</td><td class="number-cell">{{ row.rate }}</td><td class="number-cell">{{ numberFormatter.format(row.sales) }}</td><td class="number-cell">{{ numberFormatter.format(row.average) }}</td></tr></tbody></table></div></div>
        </section>
      </div>
    </div>
  </section>
</template>

<style scoped>
.sales-dashboard-page { display: grid; gap: var(--space-4, 16px); min-width: 0; overflow-x: clip; }
.dashboard-surface { min-width: 0; overflow: hidden; border: 1px solid var(--color-border-subtle); border-radius: var(--radius-lg); background: var(--color-surface); }
.dashboard-surface > :deep(.cs-content-tabs) { padding: 0 var(--space-4, 16px); border-bottom: 1px solid var(--color-border-subtle); }
.dashboard-panel { min-width: 0; padding: var(--space-5, 20px); }
.dashboard-section-head { display: flex; align-items: center; justify-content: space-between; gap: var(--space-4, 16px); margin-bottom: var(--space-4, 16px); }
.dashboard-section-head h2, .dashboard-card h2 { margin: 0; color: var(--color-text); font-size: var(--text-md, 16px); }
.dashboard-section-head p { margin: var(--space-1, 4px) 0 0; color: var(--color-text-tertiary); font-size: var(--text-xs, 12px); }
.dashboard-check { display: inline-flex; align-items: center; gap: var(--space-2, 8px); color: var(--color-text-secondary); }
.dashboard-check input { width: 16px; height: 16px; accent-color: var(--color-primary); }
.mail-workspace { display: grid; grid-template-columns: 340px minmax(0, 1fr); min-height: 400px; overflow: hidden; border: 1px solid var(--color-border-subtle); border-radius: var(--radius-lg); }
.mail-list { max-height: 520px; overflow-y: auto; border-right: 1px solid var(--color-border-subtle); }
.mail-list button { display: grid; grid-template-columns: 1fr auto; gap: var(--space-2, 8px); width: 100%; padding: var(--space-4, 16px); border: 0; border-bottom: 1px solid var(--color-border-subtle); background: var(--color-surface); color: var(--color-text-secondary); text-align: left; cursor: pointer; }
.mail-list button.is-selected { background: var(--color-primary-subtle); box-shadow: inset 3px 0 var(--color-primary); }
.mail-list button span { color: var(--color-text-secondary); font-size: var(--text-xs, 12px); }
.mail-list button i { display: inline-block; width: 7px; height: 7px; margin-right: var(--space-2, 8px); border-radius: 9999px; background: var(--color-primary); }
.mail-list button time { color: var(--color-text-tertiary); font-size: var(--text-xs, 12px); }
.mail-list button strong, .mail-list button small { grid-column: 1 / -1; }
.mail-list button strong { color: var(--color-text); font-size: var(--text-sm, 13px); }
.mail-list button small { color: var(--color-text-tertiary); }
.mail-reader { padding: var(--space-6, 24px); }
.mail-reader h3 { margin: var(--space-4, 16px) 0; color: var(--color-text); font-size: var(--text-lg, 18px); }
.mail-reader p { color: var(--color-text-secondary); line-height: 1.8; }
.sales-total-card { display: grid; grid-template-columns: 1fr auto; gap: var(--space-2, 8px) var(--space-5, 20px); align-items: center; margin-bottom: var(--space-4, 16px); padding: var(--space-5, 20px) var(--space-6, 24px); border: 1px solid var(--color-primary-border); border-radius: var(--radius-lg); background: var(--color-primary-subtle); }
.sales-total-card span, .sales-total-card small { color: var(--color-text-secondary); }
.sales-total-card strong { grid-row: span 2; color: var(--color-primary); font-size: var(--text-3xl, 30px); font-variant-numeric: tabular-nums; }
.dashboard-card { min-width: 0; padding: var(--space-5, 20px); border: 1px solid var(--color-border-subtle); border-radius: var(--radius-lg); background: var(--color-surface); }
.dashboard-table-wrap { max-width: 100%; overflow-x: auto; }
table { width: 100%; min-width: 640px; border-collapse: collapse; }
th { padding: var(--space-3, 12px); background: var(--color-bg-muted); color: var(--color-text-secondary); text-align: left; font-size: var(--text-xs, 12px); font-weight: 500; }
td { height: 48px; padding: var(--space-2, 8px) var(--space-3, 12px); border-top: 1px solid var(--color-border-subtle); color: var(--color-text-secondary); }
.number-cell { text-align: right; font-variant-numeric: tabular-nums; }
.ranking-summary, .customer-metrics { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: var(--space-3, 12px); margin-bottom: var(--space-4, 16px); }
.ranking-summary > div, .customer-metrics article { display: grid; gap: var(--space-2, 8px); padding: var(--space-4, 16px); border: 1px solid var(--color-border-subtle); border-radius: var(--radius-lg); background: var(--color-bg-subtle); }
.ranking-summary span, .customer-metrics span, .customer-metrics small { color: var(--color-text-tertiary); }
.ranking-summary strong, .customer-metrics strong { color: var(--color-text); font-size: var(--text-xl, 20px); }
.rank-badge { display: inline-grid; width: 28px; height: 28px; place-items: center; border-radius: 9999px; background: var(--color-primary-subtle); color: var(--color-primary); font-weight: 600; }
tr.is-current td { background: var(--color-primary-subtle); }
.current-label { margin-left: var(--space-2, 8px); padding: var(--space-1, 4px); border-radius: var(--radius-sm, 4px); background: var(--color-primary-subtle); color: var(--color-primary); }
.analysis-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: var(--space-4, 16px); margin-bottom: var(--space-4, 16px); }
.composition, .output-bars { display: grid; gap: var(--space-4, 16px); margin-top: var(--space-5, 20px); }
.composition div, .output-bars div { display: grid; grid-template-columns: 90px minmax(0, 1fr) 80px; gap: var(--space-3, 12px); align-items: center; }
.composition span, .output-bars i { display: block; height: 10px; border-radius: 9999px; background: var(--chart-blue); }
.share-direct { width: 58%; }
.share-si { width: 42%; }
.output-direct { width: 82%; }
.output-si { width: 56%; }
.composition div:nth-child(2) span, .output-bars div:nth-child(2) i { background: var(--chart-purple); }
.composition strong, .output-bars strong { color: var(--color-text-secondary); font-size: var(--text-sm, 13px); text-align: right; }
.output-bars span { color: var(--color-text-secondary); }
@media (max-width: 1040px) { .ranking-summary, .customer-metrics { grid-template-columns: repeat(2, minmax(0, 1fr)); } .analysis-grid { grid-template-columns: 1fr; } }
@media (max-width: 720px) { .dashboard-panel { padding: var(--space-4, 16px); } .mail-workspace { grid-template-columns: 1fr; } .mail-list { max-height: 260px; border-right: 0; border-bottom: 1px solid var(--color-border-subtle); } .ranking-summary, .customer-metrics { grid-template-columns: 1fr; } .sales-total-card { grid-template-columns: 1fr; } .sales-total-card strong { grid-row: auto; } }
</style>

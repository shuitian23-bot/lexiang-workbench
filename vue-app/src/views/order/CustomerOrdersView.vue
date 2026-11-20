<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import ContentPageHeader from '@/components/content/ContentPageHeader.vue'
import ContentTabs from '@/components/content/ContentTabs.vue'
import DataTable from '@/components/content/DataTable.vue'
import FeedbackState from '@/components/content/FeedbackState.vue'
import FilterField from '@/components/content/FilterField.vue'
import ListSurface from '@/components/content/ListSurface.vue'
import Pagination from '@/components/content/Pagination.vue'
import StatusTag from '@/components/content/StatusTag.vue'
import { useDialogFocusManager } from '@/composables/useDialogFocusManager'
import { CUSTOMER_ORDERS, CUSTOMER_ORDER_TABS, normalizeCustomerOrderTab, queryCustomerOrders } from '@/services/customerOrders'
import { showWorkbenchToast } from '@/services/toast'
import { useAppStore } from '@/stores/app'
import { downloadTextFile } from '@/utils/download'

type CustomerOrder = (typeof CUSTOMER_ORDERS)[number]
type CustomerOrderTab = (typeof CUSTOMER_ORDER_TABS)[number]['key']
type OrderFilters = {
  number: string
  name: string
  verificationStatus: string
  orderType: string
  orderStart: string
  orderEnd: string
}

const PAGE_ID = 'sales.customerOrders'
const PAGE_SIZE = 6
const route = useRoute()
const router = useRouter()
const appStore = useAppStore()
const pageRoot = ref<HTMLElement | null>(null)
const selectedOrder = ref<CustomerOrder | null>(null)
const remindedOrders = ref(new Set<string>())
const currentPage = ref(1)

const isTab = (value: unknown): value is CustomerOrderTab => CUSTOMER_ORDER_TABS.some(tab => tab.key === value)
const activeTab = ref<CustomerOrderTab>(normalizeCustomerOrderTab(route.query.tab) as CustomerOrderTab)

const emptyFilters = (): OrderFilters => ({
  number: '',
  name: '',
  verificationStatus: '全部',
  orderType: '全部',
  orderStart: '',
  orderEnd: ''
})
const draftFilters = reactive<OrderFilters>(emptyFilters())
const appliedFilters = ref<OrderFilters>(emptyFilters())
const result = computed(() => queryCustomerOrders({
  tab: activeTab.value,
  filters: appliedFilters.value,
  page: currentPage.value,
  pageSize: PAGE_SIZE
}))
const hasAppliedFilters = computed(() => Object.entries(appliedFilters.value).some(([, value]) => value && value !== '全部'))
const tabItems = computed(() => CUSTOMER_ORDER_TABS.map(tab => ({
  ...tab,
  count: queryCustomerOrders({ tab: tab.key, filters: appliedFilters.value }).total
})))
const activeTabLabel = computed(() => CUSTOMER_ORDER_TABS.find(tab => tab.key === activeTab.value)?.label || '客户订单')

const columns = [
  { key: 'actions', label: '操作', width: '220px' },
  { key: 'no', label: '采购单编号（PO）', width: '190px' },
  { key: 'time', label: '下单时间', width: '160px' },
  { key: 'customer', label: '客户名称', width: '220px' },
  { key: 'customerType', label: '客户类型', width: '90px' },
  { key: 'orderType', label: '订单类型', width: '100px' },
  { key: 'amount', label: '订单金额', align: 'right' as const, width: '120px' },
  { key: 'verificationStatus', label: '核销状态', width: '100px' },
  { key: 'orderStatus', label: '订单状态', width: '110px' },
  { key: 'contractStatus', label: '合同状态', width: '110px' }
]

const moneyFormatter = new Intl.NumberFormat('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
const statusTone = (status: string) => {
  if (['已完成', '已生效', '已核销'].includes(status)) return 'success'
  if (['订单异常', '下单失败', '未生成'].includes(status)) return 'danger'
  if (status.includes('待')) return 'warning'
  return 'neutral'
}

function applyFilters() {
  appliedFilters.value = { ...draftFilters }
  currentPage.value = 1
}

function resetFilters() {
  Object.assign(draftFilters, emptyFilters())
  appliedFilters.value = emptyFilters()
  currentPage.value = 1
}

function changeTab(key: string) {
  if (!isTab(key)) return
  activeTab.value = key
  currentPage.value = 1
  router.replace({ query: { ...route.query, tab: key === 'customer' ? undefined : key } })
}

function openDetails(order: CustomerOrder) {
  selectedOrder.value = order
}

function closeDetails() {
  selectedOrder.value = null
}

function sendPaymentReminder(order: CustomerOrder) {
  remindedOrders.value = new Set(remindedOrders.value).add(order.no)
  showWorkbenchToast(`已生成本地支付提醒：${order.no}`)
}

function downloadContract(order: CustomerOrder) {
  downloadTextFile({
    content: `合同预览\n订单编号：${order.no}\n客户：${order.customer}\n订单金额：${moneyFormatter.format(order.amount)} 元`,
    fileName: `${order.no}-合同预览.txt`,
    mimeType: 'text/plain;charset=utf-8'
  })
}

function exportOrders() {
  if (result.value.error) {
    showWorkbenchToast(result.value.error)
    return
  }
  const rows = queryCustomerOrders({ tab: activeTab.value, filters: appliedFilters.value, pageSize: CUSTOMER_ORDERS.length }).items
  const csv = ['订单编号,客户名称,订单金额,订单状态', ...rows.map(row => [row.no, row.customer, row.amount, row.orderStatus].join(','))].join('\n')
  downloadTextFile({
    content: `\ufeff${csv}`,
    fileName: `客户订单管理-${activeTabLabel.value}-${new Date().toISOString().slice(0, 10)}.csv`,
    mimeType: 'text/csv;charset=utf-8'
  })
}

watch([() => route.meta.pageId, () => route.query.tab], ([pageId, value]) => {
  if (pageId !== PAGE_ID) {
    closeDetails()
    return
  }
  const next = normalizeCustomerOrderTab(value) as CustomerOrderTab
  if (next !== activeTab.value) {
    activeTab.value = next
    currentPage.value = 1
  }
})

onMounted(() => appStore.ensureStaticTab(PAGE_ID))
useDialogFocusManager(pageRoot, '.customer-order-dialog', '.customer-order-dialog__panel')
</script>

<template>
  <section ref="pageRoot" class="customer-orders-page">
    <ContentPageHeader title="客户订单管理" description="集中查看客户订单、待处理事项与付款状态。">
      <template #actions><button class="btn btn-secondary" type="button" @click="exportOrders">导出订单报表</button></template>
    </ContentPageHeader>

    <div class="sales-demo-notice" role="note">当前为离线演示数据。下载合同、支付提醒和查看详情仅用于交互预览。</div>

    <div class="customer-orders-workspace">
      <form class="sales-filter-grid" aria-label="客户订单查询" @submit.prevent="applyFilters">
        <FilterField layout="placeholder" label="编号查询">
          <input v-model="draftFilters.number" type="search" placeholder="采购单编号 / PO号" autocomplete="off" />
        </FilterField>
        <FilterField layout="placeholder" label="名称查询">
          <input v-model="draftFilters.name" type="search" placeholder="客户名称 / SI名称" autocomplete="off" />
        </FilterField>
        <FilterField layout="placeholder" label="核销状态">
          <select v-model="draftFilters.verificationStatus" aria-label="核销状态">
            <option value="全部">核销状态 - 全部</option>
            <option value="未核销">核销状态 - 未核销</option>
            <option value="已核销">核销状态 - 已核销</option>
          </select>
        </FilterField>
        <FilterField layout="placeholder" label="订单类型">
          <select v-model="draftFilters.orderType" aria-label="订单类型">
            <option value="全部">订单类型 - 全部</option>
            <option value="协议产品">订单类型 - 协议产品</option>
            <option value="普通产品">订单类型 - 普通产品</option>
          </select>
        </FilterField>
        <FilterField layout="placeholder" label="下单时间" group class="sales-filter-grid__range">
          <div class="sales-date-range" role="group" aria-label="下单时间">
            <span class="filter-date-control" :class="{ 'is-empty': !draftFilters.orderStart }">
              <input v-model="draftFilters.orderStart" type="date" aria-label="下单开始日期" :aria-invalid="Boolean(result.error)" />
              <span v-if="!draftFilters.orderStart" class="filter-date-placeholder" aria-hidden="true">下单开始日期</span>
            </span>
            <span aria-hidden="true">至</span>
            <span class="filter-date-control" :class="{ 'is-empty': !draftFilters.orderEnd }">
              <input v-model="draftFilters.orderEnd" type="date" aria-label="下单结束日期" :aria-invalid="Boolean(result.error)" />
              <span v-if="!draftFilters.orderEnd" class="filter-date-placeholder" aria-hidden="true">下单结束日期</span>
            </span>
          </div>
        </FilterField>
        <div class="sales-filter-actions">
          <button class="btn btn-primary" type="submit">查询</button>
          <button class="btn btn-secondary" type="button" @click="resetFilters">重置</button>
        </div>
        <p v-if="result.error" class="sales-filter-error" role="alert">{{ result.error }}</p>
      </form>

      <ListSurface :state="result.error ? 'error' : result.total ? 'data' : 'empty'">
        <template #tabs><ContentTabs :items="tabItems" :model-value="activeTab" label="客户订单分类" @update:model-value="changeTab" /></template>
        <template #toolbar><strong>{{ activeTabLabel }}</strong><span class="sales-result-count">当前筛选共 {{ result.total }} 条</span></template>
        <FeedbackState v-if="result.error" state="error" title="日期范围无效" :description="result.error" />
        <FeedbackState v-else-if="!result.total" :state="hasAppliedFilters ? 'filtered-empty' : 'empty'" title="没有符合条件的订单" description="请调整查询条件后重试。" />
        <DataTable v-else :columns="columns" :rows="result.items" row-key="no" caption="客户订单列表" density="compact">
          <template #cell-actions="{ row }">
            <div class="sales-row-actions">
              <button type="button" @click="downloadContract(row)">下载合同</button>
              <button v-if="row.orderStatus === '待付款'" type="button" @click="sendPaymentReminder(row)">{{ remindedOrders.has(row.no) ? '已提醒' : '支付提醒' }}</button>
              <button type="button" @click="openDetails(row)">查看详情</button>
            </div>
          </template>
          <template #cell-customer="{ row }"><strong>{{ row.customer }}</strong><small>{{ row.si }}</small></template>
          <template #cell-amount="{ row }">{{ moneyFormatter.format(row.amount) }}</template>
          <template #cell-verificationStatus="{ row }"><StatusTag :tone="statusTone(row.verificationStatus)">{{ row.verificationStatus }}</StatusTag></template>
          <template #cell-orderStatus="{ row }"><StatusTag :tone="statusTone(row.orderStatus)">{{ row.orderStatus }}</StatusTag></template>
          <template #cell-contractStatus="{ row }"><StatusTag :tone="statusTone(row.contractStatus)">{{ row.contractStatus }}</StatusTag></template>
        </DataTable>
        <template #pagination><Pagination v-model:page="currentPage" :page-size="PAGE_SIZE" :total="result.total" /></template>
      </ListSurface>
    </div>

    <div v-if="selectedOrder" class="customer-order-dialog" @click.self="closeDetails">
      <section class="customer-order-dialog__panel" aria-labelledby="customer-order-dialog-title">
        <h2 id="customer-order-dialog-title">订单详情</h2>
        <dl>
          <dt>订单编号</dt><dd>{{ selectedOrder.no }}</dd>
          <dt>客户名称</dt><dd>{{ selectedOrder.customer }}</dd>
          <dt>下单时间</dt><dd>{{ selectedOrder.time }}</dd>
          <dt>订单金额</dt><dd>{{ moneyFormatter.format(selectedOrder.amount) }} 元</dd>
          <dt>订单状态</dt><dd>{{ selectedOrder.orderStatus }}</dd>
        </dl>
        <div class="customer-order-dialog__actions"><button class="btn btn-primary" type="button" data-dialog-close @click="closeDetails">关闭</button></div>
      </section>
    </div>
  </section>
</template>

<style scoped>
.customer-orders-page { display: grid; gap: var(--space-4, 16px); min-width: 0; overflow-x: clip; }
.customer-orders-workspace { display: grid; gap: var(--space-3, 12px); min-width: 0; }
.sales-demo-notice { padding: var(--space-3, 12px) var(--space-4, 16px); border: 1px solid var(--color-primary-border); border-radius: var(--radius-md); background: var(--color-primary-subtle); color: var(--color-text-secondary); }
.sales-filter-grid { display: grid; grid-template-columns: minmax(0, 1fr); gap: var(--space-3, 12px); align-items: start; min-width: 0; }
.sales-filter-grid__range { min-width: 0; }
.sales-date-range { display: grid; grid-template-columns: minmax(0, 1fr) auto minmax(0, 1fr); gap: var(--space-2, 8px); align-items: center; min-width: 0; }
.filter-date-control { position: relative; display: block; min-width: 0; }
.filter-date-control input { width: 100%; }
.filter-date-placeholder { position: absolute; top: 50%; left: var(--space-3, 12px); transform: translateY(-50%); color: var(--color-text-tertiary); font-size: var(--text-sm, 13px); pointer-events: none; }
.filter-date-control.is-empty:not(:focus-within) input::-webkit-datetime-edit { opacity: 0; }
.filter-date-control:focus-within .filter-date-placeholder { display: none; }
.sales-filter-actions { display: flex; gap: var(--space-2, 8px); align-items: center; }
.sales-filter-actions .btn { min-height: var(--control-height-md, 36px); }
.sales-filter-error { grid-column: 1 / -1; margin: 0; color: var(--color-danger); font-size: var(--text-xs, 12px); }
.sales-result-count { margin-left: var(--space-2, 8px); color: var(--color-text-tertiary); font-weight: 400; }
.sales-row-actions { display: flex; flex-wrap: wrap; gap: var(--space-2, 8px); }
.sales-row-actions button { flex-shrink: 0; padding: 0; border: 0; background: transparent; color: var(--color-primary); font: inherit; white-space: nowrap; cursor: pointer; }
.sales-row-actions button:focus-visible { outline: 2px solid var(--color-primary); outline-offset: 2px; }
.customer-orders-page :deep(.cs-data-table) { min-width: 1420px; }
.customer-orders-page :deep([data-column='actions']) { left: 0; right: auto; min-width: 220px; }
.customer-orders-page :deep(.cs-data-table tbody tr:hover [data-column='actions']) {
  /* Keep the shared hover tint over an opaque surface so scrolled text cannot show through. */
  background: linear-gradient(var(--color-primary-subtle), var(--color-primary-subtle)), var(--color-surface) !important;
}
.customer-orders-page :deep([data-column='customer']) strong,
.customer-orders-page :deep([data-column='customer']) small { display: block; }
.customer-orders-page :deep([data-column='customer']) small { margin-top: var(--space-1, 4px); color: var(--color-text-tertiary); }
.customer-order-dialog { position: fixed; inset: 0; z-index: 1200; display: grid; place-items: center; padding: var(--space-6, 24px); background: var(--color-overlay); }
.customer-order-dialog__panel { width: min(520px, 100%); padding: var(--space-6, 24px); border-radius: var(--radius-lg); background: var(--color-surface); box-shadow: var(--shadow-lg); }
.customer-order-dialog__panel h2 { margin: 0 0 var(--space-4, 16px); font-size: var(--text-lg, 18px); }
.customer-order-dialog__panel dl { display: grid; grid-template-columns: 96px minmax(0, 1fr); gap: var(--space-3, 12px); margin: 0; }
.customer-order-dialog__panel dt { color: var(--color-text-secondary); }
.customer-order-dialog__panel dd { margin: 0; }
.customer-order-dialog__actions { display: flex; justify-content: flex-end; margin-top: var(--space-6, 24px); }
@container (min-width: 720px) { .sales-filter-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); } .sales-filter-grid__range { grid-column: span 2; } }
@container (min-width: 1040px) { .sales-filter-grid { grid-template-columns: repeat(4, minmax(0, 1fr)); } }
</style>

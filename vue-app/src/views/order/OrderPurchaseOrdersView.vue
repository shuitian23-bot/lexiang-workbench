<template>
  <section class="purchase-orders-page" :class="{ 'is-detail': isDetailMode }">
    <template v-if="selectedOrder">
      <header class="order-detail-header">
        <button class="text-action" type="button" @click="goList">返回列表</button>
        <div>
          <p class="section-kicker">协议采购单详情</p>
          <h1>{{ selectedOrder.agreementName }}</h1>
          <p>{{ selectedOrder.customerName }} · {{ selectedOrder.poNo }}</p>
        </div>
        <button class="primary-action" type="button" @click="exportSingleOrder">导出当前详情</button>
      </header>

      <div class="detail-grid">
        <article class="detail-panel">
          <h2>基本信息</h2>
          <dl class="detail-list">
            <div><dt>协议单 ID</dt><dd>{{ selectedOrder.id }}</dd></div>
            <div><dt>采购单号</dt><dd>{{ selectedOrder.poNo }}</dd></div>
            <div><dt>当前状态</dt><dd><span class="status-pill" :data-status="selectedOrder.status">{{ statusLabel(selectedOrder.status) }}</span></dd></div>
            <div><dt>负责人</dt><dd>{{ selectedOrder.ownerName }}</dd></div>
            <div><dt>客户联系人</dt><dd>{{ selectedOrder.contactName }}</dd></div>
            <div><dt>区域 / 渠道</dt><dd>{{ selectedOrder.region }} / {{ selectedOrder.channel }}</dd></div>
          </dl>
        </article>

        <article class="detail-panel">
          <h2>履约进度</h2>
          <div class="progress-meter" aria-label="履约进度">
            <span :style="{ width: `${selectedOrder.progress}%` }"></span>
          </div>
          <strong class="progress-value">{{ selectedOrder.progress }}%</strong>
          <p>{{ selectedOrder.conversionStage }}</p>
          <dl class="detail-list compact">
            <div><dt>创建时间</dt><dd>{{ selectedOrder.createdAt }}</dd></div>
            <div><dt>更新时间</dt><dd>{{ selectedOrder.updatedAt }}</dd></div>
            <div><dt>预计交付</dt><dd>{{ selectedOrder.expectedDelivery }}</dd></div>
          </dl>
        </article>
      </div>

      <article class="detail-panel detail-panel-wide">
        <h2>采购内容</h2>
        <div class="detail-summary">
          <div>
            <span>商品摘要</span>
            <strong>{{ selectedOrder.productSummary }}</strong>
          </div>
          <div>
            <span>采购数量</span>
            <strong>{{ selectedOrder.itemCount }} 件</strong>
          </div>
          <div>
            <span>协议金额</span>
            <strong>{{ formatCurrency(selectedOrder.amount) }}</strong>
          </div>
        </div>
        <p class="remark">{{ selectedOrder.remark }}</p>
      </article>
    </template>

    <template v-else-if="isDetailMode">
      <div class="empty-state">
        <p class="section-kicker">协议采购单详情</p>
        <h1>未找到对应采购单</h1>
        <p>当前为模拟数据 POC，暂未匹配到该采购单 ID。</p>
        <button class="primary-action" type="button" @click="goList">返回列表</button>
      </div>
    </template>

    <template v-else>
      <header class="order-page-header">
        <div>
          <p class="section-kicker">订单管理</p>
          <h1>协议采购单管理</h1>
          <p>当前为纯页面演示 POC，数据来自独立 mock/service 层，暂未连接真实接口。</p>
        </div>
        <button class="primary-action" type="button" @click="exportFilteredOrders">
          导出当前筛选
        </button>
      </header>

      <div class="kpi-grid">
        <article>
          <span>当前筛选采购单</span>
          <strong>{{ kpis.count }}</strong>
        </article>
        <article>
          <span>进行中协议单</span>
          <strong>{{ kpis.activeCount }}</strong>
        </article>
        <article>
          <span>当前筛选金额</span>
          <strong>{{ formatShortCurrency(kpis.totalAmount) }}</strong>
        </article>
        <article>
          <span>平均履约进度</span>
          <strong>{{ kpis.averageProgress }}%</strong>
        </article>
      </div>

      <form class="query-panel" @submit.prevent="applyQuery">
        <label>
          <span>关键词</span>
          <input
            v-model="draftFilters.keyword"
            type="search"
            placeholder="采购单号、客户、协议名称、负责人"
          >
        </label>
        <label>
          <span>状态</span>
          <select v-model="draftFilters.status">
            <option v-for="option in statusOptions" :key="option.value" :value="option.value">
              {{ option.label }}
            </option>
          </select>
        </label>
        <div class="query-actions">
          <button class="secondary-action" type="button" @click="resetQuery">重置</button>
          <button class="primary-action" type="submit">查询</button>
        </div>
      </form>

      <section class="table-section" aria-label="协议采购单列表">
        <div class="table-toolbar">
          <div>
            <h2>采购单列表</h2>
            <p>共 {{ queryResult.total }} 条，导出范围为当前筛选结果。</p>
          </div>
          <span>第 {{ currentPage }} / {{ totalPages }} 页</span>
        </div>

        <div class="table-scroll">
          <table>
            <thead>
              <tr>
                <th>采购单</th>
                <th>客户</th>
                <th>商品摘要</th>
                <th>数量</th>
                <th>金额</th>
                <th>状态</th>
                <th>负责人</th>
                <th>预计交付</th>
                <th class="action-col">操作</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="order in queryResult.rows" :key="order.id">
                <td>
                  <strong>{{ order.poNo }}</strong>
                  <span>{{ order.agreementName }}</span>
                </td>
                <td>
                  <strong>{{ order.customerName }}</strong>
                  <span>{{ order.region }} · {{ order.channel }}</span>
                </td>
                <td>{{ order.productSummary }}</td>
                <td>{{ order.itemCount }}</td>
                <td>{{ formatCurrency(order.amount) }}</td>
                <td><span class="status-pill" :data-status="order.status">{{ statusLabel(order.status) }}</span></td>
                <td>{{ order.ownerName }}</td>
                <td>{{ order.expectedDelivery }}</td>
                <td class="action-col">
                  <button class="text-action" type="button" @click="goDetail(order.id)">查看详情</button>
                </td>
              </tr>
              <tr v-if="!queryResult.rows.length">
                <td class="empty-cell" colspan="9">当前筛选条件下暂无协议采购单。</td>
              </tr>
            </tbody>
          </table>
        </div>

        <footer class="pagination-bar">
          <button class="secondary-action" type="button" :disabled="currentPage <= 1" @click="changePage(currentPage - 1)">
            上一页
          </button>
          <button class="secondary-action" type="button" :disabled="currentPage >= totalPages" @click="changePage(currentPage + 1)">
            下一页
          </button>
        </footer>
      </section>
    </template>
  </section>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAppStore, type PageId } from '@/stores/app'
import { downloadTextFile } from '@/utils/download'
import {
  PURCHASE_ORDER_STATUS_LABELS,
  PURCHASE_ORDER_STATUS_OPTIONS,
  buildPurchaseOrderCsv,
  getPurchaseOrderById,
  getPurchaseOrderKpis,
  queryPurchaseOrders,
  type PurchaseOrderFilters,
  type PurchaseOrderStatus
} from '@/services/purchaseOrders'

const pageId: PageId = 'order.purchaseOrders'
const pageSize = 5
const defaultFilters: PurchaseOrderFilters = { keyword: '', status: 'all' }

const route = useRoute()
const router = useRouter()
const appStore = useAppStore()
const currentPage = ref(1)
const draftFilters = reactive<PurchaseOrderFilters>({ ...defaultFilters })
const appliedFilters = ref<PurchaseOrderFilters>({ ...defaultFilters })
const statusOptions = PURCHASE_ORDER_STATUS_OPTIONS

const selectedOrder = computed(() => {
  const id = typeof route.params.id === 'string' ? route.params.id : ''
  return id ? getPurchaseOrderById(id) : null
})
const isDetailMode = computed(() => Boolean(route.params.id))
const queryResult = computed(() =>
  queryPurchaseOrders({
    ...appliedFilters.value,
    page: currentPage.value,
    pageSize
  })
)
const totalPages = computed(() => Math.max(Math.ceil(queryResult.value.total / pageSize), 1))
const kpis = computed(() => getPurchaseOrderKpis(queryResult.value.filteredRows))

onMounted(() => {
  document.title = '联想门户工作台'
  syncStaticTab()
})

watch(() => route.fullPath, syncStaticTab)
watch(totalPages, pages => {
  if (currentPage.value > pages) currentPage.value = pages
})

function syncStaticTab() {
  appStore.ensureStaticTab(pageId)
  appStore.setActiveStaticTab(pageId)
}

function applyQuery() {
  appliedFilters.value = {
    keyword: draftFilters.keyword.trim(),
    status: draftFilters.status
  }
  currentPage.value = 1
}

function resetQuery() {
  draftFilters.keyword = defaultFilters.keyword
  draftFilters.status = defaultFilters.status
  appliedFilters.value = { ...defaultFilters }
  currentPage.value = 1
}

function changePage(page: number) {
  currentPage.value = Math.min(Math.max(page, 1), totalPages.value)
}

function goDetail(id: string) {
  router.push(`/order/purchase-orders/${id}`)
}

function goList() {
  router.push('/order/purchase-orders')
}

function exportFilteredOrders() {
  const csv = buildPurchaseOrderCsv(queryResult.value.filteredRows)
  downloadTextFile({
    fileName: `purchase-orders-filtered-${new Date().toISOString().slice(0, 10)}.csv`,
    content: `\uFEFF${csv}`,
    mimeType: 'text/csv;charset=utf-8'
  })
  appStore.notify('已导出当前筛选结果')
}

function exportSingleOrder() {
  if (!selectedOrder.value) return
  const csv = buildPurchaseOrderCsv([selectedOrder.value])
  downloadTextFile({
    fileName: `${selectedOrder.value.poNo}.csv`,
    content: `\uFEFF${csv}`,
    mimeType: 'text/csv;charset=utf-8'
  })
  appStore.notify('已导出当前采购单详情')
}

function statusLabel(status: PurchaseOrderStatus) {
  return PURCHASE_ORDER_STATUS_LABELS[status]
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat('zh-CN', {
    style: 'currency',
    currency: 'CNY',
    maximumFractionDigits: 0
  }).format(value)
}

function formatShortCurrency(value: number) {
  if (value >= 10000) return `${(value / 10000).toFixed(1)}万`
  return formatCurrency(value)
}
</script>

<style scoped>
.purchase-orders-page {
  display: flex;
  flex-direction: column;
  gap: 18px;
  min-width: 0;
  padding: 24px clamp(18px, 2.4vw, 32px) 32px;
  color: #1f2937;
}

.order-page-header,
.order-detail-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 20px;
}

.order-page-header h1,
.order-detail-header h1,
.empty-state h1 {
  margin: 4px 0 8px;
  color: #111827;
  font-size: 24px;
  line-height: 1.25;
}

.order-page-header p,
.order-detail-header p,
.empty-state p {
  margin: 0;
  color: #667085;
  line-height: 1.6;
}

.section-kicker {
  color: #2563eb !important;
  font-size: 13px;
  font-weight: 700;
}

.primary-action,
.secondary-action,
.text-action {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 34px;
  border-radius: 6px;
  border: 1px solid transparent;
  padding: 0 14px;
  font-size: 13px;
  font-weight: 700;
  white-space: nowrap;
  cursor: pointer;
}

.primary-action {
  background: #2563eb;
  color: #fff;
  box-shadow: 0 8px 16px rgba(37, 99, 235, .16);
}

.secondary-action {
  border-color: #d8dee8;
  background: #fff;
  color: #475467;
}

.secondary-action:disabled {
  cursor: not-allowed;
  opacity: .45;
}

.text-action {
  border-color: #bfdbfe;
  background: #eff6ff;
  color: #2563eb;
}

.kpi-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(150px, 1fr));
  gap: 12px;
}

.kpi-grid article,
.query-panel,
.table-section,
.detail-panel,
.empty-state {
  border: 1px solid #dfe5ef;
  border-radius: 8px;
  background: #fff;
  box-shadow: 0 10px 24px rgba(15, 23, 42, .04);
}

.kpi-grid article {
  min-height: 92px;
  padding: 16px;
}

.kpi-grid span,
.detail-summary span,
.detail-list dt {
  color: #667085;
  font-size: 12px;
}

.kpi-grid strong {
  display: block;
  margin-top: 10px;
  color: #111827;
  font-size: 26px;
  line-height: 1.1;
}

.query-panel {
  display: grid;
  grid-template-columns: minmax(260px, 1.2fr) minmax(180px, .6fr) auto;
  gap: 14px;
  align-items: end;
  padding: 16px;
}

.query-panel label {
  display: flex;
  flex-direction: column;
  gap: 8px;
  min-width: 0;
}

.query-panel label span {
  color: #344054;
  font-size: 13px;
  font-weight: 700;
}

.query-panel input,
.query-panel select {
  width: 100%;
  min-height: 36px;
  border: 1px solid #d8dee8;
  border-radius: 6px;
  background: #fff;
  color: #1f2937;
  font-size: 14px;
  padding: 0 12px;
  outline: none;
}

.query-panel input:focus,
.query-panel select:focus {
  border-color: #2563eb;
  box-shadow: 0 0 0 3px rgba(37, 99, 235, .12);
}

.query-actions,
.pagination-bar {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
}

.table-section {
  overflow: hidden;
}

.table-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 16px 18px;
  border-bottom: 1px solid #edf1f7;
}

.table-toolbar h2,
.detail-panel h2 {
  margin: 0 0 6px;
  color: #111827;
  font-size: 16px;
}

.table-toolbar p {
  margin: 0;
  color: #667085;
  font-size: 13px;
}

.table-toolbar > span {
  color: #475467;
  font-size: 13px;
  white-space: nowrap;
}

.table-scroll {
  overflow-x: auto;
}

table {
  width: 100%;
  min-width: 1120px;
  border-collapse: separate;
  border-spacing: 0;
}

th,
td {
  border-bottom: 1px solid #edf1f7;
  padding: 14px 16px;
  text-align: left;
  vertical-align: middle;
  font-size: 13px;
}

th {
  background: #f8fafc;
  color: #475467;
  font-weight: 800;
}

td {
  color: #344054;
}

td strong {
  display: block;
  color: #111827;
  font-weight: 800;
}

td span {
  display: block;
  margin-top: 4px;
  color: #667085;
}

.action-col {
  position: sticky;
  right: 0;
  min-width: 112px;
  background: inherit;
  box-shadow: -8px 0 16px rgba(15, 23, 42, .04);
}

tbody .action-col {
  background: #fff;
}

.empty-cell {
  height: 120px;
  text-align: center;
  color: #667085;
}

.pagination-bar {
  padding: 14px 18px;
}

.status-pill {
  display: inline-flex;
  align-items: center;
  min-height: 24px;
  border-radius: 999px;
  padding: 0 10px;
  background: #eef4ff;
  color: #2563eb;
  font-size: 12px;
  font-weight: 800;
}

.status-pill[data-status="pending"] {
  background: #fff7ed;
  color: #c2410c;
}

.status-pill[data-status="approved"],
.status-pill[data-status="signing"] {
  background: #eff6ff;
  color: #2563eb;
}

.status-pill[data-status="fulfilling"] {
  background: #ecfdf3;
  color: #067647;
}

.status-pill[data-status="completed"] {
  background: #f0fdf4;
  color: #15803d;
}

.status-pill[data-status="cancelled"] {
  background: #f2f4f7;
  color: #667085;
}

.detail-grid {
  display: grid;
  grid-template-columns: minmax(0, 1.2fr) minmax(320px, .8fr);
  gap: 16px;
}

.detail-panel,
.empty-state {
  padding: 18px;
}

.detail-panel-wide {
  width: 100%;
}

.detail-list {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 14px 20px;
  margin: 14px 0 0;
}

.detail-list.compact {
  grid-template-columns: 1fr;
}

.detail-list div {
  min-width: 0;
}

.detail-list dt {
  margin-bottom: 5px;
}

.detail-list dd {
  margin: 0;
  color: #111827;
  font-weight: 700;
  overflow-wrap: anywhere;
}

.progress-meter {
  height: 10px;
  overflow: hidden;
  border-radius: 999px;
  background: #e5e7eb;
}

.progress-meter span {
  display: block;
  height: 100%;
  border-radius: inherit;
  background: linear-gradient(90deg, #2563eb, #16a34a);
}

.progress-value {
  display: block;
  margin-top: 12px;
  color: #111827;
  font-size: 28px;
}

.detail-panel p {
  color: #667085;
  line-height: 1.6;
}

.detail-summary {
  display: grid;
  grid-template-columns: minmax(0, 1.5fr) repeat(2, minmax(140px, .5fr));
  gap: 14px;
}

.detail-summary div {
  border-radius: 6px;
  background: #f8fafc;
  padding: 14px;
}

.detail-summary strong {
  display: block;
  margin-top: 8px;
  color: #111827;
  font-size: 16px;
}

.remark {
  margin: 14px 0 0;
}

.empty-state {
  max-width: 620px;
}

@media (max-width: 1440px) {
  .kpi-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 1280px) {
  .purchase-orders-page {
    padding-inline: 16px;
  }

  .query-panel,
  .detail-grid,
  .detail-summary {
    grid-template-columns: 1fr;
  }

  .order-page-header,
  .order-detail-header,
  .table-toolbar {
    align-items: stretch;
    flex-direction: column;
  }

  .query-actions,
  .pagination-bar {
    justify-content: flex-start;
  }
}
</style>

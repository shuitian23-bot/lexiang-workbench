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

      <div class="order-page-flow detail-flow">
        <div class="detail-grid">
          <article class="detail-panel">
            <h2>基本信息</h2>
            <dl class="detail-list">
              <div><dt>协议单 ID</dt><dd>{{ selectedOrder.id }}</dd></div>
              <div><dt>采购单号</dt><dd>{{ selectedOrder.poNo }}</dd></div>
              <div><dt>当前状态</dt><dd><span class="order-status-pill" :data-status="selectedOrder.status">{{ statusLabel(selectedOrder.status) }}</span></dd></div>
              <div><dt>负责人</dt><dd>{{ selectedOrder.ownerName }}</dd></div>
              <div><dt>客户联系人</dt><dd>{{ selectedOrder.contactName }}</dd></div>
              <div><dt>区域 / 渠道</dt><dd>{{ selectedOrder.region }} / {{ selectedOrder.channel }}</dd></div>
            </dl>
          </article>

          <article class="detail-panel">
            <h2>履约进度</h2>
            <div
              class="progress-meter"
              role="progressbar"
              aria-label="履约进度"
              aria-valuemin="0"
              aria-valuemax="100"
              :aria-valuenow="selectedOrder.progress"
            >
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
      </div>
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
          <h1 class="page-title">协议采购单管理</h1>
          <p>当前为纯页面演示 POC，数据来自独立 mock/service 层，暂未连接真实接口。</p>
        </div>
        <button class="primary-action" type="button" @click="exportFilteredOrders">
          导出当前筛选
        </button>
      </header>

      <div class="order-page-flow order-summary-list-flow">
        <section class="order-kpi-grid" aria-label="当前筛选结果摘要">
          <article class="order-kpi-card">
            <span>当前筛选采购单</span>
            <strong>{{ kpis.count }}</strong>
          </article>
          <article class="order-kpi-card">
            <span>进行中协议单</span>
            <strong>{{ kpis.activeCount }}</strong>
          </article>
          <article class="order-kpi-card">
            <span>当前筛选金额</span>
            <strong>{{ formatShortCurrency(kpis.totalAmount) }}</strong>
          </article>
          <article class="order-kpi-card">
            <span>平均履约进度</span>
            <strong>{{ kpis.averageProgress }}%</strong>
          </article>
        </section>

        <section class="order-list-workspace" aria-label="协议采购单列表工作区">
          <form class="order-query-panel" aria-label="筛选条件" @submit.prevent="applyQuery">
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
            <div class="order-query-actions">
              <button class="secondary-action" type="button" @click="resetQuery">重置</button>
              <button class="primary-action" type="submit">查询</button>
            </div>
          </form>

          <section class="order-table-section" aria-label="协议采购单列表">
            <div class="order-table-toolbar">
              <div>
                <h2>采购单列表</h2>
                <p>共 {{ queryResult.total }} 条，导出范围为当前筛选结果。</p>
              </div>
              <span>第 {{ currentPage }} / {{ totalPages }} 页</span>
            </div>

            <div class="order-table-scroll">
              <table class="order-data-table">
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
                    <th class="order-action-col">操作</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="order in queryResult.rows" :key="order.id">
                    <td>
                      <strong>{{ order.poNo }}</strong>
                      <span class="order-cell-subline">{{ order.agreementName }}</span>
                    </td>
                    <td>
                      <strong>{{ order.customerName }}</strong>
                      <span class="order-cell-subline">{{ order.region }} · {{ order.channel }}</span>
                    </td>
                    <td>{{ order.productSummary }}</td>
                    <td>{{ order.itemCount }}</td>
                    <td>{{ formatCurrency(order.amount) }}</td>
                    <td><span class="order-status-pill" :data-status="order.status">{{ statusLabel(order.status) }}</span></td>
                    <td>{{ order.ownerName }}</td>
                    <td>{{ order.expectedDelivery }}</td>
                    <td class="order-action-col">
                      <button class="text-action" type="button" @click="goDetail(order.id)">查看详情</button>
                    </td>
                  </tr>
                  <tr v-if="!queryResult.rows.length">
                    <td class="order-empty-cell" colspan="9">当前筛选条件下暂无协议采购单。</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <footer class="order-pagination-bar">
              <button class="secondary-action" type="button" :disabled="currentPage <= 1" @click="changePage(currentPage - 1)">
                上一页
              </button>
              <button class="secondary-action" type="button" :disabled="currentPage >= totalPages" @click="changePage(currentPage + 1)">
                下一页
              </button>
            </footer>
          </section>
        </section>
      </div>
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
  container-type: inline-size;
  display: grid;
  min-width: 0;
  color: var(--color-text);
}

.order-page-flow,
.order-list-workspace {
  display: grid;
  min-width: 0;
}

.order-page-flow {
  gap: 16px;
}

.order-list-workspace {
  gap: 12px;
}

.order-page-header,
.order-detail-header {
  margin-bottom: 16px;
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
  margin: 4px 0 0;
  color: var(--color-text);
  font-size: 20px;
  line-height: 1.35;
}

.order-page-header .page-title {
  margin: 0;
}

.order-page-header p,
.order-detail-header p,
.empty-state p {
  margin: 0;
  margin-top: 4px;
  color: var(--color-text-secondary);
  font-size: 13px;
  line-height: 1.5;
}

.section-kicker {
  color: var(--color-primary) !important;
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
  border-radius: var(--radius);
  border: 1px solid transparent;
  padding: 0 16px;
  font-size: 13px;
  font-weight: 700;
  white-space: nowrap;
  cursor: pointer;
}

.primary-action {
  border-color: var(--color-primary);
  background: var(--color-primary);
  color: var(--color-surface);
}

.secondary-action {
  border-color: var(--color-border);
  background: var(--color-surface);
  color: var(--color-text-secondary);
}

.secondary-action:disabled {
  cursor: not-allowed;
  opacity: .45;
}

.text-action {
  border: 0;
  padding-inline: 4px;
  background: transparent;
  color: var(--color-primary);
}

.order-kpi-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(150px, 1fr));
  gap: 12px;
  margin: 0 !important;
}

.order-kpi-card,
.order-query-panel,
.order-table-section,
.detail-panel,
.empty-state {
  border: 1px solid var(--color-border-subtle);
  border-radius: var(--radius-lg);
  background: var(--color-surface);
  box-shadow: var(--shadow);
}

.order-kpi-card {
  min-height: 96px;
  padding: 16px;
}

.order-kpi-grid span,
.detail-summary span,
.detail-list dt {
  color: var(--color-text-secondary);
  font-size: 12px;
}

.order-kpi-grid strong {
  display: block;
  margin-top: 8px;
  color: var(--color-text);
  font-size: 24px;
  line-height: 1.2;
}

.order-query-panel {
  display: grid;
  grid-template-columns: minmax(260px, 1.2fr) minmax(180px, .6fr) auto;
  gap: 12px;
  align-items: end;
  padding: 16px;
}

.order-query-panel label {
  display: flex;
  flex-direction: column;
  gap: 8px;
  min-width: 0;
}

.order-query-panel label span {
  color: var(--color-text);
  font-size: 13px;
  font-weight: 700;
}

.order-query-panel input,
.order-query-panel select {
  width: 100%;
  min-height: 36px;
  border: 1px solid var(--color-border);
  border-radius: var(--radius);
  background: var(--color-surface);
  color: var(--color-text);
  font-size: 13px;
  padding: 0 12px;
  outline: none;
}

.order-query-panel input:focus,
.order-query-panel select:focus {
  border-color: var(--color-primary);
  box-shadow: 0 0 0 3px var(--color-primary-subtle);
}

.order-query-actions,
.order-pagination-bar {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
}

.order-table-section {
  overflow: hidden;
}

.order-table-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 16px;
  border-bottom: 1px solid var(--color-border-subtle);
}

.order-table-toolbar h2,
.detail-panel h2 {
  margin: 0 0 4px;
  color: var(--color-text);
  font-size: 16px;
}

.order-table-toolbar p {
  margin: 0;
  color: var(--color-text-secondary);
  font-size: 13px;
}

.order-table-toolbar > span {
  color: var(--color-text-secondary);
  font-size: 13px;
  white-space: nowrap;
}

.order-table-scroll {
  overflow-x: auto;
}

.order-data-table {
  width: 100%;
  min-width: 1120px;
  border-collapse: separate;
  border-spacing: 0;
}

.order-data-table th,
.order-data-table td {
  border-bottom: 1px solid var(--color-border-subtle);
  padding: 12px 16px;
  text-align: left;
  vertical-align: middle;
  font-size: 13px;
}

.order-data-table th {
  background: var(--color-bg-muted);
  color: var(--color-text-secondary);
  font-weight: 800;
}

.order-data-table td {
  color: var(--color-text-secondary);
}

.order-data-table td strong {
  display: block;
  color: var(--color-text);
  font-weight: 800;
}

.order-cell-subline {
  display: block;
  margin-top: 4px;
  color: var(--color-text-tertiary);
}

.order-action-col {
  position: sticky;
  right: 0;
  min-width: 112px;
  background: inherit;
  box-shadow: var(--shadow);
}

.order-data-table tbody .order-action-col {
  background: var(--color-surface);
}

.order-empty-cell {
  height: 120px;
  text-align: center;
  color: var(--color-text-tertiary);
}

.order-pagination-bar {
  padding: 12px 16px;
}

.order-status-pill {
  display: inline-flex;
  align-items: center;
  width: max-content;
  max-width: 100%;
  min-height: 24px;
  margin: 0;
  border-radius: 9999px;
  padding: 0 8px;
  background: var(--color-primary-subtle);
  color: var(--color-primary);
  font-size: 12px;
  font-weight: 800;
  line-height: 1;
  white-space: nowrap;
}

.order-status-pill[data-status="pending"] {
  background: var(--color-warning-bg);
  color: var(--color-warning);
}

.order-status-pill[data-status="approved"],
.order-status-pill[data-status="signing"] {
  background: var(--color-primary-subtle);
  color: var(--color-primary);
}

.order-status-pill[data-status="fulfilling"] {
  background: var(--color-success-bg);
  color: var(--color-success);
}

.order-status-pill[data-status="completed"] {
  background: var(--color-success-bg);
  color: var(--color-success);
}

.order-status-pill[data-status="cancelled"] {
  background: var(--color-bg-muted);
  color: var(--color-text-secondary);
}

.detail-grid {
  display: grid;
  grid-template-columns: minmax(0, 1.2fr) minmax(320px, .8fr);
  gap: 16px;
}

.detail-panel,
.empty-state {
  padding: 16px;
}

.detail-panel-wide {
  width: 100%;
}

.detail-list {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 16px 20px;
  margin: 16px 0 0;
}

.detail-list.compact {
  grid-template-columns: 1fr;
}

.detail-list div {
  min-width: 0;
}

.detail-list dt {
  margin-bottom: 4px;
}

.detail-list dd {
  margin: 0;
  color: var(--color-text);
  font-weight: 700;
  overflow-wrap: anywhere;
}

.progress-meter {
  height: 10px;
  overflow: hidden;
  border-radius: 9999px;
  background: var(--color-bg-muted);
}

.progress-meter span {
  display: block;
  height: 100%;
  border-radius: inherit;
  background: var(--color-primary);
}

.progress-value {
  display: block;
  margin-top: 12px;
  color: var(--color-text);
  font-size: 30px;
}

.detail-panel p {
  color: var(--color-text-secondary);
  line-height: 1.6;
}

.detail-summary {
  display: grid;
  grid-template-columns: minmax(0, 1.5fr) repeat(2, minmax(140px, .5fr));
  gap: 16px;
}

.detail-summary div {
  border-radius: var(--radius);
  background: var(--color-bg-muted);
  padding: 16px;
}

.detail-summary strong {
  display: block;
  margin-top: 8px;
  color: var(--color-text);
  font-size: 16px;
}

.remark {
  margin: 16px 0 0;
}

.empty-state {
  max-width: 620px;
}

@container (max-width: 1039px) {
  .order-kpi-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .order-query-panel,
  .detail-grid {
    grid-template-columns: 1fr;
  }

  .order-query-actions {
    grid-column: 1 / -1;
  }
}

@container (max-width: 719px) {
  .order-kpi-grid,
  .order-query-panel,
  .detail-summary {
    grid-template-columns: 1fr;
  }

  .order-page-header,
  .order-detail-header,
  .order-table-toolbar {
    align-items: stretch;
    flex-direction: column;
  }

  .order-query-actions,
  .order-pagination-bar {
    justify-content: flex-start;
  }
}
</style>

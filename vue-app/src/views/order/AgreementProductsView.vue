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
import { AGREEMENT_PRODUCT_TABS, normalizeAgreementProductTab, queryAgreementProducts } from '@/services/agreementProducts'
import { showWorkbenchToast } from '@/services/toast'
import { useAppStore } from '@/stores/app'

type ProductTab = (typeof AGREEMENT_PRODUCT_TABS)[number]['key']
type ProductFilters = {
  projectNo: string
  name: string
  productStatus: string
  publishedStart: string
  publishedEnd: string
  expiresStart: string
  expiresEnd: string
}

const PAGE_ID = 'sales.agreementProducts'
const PAGE_SIZE = 6
const route = useRoute()
const router = useRouter()
const appStore = useAppStore()
const currentPage = ref(1)
const isTab = (value: unknown): value is ProductTab => AGREEMENT_PRODUCT_TABS.some(tab => tab.key === value)
const activeTab = ref<ProductTab>(normalizeAgreementProductTab(route.query.tab) as ProductTab)

const emptyFilters = (): ProductFilters => ({
  projectNo: '',
  name: '',
  productStatus: '全部',
  publishedStart: '',
  publishedEnd: '',
  expiresStart: '',
  expiresEnd: ''
})
const draftFilters = reactive<ProductFilters>(emptyFilters())
const appliedFilters = ref<ProductFilters>(emptyFilters())
const result = computed(() => queryAgreementProducts({
  tab: activeTab.value,
  filters: appliedFilters.value,
  page: currentPage.value,
  pageSize: PAGE_SIZE
}))
const hasAppliedFilters = computed(() => Object.entries(appliedFilters.value).some(([, value]) => value && value !== '全部'))
const tabItems = computed(() => AGREEMENT_PRODUCT_TABS.map(tab => ({
  ...tab,
  count: queryAgreementProducts({ tab: tab.key, filters: appliedFilters.value }).total
})))
const activeTabLabel = computed(() => AGREEMENT_PRODUCT_TABS.find(tab => tab.key === activeTab.value)?.label || '全部产品')
const publishedDateError = computed(() => result.value.error.startsWith('发布') ? result.value.error : '')
const expiresDateError = computed(() => result.value.error.startsWith('过期') ? result.value.error : '')

const columns = [
  { key: 'projectNo', label: '立项编号', width: '130px' },
  { key: 'publishedAt', label: '发布时间', width: '110px' },
  { key: 'validity', label: '有效期', width: '210px' },
  { key: 'customer', label: '客户名称', width: '210px' },
  { key: 'customerType', label: '客户类型', width: '90px' },
  { key: 'productName', label: '产品名称', width: '190px' },
  { key: 'configuration', label: '配置信息', width: '190px' },
  { key: 'productStatus', label: '产品状态', width: '110px' },
  { key: 'productCode', label: '产品编号（CTO/MTM）', width: '170px' },
  { key: 'lastOrderAt', label: '最后一次下单时间', width: '170px' },
  { key: 'stock', label: '剩余 / 全部', width: '110px' }
]

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
  router.replace({ query: { ...route.query, tab: key === 'all' ? undefined : key } })
}

function proxyOrder() {
  showWorkbenchToast('代客下单能力待接入业务系统；当前未创建真实订单。')
}

function statusTone(status: string) {
  if (['在售', '已下单'].includes(status)) return 'success'
  if (status === '缺货下架') return 'danger'
  if (['即将过期', '待追加'].includes(status)) return 'warning'
  return 'neutral'
}

watch([() => route.meta.pageId, () => route.query.tab], ([pageId, value]) => {
  if (pageId !== PAGE_ID) return
  const next = normalizeAgreementProductTab(value) as ProductTab
  if (next !== activeTab.value) {
    activeTab.value = next
    currentPage.value = 1
  }
})

onMounted(() => appStore.ensureStaticTab(PAGE_ID))
</script>

<template>
  <section class="agreement-products-page">
    <ContentPageHeader title="协议产品查询" description="按生命周期、客户与有效期查询可销售的协议产品。">
      <template #actions><button class="btn btn-primary" type="button" @click="proxyOrder">代客下单</button></template>
    </ContentPageHeader>

    <div class="sales-demo-notice" role="note">当前为本地演示协议产品；查询和代客下单不会写入业务系统。</div>

    <div class="agreement-products-workspace">
      <form class="sales-filter-grid" aria-label="协议产品查询" @submit.prevent="applyFilters">
        <FilterField layout="placeholder" label="立项编号">
          <input v-model="draftFilters.projectNo" type="search" placeholder="立项编号" autocomplete="off" />
        </FilterField>
        <FilterField layout="placeholder" label="产品状态">
          <select v-model="draftFilters.productStatus" aria-label="产品状态">
            <option value="全部">产品状态 - 全部</option>
            <option value="在售">产品状态 - 在售</option>
            <option value="缺货下架">产品状态 - 缺货下架</option>
            <option value="即将过期">产品状态 - 即将过期</option>
            <option value="待追加">产品状态 - 待追加</option>
            <option value="已下单">产品状态 - 已下单</option>
          </select>
        </FilterField>
        <FilterField layout="placeholder" label="名称查询" class="agreement-product-filter__name">
          <input v-model="draftFilters.name" type="search" placeholder="客户名称 / 产品名称 / 产品编号 / 配置信息" autocomplete="off" />
        </FilterField>
        <FilterField layout="placeholder" label="发布时间" group class="sales-filter-grid__range">
          <div class="sales-date-range" role="group" aria-label="发布时间">
            <span class="filter-date-control" :class="{ 'is-empty': !draftFilters.publishedStart }"><input v-model="draftFilters.publishedStart" type="date" aria-label="发布时间开始" :aria-invalid="Boolean(publishedDateError)" :aria-describedby="publishedDateError ? 'agreement-products-published-date-error' : undefined" /><span v-if="!draftFilters.publishedStart" class="filter-date-placeholder" aria-hidden="true">发布时间开始</span></span>
            <span aria-hidden="true">至</span>
            <span class="filter-date-control" :class="{ 'is-empty': !draftFilters.publishedEnd }"><input v-model="draftFilters.publishedEnd" type="date" aria-label="发布时间结束" :aria-invalid="Boolean(publishedDateError)" :aria-describedby="publishedDateError ? 'agreement-products-published-date-error' : undefined" /><span v-if="!draftFilters.publishedEnd" class="filter-date-placeholder" aria-hidden="true">发布时间结束</span></span>
          </div>
          <p v-if="publishedDateError" id="agreement-products-published-date-error" class="sales-filter-error" role="alert">{{ publishedDateError }}</p>
        </FilterField>
        <FilterField layout="placeholder" label="过期时间" group class="sales-filter-grid__range">
          <div class="sales-date-range" role="group" aria-label="过期时间">
            <span class="filter-date-control" :class="{ 'is-empty': !draftFilters.expiresStart }"><input v-model="draftFilters.expiresStart" type="date" aria-label="过期开始日期" :aria-invalid="Boolean(expiresDateError)" :aria-describedby="expiresDateError ? 'agreement-products-expires-date-error' : undefined" /><span v-if="!draftFilters.expiresStart" class="filter-date-placeholder" aria-hidden="true">过期开始日期</span></span>
            <span aria-hidden="true">至</span>
            <span class="filter-date-control" :class="{ 'is-empty': !draftFilters.expiresEnd }"><input v-model="draftFilters.expiresEnd" type="date" aria-label="过期结束日期" :aria-invalid="Boolean(expiresDateError)" :aria-describedby="expiresDateError ? 'agreement-products-expires-date-error' : undefined" /><span v-if="!draftFilters.expiresEnd" class="filter-date-placeholder" aria-hidden="true">过期结束日期</span></span>
          </div>
          <p v-if="expiresDateError" id="agreement-products-expires-date-error" class="sales-filter-error" role="alert">{{ expiresDateError }}</p>
        </FilterField>
        <div class="sales-filter-actions">
          <button class="btn btn-primary" type="submit">查询</button>
          <button class="btn btn-secondary" type="button" @click="resetFilters">重置</button>
        </div>
      </form>

      <ListSurface :state="result.error ? 'error' : result.total ? 'data' : 'empty'">
        <template #tabs><ContentTabs :items="tabItems" :model-value="activeTab" label="协议产品状态" @update:model-value="changeTab" /></template>
        <template #toolbar><strong>{{ activeTabLabel }}</strong><span class="sales-result-count">当前筛选共 {{ result.total }} 条</span></template>
        <FeedbackState v-if="result.error" state="error" title="日期范围无效" :description="result.error" />
        <FeedbackState v-else-if="!result.total" :state="hasAppliedFilters ? 'filtered-empty' : 'empty'" title="没有符合条件的协议产品" description="请调整查询条件后重试。" />
        <DataTable v-else :columns="columns" :rows="result.items" row-key="projectNo" caption="协议产品列表" density="compact">
          <template #cell-validity="{ row }">{{ row.validFrom }} 至 {{ row.expiresAt }}</template>
          <template #cell-customer="{ row }"><strong>{{ row.customer }}</strong></template>
          <template #cell-productName="{ row }"><strong>{{ row.productName }}</strong></template>
          <template #cell-productStatus="{ row }"><StatusTag :tone="statusTone(row.productStatus)">{{ row.productStatus }}</StatusTag></template>
        </DataTable>
        <template #pagination><Pagination v-model:page="currentPage" :page-size="PAGE_SIZE" :total="result.total" /></template>
      </ListSurface>
    </div>
  </section>
</template>

<style scoped>
.agreement-products-page { display: grid; gap: var(--space-4, 16px); min-width: 0; overflow-x: clip; }
.agreement-products-workspace { display: grid; gap: var(--space-3, 12px); min-width: 0; }
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
.agreement-products-page :deep([data-column='customer']) strong,
.agreement-products-page :deep([data-column='productName']) strong { display: block; }
@container (min-width: 720px) { .sales-filter-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); } .sales-filter-grid__range { grid-column: span 2; } }
@container (min-width: 1040px) { .sales-filter-grid { grid-template-columns: repeat(4, minmax(0, 1fr)); } .agreement-product-filter__name { grid-column: span 2; } }
</style>

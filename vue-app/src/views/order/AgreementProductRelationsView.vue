<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import ContentPageHeader from '@/components/content/ContentPageHeader.vue'
import FeedbackState from '@/components/content/FeedbackState.vue'
import FilterField from '@/components/content/FilterField.vue'
import ListSurface from '@/components/content/ListSurface.vue'
import { AGREEMENT_PRODUCT_RELATIONS, filterAgreementProductRelations, validateAgreementGroup } from '@/services/agreementProductRelations'
import { showWorkbenchToast } from '@/services/toast'
import { useAppStore } from '@/stores/app'

type BindingRelation = 'none' | 'strong' | 'soft'
type Product = {
  id: string
  name: string
  quantity: number
  materialGroup: string
  role: string
  relation: BindingRelation
  bindingRatio: string
  parentId: string
}
type AgreementGroup = { date: string; no: string; name: string; products: Product[] }
type RowErrors = Record<string, { bindingRatio?: string; parentId?: string }>

const PAGE_ID = 'sales.agreementProductRelations'
const appStore = useAppStore()
const groups = ref<AgreementGroup[]>(structuredClone(AGREEMENT_PRODUCT_RELATIONS) as AgreementGroup[])
const queryDraft = ref('')
const appliedQuery = ref('')
const errors = reactive<Record<string, RowErrors>>({})
const savedGroups = ref(new Set<string>())
const filteredGroups = computed(() => filterAgreementProductRelations(appliedQuery.value, groups.value) as AgreementGroup[])

function applyQuery() {
  appliedQuery.value = queryDraft.value
}

function resetQuery() {
  queryDraft.value = ''
  appliedQuery.value = ''
}

function mainProducts(group: AgreementGroup) {
  return group.products.filter(product => product.role === '主品')
}

function invalidateGroup(group: AgreementGroup) {
  savedGroups.value = new Set([...savedGroups.value].filter(groupNo => groupNo !== group.no))
}

function editorChanged(group: AgreementGroup, product: Product) {
  invalidateGroup(group)
  const groupErrors = errors[group.no]
  if (groupErrors) delete groupErrors[product.id]
}

function relationChanged(group: AgreementGroup, product: Product) {
  if (product.relation === 'none') {
    product.bindingRatio = '0'
    product.parentId = ''
  }
  editorChanged(group, product)
}

function confirmBinding(group: AgreementGroup) {
  const nextErrors = validateAgreementGroup(group) as RowErrors
  errors[group.no] = nextErrors
  if (Object.keys(nextErrors).length) {
    invalidateGroup(group)
    return
  }

  savedGroups.value = new Set(savedGroups.value).add(group.no)
  showWorkbenchToast(`绑定关系已在本地预览中确认：${group.no}`)
}

onMounted(() => appStore.ensureStaticTab(PAGE_ID))
</script>

<template>
  <section class="agreement-relations-page">
    <ContentPageHeader title="协议产品关系维护" description="维护协议产品的主品、服务商品与捆绑比例。" />

    <div class="sales-demo-notice" role="note">当前为离线演示数据。确认绑定只更新本页状态，不会写入业务系统。</div>

    <div class="agreement-relations-workspace">
      <form class="agreement-relations-filter" aria-label="协议产品关系查询" @submit.prevent="applyQuery">
        <FilterField layout="placeholder" label="协议或产品查询">
          <input v-model="queryDraft" type="search" placeholder="协议编号、协议名称、产品标识或产品名称" autocomplete="off" />
        </FilterField>
        <div class="sales-filter-actions">
          <button class="btn btn-primary" type="submit">查询</button>
          <button class="btn btn-secondary" type="button" @click="resetQuery">重置</button>
        </div>
      </form>

      <FeedbackState v-if="!filteredGroups.length" state="filtered-empty" title="没有符合条件的协议产品" description="请调整协议编号、名称或产品关键词后重试。" />

      <ListSurface v-for="group in filteredGroups" v-else :key="group.no">
        <template #toolbar>
          <div class="agreement-group-toolbar">
            <div><strong>{{ group.name }}</strong><span>{{ group.no }} · {{ group.date }}</span></div>
            <span v-if="savedGroups.has(group.no)" class="agreement-saved-state" role="status">本地已确认</span>
          </div>
        </template>
        <div class="agreement-table-wrap">
          <table class="agreement-table">
            <caption class="cs-sr-only">{{ group.name }} 产品关系</caption>
            <thead><tr><th scope="col">产品标识（ID）</th><th scope="col">产品名称</th><th scope="col">产品数量</th><th scope="col">物料产品组</th><th scope="col">绑定关系</th><th scope="col">捆绑比例</th><th scope="col">主品产品标识（ID）</th></tr></thead>
            <tbody>
              <tr v-for="product in group.products" :key="product.id">
                <td>{{ product.id }}</td>
                <td><strong>{{ product.name }}</strong><small>{{ product.role }}</small></td>
                <td>{{ product.quantity }}</td>
                <td>{{ product.materialGroup }}</td>
                <td>
                  <select v-model="product.relation" :aria-label="`绑定关系：${product.name}`" @change="relationChanged(group, product)">
                    <option value="none">无绑定关系</option>
                    <option value="strong">强绑</option>
                    <option value="soft">非强绑</option>
                  </select>
                </td>
                <td>
                  <div class="agreement-ratio"><span>1 :</span><input v-model="product.bindingRatio" inputmode="numeric" :disabled="product.relation === 'none'" :aria-label="`捆绑比例：${product.name}`" :aria-invalid="Boolean(errors[group.no]?.[product.id]?.bindingRatio)" @input="editorChanged(group, product)" /></div>
                  <p v-if="errors[group.no]?.[product.id]?.bindingRatio" class="agreement-field-error" role="alert">{{ errors[group.no][product.id].bindingRatio }}</p>
                </td>
                <td>
                  <input v-model="product.parentId" :list="`agreement-main-products-${group.no}`" :disabled="product.relation === 'none'" :aria-label="`主品产品标识：${product.name}`" :aria-invalid="Boolean(errors[group.no]?.[product.id]?.parentId)" placeholder="主品产品标识" @input="editorChanged(group, product)" />
                  <p v-if="errors[group.no]?.[product.id]?.parentId" class="agreement-field-error" role="alert">{{ errors[group.no][product.id].parentId }}</p>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        <template #pagination>
          <div class="agreement-confirm-row"><span>共 {{ group.products.length }} 个产品</span><button class="btn btn-primary" type="button" @click="confirmBinding(group)">确认绑定</button></div>
        </template>
        <datalist :id="`agreement-main-products-${group.no}`">
          <template v-for="mainProduct in mainProducts(group)" :key="mainProduct.id"><option :value="mainProduct.id">{{ mainProduct.name }}</option></template>
        </datalist>
      </ListSurface>
    </div>
  </section>
</template>

<style scoped>
.agreement-relations-page { display: grid; gap: var(--space-4, 16px); min-width: 0; overflow-x: clip; }
.agreement-relations-workspace { display: grid; gap: var(--space-3, 12px); min-width: 0; }
.sales-demo-notice { padding: var(--space-3, 12px) var(--space-4, 16px); border: 1px solid var(--color-primary-border); border-radius: var(--radius-md); background: var(--color-primary-subtle); color: var(--color-text-secondary); }
.agreement-relations-filter { display: grid; grid-template-columns: minmax(0, 1fr) auto; gap: var(--space-3, 12px); align-items: start; }
.sales-filter-actions { display: flex; gap: var(--space-2, 8px); }
.sales-filter-actions .btn { min-height: var(--control-height-md, 36px); }
.agreement-group-toolbar { display: flex; align-items: center; justify-content: space-between; gap: var(--space-3, 12px); }
.agreement-group-toolbar div { display: grid; gap: var(--space-1, 4px); }
.agreement-group-toolbar span { color: var(--color-text-tertiary); font-size: var(--text-xs, 12px); }
.agreement-saved-state { color: var(--color-success) !important; }
.agreement-table-wrap { min-width: 0; overflow-x: auto; }
.agreement-table { width: 100%; min-width: 980px; border-collapse: separate; border-spacing: 0; color: var(--color-text); font-size: var(--text-sm, 13px); }
.agreement-table th,
.agreement-table td { padding: var(--space-2, 8px) var(--space-3, 12px); border-bottom: 1px solid var(--color-border-subtle); text-align: left; vertical-align: top; }
.agreement-table th { height: 40px; background: var(--color-surface-subtle); color: var(--color-text-secondary); font-size: var(--text-xs, 12px); white-space: nowrap; }
.agreement-table tr:last-child td { border-bottom: 0; }
.agreement-table td strong,
.agreement-table td small { display: block; }
.agreement-table td small { margin-top: var(--space-1, 4px); color: var(--color-text-tertiary); }
.agreement-table input,
.agreement-table select { box-sizing: border-box; width: 100%; min-width: 140px; height: var(--control-height-md, 36px); padding: 0 var(--space-3, 12px); border: 1px solid var(--color-border); border-radius: var(--radius-md); background: var(--color-surface); color: var(--color-text); font: inherit; }
.agreement-table input:focus,
.agreement-table select:focus { border-color: var(--color-primary); outline: 0; box-shadow: 0 0 0 2px var(--color-primary-subtle); }
.agreement-table input:disabled { background: var(--color-surface-subtle); color: var(--color-text-tertiary); }
.agreement-ratio { display: grid; grid-template-columns: auto minmax(0, 1fr); gap: var(--space-2, 8px); align-items: center; }
.agreement-field-error { margin: var(--space-1, 4px) 0 0; color: var(--color-danger); font-size: var(--text-xs, 12px); }
.agreement-confirm-row { display: flex; align-items: center; justify-content: space-between; gap: var(--space-3, 12px); color: var(--color-text-secondary); }
.cs-sr-only { position: absolute; width: 1px; height: 1px; overflow: hidden; clip-path: inset(50%); white-space: nowrap; }
@container (max-width: 719px) { .agreement-relations-filter { grid-template-columns: minmax(0, 1fr); } .sales-filter-actions { flex-wrap: wrap; } }
</style>

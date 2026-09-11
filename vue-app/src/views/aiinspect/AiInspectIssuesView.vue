<script setup lang="ts">
import { computed, onActivated, onMounted, reactive, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import { useAppStore } from '@/stores/app'
import ContentPageHeader from '@/components/content/ContentPageHeader.vue'
import {
  workOrders as seedOrders,
  aiSummary,
  DIMENSIONS,
  type WorkOrder,
  levelColorTone,
  statusColorTone,
  formatDuration,
  durationTone
} from '@/services/aiInspect'
import AiBadge from '@/components/aiinspect/AiBadge.vue'
import AiModal from '@/components/aiinspect/AiModal.vue'

const route = useRoute()
const appStore = useAppStore()
const orders = ref<WorkOrder[]>([...seedOrders])

const statusOptions = ['全部状态', '未解决（待处理+处理中）', '待处理', '处理中', '已解决']
const levelOptions = ['全部等级', '严重', '警告', '提示']
const pageOptions = computed(() => ['全部页面', ...Array.from(new Set(orders.value.map((o) => o.page)))])
const dimensionOptions = ['全部类型', ...DIMENSIONS]

const filters = reactive({
  status: '全部状态',
  level: '全部等级',
  page: '全部页面',
  dimension: '全部类型'
})

const selectedIds = ref<string[]>([])
const detail = ref<WorkOrder | null>(null)
const showDetail = ref(false)
const ownerInput = ref('')
const conclusion = ref('')

function applyQuery() {
  resetFilters()
  const q = route.query
  if (typeof q.status === 'string') {
    if (q.status.includes('待处理') && q.status.includes('处理中')) filters.status = '未解决（待处理+处理中）'
    else if (q.status.includes('已解决')) filters.status = '已解决'
    else if (q.status.includes('待处理')) filters.status = '待处理'
    else if (q.status.includes('处理中')) filters.status = '处理中'
  }
  if (typeof q.level === 'string') filters.level = q.level
  if (typeof q.page === 'string') filters.page = q.page
  if (typeof q.dimension === 'string') filters.dimension = q.dimension
}

const filteredOrders = computed(() => {
  return orders.value.filter((o) => {
    if (filters.status !== '全部状态') {
      if (filters.status === '未解决（待处理+处理中）') {
        if (!(o.status === '待处理' || o.status === '处理中')) return false
      } else if (o.status !== filters.status) return false
    }
    if (filters.level !== '全部等级' && o.level !== filters.level) return false
    if (filters.page !== '全部页面' && o.page !== filters.page) return false
    if (filters.dimension !== '全部类型') {
      const hit = o.modules.some((m) => m.problems.some((p) => p.dimension === filters.dimension))
      if (!hit) return false
    }
    return true
  })
})

const allSelected = computed(
  () => filteredOrders.value.length > 0 && filteredOrders.value.every((o) => selectedIds.value.includes(o.id))
)
function toggleAll(e: Event) {
  const checked = (e.target as HTMLInputElement).checked
  selectedIds.value = checked ? filteredOrders.value.map((o) => o.id) : []
}
function toggleOne(id: string) {
  const idx = selectedIds.value.indexOf(id)
  if (idx >= 0) selectedIds.value.splice(idx, 1)
  else selectedIds.value.push(id)
}

function resetFilters() {
  filters.status = '全部状态'
  filters.level = '全部等级'
  filters.page = '全部页面'
  filters.dimension = '全部类型'
}

function copySummary() {
  const text = `${aiSummary.overview}\n${aiSummary.distribution}\n${aiSummary.suggestion}`
  navigator.clipboard?.writeText(text).then(
    () => appStore.notify('AI 巡检总览已复制'),
    () => appStore.notify('复制失败，请手动复制')
  )
}

function openDetail(order: WorkOrder) {
  detail.value = order
  ownerInput.value = order.owner || ''
  conclusion.value = ''
  showDetail.value = true
}
function closeDetail() {
  showDetail.value = false
}

function recheck(order: WorkOrder) {
  const hasSevere = order.modules.some((m) => m.problems.some((p) => p.level === '严重'))
  order.lastRecheck = { time: '2026-08-26 15:10', result: hasSevere ? '未通过' : '通过' }
  order.status = hasSevere ? '处理中' : '已解决'
  appStore.notify(`工单 ${order.id} 复检完成：${hasSevere ? '未通过 → 处理中' : '通过 → 已解决'}`)
}

function markResolved(order: WorkOrder) {
  if (!window.confirm(`确认将工单 ${order.id} 标记为已解决？`)) return
  order.status = '已解决'
  closeDetail()
  appStore.notify(`工单 ${order.id} 已标记为已解决`)
}

function batchRecheck() {
  if (!window.confirm(`确认对选中的 ${selectedIds.value.length} 个工单执行批量复检？`)) return
  let ok = 0
  selectedIds.value.forEach((id) => {
    const o = orders.value.find((x) => x.id === id)
    if (o) {
      recheck(o)
      ok++
    }
  })
  appStore.notify(`批量复检完成：${ok} 个成功`)
  selectedIds.value = []
}

function batchClose() {
  if (!window.confirm(`确认将选中的 ${selectedIds.value.length} 个工单批量关闭（标记已解决）？`)) return
  selectedIds.value.forEach((id) => {
    const o = orders.value.find((x) => x.id === id)
    if (o) o.status = '已解决'
  })
  appStore.notify(`已批量关闭 ${selectedIds.value.length} 个工单`)
  selectedIds.value = []
}

// 模拟截图：模块故障框布局
const screenshotBlocks = computed(() => {
  if (!detail.value) return []
  const cols = 2
  const cardW = 176
  const cardH = 92
  const gapX = 16
  const gapY = 16
  const offsetX = 14
  const offsetY = 54
  return detail.value.modules.map((m, i) => {
    const hasSevere = m.problems.some((p) => p.level === '严重')
    const col = i % cols
    const row = Math.floor(i / cols)
    return {
      x: offsetX + col * (cardW + gapX),
      y: offsetY + row * (cardH + gapY),
      w: cardW,
      h: cardH,
      label: `M${i + 1} ${m.name.replace('模块', '')}`,
      severe: hasSevere
    }
  })
})

function syncRouteFilters() {
  if (route.path !== '/aiinspect/issues') return
  selectedIds.value = []
  applyQuery()
}

watch(() => route.fullPath, syncRouteFilters, { immediate: true })
onActivated(syncRouteFilters)

onMounted(() => {
  appStore.ensureStaticTab('aiinspect.issues')
  appStore.setActiveStaticTab('aiinspect.issues')
  document.title = 'AI 巡检 · 问题处理'
})
</script>

<template>
  <div class="ai-issues">
    <ContentPageHeader class="inspect-page-header" title="问题处理" description="巡检异常集中处理入口" />

    <!-- AI 总览摘要 -->
    <div class="ai-summary inspect-surface">
      <div class="ai-summary__head">
        <span class="ai-summary__title">AI 巡检总览摘要</span>
        <button class="btn btn-sm btn-secondary" type="button" @click="copySummary">一键复制</button>
      </div>
      <p>{{ aiSummary.overview }}</p>
      <p>{{ aiSummary.distribution }}</p>
      <p class="ai-summary__suggest">{{ aiSummary.suggestion }}</p>
    </div>

    <!-- 筛选条 -->
    <div class="ai-filterbar">
      <select v-model="filters.status" class="ai-select">
        <option v-for="opt in statusOptions" :key="opt" :value="opt">{{ opt }}</option>
      </select>
      <select v-model="filters.level" class="ai-select">
        <option v-for="opt in levelOptions" :key="opt" :value="opt">{{ opt }}</option>
      </select>
      <select v-model="filters.page" class="ai-select">
        <option v-for="opt in pageOptions" :key="opt" :value="opt">{{ opt }}</option>
      </select>
      <select v-model="filters.dimension" class="ai-select">
        <option v-for="opt in dimensionOptions" :key="opt" :value="opt">{{ opt }}</option>
      </select>
      <button class="btn btn-sm btn-secondary" type="button" @click="resetFilters">重置筛选</button>
      <span class="ai-filter-count">
        {{ filteredOrders.length ? `共 ${filteredOrders.length} 条问题` : '无匹配问题' }}
      </span>

      <div v-if="selectedIds.length" class="ai-batch">
        <span class="ai-batch__count">已选 {{ selectedIds.length }} 项</span>
        <button class="btn btn-sm btn-secondary" type="button" @click="batchRecheck">批量复检</button>
        <button class="btn btn-sm btn-secondary" type="button" @click="batchClose">批量关闭</button>
      </div>
    </div>

    <!-- 工单列表 -->
    <div class="inspect-surface">
      <div class="ai-table-scroll" role="region" aria-label="巡检数据表格" tabindex="0">
        <table class="ai-table">
          <thead>
            <tr>
              <th class="ai-col-check"><input type="checkbox" :checked="allSelected" @change="toggleAll" aria-label="全选" /></th>
              <th>问题</th>
              <th>页面 / 位置</th>
              <th>等级</th>
              <th>问题项</th>
              <th>负责人</th>
              <th>状态</th>
              <th>存在时长</th>
              <th>上次复检</th>
              <th class="ai-col-actions">操作</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="o in filteredOrders" :key="o.id">
              <td class="ai-col-check"><input type="checkbox" :checked="selectedIds.includes(o.id)" @change="toggleOne(o.id)" :aria-label="`选择 ${o.id}`" /></td>
              <td class="ai-mono">{{ o.id }}</td>
              <td>
                <div class="ai-cell-strong">{{ o.page }}</div>
                <div class="ai-cell-sub">{{ o.location }}</div>
              </td>
              <td><AiBadge :tone="levelColorTone(o.level)" :label="o.level" /></td>
              <td>
                <div>{{ o.issueSummary }}</div>
                <div class="ai-cell-sub" v-if="o.issueCount > 1">+{{ o.issueCount - 1 }} 项</div>
              </td>
              <td>
                <AiBadge v-if="o.owner" tone="green" :label="o.owner" />
                <span v-else class="ai-unassigned">未指派</span>
              </td>
              <td><AiBadge :tone="statusColorTone(o.status)" :label="o.status" dot /></td>
              <td :class="durationTone(o.durationMin) === 'orange' ? 'ai-duration-warn' : 'ai-duration-gray'">{{ formatDuration(o.durationMin) }}</td>
              <td>
                <template v-if="o.lastRecheck">
                  <div class="ai-cell-sub">{{ o.lastRecheck.time }}</div>
                  <AiBadge
                    :tone="o.lastRecheck.result === '通过' ? 'green' : o.lastRecheck.result === '未通过' ? 'orange' : 'red'"
                    :label="o.lastRecheck.result"
                  />
                </template>
                <span v-else class="ai-cell-sub">—</span>
              </td>
              <td class="ai-col-actions">
                <button class="btn btn-sm btn-secondary" type="button" @click="recheck(o)">复检</button>
                <button v-if="o.status !== '已解决'" class="btn btn-sm btn-secondary" type="button" @click="markResolved(o)">已解决</button>
                <button class="btn btn-sm btn-primary" type="button" @click="openDetail(o)">查看</button>
              </td>
            </tr>
            <tr v-if="!filteredOrders.length">
              <td colspan="10" class="ai-empty">无匹配问题</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- 工单详情弹窗 -->
    <AiModal v-model="showDetail" :title="detail ? `工单详情 ${detail.id}` : ''" width="720px">
      <template v-if="detail">
        <section class="ai-detail-block">
          <h4 class="ai-detail-title">基础信息</h4>
          <div class="ai-info-grid">
            <div><span>所属页面</span><b>{{ detail.page }}</b></div>
            <div><span>涉及模块</span><b>{{ detail.modules.map((m) => m.name).join('、') }}</b></div>
            <div><span>页面 URL</span><a :href="detail.url" target="_blank" rel="noreferrer">{{ detail.url }}</a></div>
            <div><span>问题分类</span><b>{{ detail.category }}</b></div>
            <div><span>检测方式</span><b>{{ detail.method }}</b></div>
            <div><span>负责人</span><b>{{ detail.owner || '未指派' }}</b></div>
            <div><span>发现时间</span><b>{{ detail.createdAt }}</b></div>
            <div><span>问题状态</span><AiBadge :tone="statusColorTone(detail.status)" :label="detail.status" /></div>
          </div>
        </section>

        <section class="ai-detail-block">
          <h4 class="ai-detail-title">故障定位（模拟截图）</h4>
          <div class="ai-mock">
            <svg viewBox="0 0 392 230" class="ai-mock__svg" role="img" aria-label="页面模拟截图">
              <rect x="6" y="6" width="380" height="218" rx="8" fill="var(--color-bg)" stroke="var(--color-border-subtle)" />
              <rect x="14" y="14" width="364" height="28" rx="4" fill="var(--color-border-subtle)" />
              <text x="20" y="33" font-size="11" fill="var(--color-text-tertiary)">页面模拟截图 · 红框=严重 / 橙框=警告</text>
              <g v-for="(b, i) in screenshotBlocks" :key="i">
                <rect :x="b.x" :y="b.y" :width="b.w" :height="b.h" rx="6" fill="var(--color-surface)" :stroke="b.severe ? 'var(--color-danger)' : 'var(--color-warning)'" stroke-width="2" />
                <text :x="b.x + 10" :y="b.y + 20" font-size="11" :fill="b.severe ? 'var(--color-danger)' : 'var(--color-warning)'" font-weight="600">{{ b.label }}</text>
              </g>
            </svg>
          </div>
        </section>

        <section class="ai-detail-block">
          <h4 class="ai-detail-title">问题明细（按模块）</h4>
          <div v-for="(m, i) in detail.modules" :key="i" class="ai-module-card">
            <div class="ai-module-card__head">
              <span class="ai-module-tag">M{{ i + 1 }} {{ m.name }}</span>
              <AiBadge tone="purple" :label="`${m.problems.length} 项`" />
            </div>
            <ul class="ai-problem-list">
              <li v-for="(p, j) in m.problems" :key="j">
                <AiBadge :tone="levelColorTone(p.level)" :label="p.level" />
                <span class="ai-problem-dim">{{ p.dimension }}</span>
                <span class="ai-problem-msg">{{ p.message }}</span>
              </li>
            </ul>
          </div>
        </section>

        <section class="ai-detail-block">
          <h4 class="ai-detail-title">修改建议（AI 生成）</h4>
          <ul class="ai-suggest-list">
            <li v-for="(m, i) in detail.modules" :key="i"><b>{{ m.name }}：</b>{{ m.suggestion }}</li>
          </ul>
        </section>

        <section class="ai-detail-block">
          <h4 class="ai-detail-title">处理信息</h4>
          <div class="ai-field">
            <label>处理负责人</label>
            <input v-model="ownerInput" class="inspect-input" placeholder="填写处理负责人" />
          </div>
          <div class="ai-field">
            <label>处理结论 / 闭环备注</label>
            <textarea v-model="conclusion" class="inspect-input" rows="2" placeholder="填写处理结论或闭环备注" />
          </div>
        </section>
      </template>

      <template #footer>
        <button class="btn btn-secondary" type="button" @click="closeDetail">关闭</button>
        <button v-if="detail && detail.status !== '已解决'" class="btn btn-secondary" type="button" @click="detail && recheck(detail)">复检</button>
        <button v-if="detail && detail.status !== '已解决'" class="btn btn-primary" type="button" @click="detail && markResolved(detail)">标记已解决</button>
      </template>
    </AiModal>
  </div>
</template>

<style scoped>
.ai-issues { display: flex; flex-direction: column; gap: 16px; width: 100%; min-width: 0; container-type: inline-size; container-name: ai-inspect-page; }
.ai-issues > * { min-width: 0; }
.inspect-surface { background: var(--color-surface); border: 1px solid var(--color-border-subtle); border-radius: var(--radius-lg); padding: 16px 20px; min-width: 0; }
.ai-table-scroll { width: 100%; max-width: 100%; overflow-x: auto; overscroll-behavior-x: contain; }
.ai-table-scroll:focus-visible { outline: 2px solid var(--color-primary); outline-offset: 2px; }

.ai-summary p { margin: 0 0 8px; font-size: 13px; color: var(--color-text); line-height: 1.7; }
.ai-summary__head { display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; }
.ai-summary__title { font-size: 14px; font-weight: 600; }
.ai-summary__suggest { color: var(--color-text-secondary); }

.ai-filterbar { display: flex; flex-wrap: wrap; align-items: center; gap: 12px; }
.ai-select { min-height: 36px; max-width: 100%; padding: 8px 12px; border: 1px solid var(--color-border); border-radius: var(--radius-md); font-size: 13px; background: var(--color-surface); color: var(--color-text); }
.ai-filter-count { font-size: 12px; color: var(--color-text-tertiary); margin-left: auto; }
.ai-batch { display: flex; align-items: center; gap: 8px; width: 100%; padding: 8px 12px; background: var(--color-primary-subtle); border-radius: var(--radius-md); }
.ai-batch__count { font-size: 12px; font-weight: 600; color: var(--color-primary); }

.ai-table { width: 100%; min-width: 1050px; border-collapse: collapse; font-size: 13px; }
.ai-table th { text-align: left; font-weight: 600; color: var(--color-text-tertiary); font-size: 12px; padding: 8px 12px; border-bottom: 1px solid var(--color-border-subtle); }
.ai-table td { padding: 12px; border-bottom: 1px solid var(--color-border-subtle); color: var(--color-text); vertical-align: middle; }
.ai-col-check { width: 36px; text-align: center; }
.ai-col-actions { text-align: right; white-space: nowrap; }
.ai-col-actions .btn { margin-left: 4px; }
.ai-mono { font-family: ui-monospace, SFMono-Regular, Menlo, monospace; color: var(--color-text-secondary); font-size: 12px; }
.ai-cell-strong { font-weight: 500; }
.ai-cell-sub { font-size: 12px; color: var(--color-text-tertiary); margin-top: 4px; }
.ai-unassigned { font-size: 12px; color: var(--color-text-tertiary); background: var(--color-bg); padding: 4px 8px; border-radius: 9999px; }
.ai-duration-warn { color: var(--color-warning); font-weight: 600; }
.ai-duration-gray { color: var(--color-text-tertiary); }
.ai-empty { text-align: center; color: var(--color-text-tertiary); padding: 32px 0; }

/* 详情弹窗 */
.ai-detail-block { margin-bottom: 20px; }
.ai-detail-title { font-size: 13px; font-weight: 600; color: var(--color-text); margin: 0 0 12px; padding-left: 8px; border-left: 3px solid var(--color-primary); }
.ai-info-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 12px 20px; }
.ai-info-grid > div { min-width: 0; display: flex; flex-direction: column; gap: 4px; font-size: 12px; }
.ai-info-grid > div > span:first-child { color: var(--color-text-tertiary); }
.ai-info-grid b { color: var(--color-text); font-weight: 500; }
.ai-info-grid a { color: var(--color-primary); font-size: 12px; word-break: break-all; }

.ai-mock { border: 1px solid var(--color-border-subtle); border-radius: var(--radius-md); overflow: hidden; }
.ai-mock__svg { width: 100%; height: auto; display: block; }

.ai-module-card { border: 1px solid var(--color-border-subtle); border-radius: var(--radius-md); padding: 12px 12px; margin-bottom: 12px; }
.ai-module-card__head { display: flex; align-items: center; justify-content: space-between; margin-bottom: 8px; }
.ai-module-tag { font-size: 13px; font-weight: 600; color: var(--color-text); }
.ai-problem-list { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 8px; }
.ai-problem-list li { display: flex; flex-wrap: wrap; align-items: center; gap: 8px; font-size: 12px; }
.ai-problem-dim { color: var(--color-text-secondary); font-weight: 500; }
.ai-problem-msg { color: var(--color-text); }
.ai-suggest-list { margin: 0; padding-left: 20px; font-size: 12px; line-height: 1.7; color: var(--color-text-secondary); }

.ai-field { margin-bottom: 12px; }
.ai-field label { display: block; font-size: 12px; color: var(--color-text-secondary); margin-bottom: 4px; }
.inspect-input { box-sizing: border-box; min-height: 36px; width: 100%; padding: 8px 12px; border: 1px solid var(--color-border); border-radius: var(--radius-md); font-size: 13px; background: var(--color-surface); color: var(--color-text); }
.inspect-input:focus { outline: none; border-color: var(--color-primary); box-shadow: 0 0 0 3px var(--color-primary-subtle); }

@container ai-inspect-modal (max-width: 479px) {
  .ai-info-grid { grid-template-columns: 1fr; }
}
@container ai-inspect-page (max-width: 719px) {
  .inspect-page-header { flex-direction: column; align-items: stretch; }
  .inspect-page-header :deep(.content-page-header__heading) { flex-basis: auto; }
  .inspect-page-header :deep(.content-page-header__actions) { justify-content: flex-start; }
}
</style>

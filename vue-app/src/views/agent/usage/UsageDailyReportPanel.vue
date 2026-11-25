<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue'
import SectionHeader from '@/components/content/SectionHeader.vue'
import FilterField from '@/components/content/FilterField.vue'
import DataTable from '@/components/content/DataTable.vue'
import ListSurface from '@/components/content/ListSurface.vue'
import Pagination from '@/components/content/Pagination.vue'
import FeedbackState from '@/components/content/FeedbackState.vue'
import UsageDailyDetails from './UsageDailyDetails.vue'
import UsageOverviewContent from './UsageOverviewContent.vue'
import { getDailyAnalysis, USAGE_DAILY_SOURCE, USAGE_DAILY_MODULES } from '@/domain/usageDailyReport.js'
import { EXCLUDED_USAGE_CREATOR_IDS } from '@/domain/usageSkillScope.js'

const props = defineProps<{ view: string; startDate: string; endDate: string; allowGlobal: boolean; currentCreatorId?: string | null; canOpenDetail: (dimension: 'skills' | 'creators', id: string) => boolean }>()
const emit = defineEmits<{ 'show-skills': []; 'show-creators': [] }>()
const filters = reactive({ skills: { module: 'all', search: '', page: 1, showAll: false }, creators: { module: 'all', search: '', page: 1, showAll: false } })
const activeFilters = computed(() => props.view === 'creators' ? filters.creators : filters.skills)
const module = computed({ get: () => activeFilters.value.module, set: value => { activeFilters.value.module = value } })
const search = computed({ get: () => activeFilters.value.search, set: value => { activeFilters.value.search = value } })
const page = computed({ get: () => activeFilters.value.page, set: value => { activeFilters.value.page = value } })
const showAll = computed({ get: () => activeFilters.value.showAll, set: value => { activeFilters.value.showAll = value } })
const detailTarget = ref<{ dimension: 'skills' | 'creators'; id: string } | null>(null)
const pageSize = 8
const creators = computed(() => props.view === 'creators')
const analysis = computed(() => getDailyAnalysis({ startDate: props.startDate, endDate: props.endDate, module: module.value, search: search.value, dimension: creators.value ? 'creators' : 'skills', creatorId: props.allowGlobal ? undefined : props.currentCreatorId || '__unauthorized__' }))
const rows = computed(() => creators.value ? analysis.value.creators : analysis.value.skills)
const pageRows = computed(() => showAll.value ? rows.value : rows.value.slice((page.value - 1) * pageSize, page.value * pageSize))
const n = (value: number | null | undefined) => value == null ? '—' : value.toLocaleString('zh-CN')
const rate = (value: number | null | undefined) => value == null ? '—' : `${(value * 100).toFixed(1)}%`
const numberColumn = (key: string, label: string) => ({ key, label, align: 'right' as const, width: '100px', format: (value: unknown) => n(typeof value === 'number' ? value : null) })
const columns = computed(() => [
  { key: 'name', label: creators.value ? '创建人 IT Code' : 'Skill', width: '240px' },
  ...(creators.value ? [numberColumn('createdSkills', '创建总量'), { ...numberColumn('calledSkills', '被调用Skill数'), width: '120px' }, { key: 'skillCallRate', label: 'Skill调用率', width: '110px', align: 'right' as const }] : [{ key: 'creator', label: '创建人', width: '140px' }, { key: 'module', label: '菜单', width: '130px' }, numberColumn('users', '当日使用人数')]),
  numberColumn('calls', '调用次数'),
  { key: 'outcomes', label: '成功 / 失败', align: 'right' as const, width: '110px' },
  { key: 'successRate', label: '执行成功率', align: 'right' as const, width: '92px' },
  { key: 'feedback', label: '赞 / 踩', align: 'right' as const, width: '92px' },
  { key: 'likeRate', label: '好评率', align: 'right' as const, width: '92px' },
  { key: 'actions', label: '操作', width: '100px' }
])
function reset() { module.value = 'all'; search.value = '' }
function toggleAll() { showAll.value = !showAll.value }
function openDetail(dimension: 'skills' | 'creators', id: string) { if (props.canOpenDetail(dimension, id)) detailTarget.value = { dimension, id } }
watch(() => [props.startDate, props.endDate, module.value, search.value], () => { page.value = 1; detailTarget.value = null })
watch(() => props.view, () => { detailTarget.value = null })
watch(() => [props.allowGlobal, props.currentCreatorId], () => { reset(); detailTarget.value = null; showAll.value = false })
</script>

<template>
  <div class="daily-panel">
    <p class="daily-source-note" data-flow-role="notice">Skill统计已剔除 {{ EXCLUDED_USAGE_CREATOR_IDS.join('、') }} 和未标注创建人关联的Skill，调用量、质量、排行、明细按同一范围重算。用户活跃、Query、任务及首字时长为独立的平台汇总。日报缺少完整的线上开启清单与创建归属，剔除后的Skill总量、新增及调用率暂不可得，显示“—”。</p>
    <UsageOverviewContent v-if="view === 'overview' || view === 'rankings'" source="daily" :start-date="startDate" :end-date="endDate" :allow-global="allowGlobal" :current-creator-id="currentCreatorId" @open-skill="openDetail('skills', $event)" @open-creator="openDetail('creators', $event)" @view-skills="emit('show-skills')" @view-creators="emit('show-creators')" />
    <template v-else-if="(view === 'skills' && allowGlobal) || view === 'creators'">
      <section class="daily-filter daily-surface" data-flow-role="filters" :aria-label="creators ? '日报创建人筛选' : '日报Skill筛选'">
        <FilterField :label="creators ? '搜索创建人' : '搜索Skill'"><input v-model="search" type="search" :placeholder="creators ? '创建人 IT Code' : 'Skill名称 / ID / 创建人'" /></FilterField>
        <FilterField label="所属菜单"><select v-model="module"><option value="all">全部菜单</option><option v-for="item in USAGE_DAILY_MODULES" :key="item" :value="item">{{ item }}</option></select></FilterField>
        <button type="button" class="btn btn-secondary" @click="reset">重置</button>
      </section>
      <p v-if="analysis.quality.detailCoveragePartial" class="daily-source-note" data-flow-role="notice">所选周期包含未提供 Skill 明细的日期。以下仅汇总 {{ analysis.quality.detailCoverageStart }} 至 {{ analysis.quality.detailCoverageEnd }} 内已有明细，未覆盖日期不当作零调用。</p>
      <p class="daily-muted" data-flow-role="notice">{{ creators ? '创建人数据为其创建 Skill 的使用贡献，不是本人调用。创建总量为本人名下线上开启的 Skill 数（含未调用），日报未提供完整开启清单，暂显示“—”；被调用Skill数按所选周期、菜单内调用大于0的Skill去重。Skill调用率=被调用Skill数÷创建总量，分母不可得时显示“—”。' : '使用人数仅在单天单个 Skill 可得；跨日无法去重时显示“—”。仅统计已明确创建人归属且未被剔除的Skill。' }}执行成功率与用户反馈分开展示，不合成为质量评分。</p>
      <ListSurface data-flow-role="list-workspace"><template #toolbar><SectionHeader :title="creators ? '创建人聚合明细' : 'Skill聚合明细'" :description="`当前筛选 ${rows.length} 条 · 仅含日报中已有的明细`"><template #actions><button v-if="rows.length > pageSize || showAll" type="button" class="btn btn-secondary" :aria-pressed="showAll" @click="toggleAll">{{ showAll ? '分页显示' : `查看全部（${rows.length}）` }}</button></template></SectionHeader></template>
        <DataTable v-if="rows.length" :columns="columns" :rows="pageRows" row-key="id" :caption="creators ? '创建人归属下Skill调用与质量统计' : 'Skill日统计按当前周期汇总'" density="two-line">
          <template #cell-name="{ row }"><div class="daily-name">{{ row.name }}</div><div v-if="!creators" class="daily-meta">{{ row.id }}</div></template>
          <template #cell-createdSkills="{ row }"><span title="日报未提供创建人全量Skill资产，线上开启Skill的创建总量暂不可得">{{ n(row.createdSkills) }}</span></template>
          <template #cell-skillCallRate="{ row }"><span title="周期被调用Skill数 ÷ 截止日创建总量；缺少全量资产时不估算">{{ rate(row.skillCallRate) }}</span></template>
          <template #cell-users="{ row }"><span :title="row.users == null ? '日报只有日去重人数，无法跨日去重' : '当天该Skill去重人数'">{{ n(row.users) }}</span></template>
          <template #cell-outcomes="{ row }">{{ n(row.success) }} / {{ n(row.failed) }}</template><template #cell-successRate="{ row }">{{ rate(row.successRate) }}</template><template #cell-feedback="{ row }">{{ n(row.likes) }} / {{ n(row.dislikes) }}</template><template #cell-likeRate="{ row }">{{ rate(row.likeRate) }}</template>
          <template #cell-actions="{ row }"><button type="button" class="daily-link" :aria-label="`查看${row.name}日报明细`" @click="openDetail(creators ? 'creators' : 'skills', row.id)">查看明细</button></template>
        </DataTable>
        <FeedbackState v-else state="filtered-empty" title="没有匹配的日报明细" description="Skill明细从2026-10-08开始；请调整日期、菜单或搜索条件。"><template #action><button type="button" class="btn btn-secondary" @click="reset">清除筛选</button></template></FeedbackState>
        <template #pagination><div v-if="showAll" class="daily-toolbar"><p class="daily-muted" role="status">已显示当前筛选全部 {{ rows.length }} 条</p><button type="button" class="btn btn-secondary" @click="toggleAll">分页显示</button></div><Pagination v-else v-model:page="page" :page-size="pageSize" :total="rows.length" /></template>
      </ListSurface>
    </template>
    <details v-if="allowGlobal" class="daily-surface daily-definitions" data-flow-role="notice"><summary>日报来源、口径与数据范围</summary>
      <p>来源：{{ USAGE_DAILY_SOURCE.filename }} · 核心概览 {{ USAGE_DAILY_SOURCE.overviewRange.startDate }} 至 {{ USAGE_DAILY_SOURCE.overviewRange.endDate }}，Skill 明细 {{ USAGE_DAILY_SOURCE.detailRange.startDate }} 至 {{ USAGE_DAILY_SOURCE.detailRange.endDate }} · 当前为已导入快照</p>
      <p v-if="USAGE_DAILY_SOURCE.detailHistory">Skill 明细：{{ USAGE_DAILY_SOURCE.reportDetailRange.startDate }} 至 {{ USAGE_DAILY_SOURCE.reportDetailRange.endDate }} 来自最新日报，{{ USAGE_DAILY_SOURCE.detailHistory.startDate }} 至 {{ USAGE_DAILY_SOURCE.detailHistory.endDate }} 沿用 {{ USAGE_DAILY_SOURCE.detailHistory.filename }}。</p>
      <p>当前为邮件日报快照，尚未接入邮件自动同步。核心概览含 {{ USAGE_DAILY_SOURCE.counts.overviewRows }} 天数据，Skill 明细含 {{ USAGE_DAILY_SOURCE.counts.detailRows }} 条日统计，涉及 {{ USAGE_DAILY_SOURCE.counts.skills }} 个 Skill，完整资产清单未提供。页面仅统计剔除指定创建人后的 Skill 数据，缺失名称用 ID 展示，缺失菜单仍保留。</p>
      <p>DAU / WAU / MAU与授权用户取截止日原表值，跨日人数不能直接相加；按创建人剔除后的线上开启Skill总量、新增和创建总量无法从附件恢复，保持缺失。创建人跨Skill去重人数无法恢复。运行成功不等于业务已解决，好评率仅代表已收到的赞踩。</p>
      <p>任务按traceId去重，任务成功按日报定义为最终结果正确且任务内Skill调用成功；Skill执行成功率按执行成功次数/总执行次数。首字等待按每日均值和Query数加权估算，原均值已四舍五入；无问答时留空，不能当0秒。</p>
      <p>Skill调用统计从剔除后的日期×Skill明细重算，原始日报保留用于溯源；未能与原始调用量对账的日期保留缺失。日报不含逐次调用日志、用户清单、输入输出或运行耗时。</p>
      <p>执行成功率排行以当前范围内已提供的有效调用次数（含 0）计算中位数。优先选取调用次数严格超过中位数的 Skill，不足 10 项时从其余有调用且可计算成功率的 Skill 中补足。按成功率从低到高排列，同率按调用次数从少到多排列。</p>
    </details>
    <UsageDailyDetails v-if="detailTarget && canOpenDetail(detailTarget.dimension, detailTarget.id)" :key="`${detailTarget.dimension}-${detailTarget.id}`" :dimension="detailTarget.dimension" :target-id="detailTarget.id" :start-date="startDate" :end-date="endDate" :module="view === 'overview' || view === 'rankings' ? 'all' : module" :search="view === 'overview' || view === 'rankings' ? '' : search" :creator-scope-id="allowGlobal ? undefined : currentCreatorId || '__unauthorized__'" @close="detailTarget = null" />
  </div>
</template>

<style scoped>
.daily-panel { display: grid; gap: var(--space-4, 16px); min-width: 0; container-type: inline-size; }
.daily-surface { min-width: 0; padding: var(--space-4, 16px); border: 1px solid var(--color-border-subtle); border-radius: var(--radius-lg); background: var(--color-surface); }
.daily-section { display: grid; align-content: start; gap: var(--space-4, 16px); }
.daily-source-note { margin: 0; padding: var(--space-3, 12px) var(--space-4, 16px); border: 1px solid var(--color-border-subtle); border-radius: var(--radius-md); background: var(--color-bg-subtle); color: var(--color-text-secondary); font-size: var(--text-xs, 12px); }
.daily-muted, .daily-meta { margin: 0; color: var(--color-text-secondary); font-size: var(--text-xs, 12px); line-height: 1.65; overflow-wrap: anywhere; }
.daily-name { font-weight: 500; overflow-wrap: anywhere; }
.daily-toolbar { display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: var(--space-3, 12px); }
.daily-toolbar > button { flex: none; }
.daily-filter { display: flex; flex-wrap: wrap; align-items: flex-end; gap: var(--space-3, 12px); }
.daily-filter > :first-child { flex: 1 1 240px; }
.daily-filter > :nth-child(2) { flex: 1 1 180px; }
.daily-filter input, .daily-filter select { box-sizing: border-box; width: 100%; min-width: 0; height: 28px; padding: 0 var(--space-2, 8px); border: 1px solid var(--color-border); border-radius: var(--radius-md); background: var(--color-surface); color: var(--color-text); font: inherit; }
.daily-link { padding: var(--space-1, 4px); border: 0; background: transparent; color: var(--color-primary); font: inherit; cursor: pointer; white-space: nowrap; }
.daily-definitions { color: var(--color-text-secondary); font-size: var(--text-xs, 12px); line-height: 1.75; }
.daily-definitions summary { color: var(--color-text); cursor: pointer; font-weight: 500; }
.daily-definitions p { margin: var(--space-3, 12px) 0 0; }
.daily-panel button:focus-visible, .daily-panel input:focus-visible, .daily-panel select:focus-visible { outline: 2px solid var(--color-primary); outline-offset: 2px; }
</style>

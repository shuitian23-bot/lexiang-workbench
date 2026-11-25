<script setup lang="ts">
import { computed, onDeactivated, onMounted, reactive, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import ContentPageHeader from '@/components/content/ContentPageHeader.vue'
import ContentTabs from '@/components/content/ContentTabs.vue'
import FilterField from '@/components/content/FilterField.vue'
import FeedbackState from '@/components/content/FeedbackState.vue'
import UsageOverviewContent from './usage/UsageOverviewContent.vue'
import UsageDimensionPanel from './usage/UsageDimensionPanel.vue'
import UsageAnalysisDetails from './usage/UsageAnalysisDetails.vue'
import UsageDailyReportPanel from './usage/UsageDailyReportPanel.vue'
import { USAGE_ANCHOR_DATE, getUsageReport, getUsageAnalysis } from '@/domain/usageDashboard.js'
import { USAGE_DAILY_START_DATE, USAGE_DAILY_END_DATE } from '@/domain/usageDailyReport.js'
import { useUsageDashboardAccess } from '@/composables/useUsageDashboardAccess'

const SAMPLE_START = '2026-08-07'
type UsageReport = ReturnType<typeof getUsageReport>
const route = useRoute()
const router = useRouter()
const { scope: accessScope, currentCreatorITCode, canEnter, canPreview, isPreview, allowedSource, loading: accessLoading, creatorChoices, ensureLoaded, setPreview, canViewDetail } = useUsageDashboardAccess()
const allowGlobal = computed(() => accessScope.value === 'admin')
const tabs = computed(() => allowGlobal.value
  ? [{ key: 'overview', label: '数据概览' }, { key: 'skills', label: 'Skill 明细' }, { key: 'creators', label: '创建人明细' }]
  : [{ key: 'rankings', label: '应用排行' }, { key: 'creators', label: '我的贡献' }])
const tab = computed<string>({
  get: () => tabs.value.some(item => item.key === route.query.view) ? String(route.query.view) : allowGlobal.value ? 'overview' : 'rankings',
  set: view => { if (tabs.value.some(item => item.key === view)) void router.replace({ query: { ...route.query, view: view === 'overview' ? undefined : view } }) }
})
const source = ref<'daily' | 'sample'>('daily')
const rangeStart = computed(() => source.value === 'daily' ? USAGE_DAILY_START_DATE : SAMPLE_START)
const rangeEnd = computed(() => source.value === 'daily' ? USAGE_DAILY_END_DATE : USAGE_ANCHOR_DATE)
const dateBefore = (date: string, days: number) => {
  const value = new Date(`${date}T00:00:00Z`)
  value.setUTCDate(value.getUTCDate() - days)
  return value.toISOString().slice(0, 10)
}
const startDate = ref(dateBefore(USAGE_DAILY_END_DATE, 6))
const endDate = ref(USAGE_DAILY_END_DATE)
const filters = reactive({ skills: { module: 'all', search: '' }, creators: { module: 'all', search: '' } })
const activeFilters = computed(() => tab.value === 'creators' ? filters.creators : filters.skills)
const module = computed({ get: () => activeFilters.value.module, set: value => { activeFilters.value.module = value } })
const search = computed({ get: () => activeFilters.value.search, set: value => { activeFilters.value.search = value } })
const previewChoice = computed({
  get: () => isPreview.value ? 'personal' : 'admin',
  set: value => {
    if (value === 'admin') { setPreview(null); return }
    if (value !== 'personal') return
    const choice = creatorChoices.value
      .filter(item => item.source === source.value)
      .sort((a, b) => a.id.localeCompare(b.id))[0]
    if (choice) setPreview({ source: choice.source, creatorId: choice.id })
  }
})
const detailTarget = ref<{ dimension: 'skills' | 'creators'; id: string } | null>(null)
const presets = [{ days: 1, label: '最新一天' }, { days: 7, label: '近7天' }, { days: 30, label: '近30天' }]
const validDate = (value: string) => /^\d{4}-\d{2}-\d{2}$/.test(value)
  && Number.isFinite(Date.parse(`${value}T00:00:00Z`))
  && new Date(`${value}T00:00:00Z`).toISOString().slice(0, 10) === value
const dateError = computed(() => {
  if (!validDate(startDate.value) || !validDate(endDate.value)) return '请填写完整的起始日期和截止日期。'
  if (startDate.value > endDate.value) return '起始日期不能晚于截止日期，请调整日期区间。'
  if (startDate.value < rangeStart.value || endDate.value > rangeEnd.value) return `${source.value === 'daily' ? '日报' : '样例'}数据范围为 ${rangeStart.value} 至 ${rangeEnd.value}，请在此范围内选择。`
  return ''
})
const result = computed<{ report: UsageReport | null; error: string }>(() => {
  if (dateError.value || source.value === 'daily') return { report: null, error: '' }
  try {
    return { report: getUsageReport({ startDate: startDate.value, endDate: endDate.value, module: module.value, search: search.value }), error: '' }
  } catch {
    return { report: null, error: '聚合数据暂时无法读取，请重新选择统计周期。' }
  }
})
const report = computed(() => result.value.report)
const analysisDimension = computed(() => tab.value === 'creators' ? 'creators' as const : 'skills' as const)
const analysis = computed(() => {
  if (dateError.value || source.value === 'daily') return null
  try {
    return getUsageAnalysis({ startDate: startDate.value, endDate: endDate.value, module: tab.value === 'overview' || tab.value === 'rankings' ? 'all' : module.value, search: tab.value === 'overview' || tab.value === 'rankings' ? '' : search.value, dimension: analysisDimension.value, creatorId: allowGlobal.value ? undefined : currentCreatorITCode.value || '__unauthorized__' })
  } catch { return null }
})
const canOpenDailyDetail = (dimension: 'skills' | 'creators', id: string) => canViewDetail(dimension, id, 'daily')

function selectPeriod(days: number) {
  startDate.value = dateBefore(rangeEnd.value, days - 1)
  endDate.value = rangeEnd.value
}
function isPreset(days: number) {
  return endDate.value === rangeEnd.value && startDate.value === dateBefore(rangeEnd.value, days - 1)
}
function showSkill(id: string) { if (canViewDetail('skills', id, source.value)) detailTarget.value = { dimension: 'skills', id } }
function showCreator(id: string) { if (canViewDetail('creators', id, source.value)) detailTarget.value = { dimension: 'creators', id } }
function openDimensionDetail(id: string) { if (canViewDetail(analysisDimension.value, id, source.value)) detailTarget.value = { dimension: analysisDimension.value, id } }
watch([startDate, endDate, module, search], () => { detailTarget.value = null })
watch(tab, () => { detailTarget.value = null })
watch(source, () => { selectPeriod(7); detailTarget.value = null; module.value = 'all'; search.value = '' })
watch([accessScope, currentCreatorITCode, allowedSource], () => {
  detailTarget.value = null
  if (allowedSource.value !== 'all') source.value = allowedSource.value
}, { immediate: true })
onMounted(() => { void ensureLoaded() })
onDeactivated(() => { detailTarget.value = null })
</script>

<template>
  <div class="usage-dashboard" data-page="usage-dashboard">
    <div class="usage-page-flow">
      <ContentPageHeader title="Skill使用数据看板" :description="`${allowGlobal ? '管理员视图' : '个人视图'} · ${source === 'daily' ? '邮件日报快照' : '虚构样例数据'} · 截至 ${rangeEnd}`">
        <template v-if="canEnter" #actions>
          <FilterField v-if="canPreview" label="视角预览（仅演示）"><select v-model="previewChoice" class="usage-preview-select" aria-label="视角预览（仅演示）" title="切换管理员视图与个人视图，仅用于演示，不修改实际账号权限"><option value="admin">管理员视图</option><option value="personal" :disabled="!creatorChoices.some(choice => choice.source === source)">个人视图</option></select></FilterField>
        </template>
      </ContentPageHeader>

      <FeedbackState v-if="accessLoading" state="loading" title="正在确认访问范围" description="请稍候。" data-flow-role="notice" />
      <FeedbackState v-else-if="!canEnter" state="error" title="暂无看板访问权限" description="看板向已获授权的管理角色及可确认创建过Skill的用户开放。当前身份或创建归属尚未确认。" data-flow-role="notice" />
      <template v-else>
        <p v-if="isPreview" class="usage-period-hint" data-flow-role="notice">当前为个人视图预览：展示公共排行和本人贡献，不修改实际账号权限。</p>
        <ContentTabs v-model="tab" :items="tabs" label="使用数据视图" data-flow-role="filters" />

        <section class="usage-period usage-surface" data-flow-role="filters" aria-label="统计周期">
          <div v-if="allowGlobal" class="usage-quick-period" role="group" aria-label="数据来源"><span class="usage-filter-label">数据来源</span><button type="button" :class="{ selected: source === 'daily' }" :aria-pressed="source === 'daily'" @click="source = 'daily'">日报数据</button><button type="button" :class="{ selected: source === 'sample' }" :aria-pressed="source === 'sample'" @click="source = 'sample'">样例演示</button></div>
          <p v-else class="usage-period-hint">{{ source === 'daily' ? '邮件日报快照' : '虚构样例数据' }} · {{ isPreview ? '个人视图' : `本人 IT Code：${currentCreatorITCode}` }}</p>
          <div class="usage-period-main">
            <div class="usage-quick-period" role="group" aria-label="快捷统计周期">
              <span class="usage-filter-label">统计周期</span>
              <button v-for="preset in presets" :key="preset.days" type="button" :class="{ selected: isPreset(preset.days) }" :aria-pressed="isPreset(preset.days)" @click="selectPeriod(preset.days)">{{ preset.label }}</button>
            </div>
            <div class="usage-date-range">
              <FilterField label="起始日期" layout="inset"><input v-model="startDate" type="date" :min="rangeStart" :max="rangeEnd" aria-label="起始日期" :aria-invalid="!!dateError" :aria-describedby="dateError ? 'usage-date-error' : undefined" /></FilterField>
              <span aria-hidden="true">至</span>
              <FilterField label="截止日期" layout="inset"><input v-model="endDate" type="date" :min="rangeStart" :max="rangeEnd" aria-label="截止日期" :aria-invalid="!!dateError" :aria-describedby="dateError ? 'usage-date-error' : undefined" /></FilterField>
            </div>
          </div>
          <p class="usage-period-hint">{{ source === 'daily' ? '日报快照' : '样例数据' }}截止 {{ rangeEnd }}，支持 {{ rangeStart }} 起的区间；快捷周期以数据截止日为准。</p>
        </section>

        <FeedbackState v-if="dateError" id="usage-date-error" state="error" title="请检查统计周期" :description="dateError" data-flow-role="notice">
          <template #action><button type="button" class="btn btn-secondary" @click="selectPeriod(7)">恢复近7天</button></template>
        </FeedbackState>
        <UsageDailyReportPanel v-else-if="source === 'daily'" :view="tab" :start-date="startDate" :end-date="endDate" :allow-global="allowGlobal" :current-creator-id="currentCreatorITCode" :can-open-detail="canOpenDailyDetail" @show-skills="tab = 'skills'" @show-creators="tab = 'creators'" />
        <FeedbackState v-else-if="result.error" state="error" title="读取失败" :description="result.error" data-flow-role="notice" />
        <FeedbackState v-else-if="!report || !report.trend.length" state="empty" title="所选周期暂无数据" description="请选择样例范围内的其他日期。" data-flow-role="notice" />

        <UsageOverviewContent v-else-if="tab === 'overview' || tab === 'rankings'" source="sample" :start-date="startDate" :end-date="endDate" :allow-global="allowGlobal" :current-creator-id="currentCreatorITCode" data-flow-role="main" @open-skill="showSkill" @open-creator="showCreator" @view-skills="tab = 'skills'" @view-creators="tab = 'creators'" />

        <UsageDimensionPanel v-else-if="analysis" v-model:module="module" v-model:search="search" :key="analysisDimension" :analysis="analysis" :dimension="analysisDimension" data-flow-role="main" @open-detail="openDimensionDetail" />
        <FeedbackState v-else state="error" title="分析数据暂时无法读取" description="请调整筛选条件后重试。" data-flow-role="notice" />

        <details v-if="source === 'sample' && allowGlobal" class="usage-definitions usage-surface" data-flow-role="notice">
          <summary>统计口径与样例说明</summary>
          <dl>
            <div><dt>统计范围</dt><dd>全平台示例数据，覆盖 {{ SAMPLE_START }} 至 {{ USAGE_ANCHOR_DATE }}。所有人数按账号去重；周期用户数不能由每日用户数相加得到。</dd></div>
            <div><dt>活跃与渗透</dt><dd>登录DAU为截止日访问人数；AI DAU为截止日主动发送Query的人数。WAU、MAU包含截止日及此前6、29个自然日，独立于所选周期起始日；历史样例不足完整窗口时按已有天数统计。AI授权渗透率为周期AI互动人数 / 截止日授权用户总数，正式授权分母待业务封板。</dd></div>
            <div><dt>Query与调用</dt><dd>AI互动及Query只统计全局助手，排除Skill创建中的需求澄清与AI微调对话。Skill按实际调用次数计数，一条Query可产生多次调用；执行成功率为执行成功次数 / 总执行次数，无调用时不计算。平均首字响应统计Query请求至首个响应的耗时。</dd></div>
            <div><dt>Skill与反馈</dt><dd>Skill总量为截止日线上处于开启状态的Skill数量，关闭、禁用和下线不计入；新增为周期内首次上线数量；被调用为周期内有调用的Skill数。样例创建人数为截止日线上开启样例Skill的创建人去重数，不代表真实平台全量创建人数。好评率为点赞 /（点赞 + 点踩），无反馈时不计算。模块与搜索联动当前维度的表格与详情，不改变数据概览。</dd></div>
            <div><dt>创建人贡献</dt><dd>按创建人旗下Skill的使用贡献聚合，非创建人本人使用。使用人数在所选范围跨Skill去重，不能将分行人数直接相加；执行成功率、好评率分别用合计调用和合计反馈计算，不平均各Skill比率。</dd></div>
            <div><dt>质量与明细</dt><dd>运行成功≠业务解决，不生成综合质量评分。当前样例只含最终成功/失败记录；生产超时、取消、部分成功及重试口径待确认。明细只含样例调用ID、时间、状态、耗时、赞踩和失败原因，不含用户原始标识或输入输出正文。</dd></div>
            <div><dt>执行成功率排行</dt><dd>以当前范围内已提供的有效调用次数（含 0）计算中位数。优先选取调用次数严格超过中位数的 Skill，不足 10 项时从其余有调用且可计算成功率的 Skill 中补足。按成功率从低到高排列，同率按调用次数从少到多排列。</dd></div>
          </dl>
        </details>
      </template>
    </div>
    <UsageAnalysisDetails v-if="canEnter && detailTarget && canViewDetail(detailTarget.dimension, detailTarget.id, source)" :dimension="detailTarget.dimension" :target-id="detailTarget.id" :scope-dimension="analysisDimension" :start-date="startDate" :end-date="endDate" :module="tab === 'overview' || tab === 'rankings' ? 'all' : module" :search="tab === 'overview' || tab === 'rankings' ? '' : search" :creator-scope-id="allowGlobal ? undefined : currentCreatorITCode || '__unauthorized__'" @close="detailTarget = null" />
  </div>
</template>

<style scoped>
.usage-dashboard { width: 100%; min-width: 0; padding: 0; container-type: inline-size; color: var(--color-text); font-family: var(--font-body); font-size: var(--text-sm, 13px); line-height: 1.5; }
.usage-page-flow { display: grid; gap: var(--space-4, 16px); min-width: 0; }
.usage-page-flow > * { margin-block: 0; }
.usage-surface { min-width: 0; padding: var(--space-4, 16px); border: 1px solid var(--color-border-subtle); border-radius: var(--radius-lg); background: var(--color-surface); }
.usage-section { display: grid; align-content: start; gap: var(--space-4, 16px); }
.usage-period { display: grid; gap: var(--space-2, 8px); }
.usage-preview-select { width: 100%; max-width: 320px; min-width: 0; height: var(--control-height-sm, 32px); padding: 0 var(--space-2, 8px); border: 1px solid var(--color-border); border-radius: var(--radius-md); background: var(--color-surface); color: var(--color-text); font: inherit; }
.usage-preview-select:focus-visible { outline: 2px solid var(--color-primary); outline-offset: 2px; }
.usage-period-main, .usage-quick-period { display: flex; flex-wrap: wrap; align-items: center; gap: var(--space-2, 8px); }
.usage-period-main { justify-content: space-between; gap: var(--space-3, 12px); }
.usage-filter-label { margin-right: var(--space-1, 4px); font-weight: 500; }
.usage-quick-period button { min-height: var(--control-height-sm, 32px); padding: var(--space-1, 4px) var(--space-3, 12px); border: 1px solid var(--color-border); border-radius: var(--radius-md); background: var(--color-surface); color: var(--color-text-secondary); font: inherit; cursor: pointer; white-space: nowrap; }
.usage-quick-period button.selected { border-color: var(--color-primary-border); background: var(--color-primary-subtle); color: var(--color-primary); }
.usage-date-range { display: grid; grid-template-columns: minmax(0, 1fr) auto minmax(0, 1fr); align-items: center; gap: var(--space-2, 8px); min-width: 0; border: 1px solid var(--color-border); border-radius: var(--radius-md); background: var(--color-surface); }
.usage-date-range:focus-within { border-color: var(--color-primary); box-shadow: var(--focus-ring); }
.usage-date-range > span { color: var(--color-text-tertiary); }
.usage-period-hint { margin: 0; color: var(--color-text-secondary); font-size: var(--text-xs, 12px); }
.usage-list-workspace { display: grid; gap: var(--space-3, 12px); min-width: 0; }
.usage-skill-filters { display: grid; grid-template-columns: minmax(0, 2fr) minmax(0, 1fr) auto; align-items: end; gap: var(--space-3, 12px); }
.usage-reset { min-height: var(--control-height-md, 36px); }
.usage-table-toolbar { display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: var(--space-2, 8px); }
.usage-table-toolbar span { color: var(--color-text-secondary); font-size: var(--text-xs, 12px); }
.usage-skill-name { color: var(--color-text); font-weight: 500; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.usage-skill-meta { margin-top: var(--space-1, 4px); color: var(--color-text-secondary); font-size: var(--text-xs, 12px); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.usage-code { font-family: var(--font-code, ui-monospace, monospace); }
.usage-dashboard button:focus-visible { outline: 2px solid var(--color-primary); outline-offset: 2px; }
.usage-definitions { color: var(--color-text-secondary); font-size: var(--text-xs, 12px); }
.usage-definitions summary { color: var(--color-text-secondary); cursor: pointer; font-weight: 500; }
.usage-definitions dl { display: grid; gap: var(--space-3, 12px); margin: var(--space-4, 16px) 0 0; }
.usage-definitions dl > div { display: grid; grid-template-columns: var(--space-definition-label, 80px) minmax(0, 1fr); gap: var(--space-3, 12px); }
.usage-definitions dt { color: var(--color-text); font-weight: 500; }
.usage-definitions dd { margin: 0; line-height: 1.7; }
@container (max-width: 719px) {
  .usage-period-main { align-items: stretch; flex-direction: column; }
  .usage-date-range { width: 100%; }
  .usage-skill-filters { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  .usage-skill-filters > :first-child { grid-column: 1 / -1; }
}
@container (max-width: 479px) {
  .usage-skill-filters { grid-template-columns: 1fr; }
  .usage-skill-filters > :first-child { grid-column: auto; }
  .usage-quick-period { gap: var(--space-1, 4px); }
  .usage-definitions dl > div { grid-template-columns: 1fr; gap: var(--space-1, 4px); }
}
</style>

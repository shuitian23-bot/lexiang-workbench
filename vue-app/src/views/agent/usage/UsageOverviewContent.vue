<script setup lang="ts">
import { computed } from 'vue'
import SectionHeader from '@/components/content/SectionHeader.vue'
import UsageActivityOverview from './UsageActivityOverview.vue'
import UsageMetricOverview from './UsageMetricOverview.vue'
import UsageOverviewRankings from './UsageOverviewRankings.vue'
import UsageCreatorRankings from './UsageCreatorRankings.vue'
import { getUsageActivityOverview } from '@/domain/usageActivityOverview.js'
import { getDailyPeriodOverview, getSamplePeriodOverview } from '@/domain/usageOverviewAdapters.js'
import { getDailyOverview, getDailyAnalysis, USAGE_DAILY_START_DATE } from '@/domain/usageDailyReport.js'
import { getUsageReport, getUsageAnalysis } from '@/domain/usageDashboard.js'

const props = defineProps<{ source: 'daily' | 'sample'; startDate: string; endDate: string; allowGlobal: boolean; currentCreatorId?: string | null }>()
const emit = defineEmits<{ 'open-skill': [id: string]; 'open-creator': [id: string]; 'view-skills': []; 'view-creators': [] }>()
const sourceLabel = computed(() => props.source === 'daily' ? '邮件日报快照' : '虚构样例数据')
const periodModel = computed(() => (props.source === 'daily' ? getDailyPeriodOverview : getSamplePeriodOverview)({ startDate: props.startDate, endDate: props.endDate }))
const dailyOverview = computed(() => props.source === 'daily' ? getDailyOverview({ startDate: props.startDate, endDate: props.endDate }) : null)
const activityModel = computed(() => getUsageActivityOverview({
  startDate: props.startDate, endDate: props.endDate,
  asOfDate: dailyOverview.value?.summary.asOfDate || props.endDate,
  readSnapshot: (date: string) => {
    if (props.source === 'daily') {
      const snapshot = getDailyOverview({ startDate: date, endDate: date })
      return snapshot.summary.asOfDate === date ? { totalUsers: snapshot.summary.totalUsers, windows: snapshot.windows } : null
    }
    const snapshot = getUsageReport({ startDate: date, endDate: date })
    return snapshot.trend.length ? { totalUsers: snapshot.summary.totalUsers, windows: snapshot.windows } : null
  }
}))
const analysis = computed(() => (props.source === 'daily' ? getDailyAnalysis : getUsageAnalysis)({ startDate: props.startDate, endDate: props.endDate }))
const rankingSkills = computed(() => analysis.value.skills.map(row => ({ ...row, creator: props.source === 'sample' ? row.creatorId : row.creator })))
const creatorRows = computed(() => {
  if (props.source === 'sample') return analysis.value.creators
  const current = getDailyAnalysis({ startDate: props.startDate, endDate: props.endDate, dimension: 'creators' })
  const known = getDailyAnalysis({ startDate: USAGE_DAILY_START_DATE, endDate: props.endDate, dimension: 'creators' })
  const complete = !current.quality.detailCoveragePartial && !current.quality.missingDates.length
  return known.creators.map(row => current.creators.find(item => item.id === row.id) || {
    ...row, createdSkills: null, calledSkills: complete ? 0 : null, calls: complete ? 0 : null,
    success: complete ? 0 : null, failed: complete ? 0 : null, successRate: null,
    likes: complete ? 0 : null, dislikes: complete ? 0 : null, feedbackCount: complete ? 0 : null, likeRate: null
  })
})
const scopeLabel = computed(() => `${props.startDate} 至 ${props.endDate} · ${props.source === 'daily' ? '仅按已提供的Skill明细排行' : '全平台虚构样例'}`)
const n = (value: number | null | undefined) => value == null ? '—' : value.toLocaleString('zh-CN')
const queryMetrics = computed(() => [
  { key: 'queries', label: 'Query 总量', unit: '次', meta: '所选周期累计交互请求数' },
  { key: 'tasks', label: '任务执行次数', unit: '次', meta: props.source === 'daily' ? '按任务 traceId 统计' : '样例未提供独立任务统计' },
  { key: 'taskSuccessRate', label: '任务执行成功率', format: 'percent' as const, meta: props.source === 'daily' ? '成功任务数 ÷ 任务执行次数；无任务日期趋势显示0' : '样例未提供独立任务统计' },
  { key: 'firstTokenSeconds', label: '平均首字响应时长', unit: '秒', format: 'decimal' as const, meta: props.source === 'daily' ? '按每日 Query 数加权估算；无 Query 日期趋势显示0' : '按 Query 请求至首个响应统计' }
])
const skillMetrics = computed(() => [
  { key: 'totalSkills', label: 'Skill 总量', unit: '个', meta: `截至 ${props.endDate} 线上处于开启状态的 Skill${props.source === 'daily' ? '；日报缺少完整开启清单时显示“—”' : ''}` },
  { key: 'newSkills', label: '周期新增 Skill', unit: '个', meta: `${props.startDate} 至 ${props.endDate} 累计` },
  { key: 'calledSkills', label: '被调用 Skill 数', unit: '个', meta: props.source === 'daily' ? '完整明细覆盖内调用大于0的Skill去重' : '周期内有调用的已上线 Skill' },
  { key: 'skillCallRate', label: 'Skill 调用率', format: 'percent' as const, meta: `周期被调用 ${n(periodModel.value.current?.calledSkills)} 个 Skill ÷ 截至 ${props.endDate} 线上开启总量 ${n(periodModel.value.current?.totalSkills)} 个；周期内 Skill 去重` },
  { key: 'calls', label: 'Skill 调用次数', unit: '次', meta: `成功 ${n(periodModel.value.current?.success)} / 失败 ${n(periodModel.value.current?.failed)} 次` },
  { key: 'successRate', label: 'Skill 执行成功率', format: 'percent' as const, meta: '执行成功次数 ÷ 总执行次数' },
  { key: 'likeRate', label: '反馈好评率', format: 'percent' as const, meta: '点赞 ÷（点赞＋点踩）；无评价不计算' }
])
function openSkill(id: string) { if (props.allowGlobal) emit('open-skill', id) }
function openCreator(id: string) { if (props.allowGlobal || id === props.currentCreatorId) emit('open-creator', id) }
</script>

<template>
  <div class="usage-overview-content">
    <template v-if="allowGlobal">
      <section class="usage-overview-section" data-flow-role="summary">
        <SectionHeader title="用户规模与活跃" :description="`截至 ${activityModel.asOfDate || endDate} · 登录与互动分别去重，展示人数及授权覆盖率`" />
        <UsageActivityOverview :model="activityModel" :start-date="startDate" :end-date="endDate" :source-label="sourceLabel" />
        <p v-if="activityModel.asOfDate && activityModel.asOfDate !== endDate" class="usage-overview-note">所选截止日暂无日报，人数采用 {{ activityModel.asOfDate }} 的最近记录；环比按所选天数回看对应日期。</p>
      </section>
      <section class="usage-overview-section" data-flow-role="summary">
        <SectionHeader title="对话与执行" description="交互请求与任务执行分别统计，按所选周期查看使用规模与执行情况" />
        <UsageMetricOverview :model="periodModel" :metrics="queryMetrics" :source-label="sourceLabel" />
      </section>
      <section class="usage-overview-section" data-flow-role="summary">
        <SectionHeader title="Skill数量与质量" description="总量为截止日线上开启的 Skill 数；新增、调用与执行情况按所选周期统计，用户反馈单独展示" />
        <UsageMetricOverview :model="periodModel" :metrics="skillMetrics" :source-label="sourceLabel" />
      </section>
    </template>
    <p v-if="source === 'daily' && 'quality' in analysis && analysis.quality.detailCoveragePartial" class="usage-overview-note" data-flow-role="notice">所选周期包含未提供 Skill 明细的日期。被调用 Skill 数、Skill 调用率和好评率暂不计算完整周期值；排行榜只使用已有明细，未覆盖日期不作零调用。</p>
    <section class="usage-ranking-section" aria-label="排行榜">
      <SectionHeader title="排行榜" />
      <UsageOverviewRankings :rows="rankingSkills" :scope-label="scopeLabel" :allow-detail="allowGlobal" @open-detail="openSkill" @view-all="emit('view-skills')" />
      <UsageCreatorRankings :rows="creatorRows" :scope-label="scopeLabel" :allow-global="allowGlobal" :current-creator-id="currentCreatorId" @open-detail="openCreator" @view-all="emit('view-creators')" />
    </section>
  </div>
</template>

<style scoped>
.usage-overview-content { display: grid; gap: var(--space-6, 24px); min-width: 0; }
.usage-overview-section { display: grid; align-content: start; gap: var(--space-4, 16px); min-width: 0; padding: var(--space-4, 16px); border: 1px solid var(--color-border-subtle); border-radius: var(--radius-lg); background: var(--color-surface); }
.usage-ranking-section { display: grid; gap: var(--space-4, 16px); min-width: 0; }
.usage-overview-note { margin: 0; color: var(--color-text-secondary); font-size: var(--text-xs, 12px); line-height: 1.65; }
</style>

<script setup lang="ts">
import MetricGrid from '@/components/content/MetricGrid.vue'
import UsageTrendMetricCard from './UsageTrendMetricCard.vue'
import type { getUsageActivityOverview } from '@/domain/usageActivityOverview.js'
import { getUsageCardComparison } from '@/domain/usageCardComparison.js'

type ActivityModel = ReturnType<typeof getUsageActivityOverview>
type Change = ActivityModel['changes']['totalUsers']
type Period = 'dau' | 'wau' | 'mau'
const props = withDefaults(defineProps<{ model: ActivityModel; startDate: string; endDate: string; sourceLabel?: string }>(), { sourceLabel: '人数统计' })
const periods = [
  { key: 'dau', label: '日活跃用户（DAU）', meta: '当日去重', tone: 'purple' },
  { key: 'wau', label: '周活跃用户（WAU）', meta: '近7个自然日去重', tone: 'green' },
  { key: 'mau', label: '月活跃用户（MAU）', meta: '近30个自然日去重', tone: 'slate' }
] as const
const userTypes = [{ key: 'login', label: '登录' }, { key: 'ai', label: '互动' }] as const
function rows(period: 'totalUsers' | Period) {
  return props.model.points.map(point => ({
    date: point.date, totalUsers: point.totalUsers,
    login: period === 'totalUsers' ? null : point.login[period],
    ai: period === 'totalUsers' ? null : point.ai[period]
  }))
}
const count = (value: number | null | undefined) => value == null ? '—' : value.toLocaleString('zh-CN')
function coverage(value: number | null | undefined) {
  const total = props.model.current?.totalUsers
  return value == null || total == null || total <= 0 ? '—' : `${(value / total * 100).toFixed(1)}%`
}
function comparison(change: Change, metricKey: string) {
  return getUsageCardComparison({ change, metricKey, startDate: props.startDate, endDate: props.endDate })
}
function changeClass(change: Change, key: string) {
  const result = comparison(change, key)
  return { 'is-increase': !result.isMock && result.text.includes('↑'), 'is-decrease': !result.isMock && result.text.includes('↓') }
}
function changeTitle(change: Change, metricKey: string) {
  const comparison = `截至 ${props.model.asOfDate || '—'}，对比 ${change.previousDate || '前期日期不可得'}（前期人数 ${count(change.previousValue)}）`
  const presentation = getUsageCardComparison({ change, metricKey, startDate: props.startDate, endDate: props.endDate })
  return `${comparison}；${presentation.title}`
}
</script>

<template>
  <div class="usage-activity-overview">
    <MetricGrid :columns="4" class="usage-activity-grid" role="group" aria-label="用户规模、活跃与趋势">
      <UsageTrendMetricCard label="授权用户总数" :meta="`截至 ${model.asOfDate || '—'} 已开通门户工作台权限的用户（含尚未登录）`" :rows="rows('totalUsers')" :series="[{ key: 'totalUsers', label: '授权用户总数' }]" :source-label="sourceLabel" tone="blue">
        <template #comparison><span class="usage-activity-change" :class="changeClass(model.changes.totalUsers, 'totalUsers')" :title="changeTitle(model.changes.totalUsers, 'totalUsers')" :data-comparison-mock="comparison(model.changes.totalUsers, 'totalUsers').isMock || undefined">{{ comparison(model.changes.totalUsers, 'totalUsers').text }}</span></template>
        <template #value><strong class="usage-activity-total">{{ count(model.current?.totalUsers) }}<small v-if="model.current?.totalUsers != null" class="usage-activity-unit">人</small></strong></template>
      </UsageTrendMetricCard>
      <UsageTrendMetricCard v-for="period in periods" :key="period.key" :label="period.label" :meta="period.meta" :rows="rows(period.key)" :series="[{ key: 'login', label: '登录' }, { key: 'ai', label: '互动' }]" :source-label="sourceLabel" :tone="period.tone">
        <template #comparison><span v-for="user in userTypes" :key="user.key" class="usage-activity-change" :class="changeClass(model.changes[user.key][period.key], `${user.key}.${period.key}`)" :title="changeTitle(model.changes[user.key][period.key], `${user.key}.${period.key}`)" :data-comparison-mock="comparison(model.changes[user.key][period.key], `${user.key}.${period.key}`).isMock || undefined">{{ user.label }} {{ comparison(model.changes[user.key][period.key], `${user.key}.${period.key}`).text }}</span></template>
        <template #value>
          <dl class="usage-activity-values">
            <div v-for="user in userTypes" :key="user.key" class="usage-activity-value-row">
              <dt>{{ user.label }}</dt>
              <dd><strong>{{ count(model.current?.windows[user.key][period.key]) }}<small v-if="model.current?.windows[user.key][period.key] != null" class="usage-activity-unit">人</small></strong><span class="usage-activity-coverage">{{ user.label }}率 {{ coverage(model.current?.windows[user.key][period.key]) }}</span></dd>
            </div>
          </dl>
        </template>
      </UsageTrendMetricCard>
    </MetricGrid>
    <p class="usage-activity-note">授权用户总数为已开通门户工作台权限的去重用户数，包含尚未登录或互动的用户。登录率 = 登录人数 ÷ 同日门户工作台授权用户总数；互动率 = 互动人数 ÷ 同日门户工作台授权用户总数。登录、互动分别去重，不相加；授权总数缺失或为0时，登录率和互动率显示“—”。</p>
    <p class="usage-activity-note">{{ startDate }} 至 {{ endDate }} · 人数环比按所选 {{ model.days }} 天回看对应日期；选1天对比前1天，选7天对比前7天，选30天对比前30天。环比不可计算时以 Mock 演示；趋势采用每日快照，不跨日累加。</p>
  </div>
</template>

<style scoped>
.usage-activity-overview { display: grid; gap: var(--space-3, 12px); min-width: 0; container-type: inline-size; }
.usage-activity-values { display: grid; gap: var(--space-3, 12px); margin: 0; }
.usage-activity-value-row { display: grid; grid-template-columns: auto minmax(0, 1fr); align-items: center; gap: var(--space-2, 8px); }
.usage-activity-value-row dt { color: var(--color-text-secondary); font-size: var(--text-xs, 12px); font-weight: 400; }
.usage-activity-value-row dd { display: flex; flex-wrap: wrap; align-items: baseline; justify-content: space-between; gap: var(--space-1, 4px); min-width: 0; margin: 0; font-variant-numeric: tabular-nums; }
.usage-activity-values strong, .usage-activity-total { font-size: var(--text-2xl, 24px); font-weight: 700; }
.usage-activity-unit { margin-left: var(--space-1, 4px); color: var(--color-text-secondary); font-size: var(--text-sm, 13px); font-weight: 400; }
.usage-activity-coverage, .usage-activity-note { color: var(--color-text-secondary); font-size: var(--text-xs, 12px); font-weight: 400; line-height: 1.65; }
.usage-activity-note { margin: 0; }
</style>

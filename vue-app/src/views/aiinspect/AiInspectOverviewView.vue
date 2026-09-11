<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAppStore } from '@/stores/app'
import { isAiInspectAdmin } from '@/services/aiInspectAccess'
import ContentPageHeader from '@/components/content/ContentPageHeader.vue'
import SectionHeader from '@/components/content/SectionHeader.vue'
import {
  dashboardKpis,
  healthTrend7d,
  problemTypeShare,
  pageRanking,
  dimensionAnomalyAll,
  dimensionAnomaly7d,
  pendingWorkOrders,
  notificationsFeed,
  formatDuration,
  durationTone
} from '@/services/aiInspect'
import AiInspectReleaseRecord from '@/components/aiinspect/AiInspectReleaseRecord.vue'
import AiBadge from '@/components/aiinspect/AiBadge.vue'
import AiHelpTip from '@/components/aiinspect/AiHelpTip.vue'
import AiLineChart from '@/components/aiinspect/charts/AiLineChart.vue'
import AiDonutChart from '@/components/aiinspect/charts/AiDonutChart.vue'
import AiBarChart from '@/components/aiinspect/charts/AiBarChart.vue'

const router = useRouter()
const appStore = useAppStore()
const isAdmin = computed(() => isAiInspectAdmin(appStore.role, appStore.permissions))

const trendRange = ref<'all' | '7d'>('all')
const anomalyData = computed(() => (trendRange.value === '7d' ? dimensionAnomaly7d : dimensionAnomalyAll))

function kpiArrow(tone: string) {
  if (tone === 'up') return '↑'
  if (tone === 'down') return '↓'
  return ''
}

function onKpiClick(kpi: (typeof dashboardKpis)[number]) {
  if (!kpi.clickable) return
  if (kpi.query?.jump === 'logs') {
    router.push('/aiinspect/logs')
    return
  }
  router.push({ path: '/aiinspect/issues', query: kpi.query || {} })
}

function openIssuesWith(filter: Record<string, string>) {
  router.push({ path: '/aiinspect/issues', query: filter })
}

function onBarSelect(name: string) {
  openIssuesWith({ dimension: name, status: '待处理,处理中' })
}

function goNotifications() {
  router.push('/aiinspect/notifications')
}

onMounted(() => {
  appStore.ensureStaticTab('aiinspect.overview')
  appStore.setActiveStaticTab('aiinspect.overview')
  document.title = 'AI 巡检 · 数据总览'
})
</script>

<template>
  <div class="ai-overview">
    <ContentPageHeader class="inspect-page-header" title="数据总览" description="AI 巡检核心指标与风险动态 · 数据更新于 2026-08-26 15:00">
      <template #actions><AiInspectReleaseRecord /></template>
    </ContentPageHeader>

    <!-- KPI 指标卡 -->
    <div class="ai-kpi-grid">
      <div
        v-for="kpi in dashboardKpis"
        :key="kpi.key"
        class="ai-kpi-card"
        :class="{ clickable: kpi.clickable }"
        @click="onKpiClick(kpi)"
        :role="kpi.clickable ? 'button' : undefined"
        :tabindex="kpi.clickable ? 0 : undefined"
        @keydown.enter="onKpiClick(kpi)"
        @keydown.space.prevent="onKpiClick(kpi)"
      >
        <div class="ai-kpi-head">
          <span class="ai-kpi-label">{{ kpi.label }}</span>
          <AiHelpTip :text="kpi.help" />
        </div>
        <div class="ai-kpi-value">{{ kpi.value }}</div>
        <div class="ai-kpi-compare" :class="`is-${kpi.tone}`">
          <template v-if="kpi.tone !== 'none'">{{ kpiArrow(kpi.tone) }} </template>{{ kpi.compare }}
        </div>
      </div>
    </div>

    <!-- 走势与构成 -->
    <div class="ai-grid-2">
      <div class="inspect-surface">
        <SectionHeader title="近 7 天健康率趋势">
          <template #meta><span class="ai-card-note">趋势展示型</span></template>
        </SectionHeader>
        <AiLineChart :points="healthTrend7d.map((p) => p.rate)" :labels="healthTrend7d.map((p) => p.date)" />
      </div>

      <div class="inspect-surface">
        <SectionHeader title="高频问题类型">
          <template #meta><span class="ai-card-note">构成展示型</span></template>
        </SectionHeader>
        <AiDonutChart :segments="problemTypeShare" />
      </div>
    </div>

    <!-- 风险聚焦 -->
    <div class="ai-grid-2">
      <div class="inspect-surface">
        <SectionHeader title="高频发问题页面排行">
          <template #meta><span class="ai-card-note">TOP 8</span></template>
        </SectionHeader>
        <ul class="ai-rank">
          <li
            v-for="(row, i) in pageRanking"
            :key="row.page"
            class="ai-rank__row"
            role="button"
            tabindex="0"
            @click="openIssuesWith({ page: row.page, status: '待处理,处理中' })"
            @keyup.enter="openIssuesWith({ page: row.page, status: '待处理,处理中' })"
          >
            <span class="ai-rank__no" :class="{ 'is-top': i < 3 }">{{ i + 1 }}</span>
            <span class="ai-rank__page">{{ row.page }}</span>
            <span class="ai-rank__count">{{ row.count }}</span>
          </li>
        </ul>
      </div>

      <div class="inspect-surface">
        <SectionHeader title="各类异常数量">
          <template #actions><div class="dash-filter-bar">
            <button class="dash-pill" :class="{ active: trendRange === 'all' }" type="button" @click="trendRange = 'all'">全部</button>
            <button class="dash-pill" :class="{ active: trendRange === '7d' }" type="button" @click="trendRange = '7d'">最近7天</button>
          </div></template>
        </SectionHeader>
        <AiBarChart :items="anomalyData" @select="onBarSelect" />
      </div>
    </div>

    <!-- 行动闭环 -->
    <div class="ai-grid-2" :class="{ 'is-ops': !isAdmin }">
      <div class="inspect-surface" :class="{ 'ai-span-full': !isAdmin }">
        <SectionHeader title="待处理 / 处理中问题列表">
          <template #actions><button class="btn btn-sm btn-secondary" type="button" @click="openIssuesWith({})">前往问题处理</button></template>
        </SectionHeader>
        <div class="ai-table-scroll" role="region" aria-label="巡检数据表格" tabindex="0">
          <table class="ai-table">
            <thead>
              <tr>
                <th>状态</th>
                <th>工单号</th>
                <th>页面 / 位置</th>
                <th>等级</th>
                <th>问题项</th>
                <th>存在时长</th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="row in pendingWorkOrders"
                :key="row.id"
                class="ai-table__row"
                @click="openIssuesWith({})"
              >
                <td><AiBadge :tone="row.status === '待处理' ? 'red' : 'orange'" :label="row.status" dot /></td>
                <td class="ai-mono">{{ row.id }}</td>
                <td>
                  <div class="ai-cell-strong">{{ row.page }}</div>
                  <div class="ai-cell-sub">{{ row.location }}</div>
                </td>
                <td><AiBadge :tone="row.level === '严重' ? 'red' : row.level === '警告' ? 'orange' : 'blue'" :label="row.level" /></td>
                <td>{{ row.issue }}</td>
                <td :class="durationTone(row.durationMin) === 'orange' ? 'ai-duration-warn' : 'ai-duration-gray'">
                  {{ formatDuration(row.durationMin) }}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <div v-if="isAdmin" class="inspect-surface">
        <SectionHeader title="通知动态">
          <template #actions><button class="btn btn-sm btn-secondary" type="button" @click="goNotifications">查看全部通知</button></template>
        </SectionHeader>
        <ul class="ai-feed">
          <li v-for="(item, i) in notificationsFeed" :key="i" class="ai-feed__item">
            <AiBadge :tone="item.level === '严重' ? 'red' : item.level === '警告' ? 'orange' : 'blue'" :label="item.level" />
            <div class="ai-feed__body">
              <div class="ai-feed__loc">{{ item.page }} · {{ item.location }}</div>
              <div class="ai-feed__meta">{{ item.receiver }} · {{ item.channel }}</div>
            </div>
          </li>
        </ul>
      </div>
    </div>
  </div>
</template>

<style scoped>
.ai-overview { display: flex; flex-direction: column; gap: 16px; width: 100%; min-width: 0; container-type: inline-size; container-name: ai-inspect-page; }
.ai-overview > * { min-width: 0; }
.inspect-surface { background: var(--color-surface); border: 1px solid var(--color-border-subtle); border-radius: var(--radius-lg); padding: 16px 20px; min-width: 0; }
.ai-table-scroll { width: 100%; max-width: 100%; overflow-x: auto; overscroll-behavior-x: contain; }
.ai-table-scroll:focus-visible { outline: 2px solid var(--color-primary); outline-offset: 2px; }

.ai-kpi-grid {
  display: grid;
  grid-template-columns: repeat(5, minmax(0, 1fr));
  gap: 16px;
}
.ai-kpi-card {
  background: var(--color-surface);
  border: 1px solid var(--color-border-subtle);
  border-radius: var(--radius-lg);
  padding: 16px 20px;
  box-shadow: var(--shadow);
}
.ai-kpi-card.clickable { cursor: pointer; transition: box-shadow 0.15s ease, transform 0.15s ease; }
.ai-kpi-card.clickable:hover { box-shadow: var(--shadow-md); transform: translateY(-2px); }
.ai-kpi-head { display: flex; align-items: center; min-width: 0; }
.ai-kpi-card:focus-visible, .ai-rank__row:focus-visible { outline: 2px solid var(--color-primary); outline-offset: 2px; }
.inspect-surface > .content-section-header { margin-bottom: 12px; }
.ai-kpi-label { font-size: 13px; color: var(--color-text-secondary); font-weight: 500; }
.ai-kpi-value { font-size: 30px; font-weight: 700; color: var(--color-text); margin: 8px 0 4px; }
.ai-kpi-compare { font-size: 12px; font-weight: 500; }
.ai-kpi-compare.is-up { color: var(--color-success); }
.ai-kpi-compare.is-down { color: var(--color-danger); }
.ai-kpi-compare.is-flat,
.ai-kpi-compare.is-none { color: var(--color-text-tertiary); }

.ai-grid-2 { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 16px; }
.ai-grid-2.is-ops .ai-span-full { grid-column: 1 / -1; }
.ai-card-note { font-size: 12px; color: var(--color-text-tertiary); background: var(--color-bg); padding: 4px 8px; border-radius: 8px; }

.ai-rank { list-style: none; margin: 0; padding: 0; }
.ai-rank__row {
  display: grid;
  grid-template-columns: 28px 1fr auto;
  align-items: center;
  gap: 12px;
  padding: 8px 0;
  border-bottom: 1px dashed var(--color-border-subtle);
  cursor: pointer;
}
.ai-rank__row:last-child { border-bottom: none; }
.ai-rank__row:hover .ai-rank__page { color: var(--color-primary); }
.ai-rank__no {
  width: 22px; height: 22px;
  display: inline-flex; align-items: center; justify-content: center;
  border-radius: var(--radius-md);
  background: var(--color-bg);
  color: var(--color-text-tertiary);
  font-size: 12px; font-weight: 700;
}
.ai-rank__no.is-top { background: var(--color-danger-bg); color: var(--color-danger); }
.ai-rank__no.is-top:nth-child(1) { background: var(--color-danger-bg); color: var(--color-danger); }
.ai-rank__page { font-size: 13px; color: var(--color-text); }
.ai-rank__count { font-size: 13px; font-weight: 700; color: var(--color-text); }

.ai-feed { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 12px; }
.ai-feed__item { display: flex; align-items: center; gap: 12px; }
.ai-feed__body { min-width: 0; }
.ai-feed__loc { font-size: 13px; color: var(--color-text); }
.ai-feed__meta { font-size: 12px; color: var(--color-text-tertiary); margin-top: 4px; }

.ai-table { width: 100%; min-width: 620px; border-collapse: collapse; font-size: 13px; }
.ai-table th {
  text-align: left;
  font-weight: 600;
  color: var(--color-text-tertiary);
  font-size: 12px;
  padding: 8px 12px;
  border-bottom: 1px solid var(--color-border-subtle);
}
.ai-table td { padding: 12px; border-bottom: 1px solid var(--color-border-subtle); color: var(--color-text); vertical-align: middle; }
.ai-table__row { cursor: pointer; transition: background 0.12s ease; }
.ai-table__row:hover { background: var(--color-primary-subtle); }
.ai-mono { font-family: ui-monospace, SFMono-Regular, Menlo, monospace; color: var(--color-text-secondary); font-size: 12px; }
.ai-cell-strong { font-weight: 500; }
.ai-cell-sub { font-size: 12px; color: var(--color-text-tertiary); margin-top: 4px; }
.ai-duration-warn { color: var(--color-warning); font-weight: 600; }
.ai-duration-gray { color: var(--color-text-tertiary); }

@container ai-inspect-page (max-width: 1039px) {
  .ai-kpi-grid { grid-template-columns: repeat(3, minmax(0, 1fr)); }
  .ai-grid-2 { grid-template-columns: 1fr; }
}
@container ai-inspect-page (max-width: 719px) {
  .ai-kpi-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
}
@container ai-inspect-page (max-width: 719px) {
  .inspect-page-header { flex-direction: column; align-items: stretch; }
  .inspect-page-header :deep(.content-page-header__heading) { flex-basis: auto; }
  .inspect-page-header :deep(.content-page-header__actions) { justify-content: flex-start; }
}
</style>

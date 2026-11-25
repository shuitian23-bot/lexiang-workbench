<script setup lang="ts">
import { computed } from 'vue'
import SectionHeader from '@/components/content/SectionHeader.vue'
import FeedbackState from '@/components/content/FeedbackState.vue'
import { getUsageRankings } from '@/domain/usageRankings.js'

type RankingRow = { id: string; name: string; creator?: string; calls: number | null; successRate: number | null }
const props = withDefaults(defineProps<{ rows: RankingRow[]; scopeLabel: string; allowDetail?: boolean }>(), { allowDetail: true })
const emit = defineEmits<{ 'open-detail': [id: string]; 'view-all': [] }>()
const n = (value: number) => value.toLocaleString('zh-CN')
const count = (row: RankingRow, key: 'calls' | 'successRate') => row[key] ?? 0
const rankings = computed(() => {
  const result = getUsageRankings(props.rows)
  const threshold = result.medianCalls == null ? '无有效调用次数' : `调用次数 > ${n(result.medianCalls)}（本周期中位数）`
  return [
    { key: 'calls' as const, title: 'Skill调用排行', rows: result.calls, empty: '暂无Skill调用', description: '按调用次数降序 · Top 10', emptyDescription: '仅对所选范围内已提供且大于零的调用次数排行。' },
    { key: 'successRate' as const, title: 'Skill执行成功率排行', rows: result.successRate, empty: '暂无符合条件的Skill', description: `${threshold} · 按执行成功率从低到高 · 取前 10`, emptyDescription: '仅调用次数严格超过中位数且执行成功率可计算的Skill参与；等于中位数的不参与。' }
  ]
})
</script>

<template>
  <div class="usage-overview-rankings" data-flow-role="main">
    <div class="usage-rank-toolbar"><p>{{ scopeLabel }}</p><button v-if="allowDetail" type="button" class="btn btn-secondary" @click="emit('view-all')">查看Skill明细</button></div>
    <div class="usage-rank-grid">
      <section v-for="ranking in rankings" :key="ranking.key" class="usage-rank-surface">
        <SectionHeader :title="ranking.title" :description="ranking.description" :heading-level="3" />
        <ol v-if="ranking.rows.length" class="usage-rank-list">
          <li v-for="(row, index) in ranking.rows" :key="row.id">
            <component :is="allowDetail ? 'button' : 'div'" :type="allowDetail ? 'button' : undefined" class="usage-rank-row" :class="{ 'is-readonly': !allowDetail }" :aria-label="`${row.name}（创建人${row.creator || '未标注'}）${ranking.title}${allowDetail ? '明细' : ''}`" @click="allowDetail && emit('open-detail', row.id)">
              <span class="usage-rank-position">{{ index + 1 }}</span>
              <span class="usage-rank-main"><span class="usage-rank-identity"><span class="usage-rank-name" :title="row.name">{{ row.name }}</span><span class="usage-rank-creator" :title="`创建人：${row.creator || '未标注'}`">（{{ row.creator || '未标注' }}）</span></span><span class="usage-rank-track" aria-hidden="true"><i :style="{ width: `${count(row, ranking.key) / (ranking.key === 'successRate' ? 1 : (count(ranking.rows[0], ranking.key) || 1)) * 100}%` }"></i></span></span>
              <strong>{{ ranking.key === 'successRate' ? `${(count(row, ranking.key) * 100).toFixed(1)}%` : n(count(row, ranking.key)) }}<small v-if="ranking.key === 'calls'"> 次</small><small v-else class="usage-rank-volume">{{ n(row.calls ?? 0) }}次调用</small></strong>
            </component>
          </li>
        </ol>
        <FeedbackState v-else state="empty" :title="ranking.empty" :description="ranking.emptyDescription" />
      </section>
    </div>
  </div>
</template>

<style scoped>
.usage-overview-rankings { display: grid; gap: var(--space-3, 12px); min-width: 0; }
.usage-rank-toolbar { display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: var(--space-2, 8px); }
.usage-rank-toolbar p { margin: 0; color: var(--color-text-secondary); font-size: var(--text-xs, 12px); }
.usage-rank-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: var(--space-4, 16px); min-width: 0; }
.usage-rank-surface { display: grid; align-content: start; gap: var(--space-4, 16px); min-width: 0; padding: var(--space-4, 16px); border: 1px solid var(--color-border-subtle); border-radius: var(--radius-lg); background: var(--color-surface); }
.usage-rank-list { display: grid; gap: var(--space-3, 12px); padding: 0; margin: 0; list-style: none; }
.usage-rank-row { display: flex; align-items: center; gap: var(--space-2, 8px); width: 100%; min-width: 0; padding: var(--space-1, 4px) 0; border: 0; border-radius: var(--radius-sm); background: transparent; color: var(--color-text); font: inherit; text-align: left; cursor: pointer; }
.usage-rank-row:hover { background: var(--color-bg-subtle); }
.usage-rank-row.is-readonly { cursor: default; }
.usage-rank-row.is-readonly:hover { background: transparent; }
.usage-rank-position { flex: none; color: var(--color-text-secondary); font-variant-numeric: tabular-nums; }
.usage-rank-main { display: grid; flex: 1; gap: var(--space-2, 8px); min-width: 0; }
.usage-rank-identity { display: flex; align-items: baseline; gap: var(--space-1, 4px); min-width: 0; }
.usage-rank-name { min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.usage-rank-creator { flex: none; color: var(--color-text-secondary); font-size: var(--text-xs, 12px); white-space: nowrap; }
.usage-rank-track { display: block; height: var(--space-1, 4px); overflow: hidden; border-radius: var(--radius-pill, 9999px); background: var(--color-primary-subtle); }
.usage-rank-track i { display: block; height: 100%; border-radius: inherit; background: var(--chart-1, var(--color-primary)); }
.usage-rank-row strong { flex: none; font-weight: 600; font-variant-numeric: tabular-nums; }
.usage-rank-row small { color: var(--color-text-secondary); font-size: var(--text-xs, 12px); font-weight: 400; }
.usage-rank-volume { display: block; }
.usage-rank-row:focus-visible { outline: 2px solid var(--color-primary); outline-offset: 2px; }
@container (max-width: 1039px) { .usage-rank-grid { grid-template-columns: 1fr; } }
</style>

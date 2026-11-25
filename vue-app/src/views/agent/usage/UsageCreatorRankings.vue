<script setup lang="ts">
import { computed } from 'vue'
import SectionHeader from '@/components/content/SectionHeader.vue'
import DataTable from '@/components/content/DataTable.vue'
import FeedbackState from '@/components/content/FeedbackState.vue'

type CreatorRow = { id: string; name: string; createdSkills?: number | null; skillCount?: number | null; calledSkills?: number | null; calls: number | null; successRate: number | null }
const props = defineProps<{ rows: CreatorRow[]; scopeLabel: string; currentCreatorId?: string | null; allowGlobal?: boolean }>()
const emit = defineEmits<{ 'open-detail': [id: string]; 'view-all': [] }>()
const rows = computed(() => [...props.rows].sort((a, b) => (b.calls ?? -1) - (a.calls ?? -1) || a.id.localeCompare(b.id)).map((row, index) => ({ ...row, position: row.calls == null ? '—' : index + 1, total: row.createdSkills === undefined ? row.skillCount : row.createdSkills })))
const n = (value: number | null | undefined) => value == null ? '—' : value.toLocaleString('zh-CN')
const rate = (value: number | null) => value == null ? '—' : `${(value * 100).toFixed(1)}%`
const columns = [
  { key: 'position', label: '排名', width: '72px' }, { key: 'name', label: '创建人 IT Code', width: '200px' },
  { key: 'total', label: '创建总量', width: '100px', align: 'right' as const }, { key: 'calledSkills', label: '被调用Skill数', width: '120px', align: 'right' as const },
  { key: 'calls', label: '调用次数', width: '112px', align: 'right' as const }, { key: 'successRate', label: '执行成功率', width: '112px', align: 'right' as const }, { key: 'actions', label: '操作', width: '100px' }
]
function open(id: string) { if (props.allowGlobal || id === props.currentCreatorId) emit('open-detail', id) }
</script>

<template>
  <section class="usage-creator-rankings" data-flow-role="main">
    <SectionHeader title="创建人调用贡献排行" :heading-level="3" :description="`${scopeLabel} · 按旗下Skill调用次数降序 · 全量 ${rows.length} 位`"><template #actions><button type="button" class="btn btn-secondary" @click="emit('view-all')">{{ allowGlobal ? '查看创建人明细' : '查看我的贡献' }}</button></template></SectionHeader>
    <DataTable v-if="rows.length" :columns="columns" :rows="rows" row-key="id" caption="全量创建人旗下Skill调用贡献排行" density="default">
      <template #cell-name="{ row }"><span class="usage-creator-code">{{ row.id.startsWith('sample.') ? row.id : row.name }}</span><span v-if="row.id === currentCreatorId" class="usage-creator-self">本人</span></template>
      <template #cell-total="{ row }"><span :title="row.total == null ? '来源未提供创建人全量Skill资产' : '截至所选截止日线上开启的Skill，含未被调用项'">{{ n(row.total) }}</span></template>
      <template #cell-calledSkills="{ row }">{{ n(row.calledSkills) }}</template><template #cell-calls="{ row }">{{ n(row.calls) }}</template><template #cell-successRate="{ row }">{{ rate(row.successRate) }}</template>
      <template #cell-actions="{ row }"><button v-if="allowGlobal || row.id === currentCreatorId" type="button" class="usage-creator-link" :aria-label="`查看创建人${row.name}贡献明细`" @click="open(row.id)">查看明细</button><span v-else class="usage-creator-muted">—</span></template>
    </DataTable>
    <FeedbackState v-else state="empty" title="暂无创建人贡献数据" description="所选范围未提供明确创建人归属，缺失数据不作零贡献。" />
    <p class="usage-creator-note">按创建人旗下 Skill 的调用贡献统计，非本人使用次数。来源未提供完整创建总量时显示“—”；未覆盖的创建人不补造记录。</p>
  </section>
</template>

<style scoped>
.usage-creator-rankings { display: grid; gap: var(--space-4, 16px); min-width: 0; padding: var(--space-4, 16px); border: 1px solid var(--color-border-subtle); border-radius: var(--radius-lg); background: var(--color-surface); }
.usage-creator-code { overflow-wrap: anywhere; }
.usage-creator-self { margin-left: var(--space-2, 8px); color: var(--color-primary); font-size: var(--text-xs, 12px); }
.usage-creator-note, .usage-creator-muted { margin: 0; color: var(--color-text-secondary); font-size: var(--text-xs, 12px); line-height: 1.65; }
.usage-creator-link { padding: var(--space-1, 4px); border: 0; background: transparent; color: var(--color-primary); font: inherit; cursor: pointer; }
.usage-creator-link:focus-visible { outline: 2px solid var(--color-primary); outline-offset: 2px; }
</style>

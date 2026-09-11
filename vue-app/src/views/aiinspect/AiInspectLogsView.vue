<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useAppStore } from '@/stores/app'
import { isAiInspectAdmin } from '@/services/aiInspectAccess'
import ContentPageHeader from '@/components/content/ContentPageHeader.vue'
import { logRecords, type LogLevel } from '@/services/aiInspect'
import AiBadge from '@/components/aiinspect/AiBadge.vue'

const appStore = useAppStore()
const isAdmin = computed(() => isAiInspectAdmin(appStore.role, appStore.permissions))

const levelFilter = ref<'全部' | 'info' | 'warn' | 'error'>('全部')
const levelOptions = [
  { value: '全部', label: '全部级别' },
  { value: 'info', label: '信息' },
  { value: 'warn', label: '警告' },
  { value: 'error', label: '错误' }
] as const

const rows = computed(() => logRecords.filter((r) => levelFilter.value === '全部' || r.level === levelFilter.value))

function levelTone(level: LogLevel): 'green' | 'orange' | 'red' {
  if (level === 'info') return 'green'
  if (level === 'warn') return 'orange'
  return 'red'
}
function levelLabel(level: LogLevel): string {
  return level === 'info' ? '信息' : level === 'warn' ? '警告' : '错误'
}

onMounted(() => {
  appStore.ensureStaticTab('aiinspect.logs')
  appStore.setActiveStaticTab('aiinspect.logs')
  document.title = 'AI 巡检 · 运行日志'
})
</script>

<template>
  <div class="ai-logs">
    <ContentPageHeader class="inspect-page-header" title="运行日志" description="系统运行记录 · 仅管理员可见">
      <template #actions>
        <select v-model="levelFilter" class="ai-select">
          <option v-for="opt in levelOptions" :key="opt.value" :value="opt.value">{{ opt.label }}</option>
        </select>
      </template>
    </ContentPageHeader>

    <div v-if="!isAdmin" class="ai-noauth inspect-surface">
      <div class="ai-noauth__icon">🔒</div>
      <p>运行日志仅对管理员开放，当前账号无查看权限。</p>
    </div>

    <template v-else>
      <div class="inspect-surface">
        <div class="ai-table-scroll" role="region" aria-label="巡检数据表格" tabindex="0">
          <table class="ai-table">
            <colgroup>
              <col class="ai-logs__time-col" />
              <col class="ai-logs__level-col" />
              <col />
            </colgroup>
            <thead>
              <tr>
                <th>时间</th>
                <th>级别</th>
                <th>消息</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(r, i) in rows" :key="i">
                <td class="ai-mono">{{ r.time }}</td>
                <td><AiBadge :tone="levelTone(r.level)" :label="levelLabel(r.level)" /></td>
                <td class="inspect-log-message">{{ r.message }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </template>
  </div>
</template>

<style scoped>
.ai-logs { display: flex; flex-direction: column; gap: 16px; width: 100%; min-width: 0; container-type: inline-size; container-name: ai-inspect-page; }
.ai-logs > * { min-width: 0; }
.inspect-surface { background: var(--color-surface); border: 1px solid var(--color-border-subtle); border-radius: var(--radius-lg); padding: 16px 20px; min-width: 0; }
.ai-table-scroll { width: 100%; max-width: 100%; overflow-x: auto; overscroll-behavior-x: contain; }
.ai-table-scroll:focus-visible { outline: 2px solid var(--color-primary); outline-offset: 2px; }
.ai-select { min-height: 36px; max-width: 100%; padding: 8px 12px; border: 1px solid var(--color-border); border-radius: var(--radius-md); font-size: 13px; background: var(--color-surface); color: var(--color-text); }

.ai-table { width: 100%; min-width: 620px; table-layout: fixed; border-collapse: collapse; font-size: 13px; }
.ai-table th { text-align: left; font-weight: 600; color: var(--color-text-tertiary); font-size: 12px; padding: 12px 12px; border-bottom: 1px solid var(--color-border-subtle); }
.ai-table td { padding: 12px; border-bottom: 1px solid var(--color-border-subtle); color: var(--color-text); vertical-align: top; }
.ai-logs__time-col { width: 184px; }
.ai-logs__level-col { width: 92px; }
.ai-mono { font-family: ui-monospace, SFMono-Regular, Menlo, monospace; color: var(--color-text-secondary); font-size: 12px; white-space: nowrap; }
.inspect-log-message { color: var(--color-text); line-height: 1.6; overflow-wrap: anywhere; }

.ai-noauth { text-align: center; padding: 48px 20px; color: var(--color-text-tertiary); }
.ai-noauth__icon { font-size: 30px; margin-bottom: 12px; }
.ai-noauth p { font-size: 13px; }
@container ai-inspect-page (max-width: 719px) {
  .inspect-page-header { flex-direction: column; align-items: stretch; }
  .inspect-page-header :deep(.content-page-header__heading) { flex-basis: auto; }
  .inspect-page-header :deep(.content-page-header__actions) { justify-content: flex-start; }
}
</style>

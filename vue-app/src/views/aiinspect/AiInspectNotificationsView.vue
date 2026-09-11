<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useAppStore } from '@/stores/app'
import { isAiInspectAdmin } from '@/services/aiInspectAccess'
import ContentPageHeader from '@/components/content/ContentPageHeader.vue'
import { notificationRecords, type InspectLevel } from '@/services/aiInspect'
import AiBadge from '@/components/aiinspect/AiBadge.vue'

const appStore = useAppStore()
const isAdmin = computed(() => isAiInspectAdmin(appStore.role, appStore.permissions))

const levelFilter = ref<'全部等级' | InspectLevel>('全部等级')
const levelOptions = ['全部等级', '严重', '警告', '提示'] as const

const rows = computed(() =>
  notificationRecords.filter((r) => levelFilter.value === '全部等级' || r.level === levelFilter.value)
)

onMounted(() => {
  appStore.ensureStaticTab('aiinspect.notifications')
  appStore.setActiveStaticTab('aiinspect.notifications')
  document.title = 'AI 巡检 · 通知记录'
})
</script>

<template>
  <div class="ai-notify">
    <ContentPageHeader class="inspect-page-header" title="通知记录" description="巡检异常通知派发记录 · 仅管理员可见">
      <template #actions>
        <select v-model="levelFilter" class="ai-select">
          <option v-for="opt in levelOptions" :key="opt" :value="opt">
            {{ opt === '严重' ? '严重 P0' : opt === '警告' ? '警告 P1' : opt === '提示' ? '提示 P2' : '全部等级' }}
          </option>
        </select>
      </template>
    </ContentPageHeader>

    <div v-if="!isAdmin" class="ai-noauth inspect-surface">
      <div class="ai-noauth__icon">🔒</div>
      <p>通知记录仅对管理员开放，当前账号无查看权限。</p>
    </div>

    <template v-else>
      <div class="inspect-surface">
        <div class="ai-table-scroll" role="region" aria-label="巡检数据表格" tabindex="0">
          <table class="ai-table">
            <thead>
              <tr>
                <th>时间</th>
                <th>任务</th>
                <th>页面 / 位置</th>
                <th>等级</th>
                <th>通知人</th>
                <th>渠道</th>
                <th>状态</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(r, i) in rows" :key="i">
                <td class="ai-mono">{{ r.time }}</td>
                <td class="ai-mono">{{ r.taskId }}</td>
                <td>
                  <div class="ai-cell-strong">{{ r.page }}</div>
                  <div class="ai-cell-sub">{{ r.location }}</div>
                </td>
                <td><AiBadge :tone="r.level === '严重' ? 'red' : r.level === '警告' ? 'orange' : 'blue'" :label="r.level" /></td>
                <td>
                  <span v-for="name in r.receivers" :key="name" class="ai-person">{{ name }}</span>
                </td>
                <td>{{ r.channel }}</td>
                <td><AiBadge tone="green" :label="r.status" /></td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
      <p class="ai-tip">
        通知派发规则：巡检产生 严重 / 警告 / 提示 异常时，自动派发至该任务配置的对应等级通知人，未单独配置则回退全局默认（设置中维护）。正常不通知。
      </p>
    </template>
  </div>
</template>

<style scoped>
.ai-notify { display: flex; flex-direction: column; gap: 16px; width: 100%; min-width: 0; container-type: inline-size; container-name: ai-inspect-page; }
.ai-notify > * { min-width: 0; }
.inspect-surface { background: var(--color-surface); border: 1px solid var(--color-border-subtle); border-radius: var(--radius-lg); padding: 16px 20px; min-width: 0; }
.ai-table-scroll { width: 100%; max-width: 100%; overflow-x: auto; overscroll-behavior-x: contain; }
.ai-table-scroll:focus-visible { outline: 2px solid var(--color-primary); outline-offset: 2px; }
.ai-select { min-height: 36px; max-width: 100%; padding: 8px 12px; border: 1px solid var(--color-border); border-radius: var(--radius-md); font-size: 13px; background: var(--color-surface); color: var(--color-text); }

.ai-table { width: 100%; min-width: 850px; border-collapse: collapse; font-size: 13px; }
.ai-table th { text-align: left; font-weight: 600; color: var(--color-text-tertiary); font-size: 12px; padding: 12px 12px; border-bottom: 1px solid var(--color-border-subtle); }
.ai-table td { padding: 12px; border-bottom: 1px solid var(--color-border-subtle); color: var(--color-text); vertical-align: middle; }
.ai-mono { font-family: ui-monospace, SFMono-Regular, Menlo, monospace; color: var(--color-text-secondary); font-size: 12px; }
.ai-cell-strong { font-weight: 500; }
.ai-cell-sub { font-size: 12px; color: var(--color-text-tertiary); margin-top: 4px; }
.ai-person { display: inline-block; margin: 0 4px 4px 0; padding: 4px 8px; border-radius: 9999px; background: var(--color-primary-subtle); color: var(--color-primary); font-size: 12px; }
.ai-tip { font-size: 12px; color: var(--color-text-tertiary); line-height: 1.7; margin: 0; }

.ai-noauth { text-align: center; padding: 48px 20px; color: var(--color-text-tertiary); }
.ai-noauth__icon { font-size: 30px; margin-bottom: 12px; }
.ai-noauth p { font-size: 13px; }
@container ai-inspect-page (max-width: 719px) {
  .inspect-page-header { flex-direction: column; align-items: stretch; }
  .inspect-page-header :deep(.content-page-header__heading) { flex-basis: auto; }
  .inspect-page-header :deep(.content-page-header__actions) { justify-content: flex-start; }
}
</style>

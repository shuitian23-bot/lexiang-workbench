<script setup lang="ts">
import { ref } from 'vue'
import AiModal from './AiModal.vue'
import { loadPocReleaseLedger, type PocReleaseLedgerRecord } from '@/services/pocReleaseLedger'

const open = ref(false)
const record = ref<PocReleaseLedgerRecord | null>(null)
const environments = [{ key: 'new', label: 'new 预览' }, { key: 'formal', label: '正式环境' }] as const

async function showRecord() {
  open.value = true
  const ledger = await loadPocReleaseLedger()
  record.value = ledger.records['aiinspect-menu-merge-20260911'] ?? null
}
</script>

<template>
  <button class="btn btn-secondary" type="button" @click="showRecord">更新记录</button>
  <AiModal v-model="open" title="AI 巡检更新记录">
    <p class="release-description">接入数据总览、巡检规则、问题处理、通知记录和运行日志，使用模拟数据展示巡检流程。</p>
    <section v-for="env in environments" :key="env.key" class="release-environment">
      <h4>{{ env.label }}</h4>
      <dl v-if="record?.releases[env.key]">
        <dt>发布人</dt><dd>{{ record.releases[env.key]?.publisher }}</dd>
        <dt>发布时间</dt><dd>{{ record.releases[env.key]?.releasedAt }}</dd>
        <dt>版本</dt><dd>{{ record.releases[env.key]?.version }}</dd>
      </dl>
      <p v-else>尚无发布记录</p>
    </section>
  </AiModal>
</template>

<style scoped>
.release-description { margin: 0 0 16px; color: var(--color-text-secondary); }
.release-environment + .release-environment { margin-top: 16px; padding-top: 16px; border-top: 1px solid var(--color-border-subtle); }
.release-environment h4 { margin: 0 0 8px; font-size: var(--text-base, 14px); }
.release-environment p { margin: 0; color: var(--color-text-secondary); }
.release-environment dl { display: grid; grid-template-columns: auto minmax(0, 1fr); gap: 8px 16px; margin: 0; font-size: var(--text-sm, 12px); }
.release-environment dt { color: var(--color-text-secondary); }
.release-environment dd { margin: 0; overflow-wrap: anywhere; }
</style>

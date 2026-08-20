<template>
  <div v-if="visible" class="permission-modal permission-scope-picker-modal" @click.self="$emit('close')" @keydown.esc="$emit('close')">
    <section ref="dialog" class="modal-panel" role="dialog" aria-modal="true" aria-labelledby="data-picker-title" tabindex="-1" @keydown.tab="trapFocus">
      <button type="button" class="modal-close" aria-label="关闭" @click="$emit('close')">×</button>
      <h3 id="data-picker-title">选择数据权限</h3>
      <p class="modal-note">数据集按门户工作台一级目录展示；点击目录右侧放大镜，可只搜索该目录下的数据集。复制带入的数据权限保持锁定。</p>
      <div class="data-directory-picker">
        <PermissionDataDirectoryList
          :directories="directories"
          :selected-ids="selectedIds"
          :disabled-ids="lockedIds"
          :source-labels="lockedLabels"
          @toggle="$emit('toggle', $event)"
        />
      </div>
      <footer class="modal-actions">
        <button type="button" class="secondary-btn" @click="$emit('close')">取消</button>
        <button type="button" class="primary-btn" @click="$emit('confirm')">确认</button>
      </footer>
    </section>
  </div>
</template>

<script setup lang="ts">
import { nextTick, ref, watch } from 'vue'
import PermissionDataDirectoryList, { type DataPermissionDirectory } from './PermissionDataDirectoryList.vue'

const props = withDefaults(defineProps<{
  visible: boolean
  directories: DataPermissionDirectory[]
  selectedIds: string[]
  lockedIds: string[]
  lockedLabels?: Record<string, string>
}>(), { lockedLabels: () => ({}) })

const dialog = ref<HTMLElement | null>(null)
let returnFocus: HTMLElement | null = null

defineEmits<{
  close: []
  confirm: []
  toggle: [id: string]
}>()

watch(() => props.visible, async (visible) => {
  if (!visible) {
    returnFocus?.focus()
    returnFocus = null
    return
  }
  returnFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null
  await nextTick()
  dialog.value?.querySelector<HTMLElement>('.directory-search-trigger')?.focus()
})

function trapFocus(event: KeyboardEvent) {
  const focusable = [...(dialog.value?.querySelectorAll<HTMLElement>('button:not(:disabled), input:not(:disabled)') || [])]
  if (!focusable.length) return
  const first = focusable[0]
  const last = focusable[focusable.length - 1]
  if (event.shiftKey && document.activeElement === first) {
    event.preventDefault()
    last.focus()
  } else if (!event.shiftKey && document.activeElement === last) {
    event.preventDefault()
    first.focus()
  }
}
</script>

<style scoped>
.permission-modal.permission-scope-picker-modal { position: fixed; inset: 0; z-index: 1400; display: grid; place-items: center; overflow-y: auto; padding: 24px; background: rgba(17, 24, 39, .25); backdrop-filter: blur(8px); }
.modal-panel { position: relative; box-sizing: border-box; width: min(820px, 100%); max-height: min(720px, calc(100vh - 48px)); overflow: auto; border: 1px solid #dfe7f3; border-radius: 8px; padding: 24px; background: #fff; box-shadow: 0 24px 70px rgba(15, 23, 42, .18); }
h3 { margin: 0; color: #172033; font-size: 20px; }
.modal-note { margin: 7px 42px 0 0; color: #667085; font-size: 13px; line-height: 1.6; }
.modal-close { position: absolute; top: 14px; right: 14px; width: 34px; height: 34px; border: 1px solid #d8e1ee; border-radius: 8px; background: #fff; color: #667085; font-size: 20px; cursor: pointer; }
.data-directory-picker { max-height: 520px; margin-top: 14px; overflow: auto; }
.modal-actions { display: flex; justify-content: flex-start; gap: 10px; margin-top: 18px; border-top: 1px solid #e6edf5; padding-top: 14px; }
.primary-btn, .secondary-btn { min-height: 38px; border-radius: 8px; padding: 0 18px; font-weight: 800; cursor: pointer; }
.primary-btn { border: 1px solid #316dff; background: #316dff; color: #fff; }
.secondary-btn { border: 1px solid #d8e1ee; background: #fff; color: #455468; }
@media (max-width: 520px) { .permission-modal.permission-scope-picker-modal { padding: 12px; } .modal-panel { max-height: calc(100vh - 24px); padding: 18px; } }
</style>

<template>
  <div v-if="visible" class="permission-modal permission-scope-picker-modal" @click.self="$emit('close')" @keydown.esc="$emit('close')">
    <section ref="dialog" class="modal-panel" role="dialog" aria-modal="true" aria-labelledby="copy-role-title" tabindex="-1" @keydown.tab="trapFocus">
      <button type="button" class="modal-close" aria-label="关闭复制他人角色弹窗" @click="$emit('close')">×</button>
      <h3 id="copy-role-title">复制他人角色</h3>
      <p class="modal-note">复制对方当前有效的角色及角色对应的功能、数据权限，并复制用户单独授权的数据权限；不复制租户、组织和账号资料。复制结果只读。</p>
      <label class="modal-form-field">
        <span>对方 ITCode <em>必填</em></span>
        <input ref="input" :value="itcode" :class="{ invalid: error }" placeholder="例如 wangxt8" @input="updateItcode" @keyup.enter="$emit('confirm')">
        <small v-if="error" class="field-error" role="alert">{{ error }}</small>
      </label>
      <small class="field-help">可试用：wangxt8、liwen08、temp-bpo</small>
      <footer class="modal-actions">
        <button type="button" class="secondary-btn" @click="$emit('close')">取消</button>
        <button type="button" class="primary-btn" @click="$emit('confirm')">确认复制</button>
      </footer>
    </section>
  </div>
</template>

<script setup lang="ts">
import { nextTick, ref, watch } from 'vue'

const props = defineProps<{ visible: boolean; itcode: string; error?: string }>()
const emit = defineEmits<{ close: []; confirm: []; 'update:itcode': [value: string] }>()
const dialog = ref<HTMLElement | null>(null)
const input = ref<HTMLInputElement | null>(null)
let returnFocus: HTMLElement | null = null

watch(() => props.visible, async (visible) => {
  if (!visible) {
    returnFocus?.focus()
    returnFocus = null
    return
  }
  returnFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null
  await nextTick()
  input.value?.focus()
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

function updateItcode(event: Event) {
  emit('update:itcode', (event.target as HTMLInputElement).value.trim())
}
</script>

<style scoped>
.permission-modal.permission-scope-picker-modal { position: fixed; inset: 0; z-index: 1450; display: grid; place-items: center; overflow-y: auto; padding: 24px; background: rgba(31, 35, 41, .45); }
.modal-panel { position: relative; box-sizing: border-box; width: min(560px, 100%); max-height: calc(100vh - 48px); overflow: auto; border: 1px solid var(--color-border, #dde1e6); border-radius: 12px; padding: 24px; background: var(--color-surface, #fff); color: var(--color-text, #1f2329); box-shadow: 0 12px 28px rgba(0, 0, 0, .14); }
h3 { margin: 0; font-size: 20px; }
.modal-note { margin: 7px 42px 0 0; color: var(--color-text-secondary, #646a73); font-size: 13px; line-height: 1.6; }
.modal-close { position: absolute; top: 14px; right: 14px; width: 34px; height: 34px; border: 1px solid var(--color-border, #dde1e6); border-radius: 8px; background: var(--color-surface, #fff); color: var(--color-text-secondary, #646a73); font-size: 20px; cursor: pointer; }
.modal-close:focus-visible, input:focus-visible, button:focus-visible { outline: none; box-shadow: 0 0 0 3px var(--color-primary-subtle, rgba(51, 112, 255, .08)); }
.modal-form-field { display: block; margin-top: 18px; }
.modal-form-field > span { display: block; margin-bottom: 7px; font-size: 13px; font-weight: 700; }
.modal-form-field em { margin-left: 6px; color: var(--color-danger, #dc2626); font-size: 11px; font-style: normal; }
input { box-sizing: border-box; width: 100%; min-height: 36px; border: 1px solid var(--color-border, #dde1e6); border-radius: 8px; padding: 0 12px; background: var(--color-surface, #fff); color: var(--color-text, #1f2329); font: inherit; font-size: 13px; }
input:focus { border-color: var(--color-primary, #3370ff); }
input.invalid { border-color: var(--color-danger, #dc2626); }
.field-help, .field-error { display: block; margin-top: 6px; font-size: 12px; }
.field-help { color: var(--color-text-secondary, #646a73); }
.field-error { color: var(--color-danger, #dc2626); }
.modal-actions { display: flex; justify-content: flex-end; gap: 10px; margin-top: 20px; border-top: 1px solid var(--color-border-subtle, #e7eaee); padding-top: 14px; }
.primary-btn, .secondary-btn { min-height: 36px; border-radius: 8px; padding: 0 16px; font: inherit; font-size: 13px; font-weight: 700; cursor: pointer; }
.primary-btn { border: 1px solid var(--color-primary, #3370ff); background: var(--color-primary, #3370ff); color: #fff; }
.secondary-btn { border: 1px solid var(--color-border, #dde1e6); background: var(--color-surface, #fff); color: var(--color-text, #1f2329); }
</style>

<script setup lang="ts">
import { computed, getCurrentInstance, nextTick, onActivated, onBeforeUnmount, onDeactivated, ref, watch } from 'vue'

const props = defineProps<{
  modelValue: boolean
  title: string
  width?: string
}>()
const emit = defineEmits<{
  (e: 'update:modelValue', value: boolean): void
}>()

const dialog = ref<HTMLElement | null>(null)
const active = ref(true)
const visible = computed(() => active.value && props.modelValue)
const titleId = `ai-inspect-dialog-title-${getCurrentInstance()?.uid}`
let returnFocus: HTMLElement | null = null

function focusableElements() {
  return Array.from(dialog.value?.querySelectorAll<HTMLElement>(
    'button:not([disabled]), a[href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
  ) || []).filter((element) => element.getClientRects().length > 0 && element.getAttribute('aria-hidden') !== 'true')
}

function restoreFocus() {
  const target = returnFocus
  returnFocus = null
  if (target?.isConnected && (dialog.value?.contains(document.activeElement) || document.activeElement === document.body)) {
    target.focus({ preventScroll: true })
  }
}

function close() {
  restoreFocus()
  emit('update:modelValue', false)
}

function onDialogKeydown(event: KeyboardEvent) {
  if (event.key === 'Escape') {
    event.preventDefault()
    event.stopPropagation()
    close()
    return
  }
  if (event.key !== 'Tab') return
  const elements = focusableElements()
  const first = elements[0]
  const last = elements[elements.length - 1]
  if (!first || !last) {
    event.preventDefault()
    dialog.value?.focus()
  } else if (event.shiftKey && (document.activeElement === first || document.activeElement === dialog.value)) {
    event.preventDefault()
    last.focus()
  } else if (!event.shiftKey && (document.activeElement === last || document.activeElement === dialog.value)) {
    event.preventDefault()
    first.focus()
  }
}

watch(visible, async (open) => {
  if (!open) {
    restoreFocus()
    return
  }
  returnFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null
  await nextTick()
  if (visible.value) (focusableElements()[0] || dialog.value)?.focus({ preventScroll: true })
}, { immediate: true })

onActivated(() => { active.value = true })
onDeactivated(() => {
  close()
  active.value = false
})
onBeforeUnmount(restoreFocus)
</script>

<template>
  <Teleport to="body">
    <div v-if="visible" class="ai-modal-mask" @click.self="close">
      <div
        ref="dialog"
        class="ai-modal"
        :style="{ width: width || '560px' }"
        role="dialog"
        aria-modal="true"
        :aria-labelledby="titleId"
        tabindex="-1"
        @keydown="onDialogKeydown"
      >
        <header class="ai-modal__head">
          <h2 :id="titleId" class="ai-modal__title">{{ title }}</h2>
          <button class="ai-modal__close" type="button" aria-label="关闭" @click="close">×</button>
        </header>
        <div class="ai-modal__body">
          <slot />
        </div>
        <footer v-if="$slots.footer" class="ai-modal__foot">
          <slot name="footer" />
        </footer>
      </div>
    </div>
  </Teleport>
</template>

<style scoped>
.ai-modal-mask {
  position: fixed;
  inset: 0;
  box-sizing: border-box;
  background: color-mix(in srgb, var(--color-text) 42%, transparent);
  display: flex;
  align-items: flex-start;
  justify-content: center;
  padding: 48px 16px;
  overflow: auto;
  overscroll-behavior: contain;
  z-index: 1000;
  animation: aiModalMaskIn 160ms ease both;
}
.ai-modal {
  background: var(--color-surface);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-popover);
  max-width: 100%;
  max-height: calc(100dvh - 128px);
  min-width: 0;
  min-height: 0;
  display: flex;
  flex-direction: column;
  container-type: inline-size;
  container-name: ai-inspect-modal;
  animation: aiModalIn 200ms cubic-bezier(0.22, 0.8, 0.28, 1) both;
}
.ai-modal__head {
  display: flex;
  flex-shrink: 0;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 16px 20px;
  border-bottom: 1px solid var(--color-border-subtle);
}
.ai-modal__title {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
  color: var(--color-text);
  overflow-wrap: anywhere;
}
.ai-modal__close {
  flex-shrink: 0;
  border: none;
  background: transparent;
  font-size: 24px;
  line-height: 1;
  color: var(--color-text-tertiary);
  cursor: pointer;
  width: 36px;
  height: 36px;
  border-radius: var(--radius-md);
}
.ai-modal__close:hover { background: var(--color-bg); color: var(--color-text); }
.ai-modal__close:focus-visible { outline: 2px solid var(--color-primary); outline-offset: 2px; }
.ai-modal__body {
  padding: 20px 20px;
  overflow-y: auto;
  overscroll-behavior: contain;
  min-height: 0;
}
.ai-modal__foot {
  display: flex;
  flex-shrink: 0;
  flex-wrap: wrap;
  justify-content: flex-end;
  gap: 8px;
  padding: 16px 20px;
  border-top: 1px solid var(--color-border-subtle);
}
@keyframes aiModalMaskIn { from { opacity: 0; } to { opacity: 1; } }
@keyframes aiModalIn { from { opacity: 0; transform: translateY(8px) scale(0.99); } to { opacity: 1; transform: none; } }
@media (max-height: 600px), (max-width: 719px) {
  .ai-modal-mask { padding: 16px; }
  .ai-modal { max-height: calc(100dvh - 32px); }
}
@media (prefers-reduced-motion: reduce) {
  .ai-modal-mask, .ai-modal { animation: none; }
}
</style>

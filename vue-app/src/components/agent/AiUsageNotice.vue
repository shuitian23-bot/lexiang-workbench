<script setup lang="ts">
import { nextTick, onBeforeUnmount, ref, watch } from 'vue'
import { useAIStore } from '@/stores/ai'

const ai = useAIStore()
const dialog = ref<HTMLDialogElement | null>(null)
const reconsider = ref<HTMLButtonElement | null>(null)
const acknowledge = ref<HTMLButtonElement | null>(null)
let returnFocus: HTMLElement | null = null

watch(() => [ai.usageNoticeOpen, ai.usageNoticeMode] as const, async ([visible]) => {
  if (visible) {
    returnFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null
    await nextTick()
    if (!ai.usageNoticeOpen || !dialog.value) return
    if (!dialog.value.open) dialog.value.showModal()
    ;(ai.usageNoticeMode === 'review' ? acknowledge.value : reconsider.value)?.focus()
  } else {
    dialog.value?.close()
    await nextTick()
    if (ai.open && ai.usageNoticeMode === 'consent') document.querySelector<HTMLElement>('#ai-input')?.focus({ preventScroll: true })
    else returnFocus?.focus({ preventScroll: true })
    returnFocus = null
  }
})

onBeforeUnmount(() => dialog.value?.close())
</script>

<template>
  <Teleport to="body">
    <dialog
      ref="dialog"
      class="ai-usage-notice"
      aria-labelledby="ai-usage-notice-title"
      aria-describedby="ai-usage-notice-content"
      aria-modal="true"
      @cancel.prevent="ai.dismissUsageNotice()"
    >
      <div class="ai-usage-notice__layout">
        <header class="ai-usage-notice__header">
          <h2 id="ai-usage-notice-title">使用提示</h2>
          <button type="button" class="ai-usage-notice__close" aria-label="关闭使用提示" @click="ai.dismissUsageNotice()">
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" aria-hidden="true">
              <path d="m5 5 10 10M15 5 5 15" />
            </svg>
          </button>
        </header>
        <div id="ai-usage-notice-content" class="ai-usage-notice__body" tabindex="0">
          <p class="ai-usage-notice__item">1. 使用联想门户工作台服务前，请您了解《<a class="ai-usage-notice__link" href="https://myhub.lenovo.com/sites/compliance/corporate_policies/Pages/policy27" target="_blank" rel="noopener noreferrer">联想人工智能（AI）政策</a>》及《<a class="ai-usage-notice__link" href="https://myhub.lenovo.com/sites/legal/Pages/cn/Privacy.aspx" target="_blank" rel="noopener noreferrer">员工隐私声明</a>》的相关要求及说明。</p>
          <p class="ai-usage-notice__item">2. 人工智能生成的内容可能存在错误，使用前请仔细甄别，请勿直接将生成内容对外发布或进行商业使用。</p>
          <p class="ai-usage-notice__item">3. 使用联想门户工作台服务时，您应遵守相关法律法规及联想公司政策的相关要求，不得使用该服务生成或传播违法违规、侵权或损害公司声誉的内容。</p>
          <p class="ai-usage-notice__item">4. 联想门户工作台服务生成的内容不应被视为联想的直接最终产品(或组成部分)，也不应未经处理纳入研发流程。特别是针对有价值的技术资料，如源代码、创新或发明等，更应谨慎对待。</p>
          <p class="ai-usage-notice__item">5. 联想门户工作台服务基于开源模型，所生成的内容可能涉及与第三方知识产权有关的风险。您应承担审慎评估的责任，并确保内容的合理使用。</p>
          <strong class="ai-usage-notice__disclosure">为提高和改善我们的乐享门户工作台服务，我们会收集您的ITCode和输入输出信息。</strong>
        </div>
        <footer class="ai-usage-notice__footer">
          <button v-if="ai.usageNoticeMode === 'review'" ref="acknowledge" type="button" class="btn btn-primary" @click="ai.dismissUsageNotice()">我知道了</button>
          <template v-else>
            <button ref="reconsider" type="button" class="btn btn-secondary" @click="ai.dismissUsageNotice()">再想想</button>
            <button type="button" class="btn btn-primary" @click="ai.acceptUsageNotice()">同意</button>
          </template>
        </footer>
      </div>
    </dialog>
  </Teleport>
</template>

<style scoped>
.ai-usage-notice {
  width: min(720px, calc(100vw - 48px));
  max-width: none;
  max-height: calc(100dvh - 48px);
  margin: auto;
  padding: 0;
  border: 1px solid var(--color-border-subtle);
  border-radius: var(--radius-lg);
  background: var(--color-surface);
  color: var(--color-text);
  box-shadow: var(--shadow-popover);
  z-index: var(--z-modal, 1100);
  overflow: hidden;
}
.ai-usage-notice::backdrop { background: color-mix(in srgb, var(--color-text) 45%, transparent); z-index: var(--z-overlay, 1050); }
.ai-usage-notice__layout { display: flex; flex-direction: column; max-height: calc(100dvh - 50px); }
.ai-usage-notice__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 16px 24px;
  border-bottom: 1px solid var(--color-border-subtle);
  flex: none;
}
.ai-usage-notice__header h2 { margin: 0; font-size: var(--text-md, 16px); line-height: var(--leading-tight, 1.3); font-weight: 600; }
.ai-usage-notice__close {
  display: grid;
  place-items: center;
  width: 32px;
  height: 32px;
  padding: 0;
  border: 0;
  border-radius: var(--radius-md);
  background: transparent;
  color: var(--color-text-secondary);
  cursor: pointer;
}
.ai-usage-notice__close:hover { background: var(--color-bg); }
.ai-usage-notice__body {
  min-height: 0;
  overflow-y: auto;
  overscroll-behavior: contain;
  padding: 20px 24px;
  font-size: var(--text-base, 14px);
  line-height: var(--leading-relaxed, 1.7);
  color: var(--color-text-secondary);
}
.ai-usage-notice__item { margin: 0; }
.ai-usage-notice__item + .ai-usage-notice__item { margin-top: 16px; }
.ai-usage-notice__link {
  color: var(--color-primary);
  text-decoration: underline;
  text-decoration-thickness: 1px;
  text-underline-offset: 2px;
}
.ai-usage-notice__disclosure {
  display: block;
  margin-top: 20px;
  color: var(--color-text);
  font-weight: 600;
}
.ai-usage-notice__footer {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  padding: 16px 24px;
  border-top: 1px solid var(--color-border-subtle);
  flex: none;
}
.ai-usage-notice__footer .btn { min-width: 88px; height: var(--control-height-md, 36px); font-size: var(--text-sm, 13px); }
.ai-usage-notice :is(button, [tabindex]):focus-visible { outline: 2px solid var(--color-primary); outline-offset: -2px; }
@media (max-width: 719px) {
  .ai-usage-notice { width: calc(100vw - 32px); }
  .ai-usage-notice__header, .ai-usage-notice__body, .ai-usage-notice__footer { padding: 16px; }
}
</style>

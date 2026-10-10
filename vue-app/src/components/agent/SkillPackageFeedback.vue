<template>
  <Teleport v-for="card in cards" :key="card.mountKey" :to="card.element">
    <span class="skill-package-feedback" data-skill-package-feedback role="group" :aria-label="`${card.title}反馈`">
      <button
        type="button"
        class="skill-package-feedback-button"
        data-feedback="up"
        :class="{ 'is-selected': selectionFor(card.key) === 'up' }"
        :disabled="!account"
        :aria-pressed="selectionFor(card.key) === 'up'"
        :aria-label="buttonLabel(card.title, 'up', selectionFor(card.key) === 'up')"
        :title="buttonLabel(card.title, 'up', selectionFor(card.key) === 'up')"
        :data-tooltip="buttonLabel(card.title, 'up', selectionFor(card.key) === 'up')"
        data-tooltip-placement="top"
        @click.stop="choose(card.key, 'up')"
      >
        <svg viewBox="0 0 20 20" width="15" height="15" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6.5 8.3v8.2"/><path d="M3.5 8.8h3v7.4h-3a1 1 0 0 1-1-1V9.8a1 1 0 0 1 1-1Z"/><path d="M6.5 9 10 3.8c.5-.7 1.6-.4 1.6.5v3h3.2a1.6 1.6 0 0 1 1.6 1.9l-1 5.5a2 2 0 0 1-2 1.6H6.5"/></svg>
      </button>
      <button
        type="button"
        class="skill-package-feedback-button"
        data-feedback="down"
        :class="{ 'is-selected': selectionFor(card.key) === 'down' }"
        :disabled="!account"
        :aria-pressed="selectionFor(card.key) === 'down'"
        :aria-label="buttonLabel(card.title, 'down', selectionFor(card.key) === 'down')"
        :title="buttonLabel(card.title, 'down', selectionFor(card.key) === 'down')"
        :data-tooltip="buttonLabel(card.title, 'down', selectionFor(card.key) === 'down')"
        data-tooltip-placement="top"
        @click.stop="choose(card.key, 'down')"
      >
        <svg viewBox="0 0 20 20" width="15" height="15" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M13.5 11.7V3.5"/><path d="M16.5 11.2h-3V3.8h3a1 1 0 0 1 1 1v5.4a1 1 0 0 1-1 1Z"/><path d="M13.5 11 10 16.2c-.5.7-1.6.4-1.6-.5v-3H5.2a1.6 1.6 0 0 1-1.6-1.9l1-5.5a2 2 0 0 1 2-1.6h6.9"/></svg>
      </button>
    </span>
  </Teleport>
</template>

<script setup>
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useAppStore } from '@/stores/app'
import { observeSkillPackageCards } from '@/adapters/legacyWorkbench/skillPackageFeedbackTargets'
import { createSkillPackageFeedbackStore } from '@/services/skillPackageFeedback.js'

const app = useAppStore()
const account = computed(() => typeof app.user === 'string' ? app.user.trim() : '')
const cards = ref([])
const choices = ref({})
const feedbackStore = createSkillPackageFeedbackStore(() => window.localStorage)
let stopObserving = null

function selectionFor(key) {
  return choices.value[key] || null
}

function buttonLabel(title, direction, selected) {
  const action = direction === 'up' ? '赞' : '踩'
  return `${selected ? '取消' : ''}${action}「${title}」`
}

function refreshChoices() {
  const next = {}
  if (account.value) {
    cards.value.forEach(card => { next[card.key] = feedbackStore.read(account.value, card.key) })
  }
  choices.value = next
}

function choose(key, direction) {
  if (!account.value) return
  const result = feedbackStore.toggle(account.value, key, direction)
  if (!result.ok) {
    app.notify('未能保存反馈，请检查浏览器存储权限后重试。')
    return
  }
  choices.value = { ...choices.value, [key]: result.value }
}

function onStorage() {
  refreshChoices()
}

watch([account, cards], refreshChoices)

onMounted(() => {
  stopObserving = observeSkillPackageCards(nextCards => { cards.value = nextCards })
  window.addEventListener('storage', onStorage)
})

onBeforeUnmount(() => {
  stopObserving?.()
  window.removeEventListener('storage', onStorage)
})
</script>

<style scoped>
.skill-package-feedback {
  display: inline-flex;
  align-items: center;
  flex: 0 0 auto;
  gap: 4px;
  margin-left: auto;
  order: 1;
}

.skill-package-feedback-button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex: 0 0 28px;
  width: 28px;
  height: 28px;
  padding: 0;
  border: 1px solid transparent;
  border-radius: 4px;
  background: transparent;
  color: var(--color-text-tertiary);
  cursor: pointer;
}

.skill-package-feedback-button:hover:not(:disabled),
.skill-package-feedback-button.is-selected {
  border-color: var(--color-primary-border);
  background: var(--color-primary-subtle);
  color: var(--color-primary);
}

.skill-package-feedback-button:focus-visible {
  outline: 2px solid var(--color-primary);
  outline-offset: 2px;
}

.skill-package-feedback-button:disabled {
  color: var(--color-text-disabled, var(--color-text-tertiary));
  opacity: .55;
  cursor: not-allowed;
}

:global(#agent-skill-modal.open .agent-skill-card-foot > .skill-package-switch) {
  flex-shrink: 0;
  order: 2;
}
</style>

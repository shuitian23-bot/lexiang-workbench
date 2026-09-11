<script setup lang="ts">
import { computed } from 'vue'

interface BarItem {
  name: string
  severe: number
  warn: number
}

const props = defineProps<{ items: BarItem[] }>()
const emit = defineEmits<{ (e: 'select', name: string): void }>()

const maxTotal = computed(() => Math.max(...props.items.map((i) => i.severe + i.warn), 1))
</script>

<template>
  <div class="ai-bar">
    <div
      v-for="item in items"
      :key="item.name"
      class="ai-bar__row"
      role="button"
      tabindex="0"
      @click="emit('select', item.name)"
      @keyup.enter="emit('select', item.name)"
    >
      <span class="ai-bar__label">{{ item.name }}</span>
      <div class="ai-bar__track">
        <div class="ai-bar__fill" :style="{ width: `${((item.severe + item.warn) / maxTotal) * 100}%` }">
          <span class="ai-bar__seg is-warn" :style="{ width: `${item.warn / Math.max(item.severe + item.warn, 1) * 100}%` }" />
          <span class="ai-bar__seg is-severe" :style="{ width: `${item.severe / Math.max(item.severe + item.warn, 1) * 100}%` }" />
        </div>
      </div>
      <span class="ai-bar__total">{{ item.severe + item.warn }}</span>
    </div>
    <div class="ai-bar__legend">
      <span><i class="ai-bar__dot is-severe" />严重 {{ items.reduce((s, i) => s + i.severe, 0) }}</span>
      <span><i class="ai-bar__dot is-warn" />警告 {{ items.reduce((s, i) => s + i.warn, 0) }}</span>
    </div>
  </div>
</template>

<style scoped>
.ai-bar { display: flex; flex-direction: column; gap: 12px; }
.ai-bar__row {
  display: grid;
  grid-template-columns: 92px 1fr 34px;
  align-items: center;
  gap: 12px;
  cursor: pointer;
}
.ai-bar__row:hover .ai-bar__label { color: var(--color-primary); }
.ai-bar__label { font-size: 12px; color: var(--color-text-secondary); white-space: nowrap; }
.ai-bar__track { height: 18px; background: var(--color-bg); border-radius: var(--radius-md); overflow: hidden; }
.ai-bar__fill { display: flex; height: 100%; border-radius: var(--radius-md); overflow: hidden; transition: width 0.3s ease; }
.ai-bar__seg { height: 100%; }
.ai-bar__seg.is-warn { background: var(--color-warning); }
.ai-bar__seg.is-severe { background: var(--color-danger); }
.ai-bar__total { font-size: 12px; font-weight: 600; color: var(--color-text); text-align: right; }
.ai-bar__legend { display: flex; gap: 16px; font-size: 12px; color: var(--color-text-tertiary); }
.ai-bar__legend span { display: inline-flex; align-items: center; gap: 4px; }
.ai-bar__dot { width: 9px; height: 9px; border-radius: var(--radius-sm); display: inline-block; }
.ai-bar__dot.is-severe { background: var(--color-danger); }
.ai-bar__dot.is-warn { background: var(--color-warning); }
</style>

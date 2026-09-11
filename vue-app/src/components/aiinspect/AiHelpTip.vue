<script setup lang="ts">
defineProps<{ text: string }>()
</script>

<template>
  <span class="ai-help" tabindex="0" :aria-label="text">
    ?
    <span class="ai-help__pop" role="tooltip">{{ text }}</span>
  </span>
</template>

<style scoped>
.ai-help {
  position: relative;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 15px;
  height: 15px;
  margin-left: 8px;
  border-radius: 50%;
  background: var(--color-border-subtle);
  color: var(--color-text-tertiary);
  font-size: 12px;
  font-weight: 700;
  cursor: help;
  vertical-align: middle;
  flex-shrink: 0;
}
.ai-help__pop {
  position: absolute;
  top: calc(100% + 8px);
  left: 50%;
  transform: translateX(-50%);
  width: 220px;
  padding: 8px 12px;
  background: var(--color-text);
  color: var(--color-surface);
  font-size: 12px;
  font-weight: 400;
  line-height: 1.6;
  border-radius: var(--radius-md);
  box-shadow: var(--shadow-md);
  opacity: 0;
  visibility: hidden;
  transition: opacity 0.15s ease, visibility 0.15s ease;
  z-index: 20;
  text-align: left;
}
.ai-help__pop::before {
  content: '';
  position: absolute;
  top: -5px;
  left: 50%;
  transform: translateX(-50%);
  border: 5px solid transparent;
  border-bottom-color: var(--color-text);
}
.ai-help:hover .ai-help__pop,
.ai-help:focus .ai-help__pop {
  opacity: 1;
  visibility: visible;
}
</style>

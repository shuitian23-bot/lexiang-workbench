<script setup lang="ts">
defineProps<{
  tone: 'red' | 'orange' | 'blue' | 'green' | 'gray' | 'purple'
  label: string
  dot?: boolean
}>()
</script>

<template>
  <span class="ai-badge" :class="`is-${tone}`">
    <i v-if="dot" class="ai-badge__dot" />
    {{ label }}
  </span>
</template>

<style scoped>
.ai-badge {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 4px 8px;
  border-radius: 9999px;
  font-size: 12px;
  font-weight: 600;
  line-height: 1.5;
  white-space: nowrap;
}
.ai-badge__dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: currentColor;
}
.is-red { background: var(--color-danger-bg); color: var(--color-danger); }
.is-orange { background: var(--color-warning-bg); color: var(--color-warning); }
.is-blue { background: var(--color-primary-subtle); color: var(--color-primary); }
.is-green { background: var(--color-success-bg); color: var(--color-success); }
.is-gray { background: var(--color-bg); color: var(--color-text-tertiary); }
.is-purple { background: var(--color-purple-bg); color: var(--color-purple); }
</style>

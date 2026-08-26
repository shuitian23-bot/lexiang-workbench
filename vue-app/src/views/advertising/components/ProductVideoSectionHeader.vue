<script setup lang="ts">
import { computed } from 'vue'

const props = withDefaults(
  defineProps<{
    title: string
    description?: string
    headingLevel?: 2 | 3
  }>(),
  { description: undefined, headingLevel: 2 }
)

const headingTag = computed(() => `h${props.headingLevel}` as 'h2' | 'h3')
</script>

<template>
  <header class="section-header">
    <div class="section-header__heading">
      <component :is="headingTag" class="section-header__title">{{ title }}</component>
      <p v-if="description" class="section-header__description">{{ description }}</p>
    </div>
    <div v-if="$slots.actions" class="section-header__actions"><slot name="actions" /></div>
  </header>
</template>

<style scoped>
.section-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  min-width: 0;
}
.section-header__heading {
  min-width: 0;
}
.section-header__title {
  display: flex;
  align-items: center;
  gap: 8px;
  margin: 0;
  color: var(--color-text);
  font-size: 16px;
  font-weight: 700;
  line-height: 1.4;
}
.section-header__title::before {
  width: 4px;
  height: 18px;
  flex: 0 0 4px;
  border-radius: 4px;
  background: var(--color-primary);
  content: '';
}
.section-header__description {
  margin: 4px 0 0 12px;
  color: var(--color-text-secondary);
  font-size: 12px;
  line-height: 1.65;
}
.section-header__actions {
  display: flex;
  flex: 0 1 auto;
  flex-wrap: wrap;
  align-items: center;
  justify-content: flex-end;
  gap: 8px;
  min-width: 0;
}
@container (max-width: 719px) {
  .section-header {
    flex-direction: column;
  }
  .section-header__actions {
    justify-content: flex-start;
  }
}
</style>

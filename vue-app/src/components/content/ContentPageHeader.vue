<script setup lang="ts">
defineProps<{
  title: string
  description?: string
}>()
</script>

<template>
  <header class="content-page-header">
    <div class="content-page-header__heading">
      <h1 class="content-page-header__title">{{ title }}</h1>
      <p v-if="description" class="content-page-header__description">{{ description }}</p>
      <slot name="status" />
    </div>
    <div v-if="$slots.actions" class="content-page-header__actions">
      <slot name="actions" />
    </div>
  </header>
</template>

<style scoped>
.content-page-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px 16px;
  min-width: 0;
  margin: 0;
}

.content-page-header__heading {
  flex: 1 1 320px;
  min-width: 0;
}

.content-page-header__title {
  display: flex;
  align-items: center;
  gap: 8px;
  margin: 0;
  color: var(--color-text);
  font-size: 19px;
  font-weight: 700;
  line-height: 1.35;
}

.content-page-header__title::before {
  box-sizing: border-box;
  flex: 0 0 18px;
  width: 18px;
  height: 18px;
  border: 1px solid var(--color-primary-border);
  border-radius: 6px;
  background: var(--color-primary-subtle);
  box-shadow: inset 0 0 0 5px var(--color-surface);
  content: '';
}

.content-page-header__description {
  margin: 3px 0 0;
  color: var(--color-text-tertiary);
  font-size: 12px;
  line-height: 1.65;
}

.content-page-header__actions {
  display: flex;
  flex: 0 1 auto;
  align-items: center;
  justify-content: flex-end;
  gap: 8px;
  min-width: 0;
  max-width: 100%;
}

@container (max-width: 719px) {
  .content-page-header {
    flex-direction: column;
    align-items: stretch;
  }

  .content-page-header__actions {
    justify-content: flex-start;
  }
}

@media (max-width: 719px) {
  .content-page-header {
    flex-direction: column;
    align-items: stretch;
  }

  .content-page-header__actions {
    justify-content: flex-start;
  }
}
</style>

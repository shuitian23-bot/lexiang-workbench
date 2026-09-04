<script setup lang="ts">
withDefaults(
  defineProps<{
    title: string
    description?: string
    headingLevel?: 2 | 3
  }>(),
  {
    description: '',
    headingLevel: 2
  }
)
</script>

<template>
  <header class="content-section-header">
    <div class="content-section-header__heading">
      <component :is="`h${headingLevel}`" class="content-section-header__title">{{
        title
      }}</component>
      <p v-if="description" class="content-section-header__description">{{ description }}</p>
    </div>
    <div v-if="$slots.meta || $slots.actions" class="content-section-header__aside">
      <div v-if="$slots.meta" class="content-section-header__meta">
        <slot name="meta" />
      </div>
      <div v-if="$slots.actions" class="content-section-header__actions">
        <slot name="actions" />
      </div>
    </div>
  </header>
</template>

<style scoped>
.content-section-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px 16px;
  min-width: 0;
  margin: 0;
}

.content-section-header__heading {
  position: relative;
  flex: 1 1 320px;
  min-width: 0;
  padding-left: 12px;
}

.content-section-header__heading::before {
  position: absolute;
  top: 2px;
  left: 0;
  width: 4px;
  height: 18px;
  border-radius: 4px;
  background: var(--color-primary);
  box-shadow: 0 0 0 3px var(--color-primary-subtle);
  content: '';
}

.content-section-header__title {
  margin: 0;
  color: var(--color-text);
  font-size: 16px;
  font-weight: 700;
  line-height: 1.4;
}

.content-section-header__description {
  margin: 4px 0 0;
  color: var(--color-text-tertiary);
  font-size: 12px;
  line-height: 1.5;
}

.content-section-header__aside,
.content-section-header__actions,
.content-section-header__meta {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
}

.content-section-header__aside {
  flex: 0 1 auto;
  justify-content: flex-end;
}

.content-section-header__meta {
  color: var(--color-text-tertiary);
  font-size: 12px;
  line-height: 1.5;
}

@container (max-width: 719px) {
  .content-section-header,
  .content-section-header__aside {
    align-items: stretch;
    flex-direction: column;
  }

  .content-section-header__aside,
  .content-section-header__actions {
    justify-content: flex-start;
  }
}
</style>

<template>
  <div class="nav-group" :data-group="groupKey">
    <div
      class="nav-item"
      :class="{ active }"
      :data-tip="group.label"
      role="button"
      tabindex="0"
      :aria-expanded="open ? 'true' : 'false'"
      @click="$emit('toggle', groupKey)"
      @keydown.enter.prevent="$emit('toggle', groupKey)"
      @keydown.space.prevent="$emit('toggle', groupKey)"
    >
      <span class="ni" v-html="group.icon"></span>
      <span>{{ group.label }}</span>
      <span class="arrow" :class="{ open }">
        <svg viewBox="0 0 24 24" fill="none">
          <path d="M9 6l6 6-6 6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
      </span>
    </div>

    <div class="nav-sub" :class="{ open }">
      <div
        v-for="(page, pageId) in group.children"
        :key="pageId"
        class="nav-item"
        :class="{ active: currentPageId === pageId }"
        role="button"
        tabindex="0"
        @click="$emit('navigate', page.path, pageId)"
        @keydown.enter.prevent="$emit('navigate', page.path, pageId)"
        @keydown.space.prevent="$emit('navigate', page.path, pageId)"
      >
        <span>{{ page.label }}</span>
      </div>
    </div>
  </div>
</template>

<script setup>
defineProps({
  group: {
    type: Object,
    required: true
  },
  groupKey: {
    type: String,
    required: true
  },
  currentPageId: {
    type: String,
    default: ''
  },
  active: {
    type: Boolean,
    default: false
  },
  open: {
    type: Boolean,
    default: false
  }
})

defineEmits(['toggle', 'navigate'])
</script>

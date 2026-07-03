<template>
  <div class="topbar-breadcrumb" id="breadcrumb">
    <span class="static-tab-group">{{ groupLabel }} /</span>
    <div
      class="static-tabs"
      :class="{ 'is-overflowing': tabsOverflowing }"
      role="tablist"
      aria-label="业务页面页签"
      ref="tabsListEl"
    >
      <button
        v-for="tab in staticTabs"
        :key="tab.id"
        type="button"
        class="static-tab"
        :class="{ active: tab.id === activeStaticTabId }"
        :data-static-tab-id="tab.id"
        role="tab"
        :aria-selected="tab.id === activeStaticTabId ? 'true' : 'false'"
        @click="$emit('activate', tab.id)"
      >
        <span>{{ tab.title }}</span>
        <i
          v-if="staticTabs.length > 1"
          class="static-tab-close"
          role="button"
          tabindex="0"
          title="关闭页签"
          @click.stop="$emit('close', tab.id)"
          @keydown.enter.prevent.stop="$emit('close', tab.id)"
          @keydown.space.prevent.stop="$emit('close', tab.id)"
        >
          <svg viewBox="0 0 16 16" width="12" height="12" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round">
            <path d="M4.5 4.5l7 7M11.5 4.5l-7 7"/>
          </svg>
        </i>
      </button>
    </div>
  </div>
</template>

<script setup>
import { nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'

const props = defineProps({
  groupLabel: {
    type: String,
    default: ''
  },
  staticTabs: {
    type: Array,
    default: () => []
  },
  activeStaticTabId: {
    type: String,
    default: ''
  }
})

defineEmits(['activate', 'close'])

const tabsListEl = ref(null)
const tabsOverflowing = ref(false)
let resizeObserver = null

function updateTabsOverflow() {
  const list = tabsListEl.value
  if (!list) {
    tabsOverflowing.value = false
    return
  }
  tabsOverflowing.value = list.scrollWidth - list.clientWidth > 2
}

function revealActiveTab() {
  nextTick(() => {
    const list = tabsListEl.value
    const active = list?.querySelector('.static-tab.active')
    if (!list || !active) return
    active.scrollIntoView({ block: 'nearest', inline: 'nearest', behavior: 'smooth' })
  })
}

onMounted(() => {
  nextTick(updateTabsOverflow)
  window.addEventListener('resize', updateTabsOverflow)
  if ('ResizeObserver' in window) {
    resizeObserver = new ResizeObserver(updateTabsOverflow)
    if (tabsListEl.value) resizeObserver.observe(tabsListEl.value)
  }
})

onBeforeUnmount(() => {
  window.removeEventListener('resize', updateTabsOverflow)
  resizeObserver?.disconnect()
})

watch(
  () => [props.staticTabs.length, props.staticTabs.map(tab => `${tab.id}:${tab.title}`).join('|')],
  () => nextTick(updateTabsOverflow)
)

defineExpose({ revealActiveTab })
</script>

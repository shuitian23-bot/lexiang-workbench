<template>
  <div class="sidebar-header" @click="$emit('home')" title="返回首页">
    <div class="brand-lockup">
      <img class="logo-full" src="/assets/logo-full.png" alt="联想乐享" />
    </div>
    <img class="logo-icon-img" src="/assets/logo-icon.png" alt="联想乐享" />
    <button
      class="sidebar-collapse-btn"
      :class="{ 'is-collapsed': collapsed, 'is-expanded': !collapsed }"
      :title="collapsed ? '展开侧栏' : '收起侧栏'"
      :aria-label="collapsed ? '展开侧栏' : '收起侧栏'"
      @click.stop="$emit('toggle')"
    >
      <svg viewBox="0 0 20 20" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
        <rect x="2.8" y="3.5" width="14.4" height="13" rx="2.4"/>
        <line x1="8" y1="3.5" x2="8" y2="16.5"/>
        <path d="M13 8 10.9 10 13 12"/>
      </svg>
    </button>
  </div>
</template>

<script setup>
defineProps({
  collapsed: {
    type: Boolean,
    default: false
  }
})

defineEmits(['home', 'toggle'])
</script>

<template>
  <div class="sidebar-footer">
    <div class="user-info" @click="$emit('toggle-user-menu', $event)">
      <div class="user-avatar">{{ userInitial }}</div>
      <div class="user-meta">
        <div class="user-name">{{ user }}</div>
        <div class="user-role">{{ role }}</div>
      </div>
      <span
        class="user-logout"
        title="退出登录"
        @click.stop="$emit('logout')"
      >退出</span>
    </div>

    <div
      v-if="userMenuVisible"
      class="user-menu-popover account-hub-popover open"
      aria-label="账号工作区入口"
      @click.self="$emit('close-user-menu')"
    >
      <div class="account-hub-panel" @click.stop>
        <button type="button" class="account-hub-close" @click="$emit('close-user-menu')" aria-label="关闭">×</button>
        <button type="button" class="account-hub-card primary" @click="$emit('open-skill-create')">
          <span class="account-hub-icon">＋</span>
          <b>创建 Skill</b>
          <small>从业务场景定义新能力、参数、输入输出和审批规则。</small>
        </button>
        <button type="button" class="account-hub-card" @click="$emit('open-skill-manager')">
          <span class="account-hub-icon">◎</span>
          <b>Skill Hub</b>
          <small>查看已提交 Skill 状态，处理审批、发布、启用或禁用。</small>
        </button>
        <button type="button" class="account-hub-card" @click="$emit('open-permission-manager')">
          <span class="account-hub-icon">◇</span>
          <b>权限管理</b>
          <small>管理菜单权限、Skill 权限、数据范围和审批边界。</small>
        </button>
        <button type="button" class="account-hub-card" @click="$emit('open-poc-log')">
          <span class="account-hub-icon">LOG</span>
          <b>调整日志</b>
          <small>查看功能调整记录。仅用于 POC 记录。</small>
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
defineProps({
  user: {
    type: String,
    default: ''
  },
  role: {
    type: String,
    default: ''
  },
  userInitial: {
    type: String,
    default: 'A'
  },
  userMenuVisible: {
    type: Boolean,
    default: false
  }
})

defineEmits([
  'toggle-user-menu',
  'close-user-menu',
  'logout',
  'open-skill-create',
  'open-skill-manager',
  'open-permission-manager',
  'open-poc-log'
])
</script>

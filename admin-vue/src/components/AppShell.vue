<template>
  <!-- 登录屏 -->
  <div class="login-card-wrapper" v-if="!state.loggedIn">
    <div class="login-card">
      <div class="login-logo" style="margin-bottom:40px;">
        <div class="icon">L</div>
        <span>联想乐享</span>
      </div>
      <div class="login-title">登录</div>
      <div class="form-group">
        <label class="form-label">用户名</label>
        <input class="form-input" v-model="loginForm.username" placeholder="admin" autofocus>
      </div>
      <div class="form-group">
        <label class="form-label">密码</label>
        <input class="form-input" type="password" v-model="loginForm.password" placeholder="••••••" @keydown.enter="doLogin">
      </div>
      <div class="login-error" v-show="state.loginError">{{ state.loginError }}</div>
      <button class="btn btn-primary login-btn" @click="doLogin">登录工作台</button>
    </div>
  </div>

  <!-- 三栏布局 -->
  <template v-else>
    <!-- 左侧栏 -->
    <div class="sidebar" :class="{ collapsed: state.sidebarCollapsed }">
      <div class="sidebar-header">
        <div class="brand-lockup">
          <span style="font-size:18px;font-weight:700;color:var(--primary)">乐享</span>
          <span class="brand-suffix">工作台</span>
        </div>
        <button class="sidebar-collapse-btn" @click="toggleSidebar" title="收起侧栏">
          <svg viewBox="0 0 20 20" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect x="2.8" y="3.5" width="14.4" height="13" rx="2.4"/><line x1="8" y1="3.5" x2="8" y2="16.5"/><path d="M13 8 10.9 10 13 12"/></svg>
        </button>
      </div>
      <nav class="sidebar-nav">
        <div
          v-for="(group, groupKey) in MENU_TREE"
          :key="groupKey"
          class="nav-group"
          :class="{ 'is-open': state.openGroups.includes(groupKey) }"
        >
          <div class="nav-group-header" @click="toggleGroup(groupKey)">
            <span class="menu-icon-wrap" v-html="group.icon"></span>
            <span class="nav-group-label">{{ group.label }}</span>
            <svg class="nav-chevron" viewBox="0 0 20 20" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="m6 8 4 4 4-4"/></svg>
          </div>
          <div class="nav-group-children">
            <router-link
              v-for="(page, pageKey) in group.children"
              :key="pageKey"
              :to="pageKeyToPath(pageKey)"
              class="nav-item"
              :class="{ active: currentPageKey === pageKey }"
              @click="onNavClick(pageKey)"
            >{{ page.label }}</router-link>
          </div>
        </div>
      </nav>
      <div class="sidebar-footer">
        <div class="user-info">
          <div class="user-avatar">{{ state.username ? state.username[0].toUpperCase() : 'A' }}</div>
          <div class="user-meta">
            <div class="user-name">{{ state.username || 'admin' }}</div>
            <div class="user-role">管理员</div>
          </div>
          <span class="user-logout" @click="doLogout" title="退出登录">退出</span>
        </div>
      </div>
    </div>

    <!-- 主内容区 -->
    <div class="main">
      <div class="topbar">
        <div class="topbar-breadcrumb">
          <span>门户工作台</span>
          <span v-if="currentPageLabel"> / {{ currentGroupLabel }}</span>
          <span v-if="currentPageLabel"> / {{ currentPageLabel }}</span>
        </div>
        <div class="topbar-right">
          <button type="button" class="topbar-icon-btn" @click="toggleAI" title="AI 助手">
            <svg viewBox="0 0 20 20" width="15" height="15" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M10 2.8v2.4M5.8 5.1 4.5 3.8M14.2 5.1l1.3-1.3"/><rect x="4" y="6" width="12" height="9" rx="3"/><path d="M7.5 10h.01M12.5 10h.01M8 13h4"/></svg>
            <span>AI 助手</span>
          </button>
        </div>
      </div>
      <div class="page-content">
        <router-view />
      </div>
    </div>

    <!-- 右侧 AI panel（占位，后续接入） -->
    <div class="ai-panel" v-show="state.aiOpen">
      <div class="ai-panel-header">
        <span class="ai-title-name">AI 助手</span>
        <button class="ai-icon-action" @click="toggleAI" title="收起">×</button>
      </div>
      <div class="ai-messages" style="flex:1;padding:16px;color:var(--text-secondary);font-size:13px;">
        <p>AI 助手面板（后续接入 /api/leai/chat）</p>
      </div>
    </div>
  </template>
</template>

<script setup>
import { reactive, computed, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'

const router = useRouter()
const route = useRoute()

// ===== 菜单定义（从 workbench-vue.html 抄过来）=====
const menuIcon = (paths) => `<svg class="menu-icon" viewBox="0 0 20 20" fill="none" aria-hidden="true">${paths}</svg>`

const MENU_TREE = {
  dashboard: {
    icon: menuIcon('<rect x="3" y="4" width="14" height="12" rx="2.2"/><path d="M6.2 12.6 8.7 10l2 1.7 3.2-4.2"/><path d="M6 16.8h8"/>'),
    label: '乐享运营',
    children: {
      'dashboard.overview': { label: '运营总览' },
      'pipeline.annotate': { label: 'Query 分析' },
      'pipeline.quality': { label: '质量分析' },
      'ops.traffic': { label: '流量分析' },
      'ops.gmv': { label: 'GMV 分析' }
    }
  },
  geo: {
    icon: menuIcon('<rect x="3.2" y="4" width="13.6" height="12" rx="2.2"/><path d="M6 7.2h3.4M6 10h2.2M6 12.8h3.4"/><path d="M12.4 7.2h1.6M12.4 10h1.6M12.4 12.8h1.6"/>'),
    label: 'GEO 看板',
    children: {
      'dashboard.geo': { label: '整体数据概览' },
      'dashboard.geoSource': { label: '各平台信源分布' },
      'dashboard.geoIntent': { label: '各平台意图分布' },
      'dashboard.geoConversion': { label: 'GEO 转化看板' },
      'dashboard.geoKnowledge': { label: '手工上传知识' }
    }
  },
  employee: {
    icon: menuIcon('<path d="M7.4 8.4a2.7 2.7 0 1 0 0-5.4 2.7 2.7 0 0 0 0 5.4Z"/><path d="M2.8 16.4c.4-2.6 2.1-4.1 4.6-4.1 2.4 0 4.1 1.5 4.5 4.1"/><path d="M13.1 8.1a2.2 2.2 0 1 0 0-4.4"/><path d="M13.6 12.2c1.8.3 3 1.7 3.3 3.8"/>'),
    label: '在职员工管理',
    children: {
      'employee.overview': { label: '概览' },
      'employee.certification': { label: '认证审核' }
    }
  },
  lead: {
    icon: menuIcon('<path d="M4 5.2h8.2M4 9.8h5.8M4 14.4h5"/><path d="M12.2 13.6h4.6M14.8 11l2.6 2.6-2.6 2.6"/>'),
    label: '企业客户管理',
    children: {
      'lead.dashboard': { label: '线索看板' },
      'lead.pool': { label: '线索池' },
      'lead.score': { label: '打分模型' }
    }
  },
  search: {
    icon: menuIcon('<circle cx="8.8" cy="8.8" r="4.8"/><path d="m12.3 12.3 3.9 3.9"/><path d="M4.6 16.4h7.6"/>'),
    label: '搜索后台',
    children: {
      'search.categories': { label: '分类标签' },
      'search.filters': { label: '筛选条件' },
      'search.activity': { label: '活动直达' },
      'search.express': { label: '直通车' },
      'search.dictionary': { label: '词典管理' },
      'search.box': { label: '搜索框管理' }
    }
  },
  risk: {
    icon: menuIcon('<path d="M10 2.8 15.8 5v4.2c0 3.6-2.2 6.5-5.8 8-3.6-1.5-5.8-4.4-5.8-8V5L10 2.8Z"/><path d="m7.5 10 1.7 1.7 3.4-3.7"/>'),
    label: '风控管理',
    children: {
      'risk.overview': { label: '概况' },
      'risk.strategy': { label: '策略' },
      'risk.limit': { label: '限购' },
      'risk.dpl': { label: 'DPL' },
      'risk.data': { label: '数据查询' }
    }
  }
}

// pageKey -> router path 映射（把点换成斜杠）
function pageKeyToPath(key) {
  return '/' + key.replace('.', '/')
}

// path -> pageKey 映射（反向）
function pathToPageKey(path) {
  const p = path.replace(/^\/admin-vue/, '').replace(/^\//, '')
  return p.replace('/', '.')
}

const state = reactive({
  loggedIn: false,
  loginError: '',
  username: '',
  sidebarCollapsed: false,
  aiOpen: false,
  openGroups: ['dashboard']  // 默认展开第一组
})

const loginForm = reactive({ username: '', password: '' })

// 当前路由对应的 pageKey
const currentPageKey = computed(() => pathToPageKey(route.path))

// 当前页标签
const currentPageLabel = computed(() => {
  for (const group of Object.values(MENU_TREE)) {
    for (const [key, page] of Object.entries(group.children)) {
      if (key === currentPageKey.value) return page.label
    }
  }
  return ''
})

const currentGroupLabel = computed(() => {
  for (const group of Object.values(MENU_TREE)) {
    if (group.children[currentPageKey.value]) return group.label
  }
  return ''
})

function toggleGroup(key) {
  const idx = state.openGroups.indexOf(key)
  if (idx >= 0) {
    state.openGroups.splice(idx, 1)
  } else {
    state.openGroups.push(key)
  }
}

function toggleSidebar() {
  state.sidebarCollapsed = !state.sidebarCollapsed
}

function toggleAI() {
  state.aiOpen = !state.aiOpen
}

function onNavClick(pageKey) {
  // 确保所属分组是展开的
  for (const [groupKey, group] of Object.entries(MENU_TREE)) {
    if (group.children[pageKey] && !state.openGroups.includes(groupKey)) {
      state.openGroups.push(groupKey)
    }
  }
}

async function doLogin() {
  state.loginError = ''
  // demo 模式自动登录
  if (window.LEAIBOT_PREVIEW_MODE) {
    state.loggedIn = true
    state.username = 'demo'
    return
  }
  if (!loginForm.username || !loginForm.password) {
    state.loginError = '请输入用户名和密码'
    return
  }
  try {
    const res = await fetch('/api/admin/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: loginForm.username, password: loginForm.password })
    })
    const data = await res.json()
    if (!res.ok) {
      state.loginError = data.error || '登录失败'
      return
    }
    state.username = data.username
    state.loggedIn = true
  } catch (e) {
    state.loginError = '网络错误，请重试'
  }
}

async function doLogout() {
  await fetch('/api/admin/logout', { method: 'POST' })
  location.reload()
}

onMounted(async () => {
  // demo 模式
  if (/[?&](demo|preview)=1\b/.test(location.search) || location.protocol === 'file:') {
    window.LEAIBOT_PREVIEW_MODE = true
    state.loggedIn = true
    state.username = 'demo'
    return
  }
  // 检查是否已登录
  try {
    const res = await fetch('/api/admin/me')
    if (res.ok) {
      const data = await res.json()
      state.username = data.admin?.username || ''
      state.loggedIn = true
    }
  } catch (e) {
    // 保持登录屏
  }
})
</script>

<style scoped>
.login-card-wrapper {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100vh;
  background: var(--bg-base, #f4f5f7);
}

.nav-group-header {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  cursor: pointer;
  border-radius: 6px;
  font-size: 13px;
  font-weight: 500;
  color: var(--text-secondary, #5c6776);
  transition: background 0.15s;
}
.nav-group-header:hover {
  background: var(--bg-hover, rgba(0,0,0,0.04));
}
.nav-chevron {
  margin-left: auto;
  transition: transform 0.2s;
}
.nav-group.is-open .nav-chevron {
  transform: rotate(180deg);
}
.nav-group-children {
  display: none;
  padding-left: 4px;
}
.nav-group.is-open .nav-group-children {
  display: block;
}
.nav-item {
  display: block;
  padding: 7px 12px 7px 32px;
  font-size: 13px;
  color: var(--text-secondary, #5c6776);
  text-decoration: none;
  border-radius: 6px;
  transition: background 0.15s, color 0.15s;
}
.nav-item:hover {
  background: var(--bg-hover, rgba(0,0,0,0.04));
  color: var(--text-primary, #1a2233);
}
.nav-item.active {
  background: var(--primary-light, #e8f0fd);
  color: var(--primary, #3f78c5);
  font-weight: 500;
}
</style>

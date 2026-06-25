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
      <div class="login-error" v-if="state.loginError" style="display:block">{{ state.loginError }}</div>
      <button class="btn btn-primary login-btn" @click="doLogin">登录工作台</button>
    </div>
  </div>

  <!-- 三栏布局 -->
  <div class="workbench-shell" v-else>
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
        <!-- 账号菜单弹层 (account-hub-popover) -->
        <div class="user-menu-popover account-hub-popover" :class="{ open: state.accountHubOpen }" @click.self="closeAccountHub">
          <div class="account-hub-panel" @click.stop>
            <button type="button" class="account-hub-close" @click="closeAccountHub" aria-label="关闭">×</button>
            <button type="button" class="account-hub-card primary" @click="goSkillCreate">
              <span class="account-hub-icon">＋</span>
              <b>创建 Skill</b>
              <small>从业务场景定义新能力、参数、输入输出和审批规则。</small>
            </button>
            <button type="button" class="account-hub-card" @click="goSkillHub">
              <span class="account-hub-icon">◎</span>
              <b>Skill Hub</b>
              <small>查看已提交 Skill 状态，处理审批、发布、启用或禁用。</small>
            </button>
            <button type="button" class="account-hub-card" @click="goPermissions">
              <span class="account-hub-icon">◇</span>
              <b>权限管理</b>
              <small>敬请期待……后续开放菜单权限、Skill 权限和角色范围管理。</small>
            </button>
            <button type="button" class="account-hub-card" @click="openPocLog">
              <span class="account-hub-icon">LOG</span>
              <b>调整日志</b>
              <small>查看功能调整记录。仅用于 POC 记录。</small>
            </button>
          </div>
        </div>
        <div class="user-info" @click="toggleAccountHub">
          <div class="user-avatar">{{ state.username ? state.username[0].toUpperCase() : 'A' }}</div>
          <div class="user-meta">
            <div class="user-name">{{ state.username || 'admin' }}</div>
            <div class="user-role">管理员</div>
          </div>
          <span class="user-logout" @click.stop="doLogout" title="退出登录">退出</span>
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
          <!-- 暗黑模式按钮 -->
          <button type="button" class="topbar-icon-btn" @click="toggleDarkMode" title="切换深色模式" aria-label="切换深色模式">
            <svg viewBox="0 0 20 20" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M15.8 12.2A6.8 6.8 0 0 1 7.8 4.2a6.6 6.6 0 1 0 8 8z"/></svg>
          </button>
          <button type="button" class="ai-toggle" :class="{ active: state.aiOpen }" @click="toggleAI" title="AI 助手">
            <svg viewBox="0 0 20 20" width="15" height="15" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M10 2.8v2.4M5.8 5.1 4.5 3.8M14.2 5.1l1.3-1.3"/><rect x="4" y="6" width="12" height="9" rx="3"/><path d="M7.5 10h.01M12.5 10h.01M8 13h4"/></svg>
            <span>AI 助手</span>
          </button>
        </div>
      </div>
      <!-- ponytail: workspace 页签待接 AI 报告流程；v-if 不渲染(CSS 有 display:flex!important, v-show 压不住会留空白) -->
      <div class="page-content">
        <router-view />
      </div>
    </div>

    <!-- 调整日志 modal -->
    <Teleport to="body">
      <div class="poc-log-modal" :class="{ open: state.pocLogOpen }" v-if="state.pocLogOpen" @click.self="closePocLog">
        <div class="poc-log-panel" role="dialog" aria-modal="true" aria-label="调整日志">
          <button type="button" class="poc-log-close" @click="closePocLog" aria-label="关闭">×</button>
          <div class="poc-log-head">
            <span>仅用于 POC 记录</span>
            <h3>调整日志</h3>
            <p>记录本轮工作台功能调整与验证状态，不作为正式审计、发布审批或生产变更依据。</p>
          </div>
          <div class="poc-log-list">
            <div class="poc-log-item" v-for="item in POC_LOG_RECORDS" :key="item.time">
              <time>{{ item.time }}</time>
              <div>
                <b>{{ item.title }}</b>
                <p>{{ item.detail }}</p>
                <small>{{ item.scope }}</small>
              </div>
              <em>{{ item.status }}</em>
            </div>
          </div>
        </div>
      </div>
    </Teleport>

    <!-- 右侧 AI panel -->
    <AiPanel v-show="state.aiOpen" :visible="state.aiOpen" @toggle="toggleAI" />
  </div>
</template>

<script setup>
import { reactive, computed, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import AiPanel from './AiPanel.vue'

// ===== 调整日志数据（从 workbench-vue.html openPocAdjustmentLog 照搬）=====
const POC_LOG_RECORDS = [
  { time: '2026-06-23 17:33', title: 'Skill 创建评估及格线调整', scope: 'Skill 创建 / 评估验证 / 提交审核门槛', detail: '评估验证综合评分及格线从 0.80 调整为 0.60；当前综合评分 0.782 直接显示评估通过并允许进入提交审核，AI 微调保留为可选优化动作。', status: '已合并正式' },
  { time: '2026-06-23 17:26', title: 'Skill 创建草稿生成布局调整', scope: 'Skill 创建 / 基础配置 / 需求澄清 / 草稿生成', detail: '基础配置、需求澄清阶段移除保存草稿按钮；草稿生成阶段改为深色左右分栏，左侧按 IDE 文件树展示目录、缩进层级、文件类型图标和选中态，右侧展示生成草稿内容。', status: '已合并正式' },
  { time: '2026-06-23 17:07', title: 'Skill Hub 列表与角色操作调整', scope: 'Skill Hub / 列表字段 / 操作列 / 管理员与 PM 角色', detail: 'Skill Hub 列表新增中文名列并移除标签列和标签筛选；操作列中"测试"改为"评估"，"应用"改为"测试"；管理员驳回后状态显示已驳回且不再展示发布、审批；PM 侧可看到编辑，被驳回的 Skill 可点击返回创建流程修改。', status: '已合并正式' },
  { time: '2026-06-23 14:22', title: '0624 UI Skill 规范归一', scope: '右侧 Agent / 底部输入区 / 快捷 chips / 样式覆盖层', detail: '按 portal-workbench-ui-0624 样式规范收敛右侧 Agent 底部输入区：chips 始终保持横向 pill 与左右箭头，不退化为下拉框；输入框默认 36px、最多 3 行内滚动；发送按钮统一为 32px 单图标控件。', status: '已合并正式' },
  { time: '2026-06-23 14:11', title: '右侧 Agent 快捷 chips 查询触发', scope: '右侧 Agent / 底部快捷 chips', detail: '底部 chips 从范围选择改为快捷查询按钮，默认不再显示选中态；点击 chip 后直接把对应自然语言问题发送给右侧 Agent 执行查询。', status: '已合并正式' },
  { time: '2026-06-23 13:20', title: '账号入口与 POC 调整日志', scope: '账号入口弹层 / 调整日志 / admin 入口跳转', detail: '账号入口弹层改为 2x2 功能入口，新增调整日志查看；日志按功能点归纳展示，时间按北京时间取值；admin/index.html 覆盖为跳转页，进入 workbench.html?demo=1。', status: '已合并正式' },
  { time: '2026-06-22 13:40', title: 'Skill Hub 应用入口调整', scope: 'Skill Hub 操作列', detail: '应用固定为蓝色测试入口，放在操作项最后，点击后在右侧 Agent 展示 output 结果。', status: '已合并正式' },
  { time: '2026-06-18 18:30', title: '业务侧技能包管理与顶部入口整理', scope: '技能包管理 / 顶部栏', detail: '技能包管理固定为启停管理面，不再展示申请、使用、查看进度等旧流程；筛选归并为全部、已开启、已关闭；顶部中间搜索入口移除，同时保留夜间模式按钮。', status: '已合并正式' },
  { time: '2026-06-18 17:40', title: 'Skill 创建命名与 AI 微调闭环', scope: 'Skill 创建 / 评估验证 / 右侧 Agent', detail: '基础配置中区分 Skill 名称（英文）和必填中文命名；评估验证出现低分项时提供 AI 微调，唤起右侧 Agent 更新草稿和评分，示例评分刷新到综合评分 0.859 后进入后续审核。', status: '已合并正式' },
  { time: '2026-06-18 14:42', title: '企业客户管理打分模型样式修复', scope: '企业客户管理 / 打分模型', detail: '根据 0617 wangxt8 样式包替换 workbench-lead.js，修复打分模型页面样式不生效的问题；后续遇到同类问题先检查模块版本，不再只叠加 CSS 覆盖。', status: '已合并正式' }
]

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
  aiOpen: true,
  openGroups: ['dashboard'],  // 默认展开第一组
  accountHubOpen: false,      // 账号菜单弹层
  pocLogOpen: false           // 调整日志 modal
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

// ===== 暗黑模式 =====
function toggleDarkMode() {
  const next = !document.body.classList.contains('dark-mode')
  localStorage.setItem('lexiang_dark', next ? '1' : '0')
  document.body.classList.toggle('dark-mode', next)
}

// ===== 账号菜单 (account-hub-popover) =====
function toggleAccountHub() {
  state.accountHubOpen = !state.accountHubOpen
}

function closeAccountHub() {
  state.accountHubOpen = false
}

function goSkillCreate() {
  closeAccountHub()
  router.push('/agent/skillCreate')
}

function goSkillHub() {
  closeAccountHub()
  router.push('/agent/skills')
}

function goPermissions() {
  closeAccountHub()
  // 权限管理敬请期待
  router.push('/agent/permissions')
}

// ===== 调整日志 modal =====
function openPocLog() {
  closeAccountHub()
  state.pocLogOpen = true
}

function closePocLog() {
  state.pocLogOpen = false
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
  // 初始化暗黑模式（读 localStorage）
  if (localStorage.getItem('lexiang_dark') === '1') {
    document.body.classList.add('dark-mode')
  }

  // 点击外部关闭账号菜单
  document.addEventListener('click', (e) => {
    const footer = document.querySelector('.sidebar-footer')
    if (footer && !footer.contains(e.target)) {
      state.accountHubOpen = false
    }
  })

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
/* 三栏横向并排 + 满高满宽，等价原版 body{display:flex;height:100vh} */
.workbench-shell {
  display: flex;
  height: 100vh;
  width: 100%;
  overflow: hidden;
}

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

<!-- 全局根高度：原版靠 body{height:100vh}，Vite 工程需显式给 html/body/#app 满高 -->
<style>
html, body, #app { height: 100%; width: 100%; margin: 0; }
</style>

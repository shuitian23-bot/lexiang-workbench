<template>
  <!--
    完整还原原版 .sidebar 结构与 class。
    collapsed 类对应原 sb.classList.toggle('collapsed')
  -->
  <div
    class="sidebar"
    id="sidebar"
    :class="{ collapsed: sidebarCollapsed, 'is-peeking': isPeeking, 'has-user-menu': userMenuVisible }"
    ref="sidebarEl"
  >
    <SidebarHeader
      :collapsed="sidebarCollapsed"
      @home="goPortalHome"
      @toggle="toggleSidebarManual"
    />

    <!-- ===== 导航菜单（对应原 renderSidebar() 生成的 HTML）===== -->
    <div class="sidebar-nav" id="sidebar-nav">
      <SidebarNavGroup
        v-for="(group, key) in filteredMenuTree"
        :key="key"
        :group="group"
        :group-key="key"
        :current-page-id="currentPageId"
        :active="isGroupActive(key)"
        :open="openGroups.has(key)"
        @toggle="toggleGroup"
        @navigate="navigateTo"
      />
    </div>

    <SidebarFooter
      :user="user"
      :role="role"
      :user-initial="userInitial"
      :user-menu-visible="userMenuVisible"
      @toggle-user-menu="toggleUserMenu"
      @close-user-menu="closeUserMenu"
      @logout="doLogout"
      @open-skill-create="openSkillCreatePage"
      @open-skill-manager="openSkillManagerPage"
      @open-permission-manager="openPermissionManagerPage"
      @open-poc-log="openPocAdjustmentLog"
    />
  </div>

  <Teleport to="body">
    <div
      v-if="pocLogVisible"
      id="poc-adjustment-log-modal"
      class="poc-log-modal open"
      @click.self="closePocAdjustmentLog"
    >
      <div class="poc-log-panel" role="dialog" aria-modal="true" aria-label="调整日志">
        <button type="button" class="poc-log-close" @click="closePocAdjustmentLog" aria-label="关闭">×</button>
        <div class="poc-log-head">
          <span>仅用于 POC 记录</span>
          <h3>调整日志</h3>
          <p>记录本轮工作台功能调整与验证状态，不作为正式审计、发布审批或生产变更依据。</p>
        </div>
        <div class="poc-log-list">
          <div v-for="item in pocLogRecords" :key="`${item.time}-${item.title}`" class="poc-log-item">
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
</template>

<script setup>
import { ref, computed, watch, onMounted, onBeforeUnmount } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { storeToRefs } from 'pinia'
import { useAppStore, MENU_TREE } from '@/stores/app'
import { STORAGE_KEYS } from '@/constants/storageKeys'
import SidebarHeader from '@/components/sidebar/SidebarHeader.vue'
import SidebarNavGroup from '@/components/sidebar/SidebarNavGroup.vue'
import SidebarFooter from '@/components/sidebar/SidebarFooter.vue'

const router   = useRouter()
const route    = useRoute()
const appStore = useAppStore()

const { user, role, userInitial, sidebarCollapsed, filteredMenuTree } = storeToRefs(appStore)

// 当前 pageId（从路由 meta 读取，对应原 STATE.currentPage）
const currentPageId = computed(() => route.meta?.pageId || '')

// 已展开的分组集合（对应原 .nav-sub.open 状态）
const openGroups = ref(new Set())

// 用户菜单显隐
const userMenuVisible = ref(false)
const isPeeking = ref(false)
const pocLogVisible = ref(false)

const pocLogRecords = [
  {
    time: '2026-07-03 15:48',
    title: '运营总览 AI 解读口径纠偏',
    scope: '运营总览 / AI 解读 / 右侧 Agent 演示结果',
    detail: '运营总览的 AI 解读改为走真实火山引擎会话接口，并把页面已展示的 DAU、WAU、MAU、GMV、关键经营链路、GMV 结构和趋势速览作为上下文传入；接口失败时不再生成本地 mock 分析内容，同时展示层过滤旧报告里的风控、策略命中等无关口径。',
    status: '源码已更新'
  },
  {
    time: '2026-07-03 11:45',
    title: '权限管理 Vue 源码链路补全',
    scope: '权限管理 / 权限申请 / 审批列表 / 角色与用户管理',
    detail: '把权限管理从占位入口补成 Vue 源码内的可操作 POC：包含权限申请五步链路、审批列表、角色管理、用户管理、组织管理、数据源管理、功能管理和删除备份，并保留 0702 设计规范覆盖。',
    status: '源码已更新'
  },
  {
    time: '2026-06-23 17:33',
    title: 'Skill 创建评估及格线调整',
    scope: 'Skill 创建 / 评估验证 / 提交审核门槛',
    detail: '评估验证综合评分及格线从 0.80 调整为 0.60；当前综合评分 0.782 直接显示评估通过并允许进入提交审核，AI 微调保留为可选优化动作。',
    status: '已合并正式'
  },
  {
    time: '2026-06-23 17:26',
    title: 'Skill 创建草稿生成布局调整',
    scope: 'Skill 创建 / 基础配置 / 需求澄清 / 草稿生成',
    detail: '基础配置、需求澄清阶段移除保存草稿按钮；草稿生成阶段改为深色左右分栏，左侧按 IDE 文件树展示目录、缩进层级、文件类型图标和选中态，右侧展示生成草稿内容。',
    status: '已合并正式'
  },
  {
    time: '2026-06-23 17:07',
    title: 'Skill Hub 列表与角色操作调整',
    scope: 'Skill Hub / 列表字段 / 操作列 / 管理员与 PM 角色',
    detail: 'Skill Hub 列表新增中文名列并移除标签列和标签筛选；操作列中“测试”改为“评估”，“应用”改为“测试”；管理员驳回后状态显示已驳回且不再展示发布、审批；PM 侧可看到编辑，被驳回的 Skill 可点击返回创建流程修改。',
    status: '已合并正式'
  },
  {
    time: '2026-06-23 14:22',
    title: '0624 UI Skill 规范归一',
    scope: '右侧 Agent / 底部输入区 / 快捷 chips / 样式覆盖层',
    detail: '按 portal-workbench-ui-0624 样式规范收敛右侧 Agent 底部输入区：chips 始终保持横向 pill 与左右箭头，不退化为下拉框；输入框默认 36px、最多 3 行内滚动；发送按钮统一为 32px 单图标控件。',
    status: '已合并正式'
  },
  {
    time: '2026-06-23 14:11',
    title: '右侧 Agent 快捷 chips 查询触发',
    scope: '右侧 Agent / 底部快捷 chips',
    detail: '底部 chips 从范围选择改为快捷查询按钮，默认不再显示选中态；点击 chip 后直接把对应自然语言问题发送给右侧 Agent 执行查询。',
    status: '已合并正式'
  },
  {
    time: '2026-06-23 13:20',
    title: '账号入口与 POC 调整日志',
    scope: '账号入口弹层 / 调整日志 / Vue 入口跳转',
    detail: '账号入口弹层改为 2x2 功能入口，新增调整日志查看；日志按功能点归纳展示，时间按北京时间取值；当前入口统一由 0702 Vue 项目承载。',
    status: '已合并正式'
  },
  {
    time: '2026-06-22 13:40',
    title: 'Skill Hub 应用入口调整',
    scope: 'Skill Hub 操作列',
    detail: '应用固定为蓝色测试入口，放在操作项最后，点击后在右侧 Agent 展示 output 结果。',
    status: '已合并正式'
  },
  {
    time: '2026-06-18 18:30',
    title: '业务侧技能包管理与顶部入口整理',
    scope: '技能包管理 / 顶部栏',
    detail: '技能包管理固定为启停管理面，不再展示申请、使用、查看进度等旧流程；筛选归并为全部、已开启、已关闭；顶部中间搜索入口移除，同时保留夜间模式按钮。',
    status: '已合并正式'
  },
  {
    time: '2026-06-18 17:40',
    title: 'Skill 创建命名与 AI 微调闭环',
    scope: 'Skill 创建 / 评估验证 / 右侧 Agent',
    detail: '基础配置中区分 Skill 名称（英文）和必填中文命名；评估验证出现低分项时提供 AI 微调，唤起右侧 Agent 更新草稿和评分，示例评分刷新到综合评分 0.859 后进入后续审核。',
    status: '已合并正式'
  },
  {
    time: '2026-06-18 14:42',
    title: '企业客户管理打分模型样式修复',
    scope: '企业客户管理 / 打分模型',
    detail: '根据 0617 wangxt8 样式包替换 workbench-lead.js，修复打分模型页面样式不生效的问题；后续遇到同类问题先检查模块版本，不再只叠加 CSS 覆盖。',
    status: '已合并正式'
  }
]

// 侧栏 DOM 引用（用于响应式折叠和 peek 事件）
const sidebarEl = ref(null)

// ---- peek 模式相关（对应原 _sidebarPeek / _sidebarPeekTimer）----
let _peek      = false
let _peekTimer = null
let _boundLeave = null
let _boundEnter = null

// ---- 判断分组是否有激活的子页 ----
function isGroupActive(groupKey) {
  const group = MENU_TREE[groupKey]
  return !!(group?.children && group.children[currentPageId.value])
}

// ---- 路由变化时自动展开当前分组 ----
watch(currentPageId, (pageId) => {
  for (const [key, group] of Object.entries(MENU_TREE)) {
    if (group.children?.[pageId]) {
      openGroups.value = new Set([...openGroups.value, key])
      break
    }
  }
}, { immediate: true })

// ===== toggleGroup —— 完整还原原版逻辑（含 peek 模式）=====
function toggleGroup(key) {
  const el = sidebarEl.value
  if (!el) return

  // 收起状态下：临时展开侧栏（peek 模式）
  if (sidebarCollapsed.value) {
    _peek = true
    isPeeking.value = true
    openOnlyGroup(key)

    // 清除旧监听
    if (_boundLeave) el.removeEventListener('mouseleave', _boundLeave)
    if (_boundEnter) el.removeEventListener('mouseenter', _boundEnter)

    // 鼠标离开后 1.5s 自动收回
    _boundLeave = () => {
      clearTimeout(_peekTimer)
      _peekTimer = setTimeout(() => {
        if (_peek) {
          closePeek()
        }
      }, 1500)
    }
    _boundEnter = () => { clearTimeout(_peekTimer) }

    el.addEventListener('mouseleave', _boundLeave)
    el.addEventListener('mouseenter', _boundEnter)
    return
  }

  // 正常状态：展开/收起分组（同时关闭其他分组）
  const willOpen = !openGroups.value.has(key)
  openGroups.value = willOpen ? new Set([key]) : new Set()
}

// ===== 页面导航 =====
function navigateTo(path, pageId) {
  closeUserMenu()
  closePeek()
  // 记录静态页签
  appStore.ensureStaticTab(pageId)
  appStore.setActiveStaticTab(pageId)
  router.push(path)
}

function goPortalHome() {
  navigateTo('/portal/home', 'portal.home')
}

// ===== 用户菜单 =====
function toggleUserMenu(e) {
  e?.stopPropagation()
  userMenuVisible.value = !userMenuVisible.value
  if (userMenuVisible.value && sidebarCollapsed.value) {
    _peek = true
    isPeeking.value = true
  }
}
function closeUserMenu() {
  userMenuVisible.value = false
}

// ===== 账号入口按钮（对应原 openSkillCreatePage / openSkillManagerFromUserMenu 等）=====
function openSkillCreatePage() {
  closeUserMenu()
  appStore.ensureStaticTab('agent.skillCreate')
  appStore.setActiveStaticTab('agent.skillCreate')
  router.push('/agent/skill-create')
}
function openSkillManagerPage() {
  closeUserMenu()
  appStore.ensureStaticTab('agent.skills')
  appStore.setActiveStaticTab('agent.skills')
  router.push('/agent/skills')
}
function openPermissionManagerPage() {
  closeUserMenu()
  appStore.ensureStaticTab('agent.permissions')
  appStore.setActiveStaticTab('agent.permissions')
  router.push('/agent/permissions')
}
function openPocAdjustmentLog() {
  closeUserMenu()
  pocLogVisible.value = true
}
function closePocAdjustmentLog() {
  pocLogVisible.value = false
}

// ===== 退出 =====
async function doLogout() {
  await appStore.logout()
  router.replace('/login')
}

// ===== 关闭 peek =====
function closePeek() {
  _peek = false
  isPeeking.value = false
  clearTimeout(_peekTimer)
}

function openOnlyGroup(key) {
  openGroups.value = new Set([key])
}

function toggleSidebarManual() {
  if (sidebarCollapsed.value && isPeeking.value) {
    closePeek()
    appStore.setSidebarCollapsed(false, { persist: true })
    return
  }
  closePeek()
  appStore.toggleSidebar()
}

// ===== 响应式折叠（对应原 window resize 监听）=====
const AUTO_COLLAPSE_WIDTH = 1320
const AUTO_EXPAND_WIDTH   = 1480
let _lastWidth = window.innerWidth
let _resizeTimer = null

function isSidebarManuallyCollapsed() {
  return localStorage.getItem(STORAGE_KEYS.sidebarCollapsed) === '1'
    || localStorage.getItem(STORAGE_KEYS.legacySidebarCollapsed) === '1'
}

function applyResponsiveSidebar(width, growing = false, shrink = false) {
  if ((shrink || !growing) && !sidebarCollapsed.value && width <= AUTO_COLLAPSE_WIDTH) {
    appStore.setSidebarCollapsed(true, { persist: false })
  } else if ((growing || !shrink) && sidebarCollapsed.value && width >= AUTO_EXPAND_WIDTH) {
    // 只在非手动折叠时自动展开
    if (!isSidebarManuallyCollapsed()) {
      appStore.setSidebarCollapsed(false, { persist: false })
    }
  }
}

function _onResize() {
  clearTimeout(_resizeTimer)
  _resizeTimer = setTimeout(() => {
    const w       = window.innerWidth
    const growing = w > _lastWidth
    const shrink  = w < _lastWidth
    _lastWidth = w

    applyResponsiveSidebar(w, growing, shrink)
  }, 80)
}

function _onDocumentClick(e) {
  const el = sidebarEl.value
  if (!el || el.contains(e.target)) return
  closeUserMenu()
  closePeek()
}

function _onDocumentKeydown(e) {
  if (e.key !== 'Escape') return
  closePocAdjustmentLog()
  closeUserMenu()
  closePeek()
}

onMounted(() => {
  applyResponsiveSidebar(window.innerWidth)
  window.addEventListener('resize', _onResize)
  document.addEventListener('click', _onDocumentClick)
  document.addEventListener('keydown', _onDocumentKeydown)
})
onBeforeUnmount(() => {
  window.removeEventListener('resize', _onResize)
  document.removeEventListener('click', _onDocumentClick)
  document.removeEventListener('keydown', _onDocumentKeydown)
  clearTimeout(_resizeTimer)
  clearTimeout(_peekTimer)
})
</script>

import { MENU_TREE, getPageLabel, pageIdToPath, useAppStore } from '@/stores/app'
import { useAIStore } from '@/stores/ai'
import type { Router } from 'vue-router'

/**
 * Legacy Content Adapter
 *
 * This module is the only intended bridge from Vue shell code into the sealed
 * sealed workbench page renderers. Middle content pages may still rely on the
 * old PAGE_RENDERERS/window APIs during migration, but new Vue shell code
 * should not add direct window shims outside this adapter.
 */
const legacyAssetUrl = (path: string) => `${import.meta.env.BASE_URL}${path.replace(/^\/+/, '')}`

const RUNTIME_SCRIPTS = [
  legacyAssetUrl('assets/echarts.min.js'),
  legacyAssetUrl('admin-runtime/workbench-data-leai.js'),
  legacyAssetUrl('admin-runtime/workbench-pages.js'),
  legacyAssetUrl('admin-runtime/workbench-lead.js'),
  legacyAssetUrl('admin-runtime/workbench-prd-modules.js'),
  legacyAssetUrl('admin-runtime/workbench-geo.js'),
  legacyAssetUrl('admin-runtime/workbench-data.js'),
  legacyAssetUrl('admin-runtime/workbench-employee.js'),
  legacyAssetUrl('admin-runtime/workbench-ops.js'),
  legacyAssetUrl('admin-runtime/workbench-report.js'),
  legacyAssetUrl('admin-runtime/workbench-pipeline.js'),
  legacyAssetUrl('admin-runtime/workbench-quality.js')
]

let runtimePromise: Promise<void> | null = null

export function ensureNativeWorkbenchRuntime(router: Router) {
  installNativeWorkbenchShim(router)
  if (runtimePromise) return runtimePromise
  runtimePromise = loadRuntimeScripts()
    .then(() => installNativeWorkbenchShim(router))
    .then(exposePageRenderers)
    .catch(error => {
      runtimePromise = null
      throw error
    })
  return runtimePromise
}

export function renderNativeWorkbenchPage(pageId: string) {
  const renderer = window.__leaiGetPageRenderer?.(pageId)
  if (typeof renderer !== 'function') return fallbackPage(pageId)
  try {
    return renderer()
  } catch (error) {
    console.error(`[native-workbench] render failed: ${pageId}`, error)
    return fallbackPage(pageId, error)
  }
}

export function runNativeWorkbenchPageInit(pageId: string) {
  window.STATE ||= {}
  window.STATE.currentPage = pageId
  document.dispatchEvent(new CustomEvent('page-change', { detail: pageId }))

  const delayed = (fn?: () => void, delay = 80) => {
    if (typeof fn === 'function') setTimeout(fn, delay)
  }

  if (pageId === 'dashboard.overview') delayed(window.loadOverviewStats, 80)
  if (pageId === 'pipeline.annotate') delayed(window.initDashboard, 200)
  if (pageId === 'pipeline.quality') delayed(window.qualityRefresh, 250)
  if (pageId === 'ops.traffic') delayed(window.opsRenderTraffic, 120)
  if (pageId === 'ops.gmv') delayed(window.opsRenderGMV, 120)
  if (pageId === 'dashboard.geo') delayed(window.geoLoadData, 80)
  if (pageId === 'dashboard.geoSource') delayed(window.geoLoadSourcePage, 80)
  if (pageId === 'dashboard.geoIntent') delayed(window.geoLoadIntentPage, 80)
  if (pageId === 'dashboard.geoConversion') delayed(window.geoLoadConversionPage, 80)
  if (pageId === 'dashboard.geoKnowledge') delayed(window.loadKnowledgeStats, 80)
  if (pageId === 'employee.overview') delayed(window.loadEmployeeOverview, 80)
  if (pageId === 'employee.certification') delayed(() => window.loadCertificationTable?.(1), 80)
  if (pageId === 'lead.dashboard') delayed(window.renderKbBody, 80)
  if (pageId === 'lead.pool') delayed(window.poolRefresh, 80)
  if (pageId === 'lead.score') delayed(window.scoreRefresh, 80)
  scheduleNativeChartResize()
}

function scheduleNativeChartResize() {
  ;[80, 240, 520].forEach(delay => {
    setTimeout(() => window.dispatchEvent(new Event('resize')), delay)
  })
}

function installNativeWorkbenchShim(router: Router) {
  window.STATE ||= {
    user: 'demo',
    role: '平台管理员',
    permissions: ['*'],
    visibleMenus: Object.keys(MENU_TREE),
    currentPage: 'portal.home',
    staticTabs: [],
    activeStaticTabId: 'portal.home',
    tempTabs: [],
    activeTempTabId: null,
    aiOpen: true
  }
  window.MENU_TREE ||= MENU_TREE
  window.HIDDEN_PAGES ||= {}
  window.SIDEBAR_AUTO_COLLAPSE_WIDTH ||= 1320
  window.getPageLabel ||= getPageLabel
  window.findPageGroup ||= (pageId: string) => {
    for (const group of Object.values(MENU_TREE)) {
      if (group.children?.[pageId]) return group
    }
    return null
  }
  window.workspaceEnsureStaticTab ||= () => {}
  window.workspaceRenderStaticTabs ||= () => {}
  window.workspaceRenderTabs ||= () => {}
  window.workspaceNotify = (message: string) => notify(message)
  window.skillHubToast = (message: string) => notify(message)
  window.closeUserMenu ||= () => {}
  window.applyResponsiveSidebarCollapse ||= () => {}
  window.aiRefreshPageAssistant ||= () => {}
  window.aiHideEmptyState = () => {}
  window.addAiMessage = (role: string, text: string) => {
    const aiStore = useAIStore()
    aiStore.messages.push({ role: role === 'user' ? 'user' : 'assistant', text, at: new Date().toISOString() })
    if (!aiStore.open) aiStore.toggleOpen(true)
  }
  window.aiSend = () => useAIStore().send(window.STATE?.currentPage || '')
  window.newAiConversation = () => useAIStore().newConversation()
  window.aiQuick = (text: string) => {
    const aiStore = useAIStore()
    if (!aiStore.open) aiStore.toggleOpen(true)
    aiStore.quickSend(text, window.STATE?.currentPage || '')
    window.dispatchEvent(new CustomEvent('native-ai-quick', { detail: text }))
  }
  window.toggleAI = (forceState?: boolean) => useAIStore().toggleOpen(forceState)
  window.toggleDarkMode = (forceState?: boolean) => {
    const appStore = useAppStore()
    if (typeof forceState === 'boolean') {
      appStore.applyDarkMode(forceState)
    } else {
      appStore.toggleDarkMode()
    }
  }
  window.goPortalHome = () => router.push('/portal/home')
  window.openSkillManagerOverlay ||= () => openStaticPage(router, 'agent.skills', '/agent/skills')
  window.openSkillManagerFromUserMenu = () => openStaticPage(router, 'agent.skills', '/agent/skills')
  window.openSkillCreatePage = () => openStaticPage(router, 'agent.skillCreate', '/agent/skill-create')
  window.openPermissionManagerPage = () => openStaticPage(router, 'agent.permissions', '/agent/permissions')
  window.openPocAdjustmentLog = () => notify('调整日志已同步到迁移记录，当前 Vue 预览保留入口。')
  window.workspaceOpenExternalLink = (event: Event, linkEl: HTMLAnchorElement) => {
    event?.preventDefault?.()
    const appStore = useAppStore()
    const url = linkEl?.href || linkEl?.getAttribute?.('href') || ''
    const title = (linkEl?.dataset?.workspaceTitle || linkEl?.textContent || '外部链接').trim()
    appStore.openTempTab({
      id: `external_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      title,
      sourcePage: window.STATE?.currentPage || '',
      sourcePageLabel: getPageLabel(window.STATE?.currentPage || '') || '当前页面',
      groupLabel: linkEl?.dataset?.workspaceSource || '外部链接',
      summary: '来自当前页面的外部链接，已放入动态页签便于后续复制或保存。',
      chips: ['外部链接', linkEl?.dataset?.workspaceSource || '来源页面'],
      externalUrl: url,
      createdAt: new Date().toISOString()
    })
    return false
  }
  window.__leaiVueSwitchPage = (pageId: string) => {
    const path = pageIdToPath(pageId)
    if (path) router.push(path)
  }
  if (!window.switchPage || window.switchPage.__leaiVueBase) {
    window.switchPage = (pageId: string) => window.__leaiVueSwitchPage?.(pageId)
    window.switchPage.__leaiVueBase = true
  }
}

function openStaticPage(router: Router, pageId: string, path: string) {
  const appStore = useAppStore()
  appStore.ensureStaticTab(pageId)
  appStore.setActiveStaticTab(pageId)
  router.push(path)
}

function notify(message: string) {
  const text = String(message || '').trim()
  if (!text) return
  try {
    useAppStore().notify(text)
  } catch {
    console.info(text)
  }
}

function loadRuntimeScripts() {
  return RUNTIME_SCRIPTS.reduce((chain, src) => chain.then(() => loadScript(src)), Promise.resolve())
}

function loadScript(src: string) {
  if (document.querySelector(`script[data-native-workbench="${src}"]`)) return Promise.resolve()
  return new Promise<void>((resolve, reject) => {
    const script = document.createElement('script')
    script.src = src
    script.dataset.nativeWorkbench = src
    script.onload = () => resolve()
    script.onerror = () => reject(new Error(`加载封板页面脚本失败：${src}`))
    document.head.appendChild(script)
  })
}

function exposePageRenderers() {
  return new Promise<void>((resolve, reject) => {
    const script = document.createElement('script')
    script.dataset.nativeWorkbenchExpose = 'renderers'
    script.textContent = `
      window.__leaiGetPageRenderer = function(pageId) {
        try { return typeof PAGE_RENDERERS !== 'undefined' ? PAGE_RENDERERS[pageId] : null; }
        catch (e) { return null; }
      };
      window.__leaiHasPageRenderer = function(pageId) {
        return !!window.__leaiGetPageRenderer(pageId);
      };
    `
    script.onload = () => resolve()
    script.onerror = reject
    document.head.appendChild(script)
    resolve()
  })
}

function fallbackPage(pageId: string, error: unknown = null) {
  const label = getPageLabel(pageId) || pageId
  const message = error instanceof Error ? error.message : '正在加载对应页面内容'
  return `
    <div class="page-header">
      <div>
        <div class="page-title">${escapeHtml(label)}</div>
        <div class="page-desc">封板页面渲染器暂未就绪</div>
      </div>
    </div>
    <div class="empty-state">
      <div class="icon">🚧</div>
      <div class="title">${escapeHtml(label)}</div>
      <div>${escapeHtml(message)}</div>
    </div>`
}

function escapeHtml(value: unknown) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

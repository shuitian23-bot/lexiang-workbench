/// <reference types="vite/client" />

import 'vue-router'

declare module '*.vue' {
  import type { DefineComponent } from 'vue'

  const component: DefineComponent<Record<string, unknown>, Record<string, unknown>, unknown>
  export default component
}

declare module 'vue-router' {
  interface RouteMeta {
    public?: boolean
    pageId?: string
    group?: string
  }
}

declare global {
  interface Window {
    STATE?: Record<string, unknown> & { currentPage?: string }
    MENU_TREE?: Record<string, unknown>
    HIDDEN_PAGES?: Record<string, unknown>
    SIDEBAR_AUTO_COLLAPSE_WIDTH?: number
    getPageLabel?: (pageId: string) => string
    findPageGroup?: (pageId: string) => unknown
    workspaceEnsureStaticTab?: (...args: unknown[]) => void
    workspaceRenderStaticTabs?: (...args: unknown[]) => void
    workspaceRenderTabs?: (...args: unknown[]) => void
    workspaceNotify?: (message: string) => void
    skillHubToast?: (message: string) => void
    closeUserMenu?: () => void
    applyResponsiveSidebarCollapse?: () => void
    aiRefreshPageAssistant?: () => void
    aiHideEmptyState?: () => void
    addAiMessage?: (role: string, text: string) => void
    aiSend?: () => void
    newAiConversation?: () => void
    aiQuick?: (text: string) => void
    toggleAI?: (forceState?: boolean) => void
    toggleDarkMode?: (forceState?: boolean) => void
    goPortalHome?: () => void
    openSkillManagerOverlay?: () => void
    openSkillManagerFromUserMenu?: () => void
    openSkillCreatePage?: () => void
    openPermissionManagerPage?: () => void
    openPocAdjustmentLog?: () => void
    workspaceOpenExternalLink?: (event: Event, linkEl: HTMLAnchorElement) => boolean
    __leaiVueSwitchPage?: (pageId: string) => void
    __leaiGetPageRenderer?: (pageId: string) => (() => string) | null
    __leaiHasPageRenderer?: (pageId: string) => boolean
    switchPage?: ((pageId: string) => void) & { __leaiVueBase?: boolean }
    loadOverviewStats?: () => void
    initDashboard?: () => void
    qualityRefresh?: () => void
    opsRenderTraffic?: () => void
    opsRenderGMV?: () => void
    geoLoadData?: () => void
    geoLoadSourcePage?: () => void
    geoLoadIntentPage?: () => void
    geoLoadConversionPage?: () => void
    loadKnowledgeStats?: () => void
    loadEmployeeOverview?: () => void
    loadCertificationTable?: (page?: number) => void
    renderKbBody?: () => void
    poolRefresh?: () => void
    governmentPoolRefresh?: () => void
    scoreRefresh?: () => void
    agreementOrderRefresh?: () => void
  }
}

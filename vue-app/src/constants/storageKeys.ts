export const STORAGE_KEYS = {
  sidebarCollapsed: 'leai.sidebar.collapsed',
  legacySidebarCollapsed: 'sidebar_collapsed',
  darkMode: 'leai.theme.dark',
  legacyDarkMode: 'dark_mode',
  aiOpen: 'leai.ai.open',
  legacyAiOpen: 'ai_panel_open',
  workspaceSavedTabs: 'leai.workspace.savedTabs',
  legacyWorkspaceSavedTabs: 'leai_workspace_saved_tabs'
}

export function readBooleanStorage(primaryKey: string, legacyKey?: string, fallback = false) {
  const primary = localStorage.getItem(primaryKey)
  if (primary !== null) return primary === '1'
  const legacy = legacyKey ? localStorage.getItem(legacyKey) : null
  if (legacy !== null) return legacy === '1'
  return fallback
}

export function writeBooleanStorage(key: string, value: boolean) {
  localStorage.setItem(key, value ? '1' : '0')
}

export function clearBooleanStorage(...keys: Array<string | undefined>) {
  keys.filter(Boolean).forEach(key => {
    localStorage.removeItem(key as string)
  })
}

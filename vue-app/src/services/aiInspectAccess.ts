/** Menu access belongs to AI inspection; existing application permissions remain unchanged. */
export interface InspectMenuGroup {
  icon: string
  label: string
  children: Record<string, { label: string; path: string }>
}

export const AI_INSPECT_MENU: InspectMenuGroup = {
  icon: '<svg class="menu-icon" viewBox="0 0 20 20" fill="none" aria-hidden="true"><circle cx="10" cy="10" r="6.6"/><path d="M10 3.4v13.2M3.4 10h13.2"/><path d="M10 6.4a3.6 3.6 0 0 1 3.6 3.6"/></svg>',
  label: 'AI 巡检',
  children: {
    'aiinspect.overview': { label: '数据总览', path: '/aiinspect/overview' },
    'aiinspect.rules': { label: '巡检规则', path: '/aiinspect/rules' },
    'aiinspect.issues': { label: '问题处理', path: '/aiinspect/issues' },
    'aiinspect.notifications': { label: '通知记录', path: '/aiinspect/notifications' },
    'aiinspect.logs': { label: '运行日志', path: '/aiinspect/logs' }
  }
}

export function isAiInspectAdmin(role: string | null, permissions: readonly string[]): boolean {
  return role === '平台管理员' || permissions.includes('*')
}

export function withAiInspectMenu(
  existing: Record<string, InspectMenuGroup>,
  user: string | null,
  role: string | null,
  permissions: readonly string[]
): Record<string, InspectMenuGroup> {
  const result = { ...existing }
  if (!user) {
    delete result.aiinspect
    return result
  }
  const admin = isAiInspectAdmin(role, permissions)
  result.aiinspect = {
    ...AI_INSPECT_MENU,
    children: Object.fromEntries(Object.entries(AI_INSPECT_MENU.children).filter(([pageId]) =>
      admin || (pageId !== 'aiinspect.notifications' && pageId !== 'aiinspect.logs')
    ))
  }
  return result
}

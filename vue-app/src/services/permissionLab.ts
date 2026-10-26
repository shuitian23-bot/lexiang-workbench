import { permissionLabEnabled } from '@/config/runtimeMode'

export interface LabIdentity {
  username: string
  personType: 'internal' | 'external'
  manager: string
  systemApprover: string
  enabled: boolean
  workbenchAccess: boolean
  systemAdmin: boolean
}
export const labHeaders = (): Record<string, string> => permissionLabEnabled ? { 'X-Permission-Lab': '1' } : {}

// Reserved seeded identities always use the isolated API, never browser-only enable records.
export function isLabAccount(username: string): boolean {
  return permissionLabEnabled && ['noaccess', 'internal-disabled', 'external-disabled'].includes(username.trim().toLowerCase())
}

export function isPasswordlessLabAccount(username: string, loginType: 'internal' | 'external'): boolean {
  if (!permissionLabEnabled) return false
  const account = username.trim().toLowerCase()
  return loginType === 'internal'
    ? account === 'noaccess' || account === 'internal-disabled'
    : account === 'external-disabled'
}

export async function labApi<T>(path: string, body?: unknown, token?: string): Promise<T> {
  if (!permissionLabEnabled) throw new Error('隔离后台未开启')
  const controller = new AbortController()
  const timer = window.setTimeout(() => controller.abort(), 15000)
  try {
    const response = await fetch('/api/permission-lab' + path, {
      method: body === undefined ? 'GET' : 'POST', credentials: 'same-origin', signal: controller.signal, referrerPolicy: 'no-referrer',
      headers: { 'Content-Type': 'application/json', 'X-Permission-Lab': '1', ...(token ? { 'X-Approval-Token': token } : {}) },
      body: body === undefined ? undefined : JSON.stringify(body)
    })
    const data = await response.json()
    if (!response.ok) throw new Error(data.error || '后台请求失败，请重试')
    return data as T
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') throw new Error('请求超时，请刷新状态后重试，避免重复提交')
    throw error
  } finally { window.clearTimeout(timer) }
}

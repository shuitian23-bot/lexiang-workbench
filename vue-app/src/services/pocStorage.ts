import { isPocSandbox } from '@/config/runtimeMode'
import { POC_STORAGE_PREFIX, scopedDemoStorage } from './pocIsolation'

export const pocLocalStorage = scopedDemoStorage(() => window.localStorage, isPocSandbox)
export const pocSessionStorage = scopedDemoStorage(() => window.sessionStorage, isPocSandbox)
export function pocStorageEventKey(key: string | null) {
  if (!isPocSandbox || key === null) return key
  return key.startsWith(POC_STORAGE_PREFIX) ? key.slice(POC_STORAGE_PREFIX.length) : ''
}

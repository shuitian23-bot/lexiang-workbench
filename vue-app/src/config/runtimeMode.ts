import { pocLoginEnabled, runtimePaths } from '@/services/pocIsolation'

export const AUTH_MODE = import.meta.env.VITE_AUTH_MODE || (import.meta.env.DEV ? 'preview' : 'server')

export const allowPreviewAuth = AUTH_MODE === 'preview'

// Opt in at build time for an online POC; never change server authentication mode.
export const allowPocLogin = pocLoginEnabled(import.meta.env.VITE_POC_LOGIN_ENABLED, import.meta.env.DEV)
const paths = runtimePaths(import.meta.env.BASE_URL, typeof window === 'undefined' ? '' : window.location?.pathname || '')
export const normalAppBase = paths.normalBase
export const pocAppBase = paths.demoBase
export const isPocSandbox = paths.sandbox
export const appBase = paths.routerBase
export const allowPocSimulation = allowPocLogin && isPocSandbox
export const allowPocMailReview = allowPreviewAuth || allowPocSimulation

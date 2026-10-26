export const AUTH_MODE = import.meta.env.VITE_AUTH_MODE || (import.meta.env.DEV ? 'preview' : 'server')

export const allowPreviewAuth = AUTH_MODE === 'preview'

// Approval mail uses browser-local POC data; enabling it never creates a login session.
export const allowApprovalMailDemo = allowPreviewAuth || (
  typeof window !== 'undefined' && window.location.hostname === 'new.leaibot.cn'
)

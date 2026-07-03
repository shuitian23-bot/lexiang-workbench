export const AUTH_MODE = import.meta.env.VITE_AUTH_MODE || (import.meta.env.DEV ? 'preview' : 'server')

export const allowPreviewAuth = AUTH_MODE === 'preview'

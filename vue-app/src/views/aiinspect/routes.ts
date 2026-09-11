import type { RouteRecordRaw } from 'vue-router'

export const aiInspectRoutes: RouteRecordRaw[] = [
  { path: 'aiinspect', redirect: '/aiinspect/overview' },
  { path: 'aiinspect/overview', component: () => import('./AiInspectOverviewView.vue'), meta: { pageId: 'aiinspect.overview', group: 'aiinspect' } },
  { path: 'aiinspect/rules', component: () => import('./AiInspectRulesView.vue'), meta: { pageId: 'aiinspect.rules', group: 'aiinspect' } },
  { path: 'aiinspect/issues', component: () => import('./AiInspectIssuesView.vue'), meta: { pageId: 'aiinspect.issues', group: 'aiinspect' } },
  { path: 'aiinspect/notifications', component: () => import('./AiInspectNotificationsView.vue'), meta: { pageId: 'aiinspect.notifications', group: 'aiinspect' } },
  { path: 'aiinspect/logs', component: () => import('./AiInspectLogsView.vue'), meta: { pageId: 'aiinspect.logs', group: 'aiinspect' } }
]

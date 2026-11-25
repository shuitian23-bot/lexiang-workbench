import { computed, ref, shallowRef, watch, effectScope } from 'vue'
import { useAppStore } from '@/stores/app'
import { allowPocSimulation, isPocSandbox, isPocWorkbench } from '@/config/runtimeMode'
import { USAGE_DAILY_CREATOR_EVIDENCE } from '@/domain/usageDailyReport.js'
import { getUsageAnalysis, USAGE_ANCHOR_DATE } from '@/domain/usageDashboard.js'
import {
  resolveUsageDashboardAccess, loadUsageDashboardIdentity, canViewUsageDashboard,
  canViewUsageDetail, filterUsageRows, usageDashboardRouteAllowed
} from '@/domain/usageDashboardAccess.js'
import type { UsageAccessIdentity, UsageAccessPreview, UsageAccessSource, UsageAccessRow, UsageAccessView } from '@/domain/usageDashboardAccess.js'

type AppStore = ReturnType<typeof useAppStore>
const controllers = new WeakMap<AppStore, ReturnType<typeof createAccessController>>()
const dailyEvidence = USAGE_DAILY_CREATOR_EVIDENCE
const sampleSkills = getUsageAnalysis({ startDate: '2026-08-07', endDate: USAGE_ANCHOR_DATE }).skills
const sampleEvidence = sampleSkills.map(row => ({ creatorId: row.creatorId, skillId: row.id }))
const choices = [
  ...[...new Set(dailyEvidence.map(row => row.creatorId))].sort().map(id => ({ source: 'daily' as const, id, label: id })),
  ...[...new Map(sampleSkills.map(row => [row.creatorId, row.creator])).entries()].map(([id, label]) => ({ source: 'sample' as const, id, label: `${label}（${id}）` }))
]
const unverified = (): UsageAccessIdentity => ({ verified: false, userId: null, permissions: [] })

function createAccessController(app: AppStore) {
  const identity = shallowRef<UsageAccessIdentity>(unverified())
  const preview = ref<UsageAccessPreview | null>(null)
  const loading = ref(false)
  const loadedUser = ref<string | null>(null)
  let generation = 0
  let pending: Promise<void> | null = null
  let pendingUser: string | null = null
  const policy = computed(() => resolveUsageDashboardAccess({
    identity: loadedUser.value && loadedUser.value === app.user ? identity.value : undefined,
    creatorEvidence: dailyEvidence, sampleEvidence, catalogComplete: false, preview: preview.value
  }))

  async function ensureLoaded(force = false): Promise<void> {
    const user = app.user
    if (!user) { loading.value = false; return }
    if (pending && pendingUser === user) return pending
    if (!force && loadedUser.value === user && identity.value.verified) return
    const token = ++generation
    pendingUser = user
    loading.value = true
    const task = async () => {
      // This existing isolated workbench session is a labelled POC identity,
      // never a role grant for the normal application or a backend service.
      const verified = isPocSandbox
        ? isPocWorkbench && allowPocSimulation && app.usePreviewSession('admin')
          ? { verified: true, userId: 'admin', permissions: ['*'] } : unverified()
        : await loadUsageDashboardIdentity((url, options) => fetch(url, options))
      if (token !== generation || app.user !== user) return
      identity.value = verified.verified && verified.userId?.trim().toLowerCase() === user.trim().toLowerCase() ? verified : unverified()
      loadedUser.value = user
    }
    pending = task().finally(() => {
      if (token === generation) { loading.value = false; pending = null; pendingUser = null }
    })
    return pending
  }

  // One detached watcher per Pinia store invalidates identity synchronously on
  // logout/account changes; route guards and page consumers share this state.
  effectScope(true).run(() => watch(() => app.user, () => {
    generation += 1
    identity.value = unverified()
    loadedUser.value = null
    preview.value = null
    pending = null
    pendingUser = null
    loading.value = false
    if (app.user) void ensureLoaded()
  }, { immediate: true, flush: 'sync' }))

  function setPreview(value: UsageAccessPreview | null) {
    if (!policy.value.canPreview) return false
    preview.value = value ? { ...value } : null
    return true
  }

  return {
    scope: computed(() => policy.value.scope),
    currentCreatorITCode: computed(() => policy.value.currentCreatorITCode),
    canEnter: computed(() => policy.value.canEnter),
    canPreview: computed(() => policy.value.canPreview),
    isPreview: computed(() => policy.value.isPreview),
    allowedSource: computed(() => policy.value.allowedSource),
    reason: computed(() => policy.value.reason),
    loading: computed(() => loading.value),
    preview: computed(() => preview.value),
    creatorChoices: computed(() => policy.value.canPreview ? choices.map(row => ({ ...row })) : []),
    ensureLoaded, setPreview,
    canView: (view: UsageAccessView) => canViewUsageDashboard(policy.value, view),
    canViewDetail: (dimension: 'skills' | 'creators', id: string, source: UsageAccessSource = 'daily') => canViewUsageDetail(policy.value, dimension, id, source),
    filterRows: <T extends UsageAccessRow>(rows: readonly T[], dimension: 'skills' | 'creators', source: UsageAccessSource = 'daily') => filterUsageRows(policy.value, rows, dimension, source),
    routeAllowed: (request: { view?: unknown; creatorId?: unknown; skillId?: unknown; source?: unknown }) => usageDashboardRouteAllowed(policy.value, request)
  }
}

export function useUsageDashboardAccess() {
  const app = useAppStore()
  let controller = controllers.get(app)
  if (!controller) { controller = createAccessController(app); controllers.set(app, controller) }
  return controller
}

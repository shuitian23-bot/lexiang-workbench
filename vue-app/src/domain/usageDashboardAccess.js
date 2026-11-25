/**
 * @typedef {'daily'|'sample'} UsageAccessSource
 * @typedef {'overview'|'rankings'|'skills'|'creators'} UsageAccessView
 * @typedef {{ verified: boolean, userId: string|null, permissions: readonly string[] }} UsageAccessIdentity
 * @typedef {{ creatorId: string, skillId: string }} UsageCreatorEvidence
 * @typedef {{ source: UsageAccessSource, creatorId: string }} UsageAccessPreview
 * @typedef {{ id?: string, skillId?: string, creatorId?: string, date?: string }} UsageAccessRow
 * @typedef {{ scope: 'admin'|'person'|'none', currentCreatorITCode: string|null, ownedSkillIds: readonly string[], allowedSource: 'all'|UsageAccessSource, canEnter: boolean, canPreview: boolean, isPreview: boolean, reason: null|'identity-unverified'|'creator-unknown'|'not-creator'|'invalid-preview' }} UsageDashboardAccess
 */

/** Match canonical account IDs only; never infer an IT Code from a display name or email. @param {unknown} value */
function accountId(value) {
  const id = typeof value === 'string' ? value.trim().toLowerCase() : ''
  return /^[a-z0-9][a-z0-9._-]{0,127}$/.test(id) ? id : null
}

/** @param {Partial<UsageDashboardAccess>} [values] @returns {UsageDashboardAccess} */
function access(values = {}) {
  return Object.freeze({ scope: 'none', currentCreatorITCode: null, ownedSkillIds: Object.freeze([]), allowedSource: 'daily', canEnter: false, canPreview: false, isPreview: false, reason: 'identity-unverified', ...values })
}

/**
 * Ownership evidence may prove that someone created a Skill, never that an
 * unlisted person did not. Only a verified wildcard permission grants admin.
 * Preview is an in-memory reduction of that original administrator scope.
 * @param {{ identity?: UsageAccessIdentity, creatorEvidence?: readonly UsageCreatorEvidence[], sampleEvidence?: readonly UsageCreatorEvidence[], catalogComplete?: boolean, preview?: UsageAccessPreview|null }} [options]
 * @returns {UsageDashboardAccess}
 */
export function resolveUsageDashboardAccess({ identity, creatorEvidence = [], sampleEvidence = [], catalogComplete = false, preview = null } = {}) {
  if (!identity?.verified || typeof identity.userId !== 'string' || !identity.userId.trim()) return access()
  const administrator = Array.isArray(identity.permissions) && identity.permissions.includes('*')
  if (administrator && !preview) return access({ scope: 'admin', allowedSource: 'all', canEnter: true, canPreview: true, reason: null })
  const isPreview = administrator && preview != null
  const source = isPreview ? preview.source : 'daily'
  const id = accountId(isPreview ? preview.creatorId : identity.userId)
  const evidence = source === 'sample' && isPreview ? sampleEvidence : creatorEvidence
  const own = id && (source === 'daily' || source === 'sample') ? evidence.filter(row => accountId(row.creatorId) === id) : []
  if (!own.length) return access({
    canPreview: administrator, isPreview,
    reason: isPreview ? 'invalid-preview' : catalogComplete ? 'not-creator' : 'creator-unknown'
  })
  return access({
    scope: 'person', currentCreatorITCode: id,
    ownedSkillIds: Object.freeze([...new Set(own.map(row => row.skillId).filter(id => typeof id === 'string' && !!id.trim()))].sort()),
    allowedSource: source, canEnter: true, canPreview: administrator, isPreview, reason: null
  })
}

/** @param {UsageDashboardAccess} policy @param {unknown} view */
export function canViewUsageDashboard(policy, view) {
  if (!policy.canEnter || !['overview', 'rankings', 'skills', 'creators'].includes(String(view))) return false
  return policy.scope === 'admin' || (policy.scope === 'person' && (view === 'rankings' || view === 'creators'))
}

/** @param {UsageDashboardAccess} policy @param {unknown} source */
function sourceAllowed(policy, source) {
  return (source === 'daily' || source === 'sample') && (policy.allowedSource === 'all' || policy.allowedSource === source)
}

/**
 * A caller-supplied creator label never authorizes a Skill: IDs are checked
 * against the ownership evidence used to resolve this session's scope.
 * @param {UsageDashboardAccess} policy @param {'skills'|'creators'} dimension @param {unknown} targetId @param {UsageAccessSource} [source]
 */
export function canViewUsageDetail(policy, dimension, targetId, source = 'daily') {
  if (!policy.canEnter || !sourceAllowed(policy, source) || typeof targetId !== 'string' || !targetId.trim()) return false
  if (dimension !== 'skills' && dimension !== 'creators') return false
  if (policy.scope === 'admin') return true
  return dimension === 'creators'
    ? accountId(targetId) === policy.currentCreatorITCode
    : policy.ownedSkillIds.includes(targetId)
}

/** @param {UsageDashboardAccess} policy @param {UsageAccessRow} row @param {'skills'|'creators'} dimension @param {UsageAccessSource} source */
function rowAllowed(policy, row, dimension, source) {
  if (policy.scope === 'admin' && policy.canEnter && sourceAllowed(policy, source) && typeof row.date === 'string') return true
  const target = dimension === 'skills' ? row.skillId ?? row.id : row.creatorId ?? row.id
  if (!canViewUsageDetail(policy, dimension, target, source)) return false
  if (policy.scope === 'person' && row.creatorId != null && accountId(row.creatorId) !== policy.currentCreatorITCode) return false
  return row.skillId == null || canViewUsageDetail(policy, 'skills', row.skillId, source)
}

/** @template {UsageAccessRow} T @param {UsageDashboardAccess} policy @param {readonly T[]} rows @param {'skills'|'creators'} dimension @param {UsageAccessSource} [source] @returns {T[]} */
export function filterUsageRows(policy, rows, dimension, source = 'daily') {
  return rows.filter(row => rowAllowed(policy, row, dimension, source)).map(row => ({ ...row }))
}

/** A mixed-scope export is refused rather than exporting unauthorized rows. @param {UsageDashboardAccess} policy @param {readonly unknown[]} rows @param {'skills'|'creators'} dimension @param {UsageAccessSource} [source] */
export function canExportUsageRows(policy, rows, dimension, source = 'daily') {
  return rows.length > 0 && rows.every(row => row != null && typeof row === 'object' && rowAllowed(policy, /** @type {UsageAccessRow} */ (row), dimension, source))
}

/** @param {UsageDashboardAccess} policy @param {{view?:unknown,creatorId?:unknown,skillId?:unknown,source?:unknown}} [request] */
export function usageDashboardRouteAllowed(policy, request = {}) {
  const view = request.view ?? 'overview'
  const source = request.source ?? (policy.allowedSource === 'sample' ? 'sample' : 'daily')
  if (!canViewUsageDashboard(policy, view) || !sourceAllowed(policy, source)) return false
  if (request.creatorId != null && !canViewUsageDetail(policy, 'creators', request.creatorId, /** @type {UsageAccessSource} */ (source))) return false
  if (request.skillId != null && !canViewUsageDetail(policy, 'skills', request.skillId, /** @type {UsageAccessSource} */ (source))) return false
  return true
}

/**
 * Do not reuse the application's display fallback when session/menu requests
 * fail. This snapshot is deliberately not persisted to browser storage.
 * @param {(url:string, options?:RequestInit)=>Promise<{ok:boolean,json:()=>Promise<unknown>}>} fetcher
 * @returns {Promise<UsageAccessIdentity>}
 */
export async function loadUsageDashboardIdentity(fetcher) {
  const unavailable = () => ({ verified: false, userId: null, permissions: [] })
  try {
    const [meResponse, menuResponse] = await Promise.all(['/api/admin/me', '/api/harness/menu'].map(url => fetcher(url, { credentials: 'same-origin', cache: 'no-store' })))
    if (!meResponse.ok || !menuResponse.ok) return unavailable()
    const me = /** @type {{admin?:{username?:unknown},username?:unknown}} */ (await meResponse.json())
    const menu = /** @type {{permissions?:unknown}} */ (await menuResponse.json())
    const id = me?.admin?.username ?? me?.username
    if (typeof id !== 'string' || !id.trim() || !Array.isArray(menu?.permissions) || !menu.permissions.every(value => typeof value === 'string')) return unavailable()
    return { verified: true, userId: id, permissions: [...menu.permissions] }
  } catch { return unavailable() }
}

import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import {
  createPinnedScenarioStep,
  cloneScenarioTestSnapshot,
  evaluatePackageForPublish,
  evaluatePackageHealth,
  evaluateRuntimeAccess as evaluateScenarioRuntimeAccess,
  rebuildDraftFromCatalog,
  publishScenarioPackage,
  submitScenarioPackage,
  rejectScenarioPackage,
  evaluateScenarioPackageReview,
  resolveScenarioChain
} from '../domain/scenarioSkillPackages.js'
import { useSkillHubStore, type SkillHubItem } from './skillHub'
import { buildScenarioRunPlan } from '../domain/scenarioRunPlan.js'
import type { ScenarioSimulationReport, ScenarioSimulationRequest } from '../domain/scenarioPackageTesting.js'

export type ScenarioDependencyState = 'available' | 'expired' | 'unavailable' | 'emergency_disabled' | 'update_available'
export type ScenarioStepKind = 'required' | 'conditional'
export type ScenarioPermissionBucket = 'menu' | 'skill' | 'data' | 'action'

export interface ScenarioSkillPermissionSnapshot {
  menu: string[]
  skill: string[]
  data: string[]
  action: string[]
}

export interface ScenarioSelectableSkill {
  id: string
  name: string
  menu: string
  version: string
  status: 'published'
  onlineStatus: 'published'
  online: string
  description?: string
  inputDescription?: string
  outputDescription?: string
  permissions: ScenarioSkillPermissionSnapshot
}

export interface ScenarioPinnedStep {
  id: string
  skillId: string
  name: string
  menu: string
  pinnedVersion: string
  currentPublishedVersion: string
  kind: ScenarioStepKind
  condition?: string
  task?: string
  fixedRequirements?: string
  expectedOutput?: string
  inputDescription?: string
  required: boolean
  requiresConfirmation?: boolean
  requiresApproval?: boolean
  predecessorId?: string | null
  position?: { x: number; y: number }
  dependencyState: ScenarioDependencyState
  permissions: ScenarioSkillPermissionSnapshot
}

export interface ScenarioPackageHealth {
  status: 'healthy' | 'upgrade_required' | 'degraded' | 'paused'
  explanations: string[]
  blockedStepIds: string[]
  degradedStepIds: string[]
}

export interface ScenarioPackageAuditEvent {
  type: 'submitted' | 'approved' | 'published' | 'rejected'
  actorId: string
  at: string
  note?: string
}

export interface ScenarioSkillPackage {
  id: string
  name: string
  description: string
  targetAudience: string
  ownerId: string
  version: string
  status: 'draft' | 'review' | 'rejected' | 'published' | 'disabled'
  steps: ScenarioPinnedStep[]
  health: ScenarioPackageHealth
  updatedAt: string
  degradationNote?: string
  approvedAt?: string
  publishedAt?: string
  submittedAt?: string
  submittedBy?: string
  reviewedBy?: string
  reviewedAt?: string
  reviewNote?: string
  auditEvents?: ScenarioPackageAuditEvent[]
  testReport?: ScenarioSimulationReport
  testRequest?: ScenarioSimulationRequest
}

export interface ScenarioSkillPackageDraft {
  id: string
  name: string
  description: string
  targetAudience: string
  ownerId: string
  steps: ScenarioPinnedStep[]
  testReport?: ScenarioSimulationReport
  testRequest?: ScenarioSimulationRequest
}

export interface ScenarioPackageActor {
  id: string
  permissions: string[] | (Partial<ScenarioSkillPermissionSnapshot> & { policy?: string[] })
}

export interface ScenarioPackagePolicyEvaluation {
  ok: boolean
  canSelfApprove: boolean
  reasons: string[]
}

export interface ScenarioDraftEvaluation {
  ok: boolean
  reasons: string[]
  eligibilityReasons: string[]
  draft: ScenarioSkillPackageDraft
  policy: ScenarioPackagePolicyEvaluation
  health: ScenarioPackageHealth
}

const explicitPermissionSnapshots: Record<string, ScenarioSkillPermissionSnapshot> = {
  'employee-certification-insight': {
    menu: ['menu:employee-management'],
    skill: ['skill:employee-certification-insight'],
    data: ['data:employee-certification:read'],
    action: ['action:employee-certification-insight:run']
  },
  'workplace-segment-operations': {
    menu: ['menu:operations'],
    skill: ['skill:workplace-segment-operations'],
    data: ['data:workplace-segment:read'],
    action: ['action:workplace-segment-operations:run']
  },
  'enterprise-customer-followup': {
    menu: ['menu:enterprise-customers'],
    skill: ['skill:enterprise-customer-followup'],
    data: ['data:enterprise-customer:read'],
    action: ['action:enterprise-customer-followup:run']
  }
}

function clonePermissions(permissions: ScenarioSkillPermissionSnapshot): ScenarioSkillPermissionSnapshot {
  return {
    menu: [...permissions.menu],
    skill: [...permissions.skill],
    data: [...permissions.data],
    action: [...permissions.action]
  }
}

function permissionSnapshotFor(item: SkillHubItem): ScenarioSkillPermissionSnapshot {
  const suppliedSnapshot = (item as SkillHubItem & { permissions?: Partial<ScenarioSkillPermissionSnapshot> }).permissions
  if (suppliedSnapshot) {
    return {
      menu: [...(suppliedSnapshot.menu || [])],
      skill: [...(suppliedSnapshot.skill || [])],
      data: [...(suppliedSnapshot.data || [])],
      action: [...(suppliedSnapshot.action || [])]
    }
  }
  const knownSnapshot = explicitPermissionSnapshots[item.name]
  if (knownSnapshot) return clonePermissions(knownSnapshot)

  return {
    menu: [`menu:${item.category}`],
    skill: [`skill:${item.name}`],
    data: [`data:${item.name}:read`],
    action: [`action:${item.name}:run`]
  }
}

// Version-specific contracts for the existing demo catalog; never reuse across a new pin.
const publishedScenarioContracts: Record<string, { version: string; description: string; input: string; output: string }> = {
  'product-knowledge': { version: 'v1.0.7', description: '识别用户产品知识查询需求，返回配置参数、性能差异和可选机型说明。', input: '产品名称、使用需求或对比对象', output: '配置参数、性能差异和可选机型说明' },
  'voucher-recommend': { version: 'v0.1.3', description: '识别虚拟品充值、会员充值和券包权益推荐需求，输出推荐卡片。', input: '用户权益需求、充值类型和适用范围', output: '可选券包与权益推荐卡片' },
  'gmv-daily-summary': { version: 'v1.2.0', description: '汇总每日 GMV、订单量和渠道贡献，生成标准运营日报。', input: '统计日期、渠道和可访问的数据范围', output: '包含 GMV、订单量和渠道贡献的运营日报' },
  'employee-certification-insight': { version: 'v1.0.0', description: '输入职场员工的认证筛选条件，输出认证状态、待处理原因和可跟进名单。', input: '职场员工认证筛选条件', output: '认证状态、待处理原因和可跟进名单' },
  'workplace-segment-operations': { version: 'v1.2.0', description: '输入认证人群范围与经营时间，输出人群规模、转化表现和运营建议。', input: '认证人群范围与经营时间', output: '人群规模、转化表现和运营建议' },
  'enterprise-customer-followup': { version: 'v1.0.0', description: '输入企业客户及跟进目标，输出下一步跟进建议、重点事项和沟通要点。', input: '企业客户及跟进目标', output: '下一步跟进建议、重点事项和沟通要点' }
}

/** Convert only published Skill Hub records into a scenario-safe selection catalog. */
export function createSelectableScenarioSkills(items: SkillHubItem[]): ScenarioSelectableSkill[] {
  return items
    .filter((item) => (
      item.onlineStatus === 'published'
      && item.online !== '未发布'
    ))
    .map((item) => {
      const publishedContract = item.publishedContract?.version === item.online ? item.publishedContract : undefined
      const demoContract = publishedScenarioContracts[item.name]?.version === item.online ? publishedScenarioContracts[item.name] : undefined
      return {
        id: item.name,
        name: item.cnName,
        menu: item.category,
        version: item.online,
        status: 'published',
        onlineStatus: 'published',
        online: item.online,
        description: publishedContract ? publishedContract.description : demoContract?.description || `使用${item.cnName || item.name}完成本节点任务`,
        inputDescription: publishedContract ? publishedContract.input : demoContract?.input || '',
        outputDescription: publishedContract ? publishedContract.output : demoContract?.output || '',
        permissions: permissionSnapshotFor(item)
      }
    })
}

function createSeedScenarioPackages(selectableSkills: ScenarioSelectableSkill[]): ScenarioSkillPackage[] {
  const findSelectableSkill = (id: string) => {
    const skill = selectableSkills.find((item) => item.id === id)
    if (!skill) throw new Error(`场景技能包缺少 POC Skill：${id}`)
    return skill
  }
  const certification = createPinnedScenarioStep(
    findSelectableSkill('employee-certification-insight'),
    { id: 'workplace-certification', required: true }
  ) as ScenarioPinnedStep
  const operations = createPinnedScenarioStep(
    { ...findSelectableSkill('workplace-segment-operations'), version: 'v1.1.0', online: 'v1.1.0', description: undefined, inputDescription: '', outputDescription: '' },
    {
      id: 'workplace-segment-operations',
      required: true,
      currentPublishedVersion: 'v1.2.0',
      dependencyState: 'update_available'
    }
  ) as ScenarioPinnedStep
  const enterpriseFollowup = createPinnedScenarioStep(
    findSelectableSkill('enterprise-customer-followup'),
    {
      id: 'enterprise-customer-followup',
      kind: 'conditional',
      condition: '当认证人群需要企业客户服务时',
      required: false
    }
  ) as ScenarioPinnedStep
  const steps = [certification, operations, enterpriseFollowup]
  const reviewSteps = [
    certification,
    createPinnedScenarioStep(findSelectableSkill('workplace-segment-operations'), { id: operations.id, required: true }) as ScenarioPinnedStep,
    enterpriseFollowup
  ].map(step => ({ ...step, permissions: clonePermissions(step.permissions) }))
  const publishedAt = '2026-09-04T09:30:00.000Z'

  return [{
    id: 'seed-workplace-certification-operations',
    name: '职场人群认证经营管理',
    description: '当运营人员需要了解指定职场人群的认证状态、分析经营机会并准备企业客户跟进建议时使用；仅分析当前授权范围内的数据，不修改认证结果或直接联系客户。',
    targetAudience: '认证运营与企业客户运营人员',
    ownerId: 'pm-li',
    version: 'v1.0.0',
    status: 'published',
    steps,
    health: evaluatePackageHealth(steps) as ScenarioPackageHealth,
    updatedAt: publishedAt,
    approvedAt: publishedAt,
    publishedAt,
    submittedAt: publishedAt,
    submittedBy: 'pm-li',
    reviewedAt: publishedAt,
    reviewedBy: 'admin',
    auditEvents: [
      { type: 'submitted', actorId: 'pm-li', at: publishedAt },
      { type: 'approved', actorId: 'admin', at: publishedAt },
      { type: 'published', actorId: 'admin', at: publishedAt }
    ]
  }, {
    id: 'seed-scenario-pending-review',
    name: '职场人群经营协作（审核示例）',
    description: '审核示例：当需要结合职场认证与人群经营情况制定客户跟进计划时使用；仅生成授权数据范围内的分析与建议，不修改认证结果或发送客户消息。',
    targetAudience: '认证运营与企业客户运营人员',
    ownerId: 'pm-li',
    version: 'v1.0.0',
    status: 'review',
    steps: reviewSteps,
    health: evaluatePackageHealth(reviewSteps) as ScenarioPackageHealth,
    updatedAt: publishedAt,
    submittedAt: publishedAt,
    submittedBy: 'pm-li',
    auditEvents: [{ type: 'submitted', actorId: 'pm-li', at: publishedAt }]
  }]
}

export const useScenarioSkillPackagesStore = defineStore('scenarioSkillPackages', () => {
  const skillHub = useSkillHubStore()
  const selectableSkills = computed(() => createSelectableScenarioSkills(skillHub.items))
  const storedPackages = ref<ScenarioSkillPackage[]>(createSeedScenarioPackages(selectableSkills.value))

  function clonePackage(packageItem: ScenarioSkillPackage): ScenarioSkillPackage {
    return {
      ...packageItem,
      testReport: cloneScenarioTestSnapshot(packageItem.testReport),
      testRequest: cloneScenarioTestSnapshot(packageItem.testRequest),
      steps: packageItem.steps.map((step) => ({
        ...step,
        position: step.position && Number.isFinite(step.position.x) && Number.isFinite(step.position.y)
          ? { x: step.position.x, y: step.position.y }
          : undefined,
        permissions: clonePermissions(step.permissions)
      })),
      health: {
        ...packageItem.health,
        explanations: [...packageItem.health.explanations],
        blockedStepIds: [...packageItem.health.blockedStepIds],
        degradedStepIds: [...packageItem.health.degradedStepIds]
      },
      auditEvents: packageItem.auditEvents?.map((event) => ({ ...event }))
    }
  }

  function refreshStep(step: ScenarioPinnedStep): ScenarioPinnedStep {
    const currentSkill = skillHub.items.find((item) => item.name === step.skillId)
    const isOnline = currentSkill?.onlineStatus === 'published' && currentSkill.online !== '未发布'
    const preservedUnavailableState = ['expired', 'unavailable', 'emergency_disabled'].includes(step.dependencyState)

    if (!currentSkill || !isOnline) {
      return {
        ...step,
        dependencyState: currentSkill?.onlineStatus === 'disabled' ? 'emergency_disabled' : 'unavailable',
        permissions: clonePermissions(step.permissions)
      }
    }

    const currentPublishedVersion = currentSkill.online
    return {
      ...step,
      currentPublishedVersion,
      dependencyState: preservedUnavailableState
        ? step.dependencyState
        : currentPublishedVersion === step.pinnedVersion
          ? 'available'
          : 'update_available',
      permissions: clonePermissions(step.permissions)
    }
  }

  function refreshPackage(packageItem: ScenarioSkillPackage): ScenarioSkillPackage {
    const steps = packageItem.steps.map(refreshStep)
    return clonePackage({
      ...packageItem,
      steps,
      health: evaluatePackageHealth(steps) as ScenarioPackageHealth
    })
  }

  const packages = computed(() => storedPackages.value.map(refreshPackage))

  function evaluateDraft(draft: ScenarioSkillPackageDraft, actor: ScenarioPackageActor): ScenarioDraftEvaluation {
    const rebuilt = rebuildDraftFromCatalog(draft, selectableSkills.value) as {
      draft: ScenarioSkillPackageDraft
      reasons: string[]
    }
    const eligibilityReasons = rebuilt.reasons
    const resolved = resolveScenarioChain(rebuilt.draft.steps)
    const reconciledDraft = { ...rebuilt.draft, steps: resolved.steps } as ScenarioSkillPackageDraft
    const policy = evaluatePackageForPublish(reconciledDraft, actor) as ScenarioPackagePolicyEvaluation
    const health = evaluatePackageHealth(reconciledDraft.steps) as ScenarioPackageHealth
    const reasons = [...new Set([
      ...eligibilityReasons,
      ...policy.reasons,
      ...(health.status === 'paused' ? health.explanations : [])
    ])]

    return {
      ok: eligibilityReasons.length === 0 && policy.ok && health.status !== 'paused',
      reasons,
      eligibilityReasons,
      draft: reconciledDraft,
      policy,
      health
    }
  }

  function submitDraft(draft: ScenarioSkillPackageDraft, actor: ScenarioPackageActor): ScenarioSkillPackage {
    if (storedPackages.value.some((item) => item.id === draft.id)) {
      throw new Error(`场景技能包 ID 已存在：${draft.id}`)
    }
    const submitted = submitScenarioPackage(
      draft,
      actor,
      new Date().toISOString(),
      selectableSkills.value
    ) as ScenarioSkillPackage
    storedPackages.value.unshift(clonePackage(submitted))
    return clonePackage(submitted)
  }

  function reviewDecision(packageId: string, actor: ScenarioPackageActor): { ok: boolean; reasons: string[] } {
    const current = storedPackages.value.find(item => item.id === packageId)
    return current ? evaluateScenarioPackageReview(current, actor) : { ok: false, reasons: ['场景技能包不存在'] }
  }

  function approvePackage(id: string, actor: ScenarioPackageActor, note = ''): ScenarioSkillPackage {
    const current = storedPackages.value.find(item => item.id === id)
    if (!current) throw new Error(`场景技能包不存在：${id}`)
    const published = publishScenarioPackage(current, actor, new Date().toISOString(), selectableSkills.value, note) as ScenarioSkillPackage
    storedPackages.value = storedPackages.value.map(item => item.id === id ? clonePackage(published) : item)
    return clonePackage(published)
  }

  function rejectPackage(id: string, actor: ScenarioPackageActor, reason: string): ScenarioSkillPackage {
    const current = storedPackages.value.find(item => item.id === id)
    if (!current) throw new Error(`场景技能包不存在：${id}`)
    const rejected = rejectScenarioPackage(current, actor, reason, new Date().toISOString()) as ScenarioSkillPackage
    storedPackages.value = storedPackages.value.map(item => item.id === id ? clonePackage(rejected) : item)
    return clonePackage(rejected)
  }

  function resubmitDraft(draft: ScenarioSkillPackageDraft, actor: ScenarioPackageActor): ScenarioSkillPackage {
    const current = storedPackages.value.find(item => item.id === draft.id)
    if (!current) throw new Error('仅已驳回的原场景技能包可以重新提交')
    const submitted = submitScenarioPackage(draft, actor, new Date().toISOString(), selectableSkills.value, current) as ScenarioSkillPackage
    storedPackages.value = storedPackages.value.map(item => item.id === draft.id ? clonePackage(submitted) : item)
    return clonePackage(submitted)
  }

  function findPackage(id: string) {
    const found = storedPackages.value.find((item) => item.id === id)
    return found ? refreshPackage(found) : undefined
  }

  function evaluateRuntimeAccess(
    packageId: string,
    caller: ScenarioPackageActor,
    activeOptionalStepIds: string[] = [],
    requestedSkillIds: string[] = [],
    evidence: { confirmedStepIds?: string[]; approvedStepIds?: string[] } = {}
  ) {
    const packageItem = findPackage(packageId)
    if (!packageItem) throw new Error(`场景技能包不存在：${packageId}`)
    return evaluateScenarioRuntimeAccess(
      packageItem,
      caller,
      activeOptionalStepIds,
      requestedSkillIds,
      evidence
    )
  }

  function resetToInitialMock() {
    storedPackages.value = createSeedScenarioPackages(selectableSkills.value)
  }

  function prepareRunPlan(
    packageId: string,
    caller: ScenarioPackageActor,
    request: { input?: string; activeOptionalStepIds?: string[]; evidence?: { confirmedStepIds?: string[]; approvedStepIds?: string[] } } = {}
  ) {
    const packageItem = findPackage(packageId)
    if (!packageItem) throw new Error(`场景技能包不存在：${packageId}`)
    return buildScenarioRunPlan(packageItem, caller, request)
  }

  return {
    packages,
    selectableSkills,
    evaluateDraft,
    submitDraft,
    reviewDecision,
    approvePackage,
    rejectPackage,
    resubmitDraft,
    evaluateRuntimeAccess,
    prepareRunPlan,
    findPackage,
    resetToInitialMock
  }
})

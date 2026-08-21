const SHANGHAI_TIME_ZONE = 'Asia/Shanghai'
const CAPABILITY_FLOW_REVISION = 'controlled-update-20260821'

const seedUpdates = {
  'product-knowledge': {
    recordId: 'capability-change-product-knowledge-20260814',
    flowRevision: CAPABILITY_FLOW_REVISION,
    status: 'available',
    contextId: 'product.knowledge',
    menuPath: '商品管理 / 产品知识',
    baseMenu: 'GEO 看板',
    currentContextCodes: ['dashboard.geoKnowledge'],
    currentCapabilityVersion: 'cap-2026.08.03',
    targetCapabilityVersion: 'cap-2026.08.14',
    detectedAt: '2026-08-14 09:30',
    summary: '新增商品对比接口，并补充能效、重量和接口类型字段。',
    count: 4,
    notificationState: '待服务接入',
    reportMarkdown: [
      '## 变化摘要',
      '产品知识能力新增多商品参数对比，并补充能效、重量和接口类型字段。',
      '',
      '## 受影响能力',
      '| 能力上下文 | 变化类型 | 业务变化 | 对当前 Skill 的影响 |',
      '| --- | --- | --- | --- |',
      '| GEO 看板 / 手工上传知识 | 增强 | 新增批量对比和结构化参数 | 可扩展多机型对比，原查询链路继续可用 |',
      '',
      '## 权限与风险',
      '- 本次为增强变化，不改变当前线上版本权限。',
      '- 新字段进入输出前仍需完成评估和审核。',
      '',
      '## 建议处理',
      '- 更新原 Skill：保留产品问答目标并补齐横向对比能力。',
      '- 可选新能力：独立产品知识上下文由负责人决定是否加入。'
    ].join('\n'),
    technicalDetails: [
      'API product.compare.batch：新增批量商品参数对比。',
      '字段 energy_grade、weight_kg、port_types：新增或结构化。'
    ],
    affectedContexts: [
      {
        contextId: 'dashboard.geoKnowledge',
        name: '手工上传知识',
        menuPath: 'GEO 看板 / 手工上传知识',
        currentVersion: 'cap-2026.08.03',
        targetVersion: 'cap-2026.08.14'
      }
    ],
    optionalContexts: [
      {
        contextId: 'product.knowledge',
        name: '产品知识',
        menuPath: '商品管理 / 产品知识',
        version: 'cap-2026.08.14',
        summary: '新增独立商品知识能力，可由负责人决定是否扩展当前 Skill。'
      }
    ],
    changes: [
      { id: 'compare-api', kind: 'enhancement', objectType: 'API', name: '商品参数对比', before: '仅支持单商品参数查询', after: '新增批量商品参数对比接口', impact: '可增加多机型横向对比能力，不影响原查询链路。' },
      { id: 'energy-field', kind: 'enhancement', objectType: '字段', name: 'energy_grade', before: '无', after: '新增能效等级字段', impact: '可补充节能维度回答，需要更新输出字段说明。' },
      { id: 'weight-field', kind: 'enhancement', objectType: '字段', name: 'weight_kg', before: '文本描述', after: '结构化数值字段', impact: '可用于精确重量比较。' },
      { id: 'port-field', kind: 'enhancement', objectType: '字段', name: 'port_types', before: '无', after: '新增接口类型列表', impact: '可回答扩展坞和外设兼容性问题。' }
    ]
  },
  'voucher-recommend': {
    recordId: 'capability-change-voucher-recommend-20260814',
    flowRevision: CAPABILITY_FLOW_REVISION,
    status: 'available',
    contextId: 'benefit.voucher',
    menuPath: '权益管理 / 券包配置',
    baseMenu: '乐享运营',
    currentContextCodes: ['dashboard.overview'],
    currentCapabilityVersion: 'cap-2026.08.05',
    targetCapabilityVersion: 'cap-2026.08.14',
    detectedAt: '2026-08-14 10:05',
    summary: '券包适用人群权限点调整，原通用查询权限需拆分校验。',
    count: 1,
    notificationState: '待服务接入',
    reportMarkdown: [
      '## 变化摘要',
      '券包适用人群读取权限由通用权限拆分为独立权限点。',
      '',
      '## 受影响能力',
      '| 能力上下文 | 变化类型 | 业务变化 | 对当前 Skill 的影响 |',
      '| --- | --- | --- | --- |',
      '| 乐享运营 / 运营总览 | 权限配置 | 适用人群需要独立读取权限 | 未授权时不能返回适用人群 |',
      '',
      '## 权限与风险',
      '- 新权限点：voucher.audience.read。',
      '- 该变化不能静默忽略，只能暂不处理并保留风险提示。',
      '',
      '## 建议处理',
      '- 更新原 Skill：补齐权限校验和无权限兜底。'
    ].join('\n'),
    technicalDetails: [
      '权限点由 voucher.read 调整为 voucher.audience.read。'
    ],
    affectedContexts: [
      {
        contextId: 'dashboard.overview',
        name: '运营总览',
        menuPath: '乐享运营 / 运营总览',
        currentVersion: 'cap-2026.08.05',
        targetVersion: 'cap-2026.08.14'
      }
    ],
    optionalContexts: [],
    changes: [
      { id: 'voucher-audience-permission', kind: 'permission', objectType: '权限点', name: 'voucher.audience.read', before: 'voucher.read', after: 'voucher.audience.read', impact: '缺少新权限时无法读取适用人群，更新前应保留原线上版本。' }
    ]
  }
}

Object.assign(seedUpdates, {
  'capability-draft-demo': createLifecycleSeedUpdate({
    skillName: 'capability-draft-demo',
    contextId: 'dashboard.query',
    menuPath: '乐享运营 / Query 分析',
    currentVersion: 'cap-2026.08.10',
    targetVersion: 'cap-2026.08.21',
    detectedAt: '2026-08-21 09:10',
    summary: 'Query 结果新增业务标签和异常原因字段。'
  }),
  'low-stock-auto-offline': createLifecycleSeedUpdate({
    skillName: 'low-stock-auto-offline',
    contextId: 'inventory.stock-policy',
    menuPath: '乐享运营 / 库存策略',
    currentVersion: 'cap-2026.08.11',
    targetVersion: 'cap-2026.08.21',
    detectedAt: '2026-08-21 09:20',
    summary: '库存策略新增活动排除条件和下架原因字段。'
  }),
  'lenovo-order-detail-query': createLifecycleSeedUpdate({
    skillName: 'lenovo-order-detail-query',
    contextId: 'order.detail',
    menuPath: '订单管理 / 订单明细',
    currentVersion: 'cap-2026.08.09',
    targetVersion: 'cap-2026.08.21',
    detectedAt: '2026-08-21 09:40',
    summary: '订单明细新增履约节点和售后状态字段。'
  }),
  'weather-query': createLifecycleSeedUpdate({
    skillName: 'weather-query',
    contextId: 'operations.weather',
    menuPath: '乐享运营 / 实时天气',
    currentVersion: 'cap-2026.08.08',
    targetVersion: 'cap-2026.08.21',
    detectedAt: '2026-08-21 09:50',
    summary: '天气能力新增预警等级和运营活动建议字段。'
  }),
  'workplace-employee-review-analysis': createLifecycleSeedUpdate({
    skillName: 'workplace-employee-review-analysis',
    contextId: 'employee.review',
    menuPath: '在职员工管理 / 职场员工审核',
    currentVersion: 'cap-2026.08.07',
    targetVersion: 'cap-2026.08.21',
    detectedAt: '2026-08-21 10:00',
    summary: '审核结果新增失败原因分组和处理时长字段。'
  })
})

function createLifecycleSeedUpdate({ skillName, contextId, menuPath, currentVersion, targetVersion, detectedAt, summary }) {
  const contextName = menuPath.split(' / ').at(-1) || menuPath
  return {
    recordId: `capability-change-${skillName}-20260821`,
    flowRevision: CAPABILITY_FLOW_REVISION,
    status: 'available',
    contextId,
    menuPath,
    baseMenu: menuPath.split(' / ')[0],
    currentContextCodes: [contextId],
    currentCapabilityVersion: currentVersion,
    targetCapabilityVersion: targetVersion,
    detectedAt,
    summary,
    count: 1,
    notificationState: '待服务接入',
    reportMarkdown: [
      '## 变化摘要',
      summary,
      '',
      '## 受影响能力',
      '| 能力上下文 | 变化类型 | 业务变化 | 对当前 Skill 的影响 |',
      '| --- | --- | --- | --- |',
      `| ${menuPath} | 增强 | ${summary} | 需要重新确认输入输出和测试用例 |`,
      '',
      '## 权限与风险',
      '- 当前线上或候选版本不会被自动修改。',
      '- 选择更新后需要重新完成评估、审核和发布。',
      '',
      '## 建议处理',
      '- 查看业务影响后选择更新或忽略更新。'
    ].join('\n'),
    technicalDetails: [`上下文 ${contextId}：${currentVersion} -> ${targetVersion}。`],
    affectedContexts: [{
      contextId,
      name: contextName,
      menuPath,
      currentVersion,
      targetVersion
    }],
    optionalContexts: [],
    changes: [{
      id: `${skillName}-enhancement`,
      kind: 'enhancement',
      objectType: '字段',
      name: contextName,
      before: currentVersion,
      after: targetVersion,
      impact: summary
    }]
  }
}

function clone(value) {
  return value ? JSON.parse(JSON.stringify(value)) : undefined
}

const WORKFLOW_STATUS_LABELS = {
  draft: '草稿',
  review: '待审批',
  approved: '已审批待发布',
  published: '已发布',
  disabled: '已禁用',
  rejected: '已驳回'
}

function workflowStatusOf(item) {
  return item?.workflowStatus || item?.editStatus || item?.status || 'draft'
}

function onlineStatusOf(item) {
  if (item?.onlineStatus) return item.onlineStatus
  if (item?.status === 'disabled') return 'disabled'
  return item?.online && item.online !== '未发布' ? 'published' : 'unpublished'
}

function decisionUpdateOf(update) {
  if (update?.task?.kind === 'additional_change' && update.task.status !== 'succeeded' && update.activeTaskUpdate) {
    return update.activeTaskUpdate
  }
  return update?.status === 'processing_with_available' && pendingUpdatesOf(update).length
    ? pendingUpdatesOf(update)[0]
    : update
}

function pendingUpdatesOf(update) {
  const candidates = [update?.pendingUpdate, ...(update?.pendingUpdates || [])].filter(Boolean)
  const unique = new Map()
  candidates.forEach(candidate => {
    if (candidate.recordId && !unique.has(candidate.recordId)) unique.set(candidate.recordId, candidate)
  })
  return [...unique.values()]
}

function queuePendingCapabilityUpdate(storedUpdate, seededUpdate) {
  const queue = pendingUpdatesOf(storedUpdate).map(clone)
  if (!queue.some(update => update.recordId === seededUpdate.recordId)) queue.push(clone(seededUpdate))
  return {
    ...storedUpdate,
    status: 'processing_with_available',
    pendingUpdate: clone(queue[0]),
    pendingUpdates: queue,
    pendingDecisionCount: queue.length,
    activeUpdateChangeRecordIds: mergeContextCodes(storedUpdate.activeUpdateChangeRecordIds, [storedUpdate.recordId])
  }
}

export function capabilityDecisionUpdate(item) {
  return clone(decisionUpdateOf(item?.capabilityUpdate))
}

function isHighRiskUpdate(update) {
  return (update?.changes || []).some(change => change.kind === 'breaking' || change.kind === 'permission')
}

function action(code, enabled = true, payload) {
  return payload ? { code, enabled, payload } : { code, enabled }
}

export function skillHubRowPresentation(item) {
  const workflowStatus = workflowStatusOf(item)
  const updateStatus = item?.capabilityUpdate?.status || 'none'
  if (updateStatus === 'processing' || updateStatus === 'processing_with_available') {
    const mainStatus = workflowStatus === 'draft' ? 'processing' : workflowStatus
    return {
      mainStatus,
      mainStatusLabel: mainStatus === 'processing' ? '更新中' : WORKFLOW_STATUS_LABELS[mainStatus],
      updateStatus: updateStatus === 'processing_with_available' ? 'available' : 'none',
      updateStatusLabel: updateStatus === 'processing_with_available' ? '有更新' : ''
    }
  }
  const updateStatusLabel = {
    available: '有更新',
    preparing: '正在准备更新',
    failed: '更新失败'
  }[updateStatus] || ''
  return {
    mainStatus: workflowStatus,
    mainStatusLabel: WORKFLOW_STATUS_LABELS[workflowStatus],
    updateStatus: updateStatusLabel ? updateStatus : 'none',
    updateStatusLabel
  }
}

export function skillHubMutationDecision(item, actorUser, intent = 'edit', score = 0) {
  if (!item) return { allowed: true, reason: '' }
  if (!actorUser || item.owner !== actorUser) {
    return { allowed: false, reason: '只有当前 Skill 负责人可以保存或提交该 Skill。' }
  }
  if (intent !== 'submit_review') return { allowed: true, reason: '' }
  if (Number(score || 0) < 0.8) {
    return { allowed: false, reason: `当前综合评分 ${Number(score || 0).toFixed(3)}，需达到 0.80 才能提交审核。` }
  }
  const update = item.capabilityUpdate
  if (
    ['available', 'preparing', 'processing_with_available', 'failed'].includes(update?.status)
    || update?.task?.status === 'generating'
    || update?.task?.status === 'failed'
  ) {
    return { allowed: false, reason: '仍有能力变化待处理或扫描待重试，完成后才能提交审核。' }
  }
  return { allowed: true, reason: '' }
}

export function resolveSkillHubAllowedActions(item, actor = {}) {
  const workflowStatus = workflowStatusOf(item)
  const updateStatus = item?.capabilityUpdate?.status || 'none'
  const canMaintain = item?.owner === actor.user
  const isAdmin = actor.role === 'admin'
  const changePayload = item?.capabilityUpdate?.recordId
    ? { changeRecordId: decisionUpdateOf(item.capabilityUpdate)?.recordId || item.capabilityUpdate.recordId }
    : undefined

  if (updateStatus === 'preparing' || item?.capabilityUpdate?.task?.status === 'generating') {
    return [
      action('view_change', true, changePayload),
      ...(canMaintain ? [action('start_update', false, changePayload)] : [])
    ]
  }
  if (item?.capabilityUpdate?.task?.kind === 'additional_change' && item.capabilityUpdate.task.status === 'failed') {
    return [
      action('view_change', true, changePayload),
      action('view_update_error', true, changePayload),
      ...(canMaintain ? [action('retry_update', true, changePayload)] : [])
    ]
  }
  if (updateStatus === 'failed') {
    return [
      action('view_change', true, changePayload),
      action('view_update_error', true, changePayload),
      ...(canMaintain ? [action('retry_update', true, changePayload), action('ignore_update', true, changePayload)] : [])
    ]
  }
  if (updateStatus === 'available' || updateStatus === 'processing_with_available') {
    return [
      action('view_change', true, changePayload),
      ...(canMaintain ? [action('start_update', true, changePayload), action('ignore_update', true, changePayload)] : [])
    ]
  }
  if (updateStatus === 'processing') {
    if (workflowStatus === 'draft' || workflowStatus === 'rejected') {
      return [action('view_change', true, changePayload), ...(canMaintain ? [action('continue_update', true)] : [])]
    }
    if (workflowStatus === 'review') {
      return isAdmin
        ? [action('view_change', true, changePayload), action('evaluate'), action('approve'), action('reject')]
        : [action('view_change', true, changePayload), action('view'), ...(canMaintain ? [action('withdraw_review')] : [])]
    }
    if (workflowStatus === 'approved') {
      return [action('view'), ...(isAdmin ? [action('publish')] : [])]
    }
  }

  const ownerActions = {
    draft: ['edit', 'evaluate', 'test', 'delete'],
    review: ['view', 'withdraw_review'],
    approved: ['view'],
    published: ['view', 'edit', 'evaluate', 'test'],
    disabled: ['view', 'edit', 'evaluate', 'test'],
    rejected: ['view', 'edit', 'evaluate', 'test']
  }
  const adminActions = {
    draft: ['view'],
    review: ['view', 'evaluate', 'approve', 'reject'],
    approved: ['view', 'publish'],
    published: ['view', 'disable'],
    disabled: ['view', 'enable'],
    rejected: ['view']
  }
  const maintainerActions = canMaintain ? [...(ownerActions[workflowStatus] || ['view'])] : ['view']
  if (canMaintain && (workflowStatus === 'draft' || workflowStatus === 'rejected') && Number(item?.score || 0) >= 0.8) {
    const deleteIndex = maintainerActions.indexOf('delete')
    maintainerActions.splice(deleteIndex >= 0 ? deleteIndex : maintainerActions.length, 0, 'submit_review')
  }
  const codes = new Set([
    ...maintainerActions,
    ...(isAdmin ? adminActions[workflowStatus] || ['view'] : [])
  ])
  return [...codes].map(code => action(code))
}

function mergeContextCodes(selectedCodes = [], requiredCodes = []) {
  return Array.from(new Set([...selectedCodes, ...requiredCodes]))
}

function capabilityScanMessageId(update) {
  return `capability-scan-${update.recordId}`
}

export function buildCapabilityScanQuery(item) {
  const update = item?.capabilityUpdate
  const affectedContexts = Array.isArray(update?.affectedContexts) ? update.affectedContexts.filter(Boolean) : []
  const affected = affectedContexts[0]
  const menuPath = affected?.menuPath || update?.menuPath || update?.contextId || '当前能力'
  const currentVersion = affected?.currentVersion || update?.currentCapabilityVersion || '当前版本'
  const targetVersion = affected?.targetVersion || update?.targetCapabilityVersion || '目标版本'
  const summary = update?.summary || '能力上下文发生变化'
  const updateDescription = affectedContexts.length > 1
    ? [
        `检测到 ${affectedContexts.length} 个能力上下文更新：`,
        ...affectedContexts.map((context, index) => {
          const contextPath = context.menuPath || context.name || context.contextId || '当前能力'
          const contextCurrentVersion = context.currentVersion || update?.currentCapabilityVersion || '当前版本'
          const contextTargetVersion = context.targetVersion || update?.targetCapabilityVersion || '目标版本'
          return `${index + 1}. 「${contextPath}」由 ${contextCurrentVersion} 更新为 ${contextTargetVersion}`
        }),
        `主要变化为：${summary}`
      ].join('\n')
    : `检测到「${menuPath}」能力上下文由 ${currentVersion} 更新为 ${targetVersion}，主要变化为：${summary}`
  return [
    updateDescription,
    '请保留当前 Skill 的业务目标，基于最新能力重新梳理需求澄清、输入输出、权限边界、异常兜底和验收用例；对不应纳入本 Skill 的变化明确标记为“不采用”，不要直接发布。'
  ].join('\n')
}

function ensureCapabilityScanMessage(draft, item, update) {
  const messages = Array.isArray(draft.clarifyMessages) ? draft.clarifyMessages : []
  const messageId = capabilityScanMessageId(update)
  const existing = messages.find(message => message?.id === messageId)
  if (existing) {
    existing.kind = 'user'
    existing.text = buildCapabilityScanQuery(item)
    existing.autoExecute = true
  } else {
    messages.unshift({ id: messageId, kind: 'user', autoExecute: true, text: buildCapabilityScanQuery(item) })
  }
  draft.clarifyMessages = messages
}

export function shouldShowCapabilityChangeSummary(update) {
  return ['available', 'preparing', 'processing_with_available', 'failed'].includes(update?.status)
}

export function capabilityUpdatePresentation(item) {
  const update = item?.capabilityUpdate
  if (!update || update.status === 'ignored' || update.status === 'resolved') {
    return { visible: false, statusLabel: '', actionLabel: '', actionLoading: false, ignoreLabel: '' }
  }
  const base = { visible: true, statusLabel: '', actionLabel: '', actionLoading: false, ignoreLabel: '' }
  if (update.status === 'available' || update.status === 'processing_with_available') {
    return { ...base, statusLabel: '有更新', actionLabel: '更新', ignoreLabel: '忽略更新' }
  }
  if (update.status === 'preparing') {
    return { ...base, statusLabel: '正在准备更新', actionLabel: '正在准备', actionLoading: true }
  }
  if (update.status === 'failed') {
    return { ...base, statusLabel: '更新失败', actionLabel: '重试更新', actionLoading: false, ignoreLabel: '忽略更新' }
  }
  if (item.editStatus === 'review' || item.editStatus === 'approved') return base
  if (item.editStatus === 'rejected') {
    return { ...base, statusLabel: '已驳回', actionLabel: '继续更新' }
  }
  return { ...base, statusLabel: '更新中', actionLabel: '继续更新' }
}

export function getSeedCapabilityUpdate(skillName) {
  return clone(seedUpdates[skillName])
}

export function nextPatchVersion(version) {
  const match = String(version || '').match(/^v?(\d+)\.(\d+)\.(\d+)$/)
  if (!match) return 'v1.0.0'
  return `v${match[1]}.${match[2]}.${Number(match[3]) + 1}`
}

export function formatShanghaiMinute(value = new Date()) {
  const parts = new Intl.DateTimeFormat('zh-CN', {
    timeZone: SHANGHAI_TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  }).formatToParts(value)
  const map = Object.fromEntries(parts.map(part => [part.type, part.value]))
  return `${map.year}-${map.month}-${map.day} ${map.hour}:${map.minute}`
}

function createContextBindings(draft, update) {
  const selectedCodes = mergeContextCodes(draft.selectedContextCodes, update.currentContextCodes)
  const existing = new Map((draft.contextBindings || []).map(binding => [binding.contextId, binding]))
  const affected = new Map((update.affectedContexts || []).map(context => [context.contextId, context]))
  draft.selectedContextCodes = selectedCodes
  draft.contextBindings = selectedCodes.map(contextId => {
    const target = affected.get(contextId)
    if (target) {
      return {
        contextId,
        menuPath: target.menuPath,
        name: target.name,
        version: target.targetVersion
      }
    }
    const current = existing.get(contextId)
    return current
      ? { ...current }
      : { contextId, menuPath: '', name: contextId, version: 'unknown' }
  })
}

function capabilityTaskId(update) {
  return `capability-update-${update.recordId}`
}

function acceptPendingCapabilityUpdate(target, updatedAt) {
  const update = target.capabilityUpdate
  const queue = pendingUpdatesOf(update).map(clone)
  const pendingUpdate = queue.shift()
  if (!pendingUpdate || !target.draft) return target
  ensureCapabilityScanMessage(target.draft, { ...target, capabilityUpdate: pendingUpdate }, pendingUpdate)
  createContextBindings(target.draft, pendingUpdate)
  target.draft.aiTuned = false
  delete target.draft.evaluationCapabilityVersion
  target.draft.summaryUpdated = `能力变化已同步至 ${pendingUpdate.targetCapabilityVersion}，检测于 ${pendingUpdate.detectedAt}`
  update.activeUpdateChangeRecordIds = mergeContextCodes(update.activeUpdateChangeRecordIds, [pendingUpdate.recordId])
  update.pendingDecisionCount = queue.length
  update.currentCapabilityVersion = pendingUpdate.currentCapabilityVersion
  update.targetCapabilityVersion = pendingUpdate.targetCapabilityVersion
  update.affectedContexts = clone(pendingUpdate.affectedContexts) || []
  update.changes = [...(update.changes || []), ...(clone(pendingUpdate.changes) || [])]
  update.summary = `${update.summary}；后续变化：${pendingUpdate.summary}`
  if (queue.length) {
    update.pendingUpdate = clone(queue[0])
    update.pendingUpdates = queue
    update.status = 'processing_with_available'
  } else {
    delete update.pendingUpdate
    delete update.pendingUpdates
    update.status = 'processing'
  }
  update.task = {
    id: capabilityTaskId(pendingUpdate),
    kind: 'additional_change',
    status: 'generating',
    startedAt: updatedAt
  }
  update.activeTaskUpdate = clone(pendingUpdate)
  target.editStatus = 'draft'
  target.workflowStatus = 'draft'
  target.submittedAt = undefined
  target.reviewer = undefined
  target.reviewTime = undefined
  target.updated = updatedAt
  target.reviewNote = '后续能力变化已同步至当前更新草稿，旧评估结果已失效，需要重新提交审核。'
  return target
}

export function beginCapabilityUpdate(item, updatedAt = formatShanghaiMinute()) {
  const target = clone(item)
  const update = target?.capabilityUpdate
  if (!update || update.status === 'resolved' || update.status === 'ignored') return target
  if (update.task?.kind === 'additional_change' && update.task.status === 'failed') {
    return retryCapabilityUpdateTask(target, updatedAt)
  }
  if (update.status === 'processing_with_available') return acceptPendingCapabilityUpdate(target, updatedAt)
  if (update.status === 'preparing' || update.status === 'processing') return target

  const rollback = {
    draft: clone(target.draft),
    editVersion: target.editVersion,
    editStatus: target.editStatus,
    version: target.version,
    workflowStatus: workflowStatusOf(target),
    onlineStatus: onlineStatusOf(target)
  }
  update.hasDraftEdits = Boolean(update.hasDraftEdits)
  target.editVersion ||= nextPatchVersion(target.online !== '未发布' ? target.online : target.version)
  target.version = target.editVersion
  target.editStatus ||= 'draft'

  if (!target.draft) {
    target.draft = {
      form: {
        name: target.name,
        cnName: target.cnName,
        menu: update.baseMenu || target.category,
        scene: target.desc,
        input: '',
        output: '沿用当前线上输出，并根据能力变化补充新增字段或权限兜底。'
      },
      selectedContextCodes: [...(update.currentContextCodes || [])],
      clarifyMessages: [],
      summaryItems: [
        { label: '能力变化', text: update.summary },
        { label: '更新原则', text: '保留当前线上版本，不自动勾选新增能力，完成评估审核后再发布。' }
      ],
      summaryUpdated: `能力变化检测于 ${update.detectedAt}`,
      aiTuned: false,
      baselineContextSeeded: true,
      savedAt: updatedAt
    }
  } else {
    target.draft.aiTuned = false
    target.draft.baselineContextSeeded = true
    delete target.draft.evaluationCapabilityVersion
  }

  ensureCapabilityScanMessage(target.draft, target, update)
  createContextBindings(target.draft, update)
  target.draft.baselineContextSeeded = true

  update.status = 'preparing'
  update.task = {
    id: update.task?.id || capabilityTaskId(update),
    kind: 'initial',
    status: 'generating',
    startedAt: updatedAt,
    rollback
  }
  target.updated = updatedAt
  return target
}

export function completeCapabilityUpdate(item, draft, updatedAt = formatShanghaiMinute()) {
  const target = clone(item)
  const update = target?.capabilityUpdate
  const isAdditionalChange = update?.task?.kind === 'additional_change'
  if (!update || update.task?.status !== 'generating' || (update.status !== 'preparing' && !isAdditionalChange)) return target
  target.draft = clone(draft)
  target.editStatus = 'draft'
  target.workflowStatus = 'draft'
  target.onlineStatus = onlineStatusOf(target)
  const pendingDecisionCount = pendingUpdatesOf(update).length
  update.status = pendingDecisionCount ? 'processing_with_available' : 'processing'
  update.hasDraftEdits = true
  update.pendingDecisionCount = pendingDecisionCount
  update.activeUpdateChangeRecordIds = mergeContextCodes(update.activeUpdateChangeRecordIds, [update.recordId])
  update.task = {
    id: update.task.id || capabilityTaskId(update),
    kind: update.task.kind,
    status: 'succeeded',
    startedAt: update.task.startedAt,
    completedAt: updatedAt
  }
  delete update.activeTaskUpdate
  target.updated = updatedAt
  target.reviewNote = `能力更新首轮草稿已生成；${target.online} 继续在线服务。`
  return target
}

export function failCapabilityUpdate(item, error, updatedAt = formatShanghaiMinute()) {
  const target = clone(item)
  const update = target?.capabilityUpdate
  if (!update) return target
  if (update.task?.kind === 'additional_change' && update.task.status === 'generating') {
    update.task = {
      ...update.task,
      status: 'failed',
      completedAt: updatedAt,
      error: String(error || '后续能力变化分析失败')
    }
    update.status = update.pendingDecisionCount ? 'processing_with_available' : 'processing'
    target.updated = updatedAt
    target.reviewNote = '后续能力变化已写入当前更新草稿，但分析生成失败；请在编辑页内重试。'
    return target
  }
  if (update.status !== 'preparing') return target
  const rollback = update.task?.rollback || {}
  if (rollback.draft) target.draft = clone(rollback.draft)
  else delete target.draft
  if (rollback.editVersion) target.editVersion = rollback.editVersion
  else delete target.editVersion
  if (rollback.editStatus) target.editStatus = rollback.editStatus
  else delete target.editStatus
  target.version = rollback.version || target.online || target.version
  target.workflowStatus = rollback.workflowStatus || workflowStatusOf(target)
  target.onlineStatus = rollback.onlineStatus || onlineStatusOf(target)
  update.status = 'failed'
  update.hasDraftEdits = false
  update.task = {
    id: update.task?.id || capabilityTaskId(update),
    status: 'failed',
    startedAt: update.task?.startedAt,
    completedAt: updatedAt,
    error: String(error || '更新生成失败'),
    rollback
  }
  target.updated = updatedAt
  target.reviewNote = `能力更新生成失败：${update.task.error}；可重新发起更新。`
  return target
}

export function retryCapabilityUpdateTask(item, updatedAt = formatShanghaiMinute()) {
  const target = clone(item)
  const update = target?.capabilityUpdate
  if (
    !update
    || update.task?.kind !== 'additional_change'
    || update.task.status !== 'failed'
    || !['processing', 'processing_with_available'].includes(update.status)
  ) return target
  update.task = {
    id: update.task.id,
    kind: update.task.kind,
    status: 'generating',
    startedAt: updatedAt
  }
  target.updated = updatedAt
  target.reviewNote = '正在当前更新草稿内重试后续能力变化扫描。'
  return target
}

export function ignoreCapabilityUpdate(item, resolution = {}, updatedAt = formatShanghaiMinute()) {
  const target = clone(item)
  const update = target?.capabilityUpdate
  if (!update || !['available', 'failed', 'processing_with_available'].includes(update.status)) return target
  const decisionUpdate = decisionUpdateOf(update)
  if (isHighRiskUpdate(decisionUpdate) && !String(resolution.reason || '').trim()) {
    throw new Error('破坏性或权限变化必须填写处理原因')
  }
  const decision = {
    action: 'ignored',
    operator: resolution.operator || 'admin',
    handledAt: updatedAt,
    reason: String(resolution.reason || '').trim()
  }
  if (update.status === 'processing_with_available') {
    const queue = pendingUpdatesOf(update).map(clone)
    const ignoredUpdate = queue.shift() || clone(decisionUpdate)
    update.history = [...(update.history || []), { ...ignoredUpdate, status: 'ignored', resolution: decision }]
    update.pendingDecisionCount = queue.length
    if (queue.length) {
      update.pendingUpdate = clone(queue[0])
      update.pendingUpdates = queue
      update.status = 'processing_with_available'
    } else {
      delete update.pendingUpdate
      delete update.pendingUpdates
      update.status = 'processing'
    }
  } else {
    update.status = 'ignored'
    update.resolution = decision
  }
  target.updated = updatedAt
  target.reviewNote = update.status === 'processing'
    ? '后续能力变化已忽略，当前更新草稿继续处理。'
    : '当前能力变化记录已忽略，后续新变化将重新提醒。'
  return target
}

export function hydrateCapabilityUpdate(item, seededUpdate) {
  const storedUpdate = item.capabilityUpdate
  const isNewRecord = Boolean(seededUpdate && storedUpdate && seededUpdate.recordId !== storedUpdate.recordId)
  const restoresAvailableState = Boolean(
    seededUpdate?.flowRevision
      && storedUpdate
      && seededUpdate.recordId === storedUpdate.recordId
      && (storedUpdate.status === 'processing' || storedUpdate.status === 'preparing')
      && storedUpdate.flowRevision !== seededUpdate.flowRevision
  )
  const storedHistory = storedUpdate?.history || []
  const storedSnapshot = storedUpdate ? clone(storedUpdate) : undefined
  if (storedSnapshot) delete storedSnapshot.history
  const capabilityUpdate = seededUpdate
    ? isNewRecord
      ? storedUpdate.status === 'processing' || storedUpdate.status === 'processing_with_available'
        ? {
            ...queuePendingCapabilityUpdate(storedUpdate, seededUpdate),
            history: storedHistory
          }
        : {
            ...seededUpdate,
            status: 'available',
            history: [...storedHistory, storedSnapshot]
          }
      : restoresAvailableState
        ? {
            ...seededUpdate,
            status: 'available',
            hasDraftEdits: Boolean(storedUpdate.hasDraftEdits),
            history: storedHistory
          }
      : {
          ...seededUpdate,
          ...storedUpdate,
          currentContextCodes: storedUpdate?.currentContextCodes?.length
            ? storedUpdate.currentContextCodes
            : seededUpdate.currentContextCodes
        }
    : storedUpdate
  let draft = item.draft && typeof item.draft === 'object' ? clone(item.draft) : undefined
  let status = item.status
  let statusText = item.statusText
  let editStatus = item.editStatus
  let workflowStatus = item.workflowStatus || editStatus || status
  const onlineStatus = item.onlineStatus || onlineStatusOf(item)
  if ((capabilityUpdate?.status === 'processing' || capabilityUpdate?.status === 'preparing') && item.online !== '未发布' && !editStatus) {
    editStatus = ['review', 'approved', 'rejected'].includes(status) ? status : 'draft'
    workflowStatus = editStatus
    if (['review', 'approved', 'rejected'].includes(status)) {
      status = onlineStatus === 'disabled' ? 'disabled' : 'published'
      statusText = onlineStatus === 'disabled' ? '已禁用' : '已发布'
    }
  }
  if ((capabilityUpdate?.status === 'processing' || capabilityUpdate?.status === 'preparing') && draft && !draft.baselineContextSeeded) {
    draft.selectedContextCodes = draft.selectedContextCodes?.length
      ? draft.selectedContextCodes
      : [...capabilityUpdate.currentContextCodes]
    draft.baselineContextSeeded = true
  }
  if ((capabilityUpdate?.status === 'processing' || capabilityUpdate?.status === 'preparing') && draft) {
    ensureCapabilityScanMessage(draft, item, capabilityUpdate)
  }
  return {
    capabilityUpdate,
    draft,
    status,
    statusText,
    editStatus,
    editVersion: item.editVersion,
    workflowStatus,
    onlineStatus
  }
}

export function mergeCapabilityDraft(current, nextItem, draft, updatedAt = formatShanghaiMinute()) {
  return {
    ...current,
    cnName: nextItem.cnName,
    desc: nextItem.desc,
    category: nextItem.category,
    tags: nextItem.tags,
    updated: updatedAt,
    draft,
    capabilityUpdate: current.capabilityUpdate
      ? { ...current.capabilityUpdate, hasDraftEdits: true }
      : current.capabilityUpdate,
    editStatus: 'draft',
    workflowStatus: 'draft',
    onlineStatus: onlineStatusOf(current),
    version: current.editVersion || current.version,
    editVersion: current.editVersion || current.version,
    reviewNote: `能力更新草稿已保存；${current.online} 继续在线服务。`
  }
}

export function mergeCapabilitySubmission(current, nextItem, updatedAt = formatShanghaiMinute()) {
  return {
    ...current,
    cnName: nextItem.cnName,
    desc: nextItem.desc,
    category: nextItem.category,
    tags: nextItem.tags,
    updated: updatedAt,
    submittedAt: updatedAt,
    score: nextItem.score,
    draft: nextItem.draft,
    capabilityUpdate: current.capabilityUpdate
      ? { ...current.capabilityUpdate, hasDraftEdits: true }
      : current.capabilityUpdate,
    editStatus: 'review',
    workflowStatus: 'review',
    onlineStatus: onlineStatusOf(current),
    version: current.editVersion || current.version,
    editVersion: current.editVersion || current.version,
    reviewNote: `能力更新提交审核：综合评分 ${nextItem.score}；${current.online} 继续在线服务。`
  }
}

export function transitionCapabilityEdit(current, status, reviewer, updatedAt = formatShanghaiMinute()) {
  const target = clone(current)
  if (!target?.capabilityUpdate || target.capabilityUpdate.status !== 'processing') return target

  if (status === 'draft' && target.workflowStatus === 'review') {
    target.editStatus = 'draft'
    target.workflowStatus = 'draft'
    target.submittedAt = undefined
    target.reviewer = undefined
    target.reviewTime = undefined
    target.updated = updatedAt
    target.reviewNote = '能力更新已撤回：继续保留当前更新草稿，线上版本不变。'
    return target
  }

  if (status === 'approved' || status === 'rejected') {
    target.editStatus = status
    target.workflowStatus = status
    target.reviewer = reviewer
    target.reviewTime = updatedAt
    target.updated = updatedAt
    target.reviewNote = status === 'approved'
      ? '能力更新审批通过：可发布编辑版本，当前线上版本继续服务。'
      : '能力更新已驳回：请补充业务边界、测试用例或审批材料后重新提交。'
    return target
  }

  if (status === 'published' && target.editStatus === 'approved') {
    const remainsDisabled = onlineStatusOf(target) === 'disabled'
    target.online = target.editVersion || target.version
    target.version = target.online
    target.onlineStatus = remainsDisabled ? 'disabled' : 'published'
    target.workflowStatus = remainsDisabled ? 'disabled' : 'published'
    target.status = remainsDisabled ? 'disabled' : 'published'
    target.statusText = remainsDisabled ? '已禁用' : '已发布'
    target.editVersion = undefined
    target.editStatus = undefined
    target.capabilityUpdate.status = 'resolved'
    target.updated = updatedAt
    target.reviewNote = '能力更新版本已发布：新版本开始在线服务。'
  }
  return target
}

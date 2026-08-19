const SHANGHAI_TIME_ZONE = 'Asia/Shanghai'

const seedUpdates = {
  'product-knowledge': {
    recordId: 'capability-change-product-knowledge-20260814',
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

function clone(value) {
  return value ? JSON.parse(JSON.stringify(value)) : undefined
}

function mergeContextCodes(selectedCodes = [], requiredCodes = []) {
  return Array.from(new Set([...selectedCodes, ...requiredCodes]))
}

function capabilityScanMessageId(update) {
  return `capability-scan-${update.recordId}`
}

export function buildCapabilityScanQuery(item) {
  const update = item?.capabilityUpdate
  const affected = update?.affectedContexts?.[0]
  const menuPath = affected?.menuPath || update?.menuPath || update?.contextId || '当前能力'
  const currentVersion = affected?.currentVersion || update?.currentCapabilityVersion || '当前版本'
  const targetVersion = affected?.targetVersion || update?.targetCapabilityVersion || '目标版本'
  const summary = update?.summary || '能力上下文发生变化'
  return [
    `检测到「${menuPath}」能力上下文由 ${currentVersion} 更新为 ${targetVersion}，主要变化为：${summary}`,
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
  return update?.status === 'available'
}

export function capabilityUpdatePresentation(item) {
  const update = item?.capabilityUpdate
  if (!update || update.status === 'ignored' || update.status === 'resolved') {
    return { visible: false, statusLabel: '', actionLabel: '', actionLoading: false, ignoreLabel: '' }
  }
  const base = { visible: true, statusLabel: '', actionLabel: '', actionLoading: false, ignoreLabel: '' }
  if (update.status === 'available') {
    const highRisk = (update.changes || []).some(change => change.kind === 'breaking' || change.kind === 'permission')
    return { ...base, statusLabel: '有更新', actionLabel: '更新', ignoreLabel: highRisk ? '暂不处理' : '忽略本次' }
  }
  if (update.status === 'preparing') {
    return { ...base, statusLabel: '正在准备更新', actionLabel: '正在准备', actionLoading: true }
  }
  if (item.editStatus === 'review' || item.editStatus === 'approved') return base
  if (item.editStatus === 'rejected') {
    return { ...base, statusLabel: '更新版本已驳回', actionLabel: '继续更新' }
  }
  return { ...base, statusLabel: '更新编辑中', actionLabel: '继续更新' }
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

export function beginCapabilityUpdate(item, updatedAt = formatShanghaiMinute()) {
  const target = clone(item)
  const update = target?.capabilityUpdate
  if (!update || update.status === 'resolved' || update.status === 'ignored') return target
  if (update.status === 'preparing' || update.status === 'processing') return target

  const rollback = {
    draft: clone(target.draft),
    editVersion: target.editVersion,
    editStatus: target.editStatus,
    version: target.version
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
    id: capabilityTaskId(update),
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
  if (!update || update.status !== 'preparing' || update.task?.status !== 'generating') return target
  target.draft = clone(draft)
  target.editStatus = 'draft'
  update.status = 'processing'
  update.hasDraftEdits = true
  update.task = {
    id: update.task.id || capabilityTaskId(update),
    status: 'succeeded',
    startedAt: update.task.startedAt,
    completedAt: updatedAt
  }
  target.updated = updatedAt
  target.reviewNote = `能力更新首轮草稿已生成；${target.online} 继续在线服务。`
  return target
}

export function failCapabilityUpdate(item, error, updatedAt = formatShanghaiMinute()) {
  const target = clone(item)
  const update = target?.capabilityUpdate
  if (!update || update.status !== 'preparing') return target
  const rollback = update.task?.rollback || {}
  if (rollback.draft) target.draft = clone(rollback.draft)
  else delete target.draft
  if (rollback.editVersion) target.editVersion = rollback.editVersion
  else delete target.editVersion
  if (rollback.editStatus) target.editStatus = rollback.editStatus
  else delete target.editStatus
  target.version = rollback.version || target.online || target.version
  update.status = 'available'
  update.hasDraftEdits = false
  update.task = {
    id: update.task?.id || capabilityTaskId(update),
    status: 'failed',
    startedAt: update.task?.startedAt,
    completedAt: updatedAt,
    error: String(error || '更新生成失败')
  }
  target.updated = updatedAt
  target.reviewNote = `能力更新生成失败：${update.task.error}；可重新发起更新。`
  return target
}

export function ignoreCapabilityUpdate(item, resolution = {}, updatedAt = formatShanghaiMinute()) {
  const target = clone(item)
  const update = target?.capabilityUpdate
  if (!update || update.status !== 'available') return target
  const requiresDeferral = (update.changes || []).some(change => change.kind === 'breaking' || change.kind === 'permission')
  update.status = 'ignored'
  update.resolution = {
    action: requiresDeferral ? 'deferred' : 'ignored',
    operator: resolution.operator || 'admin',
    handledAt: updatedAt,
    reason: resolution.reason || ''
  }
  target.updated = updatedAt
  target.reviewNote = requiresDeferral
    ? '当前高风险能力变化已暂不处理，线上版本继续服务并保留风险记录。'
    : '当前能力变化记录已忽略，后续新变化将重新提醒。'
  return target
}

export function hydrateCapabilityUpdate(item, seededUpdate) {
  const storedUpdate = item.capabilityUpdate
  const isNewRecord = Boolean(seededUpdate && storedUpdate && seededUpdate.recordId !== storedUpdate.recordId)
  const storedHistory = storedUpdate?.history || []
  const storedSnapshot = storedUpdate ? clone(storedUpdate) : undefined
  if (storedSnapshot) delete storedSnapshot.history
  const capabilityUpdate = seededUpdate
    ? isNewRecord
      ? {
          ...seededUpdate,
          status: storedUpdate.status === 'processing' || storedUpdate.status === 'preparing' ? storedUpdate.status : 'available',
          history: [...storedHistory, storedSnapshot]
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
  if ((capabilityUpdate?.status === 'processing' || capabilityUpdate?.status === 'preparing') && item.online !== '未发布' && !editStatus) {
    editStatus = ['review', 'approved', 'rejected'].includes(status) ? status : 'draft'
    if (['review', 'approved', 'rejected'].includes(status)) {
      status = 'published'
      statusText = '已发布'
    }
  }
  if (isNewRecord && (capabilityUpdate?.status === 'processing' || capabilityUpdate?.status === 'preparing')) {
    editStatus = 'draft'
    if (draft) {
      draft.aiTuned = false
      delete draft.evaluationCapabilityVersion
      const summaryItems = Array.isArray(draft.summaryItems) ? draft.summaryItems.map(item => ({ ...item })) : []
      const changeSummary = summaryItems.find(item => item.label === '能力变化')
      if (changeSummary) {
        changeSummary.text = changeSummary.text && changeSummary.text !== capabilityUpdate.summary
          ? `${changeSummary.text}；后续变化：${capabilityUpdate.summary}`
          : capabilityUpdate.summary
      } else {
        summaryItems.unshift({ label: '能力变化', text: capabilityUpdate.summary })
      }
      draft.summaryItems = summaryItems
      draft.summaryUpdated = `能力变化已合并至 ${capabilityUpdate.targetCapabilityVersion}，检测于 ${capabilityUpdate.detectedAt}`
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
  return { capabilityUpdate, draft, status, statusText, editStatus }
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
    version: current.editVersion || current.version,
    editVersion: current.editVersion || current.version,
    reviewNote: `能力更新提交审核：综合评分 ${nextItem.score}；${current.online} 继续在线服务。`
  }
}

export function transitionCapabilityEdit(current, status, reviewer, updatedAt = formatShanghaiMinute()) {
  const target = clone(current)
  if (!target?.capabilityUpdate || target.capabilityUpdate.status !== 'processing') return target

  if (status === 'approved' || status === 'rejected') {
    target.editStatus = status
    target.reviewer = reviewer
    target.reviewTime = updatedAt
    target.updated = updatedAt
    target.reviewNote = status === 'approved'
      ? '能力更新审批通过：可发布编辑版本，当前线上版本继续服务。'
      : '能力更新已驳回：请补充业务边界、测试用例或审批材料后重新提交。'
    return target
  }

  if (status === 'published' && target.editStatus === 'approved') {
    target.online = target.editVersion || target.version
    target.version = target.online
    target.status = 'published'
    target.statusText = '已发布'
    target.editVersion = undefined
    target.editStatus = undefined
    target.capabilityUpdate.status = 'resolved'
    target.updated = updatedAt
    target.reviewNote = '能力更新版本已发布：新版本开始在线服务。'
  }
  return target
}

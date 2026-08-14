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
    changes: [
      { id: 'voucher-audience-permission', kind: 'permission', objectType: '权限点', name: 'voucher.audience.read', before: 'voucher.read', after: 'voucher.audience.read', impact: '缺少新权限时无法读取适用人群，更新前应保留原线上版本。' }
    ]
  }
}

function clone(value) {
  return value ? JSON.parse(JSON.stringify(value)) : undefined
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

export function beginCapabilityUpdate(item, updatedAt = formatShanghaiMinute()) {
  const target = clone(item)
  const update = target?.capabilityUpdate
  if (!update || update.status === 'resolved') return target

  const isNewUpdate = update.status !== 'processing'
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
  } else if (isNewUpdate) {
    target.draft.aiTuned = false
    target.draft.baselineContextSeeded = true
    delete target.draft.evaluationCapabilityVersion
  }

  update.status = 'processing'
  target.updated = updatedAt
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
          status: storedUpdate.status === 'processing' ? 'processing' : 'available',
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
  if (capabilityUpdate?.status === 'processing' && item.online !== '未发布' && !editStatus) {
    editStatus = ['review', 'approved', 'rejected'].includes(status) ? status : 'draft'
    if (['review', 'approved', 'rejected'].includes(status)) {
      status = 'published'
      statusText = '已发布'
    }
  }
  if (isNewRecord && capabilityUpdate?.status === 'processing') {
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
  if (capabilityUpdate?.status === 'processing' && draft && !draft.baselineContextSeeded) {
    draft.selectedContextCodes = draft.selectedContextCodes?.length
      ? draft.selectedContextCodes
      : [...capabilityUpdate.currentContextCodes]
    draft.baselineContextSeeded = true
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

export type RequestStatus = 'pending' | 'approved' | 'running' | 'succeeded' | 'failed' | 'rejected' | 'expired'

export interface TaskRequest {
  id: string
  revision: number
  label: string
  scope: string
  impact: string
  kind: 'read' | 'export' | 'write' | 'unknown'
  batchable: boolean
  approvalGroup: string
  status: RequestStatus
  steps?: string[]
  detail?: string
  command?: string
}

export interface AiTaskBlock {
  id: string
  conversationId: string
  title: string
  mode: 'preview'
  createdAt: number
  expiresAt: number
  requests: TaskRequest[]
  notice?: string
}

export interface TaskDecision {
  taskId: string
  conversationId: string
  selections: Array<{ requestId: string; revision: number }>
  decision: 'approve' | 'reject'
  scope?: 'skill-execution'
}

const terminalStatuses = new Set<RequestStatus>(['succeeded', 'failed', 'rejected', 'expired'])
const expirableStatuses = new Set<RequestStatus>(['pending', 'approved', 'running'])

export function applyTaskDecision(task: AiTaskBlock, decision: TaskDecision, currentConversationId: string, now: number): { task: AiTaskBlock; acceptedIds: string[]; error?: string } {
  const reject = (error: string) => ({ task, acceptedIds: [], error })
  if (!task.id || !currentConversationId || task.mode !== 'preview'
    || decision.taskId !== task.id || decision.conversationId !== task.conversationId
    || task.conversationId !== currentConversationId) {
    return reject('任务或会话已变化，请重新确认当前任务。')
  }
  if (!Number.isFinite(now) || !Number.isFinite(task.expiresAt)) {
    return reject('无法确认任务有效期，请重新发起任务。')
  }
  if (now >= task.expiresAt) {
    return { task: expireTask(task), acceptedIds: [], error: '任务已过期，请重新发起任务。' }
  }
  if (decision.decision !== 'approve' && decision.decision !== 'reject') {
    return reject('无法识别本次确认操作。')
  }
  if (decision.scope !== undefined && decision.scope !== 'skill-execution') {
    return reject('无法识别本次授权范围，请重新核对任务。')
  }
  if (!Array.isArray(decision.selections) || !decision.selections.length) {
    return reject(decision.scope === 'skill-execution'
      ? '本次 Skill 执行没有待授权步骤，请重新核对任务。'
      : '请先选择需要处理的步骤。')
  }
  if (!Array.isArray(task.requests) || task.requests.some(request => !request.id.trim() || !validRevision(request.revision))
    || new Set(task.requests.map(request => request.id)).size !== task.requests.length) {
    return reject('任务步骤标识无效，请重新发起任务。')
  }

  const selected: TaskRequest[] = []
  const selectedIds = new Set<string>()
  for (const selection of decision.selections) {
    if (selectedIds.has(selection.requestId)) return reject('同一步骤不能重复选择。')
    const request = task.requests.find(item => item.id === selection.requestId)
    if (!request || !validRevision(selection.revision) || request.revision !== selection.revision) {
      return reject('所选步骤或范围已变化，请重新核对后确认。')
    }
    if (request.status !== 'pending') return reject('所选步骤已处理，请查看当前状态。')
    selectedIds.add(request.id)
    selected.push(request)
  }

  if (decision.scope === 'skill-execution') {
    const pending = task.requests.filter(request => request.status === 'pending')
    if (selected.length !== pending.length || pending.some(request => !selectedIds.has(request.id))) {
      return reject('本次 Skill 执行的步骤清单已变化，请核对全部步骤后重新确认。')
    }
  } else if (decision.decision === 'approve' && selected.length > 1) {
    const group = selected[0].approvalGroup
    if (!group.trim() || selected.some(request => request.kind !== 'read'
      || request.batchable !== true || request.approvalGroup !== group)) {
      return reject('仅同一明确范围内可批量的只读步骤支持一起授权；其他步骤请单独确认。')
    }
  }

  const status: RequestStatus = decision.decision === 'approve' ? 'approved' : 'rejected'
  return {
    task: { ...task, requests: task.requests.map(request => selectedIds.has(request.id) ? { ...request, status } : request) },
    // For rejection these IDs indicate handled requests, never permission to execute them.
    acceptedIds: selected.map(request => request.id),
  }
}

export function updateTaskRequest(task: AiTaskBlock, requestId: string, revision: number, status: RequestStatus, detail?: string): AiTaskBlock {
  const matches = task.requests.filter(request => request.id === requestId)
  if (matches.length !== 1 || !validRevision(revision)) return task
  const current = matches[0]
  if (current.revision !== revision || terminalStatuses.has(current.status)) return task

  const transitions: Partial<Record<RequestStatus, RequestStatus[]>> = {
    pending: ['expired'],
    approved: ['running', 'failed', 'expired'],
    running: ['succeeded', 'failed', 'expired'],
  }
  const updateActiveDetail = status === current.status && (status === 'approved' || status === 'running')
  if (!updateActiveDetail && !transitions[current.status]?.includes(status)) return task
  if (status === current.status && (detail === undefined || detail === current.detail)) return task
  const updated = { ...current, status, ...(detail === undefined ? {} : { detail }) }
  return { ...task, requests: task.requests.map(request => request === current ? updated : request) }
}

export function expireTask(task: AiTaskBlock): AiTaskBlock {
  if (!task.requests.some(request => expirableStatuses.has(request.status))) return task
  return {
    ...task,
    requests: task.requests.map(request => expirableStatuses.has(request.status) ? { ...request, status: 'expired' } : request),
  }
}

export function taskProgress(task: AiTaskBlock): { label: string; done: number; total: number; pending: number; active: number; failed: number; terminal: boolean } {
  const count = (status: RequestStatus) => task.requests.filter(request => request.status === status).length
  const total = task.requests.length
  const done = count('succeeded')
  const pending = count('pending')
  const running = count('running')
  const active = count('approved') + running
  const failed = count('failed')
  const terminal = task.requests.every(request => terminalStatuses.has(request.status))
  let label: string
  if (!total) label = '暂无待执行步骤'
  else if (running) label = '进行中'
  else if (active) label = '等待执行'
  else if (pending) label = '等待授权'
  else if (done === total) label = '已完成'
  else if (done) label = '部分完成'
  else if (failed) label = '执行失败'
  else if (count('expired')) label = '已过期'
  else label = '已拒绝'
  return { label, done, total, pending, active, failed, terminal }
}

function validRevision(revision: number) {
  return Number.isInteger(revision) && revision >= 0
}

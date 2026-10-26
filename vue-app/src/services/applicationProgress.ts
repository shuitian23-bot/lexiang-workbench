/** Read-only presentation of existing requests. Does not advance or execute approvals. */
export interface ProgressRequest {
  id: string
  typeKey?: string
  type?: string
  source?: string
  applicant?: string
  applicantItcode?: string
  applicantPersonType?: string
  target?: string
  targetItcode?: string
  personType?: string
  relatedAccount?: string
  applicantManager?: string
  targetManager?: string
  businessApprover?: string
  businessOwners?: string[]
  businessApprovalTasks?: { approver: string; approverName?: string; status: string }[]
  systemApprover?: string
  approverItcode?: string
  nodeType?: string
  node?: string
  statusKey?: string
  status?: string
  approvalRevision?: number
  approvalLogs?: { node?: string; action?: string; operator?: string; opinion?: string; time?: string }[]
  logs?: { node?: string; detail?: string; time?: string }[]
}
export interface ProgressStep {
  title: string
  detail: string
  state: 'current' | 'done' | 'rejected' | 'waiting'
}

const principal = (value = '') => value.split('（')[0].trim().toLowerCase()
const same = (a?: string, b?: string) => !!principal(a) && principal(a) === principal(b)

export function progressNodeTypes(row: ProgressRequest): string[] {
  if (['enable', 'disable', 'workspace-access'].includes(row.typeKey || '')) return ['submit', 'system-admin']
  // The legacy login registration form has its own existing four-stage workflow.
  if (!row.typeKey && row.type === '创建账号') return ['relation', 'applicant-manager', 'target-manager', 'system-admin']
  const nodes: string[] = []
  const externalTarget = row.personType === 'external' || row.typeKey === 'create'
  if (row.applicantPersonType === 'external') nodes.push('relation')
  else {
    if (externalTarget && !same(row.relatedAccount, row.applicantItcode || row.applicant)) nodes.push('relation')
    nodes.push('applicant-manager')
    if (!externalTarget && !same(row.applicantItcode, row.targetItcode || row.target)) nodes.push('target-manager')
  }
  return [...nodes, 'business', 'done']
}

export function applicationProgress(row: ProgressRequest, route = progressNodeTypes(row)) {
  const kind = row.typeKey || (row.type === '创建账号' ? 'create' : 'change')
  const name = ({ enable: '账号启用', disable: '账号禁用', create: '账号创建', change: '权限', 'workspace-access': '权限' } as Record<string, string>)[kind] || row.type || '权限'
  const rejected = row.statusKey === 'rejected' || row.status === '已驳回'
  const done = !rejected && (!row.nodeType || row.nodeType === 'done') && (row.statusKey === 'done' || ['已完成', '执行完成'].includes(row.status || ''))
  const state = rejected ? 'rejected' : done ? 'done' : 'pending'
  const names: Record<string, string> = { submit: '申请人提交', relation: '关联人确认', 'applicant-manager': '申请人直线经理', 'target-manager': '被申请人直线经理', business: '业务负责人', 'system-admin': '系统管理员审批', done: '系统自动生效' }
  const owners: Record<string, string> = {
    submit: row.applicantItcode || row.applicant || '', relation: row.relatedAccount || '',
    'applicant-manager': row.applicantManager || '', 'target-manager': row.targetManager || '',
    business: row.businessApprovalTasks?.map(task => task.approverName || task.approver).join('、') || row.businessOwners?.join('、') || row.businessApprover || '',
    'system-admin': row.systemApprover || '系统管理员', done: done ? '已执行完成' : '全部审批通过后执行'
  }
  let current = route.indexOf(row.nodeType || '')
  if (rejected && current < 0) {
    const log = [...(row.approvalLogs || [])].reverse().find(item => item.action === 'reject')
    // Some legacy rows replace the rejected node with "rework"; recover only from evidence.
    current = route.findIndex(key => key !== 'submit' && key !== 'done' && (
      (log?.operator && owners[key]?.split('、').some(owner => same(owner, log.operator)))
      || (log?.node && log.node.includes(names[key] || key))
      || row.logs?.some(item => item.detail?.includes('驳回') && item.node?.includes(names[key] || key))
    ))
    if (current < 0 && route.filter(key => key !== 'submit' && key !== 'done').length === 1) current = route.findIndex(key => key !== 'submit' && key !== 'done')
  }
  const steps: ProgressStep[] = route.map((key, index) => ({
    title: names[key] || row.node || key,
    detail: owners[key] || (key === row.nodeType ? row.approverItcode : '') || '待确认',
    state: done || key === 'submit' ? 'done' : index === current ? (rejected ? 'rejected' : 'current') : current >= 0 && index < current ? 'done' : 'waiting'
  }))
  const completedTitle = ({ enable: '账号已启用', disable: '账号已禁用', create: '账号已创建' } as Record<string, string>)[kind] || '权限申请已完成'
  const pendingDescription = ({ enable: '审批通过并执行后启用账号，原有权限保持不变。', disable: '审批通过并执行后禁用账号，原有权限保持不变。', create: '审批全部通过后，系统会执行账号创建。' } as Record<string, string>)[kind] || '审批全部通过后，系统会一次性开通所申请的权限。'
  return {
    title: done ? completedTitle : `${name}申请已${rejected ? '驳回' : '进入审批'}`,
    status: rejected ? '已驳回' : done ? '已完成' : '申请已提交',
    tone: (rejected ? 'danger' : 'success') as 'danger' | 'success',
    description: rejected ? '请查看处理记录中的驳回原因；本次申请不会执行。' : done ? (kind === 'enable' ? '请返回登录页重新登录，使用原有权限访问工作台。' : '申请已审批通过并执行完成。') : pendingDescription,
    steps, state
  }
}

// Separate read-only POC lookup tokens; never reuse a leader's approval grant.
export const APPLICANT_PROGRESS_KEY = 'leaibot-applicant-progress-links'
export const PROGRESS_APPROVAL_ROWS_KEY = 'leaibot-approval-mail-mock-rows'
export const PROGRESS_ACCOUNT_ROWS_KEY = 'leaibot-account-request-status-rows'
type ProgressStorage = Pick<Storage, 'getItem' | 'setItem'>
interface ProgressLink { id: string; token: string; row: ProgressRequest; nodes: string[] }
function readList<T>(storage: Pick<Storage, 'getItem'>, key: string): T[] {
  const rows: unknown = JSON.parse(storage.getItem(key) || '[]')
  if (!Array.isArray(rows)) throw new Error('申请记录格式异常，请重新进入申请进度。')
  return rows
}
export function applicantProgressQuery(storage: ProgressStorage, row: ProgressRequest, nodes = progressNodeTypes(row)): string {
  const links = readList<ProgressLink>(storage, APPLICANT_PROGRESS_KEY)
  const old = links.find(item => item.id === row.id)
  const link = { id: row.id, token: old?.token || crypto.randomUUID(), row, nodes }
  storage.setItem(APPLICANT_PROGRESS_KEY, JSON.stringify([link, ...links.filter(item => item.id !== row.id)]))
  return new URLSearchParams({ ticket: row.id, token: link.token, source: 'permissions' }).toString()
}
export function readApplicantProgress(storage: Pick<Storage, 'getItem'>, ticket: string, token: string) {
  if (!ticket || !token) return null
  const link = readList<ProgressLink>(storage, APPLICANT_PROGRESS_KEY).find(item => item.id === ticket && item.token === token)
  if (!link) return null
  const latest = readList<ProgressRequest>(storage, PROGRESS_APPROVAL_ROWS_KEY).find(row => row.id === ticket)
  const account = readList<ProgressRequest>(storage, PROGRESS_ACCOUNT_ROWS_KEY).find(row => row.id === ticket)
  // Enable requests are synchronized to both stores; prefer the explicitly newer revision.
  const row = latest && (latest.approvalRevision || 0) >= (link.row.approvalRevision || 0) ? latest : link.row
  return { row: account && row.typeKey === 'enable' && account.statusKey !== 'pending' ? { ...row, ...account } : row, nodes: link.nodes }
}

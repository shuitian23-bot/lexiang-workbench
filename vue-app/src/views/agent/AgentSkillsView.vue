<template>
  <div class="skill-hub-page" data-page-flow="skill-hub" role="region" aria-label="Skill Hub">
    <ContentPageHeader title="Skill Hub" :description="pageDesc">
      <template #actions>
        <div class="agent-skill-page-actions">
          <button class="btn btn-primary" type="button" @click="openSkillCreate">创建 Skill</button>
          <button class="btn btn-secondary" type="button" @click="goPortalHome">返回工作台</button>
        </div>
      </template>
    </ContentPageHeader>

    <div class="skill-hub-summary" aria-label="Skill Hub 重点指标">
      <button
        v-for="item in summaryItems"
        :key="item.key"
        type="button"
        class="skill-hub-stat is-filterable"
        :class="[item.tone, { 'is-active': summaryFilter === item.filter }]"
        :aria-pressed="summaryFilter === item.filter"
        @click="setSummaryFilter(item.filter)"
      >
        <div class="skill-hub-stat-head">
          <span>{{ item.label }}</span>
          <i>{{ item.code }}</i>
        </div>
        <strong>{{ item.value }}</strong>
        <em>{{ item.desc }}</em>
      </button>
    </div>

    <div class="skill-hub-toolbar">
      <input v-model="keyword" placeholder="搜索技能名称、中文名或描述">
      <select v-model="statusFilter">
        <option value="all">状态</option>
        <option v-for="status in statusOptions" :key="status" :value="status">{{ skillHubStatusLabel(status) }}</option>
      </select>
      <select v-model="categoryFilter">
        <option value="all">分类</option>
        <option v-for="category in categories" :key="category" :value="category">{{ category }}</option>
      </select>
      <label class="skill-hub-update-toggle">
        <span>只看有更新</span>
        <input v-model="onlyCapabilityUpdates" type="checkbox">
        <i aria-hidden="true"></i>
      </label>
      <button class="btn btn-primary" type="button">搜索</button>
    </div>

    <div class="skill-hub-table-card">
      <table class="skill-hub-table">
        <thead>
          <tr>
            <th>名称</th>
            <th>中文名</th>
            <th>绑定平台</th>
            <th>描述</th>
            <th>版本</th>
            <th>上线版本</th>
            <th>状态</th>
            <th>更新时间</th>
            <th>操作</th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="item in filteredItems"
            :key="item.name"
            class="skill-hub-row"
            :data-status="item.workflowStatus"
            :data-category="item.category"
          >
            <td>
              <div class="skill-hub-name">
                <span class="skill-hub-doc-icon">▤</span>
                <strong>{{ item.name }}</strong>
              </div>
            </td>
            <td><div class="skill-hub-cn">{{ item.cnName || '-' }}</div></td>
            <td>{{ item.platform }}</td>
            <td>
              <div class="skill-hub-desc">{{ item.desc }}</div>
              <div v-if="shouldShowCapabilityChangeSummary(item.capabilityUpdate)" class="skill-hub-change-summary">
                <b>{{ decisionCapabilityUpdate(item)?.summary }}</b>
                <span>{{ decisionCapabilityUpdate(item)?.detectedAt }} 检测</span>
              </div>
            </td>
            <td>
              <span class="skill-hub-version">{{ item.editVersion || item.version }}</span>
              <small v-if="item.editVersion" class="skill-hub-edit-version">编辑版本</small>
            </td>
            <td><span class="skill-hub-online" :class="{ empty: item.onlineStatus === 'unpublished' }">{{ item.online }}</span></td>
            <td>
              <div class="skill-hub-status-stack">
                <span class="skill-hub-status" :class="`status-${rowPresentation(item).mainStatus}`">{{ rowPresentation(item).mainStatusLabel }}</span>
                <span v-if="rowPresentation(item).updateStatusLabel" class="skill-hub-update-status" :class="`is-${rowPresentation(item).updateStatus}`">
                  {{ rowPresentation(item).updateStatusLabel }}
                </span>
              </div>
            </td>
            <td>{{ item.updated }}</td>
            <td>
              <div class="skill-hub-actions">
                <button
                  v-for="action in allowedActionsFor(item)"
                  :key="action.code"
                  class="skill-hub-action"
                  :class="actionTone(action.code)"
                  type="button"
                  :disabled="!action.enabled"
                  @click="handleAction(item, action.code)"
                >
                  {{ actionLabel(action.code) }}
                </button>
              </div>
            </td>
          </tr>
          <tr v-if="!filteredItems.length">
            <td colspan="9" class="skill-hub-detail-empty">当前筛选下暂无 Skill</td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>

  <Teleport to="body">
    <div
      v-if="confirmState"
      class="skill-hub-confirm-modal open"
      @click.self="closeConfirm"
    >
      <div class="skill-hub-confirm-panel" role="dialog" :aria-label="confirmMeta.title">
        <div class="skill-hub-confirm-head">
          <h3>{{ confirmMeta.title }}</h3>
          <button type="button" class="skill-hub-confirm-close" aria-label="关闭" @click="closeConfirm">×</button>
        </div>
        <div class="skill-hub-confirm-body">
          <p>{{ confirmMeta.desc }}</p>
          <div class="skill-hub-confirm-info">
            <span>Skill</span><b>{{ confirmState.item.name }}</b>
            <span>当前状态</span><b>{{ rowPresentation(confirmState.item).mainStatusLabel }}</b>
            <span>当前版本</span><b>{{ confirmState.item.version }}</b>
            <span>绑定平台</span><b>{{ confirmState.item.platform }}</b>
          </div>
          <label v-if="confirmMeta.acceptsReason" class="skill-hub-confirm-reason">
            <span>处理说明（{{ confirmRequiresReason ? '必填' : '选填' }}）</span>
            <textarea v-model="confirmReason" rows="3" placeholder="记录本次处理原因，便于后续追溯" @input="confirmError = ''"></textarea>
            <small v-if="confirmError" class="skill-hub-confirm-error">{{ confirmError }}</small>
          </label>
        </div>
        <div class="skill-hub-confirm-foot">
          <button class="btn btn-secondary" type="button" @click="closeConfirm">取消</button>
          <button class="btn" :class="confirmMeta.tone === 'danger' ? 'btn-danger' : 'btn-primary'" type="button" @click="confirmAction">{{ confirmMeta.confirmText }}</button>
        </div>
      </div>
    </div>

    <div
      v-if="detailItem"
      class="skill-hub-detail-modal open"
      @click.self="detailItem = null"
    >
      <div class="skill-hub-detail-panel" role="dialog" aria-modal="true" aria-label="Skill 详情">
        <div class="skill-hub-detail-head">
          <h3>Skill 详情</h3>
          <button type="button" class="skill-hub-detail-close" aria-label="关闭" @click="detailItem = null">×</button>
        </div>
        <div class="skill-hub-detail-body">
          <table class="skill-hub-detail-table">
            <tbody>
              <tr>
                <th>ID</th><td>{{ detailId(detailItem) }}</td>
                <th>Skill 名称</th><td>{{ detailItem.name }}</td>
              </tr>
              <tr>
                <th>当前版本</th><td>{{ detailItem.version }}</td>
                <th>状态</th><td><em class="skill-hub-status" :class="`status-${rowPresentation(detailItem).mainStatus}`">{{ rowPresentation(detailItem).mainStatusLabel }}</em></td>
              </tr>
              <tr>
                <th>作者</th><td>{{ detailItem.owner }}</td>
                <th>提交人</th><td>{{ detailItem.owner }}</td>
              </tr>
              <tr>
                <th>绑定平台</th><td>{{ detailItem.platform }}</td>
                <th>所属菜单</th><td>{{ skillCategoryLabel(detailItem) }}</td>
              </tr>
              <tr>
                <th>描述</th><td colspan="3">{{ detailItem.desc }}</td>
              </tr>
              <tr>
                <th>审核人</th><td>{{ detailItem.reviewer || '-' }}</td>
                <th>审核时间</th><td>{{ detailItem.reviewTime || '-' }}</td>
              </tr>
              <tr>
                <th>审核备注</th><td colspan="3">{{ detailItem.reviewNote || '-' }}</td>
              </tr>
            </tbody>
          </table>
        </div>
        <div class="skill-hub-detail-foot">
          <button class="btn btn-secondary" type="button" @click="detailItem = null">关闭</button>
          <button v-if="allowedActionsFor(detailItem).some(action => action.code === 'approve')" class="btn btn-primary" type="button" @click="openConfirm(detailItem, 'approve')">审批通过</button>
        </div>
      </div>
    </div>

    <div
      v-if="evalItem"
      class="skill-hub-eval-modal open"
      @click.self="evalItem = null"
    >
      <div class="skill-hub-eval-panel ready" role="dialog" aria-label="Skill 评估">
        <div class="skill-hub-eval-head">
          <div>
            <h3>Skill 评估</h3>
            <p>{{ evalItem.cnName || evalItem.name }} · 静态评估 + 测试用例 + 风险检查</p>
          </div>
          <button type="button" class="skill-hub-detail-close" aria-label="关闭" @click="evalItem = null">×</button>
        </div>
        <div class="skill-hub-eval-body">
          <div class="skill-score-grid">
            <div class="skill-score-card"><span>静态评分</span><b>0.872</b><i style="--score:87.2%"></i></div>
            <div class="skill-score-card"><span>结果评分</span><b>0.804</b><i style="--score:80.4%"></i></div>
            <div class="skill-score-card"><span>过程评分</span><b>0.742</b><i style="--score:74.2%"></i></div>
            <div class="skill-score-card featured"><span>综合评分</span><b>0.782</b><i style="--score:78.2%"></i><em>未达门槛 0.80</em></div>
          </div>
          <div class="skill-eval-gate warn">
            <b>评估未通过</b>
            <span>综合评分 0.782，未达到 0.80 提交审核门槛，请返回编辑并完成 AI 微调。</span>
          </div>
        </div>
      </div>
    </div>

    <div
      v-if="capabilityChangeItem"
      class="skill-hub-detail-modal open"
      @click.self="capabilityChangeItem = null"
    >
      <div class="skill-hub-detail-panel skill-capability-change-panel" role="dialog" aria-modal="true" aria-label="能力变化详情">
        <div class="skill-hub-detail-head">
          <div>
            <h3>能力变化详情</h3>
            <p>{{ capabilityChangeItem.cnName }} · {{ capabilityChangeItem.name }}</p>
          </div>
          <button type="button" class="skill-hub-detail-close" aria-label="关闭" @click="capabilityChangeItem = null">×</button>
        </div>
        <div v-if="capabilityDetailUpdate" class="skill-hub-detail-body">
          <div class="skill-capability-overview">
            <div><span>菜单 / 上下文</span><b>{{ capabilityDetailUpdate.menuPath }}</b><small>{{ capabilityDetailUpdate.contextId }}</small></div>
            <div><span>能力版本</span><b>{{ capabilityDetailUpdate.currentCapabilityVersion }} → {{ capabilityDetailUpdate.targetCapabilityVersion }}</b><small>当前 Skill {{ capabilityChangeItem.online }} · 编辑 {{ capabilityChangeItem.editVersion || '尚未创建' }}</small></div>
            <div><span>检测时间</span><b>{{ capabilityDetailUpdate.detectedAt }}</b><small>Asia/Shanghai</small></div>
            <div><span>通知状态</span><b>{{ capabilityDetailUpdate.notificationState }}</b><small>暂未连接真实通知服务</small></div>
          </div>
          <div v-if="capabilityChangeItem.capabilityUpdate?.status === 'failed'" class="skill-capability-error" role="alert">
            <b>更新任务执行失败</b>
            <span>任务 {{ capabilityChangeItem.capabilityUpdate.task?.id || '-' }} · {{ capabilityChangeItem.capabilityUpdate.task?.error || '更新生成失败' }}</span>
            <small>可返回列表重试更新，重试将复用当前任务和变化记录。</small>
          </div>
          <div class="skill-capability-report">
            <SafeCapabilityMarkdown :markdown="capabilityDetailUpdate.reportMarkdown" />
          </div>
          <details class="skill-capability-technical">
            <summary>查看技术明细</summary>
            <SafeCapabilityMarkdown :markdown="technicalMarkdown(capabilityChangeItem)" />
          </details>
          <details v-if="capabilityDetailUpdate.history?.length" class="skill-capability-history">
            <summary>历史能力快照（{{ capabilityDetailUpdate.history.length }}）</summary>
            <article v-for="record in capabilityDetailUpdate.history" :key="record.recordId">
              <div>
                <b>{{ record.currentCapabilityVersion }} → {{ record.targetCapabilityVersion }}</b>
                <span>{{ record.detectedAt }} · {{ record.recordId }}</span>
              </div>
              <p>{{ record.summary }}</p>
              <small>包含 {{ record.changes?.length || 0 }} 项变化明细</small>
            </article>
          </details>
        </div>
        <div class="skill-hub-detail-foot">
          <button class="btn btn-secondary" type="button" @click="capabilityChangeItem = null">关闭</button>
          <button
            v-for="action in capabilityDetailActions"
            :key="action.code"
            class="btn"
            :class="action.code === 'start_update' || action.code === 'retry_update' || action.code === 'continue_update' ? 'btn-primary' : 'btn-secondary'"
            type="button"
            :disabled="!action.enabled"
            @click="handleAction(capabilityChangeItem, action.code)"
          >
            {{ actionLabel(action.code) }}
          </button>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { storeToRefs } from 'pinia'
import { MENU_TREE, useAppStore } from '@/stores/app'
import { useAIStore } from '@/stores/ai'
import {
  skillHubStatusLabel,
  useSkillHubStore,
  type SkillHubActionCode,
  type SkillHubAllowedAction,
  type SkillHubItem,
  type SkillStatus
} from '@/stores/skillHub'
import SafeCapabilityMarkdown from '@/components/agent/SafeCapabilityMarkdown.vue'
import ContentPageHeader from '@/components/content/ContentPageHeader.vue'
import {
  capabilityDecisionUpdate,
  shouldShowCapabilityChangeSummary,
  skillHubRowPresentation
} from '@/services/skillCapabilityChanges'

const router = useRouter()
const appStore = useAppStore()
const aiStore = useAIStore()
const skillHubStore = useSkillHubStore()
const { permissions, user } = storeToRefs(appStore)
const { items } = storeToRefs(skillHubStore)

const keyword = ref('')
const statusFilter = ref<'all' | SkillStatus>('all')
const categoryFilter = ref('all')
type SummaryFilter = 'all' | 'own' | 'review' | 'published' | 'updates' | 'disabled'
const summaryFilter = ref<SummaryFilter>('all')
const onlyCapabilityUpdates = computed({
  get: () => summaryFilter.value === 'updates',
  set: (checked: boolean) => {
    summaryFilter.value = checked ? 'updates' : 'all'
    if (checked) statusFilter.value = 'all'
  }
})
const detailItem = ref<SkillHubItem | null>(null)
const evalItem = ref<SkillHubItem | null>(null)
const capabilityChangeItem = ref<SkillHubItem | null>(null)
const confirmState = ref<{ item: SkillHubItem; action: SkillHubActionCode } | null>(null)
const confirmReason = ref('')
const confirmError = ref('')

const role = computed(() => permissions.value.includes('*') ? 'admin' : 'pm')
const actor = computed(() => ({ role: role.value, user: user.value || 'admin' }) as const)
const pageDesc = computed(() => role.value === 'admin'
  ? '管理员可查看草稿，并审批、驳回、发布、启用或禁用 Skill；草稿可返回需求澄清继续编辑。'
  : 'PM 查看自己保存或提交的 Skill；草稿和被驳回的 Skill 可返回创建流程继续修改。')

const firstLevelCategories = Object.values(MENU_TREE).map(group => group.label)

function skillCategoryLabel(item: SkillHubItem) {
  const rawCategory = item.category || ''
  if (firstLevelCategories.includes(rawCategory)) return rawCategory

  const text = `${rawCategory} ${item.cnName || ''} ${item.name || ''} ${item.desc || ''} ${(item.tags || []).join(' ')}`
  if (/职场|员工|认证|审核|在职/.test(text)) return '在职员工管理'
  if (/GEO|信源|意图|引用/.test(text)) return 'GEO 看板'
  if (/线索|客户|商机|打分/.test(text)) return '企业客户管理'
  if (/订单|采购单/.test(text) && firstLevelCategories.includes('订单管理')) return '订单管理'
  return '乐享运营'
}

const categories = computed(() => firstLevelCategories)
const statusOptions: SkillStatus[] = ['draft', 'review', 'approved', 'published', 'disabled', 'rejected']

function matchesSummaryFilter(item: SkillHubItem, filter: SummaryFilter) {
  if (filter === 'all') return true
  if (filter === 'own') return item.owner === (user.value || 'admin')
  if (filter === 'review') return item.workflowStatus === 'review'
  if (filter === 'published') return item.onlineStatus === 'published'
  if (filter === 'updates') return hasCapabilityUpdate(item)
  return item.onlineStatus === 'disabled'
}

const filteredItems = computed(() => {
  const q = keyword.value.trim().toLowerCase()
  return items.value.filter(item => {
    const matchKeyword = !q || [item.name, item.cnName, item.desc].some(text => text.toLowerCase().includes(q))
    const matchStatus = statusFilter.value === 'all' || item.workflowStatus === statusFilter.value
    const matchCategory = categoryFilter.value === 'all' || skillCategoryLabel(item) === categoryFilter.value
    const matchSummary = matchesSummaryFilter(item, summaryFilter.value)
    return matchKeyword && matchStatus && matchCategory && matchSummary
  })
})

const summaryItems = computed(() => {
  const ownCount = items.value.filter(item => matchesSummaryFilter(item, 'own')).length
  const reviewCount = items.value.filter(item => matchesSummaryFilter(item, 'review')).length
  const publishedCount = items.value.filter(item => matchesSummaryFilter(item, 'published')).length
  const disabledCount = items.value.filter(item => matchesSummaryFilter(item, 'disabled')).length
  const capabilityCount = items.value.filter(item => matchesSummaryFilter(item, 'updates')).length
  return [
    { key: 'all', label: '全部 Skill', code: 'ALL', value: items.value.length, desc: `按 ${categories.value.length} 个一级菜单归类`, tone: 'stat--primary', filter: 'all' as const },
    { key: 'own', label: '我的 Skill', code: 'ME', value: ownCount, desc: role.value === 'admin' ? '含当前账号草稿与已提交' : '含草稿与已提交记录', tone: 'stat--info', filter: 'own' as const },
    { key: 'review', label: '待审批', code: 'TODO', value: reviewCount, desc: '需管理员审核处理', tone: 'stat--warning', filter: 'review' as const },
    { key: 'published', label: '已发布', code: 'LIVE', value: publishedCount, desc: '线上可被工作台调用', tone: 'stat--success', filter: 'published' as const },
    { key: 'updates', label: '能力更新', code: 'NEW', value: capabilityCount, desc: `${capabilityCount} 个 Skill 待确认影响`, tone: 'stat--primary', filter: 'updates' as const },
    { key: 'disabled', label: '已禁用', code: 'OFF', value: disabledCount, desc: '暂停参与任务匹配', tone: 'stat--muted', filter: 'disabled' as const }
  ]
})

function setSummaryFilter(filter: SummaryFilter) {
  summaryFilter.value = summaryFilter.value === filter ? 'all' : filter
  keyword.value = ''
  statusFilter.value = 'all'
  categoryFilter.value = 'all'
}

type ConfirmMeta = {
  title: string
  desc: string
  confirmText: string
  tone: string
  acceptsReason?: boolean
}

const confirmMeta = computed<ConfirmMeta>(() => {
  const action = confirmState.value?.action
  const options: Partial<Record<SkillHubActionCode, ConfirmMeta>> = {
    publish: { title: '确认发布 Skill', desc: '发布后候选版本将成为线上版本；原 Skill 为禁用状态时仍保持禁用。', confirmText: '确认发布', tone: 'success' },
    disable: { title: '确认禁用 Skill', desc: '禁用后该 Skill 将暂不可用，已配置的调用入口会停止响应。', confirmText: '确认禁用', tone: 'danger' },
    enable: { title: '确认启用 Skill', desc: '启用后该 Skill 将恢复线上可用状态。', confirmText: '确认启用', tone: 'success' },
    approve: { title: '确认审批通过', desc: '审批通过后候选版本可进入发布，当前线上版本不会改变。', confirmText: '审批通过', tone: 'success' },
    reject: { title: '确认驳回 Skill', desc: '驳回只影响候选版本，负责人可继续修改后重新提交。', confirmText: '确认驳回', tone: 'danger' },
    delete: { title: '确认删除草稿', desc: '删除后当前草稿将从列表移除，本次操作不可撤销。', confirmText: '确认删除', tone: 'danger' },
    ignore_update: { title: '确认忽略更新', desc: '忽略更新只作用于当前变化记录，候选版本仍基于旧能力上下文；后续检测到新版本时会重新提示。', confirmText: '确认忽略', tone: 'normal', acceptsReason: true }
  }
  return (action && options[action]) || { title: '确认操作', desc: '该操作会改变 Skill 当前状态，请确认后继续。', confirmText: '确认', tone: 'normal' }
})

const confirmRequiresReason = computed(() => {
  if (confirmState.value?.action !== 'ignore_update') return false
  return (decisionCapabilityUpdate(confirmState.value.item)?.changes || [])
    .some((change: { kind?: string }) => change.kind === 'breaking' || change.kind === 'permission')
})

const capabilityDetailUpdate = computed(() => capabilityChangeItem.value
  ? decisionCapabilityUpdate(capabilityChangeItem.value)
  : undefined)

const capabilityDetailActions = computed<SkillHubAllowedAction[]>(() => {
  if (!capabilityChangeItem.value) return []
  const codes: SkillHubActionCode[] = ['start_update', 'ignore_update', 'continue_update', 'retry_update']
  return allowedActionsFor(capabilityChangeItem.value).filter(action => codes.includes(action.code))
})

function rowPresentation(item: SkillHubItem) {
  return skillHubRowPresentation(item)
}

function decisionCapabilityUpdate(item: SkillHubItem) {
  return capabilityDecisionUpdate(item)
}

function allowedActionsFor(item: SkillHubItem) {
  return skillHubStore.allowedActionsFor(item, actor.value)
}

function actionTone(action: SkillHubActionCode) {
  if (action === 'test') return 'test'
  if (action === 'delete' || action === 'reject') return 'danger'
  if (action === 'approve' || action === 'publish' || action === 'enable') return 'success'
  if (action === 'submit_review' || action === 'retry_update') return 'warning'
  return 'normal'
}

function actionLabel(action: SkillHubActionCode) {
  return ({
    view_change: '查看变化',
    start_update: '更新',
    ignore_update: '忽略更新',
    continue_update: '继续更新',
    view_update_error: '查看失败原因',
    retry_update: '重试更新',
    edit: '编辑',
    view: '详情',
    evaluate: '测试',
    test: '应用',
    submit_review: '提交审核',
    withdraw_review: '撤回',
    approve: '审批',
    reject: '驳回',
    publish: '发布',
    enable: '启用',
    disable: '禁用',
    delete: '删除'
  })[action]
}

function handleAction(item: SkillHubItem, action: SkillHubActionCode) {
  if (action === 'test') return testSkill(item)
  if (action === 'view_change' || action === 'view_update_error') {
    capabilityChangeItem.value = item
    return
  }
  if (action === 'start_update' || action === 'continue_update' || action === 'retry_update') {
    openCapabilityUpdate(item)
    return
  }
  if (action === 'ignore_update') {
    openConfirm(item, action)
    return
  }
  if (action === 'evaluate') {
    evalItem.value = item
    return
  }
  if (action === 'view') {
    detailItem.value = item
    return
  }
  if (action === 'edit') {
    openSkillCreateForItem(item, item.workflowStatus === 'rejected')
    return
  }
  if (action === 'submit_review') {
    updateStatus(item, 'review')
    return
  }
  if (action === 'withdraw_review') {
    if (item.capabilityUpdate?.status === 'processing') updateCapabilityStatus(item, 'draft')
    else updateStatus(item, 'draft')
    return
  }
  if (['publish', 'enable', 'disable', 'approve', 'reject', 'delete'].includes(action)) {
    openConfirm(item, action)
    return
  }
}

function hasCapabilityUpdate(item: SkillHubItem) {
  return ['available', 'preparing', 'processing_with_available', 'failed'].includes(item.capabilityUpdate?.status || 'none')
}

function technicalMarkdown(item: SkillHubItem) {
  return (decisionCapabilityUpdate(item)?.technicalDetails || []).join('\n\n')
}

function openCapabilityUpdate(item: SkillHubItem) {
  const updated = skillHubStore.startCapabilityUpdate(item.name)
  if (!updated) return
  capabilityChangeItem.value = null
  sessionStorage.setItem('leai.skillCreateDraft', JSON.stringify({ item: updated, capabilityUpdate: true }))
  void router.push({
    path: '/agent/skill-create',
    query: { skill: updated.name, edit: 'draft', capabilityUpdate: '1' }
  })
  toast(`${updated.cnName || updated.name}：已进入能力更新草稿，线上版本继续生效`)
}

function openConfirm(item: SkillHubItem, action: SkillHubActionCode) {
  confirmReason.value = ''
  confirmError.value = ''
  confirmState.value = { item, action }
}

function closeConfirm() {
  confirmState.value = null
  confirmReason.value = ''
  confirmError.value = ''
}

function confirmAction() {
  if (!confirmState.value) return
  const { item, action } = confirmState.value
  if (action === 'ignore_update' && confirmRequiresReason.value && !confirmReason.value.trim()) {
    confirmError.value = '破坏性或权限变化必须填写处理说明'
    return
  }
  try {
    if (action === 'approve') {
      if (item.capabilityUpdate?.status === 'processing') updateCapabilityStatus(item, 'approved')
      else updateStatus(item, 'approved')
    } else if (action === 'reject') {
      if (item.capabilityUpdate?.status === 'processing') updateCapabilityStatus(item, 'rejected')
      else updateStatus(item, 'rejected')
    } else if (action === 'publish') {
      if (item.capabilityUpdate?.status === 'processing') updateCapabilityStatus(item, 'published')
      else updateStatus(item, 'published')
    } else if (action === 'enable') updateStatus(item, 'published')
    else if (action === 'disable') updateStatus(item, 'disabled')
    else if (action === 'delete') {
      skillHubStore.removeSkill(item.name)
      toast(`${item.name}：草稿已删除`)
    } else if (action === 'ignore_update') {
      skillHubStore.ignoreCapabilityUpdate(item.name, user.value || 'admin', confirmReason.value.trim())
      capabilityChangeItem.value = null
      toast(`${item.name}：已忽略更新`)
    }
  } catch (error) {
    confirmError.value = error instanceof Error ? error.message : '操作失败，请检查后重试'
    return
  }
  closeConfirm()
}

function updateStatus(item: SkillHubItem, status: SkillStatus) {
  skillHubStore.updateStatus(item, status, user.value || 'admin')
  toast(`${item.name}：状态已更新为${item.statusText}`)
}

function updateCapabilityStatus(item: SkillHubItem, status: 'draft' | 'approved' | 'rejected' | 'published') {
  skillHubStore.updateCapabilityEditStatus(item, status, user.value || 'admin')
  const label = status === 'published' ? '更新版本已发布' : status === 'draft' ? '更新已撤回到草稿' : `编辑版${skillHubStatusLabel(status)}`
  toast(`${item.name}：${label}`)
}

function testSkill(item: SkillHubItem) {
  const query = item.name === 'presentation-employee-cert'
    ? '总结近两周的认证数据情况，人群画像，并查看认证用户的购买转化、GMV、爆款商品。'
    : `请用自然语言测试 Skill「${item.name}」，说明适用场景、风险边界和输出结果。`
  aiStore.toggleOpen(true)
  aiStore.quickSend(query, 'agent.skills')
  toast(`${item.name}：已在右侧 Agent 展示调用结果`)
}

function detailId(item: SkillHubItem) {
  return String(14 + Math.max(items.value.indexOf(item), 0))
}

function openSkillCreateForItem(item: SkillHubItem, rejected = false) {
  sessionStorage.setItem('leai.skillCreateDraft', JSON.stringify({ item, rejected }))
  const isDraft = item.workflowStatus === 'draft'
  void router.push({
    path: '/agent/skill-create',
    query: {
      skill: item.name,
      rejected: rejected ? '1' : undefined,
      edit: isDraft ? 'draft' : undefined
    }
  })
  toast(rejected
    ? `${item.cnName || item.name}：已进入创建流程，请修改后重新提交`
    : isDraft
      ? `${item.cnName || item.name}：已恢复草稿并进入需求澄清`
      : `${item.cnName || item.name}：已进入编辑流程`)
}

function openSkillCreate() {
  sessionStorage.removeItem('leai.skillCreateDraft')
  router.push('/agent/skill-create')
}

function goPortalHome() {
  router.push('/portal/home')
}

function toast(message: string) {
  appStore.notify(message)
}

onMounted(() => {
  const [navigation] = performance.getEntriesByType('navigation') as PerformanceNavigationTiming[]
  if (navigation && navigation.type === 'reload') {
    sessionStorage.removeItem('leai.skillCreateDraft')
    skillHubStore.resetToInitialMock()
  }
  appStore.ensureStaticTab('agent.skills')
  appStore.setActiveStaticTab('agent.skills')
  document.title = '联想门户工作台'
})
</script>

<style scoped>
.skill-hub-page[data-page-flow="skill-hub"] {
  gap: 16px;
}

.skill-hub-page[data-page-flow="skill-hub"] > .skill-hub-summary {
  margin-block: 0;
}
</style>

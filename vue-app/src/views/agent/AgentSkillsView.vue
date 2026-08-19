<template>
  <div class="skill-hub-page" role="region" aria-label="Skill Hub">
    <div class="page-header">
      <div>
        <div class="page-title">Skill Hub</div>
        <div class="page-desc">{{ pageDesc }}</div>
      </div>
      <div class="agent-skill-page-actions">
        <button class="btn btn-primary" type="button" @click="openSkillCreate">创建 Skill</button>
        <button class="btn btn-secondary" type="button" @click="goPortalHome">返回工作台</button>
      </div>
    </div>

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
            :data-status="item.status"
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
                <b>{{ item.capabilityUpdate?.summary }}</b>
                <span>{{ item.capabilityUpdate?.detectedAt }} 检测</span>
              </div>
            </td>
            <td>
              <span class="skill-hub-version">{{ item.editVersion || item.version }}</span>
              <small v-if="item.editVersion" class="skill-hub-edit-version">编辑版本</small>
            </td>
            <td><span class="skill-hub-online" :class="{ empty: item.online === '未发布' }">{{ item.online }}</span></td>
            <td>
              <div class="skill-hub-status-stack">
                <span class="skill-hub-status" :class="`status-${item.status}`">{{ item.statusText }}</span>
                <span v-if="item.editStatus" class="skill-hub-edit-status">编辑版{{ skillHubStatusLabel(item.editStatus) }}</span>
                <span v-if="capabilityPresentation(item).statusLabel" class="skill-hub-update-status" :class="`is-${item.capabilityUpdate?.status}`">
                  {{ capabilityPresentation(item).statusLabel }}
                </span>
              </div>
            </td>
            <td>{{ item.updated }}</td>
            <td>
              <div class="skill-hub-actions">
                <button
                  v-for="action in skillHubActions(item)"
                  :key="action"
                  class="skill-hub-action"
                  :class="actionTone(action)"
                  type="button"
                  :disabled="actionDisabled(item, action)"
                  @click="handleAction(item, action)"
                >
                  {{ actionLabel(action) }}
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
      @click.self="confirmState = null"
    >
      <div class="skill-hub-confirm-panel" role="dialog" :aria-label="confirmMeta.title">
        <div class="skill-hub-confirm-head">
          <h3>{{ confirmMeta.title }}</h3>
          <button type="button" class="skill-hub-confirm-close" aria-label="关闭" @click="confirmState = null">×</button>
        </div>
        <div class="skill-hub-confirm-body">
          <p>{{ confirmMeta.desc }}</p>
          <div class="skill-hub-confirm-info">
            <span>Skill</span><b>{{ confirmState.item.name }}</b>
            <span>当前状态</span><b>{{ confirmState.item.statusText }}</b>
            <span>当前版本</span><b>{{ confirmState.item.version }}</b>
            <span>绑定平台</span><b>{{ confirmState.item.platform }}</b>
          </div>
          <label v-if="confirmMeta.acceptsReason" class="skill-hub-confirm-reason">
            <span>处理说明（选填）</span>
            <textarea v-model="confirmReason" rows="3" placeholder="记录本次处理原因，便于后续追溯"></textarea>
          </label>
        </div>
        <div class="skill-hub-confirm-foot">
          <button class="btn btn-secondary" type="button" @click="confirmState = null">取消</button>
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
                <th>状态</th><td><em class="skill-hub-status" :class="`status-${detailItem.status}`">{{ detailItem.statusText }}</em></td>
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
          <button v-if="role === 'admin' && detailItem.status === 'review'" class="btn btn-primary" type="button" @click="openConfirm(detailItem, '审批')">审批通过</button>
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
        <div v-if="capabilityChangeItem.capabilityUpdate" class="skill-hub-detail-body">
          <div class="skill-capability-overview">
            <div><span>菜单 / 上下文</span><b>{{ capabilityChangeItem.capabilityUpdate.menuPath }}</b><small>{{ capabilityChangeItem.capabilityUpdate.contextId }}</small></div>
            <div><span>能力版本</span><b>{{ capabilityChangeItem.capabilityUpdate.currentCapabilityVersion }} → {{ capabilityChangeItem.capabilityUpdate.targetCapabilityVersion }}</b><small>当前 Skill {{ capabilityChangeItem.online }} · 编辑 {{ capabilityChangeItem.editVersion || '尚未创建' }}</small></div>
            <div><span>检测时间</span><b>{{ capabilityChangeItem.capabilityUpdate.detectedAt }}</b><small>Asia/Shanghai</small></div>
            <div><span>通知状态</span><b>{{ capabilityChangeItem.capabilityUpdate.notificationState }}</b><small>暂未连接真实通知服务</small></div>
          </div>
          <div class="skill-capability-report">
            <SafeCapabilityMarkdown :markdown="capabilityChangeItem.capabilityUpdate.reportMarkdown" />
          </div>
          <details class="skill-capability-technical">
            <summary>查看技术明细</summary>
            <SafeCapabilityMarkdown :markdown="technicalMarkdown(capabilityChangeItem)" />
          </details>
          <details v-if="capabilityChangeItem.capabilityUpdate.history?.length" class="skill-capability-history">
            <summary>历史能力快照（{{ capabilityChangeItem.capabilityUpdate.history.length }}）</summary>
            <article v-for="record in capabilityChangeItem.capabilityUpdate.history" :key="record.recordId">
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
            v-if="capabilityPresentation(capabilityChangeItem).ignoreLabel"
            class="btn btn-secondary"
            type="button"
            @click="openConfirm(capabilityChangeItem, capabilityPresentation(capabilityChangeItem).ignoreLabel)"
          >
            {{ capabilityPresentation(capabilityChangeItem).ignoreLabel }}
          </button>
          <button
            v-if="canUpdateSkill(capabilityChangeItem) && capabilityPresentation(capabilityChangeItem).actionLabel"
            class="btn btn-primary"
            type="button"
            :disabled="capabilityPresentation(capabilityChangeItem).actionLoading"
            @click="openCapabilityUpdate(capabilityChangeItem)"
          >
            {{ capabilityPresentation(capabilityChangeItem).actionLabel }}
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
import { skillHubStatusLabel, useSkillHubStore, type SkillHubItem, type SkillStatus } from '@/stores/skillHub'
import SafeCapabilityMarkdown from '@/components/agent/SafeCapabilityMarkdown.vue'
import { capabilityUpdatePresentation, shouldShowCapabilityChangeSummary } from '@/services/skillCapabilityChanges'

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
const confirmState = ref<{ item: SkillHubItem; action: string } | null>(null)
const confirmReason = ref('')

const role = computed(() => permissions.value.includes('*') ? 'admin' : 'pm')
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
  if (filter === 'review') return item.status === 'review' || item.editStatus === 'review'
  if (filter === 'published') return item.online !== '未发布' && item.status !== 'disabled'
  if (filter === 'updates') return hasCapabilityUpdate(item)
  return item.status === 'disabled'
}

const filteredItems = computed(() => {
  const q = keyword.value.trim().toLowerCase()
  return items.value.filter(item => {
    const matchKeyword = !q || [item.name, item.cnName, item.desc].some(text => text.toLowerCase().includes(q))
    const matchStatus = statusFilter.value === 'all' || item.status === statusFilter.value || item.editStatus === statusFilter.value
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

const confirmMeta = computed(() => {
  const action = confirmState.value?.action || ''
  return {
    发布: { title: '确认发布 Skill', desc: '发布后该 Skill 将进入线上可用状态，业务用户可在授权范围内调用。', confirmText: '确认发布', tone: 'success' },
    审批更新: { title: '确认审批更新版本', desc: '审批通过后编辑版本可进入发布，当前线上版本仍继续服务。', confirmText: '审批更新', tone: 'success' },
    驳回更新: { title: '确认驳回更新版本', desc: '驳回只影响编辑版本，当前线上版本不会改变。', confirmText: '驳回更新', tone: 'danger' },
    发布更新: { title: '确认发布更新版本', desc: '发布后编辑版本将替换当前线上版本，并关闭本次能力更新记录。', confirmText: '发布更新', tone: 'success' },
    禁用: { title: '确认禁用 Skill', desc: '禁用后该 Skill 将暂不可用，已配置的调用入口会停止响应。', confirmText: '确认禁用', tone: 'danger' },
    启用: { title: '确认启用 Skill', desc: '启用后该 Skill 将恢复线上可用状态，操作列会切换为“禁用”。', confirmText: '确认启用', tone: 'success' },
    审批: { title: '确认审批通过', desc: '审批通过后该 Skill 可进入后续发布或上传流程。', confirmText: '审批通过', tone: 'success' },
    驳回: { title: '确认驳回 Skill', desc: '驳回后提交人需要补充材料、业务边界或测试用例后重新提交。', confirmText: '确认驳回', tone: 'danger' },
    忽略本次: { title: '确认忽略本次变化', desc: '忽略只作用于当前变化记录。后续检测到新的能力版本时，仍会重新提示。', confirmText: '确认忽略', tone: 'normal', acceptsReason: true },
    暂不处理: { title: '确认暂不处理', desc: '暂不处理会保留高风险标记，并记录当前版本与处理人，后续仍可重新评估。', confirmText: '确认暂不处理', tone: 'normal', acceptsReason: true }
  }[action] || { title: `确认${action}`, desc: '该操作会改变 Skill 当前状态，请确认后继续。', confirmText: '确认', tone: 'normal' }
})

function skillHubActions(item: SkillHubItem) {
  const pmActions: Record<SkillStatus, string[]> = {
    draft: ['返回编辑', '查看'],
    review: ['查看', '编辑', '撤回', '评估'],
    approved: ['发布', '编辑', '评估'],
    published: ['禁用', '编辑', '评估'],
    disabled: ['启用', '编辑', '评估'],
    rejected: ['被驳回去修改', '编辑', '评估']
  }
  const adminActions: Record<SkillStatus, string[]> = {
    draft: ['返回编辑', '查看'],
    review: ['审批', '驳回', '查看', '评估'],
    approved: ['发布', '禁用', '查看'],
    published: ['禁用', '查看', '评估'],
    disabled: ['启用', '查看'],
    rejected: ['查看']
  }
  const baseActions = (role.value === 'admin' ? adminActions : pmActions)[item.status] || ['查看']
  const governanceActions = role.value === 'admin' && item.editStatus === 'review'
    ? ['审批更新', '驳回更新']
    : role.value === 'admin' && item.editStatus === 'approved'
      ? ['发布更新']
      : []
  const presentation = capabilityPresentation(item)
  const updateActions = presentation.visible
    ? [
        '查看变化',
        ...governanceActions,
        ...(presentation.ignoreLabel ? [presentation.ignoreLabel] : []),
        ...(canUpdateSkill(item) && canEditCapabilityUpdate(item) && presentation.actionLabel ? [presentation.actionLabel] : [])
      ]
    : []
  if (item.status === 'draft') return [...updateActions, ...baseActions]
  return [...updateActions, ...baseActions.filter(action => action !== '测试'), '测试']
}

function actionTone(action: string) {
  if (action === '测试') return 'test'
  if (action === '删除' || action === '驳回' || action === '驳回更新') return 'danger'
  if (action === '审批' || action === '审批更新' || action === '发布' || action === '发布更新' || action === '启用') return 'success'
  if (action === '提交审核' || action === '被驳回去修改') return 'warning'
  return 'normal'
}

function actionDisabled(item: SkillHubItem, action: string) {
  const presentation = capabilityPresentation(item)
  return action === presentation.actionLabel && presentation.actionLoading
}

function actionLabel(action: string) {
  return ({
    审批更新: '审批',
    驳回更新: '驳回',
    发布更新: '发布'
  } as Record<string, string>)[action] || action
}

function handleAction(item: SkillHubItem, action: string) {
  if (action === '测试') return testSkill(item)
  if (action === '查看变化') {
    capabilityChangeItem.value = item
    return
  }
  if (action === '更新' || action === '继续更新' || action === '正在准备') {
    if (action === '正在准备') return
    openCapabilityUpdate(item)
    return
  }
  if (action === '忽略本次' || action === '暂不处理') {
    openConfirm(item, action)
    return
  }
  if (action === '评估') {
    evalItem.value = item
    return
  }
  if (action === '查看') {
    detailItem.value = item
    return
  }
  if (action === '返回编辑' || action === '编辑' || action === '被驳回去修改') {
    openSkillCreateForItem(item, action === '被驳回去修改')
    return
  }
  if (['发布', '启用', '禁用', '审批', '驳回', '审批更新', '驳回更新', '发布更新'].includes(action)) {
    openConfirm(item, action)
    return
  }
  toast(`${item.name}：${action}操作已记录`)
}

function hasCapabilityUpdate(item: SkillHubItem) {
  return capabilityPresentation(item).visible
}

function capabilityPresentation(item: SkillHubItem) {
  return capabilityUpdatePresentation(item)
}

function capabilityUpdateActionLabel(item: SkillHubItem) {
  return capabilityPresentation(item).actionLabel
}

function technicalMarkdown(item: SkillHubItem) {
  return (item.capabilityUpdate?.technicalDetails || []).join('\n\n')
}

function canEditCapabilityUpdate(item: SkillHubItem) {
  if (item.capabilityUpdate?.status === 'available') return true
  return item.capabilityUpdate?.status === 'processing'
    && (item.editStatus === 'draft' || item.editStatus === 'rejected')
}

function capabilityChangeKindLabel(kind: string) {
  return ({ enhancement: '增强', breaking: '破坏性变化', permission: '权限 / 配置' })[kind] || '变化'
}

function canUpdateSkill(item: SkillHubItem) {
  return role.value === 'admin' || item.owner === (user.value || 'admin')
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

function openConfirm(item: SkillHubItem, action: string) {
  confirmReason.value = ''
  confirmState.value = { item, action }
}

function confirmAction() {
  if (!confirmState.value) return
  const { item, action } = confirmState.value
  if (action === '审批') updateStatus(item, 'approved')
  else if (action === '驳回') updateStatus(item, 'rejected')
  else if (action === '审批更新') updateCapabilityStatus(item, 'approved')
  else if (action === '驳回更新') updateCapabilityStatus(item, 'rejected')
  else if (action === '发布更新') updateCapabilityStatus(item, 'published')
  else if (action === '发布') updateStatus(item, 'published')
  else if (action === '启用') updateStatus(item, 'published')
  else if (action === '禁用') updateStatus(item, 'disabled')
  else if (action === '忽略本次' || action === '暂不处理') {
    skillHubStore.ignoreCapabilityUpdate(item.name, user.value || 'admin', confirmReason.value.trim())
    capabilityChangeItem.value = null
    toast(`${item.name}：已${action}`)
  }
  confirmState.value = null
  confirmReason.value = ''
}

function updateStatus(item: SkillHubItem, status: SkillStatus) {
  skillHubStore.updateStatus(item, status, user.value || 'admin')
  toast(`${item.name}：状态已更新为${item.statusText}`)
}

function updateCapabilityStatus(item: SkillHubItem, status: 'approved' | 'rejected' | 'published') {
  skillHubStore.updateCapabilityEditStatus(item, status, user.value || 'admin')
  const label = status === 'published' ? '更新版本已发布' : `编辑版${skillHubStatusLabel(status)}`
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
  const isDraft = item.status === 'draft'
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
  appStore.ensureStaticTab('agent.skills')
  appStore.setActiveStaticTab('agent.skills')
  document.title = '联想门户工作台'
})
</script>

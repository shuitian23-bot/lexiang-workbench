<template>
  <div class="skill-hub-page page-inner" role="region" aria-label="Skill Hub">
    <div class="page-header">
      <div>
        <div class="page-title">Skill Hub</div>
        <div class="page-desc">{{ role === 'admin'
          ? '管理员可审批、驳回、发布、启用或禁用 Skill；已驳回的 Skill 不再展示发布或审批操作。'
          : 'PM 查看自己提交的 Skill 状态；被驳回的 Skill 可返回创建流程修改后重新提交。' }}</div>
      </div>
      <div class="agent-skill-page-actions">
        <button class="btn btn-primary" @click="router.push('/agent/skillCreate')">创建 Skill</button>
        <button class="btn btn-secondary" @click="router.push('/portal/home')">返回工作台</button>
      </div>
    </div>

    <!-- 统计卡片 -->
    <div class="skill-hub-summary" aria-label="Skill Hub 重点指标">
      <div class="skill-hub-stat stat--primary">
        <div class="skill-hub-stat-head"><span>全部 Skill</span><i>ALL</i></div>
        <strong>{{ items.length }}</strong>
        <em>覆盖 {{ categoryCount }} 个业务分类</em>
      </div>
      <div class="skill-hub-stat stat--info">
        <div class="skill-hub-stat-head"><span>我的提交</span><i>ME</i></div>
        <strong>{{ ownCount }}</strong>
        <em>{{ role === 'admin' ? '管理员视角当前账号' : '仅统计当前 PM 账号' }}</em>
      </div>
      <div class="skill-hub-stat stat--warning">
        <div class="skill-hub-stat-head"><span>待审批</span><i>TODO</i></div>
        <strong>{{ reviewCount }}</strong>
        <em>需管理员审核处理</em>
      </div>
      <div class="skill-hub-stat stat--success">
        <div class="skill-hub-stat-head"><span>已发布</span><i>LIVE</i></div>
        <strong>{{ publishedCount }}</strong>
        <em>线上可被工作台调用</em>
      </div>
      <div class="skill-hub-stat stat--muted">
        <div class="skill-hub-stat-head"><span>已禁用</span><i>OFF</i></div>
        <strong>{{ disabledCount }}</strong>
        <em>暂停参与任务匹配</em>
      </div>
    </div>

    <!-- 搜索工具栏 -->
    <div class="skill-hub-toolbar">
      <input v-model="searchText" placeholder="搜索技能名称、中文名或描述">
      <select v-model="filterStatus">
        <option value="all">状态</option>
        <option v-for="s in statusOptions" :key="s.value" :value="s.value">{{ s.label }}</option>
      </select>
      <select v-model="filterCategory">
        <option value="all">分类</option>
        <option v-for="c in categories" :key="c" :value="c">{{ c }}</option>
      </select>
      <button class="btn btn-primary" @click="doSearch">搜索</button>
    </div>

    <!-- 表格 -->
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
          <tr v-if="filteredItems.length === 0">
            <td colspan="9" style="text-align:center;padding:24px;color:var(--text-tertiary,#9199a6)">暂无匹配数据</td>
          </tr>
          <tr v-for="item in filteredItems" :key="item.name" class="skill-hub-row" :data-status="item.status">
            <td>
              <div class="skill-hub-name"><span class="skill-hub-doc-icon">▤</span><strong>{{ item.name }}</strong></div>
            </td>
            <td><div class="skill-hub-cn">{{ item.cnName || '-' }}</div></td>
            <td>{{ item.platform }}</td>
            <td><div class="skill-hub-desc">{{ item.desc }}</div></td>
            <td><span class="skill-hub-version">{{ item.version }}</span></td>
            <td><span class="skill-hub-online" :class="{ empty: item.online === '未发布' }">{{ item.online }}</span></td>
            <td><span class="skill-hub-status" :class="`status-${item.status}`">{{ item.statusText }}</span></td>
            <td>{{ item.updated }}</td>
            <td>
              <div class="skill-hub-actions">
                <button
                  v-for="action in getActions(item)"
                  :key="action"
                  class="skill-hub-action"
                  :class="getActionTone(action)"
                  @click="handleAction(item, action)"
                >{{ action }}</button>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- 确认弹窗 -->
    <div v-if="confirmDialog.show" class="emp-detail-overlay" @click.self="confirmDialog.show = false">
      <div class="emp-detail-panel">
        <div class="card-header" style="padding:16px 20px;">
          <span class="card-title">{{ confirmDialog.title }}</span>
          <button class="btn btn-sm btn-secondary" @click="confirmDialog.show = false">关闭</button>
        </div>
        <div style="padding:16px 20px;">
          <p style="margin:0 0 16px;font-size:14px;">{{ confirmDialog.message }}</p>
          <div style="display:flex;gap:8px;justify-content:flex-end;">
            <button class="btn btn-secondary" @click="confirmDialog.show = false">取消</button>
            <button class="btn btn-primary" @click="doConfirmAction">确认</button>
          </div>
        </div>
      </div>
    </div>

    <!-- 详情弹窗 -->
    <div v-if="detailItem" class="emp-detail-overlay" @click.self="detailItem = null">
      <div class="emp-detail-panel">
        <div class="card-header" style="padding:16px 20px;">
          <span class="card-title">Skill 详情</span>
          <button class="btn btn-sm btn-secondary" @click="detailItem = null">关闭</button>
        </div>
        <div style="padding:16px 20px;display:grid;grid-template-columns:1fr 1fr;gap:12px;font-size:13px;">
          <div><span style="color:var(--text-tertiary,#9199a6)">名称：</span>{{ detailItem.name }}</div>
          <div><span style="color:var(--text-tertiary,#9199a6)">中文名：</span>{{ detailItem.cnName }}</div>
          <div><span style="color:var(--text-tertiary,#9199a6)">平台：</span>{{ detailItem.platform }}</div>
          <div><span style="color:var(--text-tertiary,#9199a6)">分类：</span>{{ detailItem.category }}</div>
          <div><span style="color:var(--text-tertiary,#9199a6)">版本：</span>{{ detailItem.version }}</div>
          <div><span style="color:var(--text-tertiary,#9199a6)">状态：</span>{{ detailItem.statusText }}</div>
          <div><span style="color:var(--text-tertiary,#9199a6)">提交人：</span>{{ detailItem.owner }}</div>
          <div><span style="color:var(--text-tertiary,#9199a6)">更新时间：</span>{{ detailItem.updated }}</div>
          <div v-if="detailItem.reviewNote" style="grid-column:1/-1">
            <span style="color:var(--text-tertiary,#9199a6)">驳回备注：</span>{{ detailItem.reviewNote }}
          </div>
          <div style="grid-column:1/-1"><span style="color:var(--text-tertiary,#9199a6)">描述：</span>{{ detailItem.desc }}</div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, reactive } from 'vue'
import { useRouter } from 'vue-router'

const router = useRouter()

// 当前角色（演示：admin）
const role = ref('admin')

// 演示数据（来自原生 PM_SKILL_HUB_ITEMS）
const items = reactive([
  { name: 'workplace-cert-analysis', cnName: '职场认证数据分析', platform: 'lexiang', desc: '职场认证数据分析 Skill，支持认证方式分布、通过率趋势、失败原因和待审核积压分析。', version: 'v1.0.0', online: '未发布', status: 'rejected', statusText: '已驳回', category: '数据查询', tags: ['认证', '统计'], owner: 'admin', updated: '2026-06-10 14:20', reviewNote: '驳回：请补充业务边界、测试用例或审批材料后重新提交。' },
  { name: 'low-stock-auto-offline', cnName: '低库存自动下架', platform: 'lexiang', desc: '低库存自动下架 Skill，根据库存阈值和活动排除条件生成下架建议。', version: 'v0.3.0', online: '未发布', status: 'review', statusText: '待审批', category: '商品运营', tags: ['库存', '商品'], owner: 'admin', updated: '2026-06-10 11:36' },
  { name: 'product-knowledge', cnName: '产品知识问答', platform: 'lexiang', desc: '识别用户产品知识查询需求，返回配置参数、性能差异和可选机型说明。', version: 'v1.0.7', online: 'v1.0.7', status: 'published', statusText: '已发布', category: '知识问答', tags: ['查询', '商品'], owner: 'product-pm', updated: '2026-06-06 18:42' },
  { name: 'voucher-recommend', cnName: '券包权益推荐', platform: 'lexiang', desc: '识别虚拟品充值、会员充值和券包权益推荐需求，输出推荐卡片。', version: 'v0.1.3', online: 'v0.1.3', status: 'published', statusText: '已发布', category: '权益推荐', tags: ['权益', '推荐'], owner: 'growth-pm', updated: '2026-06-06 12:13' },
  { name: 'driver-download-guide', cnName: '驱动下载指导', platform: 'lexiang', desc: '联想驱动下载指导 Skill，支持驱动查询、版本差异对比和安装说明生成。', version: 'v1.0.0', online: '未发布', status: 'review', statusText: '待审批', category: '服务支持', tags: ['下载', '驱动'], owner: 'service-pm', updated: '2026-06-05 16:45' },
  { name: 'lenovo-order-detail-query', cnName: '订单明细查询', platform: 'lexiang,aiadmin', desc: '联想商城订单明细查询助手，支持自然语言查询订单状态和售后发货信息。', version: 'v1.0.0', online: '未发布', status: 'approved', statusText: '已审批', category: '订单服务', tags: ['订单'], owner: 'ops-pm', updated: '2026-06-02 17:15' },
  { name: 'weather-query', cnName: '实时天气查询', platform: 'lexiang', desc: '根据用户指定地点查询实时天气数据，支持默认城市和运营活动场景。', version: 'v1.0.0', online: '未发布', status: 'disabled', statusText: '已禁用', category: '工具服务', tags: ['工具'], owner: 'admin', updated: '2026-06-02 11:16' }
])

// 搜索/筛选状态
const searchText = ref('')
const filterStatus = ref('all')
const filterCategory = ref('all')
const appliedSearch = ref('')
const appliedStatus = ref('all')
const appliedCategory = ref('all')

const statusOptions = [
  { value: 'draft', label: '草稿' },
  { value: 'review', label: '待审批' },
  { value: 'approved', label: '已审批' },
  { value: 'published', label: '已发布' },
  { value: 'disabled', label: '已禁用' },
  { value: 'rejected', label: '已驳回' }
]

const categories = computed(() => [...new Set(items.map(i => i.category))])

// 统计
const ownCount = computed(() => items.filter(i => i.owner === 'admin').length)
const reviewCount = computed(() => items.filter(i => i.status === 'review').length)
const publishedCount = computed(() => items.filter(i => i.status === 'published').length)
const disabledCount = computed(() => items.filter(i => i.status === 'disabled').length)
const categoryCount = computed(() => new Set(items.map(i => i.category)).size)

// 过滤结果
const filteredItems = computed(() => {
  const q = appliedSearch.value.trim().toLowerCase()
  return items.filter(item => {
    if (appliedStatus.value !== 'all' && item.status !== appliedStatus.value) return false
    if (appliedCategory.value !== 'all' && item.category !== appliedCategory.value) return false
    if (q && !item.name.toLowerCase().includes(q) && !(item.cnName || '').toLowerCase().includes(q) && !item.desc.toLowerCase().includes(q)) return false
    return true
  })
})

function doSearch() {
  appliedSearch.value = searchText.value
  appliedStatus.value = filterStatus.value
  appliedCategory.value = filterCategory.value
}

// 操作按钮
const pmActions = {
  draft: ['提交审核', '编辑', '评估', '删除'],
  review: ['查看', '编辑', '撤回', '评估'],
  approved: ['发布', '编辑', '评估'],
  published: ['禁用', '编辑', '评估'],
  disabled: ['启用', '编辑', '评估'],
  rejected: ['被驳回去修改', '编辑', '评估']
}
const adminActions = {
  draft: ['查看', '编辑'],
  review: ['审批', '驳回', '查看', '评估'],
  approved: ['发布', '禁用', '查看'],
  published: ['禁用', '查看', '评估'],
  disabled: ['启用', '查看'],
  rejected: ['查看']
}

function getActions(item) {
  const base = (role.value === 'admin' ? adminActions : pmActions)[item.status] || ['查看']
  return [...base.filter(a => a !== '测试'), '测试']
}

function getActionTone(action) {
  if (action === '测试') return 'test'
  if (action === '删除' || action === '驳回') return 'danger'
  if (action === '审批' || action === '发布' || action === '启用') return 'success'
  if (action === '提交审核' || action === '被驳回去修改') return 'warning'
  return 'normal'
}

// 弹窗状态
const confirmDialog = reactive({ show: false, title: '', message: '', item: null, action: '' })
const detailItem = ref(null)

function handleAction(item, action) {
  if (action === '测试') {
    alert(`试调用 Skill：${item.name}`)
    return
  }
  if (action === '查看') {
    detailItem.value = item
    return
  }
  if (action === '编辑' || action === '被驳回去修改') {
    router.push('/agent/skillCreate')
    return
  }
  if (action === '评估') {
    alert(`开始评估 Skill：${item.name}`)
    return
  }
  if (action === '撤回' || action === '删除') {
    confirmDialog.title = `确认${action}`
    confirmDialog.message = `确认要${action} Skill「${item.cnName || item.name}」？`
    confirmDialog.item = item
    confirmDialog.action = action
    confirmDialog.show = true
    return
  }
  if (['发布', '启用', '禁用', '审批', '驳回', '提交审核'].includes(action)) {
    confirmDialog.title = `确认操作：${action}`
    confirmDialog.message = `确认要对「${item.cnName || item.name}」执行「${action}」操作？`
    confirmDialog.item = item
    confirmDialog.action = action
    confirmDialog.show = true
  }
}

const statusTransitions = {
  '发布': 'published',
  '启用': 'published',
  '禁用': 'disabled',
  '审批': 'approved',
  '驳回': 'rejected',
  '提交审核': 'review',
  '撤回': 'draft',
  '删除': null
}
const statusTexts = {
  published: '已发布',
  disabled: '已禁用',
  approved: '已审批',
  rejected: '已驳回',
  review: '待审批',
  draft: '草稿'
}

function doConfirmAction() {
  const { item, action } = confirmDialog
  if (!item) return
  const nextStatus = statusTransitions[action]
  if (nextStatus === null) {
    const idx = items.indexOf(item)
    if (idx !== -1) items.splice(idx, 1)
  } else if (nextStatus) {
    item.status = nextStatus
    item.statusText = statusTexts[nextStatus] || nextStatus
    item.updated = new Date().toISOString().replace('T', ' ').substring(0, 16)
  }
  confirmDialog.show = false
}
</script>

<style scoped>
.emp-detail-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.35);
  z-index: 1000;
  display: flex;
  align-items: center;
  justify-content: center;
}
.emp-detail-panel {
  background: var(--bg-primary, #fff);
  border-radius: 10px;
  width: min(640px, 92vw);
  max-height: 80vh;
  overflow-y: auto;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.18);
}
</style>

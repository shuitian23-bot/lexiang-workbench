<template>
  <div class="page-inner">
    <div class="page-header">
      <div>
        <div class="page-title">认证审核管理</div>
        <div class="page-desc">查看认证记录，对认证失败的用户可修改认证结果</div>
      </div>
    </div>

    <!-- 标签页 -->
    <div class="employee-cert-tabs">
      <button
        v-for="tab in tabs"
        :key="tab.status"
        class="tab-btn"
        :class="{ active: currentTab === tab.status }"
        @click="switchTab(tab.status)"
      >
        <span>{{ tab.label }}</span>
        <span class="tab-count" :class="tab.countClass">({{ tabCounts[tab.status] }})</span>
      </button>
    </div>

    <div class="card employee-cert-card">
      <!-- 搜索过滤区 -->
      <div class="employee-cert-filter">
        <div class="employee-cert-filter-grid">
          <input type="text" v-model="search.no" placeholder="搜索申请编号" />
          <input type="text" v-model="search.company" placeholder="企业名称..." />
          <input type="text" v-model="search.position" placeholder="岗位名称..." />
          <select v-model="search.method">
            <option value="">认证方式 - 全部</option>
            <option value="email">企业邮箱</option>
            <option value="contract">劳动合同</option>
            <option value="tax">个人所得税视频认证</option>
            <option value="other">其他材料</option>
          </select>
          <select v-model="search.source">
            <option value="">来源 - 全部</option>
            <option value="online">线上</option>
            <option value="offline">线下</option>
          </select>
          <button class="btn btn-primary" @click="doSearch">搜索</button>
        </div>
      </div>

      <!-- 认证列表表格 -->
      <div class="employee-table-wrap">
        <table class="employee-cert-table">
          <thead>
            <tr>
              <th class="check-col"><input type="checkbox" /></th>
              <th>申请编号</th>
              <th>用户</th>
              <th>认证方式</th>
              <th>企业名称</th>
              <th>认证时间</th>
              <th>状态</th>
              <th>操作</th>
            </tr>
          </thead>
          <tbody>
            <tr v-if="pagedData.length === 0">
              <td colspan="8" class="table-empty-cell">暂无数据</td>
            </tr>
            <tr
              v-for="cert in pagedData"
              :key="cert.id"
              class="employee-table-row"
              @click="showInlineDetail(cert)"
            >
              <td class="check-col"><input type="checkbox" @click.stop /></td>
              <td class="mono-cell">{{ cert.id }}</td>
              <td>{{ cert.applicant }}</td>
              <td>
                <span class="status-pill" :class="methodClass(cert.method)">
                  {{ methodLabel(cert.method) }}
                </span>
              </td>
              <td>{{ cert.company || '-' }}</td>
              <td>{{ cert.created_at }}</td>
              <td>
                <span class="status-pill" :class="statusClasses[cert.status] || 'muted'">
                  {{ statusLabels[cert.status] || '-' }}
                </span>
              </td>
              <td>
                <button
                  v-if="cert.status === 'rejected'"
                  class="btn btn-sm btn-primary"
                  @click.stop="openReviewPage(cert)"
                >修改状态</button>
                <button
                  v-else
                  class="btn btn-sm btn-secondary"
                  @click.stop="viewApplicant(cert)"
                >查看</button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- 分页 -->
      <div class="employee-pagination in-card">
        <div>
          共 <strong>{{ filteredData.length }}</strong> 条记录 | 第
          <strong>{{ currentPage }}</strong> 页 / 共
          <strong>{{ totalPages }}</strong> 页
        </div>
        <div class="pagination-actions">
          <button class="btn btn-sm btn-secondary" :disabled="currentPage <= 1" @click="goPage(currentPage - 1)">上一页</button>
          <span class="page-input-wrap">
            <input type="number" v-model.number="pageInput" min="1" style="width:50px;" />
          </span>
          <button class="btn btn-sm btn-secondary" @click="goToPage">跳转</button>
          <button class="btn btn-sm btn-secondary" :disabled="currentPage >= totalPages" @click="goPage(currentPage + 1)">下一页</button>
        </div>
      </div>
    </div>

    <!-- 审核详情面板 -->
    <div class="card employee-cert-detail-card">
      <div class="card-header">
        <span class="card-title">审核详情</span>
      </div>
      <div v-if="!selectedCert" class="employee-empty-detail">
        点击表格中的行查看详情
      </div>
      <div v-else style="padding:20px;">
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:20px;">
          <div>
            <div style="color:var(--text-secondary);font-size:12px;margin-bottom:4px;">申请编号</div>
            <div style="font-weight:600;">{{ selectedCert.id }}</div>
          </div>
          <div>
            <div style="color:var(--text-secondary);font-size:12px;margin-bottom:4px;">申请人</div>
            <div>{{ selectedCert.applicant }}</div>
          </div>
          <div>
            <div style="color:var(--text-secondary);font-size:12px;margin-bottom:4px;">认证方式</div>
            <div>{{ methodLabel(selectedCert.method) }}</div>
          </div>
          <div>
            <div style="color:var(--text-secondary);font-size:12px;margin-bottom:4px;">企业</div>
            <div>{{ selectedCert.company || '-' }}</div>
          </div>
        </div>
        <div style="border-top:1px solid var(--border);padding-top:16px;margin-bottom:20px;">
          <div style="color:var(--text-secondary);font-size:12px;margin-bottom:8px;">审核意见</div>
          <textarea v-model="detailRemark" style="width:100%;height:80px;padding:8px;border:1px solid var(--border);border-radius:4px;background:var(--card-bg);color:var(--text);font-size:12px;" placeholder="请输入审核意见"></textarea>
        </div>
        <div style="display:flex;gap:8px;">
          <button class="btn btn-primary" style="background:#22c55e;border:none;flex:1;" @click="approveSelected">✓ 批准</button>
          <button class="btn btn-secondary" style="background:#ef4444;border:none;flex:1;" @click="rejectSelected">✗ 拒绝</button>
        </div>
      </div>
    </div>

    <!-- 修改认证状态弹窗 -->
    <div v-if="reviewCert" class="emp-detail-overlay" @click.self="reviewCert = null">
      <div class="emp-detail-panel">
        <div class="card-header" style="padding:16px 20px;">
          <span class="card-title">修改认证结果</span>
          <button class="btn btn-sm btn-secondary" @click="reviewCert = null">关闭</button>
        </div>
        <div style="padding:16px 20px;">
          <div class="employee-alert warning" style="padding:10px;background:#fffbeb;border:1px solid #fcd34d;border-radius:6px;margin-bottom:16px;font-size:13px;">
            此操作将直接变更用户认证状态为「认证成功」，请确认已核实用户身份信息。
          </div>
          <div style="margin-bottom:12px;font-size:13px;">
            <div style="margin-bottom:4px;color:var(--text-secondary);">申请编号：{{ reviewCert.id }}</div>
            <div style="margin-bottom:4px;color:var(--text-secondary);">申请人：{{ reviewCert.applicant }}</div>
          </div>
          <div class="employee-form-group" style="margin-bottom:16px;">
            <label style="display:block;margin-bottom:6px;font-size:13px;">操作备注（必填）</label>
            <textarea v-model="reviewRemark" style="width:100%;height:80px;padding:8px;border:1px solid var(--border);border-radius:4px;background:var(--card-bg);color:var(--text);font-size:13px;" placeholder="请说明修改原因，如：用户重新提交了清晰的合同照片"></textarea>
          </div>
          <div style="display:flex;gap:8px;">
            <button class="btn btn-primary" @click="submitReview">变更为认证成功</button>
            <button class="btn btn-secondary" @click="reviewCert = null">取消</button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, computed } from 'vue'
import { useRouter } from 'vue-router'

const router = useRouter()

const tabs = [
  { status: 'rejected', label: '认证失败', countClass: 'danger' },
  { status: 'approved', label: '认证成功', countClass: 'success' },
  { status: 'pending', label: '待审核', countClass: 'primary' },
  { status: 'expired', label: '已失效', countClass: 'muted' }
]

const statusLabels = { approved: '认证成功', rejected: '认证失败', pending: '待审核', expired: '已失效' }
const statusClasses = { approved: 'success', rejected: 'danger', pending: 'warning', expired: 'muted' }

// ---- 演示数据 ----
const allCertifications = [
  { id: 'APP20260415001', applicant: '王五 (user005)', method: 'contract', created_at: '2026-04-15 14:30', status: 'rejected', company: '联想中国', position: '销售经理', fail_reason: 'OCR识别失败，合同信息模糊' },
  { id: 'APP20260414008', applicant: '赵六 (user006)', method: 'tax', created_at: '2026-04-14 09:15', status: 'rejected', company: '联想集团', position: '运营专员', fail_reason: '个税截图信息不完整' },
  { id: 'APP20260410001', applicant: '周八 (user007)', method: 'contract', created_at: '2026-04-10 11:00', status: 'rejected', company: '联想集团', position: '人力资源', fail_reason: '合同照片不清晰' },
  { id: 'APP20260412001', applicant: '张三 (user001)', method: 'email', created_at: '2026-04-12 08:00', status: 'approved', company: '联想集团', position: '产品经理' },
  { id: 'APP20260411002', applicant: '李四 (user002)', method: 'email', created_at: '2026-04-11 14:30', status: 'approved', company: '联想集团', position: '技术总监' },
  { id: 'APP20260409003', applicant: '孙七 (user003)', method: 'contract', created_at: '2026-04-09 10:00', status: 'approved', company: '联想研究院', position: '工程师' },
  { id: 'APP20250301001', applicant: '郑十 (user008)', method: 'email', created_at: '2025-03-01 10:20', status: 'expired', company: '联想集团', position: '市场专员' }
]

const tabCounts = computed(() => {
  const counts = { rejected: 0, approved: 0, pending: 0, expired: 0 }
  allCertifications.forEach(c => { if (counts[c.status] !== undefined) counts[c.status]++ })
  return counts
})

const currentTab = ref('rejected')
const currentPage = ref(1)
const pageInput = ref(1)
const pageSize = 10
const search = reactive({ no: '', company: '', position: '', method: '', source: '' })
const appliedSearch = reactive({ ...search })
const selectedCert = ref(null)
const detailRemark = ref('')
const reviewCert = ref(null)
const reviewRemark = ref('')

const filteredData = computed(() => {
  return allCertifications.filter(c => {
    if (c.status !== currentTab.value) return false
    if (appliedSearch.no && !c.id.includes(appliedSearch.no) && !c.applicant.includes(appliedSearch.no)) return false
    if (appliedSearch.method && c.method !== appliedSearch.method) return false
    return true
  })
})

const totalPages = computed(() => Math.max(1, Math.ceil(filteredData.value.length / pageSize)))

const pagedData = computed(() => {
  const start = (currentPage.value - 1) * pageSize
  return filteredData.value.slice(start, start + pageSize)
})

function switchTab(status) {
  currentTab.value = status
  currentPage.value = 1
  pageInput.value = 1
  selectedCert.value = null
}

function doSearch() {
  Object.assign(appliedSearch, search)
  currentPage.value = 1
  pageInput.value = 1
}

function goPage(page) {
  currentPage.value = Math.min(Math.max(1, page), totalPages.value)
  pageInput.value = currentPage.value
}

function goToPage() {
  goPage(pageInput.value)
}

function methodLabel(method) {
  const map = { email: '企业邮箱', contract: '劳动合同', tax: '个人所得税', other: '其他材料' }
  return map[method] || method
}

function methodClass(method) {
  if (method === 'tax') return 'purple'
  if (method === 'contract') return 'success'
  return 'primary'
}

function showInlineDetail(cert) {
  selectedCert.value = cert
  detailRemark.value = ''
}

function openReviewPage(cert) {
  reviewCert.value = cert
  reviewRemark.value = ''
}

function viewApplicant(cert) {
  // 跳到员工详情页，传 applicant 信息
  const name = cert.applicant.split('(')[0].trim()
  router.push({ path: '/employee/detail', query: { name } })
}

function submitReview() {
  if (!reviewRemark.value.trim()) { alert('请填写操作备注'); return }
  alert(`✓ 认证状态已变更为"认证成功"\n申请编号: ${reviewCert.value.id}\n操作备注: ${reviewRemark.value}`)
  reviewCert.value = null
}

function approveSelected() {
  if (!selectedCert.value) return
  alert('✓ 认证已批准')
  selectedCert.value = null
}

function rejectSelected() {
  if (!selectedCert.value) return
  alert('✗ 认证已拒绝')
  selectedCert.value = null
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
  width: min(560px, 92vw);
  max-height: 80vh;
  overflow-y: auto;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.18);
}
</style>

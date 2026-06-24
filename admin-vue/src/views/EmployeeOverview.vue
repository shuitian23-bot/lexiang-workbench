<template>
  <div class="page-inner">
    <!-- 页头 -->
    <div class="page-header">
      <div>
        <div class="page-title">在职员工管理</div>
        <div class="page-desc">查看和管理所有在职员工信息</div>
      </div>
    </div>

    <!-- KPI 卡片 -->
    <div class="kpi-grid employee-kpi-grid">
      <div class="kpi-card employee-kpi-card" @click="filterAndNavigate('all')">
        <div class="kpi-label">在职员工总数</div>
        <div class="kpi-value">{{ stats.total.toLocaleString() }}</div>
        <div class="kpi-sub"><span class="up">↑ 8%</span> 较上月</div>
      </div>
      <div class="kpi-card employee-kpi-card success" @click="filterAndNavigate('approved')">
        <div class="kpi-label">已认证工数</div>
        <div class="kpi-value">{{ stats.approved.toLocaleString() }}</div>
        <div class="kpi-sub">82.3% 认证率</div>
      </div>
      <div class="kpi-card employee-kpi-card warning" @click="filterAndNavigate('rejected')">
        <div class="kpi-label">已驳回工</div>
        <div class="kpi-value">{{ stats.rejected.toLocaleString() }}</div>
        <div class="kpi-sub">需重新认证</div>
      </div>
      <div class="kpi-card employee-kpi-card purple" @click="filterAndNavigate('pending')">
        <div class="kpi-label">本月新增</div>
        <div class="kpi-value">{{ stats.pending.toLocaleString() }}</div>
        <div class="kpi-sub"><span class="up">↑ 15%</span> 环比</div>
      </div>
    </div>

    <!-- 认证方式分布 -->
    <div class="card employee-method-card">
      <div class="card-header">
        <span class="card-title">认证方式分布</span>
        <span class="employee-method-hint">点击筛选下方员工列表</span>
      </div>
      <div class="employee-method-grid">
        <button
          type="button"
          class="employee-method-tile"
          :class="{ 'is-selected': currentMethod === 'email' }"
          :aria-pressed="currentMethod === 'email'"
          @click="filterByMethod('email')"
        >
          <div class="employee-method-value">{{ stats.methods.email.toLocaleString() }}</div>
          <div class="employee-method-label">企业邮箱</div>
          <div class="employee-method-sub">45%</div>
        </button>
        <button
          type="button"
          class="employee-method-tile success"
          :class="{ 'is-selected': currentMethod === 'contract' }"
          :aria-pressed="currentMethod === 'contract'"
          @click="filterByMethod('contract')"
        >
          <div class="employee-method-value">{{ stats.methods.contract.toLocaleString() }}</div>
          <div class="employee-method-label">劳动合同</div>
          <div class="employee-method-sub">30%</div>
        </button>
        <button
          type="button"
          class="employee-method-tile purple"
          :class="{ 'is-selected': currentMethod === 'tax' }"
          :aria-pressed="currentMethod === 'tax'"
          @click="filterByMethod('tax')"
        >
          <div class="employee-method-value">{{ stats.methods.tax.toLocaleString() }}</div>
          <div class="employee-method-label">个人所得税视频认证</div>
          <div class="employee-method-sub">18%</div>
        </button>
        <button
          type="button"
          class="employee-method-tile gray"
          :class="{ 'is-selected': currentMethod === 'other' }"
          :aria-pressed="currentMethod === 'other'"
          @click="filterByMethod('other')"
        >
          <div class="employee-method-value">{{ stats.methods.other.toLocaleString() }}</div>
          <div class="employee-method-label">其他材料</div>
          <div class="employee-method-sub">7%</div>
        </button>
      </div>
    </div>

    <!-- 员工列表 -->
    <div class="card">
      <div class="card-header">
        <span class="card-title">在职员工列表</span>
        <span
          v-if="currentMethod"
          class="employee-active-filter"
          style="display:inline-flex;align-items:center;gap:6px;"
        >
          当前筛选: <strong>{{ methodLabels[currentMethod] }}</strong>
          &nbsp;·&nbsp;{{ filteredData.length.toLocaleString() }} 条
          <button type="button" @click="clearMethodFilter" aria-label="清除认证方式筛选" style="margin-left:4px;">清除</button>
        </span>
        <div class="employee-filter-row">
          <input type="text" v-model="filter.name" placeholder="姓名..." />
          <input type="text" v-model="filter.position" placeholder="岗位信息..." />
          <input type="text" v-model="filter.company" placeholder="所属企业..." />
          <select v-model="filter.status">
            <option value="">全部状态</option>
            <option value="approved">认证成功</option>
            <option value="rejected">认证失败</option>
          </select>
          <input type="date" v-model="filter.dateStart" title="认证时间起" />
          <span class="filter-separator">至</span>
          <input type="date" v-model="filter.dateEnd" title="认证时间止" />
          <button class="btn btn-sm btn-secondary" @click="doSearch">搜索</button>
          <button class="btn btn-sm btn-primary" @click="exportCsv">导出</button>
        </div>
      </div>
      <div class="employee-table-wrap">
        <table class="employee-data-table">
          <thead>
            <tr>
              <th class="check-col"><input type="checkbox" /></th>
              <th>账号</th>
              <th>真实姓名</th>
              <th>LenovoID</th>
              <th>关联手机号</th>
              <th>岗位信息</th>
              <th>所属企业</th>
              <th>职员认证状态</th>
              <th>认证方式</th>
              <th>认证时间</th>
              <th>当前状态</th>
              <th>操作</th>
            </tr>
          </thead>
          <tbody>
            <tr v-if="pagedData.length === 0">
              <td colspan="12" class="table-empty-cell">暂无员工数据</td>
            </tr>
            <tr
              v-for="emp in pagedData"
              :key="emp.account"
              class="employee-table-row"
            >
              <td class="check-col"><input type="checkbox" /></td>
              <td class="mono-cell">{{ emp.account || '-' }}</td>
              <td>{{ emp.real_name || '-' }}</td>
              <td>{{ emp.lenovo_id || '-' }}</td>
              <td>{{ emp.phone || '-' }}</td>
              <td>{{ emp.position || '-' }}</td>
              <td>{{ emp.company || '-' }}</td>
              <td>
                <span class="status-pill primary">{{ emp.dept_status || '-' }}</span>
              </td>
              <td>{{ emp.material_method || '-' }}</td>
              <td>{{ emp.cert_time || '-' }}</td>
              <td>
                <span class="status-pill" :class="statusClass(emp.status)">
                  {{ emp.current_status || '-' }}
                </span>
              </td>
              <td>
                <button class="btn btn-sm btn-secondary" @click.stop="showDetail(emp.account)">查看详情</button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      <div class="employee-pagination">
        <div>
          共 <strong>{{ filteredData.length }}</strong> 条记录，当前第
          <strong>{{ currentPage }}</strong> 页，共
          <strong>{{ totalPages }}</strong> 页
        </div>
        <div class="pagination-actions">
          <button
            class="btn btn-sm btn-secondary"
            :disabled="currentPage <= 1"
            @click="goPage(currentPage - 1)"
          >上一页</button>
          <button
            class="btn btn-sm btn-secondary"
            :disabled="currentPage >= totalPages"
            @click="goPage(currentPage + 1)"
          >下一页</button>
        </div>
      </div>
    </div>

    <!-- 员工详情弹窗（简版） -->
    <div v-if="detailEmp" class="emp-detail-overlay" @click.self="detailEmp = null">
      <div class="emp-detail-panel">
        <div class="card-header" style="padding:16px 20px;">
          <span class="card-title">员工详情</span>
          <button class="btn btn-sm btn-secondary" @click="detailEmp = null">关闭</button>
        </div>
        <div style="padding:16px 20px;display:grid;grid-template-columns:1fr 1fr;gap:12px;font-size:13px;">
          <div><span style="color:var(--text-tertiary,#9199a6)">账号：</span>{{ detailEmp.account }}</div>
          <div><span style="color:var(--text-tertiary,#9199a6)">姓名：</span>{{ detailEmp.real_name }}</div>
          <div><span style="color:var(--text-tertiary,#9199a6)">LenovoID：</span>{{ detailEmp.lenovo_id }}</div>
          <div><span style="color:var(--text-tertiary,#9199a6)">手机：</span>{{ detailEmp.phone }}</div>
          <div><span style="color:var(--text-tertiary,#9199a6)">邮箱：</span>{{ detailEmp.email }}</div>
          <div><span style="color:var(--text-tertiary,#9199a6)">岗位：</span>{{ detailEmp.position }}</div>
          <div><span style="color:var(--text-tertiary,#9199a6)">企业：</span>{{ detailEmp.company }}</div>
          <div><span style="color:var(--text-tertiary,#9199a6)">认证方式：</span>{{ detailEmp.material_method }}</div>
          <div><span style="color:var(--text-tertiary,#9199a6)">认证时间：</span>{{ detailEmp.cert_time }}</div>
          <div><span style="color:var(--text-tertiary,#9199a6)">当前状态：</span>{{ detailEmp.current_status }}</div>
          <div><span style="color:var(--text-tertiary,#9199a6)">身份证号：</span>{{ detailEmp.id_no }}</div>
          <div><span style="color:var(--text-tertiary,#9199a6)">会员等级：</span>{{ detailEmp.member_level }}</div>
          <div><span style="color:var(--text-tertiary,#9199a6)">激活状态：</span>{{ detailEmp.activation_status }}</div>
          <div><span style="color:var(--text-tertiary,#9199a6)">注册时间：</span>{{ detailEmp.register_time }}</div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue'

// ---- 静态统计数（原生 loadEmployeeOverview 的演示值）----
const stats = {
  total: 2847,
  approved: 2341,
  rejected: 45,
  pending: 187,
  methods: { email: 1051, contract: 703, tax: 422, other: 165 }
}

const methodLabels = {
  email: '企业邮箱',
  contract: '劳动合同',
  tax: '个人所得税视频认证',
  other: '其他材料'
}

// ---- 演示数据（原生 generateEmployeeData 直接搬入）----
function generateEmployeeData() {
  const firstNames = ['张', '李', '王', '赵', '孙', '周', '吴', '郑', '何', '朱', '陈', '杨', '黄', '刘', '高', '林', '贾', '史', '徐', '唐']
  const lastNames = ['三', '四', '五', '六', '七', '八', '九', '十', '一', '二']
  const statuses = ['approved', 'approved', 'approved', 'pending', 'rejected']
  const methods = ['企业邮箱', '劳动合同', '个人所得税', '其他材料']
  const methodEnums = ['email', 'contract', 'tax', 'other']
  const positions = ['产品经理', '软件工程师', '市场专员', '销售经理', '运营专员', '人力资源', '财务分析师', '项目经理']
  const companies = ['联想（北京）有限公司', '联想集团', '联想中国', '联想研究院']
  const employees = []
  let accountNo = 1701000000
  const totalCount = 2361

  for (let i = 0; i < totalCount; i++) {
    const fname = firstNames[Math.floor(Math.random() * firstNames.length)]
    const lname = lastNames[Math.floor(Math.random() * lastNames.length)]
    const status = statuses[Math.floor(Math.random() * statuses.length)]
    const methodIdx = Math.floor(Math.random() * methods.length)
    const phone = String(13000000000 + Math.floor(Math.random() * 1000000000)).slice(0, 11)
    const certDate = new Date(2023 + Math.floor(Math.random() * 2), Math.floor(Math.random() * 12), Math.floor(Math.random() * 28) + 1)
    const idNo = '110101199' + String(Math.floor(Math.random() * 1000000000)).padStart(9, '0')
    const registerDate = new Date(2022, Math.floor(Math.random() * 12), Math.floor(Math.random() * 28) + 1)
    const birthday = new Date(1990 + Math.floor(Math.random() * 15), Math.floor(Math.random() * 12), Math.floor(Math.random() * 28) + 1)
    const company = companies[Math.floor(Math.random() * companies.length)]

    employees.push({
      account: String(accountNo++),
      real_name: fname + lname,
      id_no: idNo,
      lenovo_id: 'L' + String(Math.floor(Math.random() * 100000000)).padStart(8, '0'),
      phone,
      email: fname + lname.toLowerCase() + '@lenovo.com',
      is_realname: status === 'approved' ? '✓ 已认证' : '-',
      company,
      company_name: company,
      company_code: '911101015MA000000' + String(Math.floor(Math.random() * 100)).padStart(2, '0'),
      dept_status: '职员',
      position: positions[Math.floor(Math.random() * positions.length)],
      material_method: methods[methodIdx],
      material_method_enum: methodEnums[methodIdx],
      cert_time: certDate.toISOString().replace('T', ' ').substring(0, 16),
      current_status: status === 'approved' ? '✓ 已认证' : status === 'pending' ? '⏳ 待审核' : '✗ 已驳回',
      status,
      gender: Math.random() > 0.5 ? '男' : '女',
      birthday: birthday.toISOString().split('T')[0],
      address: '北京市' + ['朝阳区', '海淀区', '丰台区', '东城区', '西城区'][Math.floor(Math.random() * 5)],
      register_time: registerDate.toISOString().replace('T', ' ').substring(0, 19),
      user_type: '企业用户',
      member_level: ['白银会员', '黄金会员', '钻石会员'][Math.floor(Math.random() * 3)],
      activation_status: Math.random() > 0.2 ? '已激活' : '未激活',
      vip_status: Math.random() > 0.7 ? '是' : '否',
      cert_method: '企业邮箱',
      cert_start_date: certDate.toISOString().split('T')[0],
      cert_end_date: new Date(certDate.getTime() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      cert_materials: ['劳动合同', '在职证明'],
      cert_verified: status === 'approved' ? '已验证' : '未验证'
    })
  }
  return employees
}

// ---- 响应式状态 ----
const allEmployees = generateEmployeeData()   // 固定演示数据，无需 reactive
const currentMethod = ref(null)               // 认证方式筛选
const currentPage = ref(1)
const pageSize = 20
const detailEmp = ref(null)

const filter = reactive({
  name: '',
  position: '',
  company: '',
  status: '',
  dateStart: '',
  dateEnd: ''
})

// 应用的（已提交的）过滤条件，点"搜索"才更新
const appliedFilter = reactive({ ...filter })

// ---- 计算属性 ----
const filteredData = computed(() => {
  const { name, position, company, status, dateStart, dateEnd } = appliedFilter
  const nameTrim = name.trim()
  const posTrim = position.trim().toLowerCase()
  const compTrim = company.trim().toLowerCase()
  const method = currentMethod.value

  return allEmployees.filter(emp => {
    if (nameTrim && !(emp.real_name || '').includes(nameTrim)) return false
    if (posTrim && !(emp.position || '').toLowerCase().includes(posTrim)) return false
    if (compTrim && !(emp.company || '').toLowerCase().includes(compTrim)) return false
    if (status && emp.status !== status) return false
    if (dateStart && (emp.cert_time || '').substring(0, 10) < dateStart) return false
    if (dateEnd && (emp.cert_time || '').substring(0, 10) > dateEnd) return false
    if (method && emp.material_method_enum !== method) return false
    return true
  })
})

const totalPages = computed(() => Math.max(1, Math.ceil(filteredData.value.length / pageSize)))

const pagedData = computed(() => {
  const start = (currentPage.value - 1) * pageSize
  return filteredData.value.slice(start, start + pageSize)
})

// ---- 方法 ----
function statusClass(status) {
  if (status === 'approved') return 'success'
  if (status === 'pending') return 'warning'
  return 'danger'
}

function goPage(page) {
  currentPage.value = Math.min(Math.max(1, page), totalPages.value)
}

function doSearch() {
  Object.assign(appliedFilter, filter)
  currentPage.value = 1
}

function filterAndNavigate(status) {
  // KPI 卡片点击 → 重置其他条件，仅保留 status 筛选
  currentMethod.value = null
  filter.name = ''
  filter.position = ''
  filter.company = ''
  filter.status = status === 'all' ? '' : status
  filter.dateStart = ''
  filter.dateEnd = ''
  Object.assign(appliedFilter, filter)
  currentPage.value = 1
}

function filterByMethod(method) {
  currentMethod.value = currentMethod.value === method ? null : method
  currentPage.value = 1
}

function clearMethodFilter() {
  currentMethod.value = null
  currentPage.value = 1
}

function showDetail(account) {
  detailEmp.value = allEmployees.find(e => e.account === account) || null
}

function escapeEmployeeCsvValue(value) {
  const text = value == null ? '' : String(value)
  return `"${text.replace(/"/g, '""')}"`
}

function exportCsv() {
  const rows = filteredData.value
  if (!rows.length) {
    alert('当前筛选条件下暂无可导出的员工数据')
    return
  }
  const columns = [
    ['account', '账号'], ['real_name', '真实姓名'], ['lenovo_id', 'LenovoID'],
    ['phone', '关联手机号'], ['email', '邮箱'], ['position', '岗位信息'],
    ['company', '所属企业'], ['dept_status', '职员认证状态'],
    ['material_method', '认证方式'], ['cert_time', '认证时间'],
    ['current_status', '当前状态'], ['id_no', '身份证号'],
    ['company_code', '企业统一社会信用代码'], ['register_time', '注册时间'],
    ['member_level', '会员等级'], ['activation_status', '激活状态']
  ]
  const csv = [
    columns.map(([, title]) => escapeEmployeeCsvValue(title)).join(','),
    ...rows.map(row => columns.map(([key]) => escapeEmployeeCsvValue(row[key])).join(','))
  ].join('\n')

  const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `职场人群认证概览_${new Date().toISOString().slice(0, 10)}.csv`
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}
</script>

<style scoped>
/* 弹窗覆盖层 */
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

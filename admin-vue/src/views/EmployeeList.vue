<template>
  <div class="page-inner">
    <div class="page-header">
      <div>
        <div class="page-title">员工列表</div>
        <div class="page-desc">查看、搜索在职员工信息</div>
      </div>
      <button class="btn btn-primary" @click="exportCsv">📥 导出</button>
    </div>

    <div class="card">
      <div class="card-header">
        <span class="card-title">在职员工列表</span>
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
              @click="goDetail(emp.account)"
            >
              <td class="check-col"><input type="checkbox" @click.stop /></td>
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
                <button class="btn btn-sm btn-secondary" @click.stop="goDetail(emp.account)">查看详情</button>
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
  </div>
</template>

<script setup>
import { ref, reactive, computed } from 'vue'
import { useRouter } from 'vue-router'

const router = useRouter()

// ---- 演示数据（与 EmployeeOverview.vue 同源）----
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

  for (let i = 0; i < 2361; i++) {
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

const allEmployees = generateEmployeeData()
const currentPage = ref(1)
const pageSize = 20

const filter = reactive({ name: '', position: '', company: '', status: '', dateStart: '', dateEnd: '' })
const appliedFilter = reactive({ ...filter })

const filteredData = computed(() => {
  const { name, position, company, status, dateStart, dateEnd } = appliedFilter
  return allEmployees.filter(emp => {
    if (name.trim() && !(emp.real_name || '').includes(name.trim())) return false
    if (position.trim() && !(emp.position || '').toLowerCase().includes(position.trim().toLowerCase())) return false
    if (company.trim() && !(emp.company || '').toLowerCase().includes(company.trim().toLowerCase())) return false
    if (status && emp.status !== status) return false
    if (dateStart && (emp.cert_time || '').substring(0, 10) < dateStart) return false
    if (dateEnd && (emp.cert_time || '').substring(0, 10) > dateEnd) return false
    return true
  })
})

const totalPages = computed(() => Math.max(1, Math.ceil(filteredData.value.length / pageSize)))

const pagedData = computed(() => {
  const start = (currentPage.value - 1) * pageSize
  return filteredData.value.slice(start, start + pageSize)
})

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

function goDetail(account) {
  router.push({ path: '/employee/detail', query: { account } })
}

function escapeCsvValue(value) {
  const text = value == null ? '' : String(value)
  return `"${text.replace(/"/g, '""')}"`
}

function exportCsv() {
  const rows = filteredData.value
  if (!rows.length) { alert('当前筛选条件下暂无可导出的员工数据'); return }
  const columns = [
    ['account', '账号'], ['real_name', '真实姓名'], ['lenovo_id', 'LenovoID'],
    ['phone', '关联手机号'], ['email', '邮箱'], ['position', '岗位信息'],
    ['company', '所属企业'], ['dept_status', '职员认证状态'],
    ['material_method', '认证方式'], ['cert_time', '认证时间'],
    ['current_status', '当前状态'], ['register_time', '注册时间']
  ]
  const csv = [
    columns.map(([, t]) => escapeCsvValue(t)).join(','),
    ...rows.map(row => columns.map(([k]) => escapeCsvValue(row[k])).join(','))
  ].join('\n')
  const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `员工列表_${new Date().toISOString().slice(0, 10)}.csv`
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}
</script>

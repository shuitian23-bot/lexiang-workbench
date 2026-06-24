<template>
  <div class="page-inner">
    <div v-if="!emp" style="padding:40px;text-align:center;color:var(--text-secondary);">
      未找到员工数据
    </div>
    <div v-else style="padding:20px;">
      <button class="btn btn-secondary" style="margin-bottom:20px;" @click="router.push('/employee/overview')">← 返回列表</button>

      <div style="display:grid;grid-template-columns:280px 1fr;gap:30px;">
        <!-- 左侧用户卡片 -->
        <div style="display:flex;flex-direction:column;gap:16px;">
          <div class="card" style="text-align:center;padding:30px 20px;">
            <div style="width:120px;height:120px;border-radius:50%;background:linear-gradient(135deg,#3370ff,#06b6d4);color:#fff;font-size:48px;font-weight:700;display:flex;align-items:center;justify-content:center;margin:0 auto 16px;">
              {{ firstLetter }}
            </div>
            <div style="font-size:18px;font-weight:600;margin-bottom:4px;">{{ emp.real_name || '-' }}</div>
            <div style="font-size:12px;color:var(--text-secondary);margin-bottom:12px;">账号: {{ accountMasked }}</div>
            <div style="font-size:12px;color:var(--text-secondary);margin-bottom:16px;">LenovoID: {{ emp.lenovo_id || '-' }}</div>
            <div style="font-size:12px;color:var(--text-secondary);margin-bottom:16px;">联想账号</div>
            <div style="display:flex;gap:8px;justify-content:center;flex-wrap:wrap;">
              <span style="display:inline-block;padding:4px 8px;background:#34c72408;color:#34c724;border-radius:3px;font-size:12px;">✓ 已实名</span>
              <span style="display:inline-block;padding:4px 8px;background:#3370ff08;color:#3370ff;border-radius:3px;font-size:12px;">{{ emp.dept_status || '-' }}</span>
            </div>
          </div>
        </div>

        <!-- 右侧信息区域 -->
        <div style="display:flex;flex-direction:column;gap:20px;">
          <!-- 个人基本信息 -->
          <div class="card">
            <div class="card-header">
              <span class="card-title">个人基本信息</span>
            </div>
            <div style="padding:20px;">
              <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;">
                <div>
                  <div style="color:var(--text-secondary);font-size:12px;margin-bottom:8px;">真实姓名</div>
                  <div style="font-size:14px;">{{ emp.real_name || '-' }}</div>
                </div>
                <div>
                  <div style="color:var(--text-secondary);font-size:12px;margin-bottom:8px;">岗位</div>
                  <div style="font-size:14px;">{{ emp.position || '-' }}</div>
                </div>
                <div>
                  <div style="color:var(--text-secondary);font-size:12px;margin-bottom:8px;">关联手机号</div>
                  <div style="font-size:14px;">{{ emp.phone || '-' }}</div>
                </div>
                <div>
                  <div style="color:var(--text-secondary);font-size:12px;margin-bottom:8px;">注册时间</div>
                  <div style="font-size:14px;">{{ emp.register_time || '-' }}</div>
                </div>
                <div>
                  <div style="color:var(--text-secondary);font-size:12px;margin-bottom:8px;">用户类型</div>
                  <div style="font-size:14px;">{{ emp.user_type || '-' }}</div>
                </div>
              </div>
            </div>
          </div>

          <!-- 会员信息 -->
          <div class="card">
            <div class="card-header">
              <span class="card-title">会员信息</span>
            </div>
            <div style="padding:20px;">
              <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;">
                <div>
                  <div style="color:var(--text-secondary);font-size:12px;margin-bottom:8px;">成为企业会员时间</div>
                  <div style="font-size:14px;">{{ (emp.register_time || '').split(' ')[0] || '-' }}</div>
                </div>
                <div>
                  <div style="color:var(--text-secondary);font-size:12px;margin-bottom:8px;">会员等级</div>
                  <div style="font-size:14px;">
                    <span style="display:inline-block;padding:2px 6px;background:#3370ff08;color:#3370ff;border-radius:3px;font-size:12px;">{{ emp.member_level || '-' }}</span>
                  </div>
                </div>
                <div>
                  <div style="color:var(--text-secondary);font-size:12px;margin-bottom:8px;">企业等级</div>
                  <div style="font-size:14px;">
                    <span style="display:inline-block;padding:2px 6px;background:#f5a62408;color:#f5a624;border-radius:3px;font-size:12px;">黄金会员</span>
                  </div>
                </div>
                <div>
                  <div style="color:var(--text-secondary);font-size:12px;margin-bottom:8px;">激活状态</div>
                  <div style="font-size:14px;">
                    <span style="display:inline-block;padding:2px 6px;background:#34c72408;color:#34c724;border-radius:3px;font-size:12px;">{{ emp.activation_status || '-' }}</span>
                  </div>
                </div>
                <div>
                  <div style="color:var(--text-secondary);font-size:12px;margin-bottom:8px;">黑金VIP</div>
                  <div style="font-size:14px;">{{ emp.vip_status || '-' }}</div>
                </div>
                <div>
                  <div style="color:var(--text-secondary);font-size:12px;margin-bottom:8px;">注册渠道</div>
                  <div style="font-size:14px;">LENOVO_SHOP_PC</div>
                </div>
              </div>
            </div>
          </div>

          <!-- 企业信息 -->
          <div class="card">
            <div class="card-header">
              <span class="card-title">企业信息</span>
            </div>
            <div style="padding:20px;">
              <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;">
                <div>
                  <div style="color:var(--text-secondary);font-size:12px;margin-bottom:8px;">所属企业</div>
                  <div style="font-size:14px;">{{ emp.company_name || '-' }}</div>
                </div>
                <div>
                  <div style="color:var(--text-secondary);font-size:12px;margin-bottom:8px;">企业号</div>
                  <div style="font-size:14px;">{{ emp.company_code || '-' }}</div>
                </div>
                <div style="grid-column:1/-1;">
                  <div style="color:var(--text-secondary);font-size:12px;margin-bottom:8px;">企业邮箱</div>
                  <div style="font-size:14px;">{{ emp.email || '-' }}</div>
                </div>
              </div>
            </div>
          </div>

          <!-- 职员认证信息 -->
          <div class="card">
            <div class="card-header">
              <span class="card-title">职员认证信息</span>
            </div>
            <div style="padding:20px;">
              <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:20px;">
                <div>
                  <div style="color:var(--text-secondary);font-size:12px;margin-bottom:8px;">职员认证状态</div>
                  <div style="font-size:14px;">
                    <span style="display:inline-block;padding:4px 8px;background:#3370ff08;color:#3370ff;border-radius:3px;font-size:12px;">{{ emp.dept_status || '-' }}</span>
                  </div>
                </div>
                <div>
                  <div style="color:var(--text-secondary);font-size:12px;margin-bottom:8px;">职员认证方式</div>
                  <div style="font-size:14px;">{{ emp.cert_method || '-' }}</div>
                </div>
                <div>
                  <div style="color:var(--text-secondary);font-size:12px;margin-bottom:8px;">认证职员信息时间</div>
                  <div style="font-size:14px;">{{ emp.cert_start_date || '-' }}</div>
                </div>
                <div>
                  <div style="color:var(--text-secondary);font-size:12px;margin-bottom:8px;">认证失效时间</div>
                  <div style="font-size:14px;">{{ emp.cert_end_date || '-' }}</div>
                </div>
              </div>
              <div style="border-top:1px solid var(--border);padding-top:16px;">
                <div style="color:var(--text-secondary);font-size:12px;margin-bottom:12px;">企业邮箱验证记录</div>
                <div style="display:flex;flex-direction:column;gap:8px;font-size:12px;">
                  <div>✓ 邮箱: {{ emp.email || '-' }}</div>
                  <div>✓ 验证状态: {{ emp.cert_verified || '-' }}</div>
                  <div>✓ 验证时间: {{ emp.cert_start_date || '-' }}</div>
                </div>
              </div>
            </div>
          </div>

          <!-- 认证材料 -->
          <div class="card">
            <div class="card-header">
              <span class="card-title">认证材料</span>
            </div>
            <div style="padding:20px;">
              <div style="color:var(--text-secondary);font-size:12px;margin-bottom:12px;">上传的认证材料</div>
              <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:12px;">
                <div
                  class="material-tile"
                  @click="alert('预览：劳动合同')"
                >📄 劳动合同</div>
                <div
                  class="material-tile"
                  @click="alert('预览：在职证明')"
                >📄 在职证明</div>
              </div>
              <div style="color:var(--text-secondary);font-size:12px;margin-top:12px;">点击图围可查看大图</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { useRouter, useRoute } from 'vue-router'

const router = useRouter()
const route = useRoute()

// ---- 演示数据（与 EmployeeList.vue 同源）----
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

const emp = computed(() => {
  const account = route.query.account
  const name = route.query.name
  if (account) return allEmployees.find(e => e.account === account) || null
  if (name) return allEmployees.find(e => e.real_name === name) || null
  return null
})

const firstLetter = computed(() => (emp.value?.real_name || '-').charAt(0).toUpperCase())

const accountMasked = computed(() => {
  const a = emp.value?.account
  if (!a) return '-'
  return a.slice(0, 2) + '*'.repeat(4) + a.slice(-2)
})
</script>

<style scoped>
.material-tile {
  aspect-ratio: 1;
  background: var(--border);
  border-radius: 6px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--text-secondary);
  font-size: 12px;
  cursor: pointer;
  transition: background 0.2s;
}
.material-tile:hover {
  background: #d1d5db;
}
</style>

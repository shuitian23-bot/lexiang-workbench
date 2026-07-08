<template>
  <div class="permission-page-vue">
    <div class="page-header permission-page-header">
      <div>
        <div class="page-title">权限管理</div>
        <div class="page-desc">按原型链路整理权限申请、审批、角色、用户、组织、数据源、功能和删除备份能力，供 POC 演示真实串联。</div>
      </div>
      <div class="hero-actions">
        <button type="button" class="ghost-btn" @click="resetDemo">重置演示</button>
        <button type="button" class="primary-btn" @click="openRecordModal">查看记录</button>
      </div>
    </div>

    <div class="permission-layout">
      <aside class="permission-module-rail" aria-label="权限管理菜单">
        <button
          v-for="item in modules"
          :key="item.key"
          type="button"
          :class="{ active: activeModule === item.key }"
          @click="activeModule = item.key"
        >
          <span class="permission-module-icon" v-html="moduleIcon(item.key)"></span>
          <b>{{ item.label }}</b>
          <small>{{ item.desc }}</small>
        </button>
      </aside>

      <main class="permission-workspace">
        <section v-if="activeModule === 'apply'" class="permission-card flow-card">
          <div class="section-title">
            <div>
              <h2>权限申请</h2>
              <p>从申请类型开始，自动带出关联确认、审批人和执行路径。</p>
            </div>
            <span class="status-pill">POC 链路</span>
          </div>

          <div class="permission-stage-tabs">
            <button
              v-for="(step, index) in applySteps"
              :key="step.key"
              type="button"
              :class="{ active: currentStep === index }"
              @click="currentStep = index"
            >
              {{ step.label }}
            </button>
          </div>

          <div v-if="currentStep === 0" class="permission-step">
            <h3>选择申请类型</h3>
            <p>不同类型会自动匹配关联人确认和审批路径。</p>
            <div class="permission-type-grid">
              <button
                v-for="type in requestTypes"
                :key="type.key"
                type="button"
                :class="{ active: form.type === type.key }"
                @click="selectRequestType(type.key)"
              >
                <span>{{ type.no }}</span>
                <b>{{ type.label }}</b>
                <em>{{ type.summary }}</em>
                <small>{{ type.route }}</small>
              </button>
            </div>
          </div>

          <div v-else-if="currentStep === 1" class="permission-step">
            <h3>填写信息</h3>
            <p>申请人和直线经理由当前登录信息带出，不允许修改。</p>
            <div class="permission-form-grid">
              <label>
                <span>申请人</span>
                <input v-model="form.applicant" readonly>
              </label>
              <label>
                <span>ITCode</span>
                <input v-model="form.itcode" readonly>
              </label>
              <label>
                <span>被申请人</span>
                <input v-model="form.targetUser" placeholder="输入员工 ITCode 或姓名">
              </label>
              <label>
                <span>手机号</span>
                <input v-model="form.mobile" placeholder="用于账号开通或关联确认">
              </label>
              <label>
                <span>邮箱</span>
                <input v-model="form.email" placeholder="name@lenovo.com">
              </label>
              <label>
                <span>直线经理</span>
                <input v-model="form.manager" readonly>
              </label>
              <label class="full">
                <span>申请原因 / 需求描述</span>
                <textarea v-model="form.reason" rows="4" placeholder="请描述业务场景、需要开通的权限、使用周期和影响范围。"></textarea>
              </label>
              <label>
                <span>业务审批人</span>
                <select v-model="form.businessApprover">
                  <option disabled value="">请选择业务审批人</option>
                  <option v-for="item in businessApprovers" :key="item" :value="item">{{ item }}</option>
                </select>
              </label>
              <label>
                <span>系统审批人</span>
                <input v-model="form.systemApprover" readonly>
              </label>
            </div>
          </div>

          <div v-else-if="currentStep === 2" class="permission-step">
            <h3>权限范围</h3>
            <p>选择需要申请的菜单、功能、数据、Skill 或账号能力，支持多选。</p>
            <div class="permission-scope-grid">
              <article v-for="group in scopeGroups" :key="group.key">
                <div class="scope-head">
                  <b>{{ group.label }}</b>
                  <small>{{ checkedCount(group.key) }} 项已选</small>
                </div>
                <label v-for="option in group.options" :key="option" class="check-row">
                  <input type="checkbox" :value="option" v-model="form.scopes[group.key]">
                  <span>{{ option }}</span>
                </label>
              </article>
            </div>
          </div>

          <div v-else-if="currentStep === 3" class="permission-step">
            <h3>关联确认</h3>
            <p>按原型补齐组织、角色、数据范围和关联人确认，避免只提交孤立表单。</p>
            <div class="relation-grid">
              <article v-for="relation in relationCards" :key="relation.key">
                <span>{{ relation.icon }}</span>
                <b>{{ relation.label }}</b>
                <p>{{ relation.value }}</p>
                <button type="button" class="ghost-btn small" @click="openPicker(relation)">选择</button>
              </article>
            </div>
            <div class="confirm-box">
              <b>关联确认结论</b>
              <p>{{ confirmationText }}</p>
            </div>
          </div>

          <div v-else class="permission-step">
            <h3>审批执行</h3>
            <p>提交后进入审批列表，审批通过后由后台自动执行。</p>
            <div class="approval-route">
              <div v-for="node in approvalNodes" :key="node.label" :class="{ done: node.done }">
                <span>{{ node.step }}</span>
                <b>{{ node.label }}</b>
                <small>{{ node.owner }}</small>
              </div>
            </div>
            <div class="execute-summary">
              <b>将提交的申请</b>
              <p>{{ selectedType.label }} · {{ form.targetUser || '待补充被申请人' }} · {{ totalScopeCount }} 项权限范围</p>
            </div>
          </div>

          <div class="flow-actions">
            <button type="button" class="ghost-btn" :disabled="currentStep === 0" @click="prevStep">上一步</button>
            <button v-if="currentStep < applySteps.length - 1" type="button" class="primary-btn" @click="nextStep">下一步</button>
            <button v-else type="button" class="primary-btn" @click="submitApplication">提交申请</button>
          </div>
        </section>

        <section v-else-if="activeModule === 'approval'" class="permission-card">
          <div class="section-title">
            <div>
              <h2>审批列表</h2>
              <p>处理待我审批、已通过、已驳回和后台执行状态。</p>
            </div>
            <div class="segmented">
              <button
                v-for="filter in approvalFilters"
                :key="filter"
                type="button"
                :class="{ active: approvalFilter === filter }"
                @click="approvalFilter = filter"
              >{{ filter }}</button>
            </div>
          </div>
          <div class="permission-table-wrap">
            <table class="permission-table">
              <thead>
                <tr>
                  <th>单号</th>
                  <th>申请类型</th>
                  <th>申请人</th>
                  <th>被申请人</th>
                  <th>当前节点</th>
                  <th>状态</th>
                  <th>更新时间</th>
                  <th>操作</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="row in filteredApprovals" :key="row.id">
                  <td>{{ row.id }}</td>
                  <td>{{ row.type }}</td>
                  <td>{{ row.applicant }}</td>
                  <td>{{ row.target }}</td>
                  <td>{{ row.node }}</td>
                  <td><span class="table-status" :class="row.statusKey">{{ row.status }}</span></td>
                  <td>{{ row.time }}</td>
                  <td>
                    <button type="button" class="link-btn" @click="openApprovalDetail(row)">查看</button>
                    <button v-if="row.statusKey === 'pending'" type="button" class="link-btn success" @click="approve(row)">通过</button>
                    <button v-if="row.statusKey === 'pending'" type="button" class="link-btn danger" @click="reject(row)">驳回</button>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        <section v-else-if="activeModule === 'roles'" class="permission-card">
          <div class="section-title">
            <div>
              <h2>角色管理</h2>
              <p>管理角色、菜单范围、数据范围和成员数量。</p>
            </div>
            <button type="button" class="primary-btn" @click="openEntityModal('新增角色', roleTemplate)">新增角色</button>
          </div>
          <div class="permission-grid-list">
            <article v-for="role in roles" :key="role.name">
              <span>{{ role.code }}</span>
              <h3>{{ role.name }}</h3>
              <p>{{ role.desc }}</p>
              <div class="meta-row">
                <b>{{ role.users }} 人</b>
                <small>{{ role.scope }}</small>
              </div>
              <button type="button" class="ghost-btn small" @click="openEntityModal('角色详情', role)">查看配置</button>
            </article>
          </div>
        </section>

        <section v-else-if="activeModule === 'users'" class="permission-card">
          <div class="section-title">
            <div>
              <h2>用户管理</h2>
              <p>查看用户账号、角色、数据权限、历史变更和登录记录。</p>
            </div>
            <button type="button" class="primary-btn" @click="openEntityModal('新增用户', userTemplate)">新增用户</button>
          </div>
          <div class="permission-table-wrap">
            <table class="permission-table">
              <thead>
                <tr>
                  <th>ITCode</th>
                  <th>姓名</th>
                  <th>部门</th>
                  <th>角色</th>
                  <th>状态</th>
                  <th>最近登录</th>
                  <th>操作</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="user in users" :key="user.itcode">
                  <td>{{ user.itcode }}</td>
                  <td>{{ user.name }}</td>
                  <td>{{ user.dept }}</td>
                  <td>{{ user.role }}</td>
                  <td><span class="table-status" :class="user.statusKey">{{ user.status }}</span></td>
                  <td>{{ user.lastLogin }}</td>
                  <td>
                    <button type="button" class="link-btn" @click="openEntityModal('用户详情', user)">详情</button>
                    <button type="button" class="link-btn" @click="openPicker({ key: 'role', label: '分配角色' })">分配角色</button>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        <section v-else class="permission-card">
          <div class="section-title">
            <div>
              <h2>{{ currentModule.label }}</h2>
              <p>{{ currentModule.fullDesc }}</p>
            </div>
            <button type="button" class="primary-btn" @click="openEntityModal(`新增${currentModule.label}`, genericTemplate)">新增</button>
          </div>
          <div class="permission-grid-list compact">
            <article v-for="item in currentModule.items" :key="item.name">
              <span>{{ item.code }}</span>
              <h3>{{ item.name }}</h3>
              <p>{{ item.desc }}</p>
              <div class="meta-row">
                <b>{{ item.status }}</b>
                <small>{{ item.owner }}</small>
              </div>
              <button type="button" class="ghost-btn small" @click="openEntityModal(`${currentModule.label}详情`, item)">查看</button>
            </article>
          </div>
        </section>
      </main>
    </div>

    <div v-if="picker.visible" class="permission-modal" @click.self="closePicker">
      <div class="modal-panel small">
        <button type="button" class="modal-close" @click="closePicker">×</button>
        <h3>{{ picker.title }}</h3>
        <p>选择后会回写到当前申请的关联确认环节。</p>
        <div class="picker-list">
          <button v-for="item in picker.options" :key="item" type="button" @click="choosePicker(item)">
            {{ item }}
          </button>
        </div>
      </div>
    </div>

    <div v-if="detailModal.visible" class="permission-modal" @click.self="closeDetailModal">
      <div class="modal-panel">
        <button type="button" class="modal-close" @click="closeDetailModal">×</button>
        <h3>{{ detailModal.title }}</h3>
        <dl class="detail-list">
          <template v-for="(value, key) in detailModal.data" :key="key">
            <dt>{{ key }}</dt>
            <dd>{{ value }}</dd>
          </template>
        </dl>
      </div>
    </div>

    <div v-if="recordModalVisible" class="permission-modal" @click.self="recordModalVisible = false">
      <div class="modal-panel">
        <button type="button" class="modal-close" @click="recordModalVisible = false">×</button>
        <h3>权限管理 POC 记录</h3>
        <p class="modal-note">仅用于 POC 记录，按功能点归纳，不作为正式审计依据。</p>
        <div class="record-list">
          <article v-for="record in records" :key="record.time + record.title">
            <time>{{ record.time }}</time>
            <b>{{ record.title }}</b>
            <p>{{ record.detail }}</p>
            <span>{{ record.status }}</span>
          </article>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, onMounted, reactive, ref } from 'vue'

const modules = [
  { key: 'apply', label: '权限申请', icon: 'AP', desc: '申请链路', fullDesc: '按类型发起权限变更、创建账号、启用账号、禁用账号和重置密码。' },
  { key: 'approval', label: '审批列表', icon: 'OK', desc: '待办处理', fullDesc: '集中处理直线经理、业务审批人和系统审批人的待办。' },
  { key: 'roles', label: '角色管理', icon: 'RL', desc: '角色范围', fullDesc: '维护角色、菜单范围、数据范围和成员绑定。' },
  { key: 'users', label: '用户管理', icon: 'US', desc: '账号与角色', fullDesc: '查看用户账号、角色、权限范围、登录记录和历史变更。' },
  {
    key: 'orgs',
    label: '组织管理',
    icon: 'OR',
    desc: '组织架构',
    fullDesc: '维护组织架构、组织描述和成员关系。',
    items: [
      { code: 'L1', name: '联想乐享', desc: '联想门户工作台业务根组织。', status: '启用', owner: 'admin' },
      { code: 'OP', name: '乐享运营', desc: '运营看板、活动和商品配置团队。', status: '启用', owner: 'sunll1' },
      { code: 'GEO', name: 'GEO 看板', desc: '搜索与信源监测团队。', status: '启用', owner: 'zhangjq4' }
    ]
  },
  {
    key: 'datasource',
    label: '数据源管理',
    icon: 'DB',
    desc: '数据权限',
    fullDesc: '维护普通和自定义数据权限，支持字段级范围配置。',
    items: [
      { code: 'DS', name: '运营数据集', desc: 'GMV、流量、转化、Query 等指标。', status: '可用', owner: '数据平台' },
      { code: 'MEM', name: '会员标签库', desc: '会员分层、权益使用和画像标签。', status: '可用', owner: '会员中心' },
      { code: 'GEO', name: 'GEO 信源库', desc: '官方、社区和引用信源。', status: '校验中', owner: '搜索后台' }
    ]
  },
  {
    key: 'functions',
    label: '功能管理',
    icon: 'FN',
    desc: '菜单功能',
    fullDesc: '维护菜单权限、功能点和按钮级能力。',
    items: [
      { code: 'MENU', name: '联想门户工作台', desc: '工作台首页、固定页签和 Agent 入口。', status: '启用', owner: '平台组' },
      { code: 'SKILL', name: 'Skill Hub', desc: 'Skill 创建、评估、审批、发布和测试。', status: '启用', owner: 'AI 平台' },
      { code: 'LEAD', name: '企业客户管理', desc: '线索看板、线索池、打分模型。', status: '启用', owner: '企业客户组' }
    ]
  },
  {
    key: 'backup',
    label: '删除备份',
    icon: 'BK',
    desc: '恢复记录',
    fullDesc: '查看删除备份、恢复功能和删除前确认链路。',
    items: [
      { code: 'BK1', name: '角色配置备份', desc: '保留最近 30 天角色范围变更。', status: '可恢复', owner: '系统' },
      { code: 'BK2', name: '用户权限备份', desc: '保留禁用和删除前权限快照。', status: '可恢复', owner: '系统' },
      { code: 'BK3', name: '数据范围备份', desc: '保留字段级数据范围配置。', status: '可恢复', owner: '系统' }
    ]
  }
]

const activeModule = ref('apply')
const currentStep = ref(0)
const recordModalVisible = ref(false)
const approvalFilter = ref('全部')

const applySteps = [
  { key: 'type', label: '1. 选择类型' },
  { key: 'info', label: '2. 填写信息' },
  { key: 'scope', label: '3. 权限范围' },
  { key: 'relation', label: '4. 关联确认' },
  { key: 'approve', label: '5. 审批执行' }
]

const requestTypes = [
  { key: 'change', no: '01', label: '权限变更', summary: '已有账号新增或调整菜单、功能、数据和 Skill 权限。', route: '直线经理 + 业务审批 + 系统审批' },
  { key: 'create', no: '02', label: '创建账号', summary: '为新员工或外部协作人员创建工作台账号。', route: '关联人确认 + 直线经理 + 业务审批' },
  { key: 'enable', no: '03', label: '启用账号', summary: '恢复已停用账号的登录和业务操作能力。', route: '直线经理 + 系统审批' },
  { key: 'disable', no: '04', label: '禁用账号', summary: '关闭账号登录、导出、发布和后台操作权限。', route: '关联人确认 + 系统审批' },
  { key: 'reset', no: '05', label: '重置密码', summary: '为本人或他人发起账号密码重置流程。', route: '关联人确认 + 直线经理' }
]

const form = reactive({
  type: 'change',
  applicant: 'admin',
  itcode: 'admin',
  targetUser: 'zhangrui32',
  mobile: '13800000000',
  email: 'zhangrui32@lenovo.com',
  manager: 'sunll1',
  businessApprover: 'zhangjq4（消费业务 to C）',
  systemApprover: 'sunzh4',
  reason: '需要联动运营看板、商品管理和 Skill Hub 进行日常数据查询、报告生成和配置确认。',
  relation: {
    contact: '关联人 C 已确认',
    org: '乐享运营',
    role: '运营分析 PM',
    data: '运营数据集 / 华东区',
    skill: '经营指标解读、内容发布检查'
  },
  scopes: {
    menu: ['联想门户工作台', '乐享运营'],
    function: ['报告生成', '数据导出'],
    data: ['运营数据集'],
    skill: ['经营指标解读'],
    account: []
  }
})

const businessApprovers = [
  'zhangjq4（消费业务 to C）',
  'huangjq5（商用业务 to B/b）',
  'zhangxy43（to C 相关）',
  'zhangrui32（to B/b 相关）'
]

const scopeGroups = [
  { key: 'menu', label: '菜单权限', options: ['联想门户工作台', '乐享运营', 'GEO 看板', '企业客户管理', '搜索后台'] },
  { key: 'function', label: '功能权限', options: ['报告生成', '数据导出', '商品配置', '发布确认', '审批处理'] },
  { key: 'data', label: '数据权限', options: ['运营数据集', '会员标签库', 'GEO 信源库', '企业客户线索', '风控数据'] },
  { key: 'skill', label: 'Skill 权限', options: ['经营指标解读', '商品配置助手', '内容发布检查', '会员分层洞察', '链接巡检'] },
  { key: 'account', label: '账号能力', options: ['登录工作台', '启用账号', '禁用账号', '重置密码', '删除备份恢复'] }
]

const relationCards = computed(() => [
  { key: 'contact', label: '关联人确认', icon: 'C', value: form.relation.contact },
  { key: 'org', label: '组织', icon: 'O', value: form.relation.org },
  { key: 'role', label: '角色', icon: 'R', value: form.relation.role },
  { key: 'data', label: '数据范围', icon: 'D', value: form.relation.data },
  { key: 'skill', label: 'Skill 范围', icon: 'S', value: form.relation.skill }
])

const pickerOptions = {
  contact: ['关联人 A 已确认', '关联人 B 已确认', '关联人 C 已确认'],
  org: ['乐享运营', 'GEO 看板', '企业客户管理', '搜索后台'],
  role: ['运营分析 PM', '商品运营', '数据分析师', '客服运营'],
  data: ['运营数据集 / 全国', '运营数据集 / 华东区', 'GEO 信源库 / 只读', '会员标签库 / 脱敏'],
  skill: ['经营指标解读、内容发布检查', '商品配置助手、链接巡检', '会员分层洞察、认证失败导出']
}

const picker = reactive({
  visible: false,
  key: '',
  title: '',
  options: []
})

const detailModal = reactive({
  visible: false,
  title: '',
  data: {}
})

const approvalFilters = ['全部', '待我审批', '已通过', '已驳回', '执行完成']
const approvals = ref([
  { id: 'AP-20260703-001', type: '权限变更', applicant: 'admin', target: 'zhangrui32', node: '业务审批人', status: '待我审批', statusKey: 'pending', time: '2026-07-03 10:32' },
  { id: 'AP-20260702-006', type: '创建账号', applicant: 'sunll1', target: 'liwen08', node: '后台执行', status: '执行完成', statusKey: 'done', time: '2026-07-02 17:18' },
  { id: 'AP-20260702-003', type: '禁用账号', applicant: 'huangjq5', target: 'temp-bpo', node: '系统审批人', status: '已通过', statusKey: 'approved', time: '2026-07-02 15:44' },
  { id: 'AP-20260701-009', type: '重置密码', applicant: 'zhangxy43', target: 'wangxt8', node: '申请人修改', status: '已驳回', statusKey: 'rejected', time: '2026-07-01 19:12' }
])

const roles = [
  { code: 'PM', name: '运营 PM', desc: '可创建 Skill、发起审批、查看运营数据和报告。', users: 12, scope: '菜单 + 数据 + Skill' },
  { code: 'OP', name: '商品运营', desc: '可配置商品、推荐位、价格和上下架策略。', users: 26, scope: '商品中心 + 配置' },
  { code: 'QA', name: '质量巡检', desc: '可检查发布风险、链接、CMS 内容和质量规则。', users: 8, scope: '巡检 + 只读数据' },
  { code: 'BPO', name: '外包协作', desc: '受限菜单和脱敏数据，仅保留必要操作。', users: 34, scope: '最小化授权' }
]

const users = [
  { itcode: 'zhangrui32', name: '张睿', dept: '乐享运营', role: '运营 PM', status: '启用', statusKey: 'done', lastLogin: '2026-07-03 10:22' },
  { itcode: 'sunll1', name: '孙立', dept: '平台运营', role: '业务审批人', status: '启用', statusKey: 'done', lastLogin: '2026-07-03 09:18' },
  { itcode: 'huangjq5', name: '黄佳琪', dept: '商用业务', role: '商品运营', status: '启用', statusKey: 'done', lastLogin: '2026-07-02 18:02' },
  { itcode: 'temp-bpo', name: '外部协作', dept: 'BPO', role: '外包协作', status: '已禁用', statusKey: 'rejected', lastLogin: '2026-06-28 11:09' }
]

const records = ref([
  {
    time: '2026-07-03 11:45',
    title: '权限管理 Vue 源码链路补全',
    detail: '按墨刀原型将权限申请、审批列表、角色管理、用户管理、组织管理、数据源管理、功能管理和删除备份串成可操作 POC，并恢复账号入口跳转。',
    status: '源码已更新'
  },
  {
    time: '2026-07-02 18:10',
    title: '0702 UI 样式规范覆盖',
    detail: '在 Vue 架构内保留现有新增功能，仅对重合页面做样式覆盖和设计规范收敛。',
    status: '已更新 new 预览'
  }
])

const roleTemplate = { name: '新角色', desc: '配置菜单、数据和 Skill 权限。', scope: '待配置' }
const userTemplate = { name: '新用户', desc: '创建账号并分配角色。', scope: '待配置' }
const genericTemplate = { name: '新增项', desc: '根据当前模块补充配置。', status: '草稿' }

const selectedType = computed(() => requestTypes.find((type) => type.key === form.type) || requestTypes[0])
const currentModule = computed(() => modules.find((item) => item.key === activeModule.value) || modules[0])
const totalScopeCount = computed(() => Object.values(form.scopes).reduce((sum, list) => sum + list.length, 0))
const confirmationText = computed(() => `${form.relation.contact}，组织为 ${form.relation.org}，角色为 ${form.relation.role}，数据范围为 ${form.relation.data}。`)
const approvalNodes = computed(() => [
  { step: '1', label: '申请人提交', owner: form.applicant, done: true },
  { step: '2', label: '关联人确认', owner: form.relation.contact, done: ['create', 'disable', 'reset'].includes(form.type) },
  { step: '3', label: '直线经理审批', owner: form.manager, done: false },
  { step: '4', label: '业务审批', owner: form.businessApprover || '待选择', done: false },
  { step: '5', label: '系统审批 / 后台执行', owner: form.systemApprover, done: false }
])
const filteredApprovals = computed(() => {
  if (approvalFilter.value === '全部') return approvals.value
  return approvals.value.filter((row) => row.status === approvalFilter.value)
})

function selectRequestType(key) {
  form.type = key
  if (key === 'create') {
    form.scopes.account = ['登录工作台']
  } else if (key === 'disable') {
    form.scopes.account = ['禁用账号']
  } else if (key === 'reset') {
    form.scopes.account = ['重置密码']
  }
}

function checkedCount(key) {
  return form.scopes[key]?.length || 0
}

function nextStep() {
  currentStep.value = Math.min(currentStep.value + 1, applySteps.length - 1)
}

function prevStep() {
  currentStep.value = Math.max(currentStep.value - 1, 0)
}

function submitApplication() {
  approvals.value.unshift({
    id: `AP-20260703-${String(approvals.value.length + 11).padStart(3, '0')}`,
    type: selectedType.value.label,
    applicant: form.applicant,
    target: form.targetUser || '待补充',
    node: '直线经理',
    status: '待我审批',
    statusKey: 'pending',
    time: '2026-07-03 11:45'
  })
  records.value.unshift({
    time: '2026-07-03 11:45',
    title: `${selectedType.value.label}申请已提交`,
    detail: `${form.targetUser || '目标用户'} 的 ${totalScopeCount.value} 项权限范围已进入审批列表。`,
    status: 'POC 记录'
  })
  activeModule.value = 'approval'
  currentStep.value = 0
}

function approve(row) {
  row.status = '已通过'
  row.statusKey = 'approved'
  row.node = '后台执行'
  row.time = '2026-07-03 11:46'
}

function reject(row) {
  row.status = '已驳回'
  row.statusKey = 'rejected'
  row.node = '申请人修改'
  row.time = '2026-07-03 11:46'
}

function openApprovalDetail(row) {
  openEntityModal('审批详情', row)
}

function openPicker(relation) {
  picker.visible = true
  picker.key = relation.key
  picker.title = relation.label || relation.key
  picker.options = pickerOptions[relation.key] || ['运营 PM', '商品运营', '数据分析师', '外包协作']
}

function choosePicker(item) {
  if (picker.key in form.relation) {
    form.relation[picker.key] = item
  }
  closePicker()
}

function closePicker() {
  picker.visible = false
}

function openEntityModal(title, data) {
  detailModal.visible = true
  detailModal.title = title
  detailModal.data = { ...data }
}

function closeDetailModal() {
  detailModal.visible = false
}

function openRecordModal() {
  recordModalVisible.value = true
}

function resetDemo() {
  activeModule.value = 'apply'
  currentStep.value = 0
  approvalFilter.value = '全部'
}

function moduleIcon(key) {
  const icons = {
    apply: '<svg viewBox="0 0 20 20" aria-hidden="true"><path d="M5 4h7l3 3v9H5z"></path><path d="M12 4v3h3"></path><path d="M7.5 10h5"></path><path d="M7.5 13h4"></path></svg>',
    approval: '<svg viewBox="0 0 20 20" aria-hidden="true"><path d="M10 3.5 16 6v4.2c0 3-2 5.2-6 6.3-4-1.1-6-3.3-6-6.3V6z"></path><path d="m7.3 10.2 1.8 1.8 3.8-4"></path></svg>',
    roles: '<svg viewBox="0 0 20 20" aria-hidden="true"><path d="M7.5 9.2a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z"></path><path d="M2.8 16.5a4.8 4.8 0 0 1 9.4 0"></path><path d="M13.6 5.2a2.5 2.5 0 1 1 0 5"></path><path d="M14.4 12.1a4.2 4.2 0 0 1 2.8 4.4"></path></svg>',
    users: '<svg viewBox="0 0 20 20" aria-hidden="true"><path d="M10 9.5a3.4 3.4 0 1 0 0-6.8 3.4 3.4 0 0 0 0 6.8Z"></path><path d="M4.2 17.3a5.8 5.8 0 0 1 11.6 0"></path></svg>',
    orgs: '<svg viewBox="0 0 20 20" aria-hidden="true"><path d="M10 3.2v4"></path><path d="M5 10.2h10"></path><path d="M5 10.2v3"></path><path d="M15 10.2v3"></path><rect x="7.2" y="7.2" width="5.6" height="4" rx="1"></rect><rect x="2.8" y="13.2" width="4.4" height="3.6" rx="1"></rect><rect x="12.8" y="13.2" width="4.4" height="3.6" rx="1"></rect></svg>',
    datasource: '<svg viewBox="0 0 20 20" aria-hidden="true"><ellipse cx="10" cy="5" rx="5.5" ry="2.4"></ellipse><path d="M4.5 5v5c0 1.3 2.5 2.4 5.5 2.4s5.5-1.1 5.5-2.4V5"></path><path d="M4.5 10v5c0 1.3 2.5 2.4 5.5 2.4s5.5-1.1 5.5-2.4v-5"></path></svg>',
    functions: '<svg viewBox="0 0 20 20" aria-hidden="true"><rect x="3" y="3.5" width="5.5" height="5.5" rx="1.2"></rect><rect x="11.5" y="3.5" width="5.5" height="5.5" rx="1.2"></rect><rect x="3" y="12" width="5.5" height="5.5" rx="1.2"></rect><path d="M13.5 14.8h3"></path><path d="M15 13.3v3"></path></svg>',
    backup: '<svg viewBox="0 0 20 20" aria-hidden="true"><path d="M5 6.2h10"></path><path d="M8 3.8h4"></path><path d="M6.2 6.2 7 16.5h6l.8-10.3"></path><path d="M8.5 9v5"></path><path d="M11.5 9v5"></path></svg>'
  }
  return icons[key] || icons.apply
}

onMounted(() => {
  document.title = '权限管理 - 乐享 AI 工作台'
})
</script>

<style scoped>
.permission-page-vue {
  display: flex;
  flex-direction: column;
  gap: 18px;
  min-height: 100%;
  width: 100%;
  max-width: none;
  min-width: 0;
  padding: 0;
  color: #111827;
}

.permission-page-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
}

.section-title h2,
.permission-step h3 {
  margin: 0;
  letter-spacing: 0;
}

.section-title h2 {
  color: #172033;
  font-size: 16px;
  font-weight: 700;
  line-height: 1.35;
}

.permission-step h3 {
  color: #172033;
  font-size: 14px;
  font-weight: 700;
  line-height: 1.45;
}

.section-title p,
.permission-step p,
.modal-panel p {
  margin: 6px 0 0;
  color: #6b778c;
  font-size: 12px;
  line-height: 1.6;
}

.hero-actions,
.flow-actions,
.section-title {
  display: flex;
  align-items: center;
  gap: 12px;
}

.section-title {
  flex: 0 0 auto;
  justify-content: space-between;
  margin-bottom: 18px;
}

.permission-layout {
  display: grid;
  grid-template-columns: clamp(220px, 26%, 300px) minmax(0, 1fr);
  gap: 18px;
  align-items: stretch;
  min-width: 0;
  height: calc(100vh - 168px);
  min-height: 620px;
  max-height: calc(100vh - 168px);
  overflow: hidden;
}

.permission-workspace {
  min-width: 0;
  min-height: 0;
  height: 100%;
  display: flex;
  flex-direction: column;
}

.permission-module-rail {
  position: relative;
  display: grid;
  grid-auto-rows: max-content;
  gap: 8px;
  height: 100%;
  width: 100%;
  min-height: 0;
  min-width: 0;
  padding: 14px;
  overflow-y: auto;
  overscroll-behavior: contain;
  align-self: stretch;
  border: 1px solid #dfe7f3;
  border-radius: 12px;
  background: #fff;
  box-shadow: 0 1px 2px rgba(15, 23, 42, 0.04);
}

.permission-module-rail button {
  display: grid;
  grid-template-columns: 38px 1fr;
  gap: 2px 10px;
  align-items: center;
  width: 100%;
  min-height: 56px;
  padding: 10px 12px;
  border: 1px solid #dfe7f3;
  border-radius: 8px;
  background: #fff;
  color: #455468;
  text-align: left;
  cursor: pointer;
  box-shadow: none;
  transition: border-color 0.18s ease, box-shadow 0.18s ease, background 0.18s ease;
}

.permission-module-icon {
  grid-row: span 2;
  display: grid;
  place-items: center;
  width: 32px;
  height: 32px;
  border-radius: 8px;
  color: #316dff;
  background: #edf3ff;
  font-size: 12px;
  font-weight: 800;
}

.permission-module-icon :deep(svg) {
  width: 17px;
  height: 17px;
  fill: none;
  stroke: currentColor;
  stroke-width: 1.8;
  stroke-linecap: round;
  stroke-linejoin: round;
}

.permission-module-rail button b {
  color: #172033;
  font-size: 13px;
  line-height: 1.35;
}

.permission-module-rail button small {
  color: #8a96a8;
  font-size: 12px;
  line-height: 1.35;
}

.permission-module-rail button.active {
  border-color: #8cb2ff;
  background: #eef5ff;
  color: #316dff;
  box-shadow: inset 3px 0 0 #316dff;
}

.permission-module-rail button:hover {
  border-color: rgba(49, 109, 255, 0.36);
  box-shadow: 0 6px 14px rgba(15, 23, 42, 0.05);
}

.permission-card {
  height: 100%;
  min-height: 0;
  min-width: 0;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  border: 1px solid #dfe7f3;
  border-radius: 12px;
  padding: 18px;
  background: #fff;
  box-shadow: 0 1px 2px rgba(15, 23, 42, 0.04);
}

.flow-card {
  overflow: hidden;
  background: #fff;
}

.flow-card .section-title,
.flow-card .permission-stage-tabs {
  flex: 0 0 auto;
}

.status-pill,
.table-status,
.scope-head small {
  display: inline-flex;
  align-items: center;
  border-radius: 999px;
  padding: 5px 10px;
  background: #eef4ff;
  color: #316dff;
  font-size: 12px;
  font-weight: 700;
  line-height: 1;
}

.permission-stage-tabs {
  display: flex;
  align-items: center;
  gap: 6px;
  flex: 0 0 auto;
  width: 100%;
  padding: 4px;
  margin-bottom: 20px;
  border: 1px solid #dfe7f3;
  border-radius: 10px;
  background: #fff;
  overflow-x: auto;
  scrollbar-width: none;
}

.permission-stage-tabs::-webkit-scrollbar {
  display: none;
}

.permission-stage-tabs button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 118px;
  min-height: 36px;
  border: 0;
  border-radius: 8px;
  padding: 0 16px;
  background: transparent;
  color: #667085;
  font-size: 13px;
  font-weight: 700;
  line-height: 1;
  text-align: center;
  white-space: nowrap;
  cursor: pointer;
}

.permission-stage-tabs button.active {
  background: #316dff;
  color: #fff;
}

.permission-step {
  flex: 1 1 auto;
  min-height: 0;
  overflow-y: auto;
  overscroll-behavior: contain;
  padding-right: 4px;
  scrollbar-width: thin;
  scrollbar-color: rgba(31, 35, 41, 0.14) transparent;
}

.permission-step::-webkit-scrollbar,
.permission-module-rail::-webkit-scrollbar,
.permission-table-wrap::-webkit-scrollbar {
  width: 6px;
  height: 6px;
}

.permission-step::-webkit-scrollbar-thumb,
.permission-module-rail::-webkit-scrollbar-thumb,
.permission-table-wrap::-webkit-scrollbar-thumb {
  background: rgba(31, 35, 41, 0.14);
  border-radius: 999px;
}

.permission-type-grid,
.permission-scope-grid,
.permission-grid-list {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 14px;
  margin-top: 18px;
}

.permission-type-grid button,
.permission-scope-grid article,
.permission-grid-list article,
.relation-grid article {
  min-width: 0;
  border: 1px solid #dfe7f3;
  border-radius: 8px;
  background: #fff;
  box-shadow: none;
}

.permission-type-grid button {
  min-height: 168px;
  padding: 16px;
  text-align: left;
  cursor: pointer;
  transition: border-color 0.18s ease, box-shadow 0.18s ease, background 0.18s ease;
}

.permission-type-grid button span,
.permission-grid-list article span,
.relation-grid article span {
  display: grid;
  place-items: center;
  width: 36px;
  height: 36px;
  border-radius: 8px;
  background: #edf3ff;
  color: #316dff;
  font-size: 12px;
  font-weight: 800;
}

.permission-type-grid button b,
.permission-grid-list h3,
.relation-grid b {
  display: block;
  margin-top: 12px;
  color: #111827;
  font-size: 14px;
  line-height: 1.45;
  overflow-wrap: anywhere;
}

.permission-type-grid button em,
.permission-type-grid button small,
.permission-grid-list p,
.relation-grid p,
.confirm-box p {
  display: block;
  margin-top: 8px;
  color: #6b778c;
  font-size: 12px;
  font-style: normal;
  line-height: 1.55;
  overflow-wrap: anywhere;
}

.permission-type-grid button.active {
  border-color: #8cb2ff;
  background: linear-gradient(135deg, #fff 0%, #f7faff 100%);
  box-shadow: 0 0 0 2px rgba(49, 109, 255, 0.12);
}

.permission-type-grid button:hover,
.permission-scope-grid article:hover,
.permission-grid-list article:hover,
.relation-grid article:hover {
  border-color: rgba(49, 109, 255, 0.32);
  box-shadow: 0 6px 14px rgba(15, 23, 42, 0.05);
}

.permission-form-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 14px;
  margin-top: 18px;
}

.permission-form-grid label {
  display: grid;
  gap: 8px;
  color: #667085;
  font-size: 12px;
  font-weight: 600;
}

.permission-form-grid .full {
  grid-column: 1 / -1;
}

.permission-form-grid input,
.permission-form-grid select,
.permission-form-grid textarea {
  width: 100%;
  box-sizing: border-box;
  min-width: 0;
  border: 1px solid #d8e1ee;
  border-radius: 8px;
  padding: 11px 12px;
  background: #fff;
  color: #172033;
  font: inherit;
  font-size: 13px;
}

.permission-form-grid input[readonly] {
  background: #f3f6fa;
  color: #6b778c;
}

.scope-head,
.meta-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
}

.permission-scope-grid article {
  padding: 16px;
}

.check-row {
  display: flex;
  align-items: center;
  gap: 8px;
  min-height: 32px;
  color: #455468;
  font-size: 13px;
}

.check-row input {
  width: 16px;
  height: 16px;
  accent-color: #316dff;
}

.relation-grid {
  display: grid;
  grid-template-columns: repeat(5, minmax(0, 1fr));
  gap: 12px;
  margin-top: 18px;
}

.relation-grid article {
  padding: 14px;
}

.confirm-box,
.execute-summary {
  margin-top: 16px;
  border: 1px solid #bcd3ff;
  border-radius: 8px;
  padding: 14px;
  background: #f7fbff;
}

.confirm-box b,
.execute-summary b {
  color: #172033;
  font-size: 13px;
  line-height: 1.45;
}

.approval-route {
  display: grid;
  grid-template-columns: repeat(5, minmax(0, 1fr));
  gap: 12px;
  margin-top: 18px;
}

.approval-route div {
  position: relative;
  border: 1px solid #dfe7f3;
  border-radius: 8px;
  padding: 14px;
  background: #fff;
}

.approval-route span {
  display: grid;
  place-items: center;
  width: 26px;
  height: 26px;
  border-radius: 999px;
  background: #edf3ff;
  color: #316dff;
  font-size: 12px;
  font-weight: 800;
}

.approval-route b {
  display: block;
  margin-top: 10px;
  color: #172033;
  font-size: 13px;
  line-height: 1.45;
}

.approval-route small {
  display: block;
  margin-top: 6px;
  color: #7a8798;
  font-size: 12px;
  line-height: 1.4;
}

.approval-route .done {
  border-color: #93e1ad;
  background: #f2fff6;
}

.flow-actions {
  flex: 0 0 auto;
  justify-content: flex-end;
  margin-top: 10px;
  border-top: 1px solid #e6edf5;
  padding-top: 10px;
  min-height: 56px;
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.88), #fff 30%);
}

.primary-btn,
.ghost-btn {
  min-height: 36px;
  border-radius: 8px;
  padding: 0 16px;
  font-size: 13px;
  font-weight: 700;
  cursor: pointer;
}

.primary-btn {
  border: 1px solid #316dff;
  color: #fff;
  background: #316dff;
}

.ghost-btn {
  border: 1px solid #d8e1ee;
  color: #455468;
  background: #fff;
}

.ghost-btn.small {
  min-height: 30px;
  padding: 0 12px;
  font-size: 12px;
}

.ghost-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.segmented {
  display: inline-flex;
  gap: 4px;
  border: 1px solid #dfe7f3;
  border-radius: 8px;
  padding: 4px;
  background: #f8fafc;
}

.segmented button {
  border: 0;
  border-radius: 6px;
  padding: 7px 10px;
  background: transparent;
  color: #667085;
  font-size: 12px;
  cursor: pointer;
}

.segmented button.active {
  background: #316dff;
  color: #fff;
}

.permission-table-wrap {
  flex: 1 1 auto;
  min-height: 0;
  overflow-x: auto;
  overflow-y: auto;
}

.permission-table {
  width: 100%;
  border-collapse: collapse;
  min-width: 860px;
}

.permission-table th,
.permission-table td {
  border-bottom: 1px solid #e6edf5;
  padding: 12px;
  font-size: 13px;
  line-height: 1.45;
  text-align: left;
}

.permission-table th {
  color: #8a96a8;
  background: #f8fafc;
  font-weight: 700;
}

.table-status.done,
.table-status.approved {
  background: #eafaf0;
  color: #18a058;
}

.table-status.pending {
  background: #fff4df;
  color: #d97706;
}

.table-status.rejected {
  background: #fff1f1;
  color: #e53935;
}

.link-btn {
  border: 0;
  background: transparent;
  color: #316dff;
  font-weight: 700;
  cursor: pointer;
}

.link-btn.success {
  color: #18a058;
}

.link-btn.danger {
  color: #e53935;
}

.permission-grid-list article {
  padding: 18px;
}

.permission-grid-list.compact {
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

.permission-modal {
  position: fixed;
  inset: 0;
  z-index: 1200;
  display: grid;
  place-items: center;
  padding: 24px;
  background: rgba(17, 24, 39, 0.25);
  backdrop-filter: blur(8px);
}

.modal-panel {
  position: relative;
  width: min(680px, 100%);
  max-height: min(720px, calc(100vh - 48px));
  overflow: auto;
  border: 1px solid #dfe7f3;
  border-radius: 8px;
  background: #fff;
  padding: 24px;
  box-shadow: 0 24px 70px rgba(15, 23, 42, 0.18);
}

.modal-panel.small {
  width: min(460px, 100%);
}

.modal-close {
  position: absolute;
  top: 14px;
  right: 14px;
  width: 34px;
  height: 34px;
  border: 1px solid #d8e1ee;
  border-radius: 8px;
  background: #fff;
  color: #667085;
  font-size: 20px;
  cursor: pointer;
}

.picker-list {
  display: grid;
  gap: 8px;
  margin-top: 16px;
}

.picker-list button {
  border: 1px solid #dfe7f3;
  border-radius: 8px;
  padding: 12px;
  text-align: left;
  background: #f8fafc;
  color: #172033;
  cursor: pointer;
}

.detail-list {
  display: grid;
  grid-template-columns: 140px 1fr;
  gap: 10px;
}

.detail-list dt {
  color: #8a96a8;
}

.detail-list dd {
  margin: 0;
  color: #172033;
}

.modal-note {
  color: #8a96a8;
}

.record-list {
  display: grid;
  gap: 10px;
  margin-top: 16px;
}

.record-list article {
  display: grid;
  grid-template-columns: 150px 1fr auto;
  gap: 8px 12px;
  border: 1px solid #e6edf5;
  border-radius: 8px;
  padding: 14px;
  background: #f8fafc;
}

.record-list time {
  color: #8a96a8;
}

.record-list p {
  grid-column: 2 / -1;
  margin: 0;
  color: #5b6678;
}

.record-list span {
  color: #316dff;
  font-weight: 700;
}

@media (max-height: 820px) {
  .permission-layout {
    height: calc(100vh - 148px);
    min-height: 520px;
    max-height: calc(100vh - 148px);
  }
}

@media (max-width: 1500px) {
  .permission-layout {
    grid-template-columns: clamp(220px, 26%, 280px) minmax(0, 1fr);
  }

  .permission-type-grid,
  .permission-scope-grid,
  .permission-grid-list,
  .relation-grid,
  .approval-route {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 1180px) {
  .section-title {
    align-items: flex-start;
    flex-direction: column;
  }

  .permission-layout {
    grid-template-columns: minmax(0, 1fr);
    overflow: hidden;
  }

  .permission-module-rail {
    height: auto;
    max-height: none;
    min-height: 0;
    overflow-y: auto;
  }
}

@media (max-width: 760px) {
  .permission-form-grid,
  .permission-type-grid,
  .permission-scope-grid,
  .permission-grid-list,
  .permission-grid-list.compact,
  .relation-grid,
  .approval-route {
    grid-template-columns: 1fr;
  }

  .record-list article,
  .detail-list {
    grid-template-columns: 1fr;
  }

  .record-list p {
    grid-column: auto;
  }
}
</style>

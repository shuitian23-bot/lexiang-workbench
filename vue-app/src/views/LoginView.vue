<template>
  <!-- 原 #login-screen，class/结构/样式一字不改 -->
  <div id="login-screen">
    <div class="login-card">
      <div class="login-logo" style="margin-bottom:40px;">
        <div class="icon">L</div>
        <span>联想乐享</span>
      </div>
      <div class="login-title">登录</div>
      <div class="form-group">
        <label class="form-label">用户名</label>
        <input
          class="form-input"
          v-model="username"
          placeholder="admin"
          autofocus
          @keydown.enter="doLogin"
        />
      </div>
      <div class="form-group">
        <label class="form-label">密码</label>
        <input
          class="form-input"
          v-model="password"
          type="password"
          placeholder="••••••"
          @keydown.enter="doLogin"
        />
      </div>
      <!-- 原 #login-error：有错误时才显示，保留原来的 display:block 效果 -->
      <div
        class="login-error"
        :style="{ display: errorMsg ? 'block' : '' }"
      >{{ errorMsg }}</div>
      <button class="btn btn-primary login-btn" @click="doLogin">登录工作台</button>
      <div class="login-register-entry">
        <span>还没有工作台账号？</span>
        <button type="button" class="login-register-btn" @click="openRegisterModal">创建账户/注册</button>
      </div>
    </div>

    <div v-if="registerModalVisible" class="register-modal-layer" @click.self="closeRegisterModal">
      <div class="register-modal-panel" role="dialog" aria-modal="true" aria-labelledby="register-modal-title">
        <button type="button" class="register-modal-close" aria-label="关闭" @click="closeRegisterModal">×</button>
        <div class="register-modal-head">
          <div>
            <h2 id="register-modal-title">创建账户/注册</h2>
            <p>无账号用户可先提交账号创建申请，审批通过后开通门户工作台和初始权限。</p>
          </div>
          <span>{{ registerSubmitted ? '已提交' : '免登录申请' }}</span>
        </div>

        <div class="register-steps" aria-label="创建账号申请步骤">
          <button
            v-for="(step, index) in registerSteps"
            :key="step.key"
            type="button"
            :class="{ active: registerStep === index, locked: index > maxRegisterStep }"
            :disabled="index > maxRegisterStep || registerSubmitted"
            @click="goRegisterStep(index)"
          >{{ step.label }}</button>
        </div>

        <div v-if="currentRegisterStepKey === 'info'" class="register-step-body">
          <h3>填写信息</h3>
          <p>请填写申请人和待创建账号人员信息，审批人会基于这些信息确认开通对象。</p>
          <div class="register-form-grid">
            <label>
              <span>人员类型 <em>必填</em></span>
              <select v-model="registerForm.personType">
                <option value="internal">内部人员</option>
                <option value="external">外部人员</option>
              </select>
            </label>
            <label>
              <span>申请人 <em>必填</em></span>
              <input v-model.trim="registerForm.applicant" :class="{ invalid: registerErrors.applicant }" placeholder="请输入申请人姓名" @blur="validateRegisterInfo">
              <small v-if="registerErrors.applicant">{{ registerErrors.applicant }}</small>
            </label>
            <label>
              <span>申请人 ITCode <em>必填</em></span>
              <input v-model.trim="registerForm.applicantItcode" :class="{ invalid: registerErrors.applicantItcode }" placeholder="请输入申请人 ITCode" @blur="validateRegisterInfo">
              <small v-if="registerErrors.applicantItcode">{{ registerErrors.applicantItcode }}</small>
            </label>
            <label>
              <span>待创建账号人员 <em>必填</em></span>
              <input v-model.trim="registerForm.targetUser" :class="{ invalid: registerErrors.targetUser }" placeholder="请输入姓名或 ITCode" @blur="validateRegisterInfo">
              <small v-if="registerErrors.targetUser">{{ registerErrors.targetUser }}</small>
            </label>
            <label>
              <span>手机号</span>
              <input v-model.trim="registerForm.mobile" placeholder="用于审批沟通或账号开通">
            </label>
            <label>
              <span>邮箱</span>
              <input v-model.trim="registerForm.email" placeholder="name@lenovo.com">
            </label>
            <label>
              <span>申请人直线经理</span>
              <input v-model.trim="registerForm.applicantManager" placeholder="请输入经理 ITCode 或姓名">
            </label>
            <label>
              <span>被申请人直线经理</span>
              <input v-model.trim="registerForm.targetManager" placeholder="请输入经理 ITCode 或姓名">
            </label>
            <label class="full" v-if="registerForm.personType === 'external'">
              <span>关联账号 / 关联人员 <em>必填</em></span>
              <input v-model.trim="registerForm.relatedAccount" :class="{ invalid: registerErrors.relatedAccount }" placeholder="请输入负责对接的内部员工 ITCode 或姓名" @blur="validateRegisterInfo">
              <small v-if="registerErrors.relatedAccount">{{ registerErrors.relatedAccount }}</small>
            </label>
            <label class="full">
              <span>申请原因 / 需求描述 <em>必填</em></span>
              <textarea v-model.trim="registerForm.reason" :class="{ invalid: registerErrors.reason }" rows="4" placeholder="请描述业务场景、需要开通的权限和使用周期。" @blur="validateRegisterInfo"></textarea>
              <small v-if="registerErrors.reason">{{ registerErrors.reason }}</small>
            </label>
          </div>
        </div>

        <div v-else-if="currentRegisterStepKey === 'scope'" class="register-step-body">
          <h3>权限范围</h3>
          <p>可以先复制他人权限作为参考，再添加角色，最后补充单独的数据权限；重复权限会按来源合并展示。</p>
          <div class="register-scope-action-bar">
            <button type="button" class="register-primary-btn" @click="openRegisterRoleModal">添加角色</button>
            <button type="button" class="register-ghost-btn" @click="openRegisterCopyModal">复制他人权限</button>
            <button type="button" class="register-ghost-btn" @click="openRegisterDataModal">添加数据权限</button>
          </div>
          <div class="register-source-stack">
            <div v-if="!hasRegisterPermissionSources" class="register-scope-empty">
              <b>还没有选择权限范围</b>
              <p>请先点击“添加角色”“复制他人权限”或“添加数据权限”，系统会按来源分别展示申请内容。</p>
              <small v-if="registerErrors.scope" class="register-scope-error">{{ registerErrors.scope }}</small>
            </div>

            <article v-if="selectedRegisterRoles.length" class="register-source-panel">
              <div class="register-source-head">
                <div>
                  <b>添加角色</b>
                  <small>{{ selectedRegisterRoles.length }} 个角色，角色内绑定展示功能权限和数据权限</small>
                </div>
                <button type="button" class="register-link-btn" @click="openRegisterRoleModal">调整角色</button>
              </div>
              <div class="register-role-list">
                <div v-for="role in selectedRegisterRoles" :key="role.id" class="register-role-card">
                  <div>
                    <b>{{ role.name }}</b>
                    <small>{{ role.desc }}</small>
                  </div>
                  <div class="register-card-actions">
                    <button type="button" class="register-link-btn" @click="openRegisterRoleDetail(role)">详情</button>
                    <button type="button" class="register-link-btn danger" @click="removeRegisterRole(role.id)">移除</button>
                  </div>
                </div>
              </div>
            </article>

            <article v-if="copiedRegisterUser" class="register-source-panel">
              <div class="register-source-head">
                <div>
                  <b>复制他人权限</b>
                  <small>复制自 {{ copiedRegisterUser.name }}（{{ copiedRegisterUser.itcode }}）</small>
                </div>
                <button type="button" class="register-link-btn" @click="clearRegisterCopiedPermissions">清除复制结果</button>
              </div>
              <div class="register-role-list">
                <div v-for="role in copiedRegisterRoles" :key="role.id" class="register-role-card copied">
                  <div>
                    <b>{{ role.name }}</b>
                    <small>{{ role.desc }}</small>
                  </div>
                  <div class="register-card-actions">
                    <button type="button" class="register-link-btn" @click="openRegisterRoleDetail(role)">详情</button>
                  </div>
                </div>
                <div v-if="copiedRegisterExtraFunctionPermissions.length || copiedRegisterUserDataPermissions.length" class="register-extra-card">
                  <b>对方单独授权</b>
                  <div class="register-bound-grid">
                    <div>
                      <span>功能权限</span>
                      <div v-if="copiedRegisterExtraFunctionPermissions.length" class="register-chip-list">
                        <em v-for="permission in copiedRegisterExtraFunctionPermissions" :key="permission.id">{{ permission.name }}</em>
                      </div>
                      <small v-else>无单独功能权限。</small>
                    </div>
                    <div>
                      <span>数据权限</span>
                      <div v-if="copiedRegisterUserDataPermissions.length" class="register-chip-list">
                        <em v-for="permission in copiedRegisterUserDataPermissions" :key="permission.id">
                          {{ permission.name }}
                          <button type="button" @click="removeRegisterDataPermission(permission.id)">×</button>
                        </em>
                      </div>
                      <small v-else>无单独数据权限。</small>
                    </div>
                  </div>
                </div>
              </div>
            </article>

            <article v-if="manualRegisterDataPermissions.length" class="register-source-panel">
              <div class="register-source-head">
                <div>
                  <b>添加数据权限</b>
                  <small>{{ manualRegisterDataPermissions.length }} 项本次新增数据权限</small>
                </div>
                <button type="button" class="register-link-btn" @click="openRegisterDataModal">调整数据权限</button>
              </div>
              <div class="register-chip-list">
                <em v-for="permission in manualRegisterDataPermissions" :key="permission.id">
                  {{ permission.name }}
                  <button type="button" @click="removeRegisterDataPermission(permission.id)">×</button>
                </em>
              </div>
            </article>
          </div>
        </div>

        <div v-else class="register-step-body">
          <h3>提交审批</h3>
          <p>{{ registerSubmitted ? '申请已进入审批流程，请等待审批和账号开通通知。' : '提交后将进入账号创建审批流程，审批通过后由后台执行开通。' }}</p>
          <div class="register-approval-route">
            <div v-for="node in approvalRoute" :key="node.label" :class="{ done: node.done }">
              <span>{{ node.step }}</span>
              <b>{{ node.label }}</b>
              <small>{{ node.owner }}</small>
            </div>
          </div>
          <div class="register-submit-summary">
            <b>{{ registerSubmitted ? '账号创建申请已提交' : '将提交的申请' }}</b>
            <p>{{ registerForm.targetUser || '待创建账号人员' }} · {{ selectedRoleNames }} · {{ selectedDataScopeNames }}</p>
          </div>
        </div>

        <div class="register-modal-actions">
          <button type="button" class="register-ghost-btn" :disabled="registerStep === 0 || registerSubmitted" @click="prevRegisterStep">上一步</button>
          <button v-if="registerStep < registerSteps.length - 1" type="button" class="register-primary-btn" @click="nextRegisterStep">下一步</button>
          <button v-else type="button" class="register-primary-btn" :disabled="registerSubmitted" @click="submitRegisterApplication">{{ registerSubmitted ? '已提交' : '提交审批' }}</button>
        </div>
      </div>
    </div>

    <div v-if="registerRoleModal.visible" class="register-modal-layer" @click.self="closeRegisterRoleModal">
      <div class="register-picker-panel" role="dialog" aria-modal="true">
        <button type="button" class="register-modal-close" aria-label="关闭" @click="closeRegisterRoleModal">×</button>
        <h2>添加角色</h2>
        <p class="register-modal-note">选择创建账号时需要带入的初始角色，可查看每个角色绑定的功能和数据权限。</p>
        <div class="register-picker-list">
          <article v-for="role in roleOptions" :key="role.id" :class="{ active: registerRoleModal.selectedIds.includes(role.id) }">
            <label>
              <input type="checkbox" :checked="registerRoleModal.selectedIds.includes(role.id)" @change="toggleRegisterModalRole(role.id)">
              <span>
                <b>{{ role.name }}</b>
                <small>{{ role.desc }}</small>
              </span>
            </label>
            <button type="button" class="register-link-btn" @click="openRegisterRoleDetail(role)">详情</button>
          </article>
        </div>
        <div class="register-modal-actions flat">
          <button type="button" class="register-ghost-btn" @click="closeRegisterRoleModal">取消</button>
          <button type="button" class="register-primary-btn" @click="confirmRegisterRoleSelection">确认</button>
        </div>
      </div>
    </div>

    <div v-if="registerCopyModal.visible" class="register-modal-layer" @click.self="closeRegisterCopyModal">
      <div class="register-small-panel" role="dialog" aria-modal="true">
        <button type="button" class="register-modal-close" aria-label="关闭" @click="closeRegisterCopyModal">×</button>
        <h2>复制他人权限</h2>
        <p class="register-modal-note">输入对方 ITCode 后，系统会把对方的角色、功能权限和数据权限回填到本次申请。</p>
        <label class="register-single-field">
          <span>对方 ITCode <em>必填</em></span>
          <input v-model.trim="registerCopyModal.itcode" :class="{ invalid: registerCopyModal.error }" placeholder="例如 wangxt8" @keyup.enter="confirmRegisterCopyPermissions">
          <small v-if="registerCopyModal.error">{{ registerCopyModal.error }}</small>
        </label>
        <div class="register-hints">可试用：wangxt8、liwen08、temp-bpo</div>
        <div class="register-modal-actions flat">
          <button type="button" class="register-ghost-btn" @click="closeRegisterCopyModal">取消</button>
          <button type="button" class="register-primary-btn" @click="confirmRegisterCopyPermissions">确认复制</button>
        </div>
      </div>
    </div>

    <div v-if="registerDataModal.visible" class="register-modal-layer" @click.self="closeRegisterDataModal">
      <div class="register-picker-panel" role="dialog" aria-modal="true">
        <button type="button" class="register-modal-close" aria-label="关闭" @click="closeRegisterDataModal">×</button>
        <h2>添加数据权限</h2>
        <p class="register-modal-note">补充角色之外的数据范围，创建账号审批时会一并提交。</p>
        <div class="register-data-tree">
          <div v-for="group in dataPermissionTree" :key="group.id" class="register-data-group">
            <b>{{ group.name }}</b>
            <div v-for="child in group.children" :key="child.id" class="register-data-child">
              <span>{{ child.name }}</span>
              <label v-for="leaf in child.children" :key="leaf.id">
                <input type="checkbox" :checked="registerDataModal.selectedIds.includes(leaf.id)" @change="toggleRegisterId(registerDataModal.selectedIds, leaf.id)">
                {{ leaf.name }}
              </label>
            </div>
          </div>
        </div>
        <div class="register-modal-actions flat">
          <button type="button" class="register-ghost-btn" @click="closeRegisterDataModal">取消</button>
          <button type="button" class="register-primary-btn" @click="confirmRegisterDataSelection">确认</button>
        </div>
      </div>
    </div>

    <div v-if="registerRoleDetail.visible && registerRoleDetailRole" class="register-modal-layer" @click.self="closeRegisterRoleDetail">
      <div class="register-detail-panel" role="dialog" aria-modal="true">
        <button type="button" class="register-modal-close" aria-label="关闭" @click="closeRegisterRoleDetail">×</button>
        <span class="register-detail-eyebrow">角色权限详情</span>
        <h2>{{ registerRoleDetailRole.name }}</h2>
        <p class="register-modal-note">{{ registerRoleDetailRole.desc }}</p>
        <div class="register-permission-tree">
          <details v-for="root in registerRolePermissionTree(registerRoleDetailRole)" :key="root.id">
            <summary><b>{{ root.name }}</b><span>{{ registerPermissionCountLabel(root) }}</span></summary>
            <div class="register-permission-branches">
              <details v-for="branch in root.children" :key="branch.id">
                <summary><b>{{ branch.name }}</b><span>{{ branch.functions.length }} 项功能 / {{ branch.dataPermissions.length }} 项数据</span></summary>
                <div class="register-permission-matrix">
                  <div class="head"><span>功能权限</span><span>数据权限</span></div>
                  <div v-for="row in registerPermissionMatrixRows(branch)" :key="(row.functionPermission?.id || 'func-empty') + '-' + (row.dataPermission?.id || 'data-empty')" class="row">
                    <span>{{ row.functionPermission?.name || '-' }}</span>
                    <label v-if="row.dataPermission">
                      <input type="checkbox" :checked="registerForm.dataScopeIds.includes(row.dataPermission.id)" @change="toggleRegisterId(registerForm.dataScopeIds, row.dataPermission.id)">
                      {{ row.dataPermission.name }}
                    </label>
                    <span v-else>-</span>
                  </div>
                </div>
              </details>
            </div>
          </details>
        </div>
        <div class="register-modal-actions flat">
          <button type="button" class="register-primary-btn" @click="closeRegisterRoleDetail">知道了</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, reactive, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAppStore } from '@/stores/app'
import { allowPreviewAuth } from '@/config/runtimeMode'

const router   = useRouter()
const route    = useRoute()
const appStore = useAppStore()

const username = ref('')
const password = ref('')
const errorMsg = ref('')

const registerModalVisible = ref(false)
const registerStep = ref(0)
const maxRegisterStep = ref(0)
const registerSubmitted = ref(false)

const registerSteps = [
  { key: 'info', label: '1. 填写信息' },
  { key: 'scope', label: '2. 权限范围' },
  { key: 'approve', label: '3. 提交审批' }
]

const functionPermissionTree = [
  {
    id: 'func.ops',
    name: '运营能力',
    children: [
      { id: 'func.ops.dashboard', name: '运营看板', children: [{ id: 'func.dashboard.view', name: '查看运营总览' }, { id: 'func.report.generate', name: '报告生成' }, { id: 'func.data.export', name: '数据导出' }] }
    ]
  },
  {
    id: 'func.business',
    name: '业务能力',
    children: [
      { id: 'func.business.product', name: '商品与发布', children: [{ id: 'func.product.config', name: '商品配置' }, { id: 'func.publish.confirm', name: '发布确认' }] },
      { id: 'func.business.lead', name: '企业客户', children: [{ id: 'func.lead.assign', name: '线索分配' }] }
    ]
  },
  {
    id: 'func.platform',
    name: '平台能力',
    children: [
      { id: 'func.platform.skill', name: 'AI 与搜索', children: [{ id: 'func.skill.manage', name: 'Skill 管理' }, { id: 'func.geo.monitor', name: 'GEO 信源监测' }] }
    ]
  }
]

const dataPermissionTree = [
  {
    id: 'data.ops',
    name: '运营数据集',
    children: [
      { id: 'data.ops.region', name: '区域数据', children: [{ id: 'data.ops.region.east', name: '华东区' }, { id: 'data.ops.region.north', name: '华北区' }, { id: 'data.ops.region.south', name: '华南区' }] },
      { id: 'data.ops.metric', name: '经营指标', children: [{ id: 'data.ops.metric.gmv', name: 'GMV 指标' }, { id: 'data.ops.metric.flow', name: '流量转化' }] }
    ]
  },
  {
    id: 'data.member',
    name: '会员标签库',
    children: [
      { id: 'data.member.profile', name: '会员画像', children: [{ id: 'data.member.profile.level', name: '会员等级' }, { id: 'data.member.profile.rights', name: '权益使用' }] }
    ]
  },
  {
    id: 'data.geo',
    name: 'GEO 信源库',
    children: [
      { id: 'data.geo.source', name: '信源范围', children: [{ id: 'data.geo.source.official', name: '官方信源' }, { id: 'data.geo.source.community', name: '社区信源' }] }
    ]
  },
  {
    id: 'data.lead',
    name: '企业客户线索',
    children: [
      { id: 'data.lead.pool', name: '线索池', children: [{ id: 'data.lead.pool.all', name: '全部线索' }, { id: 'data.lead.pool.assigned', name: '已分配线索' }] }
    ]
  }
]

const roleOptions = [
  { id: 'ops-pm', name: '运营分析 PM', desc: '可查看运营总览、生成报告，并使用常用运营数据。', functionPermissionIds: ['func.dashboard.view', 'func.report.generate', 'func.data.export'], dataPermissionIds: ['data.ops.region.east', 'data.ops.metric.gmv'] },
  { id: 'product-op', name: '商品运营', desc: '可配置商品、推荐位、价格和上下架策略。', functionPermissionIds: ['func.product.config', 'func.publish.confirm'], dataPermissionIds: ['data.ops.region.north', 'data.ops.metric.gmv', 'data.member.profile.rights'] },
  { id: 'geo-analyst', name: 'GEO 分析师', desc: '可查看信源、引用和搜索表现数据。', functionPermissionIds: ['func.geo.monitor', 'func.report.generate'], dataPermissionIds: ['data.geo.source.official', 'data.geo.source.community'] },
  { id: 'lead-operator', name: '线索运营', desc: '可查看企业客户线索并进行分配跟进。', functionPermissionIds: ['func.lead.assign', 'func.dashboard.view'], dataPermissionIds: ['data.lead.pool.all', 'data.lead.pool.assigned'] }
]

const registerCopyUsers = [
  { itcode: 'wangxt8', name: '王晓婷', roleIds: ['ops-pm', 'product-op'], extraFunctionPermissionIds: ['func.skill.manage'], dataPermissionIds: ['data.ops.region.east', 'data.member.profile.rights'] },
  { itcode: 'liwen08', name: '李雯', roleIds: ['product-op'], extraFunctionPermissionIds: [], dataPermissionIds: ['data.member.profile.rights'] },
  { itcode: 'temp-bpo', name: '外部协作', roleIds: ['geo-analyst'], extraFunctionPermissionIds: ['func.report.generate'], dataPermissionIds: ['data.geo.source.official'] }
]

const registerForm = reactive({
  personType: 'internal',
  applicant: '',
  applicantItcode: '',
  targetUser: '',
  mobile: '',
  email: '',
  applicantManager: '',
  targetManager: '',
  relatedAccount: '',
  reason: '',
  roleIds: [] as string[],
  copiedRoleIds: [] as string[],
  copiedFromItcode: '',
  copiedFunctionPermissionIds: [] as string[],
  copiedDataSourceMap: {} as Record<string, string>,
  dataScopeIds: [] as string[],
  manualDataScopeIds: [] as string[]
})

const registerErrors = reactive({
  applicant: '',
  applicantItcode: '',
  targetUser: '',
  relatedAccount: '',
  reason: '',
  scope: ''
})
const registerRoleModal = reactive({ visible: false, selectedIds: [] as string[] })
const registerCopyModal = reactive({ visible: false, itcode: '', error: '' })
const registerDataModal = reactive({ visible: false, selectedIds: [] as string[] })
const registerRoleDetail = reactive({ visible: false, roleId: '' })

function isPresent<T>(value: T | null | undefined): value is T {
  return value != null
}

const currentRegisterStepKey = computed(() => registerSteps[registerStep.value]?.key || 'info')
const selectedRegisterRoles = computed(() => roleOptions.filter((item) => registerForm.roleIds.includes(item.id)))
const copiedRegisterUser = computed(() => registerCopyUsers.find((item) => item.itcode === registerForm.copiedFromItcode) || null)
const copiedRegisterRoles = computed(() => roleOptions.filter((item) => registerForm.copiedRoleIds.includes(item.id)))
const allRegisterRoles = computed(() => [...selectedRegisterRoles.value, ...copiedRegisterRoles.value].filter((role, index, list) => list.findIndex((item) => item.id === role.id) === index))
const copiedRegisterExtraFunctionPermissions = computed(() => registerForm.copiedFunctionPermissionIds.map(registerFunctionPermissionDetail).filter(isPresent))
const copiedRegisterUserDataPermissions = computed(() => registerForm.dataScopeIds.filter((id) => registerCopiedDataSource(id) === '用户单独授权').map(findRegisterDataPermission).filter(isPresent))
const manualRegisterDataPermissions = computed(() => registerForm.manualDataScopeIds.map(findRegisterDataPermission).filter(isPresent))
const hasRegisterPermissionSources = computed(() => selectedRegisterRoles.value.length > 0 || !!copiedRegisterUser.value || manualRegisterDataPermissions.value.length > 0)
const selectedRoleNames = computed(() => allRegisterRoles.value.map((item) => item.name).join('、') || '未选择角色')
const selectedDataScopeNames = computed(() => registerForm.dataScopeIds.map(findRegisterDataPermission).filter(isPresent).map((item) => item.name).join('、') || '默认无额外数据权限')
const registerRoleDetailRole = computed(() => roleOptions.find((role) => role.id === registerRoleDetail.roleId) || null)
const approvalRoute = computed(() => [
  { step: '1', label: '申请人提交', owner: registerForm.applicant || '待填写', done: true },
  { step: '2', label: '申请人直线经理审批', owner: registerForm.applicantManager || '待带出', done: false },
  { step: '3', label: '被申请人直线经理审批', owner: registerForm.targetManager || '待带出', done: false },
  { step: '4', label: '业务审批', owner: '账号与权限管理员', done: false },
  { step: '5', label: '系统审批 / 后台执行', owner: 'sunzh4', done: false }
])

// 对应原 doLogin()
async function doLogin() {
  const u = username.value.trim()
  const p = password.value
  if (!u || !p) { showLoginError('请输入用户名和密码'); return }

  try {
    const res = await fetch('/api/admin/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: u, password: p })
    })
    const data = await res.json()
    if (!res.ok) { showLoginError(data.error || '登录失败'); return }

    // 写入 store，然后跳转（等价于原来隐藏 login-screen、显示 sidebar + main）
    appStore.user = data.username || u
    await appStore.loadUserContext()
    router.replace(String(route.query.redirect || '/'))
  } catch {
    if (!allowPreviewAuth) {
      showLoginError('登录服务暂不可用，请稍后重试')
      return
    }
    localStorage.setItem('preview_user', u)
    appStore.usePreviewSession(u)
    router.replace(String(route.query.redirect || '/'))
  }
}

// 对应原 showLoginError()
function showLoginError(msg: string) {
  errorMsg.value = msg
}

function openRegisterModal() {
  registerModalVisible.value = true
  registerStep.value = 0
  maxRegisterStep.value = 0
  registerSubmitted.value = false
  resetRegisterErrors()
}

function closeRegisterModal() {
  registerModalVisible.value = false
}

function resetRegisterErrors() {
  Object.keys(registerErrors).forEach((key) => {
    registerErrors[key as keyof typeof registerErrors] = ''
  })
}

function validateRegisterInfo() {
  registerErrors.applicant = registerForm.applicant ? '' : '请填写申请人姓名。'
  registerErrors.applicantItcode = registerForm.applicantItcode ? '' : '请填写申请人 ITCode。'
  registerErrors.targetUser = registerForm.targetUser ? '' : '请填写待创建账号人员。'
  registerErrors.relatedAccount = registerForm.personType === 'external' && !registerForm.relatedAccount ? '外部人员需要填写内部关联人员。' : ''
  registerErrors.reason = registerForm.reason ? '' : '请填写申请原因和业务场景。'
  return ![registerErrors.applicant, registerErrors.applicantItcode, registerErrors.targetUser, registerErrors.relatedAccount, registerErrors.reason].some(Boolean)
}

function validateRegisterScope() {
  registerErrors.scope = hasRegisterPermissionSources.value ? '' : '请至少添加角色、复制他人权限或添加数据权限后再继续。'
  return !registerErrors.scope
}

function goRegisterStep(index: number) {
  if (index > maxRegisterStep.value || registerSubmitted.value) return
  registerStep.value = index
}

function nextRegisterStep() {
  if (currentRegisterStepKey.value === 'info' && !validateRegisterInfo()) return
  if (currentRegisterStepKey.value === 'scope' && !validateRegisterScope()) return
  registerStep.value = Math.min(registerStep.value + 1, registerSteps.length - 1)
  maxRegisterStep.value = Math.max(maxRegisterStep.value, registerStep.value)
}

function prevRegisterStep() {
  registerStep.value = Math.max(registerStep.value - 1, 0)
}

function toggleRegisterId(list: string[], id: string) {
  const index = list.indexOf(id)
  if (index >= 0) list.splice(index, 1)
  else list.push(id)
}

function addUniqueRegisterIds(list: string[], ids: string[]) {
  ids.forEach((id) => {
    if (!list.includes(id)) list.push(id)
  })
}

function roleDataIds(roleIds: string[]) {
  return [...new Set(roleOptions.filter((role) => roleIds.includes(role.id)).flatMap((role) => role.dataPermissionIds))]
}

function openRegisterRoleModal() {
  registerRoleModal.visible = true
  registerRoleModal.selectedIds = [...registerForm.roleIds]
}

function closeRegisterRoleModal() {
  registerRoleModal.visible = false
}

function toggleRegisterModalRole(id: string) {
  toggleRegisterId(registerRoleModal.selectedIds, id)
}

function confirmRegisterRoleSelection() {
  registerForm.roleIds = [...registerRoleModal.selectedIds]
  addUniqueRegisterIds(registerForm.dataScopeIds, roleDataIds(registerForm.roleIds))
  closeRegisterRoleModal()
}

function removeRegisterRole(id: string) {
  registerForm.roleIds = registerForm.roleIds.filter((roleId) => roleId !== id)
}

function openRegisterCopyModal() {
  registerCopyModal.visible = true
  registerCopyModal.itcode = ''
  registerCopyModal.error = ''
}

function closeRegisterCopyModal() {
  registerCopyModal.visible = false
}

function confirmRegisterCopyPermissions() {
  const user = registerCopyUsers.find((item) => item.itcode === registerCopyModal.itcode)
  if (!user) {
    registerCopyModal.error = '没有找到可复制的 mock 用户，请输入 wangxt8、liwen08 或 temp-bpo。'
    return
  }
  registerForm.copiedFromItcode = user.itcode
  registerForm.copiedRoleIds = [...user.roleIds]
  registerForm.copiedFunctionPermissionIds = [...user.extraFunctionPermissionIds]
  registerForm.copiedDataSourceMap = {}
  roleDataIds(user.roleIds).forEach((id) => {
    registerForm.copiedDataSourceMap[id] = '角色继承'
  })
  user.dataPermissionIds.forEach((id) => {
    registerForm.copiedDataSourceMap[id] = '用户单独授权'
  })
  addUniqueRegisterIds(registerForm.dataScopeIds, [...roleDataIds(user.roleIds), ...user.dataPermissionIds])
  closeRegisterCopyModal()
}

function clearRegisterCopiedPermissions() {
  const copiedIds = Object.keys(registerForm.copiedDataSourceMap)
  registerForm.copiedFromItcode = ''
  registerForm.copiedRoleIds = []
  registerForm.copiedFunctionPermissionIds = []
  registerForm.copiedDataSourceMap = {}
  registerForm.dataScopeIds = registerForm.dataScopeIds.filter((id) => !copiedIds.includes(id) || registerForm.manualDataScopeIds.includes(id))
}

function openRegisterDataModal() {
  registerDataModal.visible = true
  registerDataModal.selectedIds = [...registerForm.dataScopeIds]
}

function closeRegisterDataModal() {
  registerDataModal.visible = false
}

function confirmRegisterDataSelection() {
  registerForm.dataScopeIds = [...registerDataModal.selectedIds]
  registerForm.manualDataScopeIds = registerForm.dataScopeIds.filter((id) => !roleDataIds(registerForm.roleIds).includes(id) && registerCopiedDataSource(id) !== '角色继承' && registerCopiedDataSource(id) !== '用户单独授权')
  closeRegisterDataModal()
}

function removeRegisterDataPermission(id: string) {
  registerForm.dataScopeIds = registerForm.dataScopeIds.filter((item) => item !== id)
  registerForm.manualDataScopeIds = registerForm.manualDataScopeIds.filter((item) => item !== id)
}

function openRegisterRoleDetail(role: { id: string }) {
  registerRoleDetail.visible = true
  registerRoleDetail.roleId = role.id
}

function closeRegisterRoleDetail() {
  registerRoleDetail.visible = false
  registerRoleDetail.roleId = ''
}

function registerCopiedDataSource(id: string) {
  return registerForm.copiedDataSourceMap[id] || ''
}

function registerFunctionPermissionDetail(id: string) {
  for (const root of functionPermissionTree) {
    for (const branch of root.children) {
      const leaf = branch.children.find((item) => item.id === id)
      if (leaf) return leaf
    }
  }
  return { id, name: id }
}

function findRegisterDataPermission(id: string) {
  for (const group of dataPermissionTree) {
    for (const child of group.children) {
      const leaf = child.children.find((item) => item.id === id)
      if (leaf) return leaf
    }
  }
  return null
}

function registerPermissionPathInTree(id: string) {
  for (const root of functionPermissionTree) {
    for (const branch of root.children) {
      if (branch.children.some((leaf) => leaf.id === id)) return { rootId: root.id, rootName: root.name, branchId: branch.id, branchName: branch.name }
    }
  }
  return null
}

function registerDataBranchId(id: string) {
  if (id.startsWith('data.geo.')) return 'func.platform.skill'
  if (id.startsWith('data.lead.')) return 'func.business.lead'
  if (id.startsWith('data.member.')) return 'func.ops.dashboard'
  if (id.startsWith('data.ops.')) return 'func.ops.dashboard'
  return 'func.ops.dashboard'
}

function registerBranchMetaById(branchId: string) {
  for (const root of functionPermissionTree) {
    const branch = root.children.find((item) => item.id === branchId)
    if (branch) return { rootId: root.id, rootName: root.name, branchId: branch.id, branchName: branch.name }
  }
  return { rootId: 'func.other', rootName: '其他能力', branchId: 'func.other.misc', branchName: '未归类权限' }
}

function ensureRegisterPermissionBranch(map: Map<string, any>, meta: any) {
  if (!map.has(meta.rootId)) map.set(meta.rootId, { id: meta.rootId, name: meta.rootName, children: new Map() })
  const root = map.get(meta.rootId)
  if (!root.children.has(meta.branchId)) root.children.set(meta.branchId, { id: meta.branchId, name: meta.branchName, functions: [], dataPermissions: [] })
  return root.children.get(meta.branchId)
}

function registerRolePermissionTree(role: any) {
  const map = new Map()
  ;(role?.functionPermissionIds || []).forEach((id: string) => {
    const meta = registerPermissionPathInTree(id) || registerBranchMetaById('func.other.misc')
    ensureRegisterPermissionBranch(map, meta).functions.push(registerFunctionPermissionDetail(id))
  })
  ;(role?.dataPermissionIds || []).forEach((id: string) => {
    const permission = findRegisterDataPermission(id)
    if (!permission) return
    const meta = registerBranchMetaById(registerDataBranchId(id))
    ensureRegisterPermissionBranch(map, meta).dataPermissions.push(permission)
  })
  return [...map.values()].map((root: any) => ({ ...root, children: [...root.children.values()] }))
}

function registerPermissionMatrixRows(branch: any) {
  const max = Math.max(branch.functions.length, branch.dataPermissions.length)
  return Array.from({ length: max }, (_, index) => ({ functionPermission: branch.functions[index] || null, dataPermission: branch.dataPermissions[index] || null }))
}

function registerPermissionCountLabel(root: any) {
  const functionCount = root.children.reduce((sum: number, child: any) => sum + child.functions.length, 0)
  const dataCount = root.children.reduce((sum: number, child: any) => sum + child.dataPermissions.length, 0)
  return `${functionCount} 项功能 / ${dataCount} 项数据`
}

function submitRegisterApplication() {
  if (!validateRegisterInfo()) {
    registerStep.value = 0
    maxRegisterStep.value = Math.max(maxRegisterStep.value, 0)
    return
  }
  if (!validateRegisterScope()) {
    registerStep.value = 1
    maxRegisterStep.value = Math.max(maxRegisterStep.value, 1)
    return
  }
  registerSubmitted.value = true
  registerStep.value = registerSteps.length - 1
  maxRegisterStep.value = registerSteps.length - 1
}
</script>

<style scoped>
.login-register-entry {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  margin-top: 16px;
  color: var(--text-tertiary, #8a94a6);
  font-size: 13px;
}

.login-register-btn {
  border: 0;
  background: transparent;
  color: var(--primary, #316dff);
  font-weight: 700;
  cursor: pointer;
}

.login-register-btn:hover {
  text-decoration: underline;
}

.register-modal-layer {
  position: fixed;
  inset: 0;
  z-index: 2000;
  display: grid;
  place-items: center;
  padding: 24px;
  background: rgba(17, 24, 39, 0.34);
  backdrop-filter: blur(8px);
}

.register-modal-panel {
  position: relative;
  width: min(920px, 100%);
  max-height: min(760px, calc(100vh - 48px));
  overflow: auto;
  border: 1px solid #dfe7f3;
  border-radius: 8px;
  background: #fff;
  padding: 24px;
  box-shadow: 0 24px 70px rgba(15, 23, 42, 0.2);
}

.register-modal-close {
  position: absolute;
  top: 14px;
  right: 14px;
  width: 32px;
  height: 32px;
  border: 1px solid #dfe7f3;
  border-radius: 8px;
  background: #fff;
  color: #667085;
  cursor: pointer;
}

.register-modal-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 24px;
  padding-right: 42px;
}

.register-modal-head h2,
.register-step-body h3 {
  margin: 0;
  color: #111827;
}

.register-modal-head p,
.register-step-body > p {
  margin: 8px 0 0;
  color: #667085;
  line-height: 1.7;
}

.register-modal-head > span {
  flex: 0 0 auto;
  border-radius: 999px;
  padding: 6px 10px;
  background: #eef4ff;
  color: #316dff;
  font-size: 12px;
  font-weight: 700;
}

.register-steps {
  display: flex;
  gap: 6px;
  margin: 22px 0 20px;
  border: 1px solid #dfe7f3;
  border-radius: 10px;
  padding: 4px;
}

.register-steps button {
  flex: 1;
  min-height: 36px;
  border: 0;
  border-radius: 8px;
  background: transparent;
  color: #667085;
  font-weight: 700;
  cursor: pointer;
}

.register-steps button.active {
  background: #316dff;
  color: #fff;
}

.register-steps button.locked,
.register-steps button:disabled {
  opacity: 0.58;
  cursor: not-allowed;
}

.register-form-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 14px 16px;
  margin-top: 18px;
}

.register-form-grid label {
  display: flex;
  flex-direction: column;
  gap: 7px;
  color: #344054;
  font-size: 13px;
  font-weight: 700;
}

.register-form-grid label.full {
  grid-column: 1 / -1;
}

.register-form-grid em {
  color: #ff4d4f;
  font-style: normal;
  font-size: 12px;
}

.register-form-grid input,
.register-form-grid select,
.register-form-grid textarea {
  width: 100%;
  border: 1px solid #dfe7f3;
  border-radius: 8px;
  padding: 10px 12px;
  color: #111827;
  font: inherit;
  font-weight: 500;
  outline: none;
}

.register-form-grid input.invalid,
.register-form-grid textarea.invalid {
  border-color: #ff4d4f;
  background: #fff7f7;
}

.register-form-grid small {
  color: #ff4d4f;
  font-weight: 600;
}

.register-scope-action-bar {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  margin-top: 18px;
}

.register-source-stack {
  display: grid;
  gap: 12px;
  margin-top: 16px;
}

.register-scope-empty,
.register-source-panel,
.register-extra-card {
  border: 1px solid #dfe7f3;
  border-radius: 8px;
  padding: 14px;
  background: #fff;
}

.register-scope-empty {
  background: #f8fafc;
  color: #667085;
}

.register-scope-empty b,
.register-source-head b,
.register-role-card b,
.register-extra-card b {
  color: #111827;
  font-size: 14px;
}

.register-scope-empty p,
.register-scope-error,
.register-source-head small,
.register-role-card small,
.register-extra-card small {
  margin: 6px 0 0;
  color: #667085;
  font-size: 12px;
  line-height: 1.5;
}

.register-scope-error {
  display: block;
  margin-top: 8px;
  color: #ef4444;
  font-weight: 700;
}

.register-source-head,
.register-role-card,
.register-bound-grid {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 14px;
}

.register-role-list {
  display: grid;
  gap: 10px;
  margin-top: 12px;
}

.register-role-card {
  border: 1px solid #e6edf7;
  border-radius: 8px;
  padding: 12px;
  background: #fff;
}

.register-role-card.copied {
  background: #f8fbff;
}

.register-card-actions {
  display: flex;
  flex: 0 0 auto;
  align-items: center;
  gap: 8px;
}

.register-link-btn {
  border: 0;
  background: transparent;
  color: #316dff;
  font-size: 13px;
  font-weight: 800;
  cursor: pointer;
}

.register-link-btn.danger {
  color: #e53935;
}

.register-bound-grid {
  margin-top: 12px;
}

.register-bound-grid > div {
  flex: 1 1 0;
  min-width: 0;
}

.register-bound-grid span {
  color: #455468;
  font-size: 12px;
  font-weight: 800;
}

.register-chip-list {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 8px;
}

.register-chip-list em {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  border-radius: 999px;
  padding: 5px 8px;
  background: #eef4ff;
  color: #316dff;
  font-size: 12px;
  font-style: normal;
  font-weight: 800;
}

.register-chip-list button {
  border: 0;
  background: transparent;
  color: inherit;
  font-weight: 900;
  cursor: pointer;
}

.register-picker-panel,
.register-detail-panel {
  position: relative;
  width: min(860px, 100%);
  max-height: min(760px, calc(100vh - 48px));
  overflow: auto;
  border: 1px solid #dfe7f3;
  border-radius: 8px;
  background: #fff;
  padding: 24px;
  box-shadow: 0 24px 70px rgba(15, 23, 42, 0.2);
}

.register-small-panel {
  position: relative;
  width: min(460px, 100%);
  border: 1px solid #dfe7f3;
  border-radius: 8px;
  background: #fff;
  padding: 24px;
  box-shadow: 0 24px 70px rgba(15, 23, 42, 0.2);
}

.register-picker-panel h2,
.register-small-panel h2,
.register-detail-panel h2 {
  margin: 0;
  color: #111827;
}

.register-modal-note {
  margin: 8px 0 16px;
  color: #667085;
  line-height: 1.6;
}

.register-picker-list,
.register-data-tree,
.register-permission-tree {
  display: grid;
  gap: 10px;
}

.register-picker-list article {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  border: 1px solid #dfe7f3;
  border-radius: 8px;
  padding: 12px;
  background: #fff;
}

.register-picker-list article.active {
  border-color: #316dff;
  background: #f4f7ff;
}

.register-picker-list label {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  cursor: pointer;
}

.register-picker-list b,
.register-picker-list small {
  display: block;
}

.register-picker-list small {
  margin-top: 5px;
  color: #667085;
  line-height: 1.5;
}

.register-single-field {
  display: grid;
  gap: 7px;
  color: #344054;
  font-size: 13px;
  font-weight: 800;
}

.register-single-field em {
  color: #ff4d4f;
  font-style: normal;
}

.register-single-field input {
  border: 1px solid #dfe7f3;
  border-radius: 8px;
  padding: 10px 12px;
  font: inherit;
}

.register-single-field input.invalid {
  border-color: #ff4d4f;
  background: #fff7f7;
}

.register-single-field small {
  color: #ff4d4f;
}

.register-hints {
  margin-top: 10px;
  color: #667085;
  font-size: 12px;
}

.register-data-group {
  border: 1px solid #dfe7f3;
  border-radius: 8px;
  padding: 12px;
  background: #fff;
}

.register-data-group > b {
  display: block;
  margin-bottom: 10px;
  color: #111827;
}

.register-data-child {
  display: grid;
  gap: 8px;
  margin-top: 8px;
  padding-left: 10px;
}

.register-data-child > span {
  color: #455468;
  font-size: 12px;
  font-weight: 800;
}

.register-data-child label {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  color: #344054;
  font-size: 13px;
}

.register-detail-eyebrow {
  display: block;
  margin-bottom: 6px;
  color: #316dff;
  font-size: 12px;
  font-weight: 800;
}

.register-permission-tree details {
  border: 1px solid #dfe7f3;
  border-radius: 8px;
  background: #fff;
}

.register-permission-tree summary {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  padding: 10px 12px;
  color: #111827;
  font-weight: 800;
  cursor: pointer;
}

.register-permission-tree summary span {
  color: #667085;
  font-size: 12px;
}

.register-permission-branches {
  display: grid;
  gap: 8px;
  padding: 0 10px 10px 22px;
}

.register-permission-matrix {
  margin: 0 10px 10px;
  border: 1px solid #edf2f8;
  border-radius: 8px;
  overflow: hidden;
}

.register-permission-matrix .head,
.register-permission-matrix .row {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
}

.register-permission-matrix .head {
  background: #f8fafc;
  color: #667085;
  font-size: 12px;
  font-weight: 800;
}

.register-permission-matrix span,
.register-permission-matrix label {
  min-width: 0;
  padding: 9px 10px;
  border-right: 1px solid #edf2f8;
  color: #455468;
  font-size: 12px;
}

.register-permission-matrix span:last-child,
.register-permission-matrix label:last-child {
  border-right: 0;
}

.register-permission-matrix .row + .row {
  border-top: 1px solid #edf2f8;
}

.register-permission-matrix label {
  display: flex;
  align-items: center;
  gap: 8px;
}

.register-modal-actions.flat {
  position: static;
  margin: 18px 0 0;
  padding: 14px 0 0;
}
.register-scope-section {
  margin-top: 18px;
}

.register-scope-section > b {
  display: block;
  margin-bottom: 10px;
  color: #111827;
}

.register-option-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 12px;
}

.register-option-grid button {
  min-height: 92px;
  border: 1px solid #dfe7f3;
  border-radius: 8px;
  background: #fff;
  padding: 12px;
  text-align: left;
  cursor: pointer;
}

.register-option-grid button.active {
  border-color: #316dff;
  background: #f4f7ff;
  box-shadow: inset 0 0 0 1px #316dff;
}

.register-option-grid span {
  display: block;
  color: #111827;
  font-weight: 800;
}

.register-option-grid small {
  display: block;
  margin-top: 8px;
  color: #667085;
  line-height: 1.5;
}

.register-approval-route {
  display: grid;
  grid-template-columns: repeat(5, minmax(0, 1fr));
  gap: 10px;
  margin-top: 18px;
}

.register-approval-route > div {
  border: 1px solid #dfe7f3;
  border-radius: 8px;
  padding: 12px;
  background: #fff;
}

.register-approval-route span {
  display: inline-grid;
  place-items: center;
  width: 24px;
  height: 24px;
  border-radius: 999px;
  background: #eef4ff;
  color: #316dff;
  font-weight: 800;
}

.register-approval-route b,
.register-approval-route small {
  display: block;
  margin-top: 8px;
}

.register-approval-route small {
  color: #667085;
}

.register-submit-summary {
  margin-top: 16px;
  border: 1px solid #b7ebc6;
  border-radius: 8px;
  padding: 14px 16px;
  background: #f0fff4;
  color: #166534;
}

.register-submit-summary b,
.register-submit-summary p {
  display: block;
  margin: 0;
}

.register-submit-summary p {
  margin-top: 6px;
}

.register-modal-actions {
  position: sticky;
  bottom: -24px;
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  margin: 22px -24px -24px;
  border-top: 1px solid #e6edf7;
  padding: 14px 24px;
  background: rgba(255, 255, 255, 0.96);
}

.register-primary-btn,
.register-ghost-btn {
  min-height: 36px;
  border-radius: 8px;
  padding: 0 16px;
  font-weight: 800;
  cursor: pointer;
}

.register-primary-btn {
  border: 1px solid #316dff;
  background: #316dff;
  color: #fff;
}

.register-ghost-btn {
  border: 1px solid #dfe7f3;
  background: #fff;
  color: #344054;
}

.register-primary-btn:disabled,
.register-ghost-btn:disabled {
  opacity: 0.56;
  cursor: not-allowed;
}

@media (max-width: 760px) {
  .register-form-grid,
  .register-option-grid,
  .register-approval-route {
    grid-template-columns: 1fr;
  }

  .register-modal-panel {
    padding: 18px;
  }

  .register-modal-actions {
    margin: 18px -18px -18px;
    padding: 12px 18px;
  }
}
</style>



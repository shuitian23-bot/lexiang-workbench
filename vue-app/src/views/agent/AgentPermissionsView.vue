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
              <p>从申请类型开始，自动带出审批人和执行路径。</p>
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
            <p>不同类型会自动匹配审批人和执行路径。</p>
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
              <div class="permission-form-field full">
                <span class="field-label required">人员类型 <em>必填</em></span>
                <div class="person-type-switch" role="radiogroup" aria-label="人员类型">
                  <button
                    v-for="type in personTypes"
                    :key="type.key"
                    type="button"
                    :class="{ active: form.personType === type.key }"
                    role="radio"
                    :aria-checked="form.personType === type.key"
                    @click="selectPersonType(type.key)"
                  >
                    <b>{{ type.label }}</b>
                    <small>{{ type.desc }}</small>
                  </button>
                </div>
              </div>
              <label>
                <span>申请人</span>
                <input v-model="form.applicant" readonly>
              </label>
              <label>
                <span>ITCode</span>
                <input v-model="form.itcode" readonly>
              </label>
              <label>
                <span class="field-label required">被申请人 <em>必填</em></span>
                <input
                  v-model.trim="form.targetUser"
                  :class="{ invalid: formErrors.targetUser }"
                  placeholder="输入员工 ITCode 或姓名"
                  @blur="validateInfoForm"
                >
                <small v-if="formErrors.targetUser" class="field-error">{{ formErrors.targetUser }}</small>
              </label>
              <label>
                <span>手机号</span>
                <input v-model="form.mobile" placeholder="用于账号开通或审批沟通">
              </label>
              <label class="relation-account-field">
                <span :class="['field-label', { required: isExternalPerson }]">关联账号 / 关联人员 <em v-if="isExternalPerson">必填</em></span>
                <input
                  v-model.trim="form.relatedAccount"
                  :class="{ invalid: formErrors.relatedAccount }"
                  placeholder="外部人员请填写负责对接的内部员工 ITCode 或姓名"
                  @blur="validateInfoForm"
                >
                <small v-if="formErrors.relatedAccount" class="field-error">{{ formErrors.relatedAccount }}</small>
                <small v-else class="field-help">用于确认外部协作人员的内部对接关系。</small>
              </label>
              <label class="email-field">
                <span>邮箱</span>
                <input v-model="form.email" placeholder="name@lenovo.com">
              </label>
              <label>
                <span>直线经理</span>
                <input v-model="form.manager" readonly>
              </label>
              <label class="full">
                <span class="field-label required">申请原因 / 需求描述 <em>必填</em></span>
                <textarea
                  v-model.trim="form.reason"
                  :class="{ invalid: formErrors.reason }"
                  rows="4"
                  placeholder="请描述业务场景、需要开通的权限、使用周期和影响范围。"
                  @blur="validateInfoForm"
                ></textarea>
                <small v-if="formErrors.reason" class="field-error">{{ formErrors.reason }}</small>
              </label>
              <label>
                <span class="field-label required">业务审批人 <em>必填</em></span>
                <select v-model="form.businessApprover" :class="{ invalid: formErrors.businessApprover }" @blur="validateInfoForm">
                  <option disabled value="">请选择业务审批人</option>
                  <option v-for="item in businessApprovers" :key="item" :value="item">{{ item }}</option>
                </select>
                <small v-if="formErrors.businessApprover" class="field-error">{{ formErrors.businessApprover }}</small>
              </label>
              <label>
                <span>系统审批人</span>
                <input v-model="form.systemApprover" readonly>
              </label>
            </div>
          </div>

          <div v-else-if="currentStep === 2" class="permission-step">
            <h3>权限范围</h3>
            <p>可以先复制他人权限作为参考，再添加角色，最后补充单独的数据权限；重复的角色将以数据权限为依据进行合并。</p>
            <div class="scope-action-bar">
              <button type="button" class="primary-btn" @click="openRoleModal">添加角色</button>
              <button type="button" class="ghost-btn" @click="openCopyModal">复制他人权限</button>
              <button type="button" class="ghost-btn" @click="openDataModal">添加数据权限</button>
            </div>
            <div class="scope-source-stack">
              <div v-if="!hasPermissionSources" class="scope-empty source-empty">
                <b>还没有选择权限范围</b>
                <p>请先点击“添加角色”“复制他人权限”或“添加数据权限”，系统会按来源分别展示申请内容。</p>
              </div>

              <article v-if="selectedRoles.length" class="scope-source-panel">
                <div class="scope-panel-head">
                  <div>
                    <b>添加角色</b>
                    <small>{{ selectedRoles.length }} 个角色，角色内绑定展示功能权限和数据权限</small>
                  </div>
                  <button type="button" class="link-btn" @click="openRoleModal">调整角色</button>
                </div>
                <div class="source-role-list">
                  <div v-for="role in selectedRoles" :key="role.id" class="source-role-card">
                    <div class="source-role-title">
                      <div>
                        <b>{{ role.name }}</b>
                        <small>{{ role.desc }}</small>
                      </div>
                      <button type="button" class="link-btn danger" @click="removeRole(role.id)">移除</button>
                    </div>
                    <div class="bound-permission-grid">
                      <div>
                        <span class="bound-title">功能权限</span>
                        <div class="permission-chip-list compact">
                          <span v-for="permission in roleFunctionPermissions(role)" :key="permission.id">{{ permission.name }}</span>
                        </div>
                      </div>
                      <div>
                        <div class="bound-title-row">
                          <span class="bound-title">数据权限</span>
                          <button type="button" class="refresh-btn" title="恢复该角色带出的数据权限" @click="resetRoleDataPermissions(role.id)">↻</button>
                        </div>
                        <div v-if="roleDataPermissions(role).length" class="permission-chip-list compact">
                          <span v-for="permission in roleDataPermissions(role)" :key="permission.id">
                            {{ permission.name }}
                            <button type="button" class="chip-remove" @click="removeDataPermission(permission.id)">×</button>
                          </span>
                        </div>
                        <small v-else class="bound-empty">该角色的数据权限已全部取消，可点击右侧复位按钮恢复。</small>
                      </div>
                    </div>
                  </div>
                </div>
              </article>

              <article v-if="copiedFromUser" class="scope-source-panel">
                <div class="scope-panel-head">
                  <div>
                    <b>复制他人权限</b>
                    <small>复制自 {{ copiedFromUser.name }}（{{ copiedFromUser.itcode }}）</small>
                  </div>
                  <button type="button" class="link-btn" @click="clearCopiedPermissions">清除复制结果</button>
                </div>
                <div class="source-role-list">
                  <div v-for="role in copiedRoles" :key="role.id" class="source-role-card copied">
                    <div class="source-role-title">
                      <div>
                        <b>{{ role.name }}</b>
                        <small>{{ role.desc }}</small>
                      </div>
                    </div>
                    <div class="bound-permission-grid">
                      <div>
                        <span class="bound-title">功能权限</span>
                        <div class="permission-chip-list compact">
                          <span v-for="permission in roleFunctionPermissions(role)" :key="permission.id">{{ permission.name }}</span>
                        </div>
                      </div>
                      <div>
                        <div class="bound-title-row">
                          <span class="bound-title">数据权限</span>
                          <button type="button" class="refresh-btn" title="恢复复制权限带出的数据权限" @click="resetCopiedRoleDataPermissions(role.id)">↻</button>
                        </div>
                        <div v-if="copiedRoleDataPermissions(role).length" class="permission-chip-list compact">
                          <span v-for="permission in copiedRoleDataPermissions(role)" :key="permission.id">
                            {{ permission.name }}
                            <em class="source-tag role">角色继承</em>
                            <button type="button" class="chip-remove" @click="removeDataPermission(permission.id)">×</button>
                          </span>
                        </div>
                        <small v-else class="bound-empty">该权限来源的数据权限已全部取消，可点击右侧复位按钮恢复。</small>
                      </div>
                    </div>
                  </div>
                  <div v-if="copiedExtraFunctionPermissions.length || hasCopiedUserGrantedData" class="source-role-card copied">
                    <div class="source-role-title">
                      <div>
                        <b>对方单独授权</b>
                        <small>不属于角色的权限，也会作为本次申请参考。</small>
                      </div>
                    </div>
                    <div class="bound-permission-grid">
                      <div>
                        <span class="bound-title">功能权限</span>
                        <div v-if="copiedExtraFunctionPermissions.length" class="permission-chip-list compact">
                          <span v-for="permission in copiedExtraFunctionPermissions" :key="permission.id">{{ permission.name }}</span>
                        </div>
                        <small v-else class="bound-empty">无单独功能权限。</small>
                      </div>
                      <div>
                        <div class="bound-title-row">
                          <span class="bound-title">数据权限</span>
                          <button type="button" class="refresh-btn" title="恢复对方单独授权的数据权限" @click="resetCopiedUserDataPermissions">↻</button>
                        </div>
                        <div v-if="copiedUserGrantedDataPermissions.length" class="permission-chip-list compact">
                          <span v-for="permission in copiedUserGrantedDataPermissions" :key="permission.id">
                            {{ permission.name }}
                            <em class="source-tag user">用户单独授权</em>
                            <button type="button" class="chip-remove" @click="removeDataPermission(permission.id)">×</button>
                          </span>
                        </div>
                        <small v-else class="bound-empty">对方单独授权的数据权限已全部取消，可点击右侧复位按钮恢复。</small>
                      </div>
                    </div>
                  </div>
                </div>
              </article>

              <article v-if="manualDataPermissionDetails.length" class="scope-source-panel">
                <div class="scope-panel-head">
                  <div>
                    <b>添加数据权限</b>
                    <small>{{ manualDataPermissionDetails.length }} 项本次新增数据权限</small>
                  </div>
                  <button type="button" class="link-btn" @click="openDataModal">调整数据权限</button>
                </div>
                <div class="permission-chip-list compact manual-data-list">
                  <span v-for="permission in manualDataPermissionDetails" :key="permission.id">
                    {{ permission.name }}
                    <button type="button" class="chip-remove" @click="removeDataPermission(permission.id)">×</button>
                  </span>
                </div>
              </article>
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
              <p>{{ selectedType.label }} · {{ form.targetUser || '待补充被申请人' }} · {{ scopeSummaryText }}</p>
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
              <p>关联人和审批人的统一入口，先筛选待办，再进入详情完成确认或审批。</p>
            </div>
            <div class="segmented">
              <button
                v-for="filter in approvalFilters"
                :key="filter"
                type="button"
                :class="{ active: approvalSearch.status === filter }"
                @click="approvalSearch.status = filter"
              >{{ filter }}</button>
            </div>
          </div>
          <div class="approval-filter-bar">
            <label>
              <span>审批人 ITCode</span>
              <input v-model.trim="approvalSearch.approverItcode" placeholder="输入审批人 ITCode">
            </label>
            <div class="approval-handler-filter">
              <span class="filter-label-row">处理人 <em>可输入处理人 ITCode 搜索并多选</em></span>
              <div class="handler-combobox" :class="{ focused: approvalSearch.handlerFocused }">
                <span v-for="handler in approvalSearch.handlers" :key="handler" class="handler-chip">
                  {{ handler }}
                  <button type="button" title="移除处理人" @click="removeApprovalHandler(handler)">×</button>
                </span>
                <input
                  v-model.trim="approvalSearch.handlerDraft"
                  :placeholder="handlerInputPlaceholder"
                  @focus="approvalSearch.handlerFocused = true"
                  @blur="deferCloseHandlerSuggestions"
                  @keydown.enter.prevent="addApprovalHandler"
                >
                <div v-if="showHandlerSuggestions" class="handler-suggestion-list">
                  <button
                    v-for="option in handlerSuggestions"
                    :key="option"
                    type="button"
                    @mousedown.prevent="selectApprovalHandler(option)"
                  >{{ option }}</button>
                </div>
              </div>
            </div>
            <button type="button" class="ghost-btn" @click="resetApprovalFilters">重置筛选</button>
          </div>
          <div class="permission-table-wrap">
            <table class="permission-table approval-table">
              <thead>
                <tr>
                  <th>单号</th>
                  <th>申请类型</th>
                  <th>申请人</th>
                  <th>申请人 ITCode</th>
                  <th>申请人邮箱</th>
                  <th>当前处理人</th>
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
                  <td>{{ row.applicantItcode }}</td>
                  <td>{{ row.applicantEmail }}</td>
                  <td>{{ row.handlers.join('、') }}</td>
                  <td>{{ row.node }}</td>
                  <td><span class="table-status" :class="row.statusKey">{{ row.status }}</span></td>
                  <td>{{ row.time }}</td>
                  <td>
                    <button v-if="row.statusKey === 'pending'" type="button" class="link-btn success" @click="openApprovalWorkspace(row, 'approve')">审批</button>
                    <button v-else type="button" class="link-btn" @click="openApprovalWorkspace(row, 'view')">查看</button>
                  </td>
                </tr>
                <tr v-if="!filteredApprovals.length">
                  <td colspan="10">
                    <div class="table-empty">
                      <b>没有匹配的审批任务</b>
                      <p>请调整审批人 ITCode、处理人或状态筛选后再查看。</p>
                    </div>
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
              <p>按角色组和角色名称快速定位，查看这个角色能做什么、能看什么、影响哪些人。</p>
            </div>
            <button type="button" class="primary-btn" @click="openRoleEditor('create')">新增角色</button>
          </div>

          <div class="role-filter-bar">
            <label>
              <span>角色名称</span>
              <input v-model.trim="roleFilters.keyword" placeholder="搜索角色名称">
            </label>
            <label>
              <span>角色组</span>
              <select v-model="roleFilters.group">
                <option value="">全部角色组</option>
                <option v-for="group in roleGroupOptions" :key="group" :value="group">{{ group }}</option>
              </select>
            </label>
            <button type="button" class="ghost-btn" @click="resetRoleFilters">重置筛选</button>
          </div>

          <div class="role-result-line">
            <span>共 {{ allRoles.length }} 个角色，当前显示 {{ filteredManagedRoles.length }} 个</span>
            <b v-if="roleFilters.keyword || roleFilters.group">已按条件筛选</b>
          </div>

          <div class="permission-table-wrap role-table-wrap">
            <table class="permission-table role-management-table">
              <thead>
                <tr>
                  <th>序号</th>
                  <th>业务负责人</th>
                  <th>角色组</th>
                  <th>角色名称</th>
                  <th>包含用户数</th>
                  <th>角色描述</th>
                  <th>操作</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="(role, index) in filteredManagedRoles" :key="role.id">
                  <td>{{ index + 1 }}</td>
                  <td>{{ role.owner }}</td>
                  <td>{{ role.group }}</td>
                  <td>
                    <div class="role-name-cell">
                      <b>{{ role.name }}</b>
                      <span v-if="role.systemRole" class="table-status pending">系统角色</span>
                    </div>
                  </td>
                  <td>{{ role.users }} 人</td>
                  <td class="role-desc-cell">{{ role.desc }}</td>
                  <td>
                    <div class="row-actions">
                      <button type="button" class="link-btn" @click="openRoleEditor('view', role)">查看</button>
                      <button type="button" class="link-btn" @click="openRoleEditor('edit', role)">编辑</button>
                      <button type="button" class="link-btn danger" @click="openRoleDeleteConfirm(role)">删除</button>
                    </div>
                  </td>
                </tr>
                <tr v-if="!filteredManagedRoles.length">
                  <td colspan="7">
                    <div class="table-empty">
                      <b>没有找到匹配的角色</b>
                      <p>请调整角色名称或角色组筛选条件后再试。</p>
                      <button type="button" class="ghost-btn small" @click="resetRoleFilters">重置筛选</button>
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>
        <section v-else-if="activeModule === 'users'" class="permission-card">
          <div class="section-title">
            <div>
              <h2>用户管理</h2>
              <p>按账号、姓名和 ITCode 绑定状态查找用户，维护基础信息、角色和角色之外的额外权限。</p>
            </div>
            <button type="button" class="primary-btn" @click="openUserWorkspace('create')">新增用户</button>
          </div>

          <div class="user-filter-bar">
            <label>
              <span>用户账号</span>
              <input v-model.trim="userFilters.account" placeholder="搜索用户账号或登录账号">
            </label>
            <label>
              <span>用户姓名</span>
              <input v-model.trim="userFilters.name" placeholder="搜索用户姓名">
            </label>
            <label>
              <span>是否绑定 IT code</span>
              <select v-model="userFilters.bindItcode">
                <option value="">全部</option>
                <option value="yes">已绑定</option>
                <option value="no">未绑定</option>
              </select>
            </label>
            <button type="button" class="ghost-btn" @click="resetUserFilters">重置筛选</button>
          </div>

          <div class="role-result-line">
            <span>共 {{ users.length }} 个用户，当前显示 {{ filteredUsers.length }} 个</span>
            <b v-if="hasUserFilters">已按条件筛选</b>
          </div>

          <div class="permission-table-wrap role-table-wrap">
            <table class="permission-table user-management-table">
              <thead>
                <tr>
                  <th>登录账号</th>
                  <th>用户姓名</th>
                  <th>有效期</th>
                  <th>状态</th>
                  <th>操作</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="user in filteredUsers" :key="user.userAccount">
                  <td>
                    <div class="user-account-cell">
                      <b>{{ user.loginAccount }}</b>
                      <small>{{ user.userAccount }} · {{ user.bindItcode ? '已绑定 IT code' : '未绑定 IT code' }}</small>
                    </div>
                  </td>
                  <td>{{ user.name }}</td>
                  <td>{{ user.validUntil }}</td>
                  <td><span class="table-status" :class="user.statusKey">{{ userStatusLabel(user) }}</span></td>
                  <td>
                    <div class="row-actions">
                      <button type="button" class="link-btn" @click="openUserWorkspace('edit', user)">编辑</button>
                      <button type="button" :class="['link-btn', user.status === 'enabled' ? 'danger' : 'success']" @click="openUserStatusConfirm(user)">{{ user.status === 'enabled' ? '禁用' : '启用' }}</button>
                      <button type="button" class="link-btn" @click="openUserDataWorkspace(user)">分配数据权限</button>
                      <button type="button" class="link-btn" @click="openUserRoleWorkspace(user)">设置角色</button>
                      <button type="button" class="link-btn" @click="openUserWorkspace('view', user)">详情</button>
                    </div>
                  </td>
                </tr>
                <tr v-if="!filteredUsers.length">
                  <td colspan="5">
                    <div class="table-empty">
                      <b>没有找到匹配的用户</b>
                      <p>请调整用户账号、用户姓名或 ITCode 绑定状态后再查看。</p>
                      <button type="button" class="ghost-btn small" @click="resetUserFilters">重置筛选</button>
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>
        <section v-else-if="activeModule === 'orgs'" class="permission-card org-workspace-card">
          <div class="section-title org-section-title">
            <div>
              <h2>组织管理</h2>
              <p>维护权限体系中的基础组织对象，用于角色归属、用户成员、数据范围和功能范围的统一引用。</p>
            </div>
            <div class="org-title-actions">
              <button type="button" class="ghost-btn" @click="openOrganizationEditor('create')">新增组织</button>
              <button type="button" class="primary-btn" @click="openOrganizationMemberModal">添加成员</button>
            </div>
          </div>

          <div class="org-metric-grid">
            <article>
              <span>组织总数</span>
              <b>{{ organizationStats.total }}</b>
              <small>含根组织和下级组织</small>
            </article>
            <article>
              <span>下级组织</span>
              <b>{{ organizationStats.children }}</b>
              <small>根组织之外的组织数量</small>
            </article>
            <article>
              <span>组织成员</span>
              <b>{{ organizationStats.members }}</b>
              <small>按当前 mock 成员统计</small>
            </article>
            <article>
              <span>负责人覆盖</span>
              <b>{{ organizationStats.ownerCoverage }}</b>
              <small>已配置负责人组织占比</small>
            </article>
          </div>

          <div class="org-workspace-layout">
            <aside class="org-tree-panel">
              <div class="org-panel-head">
                <div>
                  <b>组织架构</b>
                  <small>点击节点查看详情和成员</small>
                </div>
              </div>
              <div class="org-search-box">
                <input v-model.trim="organizationSearchKeyword" placeholder="搜索组织名称、编码、负责人">
                <button v-if="organizationSearchKeyword" type="button" class="link-btn" @click="organizationSearchKeyword = ''">清空</button>
              </div>
              <div v-if="filteredOrganizationTree.length" class="org-tree-list">
                <template v-for="org in filteredOrganizationTree" :key="org.id">
                  <button
                    type="button"
                    :class="['org-tree-node', { active: selectedOrganizationId === org.id }]"
                    :style="{ '--level': org.level }"
                    @click="selectOrganization(org.id)"
                  >
                    <span class="org-node-branch"></span>
                    <span class="org-node-main">
                      <b>{{ org.name }}</b>
                      <small>{{ org.code }} · {{ org.memberCount }} 人</small>
                    </span>
                  </button>
                  <button
                    v-for="child in org.children"
                    :key="child.id"
                    type="button"
                    :class="['org-tree-node', { active: selectedOrganizationId === child.id }]"
                    :style="{ '--level': child.level }"
                    @click="selectOrganization(child.id)"
                  >
                    <span class="org-node-branch"></span>
                    <span class="org-node-main">
                      <b>{{ child.name }}</b>
                      <small>{{ child.code }} · {{ child.memberCount }} 人</small>
                    </span>
                  </button>
                </template>
              </div>
              <div v-else class="scope-empty compact-empty org-empty">
                <b>没有找到匹配的组织</b>
                <p>请调整搜索关键词后再查看组织架构。</p>
                <button type="button" class="ghost-btn small" @click="organizationSearchKeyword = ''">重置搜索</button>
              </div>
            </aside>

            <section v-if="selectedOrganization" class="org-detail-panel">
              <div class="org-detail-head">
                <div>
                  <span>{{ selectedOrganization.code }}</span>
                  <h3>{{ selectedOrganization.name }}</h3>
                  <p>{{ selectedOrganization.description || '暂无组织描述，请补充该组织的职责边界和使用场景。' }}</p>
                </div>
                <div class="org-detail-actions">
                  <button type="button" class="ghost-btn small" @click="openOrganizationEditor('edit')">编辑信息</button>
                  <button type="button" class="danger-outline-btn small" @click="removeSelectedOrganization">移除组织</button>
                </div>
              </div>

              <dl class="org-detail-grid">
                <div>
                  <dt>负责人</dt>
                  <dd>{{ selectedOrganization.owner || '未配置' }}</dd>
                </div>
                <div>
                  <dt>上级组织</dt>
                  <dd>{{ organizationParentName(selectedOrganization) }}</dd>
                </div>
                <div>
                  <dt>组织层级</dt>
                  <dd>{{ selectedOrganization.level + 1 }} 级</dd>
                </div>
                <div>
                  <dt>成员数量</dt>
                  <dd>{{ selectedOrganization.memberCount }} 人</dd>
                </div>
                <div>
                  <dt>更新时间</dt>
                  <dd>{{ selectedOrganization.updatedAt }}</dd>
                </div>
                <div>
                  <dt>权限定位</dt>
                  <dd>{{ selectedOrganization.scope }}</dd>
                </div>
              </dl>


              <div class="org-member-head">
                <div>
                  <b>组织成员</b>
                  <small>展示该组织下已维护的人员、组织角色和权限身份。</small>
                </div>
                <button type="button" class="primary-btn" @click="openOrganizationMemberModal">添加成员</button>
              </div>
              <div class="permission-table-wrap org-member-table-wrap">
                <table v-if="selectedOrganizationMembers.length" class="permission-table org-member-table">
                  <thead>
                    <tr>
                      <th>姓名</th>
                      <th>账号</th>
                      <th>部门</th>
                      <th>组织角色</th>
                      <th>权限身份</th>
                      <th>操作</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr v-for="member in selectedOrganizationMembers" :key="member.account">
                      <td>{{ member.name }}</td>
                      <td>{{ member.account }}</td>
                      <td>{{ member.department }}</td>
                      <td>{{ member.orgRole }}</td>
                      <td>{{ member.permissionIdentity }}</td>
                      <td>
                        <div class="row-actions">
                          <button type="button" class="link-btn" @click="openOrganizationMemberModal(member)">编辑</button>
                          <button type="button" class="link-btn danger" @click="removeOrganizationMember(member.account)">移除</button>
                        </div>
                      </td>
                    </tr>
                  </tbody>
                </table>
                <div v-else class="table-empty">
                  <b>当前组织还没有成员</b>
                  <p>请点击“添加成员”，补充后会同步更新成员数量。</p>
                  <button type="button" class="ghost-btn small" @click="openOrganizationMemberModal">添加成员</button>
                </div>
              </div>
              <div v-if="organizationNotice" class="approval-feedback org-feedback">
                <span>{{ organizationNotice }}</span>
                <button type="button" aria-label="关闭提示" @click="dismissOrganizationNotice">×</button>
              </div>
            </section>
          </div>
        </section>


        <section v-else-if="activeModule === 'functions'" class="permission-card function-workspace-card">
          <div class="section-title function-section-title">
            <div>
              <h2>功能管理</h2>
              <p>维护菜单下的功能、按钮和 Skill 能力，并明确每项能力关联的后台接口。</p>
            </div>
            <button type="button" class="primary-btn" @click="openFunctionEditor('create')">新增功能</button>
          </div>
          <div class="function-filter-bar">
            <label>
              <span>名称</span>
              <input v-model.trim="functionFilters.name" placeholder="搜索功能名称">
            </label>
            <label>
              <span>目录</span>
              <select v-model="functionFilters.root" @change="syncFunctionMenuFilter">
                <option value="">全部目录</option>
                <option v-for="root in functionRootOptions" :key="root" :value="root">{{ root }}</option>
              </select>
            </label>
            <label>
              <span>菜单</span>
              <select v-model="functionFilters.menu">
                <option value="">全部菜单</option>
                <option v-for="menu in functionSecondMenuOptions" :key="menu" :value="menu">{{ menu }}</option>
              </select>
            </label>
            <label>
              <span>类型</span>
              <select v-model="functionFilters.type">
                <option value="">全部类型</option>
                <option v-for="type in functionTypeOptions" :key="type.value" :value="type.value">{{ type.label }}</option>
              </select>
            </label>
            <button type="button" class="ghost-btn" @click="resetFunctionFilters">重置筛选</button>
          </div>

          <div class="role-result-line function-result-line">
            <span>共 {{ managedFunctions.length }} 项功能，当前显示 {{ filteredManagedFunctions.length }} 项</span>
            <b v-if="hasFunctionFilters">已按条件筛选</b>
          </div>

          <div class="function-workspace-layout">
            <div class="permission-table-wrap function-table-wrap">
              <table v-if="filteredManagedFunctions.length" class="permission-table function-table">
                <thead>
                  <tr>
                    <th>名称</th>
                    <th>类型</th>
                    <th>描述</th>
                    <th>操作</th>
                  </tr>
                </thead>
                <tbody>
                  <tr
                    v-for="item in filteredManagedFunctions"
                    :key="item.id"
                    :class="{ active: selectedManagedFunction?.id === item.id }"
                    @click="selectManagedFunction(item.id)"
                  >
                    <td>
                      <div class="function-name-cell">
                        <b>{{ item.name }}</b>
                        <small>{{ item.menu }}</small>
                      </div>
                    </td>
                    <td><span class="function-type-badge">{{ functionTypeLabel(item.type) }}</span></td>
                    <td class="function-desc-cell">{{ item.description }}</td>
                    <td>
                      <div class="row-actions" @click.stop>
                        <button type="button" class="link-btn" @click="openFunctionEditor('edit', item)">编辑</button>
                      </div>
                    </td>
                  </tr>
                </tbody>
              </table>
              <div v-else class="table-empty function-empty">
                <b>没有找到匹配的功能</b>
                <p>请调整名称、目录、菜单或类型后再查看。</p>
                <button type="button" class="ghost-btn small" @click="resetFunctionFilters">重置筛选</button>
              </div>
            </div>

            <aside v-if="selectedManagedFunction" class="function-detail-panel">
              <div class="function-detail-head">
                <div>
                  <h3>{{ selectedManagedFunction.name }}</h3>
                  <p>{{ selectedManagedFunction.description }}</p>
                </div>
                <div class="function-detail-actions">
                  <button type="button" class="ghost-btn small" @click="openFunctionEditor('edit', selectedManagedFunction)">编辑</button>
                  <button type="button" class="danger-outline-btn small" @click="deleteSelectedManagedFunction">删除</button>
                </div>
              </div>
              <dl class="function-detail-grid">
                <div class="full"><dt>所属菜单</dt><dd>{{ selectedManagedFunction.menu }}</dd></div>
                <div><dt>功能名称</dt><dd>{{ selectedManagedFunction.name }}</dd></div>
                <div><dt>类型</dt><dd>{{ functionTypeLabel(selectedManagedFunction.type) }}</dd></div>
                <div class="full"><dt>功能描述</dt><dd>{{ selectedManagedFunction.description }}</dd></div>
              </dl>

              <div class="function-detail-block">
                <b>关联接口</b>
                <div v-if="selectedManagedFunction.interfaces.length" class="function-api-list">
                  <article v-for="api in selectedManagedFunction.interfaces" :key="api.id">
                    <span>{{ api.name }}</span>
                    <code>{{ api.url }}</code>
                  </article>
                </div>
                <p v-else class="function-muted">当前功能还没有关联接口。</p>
              </div>
            </aside>
          </div>

          <div v-if="functionNotice" class="approval-feedback function-feedback">
            <span>{{ functionNotice }}</span>
            <button type="button" aria-label="关闭提示" @click="dismissFunctionNotice">×</button>
          </div>
        </section>
        <section v-else-if="activeModule === 'datasource'" class="permission-card datasource-workspace-card">
          <div class="section-title datasource-section-title">
            <div>
              <h2>数据源管理</h2>
              <p>维护数据权限的基础对象，按分组、数据源和接口权限参数管理可授权范围。</p>
            </div>
            <button type="button" class="primary-btn" @click="openDataSourceEditor('create')">新增数据源</button>
          </div>

          <div class="datasource-filter-bar compact">
            <label>
              <span>分组</span>
              <select v-model="dataSourceFilters.group">
                <option value="">全部分组</option>
                <option v-for="option in dataSourceGroupOptions" :key="option" :value="option">{{ option }}</option>
              </select>
            </label>
            <label>
              <span>名称</span>
              <input v-model.trim="dataSourceFilters.name" placeholder="输入名称搜索">
            </label>
            <button type="button" class="ghost-btn" @click="resetDataSourceFilters">重置筛选</button>
          </div>

          <div class="role-result-line datasource-result-line">
            <span>共 {{ dataSources.length }} 个数据源，当前显示 {{ filteredDataSources.length }} 个</span>
            <b v-if="hasDataSourceFilters">已按条件筛选</b>
          </div>

          <div class="permission-table-wrap datasource-table-wrap flat">
            <table v-if="filteredDataSources.length" class="permission-table datasource-table flat">
              <thead>
                <tr>
                  <th>分组</th>
                  <th>数据源</th>
                  <th>名称</th>
                  <th>接口地址</th>
                  <th>权限参数</th>
                  <th>操作</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="row in filteredDataSources" :key="row.id">
                  <td>{{ row.group }}</td>
                  <td>{{ row.dataSource }}</td>
                  <td><b class="datasource-table-name">{{ row.name }}</b></td>
                  <td class="datasource-url-cell">{{ row.apiUrl }}</td>
                  <td>{{ row.permissionParam }}</td>
                  <td>
                    <div class="row-actions">
                      <button type="button" class="link-btn" @click="openDataSourceEditor('edit', row)">编辑</button>
                      <button type="button" class="link-btn danger" @click="deleteDataSource(row)">删除</button>
                      <button type="button" class="link-btn" @click="openDataSourceDetail(row)">详情</button>
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>
            <div v-else class="table-empty datasource-empty">
              <b>没有找到匹配的数据源</b>
              <p>请调整分组或名称后再查看。</p>
              <button type="button" class="ghost-btn small" @click="resetDataSourceFilters">重置筛选</button>
            </div>
          </div>

          <div v-if="dataSourceNotice" class="approval-feedback datasource-feedback">
            <span>{{ dataSourceNotice }}</span>
            <button type="button" aria-label="关闭提示" @click="dismissDataSourceNotice">×</button>
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
        <p>选择后会回写到当前申请。</p>
        <div class="picker-list">
          <button v-for="item in picker.options" :key="item" type="button" @click="choosePicker(item)">
            {{ item }}
          </button>
        </div>
      </div>
    </div>

    <div v-if="roleModal.visible" class="permission-modal permission-picker-layer" @click.self="closeRoleModal">
      <div class="modal-panel permission-picker-modal">
        <button type="button" class="modal-close" @click="closeRoleModal">×</button>
        <h3>添加角色</h3>
        <p class="modal-note">仅按角色名称和角色中包含的功能权限搜索。</p>
        <input v-model.trim="roleModal.keyword" class="modal-search-input" placeholder="搜索角色名称、功能权限">
        <div class="role-picker-list">
          <label v-for="role in filteredRoleOptions" :key="role.id" class="role-picker-row">
            <input type="checkbox" :checked="roleModal.selectedIds.includes(role.id)" @change="toggleTempRole(role.id)">
            <div>
              <b>{{ role.name }}</b>
              <p>{{ role.desc }}</p>
              <small>功能：{{ role.functionPermissionIds.map(permissionName).join('、') }}</small>
              <small>数据：{{ role.dataPermissionIds.map(dataPermissionName).join('、') }}</small>
            </div>
          </label>
        </div>
        <div class="modal-actions">
          <button type="button" class="ghost-btn" @click="closeRoleModal">取消</button>
          <button type="button" class="primary-btn" @click="confirmRoleSelection">确认</button>
        </div>
      </div>
    </div>

    <div v-if="copyModal.visible" class="permission-modal permission-picker-layer" @click.self="closeCopyModal">
      <div class="modal-panel small">
        <button type="button" class="modal-close" @click="closeCopyModal">×</button>
        <h3>复制他人权限</h3>
        <p class="modal-note">输入对方 ITCode 后，系统会把对方的角色、功能权限和数据权限回填到本次申请。</p>
        <label class="modal-form-field">
          <span class="field-label required">对方 ITCode <em>必填</em></span>
          <input
            v-model.trim="copyModal.itcode"
            :class="{ invalid: copyModal.error }"
            placeholder="例如 wangxt8"
            @keyup.enter="confirmCopyPermissions"
          >
          <small v-if="copyModal.error" class="field-error">{{ copyModal.error }}</small>
        </label>
        <div class="copy-user-hints">
          <span>可试用：wangxt8、liwen08、temp-bpo</span>
        </div>
        <div class="modal-actions">
          <button type="button" class="ghost-btn" @click="closeCopyModal">取消</button>
          <button type="button" class="primary-btn" @click="confirmCopyPermissions">确认复制</button>
        </div>
      </div>
    </div>

    <div v-if="dataModal.visible" class="permission-modal permission-picker-layer" @click.self="closeDataModal">
      <div class="modal-panel permission-picker-modal">
        <button type="button" class="modal-close" @click="closeDataModal">×</button>
        <h3>添加数据权限</h3>
        <p class="modal-note">默认展示系统全部数据权限，当前已带出的权限会自动选中，也可以取消。</p>
        <div class="data-tree-picker">
          <div v-for="group in dataPermissionTree" :key="group.id" class="data-tree-group">
            <b>{{ group.name }}</b>
            <div v-for="child in group.children" :key="child.id" class="data-tree-child">
              <span>{{ child.name }}</span>
              <label v-for="leaf in child.children" :key="leaf.id" class="data-tree-leaf">
                <input type="checkbox" :checked="dataModal.selectedIds.includes(leaf.id)" @change="toggleTempDataPermission(leaf.id)">
                <span>{{ leaf.name }}</span>
                <em v-if="copiedDataSourceMap[leaf.id]" :class="['source-tag', sourceClass(copiedDataSourceMap[leaf.id])]">{{ copiedDataSourceMap[leaf.id] }}</em>
              </label>
            </div>
          </div>
        </div>
        <div class="modal-actions">
          <button type="button" class="ghost-btn" @click="closeDataModal">取消</button>
          <button type="button" class="primary-btn" @click="confirmDataSelection">确认</button>
        </div>
      </div>
    </div>

    <div v-if="functionEditor.visible" class="permission-modal" @click.self="closeFunctionEditor">
      <div class="modal-panel function-editor-modal">
        <button type="button" class="modal-close" @click="closeFunctionEditor">×</button>
        <h3>{{ functionEditor.mode === 'create' ? '新增功能' : '编辑功能' }}</h3>
        <p class="modal-note">维护功能所在菜单、展示名称、业务说明、功能类型和关联接口。</p>
        <div class="permission-form-grid function-editor-form">
          <div class="permission-form-field function-menu-field">
            <span class="field-label required">所属菜单 <em>必填</em></span>
            <button type="button" :class="['function-menu-trigger', { invalid: functionEditor.errors.menu, active: functionEditor.menuPickerOpen }]" @click="functionEditor.menuPickerOpen = !functionEditor.menuPickerOpen">
              <span>{{ functionEditor.draft.menu || '请选择' }}</span>
              <i>⌄</i>
            </button>
            <div v-if="functionEditor.menuPickerOpen" class="function-menu-cascade">
              <div class="function-menu-column">
                <button
                  v-for="root in functionMenuTree"
                  :key="root.id"
                  type="button"
                  :class="{ active: functionEditor.menuRootId === root.id }"
                  @click="selectFunctionMenuRoot(root.id)"
                >
                  <span>{{ root.name }}</span>
                  <i>⌄</i>
                </button>
              </div>
              <div class="function-menu-column">
                <button
                  v-for="child in activeFunctionMenuChildren"
                  :key="child.id"
                  type="button"
                  :class="{ active: functionEditor.menuChildId === child.id }"
                  @click="selectFunctionMenuChild(child.id)"
                >
                  <span>{{ child.name }}</span>
                  <i>⌄</i>
                </button>
              </div>
              <div class="function-menu-column leaf">
                <button
                  v-for="leaf in activeFunctionMenuLeaves"
                  :key="leaf.id"
                  type="button"
                  :class="{ active: functionEditor.draft.menu === leaf.name }"
                  @click="selectFunctionMenuLeaf(leaf.name)"
                >{{ leaf.name }}</button>
              </div>
            </div>
            <small v-if="functionEditor.errors.menu" class="field-error">{{ functionEditor.errors.menu }}</small>
          </div>
          <label>
            <span class="field-label required">功能名称 <em>必填</em></span>
            <input v-model.trim="functionEditor.draft.name" :class="{ invalid: functionEditor.errors.name }" placeholder="例如：数据导出">
            <small v-if="functionEditor.errors.name" class="field-error">{{ functionEditor.errors.name }}</small>
          </label>
          <div class="permission-form-field full">
            <span class="field-label required">类型 <em>必填</em></span>
            <div class="handler-chip-list function-type-radio" :class="{ invalid: functionEditor.errors.type }">
              <button
                v-for="type in functionTypeOptions"
                :key="type.value"
                type="button"
                :class="{ active: functionEditor.draft.type === type.value }"
                @click="functionEditor.draft.type = type.value"
              >{{ type.label }}</button>
            </div>
            <small v-if="functionEditor.errors.type" class="field-error">{{ functionEditor.errors.type }}</small>
          </div>
          <label class="full">
            <span class="field-label required">功能描述 <em>必填</em></span>
            <textarea v-model.trim="functionEditor.draft.description" :class="{ invalid: functionEditor.errors.description }" rows="3" placeholder="说明该功能给谁使用、能完成什么操作。"></textarea>
            <small v-if="functionEditor.errors.description" class="field-error">{{ functionEditor.errors.description }}</small>
          </label>
        </div>

        <div class="function-interface-editor">
          <div class="permission-subhead custom-rule-head">
            <div>
              <b>关联接口</b>
              <small>选择接口名称后会带出接口地址，可添加多个接口；删除只影响当前功能配置。</small>
            </div>
          </div>
          <div class="function-interface-add">
            <label>
              <span>接口名称</span>
              <select v-model="functionEditor.selectedInterfaceId">
                <option disabled value="">请选择接口</option>
                <option v-for="api in availableFunctionInterfaces" :key="api.id" :value="api.id">{{ api.name }}</option>
              </select>
            </label>
            <label>
              <span>接口地址</span>
              <input :value="selectedFunctionInterface?.url || ''" readonly placeholder="选择接口后自动带出">
            </label>
            <button type="button" class="ghost-btn" @click="addFunctionInterface">添加</button>
          </div>
          <small v-if="functionEditor.errors.interfaces" class="field-error">{{ functionEditor.errors.interfaces }}</small>
          <table v-if="functionEditor.draft.interfaces.length" class="permission-table function-interface-table">
            <thead><tr><th>接口名称</th><th>接口地址</th><th>操作</th></tr></thead>
            <tbody>
              <tr v-for="api in functionEditor.draft.interfaces" :key="api.id">
                <td>{{ api.name }}</td>
                <td><code>{{ api.url }}</code></td>
                <td><button type="button" class="link-btn danger" @click="removeFunctionInterface(api.id)">删除</button></td>
              </tr>
            </tbody>
          </table>
          <div v-else class="scope-empty compact-empty function-interface-empty">
            <b>还没有关联接口</b>
            <p>请从上方下拉框选择接口后点击“添加”。</p>
          </div>
        </div>

        <span v-if="functionEditor.notice" class="approval-feedback">{{ functionEditor.notice }}</span>
        <div class="modal-actions">
          <button type="button" class="ghost-btn" @click="closeFunctionEditor">取消</button>
          <button v-if="functionEditor.mode === 'edit'" type="button" class="danger-outline-btn small" @click="deleteManagedFunction">删除</button>
          <button type="button" class="primary-btn" @click="saveFunctionEditor">保存</button>
        </div>
      </div>
    </div>
    <div v-if="dataSourceEditor.visible" class="permission-modal" @click.self="closeDataSourceEditor">
      <div class="modal-panel datasource-editor-modal">
        <button type="button" class="modal-close" @click="closeDataSourceEditor">×</button>
        <h3>{{ dataSourceEditor.mode === 'create' ? '新增数据源' : '编辑数据源' }}</h3>
        <p class="modal-note">维护接口授权所需的基础信息，保存后立即更新数据源列表。</p>
        <div class="permission-form-grid datasource-editor-form">
          <label><span class="field-label required">分组 <em>必填</em></span><select v-model="dataSourceEditor.draft.group" :class="{ invalid: dataSourceEditor.errors.group }"><option disabled value="">请选择分组</option><option v-for="option in dataSourceGroupOptions" :key="option" :value="option">{{ option }}</option></select><small v-if="dataSourceEditor.errors.group" class="field-error">{{ dataSourceEditor.errors.group }}</small></label>
          <label><span class="field-label required">数据源 <em>必填</em></span><select v-model="dataSourceEditor.draft.dataSource" :class="{ invalid: dataSourceEditor.errors.dataSource }"><option disabled value="">请选择数据源</option><option v-for="option in dataSourceNameOptions" :key="option" :value="option">{{ option }}</option></select><small v-if="dataSourceEditor.errors.dataSource" class="field-error">{{ dataSourceEditor.errors.dataSource }}</small></label>
          <label><span class="field-label required">名称 <em>必填</em></span><input v-model.trim="dataSourceEditor.draft.name" :class="{ invalid: dataSourceEditor.errors.name }" placeholder="例如：运营指标查询"><small v-if="dataSourceEditor.errors.name" class="field-error">{{ dataSourceEditor.errors.name }}</small></label>
          <label><span class="field-label required">接口地址 <em>必填</em></span><input v-model.trim="dataSourceEditor.draft.apiUrl" :class="{ invalid: dataSourceEditor.errors.apiUrl }" placeholder="例如：/api/ops/metrics"><small v-if="dataSourceEditor.errors.apiUrl" class="field-error">{{ dataSourceEditor.errors.apiUrl }}</small></label>
          <label><span class="field-label required">权限参数 <em>必填</em></span><input v-model.trim="dataSourceEditor.draft.permissionParam" :class="{ invalid: dataSourceEditor.errors.permissionParam }" placeholder="例如：regionCode"><small v-if="dataSourceEditor.errors.permissionParam" class="field-error">{{ dataSourceEditor.errors.permissionParam }}</small></label>
          <label><span>key</span><input v-model.trim="dataSourceEditor.draft.key" placeholder="例如：scope"></label>
          <label><span>Value</span><input v-model.trim="dataSourceEditor.draft.value" placeholder="例如：east"></label>
          <label><span>敏感性</span><select v-model="dataSourceEditor.draft.sensitivity"><option v-for="option in dataSourceSensitivityOptions" :key="option.value" :value="option.value">{{ option.label }}</option></select></label>
          <label class="full"><span>备注 <em>{{ dataSourceEditor.draft.remark.length }}/120</em></span><textarea v-model.trim="dataSourceEditor.draft.remark" :class="{ invalid: dataSourceEditor.errors.remark }" rows="4" placeholder="说明该参数用于什么授权场景，业务人员需要注意什么。"></textarea><small v-if="dataSourceEditor.errors.remark" class="field-error">{{ dataSourceEditor.errors.remark }}</small></label>
        </div>
        <span v-if="dataSourceEditor.notice" class="approval-feedback">{{ dataSourceEditor.notice }}</span>
        <div class="modal-actions"><button type="button" class="ghost-btn" @click="closeDataSourceEditor">取消</button><button type="button" class="primary-btn" @click="saveDataSourceEditor">保存</button></div>
      </div>
    </div>

    <div v-if="approvalWorkspace.visible && activeApproval" class="permission-modal" @click.self="closeApprovalWorkspace">
      <div class="modal-panel approval-workspace-modal">
        <button type="button" class="modal-close" @click="closeApprovalWorkspace">×</button>
        <div class="approval-workspace-head">
          <div>
            <h3>{{ approvalWorkspace.title }}</h3>
            <p>{{ activeApproval.id }} · {{ activeApproval.type }} · {{ activeApproval.node }}</p>
          </div>
          <span class="table-status" :class="activeApproval.statusKey">{{ activeApproval.status }}</span>
        </div>

        <div class="approval-workspace-body">
          <section class="approval-readonly-panel">
            <div class="scope-panel-head">
              <div>
                <b>基本信息</b>
                <small>申请人、被申请人和审批路径信息只读展示。</small>
              </div>
            </div>
            <dl class="approval-detail-grid">
              <template v-for="item in activeApprovalBasicFields" :key="item.label">
                <dt>{{ item.label }}</dt>
                <dd>{{ item.value }}</dd>
              </template>
            </dl>
          </section>

          <section v-if="approvalWorkspace.nodeType === 'business'" class="approval-edit-panel">
            <div class="scope-panel-head">
              <div>
                <b>业务归属</b>
                <small>业务负责人填写申请人的所属组织和所属租户，权限范围只读不可修改。</small>
              </div>
            </div>
            <div class="permission-form-grid approval-business-form">
              <div class="permission-form-field full">
                <span class="field-label required">所属组织 <em>必填</em></span>
                <div class="handler-chip-list organization-picker">
                  <button
                    v-for="org in organizationOptions"
                    :key="org"
                    type="button"
                    :class="{ active: approvalWorkspace.organizations.includes(org) }"
                    :disabled="!canEditBusinessOwnership"
                    @click="toggleApprovalOrganization(org)"
                  >{{ org }}</button>
                </div>
                <small v-if="approvalWorkspace.errors.organizations" class="field-error">{{ approvalWorkspace.errors.organizations }}</small>
              </div>
              <label>
                <span class="field-label required">所属租户 <em>必填</em></span>
                <select v-model="approvalWorkspace.tenant" :disabled="!canEditBusinessOwnership" :class="{ invalid: approvalWorkspace.errors.tenant }" @change="approvalWorkspace.errors.tenant = ''">
                  <option disabled value="">请选择所属租户</option>
                  <option v-for="tenant in tenantOptions" :key="tenant" :value="tenant">{{ tenant }}</option>
                </select>
                <small v-if="approvalWorkspace.errors.tenant" class="field-error">{{ approvalWorkspace.errors.tenant }}</small>
              </label>
            </div>
          </section>

          <section class="approval-readonly-panel">
            <div class="scope-panel-head">
              <div>
                <b>权限信息</b>
                <small>{{ activeApprovalPermissionSummary }}</small>
              </div>
              <div v-if="canEditApprovalPermission" class="scope-action-bar inline">
                <button type="button" class="primary-btn" @click="openRoleModal">添加角色</button>
                <button type="button" class="ghost-btn" @click="openCopyModal">复制他人权限</button>
                <button type="button" class="ghost-btn" @click="openDataModal">添加数据权限</button>
              </div>
            </div>
            <div class="scope-source-stack readonly-scope-stack">
              <div v-if="!activeApprovalHasPermission" class="scope-empty source-empty">
                <b>当前申请没有选择权限范围</b>
                <p>审批人可以退回申请，或在直线经理 / 业务负责人审批中补充必要权限。</p>
              </div>

              <article v-if="selectedRoles.length" class="scope-source-panel">
                <div class="scope-panel-head">
                  <div>
                    <b>添加角色</b>
                    <small>{{ selectedRoles.length }} 个角色，角色内绑定展示功能权限和数据权限</small>
                  </div>
                  <button v-if="canEditApprovalPermission" type="button" class="link-btn" @click="openRoleModal">调整角色</button>
                </div>
                <div class="source-role-list">
                  <div v-for="role in selectedRoles" :key="role.id" class="source-role-card">
                    <div class="source-role-title">
                      <div>
                        <b>{{ role.name }}</b>
                        <small>{{ role.desc }}</small>
                      </div>
                      <button v-if="canEditApprovalPermission" type="button" class="link-btn danger" @click="removeRole(role.id)">移除</button>
                    </div>
                    <div class="bound-permission-grid">
                      <div>
                        <span class="bound-title">功能权限</span>
                        <div class="permission-chip-list compact">
                          <span v-for="permission in roleFunctionPermissions(role)" :key="permission.id">{{ permission.name }}</span>
                        </div>
                      </div>
                      <div>
                        <div class="bound-title-row">
                          <span class="bound-title">数据权限</span>
                          <button v-if="canEditApprovalPermission" type="button" class="refresh-btn" title="恢复该角色带出的数据权限" @click="resetRoleDataPermissions(role.id)">↻</button>
                        </div>
                        <div v-if="roleDataPermissions(role).length" class="permission-chip-list compact">
                          <span v-for="permission in roleDataPermissions(role)" :key="permission.id">
                            {{ permission.name }}
                            <button v-if="canEditApprovalPermission" type="button" class="chip-remove" @click="removeDataPermission(permission.id)">×</button>
                          </span>
                        </div>
                        <small v-else class="bound-empty">该角色的数据权限已全部取消，可点击右侧复位按钮恢复。</small>
                      </div>
                    </div>
                  </div>
                </div>
              </article>

              <article v-if="copiedFromUser" class="scope-source-panel">
                <div class="scope-panel-head">
                  <div>
                    <b>复制他人权限</b>
                    <small>复制自 {{ copiedFromUser.name }}（{{ copiedFromUser.itcode }}）</small>
                  </div>
                  <button v-if="canEditApprovalPermission" type="button" class="link-btn" @click="clearCopiedPermissions">清除复制结果</button>
                </div>
                <div class="source-role-list">
                  <div v-for="role in copiedRoles" :key="role.id" class="source-role-card copied">
                    <div class="source-role-title">
                      <div>
                        <b>{{ role.name }}</b>
                        <small>{{ role.desc }}</small>
                      </div>
                    </div>
                    <div class="bound-permission-grid">
                      <div>
                        <span class="bound-title">功能权限</span>
                        <div class="permission-chip-list compact">
                          <span v-for="permission in roleFunctionPermissions(role)" :key="permission.id">{{ permission.name }}</span>
                        </div>
                      </div>
                      <div>
                        <div class="bound-title-row">
                          <span class="bound-title">数据权限</span>
                          <button v-if="canEditApprovalPermission" type="button" class="refresh-btn" title="恢复复制权限带出的数据权限" @click="resetCopiedRoleDataPermissions(role.id)">↻</button>
                        </div>
                        <div v-if="copiedRoleDataPermissions(role).length" class="permission-chip-list compact">
                          <span v-for="permission in copiedRoleDataPermissions(role)" :key="permission.id">
                            {{ permission.name }}
                            <em class="source-tag role">角色继承</em>
                            <button v-if="canEditApprovalPermission" type="button" class="chip-remove" @click="removeDataPermission(permission.id)">×</button>
                          </span>
                        </div>
                        <small v-else class="bound-empty">该权限来源的数据权限已全部取消，可点击右侧复位按钮恢复。</small>
                      </div>
                    </div>
                  </div>
                  <div v-if="copiedExtraFunctionPermissions.length || hasCopiedUserGrantedData" class="source-role-card copied">
                    <div class="source-role-title">
                      <div>
                        <b>对方单独授权</b>
                        <small>不属于角色的权限，也会作为本次申请参考。</small>
                      </div>
                    </div>
                    <div class="bound-permission-grid">
                      <div>
                        <span class="bound-title">功能权限</span>
                        <div v-if="copiedExtraFunctionPermissions.length" class="permission-chip-list compact">
                          <span v-for="permission in copiedExtraFunctionPermissions" :key="permission.id">{{ permission.name }}</span>
                        </div>
                        <small v-else class="bound-empty">无单独功能权限。</small>
                      </div>
                      <div>
                        <div class="bound-title-row">
                          <span class="bound-title">数据权限</span>
                          <button v-if="canEditApprovalPermission" type="button" class="refresh-btn" title="恢复对方单独授权的数据权限" @click="resetCopiedUserDataPermissions">↻</button>
                        </div>
                        <div v-if="copiedUserGrantedDataPermissions.length" class="permission-chip-list compact">
                          <span v-for="permission in copiedUserGrantedDataPermissions" :key="permission.id">
                            {{ permission.name }}
                            <em class="source-tag user">用户单独授权</em>
                            <button v-if="canEditApprovalPermission" type="button" class="chip-remove" @click="removeDataPermission(permission.id)">×</button>
                          </span>
                        </div>
                        <small v-else class="bound-empty">对方单独授权的数据权限已全部取消，可点击右侧复位按钮恢复。</small>
                      </div>
                    </div>
                  </div>
                </div>
              </article>

              <article v-if="manualDataPermissionDetails.length" class="scope-source-panel">
                <div class="scope-panel-head">
                  <div>
                    <b>添加数据权限</b>
                    <small>{{ manualDataPermissionDetails.length }} 项本次新增数据权限</small>
                  </div>
                  <button v-if="canEditApprovalPermission" type="button" class="link-btn" @click="openDataModal">调整数据权限</button>
                </div>
                <div class="permission-chip-list compact manual-data-list">
                  <span v-for="permission in manualDataPermissionDetails" :key="permission.id">
                    {{ permission.name }}
                    <button v-if="canEditApprovalPermission" type="button" class="chip-remove" @click="removeDataPermission(permission.id)">×</button>
                  </span>
                </div>
              </article>
            </div>
          </section>

          <section v-if="approvalWorkspace.mode === 'approve'" class="approval-decision-panel">
            <div class="scope-panel-head">
              <div>
                <b>{{ approvalDecisionTitle }}</b>
                <small>{{ approvalDecisionHint }}</small>
              </div>
            </div>
            <div class="approval-result-options" role="radiogroup" aria-label="审批结果">
              <button
                v-for="option in approvalResultOptions"
                :key="option.value"
                type="button"
                :class="{ active: approvalWorkspace.result === option.value }"
                @click="selectApprovalResult(option.value)"
              >{{ option.label }}</button>
            </div>
            <small v-if="approvalWorkspace.errors.result" class="field-error">{{ approvalWorkspace.errors.result }}</small>
            <label class="modal-form-field">
              <span>审批意见</span>
              <textarea v-model.trim="approvalWorkspace.opinion" rows="4" placeholder="请说明审批意见或需要申请人补充的内容。"></textarea>
            </label>
            <div class="approval-submit-note">
              <b>提交后将更新列表状态</b>
              <p>{{ approvalSubmitImpact }}</p>
            </div>
          </section>
        </div>

        <div class="modal-actions sticky-actions">
          <span v-if="approvalWorkspace.notice" class="approval-feedback">{{ approvalWorkspace.notice }}</span>
          <button type="button" class="ghost-btn" @click="closeApprovalWorkspace">{{ approvalWorkspace.mode === 'view' ? '关闭' : '取消' }}</button>
          <button v-if="approvalWorkspace.mode === 'approve'" type="button" class="primary-btn" @click="submitApprovalDecision">提交审批</button>
        </div>
      </div>
    </div>
    <div v-if="roleEditor.visible" class="permission-modal" @click.self="closeRoleEditor">
      <div class="modal-panel role-editor-modal">
        <button type="button" class="modal-close" @click="closeRoleEditor">×</button>
        <div class="role-editor-head">
          <div>
            <h3>{{ roleEditorTitle }}</h3>
            <p>{{ roleEditor.mode === 'view' ? '当前为只读查看，可切换到编辑后维护角色信息和权限范围。' : '保存前仅修改当前草稿，取消不会影响角色列表和申请流程。' }}</p>
          </div>
          <span v-if="roleEditor.draft.sensitivity" :class="['sensitivity-badge', sensitivityRisk(roleEditor.draft.sensitivity)]">{{ sensitivityLabel(roleEditor.draft.sensitivity) }}</span>
        </div>

        <div class="role-impact-strip">
          <span>影响用户 <b>{{ roleEditor.draft.users || 0 }}</b> 人</span>
          <span>功能权限 <b>{{ roleEditor.draft.functionPermissionIds.length }}</b> 项</span>
          <span>普通数据权限 <b>{{ roleEditor.draft.dataPermissionIds.length }}</b> 项</span>
          <span>自定义授权 <b>{{ roleEditor.draft.customDataRules.length }}</b> 条</span>
        </div>

        <div class="role-editor-tabs" role="tablist" aria-label="角色编辑区">
          <button type="button" :class="{ active: roleEditor.activeTab === 'basic' }" @click="roleEditor.activeTab = 'basic'">基本信息</button>
          <button type="button" :class="{ active: roleEditor.activeTab === 'function' }" @click="roleEditor.activeTab = 'function'">功能权限</button>
          <button type="button" :class="{ active: roleEditor.activeTab === 'data' }" @click="roleEditor.activeTab = 'data'">数据权限</button>
        </div>

        <section v-if="roleEditor.activeTab === 'basic'" class="role-editor-section">
          <div class="permission-form-grid role-basic-form">
            <label>
              <span class="field-label required">角色名称 <em>必填</em></span>
              <input v-model.trim="roleEditor.draft.name" :readonly="roleEditorReadonly" :class="{ invalid: roleEditor.errors.name }" placeholder="例如：运营分析 PM">
              <small v-if="roleEditor.errors.name" class="field-error">{{ roleEditor.errors.name }}</small>
            </label>
            <label>
              <span class="field-label required">角色类型 <em>必填</em></span>
              <select v-model="roleEditor.draft.type" :disabled="roleEditorReadonly" :class="{ invalid: roleEditor.errors.type }">
                <option disabled value="">请选择角色类型</option>
                <option v-for="type in roleTypeOptions" :key="type" :value="type">{{ type }}</option>
              </select>
              <small v-if="roleEditor.errors.type" class="field-error">{{ roleEditor.errors.type }}</small>
            </label>
            <label>
              <span class="field-label required">角色组 <em>必填</em></span>
              <select v-model="roleEditor.draft.group" :disabled="roleEditorReadonly" :class="{ invalid: roleEditor.errors.group }">
                <option disabled value="">请选择角色组</option>
                <option v-for="group in roleGroupOptions" :key="group" :value="group">{{ group }}</option>
              </select>
              <small v-if="roleEditor.errors.group" class="field-error">{{ roleEditor.errors.group }}</small>
            </label>
            <label>
              <span class="field-label required">业务负责人 <em>必填</em></span>
              <input v-model.trim="roleEditor.draft.owner" :readonly="roleEditorReadonly" :class="{ invalid: roleEditor.errors.owner }" placeholder="输入负责人 ITCode 或姓名">
              <small v-if="roleEditor.errors.owner" class="field-error">{{ roleEditor.errors.owner }}</small>
            </label>
            <label class="full">
              <span>角色描述</span>
              <textarea v-model.trim="roleEditor.draft.desc" :readonly="roleEditorReadonly" rows="3" placeholder="说明这个角色能做什么、适合哪些人员使用。"></textarea>
            </label>
            <label class="full">
              <span class="field-label required">敏感性 <em>必填</em></span>
              <select v-model="roleEditor.draft.sensitivity" :disabled="roleEditorReadonly">
                <option v-for="option in sensitivityOptions" :key="option.value" :value="option.value">{{ option.label }}</option>
              </select>
              <small class="field-help">{{ sensitivityDescription(roleEditor.draft.sensitivity) }}</small>
            </label>
          </div>
        </section>

        <section v-else-if="roleEditor.activeTab === 'function'" class="role-editor-section">
          <div class="permission-editor-grid">
            <div class="permission-tree-panel">
              <div class="permission-subhead">
                <b>可选功能权限</b>
                <small>已选 {{ roleEditor.draft.functionPermissionIds.length }} 项，勾选后会同步到右侧表格。</small>
              </div>
              <div class="data-tree-picker role-permission-tree">
                <div v-for="group in functionPermissionTree" :key="group.id" class="data-tree-group">
                  <b>{{ group.name }}</b>
                  <div v-for="child in group.children" :key="child.id" class="data-tree-child">
                    <span>{{ child.name }}</span>
                    <label v-for="leaf in child.children" :key="leaf.id" class="data-tree-leaf">
                      <input type="checkbox" :disabled="roleEditorReadonly" :checked="roleEditor.draft.functionPermissionIds.includes(leaf.id)" @change="toggleRoleFunctionPermission(leaf.id)">
                      <span>{{ leaf.name }}</span>
                    </label>
                  </div>
                </div>
              </div>
            </div>
            <div class="permission-selected-panel">
              <div class="permission-subhead">
                <b>已添加功能权限</b>
                <small>取消勾选后将从角色中移除，保存后才生效。</small>
              </div>
              <table v-if="roleEditorSelectedFunctionPermissions.length" class="permission-table selected-permission-table">
                <thead>
                  <tr>
                    <th>选择</th>
                    <th>名称</th>
                    <th>备注</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="permission in roleEditorSelectedFunctionPermissions" :key="permission.id">
                    <td><input type="checkbox" :disabled="roleEditorReadonly" checked @change="toggleRoleFunctionPermission(permission.id)"></td>
                    <td>{{ permission.name }}</td>
                    <td><input v-model.trim="roleEditor.draft.functionPermissionNotes[permission.id]" :readonly="roleEditorReadonly" placeholder="选填"></td>
                  </tr>
                </tbody>
              </table>
              <div v-else class="scope-empty compact-empty">
                <b>还没有选择功能权限</b>
                <p>请从左侧树中勾选需要加入角色的功能。</p>
              </div>
            </div>
          </div>
        </section>

        <section v-else class="role-editor-section">
          <div class="role-data-tabs" role="tablist" aria-label="数据权限类型">
            <button type="button" :class="{ active: roleEditor.dataTab === 'normal', locked: roleCustomDataLocked }" @click="switchRoleDataTab('normal')">普通授权</button>
            <button type="button" :class="{ active: roleEditor.dataTab === 'custom', locked: roleNormalDataLocked }" @click="switchRoleDataTab('custom')">自定义授权</button>
          </div>

          <div v-if="roleDataModeNotice || roleEditor.errors.dataMode" :class="['data-mode-notice', { error: roleEditor.errors.dataMode }]">{{ roleEditor.errors.dataMode || roleDataModeNotice }}</div>
          <div v-if="roleEditor.dataTab === 'normal'" class="permission-editor-grid">
            <div class="permission-tree-panel">
              <div class="permission-subhead">
                <b>可选普通数据权限</b>
                <small>树形展示到末级，已选节点会保持勾选状态。</small>
              </div>
              <div class="data-tree-picker role-permission-tree">
                <div v-for="group in dataPermissionTree" :key="group.id" class="data-tree-group">
                  <b>{{ group.name }}</b>
                  <div v-for="child in group.children" :key="child.id" class="data-tree-child">
                    <span>{{ child.name }}</span>
                    <label v-for="leaf in child.children" :key="leaf.id" class="data-tree-leaf">
                      <input type="checkbox" :disabled="roleEditorReadonly || roleCustomDataLocked" :checked="roleEditor.draft.dataPermissionIds.includes(leaf.id)" @change="toggleRoleDataPermission(leaf.id)">
                      <span>{{ leaf.name }}</span>
                    </label>
                  </div>
                </div>
              </div>
            </div>
            <div class="permission-selected-panel">
              <div class="permission-subhead">
                <b>已添加普通数据权限</b>
                <small>取消勾选后从角色普通数据权限中移除。</small>
              </div>
              <table v-if="roleEditorSelectedDataPermissions.length" class="permission-table selected-permission-table">
                <thead>
                  <tr>
                    <th>选择</th>
                    <th>名称</th>
                    <th>备注</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="permission in roleEditorSelectedDataPermissions" :key="permission.id">
                    <td><input type="checkbox" :disabled="roleEditorReadonly" checked @change="toggleRoleDataPermission(permission.id)"></td>
                    <td>{{ permission.name }}</td>
                    <td><input v-model.trim="roleEditor.draft.dataPermissionNotes[permission.id]" :readonly="roleEditorReadonly" placeholder="选填"></td>
                  </tr>
                </tbody>
              </table>
              <div v-else class="scope-empty compact-empty">
                <b>还没有选择普通数据权限</b>
                <p>请从左侧树中勾选角色可以查看的数据范围。</p>
              </div>
            </div>
          </div>

          <div v-else class="custom-rule-panel">
            <div class="permission-subhead custom-rule-head">
              <div>
                <b>自定义授权</b>
                <small>用于表达角色普通权限之外的特殊数据范围，例如字段级、组织级、地域级或临时授权。</small>
              </div>
              <button v-if="!roleEditorReadonly" type="button" class="ghost-btn" :disabled="roleNormalDataLocked" @click="addCustomDataRule">新增自定义授权</button>
            </div>
            <table v-if="roleEditor.draft.customDataRules.length" class="permission-table custom-rule-table">
              <thead>
                <tr>
                  <th>数据集</th>
                  <th>字段范围</th>
                  <th>组织范围</th>
                  <th>地域范围</th>
                  <th>生效周期</th>
                  <th>备注</th>
                  <th>操作</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="rule in roleEditor.draft.customDataRules" :key="rule.id">
                  <td><input v-model.trim="rule.dataset" :readonly="roleEditorReadonly" placeholder="数据集"></td>
                  <td><input v-model.trim="rule.fields" :readonly="roleEditorReadonly" placeholder="字段范围"></td>
                  <td><input v-model.trim="rule.organization" :readonly="roleEditorReadonly" placeholder="组织范围"></td>
                  <td><input v-model.trim="rule.region" :readonly="roleEditorReadonly" placeholder="地域范围"></td>
                  <td><input v-model.trim="rule.period" :readonly="roleEditorReadonly" placeholder="生效周期"></td>
                  <td><input v-model.trim="rule.remark" :readonly="roleEditorReadonly" placeholder="选填"></td>
                  <td><button v-if="!roleEditorReadonly" type="button" class="link-btn danger" @click="removeCustomDataRule(rule.id)">删除</button></td>
                </tr>
              </tbody>
            </table>
            <div v-else class="scope-empty compact-empty">
              <b>还没有自定义授权</b>
              <p>普通授权无法覆盖的临时或特殊范围，可以在这里新增规则。</p>
            </div>
          </div>
        </section>

        <div class="modal-actions sticky-actions">
          <span v-if="roleEditor.notice" class="approval-feedback">{{ roleEditor.notice }}</span>
          <button type="button" class="ghost-btn" @click="closeRoleEditor">{{ roleEditor.mode === 'view' ? '关闭' : '取消' }}</button>
          <button v-if="roleEditor.mode === 'view'" type="button" class="primary-btn" @click="switchRoleEditorToEdit">进入编辑</button>
          <button v-else type="button" class="primary-btn" @click="saveRoleEditor">保存</button>
        </div>
      </div>
    </div>

    <div v-if="roleDeleteConfirm.visible" class="permission-modal" @click.self="closeRoleDeleteConfirm">
      <div class="modal-panel small">
        <button type="button" class="modal-close" @click="closeRoleDeleteConfirm">×</button>
        <h3>删除角色确认</h3>
        <p class="modal-note">{{ roleDeleteImpactText }}</p>
        <div v-if="roleDeleteBlockReason" class="delete-block-box">
          <b>暂不能删除</b>
          <p>{{ roleDeleteBlockReason }}</p>
        </div>
        <div v-else class="delete-impact-list">
          <span>功能权限 {{ roleDeleteConfirm.role?.functionPermissionIds?.length || 0 }} 项</span>
          <span>普通数据权限 {{ roleDeleteConfirm.role?.dataPermissionIds?.length || 0 }} 项</span>
          <span>自定义授权 {{ roleDeleteConfirm.role?.customDataRules?.length || 0 }} 条</span>
        </div>
        <div class="modal-actions">
          <button type="button" class="ghost-btn" @click="closeRoleDeleteConfirm">取消</button>
          <button v-if="!roleDeleteBlockReason" type="button" class="danger-btn" @click="confirmDeleteRole">确认删除</button>
        </div>
      </div>
    </div>
    <div v-if="userWorkspace.visible" class="permission-modal" @click.self="closeUserWorkspace">
      <div class="modal-panel role-editor-modal user-editor-modal">
        <button type="button" class="modal-close" @click="closeUserWorkspace">×</button>
        <div class="role-editor-head">
          <div>
            <h3>{{ userWorkspaceTitle }}</h3>
            <p>{{ userWorkspace.mode === 'view' ? '当前为只读详情，可查看基础信息、已分配角色和角色之外的额外数据权限。' : '保存前仅修改当前草稿，取消不会影响用户列表。' }}</p>
          </div>
          <span v-if="userWorkspace.draft" class="table-status user-modal-status" :class="userWorkspace.draft.statusKey">{{ userStatusLabel(userWorkspace.draft) }}</span>
        </div>

        <div v-if="userWorkspace.draft" class="role-impact-strip user-impact-strip">
          <span>已分配角色 <b>{{ userWorkspace.draft.roleIds.length }}</b> 个</span>
          <span>额外普通数据 <b>{{ userWorkspace.draft.extraDataPermissionIds.length }}</b> 项</span>
          <span>自定义数据授权 <b>{{ userWorkspace.draft.customDataRules.length }}</b> 条</span>
        </div>

        <div v-if="showUserApplicationNoField" class="user-application-strip">
          <label>
            <span class="field-label required">申请单号 <em>必填</em></span>
            <input v-model.trim="userWorkspace.applicationNo" :class="{ invalid: userWorkspace.errors.applicationNo }" placeholder="例如 AP-20260714-018">
            <small v-if="userWorkspace.errors.applicationNo" class="field-error">{{ userWorkspace.errors.applicationNo }}</small>
          </label>
        </div>

        <div class="role-editor-tabs" role="tablist" aria-label="用户编辑区">
          <button type="button" :class="{ active: userWorkspace.activeTab === 'basic' }" @click="userWorkspace.activeTab = 'basic'">基本信息</button>
          <button type="button" :class="{ active: userWorkspace.activeTab === 'roles' }" @click="userWorkspace.activeTab = 'roles'">已分配角色</button>
          <button type="button" :class="{ active: userWorkspace.activeTab === 'data' }" @click="userWorkspace.activeTab = 'data'">数据权限</button>
          <button type="button" :class="{ active: userWorkspace.activeTab === 'history' }" @click="userWorkspace.activeTab = 'history'">历史变更</button>
          <button type="button" :class="{ active: userWorkspace.activeTab === 'login' }" @click="userWorkspace.activeTab = 'login'">登录日志</button>
        </div>

        <section v-if="userWorkspace.draft && userWorkspace.activeTab === 'basic'" class="role-editor-section">
          <div class="permission-form-grid role-basic-form">
            <label>
              <span class="field-label required">用户账号 <em>必填</em></span>
              <input v-model.trim="userWorkspace.draft.userAccount" :readonly="userWorkspaceReadonly" :class="{ invalid: userWorkspace.errors.userAccount }" placeholder="例如 U-10032">
              <small v-if="userWorkspace.errors.userAccount" class="field-error">{{ userWorkspace.errors.userAccount }}</small>
            </label>
            <label>
              <span class="field-label required">登陆账号 <em>必填</em></span>
              <input v-model.trim="userWorkspace.draft.loginAccount" :readonly="userWorkspaceReadonly" :class="{ invalid: userWorkspace.errors.loginAccount }" placeholder="例如 zhangrui32">
              <small v-if="userWorkspace.errors.loginAccount" class="field-error">{{ userWorkspace.errors.loginAccount }}</small>
            </label>
            <div class="permission-form-field">
              <span class="field-label required">是否绑定 IT code <em>必填</em></span>
              <div class="handler-chip-list organization-picker">
                <button type="button" :disabled="userWorkspaceReadonly" :class="{ active: userWorkspace.draft.bindItcode }" @click="setUserBindItcode(true)">已绑定</button>
                <button type="button" :disabled="userWorkspaceReadonly" :class="{ active: !userWorkspace.draft.bindItcode }" @click="setUserBindItcode(false)">未绑定</button>
              </div>
            </div>
            <label>
              <span>手机号</span>
              <input v-model.trim="userWorkspace.draft.mobile" :readonly="userWorkspaceReadonly" placeholder="请输入手机号">
            </label>
            <label>
              <span>邮箱</span>
              <input v-model.trim="userWorkspace.draft.email" :readonly="userWorkspaceReadonly" placeholder="name@lenovo.com">
            </label>
            <label>
              <span class="field-label required">有效期 <em>必填</em></span>
              <input v-model.trim="userWorkspace.draft.validUntil" :readonly="userWorkspaceReadonly" :class="{ invalid: userWorkspace.errors.validUntil }" placeholder="例如 2026-12-31">
              <small v-if="userWorkspace.errors.validUntil" class="field-error">{{ userWorkspace.errors.validUntil }}</small>
            </label>
            <label>
              <span>用户类型</span>
              <select v-model="userWorkspace.draft.userType" :disabled="userWorkspaceReadonly">
                <option v-for="type in userTypeOptions" :key="type" :value="type">{{ type }}</option>
              </select>
            </label>
            <label>
              <span>所属租户</span>
              <select v-model="userWorkspace.draft.tenant" :disabled="userWorkspaceReadonly">
                <option v-for="tenant in tenantOptions" :key="tenant" :value="tenant">{{ tenant }}</option>
              </select>
            </label>
            <label>
              <span>所属组织</span>
              <select v-model="userWorkspace.draft.organization" :disabled="userWorkspaceReadonly">
                <option v-for="org in organizationOptions" :key="org" :value="org">{{ org }}</option>
              </select>
            </label>
            <label>
              <span :class="['field-label', { required: userWorkspace.draft.bindItcode }]">内部 AD 账户 <em v-if="userWorkspace.draft.bindItcode">必填</em></span>
              <input v-model.trim="userWorkspace.draft.internalAdAccount" :readonly="userWorkspaceReadonly" :class="{ invalid: userWorkspace.errors.internalAdAccount }" placeholder="绑定 IT code 时填写内部 AD 账户">
              <small v-if="userWorkspace.errors.internalAdAccount" class="field-error">{{ userWorkspace.errors.internalAdAccount }}</small>
            </label>
            <label class="full">
              <span>备注</span>
              <textarea v-model.trim="userWorkspace.draft.remark" :readonly="userWorkspaceReadonly" rows="3" placeholder="补充账号用途、临时授权说明或运营备注。"></textarea>
            </label>
          </div>
        </section>

        <section v-else-if="userWorkspace.draft && userWorkspace.activeTab === 'roles'" class="role-editor-section">
          <div class="permission-subhead custom-rule-head">
            <div>
              <b>已分配角色</b>
              <small>这里展示用户已有角色，角色带来的功能和数据权限只读展示。</small>
            </div>
            <button v-if="!userWorkspaceReadonly" type="button" class="primary-btn" @click="openUserRoleModal(userWorkspace.draft)">添加角色</button>
          </div>
          <div v-if="userDraftRoles.length" class="source-role-list">
            <div v-for="role in userDraftRoles" :key="role.id" class="source-role-card">
              <div class="source-role-title">
                <div>
                  <b>{{ role.name }}</b>
                  <small>{{ role.group }} · {{ role.desc }}</small>
                </div>
                <div class="role-card-actions">
                  <span :class="['sensitivity-badge', sensitivityRisk(role.sensitivity)]">{{ sensitivityLabel(role.sensitivity) }}</span>
                  <button v-if="!userWorkspaceReadonly" type="button" class="link-btn danger" @click="removeUserDraftRole(role.id)">移除</button>
                </div>
              </div>
              <div class="bound-permission-grid">
                <div>
                  <span class="bound-title">角色功能权限</span>
                  <div class="permission-chip-list compact">
                    <span v-for="permission in roleFunctionPermissions(role)" :key="permission.id">{{ permission.name }}</span>
                  </div>
                </div>
                <div>
                  <div class="bound-title-row">
                    <span class="bound-title">角色数据权限</span>
                    <button v-if="!userWorkspaceReadonly" type="button" class="refresh-btn" title="恢复该角色带出的数据权限" @click="resetUserRoleDataPermissions(role.id)">↻</button>
                  </div>
                  <div v-if="userDraftRoleDataPermissions(role).length" class="permission-chip-list compact">
                    <span v-for="permission in userDraftRoleDataPermissions(role)" :key="permission.id">
                      {{ permission.name }}
                      <em class="source-tag role">角色继承</em>
                      <button v-if="!userWorkspaceReadonly" type="button" class="chip-remove" title="移除该角色数据权限" @click="removeUserRoleDataPermission(role.id, permission.id)">×</button>
                    </span>
                  </div>
                  <small v-else class="bound-empty">该角色的数据权限已全部移除，可点击右侧复位按钮恢复。</small>
                </div>
              </div>
            </div>
          </div>
          <div v-else class="scope-empty compact-empty">
            <b>还没有分配角色</b>
            <p>请点击“添加角色”，为用户补充基础角色；用户层面仅支持额外数据权限。</p>
          </div>
        </section>
        <section v-else-if="userWorkspace.draft && userWorkspace.activeTab === 'data'" class="role-editor-section">
          <div class="role-data-tabs" role="tablist" aria-label="用户数据权限类型">
            <button type="button" :class="{ active: userWorkspace.dataTab === 'normal', locked: userCustomDataLocked }" @click="switchUserDataTab('normal')">普通授权</button>
            <button type="button" :class="{ active: userWorkspace.dataTab === 'custom', locked: userNormalDataLocked }" @click="switchUserDataTab('custom')">自定义授权</button>
          </div>
          <div v-if="userDataModeNotice || userWorkspace.errors.dataMode" :class="['data-mode-notice', { error: userWorkspace.errors.dataMode }]">{{ userWorkspace.errors.dataMode || userDataModeNotice }}</div>
          <div v-if="userWorkspace.dataTab === 'normal'" class="permission-editor-grid">
            <div class="permission-tree-panel">
              <div class="permission-subhead"><b>可额外授予的数据权限</b><small>角色继承的数据权限只读展示；这里保存角色之外的用户单独授权。</small></div>
              <div class="data-tree-picker role-permission-tree">
                <div v-for="group in dataPermissionTree" :key="group.id" class="data-tree-group">
                  <b>{{ group.name }}</b>
                  <div v-for="child in group.children" :key="child.id" class="data-tree-child">
                    <span>{{ child.name }}</span>
                    <label v-for="leaf in child.children" :key="leaf.id" class="data-tree-leaf">
                      <input type="checkbox" :disabled="userWorkspaceReadonly || userCustomDataLocked || userDraftInheritedDataIds.includes(leaf.id)" :checked="userWorkspace.draft.extraDataPermissionIds.includes(leaf.id) || userDraftInheritedDataIds.includes(leaf.id)" @change="toggleUserExtraData(leaf.id)">
                      <span>{{ leaf.name }}</span>
                      <em v-if="userDraftInheritedDataIds.includes(leaf.id)" class="source-tag role">角色继承</em>
                      <em v-else-if="userWorkspace.draft.extraDataPermissionIds.includes(leaf.id)" class="source-tag user">用户单独授权</em>
                    </label>
                  </div>
                </div>
              </div>
            </div>
            <div class="permission-selected-panel">
              <div class="permission-subhead"><b>已额外授予普通数据</b></div>
              <table v-if="userDraftExtraDataPermissions.length" class="permission-table selected-permission-table">
                <thead><tr><th>选择</th><th>名称</th><th>来源</th></tr></thead>
                <tbody>
                  <tr v-for="permission in userDraftExtraDataPermissions" :key="permission.id">
                    <td><input type="checkbox" :disabled="userWorkspaceReadonly" checked @change="toggleUserExtraData(permission.id)"></td>
                    <td>{{ permission.name }}</td>
                    <td><em class="source-tag user">用户单独授权</em></td>
                  </tr>
                </tbody>
              </table>
              <div v-else class="scope-empty compact-empty"><b>没有额外普通数据权限</b><p>当前用户仅使用角色继承的数据权限。</p></div>
            </div>
          </div>
          <div v-else class="custom-rule-panel">
            <div class="permission-subhead custom-rule-head">
              <div><b>用户自定义授权</b><small>用于记录角色之外的字段级、组织级、地域级或临时数据授权。</small></div>
              <button v-if="!userWorkspaceReadonly" type="button" class="ghost-btn" :disabled="userNormalDataLocked" @click="addUserCustomDataRule">新增自定义授权</button>
            </div>
            <table v-if="userWorkspace.draft.customDataRules.length" class="permission-table custom-rule-table">
              <thead><tr><th>数据集</th><th>字段范围</th><th>组织范围</th><th>地域范围</th><th>生效周期</th><th>备注</th><th>操作</th></tr></thead>
              <tbody>
                <tr v-for="rule in userWorkspace.draft.customDataRules" :key="rule.id">
                  <td><input v-model.trim="rule.dataset" :readonly="userWorkspaceReadonly" placeholder="数据集"></td>
                  <td><input v-model.trim="rule.fields" :readonly="userWorkspaceReadonly" placeholder="字段范围"></td>
                  <td><input v-model.trim="rule.organization" :readonly="userWorkspaceReadonly" placeholder="组织范围"></td>
                  <td><input v-model.trim="rule.region" :readonly="userWorkspaceReadonly" placeholder="地域范围"></td>
                  <td><input v-model.trim="rule.period" :readonly="userWorkspaceReadonly" placeholder="生效周期"></td>
                  <td><input v-model.trim="rule.remark" :readonly="userWorkspaceReadonly" placeholder="选填"></td>
                  <td><button v-if="!userWorkspaceReadonly" type="button" class="link-btn danger" @click="removeUserCustomDataRule(rule.id)">删除</button></td>
                </tr>
              </tbody>
            </table>
            <div v-else class="scope-empty compact-empty"><b>还没有自定义授权</b><p>普通授权无法覆盖的临时或特殊范围，可以在这里新增规则。</p></div>
          </div>
        </section>

        <section v-else-if="userWorkspace.draft && userWorkspace.activeTab === 'history'" class="role-editor-section">
          <table v-if="userWorkspace.draft.changeLogs.length" class="permission-table user-history-table">
            <thead><tr><th>变更时间</th><th>类型</th><th>申请单号</th><th>详情</th></tr></thead>
            <tbody>
              <tr v-for="log in userWorkspace.draft.changeLogs" :key="log.time + log.type + log.ticketNo">
                <td>{{ log.time }}</td>
                <td>{{ log.type }}</td>
                <td>{{ log.ticketNo || '-' }}</td>
                <td>{{ log.detail }}</td>
              </tr>
            </tbody>
          </table>
          <div v-else class="scope-empty compact-empty"><b>暂无历史变更</b><p>后续编辑、设置角色、分配权限或启禁用账号后，会在这里追加记录。</p></div>
        </section>

        <section v-else-if="userWorkspace.draft && userWorkspace.activeTab === 'login'" class="role-editor-section">
          <div class="permission-subhead custom-rule-head">
            <div>
              <b>登录日志</b>
              <small>查看该用户最近登录结果、IP、设备和入口，便于追溯账号使用情况。</small>
            </div>
            <div class="segmented compact-segmented">
              <button type="button" :class="{ active: userWorkspace.loginFilter === 'all' }" @click="userWorkspace.loginFilter = 'all'">全部</button>
              <button type="button" :class="{ active: userWorkspace.loginFilter === 'success' }" @click="userWorkspace.loginFilter = 'success'">成功</button>
              <button type="button" :class="{ active: userWorkspace.loginFilter === 'failed' }" @click="userWorkspace.loginFilter = 'failed'">失败</button>
            </div>
          </div>
          <table v-if="filteredUserLoginLogs.length" class="permission-table user-login-table">
            <thead><tr><th>登录时间</th><th>结果</th><th>IP / 设备</th><th>入口</th><th>失败原因</th></tr></thead>
            <tbody>
              <tr v-for="log in filteredUserLoginLogs" :key="log.time + log.ip">
                <td>{{ log.time }}</td>
                <td><span :class="['table-status', log.result === 'success' ? 'done' : 'rejected']">{{ log.result === 'success' ? '成功' : '失败' }}</span></td>
                <td>{{ log.ip }} / {{ log.device }}</td>
                <td>{{ log.entry }}</td>
                <td>{{ log.failureReason || '-' }}</td>
              </tr>
            </tbody>
          </table>
          <div v-else class="scope-empty compact-empty"><b>暂无登录日志</b><p>当前筛选条件下没有登录记录，请切换为“全部”后再查看。</p></div>
        </section>

        <div class="modal-actions sticky-actions">
          <span v-if="userWorkspace.notice" class="approval-feedback">{{ userWorkspace.notice }}</span>
          <button type="button" class="ghost-btn" @click="closeUserWorkspace">{{ userWorkspace.mode === 'view' ? '关闭' : '取消' }}</button>
          <button v-if="userWorkspace.mode === 'view'" type="button" class="primary-btn" @click="switchUserWorkspaceToEdit">进入编辑</button>
          <button v-else type="button" class="primary-btn" @click="saveUserWorkspace">保存</button>
        </div>
      </div>
    </div>

    <div v-if="userRoleModal.visible" class="permission-modal permission-picker-layer" @click.self="closeUserRoleModal">
      <div class="modal-panel permission-picker-modal">
        <button type="button" class="modal-close" @click="closeUserRoleModal">×</button>
        <h3>设置角色</h3>
        <p class="modal-note">可按角色名称、角色组、功能权限或数据权限搜索；确认后会回填到当前用户。</p>
        <input v-model.trim="userRoleModal.keyword" class="modal-search-input" placeholder="搜索角色名称、角色组、功能权限、数据权限">
        <div class="role-picker-list">
          <label v-for="role in filteredUserRoleOptions" :key="role.id" class="role-picker-row">
            <input type="checkbox" :checked="userRoleModal.selectedIds.includes(role.id)" @change="toggleUserRoleSelection(role.id)">
            <div>
              <b>{{ role.name }}</b>
              <p>{{ role.group }} · {{ role.desc }}</p>
              <small>功能：{{ role.functionPermissionIds.map(permissionName).join('、') || '无' }}</small>
              <small>数据：{{ role.dataPermissionIds.map(dataPermissionName).join('、') || '无' }}</small>
            </div>
          </label>
        </div>
        <div class="modal-actions">
          <button type="button" class="ghost-btn" @click="closeUserRoleModal">取消</button>
          <button type="button" class="primary-btn" @click="confirmUserRoleSelection">确认</button>
        </div>
      </div>
    </div>

    <div v-if="userStatusConfirm.visible && statusTargetUser" class="permission-modal" @click.self="closeUserStatusConfirm">
      <div class="modal-panel small">
        <button type="button" class="modal-close" @click="closeUserStatusConfirm">×</button>
        <h3>{{ userStatusConfirm.action === 'disable' ? '禁用用户确认' : '启用用户确认' }}</h3>
        <p class="modal-note">{{ statusTargetUser.name }}（{{ statusTargetUser.loginAccount }}）{{ userStatusConfirm.action === 'disable' ? '禁用后将无法登录工作台，相关导出、发布、审批能力会暂停；已有角色和权限保留，但不可使用。' : '启用后将恢复登录和已有角色、用户单独授权权限的使用。' }}</p>
        <label class="modal-form-field">
          <span class="field-label required">申请单号 <em>必填</em></span>
          <input v-model.trim="userStatusConfirm.applicationNo" :class="{ invalid: userStatusConfirm.applicationNoError }" placeholder="请输入启用/禁用审批对应的申请单号">
          <small v-if="userStatusConfirm.applicationNoError" class="field-error">{{ userStatusConfirm.applicationNoError }}</small>
        </label>
        <label class="modal-form-field">
          <span :class="['field-label', { required: userStatusConfirm.action === 'disable' }]">原因 / 备注 <em v-if="userStatusConfirm.action === 'disable'">必填</em></span>
          <input v-model.trim="userStatusConfirm.reason" :class="{ invalid: userStatusConfirm.error }" placeholder="请说明操作原因，便于历史追溯">
          <small v-if="userStatusConfirm.error" class="field-error">{{ userStatusConfirm.error }}</small>
        </label>
        <div class="modal-actions">
          <button type="button" class="ghost-btn" @click="closeUserStatusConfirm">取消</button>
          <button type="button" :class="userStatusConfirm.action === 'disable' ? 'danger-btn' : 'primary-btn'" @click="confirmUserStatusChange">确认{{ userStatusConfirm.action === 'disable' ? '禁用' : '启用' }}</button>
        </div>
      </div>
    </div>
    <div v-if="organizationEditor.visible" class="permission-modal" @click.self="closeOrganizationEditor">
      <div class="modal-panel org-editor-modal">
        <button type="button" class="modal-close" @click="closeOrganizationEditor">×</button>
        <h3>{{ organizationEditor.mode === 'create' ? '新增组织' : '编辑组织信息' }}</h3>
        <p class="modal-note">维护组织归属、名称、负责人和描述。保存后会立即更新当前 POC 展示数据。</p>
        <div class="org-form-grid">
          <label>
            <span class="field-label required">Tenant <em>必填</em></span>
            <select v-model="organizationEditor.draft.tenant" :class="{ invalid: organizationEditor.errors.tenant }">
              <option disabled value="">请选择 Tenant</option>
              <option v-for="tenant in organizationTenants" :key="tenant.value" :value="tenant.value">{{ tenant.label }}</option>
            </select>
            <small v-if="organizationEditor.errors.tenant" class="field-error">{{ organizationEditor.errors.tenant }}</small>
          </label>
          <label>
            <span class="field-label required">组织名称 <em>必填</em></span>
            <input v-model.trim="organizationEditor.draft.name" :class="{ invalid: organizationEditor.errors.name }" placeholder="请输入组织名称">
            <small v-if="organizationEditor.errors.name" class="field-error">{{ organizationEditor.errors.name }}</small>
          </label>
          <label>
            <span :class="['field-label', { required: organizationEditor.mode === 'create' }]">上级组织 <em v-if="organizationEditor.mode === 'create'">必填</em></span>
            <select v-model="organizationEditor.draft.parentId" :disabled="organizationEditor.mode === 'edit'" :class="{ invalid: organizationEditor.errors.parentId }">
              <option disabled value="">请选择上级组织</option>
              <option v-for="org in organizationParentOptions" :key="org.id" :value="org.id">{{ org.name }}</option>
            </select>
            <small v-if="organizationEditor.errors.parentId" class="field-error">{{ organizationEditor.errors.parentId }}</small>
          </label>
          <label>
            <span>负责人</span>
            <input v-model.trim="organizationEditor.draft.owner" placeholder="请输入负责人账号或姓名">
          </label>
          <label>
            <span>创建人</span>
            <input v-model.trim="organizationEditor.draft.creator" placeholder="请输入创建人账号或姓名">
          </label>
          <label>
            <span>Code</span>
            <input v-model.trim="organizationEditor.draft.code" :readonly="organizationEditor.mode === 'edit'" :class="{ invalid: organizationEditor.errors.code }" placeholder="例如 OPS-MALL">
            <small v-if="organizationEditor.errors.code" class="field-error">{{ organizationEditor.errors.code }}</small>
          </label>
          <label class="full">
            <span>组织描述 <em>{{ organizationEditor.draft.description.length }}/120</em></span>
            <textarea v-model.trim="organizationEditor.draft.description" :class="{ invalid: organizationEditor.errors.description }" rows="4" placeholder="请说明该组织负责的业务范围、成员边界和权限使用场景。"></textarea>
            <small v-if="organizationEditor.errors.description" class="field-error">{{ organizationEditor.errors.description }}</small>
            <small v-else class="field-help">建议控制在 120 字以内，便于审批人快速理解。</small>
          </label>
        </div>
        <div class="modal-actions">
          <span v-if="organizationEditor.notice" class="approval-feedback">{{ organizationEditor.notice }}</span>
          <button type="button" class="ghost-btn" @click="closeOrganizationEditor">取消</button>
          <button type="button" class="primary-btn" @click="saveOrganizationEditor">保存</button>
        </div>
      </div>
    </div>

    <div v-if="organizationMemberModal.visible" class="permission-modal" @click.self="closeOrganizationMemberModal">
      <div class="modal-panel org-editor-modal">
        <button type="button" class="modal-close" @click="closeOrganizationMemberModal">×</button>
        <h3>{{ organizationMemberModal.mode === 'edit' ? '编辑组织成员' : '添加组织成员' }}</h3>
        <p class="modal-note">{{ organizationMemberModal.mode === 'edit' ? '调整成员基础信息和组织角色，保存后立即更新成员列表。' : '成员会添加到当前选中的组织，并同步更新成员数量。' }}</p>
        <div class="org-form-grid">
          <label>
            <span>所属组织</span>
            <select v-model="organizationMemberModal.draft.organizationId">
              <option v-for="org in flatOrganizations" :key="org.id" :value="org.id">{{ org.name }}</option>
            </select>
          </label>
          <label>
            <span class="field-label required">姓名 <em>必填</em></span>
            <input v-model.trim="organizationMemberModal.draft.name" :class="{ invalid: organizationMemberModal.errors.name }" placeholder="请输入成员姓名">
            <small v-if="organizationMemberModal.errors.name" class="field-error">{{ organizationMemberModal.errors.name }}</small>
          </label>
          <label>
            <span class="field-label required">账号 <em>必填</em></span>
            <input v-model.trim="organizationMemberModal.draft.account" :class="{ invalid: organizationMemberModal.errors.account }" placeholder="请输入 ITCode 或登录账号">
            <small v-if="organizationMemberModal.errors.account" class="field-error">{{ organizationMemberModal.errors.account }}</small>
          </label>
          <label>
            <span>部门</span>
            <input v-model.trim="organizationMemberModal.draft.department" placeholder="例如：乐享运营">
          </label>
          <label>
            <span>组织角色</span>
            <select v-model="organizationMemberModal.draft.orgRole">
              <option>负责人</option>
              <option>管理员</option>
              <option>成员</option>
              <option>协作人</option>
            </select>
          </label>
        </div>
        <div class="modal-actions">
          <span v-if="organizationMemberModal.notice" class="approval-feedback">{{ organizationMemberModal.notice }}</span>
          <button type="button" class="ghost-btn" @click="closeOrganizationMemberModal">取消</button>
          <button type="button" class="primary-btn" @click="saveOrganizationMember">{{ organizationMemberModal.mode === 'edit' ? '保存' : '确认添加' }}</button>
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
import { computed, onMounted, onUnmounted, reactive, ref } from 'vue'

const modules = [
  { key: 'apply', label: '权限申请', icon: 'AP', desc: '申请链路', fullDesc: '按类型发起权限变更、创建账号、启用账号、禁用账号和重置密码。' },
  { key: 'approval', label: '审批列表', icon: 'OK', desc: '待办处理', fullDesc: '集中处理直线经理、业务审批人和系统审批人的待办。' },
  { key: 'roles', label: '角色管理', icon: 'RL', desc: '角色范围', fullDesc: '维护角色、菜单范围、数据范围和成员绑定。' },
  { key: 'users', label: '用户管理', icon: 'US', desc: '账号与角色', fullDesc: '查看用户账号、角色、角色之外的额外权限和历史变更。' },
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

const applySteps = [
  { key: 'type', label: '1. 选择类型' },
  { key: 'info', label: '2. 填写信息' },
  { key: 'scope', label: '3. 权限范围' },
  { key: 'approve', label: '4. 审批执行' }
]

const requestTypes = [
  { key: 'change', no: '01', label: '权限变更', summary: '已有账号新增或调整菜单、功能、数据和 Skill 权限。', route: '直线经理 + 业务审批 + 系统审批' },
  { key: 'create', no: '02', label: '创建账号', summary: '为新员工或外部协作人员创建工作台账号。', route: '直线经理 + 业务审批 + 系统审批' },
  { key: 'enable', no: '03', label: '启用账号', summary: '恢复已停用账号的登录和业务操作能力。', route: '直线经理 + 系统审批' },
  { key: 'disable', no: '04', label: '禁用账号', summary: '关闭账号登录、导出、发布和后台操作权限。', route: '直线经理 + 系统审批' },
  { key: 'reset', no: '05', label: '重置密码', summary: '为本人或他人发起账号密码重置流程。', route: '直线经理 + 系统审批' }
]

const personTypes = [
  { key: 'internal', label: '内部人员', desc: '联想内部员工或已有正式账号人员。' },
  { key: 'external', label: '外部人员', desc: '供应商、外包或临时协作人员，需填写关联人员。' }
]

const form = reactive({
  type: 'change',
  personType: 'internal',
  applicant: 'admin',
  itcode: 'admin',
  targetUser: 'zhangrui32',
  relatedAccount: '',
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
    account: []
  }
})

const formErrors = reactive({
  targetUser: '',
  relatedAccount: '',
  reason: '',
  businessApprover: ''
})

const businessApprovers = [
  'zhangjq4（消费业务 to C）',
  'huangjq5（商用业务 to B/b）',
  'zhangxy43（to C 相关）',
  'zhangrui32（to B/b 相关）'
]

const allFunctionPermissions = [
  { id: 'func.dashboard.view', name: '查看运营总览' },
  { id: 'func.report.generate', name: '报告生成' },
  { id: 'func.data.export', name: '数据导出' },
  { id: 'func.product.config', name: '商品配置' },
  { id: 'func.publish.confirm', name: '发布确认' },
  { id: 'func.skill.manage', name: 'Skill 管理' },
  { id: 'func.geo.monitor', name: 'GEO 信源监测' },
  { id: 'func.lead.assign', name: '线索分配' }
]

const functionPermissionTree = [
  {
    id: 'func.ops',
    name: '乐享运营',
    children: [
      { id: 'func.ops.dashboard', name: '运营看板', children: [
        { id: 'func.dashboard.view', name: '查看运营总览' },
        { id: 'func.report.generate', name: '报告生成' },
        { id: 'func.data.export', name: '数据导出' }
      ] }
    ]
  },
  {
    id: 'func.business',
    name: '业务配置',
    children: [
      { id: 'func.business.product', name: '商品与发布', children: [
        { id: 'func.product.config', name: '商品配置' },
        { id: 'func.publish.confirm', name: '发布确认' }
      ] },
      { id: 'func.business.lead', name: '企业客户', children: [
        { id: 'func.lead.assign', name: '线索分配' }
      ] }
    ]
  },
  {
    id: 'func.platform',
    name: '平台能力',
    children: [
      { id: 'func.platform.skill', name: 'AI 与搜索', children: [
        { id: 'func.skill.manage', name: 'Skill 管理' },
        { id: 'func.geo.monitor', name: 'GEO 信源监测' }
      ] }
    ]
  }
]

const dataPermissionTree = [
  {
    id: 'data.ops',
    name: '运营数据集',
    children: [
      { id: 'data.ops.region', name: '区域数据', children: [
        { id: 'data.ops.region.east', name: '华东区' },
        { id: 'data.ops.region.north', name: '华北区' },
        { id: 'data.ops.region.south', name: '华南区' }
      ] },
      { id: 'data.ops.metric', name: '经营指标', children: [
        { id: 'data.ops.metric.gmv', name: 'GMV 指标' },
        { id: 'data.ops.metric.flow', name: '流量转化' }
      ] }
    ]
  },
  {
    id: 'data.member',
    name: '会员标签库',
    children: [
      { id: 'data.member.profile', name: '会员画像', children: [
        { id: 'data.member.profile.level', name: '会员等级' },
        { id: 'data.member.profile.rights', name: '权益使用' }
      ] }
    ]
  },
  {
    id: 'data.geo',
    name: 'GEO 信源库',
    children: [
      { id: 'data.geo.source', name: '信源范围', children: [
        { id: 'data.geo.source.official', name: '官方信源' },
        { id: 'data.geo.source.community', name: '社区信源' }
      ] }
    ]
  },
  {
    id: 'data.lead',
    name: '企业客户线索',
    children: [
      { id: 'data.lead.pool', name: '线索池', children: [
        { id: 'data.lead.pool.all', name: '全部线索' },
        { id: 'data.lead.pool.assigned', name: '已分配线索' }
      ] }
    ]
  }
]

const allRoles = reactive([
  {
    id: 'ops-pm',
    code: 'PM',
    name: '运营分析 PM',
    type: '业务角色',
    group: '乐享运营',
    desc: '可查看运营总览、生成报告，并使用常用运营数据。',
    owner: 'zhangjq4',
    sensitivity: 'sensitive-data',
    users: 12,
    systemRole: false,
    updatedAt: '2026-07-13 18:20',
    functionPermissionIds: ['func.dashboard.view', 'func.report.generate', 'func.data.export'],
    dataPermissionIds: [],
    functionPermissionNotes: {
      'func.data.export': '仅用于运营日报和复盘导出。'
    },
    dataPermissionNotes: {},
    customDataRules: [
      { id: 'rule-ops-east-quarter', dataset: '运营数据集', fields: 'GMV、流量、转化', organization: '乐享运营', region: '华东区', period: '2026-07-01 至 2026-09-30', remark: '季度活动复盘临时授权。' }
    ]
  },
  {
    id: 'product-op',
    code: 'OP',
    name: '商品运营',
    type: '业务角色',
    group: '商品中心',
    desc: '可配置商品、推荐位、价格和上下架策略。',
    owner: 'huangjq5',
    sensitivity: 'sensitive-action',
    users: 26,
    systemRole: false,
    updatedAt: '2026-07-12 16:08',
    functionPermissionIds: ['func.dashboard.view', 'func.product.config', 'func.publish.confirm'],
    dataPermissionIds: ['data.ops.region.north', 'data.ops.metric.gmv'],
    functionPermissionNotes: {
      'func.publish.confirm': '涉及发布前复核。'
    },
    dataPermissionNotes: {},
    customDataRules: []
  },
  {
    id: 'geo-analyst',
    code: 'GEO',
    name: 'GEO 分析师',
    type: '分析角色',
    group: '搜索后台',
    desc: '可查看信源、引用和搜索表现数据。',
    owner: 'zhangxy43',
    sensitivity: 'sensitive-data',
    users: 8,
    systemRole: false,
    updatedAt: '2026-07-11 14:30',
    functionPermissionIds: ['func.geo.monitor', 'func.report.generate'],
    dataPermissionIds: ['data.geo.source.official', 'data.geo.source.community'],
    functionPermissionNotes: {},
    dataPermissionNotes: {
      'data.geo.source.community': '仅用于趋势分析，不包含用户身份。'
    },
    customDataRules: []
  },
  {
    id: 'lead-operator',
    code: 'LEAD',
    name: '线索运营',
    type: '业务角色',
    group: '企业客户管理',
    desc: '可查看企业客户线索并进行分配跟进。',
    owner: 'sunll1',
    sensitivity: 'sensitive-action',
    users: 15,
    systemRole: false,
    updatedAt: '2026-07-10 11:42',
    functionPermissionIds: ['func.lead.assign', 'func.data.export'],
    dataPermissionIds: [],
    functionPermissionNotes: {},
    dataPermissionNotes: {},
    customDataRules: [
      { id: 'rule-lead-north', dataset: '企业客户线索', fields: '客户名称、意向等级、跟进状态', organization: '企业客户管理', region: '华北区', period: '长期有效', remark: '仅线索分配岗位可见。' }
    ]
  },
  {
    id: 'bpo-collab',
    code: 'BPO',
    name: '外包协作',
    type: '外部协作角色',
    group: '外部协作',
    desc: '受限菜单和脱敏数据，仅保留必要操作。',
    owner: 'wangxt8',
    sensitivity: 'standard-data',
    users: 34,
    systemRole: true,
    updatedAt: '2026-07-09 09:18',
    functionPermissionIds: ['func.dashboard.view'],
    dataPermissionIds: ['data.ops.region.south'],
    functionPermissionNotes: {},
    dataPermissionNotes: {
      'data.ops.region.south': '仅展示脱敏汇总。'
    },
    customDataRules: []
  }
])
const copyableUsers = [
  {
    itcode: 'wangxt8',
    name: '王晓婷',
    roleIds: ['ops-pm', 'geo-analyst'],
    functionPermissionIds: ['func.skill.manage'],
    dataPermissions: [
      { id: 'data.ops.region.east', source: '角色继承' },
      { id: 'data.ops.metric.gmv', source: '角色继承' },
      { id: 'data.geo.source.official', source: '角色继承' },
      { id: 'data.member.profile.level', source: '用户单独授权' }
    ]
  },
  {
    itcode: 'liwen08',
    name: '李雯',
    roleIds: ['product-op'],
    functionPermissionIds: [],
    dataPermissions: [
      { id: 'data.ops.region.north', source: '角色继承' },
      { id: 'data.ops.metric.gmv', source: '角色继承' },
      { id: 'data.member.profile.rights', source: '用户单独授权' }
    ]
  },
  {
    itcode: 'temp-bpo',
    name: '外部协作账号',
    roleIds: ['bpo-collab'],
    functionPermissionIds: [],
    dataPermissions: [
      { id: 'data.ops.region.south', source: '角色继承' }
    ]
  }
]

const selectedRoleIds = ref([])
const copiedRoleIds = ref([])
const copiedFunctionPermissionIds = ref([])
const selectedDataPermissionIds = ref([])
const manualDataPermissionIds = ref([])
const copiedDataSourceMap = reactive({})
const copiedFromItcode = ref('')

const roleModal = reactive({
  visible: false,
  keyword: '',
  selectedIds: []
})

const copyModal = reactive({
  visible: false,
  itcode: '',
  error: ''
})

const dataModal = reactive({
  visible: false,
  selectedIds: []
})

const dataSourceGroupOptions = ['乐享运营', '会员中心', 'GEO 看板', '企业客户管理', '商城运营']
const dataSourceNameOptions = ['运营数据集', '会员标签库', 'GEO 信源库', '企业客户线索', '商城订单数据']
const dataSourceSensitivityOptions = [
  { value: 'standard-data', label: '标准数据（低风险）' },
  { value: 'standard-action', label: '标准操作（低风险）' },
  { value: 'sensitive-data', label: '敏感数据（中风险）' },
  { value: 'sensitive-action', label: '敏感操作（中风险）' },
  { value: 'it-config-data', label: 'IT 配置数据（高风险）' }
]
const dataSources = reactive([
  { id: 'ds-ops-region', group: '乐享运营', dataSource: '运营数据集', name: '运营指标查询', apiUrl: '/api/ops/metrics', permissionParam: 'regionCode', key: 'scope', value: 'east', remark: '用于运营日报和活动复盘，按区域控制可见范围。', sensitivity: 'sensitive-data' },
  { id: 'ds-member-tag', group: '会员中心', dataSource: '会员标签库', name: '会员标签查询', apiUrl: '/api/member/tags', permissionParam: 'tagGroup', key: 'tag_group', value: 'rights', remark: '涉及会员权益使用情况，默认需要业务负责人确认。', sensitivity: 'it-config-data' },
  { id: 'ds-geo-source', group: 'GEO 看板', dataSource: 'GEO 信源库', name: '信源引用查询', apiUrl: '/api/geo/sources', permissionParam: 'sourceType', key: 'source_type', value: 'official', remark: '用于 GEO 信源监测和引用趋势分析。', sensitivity: 'sensitive-data' },
  { id: 'ds-lead-pool', group: '企业客户管理', dataSource: '企业客户线索', name: '线索池查询', apiUrl: '/api/biz/leads', permissionParam: 'ownerOrg', key: 'owner_org', value: 'enterprise', remark: '包含客户线索和跟进状态，仅企业客户相关组织可申请。', sensitivity: 'it-config-data' },
  { id: 'ds-mall-order', group: '商城运营', dataSource: '商城订单数据', name: '订单状态查询', apiUrl: '/api/mall/orders', permissionParam: 'orderScope', key: 'order_scope', value: 'summary', remark: '用于订单状态和售后进展查看，暂不开放明细字段。', sensitivity: 'it-config-data' }
])
const dataSourceNotice = ref('')
let dataSourceNoticeTimer = null
const dataSourceFilters = reactive({ group: '', name: '' })
const emptyDataSourceDraft = () => ({ id: '', group: '', dataSource: '', name: '', apiUrl: '', permissionParam: '', key: '', value: '', remark: '', sensitivity: 'sensitive-data' })
const dataSourceEditor = reactive({ visible: false, mode: 'create', sourceId: '', draft: emptyDataSourceDraft(), errors: { group: '', dataSource: '', name: '', apiUrl: '', permissionParam: '', remark: '' }, notice: '' })

const functionTypeOptions = [
  { value: 'function', label: '功能' },
  { value: 'button', label: '按钮' },
  { value: 'skill', label: 'Skill' }
]

const functionMenuTree = [
  {
    id: 'root-1',
    name: '根目录 1',
    children: [
      { id: 'root-1-product', name: '商品', children: [{ id: 'menu-product-up', name: '商品上架' }, { id: 'menu-product-config', name: '商品配置' }, { id: 'menu-publish-confirm', name: '发布确认' }] },
      { id: 'root-1-data', name: '数据', children: [{ id: 'menu-dashboard', name: '运营总览' }, { id: 'menu-report', name: '报告生成' }, { id: 'menu-export', name: '数据导出' }] },
      { id: 'root-1-user-a', name: '用户', children: [{ id: 'menu-user-create', name: '用户新增' }, { id: 'menu-user-role', name: '角色分配' }, { id: 'menu-user-extra', name: '额外授权' }] },
      { id: 'root-1-user-b', name: '用户', children: [{ id: 'menu-user-enable', name: '启用账号' }, { id: 'menu-user-disable', name: '禁用账号' }] },
      { id: 'root-1-user-c', name: '用户', children: [{ id: 'menu-user-batch-change', name: '批量改价' }, { id: 'menu-user-batch-approve', name: '批量审批' }] }
    ]
  },
  {
    id: 'root-2',
    name: '根目录 2',
    children: [
      { id: 'root-2-geo', name: 'GEO 看板', children: [{ id: 'menu-geo-monitor', name: 'GEO 信源监测' }, { id: 'menu-geo-export', name: '信源导出' }] },
      { id: 'root-2-search', name: '搜索后台', children: [{ id: 'menu-search-query', name: 'Query 分析' }, { id: 'menu-search-intent', name: '意图分布' }] }
    ]
  },
  {
    id: 'root-3',
    name: '根目录 3',
    children: [
      { id: 'root-3-lead', name: '企业客户', children: [{ id: 'menu-lead-assign', name: '线索分配' }, { id: 'menu-lead-pool', name: '线索池' }] },
      { id: 'root-3-customer', name: '客户管理', children: [{ id: 'menu-customer-follow', name: '客户跟进' }, { id: 'menu-customer-score', name: '客户评分' }] }
    ]
  },
  {
    id: 'root-4',
    name: '根目录 4',
    children: [
      { id: 'root-4-skill', name: 'Skill Hub', children: [{ id: 'menu-skill-manage', name: 'Skill 管理' }, { id: 'menu-skill-publish', name: 'Skill 发布' }] },
      { id: 'root-4-ai', name: 'AI 平台', children: [{ id: 'menu-agent-config', name: '智能体配置' }, { id: 'menu-model-eval', name: '模型评测' }] }
    ]
  },
  {
    id: 'root-5',
    name: '根目录 5',
    children: [
      { id: 'root-5-system', name: '系统管理', children: [{ id: 'menu-role-manage', name: '角色管理' }, { id: 'menu-permission-audit', name: '权限审计' }] },
      { id: 'root-5-api', name: '接口管理', children: [{ id: 'menu-api-auth', name: '接口授权' }, { id: 'menu-api-log', name: '接口日志' }] }
    ]
  }
]
const functionInterfaceCatalog = [
  { id: 'api-ops-dashboard', name: '运营总览查询', url: '/api/ops/dashboard' },
  { id: 'api-report-generate', name: '报告生成任务', url: '/api/report/generate' },
  { id: 'api-data-export', name: '数据导出任务', url: '/api/export/tasks' },
  { id: 'api-product-config', name: '商品配置保存', url: '/api/product/config' },
  { id: 'api-publish-confirm', name: '发布确认提交', url: '/api/publish/confirm' },
  { id: 'api-skill-manage', name: 'Skill 管理接口', url: '/api/skill/manage' },
  { id: 'api-geo-monitor', name: 'GEO 信源监测', url: '/api/geo/monitor' },
  { id: 'api-lead-assign', name: '线索分配接口', url: '/api/leads/assign' }
]

const managedFunctions = reactive([
  {
    id: 'func.dashboard.view',
    menu: '根目录 1 / 数据 / 运营总览',
    name: '查看运营总览',
    description: '允许用户进入运营总览页面，查看核心经营指标和常用运营入口。',
    type: 'function',
    status: 'enabled',
    interfaces: [{ ...functionInterfaceCatalog[0] }]
  },
  {
    id: 'func.report.generate',
    menu: '根目录 1 / 数据 / 报告生成',
    name: '报告生成',
    description: '允许用户基于运营数据生成日报、复盘报告和业务分析材料。',
    type: 'function',
    status: 'enabled',
    interfaces: [{ ...functionInterfaceCatalog[1] }]
  },
  {
    id: 'func.data.export',
    menu: '根目录 1 / 数据 / 数据导出',
    name: '数据导出',
    description: '允许用户在已授权数据范围内导出运营、线索或看板明细。',
    type: 'button',
    status: 'enabled',
    interfaces: [{ ...functionInterfaceCatalog[2] }]
  },
  {
    id: 'func.product.config',
    menu: '根目录 1 / 商品 / 商品配置',
    name: '商品配置',
    description: '允许商品运营维护商品、推荐位、价格和活动配置。',
    type: 'function',
    status: 'enabled',
    interfaces: [{ ...functionInterfaceCatalog[3] }]
  },
  {
    id: 'func.publish.confirm',
    menu: '根目录 1 / 商品 / 发布确认',
    name: '发布确认',
    description: '允许负责人在发布前完成配置复核和确认提交。',
    type: 'button',
    status: 'enabled',
    interfaces: [{ ...functionInterfaceCatalog[4] }]
  },
  {
    id: 'func.skill.manage',
    menu: '根目录 4 / Skill Hub / Skill 管理',
    name: 'Skill 管理',
    description: '允许用户创建、编辑、评估和发布 Skill。',
    type: 'skill',
    status: 'enabled',
    interfaces: [{ ...functionInterfaceCatalog[5] }]
  },
  {
    id: 'func.geo.monitor',
    menu: '根目录 2 / GEO 看板 / GEO 信源监测',
    name: 'GEO 信源监测',
    description: '允许用户查看 GEO 信源引用、平台表现和趋势监测数据。',
    type: 'function',
    status: 'enabled',
    interfaces: [{ ...functionInterfaceCatalog[6] }]
  },
  {
    id: 'func.lead.assign',
    menu: '根目录 3 / 企业客户 / 线索分配',
    name: '线索分配',
    description: '允许企业客户运营将线索分配给对应跟进人员。',
    type: 'button',
    status: 'enabled',
    interfaces: [{ ...functionInterfaceCatalog[7] }]
  }
])

const selectedFunctionId = ref('func.dashboard.view')
const functionNotice = ref('')
let functionNoticeTimer = null
const functionFilters = reactive({ name: '', root: '', menu: '', type: '' })
const emptyFunctionDraft = () => ({ id: '', menu: '', name: '', description: '', type: 'function', status: 'enabled', interfaces: [] })
const functionEditor = reactive({
  visible: false,
  mode: 'create',
  functionId: '',
  selectedInterfaceId: '',
  draft: emptyFunctionDraft(),
  errors: { menu: '', name: '', description: '', type: '', interfaces: '' },
  notice: ''
})
const relationCards = computed(() => [
  { key: 'org', label: '组织', icon: 'O', value: form.relation.org },
  { key: 'role', label: '角色', icon: 'R', value: form.relation.role },
  { key: 'data', label: '数据范围', icon: 'D', value: form.relation.data },
  { key: 'skill', label: 'Skill 范围', icon: 'S', value: form.relation.skill }
])

const pickerOptions = {
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
const organizationOptions = ['乐享运营', 'GEO 看板', '企业客户管理', '搜索后台', '商用业务运营']
const tenantOptions = ['leaibot-cn', 'shop-chat', 'b-chat', 'biz-chat']
const approvalSearch = reactive({
  status: '全部',
  approverItcode: '',
  handlerDraft: '',
  handlerFocused: false,
  handlers: []
})
const approvalWorkspace = reactive({
  visible: false,
  mode: 'view',
  rowId: '',
  nodeType: '',
  title: '',
  result: '',
  opinion: '',
  organizations: [],
  tenant: '',
  notice: '',
  errors: {
    result: '',
    organizations: '',
    tenant: ''
  }
})
const approvals = ref([
  createApprovalRow({
    id: 'AP-20260713-001',
    typeKey: 'change',
    type: '权限变更',
    applicant: 'admin',
    applicantItcode: 'admin',
    target: 'zhangrui32',
    nodeType: 'relation',
    approverItcode: 'wangxt8',
    handlers: ['wangxt8'],
    time: '2026-07-13 10:32',
    personType: 'external',
    relatedAccount: 'wangxt8',
    reason: '外部协作人员需要参与乐享运营日报整理，请关联人先确认协作关系。',
    permissionSnapshot: {
      selectedRoleIds: ['bpo-collab'],
      copiedFromItcode: '',
      copiedRoleIds: [],
      copiedFunctionPermissionIds: [],
      selectedDataPermissionIds: ['data.ops.region.south'],
      manualDataPermissionIds: [],
      copiedDataSourceMap: {}
    }
  }),
  createApprovalRow({
    id: 'AP-20260713-002',
    typeKey: 'change',
    type: '权限变更',
    applicant: 'sunll1',
    applicantItcode: 'sunll1',
    target: 'liwen08',
    nodeType: 'manager',
    approverItcode: 'sunll1',
    handlers: ['sunll1'],
    time: '2026-07-13 09:48',
    reason: '补充商品运营配置和运营数据查看权限，支持日常活动配置复核。',
    permissionSnapshot: {
      selectedRoleIds: ['product-op'],
      copiedFromItcode: 'liwen08',
      copiedRoleIds: ['product-op'],
      copiedFunctionPermissionIds: [],
      selectedDataPermissionIds: ['data.ops.region.north', 'data.ops.metric.gmv', 'data.member.profile.rights'],
      manualDataPermissionIds: ['data.member.profile.rights'],
      copiedDataSourceMap: {
        'data.ops.region.north': '角色继承',
        'data.ops.metric.gmv': '角色继承',
        'data.member.profile.rights': '用户单独授权'
      }
    }
  }),
  createApprovalRow({
    id: 'AP-20260713-003',
    typeKey: 'create',
    type: '创建账号',
    applicant: 'huangjq5',
    applicantItcode: 'huangjq5',
    target: 'chenyan9',
    nodeType: 'business',
    approverItcode: 'zhangjq4',
    handlers: ['zhangjq4', 'huangjq5'],
    time: '2026-07-13 09:12',
    personType: 'internal',
    reason: '新成员进入消费业务运营组，需要开通基础工作台账号和线索查看能力。',
    businessInfo: { organizations: ['乐享运营'], tenant: 'leaibot-cn' },
    permissionSnapshot: {
      selectedRoleIds: ['ops-pm'],
      copiedFromItcode: '',
      copiedRoleIds: [],
      copiedFunctionPermissionIds: [],
      selectedDataPermissionIds: [],
      manualDataPermissionIds: [],
      copiedDataSourceMap: {}
    }
  }),
  createApprovalRow({
    id: 'AP-20260702-006',
    typeKey: 'create',
    type: '创建账号',
    applicant: 'sunll1',
    applicantItcode: 'sunll1',
    target: 'liwen08',
    nodeType: 'done',
    approverItcode: 'sunzh4',
    handlers: ['sunll1', 'zhangjq4', 'sunzh4'],
    status: '执行完成',
    statusKey: 'done',
    node: '后台执行',
    time: '2026-07-02 17:18',
    permissionSnapshot: {
      selectedRoleIds: ['product-op'],
      copiedFromItcode: '',
      copiedRoleIds: [],
      copiedFunctionPermissionIds: [],
      selectedDataPermissionIds: ['data.ops.region.north', 'data.ops.metric.gmv'],
      manualDataPermissionIds: [],
      copiedDataSourceMap: {}
    }
  }),
  createApprovalRow({
    id: 'AP-20260702-003',
    typeKey: 'disable',
    type: '禁用账号',
    applicant: 'huangjq5',
    applicantItcode: 'huangjq5',
    target: 'temp-bpo',
    nodeType: 'execute',
    approverItcode: 'sunzh4',
    handlers: ['huangjq5', 'sunzh4'],
    status: '已通过',
    statusKey: 'approved',
    node: '后台执行',
    time: '2026-07-02 15:44'
  }),
  createApprovalRow({
    id: 'AP-20260701-009',
    typeKey: 'reset',
    type: '重置密码',
    applicant: 'zhangxy43',
    applicantItcode: 'zhangxy43',
    target: 'wangxt8',
    nodeType: 'rework',
    approverItcode: 'sunll1',
    handlers: ['sunll1'],
    status: '已驳回',
    statusKey: 'rejected',
    node: '申请人修改',
    time: '2026-07-01 19:12'
  })
])
const roleTypeOptions = ['业务角色', '分析角色', '外部协作角色', '系统角色']
const roleGroupOptions = ['乐享运营', '商品中心', '搜索后台', '企业客户管理', '外部协作']
const sensitivityOptions = [
  { value: 'standard-data', label: '标准数据（低风险）', risk: 'low', desc: '常规查看或脱敏数据。' },
  { value: 'standard-action', label: '标准操作（低风险）', risk: 'low', desc: '常规配置、查询或低影响操作。' },
  { value: 'sensitive-data', label: '敏感数据（中风险）', risk: 'medium', desc: '包含报表、业务指标、客户或运营敏感信息。' },
  { value: 'sensitive-action', label: '敏感操作（中风险）', risk: 'medium', desc: '涉及发布、导出、分配或影响业务结果的操作。' },
  { value: 'it-config-data', label: 'IT 配置数据（高风险）', risk: 'high', desc: '涉及系统配置、租户、接口或高影响后台数据。' }
]

const roleFilters = reactive({
  keyword: '',
  group: ''
})

const emptyRoleDraft = () => ({
  id: '',
  code: 'NEW',
  name: '',
  type: '业务角色',
  group: '乐享运营',
  desc: '',
  owner: '',
  sensitivity: 'sensitive-data',
  users: 0,
  systemRole: false,
  updatedAt: '',
  functionPermissionIds: [],
  dataPermissionIds: [],
  functionPermissionNotes: {},
  dataPermissionNotes: {},
  customDataRules: []
})

const roleEditor = reactive({
  visible: false,
  mode: 'view',
  roleId: '',
  activeTab: 'basic',
  dataTab: 'normal',
  draft: emptyRoleDraft(),
  notice: '',
  errors: {
    name: '',
    type: '',
    group: '',
    owner: '',
    dataMode: ''
  }
})

const roleDeleteConfirm = reactive({
  visible: false,
  role: null
})
const userTypeOptions = ['内部用户', '外部用户', '临时协作用户']
const users = reactive([
  {
    userAccount: 'U-10032',
    loginAccount: 'zhangrui32',
    name: '张睿',
    bindItcode: true,
    mobile: '13800000000',
    email: 'zhangrui32@lenovo.com',
    validUntil: '2026-12-31',
    userType: '内部用户',
    tenant: 'leaibot-cn',
    organization: '乐享运营',
    internalAdAccount: 'LENOVO\\zhangrui32',
    remark: '负责运营日报、活动复盘和报告生成。',
    status: 'enabled',
    statusKey: 'done',
    roleIds: ['ops-pm'],
    extraFunctionPermissionIds: [],
    extraDataPermissionIds: [],
    suppressedRoleDataPermissionIds: [],
    customDataRules: [
      { id: 'user-rule-zhangrui-east', dataset: '会员标签库', fields: '等级、权益使用', organization: '乐享运营', region: '华东区', period: '2026-07-01 至 2026-09-30', remark: '活动复盘临时授权。' }
    ],
    changeLogs: [
      { time: '2026-07-13 18:20', type: '数据权限调整', ticketNo: 'AP-20260713-003', detail: '新增会员等级用户单独授权，用于活动复盘。' },
      { time: '2026-07-12 10:10', type: '设置角色', ticketNo: 'AP-20260712-006', detail: '分配运营分析 PM 角色。' }
    ],
    loginLogs: [
      { time: '2026-07-14 09:32', result: 'success', ip: '10.24.18.36', device: 'Chrome / Windows', entry: '乐享 AI 工作台', failureReason: '' },
      { time: '2026-07-13 21:08', result: 'failed', ip: '10.24.18.36', device: 'Chrome / Windows', entry: '乐享 AI 工作台', failureReason: '密码输入错误' }
    ]
  },
  {
    userAccount: 'U-10021',
    loginAccount: 'sunll1',
    name: '孙立',
    bindItcode: true,
    mobile: '13900000001',
    email: 'sunll1@lenovo.com',
    validUntil: '长期有效',
    userType: '内部用户',
    tenant: 'leaibot-cn',
    organization: '平台运营',
    internalAdAccount: 'LENOVO\\sunll1',
    remark: '平台运营负责人，承担直线经理审批。',
    status: 'enabled',
    statusKey: 'done',
    roleIds: ['lead-operator'],
    extraFunctionPermissionIds: [],
    extraDataPermissionIds: [],
    suppressedRoleDataPermissionIds: [],
    customDataRules: [],
    changeLogs: [
      { time: '2026-07-11 09:30', type: '基本信息编辑', ticketNo: 'AP-20260711-002', detail: '更新所属组织为平台运营。' }
    ],
    loginLogs: [
      { time: '2026-07-14 08:46', result: 'success', ip: '10.16.8.21', device: 'Edge / Windows', entry: '审批列表', failureReason: '' }
    ]
  },
  {
    userAccount: 'U-10045',
    loginAccount: 'huangjq5',
    name: '黄佳琪',
    bindItcode: true,
    mobile: '13900000002',
    email: 'huangjq5@lenovo.com',
    validUntil: '2026-12-31',
    userType: '内部用户',
    tenant: 'shop-chat',
    organization: '商用业务运营',
    internalAdAccount: 'LENOVO\\huangjq5',
    remark: '负责商品运营和发布前复核。',
    status: 'enabled',
    statusKey: 'done',
    roleIds: ['product-op'],
    extraFunctionPermissionIds: [],
    extraDataPermissionIds: ['data.member.profile.rights'],
    suppressedRoleDataPermissionIds: [],
    customDataRules: [],
    changeLogs: [
      { time: '2026-07-10 16:08', type: '设置角色', ticketNo: 'AP-20260710-004', detail: '分配商品运营角色，并保留会员权益使用额外数据权限。' }
    ],
    loginLogs: [
      { time: '2026-07-13 18:02', result: 'success', ip: '10.28.6.45', device: 'Chrome / Windows', entry: '商品运营', failureReason: '' }
    ]
  },
  {
    userAccount: 'EXT-9008',
    loginAccount: 'temp-bpo',
    name: '外部协作',
    bindItcode: false,
    mobile: '13700000003',
    email: 'temp-bpo@partner.example.com',
    validUntil: '2026-08-31',
    userType: '外部用户',
    tenant: 'leaibot-cn',
    organization: '外部协作',
    internalAdAccount: '',
    remark: 'BPO 临时协作账号，仅保留脱敏查看能力。',
    status: 'disabled',
    statusKey: 'rejected',
    roleIds: ['bpo-collab'],
    extraFunctionPermissionIds: [],
    extraDataPermissionIds: [],
    suppressedRoleDataPermissionIds: [],
    customDataRules: [],
    changeLogs: [
      { time: '2026-07-02 15:44', type: '禁用用户', ticketNo: 'AP-20260702-003', detail: '项目阶段结束，暂停账号登录和权限使用。' }
    ],
    loginLogs: [
      { time: '2026-07-02 16:21', result: 'failed', ip: '172.16.4.18', device: 'Chrome / Windows', entry: '乐享 AI 工作台', failureReason: '账号已禁用' }
    ]
  }
])
const userFilters = reactive({
  account: '',
  name: '',
  bindItcode: ''
})

const userWorkspace = reactive({
  visible: false,
  mode: 'view',
  userAccount: '',
  activeTab: 'basic',
  dataTab: 'normal',
  loginFilter: 'all',
  applicationNo: '',
  generatedApplicationNo: '',
  draft: null,
  notice: '',
  errors: {
    userAccount: '',
    loginAccount: '',
    validUntil: '',
    internalAdAccount: '',
    applicationNo: '',
    dataMode: ''
  }
})

const userRoleModal = reactive({
  visible: false,
  keyword: '',
  selectedIds: [],
  targetUserAccount: ''
})

const userStatusConfirm = reactive({
  visible: false,
  action: 'disable',
  userAccount: '',
  reason: '',
  applicationNo: '',
  applicationNoError: '',
  error: ''
})
const organizations = reactive([
  {
    id: 'leai-root',
    code: 'LEAI',
    name: '联想乐享',
    parentId: '',
    level: 0,
    description: '联想乐享工作台的根组织，统一承接权限申请、成员归属和业务范围配置。',
    owner: 'admin',
    status: 'enabled',
    memberCount: 3,
    updatedAt: '2026-07-14 15:20',
    scope: '权限体系根组织',
    members: [
      { name: '管峰', account: 'guanfeng2', department: '联想乐享', orgRole: '管理员', permissionIdentity: '业务管理员', status: 'enabled' },
      { name: '孙莉莉', account: 'sunll1', department: '平台运营', orgRole: '负责人', permissionIdentity: '运营人员', status: 'enabled' },
      { name: '张俊强', account: 'zhangjq4', department: '消费业务', orgRole: '成员', permissionIdentity: '数据查看人', status: 'enabled' }
    ],
    children: [
      {
        id: 'leai-ops',
        code: 'OPS',
        name: '乐享运营',
        parentId: 'leai-root',
        level: 1,
        description: '负责乐享前台运营、活动配置、内容发布和日常数据观察。',
        owner: 'sunll1',
        status: 'enabled',
        memberCount: 4,
        updatedAt: '2026-07-14 15:10',
        scope: '运营角色、活动数据和内容权限归属',
        members: [
          { name: '孙莉莉', account: 'sunll1', department: '乐享运营', orgRole: '负责人', permissionIdentity: '业务管理员', status: 'enabled' },
          { name: '张瑞', account: 'zhangrui32', department: '乐享运营', orgRole: '管理员', permissionIdentity: '运营人员', status: 'enabled' },
          { name: '王一', account: 'wangyi8', department: '活动运营', orgRole: '成员', permissionIdentity: '运营人员', status: 'enabled' },
          { name: '外部协作', account: 'temp-bpo', department: '外部协作', orgRole: '协作人', permissionIdentity: '外部协作', status: 'disabled' }
        ],
        children: [
          {
            id: 'ops-mall',
            code: 'OPS-MALL',
            name: '商城运营',
            parentId: 'leai-ops',
            level: 2,
            description: '负责商品配置、发布检查、订单相关看板和商城活动运营。',
            owner: 'zhangrui32',
            status: 'enabled',
            memberCount: 2,
            updatedAt: '2026-07-13 18:30',
            scope: '商品、订单和商城活动数据权限',
            members: [
              { name: '张瑞', account: 'zhangrui32', department: '商城运营', orgRole: '负责人', permissionIdentity: '业务管理员', status: 'enabled' },
              { name: '陈铭', account: 'chenming7', department: '商城运营', orgRole: '成员', permissionIdentity: '运营人员', status: 'enabled' }
            ],
            children: []
          },
          {
            id: 'ops-content',
            code: 'OPS-CONTENT',
            name: '内容运营',
            parentId: 'leai-ops',
            level: 2,
            description: '负责内容素材、发布校验、知识内容和运营话术维护。',
            owner: 'liwen9',
            status: 'enabled',
            memberCount: 2,
            updatedAt: '2026-07-12 10:05',
            scope: '内容发布和素材管理功能权限',
            members: [
              { name: '李雯', account: 'liwen9', department: '内容运营', orgRole: '负责人', permissionIdentity: '运营人员', status: 'enabled' },
              { name: '周可', account: 'zhouke3', department: '内容运营', orgRole: '成员', permissionIdentity: '数据查看人', status: 'enabled' }
            ],
            children: []
          }
        ]
      },
      {
        id: 'geo-board',
        code: 'GEO',
        name: 'GEO 看板',
        parentId: 'leai-root',
        level: 1,
        description: '负责 GEO 信源监测、引用分析、搜索表现和趋势报告。',
        owner: 'zhangjq4',
        status: 'enabled',
        memberCount: 2,
        updatedAt: '2026-07-13 16:42',
        scope: 'GEO 信源、看板和导出权限',
        members: [
          { name: '张俊强', account: 'zhangjq4', department: 'GEO 看板', orgRole: '负责人', permissionIdentity: '业务管理员', status: 'enabled' },
          { name: '黄佳琪', account: 'huangjq5', department: 'GEO 看板', orgRole: '成员', permissionIdentity: '数据查看人', status: 'enabled' }
        ],
        children: []
      },
      {
        id: 'enterprise-customer',
        code: 'BIZ-CUSTOMER',
        name: '企业客户',
        parentId: 'leai-root',
        level: 1,
        description: '负责企业客户线索、客户分层、商机跟进和客户运营数据。',
        owner: 'huangjq5',
        status: 'enabled',
        memberCount: 2,
        updatedAt: '2026-07-11 14:18',
        scope: '企业客户线索和商机数据权限',
        members: [
          { name: '黄佳琪', account: 'huangjq5', department: '企业客户', orgRole: '负责人', permissionIdentity: '业务管理员', status: 'enabled' },
          { name: '赵宁', account: 'zhaoning6', department: '企业客户', orgRole: '成员', permissionIdentity: '运营人员', status: 'enabled' }
        ],
        children: []
      },
      {
        id: 'ai-platform',
        code: 'AI-PLATFORM',
        name: 'AI 平台',
        parentId: 'leai-root',
        level: 1,
        description: '负责 Skill Hub、智能体能力、模型评测和平台级能力维护。',
        owner: 'sunzh4',
        status: 'enabled',
        memberCount: 2,
        updatedAt: '2026-07-10 19:00',
        scope: 'AI 平台功能和系统管理权限',
        members: [
          { name: '孙志', account: 'sunzh4', department: 'AI 平台', orgRole: '负责人', permissionIdentity: '业务管理员', status: 'enabled' },
          { name: '钱昊', account: 'qianhao2', department: 'AI 平台', orgRole: '管理员', permissionIdentity: '运营人员', status: 'enabled' }
        ],
        children: []
      }
    ]
  }
])

const selectedOrganizationId = ref('leai-root')
const organizationSearchKeyword = ref('')
const organizationNotice = ref('')
let organizationNoticeTimer = null
const organizationTenants = [
  { label: 'leaibot-cn', value: 'leaibot-cn' },
  { label: 'workbench', value: 'workbench' },
  { label: 'geo-dashboard', value: 'geo-dashboard' }
]

const organizationEditor = reactive({
  visible: false,
  mode: 'edit',
  orgId: '',
  draft: { id: '', tenant: 'leaibot-cn', code: '', name: '', parentId: '', owner: '', creator: 'admin', status: 'enabled', description: '', scope: '' },
  errors: { tenant: '', name: '', parentId: '', code: '', description: '' },
  notice: ''
})

const organizationMemberModal = reactive({
  visible: false,
  mode: 'create',
  originalOrganizationId: '',
  originalAccount: '',
  draft: { organizationId: 'leai-root', name: '', account: '', department: '', orgRole: '成员', permissionIdentity: '运营人员', status: 'enabled' },
  errors: { name: '', account: '' },
  notice: ''
})

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
const flatOrganizations = computed(() => flattenOrganizations(organizations))
const selectedOrganization = computed(() => findOrganizationById(selectedOrganizationId.value))
const selectedOrganizationMembers = computed(() => selectedOrganization.value?.members || [])
const filteredOrganizationTree = computed(() => {
  const keyword = organizationSearchKeyword.value.trim().toLowerCase()
  const rows = flatOrganizations.value
  if (!keyword) return rows.map((org) => ({ ...org, children: [] }))
  return rows
    .filter((org) => `${org.name} ${org.code} ${org.owner} ${org.description}`.toLowerCase().includes(keyword))
    .map((org) => ({ ...org, children: [] }))
})
const organizationStats = computed(() => {
  const rows = flatOrganizations.value
  const total = rows.length
  const children = rows.filter((org) => org.parentId).length
  const members = rows.reduce((sum, org) => sum + org.memberCount, 0)
  const ownerCount = rows.filter((org) => org.owner).length
  return {
    total,
    children,
    members,
    ownerCoverage: total ? `${Math.round((ownerCount / total) * 100)}%` : '0%'
  }
})

const hasDataSourceFilters = computed(() => !!(dataSourceFilters.group || dataSourceFilters.name))
const filteredDataSources = computed(() => {
  const name = dataSourceFilters.name.trim().toLowerCase()
  return dataSources.filter((source) => {
    const groupMatched = !dataSourceFilters.group || source.group === dataSourceFilters.group
    const nameMatched = !name || source.name.toLowerCase().includes(name)
    return groupMatched && nameMatched
  })
})
const organizationParentOptions = computed(() => flatOrganizations.value.filter((org) => org.id !== organizationEditor.orgId))
const filteredManagedRoles = computed(() => {
  const keyword = roleFilters.keyword.trim().toLowerCase()
  return allRoles.filter((role) => {
    const keywordMatched = !keyword || role.name.toLowerCase().includes(keyword)
    const groupMatched = !roleFilters.group || role.group === roleFilters.group
    return keywordMatched && groupMatched
  })
})
const roleEditorReadonly = computed(() => roleEditor.mode === 'view')
const roleEditorTitle = computed(() => {
  if (roleEditor.mode === 'create') return '新增角色'
  return `${roleEditor.mode === 'view' ? '查看角色' : '编辑角色'}：${roleEditor.draft.name || '未命名角色'}`
})
const roleEditorSelectedFunctionPermissions = computed(() => roleEditor.draft.functionPermissionIds
  .map((id) => allFunctionPermissions.find((permission) => permission.id === id))
  .filter(Boolean))
const roleEditorSelectedDataPermissions = computed(() => roleEditor.draft.dataPermissionIds
  .map((id) => findDataPermission(id))
  .filter(Boolean))
const roleHasNormalData = computed(() => !!roleEditor.draft.dataPermissionIds.length)
const roleHasCustomData = computed(() => !!roleEditor.draft.customDataRules.length)
const roleNormalDataLocked = computed(() => roleEditor.mode !== 'view' && roleHasNormalData.value)
const roleCustomDataLocked = computed(() => roleEditor.mode !== 'view' && roleHasCustomData.value)
const roleDataModeNotice = computed(() => {
  if (roleEditor.mode === 'view') return ''
  if (roleHasCustomData.value) return '当前使用自定义授权。如需改为普通授权，请先删除全部自定义授权。'
  if (roleHasNormalData.value) return '当前使用普通授权。如需改为自定义授权，请先取消全部普通数据权限。'
  return '请选择一种数据授权方式：普通授权或自定义授权，二者不能同时使用。'
})
const roleDeleteBlockReason = computed(() => {
  const role = roleDeleteConfirm.role
  if (!role) return ''
  if (role.systemRole) return '该角色是系统角色，用于基础流程或外部协作默认权限，不允许直接删除。'
  if (role.users > 0) return `该角色仍有 ${role.users} 个用户在使用，请先迁移这些用户后再删除。`
  return ''
})
const roleDeleteImpactText = computed(() => {
  const role = roleDeleteConfirm.role
  if (!role) return '请选择要删除的角色。'
  return `将删除“${role.name}”。删除后申请人无法再选择该角色，已保存的 mock 权限配置会从列表中移除。`
})
const hasUserFilters = computed(() => !!(userFilters.account || userFilters.name || userFilters.bindItcode))
const filteredUsers = computed(() => {
  const account = userFilters.account.trim().toLowerCase()
  const name = userFilters.name.trim().toLowerCase()
  return users.filter((user) => {
    const accountMatched = !account || `${user.userAccount} ${user.loginAccount}`.toLowerCase().includes(account)
    const nameMatched = !name || user.name.toLowerCase().includes(name)
    const bindMatched = !userFilters.bindItcode || (userFilters.bindItcode === 'yes' ? user.bindItcode : !user.bindItcode)
    return accountMatched && nameMatched && bindMatched
  })
})
const userWorkspaceReadonly = computed(() => userWorkspace.mode === 'view')
const activeUser = computed(() => users.find((user) => user.userAccount === userWorkspace.userAccount) || null)
const userWorkspaceTitle = computed(() => {
  if (!userWorkspace.draft) return '用户详情'
  if (userWorkspace.mode === 'create') return '新增用户'
  return `${userWorkspace.mode === 'view' ? '用户详情' : '编辑用户'}：${userWorkspace.draft.name || userWorkspace.draft.loginAccount}`
})
const userDraftRoles = computed(() => userWorkspace.draft ? userRoles(userWorkspace.draft) : [])
const userDraftInheritedFunctionIds = computed(() => userWorkspace.draft ? userInheritedFunctionIds(userWorkspace.draft) : [])
const userDraftInheritedDataIds = computed(() => userWorkspace.draft ? userInheritedDataIds(userWorkspace.draft) : [])
const userDraftExtraDataPermissions = computed(() => userWorkspace.draft
  ? userWorkspace.draft.extraDataPermissionIds.map((id) => findDataPermission(id)).filter(Boolean)
  : [])
const userHasNormalData = computed(() => !!(userWorkspace.draft?.extraDataPermissionIds?.length))
const userHasCustomData = computed(() => !!(userWorkspace.draft?.customDataRules?.length))
const userNormalDataLocked = computed(() => userWorkspace.mode !== 'view' && userHasNormalData.value)
const userCustomDataLocked = computed(() => userWorkspace.mode !== 'view' && userHasCustomData.value)
const userDataModeNotice = computed(() => {
  if (userWorkspace.mode === 'view') return ''
  if (userHasCustomData.value) return '当前使用自定义授权。如需改为普通授权，请先删除全部自定义授权。'
  if (userHasNormalData.value) return '当前使用普通授权。如需改为自定义授权，请先取消全部额外普通数据权限。'
  return '请选择一种数据授权方式：普通授权或自定义授权，二者不能同时使用。'
})
const filteredUserLoginLogs = computed(() => {
  const logs = userWorkspace.draft?.loginLogs || []
  if (userWorkspace.loginFilter === 'success') return logs.filter((log) => log.result === 'success')
  if (userWorkspace.loginFilter === 'failed') return logs.filter((log) => log.result === 'failed')
  return logs
})
const userPermissionChanged = computed(() => userWorkspace.mode === 'edit' && !!activeUser.value && !!userWorkspace.draft && hasUserPermissionChanged(activeUser.value, userWorkspace.draft))
const showUserApplicationNoField = computed(() => userPermissionChanged.value)
const filteredUserRoleOptions = computed(() => {
  const keyword = userRoleModal.keyword.trim().toLowerCase()
  if (!keyword) return allRoles
  return allRoles.filter((role) => {
    const functionText = role.functionPermissionIds.map(permissionName).join(' ')
    const dataText = role.dataPermissionIds.map(dataPermissionName).join(' ')
    return `${role.name} ${role.group} ${role.desc} ${functionText} ${dataText}`.toLowerCase().includes(keyword)
  })
})
const statusTargetUser = computed(() => users.find((user) => user.userAccount === userStatusConfirm.userAccount) || null)
function functionMenuParts(menu = '') {
  const [root = '', second = '', leaf = ''] = String(menu).split('/').map((part) => part.trim())
  return { root, second, leaf }
}

const functionRootOptions = computed(() => functionMenuTree.map((root) => root.name))
const functionSecondMenuOptions = computed(() => {
  const roots = functionFilters.root
    ? functionMenuTree.filter((root) => root.name === functionFilters.root)
    : functionMenuTree
  return [...new Set(roots.flatMap((root) => root.children.map((child) => child.name)))]
})
const hasFunctionFilters = computed(() => !!(functionFilters.name || functionFilters.root || functionFilters.menu || functionFilters.type))
const filteredManagedFunctions = computed(() => {
  const name = functionFilters.name.trim().toLowerCase()
  return managedFunctions.filter((item) => {
    const menuParts = functionMenuParts(item.menu)
    const nameMatched = !name || item.name.toLowerCase().includes(name)
    const rootMatched = !functionFilters.root || menuParts.root === functionFilters.root
    const menuMatched = !functionFilters.menu || menuParts.second === functionFilters.menu
    const typeMatched = !functionFilters.type || item.type === functionFilters.type
    return nameMatched && rootMatched && menuMatched && typeMatched
  })
})
const selectedManagedFunction = computed(() => filteredManagedFunctions.value.find((item) => item.id === selectedFunctionId.value) || filteredManagedFunctions.value[0] || null)
const selectedFunctionUsage = computed(() => selectedManagedFunction.value ? functionUsage(selectedManagedFunction.value) : { roles: [], users: [] })
const activeFunctionMenuRoot = computed(() => functionMenuTree.find((root) => root.id === functionEditor.menuRootId) || functionMenuTree[0])
const activeFunctionMenuChildren = computed(() => activeFunctionMenuRoot.value?.children || [])
const activeFunctionMenuChild = computed(() => activeFunctionMenuChildren.value.find((child) => child.id === functionEditor.menuChildId) || activeFunctionMenuChildren.value[0] || null)
const activeFunctionMenuLeaves = computed(() => activeFunctionMenuChild.value?.children || [])
const availableFunctionInterfaces = computed(() => functionInterfaceCatalog.filter((api) => !functionEditor.draft.interfaces.some((item) => item.id === api.id)))
const selectedFunctionInterface = computed(() => functionInterfaceCatalog.find((api) => api.id === functionEditor.selectedInterfaceId) || null)
const isExternalPerson = computed(() => form.personType === 'external')
const selectedRoles = computed(() => allRoles.filter((role) => selectedRoleIds.value.includes(role.id)))
const copiedRoles = computed(() => allRoles.filter((role) => copiedRoleIds.value.includes(role.id)))
const allSelectedRoles = computed(() => allRoles.filter((role) => [...selectedRoleIds.value, ...copiedRoleIds.value].includes(role.id)))
const copiedFromUser = computed(() => copyableUsers.find((user) => user.itcode === copiedFromItcode.value) || null)
const filteredRoleOptions = computed(() => {
  const keyword = roleModal.keyword.trim().toLowerCase()
  if (!keyword) return allRoles
  return allRoles.filter((role) => {
    const functionText = role.functionPermissionIds.map(permissionName).join(' ')
    return `${role.name} ${functionText}`.toLowerCase().includes(keyword)
  })
})
const selectedFunctionPermissions = computed(() => {
  const ids = new Set(copiedFunctionPermissionIds.value)
  allSelectedRoles.value.forEach((role) => role.functionPermissionIds.forEach((id) => ids.add(id)))
  return allFunctionPermissions.filter((permission) => ids.has(permission.id))
})
const selectedDataPermissionDetails = computed(() => selectedDataPermissionIds.value
  .map((id) => {
    const permission = findDataPermission(id)
    if (!permission) return null
    return {
      ...permission,
      source: copiedDataSourceMap[id] || (manualDataPermissionIds.value.includes(id) ? '本次新增' : '')
    }
  })
  .filter(Boolean))
const selectedDataTree = computed(() => buildSelectedDataTree())
const manualDataPermissionDetails = computed(() => manualDataPermissionIds.value.map((id) => findDataPermission(id)).filter(Boolean))
const copiedExtraFunctionPermissions = computed(() => copiedFunctionPermissionIds.value.map((id) => allFunctionPermissions.find((permission) => permission.id === id)).filter(Boolean))
const copiedUserGrantedDataPermissions = computed(() => Object.entries(copiedDataSourceMap).filter(([id, source]) => source === '用户单独授权' && selectedDataPermissionIds.value.includes(id)).map(([id]) => findDataPermission(id)).filter(Boolean))
const hasCopiedUserGrantedData = computed(() => Object.values(copiedDataSourceMap).includes('用户单独授权'))
const hasPermissionSources = computed(() => selectedRoles.value.length > 0 || !!copiedFromUser.value || manualDataPermissionDetails.value.length > 0)
const scopeSummaryText = computed(() => `${allSelectedRoles.value.length} 个角色、${selectedFunctionPermissions.value.length} 项功能权限、${selectedDataPermissionDetails.value.length} 项数据权限`)
const confirmationText = computed(() => `${form.relation.contact}，组织为 ${form.relation.org}，角色为 ${allSelectedRoles.value.map((role) => role.name).join('、') || '待选择'}，数据权限 ${selectedDataPermissionDetails.value.length} 项。`)
const approvalNodes = computed(() => {
  const nodes = [
    { label: '申请人提交', owner: form.applicant, done: true }
  ]
  if (isExternalPerson.value) {
    nodes.push({ label: '关联人审批', owner: form.relatedAccount || '待填写关联人员', done: false })
  }
  nodes.push(
    { label: '直线经理审批', owner: form.manager, done: false },
    { label: '业务审批', owner: form.businessApprover || '待选择', done: false },
    { label: '系统审批 / 后台执行', owner: form.systemApprover, done: false }
  )
  return nodes.map((node, index) => ({ ...node, step: String(index + 1) }))
})
const handlerCandidateOptions = computed(() => {
  const values = new Set()
  approvals.value.forEach((row) => {
    ;[row.approverItcode, row.applicantItcode, row.manager, row.systemApprover, ...row.handlers].forEach((item) => {
      if (item) values.add(parseApproverItcode(item))
    })
  })
  copyableUsers.forEach((user) => values.add(user.itcode))
  users.forEach((user) => values.add(user.loginAccount))
  businessApprovers.forEach((item) => values.add(parseApproverItcode(item)))
  return [...values].filter(Boolean).sort((a, b) => a.localeCompare(b))
})
const handlerSuggestions = computed(() => {
  const keyword = approvalSearch.handlerDraft.trim().toLowerCase()
  if (!keyword) return handlerCandidateOptions.value.filter((item) => !isApprovalHandlerSelected(item)).slice(0, 8)
  return handlerCandidateOptions.value
    .filter((item) => item.toLowerCase().includes(keyword) && !isApprovalHandlerSelected(item))
    .slice(0, 8)
})
const showHandlerSuggestions = computed(() => approvalSearch.handlerFocused && handlerSuggestions.value.length > 0)
const handlerInputPlaceholder = computed(() => approvalSearch.handlers.length ? '继续输入 ITCode' : '输入处理人 ITCode')
const filteredApprovals = computed(() => {
  const approverKeyword = approvalSearch.approverItcode.trim().toLowerCase()
  return approvals.value.filter((row) => {
    const statusMatched = approvalSearch.status === '全部' || row.status === approvalSearch.status
    const approverMatched = !approverKeyword || row.approverItcode.toLowerCase().includes(approverKeyword)
    const handlersMatched = !approvalSearch.handlers.length || approvalSearch.handlers.some((handler) => row.handlers.some((item) => item.toLowerCase().includes(handler.toLowerCase())))
    return statusMatched && approverMatched && handlersMatched
  })
})
const activeApproval = computed(() => approvals.value.find((row) => row.id === approvalWorkspace.rowId) || null)
const activeApprovalBasicFields = computed(() => {
  if (!activeApproval.value) return []
  const row = activeApproval.value
  const fields = [
    { label: '申请单号', value: row.id },
    { label: '申请类型', value: row.type },
    { label: '申请人', value: `${row.applicant}（${row.applicantItcode}）` },
    { label: '被申请人', value: row.target },
    { label: '人员类型', value: row.personType === 'external' ? '外部人员' : '内部人员' },
    { label: '关联账号 / 关联人员', value: row.relatedAccount || '无' },
    { label: '直线经理', value: row.manager },
    { label: '业务审批人', value: row.businessApprover },
    { label: '系统审批人', value: row.systemApprover },
    { label: '当前审批人', value: row.approverItcode },
    { label: '处理人', value: row.handlers.join('、') },
    { label: '申请原因', value: row.reason || '未填写' }
  ]
  if (row.businessInfo?.organizations?.length) fields.push({ label: '所属组织', value: row.businessInfo.organizations.join('、') })
  if (row.businessInfo?.tenant) fields.push({ label: '所属租户', value: row.businessInfo.tenant })
  return fields
})
const canEditApprovalPermission = computed(() => approvalWorkspace.mode === 'approve' && approvalWorkspace.nodeType === 'manager')
const canEditBusinessOwnership = computed(() => approvalWorkspace.mode === 'approve' && approvalWorkspace.nodeType === 'business')
const activeApprovalHasPermission = computed(() => hasPermissionSources.value)
const activeApprovalPermissionSummary = computed(() => scopeSummaryText.value)
const approvalResultOptions = computed(() => [
  { value: 'agree', label: '同意' },
  { value: 'reject', label: '驳回' }
])
const approvalDecisionTitle = computed(() => {
  if (approvalWorkspace.nodeType === 'relation') return '关联确认'
  if (approvalWorkspace.nodeType === 'manager') return '直线经理审批'
  return '业务负责人审批'
})
const approvalDecisionHint = computed(() => {
  if (approvalWorkspace.nodeType === 'relation') return '关联人只能确认关系并填写审批意见，申请信息和权限信息不可编辑。'
  if (approvalWorkspace.nodeType === 'manager') return '经理可在审批中调整权限范围，再提交审批结论。'
  return '业务负责人需填写业务归属，权限范围只读不可修改。'
})
const approvalSubmitImpact = computed(() => {
  if (!approvalWorkspace.result) return '请选择审批结果后提交。'
  if (approvalWorkspace.result === 'reject') return '申请将退回申请人修改，列表状态变为已驳回。'
  if (approvalWorkspace.nodeType === 'relation') return '确认通过后，申请进入直线经理审批。'
  if (approvalWorkspace.nodeType === 'manager') return '经理审批通过后，申请进入业务负责人审批。'
  return '业务审批通过后，申请进入后台执行并在 POC 中标记执行完成。'
})


function syncFunctionMenuFilter() {
  if (functionFilters.menu && !functionSecondMenuOptions.value.includes(functionFilters.menu)) {
    functionFilters.menu = ''
  }
}
function resetFunctionFilters() {
  functionFilters.name = ''
  functionFilters.root = ''
  functionFilters.menu = ''
  functionFilters.type = ''
  if (filteredManagedFunctions.value[0]) selectedFunctionId.value = filteredManagedFunctions.value[0].id
}

function selectManagedFunction(id) {
  selectedFunctionId.value = id
}

function functionTypeLabel(value) {
  return functionTypeOptions.find((option) => option.value === value)?.label || value
}

function functionStatusLabel(value) {
  return value === 'enabled' ? '启用' : '停用'
}

function functionUsage(item) {
  const id = item?.id
  if (!id) return { roles: [], users: [] }
  const roles = allRoles.filter((role) => role.functionPermissionIds.includes(id))
  const usersByAccount = new Map()
  users.forEach((user) => {
    const inherited = userRoles(user).some((role) => role.functionPermissionIds.includes(id))
    const direct = (user.extraFunctionPermissionIds || []).includes(id)
    if (inherited || direct) usersByAccount.set(user.userAccount, { ...user, source: direct ? '用户单独授权' : '角色继承' })
  })
  return { roles, users: [...usersByAccount.values()] }
}

function cloneFunctionDraft(item) {
  const draft = emptyFunctionDraft()
  return item ? { ...draft, ...JSON.parse(JSON.stringify(item)) } : draft
}

function resetFunctionEditorErrors() {
  functionEditor.errors.menu = ''
  functionEditor.errors.name = ''
  functionEditor.errors.description = ''
  functionEditor.errors.type = ''
  functionEditor.errors.interfaces = ''
  functionEditor.notice = ''
}

function functionMenuFullPath(root, child, leaf) {
  return [root?.name, child?.name, leaf?.name].filter(Boolean).join(' / ')
}

function setFunctionMenuPickerByMenu(menu) {
  for (const root of functionMenuTree) {
    for (const child of root.children) {
      const leaf = child.children.find((item) => item.name === menu || functionMenuFullPath(root, child, item) === menu)
      if (leaf) {
        functionEditor.menuRootId = root.id
        functionEditor.menuChildId = child.id
        return
      }
    }
  }
  functionEditor.menuRootId = functionMenuTree[0].id
  functionEditor.menuChildId = functionMenuTree[0].children[0].id
}

function selectFunctionMenuRoot(id) {
  functionEditor.menuRootId = id
  const root = functionMenuTree.find((item) => item.id === id)
  functionEditor.menuChildId = root?.children?.[0]?.id || ''
}

function selectFunctionMenuChild(id) {
  functionEditor.menuChildId = id
}

function selectFunctionMenuLeaf(name) {
  const root = activeFunctionMenuRoot.value
  const child = activeFunctionMenuChild.value
  const leaf = activeFunctionMenuLeaves.value.find((item) => item.name === name)
  functionEditor.draft.menu = functionMenuFullPath(root, child, leaf)
  functionEditor.menuPickerOpen = false
  functionEditor.errors.menu = ''
}
function openFunctionEditor(mode, item = null) {
  resetFunctionEditorErrors()
  functionEditor.visible = true
  functionEditor.mode = mode
  functionEditor.functionId = item?.id || ''
  functionEditor.selectedInterfaceId = ''
  functionEditor.menuPickerOpen = false
  functionEditor.draft = cloneFunctionDraft(item)
  setFunctionMenuPickerByMenu(functionEditor.draft.menu)
}

function closeFunctionEditor() {
  functionEditor.visible = false
  functionEditor.notice = ''
}

function addFunctionInterface() {
  resetFunctionEditorErrors()
  const api = selectedFunctionInterface.value
  if (!api) {
    functionEditor.errors.interfaces = '请先选择要关联的接口。'
    return
  }
  if (!functionEditor.draft.interfaces.some((item) => item.id === api.id)) {
    functionEditor.draft.interfaces.push({ ...api })
  }
  functionEditor.selectedInterfaceId = ''
}

function removeFunctionInterface(id) {
  functionEditor.draft.interfaces = functionEditor.draft.interfaces.filter((api) => api.id !== id)
}

function validateFunctionEditor() {
  resetFunctionEditorErrors()
  const draft = functionEditor.draft
  if (!draft.menu) functionEditor.errors.menu = '请选择所属菜单，方便后台人员理解功能归属。'
  if (!draft.name) functionEditor.errors.name = '请填写功能名称，名称会展示在功能列表和授权说明中。'
  if (!draft.description) functionEditor.errors.description = '请填写功能描述，说明该功能给谁使用、能做什么。'
  if (!draft.type) functionEditor.errors.type = '请选择类型：功能、按钮或 Skill。'
  if (!draft.interfaces.length) functionEditor.errors.interfaces = '请至少关联一个接口，便于后续排查授权影响。'
  return !Object.values(functionEditor.errors).some(Boolean)
}

function functionCodeFromName(name) {
  const text = String(name || 'custom').trim().toLowerCase()
  const ascii = text.replace(/[^a-z0-9]+/g, '.').replace(/^\.+|\.+$/g, '')
  return `func.custom.${ascii || Date.now()}`
}

function saveFunctionEditor() {
  if (!validateFunctionEditor()) return
  const draft = cloneFunctionDraft(functionEditor.draft)
  if (functionEditor.mode === 'create') {
    draft.id = functionCodeFromName(draft.name)
    while (managedFunctions.some((item) => item.id === draft.id)) {
      draft.id = `func.custom.${Date.now()}`
    }
    managedFunctions.unshift(draft)
    if (!allFunctionPermissions.some((permission) => permission.id === draft.id)) {
      allFunctionPermissions.push({ id: draft.id, name: draft.name })
    }
    selectedFunctionId.value = draft.id
    showFunctionNotice(`已新增“${draft.name}”。`)
  } else {
    const index = managedFunctions.findIndex((item) => item.id === functionEditor.functionId)
    if (index >= 0) {
      managedFunctions.splice(index, 1, { ...managedFunctions[index], ...draft, id: managedFunctions[index].id })
      const permission = allFunctionPermissions.find((item) => item.id === managedFunctions[index].id)
      if (permission) permission.name = draft.name
      selectedFunctionId.value = managedFunctions[index].id
      showFunctionNotice(`已保存“${draft.name}”。`)
    }
  }
  closeFunctionEditor()
}

function deleteSelectedManagedFunction() {
  const item = selectedManagedFunction.value
  if (!item) return
  const usage = functionUsage(item)
  if (usage.roles.length || usage.users.length) {
    showFunctionNotice('该功能仍有关联角色或用户，当前 POC 不允许直接删除。请先调整授权后再删除。')
    return
  }
  if (!window.confirm(`确认删除“${item.name}”吗？删除后当前功能管理列表将不再展示。`)) return
  const index = managedFunctions.findIndex((fn) => fn.id === item.id)
  if (index >= 0) managedFunctions.splice(index, 1)
  selectedFunctionId.value = filteredManagedFunctions.value[0]?.id || ''
  showFunctionNotice(`已删除“${item.name}”。`)
}
function deleteManagedFunction() {
  const item = managedFunctions.find((fn) => fn.id === functionEditor.functionId)
  if (!item) return
  const usage = functionUsage(item)
  if (usage.roles.length || usage.users.length) {
    functionEditor.notice = '该功能仍有关联角色或用户，当前 POC 不允许直接删除。请先调整授权后再删除。'
    return
  }
  if (!window.confirm(`确认删除“${item.name}”吗？删除后当前功能管理列表将不再展示。`)) return
  const index = managedFunctions.findIndex((fn) => fn.id === item.id)
  if (index >= 0) managedFunctions.splice(index, 1)
  selectedFunctionId.value = filteredManagedFunctions.value[0]?.id || ''
  showFunctionNotice(`已删除“${item.name}”。`)
  closeFunctionEditor()
}

function clearFunctionNoticeTimer() {
  if (!functionNoticeTimer) return
  window.clearTimeout(functionNoticeTimer)
  functionNoticeTimer = null
}

function dismissFunctionNotice() {
  clearFunctionNoticeTimer()
  functionNotice.value = ''
}

function showFunctionNotice(message) {
  clearFunctionNoticeTimer()
  functionNotice.value = message
  functionNoticeTimer = window.setTimeout(() => {
    functionNotice.value = ''
    functionNoticeTimer = null
  }, 2800)
}
function resetDataSourceFilters() {
  dataSourceFilters.group = ''
  dataSourceFilters.name = ''
}

function dataSourceSensitivityLabel(value) {
  return dataSourceSensitivityOptions.find((option) => option.value === value)?.label || value
}

function resetDataSourceEditorErrors() {
  dataSourceEditor.errors.group = ''
  dataSourceEditor.errors.dataSource = ''
  dataSourceEditor.errors.name = ''
  dataSourceEditor.errors.apiUrl = ''
  dataSourceEditor.errors.permissionParam = ''
  dataSourceEditor.errors.remark = ''
  dataSourceEditor.notice = ''
}

function cloneDataSourceDraft(source) {
  const draft = emptyDataSourceDraft()
  return source ? { ...draft, ...source } : draft
}

function openDataSourceEditor(mode, source = null) {
  resetDataSourceEditorErrors()
  dataSourceEditor.visible = true
  dataSourceEditor.mode = mode
  dataSourceEditor.sourceId = source?.id || ''
  dataSourceEditor.draft = cloneDataSourceDraft(source)
}

function closeDataSourceEditor() {
  dataSourceEditor.visible = false
}

function validateDataSourceEditor() {
  resetDataSourceEditorErrors()
  const draft = dataSourceEditor.draft
  if (!draft.group) dataSourceEditor.errors.group = '请选择分组。'
  if (!draft.dataSource) dataSourceEditor.errors.dataSource = '请选择数据源。'
  if (!draft.name) dataSourceEditor.errors.name = '请填写名称，方便业务人员识别。'
  if (!draft.apiUrl) dataSourceEditor.errors.apiUrl = '请填写接口地址。'
  if (!draft.permissionParam) dataSourceEditor.errors.permissionParam = '请填写权限参数。'
  if (draft.remark.length > 120) dataSourceEditor.errors.remark = '备注建议控制在 120 字以内。'
  return !(dataSourceEditor.errors.group || dataSourceEditor.errors.dataSource || dataSourceEditor.errors.name || dataSourceEditor.errors.apiUrl || dataSourceEditor.errors.permissionParam || dataSourceEditor.errors.remark)
}

function buildNewDataSourceFromDraft(draft) {
  return { ...emptyDataSourceDraft(), ...draft, id: `ds-${Date.now()}` }
}

function saveDataSourceEditor() {
  if (!validateDataSourceEditor()) return
  const draft = { ...dataSourceEditor.draft }
  if (dataSourceEditor.mode === 'create') {
    const source = buildNewDataSourceFromDraft(draft)
    dataSources.unshift(source)
    showDataSourceNotice(`已新增“${source.name}”。`)
  } else {
    const index = dataSources.findIndex((source) => source.id === dataSourceEditor.sourceId)
    if (index >= 0) {
      dataSources.splice(index, 1, { ...dataSources[index], ...draft })
      showDataSourceNotice(`已保存“${draft.name}”。`)
    }
  }
  dataSourceEditor.notice = '保存成功。'
  dataSourceEditor.visible = false
}

function deleteDataSource(row) {
  if (!window.confirm(`确认删除“${row.name}”吗？删除后当前 POC 列表将不再展示该数据源。`)) return
  const index = dataSources.findIndex((source) => source.id === row.id)
  if (index >= 0) dataSources.splice(index, 1)
  showDataSourceNotice(`已删除“${row.name}”。`)
}

function openDataSourceDetail(row) {
  openEntityModal('数据源详情', {
    分组: row.group,
    数据源: row.dataSource,
    名称: row.name,
    接口地址: row.apiUrl,
    权限参数: row.permissionParam,
    key: row.key || '未配置',
    Value: row.value || '未配置',
    备注: row.remark || '无',
    敏感性: dataSourceSensitivityLabel(row.sensitivity)
  })
}

function clearDataSourceNoticeTimer() {
  if (!dataSourceNoticeTimer) return
  window.clearTimeout(dataSourceNoticeTimer)
  dataSourceNoticeTimer = null
}

function dismissDataSourceNotice() {
  clearDataSourceNoticeTimer()
  dataSourceNotice.value = ''
}

function showDataSourceNotice(message) {
  clearDataSourceNoticeTimer()
  dataSourceNotice.value = message
  dataSourceNoticeTimer = window.setTimeout(() => {
    dataSourceNotice.value = ''
    dataSourceNoticeTimer = null
  }, 2800)
}

function selectPersonType(key) {
  form.personType = key
  if (key === 'internal') {
    formErrors.relatedAccount = ''
  }
}

function validateInfoForm() {
  formErrors.targetUser = form.targetUser ? '' : '请填写被申请人的 ITCode 或姓名，方便审批人确认对象。'
  formErrors.relatedAccount = isExternalPerson.value && !form.relatedAccount
    ? '外部人员需要填写负责对接的内部员工 ITCode 或姓名。'
    : ''
  formErrors.reason = form.reason ? '' : '请补充申请原因，说明业务场景和需要使用的权限范围。'
  formErrors.businessApprover = form.businessApprover ? '' : '请选择业务审批人，申请才能进入后续审批。'
  return !Object.values(formErrors).some(Boolean)
}

function resetRoleFilters() {
  roleFilters.keyword = ''
  roleFilters.group = ''
}

function cloneRole(role) {
  return JSON.parse(JSON.stringify(role || emptyRoleDraft()))
}

function resetRoleEditorErrors() {
  Object.keys(roleEditor.errors).forEach((key) => {
    roleEditor.errors[key] = ''
  })
}

function openRoleEditor(mode, role = null) {
  resetRoleEditorErrors()
  roleEditor.visible = true
  roleEditor.mode = mode
  roleEditor.roleId = role?.id || ''
  roleEditor.activeTab = 'basic'
  roleEditor.notice = mode === 'view' ? '当前为只读查看。' : ''
  roleEditor.draft = cloneRole(role || emptyRoleDraft())
  roleEditor.dataTab = roleEditor.draft.customDataRules.length ? 'custom' : 'normal'
}

function closeRoleEditor() {
  roleEditor.visible = false
  roleEditor.notice = ''
}

function switchRoleEditorToEdit() {
  roleEditor.mode = roleEditor.roleId ? 'edit' : 'create'
  roleEditor.dataTab = roleEditor.draft.customDataRules.length ? 'custom' : 'normal'
  roleEditor.notice = ''
}

function validateRoleEditor() {
  resetRoleEditorErrors()
  roleEditor.errors.name = roleEditor.draft.name ? '' : '请输入角色名称，便于申请人识别该角色用途。'
  roleEditor.errors.type = roleEditor.draft.type ? '' : '请选择角色类型，例如业务角色或分析角色。'
  roleEditor.errors.group = roleEditor.draft.group ? '' : '请选择角色组，便于列表筛选和业务归口。'
  roleEditor.errors.owner = roleEditor.draft.owner ? '' : '请输入业务负责人，便于后续审批和维护。'
  roleEditor.errors.dataMode = roleEditor.draft.dataPermissionIds.length && roleEditor.draft.customDataRules.length ? '普通授权和自定义授权只能选择一种，请先删除其中一类数据权限。' : ''
  return !Object.values(roleEditor.errors).some(Boolean)
}

function saveRoleEditor() {
  if (!validateRoleEditor()) {
    roleEditor.activeTab = roleEditor.errors.dataMode ? 'data' : 'basic'
    return
  }
  const nextRole = cloneRole(roleEditor.draft)
  nextRole.updatedAt = '2026-07-14 18:30'
  nextRole.code = nextRole.code || roleCodeFromName(nextRole.name)
  if (roleEditor.mode === 'create') {
    nextRole.id = `role-${Date.now()}`
    allRoles.push(nextRole)
    roleEditor.roleId = nextRole.id
  } else {
    const index = allRoles.findIndex((role) => role.id === roleEditor.roleId)
    if (index >= 0) {
      allRoles.splice(index, 1, nextRole)
    }
  }
  roleEditor.mode = 'view'
  roleEditor.draft = cloneRole(nextRole)
  roleEditor.notice = '已保存角色配置，申请流程中选择该角色会使用最新权限范围。'
}

function roleCodeFromName(name) {
  const text = String(name || 'NEW').trim()
  return text ? text.slice(0, 3).toUpperCase() : 'NEW'
}

function toggleRoleFunctionPermission(id) {
  if (roleEditorReadonly.value) return
  toggleId(roleEditor.draft.functionPermissionIds, id)
  if (!roleEditor.draft.functionPermissionIds.includes(id)) {
    delete roleEditor.draft.functionPermissionNotes[id]
  }
}

function switchRoleDataTab(tab) {
  roleEditor.errors.dataMode = ''
  if (tab === 'normal' && roleCustomDataLocked.value) {
    roleEditor.errors.dataMode = '当前已有自定义授权，需删除自定义授权后才能使用普通授权。'
    return
  }
  if (tab === 'custom' && roleNormalDataLocked.value) {
    roleEditor.errors.dataMode = '当前已有普通授权，需取消普通授权后才能使用自定义授权。'
    return
  }
  roleEditor.dataTab = tab
}

function toggleRoleDataPermission(id) {
  if (roleEditorReadonly.value) return
  if (roleCustomDataLocked.value) {
    roleEditor.errors.dataMode = '当前已有自定义授权，需删除自定义授权后才能使用普通授权。'
    return
  }
  roleEditor.errors.dataMode = ''
  toggleId(roleEditor.draft.dataPermissionIds, id)
  if (!roleEditor.draft.dataPermissionIds.includes(id)) {
    delete roleEditor.draft.dataPermissionNotes[id]
  }
}

function addCustomDataRule() {
  if (roleEditorReadonly.value) return
  if (roleNormalDataLocked.value) {
    roleEditor.errors.dataMode = '当前已有普通授权，需取消普通授权后才能使用自定义授权。'
    return
  }
  roleEditor.errors.dataMode = ''
  roleEditor.draft.customDataRules.push({
    id: `rule-${Date.now()}`,
    dataset: '运营数据集',
    fields: '字段范围待填写',
    organization: roleEditor.draft.group || '乐享运营',
    region: '全国',
    period: '长期有效',
    remark: ''
  })
}

function removeCustomDataRule(id) {
  roleEditor.draft.customDataRules = roleEditor.draft.customDataRules.filter((rule) => rule.id !== id)
  roleEditor.errors.dataMode = ''
}

function sensitivityMeta(value) {
  return sensitivityOptions.find((option) => option.value === value) || sensitivityOptions[0]
}

function sensitivityLabel(value) {
  return sensitivityMeta(value)?.label || value
}

function sensitivityDescription(value) {
  return sensitivityMeta(value)?.desc || '请选择角色敏感性。'
}

function sensitivityRisk(value) {
  return sensitivityMeta(value)?.risk || 'low'
}

function openRoleDeleteConfirm(role) {
  roleDeleteConfirm.visible = true
  roleDeleteConfirm.role = role
}

function closeRoleDeleteConfirm() {
  roleDeleteConfirm.visible = false
  roleDeleteConfirm.role = null
}

function confirmDeleteRole() {
  const role = roleDeleteConfirm.role
  if (!role || roleDeleteBlockReason.value) return
  const index = allRoles.findIndex((item) => item.id === role.id)
  if (index >= 0) {
    allRoles.splice(index, 1)
  }
  closeRoleDeleteConfirm()
}
function selectRequestType(key) {
  form.type = key
  if (key === 'create') {
    form.scopes.account = ['登录工作台']
  } else if (key === 'disable') {
    form.scopes.account = ['禁用账号']
  } else if (key === 'reset') {
    form.scopes.account = ['重置密码']
  } else {
    form.scopes.account = []
  }
}

function nextStep() {
  if (currentStep.value === 1 && !validateInfoForm()) return
  currentStep.value = Math.min(currentStep.value + 1, applySteps.length - 1)
}

function prevStep() {
  currentStep.value = Math.max(currentStep.value - 1, 0)
}

function submitApplication() {
  if (!validateInfoForm()) {
    currentStep.value = 1
    return
  }
  const nodeType = isExternalPerson.value ? 'relation' : 'manager'
  approvals.value.unshift(createApprovalRow({
    id: `AP-20260713-${String(approvals.value.length + 11).padStart(3, '0')}`,
    typeKey: form.type,
    type: selectedType.value.label,
    applicant: form.applicant,
    applicantItcode: form.itcode,
    applicantEmail: form.itcode + '@lenovo.com',
    target: form.targetUser || '待补充',
    nodeType,
    approverItcode: nodeType === 'relation' ? form.relatedAccount : form.manager,
    handlers: [nodeType === 'relation' ? form.relatedAccount : form.manager].filter(Boolean),
    personType: form.personType,
    relatedAccount: form.relatedAccount,
    manager: form.manager,
    businessApprover: form.businessApprover,
    systemApprover: form.systemApprover,
    reason: form.reason,
    permissionSnapshot: createPermissionSnapshot(),
    time: '2026-07-13 11:45'
  }))
  records.value.unshift({
    time: '2026-07-13 11:45',
    title: `${selectedType.value.label}申请已提交`,
    detail: `${form.targetUser || '目标用户'} 已选择 ${scopeSummaryText.value}，申请进入审批列表。`,
    status: 'POC 记录'
  })
  activeModule.value = 'approval'
  currentStep.value = 0
}

function openRoleModal() {
  roleModal.visible = true
  roleModal.keyword = ''
  roleModal.selectedIds = [...selectedRoleIds.value]
}

function closeRoleModal() {
  roleModal.visible = false
}

function toggleTempRole(id) {
  toggleId(roleModal.selectedIds, id)
}

function confirmRoleSelection() {
  applyRoleSelection(roleModal.selectedIds)
  closeRoleModal()
}

function removeRole(id) {
  applyRoleSelection(selectedRoleIds.value.filter((roleId) => roleId !== id))
}

function openCopyModal() {
  copyModal.visible = true
  copyModal.itcode = copiedFromItcode.value || ''
  copyModal.error = ''
}

function closeCopyModal() {
  copyModal.visible = false
}

function confirmCopyPermissions() {
  const itcode = copyModal.itcode.trim()
  if (!itcode) {
    copyModal.error = '请输入要复制的对方 ITCode。'
    return
  }
  const user = copyableUsers.find((item) => item.itcode.toLowerCase() === itcode.toLowerCase())
  if (!user) {
    copyModal.error = '没有找到该 ITCode 的 mock 权限，请检查后再试。'
    return
  }
  copiedFromItcode.value = user.itcode
  copiedRoleIds.value = [...user.roleIds]
  copiedFunctionPermissionIds.value = [...user.functionPermissionIds]
  clearCopiedDataSources()
  user.dataPermissions.forEach((item) => {
    copiedDataSourceMap[item.id] = item.source
  })
  addUniqueIds(selectedDataPermissionIds.value, user.dataPermissions.map((item) => item.id))
  closeCopyModal()
}

function clearCopiedPermissions() {
  const copiedIds = Object.keys(copiedDataSourceMap)
  copiedFromItcode.value = ''
  copiedRoleIds.value = []
  copiedFunctionPermissionIds.value = []
  clearCopiedDataSources()
  selectedDataPermissionIds.value = selectedDataPermissionIds.value.filter((id) => !copiedIds.includes(id) || manualDataPermissionIds.value.includes(id) || currentRoleDataIds().includes(id))
}

function openDataModal() {
  dataModal.visible = true
  dataModal.selectedIds = [...selectedDataPermissionIds.value]
}

function closeDataModal() {
  dataModal.visible = false
}

function toggleTempDataPermission(id) {
  toggleId(dataModal.selectedIds, id)
}

function confirmDataSelection() {
  const nextIds = [...dataModal.selectedIds]
  const roleIds = roleDataIds([...selectedRoleIds.value, ...copiedRoleIds.value])
  const copiedIds = Object.keys(copiedDataSourceMap)
  manualDataPermissionIds.value = nextIds.filter((id) => !roleIds.includes(id) && !copiedIds.includes(id))
  selectedDataPermissionIds.value = nextIds
  closeDataModal()
}

function removeDataPermission(id) {
  selectedDataPermissionIds.value = selectedDataPermissionIds.value.filter((item) => item !== id)
  manualDataPermissionIds.value = manualDataPermissionIds.value.filter((item) => item !== id)
}

function applyRoleSelection(nextIds) {
  const previousRoleDataIds = currentRoleDataIds()
  selectedRoleIds.value = [...nextIds]
  const nextRoleDataIds = currentRoleDataIds()
  selectedDataPermissionIds.value = selectedDataPermissionIds.value.filter((id) => {
    const wasRoleOnly = previousRoleDataIds.includes(id) && !manualDataPermissionIds.value.includes(id) && !copiedDataSourceMap[id]
    return !(wasRoleOnly && !nextRoleDataIds.includes(id))
  })
  addUniqueIds(selectedDataPermissionIds.value, nextRoleDataIds)
}

function roleFunctionPermissions(role) {
  return role.functionPermissionIds.map((id) => allFunctionPermissions.find((permission) => permission.id === id)).filter(Boolean)
}

function roleDataPermissions(role) {
  return role.dataPermissionIds
    .filter((id) => selectedDataPermissionIds.value.includes(id))
    .map((id) => findDataPermission(id))
    .filter(Boolean)
}

function copiedRoleDataPermissions(role) {
  return role.dataPermissionIds
    .filter((id) => copiedDataSourceMap[id] === '角色继承' && selectedDataPermissionIds.value.includes(id))
    .map((id) => findDataPermission(id))
    .filter(Boolean)
}
function resetRoleDataPermissions(roleId) {
  const role = allRoles.find((item) => item.id === roleId)
  if (!role) return
  addUniqueIds(selectedDataPermissionIds.value, role.dataPermissionIds)
}

function resetCopiedRoleDataPermissions(roleId) {
  const role = allRoles.find((item) => item.id === roleId)
  if (!role) return
  const ids = role.dataPermissionIds.filter((id) => copiedDataSourceMap[id] === '角色继承')
  addUniqueIds(selectedDataPermissionIds.value, ids)
}

function resetCopiedUserDataPermissions() {
  const ids = Object.entries(copiedDataSourceMap)
    .filter(([, source]) => source === '用户单独授权')
    .map(([id]) => id)
  addUniqueIds(selectedDataPermissionIds.value, ids)
}
function permissionName(id) {
  return allFunctionPermissions.find((permission) => permission.id === id)?.name || id
}

function dataPermissionName(id) {
  return findDataPermission(id)?.name || id
}

function sourceClass(source) {
  if (source === '角色继承') return 'role'
  if (source === '用户单独授权') return 'user'
  return 'manual'
}

function currentRoleDataIds() {
  return roleDataIds(selectedRoleIds.value)
}

function roleDataIds(roleIds) {
  return [...new Set(allRoles
    .filter((role) => roleIds.includes(role.id))
    .flatMap((role) => role.dataPermissionIds))]
}

function addUniqueIds(target, ids) {
  ids.forEach((id) => {
    if (!target.includes(id)) target.push(id)
  })
}

function toggleId(target, id) {
  const index = target.indexOf(id)
  if (index >= 0) {
    target.splice(index, 1)
  } else {
    target.push(id)
  }
}

function clearCopiedDataSources() {
  Object.keys(copiedDataSourceMap).forEach((key) => {
    delete copiedDataSourceMap[key]
  })
}

function findDataPermission(id) {
  for (const group of dataPermissionTree) {
    for (const child of group.children) {
      const leaf = child.children.find((item) => item.id === id)
      if (leaf) return leaf
    }
  }
  return null
}

function buildSelectedDataTree() {
  const selectedIds = selectedDataPermissionIds.value
  return dataPermissionTree
    .map((group) => {
      const children = group.children
        .map((child) => {
          const leaves = child.children
            .filter((leaf) => selectedIds.includes(leaf.id))
            .map((leaf) => ({
              ...leaf,
              source: copiedDataSourceMap[leaf.id] || (manualDataPermissionIds.value.includes(leaf.id) ? '本次新增' : '')
            }))
          return leaves.length ? { ...child, children: leaves } : null
        })
        .filter(Boolean)
      return children.length ? { ...group, children } : null
    })
    .filter(Boolean)
}

function createPermissionSnapshot() {
  return {
    selectedRoleIds: [...selectedRoleIds.value],
    copiedFromItcode: copiedFromItcode.value,
    copiedRoleIds: [...copiedRoleIds.value],
    copiedFunctionPermissionIds: [...copiedFunctionPermissionIds.value],
    selectedDataPermissionIds: [...selectedDataPermissionIds.value],
    manualDataPermissionIds: [...manualDataPermissionIds.value],
    copiedDataSourceMap: { ...copiedDataSourceMap }
  }
}

function applyPermissionSnapshotToEditor(snapshot = {}) {
  selectedRoleIds.value = [...(snapshot.selectedRoleIds || [])]
  copiedFromItcode.value = snapshot.copiedFromItcode || ''
  copiedRoleIds.value = [...(snapshot.copiedRoleIds || [])]
  copiedFunctionPermissionIds.value = [...(snapshot.copiedFunctionPermissionIds || [])]
  selectedDataPermissionIds.value = [...(snapshot.selectedDataPermissionIds || [])]
  manualDataPermissionIds.value = [...(snapshot.manualDataPermissionIds || [])]
  clearCopiedDataSources()
  Object.entries(snapshot.copiedDataSourceMap || {}).forEach(([key, value]) => {
    copiedDataSourceMap[key] = value
  })
}

function createApprovalRow(payload) {
  const nodeMeta = approvalNodeMeta(payload.nodeType)
  const permissionSnapshot = payload.permissionSnapshot || emptyPermissionSnapshot()
  return {
    id: payload.id,
    typeKey: payload.typeKey || 'change',
    type: payload.type || '权限变更',
    applicant: payload.applicant || 'admin',
    applicantItcode: payload.applicantItcode || payload.applicant || 'admin',
    applicantEmail: payload.applicantEmail || ((payload.applicantItcode || payload.applicant || 'admin') + '@lenovo.com'),
    target: payload.target || '待补充',
    personType: payload.personType || 'internal',
    relatedAccount: payload.relatedAccount || '',
    mobile: payload.mobile || '13800000000',
    email: payload.email || `${payload.target || 'user'}@lenovo.com`,
    manager: payload.manager || 'sunll1',
    businessApprover: payload.businessApprover || 'zhangjq4（消费业务 to C）',
    systemApprover: payload.systemApprover || 'sunzh4',
    reason: payload.reason || '需要根据业务职责开通或调整乐享 AI 工作台权限。',
    nodeType: payload.nodeType || 'manager',
    node: payload.node || nodeMeta.label,
    approverItcode: payload.approverItcode || nodeMeta.owner || 'sunll1',
    handlers: payload.handlers?.length ? [...payload.handlers] : [payload.approverItcode || nodeMeta.owner || 'sunll1'],
    status: payload.status || nodeMeta.status,
    statusKey: payload.statusKey || nodeMeta.statusKey,
    time: payload.time || '2026-07-13 11:45',
    businessInfo: {
      organizations: [...(payload.businessInfo?.organizations || [])],
      tenant: payload.businessInfo?.tenant || ''
    },
    permissionSnapshot: {
      selectedRoleIds: [...(permissionSnapshot.selectedRoleIds || [])],
      copiedFromItcode: permissionSnapshot.copiedFromItcode || '',
      copiedRoleIds: [...(permissionSnapshot.copiedRoleIds || [])],
      copiedFunctionPermissionIds: [...(permissionSnapshot.copiedFunctionPermissionIds || [])],
      selectedDataPermissionIds: [...(permissionSnapshot.selectedDataPermissionIds || [])],
      manualDataPermissionIds: [...(permissionSnapshot.manualDataPermissionIds || [])],
      copiedDataSourceMap: { ...(permissionSnapshot.copiedDataSourceMap || {}) }
    },
    approvalLogs: [...(payload.approvalLogs || [])]
  }
}

function emptyPermissionSnapshot() {
  return {
    selectedRoleIds: [],
    copiedFromItcode: '',
    copiedRoleIds: [],
    copiedFunctionPermissionIds: [],
    selectedDataPermissionIds: [],
    manualDataPermissionIds: [],
    copiedDataSourceMap: {}
  }
}

function approvalNodeMeta(nodeType) {
  const map = {
    relation: { label: '关联人审批', owner: 'wangxt8', status: '待我审批', statusKey: 'pending' },
    manager: { label: '直线经理审批', owner: 'sunll1', status: '待我审批', statusKey: 'pending' },
    business: { label: '业务负责人审批', owner: 'zhangjq4', status: '待我审批', statusKey: 'pending' },
    execute: { label: '后台执行', owner: 'sunzh4', status: '已通过', statusKey: 'approved' },
    done: { label: '后台执行', owner: 'sunzh4', status: '执行完成', statusKey: 'done' },
    rework: { label: '申请人修改', owner: '申请人', status: '已驳回', statusKey: 'rejected' }
  }
  return map[nodeType] || map.manager
}

function parseApproverItcode(value) {
  return String(value || '').split('（')[0].trim()
}

function isApprovalHandlerSelected(handler) {
  return approvalSearch.handlers.some((item) => item.toLowerCase() === String(handler).toLowerCase())
}

function addApprovalHandler() {
  const draft = approvalSearch.handlerDraft.trim()
  const handler = handlerSuggestions.value[0] || draft
  if (!handler) return
  selectApprovalHandler(handler)
}

function selectApprovalHandler(handler) {
  const normalized = String(handler).trim()
  if (!normalized) return
  if (!isApprovalHandlerSelected(normalized)) {
    approvalSearch.handlers.push(normalized)
  }
  approvalSearch.handlerDraft = ''
  approvalSearch.handlerFocused = true
}

function removeApprovalHandler(handler) {
  approvalSearch.handlers = approvalSearch.handlers.filter((item) => item !== handler)
}

function deferCloseHandlerSuggestions() {
  window.setTimeout(() => {
    approvalSearch.handlerFocused = false
  }, 120)
}
function resetApprovalFilters() {
  approvalSearch.status = '全部'
  approvalSearch.approverItcode = ''
  approvalSearch.handlerDraft = ''
  approvalSearch.handlerFocused = false
  approvalSearch.handlers = []
}

function openApprovalWorkspace(row, mode) {
  applyPermissionSnapshotToEditor(row.permissionSnapshot)
  approvalWorkspace.visible = true
  approvalWorkspace.mode = mode
  approvalWorkspace.rowId = row.id
  approvalWorkspace.nodeType = row.nodeType
  approvalWorkspace.title = mode === 'view' ? '申请详情' : approvalDecisionTitleByNode(row.nodeType)
  approvalWorkspace.result = ''
  approvalWorkspace.opinion = ''
  approvalWorkspace.organizations = [...(row.businessInfo?.organizations || [])]
  approvalWorkspace.tenant = row.businessInfo?.tenant || ''
  approvalWorkspace.notice = mode === 'view' ? '当前为只读详情。' : ''
  clearApprovalErrors()
}

function approvalDecisionTitleByNode(nodeType) {
  if (nodeType === 'relation') return '关联确认'
  if (nodeType === 'manager') return '直线经理审批'
  if (nodeType === 'business') return '业务负责人审批'
  return '审批处理'
}

function closeApprovalWorkspace() {
  approvalWorkspace.visible = false
}

function clearApprovalErrors() {
  approvalWorkspace.errors.result = ''
  approvalWorkspace.errors.organizations = ''
  approvalWorkspace.errors.tenant = ''
}

function selectApprovalResult(value) {
  approvalWorkspace.result = value
  approvalWorkspace.errors.result = ''
}

function toggleApprovalOrganization(org) {
  if (!canEditBusinessOwnership.value) return
  toggleId(approvalWorkspace.organizations, org)
  approvalWorkspace.errors.organizations = ''
}

function validateApprovalDecision() {
  clearApprovalErrors()
  if (!approvalWorkspace.result) {
    approvalWorkspace.errors.result = '请选择审批结果，例如同意或驳回。'
  }
  if (canEditBusinessOwnership.value && approvalWorkspace.result === 'agree') {
    approvalWorkspace.errors.organizations = approvalWorkspace.organizations.length ? '' : '请选择至少一个所属组织，便于后台按组织授权。'
    approvalWorkspace.errors.tenant = approvalWorkspace.tenant ? '' : '请选择所属租户，便于后台按租户开通权限。'
  }

  return !Object.values(approvalWorkspace.errors).some(Boolean)
}

function submitApprovalDecision() {
  if (!activeApproval.value || !validateApprovalDecision()) return
  const row = activeApproval.value
  if (canEditApprovalPermission.value) {
    row.permissionSnapshot = createPermissionSnapshot()
  }
  if (canEditBusinessOwnership.value) {
    row.businessInfo = {
      organizations: [...approvalWorkspace.organizations],
      tenant: approvalWorkspace.tenant
    }
  }

  row.approvalLogs.push({
    node: row.node,
    action: approvalWorkspace.result,
    operator: row.approverItcode,
    opinion: approvalWorkspace.opinion || '无补充意见',
    time: '2026-07-13 16:30'
  })
  if (approvalWorkspace.result === 'reject') {
    updateApprovalNode(row, 'rework', {
      status: '已驳回',
      statusKey: 'rejected',
      approverItcode: row.applicantItcode,
      handlers: [row.applicantItcode]
    })
  } else if (approvalWorkspace.nodeType === 'relation') {
    updateApprovalNode(row, 'manager', {
      approverItcode: row.manager,
      handlers: [row.manager]
    })
  } else if (approvalWorkspace.nodeType === 'manager') {
    const businessItcode = parseApproverItcode(row.businessApprover)
    updateApprovalNode(row, 'business', {
      approverItcode: businessItcode,
      handlers: [businessItcode, row.manager]
    })
  } else {
    updateApprovalNode(row, 'done', {
      status: '执行完成',
      statusKey: 'done',
      approverItcode: row.systemApprover,
      handlers: [...new Set([...row.handlers, row.systemApprover])]
    })
  }
  records.value.unshift({
    time: row.time,
    title: `${row.id} ${approvalDecisionTitleByNode(approvalWorkspace.nodeType)}已提交`,
    detail: `${row.target} 的审批结果为“${approvalResultLabel(approvalWorkspace.result)}”，当前流转到“${row.node}”。`,
    status: 'POC 记录'
  })
  approvalWorkspace.notice = '已提交审批，列表状态已更新。'
  closeApprovalWorkspace()
}

function updateApprovalNode(row, nodeType, overrides = {}) {
  const meta = approvalNodeMeta(nodeType)
  row.nodeType = nodeType
  row.node = overrides.node || meta.label
  row.status = overrides.status || meta.status
  row.statusKey = overrides.statusKey || meta.statusKey
  row.approverItcode = overrides.approverItcode || meta.owner
  row.handlers = overrides.handlers || [row.approverItcode]
  row.time = '2026-07-13 16:30'
}

function approvalResultLabel(value) {
  const option = approvalResultOptions.value.find((item) => item.value === value)
  return option?.label || value
}
function userStatusLabel(user) {
  return user?.status === 'enabled' ? '启用' : '已禁用'
}

function resetUserFilters() {
  userFilters.account = ''
  userFilters.name = ''
  userFilters.bindItcode = ''
}

function emptyUserDraft() {
  return {
    userAccount: `U-${Date.now().toString().slice(-5)}`,
    loginAccount: '',
    name: '',
    bindItcode: true,
    mobile: '',
    email: '',
    validUntil: '2026-12-31',
    userType: '内部用户',
    tenant: tenantOptions[0],
    organization: organizationOptions[0],
    internalAdAccount: '',
    remark: '',
    status: 'enabled',
    statusKey: 'done',
    roleIds: [],
    extraFunctionPermissionIds: [],
    extraDataPermissionIds: [],
    suppressedRoleDataPermissionIds: [],
    customDataRules: [],
    changeLogs: [],
    loginLogs: []
  }
}

function cloneUser(user) {
  const nextUser = JSON.parse(JSON.stringify(user || emptyUserDraft()))
  nextUser.roleIds ||= []
  nextUser.extraFunctionPermissionIds = []
  nextUser.extraDataPermissionIds ||= []
  nextUser.suppressedRoleDataPermissionIds ||= []
  nextUser.customDataRules ||= []
  nextUser.changeLogs ||= []
  nextUser.loginLogs ||= []
  return nextUser
}

function resetUserWorkspaceErrors() {
  Object.keys(userWorkspace.errors).forEach((key) => {
    userWorkspace.errors[key] = ''
  })
}

function openUserWorkspace(mode, user = null) {
  resetUserWorkspaceErrors()
  userWorkspace.visible = true
  userWorkspace.mode = mode
  userWorkspace.userAccount = user?.userAccount || ''
  userWorkspace.activeTab = 'basic'
  userWorkspace.loginFilter = 'all'
  userWorkspace.applicationNo = ''
  userWorkspace.generatedApplicationNo = ''
  userWorkspace.notice = mode === 'view' ? '当前为只读详情。' : ''
  userWorkspace.draft = cloneUser(user || emptyUserDraft())
  userWorkspace.dataTab = userWorkspace.draft.customDataRules.length ? 'custom' : 'normal'
}

function openUserDataWorkspace(user) {
  openUserWorkspace('edit', user)
  userWorkspace.activeTab = 'data'
}

function closeUserWorkspace() {
  userWorkspace.visible = false
  userWorkspace.notice = ''
  userWorkspace.draft = null
}

function switchUserWorkspaceToEdit() {
  userWorkspace.mode = userWorkspace.userAccount ? 'edit' : 'create'
  userWorkspace.dataTab = userWorkspace.draft?.customDataRules?.length ? 'custom' : 'normal'
  userWorkspace.notice = ''
}

function setUserBindItcode(value) {
  if (userWorkspaceReadonly.value || !userWorkspace.draft) return
  userWorkspace.draft.bindItcode = value
  if (!value) {
    userWorkspace.errors.internalAdAccount = ''
  }
}

function validateUserWorkspace() {
  resetUserWorkspaceErrors()
  const draft = userWorkspace.draft
  if (!draft) return false
  userWorkspace.errors.userAccount = draft.userAccount ? '' : '请填写用户账号，用于识别用户主档。'
  userWorkspace.errors.loginAccount = draft.loginAccount ? '' : '请填写登陆账号，用户登录工作台时需要使用。'
  userWorkspace.errors.validUntil = draft.validUntil ? '' : '请填写有效期，例如 2026-12-31 或长期有效。'
  userWorkspace.errors.internalAdAccount = draft.bindItcode && !draft.internalAdAccount ? '已绑定 IT code 时需要填写内部 AD 账户。' : ''
  userWorkspace.errors.applicationNo = showUserApplicationNoField.value && !userWorkspace.applicationNo ? '权限变更需要填写申请单号，用于关联审批流程。' : ''
  userWorkspace.errors.dataMode = draft.extraDataPermissionIds.length && draft.customDataRules.length ? '普通授权和自定义授权只能选择一种，请先删除其中一类数据权限。' : ''
  return !Object.values(userWorkspace.errors).some(Boolean)
}

function saveUserWorkspace() {
  if (!validateUserWorkspace()) {
    userWorkspace.activeTab = userWorkspace.errors.dataMode ? 'data' : (userWorkspace.errors.applicationNo ? userWorkspace.activeTab : 'basic')
    return
  }
  const nextUser = cloneUser(userWorkspace.draft)
  nextUser.statusKey = nextUser.status === 'enabled' ? 'done' : 'rejected'
  let ticketNo = userWorkspace.applicationNo || 'POC-EDIT'
  let changeType = '编辑用户'
  let detail = '保存用户基础信息。'
  if (userWorkspace.mode === 'create') {
    ticketNo = generateApplicationNo()
    userWorkspace.generatedApplicationNo = ticketNo
    changeType = '新增用户'
    detail = '新建用户，后台已生成创建账号申请并进入审批列表。'
    appendCreateUserApproval(nextUser, ticketNo)
  } else if (userPermissionChanged.value) {
    changeType = '权限变更'
    detail = '保存用户角色或数据权限变更，申请单号用于审批流程追溯。'
    upsertUserApproval(nextUser, ticketNo, 'change', '权限变更', detail)
  }
  appendUserChange(nextUser, changeType, ticketNo, detail)
  if (userWorkspace.mode === 'create') {
    users.unshift(nextUser)
    userWorkspace.userAccount = nextUser.userAccount
  } else {
    const index = users.findIndex((user) => user.userAccount === userWorkspace.userAccount)
    if (index >= 0) users.splice(index, 1, nextUser)
  }
  userWorkspace.mode = 'view'
  userWorkspace.applicationNo = ''
  userWorkspace.draft = cloneUser(nextUser)
  closeUserWorkspace()
}

function sortedIds(ids = []) {
  return [...ids].sort((a, b) => a.localeCompare(b))
}

function sameIdSet(left = [], right = []) {
  return JSON.stringify(sortedIds(left)) === JSON.stringify(sortedIds(right))
}

function customRulesSignature(rules = []) {
  return JSON.stringify((rules || []).map((rule) => ({
    dataset: rule.dataset || '',
    fields: rule.fields || '',
    organization: rule.organization || '',
    region: rule.region || '',
    period: rule.period || '',
    remark: rule.remark || ''
  })))
}

function hasUserPermissionChanged(original, draft) {
  if (!original || !draft) return false
  return !sameIdSet(original.roleIds, draft.roleIds)
    || !sameIdSet(original.extraDataPermissionIds, draft.extraDataPermissionIds)
    || !sameIdSet(original.suppressedRoleDataPermissionIds, draft.suppressedRoleDataPermissionIds)
    || customRulesSignature(original.customDataRules) !== customRulesSignature(draft.customDataRules)
}

function generateApplicationNo() {
  const nextNumber = approvals.value.length + users.length + 11
  return `AP-20260714-${String(nextNumber).padStart(3, '0')}`
}

function userPermissionSnapshot(user) {
  const inheritedDataIds = userInheritedDataIds(user)
  return {
    selectedRoleIds: [...(user.roleIds || [])],
    copiedFromItcode: '',
    copiedRoleIds: [],
    copiedFunctionPermissionIds: [],
    selectedDataPermissionIds: [...new Set([...inheritedDataIds, ...(user.extraDataPermissionIds || [])])],
    manualDataPermissionIds: [...(user.extraDataPermissionIds || [])],
    copiedDataSourceMap: {}
  }
}

function approvalNodeForUser(user) {
  return user?.userType === '外部用户' ? 'relation' : 'manager'
}

function userApprovalRelationItcode(user) {
  return user?.userType === '外部用户' ? (user.internalAdAccount || 'wangxt8') : ''
}

function userApprovalManagerItcode() {
  return 'sunll1'
}

function userApprovalBusinessApprover() {
  return 'zhangjq4（消费业务 to C）'
}

function userApprovalStartState(user) {
  const nodeType = approvalNodeForUser(user)
  const meta = approvalNodeMeta(nodeType)
  const relationItcode = userApprovalRelationItcode(user)
  const managerItcode = userApprovalManagerItcode(user)
  const approverItcode = nodeType === 'relation' ? relationItcode : managerItcode
  return {
    nodeType,
    node: meta.label,
    approverItcode,
    handlers: [approverItcode].filter(Boolean),
    status: meta.status,
    statusKey: meta.statusKey,
    personType: user.userType === '外部用户' ? 'external' : 'internal',
    relatedAccount: relationItcode,
    manager: managerItcode,
    businessApprover: userApprovalBusinessApprover(),
    systemApprover: 'sunzh4'
  }
}

function upsertUserApproval(user, applicationNo, typeKey, type, detail) {
  const startState = userApprovalStartState(user)
  const payload = {
    id: applicationNo,
    typeKey,
    type,
    applicant: 'admin',
    applicantItcode: 'admin',
    applicantEmail: 'admin@lenovo.com',
    target: user.loginAccount || user.userAccount,
    ...startState,
    mobile: user.mobile,
    email: user.email,
    reason: detail,
    permissionSnapshot: userPermissionSnapshot(user),
    time: '2026-07-14 18:30'
  }
  const index = approvals.value.findIndex((row) => row.id === applicationNo)
  if (index >= 0) {
    approvals.value.splice(index, 1, createApprovalRow({
      ...approvals.value[index],
      ...payload,
      approvalLogs: approvals.value[index].approvalLogs || []
    }))
  } else {
    approvals.value.unshift(createApprovalRow(payload))
  }
  approvalSearch.status = '全部'
}
function appendCreateUserApproval(user, applicationNo) {
  upsertUserApproval(user, applicationNo, 'create', '创建账号', `新建 ${user.name || user.loginAccount} 的乐享 AI 工作台账号。`)
}
function userRoles(user) {
  return allRoles.filter((role) => (user?.roleIds || []).includes(role.id))
}

function userInheritedFunctionIds(user) {
  return [...new Set(userRoles(user).flatMap((role) => role.functionPermissionIds))]
}

function userInheritedDataIds(user) {
  const suppressedIds = user?.suppressedRoleDataPermissionIds || []
  return [...new Set(userRoles(user).flatMap((role) => role.dataPermissionIds))]
    .filter((id) => !suppressedIds.includes(id))
}

function switchUserDataTab(tab) {
  userWorkspace.errors.dataMode = ''
  if (tab === 'normal' && userCustomDataLocked.value) {
    userWorkspace.errors.dataMode = '当前已有自定义授权，需删除自定义授权后才能使用普通授权。'
    return
  }
  if (tab === 'custom' && userNormalDataLocked.value) {
    userWorkspace.errors.dataMode = '当前已有普通授权，需取消普通授权后才能使用自定义授权。'
    return
  }
  userWorkspace.dataTab = tab
}

function toggleUserExtraData(id) {
  if (userWorkspaceReadonly.value || !userWorkspace.draft || userDraftInheritedDataIds.value.includes(id)) return
  if (userCustomDataLocked.value) {
    userWorkspace.errors.dataMode = '当前已有自定义授权，需删除自定义授权后才能使用普通授权。'
    return
  }
  userWorkspace.errors.dataMode = ''
  toggleId(userWorkspace.draft.extraDataPermissionIds, id)
}

function addUserCustomDataRule() {
  if (userWorkspaceReadonly.value || !userWorkspace.draft) return
  if (userNormalDataLocked.value) {
    userWorkspace.errors.dataMode = '当前已有普通授权，需取消普通授权后才能使用自定义授权。'
    return
  }
  userWorkspace.errors.dataMode = ''
  userWorkspace.draft.customDataRules.push({
    id: `user-rule-${Date.now()}`,
    dataset: '运营数据集',
    fields: '字段范围待填写',
    organization: userWorkspace.draft.organization || '乐享运营',
    region: '全国',
    period: userWorkspace.draft.validUntil || '长期有效',
    remark: ''
  })
}

function removeUserCustomDataRule(id) {
  if (userWorkspaceReadonly.value || !userWorkspace.draft) return
  userWorkspace.draft.customDataRules = userWorkspace.draft.customDataRules.filter((rule) => rule.id !== id)
  userWorkspace.errors.dataMode = ''
}

function openUserRoleWorkspace(user) {
  openUserWorkspace('edit', user)
  userWorkspace.activeTab = 'roles'
}

function userDraftRoleDataPermissions(role) {
  if (!userWorkspace.draft) return []
  const suppressedIds = userWorkspace.draft.suppressedRoleDataPermissionIds || []
  return role.dataPermissionIds
    .filter((id) => !suppressedIds.includes(id))
    .map((id) => findDataPermission(id))
    .filter(Boolean)
}

function removeUserRoleDataPermission(roleId, permissionId) {
  if (userWorkspaceReadonly.value || !userWorkspace.draft) return
  const role = allRoles.find((item) => item.id === roleId)
  if (!role || !role.dataPermissionIds.includes(permissionId)) return
  if (!userWorkspace.draft.suppressedRoleDataPermissionIds.includes(permissionId)) {
    userWorkspace.draft.suppressedRoleDataPermissionIds.push(permissionId)
  }
  userWorkspace.notice = '已移除该角色带出的数据权限，保存后作为用户级例外生效。'
}

function resetUserRoleDataPermissions(roleId) {
  if (userWorkspaceReadonly.value || !userWorkspace.draft) return
  const role = allRoles.find((item) => item.id === roleId)
  if (!role) return
  userWorkspace.draft.suppressedRoleDataPermissionIds = userWorkspace.draft.suppressedRoleDataPermissionIds.filter((id) => !role.dataPermissionIds.includes(id))
  userWorkspace.notice = '已恢复该角色带出的数据权限，保存后生效。'
}
function openUserRoleModal(user) {
  userRoleModal.visible = true
  userRoleModal.keyword = ''
  userRoleModal.selectedIds = [...(user?.roleIds || [])]
  userRoleModal.targetUserAccount = user?.userAccount || userWorkspace.userAccount || ''
}

function closeUserRoleModal() {
  userRoleModal.visible = false
}

function toggleUserRoleSelection(id) {
  toggleId(userRoleModal.selectedIds, id)
}

function confirmUserRoleSelection() {
  if (userWorkspace.visible && userWorkspace.draft) {
    userWorkspace.draft.roleIds = [...userRoleModal.selectedIds]
    userWorkspace.notice = '已更新当前用户角色，保存后生效。'
  } else {
    const user = users.find((item) => item.userAccount === userRoleModal.targetUserAccount)
    if (user) {
      user.roleIds = [...userRoleModal.selectedIds]
      appendUserChange(user, '设置角色', 'POC-ROLE', `角色已调整为：${userRoles(user).map((role) => role.name).join('、') || '无角色'}。`)
    }
  }
  closeUserRoleModal()
}

function removeUserDraftRole(id) {
  if (userWorkspaceReadonly.value || !userWorkspace.draft) return
  const role = allRoles.find((item) => item.id === id)
  if (role && sensitivityRisk(role.sensitivity) === 'high') {
    userWorkspace.notice = `“${role.name}”是高敏角色，请确认业务影响后再保存。`
  }
  userWorkspace.draft.roleIds = userWorkspace.draft.roleIds.filter((roleId) => roleId !== id)
}

function openUserStatusConfirm(user) {
  userStatusConfirm.visible = true
  userStatusConfirm.action = user.status === 'enabled' ? 'disable' : 'enable'
  userStatusConfirm.userAccount = user.userAccount
  userStatusConfirm.reason = ''
  userStatusConfirm.applicationNo = ''
  userStatusConfirm.applicationNoError = ''
  userStatusConfirm.error = ''
}

function closeUserStatusConfirm() {
  userStatusConfirm.visible = false
}

function confirmUserStatusChange() {
  const user = statusTargetUser.value
  if (!user) return
  userStatusConfirm.applicationNoError = userStatusConfirm.applicationNo ? '' : '启用或禁用用户需要填写申请单号。'
  if (userStatusConfirm.applicationNoError) return
  if (userStatusConfirm.action === 'disable' && !userStatusConfirm.reason) {
    userStatusConfirm.error = '禁用用户前请填写原因，方便后续追溯。'
    return
  }
  const enabled = userStatusConfirm.action === 'enable'
  user.status = enabled ? 'enabled' : 'disabled'
  user.statusKey = enabled ? 'done' : 'rejected'
  const detail = enabled ? `已恢复登录和权限使用。${userStatusConfirm.reason || ''}` : `已暂停登录、导出、发布和审批能力。原因：${userStatusConfirm.reason}`
  appendUserChange(user, enabled ? '启用用户' : '禁用用户', userStatusConfirm.applicationNo, detail)
  upsertUserApproval(user, userStatusConfirm.applicationNo, enabled ? 'enable' : 'disable', enabled ? '启用账号' : '禁用账号', detail)
  closeUserStatusConfirm()
}

function appendUserChange(user, type, ticketNo, detail) {
  if (!user.changeLogs) user.changeLogs = []
  user.changeLogs.unshift({
    time: '2026-07-14 18:30',
    type,
    ticketNo,
    detail
  })
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

function flattenOrganizations(list, rows = []) {
  list.forEach((org) => {
    rows.push(org)
    if (org.children?.length) flattenOrganizations(org.children, rows)
  })
  return rows
}

function findOrganizationById(id, list = organizations) {
  for (const org of list) {
    if (org.id === id) return org
    const child = findOrganizationById(id, org.children || [])
    if (child) return child
  }
  return null
}

function organizationParentName(org) {
  if (!org?.parentId) return '无上级组织'
  return findOrganizationById(org.parentId)?.name || '无上级组织'
}

function selectOrganization(id) {
  selectedOrganizationId.value = id
  dismissOrganizationNotice()
}

function clearOrganizationNoticeTimer() {
  if (!organizationNoticeTimer) return
  window.clearTimeout(organizationNoticeTimer)
  organizationNoticeTimer = null
}

function dismissOrganizationNotice() {
  clearOrganizationNoticeTimer()
  organizationNotice.value = ''
}

function showOrganizationNotice(message) {
  clearOrganizationNoticeTimer()
  organizationNotice.value = message
  organizationNoticeTimer = window.setTimeout(() => {
    organizationNotice.value = ''
    organizationNoticeTimer = null
  }, 3000)
}

function currentDateTimeText() {
  const now = new Date()
  const pad = (value) => String(value).padStart(2, '0')
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())} ${pad(now.getHours())}:${pad(now.getMinutes())}`
}

function resetOrganizationEditorErrors() {
  organizationEditor.errors.tenant = ''
  organizationEditor.errors.name = ''
  organizationEditor.errors.parentId = ''
  organizationEditor.errors.code = ''
  organizationEditor.errors.description = ''
  organizationEditor.notice = ''
}

function openOrganizationEditor(mode) {
  resetOrganizationEditorErrors()
  organizationEditor.visible = true
  organizationEditor.mode = mode
  const org = mode === 'edit' ? selectedOrganization.value : null
  organizationEditor.orgId = org?.id || ''
  organizationEditor.draft = org
    ? {
        id: org.id,
        tenant: org.tenant || 'leaibot-cn',
        code: org.code,
        name: org.name,
        parentId: org.parentId,
        owner: org.owner,
        creator: org.creator || 'admin',
        status: org.status,
        description: org.description,
        scope: org.scope
      }
    : {
        id: `org-${Date.now()}`,
        tenant: 'leaibot-cn',
        code: '',
        name: '',
        parentId: selectedOrganization.value?.id || 'leai-root',
        owner: '',
        creator: 'admin',
        status: 'enabled',
        description: '',
        scope: '待配置'
      }
}

function closeOrganizationEditor() {
  organizationEditor.visible = false
}

function validateOrganizationEditor() {
  resetOrganizationEditorErrors()
  if (!organizationEditor.draft.tenant) organizationEditor.errors.tenant = '请选择 Tenant。'
  if (!organizationEditor.draft.name) organizationEditor.errors.name = '请填写组织名称。'
  if (organizationEditor.mode === 'create' && !organizationEditor.draft.parentId) organizationEditor.errors.parentId = '请选择上级组织。'
  if (organizationEditor.draft.description.length > 120) organizationEditor.errors.description = '组织描述建议控制在 120 字以内。'
  const duplicateCode = organizationEditor.draft.code && flatOrganizations.value.some((org) => org.code === organizationEditor.draft.code && org.id !== organizationEditor.orgId)
  if (duplicateCode) organizationEditor.errors.code = 'Code 已存在，请更换后再保存。'
  return !(organizationEditor.errors.tenant || organizationEditor.errors.name || organizationEditor.errors.parentId || organizationEditor.errors.code || organizationEditor.errors.description)
}

function appendOrganizationToParent(org) {
  const parent = findOrganizationById(org.parentId)
  if (parent) parent.children.push(org)
  else organizations.push(org)
}

function saveOrganizationEditor() {
  if (!validateOrganizationEditor()) return
  const draft = organizationEditor.draft
  if (organizationEditor.mode === 'create') {
    const parent = findOrganizationById(draft.parentId)
    const org = {
      ...draft,
      level: parent ? parent.level + 1 : 0,
      memberCount: 0,
      updatedAt: currentDateTimeText(),
      members: [],
      children: []
    }
    appendOrganizationToParent(org)
    selectedOrganizationId.value = org.id
    showOrganizationNotice(`已新增组织“${org.name}”。`)
  } else {
    const org = findOrganizationById(organizationEditor.orgId)
    if (!org) return
    org.tenant = draft.tenant
    org.name = draft.name
    org.owner = draft.owner
    org.creator = draft.creator
    org.code = draft.code
    org.status = draft.status
    org.description = draft.description
    org.scope = draft.scope || '待配置'
    org.updatedAt = currentDateTimeText()
    showOrganizationNotice(`已保存“${org.name}”的组织信息。`)
  }
  organizationEditor.notice = '保存成功。'
  organizationEditor.visible = false
}

function resetOrganizationMemberErrors() {
  organizationMemberModal.errors.name = ''
  organizationMemberModal.errors.account = ''
  organizationMemberModal.notice = ''
}

function openOrganizationMemberModal(member = null) {
  resetOrganizationMemberErrors()
  organizationMemberModal.visible = true
  organizationMemberModal.mode = member ? 'edit' : 'create'
  organizationMemberModal.originalOrganizationId = selectedOrganization.value?.id || 'leai-root'
  organizationMemberModal.originalAccount = member?.account || ''
  organizationMemberModal.draft = member
    ? {
        organizationId: selectedOrganization.value?.id || 'leai-root',
        name: member.name,
        account: member.account,
        department: member.department,
        orgRole: member.orgRole,
        permissionIdentity: member.permissionIdentity || '运营人员',
        status: member.status || 'enabled'
      }
    : {
        organizationId: selectedOrganization.value?.id || 'leai-root',
        name: '',
        account: '',
        department: selectedOrganization.value?.name || '',
        orgRole: '成员',
        permissionIdentity: '运营人员',
        status: 'enabled'
      }
}

function closeOrganizationMemberModal() {
  organizationMemberModal.visible = false
}

function validateOrganizationMember() {
  resetOrganizationMemberErrors()
  if (!organizationMemberModal.draft.name) organizationMemberModal.errors.name = '请填写成员姓名。'
  if (!organizationMemberModal.draft.account) organizationMemberModal.errors.account = '请填写成员账号。'
  const org = findOrganizationById(organizationMemberModal.draft.organizationId)
  const duplicate = org?.members.some((member) => {
    if (organizationMemberModal.mode === 'edit' && org.id === organizationMemberModal.originalOrganizationId && member.account === organizationMemberModal.originalAccount) return false
    return member.account === organizationMemberModal.draft.account
  })
  if (duplicate) organizationMemberModal.errors.account = '该成员已在当前组织中。'
  return !(organizationMemberModal.errors.name || organizationMemberModal.errors.account)
}

function saveOrganizationMember() {
  if (!validateOrganizationMember()) return
  const org = findOrganizationById(organizationMemberModal.draft.organizationId)
  if (!org) return
  if (organizationMemberModal.mode === 'edit') {
    const originalOrg = findOrganizationById(organizationMemberModal.originalOrganizationId)
    const originalIndex = originalOrg?.members.findIndex((member) => member.account === organizationMemberModal.originalAccount) ?? -1
    if (originalOrg && originalIndex >= 0) {
      originalOrg.members.splice(originalIndex, 1)
      originalOrg.memberCount = originalOrg.members.length
      originalOrg.updatedAt = currentDateTimeText()
    }
    org.members.push({ ...organizationMemberModal.draft })
    org.memberCount = org.members.length
    org.updatedAt = currentDateTimeText()
    selectedOrganizationId.value = org.id
    showOrganizationNotice(`已更新成员“${organizationMemberModal.draft.name}”。`)
    organizationMemberModal.notice = '保存成功。'
  } else {
    org.members.push({ ...organizationMemberModal.draft })
    org.memberCount = org.members.length
    org.updatedAt = currentDateTimeText()
    selectedOrganizationId.value = org.id
    showOrganizationNotice(`已将“${organizationMemberModal.draft.name}”添加到“${org.name}”。`)
    organizationMemberModal.notice = '添加成功。'
  }
  organizationMemberModal.visible = false
}

function removeOrganizationMember(account) {
  const org = selectedOrganization.value
  if (!org) return
  const member = org.members.find((item) => item.account === account)
  if (!member) return
  if (!window.confirm(`确认将“${member.name}”从“${org.name}”移除吗？`)) return
  org.members = org.members.filter((item) => item.account !== account)
  org.memberCount = org.members.length
  org.updatedAt = currentDateTimeText()
  showOrganizationNotice(`已移除成员“${member.name}”。`)
}

function removeSelectedOrganization() {
  const org = selectedOrganization.value
  if (!org) return
  if (!org.parentId) {
    showOrganizationNotice('根组织不能移除。')
    return
  }
  if (org.children?.length) {
    showOrganizationNotice('该组织下还有下级组织，请先处理下级组织后再移除。')
    return
  }
  if (!window.confirm(`确认移除组织“${org.name}”吗？组织下成员也会从当前 POC 中移除。`)) return
  const parent = findOrganizationById(org.parentId)
  if (!parent) return
  parent.children = parent.children.filter((child) => child.id !== org.id)
  parent.updatedAt = currentDateTimeText()
  selectedOrganizationId.value = parent.id
  showOrganizationNotice(`已移除组织“${org.name}”。`)
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
  resetApprovalFilters()
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

onUnmounted(() => {
  clearOrganizationNoticeTimer()
  clearDataSourceNoticeTimer()
  clearFunctionNoticeTimer()
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
  grid-template-columns: clamp(124px, 10.5vw, 146px) minmax(0, 1fr);
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
  padding: 12px;
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
  grid-template-columns: 30px 1fr;
  gap: 2px 8px;
  align-items: center;
  width: 100%;
  min-height: 56px;
  padding: 10px 8px;
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
  width: 28px;
  height: 28px;
  border-radius: 8px;
  color: #316dff;
  background: #edf3ff;
  font-size: 12px;
  font-weight: 800;
}

.permission-module-icon :deep(svg) {
  width: 15px;
  height: 15px;
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
.permission-form-grid .relation-account-field,
.permission-form-grid .email-field {
  align-self: start;
  align-content: start;
}

.permission-form-grid .relation-account-field > span:first-child,
.permission-form-grid .email-field > span:first-child {
  min-height: 18px;
  line-height: 18px;
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

.permission-form-field {
  display: grid;
  gap: 8px;
  color: #667085;
  font-size: 12px;
  font-weight: 600;
}

.field-label {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  color: #667085;
  font-size: 12px;
  font-weight: 700;
}

.field-label.required::before {
  content: '*';
  color: #e53935;
  font-weight: 800;
}

.field-label em {
  display: inline-flex;
  align-items: center;
  min-height: 18px;
  border-radius: 999px;
  padding: 0 7px;
  background: #fff1f1;
  color: #e53935;
  font-size: 11px;
  font-style: normal;
  font-weight: 700;
}

.field-error,
.field-help {
  color: #8a96a8;
  font-size: 12px;
  font-weight: 500;
  line-height: 1.45;
}

.field-error {
  color: #e53935;
}

.permission-form-grid input.invalid,
.permission-form-grid select.invalid,
.permission-form-grid textarea.invalid,
.modal-form-field input.invalid {
  border-color: #e53935;
  box-shadow: 0 0 0 3px rgba(229, 57, 53, 0.08);
}

.person-type-switch {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
}

.person-type-switch button {
  display: grid;
  gap: 5px;
  min-height: 64px;
  border: 1px solid #d8e1ee;
  border-radius: 8px;
  padding: 11px 12px;
  background: #fff;
  color: #455468;
  text-align: left;
  cursor: pointer;
}

.person-type-switch button b {
  color: #172033;
  font-size: 13px;
  line-height: 1.35;
}

.person-type-switch button small {
  color: #7a8798;
  font-size: 12px;
  line-height: 1.45;
}

.person-type-switch button.active {
  border-color: #8cb2ff;
  background: #f3f7ff;
  box-shadow: 0 0 0 2px rgba(49, 109, 255, 0.12);
}

.scope-action-bar {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  margin-top: 16px;
}

.copy-source-banner {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-top: 12px;
  border: 1px solid #bcd3ff;
  border-radius: 8px;
  padding: 12px 14px;
  background: #f7fbff;
  color: #455468;
  font-size: 12px;
}

.copy-source-banner b {
  color: #172033;
  font-size: 13px;
}

.copy-source-banner span {
  flex: 1 1 auto;
  min-width: 0;
}

.scope-source-stack {
  display: grid;
  gap: 14px;
  margin-top: 16px;
}

.scope-source-panel {
  min-width: 0;
  border: 1px solid #dfe7f3;
  border-radius: 8px;
  padding: 16px;
  background: #fff;
}

.source-role-list {
  display: grid;
  gap: 10px;
}

.source-role-card {
  display: grid;
  gap: 12px;
  border: 1px solid #e6edf5;
  border-radius: 8px;
  padding: 12px;
  background: #f8fafc;
}

.source-role-card.copied {
  background: #fbfcff;
}

.source-role-title {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 10px;
}

.source-role-title b {
  display: block;
  color: #172033;
  font-size: 13px;
  line-height: 1.45;
}

.source-role-title small {
  display: block;
  margin-top: 4px;
  color: #7a8798;
  font-size: 12px;
  line-height: 1.45;
}

.bound-permission-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
}

.bound-permission-grid > div {
  min-width: 0;
  border: 1px solid #e6edf5;
  border-radius: 8px;
  padding: 10px;
  background: #fff;
}

.source-empty {
  margin-top: 16px;
}

.bound-title-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  margin-bottom: 8px;
}

.bound-title-row .bound-title {
  margin-bottom: 0;
}

.refresh-btn {
  display: inline-grid;
  place-items: center;
  width: 24px;
  height: 24px;
  border: 1px solid #d8e1ee;
  border-radius: 6px;
  background: #fff;
  color: #316dff;
  cursor: pointer;
  font-size: 14px;
  line-height: 1;
}

.refresh-btn:hover {
  border-color: rgba(49, 109, 255, 0.42);
  background: #eef4ff;
}

.bound-empty {
  display: block;
  color: #8a96a8;
  font-size: 12px;
  line-height: 1.5;
}
.bound-title {
  display: block;
  margin-bottom: 8px;
  color: #6b778c;
  font-size: 12px;
  font-weight: 800;
  line-height: 1.35;
}

.permission-chip-list.compact span {
  gap: 6px;
  min-height: 26px;
  padding: 0 9px;
}

.permission-chip-list span .source-tag {
  min-height: 18px;
  padding: 0 6px;
}

.chip-remove {
  display: inline-grid;
  place-items: center;
  width: 18px;
  height: 18px;
  border: 0;
  border-radius: 999px;
  background: #eef1f5;
  color: #667085;
  cursor: pointer;
  font-size: 13px;
  line-height: 1;
}

.chip-remove:hover {
  background: #fff1f1;
  color: #e53935;
}
.scope-summary-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 14px;
  margin-top: 16px;
}

.scope-panel {
  min-width: 0;
  border: 1px solid #dfe7f3;
  border-radius: 8px;
  padding: 16px;
  background: #fff;
}

.scope-panel.full {
  grid-column: 1 / -1;
}

.scope-panel-head,
.selected-role-card,
.tree-node-line,
.modal-actions {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
}

.scope-panel-head {
  margin-bottom: 12px;
}

.scope-panel-head b,
.selected-role-card b,
.scope-empty b {
  color: #172033;
  font-size: 13px;
  line-height: 1.45;
}

.scope-panel-head small,
.selected-role-card small,
.scope-empty p {
  display: block;
  margin-top: 4px;
  color: #7a8798;
  font-size: 12px;
  line-height: 1.45;
}

.selected-role-list,
.selected-data-tree,
.role-picker-list,
.data-tree-picker {
  display: grid;
  gap: 10px;
}

.selected-role-card {
  align-items: flex-start;
  border: 1px solid #e6edf5;
  border-radius: 8px;
  padding: 12px;
  background: #f8fafc;
}

.permission-chip-list {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.permission-chip-list span {
  display: inline-flex;
  align-items: center;
  min-height: 28px;
  border: 1px solid #d8e1ee;
  border-radius: 999px;
  padding: 0 10px;
  background: #f8fafc;
  color: #455468;
  font-size: 12px;
  font-weight: 700;
}

.scope-empty {
  border: 1px dashed #d8e1ee;
  border-radius: 8px;
  padding: 18px;
  background: #f8fafc;
  text-align: center;
}

.selected-tree-node {
  border: 1px solid #e6edf5;
  border-radius: 8px;
  padding: 12px;
  background: #fff;
}

.selected-tree-child {
  margin-top: 10px;
  padding-left: 14px;
  border-left: 1px solid #e6edf5;
}

.selected-tree-leaf {
  margin-top: 8px;
  padding-left: 14px;
  color: #455468;
  font-size: 13px;
}

.source-tag {
  display: inline-flex;
  align-items: center;
  min-height: 22px;
  border-radius: 999px;
  padding: 0 8px;
  background: #eef4ff;
  color: #316dff;
  font-size: 11px;
  font-style: normal;
  font-weight: 800;
  white-space: nowrap;
}

.source-tag.user {
  background: #fff4df;
  color: #d97706;
}

.source-tag.manual {
  background: #eafaf0;
  color: #18a058;
}

.permission-picker-modal {
  width: min(820px, 100%);
}

.modal-search-input,
.modal-form-field input {
  width: 100%;
  box-sizing: border-box;
  min-height: 36px;
  border: 1px solid #d8e1ee;
  border-radius: 8px;
  padding: 0 12px;
  color: #172033;
  font: inherit;
  font-size: 13px;
}

.modal-search-input {
  margin-top: 16px;
}

.role-picker-list,
.data-tree-picker {
  margin-top: 14px;
  max-height: 420px;
  overflow: auto;
}

.role-picker-row {
  display: grid;
  grid-template-columns: 18px 1fr;
  gap: 10px;
  align-items: flex-start;
  border: 1px solid #e6edf5;
  border-radius: 8px;
  padding: 12px;
  background: #fff;
  color: #455468;
  cursor: pointer;
}

.role-picker-row input,
.data-tree-leaf input {
  width: 16px;
  height: 16px;
  accent-color: #316dff;
}

.role-picker-row b,
.data-tree-group > b {
  color: #172033;
  font-size: 13px;
}

.role-picker-row p {
  margin: 4px 0 8px;
  color: #6b778c;
  font-size: 12px;
  line-height: 1.5;
}

.role-picker-row small {
  display: block;
  color: #8a96a8;
  font-size: 12px;
  line-height: 1.45;
}

.modal-actions {
  justify-content: flex-start;
  margin-top: 18px;
  border-top: 1px solid #e6edf5;
  padding-top: 14px;
}

.modal-form-field {
  display: grid;
  gap: 8px;
  margin-top: 16px;
}

.copy-user-hints {
  margin-top: 10px;
  color: #8a96a8;
  font-size: 12px;
}

.data-tree-group {
  border: 1px solid #e6edf5;
  border-radius: 8px;
  padding: 12px;
  background: #fff;
}

.data-tree-child {
  display: grid;
  gap: 8px;
  margin-top: 10px;
  padding-left: 12px;
  border-left: 1px solid #e6edf5;
  color: #6b778c;
  font-size: 12px;
  font-weight: 700;
}

.data-tree-leaf {
  display: flex;
  align-items: center;
  gap: 8px;
  min-height: 28px;
  color: #455468;
  font-size: 13px;
  font-weight: 500;
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
  grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
  gap: 12px;
  margin-top: 18px;
}

.relation-grid article {
  padding: 12px;
}

.confirm-box,
.execute-summary {
  margin-top: 16px;
  border: 1px solid #bcd3ff;
  border-radius: 8px;
  padding: 12px;
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
  grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
  gap: 12px;
  margin-top: 18px;
}

.approval-route div {
  position: relative;
  border: 1px solid #dfe7f3;
  border-radius: 8px;
  padding: 12px;
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
  justify-content: flex-start;
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

.danger-outline-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border: 1px solid #ffb4b4;
  border-radius: 8px;
  background: #fff;
  color: #e53935;
  font-weight: 700;
  cursor: pointer;
  transition: border-color 0.18s ease, background 0.18s ease, box-shadow 0.18s ease;
}

.danger-outline-btn.small {
  min-height: 30px;
  padding: 0 12px;
  font-size: 12px;
}

.danger-outline-btn:hover {
  border-color: #e53935;
  background: #fff7f7;
  box-shadow: 0 0 0 3px rgba(229, 57, 53, 0.08);
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

.permission-picker-layer {
  z-index: 1400;
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
  padding: 12px;
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

.approval-filter-bar {
  display: grid;
  grid-template-columns: minmax(220px, 260px) minmax(360px, 1fr) auto;
  gap: 12px;
  align-items: start;
  margin-bottom: 14px;
  border: 1px solid #e6edf5;
  border-radius: 8px;
  padding: 12px;
  background: #f8fafc;
}

.approval-filter-bar label,
.approval-handler-filter {
  display: grid;
  grid-template-rows: 18px auto;
  gap: 6px;
  color: #667085;
  font-size: 12px;
  font-weight: 700;
}

.filter-label-row {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
  white-space: nowrap;
}

.filter-label-row em {
  color: #8a96a8;
  font-size: 12px;
  font-style: normal;
  font-weight: 500;
}

.approval-filter-bar > .ghost-btn {
  align-self: start;
  margin-top: 24px;
}

.approval-filter-bar input,
.approval-business-form select,
.approval-decision-panel textarea {
  width: 100%;
  box-sizing: border-box;
  min-height: 36px;
  border: 1px solid #d8e1ee;
  border-radius: 8px;
  padding: 0 12px;
  background: #fff;
  color: #172033;
  font: inherit;
  font-size: 13px;
}

.approval-decision-panel textarea {
  min-height: 96px;
  padding: 10px 8px;
  resize: vertical;
}

.handler-combobox {
  position: relative;
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 6px;
  min-height: 36px;
  border: 1px solid #d8e1ee;
  border-radius: 8px;
  padding: 3px 8px;
  background: #fff;
}

.handler-combobox.focused {
  border-color: #316dff;
  box-shadow: 0 0 0 3px rgba(49, 109, 255, 0.1);
}

.handler-combobox input {
  flex: 1 1 160px;
  min-width: 140px;
  min-height: 28px;
  border: 0;
  border-radius: 0;
  padding: 0 2px;
  box-shadow: none;
}

.handler-combobox input:focus {
  outline: none;
}

.handler-chip {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  min-height: 26px;
  border: 1px solid #bcd3ff;
  border-radius: 999px;
  padding: 0 8px 0 10px;
  background: #eef4ff;
  color: #316dff;
  font-size: 12px;
  font-weight: 800;
}

.handler-chip button {
  display: inline-grid;
  place-items: center;
  width: 18px;
  height: 18px;
  border: 0;
  border-radius: 999px;
  padding: 0;
  background: rgba(49, 109, 255, 0.12);
  color: #316dff;
  cursor: pointer;
}

.handler-chip button:hover {
  background: #fff1f1;
  color: #e53935;
}

.handler-suggestion-list {
  position: absolute;
  z-index: 1300;
  top: calc(100% + 6px);
  left: 0;
  right: 0;
  display: grid;
  gap: 4px;
  max-height: 220px;
  overflow: auto;
  border: 1px solid #dfe7f3;
  border-radius: 8px;
  padding: 6px;
  background: #fff;
  box-shadow: 0 8px 24px rgba(15, 23, 42, 0.12);
}

.handler-suggestion-list button {
  min-height: 30px;
  border: 0;
  border-radius: 6px;
  padding: 0 10px;
  background: transparent;
  color: #455468;
  font-size: 13px;
  font-weight: 700;
  text-align: left;
  cursor: pointer;
}

.handler-suggestion-list button:hover {
  background: #eef4ff;
  color: #316dff;
}

.handler-chip-list,
.approval-result-options {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.handler-chip-list button,
.approval-result-options button {
  min-height: 32px;
  border: 1px solid #d8e1ee;
  border-radius: 8px;
  padding: 0 12px;
  background: #fff;
  color: #455468;
  font-size: 12px;
  font-weight: 700;
  cursor: pointer;
}

.handler-chip-list button.active,
.approval-result-options button.active {
  border-color: #316dff;
  background: #316dff;
  color: #fff;
}

.handler-chip-list button:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}
.table-empty {
  display: grid;
  place-items: center;
  gap: 6px;
  min-height: 120px;
  color: #6b778c;
  text-align: center;
}

.table-empty b {
  color: #172033;
  font-size: 13px;
}

.table-empty p {
  margin: 0;
  font-size: 12px;
}

.approval-workspace-modal {
  display: flex;
  flex-direction: column;
  width: min(1040px, 100%);
  max-height: min(760px, calc(100vh - 48px));
  padding: 0;
  overflow: hidden;
}

.approval-workspace-head {
  display: flex;
  flex: 0 0 auto;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  border-bottom: 1px solid #e6edf5;
  padding: 20px 64px 16px 24px;
  background: #fff;
}

.approval-workspace-head h3 {
  margin: 0;
  color: #172033;
  font-size: 16px;
  line-height: 1.4;
}

.approval-workspace-head p {
  margin: 6px 0 0;
  color: #7a8798;
  font-size: 12px;
}

.approval-workspace-body {
  display: grid;
  flex: 1 1 auto;
  gap: 14px;
  min-height: 0;
  overflow: auto;
  padding: 18px 24px 20px;
  background: #f8fafc;
}

.approval-readonly-panel,
.approval-edit-panel,
.approval-decision-panel {
  min-width: 0;
  border: 1px solid #dfe7f3;
  border-radius: 8px;
  padding: 16px;
  background: #fff;
}

.approval-edit-panel {
  background: #fbfcff;
}

.approval-decision-panel {
  border-color: #bcd3ff;
  background: #f7fbff;
}

.approval-detail-grid {
  display: grid;
  grid-template-columns: 140px minmax(0, 1fr) 140px minmax(0, 1fr);
  gap: 10px 14px;
  margin: 0;
}

.approval-detail-grid dt {
  color: #8a96a8;
  font-size: 12px;
  font-weight: 700;
}

.approval-detail-grid dd {
  min-width: 0;
  margin: 0;
  color: #172033;
  font-size: 13px;
  line-height: 1.45;
  overflow-wrap: anywhere;
}

.scope-action-bar.inline {
  margin-top: 0;
  justify-content: flex-start;
}

.readonly-scope-stack {
  margin-top: 0;
}

.approval-business-form {
  margin-top: 0;
}

.organization-picker {
  padding: 2px 0;
}

.approval-submit-note {
  margin-top: 14px;
  border: 1px solid #bcd3ff;
  border-radius: 8px;
  padding: 12px;
  background: #fff;
}

.approval-submit-note b {
  color: #172033;
  font-size: 13px;
}

.approval-submit-note p {
  margin: 6px 0 0;
  color: #6b778c;
  font-size: 12px;
}

.sticky-actions {
  position: relative;
  z-index: 2;
  flex: 0 0 auto;
  margin-top: 0;
  border-top: 1px solid #e6edf5;
  padding: 12px 24px;
  background: #fff;
  box-shadow: 0 -4px 12px rgba(15, 23, 42, 0.04);
}

.approval-feedback {
  margin-right: auto;
  color: #18a058;
  font-size: 12px;
  font-weight: 700;
}

.approval-business-form select.invalid,
.approval-decision-panel input.invalid,
.approval-decision-panel textarea.invalid {
  border-color: #e53935;
  box-shadow: 0 0 0 3px rgba(229, 57, 53, 0.08);
}
.user-filter-bar {
  display: grid;
  grid-template-columns: minmax(180px, 1fr) minmax(180px, 1fr) minmax(180px, 220px) auto;
  gap: 12px;
  align-items: end;
  margin-bottom: 12px;
  border: 1px solid #e6edf5;
  border-radius: 8px;
  padding: 12px;
  background: #f8fafc;
}

.user-filter-bar label {
  display: grid;
  gap: 6px;
  color: #667085;
  font-size: 12px;
  font-weight: 700;
}

.user-filter-bar input,
.user-filter-bar select {
  width: 100%;
  box-sizing: border-box;
  min-height: 36px;
  border: 1px solid #d8e1ee;
  border-radius: 8px;
  padding: 0 12px;
  background: #fff;
  color: #172033;
  font: inherit;
  font-size: 13px;
}

.user-filter-bar input:focus,
.user-filter-bar select:focus {
  border-color: #316dff;
  outline: none;
  box-shadow: 0 0 0 3px rgba(49, 109, 255, 0.1);
}

.user-management-table {
  min-width: 820px;
}

.user-account-cell {
  display: grid;
  gap: 4px;
}

.user-account-cell b {
  color: #172033;
  font-size: 13px;
}

.user-account-cell small {
  color: #8a96a8;
  font-size: 12px;
}

.user-application-strip {
  display: flex;
  justify-content: flex-start;
  margin: 0;
  border-bottom: 1px solid #dce8ff;
  padding: 12px 24px 14px;
  background: #f8fbff;
}

.user-application-strip label {
  display: grid;
  gap: 6px;
  width: min(320px, 100%);
  color: #667085;
  font-size: 12px;
  font-weight: 700;
}

.user-application-strip input {
  width: 100%;
  box-sizing: border-box;
  min-height: 34px;
  border: 1px solid #d6e0ef;
  border-radius: 6px;
  padding: 0 12px;
  background: #fff;
  color: #172033;
  font: inherit;
  font-size: 13px;
}

.user-application-strip input:focus {
  border-color: #316dff;
  outline: none;
  box-shadow: 0 0 0 3px rgba(49, 109, 255, 0.1);
}

.user-application-strip input.invalid {
  border-color: #e53935;
  box-shadow: 0 0 0 3px rgba(229, 57, 53, 0.08);
}

.user-application-strip .field-error {
  color: #e53935;
}

.user-editor-modal .role-editor-head {
  padding-right: 72px;
}

.user-modal-status {
  margin-right: 10px;
}

.compact-segmented {
  flex: 0 0 auto;
}

.user-login-table {
  min-width: 920px;
}
.user-editor-modal {
  width: min(1180px, 100%);
}

.user-impact-strip {
  grid-template-columns: repeat(4, minmax(0, 1fr));
}

.role-card-actions {
  display: flex;
  align-items: center;
  gap: 10px;
  white-space: nowrap;
}

.user-history-table {
  min-width: 760px;
}
.role-filter-bar {
  display: grid;
  grid-template-columns: minmax(220px, 1fr) minmax(180px, 240px) auto;
  gap: 12px;
  align-items: end;
  margin-bottom: 12px;
  border: 1px solid #e6edf5;
  border-radius: 8px;
  padding: 12px;
  background: #f8fafc;
}

.role-filter-bar label {
  display: grid;
  gap: 6px;
  color: #667085;
  font-size: 12px;
  font-weight: 700;
}

.role-filter-bar input,
.role-filter-bar select,
.role-basic-form input,
.role-basic-form select,
.role-basic-form textarea,
.selected-permission-table input,
.custom-rule-table input {
  width: 100%;
  box-sizing: border-box;
  min-height: 36px;
  border: 1px solid #d8e1ee;
  border-radius: 8px;
  padding: 0 12px;
  background: #fff;
  color: #172033;
  font: inherit;
  font-size: 13px;
}

.role-basic-form textarea {
  min-height: 88px;
  padding: 10px 8px;
  resize: vertical;
}

.role-filter-bar input:focus,
.role-filter-bar select:focus,
.role-basic-form input:focus,
.role-basic-form select:focus,
.role-basic-form textarea:focus,
.selected-permission-table input:focus,
.custom-rule-table input:focus {
  border-color: #316dff;
  outline: none;
  box-shadow: 0 0 0 3px rgba(49, 109, 255, 0.1);
}

.role-result-line {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 10px;
  color: #6b778c;
  font-size: 12px;
}

.role-result-line b {
  color: #316dff;
  font-size: 12px;
}

.role-table-wrap {
  border: 1px solid #e6edf5;
  border-radius: 8px;
  background: #fff;
}

.role-management-table {
  min-width: 980px;
}

.role-name-cell {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
}

.role-name-cell b {
  color: #172033;
  font-size: 13px;
}

.role-desc-cell {
  max-width: 360px;
  color: #5b6678;
}

.row-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  white-space: nowrap;
}

.role-editor-modal {
  display: flex;
  flex-direction: column;
  width: min(1120px, 100%);
  max-height: min(820px, calc(100vh - 48px));
  padding: 0;
  overflow: hidden;
}

.role-editor-head {
  display: flex;
  flex: 0 0 auto;
  align-items: flex-start;
  justify-content: space-between;
  gap: 14px;
  border-bottom: 1px solid #e6edf5;
  padding: 20px 24px 16px;
  background: #fff;
}

.role-editor-head h3 {
  margin: 0;
  color: #172033;
  font-size: 16px;
  line-height: 1.4;
}

.role-editor-head p {
  margin: 6px 0 0;
  color: #7a8798;
  font-size: 12px;
}

.role-impact-strip {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 10px;
  border-bottom: 1px solid #e6edf5;
  padding: 12px 24px;
  background: #f8fafc;
}

.role-impact-strip span {
  border: 1px solid #e6edf5;
  border-radius: 8px;
  padding: 10px 8px;
  background: #fff;
  color: #667085;
  font-size: 12px;
}

.role-impact-strip b {
  color: #172033;
  font-size: 16px;
}

.role-editor-tabs,
.role-data-tabs {
  display: flex;
  flex: 0 0 auto;
  gap: 18px;
  border-bottom: 1px solid #e6edf5;
  padding: 0 24px;
  background: #fff;
}

.role-editor-tabs button,
.role-data-tabs button {
  min-height: 44px;
  border: 0;
  border-bottom: 2px solid transparent;
  background: transparent;
  color: #667085;
  cursor: pointer;
  font-size: 13px;
  font-weight: 700;
}

.role-editor-tabs button.active,
.role-data-tabs button.active {
  border-bottom-color: #316dff;
  color: #316dff;
}

.role-data-tabs button.locked:not(.active) {
  color: #8a96a8;
}

.role-data-tabs button.locked:not(.active)::after {
  content: "需先清空另一类";
  display: inline-flex;
  margin-left: 8px;
  border-radius: 999px;
  padding: 2px 6px;
  background: #fff5e6;
  color: #b56a00;
  font-size: 11px;
  font-weight: 700;
}

.data-mode-notice {
  display: block;
  margin-bottom: 10px;
  border: 1px solid #d6e6ff;
  border-radius: 6px;
  padding: 8px 10px;
  background: #f6faff;
  color: #415675;
  font-size: 12px;
  line-height: 1.5;
}

.data-mode-notice.error {
  border-color: #ffd1d1;
  background: #fff7f7;
  color: #d33b3b;
}

.role-editor-section {
  flex: 1 1 auto;
  min-height: 0;
  overflow: auto;
  padding: 18px 24px 20px;
  background: #f8fafc;
}

.role-basic-form {
  border: 1px solid #dfe7f3;
  border-radius: 8px;
  padding: 16px;
  background: #fff;
}

.sensitivity-badge.low {
  border-color: #9ad9b3;
  background: #eafaf0;
  color: #18a058;
}

.sensitivity-badge.medium {
  border-color: #f8d28a;
  background: #fff4df;
  color: #d97706;
}

.sensitivity-badge.high {
  border-color: #ffb4b4;
  background: #fff1f1;
  color: #e53935;
}

.sensitivity-badge {
  display: inline-flex;
  align-items: center;
  min-height: 26px;
  border: 1px solid transparent;
  border-radius: 999px;
  padding: 0 10px;
  font-size: 12px;
  font-weight: 800;
  white-space: nowrap;
}

.permission-editor-grid {
  display: grid;
  grid-template-columns: minmax(280px, 0.9fr) minmax(420px, 1.3fr);
  gap: 14px;
  min-height: 480px;
}

.permission-tree-panel,
.permission-selected-panel,
.custom-rule-panel {
  min-width: 0;
  border: 1px solid #dfe7f3;
  border-radius: 8px;
  padding: 12px;
  background: #fff;
}

.permission-subhead {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 12px;
}

.permission-subhead b {
  color: #172033;
  font-size: 13px;
}

.permission-subhead small {
  display: block;
  margin-top: 4px;
  color: #7a8798;
  font-size: 12px;
  line-height: 1.45;
}

.role-permission-tree {
  max-height: 520px;
}

.selected-permission-table,
.custom-rule-table {
  min-width: 0;
}

.selected-permission-table th:first-child,
.selected-permission-table td:first-child {
  width: 64px;
  text-align: center;
}

.selected-permission-table input[type='checkbox'] {
  width: 16px;
  min-height: 16px;
  accent-color: #316dff;
}

.compact-empty {
  margin-top: 0;
}

.role-data-tabs {
  margin: -18px -24px 16px;
}

.custom-rule-head {
  align-items: center;
}

.custom-rule-table {
  min-width: 1040px;
}

.delete-block-box,
.delete-impact-list {
  margin-top: 14px;
  border: 1px solid #e6edf5;
  border-radius: 8px;
  padding: 12px;
  background: #f8fafc;
}

.delete-block-box {
  border-color: #ffcbcb;
  background: #fff7f7;
}

.delete-block-box b {
  color: #e53935;
  font-size: 13px;
}

.delete-block-box p {
  margin: 6px 0 0;
  color: #6b778c;
  font-size: 12px;
}

.delete-impact-list {
  display: grid;
  gap: 8px;
  color: #455468;
  font-size: 13px;
}

.danger-btn {
  min-height: 36px;
  border: 1px solid #e53935;
  border-radius: 8px;
  padding: 0 14px;
  background: #e53935;
  color: #fff;
  cursor: pointer;
  font-size: 13px;
  font-weight: 700;
}

.danger-btn:hover {
  background: #c62828;
}
.org-workspace-card {
  gap: 14px;
}

.org-section-title {
  margin-bottom: 0;
}

.org-title-actions,
.org-detail-actions,
.org-member-head,
.org-panel-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
}

.org-title-actions {
  flex: 0 0 auto;
}

.org-metric-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 10px;
}

.org-metric-grid article {
  min-width: 0;
  border: 1px solid #e4ebf5;
  border-radius: 8px;
  padding: 12px;
  background: #f8fafc;
}

.org-metric-grid span,
.org-metric-grid small,
.org-panel-head small,
.org-member-head small {
  display: block;
  color: #8a96a8;
  font-size: 12px;
  line-height: 1.45;
}

.org-metric-grid b {
  display: block;
  margin: 6px 0 2px;
  color: #172033;
  font-size: 20px;
  line-height: 1.2;
}

.org-workspace-layout {
  display: grid;
  grid-template-columns: minmax(280px, 34%) minmax(0, 1fr);
  gap: 14px;
  min-height: 0;
  flex: 1 1 auto;
}

.org-tree-panel,
.org-detail-panel {
  min-width: 0;
  min-height: 0;
  border: 1px solid #dfe7f3;
  border-radius: 8px;
  background: #fff;
}

.org-tree-panel {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 12px;
  overflow: hidden;
}

.org-panel-head b,
.org-member-head b {
  color: #172033;
  font-size: 13px;
}

.org-search-box {
  display: flex;
  align-items: center;
  gap: 8px;
  border: 1px solid #e6edf5;
  border-radius: 8px;
  padding: 10px 8px;
  background: #f8fafc;
}

.org-search-box input {
  min-width: 0;
  flex: 1 1 auto;
  border: 0;
  background: transparent;
  color: #172033;
  font: inherit;
  font-size: 13px;
  outline: none;
}

.org-tree-list {
  display: grid;
  gap: 8px;
  min-height: 0;
  overflow: auto;
  padding-right: 2px;
}

.org-tree-node {
  display: grid;
  grid-template-columns: 12px minmax(0, 1fr) auto;
  align-items: center;
  gap: 8px;
  width: 100%;
  min-height: 52px;
  border: 1px solid #e4ebf5;
  border-radius: 8px;
  padding: 9px 10px 9px calc(10px + var(--level, 0) * 18px);
  background: #fff;
  text-align: left;
  cursor: pointer;
  transition: border-color 0.18s ease, background 0.18s ease, box-shadow 0.18s ease;
}

.org-tree-node:hover {
  border-color: rgba(49, 109, 255, 0.32);
  box-shadow: 0 6px 14px rgba(15, 23, 42, 0.05);
}

.org-tree-node.active {
  border-color: #8cb2ff;
  background: #f3f7ff;
  box-shadow: inset 3px 0 0 #316dff;
}

.org-node-branch {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #b8c5d8;
}

.org-tree-node.active .org-node-branch {
  background: #316dff;
}

.org-node-main {
  display: grid;
  gap: 3px;
  min-width: 0;
}

.org-node-main b {
  color: #172033;
  font-size: 13px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.org-node-main small {
  color: #8a96a8;
  font-size: 12px;
}

.org-empty {
  min-height: 180px;
}

.org-detail-panel {
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.org-detail-head {
  display: flex;
  justify-content: space-between;
  gap: 16px;
  border-bottom: 1px solid #e6edf5;
  padding: 16px;
  background: #fbfcff;
}

.org-detail-head h3 {
  margin: 4px 0 0;
  color: #172033;
  font-size: 18px;
  line-height: 1.35;
}

.org-detail-head span:first-child {
  color: #316dff;
  font-size: 12px;
  font-weight: 800;
}

.org-detail-head p {
  max-width: 720px;
  margin: 8px 0 0;
  color: #6b778c;
  font-size: 13px;
  line-height: 1.6;
}

.org-detail-actions {
  align-items: flex-start;
  justify-content: flex-end;
  flex-wrap: wrap;
}

.org-detail-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 10px;
  margin: 0;
  padding: 14px 16px;
}

.org-detail-grid div {
  min-width: 0;
  border: 1px solid #edf2f8;
  border-radius: 8px;
  padding: 10px;
  background: #fff;
}

.org-detail-grid dt {
  color: #8a96a8;
  font-size: 12px;
  font-weight: 700;
}

.org-detail-grid dd {
  margin: 5px 0 0;
  color: #172033;
  font-size: 13px;
  line-height: 1.45;
  overflow-wrap: anywhere;
}

.org-tabs {
  margin: 0 16px 12px;
}

.org-tabs button:disabled {
  color: #a8b2c1;
  cursor: not-allowed;
}

.org-member-head {
  margin: 0 16px 10px;
}

.org-member-table-wrap {
  margin: 0 16px 16px;
}

.org-member-table {
  min-width: 760px;
}

.org-feedback {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  width: fit-content;
  max-width: calc(100% - 32px);
  margin: 0 16px 14px;
  border: 1px solid #b7ebc6;
  border-radius: 8px;
  padding: 7px 10px;
  background: #f0fff5;
}

.org-feedback span {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.org-feedback button {
  display: inline-grid;
  place-items: center;
  width: 18px;
  height: 18px;
  border: 0;
  border-radius: 6px;
  background: transparent;
  color: #18a058;
  font-size: 16px;
  line-height: 1;
  cursor: pointer;
}

.org-feedback button:hover {
  background: rgba(24, 160, 88, 0.1);
}

.table-status.enabled {
  background: #eafaf0;
  color: #18a058;
}

.table-status.disabled {
  background: #f1f4f8;
  color: #667085;
}

.org-editor-modal {
  width: min(760px, 100%);
}

.org-form-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
  margin-top: 16px;
}

.org-form-grid label {
  display: grid;
  gap: 6px;
  color: #667085;
  font-size: 12px;
  font-weight: 700;
}

.org-form-grid label.full {
  grid-column: 1 / -1;
}

.org-form-grid input,
.org-form-grid select,
.org-form-grid textarea {
  width: 100%;
  box-sizing: border-box;
  min-height: 36px;
  border: 1px solid #d8e1ee;
  border-radius: 8px;
  padding: 0 12px;
  background: #fff;
  color: #172033;
  font: inherit;
  font-size: 13px;
}

.org-form-grid textarea {
  min-height: 92px;
  padding: 10px 8px;
  resize: vertical;
}

.org-form-grid input:focus,
.org-form-grid select:focus,
.org-form-grid textarea:focus {
  border-color: #316dff;
  outline: none;
  box-shadow: 0 0 0 3px rgba(49, 109, 255, 0.1);
}

.org-form-grid input.invalid,
.org-form-grid select.invalid,
.org-form-grid textarea.invalid {
  border-color: #e53935;
  box-shadow: 0 0 0 3px rgba(229, 57, 53, 0.08);
}

.org-form-grid select:disabled,
.org-form-grid input:read-only {
  background: #f8fafc;
  color: #667085;
}

.org-form-grid .field-error {
  color: #e53935;
  font-size: 12px;
}

.org-form-grid .field-help {
  color: #8a96a8;
  font-size: 12px;
  font-weight: 500;
}


.function-workspace-card {
  gap: 12px;
}

.function-section-title {
  margin-bottom: 0;
}


.function-filter-bar {
  display: grid;
  grid-template-columns: minmax(220px, 1.2fr) minmax(160px, 0.8fr) minmax(130px, 0.6fr) minmax(120px, 0.6fr) auto;
  gap: 10px;
  align-items: end;
  padding: 12px;
  border: 1px solid #dfe7f3;
  border-radius: 8px;
  background: #f8fafc;
}

.function-filter-bar label,
.function-editor-form label,
.function-interface-add label {
  display: grid;
  gap: 6px;
  color: #455468;
  font-size: 12px;
}

.function-filter-bar input,
.function-filter-bar select,
.function-editor-form input,
.function-editor-form select,
.function-editor-form textarea,
.function-interface-add input,
.function-interface-add select {
  width: 100%;
  box-sizing: border-box;
  min-height: 36px;
  border: 1px solid #d8e1ee;
  border-radius: 8px;
  padding: 0 12px;
  background: #fff;
  color: #172033;
  font: inherit;
  font-size: 13px;
}

.function-editor-form textarea {
  min-height: 86px;
  padding: 10px 8px;
  resize: vertical;
}

.function-filter-bar input:focus,
.function-filter-bar select:focus,
.function-editor-form input:focus,
.function-editor-form select:focus,
.function-editor-form textarea:focus,
.function-interface-add select:focus {
  border-color: #316dff;
  outline: none;
  box-shadow: 0 0 0 3px rgba(49, 109, 255, 0.1);
}

.function-editor-form input.invalid,
.function-editor-form select.invalid,
.function-editor-form textarea.invalid,
.function-type-radio.invalid {
  border-color: #e53935;
  box-shadow: 0 0 0 3px rgba(229, 57, 53, 0.08);
}

.function-workspace-layout {
  display: grid;
  grid-template-columns: minmax(0, 1.45fr) minmax(340px, 0.85fr);
  gap: 14px;
  min-height: 0;
  flex: 1 1 auto;
}

.function-table-wrap {
  min-height: 0;
  max-height: none;
}

.function-table {
  min-width: 980px;
}

.function-table tbody tr {
  cursor: pointer;
}

.function-table tbody tr.active {
  background: #f3f7ff;
  box-shadow: inset 3px 0 0 #316dff;
}

.function-name-cell,
.function-api-cell {
  display: grid;
  gap: 4px;
  min-width: 0;
}

.function-name-cell b,
.function-api-cell b,
.function-detail-block b {
  color: #172033;
  font-size: 13px;
}

.function-name-cell small,
.function-api-cell small {
  color: #8a96a8;
  font-size: 12px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.function-type-badge {
  display: inline-flex;
  align-items: center;
  min-height: 24px;
  border-radius: 999px;
  padding: 0 9px;
  background: #eef4ff;
  color: #316dff;
  font-size: 12px;
  font-weight: 700;
}

.function-detail-panel {
  min-width: 0;
  min-height: 0;
  overflow: auto;
  border: 1px solid #dfe7f3;
  border-radius: 8px;
  background: #fbfdff;
}

.function-detail-actions {
  display: flex;
  align-items: flex-start;
  justify-content: flex-end;
  gap: 8px;
  flex: 0 0 auto;
}

.function-desc-cell {
  max-width: 420px;
  color: #455468;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.function-detail-head {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  padding: 12px;
  border-bottom: 1px solid #e6edf5;
  background: #fff;
}


.function-detail-head h3 {
  margin: 5px 0 4px;
  color: #172033;
  font-size: 16px;
  line-height: 1.35;
}

.function-detail-head p {
  margin: 0;
  color: #6b778c;
  font-size: 12px;
  line-height: 1.6;
}

.function-detail-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
  margin: 0;
  padding: 12px;
}

.function-detail-grid div,
.function-detail-block,
.function-usage-grid article,
.function-api-list article {
  min-width: 0;
  border: 1px solid #edf2f8;
  border-radius: 8px;
  background: #fff;
}

.function-detail-grid div {
  padding: 10px;
}

.function-detail-grid div.full {
  grid-column: 1 / -1;
}

.function-detail-grid dd {
  margin: 5px 0 0;
  color: #172033;
  font-size: 13px;
  line-height: 1.5;
  overflow-wrap: anywhere;
}

.function-detail-block {
  display: grid;
  gap: 10px;
  margin: 0 14px 14px;
  padding: 12px;
}

.function-api-list,
.function-usage-grid {
  display: grid;
  gap: 8px;
}

.function-api-list article,
.function-usage-grid article {
  display: grid;
  gap: 5px;
  padding: 10px;
}

.function-api-list code,
.function-interface-table code {
  color: #455468;
  font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
  font-size: 12px;
  overflow-wrap: anywhere;
}

.function-usage-grid p {
  margin: 0;
  color: #172033;
  font-size: 12px;
  line-height: 1.55;
}

.function-feedback {
  flex: 0 0 auto;
  width: fit-content;
}

.function-feedback button {
  border: 0;
  background: transparent;
  color: #18a058;
  cursor: pointer;
}

.function-editor-modal {
  width: min(760px, calc(100vw - 48px));
}

.function-editor-form {
  margin-top: 16px;
}

.function-editor-form .full,
.function-interface-editor {
  grid-column: 1 / -1;
}

.function-menu-field {
  position: relative;
  display: grid;
  gap: 6px;
  color: #455468;
  font-size: 12px;
}

.function-menu-trigger {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  min-height: 36px;
  border: 1px solid #d8e1ee;
  border-radius: 8px;
  padding: 0 12px;
  background: #fff;
  color: #172033;
  font: inherit;
  font-size: 13px;
  text-align: left;
  cursor: pointer;
}

.function-menu-trigger:hover,
.function-menu-trigger.active {
  border-color: #316dff;
  box-shadow: 0 0 0 3px rgba(49, 109, 255, 0.08);
}

.function-menu-trigger.invalid {
  border-color: #e53935;
  box-shadow: 0 0 0 3px rgba(229, 57, 53, 0.08);
}

.function-menu-trigger i,
.function-menu-column i {
  color: #8a96a8;
  font-style: normal;
  line-height: 1;
}

.function-menu-cascade {
  position: absolute;
  z-index: 20;
  top: calc(100% + 6px);
  left: 0;
  right: 0;
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  min-height: 164px;
  border: 1px solid #d8e1ee;
  border-radius: 8px;
  background: #fff;
  box-shadow: 0 12px 28px rgba(15, 23, 42, 0.14);
  overflow: hidden;
}

.function-menu-column {
  display: grid;
  align-content: start;
  max-height: 240px;
  overflow: auto;
  border-right: 1px solid #edf2f8;
  background: #fff;
}

.function-menu-column:last-child {
  border-right: 0;
}

.function-menu-column button {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  min-height: 34px;
  border: 0;
  padding: 0 12px;
  background: transparent;
  color: #455468;
  font: inherit;
  font-size: 13px;
  text-align: left;
  cursor: pointer;
}

.function-menu-column button:hover,
.function-menu-column button.active {
  background: #f3f7ff;
  color: #172033;
}

.function-menu-column.leaf button {
  justify-content: flex-start;
}
.function-type-radio {
  min-height: 38px;
  width: fit-content;
}

.function-interface-editor {
  display: grid;
  gap: 10px;
  margin-top: 14px;
  padding: 12px;
  border: 1px solid #dfe7f3;
  border-radius: 8px;
  background: #f8fafc;
}

.function-interface-add {
  display: grid;
  grid-template-columns: minmax(180px, 0.8fr) minmax(240px, 1fr) auto;
  gap: 10px;
  align-items: end;
}

.function-interface-add input:read-only {
  background: #f1f4f8;
  color: #667085;
}

.function-interface-table {
  min-width: 0;
}

.function-interface-empty {
  min-height: 120px;
  background: #fff;
}
.datasource-workspace-card {
  gap: 0;
}

.datasource-section-title {
  margin-bottom: 14px;
}

.datasource-metric-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 12px;
  margin-bottom: 14px;
}

.datasource-metric-grid article,
.datasource-detail-panel,
.datasource-scope-panel,
.datasource-usage-grid article,
.datasource-log-list article {
  border: 1px solid #dfe7f3;
  border-radius: 8px;
  background: #fff;
}

.datasource-metric-grid article {
  padding: 12px;
}

.datasource-metric-grid span,
.datasource-metric-grid small,
.datasource-detail-grid dt,
.datasource-scope-panel dt,
.datasource-log-list time,
.datasource-log-list span {
  color: #6b778c;
  font-size: 12px;
  line-height: 1.45;
}

.datasource-metric-grid b {
  display: block;
  margin: 6px 0 2px;
  color: #172033;
  font-size: 22px;
  line-height: 1.2;
}

.datasource-filter-bar {
  display: grid;
  grid-template-columns: minmax(180px, 1.25fr) repeat(4, minmax(118px, 0.8fr)) auto;
  gap: 10px;
  align-items: end;
  margin-bottom: 10px;
  padding: 12px;
  border: 1px solid #dfe7f3;
  border-radius: 8px;
  background: #f8fafc;
}

.datasource-filter-bar label,
.datasource-editor-form label {
  display: grid;
  gap: 6px;
  color: #455468;
  font-size: 12px;
}

.datasource-workspace-layout {
  flex: 1 1 auto;
  min-height: 0;
  display: grid;
  grid-template-columns: minmax(0, 1.45fr) minmax(360px, 0.8fr);
  gap: 14px;
}

.datasource-list-panel,
.datasource-detail-panel {
  min-width: 0;
  min-height: 0;
}

.datasource-table-wrap {
  height: 100%;
  max-height: none;
}

.datasource-table tbody tr {
  cursor: pointer;
}

.datasource-table tbody tr.active {
  background: #f3f7ff;
  box-shadow: inset 3px 0 0 #316dff;
}

.datasource-name-cell {
  display: grid;
  gap: 4px;
}

.datasource-name-cell b {
  color: #172033;
  font-size: 13px;
}

.datasource-name-cell small {
  color: #8a96a8;
  font-size: 12px;
}

.datasource-badge {
  display: inline-flex;
  align-items: center;
  min-height: 24px;
  border-radius: 999px;
  padding: 0 9px;
  font-size: 12px;
  font-weight: 700;
  line-height: 1;
}

.datasource-badge.risk-low {
  background: #edf8f1;
  color: #247a3d;
}

.datasource-badge.risk-medium {
  background: #fff7e8;
  color: #a15c00;
}

.datasource-badge.risk-high {
  background: #fff0f0;
  color: #c23a3a;
}

.datasource-detail-panel {
  display: flex;
  flex-direction: column;
  overflow: hidden;
  padding: 12px;
  background: #fbfdff;
}

.datasource-detail-head {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  padding-bottom: 12px;
  border-bottom: 1px solid #dfe7f3;
}

.datasource-detail-head span {
  color: #316dff;
  font-size: 12px;
  font-weight: 800;
}

.datasource-detail-head h3 {
  margin: 6px 0 4px;
  color: #172033;
  font-size: 16px;
  line-height: 1.35;
}

.datasource-detail-head p {
  margin: 0;
  color: #6b778c;
  font-size: 12px;
  line-height: 1.6;
}

.datasource-detail-tabs {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 6px;
  margin: 12px 0;
  padding: 4px;
  border: 1px solid #dfe7f3;
  border-radius: 8px;
  background: #fff;
}

.datasource-detail-tabs button {
  min-height: 32px;
  border: 0;
  border-radius: 6px;
  background: transparent;
  color: #667085;
  font-size: 12px;
  font-weight: 700;
  cursor: pointer;
}

.datasource-detail-tabs button.active {
  background: #316dff;
  color: #fff;
}

.datasource-detail-scroll {
  min-height: 0;
  overflow-y: auto;
  padding-right: 2px;
}

.datasource-detail-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
  margin: 0 0 12px;
}

.datasource-detail-grid div {
  min-width: 0;
  padding: 10px;
  border: 1px solid #dfe7f3;
  border-radius: 8px;
  background: #fff;
}

.datasource-detail-grid dd,
.datasource-scope-panel dd {
  margin: 4px 0 0;
  color: #172033;
  font-size: 13px;
  line-height: 1.45;
}

.datasource-scope-panel,
.datasource-usage-grid article,
.datasource-log-list article {
  padding: 12px;
}

.datasource-scope-panel b,
.datasource-usage-grid b,
.datasource-log-list b {
  color: #172033;
  font-size: 13px;
}

.datasource-scope-panel dl {
  display: grid;
  grid-template-columns: 86px minmax(0, 1fr);
  gap: 8px 12px;
  margin: 12px 0 0;
}

.datasource-field-wrap {
  max-height: none;
}

.datasource-usage-grid,
.datasource-log-list {
  display: grid;
  gap: 10px;
}

.datasource-log-list article {
  display: grid;
  gap: 5px;
}

.datasource-log-list p {
  margin: 0;
  color: #455468;
  font-size: 12px;
  line-height: 1.55;
}

.datasource-empty {
  height: 100%;
}

.datasource-feedback {
  flex: 0 0 auto;
  margin-top: 12px;
}

.datasource-editor-modal {
  width: min(760px, calc(100vw - 48px));
}

.datasource-checkbox-field .toggle-row {
  min-height: 38px;
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 0 12px;
  border: 1px solid #dfe7f3;
  border-radius: 8px;
  background: #fff;
}

.datasource-checkbox-field .toggle-row b {
  color: #455468;
  font-size: 12px;
  font-weight: 600;
}


.datasource-workspace-card {
  gap: 0;
}

.datasource-section-title {
  margin-bottom: 14px;
}

.datasource-filter-bar.compact {
  display: grid;
  grid-template-columns: minmax(180px, 260px) minmax(220px, 1fr) auto;
  gap: 10px;
  align-items: end;
  margin-bottom: 10px;
  padding: 12px;
  border: 1px solid #dfe7f3;
  border-radius: 8px;
  background: #f8fafc;
}

.datasource-filter-bar label,
.datasource-editor-form label {
  display: grid;
  gap: 6px;
  color: #455468;
  font-size: 12px;
}

.datasource-table-wrap.flat {
  flex: 1 1 auto;
  min-height: 0;
  max-height: none;
}

.datasource-table.flat {
  min-width: 980px;
}

.datasource-table-name {
  color: #172033;
  font-size: 13px;
}

.datasource-url-cell {
  max-width: 280px;
  color: #455468;
  overflow-wrap: anywhere;
}

.datasource-empty {
  min-height: 260px;
}

.datasource-feedback {
  flex: 0 0 auto;
  width: fit-content;
  margin-top: 12px;
}

.datasource-editor-modal {
  width: min(820px, calc(100vw - 48px));
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
    grid-template-columns: clamp(124px, 10.5vw, 146px) minmax(0, 1fr);
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

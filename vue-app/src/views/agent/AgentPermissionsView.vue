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
              <label>
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
              <label>
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
        <p class="modal-note">可按角色名称、角色中包含的功能权限或数据权限搜索。</p>
        <input v-model.trim="roleModal.keyword" class="modal-search-input" placeholder="搜索角色名称、功能权限、数据权限">
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
                <small>业务负责人确认当前人员可归属的组织和租户。</small>
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
                    :disabled="approvalWorkspace.mode === 'view'"
                    @click="toggleApprovalOrganization(org)"
                  >{{ org }}</button>
                </div>
                <small v-if="approvalWorkspace.errors.organizations" class="field-error">{{ approvalWorkspace.errors.organizations }}</small>
              </div>
              <label>
                <span class="field-label required">所属租户 <em>必填</em></span>
                <select v-model="approvalWorkspace.tenant" :disabled="approvalWorkspace.mode === 'view'" :class="{ invalid: approvalWorkspace.errors.tenant }">
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
            <label v-if="needsTransferItcode" class="modal-form-field">
              <span class="field-label required">{{ transferItcodeLabel }} <em>必填</em></span>
              <input
                v-model.trim="approvalWorkspace.transferItcode"
                :class="{ invalid: approvalWorkspace.errors.transferItcode }"
                placeholder="请输入对方 ITCode，例如 liwen08"
              >
              <small v-if="approvalWorkspace.errors.transferItcode" class="field-error">{{ approvalWorkspace.errors.transferItcode }}</small>
            </label>
            <label class="modal-form-field">
              <span>审批意见</span>
              <textarea v-model.trim="approvalWorkspace.opinion" rows="4" placeholder="请说明审批意见、调整原因或需要申请人补充的内容。"></textarea>
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
            <button type="button" :class="{ active: roleEditor.dataTab === 'normal' }" @click="roleEditor.dataTab = 'normal'">普通授权</button>
            <button type="button" :class="{ active: roleEditor.dataTab === 'custom' }" @click="roleEditor.dataTab = 'custom'">自定义授权</button>
          </div>

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
                      <input type="checkbox" :disabled="roleEditorReadonly" :checked="roleEditor.draft.dataPermissionIds.includes(leaf.id)" @change="toggleRoleDataPermission(leaf.id)">
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
              <button v-if="!roleEditorReadonly" type="button" class="ghost-btn" @click="addCustomDataRule">新增自定义授权</button>
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
            <p>{{ userWorkspace.mode === 'view' ? '当前为只读详情，可查看基础信息、已分配角色和角色之外的额外权限。' : '保存前仅修改当前草稿，取消不会影响用户列表。' }}</p>
          </div>
          <span v-if="userWorkspace.draft" class="table-status user-modal-status" :class="userWorkspace.draft.statusKey">{{ userStatusLabel(userWorkspace.draft) }}</span>
        </div>

        <div v-if="userWorkspace.draft" class="role-impact-strip user-impact-strip">
          <span>已分配角色 <b>{{ userWorkspace.draft.roleIds.length }}</b> 个</span>
          <span>额外功能权限 <b>{{ userWorkspace.draft.extraFunctionPermissionIds.length }}</b> 项</span>
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
          <button type="button" :class="{ active: userWorkspace.activeTab === 'function' }" @click="userWorkspace.activeTab = 'function'">功能权限</button>
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
            <p>请点击“添加角色”，为用户补充基础角色后再授予额外权限。</p>
          </div>
        </section>

        <section v-else-if="userWorkspace.draft && userWorkspace.activeTab === 'function'" class="role-editor-section">
          <div class="permission-editor-grid">
            <div class="permission-tree-panel">
              <div class="permission-subhead">
                <b>可额外授予的功能</b>
                <small>角色已带出的功能会标注为角色继承；这里只保存角色之外的用户额外功能权限。</small>
              </div>
              <div class="data-tree-picker role-permission-tree">
                <div v-for="group in functionPermissionTree" :key="group.id" class="data-tree-group">
                  <b>{{ group.name }}</b>
                  <div v-for="child in group.children" :key="child.id" class="data-tree-child">
                    <span>{{ child.name }}</span>
                    <label v-for="leaf in child.children" :key="leaf.id" class="data-tree-leaf">
                      <input type="checkbox" :disabled="userWorkspaceReadonly || userDraftInheritedFunctionIds.includes(leaf.id)" :checked="userWorkspace.draft.extraFunctionPermissionIds.includes(leaf.id) || userDraftInheritedFunctionIds.includes(leaf.id)" @change="toggleUserExtraFunction(leaf.id)">
                      <span>{{ leaf.name }}</span>
                      <em v-if="userDraftInheritedFunctionIds.includes(leaf.id)" class="source-tag role">角色继承</em>
                      <em v-else-if="userWorkspace.draft.extraFunctionPermissionIds.includes(leaf.id)" class="source-tag user">用户单独授权</em>
                    </label>
                  </div>
                </div>
              </div>
            </div>
            <div class="permission-selected-panel">
              <div class="permission-subhead">
                <b>已额外授予功能</b>
              </div>
              <table v-if="userDraftExtraFunctionPermissions.length" class="permission-table selected-permission-table">
                <thead><tr><th>选择</th><th>名称</th><th>来源</th></tr></thead>
                <tbody>
                  <tr v-for="permission in userDraftExtraFunctionPermissions" :key="permission.id">
                    <td><input type="checkbox" :disabled="userWorkspaceReadonly" checked @change="toggleUserExtraFunction(permission.id)"></td>
                    <td>{{ permission.name }}</td>
                    <td><em class="source-tag user">用户单独授权</em></td>
                  </tr>
                </tbody>
              </table>
              <div v-else class="scope-empty compact-empty"><b>没有额外功能权限</b><p>当前用户仅使用角色带出的功能权限。</p></div>
            </div>
          </div>
        </section>

        <section v-else-if="userWorkspace.draft && userWorkspace.activeTab === 'data'" class="role-editor-section">
          <div class="role-data-tabs" role="tablist" aria-label="用户数据权限类型">
            <button type="button" :class="{ active: userWorkspace.dataTab === 'normal' }" @click="userWorkspace.dataTab = 'normal'">普通授权</button>
            <button type="button" :class="{ active: userWorkspace.dataTab === 'custom' }" @click="userWorkspace.dataTab = 'custom'">自定义授权</button>
          </div>
          <div v-if="userWorkspace.dataTab === 'normal'" class="permission-editor-grid">
            <div class="permission-tree-panel">
              <div class="permission-subhead"><b>可额外授予的数据权限</b><small>角色继承的数据权限只读展示；这里保存角色之外的用户单独授权。</small></div>
              <div class="data-tree-picker role-permission-tree">
                <div v-for="group in dataPermissionTree" :key="group.id" class="data-tree-group">
                  <b>{{ group.name }}</b>
                  <div v-for="child in group.children" :key="child.id" class="data-tree-child">
                    <span>{{ child.name }}</span>
                    <label v-for="leaf in child.children" :key="leaf.id" class="data-tree-leaf">
                      <input type="checkbox" :disabled="userWorkspaceReadonly || userDraftInheritedDataIds.includes(leaf.id)" :checked="userWorkspace.draft.extraDataPermissionIds.includes(leaf.id) || userDraftInheritedDataIds.includes(leaf.id)" @change="toggleUserExtraData(leaf.id)">
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
              <button v-if="!userWorkspaceReadonly" type="button" class="ghost-btn" @click="addUserCustomDataRule">新增自定义授权</button>
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
    dataPermissionIds: ['data.ops.region.east', 'data.ops.metric.gmv', 'data.ops.metric.flow'],
    functionPermissionNotes: {
      'func.data.export': '仅用于运营日报和复盘导出。'
    },
    dataPermissionNotes: {
      'data.ops.region.east': '默认负责华东区运营。'
    },
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
    dataPermissionIds: ['data.lead.pool.all', 'data.lead.pool.assigned'],
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
  transferItcode: '',
  organizations: [],
  tenant: '',
  notice: '',
  errors: {
    result: '',
    transferItcode: '',
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
      selectedDataPermissionIds: ['data.ops.region.east', 'data.ops.metric.gmv', 'data.ops.metric.flow'],
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
    owner: ''
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
    extraFunctionPermissionIds: ['func.skill.manage'],
    extraDataPermissionIds: ['data.member.profile.level'],
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
    applicationNo: ''
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
const userDraftExtraFunctionPermissions = computed(() => userWorkspace.draft
  ? userWorkspace.draft.extraFunctionPermissionIds.map((id) => allFunctionPermissions.find((permission) => permission.id === id)).filter(Boolean)
  : [])
const userDraftExtraDataPermissions = computed(() => userWorkspace.draft
  ? userWorkspace.draft.extraDataPermissionIds.map((id) => findDataPermission(id)).filter(Boolean)
  : [])
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
    const dataText = role.dataPermissionIds.map(dataPermissionName).join(' ')
    return `${role.name} ${role.desc} ${functionText} ${dataText}`.toLowerCase().includes(keyword)
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
const canEditApprovalPermission = computed(() => approvalWorkspace.mode === 'approve' && ['manager', 'business'].includes(approvalWorkspace.nodeType))
const activeApprovalHasPermission = computed(() => hasPermissionSources.value)
const activeApprovalPermissionSummary = computed(() => scopeSummaryText.value)
const approvalResultOptions = computed(() => {
  if (approvalWorkspace.nodeType === 'business') {
    return [
      { value: 'agree', label: '同意' },
      { value: 'reject', label: '驳回' },
      { value: 'countersign', label: '同意并加签' },
      { value: 'transfer', label: '转交他人办理' }
    ]
  }
  return [
    { value: 'agree', label: '同意' },
    { value: 'reject', label: '驳回' }
  ]
})
const approvalDecisionTitle = computed(() => {
  if (approvalWorkspace.nodeType === 'relation') return '关联确认'
  if (approvalWorkspace.nodeType === 'manager') return '直线经理审批'
  return '业务负责人审批'
})
const approvalDecisionHint = computed(() => {
  if (approvalWorkspace.nodeType === 'relation') return '关联人只能确认关系并填写审批意见，申请信息和权限信息不可编辑。'
  if (approvalWorkspace.nodeType === 'manager') return '经理可在审批中调整权限范围，再提交审批结论。'
  return '业务负责人可确认组织、租户和权限范围，也可加签或转交。'
})
const needsTransferItcode = computed(() => ['countersign', 'transfer'].includes(approvalWorkspace.result))
const transferItcodeLabel = computed(() => approvalWorkspace.result === 'countersign' ? '加签人 ITCode' : '转交处理人 ITCode')
const approvalSubmitImpact = computed(() => {
  if (!approvalWorkspace.result) return '请选择审批结果后提交。'
  if (approvalWorkspace.result === 'reject') return '申请将退回申请人修改，列表状态变为已驳回。'
  if (approvalWorkspace.result === 'countersign') return `申请将流转给 ${approvalWorkspace.transferItcode || '待填写加签人'} 加签，列表仍保留为待审批。`
  if (approvalWorkspace.result === 'transfer') return `申请将转交给 ${approvalWorkspace.transferItcode || '待填写处理人'} 办理，当前处理人会同步更新。`
  if (approvalWorkspace.nodeType === 'relation') return '确认通过后，申请进入直线经理审批。'
  if (approvalWorkspace.nodeType === 'manager') return '经理审批通过后，申请进入业务负责人审批。'
  return '业务审批通过后，申请进入后台执行并在 POC 中标记执行完成。'
})

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
  roleEditor.dataTab = 'normal'
  roleEditor.notice = mode === 'view' ? '当前为只读查看。' : ''
  roleEditor.draft = cloneRole(role || emptyRoleDraft())
}

function closeRoleEditor() {
  roleEditor.visible = false
  roleEditor.notice = ''
}

function switchRoleEditorToEdit() {
  roleEditor.mode = roleEditor.roleId ? 'edit' : 'create'
  roleEditor.notice = ''
}

function validateRoleEditor() {
  resetRoleEditorErrors()
  roleEditor.errors.name = roleEditor.draft.name ? '' : '请输入角色名称，便于申请人识别该角色用途。'
  roleEditor.errors.type = roleEditor.draft.type ? '' : '请选择角色类型，例如业务角色或分析角色。'
  roleEditor.errors.group = roleEditor.draft.group ? '' : '请选择角色组，便于列表筛选和业务归口。'
  roleEditor.errors.owner = roleEditor.draft.owner ? '' : '请输入业务负责人，便于后续审批和维护。'
  return !Object.values(roleEditor.errors).some(Boolean)
}

function saveRoleEditor() {
  if (!validateRoleEditor()) {
    roleEditor.activeTab = 'basic'
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

function toggleRoleDataPermission(id) {
  if (roleEditorReadonly.value) return
  toggleId(roleEditor.draft.dataPermissionIds, id)
  if (!roleEditor.draft.dataPermissionIds.includes(id)) {
    delete roleEditor.draft.dataPermissionNotes[id]
  }
}

function addCustomDataRule() {
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
  approvalWorkspace.transferItcode = ''
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
  approvalWorkspace.errors.transferItcode = ''
  approvalWorkspace.errors.organizations = ''
  approvalWorkspace.errors.tenant = ''
}

function selectApprovalResult(value) {
  approvalWorkspace.result = value
  approvalWorkspace.errors.result = ''
  if (!['countersign', 'transfer'].includes(value)) {
    approvalWorkspace.transferItcode = ''
    approvalWorkspace.errors.transferItcode = ''
  }
}

function toggleApprovalOrganization(org) {
  if (approvalWorkspace.mode === 'view') return
  toggleId(approvalWorkspace.organizations, org)
  approvalWorkspace.errors.organizations = ''
}

function validateApprovalDecision() {
  clearApprovalErrors()
  if (!approvalWorkspace.result) {
    approvalWorkspace.errors.result = '请选择审批结果，例如同意或驳回。'
  }
  if (needsTransferItcode.value && !approvalWorkspace.transferItcode) {
    approvalWorkspace.errors.transferItcode = `请输入${transferItcodeLabel.value}，否则无法继续流转。`
  }
  if (approvalWorkspace.nodeType === 'business' && approvalWorkspace.result === 'agree') {
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
  if (approvalWorkspace.nodeType === 'business') {
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
  } else if (approvalWorkspace.result === 'countersign') {
    updateApprovalNode(row, 'business', {
      node: '加签人确认',
      status: '待我审批',
      statusKey: 'pending',
      approverItcode: approvalWorkspace.transferItcode,
      handlers: [approvalWorkspace.transferItcode]
    })
  } else if (approvalWorkspace.result === 'transfer') {
    updateApprovalNode(row, 'business', {
      node: '业务负责人审批',
      status: '待我审批',
      statusKey: 'pending',
      approverItcode: approvalWorkspace.transferItcode,
      handlers: [approvalWorkspace.transferItcode]
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
  nextUser.extraFunctionPermissionIds ||= []
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
  userWorkspace.dataTab = 'normal'
  userWorkspace.loginFilter = 'all'
  userWorkspace.applicationNo = ''
  userWorkspace.generatedApplicationNo = ''
  userWorkspace.notice = mode === 'view' ? '当前为只读详情。' : ''
  userWorkspace.draft = cloneUser(user || emptyUserDraft())
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
  return !Object.values(userWorkspace.errors).some(Boolean)
}

function saveUserWorkspace() {
  if (!validateUserWorkspace()) {
    userWorkspace.activeTab = userWorkspace.errors.applicationNo ? userWorkspace.activeTab : 'basic'
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
    detail = '保存用户角色、功能权限或数据权限变更，申请单号用于审批流程追溯。'
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
    || !sameIdSet(original.extraFunctionPermissionIds, draft.extraFunctionPermissionIds)
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
    copiedFunctionPermissionIds: [...(user.extraFunctionPermissionIds || [])],
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

function toggleUserExtraFunction(id) {
  if (userWorkspaceReadonly.value || !userWorkspace.draft || userDraftInheritedFunctionIds.value.includes(id)) return
  toggleId(userWorkspace.draft.extraFunctionPermissionIds, id)
}

function toggleUserExtraData(id) {
  if (userWorkspaceReadonly.value || !userWorkspace.draft || userDraftInheritedDataIds.value.includes(id)) return
  toggleId(userWorkspace.draft.extraDataPermissionIds, id)
}

function addUserCustomDataRule() {
  if (userWorkspaceReadonly.value || !userWorkspace.draft) return
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
  grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
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
  padding: 10px 12px;
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
  padding: 10px 12px;
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
  padding: 10px 12px;
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
  padding: 14px;
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

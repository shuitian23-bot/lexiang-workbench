<template>
  <div class="page-inner">
    <div class="page-header skill-hub-header">
      <div>
        <div class="page-title">权限管理</div>
        <div class="page-desc">统一管理门户菜单权限、Skill 能力权限和角色范围，确保可见、可用、可审批边界清晰。</div>
      </div>
      <div class="skill-hub-actions">
        <button class="btn btn-secondary" @click="router.push('/portal/home')">返回工作台</button>
        <button class="btn btn-primary" @click="router.push('/agent/skills')">查看 Skill Hub</button>
      </div>
    </div>

    <div class="permission-hub-grid">
      <section class="permission-hub-card">
        <span>MENU</span>
        <b>菜单权限</b>
        <p>控制左侧菜单、子菜单和后台页面的可见范围。默认按角色授予，特殊页面可按人员补充授权。</p>
        <div><em>在职员工管理</em><em>乐享运营</em><em>GEO 看板</em><em>风控管理</em></div>
      </section>
      <section class="permission-hub-card">
        <span>SKILL</span>
        <b>Skill 权限</b>
        <p>控制业务用户是否可以在右侧 Agent 中调用技能包，PM 可查看自己提交的 Skill 状态。</p>
        <div><em>可调用</em><em>已开启</em><em>已关闭</em><em>启停留痕</em></div>
      </section>
      <section class="permission-hub-card">
        <span>ROLE</span>
        <b>角色与审批</b>
        <p>区分业务用户、PM 和管理员。管理员负责审批 Skill、发布启停和配置高风险能力边界。</p>
        <div><em>业务用户</em><em>PM</em><em>管理员</em><em>审计留痕</em></div>
      </section>
    </div>

    <div class="permission-hub-table card">
      <div class="card-header"><div class="card-title">权限策略示例</div></div>
      <table class="table">
        <thead>
          <tr>
            <th>对象</th>
            <th>可见范围</th>
            <th>可操作</th>
            <th>审批要求</th>
            <th>状态</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="row in policyRows" :key="row.name">
            <td>{{ row.name }}</td>
            <td>{{ row.visible }}</td>
            <td>{{ row.ops }}</td>
            <td>{{ row.approval }}</td>
            <td><span class="badge" :class="row.badgeClass">{{ row.badgeText }}</span></td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<script setup>
import { useRouter } from 'vue-router'

const router = useRouter()

const policyRows = [
  {
    name: '创建 Skill',
    visible: 'PM / 平台侧',
    ops: '创建、保存草稿、提交审核',
    approval: '提交后由管理员审批',
    badgeClass: 'green',
    badgeText: '启用'
  },
  {
    name: 'Skill Hub',
    visible: 'PM / 管理员',
    ops: '查看状态、编辑、评估、测试、审批、发布、启停',
    approval: '发布和禁用需确认；驳回后由 PM 返回创建流程修改',
    badgeClass: 'green',
    badgeText: '启用'
  },
  {
    name: '管理技能包',
    visible: '业务用户',
    ops: '查看可用技能包、启停状态、调用说明',
    approval: '高风险启停需留痕',
    badgeClass: 'blue',
    badgeText: '业务入口'
  }
]
</script>

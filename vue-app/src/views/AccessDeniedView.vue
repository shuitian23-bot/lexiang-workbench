<template>
  <main class="access-denied-page">
    <section class="access-card">
      <div class="access-brand">
        <div class="access-logo">L</div>
        <span>联想乐享</span>
      </div>

      <div class="access-body">
        <span class="access-eyebrow">访问权限未开通</span>
        <h1>当前账号暂无乐享 AI 工作台访问权限</h1>
        <p>您已完成内部账号认证，但尚未开通工作台访问权限。可提交访问申请，由系统管理员确认后开通。</p>

        <dl class="access-summary">
          <div>
            <dt>当前 ITCode</dt>
            <dd>{{ itcode }}</dd>
          </div>
          <div>
            <dt>审批路径</dt>
            <dd>系统管理员审批</dd>
          </div>
          <div>
            <dt>申请类型</dt>
            <dd>开通工作台访问权限</dd>
          </div>
        </dl>

        <label class="access-field">
          <span>申请说明</span>
          <textarea v-model.trim="reason" rows="4" placeholder="请说明需要访问乐享 AI 工作台的业务场景。"></textarea>
          <small v-if="errorMsg">{{ errorMsg }}</small>
        </label>

        <div v-if="submittedRequest" class="access-result">
          <b>申请已提交</b>
          <p>{{ submittedRequest.id }} 已进入系统管理员审批。邮件 mock 已打开，可查看申请人和系统管理员收到的内容。</p>
          <a :href="statusLink(submittedRequest)">查看申请进度</a>
        </div>

        <div class="access-actions">
          <button type="button" class="secondary-btn" @click="backToLogin">返回登录页</button>
          <button type="button" class="primary-btn" :disabled="!!submittedRequest" @click="submitAccessRequest">{{ submittedRequest ? '已提交申请' : '申请访问权限' }}</button>
        </div>
      </div>
    </section>
  </main>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'

const STORAGE_KEY = 'leaibot-account-request-status-rows'
const route = useRoute()
const router = useRouter()

const itcode = computed(() => String(route.query.itcode || 'noaccess'))
const reason = ref('需要访问乐享 AI 工作台处理日常业务。')
const errorMsg = ref('')
const submittedRequest = ref<any>(null)

function appBaseUrl(path: string) {
  const base = (import.meta.env.BASE_URL || '/').replace(/\/$/, '')
  if (typeof window === 'undefined') return base + path
  return window.location.origin + base + path
}

function mailAddress(value: string, fallback = 'user') {
  const normalized = String(value || '').split('（')[0].trim() || fallback
  return normalized.includes('@') ? normalized : normalized + '@lenovo.com'
}

function statusLink(request: any) {
  return appBaseUrl('/account-request/status') + '?ticket=' + encodeURIComponent(request.id) + '&token=' + encodeURIComponent(request.token)
}

function approvalListLink(request: any) {
  return appBaseUrl('/agent/permissions') + '?module=approval&ticket=' + encodeURIComponent(request.id) + '&approver=' + encodeURIComponent(request.systemApprover) + '&viewer=approver&identity=system-admin'
}

function approvalActionLink(request: any, action = 'approve') {
  const query = [
    'ticket=' + encodeURIComponent(request.id),
    'source=account-register',
    'action=' + encodeURIComponent(action),
    'approver=' + encodeURIComponent(request.systemApprover),
    'identity=system-admin',
    'token=' + encodeURIComponent(request.token)
  ]
  return appBaseUrl('/mail-approval/action') + '?' + query.join('&')
}

function nowText() {
  const now = new Date()
  return now.getFullYear() + '-' + String(now.getMonth() + 1).padStart(2, '0') + '-' + String(now.getDate()).padStart(2, '0') + ' ' + String(now.getHours()).padStart(2, '0') + ':' + String(now.getMinutes()).padStart(2, '0')
}

function createRequest() {
  const now = new Date()
  const dateNo = [now.getFullYear(), String(now.getMonth() + 1).padStart(2, '0'), String(now.getDate()).padStart(2, '0')].join('')
  const id = 'AP-' + dateNo + '-' + String(Math.floor(Math.random() * 900) + 100)
  const token = Math.random().toString(36).slice(2, 10)
  const time = nowText()
  return {
    id,
    token,
    typeKey: 'workspace-access',
    type: '开通工作台访问权限',
    applicant: itcode.value,
    applicantItcode: itcode.value,
    target: itcode.value,
    targetItcode: itcode.value,
    accountName: itcode.value,
    applicantManager: '',
    targetManager: '',
    relatedAccount: '',
    businessApprover: '',
    systemApprover: 'sunzh4',
    email: mailAddress(itcode.value),
    mobile: '',
    roleNames: '工作台基础访问',
    dataScopeNames: '不申请数据权限',
    reason: reason.value,
    status: '待我审批',
    statusKey: 'pending',
    nodeType: 'system-admin',
    node: '系统管理员审批',
    approverItcode: 'sunzh4',
    handlers: ['sunzh4'],
    time,
    result: '',
    logs: [
      { node: '内部账号认证', detail: '账号已完成内部认证，但暂无乐享 AI 工作台访问权限。', time },
      { node: '申请人提交', detail: '工作台访问申请已受理，等待系统管理员审批。', time }
    ]
  }
}

function persistRequest(request: any) {
  if (typeof window === 'undefined') return
  try {
    const rows = JSON.parse(window.localStorage.getItem(STORAGE_KEY) || '[]').filter((item: any) => item.id !== request.id)
    rows.unshift(request)
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(rows.slice(0, 20)))
  } catch {}
}

function escapeHtml(value: any) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

function mailPane(mail: any, request: any) {
  const actions = mail.actions.length
    ? '<div class="mail-actions">' + mail.actions.map((action: any) => '<a class="' + (action.value === 'approve' ? 'agree' : 'reject') + '" href="' + escapeHtml(action.link) + '">' + escapeHtml(action.label) + '</a>').join('') + '</div>'
    : ''
  return '<section class="mail-pane" data-mail-role="' + escapeHtml(mail.role) + '"><section class="mail-head"><span>' + escapeHtml(mail.roleLabel) + '邮件 mock</span><h1>' + escapeHtml(mail.subject) + '</h1></section><section class="mail-meta"><div>收件人：' + escapeHtml(mail.toName) + ' &lt;' + escapeHtml(mail.to) + '&gt;</div><div>申请单号：' + escapeHtml(request.id) + ' · 申请类型：' + escapeHtml(request.type) + ' · 当前节点：' + escapeHtml(request.node) + '</div></section><section class="mail-body"><p>' + escapeHtml(mail.content) + '</p><div class="mail-card"><div>表单号码：<a class="ticket" href="' + escapeHtml(mail.link) + '">' + escapeHtml(request.id) + '</a></div><div>申请人：' + escapeHtml(request.applicantItcode) + '</div><div>申请说明：' + escapeHtml(request.reason) + '</div></div><a class="progress-link" href="' + escapeHtml(mail.link) + '">' + escapeHtml(mail.linkLabel) + '</a>' + actions + '</section><section class="mail-foot">这是一封 POC mock 邮件，不会真实发送。系统管理员按钮会进入邮件审批确认页。</section></section>'
}

function mailInboxHtml(request: any) {
  const mails = [
    { role: 'applicant', roleLabel: '申请人', toName: request.applicant, to: request.email, subject: request.id + ' 工作台访问申请已受理', content: '您提交的乐享 AI 工作台访问申请已受理，可点击表单号码查看审核状态。', link: statusLink(request), linkLabel: '查看审核进度', actions: [] },
    { role: 'system-admin', roleLabel: '系统管理员', toName: request.systemApprover, to: mailAddress(request.systemApprover, 'system-admin'), subject: request.id + ' 待审批：开通工作台访问权限', content: request.applicantItcode + ' 已完成内部认证但暂无工作台访问权限，请确认是否允许开通基础访问。', link: approvalListLink(request), linkLabel: '进入审批列表', actions: [ { value: 'approve', label: '同意', link: approvalActionLink(request, 'approve') }, { value: 'reject', label: '驳回', link: approvalActionLink(request, 'reject') } ] }
  ]
  const tabs = mails.map((mail, index) => '<button type="button" class="mail-tab' + (index === 0 ? ' active' : '') + '" data-mail-role="' + escapeHtml(mail.role) + '">' + escapeHtml(mail.roleLabel) + '</button>').join('')
  const panes = mails.map((mail, index) => {
    const pane = mailPane(mail, request)
    return index === 0 ? pane : pane.replace('class="mail-pane"', 'class="mail-pane hidden"')
  }).join('')
  const scriptOpen = '<scr' + 'ipt>'
  const scriptClose = '</scr' + 'ipt>'
  return [
    '<!doctype html><html lang="zh-CN"><head><meta charset="utf-8"><title>工作台访问申请邮件 mock - ' + escapeHtml(request.id) + '</title>',
    '<style>',
    'body{margin:0;background:#f3f5f8;color:#111827;font-family:Arial,"Microsoft YaHei",sans-serif}.inbox-shell{max-width:980px;margin:28px auto;border:1px solid #d8dee8;background:#fff;box-shadow:0 16px 42px rgba(15,23,42,.12)}.inbox-title{border-bottom:1px solid #e5e7eb;padding:18px 28px}.inbox-title h1{margin:0;color:#101828;font-size:22px;line-height:1.35}.inbox-title p{margin:8px 0 0;color:#667085;font-size:13px}.mail-tabs{display:flex;gap:8px;border-bottom:1px solid #e5e7eb;padding:12px 18px;background:#f8fafc;overflow-x:auto}.mail-tab{flex:0 0 auto;min-height:34px;border:1px solid #d8e1ee;border-radius:6px;padding:0 14px;background:#fff;color:#455468;font-weight:700;cursor:pointer}.mail-tab.active{border-color:#316dff;background:#316dff;color:#fff}.mail-pane.hidden{display:none}.mail-head{border-bottom:1px solid #e5e7eb;padding:20px 28px}.mail-head span{display:inline-block;margin-bottom:10px;border:1px solid #bcd3ff;border-radius:999px;padding:4px 10px;color:#316dff;font-size:12px;font-weight:700}.mail-head h1{margin:0;color:#101828;font-size:22px;line-height:1.35}.mail-meta{display:grid;gap:6px;padding:18px 28px;border-bottom:1px solid #eef2f7;color:#667085;font-size:13px}.mail-body{padding:28px;font-size:16px;line-height:1.8}.ticket{color:#2380d9;font-weight:800;text-decoration:underline}.mail-card{margin:20px 0;border:1px solid #e5e7eb;border-radius:8px;padding:16px;background:#f8fafc}.mail-actions{display:flex;gap:12px;margin-top:24px}.mail-actions a,.progress-link{display:inline-flex;align-items:center;justify-content:center;min-height:38px;border-radius:6px;padding:0 18px;font-weight:700;text-decoration:none}.progress-link{background:#316dff;color:#fff}.agree{background:#18a058;color:#fff}.reject{background:#fff1f1;color:#e53935;border:1px solid #ffc9c9}.mail-foot{padding:18px 28px 26px;color:#667085;font-size:13px}',
    '</style></head><body><main class="inbox-shell"><section class="inbox-title"><h1>' + escapeHtml(request.id) + ' 邮件 mock 收件箱</h1><p>内部用户无工作台权限时提交的访问申请，只需要系统管理员审批。</p></section><nav class="mail-tabs" aria-label="邮件列表">' + tabs + '</nav>' + panes + '</main>',
    scriptOpen,
    "document.querySelectorAll('.mail-tab').forEach((tab)=>{tab.addEventListener('click',()=>{const role=tab.dataset.mailRole;document.querySelectorAll('.mail-tab').forEach((item)=>item.classList.toggle('active',item===tab));document.querySelectorAll('.mail-pane').forEach((pane)=>pane.classList.toggle('hidden',pane.dataset.mailRole!==role));});});",
    scriptClose,
    '</body></html>'
  ].join('')
}

function openMailInbox(request: any) {
  if (typeof window === 'undefined') return
  const url = window.URL.createObjectURL(new Blob([mailInboxHtml(request)], { type: 'text/html;charset=utf-8' }))
  window.open(url, 'workspace-access-mail-inbox-' + request.id)
  window.setTimeout(() => window.URL.revokeObjectURL(url), 60000)
}

function submitAccessRequest() {
  if (!reason.value) {
    errorMsg.value = '请填写申请说明。'
    return
  }
  errorMsg.value = ''
  const request = createRequest()
  persistRequest(request)
  submittedRequest.value = request
  openMailInbox(request)
}

function backToLogin() {
  router.replace('/login')
}
</script>

<style scoped>
.access-denied-page {
  min-height: 100vh;
  display: grid;
  place-items: center;
  padding: 32px 18px;
  background: #f3f6fb;
  color: #172033;
  font-family: Arial, "Microsoft YaHei", sans-serif;
}

.access-card {
  width: min(820px, 100%);
  border: 1px solid #dfe7f2;
  border-radius: 12px;
  background: #fff;
  box-shadow: 0 18px 44px rgba(15, 23, 42, 0.10);
  overflow: hidden;
}

.access-brand {
  display: flex;
  align-items: center;
  gap: 10px;
  border-bottom: 1px solid #e6edf5;
  padding: 18px 28px;
  font-weight: 800;
}

.access-logo {
  display: grid;
  place-items: center;
  width: 28px;
  height: 28px;
  border-radius: 6px;
  background: #e2231a;
  color: #fff;
}

.access-body {
  padding: 32px 36px 36px;
}

.access-eyebrow {
  display: inline-flex;
  margin-bottom: 14px;
  border-radius: 999px;
  padding: 5px 10px;
  background: #fff4e5;
  color: #b45309;
  font-size: 12px;
  font-weight: 800;
}

.access-body h1 {
  margin: 0;
  color: #101828;
  font-size: 26px;
  line-height: 1.35;
}

.access-body > p {
  margin: 12px 0 0;
  color: #667085;
  line-height: 1.8;
}

.access-summary {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 12px;
  margin: 24px 0;
}

.access-summary div {
  border: 1px solid #e5edf7;
  border-radius: 8px;
  padding: 14px;
  background: #f8fbff;
}

.access-summary dt {
  color: #667085;
  font-size: 12px;
}

.access-summary dd {
  margin: 6px 0 0;
  color: #172033;
  font-weight: 800;
}

.access-field {
  display: grid;
  gap: 8px;
  color: #455468;
  font-weight: 700;
}

.access-field textarea {
  width: 100%;
  border: 1px solid #d8e1ee;
  border-radius: 8px;
  padding: 12px;
  color: #172033;
  font: inherit;
  resize: vertical;
}

.access-field small {
  color: #d92d20;
}

.access-result {
  margin-top: 18px;
  border: 1px solid #b7ebc6;
  border-radius: 8px;
  padding: 14px;
  background: #f0fff4;
}

.access-result b {
  color: #127a35;
}

.access-result p {
  margin: 8px 0;
  color: #455468;
}

.access-result a {
  color: #316dff;
  font-weight: 800;
}

.access-actions {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  margin-top: 24px;
}

.primary-btn,
.secondary-btn {
  min-height: 40px;
  border-radius: 8px;
  padding: 0 18px;
  font-weight: 800;
  cursor: pointer;
}

.primary-btn {
  border: 1px solid #316dff;
  background: #316dff;
  color: #fff;
}

.primary-btn:disabled {
  opacity: .55;
  cursor: not-allowed;
}

.secondary-btn {
  border: 1px solid #d8e1ee;
  background: #fff;
  color: #455468;
}

@media (max-width: 760px) {
  .access-summary {
    grid-template-columns: 1fr;
  }

  .access-body {
    padding: 26px 22px 28px;
  }
}
</style>

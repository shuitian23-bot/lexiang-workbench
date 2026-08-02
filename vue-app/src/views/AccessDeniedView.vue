<template>
  <main class="access-denied-page">
    <section class="access-card">
      <div class="access-brand">
        <div class="access-logo">L</div>
        <span>联想乐享</span>
      </div>

      <div class="access-body">
        <span class="access-eyebrow">访问受限</span>
        <h1>当前账号暂无工作台访问权限</h1>
        <p>系统已识别到您的 ITCode，但当前没有匹配到可访问的菜单和功能权限。您可以提交权限开通申请，由系统管理员确认后开通。</p>

        <dl class="access-summary">
          <div>
            <dt>ITCode</dt>
            <dd>{{ itcode }}</dd>
          </div>
          <div>
            <dt>审批人</dt>
            <dd>{{ systemApprover }}</dd>
          </div>
          <div>
            <dt>申请类型</dt>
            <dd>访问权限开通</dd>
          </div>
        </dl>

        <label class="access-reason">
          <span>申请说明</span>
          <textarea v-model.trim="reason" rows="4" placeholder="请说明需要访问乐享工作台的业务场景。"></textarea>
        </label>

        <p v-if="errorMsg" class="access-error">{{ errorMsg }}</p>

        <div v-if="submittedRequest" class="access-result">
          <b>权限申请已提交</b>
          <p>{{ submittedRequest.id }} 已进入系统管理员审批。mock 邮件已打开，可在邮件中点击同意或驳回。</p>
          <a :href="statusLink(submittedRequest)">查看审核进度</a>
        </div>

        <div class="access-actions">
          <a class="access-secondary" href="/admin-vue/login">返回登录页</a>
          <button type="button" :disabled="!!submittedRequest" @click="submitAccessRequest">{{ submittedRequest ? '已提交' : '申请权限' }}</button>
        </div>
      </div>
    </section>
  </main>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRoute } from 'vue-router'

const STORAGE_KEY = 'leaibot-account-request-status-rows'
const route = useRoute()
const itcode = computed(() => String(route.query.itcode || 'noaccess'))
const systemApprover = 'sunzh4'
const reason = ref('需要访问联想乐享工作台处理日常业务。')
const errorMsg = ref('')
const submittedRequest = ref<any>(null)

function appBaseUrl(path: string) {
  const base = (import.meta.env.BASE_URL || '/').replace(/\/$/, '')
  if (typeof window === 'undefined') return base + path
  return window.location.origin + base + path
}

function nowText() {
  const now = new Date()
  return now.getFullYear() + '-' + String(now.getMonth() + 1).padStart(2, '0') + '-' + String(now.getDate()).padStart(2, '0') + ' ' + String(now.getHours()).padStart(2, '0') + ':' + String(now.getMinutes()).padStart(2, '0')
}

function statusLink(request: any) {
  return appBaseUrl('/account-request/status') + '?ticket=' + encodeURIComponent(request.id) + '&token=' + encodeURIComponent(request.token)
}

function approvalActionLink(request: any, action: 'approve' | 'reject') {
  const query = [
    'ticket=' + encodeURIComponent(request.id),
    'source=access-request',
    'action=' + encodeURIComponent(action),
    'approver=' + encodeURIComponent(systemApprover),
    'identity=system-admin',
    'token=' + encodeURIComponent(request.token)
  ]
  return appBaseUrl('/mail-approval/action') + '?' + query.join('&')
}

function approvalListLink(request: any) {
  const query = [
    'module=approval',
    'ticket=' + encodeURIComponent(request.id),
    'approver=' + encodeURIComponent(systemApprover),
    'viewer=approver',
    'identity=system-admin'
  ]
  return appBaseUrl('/agent/permissions') + '?' + query.join('&')
}

function createRequest() {
  const now = new Date()
  const dateNo = [now.getFullYear(), String(now.getMonth() + 1).padStart(2, '0'), String(now.getDate()).padStart(2, '0')].join('')
  const time = nowText()
  const id = 'AP-' + dateNo + '-' + String(Math.floor(Math.random() * 900) + 100)
  const token = Math.random().toString(36).slice(2, 10)
  return {
    id,
    token,
    typeKey: 'access',
    type: '访问权限开通',
    applicant: itcode.value,
    applicantItcode: itcode.value,
    target: itcode.value,
    targetItcode: itcode.value,
    applicantManager: systemApprover,
    targetManager: systemApprover,
    relatedAccount: '',
    businessApprover: '',
    systemApprover,
    approverItcode: systemApprover,
    handlers: [systemApprover],
    nodeType: 'system-admin',
    node: '系统管理员审批',
    email: itcode.value + '@lenovo.com',
    mobile: '',
    roleNames: '申请开通工作台访问权限',
    dataScopeNames: '待系统管理员确认',
    reason: reason.value,
    status: '待我审批',
    statusKey: 'pending',
    time,
    result: '',
    logs: [
      { node: '用户提交', detail: '无权限用户已提交工作台访问权限开通申请。', time }
    ]
  }
}

function persistRequest(request: any) {
  if (typeof window === 'undefined') return
  const rows = JSON.parse(window.localStorage.getItem(STORAGE_KEY) || '[]').filter((item: any) => item.id !== request.id)
  rows.unshift(request)
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(rows.slice(0, 20)))
}

function escapeHtml(value: any) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

function openMailMock(request: any) {
  if (typeof window === 'undefined') return
  const approveLink = approvalActionLink(request, 'approve')
  const rejectLink = approvalActionLink(request, 'reject')
  const html = '<!doctype html><html lang="zh-CN"><head><meta charset="utf-8"><title>' + escapeHtml(request.id) + ' 系统管理员审批邮件</title><style>' +
    'body{margin:0;background:#f3f5f8;color:#111827;font-family:Arial,"Microsoft YaHei",sans-serif}.mail{max-width:860px;margin:32px auto;background:#fff;border:1px solid #d8dee8;box-shadow:0 16px 42px rgba(15,23,42,.12)}.head{padding:22px 28px;border-bottom:1px solid #e5e7eb}.head span{color:#316dff;font-weight:800}.head h1{margin:10px 0 0;font-size:22px}.body{padding:28px;font-size:16px;line-height:1.8}.card{margin:18px 0;padding:16px;border:1px solid #e5e7eb;border-radius:8px;background:#f8fafc}.ticket{color:#2380d9;font-weight:800}.actions{display:flex;gap:12px;margin-top:22px}.actions a{display:inline-flex;align-items:center;justify-content:center;min-height:38px;border-radius:6px;padding:0 18px;font-weight:800;text-decoration:none}.agree{background:#18a058;color:#fff}.reject{background:#fff1f1;color:#e53935;border:1px solid #ffc9c9}.list{background:#316dff;color:#fff}.foot{padding:0 28px 26px;color:#667085;font-size:13px}' +
    '</style></head><body><main class="mail"><section class="head"><span>系统管理员邮件 mock</span><h1>' + escapeHtml(request.id) + ' 待审批：访问权限开通</h1></section><section class="body"><p>' + escapeHtml(request.applicant) + ' 当前无工作台访问权限，已提交权限开通申请，请确认是否允许开通。</p><div class="card"><div>表单号码：<a class="ticket" href="' + escapeHtml(approvalListLink(request)) + '">' + escapeHtml(request.id) + '</a></div><div>ITCode：' + escapeHtml(request.applicantItcode) + '</div><div>申请说明：' + escapeHtml(request.reason) + '</div></div><a class="list" href="' + escapeHtml(approvalListLink(request)) + '">进入审批列表</a><div class="actions"><a class="agree" href="' + escapeHtml(approveLink) + '">同意</a><a class="reject" href="' + escapeHtml(rejectLink) + '">驳回</a></div></section><section class="foot">这是一封 POC mock 邮件，不会真实发送。邮件按钮会进入确认页并同步本地 mock 状态。</section></main></body></html>'
  const url = window.URL.createObjectURL(new Blob([html], { type: 'text/html;charset=utf-8' }))
  window.open(url, 'access-request-mail-' + request.id)
  window.setTimeout(() => window.URL.revokeObjectURL(url), 60000)
}

function submitAccessRequest() {
  errorMsg.value = ''
  if (!reason.value) {
    errorMsg.value = '请填写申请说明。'
    return
  }
  const request = createRequest()
  persistRequest(request)
  submittedRequest.value = request
  openMailMock(request)
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
  width: min(860px, 100%);
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
  font-size: 16px;
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
  padding: 30px 34px 36px;
}

.access-eyebrow {
  display: inline-flex;
  margin-bottom: 10px;
  color: #316dff;
  font-size: 13px;
  font-weight: 800;
}

.access-body h1 {
  margin: 0;
  color: #101828;
  font-size: 28px;
  line-height: 1.3;
}

.access-body p {
  margin: 10px 0 0;
  color: #5f6b7a;
  font-size: 14px;
  line-height: 1.7;
}

.access-summary {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 12px;
  margin: 26px 0;
}

.access-summary div,
.access-result {
  border: 1px solid #e6edf5;
  border-radius: 8px;
  background: #f8fafc;
  padding: 14px;
}

.access-summary dt {
  margin-bottom: 6px;
  color: #8a96a8;
  font-size: 12px;
  font-weight: 800;
}

.access-summary dd {
  margin: 0;
  color: #172033;
  font-size: 14px;
  font-weight: 800;
}

.access-reason {
  display: grid;
  gap: 8px;
  color: #455468;
  font-size: 13px;
  font-weight: 800;
}

.access-reason textarea {
  width: 100%;
  box-sizing: border-box;
  border: 1px solid #d7e0ec;
  border-radius: 8px;
  padding: 12px;
  color: #172033;
  font: inherit;
  font-weight: 500;
  resize: vertical;
}

.access-reason textarea:focus {
  outline: 2px solid rgba(49, 109, 255, 0.18);
  border-color: #316dff;
}

.access-error {
  color: #e53935;
}

.access-result {
  margin-top: 16px;
}

.access-result b {
  color: #18a058;
}

.access-result a {
  display: inline-flex;
  margin-top: 10px;
  color: #316dff;
  font-weight: 800;
  text-decoration: none;
}

.access-actions {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  margin-top: 24px;
}

.access-actions a,
.access-actions button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 40px;
  border-radius: 8px;
  padding: 0 18px;
  font-weight: 800;
  text-decoration: none;
}

.access-secondary {
  border: 1px solid #d7e0ec;
  color: #455468;
  background: #fff;
}

.access-actions button {
  border: 0;
  background: #316dff;
  color: #fff;
  cursor: pointer;
}

.access-actions button:disabled {
  background: #b9c7df;
  cursor: default;
}

@media (max-width: 720px) {
  .access-summary {
    grid-template-columns: 1fr;
  }
  .access-body {
    padding: 26px 20px 28px;
  }
  .access-actions {
    flex-direction: column-reverse;
  }
}
</style>

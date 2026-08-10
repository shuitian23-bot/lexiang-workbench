<template>
  <div class="admin-cleanup-email-page">
    <div class="page-header permission-page-header">
      <div>
        <div class="page-title">权限清理邮件预览</div>
        <div class="page-desc">展示 admin 权限清理前一天自动发送的提醒邮件，用于 POC 演示流程追溯。</div>
      </div>
      <div class="email-page-actions">
        <button type="button" class="ghost-btn" @click="goBack">返回权限管理</button>
        <button type="button" class="primary-btn" @click="openUserList">查看用户权限</button>
      </div>
    </div>

    <section class="email-preview-layout">
      <aside class="email-meta-panel">
        <span class="mock-badge">Mock 邮件</span>
        <h2>发送记录</h2>
        <dl>
          <div>
            <dt>发送时间</dt>
            <dd>{{ sentAt }}</dd>
          </div>
          <div>
            <dt>收件人</dt>
            <dd>{{ email }}</dd>
          </div>
          <div>
            <dt>触发规则</dt>
            <dd>距离 admin 权限清理还有 1 天</dd>
          </div>
          <div>
            <dt>处理状态</dt>
            <dd><span class="table-status done">已发送提醒</span></dd>
          </div>
        </dl>
      </aside>

      <article class="email-preview-card" aria-label="权限清理提醒邮件正文">
        <header class="email-header">
          <div class="email-brand-mark">L</div>
          <div>
            <b>联想乐享 · 权限治理助手</b>
            <span>系统自动提醒，请勿直接回复</span>
          </div>
        </header>

        <div class="email-subject-row">
          <span>主题</span>
          <h1>admin 权限清理前提醒</h1>
        </div>

        <div class="email-body">
          <p>{{ name }}，你好：</p>
          <p>系统检测到账号 <strong>{{ account }}</strong> 已接近 3 个月未成功登录 admin。按照权限治理规则，若到期前仍未登录或重新确认权限，系统将在 <strong>{{ due }}</strong> 自动清理该账号的后台角色、额外数据权限和自定义数据授权。</p>

          <div class="email-info-grid">
            <div>
              <span>最近 admin 登录</span>
              <b>{{ lastLogin }}</b>
            </div>
            <div>
              <span>当前角色</span>
              <b>{{ role }}</b>
            </div>
            <div>
              <span>额外数据授权</span>
              <b>{{ dataCount }} 项</b>
            </div>
            <div>
              <span>预计清理日期</span>
              <b>{{ due }}</b>
            </div>
          </div>

          <section class="email-action-note">
            <b>建议处理</b>
            <p>如仍需保留 admin 权限，请在到期前登录后台或联系账号与权限管理员重新确认授权范围；如无需继续使用，无需操作，系统会在到期日自动清理并留下审计记录。</p>
          </section>

          <div class="email-cta-row">
            <button type="button" class="primary-btn" @click="openUserList">查看用户权限</button>
            <button type="button" class="ghost-btn" @click="goBack">返回权限管理</button>
          </div>
        </div>

        <footer class="email-footer">
          <span>这是一封 POC 演示邮件预览，未连接真实邮件发送服务。</span>
          <span>联想乐享权限治理 · 自动巡检</span>
        </footer>
      </article>
    </section>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'

const route = useRoute()
const router = useRouter()

const account = computed(() => String(route.query.account || 'wangming9'))
const name = computed(() => String(route.query.name || '王明'))
const email = computed(() => String(route.query.email || 'wangming9@lenovo.com'))
const due = computed(() => String(route.query.due || '2026-07-23'))
const lastLogin = computed(() => String(route.query.lastLogin || '2026-04-23 10:20'))
const sentAt = computed(() => String(route.query.sentAt || '2026-07-22 09:00'))
const role = computed(() => String(route.query.role || '系统管理员'))
const dataCount = computed(() => String(route.query.dataCount || '1'))

function goBack() {
  router.push('/agent/permissions?module=users')
}

function openUserList() {
  router.push('/agent/permissions?module=users')
}

onMounted(() => {
  document.title = '权限清理邮件预览 - 乐享 AI 工作台'
})
</script>

<style scoped>
.admin-cleanup-email-page {
  display: flex;
  flex-direction: column;
  gap: 18px;
  min-height: 100%;
  width: 100%;
  min-width: 0;
}

.email-page-actions {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
  justify-content: flex-end;
}

.primary-btn,
.ghost-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 36px;
  border-radius: 8px;
  cursor: pointer;
  font-size: 13px;
  font-weight: 600;
  line-height: 1;
  padding: 0 14px;
  transition: background .14s ease, border-color .14s ease, color .14s ease, box-shadow .14s ease;
  white-space: nowrap;
}

.primary-btn {
  border: 1px solid var(--color-primary, #3370ff);
  background: var(--color-primary, #3370ff);
  color: #fff;
}

.primary-btn:hover,
.primary-btn:focus-visible {
  border-color: var(--color-primary-hover, #245bdb);
  background: var(--color-primary-hover, #245bdb);
  outline: none;
}

.ghost-btn {
  border: 1px solid var(--color-border, #dde1e6);
  background: var(--color-surface, #fff);
  color: var(--color-text, #1f2329);
}

.ghost-btn:hover,
.ghost-btn:focus-visible {
  border-color: var(--color-border-strong, #cbd1d8);
  background: var(--color-bg-subtle, #f5f6f8);
  outline: none;
  box-shadow: 0 0 0 3px rgba(51, 112, 255, .08);
}

.table-status {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  min-height: 22px;
  border-radius: 999px;
  font-size: 12px;
  font-weight: 700;
  padding: 0 8px;
}

.table-status::before {
  width: 6px;
  height: 6px;
  border-radius: 999px;
  background: currentColor;
  content: '';
}

.table-status.done {
  background: #f0fdf4;
  color: #16a34a;
}

.email-preview-layout {
  display: grid;
  grid-template-columns: 280px minmax(0, 1fr);
  gap: 18px;
  align-items: start;
}

.email-meta-panel,
.email-preview-card {
  background: var(--color-surface, #fff);
  border: 1px solid var(--color-border-subtle, #e7eaee);
  border-radius: 12px;
  box-shadow: var(--shadow-surface, 0 1px 2px rgba(15, 23, 42, .035));
}

.email-meta-panel {
  padding: 18px;
}

.mock-badge {
  display: inline-flex;
  align-items: center;
  height: 24px;
  padding: 0 9px;
  border-radius: 999px;
  color: var(--color-warning, #d97706);
  background: var(--color-warning-subtle, #fffbeb);
  font-size: 12px;
  font-weight: 600;
}

.email-meta-panel h2 {
  margin: 14px 0 12px;
  color: var(--color-text, #1f2329);
  font-size: 16px;
  line-height: 1.4;
}

.email-meta-panel dl {
  display: grid;
  gap: 12px;
  margin: 0;
}

.email-meta-panel dt {
  margin-bottom: 4px;
  color: var(--color-text-tertiary, #8f959e);
  font-size: 12px;
}

.email-meta-panel dd {
  margin: 0;
  color: var(--color-text, #1f2329);
  font-size: 13px;
  font-weight: 600;
  word-break: break-word;
}

.email-preview-card {
  overflow: hidden;
}

.email-header {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 16px 20px;
  border-bottom: 1px solid var(--color-border-subtle, #e7eaee);
}

.email-brand-mark {
  display: grid;
  place-items: center;
  width: 32px;
  height: 32px;
  border-radius: 8px;
  background: var(--red, #e2001a);
  color: #fff;
  font-weight: 800;
}

.email-header b,
.email-header span {
  display: block;
}

.email-header b {
  color: var(--color-text, #1f2329);
  font-size: 14px;
}

.email-header span {
  margin-top: 2px;
  color: var(--color-text-secondary, #646a73);
  font-size: 12px;
}

.email-subject-row {
  padding: 18px 20px 0;
}

.email-subject-row span {
  color: var(--color-text-tertiary, #8f959e);
  font-size: 12px;
}

.email-subject-row h1 {
  margin: 6px 0 0;
  color: var(--color-text, #1f2329);
  font-size: 20px;
  line-height: 1.35;
}

.email-body {
  padding: 18px 20px 20px;
  color: var(--color-text-secondary, #646a73);
  font-size: 14px;
  line-height: 1.7;
}

.email-body p {
  margin: 0 0 12px;
}

.email-body strong {
  color: var(--color-text, #1f2329);
  font-weight: 700;
}

.email-info-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 12px;
  margin: 18px 0;
}

.email-info-grid div {
  min-width: 0;
  padding: 12px;
  border: 1px solid var(--color-border-subtle, #e7eaee);
  border-radius: 8px;
  background: var(--color-surface-subtle, #f1f3f5);
}

.email-info-grid span,
.email-info-grid b {
  display: block;
}

.email-info-grid span {
  color: var(--color-text-tertiary, #8f959e);
  font-size: 12px;
}

.email-info-grid b {
  margin-top: 6px;
  color: var(--color-text, #1f2329);
  font-size: 13px;
  line-height: 1.45;
  word-break: break-word;
}

.email-action-note {
  margin: 18px 0;
  padding: 14px 16px;
  border: 1px solid rgba(51, 112, 255, .18);
  border-radius: 8px;
  background: var(--color-primary-subtle, rgba(51, 112, 255, .08));
}

.email-action-note b {
  display: block;
  margin-bottom: 6px;
  color: var(--color-primary, #3370ff);
  font-size: 13px;
}

.email-action-note p {
  margin: 0;
}

.email-cta-row {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
  padding-top: 4px;
}

.email-footer {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  padding: 12px 20px;
  border-top: 1px solid var(--color-border-subtle, #e7eaee);
  color: var(--color-text-tertiary, #8f959e);
  background: var(--color-bg-muted, #f1f3f5);
  font-size: 12px;
}

@media (max-width: 1280px) {
  .email-preview-layout {
    grid-template-columns: 1fr;
  }

  .email-info-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}
</style>
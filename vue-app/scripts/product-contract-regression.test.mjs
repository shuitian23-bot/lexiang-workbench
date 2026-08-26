import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

async function source(path) {
  try {
    return await readFile(new URL(path, import.meta.url), 'utf8')
  } catch {
    return ''
  }
}

test('login keeps the confirmed internal and external account lifecycle', async () => {
  const [router, login] = await Promise.all([
    source('../src/router/index.ts'),
    source('../src/views/LoginView.vue')
  ])

  for (const path of ['/adfs-login', '/access-denied', '/account-request/status', '/mail-approval/action']) {
    assert.match(router, new RegExp(path.replaceAll('/', '\\\/')))
  }
  assert.match(router, /admin-cleanup-email/)
  assert.match(login, /内部用户登录/)
  assert.match(login, /外部用户登录/)
  assert.match(login, /内网ADFS登录/)
  assert.match(login, /忘记密码/)
  assert.match(login, /创建账户\/注册/)
})

test('report actions download instead of persisting local save state', async () => {
  const [messages, report, aiStore] = await Promise.all([
    source('../src/components/agent/AgentMessageList.vue'),
    source('../src/components/TempTabView.vue'),
    source('../src/stores/ai.ts')
  ])

  assert.match(messages, /下载/)
  assert.doesNotMatch(messages, /save-report|已保存' : '保存'/)
  assert.doesNotMatch(report, /saveTab|已保存' : '保存'/)
  assert.doesNotMatch(aiStore, /报告可保存|可展开、可保存|保存状态/)
})

test('AI authorization stays readable and supports batch approval', async () => {
  const [messages, aiStore] = await Promise.all([
    source('../src/components/agent/AgentMessageList.vue'),
    source('../src/stores/ai.ts')
  ])

  assert.doesNotMatch(messages, /namespace:/)
  assert.doesNotMatch(messages, /ai-auth-command/)
  assert.match(messages, /授权内容/)
  assert.match(messages, /授权范围/)
  assert.match(messages, /影响说明/)
  assert.match(messages, /auth_batch_approve/)
  assert.match(aiStore, /batchApproveLabel/)
  assert.match(aiStore, /_createReadableAuthRequest/)
  assert.match(aiStore, /_tryQueryableSkillAuthorization/)
})

test('AI replies hide seed debug content and retain answer feedback', async () => {
  const [messages, aiStore] = await Promise.all([
    source('../src/components/agent/AgentMessageList.vue'),
    source('../src/stores/ai.ts')
  ])

  assert.match(messages, /stripSeedDebugBlocks/)
  assert.match(messages, /ai-reply-feedback/)
  assert.match(messages, /有帮助/)
  assert.match(messages, /没帮助/)
  assert.match(aiStore, /_stripSeedDebugBlocks/)
})

test('natural-language Skill creation opens the create workspace directly', async () => {
  const aiStore = await source('../src/stores/ai.ts')

  assert.match(aiStore, /function _isSkillCreateIntent/)
  assert.match(aiStore, /_isSkillCreateIntent\(text\)/)
  assert.match(aiStore, /router\?\.push\('\/agent\/skill-create'\)/)
  assert.doesNotMatch(aiStore, /技能管理\|创建\\s\*skill\|创建技能/)
})

test('Skill evaluation supports independent case tuning and reevaluation', async () => {
  const view = await source('../src/views/agent/AgentSkillCreateView.vue')

  assert.match(view, /evalBaselineCases/)
  assert.match(view, /startCaseAiTune/)
  assert.match(view, /tunedCaseKeys/)
  assert.match(view, /kind: 'case'/)
  assert.match(view, /正在重新评估/)
})

test('Skill Hub classifies skills by first-level workbench menu', async () => {
  const [view, store] = await Promise.all([
    source('../src/views/agent/AgentSkillsView.vue'),
    source('../src/stores/skillHub.ts')
  ])

  assert.match(view, /MENU_TREE/)
  assert.match(view, /skillCategoryLabel/)
  assert.match(view, /一级菜单归类/)
  assert.doesNotMatch(store, /category: '数据查询'|category: '商品运营'|category: '知识问答'|category: '权益推荐'/)
})

test('specialized permission and login checks remain part of the project contract', async () => {
  const packageJson = await source('../package.json')
  for (const script of ['test:application-info', 'test:permission-scope', 'test:user-management', 'test:login-password-recovery:browser']) {
    assert.match(packageJson, new RegExp(script.replace(':', '\\:')))
  }
})

test('approved pages share the presentation-only content header', async () => {
  const [header, ...views] = await Promise.all([
    source('../src/components/content/ContentPageHeader.vue'),
    source('../src/views/agent/AgentSkillsView.vue'),
    source('../src/views/agent/AgentSkillCreateView.vue'),
    source('../src/views/agent/AgentPermissionsView.vue'),
    source('../src/views/agent/AdminCleanupEmailMockView.vue')
  ])

  assert.match(header, /<h1 class="content-page-header__title">/)
  assert.match(header, /<slot name="actions"/)
  assert.doesNotMatch(header, /useRouter|useRoute|use[A-Z]\w*Store/)

  for (const view of views) {
    assert.match(view, /<ContentPageHeader/)
    assert.match(view, /import ContentPageHeader from '@\/components\/content\/ContentPageHeader\.vue'/)
  }
  assert.doesNotMatch(views[3], /<h1>/)
})

test('portal home balances its work cards against the actual content slot', async () => {
  const view = await source('../src/views/PortalHomeView.vue')

  assert.match(view, /container-type:\s*inline-size/)
  assert.match(
    view,
    /\.portal-home-v2\s+\.portal-home-workgrid\s*\{[^}]*grid-template-columns:\s*repeat\(2,\s*minmax\(0,\s*1fr\)\)/s
  )
  assert.match(
    view,
    /@container\s*\(max-width:\s*1180px\)[\s\S]*\.portal-home-spotlight\s*\{[^}]*grid-template-columns:\s*repeat\(2,\s*minmax\(0,\s*1fr\)\)/
  )
  assert.match(
    view,
    /@container\s*\(max-width:\s*720px\)[\s\S]*\.portal-home-workgrid\s*\{[^}]*grid-template-columns:\s*minmax\(0,\s*1fr\)/
  )
})

test('sidebar starts expanded and only applies responsive collapse after a real resize', async () => {
  const sidebar = await source('../src/components/shell/sidebar/WorkbenchSidebar.vue')

  assert.match(sidebar, /window\.addEventListener\('resize',\s*_onResize\)/)
  assert.doesNotMatch(
    sidebar,
    /onMounted\(\(\)\s*=>\s*\{\s*applyResponsiveSidebar\(window\.innerWidth\)/s
  )
})

test('adjustment log records each change point and publisher separately', async () => {
  const sidebar = await source('../src/components/shell/sidebar/WorkbenchSidebar.vue')

  assert.match(sidebar, /<span>发布人<\/span>/)
  assert.match(sidebar, /getPocPublisher\(item\)/)
  assert.doesNotMatch(sidebar, /<span>改动人<\/span>/)
  assert.doesNotMatch(sidebar, /getPocOperator\(item\)/)
  assert.match(sidebar, /<small><span>改动点<\/span>/)
  assert.match(sidebar, /title: '首页内容比例校正'/)
  assert.match(sidebar, /title: '左侧菜单默认展开'/)
  assert.doesNotMatch(sidebar, /title: '首页响应式比例校正'/)
})

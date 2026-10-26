'use strict';
// Real HTTP + SQLite integration. No login/API routes are mocked or intercepted.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const crypto = require('node:crypto');
const { pathToFileURL } = require('node:url');
const { createDatabase } = require('../core/permission-lab/database');
const { createService, seedAccounts } = require('../core/permission-lab/service');
const { createApp } = require('../core/permission-lab/http');
const { loadCatalog } = require('../core/permission-lab/catalog');

async function main() {
  const { db, filename } = createDatabase();
  const password = crypto.randomBytes(24).toString('hex');
  seedAccounts(db, { adminPassword: password, demoPassword: password });
  const service = createService(db, loadCatalog());
  const origin = 'http://127.0.0.1:5181';
  const base = origin + '/admin-vue';
  const app = createApp(service, { origin, cookieName: 'permission_lab_qa' });
  const backend = app.listen(3318, '127.0.0.1');
  await new Promise((resolve, reject) => { backend.once('listening', resolve); backend.once('error', reject); });
  process.env.VITE_PERMISSION_LAB = 'true';
  process.env.VITE_AUTH_MODE = 'server';
  const { createServer } = await import(pathToFileURL(path.resolve(__dirname, '../vue-app/node_modules/vite/dist/node/index.js')).href);
  const frontend = await createServer({ root: path.resolve(__dirname, '../vue-app'), server: {
    host: '127.0.0.1', port: 5181, strictPort: true, proxy: { '/api': { target: 'http://127.0.0.1:3318', changeOrigin: true } }
  } });
  const playwright = require(process.env.PLAYWRIGHT_MODULE_PATH || path.join(os.homedir(), '.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright'));
  let browser;
  const out = fs.mkdtempSync(path.join(os.tmpdir(), 'permission-lab-browser-'));
  try {
    await frontend.listen();
    browser = await playwright.chromium.launch({ headless: true });
    const errors = [];
    async function context() {
      const ctx = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
      ctx.setDefaultTimeout(20000);
      ctx.on('page', page => page.on('pageerror', error => errors.push(error.message)));
      return ctx;
    }
    const userContext = await context(), adminContext = await context(), guestContext = await context();
    const user = await userContext.newPage(), admin = await adminContext.newPage(), guest = await guestContext.newPage();
    async function internalLogin(page, username) {
      await page.goto(base + '/adfs-login');
      await page.getByLabel('ITCode', { exact: true }).fill(username);
      assert.equal(await page.getByLabel('Password', { exact: true }).count(), 0, 'Internal demo does not request a password');
      await geometry(page, 'passwordless-' + username, true);
      await page.getByRole('button', { name: 'Submit', exact: true }).click();
    }
    async function externalLogin(page, username) {
      await page.goto(base + '/login?loginType=external');
      await page.getByLabel('用户名', { exact: true }).fill(username);
      if (username === 'admin') await page.locator('input[type=password]').fill(password);
      else assert.equal(await page.locator('input[type=password]').count(), 0, 'External demo does not request a password');
      await page.getByRole('button', { name: '登录工作台', exact: true }).click();
    }
    async function approve(page) {
      await page.getByRole('button', { name: '同意', exact: true }).click();
      await page.getByRole('button', { name: '提交审批', exact: true }).click();
    }
    async function geometry(page, name, desktopOnly = false) {
      const viewports = [{ width: 1440, height: 900 }, { width: 1280, height: 720 }];
      if (!desktopOnly) viewports.push({ width: 390, height: 844 });
      for (const viewport of viewports) {
        await page.setViewportSize(viewport);
        const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
        assert.equal(overflow, 0, `${name} horizontal overflow at ${viewport.width}`);
        await page.screenshot({ path: path.join(out, `${name}-${viewport.width}.png`), fullPage: true });
      }
      await page.setViewportSize({ width: 1440, height: 1000 });
    }
    // Changing from a demo name to an ordinary/admin name restores validation.
    await admin.goto(base + '/login?loginType=external');
    await admin.getByLabel('用户名', { exact: true }).fill('external-disabled');
    assert.equal(await admin.locator('input[type=password]').count(), 0);
    await admin.getByLabel('用户名', { exact: true }).fill('admin');
    await admin.locator('input[type=password]').waitFor();
    await admin.getByRole('button', { name: '登录工作台', exact: true }).click();
    await admin.getByText('请输入用户名和密码', { exact: true }).waitFor();
    await admin.locator('input[type=password]').fill('incorrect');
    await admin.getByRole('button', { name: '登录工作台', exact: true }).click();
    await admin.getByText('用户名或密码错误', { exact: true }).waitFor();
    await user.goto(base + '/adfs-login');
    await user.getByLabel('ITCode', { exact: true }).fill('noaccess');
    assert.equal(await user.getByLabel('Password', { exact: true }).count(), 0);
    await user.getByLabel('ITCode', { exact: true }).fill('noaccess-extra');
    await user.getByLabel('Password', { exact: true }).waitFor();
    await user.getByRole('button', { name: 'Submit', exact: true }).click();
    await user.getByText('请输入 ITCode 和 Password。', { exact: true }).waitFor();
    // Existing ADFS shell inherits the global 1280px minimum width. Record
    // that limitation; passwordless login must not add further overflow.
    await user.setViewportSize({ width: 390, height: 844 });
    const adfsBaselineOverflow = await user.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    await user.getByLabel('ITCode', { exact: true }).fill('noaccess');
    assert.equal(await user.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth), adfsBaselineOverflow);
    if (adfsBaselineOverflow) console.log(`KNOWN LIMIT: existing ADFS narrow-screen overflow ${adfsBaselineOverflow}px, unchanged by passwordless login`);
    await user.setViewportSize({ width: 1440, height: 1000 });
    await externalLogin(admin, 'admin');
    await admin.waitForURL('**/agent/permissions?module=approval');
    assert.equal(await admin.getByRole('combobox').count(), 0, 'No preview login selector');

    // The database adapter adds scenarios; it must not remove admin's original POC.
    const adminMenuBefore = service.menu('admin');
    async function openAdminModule(label) {
      await admin.locator('.permission-module-list button').filter({ hasText: label }).click();
      await admin.getByRole('heading', { name: label, exact: true }).waitFor();
    }
    await admin.locator('.permission-module-summary').getByText('7 个入口', { exact: true }).waitFor();
    assert.equal(await admin.getByText('本地隔离演示：', { exact: false }).count(), 0, 'Normal admin page must not show the added environment explanation');
    assert.equal(await admin.locator('.permission-page-vue > p[role="alert"]').count(), 0, 'Successful loading must not leave a blank notice row');
    assert.equal(await admin.locator('.permission-module-list button').count(), 7);
    await admin.getByRole('button', { name: '查看记录', exact: true }).waitFor();
    for (const [module, action, dialog] of [
      ['角色管理', '新增角色', '.role-editor-modal'],
      ['用户管理', '新增用户', '.user-editor-modal'],
      ['组织管理', '新增组织', '.org-editor-modal'],
      ['数据源管理', '新增数据源', '.data-source-editor-modal'],
      ['菜单管理', '新增', '.function-menu-editor-modal']
    ]) {
      await openAdminModule(module);
      await admin.getByRole('button', { name: action, exact: true }).click();
      // Existing modal close is shared across these original management flows.
      const panel = admin.locator('.permission-modal:visible').last();
      await panel.waitFor();
      assert(await panel.locator('input,select,textarea').count() > 0, `${module} editor is interactive (${dialog})`);
      await panel.locator('.modal-close').click();
    }
    await openAdminModule('用户管理');
    const userRow = admin.locator('.user-management-table tbody tr').first();
    await userRow.getByRole('button', { name: '编辑', exact: true }).click();
    const userEditor = admin.locator('.user-editor-modal');
    await userEditor.locator('input[placeholder="请输入手机号"]').fill('13800000001');
    await userEditor.getByRole('button', { name: '保存基本信息', exact: true }).click();
    await userEditor.getByText('用户基本信息已保存。', { exact: true }).waitFor();
    await userEditor.getByRole('button', { name: '关闭', exact: true }).click();
    await openAdminModule('组织管理');
    await admin.locator('.org-chart-card.current-card').getByRole('button', { name: '详情', exact: true }).click();
    const orgDetail = admin.locator('.org-detail-modal');
    for (const label of ['添加成员', '编辑信息', '移除组织']) await orgDetail.getByRole('button', { name: label, exact: true }).waitFor();
    await orgDetail.getByRole('button', { name: '编辑信息', exact: true }).click();
    await admin.locator('.org-editor-modal').getByRole('button', { name: '取消', exact: true }).click();
    await orgDetail.getByRole('button', { name: '关闭', exact: true }).click();
    await openAdminModule('权限申请');
    assert.equal(await admin.locator('.permission-type-grid button').count(), 5, 'All original request types remain available');
    await geometry(admin, 'admin-full-permissions', true);
    assert.deepEqual(service.menu('admin'), adminMenuBefore, 'Browser POC edits cannot change backend admin grants');
    assert.equal(service.list('admin').length, 0, 'Management edits cannot generate backend requests');
    await openAdminModule('审批列表');
    const originalRow = admin.locator('.approval-table tbody tr').filter({ hasText: 'AP-20260713-001' });
    await originalRow.getByRole('button', { name: '审批', exact: true }).click();
    await approve(admin);
    await admin.locator('.approval-workspace-modal').waitFor({ state: 'hidden' });
    assert.equal(service.list('admin').length, 0, 'Original approval stays browser-only');
    await originalRow.getByRole('button', { name: '审批', exact: true }).click();
    await admin.getByText('完整权限范围', { exact: true }).waitFor();
    const originalMailPromise = adminContext.waitForEvent('page');
    await admin.getByRole('button', { name: '审批邮件演示', exact: true }).click();
    const originalMail = await originalMailPromise;
    await originalMail.locator('a.ticket').first().waitFor();
    const originalApplicantLink = await originalMail.locator('.mail-pane[data-mail-role="applicant"] a.ticket').getAttribute('href');
    const originalGuestLink = await originalMail.locator('.mail-pane[data-mail-role="applicant-manager"] .mail-actions a').filter({ hasText: '无账号审批' }).getAttribute('href');
    assert(originalApplicantLink.includes('source=permissions'));
    assert(originalGuestLink.includes('source=permissions'));
    const localProgress = await adminContext.newPage();
    await localProgress.goto(originalApplicantLink);
    await localProgress.getByRole('heading', { name: '权限申请已进入审批', exact: true }).waitFor();
    assert.equal(await localProgress.getByRole('button', { name: '提交审批', exact: true }).count(), 0);
    await localProgress.close();
    const localGuest = await adminContext.newPage();
    await localGuest.goto(originalGuestLink);
    await localGuest.getByRole('button', { name: '提交审批', exact: true }).waitFor();
    assert.equal(await localGuest.getByText('完整权限范围', { exact: true }).count(), 0);
    await approve(localGuest);
    await localGuest.getByText('审批已提交，当前节点处理完成。您可以关闭此页面。', { exact: true }).waitFor();
    await localGuest.close();
    await originalMail.close();
    await admin.goto(base + '/agent/permissions?module=approval');
    await admin.locator('.permission-module-summary').getByText('7 个入口', { exact: true }).waitFor();
    await originalRow.filter({ hasText: '业务负责人审批' }).waitFor();
    assert.equal(service.list('admin').length, 0, 'Browser mail decisions cannot touch isolated database');
    console.log('PASS: admin retains seven modules, five request types, original editors, user save and POC approval');

    await internalLogin(user, 'noaccess');
    await user.waitForURL('**/access-denied?**');
    await user.getByLabel('业务负责人', { exact: true }).selectOption('zhangjq4');
    assert.equal(await user.getByLabel('直线经理').inputValue(), 'poc-manager');
    await user.getByRole('button', { name: '下一步', exact: true }).click();
    await user.getByLabel('leaibot-cn', { exact: true }).check();
    await user.getByRole('button', { name: '添加角色', exact: true }).click();
    await user.locator('.role-picker-row').filter({ hasText: '商品运营' }).getByRole('checkbox').check();
    await user.getByRole('dialog').getByRole('button', { name: '确认', exact: true }).click();
    await user.getByRole('button', { name: '下一步', exact: true }).click();
    await user.getByRole('button', { name: '提交申请', exact: true }).click();
    await user.getByText('权限申请已进入审批', { exact: true }).waitFor();
    assert.equal(await user.locator('.permission-module-rail').count(), 0);
    const first = service.list('admin').find(row => row.source === 'first-access');
    assert.ok(first);
    console.log('PASS: authenticated first-access application persisted');
    await user.screenshot({ path: path.join(out, 'first-access-submitted.png'), fullPage: true });
    await geometry(user, 'first-access-result');

    // Generate mail through the existing popup, then open it in a fresh browser
    // context: no session, no copied localStorage, and no workbench account.
    await admin.getByRole('button', { name: '刷新后台记录', exact: true }).click();
    await admin.locator('tbody tr').filter({ hasText: first.id }).getByRole('button', { name: '查看', exact: true }).click();
    const popupPromise = adminContext.waitForEvent('page');
    await admin.getByRole('button', { name: '审批邮件演示', exact: true }).click();
    const mail = await popupPromise;
    await mail.locator('a.ticket').first().waitFor();
    const link = await mail.locator('a.ticket').first().getAttribute('href');
    const applicantLink = await mail.locator('.mail-pane[data-mail-role="applicant"] a.ticket').getAttribute('href');
    assert(applicantLink.includes('/account-request/status?'));
    const applicantProgress = await userContext.newPage();
    await applicantProgress.goto(applicantLink);
    await applicantProgress.getByRole('heading', { name: '权限申请已进入审批', exact: true }).waitFor();
    assert.equal(await applicantProgress.locator('.approval-flow li').count(), 3);
    assert.equal(await applicantProgress.getByRole('button', { name: '提交审批', exact: true }).count(), 0);
    assert.equal(await applicantProgress.locator('input,select,textarea').count(), 0);
    await geometry(applicantProgress, 'applicant-first-access-mail');
    const unauthenticatedProgress = await guestContext.newPage();
    await unauthenticatedProgress.goto(applicantLink);
    await unauthenticatedProgress.getByRole('heading', { name: '无法查询该申请进度', exact: true }).waitFor();
    assert.equal(await unauthenticatedProgress.locator('.application-progress-summary').count(), 0, 'Applicant mail must not bypass backend session checks');
    await unauthenticatedProgress.close();
    await guest.goto(link);
    await guest.getByRole('button', { name: '提交审批', exact: true }).waitFor();
    assert.equal(await guest.getByText('完整权限范围', { exact: true }).count(), 0);
    assert.equal(await guest.locator('.permission-module-rail').count(), 0);
    assert.equal(await guestContext.cookies().then(cookies => cookies.filter(cookie => cookie.name === 'permission_lab_qa').length), 0);
    await guest.screenshot({ path: path.join(out, 'guest-manager.png'), fullPage: true });
    await geometry(guest, 'guest-approval');
    await approve(guest);
    await guest.getByText('审批已提交，当前节点处理完成。您可以关闭此页面。', { exact: true }).waitFor();
    assert.equal(service.identity('noaccess').workbenchAccess, false);
    await applicantProgress.getByRole('button', { name: '刷新状态', exact: true }).click();
    await applicantProgress.locator('.approval-flow li.current').filter({ hasText: '业务负责人' }).waitFor();
    await guest.reload();
    await guest.getByText('当前节点已经处理，以下信息仅供查看。', { exact: true }).waitFor();
    assert.equal(await guest.getByRole('button', { name: '提交审批', exact: true }).count(), 0);
    const businessMail = service.mails('admin', first.id)[1];
    await guest.goto(base + '/mail-approval/review?' + new URLSearchParams({ ticket: first.id, token: businessMail.token }));
    await guest.locator('.organization-picker').getByRole('button', { name: '乐享运营', exact: true }).click();
    await approve(guest);
    await guest.getByText('审批已提交，当前节点处理完成。您可以关闭此页面。', { exact: true }).waitFor();
    assert.equal(service.identity('noaccess').workbenchAccess, true);
    await applicantProgress.getByRole('button', { name: '刷新状态', exact: true }).click();
    await applicantProgress.getByRole('heading', { name: '权限申请已完成', exact: true }).waitFor();
    assert.equal(await applicantProgress.locator('.approval-flow li.done').count(), 3);
    await applicantProgress.close();
    assert.equal((await userContext.request.get(origin + '/api/admin/me')).status(), 403, 'Limited session is not upgraded after approval');
    await internalLogin(user, 'noaccess');
    await user.waitForURL('**/agent/permissions?module=approval');
    await user.locator('.permission-module-summary').getByText('2 个入口', { exact: true }).waitFor();
    assert.equal(await user.locator('.permission-module-list button').count(), 2, 'Non-admin cannot inherit restored admin modules');
    await user.goto(base + '/agent/permissions?module=roles');
    await user.getByRole('heading', { name: '审批列表', exact: true }).waitFor();
    assert.equal(await user.getByRole('button', { name: '新增角色', exact: true }).count(), 0);
    assert.deepEqual(service.menu('noaccess').permissions, ['func.dashboard.view', 'func.product.config', 'func.publish.confirm']);
    const effective = JSON.parse(db.prepare("SELECT scope FROM account_scope WHERE username='noaccess'").get().scope);
    assert.deepEqual(effective.selectedRoleIds, ['product-op']);
    assert.ok(effective.selectedDataPermissionIds.includes('data.ops.region.north'));
    console.log('PASS: cross-context manager/business approval and relogin');

    // Fresh context is required because the previous account is now logged in.
    const disabledContext = await context();
    const disabled = await disabledContext.newPage();
    await internalLogin(disabled, 'internal-disabled');
    await disabled.waitForURL('**/account-enable-request?**');
    const personType = disabled.getByLabel('人员类型', { exact: true });
    await personType.waitFor();
    assert.equal(await personType.inputValue(), '内部人员');
    assert.equal(await personType.getAttribute('readonly'), '');
    assert.equal(await disabled.getByRole('radiogroup', { name: '人员类型' }).count(), 0);
    assert.equal(await disabled.getByLabel('登录账号', { exact: true }).inputValue(), 'internal-disabled');
    assert.equal(await disabled.getByLabel('被申请人账号', { exact: true }).inputValue(), 'internal-disabled');
    const styles = locator => locator.evaluate(el => {
      const s = getComputedStyle(el);
      return [s.height, s.backgroundColor, s.color, s.borderRadius, s.padding, s.fontSize];
    });
    assert.deepEqual(await styles(personType), await styles(disabled.getByLabel('登录账号', { exact: true })));
    assert(await personType.evaluate(el => !!(el.closest('label').compareDocumentPosition(document.querySelector('[data-info-field=reason]')) & Node.DOCUMENT_POSITION_FOLLOWING)));
    await geometry(disabled, 'enable-account-fields');
    await disabled.getByLabel('申请原因', { exact: true }).fill('申请恢复测试账号');
    await disabled.getByRole('button', { name: '下一步', exact: true }).click();
    await disabled.getByRole('button', { name: '提交申请', exact: true }).click();
    await disabled.getByText('账号启用申请已进入审批', { exact: true }).waitFor();
    const enable = service.list('admin').find(row => row.typeKey === 'enable');
    await admin.reload();
    await admin.locator('tbody tr').filter({ hasText: enable.id }).getByRole('button', { name: '审批', exact: true }).click();
    await approve(admin);
    await admin.locator('.approval-workspace-modal').waitFor({ state: 'hidden' });
    await disabled.reload();
    await disabled.getByText('账号已启用', { exact: true }).waitFor();
    assert.equal((await disabledContext.request.get(origin + '/api/admin/me')).status(), 403);
    await internalLogin(disabled, 'internal-disabled');
    await disabled.waitForURL('**/agent/permissions?module=approval');
    assert.deepEqual(service.menu('internal-disabled').permissions, ['func.dashboard.view']);
    console.log('PASS: internal enable approval preserves original permissions');

    const externalContext = await context(), external = await externalContext.newPage();
    await externalLogin(external, 'external-disabled');
    await external.getByText('当前账号已被禁用，请联系对应的联想业务接口人申请启用。', { exact: true }).waitFor();
    assert.equal(new URL(external.url()).pathname, '/admin-vue/login');
    assert.equal((await externalContext.request.get(origin + '/api/permission-lab/identity')).status(), 401);
    await external.screenshot({ path: path.join(out, 'external-disabled.png'), fullPage: true });
    await geometry(external, 'external-disabled');
    // Admin can still apply on behalf of the actual isolated external demo account.
    await admin.goto(base + '/agent/permissions?module=apply');
    await admin.locator('.permission-type-grid button').filter({ hasText: '启用账号' }).click();
    await admin.getByRole('button', { name: '下一步', exact: true }).click();
    await admin.getByRole('radio', { name: /外部人员/ }).click();
    await admin.getByLabel('被申请人用户名', { exact: true }).fill('external-disabled');
    await admin.getByLabel('关联人 ITCode', { exact: true }).fill('admin');
    await admin.getByLabel('申请原因', { exact: true }).fill('管理员代为申请启用隔离外部账号');
    await admin.getByRole('button', { name: '下一步', exact: true }).click();
    await admin.getByRole('button', { name: '提交申请', exact: true }).click();
    await admin.locator('.approval-notification-modal .notice-ticket-link').waitFor();
    const externalEnable = service.list('admin').find(row => row.targetItcode === 'external-disabled');
    assert.ok(externalEnable, 'Delegated demo enable must use real lab API');
    await admin.goto(base + '/agent/permissions?module=approval');
    await admin.locator('.approval-table tbody tr').filter({ hasText: externalEnable.id }).getByRole('button', { name: '审批', exact: true }).click();
    await approve(admin);
    await admin.locator('.approval-workspace-modal').waitFor({ state: 'hidden' });
    assert.equal(service.identity('external-disabled').enabled, true);
    assert.deepEqual(service.menu('admin'), adminMenuBefore);
    const databaseRequestCount = service.list('admin').length;
    await admin.goto(base + '/agent/permissions?module=apply');
    await admin.locator('.permission-type-grid button').filter({ hasText: '启用账号' }).click();
    await admin.getByRole('button', { name: '下一步', exact: true }).click();
    await admin.getByLabel('被申请人账号', { exact: true }).fill('admin');
    await admin.getByLabel('申请原因', { exact: true }).fill('原浏览器管理账号的演示启用，不改变后台登录账号');
    await admin.getByRole('button', { name: '下一步', exact: true }).click();
    await admin.getByRole('button', { name: '提交申请', exact: true }).click();
    await admin.locator('.approval-notification-modal .notice-ticket-link').click();
    await admin.getByRole('heading', { name: '账号启用申请已进入审批', exact: true }).waitFor();
    assert(new URL(admin.url()).searchParams.get('source') === 'permissions');
    assert.equal(service.list('admin').length, databaseRequestCount, 'Original admin POC enable must not become a real login-account request');
    assert.deepEqual(service.menu('admin'), adminMenuBefore);
    console.log('PASS: original browser mail/progress and delegated database enable remain separated');
    // Invalid ticket must fail closed even in a clean context.
    await guest.goto(base + '/mail-approval/review?ticket=forged&token=forged');
    await guest.getByText('审批链接无效', { exact: true }).waitFor();
    assert.equal(await guest.getByRole('button', { name: '提交审批', exact: true }).count(), 0);
    assert.deepEqual(errors, []);
    console.log('PASS: database-driven login, first access, internal enable, external disabled, cross-context guest mail approval, relogin and existing permission preservation');
    console.log('Screenshots: ' + out);
  } catch (error) {
    if (browser) {
      let index = 0;
      for (const ctx of browser.contexts()) for (const page of ctx.pages()) {
        await page.screenshot({ path: path.join(out, `failure-${index++}.png`), fullPage: true }).catch(() => {});
      }
    }
    console.error('Failure screenshots: ' + out);
    throw error;
  } finally {
    if (browser) await browser.close();
    await frontend.close();
    backend.closeAllConnections();
    await new Promise(resolve => backend.close(resolve));
    db.close();
    fs.unlinkSync(filename);
    fs.rmdirSync(path.dirname(filename));
  }
}
main().catch(error => { console.error(error); process.exitCode = 1; });

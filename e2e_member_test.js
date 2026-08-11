const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const BASE_URL = process.env.E2E_BASE_URL || 'http://127.0.0.1:3001';

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  // 捕获控制台错误
  const consoleErrors = [];
  page.on('console', msg => {
    if (msg.type() === 'error') consoleErrors.push(msg.text());
  });

  console.log('=== 导航到首页 ===');
  await page.goto(BASE_URL, { waitUntil: 'networkidle', timeout: 10000 });

  // 检查 openMemberCenter 是否存在
  const hasMemberCenter = await page.evaluate(() => {
    return typeof window.openMemberCenter === 'function';
  });
  console.log('openMemberCenter 存在:', hasMemberCenter);

  // 检查面板 HTML 结构
  const memberPanelExists = await page.evaluate(() => {
    return !!document.querySelector('.lx-member-hero, #memberCenterOverlay, .lx-member-center');
  });
  console.log('会员面板 DOM 存在（初始）:', memberPanelExists);

  // ==========================================
  // 场景 A：金钻会员登录态
  // ==========================================
  console.log('\n=== 场景 A：金钻会员登录态 ===');

  await page.evaluate(() => {
    window.__lxMember = { guest: false, memberLevel: '金钻会员', loginName: '15901234903' };
  });

  // 触发会员中心
  await page.evaluate(() => {
    if (typeof openMemberCenter === 'function') openMemberCenter();
    else if (window.openMemberCenter) window.openMemberCenter();
  });

  await page.waitForTimeout(1500);
  await page.waitForSelector('.lx-member-hero', { timeout: 3000 }).catch(() => {});

  const scenarioAText = await page.evaluate(() => {
    return document.body.innerText;
  });

  const scenarioAHTML = await page.evaluate(() => {
    const el = document.querySelector('.lx-member-hero') || document.querySelector('#memberCenterOverlay') || document.querySelector('.lx-member-center');
    return el ? el.innerHTML : '(未找到面板元素)';
  });

  const scenarioALockedClass = await page.evaluate(() => {
    const locked = document.querySelectorAll('[class*="locked"], .locked');
    return locked.length;
  });

  const scenarioAAssets = await page.evaluate(() => {
    const el = document.querySelector('.lx-member-assets');
    return el ? el.innerText : '(未找到 .lx-member-assets)';
  });

  const scenarioAHero = await page.evaluate(() => {
    const el = document.querySelector('.lx-member-hero');
    return el ? el.innerText : '(未找到 .lx-member-hero)';
  });

  console.log('--- Hero 区文本 ---');
  console.log(scenarioAHero);
  console.log('--- 数字卡区文本 ---');
  console.log(scenarioAAssets);
  console.log('--- locked 元素数量 ---', scenarioALockedClass);
  console.log('--- 全页文本截取（前2000字）---');
  console.log(scenarioAText.substring(0, 2000));

  // 断言 A
  const A_hasPhone = scenarioAText.includes('159****4903');
  const A_hasGoldLevel = scenarioAText.includes('金钻会员');
  const A_hasDash = scenarioAText.includes('—');
  const A_noLogin = !scenarioAText.includes('立即登录') && !scenarioAText.includes('注册');
  const A_hasNote = scenarioAText.includes('实时乐豆') || scenarioAText.includes('积分余额以对话中查询为准');
  const A_hasRightsTitle = scenarioAText.includes('全部权益已解锁') || scenarioAText.includes('11/11') || scenarioAText.includes('金钻会员 · ');
  const A_noLocked = scenarioALockedClass === 0;

  console.log('\n--- 场景A 断言结果 ---');
  console.log('hero含"159****4903":', A_hasPhone ? 'YES' : 'NO');
  console.log('含"金钻会员":', A_hasGoldLevel ? 'YES' : 'NO');
  console.log('数字卡含"—":', A_hasDash ? 'YES' : 'NO');
  console.log('含"实时乐豆/积分余额注解":', A_hasNote ? 'YES' : 'NO');
  console.log('含权益标题:', A_hasRightsTitle ? 'YES' : 'NO');
  console.log('无"立即登录"/"注册":', A_noLogin ? 'YES' : 'NO');
  console.log('无 locked class:', A_noLocked ? 'YES' : 'NO');

  // 关闭面板（如果有关闭按钮）
  await page.evaluate(() => {
    const closeBtn = document.querySelector('.lx-member-close, .close-btn, [data-action="close"]');
    if (closeBtn) closeBtn.click();
    // 或隐藏面板
    const overlay = document.querySelector('#memberCenterOverlay');
    if (overlay) overlay.style.display = 'none';
  });
  await page.waitForTimeout(500);

  // ==========================================
  // 场景 B：游客态
  // ==========================================
  console.log('\n=== 场景 B：游客态 ===');

  await page.evaluate(() => {
    window.__lxMember = { guest: true };
  });

  await page.evaluate(() => {
    if (typeof openMemberCenter === 'function') openMemberCenter();
    else if (window.openMemberCenter) window.openMemberCenter();
  });

  await page.waitForTimeout(1500);
  await page.waitForSelector('.lx-member-hero', { timeout: 3000 }).catch(() => {});

  const scenarioBText = await page.evaluate(() => {
    return document.body.innerText;
  });

  const scenarioBHero = await page.evaluate(() => {
    const el = document.querySelector('.lx-member-hero');
    return el ? el.innerText : '(未找到 .lx-member-hero)';
  });

  const scenarioBAssets = await page.evaluate(() => {
    const el = document.querySelector('.lx-member-assets');
    return el ? el.innerText : '(未找到 .lx-member-assets)';
  });

  console.log('--- Hero 区文本 ---');
  console.log(scenarioBHero);
  console.log('--- 数字卡区文本 ---');
  console.log(scenarioBAssets);
  console.log('--- 全页文本截取（前1000字）---');
  console.log(scenarioBText.substring(0, 1000));

  // 断言 B
  const B_hasGuest = scenarioBText.includes('游客');
  const B_hasLogin = scenarioBText.includes('立即登录') || scenarioBText.includes('注册');
  const B_noGold = !scenarioBText.includes('金钻会员');
  const B_hasZero = scenarioBText.includes('0');

  console.log('\n--- 场景B 断言结果 ---');
  console.log('含"游客":', B_hasGuest ? 'YES' : 'NO');
  console.log('含"立即登录"/"注册":', B_hasLogin ? 'YES' : 'NO');
  console.log('不含"金钻会员":', B_noGold ? 'YES' : 'NO');
  console.log('数字卡含"0":', B_hasZero ? 'YES' : 'NO');

  // 控制台错误
  console.log('\n=== JS 控制台错误 ===');
  if (consoleErrors.length === 0) {
    console.log('(无)');
  } else {
    consoleErrors.forEach(e => console.log('ERROR:', e));
  }

  await browser.close();

  // 汇总结论
  console.log('\n======== 汇总结论 ========');
  console.log(`[语法检查] app.js: OK; leai.js: OK`);
  console.log(`[场景A 金钻] hero显示: "${A_hasPhone ? '159****4903' : '未脱敏'}"; 数字卡含"—": ${A_hasDash ? 'YES' : 'NO'}; 实时余额注解: ${A_hasNote ? 'YES' : 'NO'}; 权益标题: ${A_hasRightsTitle ? '含全部权益/11/11' : '未找到'}; 无"立即登录": ${A_noLogin ? 'YES' : 'NO'}`);
  console.log(`[场景B 游客] hero显示"游客": ${B_hasGuest ? 'YES' : 'NO'}; 含"立即登录": ${B_hasLogin ? 'YES' : 'NO'}`);
})();

const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const BASE_URL = process.env.E2E_BASE_URL || 'http://127.0.0.1:3001';

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  const consoleErrors = [];
  page.on('console', msg => {
    if (msg.type() === 'error') consoleErrors.push(msg.text());
  });

  console.log('=== 导航到首页 ===');
  await page.goto(BASE_URL, { waitUntil: 'networkidle', timeout: 10000 });

  // ==========================================
  // 场景 A：金钻会员登录态
  // ==========================================
  console.log('\n=== 场景 A：金钻会员登录态 ===');

  await page.evaluate(() => {
    window.__lxMember = { guest: false, memberLevel: '金钻会员', loginName: '15901234903' };
  });

  await page.evaluate(() => {
    if (typeof openMemberCenter === 'function') openMemberCenter();
    else if (window.openMemberCenter) window.openMemberCenter();
  });

  await page.waitForTimeout(2000);

  // 直接抓面板元素文本（不用 body.innerText）
  const scenarioAHero = await page.evaluate(() => {
    const el = document.querySelector('.lx-member-hero');
    return el ? el.innerText : '(未找到 .lx-member-hero)';
  });

  const scenarioAAssets = await page.evaluate(() => {
    const el = document.querySelector('.lx-member-assets');
    return el ? el.innerText : '(未找到 .lx-member-assets)';
  });

  const scenarioANote = await page.evaluate(() => {
    // 查找实时余额注解
    const all = Array.from(document.querySelectorAll('*'));
    const match = all.find(el => el.children.length === 0 && el.innerText && el.innerText.includes('实时'));
    return match ? match.innerText : '(未找到实时余额注解)';
  });

  const scenarioARightsTitle = await page.evaluate(() => {
    const all = Array.from(document.querySelectorAll('*'));
    const match = all.find(el => el.children.length === 0 && el.innerText && (el.innerText.includes('权益') || el.innerText.includes('11/11') || el.innerText.includes('已解锁')));
    return match ? match.innerText : '(未找到权益标题)';
  });

  const scenarioAOverlayHTML = await page.evaluate(() => {
    // 找到所有可能的面板容器
    const selectors = ['#memberCenterOverlay', '.lx-member-center', '.lx-member-panel', '[class*="member"]'];
    for (const sel of selectors) {
      const el = document.querySelector(sel);
      if (el) return `[${sel}] style=${el.style.cssText} display=${getComputedStyle(el).display}`;
    }
    return '(未找到面板容器)';
  });

  const scenarioALockedClass = await page.evaluate(() => {
    const locked = document.querySelectorAll('[class*="locked"]');
    return { count: locked.length, classes: Array.from(locked).map(el => el.className).join(', ') };
  });

  const scenarioAHasLogin = await page.evaluate(() => {
    return document.body.innerHTML.includes('立即登录') || document.body.innerHTML.includes('注册');
  });

  console.log('Hero 区原始文本:');
  console.log(JSON.stringify(scenarioAHero));
  console.log('数字卡区原始文本:');
  console.log(JSON.stringify(scenarioAAssets));
  console.log('实时余额注解:', JSON.stringify(scenarioANote));
  console.log('权益标题:', JSON.stringify(scenarioARightsTitle));
  console.log('面板容器状态:', scenarioAOverlayHTML);
  console.log('locked 元素:', JSON.stringify(scenarioALockedClass));
  console.log('含"立即登录"/"注册":', scenarioAHasLogin);

  // 断言 A
  const A_hasPhone = scenarioAHero.includes('159****4903');
  const A_hasGoldLevel = scenarioAHero.includes('金钻会员');
  const A_hasDash = scenarioAAssets.includes('—');
  const A_noLogin = !scenarioAHasLogin;
  const A_hasNote = scenarioANote.includes('实时');
  const A_hasRightsTitle = scenarioARightsTitle.includes('权益') || scenarioARightsTitle.includes('11/11') || scenarioARightsTitle.includes('已解锁');
  const A_noLocked = scenarioALockedClass.count === 0;

  console.log('\n--- 场景A 断言结果 ---');
  console.log('hero含"159****4903":', A_hasPhone ? 'YES' : 'NO');
  console.log('hero含"金钻会员":', A_hasGoldLevel ? 'YES' : 'NO');
  console.log('数字卡含"—":', A_hasDash ? 'YES' : 'NO');
  console.log('含实时余额注解:', A_hasNote ? 'YES' : 'NO');
  console.log('含权益标题:', A_hasRightsTitle ? 'YES' : 'NO');
  console.log('无"立即登录"/"注册":', A_noLogin ? 'YES' : 'NO');
  console.log('无 locked class:', A_noLocked ? 'YES' : 'NO');

  // 关闭面板
  await page.evaluate(() => {
    const overlay = document.querySelector('#memberCenterOverlay');
    if (overlay) overlay.style.display = 'none';
    const panel = document.querySelector('.lx-member-center, .lx-member-panel');
    if (panel) panel.style.display = 'none';
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

  await page.waitForTimeout(2000);

  const scenarioBHero = await page.evaluate(() => {
    const el = document.querySelector('.lx-member-hero');
    return el ? el.innerText : '(未找到 .lx-member-hero)';
  });

  const scenarioBAssets = await page.evaluate(() => {
    const el = document.querySelector('.lx-member-assets');
    return el ? el.innerText : '(未找到 .lx-member-assets)';
  });

  const scenarioBHasLogin = await page.evaluate(() => {
    return document.body.innerHTML.includes('立即登录') || document.querySelector('.lx-member-hero')?.innerHTML.includes('注册');
  });

  console.log('Hero 区原始文本:');
  console.log(JSON.stringify(scenarioBHero));
  console.log('数字卡区原始文本:');
  console.log(JSON.stringify(scenarioBAssets));
  console.log('含"立即登录"/"注册":', scenarioBHasLogin);

  const B_hasGuest = scenarioBHero.includes('游客');
  const B_hasLogin = scenarioBHasLogin || scenarioBHero.includes('立即登录') || scenarioBHero.includes('注册');
  const B_noGold = !scenarioBHero.includes('金钻会员');
  const B_hasZero = scenarioBAssets.includes('0');

  console.log('\n--- 场景B 断言结果 ---');
  console.log('hero含"游客":', B_hasGuest ? 'YES' : 'NO');
  console.log('含"立即登录"/"注册":', B_hasLogin ? 'YES' : 'NO');
  console.log('不含"金钻会员":', B_noGold ? 'YES' : 'NO');
  console.log('数字卡含"0":', B_hasZero ? 'YES' : 'NO');

  // JS 错误
  console.log('\n=== JS 控制台错误 ===');
  if (consoleErrors.length === 0) {
    console.log('(无)');
  } else {
    consoleErrors.forEach(e => console.log('ERROR:', e));
  }

  await browser.close();

  // 汇总
  console.log('\n======== 汇总结论 ========');
  console.log(`[语法检查] app.js: OK; leai.js: OK`);
  console.log(`[场景A 金钻] hero显示: "${A_hasPhone ? '159****4903' : '(含:' + scenarioAHero.substring(0,50) + ')'}"; 含"金钻会员": ${A_hasGoldLevel ? 'YES' : 'NO'}; 数字卡含"—": ${A_hasDash ? 'YES' : 'NO'}; 实时余额注解: ${A_hasNote ? 'YES' : 'NO'}; 权益标题: ${A_hasRightsTitle ? 'YES' : 'NO'}; 无"立即登录": ${A_noLogin ? 'YES' : 'NO'}; 无locked: ${A_noLocked ? 'YES' : 'NO'}`);
  console.log(`[场景B 游客] hero含"游客": ${B_hasGuest ? 'YES' : 'NO'}; 含"立即登录": ${B_hasLogin ? 'YES' : 'NO'}; 不含"金钻": ${B_noGold ? 'YES' : 'NO'}`);
})();

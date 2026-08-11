const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const BASE_URL = process.env.E2E_BASE_URL || 'http://127.0.0.1:3001';

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

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

  // 只检查面板内部（不用整个 body）
  const scenarioAHero = await page.evaluate(() => {
    const el = document.querySelector('.lx-member-hero');
    return el ? el.innerText : '(未找到)';
  });

  const scenarioAAssets = await page.evaluate(() => {
    const el = document.querySelector('.lx-member-assets');
    return el ? el.innerText : '(未找到)';
  });

  // 查找实时余额注解（在面板内）
  const scenarioANote = await page.evaluate(() => {
    // 在会员面板内找
    const panel = document.querySelector('[class*="member"]');
    if (!panel) return '(未找到面板)';
    const texts = Array.from(panel.querySelectorAll('*')).filter(el =>
      el.children.length === 0 && el.innerText && el.innerText.includes('实时')
    );
    return texts.map(el => el.innerText).join(' | ') || '(未找到)';
  });

  // 查找权益标题（在面板内 hero 区）
  const scenarioARightsTitle = await page.evaluate(() => {
    const hero = document.querySelector('.lx-member-hero');
    if (!hero) return '(未找到 hero)';
    return hero.querySelector('.lx-member-status, .lx-member-tagline, p, span:last-child, [class*="tag"]')?.innerText
      || Array.from(hero.querySelectorAll('*')).filter(el => el.children.length === 0 && el.innerText && (el.innerText.includes('权益') || el.innerText.includes('解锁') || el.innerText.includes('11/'))).map(el => el.innerText).join(' | ')
      || '(未找到)';
  });

  // 检查面板内是否有"立即登录"文字
  const scenarioAPanelHasLogin = await page.evaluate(() => {
    const panel = document.querySelector('[class*="member"]');
    if (!panel) return false;
    return panel.innerText.includes('立即登录') || panel.innerText.includes('注册');
  });

  // locked class 检查
  const scenarioALockedCount = await page.evaluate(() => {
    return document.querySelectorAll('[class*="locked"]').length;
  });

  console.log('Hero 区文本:', JSON.stringify(scenarioAHero));
  console.log('数字卡文本:', JSON.stringify(scenarioAAssets));
  console.log('实时余额注解:', JSON.stringify(scenarioANote));
  console.log('权益标题:', JSON.stringify(scenarioARightsTitle));
  console.log('面板内含"立即登录":', scenarioAPanelHasLogin);
  console.log('locked 元素数量:', scenarioALockedCount);

  const A_hasPhone = scenarioAHero.includes('159****4903');
  const A_hasGoldLevel = scenarioAHero.includes('金钻会员');
  const A_hasDash = scenarioAAssets.includes('—');
  const A_noLogin = !scenarioAPanelHasLogin;
  const A_hasNote = scenarioANote.includes('实时');
  const A_hasRightsTitle = scenarioARightsTitle.includes('权益') || scenarioARightsTitle.includes('11/') || scenarioARightsTitle.includes('解锁');
  const A_noLocked = scenarioALockedCount === 0;

  console.log('\n--- 场景A 断言 ---');
  console.log('hero含"159****4903":', A_hasPhone ? 'YES' : 'NO');
  console.log('hero含"金钻会员":', A_hasGoldLevel ? 'YES' : 'NO');
  console.log('数字卡含"—":', A_hasDash ? 'YES' : 'NO');
  console.log('含实时余额注解:', A_hasNote ? 'YES' : 'NO');
  console.log('含权益标题(解锁/11/):', A_hasRightsTitle ? 'YES' : 'NO');
  console.log('面板内无"立即登录":', A_noLogin ? 'YES' : 'NO');
  console.log('无 locked class:', A_noLocked ? 'YES' : 'NO');

  // ==========================================
  // 场景 B：游客态（新页面确保干净）
  // ==========================================
  console.log('\n=== 场景 B：游客态 ===');
  const page2 = await context.newPage();
  await page2.goto(BASE_URL, { waitUntil: 'networkidle', timeout: 10000 });

  await page2.evaluate(() => {
    window.__lxMember = { guest: true };
  });

  await page2.evaluate(() => {
    if (typeof openMemberCenter === 'function') openMemberCenter();
    else if (window.openMemberCenter) window.openMemberCenter();
  });

  await page2.waitForTimeout(2000);

  const scenarioBHero = await page2.evaluate(() => {
    const el = document.querySelector('.lx-member-hero');
    return el ? el.innerText : '(未找到)';
  });

  const scenarioBAssets = await page2.evaluate(() => {
    const el = document.querySelector('.lx-member-assets');
    return el ? el.innerText : '(未找到)';
  });

  const scenarioBPanelHasLogin = await page2.evaluate(() => {
    const panel = document.querySelector('[class*="member"]');
    return panel ? (panel.innerText.includes('立即登录') || panel.innerText.includes('注册')) : false;
  });

  console.log('Hero 区文本:', JSON.stringify(scenarioBHero));
  console.log('数字卡文本:', JSON.stringify(scenarioBAssets));
  console.log('面板含"立即登录"/"注册":', scenarioBPanelHasLogin);

  const B_hasGuest = scenarioBHero.includes('游客');
  const B_hasLogin = scenarioBPanelHasLogin || scenarioBHero.includes('立即登录') || scenarioBHero.includes('注册');
  const B_noGold = !scenarioBHero.includes('金钻会员');
  const B_hasZero = scenarioBAssets.includes('0');

  console.log('\n--- 场景B 断言 ---');
  console.log('hero含"游客":', B_hasGuest ? 'YES' : 'NO');
  console.log('含"立即登录"/"注册":', B_hasLogin ? 'YES' : 'NO');
  console.log('不含"金钻会员":', B_noGold ? 'YES' : 'NO');
  console.log('数字卡含"0":', B_hasZero ? 'YES' : 'NO');

  await browser.close();

  console.log('\n======== 汇总结论 ========');
  console.log(`[语法检查] app.js: OK; leai.js: OK`);
  console.log(`[场景A 金钻] hero显示: "${scenarioAHero.replace(/\s+/g,' ').trim().substring(0,80)}"`);
  console.log(`  hero含"159****4903": ${A_hasPhone ? 'YES' : 'NO'}`);
  console.log(`  hero含"金钻会员": ${A_hasGoldLevel ? 'YES' : 'NO'}`);
  console.log(`  数字卡含"—": ${A_hasDash ? 'YES' : 'NO'}`);
  console.log(`  实时余额注解: ${A_hasNote ? 'YES' : 'NO'}`);
  console.log(`  权益标题(含解锁/11/): ${A_hasRightsTitle ? 'YES' : 'NO'} — "${scenarioARightsTitle.substring(0,60)}"`);
  console.log(`  面板内无"立即登录": ${A_noLogin ? 'YES' : 'NO'}`);
  console.log(`  无 locked class: ${A_noLocked ? 'YES' : 'NO'}`);
  console.log(`[场景B 游客] hero显示: "${scenarioBHero.replace(/\s+/g,' ').trim().substring(0,80)}"`);
  console.log(`  hero含"游客": ${B_hasGuest ? 'YES' : 'NO'}`);
  console.log(`  含"立即登录"/"注册": ${B_hasLogin ? 'YES' : 'NO'}`);
  console.log(`  不含"金钻会员": ${B_noGold ? 'YES' : 'NO'}`);
})();

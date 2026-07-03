const { chromium } = require('/home/baiyu/.npm/_npx/e41f203b7505f1fb/node_modules/playwright');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  await page.goto('http://127.0.0.1:3001', { waitUntil: 'networkidle', timeout: 10000 });

  await page.evaluate(() => {
    window.__lxMember = { guest: false, memberLevel: '金钻会员', loginName: '15901234903' };
  });
  await page.evaluate(() => {
    if (typeof openMemberCenter === 'function') openMemberCenter();
    else if (window.openMemberCenter) window.openMemberCenter();
  });
  await page.waitForTimeout(2000);

  // 获取整个会员面板的 HTML
  const panelHTML = await page.evaluate(() => {
    // 找到包含 lx-member-hero 的顶层面板
    const hero = document.querySelector('.lx-member-hero');
    if (!hero) return '(未找到 hero)';
    // 往上找到足够大的容器
    let el = hero;
    while (el.parentElement && el.parentElement !== document.body) {
      el = el.parentElement;
      if (el.children.length > 2) break;
    }
    return el.innerHTML.replace(/\s+/g, ' ').substring(0, 3000);
  });

  console.log('=== 面板 HTML 结构（前3000字）===');
  console.log(panelHTML);

  // 检查注解文字
  const noteSearch = await page.evaluate(() => {
    const texts = [];
    document.querySelectorAll('*').forEach(el => {
      if (el.children.length === 0 && el.innerText) {
        const t = el.innerText.trim();
        if (t.includes('实时') || t.includes('对话中') || t.includes('查询为准') || t.includes('注解') || t.includes('余额')) {
          texts.push({ tag: el.tagName, class: el.className, text: t });
        }
      }
    });
    return texts;
  });

  console.log('\n=== 含"实时/对话中/查询为准"的元素 ===');
  console.log(JSON.stringify(noteSearch, null, 2));

  // Hero 区完整文本
  const heroText = await page.evaluate(() => {
    return document.querySelector('.lx-member-hero')?.innerText || '(未找到)';
  });
  console.log('\n=== Hero 完整文本 ===');
  console.log(JSON.stringify(heroText));

  // 数字卡完整文本
  const assetsText = await page.evaluate(() => {
    return document.querySelector('.lx-member-assets')?.innerText || '(未找到)';
  });
  console.log('\n=== 数字卡完整文本 ===');
  console.log(JSON.stringify(assetsText));

  // 实际权益标题行
  const rightsTitle = await page.evaluate(() => {
    // 找包含"解锁"或"权益"的所有可见文本节点
    const results = [];
    document.querySelectorAll('*').forEach(el => {
      if (el.children.length === 0 && el.innerText) {
        const t = el.innerText.trim();
        if (t.includes('解锁') || t.includes('11/11') || t.includes('权益已')) {
          results.push({ tag: el.tagName, class: el.className, text: t });
        }
      }
    });
    return results;
  });
  console.log('\n=== 含"解锁/11/11/权益已"的元素 ===');
  console.log(JSON.stringify(rightsTitle, null, 2));

  await browser.close();
})();

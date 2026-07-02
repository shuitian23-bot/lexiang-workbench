---
name: lexiang-smoke
description: lexiang 生产站 headless 烟测标准流程与踩坑库。任何前端改动上线后要验证真实行为(点击/输入/意图/持久化/弹窗)时必读——选择器、时序、环境坑都在这里,不看必误报。
---

# lexiang headless 烟测

## 模板(直接抄改)

```js
const puppeteer = require('/opt/projects/lexiang/node_modules/puppeteer');
(async () => {
  const b = await puppeteer.launch({
    headless: 'new',
    userDataDir: '/tmp/<会话scratchpad>/pd-xxx',   // 必带!无它 localStorage 可能写不进(隐身模式),曾误报"持久化失败"
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  const p = await b.newPage();
  const errs = []; p.on('pageerror', e => errs.push(e.message.slice(0, 80)));  // 永远收集 JS 报错
  // 等 cron 部署(≤3分钟): 轮询 ?v= 到目标版本
  let v = '';
  for (let i = 0; i < 15; i++) {
    await p.goto('https://leaibot.cn/shop-chat/', { waitUntil: 'networkidle2', timeout: 60000 });
    v = await p.evaluate(() => document.querySelector('script[src*="app.js?v="]')?.src.match(/v=(\d+)/)[1] || '');
    if (v === '<目标版本>') break;
    await new Promise(r => setTimeout(r, 10000));
  }
  // 闭环验证要拦网络作证: 执行型指令不该调官方对话 API
  let official = false;
  p.on('request', r => { if (/\/api\/(leai|chat)\/stream/.test(r.url())) official = true; });
  // 输入: focus 真实 textarea 再键盘敲(别 evaluate 设 value,不触发 input 事件)
  await p.evaluate(() => document.querySelector('.composer textarea').focus());
  await p.keyboard.type('门店'); await p.keyboard.press('Enter');
})();
```

## 踩坑库(每条都真实误报过)

| 坑 | 现象 | 对策 |
|---|---|---|
| **打字动画 5s** | 操作确认/AI 回答的气泡先显示「联想乐享正在生成中...」占位,2.5s 读到占位误判"走了AI" | 普通气泡等 ≥9s 再读;操作确认(lxAddInstantAi)已秒显可 1.5s 读 |
| **AI 完整回答 ~25s** | 等 18s 读 localStorage 为空,误报"持久化失败" | 等 AI 回答完 ≥30s 再读 |
| **消息容器两套** | 首页全屏消息在 `.lxfd-msg-user/.lxfd-msg-ai`;分屏主面板在 `.lx-p0-messages .lx-p0-message`。抓错=误报 | 首页用 lxfd 选择器,分屏用 lx-p0;别用裸 `.user-bubble`(index.html 有静态占位残留会命中!) |
| **静态骨架残留** | index.html 里「帮我推荐一款商品」占位气泡/假历史条目,会被宽选择器抓到 | 选择器必须带容器前缀 |
| **headless 隐身** | 不带 userDataDir 时 localStorage 全空 | launch 必带 userDataDir |
| **hero-btn 不可见** | `.hero-btn` 在 headless 下 visibility:hidden,page.click 报错 | 用 `page.evaluate(()=>el.click())` JS 直点 |
| **首页输入框** | 是 `#lxfdTa`,不是 .composer textarea | 按页面选:首页 #lxfdTa,分屏 .composer textarea |
| **桥接清空 lxfd** | 首页聊出商品后退全屏,`.lxfd-msg-*` 归零、内容搬进 `.lx-p0-messages` | 计数为 0 不等于没发生,查 lx-p0 侧 |

## 意图模块直测(不用起浏览器)

`app-intent.js` 支持 node 直接 require:
```bash
node -e 'const I=require("/opt/projects/lexiang/public/js/app-intent.js"); console.log(I.matchControl("门店"))'
```
改意图规则先跑单测再上线。后端意图: `curl -s -X POST http://localhost:3001/api/leai/intent -H "Content-Type: application/json" -d '{"message":"第三个下单"}'`

## 验证纪律

- 结论必须带原样抓取内容,不许只给"成功/失败"
- 误报三源头:读太早/选择器错/环境隐身——报失败前先自查这三条
- 派 tester agent 验证时把本文件要点写进 prompt,否则它必踩同样的坑

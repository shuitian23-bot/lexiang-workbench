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
| **toast 残留文案当 AI 回复** | `toast()` 只 toggle `.lx-p0-toast` 的 `show` class,2.4s 后隐藏但 textContent 不清空;之后整页 innerText/body 扫描仍会读到这行字,误判成"AI 回了一句拒绝/提示" | 判定 AI 回复只认 `.lx-p0-messages .lx-p0-message.ai` 节点,不要扫全页文本;toast 是本地操作反馈(不落库、不算对话消息) |
| **buy_nth 本地意图不打后端** | 「第N款/第N个…下单/加购/打开」等序号操作词已被 `app-intent.js matchControl` 100% 本地正则拦截(`ord && /第|个|款.../ + /下单|购买.../`),命中就直接走 `lxExecControl`,**永远不会**请求 `/api/leai/intent` 或 `/stream`——见到它没调后端是设计如此,不是"消息没发出" | 判定这类指令别盯网络请求,盯 `.lx-p0-toast` 文案或后续下单卡片/气泡 |
| **buy_nth 需要"已打开"的商品上下文** | 纯文字推荐答案只带「查看推荐商品」CTA(`data-lx-focus-reco`),不点开 CTA 或未打开过任意商品详情时,`lxCurrentContext()` 拿不到列表,「第三款下单吧」会弹 toast「当前没有可选的商品列表」——这是既有预期行为(2026-07-10 起 3cfc31e 已确认,非 bug) | 要测下单闭环:必须先点「查看推荐商品」或商品卡片打开详情页(`.detail-primary` 可见),再触发下单;别用裸「第N款下单吧」当下单闭环用例 |
| **连续两问不足 30s 会静默吞消息** | `sendChat()` 首行 `if (!text \|\| state.sending) return;`——上一条 AI 回答的 SSE + ≥5s 打字动画常常整体耗时 25s+ 才把 `state.sending` 落回 false;此时段内发第二条消息,不加气泡、不打网络、无任何反馈,肉眼像"消息没发出" | 两条追问之间必须等上一条 **完整回答 + 动画** 结束(≥30s 保险),或轮询 `window.__lxState.sending === false` 再发下一条,别按固定 25s 硬等 |

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

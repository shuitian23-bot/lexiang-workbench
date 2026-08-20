// ── 乐享全屏对话（lxfd）独立模块 ─────────────────────────────────────────────
// 从 app.js 拆出（原 L7746-L9426，天然 IIFE 边界，行为零变化）。
// 与主面板通过 window.__lxBridge / window.lxfdSubmit / window.__lxIntent 通信。
// 加载顺序：app-intent.js → app.js → app-lxfd.js（index.html 里排最后）。
// Lexiang fullscreen dialog replacement behavior
(function(){
  "use strict";
  if (window.__lxfdInstalled) return;
  window.__lxfdInstalled = true;
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const root = $(".lxfd");
  if (!root) return;

  const navCluster = $("#lxfdNavCluster");
  const convoPill = $("#lxfdConvoPill");
  const convoName = $("#lxfdConvoName");
  const rail = $("#lxfdRail");
  const railFab = $("#lxfdRailFab");
  const railNewFab = $("#lxfdRailNewFab");
  const historySearch = $("#lxfdHistorySearch");
  const scrim = $("#lxfdScrim");
  const stage = $("#lxfdStage");
  const welcome = $("#lxfdWelcome");
  const thread = $("#lxfdThread");
  const ta = $("#lxfdTa");
  const send = $("#lxfdSend");
  const chips = $("#lxfdChips");
  const quick = $("#lxfdQuick");
  const turnIndex = $("#lxfdTurnIndex");
  const turnDots = $("#lxfdTurnDots");
  const turnList = $("#lxfdTurnList");
  const helloTitle = $("#lxfdHelloTitle");
  const isWindowsRuntime = (() => {
    const platform = (navigator.userAgentData && navigator.userAgentData.platform) || navigator.platform || "";
    const ua = navigator.userAgent || "";
    return /Win/i.test(platform) || /Windows/i.test(ua);
  })();
  const forceFullscreenMotion = isWindowsRuntime;
  const reduceMotion = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches && !forceFullscreenMotion;
  document.body.classList.toggle("lxfd-force-motion", forceFullscreenMotion);
  let hoverTimer = null;
  let turns = [];
  let helloIndex = 0;
  let helloAnimating = false;
  let helloTimer = null;
  let railManuallyCollapsed = true;
  const chatState = { convId: null, sending: false, conversationNonce: 0, localId: null };
  const navPaths = { home: "/", personal: "/shop-chat/", business: "/b-chat/", enterprise: "/biz-chat/", brand: "/brand/" };
  const LXFD_DEFAULT_HELLO_WORDS = ["找商品", "找门店", "找服务", "职场认证", "教育优惠", "找解决方案"];
  let helloWords = LXFD_DEFAULT_HELLO_WORDS.slice();
  const questions = ["想买游戏本，预算8000怎么选？", "学生买轻薄本，国补和教育优惠能省多少？", "小新和YOGA系列怎么选？", "旧电脑换新能抵多少钱？", "哪里有卖ThinkPad笔记本电脑门店"];
  const quicks = ["教育特惠", "以旧换新", "乐豆商城", "0元试用", "私人订制", "会员中心", "拉新返利"];
  const arrow = '<span class="arrow">' + window.__lxApprovedIcon("global-next") + '</span>';
  // actionbar 按钮 label → 有意义的 query 示例（避免直接发 label 体验差）
  const LXFD_ACTION_Q = {
    "文档解读": "请帮我解读这份文档，提炼核心结论、关键数据和待确认风险",
    "商品导购": "帮我推荐一款适合我的笔记本电脑",
    "解决方案": "解决方案",
    "门店查询": "帮我查询附近的联想门店",
    "职场认证": "职场人群认证怎么做，能享哪些专属优惠？",
    "服务预约": "我想预约售后维修或上门服务",
    "我的订单": "帮我查最近的订单状态和物流",
    "售后服务": "我的设备保修和售后服务怎么办理？",
    "评价服务": "给本次客服服务打个五星好评",
    "需求清单": "我整理一份采购需求清单发你确认",
  };
  const answer = '<p>我是联想官方AI助手，主要可以帮您完成以下事情：</p>'
    + '<h4>产品选购</h4><ul><li>推荐最适合的联想产品&lt;笔记本、台式机、平板、手机、配件等&gt;</li><li>产品参数对比、性价比分析</li></ul>'
    + '<h4>优惠查询</h4><ul><li>最新优惠政策:国补、教育优惠、企业补贴、学生价等</li><li>计算到手价、叠加各种优惠</li><li>推荐最适合您身份的优惠券</li></ul>'
    + '<h4>服务支持</h4><ul><li>查询保修状态、推荐延保方案</li><li>售后流程:退换货、维修、清洁保养、以旧换新估价</li><li>服务站地址和技术支持联系方式</li></ul>'
    + '<h4>订单辅助</h4><ul><li>处理订单、发货物流、发票等</li><li>会员权益、乐豆积分的使用</li></ul>'
    + '<p>有什么具体需求，随时可以和我说~</p>'
    + '<div class="lxfd-followups"><button type="button">可以推荐适合学生的笔记本吗？</button><button type="button">怎么查询我的产品保修状态？</button><button type="button">现在有哪些可以叠加的优惠政策？</button></div>'
    + '<p class="lxfd-disclaimer">内容由联想乐享基于当前信息生成，请在使用前核对关键信息。</p>';

  function escapeHtml(text) { return String(text).replace(/[&<>"']/g, ch => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[ch])); }
  function escapeAttr(text) { return escapeHtml(text).replace(/`/g, "&#96;"); }
  function lxfdDetectPage() {
    const path = location.pathname;
    for (const [page, p] of Object.entries(navPaths)) {
      if (path === p || path === p.replace(/\/$/, "") || path.startsWith(p === "/" ? "/_" : p)) {
        if (p !== "/" || path === "/") return page;
      }
    }
    // 精确匹配
    for (const [page, p] of Object.entries(navPaths)) {
      const normalized = p.endsWith("/") ? p : p + "/";
      const pathNorm = path.endsWith("/") ? path : path + "/";
      if (pathNorm === normalized) return page;
    }
    return "home";
  }
  function lxfdApplySite() {
    const prompts = window.__lxSitePrompts;
    if (!prompts) {
      // 兜底：用写死默认值渲染
      if (chips) chips.innerHTML = questions.map((q, i) => `<button class="lxfd-chip-q anim-rise" style="animation-delay:${0.3 + i * 0.07}s" type="button" data-q="${escapeAttr(q)}">${escapeHtml(q)}${arrow}</button>`).join("");
      if (quick) quick.innerHTML = quicks.map((q) => `<button type="button">${escapeHtml(q)}</button>`).join("");
      return;
    }
    const page = (window.__lxState && window.__lxState.page) || lxfdDetectPage();
    const cfg = prompts[page] || prompts.home;
    if (!cfg) return;
    // 欢迎 chips
    const welcomeList = cfg.welcome || questions;
    if (chips) chips.innerHTML = welcomeList.map((q, i) => `<button class="lxfd-chip-q anim-rise" style="animation-delay:${0.3 + i * 0.07}s" type="button" data-q="${escapeAttr(q)}">${escapeHtml(q)}${arrow}</button>`).join("");
    // 底部 actionbar
    const actionbarList = cfg.actionbar || quicks;
    if (quick) quick.innerHTML = actionbarList.map((q) => `<button type="button">${escapeHtml(q)}</button>`).join("");
    // 滚动标题词固定使用默认词组，不随频道话术重新读取。
    helloWords = LXFD_DEFAULT_HELLO_WORDS.slice();
    helloIndex = helloIndex % helloWords.length;
    // 输入框 placeholder
    if (ta && cfg.placeholder) ta.placeholder = cfg.placeholder;
  }
  lxfdApplySite();
  if (ta) ta.placeholder = "文档解读";
  function shortText(text, max) { return text.length > max ? text.slice(0, max) + "…" : text; }

  // ── 能力 B：localStorage 多会话历史 ──────────────────────────────────────
  function lxfdLoadStore() { try { return JSON.parse(localStorage.getItem("lexiang.lxfd.convs.v1") || "[]"); } catch (_) { return []; } }
  function lxfdSaveStore(a) { try { localStorage.setItem("lexiang.lxfd.convs.v1", JSON.stringify(a.slice(0, 20))); } catch (_) {} }
  function lxfdNewLocalConv() { chatState.localId = "lc" + Date.now() + Math.random().toString(36).slice(2, 6); }
  function lxfdPersistCurrent() {
    if (!thread || !thread.children.length) return;
    if (!chatState.localId) lxfdNewLocalConv();
    const firstUser = thread.querySelector(".lxfd-msg-user");
    const title = (firstUser ? firstUser.textContent : "新对话").trim().slice(0, 24) || "新对话";
    const previous = lxfdLoadStore().find(c => c.id === chatState.localId);
    const store = lxfdLoadStore().filter(c => c.id !== chatState.localId);
    store.unshift({ id: chatState.localId, title, convId: chatState.convId || null, threadHtml: thread.innerHTML, ts: Date.now(), pinned: !!previous?.pinned });
    lxfdSaveStore(store);
    // 同步一份到子站切换/刷新恢复用的 key（lexiang.conversation.v1）——否则首页对话切子站后丢失
    lxfdSyncToMainConvKey();
  }
  window.__lxfdPersistCurrentNow = lxfdPersistCurrent;
  // 首页 lxfd 对话 → 写进主对话持久化 key，让切子站(整页重载)后能恢复到同一段历史
  function lxfdSyncToMainConvKey() {
    try {
      if (localStorage.getItem("lexiang.newChatEmpty.v1") === "1") {
        localStorage.removeItem("lexiang.conversation.v1");
        return;
      }
      if (!thread) return;
      const nodes = Array.from(thread.querySelectorAll(".lxfd-msg-user, .lxfd-msg-ai"));
      const messages = [];
      nodes.forEach(function (el) {
        if (el.classList.contains("lxfd-msg-user")) {
          const text = (el.textContent || "").trim();
          if (text) messages.push({ role: "user", text: text, html: "" });
        } else {
          const body = el.querySelector(".lxfd-ai-body");
          let html = body ? body.innerHTML : "";
          const text = body ? (body.textContent || "").trim() : "";
          // 完成态正文会保留 hidden typing-cursor，不能仅凭类名把整条回复当成生成中。
          // 真正未完成的消息仍以可见 loading/typing 节点或占位文案为准；已有正文时保留
          // text，并清空不安全的中间态 HTML，让目标栏目用统一 markdown 渲染恢复。
          const hasVisiblePending = !!(body && Array.from(body.querySelectorAll(".lx-generating, .loading-line, .typing-text, .typing-cursor")).some(function (node) {
            return !node.hidden && node.getAttribute("aria-hidden") !== "true";
          }));
          const hasPlaceholderOnly = /联想乐享正在生成中|正在生成中/.test(text) && text.length < 40;
          if ((hasVisiblePending || hasPlaceholderOnly) && !text.replace(/联想乐享正在生成中|正在生成中/g, "").trim()) return;
          if (hasVisiblePending || hasPlaceholderOnly) html = "";
          if (html || text) messages.push({ role: "ai", text: text, html: html });
        }
      });
      while (messages.length && messages[messages.length - 1].role === "user") messages.pop();
      if (!messages.length) return;
      localStorage.setItem("lexiang.conversation.v1", JSON.stringify({
        convId: chatState.convId || null,
        messages: messages.slice(-50),
        ts: Date.now()
      }));
    } catch (_e) {}
  }
  function lxfdRenderHist(query) {
    const normalizedQuery = String(query ?? historySearch?.value ?? "").trim().toLocaleLowerCase("zh-CN");
    const store = lxfdLoadStore()
      .slice()
      .sort((a, b) => Number(!!b.pinned) - Number(!!a.pinned) || Number(b.ts || 0) - Number(a.ts || 0))
      .filter(c => !normalizedQuery || String(c.title || "").toLocaleLowerCase("zh-CN").includes(normalizedQuery));
    const hist = $("#lxfdHist");
    if (!hist) return;
    if (!store.length) {
      hist.innerHTML = '<div class="lxfd-hist-empty" role="status">' + (normalizedQuery ? "没有找到相关对话" : "暂无历史记录") + '</div>';
      return;
    }
    hist.innerHTML = store.map(c => '<div class="lxfd-hist-item' + (c.pinned ? " is-pinned" : "") + '" data-conv-item="' + escapeAttr(c.id) + '">' +
      '<a href="#" data-conv="' + escapeAttr(c.id) + '" class="lxfd-hist-link ' + (c.id === chatState.localId ? "active" : "") + '" title="' + escapeAttr(c.title) + '"><span class="lxfd-hist-title">' + escapeHtml(c.title) + '</span></a>' +
      '<button class="lxfd-hist-more" type="button" aria-label="' + escapeAttr(c.title) + '的更多操作" aria-haspopup="menu" aria-expanded="false"><img src="../icons/global-more.svg" alt="" aria-hidden="true" /></button>' +
      '<div class="lxfd-hist-menu" role="menu"><button class="lxfd-hist-action" type="button" role="menuitem" data-action="pin"><img src="../icons/' + (c.pinned ? 'global-unpin.svg' : 'global-pin.svg') + '" alt="" aria-hidden="true" /><span>' + (c.pinned ? "取消置顶" : "置顶") + '</span></button><button class="lxfd-hist-action" type="button" role="menuitem" data-action="delete"><img src="../icons/global-delete.svg" alt="" aria-hidden="true" /><span>删除</span></button></div></div>').join("");
    hist.querySelectorAll(".lxfd-hist-more").forEach(button => {
      button.addEventListener("click", event => {
        event.preventDefault();
        event.stopPropagation();
        const item = button.closest(".lxfd-hist-item");
        if (!item) return;
        const open = !item.classList.contains("menu-open");
        $$(".lxfd-hist-item.menu-open").forEach(node => {
          node.classList.remove("menu-open");
          node.querySelector(".lxfd-hist-more")?.setAttribute("aria-expanded", "false");
        });
        item.classList.toggle("menu-open", open);
        button.setAttribute("aria-expanded", String(open));
        if (open) item.querySelector(".lxfd-hist-action")?.focus();
      });
    });
  }

  function lxfdUpdateConversation(id, action) {
    const store = lxfdLoadStore();
    const index = store.findIndex(item => item.id === id);
    if (index < 0) return;
    if (action === "pin") store[index].pinned = !store[index].pinned;
    if (action === "delete") store.splice(index, 1);
    lxfdSaveStore(store);
    if (action === "delete" && id === chatState.localId) resetConversation(false);
    else lxfdRenderHist();
  }
  function lxfdLoadConv(id) {
    const c = lxfdLoadStore().find(x => x.id === id);
    if (!c) return;
    lxfdPersistCurrent();
    chatState.localId = c.id;
    chatState.convId = c.convId || null;
    chatState.conversationNonce += 1;
    if (thread) { thread.innerHTML = c.threadHtml; thread.classList.add("show"); }
    if (welcome) welcome.style.display = "none";
    lxfdSetGalleryChatting(true);
    if (convoName) { convoName.textContent = shortText(c.title, 15); convoName.title = c.title; }
    turns = [];
    renderTurnIndex("");
    lxfdRenderHist();
  }

  // ── 能力 A：从主面板导入已有对话 ─────────────────────────────────────────
  // 查主面板消息必须排除过渡动画层里的克隆：动画层整块克隆 .assistant-panel（类名原样保留），
  // 存活的 760ms 内全局 querySelectorAll 会真身+克隆各抓一份 → 导入翻倍
  function lxfdMainMsgs(sel) {
    return Array.prototype.filter.call(document.querySelectorAll(sel), function(el) { return !el.closest(".lxfd-motion-panel"); });
  }
  function lxfdMainGenerating() {
    // 主面板是否仍在流式生成（state.sending 或最后一条 AI 消息里还挂着生成骨架）
    return !!((window.__lxState && window.__lxState.sending) ||
      lxfdMainMsgs(".lx-p0-messages > .lx-p0-message.ai .lx-generating").length);
  }
  function lxfdNormalizeImportedAiHtml(html) {
    const box = document.createElement("div");
    box.innerHTML = String(html || "");
    box.querySelectorAll("[data-lx-focus-reco]").forEach((node) => {
      node.removeAttribute("data-lx-focus-reco");
      node.setAttribute("data-lxfd-reveal-products", "1");
    });
    return box.innerHTML;
  }
  function lxfdDoImport() {
    const msgs = lxfdMainMsgs(".lx-p0-messages > .lx-p0-message");
    if (!msgs.length) return false;
    const importedConvId = (window.__lxState && window.__lxState.convId) || null;
    // 重复展开同一段分屏会话时覆盖同步现有全屏线程，不额外制造一条历史记录；
    // 只有确实切换到了另一段后端会话时才建立新的本地会话身份。
    if (!chatState.localId || (chatState.convId && importedConvId && chatState.convId !== importedConvId)) {
      lxfdNewLocalConv();
    }
    thread.innerHTML = "";
    turns = [];
    msgs.forEach(function(el) {
      const isUser = el.classList.contains("user");
      if (isUser) {
        const text = el.textContent.trim();
        const turnId = "turn-" + Date.now() + "-" + turns.length;
        thread.insertAdjacentHTML("beforeend", '<div class="lxfd-msg-user" id="' + turnId + '">' + escapeHtml(text) + '</div>');
        turns.push({ id: turnId, text: text });
      } else {
        thread.insertAdjacentHTML("beforeend", '<div class="lxfd-msg-ai"><div class="lxfd-ai-body">' + lxfdNormalizeImportedAiHtml(el.innerHTML) + '</div></div>');
      }
    });
    renderTurnIndex("");
    chatState.convId = importedConvId;
    if (welcome) welcome.style.display = "none";
    thread.classList.add("show");
    chatState.started = true;
    lxfdSetGalleryChatting(true);
    if (quick) quick.style.display = "none";
    const lastUser = thread.querySelector(".lxfd-msg-user:last-of-type");
    const titleText = lastUser ? lastUser.textContent.trim() : "导入的对话";
    if (convoName) { convoName.textContent = shortText(titleText, 15); convoName.title = titleText; }
    lxfdPersistCurrent();
    lxfdRenderHist();
    return true;
  }
  function lxfdImportFromMain() {
    const msgs = lxfdMainMsgs(".lx-p0-messages > .lx-p0-message");
    if (!msgs.length) return false;
    const generating = lxfdMainGenerating();
    // 先把当前所有消息（含那条还在生成、内容只有一半的 AI）原样克隆过来——带一半过来
    lxfdDoImport();
    if (generating) {
      // 主面板仍在流式输出：实时把最后一条 AI 消息镜像到全屏，主面板每蹦一段、全屏跟着更新，
      // 直到生成结束——边进边继续往外输出，不再干等（流式 SSE 只发给主面板 DOM，这里做镜像）。
      const aiNodes = lxfdMainMsgs(".lx-p0-messages > .lx-p0-message.ai");
      const mainAi = aiNodes[aiNodes.length - 1];
      const fsBodies = thread.querySelectorAll(".lxfd-msg-ai .lxfd-ai-body");
      const fsAiBody = fsBodies[fsBodies.length - 1];
      if (mainAi && fsAiBody) {
        let tries = 0;
        const iv = setInterval(function() {
          tries++;
          fsAiBody.innerHTML = lxfdNormalizeImportedAiHtml(mainAi.innerHTML);          // 镜像最新流式内容
          thread.scrollTop = thread.scrollHeight;
          if (!lxfdMainGenerating() || tries > 400) {     // 60s 上限兜底
            clearInterval(iv);
            fsAiBody.innerHTML = lxfdNormalizeImportedAiHtml(mainAi.innerHTML);          // 收尾再同步最终一帧
            lxfdPersistCurrent();
            lxfdRenderHist();
          }
        }, 150);
      }
    }
    return true;
  }
  // ── 能力 C：把 lxfd 当前对话导出到主面板 ──────────────────────────────────
  // excludeEls：这一轮临时展示、不该进历史的节点（件2代买桥接用——过渡态用户气泡/提示条
  // 只在全屏展示做视觉过渡，真正的一条由桥接后 sendChat(value) 在主面板重新生成，
  // 带过去导出会变成重复两条）。
  function lxfdExportToMain(excludeEls) {
    if (!thread || !window.__lxBridge) return;
    const skip = excludeEls && excludeEls.length ? new Set(excludeEls) : null;
    const messages = [];
    const allNodes = Array.from(thread.querySelectorAll(".lxfd-msg-user, .lxfd-msg-ai")).filter(function(el) { return !skip || !skip.has(el); });
    const lastAi = allNodes.filter(function(el) { return el.classList.contains("lxfd-msg-ai"); }).pop();
    allNodes.forEach(function(el) {
      if (el.classList.contains("lxfd-msg-user")) {
        messages.push({ role: "user", text: el.textContent.trim(), html: "" });
      } else {
        const body = el.querySelector(".lxfd-ai-body");
        let html;
        if (body) {
          // 剥掉 lxfd 专属商品区和免责；追问需要保留，并转成主对话可点击的链接样式。
          // 商品已在右侧 reco 页正常展示，左侧对话保留文字答案 + 最新追问。
          const clone = body.cloneNode(true);
          clone.querySelectorAll(".lxfd-products, .lxfd-disclaimer").forEach(function(n) { n.remove(); });
          if (el !== lastAi) clone.querySelectorAll(".lxfd-followups, .followups, .lx-p0-suggest[data-followups]").forEach(function(n) { n.remove(); });
          clone.querySelectorAll(".lxfd-followups").forEach(function(n) {
            n.classList.remove("lxfd-followups");
            n.classList.add("followups");
            n.setAttribute("data-followups", "1");
            n.querySelectorAll("button").forEach(function(btn) {
              const text = (btn.textContent || "").replace(/→\s*$/, "").trim();
              if (text) btn.setAttribute("data-quick-ask", text);
            });
          });
          html = clone.innerHTML;
        } else {
          html = el.innerHTML;
        }
        messages.push({ role: "ai", text: "", html: html });
      }
    });
    if (!messages.length) return;
    window.__lxBridge.importConversation(messages, chatState.convId, { localId: chatState.localId });
  }
  function parseJson(data) {
    try { return JSON.parse(data); } catch (_) { return {}; }
  }
  function money(value) {
    const n = Number(value || 0);
    return n ? "¥" + n.toLocaleString("zh-CN") : "咨询价";
  }
  function imgUrl(src) {
    const value = String(src || "").trim();
    if (!value) return "/assets/product-placeholder.svg";
    return value.startsWith("http") || value.startsWith("/") ? value : "/" + value;
  }
  function mdLite(text) {
    // 官方文本常自带 HTML 实体（「我的」&gt;「设置」），不先解码会被 escapeHtml 二次转义显示成字面（同主面板 mdLite）
    const src = String(text || "").replace(/<br\s*\/?>/gi, "\n").replace(/[ \t]*_\._[ \t]*/g, " ")
      .replace(/&gt;/g, ">").replace(/&lt;/g, "<").replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&nbsp;/g, " ").replace(/&amp;/g, "&");
    let html = escapeHtml(src);
    html = html.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
    html = html.replace(/(?:^|\n)####?\s*(.+)/g, "\n<h4>$1</h4>");
    html = html.replace(/(?:^|\n)-\s+(.+)/g, "\n<ul><li>$1</li></ul>");
    html = html.replace(/<\/ul>\s*<ul>/g, "");
    return html.split(/\n{2,}/).map((block) => {
      const clean = block.trim();
      if (!clean) return "";
      if (/^<(h4|ul)/.test(clean)) return clean;
      return `<p>${clean.replace(/\n/g, "<br>")}</p>`;
    }).join("");
  }
  async function readSse(response, handlers) {
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const blocks = buffer.split(/\n\n/);
      buffer = blocks.pop() || "";
      blocks.forEach((block) => {
        let event = "message";
        const data = [];
        block.split(/\n/).forEach((line) => {
          if (line.startsWith("event:")) event = line.slice(6).trim();
          if (line.startsWith("data:")) data.push(line.slice(5).trimStart());
        });
        const payload = data.join("\n");
        if (payload && handlers[event]) handlers[event](payload);
      });
    }
    if (buffer.trim()) {
      let event = "message";
      const data = [];
      buffer.split(/\n/).forEach((line) => {
        if (line.startsWith("event:")) event = line.slice(6).trim();
        if (line.startsWith("data:")) data.push(line.slice(5).trimStart());
      });
      const payload = data.join("\n");
      if (payload && handlers[event]) handlers[event](payload);
    }
  }
  function wide() { return window.innerWidth >= 1280; }
  function finishMotionClass(name, delay = 520) {
    window.setTimeout(() => document.body.classList.remove(name), reduceMotion ? 0 : delay);
  }
  function runMotionPanel(layer) {
    if (!layer) return;
    const runCssMotion = () => {
      if (forceFullscreenMotion) {
        layer.getBoundingClientRect();
        requestAnimationFrame(() => requestAnimationFrame(() => layer.classList.add("run")));
      } else {
        requestAnimationFrame(() => layer.classList.add("run"));
      }
    };
    // Windows 11 + Chromium 149 may skip the left/top/size transition when the
    // fullscreen layer is inserted and the body class changes in the same frame.
    // Drive that environment with WAAPI, while leaving the existing CSS path
    // untouched for systems where the original animation already works.
    if (!forceFullscreenMotion || typeof layer.animate !== "function") {
      runCssMotion();
      return;
    }
    const isExit = layer.classList.contains("lxfd-motion-panel-exit");
    const ease = "cubic-bezier(.22,.61,.36,1)";
    const start = layer.getBoundingClientRect();
    const toPx = (value, fallback) => {
      const n = parseFloat(String(value || ""));
      return Number.isFinite(n) ? n : fallback;
    };
    const target = isExit
      ? {
          left: toPx(layer.style.getPropertyValue("--lxfd-target-left"), start.left),
          top: toPx(layer.style.getPropertyValue("--lxfd-target-top"), start.top),
          width: toPx(layer.style.getPropertyValue("--lxfd-target-width"), start.width),
          height: toPx(layer.style.getPropertyValue("--lxfd-target-height"), start.height),
          radius: 8,
          opacity: 0,
      }
      : { left: 0, top: 0, width: window.innerWidth, height: window.innerHeight, radius: 0, opacity: 0 };
    if (isExit) {
      const scaleX = target.width > 0 && start.width > 0 ? target.width / start.width : 1;
      const scaleY = target.height > 0 && start.height > 0 ? target.height / start.height : 1;
      const moveX = target.left - start.left;
      const moveY = target.top - start.top;
      layer.style.transformOrigin = "top left";
      layer.style.backfaceVisibility = "hidden";
      layer.style.transform = "translate3d(0,0,0) scale(1,1)";
      const first = {
        transform: "translate3d(0,0,0) scale(1,1)",
        borderRadius: "0px",
        opacity: "1",
      };
      const last = {
        transform: `translate3d(${moveX}px,${moveY}px,0) scale(${scaleX},${scaleY})`,
        borderRadius: `${target.radius}px`,
        opacity: `${target.opacity}`,
      };
      const anim = layer.animate([
        first,
        { ...first, offset: 0.08 },
        { ...last, opacity: "1", offset: 0.72 },
        last
      ], { duration: 720, easing: ease, fill: "forwards" });
      anim.addEventListener("finish", () => {
        layer.style.left = `${target.left}px`;
        layer.style.top = `${target.top}px`;
        layer.style.width = `${target.width}px`;
        layer.style.height = `${target.height}px`;
        layer.style.borderRadius = `${target.radius}px`;
        layer.style.opacity = `${target.opacity}`;
        layer.style.transform = "translate3d(0,0,0) scale(1,1)";
        layer.classList.add("run");
      }, { once: true });
      return;
    }
    const first = {
      left: `${start.left}px`,
      top: `${start.top}px`,
      width: `${start.width}px`,
      height: `${start.height}px`,
      borderRadius: isExit ? "0px" : "8px",
      opacity: "1",
    };
    const hold = { ...first, offset: isExit ? 0.72 : 0.67 };
    const last = {
      left: `${target.left}px`,
      top: `${target.top}px`,
      width: `${target.width}px`,
      height: `${target.height}px`,
      borderRadius: `${target.radius}px`,
      opacity: `${target.opacity}`,
    };
    const anim = layer.animate([first, hold, last], { duration: 720, easing: ease, fill: "forwards" });
    anim.addEventListener("finish", () => {
      Object.assign(layer.style, last);
      layer.classList.add("run");
    }, { once: true });
  }
  function createPanelStretchLayer() {
    const source = document.querySelector(".assistant-panel");
    if (!source || reduceMotion) return null;
    const rect = source.getBoundingClientRect();
    if (!rect.width || !rect.height) return null;
    const layer = document.createElement("div");
    layer.className = "lxfd-motion-panel";
    layer.setAttribute("aria-hidden", "true");
    layer.style.left = `${rect.left}px`;
    layer.style.top = `${rect.top}px`;
    layer.style.width = `${rect.width}px`;
    layer.style.height = `${rect.height}px`;
    const clone = source.cloneNode(true);
    clone.classList.add("lxfd-motion-clone");
    clone.querySelectorAll("[id]").forEach((node) => node.removeAttribute("id"));
    layer.appendChild(clone);
    document.body.appendChild(layer);
    runMotionPanel(layer);
    return layer;
  }
  function getSplitPanelRect() {
    // 全屏态可能只剩 lx-auto-fs：exitFullscreen 里先跑的 focusReco→lxRevealContent 会摘掉
    // assistant-fullscreen 但留 lx-auto-fs（它单独也藏着 .shell）。只认一个类会误判"不在全屏"，
    // 不摘类就去量 → 量到 display:none 的面板 → null → 退出动画整个消失
    const wasFullscreen = document.body.classList.contains("assistant-fullscreen") || document.body.classList.contains("lx-auto-fs");
    if (wasFullscreen) setFullscreen(false);
    const source = document.querySelector(".assistant-panel");
    const rect = source?.getBoundingClientRect();
    if (wasFullscreen) setFullscreen(true);
    if (!rect || !rect.width || !rect.height) return null;
    return rect;
  }
  function createFullscreenShrinkLayer(targetRect) {
    const source = document.querySelector(".lxfd");
    if (!source || !targetRect || reduceMotion) return null;
    const layer = document.createElement("div");
    layer.className = "lxfd-motion-panel lxfd-motion-panel-exit";
    layer.setAttribute("aria-hidden", "true");
    layer.style.setProperty("--lxfd-target-left", `${targetRect.left}px`);
    layer.style.setProperty("--lxfd-target-top", `${targetRect.top}px`);
    layer.style.setProperty("--lxfd-target-width", `${targetRect.width}px`);
    layer.style.setProperty("--lxfd-target-height", `${targetRect.height}px`);
    const clone = source.cloneNode(true);
    clone.classList.add("lxfd-motion-clone");
    clone.querySelectorAll("[id]").forEach((node) => node.removeAttribute("id"));
    layer.appendChild(clone);
    document.body.appendChild(layer);
    runMotionPanel(layer);
    return layer;
  }
  function createFullscreenExitLayer() {
    const source = document.querySelector(".lxfd");
    if (!source || reduceMotion) return null;
    const layer = document.createElement("div");
    layer.className = "lxfd-motion-panel lxfd-motion-panel-exit";
    layer.setAttribute("aria-hidden", "true");
    const clone = source.cloneNode(true);
    clone.classList.add("lxfd-motion-clone");
    clone.querySelectorAll("[id]").forEach((node) => node.removeAttribute("id"));
    layer.appendChild(clone);
    document.body.appendChild(layer);
    return layer;
  }
  function setFullscreenExitLayerTarget(layer, targetRect) {
    if (!layer || !targetRect || !targetRect.width || !targetRect.height) return false;
    layer.style.setProperty("--lxfd-target-left", `${targetRect.left}px`);
    layer.style.setProperty("--lxfd-target-top", `${targetRect.top}px`);
    layer.style.setProperty("--lxfd-target-width", `${targetRect.width}px`);
    layer.style.setProperty("--lxfd-target-height", `${targetRect.height}px`);
    runMotionPanel(layer);
    return true;
  }
  function normalizeFullscreenEntryState() {
    document.documentElement.classList.remove("lx-root-lxfd-prepaint");
    document.body.classList.remove("lxfd-exiting", "lxfd-split-returning");
    if (document.body.classList.contains("lx-home-split")) {
      document.body.dataset.page = "home";
      const content = document.querySelector(".content");
      if (content) content.setAttribute("data-view", "home");
      document.body.classList.remove("lx-home-split");
    }
    stage?.classList.remove("shift");
    openRail(false);
  }
  function enterFullscreen() {
    // 动画层必须在 normalize 之前截取：normalize 会拆掉分屏布局，之后 .assistant-panel
    // 量出 0×0 → 拿不到起点 → 退化成 CSS 兜底的「从下面冒出」而不是面板拉伸过渡
    const motionLayer = createPanelStretchLayer();
    normalizeFullscreenEntryState();
    lxfdApplySite();
    // 每次展开都重新读取分屏当前会话。不能以全屏 thread 是否为空作为判断，
    // 否则 thread 中残留的旧首轮内容会阻止后续问答和推荐卡片被带入。
    if (lxfdMainMsgs(".lx-p0-messages > .lx-p0-message").length) lxfdImportFromMain();
    document.body.classList.remove("lxfd-exiting");
    document.body.classList.remove("lxfd-split-returning");
    document.body.classList.add("lxfd-entering");
    document.body.classList.add("lxfd-split-entered");
    setFullscreen(true);
    window.setTimeout(() => motionLayer?.remove(), reduceMotion ? 0 : 760);
    finishMotionClass("lxfd-entering", 760);
  }
  function exitFullscreen(afterExit, options) {
    const onAfterExit = typeof afterExit === "function" ? afterExit : null;
    const skipGenericFocus = !!(options && options.skipGenericFocus);
    if (!document.body.classList.contains("assistant-fullscreen") && !document.body.classList.contains("lx-auto-fs")) {
      onAfterExit?.();
      return;
    }
    // 有对话时回「分屏」而不是裸首页：enterFullscreen 的 normalize 把页面态抹成了 home，
    // 不对称恢复的话对话会藏在隐藏的 lxfd thread 里，用户看到 hero 首页以为对话丢了。
    // 先恢复分屏布局（复用 focusReco 配方）再量收缩动画落点，动画才有真实目标矩形。
    const hasConvo = !!(thread && thread.classList.contains("show") && thread.children.length && window.__lxBridge);
    // 带回调退出只用于“结果卡打开右侧内容”，即使历史 thread 的 show 标记在恢复时
    // 暂时缺失，也必须强制回左右框架，不能依赖 hasConvo 这一项视觉标记。
    const returnToSplit = hasConvo || !!onAfterExit;
    if (hasConvo) {
      lxfdExportToMain();
      try {
        if (skipGenericFocus) window.__lxBridge.prepareRootSplitState?.();
        else window.__lxBridge.focusReco();
      } catch {}
    }
    const targetRect = getSplitPanelRect();
    const motionLayer = createFullscreenShrinkLayer(targetRect);
    document.body.classList.remove("lxfd-entering");
    document.body.classList.add("lxfd-exiting");
    setFullscreen(false);
    try { window.__lxBridge?.exitFullscreen?.(); } catch {}
    // 全屏类清理/主应用退出钩子都可能重算页面态。必须在它们之后再次落定分屏，
    // 否则会出现既无 assistant-fullscreen、也无 lx-home-split 的半退出页面。
    if (returnToSplit) lxfdEnsureRootSplitState();
    document.body.dataset.state = hasConvo ? "chat" : "default";
    if (hasConvo && thread) thread.innerHTML = "";
    if (onAfterExit) requestAnimationFrame(() => {
      if (returnToSplit) lxfdEnsureRootSplitState();
      onAfterExit();
    });
    window.setTimeout(() => document.body.classList.add("lxfd-split-returning"), reduceMotion ? 0 : 320);
    window.setTimeout(() => {
      document.body.classList.remove("lxfd-exiting");
      document.body.classList.remove("lxfd-split-returning");
      if (returnToSplit) lxfdEnsureRootSplitState();
      lxfdAssertSplitEndState();
      motionLayer?.remove();
    }, reduceMotion ? 0 : 760);
  }
  // 结果卡需要从全屏对话直接落到“左对话 + 右结果”。
  // 这里不走通用退出动画：通用动画会在两帧之间暴露裸商城和
  // 全屏层/商城混合态。所有布局类、页面态和目标内容在同一个点击任务内提交，
  // 浏览器下一次绘制只能看到最终左右框架。
  function lxfdExitToResultAtomically(commitResult) {
    const hasConversation = !!(thread && thread.children.length && window.__lxBridge);
    if (hasConversation) lxfdExportToMain();
    document.body.classList.remove(
      "assistant-fullscreen", "lx-auto-fs", "lx-root-home", "lxfd-entering",
      "lxfd-exiting", "lxfd-split-returning"
    );
    document.querySelectorAll(".lxfd-motion-panel").forEach((node) => node.remove());
    try { window.__lxBridge?.exitFullscreen?.(); } catch {}
    lxfdEnsureRootSplitState();
    document.body.dataset.state = "chat";
    if (typeof commitResult === "function") commitResult();
    lxfdEnsureRootSplitState();
    lxfdAssertSplitEndState();
    if (hasConversation && thread) thread.innerHTML = "";
    requestAnimationFrame(() => {
      lxfdEnsureRootSplitState();
      lxfdAssertSplitEndState();
    });
  }
  // 退出动画收尾断言：分屏已成形则全屏类必须不在。防御外部"回全屏"钩子在动画窗口内
  // (补分屏类之前的一瞬守卫失效)把全屏类加回来，造成两态共存的混合花屏
  function lxfdAssertSplitEndState() {
    if (!document.body.classList.contains("lx-home-split")) return;
    window.__LXFD_FORCE = false; // 已进分屏,关掉"URL=/强制全屏"开关,否则内联force定时器会把全屏盖回来
    document.body.classList.remove("assistant-fullscreen", "lx-auto-fs", "lx-root-home");
    document.documentElement.classList.remove("lx-root-lxfd-prepaint");
    if (document.body.dataset.page === "home" || !document.body.dataset.page) document.body.dataset.page = "personal";
    // forceRootFullscreen 曾给 .lxfd 写内联 display:block/visibility:visible——内联样式压过
    // 分屏 CSS 的隐藏规则,全屏层会叠在分屏上(消息裸排+hero输入框+画廊混显)。清掉还权给 CSS
    const lxfdLayer = document.querySelector(".lxfd");
    if (lxfdLayer) { lxfdLayer.style.display = ""; lxfdLayer.style.visibility = ""; }
  }
  function exitFullscreenWithReveal(afterReveal) {
    const onAfterReveal = typeof afterReveal === "function" ? afterReveal : null;
    if (!document.body.classList.contains("assistant-fullscreen") && !document.body.classList.contains("lx-auto-fs")) {
      onAfterReveal?.();
      return;
    }
    const motionLayer = createFullscreenExitLayer();
    document.body.classList.remove("lxfd-entering");
    document.body.classList.add("lxfd-exiting");
    setFullscreen(false);
    try { window.__lxBridge?.exitFullscreen?.(); } catch {}
    document.body.dataset.state = thread?.classList.contains("show") ? "chat" : "default";
    onAfterReveal?.();
    requestAnimationFrame(() => {
      const rect = document.querySelector(".assistant-panel")?.getBoundingClientRect();
      if (!setFullscreenExitLayerTarget(motionLayer, rect)) motionLayer?.remove();
    });
    window.setTimeout(() => document.body.classList.add("lxfd-split-returning"), reduceMotion ? 0 : 320);
    window.setTimeout(() => {
      document.body.classList.remove("lxfd-exiting");
      document.body.classList.remove("lxfd-split-returning");
      lxfdAssertSplitEndState();
      motionLayer?.remove();
    }, reduceMotion ? 0 : 760);
  }
  window.__lxfdExitWithReveal = exitFullscreenWithReveal;
  function setFullscreen(on) {
    document.body.classList.toggle("assistant-fullscreen", !!on);
    document.body.classList.toggle("lx-auto-fs", !!on);
    if (!on) document.body.classList.remove("lxfd-split-entered");
    if (on) document.body.dataset.state = "chat";
    if (on) {
      const currentTitle = convoName?.textContent?.trim();
      if (convoName && !currentTitle) {
        const splitTitle = document.querySelector(".main-nav")?.getAttribute("data-current-label")?.trim();
        const lastMainUser = lxfdMainMsgs(".lx-p0-messages > .lx-p0-message.user").pop()?.textContent?.trim();
        const fallbackTitle = splitTitle || (lastMainUser ? shortText(lastMainUser, 15) : "新对话");
        convoName.textContent = fallbackTitle;
        convoName.title = fallbackTitle;
      }
      const hasThread = !!(thread && (thread.classList.contains("show") || thread.children.length));
      if (hasThread || chatState.started) {
        if (welcome) welcome.style.display = "none";
        if (thread) thread.classList.add("show");
        if (quick) quick.style.display = "none";
        lxfdSetGalleryChatting(true);
      }
      requestAnimationFrame(() => { syncRailForViewport(); fit(); syncSend(); ta?.focus(); });
    }
  }
  function setNav(open) {
    navCluster?.classList.toggle("open", open);
    convoPill?.setAttribute("aria-expanded", open ? "true" : "false");
  }
  function syncRailNewFabVisibility() {
    const chatting = !!stage?.classList.contains("is-chatting");
    const railOpen = !!rail?.classList.contains("open");
    document.body.classList.toggle("lxfd-chatting", chatting);
    railNewFab?.classList.toggle("hide", railOpen || !chatting);
  }
  function openRail(open) {
    rail?.classList.toggle("open", open);
    railFab?.classList.toggle("hide", open);
    syncRailNewFabVisibility();
    stage?.classList.toggle("shift", open && wide());
    scrim?.classList.remove("show");
    // 侧栏一露出就重读 localStorage 重渲染——store 是主面板(app.js lxArchiveCurrentConversation)
    // 和本文件(lxfdPersistCurrent)共用的同一个 key，但 #lxfdHist 只在启动时渲染过一次；
    // 主面板那边新归档的对话（含多步 agent 卡）不会自动反映到这里，用户点开旧快照里的
    // 条目会踩到过期/不完整数据，恢复出来就只剩用户那句话。开一次刷一次，零额外触发面。
    if (open) lxfdRenderHist();
  }
  function setRailManual(open) {
    railManuallyCollapsed = !open;
    document.body.classList.toggle("lxfd-rail-user-open", !!open);
    openRail(open);
  }
  function syncRailForViewport() {
    openRail(wide() && !railManuallyCollapsed);
  }
  function fit() {
    if (!ta) return;
    ta.style.height = "auto";
    ta.style.height = Math.min(ta.scrollHeight, 148) + "px";
  }
  function syncSend() {
    const empty = !ta?.value.trim();
    send?.classList.toggle("idle", empty);
    if (send) send.disabled = empty;
  }
  function setRotatingTitle(word) { if (helloTitle) helloTitle.innerHTML = `<span>联想乐享帮你</span><span class="rotating-word">${escapeHtml(word)}</span>`; }
  async function rotateTitleWordForWindows(word) {
    if (helloAnimating || !word || typeof word.animate !== "function") return;
    helloAnimating = true;
    const ease = "cubic-bezier(.16,.72,.22,1)";
    try {
      // 位移用 top（布局属性，主线程绘制）不用 transform/blur/will-change——那些会把词提成
      // 合成层，配合父级 background-clip:text 渐变字在 Chrome 留旧帧残影（真机两轮反馈）；
      // top 动画不产生层缓存，动效在、残影无。word 的 position:relative 由 CSS 提供。
      await word.animate([
        { opacity: 1, top: "0px" },
        { opacity: 0, top: "-6px" }
      ], { duration: 300, easing: ease, fill: "forwards" }).finished;
      helloIndex = (helloIndex + 1) % helloWords.length;
      word.textContent = helloWords[helloIndex];
      await word.animate([
        { opacity: 0, top: "6px" },
        { opacity: 1, top: "0px" }
      ], { duration: 320, easing: ease, fill: "forwards" }).finished;
      word.style.opacity = "";
      word.style.transform = "";
      word.style.filter = "";
      word.style.willChange = "";
    } catch (_) {
      word.style.opacity = "";
      word.style.transform = "";
      word.style.filter = "";
      word.style.willChange = "";
    } finally {
      helloAnimating = false;
    }
  }
  function rotateTitleWord() {
    if (!helloTitle || welcome.style.display === "none") return;
    const word = helloTitle.querySelector(".rotating-word");
    if (!word) { setRotatingTitle(helloWords[helloIndex]); return; }
    if (forceFullscreenMotion && typeof word.animate === "function") {
      rotateTitleWordForWindows(word);
      return;
    }
    word.classList.add("out");
    window.setTimeout(() => {
      helloIndex = (helloIndex + 1) % helloWords.length;
      word.textContent = helloWords[helloIndex];
      word.classList.remove("out");
      word.classList.add("in");
      requestAnimationFrame(() => word.classList.remove("in"));
    }, reduceMotion ? 0 : 300);
  }
  function startRotatingTitle() {
    setRotatingTitle(helloWords[helloIndex]);
    if (reduceMotion) return;
    if (helloTimer) window.clearTimeout(helloTimer);
    if (!forceFullscreenMotion) {
      helloTimer = window.setInterval(rotateTitleWord, 2000);
      return;
    }
    const tick = () => {
      rotateTitleWord();
      helloTimer = window.setTimeout(tick, 2000);
    };
    helloTimer = window.setTimeout(tick, 2000);
  }
  function renderTurnIndex(activeId) {
    turnIndex?.classList.toggle("show", turns.length > 0);
    if (turnDots) turnDots.innerHTML = turns.map(t => `<i class="${t.id === activeId ? "active" : ""}"></i>`).join("");
    if (turnList) turnList.innerHTML = turns.map(t => `<button type="button" class="${t.id === activeId ? "active" : ""}" data-target="${escapeAttr(t.id)}" title="${escapeAttr(t.text)}">${escapeHtml(shortText(t.text, 18))}</button>`).join("");
  }
  function lxfdEnterHuman() {
    chatState.human = true;
    if (thread) {
      thread.insertAdjacentHTML("beforeend", '<div class="lxfd-msg-ai"><div class="lxfd-ai-body"><b>专属客服小联</b> 已为您接入人工服务，下方已切换为客服快捷入口。订单、售后、发票问题可直接发我。（演示：由乐享 AI 以专属客服身份接待）</div></div>');
      thread.scrollTop = thread.scrollHeight;
    }
    if (quick) { quick.innerHTML = ["退出人工", "我的订单", "售后服务", "评价服务", "需求清单"].map(t => '<button type="button">' + escapeHtml(t) + '</button>').join(""); quick.style.display = ""; }
    if (ta) { if (!ta.dataset.origPh) ta.dataset.origPh = ta.placeholder; ta.placeholder = "向专属客服小联提问..."; }
  }

  function lxfdExitHuman() {
    chatState.human = false;
    if (thread) {
      thread.insertAdjacentHTML("beforeend", '<div class="lxfd-msg-ai"><div class="lxfd-ai-body">已退出人工服务，继续由联想乐享 AI 为您服务。</div></div>');
      thread.scrollTop = thread.scrollHeight;
    }
    lxfdApplySite();
    // 退出客服后若仍在聊天态则继续隐藏 actionbar
    if (chatState.started && quick) quick.style.display = "none";
    if (ta && ta.dataset.origPh) ta.placeholder = ta.dataset.origPh;
  }

  function lxfdSetGalleryChatting(on) {
    stage?.classList.toggle("is-chatting", !!on);
    syncRailNewFabVisibility();
  }

  function resetConversation(collapseRail) {
    lxfdPersistCurrent();
    // 先归档旧会话，再锁定当前会话为空；刷新/卸载期间不得由旧 DOM 回写。
    try {
      localStorage.setItem("lexiang.newChatEmpty.v1", "1");
      localStorage.removeItem("lexiang.conversation.v1");
    } catch (_e) {}
    chatState.conversationNonce += 1;
    chatState.convId = null;
    chatState.localId = null;
    chatState.sending = false;
    chatState.human = false;
    chatState.started = false; // 新建对话回到欢迎态，恢复 actionbar
    // 当前会话已重置，避免顶部标题从上一轮共享缓存中恢复。
    try { localStorage.removeItem("lexiang.conversation.v1"); } catch (_e) {}
    if (thread) { thread.innerHTML = ""; thread.classList.remove("show"); }
    turns = [];
    renderTurnIndex("");
    if (welcome) welcome.style.display = "flex";
    // 根路径新建对话=回到初始首页态：把 prepaint 标记类加回来（分屏桥接时被摘掉），
    // 否则整套「空白态」规则失效——topbar 露出、左侧 fab 复现、右上冒出「收起」按钮（真机反馈）
    const logicalPath = String(window.__LX_TEMPLATE_PATH || location.pathname || "/").replace(/\/+$/, "") || "/";
    if (logicalPath === "/") {
      document.documentElement.classList.add("lx-root-lxfd-prepaint");
      document.body.classList.remove("lx-home-split", "lxfd-split-entered", "assistant-fullscreen", "lx-auto-fs");
      window.__LXFD_FORCE = true;
    }
    lxfdSetGalleryChatting(false);
    if (convoName) { convoName.textContent = "新对话"; convoName.title = "新对话"; }
    if (window.__lxSyncTopNavTitle) window.__lxSyncTopNavTitle();
    if (ta) { if (ta.dataset.origPh) ta.placeholder = ta.dataset.origPh; ta.value = ""; fit(); syncSend(); }
    // 从历史侧栏点击“新建对话”后，无论当前 PC 视口宽度，都收起历史目录；
    // 同步写入手动收起状态，避免随后的 resize / viewport 同步再次自动展开。
    if (collapseRail) setRailManual(false);
    // 恢复 actionbar（lxfdApplySite 会重渲内容）
    if (quick) { quick.style.display = ""; lxfdApplySite(); }
    ta?.focus();
    lxfdRenderHist();
  }
  function renderLxfdProducts(products) {
    if (!Array.isArray(products) || !products.length) return "";
    const first = products[0] || {};
    const recoId = "lxfd-reco-" + Date.now() + "-" + Math.random().toString(36).slice(2);
    window.__lxRecoPayloads = window.__lxRecoPayloads || {};
    window.__lxRecoPayloads[recoId] = products;
    // 同步持久化（与主面板 lxReadRecoPayload 同一 key）：桥接导出的历史恢复后 CTA 仍可取回商品
    try {
      const key = "lexiang.recoPayloads.v1";
      const store = JSON.parse(localStorage.getItem(key) || "[]");
      store.push({ id: recoId, products: products.slice(0, 8).map((p) => ({ sku: p.sku, name: p.name, price: p.price, image_url: p.image_url || p.image, specs: p.specs, description: (p.description || "").slice(0, 400) })) });
      localStorage.setItem(key, JSON.stringify(store.slice(-8)));
    } catch (_e) {}
    const desc = products.length === 1
      ? `${escapeHtml(first.name || "按你的需求筛选出的商品")}${first.price ? ` · ${money(first.price)}` : ""}`
      : `已为你筛选 ${products.length} 款候选商品`;
    return `<button class="answer-cta lx-answer-reco" type="button" data-lxfd-reveal-products="1" data-lxfd-reco-id="${escapeHtml(recoId)}">
      <span class="answer-cta-copy">
        <span class="answer-cta-title">查看推荐商品</span>
        <span class="answer-cta-desc">${desc}</span>
      </span>
      <span class="answer-cta-icon" aria-hidden="true">
        ${window.__lxApprovedIcon("global-next")}
      </span>
    </button>`;
  }

  function lxfdPageCtaMeta(op) {
    const key = String(op || "");
    const map = {
      edu: { feature: "edu", title: "查看教育特惠专区", desc: "已为你打开认证权益和专享商品" },
      open_edu_zone: { feature: "edu", title: "查看教育特惠专区", desc: "已为你打开认证权益和专享商品" },
      solution: { feature: "solution", title: "查看全集解决方案", desc: "覆盖教育、医疗、政府、制造、金融、能源、交通、服务" },
      open_solution: { feature: "solution", title: "查看全集解决方案", desc: "覆盖教育、医疗、政府、制造、金融、能源、交通、服务" },
      stores: { feature: "stores", title: "查看附近门店", desc: "已为你打开门店查询页面" },
      open_stores: { feature: "stores", title: "查看附近门店", desc: "已为你打开门店查询页面" },
      member: { feature: "member", title: "查看会员中心", desc: "已为你打开会员权益与资产" },
      open_member: { feature: "member", title: "查看会员中心", desc: "已为你打开会员权益与资产" },
      coupon: { feature: "coupon", title: "查看优惠与活动", desc: "已在右侧打开可领取权益" },
      open_coupon: { feature: "coupon", title: "查看优惠与活动", desc: "已在右侧打开可领取权益" },
      cart: { feature: "cart", title: "查看购物车", desc: "已为你打开购物车" },
      open_cart: { feature: "cart", title: "查看购物车", desc: "已为你打开购物车" },
      orders: { feature: "orders", title: "查看我的订单", desc: "已为你打开订单页面" },
      open_orders: { feature: "orders", title: "查看我的订单", desc: "已为你打开订单页面" },
      open_documents: { feature: "documents", title: "查看文档解读", desc: "已为你打开资料中心与文档列表" }
    };
    return map[key] || null;
  }

  function renderLxfdPageCta(meta) {
    if (!meta) return "";
    return `<button class="answer-cta lx-answer-page" type="button" data-lx-focus-active="1" data-lxfd-open-feature="${escapeHtml(meta.feature || "")}" aria-label="${escapeAttr(meta.title || "查看页面")}，展开左右框架" title="展开左右框架">
      <span class="answer-cta-copy">
        <span class="answer-cta-title">${escapeHtml(meta.title || "查看页面")}</span>
        <span class="answer-cta-desc">${escapeHtml(meta.desc || "已在右侧为你打开相关内容")}</span>
      </span>
      <span class="answer-cta-icon" aria-hidden="true">
        ${window.__lxApprovedIcon("global-next")}
      </span>
    </button>`;
  }

  function renderLxfdLeadCta() {
    return '<div class="lx-p0-actions answer-actions"><button class="lx-p0-btn primary" type="button" data-floor-action="lead">提交项目需求</button></div>';
  }

  // 只看 page==="home" 会漏：上一轮分屏残留 page="personal" 时再进全屏、退出走到这里，
  // 分屏类没补上 → 无全屏类也无分屏类的中间态（topbar 露出、lxfd 消息裸奔黑三角，或者背景
  // 停在首页欢迎态门户，聊天消息虽已在DOM里但不可见——件2代买桥接真机截图就踩到了这个）。
  // 无论根首页还是四个频道，从全屏卡片收起前都必须先恢复左右结构。
  // 旧逻辑只处理 URL=/：当目标 Tab 已被关闭或缓存中尚未登记时，卡片会走
  // lxfdRevealFeature 兜底；子频道因没有补分屏类，最终只剩右侧独立页面。
  function lxfdEnsureRootSplitState() {
    // 这是“最终态提交”而不是仅缺类时补一次。全屏进入/首页守卫可能在动画窗口内
    // 写回 lx-root-home 或移除 split；每次调用都重放主应用唯一的分屏归一化函数。
    if (typeof window.__lxBridge?.prepareRootSplitState === "function") {
      window.__lxBridge.prepareRootSplitState();
    } else if (!document.body.classList.contains("lx-home-split")) {
        document.documentElement.classList.remove("lx-root-lxfd-prepaint");
        document.body.classList.remove("assistant-fullscreen", "lx-auto-fs", "lxfd-entering", "lx-root-home");
        document.body.classList.add("lx-home-split", "lxfd-split-entered");
        document.body.dataset.page = "personal";
        document.body.dataset.state = "chat";
        window.__LXFD_FORCE = false;
        const _lxfdLayer = document.querySelector(".lxfd");
        if (_lxfdLayer) { _lxfdLayer.style.display = ""; _lxfdLayer.style.visibility = ""; }
    }
  }

  // 全屏消息会先导回主面板。结果卡收起后优先点击导回的同一张卡，
  // 让主面板唯一的结果路由器负责 Tab 激活、关闭后重建和内容恢复。
  function lxfdReplayImportedResultCard(target) {
    const cards = Array.from(document.querySelectorAll(".lx-p0-messages .answer-cta"));
    const hit = cards.slice().reverse().find((card) => {
      if (target.resultId && card.getAttribute("data-lx-result-id") === target.resultId) return true;
      if (target.boundTabId && card.getAttribute("data-lx-open-tab") === target.boundTabId) return true;
      if (target.solutionTitle && card.getAttribute("data-specific-solution-cta") === target.solutionTitle) return true;
      if (target.recoId && card.getAttribute("data-lxfd-reco-id") === target.recoId) return true;
      if (target.openProduct && card.getAttribute("data-open-product") === target.openProduct) return true;
      return !!target.feature && card.getAttribute("data-lxfd-open-feature") === target.feature;
    });
    if (!hit) return false;
    hit.click();
    return true;
  }

  function lxfdRevealFeature(feature) {
    lxfdEnsureRootSplitState();
    if (typeof window.__lxOpenFeature === "function") window.__lxOpenFeature(feature);
  }

  function lxfdOpenFeatureInSplit(feature) {
    const inFullscreen = document.body.classList.contains("assistant-fullscreen") || document.body.classList.contains("lx-auto-fs");
    if (!inFullscreen) {
      lxfdRevealFeature(feature);
      return;
    }
    lxfdExportToMain();
    exitFullscreen(() => {
      lxfdRevealFeature(feature);
      if (thread) thread.innerHTML = "";
    });
  }

  async function lxfdRunHomeCommerceEntry(kind) {
    const logicalPath = String(window.__LX_TEMPLATE_PATH || location.pathname || "/").replace(/\/+$/, "") || "/";
    // 这条“全屏生成 → 结果卡 → 左右结构”链路只属于根首页。
    // 子频道即使误调用，也立即回退到其原有商务入口，不改变频道交互。
    if (logicalPath !== "/") {
      return window.lxOpenCommerceEntry?.(kind, { sendQuery: true });
    }
    if (chatState.sending) return;

    const isOrders = kind === "orders";
    const query = isOrders ? "查看我的订单" : "查看我的购物车";
    const feature = isOrders ? "orders" : "cart";
    const reply = isOrders
      ? "已为你整理近期**订单状态**、商品与服务信息，可继续查看物流、详情及售后入口。"
      : "已为你整理**购物车商品**、优惠与结算信息，可继续核对选中商品并完成结算。";
    const meta = lxfdPageCtaMeta(isOrders ? "open_orders" : "open_cart");

    chatState.sending = true;
    chatState.started = true;
    setFullscreen(true);
    lxfdSetGalleryChatting(true);
    if (welcome) welcome.style.display = "none";
    if (quick) quick.style.display = "none";
    thread?.classList.add("show");

    const turnId = `turn-home-${feature}-${Date.now()}`;
    const user = document.createElement("div");
    user.className = "lxfd-msg-user";
    user.id = turnId;
    user.textContent = query;
    thread?.appendChild(user);
    turns.push({ id: turnId, text: query });
    renderTurnIndex(turnId);

    const ai = document.createElement("div");
    ai.className = "lxfd-msg-ai";
    ai.innerHTML = '<div class="lxfd-ai-body"></div>';
    thread?.appendChild(ai);
    ai.scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth", block: "end" });

    try {
      // 严格串行：正文逐字完成后才挂结果卡；结果卡完成布局后才退出全屏并创建右页。
      await lxfdAnimateFinal(ai, reply);
      const body = ai.querySelector(".lxfd-ai-body");
      if (body && meta) body.insertAdjacentHTML("beforeend", renderLxfdPageCta(meta));
      await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
      lxfdPersistCurrent();
      lxfdExportToMain();
      await lxfdWait(reduceMotion ? 0 : 560);
      exitFullscreenWithReveal(() => lxfdRevealFeature(feature));
    } finally {
      chatState.sending = false;
    }
  }
  window.__lxfdRunHomeCommerceEntry = lxfdRunHomeCommerceEntry;

  function appendLxfdSuggestions(ai, suggestions) {
    const list = Array.isArray(suggestions) ? suggestions.slice(0, 3) : [];
    if (!list.length) return;
    thread?.querySelectorAll(".lxfd-followups, .followups, .lx-p0-suggest[data-followups]").forEach((el) => {
      if (!ai.contains(el)) el.remove();
    });
    ai.querySelectorAll(".lxfd-followups, .followups, .lx-p0-suggest[data-followups]").forEach((el) => el.remove());
    const host = ai.querySelector(".lxfd-ai-body") || ai;
    host.insertAdjacentHTML("beforeend", `<div class="lxfd-followups">${list.map((sug) => `<button type="button">${escapeHtml(sug)}</button>`).join("")}</div>`);
    // 件2 F1：追问chip常在答案打字动画收尾之后才异步插入，插入前 thread 已经滚到"答案末尾"，
    // 新增内容会落在可视区之下点不到——插入后补一次滚底（对称主面板的 lxAppendAiHtml 滚动逻辑）
    if (thread) thread.scrollTop = thread.scrollHeight;
  }

  function lxfdClaimTicketSvg() {
    return '<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M3 8a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2 2 2 0 0 0 0 4 2 2 0 0 1 0 4 2 2 0 0 1-2 2H5a2 2 0 0 1-2-2 2 2 0 0 0 0-4 2 2 0 0 0 0-4Z" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/><path d="M15 6v12" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" stroke-dasharray="2 2"/></svg>';
  }

  function lxfdClaimCheckSvg(width) {
    return window.__lxApprovedIcon("global-check", width ? "ck" : "");
  }

  function lxfdClaimInfoFromCard(card) {
    const productName = (card && card.dataset && card.dataset.claimProduct) || (card && card.querySelector(".t2") && card.querySelector(".t2").textContent.trim()) || "商品";
    const chips = Array.prototype.slice.call(card ? card.querySelectorAll(".chip") : []);
    const claimed = chips.map(function(chip) {
      const amount = Number((chip.dataset && chip.dataset.claimAmount) || String((chip.querySelector(".cv") || {}).textContent || "").replace(/[^0-9.]/g, "")) || 0;
      const label = (chip.dataset && chip.dataset.claimName) || String(chip.textContent || "").replace(/¥\s?[\d,]+(?:\.\d+)?/g, "").trim() || "优惠券";
      return { label: label, amount: amount };
    });
    const domTotal = String((card && card.querySelector(".done-amt") || {}).textContent || "").replace(/[^0-9.]/g, "");
    const totalSaved = Number((card && card.dataset && card.dataset.claimTotal) || domTotal) || claimed.reduce(function(sum, item) { return sum + Math.abs(Number(item.amount || 0)); }, 0);
    return { productName: productName, claimed: claimed, totalSaved: totalSaved };
  }

  function lxfdRenderClaimedStaticCard(info) {
    const offers = Array.isArray(info.claimed) ? info.claimed : [];
    const chips = offers.map(function(coupon) {
      const amount = Math.abs(Number(coupon.amount || 0));
      return '<span class="chip">' + lxfdClaimCheckSvg("3.2") + escapeHtml(coupon.label || "优惠券") + ' <span class="cv">¥' + amount.toLocaleString("zh-CN") + '</span></span>';
    }).join("");
    return '<div class="gc lx-claimed-skin" data-v="I" aria-disabled="true">'
      + '<div class="irow"><span class="ic">' + lxfdClaimTicketSvg() + '</span>'
      + '<span class="mid"><div class="t1">已领取 ' + offers.length + ' 项优惠 <span class="doneflag df">' + lxfdClaimCheckSvg("2.6") + '已领取</span></div>'
      + '<div class="t2">' + escapeHtml(info.productName || "商品") + ' · 已收进卡包</div></span>'
      + '<span class="sa">已省 ¥' + Math.abs(Number(info.totalSaved || 0)).toLocaleString("zh-CN") + '</span></div>'
      + '<div class="chips">' + chips + '</div></div>';
  }

  function lxfdArchiveClaimProgressCards(root) {
    (root || document).querySelectorAll('.cl[data-v="D"].lx-claim-skin').forEach(function(card) {
      card.outerHTML = lxfdRenderClaimedStaticCard(lxfdClaimInfoFromCard(card));
    });
  }

  function lxfdTypeNodes(sourceParent, targetParent, speed, done) {
    const cursor = document.createElement("span");
    cursor.className = "typing-cursor";
    const scroll = () => { if (thread) thread.scrollTop = thread.scrollHeight; };
    const moveCursor = (parent) => { cursor.remove(); parent.appendChild(cursor); scroll(); };
    const typeTextNode = (text, parent, next) => {
      const textNode = document.createTextNode("");
      let index = 0;
      parent.appendChild(textNode);
      moveCursor(parent);
      const tick = () => {
        textNode.nodeValue = String(text).slice(0, index);
        index += 1;
        if (index <= String(text).length) window.setTimeout(tick, speed);
        else next();
      };
      tick();
    };
    const typeChildList = (children, parent, next) => {
      let index = 0;
      const step = () => {
        if (index >= children.length) { next(); return; }
        typeNode(children[index], parent, () => { index += 1; step(); });
      };
      step();
    };
    const typeNode = (node, parent, next) => {
      if (node.nodeType === Node.TEXT_NODE) {
        if (!node.nodeValue) { next(); return; }
        typeTextNode(node.nodeValue, parent, next);
        return;
      }
      if (node.nodeType !== Node.ELEMENT_NODE) { next(); return; }
      const clone = node.cloneNode(false);
      parent.appendChild(clone);
      moveCursor(clone);
      typeChildList(Array.from(node.childNodes), clone, next);
    };
    targetParent.innerHTML = "";
    typeChildList(Array.from(sourceParent.childNodes), targetParent, () => {
      cursor.remove();
      scroll();
      if (done) done();
    });
  }

  // 生成阶段实时刷新时间线（件2，同 app.js lxRenderTraceLive 逻辑）：此时 .lxfd-ai-body
  // 里只有这一个结构，全量重绘最简单；lxfdAnimateFinal 收尾时会把 ai-body 整体替换掉，
  // 折叠态 HTML 随 finalHtml 一起进去，不依赖这里的实时 DOM。
  function lxfdRenderTraceLive(ai) {
    const body = ai && ai.querySelector && ai.querySelector(".lxfd-ai-body");
    const renderTrace = window.__lxBridge && window.__lxBridge.renderSkillTrace;
    if (!body || !renderTrace) return;
    body.innerHTML = renderTrace(ai._traceLines, { collapsed: ai._traceCollapsed, foldable: ai._traceCollapsed, skillCount: ai._traceSkills ? ai._traceSkills.size : 0 });
    if (thread) thread.scrollTop = thread.scrollHeight;
  }

  function lxfdAnimateFinal(ai, rawText) {
    const body = ai?.querySelector(".lxfd-ai-body");
    if (!body) return Promise.resolve();
    // 收尾把时间线折叠态 HTML 拼进最终正文——本函数会整体替换 ai-body，生成阶段的实时 DOM
    // 保不住，得随最终 html 一起进去才能存档/恢复时保持折叠（同 app.js sendChat done 收尾）。
    const renderTrace = window.__lxBridge && window.__lxBridge.renderSkillTrace;
    const traceHtml = (ai && ai._traceLines && ai._traceLines.length && renderTrace)
      ? renderTrace(ai._traceLines, { collapsed: true, foldable: true, skillCount: ai._traceSkills ? ai._traceSkills.size : 0 })
      : "";
    const html = traceHtml + mdLite(String(rawText || "").trim() || "我先为你整理好了相关内容。");
    ai.classList.add("lx-chat-skin");
    if (window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      body.innerHTML = html;
      return Promise.resolve();
    }
    const loadingStarted = ai._loadingStarted || Date.now();
    if (!body.querySelector(".loading-line")) {
      body.innerHTML = '<div class="loading-line lx-generating" role="status" aria-live="polite"><span class="typing-text">联想乐享正在生成中...</span><span class="typing-cursor"></span></div>';
    } else {
      const typing = body.querySelector(".loading-line .typing-text");
      if (typing) typing.textContent = "联想乐享正在生成中...";
    }
    return new Promise((resolve) => {
      const waitTime = Math.max(0, 5000 - (Date.now() - loadingStarted));
      window.setTimeout(() => {
        const source = document.createElement("div");
        source.innerHTML = html;
        lxfdTypeNodes(source, body, 18, () => {
          window.setTimeout(() => {
            body.innerHTML = html;
            if (thread) thread.scrollTop = thread.scrollHeight;
            resolve();
          }, 140);
        });
      }, waitTime);
    });
  }

  function lxfdFetchFollowups(question, answer) {
    const q = String(question || "").trim();
    const a = String(answer || "").trim().slice(0, 300);
    if (!q || !a) return Promise.resolve([]);
    const controller = new AbortController();
    const timer = window.setTimeout(() => controller.abort(), 2200);
    return fetch("/api/leai/followups", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ q, a }),
      signal: controller.signal
    }).then((r) => r.json()).then((d) => {
      window.clearTimeout(timer);
      return Array.isArray(d && d.questions) ? d.questions.filter(Boolean).slice(0, 3) : [];
    }).catch(() => {
      window.clearTimeout(timer);
      return [];
    });
  }

  // 答后「猜你想干」动作 chips：生成器收口 app-intent.actionChips（主/全屏共用一份，
  // 生成的句子被本地正则秒接闭环）；lxfdFill3 保证无论 LLM 追问成败都凑满 3 个（静态兜底）
  function lxfdActionChips(products) {
    return (window.__lxIntent && window.__lxIntent.actionChips) ? window.__lxIntent.actionChips(products) : [];
  }
  function lxfdFill3(arr) {
    const fb = (window.__lxIntent && window.__lxIntent.FOLLOWUP_FALLBACKS) || [];
    const out = [];
    (arr || []).concat(fb).forEach((x) => { if (x && out.indexOf(x) < 0 && out.length < 3) out.push(x); });
    return out;
  }

  const lxfdWait = (ms) => new Promise((resolve) => window.setTimeout(resolve, ms));
  const lxfdIsDocumentInsight = (text) => /(文档解读|解读.*文档|分析.*(?:文档|文件|PDF)|提炼.*(?:文档|文件)|核心结论.*关键数据)/i.test(String(text || ""));

  async function lxfdRunDocumentInsight() {
    const renderTrace = window.__lxBridge && window.__lxBridge.renderSkillTrace;
    const ai = document.createElement("div");
    ai.className = "lxfd-msg-ai lx-chat-skin";
    ai._traceLines = [];
    ai._traceSkills = new Set(["Skill(文档解读)"]);
    ai.innerHTML = '<div class="lxfd-ai-body"><div class="loading-line lx-generating" role="status" aria-live="polite"><span class="typing-text">联想乐享正在分析文档并生成解读...</span><span class="typing-cursor"></span></div></div>';
    thread?.appendChild(ai);
    chatState.sending = true;

    const body = ai.querySelector(".lxfd-ai-body");
    let showGenerating = true;
    const paintTrace = () => {
      if (!body) return;
      const trace = renderTrace
        ? renderTrace(ai._traceLines, { collapsed: false, foldable: false, skillCount: ai._traceSkills.size })
        : ai._traceLines.map((line) => `<div>${escapeHtml(line)}</div>`).join("");
      const generating = showGenerating
        ? '<div class="loading-line lx-generating" role="status" aria-live="polite"><span class="typing-text">联想乐享正在分析文档并生成解读...</span><span class="typing-cursor"></span></div>'
        : "";
      body.innerHTML = trace + generating;
      thread.scrollTop = thread.scrollHeight;
    };
    const pushTrace = async (line, delay, hideGenerating) => {
      await lxfdWait(reduceMotion ? 0 : delay);
      if (hideGenerating) showGenerating = false;
      ai._traceLines.push(line);
      paintTrace();
    };

    thread.scrollTop = thread.scrollHeight;
    await pushTrace("联想乐享正在判断", 1240, true);
    await pushTrace("已判断：文档解读任务", 840);
    await pushTrace("联想乐享官方 SKILL：正在调用 Skill(文档解读)", 1040);
    await pushTrace("正在读取文档结构与正文", 1240);

    const traceHtml = renderTrace
      ? renderTrace(ai._traceLines.concat(["已完成文档内容提取"]), { collapsed: true, foldable: true, skillCount: ai._traceSkills.size })
      : "";
    body.innerHTML = traceHtml;
    thread.scrollTop = thread.scrollHeight;
    await lxfdWait(reduceMotion ? 0 : 3000);

    const answerHtml = '<p>我已读取文档内容，下面是重点解读。</p>'
      + '<h4>核心结论</h4><ul><li>文档围绕当前业务目标、实施路径与结果要求展开，主线清晰。</li><li>重点任务已拆分为可执行阶段，需继续确认责任人、时间节点和验收口径。</li></ul>'
      + '<h4>关键信息</h4><ul><li><strong>目标：</strong>统一信息口径，提升执行与协作效率。</li><li><strong>路径：</strong>按“准备—执行—验收—复盘”分阶段推进。</li><li><strong>交付：</strong>关键数据、任务清单与结果说明需保持可追溯。</li></ul>'
      + '<h4>待确认项</h4><ul><li>部分时间节点和负责人尚未明确，建议在正式执行前补齐。</li><li>涉及外部数据或政策的内容，建议再核对最新来源。</li></ul>';
    const extrasHtml = renderLxfdPageCta(lxfdPageCtaMeta("open_documents"))
      + '<div class="lxfd-followups"><button type="button">继续提取文档中的关键数据</button><button type="button">按章节生成详细摘要</button><button type="button">整理成可执行任务清单</button></div>';
    body.innerHTML = traceHtml;
    const answerSource = document.createElement("div");
    answerSource.innerHTML = answerHtml;
    const answerHost = document.createElement("div");
    answerHost.className = "lxfd-ai-text";
    body.appendChild(answerHost);
    if (reduceMotion) {
      answerHost.innerHTML = answerHtml;
    } else {
      await new Promise((resolve) => lxfdTypeNodes(answerSource, answerHost, 18, resolve));
    }
    answerHost.insertAdjacentHTML("afterend", extrasHtml);
    chatState.sending = false;
    thread.scrollTop = thread.scrollHeight;
    lxfdPersistCurrent();
    lxfdRenderHist();
    window.setTimeout(() => lxfdOpenFeatureInSplit("documents"), reduceMotion ? 0 : 600);
  }


  async function submit(text) {
    const value = String(text || "").trim();
    if (!value || chatState.sending) return;
    // 用户真正发出下一条消息后，新会话成立，恢复正常持久化。
    try { localStorage.removeItem("lexiang.newChatEmpty.v1"); } catch (_e) {}
    // 发送问题时强制收起顶部灵动岛，保持与首页项目一致的紧凑标题态：
    // 「首页：当前问题 + 下拉箭头」。避免用户刚操作过导航时把整排频道带进对话态。
    setNav(false);
    convoPill?.blur();
    // 本轮桥接状态（全屏→分屏）
    let turnProducts = null;
    let turnTitle = "";
    let turnGrouped = false;
    let turnActions = []; // 本轮意图操作（action 事件带来的 op）——多意图一轮可能来多个（门店+优惠+会员），全记录，桥接后全开
    let pendingExtras = "";
    let pendingFollowups = [];
    let finalized = false;
    let finalizePromise = null;
    lxfdArchiveClaimProgressCards(thread);
    try { window.__lxHideSuggest && window.__lxHideSuggest(); } catch (_e) {} // 发送即收起输入联想浮层（程序性清空不触发 input，不收会残留）
    thread?.querySelectorAll(".lxfd-followups, .followups, .lx-p0-suggest[data-followups]").forEach((el) => el.remove());
    // 开始聊天后隐藏 actionbar（对齐官方；客服模式下 enterHuman 会恢复）
    if (!chatState.started && !chatState.human) {
      chatState.started = true;
      if (quick) quick.style.display = "none";
    }
    setFullscreen(true);
    lxfdSetGalleryChatting(true);
    if (welcome) welcome.style.display = "none";
    thread?.classList.add("show");
    if (convoName) { convoName.textContent = shortText(value, 15); convoName.title = value; }
    // 全屏欢迎态首问=新对话：thread 还没有任何消息（非历史恢复/非分屏回流）说明用户从初始
    // 首页重新开聊，清掉主面板 boot 时 restore 的旧对话上下文，首问不背"以上为历史对话"的
    // 旧账（真机反馈）；旧对话在侧栏历史归档里可找回。
    if (thread && !thread.querySelector(".lxfd-msg-user, .lxfd-msg-ai")) {
      chatState.convId = null;
      if (window.__lxBridge && typeof window.__lxBridge.resetConversationContext === "function") window.__lxBridge.resetConversationContext();
    }
    const turnId = "turn-" + Date.now() + "-" + turns.length;
    const user = document.createElement("div");
    user.className = "lxfd-msg-user";
    user.id = turnId;
    user.textContent = value;
    thread?.appendChild(user);
    turns.push({ id: turnId, text: value });
    renderTurnIndex(turnId);
    if (ta) { ta.value = ""; fit(); syncSend(); }
    // 发出提问就先存一次（含 lxfd key + 同步子站 key），AI 答完再存完整——避免答得慢时切站啥都没存
    try { lxfdPersistCurrent(); } catch (_e) {}

    // 文档解读是全屏对话内的生成任务，不走 open_documents 页面跳转快路径。
    if (lxfdIsDocumentInsight(value)) {
      await lxfdRunDocumentInsight();
      return;
    }

    // ── lxfd 意图路由分流 ──────────────────────────────────────────────
    // 0. 全权代买（多步任务链）意图：只做标记，不再立即退全屏（真机反馈：还没开始推流就切左右
    //    结构，右侧只有个光秃秃商城首页很突兀）。改为和普通提问一致——留在全屏走官方流式，
    //    用户看完整推荐回答；done 桥接分屏时才起链（officialWait 直接给已到手的商品，链 step1
    //    秒过），「对比→选款→下单」的执行视图在有内容可看时才出现。
    const _lxfdAutoBuy = window.__lxIntent && window.__lxIntent.matchAutoBuy ? window.__lxIntent.matchAutoBuy(value) : null;

    // 1. 本地快路径（正则统一收口 app-intent.js，主面板/全屏共用一份，改一处两边同时生效）
    // 代买时跳过：句里"对比/下单"字样会被误判成 control 操作抢断官方推荐流（同主面板 _autoBuy 防护）
    const _lxfdLocalCtrl = !_lxfdAutoBuy && window.__lxIntent ? window.__lxIntent.matchControl(value) : null;
    if (_lxfdLocalCtrl) {
      if (_lxfdLocalCtrl.op === "open_solution") {
        const solutionAi = document.createElement("div");
        solutionAi.className = "lxfd-msg-ai";
        solutionAi._loadingStarted = Date.now();
        solutionAi._traceLines = ["联想乐享正在判断"];
        solutionAi._traceSkills = new Set();
        solutionAi._traceCollapsed = false;
        solutionAi.innerHTML = '<div class="lxfd-ai-body"></div>';
        thread?.appendChild(solutionAi);
        lxfdRenderTraceLive(solutionAi);
        solutionAi.scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth", block: "end" });

        await lxfdWait(reduceMotion ? 0 : 520);
        solutionAi._traceLines.push("已判断：全集解决方案检索任务");
        lxfdRenderTraceLive(solutionAi);
        await lxfdWait(reduceMotion ? 0 : 680);
        solutionAi._traceSkills.add("Skill(解决方案推荐)");
        solutionAi._traceLines.push("联想乐享官方 SKILL：正在调用 Skill(解决方案推荐)");
        lxfdRenderTraceLive(solutionAi);
        await lxfdWait(reduceMotion ? 0 : 760);
        solutionAi._traceLines.push("已完成：行业方案全集与分类楼层已生成");
        solutionAi._traceCollapsed = true;
        lxfdRenderTraceLive(solutionAi);

        const solutionCopy = [
          "我已为你汇总**乐享全集解决方案**，覆盖教育、医疗、政府、制造、金融、能源、交通和服务八大行业。",
          "每个行业都按照**独立楼层**组织，并结合核心业务场景、终端部署、基础设施与持续服务，方便你快速浏览和比较。",
          "你可以进入全集后**按行业标签定位**；当前视口会在每个楼层单排自适应展示 4–6 个方案。"
        ].join("\n\n");
        await lxfdAnimateFinal(solutionAi, solutionCopy);
        const solutionMeta = lxfdPageCtaMeta("open_solution");
        const solutionBody = solutionAi.querySelector(".lxfd-ai-body");
        if (solutionBody && solutionMeta) {
          solutionBody.insertAdjacentHTML("beforeend", renderLxfdPageCta(solutionMeta));
          const solutionCard = solutionBody.querySelector('[data-lxfd-open-feature="solution"]');
          if (solutionCard) {
            solutionCard.classList.add("is-active");
            solutionCard.setAttribute("aria-pressed", "true");
          }
        }
        lxfdPersistCurrent();
        await lxfdWait(reduceMotion ? 0 : 720);
        lxfdExportToMain();
        exitFullscreenWithReveal(() => lxfdRevealFeature("solution"));
        return;
      }
      const _lxfdCtrlAi = document.createElement("div");
      _lxfdCtrlAi.className = "lxfd-msg-ai";
      const _lxfdCtrlBody = document.createElement("div");
      _lxfdCtrlBody.className = "lxfd-ai-body";
      const _lxfdCtrlText = document.createElement("div");
      _lxfdCtrlText.className = "lxfd-ai-text";
      _lxfdCtrlText.textContent = _lxfdLocalCtrl.msg;
      _lxfdCtrlBody.appendChild(_lxfdCtrlText);
      _lxfdCtrlAi.appendChild(_lxfdCtrlBody);
      thread?.appendChild(_lxfdCtrlAi);
      _lxfdCtrlAi.scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth", block: "end" });
      // 执行操作：通过 __lxExecControl 桥（全屏态 lxExecControl 不在此作用域）
      const _execOp = _lxfdLocalCtrl.op;
      const _execTarget = _lxfdLocalCtrl.target;
      const _execPageMeta = lxfdPageCtaMeta(_execOp);
      if (_execPageMeta) {
        _lxfdCtrlBody.insertAdjacentHTML("beforeend", renderLxfdPageCta(_execPageMeta));
        lxfdExportToMain();
        exitFullscreenWithReveal(() => {
          lxfdRevealFeature(_execPageMeta.feature);
        });
        return;
      }
      if (_execOp === "enter_fullscreen") { /* 全屏态已全屏，无需操作 */ }
      else if (_execOp === "exit_fullscreen") {
        if (typeof window.__lxBridge?.exitFullscreen === "function") window.__lxBridge.exitFullscreen();
      } else if (typeof window.__lxBridge?.execControl === "function") {
        window.__lxBridge.execControl(_execOp, _execTarget);
      }
      return;
    }

    // 思考过程时间线（件2）：气泡必须在远程意图路由 fetch **之前**上屏——路由最长 4.5s，
    // 放在后面用户盯着空白（真机反馈）。首行"正在判断"发送瞬间出现，"已判断"等路由分流
    // 落定再追加（走 control 分支时整个气泡移除）。渲染复用主面板 renderSkillTrace 桥接。
    const _traceLines = ["联想乐享正在判断"]; // 省略号由 .current::after 三点循环动画补，文本不写死
    const _renderTrace = window.__lxBridge && window.__lxBridge.renderSkillTrace;
    const ai = document.createElement("div");
    ai.className = "lxfd-msg-ai";
    ai.innerHTML = `<div class="lxfd-ai-body">${_renderTrace ? _renderTrace(_traceLines, { collapsed: false, foldable: false, skillCount: 0 }) : ""}</div>`;
    ai._raw = "";
    ai._loadingStarted = Date.now();
    ai._traceLines = _traceLines;
    ai._traceSkills = new Set();
    ai._traceCollapsed = false;
    ai._traceLastRaw = "";
    thread?.appendChild(ai);
    ai.scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth", block: "end" });
    const _lxfdPushJudged = () => {
      if (ai._judgedPushed) return;
      ai._judgedPushed = true;
      _traceLines.push(_lxfdAutoBuy ? "已判断：多步代买任务，推荐完成后进入执行视图" : "已判断：商品咨询 → 调用联想乐享官方 SKILL");
      lxfdRenderTraceLive(ai);
    };

    // 2. 远程意图路由器（代买时跳过：分类器可能把"选/下单"误判成 control 操作抢断推荐流，同主面板）
    let _lxfdIntentResult = null;
    if (!_lxfdAutoBuy) try {
      const _lxfdIntentAbort = new AbortController();
      const _lxfdIntentTimer = setTimeout(() => _lxfdIntentAbort.abort(), 4500);
      const _lxfdIntentRes = await fetch("/api/leai/intent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: value }),
        signal: _lxfdIntentAbort.signal
      });
      clearTimeout(_lxfdIntentTimer);
      if (_lxfdIntentRes.ok) _lxfdIntentResult = await _lxfdIntentRes.json();
    } catch (_lxfdIntentErr) { /* 超时/失败 → 降级 chat */ }
    if (_lxfdIntentResult && _lxfdIntentResult.type === "control" && _lxfdIntentResult.op) {
      ai.remove(); // 操作指令：撤掉"正在判断"时间线气泡，走操作确认消息（同主面板做法）
      const _lxfdCtrlAi = document.createElement("div");
      _lxfdCtrlAi.className = "lxfd-msg-ai";
      const _lxfdCtrlBody = document.createElement("div");
      _lxfdCtrlBody.className = "lxfd-ai-body";
      const _lxfdCtrlText = document.createElement("div");
      _lxfdCtrlText.className = "lxfd-ai-text";
      const _lxfdOpNames = { close_all_tabs: "关闭了所有页面标签", close_other_tabs: "关闭了其他标签，只留当前", go_home: "回到了首页", open_cart: "打开了购物车", open_orders: "打开了订单页面", open_member: "打开了会员中心", open_coupon: "打开了优惠券中心", open_stores: "打开了门店查询", open_edu_zone: "打开了教育专区", open_documents: "打开了文档解读与资料中心", open_product: `正在帮你打开「${_lxfdIntentResult.target || "该商品"}」`, enter_fullscreen: "切换到全屏对话模式（当前已在全屏）", exit_fullscreen: "退出了全屏模式" };
      _lxfdCtrlText.textContent = `好的，已为你${_lxfdOpNames[_lxfdIntentResult.op] || "执行了操作"}。`;
      _lxfdCtrlBody.appendChild(_lxfdCtrlText);
      _lxfdCtrlAi.appendChild(_lxfdCtrlBody);
      thread?.appendChild(_lxfdCtrlAi);
      _lxfdCtrlAi.scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth", block: "end" });
      const _lxfdExecOp = _lxfdIntentResult.op;
      const _lxfdExecTarget = _lxfdIntentResult.target || "";
      const _lxfdPageMeta = lxfdPageCtaMeta(_lxfdExecOp);
      if (_lxfdPageMeta) {
        _lxfdCtrlBody.insertAdjacentHTML("beforeend", renderLxfdPageCta(_lxfdPageMeta));
        lxfdExportToMain();
        exitFullscreenWithReveal(() => {
          lxfdRevealFeature(_lxfdPageMeta.feature);
        });
        return;
      }
      if (_lxfdExecOp === "enter_fullscreen") { /* 全屏态已全屏，无需操作 */ }
      else if (_lxfdExecOp === "exit_fullscreen") {
        if (typeof window.__lxBridge?.exitFullscreen === "function") window.__lxBridge.exitFullscreen();
      } else if (typeof window.__lxBridge?.execControl === "function") {
        window.__lxBridge.execControl(_lxfdExecOp, _lxfdExecTarget);
      }
      return;
    }
    // ── lxfd 意图路由分流结束 ─────────────────────────────────────────

    // 走到这里说明不是操作指令：补"已判断"行——意图路由刚落定，天然有 0.5~4.5s 节奏，
    // 不和首行同帧蹦出；代买跳过了意图路由没有天然节奏，给 500ms 微延迟（同主面板做法）。
    if (_lxfdAutoBuy) setTimeout(_lxfdPushJudged, 500); else _lxfdPushJudged();
    const body = ai.querySelector(".lxfd-ai-body");
    const nonce = chatState.conversationNonce;
    chatState.sending = true;
    let hasContent = false;
    const revealAi = () => {
      if (hasContent) return;
      hasContent = true;
      body?.querySelector(".lxfd-typing, .loading-line")?.remove();
      ai._textBox = document.createElement("div");
      ai._textBox.className = "lxfd-ai-text";
      if (body) body.insertBefore(ai._textBox, body.firstChild);
      ai._raw = "";
      ai._writer = window.__lxCreateTypewriter(ai._textBox, {
        charsPerTick: 1,
        interval: 24,
        scroll: () => {
          if (thread) thread.scrollTop = thread.scrollHeight;
        }
      });
    };
    // lxfd 前端兜底超时：50秒后强制解锁
    const _lxfdSendTimeout = setTimeout(() => {
      if (chatState.sending && chatState.conversationNonce === nonce) {
        chatState.sending = false;
        ai._raw = "响应超时，请重试。";
        lxfdAnimateFinal(ai, ai._raw);
      }
    }, 50000);
    try {
      chatState._fallbackFired = false;
      // 代买句剥成交短语再发官方（「直接下单」会触发官方下单 Skill 不回商品清单），收口 app-intent 与主面板共用
      const _lxfdAskText = _lxfdAutoBuy && window.__lxIntent && window.__lxIntent.stripPurchasePhrase
        ? window.__lxIntent.stripPurchasePhrase(value)
        : value;
      const sendMsg = chatState.human
        ? ('[系统提示: 请以"专属客服小联"身份回复, 像人工客服一样亲切自然简短直接, 不用 markdown/列表/标题, 不暴露 AI 身份, 严禁输出"QA对""知识库""参考资料"等内部字样或📎等标记。]\n\n用户问: ' + value)
        : _lxfdAskText;
      const lxfdImgUrl = window.__lxfdPendingImage || undefined;
      window.__lxfdPendingImage = null;
      const imgTipEl = document.querySelector('.lxfd-img-tip');
      if (imgTipEl) imgTipEl.remove();
      const lxfdUseHuoshan = !!lxfdImgUrl || !!window.__lxWebSearch;
      const response = lxfdUseHuoshan
        ? await fetch("/api/chat/stream", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              message: sendMsg,
              image_url: lxfdImgUrl,
              web_search: !!window.__lxWebSearch,
              thinking_mode: !!window.__lxThinking,
              conv_id: chatState.convId || undefined
            })
          })
        : await fetch("/api/leai/stream", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              message: sendMsg,
              sessionId: chatState.convId || undefined,
              enableThinking: !!window.__lxThinking,
              ...(window.__lxGeo || {})
            })
          });
      if (!response.ok || !response.body) throw new Error(`HTTP ${response.status}`);
      const lxfdHandlers = {
        chunk: (data) => {
          if (nonce !== chatState.conversationNonce) return;
          const payload = parseJson(data);
          const content = payload.text || data || "";
          if (/^\s*params\s*error\.?\s*$/i.test(content)) return;
          if (!content) return;
          // 首个 chunk 到达：思考过程时间线收起成一行摘要条，把舞台让给正文（同主面板）
          if (!ai._traceCollapsed) { ai._traceCollapsed = true; lxfdRenderTraceLive(ai); }
          hasContent = true;
          ai._raw += content;
        },
        status: (data) => {
          if (nonce !== chatState.conversationNonce) return;
          const payload = parseJson(data);
          if (payload.conv_id || payload.convId) chatState.convId = payload.conv_id || payload.convId;
          if (payload.text) {
            const raw = String(payload.text);
            if (raw !== ai._traceLastRaw) { // 去重相邻重复（官方 status 流常见连续重复 ping）
              ai._traceLastRaw = raw;
              const skillMatch = raw.match(/^(正在获取数据|已获取数据):(Skill\(.+\))$/);
              let line = raw;
              if (skillMatch) {
                ai._traceSkills.add(skillMatch[2]);
                line = skillMatch[1] === "正在获取数据"
                  ? `联想乐享官方 SKILL：正在调用 ${skillMatch[2]}`
                  : `联想乐享官方 SKILL：${skillMatch[2]} 已完成`;
              }
              ai._traceLines.push(line);
              lxfdRenderTraceLive(ai);
            }
          }
        },
        products: (data) => {
          if (nonce !== chatState.conversationNonce) return;
          const payload = parseJson(data);
          let products = payload.products || [];
          // 用户点名要N款(2-6)而官方固定回5-6款 → 按要求截断
          const _wantN = window.__lxIntent && window.__lxIntent.parseWantedCount ? window.__lxIntent.parseWantedCount(value) : null;
          if (_wantN && products.length > _wantN) products = products.slice(0, _wantN);
          if (!products.length) return;
          hasContent = true;
          pendingExtras += renderLxfdProducts(products);
          // 记录本轮商品以便 done 时桥接到主面板
          turnProducts = products;
          chatState.lastProducts = products;
          chatState.lastProductsMeta = { title: "AI 推荐", grouped: false };
        },
        display: (data) => {
          if (nonce !== chatState.conversationNonce) return;
          const payload = parseJson(data);
          let products = payload.products || payload.items || [];
          const _wantN = window.__lxIntent && window.__lxIntent.parseWantedCount ? window.__lxIntent.parseWantedCount(value) : null;
          if (_wantN && products.length > _wantN) products = products.slice(0, _wantN);
          if (products.length || payload.title) hasContent = true;
          if (payload.title && !ai._raw) {
            ai._raw = payload.title;
          }
          pendingExtras += renderLxfdProducts(products);
          // 记录本轮商品及展示元信息以便 done 时桥接到主面板
          if (products.length) {
            turnProducts = products;
            turnTitle = payload.title || "";
            turnGrouped = !!payload.grouped;
            chatState.lastProducts = products;
            chatState.lastProductsMeta = { title: turnTitle, grouped: turnGrouped };
          }
        },
        clicks: (data) => {
          if (nonce !== chatState.conversationNonce) return;
          const list = (parseJson(data).clicks) || [];
          if (!list.length || !body) return;
          pendingExtras += '<div class="leai-clicks" style="display:flex;flex-wrap:wrap;gap:8px;margin-top:12px">' + list.map((c) =>
            `<button type="button" class="leai-click-btn" data-leai-url="${escapeAttr(c.link_url || "")}" data-leai-cb="${escapeAttr(c.callback_data || "")}" data-leai-event="${escapeAttr(c.event_type || "")}">${escapeHtml(c.display_text)}</button>`
          ).join("") + "</div>";
        },
        suggestions: (data) => {
          if (nonce !== chatState.conversationNonce) return;
          const payload = parseJson(data);
          pendingFollowups = (payload.suggestions || []).filter(Boolean).slice(0, 3);
        },
        action: (data) => {
          if (nonce !== chatState.conversationNonce) return;
          const { op } = parseJson(data) || {};
          const pageMeta = lxfdPageCtaMeta(op);
          if (pageMeta) {
            if (pageMeta.feature === "solution") pendingExtras += renderLxfdLeadCta();
            pendingExtras += renderLxfdPageCta(pageMeta);
            if (turnActions.indexOf(pageMeta.feature) < 0) turnActions.push(pageMeta.feature);
          } else if (op === 'auth') {
            // 职场认证：直接往 lxfd AI 气泡末尾插入触发按钮（不走全屏→分屏桥接）
            pendingExtras += '<div class="lx-p0-actions answer-actions"><button class="lx-p0-btn primary" type="button" data-open-wpa>立即认证职场身份</button></div>';
          } else if (op) {
            if (turnActions.indexOf(op) < 0) turnActions.push(op); // 记录意图，done 时桥接后再执行（全屏下直接开标签会被遮盖）
          }
        },
        control: (data) => {
          if (nonce !== chatState.conversationNonce) return;
          const payload = parseJson(data) || {};
          // 页面操作（关标签/回首页/开订单等）：桥接到主面板执行
          if (payload.op && typeof window.__lxExecControl === 'function') window.__lxExecControl(payload.op, payload.target);
        },
        done: (data) => {
          if (nonce !== chatState.conversationNonce) return;
          if (finalized) return;
          finalized = true;
          finalizePromise = (async () => {
            window.clearTimeout(_lxfdSendTimeout);
            const payload = parseJson(data);
            if (payload.conv_id || payload.convId) chatState.convId = payload.conv_id || payload.convId;
            await lxfdAnimateFinal(ai, ai._raw);
            const finalBody = ai.querySelector(".lxfd-ai-body");
            if (pendingExtras && finalBody) { finalBody.insertAdjacentHTML("beforeend", pendingExtras); if (thread) thread.scrollTop = thread.scrollHeight; }
            if (!pendingFollowups.length) pendingFollowups = await lxfdFetchFollowups(value, ai._raw);
            pendingFollowups = lxfdFill3(lxfdActionChips(turnProducts).concat(pendingFollowups));
            if (pendingFollowups.length) appendLxfdSuggestions(ai, pendingFollowups);
            lxfdPersistCurrent();
            lxfdRenderHist();
            const isFullscreen = document.body.classList.contains("assistant-fullscreen");
            // 代买任务：推荐回答已在全屏展示完，此刻才切执行视图起链（真机反馈：不能一发问就分屏）。
            // officialWait 直接给已到手的商品，链 step1 秒过进入「对比→选款→下单」。
            if (_lxfdAutoBuy && isFullscreen && window.__lxBridge && window.__lxRunChain) {
              lxfdExportToMain();
              exitFullscreenWithReveal(() => {
                // 链卡走裸 addMessage，需先补分屏布局（老坑：不补则背景停在欢迎门户，链卡在 DOM 里看不见）
                if (typeof window.__lxBridge.prepareRootSplitState === "function") window.__lxBridge.prepareRootSplitState();
                window.__lxRunChain("auto_buy_official", {
                  maxPrice: _lxfdAutoBuy.params.maxPrice || 0,
                  minPrice: _lxfdAutoBuy.params.minPrice || 0,
                  officialWait: Promise.resolve(Array.isArray(turnProducts) ? turnProducts : []),
                  rawText: value
                });
                if (thread) thread.innerHTML = "";
              });
            } else if (turnProducts && turnProducts.length && isFullscreen && window.__lxBridge) {
              // 官方带回商品 → 自动桥接分屏右侧展示（所推即所见）；只有纯 action 无商品才走功能页桥接
              lxfdExportToMain();
              exitFullscreenWithReveal(() => {
                window.__lxBridge.revealProducts(turnProducts, { title: turnTitle, grouped: turnGrouped });
                turnActions.forEach((op) => lxfdRevealFeature(op)); // 多意图：门店/优惠/会员标签全开
                if (thread) thread.innerHTML = "";
              });
            } else if (turnActions.length && isFullscreen && window.__lxBridge) {
              // 本轮只有意图无商品：同样桥接退全屏，再开功能标签
              lxfdExportToMain();
              exitFullscreenWithReveal(() => {
                // lxfdRevealFeature 内部会先 lxfdEnsureRootSplitState 补首页分屏布局
                // （不做这步 .shell 仍 display:none → 功能标签渲染了但主面板隐藏=空白）
                turnActions.forEach((op) => lxfdRevealFeature(op));
                if (thread) thread.innerHTML = "";
              });
            }
          })();
        },
        fallback: async () => {
          if (nonce !== chatState.conversationNonce) return;
          if (chatState._fallbackFired) return;
          chatState._fallbackFired = true;
          try {
            const huoRes = await fetch('/api/chat/stream', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ message: sendMsg, conv_id: chatState.convId || undefined })
            });
            if (!huoRes.ok || !huoRes.body) throw new Error('fallback upstream ' + huoRes.status);
            await readSse(huoRes, lxfdHandlers);
          } catch (_e) {
            ai._raw = '当前服务暂时不可用，请稍后再试。';
            if (!finalized) {
              finalized = true;
              finalizePromise = lxfdAnimateFinal(ai, ai._raw);
            }
          }
        }
      };
      await readSse(response, lxfdHandlers);
      if (nonce !== chatState.conversationNonce) return;
      if (finalizePromise) {
        await finalizePromise;
      } else if (!finalized) {
        finalized = true;
        if (!hasContent && !ai._raw && !pendingExtras) {
          ai._raw = "我已经收到请求，可以继续补充预算、用途或偏好的机型。";
        }
        await lxfdAnimateFinal(ai, ai._raw);
        const finalBody = ai.querySelector(".lxfd-ai-body");
        if (pendingExtras && finalBody) finalBody.insertAdjacentHTML("beforeend", pendingExtras);
        if (!pendingFollowups.length) pendingFollowups = await lxfdFetchFollowups(value, ai._raw);
        pendingFollowups = lxfdFill3(lxfdActionChips(turnProducts).concat(pendingFollowups));
        if (pendingFollowups.length) appendLxfdSuggestions(ai, pendingFollowups);
        lxfdPersistCurrent();
        lxfdRenderHist();
        const isFullscreen = document.body.classList.contains("assistant-fullscreen");
        // 与上方 done 分支同一条规则：代买起链 > 有商品分屏展示 > 纯 action 功能页桥接。
        if (_lxfdAutoBuy && isFullscreen && window.__lxBridge && window.__lxRunChain) {
          lxfdExportToMain();
          exitFullscreenWithReveal(() => {
            if (typeof window.__lxBridge.prepareRootSplitState === "function") window.__lxBridge.prepareRootSplitState();
            window.__lxRunChain("auto_buy_official", {
              maxPrice: _lxfdAutoBuy.params.maxPrice || 0,
              minPrice: _lxfdAutoBuy.params.minPrice || 0,
              officialWait: Promise.resolve(Array.isArray(turnProducts) ? turnProducts : []),
              rawText: value
            });
            if (thread) thread.innerHTML = "";
          });
        } else if (turnProducts && turnProducts.length && isFullscreen && window.__lxBridge) {
          lxfdExportToMain();
          exitFullscreenWithReveal(() => {
            window.__lxBridge.revealProducts(turnProducts, { title: turnTitle, grouped: turnGrouped });
            turnActions.forEach((op) => lxfdRevealFeature(op)); // 多意图：标签全开（同 done 分支）
            if (thread) thread.innerHTML = "";
          });
        } else if (turnActions.length && isFullscreen && window.__lxBridge) {
          lxfdExportToMain();
          exitFullscreenWithReveal(() => {
            turnActions.forEach((op) => lxfdRevealFeature(op));
            if (thread) thread.innerHTML = "";
          });
        }
      }
    } catch (error) {
      console.error("[lxfd] submit 流程异常（此前静默吞掉，排障困难）:", error);
      if (nonce !== chatState.conversationNonce) return;
      ai._raw = "当前 AI 服务暂时不可用，请稍后重试。";
      await lxfdAnimateFinal(ai, ai._raw);
    } finally {
      clearTimeout(_lxfdSendTimeout);
      if (nonce === chatState.conversationNonce) chatState.sending = false;
      ai.scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth", block: "end" });
    }
  }

  window.lxfdSubmit = submit;
  window.lxfdReset = resetConversation;
  // 分屏→全屏回退：关空右侧 tab 时带入主面板对话回全屏
  window.__lxfdEnterFromSplit = function() {
    if (thread) thread.innerHTML = "";
    enterFullscreen();  // enterFullscreen 内检测到 thread 空会自动 lxfdImportFromMain
  };
  // 新建对话回全屏欢迎态
  window.__lxfdNewFullscreen = function() {
    resetConversation(true);
    enterFullscreen();
  };

  convoPill?.addEventListener("click", () => setNav(!navCluster.classList.contains("open")));
  navCluster?.addEventListener("mouseenter", () => { clearTimeout(hoverTimer); });
  navCluster?.addEventListener("mouseleave", () => { clearTimeout(hoverTimer); setNav(false); });
  $$("#lxfdNavSheet a").forEach(a => a.addEventListener("click", (e) => {
    e.preventDefault();
    $$("#lxfdNavSheet a").forEach(x => x.classList.remove("active"));
    a.classList.add("active");
    setNav(false);
    const path = navPaths[a.dataset.page] || "/";
    const currentPath = location.pathname.endsWith("/") ? location.pathname : `${location.pathname}/`;
    const targetPath = path.endsWith("/") ? path : `${path}/`;
    if (currentPath === targetPath) location.reload();
    else location.assign(path);
  }));
  document.addEventListener("click", (e) => { if (navCluster && !navCluster.contains(e.target)) setNav(false); });
  document.addEventListener("keydown", (e) => { if (e.key === "Escape") { setNav(false); if (!wide()) setRailManual(false); } });
  railFab?.addEventListener("click", () => setRailManual(true));
  $("#lxfdRailClose")?.addEventListener("click", () => setRailManual(false));
  $(".lxfd-actions")?.addEventListener("click", (e) => {
    const button = e.target.closest(".lxfd-ic");
    if (!button) return;
    const label = button.getAttribute("aria-label") || "";
    if (button.dataset.lxfdOpen === "cart" || label.includes("购物车")) {
      e.preventDefault();
      e.stopPropagation();
      window.lxOpenCommerceEntry?.("cart", { sendQuery: true });
      return;
    }
    if (button.dataset.lxfdOpen === "orders" || label.includes("订单")) {
      e.preventDefault();
      e.stopPropagation();
      window.lxOpenCommerceEntry?.("orders", { sendQuery: true });
      return;
    }
    // 首页空白态胶囊里的历史入口（必须在兜底 exitFullscreen 之前拦下）：
    // 开「历史记录」弹窗（与分屏同款），不拉左侧 rail（真机反馈）
    if (button.id === "lxfdTopHistBtn" || label.includes("历史")) {
      e.preventDefault();
      if (window.__lxBridge && typeof window.__lxBridge.openHistoryModal === "function") window.__lxBridge.openHistoryModal();
      else setRailManual(true);
      return;
    }
    e.preventDefault();
    exitFullscreen();
  });
  scrim?.addEventListener("click", () => setRailManual(false));
  function lxfdStartNewConversation(collapseRail) {
    const logicalPath = String(window.__LX_TEMPLATE_PATH || location.pathname || "/").replace(/\/+$/, "") || "/";
    resetConversation(!!collapseRail);
    if (logicalPath !== "/") {
      // 子频道的全屏新建对话是“收起回当前频道新对话”，
      // 不是停留在全屏欢迎态。复用同一收起动画与主面板 reset 链路。
      exitFullscreenWithReveal(() => window.__lxBridge?.newConversationInCurrentChannel?.());
    }
  }
  $("#lxfdNewChat")?.addEventListener("click", () => lxfdStartNewConversation(true));
  // 全屏左侧悬浮“＋”与历史栏内“新建对话”必须是同一语义；此前这里只清空
  // lxfd thread，导致用户仍停在全屏而没有回到当前频道首页。
  railNewFab?.addEventListener("click", () => lxfdStartNewConversation(false));
  historySearch?.addEventListener("input", () => lxfdRenderHist(historySearch.value));
  $("#lxfdHist")?.addEventListener("click", (e) => {
    const item = e.target.closest("[data-conv-item]");
    const action = e.target.closest(".lxfd-hist-action");
    if (action && item) {
      e.preventDefault();
      e.stopPropagation();
      const id = item.dataset.convItem;
      if (action.dataset.action === "delete" && !window.confirm("确认删除这条历史对话吗？")) return;
      lxfdUpdateConversation(id, action.dataset.action);
      return;
    }
    const a = e.target.closest("a[data-conv]");
    if (!a) return;
    e.preventDefault();
    if (a.dataset.conv) lxfdLoadConv(a.dataset.conv);
  });
  document.addEventListener("click", (e) => {
    if (e.target.closest(".lxfd-hist-item")) return;
    $$(".lxfd-hist-item.menu-open").forEach(node => { node.classList.remove("menu-open"); node.querySelector(".lxfd-hist-more")?.setAttribute("aria-expanded", "false"); });
  });
  document.addEventListener("keydown", (e) => {
    if (e.key !== "Escape") return;
    const openItem = $(".lxfd-hist-item.menu-open");
    if (!openItem) return;
    openItem.classList.remove("menu-open");
    const trigger = openItem.querySelector(".lxfd-hist-more");
    trigger?.setAttribute("aria-expanded", "false");
    trigger?.focus();
  });
  $$(".lxfd-comp-left .lxfd-toggle").forEach(btn => btn.addEventListener("click", () => { const on = btn.classList.toggle("on"); btn.setAttribute("aria-pressed", on ? "true" : "false"); if (btn.textContent.includes("深度思考")) window.__lxThinking = on; if (btn.textContent.includes("联网")) window.__lxWebSearch = on; }));
  // lxfd 图片上传
  const lxfdImgBtn = document.querySelector('.lxfd-img-btn');
  if (lxfdImgBtn) {
    const lxfdFileInput = document.createElement('input');
    lxfdFileInput.type = 'file';
    lxfdFileInput.accept = 'image/*';
    lxfdFileInput.style.display = 'none';
    lxfdFileInput.id = 'lxfdFileInput';
    document.body.appendChild(lxfdFileInput);
    lxfdImgBtn.addEventListener('click', () => lxfdFileInput.click());
    lxfdFileInput.addEventListener('change', async () => {
      const file = lxfdFileInput.files && lxfdFileInput.files[0];
      if (!file) return;
      lxfdFileInput.value = '';
      try {
        lxfdImgBtn.disabled = true;
        const formData = new FormData();
        formData.append('file', file);
        const res = await fetch('/api/chat/upload-image', { method: 'POST', body: formData });
        const data = await res.json();
        if (data && data.url) {
          window.__lxfdPendingImage = data.url;
          const dock = document.querySelector('.lxfd-dock');
          let imgTip = dock && dock.querySelector('.lxfd-img-tip');
          if (!imgTip && dock) {
            imgTip = document.createElement('div');
            imgTip.className = 'lxfd-img-tip';
            imgTip.style.cssText = 'font-size:12px;color:#979797;padding:4px 12px;display:flex;align-items:center;gap:6px';
            dock.insertBefore(imgTip, dock.querySelector('.lxfd-composer'));
          }
          if (imgTip) {
            imgTip.innerHTML = '<span>已添加图片</span><button type="button" style="border:none;background:none;cursor:pointer;color:#b8252e;font-size:12px" id="lxfdImgClear">×</button>';
            const clearBtn = imgTip.querySelector('#lxfdImgClear');
            if (clearBtn) clearBtn.addEventListener('click', () => { window.__lxfdPendingImage = null; imgTip.remove(); });
          }
        }
      } catch (_e) {
        // 上传失败静默处理
      } finally {
        lxfdImgBtn.disabled = false;
      }
    });
  }

  (function initLxfdHomeGallery() {
    const data = {
      new: [
        { nm: "拯救者 Y9000P 2026", ds: "i9-14900HX ｜ RTX 5060 ｜ 2.5K 240Hz 电竞屏", price: "15,098", badge: "新品首发", wm: "LEGION Y9000P", img: "../img/lxfd-gallery-1-1.jpg", g: "linear-gradient(135deg,#252525,#4d144a 58%,#625b68)", q: "请解读这款商品：拯救者 Y9000P 2026，配置是 i9-14900HX ｜ RTX 5060 ｜ 2.5K 240Hz 电竞屏，价格约 ¥15,098，适合什么人买？" },
        { nm: "YOGA Air 14c 2026", ds: "酷睿 Ultra9 ｜ 32G/2T ｜ 2.8K OLED 触控", price: "8,999", badge: "轻薄旗舰", wm: "YOGA Air 14c", img: "../img/lxfd-gallery-1-2.jpg", g: "linear-gradient(135deg,#252525,#625b68 58%,#979797)", q: "请解读这款商品：YOGA Air 14c 2026，配置是酷睿 Ultra9 ｜ 32G/2T ｜ 2.8K OLED 触控，价格约 ¥8,999，适合什么人买？" },
        { nm: "小新Pad Pro 13英寸", ds: "酷睿 Ultra5 225H ｜ 32G/1T ｜ 全能轻薄", price: "7,299", badge: "全能之选", wm: "Xiaoxin Pro16", img: "../img/lxfd-gallery-1-3.jpg", g: "linear-gradient(135deg,#0c2342,#252525 58%,#48d39e)", q: "请解读这款商品：小新Pad Pro 13英寸，配置是酷睿 Ultra5 225H ｜ 32G/1T ｜ 全能轻薄，价格约 ¥7,299，适合什么人买？" }
      ],
      act: [
        { nm: "618 年中钜惠", ds: "全场至高省 2000，下单再享 12 期免息", price: "省 2000", isText: true, badge: "限时", wm: "618 SALE", g: "linear-gradient(135deg,#252525,#b8252e 56%,#e42b20)", q: "618 年中钜惠有什么优惠？怎么参加？" },
        { nm: "教育优惠季", ds: "学生 / 教师认证，专属机型至高 9 折", price: "享 9 折", isText: true, badge: "进行中", wm: "EDU SEASON", g: "linear-gradient(135deg,#0c2342,#625b68 58%,#979797)", q: "教育优惠季怎么参加？学生认证有哪些优惠？" },
        { nm: "以旧换新", ds: "旧机抵扣 + 平台补贴，至高补 800 元", price: "补 800", isText: true, badge: "可叠加", wm: "TRADE-IN", g: "linear-gradient(135deg,#252525,#625b68 58%,#48d39e)", q: "以旧换新怎么操作？旧机能抵多少钱？" }
      ],
      news: [
        { nm: "联想 2026 拯救者全系发布", ds: "搭载新一代 AI 引擎与超频引擎，性能再进阶", price: "查看全文", isText: true, badge: "官方", wm: "PRESS", g: "linear-gradient(135deg,#0c2342,#5b1452 58%,#625b68)", q: "联想 2026 拯救者全系发布了哪些新品？有什么亮点？" },
        { nm: "联想 AI PC 出货领跑行业", ds: "IDC 最新报告：中国 AI PC 市场份额持续第一", price: "查看全文", isText: true, badge: "行业", wm: "INSIGHT", g: "linear-gradient(135deg,#0c2342,#625b68 58%,#979797)", q: "联想 AI PC 有哪些优势？为什么市场份额第一？" },
        { nm: "联想乐享门店破 5000 家", ds: "线下服务网络全面升级，到店体验更进一步", price: "查看全文", isText: true, badge: "动态", wm: "RETAIL", g: "linear-gradient(135deg,#252525,#625b68 58%,#bcb4c1)", q: "联想门店能提供哪些服务？帮我找附近门店。" }
      ],
      case: [
        { nm: "某重点高校机房方案", ds: "1200 台统一部署与运维，开机即用，集中管理", price: "教育行业", isText: true, badge: "已交付", wm: "CAMPUS", g: "linear-gradient(135deg,#0c2342,#625b68 58%,#979797)", q: "教育行业的机房统一部署方案是怎么做的？" },
        { nm: "设计工作室创作方案", ds: "ThinkStation + 校色屏整体方案，效率提升 40%", price: "创意设计", isText: true, badge: "标杆", wm: "STUDIO", g: "linear-gradient(135deg,#0c2342,#5b1452 58%,#a262d7)", q: "设计创作行业有什么整体方案？ThinkStation 怎么配？" },
        { nm: "连锁零售 POS 升级", ds: "300+ 门店终端统一焕新，稳定支撑高峰交易", price: "零售行业", isText: true, badge: "规模化", wm: "RETAIL POS", g: "linear-gradient(135deg,#252525,#5b1452 58%,#e42b20)", q: "连锁零售门店终端怎么统一升级？有什么方案？" }
      ]
    };
    const root = document.querySelector(".lxfd-home-gallery");
    const grid = document.getElementById("lxfdGalleryGrid");
    const tabs = Array.from(document.querySelectorAll("[data-gallery-tab]"));
    const ink = document.getElementById("lxfdGalleryInk");
    if (!root || !grid || !tabs.length) return;
    const price = (item) => item.isText ? escapeHtml(item.price) : "¥" + escapeHtml(item.price);
    const card = (item) => {
      const shotClass = item.img ? "gallery-shot has-image" : "gallery-shot";
      const inner = item.img
        ? '<img class="gallery-img" src="' + escapeAttr(item.img) + '" alt="" loading="eager" />'
        : '<span class="gallery-lid"></span><span class="gallery-wm">' + escapeHtml(item.wm) + '</span>';
      return '<article class="gallery-card is-preview-only" aria-disabled="true"><div class="' + shotClass + '" style="background:' + escapeAttr(item.g) + '">' + inner + '</div>'
        + '<div class="gallery-meta"><span class="gallery-badge">' + escapeHtml(item.badge) + '</span><strong class="gallery-name">' + escapeHtml(item.nm) + '</strong><span class="gallery-desc">' + escapeHtml(item.ds) + '</span>'
        + '<div class="gallery-foot"><span class="gallery-price">' + price(item) + '</span><span class="gallery-go" aria-hidden="true">了解 →</span></div></div></article>';
    };
    // 首页内容卡当前仅作预览：保留 CSS hover，点击与键盘操作均不发送对话。
    grid.addEventListener("click", (e) => {
      const cardEl = e.target.closest(".gallery-card");
      if (cardEl) {
        e.preventDefault();
        e.stopPropagation();
      }
    });
    grid.addEventListener("keydown", (e) => {
      if (e.key !== "Enter" && e.key !== " ") return;
      const cardEl = e.target.closest(".gallery-card");
      if (cardEl) {
        e.preventDefault();
        e.stopPropagation();
      }
    });
    const moveInk = () => {
      const active = root.querySelector(".gallery-tab.is-active");
      if (active && ink) {
        ink.style.left = active.offsetLeft + "px";
        ink.style.width = active.offsetWidth + "px";
      }
    };
    const render = (key, animate) => {
      if (!data[key]) key = "new";
      if (!animate) {
        grid.innerHTML = data[key].map(card).join("");
        grid.classList.remove("is-loading");
        grid.classList.remove("is-switching");
        return;
      }
      grid.classList.add("is-switching");
      window.setTimeout(() => {
        grid.innerHTML = data[key].map(card).join("");
        grid.classList.remove("is-loading");
        grid.classList.remove("is-switching");
      }, 120);
    };
    tabs.forEach((tab) => tab.addEventListener("click", () => {
      if (tab.classList.contains("is-active")) return;
      tabs.forEach((item) => item.classList.remove("is-active"));
      tab.classList.add("is-active");
      moveInk();
      render(tab.dataset.galleryTab, true);
    }));
    render("new", false);
    requestAnimationFrame(moveInk);
    window.addEventListener("resize", moveInk);
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(moveInk);
  })();

  (function initLxfdScopeActions() {
    const scope = document.getElementById("lxfdScopeActions");
    const more = document.getElementById("lxfdScopeMore");
    const moreBtn = more?.querySelector(".lxfd-scope-more-btn");
    const close = () => {
      more?.classList.remove("open");
      moreBtn?.setAttribute("aria-expanded", "false");
    };
    if (scope) {
      scope.addEventListener("click", (event) => {
        const chip = event.target.closest(".lxfd-scope-chip");
        if (!chip) return;
        event.preventDefault();
        event.stopPropagation();
        close();
        const label = chip.textContent.trim();
        if (!label) return;
        submit(LXFD_ACTION_Q[label] || label);
      });
    }
    if (more && moreBtn) {
      moreBtn.addEventListener("click", (event) => {
        event.preventDefault();
        event.stopPropagation();
        const open = !more.classList.contains("open");
        more.classList.toggle("open", open);
        moreBtn.setAttribute("aria-expanded", open ? "true" : "false");
      });
      document.addEventListener("click", (event) => { if (!more.contains(event.target)) close(); });
      document.addEventListener("keydown", (event) => { if (event.key === "Escape") close(); });
    }
  })();

  ta?.addEventListener("input", () => { fit(); syncSend(); });
  ta?.addEventListener("keydown", (e) => { if (e.key === "Enter" && !e.shiftKey && !e.isComposing) { e.preventDefault(); submit(ta.value); } });
  $("#lxfdComposer")?.addEventListener("submit", (e) => { e.preventDefault(); submit(ta.value); });
  chips?.addEventListener("click", (e) => {
    const b = e.target.closest(".lxfd-chip-q");
    if (!b) return;
    e.preventDefault();
    e.stopPropagation();
    submit(b.dataset.q || b.textContent);
  });
  quick?.addEventListener("click", (e) => {
    const b = e.target.closest("button");
    if (!b) return;
    e.preventDefault();
    e.stopPropagation();
    if (b.textContent.trim() === "退出人工") { lxfdExitHuman(); return; }
    submit(LXFD_ACTION_Q[b.textContent.trim()] || b.textContent);
  });
  document.addEventListener("click", (e) => {
    const btn = e.target.closest(".lxfd .answer-cta, .lxfd [data-lx-result-id], .lxfd [data-lxfd-reveal-products], .lxfd [data-lx-focus-reco], .lxfd [data-lxfd-open-feature], .lxfd [data-lx-focus-active], .lxfd [data-lx-open-tab], .lxfd [data-specific-solution-cta]");
    if (!btn) return;
    e.preventDefault();
    e.stopPropagation();
    e.stopImmediatePropagation();
    const feature = btn.getAttribute("data-lxfd-open-feature") || "";
    const boundTabId = btn.getAttribute("data-lx-open-tab") || "";
    const resultId = btn.getAttribute("data-lx-result-id") || "";
    const solutionTitle = btn.getAttribute("data-specific-solution-cta") || "";
    const recoId = btn.getAttribute("data-lxfd-reco-id") || "";
    const openProduct = btn.getAttribute("data-open-product") || "";
    const targetTabId = resultId || (solutionTitle
      ? `info:solution-detail:${solutionTitle}`
      : (boundTabId || (feature === "solution" ? "info:solution" : "")));
    const storedProducts = recoId && window.__lxRecoPayloads && Array.isArray(window.__lxRecoPayloads[recoId])
      ? window.__lxRecoPayloads[recoId]
      : [];
    const recoTab = (window.__lxState?.tabs || []).find((item) => item && (item.kind === "reco" || item.id === "reco") && Array.isArray(item.products) && item.products.length);
    const products = storedProducts.length
      ? storedProducts
      : ((chatState.lastProducts && chatState.lastProducts.length) ? chatState.lastProducts : (recoTab?.products || []));
    // 收起前先锁定卡片目标。分屏恢复后精确激活对应标签，不能再由 focusReco 猜测当前页。
    const inFullscreen = document.body.classList.contains("assistant-fullscreen") || document.body.classList.contains("lx-auto-fs");
    if (inFullscreen) {
      const commitCapturedResult = () => {
        lxfdEnsureRootSplitState();
        if (window.__lxBridge?.restoreResultCard?.(btn)) return;
        if (targetTabId && window.__lxBridge?.restoreResultTab?.(targetTabId)) return;
        if (lfxdReplayImportedResultCard({ resultId, boundTabId, solutionTitle, recoId, openProduct, feature })) return;
        if (targetTabId && window.__lxBridge?.activateTab?.(targetTabId)) return;
        if (feature) lxfdRevealFeature(feature);
        else if (products.length) window.__lxBridge?.revealProducts?.(products, { title: "AI 推荐", recoId });
      };
      lxfdExitToResultAtomically(commitCapturedResult);
      return;
    }
    // 功能卡片在全屏态与左右分栏态都走同一入口；标签关闭后可重新创建。
    if (feature) {
      lxfdOpenFeatureInSplit(feature);
      return;
    }
    if (btn.hasAttribute("data-lx-focus-active") && !btn.hasAttribute("data-lx-focus-reco")) return;
  }, true);
  thread?.addEventListener("click", (e) => {
    const btn = e.target.closest(".lxfd-followups button, .lxfd-ai-body .followups button, .lxfd-ai-body .lx-p0-suggest[data-followups] button, .lxfd-ai-body [data-quick-ask]");
    if (!btn) return;
    e.preventDefault();
    const text = btn.getAttribute("data-quick-ask") || btn.textContent.replace(/→\s*$/, "").trim();
    if (text) submit(text);
  });
  turnList?.addEventListener("click", (e) => { const b = e.target.closest("button"); if (!b) return; const target = document.getElementById(b.dataset.target); if (!target) return; renderTurnIndex(target.id); target.scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth", block: "center" }); });
  window.addEventListener("resize", () => { if (document.body.classList.contains("assistant-fullscreen")) syncRailForViewport(); });

  // 职场认证按钮（lxfd 内的 data-open-wpa 委托）
  document.addEventListener("click", (e) => {
    if (e.target.closest("[data-open-wpa]")) {
      if (typeof window.openWorkplaceAuth === "function") window.openWorkplaceAuth();
    }
  });

  // 官方动作按钮（转人工/在线客服等）点击：human_access→进客服模式，有链接开新窗口，否则把 callback_data 当问题继续问
  document.addEventListener("click", (e) => {
    const btn = e.target.closest("[data-leai-url], [data-leai-cb]");
    if (!btn) return;
    e.preventDefault();
    const ev = btn.getAttribute("data-leai-event");
    if (ev === "human_access") {
      if (document.body.classList.contains("assistant-fullscreen")) {
        lxfdEnterHuman();
      } else if (typeof window.__lxSetHuman === "function") {
        window.__lxSetHuman(true);
      }
      return;
    }
    const url = btn.getAttribute("data-leai-url");
    const cb = btn.getAttribute("data-leai-cb");
    if (url) { window.open(url, "_blank", "noopener"); return; }
    if (cb && typeof window.lxfdSubmit === "function" && document.body.classList.contains("assistant-fullscreen")) window.lxfdSubmit(cb);
  });

  setTimeout(startRotatingTitle, reduceMotion ? 0 : 2000);
  syncSend();
  lxfdRenderHist();
  // P0 多频道会话互通：首页重新进入时，把共享主面板已恢复的完整会话导入全屏线程。
  if (window.__LX_TEMPLATE_PAGE === "home") {
    window.setTimeout(function () {
      if (!lxfdMainMsgs(".lx-p0-messages > .lx-p0-message").length) return;
      lxfdImportFromMain();
      setFullscreen(true);
    }, 0);
  }

  document.addEventListener("click", (e) => {
    const fsToggle = e.target.closest(".assistant-toggle");
    if (fsToggle) {
      e.preventDefault();
      e.stopPropagation();
      e.stopImmediatePropagation();
      enterFullscreen();
      return;
    }
    const heroChip = e.target.closest(".hero-suggestion");
    const fullPrompt = e.target.closest(".fullscreen-prompt");
    if (heroChip || fullPrompt) {
      const target = heroChip || fullPrompt;
      const text = (target.querySelector("span")?.textContent || target.textContent).trim();
      if (text) { e.preventDefault(); e.stopPropagation(); e.stopImmediatePropagation(); submit(text); }
    }
  }, true);
  document.addEventListener("submit", (e) => {
    const form = e.target.closest?.(".hero-composer");
    if (!form) return;
    const txt = form.querySelector("textarea")?.value.trim() || form.querySelector("textarea")?.placeholder || "最近有什么优惠活动？";
    e.preventDefault(); e.stopPropagation(); e.stopImmediatePropagation(); submit(txt);
  }, true);

  const observer = new MutationObserver(() => {
    if (document.body.classList.contains("assistant-fullscreen")) requestAnimationFrame(() => { syncRailForViewport(); fit(); syncSend(); });
  });
  observer.observe(document.body, { attributes: true, attributeFilter: ["class"] });
})();

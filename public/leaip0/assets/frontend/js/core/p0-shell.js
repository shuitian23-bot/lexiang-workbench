// ── P0 端侧功能交互补差壳层（window.__lxShell）────────────────────────────
// 只做「端侧功能交互」PRD 里现有代码没覆盖的缺口，不碰 app.js/app-lxfd.js 主链路：
//   A1 深度思考开关 localStorage 持久化（开关本身+作用于下一次请求 app.js/app-lxfd.js 已有）
//   A3 登录拦截保存来源（对话记录/购物车/订单）——核心 requireLogin/onLoginSuccess/onLoginDismiss，
//      挂载点在 app.js（openLogin 暴露、login() 成功回调、lxOpenCommerceEntry/lxOpenHistoryModal 前置守卫）
//   A4 快捷入口「更多」浮层：现有 CSS :hover 已支持展开且不因移向浮层提前关闭；仅补移出延时收起
//   A5 猜你干嘛分步导购：品类→用途→预算 三轮问答条，点选项写草稿不自动发送
// 五页共用，index.html 等页面统一在 body 末尾引入。
(function (root) {
  "use strict";
  if (!root || root.__lxShellInstalled) return;
  root.__lxShellInstalled = true;

  function escHtml(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }

  // ── A1 深度思考开关：默认开启，点击已由 app-lxfd.js/portal.js 切换并挂 window.__lxThinking，
  // 这里只补 localStorage 持久化，刷新/切页后维持上次选择。仅接管全屏输入区的简单二态开关
  // （.lxfd-comp-left .lxfd-toggle「深度思考」）；分屏态 chip「深度思考(自动)」是已上线的独立
  // 自动模式控件（默认关=自动，语义不同），不在本次改动范围内。
  (function deepThinkPersist() {
    var KEY = "lexiang.deepThink.v1";
    function readStored() {
      try {
        var raw = root.localStorage.getItem(KEY);
        return raw === null ? true : raw === "1"; // 未存过=默认开启
      } catch (_e) { return true; }
    }
    function writeStored(on) {
      try { root.localStorage.setItem(KEY, on ? "1" : "0"); } catch (_e) {}
    }
    function thinkBtns() {
      var list = document.querySelectorAll(".lxfd-comp-left .lxfd-toggle");
      return Array.prototype.filter.call(list, function (b) { return /深度思考/.test(b.textContent); });
    }
    function apply() {
      var on = readStored();
      root.__lxThinking = on;
      thinkBtns().forEach(function (btn) {
        btn.classList.toggle("on", on);
        btn.setAttribute("aria-pressed", on ? "true" : "false");
      });
    }
    if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", apply);
    else apply();
    [200, 800, 1600].forEach(function (d) { setTimeout(apply, d); });
    document.addEventListener("click", function (e) {
      var btn = e.target.closest && e.target.closest(".lxfd-comp-left .lxfd-toggle");
      if (!btn || !/深度思考/.test(btn.textContent)) return;
      // 交给已有处理器完成切换与 window.__lxThinking 赋值后，这里只做持久化
      setTimeout(function () { writeStored(!!root.__lxThinking); }, 0);
    });
  })();

  // ── A3 登录拦截保存来源：未登录点击对话记录/购物车/订单，弹现有 openLogin，记录目标回调；
  // 登录成功后自动执行原目标；同一入口在弹窗展示期间不重复弹。挂载点见 app.js 对应改动。
  (function loginGuard() {
    var pending = null; // { trigger, run }
    function requireLogin(trigger, run) {
      var st = root.__lxState;
      if (st && st.user) { if (typeof run === "function") run(); return true; }
      if (pending && pending.trigger === trigger) return false; // 同一入口已在弹，避免重复弹窗
      pending = { trigger: trigger, run: run };
      if (typeof root.openLogin === "function") root.openLogin();
      return false;
    }
    function onLoginSuccess() {
      var p = pending;
      pending = null;
      // 延后到下一 tick 执行：调用方 login() 紧接着还会执行自己的 closeModal() 关登录框，
      // 若目标回调（如历史记录）同步在这里弹出新弹层，会被那句 closeModal() 立即带走；
      // 错开一拍，等登录框先关完，再安全地开新目标。
      if (p && typeof p.run === "function") { setTimeout(function () { try { p.run(); } catch (_e) {} }, 0); }
    }
    function onLoginDismiss() { pending = null; }
    root.__lxShell = root.__lxShell || {};
    root.__lxShell.requireLogin = requireLogin;
    root.__lxShell.onLoginSuccess = onLoginSuccess;
    root.__lxShell.onLoginDismiss = onLoginDismiss;
  })();

  // ── A4 快捷入口「更多」浮层移出延时收起：现有 CSS :hover 已能悬停展开、移向浮层不提前关闭
  // （.more-wrap::after 桥接区 + :hover 组合选择器），唯独整体移出没有 150-300ms 缓冲，鼠标略微
  // 抖动就整个收起。这里用 JS 维护 .lx-more-open 类补一层带延时的关闭，不改现有测宽溢出/展开逻辑。
  (function moreWrapHoverDelay() {
    var DELAY = 220;
    var timers = new WeakMap();
    function clearTimer(wrap) {
      var t = timers.get(wrap);
      if (t) { clearTimeout(t); timers.delete(wrap); }
    }
    document.addEventListener("mouseover", function (e) {
      var wrap = e.target.closest && e.target.closest(".more-wrap");
      if (!wrap || (e.relatedTarget && wrap.contains(e.relatedTarget))) return;
      clearTimer(wrap);
      wrap.classList.add("lx-more-open");
    }, true);
    document.addEventListener("mouseout", function (e) {
      var wrap = e.target.closest && e.target.closest(".more-wrap");
      if (!wrap || (e.relatedTarget && wrap.contains(e.relatedTarget))) return;
      clearTimer(wrap);
      timers.set(wrap, setTimeout(function () { wrap.classList.remove("lx-more-open"); }, DELAY));
    }, true);
  })();

  // ── A5 猜你干嘛分步导购：输入含「帮我推荐」类词 → 输入框顶部出问题+选项条（品类→用途→预算）。
  // 点选项只写自然语言草稿到输入框，不自动发送；可点前置步骤返回修改，清除依赖后续槽位重新提问；
  // 必选槽位齐后由用户手动点发送（沿用现有发送按钮/回车，本模块不触发提交）。
  (function guideFunnel() {
    var TARGETS = [
      { form: "#lxfdComposer", ta: "#lxfdTa" },
      { form: ".composer", ta: "textarea" }
    ];
    var TRIGGER_RE = /帮.{0,3}推荐/;
    var ROUNDS = [
      { key: "category", short: "品类", label: "先看看你想要哪类产品", options: ["笔记本电脑", "台式机", "平板", "显示器", "打印机"] },
      { key: "usage", short: "用途", label: "主要用来做什么", options: ["日常办公", "在校学习", "玩游戏", "设计创作", "家用影音"] },
      { key: "budget", short: "预算", label: "预算大概多少", options: ["3000元以下", "3000-5000元", "5000-8000元", "8000-12000元", "12000元以上"] }
    ];
    var sessions = new WeakMap(); // textarea -> { round, slots, closed, bar }

    function firstUnsetRound(slots) {
      for (var i = 0; i < ROUNDS.length; i++) if (!slots[ROUNDS[i].key]) return i;
      return ROUNDS.length;
    }
    function draftText(slots) {
      var parts = [];
      if (slots.category) parts.push("我想买一台" + slots.category);
      if (slots.usage) parts.push("用来" + slots.usage);
      if (slots.budget) parts.push("预算" + slots.budget);
      if (!parts.length) return "";
      return parts.join("，") + (slots.budget ? "……" : "");
    }
    function positionBar(bar, form) {
      var r = form.getBoundingClientRect();
      bar.style.width = Math.min(r.width, root.innerWidth - 16) + "px";
      bar.style.left = Math.max(8, Math.min(r.left, root.innerWidth - bar.offsetWidth - 8)) + "px";
      bar.style.top = Math.max(8, r.top - bar.offsetHeight - 10) + "px";
    }
    function renderBar(sess, ta, form) {
      var bar = sess.bar;
      var idx = sess.round;
      var complete = idx >= ROUNDS.length;
      var stepsHtml = ROUNDS.map(function (r, i) {
        var val = sess.slots[r.key];
        var cls = i === idx ? "cur" : val ? "done" : "";
        var text = val ? (r.short + "：" + val) : r.short;
        return '<button type="button" class="lx-funnel-step' + (cls ? " " + cls : "") + '" data-funnel-step="' + i + '"' + (val ? "" : " disabled") + '>' + escHtml(text) + "</button>";
      }).join("");
      var bodyHtml = complete
        ? '<div class="lx-funnel-done">已帮你补全需求草稿，确认无误后点发送即可。</div>'
        : '<div class="lx-funnel-q">' + escHtml(ROUNDS[idx].label) + '</div><div class="lx-funnel-opts">' +
          ROUNDS[idx].options.map(function (op) { return '<button type="button" class="lx-funnel-opt" data-funnel-opt="' + escHtml(op) + '">' + escHtml(op) + "</button>"; }).join("") +
          "</div>";
      bar.innerHTML = '<div class="lx-funnel-steps">' + stepsHtml + '</div>' + bodyHtml + '<button type="button" class="lx-funnel-close" aria-label="关闭猜你干嘛引导">×</button>';
      positionBar(bar, form);
    }
    function ensureSession(ta) {
      var sess = sessions.get(ta);
      if (!sess) { sess = { round: 0, slots: {}, closed: false, bar: null }; sessions.set(ta, sess); }
      return sess;
    }
    function wireBar(sess, ta, form) {
      sess.bar.addEventListener("click", function (e) {
        var optBtn = e.target.closest("[data-funnel-opt]");
        if (optBtn) {
          var round = ROUNDS[sess.round];
          if (!round) return;
          sess.slots[round.key] = optBtn.getAttribute("data-funnel-opt");
          sess.round = firstUnsetRound(sess.slots);
          ta.value = draftText(sess.slots);
          ta.dispatchEvent(new Event("input", { bubbles: true }));
          try { ta.focus(); var L = ta.value.length; ta.setSelectionRange(L, L); } catch (_e) {}
          renderBar(sess, ta, form);
          return;
        }
        var stepBtn = e.target.closest("[data-funnel-step]");
        if (stepBtn && !stepBtn.disabled) {
          var i = Number(stepBtn.getAttribute("data-funnel-step"));
          // 返回修改前置答案：清空该轮及之后所有槽位，禁止静默覆盖，重新逐轮提问
          for (var k = i; k < ROUNDS.length; k++) delete sess.slots[ROUNDS[k].key];
          sess.round = i;
          ta.value = draftText(sess.slots);
          ta.dispatchEvent(new Event("input", { bubbles: true }));
          renderBar(sess, ta, form);
          return;
        }
        if (e.target.closest(".lx-funnel-close")) { sess.closed = true; closeFunnel(ta); }
      });
    }
    function openFunnel(ta, form) {
      var sess = ensureSession(ta);
      if (sess.bar) return;
      var bar = document.createElement("div");
      bar.className = "lx-funnel-bar";
      document.body.appendChild(bar);
      sess.bar = bar;
      wireBar(sess, ta, form);
      renderBar(sess, ta, form);
      requestAnimationFrame(function () { bar.classList.add("show"); });
    }
    function closeFunnel(ta) {
      var sess = sessions.get(ta);
      if (!sess || !sess.bar) return;
      var bar = sess.bar;
      sess.bar = null;
      bar.classList.remove("show");
      setTimeout(function () { try { bar.remove(); } catch (_e) {} }, 180);
    }
    function checkTrigger(ta, form) {
      var sess = sessions.get(ta);
      var val = ta.value || "";
      if (!val.trim()) {
        if (sess) { sess.closed = false; sess.round = 0; sess.slots = {}; }
        closeFunnel(ta);
        return;
      }
      if (sess && sess.closed) return;
      if (sess && sess.bar) return; // 已展示中，不重复触发
      if (TRIGGER_RE.test(val)) openFunnel(ta, form);
    }
    function bind() {
      TARGETS.forEach(function (t) {
        document.querySelectorAll(t.form).forEach(function (form) {
          var ta = form.querySelector(t.ta);
          if (!ta || ta.__lxFunnelBound) return;
          ta.__lxFunnelBound = true;
          ta.addEventListener("input", function () { checkTrigger(ta, form); });
        });
      });
    }
    if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", bind);
    else bind();
    [200, 800, 1600].forEach(function (d) { setTimeout(bind, d); });
  })();
})(typeof window !== "undefined" ? window : null);

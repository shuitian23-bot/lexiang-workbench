// 会员与服务场景 AUI 触发与状态编排（P0）。独立文件，不改 app.js 主逻辑结构，只通过
// window.__lxAgentAPI 桥接读写共享状态、复用 ensureModal/openModal/closeModal/addMessage/
// lxOpenInfoTab/openStudentAuth/openEnterpriseAuth/openMemberCenter/openLogin 等既有能力。
// app.js 只在 sendChat 里做了一处「优先委托本模块，未命中则回退既有快路径/官方 SKILL」的
// 最小侵入式接线；企业钻石会员升级弹窗、服务商品推荐页均为本模块新增，事件委托各自独立注册，
// 不与 app.js/p0-order-flow.js 已有的 data-* 委托冲突。
//
// 状态链对齐 skill split-result-generation.md 的 S0-S7：
//   咨询 query → 左侧只说明条件/流程，不弹窗不出按钮（consult）
//   办理意图明确 → 检查登录态 + 当前认证/等级状态 → 满足条件仅在左侧回答尾部出办理按钮（handle）
//   用户点击按钮 → 才打开对应弹窗（学生/企业认证复用既有弹窗；钻石升级为本模块新增弹窗）
//   提交 → 仅 mock 权威回执（异步 3-5s）到达后左侧追加回执消息才显示成功；关闭弹窗=取消非失败
(function () {
  "use strict";

  if (window.__lxMemberSvcLoaded) return;
  window.__lxMemberSvcLoaded = true;

  function api() { return window.__lxAgentAPI || {}; }
  function st() { var a = api(); return typeof a.getState === "function" ? a.getState() : (window.__lxState || {}); }
  function esc(v) {
    var a = api();
    if (typeof a.esc === "function") return a.esc(v);
    return String(v == null ? "" : v).replace(/[&<>"']/g, function (ch) {
      return ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[ch];
    });
  }
  function toast(t) { var a = api(); if (typeof a.toast === "function") a.toast(t); }
  // 左侧消息：role 传 "assistant" 走既有逐字生成器（正文完成后 extraHtml/按钮才揭示），
  // 与 skill 要求的「正文逐字完成 → 结果卡/按钮出现」顺序天然一致，不必另写动画。
  function addMessage(role, text, extraHtml) {
    var a = api();
    return typeof a.addMessage === "function" ? a.addMessage(role, text, extraHtml || "") : null;
  }
  function appendAiHtml(node, html) {
    if (!node || !html) return;
    var a = api();
    var body = typeof a.lxEnsureAiBody === "function" ? a.lxEnsureAiBody(node) : (node.querySelector && node.querySelector(".ai-body"));
    if (body) body.insertAdjacentHTML("beforeend", html);
  }
  // 结果卡（右侧 Tab 入口）挂载后的入场等待：优先等 animationend，没有动画定义时 700ms 兜底降级，
  // 保证「结果卡完成展示 → 才创建/激活右侧 Tab」这一步不被并发定时器抢先。
  function waitCardReveal(cardEl) {
    return new Promise(function (resolve) {
      var reduced = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      if (!cardEl || reduced) { requestAnimationFrame(function () { requestAnimationFrame(resolve); }); return; }
      cardEl.classList.add("lx-document-card-enter");
      var done = function () { resolve(); };
      cardEl.addEventListener("animationend", done, { once: true });
      window.setTimeout(done, 700);
    });
  }

  function isLoggedIn() {
    var s = st();
    var m = window.__lxMember;
    var offLogged = m && m.guest === false;
    return !!(offLogged || (s && s.user));
  }
  // 未登录触发会员/办理场景：先走既有登录引导，不展示虚拟数据、不继续走本轮意图。
  function requireLogin(prompt) {
    if (isLoggedIn()) return true;
    addMessage("assistant", prompt || "这项服务需要先登录账号，请完成登录后我再为你继续办理。");
    var a = api();
    if (typeof a.openLogin === "function") a.openLogin();
    return false;
  }

  var DISCLAIMER = "内容由联想乐享基于当前信息生成，请在使用前核对关键信息。";

  // ── 学生 / 企业 / 钻石会员：认证状态读取（复用既有 lxStuState/lxEntState，钻石态挂在
  //    企业状态对象的 diamond 子字段上，写回同一 lexiang.enterprise.v1 key，不新开状态源） ──
  var LX_DIAMOND_REVIEW_MS = 4200; // 3-5s 权威回执窗口
  function readStuState() {
    var a = api();
    return typeof a.lxStuState === "function" ? a.lxStuState() : { status: "none" };
  }
  function readEntState() {
    var a = api();
    var ent = typeof a.lxEntState === "function" ? a.lxEntState() : { status: "none" };
    if (!ent.diamond || typeof ent.diamond !== "object") ent.diamond = { status: "none" };
    if (ent.diamond.status === "pending" && ent.diamond.submittedAt && Date.now() - ent.diamond.submittedAt > LX_DIAMOND_REVIEW_MS) {
      ent.diamond.status = "verified";
      ent.tier = "钻石";
      saveEntState(ent);
    }
    if (!ent.tier && ent.status === "verified") ent.tier = "铂金";
    return ent;
  }
  function saveEntState(ent) {
    var a = api();
    if (typeof a.lxSaveEntState === "function") a.lxSaveEntState(ent);
  }

  // ── 咨询 / 办理 意图判定：本地关键词规则（app-intent.js matchControl 同款模式，0 延迟秒判） ──
  var CONSULT_RE = /(需要什么|要什么材料|哪些材料|哪些条件|什么条件|材料是什么|条件是什么|怎么样认证|怎么认证|如何认证|如何升级|怎么升级|流程是|认证流程|升级流程|有什么权益|什么权益|有什么好处|什么好处|区别|对比|介绍一下|说明一下|了解一下)/;
  var HANDLE_RE = /(我(现在|要|想|准备|已经)?.{0,4}(去|来)?(要|做|办|申请|提交|开始|升级)|现在(就)?(办|申请|升级)|去(认证|升级)|办理(认证|升级)?|申请认证|立即(认证|升级)|马上(认证|升级)|帮我(认证|升级|办))/;
  function classifyIntent(t) {
    var isConsult = CONSULT_RE.test(t);
    var isHandle = HANDLE_RE.test(t);
    if (isHandle && !isConsult) return "handle";
    if (isConsult) return "consult";
    return "consult"; // 域词命中但既非明确咨询也非明确办理：默认按咨询处理，不抢先出按钮
  }

  // ── 学生认证（MEM-02） ──────────────────────────────────────────────────────
  var STUDENT_DOMAIN_RE = /(学生认证|在校生认证|高考生认证|教师认证|教育认证)/;
  function handleStudentDomain(t) {
    if (!STUDENT_DOMAIN_RE.test(t)) return false;
    var intent = classifyIntent(t);
    if (intent === "consult") {
      addMessage("assistant", "学生教育认证面向在校生、教师和高考生开放，可选 edu 邮箱、学生证、微信学籍等方式核验身份，认证通过后享受教育专享价，还能与国补叠加使用。你可以直接说「我现在要做学生认证」办理。\n\n" + DISCLAIMER);
      return true;
    }
    if (!requireLogin("学生认证需要先登录账号，请完成登录后我再为你继续办理。")) return true;
    var stu = readStuState();
    if (stu.status === "verified") {
      addMessage("assistant", "你的学生认证已通过，教育专享价已生效，无需重复办理。");
      return true;
    }
    if (stu.status === "pending") {
      addMessage("assistant", "你的学生认证资料已提交，正在审核中，请耐心等待审核结果，无需重复提交。", '<div class="lx-p0-actions"><button class="lx-p0-btn" type="button" data-open-stuauth="college">查看认证进度</button></div>');
      return true;
    }
    addMessage("assistant", "你符合学生认证条件，认证通过后可享受教育专享价并叠加国补。", '<div class="lx-p0-actions"><button class="lx-p0-btn primary" type="button" data-open-stuauth="college">立即认证</button></div>');
    return true;
  }

  // ── 企业会员认证（MEM-03） ──────────────────────────────────────────────────
  var ENTERPRISE_DOMAIN_RE = /(企业(采购负责人)?认证|企业会员认证|企业身份认证)/;
  function handleEnterpriseDomain(t) {
    if (!ENTERPRISE_DOMAIN_RE.test(t)) return false;
    var intent = classifyIntent(t);
    if (intent === "consult") {
      addMessage("assistant", "企业采购负责人认证需要提交企业/机构名称、统一社会信用代码（选填）和采购负责人联系方式，认证通过后解锁企业专享价、采购补贴、对公付款与专票账期等权益。你可以直接说「我现在要企业认证」办理。\n\n" + DISCLAIMER);
      return true;
    }
    if (!requireLogin("企业认证需要先登录账号，请完成登录后我再为你继续办理。")) return true;
    var ent = readEntState();
    if (ent.status === "verified") {
      addMessage("assistant", "「" + esc(ent.company || "贵公司") + "」的企业采购负责人认证已通过，企业专享价与采购补贴已生效，无需重复办理。");
      return true;
    }
    if (ent.status === "pending") {
      addMessage("assistant", "企业认证资料已提交，正在审核中，请耐心等待审核结果，无需重复提交。", '<div class="lx-p0-actions"><button class="lx-p0-btn" type="button" data-open-ent>查看认证进度</button></div>');
      return true;
    }
    // 不得仅按产品线（如 ThinkPad）推断已具备企业身份：这里只依据真实认证状态判断，符合条件仅出按钮不弹窗。
    addMessage("assistant", "你符合企业采购负责人认证条件，认证通过后可解锁企业专享价、采购补贴与对公专票账期。", '<div class="lx-p0-actions"><button class="lx-p0-btn primary" type="button" data-open-ent>立即认证企业会员</button></div>');
    return true;
  }

  // ── 企业钻石会员升级（MEM-04，全新） ─────────────────────────────────────────
  var DIAMOND_DOMAIN_RE = /(钻石会员|钻石升级|升级钻石|企业钻石)/;
  function handleDiamondDomain(t) {
    if (!DIAMOND_DOMAIN_RE.test(t)) return false;
    var intent = classifyIntent(t);
    if (intent === "consult") {
      addMessage("assistant", "企业钻石会员是企业采购负责人认证之上的更高等级：在铂金权益基础上叠加专属客户经理、优先备货和更高比例的采购返点。完成企业认证并达到条件后，即可申请升级。\n\n" + DISCLAIMER);
      return true;
    }
    if (!requireLogin("升级钻石会员需要先登录账号，请完成登录后我再为你继续办理。")) return true;
    var ent = readEntState();
    if (ent.status !== "verified") {
      addMessage("assistant", "升级企业钻石会员需要先完成企业采购负责人认证，请先办理企业认证。", '<div class="lx-p0-actions"><button class="lx-p0-btn primary" type="button" data-open-ent>立即认证企业会员</button></div>');
      return true;
    }
    if (ent.diamond.status === "verified") {
      addMessage("assistant", "「" + esc(ent.company || "贵公司") + "」已是企业钻石会员，专属权益已生效，无需重复升级。");
      return true;
    }
    if (ent.diamond.status === "pending") {
      addMessage("assistant", "钻石会员升级申请已提交，正在审核中，请耐心等待审核结果，无需重复提交。", '<div class="lx-p0-actions"><button class="lx-p0-btn" type="button" data-open-diamond>查看升级进度</button></div>');
      return true;
    }
    addMessage("assistant", "「" + esc(ent.company || "贵公司") + "」当前为" + esc(ent.tier || "铂金") + "会员，符合钻石升级条件。", '<div class="lx-p0-actions"><button class="lx-p0-btn primary" type="button" data-open-diamond>立即升级</button></div>');
    return true;
  }

  // 钻石升级弹窗：仅由「立即升级」/「查看升级进度」按钮点击打开，不自动弹出。复用 ensureModal/openModal/closeModal。
  function openDiamondUpgrade() {
    var a = api();
    if (typeof a.openModal !== "function") return;
    var ent = readEntState();
    if (ent.status !== "verified") {
      toast("请先完成企业认证");
      if (typeof a.openEnterpriseAuth === "function") a.openEnterpriseAuth();
      return;
    }
    if (ent.diamond.status === "verified") {
      a.openModal("企业钻石会员", '<div class="lx-ent-status ok"><strong>' + esc(ent.company || "贵公司") + '</strong> 已是企业钻石会员</div><ul class="lx-md-list"><li>专属客户经理一对一服务</li><li>大促及紧俏机型优先备货</li><li>更高比例的采购返点</li><li>企业专属活动优先邀请</li></ul>');
      return;
    }
    if (ent.diamond.status === "pending") {
      a.openModal("钻石升级审核中", '<div class="lx-ent-status pending">「' + esc(ent.company || "") + '」的钻石升级申请已提交，正在审核</div><p class="lx-p0-disclaimer">演示环境约 4 秒自动完成；正式环境以企业服务审核结果为准，结果会在本页面回显。</p>');
      return;
    }
    var tier = ent.tier || "铂金";
    var html =
      '<p class="lx-p0-disclaimer">当前企业等级：<strong>' + esc(tier) + '会员</strong>，升级后享钻石专属权益。</p>' +
      '<div class="lx-mem-diamond-compare">' +
        '<div class="col"><div class="hd">' + esc(tier) + '（当前）</div><ul><li>企业专享价</li><li>采购补贴</li><li>对公专票与账期</li></ul></div>' +
        '<div class="col hl"><div class="hd">钻石（升级后）</div><ul><li>专属客户经理一对一服务</li><li>紧俏机型优先备货</li><li>更高比例采购返点</li><li>企业专属活动优先邀请</li></ul></div>' +
      '</div>' +
      '<div class="lx-p0-actions"><button class="lx-p0-btn" type="button" data-modal-close>取消</button><button class="lx-p0-btn primary" type="button" data-diamond-submit>确认升级</button></div>' +
      '<p class="lx-stuauth-disclaimer">POC 演示流程，不真实提交，演示约 4 秒自动通过审核。</p>';
    a.openModal("企业钻石会员升级", html);
    var mask = document.querySelector(".lx-p0-modal-mask");
    if (mask) mask.addEventListener("click", onDiamondModalClick, true);
  }
  function onDiamondModalClick(event) {
    var a = api();
    if (event.target.closest("[data-modal-close]")) {
      var mask = document.querySelector(".lx-p0-modal-mask");
      if (mask) mask.removeEventListener("click", onDiamondModalClick, true);
      if (typeof a.closeModal === "function") a.closeModal(); else if (typeof window.closeModal === "function") window.closeModal();
      return; // 关闭弹窗=取消，非失败
    }
    if (event.target.closest("[data-diamond-submit]")) {
      var maskEl = document.querySelector(".lx-p0-modal-mask");
      if (maskEl) maskEl.removeEventListener("click", onDiamondModalClick, true);
      var ent = readEntState();
      ent.diamond = { status: "pending", submittedAt: Date.now() };
      saveEntState(ent);
      if (typeof a.closeModal === "function") a.closeModal();
      toast("钻石升级申请已提交，审核中");
      window.setTimeout(function () {
        var latest = readEntState();
        if (latest.diamond.status === "verified") {
          toast("企业钻石会员升级成功");
          addMessage("assistant", "好消息：「" + esc(latest.company || "贵公司") + "」的企业钻石会员升级已通过权威回执确认，专属客户经理、优先备货和更高采购返点已生效。");
        }
      }, LX_DIAMOND_REVIEW_MS + 400);
    }
  }
  document.addEventListener("click", function (event) {
    if (event.target.closest("[data-open-diamond]")) openDiamondUpgrade();
  });

  // ── 会员中心关注点聚焦（MEM-01 增强） ────────────────────────────────────────
  // 与 lxRenderVipSkin 的 7 大模块（等级成长/乐豆/权益/任务/活动/兑换/测评）关键词对齐，
  // 打开/更新同一会员中心 Tab 后滚动到并高亮命中的模块区块，不新开重复 Tab。
  var MC_TOPIC_RE = /(乐豆|积分商城|积分兑换|会员等级|会员权益|成长值|每日签到|签到|会员活动|会员评测|兑换记录)/;
  var MC_SELF_RE = /(我的|我有|我现在|查一下我|帮我看看我|我还有|我一共|我总共|帮我查)/;
  var COUPON_TOPIC_RE = /(优惠券|代金券|限时红包)/;
  var MC_FOCUS_MAP = [
    { re: /(乐豆|兑换|积分商城|积分兑换|兑换记录|抵现)/, mod: "乐豆" },
    { re: /(签到|任务|打卡|赚豆)/, mod: "任务" },
    { re: /(活动|会员日|试用|限时)/, mod: "活动" },
    { re: /(成长值|升级|等级)/, mod: "等级成长" },
    { re: /(权益|黑卡|专属|特权)/, mod: "权益" },
    { re: /(评测|测评|晒单)/, mod: "测评" },
  ];
  function resolveFocusMod(t) {
    for (var i = 0; i < MC_FOCUS_MAP.length; i++) if (MC_FOCUS_MAP[i].re.test(t)) return MC_FOCUS_MAP[i].mod;
    return "";
  }
  function cssEsc(v) { return window.CSS && CSS.escape ? CSS.escape(v) : String(v).replace(/"/g, '\\"'); }
  function openMemberCenterFocused(t) {
    var a = api();
    if (typeof a.openMemberCenter !== "function") return;
    a.openMemberCenter();
    var mod = resolveFocusMod(t);
    if (!mod) return;
    requestAnimationFrame(function () {
      requestAnimationFrame(function () {
        var el = document.querySelector('.lx-mem-floor[data-mem-floor="' + cssEsc(mod) + '"]');
        if (!el) return;
        el.scrollIntoView({ behavior: "smooth", block: "start" });
        el.classList.add("lx-mem-focus-hl");
        window.setTimeout(function () { el.classList.remove("lx-mem-focus-hl"); }, 2600);
      });
    });
  }
  function handleMemberFocusDomain(t) {
    var isCoupon = COUPON_TOPIC_RE.test(t) && MC_SELF_RE.test(t);
    var isMember = MC_TOPIC_RE.test(t) && MC_SELF_RE.test(t);
    if (!isCoupon && !isMember) return false;
    if (!requireLogin("查看会员资产需要先登录账号，请完成登录后我再为你打开。")) return true;
    if (isCoupon) {
      addMessage("assistant", "已为你打开优惠与活动中心，可以查看当前可用的优惠券。");
      var a = api();
      if (typeof a.openCouponCenter === "function") a.openCouponCenter();
      return true;
    }
    addMessage("assistant", "已为你打开会员中心，并定位到你关心的信息。");
    openMemberCenterFocused(t);
    return true;
  }

  // ── 服务商品推荐（SVC-01） ───────────────────────────────────────────────────
  var SVC_CLEAN_RE = /(清灰|除尘|清洁保养|清洁维护)/;
  var SVC_EXTEND_RE = /(延保|延长保修|保修延长)/;
  var SVC_MAINT_RE = /(保养套餐|维护套餐|上门保养)/;
  var SVC_REPAIR_DISPATCH_RE = /(上门维修|维修服务|报修|送修)/;
  var SVC_ANY_RE = new RegExp([SVC_CLEAN_RE.source, SVC_EXTEND_RE.source, SVC_MAINT_RE.source, SVC_REPAIR_DISPATCH_RE.source].join("|"));
  // 纯故障咨询（无明确服务办理词）不触发，交由正常对话/端侧诊断路由。
  var FAULT_ONLY_RE = /^(电脑|笔记本|台式|主机)?(很)?(卡|卡顿|变卡|蓝屏|死机|开不了机|黑屏|发烫|噪音大|风扇响|没反应)(了|啊|吗|呢)?[?？]?$/;
  var DEVICE_RE = /(thinkpad|拯救者|legion|小新|yoga|天逸|thinkbook|thinkcentre|thinkstation|笔记本|台式机|电脑|主机|工作站|服务器|平板)/i;
  var REGION_RE = /(北京|上海|广州|深圳|杭州|成都|武汉|南京|西安|重庆|苏州|天津|我(的|家|公司)|家里|公司)/;

  var SVC_CATALOG = [
    { id: "svc-clean-std", name: "标准清灰保养服务", desc: "拆机除尘、散热硅脂更换、风道清洁，适用于笔记本与台式机。", price: 99, image: "/assets/img/shop-4.jpg", type: "clean" },
    { id: "svc-clean-deep", name: "深度清洁保养套餐", desc: "在标准清灰基础上增加键盘、接口深度清洁与整机性能检测。", price: 179, image: "/assets/img/shop-10.jpg", type: "clean" },
    { id: "svc-extend-2y", name: "延保服务·两年质保延长", desc: "在原厂保修基础上延长 2 年整机保修，可选加购意外损坏保障。", price: 399, image: "/assets/img/shop-5.jpg", type: "extend" },
  ];
  function buildSvcItems(t) {
    var wantExtend = SVC_EXTEND_RE.test(t);
    var wantClean = SVC_CLEAN_RE.test(t) || SVC_MAINT_RE.test(t);
    var list = SVC_CATALOG.slice();
    if (wantExtend && !wantClean) list.sort(function (x, y) { return (x.type === "extend" ? -1 : 0) - (y.type === "extend" ? -1 : 0); });
    else if (wantClean && !wantExtend) list.sort(function (x, y) { return (x.type === "clean" ? -1 : 0) - (y.type === "clean" ? -1 : 0); });
    return list;
  }
  function renderSvcPage(items) {
    var rows = items.map(function (item, idx) {
      return '<div class="lx-svc-row" data-svc-id="' + esc(item.id) + '">' +
        '<span class="idx">' + (idx + 1) + '</span>' +
        '<img class="shot" src="' + esc(item.image) + '" alt="' + esc(item.name) + '" loading="lazy">' +
        '<div class="main"><strong>' + esc(item.name) + '</strong><span class="desc">' + esc(item.desc) + '</span></div>' +
        '<div class="side"><span class="price">¥' + Number(item.price).toLocaleString("zh-CN") + '</span>' +
          '<div class="acts">' +
            '<button class="lx-p0-btn" type="button" data-svc-detail="' + esc(item.id) + '">查看详情</button>' +
            '<button class="lx-p0-btn primary" type="button" data-svc-buy="' + esc(item.id) + '">立即购买</button>' +
          '</div></div>' +
      '</div>';
    }).join("");
    return '<div class="reco-head"><h2>服务商品推荐</h2><span>已为你匹配 ' + items.length + ' 款服务商品，价格与服务范围以下单页为准</span></div>' +
      '<div class="lx-svc-list">' + rows + '</div>' +
      '<p class="lx-p0-disclaimer">' + DISCLAIMER + '</p>';
  }
  function findSvcItem(id) {
    for (var i = 0; i < SVC_CATALOG.length; i++) if (SVC_CATALOG[i].id === id) return SVC_CATALOG[i];
    return null;
  }
  document.addEventListener("click", function (event) {
    var detailBtn = event.target.closest("[data-svc-detail]");
    if (detailBtn) {
      var item = findSvcItem(detailBtn.getAttribute("data-svc-detail"));
      var a = api();
      if (item && typeof a.openModal === "function") {
        a.openModal(item.name, "<p>" + esc(item.desc) + "</p><p class=\"lx-p0-disclaimer\">具体上门时间以客服确认为准，" + DISCLAIMER + "</p>");
      }
      return;
    }
    var buyBtn = event.target.closest("[data-svc-buy]");
    if (buyBtn) {
      var svc = findSvcItem(buyBtn.getAttribute("data-svc-buy"));
      if (!svc) return;
      if (!requireLogin("购买服务商品需要先登录账号，请完成登录后我再为你下单。")) return;
      var product = { sku: svc.id, name: svc.name, price: svc.price, image_url: svc.image, category: "服务商品" };
      if (window.__lxOrderFlow && typeof window.__lxOrderFlow.buyNow === "function") window.__lxOrderFlow.buyNow(product);
      else toast("下单模块加载中，请稍后重试");
    }
  });

  async function handleSvcDomain(t) {
    if (FAULT_ONLY_RE.test(t)) return false; // 纯故障咨询，走正常对话/端侧诊断
    if (!SVC_ANY_RE.test(t)) return false;
    var a = api();
    var s = st();
    var hasDevice = DEVICE_RE.test(t) || !!(s && s.currentProduct);
    var hasRegion = REGION_RE.test(t);
    if (!hasDevice && !hasRegion) {
      addMessage("assistant", "为了帮你精准匹配服务商品，能告诉我具体是哪款设备、大概在哪个城市吗？例如「ThinkPad 在北京」。");
      return true;
    }
    if (!requireLogin("购买服务商品需要先登录账号，请完成登录后我再为你匹配和下单。")) return true;
    var isRepairDispatchOnly = SVC_REPAIR_DISPATCH_RE.test(t) && !SVC_CLEAN_RE.test(t) && !SVC_EXTEND_RE.test(t) && !SVC_MAINT_RE.test(t);
    if (isRepairDispatchOnly) {
      addMessage("assistant", "暂时没有可直接购买的上门维修标准商品，维修需要先由工程师核实故障情况再报价，无法直接推荐付费服务商品。你可以转人工客服或预约附近门店检测。", '<div class="lx-p0-actions"><button class="lx-p0-btn" type="button" data-human-on>转人工客服</button><button class="lx-p0-btn" type="button" data-quick-ask="帮我查一下附近的联想门店">附近门店</button></div>');
      return true;
    }
    var items = buildSvcItems(t);
    var node = addMessage("assistant", "已根据你提供的设备和地区信息，为你匹配到 " + items.length + " 款服务商品，可查看详情或直接下单。");
    if (node && node._typingDone) { try { await node._typingDone; } catch (_e) {} }
    if (typeof a.renderPageCta === "function") {
      var card = a.renderPageCta({ title: "服务商品推荐", desc: "已为你打开 " + items.length + " 款服务商品", attr: 'data-lx-open-tab="info:svc-reco" aria-label="查看服务商品推荐"' });
      appendAiHtml(node, card);
      var cardEl = node && node.querySelector ? node.querySelector('[data-lx-open-tab="info:svc-reco"]') : null;
      await waitCardReveal(cardEl);
    }
    if (typeof a.lxRevealContent === "function") a.lxRevealContent();
    if (typeof a.lxOpenInfoTab === "function") a.lxOpenInfoTab("svc-reco", "服务商品推荐", renderSvcPage(items));
    return true;
  }

  // 纯判定、零副作用：与下面各 handleXDomain 函数的命中条件逐一对齐，只用来回答「这句话本模块
  // 要不要接手」，不写 DOM、不查登录、不读认证状态。用于在真正处理前决定是否需要先把全屏态
  // 桥接到分屏（bridgeToSplitIfFullscreen），避免误判「不会处理」时白白触发一次全屏收起。
  function willHandle(t) {
    if (STUDENT_DOMAIN_RE.test(t)) return true;
    if (ENTERPRISE_DOMAIN_RE.test(t)) return true;
    if (DIAMOND_DOMAIN_RE.test(t)) return true;
    if ((MC_TOPIC_RE.test(t) || COUPON_TOPIC_RE.test(t)) && MC_SELF_RE.test(t)) return true;
    if (!FAULT_ONLY_RE.test(t) && SVC_ANY_RE.test(t)) return true;
    return false;
  }

  // C-T3 回归修复：会员/服务状态编排原本只接在 app.js sendChat（分屏）里，首屏全屏对话
  // （app-lxfd.js submit()）走的是完全独立的一套官方意图路由，永远不会经过这里，
  // 于是官方 action:edu 等分支抢跑，出现"教育认证"官方按钮而不是本模块的"立即认证"。
  // 与 p0-solution.js 的 bridgeToSplitIfFullscreen 同款：命中时先把全屏对话导出到分屏
  // 并收起全屏，再在分屏里继续走既有处理逻辑（a.addMessage 等分屏专用函数才有正确挂载点）；
  // 已在分屏时直接同步执行，不引入任何延迟或行为变化。
  function bridgeToSplitIfFullscreen(callback) {
    var inFullscreen = document.body.classList.contains("assistant-fullscreen") || document.body.classList.contains("lx-auto-fs");
    if (!inFullscreen) { callback(); return; }
    if (typeof window.__lxfdExportToMain === "function") { try { window.__lxfdExportToMain(); } catch (e) {} }
    if (typeof window.__lxfdExitWithReveal === "function") {
      window.__lxfdExitWithReveal(function () {
        if (window.__lxBridge && typeof window.__lxBridge.prepareRootSplitState === "function") window.__lxBridge.prepareRootSplitState();
        callback();
      });
    } else {
      callback();
    }
  }

  async function handleQueryImpl(t) {
    if (handleStudentDomain(t)) return true;
    if (handleEnterpriseDomain(t)) return true;
    if (handleDiamondDomain(t)) return true;
    if (handleMemberFocusDomain(t)) return true;
    var svcHandled = await handleSvcDomain(t);
    if (svcHandled) return true;
    return false;
  }

  // ── 总入口：app.js sendChat（分屏）与 app-lxfd.js submit()（首屏全屏）都在各自「精确短句快
  // 路径之后、matchControl/官方意图路由之前」调用同一个入口，未命中时对两条路径都零副作用。
  async function handleQuery(text) {
    var t = String(text || "").trim();
    if (!t || t.length > 120) return false;
    if (!willHandle(t)) return false;
    return new Promise(function (resolve) {
      bridgeToSplitIfFullscreen(function () {
        handleQueryImpl(t).then(resolve).catch(function () { resolve(false); });
      });
    });
  }

  window.__lxMemberSvc = { handleQuery: handleQuery, openDiamondUpgrade: openDiamondUpgrade };
})();

(function () {
  "use strict";

  var icons = {
    next: "/assets/icons/global-next.svg",
    expand: "/assets/icons/global-expand.svg",
    check: "/assets/icons/global-check.svg",
    sparkle: "/assets/icons/global-sparkle.svg",
    account: "/assets/icons/mall-account.svg",
    membership: "/assets/icons/shortcut-membership.svg",
    rewards: "/assets/icons/shortcut-rewards.svg",
    customization: "/assets/icons/shortcut-customization.svg",
    trial: "/assets/icons/shortcut-trial.svg",
    referrals: "/assets/icons/shortcut-referrals.svg",
    support: "/assets/icons/shortcut-support.svg"
  };

  var state = {
    modalType: "",
    rightView: "",
    rightTabs: [],
    sugKey: "",
    serviceCompare: [],
    serviceRecommended: "",
    serviceMode: "cleaning",
    serviceDeviceId: "",
    serviceSelectedId: "thermal",
    serviceDetailContext: {},
    serviceBuyRunning: false,
    pendingServiceOrder: null,
    serviceOrder: null,
    servicePurchaseStatus: "未购买",
    serviceAppointmentStatus: "未预约",
    requestSequence: 0,
    educationAudience: "college",
    educationMethod: "edu",
    educationPath: "",
    memberCheckedIn: false,
    pendingDeviceBound: false,
    recentDeviceId: "",
    deviceFilter: "all",
    deviceFocusId: "",
    deviceListScrollTop: 0,
    warrantyDevicePickerOpen: false,
    profileTarget: "",
    profilePhoneStatus: "",
    profile: { nickname: "联小想", gender: "secret", birthday: "1998-05-18", phone: "182****4919", customAvatar: "", avatar: "membership" },
    serviceContext: { device: "拯救者游戏本", region: "北京" },
    identityStatus: { student: "unverified" },
    submitted: { student: false, purchase: false, appointment: false }
  };

  var studentAuthStorageKey = "lexiang.student.v1";
  var studentAuthReviewMs = 12000;

  function syncStudentAuthState() {
    var stored;
    try {
      stored = JSON.parse(window.localStorage.getItem(studentAuthStorageKey) || "null");
    } catch (error) {
      return false;
    }
    if (!stored || typeof stored !== "object") return false;
    if (stored.status === "pending" && stored.submittedAt && Date.now() - Number(stored.submittedAt) >= studentAuthReviewMs) {
      stored.status = "verified";
      try { window.localStorage.setItem(studentAuthStorageKey, JSON.stringify(stored)); } catch (error) {}
    }
    var nextStatus = stored.status === "verified" ? "verified" : stored.status === "pending" ? "reviewing" : "unverified";
    if (state.identityStatus.student === nextStatus) return false;
    state.identityStatus.student = nextStatus;
    return true;
  }

  function refreshStudentAuthState() {
    if (!syncStudentAuthState()) return;
    if (state.rightView === "member" || state.rightView === "education") refreshRightView();
  }

  var serviceCatalog = {
    clean: { id: "clean", name: "笔记本深度清灰", tag: "清灰/清洁", description: "拆机深度清洁，包含风扇、主板、键盘与机身表面等部位。", price: "¥169起", image: "/assets/img/shop-8.jpg", scope: "适用于多数联想笔记本；使用超过 5 年或存在进液、异物、磕碰时需先检测。" },
    thermal: { id: "thermal", name: "深度清灰 + 更换硅脂", tag: "清灰/换硅脂", description: "在深度清灰基础上更换散热硅脂，并完成清洁后开机检测。", price: "¥299起", image: "/assets/img/shop-1.jpg", scope: "适合游戏本或散热压力较高的设备；具体可用性以设备型号和门店能力为准。" },
    care: { id: "care", name: "整机清洁保养服务", tag: "日常保养", description: "完成外观、键盘、接口和散热风道基础清洁，并提供设备健康检查。", price: "¥129起", image: "/assets/img/shop-13.jpg", scope: "适用于日常清洁保养；拆机项目、配件更换和故障维修需根据设备检测结果另行确认。" },
    appointment: { id: "appointment", name: "深度清灰预约", tag: "购买后服务", description: "已购买对应服务的用户，可按订单与设备进入预约与履约查询。", price: "需先校验订单", image: "/assets/img/shop-13.jpg", scope: "仅对已购买且仍可履约的服务订单开放，需选择可服务门店和时段。" }
  };
  var warrantyCatalog = {
    warrantyYear1: { id: "warrantyYear1", name: "一年整机延保", tag: "整机延保", description: "在当前基础保修到期后，延长 1 年整机保修服务。", price: "¥399起", image: "/assets/img/shop-7.jpg", scope: "适用于当前账号已绑定且尚在可购买期内的拯救者 Y7000P；以实时 SKU 校验为准。" },
    warrantyYear2: { id: "warrantyYear2", name: "两年整机延保", tag: "长期保障", description: "连续延长 2 年整机保修，适合计划长期使用的设备。", price: "¥699起", image: "/assets/img/thinkbook.jpg", scope: "需同时满足设备型号、购买时间与当前保障状态条件；以服务商品系统结果为准。" },
    warrantyDoor: { id: "warrantyDoor", name: "延保 + 上门服务升级", tag: "延保升级", description: "延长保修期，并增加指定地区上门服务权益。", price: "¥899起", image: "/assets/img/shop-8.jpg", scope: "上门范围、服务次数与可购买性需根据设备所在地区再次校验。" }
  };

  var memberAssets = {
    points: {
      pattern: /乐豆/,
      label: "乐豆",
      answer: "你当前有<strong>2,580 乐豆</strong>。近 30 天获得 860、使用 300；明细已在右侧打开。",
      cardDescription: "余额 2,580 · 近 30 天 +860 / -300"
    },
    coupons: {
      pattern: /优惠券/,
      label: "优惠券",
      answer: "你当前有<strong>3 张优惠券</strong>，其中 1 张将在 7 天后到期；可用券详情已在右侧打开。",
      cardDescription: "3 张可用 · 1 张即将到期"
    },
    vouchers: {
      pattern: /代金券/,
      label: "代金券",
      answer: "你当前有<strong>2 张代金券</strong>，分别为教育认证代金券和以旧换新补贴券；详情已在右侧打开。",
      cardDescription: "2 张可用 · 教育/换新场景"
    },
    redpacket: {
      pattern: /红包/,
      label: "限时红包",
      answer: "你当前有<strong>2 个限时红包</strong>，最近 1 个将在明日到期；详情已在右侧打开。",
      cardDescription: "2 个可用 · 最近 1 个明日到期"
    },
    benefitpoints: {
      pattern: /权益点/,
      label: "权益点",
      answer: "你当前有<strong>1,200 权益点</strong>，可用于兑换指定会员服务；明细已在右侧打开。",
      cardDescription: "1,200 权益点 · 可兑换会员服务"
    }
  };

  var deviceCatalog = {
    thinkbook16p: {
      id: "thinkbook16p",
      name: "ThinkBook 16p",
      product: "ThinkBook 16p Gen 5",
      sn: "PF4X****",
      image: "/assets/img/thinkbook.jpg",
      warranty: "基础保修至 2027-08-30",
      purchased: "2025-03-25",
      service: "保障正常"
    },
    legiony7000p: {
      id: "legiony7000p",
      name: "拯救者 Y7000P",
      product: "Legion Y7000P 2025",
      sn: "MP2G****",
      image: "/assets/img/shop-7.jpg",
      warranty: "基础保修至 2027-05-18",
      purchased: "2025-05-18",
      service: "可购买延保服务",
      maintenanceReason: "购机保障节点",
      extensionEligible: true
    },
    yogaair14s: {
      id: "yogaair14s",
      name: "YOGA Air 14s",
      product: "YOGA Air 14s AI 元启",
      sn: "YN3A****",
      image: "/assets/img/shop-8.jpg",
      warranty: "基础保修至 2026-11-06",
      purchased: "2024-11-06",
      service: "保障正常"
    },
    thinkpadt14: {
      id: "thinkpadt14",
      name: "ThinkPad T14",
      product: "ThinkPad T14 Gen 6",
      sn: "PC3K****",
      image: "/assets/img/thinkpad.jpg",
      warranty: "基础保修至 2027-02-16",
      purchased: "2025-02-16",
      service: "企业服务可用"
    },
    xiaoxinpro14: {
      id: "xiaoxinpro14",
      name: "小新 Pro 14",
      product: "小新 Pro 14 2025",
      sn: "PF6N****",
      image: "/assets/img/shop-2.jpg",
      warranty: "基础保修至 2026-10-08",
      purchased: "2024-10-08",
      service: "保障正常"
    },
    tianyi510s: {
      id: "tianyi510s",
      name: "天逸 510S",
      product: "天逸 510S 台式电脑",
      sn: "MJ0A****",
      image: "/assets/img/shop-4.jpg",
      warranty: "基础保修至 2026-08-22",
      purchased: "2023-08-22",
      service: "可购买延保服务",
      maintenanceReason: "临近保修到期",
      extensionEligible: true
    },
    motorazr60: {
      id: "motorazr60",
      name: "moto razr 60",
      product: "moto razr 60 折叠屏",
      sn: "ZY2K****",
      image: "/assets/img/shop-13.jpg",
      warranty: "基础保修至 2027-06-02",
      purchased: "2026-06-02",
      service: "保障正常"
    },
    xiaoxinpadpro: {
      id: "xiaoxinpadpro",
      name: "小新 Pad Pro",
      product: "小新 Pad Pro 12.7",
      sn: "HA1D****",
      image: "/assets/img/shop-10.jpg",
      warranty: "基础保修至 2027-01-12",
      purchased: "2025-01-12",
      service: "保障正常"
    }
  };
  var devicePreviewLimit = 6;
  var deviceAliases = {
    thinkbook16p: ["thinkbook16p", "thinkbook 16p", "think book 16p"],
    legiony7000p: ["拯救者y7000p", "拯救者 y7000p", "legiony7000p", "legion y7000p", "y7000p"],
    yogaair14s: ["yogaair14s", "yoga air 14s", "air14s", "air 14s"],
    thinkpadt14: ["thinkpadt14", "thinkpad t14", "think pad t14"],
    xiaoxinpro14: ["小新pro14", "小新 pro 14"],
    tianyi510s: ["天逸510s", "天逸 510s"],
    motorazr60: ["motorazr60", "moto razr 60", "razr60", "razr 60"],
    xiaoxinpadpro: ["小新padpro", "小新 pad pro", "padpro", "pad pro"]
  };
  var pendingPurchasedDevice = {
    id: "xiaoxinpro16",
    name: "小新 Pro 16",
    product: "小新 Pro 16 2026",
    sn: "PF8Q****",
    image: "/assets/img/shop-2.jpg",
    warranty: "基础保修至 2028-08-12",
    purchased: "2026-08-12",
    service: "保障正常"
  };

  var ledouCatalog = [
    { id: "organizer", name: "乐享桌面收纳套装", price: "¥19.9 + 1,000 乐豆", icon: icons.rewards, description: "桌面线材与小物分类收纳，适合家庭和办公桌面。" },
    { id: "nightlight", name: "便携氛围小夜灯", price: "¥13.9 + 600 乐豆", icon: icons.customization, description: "便携柔光照明，适合床头、桌面和差旅使用。" },
    { id: "mouse", name: "无线静音鼠标", price: "¥113 + 600 乐豆", icon: icons.trial, description: "静音按键与无线连接，适合日常移动办公。" }
  ];

  var copy = {
    student: {
      title: "教育认证",
      description: "选择身份与认证方式，补齐对应材料后提交。审核结果以教育认证服务回执为准。",
      button: "立即认证",
      query: "我想办理学生教育认证"
    },
    purchase: {
      title: "确认购买服务",
      description: "请核对服务、设备、地区与价格。提交后以服务商品系统回执为准。",
      submitLabel: "确认购买",
      fields: [
        ["服务商品", "select", ["深度清灰 + 更换硅脂"]],
        ["服务设备", "select", ["拯救者游戏本"]],
        ["服务地区", "select", ["北京"]],
        ["参考价格", "select", ["¥299起"]]
      ]
    },
    appointment: {
      title: "确认服务预约",
      description: "请核对已购服务、服务门店与到店时段。预约结果以履约系统回执为准。",
      submitLabel: "确认预约",
      fields: [
        ["已购服务", "select", ["深度清灰 + 更换硅脂"]],
        ["服务门店", "select", ["联想智生活北京中关村店", "联想智生活北京国贸店"]],
        ["到店时段", "select", ["8 月 16 日 10:00–12:00", "8 月 16 日 14:00–16:00"]]
      ]
    },
    deviceBind: {
      title: "绑定新设备",
      description: "填写设备序列号与名称。绑定结果以设备资产服务回执为准。",
      submitLabel: "确认绑定",
      fields: [
        ["设备序列号（SN）", "input", "请输入设备 SN"],
        ["设备名称", "input", "例如：工作用 ThinkPad"],
        ["购买渠道", "select", ["联想官网", "联想官方商城", "线下门店", "其他渠道"]]
      ]
    }
  };

  function escapeHtml(value) {
    return String(value || "").replace(/[&<>"']/g, function (char) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[char];
    });
  }

  function el(selector) { return document.querySelector(selector); }

  function ensureShell() {
    var composer = el(".assistant-panel .composer");
    var textarea = composer && composer.querySelector("textarea");
    var chat = el(".assistant-panel .chat-state");
    var content = el(".shell > .content");
    if (!composer || !textarea || !chat || !content) return null;

    if (!el("#leaiSug")) {
      var sug = document.createElement("section");
      sug.id = "leaiSug";
      sug.className = "leai-sug";
      sug.setAttribute("aria-live", "polite");
      composer.parentNode.insertBefore(sug, composer);
    }
    if (!el("#leaiThread")) chat.innerHTML = '<div class="leai-thread" id="leaiThread"></div>';
    if (!el("#leaiAuiTabs")) {
      content.insertAdjacentHTML("beforeend", '<div class="leai-aui-tabs" id="leaiAuiTabs" hidden></div><div class="leai-aui-view" id="leaiAuiView" hidden></div>');
    }
    if (!el("#leaiModal")) document.body.insertAdjacentHTML("beforeend", modalHtml());
    if (!el("#leaiLab")) document.body.insertAdjacentHTML("beforeend", labHtml());
    return { composer: composer, textarea: textarea, chat: chat, content: content };
  }

  function modalHtml() {
    return '<div class="leai-modal-mask" id="leaiModal" aria-hidden="true">' +
      '<section class="leai-modal" role="dialog" aria-modal="true" aria-labelledby="leaiModalTitle">' +
      '<header class="leai-modal-head"><div><h2 class="leai-modal-title" id="leaiModalTitle"></h2><p class="leai-modal-desc" id="leaiModalDesc"></p></div>' +
      '<button class="leai-modal-close" type="button" data-modal-close>关闭</button></header>' +
      '<form class="leai-modal-body" id="leaiModalForm"></form></section></div>';
  }

  function labHtml() {
    return '<button class="leai-lab-trigger" type="button" id="leaiLabTrigger"><img src="' + icons.sparkle + '" alt="">演示场景</button>' +
      '<aside class="leai-lab" id="leaiLab" aria-hidden="true" aria-label="POC 演示场景与依赖说明">' +
      '<div class="leai-lab-head"><h2 class="leai-lab-title">演示场景</h2><button class="leai-lab-close" type="button" data-lab-close>关闭</button></div>' +
      '<p class="leai-lab-copy">选择场景会回填或发送一条演示 query。SUG 选择本身不发送，办理弹窗仍需用户点击左侧按钮。</p>' +
      '<div class="leai-lab-scenarios">' +
      '<button class="leai-lab-scenario" type="button" data-demo-query="认证" data-demo-mode="draft">输入中 SUG：认证</button>' +
      '<button class="leai-lab-scenario" type="button" data-demo-query="我想打开会员中心" data-demo-mode="send">会员中心右页</button>' +
      '<button class="leai-lab-scenario" type="button" data-demo-query="我的设备" data-demo-mode="send">我的设备：会员中心定位</button>' +
      '<button class="leai-lab-scenario" type="button" data-demo-identity="student-verified">Mock：学生认证已通过</button>' +
      '<button class="leai-lab-scenario" type="button" data-demo-query="我想办理学生教育认证" data-demo-mode="send">学生认证：先按钮后弹窗</button>' +
      '<button class="leai-lab-scenario" type="button" data-demo-query="我想给拯救者游戏本清灰换硅脂，北京地区" data-demo-mode="send">服务商品推荐右页</button>' +
      '</div>' +
      '<section class="leai-dependency"><h3>Mock 依赖</h3><dl>' +
      '<dt>会员数据</dt><dd>会员中心服务；权限：登录+用户授权；兜底：不生成个人数据。</dd>' +
      '<dt>设备数据</dt><dd>设备资产服务；依赖 Lenovo ID 与设备绑定关系；SN 仅脱敏展示。</dd>' +
      '<dt>认证状态</dt><dd>教育认证权威服务；弹窗展示前和按钮点击时二次校验。</dd>' +
      '<dt>服务商品</dt><dd>商品/服务系统；依赖设备、地区、SKU 适用性；无结果时转官方入口或人工。</dd>' +
      '<dt>预约渠道</dt><dd>订单仅展示微信小程序衔接；太阳码、门店、时段与预约结果当前均为 Mock。</dd>' +
      '<dt>完成口径</dt><dd>申请、购买、预约与履约均以下游权威回执为准。</dd>' +
      '</dl></section></aside>';
  }

  function boot() {
    var shell = ensureShell();
    if (!shell) return;
    document.body.classList.remove("assistant-fullscreen", "lx-auto-fs", "assistant-collapsed");
    document.body.dataset.state = "default";
    shell.textarea.placeholder = "输入会员或服务问题";
    var replacement = shell.composer.cloneNode(true);
    shell.composer.replaceWith(replacement);
    shell.composer = replacement;
    shell.textarea = replacement.querySelector("textarea");
    shell.textarea.placeholder = "输入会员或服务问题";
    replacement.querySelectorAll(".lx-suggest-panel").forEach(function (node) { node.remove(); });
    new MutationObserver(function () {
      replacement.querySelectorAll(".lx-suggest-panel").forEach(function (node) { node.remove(); });
    }).observe(replacement, { childList: true, subtree: true });

    document.querySelectorAll("[data-quick-placeholder]").forEach(function (button) {
      button.removeAttribute("aria-disabled");
      button.removeAttribute("tabindex");
    });
    var quicks = ["打开会员中心，查看我的会员权益", "我想办理学生教育认证", "我想给拯救者游戏本清灰换硅脂", "教育认证需要准备哪些材料？", "如何预约深度清灰服务？"];
    document.querySelectorAll("[data-quick-placeholder] span").forEach(function (node, index) { node.textContent = quicks[index]; });

    shell.textarea.addEventListener("input", function () { renderSug(shell.textarea.value); });
    shell.composer.addEventListener("submit", function (event) {
      event.preventDefault();
      event.stopPropagation();
      var query = shell.textarea.value.trim();
      if (!query) return;
      shell.textarea.value = "";
      hideSug();
      runQuery(query);
    });
    shell.textarea.addEventListener("keydown", function (event) {
      if (event.key === "Enter" && !event.shiftKey) {
        event.preventDefault();
        shell.composer.requestSubmit();
      }
    });

    document.addEventListener("click", handleClick, true);
    document.addEventListener("keydown", handleKeydown);
    document.addEventListener("change", handlePageChange, true);
    document.addEventListener("submit", handlePageSubmit);
    renderSug("");
  }

  function handleClick(event) {
    var quick = event.target.closest("[data-quick-placeholder]");
    if (quick) {
      event.preventDefault();
      event.stopImmediatePropagation();
      var text = quick.querySelector("span").textContent.trim();
      el(".assistant-panel .composer textarea").value = text;
      el(".assistant-panel .composer").requestSubmit();
      return;
    }
    var sugOption = event.target.closest("[data-sug-value]");
    if (sugOption) { applySug(sugOption.dataset.sugValue, sugOption.dataset.sugNext || ""); return; }
    if (event.target.closest("[data-sug-close]")) { hideSug(); return; }
    var closeTab = event.target.closest("[data-aui-close-view]");
    if (closeTab) { closeRightView(false, closeTab.dataset.auiCloseView); return; }
    var auiTab = event.target.closest("[data-aui-tab]");
    if (auiTab) { activateRightTab(auiTab.dataset.auiTab); return; }
    var profileOpen = event.target.closest("[data-member-profile-open]");
    if (profileOpen) { openRightView("profile"); return; }
    var profilePhone = event.target.closest("[data-profile-phone-rebind]");
    if (profilePhone) { openPhoneRebindModal(profilePhone); return; }
    var profileAvatar = event.target.closest("[data-profile-avatar]");
    if (profileAvatar) {
      var profileForm = profileAvatar.closest("[data-member-profile-form]");
      profileForm.querySelector("#leaiProfileAvatarValue").value = profileAvatar.dataset.profileAvatar;
      profileForm.querySelectorAll("[data-profile-avatar]").forEach(function (item) {
        var selected = item === profileAvatar;
        item.classList.toggle("is-selected", selected);
        item.setAttribute("aria-pressed", String(selected));
      });
      return;
    }
    if (event.target.closest("[data-ledou-more]")) { openRightView("ledou"); return; }
    var ledouProduct = event.target.closest("[data-ledou-product]");
    if (ledouProduct) { openRightView("ledou-product:" + ledouProduct.dataset.ledouProduct); return; }
    var memberInsight = event.target.closest("[data-member-insight]");
    if (memberInsight) {
      if (memberInsight.dataset.memberInsight === "coupons") openMemberAsset("coupons", memberInsight);
      else if (memberInsight.dataset.memberInsight === "service") openRightView("service");
      else openRightView("ledou");
      return;
    }
    var memberAsset = event.target.closest("[data-member-asset]");
    if (memberAsset) { openMemberAsset(memberAsset.dataset.memberAsset, memberAsset); return; }
    var secondaryBack = event.target.closest("[data-secondary-back]");
    if (secondaryBack) {
      returnFromSecondary(secondaryBack.dataset.secondaryBack || secondaryParentView(state.rightView));
      return;
    }
    var educationBenefit = event.target.closest("[data-education-benefit]");
    if (educationBenefit) {
      if (educationBenefit.dataset.educationBenefit === "coupons") openMemberAsset("coupons", educationBenefit);
      else openRightView("education");
      return;
    }
    var selectionOpen = event.target.closest("[data-selection-open]");
    if (selectionOpen) { openRightView("selection:" + selectionOpen.dataset.selectionOpen); return; }
    var deviceFilter = event.target.closest("[data-device-filter]");
    if (deviceFilter) {
      state.deviceFilter = deviceFilter.dataset.deviceFilter;
      state.deviceFocusId = "";
      refreshRightView();
      return;
    }
    var deviceScroll = event.target.closest("[data-device-scroll]");
    if (deviceScroll) { scrollDeviceBrowser(Number(deviceScroll.dataset.deviceScroll)); return; }
    var deviceMore = event.target.closest("[data-device-more]");
    if (deviceMore) { openRightView("devices"); return; }
    var purchasedDeviceBind = event.target.closest("[data-device-bind-purchased]");
    if (purchasedDeviceBind) { runPurchasedDeviceBind(purchasedDeviceBind); return; }
    var deviceWarranty = event.target.closest("[data-device-warranty]");
    if (deviceWarranty) { runWarrantyRecommendation(deviceWarranty.dataset.deviceWarranty); return; }
    var deviceDetail = event.target.closest("[data-device-detail]");
    if (deviceDetail) { openDeviceDetail(deviceDetail.dataset.deviceDetail); return; }
    var memberCheckin = event.target.closest("[data-member-checkin]");
    if (memberCheckin) { runMemberCheckin(memberCheckin); return; }
    if (event.target.closest("[data-member-checkin-page]")) { openRightView("checkin"); return; }
    var deviceAdd = event.target.closest("[data-device-add]");
    if (deviceAdd) { runAddDeviceTask(); return; }
    var memberTask = event.target.closest("[data-member-task]");
    if (memberTask) { runMemberTask(memberTask.dataset.memberTask, memberTask); return; }
    var serviceDetailResult = event.target.closest("[data-service-detail-result]");
    if (serviceDetailResult) { openServiceDetailView(serviceDetailResult.dataset.serviceDetailResult); return; }
    var serviceDetail = event.target.closest("[data-service-detail]");
    if (serviceDetail) { runServiceDetail(serviceDetail.dataset.serviceDetail); return; }
    var serviceBuy = event.target.closest("[data-service-buy]");
    if (serviceBuy) { startServiceDiscountOrder(serviceBuy.dataset.serviceBuy, serviceBuy); return; }
    var serviceOrderAppointment = event.target.closest("[data-service-order-appointment]");
    if (serviceOrderAppointment) { openRightView("appointment-code"); return; }
    var warrantyDeviceOption = event.target.closest("[data-warranty-device-option]");
    if (warrantyDeviceOption) {
      state.serviceDeviceId = warrantyDeviceOption.dataset.warrantyDeviceOption;
      state.warrantyDevicePickerOpen = false;
      state.serviceCompare = [];
      state.serviceRecommended = "warrantyYear1";
      refreshRightView();
      return;
    }
    if (event.target.closest("[data-warranty-device-trigger]")) {
      state.warrantyDevicePickerOpen = !state.warrantyDevicePickerOpen;
      refreshRightView();
      return;
    }
    var contextOption = event.target.closest("[data-service-context-option]");
    if (contextOption) {
      state.serviceContext[contextOption.dataset.serviceContextOption] = contextOption.dataset.serviceContextValue;
      openRightView("service");
      return;
    }
    var compare = event.target.closest("[data-service-compare]");
    if (compare) { toggleServiceCompare(compare.dataset.serviceCompare); return; }
    var compareRemove = event.target.closest("[data-compare-remove]");
    if (compareRemove) { toggleServiceCompare(compareRemove.dataset.compareRemove); return; }
    if (event.target.closest("[data-compare-clear]")) { state.serviceCompare = []; refreshRightView(); return; }
    var serviceTask = event.target.closest("[data-service-task]");
    if (serviceTask) { runServiceTask(serviceTask.dataset.serviceTask, serviceTask.dataset.serviceId || ""); return; }
    var studentAudience = event.target.closest("[data-student-audience]");
    if (studentAudience) {
      state.educationAudience = studentAudience.dataset.studentAudience;
      state.educationMethod = state.educationAudience === "exam" ? "verified" : state.educationAudience === "teacher" ? "certificate" : "edu";
      renderStudentModal();
      return;
    }
    var studentMethod = event.target.closest("[data-student-method]");
    if (studentMethod) {
      state.educationMethod = studentMethod.dataset.studentMethod;
      renderStudentModal();
      return;
    }
    var action = event.target.closest("[data-leai-action]");
    if (action) { handleAction(action); return; }
    if (event.target.closest("[data-modal-close]")) { closeModal(); return; }
    if (event.target.id === "leaiModal") { closeModal(); return; }
    if (event.target.closest("#leaiLabTrigger")) { toggleLab(true); return; }
    if (event.target.closest("[data-lab-close]")) { toggleLab(false); return; }
    var identityDemo = event.target.closest("[data-demo-identity]");
    if (identityDemo) {
      toggleLab(false);
      resetConversation();
      if (identityDemo.dataset.demoIdentity === "student-verified") {
        state.identityStatus.student = "verified";
        state.submitted.student = false;
      }
      openRightView("member");
      return;
    }
    var demo = event.target.closest("[data-demo-query]");
    if (demo) {
      toggleLab(false);
      resetConversation();
      if (demo.dataset.demoMode === "draft") {
        var input = el(".assistant-panel .composer textarea");
        input.value = demo.dataset.demoQuery;
        input.focus();
        renderSug(input.value);
      } else runQuery(demo.dataset.demoQuery);
      return;
    }
    var filter = event.target.closest("[data-service-filter]");
    if (filter) {
      document.querySelectorAll("[data-service-filter]").forEach(function (item) { item.classList.toggle("is-active", item === filter); });
      el("#leaiServiceHint").textContent = filter.dataset.serviceFilter === "fulfillment" ? "已切换到预约/履约视图，请先选择已购服务商品。" : "结果已按“" + filter.textContent.trim() + "”更新。";
      return;
    }
  }

  function handlePageChange(event) {
    if (event.target.id !== "leaiProfileAvatarFile") return;
    var input = event.target;
    var file = input.files && input.files[0];
    var form = input.closest("[data-member-profile-form]");
    var error = form.querySelector("[data-profile-avatar-error]");
    if (!file) return;
    if (["image/jpeg", "image/png"].indexOf(file.type) < 0) {
      error.textContent = "仅支持 JPG、JPEG、PNG 图片";
      input.value = "";
      return;
    }
    if (file.size > 4 * 1024 * 1024) {
      error.textContent = "图片不能超过 4MB";
      input.value = "";
      return;
    }
    var reader = new FileReader();
    reader.onload = function () {
      var source = String(reader.result || "");
      form.querySelector("#leaiProfileCustomAvatarValue").value = source;
      form.querySelectorAll("[data-profile-avatar-preview]").forEach(function (image) { image.src = source; });
      error.textContent = "头像已载入，保存后同步到会员中心（Mock）";
    };
    reader.onerror = function () { error.textContent = "图片读取失败，请重新选择"; };
    reader.readAsDataURL(file);
  }

  function handlePageSubmit(event) {
    var profileForm = event.target.closest && event.target.closest("[data-member-profile-form]");
    if (!profileForm) return;
    event.preventDefault();
    var nickname = profileForm.querySelector("#leaiProfileNickname").value.trim();
    if (!nickname) {
      profileForm.querySelector("#leaiProfileNickname").setCustomValidity("请输入会员昵称");
      profileForm.reportValidity();
      return;
    }
    profileForm.querySelector("#leaiProfileNickname").setCustomValidity("");
    state.profile.nickname = nickname;
    state.profile.gender = profileForm.querySelector("#leaiProfileGender").value;
    state.profile.birthday = profileForm.querySelector("#leaiProfileBirthday").value;
    var avatarPreset = profileForm.querySelector("#leaiProfileAvatarValue");
    if (avatarPreset) state.profile.avatar = avatarPreset.value;
    var customAvatar = profileForm.querySelector("#leaiProfileCustomAvatarValue");
    if (customAvatar) state.profile.customAvatar = customAvatar.value;
    profileForm.querySelector("[data-profile-save-status]").textContent = "个人信息已保存（Mock）";
  }

  function handleKeydown(event) {
    var activeTab = event.target.closest && event.target.closest("[data-aui-tab]");
    if (activeTab && (event.key === "ArrowLeft" || event.key === "ArrowRight")) {
      event.preventDefault();
      var tabs = Array.prototype.slice.call(document.querySelectorAll("[data-aui-tab]"));
      var current = tabs.indexOf(activeTab);
      var next = event.key === "ArrowRight" ? (current + 1) % tabs.length : (current - 1 + tabs.length) % tabs.length;
      tabs[next].focus();
      activateRightTab(tabs[next].dataset.auiTab);
      return;
    }
    var deviceTrack = event.target.closest && event.target.closest("[data-device-track]");
    if (deviceTrack && (event.key === "ArrowLeft" || event.key === "ArrowRight")) {
      event.preventDefault();
      scrollDeviceBrowser(event.key === "ArrowLeft" ? -1 : 1);
      return;
    }
    if (event.key !== "Escape") return;
    if (el("#leaiModal").classList.contains("is-open")) closeModal();
    else if (el("#leaiLab").classList.contains("is-open")) toggleLab(false);
  }

  function renderSug(raw) {
    var text = String(raw || "").trim();
    if (!text) { hideSug(); return; }
    var config = sugConfig(text);
    if (!config) { hideSug(); return; }
    state.sugKey = config.key;
    var options = config.options.map(function (option, index) {
      return '<button class="leai-sug-option" type="button" data-sug-value="' + escapeHtml(option.value) + '" data-sug-next="' + escapeHtml(option.next || "") + '"><span class="leai-sug-index">' + (index + 1) + '.</span><span>' + escapeHtml(option.label) + '</span></button>';
    }).join("");
    var host = el("#leaiSug");
    host.innerHTML = '<div class="leai-sug-head"><div><p class="leai-sug-kicker">输入中预判</p><p class="leai-sug-question">' + escapeHtml(config.question) + '</p></div><button class="leai-sug-close" type="button" data-sug-close>继续输入</button></div><div class="leai-sug-options">' + options + '</div>';
    host.classList.add("is-visible");
  }

  function sugConfig(text) {
    if (/冒烟|起火|鼓包|进液/.test(text)) return { key: "safety", question: "是否立即查看安全处置建议？", options: [{ label: "查看安全处置建议", value: "我需要查看设备安全处置建议" }, { label: "联系人工客服", value: "我需要联系人工客服" }] };
    if (/认证/.test(text) && !/(学生|教育).*(办理|查询|申请|材料)/.test(text)) return { key: "cert", question: "想先处理哪项教育认证事项？", options: [
      { label: "学生/教育认证", value: "学生教育认证", next: "student" },
      { label: "查询认证状态", value: "我想查询学生教育认证状态" },
      { label: "查看认证材料", value: "教育认证需要哪些材料" }
    ] };
    if (/会员/.test(text) && !/(打开|查看|查询|申请|办理|升级).{0,8}(会员|权益|认证|乐豆|优惠券)/.test(text)) return { key: "member", question: "想处理哪类会员事项？", options: [
      { label: "查会员等级与权益", value: "我想打开会员中心，查看会员等级与权益" },
      { label: "教育优惠/学生认证", value: "学生教育认证", next: "student" },
      { label: "乐豆/优惠券", value: "我想查看乐豆和可用优惠券" }
    ] };
    if (/清灰|保养|换硅脂|服务商品/.test(text) && !/(价格|适用|比较|预约|购买|门店|北京|上海|广州|深圳)/.test(text)) return { key: "clean", question: "想先了解哪项信息？", options: [
      { label: "查看价格", value: "我想查看笔记本深度清灰的价格" },
      { label: "查看适用设备", value: "我想查看深度清灰适用哪些设备" },
      { label: "比较服务内容", value: "我想比较清灰和清灰换硅脂的服务内容" },
      { label: "预约/购买", value: "我想购买并预约笔记本深度清灰服务" },
      { label: "查询可服务门店", value: "我想查询可以做深度清灰的门店" }
    ] };
    if (/服务|售后/.test(text) && text.length < 8) return { key: "service", question: "要处理哪类服务？", options: [
      { label: "设备管理", value: "我想管理已绑定设备" }, { label: "维修服务", value: "我想预约维修" },
      { label: "驱动下载", value: "我想查找并下载驱动" }, { label: "保修/延保", value: "我想查询保修或购买延保" },
      { label: "清灰等服务商品", value: "清灰服务商品" }, { label: "人工客服/留言", value: "我需要联系人工客服" }
    ] };
    return null;
  }

  function applySug(value, next) {
    var input = el(".assistant-panel .composer textarea");
    if (next === "student") { input.value = "学生认证"; renderSecondSug("student"); }
    else { input.value = value; hideSug(); }
    input.focus();
    input.setSelectionRange(input.value.length, input.value.length);
  }

  function renderSecondSug(type) {
    var configs = {
      student: ["想先处理什么？", [["了解优惠政策", "我想了解学生教育优惠政策"], ["办理认证", copy.student.query], ["查询认证状态", "我想查询学生教育认证状态"], ["查看适用商品", "我想查看教育特惠适用商品"]]]
    };
    var config = configs[type];
    var host = el("#leaiSug");
    host.innerHTML = '<div class="leai-sug-head"><div><p class="leai-sug-kicker">输入中预判</p><p class="leai-sug-question">' + config[0] + '</p></div><button class="leai-sug-close" type="button" data-sug-close>继续输入</button></div><div class="leai-sug-options">' + config[1].map(function (item, index) {
      return '<button class="leai-sug-option" type="button" data-sug-value="' + escapeHtml(item[1]) + '"><span class="leai-sug-index">' + (index + 1) + '.</span><span>' + escapeHtml(item[0]) + '</span></button>';
    }).join("") + '</div>';
    host.classList.add("is-visible");
  }

  function hideSug() { var host = el("#leaiSug"); if (host) host.classList.remove("is-visible"); }

  function isVerifiedEducationOfferQuery(query) {
    if (state.identityStatus.student !== "verified") return false;
    var normalized = String(query || "").trim().replace(/[\s，。！？、,.!?]/g, "");
    return /^(?:我想|我要|帮我|请帮我|想要)?(?:查看|看看|了解|咨询)?(?:教育优惠|教育认证|学生认证)$/.test(normalized);
  }

  async function runQuery(query) {
    enterChat();
    var turn = appendTurn(query);
    await nextFrame();
    turn.scrollIntoView({ behavior: prefersReduced() ? "auto" : "smooth", block: "start" });
    if (/冒烟|起火|鼓包|进液/.test(query)) return safetyFlow(turn);
    var compositeTasks = detectCompositeTasks(query);
    if (compositeTasks.length > 1) return compositePageFlow(turn, compositeTasks);
    if (/个人信息|修改头像|更换头像|换头像|修改电话|更换电话|修改手机号|更换手机号|手机号换绑|电话换绑/.test(query)) return profileFlow(turn, query);
    if (/会员签到|签到记录|签到进度/.test(query)) return informationPageFlow(turn, "checkin", "会员签到", "查看连签进度、每日奖励和里程碑");
    if (isVerifiedEducationOfferQuery(query)) return verifiedEducationOfferFlow(turn);
    if (/教育特惠|教育优惠|学生特惠/.test(query) && !/认证|办理|申请/.test(query)) return informationPageFlow(turn, "education", "教育特惠", "查看教育身份适用商品与优惠说明");
    if (/我的订单|服务订单|订单列表/.test(query) && !/购买|下单/.test(query)) return informationPageFlow(turn, "orders", "我的订单", "查看服务订单、状态与预约入口");
    var matchedDevice = deviceFromQuery(query);
    if (matchedDevice) return memberDeviceDetailFlow(turn, matchedDevice);
    if (isDeviceWarrantyQuery(query)) return memberWarrantyFlow(turn);
    if (/我的设备|我的电脑|我的资产|设备资产|已绑定设备|设备管理/.test(query)) return memberDeviceFlow(turn);
    var asset = memberAssetIntent(query);
    if (asset && !/企业|钻石|教育|学生/.test(query)) return memberAssetFlow(turn, asset);
    if (/会员中心|会员权益|乐豆|优惠券|代金券|红包|权益点/.test(query) && !/企业|钻石|教育|学生/.test(query)) return memberFlow(turn);
    if (/学生|教育/.test(query) && /认证|办理|申请/.test(query)) return authFlow(turn);
    if (/详情/.test(query) && /清灰|换硅脂|清洁保养|延保/.test(query)) return serviceDetailQueryFlow(turn, serviceIdFromQuery(query));
    if (/清灰|换硅脂|延保|服务商品/.test(query)) return serviceFlow(turn, query);
    return genericFlow(turn, query);
  }

  function enterChat() {
    document.body.dataset.state = "chat";
    el(".assistant-panel .default-state").style.display = "none";
    el(".assistant-panel .chat-state").style.display = "block";
  }

  function appendTurn(query) {
    var turn = document.createElement("section");
    turn.className = "leai-turn";
    turn.innerHTML = '<div class="leai-user">' + escapeHtml(query) + '</div>';
    el("#leaiThread").appendChild(turn);
    return turn;
  }

  async function streamAnswer(turn, html) {
    var host = document.createElement("div");
    host.className = "leai-ai";
    turn.appendChild(host);
    var plain = String(html).replace(/<[^>]*>/g, "");
    var cursor = document.createElement("span");
    cursor.className = "leai-cursor";
    host.appendChild(cursor);
    if (prefersReduced()) { host.innerHTML = html; return host; }
    var rendered = "";
    for (var i = 0; i < plain.length; i += 1) {
      rendered += plain[i];
      host.textContent = rendered;
      host.appendChild(cursor);
      if (i % 4 === 0) await delay(12);
    }
    host.innerHTML = html;
    return host;
  }

  function appendFixedAnswer(turn, html) {
    var host = document.createElement("div");
    host.className = "leai-ai";
    host.innerHTML = html;
    turn.appendChild(host);
    return host;
  }

  function appendTrace(turn, label) {
    turn.insertAdjacentHTML("beforeend", '<div class="leai-trace"><img src="' + icons.check + '" alt=""><span>' + escapeHtml(label) + '</span></div>');
  }

  function appendDisclaimer(turn) { turn.insertAdjacentHTML("beforeend", '<div class="leai-disclaimer">内容由联想乐享基于当前信息生成，请在使用前核对关键信息。</div>'); }

  function actionCard(type, title, description) {
    return '<button class="leai-action-card" type="button" data-leai-action="' + escapeHtml(type) + '" aria-pressed="false"><span><span class="leai-card-title">' + escapeHtml(title) + '</span><span class="leai-card-desc">' + escapeHtml(description) + '</span></span><span class="leai-card-next"><img src="' + icons.next + '" alt=""></span></button>';
  }

  function memberAssetIntent(query) {
    var matches = Object.keys(memberAssets).filter(function (key) { return memberAssets[key].pattern.test(query); });
    return matches.length === 1 ? matches[0] : "";
  }

  function deviceFromQuery(query) {
    var normalized = String(query || "").toLowerCase().replace(/[\s\-_·]/g, "");
    var id = Object.keys(deviceAliases).find(function (deviceId) {
      return deviceAliases[deviceId].some(function (alias) {
        return normalized.indexOf(alias.toLowerCase().replace(/[\s\-_·]/g, "")) >= 0;
      });
    });
    return id ? deviceCatalog[id] : null;
  }

  function isDeviceWarrantyQuery(query) {
    return /保修|设备保障/.test(query) || (/延保/.test(query) && !/购买|推荐|方案|商品|下单/.test(query));
  }

  async function memberAssetFlow(turn, type) {
    var asset = memberAssets[type];
    await streamAnswer(turn, '<p>' + asset.answer + '</p>');
    appendTrace(turn, "已完成登录、授权与会员资产查询");
    turn.insertAdjacentHTML("beforeend", actionCard("member-asset:" + type, "查看" + asset.label + "详情", asset.cardDescription));
    appendDisclaimer(turn);
    await nextFrame();
    openMemberAsset(type, null);
  }

  async function memberDeviceFlow(turn) {
    var keys = orderedDeviceKeys();
    var recentNames = keys.slice(0, 3).map(function (key) { return deviceCatalog[key].name; }).join("、");
    state.deviceFilter = "all";
    state.deviceFocusId = "";
    await streamAnswer(turn, '<p>当前账号共有<strong>' + keys.length + ' 台已绑定设备</strong>，另有<strong>' + (state.pendingDeviceBound ? "0" : "1") + ' 台待绑定</strong>。最近使用的是 ' + escapeHtml(recentNames) + '；右侧已打开设备列表。</p>');
    appendTrace(turn, "已完成登录、授权与设备资产查询");
    turn.insertAdjacentHTML("beforeend", actionCard("member-devices", "查看我的设备", keys.length + " 台已绑定 · " + (state.pendingDeviceBound ? "无待绑定" : "1 台待绑定")));
    appendDisclaimer(turn);
    await nextFrame();
    openMemberDevices(null);
  }

  async function memberWarrantyFlow(turn) {
    state.deviceFilter = "attention";
    state.deviceFocusId = "";
    var pendingCount = state.pendingDeviceBound ? 0 : 1;
    await streamAnswer(turn, '<p>已查询当前账号的设备保障信息：<strong>2 台设备命中延保推荐节点</strong>，其中天逸 510S 的基础保修将于 2026-08-22 到期；另有<strong>' + pendingCount + ' 台设备待绑定</strong>。</p>');
    appendTrace(turn, "已完成设备资产、购买时间与保障节点查询");
    turn.insertAdjacentHTML("beforeend", actionCard("member-devices", "查看设备保障", "2 台命中延保推荐 · " + pendingCount + " 台待绑定"));
    appendDisclaimer(turn);
    await nextFrame();
    openMemberDevices(null);
  }

  async function memberDeviceDetailFlow(turn, device) {
    state.deviceFilter = "all";
    state.deviceFocusId = device.id;
    await streamAnswer(turn, '<p>已定位到<strong>' + escapeHtml(device.name) + '</strong>（设备编号 ' + escapeHtml(device.sn) + '）。' + escapeHtml(device.warranty) + '，当前保障信息已在右侧打开。</p>');
    appendTrace(turn, "已完成设备型号匹配与资产查询");
    turn.insertAdjacentHTML("beforeend", actionCard("member-devices", "查看 " + device.name + " 设备详情", device.product + " · " + device.warranty));
    appendDisclaimer(turn);
    await nextFrame();
    openMemberDevices(null);
  }

  async function profileFlow(turn, query) {
    state.profileTarget = /电话|手机|换绑/.test(query) ? "phone" : /头像/.test(query) ? "avatar" : "overview";
    await streamAnswer(turn, '<p>已为你打开<strong>个人信息</strong>。头像、昵称等基础资料可在右侧维护；手机号换绑会进入独立安全确认流程。</p>');
    appendTrace(turn, "已完成登录与会员资料权限校验");
    turn.insertAdjacentHTML("beforeend", actionCard("profile", "查看个人信息", "头像、基础资料与手机号安全设置"));
    appendDisclaimer(turn);
    await nextFrame();
    openRightView("profile");
  }

  async function informationPageFlow(turn, view, label, description) {
    await streamAnswer(turn, '<p>已为你打开<strong>' + escapeHtml(label) + '</strong>，可以在右侧查看当前信息与后续入口。</p>');
    appendTrace(turn, "已完成页面意图识别与权限校验");
    turn.insertAdjacentHTML("beforeend", actionCard(view, "查看" + label, description));
    appendDisclaimer(turn);
    await nextFrame();
    openRightView(view);
  }

  async function verifiedEducationOfferFlow(turn) {
    await streamAnswer(turn, '<p>你的<strong>教育认证已通过</strong>，教育优惠权益已生效。已为你打开参与教育优惠活动的商品推荐，可查看适用机型和活动信息。</p>');
    appendTrace(turn, "已完成教育身份与活动资格查询");
    turn.insertAdjacentHTML("beforeend", actionCard("education", "查看教育优惠商品", "参与教育优惠活动的适用商品"));
    appendDisclaimer(turn);
    await nextFrame();
    openRightView("education");
  }

  function detectCompositeTasks(query) {
    var tasks = [];
    function add(key, pattern, view, label, description) {
      var match = query.match(pattern);
      if (!match || tasks.some(function (task) { return task.key === key || (view && task.view === view); })) return;
      tasks.push({ key: key, view: view, label: label, description: description, index: match.index || 0 });
    }
    add("member", /会员中心|会员权益/, "member", "会员中心", "会员资料与权益信息");
    add("profile", /个人信息|修改头像|更换头像|换头像|修改电话|更换电话|修改手机号|更换手机号|手机号换绑|电话换绑/, "profile", "个人信息", "头像、基础资料与手机号安全设置");
    var profileTask = tasks.find(function (task) { return task.key === "profile"; });
    if (profileTask) profileTask.target = /电话|手机|换绑/.test(query) ? "phone" : /头像/.test(query) ? "avatar" : "overview";
    Object.keys(memberAssets).forEach(function (key) {
      var asset = memberAssets[key];
      add("asset:" + key, asset.pattern, "asset:" + key, asset.label, asset.cardDescription);
    });
    add("checkin", /会员签到|签到记录|签到进度/, "checkin", "会员签到", "连签进度、每日奖励和里程碑");
    if (!/认证|办理|申请/.test(query)) add("education", /教育特惠|教育优惠|学生特惠/, "education", "教育特惠", "教育身份适用商品与优惠说明");
    if (!/下单|购买/.test(query)) add("orders", /我的订单|服务订单|订单列表/, "orders", "我的订单", "服务订单、状态与预约入口");
    var serviceMatch = query.match(/清灰|换硅脂|清洁保养|服务商品|延保/);
    if (serviceMatch) {
      var detail = /详情/.test(query);
      var serviceView = detail ? "service-detail:" + serviceIdFromQuery(query) : "service";
      tasks.push({ key: detail ? serviceView : "service", view: serviceView, label: detail ? rightViewLabel(serviceView) : "服务商品推荐", description: detail ? "服务内容、适用范围与预约说明" : "匹配设备的服务商品与购买入口", index: serviceMatch.index || 0 });
    }
    if (/下单|购买/.test(query) && !serviceMatch) {
      var purchaseMatch = query.match(/下单|购买/);
      tasks.push({ key: "pending-purchase", view: "", label: "下单", description: "待补充商品或服务", index: purchaseMatch ? purchaseMatch.index : query.length });
    }
    return tasks.sort(function (left, right) { return left.index - right.index; });
  }

  async function compositePageFlow(turn, tasks) {
    var labels = tasks.map(function (task) { return task.label; });
    var hasPending = tasks.some(function (task) { return !task.view; });
    await streamAnswer(turn, '<p>我将需求拆成<strong>' + tasks.length + ' 项任务</strong>：' + escapeHtml(labels.join("、")) + '。' + (hasPending ? "可以先打开已明确的信息页；下单还需要补充具体商品或服务。" : "右侧会保留对应标签，并聚焦当前需要继续处理的页面。涉及购买的动作仍需你明确选择并确认。") + '</p>');
    appendTrace(turn, "已完成多意图拆解与执行顺序判断");
    turn.insertAdjacentHTML("beforeend", '<div class="leai-card-grid" data-aui-plan aria-label="复合任务计划">' + tasks.map(function (task, index) {
      var action = actionForView(task.view);
      var disabled = !action;
      return '<button class="leai-action-card" type="button" data-aui-plan-step data-leai-action="' + escapeHtml(action || "pending") + '" aria-pressed="false"' + (disabled ? " disabled" : "") + '><span><span class="leai-card-title">' + (index + 1) + '. ' + escapeHtml(task.label) + '</span><span class="leai-card-desc">' + escapeHtml(task.description) + '</span></span><span class="leai-card-next"><img src="' + icons.next + '" alt=""></span></button>';
    }).join("") + '</div>');
    appendDisclaimer(turn);
    await nextFrame();
    tasks.forEach(function (task) {
      if (!task.view) return;
      if (task.view === "profile") state.profileTarget = task.target || "overview";
      if (task.view === "service") {
        state.serviceMode = "cleaning";
        state.serviceDeviceId = "";
        state.serviceCompare = [];
        state.serviceRecommended = "";
      }
      if (task.view.indexOf("service-detail:") === 0) {
        var serviceId = task.view.split(":")[1];
        state.serviceSelectedId = serviceId;
        state.serviceDetailContext[serviceId] = serviceDeviceContext(serviceId);
      }
      openRightView(task.view);
    });
  }

  function actionForView(view) {
    if (!view) return "";
    if (view.indexOf("asset:") === 0) return "member-asset:" + view.split(":")[1];
    if (view.indexOf("service-detail:") === 0) return "service-detail:" + view.split(":")[1];
    return view;
  }

  async function memberFlow(turn) {
    await streamAnswer(turn, '<p>已识别为综合会员资产查看。我会在登录与授权校验后，为你打开会员中心，并定位到会员权益。</p>');
    appendTrace(turn, "已完成登录与会员权限校验");
    turn.insertAdjacentHTML("beforeend", actionCard("member", "查看会员中心", "会员等级、乐豆、优惠券与认证状态"));
    appendDisclaimer(turn);
    await nextFrame();
    openRightView("member");
  }

  async function authFlow(turn) {
    var item = copy.student;
    var status = state.identityStatus.student;
    if (status === "reviewing") {
      await streamAnswer(turn, '<p>当前' + item.title + '申请正在<strong>审核中</strong>，暂时不需要重复提交。我已打开会员中心展示当前进度。</p>');
      appendTrace(turn, "已完成当前身份状态查询");
      appendDisclaimer(turn);
      await nextFrame();
      openRightView("member");
      return;
    }
    if (status === "verified") {
      await streamAnswer(turn, '<p>当前账号已完成<strong>' + item.title + '</strong>。我已打开会员中心，你可以直接查看已生效的专属权益。</p>');
      appendTrace(turn, "已完成当前身份与权益查询");
      appendDisclaimer(turn);
      await nextFrame();
      openRightView("member");
      return;
    }
    await streamAnswer(turn, '<p>我会先核验登录态、当前认证/等级状态与办理资格。当前演示账号未提交该申请，可以继续办理。</p>');
    appendTrace(turn, "已完成状态与资格校验");
    turn.insertAdjacentHTML("beforeend", actionCard("modal:student", item.button, "点击后才打开办理弹窗"));
    appendDisclaimer(turn);
  }

  async function serviceFlow(turn, query) {
    var hasDevice = /拯救者|R\d|Y\d|ThinkPad|小新|YOGA|游戏本/i.test(query);
    var hasRegion = /北京|上海|广州|深圳|杭州|成都|西安|南京/.test(query);
    if (!hasDevice || !hasRegion) {
      await streamAnswer(turn, '<p>已经明确是清灰/换硅脂服务。还需要确认目标设备和所在地区，才能匹配可购买、可预约的服务商品。</p>');
      turn.insertAdjacentHTML("beforeend", '<div class="leai-card-grid"><div class="leai-action-card"><span><span class="leai-card-title">这次要为哪台设备查询？</span><span class="leai-card-desc">SUG 已确认服务类型，这里只补充必需的设备与地区。</span></span></div><div class="leai-inline-actions"><button class="leai-choice" type="button" data-leai-action="service-context">拯救者游戏本 · 北京</button><button class="leai-choice" type="button" data-leai-action="service-other">选择其他设备</button></div></div>');
      appendDisclaimer(turn);
      return;
    }
    state.serviceMode = "cleaning";
    state.serviceDeviceId = "";
    state.serviceCompare = [];
    state.serviceRecommended = "";
    await streamAnswer(turn, '<p>已按“拯救者游戏本 + 北京 + 深度清灰/换硅脂”匹配服务商品。你可以比较服务内容、适用性与预约方式。</p>');
    appendTrace(turn, "已完成设备、地区与服务适用性校验");
    turn.insertAdjacentHTML("beforeend", actionCard("service", "查看服务商品推荐", "深度清灰、换硅脂、购买与预约说明"));
    appendDisclaimer(turn);
    await nextFrame();
    openRightView("service");
  }

  async function safetyFlow(turn) {
    await streamAnswer(turn, '<p><strong>请立即停止使用设备并断开电源。</strong>请勿继续充电、开机或尝试清灰。优先联系联想官方服务或人工客服检查。</p>');
    turn.insertAdjacentHTML("beforeend", actionCard("support", "联系官方服务", "危险情形不进入服务商品推荐"));
    appendDisclaimer(turn);
  }

  async function genericFlow(turn, query) {
    var isConsult = /材料|条件|有效期|流程|需要多久/.test(query);
    await streamAnswer(turn, isConsult ? '<p>这属于政策或流程咨询。我会先在对话中说明条件、材料与处理方式，不会因为出现“认证”等关键词直接弹出表单。</p>' : '<p>已收到你的问题。当前 POC 重点演示个人会员中心、教育认证和服务商品编排。你也可以继续输入更明确的会员或服务任务。</p>');
    appendDisclaimer(turn);
  }

  function taskEnvelope(intent, context) {
    state.requestSequence += 1;
    return {
      source: "right-aui",
      intent: intent,
      context: context || {},
      requestId: "aui-" + state.requestSequence,
      state: "checking"
    };
  }

  function runMemberTask(type, trigger) {
    if (type !== "student") return;
    runRightIdentityTask(trigger);
  }

  async function runRightIdentityTask(trigger) {
    var item = copy.student;
    if (!trigger) return;
    var task = taskEnvelope("member-student", { memberType: "student" });
    document.body.dataset.activeRequest = task.requestId;
    enterChat();
    var turn = appendTurn(item.query);
    turn.dataset.requestId = task.requestId;
    await nextFrame();
    turn.scrollIntoView({ behavior: prefersReduced() ? "auto" : "smooth", block: "start" });
    appendFixedAnswer(turn, "<p>已为你打开教育认证。请选择身份与认证方式，并补齐对应材料。</p>");
    appendTrace(turn, "已读取当前身份状态并进入固定办理流程");
    task.state = "ready_to_submit";
    await nextFrame();
    openModal("student", trigger);
  }

  async function runMemberCheckin(button) {
    if (state.memberCheckedIn || button.disabled) return;
    button.disabled = true;
    var task = taskEnvelope("member-checkin", { source: "member-task-center" });
    document.body.dataset.activeRequest = task.requestId;
    enterChat();
    var turn = appendTurn("帮我完成今日会员签到");
    turn.dataset.requestId = task.requestId;
    await nextFrame();
    turn.scrollIntoView({ behavior: prefersReduced() ? "auto" : "smooth", block: "start" });
    await streamAnswer(turn, '<p>会员签到服务已返回成功回执。<strong>今日签到已完成，获得 10 乐豆</strong>，右侧签到页面已同步最新状态。</p>');
    appendTrace(turn, "已收到会员任务服务签到回执");
    appendDisclaimer(turn);
    await nextFrame();
    state.memberCheckedIn = true;
    task.state = "success";
    refreshRightView();
  }

  async function runPurchasedDeviceBind(button) {
    if (state.pendingDeviceBound || button.disabled) return;
    button.disabled = true;
    button.textContent = "正在绑定";
    var task = taskEnvelope("device-bind-purchased", { deviceId: pendingPurchasedDevice.id, source: "recognized-order" });
    document.body.dataset.activeRequest = task.requestId;
    enterChat();
    var turn = appendTurn("绑定刚购买的小新 Pro 16");
    turn.dataset.requestId = task.requestId;
    await nextFrame();
    turn.scrollIntoView({ behavior: prefersReduced() ? "auto" : "smooth", block: "start" });
    await streamAnswer(turn, '<p>设备资产服务已返回成功回执。<strong>小新 Pro 16 已完成绑定</strong>，已加入你的设备列表。</p>');
    appendTrace(turn, "已收到设备资产服务绑定回执");
    appendDisclaimer(turn);
    state.pendingDeviceBound = true;
    state.recentDeviceId = pendingPurchasedDevice.id;
    deviceCatalog[pendingPurchasedDevice.id] = Object.assign({}, pendingPurchasedDevice);
    task.state = "success";
    refreshRightView();
  }

  async function runWarrantyRecommendation(deviceId) {
    var device = deviceCatalog[deviceId];
    if (!device || !device.extensionEligible) return;
    var task = taskEnvelope("service-warranty-recommend", { deviceId: device.id, source: "member-device-card" });
    document.body.dataset.activeRequest = task.requestId;
    enterChat();
    var turn = appendTurn("为" + device.name + " 推荐可购买的延保服务");
    turn.dataset.requestId = task.requestId;
    await nextFrame();
    turn.scrollIntoView({ behavior: prefersReduced() ? "auto" : "smooth", block: "start" });
    await streamAnswer(turn, '<p>已根据<strong>' + escapeHtml(device.name) + '</strong>的设备型号、购买时间和当前保障信息，匹配到 3 项可购买的延保方案。建议先对比保障年限与上门服务范围。</p>');
    appendTrace(turn, "已完成设备、购买时间、保障节点与延保 SKU 适用性校验");
    turn.insertAdjacentHTML("beforeend", actionCard("service", "查看延保服务推荐", "3 项可购买方案 · 价格以服务系统为准"));
    appendDisclaimer(turn);
    await nextFrame();
    state.serviceMode = "warranty";
    state.serviceDeviceId = device.id;
    state.warrantyDevicePickerOpen = false;
    state.serviceCompare = [];
    state.serviceRecommended = "warrantyYear1";
    task.state = "ready_to_select";
    openRightView("service");
  }

  async function runAddDeviceTask() {
    var task = taskEnvelope("device-bind-new", { source: "member-device-center" });
    document.body.dataset.activeRequest = task.requestId;
    enterChat();
    var turn = appendTurn("绑定一台新设备");
    turn.dataset.requestId = task.requestId;
    await nextFrame();
    turn.scrollIntoView({ behavior: prefersReduced() ? "auto" : "smooth", block: "start" });
    await streamAnswer(turn, '<p>可以绑定新设备。请准备<strong>设备序列号（SN）</strong>和便于识别的设备名称，提交时会由设备资产服务校验归属关系。</p>');
    appendTrace(turn, "已完成登录与设备绑定资格校验");
    turn.insertAdjacentHTML("beforeend", actionCard("modal:deviceBind", "填写设备信息", "SN、设备名称与购买渠道"));
    appendDisclaimer(turn);
    task.state = "ready_to_confirm";
  }

  async function openMemberAsset(type, trigger) {
    if (!memberAssets[type]) return;
    openRightView("asset:" + type);
    if (trigger && trigger.matches(".leai-action-card")) setSelected(trigger);
  }

  async function openMemberDevices(trigger) {
    openRightView("devices");
    if (trigger) setSelected(trigger);
  }

  function openDeviceDetail(deviceId) {
    if (!deviceCatalog[deviceId]) return;
    var host = el("#leaiAuiView");
    state.deviceListScrollTop = host ? host.scrollTop : 0;
    state.deviceFocusId = deviceId;
    openRightView("devices");
  }

  function setupDeviceBrowser(initialScroll) {
    var track = el("[data-device-track]");
    if (!track) return;
    if (typeof initialScroll === "number") track.scrollLeft = initialScroll;
    var scheduled = false;
    track.addEventListener("scroll", function () {
      if (scheduled) return;
      scheduled = true;
      window.requestAnimationFrame(function () {
        scheduled = false;
        syncDeviceBrowser(track);
      });
    });
    window.requestAnimationFrame(function () { syncDeviceBrowser(track); });
  }

  function syncDeviceBrowser(track) {
    var cards = Array.prototype.slice.call(track.querySelectorAll("[data-device-slide]"));
    if (!cards.length) return;
    var styles = window.getComputedStyle(track);
    var gap = parseFloat(styles.columnGap || styles.gap) || 0;
    var step = cards[0].getBoundingClientRect().width + gap;
    var first = Math.max(0, Math.min(cards.length - 1, Math.round(track.scrollLeft / step)));
    var visible = Math.max(1, Math.floor((track.clientWidth + gap) / step));
    var range = el("[data-device-range]");
    if (range) range.textContent = deviceRangeLabel(first + 1, Math.min(cards.length, first + visible));
    var previous = el('[data-device-scroll="-1"]');
    var next = el('[data-device-scroll="1"]');
    if (previous) previous.disabled = track.scrollLeft <= 2;
    if (next) next.disabled = track.scrollLeft + track.clientWidth >= track.scrollWidth - 2;
  }

  function scrollDeviceBrowser(direction) {
    var track = el("[data-device-track]");
    if (!track || !direction) return;
    track.scrollBy({ left: direction * track.clientWidth, behavior: prefersReduced() ? "auto" : "smooth" });
    window.setTimeout(function () { syncDeviceBrowser(track); }, prefersReduced() ? 0 : 320);
  }

  function toggleServiceCompare(id) {
    if (!findService(id) || id === "appointment") return;
    var index = state.serviceCompare.indexOf(id);
    if (index >= 0) state.serviceCompare.splice(index, 1);
    else if (state.serviceCompare.length < 2) state.serviceCompare.push(id);
    refreshRightView();
  }

  async function runServiceDetail(serviceId) {
    var service = findService(serviceId);
    if (!service) return;
    state.serviceSelectedId = service.id;
    state.serviceDetailContext[service.id] = serviceDeviceContext(service.id);
    enterChat();
    var turn = appendTurn("查看" + service.name + "详情");
    await nextFrame();
    turn.scrollIntoView({ behavior: prefersReduced() ? "auto" : "smooth", block: "start" });
    await presentServiceDetail(turn, service);
  }

  async function serviceDetailQueryFlow(turn, serviceId) {
    var service = findService(serviceId);
    if (!service) return genericFlow(turn, "服务详情");
    state.serviceSelectedId = service.id;
    state.serviceDetailContext[service.id] = serviceDeviceContext(service.id);
    await presentServiceDetail(turn, service);
  }

  async function presentServiceDetail(turn, service) {
    await streamAnswer(turn, '<p>已经为你打开<strong>' + escapeHtml(service.name) + '</strong>的服务商品详情，可继续查看服务内容、适用范围与预约说明。</p>');
    appendTrace(turn, "已完成服务商品与关联设备校验");
    turn.insertAdjacentHTML("beforeend", serviceDetailResultCard(service));
    appendDisclaimer(turn);
    await nextFrame();
    openServiceDetailView(service.id);
  }

  function serviceIdFromQuery(query) {
    if (/两年/.test(query)) return "warrantyYear2";
    if (/上门/.test(query) && /延保/.test(query)) return "warrantyDoor";
    if (/一年|延保/.test(query)) return "warrantyYear1";
    if (/换硅脂/.test(query)) return "thermal";
    if (/清洁保养|整机清洁/.test(query)) return "care";
    return "clean";
  }

  function serviceDetailResultCard(service) {
    return '<button class="leai-action-card" type="button" data-service-detail-result="' + escapeHtml(service.id) + '" aria-pressed="false"><span><span class="leai-card-title">' + escapeHtml(service.name) + '</span><span class="leai-card-desc">已经为您打开1款商品详情</span></span><span class="leai-card-next"><img src="' + icons.next + '" alt=""></span></button>';
  }

  function openServiceDetailView(serviceId) {
    if (!findService(serviceId)) return;
    state.serviceSelectedId = serviceId;
    if (!state.serviceDetailContext[serviceId]) state.serviceDetailContext[serviceId] = serviceDeviceContext(serviceId);
    openRightView("service-detail:" + serviceId);
  }

  function serviceDeviceContext(serviceId) {
    if (warrantyCatalog[serviceId]) {
      var warrantyDevice = deviceCatalog[state.serviceDeviceId] || deviceCatalog.legiony7000p;
      return { name: warrantyDevice.name, product: warrantyDevice.product, sn: warrantyDevice.sn };
    }
    return { name: "拯救者游戏本", product: "Legion 游戏本", sn: "设备型号待结算校验" };
  }

  function servicePriceNumber(service) {
    var value = String(service && service.price || "").replace(/[^0-9.]/g, "");
    return Number(value) || 0;
  }

  function claimServiceDiscounts(service) {
    var price = servicePriceNumber(service);
    var platform = price >= 600 ? 50 : price >= 250 ? 30 : 20;
    var member = price >= 600 ? 30 : price >= 250 ? 20 : 10;
    var offers = [
      { label: "商品平台满减券", reason: "联想商城专属，已自动领取", amount: platform },
      { label: "联想会员折扣券", reason: "乐享会员专享，已自动使用", amount: member }
    ];
    return { offers: offers, saved: platform + member, finalPrice: Math.max(0, price - platform - member) };
  }

  async function startServiceDiscountOrder(serviceId, trigger) {
    var service = findService(serviceId);
    if (!service || state.serviceBuyRunning) return;
    state.serviceBuyRunning = true;
    state.serviceSelectedId = service.id;
    var device = state.serviceDetailContext[service.id] || serviceDeviceContext(service.id);
    state.serviceDetailContext[service.id] = device;
    var discount = claimServiceDiscounts(service);
    enterChat();
    var turn = appendTurn("购买" + service.name + "，帮我领取所有可用优惠");
    await nextFrame();
    turn.scrollIntoView({ behavior: prefersReduced() ? "auto" : "smooth", block: "start" });
    await streamAnswer(turn, '<p>好的！为你自动领取 ' + discount.offers.length + ' 项专属优惠：</p>');
    turn.insertAdjacentHTML("beforeend", serviceDiscountCard(service, discount));
    appendDisclaimer(turn);
    var card = turn.querySelector(".leai-discount-card");
    await runServiceDiscountCard(card, discount.offers.length);
    state.serviceBuyRunning = false;
    state.pendingServiceOrder = { service: service, device: device, discount: discount };
    openServiceOrderConfirm(trigger);
  }

  function serviceDiscountCard(service, discount) {
    return '<section class="leai-discount-card" data-state="claiming" aria-live="polite"><div class="leai-discount-card-head"><span class="leai-discount-icon"><img src="' + icons.membership + '" alt=""></span><div><strong data-discount-title>正在为你自动领取优惠</strong><small>' + escapeHtml(service.name) + '</small></div><em data-discount-count>0/' + discount.offers.length + '</em><b>已省 ¥' + discount.saved + '</b></div><div class="leai-discount-progress"><span data-discount-progress></span></div><div class="leai-discount-chips">' + discount.offers.map(function (offer) { return '<span data-discount-chip><img src="' + icons.check + '" alt="">' + escapeHtml(offer.label) + ' <b>¥' + offer.amount + '</b></span>'; }).join("") + '</div></section>';
  }

  async function runServiceDiscountCard(card, total) {
    if (!card) return;
    var count = card.querySelector("[data-discount-count]");
    var progress = card.querySelector("[data-discount-progress]");
    var chips = Array.prototype.slice.call(card.querySelectorAll("[data-discount-chip]"));
    for (var index = 0; index < total; index += 1) {
      if (!prefersReduced()) await delay(320);
      chips[index].classList.add("is-claimed");
      count.textContent = index + 1 + "/" + total;
      progress.style.width = Math.round(((index + 1) / total) * 100) + "%";
    }
    card.querySelector("[data-discount-title]").textContent = "已为你领取 " + total + " 项优惠";
    if (!prefersReduced()) await delay(180);
    card.dataset.state = "done";
  }

  function openServiceOrderConfirm(trigger) {
    var pending = state.pendingServiceOrder;
    if (!pending) return;
    var service = pending.service;
    var device = pending.device;
    var discount = pending.discount;
    var mask = el("#leaiModal");
    var modal = mask.querySelector(".leai-modal");
    modal.classList.remove("is-student", "is-wechat");
    modal.classList.add("is-service-order");
    el("#leaiModalTitle").textContent = "确认订单";
    el("#leaiModalDesc").textContent = "";
    el("#leaiModalForm").innerHTML = '<div class="leai-order-confirm-badge"><img src="' + icons.check + '" alt="">已领取 ' + discount.offers.length + ' 项优惠</div><div class="leai-order-confirm-product"><img src="' + service.image + '" alt=""><div><strong>' + escapeHtml(service.name) + '</strong><span>标价 <s>¥' + servicePriceNumber(service) + '</s></span></div></div><div class="leai-order-confirm-offers">' + discount.offers.map(function (offer) { return '<div><img src="' + icons.check + '" alt=""><span><strong>' + escapeHtml(offer.label) + '</strong><small>' + escapeHtml(offer.reason) + '</small></span><b>-¥' + offer.amount + '</b></div>'; }).join("") + '</div><div class="leai-order-confirm-total"><span><strong>到手价</strong><small>已为你省 ¥' + discount.saved + '</small></span><b>¥' + discount.finalPrice + '</b></div><div class="leai-order-confirm-device"><img src="' + icons.membership + '" alt=""><span><strong>关联设备：' + escapeHtml(device.name) + '</strong><small>下单后可在订单中预约服务</small></span></div><button class="leai-primary leai-order-confirm-submit" type="submit">确认下单 · ¥' + discount.finalPrice + '</button><p class="leai-form-note">演示环境：优惠与订单仅保存在当前页面，不会真实扣款或发起履约。</p>';
    el("#leaiModalForm").onsubmit = function (event) { event.preventDefault(); submitDiscountServiceOrder(); };
    mask.classList.add("is-open");
    mask.setAttribute("aria-hidden", "false");
    if (trigger) trigger.dataset.modalTrigger = "active";
    window.setTimeout(function () { el(".leai-order-confirm-submit").focus(); }, 0);
  }

  async function submitDiscountServiceOrder() {
    var pending = state.pendingServiceOrder;
    if (!pending) return;
    var service = pending.service;
    var device = pending.device;
    var discount = pending.discount;
    closeModal();
    state.pendingServiceOrder = null;
    var turn = appendTurn("确认下单" + service.name);
    await streamAnswer(turn, '<p>已下单成功（演示）：<strong>' + escapeHtml(service.name) + '</strong>，实付 ¥' + discount.finalPrice + '。可在“我的订单”中继续预约服务。</p>');
    appendTrace(turn, "已收到 Mock 服务商品订单回执");
    state.servicePurchaseStatus = "已购买";
    state.serviceAppointmentStatus = "未预约";
    state.serviceOrder = {
      orderId: "FW20260819001",
      name: service.name,
      price: "¥" + discount.finalPrice,
      originalPrice: service.price,
      saved: discount.saved,
      offers: discount.offers,
      image: service.image,
      status: "待预约",
      createdAt: "2026/8/19 10:30:00",
      device: device.name === "拯救者游戏本" ? "拯救者 Y7000P" : device.name,
      sn: device.sn === "设备型号待结算校验" ? "MP2G****" : device.sn
    };
    turn.insertAdjacentHTML("beforeend", actionCard("orders", "查看服务订单", "订单 " + state.serviceOrder.orderId + " · 待预约服务"));
    appendDisclaimer(turn);
    await nextFrame();
    openRightView("orders");
  }

  async function runServiceTask(type, serviceId) {
    var selected = state.serviceCompare.map(function (id) { return findService(id).name; });
    var service = findService(serviceId || state.serviceSelectedId) || serviceCatalog.thermal;
    var query = "";
    if (type === "recommend") {
      if (selected.length < 2) return;
      query = "帮我比较" + selected.join("和") + "，为拯救者游戏本选一个，北京地区";
    } else if (type === "purchase") {
      state.serviceSelectedId = service.id;
      query = "我想购买" + service.name + "服务，设备是拯救者游戏本，北京地区";
    }
    else if (type === "appointment") query = "我想预约深度清灰服务，设备是拯救者游戏本，北京地区";
    else return;
    var task = taskEnvelope("service-" + type, { device: "拯救者游戏本", region: "北京", services: type === "purchase" ? [service.name] : selected });
    document.body.dataset.activeRequest = task.requestId;
    enterChat();
    var turn = appendTurn(query);
    turn.dataset.requestId = task.requestId;
    await nextFrame();
    turn.scrollIntoView({ behavior: prefersReduced() ? "auto" : "smooth", block: "start" });
    serviceTaskFlow(turn, type, task);
  }

  async function serviceTaskFlow(turn, type, task) {
    if (type === "recommend") {
      await streamAnswer(turn, '<p>两项服务都适用于当前设备。考虑到拯救者游戏本的散热压力，我更建议<strong>深度清灰 + 更换硅脂</strong>，它在清洁之外还覆盖散热介质更换。</p>');
      appendTrace(turn, "已完成服务内容与设备适用性比较");
      turn.insertAdjacentHTML("beforeend", actionCard("service-adopt", "采用推荐方案", "深度清灰 + 更换硅脂 · ¥299起"));
      appendDisclaimer(turn);
      await nextFrame();
      task.state = "ready_to_confirm";
      state.serviceRecommended = "thermal";
      refreshRightView();
      return;
    }
    if (type === "purchase") {
      var purchaseService = findService(state.serviceSelectedId) || serviceCatalog.thermal;
      await streamAnswer(turn, '<p>已校验登录状态、拯救者游戏本适用性、北京地区和服务 SKU。当前可继续购买<strong>' + escapeHtml(purchaseService.name) + '</strong>。</p>');
      appendTrace(turn, "已完成设备、地区与服务 SKU 校验");
      turn.insertAdjacentHTML("beforeend", actionCard("modal:purchase", "确认购买", escapeHtml(purchaseService.name) + " · " + escapeHtml(purchaseService.price)));
      appendDisclaimer(turn);
      await nextFrame();
      task.state = "ready_to_confirm";
      state.servicePurchaseStatus = "待确认";
      refreshRightView();
      return;
    }
    if (state.servicePurchaseStatus !== "已购买") {
      await streamAnswer(turn, '<p>暂未查询到可预约的已购服务订单。请先完成服务商品购买，再选择门店与到店时间。</p>');
      appendDisclaimer(turn);
      task.state = "error";
      return;
    }
    await streamAnswer(turn, '<p>已找到对应服务订单，并确认北京地区存在可预约门店与时段。请核对门店和到店时间。</p>');
    appendTrace(turn, "已完成订单、设备、门店与时段校验");
    turn.insertAdjacentHTML("beforeend", actionCard("modal:appointment", "确认预约", "中关村店 · 8 月 16 日 10:00–12:00"));
    appendDisclaimer(turn);
    await nextFrame();
    task.state = "ready_to_confirm";
    state.serviceAppointmentStatus = "待确认";
    refreshRightView();
  }

  function handleAction(button) {
    var action = button.dataset.leaiAction;
    if (action.indexOf("modal:") === 0) { openModal(action.split(":")[1], button); return; }
    if (action.indexOf("member-asset:") === 0) { openMemberAsset(action.split(":")[1], button); setSelected(button); return; }
    if (action === "member-devices") { openMemberDevices(button); return; }
    if (action === "member") { openRightView("member"); setSelected(button); return; }
    if (action === "service") { openRightView("service"); setSelected(button); return; }
    if (action === "orders") { openRightView("orders"); setSelected(button); return; }
    if (action === "education") { openRightView("education"); setSelected(button); return; }
    if (action === "service-context") {
      var turn = appendTurn("拯救者游戏本，北京地区");
      serviceFlow(turn, "我想给拯救者游戏本清灰换硅脂，北京地区");
      return;
    }
    if (action === "service-other") { el(".assistant-panel .composer textarea").value = "我想为其他笔记本查询清灰服务，设备是"; el(".assistant-panel .composer textarea").focus(); return; }
    if (action === "service-adopt") {
      button.disabled = true;
      button.querySelector(".leai-card-title").textContent = "已采用推荐方案";
      button.querySelector(".leai-card-desc").textContent = "右侧已定位到深度清灰 + 更换硅脂";
      state.serviceRecommended = "thermal";
      refreshRightView();
      return;
    }
    if (action === "support") { button.disabled = true; button.querySelector(".leai-card-title").textContent = "已打开官方服务入口"; }
  }

  function setSelected(button) {
    document.querySelectorAll(".leai-action-card[aria-pressed]").forEach(function (item) { item.setAttribute("aria-pressed", item === button ? "true" : "false"); });
  }

  function openModal(type, trigger) {
    var item = type === "purchase" ? servicePurchaseModalCopy() : copy[type];
    if (!item) return;
    if (type === "student") {
      openStudentModal(trigger);
      return;
    }
    state.modalType = type;
    var mask = el("#leaiModal");
    mask.querySelector(".leai-modal").classList.remove("is-student");
    el("#leaiModalTitle").textContent = item.title;
    el("#leaiModalDesc").textContent = item.description;
    var fields = item.fields.map(function (field, index) {
      var control = field[1] === "select" ? '<select id="leaiField' + index + '" required>' + field[2].map(function (option) { return '<option>' + escapeHtml(option) + '</option>'; }).join("") + '</select>' : '<input id="leaiField' + index + '" required placeholder="' + escapeHtml(field[2]) + '">';
      return '<div class="leai-field"><label for="leaiField' + index + '">' + escapeHtml(field[0]) + '</label>' + control + '</div>';
    }).join("");
    el("#leaiModalForm").innerHTML = fields + '<p class="leai-form-note">表单仅用于交互演示。关闭弹窗视为取消，不表述为失败或完成。</p><div class="leai-modal-actions"><button class="leai-secondary" type="button" data-modal-close>取消</button><button class="leai-primary" type="submit">' + escapeHtml(item.submitLabel || "提交申请") + '</button></div>';
    el("#leaiModalForm").onsubmit = function (event) { event.preventDefault(); submitModal(type, trigger); };
    mask.classList.add("is-open");
    mask.setAttribute("aria-hidden", "false");
    trigger.dataset.modalTrigger = "active";
    window.setTimeout(function () { el("#leaiModalForm input, #leaiModalForm select").focus(); }, 0);
  }

  function openPhoneRebindModal(trigger) {
    state.modalType = "phone-rebind";
    var mask = el("#leaiModal");
    mask.querySelector(".leai-modal").classList.remove("is-student", "is-wechat", "is-service-order");
    el("#leaiModalTitle").textContent = "更换绑定手机号";
    el("#leaiModalDesc").textContent = "完成新手机号验证后再更新绑定关系。";
    var form = el("#leaiModalForm");
    form.innerHTML = '<div class="leai-phone-current"><span>当前绑定手机号</span><strong>' + escapeHtml(state.profile.phone) + '</strong></div><div class="leai-profile-fields"><div class="leai-field"><label for="leaiPhoneNew">新手机号</label><input id="leaiPhoneNew" inputmode="numeric" autocomplete="tel" maxlength="11" pattern="1[3-9][0-9]{9}" required placeholder="请输入 11 位手机号"></div><div class="leai-field"><label for="leaiPhoneCode">短信验证码</label><input id="leaiPhoneCode" inputmode="numeric" autocomplete="one-time-code" maxlength="6" pattern="[0-9]{6}" required placeholder="请输入 6 位验证码"></div></div><p class="leai-form-note">当前为交互 POC，不会发送真实短信，也不会修改真实联想账户。换绑结果仅保存在本页 Mock 状态。</p><div class="leai-modal-actions"><button class="leai-secondary" type="button" data-modal-close>取消</button><button class="leai-primary" type="submit">确认换绑</button></div>';
    form.onsubmit = function (event) {
      event.preventDefault();
      if (!form.checkValidity()) {
        form.reportValidity();
        return;
      }
      state.profile.phone = maskPhone(form.querySelector("#leaiPhoneNew").value);
      state.profilePhoneStatus = "手机号已换绑（Mock）";
      closeModal();
      refreshRightView();
    };
    mask.classList.add("is-open");
    mask.setAttribute("aria-hidden", "false");
    trigger.dataset.modalTrigger = "active";
    window.setTimeout(function () { form.querySelector("#leaiPhoneNew").focus(); }, 0);
  }

  function maskPhone(phone) {
    return phone.slice(0, 3) + "****" + phone.slice(-4);
  }

  function servicePurchaseModalCopy() {
    var service = findService(state.serviceSelectedId) || serviceCatalog.thermal;
    return {
      title: copy.purchase.title,
      description: copy.purchase.description,
      submitLabel: copy.purchase.submitLabel,
      fields: [
        ["服务商品", "select", [service.name]],
        ["服务设备", "select", ["拯救者游戏本"]],
        ["服务地区", "select", ["北京"]],
        ["参考价格", "select", [service.price]]
      ]
    };
  }

  function mockSunCodeCells() {
    var cells = [];
    for (var row = 0; row < 21; row += 1) {
      for (var column = 0; column < 21; column += 1) {
        var center = row >= 7 && row <= 13 && column >= 7 && column <= 13;
        var edge = row < 3 || row > 17 || column < 3 || column > 17;
        var dark = !center && ((row * 7 + column * 11 + row * column) % 5 < 2 || (edge && (row + column) % 3 === 0));
        cells.push('<span' + (dark ? ' class="is-dark"' : "") + '></span>');
      }
    }
    return cells.join("");
  }

  function openStudentModal(trigger) {
    // 会员中心运行在右侧 iframe 中；全局认证弹窗由外层应用承载，
    // 否则 position: fixed 也只能覆盖 iframe 自身。
    if (window.parent && window.parent !== window) {
      window.parent.postMessage({
        type: "lexiang:open-student-auth",
        kind: "college",
        source: "member-service-aui"
      }, window.location.origin);
      return;
    }
    state.modalType = "student";
    state.educationAudience = "college";
    state.educationMethod = "edu";
    var mask = el("#leaiModal");
    mask.querySelector(".leai-modal").classList.remove("is-wechat", "is-service-order");
    mask.querySelector(".leai-modal").classList.add("is-student");
    trigger.dataset.modalTrigger = "active";
    renderStudentModal();
    mask.classList.add("is-open");
    mask.setAttribute("aria-hidden", "false");
    window.setTimeout(function () { el("[data-student-audience]").focus(); }, 0);
  }

  function renderStudentModal() {
    var audienceType = state.educationAudience;
    var isExam = audienceType === "exam";
    var isTeacher = audienceType === "teacher";
    var method = state.educationMethod;
    var methodLabels = isExam ? [["verified", "实名认证"], ["skip", "跳过实名"]] : isTeacher ? [["certificate", "教师资格证"], ["employment", "教职证明"]] : [["edu", "edu 邮箱"], ["card", "学生证"], ["wechat", "微信学籍"]];
    el("#leaiModalTitle").textContent = "教育认证";
    el("#leaiModalDesc").textContent = isExam ? "高考生认证有效期与审核时效以当期活动规则和认证服务回执为准。" : isTeacher ? "教师身份支持资格证或教职证明认证，资料仅用于本次资格审核。" : "选择一种在校身份认证方式，资料仅用于本次资格审核。";
    var audience = '<div class="leai-auth-audience" role="tablist" aria-label="认证身份">' +
      studentChoice("college", "在校生", state.educationAudience === "college", "audience") +
      studentChoice("exam", "高考生", state.educationAudience === "exam", "audience") +
      studentChoice("teacher", "教师", state.educationAudience === "teacher", "audience") + '</div>';
    var methods = '<div class="leai-auth-methods" role="tablist" aria-label="认证方式">' + methodLabels.map(function (item) {
      return studentChoice(item[0], item[1], method === item[0], "method");
    }).join("") + '</div>';
    var audienceLabel = isExam ? "高考生认证" : isTeacher ? "教师认证" : "在校生认证";
    var notice = '<div class="leai-auth-notice"><strong>' + audienceLabel + '</strong><span>' + studentNotice(audienceType, method) + '</span></div>';
    var form = el("#leaiModalForm");
    form.innerHTML = audience + methods + notice + '<div class="leai-auth-fields">' + studentFields(audienceType, method) + '</div>' +
      '<label class="leai-auth-agreement"><input id="leaiStudentAgreement" type="checkbox" required><span>我已阅读并同意服务须知和活动规则</span></label>' +
      '<p class="leai-form-note">当前为交互 POC。提交只表示材料已送审；“认证成功”必须等待权威认证服务返回通过结果。</p>' +
      '<div class="leai-modal-actions"><button class="leai-secondary" type="button" data-modal-close>取消</button><button class="leai-primary" id="leaiStudentSubmit" type="submit" disabled>立即认证</button></div>';
    form.onsubmit = function (event) {
      event.preventDefault();
      if (!form.checkValidity()) {
        form.reportValidity();
        return;
      }
      submitModal("student", el('[data-modal-trigger="active"]'));
    };
    form.querySelectorAll("input, select").forEach(function (control) {
      control.addEventListener("input", updateStudentSubmit);
      control.addEventListener("change", updateStudentSubmit);
    });
    updateStudentSubmit();
  }

  function studentChoice(value, label, active, type) {
    var data = type === "audience" ? ' data-student-audience="' + value + '"' : ' data-student-method="' + value + '"';
    return '<button class="' + (active ? "is-active" : "") + '" type="button" role="tab" aria-selected="' + active + '"' + data + '>' + label + '</button>';
  }

  function studentNotice(audienceType, method) {
    if (audienceType === "exam") return method === "skip" ? "无需提交姓名和身份证号；请提供准考证号与清晰的准考证照片。" : "提交实名信息、准考证号与准考证照片，预计 1 个工作日内完成审核。";
    if (audienceType === "teacher") return method === "employment" ? "请提供学校或教育机构出具的在职证明，证明需处于有效期内。" : "请提供教师资格证编号与清晰证件照片，最终结果以认证服务回执为准。";
    if (method === "card") return "请提供学生证号和学生证照片；照片需清晰展示姓名与学生证号。";
    if (method === "wechat") return "通过微信学籍完成授权后提交；最终结果以教育认证服务回执为准。";
    return "使用学校 edu 邮箱接收验证邮件，完成邮箱所有权与在校身份校验。";
  }

  function studentFields(audienceType, method) {
    var fields = [];
    if (audienceType === "exam") {
      if (method === "verified") fields.push(studentInput("真实姓名", "leaiStudentName", "请输入真实姓名", "text"), studentInput("身份证号", "leaiStudentId", "请输入身份证号", "text"));
      fields.push(studentInput("考生号 / 准考证号", "leaiExamNumber", "请输入考生号或准考证号", "text"), studentUpload("准考证照片", "leaiExamPhoto", "支持 png/jpg，单张不超过 5MB"));
    } else if (audienceType === "teacher") {
      fields.push(studentInput("真实姓名", "leaiTeacherName", "请输入真实姓名", "text"), studentInput("身份证号", "leaiTeacherId", "请输入身份证号", "text"), studentInput("任教学校 / 机构", "leaiTeacherSchool", "请输入任教学校或教育机构", "text"), studentSelect("任教学段", "leaiTeacherStage", [["", "请选择"], ["primary", "小学"], ["middle", "中学"], ["college", "高校"], ["other", "其他教育机构"]]));
      if (method === "employment") fields.push(studentInput("教职工号", "leaiTeacherNumber", "请输入教职工号", "text"), studentUpload("教职证明", "leaiTeacherEmployment", "支持 png/jpg，单张不超过 5MB"));
      else fields.push(studentInput("教师资格证编号", "leaiTeacherCertificate", "请输入教师资格证编号", "text"), studentUpload("教师资格证照片", "leaiTeacherPhoto", "支持 png/jpg，单张不超过 5MB"));
    } else if (method === "wechat") {
      fields.push('<div class="leai-auth-connect"><strong>微信学籍授权</strong><span>完成授权后，认证服务将返回可提交状态。</span><label><input type="checkbox" required>我已完成微信学籍授权</label></div>');
    } else {
      fields.push(studentInput("真实姓名", "leaiStudentName", "请输入真实姓名", "text"), studentInput("身份证号", "leaiStudentId", "请输入身份证号", "text"), studentInput("学校名称", "leaiStudentSchool", "请输入学校名称", "text"), studentSelect("毕业时间", "leaiGraduateDate", [["", "请选择"], ["2026-07", "2026 年 7 月"], ["2027-07", "2027 年 7 月"], ["2028-07", "2028 年 7 月"], ["2029-07", "2029 年 7 月"]]), studentSelect("教育阶段", "leaiEducationLevel", [["", "请选择"], ["专科", "专科"], ["本科", "本科"], ["研究生", "研究生"]]));
      if (method === "card") fields.push(studentInput("学生证号", "leaiStudentNumber", "请输入学生证号", "text"), studentUpload("学生证照片", "leaiStudentPhoto", "支持 png/jpg，单张不超过 5MB"));
      else fields.push(studentInput("edu 邮箱", "leaiEduEmail", "请输入学校 edu 邮箱", "email"));
    }
    fields.push(studentInput("邀请码（选填）", "leaiInviteCode", "有邀请码可填写", "text", false));
    return fields.join("");
  }

  function studentInput(label, id, placeholder, type, required) {
    return '<div class="leai-field"><label for="' + id + '">' + label + '</label><input id="' + id + '" type="' + type + '" placeholder="' + placeholder + '"' + (required === false ? "" : " required") + '></div>';
  }

  function studentSelect(label, id, options) {
    return '<div class="leai-field"><label for="' + id + '">' + label + '</label><select id="' + id + '" required>' + options.map(function (option) { return '<option value="' + option[0] + '">' + option[1] + '</option>'; }).join("") + '</select></div>';
  }

  function studentUpload(label, id, help) {
    return '<div class="leai-field leai-auth-upload"><label for="' + id + '">' + label + '</label><input id="' + id + '" type="file" accept="image/png,image/jpeg" required><span>' + help + '</span></div>';
  }

  function updateStudentSubmit() {
    var form = el("#leaiModalForm");
    var submit = el("#leaiStudentSubmit");
    if (!form || !submit) return;
    submit.disabled = !form.checkValidity();
  }

  function closeModal() {
    var mask = el("#leaiModal");
    mask.classList.remove("is-open");
    mask.querySelector(".leai-modal").classList.remove("is-student", "is-service-order");
    mask.setAttribute("aria-hidden", "true");
    var trigger = el('[data-modal-trigger="active"]');
    if (trigger) { delete trigger.dataset.modalTrigger; trigger.focus(); }
    state.modalType = "";
  }

  async function submitModal(type, trigger) {
    state.submitted[type] = true;
    if (type === "deviceBind") {
      await submitDeviceBindModal(trigger);
      return;
    }
    if (type === "purchase" || type === "appointment") {
      await submitServiceModal(type, trigger);
      return;
    }
    state.identityStatus.student = "reviewing";
    closeModal();
    var cardTitle = trigger && trigger.querySelector(".leai-card-title");
    var cardDescription = trigger && trigger.querySelector(".leai-card-desc");
    if (cardTitle && cardDescription) {
      trigger.disabled = true;
      cardTitle.textContent = "已提交认证申请";
      cardDescription.textContent = "当前状态：审核中";
    }
    if (type === "student") {
      var pathLabels = { edu: "edu 邮箱", card: "学生证", wechat: "微信学籍", verified: "实名认证", skip: "跳过实名", certificate: "教师资格证", employment: "教职证明" };
      var audienceLabels = { college: "在校生", exam: "高考生", teacher: "教师" };
      state.educationPath = audienceLabels[state.educationAudience] + " · " + pathLabels[state.educationMethod];
    }
    var turn = appendTurn("提交" + state.educationPath + "认证申请");
    await streamAnswer(turn, '<p>申请已提交，当前状态为<strong>审核中</strong>。我会保留本次结果；只有权威服务返回通过后，才会表述为“已认证/已升级”。</p>');
    appendTrace(turn, "已收到业务服务提交回执");
    if (type === "student") turn.insertAdjacentHTML("beforeend", actionCard("education", "查看教育特惠专区", "认证审核中，可先了解活动与适用商品"));
    appendDisclaimer(turn);
    refreshRightView();
  }

  async function submitDeviceBindModal(trigger) {
    var sn = el("#leaiField0").value.trim();
    var name = el("#leaiField1").value.trim();
    var channel = el("#leaiField2").value;
    closeModal();
    trigger.disabled = true;
    trigger.querySelector(".leai-card-title").textContent = "已提交设备绑定";
    trigger.querySelector(".leai-card-desc").textContent = name + " · 正在同步到我的设备";
    var turn = appendTurn("确认绑定" + name);
    await streamAnswer(turn, '<p>设备资产服务已返回成功回执。<strong>新设备已绑定</strong>：' + escapeHtml(name) + '，已同步到右侧“我的设备”。</p>');
    appendTrace(turn, "已收到设备资产服务绑定回执");
    appendDisclaimer(turn);
    var id = "manual" + state.requestSequence;
    deviceCatalog[id] = {
      id: id,
      name: name,
      product: name,
      sn: sn.slice(0, 4) + "****",
      image: "/assets/img/thinkpad.jpg",
      warranty: "保障状态待同步",
      purchased: "来自" + channel,
      service: "已绑定"
    };
    state.recentDeviceId = id;
    openRightView("devices");
  }

  async function submitServiceModal(type, trigger) {
    closeModal();
    trigger.disabled = true;
    trigger.querySelector(".leai-card-title").textContent = type === "purchase" ? "已确认购买" : "已确认预约";
    trigger.querySelector(".leai-card-desc").textContent = type === "purchase" ? "服务系统已受理购买" : "履约系统已受理预约";
    var purchaseService = findService(state.serviceSelectedId) || serviceCatalog.thermal;
    var query = type === "purchase" ? "确认购买" + purchaseService.name + "服务" : "确认预约 8 月 16 日中关村店清灰服务";
    var turn = appendTurn(query);
    if (type === "purchase") {
      await streamAnswer(turn, '<p>服务商品系统已返回演示购买成功回执。<strong>' + escapeHtml(purchaseService.name) + '</strong>已加入“我的订单”，可从订单继续前往微信小程序预约。</p>');
      appendTrace(turn, "已收到 Mock 服务商品购买回执");
      state.servicePurchaseStatus = "已购买";
      state.serviceAppointmentStatus = "未预约";
      state.serviceOrder = {
        orderId: "FW20260818001",
        name: purchaseService.name,
        price: purchaseService.price.replace("起", ""),
        image: purchaseService.image,
        status: "待预约",
        createdAt: "2026/8/18 20:18:00",
        device: "拯救者 Y7000P",
        sn: "MP2G****"
      };
      turn.insertAdjacentHTML("beforeend", actionCard("orders", "查看服务订单", "订单 " + state.serviceOrder.orderId + " · 待预约服务"));
    } else {
      await streamAnswer(turn, '<p>履约系统已返回预约成功回执。已预约<strong>8 月 16 日 10:00–12:00 · 中关村店</strong>，可在服务订单中查看。</p>');
      appendTrace(turn, "已收到服务预约回执");
      state.serviceAppointmentStatus = "已预约";
    }
    appendDisclaimer(turn);
    if (type === "purchase") {
      await nextFrame();
      openRightView("orders");
    } else refreshRightView();
  }

  function openRightView(view) {
    var content = el(".shell > .content");
    var tabs = el("#leaiAuiTabs");
    var host = el("#leaiAuiView");
    if (state.rightTabs.indexOf(view) < 0) state.rightTabs.push(view);
    state.rightView = view;
    content.classList.add("leai-aui-active");
    tabs.hidden = false;
    host.hidden = false;
    renderRightTabs();
    host.innerHTML = rightViewHtml(view);
    host.scrollTop = 0;
    if (view === "member" || view === "devices") setupDeviceBrowser(0);
    syncResultCardSelection(view);
  }

  function activateRightTab(view) {
    if (state.rightTabs.indexOf(view) < 0 || view === state.rightView) return;
    state.rightView = view;
    renderRightTabs();
    var host = el("#leaiAuiView");
    host.innerHTML = rightViewHtml(view);
    host.scrollTop = 0;
    if (view === "member" || view === "devices") setupDeviceBrowser(0);
    syncResultCardSelection(view);
  }

  function secondaryParentView(view) {
    if (!view) return "";
    if (view.indexOf("asset:") === 0 || view === "profile" || view === "devices" || view === "ledou" || view === "education" || view === "checkin") return "member";
    if (view.indexOf("device:") === 0) return "devices";
    if (view.indexOf("ledou-product:") === 0) return "ledou";
    if (view.indexOf("service-detail:") === 0 || view.indexOf("selection:") === 0) return "service";
    if (view === "appointment-code") return "orders";
    return "";
  }

  function returnFromSecondary(parentView) {
    var parent = parentView || secondaryParentView(state.rightView);
    if (!parent) return;
    if (parent === "devices") state.deviceFocusId = "";
    var current = state.rightView;
    state.rightTabs = state.rightTabs.filter(function (view) { return view !== current; });
    if (state.rightTabs.indexOf(parent) < 0) state.rightTabs.push(parent);
    state.rightView = parent;
    renderRightTabs();
    var host = el("#leaiAuiView");
    host.innerHTML = rightViewHtml(parent);
    host.scrollTop = 0;
    if (parent === "member" || parent === "devices") setupDeviceBrowser(0);
    syncResultCardSelection(parent);
  }

  function renderRightTabs() {
    var tabs = el("#leaiAuiTabs");
    tabs.setAttribute("role", "tablist");
    tabs.setAttribute("aria-label", "已打开页面");
    tabs.innerHTML = state.rightTabs.map(function (view) {
      var active = view === state.rightView;
      var label = rightViewLabel(view);
      return '<div class="leai-aui-tab-item' + (active ? ' is-active' : '') + '" role="presentation" data-aui-tab-item="' + escapeHtml(view) + '"><button class="leai-aui-tab" type="button" role="tab" data-aui-tab="' + escapeHtml(view) + '" aria-selected="' + (active ? "true" : "false") + '" aria-controls="leaiAuiView"' + (active ? ' tabindex="0"' : ' tabindex="-1"') + '>' + escapeHtml(label) + '</button><button class="leai-aui-tab-x" type="button" data-aui-close-view="' + escapeHtml(view) + '" aria-label="关闭' + escapeHtml(label) + '">×</button></div>';
    }).join("");
  }

  function rightViewLabel(view) {
    if (view.indexOf("asset:") === 0) {
      var asset = memberAssets[view.split(":")[1]];
      return asset ? asset.label : "会员资产";
    }
    if (view.indexOf("device:") === 0) {
      var device = deviceCatalog[view.split(":")[1]];
      return device ? device.name : "设备详情";
    }
    if (view.indexOf("service-detail:") === 0) {
      var service = findService(view.split(":")[1]);
      return service ? service.name : "服务详情";
    }
    if (view.indexOf("ledou-product:") === 0) {
      var product = findLedouProduct(view.split(":")[1]);
      return product ? product.name : "好物详情";
    }
    if (view.indexOf("selection:") === 0) return view.split(":")[1] === "device" ? "选择设备" : "选择地区";
    return { member: "会员中心", profile: "个人信息", devices: "我的设备", ledou: "乐豆好物", service: "服务商品推荐", orders: "我的订单", education: "教育优惠", checkin: "会员签到", "appointment-code": "预约服务" }[view] || "页面";
  }

  function rightViewHtml(view) {
    var html = "";
    if (view.indexOf("asset:") === 0) html = memberAssetPage(view.split(":")[1]);
    else if (view.indexOf("device:") === 0) html = memberDeviceDetailPage(view.split(":")[1]);
    else if (view.indexOf("service-detail:") === 0) html = serviceDetailPage(view.split(":")[1]);
    else if (view.indexOf("ledou-product:") === 0) html = ledouProductPage(view.split(":")[1]);
    else if (view.indexOf("selection:") === 0) html = selectionPage(view.split(":")[1]);
    else if (view === "member") html = memberPage();
    else if (view === "profile") html = memberProfilePage();
    else if (view === "devices") html = memberDevicesPage();
    else if (view === "ledou") html = ledouPage();
    else if (view === "service") html = servicePage();
    else if (view === "orders") html = serviceOrdersPage();
    else if (view === "education") html = educationPage();
    else if (view === "checkin") html = checkinPage();
    else if (view === "appointment-code") html = appointmentCodePage();
    else html = memberPage();
    return decorateSecondaryPage(view, html);
  }

  function decorateSecondaryPage(view, html) {
    var parent = secondaryParentView(view);
    if (!parent || /data-secondary-back/.test(html)) return html;
    var parentLabel = rightViewLabel(parent);
    return html.replace(/<h1 class="([^"]*\bleai-page-title\b[^"]*)"([^>]*)>([\s\S]*?)<\/h1>/, function (_, classes, attributes, title) {
      return '<div class="leai-page-title-row"><button class="leai-page-back" type="button" data-secondary-back="' + escapeHtml(parent) + '" aria-label="返回' + escapeHtml(parentLabel) + '"><img src="' + icons.next + '" alt=""></button><h1 class="' + classes + '"' + attributes + '>' + title + '</h1></div>';
    });
  }

  function refreshRightView() {
    if (!state.rightView) return;
    var host = el("#leaiAuiView");
    var scrollTop = host.scrollTop;
    var deviceTrack = host.querySelector("[data-device-track]");
    var deviceScroll = deviceTrack ? deviceTrack.scrollLeft : 0;
    host.innerHTML = rightViewHtml(state.rightView);
    host.scrollTop = scrollTop;
    if (state.rightView === "member" || state.rightView === "devices") setupDeviceBrowser(deviceScroll);
  }

  function closeRightView(closeAll, viewToClose) {
    var content = el(".shell > .content");
    var closingView = viewToClose || state.rightView;
    if (!closeAll && state.rightTabs.length > 1) {
      var closingIndex = state.rightTabs.indexOf(closingView);
      var closingActive = closingView === state.rightView;
      state.rightTabs = state.rightTabs.filter(function (view) { return view !== closingView; });
      if (closingActive) state.rightView = state.rightTabs[Math.max(0, closingIndex - 1)] || state.rightTabs[0];
      renderRightTabs();
      if (closingActive) {
        var remainingHost = el("#leaiAuiView");
        remainingHost.innerHTML = rightViewHtml(state.rightView);
        remainingHost.scrollTop = 0;
        if (state.rightView === "member" || state.rightView === "devices") setupDeviceBrowser(0);
      }
      syncResultCardSelection(state.rightView);
      return;
    }
    content.classList.remove("leai-aui-active");
    el("#leaiAuiTabs").hidden = true;
    el("#leaiAuiView").hidden = true;
    state.rightView = "";
    state.rightTabs = [];
    document.querySelectorAll(".leai-action-card[aria-pressed]").forEach(function (item) { item.setAttribute("aria-pressed", "false"); });
  }

  function syncResultCardSelection(view) {
    var action = view.indexOf("asset:") === 0 ? "member-asset:" + view.split(":")[1] : { member: "member", devices: "member-devices", service: "service", orders: "orders", education: "education" }[view];
    document.querySelectorAll(".leai-action-card[aria-pressed]").forEach(function (item) {
      item.setAttribute("aria-pressed", item.dataset.leaiAction === action ? "true" : "false");
    });
  }

  function memberAssetPage(type) {
    var pages = {
      points: {
        label: "乐豆", value: "2,580", unit: "可用乐豆", description: "查看乐豆余额、获取与使用记录，以及当前适用规则。",
        metrics: [["近 30 天获得", "+860"], ["近 30 天使用", "-300"], ["即将到期", "0"]],
        records: [["购买服务商品", "+500", "8 月 16 日"], ["会员日签到", "+360", "8 月 12 日"], ["兑换清洁套装", "-300", "8 月 3 日"]],
        usage: [["购物抵扣", "部分商品支持乐豆抵现"], ["权益兑换", "可兑换指定优惠券与会员权益"], ["会员活动", "会员日与签到任务可获得乐豆"]],
        rule: "乐豆获取、有效期、抵扣比例与适用商品以实时会员规则和结算页为准。"
      },
      coupons: {
        label: "优惠券", value: "3 张", unit: "当前可用", description: "集中查看可用优惠券、适用范围和有效期。",
        metrics: [["即将到期", "1 张"], ["服务商品券", "1 张"], ["购物优惠券", "2 张"]],
        records: [["服务商品满 299 减 30", "可使用", "7 天后到期"], ["会员专享满 5000 减 200", "可使用", "本月有效"], ["配件满 199 减 20", "可使用", "长期有效"]],
        usage: [["服务商品", "适用于指定清灰、延保等服务"], ["会员购物", "适用于指定会员价商品"], ["配件专区", "适用于指定配件商品"]],
        rule: "优惠券门槛、叠加规则和适用商品以券详情及结算页为准。"
      },
      vouchers: {
        label: "代金券", value: "2 张", unit: "当前可用", description: "查看认证、换新等场景获得的代金券。",
        metrics: [["教育场景", "1 张"], ["以旧换新", "1 张"], ["即将到期", "0 张"]],
        records: [["教育认证代金券", "¥300", "教育特惠商品可用"], ["以旧换新补贴券", "¥100", "指定换新订单可用"]],
        usage: [["身份权益", "完成适用认证后按规则发放"], ["换新补贴", "与符合条件的旧机回收订单关联"], ["订单抵扣", "满足门槛后在结算页选择使用"]],
        rule: "代金券发放资格、使用门槛和有效期以对应活动规则为准。"
      },
      redpacket: {
        label: "限时红包", value: "2 个", unit: "当前可用", description: "查看限时红包金额、适用活动和到期提醒。",
        metrics: [["红包金额", "¥84"], ["明日到期", "1 个"], ["新品活动", "1 个"]],
        records: [["会员日红包", "¥18", "明日到期"], ["新品首发红包", "¥66", "本月有效"]],
        usage: [["会员日", "指定会员日商品可用"], ["新品首发", "指定新品首发订单可用"], ["到期提醒", "临近到期资产会在页面标注"]],
        rule: "红包不能兑换现金，使用范围、叠加方式与有效期以活动页面为准。"
      },
      benefitpoints: {
        label: "权益点", value: "1,200", unit: "可用权益点", description: "查看权益点来源、兑换记录和可兑换服务。",
        metrics: [["累计获得", "1,500"], ["累计使用", "300"], ["可兑换服务", "3 项"]],
        records: [["购买 ThinkPad 商品", "+1,200", "8 月 10 日"], ["会员活动奖励", "+300", "7 月 28 日"], ["兑换延保服务", "-300", "7 月 15 日"]],
        usage: [["延保服务", "可兑换指定设备延保权益"], ["会员服务", "可兑换指定会员专属服务"], ["活动权益", "参与符合条件的会员活动获得"]],
        rule: "权益点来源、兑换门槛和适用服务以会员权益中心实时展示为准。"
      }
    };
    var page = pages[type] || pages.points;
    return '<section class="leai-page leai-member-asset-page" data-member-asset-page="' + type + '" aria-labelledby="leaiAssetTitle-' + type + '"><header class="leai-page-header"><div><div class="leai-page-title-row"><button class="leai-page-back" type="button" data-secondary-back="member" aria-label="返回会员中心"><img src="' + icons.next + '" alt=""></button><h1 class="leai-page-title" id="leaiAssetTitle-' + type + '">' + page.label + '</h1></div><p class="leai-page-desc">' + page.description + '</p></div></header>' +
      '<div class="leai-summary-grid"><article class="leai-summary-card leai-member-main"><span class="leai-summary-label">' + page.unit + '</span><strong class="leai-summary-value">' + page.value + '</strong><span class="leai-summary-sub">数据更新时间：刚刚</span></article>' + page.metrics.map(function (metric) { return '<article class="leai-summary-card"><span class="leai-summary-label">' + metric[0] + '</span><strong class="leai-summary-value">' + metric[1] + '</strong><span class="leai-summary-sub">以账户实时资产为准</span></article>'; }).join("") + '</div>' +
      '<section class="leai-panel"><div class="leai-panel-head"><div><h2 class="leai-panel-title">最近明细</h2><p>展示当前账户最近的资产变动与可用状态。</p></div><span class="leai-section-meta">会员资产服务</span></div><div class="leai-asset-ledger">' + page.records.map(function (record) { return '<div><span><strong>' + record[0] + '</strong><small>' + record[2] + '</small></span><em>' + record[1] + '</em></div>'; }).join("") + '</div></section>' +
      '<div class="leai-asset-page-columns"><section class="leai-panel"><div class="leai-panel-head"><div><h2 class="leai-panel-title">使用范围</h2><p>常见可用场景与处理方式。</p></div></div><div class="leai-asset-usage">' + page.usage.map(function (item) { return '<div><strong>' + item[0] + '</strong><span>' + item[1] + '</span></div>'; }).join("") + '</div></section><section class="leai-panel"><div class="leai-panel-head"><div><h2 class="leai-panel-title">规则说明</h2><p>使用前请核对当前业务规则。</p></div></div><p class="leai-detail-copy">' + page.rule + '</p><p class="leai-member-disclaimer">当前页面数据为 Mock，实际余额、资产状态和规则以会员服务实时结果为准。</p></section></div></section>';
  }

  function memberPage() {
    return '<section class="leai-page leai-member-page" aria-labelledby="leaiMemberTitle">' +
      '<header class="leai-member-main-header"><h1 class="leai-page-title" id="leaiMemberTitle">会员中心</h1></header>' +
      memberInsights() +
      '<section class="leai-panel leai-member-overview" data-member-overview data-member-identities data-member-section="overview"><div class="leai-panel-head"><div><h2 class="leai-panel-title">会员身份</h2><p>个人资料、会员等级与教育身份权益集中展示。</p></div><span class="leai-section-meta">身份服务</span></div>' +
      memberIdentityHub() + identityBenefits() + '</section>' +
      '<section class="leai-member-assets" aria-label="我的资产">' +
      memberAssetButton("points", "2,580", "乐豆", "近 30 天 +860") + memberAssetButton("coupons", "3 张", "优惠券", "1 张即将到期") + memberAssetButton("vouchers", "2 张", "代金券", "教育/换新可用") + memberAssetButton("redpacket", "2 个", "限时红包", "最近 1 个明日到期") + memberAssetButton("benefitpoints", "1,200", "权益点", "可兑换会员服务") + '</section>' +
      memberDevicesSection() +
      memberLedouShowcase() +
      '</section>';
  }

  function memberIdentityHub() {
    return '<div class="leai-member-identity" data-member-identity-hub>' +
      '<button class="leai-member-profile-entry" type="button" data-member-profile-open aria-label="编辑' + escapeHtml(state.profile.nickname) + '的个人信息"><span class="leai-member-avatar"><img src="' + profileAvatarIcon(state.profile.avatar) + '" alt=""></span><span class="leai-member-profile"><strong>' + escapeHtml(state.profile.nickname) + '</strong><small>已加入联想会员 2679 天</small><span class="leai-member-profile-edit">编辑资料 <img class="leai-member-profile-next" src="' + icons.next + '" alt=""></span></span></button>' +
      '<div class="leai-identity-content"><div class="leai-identity-pane" data-identity-pane="personal">' + personalIdentityTrack() + educationIdentityTrack() + '</div></div></div>';
  }

  function identityBenefits() {
    return '<div class="leai-member-level-panel" data-member-level-panel><div class="leai-benefit-block"><div class="leai-benefit-block-head"><strong>个人铂金当前权益</strong><span>已享 8 项权益 · 展示 6 项</span></div><div class="leai-benefit-grid leai-benefit-grid-compact">' +
      benefitTooltip("member-price", icons.rewards, "购物积分 3 倍", "消费积分加速", "积分倍率和适用商品以实时会员规则为准。") +
      benefitTooltip("coupon-pack", icons.membership, "专属券包", "会员优惠集中领", "券包内容、领取时间和使用门槛以会员服务为准。") +
      benefitTooltip("monthly-benefit", icons.customization, "月月福利", "会员日限时领取", "活动内容与领取资格以当月会员活动为准。") +
      benefitTooltip("new-trial", icons.trial, "新品试用", "指定新品优先体验", "试用范围、名额和参与条件以活动页面为准。") +
      benefitTooltip("birthday", icons.referrals, "生日礼包", "生日月专属优惠", "礼包内容与发放时间以会员服务为准。") +
      benefitTooltip("support", icons.support, "优先客服", "优先接入人工客服", "实际排队时间以服务繁忙程度为准。") + '</div></div></div>';
  }

  function memberInsights() {
    return '<section class="leai-member-insights" data-member-insights data-member-section="insights" aria-labelledby="leaiMemberInsightsTitle"><div class="leai-member-insights-head"><span><img src="' + icons.sparkle + '" alt=""></span><div><h2 id="leaiMemberInsightsTitle">乐享建议</h2><small>结合用户行为、对话历史与会员资产整理</small></div></div><div class="leai-member-insight-grid">' +
      memberInsightButton("coupons", icons.membership, "会员资产", "1 张优惠券即将到期", "查看可用范围与有效期") +
      memberInsightButton("service", icons.support, "对话历史", "继续查看 Y7000P 散热服务", "承接近期设备服务咨询") +
      memberInsightButton("ledou", icons.rewards, "用户行为", "近 30 天获得 860 乐豆", "查看当前可兑会员好物") +
      '</div><p>当前建议基于 Mock 行为、对话与资产数据生成，实际内容需以授权后的实时信息为准。</p></section>';
  }

  function memberInsightButton(type, icon, source, title, description) {
    return '<button class="leai-member-insight" type="button" data-member-insight="' + type + '"><img src="' + icon + '" alt=""><span><small data-member-insight-source>' + source + '</small><strong>' + title + '</strong><em>' + description + '</em></span><img src="' + icons.next + '" alt=""></button>';
  }

  function memberLedouShowcase() {
    return '<section class="leai-panel leai-ledou-showcase" data-member-section="ledou-products"><div class="leai-panel-head"><div><h2 class="leai-panel-title">乐豆好物</h2><p>用乐豆加价换购精选好物，以下为 Mock 示例。</p></div><button class="leai-ledou-more" type="button" data-ledou-more>查看更多 <img src="' + icons.next + '" alt=""></button></div><div class="leai-ledou-products">' + ledouCatalog.map(ledouProductCard).join("") + '</div><p class="leai-member-disclaimer">商品、兑换额度、库存和成交价格以乐豆商城实时页面为准。</p></section>';
  }

  function ledouProductCard(product) {
    return '<button class="leai-ledou-product" type="button" data-ledou-product="' + product.id + '"><span><img src="' + product.icon + '" alt=""></span><span><small>会员兑购</small><strong>' + product.name + '</strong><em>' + product.price + '</em></span><img src="' + icons.next + '" alt=""></button>';
  }

  function findLedouProduct(id) {
    return ledouCatalog.find(function (product) { return product.id === id; }) || ledouCatalog[0];
  }

  function ledouPage() {
    return '<section class="leai-page" data-ledou-page aria-labelledby="leaiLedouTitle"><header class="leai-page-header"><div><h1 class="leai-page-title" id="leaiLedouTitle">乐豆好物</h1><p class="leai-page-desc">使用乐豆加价换购精选好物，选择商品可查看完整兑购说明。</p></div><span class="leai-status-pill"><img src="' + icons.rewards + '" alt="">2,580 乐豆</span></header><section class="leai-panel"><div class="leai-ledou-products">' + ledouCatalog.map(ledouProductCard).join("") + '</div><p class="leai-member-disclaimer">当前商品、价格和库存均为 Mock 演示；实际可兑商品、乐豆额度和成交价格以乐豆商城实时页面为准。</p></section></section>';
  }

  function ledouProductPage(id) {
    var product = findLedouProduct(id);
    return '<section class="leai-page" data-ledou-product-page aria-labelledby="leaiLedouProductTitle"><header class="leai-page-header"><div><p class="leai-page-kicker">乐豆好物</p><h1 class="leai-page-title" id="leaiLedouProductTitle">' + product.name + '</h1><p class="leai-page-desc">' + product.description + '</p></div><span class="leai-status-pill"><img src="' + icons.rewards + '" alt="">会员兑购</span></header><section class="leai-panel leai-ledou-detail"><div class="leai-ledou-detail-visual"><img src="' + product.icon + '" alt=""></div><div><span>参考兑购价</span><strong>' + product.price + '</strong><p>当前账户展示 2,580 乐豆，是否可兑、库存与运费需以实时商城结算页为准。</p><button class="leai-primary" type="button" data-member-asset="points">查看我的乐豆</button></div></section><section class="leai-panel"><div class="leai-panel-head"><div><h2 class="leai-panel-title">兑购说明</h2><p>浏览信息使用完整页面承接。</p></div></div><p class="leai-detail-copy">商品详情、乐豆抵扣比例、现金补差、库存、运费和售后规则以乐豆商城实时页面为准。当前页面不发起真实交易。</p></section></section>';
  }

  function profileAvatarIcon() {
    return state.profile.customAvatar || icons.membership;
  }

  function memberProfilePage() {
    var avatarSource = profileAvatarIcon();
    return '<section class="leai-page leai-member-profile-page" data-member-profile-page aria-labelledby="leaiProfileTitle"><header class="leai-page-header"><div><p class="leai-page-kicker">会员账户</p><h1 class="leai-page-title" id="leaiProfileTitle">个人信息</h1><p class="leai-page-desc">维护会员头像和基础资料；账号与绑定手机号需通过独立安全流程修改。</p></div><span class="leai-status-pill"><img src="' + icons.check + '" alt="">Mock 资料</span></header><div class="leai-profile-layout"><form class="leai-panel leai-profile-form" data-member-profile-form><div class="leai-panel-head"><div><h2 class="leai-panel-title">基础资料</h2><p>保存后同步更新会员中心的头像与昵称。</p></div></div>' +
      '<section class="leai-profile-upload" data-profile-upload data-query-focus="' + (state.profileTarget === "avatar") + '"><div class="leai-profile-upload-head"><div><strong>头像</strong><p>支持 JPG、JPEG、PNG，图片大小不能超过 4MB。</p></div><label class="leai-secondary" for="leaiProfileAvatarFile">上传图片</label></div><input class="leai-visually-hidden" id="leaiProfileAvatarFile" type="file" accept="image/jpeg,image/png"><input id="leaiProfileCustomAvatarValue" type="hidden" value="' + escapeHtml(state.profile.customAvatar) + '"><div class="leai-profile-avatar-previews"><figure><img data-profile-avatar-preview src="' + avatarSource + '" alt="头像 100 × 100 预览"><figcaption>100 × 100</figcaption></figure><figure><img data-profile-avatar-preview src="' + avatarSource + '" alt="头像 50 × 50 预览"><figcaption>50 × 50</figcaption></figure></div><p class="leai-profile-upload-status" data-profile-avatar-error aria-live="polite"></p></section><div class="leai-profile-fields"><div class="leai-field"><label for="leaiProfileNickname">会员昵称</label><input id="leaiProfileNickname" value="' + escapeHtml(state.profile.nickname) + '" maxlength="20" required></div><div class="leai-field"><label for="leaiProfileGender">性别</label><select id="leaiProfileGender"><option value="secret"' + (state.profile.gender === "secret" ? " selected" : "") + '>保密</option><option value="male"' + (state.profile.gender === "male" ? " selected" : "") + '>男</option><option value="female"' + (state.profile.gender === "female" ? " selected" : "") + '>女</option></select></div><div class="leai-field"><label for="leaiProfileBirthday">生日</label><input id="leaiProfileBirthday" type="date" value="' + escapeHtml(state.profile.birthday) + '"></div><div class="leai-field leai-profile-phone" data-profile-phone-section data-query-focus="' + (state.profileTarget === "phone") + '"><label>绑定手机号</label><div class="leai-profile-phone-row"><output>' + escapeHtml(state.profile.phone) + '</output><button class="leai-secondary" type="button" data-profile-phone-rebind>更换手机号</button></div><small data-profile-phone-status aria-live="polite">' + escapeHtml(state.profilePhoneStatus) + '</small></div></div><div class="leai-profile-actions"><button class="leai-primary" type="submit">保存个人信息</button><span data-profile-save-status aria-live="polite"></span></div></form></div></section>';
  }

  function memberDevicesPage() {
    var keys = orderedDeviceKeys();
    if (state.deviceFocusId && deviceCatalog[state.deviceFocusId]) return memberDeviceDetailPage(state.deviceFocusId);
    var eligibleKeys = keys.filter(function (key) { return Boolean(deviceCatalog[key].extensionEligible); });
    var normalKeys = keys.filter(function (key) { return !deviceCatalog[key].extensionEligible; });
    var pendingCount = state.pendingDeviceBound ? 0 : 1;
    var filterLabels = {
      all: ["全部", keys.length + pendingCount],
      attention: ["待处理", eligibleKeys.length + pendingCount],
      normal: ["保障正常", normalKeys.length],
      extension: ["可购延保", eligibleKeys.length]
    };
    var filter = filterLabels[state.deviceFilter] ? state.deviceFilter : "all";
    var visibleKeys = keys.filter(function (key) {
      if (filter === "normal") return !deviceCatalog[key].extensionEligible;
      if (filter === "attention" || filter === "extension") return Boolean(deviceCatalog[key].extensionEligible);
      return true;
    });
    var pending = !state.pendingDeviceBound && (filter === "all" || filter === "attention") ? pendingDeviceListRow() : "";
    var list = pending + visibleKeys.map(function (key) { return memberDeviceListRow(deviceCatalog[key]); }).join("");
    return '<section class="leai-page" data-member-device-page aria-labelledby="leaiDevicesTitle"><header class="leai-page-header"><div><p class="leai-page-kicker">设备资产</p><h1 class="leai-page-title" id="leaiDevicesTitle">我的设备</h1><p class="leai-page-desc">查看 Lenovo ID 下的绑定设备、保修信息和可用服务。</p></div><span class="leai-status-pill"><img src="' + icons.check + '" alt="">' + keys.length + ' 台已绑定 · ' + pendingCount + ' 台待绑定</span></header>' +
      '<section class="leai-panel leai-device-center"><div class="leai-panel-head"><div><h2 class="leai-panel-title">设备列表</h2><p>按节点筛选设备，查看完整详情或维保方案。</p></div><button class="leai-secondary" type="button" data-device-add>绑定新设备</button></div>' +
      '<div class="leai-device-filters" role="group" aria-label="设备筛选">' + Object.keys(filterLabels).map(function (key) { return deviceFilterButton(key, filterLabels[key][0], filterLabels[key][1], filter); }).join("") + '</div>' +
      '<div class="leai-device-list" data-device-unified-list aria-live="polite">' + list + '</div>' +
      (list ? "" : '<div class="leai-device-empty"><strong>当前筛选下暂无设备</strong><span>可切换到“全部”查看设备。</span></div>') +
      '<p class="leai-member-disclaimer">当前为 Mock 设备数据；设备关系、保修信息与维保方案以 Lenovo ID 设备资产服务和服务商品系统实时结果为准。</p></section></section>';
  }

  function memberDeviceDetailPage(id) {
    var device = deviceCatalog[id] || deviceCatalog.thinkbook16p;
    return '<section class="leai-page" data-member-device-detail-page data-device-detail-id="' + device.id + '" aria-labelledby="leaiDeviceDetailTitle"><header class="leai-page-header"><div><p class="leai-page-kicker">设备详情</p><div class="leai-page-title-row"><button class="leai-page-back" type="button" data-secondary-back="devices" aria-label="返回我的设备"><img src="' + icons.next + '" alt=""></button><h1 class="leai-page-title" id="leaiDeviceDetailTitle">' + escapeHtml(device.name) + '</h1></div><p class="leai-page-desc">查看当前 Lenovo ID 下的资产关系、购买信息、官方保障与可用服务。</p></div><span class="leai-status-pill"><img src="' + icons.check + '" alt="">' + escapeHtml(device.service) + '</span></header>' +
      '<section class="leai-panel leai-device-detail-hero"><div class="leai-device-detail-visual"><img src="' + device.image + '" alt="' + escapeHtml(device.name) + '"></div><div class="leai-device-detail-summary"><span>已绑定当前 Lenovo ID</span><h2>' + escapeHtml(device.product) + '</h2><p>设备编号 ' + escapeHtml(device.sn) + '</p><strong>' + escapeHtml(device.warranty) + '</strong>' + (device.extensionEligible ? '<button class="leai-secondary" type="button" data-device-warranty="' + device.id + '">查看维保方案</button>' : '') + '</div></section>' +
      '<section class="leai-panel leai-device-detail-sections"><div><h2 class="leai-panel-title">设备资产信息</h2><dl class="leai-device-detail-list"><div><dt>产品型号</dt><dd>' + escapeHtml(device.product) + '</dd></div><div><dt>设备编号</dt><dd>' + escapeHtml(device.sn) + '</dd></div><div><dt>购买时间</dt><dd>' + escapeHtml(device.purchased) + '</dd></div><div><dt>绑定关系</dt><dd>已绑定当前 Lenovo ID</dd></div></dl></div><div><h2 class="leai-panel-title">官方保障与服务</h2><dl class="leai-device-detail-list"><div><dt>保障信息</dt><dd>' + escapeHtml(device.service) + '</dd></div><div><dt>基础保修</dt><dd>' + escapeHtml(device.warranty.replace("基础保修至 ", "至 ")) + '</dd></div><div><dt>保障范围</dt><dd>以设备资产服务实时回执为准</dd></div><div><dt>可用服务</dt><dd>' + (device.extensionEligible ? "维保方案、官方维修与支持" : "官方维修与支持") + '</dd></div></dl></div></section>' +
      '<p class="leai-device-capability-note">联想乐享当前展示的是账号设备资产信息，不代表对设备实时硬件状态的检测结果。</p><p class="leai-member-disclaimer">当前为 Mock 设备数据，设备关系与保障信息以 Lenovo ID 设备资产服务实时结果为准。</p></section>';
  }

  function deviceFilterButton(key, label, count, activeFilter) {
    var active = key === activeFilter;
    return '<button class="leai-device-filter' + (active ? ' is-active' : '') + '" type="button" data-device-filter="' + key + '" aria-pressed="' + active + '"><span>' + label + '</span><strong>' + count + '</strong></button>';
  }

  function selectionPage(type) {
    var isDevice = type === "device";
    var values = isDevice ? ["拯救者游戏本", "ThinkBook 16p", "YOGA Air 14s"] : ["北京", "上海", "深圳"];
    var current = state.serviceContext[type];
    return '<section class="leai-page" data-selection-page="' + type + '"><header class="leai-page-header"><div><p class="leai-page-kicker">服务筛选</p><h1 class="leai-page-title">' + (isDevice ? "选择服务设备" : "选择服务地区") + '</h1><p class="leai-page-desc">选择后返回服务推荐页，不发送新消息。</p></div><span class="leai-status-pill">当前：' + escapeHtml(current) + '</span></header><section class="leai-panel"><div class="leai-selection-list">' + values.map(function (value) { return '<button class="leai-selection-option' + (value === current ? ' is-selected' : '') + '" type="button" data-service-context-option="' + type + '" data-service-context-value="' + value + '"><span><strong>' + value + '</strong><small>' + (value === current ? "当前已选" : "选择并返回服务推荐") + '</small></span><img src="' + icons.next + '" alt=""></button>'; }).join("") + '</div></section></section>';
  }

  function serviceDetailPage(serviceId) {
    var service = findService(serviceId) || serviceCatalog.thermal;
    var device = state.serviceDetailContext[service.id] || serviceDeviceContext(service.id);
    var isWarranty = Boolean(warrantyCatalog[service.id]);
    var guarantees = isWarranty ? [
      ["官方保障", "权益以服务系统实时结果为准"],
      ["保障续接", "生效时间以原保障到期日为准"],
      ["订单预约", "购买后可在订单查看服务权益"]
    ] : [
      ["官方服务", "由联想官方服务体系承接"],
      ["设备校验", "下单前核对型号与服务适用性"],
      ["预约到店", "购买后在订单中选择门店与时间"]
    ];
    return '<section class="leai-page leai-service-detail-page" data-service-detail-page aria-labelledby="leaiServiceDetailTitle"><div class="detail-main"><div class="detail-gallery"><div class="detail-badges"><span class="detail-badge-ai">乐享推荐</span><span class="detail-badge-hot">服务商品</span></div><div class="detail-visual"><img class="detail-product-image" src="' + service.image + '" alt="' + escapeHtml(service.name) + '"></div></div><div class="detail-info"><h1 class="leai-page-title detail-title" id="leaiServiceDetailTitle">' + escapeHtml(service.name) + '</h1><p class="detail-summary">' + escapeHtml(service.description) + '</p><div class="detail-fit-reason"><span><strong>适合你</strong> 已关联' + escapeHtml(device.name) + '，购买前仍会校验设备与服务适用性。<small>由联想乐享 AI 生成 · 仅供参考</small></span></div><div class="detail-tags"><span class="detail-tag">' + escapeHtml(service.tag) + '</span><span class="detail-tag">官方服务</span><span class="detail-tag">购买后预约</span></div><p class="detail-price">' + escapeHtml(service.price) + '</p><div class="detail-actions"><button class="detail-primary" type="button" data-service-buy="' + escapeHtml(service.id) + '">一键领优惠下单</button></div><div class="leai-service-detail-device"><strong>关联设备：' + escapeHtml(device.name) + '</strong><small>' + escapeHtml(device.product) + ' · ' + escapeHtml(device.sn) + '</small></div><div class="detail-service">' + guarantees.map(function (item) { return '<div class="service-item"><strong>' + item[0] + '</strong><span>' + item[1] + '</span></div>'; }).join("") + '</div></div></div><section class="leai-service-detail-section"><h2>服务内容</h2><p>' + escapeHtml(service.description) + '</p></section><section class="leai-service-detail-section"><h2>适用范围</h2><p>' + escapeHtml(service.scope) + '</p></section><section class="leai-service-detail-section"><h2>预约说明</h2><p>下单后可在订单中预约服务；实际门店、时间、价格与履约结果以服务系统及微信小程序回执为准。</p></section><p class="leai-member-disclaimer">当前服务商品、关联设备、价格与适用性均为 Mock 评审数据，请在购买前核对关键信息。</p></section>';
  }

  function appointmentCodePage() {
    var order = state.serviceOrder;
    if (!order) return '<section class="leai-page" data-appointment-code-page><header class="leai-page-header"><div><p class="leai-page-kicker">服务履约</p><h1 class="leai-page-title">预约服务</h1><p class="leai-page-desc">暂无可预约的服务订单。</p></div></header></section>';
    return '<section class="leai-page" data-appointment-code-page aria-labelledby="leaiAppointmentTitle"><header class="leai-page-header"><div><p class="leai-page-kicker">微信小程序衔接</p><h1 class="leai-page-title" id="leaiAppointmentTitle">微信扫码预约服务</h1><p class="leai-page-desc">打开微信扫一扫，进入联想服务小程序后选择门店与时间。</p></div><span class="leai-status-pill">订单待预约</span></header><section class="leai-panel"><div class="leai-wechat-handoff"><div class="leai-wechat-code" role="img" aria-label="微信小程序太阳码演示图"><div class="leai-wechat-code-grid">' + mockSunCodeCells() + '</div><span class="leai-wechat-code-mark"><img src="' + icons.membership + '" alt=""></span></div><div class="leai-wechat-guide"><strong>打开微信扫一扫</strong><p>扫描太阳码进入联想服务小程序，在订单中继续选择服务门店与预约时段。</p><dl><div><dt>服务订单</dt><dd>' + escapeHtml(order.orderId) + '</dd></div><div><dt>服务商品</dt><dd>' + escapeHtml(order.name) + '</dd></div><div><dt>服务设备</dt><dd>' + escapeHtml(order.device) + ' · ' + escapeHtml(order.sn) + '</dd></div></dl></div></div><p class="leai-member-disclaimer">演示太阳码，仅用于交互评审，当前不可真实扫描或预约；实际结果以微信小程序和履约服务回执为准。</p></section></section>';
  }

  function memberDevicesSection() {
    var keys = orderedDeviceKeys();
    var previewKeys = keys.slice(0, state.pendingDeviceBound ? devicePreviewLimit : devicePreviewLimit - 1);
    var pending = state.pendingDeviceBound ? "" : pendingDeviceCard();
    return '<section class="leai-panel leai-member-devices" id="leaiMemberDevices" data-member-devices><div class="leai-panel-head"><div><h2 class="leai-panel-title">我的设备</h2><p>已绑定 ' + keys.length + ' 台设备，最近使用的设备可横向浏览。</p></div><div class="leai-device-section-actions"><span class="leai-section-meta">设备资产服务</span><button class="leai-secondary" type="button" data-device-add>绑定新设备</button></div></div>' +
      '<div class="leai-device-browser"><div class="leai-device-browser-toolbar"><span class="leai-device-range" data-device-range>' + deviceRangeLabel(1, 4) + '</span><div class="leai-device-browser-actions"><button class="leai-device-nav is-previous" type="button" data-device-scroll="-1" aria-label="浏览上一组设备" disabled><img src="' + icons.next + '" alt=""></button><button class="leai-device-nav" type="button" data-device-scroll="1" aria-label="浏览下一组设备"><img src="' + icons.next + '" alt=""></button><button class="leai-secondary" type="button" data-device-more>查看全部 ' + keys.length + ' 台</button></div></div>' +
      '<div class="leai-device-grid" data-device-track tabindex="0" role="region" aria-label="最近使用的设备，可横向浏览">' + pending + previewKeys.map(function (key) { return memberDeviceCard(deviceCatalog[key]); }).join("") + '</div></div>' +
      '<p class="leai-member-disclaimer">横向区域最多展示最近使用的 ' + previewKeys.length + ' 台；全部设备、设备关系与保障状态以 Lenovo ID 下的设备资产服务实时结果为准。</p></section>';
  }

  function orderedDeviceKeys() {
    var keys = Object.keys(deviceCatalog);
    if (!state.recentDeviceId || keys.indexOf(state.recentDeviceId) < 0) return keys;
    return [state.recentDeviceId].concat(keys.filter(function (key) { return key !== state.recentDeviceId; }));
  }

  function pendingDeviceCard() {
    return '<article class="leai-device-card leai-device-card-pending" data-device-slide data-member-device-pending="xiaoxinpro16"><div class="leai-device-visual"><img src="' + pendingPurchasedDevice.image + '" alt=""></div><div class="leai-device-body"><div><span>已识别官方订单</span><h3>' + pendingPurchasedDevice.name + '</h3><p>已购买·待绑定</p></div><dl><div><dt>购买时间</dt><dd>' + pendingPurchasedDevice.purchased + '</dd></div><div><dt>状态</dt><dd>尚未绑定</dd></div></dl><div class="leai-device-card-actions"><button class="leai-primary" type="button" data-device-bind-purchased>一键绑定</button></div></div></article>';
  }

  function memberDeviceCard(device) {
    return '<article class="leai-device-card" data-device-slide data-member-device="' + device.id + '"><div class="leai-device-visual"><img src="' + device.image + '" alt=""></div><div class="leai-device-body"><div><span>' + escapeHtml(device.service) + '</span><h3>' + escapeHtml(device.name) + '</h3><p>' + escapeHtml(device.name) + '</p></div><dl><div><dt>设备编号</dt><dd>' + escapeHtml(device.sn) + '</dd></div><div><dt>保障</dt><dd>' + escapeHtml(device.warranty.replace("基础保修至 ", "至 ")) + '</dd></div></dl><div class="leai-device-card-actions"><button class="leai-secondary" type="button" data-device-detail="' + device.id + '">查看详情</button>' + (device.extensionEligible ? '<button class="leai-primary" type="button" data-device-warranty="' + device.id + '">推荐延保方案</button>' : '') + '</div></div></article>';
  }

  function deviceRangeLabel(first, last) {
    var total = Object.keys(deviceCatalog).length;
    return state.pendingDeviceBound ? "常用设备 " + first + "–" + last + " / 共 " + total + " 台" : "常用设备 " + first + "–" + last + " / " + total + " 台已绑定 · 1 台待绑定";
  }

  function pendingDeviceListRow() {
    return '<article class="leai-device-list-row is-pending" data-device-list-item data-member-device-pending="' + pendingPurchasedDevice.id + '"><img src="' + pendingPurchasedDevice.image + '" alt=""><span class="leai-device-list-copy"><small>已识别官方订单 · 待绑定</small><strong>' + pendingPurchasedDevice.name + '</strong><em>' + pendingPurchasedDevice.product + ' · ' + pendingPurchasedDevice.sn + '</em></span><span class="leai-device-row-warranty"><small>购买于</small><strong>' + pendingPurchasedDevice.purchased + '</strong></span><span class="leai-device-row-actions"><button class="leai-primary" type="button" data-device-bind-purchased>一键绑定</button></span></article>';
  }

  function memberDeviceListRow(device) {
    var maintenance = device.extensionEligible ? '<button class="leai-secondary leai-maintenance-button" type="button" data-device-warranty="' + device.id + '">查看维保方案</button><small>' + escapeHtml(device.maintenanceReason || "保障节点推荐") + '</small>' : "";
    return '<article class="leai-device-list-row" data-device-list-item data-member-device="' + device.id + '"><img src="' + device.image + '" alt=""><span class="leai-device-list-copy"><strong>' + escapeHtml(device.name) + '</strong><small>' + escapeHtml(device.product) + ' · ' + escapeHtml(device.sn) + '</small></span><span class="leai-device-row-warranty"><small>保修至</small><strong>' + escapeHtml(device.warranty.replace("基础保修至 ", "")) + '</strong></span><span class="leai-device-row-actions"><button class="leai-secondary" type="button" data-device-detail="' + device.id + '">查看详情</button>' + maintenance + '</span></article>';
  }

  function personalIdentityTrack() {
    return '<section class="leai-identity-card leai-identity-track leai-personal-track" data-identity-card="personal-member" data-identity-track="personal" data-membership-system="personal"><div class="leai-identity-track-head"><span>个人会员等级</span><em>已生效</em></div><h3>铂金会员</h3><div class="leai-growth-journey"><div><span>铂金</span><span>钻石</span></div><i></i></div><div class="leai-growth-meta"><span>成长值 3,680 / 10,000</span><span>还差 6,320 成长值</span></div><p class="leai-growth-unlocks"><span>升级可获得</span>新品优先购 · 延保专享 · 专属客服</p></section>';
  }

  function educationIdentityTrack() {
    syncStudentAuthState();
    var status = state.identityStatus.student;
    var reviewing = status === "reviewing";
    var verified = status === "verified";
    var title = verified ? "已经认证" : reviewing ? "学生认证审核中" : "学生身份未认证";
    var description = verified ? "教育权益已生效" : reviewing ? (state.educationPath ? state.educationPath + "申请已提交" : "申请已提交，以审核结果为准") : "认证后解锁教育特惠";
    var action = verified ? '<div class="leai-identity-track-actions"><button type="button" data-education-benefit="coupons">教育优惠券</button><button type="button" data-education-benefit="products">教育特惠商品</button></div>' : reviewing ? "" : identityTrackAction("student", "办理学生认证", "");
    return '<section class="leai-identity-card leai-identity-track leai-education-track is-' + status + '" data-identity-track="education" data-identity-card="student" data-identity-status="' + status + '"><div class="leai-identity-track-head"><span>教育身份</span><em>' + (verified ? "已认证" : reviewing ? "审核中" : "优先认证") + '</em></div><h3>' + title + '</h3><p>' + description + '</p>' + action + '</section>';
  }

  function identityTrackAction(type, title, className) {
    return '<button class="leai-identity-track-action' + (className ? " " + className : "") + '" type="button" data-member-task="' + type + '">' + title + ' <img src="' + icons.next + '" alt=""></button>';
  }

  function memberAssetButton(type, value, label, description) {
    return '<button class="leai-member-asset" type="button" data-member-asset="' + type + '"><strong>' + value + '</strong><span>' + label + '</span><small>' + description + '</small></button>';
  }

  function memberBenefitItem(title, description) {
    return '<article class="leai-locked-benefit"><strong>' + title + '</strong><span>' + description + '</span></article>';
  }

  function benefitTooltip(key, icon, title, description, tooltip) {
    return '<button class="leai-benefit leai-tooltip-trigger" type="button" data-member-benefit="' + key + '" data-tooltip="' + key + '"><span class="leai-benefit-icon"><img src="' + icon + '" alt=""></span><strong>' + title + '</strong><small>' + description + '</small><span class="leai-tooltip" role="tooltip">' + tooltip + '</span></button>';
  }

  function memberTaskButton(type, title, description) {
    return '<button class="leai-task-button" type="button" data-member-task="' + type + '"><span><strong>' + title + '</strong><small>' + description + '</small></span><img src="' + icons.next + '" alt=""></button>';
  }

  function servicePage() {
    if (state.serviceMode === "warranty") return warrantyServicePage();
    return '<section class="leai-page" aria-labelledby="leaiServiceTitle">' + recommendationBrief("拯救者游戏本") +
      '<div class="leai-service-list" aria-label="推荐服务商品列表">' +
      serviceCard(serviceCatalog.clean, false, 1) + serviceCard(serviceCatalog.thermal, false, 2) + serviceCard(serviceCatalog.care, false, 3) +
      '</div><p class="leai-member-disclaimer">推荐由联想乐享基于当前 Mock 设备与地区条件生成；价格、适用性、库存与履约范围以服务商品详情页和结算页为准。</p>' +
      compareBar() + '</section>';
  }

  function warrantyServicePage() {
    var device = deviceCatalog[state.serviceDeviceId] || deviceCatalog.legiony7000p;
    var services = Object.keys(warrantyCatalog).map(function (key, index) { return serviceCard(warrantyCatalog[key], true, index + 1); }).join("");
    return '<section class="leai-page" aria-labelledby="leaiServiceTitle">' + warrantyRecommendationBrief(device) +
      '<div class="leai-service-list" aria-label="推荐延保服务商品列表">' + services + '</div><p class="leai-member-disclaimer">具体可购买性、价格与服务范围以服务商品系统实时校验结果为准。</p>' + compareBar() + '</section>';
  }

  function warrantyRecommendationBrief(device) {
    var options = orderedDeviceKeys().filter(function (key) { return Boolean(deviceCatalog[key].extensionEligible); }).map(function (key) {
      return warrantyDeviceOption(deviceCatalog[key], device.id === key);
    }).join("");
    return '<header class="leai-recommendation-brief leai-warranty-brief"><div><h1 class="leai-page-title" id="leaiServiceTitle">延保服务推荐</h1><p>已根据设备型号、购买时间和保障节点完成适用性筛选。</p></div><div class="leai-warranty-device-selector"><button class="leai-associated-device leai-warranty-device-trigger" type="button" data-warranty-device-trigger aria-expanded="' + state.warrantyDevicePickerOpen + '" aria-controls="leaiWarrantyDeviceOptions"><span>适用设备：' + escapeHtml(device.name) + ' · ' + escapeHtml(device.sn) + '</span><img src="' + icons.expand + '" alt=""></button>' + (state.warrantyDevicePickerOpen ? '<div class="leai-warranty-device-options" id="leaiWarrantyDeviceOptions" role="listbox" aria-label="选择适用设备">' + options + '</div>' : "") + '</div></header>';
  }

  function warrantyDeviceOption(device, selected) {
    return '<button class="leai-warranty-device-card' + (selected ? ' is-selected' : '') + '" type="button" role="option" data-warranty-device-option="' + device.id + '" aria-selected="' + selected + '"><img src="' + device.image + '" alt=""><span><strong>' + escapeHtml(device.name) + '</strong><small>' + escapeHtml(device.product) + ' · ' + escapeHtml(device.sn) + '</small><em>' + escapeHtml(device.warranty) + '</em></span><b>' + escapeHtml(device.maintenanceReason || "保障节点推荐") + '</b></button>';
  }

  function recommendationBrief(deviceName) {
    return '<header class="leai-recommendation-brief"><h1 class="leai-page-title" id="leaiServiceTitle">乐享推荐</h1><p class="leai-associated-device">关联设备：' + escapeHtml(deviceName) + '</p></header>';
  }

  function serviceCard(service, isWarranty, index) {
    var selected = state.serviceCompare.indexOf(service.id) >= 0;
    var recommended = state.serviceRecommended === service.id;
    return '<article class="reco-row' + (recommended ? " is-recommended" : "") + '" data-service-id="' + service.id + '"' + (isWarranty ? ' data-warranty-service' : '') + '><span class="leai-service-rank" aria-hidden="true">' + index + '</span><img src="' + service.image + '" alt=""><div class="reco-row-main"><div class="leai-service-labels"><button class="leai-service-tag leai-tooltip-trigger" type="button" data-tooltip-trigger><span>' + service.tag + '</span><span class="leai-tooltip" role="tooltip">' + service.scope + '</span></button>' + (recommended ? '<span class="leai-recommended-badge">乐享推荐</span>' : "") + '</div><h2>' + service.name + '</h2><p class="reco-row-desc">' + service.description + '</p><button class="leai-service-compare-link" type="button" data-service-compare="' + service.id + '" aria-pressed="' + selected + '">' + (selected ? "已加入比较" : "加入比较") + '</button></div><div class="reco-row-side"><strong class="reco-row-price">' + service.price + '</strong><div class="reco-row-actions"><button class="lx-p0-btn" type="button" data-service-detail="' + service.id + '">查看详情</button><button class="lx-p0-btn primary" type="button" data-service-buy="' + service.id + '">立即购买</button></div></div></article>';
  }

  function serviceOrdersPage() {
    var order = state.serviceOrder;
    if (!order) return '<section class="leai-page leai-orders-page"><div class="lx-orders-wrap"><div class="ohead"><h2><span class="bar"></span>我的订单</h2><span class="cnt">共 0 笔订单</span></div><section class="leai-order-empty"><strong>暂无服务订单</strong><p>购买服务商品后，可从这里继续预约和查看履约状态。</p></section></div></section>';
    return '<section class="leai-page leai-orders-page" aria-labelledby="leaiOrdersTitle"><div class="lx-orders-wrap"><div class="ohead"><h2 id="leaiOrdersTitle"><span class="bar"></span>我的订单</h2><span class="cnt">共 1 笔订单</span></div><div class="ol lx-order-skin"><article class="ord" data-service-order><div class="shot"><img src="' + order.image + '" alt=""></div><div class="mid"><div class="pn"><span class="nm">' + escapeHtml(order.name) + '</span><span class="ost done"><span class="d"></span>' + escapeHtml(order.status) + '</span></div><div class="meta"><span>服务订单</span><span class="sn">' + escapeHtml(order.orderId) + '</span><span class="dot"></span><span>' + escapeHtml(order.createdAt) + '</span><span class="amt">' + escapeHtml(order.price) + '</span></div><div class="recv">设备：' + escapeHtml(order.device) + ' · ' + escapeHtml(order.sn) + '　预约门店与时段请前往微信小程序选择</div></div><div class="acts"><button class="obtn order-ghost" type="button" data-service-detail="' + escapeHtml(state.serviceSelectedId) + '">订单详情</button><button class="obtn solid" type="button" data-service-order-appointment>预约服务</button></div><span class="leai-order-sync" data-service-status="purchase">' + escapeHtml(state.servicePurchaseStatus) + '</span></article></div><p class="leai-member-disclaimer">当前订单号、价格和状态均为 Mock 演示数据；预约入口仅展示渠道衔接，实际订单与履约结果以服务系统和微信小程序回执为准。</p></div></section>';
  }

  function compareBar() {
    var visible = state.serviceCompare.length > 0;
    var items = state.serviceCompare.map(function (id) {
      var service = findService(id);
      return '<span class="leai-compare-item" data-compare-item><span>' + service.name + '</span><button type="button" data-compare-remove="' + id + '" aria-label="移除' + service.name + '">移除</button></span>';
    }).join("");
    return '<aside class="leai-compare-bar' + (visible ? " is-visible" : "") + '" id="leaiCompareBar" aria-live="polite"><div><strong>服务比较</strong><span>' + state.serviceCompare.length + '/2</span></div><div class="leai-compare-items">' + items + '</div><div class="leai-compare-actions"><button class="leai-secondary" type="button" data-compare-clear>清空</button><button class="leai-primary" type="button" data-service-task="recommend"' + (state.serviceCompare.length < 2 ? " disabled" : "") + '>让乐享帮我选</button></div></aside>';
  }

  function findService(id) {
    return serviceCatalog[id] || warrantyCatalog[id] || null;
  }

  function educationPage() {
    var verified = state.identityStatus.student === "verified";
    var products = [
      ["小新 Pro 16 AI 元启版", "2.5K 高刷屏 · 轻办公与创作", "¥6,399起", "/assets/img/shop-2.jpg"],
      ["YOGA Air 14s", "OLED 触控屏 · 轻薄学习", "¥7,999起", "/assets/img/shop-4.jpg"],
      ["ThinkBook 16p", "专业性能 · 设计与视频创作", "¥9,499起", "/assets/img/thinkbook.jpg"],
      ["拯救者 Y7000P", "高性能显卡 · 游戏与专业计算", "¥8,499起", "/assets/img/shop-1.jpg"]
    ];
    if (!verified) return '<section class="leai-page"><header class="leai-page-header"><div><p class="leai-page-kicker">个人及家庭</p><h1 class="leai-page-title">教育特惠专区</h1><p class="leai-page-desc">认证通过后可查看实时适用商品。</p></div><span class="leai-status-pill">资格待确认</span></header></section>';
    return '<section class="leai-page" data-education-product-page><header class="leai-page-header"><div><p class="leai-page-kicker">学生身份已认证</p><h1 class="leai-page-title">教育优惠商品推荐</h1><p class="leai-page-desc">已按学习、创作和性能场景整理参与教育优惠活动的商品；价格、库存与教育优惠以商品页和结算页为准。</p></div><span class="leai-status-pill"><img src="' + icons.check + '" alt="">教育权益已生效</span></header><section class="leai-level-ai-summary"><img src="' + icons.sparkle + '" alt=""><div><strong>联想乐享推荐摘要</strong><p>优先关注便携性、屏幕素质和专业性能，下列商品覆盖轻学习、创作与高性能场景。</p><small>内容由联想乐享基于当前身份和活动信息生成，请核对关键信息。</small></div></section><div class="leai-education-product-grid">' + products.map(function (product) { return '<article class="leai-education-product" data-education-product><div><img src="' + product[3] + '" alt=""></div><span>教育特惠</span><h2>' + product[0] + '</h2><p>' + product[1] + '</p><strong>' + product[2] + '</strong></article>'; }).join("") + '</div></section>';
  }

  function checkinPage() {
    var days = ["一", "二", "三", "四", "五", "六", "日"];
    return '<section class="leai-page" data-member-checkin-page-view aria-labelledby="leaiCheckinTitle"><header class="leai-page-header"><div><p class="leai-page-kicker">会员任务</p><h1 class="leai-page-title" id="leaiCheckinTitle">会员签到</h1><p class="leai-page-desc">每日签到获得乐豆，连续签到可解锁里程碑奖励。</p></div><span class="leai-status-pill"><img src="' + icons.check + '" alt="">会员任务服务</span></header><section class="leai-checkin-hero"><div><span data-member-checkin-status>' + (state.memberCheckedIn ? "今日已签到" : "今日尚未签到") + '</span><h2>' + (state.memberCheckedIn ? "已获得 10 乐豆" : "连续签到第 6 天") + '</h2><p>' + (state.memberCheckedIn ? "明日继续签到，向 30 天里程碑进阶。" : "再签 1 天即可解锁连签奖励。") + '</p></div><button class="leai-primary" type="button" data-member-checkin' + (state.memberCheckedIn ? " disabled" : "") + '>' + (state.memberCheckedIn ? "今日已签到" : "请乐享签到") + '</button></section><section class="leai-panel"><div class="leai-panel-head"><div><h2 class="leai-panel-title">本周签到</h2><p>奖励以会员任务服务实时回执为准。</p></div><strong class="leai-section-meta">已连续 6 天</strong></div><div class="leai-checkin-week">' + days.map(function (day, index) { var done = index < 5 || (index === 5 && state.memberCheckedIn); return '<div class="' + (done ? "is-done" : index === 5 ? "is-today" : "") + '"><span>' + day + '</span><strong>' + (done ? "已签" : index === 5 ? "今日" : "+10") + '</strong></div>'; }).join("") + '</div></section><section class="leai-panel"><div class="leai-panel-head"><div><h2 class="leai-panel-title">连签里程碑</h2><p>持续签到可获得额外奖励。</p></div></div><div class="leai-checkin-milestones"><div><span><strong>连续 7 天</strong><small>明日即可解锁</small></span><em>+50 乐豆</em></div><div><span><strong>累计 30 天</strong><small>当前 6 / 30</small></span><em>会员专属券</em></div><div><span><strong>累计 365 天</strong><small>长期会员里程碑</small></span><em>年度权益</em></div></div><p class="leai-member-disclaimer">当前为 Mock 评审数据，实际签到状态、奖励和发放结果以会员任务服务回执为准。</p></section></section>';
  }

  function toggleLab(open) { var lab = el("#leaiLab"); lab.classList.toggle("is-open", open); lab.setAttribute("aria-hidden", open ? "false" : "true"); }

  function resetConversation() {
    closeRightView(true);
    el("#leaiThread").innerHTML = "";
    document.body.dataset.state = "default";
    el(".assistant-panel .default-state").style.display = "block";
    el(".assistant-panel .chat-state").style.display = "none";
    hideSug();
  }

  function prefersReduced() { return window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches; }
  function delay(ms) { return new Promise(function (resolve) { window.setTimeout(resolve, ms); }); }
  function nextFrame() { return new Promise(function (resolve) { window.requestAnimationFrame(function () { window.requestAnimationFrame(resolve); }); }); }

  function bootMemberEmbed() {
    syncStudentAuthState();
    boot();
    window.addEventListener("storage", function (event) {
      if (event.key === studentAuthStorageKey) refreshStudentAuthState();
    });
    window.addEventListener("focus", refreshStudentAuthState);
    window.setInterval(refreshStudentAuthState, 1000);
    if (new URLSearchParams(location.search).get("embed") === "member") {
      window.setTimeout(function () { openRightView("member"); }, 0);
    }
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", bootMemberEmbed);
  else bootMemberEmbed();
})();

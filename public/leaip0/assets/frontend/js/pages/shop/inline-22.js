(function registerComponentAssistantPreview() {
        function renderComponentAssistantPreview() {
          var previewMode = window.__LX_COMPONENT_ASSISTANT_PREVIEW || "";
          var isDefaultPreview = previewMode === "default" || window.location.hash === "#component-assistant-default";
          var isConversationPreview = previewMode === "conversation" || window.location.hash === "#component-assistant-conversation";
          if (!isDefaultPreview && !isConversationPreview) return;
        if ("scrollRestoration" in history) history.scrollRestoration = "manual";
        window.scrollTo(0, 0);
        document.body.classList.add("component-assistant-preview");
        document.body.dataset.state = isDefaultPreview ? "default" : "chat";
        var shell = document.querySelector("body > .shell");
        var panel = document.querySelector("body > .shell > .assistant-panel");
        var content = document.querySelector("body > .shell > .content");
        var topbar = document.querySelector("body > .topbar");
        if (topbar) topbar.style.setProperty("display", "none", "important");
        if (content) content.style.setProperty("display", "none", "important");
        var previewWidth = isDefaultPreview ? 410 : 546;
        if (shell) {
          shell.style.setProperty("display", "block", "important");
          shell.style.setProperty("width", previewWidth + "px", "important");
          shell.style.setProperty("height", "100vh", "important");
          shell.style.setProperty("min-height", "100vh", "important");
          shell.style.setProperty("padding", "0", "important");
        }
        if (panel) {
          panel.style.setProperty("display", "block", "important");
          panel.style.setProperty("visibility", "visible", "important");
          panel.style.setProperty("opacity", "1", "important");
          panel.style.setProperty("width", previewWidth + "px", "important");
          panel.style.setProperty("height", "100vh", "important");
          panel.style.setProperty("min-height", "680px", "important");
          panel.style.setProperty("max-height", "none", "important");
        }
        var defaultState = document.querySelector(".assistant-panel .default-state");
        var chatState = document.querySelector(".assistant-panel .chat-state");
        var dots = document.querySelector(".assistant-panel .page-dots");
          if (!chatState) return;
        if (isDefaultPreview) {
          if (defaultState) defaultState.removeAttribute("hidden");
          chatState.innerHTML = "";
          chatState.setAttribute("hidden", "");
          if (dots) {
            dots.classList.add("is-empty");
            dots.innerHTML = "";
          }
          var defaultInput = document.querySelector(".assistant-panel .composer textarea");
          if (defaultInput) {
            defaultInput.value = "";
            defaultInput.placeholder = "推荐一款适合我的笔记本电脑";
            defaultInput.setAttribute("aria-label", "输入你的问题");
          }
          return;
        }
        if (defaultState) defaultState.setAttribute("hidden", "");
        chatState.removeAttribute("hidden");
        chatState.innerHTML = [
          '<div class="lx-p0-messages" aria-live="polite">',
            '<div class="lx-p0-message msg user"><div class="user-bubble">推荐一款适合办公的笔记本电脑</div></div>',
            '<div class="lx-p0-message msg ai lx-chat-skin loading"><div class="ai-body"><div class="loading-line"><span class="typing-text">联想乐享正在生成中...</span><span class="typing-cursor"></span></div></div></div>',
            '<div class="lx-p0-message msg ai lx-chat-skin"><div class="ai-body">',
              '<p class="lx-detail-chat-copy lx-msg-text">根据你的办公需求，我建议优先关注轻薄便携、续航和多任务性能。下面这款兼顾日常办公、视频会议与移动使用。</p>',
              '<div class="lx-detail-chat-result"><button class="answer-cta lx-answer-reco" type="button" aria-label="查看推荐商品详情" aria-pressed="false">',
                '<span class="answer-cta-copy"><span class="answer-cta-title">YOGA Air 14c 2026</span><span class="answer-cta-desc">酷睿 Ultra 9｜32G｜2T｜2.8K OLED</span></span>',
                '<span class="answer-cta-icon" aria-hidden="true"><img src="../icons/global-next.svg" alt=""></span>',
              '</button></div>',
              '<div class="lx-preview-followups" aria-label="推荐追问">',
                '<button class="quick-item" type="button"><span>这款适合经常出差吗？</span><img class="arrow" src="../icons/global-next.svg" alt=""></button>',
                '<button class="quick-item" type="button"><span>对比同价位的 ThinkPad</span><img class="arrow" src="../icons/global-next.svg" alt=""></button>',
                '<button class="quick-item" type="button"><span>看看当前优惠</span><img class="arrow" src="../icons/global-next.svg" alt=""></button>',
              '</div>',
            '</div></div>',
          '</div>'
        ].join("");
          if (dots) {
          dots.classList.remove("is-empty");
          dots.innerHTML = '<i></i><i class="active"></i><div class="prompt-menu" role="menu"><div class="menu-row">推荐一款适合办公的笔记本电脑</div></div>';
          }
          var input = document.querySelector(".assistant-panel .composer textarea");
          if (input) {
            input.value = "想了解这款电脑的接口配置";
            input.setAttribute("aria-label", "继续追问");
          }
        }
        function schedulePreview() {
          window.requestAnimationFrame(function () {
            renderComponentAssistantPreview();
            window.setTimeout(function () {
              renderComponentAssistantPreview();
              window.scrollTo(0, 0);
            }, 80);
            window.setTimeout(function () {
              renderComponentAssistantPreview();
              window.scrollTo(0, 0);
            }, 320);
          });
        }
        if (document.readyState === "loading") {
          document.addEventListener("DOMContentLoaded", schedulePreview, { once: true });
        } else {
          schedulePreview();
        }
        window.addEventListener("hashchange", schedulePreview);
        window.addEventListener("message", function (event) {
          if (!event.data || event.data.type !== "component-assistant-resize") return;
          var width = Math.max(390, Math.min(720, Number(event.data.width) || 546));
          var shell = document.querySelector("body > .shell");
          var panel = document.querySelector("body > .shell > .assistant-panel");
          document.body.style.setProperty("--assistant-panel-width", width + "px");
          if (shell) shell.style.setProperty("width", width + "px", "important");
          if (panel) panel.style.setProperty("width", width + "px", "important");
        });
      })();

(function registerDeviceSceneHall() {
  var hall = document.querySelector(".device-scene-hall");
  if (!hall) return;

  var sceneProfiles = {
    personal: [
    {
      name: "电竞游戏",
      title: "沉浸竞技，性能全开",
      description: "从高帧竞技到沉浸娱乐，为你搭配流畅专注的游戏设备组合。",
      price: "11,820",
      product: "拯救者 Y9000P 2026",
      specs: "RTX 5060 · 2.5K 240Hz · 32GB",
      image: "../img/game-scene.jpg",
      overlay: "linear-gradient(90deg,#101010 0%,rgba(77,20,74,.48) 44%,transparent 72%)",
      hotspotLeft: "76%",
      hotspotTop: "38%"
    },
    {
      name: "专业创作",
      title: "灵感迸发，创作全开",
      description: "从灵感创作到多任务渲染，为你搭配高效稳定的专业设备。",
      price: "8,999",
      product: "ThinkPad T14p 2026",
      specs: "酷睿 Ultra 9 · 32GB · 2TB · 2.8K OLED",
      image: "../img/creation-scene.jpg",
      overlay: "linear-gradient(90deg,#101010 0%,rgba(77,20,74,.48) 44%,transparent 72%)",
      hotspotLeft: "72%",
      hotspotTop: "40%"
    },
    {
      name: "移动办公",
      title: "轻装随行，效率在线",
      description: "从移动办公到差旅协同，为你搭配轻薄持久的高效设备组合。",
      price: "1,299",
      product: "小新Pad Pro 12.7英寸",
      specs: "酷睿 Ultra 7 · 轻薄商务 · 长续航",
      image: "../img/working-scene.jpg",
      overlay: "linear-gradient(90deg,rgba(12,35,66,.94) 0%,rgba(24,72,148,.78) 38%,rgba(73,126,214,.4) 68%,transparent 88%)",
      hotspotLeft: "74%",
      hotspotTop: "38%"
    }
    ],
    business: [
      {
        name: "高效办公",
        title: "高效办公，灵活成长",
        description: "从团队协作到业务拓展，为成长型企业搭配稳定高效的智能办公设备。",
        price: "11,799",
        product: "ThinkPad T14 2025",
        specs: "锐龙 AI 7 PRO · 32GB · 512GB",
        image: "../img/business-banner-1.jpg",
        overlay: "linear-gradient(90deg,rgba(24,7,33,.96) 0%,rgba(77,20,74,.58) 48%,transparent 78%)",
        hotspotLeft: "76%",
        hotspotTop: "38%"
      },
      {
        name: "企业协同",
        title: "稳定协同，业务加速",
        description: "覆盖会议、协作与集中管理，为企业团队提供可靠顺畅的生产力体验。",
        price: "16,299",
        product: "ThinkPad P16s 2025",
        specs: "酷睿 Ultra 7 · 32GB · 1TB",
        image: "../img/business-banner-2.jpg",
        overlay: "linear-gradient(90deg,rgba(24,7,33,.96) 0%,rgba(77,20,74,.55) 48%,transparent 78%)",
        hotspotLeft: "75%",
        hotspotTop: "40%"
      },
      {
        name: "移动办公",
        title: "轻装随行，效率在线",
        description: "兼顾轻薄便携、长效续航与安全管理，让工作随时随地高效展开。",
        price: "13,999",
        product: "ThinkPad X1 Carbon AI",
        specs: "酷睿 Ultra 7 · 轻薄商务 · 长续航",
        image: "../img/working-scene.jpg",
        overlay: "linear-gradient(90deg,rgba(12,35,66,.94) 0%,rgba(24,72,148,.78) 42%,transparent 86%)",
        hotspotLeft: "74%",
        hotspotTop: "38%"
      }
    ],
    enterprise: [
      {
        name: "智算中心",
        title: "智算驱动，规模增长",
        description: "面向核心业务与大规模算力场景，提供稳定、安全、可持续演进的基础设施。",
        price: "28,500",
        product: "ThinkStation P 系列工作站",
        specs: "专业算力 · 集中管理 · 安全可靠",
        image: "../img/enterprise-banner-1.jpg",
        overlay: "linear-gradient(90deg,rgba(18,7,28,.96) 0%,rgba(77,20,74,.58) 48%,transparent 80%)",
        hotspotLeft: "76%",
        hotspotTop: "38%"
      },
      {
        name: "行业方案",
        title: "行业融合，稳健落地",
        description: "围绕政务、教育与重点行业场景，整合终端、平台和全周期服务能力。",
        price: "30,299",
        product: "联想行业智能解决方案",
        specs: "全栈方案 · 安全部署 · 持续服务",
        image: "../img/enterprise-banner-2.jpg",
        overlay: "linear-gradient(90deg,rgba(18,7,28,.96) 0%,rgba(77,20,74,.58) 48%,transparent 80%)",
        hotspotLeft: "75%",
        hotspotTop: "40%"
      },
      {
        name: "智能制造",
        title: "端边云协同，生产提效",
        description: "连接研发、生产与运维环节，以智能算力和行业服务推动业务提质增效。",
        price: "34,799",
        product: "ThinkStation P16 移动工作站",
        specs: "专业显卡 · 企业安全 · 全周期服务",
        image: "../img/industry/produce.jpg",
        overlay: "linear-gradient(90deg,rgba(18,7,28,.96) 0%,rgba(77,20,74,.62) 48%,transparent 82%)",
        hotspotLeft: "74%",
        hotspotTop: "38%"
      }
    ]
  };
  var profile = hall.dataset.sceneProfile || document.body.dataset.page || "personal";
  var scenes = sceneProfiles[profile] || sceneProfiles.personal;

  var currentIndex = 0;
  var title = hall.querySelector(".device-scene-copy h2");
  var description = hall.querySelector("[data-device-scene-desc]");
  var price = hall.querySelector("[data-device-scene-price]");
  var hotspot = hall.querySelector(".device-scene-hotspot");
  var product = hall.querySelector(".device-scene-product-popover strong");
  var specs = hall.querySelector(".device-scene-product-popover > span");
  var currentLabel = hall.querySelector(".device-scene-current");
  var sceneCount = hall.querySelector(".device-scene-count");
  var picker = hall.querySelector(".device-scene-picker");
  var menuButtons = hall.querySelectorAll("[data-device-scene]");
  var pickerCloseTimer = 0;
  var hotspotPreviewTimer = 0;

  function previewHotspot() {
    window.clearTimeout(hotspotPreviewTimer);
    hotspot.classList.remove("is-auto-open");
    void hotspot.offsetWidth;
    hotspot.classList.add("is-auto-open");
    hotspotPreviewTimer = window.setTimeout(function () {
      hotspot.classList.remove("is-auto-open");
    }, 2000);
  }

  function renderScene(index) {
    currentIndex = (index + scenes.length) % scenes.length;
    var scene = scenes[currentIndex];
    title.textContent = scene.title;
    description.textContent = scene.description;
    price.textContent = scene.price;
    product.textContent = scene.product;
    specs.textContent = scene.specs;
    currentLabel.textContent = "当前: " + scene.name + "场景";
    sceneCount.textContent = (currentIndex + 1) + "/" + scenes.length;
    hotspot.setAttribute("aria-label", "查看" + scene.product + "商品信息");
    hotspot.style.left = scene.hotspotLeft;
    hotspot.style.top = scene.hotspotTop;
    hall.style.backgroundImage = 'url("' + new URL(scene.image, document.baseURI).href + '")';
    hall.style.setProperty("--device-scene-overlay", scene.overlay);
    menuButtons.forEach(function (button) {
      button.classList.toggle("is-active", Number(button.dataset.deviceScene) === currentIndex);
    });
    previewHotspot();
  }

  hall.querySelector(".device-scene-prev").addEventListener("click", function () {
    renderScene(currentIndex - 1);
  });
  hall.querySelector(".device-scene-next").addEventListener("click", function () {
    renderScene(currentIndex + 1);
  });
  menuButtons.forEach(function (button) {
    button.addEventListener("click", function () {
      renderScene(Number(button.dataset.deviceScene));
      picker.removeAttribute("open");
    });
  });
  picker.addEventListener("mouseenter", function () {
    window.clearTimeout(pickerCloseTimer);
    picker.setAttribute("open", "");
  });
  picker.addEventListener("mouseleave", function () {
    pickerCloseTimer = window.setTimeout(function () {
      picker.removeAttribute("open");
    }, 120);
  });
  renderScene(0);
})();

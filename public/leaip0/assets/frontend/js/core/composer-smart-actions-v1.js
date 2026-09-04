(function () {
  "use strict";

  var recommendationFlowArmed = false;
  var wasSending = false;
  function syncSendCollapse() {
    var signature = userMessageSignature();
    var sending = !!(window.__lxState && window.__lxState.sending);
    if ((sending && !wasSending) || (lastUserMessageSignature && signature !== lastUserMessageSignature)) collapseCurrent();
    wasSending = sending;
    if (currentScene) lastUserMessageSignature = signature;
  }
  var baselineRecommendationSignature = "";
  var readyCandidateSignature = "";
  var readyCandidateSince = 0;
  var lastComposerValue = "";
  var observedRecommendationSignature = "";
  var recommendationSettleTimer = 0;
  var lastArmTime = 0;
  var recommendationWatchToken = 0;
  var suppressRevealUntil = 0;
  var lastUserMessageSignature = "";
  var lastRecommendationTabActive = null;
  var actions = [
    "推荐购买第2款商品",
    "我要对比1、3、4"
  ];


  // 乐享输入框按钮展示全套：scene registration only; one DOM/CSS/motion engine.
  var pageScenes = Object.create(null);
  var currentScene = null;
  var sceneCandidate = '';
  var sceneSince = 0;
  var shownScenes = new Set();
  window.__lxComposerButtonSuite = {
    name: '乐享输入框按钮展示全套',
    register: function(name, scene) { pageScenes[name] = scene; }
  };
  window.__lxComposerButtonSuite.register('detail', {
    labels: function(content) {
      var enterprise = /^\/(b-chat|biz-chat)(?:\/|$)/.test(location.pathname);
      var primary = content && content.querySelector('.product-detail .detail-actions .detail-primary');
      var labels = enterprise && primary && primary.textContent.trim() === '一键领优惠下单' ? ['咨询客服'] : [];
      var skus = content ? Array.prototype.map.call(content.querySelectorAll('.lx-spu-chip[data-variant-sku]'), function(chip) { return chip.getAttribute('data-variant-sku'); }).filter(Boolean) : [];
      if (new Set(skus).size > 1) labels.push('对比所有系列');
      return labels;
    },
    source: '.product-detail',
    identity: function(content) {
      var product = window.__lxState && window.__lxState.currentProduct;
      var title = content.querySelector('[data-detail-title]');
      // A configuration change is still the same detail scene.
      var variants = Array.prototype.map.call(content.querySelectorAll('.lx-spu-chip[data-variant-sku]'), function(chip) { return chip.getAttribute('data-variant-sku'); }).filter(Boolean).sort();
      if (variants.length) return 'series:' + Array.from(new Set(variants)).join('|');
      return product && (product.spu_id || product.sku || product.id) || title && title.textContent || '';
    },
    ready: function(content) {
      var title = content.querySelector('[data-detail-title]');
      return title && title.textContent.trim() && content.querySelector('.lx-spu-chip');
    },
    invoke: function(content, label) {
      if (label === '咨询客服') {
        if (window.__lxBridge && window.__lxBridge.sendChat) window.__lxBridge.sendChat('咨询客服');
        return;
      }
      var compare = content.querySelector('[data-spu-compare]');
      if (compare) { compare.click(); return; }
      if (window.__lxBridge && window.__lxBridge.sendChat) window.__lxBridge.sendChat('对比当前商品的所有系列配置');
    }
  });
  function syncPageScene() {
    var content = getRightContent();
    var scene = content && pageScenes[content.getAttribute('data-view')];
    if (!scene) {
      if (currentScene) {
        currentScene = null; sceneCandidate = ''; hideCurrent();
        document.querySelectorAll('.lx-smart-actions').forEach(function(panel) { panel.remove(); });
        lastRecommendationTabActive = null;
      }
      return false;
    }
    // Gate both first reveal and restoration of previously shown scenes.
    if ((window.__lxState && window.__lxState.sending) || content.getAttribute('aria-busy') === 'true' || content.classList.contains('is-generating-tab') || content.querySelector('.lx-page-generating') || !scene.ready(content)) {
      sceneCandidate = ''; sceneSince = 0;
      return true;
    }
    var key = content.getAttribute('data-view') + ':' + scene.identity(content);
    if (!currentScene || currentScene.key !== key) {
      hideCurrent();
      document.querySelectorAll('.lx-smart-actions').forEach(function(panel) { panel.remove(); });
      currentScene = { key: key, definition: scene };
      sceneCandidate = ''; sceneSince = 0;
      if (shownScenes.has(key)) showCompactCurrent();
      recommendationFlowArmed = false; recommendationWatchToken += 1;
    }
    var labelKey = JSON.stringify(typeof scene.labels === 'function' ? scene.labels(content) : scene.labels);
    if (currentScene.labelKey !== labelKey) {
      currentScene.labelKey = labelKey;
      document.querySelectorAll('.assistant-panel .assistant-bottom').forEach(function(bottom) {
        var panel = bottom.querySelector('.lx-smart-actions');
        if (panel) { panel.remove(); createActions(bottom); }
      });
    }
    if (labelKey === '[]') {
      document.querySelectorAll('.assistant-panel .assistant-bottom .lx-smart-actions').forEach(function(panel) {
        hideCurrent(); panel.remove();
      });
      return true;
    }
    if (shownScenes.has(key)) return true;
    if ((window.__lxState && window.__lxState.sending) || content.getAttribute('aria-busy') === 'true' || content.classList.contains('is-generating-tab') || !scene.ready(content)) {
      sceneCandidate = ''; return true;
    }
    if (sceneCandidate !== key) { sceneCandidate = key; sceneSince = Date.now(); return true; }
    if (Date.now() - sceneSince < 450 || Date.now() < suppressRevealUntil) return true;
    shownScenes.add(key);
    revealCurrent();
    return true;
  }

  function getRightContent() {
    return document.querySelector("body > .shell > .content, main.shell > .content, .shell > section.content");
  }

  function recommendationTabIsActive() {
    var content = getRightContent();
    if (!content) return false;
    var selectedTab = content.querySelector(
      '.lx-tab[data-shop-tab-id][aria-selected="true"], .lx-tab[data-shop-tab-id].is-active, .lx-tab[data-tab-id][aria-selected="true"], .lx-tab[data-tab-id].is-active'
    );
    if (selectedTab) {
      return /推荐/.test(String(selectedTab.textContent || "").replace(/关闭标签|×/g, ""));
    }
    return /^(reco|recommendation)$/.test(String(content.getAttribute("data-view") || ""));
  }

  function createActions(bottom) {
    if (!bottom || bottom.querySelector(".lx-smart-actions")) return;

    var panel = document.createElement("section");
    panel.className = "lx-smart-actions";
    panel.setAttribute("aria-label", "为你选择");
    panel.innerHTML =
      '<button class="lx-smart-actions-close" type="button" aria-label="关闭为你选择">' +
        '<span aria-hidden="true"></span>' +
      '</button>' +
      '<div class="lx-smart-actions-title">' +
        '<img src="/assets/icons/global-sparkle.svg" alt="" aria-hidden="true">' +
        '<span>为你选择</span>' +
      '</div>' +
      '<div class="lx-smart-actions-list"></div>';

    var list = panel.querySelector(".lx-smart-actions-list");
    (currentScene ? (typeof currentScene.definition.labels === 'function' ? currentScene.definition.labels(getRightContent()) : currentScene.definition.labels) : actions).forEach(function (label) {
      var button = document.createElement("button");
      button.className = "lx-smart-action";
      button.type = "button";
      button.innerHTML =
        '<span></span>' +
        '<img src="/assets/icons/arrow-down.svg" alt="" aria-hidden="true">';
      button.querySelector("span").textContent = label;
      button.addEventListener("click", function () {
        if (window.__lxState && window.__lxState.sending) return;
        collapseCurrent();
        if (currentScene) { currentScene.definition.invoke(getRightContent(), label); return; }
        if (window.__lxBridge && typeof window.__lxBridge.sendChat === "function") {
          window.__lxBridge.sendChat(label);
          return;
        }
        var textarea = bottom.querySelector(".composer textarea");
        if (!textarea) return;
        textarea.value = label;
        textarea.dispatchEvent(new Event("input", { bubbles: true }));
        var sendButton = bottom.querySelector(".send-btn, .lxfd-send, #lxfdSend");
        if (sendButton) sendButton.click();
        else textarea.dispatchEvent(new KeyboardEvent("keydown", {
          key: "Enter",
          code: "Enter",
          bubbles: true,
          cancelable: true
        }));
      });
      list.appendChild(button);
    });

    panel.querySelector(".lx-smart-actions-close").addEventListener("click", function () {
      bottom.classList.remove("lx-smart-actions-active", "lx-smart-actions-arrived", "lx-smart-actions-motion", "lx-smart-actions-compact");
      restoreCurrentShortcuts(bottom, true);
    });

    var composer = bottom.querySelector(".composer");
    bottom.insertBefore(panel, composer || null);

  }

  function runSmartActionsMotion(bottom, panel) {
    if (!panel) {
      bottom.classList.add("lx-smart-actions-arrived");
      return;
    }
    var source = getRightContent();
    var target = panel.querySelector(".lx-smart-actions-list") || panel;
    if (!source || !target || !Element.prototype.animate) {
      bottom.classList.add("lx-smart-actions-arrived");
      return;
    }
    var sourceView = source.querySelector(currentScene ? currentScene.definition.source : ".reco-page, .lx-reco-poc-page") || source;
    var sourceRect = sourceView.getBoundingClientRect();
    var targetRect = target.getBoundingClientRect();
    if (!sourceRect.width || !sourceRect.height || !targetRect.width || !targetRect.height) {
      bottom.classList.add("lx-smart-actions-arrived");
      return;
    }

    bottom.classList.add("lx-smart-actions-motion");
    var guide = document.createElement("div");
    guide.className = "lx-smart-actions-guide lx-smart-actions-snapshot";
    guide.setAttribute("aria-hidden", "true");
    guide.style.left = sourceRect.left + "px";
    guide.style.top = sourceRect.top + "px";
    guide.style.width = sourceRect.width + "px";
    guide.style.height = sourceRect.height + "px";

    var snapshot = sourceView.cloneNode(true);
    snapshot.classList.add("lx-smart-actions-snapshot-content");
    snapshot.querySelectorAll("script, iframe, video, audio").forEach(function (node) {
      node.remove();
    });
    snapshot.querySelectorAll("[id]").forEach(function (node) {
      node.removeAttribute("id");
    });
    snapshot.querySelectorAll("button, input, textarea, select, a").forEach(function (node) {
      node.setAttribute("tabindex", "-1");
    });
    snapshot.style.width = sourceRect.width + "px";
    snapshot.style.height = sourceRect.height + "px";
    guide.appendChild(snapshot);
    document.body.appendChild(guide);

    var endWidth = Math.min(targetRect.width, 270);
    var endHeight = Math.min(targetRect.height, 82);
    var endLeft = targetRect.left;
    var endTop = targetRect.top;
    var deltaX = endLeft - sourceRect.left;
    var deltaY = endTop - sourceRect.top;
    var scaleX = endWidth / sourceRect.width;
    var scaleY = endHeight / sourceRect.height;
    var motionDuration = 3050;
    var controlsRevealLead = 2000;
    var animation = guide.animate([
      {
        transform: "translate3d(0,0,0) scale(.992)",
        borderRadius: "12px",
        opacity: 1,
        offset: 0
      },
      {
        transform: "translate3d(0,0,0) scale(.985)",
        borderRadius: "12px",
        opacity: 1,
        offset: .16
      },
      {
        transform: "translate3d(" + (deltaX * .18) + "px," + (deltaY * .18) + "px,0) scale(.78)",
        borderRadius: "12px",
        opacity: .88,
        offset: .38
      },
      {
        transform: "translate3d(" + (deltaX * .72) + "px," + (deltaY * .72) + "px,0) scale(" + (scaleX * 1.45) + "," + (scaleY * 1.45) + ")",
        borderRadius: "10px",
        opacity: .68,
        offset: .72
      },
      {
        transform: "translate3d(" + deltaX + "px," + deltaY + "px,0) scale(" + scaleX + "," + scaleY + ")",
        borderRadius: "10px",
        opacity: .34,
        offset: .9
      },
      {
        transform: "translate3d(" + deltaX + "px," + deltaY + "px,0) scale(" + scaleX + "," + scaleY + ")",
        borderRadius: "10px",
        opacity: 0,
        offset: 1
      }
    ], {
      duration: motionDuration,
      easing: "cubic-bezier(.22,.78,.22,1)",
      fill: "forwards"
    });

    var controlsRevealTimer = window.setTimeout(function () {
      if (!bottom.classList.contains("lx-smart-actions-collapsing") && !bottom.classList.contains("lx-smart-actions-compact") && bottom.classList.contains("lx-smart-actions-active")) bottom.classList.add("lx-smart-actions-arrived");
    }, motionDuration - controlsRevealLead);

    function finish() {
      window.clearTimeout(controlsRevealTimer);
      guide.remove();
      bottom.classList.remove("lx-smart-actions-motion");
      if (!bottom.classList.contains("lx-smart-actions-collapsing") && !bottom.classList.contains("lx-smart-actions-compact") && bottom.classList.contains("lx-smart-actions-active")) bottom.classList.add("lx-smart-actions-arrived");
    }
    animation.addEventListener("finish", finish, { once: true });
    animation.addEventListener("cancel", finish, { once: true });
  }

  function revealCurrent() {
    if (Date.now() < suppressRevealUntil) return;
    if (!currentScene && !recommendationTabIsActive()) {
      hideCurrent();
      return;
    }
    document.querySelectorAll(".assistant-panel .assistant-bottom").forEach(function (bottom) {
      createActions(bottom);
      if (bottom.classList.contains("lx-smart-actions-active") && !bottom.classList.contains("lx-smart-actions-compact")) return;
      bottom.classList.remove("lx-smart-actions-active", "lx-smart-actions-compact", "lx-smart-actions-collapsing");
      bottom.classList.remove("lx-smart-actions-arrived", "lx-smart-actions-motion");
      bottom.querySelectorAll(".shortcut-row, .lx-personal-quick-actions, [data-lx-personal-quick-count]").forEach(function (currentActions) {
        currentActions.style.setProperty("display", "none", "important");
        currentActions.setAttribute("aria-hidden", "true");
      });
      bottom.classList.add("lx-smart-actions-active");
      runSmartActionsMotion(bottom, bottom.querySelector(".lx-smart-actions"));
    });
  }

  function restoreCurrentShortcuts(bottom, animate) {
    bottom.querySelectorAll(".shortcut-row, .lx-personal-quick-actions, [data-lx-personal-quick-count]").forEach(function (currentActions) {
      currentActions.style.removeProperty("display");
      currentActions.removeAttribute("aria-hidden");
    });
    if (!animate) return;
    bottom.classList.remove("lx-shortcuts-arriving");
    void bottom.offsetWidth;
    bottom.classList.add("lx-shortcuts-arriving");
    window.setTimeout(function () {
      bottom.classList.remove("lx-shortcuts-arriving");
    }, 2750);
  }

  function hideCurrent() {
    document.querySelectorAll(".assistant-panel .assistant-bottom").forEach(function (bottom) {
      var shouldAnimateShortcuts = bottom.classList.contains("lx-smart-actions-active");
      bottom.classList.remove("lx-smart-actions-active", "lx-smart-actions-arrived", "lx-smart-actions-motion", "lx-smart-actions-compact", "lx-smart-actions-collapsing");
      restoreCurrentShortcuts(bottom, shouldAnimateShortcuts);
    });
  }

  function showCompactCurrent() {
    document.querySelectorAll(".assistant-panel .assistant-bottom").forEach(function (bottom) {
      createActions(bottom);
      bottom.querySelectorAll(".shortcut-row, .lx-personal-quick-actions, [data-lx-personal-quick-count]").forEach(function (currentActions) {
        currentActions.style.setProperty("display", "none", "important");
        currentActions.setAttribute("aria-hidden", "true");
      });
      bottom.classList.remove("lx-smart-actions-motion", "lx-smart-actions-collapsing");
      bottom.classList.add("lx-smart-actions-active", "lx-smart-actions-arrived", "lx-smart-actions-compact");
    });
  }

  function syncActionsToActiveTab() {
    syncSendCollapse();
    if (syncPageScene()) return false;
    var active = recommendationTabIsActive();
    if (active === lastRecommendationTabActive) return active;
    var wasActive = lastRecommendationTabActive;
    lastRecommendationTabActive = active;
    if (!active) {
      recommendationFlowArmed = false;
      recommendationWatchToken += 1;
      observedRecommendationSignature = recommendationSignature(getRightContent());
      hideCurrent();
    } else if (wasActive === false && recommendationSignature(getRightContent())) {
      showCompactCurrent();
    }
    return active;
  }

  function collapseCurrent() {
    suppressRevealUntil = Date.now() + 1600;
    document.querySelectorAll(".assistant-panel .assistant-bottom").forEach(function (bottom) {
      if (!bottom.classList.contains("lx-smart-actions-active")) {
        restoreCurrentShortcuts(bottom);
        return;
      }
      if (bottom.classList.contains("lx-smart-actions-collapsing") || bottom.classList.contains("lx-smart-actions-compact")) return;
      bottom.classList.remove("lx-smart-actions-motion");
      bottom.classList.add("lx-smart-actions-collapsing");
      window.setTimeout(function () {
        bottom.classList.remove(
          "lx-smart-actions-arrived",
          "lx-smart-actions-collapsing"
        );
        bottom.classList.add("lx-smart-actions-compact");
      }, 720);
    });
  }

  function armRecommendationFlow(textarea) {
    var query = String(textarea && textarea.value || lastComposerValue || "").trim();
    if (!query) return;
    var now = Date.now();
    if (now - lastArmTime < 120) return;
    lastArmTime = now;
    recommendationFlowArmed = true;
    var rightContent = getRightContent();
    baselineRecommendationSignature = recommendationSignature(rightContent);
    observedRecommendationSignature = baselineRecommendationSignature;
    readyCandidateSignature = "";
    readyCandidateSince = 0;
    collapseCurrent();
    watchRecommendationCompletion(++recommendationWatchToken);
  }

  function userMessageSignature() {
    var messages = document.querySelectorAll(
      ".lx-p0-message.user, .msg.user, .message.user, .lxfd-msg-user, .lxfd-msg.user, [data-role=\"user\"]"
    );
    if (!messages.length) return "0";
    var last = messages[messages.length - 1];
    return messages.length + ":" + String(last.textContent || "").trim();
  }

  function armFromRenderedUserMessage() {
    recommendationFlowArmed = true;
    var rightContent = getRightContent();
    baselineRecommendationSignature = recommendationSignature(rightContent);
    observedRecommendationSignature = baselineRecommendationSignature;
    readyCandidateSignature = "";
    readyCandidateSince = 0;
    collapseCurrent();
    watchRecommendationCompletion(++recommendationWatchToken);
  }

  function watchRecommendationCompletion(token) {
    if (token !== recommendationWatchToken || !recommendationFlowArmed) return;
    if (recommendationListReady()) {
      revealAfterRecommendationList();
      return;
    }
    window.requestAnimationFrame(function () {
      watchRecommendationCompletion(token);
    });
  }

  function recommendationRows(content) {
    if (!content) return [];
    return Array.prototype.filter.call(content.querySelectorAll("button"), function (button) {
      return button.hasAttribute("data-reco-buy") ||
        button.classList.contains("lx-reco-poc-buy") ||
        (button.textContent || "").trim() === "立即购买";
    });
  }

  function recommendationSignature(content) {
    return recommendationRows(content).map(function (row) {
      return [
        row.getAttribute("data-reco-buy") || "",
        row.textContent.trim()
      ].join(":");
    }).join("|");
  }

  function hasRecommendationHeading(content) {
    return Array.prototype.some.call(content.querySelectorAll("h1, h2, h3, [class*=title]"), function (node) {
      return /为你推荐|推荐商品|AI推荐/.test(node.textContent || "");
    });
  }

  function recommendationListReady() {
    if (!recommendationFlowArmed) return false;
    var content = getRightContent();
    if (!content) return false;
    var signature = recommendationSignature(content);
    if (!signature || signature === baselineRecommendationSignature || !hasRecommendationHeading(content)) {
      readyCandidateSignature = "";
      readyCandidateSince = 0;
      return false;
    }
    if (signature !== readyCandidateSignature) {
      readyCandidateSignature = signature;
      readyCandidateSince = Date.now();
      return false;
    }
    return Date.now() - readyCandidateSince >= 450;
  }

  function revealAfterRecommendationList() {
    if (!recommendationListReady()) return;
    recommendationFlowArmed = false;
    recommendationWatchToken += 1;
    baselineRecommendationSignature = "";
    readyCandidateSignature = "";
    readyCandidateSince = 0;
    revealCurrent();
  }

  function bindRecommendationCompletion() {
    window.addEventListener('click', function(event) {
      if (event.target.closest && event.target.closest('.send-btn, .lxfd-send, #lxfdSend')) collapseCurrent();
    }, true);
    window.addEventListener('keydown', function(event) {
      if (event.key === 'Enter' && !event.shiftKey && !event.isComposing && event.target.matches && event.target.matches('.composer textarea, .lxfd-composer textarea')) collapseCurrent();
    }, true);
    window.addEventListener('submit', function(event) {
      if (event.target.matches && event.target.matches('.composer, .lxfd-composer')) collapseCurrent();
    }, true);
    document.addEventListener("input", function (event) {
      if (!event.target.matches(".composer textarea, .lxfd-composer textarea")) return;
      var value = String(event.target.value || "").trim();
      if (value) lastComposerValue = value;
    }, true);

    document.addEventListener("click", function (event) {
      if (event.target.closest("[data-shop-tab-id], [data-shop-tab-close], [data-tab-id], [data-tab-close], .lx-tab-close")) {
        window.setTimeout(syncActionsToActiveTab, 0);
        window.setTimeout(syncActionsToActiveTab, 120);
      }
      var resultCard = event.target.closest(".answer-cta.lx-answer-reco, .answer-cta, [data-open-recommendation], [data-open-reco]");
      if (resultCard && /查看推荐商品/.test(resultCard.textContent || "")) {
        observedRecommendationSignature = "";
        recommendationFlowArmed = true;
        baselineRecommendationSignature = "";
        readyCandidateSignature = "";
        readyCandidateSince = 0;
        hideCurrent();
        var openedCardToken = ++recommendationWatchToken;
        window.setTimeout(function () {
          if (openedCardToken !== recommendationWatchToken) return;
          recommendationFlowArmed = false;
          observedRecommendationSignature = recommendationSignature(getRightContent());
          revealCurrent();
        }, 900);
      }

      if (!event.target.closest(".send-btn, .lxfd-send, #lxfdSend")) return;
      collapseCurrent();
      var scope = event.target.closest("form, .assistant-bottom") || document;
      armRecommendationFlow(scope.querySelector("textarea"));
    }, true);

    document.addEventListener("submit", function (event) {
      collapseCurrent();
      armRecommendationFlow(event.target.querySelector("textarea"));
    }, true);

    document.addEventListener("keydown", function (event) {
      if (event.key !== "Enter" || event.shiftKey || event.isComposing) return;
      if (!event.target.matches(".composer textarea, .lxfd-composer textarea")) return;
      collapseCurrent();
      armRecommendationFlow(event.target);
    }, true);

    document.addEventListener("load", function (event) {
      if (event.target.matches && event.target.matches(".content[data-view=\"reco\"] :is(.reco-row, .lx-reco-poc-row) img")) {
        revealAfterRecommendationList();
      }
    }, true);

    new MutationObserver(function (mutations) {
      if (!syncActionsToActiveTab()) return;
      var nextUserMessageSignature = userMessageSignature();
      if (nextUserMessageSignature !== lastUserMessageSignature) {
        lastUserMessageSignature = nextUserMessageSignature;
        armFromRenderedUserMessage();
      }

      window.clearTimeout(recommendationSettleTimer);
      recommendationSettleTimer = window.setTimeout(function () {
        var content = getRightContent();
        var signature = recommendationSignature(content);
        if (!signature || !hasRecommendationHeading(content)) return;
        if (recommendationFlowArmed) {
          revealAfterRecommendationList();
          return;
        }
        if (signature === observedRecommendationSignature) return;
        observedRecommendationSignature = signature;
        recommendationWatchToken += 1;
        revealCurrent();
      }, 600);

      if (!recommendationFlowArmed) return;
      var rightContentChanged = mutations.some(function (mutation) {
        var target = mutation.target.nodeType === 1 ? mutation.target : mutation.target.parentElement;
        var content = target && target.closest ? target.closest(".content") : null;
        if (!content || content !== getRightContent()) return false;
        if (mutation.type === "childList") return true;
        return mutation.type === "attributes" && (
          target === content ||
          mutation.attributeName === "aria-busy" ||
          target.classList.contains("lx-page-generating")
        );
      });
      if (!rightContentChanged) return;
      window.requestAnimationFrame(function () {
        window.requestAnimationFrame(revealAfterRecommendationList);
      });
    }).observe(document.documentElement, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ["class", "data-view", "aria-busy"]
    });

    window.setInterval(function () {
      if (!syncActionsToActiveTab()) return;
      var content = getRightContent();
      var signature = recommendationSignature(content);
      if (!signature || !hasRecommendationHeading(content)) return;
      if (recommendationFlowArmed) {
        revealAfterRecommendationList();
        return;
      }
      if (signature === observedRecommendationSignature) return;
      observedRecommendationSignature = signature;
      recommendationWatchToken += 1;
      revealCurrent();
    }, 400);
  }

  function init() {
    document.querySelectorAll(".assistant-panel .assistant-bottom").forEach(createActions);
    observedRecommendationSignature = "";
    lastUserMessageSignature = userMessageSignature();
    lastRecommendationTabActive = recommendationTabIsActive();
    bindRecommendationCompletion();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init, { once: true });
  } else {
    init();
  }
})();

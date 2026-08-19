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

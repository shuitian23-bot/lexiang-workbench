/* 商品卡智能光标独立兜底：不依赖商城主运行时的初始化结果。 */
      (function () {
        "use strict";
        /* The product dwell assistant is disabled site-wide. Keep the real
           assistant content intact and remove any state left by an old cache. */
        document.querySelectorAll(".ai-arrow,.lx-template-smart-cursor").forEach(function (node) { node.remove(); });
        document.querySelector(".assistant-bottom")?.classList.remove("has-hover-prompts");
        document.querySelector(".assistant-panel")?.classList.remove("assistant-hover-active", "assistant-glass-active");
        var stalePromptList = document.querySelector("[data-hover-prompt-list]");
        if (stalePromptList) stalePromptList.innerHTML = "";
        document.body.classList.remove("cursor-awake");
        return;
        var selector = ".content .product-card,.content .lx-floor-product-card,.content [data-floor-product],.content .lx-floor-product,.content .lx-sim-card,.content .lx-p0-product-mini,.content .reco-row,.content .lx-edu-card";
        var cursor = document.createElement("div");
        cursor.className = "lx-template-smart-cursor";
        cursor.setAttribute("aria-hidden", "true");
        cursor.innerHTML = '<img src="../icons/smart-cursor.svg" alt=""><span class="lx-template-smart-cursor-label"><img src="../img/lx-icon-0016.png" alt="">乐享正在帮你</span>';
        document.body.appendChild(cursor);

        var activeCard = null;
        var dwellTimer = 0;
        var closeTimer = 0;

        function escapeHtml(value) {
          return String(value || "").replace(/[&<>\"']/g, function (char) {
            return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '\"': "&quot;", "'": "&#39;" }[char];
          });
        }

        function cardData(card) {
          return {
            name: card.dataset.detailTitle || card.dataset.floorProduct || card.querySelector(".product-title")?.textContent?.trim() || "这款联想商品",
            brand: card.dataset.detailBrand || card.querySelector(".brand-mini")?.textContent?.trim() || "联想",
            summary: card.dataset.detailSummary || card.querySelector(".spec")?.textContent?.trim() || "联想官方商品",
            price: card.dataset.detailPrice || card.querySelector(".price")?.textContent?.replace(/起\s*$/, "").trim() || "价格以页面为准",
            image: card.dataset.detailImage || card.querySelector(".product-visual img")?.getAttribute("src") || ""
          };
        }

        function questions(product) {
          var series = /拯救者/i.test(product.name) ? "拯救者" : /ThinkPad/i.test(product.name) ? "ThinkPad" : product.brand;
          var shortName = product.name.replace(/^联想\s*/i, "").slice(0, 12);
          return [series + "该如何选择？", shortName + "值得买吗？", shortName + "详细解读"];
        }

        function showAssistantPrompt(card) {
          if (card !== activeCard) return;
          var bottom = document.querySelector(".assistant-bottom");
          var panel = document.querySelector(".assistant-panel");
          var list = document.querySelector("[data-hover-prompt-list]");
          if (!bottom || !panel || !list) return;
          var product = cardData(card);
          var asks = questions(product);
          var thumb = product.image ? '<img src="' + escapeHtml(product.image) + '" alt="' + escapeHtml(product.name) + '">' : "<i></i>";
          list.innerHTML = '<div class="pop"><div class="box">' +
        '<button class="pop-close hover-prompt-close" type="button" aria-label="关闭商品推荐问题">×</button>' +
            '<div class="ctx"><div class="thumb">' + thumb + '</div><div class="ci"><div class="nm">' + escapeHtml(product.name) + '</div><div class="pr">' + escapeHtml(product.price) + '</div></div><span class="badge"><img src="../icons/global-sparkle.svg" alt="">你在看</span></div>' +
            '<div class="body"><div class="sum">' + escapeHtml(product.summary) + '，乐享可以继续帮你分析配置、价格和适用场景。</div><div class="divider"><span>乐享建议你问问</span></div><div class="acts">' +
            asks.map(function (text) { return '<button class="act" type="button" data-hover-prompt="' + escapeHtml(text) + '"><span class="ic"><img src="../icons/global-sparkle.svg" alt=""></span><span>' + escapeHtml(text) + '</span><span class="ar">›</span></button>'; }).join("") +
            '</div></div></div></div>';
          bottom.classList.add("has-hover-prompts");
          panel.classList.add("assistant-hover-active");
        }

        function hideAssistantPrompt() {
          document.querySelector(".assistant-bottom")?.classList.remove("has-hover-prompts");
          document.querySelector(".assistant-panel")?.classList.remove("assistant-hover-active");
          var list = document.querySelector("[data-hover-prompt-list]");
          if (list) list.innerHTML = "";
        }

        function arm(card) {
          window.clearTimeout(dwellTimer);
          activeCard = card;
          cursor.classList.remove("is-helping");
          dwellTimer = window.setTimeout(function () {
            if (activeCard !== card) return;
            cursor.classList.add("is-helping");
            showAssistantPrompt(card);
          }, 3000);
        }

        document.addEventListener("pointermove", function (event) {
          if (event.pointerType && event.pointerType !== "mouse" && event.pointerType !== "pen") return;
          var card = event.target.closest?.(selector);
          cursor.style.transform = "translate3d(" + (event.clientX + 2) + "px," + (event.clientY + 2) + "px,0)";
          if (!card) {
            cursor.classList.remove("is-visible", "is-helping");
            window.clearTimeout(dwellTimer);
            if (activeCard) {
              activeCard = null;
              window.clearTimeout(closeTimer);
              closeTimer = window.setTimeout(hideAssistantPrompt, 4000);
            }
            return;
          }
          window.clearTimeout(closeTimer);
          cursor.classList.add("is-visible");
          if (card !== activeCard) arm(card);
        }, true);

        document.addEventListener("pointerleave", function () {
          cursor.classList.remove("is-visible", "is-helping");
          window.clearTimeout(dwellTimer);
          activeCard = null;
        });

        document.addEventListener("click", function (event) {
          if (event.target.closest?.(".hover-prompt-close")) hideAssistantPrompt();
        }, true);
      })();

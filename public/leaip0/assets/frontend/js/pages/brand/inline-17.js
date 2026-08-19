/*
       * 商城对话标题的最终同步层。
       * 内联在页面末尾，避免 file:// 预览时外部运行时缓存导致标题逻辑未更新。
       */
      (function () {
        var nav = document.querySelector(".main-nav");
        if (!nav) return;

        function compactConversationTitle(query) {
          var text = String(query || "")
            .replace(/\s+/g, "")
            .replace(/[，。！？、,.!?;；:："'“”‘’（）()[]【】<>《》]/g, "");
          if (!text) return "新对话";
          var rules = [
            [/笔记本|电脑|轻薄本|游戏本|工作站|YOGA|ThinkPad|拯救者|小新/i, "笔记本电脑推荐"],
            [/教育|学生|教师|认证/, "教育认证优惠"],
            [/国补|国家补贴|补贴/, "国家补贴商品"],
            [/以旧换新|旧机|回收|估算/, "旧机换新服务"],
            [/门店|附近|到店/, "附近门店查询"],
            [/客服|售后|维修|保修/, "售后维修服务"],
            [/订单|物流|发货/, "订单物流查询"],
            [/对比|比较/, "商品对比分析"]
          ];
          for (var i = 0; i < rules.length; i += 1) {
            if (rules[i][0].test(text)) return Array.from(rules[i][1]).slice(0, 7).join("");
          }
          return Array.from(text).slice(0, 7).join("");
        }

        function applyQueryTitle(query) {
          var title = compactConversationTitle(query);
          var label = "品牌：" + title;
          nav.setAttribute("data-current-label", label);
          nav.setAttribute("data-shop-current-label", label);
          nav.style.setProperty("--lx-personal-nav-label-half", Math.ceil(Array.from(label).length * 7.5 + 14) + "px");
        }

        var runtimeSetQuery = window.__lxSetConversationQuery;
        window.__lxSetConversationQuery = function (query) {
          if (typeof runtimeSetQuery === "function") runtimeSetQuery(query);
          applyQueryTitle(query);
        };

        function syncFromRenderedConversation() {
          var firstBubble = document.querySelector(
            ".lx-p0-messages .lx-p0-message.user .user-bubble, " +
            ".lx-p0-messages .msg.user .user-bubble"
          );
          if (firstBubble && firstBubble.textContent.trim()) applyQueryTitle(firstBubble.textContent);
        }

        var assistant = document.querySelector(".assistant-panel");
        if (assistant && window.MutationObserver) {
          new MutationObserver(syncFromRenderedConversation).observe(assistant, {
            childList: true,
            subtree: true,
            characterData: true
          });
        }
        syncFromRenderedConversation();
      })();

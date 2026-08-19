/*
         * 必须早于运行时脚本注册：优先隔离顶栏购物车/订单点击，避免旧的通用
         * 新会话或商品推荐委托先处理同一次点击。
         */
        document.addEventListener("click", function (event) {
          var trigger = event.target.closest && event.target.closest("[data-commerce-entry]");
          if (!trigger || typeof window.lxOpenCommerceEntry !== "function") return;
          event.preventDefault();
          event.stopPropagation();
          event.stopImmediatePropagation();
          Promise.resolve(window.lxOpenCommerceEntry(trigger.getAttribute("data-commerce-entry"), { sendQuery: true }))
            .catch(function (error) { console.error("[commerce-entry] failed", error); });
        }, true);

/* 品牌频道暂未开放：保留左右框架，仅清空右侧业务内容。 */
      (function () {
        var content = document.querySelector(".shell > .content");
        if (!content) return;
        content.classList.add("lx-brand-coming-soon");
        var placeholder = document.createElement("p");
        placeholder.className = "lx-brand-channel-placeholder";
        placeholder.textContent = "品牌频道正在制作中...";
        content.prepend(placeholder);

        function syncBrandHomeState() {
          var view = content.getAttribute("data-view") || "list";
          content.classList.toggle("lx-brand-home-empty", view === "list");
        }

        /* 公共运行时仍以 personal 站点初始化首页标签；品牌模板仅替换其展示文案。 */
        function syncBrandHomeTabLabel() {
          content.querySelectorAll('.lx-tab[data-tab-id="site:brand"] .lx-tab-label, .lx-tab[data-shop-tab-id="site:brand"] .lx-tab-label').forEach(function (label) {
            if (label.textContent.trim() !== "品牌") label.textContent = "品牌";
          });
        }

        if (window.MutationObserver) {
          new MutationObserver(syncBrandHomeState).observe(content, {
            attributes: true,
            attributeFilter: ["data-view"]
          });
          new MutationObserver(syncBrandHomeTabLabel).observe(content, {
            childList: true,
            subtree: true
          });
        }
        syncBrandHomeState();
        syncBrandHomeTabLabel();
      })();

/* 公共运行时以 personal 内部站点标识创建首页标签，中小企业模板统一其展示文案。 */
      (function () {
        var content = document.querySelector(".shell > .content");
        if (!content) return;

        function syncSmbHomeTabLabel() {
          content.querySelectorAll('.lx-tab[data-tab-id="site:business"] .lx-tab-label, .lx-tab[data-shop-tab-id="site:business"] .lx-tab-label').forEach(function (label) {
            if (label.textContent.trim() !== "中小企业") label.textContent = "中小企业";
          });
        }

        if (window.MutationObserver) {
          new MutationObserver(syncSmbHomeTabLabel).observe(content, {
            childList: true,
            subtree: true
          });
        }
        syncSmbHomeTabLabel();
      })();

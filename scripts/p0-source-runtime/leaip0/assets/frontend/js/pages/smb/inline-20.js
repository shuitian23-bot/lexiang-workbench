/* 占位推荐项与待定制快捷入口保留 hover 反馈，但不触发既有点击逻辑。 */
      (function () {
        function isNonInteractivePlaceholder(event) {
          return event.target.closest?.("[data-quick-placeholder], .shortcut-row [data-waiting-feature]");
        }

        document.addEventListener("click", function (event) {
          if (!isNonInteractivePlaceholder(event)) return;
          event.preventDefault();
          event.stopImmediatePropagation();
        }, true);

        document.addEventListener("keydown", function (event) {
          if ((event.key !== "Enter" && event.key !== " ") || !isNonInteractivePlaceholder(event)) return;
          event.preventDefault();
          event.stopImmediatePropagation();
        }, true);
      })();

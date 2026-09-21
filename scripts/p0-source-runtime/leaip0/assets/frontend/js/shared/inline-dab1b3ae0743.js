// 顶部频道导航仅保留 hover 预览，不响应鼠标、触控或键盘点击。
      (function () {
        function blockTopNavActivation(event) {
          if (!event.isTrusted || !event.target.closest) return;
          var item = event.target.closest(
            ".main-nav > button[data-page], .lxfd-nav-sheet > a[data-page]"
          );
          if (!item) return;
          event.preventDefault();
          event.stopImmediatePropagation();
        }
        document.addEventListener("click", blockTopNavActivation, true);
        document.addEventListener("auxclick", blockTopNavActivation, true);
      })();

/* SMB 快捷入口仅展示 hover；在业务运行时注册事件前阻止点击和键盘执行。 */
    (function () {
      function getDisabledSmbShortcut(event) {
        return event.target.closest?.(
          ".shortcut-row > .shortcut, " +
          ".shortcut-row > .more-wrap > .more-menu .menu-row"
        );
      }

      document.addEventListener("click", function (event) {
        if (!getDisabledSmbShortcut(event)) return;
        event.preventDefault();
        event.stopImmediatePropagation();
      }, true);

      document.addEventListener("keydown", function (event) {
        if ((event.key !== "Enter" && event.key !== " ") || !getDisabledSmbShortcut(event)) return;
        event.preventDefault();
        event.stopImmediatePropagation();
      }, true);
    })();

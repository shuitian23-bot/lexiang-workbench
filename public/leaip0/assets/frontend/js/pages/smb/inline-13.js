/* SMB 待开放快捷入口仅展示 hover；职场认证已开放并交由主业务运行时发送。 */
    (function () {
      function getSmbShortcut(event) {
        return event.target.closest?.(
          ".shortcut-row > .shortcut, " +
          ".shortcut-row > .more-wrap > .more-menu .menu-row"
        );
      }

      function getDisabledSmbShortcut(event) {
        var shortcut = getSmbShortcut(event);
        if (!shortcut) return null;

        /* “职场认证”必须继续冒泡到 app.js，由统一 sendChat 流程发送 query。 */
        if ((shortcut.textContent || "").trim() === "职场认证") return null;
        return shortcut;
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

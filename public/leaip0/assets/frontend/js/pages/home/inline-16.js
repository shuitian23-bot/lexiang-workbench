/* 2026-08-05：首页灵动岛首次打开时展开 2 秒，随后自动收起 */
      (function () {
        var navCluster = document.getElementById("lxfdNavCluster");
        var convoPill = document.getElementById("lxfdConvoPill");
        if (!navCluster || !convoPill) return;

        // 仅在首页非聊天态时默认展开
        var isChatting = document.body.classList.contains("lxfd-chatting");
        if (isChatting) return;

        // 默认展开导航，让用户先看到完整的业务入口。
        navCluster.classList.add("open");
        convoPill.setAttribute("aria-expanded", "true");

        // 展示 2 秒后恢复为紧凑态；后续仍可通过点击、悬停或键盘焦点展开。
        window.setTimeout(function () {
          navCluster.classList.remove("open");
          convoPill.setAttribute("aria-expanded", "false");
          if (document.activeElement === convoPill) convoPill.blur();
        }, 2000);
      })();

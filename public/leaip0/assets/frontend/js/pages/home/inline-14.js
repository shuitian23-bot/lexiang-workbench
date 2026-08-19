/* 2026-08-05 修复：本地文件打开时，灵动岛标题同步逻辑
         同时支持全屏灵动岛（.lxfd-nav-cluster）和分屏顶部导航（.main-nav）
         与 localhost:3002 效果保持 1:1 一致 */
      (function () {
        if (location.protocol !== "file:") return;
        document.body.classList.add("lx-template-file");
        var cluster = document.getElementById("lxfdNavCluster");
        var pill = document.getElementById("lxfdConvoPill");
        var name = document.getElementById("lxfdConvoName");
        var thread = document.getElementById("lxfdThread");
        var mainNav = document.querySelector(".main-nav");
        var lastQuery = "";

        function shortTitle(text) {
          var clean = String(text || "").replace(/\s+/g, "").replace(/[，。！？、,.!?;；:：]/g, "");
          if (!clean) return "新对话";
          if (Array.from(clean).length <= 6) return clean;
          var rules = [
            [/文档|文件|资料|PDF|白皮书|手册|文章|解读|摘要|提炼/i, "文档核心解读"],
            [/教育|学生|教师|认证/, "教育认证优惠"],
            [/国补|国家补贴|补贴/, "国家补贴商品"],
            [/以旧换新|旧机|回收|估算/, "旧机换新服务"],
            [/门店|附近|到店/, "附近门店查询"],
            [/客服|售后|维修|保修/, "售后维修服务"],
            [/订单|物流|发货/, "订单物流查询"],
            [/会员|积分|权益/, "会员积分权益"],
            [/对比|比较/, "商品对比分析"],
            [/笔记本|电脑|轻薄本|游戏本|工作站|YOGA|ThinkPad|拯救者|小新/i, "电脑选购推荐"]
          ];
          for (var i = 0; i < rules.length; i += 1) {
            if (rules[i][0].test(clean)) return rules[i][1];
          }
          return "问题内容咨询";
        }

        function syncSplitNavLabel(label) {
          if (!mainNav || !label) return;
          mainNav.setAttribute("data-current-label", label);
          mainNav.style.setProperty("--lx-personal-nav-label-half", Math.ceil(label.length * 7.5 + 14) + "px");

          var topicChip = mainNav.querySelector(".lx-current-topic-chip");
          if (!topicChip) {
            topicChip = document.createElement("span");
            topicChip.className = "lx-current-topic-chip";
            topicChip.setAttribute("aria-hidden", "true");
            mainNav.insertBefore(topicChip, mainNav.firstElementChild || null);
          }
          topicChip.textContent = label;
        }

        function syncCompactTitle() {
          var firstUser = thread && thread.querySelector(".lxfd-msg-user");
          var query = firstUser ? firstUser.textContent : lastQuery;
          if (query && name) {
            var label = "首页：" + shortTitle(query);
            // 同步全屏灵动岛
            name.textContent = label;
            name.title = label;
            cluster && cluster.style.setProperty("--lxfd-nav-label-half", Math.ceil(label.length * 7.5 + 14) + "px");
            // 同步分屏顶部导航（main-nav）
            syncSplitNavLabel(label);
          }
          // 全屏灵动岛：收起状态
          cluster && cluster.classList.remove("open");
          pill && pill.setAttribute("aria-expanded", "false");
          if (pill && document.activeElement === pill) pill.blur();
        }

        document.addEventListener("submit", function (event) {
          if (!event.target || event.target.id !== "lxfdComposer") return;
          var input = document.getElementById("lxfdTa");
          lastQuery = input ? input.value.trim() : "";
          window.setTimeout(syncCompactTitle, 0);
          window.setTimeout(syncCompactTitle, 80);
        }, true);

        if (thread && window.MutationObserver) {
          new MutationObserver(function () {
            if (thread.querySelector(".lxfd-msg-user")) syncCompactTitle();
          }).observe(thread, { childList: true, subtree: true });
        }

        if (window.MutationObserver) {
          new MutationObserver(function () {
            if (!document.body.classList.contains("lx-home-split")) return;
            var label = mainNav && mainNav.getAttribute("data-current-label");
            if (label) syncSplitNavLabel(label);
          }).observe(document.body, { attributes: true, attributeFilter: ["class"] });
        }
      })();

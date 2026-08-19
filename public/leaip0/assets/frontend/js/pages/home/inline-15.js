(function(){
        try {
          if (!window.__LXFD_FORCE && !new URLSearchParams(location.search).has("lxfd")) return;
          var force = function(){
            if (!window.__LXFD_FORCE && !new URLSearchParams(location.search).has("lxfd")) return;
            // 分屏已成形/正在退全屏过渡时不得强制回全屏：资源慢时本脚本执行晚，
            // 四连定时器会落在用户已进分屏之后，把两种布局叠成花屏
            if (document.body.classList.contains("lx-home-split") || document.body.classList.contains("lxfd-exiting") || document.body.classList.contains("lxfd-split-returning")) return;
            document.body.classList.add("assistant-fullscreen", "lx-auto-fs");
            document.body.dataset.state = "chat";
            var stage = document.getElementById("lxfdStage");
            var rail = document.getElementById("lxfdRail");
            var wide = window.innerWidth >= 1280;
            if (stage) stage.classList.toggle("shift", wide);
            if (rail) rail.classList.toggle("open", wide);
          };
          force();
          [50, 300, 1000, 2000].forEach(function(delay){ window.setTimeout(force, delay); });
        } catch (err) {}
      })();

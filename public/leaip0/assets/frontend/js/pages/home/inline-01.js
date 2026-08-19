window.__LX_TEMPLATE_PATH="/";
      window.__LX_TEMPLATE_PAGE="home";
      // POC 一次性历史清理：仅清空当前会话快照、共享历史列表与来源标记。
      // 用独立迁移标记保证只执行一次，清理后新产生的历史仍可正常保存。
      (function(){
        var cleanupKey = "lexiang.history.cleanup.20260819.v1";
        try {
          if (localStorage.getItem(cleanupKey)) return;
          [
            "lexiang.conversation.v1",
            "lexiang.lxfd.convs.v1",
            "lexiang.conversation.sourcePage.v1"
          ].forEach(function(key){ localStorage.removeItem(key); });
          localStorage.setItem(cleanupKey, "1");
        } catch (_) {}
      })();
      // P0 多频道共享同一份会话，不在页面切换或刷新时清空持久化内容。
      (function(){
        var productionOrigin = new URL(document.baseURI).origin;
        if (location.protocol !== "file:" && location.origin === productionOrigin) return;
        ["pushState","replaceState"].forEach(function(method){
          var nativeMethod = history[method];
          history[method] = function(state,title,url){
            if (location.protocol === "file:" && url) return;
            if (url) {
              try {
                if (new URL(url,document.baseURI).origin !== location.origin) {
                  return nativeMethod.call(history,state,title);
                }
              } catch (_) {}
            }
            return nativeMethod.apply(history,arguments);
          };
        });
      })();

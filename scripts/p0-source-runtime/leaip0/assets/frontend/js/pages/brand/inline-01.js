window.__LX_TEMPLATE_PATH="/brand/";
      window.__LX_TEMPLATE_PAGE="brand";
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

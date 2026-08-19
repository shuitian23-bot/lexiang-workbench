window.__LX_TEMPLATE_PATH="/shop-chat/";
      window.__LX_TEMPLATE_PAGE="personal";
      // 组件库 iframe 预览必须在路由运行时启动前锁定模式。线上路由会执行
      // history.replaceState('/shop-chat/')，若只依赖 hash，预览标记会被清空。
      (function(){
        var params = new URLSearchParams(location.search);
        var queryMode = params.get("componentPreview");
        var hashMode = location.hash === "#component-assistant-conversation"
          ? "conversation"
          : (location.hash === "#component-assistant-default" ? "default" : "");
        var previewMode = queryMode === "conversation" || queryMode === "default"
          ? queryMode
          : hashMode;
        if (!previewMode) return;
        window.__LX_COMPONENT_ASSISTANT_PREVIEW = previewMode;
        document.documentElement.classList.add("component-assistant-preview-prepaint");
        document.documentElement.dataset.componentAssistantPreview = previewMode;
      })();
      // P0 多频道共享同一份会话，不在页面切换或刷新时清空持久化内容。
      (function(){
        var productionOrigin = new URL(document.baseURI).origin;
        if (location.protocol !== "file:" && location.origin === productionOrigin) return;
        ["pushState","replaceState"].forEach(function(method){
          var nativeMethod = history[method];
          history[method] = function(state,title,url){
            if (location.protocol === "file:" && url) return;
            if (window.__LX_COMPONENT_ASSISTANT_PREVIEW) {
              return nativeMethod.call(history,state,title);
            }
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

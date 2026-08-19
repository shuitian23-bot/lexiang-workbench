(function(){
        var rawPath = String(window.__LX_TEMPLATE_PATH || location.pathname || "/");
        var path = rawPath === "/" ? "/" : rawPath.replace(/\/+$/, "");
        if (path === "/") document.documentElement.classList.add("lx-root-lxfd-prepaint");
        if (["/shop-chat", "/b-chat", "/biz-chat", "/brand"].indexOf(path) >= 0) {
          document.documentElement.classList.add("lx-route-prepaint", "lx-shop-tabs-prepaint");
        }
      })();

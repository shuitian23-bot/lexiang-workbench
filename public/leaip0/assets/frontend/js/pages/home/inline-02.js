(function(){
        var path = (window.__LX_TEMPLATE_PATH || location.pathname).replace(/\/+$|^$/, "/");
        if (path === "/") document.documentElement.classList.add("lx-root-lxfd-prepaint");
        if (["/shop-chat/", "/b-chat/", "/biz-chat/", "/brand/"].indexOf(path) >= 0) {
          document.documentElement.classList.add("lx-route-prepaint");
        }
      })();

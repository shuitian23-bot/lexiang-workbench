window.__LXFD_FORCE = new URLSearchParams(location.search).has("lxfd") ||
        location.pathname.replace(/\/+$|^$/, "/") === "/" ||
        /home-fullscreen-dialog-template\.html$/.test(location.pathname);
      window.__LX_TEMPLATE_RUNTIME = Object.freeze({
        origin: location.protocol === "file:" ? "skill://local-knowledge" : location.origin,
        streamEndpoint: "/api/leai/stream",
        intentEndpoint: "/api/leai/intent",
        fallbackEndpoint: "/api/chat/stream",
        mode: location.protocol === "file:" ? "bundled-knowledge" : "model-and-knowledge",
        standalone: true
      });
      if (window.LeAIModelKnowledgeRuntime) {
        window.LeAIModelKnowledgeRuntime.installFetchAdapter(window);
      }

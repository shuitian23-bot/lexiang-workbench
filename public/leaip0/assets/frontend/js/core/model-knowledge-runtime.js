(function (root, factory) {
  var runtime = factory();
  if (typeof module === "object" && module.exports) module.exports = runtime;
  if (root) root.LeAIModelKnowledgeRuntime = runtime;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  var PRODUCTS = [
    {
      official: true,
      sku: "skill-y9000p-2026",
      name: "拯救者 Y9000P 2026",
      full_name: "拯救者 Y9000P 2026",
      description: "适合 3A 游戏、视频剪辑、三维设计与高负载创作。",
      price: 15098,
      image_url: "../img/lxfd-gallery-1-1.jpg",
      url: "https://www.lenovo.com.cn/",
      variants: 1
    },
    {
      official: true,
      sku: "skill-yoga-air-14c-2026",
      name: "YOGA Air 14c 2026",
      full_name: "YOGA Air 14c 2026",
      description: "适合移动办公、轻量创作、会议演示与日常学习。",
      price: 8999,
      image_url: "../img/lxfd-gallery-1-2.jpg",
      url: "https://www.lenovo.com.cn/",
      variants: 1
    },
    {
      official: true,
      sku: "skill-xiaoxin-pad-pro-13",
      name: "小新 Pad Pro 13 英寸",
      full_name: "小新 Pad Pro 13 英寸",
      description: "适合影音娱乐、轻办公、移动阅读与跨设备协作。",
      price: 7299,
      image_url: "../img/lxfd-gallery-1-3.jpg",
      url: "https://www.lenovo.com.cn/",
      variants: 1
    }
  ];

  function normalize(value) {
    return String(value || "").trim().replace(/\s+/g, " ");
  }

  function recommendProducts(query) {
    var text = normalize(query).toLowerCase();
    if (/游戏|电竞|剪辑|三维|渲染|y9000p|拯救者/.test(text)) return [PRODUCTS[0], PRODUCTS[1]];
    if (/办公|出差|便携|轻薄|会议|yoga/.test(text)) return [PRODUCTS[1], PRODUCTS[2]];
    if (/平板|阅读|影音|pad/.test(text)) return [PRODUCTS[2], PRODUCTS[1]];
    return PRODUCTS.slice();
  }

  function answerQuery(query) {
    var text = normalize(query);
    var products = recommendProducts(text);
    if (/推荐|选购|买|商品|笔记本|电脑|平板|办公|游戏|学习|设计|剪辑|便携|轻薄/i.test(text)) {
      return {
        text: "我已根据你的使用场景，从模板内置的联想乐享产品知识中整理了几款方向。重性能可优先看拯救者 Y9000P；经常移动办公可优先看 YOGA Air 14c；偏影音、阅读和轻办公可关注小新 Pad Pro。价格、库存和活动会变化，购买前请以联想官方商城实时信息为准。",
        products: products,
        status: "已调用 Skill(联想乐享模型与知识)"
      };
    }
    return {
      text: "这是联想乐享 PC 5.0 规范 Skill 内置的独立问答能力。我可以围绕联想产品选购、使用场景、服务入口和设计规范提供回答；若需要商品推荐，可以直接告诉我预算、用途和便携偏好。",
      products: [],
      status: "已调用 Skill(联想乐享模型与知识)"
    };
  }

  function followups(query) {
    var text = normalize(query);
    if (/游戏|拯救者|y9000p/i.test(text)) return ["对比一下配置", "看看当前优惠", "适合哪些游戏"];
    if (/办公|轻薄|yoga/i.test(text)) return ["续航表现怎么样", "对比一下重量", "看看当前优惠"];
    return ["按预算帮我筛选", "对比一下这几款", "看看当前优惠"];
  }

  function sseResponse(query) {
    var result = answerQuery(query);
    var events = [
      ["status", { text: "正在调用 Skill(联想乐享模型与知识)" }],
      ["status", { text: result.status }],
      ["chunk", { text: result.text }]
    ];
    if (result.products.length) events.push(["display", { title: "为你推荐", products: result.products }]);
    events.push(["suggestions", { questions: followups(query) }]);
    events.push(["done", { conv_id: "skill-local-knowledge" }]);
    var body = events.map(function (entry) {
      return "event: " + entry[0] + "\ndata:" + JSON.stringify(entry[1]) + "\n\n";
    }).join("");
    return new Response(body, {
      status: 200,
      headers: { "Content-Type": "text/event-stream; charset=utf-8", "Cache-Control": "no-cache" }
    });
  }

  function jsonResponse(value, status) {
    return new Response(JSON.stringify(value), {
      status: status || 200,
      headers: { "Content-Type": "application/json; charset=utf-8" }
    });
  }

  function parseBody(options) {
    if (!options || !options.body || typeof options.body !== "string") return {};
    try { return JSON.parse(options.body); } catch (error) { return {}; }
  }

  function localApiResponse(url, options) {
    var path = String(url || "");
    var body = parseBody(options);
    if (/\/api\/leai\/intent(?:\?|$)/.test(path)) return jsonResponse({ type: "chat" });
    if (/\/api\/leai\/followups(?:\?|$)/.test(path)) return jsonResponse({ rc: 0, questions: followups(body.q || body.message) });
    if (/\/api\/(?:leai\/stream|chat\/stream)(?:\?|$)/.test(path)) return sseResponse(body.message || body.input || "");
    if (/\/api\/chat\/upload-image(?:\?|$)/.test(path)) return jsonResponse({ error: "独立模板暂不支持图片上传" }, 501);
    if (/\/api\//.test(path)) return jsonResponse({ rc: 0, data: [], user: null });
    return null;
  }

  function installFetchAdapter(target) {
    if (!target || typeof target.fetch !== "function" || target.__LX_SKILL_FETCH_INSTALLED) return;
    target.__LX_SKILL_FETCH_INSTALLED = true;
    var nativeFetch = target.fetch.bind(target);
    target.fetch = function (input, options) {
      var rawUrl = typeof input === "string" ? input : input && input.url;
      var isApi = typeof rawUrl === "string" && (/^\/api\//.test(rawUrl) || /\/api\//.test(rawUrl));
      if (!isApi) return nativeFetch(input, options);
      if (target.location && target.location.protocol === "file:") {
        return Promise.resolve(localApiResponse(rawUrl, options));
      }
      return nativeFetch(input, options).catch(function () {
        return localApiResponse(rawUrl, options);
      });
    };
  }

  return {
    PRODUCTS: PRODUCTS,
    answerQuery: answerQuery,
    followups: followups,
    localApiResponse: localApiResponse,
    installFetchAdapter: installFetchAdapter
  };
});

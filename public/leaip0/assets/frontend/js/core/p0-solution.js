// 咨询与线索场景补差（P0 对齐 PRD LEAD-01~04）：行业/场景 chip 澄清流、方案对比表维度重排的
// 交互层、无匹配兜底文案。不重造方案数据——全部复用 app.js 通过 window.__lxAgentAPI 暴露的
// LX_SOLUTION_META / LX_SOLUTION_CATALOG / LX_SOLUTIONS（同一份数据，见 app.js openSolutionCenter
// 上方注释）。挂载在 window.__lxSolution，5 个 index.html 在 app.js 之后引用本文件。
(function () {
  "use strict";
  if (window.__lxSolutionBound) return;
  window.__lxSolutionBound = true;

  function api() { return window.__lxAgentAPI || {}; }
  function getState() { var a = api(); return (a.getState && a.getState()) || window.__lxState || {}; }
  function esc(value) { var a = api(); return a.esc ? a.esc(value) : String(value == null ? "" : value); }

  var HOTLINE = "400-813-6161";

  // 8 大行业关键词识别：仅用于判断自然语言 query 是否已经带了行业（AC-LEAD-01/02 的"跳过一级"分支），
  // 不做场景级识别——场景一律通过二级 chip 收集，避免误判导致直接跳过澄清。
  var INDUSTRY_PATTERNS = [
    ["教育", /教育|学校|校园|高校|职教/],
    ["医疗", /医疗|医院|医共体|卫生|诊所/],
    ["政府", /政府|政务|机关|公共事业|政教/],
    ["制造", /制造业|工厂|产线|质检|智能制造/],
    ["金融", /金融|银行|证券|保险/],
    ["能源", /能源|电力|矿山|矿产|油气|电厂|变电/],
    ["交通", /交通|高速|轨交|机场|民航/],
    ["服务", /服务(行业|业)|物流|媒体|零售连锁|企业出海/]
  ];

  function detectIndustry(text) {
    var t = String(text || "");
    for (var i = 0; i < INDUSTRY_PATTERNS.length; i++) {
      if (INDUSTRY_PATTERNS[i][1].test(t)) return INDUSTRY_PATTERNS[i][0];
    }
    return "";
  }

  function catalogFor(industry) {
    var catalog = api().solutionCatalog || {};
    return catalog[industry] || [];
  }
  function metaKeyFor(industry) {
    var meta = api().solutionMeta || [];
    for (var i = 0; i < meta.length; i++) if (meta[i][0] === industry) return meta[i][1];
    return industry;
  }
  function scenariosFor(industry) {
    var seen = [];
    catalogFor(industry).forEach(function (row) {
      var sc = row[1];
      if (sc && seen.indexOf(sc) < 0) seen.push(sc);
    });
    return seen;
  }
  function itemsFor(industry, scenario) {
    return catalogFor(industry).filter(function (row) { return !scenario || row[1] === scenario; });
  }

  // ---- chip 渲染 ----
  function industryChipsHtml() {
    var industries = (api().solutionMeta || []).map(function (m) { return m[0]; });
    var chips = industries.map(function (name) {
      return '<button type="button" class="lx-solution-chip" data-solution-chip-industry="' + esc(name) + '">' + esc(name) + '</button>';
    }).join("");
    return '<div class="lx-solution-chip-group" role="group" aria-label="选择行业">' + chips + '</div>';
  }
  function scenarioChipsHtml(industry) {
    var scenarios = scenariosFor(industry);
    var chips = scenarios.map(function (sc) {
      return '<button type="button" class="lx-solution-chip" data-solution-chip-industry="' + esc(industry) + '" data-solution-chip-scenario="' + esc(sc) + '">' + esc(sc) + '</button>';
    }).join("");
    var skip = '<button type="button" class="lx-solution-chip lx-solution-chip-skip" data-solution-chip-industry="' + esc(industry) + '" data-solution-chip-scenario="">查看全部' + esc(industry) + '方案</button>';
    return '<div class="lx-solution-chip-group" role="group" aria-label="选择场景">' + chips + skip + '</div>';
  }

  function askIndustry() {
    var a = api();
    if (!a.lxAddInstantAi) return;
    a.lxAddInstantAi("为了给你推荐更精准的解决方案，先帮我选一下你所在或关注的行业：", industryChipsHtml());
  }
  function askScenario(industry) {
    var a = api();
    if (!a.lxAddInstantAi) return;
    a.lxAddInstantAi("已为你锁定「" + industry + "」行业，还有更具体的场景吗？也可以直接查看该行业全部方案：", scenarioChipsHtml(industry));
  }

  // ---- 结果卡片 ----
  function cardHtml(industry, key, row, picked) {
    var name = row[0], scenario = row[1], intro = row[2], image = row[3];
    var img = image ? "../img/solution/" + esc(image) : "";
    return '<article class="lx-floor-card lx-solution-card lx-solution-result-card" data-solution="' + esc(key) + '" data-solution-title="' + esc(name) + '" data-solution-industry="' + esc(key) + '" data-solution-sector="' + esc(industry) + '" data-solution-scenario="' + esc(scenario) + '" data-solution-intro="' + esc(intro) + '" data-solution-image="' + esc(image) + '" role="button" tabindex="0" aria-label="查看' + esc(name) + '详情">' +
      (img ? '<img class="lx-solution-card-image" src="' + img + '" alt="' + esc(name) + '方案场景图">' : "") +
      '<div class="lx-solution-card-head"><div><strong>' + esc(name) + '</strong><div class="lx-solution-card-tags"><small>' + esc(industry) + '</small><small>' + esc(scenario) + '</small></div></div></div>' +
      '<span>' + esc(intro) + '</span>' +
      '<div class="lx-solution-card-actions">' +
      '<button type="button" class="lx-solution-action-btn">了解详情</button>' +
      '<button type="button" class="lx-solution-action-btn lx-solution-compare-btn' + (picked ? " is-picked" : "") + '" data-solution-compare-toggle aria-pressed="' + (picked ? "true" : "false") + '">' + (picked ? "已选择 · 对比" : "解决方案对比") + "</button>" +
      "</div>" +
      "</article>";
  }

  function resultGridHtml(industry, scenario) {
    var key = metaKeyFor(industry);
    var refs = getState().refProducts || [];
    var items = itemsFor(industry, scenario);
    var cards = items.map(function (row) {
      var sku = "solution:" + row[0];
      var picked = refs.some(function (p) { return p.sku === sku; });
      return cardHtml(industry, key, row, picked);
    }).join("");
    var title = scenario ? industry + " · " + scenario : industry + "解决方案";
    return '<section class="lx-solution-center-page lx-solution-result-page">' +
      '<section class="lx-solution-floor" data-solution-industry="' + esc(industry) + '">' +
      '<div class="lx-floor-head"><div><h2>' + esc(title) + '</h2><p>覆盖核心场景、终端部署与持续服务，勾选后可一键对比</p></div></div>' +
      '<div class="lx-floor-body">' + cards + "</div>" +
      "</section>" +
      '<div class="lx-solution-result-footer"><button type="button" class="lx-p0-btn primary" data-solution-open-compare>解决方案对比</button></div>' +
      '<p class="lx-p0-disclaimer">以上方案由联想乐享汇总，AI 生成内容仅供参考，实际交付范围以业务顾问确认结果为准。</p>' +
      "</section>";
  }

  // ---- 双澄清后终局：正文逐字完成 → 结果卡出现 → 右侧页打开（README 硬规则，与
  // lxRunUnifiedSolutionAnswer 保持同一顺序，不打破跨频道一致性验收样例）----
  async function showResult(industry, scenario) {
    var a = api();
    var items = itemsFor(industry, scenario);
    if (!items.length) { showNoMatch(industry + (scenario || "")); return; }
    var copy = "已为你在**" + industry + "行业**" + (scenario ? "聚焦**" + scenario + "**场景，" : "") +
      "筛选出 " + items.length + " 个解决方案，可点击查看详情，或勾选后一键对比。";
    var cta = a.renderPageCta({
      title: "查看" + industry + "解决方案",
      desc: "已为你筛选 " + items.length + " 个方案",
      attr: 'data-lx-open-tab="info:solution" data-lxfd-open-feature="solution" aria-label="查看' + esc(industry) + '解决方案页面"'
    });
    var node = a.addMessage ? a.addMessage("assistant", copy) : null;
    try { await ((node && node._typingDone) || Promise.resolve()); } catch (e) {}
    if (node && a.lxAppendAiHtml) a.lxAppendAiHtml(node, cta);
    await new Promise(function (resolve) { window.setTimeout(resolve, 260); });
    if (a.lxRevealContent) a.lxRevealContent();
    if (a.lxOpenInfoTab) a.lxOpenInfoTab("solution", industry + "解决方案", resultGridHtml(industry, scenario));
    if (a.lxSyncAnswerCtaActiveState) a.lxSyncAnswerCtaActiveState("info:solution");
  }

  // ---- 无匹配/低置信兜底（PRD 5.2）：左侧告知未找到 + 热线 + 在线咨询 + 提交项目需求，右侧不开新页 ----
  function showNoMatch(query) {
    var a = api();
    if (!a.lxAddInstantAi) return;
    a.lxAddInstantAi(
      "没有找到与「" + query + "」匹配的解决方案，你可以换个说法，或者：",
      '<div class="lx-p0-actions">' +
      '<button class="lx-p0-btn" type="button" data-quick-ask="商用产品及方案服务咨询热线是多少">拨打热线 ' + HOTLINE + "</button>" +
      '<button class="lx-p0-btn" type="button" data-quick-ask="我想在线咨询顾问，帮我推荐合适的方案">在线咨询</button>' +
      '<button class="lx-p0-btn primary" type="button" data-floor-action="lead">提交项目需求</button>' +
      "</div>"
    );
  }

  // ---- 入口 1：本地/远程意图判定为 open_solution 的全新一轮（无已存在的 AI 气泡）----
  async function route(text) {
    var industry = detectIndustry(text);
    if (!industry) { askIndustry(); return; }
    askScenario(industry);
  }

  // ---- 入口 2：官方 SKILL / 火山兜底自然语言回答已生成后，追加到同一条 AI 气泡末尾 ----
  function handleAction(text, aiNode) {
    var a = api();
    if (!aiNode || !a.lxAppendAiHtml) { route(text); return; }
    var industry = detectIndustry(text);
    if (!industry) {
      a.lxAppendAiHtml(aiNode, '<p class="lx-solution-chip-lead">为了给你推荐更精准的解决方案，先帮我选一下你所在或关注的行业：</p>' + industryChipsHtml());
      return;
    }
    a.lxAppendAiHtml(aiNode, '<p class="lx-solution-chip-lead">已为你锁定「' + esc(industry) + '」行业，还有更具体的场景吗？也可以直接查看该行业全部方案：</p>' + scenarioChipsHtml(industry));
  }

  // ---- chip 点击委托：行业 chip → 场景 chip；场景 chip（含"查看全部"跳过项）→ 最终结果 ----
  document.addEventListener("click", function (event) {
    var scenarioChip = event.target.closest && event.target.closest("[data-solution-chip-scenario]");
    if (scenarioChip) {
      var sIndustry = scenarioChip.getAttribute("data-solution-chip-industry") || "";
      var scenario = scenarioChip.getAttribute("data-solution-chip-scenario") || "";
      var a2 = api();
      if (a2.addMessage) a2.addMessage("user", scenario ? scenario : "查看全部" + sIndustry + "方案");
      showResult(sIndustry, scenario);
      return;
    }
    var industryChip = event.target.closest && event.target.closest("[data-solution-chip-industry]");
    if (industryChip) {
      var industry = industryChip.getAttribute("data-solution-chip-industry") || "";
      var a = api();
      if (a.addMessage) a.addMessage("user", industry);
      askScenario(industry);
    }
  });

  // ---- 卡片内“解决方案对比”按钮：转发到 app.js 自动注入的右上角勾选按钮，
  // 复用同一份选中态（README：商品卡与方案卡统一常驻勾选控件），不维护第二份状态 ----
  document.addEventListener("click", function (event) {
    var toggle = event.target.closest && event.target.closest("[data-solution-compare-toggle]");
    if (!toggle) return;
    event.preventDefault();
    event.stopPropagation();
    var card = toggle.closest(".lx-solution-card");
    var pick = card && card.querySelector(":scope > .lx-pick-btn");
    if (pick) pick.click();
  }, true);

  // ---- 列表底部“解决方案对比”按钮：≥2 个已勾选方案时复用现有 sendChat 对比链路 ----
  document.addEventListener("click", function (event) {
    var btn = event.target.closest && event.target.closest("[data-solution-open-compare]");
    if (!btn) return;
    var a = api();
    var st = getState();
    var count = (st.refProducts || []).filter(function (p) { return p.type === "solution"; }).length;
    if (count < 2) { if (a.toast) a.toast("请至少勾选 2 个方案再对比"); return; }
    if (window.__lxBridge && typeof window.__lxBridge.sendChat === "function") window.__lxBridge.sendChat("帮我对比一下这几个方案");
  });

  // ---- 对比表列标题点击 → 跳回该方案详情页（PRD：列标题/查看详情可跳回详情） ----
  document.addEventListener("click", function (event) {
    var head = event.target.closest && event.target.closest("[data-open-solution-detail]");
    if (!head) return;
    event.preventDefault();
    event.stopPropagation();
    var a = api();
    if (!a.lxOpenSpecificSolutionDetail) return;
    a.lxOpenSpecificSolutionDetail({
      title: head.getAttribute("data-solution-title") || "",
      industry: head.getAttribute("data-solution-industry") || "",
      sector: head.getAttribute("data-solution-sector") || "",
      scenario: head.getAttribute("data-solution-scenario") || "",
      intro: head.getAttribute("data-solution-intro") || "",
      image: head.getAttribute("data-solution-image") || ""
    });
  }, true);

  // ---- 对比页追加/替换（PRD：2 列直接加第 3 个；3 列需先选要替换的方案）----
  function resolveCatalogItem(name) {
    var meta = api().solutionMeta || [];
    var catalog = api().solutionCatalog || {};
    for (var i = 0; i < meta.length; i++) {
      var industry = meta[i][0];
      var rows = catalog[industry] || [];
      for (var j = 0; j < rows.length; j++) {
        if (rows[j][0] === name) {
          return {
            sku: "solution:" + name, type: "solution", name: name,
            sector: industry, scenario: rows[j][1], description: rows[j][2],
            image_url: rows[j][3] ? "../img/solution/" + rows[j][3] : ""
          };
        }
      }
    }
    return null;
  }

  function optionsHtml(excludeNames) {
    var meta = api().solutionMeta || [];
    var catalog = api().solutionCatalog || {};
    return meta.map(function (m) {
      var industry = m[0];
      var rows = (catalog[industry] || []).filter(function (r) { return excludeNames.indexOf(r[0]) < 0; });
      if (!rows.length) return "";
      var opts = rows.map(function (r) { return '<option value="' + esc(r[0]) + '">' + esc(r[0]) + "</option>"; }).join("");
      return '<optgroup label="' + esc(industry) + '">' + opts + "</optgroup>";
    }).join("");
  }

  function mountCompareAppend(compareMeta, items) {
    var root = document.querySelector('[data-solution-compare-append][data-solution-compare-index="' + compareMeta.index + '"]');
    if (!root) return;
    var names = items.map(function (it) { return it.name; });
    if (items.length >= 3) {
      root.innerHTML = '<p class="lx-cmp-append-hint">已达到 3 个方案对比上限，如需更换请选择要替换的方案：</p>' +
        '<div class="lx-cmp-replace-targets">' + names.map(function (n) {
          return '<button type="button" class="lx-p0-btn" data-solution-replace-target="' + esc(n) + '">替换「' + esc(n) + '」</button>';
        }).join("") +
        "</div>" +
        '<select class="lx-cmp-append-select" data-solution-append-select hidden><option value="">选择替换后的方案…</option>' + optionsHtml(names) + "</select>";
    } else {
      root.innerHTML = '<label class="lx-cmp-append-label">追加对比方案：<select class="lx-cmp-append-select" data-solution-append-select><option value="">选择要追加对比的方案…</option>' + optionsHtml(names) + "</select></label>";
    }
    var pendingReplace = "";
    root.querySelectorAll("[data-solution-replace-target]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        pendingReplace = btn.getAttribute("data-solution-replace-target") || "";
        var sel = root.querySelector("[data-solution-append-select]");
        if (sel) { sel.hidden = false; sel.focus(); }
        root.querySelectorAll("[data-solution-replace-target]").forEach(function (b) { b.classList.toggle("is-active", b === btn); });
      });
    });
    var select = root.querySelector("[data-solution-append-select]");
    if (select) select.addEventListener("change", function () {
      var name = select.value;
      if (!name) return;
      var newItem = resolveCatalogItem(name);
      if (!newItem) return;
      var nextItems = items.slice();
      if (nextItems.length >= 3) {
        var idx = pendingReplace ? nextItems.findIndex(function (it) { return it.name === pendingReplace; }) : -1;
        if (idx < 0) idx = nextItems.length - 1;
        nextItems[idx] = newItem;
      } else {
        nextItems.push(newItem);
      }
      var a = api();
      if (!a.lxSolutionCompareMeta || !a.lxOpenSolutionCompareTab) return;
      var meta = a.lxSolutionCompareMeta(nextItems);
      a.lxOpenSolutionCompareTab(nextItems, meta);
    });
  }

  window.__lxSolution = {
    route: route,
    handleAction: handleAction,
    mountCompareAppend: mountCompareAppend,
    detectIndustry: detectIndustry,
    showNoMatch: showNoMatch
  };
})();

(function () {
        var body;
        var content;
        var chat;
        var commerceMounted = false;
        var ordersTabObserver = null;
        var assistantQueryObserver = null;
        var workspaceHandoffTimer = 0;
        var homeWorkspace = null;
        var orderData = window.OrderDemoData || { orders: [] };
        var orders = Array.isArray(orderData.orders) ? orderData.orders.slice() : [];

        var orderListState = { query: "", type: "all", status: "全部" };
        var orderTypeOptions = [
          ["all", "全部类型"],
          ["normal", "普通订单"],
          ["presale", "预售订单"],
          ["service", "服务订单"],
          ["recharge", "充值订单"],
          ["omo", "OMO 订单"],
          ["comboOption", "主品 + 选件"],
          ["comboService", "主品 + 服务"],
          ["comboCustomization", "主品 + 私定"],
          ["comboGift", "主品 + 赠品"],
          ["beanRedemption", "乐豆兑换"]
        ];
        var orderStatusOptions = ["全部", "待付款", "待发货", "待收货"];

        function escapeHtml(value) {
          return String(value).replace(/[&<>'\"]/g, function (char) {
            return { "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", "\"": "&quot;" }[char];
          });
        }

        function matchesOrderType(order, type) {
          if (type === "all") return true;
          var orderType = order.type || "normal";
          if (type === "omo") return orderType === "omoPickup" || orderType === "omoDelivery";
          if (type === "beanRedemption") return order.isBeanRedemption === true;
          var scenarioRoles = {
            comboOption: "选件",
            comboService: "服务",
            comboCustomization: "私定",
            comboGift: "赠品"
          };
          if (scenarioRoles[type]) {
            var roles = (order.items || []).map(function (item) { return item.role; });
            return roles.includes("主品") && roles.includes(scenarioRoles[type]);
          }
          return type === orderType;
        }

        function formatCurrency(value) {
          return "¥" + Math.round(Number(value || 0)).toLocaleString("zh-CN");
        }

        function formatMixedAmount(value, beans) {
          var cash = formatCurrency(value);
          return Number(beans || 0) > 0 ? cash + " + " + Number(beans) + "乐豆" : cash;
        }

        function primaryItem(order) {
          return (order.items || [])[0] || {};
        }

        function orderAmount(order) {
          var payment = order.payment || {};
          return formatMixedAmount(payment.payable, payment.beans);
        }

        function orderBadges(order) {
          return [order.typeLabel || "普通订单"];
        }

        function statusExtra(order) {
          if (!order.countdownTarget) return "";
          var label = order.status === "待付定金" ? "定金支付截止" : order.status === "待付尾款" ? "尾款支付截止" : "付款截止";
          return label + " " + String(order.countdownTarget).replace("T", " ").replace("+08:00", "");
        }

        function filterOrders(query, type, status) {
          var needle = String(query || "").trim().toLocaleLowerCase("zh-CN");
          return orders.filter(function (order) {
            var searchable = [order.id].concat((order.items || []).map(function (item) { return item.name; })).join(" ").toLocaleLowerCase("zh-CN");
            var typeMatch = matchesOrderType(order, type);
            var statusMatch = status === "全部" || status === "all" || status === order.status;
            return typeMatch && statusMatch && (!needle || searchable.includes(needle));
          }).sort(function (a, b) {
            return String(b.createdAt || "").localeCompare(String(a.createdAt || ""));
          });
        }

        function orderCard(order) {
          var paidClass = ["待付款", "待付定金", "待付尾款"].includes(order.status) ? " is-paid" : "";
          var badges = orderBadges(order).map(function (badge) { return '<span class="lx-order-badge">' + escapeHtml(badge) + '</span>'; }).join("");
          var productRows = (order.items || []).map(function (item) {
            var role = item.role && item.role !== "主品" ? '<span class="lx-order-item-role">' + escapeHtml(item.role) + '</span>' : "";
            return '<div class="lx-order-card-product-row"><span class="lx-order-thumb"><img src="' + escapeHtml(item.image) + '" alt="' + escapeHtml(item.name) + '"></span><div class="lx-order-product">' + role + '<h2>' + escapeHtml(item.name) + '</h2><p>' + escapeHtml(item.description) + '</p><span>数量 × ' + escapeHtml(item.quantity) + '</span></div></div>';
          }).join("");
          var extra = statusExtra(order);
          var mixedClass = Number(order.payment && order.payment.beans || 0) > 0 ? " lx-order-mixed-amount" : "";
          return '<article class="lx-order-card" data-order-id="' + escapeHtml(order.id) + '">' +
            '<header class="lx-order-card-head"><div><span>订单号 ' + escapeHtml(order.id) + '</span><span>' + escapeHtml(order.createdAt) + '</span></div><div class="lx-order-card-head-right">' + badges + '<strong class="lx-order-card-status' + paidClass + '">' + escapeHtml(order.status) + '</strong></div></header>' +
            '<div class="lx-order-card-body"><div class="lx-order-card-products">' + productRows + '</div>' +
            '<div class="lx-order-card-money"><span>应付金额</span><strong class="' + mixedClass.trim() + '">' + escapeHtml(orderAmount(order)) + '</strong></div>' +
            '<div class="lx-order-card-state"><strong>' + escapeHtml(order.status) + '</strong>' + (extra ? '<small>' + escapeHtml(extra) + '</small>' : '') + '</div>' +
            '<div class="lx-order-card-actions"><button class="lx-order-detail-button" type="button" data-order-detail-id="' + escapeHtml(order.id) + '">查看详情</button></div></div>' +
          '</article>';
        }

        function renderOrderList() {
          if (!content) return;
          var list = content.querySelector("[data-orders-list]");
          if (!list) return;
          var filtered = filterOrders(orderListState.query, orderListState.type, orderListState.status);
          var grid = list.querySelector("[data-order-grid]");
          var empty = list.querySelector("[data-order-empty]");
          var count = list.querySelector("[data-order-count]");
          if (grid) {
            grid.innerHTML = filtered.map(orderCard).join("");
            grid.hidden = filtered.length === 0;
          }
          if (empty) empty.classList.toggle("is-active", filtered.length === 0);
          if (count) count.textContent = String(filtered.length);
          list.querySelectorAll("[data-order-status]").forEach(function (button) {
            var active = button.dataset.orderStatus === orderListState.status;
            button.classList.toggle("is-active", active);
            button.setAttribute("aria-selected", String(active));
          });
          var typeLabel = (orderTypeOptions.find(function (item) { return item[0] === orderListState.type; }) || orderTypeOptions[0])[1];
          var typeValue = list.querySelector("[data-order-type-value]");
          if (typeValue) typeValue.textContent = typeLabel;
          list.querySelectorAll("[data-order-type-option]").forEach(function (button) {
            var selected = button.dataset.orderTypeOption === orderListState.type;
            button.classList.toggle("is-selected", selected);
            button.setAttribute("aria-selected", String(selected));
          });
          var searchInput = list.querySelector("[data-order-search]");
          if (searchInput && searchInput.value !== orderListState.query) searchInput.value = orderListState.query;
        }

        function setOrderTypeMenu(open) {
          if (!content) return;
          var picker = content.querySelector("[data-order-type-picker]");
          if (!picker) return;
          var trigger = picker.querySelector("[data-order-type-trigger]");
          var menu = picker.querySelector("[data-order-type-menu]");
          picker.classList.toggle("is-open", open);
          if (trigger) trigger.setAttribute("aria-expanded", String(open));
          if (menu) menu.hidden = !open;
        }

        function streamSkillAnswer(question, skillName, paragraphs, options) {
          options = options || {};
          if (body) body.dataset.state = "chat";
          var oldFollowup = document.getElementById("lx-order-live-followup");
          if (oldFollowup) oldFollowup.hidden = true;
          var liveChat = document.querySelector(".assistant-panel .chat-state");
          var messages = liveChat.querySelector(".lx-p0-messages");
          if (!messages) {
            messages = document.createElement("div");
            messages.className = "lx-p0-messages";
            messages.setAttribute("aria-live", "polite");
            liveChat.appendChild(messages);
          }
          var userLine = document.createElement("div");
          userLine.className = "lx-p0-message msg user";
          userLine.innerHTML = '<div class="user-bubble">' + escapeHtml(question) + '</div>';
          var aiBlock = document.createElement("div");
          aiBlock.className = "lx-p0-message msg ai lx-chat-skin";
          aiBlock.id = "lx-order-live-followup";
          aiBlock.setAttribute("data-order-followup", "");
          var aiBody = document.createElement("div");
          aiBody.className = "ai-body";
          var trace = document.createElement("div");
          trace.className = "lx-skill-trace is-foldable";
          var skill = document.createElement("button");
          skill.type = "button";
          skill.className = "lx-skill-trace-fold";
          skill.setAttribute("data-lx-trace-toggle", "");
          skill.setAttribute("aria-expanded", "true");
          var label = document.createElement("span");
          label.className = "lx-skill-trace-fold-text";
          label.textContent = "正在调用 1 个 Skill";
          var caret = document.createElement("span");
          caret.className = "lx-skill-trace-fold-caret";
          caret.innerHTML = '<img src="../icons/global-collapse.svg" alt="" aria-hidden="true">';
          skill.appendChild(label);
          skill.appendChild(caret);
          var region = document.createElement("div");
          region.className = "lx-skill-trace-list";
          var detail = document.createElement("span");
          detail.className = "lx-skill-trace-item current";
          detail.textContent = "Skill（" + skillName + "）调用中";
          region.appendChild(detail);
          var answer = document.createElement("div");
          answer.className = "lx-order-standard-answer";
          answer.hidden = true;
          trace.appendChild(skill);
          trace.appendChild(region);
          aiBody.appendChild(trace);
          aiBody.appendChild(answer);
          aiBlock.appendChild(aiBody);
          messages.appendChild(userLine);
          messages.appendChild(aiBlock);
          liveChat.scrollTop = liveChat.scrollHeight;
          skill.addEventListener("click", function () {
            var collapsed = trace.classList.toggle("is-collapsed");
            skill.setAttribute("aria-expanded", String(!collapsed));
          });
          return new Promise(function (resolve) {
          setTimeout(function () {
            label.textContent = "正在获取数据";
            detail.textContent = "Skill（" + skillName + "）正在获取订单数据";
          }, 320);
          setTimeout(function () {
            label.textContent = "已完成 1 个 Skill 调用";
            detail.classList.remove("current");
            detail.textContent = "Skill（" + skillName + "）已调用";
            answer.hidden = false;
            answer.classList.add("lx-stream-cursor");
            var paragraphIndex = 0;
            var charIndex = 0;
            function writeNext() {
              if (paragraphIndex >= paragraphs.length) {
                answer.classList.remove("lx-stream-cursor");
                if (options.finalHtml) answer.innerHTML = options.finalHtml;
                if (options.cardHtml) answer.insertAdjacentHTML("beforeend", options.cardHtml);
                if (options.disclaimer) answer.insertAdjacentHTML("beforeend", '<p class="lx-p0-disclaimer">' + escapeHtml(options.disclaimer) + '</p>');
                liveChat.scrollTop = liveChat.scrollHeight;
                requestAnimationFrame(function () { requestAnimationFrame(function () { resolve(aiBlock); }); });
                return;
              }
              var source = paragraphs[paragraphIndex];
              var p = answer.children[paragraphIndex];
              if (!p) { p = document.createElement("p"); answer.appendChild(p); }
              p.textContent = source.slice(0, charIndex + 1);
              charIndex += 1;
              liveChat.scrollTop = liveChat.scrollHeight;
              if (charIndex >= source.length) { paragraphIndex += 1; charIndex = 0; setTimeout(writeNext, 70); }
              else setTimeout(writeNext, 13);
            }
            writeNext();
          }, 980);
          });
        }

        function buildThread() {
          return '<div class="lx-orders-thread">' +
            '<p class="lx-order-user">我有哪些订单？</p>' +
            '<div class="lx-order-ai"><div class="lx-order-skill"><img src="../icons/mall-orders.svg" alt=""><span>已完成 1 个 Skill 调用 · 订单查询</span></div>' +
              '<p>我为你查到 <strong>22 笔订单</strong>，其中 17 笔正在进行中，最近一笔下单时间为 2026-08-18。</p>' +
              '<p>订单列表已展示在右侧。可以按订单号、商品名称、订单类型和状态筛选；点击“查看详情”查看完整订单信息。</p>' +
              '<button class="lx-order-result-card" type="button" data-open-orders><span class="lx-order-result-icon"><img src="../icons/global-next.svg" alt=""></span><span><strong>查看我的订单</strong><small>共 22 笔 · 17 笔进行中</small></span><img src="../icons/arrow-left.svg" alt=""></button>' +
              '<p class="lx-order-disclaimer">内容由联想乐享基于当前订单数据生成，请在提交售后或支付前核对关键信息。</p>' +
            '</div>' +
          '</div>';
        }

        function buildOrdersPage() {
          return '<div class="lx-orders-page">' +
            '<nav class="lx-orders-tabs lx-tabbar" aria-label="已打开页面" hidden><button class="lx-orders-tab lx-tab is-active" type="button" data-workspace-view="orders" aria-current="page"><span class="lx-tab-label">我的订单</span><span class="lx-orders-tab-close lx-tab-close">×</span></button></nav>' +
            '<section class="lx-orders-list is-active" data-orders-list>' +
              '<header class="lx-orders-head"><div class="lx-orders-title-wrap"><h1>我的订单</h1><p>查看并管理你的联想乐享订单</p></div></header>' +
              '<div class="lx-order-filterbar"><label class="lx-order-search"><img src="../icons/global-search.svg" alt=""><input type="search" value="' + escapeHtml(orderListState.query) + '" placeholder="搜索订单号或商品名称" aria-label="搜索订单" data-order-search></label>' +
                '<div class="lx-order-type-label" data-order-type-picker><span>订单类型</span><button class="lx-order-type-trigger" type="button" data-order-type-trigger aria-haspopup="listbox" aria-expanded="false"><strong data-order-type-value>' + escapeHtml(orderTypeOptions.find(function (item) { return item[0] === orderListState.type; })[1]) + '</strong><span class="lx-order-type-chevron" aria-hidden="true"></span></button><div class="lx-order-type-menu" data-order-type-menu role="listbox" aria-label="筛选订单类型" hidden>' + orderTypeOptions.map(function (item) { var selected = item[0] === orderListState.type; return '<button type="button" role="option" aria-selected="' + selected + '" class="lx-order-type-option' + (selected ? ' is-selected' : '') + '" data-order-type-option="' + item[0] + '"><span>' + item[1] + '</span></button>'; }).join("") + '</div></div></div>' +
              '<div class="lx-order-status-tabs" role="tablist" aria-label="按订单状态筛选">' + orderStatusOptions.map(function (status) { var active = status === orderListState.status; return '<button type="button" role="tab" aria-selected="' + active + '" class="' + (active ? 'is-active' : '') + '" data-order-status="' + status + '">' + status + '</button>'; }).join("") + '</div>' +
              '<div class="lx-order-result-meta"><strong data-order-count>' + orders.length + '</strong><span>笔订单</span></div>' +
              '<div class="lx-order-grid" data-order-grid>' + orders.map(orderCard).join("") + '</div>' +
              '<div class="lx-order-empty" data-order-empty><strong>没有找到相关订单</strong><p>可以调整订单类型、状态或搜索关键词。</p><button type="button" data-order-clear>清除筛选</button></div>' +
            '</section>' +
            '<section class="lx-order-detail" data-order-detail></section>' +
          '</div>';
        }

        function mountCommerceWorkspace() {
          removeWorkspaceHandoffSnapshot();
          if (commerceMounted || !content) return;
          var fragment = document.createDocumentFragment();
          while (content.firstChild) fragment.appendChild(content.firstChild);
          homeWorkspace = {
            fragment: fragment,
            className: content.className,
            ariaLabel: content.getAttribute("aria-label"),
            navLabel: document.querySelector(".main-nav")?.dataset.shopCurrentLabel || "",
            conversationName: document.querySelector(".lxfd-convo-name")?.textContent || ""
          };
          body.classList.add("lx-orders-poc", "lx-template-file");
          content.className = "content lx-orders-content";
          content.setAttribute("aria-label", "我的订单");
          content.innerHTML = buildOrdersPage();
          commerceMounted = true;
          renderOrderList();
          removeLegacyTabs();
          syncOrdersTabVisibility();
          var ordersTabbar = content.querySelector(".lx-orders-tabs");
          if (ordersTabbar && window.MutationObserver) {
            ordersTabObserver = new MutationObserver(syncOrdersTabVisibility);
            ordersTabObserver.observe(ordersTabbar, { childList: true });
          }
        }

        function removeWorkspaceHandoffSnapshot() {
          window.clearTimeout(workspaceHandoffTimer);
          workspaceHandoffTimer = 0;
          document.querySelectorAll(".lx-order-handoff-snapshot").forEach(function (node) { node.remove(); });
          if (body) body.classList.remove("lx-order-handoff-pending");
        }

        function finishWorkspaceHandoffAfterResultCard() {
          if (!document.querySelector(".lx-order-handoff-snapshot")) return;
          window.clearTimeout(workspaceHandoffTimer);
          workspaceHandoffTimer = window.setTimeout(removeWorkspaceHandoffSnapshot, 760);
        }

        function restoreHomeWorkspace(preserveCurrentView) {
          if (!commerceMounted || !homeWorkspace || !content) return;
          var snapshot = null;
          if (preserveCurrentView) {
            var currentOrdersPage = content.querySelector(".lx-orders-page");
            if (currentOrdersPage) {
              snapshot = document.createElement("div");
              snapshot.className = "lx-order-handoff-snapshot";
              snapshot.setAttribute("aria-hidden", "true");
              snapshot.appendChild(currentOrdersPage.cloneNode(true));
            }
          }
          content.replaceChildren(homeWorkspace.fragment);
          content.className = homeWorkspace.className;
          if (homeWorkspace.ariaLabel == null) content.removeAttribute("aria-label");
          else content.setAttribute("aria-label", homeWorkspace.ariaLabel);
          body.classList.remove("lx-orders-poc");
          if (ordersTabObserver) ordersTabObserver.disconnect();
          ordersTabObserver = null;
          commerceMounted = false;
          content.scrollTop = 0;
          var mainNav = document.querySelector(".main-nav");
          if (mainNav) mainNav.dataset.shopCurrentLabel = homeWorkspace.navLabel;
          var fullscreenName = document.querySelector(".lxfd-convo-name");
          if (fullscreenName && homeWorkspace.conversationName) fullscreenName.textContent = homeWorkspace.conversationName;
          if (snapshot) {
            content.appendChild(snapshot);
            body.classList.add("lx-order-handoff-pending");
          }
        }

        function isOrderQuery(text) {
          return /订单|物流|发货/.test(String(text || ""));
        }

        function isDirectOrderCenterQuery(text) {
          var normalized = String(text || "").replace(/[\s，。！？、,.!?]/g, "");
          return /^(?:我要|我想|帮我)?(?:查看|查询|打开)?(?:我的)?订单(?:中心|列表|记录)?$/.test(normalized);
        }

        function restoreSharedWorkspaceForQuery(node) {
          if (!node || node.nodeType !== 1) return;
          var resultCard = node.matches("[data-lx-result-id]") ? node : node.querySelector("[data-lx-result-id]");
          if (resultCard) finishWorkspaceHandoffAfterResultCard();
          if (!commerceMounted || orderIconFlowRunning) return;
          var userMessage = node.matches(".lx-p0-message.user, .msg.user") ? node : node.querySelector(".lx-p0-message.user, .msg.user");
          if (!userMessage) return;
          var bubble = userMessage.querySelector(".user-bubble");
          var query = (bubble || userMessage).textContent || "";
          if (!isOrderQuery(query)) restoreHomeWorkspace(true);
        }

        function setWorkspaceView(view) {
          if (view === "home") {
            restoreHomeWorkspace();
            return;
          }
          mountCommerceWorkspace();
          content.querySelectorAll("[data-workspace-view]").forEach(function(tab){
            var active = tab.dataset.workspaceView === "orders";
            tab.classList.toggle("is-active", active);
            tab.toggleAttribute("aria-current", active);
          });
          var ordersPage = content.querySelector(".lx-orders-page");
          if (ordersPage) ordersPage.hidden = false;
          content.setAttribute("aria-label", "我的订单");
          renderOrderList();
          content.scrollTop = 0;
          syncOrdersTabVisibility();
        }

        function syncOrdersTabVisibility() {
          if (!content) return;
          var tabbar = content.querySelector(".lx-orders-tabs");
          if (!tabbar) return;
          var realTabs = tabbar.querySelectorAll(".lx-orders-tab:not([hidden])");
          tabbar.hidden = realTabs.length <= 1;
        }

        function removeLegacyTabs() {
          var legacyBars = content.querySelectorAll(":scope > .lx-tabbar, :scope > [data-shop-detail-tabs], :scope > [aria-label='已打开页面']");
          for (var index = 0; index < legacyBars.length; index += 1) legacyBars[index].hidden = true;
        }

        function openOrdersFromChat(question) {
          if (window.__lxBridge && typeof window.__lxBridge.prepareRootSplitState === "function") {
            window.__lxBridge.prepareRootSplitState();
          }
          mountCommerceWorkspace();
          setWorkspaceView("orders");
          var detail = content.querySelector("[data-order-detail]");
          var list = content.querySelector("[data-orders-list]");
          if (detail) detail.classList.remove("is-active");
          if (list) list.classList.add("is-active");
          removeLegacyTabs();
          if (question) streamSkillAnswer(question, "订单查询", ["已为你打开我的订单页面，共查询到 22 笔订单。", "你可以在右侧查看每笔订单的状态、实付款和下单时间；点击“详情”可继续查看订单信息与物流轨迹。"]);
        }

        function clearFreshHomeConversationBeforeOrders() {
          var logicalPath = String(window.__LX_TEMPLATE_PATH || location.pathname || "/").replace(/\/+$/, "") || "/";
          var isFullscreenHome = logicalPath === "/" && (body.classList.contains("assistant-fullscreen") || body.classList.contains("lx-auto-fs"));
          var hasCurrentFullscreenQuery = !!document.querySelector(".lxfd-thread .lxfd-msg-user");
          if (!isFullscreenHome || hasCurrentFullscreenQuery) return;
          if (window.__lxBridge && typeof window.__lxBridge.resetConversationContext === "function") {
            window.__lxBridge.resetConversationContext();
          }
          chat.replaceChildren();
        }

        var orderIconFlowRunning = false;
        async function runOrderIconFlow(question) {
          if (orderIconFlowRunning) return;
          orderIconFlowRunning = true;
          try {
            clearFreshHomeConversationBeforeOrders();
            if (window.__lxBridge && typeof window.__lxBridge.prepareRootSplitState === "function") {
              window.__lxBridge.prepareRootSplitState();
            }
            await streamSkillAnswer(question || "我要查看订单", "订单查询", ["已为你查询到 22 笔订单，包含待付款、待发货和待收货状态。可在右侧筛选订单，并查看商品、金额与物流详情。"], {
              finalHtml: '<p>已为你查询到 <strong>22 笔订单</strong>，包含待付款、待发货和待收货状态。可在右侧筛选订单，并查看商品、金额与<strong>物流详情</strong>。</p>',
              cardHtml: '<button class="answer-cta lx-answer-page" type="button" data-open-orders data-lx-result-id="info:orders" aria-pressed="false"><span class="answer-cta-copy"><span class="answer-cta-title">查看我的订单</span><span class="answer-cta-desc">共 22 笔 · 17 笔进行中</span></span><span class="answer-cta-icon" aria-hidden="true"><img class="lx-approved-icon-img" src="../icons/global-next.svg" alt=""></span></button>',
              disclaimer: "内容由联想乐享基于当前订单数据生成，请在支付或申请售后前核对关键信息。"
            });
            openOrdersFromChat("");
          } finally {
            orderIconFlowRunning = false;
          }
        }

        function infoRows(rows) {
          var visible = rows.filter(function (row) { return row[1] !== undefined && row[1] !== null && row[1] !== ""; });
          return '<div class="lx-detail-kv">' + visible.map(function (row) { return '<div><span>' + escapeHtml(row[0]) + '</span><strong>' + escapeHtml(row[1]) + '</strong></div>'; }).join("") + '</div>';
        }

        function renderTimeline(order) {
          return '<div class="lx-detail-status-grid">' + (order.timeline || []).map(function (node) {
            return '<div class="lx-detail-status-node is-' + escapeHtml(node.state || "upcoming") + '"><strong>' + escapeHtml(node.label) + '</strong><span>' + escapeHtml(node.time || "待完成") + '</span></div>';
          }).join("") + '</div>';
        }

        function renderDetailProducts(order) {
          return '<div class="lx-order-detail-products">' + (order.items || []).map(function (item) {
            var role = item.role && item.role !== "主品" ? '<span class="lx-order-item-role">' + escapeHtml(item.role) + '</span>' : "";
            var mixed = Number(item.beans || 0) > 0 ? " lx-order-mixed-amount" : "";
            return '<section class="lx-order-detail-summary"><span class="lx-order-thumb"><img src="' + escapeHtml(item.image) + '" alt="' + escapeHtml(item.name) + '"></span><div class="lx-order-detail-product">' + role + '<h2>' + escapeHtml(item.name) + '</h2><p>' + escapeHtml(item.description) + '</p><p>数量 ×' + escapeHtml(item.quantity) + '</p></div><strong class="lx-order-detail-price' + mixed + '">' + escapeHtml(formatMixedAmount(item.amount, item.beans)) + '</strong></section>';
          }).join("") + '</div>';
        }

        function renderInvoice(invoice) {
          invoice = invoice || { text: "不开发票" };
          if (invoice.text) return '<p class="lx-detail-note">' + escapeHtml(invoice.text) + '</p>';
          return infoRows([["发票类型", invoice.type], ["发票抬头", invoice.title], ["纳税人识别号", invoice.taxpayerId], ["发票内容", invoice.content]]);
        }

        function renderSpecialSections(order) {
          var html = "";
          if (order.presale) {
            html += '<section class="lx-detail-section"><h3>预售信息</h3><div class="lx-detail-special"><div><span>定金</span><strong>' + escapeHtml(formatCurrency(order.presale.deposit)) + '</strong></div><div><span>尾款</span><strong>' + escapeHtml(typeof order.presale.tailAmount === "number" ? formatCurrency(order.presale.tailAmount) : order.presale.tailAmount) + '</strong></div><div><span>尾款支付时间</span><strong>' + escapeHtml(order.presale.tailPaymentAt) + '</strong></div><div><span>预计交付</span><strong>' + escapeHtml(order.expectedDelivery || "待确认") + '</strong></div></div></section>';
          }
          if (order.recharge) {
            html += '<section class="lx-detail-section"><h3>充值信息</h3>' + infoRows([["充值账号", order.recharge.account], ["卡号", order.recharge.cardNumber], ["卡密", order.recharge.cardSecret || "待发放"]]) + '</section>';
          }
          if (order.pickupCode) {
            html += '<section class="lx-detail-section"><h3>到店自提</h3><div class="lx-detail-special"><div><span>自提码</span><strong>' + escapeHtml(order.pickupCode) + '</strong></div><div><span>取货提示</span><strong>到店后请出示自提码和收货手机号</strong></div></div></section>';
          }
          return html;
        }

        function renderLogistics(order) {
          var shipping = order.shipping || {};
          var packages = shipping.packages || [];
          if (!packages.length) {
            return '<section class="lx-detail-section lx-logistics"><h3>交付说明</h3><p class="lx-detail-note">' + escapeHtml(shipping.notice || "当前订单暂无物流信息") + '</p></section>';
          }
          return packages.map(function (item) {
            var steps = (item.steps || []).slice().reverse();
            return '<section class="lx-detail-section lx-logistics lx-logistics-package"><h3 class="lx-logistics-package-name"><span>' + escapeHtml(item.name) + '</span><small>进度 ' + escapeHtml(item.progress) + '/' + escapeHtml((item.steps || []).length) + '</small></h3><div class="lx-logistics-meta"><div><span>物流公司</span><strong>' + escapeHtml(item.company) + '</strong></div><div><span>物流单号</span><strong>' + escapeHtml(item.number) + ' <button class="lx-logistics-copy" type="button" data-copy-tracking="' + escapeHtml(item.number) + '">复制</button></strong></div><div><span>运输路线</span><strong>' + escapeHtml((item.route || []).join(" → ") || "待更新") + '</strong></div></div>' + steps.map(function (step) { return '<div class="lx-logistics-step is-' + escapeHtml(step.state || "upcoming") + '"><div><strong>' + escapeHtml(step.label) + '</strong><span>' + escapeHtml(step.time || "待更新") + '</span></div></div>'; }).join("") + '</section>';
          }).join("");
        }

        function detailMarkup(order) {
          var recipient = order.recipient || {};
          var store = order.store || {};
          var payment = order.payment || {};
          var shippingLabels = { physical: "快递配送", notice: "服务/虚拟交付", pickup: "到店自提", storeDelivery: "门店闪送" };
          var storeSection = order.store ? '<section class="lx-detail-section"><h3>门店信息</h3>' + infoRows([["交付方式", store.method], ["门店名称", store.name], ["门店电话", store.phone], ["门店地址", store.address], ["营业时间", store.hours]]) + '</section>' : "";
          return '<header class="lx-order-detail-head"><div class="lx-order-detail-title"><div class="lx-order-detail-title-row"><button class="lx-order-back" type="button" data-order-back aria-label="返回订单列表"><img src="../icons/global-next.svg" alt=""></button><h1>订单详情</h1><span class="lx-order-detail-status">' + escapeHtml(order.status) + '</span></div><p>订单编号 ' + escapeHtml(order.id) + ' · ' + escapeHtml(order.typeLabel) + '</p></div></header>' +
            renderDetailProducts(order) +
            '<nav class="lx-detail-tabs" role="tablist" aria-label="订单详情内容切换"><button class="lx-detail-tab is-active" type="button" role="tab" aria-selected="true" data-detail-tab="info">订单信息</button><button class="lx-detail-tab" type="button" role="tab" aria-selected="false" data-detail-tab="logistics">物流信息</button></nav>' +
            '<div class="lx-detail-pane is-active" data-detail-pane="info"><section class="lx-detail-section"><h3>订单状态</h3>' + renderTimeline(order) + '</section>' + renderSpecialSections(order) + '<section class="lx-detail-section"><h3>收货信息</h3>' + infoRows([["收货人", recipient.name], ["联系电话", recipient.phone], ["收货地址", recipient.address || (order.type === "omoPickup" ? "到店自提" : "未填写")]]) + '</section>' + storeSection + '<section class="lx-detail-section"><h3>订单信息</h3>' + infoRows([["订单编号", order.id], ["订单类型", order.typeLabel], ["下单时间", order.createdAt], ["支付时间", order.paidAt || "未支付"], ["支付方式", order.paymentMethod], ["订单状态", order.status], ["配送方式", shippingLabels[order.shipping && order.shipping.mode] || "待确认"], ["预计送达", order.expectedDelivery]]) + '</section><section class="lx-detail-section"><h3>发票信息</h3>' + renderInvoice(order.invoice) + '</section><section class="lx-detail-section"><h3>订单备注</h3><p class="lx-detail-note">' + escapeHtml(order.remark || "无") + '</p></section><section class="lx-detail-section lx-price-panel"><h3>价格明细</h3><div class="lx-price-row"><span>商品金额</span><strong>' + escapeHtml(formatMixedAmount(payment.goods, payment.beans)) + '</strong></div><div class="lx-price-row"><span>运费</span><strong>' + escapeHtml(formatCurrency(payment.freight)) + '</strong></div><div class="lx-price-row"><span>优惠</span><strong>-' + escapeHtml(formatCurrency(payment.discount)) + '</strong></div><div class="lx-price-row"><span>应付金额</span><strong>' + escapeHtml(formatMixedAmount(payment.payable, payment.beans)) + '</strong></div><div class="lx-price-row is-total"><span>实付款</span><strong>' + escapeHtml(formatCurrency(payment.actual)) + '</strong></div></section></div>' +
            '<div class="lx-detail-pane" data-detail-pane="logistics">' + renderLogistics(order) + '</div>';
        }

        function boot() {
          body = document.body;
          content = document.querySelector(".shell > .content");
          chat = document.querySelector(".assistant-panel .chat-state");
          if (!body || !content || !chat) return;

          document.documentElement.classList.remove("lx-route-prepaint", "lx-shop-tabs-prepaint", "lx-root-lxfd-prepaint");
          body.classList.remove("lx-orders-poc");
          body.classList.add("lx-template-file");
          var brandHome = document.querySelector(".brand");
          if (brandHome) brandHome.href = location.pathname + "?v=home-entry-fix2";

          window.lxHandleCommerceQuery = function (query, intent) {
            if (intent === "orders") openOrdersFromChat(query);
          };
          window.lxHandleCommerceEntry = function (entry) {
            if (entry === "orders") openOrdersFromChat("");
          };
          window.__lxOpenOrdersCenter = function (options) {
            var question = options && typeof options.question === "string" ? options.question : "";
            openOrdersFromChat(question);
          };

          var textarea = document.querySelector(".assistant-panel .composer textarea");

          function interceptDirectOrderQuery(event, input) {
            input = input || textarea;
            var query = input && input.value ? input.value.trim() : "";
            if (!isDirectOrderCenterQuery(query)) return false;
            event.preventDefault();
            event.stopPropagation();
            event.stopImmediatePropagation();
            input.value = "";
            input.dispatchEvent(new Event("input", { bubbles: true }));
            runOrderIconFlow(query);
            return true;
          }

          window.addEventListener("click", function (event) {
            var sendButton = event.target.closest(".assistant-panel .send-btn, .assistant-panel [data-send], .assistant-panel button[type='submit'], .lxfd-send");
            var sendInput = sendButton && sendButton.closest("form") ? sendButton.closest("form").querySelector("textarea") : textarea;
            if (sendButton && interceptDirectOrderQuery(event, sendInput)) return;
            var commerceEntry = event.target.closest(".utility-btn[aria-label='订单'], [data-commerce-entry='orders'], [data-lxfd-open='orders']");
            if (!commerceEntry) return;
            event.preventDefault();
            event.stopPropagation();
            event.stopImmediatePropagation();
            runOrderIconFlow();
          }, true);

          window.addEventListener("keydown", function (event) {
            if (event.key !== "Enter" || event.shiftKey || event.isComposing || !event.target.matches(".assistant-panel .composer textarea, .lxfd-composer textarea")) return;
            interceptDirectOrderQuery(event, event.target);
          }, true);

          document.addEventListener("click", function (event) {
            var commerceEntry = event.target.closest("[data-commerce-entry='orders'], [data-lxfd-open='orders']");
            if (commerceEntry) {
              event.preventDefault();
              event.stopImmediatePropagation();
              openOrdersFromChat("");
              return;
            }
            var workspaceTab = event.target.closest("[data-workspace-view]");
            var orderStatus = event.target.closest("[data-order-status]");
            var orderClear = event.target.closest("[data-order-clear]");
            var card = event.target.closest("[data-order-card]");
            var detailButton = event.target.closest("[data-order-detail-id]");
            var back = event.target.closest("[data-order-back]");
            var tab = event.target.closest("[data-detail-tab]");
            var copyTracking = event.target.closest("[data-copy-tracking]");
            var typeTrigger = event.target.closest("[data-order-type-trigger]");
            var typeOption = event.target.closest("[data-order-type-option]");
            if (!event.target.closest("[data-order-type-picker]")) setOrderTypeMenu(false);
            if (commerceMounted && event.target.closest(".brand a, .main-nav [data-page]")) restoreHomeWorkspace();
            if (workspaceTab || orderStatus || orderClear || card || detailButton || back || tab || copyTracking || typeTrigger || typeOption) event.stopPropagation();
            if (typeTrigger) {
              var picker = typeTrigger.closest("[data-order-type-picker]");
              var open = !picker.classList.contains("is-open");
              setOrderTypeMenu(open);
              if (open) picker.querySelector('[data-order-type-option][aria-selected="true"]')?.focus();
              return;
            }
            if (typeOption) {
              orderListState.type = typeOption.dataset.orderTypeOption;
              setOrderTypeMenu(false);
              renderOrderList();
              content.querySelector("[data-order-type-trigger]")?.focus();
              return;
            }
            if (orderStatus) {
              orderListState.status = orderStatus.dataset.orderStatus;
              renderOrderList();
              return;
            }
            if (orderClear) {
              orderListState.query = "";
              orderListState.type = "all";
              orderListState.status = "全部";
              renderOrderList();
              return;
            }
            if (workspaceTab) {
              var targetView = workspaceTab.dataset.workspaceView;
              if (targetView === "home") restoreHomeWorkspace();
              else if (targetView === "orders") openOrdersFromChat("");
              return;
            }
            if (detailButton) {
              var order = orders.find(function (item) { return item.id === detailButton.dataset.orderDetailId; });
              if (!order) return;
              var mainItem = primaryItem(order);
              streamSkillAnswer("查看这笔订单的详细信息", "订单详情查询", ["已查询到“" + mainItem.name + "”的订单详情。", "这是一笔“" + order.typeLabel + "”，当前状态为“" + order.status + "”，下单时间是 " + order.createdAt + "，应付金额 " + orderAmount(order) + "。右侧可查看商品清单、付款信息、交付信息和订单状态轨迹。"]);
              content.querySelector("[data-orders-list]").classList.remove("is-active");
              var detail = content.querySelector("[data-order-detail]");
              detail.innerHTML = detailMarkup(order);
              detail.classList.add("is-active");
              content.scrollTop = 0;
              requestAnimationFrame(function () { content.scrollTop = 0; });
              return;
            }
            if (card) {
              var qaOrder = orders.find(function (item) { return item.id === card.dataset.orderId; });
              if (!qaOrder) return;
              streamSkillAnswer("这笔订单现在是什么状态？", "订单详情查询", ["这笔订单当前状态为“" + qaOrder.status + "”，下单时间是 " + qaOrder.createdAt + "，应付金额 " + orderAmount(qaOrder) + "。", "如需查看商品明细、付款组成或交付轨迹，请点击右侧订单上的“查看详情”按钮。"]);
              return;
            }
            if (back) {
              content.querySelector("[data-order-detail]").classList.remove("is-active");
              content.querySelector("[data-orders-list]").classList.add("is-active");
              content.scrollTop = 0;
              return;
            }
            if (tab) {
              var name = tab.dataset.detailTab;
              content.querySelectorAll("[data-detail-tab]").forEach(function (item) {
                var active = item === tab;
                item.classList.toggle("is-active", active);
                item.setAttribute("aria-selected", String(active));
              });
              content.querySelectorAll("[data-detail-pane]").forEach(function (pane) {
                pane.classList.toggle("is-active", pane.dataset.detailPane === name);
              });
              content.scrollTop = 0;
              return;
            }
            if (copyTracking) {
              navigator.clipboard?.writeText(copyTracking.dataset.copyTracking || "");
              copyTracking.textContent = "已复制";
              setTimeout(function () { copyTracking.textContent = "复制"; }, 1200);
              return;
            }
          }, true);

          content.addEventListener("input", function (event) {
            if (event.target.matches("[data-order-search]")) {
              orderListState.query = event.target.value;
              renderOrderList();
              return;
            }
          });

          content.addEventListener("change", function (event) {
            if (!event.target.matches("[data-order-type]")) return;
            orderListState.type = event.target.value;
            renderOrderList();
          });

          content.addEventListener("keydown", function (event) {
            var trigger = event.target.closest("[data-order-type-trigger]");
            var option = event.target.closest("[data-order-type-option]");
            if (trigger && ["ArrowDown", "ArrowUp", "Enter", " "].includes(event.key)) {
              event.preventDefault();
              setOrderTypeMenu(true);
              var options = Array.from(content.querySelectorAll("[data-order-type-option]"));
              (event.key === "ArrowUp" ? options[options.length - 1] : options.find(function (item) { return item.getAttribute("aria-selected") === "true"; }) || options[0])?.focus();
              return;
            }
            if (!option) return;
            var options = Array.from(content.querySelectorAll("[data-order-type-option]"));
            var index = options.indexOf(option);
            if (event.key === "ArrowDown" || event.key === "ArrowUp") {
              event.preventDefault();
              options[(index + (event.key === "ArrowDown" ? 1 : -1) + options.length) % options.length].focus();
            } else if (event.key === "Escape") {
              event.preventDefault();
              setOrderTypeMenu(false);
              content.querySelector("[data-order-type-trigger]")?.focus();
            } else if (event.key === "Home" || event.key === "End") {
              event.preventDefault();
              options[event.key === "Home" ? 0 : options.length - 1].focus();
            }
          });

          chat.addEventListener("click", function (event) {
            if (!event.target.closest("[data-open-orders]")) return;
            event.stopPropagation();
            openOrdersFromChat("");
          });

          if (window.MutationObserver) {
            assistantQueryObserver = new MutationObserver(function (records) {
              records.forEach(function (record) {
                record.addedNodes.forEach(restoreSharedWorkspaceForQuery);
              });
            });
            assistantQueryObserver.observe(chat, { childList: true, subtree: true });
          }

          document.querySelectorAll("[data-commerce-entry='orders']").forEach(function (button) {
            button.addEventListener("click", function (event) {
              event.preventDefault();
              event.stopImmediatePropagation();
              openOrdersFromChat("");
            }, true);
          });
        }

        if (document.readyState === "loading") {
          document.addEventListener("DOMContentLoaded", boot, { once: true });
        } else {
          boot();
        }
      })();

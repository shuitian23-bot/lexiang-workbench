/* =============================================================
   fullscreen-chat.js — 联想乐享全屏对话态逻辑
   完整移植 app.js 的 SSE / Markdown / 商品卡 / Bug 修复
   ============================================================= */
"use strict";

// ── 站点映射 ──
const API_SITE = { personal: "shop", business: "b", enterprise: "biz", home: "default" };

// ── LX_ACTIONBAR_BY_PAGE（完整移植自 app.js，bug3 修复） ──
const LX_ACTIONBAR_BY_PAGE = {
  home: [
    ["客服", "/assets/icons/shortcut-customer-service.svg"],
    ["我的订单", "/assets/icons/sidebar-points-mall.svg"],
    ["附近门店", "/assets/icons/sidebar-store-delivery.svg"],
    ["会员中心", "/assets/icons/sidebar-member-center.svg"],
    ["以旧换新", "/assets/icons/shortcut-trade-in.svg"],
    ["企业采购", "/assets/icons/sidebar-custom-service.svg"],
  ],
  personal: [
    ["客服", "/assets/icons/shortcut-customer-service.svg"],
    ["教育特惠", "/assets/icons/shortcut-education-subsidy.svg"],
    ["以旧换新", "/assets/icons/shortcut-trade-in.svg"],
    ["乐豆商城", "/assets/icons/sidebar-points-mall.svg"],
    ["0元试用", "/assets/icons/sidebar-free-trial.svg"],
    ["私人订制", "/assets/icons/sidebar-custom-service.svg"],
    ["会员中心", "/assets/icons/sidebar-member-center.svg"],
    ["拉新返利", "/assets/icons/sidebar-referral-rewards.svg"],
    ["门店闪送", "/assets/icons/sidebar-store-delivery.svg"],
  ],
  business: [
    ["客服", "/assets/icons/shortcut-customer-service.svg"],
    ["企业认证", "/assets/icons/sidebar-custom-service.svg"],
    ["批量询价", "/assets/icons/sidebar-points-mall.svg"],
    ["对公开票", "/assets/icons/sidebar-free-trial.svg"],
    ["上门售后", "/assets/icons/shortcut-trade-in.svg"],
    ["会员中心", "/assets/icons/sidebar-member-center.svg"],
  ],
  enterprise: [
    ["客服", "/assets/icons/shortcut-customer-service.svg"],
    ["方案中心", "/assets/icons/sidebar-custom-service.svg"],
    ["信创专区", "/assets/icons/sidebar-free-trial.svg"],
    ["白皮书", "/assets/icons/sidebar-points-mall.svg"],
    ["批量报价", "/assets/icons/shortcut-education-subsidy.svg"],
    ["客户经理", "/assets/icons/sidebar-member-center.svg"],
  ],
  brand: [
    ["客服", "/assets/icons/shortcut-customer-service.svg"],
    ["附近门店", "/assets/icons/sidebar-store-delivery.svg"],
    ["会员中心", "/assets/icons/sidebar-member-center.svg"],
    ["我的订单", "/assets/icons/sidebar-points-mall.svg"],
  ],
};

// ── 页面状态 ──
const state = {
  page: "home",       // 当前站点（由 URL 参数或 localStorage 决定）
  convId: null,       // 会话 ID（done 事件后更新）
  sending: false,     // 是否正在发送
};

// ── 工具函数 ──
const esc = (value) =>
  String(value ?? "").replace(/[&<>"']/g, (ch) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
  }[ch]));

const money = (value) => {
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? `¥ ${n.toLocaleString("zh-CN")}` : "咨询报价";
};

function parseJson(text) {
  try { return JSON.parse(text); } catch { return {}; }
}

// ── bug1：工具调用标记剥离 ──
function stripToolCallTags(text) {
  if (!text) return text;
  // 完整标记整块剥离
  let s = text.replace(/<seed:tool_call>[\s\S]*?<\/seed:tool_call>/g, "");
  // 处理流式场景：标记未闭合时，从 <seed:tool_call 开始到结尾都剥离
  s = s.replace(/<seed:tool_call[\s\S]*$/, "");
  // 剥离 function/parameter 标记（以防万一）
  s = s.replace(/<function[^>]*>[\s\S]*?<\/function>/g, "");
  s = s.replace(/<parameter[^>]*>[\s\S]*?<\/parameter>/g, "");
  return s.trim();
}

// ── bug2：链接转可点 HTML（含 utm 参数） ──
function lxLinkHtml(url, label) {
  const cleanLabel = label && !/^https?:/.test(label) ? label : "";
  // 联想商品链接，拼 utm 参数
  const m = String(url).match(/item\.lenovo\.com\.cn\/product\/(\d+)\.html/);
  if (m) {
    return `<a class="lx-md-link" href="${url}?utm_source=leaibot&utm_medium=lexiang_poc" target="_blank" rel="noopener">${cleanLabel || "查看商品详情"}</a>`;
  }
  // 普通链接，联想 shop 域拼 utm 参数
  const isLenovo = /lenovo\.com\.cn|shop\.lenovo\.com\.cn/.test(String(url));
  const utmUrl = isLenovo
    ? `${url}${url.includes("?") ? "&" : "?"}utm_source=leaibot&utm_medium=lexiang_poc`
    : url;
  return `<a class="lx-md-link" href="${utmUrl}" target="_blank" rel="noopener">${cleanLabel || "打开链接"}</a>`;
}

// ── Markdown 渲染（完整移植自 app.js 第 2352-2394 行，调用前先 strip） ──
function mdLite(text) {
  // 先剥离工具调用标记（bug1）
  const clean = stripToolCallTags(text);
  const src = String(clean || "").replace(/\r/g, "");
  const lines = src.split("\n");
  const out = [];
  let listOpen = false;
  let tableRows = null;

  const inline = (value) => {
    let s = esc(value);
    s = s.replace(/\[([^\]]+)\]\((https?:[^)\s]+)\)/g, (full, label, url) => lxLinkHtml(url, label));
    s = s.replace(/(^|[^"'>=\w])(https?:\/\/[^\s<）)\]」"']+)/g, (full, pre, url) => pre + lxLinkHtml(url, null));
    return s.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>").replace(/`([^`]+)`/g, "<code>$1</code>");
  };

  const flushList = () => {
    if (listOpen) { out.push("</ul>"); listOpen = false; }
  };

  const flushTable = () => {
    if (!tableRows || !tableRows.length) { tableRows = null; return; }
    const head = tableRows[0];
    const body = tableRows.slice(1);
    out.push(
      `<table class="lx-md-table"><thead><tr>${head.map((cell) => `<th>${inline(cell)}</th>`).join("")}</tr></thead><tbody>${body.map((row) => `<tr>${row.map((cell) => `<td>${inline(cell)}</td>`).join("")}</tr>`).join("")}</tbody></table>`
    );
    tableRows = null;
  };

  lines.forEach((line) => {
    const trimmed = line.trim();
    if (/^\|.*\|$/.test(trimmed)) {
      const cells = trimmed.slice(1, -1).split("|").map((cell) => cell.trim());
      if (cells.every((cell) => /^:?-{2,}:?$/.test(cell))) return;
      (tableRows = tableRows || []).push(cells);
      return;
    }
    flushTable();
    if (!trimmed) { flushList(); return; }
    if (/^#{1,4}\s+/.test(trimmed)) {
      flushList();
      out.push(`<h4 class="lx-md-h">${inline(trimmed.replace(/^#{1,4}\s+/, ""))}</h4>`);
      return;
    }
    if (/^[-•]\s+/.test(trimmed) || /^\d+[.、]\s+/.test(trimmed)) {
      if (!listOpen) { out.push('<ul class="lx-md-list">'); listOpen = true; }
      out.push(`<li>${inline(trimmed.replace(/^[-•]\s+/, "").replace(/^\d+[.、]\s+/, ""))}</li>`);
      return;
    }
    flushList();
    out.push(`<p class="lx-md-p">${inline(trimmed)}</p>`);
  });

  flushList();
  flushTable();
  return `<div class="lx-md">${out.join("")}</div>`;
}

// ── bug2：商品卡渲染（含 utm 参数，onclick 直接打开新窗口） ──
function renderProductsInMessage(products) {
  if (!Array.isArray(products) || !products.length) return "";
  return `<div class="lx-p0-products">${products
    .slice(0, 4)
    .map(
      (product) => `
    <button class="lx-p0-product-mini" type="button" onclick="window.open('${esc(product.url || `https://item.lenovo.com.cn/product/${product.sku}.html`)}?utm_source=leaibot&utm_medium=lexiang_poc', '_blank')">
      <img src="${esc(product.image_url || "")}" alt="">
      <span><strong>${esc(product.name || "联想商品")}</strong><span class="price">${money(product.price)}</span></span>
    </button>`
    )
    .join("")}</div>`;
}

// ── 生成中动画 HTML ──
function renderGenerating(label) {
  return `<div class="lx-generating-orb" aria-label="${esc(label || "AI 正在思考")}"><span></span><span></span><span></span></div>`;
}

// ── SSE 读取（直接移植自 app.js 第 2463-2493 行） ──
async function readSse(response, handlers) {
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    let splitIndex;
    while ((splitIndex = buffer.indexOf("\n\n")) >= 0) {
      const raw = buffer.slice(0, splitIndex);
      buffer = buffer.slice(splitIndex + 2);
      const event = parseSseBlock(raw);
      if (event) (handlers[event.type] || handlers.message || (() => {}))(event.data);
    }
  }
}

function parseSseBlock(raw) {
  let type = "message";
  const data = [];
  raw.split(/\r?\n/).forEach((line) => {
    if (line.startsWith("event:")) type = line.slice(6).trim();
    if (line.startsWith("data:")) data.push(line.slice(5).trimStart());
  });
  return data.length ? { type, data: data.join("\n") } : null;
}

// ── DOM 辅助 ──
const $ = (sel, root) => (root || document).querySelector(sel);
const chatList = () => document.getElementById("fs-chat-list");
const chatArea = () => document.getElementById("fs-chat-area");

// ── 添加消息节点 ──
function addMessage(role, text, innerHtml) {
  const welcome = document.getElementById("fs-welcome");
  if (welcome) welcome.classList.add("hidden");

  const msg = document.createElement("div");
  msg.className = `fs-msg ${role}`;

  const bubble = document.createElement("div");
  bubble.className = "fs-msg-bubble";

  if (innerHtml !== undefined) {
    bubble.innerHTML = innerHtml;
  } else {
    bubble.textContent = text;
  }

  msg.appendChild(bubble);
  chatList().appendChild(msg);
  scrollToBottom();
  return msg;
}

function scrollToBottom() {
  const area = chatArea();
  if (area) area.scrollTop = area.scrollHeight;
}

// ── 新建对话 ──
function resetConversation() {
  state.convId = null;
  state.sending = false;
  chatList().innerHTML = "";
  const welcome = document.getElementById("fs-welcome");
  if (welcome) welcome.classList.remove("hidden");
  const textarea = document.getElementById("fs-textarea");
  if (textarea) {
    textarea.value = "";
    textarea.style.height = "";
  }
  updateSendBtn();
}

// ── 发送消息（完整 SSE handler，含 bug1、bug2 修复） ──
async function sendChat(text) {
  const message = (text || document.getElementById("fs-textarea")?.value || "").trim();
  if (!message || state.sending) return;

  const textarea = document.getElementById("fs-textarea");
  if (textarea) {
    textarea.value = "";
    textarea.style.height = "";
  }
  updateSendBtn();

  addMessage("user", message);

  const ai = addMessage("ai loading", "", renderGenerating("正在检索信息..."));
  const aiBubble = ai.querySelector(".fs-msg-bubble");

  state.sending = true;
  updateSendBtn();

  let hasContent = false;

  const revealAi = () => {
    if (hasContent) return;
    ai.className = "fs-msg ai";
    aiBubble.innerHTML = "";
    hasContent = true;
  };

  try {
    const response = await fetch("/api/chat/stream", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        message,
        conv_id: state.convId,
        site_type: API_SITE[state.page] || "default",
      }),
    });

    if (!response.ok || !response.body) throw new Error(`HTTP ${response.status}`);

    await readSse(response, {
      // ── chunk：流式拼接，bug1 剥离 tool_call，用 textContent 防 XSS ──
      chunk: (data) => {
        const payload = parseJson(data);
        const content = payload.text || data || "";
        if (!content) return;
        revealAi();
        if (!ai._textBox || !aiBubble.contains(ai._textBox)) {
          ai._textBox = document.createElement("div");
          ai._textBox.className = "lx-msg-text";
          aiBubble.appendChild(ai._textBox);
          ai._raw = "";
        }
        ai._raw = (ai._raw || "") + content;
        // 流式阶段用 textContent（自动防 XSS），剥离 tool_call 片段
        ai._textBox.textContent = stripToolCallTags(ai._raw);
        scrollToBottom();
      },

      // ── status：状态提示（更新 generating 文案） ──
      status: (data) => {
        if (hasContent) return;
        const payload = parseJson(data);
        const label = payload.label || payload.status || "";
        if (label && !hasContent) {
          aiBubble.innerHTML = renderGenerating(label);
        }
      },

      // ── products/display：商品卡（bug2） ──
      products: (data) => {
        revealAi();
        const payload = parseJson(data);
        const products = payload.products || [];
        if (!products.length) return;
        aiBubble.insertAdjacentHTML("beforeend", renderProductsInMessage(products));
        scrollToBottom();
      },

      display: (data) => {
        revealAi();
        const payload = parseJson(data);
        const products = payload.products || payload.items || [];
        if (!products.length) return;
        aiBubble.insertAdjacentHTML("beforeend", renderProductsInMessage(products));
        scrollToBottom();
      },

      // ── suggestions：建议问题 ──
      suggestions: (data) => {
        if (!hasContent) return;
        const payload = parseJson(data);
        const list = Array.isArray(payload.suggestions) ? payload.suggestions.slice(0, 3) : [];
        if (!list.length) return;
        aiBubble.insertAdjacentHTML(
          "beforeend",
          `<div class="lx-p0-suggest">${list
            .map((sug) => `<button class="lx-p0-suggest-chip" type="button" data-suggest="${esc(sug)}">${esc(sug)}</button>`)
            .join("")}</div>`
        );
        scrollToBottom();
      },

      // ── done：流结束，升级为 markdown + 免责声明 ──
      done: (data) => {
        const payload = parseJson(data);
        if (payload.conv_id || payload.convId) {
          state.convId = payload.conv_id || payload.convId;
        }
        // 升级为 markdown（bug1 在 mdLite 内部再次 strip）
        if (ai._raw && ai._textBox && aiBubble.contains(ai._textBox)) {
          ai._textBox.innerHTML = mdLite(ai._raw);
        }
        // 免责声明
        aiBubble.insertAdjacentHTML(
          "beforeend",
          `<div class="lx-disclaimer">内容由联想乐享基于当前信息生成，请在使用前核对关键信息。</div>`
        );
        scrollToBottom();
      },

      // ── error：服务端错误事件 ──
      error: (data) => {
        revealAi();
        const payload = parseJson(data);
        aiBubble.textContent = payload.message || "AI 服务暂时不可用，请稍后重试。";
        scrollToBottom();
      },
    });

    if (!hasContent) revealAi();
    if (!aiBubble.textContent.trim() && !aiBubble.querySelector(".lx-p0-products")) {
      aiBubble.textContent = "我已收到请求，可以继续补充预算、用途或偏好的机型。";
    }
  } catch (err) {
    ai.className = "fs-msg ai";
    aiBubble.textContent = "当前 AI 服务暂时不可用，请稍后重试。";
    scrollToBottom();
  } finally {
    state.sending = false;
    updateSendBtn();
  }
}

// ── 发送按钮状态 ──
function updateSendBtn() {
  const btn = document.getElementById("fs-send-btn");
  const textarea = document.getElementById("fs-textarea");
  if (!btn || !textarea) return;
  const hasText = textarea.value.trim().length > 0;
  btn.disabled = !hasText || state.sending;
}

// ── bug3：初始化 Actionbar（完整 LX_ACTIONBAR_BY_PAGE 五套站点数据） ──
function initActionbar(page) {
  const bar = document.getElementById("fs-actionbar");
  if (!bar) return;
  const items = LX_ACTIONBAR_BY_PAGE[page] || LX_ACTIONBAR_BY_PAGE.home;
  bar.innerHTML = items
    .map(
      ([label, icon]) =>
        `<button class="fs-actionbar-btn" type="button" data-actionbar-label="${esc(label)}">
          <img src="${esc(icon)}" alt="" />
          ${esc(label)}
        </button>`
    )
    .join("");
}

// ── Actionbar 点击：按 label 派发快捷问 ──
function handleActionbarClick(label) {
  const quickAskMap = {
    客服: "我需要联系人工客服",
    我的订单: "帮我查询我的订单状态",
    附近门店: "帮我查询附近的联想体验店",
    会员中心: "查看我的会员权益和积分",
    以旧换新: "帮我估算以旧换新补贴，并说明流程",
    企业采购: "我要企业批量采购，介绍下企业购的价格和流程",
    教育特惠: "我是学生，有什么教育特惠优惠可以用？",
    乐豆商城: "乐豆商城能兑换什么，帮我推荐",
    "0元试用": "0元试用活动怎么参与？",
    私人订制: "我想私人订制一台联想电脑，先按用途给我配置方案",
    拉新返利: "拉新返利活动怎么参与？",
    门店闪送: "门店闪送怎么用，多久能送到？",
    企业认证: "如何进行企业采购认证？",
    批量询价: "我需要批量采购，怎么询价？",
    对公开票: "企业采购如何开具增值税专用发票？",
    上门售后: "企业设备的上门售后服务怎么约？",
    方案中心: "有哪些适合政企的 IT 解决方案？",
    信创专区: "介绍一下信创产品专区",
    白皮书: "下载联想企业解决方案白皮书",
    批量报价: "我需要批量采购方案报价",
    客户经理: "我想联系专属客户经理",
  };
  const ask = quickAskMap[label] || label;
  sendChat(ask);
}

// ── 调整输入框高度 ──
function autoResizeTextarea(textarea) {
  textarea.style.height = "auto";
  textarea.style.height = Math.min(textarea.scrollHeight, 160) + "px";
}

// ── 调整对话区 bottom padding 适应 composer 高度 ──
function syncChatPadding() {
  const composer = document.getElementById("fs-composer");
  const area = chatArea();
  if (!composer || !area) return;
  area.style.paddingBottom = composer.offsetHeight + 16 + "px";
}

// ── 初始化页面 ──
function initPage() {
  // 站点来源优先级：URL 参数 → localStorage → "home"
  const urlParams = new URLSearchParams(location.search);
  const siteFromUrl = urlParams.get("site");
  const siteFromStorage = (() => {
    try { return localStorage.getItem("lexiang.page") || ""; } catch { return ""; }
  })();
  const validSites = new Set(["personal", "business", "enterprise", "brand", "home"]);
  state.page =
    (validSites.has(siteFromUrl) ? siteFromUrl : null) ||
    (validSites.has(siteFromStorage) ? siteFromStorage : null) ||
    "home";

  // 初始化 actionbar（bug3）
  initActionbar(state.page);

  // 同步 composer 高度 → chat area padding
  syncChatPadding();

  // 返回按钮
  document.getElementById("fs-back-btn").addEventListener("click", () => {
    if (document.referrer && document.referrer !== location.href) {
      history.back();
    } else {
      location.assign("/");
    }
  });

  // 新建对话按钮
  document.getElementById("fs-new-btn").addEventListener("click", () => {
    resetConversation();
  });

  // 发送按钮
  document.getElementById("fs-send-btn").addEventListener("click", () => {
    sendChat();
  });

  // textarea 事件
  const textarea = document.getElementById("fs-textarea");
  textarea.addEventListener("input", () => {
    autoResizeTextarea(textarea);
    updateSendBtn();
    syncChatPadding();
  });

  textarea.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendChat();
    }
  });

  // Actionbar 点击委托
  document.getElementById("fs-actionbar").addEventListener("click", (e) => {
    const btn = e.target.closest(".fs-actionbar-btn");
    if (!btn) return;
    const label = btn.dataset.actionbarLabel;
    if (label) handleActionbarClick(label);
  });

  // 建议问题 chip 点击委托（使用事件冒泡到 chatList）
  document.getElementById("fs-chat-list").addEventListener("click", (e) => {
    const chip = e.target.closest("[data-suggest]");
    if (!chip) return;
    const text = chip.dataset.suggest;
    if (text) sendChat(text);
  });

  // ResizeObserver 同步 padding
  if (window.ResizeObserver) {
    new ResizeObserver(syncChatPadding).observe(document.getElementById("fs-composer"));
  }
  window.addEventListener("resize", syncChatPadding);
}

// ── DOM Ready ──
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initPage);
} else {
  initPage();
}

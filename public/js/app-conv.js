// ── 乐享对话持久化模块（app.js 拆分第三步）──────────────────────────────────
// 保存/恢复主面板对话到 localStorage（lexiang.conversation.v1），供刷新与切站恢复。
// 该域闭包依赖重（state/ensureChat/addMessage/mdLite），采用工厂注入：
//   app.js 里 `window.__lxConvFactory({...deps})` 拿到 {save, saveNow, restore}。
// 加载顺序：必须在 app.js 之前（app.js 初始化时调工厂）。
// 注意：首页 lxfd 的 lxfdSyncToMainConvKey（app-lxfd.js）也直写同一 key，格式须保持一致。
(function (root) {
  "use strict";
  const LX_CONV_KEY = "lexiang.conversation.v1";

  function createConv(deps) {
    const getState = deps.getState;         // () => state（convId 读写）
    const ensureChat = deps.ensureChat;     // () => .lx-p0-messages 容器
    const addMessage = deps.addMessage;     // (role, text) 渲染用户气泡
    const lxEnsureAiBody = deps.lxEnsureAiBody;
    const mdLite = deps.mdLite;
    let saveTimer = null;

    // 立即写（不防抖）——桥接退全屏后可能马上切站，防抖 timer 会被页面卸载吞掉
    function doSave() {
      try {
        const listEl = document.querySelector(".chat-state .lx-p0-messages");
        if (!listEl) return;
        const messages = [];
        listEl.querySelectorAll(":scope > .lx-p0-message").forEach(function (el) {
          const isUser = el.classList.contains("user");
          // AI 消息：class 可能是 "ai" 或 "assistant"（下单成功等系统消息用 assistant），都算 AI
          const isAi = el.classList.contains("ai") || el.classList.contains("assistant");
          if (!isUser && !isAi) return;
          if (el._lxTransient || el.dataset.lxTransient === "1" || (el.querySelector(".lx-op-steps") && !el.querySelector(".lx-agent-chain-head"))) return; // 跳过临时进度卡,但agent多步卡(.lx-agent-chain-head)要存为执行记录
          // 跳过未完成的 loading 态 AI 消息，否则刷新后会卡在「生成中…」
          if (isAi && (el.classList.contains("loading") || el.querySelector(".lx-generating, .loading-line, .typing-text"))) return;
          let html = isAi ? (el.querySelector(".ai-body")?.innerHTML || "") : "";
          const text = isUser ? (el.querySelector(".user-bubble")?.textContent || "").trim() : (el._raw || el.querySelector(".ai-body")?.textContent || "").trim();
          // 双保险：html 残留 loading 标记则丢弃，恢复时用 mdLite 重渲染
          if (isAi && /正在生成中|lx-generating|loading-line|typing-text|typing-cursor/.test(html)) html = "";
          if (!text && !html) return;
          messages.push({ role: isUser ? "user" : "ai", text, html });
        });
        // 去掉末尾孤立用户提问（AI 没答完就存）——否则刷新后只剩一条没回答的提问
        while (messages.length && messages[messages.length - 1].role === "user") messages.pop();
        if (!messages.length) return;
        localStorage.setItem(LX_CONV_KEY, JSON.stringify({
          convId: getState().convId || null,
          messages: messages.slice(-50),
          ts: Date.now()
        }));
      } catch (_e) { /* localStorage 写满等，静默 */ }
    }

    function save() {
      clearTimeout(saveTimer);
      saveTimer = setTimeout(doSave, 400);
    }

    function saveNow() { clearTimeout(saveTimer); doSave(); }

    function restore() {
      try {
        const raw = localStorage.getItem(LX_CONV_KEY);
        if (!raw) return;
        const data = JSON.parse(raw);
        if (!data || !Array.isArray(data.messages) || !data.messages.length) return;
        if (data.ts && Date.now() - data.ts > 7 * 24 * 3600 * 1000) { localStorage.removeItem(LX_CONV_KEY); return; }
        const _msgs = data.messages.slice();
        while (_msgs.length && _msgs[_msgs.length - 1].role === "user") _msgs.pop();
        if (!_msgs.length) { localStorage.removeItem(LX_CONV_KEY); return; }
        getState().convId = data.convId || getState().convId;
        const list = ensureChat();
        if (!list) return;
        list.innerHTML = "";
        // 顶部插「历史对话」分隔条，让用户明确这是上次的记录（而非当前出错）
        const _histDivider = document.createElement("div");
        _histDivider.className = "lx-conv-hist-divider";
        _histDivider.innerHTML = "<span>以上为历史对话</span>";
        _msgs.forEach(function (m) {
          if (m.role === "user") {
            addMessage("user", m.text || "");
          } else {
            // 注意：不含 lx-op-steps——那是 agent 多步链卡（.lx-agent-chain-head 同框）合法内容，
            // 会被 doSave 正常存档；这里若也判它「坏」会在恢复时被 mdLite(text) 拍平丢光结构。
            // 真正的临时进度卡（无 .lx-agent-chain-head）doSave 阶段就被过滤，根本不会存进来。
            const _badHtml = /正在生成中|正在处理|lx-generating|loading-line|typing-cursor|typing-text/.test(m.html || "");
            if (_badHtml && !m.text) return; // 坏 html 且无正文整条跳过
            if (!m.text && !m.html) return;
            const node = document.createElement("div");
            node.className = "lx-p0-message msg ai lx-chat-skin";
            node._raw = m.text || "";
            const body = lxEnsureAiBody(node);
            body.innerHTML = (_badHtml || !m.html) ? mdLite(m.text || "") : m.html;
            list.appendChild(node);
          }
        });
        if (list.children.length) list.appendChild(_histDivider); // 历史末尾加分隔，往下是新对话
        list.scrollTop = list.scrollHeight;
      } catch (_e) { /* 恢复失败静默，不影响首屏 */ }
    }

    return { save: save, saveNow: saveNow, restore: restore };
  }

  if (typeof module !== "undefined" && module.exports) module.exports = { createConv: createConv, LX_CONV_KEY: LX_CONV_KEY };
  if (root) root.__lxConvFactory = createConv;
})(typeof window !== "undefined" ? window : null);

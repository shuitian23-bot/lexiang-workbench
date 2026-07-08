// ── 乐享语音控制（说话即操作）─────────────────────────────────────────────
// 「说去哪就去哪」的语音入口：点麦克风说一句，识别成文字后自动提交，走既有意图
// 管线（本地 matchControl 秒执行 / 后端小模型），对老人和不熟电商结构的人尤其友好。
//
// 零侵入设计：本文件自注入麦克风按钮到两套 composer（主面板 .composer / 全屏 .lxfd-composer），
// 通过「填输入框 + 触发表单提交」接入——不碰 app.js/app-lxfd.js/main.css 任何一行。
// 删除整个功能 = 删这一个文件 + index.html 里那行 script。
//
// ── 可插拔识别层 ──────────────────────────────────────────────────────────
// window.__lxASR = { engine, supported, active, start(onInterim,onFinal,onError,onEnd), stop() }
// 默认实现是浏览器原生 Web Speech（Chrome/Edge，零凭据零后端零费用，中文 zh-CN）。
// 将来换火山 ASR：只替换 createWebSpeechASR() → createVolcASR()（录音 → 后端 /api/asr 代理 →
// 火山流式识别），UI 注入与自动提交逻辑一律不动。识别率是升级项，闭环体验今天就成立。
(function (root) {
  "use strict";
  if (!root || root.__lxVoiceInstalled) return;
  root.__lxVoiceInstalled = true;

  const SR = root.SpeechRecognition || root.webkitSpeechRecognition;
  const supported = !!SR && (location.protocol === "https:" || location.hostname === "localhost");

  function createWebSpeechASR() {
    let rec = null;
    let active = false;
    return {
      engine: "webspeech",
      supported,
      get active() { return active; },
      start(onInterim, onFinal, onError, onEnd) {
        if (!supported) { onError && onError("unsupported"); return; }
        if (active) return;
        try {
          rec = new SR();
          rec.lang = "zh-CN";
          rec.continuous = false;      // 说一句就停，避免连续误触
          rec.interimResults = true;   // 边说边出字，实时进输入框
          rec.maxAlternatives = 1;
          let finalText = "";
          rec.onresult = (e) => {
            let interim = "";
            for (let i = e.resultIndex; i < e.results.length; i++) {
              const t = e.results[i][0].transcript;
              if (e.results[i].isFinal) finalText += t; else interim += t;
            }
            onInterim && onInterim((finalText + interim).trim());
          };
          rec.onerror = (e) => { active = false; onError && onError((e && e.error) || "error"); };
          rec.onend = () => {
            active = false;
            const t = finalText.trim();
            if (t) onFinal && onFinal(t);
            onEnd && onEnd(t);
          };
          rec.start();
          active = true;
        } catch (err) { active = false; onError && onError((err && err.message) || "start_failed"); }
      },
      stop() { if (rec && active) { try { rec.stop(); } catch (_e) {} } },
      abort() { if (rec) { try { rec.abort(); } catch (_e) {} active = false; } },
    };
  }

  const asr = createWebSpeechASR();
  root.__lxASR = asr;

  // ── 注入按钮样式（自包含，不碰 main.css）──────────────────────────────
  const STYLE = `
    .lx-voice-btn{display:inline-flex;align-items:center;justify-content:center;width:34px;height:34px;
      padding:0;border:none;border-radius:50%;background:transparent;color:#6b6577;cursor:pointer;
      flex:0 0 auto;transition:background .16s ease,color .16s ease,transform .12s ease;position:relative}
    .lx-voice-btn:hover{background:rgba(120,60,110,.08);color:#4e1646}
    .lx-voice-btn:active{transform:scale(.94)}
    .lx-voice-btn svg{width:19px;height:19px;display:block}
    .lx-voice-btn.unsupported{opacity:.45}
    .lx-voice-btn.recording{color:#fff;background:#e2231a;box-shadow:0 0 0 0 rgba(226,35,26,.5);
      animation:lxVoicePulse 1.25s ease-out infinite}
    @keyframes lxVoicePulse{0%{box-shadow:0 0 0 0 rgba(226,35,26,.5)}
      70%{box-shadow:0 0 0 9px rgba(226,35,26,0)}100%{box-shadow:0 0 0 0 rgba(226,35,26,0)}}
    .lx-voice-tip{position:fixed;z-index:99999;max-width:260px;padding:9px 13px;border-radius:10px;
      background:#2a2130;color:#fff;font-size:13px;line-height:1.5;box-shadow:0 6px 20px rgba(0,0,0,.22);
      pointer-events:none;opacity:0;transform:translateY(4px);transition:opacity .18s ease,transform .18s ease}
    .lx-voice-tip.show{opacity:1;transform:translateY(0)}
    @media (prefers-reduced-motion: reduce){.lx-voice-btn.recording{animation:none}}`;
  const styleEl = document.createElement("style");
  styleEl.textContent = STYLE;
  (document.head || document.documentElement).appendChild(styleEl);

  const MIC_SVG = '<svg viewBox="0 0 24 24" fill="none" aria-hidden="true">' +
    '<path d="M12 15.5a3.5 3.5 0 0 0 3.5-3.5V6a3.5 3.5 0 0 0-7 0v6a3.5 3.5 0 0 0 3.5 3.5Z" stroke="currentColor" stroke-width="1.7"/>' +
    '<path d="M18.5 11.5a6.5 6.5 0 0 1-13 0M12 18.5V21.5M8.5 21.5h7" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"/></svg>';

  // 提示气泡（自包含，不依赖 app.js 的 toast）
  let tipEl = null, tipTimer = null;
  function showTip(anchor, msg) {
    if (!tipEl) { tipEl = document.createElement("div"); tipEl.className = "lx-voice-tip"; document.body.appendChild(tipEl); }
    tipEl.textContent = msg;
    const r = anchor.getBoundingClientRect();
    tipEl.style.left = Math.max(8, Math.min(r.left + r.width / 2 - 130, window.innerWidth - 268)) + "px";
    tipEl.style.top = Math.max(8, r.top - 8 - 54) + "px";
    requestAnimationFrame(() => tipEl.classList.add("show"));
    clearTimeout(tipTimer);
    tipTimer = setTimeout(() => tipEl && tipEl.classList.remove("show"), 3200);
  }

  function errMsg(code) {
    if (code === "not-allowed" || code === "service-not-allowed") return "麦克风被拒绝，请在地址栏左侧允许麦克风权限后重试。";
    if (code === "audio-capture") return "没检测到麦克风，请检查设备后重试。";
    if (code === "network") return "语音服务网络异常，请稍后再试。";
    if (code === "unsupported") return "当前浏览器不支持语音，请用 Chrome 或 Edge 打开。";
    return "";
  }

  // ── 录音交互：toggle 录音，interim 实时进输入框，final 自动提交 ──────────
  let activeBtn = null;
  function clearRecordingUI() {
    document.querySelectorAll(".lx-voice-btn.recording").forEach((b) => {
      b.classList.remove("recording");
      if (b.__ta && b.__phOrig != null) b.__ta.placeholder = b.__phOrig;
    });
    activeBtn = null;
  }

  function toggleRecord(btn, ta, form) {
    if (asr.active) { asr.stop(); return; }          // 再点一次 = 停止
    if (!supported) { showTip(btn, errMsg("unsupported")); return; }
    activeBtn = btn;
    btn.__ta = ta;
    btn.__phOrig = ta.placeholder;
    btn.classList.add("recording");
    ta.placeholder = "🎤 请说话…（说完自动执行）";
    try { ta.focus(); } catch (_e) {}
    asr.start(
      (interim) => {                                  // 实时中间结果
        ta.value = interim;
        ta.dispatchEvent(new Event("input", { bubbles: true }));
      },
      (finalText) => {                                // 最终结果 → 自动提交
        ta.value = finalText;
        ta.dispatchEvent(new Event("input", { bubbles: true }));
        // 说去哪就去哪：说完直接走既有发送链，不用再点发送键
        try {
          if (form && typeof form.requestSubmit === "function") form.requestSubmit();
          else if (form) form.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));
        } catch (_e) {}
      },
      (err) => { clearRecordingUI(); if (err !== "no-speech" && err !== "aborted") { const m = errMsg(err); if (m) showTip(btn, m); } },
      () => { clearRecordingUI(); }
    );
  }

  // ── 注入按钮到两套 composer ───────────────────────────────────────────
  const TARGETS = [
    { form: ".composer",       ta: "textarea", slot: ".send-group",      before: ".image-btn" },
    { form: ".lxfd-composer",  ta: "#lxfdTa",  slot: ".lxfd-comp-right", before: ".lxfd-img-btn" },
  ];
  function injectButtons() {
    TARGETS.forEach((t) => {
      document.querySelectorAll(t.form).forEach((form) => {
        const slot = form.querySelector(t.slot);
        if (!slot || slot.querySelector(".lx-voice-btn")) return;
        const ta = form.querySelector(t.ta);
        if (!ta) return;
        const btn = document.createElement("button");
        btn.type = "button";
        btn.className = "lx-voice-btn" + (supported ? "" : " unsupported");
        btn.setAttribute("aria-label", "语音输入");
        btn.title = supported ? "点击说话，说完自动执行" : "当前浏览器不支持语音（请用 Chrome/Edge）";
        btn.innerHTML = MIC_SVG;
        const ref = slot.querySelector(t.before);
        if (ref) slot.insertBefore(btn, ref); else slot.appendChild(btn);
        btn.addEventListener("click", (e) => { e.preventDefault(); e.stopPropagation(); toggleRecord(btn, ta, form); });
      });
    });
  }

  // composer 是静态 DOM，就绪即注入；三次延迟重试兜底任何异步渲染（不长挂 observer）
  function boot() { injectButtons(); [200, 800, 2000].forEach((d) => setTimeout(injectButtons, d)); }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();
  // 全屏/分屏切换会重挂 composer，点击兜底再注入一次
  document.addEventListener("click", injectButtons, true);

  // 测试钩子：headless 无麦克风，供烟测直接喂一句话验证「文字→提交→意图执行」闭环
  root.__lxVoiceTestFeed = function (text, formSel) {
    const form = document.querySelector(formSel || ".composer");
    if (!form) return false;
    const ta = form.querySelector("textarea");
    if (!ta) return false;
    ta.value = text;
    ta.dispatchEvent(new Event("input", { bubbles: true }));
    if (typeof form.requestSubmit === "function") form.requestSubmit();
    else form.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));
    return true;
  };
})(typeof window !== "undefined" ? window : null);

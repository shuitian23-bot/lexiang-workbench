// ── 乐享语音控制（说话即操作）─────────────────────────────────────────────
// 「说去哪就去哪」的语音入口：点麦克风说一句，识别成文字后自动提交，走既有意图
// 管线（本地 matchControl 秒执行 / 后端小模型），对老人和不熟电商结构的人尤其友好。
//
// 零侵入设计：本文件自注入麦克风按钮到两套 composer（主面板 .composer / 全屏 .lxfd-composer），
// 通过「填输入框 + 触发表单提交」接入——不碰 app.js/app-lxfd.js/main.css 任何一行。
// 删除整个功能 = 删这一个文件 + index.html 里那行 script。
//
// ── 可插拔识别层 ──────────────────────────────────────────────────────────
// window.__lxASR = { engine, supported, active, start(onState,onFinal,onError,onEnd), stop() }
// 实现：录音（Web Audio 采 PCM）→ 说完静音自动停 → POST /api/asr → 火山豆包流式识别 2.0
// → 返回文字。Access Token 只在后端，前端零凭据。不依赖 webkitSpeechRecognition，任何支持
// getUserMedia 的浏览器（Chrome/Edge/Firefox/Safari）都能用。换别家识别只改后端 /api/asr。
(function (root) {
  "use strict";
  if (!root || root.__lxVoiceInstalled) return;
  root.__lxVoiceInstalled = true;

  // ── 流式录音识别层（火山，边说边出字）──────────────────────────────────
  // 实时把 PCM 帧经 WebSocket 推到后端 /api/asr-stream → 转发火山 → 中间结果实时回流。
  function createVolcStreamASR() {
    const AC = root.AudioContext || root.webkitAudioContext;
    const supported = !!(root.navigator && navigator.mediaDevices && navigator.mediaDevices.getUserMedia && AC &&
      (location.protocol === "https:" || location.hostname === "localhost"));
    let stream = null, ctx = null, source = null, proc = null, ws = null;
    let recording = false, srcRate = 48000, hadSpeech = false, silenceAt = 0, maxTimer = null;
    let cb = {}, lastText = "";

    // 优先电脑内置麦克风，避开 iPhone「连续互通」（已授权后 label 可见才能挑，ideal 软约束）
    async function preferredAudioConstraint() {
      const base = { channelCount: 1, echoCancellation: true, noiseSuppression: true, autoGainControl: true };
      try {
        const devs = await navigator.mediaDevices.enumerateDevices();
        const ins = devs.filter((d) => d.kind === "audioinput" && d.deviceId && d.deviceId !== "default" && d.deviceId !== "communications");
        const bad = (l) => /iphone|ipad|continu|连续互通|手机/i.test(l || "");
        const good = ins.find((d) => /built.?in|macbook|内置|internal|microphone array|imac|mac mini|mac studio/i.test(d.label) && !bad(d.label))
                  || ins.find((d) => d.label && !bad(d.label));
        if (good) { base.deviceId = { ideal: good.deviceId }; }
      } catch (_e) {}
      return base;
    }
    function downsampleInt16(f32, from) {
      const to = 16000;
      if (to >= from) {
        const o = new Int16Array(f32.length);
        for (let i = 0; i < f32.length; i++) { const s = Math.max(-1, Math.min(1, f32[i])); o[i] = s < 0 ? s * 0x8000 : s * 0x7fff; }
        return o;
      }
      const ratio = from / to, outLen = Math.floor(f32.length / ratio), o = new Int16Array(outLen);
      for (let i = 0; i < outLen; i++) { const s = Math.max(-1, Math.min(1, f32[Math.floor(i * ratio)] || 0)); o[i] = s < 0 ? s * 0x8000 : s * 0x7fff; }
      return o;
    }
    function stopAudio() {
      try { proc && (proc.onaudioprocess = null, proc.disconnect()); } catch (_e) {}
      try { source && source.disconnect(); } catch (_e) {}
      try { stream && stream.getTracks().forEach((t) => t.stop()); } catch (_e) {}
      try { ctx && ctx.close(); } catch (_e) {}
      proc = source = ctx = stream = null;
    }
    function stopRec() {                                   // 说完/超时：停采集，发 END，等火山 final
      if (!recording) return;
      recording = false;
      if (maxTimer) { clearTimeout(maxTimer); maxTimer = null; }
      stopAudio();
      try { if (ws && ws.readyState === 1) ws.send("END"); } catch (_e) {}
      cb.onState && cb.onState("识别中…");
    }
    function finishFinal(text) {
      const t = (text || "").trim().replace(/[。，、\s]+$/, "");
      if (t) cb.onFinal && cb.onFinal(t);
      cb.onEnd && cb.onEnd(t);
      try { ws && ws.close(); } catch (_e) {} ws = null;
    }

    return {
      engine: "volc-stream",
      supported,
      get active() { return recording; },
      async start(onState, onFinal, onError, onEnd) {
        cb = { onState, onFinal, onError, onEnd };
        if (!supported) { onError && onError("unsupported"); return; }
        if (recording) return;
        let audioC;
        try { audioC = await preferredAudioConstraint(); } catch (_e) { audioC = { channelCount: 1, echoCancellation: true, noiseSuppression: true, autoGainControl: true }; }
        try { stream = await navigator.mediaDevices.getUserMedia({ audio: audioC }); }
        catch (e) { const n = e && e.name; onError && onError(n === "NotAllowedError" || n === "SecurityError" ? "not-allowed" : n === "NotFoundError" ? "audio-capture" : "mic-fail"); return; }
        // 连后端流式 WS（Access Token 只在后端）
        lastText = "";
        const wsProto = location.protocol === "https:" ? "wss" : "ws";
        try { ws = new WebSocket(wsProto + "://" + location.host + "/api/asr-stream"); }
        catch (_e) { onError && onError("network"); stopAudio(); return; }
        ws.binaryType = "arraybuffer";
        ws.onmessage = (ev) => {
          let d; try { d = JSON.parse(ev.data); } catch (_e) { return; }
          if (d.error) return;                            // 中间错误忽略，等 final/close
          if (typeof d.text === "string" && d.text) { lastText = d.text; if (!d.final) cb.onState && cb.onState("interim:" + d.text); }
          if (d.final) { recording = false; if (maxTimer) { clearTimeout(maxTimer); maxTimer = null; } stopAudio(); finishFinal(lastText); }
        };
        ws.onerror = () => { if (recording) { recording = false; stopAudio(); cb.onError && cb.onError("network"); cb.onEnd && cb.onEnd(""); } };
        ctx = new AC(); srcRate = ctx.sampleRate || 48000;
        source = ctx.createMediaStreamSource(stream);
        proc = ctx.createScriptProcessor(4096, 1, 1);
        recording = true; hadSpeech = false; silenceAt = 0;
        proc.onaudioprocess = (e) => {
          if (!recording) return;
          const d = e.inputBuffer.getChannelData(0);
          if (ws && ws.readyState === 1) { const pcm = downsampleInt16(d, srcRate); ws.send(pcm.buffer); }  // 实时推 PCM 帧
          let sum = 0; for (let i = 0; i < d.length; i++) sum += d[i] * d[i];
          const rms = Math.sqrt(sum / d.length), now = ctx.currentTime;
          if (rms > 0.014) { hadSpeech = true; silenceAt = 0; }
          else if (hadSpeech) { if (!silenceAt) silenceAt = now; else if (now - silenceAt > 0.7) stopRec(); }  // 说完静音0.7s收尾
        };
        source.connect(proc); proc.connect(ctx.destination);
        cb.onState && cb.onState("recording");
        maxTimer = setTimeout(stopRec, 15000);            // 最长15s兜底
      },
      stop() { stopRec(); },
      abort() { recording = false; stopAudio(); try { ws && ws.close(); } catch (_e) {} ws = null; },
    };
  }

  const asr = createVolcStreamASR();
  root.__lxASR = asr;

  // ── 按钮样式（自包含，不碰 main.css）──────────────────────────────────
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
    .lx-voice-btn.thinking{color:#fff;background:#8a5cf6}
    @keyframes lxVoicePulse{0%{box-shadow:0 0 0 0 rgba(226,35,26,.5)}
      70%{box-shadow:0 0 0 9px rgba(226,35,26,0)}100%{box-shadow:0 0 0 0 rgba(226,35,26,0)}}
    .lx-voice-tip{position:fixed;z-index:99999;max-width:260px;padding:9px 13px;border-radius:10px;
      background:#2a2130;color:#fff;font-size:13px;line-height:1.5;box-shadow:0 6px 20px rgba(0,0,0,.22);
      pointer-events:none;opacity:0;transform:translateY(4px);transition:opacity .18s ease,transform .18s ease}
    .lx-voice-tip.show{opacity:1;transform:translateY(0)}
    .lx-voice-confirm{position:fixed;z-index:99999;display:flex;align-items:center;gap:10px;flex-wrap:wrap;
      padding:10px 14px;border-radius:13px;background:#fff;border:1px solid #ead9e8;
      box-shadow:0 10px 30px rgba(78,22,70,.18);font-size:13.5px;color:#2a2130;max-width:min(94vw,560px);
      opacity:0;transform:translateY(6px);transition:opacity .18s ease,transform .18s ease}
    .lx-voice-confirm.show{opacity:1;transform:translateY(0)}
    .lx-voice-confirm .lx-vc-text{color:#4e1646}
    .lx-voice-confirm .lx-vc-text b{color:#111;font-weight:600}
    .lx-voice-confirm .lx-vc-tip{color:#9a8fa6;white-space:nowrap;margin-left:auto}
    .lx-voice-confirm .lx-vc-count{display:inline-block;min-width:15px;text-align:center;font-weight:700;color:#e2231a}
    .lx-voice-confirm button{border:none;border-radius:9px;padding:6px 13px;font-size:13px;cursor:pointer;font-family:inherit;transition:filter .12s ease}
    .lx-voice-confirm button:hover{filter:brightness(.94)}
    .lx-voice-confirm .lx-vc-send{background:#4e1646;color:#fff}
    .lx-voice-confirm .lx-vc-cancel{background:#f1edf5;color:#5a5266}
    @media (prefers-reduced-motion: reduce){.lx-voice-btn.recording{animation:none}}`;
  const styleEl = document.createElement("style");
  styleEl.textContent = STYLE;
  (document.head || document.documentElement).appendChild(styleEl);

  const MIC_SVG = '<svg viewBox="0 0 24 24" fill="none" aria-hidden="true">' +
    '<path d="M12 15.5a3.5 3.5 0 0 0 3.5-3.5V6a3.5 3.5 0 0 0-7 0v6a3.5 3.5 0 0 0 3.5 3.5Z" stroke="currentColor" stroke-width="1.7"/>' +
    '<path d="M18.5 11.5a6.5 6.5 0 0 1-13 0M12 18.5V21.5M8.5 21.5h7" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"/></svg>';

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
    if (code === "not-allowed") return "麦克风被拒绝，请在地址栏左侧允许麦克风权限后重试。";
    if (code === "audio-capture" || code === "mic-fail") return "没检测到麦克风，请检查设备（Mac 注意别选成了 iPhone 麦克风）。";
    if (code === "network") return "识别服务连接异常，请稍后再试。";
    if (code === "unsupported") return "当前环境不支持录音（需 HTTPS + 允许麦克风）。";
    return "";
  }

  function submitForm(form) {
    try {
      if (form && typeof form.requestSubmit === "function") form.requestSubmit();
      else if (form) form.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));
    } catch (_e) {}
  }

  // ── 识别确认条：识别完先填输入框 + 弹条给用户看清，倒计时后自动发；期间可立即发/取消/改 ──
  const CONFIRM_SECS = 4;
  let confirmEl = null, confirmTimer = null, confirmEditH = null, confirmTa = null;
  function killConfirm() {
    if (confirmTimer) { clearInterval(confirmTimer); confirmTimer = null; }
    if (confirmTa && confirmEditH) { confirmTa.removeEventListener("input", confirmEditH); confirmTa.removeEventListener("keydown", confirmEditH); }
    confirmEditH = null; confirmTa = null;
    if (confirmEl) { const e = confirmEl; confirmEl = null; e.classList.remove("show"); setTimeout(() => { try { e.remove(); } catch (_e) {} }, 200); }
  }
  function showConfirm(anchor, ta, form, text) {
    killConfirm();
    const bar = document.createElement("div");
    bar.className = "lx-voice-confirm";
    bar.innerHTML = '<span class="lx-vc-text">识别：<b></b></span>' +
      '<button type="button" class="lx-vc-send">立即发送</button>' +
      '<button type="button" class="lx-vc-cancel">取消/改</button>' +
      '<span class="lx-vc-tip"><span class="lx-vc-count"></span> 秒后自动发送</span>';
    bar.querySelector(".lx-vc-text b").textContent = "「" + text + "」";
    document.body.appendChild(bar);
    confirmEl = bar; confirmTa = ta;
    // 定位在 composer 上方居中
    const r = (anchor || ta).getBoundingClientRect();
    bar.style.left = Math.max(8, Math.min(r.left + r.width / 2 - bar.offsetWidth / 2, window.innerWidth - bar.offsetWidth - 8)) + "px";
    bar.style.top = Math.max(8, r.top - bar.offsetHeight - 12) + "px";
    requestAnimationFrame(() => bar.classList.add("show"));
    let left = CONFIRM_SECS;
    const countEl = bar.querySelector(".lx-vc-count");
    countEl.textContent = left;
    const send = () => { killConfirm(); submitForm(form); };
    const cancel = () => { killConfirm(); try { ta.focus(); } catch (_e) {} };
    confirmTimer = setInterval(() => { left -= 1; countEl.textContent = left; if (left <= 0) send(); }, 1000);
    bar.querySelector(".lx-vc-send").addEventListener("click", send);
    bar.querySelector(".lx-vc-cancel").addEventListener("click", cancel);
    // 用户在输入框里改字/敲键 → 取消自动发送，交给用户手动发
    confirmEditH = () => { killConfirm(); };
    ta.addEventListener("input", confirmEditH);
    ta.addEventListener("keydown", confirmEditH);
  }

  // ── 录音交互：toggle 录音，说完自动识别并提交 ──────────────────────────
  function clearUI() {
    document.querySelectorAll(".lx-voice-btn.recording,.lx-voice-btn.thinking").forEach((b) => {
      b.classList.remove("recording", "thinking");
      if (b.__ta && b.__phOrig != null) { b.__ta.placeholder = b.__phOrig; b.__phOrig = null; }
    });
  }
  function toggleRecord(btn, ta, form) {
    if (asr.active) { asr.stop(); return; }            // 录音中再点 = 停止并识别
    if (!asr.supported) { showTip(btn, errMsg("unsupported")); return; }
    killConfirm();                                     // 重新录音，清掉上一次没发的确认条
    btn.__ta = ta;
    if (btn.__phOrig == null) btn.__phOrig = ta.placeholder;
    asr.start(
      (state) => {                                      // 状态：recording / interim:实时文字 / 识别中…
        if (state === "recording") { btn.classList.remove("thinking"); btn.classList.add("recording"); ta.placeholder = "🎤 请说话…"; }
        else if (state.indexOf("interim:") === 0) {     // 边说边出字：实时把识别文本填进输入框
          ta.value = state.slice(8);
          ta.dispatchEvent(new Event("input", { bubbles: true }));
        }
        else { btn.classList.remove("recording"); btn.classList.add("thinking"); ta.placeholder = "识别中…"; }
      },
      (text) => {                                       // 识别结果 → 填框 + 确认条（不立即发，给用户看清）
        clearUI();
        ta.value = text;
        ta.dispatchEvent(new Event("input", { bubbles: true }));  // 先触发（确认条此刻还没挂监听）
        showConfirm(form, ta, form, text);
      },
      (err) => { clearUI(); const m = errMsg(err); if (m) showTip(btn, m); },
      (text) => { clearUI(); if (!text) showTip(btn, "没听清，请靠近麦克风再说一次。"); }
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
        btn.className = "lx-voice-btn" + (asr.supported ? "" : " unsupported");
        btn.setAttribute("aria-label", "语音输入");
        btn.title = asr.supported ? "点击说话，说完自动执行" : "当前环境不支持录音";
        btn.innerHTML = MIC_SVG;
        const ref = slot.querySelector(t.before);
        if (ref) slot.insertBefore(btn, ref); else slot.appendChild(btn);
        btn.addEventListener("click", (e) => { e.preventDefault(); e.stopPropagation(); toggleRecord(btn, ta, form); });
      });
    });
  }
  function boot() { injectButtons(); [200, 800, 2000].forEach((d) => setTimeout(injectButtons, d)); }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();
  document.addEventListener("click", injectButtons, true);

  // 测试钩子：headless 无麦克风，供烟测验证「文字→提交→意图执行」闭环
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

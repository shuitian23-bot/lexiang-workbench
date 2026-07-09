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

  // ── 录音识别层（火山）──────────────────────────────────────────────────
  function createVolcASR() {
    const AC = root.AudioContext || root.webkitAudioContext;
    const supported = !!(root.navigator && navigator.mediaDevices && navigator.mediaDevices.getUserMedia && AC &&
      (location.protocol === "https:" || location.hostname === "localhost"));
    let stream = null, ctx = null, source = null, proc = null;
    let chunks = [], recording = false, srcRate = 48000;
    let hadSpeech = false, silenceAt = 0, maxTimer = null;
    let cb = {};

    function cleanup() {
      recording = false;
      if (maxTimer) { clearTimeout(maxTimer); maxTimer = null; }
      try { proc && (proc.onaudioprocess = null, proc.disconnect()); } catch (_e) {}
      try { source && source.disconnect(); } catch (_e) {}
      try { ctx && ctx.close(); } catch (_e) {}
      try { stream && stream.getTracks().forEach((t) => t.stop()); } catch (_e) {}
      proc = source = ctx = stream = null;
    }
    function flatten(list) {
      let n = 0; list.forEach((c) => n += c.length);
      const out = new Float32Array(n); let o = 0;
      list.forEach((c) => { out.set(c, o); o += c.length; });
      return out;
    }
    function downsample(buf, from, to) {
      if (to >= from) return buf;
      const ratio = from / to, outLen = Math.round(buf.length / ratio), out = new Float32Array(outLen);
      for (let i = 0; i < outLen; i++) out[i] = buf[Math.floor(i * ratio)] || 0;
      return out;
    }
    function encodeWav(f32, rate) {
      const len = f32.length, buf = new ArrayBuffer(44 + len * 2), v = new DataView(buf);
      const ws = (o, s) => { for (let i = 0; i < s.length; i++) v.setUint8(o + i, s.charCodeAt(i)); };
      ws(0, "RIFF"); v.setUint32(4, 36 + len * 2, true); ws(8, "WAVE"); ws(12, "fmt ");
      v.setUint32(16, 16, true); v.setUint16(20, 1, true); v.setUint16(22, 1, true);
      v.setUint32(24, rate, true); v.setUint32(28, rate * 2, true); v.setUint16(32, 2, true); v.setUint16(34, 16, true);
      ws(36, "data"); v.setUint32(40, len * 2, true);
      let o = 44; for (let i = 0; i < len; i++) { const s = Math.max(-1, Math.min(1, f32[i])); v.setInt16(o, s < 0 ? s * 0x8000 : s * 0x7fff, true); o += 2; }
      return buf;
    }
    // 优先电脑内置麦克风，避开 iPhone「连续互通」——Mac 默认输入常被设成 iPhone，
    // 一录音就唤醒手机。已授权后 enumerateDevices 能拿到 label，挑非 iPhone 的内置设备。
    // 用 ideal 软约束（设备不在也不报错）；首次未授权 label 为空则退回默认（可能仍走 iPhone，
    // 授权一次后第二次起自动切内置）。
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
    async function finish() {
      if (!recording && !chunks.length) return;
      recording = false;
      const pcm = flatten(chunks); chunks = [];
      const rate = srcRate;
      cleanup();
      if (pcm.length < rate * 0.3) { cb.onEnd && cb.onEnd(""); return; }  // 太短（<0.3s）不识别
      cb.onState && cb.onState("识别中…");
      const wav = encodeWav(downsample(pcm, rate, 16000), 16000);
      try {
        const res = await fetch("/api/asr?format=wav&rate=16000", { method: "POST", headers: { "Content-Type": "application/octet-stream" }, body: wav });
        const data = await res.json();
        const text = ((data && data.text) || "").trim().replace(/[。，、\s]+$/, "");
        if (text) cb.onFinal && cb.onFinal(text);
        cb.onEnd && cb.onEnd(text);
      } catch (_e) { cb.onError && cb.onError("network"); cb.onEnd && cb.onEnd(""); }
    }

    return {
      engine: "volc",
      supported,
      get active() { return recording; },
      async start(onState, onFinal, onError, onEnd) {
        cb = { onState, onFinal, onError, onEnd };
        if (!supported) { onError && onError("unsupported"); return; }
        if (recording) return;
        let audioC;
        try { audioC = await preferredAudioConstraint(); } catch (_e) { audioC = { channelCount: 1, echoCancellation: true, noiseSuppression: true, autoGainControl: true }; }
        try {
          stream = await navigator.mediaDevices.getUserMedia({ audio: audioC });
        } catch (e) {
          const n = e && e.name;
          onError && onError(n === "NotAllowedError" || n === "SecurityError" ? "not-allowed" : n === "NotFoundError" ? "audio-capture" : "mic-fail");
          return;
        }
        ctx = new AC(); srcRate = ctx.sampleRate || 48000;
        source = ctx.createMediaStreamSource(stream);
        proc = ctx.createScriptProcessor(4096, 1, 1);
        chunks = []; hadSpeech = false; silenceAt = 0; recording = true;
        proc.onaudioprocess = (e) => {
          if (!recording) return;
          const d = e.inputBuffer.getChannelData(0);
          chunks.push(new Float32Array(d));
          let sum = 0; for (let i = 0; i < d.length; i++) sum += d[i] * d[i];
          const rms = Math.sqrt(sum / d.length), now = ctx.currentTime;
          if (rms > 0.014) { hadSpeech = true; silenceAt = 0; }
          else if (hadSpeech) { if (!silenceAt) silenceAt = now; else if (now - silenceAt > 1.0) finish(); }  // 说完静音1s自动停
        };
        source.connect(proc); proc.connect(ctx.destination);
        cb.onState && cb.onState("recording");
        maxTimer = setTimeout(finish, 12000);  // 最长12s兜底
      },
      stop() { if (recording) finish(); },
      abort() { chunks = []; cleanup(); },
    };
  }

  const asr = createVolcASR();
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
    btn.__ta = ta;
    if (btn.__phOrig == null) btn.__phOrig = ta.placeholder;
    asr.start(
      (state) => {                                      // 状态：recording / 识别中…
        if (state === "recording") { btn.classList.remove("thinking"); btn.classList.add("recording"); ta.placeholder = "🎤 请说话…（说完停一下自动识别）"; }
        else { btn.classList.remove("recording"); btn.classList.add("thinking"); ta.placeholder = "识别中…"; }
      },
      (text) => {                                       // 识别结果 → 自动提交
        ta.value = text;
        ta.dispatchEvent(new Event("input", { bubbles: true }));
        try {
          if (form && typeof form.requestSubmit === "function") form.requestSubmit();
          else if (form) form.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));
        } catch (_e) {}
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

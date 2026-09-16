// POC only: no phone number is transmitted or persisted.
window.__lxInstallArrivalNotice = function(api) {
const {d,j,I,N,O,z,ot,nt,Qe,xe,ye,ke,Ne,Uo,qe,bindDialog} = api;
function lxIsArrivalQuery(query) {
  return /^(?:请)?(?:为)?(?:联想)?天逸\s*510\s*Pro(?:开启|设置|订阅)?到货通知[。！!]?$/i.test(String(query || '').trim());
}
async function lxArrivalNoticeSkill() {
  return {
    text: '已为你准备这款商品的**到货通知**，请在弹窗中填写手机号、图形验证码和短信验证码后确认。本次为**演示流程**，不会实际订阅或发送短信。',
    id: 'modal:arrival-notice:1056661'
  };
}
let arrivalSuccessTimer = null;
function lxShowArrivalSuccessToast() {
  let toast = document.querySelector('.lx-arrival-success-toast');
  if (!toast) {
    toast = document.createElement('div');
    toast.className = 'lx-arrival-success-toast';
    toast.setAttribute('role', 'status');
    toast.setAttribute('aria-live', 'polite');
    toast.setAttribute('aria-atomic', 'true');
    document.body.appendChild(toast);
  }
  window.clearTimeout(arrivalSuccessTimer);
  toast.textContent = '订阅成功';
  toast.classList.add('show');
  arrivalSuccessTimer = window.setTimeout(() => {
    toast.classList.remove('show');
    toast.textContent = '';
    arrivalSuccessTimer = null;
  }, 2400);
}
let activeArrivalCleanup = null;
function lxOpenArrivalNotice() {
  activeArrivalCleanup?.();
  const returnFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
  j('到货通知', `<div class="lx-arrival-content">
    <p class="lx-arrival-tip"><strong>温馨提示：</strong>当商品到货后，我们会通过短信第一时间通知您，请注意查收短信。</p>
    <form class="lx-arrival-form" novalidate>
      <div class="lx-arrival-input-wrap"><input id="lx-arrival-phone" aria-label="手机号码" type="tel" inputmode="numeric" autocomplete="off" maxlength="11" placeholder="请输入11位手机号码" aria-describedby="lx-arrival-error" required><button type="button" data-arrival-clear aria-label="清空手机号码">清空</button></div>
      <div class="lx-arrival-code-row"><div class="lx-arrival-input-wrap"><input id="lx-arrival-captcha" aria-label="图形验证码" type="text" autocomplete="off" autocapitalize="characters" spellcheck="false" maxlength="6" placeholder="请输入图形验证码" aria-describedby="lx-arrival-captcha-hint lx-arrival-error" required></div><button class="lx-arrival-captcha" type="button" data-arrival-captcha-refresh title="点击更换验证码"></button></div>
      <p id="lx-arrival-captcha-hint" class="lx-arrival-field-hint">看不清？点击图片更换验证码</p>
      <div class="lx-arrival-code-row"><div class="lx-arrival-input-wrap"><input id="lx-arrival-sms" aria-label="短信验证码" type="text" inputmode="numeric" autocomplete="one-time-code" maxlength="6" placeholder="请输入您的短信码" aria-describedby="lx-arrival-status lx-arrival-error" required></div><button class="lx-arrival-send-code" type="button" data-arrival-send-code>获取验证码</button></div>
      <p id="lx-arrival-status" class="lx-arrival-status" role="status" aria-live="polite"></p>
      <p id="lx-arrival-error" class="lx-arrival-error" role="alert"></p>
      <button class="detail-primary lx-arrival-confirm" type="submit">提交</button>
    </form>
  </div>`);
  const mask = I(), panel = mask.querySelector('.lx-p0-modal'), form = mask.querySelector('.lx-arrival-form');
  panel.classList.add('lx-arrival-dialog');
  panel.setAttribute('role', 'dialog');
  panel.setAttribute('aria-modal', 'true');
  panel.setAttribute('aria-label', '到货通知');
  const phone = form.querySelector('#lx-arrival-phone'), captcha = form.querySelector('#lx-arrival-captcha'), sms = form.querySelector('#lx-arrival-sms');
  const error = form.querySelector('.lx-arrival-error'), status = form.querySelector('.lx-arrival-status');
  const send = form.querySelector('[data-arrival-send-code]'), refresh = form.querySelector('[data-arrival-captcha-refresh]');
  let captchaCode = '', smsCode = '', sentPhone = '', expiresAt = 0, cooldownUntil = 0, timer = null, disposed = false;
  const randomCode = (alphabet, length) => {
    const bytes = new Uint32Array(length);
    window.crypto.getRandomValues(bytes);
    return Array.from(bytes, value => alphabet[value % alphabet.length]).join('');
  };
  const clearError = () => {
    error.textContent = '';
    [phone, captcha, sms].forEach(input => input.removeAttribute('aria-invalid'));
  };
  const fail = (input, message) => {
    clearError(); error.textContent = message; input.setAttribute('aria-invalid', 'true'); input.focus(); return false;
  };
  const stopTimer = () => { if (timer !== null) window.clearInterval(timer); timer = null; };
  const resetSms = () => {
    stopTimer(); smsCode = ''; sentPhone = ''; expiresAt = 0; cooldownUntil = 0;
    sms.value = ''; status.textContent = ''; send.disabled = false; send.textContent = '获取验证码';
  };
  const renewCaptcha = () => {
    resetSms(); clearError(); captcha.value = '';
    captchaCode = randomCode('ABCDEFGHJKLMNPQRSTUVWXYZ23456789', 6);
    refresh.setAttribute('aria-label', `图形验证码 ${captchaCode}，点击更换`);
    refresh.innerHTML = `<svg viewBox="0 0 132 44" aria-hidden="true" focusable="false"><rect width="132" height="44" rx="6" fill="#faf4e9"/><path d="M4 12 Q45 36 128 14 M5 34 Q64 8 127 30" fill="none" stroke="#d6c5a5" stroke-width="1.5"/>${Array.from(captchaCode, (letter, index) => `<text x="${12 + index * 20}" y="30" fill="${index % 2 ? '#73552e' : '#876b3e'}" font-family="Arial,sans-serif" font-size="24" font-weight="700" transform="rotate(${index % 2 ? 7 : -7} ${12 + index * 20} 25)">${letter}</text>`).join('')}</svg>`;
  };
  const validatePhone = () => /^1[3-9]\d{9}$/.test(phone.value.trim()) || fail(phone, '请输入有效的11位手机号码');
  const validateCaptcha = () => captcha.value.trim().toUpperCase() === captchaCode || fail(captcha, '请输入正确的图形验证码');
  const updateCountdown = () => {
    if (disposed || !form.isConnected || !mask.classList.contains('show')) { cleanup(); return; }
    const remaining = Math.max(0, Math.ceil((cooldownUntil - Date.now()) / 1000));
    send.disabled = remaining > 0;
    send.textContent = remaining ? `${remaining}秒后重新获取` : '重新获取验证码';
    if (!remaining) stopTimer();
  };
  form.querySelector('[data-arrival-clear]').addEventListener('click', () => { phone.value = ''; resetSms(); clearError(); phone.focus(); });
  phone.addEventListener('input', () => { resetSms(); clearError(); });
  captcha.addEventListener('input', clearError);
  sms.addEventListener('input', clearError);
  refresh.addEventListener('click', () => { renewCaptcha(); captcha.focus(); });
  send.addEventListener('click', () => {
    clearError();
    if (Date.now() < cooldownUntil || !validatePhone() || !validateCaptcha()) return;
    smsCode = randomCode('0123456789', 6); sentPhone = phone.value.trim();
    expiresAt = Date.now() + 5 * 60 * 1000; cooldownUntil = Date.now() + 60 * 1000;
    sms.value = ''; status.textContent = `演示短信验证码：${smsCode}（5分钟内有效，不发送真实短信）`;
    stopTimer(); updateCountdown(); timer = window.setInterval(updateCountdown, 1000); sms.focus();
  });
  form.addEventListener('submit', event => {
    event.preventDefault();
    if (disposed) return;
    clearError();
    if (!validatePhone() || !validateCaptcha()) return;
    if (!smsCode || sentPhone !== phone.value.trim()) { fail(sms, '请先获取短信验证码'); return; }
    if (Date.now() > expiresAt) { fail(sms, '短信验证码已过期，请重新获取'); return; }
    if (sms.value.trim() !== smsCode) { fail(sms, '请输入正确的6位短信验证码'); return; }
    cleanup();
    N();
    lxShowArrivalSuccessToast();
  });
  const onClose = event => { if (event.target === mask || event.target.closest('.lx-p0-close')) cleanup(); };
  const lifecycle = new MutationObserver(() => { if (!mask.classList.contains('show') || !form.isConnected) cleanup(); });
  const cleanup = () => {
    if (disposed) return;
    disposed = true; stopTimer(); lifecycle.disconnect(); mask.removeEventListener('click', onClose, true);
    [phone, captcha, sms].forEach(input => { input.value = ''; });
    smsCode = ''; sentPhone = ''; captchaCode = ''; status.textContent = '';
    if (form.isConnected && panel.classList.contains('lx-arrival-dialog')) panel.removeAttribute('aria-label');
    if (activeArrivalCleanup === cleanup) activeArrivalCleanup = null;
  };
  activeArrivalCleanup = cleanup;
  mask.addEventListener('click', onClose, true);
  lifecycle.observe(mask, {attributes:true, attributeFilter:['class']});
  lifecycle.observe(form.parentElement.parentElement, {childList:true});
  const keyHandler = event => {
    if (event.key === 'Escape') { event.preventDefault(); cleanup(); N(); return; }
    if (event.key !== 'Tab') return;
    const focusable = [...panel.querySelectorAll('button:not([disabled]), input:not([disabled])')].filter(el => el.getClientRects().length);
    const first = focusable[0], last = focusable[focusable.length - 1];
    if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
    else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
  };
  bindDialog(returnFocus, keyHandler);
  renewCaptcha();
  requestAnimationFrame(() => phone.focus());
}
O('arrival-notice', lxOpenArrivalNotice);
async function lxArrivalNoticeQuery(query) {
  const nonce = d.conversationNonce;
  d.sending = true; ot(); nt();
  d.queryHistory.push(query);
  (d.queryAnchors || (d.queryAnchors = [])).push(Math.max(0, xe().children.length - 1));
  Qe();
  const reply = ye('ai loading', '', ke(['正在调用 Skill（到货通知 · 演示）'], {collapsed:false, foldable:false, skillCount:0}));
  try {
    const result = await lxArrivalNoticeSkill();
    reply._raw = result.text;
    await Ne(reply, Uo(result.text));
    if (nonce !== d.conversationNonce || !reply.isConnected || !d.sending) return;
    const body = qe(reply);
    body.insertAdjacentHTML('afterbegin', ke(['Skill（到货通知 · 演示）已完成：准备到货通知验证表单，未提交订阅'], {collapsed:true, foldable:true, skillCount:1}));
    body.insertAdjacentHTML('beforeend', '<button class="answer-cta lx-store-appointment-cta lx-edu-auth-reco" type="button" data-lx-recommended-modal="arrival-notice" data-lx-recommended-modal-payload="1056661" data-lx-result-id="modal:arrival-notice:1056661" aria-label="打开到货通知弹窗"><span class="answer-cta-title">到货通知待确认</span><span class="answer-cta-icon" aria-hidden="true"><img src="/assets/icons/global-next.svg" alt=""></span></button>');
    xe().scrollTop = xe().scrollHeight;
    const card = body.querySelector('[data-lx-recommended-modal="arrival-notice"]');
    await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
    await Promise.all((card.getAnimations?.() || []).map(animation => animation.finished.catch(() => {})));
    if (nonce === d.conversationNonce && reply.isConnected && d.sending) z('arrival-notice', '1056661');
  } catch (error) {
    if (nonce === d.conversationNonce && reply.isConnected) await Ne(reply, Uo('到货通知演示暂未打开，请稍后重试。未提交任何订阅。'));
  } finally {
    if (nonce === d.conversationNonce) { d.sending = false; try { window.__lxSaveConversationNow?.(); } catch (error) {} }
  }
}
// Window capture runs before the existing document-level purchase handler.
window.addEventListener('click', event => {
  const button = event.target.closest?.('.product-detail .detail-actions .detail-primary');
  if (!button || button.textContent.trim() !== '到货通知') return;
  const title = button.closest('.product-detail').querySelector('[data-detail-title], .detail-title');
  if (!/^(?:联想)?天逸510Pro$/i.test(String(title?.textContent || '').replace(/\s+/g, ''))) return;
  event.preventDefault(); event.stopImmediatePropagation();
  z('arrival-notice', '1056661');
}, true);
window.__lxArrivalNotice = {matches:lxIsArrivalQuery, run:lxArrivalNoticeQuery};
};

/* checkout-invoice-default-20261022-v1 */
(() => {
  if (window.__lxInvoicePreference) return;
  const key = 'lexiang.checkout.default-invoice.v1';
  const types = ['普通发票-个人', '普通发票-单位', '增值税专票'];
  const fields = ['invoiceTitle', 'invoiceTaxNo', 'invoicePhone', 'invoiceEmail', 'invoiceRemark', 'invoiceDelayDate'];
  const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  function read() {
    try {
      const value = JSON.parse(localStorage.getItem(key) || 'null');
      return value && types.includes(value.invoice) && typeof value.invoiceTitle === 'string' && value.invoiceTitle.trim() ? value : null;
    } catch (_) { return null; }
  }
  function snapshot(state, type = state.invoiceDraft || state.invoice) {
    return Object.fromEntries([['invoice', type], ...fields.map(field => [field, String(state[field] || '')])]);
  }
  const identity = state => JSON.stringify([state.invoiceDraft || state.invoice, state.invoiceTitle, state.invoiceTaxNo || '']);
  const matches = state => { const saved = read(); return Boolean(saved && identity(saved) === identity(state)); };
  function apply(state) {
    const saved = read();
    if (saved) Object.assign(state, saved, { invoiceDraft: saved.invoice, invoiceIsDefault: true });
    else { state.invoiceDraft = state.invoice; if (state.invoice === '普通发票-个人') state.invoiceTaxNo = ''; }
  }
  function selectType(state, type) {
    state.invoiceProfiles ||= {};
    state.invoiceProfiles[state.invoiceDraft] = snapshot(state);
    const profile = state.invoiceProfiles[type];
    state.invoiceDraft = type;
    if (profile) for (const field of fields) state[field] = profile[field];
    else {
      state.invoiceTitle = type === '普通发票-个人' ? '个人' : '联想（北京）有限公司';
      state.invoiceTaxNo = type === '普通发票-个人' ? '' : type === '增值税专票' ? '91110108700000458B' : '123123123123123';
    }
    state.invoiceIsDefault = matches(state);
  }
  function collect(root, state) {
    root.querySelectorAll('[data-invoice-field]').forEach(input => { if (!input.disabled) state[input.dataset.invoiceField] = input.value.trim(); });
    const toggle = root.querySelector('[data-default-invoice]');
    if (toggle) state.invoiceIsDefault = toggle.checked;
    const consent = root.querySelector('[data-invoice-consent]');
    if (consent) state.invoiceConsent = consent.checked;
  }
  function save(state) {
    const data = snapshot(state);
    try {
      if (state.invoiceIsDefault) localStorage.setItem(key, JSON.stringify(data));
      else if (matches(data)) localStorage.removeItem(key);
    } catch (_) {}
  }
  function validate(state) {
    if (!state.invoiceTitle?.trim()) return '请填写发票抬头';
    if (state.invoiceDraft !== '普通发票-个人' && !state.invoiceTaxNo?.trim()) return '请填写纳税人识别号';
    if (!/^1[3-9]\d{9}$/.test(state.invoicePhone || '')) return '请填写有效的收票人手机号';
    if (state.invoiceEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(state.invoiceEmail)) return '请填写有效的收票人邮箱';
    if (state.invoiceDraft === '增值税专票' && !state.invoiceConsent) return '请阅读并同意增值税专用发票抬头确认书';
    return '';
  }
  function summary(state) {
    const type = state.invoice || state.invoiceDraft;
    const committed = { ...state, invoiceDraft: type };
    return `${matches(committed) ? '<small class="lx-invoice-default-badge">默认</small>' : ''}<span class="lx-invoice-summary-prefix">${type === '增值税专票' ? '增专' : '电子'}</span><span class="lx-invoice-summary-name">（${esc(type === '普通发票-个人' ? state.invoiceTitle || '个人' : state.invoiceTitle || '联想（北京）有限公司')}）</span>`;
  }
  function setting(state) {
    return `<label class="lx-invoice-default-setting"><span><strong>设为默认发票抬头</strong><small>设置后，下次结算将自动使用该抬头</small></span><input class="lx-invoice-default-switch" type="checkbox" role="switch" aria-label="设为默认发票抬头" data-default-invoice${state.invoiceIsDefault ? ' checked' : ''}></label>`;
  }
  window.__lxInvoicePreference = Object.freeze({read, apply, matches, selectType, collect, save, validate, summary, setting, snapshot});
})();

/* 修改发票 — P0 business implementations. */
if (!window.__p0Modules.installed["modals/invoice-edit"]) {
window.__p0Modules.installed["modals/invoice-edit"]=true;

/* Business: syncInvoiceDraft */
window.__p0Modules.factories["modals/invoice-edit#syncInvoiceDraft:7f5cd6fcf0614644cddfef81"]=function(__p0Scope){return (() => {
      window.__lxInvoicePreference.collect(__p0Scope.dialog, __p0Scope.orderState);
      const consent = __p0Scope.dialog.querySelector('[data-invoice-consent]');
      if (consent) __p0Scope.orderState.invoiceConsent = consent.checked;
    }); };

/* Business: showInvoiceDelayPicker */
window.__p0Modules.factories["modals/invoice-edit#showInvoiceDelayPicker:21d3cb57b4bbd6f9219c1e5b"]=function(__p0Scope){return (() => {
      (0,__p0Scope.syncInvoiceDraft)();
      (0,__p0Scope.closeInvoiceDelayPicker)();
      const limits = (0,__p0Scope.invoiceDelayLimits)();
      const initialValue = __p0Scope.orderState.invoiceDelayDate && __p0Scope.orderState.invoiceDelayDate >= limits.minimum && __p0Scope.orderState.invoiceDelayDate <= limits.maximum ? __p0Scope.orderState.invoiceDelayDate : limits.minimum;
      __p0Scope.modal.insertAdjacentHTML('beforeend', `<div class="lx-invoice-delay-layer" data-invoice-delay-layer><section class="lx-invoice-delay-dialog" role="dialog" aria-modal="true" aria-labelledby="lxInvoiceDelayTitle"><header class="lx-invoice-delay-head"><h3 id="lxInvoiceDelayTitle">选择延时开票日期</h3><button class="lx-invoice-delay-close" type="button" data-invoice-delay-cancel aria-label="关闭延时开票日期选择">×</button></header><div class="lx-invoice-delay-body"><p class="lx-invoice-delay-note">最早可选择明天，最多可延后一年。</p><label class="lx-invoice-delay-date-label" for="lxInvoiceDelayDate">开票日期<input class="lx-invoice-delay-date" id="lxInvoiceDelayDate" type="date" min="${limits.minimum}" max="${limits.maximum}" value="${initialValue}" data-invoice-delay-input></label></div><footer class="lx-invoice-delay-footer"><button type="button" data-invoice-delay-clear>清除日期</button><button type="button" data-invoice-delay-cancel>取消</button><button class="primary" type="button" data-invoice-delay-confirm>确定</button></footer></section></div>`);
      const input = __p0Scope.modal.querySelector('[data-invoice-delay-input]');
      input?.focus();
      try { input?.showPicker?.(); } catch (_) {}
    }); };

/* Business: showInvoiceNotice */
window.__p0Modules.factories["modals/invoice-edit#showInvoiceNotice:2880dd7e6c4227931323ebdf"]=function(__p0Scope){return (() => {
      (0,__p0Scope.syncInvoiceDraft)();
      __p0Scope.dialog.className = 'lx-buy-direct-dialog lx-order-edit-dialog lx-invoice-dialog lx-invoice-notice-view';
      __p0Scope.dialog.innerHTML = `<header class="lx-order-edit-head"><button class="lx-order-edit-back" type="button" data-invoice-notice-back aria-label="返回发票信息"><img src="/assets/icons/order-modal-back.svg" alt="" aria-hidden="true"></button><h2>发票须知</h2><button class="lx-buy-direct-close" type="button" aria-label="关闭">×</button></header><div class="lx-order-edit-body lx-invoice-notice-body"><section><h3>开具发票说明</h3><ol><li>联想在线商城所售商品，每张订单都会开具“商品专用发票”。</li><li>发票金额为订单金额，含配送费。</li><li>发票内容默认为订购的商品明细，不支持修改。</li><li>使用优惠券支付的金额不开具发票；积分商品不提供发票。</li><li>发票抬头不能为空，可选择个人或公司名称，请仔细核对发票类型和公司名称。</li><li>联想实行货票同行；不能同行时按收货地址另行寄送。</li><li>目前只有联想（上海）电子科技有限公司能开具电子票。</li><li>第三方卖家商品或服务的发票由卖家按实际情况开具。</li></ol><h3>电子发票常见问题</h3><ol><li>电子发票与纸质发票具有同等法律效力。</li><li>订单确认收货后开具电子发票。</li><li>电子发票与纸质普票法律效力相同，不建议更换。</li><li>增值税专用发票资质在“我的商城—设置—发票抬头管理”维护并审核通过。</li><li>全电发票是票面信息全面数字化、全国统一赋码的电子发票。</li><li>增值税专用发票（数电票）预计在确认收货后 5 个工作日内开具，可在订单详情下载。</li><li>联想自营商品已全面实现增值税专用发票（数电票）。</li></ol></section></div><footer class="lx-order-edit-footer lx-invoice-notice-footer"><button type="button" data-invoice-notice-close>我知道了</button></footer>`;
      __p0Scope.dialog.querySelector('[data-invoice-notice-close]')?.focus();
    }); };

/* Business: showInvoiceEdit — checkout-invoice-default-20261022-v1 */
window.__p0Modules.factories["modals/invoice-edit#showInvoiceEdit:b60254d8536d8fcebb300598"] = function(scope) { return () => {
  const state = scope.orderState;
  const esc = scope.escapeHtml;
  const preference = window.__lxInvoicePreference;
  const vat = state.invoiceDraft === '增值税专票';
  const personal = state.invoiceDraft === '普通发票-个人';
  const options = ['普通发票-个人', '普通发票-单位', '增值税专票'];
  const field = (label, key, type = 'text') => `<label for="${key}">${label}</label><input id="${key}" type="${type}" data-invoice-field="${key}" value="${esc(state[key] || '')}">`;
  const normalHeader = `<div class="lx-invoice-form">${field('发票抬头', 'invoiceTitle')}${personal ? '<input type="hidden" data-invoice-field="invoiceTaxNo" value="">' : field('纳税人识别号', 'invoiceTaxNo')}</div>`;
  const qualification = `<section class="lx-invoice-qualification" aria-label="已审核增票资质"><div><span>单位名称</span><strong>${esc(state.invoiceTitle)}<input type="hidden" data-invoice-field="invoiceTitle" value="${esc(state.invoiceTitle)}"></strong></div><div><span>纳税人识别号</span><strong>${esc(state.invoiceTaxNo)}<input type="hidden" data-invoice-field="invoiceTaxNo" value="${esc(state.invoiceTaxNo)}"></strong></div></section>`;
  const recipients = `<div class="lx-invoice-form lx-invoice-recipient-form">${field('收票人手机', 'invoicePhone', 'tel')}${field('收票人邮箱（选填）', 'invoiceEmail', 'email')}${personal ? '' : `<label for="invoiceRemark">发票备注（选填）</label><textarea id="invoiceRemark" data-invoice-field="invoiceRemark" placeholder="备注将在发票票面或申请中展示，请谨慎填写">${esc(state.invoiceRemark || '')}</textarea>`}</div>`;
  const delay = vat ? `<div class="lx-invoice-delay-field"><label>延时开票（选填）</label><button class="lx-invoice-delay-trigger" type="button" data-invoice-delay-open><span class="lx-invoice-delay-value${state.invoiceDelayDate ? ' has-value' : ''}">${esc(scope.formatInvoiceDelayDate(state.invoiceDelayDate))}</span><i class="lx-invoice-delay-chevron" aria-hidden="true"></i></button><p class="lx-invoice-delay-help">选择后将在该日期起进入开票处理；请在此日期前确保增票资质已审核通过。未选择则按原开票时效处理。</p></div>` : '';
  const hint = vat ? '自营商品的增值税专用发票（数电票）会在确认收货后预计 5 个工作日内开具，须使用已审核通过的增票资质。' : '联想自营提供数电（普通发票），法律效力等同电子普通发票；非自营订单由商家开具。';
  scope.dialog.className = 'lx-buy-direct-dialog lx-order-edit-dialog lx-invoice-dialog';
  scope.dialog.dataset.checkoutInvoiceVersion = '20261022-v1';
  scope.dialog.innerHTML = `<header class="lx-order-edit-head"><button class="lx-order-edit-back" type="button" data-invoice-back aria-label="返回"><img src="/assets/icons/order-modal-back.svg" alt="" aria-hidden="true"></button><h2>发票信息</h2><button class="lx-buy-direct-close" type="button" aria-label="关闭">×</button></header><div class="lx-order-edit-body"><section class="lx-order-edit-section"><div class="lx-invoice-type-row"><div class="lx-order-channel-grid lx-invoice-type-grid" role="tablist" aria-label="发票类型">${options.map(type => `<button class="lx-order-channel${type === state.invoiceDraft ? ' is-active' : ''}" type="button" role="tab" aria-selected="${type === state.invoiceDraft}" data-invoice-option="${type}"><strong>${type}</strong></button>`).join('')}</div><button class="lx-invoice-notice-entry" type="button" data-invoice-notice-open>发票须知</button></div></section><p class="lx-invoice-tip">${hint}</p>${vat ? qualification : normalHeader}${recipients}${delay}${preference.setting(state)}${vat ? `<label class="lx-invoice-consent"><input type="checkbox" data-invoice-consent${state.invoiceConsent ? ' checked' : ''}>我已阅读并同意《增值税专用发票抬头确认书》</label>` : ''}<p class="lx-invoice-error" role="alert" data-invoice-error></p></div><footer class="lx-order-edit-footer"><button type="button" data-invoice-save>保存</button></footer>`;
  scope.dialog.querySelector('[data-invoice-back]').addEventListener('click', event => { event.stopPropagation(); scope.showOrderEdit(); });
}; };
}
window.__p0Modules.dispatch(document.currentScript);

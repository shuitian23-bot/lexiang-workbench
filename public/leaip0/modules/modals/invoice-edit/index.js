/* 修改发票 — P0 business implementations. */
if (!window.__p0Modules.installed["modals/invoice-edit"]) {
window.__p0Modules.installed["modals/invoice-edit"]=true;

/* Business: syncInvoiceDraft */
window.__p0Modules.factories["modals/invoice-edit#syncInvoiceDraft:7f5cd6fcf0614644cddfef81"]=function(__p0Scope){return (() => {
      __p0Scope.dialog.querySelectorAll('[data-invoice-field]').forEach((input) => { if (!input.disabled) __p0Scope.orderState[input.dataset.invoiceField] = input.value.trim(); });
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

/* Business: showInvoiceEdit */
window.__p0Modules.factories["modals/invoice-edit#showInvoiceEdit:b60254d8536d8fcebb300598"]=function(__p0Scope){return (() => {
      const options = [{ label: '普通发票-个人', value: '普通发票-个人' },{ label: '普通发票-单位', value: '普通发票-单位' },{ label: '增值税专票', value: '增值税专票' }];
      const isVat = __p0Scope.orderState.invoiceDraft === '增值税专票';
      const isPersonal = __p0Scope.orderState.invoiceDraft === '普通发票-个人';
      const fields = isVat
        ? `<div class="lx-invoice-form"><label for="lxInvoiceCompany">单位名称</label><input id="lxInvoiceCompany" value="联想（北京）有限公司" readonly><label for="lxInvoiceTaxId">纳税人识别号</label><input id="lxInvoiceTaxId" data-invoice-field="invoiceTaxNo" value="9111010870000458B" readonly><label for="lxInvoiceAddress">注册地址</label><input id="lxInvoiceAddress" data-invoice-field="invoiceAddress" value="${(0,__p0Scope.escapeHtml)(__p0Scope.orderState.invoiceAddress)}"><label for="lxInvoicePhone">注册电话</label><input id="lxInvoicePhone" data-invoice-field="invoiceRegisteredPhone" value="${(0,__p0Scope.escapeHtml)(__p0Scope.orderState.invoiceRegisteredPhone)}"><label for="lxInvoiceBank">开户银行</label><input id="lxInvoiceBank" data-invoice-field="invoiceBank" value="${(0,__p0Scope.escapeHtml)(__p0Scope.orderState.invoiceBank)}"><label for="lxInvoiceAccount">银行账号</label><input id="lxInvoiceAccount" data-invoice-field="invoiceBankAccount" value="${(0,__p0Scope.escapeHtml)(__p0Scope.orderState.invoiceBankAccount)}"><label for="lxInvoiceRemark">备注</label><textarea id="lxInvoiceRemark" data-invoice-field="invoiceRemark" placeholder="请填写备注">${(0,__p0Scope.escapeHtml)(__p0Scope.orderState.invoiceRemark)}</textarea></div><div class="lx-invoice-delay-field"><label>延时开票</label><button class="lx-invoice-delay-trigger" type="button" data-invoice-delay-open><span class="lx-invoice-delay-value${__p0Scope.orderState.invoiceDelayDate ? ' has-value' : ''}">${(0,__p0Scope.escapeHtml)((0,__p0Scope.formatInvoiceDelayDate)(__p0Scope.orderState.invoiceDelayDate))}</span><i class="lx-invoice-delay-chevron" aria-hidden="true"></i></button><p class="lx-invoice-delay-help">选择后将在该日期起进入开票处理；请在此日期前确保增票资质已审核通过。未选择则按原开票时效处理。</p></div>`
        : `<div class="lx-invoice-form"><label for="lxInvoiceTitle">发票抬头</label><input id="lxInvoiceTitle" data-invoice-field="invoiceTitle" value="${isPersonal ? '个人' : '联想（北京）有限公司'}">${isPersonal ? '' : '<label for="lxInvoiceTaxId">纳税人识别号</label><input id="lxInvoiceTaxId" data-invoice-field="invoiceTaxNo" value="123123123123123">'}<label for="lxInvoiceRecipientPhone">收票人手机</label><input id="lxInvoiceRecipientPhone" data-invoice-field="invoicePhone" value="${(0,__p0Scope.escapeHtml)(__p0Scope.orderState.invoicePhone)}"><label for="lxInvoiceEmail">收票人邮箱</label><input id="lxInvoiceEmail" data-invoice-field="invoiceEmail" value="${(0,__p0Scope.escapeHtml)(__p0Scope.orderState.invoiceEmail)}">${isPersonal ? '' : `<label for="lxInvoiceRemark">备注</label><textarea id="lxInvoiceRemark" data-invoice-field="invoiceRemark" placeholder="请填写备注">${(0,__p0Scope.escapeHtml)(__p0Scope.orderState.invoiceRemark)}</textarea>`}</div>`;
      __p0Scope.dialog.className = 'lx-buy-direct-dialog lx-order-edit-dialog lx-invoice-dialog';
      __p0Scope.dialog.innerHTML = `<header class="lx-order-edit-head"><button class="lx-order-edit-back" type="button" data-invoice-back aria-label="返回"><img src="/assets/icons/order-modal-back.svg" alt="" aria-hidden="true"></button><h2>发票信息</h2><button class="lx-buy-direct-close" type="button" aria-label="关闭">×</button></header><div class="lx-order-edit-body"><section class="lx-order-edit-section"><div class="lx-invoice-type-row"><div class="lx-order-channel-grid lx-invoice-type-grid">${options.map((option) => `<button class="lx-order-channel${__p0Scope.orderState.invoiceDraft === option.value ? ' is-active' : ''}" type="button" data-invoice-option="${option.value}"><strong>${option.label}</strong></button>`).join('')}</div><button class="lx-invoice-notice-entry" type="button" data-invoice-notice-open>发票须知</button></div></section><p class="lx-invoice-tip">*自营商品的增值税专用发票（数电票）会在确认收货后预计 5 个工作日内开具。</p>${fields}</div><footer class="lx-order-edit-footer"><button type="button" data-invoice-save>保存</button></footer>`;
      if (!isVat) __p0Scope.dialog.querySelector('.lx-invoice-tip').remove();
      __p0Scope.dialog.querySelector('[data-invoice-back]').addEventListener('click', (event) => { event.stopPropagation(); (0,__p0Scope.showOrderEdit)(); });
    }); };
}
window.__p0Modules.dispatch(document.currentScript);

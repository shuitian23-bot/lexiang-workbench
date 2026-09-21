/* 支付成功 — P0 business implementations. */
if (!window.__p0Modules.installed["modals/payment-success"]) {
window.__p0Modules.installed["modals/payment-success"]=true;

/* Business: showPaymentSuccess */
window.__p0Modules.factories["modals/payment-success#showPaymentSuccess:b365b1bec5ea152180733470"]=function(__p0Scope){return (() => {
      (0,__p0Scope.stopPaymentTimer)();
      const paidOrder = (0,__p0Scope.persistPaidOrder)();
      __p0Scope.paymentState.paid = true;
      (0,__p0Scope.snapshot)();
      (0,__p0Scope.updatePaymentChatCard)();
      (0,__p0Scope.ensureMounted)();
      (0,__p0Scope.lockPaymentDialogSize)();
      __p0Scope.dialog.className = 'lx-buy-direct-dialog lx-payment-dialog';
      __p0Scope.dialog.innerHTML = `<button class="lx-buy-direct-close" type="button" aria-label="关闭">×</button><h2 id="lxBuyDirectTitle">支付成功</h2><div class="lx-payment-stage"><span class="lx-payment-success-icon" aria-hidden="true">✓</span><strong class="lx-payment-success-title">订单支付成功</strong><p class="lx-payment-success-meta">订单号：<b>${(0,__p0Scope.escapeHtml)(paidOrder.orderId)}</b><br>实付：<b>¥${(0,__p0Scope.payableAmount)().toLocaleString('zh-CN')}</b></p></div><div class="lx-payment-actions"><button type="button" class="primary" data-view-paid-order>查看订单</button></div>`;
    }); };
}
window.__p0Modules.dispatch(document.currentScript);

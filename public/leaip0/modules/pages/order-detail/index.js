/* 我的订单详情 — P0 business implementations. */
if (!window.__p0Modules.installed["pages/order-detail"]) {
window.__p0Modules.installed["pages/order-detail"]=true;

/* Business: openPaidOrderDetail */
window.__p0Modules.factories["pages/order-detail#openPaidOrderDetail:7b9b7452901e72aae87534b4"]=function(__p0Scope){return (() => {
      const paidOrder = (0,__p0Scope.persistPaidOrder)();
      (0,__p0Scope.stopPaymentTimer)();
      __p0Scope.modal.hidden = true;
      window.dispatchEvent(new Event('lx:orders-updated'));
      if (window.__lxCheckoutOrderDetail) {
        const tabId = 'info:checkout-order:' + __p0Scope.id;
        const cardHtml = '<button type="button" class="answer-cta lx-payment-chat-card lx-checkout-order-preview" data-checkout-view-order="' + (0,__p0Scope.escapeHtml)(__p0Scope.id) + '" data-lx-result-id="' + (0,__p0Scope.escapeHtml)(tabId) + '"><span class="answer-cta-copy"><span class="answer-cta-title">查看订单详情</span></span><span class="answer-cta-icon" aria-hidden="true"></span></button>';
        const result = window.__lxCheckoutOrderDetail(paidOrder, cardHtml);
        if (result) {
          const tab = {id:tabId,kind:'info',label:'订单详情 · '+paidOrder.orderId,
            html:'<div class="lx-orders-poc lx-checkout-detail-surface">' + result.html.replace('data-order-back', 'data-checkout-detail-back').replace('data-order-detail','data-checkout-detail') + '</div>'};
          (0,__p0Scope.rememberCheckout)(__p0Scope.id,{...__p0Scope.checkoutRecords[__p0Scope.id],detailTab:tab});
          (0,__p0Scope.restoreCheckoutDetail)(__p0Scope.id);
          result.done?.then(() => {try{window.__lxSaveConversationNow?.();}catch(_){}});
          return;
        }
      }

      const attachOrderDetailPreview = () => {
        const detail = document.querySelector('.content [data-order-detail].is-active');
        const state = window.__lxState;
        if (!detail || !state || !window.__lxBridge?.activateTab) return;
        const copy = detail.cloneNode(true);
        copy.querySelector('[data-order-back]')?.setAttribute('data-checkout-detail-back','');
        copy.querySelector('[data-order-back]')?.removeAttribute('data-order-back');
        const tab = {id:'info:checkout-order:' + __p0Scope.id, kind:'info', label:'订单详情 · '+paidOrder.orderId,
          html:'<div class="lx-orders-poc lx-checkout-detail-surface">' + copy.outerHTML + '</div>'};
        (0,__p0Scope.rememberCheckout)(__p0Scope.id, {...__p0Scope.checkoutRecords[__p0Scope.id], detailTab:tab});
        const messages = document.querySelectorAll('.lx-p0-messages .msg.ai,.lx-p0-messages .lx-p0-message.ai,.lxfd-thread .lxfd-msg-ai');
        const answer = messages[messages.length-1];
        if (answer && !answer.querySelector('[data-checkout-view-order]')) {
          const card = document.createElement('button');
          card.type='button'; card.className='answer-cta lx-payment-chat-card lx-checkout-order-preview';
          card.dataset.checkoutViewOrder=__p0Scope.id;
          card.dataset.lxResultId=tab.id;
          card.innerHTML='<span class="answer-cta-copy"><span class="answer-cta-title">查看订单详情</span></span><span class="answer-cta-icon" aria-hidden="true"></span>';
          (answer.querySelector('.ai-body,.lxfd-ai-body') || answer).appendChild(card);
        }
        (0,__p0Scope.restoreCheckoutDetail)(__p0Scope.id);
        try {window.__lxSaveConversationNow?.();} catch (_) {}
      };
      const clickOrderCenterDetail = () => {
        const trigger = Array.from(document.querySelectorAll('[data-order-detail-id]')).find((item) => String(item.dataset.orderDetailId) === String(paidOrder.orderId));
        if (!trigger) return false;
        trigger.click();
        attachOrderDetailPreview();
        return true;
      };

      if (typeof window.__lxOpenOrdersCenter === 'function') {
        window.__lxOpenOrdersCenter({ question: '' });
        let attempts = 0;
        const openWhenReady = () => {
          if (clickOrderCenterDetail()) return;
          attempts += 1;
          if (attempts < 30) window.setTimeout(openWhenReady, 100);
          else (0,__p0Scope.showToast)('订单已生成，请从右上角“订单”中查看');
        };
        window.requestAnimationFrame(openWhenReady);
        return;
      }

      // 单文件离线版保留旧订单中心，仍通过它自己的“订单详情”委托入口打开。
      window.__lxBridge?.prepareRootSplitState?.();
      window.__lxAgentAPI?.lxRevealContent?.();
      const legacyTrigger = document.createElement('button');
      legacyTrigger.type = 'button';
      legacyTrigger.hidden = true;
      legacyTrigger.dataset.orderDetail = paidOrder.orderId;
      document.body.appendChild(legacyTrigger);
      legacyTrigger.click();
      legacyTrigger.remove();
      const legacyTab = window.__lxState?.tabs?.find(tab => tab.id === 'info:order-detail');
      if (legacyTab) {
        const tab = {...legacyTab,id:'info:checkout-order:'+__p0Scope.id,label:'订单详情 · '+paidOrder.orderId};
        (0,__p0Scope.rememberCheckout)(__p0Scope.id,{...__p0Scope.checkoutRecords[__p0Scope.id],detailTab:tab});
        const host = document.querySelector('.lx-p0-messages');
        if (host) {
          const user = document.createElement('div'); user.className='lx-p0-message msg user';
          user.innerHTML='<div class="user-bubble">查看这笔订单的详细信息</div>';host.appendChild(user);
        }
        window.__lxAgentAPI?.addAiMessage?.('<p>已查询到“'+(0,__p0Scope.escapeHtml)(__p0Scope.product.name)+'”的订单详情，可在右侧查看订单信息。</p><button type="button" class="answer-cta lx-payment-chat-card lx-checkout-order-preview" data-checkout-view-order="'+(0,__p0Scope.escapeHtml)(__p0Scope.id)+'"><span class="answer-cta-copy"><span class="answer-cta-title">查看订单详情</span></span><span class="answer-cta-icon" aria-hidden="true"></span></button>');
        (0,__p0Scope.restoreCheckoutDetail)(__p0Scope.id);
        try {window.__lxSaveConversationNow?.();} catch (_) {}
      }
    }); };
}
window.__p0Modules.dispatch(document.currentScript);

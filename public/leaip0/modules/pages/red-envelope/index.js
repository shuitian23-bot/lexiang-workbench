/* 我的限时红包 — P0 business implementations. */
if (!window.__p0Modules.installed["pages/red-envelope"]) {
window.__p0Modules.installed["pages/red-envelope"]=true;

/* Business: ls */
window.__p0Modules.factories["pages/red-envelope#ls:c15860de15191057fc6d6fca"]=function(__p0Scope){"use strict";return (function ls(){(0,__p0Scope.Qt)("redpacket","限时红包","asset:redpacket","tab")}); };

/* Business: renderRedpacketRecords */
window.__p0Modules.factories["pages/red-envelope#renderRedpacketRecords:299dc3c32aa8e91058ba3787"]=function(__p0Scope){"use strict";return (function renderRedpacketRecords(records) {
    return '<div class="leai-redpacket-table" role="table" aria-label="限时红包明细"><div class="leai-redpacket-table-head" role="row"><span>详情名称</span><span>时间</span><span>金额</span></div>' + records.map(function (record) {
      var amount = String(record.amount).trim();
      var positive = amount.indexOf("+") === 0;
      var sign = /^[+\-−]/.test(amount) ? amount.charAt(0) : "";
      var value = sign ? amount.slice(1) : amount;
      return '<article class="leai-redpacket-record' + (positive ? ' is-income' : ' is-expense') + '" role="row" data-asset-record-status="' + (0,__p0Scope.escapeHtml)(record.status) + '"><strong>' + (0,__p0Scope.escapeHtml)(record.title) + '</strong><time>' + (0,__p0Scope.escapeHtml)(record.time) + '</time><em><span class="leai-amount-sign">' + (0,__p0Scope.escapeHtml)(sign) + '</span><span>' + (0,__p0Scope.escapeHtml)(value) + '</span></em></article>';
    }).join("") + '</div>';
  }); };
}
window.__p0Modules.dispatch(document.currentScript);

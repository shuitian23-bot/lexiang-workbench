(function () {
  'use strict';

  var orders = [
    { purchase: 'B2026081701625', no: '260625101', customer: '陈思雨', goods: 'ThinkVision T24v-30 等2项', qty: 5, amount: 8000, address: '北京·海淀知春路', invoice: '电子/个人', status: '待发货' },
    { purchase: 'B2026081701626', no: '260625102', customer: '周建国', goods: 'ThinkVision TS27Q-40', qty: 3, amount: 2250, address: '天津·东丽空港', invoice: '电子/个人', status: '待签署合同' },
    { purchase: 'B2026081701627', no: '260624107', customer: '李博', goods: 'ThinkPad E14 等2项', qty: 8, amount: 46400, address: '上海·浦东金桥', invoice: '专票/企业', status: '已发货' },
    { purchase: 'B2026081701628', no: '260623103', customer: '张倩', goods: 'ThinkCentre M730t', qty: 10, amount: 42000, address: '广州·天河', invoice: '专票/企业', status: '已完成' },
    { purchase: 'B2026081701629', no: '260622105', customer: '马晓燕', goods: '联想无线键鼠套装 KN100', qty: 20, amount: 2580, address: '杭州·余杭未来科技城', invoice: '电子/企业', status: '已发货' },
    { purchase: 'B2026081701630', no: '260621102', customer: '黄志远', goods: 'ThinkPad X1 Carbon', qty: 4, amount: 31600, address: '深圳·南山科技园', invoice: '专票/企业', status: '已完成' }
  ];
  var state = { purchase: '', no: '', status: '', page: 1, detail: null };
  var statuses = ['全部状态', '待签署合同', '待付款', '待发货', '已发货', '已完成'];

  function esc(value) {
    return String(value == null ? '' : value).replace(/[&<>"']/g, function (char) {
      return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char];
    });
  }
  function money(value) { return '¥' + Number(value).toLocaleString('zh-CN'); }
  function statusTone(value) {
    return ({ '待签署合同': 'sign', '待付款': 'payment', '待发货': 'delivery', '已发货': 'sent', '已完成': 'done' })[value] || 'done';
  }
  function statusBadge(value) {
    return '<span class="apo-status apo-' + statusTone(value) + '"><i></i>' + esc(value) + '</span>';
  }
  function filteredOrders() {
    return orders.filter(function (order) {
      return (!state.purchase || order.purchase.indexOf(state.purchase) >= 0)
        && (!state.no || order.no.indexOf(state.no) >= 0)
        && (!state.status || order.status === state.status);
    });
  }
  function tableRows() {
    var rows = filteredOrders();
    var start = (state.page - 1) * 10;
    var body = rows.slice(start, start + 10).map(function (order) {
      return '<tr><td>' + order.purchase + '</td><td>' + order.no + '</td><td>' + esc(order.customer)
        + '</td><td>' + esc(order.goods) + '</td><td>' + order.qty + '</td><td>' + money(order.amount)
        + '</td><td>' + esc(order.address) + '</td><td>' + esc(order.invoice) + '</td><td>'
        + statusBadge(order.status) + '</td><td><button class="apo-link" onclick="agreementProductOrderDetail(\''
        + order.no + '\')">详情</button></td></tr>';
    }).join('');
    return body || '<tr><td class="apo-empty" colspan="10">暂无符合条件的数据</td></tr>';
  }
  function pager() {
    var total = filteredOrders().length;
    var max = Math.max(1, Math.ceil(total / 10));
    return '<div class="apo-pager"><span>共 ' + total + ' 条</span><button ' + (state.page === 1 ? 'disabled' : '')
      + ' onclick="agreementProductOrderPage(-1)">上一页</button><span>' + state.page + ' / ' + max
      + '</span><button ' + (state.page === max ? 'disabled' : '')
      + ' onclick="agreementProductOrderPage(1)">下一页</button></div>';
  }
  function renderProductOrders() {
    var options = statuses.map(function (status) {
      var value = status === '全部状态' ? '' : status;
      var selected = value === state.status ? ' selected' : '';
      return '<option value="' + value + '"' + selected + '>' + status + '</option>';
    }).join('');
    return '<div class="page-content apo-page"><div class="apo-head"><div><h1>协议产品订单管理</h1>'
      + '<p>查看与处理用户在协议采购单中下单生成的协议产品订单，支持按地址拆单后的多订单跟踪</p></div>'
      + '<button class="btn btn-secondary" onclick="agreementProductOrderExport()">导出当前筛选结果</button></div>'
      + '<section class="apo-filter"><input id="apo-purchase" value="' + esc(state.purchase) + '" placeholder="请输入采购单号">'
      + '<input id="apo-no" value="' + esc(state.no) + '" placeholder="请输入订单编号"><select id="apo-status">' + options + '</select>'
      + '<button class="btn btn-primary" onclick="agreementProductOrderQuery()">查询</button>'
      + '<button class="btn btn-secondary" onclick="agreementProductOrderReset()">重置</button></section>'
      + '<section class="card apo-card"><div class="apo-table-wrap"><table class="apo-table"><thead><tr>'
      + '<th>采购单编号</th><th>订单编号</th><th>客户</th><th>商品信息</th><th>数量</th><th>金额</th>'
      + '<th>收货地址</th><th>发票</th><th>状态</th><th>操作</th></tr></thead><tbody id="apo-body">'
      + tableRows() + '</tbody></table></div><div id="apo-pager">' + pager() + '</div></section></div>';
  }
  function detailField(label, value) {
    return '<div class="apo-detail-field"><span>' + label + '</span><b>' + esc(value) + '</b></div>';
  }
  function renderAgreementProductOrderDetail() {
    var order = state.detail;
    if (!order) return '<div class="page-content apo-page"><button class="btn btn-secondary" onclick="agreementProductOrderBack()">返回协议产品订单管理</button></div>';
    return '<div class="page-content apo-page apo-detail"><button class="btn btn-secondary apo-back" onclick="agreementProductOrderBack()">返回协议产品订单管理</button>'
      + '<div class="apo-detail-layout"><aside class="card apo-profile"><div class="apo-avatar">' + esc(order.customer.slice(0, 1)) + '</div>'
      + '<h2>' + esc(order.customer) + '</h2><div class="apo-profile-status">' + statusBadge(order.status) + '</div>'
      + '<p>采购单编号：' + order.purchase + '</p><p>订单编号：' + order.no + '</p></aside><main class="apo-detail-main">'
      + '<section class="card apo-section"><h2>采购单基本信息</h2><div class="apo-detail-grid">'
      + detailField('采购单编号', order.purchase) + detailField('订单编号', order.no) + detailField('客户', order.customer)
      + detailField('商品概要', order.goods) + detailField('商品总数量', order.qty) + detailField('订单金额', money(order.amount))
      + detailField('收货地址', order.address) + detailField('发票', order.invoice) + detailField('订单状态', order.status)
      + '</div></section><section class="card apo-section"><h2>收货地址明细</h2><div class="apo-address-list">'
      + '<div class="apo-address-item"><b>地址 1</b><span>收货人：' + esc(order.customer) + '</span><span>手机号：138****' + order.no.slice(-4)
      + '</span><strong>' + esc(order.address) + '</strong><em>商品数量：' + order.qty + '</em></div></div></section>'
      + '<section class="card apo-section"><h2>商品明细</h2><div class="apo-table-wrap"><table class="apo-table apo-detail-table"><thead><tr>'
      + '<th>物料编号</th><th>商品名称</th><th>单价</th><th>立项数量</th></tr></thead><tbody><tr><td>WL-T24V30</td><td>'
      + esc(order.goods) + '</td><td>' + money(Math.round(order.amount / order.qty)) + '</td><td>' + order.qty
      + '</td></tr></tbody></table></div></section></main></div></div>';
  }
  function refresh() {
    var body = document.getElementById('apo-body');
    var page = document.getElementById('apo-pager');
    if (body) body.innerHTML = tableRows();
    if (page) page.innerHTML = pager();
  }
  function csvCell(value) {
    var text = String(value == null ? '' : value);
    return /[",\n]/.test(text) ? '"' + text.replace(/"/g, '""') + '"' : text;
  }
  function downloadCsv(content) {
    var blob = new Blob(['\ufeff' + content], { type: 'text/csv;charset=utf-8' });
    var url = URL.createObjectURL(blob);
    var link = document.createElement('a');
    link.href = url;
    link.download = '协议产品订单_' + new Date().toISOString().slice(0, 10) + '.csv';
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  }

  window.agreementProductOrderQuery = function () {
    state.purchase = document.getElementById('apo-purchase').value.trim();
    state.no = document.getElementById('apo-no').value.trim();
    state.status = document.getElementById('apo-status').value;
    state.page = 1;
    refresh();
  };
  window.agreementProductOrderReset = function () {
    state.purchase = '';
    state.no = '';
    state.status = '';
    state.page = 1;
    if (typeof switchPage === 'function') switchPage('order.agreement');
  };
  window.agreementProductOrderPage = function (step) {
    var max = Math.max(1, Math.ceil(filteredOrders().length / 10));
    state.page = Math.max(1, Math.min(max, state.page + step));
    refresh();
  };
  window.agreementProductOrderDetail = function (orderNo) {
    state.detail = orders.find(function (order) { return order.no === orderNo; }) || null;
    if (typeof switchPage === 'function') switchPage('order.agreement.detail');
  };
  window.agreementProductOrderBack = function () {
    if (typeof switchPage === 'function') switchPage('order.agreement');
  };
  window.agreementProductOrderExport = function () {
    var rows = filteredOrders();
    var data = [['采购单编号', '订单编号', '客户', '商品信息', '数量', '金额', '收货地址', '发票', '状态']]
      .concat(rows.map(function (order) {
        return [order.purchase, order.no, order.customer, order.goods, order.qty, order.amount, order.address, order.invoice, order.status];
      }))
      .map(function (row) { return row.map(csvCell).join(','); }).join('\n');
    downloadCsv(data);
    if (window.workspaceNotify) window.workspaceNotify('已导出当前筛选结果，共 ' + rows.length + ' 条');
  };
  window.agreementOrderRefresh = refresh;

  function injectStyle() {
    if (document.getElementById('agreement-product-order-style')) return;
    var style = document.createElement('style');
    style.id = 'agreement-product-order-style';
    style.textContent = '.apo-page{padding:20px 24px 32px}.apo-head{display:flex;justify-content:space-between;gap:16px;align-items:flex-start}.apo-head h1{margin:0;color:#1d2939;font-size:20px;line-height:30px}.apo-head p{margin:4px 0 18px;color:#7b8798;font-size:13px}.apo-filter{display:grid;grid-template-columns:1fr 1fr .72fr auto auto;gap:14px;padding:20px;margin-bottom:20px;background:#fff;border:1px solid #dfe5ed;border-radius:8px}.apo-filter input,.apo-filter select{height:36px;padding:0 14px;color:#344054;background:#fff;border:1px solid #d9e0ea;border-radius:6px}.apo-card{overflow:hidden}.apo-table-wrap{overflow-x:auto}.apo-table{width:100%;min-width:1420px;border-collapse:collapse;color:#1d2939;font-size:13px}.apo-table th{height:52px;padding:0 18px;color:#667085;font-weight:600;white-space:nowrap;text-align:left;background:#f4f6f8;border-bottom:1px solid #e7ebf0}.apo-table td{height:62px;padding:0 18px;white-space:nowrap;border-bottom:1px solid #edf0f4}.apo-status{display:inline-flex;align-items:center;gap:5px;padding:5px 9px;border-radius:14px;font-size:12px;font-weight:600}.apo-status i{width:7px;height:7px;border-radius:50%;background:currentColor}.apo-sign{color:#7a5af8;background:#f4f3ff}.apo-payment{color:#d92d20;background:#fff1f1}.apo-delivery{color:#dc6803;background:#fff7e8}.apo-sent{color:#079455;background:#ecfdf3}.apo-done{color:#98a2b3;background:#f2f4f7}.apo-link{padding:0;color:#2f6bff;background:transparent;border:0;font-size:13px;cursor:pointer}.apo-pager{display:flex;justify-content:flex-end;align-items:center;gap:10px;padding:14px 18px;color:#667085;font-size:13px}.apo-pager button{height:28px;padding:0 10px;color:#475467;background:#fff;border:1px solid #d9e0ea;border-radius:5px;cursor:pointer}.apo-pager button:disabled{color:#b8c0cc;cursor:not-allowed}.apo-empty{text-align:center!important;color:#98a2b3}.apo-back{margin-bottom:20px}.apo-detail-layout{display:grid;grid-template-columns:300px minmax(0,1fr);gap:20px;align-items:start}.apo-profile{padding:28px 22px;text-align:center}.apo-avatar{display:grid;place-items:center;width:112px;height:112px;margin:0 auto 18px;color:#2f6bff;background:#edf3ff;border:1px solid #b6caff;border-radius:50%;font-size:42px;font-weight:700}.apo-profile h2{margin:0 0 8px;font-size:20px}.apo-profile p{margin:10px 0;color:#667085;font-size:13px}.apo-profile-status{margin:20px 0;padding:18px 0;border-top:1px solid #edf0f4}.apo-detail-main{display:grid;gap:20px}.apo-section{padding:0 24px 20px}.apo-section h2{margin:0;padding:20px 0 16px;border-bottom:1px solid #edf0f4;font-size:17px}.apo-detail-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:22px 64px;padding:22px 28px}.apo-detail-field span{display:block;margin-bottom:8px;color:#667085;font-size:13px}.apo-detail-field b{font-size:14px;font-weight:400}.apo-detail-table{min-width:760px}.apo-address-list{display:grid;gap:12px;padding:20px 28px 4px}.apo-address-item{display:grid;grid-template-columns:70px 150px 150px minmax(220px,1fr) 100px;gap:12px;align-items:center;padding:14px 16px;background:#f8fafc;border:1px solid #e7ecf3;border-radius:6px;font-size:13px}.apo-address-item span{color:#667085}.apo-address-item strong{font-weight:400}.apo-address-item em{color:#667085;font-style:normal}@media(max-width:900px){.apo-filter{grid-template-columns:1fr 1fr}.apo-detail-layout{grid-template-columns:1fr}.apo-profile{display:none}}';
    document.head.appendChild(style);
  }
  function register() {
    if (typeof PAGE_RENDERERS === 'undefined') return setTimeout(register, 30);
    injectStyle();
    PAGE_RENDERERS['order.agreement']=renderProductOrders;
    PAGE_RENDERERS['order.agreement.detail']=renderAgreementProductOrderDetail;
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', register);
  else register();
}());

(function () {
  'use strict';
  var purchaseStates = {
    B2026081701625:'已支付', B2026081701626:'待签署合同', B2026081701627:'已支付',
    B2026081701628:'已支付', B2026081701629:'待支付', B2026081701630:'已支付'
  };
  var purchaseMainOrders = {
    B2026081701625:'260625101', B2026081701626:'260625102', B2026081701627:'260624107',
    B2026081701628:'260623103', B2026081701629:'260622105', B2026081701630:'260621102'
  };
  var purchaseOrders = {
    PO202608170001:{purchase:'B2026081701625', shippingStatus:'待发货'},
    PO202608170002:{purchase:'B2026081701626', shippingStatus:'待发货'},
    PO202608170003:{purchase:'B2026081701627', shippingStatus:'已发货'},
    PO202608170004:{purchase:'B2026081701628', shippingStatus:'已完成'},
    PO202608170005:{purchase:'B2026081701629', shippingStatus:'待发货'},
    PO202608170006:{purchase:'B2026081701630', shippingStatus:'已完成'},
    PO202608170007:{purchase:'B2026081701625', shippingStatus:'待发货'},
    PO202608170008:{purchase:'B2026081701625', shippingStatus:'已发货'}
  };
  var orders = [
    { no:'260625101', customer:'陈思雨', goods:'ThinkVision T24v-30', qty:5, amount:8000, address:'北京·海淀知春路', invoice:'电子/个人' },
    { no:'260625102', customer:'周建国', goods:'ThinkVision TS27Q-40', qty:3, amount:2250, address:'天津·东丽空港', invoice:'电子/个人' },
    { no:'260624107', customer:'李博', goods:'ThinkPad E14', qty:8, amount:46400, address:'上海·浦东金桥', invoice:'专票/企业' },
    { no:'260623103', customer:'张倩', goods:'ThinkCentre M730t', qty:10, amount:42000, address:'广州·天河', invoice:'专票/企业' },
    { no:'260622105', customer:'马晓燕', goods:'联想无线键鼠套装 KN100', qty:20, amount:2580, address:'杭州·余杭未来科技城', invoice:'电子/企业' },
    { no:'260621102', customer:'黄志远', goods:'ThinkPad X1 Carbon', qty:4, amount:31600, address:'深圳·南山科技园', invoice:'专票/企业' },
    { no:'260625108', po:'PO202608170007', customer:'陈思雨', goods:'ThinkVision T24v-30', qty:2, amount:3200, address:'天津·南开红旗路', invoice:'专票/企业', paymentMethod:'银行卡支付' },
    { no:'260625109', po:'PO202608170008', customer:'陈思雨', goods:'联想USB-C扩展坞', qty:3, amount:4500, address:'北京·通州运河路', invoice:'电子/个人', paymentMethod:'对公转账' }
  ];
  // Purchase payment and PO shipping are separate sources of truth; each row represents one SO.
  orders.forEach(function(o, index) {
    o.po = o.po || 'PO20260817' + String(index+1).padStart(4, '0');
    o.purchase = purchaseOrders[o.po].purchase;
    o.so = 'SO20260817' + String(index+1).padStart(4, '0');
    o.paymentMethod = o.paymentMethod || ['对公转账', '微信支付', '对公转账', '银行卡支付', '支付宝支付', '对公转账'][index];
    o.materialCode = ['WL-T24V30','WL-TS27Q40','WL-E14','WL-M730T','WL-KN100','WL-X1C','WL-T24V30','WL-USBC'][index];
    o.phone = '1380000' + o.no.slice(-4);
  });
  var state = { purchase:'', no:'', status:'', page:1, detailPurchase:'' };
  var customerModalTrigger = null;
  var statuses = ['全部采购单状态', '待签署合同', '待支付', '已支付'];
  function esc(v) { return String(v == null ? '' : v).replace(/[&<>"']/g, function (c) { return ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'})[c]; }); }
  function money(v) { return '¥' + Number(v).toLocaleString('zh-CN'); }
  function tone(v) { return ({'待签署合同':'sign','待支付':'payment','已支付':'sent','待发货':'delivery','已发货':'sent','已完成':'done'})[v] || 'done'; }
  function badge(v) { return v==='—' ? '—' : '<span class="apo-status apo-'+tone(v)+'"><i></i>'+esc(v)+'</span>'; }
  function purchaseStatus(o) { return purchaseStates[o.purchase] || '—'; }
  function poShippingStatus(o) { return purchaseStatus(o)==='已支付' ? (purchaseOrders[o.po]?.shippingStatus || '—') : '—'; }
  function maskName(value) { var chars=Array.from(String(value || '')); return chars.length ? chars[0] + '*'.repeat(Math.max(1, chars.length-1)) : '-'; }
  function maskPhone(value) { var phone=String(value || ''); return phone.length===11 ? phone.slice(0,3)+'****'+phone.slice(-4) : '****'; }
  function maskAddress(value) { var address=String(value || ''), region=address.includes('·') ? address.split('·')[0] : (address.match(/^(.+?市)/) || [,''])[1]; return address ? region+'******' : '-'; }
  function orderAddresses(o) {
    return [{ recipient:o.customer, phone:o.phone, address:o.address }];
  }
  function addressRows(o, plain) {
    return orderAddresses(o).map(function(a) {
      return '<div class="apo-address-item"><b>PO号：'+esc(o.po)+'</b><span>SO号：'+esc(o.so)+'</span><span>订单号：'+esc(o.no)+'</span><span>收货人：'+esc(plain ? a.recipient : maskName(a.recipient))+'</span><span>手机号：'+esc(plain ? a.phone : maskPhone(a.phone))+'</span><strong>'+esc(plain ? a.address : maskAddress(a.address))+'</strong></div>';
    }).join('');
  }
  function poMembers(po) { return orders.filter(function(o){return o.po===po;}); }
  function data() { return orders.filter(function(o){ return (!state.purchase || o.purchase.indexOf(state.purchase)>=0) && (!state.no || o.no.indexOf(state.no)>=0) && (!state.status || purchaseStatus(o)===state.status); }); }
  function tableRows() {
    var all=data(), start=(state.page-1)*10;
    return all.slice(start,start+10).map(function(o) {
      return '<tr><td>'+o.purchase+'</td><td>'+o.no+'</td><td>'+esc(maskName(o.customer))+'</td><td>'+esc(o.goods)+'</td><td>'+o.qty+'</td><td>'+money(o.amount)+'</td><td>'+esc(o.paymentMethod)+'</td><td>'+esc(maskAddress(o.address))+'</td><td>'+esc(o.invoice)+'</td><td>'+badge(purchaseStatus(o))+'</td><td><div class="apo-row-actions"><button class="apo-link" onclick="agreementProductOrderDetail(\''+o.purchase+'\')">详情</button><button class="apo-link" onclick="agreementProductOrderViewPlain(\''+o.purchase+'\',\'purchase\')">查看明文信息</button></div></td></tr>';
    }).join('') || '<tr><td class="apo-empty" colspan="11">暂无符合条件的数据</td></tr>';
  }
  function pager() { var max=Math.max(1,Math.ceil(data().length/10)); return '<div class="apo-pager"><span>共 '+data().length+' 条</span><button '+(state.page===1?'disabled':'')+' onclick="agreementProductOrderPage(-1)">上一页</button><span>'+state.page+' / '+max+'</span><button '+(state.page===max?'disabled':'')+' onclick="agreementProductOrderPage(1)">下一页</button></div>'; }
  function renderProductOrders() {
    var opts=statuses.map(function(s,index){return '<option value="'+(index===0 ? '' : s)+'"'+((index===0 ? !state.status : state.status===s)?' selected':'')+'>'+s+'</option>';}).join('');
    return '<div class="page-content apo-page"><div class="apo-head"><div><h1>协议采购订单</h1><p>查看与处理用户在协议采购单中下单生成的协议产品订单，支持按地址拆单后的多订单跟踪</p></div></div><section class="apo-filter"><input id="apo-purchase" value="'+esc(state.purchase)+'" placeholder="请输入采购单号"><input id="apo-no" value="'+esc(state.no)+'" placeholder="请输入订单编号"><select id="apo-status" aria-label="采购单状态">'+opts+'</select><button class="btn btn-primary" onclick="agreementProductOrderQuery()">查询</button></section><section class="card apo-card"><div class="apo-table-wrap"><table class="apo-table"><thead><tr><th>采购单编号</th><th>订单编号</th><th>客户</th><th>商品信息</th><th>数量</th><th>金额</th><th>支付方式</th><th>收货地址</th><th>发票</th><th>采购单状态</th><th>操作</th></tr></thead><tbody id="apo-body">'+tableRows()+'</tbody></table></div><div id="apo-pager">'+pager()+'</div></section></div>';
  }
  function detailField(label,value) { return '<div class="apo-detail-field"><span>'+label+'</span><b>'+esc(value)+'</b></div>'; }
  function statusField(label,value) { return '<div class="apo-detail-field"><span>'+label+'</span><div>'+badge(value)+'</div></div>'; }
  function purchaseMembers(purchase) { return orders.filter(function(o){return o.purchase===purchase;}); }
  function joinedValues(members,key) { return Array.from(new Set(members.map(function(o){return o[key];}))).join('、'); }
  function poProducts(members) {
    var products=new Map();
    members.forEach(function(o) {
      var unitCents=o.qty>0 ? Math.round(o.amount*100/o.qty) : 0;
      var key=JSON.stringify([o.materialCode,o.goods,unitCents]);
      var product=products.get(key) || {name:o.goods,materialCode:o.materialCode,unitCents:unitCents,qty:0,totalCents:0};
      product.qty+=o.qty;
      product.totalCents+=Math.round(o.amount*100);
      products.set(key,product);
    });
    return Array.from(products.values());
  }
  function renderPoDetail(po,members) {
    var customers=members.map(function(o) {
      return orderAddresses(o).map(function(a){return '<tr><td>'+esc(maskName(o.customer))+'</td><td>'+esc(maskName(a.recipient))+'</td><td>'+esc(maskAddress(a.address))+'</td><td>'+esc(maskPhone(a.phone))+'</td></tr>';}).join('');
    }).join('');
    var products=poProducts(members).map(function(p){return '<tr><td>'+esc(p.name)+'</td><td>'+esc(p.materialCode)+'</td><td>'+p.qty+'</td><td>'+money(p.unitCents/100)+'</td><td>'+money(p.totalCents/100)+'</td></tr>';}).join('');
    return '<section class="card apo-section apo-po-section" data-po="'+esc(po)+'"><h2>PO明细 <small>'+esc(po)+'</small></h2>'
      +'<h3>PO信息</h3><div class="apo-detail-grid apo-po-grid">'+detailField('PO单号',po)+detailField('SO',joinedValues(members,'so'))+detailField('订单号',joinedValues(members,'no'))+statusField('PO发货状态',poShippingStatus(members[0]))+'</div>'
      +'<h3>客户信息</h3><div class="apo-table-wrap"><table class="apo-table apo-detail-table"><thead><tr><th>客户名称</th><th>收货人</th><th>收货地址</th><th>收货电话</th></tr></thead><tbody id="apo-customers-'+esc(po)+'">'+customers+'</tbody></table></div>'
      +'<h3>商品信息</h3><div class="apo-table-wrap"><table class="apo-table apo-detail-table"><thead><tr><th>商品名称</th><th>物料编号</th><th>商品数量</th><th>单价</th><th>总价</th></tr></thead><tbody id="apo-products-'+esc(po)+'">'+products+'</tbody></table></div></section>';
  }
  function renderAgreementProductOrderDetail() {
    // Resolve all POs for the purchase independently of the list query or entry SO.
    var members=purchaseMembers(state.detailPurchase);
    var back='<button class="btn btn-secondary apo-back" onclick="agreementProductOrderBack()">← 返回协议采购订单</button>';
    if(!members.length) return '<div class="page-content apo-page">'+back+'<div class="apo-empty">未找到对应采购单</div></div>';
    var qty=members.reduce(function(sum,o){return sum+o.qty;},0);
    var paidAmount=purchaseStatus(members[0])==='已支付' ? members.reduce(function(sum,o){return sum+Math.round(o.amount*100);},0)/100 : 0;
    var grouped=new Map();
    members.forEach(function(o){if(!grouped.has(o.po)) grouped.set(o.po,[]);grouped.get(o.po).push(o);});
    return '<div class="page-content apo-page apo-detail">'+back+'<header class="apo-head"><h1>采购单详情</h1></header><main class="apo-detail-main">'
      +'<section class="card apo-section"><h2>采购单基本信息</h2><div class="apo-detail-grid">'+detailField('采购单编号',state.detailPurchase)+detailField('主订单',purchaseMainOrders[state.detailPurchase] || members[0].no)+detailField('商品总数量',qty)+detailField('支付总金额',money(paidAmount))+detailField('发票信息',joinedValues(members,'invoice'))+detailField('支付方式',joinedValues(members,'paymentMethod'))+statusField('采购单状态',purchaseStatus(members[0]))+'</div></section>'
      +Array.from(grouped,function(entry){return renderPoDetail(entry[0],entry[1]);}).join('')+'</main></div>';
  }
  function closeCustomerModal(restoreFocus) {
    var root=document.getElementById('agreement-order-modal-root');
    if(root) root.remove();
    if(restoreFocus && customerModalTrigger && customerModalTrigger.isConnected) customerModalTrigger.focus();
    customerModalTrigger=null;
  }
  window.agreementProductOrderClosePlain=function(){ closeCustomerModal(true); };
  window.agreementProductOrderViewPlain=function(id,scope) {
    closeCustomerModal(false);
    var members=scope==='purchase' ? purchaseMembers(id) : scope==='po' ? poMembers(id) : orders.filter(function(item){return item.no===id;});
    if(!members.length) return;
    var o=members[0];
    customerModalTrigger=document.activeElement;
    var root=document.createElement('div');
    root.id='agreement-order-modal-root';
    root.innerHTML='<div class="modal-mask show" onclick="if(event.target===this)agreementProductOrderClosePlain()"><div class="modal apo-customer-modal" role="dialog" aria-modal="true" aria-labelledby="apo-customer-title"><div class="modal-header"><h3 id="apo-customer-title">客户明文信息</h3><button class="modal-close apo-close-plain" type="button" aria-label="关闭客户明文信息" title="关闭" onclick="agreementProductOrderClosePlain()">&times;</button></div><div class="modal-body"><div class="apo-detail-grid">'+detailField('采购单编号',o.purchase)+detailField('主订单号',purchaseMainOrders[o.purchase] || o.no)+'</div><h4 class="apo-modal-subtitle">收货地址</h4><div class="apo-address-list">'+members.map(function(item){return addressRows(item,true);}).join('')+'</div></div><div class="modal-footer"><button class="btn btn-secondary" onclick="agreementProductOrderClosePlain()">关闭</button></div></div></div>';
    document.body.appendChild(root);
    root.addEventListener('keydown', function(event) {
      if(event.key==='Escape') { event.preventDefault(); window.agreementProductOrderClosePlain(); return; }
      if(event.key==='Tab') {
        var buttons=root.querySelectorAll('button'), first=buttons[0], last=buttons[buttons.length-1];
        if(event.shiftKey && document.activeElement===first) { event.preventDefault(); last.focus(); }
        else if(!event.shiftKey && document.activeElement===last) { event.preventDefault(); first.focus(); }
      }
    });
    root.querySelector('.apo-close-plain')?.focus();
  };
  window.addEventListener('popstate', function(){ closeCustomerModal(false); });
  function refresh() { var body=document.getElementById('apo-body'), page=document.getElementById('apo-pager'); if(body) body.innerHTML=tableRows(); if(page) page.innerHTML=pager(); }
  window.agreementProductOrderQuery=function(){ state.purchase=document.getElementById('apo-purchase')?.value||''; state.no=document.getElementById('apo-no')?.value||''; state.status=document.getElementById('apo-status')?.value||''; state.page=1; refresh(); };
  window.agreementProductOrderPage=function(step){ var max=Math.max(1,Math.ceil(data().length/10)); state.page=Math.max(1,Math.min(max,state.page+step)); refresh(); };
  window.agreementProductOrderDetail=function(key){ var o=orders.find(function(item){return item.purchase===key || item.po===key || item.no===key;}); state.detailPurchase=o ? o.purchase : ''; closeCustomerModal(false); if(typeof switchPage==='function') switchPage('order.agreement.detail'); };
  window.agreementProductOrderBack=function(){ closeCustomerModal(false); if(typeof switchPage==='function') switchPage('order.agreement'); };
  function csvCell(value) {
    var text=String(value == null ? '' : value);
    if(/^[\s]*[=+\-@]/.test(text)) text="'"+text;
    return '"'+text.replace(/"/g,'""')+'"';
  }
  window.agreementProductOrderExport=function(plain) {
    plain=plain===true;
    var list=data();
    if(!list.length) { if(window.workspaceNotify) window.workspaceNotify('当前查询结果为空，暂无可导出的订单'); return; }
    var rows=[['采购单编号','订单编号','PO','SO','客户','商品信息','数量','金额','支付方式','收货人','手机号','收货地址','发票','采购单状态','PO发货状态']];
    list.forEach(function(o) {
      var addresses=orderAddresses(o);
      rows.push([o.purchase,o.no,o.po,o.so,plain ? o.customer : maskName(o.customer),o.goods,o.qty,o.amount,o.paymentMethod,
        addresses.map(function(a){return plain ? a.recipient : maskName(a.recipient);}).join('；'),
        addresses.map(function(a){return plain ? a.phone : maskPhone(a.phone);}).join('；'),
        addresses.map(function(a){return plain ? a.address : maskAddress(a.address);}).join('；'),o.invoice,purchaseStatus(o),poShippingStatus(o)]);
    });
    var content=rows.map(function(row){return row.map(csvCell).join(',');}).join('\r\n');
    var blob=new Blob(['\ufeff',content],{type:'text/csv;charset=utf-8;'}), url=URL.createObjectURL(blob), link=document.createElement('a');
    link.href=url;
    link.download='协议产品订单_'+(plain ? '明文' : '脱敏')+'_'+new Date().toISOString().slice(0,10)+'.csv';
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(function(){URL.revokeObjectURL(url);},1000);
    if(window.workspaceNotify) window.workspaceNotify((plain ? '明文' : '脱敏')+'导出成功，共 '+list.length+' 条');
  };
  window.agreementOrderRefresh=function(){ refresh(); };
  function style() { if(document.getElementById('agreement-product-order-style')) return; var el=document.createElement('style'); el.id='agreement-product-order-style'; el.textContent='.apo-page{padding:20px 24px 32px}.apo-head{display:flex;justify-content:space-between;gap:16px;align-items:flex-start}.apo-head h1{margin:0;color:#1d2939;font-size:20px;line-height:30px}.apo-head p{margin:4px 0 18px;color:#7b8798;font-size:13px}.apo-filter{display:grid;grid-template-columns:1fr 1fr .72fr auto;gap:14px;padding:20px;margin-bottom:20px;background:#fff;border:1px solid #dfe5ed;border-radius:8px}.apo-filter input,.apo-filter select{height:36px;padding:0 14px;color:#344054;background:#fff;border:1px solid #d9e0ea;border-radius:6px}.apo-card{overflow:hidden}.apo-table-wrap{overflow-x:auto}.apo-table{width:100%;min-width:1420px;border-collapse:collapse;color:#1d2939;font-size:13px}.apo-table th{height:52px;padding:0 18px;color:#667085;font-weight:600;white-space:nowrap;text-align:left;background:#f4f6f8;border-bottom:1px solid #e7ebf0}.apo-table td{height:62px;padding:0 18px;white-space:nowrap;border-bottom:1px solid #edf0f4}.apo-status{display:inline-flex;align-items:center;gap:5px;padding:5px 9px;border-radius:14px;font-size:12px;font-weight:600}.apo-status i{width:7px;height:7px;border-radius:50%;background:currentColor}.apo-sign{color:#7a5af8;background:#f4f3ff}.apo-payment{color:#d92d20;background:#fff1f1}.apo-delivery{color:#dc6803;background:#fff7e8}.apo-sent{color:#079455;background:#ecfdf3}.apo-done{color:#98a2b3;background:#f2f4f7}.apo-link{padding:0;color:#2f6bff;background:transparent;border:0;font-size:13px;cursor:pointer}.apo-pager{display:flex;justify-content:flex-end;align-items:center;gap:10px;padding:14px 18px;color:#667085;font-size:13px}.apo-pager button{height:28px;padding:0 10px;color:#475467;background:#fff;border:1px solid #d9e0ea;border-radius:5px;cursor:pointer}.apo-pager button:disabled{color:#b8c0cc;cursor:not-allowed}.apo-empty{text-align:center!important;color:#98a2b3}.apo-back{margin-bottom:20px}.apo-detail .apo-head{margin-bottom:20px}.apo-detail-main{display:grid;grid-template-columns:minmax(0,1fr);gap:20px;min-width:0;width:100%}.apo-section{padding:0 24px 20px}.apo-section h2{margin:0;padding:20px 0 16px;border-bottom:1px solid #edf0f4;font-size:17px}.apo-section h2:before{display:inline-block;width:4px;height:22px;margin-right:10px;vertical-align:-5px;background:#2f6bff;border-radius:4px;content:""}.apo-section h2 small{margin-left:8px;color:#98a2b3;font-size:13px;font-weight:400}.apo-detail-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:22px 64px;padding:22px 28px}.apo-detail-field>span{display:block;margin-bottom:8px;color:#667085;font-size:13px}.apo-detail-field b{font-size:14px;font-weight:400}.apo-detail .apo-detail-field{min-width:0;overflow-wrap:anywhere}.apo-po-section h3{margin:16px 0 12px;font-size:14px;font-weight:600;color:#344054}.apo-detail .apo-po-grid{padding:0;gap:16px 32px}.apo-po-section h2 small{display:inline-block;overflow-wrap:anywhere;max-width:100%;margin-left:8px}html[data-product="leaibot"] .apo-detail>.apo-back{display:inline-flex;align-items:center;justify-content:center;align-self:flex-start;width:max-content!important;max-width:100%!important;min-width:0!important;padding:0 12px;white-space:nowrap}.apo-detail .apo-back{justify-self:start}.apo-detail .apo-detail-main>.apo-section{margin:0}.apo-detail-table{min-width:760px}.apo-address-list{display:grid;gap:12px;padding:20px 28px 4px}.apo-address-item{display:grid;grid-template-columns:repeat(auto-fit,minmax(160px,1fr));gap:12px;align-items:center;padding:14px 16px;background:#f8fafc;border:1px solid #e7ecf3;border-radius:6px;font-size:13px}.apo-address-item b{color:#344054}.apo-address-item span{color:#667085}.apo-address-item strong{font-weight:400;color:#1d2939}.apo-address-item em{color:#667085;font-style:normal}@media(max-width:900px){.apo-filter{grid-template-columns:1fr 1fr}.apo-address-item{grid-template-columns:1fr}}@media(max-width:600px){.apo-detail .apo-detail-grid{grid-template-columns:minmax(0,1fr);padding:20px 0}.apo-detail .apo-address-list{padding:20px 0 4px}.apo-detail-field{min-width:0;overflow-wrap:anywhere}}.apo-head{flex-wrap:wrap}.apo-head>div:first-child{min-width:0;flex:1 1 360px}.apo-head-actions{display:flex;align-items:center;gap:8px;flex-wrap:wrap}.apo-row-actions{display:flex;align-items:center;gap:12px;min-width:144px}.modal.apo-customer-modal{width:640px;max-width:calc(100vw - 32px)}.apo-customer-modal .apo-detail-grid{padding:0;gap:16px;grid-template-columns:repeat(auto-fit,minmax(160px,1fr))}.apo-customer-modal .apo-address-list{padding:0}.apo-customer-modal .apo-address-item{grid-template-columns:repeat(2,minmax(0,1fr));padding:12px}.apo-customer-modal .apo-address-item>*{min-width:0;overflow-wrap:anywhere}.apo-customer-modal .apo-address-item strong{grid-column:1/-1}.apo-modal-subtitle{margin:20px 0 12px;font-size:var(--text-sm,13px);font-weight:600;color:var(--text)}.apo-close-plain{border:0;background:transparent;line-height:1;width:28px;height:28px;display:grid;place-items:center}.apo-close-plain:focus-visible{outline:2px solid var(--primary);outline-offset:2px}@media(max-width:480px){.apo-customer-modal .apo-detail-grid,.apo-customer-modal .apo-address-item{grid-template-columns:minmax(0,1fr)}}'; document.head.appendChild(el); }
  function register(){ if(typeof PAGE_RENDERERS==='undefined'){setTimeout(register,30);return;} style(); PAGE_RENDERERS['order.agreement']=renderProductOrders; PAGE_RENDERERS['order.agreement.detail']=renderAgreementProductOrderDetail; }
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',register); else register();
}());

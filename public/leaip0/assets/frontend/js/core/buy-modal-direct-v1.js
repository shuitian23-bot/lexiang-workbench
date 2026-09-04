/* p0-purchase-context:start */
/* Product-to-order boundary. No title scraping, demo fallback, or payment writes. */
(() => {
  'use strict';
  const clean = value => String(value ?? '').trim();
  const esc = value => clean(value).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  function normalize(product) {
    if (!product || typeof product !== 'object') throw new Error('请选择具体商品后再下单');
    const sku=clean(product.sku), name=clean(product.name), price=Number(product.price);
    if (!sku || !name || !Number.isFinite(price) || price <= 0) throw new Error('商品数据不完整，请重新打开商品详情');
    let specs=product.specs || {};
    if(typeof specs==='string'){try{specs=JSON.parse(specs);}catch{specs={};}}
    if(!specs || typeof specs!=='object' || Array.isArray(specs))specs={};
    const description=clean(specs.configuration_name || product.description);
    const image=clean(product.image_url || product.image || specs.white_image_url);
    if(image && !/^(?:https?:\/\/|\/|\.\.?\/)/i.test(image)) throw new Error('商品图片地址无效');
    return Object.freeze({
      sku,name,price,originalPrice:price,discount:0,image_url:image,
      category:clean(product.category),series:clean(specs.spu_name || product.category || '联想'),
      configuration:description || '以所选商品详情为准',
      size:clean(specs.screen_size || specs.display_size || description.match(/\d+(?:\.\d+)?\s*英寸/)?.[0] || '以商品详情为准'),
      color:clean(specs.color || product.color),specs:Object.freeze({...specs})
    });
  }
  function targetSku(button, state) {
    const card=button?.closest?.('[data-buy-sku],[data-open-product],[data-product-id],[data-sku]');
    const explicit=clean(card?.dataset.buySku || card?.dataset.openProduct || card?.dataset.productId || card?.dataset.sku);
    if(explicit)return explicit;
    if(button?.closest?.('.product-detail,.detail-main,.detail-page,.lx-product-detail,.lx-buybar')) {
      const active=state?.tabs?.find(t=>t.id===state.activeTabId && t.kind==='detail');
      return clean(active?.sku || state?.currentProduct?.sku);
    }
    return '';
  }
  async function read(sku) {
    if(!sku)throw new Error('未能确定所选商品，请从商品详情重新下单');
    if(!window.__lxProductData?.product)throw new Error('商品数据服务未准备好，请稍后重试');
    const product=normalize(await window.__lxProductData.product(sku));
    if(product.sku!==String(sku))throw new Error('商品配置已变化，请重新选择');
    return product;
  }
  function fromButton(button){return read(targetSku(button,window.__lxState));}
  async function options(sku){
    if(!window.__lxProductData?.variants)throw new Error('配置数据服务未准备好');
    const result=await window.__lxProductData.variants(sku);
    if(!Array.isArray(result?.variants)||!result.variants.length)throw new Error('暂时无法读取商品配置，请重试');
    return result.variants;
  }
  function renderConfig({dialog,product,quantity,onSelect,onError}) {
    dialog.className='lx-buy-direct-dialog lx-order-edit-dialog lx-config-dialog';
    dialog.innerHTML='<header class="lx-order-edit-head"><button class="lx-order-edit-back" type="button" data-config-back aria-label="返回订单">‹</button><h2>修改商品</h2><button class="lx-buy-direct-close" type="button" aria-label="关闭">×</button></header><div class="lx-order-edit-body"><section class="lx-config-section"><h3>选择商品配置</h3><div data-purchase-options role="status">正在读取本系列配置…</div></section><section class="lx-config-section"><h3>数量</h3><button type="button" data-config-minus aria-label="减少数量">−</button> <span>'+quantity+'</span> <button type="button" data-config-plus aria-label="增加数量">+</button></section></div><footer class="lx-order-edit-foot"><button type="button" class="primary" data-config-save>确认配置</button></footer>';
    const host=dialog.querySelector('[data-purchase-options]');
    const current=()=>host.isConnected && dialog.contains(host);
    function fail(error){if(!current())return;host.textContent=error.message;const retry=document.createElement('button');retry.type='button';retry.textContent='重试';retry.onclick=()=>renderConfig({dialog,product,quantity,onSelect,onError});host.append(' ',retry);onError?.(error);}
    options(product.sku).then(rows=>{
      if(!current())return;
      host.removeAttribute('role');host.className='lx-config-options';
      host.innerHTML=rows.map(row=>'<button type="button" class="lx-config-option'+(String(row.sku)===product.sku?' is-active':'')+'" data-purchase-sku="'+esc(row.sku)+'" aria-pressed="'+(String(row.sku)===product.sku)+'">'+esc(row.specs?.configuration_name || row.description || row.name || row.sku)+' · ¥'+esc(row.price)+'</button>').join('');
      host.querySelectorAll('[data-purchase-sku]').forEach(button=>button.addEventListener('click',async()=>{
        const sku=button.dataset.purchaseSku;
        host.querySelectorAll('button').forEach(b=>b.disabled=true);host.setAttribute('aria-busy','true');
        try{const selected=await read(sku);if(current())onSelect(selected);}catch(error){fail(error);}
      }));
    }).catch(fail);
  }
  window.__lxPurchaseContext=Object.freeze({normalize,targetSku,read,fromButton,options,renderConfig});
})();

/* p0-purchase-context:end */
/* v40-invoice-remark-delay-20260903 */
(() => {
  const AIR_13_IMAGE = '/leai%20product%20data/shop-chat%20product%20data/%E7%AC%94%E8%AE%B0%E6%9C%AC/08_SPU_%E8%81%94%E6%83%B3%E5%B0%8F%E6%96%B0_Air_13/%E7%99%BD%E5%BA%95%E5%9B%BE.jpg';
  const FALLBACK_IMAGE = '/assets/product-placeholder.svg';
  const SPARKLE_ICON = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"%3E%3Cpath fill="%23000" d="M12 1l1.8 5.2L19 8l-5.2 1.8L12 15l-1.8-5.2L5 8l5.2-1.8L12 1zm7 12l1 2.9 3 1.1-3 1-1 3-1-3-3-1 3-1.1L19 13zM5 14l1.2 3.5L10 19l-3.8 1.3L5 24l-1.2-3.7L0 19l3.8-1.5L5 14z"/%3E%3C/svg%3E';
  const ADDRESS_ICON = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"%3E%3Cpath fill="none" stroke="%23681057" stroke-width="1.8" d="M12 21s7-6.1 7-12A7 7 0 1 0 5 9c0 5.9 7 12 7 12z"/%3E%3Ccircle cx="12" cy="9" r="2.4" fill="%23681057"/%3E%3C/svg%3E';
  const escapeHtml = (value) => String(value ?? '').replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
  const imageForProduct = (name, current) => /小新\s*Air\s*13/i.test(name) ? AIR_13_IMAGE : (current && !/^https?:\/\//i.test(current) ? current : FALLBACK_IMAGE);

  if (!document.querySelector('[data-buy-modal-direct-style]')) {
    const style = document.createElement('style');
    style.dataset.buyModalDirectStyle = 'true';
    style.textContent = `[data-buy-modal-direct]{position:fixed;inset:0;z-index:100000;font-family:"Source Han Sans CN","PingFang SC",sans-serif;font-size:12px}.lx-buy-direct-mask{position:absolute;inset:0;background:rgba(31,20,38,.55);backdrop-filter:blur(3px)}.lx-buy-direct-dialog{position:absolute;left:50%;top:50%;width:min(540px,calc(100vw - 32px));max-height:calc(100vh - 32px);transform:translate(-50%,-50%);box-sizing:border-box;padding:20px 22px 18px;border:1px solid #e2ddeb;border-radius:12px;background:#fff;color:#19171b;box-shadow:0 18px 52px rgba(31,20,38,.18);overflow:auto}.lx-buy-direct-dialog h2{width:max-content;display:flex;align-items:center;margin:0 0 14px;background:linear-gradient(90deg,#4d144a 12%,#b8252e);-webkit-background-clip:text;background-clip:text;color:transparent;-webkit-text-fill-color:transparent;font-size:16px;font-weight:600;line-height:22px}.lx-buy-direct-dialog h2:before{content:"";width:16px;height:16px;flex:0 0 16px;margin-right:8px;background:linear-gradient(135deg,#4d144a 12%,#b8252e);-webkit-mask:url('${SPARKLE_ICON}') center/contain no-repeat;mask:url('${SPARKLE_ICON}') center/contain no-repeat}.lx-buy-direct-close{position:absolute;right:18px;top:16px;width:24px;height:24px;border:0;background:transparent;color:#77717d;font-size:22px;line-height:1;cursor:pointer}.lx-buy-direct-card{padding:14px 16px 12px;border:1px solid #e2ddeb;border-radius:8px;background:#fcfaff}.lx-buy-direct-product{display:grid;grid-template-columns:60px 1fr auto;gap:12px;align-items:center;padding-bottom:10px;border-bottom:1px solid #e6dfe9}.lx-buy-direct-product img{width:60px;height:60px;object-fit:contain;border-radius:4px;background:#fff}.lx-buy-direct-product-copy{display:grid;gap:4px;min-width:0}.lx-buy-direct-product-copy strong{overflow:hidden;font-size:13px;font-weight:500;text-overflow:ellipsis;white-space:nowrap}.lx-buy-direct-product-copy span{color:#37313b;font-size:11px}.lx-buy-direct-config{border:0;background:transparent;color:#4d144a;font-size:12px;font-weight:600;cursor:pointer}.lx-buy-direct-section{padding:7px 0;border-bottom:1px solid #e6dfe9}.lx-buy-direct-section:last-of-type{border-bottom:0}.lx-buy-direct-row{display:grid;grid-template-columns:70px 1fr;gap:0;padding:2px 0;font-size:12px;line-height:16px}.lx-buy-direct-row strong{font-weight:600}.lx-buy-direct-price{display:flex;align-items:baseline;gap:8px;margin-top:10px;line-height:22px}.lx-buy-direct-price strong{font-size:12px}.lx-buy-direct-price b{color:#ff2f2f;font-size:16px}.lx-buy-direct-price span{color:#19171b;font-size:12px}.lx-buy-direct-price span em{color:#ff2f2f;font-style:normal}.lx-buy-direct-detail{margin-top:0;color:#454545;font-size:12px;line-height:16px}.lx-buy-direct-detail strong{color:#454545;font-weight:500}.lx-buy-direct-detail span{margin-left:8px;color:#ff2f2f}.lx-buy-direct-actions{display:flex;justify-content:flex-end;gap:12px;margin-top:14px}.lx-buy-direct-actions button{width:96px;height:35px;min-width:0;padding:0;border:1px solid #d3bfd2;border-radius:100px;background:#fff;color:#4d144a;font-size:13px;font-weight:500;cursor:pointer}.lx-buy-direct-actions .primary{width:92px;border:0;background:linear-gradient(90deg,#4d144a 12%,#b8252e);color:#fff}.lx-buy-direct-footnote{margin:7px 0 0;text-align:right;color:#c1a9c0;font-size:10px;line-height:12px}@media(max-width:560px){.lx-buy-direct-dialog{padding:18px 14px}.lx-buy-direct-card{padding:12px}.lx-buy-direct-product{grid-template-columns:52px 1fr auto}.lx-buy-direct-product img{width:52px;height:52px}.lx-buy-direct-row{grid-template-columns:66px 1fr}.lx-buy-direct-price{flex-wrap:wrap}.lx-buy-direct-actions{justify-content:stretch}.lx-buy-direct-actions button{flex:1;width:auto}}`;
    style.textContent += `.lx-buy-direct-config,.lx-buy-direct-detail-button{text-decoration:none!important}.lx-buy-direct-detail-button{padding:0;border:0;background:transparent;color:#454545;font:inherit;font-weight:500;cursor:pointer}.lx-buy-direct-detail-button:hover,.lx-buy-direct-detail-button:focus,.lx-buy-direct-config:hover,.lx-buy-direct-config:focus{color:inherit;text-decoration:none!important}.lx-buy-sub-dialog{width:min(620px,calc(100vw - 32px));height:min(560px,calc(100vh - 32px));padding:24px 28px 22px;display:flex;flex-direction:column;overflow:hidden}.lx-buy-sub-dialog h2{margin-bottom:20px;background:none;color:#19171b;-webkit-text-fill-color:initial;font-size:19px;font-weight:700}.lx-buy-sub-dialog h2:before{content:none}.lx-buy-price-list{border-top:0}.lx-buy-price-line{display:grid;grid-template-columns:1fr auto 14px;align-items:center;min-height:48px;border-bottom:1px solid #e5dfe8;font-size:13px}.lx-buy-price-line:last-child{border-bottom:0}.lx-buy-price-line strong{font-weight:500}.lx-buy-price-line .amount{color:#19171b;font-weight:500}.lx-buy-price-line .discount{color:#ff2f2f}.lx-buy-price-line .muted{color:#979797}.lx-buy-price-line .arrow{color:#979797;font-size:18px;text-align:right}.lx-buy-price-line.is-clickable{cursor:pointer}.lx-buy-sub-footer{display:flex;align-items:center;gap:12px;margin:auto 0 0;padding:16px 0 0;border-top:1px solid #e5dfe8}.lx-buy-sub-total{display:flex;align-items:baseline;gap:12px;margin-right:auto}.lx-buy-sub-total b{color:#ff2f2f;font-size:22px}.lx-buy-sub-total span{font-size:12px}.lx-buy-sub-total em{color:#ff2f2f;font-style:normal}.lx-buy-sub-footer button,.lx-buy-coupon-actions button{height:38px;min-width:108px;padding:0 22px;border:1px solid #d3bfd2;border-radius:100px;background:#fff;color:#4d144a;font-size:13px;font-weight:600;cursor:pointer}.lx-buy-sub-footer .primary,.lx-buy-coupon-actions .primary{border:0;background:linear-gradient(90deg,#4d144a 12%,#b8252e);color:#fff}.lx-buy-coupon-field{display:grid;gap:11px}.lx-buy-coupon-field label{font-size:13px;font-weight:600}.lx-buy-coupon-field input{height:46px;box-sizing:border-box;padding:0 14px;border:1px solid #681057;border-radius:6px;outline:none;font:inherit}.lx-buy-coupon-field input:focus{box-shadow:0 0 0 2px rgba(104,16,87,.12)}.lx-buy-coupon-field small{color:#8b838e}.lx-buy-coupon-actions{display:flex;justify-content:flex-end;gap:12px;margin:auto 0 0;padding:16px 0 0;border-top:1px solid #e5dfe8}@media(max-width:620px){.lx-buy-sub-dialog{padding:20px;height:min(520px,calc(100vh - 24px))}}`;
    style.textContent += `.lx-order-edit-dialog{width:min(620px,calc(100vw - 32px));height:min(620px,calc(100vh - 32px));padding:0;display:flex;flex-direction:column;overflow:hidden}.lx-order-edit-head{height:58px;flex:none;display:flex;align-items:center;gap:14px;padding:0 22px;border-bottom:1px solid #e8e2eb}.lx-order-edit-head h2{margin:0;background:none;color:#19171b;-webkit-text-fill-color:initial;font-size:19px;font-weight:700}.lx-order-edit-head h2:before{content:none}.lx-order-edit-back{border:0;background:transparent;color:#5d5661;font-size:24px;cursor:pointer}.lx-order-edit-body{flex:1;min-height:0;padding:20px 26px;overflow:auto}.lx-order-address{display:grid;grid-template-columns:22px 1fr auto;gap:10px;align-items:center;padding:13px 14px;border:1px solid #e8e0eb;border-radius:8px;background:#faf8fc}.lx-order-address b{font-size:13px}.lx-order-address button{border:0;background:transparent;color:#681057;cursor:pointer}.lx-order-edit-section{padding:16px 0;border-bottom:1px solid #ebe5ed}.lx-order-edit-section h3{margin:0 0 10px;font-size:14px}.lx-order-channel-grid{display:grid;grid-template-columns:1fr 1fr;gap:9px}.lx-order-channel{display:grid;gap:3px;padding:10px 12px;border:1px solid #ddd5e1;border-radius:8px;background:#fff;text-align:left;cursor:pointer}.lx-order-channel.is-active{border:2px solid #681057;padding:9px 11px;background:#fcf8fc}.lx-order-channel small{color:#979197}.lx-order-subtitle{display:flex;justify-content:space-between;margin:14px 0 8px;font-weight:600}.lx-order-subtitle small{color:#9a949d;font-weight:400}.lx-order-quick-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:8px}.lx-order-quick{display:flex;align-items:center;gap:7px;height:40px;padding:0 9px;border:1px solid #ddd5e1;border-radius:7px;background:#fff;cursor:pointer}.lx-order-quick.is-active{border-color:#681057;background:#fcf8fc}.lx-order-logo{width:24px;height:24px;display:grid;place-items:center;border-radius:6px;background:#1677ff;color:#fff;font-weight:700}.lx-order-provider{width:100%;display:grid;grid-template-columns:30px auto 1fr 14px;gap:8px;align-items:center;margin-top:8px;padding:9px 10px;border:1px solid #ddd5e1;border-radius:7px;background:#fff;text-align:left;cursor:pointer}.lx-order-provider .lx-order-logo{background:#8b245d}.lx-order-provider small{color:#99939c}.lx-order-chevron{width:7px;height:7px;border-right:1px solid #8c8790;border-bottom:1px solid #8c8790;transform:rotate(45deg)}.lx-order-provider.is-expanded .lx-order-chevron{transform:rotate(225deg)}.lx-order-plan-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:7px;margin-top:7px}.lx-order-plan{display:grid;grid-template-columns:auto 1fr 14px;gap:6px;align-items:center;padding:8px;border:1px solid #ddd5e1;border-radius:7px;background:#fff;text-align:left;cursor:pointer}.lx-order-plan.is-active{border-color:#681057;background:#fcf8fc}.lx-order-plan span,.lx-order-plan small{display:block}.lx-order-plan small{color:#99939c}.lx-order-radio{width:12px;height:12px;border:1px solid #b9b3bc;border-radius:50%}.lx-order-plan.is-active .lx-order-radio{border:4px solid #681057;box-sizing:border-box}.lx-order-form{display:grid;grid-template-columns:82px 1fr;gap:10px 12px;align-items:center}.lx-order-form input{height:38px;box-sizing:border-box;padding:0 11px;border:1px solid #d9cfdd;border-radius:6px;outline:none}.lx-order-form input:focus{border-color:#681057}.lx-order-combobox{position:relative}.lx-order-combobox input{width:100%}.lx-order-code-menu{position:absolute;top:calc(100% + 4px);right:0;left:0;z-index:3;padding:5px;border:1px solid #ddd5e1;border-radius:6px;background:#fff;box-shadow:0 8px 20px rgba(40,22,41,.12)}.lx-order-code-menu button{width:100%;padding:8px;border:0;border-radius:4px;background:#fff;text-align:left;cursor:pointer}.lx-order-code-menu button:hover{background:#f7f2f8}.lx-order-invoice{width:100%;height:48px;display:grid;grid-template-columns:auto 1fr 14px;gap:12px;align-items:center;margin-top:16px;padding:0 14px;border:1px solid #e5dfe8;border-radius:8px;background:#fff;text-align:left;cursor:pointer}.lx-order-invoice span{color:#7f7882;text-align:right}.lx-order-edit-footer{height:62px;flex:none;display:flex;justify-content:flex-end;align-items:center;padding:0 26px;border-top:1px solid #e8e2eb;background:#fff}.lx-order-edit-footer button{width:104px;height:36px;border:0;border-radius:100px;background:linear-gradient(90deg,#4d144a,#b8252e);color:#fff;font-weight:600;cursor:pointer}@media(max-width:620px){.lx-order-quick-grid{grid-template-columns:1fr 1fr}.lx-order-plan-grid{grid-template-columns:1fr}.lx-order-edit-body{padding:16px}.lx-order-form{grid-template-columns:72px 1fr}}`;
    style.textContent += `.lx-buy-direct-dialog{width:min(620px,calc(100vw - 32px));height:min(560px,calc(100vh - 32px))}.lx-order-edit-dialog{height:min(560px,calc(100vh - 32px))}.lx-buy-sub-footer,.lx-buy-coupon-actions{border-top:0}.lx-buy-direct-dialog:not(.lx-buy-sub-dialog):not(.lx-order-edit-dialog){display:flex;flex-direction:column}.lx-buy-direct-dialog:not(.lx-buy-sub-dialog):not(.lx-order-edit-dialog) .lx-buy-direct-card{flex:1}`;
    style.textContent += `.lx-order-edit-head{height:64px;padding:0 18px;gap:8px}.lx-order-edit-head h2{font-size:20px;line-height:28px}.lx-order-edit-back{width:40px;height:40px;display:grid;place-items:center;padding:0;border-radius:8px;font-size:28px;line-height:1}.lx-order-edit-back:hover,.lx-order-edit-back:focus{background:#f6f2f7;color:#4d144a}.lx-order-edit-body{padding:18px 26px 24px}.lx-order-address{min-height:54px;box-sizing:border-box;padding:11px 14px;background:#fbf9fc}.lx-order-address>span{color:#681057}.lx-order-address b{font-size:13px;line-height:19px}.lx-order-edit-section{padding:18px 0}.lx-order-edit-section h3{margin-bottom:12px;font-size:14px;line-height:20px}.lx-order-channel{min-height:58px;padding:10px 12px}.lx-order-channel.is-active{padding:9px 11px;border-color:#681057;background:#fbf7fb}.lx-order-channel strong{font-size:13px;line-height:18px}.lx-order-channel small{color:#979197;font-size:11px;line-height:16px}.lx-order-subtitle{margin:16px 0 9px;font-size:13px;line-height:18px}.lx-order-subtitle small{color:#979197;font-size:10px}.lx-order-quick{height:42px;color:#2b272d;font-size:12px}.lx-order-provider{min-height:50px;margin-top:9px}.lx-order-provider b{font-size:13px}.lx-order-provider small{color:#979197;font-size:11px}.lx-order-plan-grid{gap:8px;margin-top:8px}.lx-order-plan{min-height:54px;padding:8px 10px}.lx-order-plan strong{font-size:13px}.lx-order-plan span{font-size:11px;line-height:15px}.lx-order-plan small{color:#979197;font-size:10px}.lx-order-edit-footer{height:64px;padding:0 26px}.lx-order-edit-footer button{height:38px}.lx-order-form{gap:11px 12px}.lx-order-form label{font-size:12px;color:#454047}.lx-order-form input{height:40px;font-size:12px}`;
    style.textContent += `.lx-buy-direct-dialog:not(.lx-buy-sub-dialog):not(.lx-order-edit-dialog) .lx-buy-direct-card{display:flex;flex-direction:column}.lx-buy-direct-dialog:not(.lx-buy-sub-dialog):not(.lx-order-edit-dialog) .lx-buy-direct-actions{margin-top:auto;padding-top:14px}.lx-order-plan-grid[hidden]{display:none!important}`;
    style.textContent += `.lx-order-edit-head,.lx-order-edit-footer,.lx-buy-sub-footer,.lx-buy-coupon-actions{border-top:0!important;border-bottom:0!important}`;
    style.textContent += `.lx-order-address>img{display:block;width:16px;height:16px;object-fit:contain}.lx-order-address{grid-template-columns:16px minmax(0,1fr) auto}`;
    style.textContent += `.lx-order-channel,.lx-order-quick,.lx-order-plan{box-sizing:border-box;border:.8px solid rgba(77,20,74,.1);border-radius:4px;background:#fff}.lx-order-channel.is-active,.lx-order-quick.is-active,.lx-order-plan.is-active{border-color:#4d144a;background:#f9eff6}.lx-order-channel.is-active{padding:10px 12px}.lx-order-plan.is-active .lx-order-radio{border-color:#4d144a}`;
    style.textContent += `.lx-order-edit-back,.lx-order-edit-back:hover,.lx-order-edit-back:focus,.lx-order-edit-back:active{background:transparent!important;color:#5d5661;outline:0}.lx-order-edit-body>.lx-order-edit-section:first-child{padding-top:0}.lx-order-code-menu{top:auto;bottom:calc(100% + 4px);max-height:132px;overflow:auto;z-index:8}.lx-order-combobox{z-index:2}`;
    style.textContent += `.lx-config-section{padding:0 0 20px;margin-bottom:20px;border-bottom:1px solid rgba(77,20,74,.1)}.lx-config-section h3{margin:0 0 13px;font-size:14px;line-height:20px}.lx-config-options{display:flex;flex-wrap:wrap;gap:10px}.lx-config-option{min-width:126px;height:40px;padding:0 16px;border:.8px solid rgba(77,20,74,.1);border-radius:4px;background:#fff;color:#38333a;font:inherit;font-size:13px;cursor:pointer}.lx-config-option.is-active{border-color:#4d144a;background:#f9eff6;color:#4d144a}.lx-config-option:disabled{background:#f7f6f7;color:#bbb6bd;cursor:not-allowed}.lx-config-quantity{display:flex;align-items:center;justify-content:space-between}.lx-config-quantity-copy{display:flex;align-items:center;gap:10px}.lx-config-quantity-copy h3{margin:0;font-size:14px}.lx-config-quantity-copy small{color:#99939c}.lx-config-stepper{display:grid;grid-template-columns:36px 48px 36px;height:36px}.lx-config-stepper button,.lx-config-stepper output{display:grid;place-items:center;box-sizing:border-box;border:.8px solid rgba(77,20,74,.1);background:#fff;color:#38333a;font-size:18px}.lx-config-stepper button:first-child{border-radius:6px 0 0 6px}.lx-config-stepper button:last-child{border-radius:0 6px 6px 0}.lx-config-stepper output{border-right:0;border-left:0;font-size:14px}.lx-config-stepper button:disabled{color:#c8c3ca;background:#f7f6f7}.lx-config-dialog .lx-order-edit-body{padding-top:12px}`;
    style.textContent += `.lx-order-channel.is-active,.lx-order-quick.is-active,.lx-order-plan.is-active,.lx-config-option.is-active{border-color:transparent;background:linear-gradient(#f9eff6,#f9eff6) padding-box,linear-gradient(90deg,#4d144a 0%,#b8252e 100%) border-box;color:#4d144a}`;
    style.textContent += `body>.lx-p0-toast{position:fixed!important;z-index:100100!important}`;
    style.textContent += `.lx-order-channel.is-active,.lx-order-quick.is-active,.lx-order-plan.is-active,.lx-config-option.is-active{border-width:.8px!important;border-style:solid!important}.lx-order-plan{grid-template-columns:auto 1fr}.lx-order-radio{display:none!important}.lx-order-edit-section{border-bottom:0!important}.lx-invoice-dialog .lx-order-edit-body{padding-top:8px}.lx-invoice-dialog .lx-order-edit-section{padding-bottom:16px;margin-bottom:0}`;
    style.textContent += `.lx-order-code-menu{top:auto;bottom:calc(100% + 4px)}.lx-order-combobox:after{content:"";position:absolute;right:14px;top:50%;width:7px;height:7px;border-right:1px solid #8c8790;border-bottom:1px solid #8c8790;transform:translateY(-65%) rotate(45deg);pointer-events:none}.lx-order-combobox input{padding-right:36px;cursor:pointer}.lx-buy-direct-dialog:not(.lx-buy-sub-dialog):not(.lx-order-edit-dialog) .lx-buy-direct-card{padding:0;border:0;background:#fff}`;
    style.textContent += `.lx-config-section{padding:0 0 16px;margin:0 0 16px;border-bottom:0}.lx-config-section h3{margin-bottom:12px}.lx-config-quantity{padding-top:0}`;
    style.textContent += `.lx-order-edit-head{gap:8px}.lx-order-edit-back{width:24px;height:24px;flex:0 0 24px;font-size:24px;line-height:24px}`;
    style.textContent += `.lx-buy-direct-dialog:not(.lx-buy-sub-dialog):not(.lx-order-edit-dialog) .lx-buy-direct-card{padding:14px 16px 12px}.lx-buy-direct-dialog:not(.lx-buy-sub-dialog):not(.lx-order-edit-dialog) .lx-buy-direct-product{padding-bottom:12px}.lx-buy-direct-dialog:not(.lx-buy-sub-dialog):not(.lx-order-edit-dialog) .lx-buy-direct-section{padding:9px 0}.lx-buy-direct-dialog:not(.lx-buy-sub-dialog):not(.lx-order-edit-dialog) .lx-buy-direct-row{padding:3px 0;line-height:18px}.lx-buy-direct-config{display:inline-flex;align-items:center;gap:6px}.lx-buy-direct-config i{width:6px;height:6px;border-top:1px solid currentColor;border-right:1px solid currentColor;transform:rotate(45deg)}`;
    style.textContent += `.lx-buy-coupon-field input{border:.8px solid rgba(77,20,74,.1);box-shadow:none!important}.lx-buy-coupon-field input:focus{border-color:#4d144a;box-shadow:none!important}`;
    style.textContent += `.lx-buy-direct-config,.lx-buy-direct-config:hover,.lx-buy-direct-config:focus,.lx-buy-direct-config:active{color:#4d144a!important;background:transparent!important;text-decoration:none!important}.lx-config-stepper{grid-template-columns:30px 40px 30px;height:32px}.lx-config-stepper button,.lx-config-stepper output{font-size:16px}.lx-config-stepper output{font-size:13px}`;
    style.textContent += `.lx-buy-sub-head{display:flex;align-items:center;gap:8px;margin:0 0 20px}.lx-buy-sub-head h2{margin:0}.lx-buy-sub-head .lx-order-edit-back{width:24px;height:24px;flex:0 0 24px;font-size:24px;line-height:24px}`;
    style.textContent += `.lx-order-edit-head{padding-right:18px;padding-left:18px}.lx-order-edit-back,.lx-buy-sub-head .lx-order-edit-back{width:24px;height:24px;flex:0 0 24px}.lx-buy-sub-head{transform:translate(-10px,-4px)}`;
    style.textContent += `.lx-order-edit-head h2,.lx-buy-sub-dialog h2{font-size:18px;line-height:26px;font-weight:700}`;
    style.textContent += `.lx-order-code-menu{top:calc(100% + 4px);bottom:auto}`;
    style.textContent += `.lx-buy-direct-detail{margin-top:8px}.lx-buy-direct-detail-button,.lx-buy-direct-detail-button:hover,.lx-buy-direct-detail-button:focus{text-decoration:underline!important;text-underline-offset:3px}.lx-buy-price-line.is-clickable:hover{background:#fcf8fc}.lx-buy-benefit-dialog{height:min(560px,calc(100vh - 32px))}.lx-buy-benefit-list{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px;min-height:0;overflow:auto}.lx-buy-coupon-card{position:relative;min-height:84px;display:grid;grid-template-columns:88px minmax(0,1fr) 18px;gap:8px;align-items:center;padding:12px;border:1px solid transparent;border-radius:9px;background:linear-gradient(110deg,#fff3f7,#e8edff);color:#332d35;text-align:left;cursor:pointer}.lx-buy-coupon-card.is-selected{border-color:#681057;box-shadow:0 0 0 1px rgba(104,16,87,.08)}.lx-buy-coupon-value{color:#ff3434;font-size:14px;line-height:1}.lx-buy-coupon-value b{font-size:30px}.lx-buy-coupon-value small{display:block;margin-top:5px;font-size:10px}.lx-buy-coupon-copy{min-width:0;font-size:10px;line-height:1.5}.lx-buy-coupon-copy strong,.lx-buy-coupon-copy span{display:block}.lx-buy-coupon-copy span{color:#6f6872}.lx-buy-benefit-radio{width:16px;height:16px;box-sizing:border-box;border:1px solid #c7bdc7;border-radius:50%;background:#fff}.lx-buy-coupon-card.is-selected .lx-buy-benefit-radio{border:5px solid #681057}.lx-buy-wallet-box{display:grid;grid-template-columns:minmax(0,1fr) auto;align-items:center;width:min(350px,100%);height:42px;box-sizing:border-box;border:1px solid #e4dce7;border-radius:4px;background:#fcfaff}.lx-buy-wallet-box input{width:100%;height:40px;padding:0 14px;border:0;background:transparent;outline:0;font:inherit}.lx-buy-wallet-box span{padding:0 14px;color:#ff3434}.lx-buy-wallet-hint{margin:10px 0 0;color:#665f68}.lx-buy-wallet-hint em{color:#ff3434;font-style:normal}.lx-invoice-dialog{height:min(620px,calc(100vh - 32px))}.lx-invoice-type-grid{grid-template-columns:repeat(3,minmax(0,1fr))}.lx-invoice-type-grid .lx-order-channel{display:flex;min-height:42px;align-items:center;justify-content:center;padding:8px;color:#38333a;text-align:center;white-space:nowrap}.lx-invoice-type-grid .lx-order-channel.is-active{padding:8px;color:#4d144a}.lx-invoice-notice{margin:0 0 18px;padding:12px 14px;border-radius:7px;background:#faf8fc;color:#7b747e;font-size:11px;line-height:1.6}.lx-invoice-form{grid-template-columns:112px minmax(0,1fr);gap:12px 14px}.lx-invoice-form input{height:42px}.lx-invoice-form input:disabled{background:#f7f5f8;color:#8e8791}.lx-invoice-consent{display:flex;align-items:center;gap:10px;margin-top:18px;color:#3f3942}.lx-invoice-consent input{accent-color:#681057}.lx-order-edit-footer.has-secondary{gap:12px}.lx-order-edit-footer .secondary{border:1px solid #d3bfd2;background:#fff;color:#4d144a}.lx-order-edit-footer.has-secondary button{width:104px}@media(max-width:620px){.lx-buy-benefit-list{grid-template-columns:1fr}.lx-invoice-type-grid{grid-template-columns:1fr}.lx-invoice-form{grid-template-columns:92px minmax(0,1fr)}}`;
    style.textContent += `.lx-buy-wallet-box{width:100%;border-color:#f0c6cc;background:#fff1f2}.lx-buy-wallet-box input{min-width:0;-webkit-appearance:none;appearance:none}.lx-buy-coupon-field input{width:100%;border-color:#f0c6cc;background:#fff1f2}`;
    style.textContent += `.lx-invoice-form textarea{min-height:74px;box-sizing:border-box;padding:10px 11px;border:1px solid #d9cfdd;border-radius:6px;outline:none;color:#252525;font:inherit;font-size:12px;line-height:20px;resize:vertical}.lx-invoice-form textarea:focus{border-color:#681057}.lx-invoice-delay-field{margin-top:18px;padding-top:2px}.lx-invoice-delay-trigger{width:100%;min-height:48px;display:grid;grid-template-columns:112px minmax(0,1fr) 14px;gap:14px;align-items:center;padding:0;border:0;border-bottom:1px solid #eee8f1;background:transparent;color:#252525;font:inherit;text-align:left;cursor:pointer}.lx-invoice-delay-label{font-size:12px;font-weight:600}.lx-invoice-delay-value{min-width:0;overflow:hidden;color:#979197;font-size:12px;text-overflow:ellipsis;white-space:nowrap}.lx-invoice-delay-value.has-value{color:#252525}.lx-invoice-delay-chevron{width:7px;height:7px;justify-self:end;border-top:1px solid #8c8790;border-right:1px solid #8c8790;transform:rotate(45deg)}.lx-invoice-delay-help{margin:9px 0 0 126px;color:#928994;font-size:11px;line-height:18px}.lx-invoice-delay-layer{position:absolute;inset:0;z-index:5;display:flex;align-items:center;justify-content:center;padding:24px;background:rgba(31,20,38,.5)}.lx-invoice-delay-dialog{width:min(460px,calc(100vw - 48px));overflow:hidden;border:1px solid #e2ddeb;border-radius:10px;background:#fff;box-shadow:0 18px 52px rgba(31,20,38,.2)}.lx-invoice-delay-head{height:58px;display:flex;align-items:center;justify-content:space-between;padding:0 22px;border-bottom:1px solid #eee8f1}.lx-invoice-delay-head h3{margin:0;font-size:18px}.lx-invoice-delay-close{width:28px;height:28px;border:0;background:transparent;color:#6f6872;font-size:22px;cursor:pointer}.lx-invoice-delay-body{padding:24px 28px}.lx-invoice-delay-note{margin:0 0 16px;color:#7f7882;font-size:12px;line-height:20px}.lx-invoice-delay-date-label{display:grid;gap:8px;color:#252525;font-size:13px;font-weight:600}.lx-invoice-delay-date{width:100%;height:44px;box-sizing:border-box;padding:0 12px;border:1px solid #d9cfdd;border-radius:6px;background:#fff;color:#252525;font:inherit;font-size:14px;outline:none}.lx-invoice-delay-date:focus{border-color:#681057;box-shadow:0 0 0 2px rgba(104,16,87,.1)}.lx-invoice-delay-footer{display:flex;justify-content:flex-end;gap:10px;padding:14px 22px 18px;border-top:1px solid #eee8f1}.lx-invoice-delay-footer button{min-width:92px;height:36px;padding:0 18px;border:1px solid #d3bfd2;border-radius:100px;background:#fff;color:#4d144a;font:inherit;font-weight:600;cursor:pointer}.lx-invoice-delay-footer .primary{border:0;background:linear-gradient(90deg,#4d144a,#b8252e);color:#fff}@media(max-width:620px){.lx-invoice-delay-trigger{grid-template-columns:92px minmax(0,1fr) 14px}.lx-invoice-delay-help{margin-left:106px}.lx-invoice-delay-layer{padding:12px}}`;
    style.textContent += `.lx-payment-dialog{display:flex;flex-direction:column;overflow:hidden}.lx-payment-dialog h2{margin-bottom:0}.lx-payment-stage{flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:22px 18px;text-align:center}.lx-payment-state{margin:0 0 18px;color:#4d144a;font-size:17px;font-weight:700}.lx-payment-wait{display:flex;align-items:center;gap:18px;margin:0 0 18px;color:#6c6570;font-size:13px}.lx-payment-wait strong{color:#19171b;font-size:18px}.lx-payment-countdown{color:#b8252e;font-variant-numeric:tabular-nums}.lx-payment-product{max-width:420px;margin:0;color:#4d474f;font-size:13px;line-height:1.8}.lx-payment-actions{display:flex;justify-content:flex-end;gap:12px;margin-top:auto;padding-top:16px}.lx-payment-actions button{height:38px;min-width:108px;padding:0 22px;border:1px solid #d3bfd2;border-radius:100px;background:#fff;color:#4d144a;font-size:13px;font-weight:600;cursor:pointer}.lx-payment-actions .primary{border:0;background:linear-gradient(90deg,#4d144a 12%,#b8252e);color:#fff}.lx-payment-success-icon{width:58px;height:58px;display:grid;place-items:center;margin-bottom:18px;border-radius:50%;background:linear-gradient(135deg,#4d144a,#b8252e);color:#fff;font-size:30px}.lx-payment-success-title{margin:0 0 10px;font-size:20px}.lx-payment-success-meta{margin:0;color:#77717d;line-height:1.8}.lx-payment-success-meta b{color:#19171b}`;
    document.head.appendChild(style);
  }

  const visibleDetailProduct = button => window.__lxPurchaseContext.fromButton(button);

  const repairedImages = new WeakSet();
  const repairProductImages = (root = document) => {
    const images = [...(root.matches?.('img') ? [root] : []), ...(root.querySelectorAll?.('img') || [])];
    images.forEach((image) => {
      if (repairedImages.has(image)) return;
      repairedImages.add(image);
      const label = `${image.alt || ''} ${image.closest('.detail-main, .product-detail')?.textContent || ''}`;
      if (/小新\s*Air\s*13/i.test(label)) image.src = AIR_13_IMAGE;
      image.addEventListener('error', () => {
        if (image.src.endsWith(FALLBACK_IMAGE)) return;
        image.src = /小新\s*Air\s*13/i.test(label) ? AIR_13_IMAGE : FALLBACK_IMAGE;
      }, { once: true });
    });
  };

  const showToast = (message) => {
    let toast = document.querySelector('.lx-p0-toast');
    if (!toast) {
      toast = document.createElement('div');
      toast.className = 'lx-p0-toast';
      document.body.appendChild(toast);
    }
    toast.textContent = message;
    toast.classList.add('show');
    clearTimeout(toast._timer);
    toast._timer = setTimeout(() => toast.classList.remove('show'), 2400);
  };

  const openOrderModal = (product) => {
    if (!product || !product.name || !(Number(product.price) > 0)) { showToast("商品数据不完整，请重新选择商品"); return; }
    const previousModal = document.querySelector('[data-buy-modal-direct]');
    previousModal?._lxCleanup?.();
    previousModal?.remove();
    document.querySelectorAll('.lx-p0-toast').forEach((toast) => toast.classList.remove('show'));
    const modal = document.createElement('div');
    modal.dataset.buyModalDirect = 'true';
    const orderState = { payment: '支付宝', expanded: '', note: '请工作日送达，送货前电话联系', customerCode: 'CUS-BJ-20260803', invoice: '普通发票-个人', invoiceTitle: '个人', invoiceTaxNo: '123123123123123', invoicePhone: '13504289879', invoiceEmail: 'ziyu@lenovo.com', invoiceAddress: '北京市海淀区上地西路6号', invoiceRegisteredPhone: '01058868888', invoiceBank: '招商银行北京双榆树支行', invoiceBankAccount: '861580122210002', invoiceRemark: '', invoiceDelayDate: '', invoiceConsent: true };
    const configState = product.sku ? { color: product.color || '', size: product.size || '以商品详情为准', spec: product.configuration || '以所选商品详情为准', quantity: 1 } : { color: '凝雾灰', size: '13英寸', spec: '8GB+256GB WIFI', quantity: 1 };
    const initialCouponAmount = Number(product.discount) || 0;
    const benefitState = { couponId: initialCouponAmount ? 'coupon-best' : 'coupon-none', couponAmount: initialCouponAmount, beanPoints: 0, beanAmount: 0, redPacketAmount: 0 };
    const payableAmount = () => Math.max(0, (Number(product.originalPrice) || 0) * configState.quantity - benefitState.couponAmount - benefitState.beanAmount - benefitState.redPacketAmount);
    const totalDiscount = () => benefitState.couponAmount + benefitState.beanAmount + benefitState.redPacketAmount;
    const invoicePreview = () => orderState.invoice === '普通发票-个人' ? '电子普通发票（个人）' : orderState.invoice === '普通发票-单位' ? '电子普通发票（单位）' : '增值税专用发票';
    const orderHtml = () => `<button class="lx-buy-direct-close" type="button" aria-label="关闭">×</button><h2 id="lxBuyDirectTitle">联想乐享为你生成订单</h2><div class="lx-buy-direct-card"><div class="lx-buy-direct-product"><img src="${escapeHtml(product.image_url)}" alt="${escapeHtml(product.name)}"><div class="lx-buy-direct-product-copy"><strong>${escapeHtml(product.name)}</strong><span>X${configState.quantity}</span></div><button class="lx-buy-direct-config" type="button" data-edit-config>修改配置<i aria-hidden="true"></i></button></div><div class="lx-buy-direct-section"><div class="lx-buy-direct-row"><strong>系列：</strong><span>${escapeHtml(product.series || "Lenovo")}</span></div><div class="lx-buy-direct-row"><strong>型号：</strong><span>${escapeHtml(product.name)}</span></div><div class="lx-buy-direct-row"><strong>尺寸：</strong><span>${escapeHtml(configState.size)}</span></div><div class="lx-buy-direct-row"><strong>配置：</strong><span>${escapeHtml(configState.spec)}${configState.color ? " · " + escapeHtml(configState.color) : ""}</span></div></div><div class="lx-buy-direct-section"><div class="lx-buy-direct-row"><strong>收货信息：</strong><span>演示用户　138****0000</span></div><div class="lx-buy-direct-row"><strong>收货地址：</strong><span>北京市海淀区西北旺地区联想总部东区</span></div></div><div class="lx-buy-direct-section"><div class="lx-buy-direct-row"><strong>支付方式：</strong><span data-order-preview-payment>${escapeHtml(orderState.payment.includes('支付') || orderState.payment.includes('分期') ? orderState.payment : `${orderState.payment}支付`)}</span></div><div class="lx-buy-direct-row"><strong>发票信息：</strong><span data-order-preview-invoice>${escapeHtml(invoicePreview())}</span></div></div><div class="lx-buy-direct-price"><strong>等待支付：</strong><b>¥${payableAmount().toLocaleString('zh-CN')}</b><span>节省了：<em>¥${totalDiscount().toLocaleString('zh-CN')}</em></span></div><div class="lx-buy-direct-detail"><button class="lx-buy-direct-detail-button" type="button" data-price-detail>查看价格明细</button><span>可修改优惠券/乐豆等优惠</span></div><div class="lx-buy-direct-actions"><button type="button" data-edit-order>修改订单</button><button type="button" class="primary" data-pay-now>立即支付</button></div><p class="lx-buy-direct-footnote">*修改订单包括改商品配置、收货地址、支付方式</p></div>`;
    modal.innerHTML = `<div class="lx-buy-direct-mask"></div><section class="lx-buy-direct-dialog" role="dialog" aria-modal="true" aria-labelledby="lxBuyDirectTitle">${orderHtml()}</section>`;
    document.body.appendChild(modal);
    modal.querySelector('img')?.addEventListener('error', (event) => { event.currentTarget.src = FALLBACK_IMAGE; }, { once: true });
    const dialog = modal.querySelector('.lx-buy-direct-dialog');
    const paymentState = { orderId: `LX${Date.now()}`, remaining: 23 * 60 * 60 + 59 * 60 + 51, timer: 0, width: 0, height: 0, paidOrder: null };
    const stopPaymentTimer = () => { if (paymentState.timer) window.clearInterval(paymentState.timer); paymentState.timer = 0; };
    modal._lxCleanup = stopPaymentTimer;
    const formatRemaining = () => {
      const hours = Math.floor(paymentState.remaining / 3600);
      const minutes = Math.floor((paymentState.remaining % 3600) / 60);
      const seconds = paymentState.remaining % 60;
      return [hours, minutes, seconds].map((value) => String(value).padStart(2, '0')).join(':');
    };
    const lockPaymentDialogSize = () => {
      if (!paymentState.width || !paymentState.height) {
        const rect = dialog.getBoundingClientRect();
        paymentState.width = Math.round(rect.width);
        paymentState.height = Math.round(rect.height);
      }
      dialog.style.width = `${paymentState.width}px`;
      dialog.style.height = `${paymentState.height}px`;
    };
    const persistPaidOrder = () => {
      if (paymentState.paidOrder) return paymentState.paidOrder;
      const benefits = [];
      if (benefitState.couponAmount) benefits.push(`优惠券 -¥${benefitState.couponAmount.toLocaleString('zh-CN')}`);
      if (benefitState.beanAmount) benefits.push(`乐豆 -¥${benefitState.beanAmount.toLocaleString('zh-CN')}`);
      if (benefitState.redPacketAmount) benefits.push(`限时红包 -¥${benefitState.redPacketAmount.toLocaleString('zh-CN')}`);
      const paidOrder = {
        sku: product.sku || product.name,
        name: product.name,
        image_url: product.image_url,
        category: product.category || '联想商品',
        type: 'normal',
        typeLabel: '普通订单',
        price: payableAmount(),
        paidAmount: payableAmount(),
        payable: payableAmount(),
        originalPrice: (Number(product.originalPrice) || 0) * configState.quantity,
        discountAmount: totalDiscount(),
        quantity: configState.quantity,
        configurationLabel: `${configState.size}｜${configState.spec}｜${configState.color}`,
        orderId: paymentState.orderId,
        createdAt: new Date().toLocaleString('zh-CN'),
        paidAt: new Date().toLocaleString('zh-CN'),
        status: '待发货',
        address: { name: '演示用户', phone: '138****0000', region: '北京市海淀区西北旺地区', detail: '联想总部东区' },
        recipient: { name: '演示用户', phone: '138****0000', address: '北京市海淀区西北旺地区联想总部东区' },
        shippingAddress: '北京市海淀区西北旺地区联想总部东区',
        note: orderState.note,
        customerCode: orderState.customerCode,
        payMethod: orderState.payment,
        paymentMethod: orderState.payment,
        invoice: { text: invoicePreview(), type: orderState.invoice, title: orderState.invoiceTitle, remark: orderState.invoiceRemark, delayDate: orderState.invoice === '增值税专票' ? orderState.invoiceDelayDate : '' },
        invoiceText: invoicePreview(),
        benefitNote: benefits.join('、')
      };
      let orders = Array.isArray(window.__lxState?.orders) ? window.__lxState.orders : [];
      orders = orders.filter((item) => item?.orderId !== paidOrder.orderId);
      orders.unshift(paidOrder);
      if (window.__lxState) window.__lxState.orders = orders;
      try { localStorage.setItem('lexiang.orders.v1', JSON.stringify(orders)); } catch (error) {}
      window.dispatchEvent(new Event('lx:orders-updated'));
      paymentState.paidOrder = paidOrder;
      return paidOrder;
    };
    const showPaymentProcessing = () => {
      lockPaymentDialogSize();
      stopPaymentTimer();
      dialog.className = 'lx-buy-direct-dialog lx-payment-dialog';
      dialog.innerHTML = `<button class="lx-buy-direct-close" type="button" aria-label="关闭">×</button><h2 id="lxBuyDirectTitle">正在支付</h2><div class="lx-payment-stage"><p class="lx-payment-state">正在支付</p><div class="lx-payment-wait"><strong>待付款</strong><span>剩余：<b class="lx-payment-countdown" data-payment-countdown>${formatRemaining()}</b></span></div><p class="lx-payment-product">【${escapeHtml(product.name)}】正在支付中，请稍等...</p></div><div class="lx-payment-actions"><button type="button" data-go-pay>去支付</button><button type="button" class="primary" data-confirm-payment>确认支付状态</button></div>`;
      paymentState.timer = window.setInterval(() => {
        paymentState.remaining = Math.max(0, paymentState.remaining - 1);
        const countdown = dialog.querySelector('[data-payment-countdown]');
        if (countdown) countdown.textContent = formatRemaining();
        if (!paymentState.remaining) stopPaymentTimer();
      }, 1000);
    };
    const showPaymentSuccess = () => {
      stopPaymentTimer();
      const paidOrder = persistPaidOrder();
      lockPaymentDialogSize();
      dialog.className = 'lx-buy-direct-dialog lx-payment-dialog';
      dialog.innerHTML = `<button class="lx-buy-direct-close" type="button" aria-label="关闭">×</button><h2 id="lxBuyDirectTitle">支付成功</h2><div class="lx-payment-stage"><span class="lx-payment-success-icon" aria-hidden="true">✓</span><strong class="lx-payment-success-title">订单支付成功</strong><p class="lx-payment-success-meta">订单号：<b>${escapeHtml(paidOrder.orderId)}</b><br>实付：<b>¥${payableAmount().toLocaleString('zh-CN')}</b></p></div><div class="lx-payment-actions"><button type="button" class="primary" data-view-paid-order>查看订单</button></div>`;
    };
    const openPaymentPage = () => {
      const paymentUrl = /支付宝|花呗/.test(orderState.payment) ? 'https://www.alipay.com/' : /微信/.test(orderState.payment) ? 'https://pay.weixin.qq.com/' : /京东/.test(orderState.payment) ? 'https://www.jdpay.com/' : 'https://www.alipay.com/';
      window.open(paymentUrl, '_blank', 'noopener,noreferrer');
    };
    const openPaidOrderDetail = () => {
      const paidOrder = persistPaidOrder();
      stopPaymentTimer();
      modal.remove();
      window.dispatchEvent(new Event('lx:orders-updated'));

      const clickOrderCenterDetail = () => {
        const trigger = Array.from(document.querySelectorAll('[data-order-detail-id]')).find((item) => String(item.dataset.orderDetailId) === String(paidOrder.orderId));
        if (!trigger) return false;
        trigger.click();
        return true;
      };

      if (typeof window.__lxOpenOrdersCenter === 'function') {
        window.__lxOpenOrdersCenter({ question: '' });
        let attempts = 0;
        const openWhenReady = () => {
          if (clickOrderCenterDetail()) return;
          attempts += 1;
          if (attempts < 30) window.setTimeout(openWhenReady, 100);
          else showToast('订单已生成，请从右上角“订单”中查看');
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
    };
    const showOrder = () => { dialog.className = 'lx-buy-direct-dialog'; dialog.innerHTML = orderHtml(); };
    const showConfigEdit = () => {
      if (product.sku) return window.__lxPurchaseContext.renderConfig({dialog, product, quantity: configState.quantity, onSelect: selected => {
        product = selected; configState.color = selected.color; configState.size = selected.size; configState.spec = selected.configuration;
        benefitState.couponId = "coupon-none"; benefitState.couponAmount = 0; benefitState.beanPoints = 0; benefitState.beanAmount = 0; benefitState.redPacketAmount = 0;
        showConfigEdit();
      }});
      const options = (name, values, disabled = []) => values.map((value) => `<button class="lx-config-option${configState[name] === value ? ' is-active' : ''}" type="button" data-config-key="${name}" data-config-value="${value}" ${disabled.includes(value) ? 'disabled' : ''}>${value}</button>`).join('');
      dialog.className = 'lx-buy-direct-dialog lx-order-edit-dialog lx-config-dialog';
      dialog.innerHTML = `<header class="lx-order-edit-head"><button class="lx-order-edit-back" type="button" data-config-back>‹</button><h2>修改商品</h2><button class="lx-buy-direct-close" type="button" aria-label="关闭">×</button></header><div class="lx-order-edit-body"><section class="lx-config-section"><h3>颜色</h3><div class="lx-config-options">${options('color',['凝雾灰','深空灰','星空银'])}</div></section><section class="lx-config-section"><h3>尺寸</h3><div class="lx-config-options">${options('size',['11英寸','13英寸','14英寸'],['11英寸'])}</div></section><section class="lx-config-section"><h3>配置</h3><div class="lx-config-options">${options('spec',['8GB+128GB WIFI','8GB+256GB WIFI','16GB+512GB WIFI'],['8GB+128GB WIFI'])}</div></section><div class="lx-config-quantity"><div class="lx-config-quantity-copy"><h3>商品数量</h3><small>最多购买5件</small></div><div class="lx-config-stepper"><button type="button" data-config-minus ${configState.quantity <= 1 ? 'disabled' : ''}>−</button><output data-config-count>${configState.quantity}</output><button type="button" data-config-plus ${configState.quantity >= 5 ? 'disabled' : ''}>＋</button></div></div></div><footer class="lx-order-edit-footer"><button type="button" data-config-save>保存修改</button></footer>`;
      dialog.querySelector('[data-config-back]').addEventListener('click', (event) => { event.stopPropagation(); showOrder(); });
    };
    const showPriceDetail = () => {
      dialog.className = 'lx-buy-direct-dialog lx-buy-sub-dialog';
      dialog.innerHTML = `<button class="lx-buy-direct-close" type="button" aria-label="关闭">×</button><header class="lx-buy-sub-head"><button class="lx-order-edit-back" type="button" data-price-back>‹</button><h2>价格明细</h2></header><div class="lx-buy-price-list"><div class="lx-buy-price-line"><strong>商品金额</strong><span class="amount">¥${((Number(product.originalPrice) || 0) * configState.quantity).toLocaleString('zh-CN')}.00</span><span></span></div><div class="lx-buy-price-line"><strong>运费</strong><span class="amount">＋¥0.00</span><span></span></div><div class="lx-buy-price-line is-clickable" data-open-benefit="coupon"><strong>优惠券</strong><span class="discount">−¥${benefitState.couponAmount.toLocaleString('zh-CN')}.00</span><span class="arrow">›</span></div><div class="lx-buy-price-line is-clickable" data-open-benefit="beans"><strong>乐豆</strong><span class="discount">−¥${benefitState.beanAmount.toLocaleString('zh-CN')}.00</span><span class="arrow">›</span></div><div class="lx-buy-price-line is-clickable" data-open-benefit="redpacket"><strong>限时红包</strong><span class="discount">−¥${benefitState.redPacketAmount.toLocaleString('zh-CN')}.00</span><span class="arrow">›</span></div><div class="lx-buy-price-line"><strong>其他优惠</strong><span class="discount">−¥0.00</span><span></span></div><div class="lx-buy-price-line is-clickable" data-open-coupon-code><strong>优惠码</strong><span class="muted">请输入优惠码</span><span class="arrow">›</span></div></div><div class="lx-buy-sub-footer"><div class="lx-buy-sub-total"><b>¥${payableAmount().toLocaleString('zh-CN')}.00</b><span>节省了：<em>¥${totalDiscount().toLocaleString('zh-CN')}.00</em></span></div><button class="primary" type="button" data-price-confirm>确定</button></div>`;
      dialog.querySelector('[data-price-back]').addEventListener('click', (event) => { event.stopPropagation(); showOrder(); });
    };
    const showCouponCode = () => {
      dialog.className = 'lx-buy-direct-dialog lx-buy-sub-dialog';
      dialog.innerHTML = `<button class="lx-buy-direct-close" type="button" aria-label="关闭">×</button><h2>使用优惠码</h2><div class="lx-buy-coupon-field"><label for="lxCouponCode">优惠码</label><input id="lxCouponCode" type="text" placeholder="请输入优惠码" autocomplete="off"><small>输入优惠码后确认领取，系统会自动更新优惠和待支付金额。</small></div><div class="lx-buy-coupon-actions"><button type="button" data-coupon-back>返回</button><button type="button" class="primary" data-coupon-confirm>确认使用</button></div>`;
      dialog.querySelector('[data-coupon-back]').addEventListener('click', (event) => { event.stopPropagation(); showPriceDetail(); });
      dialog.querySelector('input')?.focus();
    };
    const showCouponSelect = () => {
      const coupons = [
        { id: 'coupon-best', value: initialCouponAmount || 500, label: `¥${initialCouponAmount || 500}`, rule: '当前商品专享券', date: '2026.09.01–2026.09.30' },
        { id: 'coupon-300', value: 300, label: '¥300', rule: '满6000元可用', date: '2026.09.01–2026.09.30' },
        { id: 'coupon-100', value: 100, label: '¥100', rule: '满3000元可用', date: '2026.09.01–2026.09.30' },
        { id: 'coupon-none', value: 0, label: '不使用', rule: '暂不使用优惠券', date: '可随时重新选择' }
      ];
      dialog.className = 'lx-buy-direct-dialog lx-buy-sub-dialog lx-buy-benefit-dialog';
      dialog.innerHTML = `<button class="lx-buy-direct-close" type="button" aria-label="关闭">×</button><header class="lx-buy-sub-head"><button class="lx-order-edit-back" type="button" data-benefit-back>‹</button><h2>优惠券</h2></header><div class="lx-buy-benefit-list">${coupons.map((coupon) => `<button class="lx-buy-coupon-card${benefitState.couponId === coupon.id ? ' is-selected' : ''}" type="button" data-coupon-choice="${coupon.id}" data-coupon-value="${coupon.value}"><span class="lx-buy-coupon-value">${coupon.label.startsWith('¥') ? `¥<b>${coupon.label.slice(1)}</b>` : `<small>${coupon.label}</small>`}</span><span class="lx-buy-coupon-copy"><strong>${coupon.rule}</strong><span>${coupon.date}</span><span>详细说明</span></span><i class="lx-buy-benefit-radio" aria-hidden="true"></i></button>`).join('')}</div><div class="lx-buy-coupon-actions"><button type="button" data-benefit-back>返回</button><button type="button" class="primary" data-benefit-confirm>确认</button></div>`;
    };
    const showWalletBenefit = (type) => {
      const isBeans = type === 'beans';
      const title = isBeans ? '乐豆' : '限时红包';
      const value = isBeans ? benefitState.beanPoints : benefitState.redPacketAmount;
      const discount = isBeans ? benefitState.beanAmount : benefitState.redPacketAmount;
      dialog.className = 'lx-buy-direct-dialog lx-buy-sub-dialog lx-buy-benefit-dialog';
      dialog.innerHTML = `<button class="lx-buy-direct-close" type="button" aria-label="关闭">×</button><header class="lx-buy-sub-head"><button class="lx-order-edit-back" type="button" data-benefit-back>‹</button><h2>${title}</h2></header><div class="lx-buy-wallet-box"><input type="text" inputmode="${isBeans ? 'numeric' : 'decimal'}" value="${value}" data-wallet-input="${type}" aria-label="${title}使用数量"><span data-wallet-discount>已抵 ${discount} 元</span></div><p class="lx-buy-wallet-hint">共 <em>${isBeans ? '5600' : '50'}</em> ${isBeans ? '乐豆' : '元限时红包'}，此单最高可用 <em>${isBeans ? '5600 乐豆，抵 56' : '50'}</em> 元</p><div class="lx-buy-coupon-actions"><button type="button" data-benefit-back>返回</button><button type="button" class="primary" data-wallet-confirm="${type}">确定</button></div>`;
      dialog.querySelector('[data-wallet-input]')?.focus();
    };
    const showOrderEdit = () => {
      const quick = [['支付宝','支'],['花呗','花'],['微信支付','微'],['京东支付','京']];
      const providers = [['huabei','花呗分期','花'],['credit','信用卡分期','卡']];
      const plans = [[3,.023],[6,.045],[12,.075]];
      const quickHtml = quick.map(([name, logo]) => `<button class="lx-order-quick${orderState.payment === name ? ' is-active' : ''}" type="button" data-order-payment="${name}"><span class="lx-order-logo">${logo}</span>${name}</button>`).join('');
      const providersHtml = providers.map(([id, name, logo]) => {
        const planHtml = plans.map(([period, rate]) => { const value = `${name} · ${period}期`; const monthly = (product.price * (1 + rate) / period).toFixed(2); return `<button class="lx-order-plan${orderState.payment === value ? ' is-active' : ''}" type="button" data-order-payment="${value}"><strong>${period}期</strong><span>每期 ¥${monthly}<small>费率 ${(rate * 100).toFixed(2)}%</small></span><i class="lx-order-radio"></i></button>`; }).join('');
        return `<div><button class="lx-order-provider${orderState.expanded === id ? ' is-expanded' : ''}" type="button" data-order-provider="${id}"><span class="lx-order-logo">${logo}</span><b>${name}</b><small>支持 3、6 或 12 期</small><i class="lx-order-chevron"></i></button><div class="lx-order-plan-grid" ${orderState.expanded === id ? '' : 'hidden'}>${planHtml}</div></div>`;
      }).join('');
      const codes = ['CUS-BJ-20260803','CUS-SH-20260718','CUS-GZ-20260626'];
      dialog.className = 'lx-buy-direct-dialog lx-order-edit-dialog';
      dialog.innerHTML = `<header class="lx-order-edit-head"><button class="lx-order-edit-back" type="button" data-order-back>‹</button><h2>修改订单</h2><button class="lx-buy-direct-close" type="button" aria-label="关闭">×</button></header><div class="lx-order-edit-body"><div class="lx-order-address"><img src="${ADDRESS_ICON}" alt="" aria-hidden="true"><b>1　演示地址可在订单中修改收货信息</b><button type="button" data-address-edit>修改地址</button></div><section class="lx-order-edit-section"><h3>选择支付方式</h3><div class="lx-order-channel-grid"><button class="lx-order-channel is-active" type="button" data-order-channel="online"><strong>在线支付</strong><small>快捷支付或分期支付</small></button><button class="lx-order-channel" type="button" data-order-channel="corporate"><strong>对公支付</strong><small>需开具增值税专用发票</small></button></div><div data-online-payment><div class="lx-order-subtitle">快捷支付</div><div class="lx-order-quick-grid">${quickHtml}</div><div class="lx-order-subtitle"><span>分期支付</span><small>*手续费以支付平台实际收取为准</small></div>${providersHtml}</div></section><section class="lx-order-edit-section"><h3>订单补充信息</h3><div class="lx-order-form"><label for="lxOrderNote">订单备注</label><input id="lxOrderNote" data-order-note value="${escapeHtml(orderState.note)}"><label for="lxOrderCustomer">客户编码</label><div class="lx-order-combobox"><input id="lxOrderCustomer" data-order-customer value="${escapeHtml(orderState.customerCode)}" readonly aria-haspopup="listbox" aria-expanded="false"><div class="lx-order-code-menu" data-order-code-menu role="listbox" hidden>${codes.map((code) => `<button type="button" role="option" data-order-code="${code}">${code}</button>`).join('')}</div></div></div></section><button class="lx-order-invoice" type="button" data-order-invoice><strong>发票信息</strong><span>${escapeHtml(orderState.invoice)}</span><i class="lx-order-chevron"></i></button></div><footer class="lx-order-edit-footer"><button type="button" data-order-save>确认</button></footer>`;
      dialog.querySelector('[data-order-back]').addEventListener('click', (event) => { event.stopPropagation(); showOrder(); });
    };
    const invoiceDateValue = (date) => [date.getFullYear(), String(date.getMonth() + 1).padStart(2, '0'), String(date.getDate()).padStart(2, '0')].join('-');
    const invoiceDelayLimits = () => {
      const minimum = new Date();
      minimum.setHours(12, 0, 0, 0);
      minimum.setDate(minimum.getDate() + 1);
      const maximum = new Date(minimum);
      maximum.setFullYear(maximum.getFullYear() + 1);
      return { minimum: invoiceDateValue(minimum), maximum: invoiceDateValue(maximum) };
    };
    const formatInvoiceDelayDate = (value) => {
      const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value || '');
      return match ? `${Number(match[1])}年${Number(match[2])}月${Number(match[3])}日` : '请选择开票日期';
    };
    const syncInvoiceDraft = () => {
      dialog.querySelectorAll('[data-invoice-field]').forEach((input) => { if (!input.disabled) orderState[input.dataset.invoiceField] = input.value.trim(); });
      const consent = dialog.querySelector('[data-invoice-consent]');
      if (consent) orderState.invoiceConsent = consent.checked;
    };
    const closeInvoiceDelayPicker = () => modal.querySelector('[data-invoice-delay-layer]')?.remove();
    const showInvoiceDelayPicker = () => {
      syncInvoiceDraft();
      closeInvoiceDelayPicker();
      const limits = invoiceDelayLimits();
      const initialValue = orderState.invoiceDelayDate && orderState.invoiceDelayDate >= limits.minimum && orderState.invoiceDelayDate <= limits.maximum ? orderState.invoiceDelayDate : limits.minimum;
      modal.insertAdjacentHTML('beforeend', `<div class="lx-invoice-delay-layer" data-invoice-delay-layer><section class="lx-invoice-delay-dialog" role="dialog" aria-modal="true" aria-labelledby="lxInvoiceDelayTitle"><header class="lx-invoice-delay-head"><h3 id="lxInvoiceDelayTitle">选择延时开票日期</h3><button class="lx-invoice-delay-close" type="button" data-invoice-delay-cancel aria-label="关闭延时开票日期选择">×</button></header><div class="lx-invoice-delay-body"><p class="lx-invoice-delay-note">最早可选择明天，最多可延后一年。</p><label class="lx-invoice-delay-date-label" for="lxInvoiceDelayDate">开票日期<input class="lx-invoice-delay-date" id="lxInvoiceDelayDate" type="date" min="${limits.minimum}" max="${limits.maximum}" value="${initialValue}" data-invoice-delay-input></label></div><footer class="lx-invoice-delay-footer"><button type="button" data-invoice-delay-clear>清除日期</button><button type="button" data-invoice-delay-cancel>取消</button><button class="primary" type="button" data-invoice-delay-confirm>确定</button></footer></section></div>`);
      const input = modal.querySelector('[data-invoice-delay-input]');
      input?.focus();
      try { input?.showPicker?.(); } catch (_) {}
    };
    const showInvoiceEdit = () => {
      const options = ['普通发票-个人','普通发票-单位','增值税专票'];
      const isPersonal = orderState.invoice === '普通发票-个人';
      const isUnit = orderState.invoice === '普通发票-单位';
      const isVat = orderState.invoice === '增值税专票';
      const notice = orderState.invoice === '增值税专票' ? '自营商品的增值税专用发票（数电票）会在确认收货后预计 5 个工作日内开具。' : '联想自营提供数电（普通发票），法律效力等同电子普通发票。';
      const formHtml = isPersonal
        ? `<label for="lxInvoiceTitle">发票抬头</label><input id="lxInvoiceTitle" data-invoice-field="invoiceTitle" value="${escapeHtml(orderState.invoiceTitle || '个人')}"><label for="lxInvoicePhone">收票人手机</label><input id="lxInvoicePhone" data-invoice-field="invoicePhone" value="${escapeHtml(orderState.invoicePhone)}"><label for="lxInvoiceEmail">收票人邮箱</label><input id="lxInvoiceEmail" data-invoice-field="invoiceEmail" value="${escapeHtml(orderState.invoiceEmail)}">`
        : isUnit
          ? `<label for="lxInvoiceTitle">发票抬头</label><input id="lxInvoiceTitle" data-invoice-field="invoiceTitle" value="${escapeHtml(orderState.invoiceTitle === '个人' ? '联想（北京）有限公司' : orderState.invoiceTitle)}"><label for="lxInvoiceTaxNo">纳税人识别号</label><input id="lxInvoiceTaxNo" data-invoice-field="invoiceTaxNo" value="${escapeHtml(orderState.invoiceTaxNo)}"><label for="lxInvoicePhone">收票人手机</label><input id="lxInvoicePhone" data-invoice-field="invoicePhone" value="${escapeHtml(orderState.invoicePhone)}"><label for="lxInvoiceEmail">收票人邮箱</label><input id="lxInvoiceEmail" data-invoice-field="invoiceEmail" value="${escapeHtml(orderState.invoiceEmail)}"><label for="lxInvoiceRemark">发票备注（选填）</label><textarea id="lxInvoiceRemark" data-invoice-field="invoiceRemark" placeholder="选填，请谨慎填写">${escapeHtml(orderState.invoiceRemark)}</textarea>`
          : `<label for="lxInvoiceTitle">单位名称</label><input id="lxInvoiceTitle" data-invoice-field="invoiceTitle" value="联想（北京）有限公司" disabled><label for="lxInvoiceTaxNo">纳税人识别号</label><input id="lxInvoiceTaxNo" data-invoice-field="invoiceTaxNo" value="91110108700000458B" disabled><label for="lxInvoiceAddress">注册地址</label><input id="lxInvoiceAddress" data-invoice-field="invoiceAddress" value="${escapeHtml(orderState.invoiceAddress)}"><label for="lxInvoiceRegisteredPhone">注册电话</label><input id="lxInvoiceRegisteredPhone" data-invoice-field="invoiceRegisteredPhone" value="${escapeHtml(orderState.invoiceRegisteredPhone)}"><label for="lxInvoiceBank">开户银行</label><input id="lxInvoiceBank" data-invoice-field="invoiceBank" value="${escapeHtml(orderState.invoiceBank)}"><label for="lxInvoiceBankAccount">银行账号</label><input id="lxInvoiceBankAccount" data-invoice-field="invoiceBankAccount" value="${escapeHtml(orderState.invoiceBankAccount)}"><label for="lxInvoiceRemark">发票备注（选填）</label><textarea id="lxInvoiceRemark" data-invoice-field="invoiceRemark" placeholder="选填，请谨慎填写">${escapeHtml(orderState.invoiceRemark)}</textarea>`;
      const delayHtml = isVat ? `<div class="lx-invoice-delay-field"><button class="lx-invoice-delay-trigger" type="button" data-invoice-delay-open><span class="lx-invoice-delay-label">延时开票（选填）</span><span class="lx-invoice-delay-value${orderState.invoiceDelayDate ? ' has-value' : ''}">${escapeHtml(formatInvoiceDelayDate(orderState.invoiceDelayDate))}</span><i class="lx-invoice-delay-chevron" aria-hidden="true"></i></button><p class="lx-invoice-delay-help">选择后将在该日期起进入开票处理；请在此日期前确保增票资质已审核通过。未选择则按原开票时效处理。</p></div>` : '';
      dialog.className = 'lx-buy-direct-dialog lx-order-edit-dialog lx-invoice-dialog';
      dialog.innerHTML = `<header class="lx-order-edit-head"><button class="lx-order-edit-back" type="button" data-invoice-back>‹</button><h2>发票信息</h2><button class="lx-buy-direct-close" type="button" aria-label="关闭">×</button></header><div class="lx-order-edit-body"><section class="lx-order-edit-section"><h3>选择发票类型</h3><div class="lx-order-channel-grid lx-invoice-type-grid">${options.map((option) => `<button class="lx-order-channel${orderState.invoice === option ? ' is-active' : ''}" type="button" data-invoice-option="${option}"><strong>${option}</strong></button>`).join('')}</div></section><div class="lx-invoice-notice">${notice}</div><section class="lx-order-edit-section"><div class="lx-order-form lx-invoice-form">${formHtml}</div>${delayHtml}${isVat ? `<label class="lx-invoice-consent"><input type="checkbox" data-invoice-consent ${orderState.invoiceConsent ? 'checked' : ''}>我已阅读并同意《增值税专用发票抬头确认书》</label>` : ''}</section></div><footer class="lx-order-edit-footer has-secondary"><button class="secondary" type="button" data-invoice-back>返回</button><button type="button" data-invoice-save>保存</button></footer>`;
      dialog.querySelector('[data-invoice-back]').addEventListener('click', (event) => { event.stopPropagation(); showOrderEdit(); });
    };
    modal.addEventListener('pointerdown', (event) => {
      const target = event.target;
      if (target.closest('[data-order-back],[data-config-back]')) {
        event.preventDefault();
        event.stopImmediatePropagation();
        showOrder();
      } else if (target.closest('[data-price-back]')) {
        event.preventDefault();
        event.stopImmediatePropagation();
        showOrder();
      } else if (target.closest('[data-invoice-back]')) {
        event.preventDefault();
        event.stopImmediatePropagation();
        showOrderEdit();
      } else if (target.closest('[data-coupon-back]')) {
        event.preventDefault();
        event.stopImmediatePropagation();
        showPriceDetail();
      } else if (target.closest('[data-benefit-back]')) {
        event.preventDefault();
        event.stopImmediatePropagation();
        showPriceDetail();
      }
    }, true);
    modal.addEventListener('click', (event) => {
      const target = event.target;
      const openCodeMenu = dialog.querySelector('[data-order-code-menu]:not([hidden])');
      if (openCodeMenu && !target.closest('.lx-order-combobox')) { openCodeMenu.hidden = true; dialog.querySelector('[data-order-customer]')?.setAttribute('aria-expanded','false'); }
      if (target.closest('.lx-buy-direct-close,.lx-buy-direct-mask')) { stopPaymentTimer(); return modal.remove(); }
      if (target.closest('[data-pay-now]')) { openPaymentPage(); return showPaymentProcessing(); }
      if (target.closest('[data-go-pay]')) return openPaymentPage();
      if (target.closest('[data-confirm-payment]')) return showPaymentSuccess();
      if (target.closest('[data-view-paid-order]')) return openPaidOrderDetail();
      if (target.closest('[data-price-detail]')) return showPriceDetail();
      if (target.closest('[data-open-coupon-code]')) return showCouponCode();
      const benefitButton = target.closest('[data-open-benefit]');
      if (benefitButton) return benefitButton.dataset.openBenefit === 'coupon' ? showCouponSelect() : showWalletBenefit(benefitButton.dataset.openBenefit);
      if (target.closest('[data-coupon-back]')) return showPriceDetail();
      if (target.closest('[data-benefit-back]')) return showPriceDetail();
      if (target.closest('[data-price-confirm]')) return showOrder();
      if (target.closest('[data-edit-config]')) return showConfigEdit();
      if (target.closest('[data-config-back]')) return showOrder();
      const configOption = target.closest('[data-config-key]');
      if (configOption) { configState[configOption.dataset.configKey] = configOption.dataset.configValue; return showConfigEdit(); }
      if (target.closest('[data-config-minus]')) { configState.quantity = Math.max(1, configState.quantity - 1); return showConfigEdit(); }
      if (target.closest('[data-config-plus]')) { configState.quantity = Math.min(5, configState.quantity + 1); return showConfigEdit(); }
      if (target.closest('[data-config-save]')) return showOrder();
      if (target.closest('[data-edit-order]')) { orderState.expanded = ''; return showOrderEdit(); }
      if (target.closest('[data-order-back]')) return showOrder();
      if (target.closest('[data-order-invoice]')) return showInvoiceEdit();
      if (target.closest('[data-invoice-back]')) return showOrderEdit();
      const invoiceOption = target.closest('[data-invoice-option]');
      if (invoiceOption) { syncInvoiceDraft(); orderState.invoice = invoiceOption.dataset.invoiceOption; return showInvoiceEdit(); }
      if (target.closest('[data-invoice-delay-open]')) return showInvoiceDelayPicker();
      const delayLayer = target.closest('[data-invoice-delay-layer]');
      if (delayLayer && target === delayLayer) { closeInvoiceDelayPicker(); return; }
      if (target.closest('[data-invoice-delay-cancel]')) { closeInvoiceDelayPicker(); return; }
      if (target.closest('[data-invoice-delay-clear]')) { orderState.invoiceDelayDate = ''; closeInvoiceDelayPicker(); showInvoiceEdit(); return; }
      if (target.closest('[data-invoice-delay-confirm]')) {
        const delayInput = modal.querySelector('[data-invoice-delay-input]');
        if (!delayInput?.value) { delayInput?.focus(); return; }
        orderState.invoiceDelayDate = delayInput.value;
        closeInvoiceDelayPicker();
        showInvoiceEdit();
        showToast('延时开票日期已选择');
        return;
      }
      if (target.closest('[data-invoice-save]')) {
        syncInvoiceDraft();
        return showOrderEdit();
      }
      const couponChoice = target.closest('[data-coupon-choice]');
      if (couponChoice) {
        benefitState.couponId = couponChoice.dataset.couponChoice;
        benefitState.couponAmount = Number(couponChoice.dataset.couponValue) || 0;
        dialog.querySelectorAll('[data-coupon-choice]').forEach((button) => button.classList.toggle('is-selected', button === couponChoice));
        return;
      }
      if (target.closest('[data-benefit-confirm]')) return showPriceDetail();
      const walletConfirm = target.closest('[data-wallet-confirm]');
      if (walletConfirm) {
        const type = walletConfirm.dataset.walletConfirm;
        const raw = Math.max(0, Number(dialog.querySelector('[data-wallet-input]')?.value) || 0);
        if (type === 'beans') {
          benefitState.beanPoints = Math.min(5600, Math.round(raw));
          benefitState.beanAmount = Math.min(56, Math.floor(benefitState.beanPoints / 100));
        } else {
          benefitState.redPacketAmount = Math.min(50, Math.round(raw * 100) / 100);
        }
        return showPriceDetail();
      }
      const provider = target.closest('[data-order-provider]');
      if (provider) {
        const shouldExpand = orderState.expanded !== provider.dataset.orderProvider;
        dialog.querySelectorAll('[data-order-provider]').forEach((button) => {
          button.classList.remove('is-expanded');
          button.nextElementSibling.hidden = true;
        });
        orderState.expanded = shouldExpand ? provider.dataset.orderProvider : '';
        if (shouldExpand) {
          provider.classList.add('is-expanded');
          provider.nextElementSibling.hidden = false;
        }
        return;
      }
      const payment = target.closest('[data-order-payment]');
      if (payment) {
        orderState.payment = payment.dataset.orderPayment;
        dialog.querySelectorAll('[data-order-payment]').forEach((button) => button.classList.toggle('is-active', button === payment));
        return;
      }
      const channel = target.closest('[data-order-channel]');
      if (channel) {
        dialog.querySelectorAll('[data-order-channel]').forEach((button) => button.classList.toggle('is-active', button === channel));
        const online = dialog.querySelector('[data-online-payment]');
        online.hidden = channel.dataset.orderChannel === 'corporate';
        if (online.hidden) orderState.payment = '对公支付';
        return;
      }
      const customerInput = target.closest('[data-order-customer]');
      if (customerInput) { const menu = dialog.querySelector('[data-order-code-menu]'); menu.hidden = !menu.hidden; customerInput.setAttribute('aria-expanded', String(!menu.hidden)); return; }
      if (target.closest('[data-address-edit]')) {
        showToast('请在地址管理中修改收货地址');
        return;
      }
      const code = target.closest('[data-order-code]');
      if (code) { orderState.customerCode = code.dataset.orderCode; const input = dialog.querySelector('[data-order-customer]'); input.value = orderState.customerCode; input.setAttribute('aria-expanded','false'); dialog.querySelector('[data-order-code-menu]').hidden = true; return; }
      if (target.closest('[data-order-save]')) {
        orderState.note = dialog.querySelector('[data-order-note]')?.value.trim() || '';
        orderState.customerCode = dialog.querySelector('[data-order-customer]')?.value.trim() || '';
        showOrder();
        dialog.querySelector('[data-order-preview-payment]').textContent = orderState.payment.includes('支付') || orderState.payment.includes('分期') ? orderState.payment : `${orderState.payment}支付`;
        return;
      }
      if (target.closest('[data-coupon-confirm]')) {
        const code = dialog.querySelector('#lxCouponCode')?.value.trim();
        if (!code) return dialog.querySelector('#lxCouponCode')?.focus();
        showPriceDetail();
      }
    });
    modal.querySelector('.primary')?.focus();
  };

  window.__lxOpenUnifiedDiscountOrder = product => {
    try { return openOrderModal(window.__lxPurchaseContext.normalize(product)); } catch (error) { showToast(error.message); }
  };

  const removeRepeatedOfflineErrors = () => {
    document.querySelectorAll('.lx-p0-messages .lx-p0-message.ai, .lx-p0-messages .msg.ai').forEach((message) => {
      if (/当前 AI 服务暂时不可用/.test(message.textContent || '')) message.remove();
    });
  };

  let purchaseRequest = 0; const purchaseButtons = new WeakMap();
  window.addEventListener('click', async (event) => {
    const button = event.target.closest?.('button, a[role="button"]');
    const label = String(button?.textContent || '').replace(/\s+/g, '').trim();
    const isUnifiedBuy = button && !button.closest('[data-buy-modal-direct]') && !button.dataset.bizQuote && (/^(?:一键领取?优惠下单|一键领优惠下单|立即购买|立即下单|去购买|去下单|去结算|结算|提交订单)$/.test(label) || button.matches('[data-buy-now],[data-action="buy"],[data-order-action="buy"]'));
    if (!isUnifiedBuy) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    const request = ++purchaseRequest; purchaseButtons.set(button, request);
    button.setAttribute("aria-busy", "true");
    try { const product = await visibleDetailProduct(button); if (request === purchaseRequest && button.isConnected && window.__lxPurchaseContext.targetSku(button, window.__lxState) === product.sku) openOrderModal(product); }
    catch (error) { if (request === purchaseRequest) showToast(error.message || "商品读取失败，请重试"); }
    finally { if (purchaseButtons.get(button) === request) { button.removeAttribute("aria-busy"); purchaseButtons.delete(button); } }
  }, true);

  repairProductImages();
  removeRepeatedOfflineErrors();
  // Batch added subtrees once per frame. Never rescan the entire chat per node.
  const pendingRoots = new Set(); let repairFrame = 0;
  new MutationObserver(records => {
    for (const record of records) for (const node of record.addedNodes) if (node.nodeType === 1) pendingRoots.add(node);
    if (!pendingRoots.size || repairFrame) return;
    repairFrame = requestAnimationFrame(() => {
      repairFrame = 0; const roots = [...pendingRoots]; pendingRoots.clear();
      for (const node of roots) {
        if (!node.isConnected || roots.some(parent => parent !== node && parent.contains(node))) continue;
        repairProductImages(node);
        const selector = '.lx-p0-messages .lx-p0-message.ai, .lx-p0-messages .msg.ai';
        const messages = [...(node.matches(selector) ? [node] : []), ...node.querySelectorAll(selector)];
        for (const message of messages) if (/当前 AI 服务暂时不可用/.test(message.textContent || '')) message.remove();
      }
    });
  }).observe(document.body, { childList: true, subtree: true });

  const previewMode = new URLSearchParams(location.search).get('showOrder');
  if (previewMode) {
    const showPreview = () => {
      openOrderModal({ name: '联想小新 Air 13', originalPrice: 7299, discount: 400, price: 6899, image_url: AIR_13_IMAGE });
      if (previewMode === 'price' || previewMode === 'coupon') document.querySelector('[data-price-detail]')?.click();
      if (previewMode === 'coupon') document.querySelector('[data-open-benefit="coupon"]')?.click();
      if (previewMode === 'beans') { document.querySelector('[data-price-detail]')?.click(); document.querySelector('[data-open-benefit="beans"]')?.click(); }
      if (previewMode === 'redpacket') { document.querySelector('[data-price-detail]')?.click(); document.querySelector('[data-open-benefit="redpacket"]')?.click(); }
      if (previewMode === 'edit') document.querySelector('[data-edit-order]')?.click();
      if (previewMode === 'invoice') { document.querySelector('[data-edit-order]')?.click(); document.querySelector('[data-order-invoice]')?.click(); }
      if (previewMode === 'invoice-unit') { document.querySelector('[data-edit-order]')?.click(); document.querySelector('[data-order-invoice]')?.click(); document.querySelector('[data-invoice-option="普通发票-单位"]')?.click(); }
      if (previewMode === 'invoice-vat') { document.querySelector('[data-edit-order]')?.click(); document.querySelector('[data-order-invoice]')?.click(); document.querySelector('[data-invoice-option="增值税专票"]')?.click(); }
      if (previewMode === 'config') document.querySelector('[data-edit-config]')?.click();
      if (previewMode === 'payment') document.querySelector('[data-pay-now]')?.click();
      if (previewMode === 'success') { document.querySelector('[data-pay-now]')?.click(); document.querySelector('[data-confirm-payment]')?.click(); }
    };
    document.readyState === 'loading' ? document.addEventListener('DOMContentLoaded', showPreview, { once: true }) : showPreview();
  }
})();

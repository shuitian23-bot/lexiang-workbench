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
    const parts=description.split(/\s*\/\s*/);
    const memory=parts.find(p=>/\d+\s*G(?:B)?\s*(?:LP|DDR|内存)/i.test(p))?.match(/\d+\s*G(?:B)?/i)?.[0];
    const storage=parts.find(p=>/固态|硬盘|SSD|PCIe/i.test(p))?.match(/^\s*\d+(?:\.\d+)?\s*(?:TB|GB)?/i)?.[0]?.trim();
    const configurationLabel=[memory,storage].filter(Boolean).join('+') || description;
    if(image && !/^(?:https?:\/\/|\/|\.\.?\/)/i.test(image)) throw new Error('商品图片地址无效');
    return Object.freeze({
      sku,name,price,originalPrice:price,discount:0,image_url:image,configurationLabel,
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
    dialog.innerHTML='<header class="lx-order-edit-head"><button class="lx-order-edit-back" type="button" data-config-back aria-label="返回"><img src="/assets/icons/order-modal-back.svg" alt="" aria-hidden="true"></button><h2>修改商品</h2><button class="lx-buy-direct-close" type="button" aria-label="关闭">×</button></header><div class="lx-order-edit-body"><div data-purchase-options role="status">正在读取本系列配置…</div><div class="lx-config-quantity"><div class="lx-config-quantity-copy"><h3>商品数量</h3><small>最多购买5件</small></div><div class="lx-config-stepper"><button type="button" data-config-minus aria-label="减少数量" '+(quantity<=1?'disabled':'')+'>−</button><output data-config-count>'+quantity+'</output><button type="button" data-config-plus aria-label="增加数量" '+(quantity>=5?'disabled':'')+'>＋</button></div></div></div><footer class="lx-order-edit-footer"><button type="button" data-config-save>保存修改</button></footer>';
    const host=dialog.querySelector('[data-purchase-options]');
    const current=()=>host.isConnected && dialog.contains(host);
    function fail(error){if(!current())return;host.textContent=error.message;const retry=document.createElement('button');retry.type='button';retry.textContent='重试';retry.onclick=()=>renderConfig({dialog,product,quantity,onSelect,onError});host.append(' ',retry);onError?.(error);}
    options(product.sku).then(rows=>{
      if(!current())return;
      const variants=rows.map(normalize);
      host.removeAttribute('role');
      host.innerHTML=[['color','颜色'],['size','尺寸'],['configuration','配置']].map(([key,label])=>{
        const values=[...new Set(variants.map(row=>row[key]).filter(Boolean))];
        if(!values.length)values.push(product[key] || '以商品详情为准');
        return '<section class="lx-config-section"><h3>'+label+'</h3><div class="lx-config-options">'+values.map(value=>{
          const selected=(product[key] || '以商品详情为准')===value;
          const matches=variants.filter(row=>row[key]===value);
          const same=matches.find(row=>['color','size','configuration'].every(k=>k===key || row[k]===product[k]));
          const next=same || matches[0];
          return '<button class="lx-config-option'+(selected && next?' is-active':'')+'" type="button" data-purchase-sku="'+esc(next?.sku || product.sku)+'" aria-pressed="'+selected+'" title="'+esc(value)+'"'+(!next?' disabled':'')+'>' + esc(key==='configuration' && next ? next.configurationLabel : value) + '</button>';
        }).join('')+'</div></section>';
      }).join('');
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
/* v59-checkout-payment-standard-answer-card-20260904 */
/* checkout-address-invoice-store-position-v61-20260905 */
/* checkout-layout-v62-20260905 */
/* checkout-flash-card-inner-layout-v63-20260905 */
/* fulfillment-checkout-height-v64-20260905 */
/* checkout-benefit-info-v65-20260905 */
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
    style.textContent = '';
    style.textContent += `.lx-buy-direct-detail{margin-top:8px}.lx-buy-direct-detail-button,.lx-buy-direct-detail-button:hover,.lx-buy-direct-detail-button:focus{text-decoration:underline!important;text-underline-offset:3px}.lx-buy-price-line.is-clickable:hover{background:#fcf8fc}.lx-buy-benefit-dialog{height:min(560px,calc(100vh - 32px))}.lx-buy-benefit-list{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px;min-height:0;overflow:auto}.lx-buy-coupon-card{position:relative;min-height:84px;display:grid;grid-template-columns:88px minmax(0,1fr) 18px;gap:8px;align-items:center;padding:12px;border:1px solid transparent;border-radius:9px;background:linear-gradient(110deg,#fff3f7,#e8edff);color:#332d35;text-align:left;cursor:pointer}.lx-buy-coupon-card.is-selected{border-color:#681057;box-shadow:0 0 0 1px rgba(104,16,87,.08)}.lx-buy-coupon-value{color:#ff3434;font-size:14px;line-height:1}.lx-buy-coupon-value b{font-size:30px}.lx-buy-coupon-value small{display:block;margin-top:5px;font-size:10px}.lx-buy-coupon-copy{min-width:0;font-size:10px;line-height:1.5}.lx-buy-coupon-copy strong,.lx-buy-coupon-copy span{display:block}.lx-buy-coupon-copy span{color:#6f6872}.lx-buy-benefit-radio{width:16px;height:16px;box-sizing:border-box;border:1px solid #c7bdc7;border-radius:50%;background:#fff}.lx-buy-coupon-card.is-selected .lx-buy-benefit-radio{border:5px solid #681057}.lx-buy-wallet-box{display:grid;grid-template-columns:minmax(0,1fr) auto;align-items:center;width:min(350px,100%);height:42px;box-sizing:border-box;border:1px solid #e4dce7;border-radius:4px;background:#fcfaff}.lx-buy-wallet-box input{width:100%;height:40px;padding:0 14px;border:0;background:transparent;outline:0;font:inherit}.lx-buy-wallet-box span{padding:0 14px;color:#ff3434}.lx-buy-wallet-hint{margin:10px 0 0;color:#665f68}.lx-buy-wallet-hint em{color:#ff3434;font-style:normal}.lx-invoice-dialog{height:min(620px,calc(100vh - 32px))}.lx-invoice-type-grid{grid-template-columns:repeat(3,minmax(0,1fr))}.lx-invoice-type-grid .lx-order-channel{display:flex;min-height:42px;align-items:center;justify-content:center;padding:8px;color:#38333a;text-align:center;white-space:nowrap}.lx-invoice-type-grid .lx-order-channel.is-active{padding:8px;color:#4d144a}.lx-invoice-notice{margin:0 0 18px;padding:12px 14px;border-radius:7px;background:#faf8fc;color:#7b747e;font-size:11px;line-height:1.6}.lx-invoice-form{grid-template-columns:112px minmax(0,1fr);gap:12px 14px}.lx-invoice-form input{height:42px}.lx-invoice-form input:disabled{background:#f7f5f8;color:#8e8791}.lx-invoice-consent{display:flex;align-items:center;gap:10px;margin-top:18px;color:#3f3942}.lx-invoice-consent input{accent-color:#681057}.lx-order-edit-footer.has-secondary{gap:12px}.lx-order-edit-footer .secondary{border:1px solid #d3bfd2;background:#fff;color:#4d144a}.lx-order-edit-footer.has-secondary button{width:104px}@media(max-width:620px){.lx-buy-benefit-list{grid-template-columns:1fr}.lx-invoice-type-grid{grid-template-columns:1fr}.lx-invoice-form{grid-template-columns:92px minmax(0,1fr)}}`;
    style.textContent += `.lx-buy-wallet-box{width:100%;border-color:#f0c6cc;background:#fff1f2}.lx-buy-wallet-box input{min-width:0;-webkit-appearance:none;appearance:none}.lx-buy-coupon-field input{width:100%;border-color:#f0c6cc;background:#fff1f2}`;
    style.textContent += `.lx-payment-dialog{display:flex;flex-direction:column;overflow:hidden}.lx-payment-dialog h2{margin-bottom:0}.lx-payment-stage{flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:22px 18px;text-align:center}.lx-payment-state{margin:0 0 18px;color:#4d144a;font-size:17px;font-weight:700}.lx-payment-wait{display:flex;align-items:center;gap:18px;margin:0 0 18px;color:#6c6570;font-size:13px}.lx-payment-wait strong{color:#19171b;font-size:18px}.lx-payment-countdown{color:#b8252e;font-variant-numeric:tabular-nums}.lx-payment-product{max-width:420px;margin:0;color:#4d474f;font-size:13px;line-height:1.8}.lx-payment-actions{display:flex;justify-content:flex-end;gap:12px;margin-top:auto;padding-top:16px}.lx-payment-actions button{height:38px;min-width:108px;padding:0 22px;border:1px solid #d3bfd2;border-radius:100px;background:#fff;color:#4d144a;font-size:13px;font-weight:600;cursor:pointer}.lx-payment-actions .primary{border:0;background:linear-gradient(90deg,#4d144a 12%,#b8252e);color:#fff}.lx-payment-success-icon{width:58px;height:58px;display:grid;place-items:center;margin-bottom:18px;border-radius:50%;background:linear-gradient(135deg,#4d144a,#b8252e);color:#fff;font-size:30px}.lx-payment-success-title{margin:0 0 10px;font-size:20px}.lx-payment-success-meta{margin:0;color:#77717d;line-height:1.8}.lx-payment-success-meta b{color:#19171b}`;
    style.textContent += `[data-buy-modal-direct]{position:fixed;inset:0;z-index:100000;font-family:"Source Han Sans CN","PingFang SC",sans-serif;font-size:12px}.lx-buy-direct-mask{position:absolute;inset:0;background:rgba(31,20,38,.55);backdrop-filter:blur(3px)}.lx-buy-direct-dialog{position:absolute;left:50%;top:50%;width:min(540px,calc(100vw - 32px));max-height:calc(100vh - 32px);transform:translate(-50%,-50%);box-sizing:border-box;padding:20px 22px 18px;border:1px solid #e2ddeb;border-radius:12px;background:#fff;color:#19171b;box-shadow:0 18px 52px rgba(31,20,38,.18);overflow:auto}.lx-buy-direct-dialog h2{width:max-content;display:flex;align-items:center;margin:0 0 14px;background:linear-gradient(90deg,#4d144a 12%,#b8252e);-webkit-background-clip:text;background-clip:text;color:transparent;-webkit-text-fill-color:transparent;font-size:16px;font-weight:600;line-height:22px}.lx-buy-direct-dialog h2:before{content:"";width:16px;height:16px;flex:0 0 16px;margin-right:8px;background:linear-gradient(135deg,#4d144a 12%,#b8252e);-webkit-mask:url('/assets/icons/global-sparkle.svg') center/contain no-repeat;mask:url('/assets/icons/global-sparkle.svg') center/contain no-repeat}.lx-buy-direct-close{position:absolute;right:18px;top:16px;width:24px;height:24px;border:0;background:transparent;color:#77717d;font-size:22px;line-height:1;cursor:pointer}.lx-buy-direct-card{padding:14px 16px 12px;border:1px solid #e2ddeb;border-radius:8px;background:#fcfaff}.lx-buy-direct-product{display:grid;grid-template-columns:60px 1fr auto;gap:12px;align-items:center;padding-bottom:10px;border-bottom:1px solid #e6dfe9}.lx-buy-direct-product img{width:60px;height:60px;object-fit:contain;border-radius:4px;background:#fff}.lx-buy-direct-product-copy{display:grid;gap:4px;min-width:0}.lx-buy-direct-product-copy strong{overflow:hidden;font-size:13px;font-weight:500;text-overflow:ellipsis;white-space:nowrap}.lx-buy-direct-product-copy span{color:#37313b;font-size:11px}.lx-buy-direct-config{border:0;background:transparent;color:#4d144a;font-size:12px;font-weight:600;cursor:pointer}.lx-buy-direct-section{padding:7px 0;border-bottom:1px solid #e6dfe9}.lx-buy-direct-section:last-of-type{border-bottom:0}.lx-buy-direct-row{display:grid;grid-template-columns:70px 1fr;gap:0;padding:2px 0;font-size:12px;line-height:16px}.lx-buy-direct-row strong{font-weight:600}.lx-buy-direct-price{display:flex;align-items:baseline;gap:8px;margin-top:10px;line-height:22px}.lx-buy-direct-price strong{font-size:12px}.lx-buy-direct-price b{color:#ff2f2f;font-size:16px}.lx-buy-direct-price span{color:#19171b;font-size:12px}.lx-buy-direct-price span em{color:#ff2f2f;font-style:normal}.lx-buy-direct-detail{margin-top:0;color:#454545;font-size:12px;line-height:16px}.lx-buy-direct-detail strong{color:#454545;font-weight:500}.lx-buy-direct-detail span{margin-left:8px;color:#ff2f2f}.lx-buy-direct-actions{display:flex;justify-content:flex-end;gap:12px;margin-top:14px}.lx-buy-direct-actions button{width:96px;height:35px;min-width:0;padding:0;border:1px solid #d3bfd2;border-radius:100px;background:#fff;color:#4d144a;font-size:13px;font-weight:500;cursor:pointer}.lx-buy-direct-actions .primary{width:92px;border:0;background:linear-gradient(90deg,#4d144a 12%,#b8252e);color:#fff}.lx-buy-direct-footnote{margin:7px 0 0;text-align:right;color:#c1a9c0;font-size:10px;line-height:12px}@media(max-width:560px){.lx-buy-direct-dialog{padding:18px 14px}.lx-buy-direct-card{padding:12px}.lx-buy-direct-product{grid-template-columns:52px 1fr auto}.lx-buy-direct-product img{width:52px;height:52px}.lx-buy-direct-row{grid-template-columns:66px 1fr}.lx-buy-direct-price{flex-wrap:wrap}.lx-buy-direct-actions{justify-content:stretch}.lx-buy-direct-actions button{flex:1;width:auto}}`;
    style.textContent += `.lx-buy-direct-config,.lx-buy-direct-detail-button{text-decoration:none!important}.lx-buy-direct-detail-button{padding:0;border:0;background:transparent;color:#454545;font:inherit;font-weight:500;cursor:pointer}.lx-buy-direct-detail-button:hover,.lx-buy-direct-detail-button:focus,.lx-buy-direct-config:hover,.lx-buy-direct-config:focus{color:inherit;text-decoration:none!important}.lx-buy-sub-dialog{width:min(620px,calc(100vw - 32px));height:min(560px,calc(100vh - 32px));padding:24px 28px 22px;display:flex;flex-direction:column;overflow:hidden}.lx-buy-sub-dialog h2{margin-bottom:20px;background:none;color:#19171b;-webkit-text-fill-color:initial;font-size:19px;font-weight:700}.lx-buy-sub-dialog h2:before{content:none}.lx-buy-price-list{border-top:0}.lx-buy-price-line{display:grid;grid-template-columns:1fr auto 14px;align-items:center;min-height:48px;border-bottom:1px solid #e5dfe8;font-size:13px}.lx-buy-price-line:last-child{border-bottom:0}.lx-buy-price-line strong{font-weight:500}.lx-buy-price-line .amount{color:#19171b;font-weight:500}.lx-buy-price-line .discount{color:#ff2f2f}.lx-buy-price-line .muted{color:#979797}.lx-buy-price-line .arrow{color:#979797;font-size:18px;text-align:right}.lx-buy-price-line.is-clickable{cursor:pointer}.lx-buy-sub-footer{display:flex;align-items:center;gap:12px;margin:auto 0 0;padding:16px 0 0;border-top:1px solid #e5dfe8}.lx-buy-sub-total{display:flex;align-items:baseline;gap:12px;margin-right:auto}.lx-buy-sub-total b{color:#ff2f2f;font-size:22px}.lx-buy-sub-total span{font-size:12px}.lx-buy-sub-total em{color:#ff2f2f;font-style:normal}.lx-buy-sub-footer button,.lx-buy-coupon-actions button{height:38px;min-width:108px;padding:0 22px;border:1px solid #d3bfd2;border-radius:100px;background:#fff;color:#4d144a;font-size:13px;font-weight:600;cursor:pointer}.lx-buy-sub-footer .primary,.lx-buy-coupon-actions .primary{border:0;background:linear-gradient(90deg,#4d144a 12%,#b8252e);color:#fff}.lx-buy-coupon-field{display:grid;gap:11px}.lx-buy-coupon-field label{font-size:13px;font-weight:600}.lx-buy-coupon-field input{height:46px;box-sizing:border-box;padding:0 14px;border:1px solid #681057;border-radius:6px;outline:none;font:inherit}.lx-buy-coupon-field input:focus{box-shadow:0 0 0 2px rgba(104,16,87,.12)}.lx-buy-coupon-field small{color:#8b838e}.lx-buy-coupon-actions{display:flex;justify-content:flex-end;gap:12px;margin:auto 0 0;padding:16px 0 0;border-top:1px solid #e5dfe8}@media(max-width:620px){.lx-buy-sub-dialog{padding:20px;height:min(520px,calc(100vh - 24px))}}`;
    style.textContent += `.lx-order-edit-dialog{width:min(620px,calc(100vw - 32px));height:min(620px,calc(100vh - 32px));padding:0;display:flex;flex-direction:column;overflow:hidden}.lx-order-edit-head{height:58px;flex:none;display:flex;align-items:center;gap:14px;padding:0 22px;border-bottom:1px solid #e8e2eb}.lx-order-edit-head h2{margin:0;background:none;color:#19171b;-webkit-text-fill-color:initial;font-size:19px;font-weight:700}.lx-order-edit-head h2:before{content:none}.lx-order-edit-back{border:0;background:transparent;color:#5d5661;font-size:24px;cursor:pointer}.lx-order-edit-body{flex:1;min-height:0;padding:20px 26px;overflow:auto}.lx-order-address{display:grid;grid-template-columns:22px 1fr auto;gap:10px;align-items:center;padding:13px 14px;border:1px solid #e8e0eb;border-radius:8px;background:#faf8fc}.lx-order-address b{font-size:13px}.lx-order-address button{border:0;background:transparent;color:#681057;cursor:pointer}.lx-order-edit-section{padding:16px 0;border-bottom:1px solid #ebe5ed}.lx-order-edit-section h3{margin:0 0 10px;font-size:14px}.lx-order-channel-grid{display:grid;grid-template-columns:1fr 1fr;gap:9px}.lx-order-channel{display:grid;gap:3px;padding:10px 12px;border:1px solid #ddd5e1;border-radius:8px;background:#fff;text-align:left;cursor:pointer}.lx-order-channel.is-active{border:2px solid #681057;padding:9px 11px;background:#fcf8fc}.lx-order-channel small{color:#979197}.lx-order-subtitle{display:flex;justify-content:space-between;margin:14px 0 8px;font-weight:600}.lx-order-subtitle small{color:#9a949d;font-weight:400}.lx-order-quick-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:8px}.lx-order-quick{display:flex;align-items:center;gap:7px;height:40px;padding:0 9px;border:1px solid #ddd5e1;border-radius:7px;background:#fff;cursor:pointer}.lx-order-quick.is-active{border-color:#681057;background:#fcf8fc}.lx-order-logo{width:24px;height:24px;display:grid;place-items:center;border-radius:6px;background:#1677ff;color:#fff;font-weight:700}.lx-order-provider{width:100%;display:grid;grid-template-columns:30px auto 1fr 14px;gap:8px;align-items:center;margin-top:8px;padding:9px 10px;border:1px solid #ddd5e1;border-radius:7px;background:#fff;text-align:left;cursor:pointer}.lx-order-provider .lx-order-logo{background:#8b245d}.lx-order-provider small{color:#99939c}.lx-order-chevron{width:7px;height:7px;border-right:1px solid #8c8790;border-bottom:1px solid #8c8790;transform:rotate(45deg)}.lx-order-provider.is-expanded .lx-order-chevron{transform:rotate(225deg)}.lx-order-plan-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:7px;margin-top:7px}.lx-order-plan{display:grid;grid-template-columns:auto 1fr 14px;gap:6px;align-items:center;padding:8px;border:1px solid #ddd5e1;border-radius:7px;background:#fff;text-align:left;cursor:pointer}.lx-order-plan.is-active{border-color:#681057;background:#fcf8fc}.lx-order-plan span,.lx-order-plan small{display:block}.lx-order-plan small{color:#99939c}.lx-order-radio{width:12px;height:12px;border:1px solid #b9b3bc;border-radius:50%}.lx-order-plan.is-active .lx-order-radio{border:4px solid #681057;box-sizing:border-box}.lx-order-form{display:grid;grid-template-columns:82px 1fr;gap:10px 12px;align-items:center}.lx-order-form input{height:38px;box-sizing:border-box;padding:0 11px;border:1px solid #d9cfdd;border-radius:6px;outline:none}.lx-order-form input:focus{border-color:#681057}.lx-order-combobox{position:relative}.lx-order-combobox input{width:100%}.lx-order-code-menu{position:absolute;top:calc(100% + 4px);right:0;left:0;z-index:3;padding:5px;border:1px solid #ddd5e1;border-radius:6px;background:#fff;box-shadow:0 8px 20px rgba(40,22,41,.12)}.lx-order-code-menu button{width:100%;padding:8px;border:0;border-radius:4px;background:#fff;text-align:left;cursor:pointer}.lx-order-code-menu button:hover{background:#f7f2f8}.lx-order-invoice{width:100%;height:48px;display:grid;grid-template-columns:auto 1fr 14px;gap:12px;align-items:center;margin-top:16px;padding:0 14px;border:1px solid #e5dfe8;border-radius:8px;background:#fff;text-align:left;cursor:pointer}.lx-order-invoice span{color:#7f7882;text-align:right}.lx-order-edit-footer{height:62px;flex:none;display:flex;justify-content:flex-end;align-items:center;padding:0 26px;border-top:1px solid #e8e2eb;background:#fff}.lx-order-edit-footer button{width:104px;height:36px;border:0;border-radius:100px;background:linear-gradient(90deg,#4d144a,#b8252e);color:#fff;font-weight:600;cursor:pointer}@media(max-width:620px){.lx-order-quick-grid{grid-template-columns:1fr 1fr}.lx-order-plan-grid{grid-template-columns:1fr}.lx-order-edit-body{padding:16px}.lx-order-form{grid-template-columns:72px 1fr}}`;
    style.textContent += `.lx-buy-direct-dialog{width:min(620px,calc(100vw - 32px));height:min(560px,calc(100vh - 32px))}.lx-order-edit-dialog{height:min(560px,calc(100vh - 32px))}.lx-buy-sub-footer,.lx-buy-coupon-actions{border-top:0}.lx-buy-direct-dialog:not(.lx-buy-sub-dialog):not(.lx-order-edit-dialog){display:flex;flex-direction:column}.lx-buy-direct-dialog:not(.lx-buy-sub-dialog):not(.lx-order-edit-dialog) .lx-buy-direct-card{flex:1}`;
    style.textContent += `.lx-order-edit-head{height:64px;padding:0 18px;gap:8px}.lx-order-edit-head h2{font-size:20px;line-height:28px}.lx-order-edit-back{width:40px;height:40px;display:grid;place-items:center;padding:0;border-radius:8px;font-size:28px;line-height:1}.lx-order-edit-back:hover,.lx-order-edit-back:focus{background:#f6f2f7;color:#4d144a}.lx-order-edit-body{padding:18px 26px 24px}.lx-order-address{min-height:54px;box-sizing:border-box;padding:11px 14px;background:#fbf9fc}.lx-order-address>span{color:#681057}.lx-order-address b{font-size:13px;line-height:19px}.lx-order-edit-section{padding:18px 0}.lx-order-edit-section h3{margin-bottom:12px;font-size:14px;line-height:20px}.lx-order-channel{min-height:58px;padding:10px 12px}.lx-order-channel.is-active{padding:9px 11px;border-color:#681057;background:#fbf7fb}.lx-order-channel strong{font-size:13px;line-height:18px}.lx-order-channel small{color:#979197;font-size:11px;line-height:16px}.lx-order-subtitle{margin:16px 0 9px;font-size:13px;line-height:18px}.lx-order-subtitle small{color:#979197;font-size:10px}.lx-order-quick{height:42px;color:#2b272d;font-size:12px}.lx-order-provider{min-height:50px;margin-top:9px}.lx-order-provider b{font-size:13px}.lx-order-provider small{color:#979197;font-size:11px}.lx-order-plan-grid{gap:8px;margin-top:8px}.lx-order-plan{min-height:54px;padding:8px 10px}.lx-order-plan strong{font-size:13px}.lx-order-plan span{font-size:11px;line-height:15px}.lx-order-plan small{color:#979197;font-size:10px}.lx-order-edit-footer{height:64px;padding:0 26px}.lx-order-edit-footer button{height:38px}.lx-order-form{gap:11px 12px}.lx-order-form label{font-size:12px;color:#454047}.lx-order-form input{height:40px;font-size:12px}`;
    style.textContent += `.lx-buy-direct-dialog:not(.lx-buy-sub-dialog):not(.lx-order-edit-dialog) .lx-buy-direct-card{display:flex;flex-direction:column}.lx-buy-direct-dialog:not(.lx-buy-sub-dialog):not(.lx-order-edit-dialog) .lx-buy-direct-actions{margin-top:auto;padding-top:14px}.lx-order-plan-grid[hidden]{display:none!important}`;
    style.textContent += `.lx-order-edit-head,.lx-order-edit-footer,.lx-buy-sub-footer,.lx-buy-coupon-actions{border-top:0!important;border-bottom:0!important}`;
    style.textContent += `.lx-order-plan{grid-template-columns:auto minmax(0,1fr);column-gap:10px;align-items:center}.lx-order-plan-cost{display:grid!important;gap:2px;min-width:0}.lx-order-plan-cost b{color:#4d144a;font-size:13px;line-height:18px;white-space:nowrap}.lx-order-plan-cost small{font-size:10px;line-height:14px}.lx-order-plan-term{white-space:nowrap}`;
    style.textContent += `.lx-order-address>img{display:block;width:16px;height:16px;object-fit:contain}.lx-order-address{grid-template-columns:16px minmax(0,1fr) auto}`;
    style.textContent += `.lx-order-channel,.lx-order-quick,.lx-order-plan{box-sizing:border-box;border:.8px solid rgba(77,20,74,.1);border-radius:4px;background:#fff}.lx-order-channel.is-active,.lx-order-quick.is-active,.lx-order-plan.is-active{border-color:#4d144a;background:#f9eff6}.lx-order-channel.is-active{padding:10px 12px}.lx-order-plan.is-active .lx-order-radio{border-color:#4d144a}`;
    style.textContent += `.lx-order-edit-back,.lx-order-edit-back:hover,.lx-order-edit-back:focus,.lx-order-edit-back:active{background:transparent!important;color:#5d5661;outline:0}.lx-order-edit-body>.lx-order-edit-section:first-child{padding-top:0}.lx-order-code-menu{top:auto;bottom:calc(100% + 4px);max-height:132px;overflow:auto;z-index:8}.lx-order-combobox{z-index:2}`;
    style.textContent += `.lx-config-section{padding:0 0 20px;margin-bottom:20px;border-bottom:1px solid rgba(77,20,74,.1)}.lx-config-section h3{margin:0 0 13px;font-size:14px;line-height:20px}.lx-config-options{display:flex;flex-wrap:wrap;gap:10px}.lx-config-option{min-width:126px;height:40px;padding:0 16px;border:.8px solid rgba(77,20,74,.1);border-radius:4px;background:#fff;color:#38333a;font:inherit;font-size:13px;cursor:pointer}.lx-config-option.is-active{border-color:#4d144a;background:#f9eff6;color:#4d144a}.lx-config-option:disabled{background:#f7f6f7;color:#bbb6bd;cursor:not-allowed}.lx-config-quantity{display:flex;align-items:center;justify-content:space-between}.lx-config-quantity-copy{display:flex;align-items:center;gap:10px}.lx-config-quantity-copy h3{margin:0;font-size:14px}.lx-config-quantity-copy small{color:#99939c}.lx-config-stepper{display:grid;grid-template-columns:36px 48px 36px;height:36px}.lx-config-stepper button,.lx-config-stepper output{display:grid;place-items:center;box-sizing:border-box;border:.8px solid rgba(77,20,74,.1);background:#fff;color:#38333a;font-size:18px}.lx-config-stepper button:first-child{border-radius:6px 0 0 6px}.lx-config-stepper button:last-child{border-radius:0 6px 6px 0}.lx-config-stepper output{border-right:0;border-left:0;font-size:14px}.lx-config-stepper button:disabled{color:#c8c3ca;background:#f7f6f7}.lx-config-dialog .lx-order-edit-body{padding-top:12px}`;
    style.textContent += `.lx-order-channel.is-active,.lx-order-quick.is-active,.lx-order-plan.is-active,.lx-config-option.is-active{border-color:transparent;background:linear-gradient(#f9eff6,#f9eff6) padding-box,linear-gradient(90deg,#4d144a 0%,#b8252e 100%) border-box;color:#4d144a}`;
    style.textContent += `body>.lx-p0-toast{position:fixed!important;z-index:100100!important}`;
    style.textContent += `.lx-order-channel.is-active,.lx-order-quick.is-active,.lx-order-plan.is-active,.lx-config-option.is-active{border-width:1px!important;border-style:solid!important}.lx-order-plan{grid-template-columns:auto 1fr}.lx-order-radio{display:none!important}.lx-order-edit-section{border-bottom:0!important}.lx-invoice-dialog .lx-order-edit-body{padding-top:8px}.lx-invoice-dialog .lx-order-edit-section{padding-bottom:16px;margin-bottom:0}`;
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
    style.textContent += `.lx-buy-direct-dialog:not(.lx-buy-sub-dialog):not(.lx-order-edit-dialog) .lx-buy-direct-card{gap:0;background:transparent}.lx-buy-direct-dialog:not(.lx-buy-sub-dialog):not(.lx-order-edit-dialog) .lx-buy-direct-product,.lx-buy-direct-dialog:not(.lx-buy-sub-dialog):not(.lx-order-edit-dialog) .lx-buy-direct-section{margin:0 0 10px;padding:12px 14px;border:1px solid #ebe4ed;border-radius:12px;background:#fff}.lx-buy-direct-dialog:not(.lx-buy-sub-dialog):not(.lx-order-edit-dialog) .lx-buy-direct-product{grid-template-columns:60px 1fr auto;min-height:64px;box-sizing:border-box}.lx-buy-direct-dialog:not(.lx-buy-sub-dialog):not(.lx-order-edit-dialog) .lx-buy-direct-product,.lx-buy-direct-dialog:not(.lx-buy-sub-dialog):not(.lx-order-edit-dialog) .lx-buy-direct-section{border-bottom:1px solid #ebe4ed}.lx-buy-direct-dialog:not(.lx-buy-sub-dialog):not(.lx-order-edit-dialog) .lx-buy-direct-section:last-of-type{border-bottom:1px solid #ebe4ed}.lx-buy-direct-dialog:not(.lx-buy-sub-dialog):not(.lx-order-edit-dialog) .lx-buy-direct-row{padding:2px 0}.lx-order-summary{margin:0;padding:13px 14px;border:1px solid #f0ddea;border-radius:12px;background:#fcf3fa}.lx-order-summary .lx-buy-direct-price{margin-top:0}.lx-order-summary .lx-buy-direct-detail{margin-top:6px}.lx-buy-direct-dialog:not(.lx-buy-sub-dialog):not(.lx-order-edit-dialog) .lx-buy-direct-actions{padding-top:12px}.lx-buy-direct-dialog:not(.lx-buy-sub-dialog):not(.lx-order-edit-dialog) .lx-buy-direct-footnote{margin-top:5px}`;
    style.textContent += `.lx-buy-direct-dialog:not(.lx-buy-sub-dialog):not(.lx-order-edit-dialog) .lx-order-product-card{margin:0 0 10px;padding:12px 14px;border:1px solid #ebe4ed;border-radius:12px;background:#fff}.lx-buy-direct-dialog:not(.lx-buy-sub-dialog):not(.lx-order-edit-dialog) .lx-order-product-card .lx-buy-direct-product{min-height:60px;margin:0;padding:0 0 9px;border:0;border-radius:0;background:transparent}.lx-buy-direct-dialog:not(.lx-buy-sub-dialog):not(.lx-order-edit-dialog) .lx-order-product-card .lx-buy-direct-product-spec{margin:0;padding:0;border:0;border-radius:0;background:transparent}.lx-buy-direct-dialog:not(.lx-buy-sub-dialog):not(.lx-order-edit-dialog) .lx-order-shipping,.lx-buy-direct-dialog:not(.lx-buy-sub-dialog):not(.lx-order-edit-dialog) .lx-order-payment{padding:10px 14px}.lx-buy-direct-dialog:not(.lx-buy-sub-dialog):not(.lx-order-edit-dialog) .lx-buy-direct-product img{width:60px;height:60px;object-fit:contain;background:#fafafa}`;
    style.textContent += `.lx-buy-direct-dialog:not(.lx-buy-sub-dialog):not(.lx-order-edit-dialog) .lx-order-product-card{border-color:#e6ddea;background:linear-gradient(135deg,#fff 0%,#fcf9fe 100%)}.lx-buy-direct-dialog:not(.lx-buy-sub-dialog):not(.lx-order-edit-dialog) .lx-order-product-card .lx-buy-direct-product-copy strong{font-size:14px;font-weight:600}.lx-buy-direct-dialog:not(.lx-buy-sub-dialog):not(.lx-order-edit-dialog) .lx-order-shipping{background:#fff}.lx-buy-direct-dialog:not(.lx-buy-sub-dialog):not(.lx-order-edit-dialog) .lx-order-payment{background:#fcfbfd}.lx-buy-national-subsidy{width:100%;display:grid;grid-template-columns:28px minmax(0,1fr) auto;align-items:center;gap:9px;margin:0 0 10px;padding:10px 13px;border:1px solid #cfeee1;border-radius:10px;background:linear-gradient(90deg,#effcf6,#fbfffd);color:#3d4d47;text-align:left;cursor:pointer}.lx-buy-national-subsidy i{display:grid;place-items:center;width:28px;height:28px;border-radius:8px;background:#d9f7e8;color:#108957;font-size:15px;font-style:normal}.lx-buy-national-subsidy strong{display:block;color:#35433e;font-size:12px;line-height:18px}.lx-buy-national-subsidy small{display:block;margin-top:1px;color:#87938e;font-size:10px;line-height:14px}.lx-buy-national-subsidy b{color:#5d1755;font-size:12px;white-space:nowrap}.lx-buy-national-subsidy b::after{content:"›";margin-left:5px;font-size:17px;font-weight:400;vertical-align:-1px}.lx-buy-national-subsidy.is-claimed{border-color:#e1ebe5;background:#f7fbf9}.lx-buy-national-subsidy.is-claimed b{color:#4b8066}.lx-order-summary{border-color:#efd8e9;background:linear-gradient(135deg,#fff7fc,#fcf2fa)}.lx-order-summary .lx-buy-direct-price b{font-size:18px}.lx-order-summary .lx-buy-direct-detail{display:flex;align-items:center;gap:8px}.lx-order-summary .lx-buy-direct-detail span{margin-left:0}`;
    style.textContent += `.lx-buy-direct-dialog:not(.lx-buy-sub-dialog):not(.lx-order-edit-dialog){height:min(660px,calc(100vh - 32px));overflow-y:auto;scrollbar-width:none;background:#fff}.lx-buy-direct-dialog:not(.lx-buy-sub-dialog):not(.lx-order-edit-dialog)::-webkit-scrollbar{display:none}.lx-buy-direct-dialog:not(.lx-buy-sub-dialog):not(.lx-order-edit-dialog)::before{content:"";position:absolute;z-index:0;top:0;right:0;left:0;height:142px;border-radius:12px 12px 0 0;background:radial-gradient(120% 130px at 18% 0%,rgba(255,138,92,.16) 0%,rgba(255,138,92,.08) 34%,transparent 70%),radial-gradient(120% 150px at 92% 0%,rgba(146,86,214,.16) 0%,rgba(146,86,214,.08) 36%,transparent 72%);pointer-events:none}.lx-buy-direct-dialog:not(.lx-buy-sub-dialog):not(.lx-order-edit-dialog)>*{position:relative;z-index:1}.lx-buy-direct-dialog:not(.lx-buy-sub-dialog):not(.lx-order-edit-dialog) h2{margin-bottom:18px}.lx-buy-direct-dialog:not(.lx-buy-sub-dialog):not(.lx-order-edit-dialog) .lx-buy-direct-card{padding-top:4px}`;
    style.textContent += `.lx-buy-national-subsidy{border:0;background:linear-gradient(90.759621deg,#d2f7e1 0%,rgba(245,254,249,0) 132.9%);box-shadow:none}.lx-buy-national-subsidy i{background:rgba(210,247,225,.76);color:#168a59}.lx-buy-national-subsidy strong{color:#000;font-weight:500}.lx-buy-national-subsidy small{color:#697972}.lx-buy-national-subsidy b{color:#4d144a;font-weight:600}.lx-buy-national-subsidy.is-claimed{border:0;background:linear-gradient(90.759621deg,#d2f7e1 0%,rgba(245,254,249,0) 132.9%)}.lx-buy-national-subsidy.is-claimed b{color:#4d144a}`;
    style.textContent += `.lx-buy-payment-success{height:100%;display:flex;flex-direction:column;align-items:center;justify-content:center;box-sizing:border-box;padding:46px 28px 34px;text-align:center}.lx-buy-payment-success-icon{width:40px;height:40px;display:grid;place-items:center;margin-bottom:16px;border-radius:50%;background:#35ad72;color:#fff;font-size:23px;line-height:1}.lx-buy-payment-success h2{display:block!important;width:auto!important;margin:0 0 8px!important;background:none!important;color:#19171b!important;-webkit-text-fill-color:initial!important;font-size:20px!important}.lx-buy-payment-success h2:before{content:none!important}.lx-buy-payment-success p{margin:0;color:#77717d;font-size:13px;line-height:20px}.lx-buy-payment-success-card{width:min(360px,100%);display:grid;grid-template-columns:1fr auto;gap:8px 18px;box-sizing:border-box;margin:22px 0;padding:14px 16px;border:1px solid #e6dfe9;border-radius:8px;background:#fcfaff;text-align:left}.lx-buy-payment-success-card span{color:#8b858e}.lx-buy-payment-success-card strong{font-weight:500;text-align:right}.lx-buy-payment-success .primary{min-width:132px;height:38px;padding:0 24px;border:0;border-radius:100px;background:linear-gradient(90deg,#4d144a 12%,#b8252e);color:#fff;font-size:13px;font-weight:500;cursor:pointer}.lx-buy-payment-success small{margin-top:10px;color:#a39da6;font-size:11px}`;
    style.textContent += `.lx-buy-direct-dialog:not(.lx-buy-sub-dialog):not(.lx-order-edit-dialog)>.lx-buy-direct-close{position:absolute!important;z-index:2;top:16px;right:18px;left:auto;margin:0}.lx-buy-direct-dialog:not(.lx-buy-sub-dialog):not(.lx-order-edit-dialog)>h2{margin:0 36px 16px 0}.lx-buy-direct-dialog:not(.lx-buy-sub-dialog):not(.lx-order-edit-dialog) .lx-buy-direct-card{padding-top:0}`;
    style.textContent += `.lx-buy-direct-dialog:not(.lx-buy-sub-dialog):not(.lx-order-edit-dialog) .lx-order-product-card,.lx-buy-direct-dialog:not(.lx-buy-sub-dialog):not(.lx-order-edit-dialog) .lx-order-shipping,.lx-buy-direct-dialog:not(.lx-buy-sub-dialog):not(.lx-order-edit-dialog) .lx-order-payment{background:#fff}`;
    style.textContent += `.lx-buy-direct-dialog:not(.lx-buy-sub-dialog):not(.lx-order-edit-dialog) .lx-buy-direct-card{padding-right:0;padding-left:0}`;
    style.textContent += `.lx-buy-direct-dialog:not(.lx-buy-sub-dialog):not(.lx-order-edit-dialog) .lx-order-product-card,.lx-buy-direct-dialog:not(.lx-buy-sub-dialog):not(.lx-order-edit-dialog) .lx-order-shipping,.lx-buy-direct-dialog:not(.lx-buy-sub-dialog):not(.lx-order-edit-dialog) .lx-order-payment{border-color:#ebe5ed;background:#fcfbfd;box-shadow:0 1px 2px rgba(57,35,63,.025)}.lx-buy-national-subsidy{border-radius:12px}.lx-order-summary{border-color:#efdbe9;box-shadow:0 1px 2px rgba(95,31,78,.02)}`;
    style.textContent += `.lx-buy-direct-dialog:not(.lx-buy-sub-dialog):not(.lx-order-edit-dialog) .lx-order-product-card{display:grid;grid-template-columns:100px minmax(0,1fr) auto;grid-template-areas:"visual heading action" "visual specs specs";column-gap:18px;row-gap:15px;box-sizing:border-box;min-height:156px;padding:20px 22px;border-radius:18px;box-shadow:0 10px 28px rgba(52,39,58,.07),inset 0 1px 0 rgba(255,255,255,.78)}.lx-buy-direct-dialog:not(.lx-buy-sub-dialog):not(.lx-order-edit-dialog) .lx-order-product-card .lx-buy-direct-product{display:contents}.lx-buy-direct-dialog:not(.lx-buy-sub-dialog):not(.lx-order-edit-dialog) .lx-order-product-card .lx-buy-direct-product>img{grid-area:visual;width:100px;height:100px;align-self:center;border-radius:8px;filter:drop-shadow(0 7px 8px rgba(35,30,38,.09))}.lx-buy-direct-dialog:not(.lx-buy-sub-dialog):not(.lx-order-edit-dialog) .lx-order-product-card .lx-buy-direct-product-copy{grid-area:heading;align-self:start;gap:7px;padding-top:5px}.lx-buy-direct-dialog:not(.lx-buy-sub-dialog):not(.lx-order-edit-dialog) .lx-order-product-card .lx-buy-direct-product-copy strong{font-size:15px;line-height:22px}.lx-buy-direct-dialog:not(.lx-buy-sub-dialog):not(.lx-order-edit-dialog) .lx-order-product-card .lx-buy-direct-product-copy span{font-size:12px;line-height:18px}.lx-buy-direct-dialog:not(.lx-buy-sub-dialog):not(.lx-order-edit-dialog) .lx-order-product-card .lx-buy-direct-config{grid-area:action;align-self:start;min-height:34px;margin-top:2px;padding:0 12px;border-radius:100px;box-shadow:0 5px 16px rgba(52,39,58,.06)}.lx-buy-direct-dialog:not(.lx-buy-sub-dialog):not(.lx-order-edit-dialog) .lx-order-product-card .lx-buy-direct-product-spec{grid-area:specs;display:grid;grid-template-columns:.75fr 1.35fr .75fr 1.55fr;gap:12px;align-self:end;min-width:0;margin:0;padding:0}.lx-buy-direct-dialog:not(.lx-buy-sub-dialog):not(.lx-order-edit-dialog) .lx-order-product-card .lx-buy-direct-product-spec .lx-buy-direct-row{display:grid;grid-template-columns:1fr;gap:5px;min-width:0;padding:0}.lx-buy-direct-dialog:not(.lx-buy-sub-dialog):not(.lx-order-edit-dialog) .lx-order-product-card .lx-buy-direct-product-spec .lx-buy-direct-row strong,.lx-buy-direct-dialog:not(.lx-buy-sub-dialog):not(.lx-order-edit-dialog) .lx-order-product-card .lx-buy-direct-product-spec .lx-buy-direct-row span{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.lx-buy-direct-dialog:not(.lx-buy-sub-dialog):not(.lx-order-edit-dialog) .lx-order-product-card .lx-buy-direct-product-spec .lx-buy-direct-row strong{font-size:11px;line-height:16px}.lx-buy-direct-dialog:not(.lx-buy-sub-dialog):not(.lx-order-edit-dialog) .lx-order-product-card .lx-buy-direct-product-spec .lx-buy-direct-row span{font-size:12px;line-height:18px}@media(max-width:560px){.lx-buy-direct-dialog:not(.lx-buy-sub-dialog):not(.lx-order-edit-dialog) .lx-order-product-card{grid-template-columns:76px minmax(0,1fr) auto;column-gap:12px;padding:16px}.lx-buy-direct-dialog:not(.lx-buy-sub-dialog):not(.lx-order-edit-dialog) .lx-order-product-card .lx-buy-direct-product>img{width:76px;height:76px}.lx-buy-direct-dialog:not(.lx-buy-sub-dialog):not(.lx-order-edit-dialog) .lx-order-product-card .lx-buy-direct-product-spec{grid-template-columns:1fr 1fr}.lx-buy-direct-dialog:not(.lx-buy-sub-dialog):not(.lx-order-edit-dialog) .lx-order-product-card .lx-buy-direct-config{padding:0 8px}}`;
    style.textContent += `.lx-buy-direct-dialog:not(.lx-buy-sub-dialog):not(.lx-order-edit-dialog) .lx-order-product-card{border-color:transparent;background:#fff;box-shadow:0 12px 34px rgba(43,34,48,.09),0 2px 8px rgba(43,34,48,.045),inset 0 1px 0 rgba(255,255,255,.95)}.lx-buy-direct-dialog:not(.lx-buy-sub-dialog):not(.lx-order-edit-dialog) .lx-order-product-card .lx-buy-direct-product>img{background:#fff;box-shadow:0 8px 24px rgba(43,34,48,.08);filter:none}.lx-buy-direct-dialog:not(.lx-buy-sub-dialog):not(.lx-order-edit-dialog) .lx-order-shipping,.lx-buy-direct-dialog:not(.lx-buy-sub-dialog):not(.lx-order-edit-dialog) .lx-order-payment{margin:0;padding:10px 14px;border:0;border-radius:0;background:transparent;box-shadow:none}.lx-buy-direct-dialog:not(.lx-buy-sub-dialog):not(.lx-order-edit-dialog) .lx-order-payment{margin-bottom:8px}`;
    style.textContent += `.lx-buy-national-subsidy,.lx-buy-national-subsidy.is-claimed{width:100%;height:30px;min-height:30px;display:flex;align-items:center;justify-content:flex-start;gap:16px;box-sizing:border-box;margin:0 0 10px;padding:0 7px;border:0!important;border-radius:2px!important;background:linear-gradient(90.759621deg,#d2f7e1 0%,rgba(245,254,249,0) 132.9%)!important;box-shadow:none!important}.lx-buy-national-subsidy i{display:none!important}.lx-buy-national-subsidy>span{display:block;flex:0 0 auto}.lx-buy-national-subsidy strong{display:block;color:#000;font-size:12px;font-weight:500;line-height:13px;white-space:nowrap}.lx-buy-national-subsidy small{display:none!important}.lx-buy-national-subsidy b,.lx-buy-national-subsidy.is-claimed b{display:block;flex:0 0 auto;color:#4d144a;font-size:12px;font-weight:400;line-height:14px;white-space:nowrap}.lx-buy-national-subsidy b::after{content:none!important}`;
    style.textContent += `.lx-buy-national-subsidy,.lx-buy-national-subsidy.is-claimed{width:max-content;max-width:100%;gap:12px;padding-right:12px;padding-left:12px}.lx-order-summary{padding:8px 14px;border:0!important;border-radius:0;background:transparent!important;box-shadow:none!important}`;
    style.textContent += `.lx-buy-direct-dialog:not(.lx-buy-sub-dialog):not(.lx-order-edit-dialog){height:auto;min-height:0}.lx-buy-direct-dialog:not(.lx-buy-sub-dialog):not(.lx-order-edit-dialog) .lx-buy-direct-card{flex:0 0 auto}.lx-buy-direct-dialog:not(.lx-buy-sub-dialog):not(.lx-order-edit-dialog) .lx-order-product-card{box-shadow:0 7px 22px rgba(43,34,48,.05),0 1px 4px rgba(43,34,48,.025),inset 0 1px 0 rgba(255,255,255,.95)}.lx-buy-direct-dialog:not(.lx-buy-sub-dialog):not(.lx-order-edit-dialog) .lx-order-product-card .lx-buy-direct-product>img{box-shadow:0 5px 16px rgba(43,34,48,.04)}.lx-buy-national-subsidy,.lx-buy-national-subsidy.is-claimed{width:320px;max-width:calc(100% - 14px);margin-left:14px;background:linear-gradient(90deg,#d1f7df 0%,#e0f9e9 52%,#effbf4 76%,rgba(255,255,255,0) 100%)!important}`;
    style.textContent += `.lx-order-edit-dialog .lx-order-address{grid-template-columns:28px minmax(0,1fr) auto;gap:14px;min-height:78px;padding:18px 20px;border:0;border-radius:18px;background:#fff;box-shadow:0 7px 22px rgba(43,34,48,.05),0 1px 4px rgba(43,34,48,.025),inset 0 1px 0 rgba(255,255,255,.95)}.lx-order-edit-dialog .lx-order-address>img{width:28px;height:28px;padding:6px;box-sizing:border-box;border-radius:8px;background:#fff;box-shadow:0 5px 16px rgba(43,34,48,.04)}.lx-order-edit-dialog .lx-order-address b{font-size:14px;line-height:21px}.lx-order-edit-dialog .lx-order-address button{padding:7px 10px;border-radius:100px;background:#fff;color:#4d144a;box-shadow:0 5px 16px rgba(43,34,48,.05);font-weight:500}`;
    style.textContent += `.lx-buy-sub-dialog .lx-buy-price-list{padding:0 4px}.lx-buy-sub-dialog .lx-buy-price-line{min-height:52px;border-bottom:0}.lx-buy-sub-dialog .lx-buy-price-line.is-clickable{margin-top:2px}.lx-buy-sub-dialog .lx-buy-price-line.is-clickable:hover{background:transparent}`;
    style.textContent += `.lx-order-edit-head h2,.lx-buy-sub-dialog h2{font-size:18px;line-height:26px;font-weight:700}.lx-config-section h3,.lx-order-edit-section h3{font-size:14px;line-height:20px;font-weight:600}.lx-order-edit-body,.lx-buy-price-list{font-size:13px}.lx-order-edit-body small,.lx-buy-price-list .muted{font-size:12px}.lx-order-edit-footer button,.lx-buy-sub-footer button{font-size:13px;font-weight:600}.lx-config-dialog{height:min(560px,calc(100vh - 32px));min-height:0}.lx-config-dialog .lx-order-edit-body{padding:10px 26px 18px;flex:1 1 auto}.lx-config-dialog .lx-config-section{margin:0 0 14px;padding:0}.lx-config-dialog .lx-config-section h3{margin-bottom:10px}.lx-config-dialog .lx-config-options{display:grid;grid-template-columns:repeat(3,144px);gap:16px}.lx-config-dialog .lx-config-option{width:144px;min-width:0;height:40px;padding:0 12px;border-radius:100px;font-size:13px;white-space:nowrap}.lx-config-dialog .lx-config-quantity{padding-top:0}.lx-config-dialog .lx-order-edit-footer{height:56px;padding:0 26px}@media(max-width:620px){.lx-config-dialog .lx-config-options{grid-template-columns:repeat(2,minmax(0,1fr))}.lx-config-dialog .lx-config-option{width:100%;height:40px;border-radius:100px;font-size:12px}}`;
    style.textContent += `.lx-order-edit-dialog:not(.lx-config-dialog) .lx-order-edit-body{padding-top:12px;padding-bottom:16px}.lx-order-edit-dialog:not(.lx-config-dialog) .lx-order-edit-footer{height:56px}`;
    style.textContent += `.lx-order-edit-footer{height:78px!important;box-sizing:border-box;align-items:flex-start;padding:16px 26px 24px}.lx-config-dialog .lx-order-edit-footer{height:78px!important;padding:16px 26px 24px!important}.lx-buy-sub-footer,.lx-buy-coupon-actions{min-height:56px;box-sizing:border-box;align-items:flex-start;padding:16px 0 2px}.lx-config-dialog .lx-config-section:last-of-type{margin-bottom:24px}`;
    style.textContent += `.lx-config-dialog .lx-config-section:nth-of-type(-n+2) .lx-config-option{height:36px}`;
    style.textContent += `.lx-buy-direct-detail-button,.lx-buy-direct-detail-button:hover,.lx-buy-direct-detail-button:focus{text-decoration:underline!important;text-decoration-thickness:1px!important;text-underline-offset:3px}`;
    style.textContent += `.lx-invoice-dialog .lx-order-edit-body{padding:12px 26px 16px}.lx-invoice-dialog .lx-order-edit-section{margin:0;padding:0;border:0}.lx-invoice-dialog .lx-order-channel-grid{grid-template-columns:repeat(3,minmax(0,1fr));gap:8px}.lx-invoice-dialog .lx-order-channel{display:flex;align-items:center;justify-content:center;min-height:42px;padding:0 10px;border-radius:4px;text-align:center}.lx-invoice-dialog .lx-order-channel strong{font-weight:400}.lx-invoice-dialog .lx-order-channel.is-active{padding:0 10px}.lx-invoice-dialog .lx-order-channel.is-active strong{font-weight:600}.lx-invoice-dialog .lx-order-channel small{display:none}.lx-invoice-tip{margin:16px 0 20px;padding:12px 14px;border-radius:4px;background:#fbf9fc;color:#77717d;font-size:12px;line-height:18px}.lx-invoice-form{display:grid;grid-template-columns:100px minmax(0,1fr);gap:10px 12px;align-items:center}.lx-invoice-form label{font-size:12px;color:#454047}.lx-invoice-form input{width:100%;height:40px;box-sizing:border-box;padding:0 12px;border:1px solid #d9cfdd;border-radius:6px;background:#fff;color:#2b272d;font:12px "Source Han Sans CN","PingFang SC",sans-serif;outline:none}.lx-invoice-form input[readonly]{background:#f8f5f8;color:#77717d}.lx-invoice-form input:focus{border-color:#681057}`;
    style.textContent += `.lx-buy-direct-dialog:not(.lx-buy-sub-dialog):not(.lx-order-edit-dialog) .lx-order-payment{position:relative;margin-top:6px;padding-top:14px}.lx-buy-direct-dialog:not(.lx-buy-sub-dialog):not(.lx-order-edit-dialog) .lx-order-payment::before{content:"";position:absolute;top:0;right:14px;left:14px;height:1px;background:rgba(77,20,74,.10)}.lx-buy-national-subsidy,.lx-buy-national-subsidy.is-claimed{width:380px;max-width:calc(100% - 14px)}`;
    style.textContent += `.lx-buy-direct-actions button{width:132px;height:44px;font-size:14px}.lx-buy-direct-actions .primary,.lx-buy-sub-footer .primary,.lx-order-edit-footer button{width:164px;height:44px;font-size:14px}.lx-config-dialog .lx-order-edit-footer{height:92px!important;padding:16px 26px 28px!important}.lx-config-dialog .lx-order-edit-footer button{width:164px;height:44px}`;
    style.textContent += `.lx-buy-sub-dialog h2{margin-bottom:24px}.lx-buy-sub-dialog .lx-buy-price-list{padding:2px 4px 0}.lx-buy-sub-dialog .lx-buy-price-line{min-height:44px}.lx-buy-sub-dialog .lx-buy-price-line.is-clickable{margin-top:0}.lx-buy-sub-dialog .lx-buy-sub-footer{min-height:64px;padding:14px 0 6px}.lx-buy-sub-footer button{min-width:116px;height:44px;font-size:14px}`;
    style.textContent += `.lx-order-edit-dialog:not(.lx-config-dialog) .lx-order-form{grid-template-columns:70px minmax(0,1fr);gap:10px 8px}.lx-order-edit-dialog:not(.lx-config-dialog) .lx-order-invoice{height:40px;margin-top:12px;padding:0 11px;border-color:#d9cfdd;border-radius:6px;gap:8px}.lx-order-edit-dialog:not(.lx-config-dialog) .lx-order-invoice strong{font-size:12px;font-weight:400;color:#454047}.lx-order-edit-dialog:not(.lx-config-dialog) .lx-order-invoice span{font-size:12px}.lx-order-edit-dialog:not(.lx-config-dialog) .lx-order-provider{min-height:46px;margin-top:6px;padding:8px 10px;border:0;border-radius:0;background:transparent}.lx-order-edit-dialog:not(.lx-config-dialog) .lx-order-provider+.lx-order-provider{margin-top:4px}.lx-order-edit-dialog:not(.lx-config-dialog) .lx-order-provider.is-expanded{background:#fbf9fc;border-radius:8px}`;
    style.textContent += `.lx-order-edit-dialog:not(.lx-config-dialog) .lx-order-edit-body{padding-top:8px}.lx-order-edit-dialog:not(.lx-config-dialog) .lx-order-address{min-height:64px;padding:14px 16px;gap:12px}.lx-order-edit-dialog:not(.lx-config-dialog) .lx-order-address>img{width:26px;height:26px;padding:5px}.lx-order-edit-dialog:not(.lx-config-dialog) .lx-order-address b{font-size:13px;line-height:19px}`;
    style.textContent += `.lx-order-edit-dialog:not(.lx-config-dialog) [data-online-payment]>.lx-order-subtitle{margin:20px 0 10px}.lx-order-edit-dialog:not(.lx-config-dialog) .lx-order-invoice-row{display:grid;grid-template-columns:70px minmax(0,1fr);gap:8px;align-items:center;margin-top:10px}.lx-order-edit-dialog:not(.lx-config-dialog) .lx-order-invoice-label{font-size:12px;color:#454047}.lx-order-edit-dialog:not(.lx-config-dialog) .lx-order-invoice-row .lx-order-invoice{grid-template-columns:1fr 14px;width:100%;height:40px;margin:0;padding:0 11px;border-color:#d9cfdd;border-radius:6px}.lx-order-edit-dialog:not(.lx-config-dialog) .lx-order-invoice-row .lx-order-invoice span{color:#7f7882;text-align:left}`;
    style.textContent += `.lx-order-edit-dialog:not(.lx-config-dialog) .lx-order-plan{min-height:64px;padding:10px 14px;grid-template-columns:auto minmax(0,1fr);gap:12px}.lx-order-edit-dialog:not(.lx-config-dialog) .lx-order-plan-term{font-size:13px;line-height:20px;white-space:nowrap}.lx-order-edit-dialog:not(.lx-config-dialog) .lx-order-plan-cost{display:grid;gap:1px;font-size:11px;line-height:15px;color:#454047}.lx-order-edit-dialog:not(.lx-config-dialog) .lx-order-plan-cost b{font-size:14px;font-weight:600;color:#4d144a}.lx-order-edit-dialog:not(.lx-config-dialog) .lx-order-plan-cost small{font-size:9px;line-height:13px;color:#9a949d}`;
    style.textContent += `.lx-config-dialog .lx-config-option,.lx-config-dialog .lx-config-section:nth-of-type(-n+2) .lx-config-option{width:144px;height:40px}.lx-buy-direct-dialog:not(.lx-buy-sub-dialog):not(.lx-order-edit-dialog) .lx-order-product-card .lx-buy-direct-product>img{background:transparent;box-shadow:none}.lx-order-edit-footer,.lx-config-dialog .lx-order-edit-footer{height:88px!important;padding:16px 26px 28px!important}`;
    style.textContent += `.lx-buy-sub-dialog{padding-top:20px}.lx-buy-sub-head{margin:0 0 12px;transform:translate(-10px,0)}.lx-buy-sub-head h2{margin:0}.lx-coupon-dialog h2{margin-bottom:16px}.lx-coupon-dialog .lx-buy-coupon-field{gap:10px}`;
    style.textContent += `.lx-buy-direct-footnote{margin:0;padding-top:10px;line-height:16px}`;
    style.textContent += `.lx-order-edit-dialog:not(.lx-config-dialog) .lx-order-channel-grid{gap:12px}.lx-order-edit-dialog:not(.lx-config-dialog) .lx-order-quick-grid{gap:10px}.lx-order-edit-dialog:not(.lx-config-dialog) [data-online-payment]>.lx-order-subtitle{margin:18px 0 10px}.lx-order-edit-dialog:not(.lx-config-dialog) [data-online-payment]>.lx-order-quick-grid+.lx-order-subtitle{margin:16px 0 14px}.lx-order-edit-dialog:not(.lx-config-dialog) .lx-order-subtitle small{font-size:11px;line-height:16px;color:#979197}.lx-order-edit-dialog:not(.lx-config-dialog) .lx-order-provider{margin-top:6px}.lx-order-edit-dialog:not(.lx-config-dialog) .lx-order-provider+.lx-order-provider{margin-top:6px}.lx-order-edit-dialog:not(.lx-config-dialog) .lx-order-edit-section h3{margin-bottom:14px}.lx-order-edit-dialog:not(.lx-config-dialog) .lx-order-form input,.lx-order-edit-dialog:not(.lx-config-dialog) .lx-order-invoice-row .lx-order-invoice{border-color:rgba(77,20,74,.14);background:#fff}.lx-order-edit-dialog:not(.lx-config-dialog) .lx-order-edit-footer{background:#fff}.lx-order-edit-dialog:not(.lx-config-dialog) .lx-order-invoice-row .lx-order-chevron{justify-self:end;margin-right:3px}`;
    style.textContent += `.lx-buy-direct-dialog:not(.lx-buy-sub-dialog):not(.lx-order-edit-dialog) .lx-buy-direct-actions{padding-top:14px}`;
    style.textContent += `.lx-buy-direct-dialog:not(.lx-buy-sub-dialog):not(.lx-order-edit-dialog){width:min(620px,calc(100vw - 32px));height:min(560px,calc(100vh - 32px));overflow-y:auto}`;
    style.textContent += `.lx-order-edit-dialog:not(.lx-config-dialog) .lx-order-edit-body{padding-top:2px}.lx-order-edit-dialog:not(.lx-config-dialog) .lx-order-address button{padding:0;background:transparent;box-shadow:none}`;
    style.textContent += `.lx-order-edit-dialog:not(.lx-config-dialog) .lx-order-address>img{width:24px;height:24px;padding:0;border:0;border-radius:0;background:transparent;box-shadow:none}`;
    style.textContent += `.lx-order-edit-dialog .lx-order-channel small{font-size:10px;line-height:15px}`;
    style.textContent += `.lx-order-edit-dialog:not(.lx-config-dialog) [data-online-payment]>.lx-order-subtitle{align-items:center;margin:18px 0 10px;font-size:14px;line-height:20px}.lx-order-edit-dialog:not(.lx-config-dialog) [data-online-payment]>.lx-order-quick-grid+.lx-order-subtitle{margin:22px 0 12px;padding-top:14px;border-top:1px solid rgba(77,20,74,.10)}.lx-order-edit-dialog:not(.lx-config-dialog) [data-online-payment]>.lx-order-subtitle>span{font-weight:600}.lx-order-edit-dialog:not(.lx-config-dialog) [data-online-payment]>.lx-order-subtitle small{font-size:10px;line-height:15px}.lx-order-edit-dialog:not(.lx-config-dialog) [data-online-payment]>.lx-order-provider:first-of-type{margin-top:0}`;
    style.textContent += `.lx-buy-direct-dialog:not(.lx-buy-sub-dialog):not(.lx-order-edit-dialog) .lx-buy-direct-actions,.lx-buy-direct-dialog:not(.lx-buy-sub-dialog):not(.lx-order-edit-dialog) .lx-buy-direct-footnote{transform:translateY(10px)}`;
    style.textContent += `.lx-buy-direct-dialog:not(.lx-buy-sub-dialog):not(.lx-order-edit-dialog) .lx-order-product-card{margin-top:12px}`;
    style.textContent += `.lx-buy-direct-dialog:not(.lx-buy-sub-dialog):not(.lx-order-edit-dialog){padding:22px 38px 24px}.lx-buy-direct-dialog:not(.lx-buy-sub-dialog):not(.lx-order-edit-dialog) h2{margin-bottom:0;font-size:20px;line-height:28px}.lx-buy-direct-dialog:not(.lx-buy-sub-dialog):not(.lx-order-edit-dialog) .lx-buy-direct-card{padding:0;background:transparent}.lx-buy-direct-dialog:not(.lx-buy-sub-dialog):not(.lx-order-edit-dialog) .lx-order-product-card{margin:22px 0 18px;padding:22px 24px;border:0;border-radius:18px;background:#fff;box-shadow:0 10px 28px rgba(43,34,48,.06)}.lx-buy-direct-dialog:not(.lx-buy-sub-dialog):not(.lx-order-edit-dialog) .lx-order-product-card .lx-buy-direct-product{grid-template-columns:92px minmax(0,1fr) auto;gap:18px;min-height:92px;padding:0 0 16px}.lx-buy-direct-dialog:not(.lx-buy-sub-dialog):not(.lx-order-edit-dialog) .lx-order-product-card .lx-buy-direct-product>img{width:92px;height:92px;border-radius:6px;background:#fff;box-shadow:none}.lx-buy-direct-dialog:not(.lx-buy-sub-dialog):not(.lx-order-edit-dialog) .lx-buy-direct-product-copy{gap:7px}.lx-buy-direct-dialog:not(.lx-buy-sub-dialog):not(.lx-order-edit-dialog) .lx-buy-direct-product-copy strong{font-size:16px;font-weight:700;line-height:23px}.lx-buy-direct-dialog:not(.lx-buy-sub-dialog):not(.lx-order-edit-dialog) .lx-buy-direct-product-copy span{font-size:13px;line-height:18px}.lx-buy-direct-dialog:not(.lx-buy-sub-dialog):not(.lx-order-edit-dialog) .lx-buy-direct-config{height:32px;padding:0 13px;border:1px solid rgba(77,20,74,.18);border-radius:100px;box-shadow:0 4px 14px rgba(43,34,48,.05);font-size:12px}.lx-buy-direct-dialog:not(.lx-buy-sub-dialog):not(.lx-order-edit-dialog) .lx-order-product-card .lx-buy-direct-product-spec{display:grid;grid-template-columns:72px minmax(110px,1fr) 54px minmax(130px,1fr);gap:5px 12px;padding:0;border:0}.lx-buy-direct-dialog:not(.lx-buy-sub-dialog):not(.lx-order-edit-dialog) .lx-order-product-card .lx-buy-direct-product-spec .lx-buy-direct-row{display:contents}.lx-buy-direct-dialog:not(.lx-buy-sub-dialog):not(.lx-order-edit-dialog) .lx-order-product-card .lx-buy-direct-product-spec strong{font-size:12px;line-height:18px}.lx-buy-direct-dialog:not(.lx-buy-sub-dialog):not(.lx-order-edit-dialog) .lx-order-product-card .lx-buy-direct-product-spec span{font-size:12px;line-height:18px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.lx-buy-direct-dialog:not(.lx-buy-sub-dialog):not(.lx-order-edit-dialog) .lx-order-shipping{margin:0 0 12px;padding:0 4px}.lx-buy-direct-dialog:not(.lx-buy-sub-dialog):not(.lx-order-edit-dialog) .lx-order-payment{margin:0 0 14px;padding:14px 4px 0}.lx-buy-direct-dialog:not(.lx-buy-sub-dialog):not(.lx-order-edit-dialog) .lx-order-shipping .lx-buy-direct-row,.lx-buy-direct-dialog:not(.lx-buy-sub-dialog):not(.lx-order-edit-dialog) .lx-order-payment .lx-buy-direct-row{grid-template-columns:72px 1fr;gap:0;padding:4px 0;font-size:12px;line-height:18px}.lx-buy-direct-dialog:not(.lx-buy-sub-dialog):not(.lx-order-edit-dialog) .lx-order-shipping strong,.lx-buy-direct-dialog:not(.lx-buy-sub-dialog):not(.lx-order-edit-dialog) .lx-order-payment strong{font-weight:600}.lx-buy-direct-dialog:not(.lx-buy-sub-dialog):not(.lx-order-edit-dialog) .lx-buy-national-subsidy{width:100%;max-width:none;box-sizing:border-box;margin:0 0 16px;padding:9px 14px;border-radius:10px}.lx-buy-direct-dialog:not(.lx-buy-sub-dialog):not(.lx-order-edit-dialog) .lx-order-summary{padding:0 4px;background:transparent}.lx-buy-direct-dialog:not(.lx-buy-sub-dialog):not(.lx-order-edit-dialog) .lx-order-summary .lx-buy-direct-price{gap:10px}.lx-buy-direct-dialog:not(.lx-buy-sub-dialog):not(.lx-order-edit-dialog) .lx-order-summary .lx-buy-direct-price b{font-size:23px}.lx-buy-direct-dialog:not(.lx-buy-sub-dialog):not(.lx-order-edit-dialog) .lx-buy-direct-actions{padding-top:18px}.lx-buy-direct-dialog:not(.lx-buy-sub-dialog):not(.lx-order-edit-dialog) .lx-buy-direct-footnote{padding-top:3px}`;
    style.textContent += `.lx-buy-direct-dialog:not(.lx-buy-sub-dialog):not(.lx-order-edit-dialog) .lx-buy-national-subsidy+.lx-order-summary{margin-top:10px}`;
    style.textContent += `.lx-buy-direct-dialog:not(.lx-buy-sub-dialog):not(.lx-order-edit-dialog) .lx-order-info-card{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px 18px;margin:0 0 16px;padding:16px 18px 12px;border-radius:16px;background:linear-gradient(135deg,#fcfbff,#fff)}.lx-buy-direct-dialog:not(.lx-buy-sub-dialog):not(.lx-order-edit-dialog) .lx-order-info-card>.lx-order-shipping,.lx-buy-direct-dialog:not(.lx-buy-sub-dialog):not(.lx-order-edit-dialog) .lx-order-info-card>.lx-order-payment{display:contents}.lx-buy-direct-dialog:not(.lx-buy-sub-dialog):not(.lx-order-edit-dialog) .lx-order-info-card>.lx-order-payment::before{content:none}.lx-buy-direct-dialog:not(.lx-buy-sub-dialog):not(.lx-order-edit-dialog) .lx-order-info-card .lx-buy-direct-row{display:grid;grid-template-columns:18px 62px minmax(0,1fr);gap:7px;align-items:start;margin:0;padding:0!important;font-size:11px;line-height:17px}.lx-buy-direct-dialog:not(.lx-buy-sub-dialog):not(.lx-order-edit-dialog) .lx-order-info-card .lx-buy-direct-row>img{width:18px;height:18px;object-fit:contain;filter:invert(13%) sepia(38%) saturate(2059%) hue-rotate(258deg) brightness(77%) contrast(102%)}.lx-buy-direct-dialog:not(.lx-buy-sub-dialog):not(.lx-order-edit-dialog) .lx-order-info-card .lx-buy-direct-row strong{font-size:11px;line-height:17px;white-space:nowrap}.lx-buy-direct-dialog:not(.lx-buy-sub-dialog):not(.lx-order-edit-dialog) .lx-order-info-card .lx-buy-direct-row span{min-width:0;font-size:11px;line-height:17px}.lx-buy-direct-dialog:not(.lx-buy-sub-dialog):not(.lx-order-edit-dialog) .lx-order-info-card .lx-buy-national-subsidy{grid-column:1/-1;width:100%;max-width:none;margin:4px 0 0;padding:8px 12px;border-radius:10px}.lx-buy-direct-dialog:not(.lx-buy-sub-dialog):not(.lx-order-edit-dialog) .lx-order-info-card+.lx-order-summary{margin-top:10px}`;
    style.textContent += `.lx-buy-direct-dialog:not(.lx-buy-sub-dialog):not(.lx-order-edit-dialog) h2{font-size:18px;line-height:26px}.lx-buy-direct-dialog:not(.lx-buy-sub-dialog):not(.lx-order-edit-dialog) .lx-order-product-card{margin-top:18px;padding:18px 22px}.lx-buy-direct-dialog:not(.lx-buy-sub-dialog):not(.lx-order-edit-dialog) .lx-order-product-card .lx-buy-direct-product{grid-template-columns:76px minmax(0,1fr) auto;gap:15px;min-height:76px;padding-bottom:13px}.lx-buy-direct-dialog:not(.lx-buy-sub-dialog):not(.lx-order-edit-dialog) .lx-order-product-card .lx-buy-direct-product>img{width:76px;height:76px}.lx-buy-direct-dialog:not(.lx-buy-sub-dialog):not(.lx-order-edit-dialog) .lx-buy-direct-product-copy{gap:5px}.lx-buy-direct-dialog:not(.lx-buy-sub-dialog):not(.lx-order-edit-dialog) .lx-buy-direct-product-copy strong{font-size:15px;line-height:21px}.lx-buy-direct-dialog:not(.lx-buy-sub-dialog):not(.lx-order-edit-dialog) .lx-buy-direct-product-copy span{font-size:12px;line-height:17px}.lx-buy-direct-dialog:not(.lx-buy-sub-dialog):not(.lx-order-edit-dialog) .lx-order-product-card .lx-buy-direct-product-spec{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:10px;padding:0}.lx-buy-direct-dialog:not(.lx-buy-sub-dialog):not(.lx-order-edit-dialog) .lx-order-product-card .lx-buy-direct-product-spec .lx-buy-direct-row{display:grid;grid-template-columns:1fr;gap:4px;min-width:0}.lx-buy-direct-dialog:not(.lx-buy-sub-dialog):not(.lx-order-edit-dialog) .lx-order-product-card .lx-buy-direct-product-spec strong{font-size:11px;line-height:16px}.lx-buy-direct-dialog:not(.lx-buy-sub-dialog):not(.lx-order-edit-dialog) .lx-order-product-card .lx-buy-direct-product-spec span{font-size:12px;line-height:17px}`;
    style.textContent += `.lx-buy-direct-dialog:not(.lx-buy-sub-dialog):not(.lx-order-edit-dialog) .lx-buy-national-subsidy{width:320px;max-width:100%;margin-bottom:16px}`;
    style.textContent += `.lx-buy-direct-dialog:not(.lx-buy-sub-dialog):not(.lx-order-edit-dialog) .lx-order-product-card{margin:22px 0 18px;padding:22px 24px;border-radius:18px}.lx-buy-direct-dialog:not(.lx-buy-sub-dialog):not(.lx-order-edit-dialog) .lx-order-product-card .lx-buy-direct-product{grid-template-columns:92px minmax(0,1fr) auto;gap:18px;min-height:92px;padding-bottom:16px}.lx-buy-direct-dialog:not(.lx-buy-sub-dialog):not(.lx-order-edit-dialog) .lx-order-product-card .lx-buy-direct-product>img{width:92px;height:92px}.lx-buy-direct-dialog:not(.lx-buy-sub-dialog):not(.lx-order-edit-dialog) .lx-buy-direct-product-copy{gap:7px}.lx-buy-direct-dialog:not(.lx-buy-sub-dialog):not(.lx-order-edit-dialog) .lx-buy-direct-product-copy strong{font-size:16px;line-height:23px}.lx-buy-direct-dialog:not(.lx-buy-sub-dialog):not(.lx-order-edit-dialog) .lx-buy-direct-product-copy span{font-size:13px;line-height:18px}.lx-buy-direct-dialog:not(.lx-buy-sub-dialog):not(.lx-order-edit-dialog) .lx-buy-direct-config{height:32px;padding:0 13px;font-size:12px}.lx-buy-direct-dialog:not(.lx-buy-sub-dialog):not(.lx-order-edit-dialog) .lx-order-product-card .lx-buy-direct-product-spec{gap:12px}.lx-buy-direct-dialog:not(.lx-buy-sub-dialog):not(.lx-order-edit-dialog) .lx-order-product-card .lx-buy-direct-product-spec .lx-buy-direct-row{gap:5px}.lx-buy-direct-dialog:not(.lx-buy-sub-dialog):not(.lx-order-edit-dialog) .lx-order-product-card .lx-buy-direct-product-spec strong{font-size:12px;line-height:18px}.lx-buy-direct-dialog:not(.lx-buy-sub-dialog):not(.lx-order-edit-dialog) .lx-order-product-card .lx-buy-direct-product-spec span{font-size:12px;line-height:18px}`;
    style.textContent += `.lx-buy-direct-dialog:not(.lx-buy-sub-dialog):not(.lx-order-edit-dialog) .lx-order-product-card .lx-buy-direct-product{grid-template-columns:112px minmax(0,1fr) auto;min-height:112px}.lx-buy-direct-dialog:not(.lx-buy-sub-dialog):not(.lx-order-edit-dialog) .lx-order-product-card .lx-buy-direct-product>img{width:112px;height:112px}`;
    style.textContent += `.lx-buy-direct-dialog:not(.lx-buy-sub-dialog):not(.lx-order-edit-dialog) .lx-order-product-card .lx-buy-direct-product-spec{grid-template-columns:minmax(74px,1fr) minmax(132px,1.6fr) minmax(72px,.95fr) minmax(140px,1.3fr);gap:12px}.lx-buy-direct-dialog:not(.lx-buy-sub-dialog):not(.lx-order-edit-dialog) .lx-buy-direct-footnote{width:max-content;margin-left:auto;transform:translateY(10px);text-align:right}`;
    style.textContent += `.lx-buy-direct-dialog:not(.lx-buy-sub-dialog):not(.lx-order-edit-dialog) .lx-order-product-card .lx-buy-direct-product>img{transform:translateX(-10px)}.lx-buy-direct-dialog:not(.lx-buy-sub-dialog):not(.lx-order-edit-dialog) .lx-buy-direct-config{border:0;box-shadow:0 6px 18px rgba(43,34,48,.06)}`;
    style.textContent += `.lx-buy-direct-dialog:not(.lx-buy-sub-dialog):not(.lx-order-edit-dialog) .lx-order-product-card .lx-buy-direct-product-spec{width:100%;min-width:0;grid-template-columns:140px 240px 135px minmax(0,1fr);gap:8px}.lx-buy-direct-dialog:not(.lx-buy-sub-dialog):not(.lx-order-edit-dialog) .lx-order-product-card .lx-buy-direct-product-spec .lx-buy-direct-row{min-width:0;overflow:hidden}.lx-buy-direct-dialog:not(.lx-buy-sub-dialog):not(.lx-order-edit-dialog) .lx-order-product-card .lx-buy-direct-product-spec .lx-buy-direct-row span{display:block;min-width:0;max-width:100%;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}`;
    style.textContent += `.lx-buy-direct-dialog:not(.lx-buy-sub-dialog):not(.lx-order-edit-dialog) .lx-order-product-card{grid-template-columns:92px minmax(0,1fr) auto}.lx-buy-direct-dialog:not(.lx-buy-sub-dialog):not(.lx-order-edit-dialog) .lx-order-product-card .lx-buy-direct-product>img{width:92px;height:92px}`;
    style.textContent += `.lx-buy-direct-dialog:not(.lx-buy-sub-dialog):not(.lx-order-edit-dialog) .lx-order-product-card .lx-buy-direct-product-spec{grid-template-columns:.75fr 1.35fr .75fr 1.55fr;gap:12px;min-width:0;overflow:hidden}.lx-buy-direct-dialog:not(.lx-buy-sub-dialog):not(.lx-order-edit-dialog) .lx-order-product-card .lx-buy-direct-product-spec .lx-buy-direct-row{min-width:0}.lx-buy-direct-dialog:not(.lx-buy-sub-dialog):not(.lx-order-edit-dialog) .lx-order-product-card .lx-buy-direct-product-spec .lx-buy-direct-row span{max-width:100%;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}`;
    style.textContent += `.lx-buy-direct-dialog:not(.lx-buy-sub-dialog):not(.lx-order-edit-dialog){display:flex;flex-direction:column;padding-bottom:24px}.lx-buy-direct-dialog:not(.lx-buy-sub-dialog):not(.lx-order-edit-dialog) .lx-buy-direct-card{display:flex;flex:1 1 auto;min-height:0;flex-direction:column}.lx-buy-direct-dialog:not(.lx-buy-sub-dialog):not(.lx-order-edit-dialog) .lx-buy-direct-actions{margin-top:auto;padding-top:16px;transform:none}.lx-buy-direct-dialog:not(.lx-buy-sub-dialog):not(.lx-order-edit-dialog) .lx-buy-direct-footnote{margin:6px 0 0;padding-top:0;transform:none}`;
    style.textContent += `.lx-buy-direct-dialog:not(.lx-buy-sub-dialog):not(.lx-order-edit-dialog) .lx-order-product-card .lx-buy-direct-product-copy span{color:#6f6972}.lx-buy-direct-dialog:not(.lx-buy-sub-dialog):not(.lx-order-edit-dialog) .lx-order-product-card .lx-buy-direct-product-spec strong{color:#302b32;font-weight:600}.lx-buy-direct-dialog:not(.lx-buy-sub-dialog):not(.lx-order-edit-dialog) .lx-order-product-card .lx-buy-direct-product-spec span{color:#6f6972;font-weight:400}.lx-buy-direct-dialog:not(.lx-buy-sub-dialog):not(.lx-order-edit-dialog) .lx-order-shipping{margin-bottom:14px;padding-bottom:2px}.lx-buy-direct-dialog:not(.lx-buy-sub-dialog):not(.lx-order-edit-dialog) .lx-order-payment{margin-bottom:16px;padding-top:16px}.lx-buy-direct-dialog:not(.lx-buy-sub-dialog):not(.lx-order-edit-dialog) .lx-order-shipping .lx-buy-direct-row,.lx-buy-direct-dialog:not(.lx-buy-sub-dialog):not(.lx-order-edit-dialog) .lx-order-payment .lx-buy-direct-row{padding:5px 0}.lx-buy-direct-dialog:not(.lx-buy-sub-dialog):not(.lx-order-edit-dialog) .lx-order-shipping strong,.lx-buy-direct-dialog:not(.lx-buy-sub-dialog):not(.lx-order-edit-dialog) .lx-order-payment strong{color:#302b32;font-weight:600}.lx-buy-direct-dialog:not(.lx-buy-sub-dialog):not(.lx-order-edit-dialog) .lx-order-shipping span,.lx-buy-direct-dialog:not(.lx-buy-sub-dialog):not(.lx-order-edit-dialog) .lx-order-payment span{color:#5f5961}.lx-buy-direct-dialog:not(.lx-buy-sub-dialog):not(.lx-order-edit-dialog) .lx-buy-national-subsidy{margin-bottom:18px}.lx-buy-direct-dialog:not(.lx-buy-sub-dialog):not(.lx-order-edit-dialog) .lx-order-summary .lx-buy-direct-detail{margin-top:7px}.lx-buy-direct-dialog:not(.lx-buy-sub-dialog):not(.lx-order-edit-dialog) .lx-buy-direct-footnote{color:#b6a7b5}`;
    style.textContent += `.lx-buy-national-subsidy b,.lx-buy-national-subsidy.is-claimed b{font-weight:600}`;
    style.textContent += `.lx-buy-direct-dialog:not(.lx-buy-sub-dialog):not(.lx-order-edit-dialog){overflow:hidden}.lx-buy-direct-dialog:not(.lx-buy-sub-dialog):not(.lx-order-edit-dialog) .lx-order-product-card{min-height:140px;padding:16px 18px;row-gap:10px}.lx-buy-direct-dialog:not(.lx-buy-sub-dialog):not(.lx-order-edit-dialog) .lx-buy-direct-actions{padding-top:6px}.lx-buy-direct-dialog:not(.lx-buy-sub-dialog):not(.lx-order-edit-dialog) .lx-buy-direct-footnote{padding-top:0}`;
    style.textContent += `.lx-buy-direct-dialog:not(.lx-buy-sub-dialog):not(.lx-order-edit-dialog) .lx-order-product-card{padding-right:18px;padding-left:18px}.lx-buy-direct-dialog:not(.lx-buy-sub-dialog):not(.lx-order-edit-dialog) .lx-order-product-card .lx-buy-direct-product>img{transform:none}.lx-buy-direct-dialog:not(.lx-buy-sub-dialog):not(.lx-order-edit-dialog) .lx-order-shipping{margin-bottom:10px;padding:0 0 8px}.lx-buy-direct-dialog:not(.lx-buy-sub-dialog):not(.lx-order-edit-dialog) .lx-order-payment{margin-bottom:14px;padding:12px 0 0}.lx-buy-direct-dialog:not(.lx-buy-sub-dialog):not(.lx-order-edit-dialog) .lx-buy-direct-footnote{width:max-content;max-width:100%;margin:6px 0 0 auto;text-align:right;transform:none}.lx-order-edit-back,.lx-buy-sub-head .lx-order-edit-back{width:32px;height:32px;flex:0 0 32px;display:grid;place-items:center;padding:4px;border:0;border-radius:6px;font-size:0;line-height:0}.lx-order-edit-back img{display:block;width:20px;height:20px;object-fit:contain}.lx-order-edit-head{gap:6px}.lx-buy-sub-head{gap:6px;margin:0 0 12px;transform:none}`;
    style.textContent += `.lx-buy-direct-dialog:not(.lx-buy-sub-dialog):not(.lx-order-edit-dialog){padding-right:30px;padding-left:30px}.lx-buy-direct-dialog:not(.lx-buy-sub-dialog):not(.lx-order-edit-dialog) .lx-buy-direct-actions{padding-top:2px}.lx-buy-direct-dialog:not(.lx-buy-sub-dialog):not(.lx-order-edit-dialog) .lx-buy-direct-footnote{margin-top:2px;transform:translateY(-2px)}`;
    style.textContent += `.lx-invoice-form{grid-template-columns:80px minmax(0,1fr);gap:10px 8px}`;
    style.textContent += `.lx-invoice-tip{margin:14px 0 18px;padding:0;border-radius:0;background:transparent;color:#8b858e;font-size:11px;line-height:16px}`;
    style.textContent += `.lx-coupon-dialog .lx-buy-coupon-actions button{width:132px;min-width:0;height:44px;padding:0;font-size:14px}.lx-coupon-dialog .lx-buy-coupon-actions .primary{width:164px}`;
    style.textContent += `.lx-config-dialog .lx-config-options{grid-template-columns:repeat(3,140px);gap:16px}.lx-config-dialog .lx-config-option,.lx-config-dialog .lx-config-section:nth-of-type(-n+2) .lx-config-option{width:140px;height:38px;padding:0 10px;font-size:12px}`;
    style.textContent += `.lx-buy-direct-dialog:not(.lx-buy-sub-dialog):not(.lx-order-edit-dialog){height:auto;max-height:calc(100vh - 48px);padding:18px 28px 20px;overflow-y:auto}.lx-buy-direct-dialog:not(.lx-buy-sub-dialog):not(.lx-order-edit-dialog) .lx-buy-direct-card{display:block;flex:none;min-height:0}.lx-buy-direct-dialog:not(.lx-buy-sub-dialog):not(.lx-order-edit-dialog) .lx-order-product-card{margin:14px 0 12px;padding:14px 18px;min-height:0}.lx-buy-direct-dialog:not(.lx-buy-sub-dialog):not(.lx-order-edit-dialog) .lx-order-product-card .lx-buy-direct-product{min-height:82px;padding-bottom:12px}.lx-buy-direct-dialog:not(.lx-buy-sub-dialog):not(.lx-order-edit-dialog) .lx-order-product-card .lx-buy-direct-product>img{width:82px;height:82px}.lx-buy-direct-dialog:not(.lx-buy-sub-dialog):not(.lx-order-edit-dialog) .lx-order-shipping{margin-bottom:7px;padding-bottom:5px}.lx-buy-direct-dialog:not(.lx-buy-sub-dialog):not(.lx-order-edit-dialog) .lx-order-payment{margin-bottom:8px;padding-top:8px}.lx-buy-direct-dialog:not(.lx-buy-sub-dialog):not(.lx-order-edit-dialog) .lx-buy-national-subsidy{grid-template-columns:minmax(0,1fr) auto;margin-bottom:10px}.lx-buy-direct-dialog:not(.lx-buy-sub-dialog):not(.lx-order-edit-dialog) .lx-buy-direct-actions{margin-top:14px;padding-top:0}.lx-buy-direct-dialog:not(.lx-buy-sub-dialog):not(.lx-order-edit-dialog) .lx-buy-direct-footnote{margin-top:5px;line-height:14px}`;
    style.textContent += `.lx-order-edit-back,.lx-buy-sub-head .lx-order-edit-back{width:24px;height:24px;flex:0 0 24px;margin:0;padding:2px;border:0;border-radius:4px;background:transparent}.lx-order-edit-back img{width:18px;height:18px;display:block;object-fit:contain}.lx-order-edit-back:hover,.lx-order-edit-back:focus{background:transparent;color:inherit}`;
    style.textContent += `.lx-buy-direct-dialog:not(.lx-buy-sub-dialog):not(.lx-order-edit-dialog){padding-top:24px}.lx-buy-direct-dialog:not(.lx-buy-sub-dialog):not(.lx-order-edit-dialog) .lx-order-product-card{margin-top:18px}.lx-buy-direct-dialog:not(.lx-buy-sub-dialog):not(.lx-order-edit-dialog) .lx-order-payment::before{right:0;left:0;background:rgba(77,20,74,.06)}`;
    style.textContent += `.lx-buy-direct-dialog:not(.lx-buy-sub-dialog):not(.lx-order-edit-dialog) .lx-buy-direct-actions{margin-bottom:10px}.lx-buy-direct-dialog:not(.lx-buy-sub-dialog):not(.lx-order-edit-dialog) .lx-buy-direct-footnote{margin-top:0;line-height:16px}`;
    style.textContent += `.lx-buy-direct-dialog,.lx-buy-sub-dialog,.lx-order-edit-dialog{width:min(620px,calc(100vw - 32px));height:min(560px,calc(100vh - 32px))!important;min-height:min(560px,calc(100vh - 32px));max-height:calc(100vh - 32px)}.lx-buy-direct-dialog:not(.lx-buy-sub-dialog):not(.lx-order-edit-dialog){padding:22px 30px 24px;overflow:hidden}.lx-buy-direct-dialog:not(.lx-buy-sub-dialog):not(.lx-order-edit-dialog) .lx-buy-direct-card{display:flex;flex:1 1 auto;min-height:0;flex-direction:column}.lx-buy-direct-dialog:not(.lx-buy-sub-dialog):not(.lx-order-edit-dialog) .lx-buy-direct-actions{margin-top:auto;padding-top:2px}.lx-buy-direct-dialog:not(.lx-buy-sub-dialog):not(.lx-order-edit-dialog) .lx-buy-direct-footnote{margin:2px 0 0 auto;line-height:14px;transform:translateY(-2px)}`;
    style.textContent += `.lx-buy-direct-dialog:not(.lx-buy-sub-dialog):not(.lx-order-edit-dialog) .lx-order-bottom-card{margin:2px 0 10px;padding:8px 12px;border:1px solid #eee6f0;border-radius:12px;background:linear-gradient(135deg,#fcf9fd 0%,#faf7fc 100%)}.lx-buy-direct-dialog:not(.lx-buy-sub-dialog):not(.lx-order-edit-dialog) .lx-order-bottom-card .lx-order-shipping,.lx-buy-direct-dialog:not(.lx-buy-sub-dialog):not(.lx-order-edit-dialog) .lx-order-bottom-card .lx-order-payment{margin:0;padding:5px 0;border:0;background:transparent}.lx-buy-direct-dialog:not(.lx-buy-sub-dialog):not(.lx-order-edit-dialog) .lx-order-bottom-card .lx-order-payment{margin-top:7px;padding-top:10px}.lx-buy-direct-dialog:not(.lx-buy-sub-dialog):not(.lx-order-edit-dialog) .lx-order-bottom-card .lx-order-payment::before{right:0;left:0;background:rgba(77,20,74,.055)}.lx-buy-direct-dialog:not(.lx-buy-sub-dialog):not(.lx-order-edit-dialog) .lx-order-bottom-card .lx-buy-national-subsidy{width:100%;max-width:none;margin:9px 0 0}.lx-buy-direct-dialog:not(.lx-buy-sub-dialog):not(.lx-order-edit-dialog) .lx-order-summary{margin:0;padding:10px 12px;border:1px solid #f0e3ed!important;border-radius:12px;background:linear-gradient(135deg,#fff9fd,#fcf6fb)!important}.lx-order-edit-dialog:not(.lx-config-dialog) .lx-order-form input,.lx-order-edit-dialog:not(.lx-config-dialog) .lx-order-combobox input,.lx-order-edit-dialog:not(.lx-config-dialog) .lx-order-invoice{border-color:#e5d9e8;background:#faf7fc}.lx-order-edit-dialog:not(.lx-config-dialog) .lx-order-form input:focus,.lx-order-edit-dialog:not(.lx-config-dialog) .lx-order-combobox input:focus,.lx-order-edit-dialog:not(.lx-config-dialog) .lx-order-invoice:focus{border-color:#7a286c;background:#fff;box-shadow:0 0 0 3px rgba(122,40,108,.08)}`;
    style.textContent += `.lx-buy-direct-dialog:not(.lx-buy-sub-dialog):not(.lx-order-edit-dialog) .lx-order-bottom-card{border-color:#ebe5ed;background:#fff}.lx-buy-direct-dialog:not(.lx-buy-sub-dialog):not(.lx-order-edit-dialog) .lx-order-summary{border-color:#ebe5ed!important;background:#fff!important}.lx-buy-direct-dialog:not(.lx-buy-sub-dialog):not(.lx-order-edit-dialog) .lx-order-product-card{grid-template-columns:82px minmax(0,1fr) auto;grid-template-rows:auto auto;grid-template-areas:"visual heading action" "visual specs specs";row-gap:14px;min-height:144px}.lx-buy-direct-dialog:not(.lx-buy-sub-dialog):not(.lx-order-edit-dialog) .lx-order-product-card .lx-buy-direct-product-copy{align-self:start;padding-top:2px}.lx-buy-direct-dialog:not(.lx-buy-sub-dialog):not(.lx-order-edit-dialog) .lx-order-product-card .lx-buy-direct-product-copy span{margin-top:3px}.lx-buy-direct-dialog:not(.lx-buy-sub-dialog):not(.lx-order-edit-dialog) .lx-order-product-card .lx-buy-direct-product-spec{align-self:start}`;
    style.textContent += `.lx-buy-direct-dialog:not(.lx-buy-sub-dialog):not(.lx-order-edit-dialog) .lx-order-summary{padding:8px 0;border:0!important;border-radius:0;background:transparent!important;box-shadow:none!important}`;
    style.textContent += `.lx-buy-direct-dialog:not(.lx-buy-sub-dialog):not(.lx-order-edit-dialog) .lx-order-bottom-card{margin:0 0 10px;padding:0;border:0;border-radius:0;background:transparent}.lx-buy-direct-dialog:not(.lx-buy-sub-dialog):not(.lx-order-edit-dialog) .lx-order-bottom-card .lx-order-shipping{padding:0 0 8px}.lx-buy-direct-dialog:not(.lx-buy-sub-dialog):not(.lx-order-edit-dialog) .lx-order-bottom-card .lx-order-payment{margin-top:6px;padding:12px 0 0}.lx-buy-direct-dialog:not(.lx-buy-sub-dialog):not(.lx-order-edit-dialog) .lx-order-bottom-card .lx-buy-national-subsidy{margin-top:10px}`;
    style.textContent += `.lx-buy-direct-dialog:not(.lx-buy-sub-dialog):not(.lx-order-edit-dialog) .lx-order-bottom-card{margin-bottom:12px}.lx-buy-direct-dialog:not(.lx-buy-sub-dialog):not(.lx-order-edit-dialog) .lx-order-bottom-card .lx-order-shipping{padding-bottom:8px}.lx-buy-direct-dialog:not(.lx-buy-sub-dialog):not(.lx-order-edit-dialog) .lx-order-bottom-card .lx-order-payment{margin-top:8px;padding-top:12px}.lx-buy-direct-dialog:not(.lx-buy-sub-dialog):not(.lx-order-edit-dialog) .lx-order-bottom-card .lx-order-shipping .lx-buy-direct-row,.lx-buy-direct-dialog:not(.lx-buy-sub-dialog):not(.lx-order-edit-dialog) .lx-order-bottom-card .lx-order-payment .lx-buy-direct-row{padding:4px 0}.lx-buy-direct-dialog:not(.lx-buy-sub-dialog):not(.lx-order-edit-dialog) .lx-order-bottom-card .lx-buy-national-subsidy{margin-top:10px}.lx-buy-direct-dialog:not(.lx-buy-sub-dialog):not(.lx-order-edit-dialog) .lx-order-summary{margin:0;padding-top:8px;padding-bottom:8px}`;
    style.textContent += `.lx-buy-direct-dialog:not(.lx-buy-sub-dialog):not(.lx-order-edit-dialog) .lx-order-bottom-card{margin:0 0 10px;padding:12px 14px 10px;border:1px solid #eee8ef;border-radius:12px;background:#fcfbfd}.lx-buy-direct-dialog:not(.lx-buy-sub-dialog):not(.lx-order-edit-dialog) .lx-order-bottom-card .lx-order-shipping{padding:0 0 6px}.lx-buy-direct-dialog:not(.lx-buy-sub-dialog):not(.lx-order-edit-dialog) .lx-order-bottom-card .lx-order-payment{margin-top:6px;padding:10px 0 0}.lx-buy-direct-dialog:not(.lx-buy-sub-dialog):not(.lx-order-edit-dialog) .lx-order-bottom-card .lx-order-shipping .lx-buy-direct-row,.lx-buy-direct-dialog:not(.lx-buy-sub-dialog):not(.lx-order-edit-dialog) .lx-order-bottom-card .lx-order-payment .lx-buy-direct-row{padding:3px 0}.lx-buy-direct-dialog:not(.lx-buy-sub-dialog):not(.lx-order-edit-dialog) .lx-order-bottom-card .lx-buy-national-subsidy{margin-top:8px;margin-bottom:0}`;
    style.textContent += `.lx-buy-direct-dialog:not(.lx-buy-sub-dialog):not(.lx-order-edit-dialog) .lx-order-product-card{grid-template-columns:82px minmax(0,1fr) auto;column-gap:14px;row-gap:8px;min-height:136px}.lx-buy-direct-dialog:not(.lx-buy-sub-dialog):not(.lx-order-edit-dialog) .lx-order-product-card .lx-buy-direct-product-copy{gap:4px;padding-top:0}.lx-buy-direct-dialog:not(.lx-buy-sub-dialog):not(.lx-order-edit-dialog) .lx-order-product-card .lx-buy-direct-product-copy span{margin-top:0}.lx-buy-direct-dialog:not(.lx-buy-sub-dialog):not(.lx-order-edit-dialog) .lx-order-product-card .lx-buy-direct-product-spec{align-self:start}`;
    style.textContent += `.lx-buy-direct-dialog:not(.lx-buy-sub-dialog):not(.lx-order-edit-dialog) .lx-order-bottom-card .lx-order-shipping{padding-bottom:2px}.lx-buy-direct-dialog:not(.lx-buy-sub-dialog):not(.lx-order-edit-dialog) .lx-order-bottom-card .lx-order-payment{margin-top:2px;padding-top:8px}`;
    style.textContent += `.lx-order-edit-back img[src$="order-modal-back.svg"]{transform:none!important}`;
    style.textContent += `.lx-order-edit-back img{width:16px;height:16px;display:block;transform:scaleX(-1)}`;
    style.textContent += `.lx-buy-direct-dialog:not(.lx-buy-sub-dialog):not(.lx-order-edit-dialog)>h2{position:relative;margin-bottom:0}.lx-buy-direct-dialog:not(.lx-buy-sub-dialog):not(.lx-order-edit-dialog)>h2::after{content:"订单已校验 · 配置与收货信息完整";position:absolute;top:32px;left:0;display:block;padding:4px 10px;border-radius:100px;background:#f7f0f7;color:#6b2863;font-size:10px;font-weight:500;line-height:14px;white-space:nowrap}.lx-buy-direct-dialog:not(.lx-buy-sub-dialog):not(.lx-order-edit-dialog) .lx-order-product-card{margin-top:42px;border:1px solid rgba(255,255,255,.8);box-shadow:0 10px 26px rgba(43,34,48,.055),inset 0 1px 0 rgba(255,255,255,.98)}.lx-buy-direct-dialog:not(.lx-buy-sub-dialog):not(.lx-order-edit-dialog) .lx-order-bottom-card .lx-order-payment .lx-buy-direct-row+.lx-buy-direct-row{margin-top:8px;padding-top:10px;border-top:1px solid rgba(77,20,74,.06)}.lx-buy-direct-dialog:not(.lx-buy-sub-dialog):not(.lx-order-edit-dialog) .lx-buy-direct-actions{padding-top:12px;border-top:1px solid rgba(77,20,74,.06)}.lx-buy-direct-dialog:not(.lx-buy-sub-dialog):not(.lx-order-edit-dialog) .lx-buy-direct-footnote{margin-top:6px}`;
    style.textContent += `.lx-buy-direct-dialog:not(.lx-buy-sub-dialog):not(.lx-order-edit-dialog) .lx-order-product-card .lx-buy-direct-product-spec{display:grid;grid-template-columns:auto minmax(0,1.4fr) auto minmax(0,1.25fr);gap:0;align-items:center}.lx-buy-direct-dialog:not(.lx-buy-sub-dialog):not(.lx-order-edit-dialog) .lx-order-product-card .lx-buy-direct-product-spec .lx-buy-direct-row{position:relative;display:block;min-width:0;padding:0 14px}.lx-buy-direct-dialog:not(.lx-buy-sub-dialog):not(.lx-order-edit-dialog) .lx-order-product-card .lx-buy-direct-product-spec .lx-buy-direct-row:first-child{padding-left:0}.lx-buy-direct-dialog:not(.lx-buy-sub-dialog):not(.lx-order-edit-dialog) .lx-order-product-card .lx-buy-direct-product-spec .lx-buy-direct-row+ .lx-buy-direct-row::before{content:"";position:absolute;left:0;top:50%;width:1px;height:12px;background:#e6dfe8;transform:translateY(-50%)}.lx-buy-direct-dialog:not(.lx-buy-sub-dialog):not(.lx-order-edit-dialog) .lx-order-product-card .lx-buy-direct-product-spec strong{display:none}.lx-buy-direct-dialog:not(.lx-buy-sub-dialog):not(.lx-order-edit-dialog) .lx-order-product-card .lx-buy-direct-product-spec span{display:block;color:#6f6972;font-size:12px;line-height:18px}`;
    style.textContent += `.lx-buy-direct-dialog:not(.lx-buy-sub-dialog):not(.lx-order-edit-dialog)>h2::after{content:none}.lx-buy-direct-dialog:not(.lx-buy-sub-dialog):not(.lx-order-edit-dialog) .lx-order-product-card{margin-top:18px}.lx-buy-direct-dialog:not(.lx-buy-sub-dialog):not(.lx-order-edit-dialog) .lx-order-bottom-card{margin:0 0 10px;padding:0;border:0;border-radius:0;background:transparent}.lx-buy-direct-dialog:not(.lx-buy-sub-dialog):not(.lx-order-edit-dialog) .lx-order-bottom-card .lx-order-shipping{position:relative;padding:0 0 10px 30px}.lx-buy-direct-dialog:not(.lx-buy-sub-dialog):not(.lx-order-edit-dialog) .lx-order-bottom-card .lx-order-shipping::before{content:"";position:absolute;top:5px;left:0;width:18px;height:18px;background:url('/assets/icons/order-address-location.svg') center/contain no-repeat}.lx-buy-direct-dialog:not(.lx-buy-sub-dialog):not(.lx-order-edit-dialog) .lx-order-bottom-card .lx-order-payment{margin-top:7px;padding:10px 0 0;border-top:1px solid rgba(77,20,74,.06)}.lx-buy-direct-dialog:not(.lx-buy-sub-dialog):not(.lx-order-edit-dialog) .lx-order-bottom-card .lx-order-payment .lx-buy-direct-row{position:relative;padding:3px 0 3px 30px;border:0}.lx-buy-direct-dialog:not(.lx-buy-sub-dialog):not(.lx-order-edit-dialog) .lx-order-bottom-card .lx-order-payment .lx-buy-direct-row::before{content:"";position:absolute;top:3px;left:0;width:18px;height:18px;background:url('/assets/icons/global-cart.svg') center/contain no-repeat}.lx-buy-direct-dialog:not(.lx-buy-sub-dialog):not(.lx-order-edit-dialog) .lx-order-bottom-card .lx-order-payment .lx-buy-direct-row+ .lx-buy-direct-row{margin-top:8px;padding-top:10px;border-top:1px solid rgba(77,20,74,.06)}.lx-buy-direct-dialog:not(.lx-buy-sub-dialog):not(.lx-order-edit-dialog) .lx-order-bottom-card .lx-order-payment .lx-buy-direct-row+ .lx-buy-direct-row::before{top:10px;background-image:url('/assets/icons/mall-orders.svg')}`;
    style.textContent += `.lx-buy-direct-dialog:not(.lx-buy-sub-dialog):not(.lx-order-edit-dialog)>h2::after{display:none!important}.lx-buy-direct-dialog:not(.lx-buy-sub-dialog):not(.lx-order-edit-dialog) .lx-order-product-card{grid-template-columns:68px minmax(0,1fr) auto;min-height:118px!important;padding:12px 18px;row-gap:8px}.lx-buy-direct-dialog:not(.lx-buy-sub-dialog):not(.lx-order-edit-dialog) .lx-order-product-card .lx-buy-direct-product>img{width:68px;height:68px}.lx-buy-direct-dialog:not(.lx-buy-sub-dialog):not(.lx-order-edit-dialog) .lx-order-product-card .lx-buy-direct-product-spec{display:flex;align-items:center;gap:0;min-width:0;overflow:hidden}.lx-buy-direct-dialog:not(.lx-buy-sub-dialog):not(.lx-order-edit-dialog) .lx-order-product-card .lx-buy-direct-product-spec .lx-buy-direct-row{flex:0 1 auto;padding:0 10px}.lx-buy-direct-dialog:not(.lx-buy-sub-dialog):not(.lx-order-edit-dialog) .lx-order-product-card .lx-buy-direct-product-spec .lx-buy-direct-row:first-child{padding-left:0}.lx-buy-direct-dialog:not(.lx-buy-sub-dialog):not(.lx-order-edit-dialog) .lx-order-product-card .lx-buy-direct-product-spec .lx-buy-direct-row:last-child{padding-right:0}`;
    style.textContent += `.lx-buy-direct-dialog:not(.lx-buy-sub-dialog):not(.lx-order-edit-dialog) .lx-order-bottom-card .lx-order-shipping{padding-bottom:6px}.lx-buy-direct-dialog:not(.lx-buy-sub-dialog):not(.lx-order-edit-dialog) .lx-order-bottom-card .lx-order-payment{margin-top:0;padding-top:0;border-top:0}.lx-buy-direct-dialog:not(.lx-buy-sub-dialog):not(.lx-order-edit-dialog) .lx-order-bottom-card .lx-order-payment::before{display:none}.lx-buy-direct-dialog:not(.lx-buy-sub-dialog):not(.lx-order-edit-dialog) .lx-order-bottom-card .lx-order-payment .lx-buy-direct-row{padding-top:3px;padding-bottom:3px}.lx-buy-direct-dialog:not(.lx-buy-sub-dialog):not(.lx-order-edit-dialog) .lx-order-bottom-card .lx-order-payment .lx-buy-direct-row+ .lx-buy-direct-row{margin-top:2px;padding-top:3px;border-top:0}.lx-buy-direct-dialog:not(.lx-buy-sub-dialog):not(.lx-order-edit-dialog) .lx-order-bottom-card .lx-order-payment .lx-buy-direct-row+ .lx-buy-direct-row::before{top:3px}.lx-buy-direct-dialog:not(.lx-buy-sub-dialog):not(.lx-order-edit-dialog) .lx-order-bottom-card .lx-buy-national-subsidy{margin-top:8px}.lx-buy-direct-dialog:not(.lx-buy-sub-dialog):not(.lx-order-edit-dialog) .lx-buy-direct-actions{border-top-color:rgba(77,20,74,.045)}`;
    style.textContent += `.lx-order-edit-dialog:not(.lx-config-dialog) .lx-order-edit-head{gap:6px!important;padding-left:18px!important}.lx-order-edit-dialog:not(.lx-config-dialog) .lx-order-edit-head>.lx-order-edit-back{display:grid!important}.lx-order-edit-dialog:not(.lx-config-dialog) .lx-order-edit-head h2{margin-left:0!important}`;
    style.textContent += `.lx-buy-direct-dialog:not(.lx-buy-sub-dialog):not(.lx-order-edit-dialog) .lx-order-bottom-card .lx-order-shipping{padding-left:0!important}.lx-buy-direct-dialog:not(.lx-buy-sub-dialog):not(.lx-order-edit-dialog) .lx-order-bottom-card .lx-order-shipping::before{content:none!important;display:none!important}.lx-buy-direct-dialog:not(.lx-buy-sub-dialog):not(.lx-order-edit-dialog) .lx-order-bottom-card .lx-order-shipping .lx-buy-direct-row,.lx-buy-direct-dialog:not(.lx-buy-sub-dialog):not(.lx-order-edit-dialog) .lx-order-bottom-card .lx-order-payment .lx-buy-direct-row{grid-template-columns:72px minmax(0,1fr)!important;gap:8px!important;padding-left:0!important}.lx-buy-direct-dialog:not(.lx-buy-sub-dialog):not(.lx-order-edit-dialog) .lx-order-bottom-card .lx-order-payment .lx-buy-direct-row::before{content:none!important;display:none!important}.lx-buy-direct-dialog:not(.lx-buy-sub-dialog):not(.lx-order-edit-dialog) .lx-buy-direct-actions{border-top:0!important}`;
    style.textContent += `.lx-order-edit-dialog:not(.lx-config-dialog) .lx-order-form input:focus,.lx-order-edit-dialog:not(.lx-config-dialog) .lx-order-combobox input:focus,.lx-order-edit-dialog:not(.lx-config-dialog) .lx-order-invoice:focus,.lx-order-edit-dialog:not(.lx-config-dialog) .lx-order-form input:focus-visible,.lx-order-edit-dialog:not(.lx-config-dialog) .lx-order-combobox input:focus-visible,.lx-order-edit-dialog:not(.lx-config-dialog) .lx-order-invoice:focus-visible{box-shadow:none!important;outline:none!important}`;
    style.textContent += `.lx-buy-direct-dialog:not(.lx-buy-sub-dialog):not(.lx-order-edit-dialog) .lx-order-product-card{min-height:0!important;padding-top:16px;padding-bottom:16px}.lx-buy-direct-dialog:not(.lx-buy-sub-dialog):not(.lx-order-edit-dialog) .lx-order-product-card .lx-buy-direct-product>img{align-self:center}.lx-buy-direct-dialog:not(.lx-buy-sub-dialog):not(.lx-order-edit-dialog) .lx-order-product-card .lx-buy-direct-product-spec{align-self:end}`;
    style.textContent += `.lx-buy-direct-dialog:not(.lx-buy-sub-dialog):not(.lx-order-edit-dialog) .lx-order-summary{margin-top:18px!important}.lx-buy-direct-dialog:not(.lx-buy-sub-dialog):not(.lx-order-edit-dialog) .lx-buy-direct-actions{position:relative;top:8px}.lx-buy-direct-dialog:not(.lx-buy-sub-dialog):not(.lx-order-edit-dialog) .lx-buy-direct-footnote{position:relative;top:8px}`;
    style.textContent += `.lx-buy-direct-dialog:not(.lx-buy-sub-dialog):not(.lx-order-edit-dialog) .lx-order-bottom-card .lx-order-summary{padding-bottom:18px!important}.lx-buy-direct-dialog:not(.lx-buy-sub-dialog):not(.lx-order-edit-dialog) .lx-buy-direct-actions{top:16px}.lx-buy-direct-dialog:not(.lx-buy-sub-dialog):not(.lx-order-edit-dialog) .lx-buy-direct-footnote{top:16px}`;
    style.textContent += `.lx-buy-direct-dialog:not(.lx-buy-sub-dialog):not(.lx-order-edit-dialog) .lx-buy-national-subsidy,.lx-buy-direct-dialog:not(.lx-buy-sub-dialog):not(.lx-order-edit-dialog) .lx-buy-national-subsidy.is-claimed{border-radius:4px!important}`;
    style.textContent += `.lx-order-edit-dialog:not(.lx-config-dialog) .lx-order-combobox{position:relative;z-index:30!important}.lx-order-edit-dialog:not(.lx-config-dialog) .lx-order-code-menu{top:auto!important;bottom:calc(100% + 4px)!important;z-index:100!important;max-height:none!important;overflow:visible!important}.lx-order-edit-dialog:not(.lx-config-dialog) .lx-order-edit-footer{position:relative;z-index:1}`;
    style.textContent += `.lx-buy-direct-dialog:not(.lx-buy-sub-dialog):not(.lx-order-edit-dialog) .lx-order-product-card{margin-bottom:12px!important}.lx-buy-direct-dialog:not(.lx-buy-sub-dialog):not(.lx-order-edit-dialog) .lx-buy-national-subsidy,.lx-buy-direct-dialog:not(.lx-buy-sub-dialog):not(.lx-order-edit-dialog) .lx-buy-national-subsidy.is-claimed{background:linear-gradient(90deg,#D2F7E1 0%,rgba(245,254,249,0) 100%)!important}`;
    style.textContent += `.lx-order-edit-dialog:not(.lx-config-dialog) .lx-order-address{grid-template-columns:14px minmax(0,1fr) auto!important}.lx-order-edit-dialog:not(.lx-config-dialog) .lx-order-address>img{width:14px!important;height:14px!important}`;
    style.textContent += `.lx-buy-direct-dialog:not(.lx-buy-sub-dialog):not(.lx-order-edit-dialog) .lx-order-bottom-card{margin:0!important;padding:16px 18px 14px!important;border:0!important;border-radius:18px!important;background:#fff!important;box-shadow:0 10px 26px rgba(43,34,48,.055),inset 0 1px 0 rgba(255,255,255,.98)!important}.lx-buy-direct-dialog:not(.lx-buy-sub-dialog):not(.lx-order-edit-dialog) .lx-order-bottom-card .lx-order-shipping{margin:0!important;padding:0 0 7px!important}.lx-buy-direct-dialog:not(.lx-buy-sub-dialog):not(.lx-order-edit-dialog) .lx-order-bottom-card .lx-order-payment{margin:0!important;padding:0!important}.lx-buy-direct-dialog:not(.lx-buy-sub-dialog):not(.lx-order-edit-dialog) .lx-order-bottom-card .lx-order-shipping .lx-buy-direct-row,.lx-buy-direct-dialog:not(.lx-buy-sub-dialog):not(.lx-order-edit-dialog) .lx-order-bottom-card .lx-order-payment .lx-buy-direct-row{padding:4px 0!important}.lx-buy-direct-dialog:not(.lx-buy-sub-dialog):not(.lx-order-edit-dialog) .lx-order-bottom-card .lx-buy-national-subsidy{margin:10px 0 0!important}`;
    style.textContent += `.lx-buy-direct-dialog:not(.lx-buy-sub-dialog):not(.lx-order-edit-dialog) .lx-order-product-card,.lx-buy-direct-dialog:not(.lx-buy-sub-dialog):not(.lx-order-edit-dialog) .lx-order-bottom-card,.lx-buy-direct-dialog:not(.lx-buy-sub-dialog):not(.lx-order-edit-dialog) .lx-order-summary{position:relative;top:8px}`;
    style.textContent += `/* LX_ORDER_CONTENT_RHYTHM_V152 */.lx-buy-direct-dialog:not(.lx-buy-sub-dialog):not(.lx-order-edit-dialog) .lx-order-product-card{margin:24px 0 12px!important}.lx-buy-direct-dialog:not(.lx-buy-sub-dialog):not(.lx-order-edit-dialog) .lx-order-product-card,.lx-buy-direct-dialog:not(.lx-buy-sub-dialog):not(.lx-order-edit-dialog) .lx-order-bottom-card,.lx-buy-direct-dialog:not(.lx-buy-sub-dialog):not(.lx-order-edit-dialog) .lx-order-summary{top:0}.lx-buy-direct-dialog:not(.lx-buy-sub-dialog):not(.lx-order-edit-dialog) .lx-order-bottom-card{margin:0!important;padding:14px 18px 12px!important}.lx-buy-direct-dialog:not(.lx-buy-sub-dialog):not(.lx-order-edit-dialog) .lx-order-bottom-card .lx-order-shipping{padding-bottom:5px!important}.lx-buy-direct-dialog:not(.lx-buy-sub-dialog):not(.lx-order-edit-dialog) .lx-order-bottom-card .lx-order-shipping .lx-buy-direct-row,.lx-buy-direct-dialog:not(.lx-buy-sub-dialog):not(.lx-order-edit-dialog) .lx-order-bottom-card .lx-order-payment .lx-buy-direct-row{padding:3px 0!important}.lx-buy-direct-dialog:not(.lx-buy-sub-dialog):not(.lx-order-edit-dialog) .lx-order-bottom-card .lx-buy-national-subsidy{margin-top:8px!important}.lx-buy-direct-dialog:not(.lx-buy-sub-dialog):not(.lx-order-edit-dialog) .lx-order-summary{margin:16px 0 0!important;padding:0 4px!important}.lx-buy-direct-dialog:not(.lx-buy-sub-dialog):not(.lx-order-edit-dialog) .lx-buy-direct-actions{margin-top:16px!important}`;
    style.textContent += `/* LX_ORDER_CARD_GAP_V160 */.lx-buy-direct-dialog:not(.lx-buy-sub-dialog):not(.lx-order-edit-dialog) .lx-order-product-card{margin-bottom:30px!important;padding-bottom:24px!important}.lx-buy-direct-dialog:not(.lx-buy-sub-dialog):not(.lx-order-edit-dialog) .lx-order-product-card .lx-buy-direct-product-spec{align-self:start!important}`;
    style.textContent += `/* LX_ORDER_EDIT_WIDTH_V162 */.lx-order-edit-dialog:not(.lx-config-dialog){width:min(620px,calc(100vw - 48px))!important;max-width:620px!important}`;
    style.textContent += `/* LX_ORDER_EDIT_FOOTER_V163 */.lx-order-edit-dialog:not(.lx-config-dialog) .lx-order-edit-footer{background:transparent!important;border-top:0!important;box-shadow:none!important}.lx-order-edit-dialog .lx-order-edit-back>img{transform:scaleX(-1)!important}`;
    style.textContent += `/* LX_ORDER_EDIT_COMPACT_V164 */.lx-order-edit-dialog:not(.lx-config-dialog):not(.lx-invoice-dialog){height:min(640px,calc(100vh - 48px))!important}.lx-order-edit-dialog:not(.lx-config-dialog):not(.lx-invoice-dialog) .lx-order-edit-body{padding-top:8px!important}.lx-order-edit-dialog:not(.lx-config-dialog):not(.lx-invoice-dialog) .lx-order-address{min-height:64px!important;padding:12px 18px!important;border:0!important;box-shadow:0 8px 24px rgba(50,29,57,.08)!important}`;
    style.textContent += `/* LX_PAYMENT_TABS_V158 */.lx-order-edit-dialog:not(.lx-config-dialog) .lx-order-payment-tabs{display:flex;align-items:stretch;gap:28px;height:38px;margin:0 0 14px;border-bottom:1px solid rgba(77,20,74,.12)}.lx-order-edit-dialog:not(.lx-config-dialog) .lx-order-payment-tabs .lx-order-channel{position:relative;min-height:0;padding:0 0 10px;border:0!important;border-radius:0!important;background:transparent!important;color:#5f5961;font-size:14px;line-height:20px;font-weight:500;box-shadow:none!important}.lx-order-edit-dialog:not(.lx-config-dialog) .lx-order-payment-tabs .lx-order-channel::after{content:"";position:absolute;right:0;bottom:-1px;left:0;height:2px;border-radius:2px;background:transparent}.lx-order-edit-dialog:not(.lx-config-dialog) .lx-order-payment-tabs .lx-order-channel.is-active{color:#681057;font-weight:600}.lx-order-edit-dialog:not(.lx-config-dialog) .lx-order-payment-tabs .lx-order-channel.is-active::after{background:linear-gradient(90deg,#4d144a 0%,#b8252e 100%)}.lx-order-edit-dialog:not(.lx-config-dialog) .lx-order-corporate-panel{display:grid;gap:6px;padding:14px;border:1px solid rgba(77,20,74,.12);border-radius:8px;background:#fbf9fc;color:#706a73;font-size:12px;line-height:18px}.lx-order-edit-dialog:not(.lx-config-dialog) .lx-order-corporate-panel b{color:#302b32;font-size:13px;line-height:18px}`;
    style.textContent += `/* LX_ORDER_EDIT_POLISH_V159 */.lx-order-edit-dialog:not(.lx-config-dialog):not(.lx-invoice-dialog){width:min(760px,calc(100vw - 48px));height:min(720px,88vh);border-radius:20px}.lx-order-edit-dialog:not(.lx-config-dialog):not(.lx-invoice-dialog) .lx-order-edit-head{height:72px;padding:0 24px}.lx-order-edit-dialog:not(.lx-config-dialog):not(.lx-invoice-dialog) .lx-order-edit-body{padding:20px 32px 28px;overscroll-behavior:contain;scrollbar-gutter:stable}.lx-order-edit-dialog:not(.lx-config-dialog):not(.lx-invoice-dialog) .lx-order-address{min-height:82px;padding:14px 18px;border:1px solid #e2ddeb;border-radius:14px;background:#fff;box-shadow:0 8px 24px rgba(50,29,57,.08)}.lx-order-edit-dialog:not(.lx-config-dialog):not(.lx-invoice-dialog) .lx-order-edit-section{padding:24px 0 18px}.lx-order-edit-dialog:not(.lx-config-dialog):not(.lx-invoice-dialog) .lx-order-edit-section h3{margin:0 0 12px;font-size:18px;line-height:26px}.lx-order-edit-dialog:not(.lx-config-dialog):not(.lx-invoice-dialog) .lx-order-payment-tabs{height:44px;gap:30px;margin-bottom:18px}.lx-order-edit-dialog:not(.lx-config-dialog):not(.lx-invoice-dialog) .lx-order-quick-grid{grid-template-columns:repeat(4,minmax(0,1fr));gap:10px}.lx-order-edit-dialog:not(.lx-config-dialog):not(.lx-invoice-dialog) .lx-order-quick{height:48px;padding:0 12px;border-radius:8px}.lx-order-edit-dialog:not(.lx-config-dialog):not(.lx-invoice-dialog) .lx-order-provider{min-height:50px;padding:9px 12px}.lx-order-edit-dialog:not(.lx-config-dialog):not(.lx-invoice-dialog) .lx-order-edit-footer{height:84px!important;padding:14px 32px!important;border-top:1px solid #e2ddeb!important;box-shadow:0 -8px 24px rgba(50,29,57,.08)}.lx-order-edit-dialog:not(.lx-config-dialog):not(.lx-invoice-dialog) .lx-order-edit-footer button{width:190px;height:46px;border-radius:8px}.lx-order-edit-dialog button:focus-visible,.lx-order-edit-dialog input:focus-visible,.lx-order-edit-dialog select:focus-visible{outline:2px solid #a262d7;outline-offset:2px}@media(max-width:640px){.lx-order-edit-dialog:not(.lx-config-dialog):not(.lx-invoice-dialog){width:calc(100vw - 32px);height:calc(100vh - 32px)}.lx-order-edit-dialog:not(.lx-config-dialog):not(.lx-invoice-dialog) .lx-order-edit-body{padding:16px}.lx-order-edit-dialog:not(.lx-config-dialog):not(.lx-invoice-dialog) .lx-order-quick-grid{grid-template-columns:repeat(2,minmax(0,1fr))}.lx-order-edit-dialog:not(.lx-config-dialog):not(.lx-invoice-dialog) .lx-order-edit-footer{padding:12px 16px!important}.lx-order-edit-dialog:not(.lx-config-dialog):not(.lx-invoice-dialog) .lx-order-edit-footer button{width:100%}}`;
    style.textContent += `/* LX_PAYMENT_TITLE_V159 */.lx-order-edit-dialog:not(.lx-config-dialog) .lx-order-edit-section:first-of-type>h3{margin-bottom:16px!important;font-size:18px!important;line-height:26px!important}`;
    style.textContent += `/* LX_ORDER_SUMMARY_SPACING_V151 */.lx-buy-direct-dialog:not(.lx-buy-sub-dialog):not(.lx-order-edit-dialog) .lx-order-bottom-card .lx-order-summary{margin:22px 0 0!important;padding:0!important;border:0!important;border-radius:0!important;background:transparent!important;box-shadow:none!important}.lx-buy-direct-dialog:not(.lx-buy-sub-dialog):not(.lx-order-edit-dialog) .lx-order-bottom-card .lx-buy-direct-price{margin:0;gap:10px}.lx-buy-direct-dialog:not(.lx-buy-sub-dialog):not(.lx-order-edit-dialog) .lx-order-bottom-card .lx-buy-direct-detail{margin-top:6px}`;
    style.textContent += `/* LX_MODAL_BUTTON_STANDARD_V144 */.lx-buy-direct-actions,.lx-buy-sub-footer,.lx-buy-coupon-actions{gap:12px}.lx-buy-direct-actions button,.lx-buy-sub-footer button,.lx-buy-coupon-actions button,.lx-order-edit-footer button{box-sizing:border-box;width:132px!important;min-width:132px!important;height:44px!important;min-height:44px!important;padding:0 22px!important;border-radius:999px!important;font-size:14px!important;line-height:20px!important;font-weight:600!important;box-shadow:none!important;transform:none!important}.lx-buy-direct-actions .primary,.lx-buy-sub-footer .primary,.lx-buy-coupon-actions .primary,.lx-order-edit-footer button{width:164px!important;min-width:164px!important;border:0!important;background:linear-gradient(90deg,#4d144a 11.9%,#b8252e 100%)!important;color:#fff!important}.lx-buy-direct-actions button:not(.primary),.lx-buy-sub-footer button:not(.primary),.lx-buy-coupon-actions button:not(.primary){border:1px solid #d8c5db!important;background:#fff!important;color:#4d144a!important}`;
    style.textContent += `/* LX_ORDER_FOOTNOTE_ALIGNMENT_V150 */.lx-buy-direct-dialog:not(.lx-buy-sub-dialog):not(.lx-order-edit-dialog) .lx-buy-direct-footnote{position:relative;top:-16px;margin-top:4px!important;padding:8px 0!important}`;
    style.textContent += `.lx-buy-direct-dialog:not(.lx-buy-sub-dialog):not(.lx-order-edit-dialog) .lx-order-bottom-card{padding-bottom:20px!important}`;
    style.textContent += `.lx-buy-direct-dialog:not(.lx-buy-sub-dialog):not(.lx-order-edit-dialog) .lx-buy-direct-actions,.lx-buy-direct-dialog:not(.lx-buy-sub-dialog):not(.lx-order-edit-dialog) .lx-buy-direct-footnote{top:24px}`;
    style.textContent += `/* LX_ORDER_MODAL_PARITY_V165 */.lx-order-edit-dialog:not(.lx-config-dialog):not(.lx-invoice-dialog){height:min(560px,calc(100vh - 32px))!important;min-height:min(560px,calc(100vh - 32px))!important}.lx-buy-direct-dialog:not(.lx-buy-sub-dialog):not(.lx-order-edit-dialog) .lx-order-product-card{grid-template-rows:68px 18px!important;row-gap:8px!important;min-height:132px!important;padding:16px 18px 22px!important;box-sizing:border-box!important;overflow:hidden!important}.lx-buy-direct-dialog:not(.lx-buy-sub-dialog):not(.lx-order-edit-dialog) .lx-order-product-card .lx-buy-direct-product-spec{align-self:end!important}`;
    style.textContent += `/* LX_ORDER_VERTICAL_RHYTHM_V166 */.lx-buy-direct-dialog:not(.lx-buy-sub-dialog):not(.lx-order-edit-dialog){padding-top:18px!important;padding-bottom:20px!important}.lx-buy-direct-dialog:not(.lx-buy-sub-dialog):not(.lx-order-edit-dialog) .lx-order-product-card{grid-template-rows:56px 18px!important;row-gap:4px!important;min-height:112px!important;padding:14px 18px 16px!important}.lx-buy-direct-dialog:not(.lx-buy-sub-dialog):not(.lx-order-edit-dialog) .lx-order-product-card .lx-buy-direct-product-spec{align-self:start!important}.lx-buy-direct-dialog:not(.lx-buy-sub-dialog):not(.lx-order-edit-dialog) .lx-buy-direct-actions{top:0!important;margin-top:12px!important}.lx-buy-direct-dialog:not(.lx-buy-sub-dialog):not(.lx-order-edit-dialog) .lx-buy-direct-footnote{top:0!important;margin-top:4px!important;padding:0!important}`;
    style.textContent += `.lx-order-edit-dialog:not(.lx-config-dialog) .lx-order-edit-section:last-child{padding-top:12px;padding-bottom:12px}.lx-order-edit-dialog:not(.lx-config-dialog) .lx-order-edit-section:last-child h3{margin-bottom:10px}.lx-order-edit-dialog:not(.lx-config-dialog) .lx-order-form{grid-template-columns:70px minmax(0,1fr);gap:8px 10px}.lx-order-edit-dialog:not(.lx-config-dialog) .lx-order-form label,.lx-order-edit-dialog:not(.lx-config-dialog) .lx-order-invoice-label{color:#5f5961}.lx-order-edit-dialog:not(.lx-config-dialog) .lx-order-form input,.lx-order-edit-dialog:not(.lx-config-dialog) .lx-order-invoice-row .lx-order-invoice{height:38px;border-color:#e5dce8;background:#fcfbfd}.lx-order-edit-dialog:not(.lx-config-dialog) .lx-order-invoice-row{grid-template-columns:70px minmax(0,1fr);gap:10px;margin-top:8px}.lx-order-edit-dialog:not(.lx-config-dialog) .lx-order-invoice-row .lx-order-invoice{height:38px}`;
    style.textContent += `/* LX_PRODUCT_CARD_BOTTOM_BREATHING_ROOM_V158 */.lx-buy-direct-dialog:not(.lx-buy-sub-dialog):not(.lx-order-edit-dialog) .lx-order-product-card{padding-bottom:32px!important}.lx-buy-direct-dialog:not(.lx-buy-sub-dialog):not(.lx-order-edit-dialog) .lx-order-product-card .lx-buy-direct-product-spec{margin-bottom:0!important}`;
    style.textContent += `/* LX_ORDER_CARD_COMPACT_V167 */.lx-buy-direct-dialog:not(.lx-buy-sub-dialog):not(.lx-order-edit-dialog) .lx-order-product-card{margin-bottom:14px!important;padding-bottom:16px!important}.lx-buy-direct-dialog:not(.lx-buy-sub-dialog):not(.lx-order-edit-dialog) .lx-order-product-card .lx-buy-direct-product-spec span{font-size:11px!important;line-height:16px!important}.lx-buy-sub-dialog .lx-order-edit-back>img{transform:scaleX(-1)!important}`;
    style.textContent += `/* LX_MODAL_SCROLLBAR_V168 */.lx-order-edit-dialog:not(.lx-config-dialog) .lx-order-edit-footer{border-top:0!important;background:transparent!important;box-shadow:none!important}.lx-order-edit-dialog:not(.lx-config-dialog) .lx-order-edit-body{scrollbar-gutter:auto!important}.lx-buy-direct-dialog,.lx-order-edit-body,.lx-buy-sub-dialog,[data-buy-modal-direct] [style*="overflow"]{scrollbar-width:thin;scrollbar-color:transparent transparent}.lx-buy-direct-dialog::-webkit-scrollbar,.lx-order-edit-body::-webkit-scrollbar,.lx-buy-sub-dialog::-webkit-scrollbar,[data-buy-modal-direct] [style*="overflow"]::-webkit-scrollbar{width:0;height:0}.lx-buy-direct-dialog:hover::-webkit-scrollbar,.lx-order-edit-body:hover::-webkit-scrollbar,.lx-buy-sub-dialog:hover::-webkit-scrollbar,[data-buy-modal-direct] [style*="overflow"]:hover::-webkit-scrollbar{width:5px;height:5px}.lx-buy-direct-dialog::-webkit-scrollbar-track,.lx-order-edit-body::-webkit-scrollbar-track,.lx-buy-sub-dialog::-webkit-scrollbar-track,[data-buy-modal-direct] [style*="overflow"]::-webkit-scrollbar-track{background:transparent}.lx-buy-direct-dialog::-webkit-scrollbar-thumb,.lx-order-edit-body::-webkit-scrollbar-thumb,.lx-buy-sub-dialog::-webkit-scrollbar-thumb,[data-buy-modal-direct] [style*="overflow"]::-webkit-scrollbar-thumb{border-radius:999px;background:rgba(137,103,170,.24)}.lx-buy-direct-dialog:hover::-webkit-scrollbar-thumb,.lx-order-edit-body:hover::-webkit-scrollbar-thumb,.lx-buy-sub-dialog:hover::-webkit-scrollbar-thumb,[data-buy-modal-direct] [style*="overflow"]:hover::-webkit-scrollbar-thumb{background:rgba(137,103,170,.38)}`;
    style.textContent += `/* LX_PAYMENT_IDENTITY_V169 */.lx-order-edit-dialog:not(.lx-config-dialog) .lx-order-quick img.lx-order-logo{display:block;flex:0 0 28px;width:28px;height:28px;border-radius:7px;background:transparent!important;object-fit:contain}.lx-order-edit-dialog:not(.lx-config-dialog) .lx-order-payment-tabs{height:34px!important;margin-bottom:8px!important}.lx-order-edit-dialog:not(.lx-config-dialog) .lx-order-payment-tabs .lx-order-channel{padding-bottom:7px!important}.lx-order-edit-dialog:not(.lx-config-dialog) .lx-order-corporate-panel{display:block;padding:3px 0 0!important;border:0!important;border-radius:0!important;background:transparent!important;color:#76707a;font-size:13px;line-height:20px}.lx-order-edit-dialog:not(.lx-config-dialog) .lx-order-corporate-panel b{display:none}`;
    style.textContent += `/* LX_ORDER_PAYMENT_TUNING_V170 */.lx-buy-direct-dialog:not(.lx-buy-sub-dialog):not(.lx-order-edit-dialog) .lx-order-product-card{grid-template-rows:48px 16px!important;row-gap:4px!important;margin-bottom:12px!important;padding:12px 18px!important}.lx-buy-direct-dialog:not(.lx-buy-sub-dialog):not(.lx-order-edit-dialog) .lx-order-product-card .lx-buy-direct-product>img{width:96px!important;height:96px!important}.lx-order-edit-dialog:not(.lx-config-dialog) .lx-order-subtitle,.lx-order-edit-dialog:not(.lx-config-dialog) .lx-order-subtitle>span{color:#9a949d!important;font-weight:400!important}.lx-order-edit-dialog:not(.lx-config-dialog) [data-corporate-payment][hidden]{display:none!important}`;
    style.textContent += `/* LX_ORDER_LAYOUT_REFINEMENT_V171 */.lx-buy-direct-dialog:not(.lx-buy-sub-dialog):not(.lx-order-edit-dialog) .lx-order-product-card{grid-template-columns:80px minmax(0,1fr) auto!important;grid-template-rows:80px 18px!important;column-gap:16px!important;row-gap:6px!important;min-height:0!important;margin-bottom:12px!important;padding:16px!important}.lx-buy-direct-dialog:not(.lx-buy-sub-dialog):not(.lx-order-edit-dialog) .lx-order-product-card .lx-buy-direct-product>img{width:80px!important;height:80px!important;align-self:start!important}.lx-buy-direct-dialog:not(.lx-buy-sub-dialog):not(.lx-order-edit-dialog) .lx-order-product-card .lx-buy-direct-product-copy{padding-top:0!important;align-self:start!important}.lx-buy-direct-dialog:not(.lx-buy-sub-dialog):not(.lx-order-edit-dialog) .lx-order-product-card .lx-buy-direct-product-spec{align-self:center!important}.lx-order-edit-dialog:not(.lx-config-dialog) [data-online-payment]>.lx-order-quick-grid+.lx-order-subtitle{padding-top:0!important;border-top:0!important}.lx-order-edit-dialog:not(.lx-config-dialog) .lx-order-corporate-panel{font-size:12px!important;line-height:18px!important}.lx-order-edit-dialog:not(.lx-config-dialog) .lx-order-corporate-panel::before{content:"*";margin-right:3px;color:#a59ea8}.lx-order-edit-dialog:not(.lx-config-dialog) .lx-order-edit-section:last-child{border-bottom:0!important}`;
    style.textContent += `/* LX_ORDER_FOOTER_SUMMARY_V172 */.lx-buy-direct-dialog:not(.lx-buy-sub-dialog):not(.lx-order-edit-dialog) .lx-order-product-card{height:150px!important;min-height:150px!important;box-sizing:border-box!important;overflow:hidden!important}.lx-order-edit-dialog:not(.lx-config-dialog) .lx-order-edit-footer,.lx-order-edit-dialog:not(.lx-config-dialog) .lx-order-edit-body{border-top:0!important;border-bottom:0!important;box-shadow:none!important}.lx-order-edit-dialog:not(.lx-config-dialog) .lx-order-edit-footer::before,.lx-order-edit-dialog:not(.lx-config-dialog) .lx-order-edit-footer::after{display:none!important}.lx-order-edit-dialog:not(.lx-config-dialog) .lx-order-selected-payment{margin-right:auto;color:#8f8992;font-size:12px;line-height:18px;font-weight:400}`;
    style.textContent += `/* LX_PAYMENT_PANEL_V173 */.lx-order-edit-dialog:not(.lx-config-dialog) .lx-order-edit-body{padding-top:4px!important}.lx-order-edit-dialog:not(.lx-config-dialog) [data-online-payment]{margin-top:2px;padding:14px 16px 12px;border:1px solid #f0ebf2;border-radius:12px;background:rgba(104,16,87,.025)}.lx-order-edit-dialog:not(.lx-config-dialog) [data-online-payment]>.lx-order-subtitle:first-child{margin-top:0!important}.lx-order-edit-dialog:not(.lx-config-dialog) [data-online-payment]>.lx-order-subtitle{margin-bottom:8px!important}.lx-order-edit-dialog:not(.lx-config-dialog) [data-online-payment]>.lx-order-quick-grid+.lx-order-subtitle{margin-top:16px!important}.lx-order-edit-dialog:not(.lx-config-dialog) .lx-order-edit-footer{border:0!important;outline:0!important;box-shadow:none!important;background:transparent!important}.lx-order-edit-dialog:not(.lx-config-dialog) .lx-order-edit-footer,.lx-order-edit-dialog:not(.lx-config-dialog) .lx-order-edit-footer *{border-top-color:transparent!important}`;
    style.textContent += `/* LX_PRODUCT_CARD_THREE_ROWS_V174 */.lx-buy-direct-dialog:not(.lx-buy-sub-dialog):not(.lx-order-edit-dialog) .lx-order-product-card{grid-template-columns:64px minmax(0,1fr) auto!important;grid-template-rows:64px 16px!important;column-gap:14px!important;row-gap:4px!important;height:112px!important;min-height:112px!important;margin-bottom:10px!important;padding:12px!important}.lx-buy-direct-dialog:not(.lx-buy-sub-dialog):not(.lx-order-edit-dialog) .lx-order-product-card .lx-buy-direct-product>img{width:64px!important;height:64px!important}.lx-buy-direct-dialog:not(.lx-buy-sub-dialog):not(.lx-order-edit-dialog) .lx-order-product-card .lx-buy-direct-product-copy{gap:2px!important}.lx-buy-direct-dialog:not(.lx-buy-sub-dialog):not(.lx-order-edit-dialog) .lx-order-product-card .lx-buy-direct-product-spec{align-self:start!important}`;
    style.textContent += `/* LX_ORDER_SECTION_SPACING_V175 */.lx-order-edit-dialog:not(.lx-config-dialog) .lx-order-payment-tabs{border-bottom:0!important}.lx-order-edit-dialog:not(.lx-config-dialog) .lx-order-edit-section:first-of-type{padding-bottom:28px!important}.lx-order-edit-dialog:not(.lx-config-dialog) .lx-order-edit-section:last-child{padding-top:8px!important}.lx-order-edit-dialog:not(.lx-config-dialog) .lx-order-edit-section:last-child h3{margin-bottom:2px!important}.lx-order-edit-dialog:not(.lx-config-dialog) .lx-order-edit-footer{border:0!important;border-block:0!important;box-shadow:0 0 transparent!important;background:#fff!important}.lx-order-edit-dialog:not(.lx-config-dialog) .lx-order-edit-footer::before,.lx-order-edit-dialog:not(.lx-config-dialog) .lx-order-edit-footer::after{content:none!important;display:none!important}`;
    style.textContent += `/* LX_ORDER_TAB_AND_FOOTER_V177 */.lx-order-edit-dialog:not(.lx-config-dialog) .lx-order-edit-body{padding-top:16px!important}.lx-order-edit-dialog:not(.lx-config-dialog) .lx-order-payment-tabs{height:28px!important;margin-bottom:8px!important}.lx-order-edit-dialog:not(.lx-config-dialog) .lx-order-payment-tabs .lx-order-channel{padding-bottom:2px!important}.lx-order-edit-dialog:not(.lx-config-dialog) .lx-order-payment-tabs .lx-order-channel::after{right:auto!important;bottom:2px!important;left:50%!important;width:38px!important;transform:translateX(-50%)}.lx-order-edit-dialog:not(.lx-config-dialog) .lx-order-edit-footer{position:relative!important;z-index:2!important;margin-top:-1px!important;border:0!important;box-shadow:none!important}`;
    style.textContent += `/* LX_ORDER_SPEC_AND_ACTIONS_V178 */.lx-buy-direct-dialog:not(.lx-buy-sub-dialog):not(.lx-order-edit-dialog) .lx-order-product-card{grid-template-rows:64px 20px!important;height:116px!important;min-height:116px!important}.lx-buy-direct-dialog:not(.lx-buy-sub-dialog):not(.lx-order-edit-dialog) .lx-order-product-card .lx-buy-direct-product-spec span{font-size:12px!important;line-height:20px!important}.lx-buy-direct-dialog:not(.lx-buy-sub-dialog):not(.lx-order-edit-dialog) .lx-buy-direct-actions{top:12px!important}.lx-buy-direct-dialog:not(.lx-buy-sub-dialog):not(.lx-order-edit-dialog) .lx-buy-direct-footnote{top:12px!important}`;
    style.textContent += `/* LX_PRODUCT_SPEC_COMPACT_V179 */.lx-buy-direct-dialog:not(.lx-buy-sub-dialog):not(.lx-order-edit-dialog) .lx-order-product-card .lx-buy-direct-product-spec{transform:translateY(-4px)}.lx-buy-direct-dialog:not(.lx-buy-sub-dialog):not(.lx-order-edit-dialog) .lx-order-product-card .lx-buy-direct-product-spec span{font-size:11px!important;line-height:18px!important}`;
    style.textContent += `/* LX_PRODUCT_VISUAL_ALIGNMENT_V176 */.lx-buy-direct-dialog:not(.lx-buy-sub-dialog):not(.lx-order-edit-dialog) .lx-order-product-card{grid-template-columns:96px minmax(0,1fr) auto!important}.lx-buy-direct-dialog:not(.lx-buy-sub-dialog):not(.lx-order-edit-dialog) .lx-order-product-card .lx-buy-direct-product>img{justify-self:center!important}.lx-buy-direct-dialog:not(.lx-buy-sub-dialog):not(.lx-order-edit-dialog) .lx-order-product-card .lx-buy-direct-product-copy{transform:translateY(5px)}.lx-buy-direct-dialog:not(.lx-buy-sub-dialog):not(.lx-order-edit-dialog) .lx-order-product-card .lx-buy-direct-config{transform:translateY(5px)}`;
    style.textContent += `/* LX_SUPPLEMENT_FORM_LAYOUT_V180 */.lx-order-edit-dialog:not(.lx-config-dialog) .lx-order-supplement-section{padding-top:16px!important;padding-bottom:16px!important}.lx-order-edit-dialog:not(.lx-config-dialog) .lx-order-supplement-section h3{margin:0 0 14px!important}.lx-order-edit-dialog:not(.lx-config-dialog) .lx-order-supplement-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:14px 18px}.lx-order-edit-dialog:not(.lx-config-dialog) .lx-order-supplement-grid>label{display:grid;gap:6px;min-width:0;color:#5f5961;font-size:12px;line-height:18px}.lx-order-edit-dialog:not(.lx-config-dialog) .lx-order-supplement-grid>.lx-order-supplement-note{grid-column:1 / -1}.lx-order-edit-dialog:not(.lx-config-dialog) .lx-order-supplement-grid input,.lx-order-edit-dialog:not(.lx-config-dialog) .lx-order-supplement-grid .lx-order-invoice{width:100%;height:38px;box-sizing:border-box;margin:0;padding:0 11px;border:1px solid #e5dce8;border-radius:6px;background:#fcfbfd;font-size:12px}.lx-order-edit-dialog:not(.lx-config-dialog) .lx-order-supplement-grid .lx-order-combobox{width:100%}.lx-order-edit-dialog:not(.lx-config-dialog) .lx-order-supplement-grid .lx-order-invoice{display:grid;grid-template-columns:minmax(0,1fr) 14px;gap:8px;align-items:center;text-align:left}.lx-order-edit-dialog:not(.lx-config-dialog) .lx-order-supplement-grid .lx-order-invoice span{color:#7f7882;text-align:left}.lx-order-edit-dialog:not(.lx-config-dialog) .lx-order-supplement-grid .lx-order-chevron{justify-self:end;margin-right:3px}@media(max-width:640px){.lx-order-edit-dialog:not(.lx-config-dialog) .lx-order-supplement-grid{grid-template-columns:1fr}.lx-order-edit-dialog:not(.lx-config-dialog) .lx-order-supplement-grid>.lx-order-supplement-note{grid-column:auto}}`;
    style.textContent += `/* LX_PRODUCT_CARD_BOTTOM_COMPACT_V181 */.lx-buy-direct-dialog:not(.lx-buy-sub-dialog):not(.lx-order-edit-dialog) .lx-order-product-card{grid-template-rows:64px 18px!important;row-gap:0!important;height:100px!important;min-height:100px!important;padding-block:9px!important;margin-bottom:8px!important}`;
    style.textContent += `/* LX_PRODUCT_CARD_GAP_V182 */.lx-buy-direct-dialog:not(.lx-buy-sub-dialog):not(.lx-order-edit-dialog) .lx-order-product-card{margin-bottom:12px!important}`;
    style.textContent += `/* LX_ORDER_HEADER_AND_FOOTER_CLEANUP_V183 */.lx-order-edit-dialog:not(.lx-config-dialog):not(.lx-invoice-dialog) .lx-order-edit-body{padding-top:14px!important}.lx-order-edit-dialog:not(.lx-config-dialog):not(.lx-invoice-dialog) .lx-order-edit-footer{border:0!important;border-top:0!important;border-bottom:0!important;box-shadow:none!important;outline:0!important}`;
    style.textContent += `/* LX_SUPPLEMENT_FIELD_TOKENS_V184 */.lx-order-edit-dialog:not(.lx-config-dialog) .lx-order-supplement-grid input,.lx-order-edit-dialog:not(.lx-config-dialog) .lx-order-supplement-grid .lx-order-invoice{border:1px solid #e4dee7!important;background:#fff!important;box-shadow:none!important;outline:0!important}.lx-order-edit-dialog:not(.lx-config-dialog) .lx-order-supplement-grid input:focus,.lx-order-edit-dialog:not(.lx-config-dialog) .lx-order-supplement-grid .lx-order-invoice:focus,.lx-order-edit-dialog:not(.lx-config-dialog) .lx-order-supplement-grid .lx-order-invoice:focus-visible{border-color:#b493bf!important;box-shadow:none!important;outline:0!important}.lx-order-edit-dialog:not(.lx-config-dialog) .lx-order-edit-section:first-of-type{padding-bottom:16px!important}`;
    style.textContent += `/* LX_ORDER_HEADER_COMPACT_AND_BRAND_LOGOS_V185 */.lx-order-edit-dialog:not(.lx-config-dialog):not(.lx-invoice-dialog) .lx-order-edit-body{padding-top:8px!important}.lx-order-edit-dialog:not(.lx-config-dialog) .lx-order-quick .lx-order-logo{background:transparent!important;border-radius:0!important}`;
    style.textContent += `/* LX_SELECTED_PAYMENT_ALIGNMENT_V186 */.lx-order-edit-dialog:not(.lx-config-dialog):not(.lx-invoice-dialog) .lx-order-edit-footer{height:84px!important;align-items:center!important;padding:0 32px!important}.lx-order-edit-dialog:not(.lx-config-dialog) .lx-order-selected-payment{display:flex;align-items:baseline;gap:8px;margin-right:auto!important;line-height:20px}.lx-order-edit-dialog:not(.lx-config-dialog) .lx-order-selected-payment>span{color:#8f8992;font-size:12px;font-weight:400}.lx-order-edit-dialog:not(.lx-config-dialog) .lx-order-selected-payment>strong{color:#681057;font-size:14px;font-weight:600;letter-spacing:.01em}`;
    style.textContent += `/* LX_INVOICE_TABS_COMPACT_V187 */.lx-invoice-dialog .lx-order-edit-body{padding:6px 26px 16px!important}.lx-invoice-dialog .lx-order-edit-section{padding:0 0 8px!important}.lx-invoice-dialog .lx-order-channel-grid{display:flex!important;align-items:flex-start;gap:30px!important;height:36px}.lx-invoice-dialog .lx-order-channel{position:relative;display:flex!important;flex:0 0 auto!important;min-height:36px!important;height:36px!important;padding:0 0 6px!important;border:0!important;border-radius:0!important;background:transparent!important;color:#625d65;text-align:left!important}.lx-invoice-dialog .lx-order-channel strong{font-size:14px;line-height:20px;font-weight:500!important;white-space:nowrap}.lx-invoice-dialog .lx-order-channel.is-active{padding:0 0 6px!important;border:0!important;background:transparent!important;color:#681057}.lx-invoice-dialog .lx-order-channel.is-active strong{font-weight:600!important}.lx-invoice-dialog .lx-order-channel.is-active::after{content:"";position:absolute;bottom:0;left:50%;width:42px;height:2px;border-radius:999px;background:linear-gradient(90deg,#681057,#c12631);transform:translateX(-50%)}.lx-invoice-dialog .lx-invoice-tip{margin:6px 0 14px!important}`;
    style.textContent += `/* LX_PAYMENT_ICON_AND_STATE_SYNC_V188 */.lx-order-edit-dialog:not(.lx-config-dialog) .lx-order-quick .lx-order-logo{width:22px!important;height:22px!important;min-width:22px!important;object-fit:contain}.lx-order-edit-dialog:not(.lx-config-dialog) .lx-order-provider .lx-order-logo{width:24px!important;height:24px!important;min-width:24px!important;object-fit:contain;background:transparent!important;border-radius:0!important}`;
    style.textContent += `/* LX_INVOICE_SPACING_AND_VAT_TIP_V189 */.lx-order-edit-dialog.lx-invoice-dialog .lx-order-edit-head{height:56px!important}.lx-order-edit-dialog.lx-invoice-dialog .lx-order-edit-body{padding-top:6px!important}.lx-order-edit-dialog.lx-invoice-dialog .lx-order-edit-section:first-of-type{margin:0!important;padding:0 0 12px!important}.lx-order-edit-dialog.lx-invoice-dialog .lx-invoice-tip{margin:0 0 12px!important}.lx-order-edit-dialog.lx-invoice-dialog .lx-invoice-form{row-gap:8px}`;
    style.textContent += `/* LX_MODAL_SPACING_V190 */
      .lx-order-edit-dialog.lx-invoice-dialog .lx-invoice-form{margin-top:16px!important;row-gap:12px!important}
      .lx-order-edit-dialog:not(.lx-config-dialog):not(.lx-invoice-dialog) .lx-order-edit-head{height:60px!important}
      .lx-order-edit-dialog:not(.lx-config-dialog):not(.lx-invoice-dialog) .lx-order-edit-body{padding-top:4px!important}
      .lx-order-edit-dialog:not(.lx-config-dialog):not(.lx-invoice-dialog) .lx-order-supplement-section{padding-top:16px!important}
      .lx-order-edit-dialog:not(.lx-config-dialog):not(.lx-invoice-dialog) .lx-order-supplement-section h3{margin-bottom:12px!important}
      .lx-order-edit-dialog:not(.lx-config-dialog):not(.lx-invoice-dialog) .lx-order-supplement-grid{row-gap:20px!important}
      .lx-order-edit-dialog:not(.lx-config-dialog):not(.lx-invoice-dialog) .lx-order-supplement-grid>label{gap:8px!important}
    `;
    style.textContent += `/* LX_PAYMENT_FOOTER_V191 */
      .lx-order-edit-dialog:not(.lx-config-dialog) [data-corporate-payment]{display:none!important}
      .lx-order-edit-dialog .lx-order-selected-payment.is-corporate{flex:1;min-width:0;margin-right:20px!important;align-items:center}
      .lx-order-edit-dialog .lx-order-selected-payment.is-corporate>span{font-size:12px;line-height:18px;font-weight:400}
      .lx-order-edit-dialog .lx-order-edit-footer>button{flex-shrink:0}
    `;
    style.textContent += `/* LX_MODAL_FOCUS_AND_SHADOW_V192 */
      [data-buy-modal-direct] .lx-order-edit-dialog:not(.lx-config-dialog):not(.lx-invoice-dialog) .lx-order-edit-head{height:52px!important}
      [data-buy-modal-direct] .lx-order-edit-dialog:not(.lx-config-dialog):not(.lx-invoice-dialog) .lx-order-edit-body{padding-top:12px!important;scroll-padding-top:12px}
      [data-buy-modal-direct] .lx-order-edit-dialog:not(.lx-config-dialog):not(.lx-invoice-dialog) .lx-order-address{box-shadow:0 6px 18px rgba(50,29,57,.08)!important}
      [data-buy-modal-direct] .lx-buy-direct-dialog input:not([type=radio]):not([type=checkbox]):not([aria-invalid=true]),
      [data-buy-modal-direct] .lx-buy-direct-dialog textarea:not([aria-invalid=true]),
      [data-buy-modal-direct] .lx-buy-direct-dialog select:not([aria-invalid=true]){border:1px solid #e2ddeb!important;box-shadow:none!important}
      [data-buy-modal-direct] .lx-buy-direct-dialog input:not([type=radio]):not([type=checkbox]):not([aria-invalid=true]):focus,
      [data-buy-modal-direct] .lx-buy-direct-dialog textarea:not([aria-invalid=true]):focus,
      [data-buy-modal-direct] .lx-buy-direct-dialog select:not([aria-invalid=true]):focus,
      [data-buy-modal-direct] .lx-buy-direct-dialog .lx-order-invoice:focus-visible{border-color:#4d144a!important;outline:1px solid #4d144a!important;outline-offset:-1px!important;box-shadow:none!important}
    `;
    style.textContent += `/* LX_MODAL_ALIGNMENT_V193 */
      [data-buy-modal-direct] .lx-buy-direct-dialog:not(.lx-buy-sub-dialog):not(.lx-order-edit-dialog) .lx-order-product-card .lx-buy-direct-product>img{align-self:center!important;justify-self:center!important;object-fit:contain;object-position:center}
      [data-buy-modal-direct] .lx-order-edit-dialog:not(.lx-config-dialog):not(.lx-invoice-dialog) .lx-order-edit-head{height:64px!important;padding-top:12px!important;box-sizing:border-box}
      [data-buy-modal-direct] .lx-order-edit-dialog:not(.lx-config-dialog):not(.lx-invoice-dialog) .lx-order-edit-head .lx-buy-direct-close{top:28px!important}
    `;
    style.textContent += `/* LX_CORPORATE_NOTICE_V197: design-system surface-weak */
      [data-buy-modal-direct] .lx-order-edit-dialog:not(.lx-config-dialog) [data-corporate-payment]:not([hidden]){display:block!important;margin:12px 0 0!important;padding:10px 12px!important;border:0!important;border-radius:6px!important;background:#fcfaff!important;color:#625b68!important;font-size:12px!important;line-height:20px!important;font-weight:400!important}
      [data-buy-modal-direct] .lx-order-edit-dialog [data-corporate-payment][hidden]{display:none!important}
    `;
    style.textContent += `/* LX_PAYMENT_REFERENCE_V196 */
      [data-buy-modal-direct] .lx-order-reference .lx-order-edit-section{padding:18px 0!important;border-top:1px solid #e2ddeb!important;border-bottom:0!important}
      [data-buy-modal-direct] .lx-order-reference .lx-order-edit-section h3{font-size:16px!important;line-height:24px!important;margin:0 0 12px!important}
      [data-buy-modal-direct] .lx-order-reference [data-online-payment]{padding:0!important;border:0!important;border-radius:0!important;background:transparent!important}
      [data-buy-modal-direct] .lx-order-reference .lx-order-payment-tabs{gap:32px!important;margin-bottom:12px!important}
      [data-buy-modal-direct] .lx-order-reference .lx-order-payment-tabs .lx-order-channel{font-size:14px!important;line-height:22px!important}
      [data-buy-modal-direct] .lx-order-reference .lx-order-subtitle{margin:0 0 8px!important;font-size:12px!important;font-weight:400!important}
      [data-buy-modal-direct] .lx-order-reference .lx-order-quick-grid{gap:12px!important}
      [data-buy-modal-direct] .lx-order-reference .lx-order-quick{position:relative;height:48px!important;min-height:48px!important;padding:0 14px!important;gap:10px!important;font-size:12px!important;border-radius:7px!important}
      [data-buy-modal-direct] .lx-order-reference .lx-order-quick img.lx-order-logo{width:24px!important;height:24px!important;flex-basis:24px!important}
      [data-buy-modal-direct] .lx-order-reference .lx-order-quick.is-active{padding-right:14px!important}
      [data-buy-modal-direct] .lx-order-reference .lx-order-quick.is-active:after{content:none!important;display:none!important}
      [data-buy-modal-direct] .lx-order-reference .lx-order-installments{margin-top:16px}
      [data-buy-modal-direct] .lx-order-reference .lx-order-installments summary{display:flex;align-items:center;gap:12px;list-style:none;cursor:pointer;color:#979797;font-size:12px;line-height:24px}
      [data-buy-modal-direct] .lx-order-reference .lx-order-installments summary::-webkit-details-marker{display:none}
      [data-buy-modal-direct] .lx-order-reference .lx-order-installments summary small{font-size:10px}
      [data-buy-modal-direct] .lx-order-reference .lx-order-installments summary .lx-order-chevron{margin-left:auto;margin-right:10px}
      [data-buy-modal-direct] .lx-order-reference .lx-order-installments[open] summary .lx-order-chevron{transform:rotate(225deg)}
      [data-buy-modal-direct] .lx-order-reference .lx-order-installment-note{margin:0 0 0 auto;text-align:right;color:#979797;font-size:10px;line-height:16px}
      [data-buy-modal-direct] .lx-order-reference .lx-order-edit-section.lx-order-supplement-section{margin-top:0!important;border-top:0!important}
      [data-buy-modal-direct] .lx-order-reference .lx-order-supplement-grid{row-gap:12px!important;column-gap:18px!important}
      [data-buy-modal-direct] .lx-order-reference .lx-order-supplement-grid>label{gap:6px!important;font-size:12px!important}
      [data-buy-modal-direct] .lx-order-reference .lx-order-supplement-grid input,[data-buy-modal-direct] .lx-order-reference .lx-order-invoice{height:34px!important;min-height:34px!important;padding:0 12px!important;border-radius:6px!important;font-size:12px!important}
    `;
    style.textContent += `/* LX_INSTALLMENTS_SINGLE_LEVEL_V198 */
      [data-buy-modal-direct] .lx-order-reference .lx-order-address + .lx-order-edit-section{border-top:0!important}
      [data-buy-modal-direct] .lx-order-reference .lx-order-installment-heading{display:flex;align-items:center;gap:12px;color:#979797;font-size:12px;line-height:24px}
      [data-buy-modal-direct] .lx-order-reference .lx-order-installment-heading small{font-size:10px}
    `;
    style.textContent += `/* LX_ORDER_CARD_LAYOUT_V201 */
      [data-buy-modal-direct] .lx-buy-direct-dialog:not(.lx-buy-sub-dialog):not(.lx-order-edit-dialog) .lx-order-product-card{grid-template-columns:80px minmax(0,1fr) auto!important;column-gap:14px!important}
      [data-buy-modal-direct] .lx-buy-direct-dialog:not(.lx-buy-sub-dialog):not(.lx-order-edit-dialog) .lx-order-product-card .lx-buy-direct-config{grid-row:1 / 3!important;align-self:center!important;transform:none!important}
      [data-buy-modal-direct] .lx-buy-direct-dialog:not(.lx-buy-sub-dialog):not(.lx-order-edit-dialog) .lx-order-bottom-card{margin-bottom:0!important;padding-bottom:16px!important}
      [data-buy-modal-direct] .lx-buy-direct-dialog:not(.lx-buy-sub-dialog):not(.lx-order-edit-dialog) .lx-order-summary{margin:18px 0 0!important;padding:0 18px!important;top:0!important;background:transparent!important;border:0!important;box-shadow:none!important}
      [data-buy-modal-direct] .lx-buy-direct-dialog:not(.lx-buy-sub-dialog):not(.lx-order-edit-dialog) .lx-order-summary .lx-buy-direct-price{margin:0!important;gap:10px}
      [data-buy-modal-direct] .lx-buy-direct-dialog:not(.lx-buy-sub-dialog):not(.lx-order-edit-dialog) .lx-order-summary .lx-buy-direct-detail{margin-top:6px!important}
      [data-buy-modal-direct] .lx-buy-direct-dialog:not(.lx-buy-sub-dialog):not(.lx-order-edit-dialog) .lx-buy-direct-actions{margin-top:24px!important;top:0!important}
      [data-buy-modal-direct] .lx-buy-direct-dialog:not(.lx-buy-sub-dialog):not(.lx-order-edit-dialog) .lx-buy-direct-footnote{margin-top:12px!important;top:0!important}
    `;
    style.textContent += `/* LX_ORDER_SECTION_RHYTHM_V202 */
      [data-buy-modal-direct] .lx-order-edit-dialog.lx-order-reference .lx-order-edit-body > .lx-order-address{margin-bottom:0!important}
      [data-buy-modal-direct] .lx-order-edit-dialog.lx-order-reference .lx-order-edit-body > .lx-order-edit-section{margin:0!important;padding:24px 0 0!important;border:0!important}
      [data-buy-modal-direct] .lx-order-edit-dialog.lx-order-reference .lx-order-edit-body > .lx-order-edit-section > h3{margin:0 0 12px!important;font-size:18px!important;font-weight:700!important;line-height:26px!important}
    `;
    style.textContent += `/* LX_ALIGNMENT_AND_TITLES_V203 */
      [data-buy-modal-direct] .lx-buy-direct-dialog:not(.lx-buy-sub-dialog):not(.lx-order-edit-dialog) .lx-buy-direct-actions,
      [data-buy-modal-direct] .lx-buy-direct-dialog:not(.lx-buy-sub-dialog):not(.lx-order-edit-dialog) .lx-buy-direct-footnote{position:relative!important;top:12px!important}
      [data-buy-modal-direct] .lx-buy-sub-dialog .lx-buy-price-line{display:grid!important;grid-template-columns:minmax(0,1fr) auto 16px!important;column-gap:8px!important;align-items:center!important}
      [data-buy-modal-direct] .lx-buy-sub-dialog .lx-buy-price-line>span{line-height:22px!important;align-self:center!important;transform:none!important;vertical-align:middle!important}
      [data-buy-modal-direct] .lx-buy-sub-dialog .lx-buy-price-line>span:nth-child(2){text-align:right!important;justify-self:end!important}
      [data-buy-modal-direct] .lx-buy-sub-dialog .lx-buy-price-line .arrow{display:flex!important;align-items:center!important;justify-content:center!important;height:22px!important;padding:0!important;margin:0!important}
    `;
    style.textContent += `/* LX_SIMPLIFIED_HEADINGS_ACTIONS_V204 */
      [data-buy-modal-direct] .lx-order-edit-dialog.lx-order-reference .lx-order-edit-body > .lx-order-edit-section > h3{display:none!important}
      [data-buy-modal-direct] .lx-order-edit-dialog.lx-order-reference .lx-order-edit-footer > button[data-order-save]{position:relative;top:6px!important}
      [data-buy-modal-direct] .lx-buy-direct-dialog:not(.lx-buy-sub-dialog):not(.lx-order-edit-dialog) .lx-buy-direct-actions{top:0!important}
    `;
    style.textContent += `/* LX_INVOICE_HEADER_ACTIONS_V205 */
      [data-buy-modal-direct] .lx-order-edit-dialog.lx-invoice-dialog .lx-order-edit-head{height:64px!important;padding-top:12px!important;box-sizing:border-box}
      [data-buy-modal-direct] .lx-order-edit-dialog.lx-invoice-dialog .lx-order-edit-head .lx-buy-direct-close{top:28px!important}
      [data-buy-modal-direct] .lx-buy-direct-dialog:not(.lx-buy-sub-dialog):not(.lx-order-edit-dialog) .lx-buy-direct-actions{top:10px!important}
    `;
    style.textContent += `/* LX_FORM_PARITY_V206 */
      [data-buy-modal-direct] .lx-order-edit-dialog.lx-order-reference .lx-order-supplement-grid input,
      [data-buy-modal-direct] .lx-order-edit-dialog.lx-order-reference .lx-order-supplement-grid .lx-order-invoice,
      [data-buy-modal-direct] .lx-order-edit-dialog.lx-invoice-dialog .lx-invoice-form input{height:40px!important;min-height:40px!important;box-sizing:border-box!important}
      [data-buy-modal-direct] .lx-order-edit-dialog.lx-invoice-dialog .lx-invoice-form input[readonly]{background:#fcfaff!important;color:#77717d!important}
    `;
    style.textContent += `/* LX_FORM_LABEL_GAP_V207 */
      [data-buy-modal-direct] .lx-order-edit-dialog.lx-order-reference .lx-order-supplement-grid > label{gap:10px!important}
    `;
    style.textContent += `/* LX_BUTTON_OFFSETS_V208 */
      [data-buy-modal-direct] .lx-buy-direct-dialog:not(.lx-buy-sub-dialog):not(.lx-order-edit-dialog) .lx-buy-direct-actions{top:16px!important}
      [data-buy-modal-direct] .lx-buy-direct-dialog:not(.lx-buy-sub-dialog):not(.lx-order-edit-dialog) .lx-order-product-card .lx-buy-direct-config{transform:translateY(-8px)!important}
    `;
    style.textContent += `/* LX_FOOTER_PARITY_V209 */
      [data-buy-modal-direct] .lx-buy-direct-dialog:not(.lx-buy-sub-dialog):not(.lx-order-edit-dialog) .lx-order-product-card .lx-buy-direct-config{font-weight:400!important}
      [data-buy-modal-direct] .lx-order-edit-dialog:not(.lx-config-dialog) .lx-order-edit-footer{height:84px!important;min-height:84px!important;box-sizing:border-box!important;padding:16px 32px 24px!important;display:flex!important;align-items:center!important;flex-shrink:0!important}
      [data-buy-modal-direct] .lx-order-edit-dialog:not(.lx-config-dialog) .lx-order-edit-footer > button[data-order-save],
      [data-buy-modal-direct] .lx-order-edit-dialog:not(.lx-config-dialog) .lx-order-edit-footer > button[data-invoice-save]{position:static!important;top:auto!important;bottom:auto!important;transform:none!important;margin:0!important;align-self:center!important;width:164px!important;height:44px!important;min-height:44px!important}
    `;
    style.textContent += `html body [data-buy-modal-direct] .lx-buy-direct-dialog:has(>.lx-buy-payment-success){width:min(460px,calc(100vw - 32px))!important;height:auto!important;min-height:0!important;max-height:calc(100vh - 32px)!important;padding:32px 24px 24px!important;overflow:auto!important}html body [data-buy-modal-direct] .lx-buy-payment-success{height:auto!important;min-height:0!important;padding:12px 0 0!important}html body [data-buy-modal-direct] .lx-buy-payment-success-card{margin:18px 0!important}`;
    style.textContent += `/* LX_INVOICE_AND_PAYMENT_FLOW_V59 */
      [data-buy-modal-direct] .lx-invoice-form textarea{width:100%;min-height:72px;box-sizing:border-box;padding:10px 12px;border:1px solid #d9cfdd;border-radius:6px;background:#fff;color:#2b272d;font:12px/18px "Source Han Sans CN","PingFang SC",sans-serif;outline:none;resize:vertical}
      [data-buy-modal-direct] .lx-invoice-form textarea:focus{border-color:#681057}
      [data-buy-modal-direct] .lx-invoice-delay-field{margin-top:14px}
      [data-buy-modal-direct] .lx-invoice-delay-trigger{width:100%;display:grid;grid-template-columns:100px minmax(0,1fr) 16px;gap:12px;align-items:center;min-height:44px;padding:0 12px;border:1px solid #d9cfdd;border-radius:6px;background:#fff;color:#454047;text-align:left;cursor:pointer}
      [data-buy-modal-direct] .lx-invoice-delay-value{color:#8d8790}.lx-invoice-delay-value.has-value{color:#2b272d}
      [data-buy-modal-direct] .lx-invoice-delay-chevron{width:7px;height:7px;justify-self:end;border-right:1px solid #8c8790;border-bottom:1px solid #8c8790;transform:rotate(-45deg)}
      [data-buy-modal-direct] .lx-invoice-delay-help{margin:8px 0 0 112px;color:#8b858e;font-size:11px;line-height:18px}
      [data-buy-modal-direct] .lx-invoice-notice-entry{margin-left:auto;margin-right:30px;padding:0;border:0;background:transparent;color:#681057;font:12px "Source Han Sans CN","PingFang SC",sans-serif;cursor:pointer}
      [data-buy-modal-direct] .lx-invoice-delay-layer,[data-buy-modal-direct] .lx-invoice-notice-layer{position:absolute;inset:0;z-index:8;display:grid;place-items:center;padding:16px;background:rgba(31,20,38,.55)}
      [data-buy-modal-direct] .lx-invoice-delay-dialog{width:min(420px,calc(100vw - 32px));padding:0;border-radius:12px;background:#fff;box-shadow:0 18px 52px rgba(31,20,38,.2);overflow:hidden}
      [data-buy-modal-direct] .lx-invoice-delay-head{height:58px;display:flex;align-items:center;justify-content:space-between;padding:0 22px;border-bottom:1px solid #e8e2eb}
      [data-buy-modal-direct] .lx-invoice-delay-head h3{margin:0;font-size:17px}.lx-invoice-delay-close{border:0;background:transparent;color:#77717d;font-size:22px;cursor:pointer}
      [data-buy-modal-direct] .lx-invoice-delay-body{padding:22px}.lx-invoice-delay-note{margin:0 0 16px;color:#77717d;line-height:19px}.lx-invoice-delay-date-label{display:grid;gap:8px;color:#454047}.lx-invoice-delay-date{height:42px;padding:0 12px;border:1px solid #d9cfdd;border-radius:6px;font:inherit}
      [data-buy-modal-direct] .lx-invoice-delay-footer{display:flex;justify-content:flex-end;gap:10px;padding:14px 22px 18px;border-top:1px solid #e8e2eb}.lx-invoice-delay-footer button{height:36px;padding:0 18px;border:1px solid #d3bfd2;border-radius:100px;background:#fff;color:#4d144a;cursor:pointer}.lx-invoice-delay-footer .primary{border:0;background:linear-gradient(90deg,#4d144a,#b8252e);color:#fff}
      [data-buy-modal-direct] .lx-invoice-notice-dialog{width:min(760px,calc(100vw - 32px));max-height:calc(100vh - 32px);display:flex;flex-direction:column;border-radius:12px;background:#fff;box-shadow:0 18px 52px rgba(31,20,38,.2);overflow:hidden}
      [data-buy-modal-direct] .lx-invoice-notice-body{min-height:0;padding:28px 30px 20px;overflow:auto;color:#5f5a62;font-size:13px;line-height:1.75}
      [data-buy-modal-direct] .lx-invoice-notice-body h3{margin:0 0 8px;color:#29262b;font-size:15px}.lx-invoice-notice-body h3:not(:first-child){margin-top:20px}.lx-invoice-notice-body ol{margin:0;padding-left:24px}
      [data-buy-modal-direct] .lx-invoice-notice-footer{display:flex;justify-content:flex-end;padding:16px 30px;border-top:1px solid #e8e2eb}.lx-invoice-notice-footer button{width:132px;height:38px;border:0;border-radius:100px;background:linear-gradient(90deg,#4d144a,#b8252e);color:#fff;font-weight:600;cursor:pointer}
      .lx-payment-chat-card.answer-cta{position:relative;display:flex;align-items:center;justify-content:space-between;gap:12px;width:min(100%,300px);min-height:70px;margin:11px 0 6px;padding:13px 14px;border:1px solid var(--answer-card-border,#e2ddeb);border-radius:14px;background:var(--answer-card-bg,#fcfaff);color:#252525;cursor:pointer;overflow:hidden;box-shadow:var(--answer-card-shadow,0 3px 10px rgba(77,20,74,.035));text-align:left;font-family:inherit}
      .lx-payment-chat-card .answer-cta-copy{position:relative;z-index:1;display:grid;gap:3px;flex:1;min-width:0;text-align:left}.lx-payment-chat-card .answer-cta-title{display:block;max-width:100%;overflow:hidden;color:var(--answer-card-title,#4d144a);font-size:13.5px;font-weight:600;line-height:1.2;text-overflow:ellipsis;white-space:nowrap}.lx-payment-chat-card .answer-cta-icon{position:relative;z-index:1;width:30px;height:30px;display:inline-flex;align-items:center;justify-content:center;flex:none;border:1px solid var(--answer-card-icon-border,rgba(155,142,182,.62));border-radius:50%;background:var(--answer-card-icon-bg,rgba(255,255,255,.72))}.lx-payment-chat-card .answer-cta-icon:before{content:"";width:9px;height:9px;border-top:1.5px solid var(--answer-card-arrow,rgba(155,142,182,.62));border-right:1.5px solid var(--answer-card-arrow,rgba(155,142,182,.62));transform:translateX(-2px) rotate(45deg)}.lx-payment-chat-card-state,.lx-payment-chat-card-desc{display:none!important}
      @media(max-width:620px){[data-buy-modal-direct] .lx-invoice-delay-help{margin-left:0}[data-buy-modal-direct] .lx-invoice-delay-trigger{grid-template-columns:92px minmax(0,1fr) 16px}[data-buy-modal-direct] .lx-invoice-notice-body{padding:22px 20px 16px}}
    `;
    style.textContent += `/* LX_CHECKOUT_ADDRESS_INVOICE_V57 */
      [data-buy-modal-direct] .lx-order-address-copy{min-width:0;display:grid;gap:4px}
      [data-buy-modal-direct] .lx-order-address-copy strong{overflow:hidden;color:#252126;font-size:13px;line-height:19px;text-overflow:ellipsis;white-space:nowrap}
      [data-buy-modal-direct] .lx-order-address-copy span{overflow:hidden;color:#6f6872;font-size:12px;line-height:18px;text-overflow:ellipsis;white-space:nowrap}
      [data-buy-modal-direct] .lx-address-dialog,[data-buy-modal-direct] .lx-invoice-dialog{width:min(620px,calc(100vw - 32px))!important;height:min(560px,calc(100vh - 32px))!important;min-height:min(560px,calc(100vh - 32px))!important}
      [data-buy-modal-direct] .lx-address-head{padding:0 32px}
      /* checkout-address-back-v71-20260915 */
      [data-buy-modal-direct] .lx-address-head{padding-left:18px;gap:10px}
      [data-buy-modal-direct] .lx-address-head>.lx-order-edit-back{display:grid}
      [data-buy-modal-direct] .lx-address-tabs{height:100%;display:flex;align-items:center;gap:32px}
      [data-buy-modal-direct] .lx-address-tabs button{position:relative;height:100%;padding:0;border:0;background:transparent;color:#1d191f;font:600 18px/26px "Source Han Sans CN","PingFang SC",sans-serif;cursor:pointer}
      [data-buy-modal-direct] .lx-address-tabs button.is-active{color:#681057}
      [data-buy-modal-direct] .lx-address-tabs button.is-active::after{content:"";position:absolute;right:0;bottom:10px;left:0;height:3px;border-radius:3px;background:linear-gradient(90deg,#4d144a,#b8252e)}
      [data-buy-modal-direct] .lx-address-select-body{padding:24px 32px!important}
      [data-buy-modal-direct] .lx-address-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:16px 18px}
      [data-buy-modal-direct] .lx-address-card{position:relative;min-height:112px;box-sizing:border-box;border:1px solid #eee8f0;border-radius:10px;background:#fbf9fc;overflow:hidden}
      [data-buy-modal-direct] .lx-address-card.is-selected{border-color:#681057;background:linear-gradient(135deg,#fff8fc,#f0f2ff);box-shadow:0 0 0 1px rgba(184,37,46,.35)}
      [data-buy-modal-direct] .lx-address-card-main{width:100%;height:100%;min-height:112px;display:grid;align-content:start;gap:12px;padding:18px 42px 18px 20px;border:0;background:transparent;color:#242025;text-align:left;cursor:pointer}
      [data-buy-modal-direct] .lx-address-card-main strong{display:flex;align-items:center;gap:10px;font-size:14px;line-height:20px}
      [data-buy-modal-direct] .lx-address-card-main strong span:last-child{font-weight:500}
      [data-buy-modal-direct] .lx-address-card-main em{padding:3px 7px;border-radius:3px;background:#681057;color:#fff;font-size:10px;font-style:normal;font-weight:500}
      [data-buy-modal-direct] .lx-address-card-main small{display:-webkit-box;overflow:hidden;color:#655f67;font-size:12px;line-height:19px;-webkit-box-orient:vertical;-webkit-line-clamp:2}
      [data-buy-modal-direct] .lx-address-card-edit{position:absolute;top:12px;right:12px;width:26px;height:26px;padding:0;border:0;background:transparent;color:#9c6e98;font-size:18px;line-height:26px;cursor:pointer}
      [data-buy-modal-direct] .lx-address-create-body{padding:28px 40px!important}
      [data-buy-modal-direct] .lx-address-form{display:grid;grid-template-columns:82px minmax(0,1fr);gap:18px 16px;align-items:center}
      [data-buy-modal-direct] .lx-address-form>label{color:#242025;font-size:14px;font-weight:600}
      [data-buy-modal-direct] .lx-address-form>input,[data-buy-modal-direct] .lx-address-form>select,[data-buy-modal-direct] .lx-address-form>textarea{width:100%;box-sizing:border-box;border:1px solid #e6dfeb;border-radius:5px;background:#fcfaff;color:#2b272d;font:13px/20px "Source Han Sans CN","PingFang SC",sans-serif;outline:none}
      [data-buy-modal-direct] .lx-address-form>input,[data-buy-modal-direct] .lx-address-form>select{height:44px;padding:0 14px}
      [data-buy-modal-direct] .lx-address-form>textarea{height:98px;padding:12px 14px;resize:none}
      [data-buy-modal-direct] .lx-address-form>input:focus,[data-buy-modal-direct] .lx-address-form>select:focus,[data-buy-modal-direct] .lx-address-form>textarea:focus{border-color:#681057;box-shadow:0 0 0 2px rgba(104,16,87,.08)}
      [data-buy-modal-direct] .lx-address-default{grid-column:1/-1;display:flex;align-items:center;gap:8px!important;margin-top:12px;color:#69636c!important;font-weight:400!important;cursor:pointer}
      [data-buy-modal-direct] .lx-address-default input{width:18px;height:18px;margin:0;accent-color:#681057}
      [data-buy-modal-direct] .lx-address-footer button,[data-buy-modal-direct] .lx-invoice-notice-footer button{width:164px!important;height:44px!important}
      [data-buy-modal-direct] .lx-invoice-type-row{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:18px;align-items:center}
      [data-buy-modal-direct] .lx-invoice-type-grid{grid-template-columns:repeat(3,minmax(0,1fr));gap:8px}
      [data-buy-modal-direct] .lx-invoice-type-grid .lx-order-channel{min-height:42px;place-items:center;padding:8px 6px;text-align:center}
      [data-buy-modal-direct] .lx-invoice-notice-entry{margin:0!important;padding:0;border:0;background:transparent;color:#681057;font:12px/20px "Source Han Sans CN","PingFang SC",sans-serif;white-space:nowrap;cursor:pointer}
      [data-buy-modal-direct] .lx-invoice-delay-field{display:grid;grid-template-columns:80px minmax(0,1fr);gap:8px 8px;align-items:center;margin-top:14px}
      [data-buy-modal-direct] .lx-invoice-delay-field>label{color:#454047;font-size:12px;line-height:18px}
      [data-buy-modal-direct] .lx-invoice-delay-trigger{grid-template-columns:minmax(0,1fr) 16px;gap:12px}
      [data-buy-modal-direct] .lx-invoice-delay-help{grid-column:2;margin:0;color:#8b858e;font-size:11px;line-height:18px}
      [data-buy-modal-direct] .lx-invoice-notice-view .lx-invoice-notice-body{padding:20px 32px!important;overflow:auto;color:#5f5a62;font-size:12px;line-height:1.7}
      [data-buy-modal-direct] .lx-invoice-notice-view .lx-invoice-notice-body section{padding:18px 22px;border-radius:10px;background:#fbf9fc}
      [data-buy-modal-direct] .lx-invoice-notice-view .lx-invoice-notice-body h3{margin:0 0 8px;color:#29262b;font-size:14px}
      [data-buy-modal-direct] .lx-invoice-notice-view .lx-invoice-notice-body h3:not(:first-child){margin-top:16px}
      [data-buy-modal-direct] .lx-invoice-notice-view .lx-invoice-notice-body ol{margin:0;padding-left:22px}
      [data-buy-modal-direct] .lx-invoice-notice-view .lx-invoice-notice-footer{display:flex;justify-content:flex-end;padding:16px 32px!important}
      @media(max-width:620px){[data-buy-modal-direct] .lx-address-grid{grid-template-columns:1fr}[data-buy-modal-direct] .lx-address-create-body{padding:20px 18px!important}[data-buy-modal-direct] .lx-address-form{grid-template-columns:64px minmax(0,1fr);gap:14px 10px}[data-buy-modal-direct] .lx-invoice-type-row{grid-template-columns:1fr}[data-buy-modal-direct] .lx-invoice-notice-entry{justify-self:end}[data-buy-modal-direct] .lx-invoice-delay-field{grid-template-columns:80px minmax(0,1fr)}}
    `;
    style.textContent += '[data-purchase-options] .lx-config-option{overflow:hidden;text-overflow:ellipsis}[data-buy-modal-direct] [hidden]{display:none!important}';
    style.textContent += `/* checkout-benefit-info-v65 */ [data-buy-modal-direct] .lx-benefit-info{display:inline-flex;align-items:center;justify-content:center;flex:0 0 20px;width:20px;height:20px;min-width:0;margin:0;padding:0;border:0;border-radius:50%;background:transparent;color:#918b99;cursor:pointer;vertical-align:middle;line-height:1}[data-buy-modal-direct] .lx-benefit-info:hover{color:#681057}[data-buy-modal-direct] .lx-benefit-info:focus-visible{outline:2px solid #681057;outline-offset:2px}[data-buy-modal-direct] .lx-benefit-info svg{display:block}`;
    document.head.appendChild(style);
  }

  // checkout-payment-state-v67-20260909
  const checkoutSessions = new Map();
  const checkoutStorageKey = 'lexiang.checkout-sessions.v67';
  let checkoutRecords = {};
  try { checkoutRecords = JSON.parse(localStorage.getItem(checkoutStorageKey) || '{}'); } catch (_) {}
  const checkoutKey = product => String(product?._pendingOrderNo || product?._checkoutId || '');
  const readonlyActions = '[data-edit-order],[data-pay-now],[data-edit-config],[data-open-benefit],[data-open-coupon-code],[data-select-fulfillment-store],[data-claim-national-subsidy]';
  const rememberCheckout = (id, value) => {
    checkoutRecords[id] = value;
    try {
      const keys = Object.keys(checkoutRecords);
      for (const key of keys.slice(0, Math.max(0, keys.length - 60))) delete checkoutRecords[key];
      localStorage.setItem(checkoutStorageKey, JSON.stringify(checkoutRecords));
    } catch (_) {}
  };
  const restoreCheckout = (id, view) => {
    let session = checkoutSessions.get(String(id));
    if (!session) {
      const record = checkoutRecords[id];
      if (!record?.product) return false;
      window.__lxOpenUnifiedDiscountOrder(record.product, {mode: record.mode, storeId: record.storeId, skipSuggestion: true});
      session = checkoutSessions.get(String(id));
    }
    if (!session) return false;
    if (view === 'payment') session.openPayment(); else session.openOrder();
    return true;
  };
  const restoreCheckoutDetail = id => {
    const tab = checkoutRecords[id]?.detailTab;
    const state = window.__lxState;
    if (!tab || !state) return false;
    if (!window.__lxBridge?.activateTab) {
      if (!window.__lxCheckoutRestoreDetailTab) return false;
      window.__lxCheckoutRestoreDetailTab(tab); return true;
    }
    state.tabs ||= [];
    if (!state.tabs.some(item => item.id === tab.id)) state.tabs.push({...tab, __fresh:true});
    window.__lxBridge.prepareRootSplitState?.();
    window.__lxBridge.exitFullscreen?.();
    return window.__lxBridge.activateTab(tab.id);
  };
  window.__lxCheckoutStateV67 = { sessions: checkoutSessions, records: checkoutRecords, restore: restoreCheckout };
  const readonlyStyle = document.createElement('style');
  readonlyStyle.dataset.checkoutPaymentStateV67 = '';
  readonlyStyle.textContent = '[data-buy-modal-direct] [data-checkout-disabled="true"]{color:#aaa4ad!important;background:#f1eef3!important;border-color:#e4dfe7!important;cursor:not-allowed!important;box-shadow:none!important;opacity:.68!important}[data-buy-modal-direct] .lx-buy-price-line[data-checkout-disabled="true"]{background:transparent!important}[data-buy-modal-direct] [data-checkout-disabled="true"] .arrow{visibility:hidden}.info-page:has(.lx-checkout-detail-surface){width:100%!important;max-width:none!important;box-sizing:border-box!important}.lx-checkout-detail-surface{width:100%;max-width:none;min-height:100%;box-sizing:border-box;background:white}.lx-checkout-detail-surface .lx-order-detail{width:100%!important;max-width:none!important;margin:0!important;box-sizing:border-box!important}.lx-checkout-detail-surface [data-order-detail]{display:block!important}.lx-checkout-order-preview{margin-top:12px}';
  document.head.appendChild(readonlyStyle);
  readonlyStyle.textContent += '.lx-checkout-detail-surface [data-checkout-detail]{display:block!important}.info-page:has(.lx-checkout-detail-surface)>h2{display:none!important}[data-checkout-disabled="true"] *{color:inherit!important}';
  window.addEventListener('click', event => {
    const detail = event.target.closest?.('.lx-checkout-detail-surface');
    const detailTab = detail && event.target.closest('[data-detail-tab]');
    if (detailTab) {
      detail.querySelectorAll('[data-detail-tab]').forEach(tab=>{const active=tab===detailTab;tab.classList.toggle('is-active',active);tab.setAttribute('aria-selected',String(active));});
      detail.querySelectorAll('[data-detail-pane]').forEach(pane=>pane.classList.toggle('is-active',pane.dataset.detailPane===detailTab.dataset.detailTab));
      event.preventDefault();event.stopImmediatePropagation();return;
    }
    const target = event.target.closest?.('[data-checkout-order-id],[data-payment-chat-card],[data-checkout-view-order],[data-checkout-detail-back]');
    if (target) {
      const id = target.dataset.checkoutOrderId || target.dataset.paymentChatCard || target.dataset.checkoutViewOrder;
      let restored = false;
      if (target.hasAttribute('data-checkout-detail-back')) {
        window.__lxOpenOrdersCenter?.({question:''}); restored = true;
      } else if (target.hasAttribute('data-checkout-view-order')) restored = restoreCheckoutDetail(id);
      else restored = restoreCheckout(id, target.hasAttribute('data-payment-chat-card') ? 'payment' : 'order');
      if (restored) {event.preventDefault();event.stopImmediatePropagation();return;}
    }
    const modal = event.target.closest?.('[data-buy-modal-direct][data-checkout-locked="true"]');
    if (modal && event.target.closest?.(readonlyActions)) {
      event.preventDefault(); event.stopImmediatePropagation();
    }
  }, true);

  const normalizeHistoricPaymentCards = (root = document) => {
    const cards = [...(root.matches?.('.lx-payment-chat-card') ? [root] : []), ...(root.querySelectorAll?.('.lx-payment-chat-card') || [])];
    cards.forEach((card) => {
      if (!card.hasAttribute('data-payment-chat-card')) return;
      card.classList.add('answer-cta');
      const paid = checkoutRecords[card.dataset.paymentChatCard]?.payment?.paid || card.dataset.paymentStatus === 'paid';
      card.classList.toggle('is-paid', !!paid);
      card.querySelectorAll('.lx-payment-chat-card-state,.lx-payment-chat-card-desc').forEach((node) => node.remove());
      let title = card.querySelector('.lx-payment-chat-card-title');
      if (!title) {
        title = document.createElement('span');
        title.className = 'lx-payment-chat-card-title';
        card.prepend(title);
      }
      title.classList.add('answer-cta-title');
      const paymentTitle = paid ? '支付成功' : '支付信息待确认';
      if (title.textContent.trim() !== paymentTitle) title.textContent = paymentTitle;
      if (!title.closest('.answer-cta-copy')) {
        const copy = document.createElement('span');
        copy.className = 'answer-cta-copy';
        title.before(copy);
        copy.appendChild(title);
      }
      let icon = card.querySelector('.lx-payment-chat-card-icon');
      if (!icon) {
        icon = document.createElement('span');
        icon.className = 'lx-payment-chat-card-icon';
        icon.setAttribute('aria-hidden', 'true');
        card.appendChild(icon);
      }
      icon.classList.add('answer-cta-icon');
    });
  };
  normalizeHistoricPaymentCards();
  const historicPaymentCardObserver = new MutationObserver((records) => records.forEach((record) => record.addedNodes.forEach((node) => {
    if (node.nodeType === Node.ELEMENT_NODE) normalizeHistoricPaymentCards(node);
  })));
  if (document.documentElement) historicPaymentCardObserver.observe(document.documentElement, { childList: true, subtree: true });

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

  const showToast = (message, duration = 2400) => {
    if (window.__lxToast) return window.__lxToast.show(message, { duration });
    let toast = document.querySelector('.lx-p0-toast');
    if (!toast) {
      toast = document.createElement('div');
      toast.className = 'lx-p0-toast';
      document.body.appendChild(toast);
    }
    toast.setAttribute('role', 'status');
    toast.textContent = message;
    toast.classList.add('show');
    clearTimeout(toast._timer);
    toast._timer = setTimeout(() => toast.classList.remove('show'), duration);
  };

  const openOrderModal = (product) => {
    if (!product || !product.name || !(Number(product.price) > 0)) { showToast("商品数据不完整，请重新选择商品"); return; }
    const id = checkoutKey(product) || ('LX' + Date.now() + Math.random().toString(36).slice(2,6));
    product = {...product, _pendingOrderNo:id};
    const existing = checkoutSessions.get(id);
    if (existing) { existing.openOrder(); return existing.modal; }
    const saved = checkoutRecords[id];
    const previousModal = document.querySelector('[data-buy-modal-direct]');
    previousModal?._lxCleanup?.();
    previousModal?.remove();
    document.querySelectorAll('.lx-p0-toast').forEach((toast) => toast.classList.remove('show'));
    const modal = document.createElement('div');
    modal.dataset.buyModalDirect = 'true';
    const orderState = { payment: '支付宝', expanded: '', note: '请工作日送达，送货前电话联系', customerCode: 'CUS-BJ-20260803', addressId: 'address-1', recipientName: '联小想', recipientPhone: '13028280000', recipientRegion: '北京市海淀区中关村软件园2期', recipientDetail: '北京联想总部东区E1', invoice: '普通发票-个人', invoiceDraft: '增值税专票', invoiceTitle: '个人', invoiceTaxNo: '123123123123123', invoicePhone: '13504289879', invoiceEmail: 'ziyu@lenovo.com', invoiceAddress: '北京市海淀区上地西路6号', invoiceRegisteredPhone: '01058868888', invoiceBank: '招商银行北京双榆树支行', invoiceBankAccount: '861580122210002', invoiceRemark: '', invoiceDelayDate: '', invoiceConsent: true };
    const addressBook = [
      { id: 'address-1', name: '联小想', phone: '13028280000', region: '北京市海淀区中关村软件园2期', detail: '北京联想总部东区E1', isDefault: true },
      { id: 'address-2', name: '李晓宁', phone: '13810001234', region: '北京市海淀区西北旺镇', detail: '中关村软件园一期8号楼' },
      { id: 'address-3', name: '王晨', phone: '13610005678', region: '北京市朝阳区望京街道', detail: '阜通东大街6号院' },
      { id: 'address-4', name: '陈思远', phone: '13910008765', region: '上海市浦东新区张江镇', detail: '祖冲之路2290号' },
      { id: 'address-5', name: '赵敏', phone: '13710004321', region: '广东省深圳市南山区粤海街道', detail: '科技园南区高新南一道' }
    ];
    const selectedAddress = () => addressBook.find((address) => address.id === orderState.addressId) || addressBook[0];
    const applyAddress = (address) => {
      orderState.addressId = address.id;
      orderState.recipientName = address.name;
      orderState.recipientPhone = address.phone;
      orderState.recipientRegion = address.region;
      orderState.recipientDetail = address.detail;
    };
    const recipientAddress = () => `${orderState.recipientRegion}${orderState.recipientDetail}`;
    const configState = product.sku ? { color: product.color || '', size: product.size || '以商品详情为准', spec: product.configuration || '以所选商品详情为准', quantity: 1 } : { color: '凝雾灰', size: '13英寸', spec: '8GB+256GB WIFI', quantity: 1 };
    if (saved?.orderState) Object.assign(orderState, saved.orderState);
    if (saved?.configState) Object.assign(configState, saved.configState);
    const initialCouponAmount = Number(product.discount) || 0;
    const benefitState = { couponId: initialCouponAmount ? 'coupon-best' : 'coupon-none', couponAmount: initialCouponAmount, beanPoints: 0, beanAmount: 0, redPacketAmount: 0 };
    if (saved?.benefitState) Object.assign(benefitState, saved.benefitState);
    const payableAmount = () => Math.max(0, (Number(product.originalPrice) || 0) * configState.quantity - benefitState.couponAmount - benefitState.beanAmount - benefitState.redPacketAmount);
    const totalDiscount = () => benefitState.couponAmount + benefitState.beanAmount + benefitState.redPacketAmount;
    const invoicePreview = () => orderState.invoice === '普通发票-个人' ? '电子普通发票（个人）' : orderState.invoice === '普通发票-单位' ? '电子普通发票（单位）' : '增值税专用发票';
    const orderHtml = () => `<button class="lx-buy-direct-close" type="button" aria-label="关闭">×</button><h2 id="lxBuyDirectTitle">联想乐享为你生成订单</h2><div class="lx-buy-direct-card"><div class="lx-order-product-card"><div class="lx-buy-direct-product"><img src="${escapeHtml(product.image_url)}" alt="${escapeHtml(product.name)}" onerror="this.onerror=null;this.src='${FALLBACK_IMAGE}'"><div class="lx-buy-direct-product-copy"><strong>${escapeHtml(product.name)}</strong><span>X${configState.quantity}</span></div><button class="lx-buy-direct-config" type="button" data-edit-config>修改配置<i aria-hidden="true"></i></button></div><div class="lx-buy-direct-section lx-buy-direct-product-spec"><div class="lx-buy-direct-row"><strong>系列：</strong><span>Lenovo</span></div><div class="lx-buy-direct-row"><strong>型号：</strong><span title="${escapeHtml(product.name)}">${escapeHtml(product.series || product.name)}</span></div><div class="lx-buy-direct-row"><strong>尺寸：</strong><span>${escapeHtml(configState.size)}</span></div><div class="lx-buy-direct-row"><strong>配置：</strong><span title="${escapeHtml(configState.spec)}">${escapeHtml(product.configurationLabel || configState.spec)}${configState.color ? " · " + escapeHtml(configState.color) : ""}</span></div></div></div><div class="lx-buy-direct-section lx-order-shipping"><div class="lx-buy-direct-row"><strong>收货信息：</strong><span>${escapeHtml(orderState.recipientName)}　${escapeHtml(orderState.recipientPhone)}</span></div><div class="lx-buy-direct-row"><strong>收货地址：</strong><span>${escapeHtml(recipientAddress())}</span></div></div><div class="lx-buy-direct-section lx-order-payment"><div class="lx-buy-direct-row"><strong>支付方式：</strong><span data-order-preview-payment>${escapeHtml(orderState.payment.includes('支付') || orderState.payment.includes('分期') ? orderState.payment : `${orderState.payment}支付`)}</span></div><div class="lx-buy-direct-row"><strong>发票信息：</strong><span data-order-preview-invoice>${escapeHtml(invoicePreview())}</span></div></div><div class="lx-order-summary"><div class="lx-buy-direct-price"><strong>等待支付：</strong><b>¥${payableAmount().toLocaleString('zh-CN')}</b><span>节省了：<em>¥${totalDiscount().toLocaleString('zh-CN')}</em></span></div><div class="lx-buy-direct-detail"><button class="lx-buy-direct-detail-button" type="button" data-price-detail>查看价格明细</button><span>可修改优惠券/乐豆等优惠</span><button type="button" class="lx-benefit-info" data-benefit-info aria-label="优惠使用说明"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true"><circle cx="12" cy="12" r="9" stroke="currentColor" stroke-width="1.5"/><path d="M12 11v6" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/><circle cx="12" cy="7.5" r="1" fill="currentColor"/></svg></button></div></div><div class="lx-buy-direct-actions"><button type="button" data-edit-order>修改订单</button><button type="button" class="primary" data-pay-now>立即支付</button></div><p class="lx-buy-direct-footnote">*修改配置包括商品配置及数量；修改订单包括收货地址、支付方式、发票等</p></div>`;
    modal.innerHTML = `<div class="lx-buy-direct-mask"></div><section class="lx-buy-direct-dialog" role="dialog" aria-modal="true" aria-labelledby="lxBuyDirectTitle">${orderHtml()}</section>`;
    document.body.appendChild(modal);
    modal.querySelector('img')?.addEventListener('error', (event) => { event.currentTarget.src = FALLBACK_IMAGE; }, { once: true });
    const dialog = modal.querySelector('.lx-buy-direct-dialog');
    const mountNationalSubsidy = () => {
      const payment = dialog.querySelector('.lx-order-payment');
      if (!payment || dialog.querySelector('.lx-buy-national-subsidy')) return;
      const shipping = dialog.querySelector('.lx-order-shipping');
      if (shipping && !dialog.querySelector('.lx-order-bottom-card')) {
        const bottomCard = document.createElement('div');
        bottomCard.className = 'lx-order-bottom-card';
        shipping.before(bottomCard);
        bottomCard.append(shipping, payment);
      }
      payment.insertAdjacentHTML('afterend', '<button class="lx-buy-national-subsidy" type="button" data-claim-national-subsidy><span><strong>国家补贴资格可领取</strong><small>领取后将在结算时自动核验，价格以实际支付为准</small></span><b>立即领取</b></button>');
      const summary = dialog.querySelector('.lx-order-summary');
      const bottomCard = dialog.querySelector('.lx-order-bottom-card');
      if (summary && bottomCard) bottomCard.after(summary);
    };
    mountNationalSubsidy();

    const paymentState = { orderId: id, started:false, remaining: 23 * 60 * 60 + 59 * 60 + 51, timer: 0, width: 0, height: 0, paidOrder: null, paid: false, chatCard: null };
    if (saved?.payment) Object.assign(paymentState, saved.payment, {timer:0,chatCard:null});
    modal.dataset.checkoutOrder = id;
    const applyReadonly = () => {
      modal.dataset.checkoutLocked = String(!!paymentState.started);
      if (!paymentState.started) return;
      dialog.querySelectorAll(readonlyActions).forEach(control => {
        control.dataset.checkoutDisabled = 'true';
        control.style.setProperty('color','#a8a2ab','important');
        control.style.setProperty('border-color','#e4dfe7','important');
        if (control.tagName === 'BUTTON') control.style.setProperty('background','#f1eef3','important');
        control.setAttribute('aria-disabled','true');
        if ('disabled' in control) control.disabled = true;
        else control.setAttribute('tabindex','-1');
      });
      const hint = dialog.querySelector('.lx-buy-direct-detail > span');
      if (hint && hint.textContent !== '优惠信息仅可查看') hint.textContent = '优惠信息仅可查看';
    };
    const snapshot = () => {
      const fulfillment = modal._lxFulfillmentSession;
      const payment = {...paymentState, timer:0, chatCard:null};
      rememberCheckout(id, { ...checkoutRecords[id], product:{...product,_pendingOrderNo:id}, orderState:{...orderState},
        configState:{...configState}, benefitState:{...benefitState}, payment,
        mode:fulfillment?.mode || saved?.mode || 'delivery', storeId:fulfillment?.store?.id || saved?.storeId });
    };
    const ensureMounted = () => {
      const previous = document.querySelector('[data-buy-modal-direct]');
      if (previous && previous !== modal) {previous._lxCleanup?.();previous.remove();}
      if (!modal.isConnected) document.body.appendChild(modal);
      modal.hidden = false;
    };
    const readonlyObserver = new MutationObserver(applyReadonly);
    readonlyObserver.observe(dialog,{childList:true,subtree:true});
    applyReadonly();
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
        type: modal.dataset.fulfillmentMode === 'pickup' || modal.dataset.fulfillmentMode === 'flash' ? modal.dataset.fulfillmentMode : 'normal',
        typeLabel: modal.dataset.fulfillmentMode === 'pickup' ? '到店自提' : modal.dataset.fulfillmentMode === 'flash' ? '门店闪送' : '普通订单',
        fulfillmentMode:modal.dataset.fulfillmentMode || 'delivery',
        fulfillmentStore:modal._lxFulfillmentSession?.store,
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
        status: modal.dataset.fulfillmentMode === 'pickup' ? '待取货' : '待发货',
        address: { name: orderState.recipientName, phone: orderState.recipientPhone, region: orderState.recipientRegion, detail: orderState.recipientDetail },
        recipient: { name: orderState.recipientName, phone: orderState.recipientPhone, address: recipientAddress() },
        shippingAddress: recipientAddress(),
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
      ensureMounted();
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
      paymentState.paid = true;
      snapshot();
      updatePaymentChatCard();
      ensureMounted();
      lockPaymentDialogSize();
      dialog.className = 'lx-buy-direct-dialog lx-payment-dialog';
      dialog.innerHTML = `<button class="lx-buy-direct-close" type="button" aria-label="关闭">×</button><h2 id="lxBuyDirectTitle">支付成功</h2><div class="lx-payment-stage"><span class="lx-payment-success-icon" aria-hidden="true">✓</span><strong class="lx-payment-success-title">订单支付成功</strong><p class="lx-payment-success-meta">订单号：<b>${escapeHtml(paidOrder.orderId)}</b><br>实付：<b>¥${payableAmount().toLocaleString('zh-CN')}</b></p></div><div class="lx-payment-actions"><button type="button" class="primary" data-view-paid-order>查看订单</button></div>`;
    };
    const updatePaymentChatCard = () => {
      document.querySelectorAll('[data-payment-chat-card]').forEach(card => {
        if (card.dataset.paymentChatCard !== id) return;
        card.dataset.paymentStatus = paymentState.paid ? 'paid' : 'pending';
        const title = card.querySelector('.lx-payment-chat-card-title');
        if (title) title.textContent = paymentState.paid ? '支付成功' : '支付信息待确认';
        card.setAttribute('aria-label', `查看${product.name}的支付信息`);
      });
      try {window.__lxSaveConversationNow?.();} catch (_) {}
    };
    const openPaymentFromChatCard = () => {
      ensureMounted();
      if (paymentState.paid) showPaymentSuccess();
      else showPaymentProcessing();
      dialog.querySelector('.lx-buy-direct-close')?.focus();
    };
    const appendPaymentChatCard = () => {
      if (paymentState.chatCard?.isConnected) return;
      const query = `立即支付【${product.name}】`;
      const splitHost = document.querySelector('.lx-p0-messages');
      const host = splitHost || document.querySelector('.lxfd-thread');
      if (!host) { showPaymentProcessing(); return; }
      const fullscreen = host.classList.contains('lxfd-thread');
      if (fullscreen) {
        const shell = host.closest('.lxfd');
        const stage = host.closest('.lxfd-stage');
        const welcome = stage?.querySelector('.lxfd-welcome');
        shell?.style.setProperty('display', 'block', 'important');
        shell?.style.setProperty('visibility', 'visible', 'important');
        welcome?.style.setProperty('display', 'none', 'important');
        host.classList.add('show');
        stage?.classList.add('is-chatting');
        document.body.classList.remove('lxfd-exiting', 'lxfd-split-returning');
        document.body.classList.add('assistant-fullscreen', 'lx-auto-fs');
        document.body.dataset.state = 'chat';
      }
      const userMessage = document.createElement('div');
      userMessage.className = fullscreen ? 'lxfd-msg-user' : 'lx-p0-message msg user';
      userMessage.dataset.lxPaymentQuery = paymentState.orderId;
      if (fullscreen) userMessage.textContent = query;
      else userMessage.innerHTML = `<div class="user-bubble">${escapeHtml(query)}</div>`;
      host.appendChild(userMessage);
      const answerMarkup = `<p>已为你打开【${escapeHtml(product.name)}】的支付页面，请完成支付。</p><button class="answer-cta lx-payment-chat-card" type="button" data-payment-chat-card="${escapeHtml(paymentState.orderId)}"><span class="answer-cta-copy"><span class="answer-cta-title lx-payment-chat-card-title">支付信息待确认</span></span><span class="answer-cta-icon lx-payment-chat-card-icon" aria-hidden="true"></span></button>`;
      let assistantMessage = splitHost ? window.__lxAgentAPI?.addAiMessage?.(answerMarkup) : null;
      if (!assistantMessage) {
        assistantMessage = document.createElement('div');
        assistantMessage.className = fullscreen ? 'lxfd-msg-ai lx-chat-skin' : 'lx-p0-message msg ai lx-chat-skin';
        assistantMessage.innerHTML = fullscreen ? `<div class="lxfd-ai-body">${answerMarkup}</div>` : `<div class="ai-body">${answerMarkup}</div>`;
        host.appendChild(assistantMessage);
      }
      paymentState.chatCard = assistantMessage.querySelector('[data-payment-chat-card]');
      paymentState.chatCard?.addEventListener('click', openPaymentFromChatCard);
      updatePaymentChatCard();
      if (window.__lxState) {
        window.__lxState.queryHistory = Array.isArray(window.__lxState.queryHistory) ? window.__lxState.queryHistory : [];
        window.__lxState.queryHistory.push(query);
      }
      window.__lxSetConversationQuery?.(query);
      host.scrollTop = host.scrollHeight;
      try { window.__lxSaveConversationNow?.(); } catch (_) {}
    };
    const openPaymentPage = () => {
      const paymentUrl = /支付宝|花呗/.test(orderState.payment) ? 'https://www.alipay.com/' : /微信/.test(orderState.payment) ? 'https://pay.weixin.qq.com/' : /京东/.test(orderState.payment) ? 'https://www.jdpay.com/' : 'https://www.alipay.com/';
      window.open(paymentUrl, '_blank', 'noopener,noreferrer');
    };
    const openPaidOrderDetail = () => {
      const paidOrder = persistPaidOrder();
      stopPaymentTimer();
      modal.hidden = true;
      window.dispatchEvent(new Event('lx:orders-updated'));
      if (window.__lxCheckoutOrderDetail) {
        const tabId = 'info:checkout-order:' + id;
        const cardHtml = '<button type="button" class="answer-cta lx-payment-chat-card lx-checkout-order-preview" data-checkout-view-order="' + escapeHtml(id) + '" data-lx-result-id="' + escapeHtml(tabId) + '"><span class="answer-cta-copy"><span class="answer-cta-title">查看订单详情</span></span><span class="answer-cta-icon" aria-hidden="true"></span></button>';
        const result = window.__lxCheckoutOrderDetail(paidOrder, cardHtml);
        if (result) {
          const tab = {id:tabId,kind:'info',label:'订单详情 · '+paidOrder.orderId,
            html:'<div class="lx-orders-poc lx-checkout-detail-surface">' + result.html.replace('data-order-back', 'data-checkout-detail-back').replace('data-order-detail','data-checkout-detail') + '</div>'};
          rememberCheckout(id,{...checkoutRecords[id],detailTab:tab});
          restoreCheckoutDetail(id);
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
        const tab = {id:'info:checkout-order:' + id, kind:'info', label:'订单详情 · '+paidOrder.orderId,
          html:'<div class="lx-orders-poc lx-checkout-detail-surface">' + copy.outerHTML + '</div>'};
        rememberCheckout(id, {...checkoutRecords[id], detailTab:tab});
        const messages = document.querySelectorAll('.lx-p0-messages .msg.ai,.lx-p0-messages .lx-p0-message.ai,.lxfd-thread .lxfd-msg-ai');
        const answer = messages[messages.length-1];
        if (answer && !answer.querySelector('[data-checkout-view-order]')) {
          const card = document.createElement('button');
          card.type='button'; card.className='answer-cta lx-payment-chat-card lx-checkout-order-preview';
          card.dataset.checkoutViewOrder=id;
          card.dataset.lxResultId=tab.id;
          card.innerHTML='<span class="answer-cta-copy"><span class="answer-cta-title">查看订单详情</span></span><span class="answer-cta-icon" aria-hidden="true"></span>';
          (answer.querySelector('.ai-body,.lxfd-ai-body') || answer).appendChild(card);
        }
        restoreCheckoutDetail(id);
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
      const legacyTab = window.__lxState?.tabs?.find(tab => tab.id === 'info:order-detail');
      if (legacyTab) {
        const tab = {...legacyTab,id:'info:checkout-order:'+id,label:'订单详情 · '+paidOrder.orderId};
        rememberCheckout(id,{...checkoutRecords[id],detailTab:tab});
        const host = document.querySelector('.lx-p0-messages');
        if (host) {
          const user = document.createElement('div'); user.className='lx-p0-message msg user';
          user.innerHTML='<div class="user-bubble">查看这笔订单的详细信息</div>';host.appendChild(user);
        }
        window.__lxAgentAPI?.addAiMessage?.('<p>已查询到“'+escapeHtml(product.name)+'”的订单详情，可在右侧查看订单信息。</p><button type="button" class="answer-cta lx-payment-chat-card lx-checkout-order-preview" data-checkout-view-order="'+escapeHtml(id)+'"><span class="answer-cta-copy"><span class="answer-cta-title">查看订单详情</span></span><span class="answer-cta-icon" aria-hidden="true"></span></button>');
        restoreCheckoutDetail(id);
        try {window.__lxSaveConversationNow?.();} catch (_) {}
      }
    };
    const showOrder = () => { ensureMounted(); stopPaymentTimer(); dialog.className = 'lx-buy-direct-dialog'; delete dialog.dataset.pickupSuccess; dialog.innerHTML = orderHtml(); mountNationalSubsidy(); applyReadonly(); };
    const showConfigEdit = () => {
      if (product.sku) return window.__lxPurchaseContext.renderConfig({dialog, product, quantity: configState.quantity, onSelect: selected => {
        product = selected; configState.color = selected.color; configState.size = selected.size; configState.spec = selected.configuration;
        benefitState.couponId = "coupon-none"; benefitState.couponAmount = 0; benefitState.beanPoints = 0; benefitState.beanAmount = 0; benefitState.redPacketAmount = 0;
        showConfigEdit();
      }});
      const options = (name, values, disabled = []) => values.map((value) => `<button class="lx-config-option${configState[name] === value ? ' is-active' : ''}" type="button" data-config-key="${name}" data-config-value="${value}" ${disabled.includes(value) ? 'disabled' : ''}>${value}</button>`).join('');
      dialog.className = 'lx-buy-direct-dialog lx-order-edit-dialog lx-config-dialog';
      dialog.innerHTML = `<header class="lx-order-edit-head"><button class="lx-order-edit-back" type="button" data-config-back aria-label="返回"><img src="/assets/icons/order-modal-back.svg" alt="" aria-hidden="true"></button><h2>修改商品</h2><button class="lx-buy-direct-close" type="button" aria-label="关闭">×</button></header><div class="lx-order-edit-body"><section class="lx-config-section"><h3>颜色</h3><div class="lx-config-options">${options('color',['凝雾灰','深空灰','星空银'])}</div></section><section class="lx-config-section"><h3>尺寸</h3><div class="lx-config-options">${options('size',['11英寸','13英寸','14英寸'],['11英寸'])}</div></section><section class="lx-config-section"><h3>配置</h3><div class="lx-config-options">${options('spec',['8GB+128GB WIFI','8GB+256GB WIFI','16GB+512GB WIFI'],['8GB+128GB WIFI'])}</div></section><div class="lx-config-quantity"><div class="lx-config-quantity-copy"><h3>商品数量</h3><small>最多购买5件</small></div><div class="lx-config-stepper"><button type="button" data-config-minus ${configState.quantity <= 1 ? 'disabled' : ''}>−</button><output data-config-count>${configState.quantity}</output><button type="button" data-config-plus ${configState.quantity >= 5 ? 'disabled' : ''}>＋</button></div></div></div><footer class="lx-order-edit-footer"><button type="button" data-config-save>保存修改</button></footer>`;
      dialog.querySelector('[data-config-back]').addEventListener('click', (event) => { event.stopPropagation(); showOrder(); });
    };
    const showPriceDetail = () => {
      dialog.className = 'lx-buy-direct-dialog lx-buy-sub-dialog';
      dialog.innerHTML = `<button class="lx-buy-direct-close" type="button" aria-label="关闭">×</button><header class="lx-buy-sub-head"><button class="lx-order-edit-back" type="button" data-price-back aria-label="返回"><img src="/assets/icons/order-modal-back.svg" alt="" aria-hidden="true"></button><h2>价格明细</h2></header><div class="lx-buy-price-list"><div class="lx-buy-price-line"><strong>商品金额</strong><span class="amount">¥${((Number(product.originalPrice) || 0) * configState.quantity).toLocaleString('zh-CN')}.00</span><span></span></div><div class="lx-buy-price-line"><strong>运费</strong><span class="amount">＋¥0.00</span><span></span></div><div class="lx-buy-price-line is-clickable" data-open-benefit="coupon"><strong>优惠券</strong><span class="discount">−¥${benefitState.couponAmount.toLocaleString('zh-CN')}.00</span><span class="arrow">›</span></div><div class="lx-buy-price-line is-clickable" data-open-benefit="beans"><strong>乐豆</strong><span class="discount">−¥${benefitState.beanAmount.toLocaleString('zh-CN')}.00</span><span class="arrow">›</span></div><div class="lx-buy-price-line is-clickable" data-open-benefit="redpacket"><strong>限时红包</strong><span class="discount">−¥${benefitState.redPacketAmount.toLocaleString('zh-CN')}.00</span><span class="arrow">›</span></div><div class="lx-buy-price-line"><strong>其他优惠</strong><span class="discount">−¥0.00</span><span></span></div><div class="lx-buy-price-line is-clickable" data-open-coupon-code><strong>优惠码</strong><span class="muted">请输入优惠码</span><span class="arrow">›</span></div></div><div class="lx-buy-sub-footer"><div class="lx-buy-sub-total"><b>¥${payableAmount().toLocaleString('zh-CN')}.00</b><span>节省了：<em>¥${totalDiscount().toLocaleString('zh-CN')}.00</em></span></div><button class="primary" type="button" data-price-confirm>确定</button></div>`;
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
      dialog.innerHTML = `<button class="lx-buy-direct-close" type="button" aria-label="关闭">×</button><header class="lx-buy-sub-head"><button class="lx-order-edit-back" type="button" data-benefit-back aria-label="返回"><img src="/assets/icons/order-modal-back.svg" alt="" aria-hidden="true"></button><h2>优惠券</h2></header><div class="lx-buy-benefit-list">${coupons.map((coupon) => `<button class="lx-buy-coupon-card${benefitState.couponId === coupon.id ? ' is-selected' : ''}" type="button" data-coupon-choice="${coupon.id}" data-coupon-value="${coupon.value}"><span class="lx-buy-coupon-value">${coupon.label.startsWith('¥') ? `¥<b>${coupon.label.slice(1)}</b>` : `<small>${coupon.label}</small>`}</span><span class="lx-buy-coupon-copy"><strong>${coupon.rule}</strong><span>${coupon.date}</span><span>详细说明</span></span><i class="lx-buy-benefit-radio" aria-hidden="true"></i></button>`).join('')}</div><div class="lx-buy-coupon-actions"><button type="button" data-benefit-back>返回</button><button type="button" class="primary" data-benefit-confirm>确认</button></div>`;
    };
    const showWalletBenefit = (type) => {
      const isBeans = type === 'beans';
      const title = isBeans ? '乐豆' : '限时红包';
      const value = isBeans ? benefitState.beanPoints : benefitState.redPacketAmount;
      const discount = isBeans ? benefitState.beanAmount : benefitState.redPacketAmount;
      dialog.className = 'lx-buy-direct-dialog lx-buy-sub-dialog lx-buy-benefit-dialog';
      dialog.innerHTML = `<button class="lx-buy-direct-close" type="button" aria-label="关闭">×</button><header class="lx-buy-sub-head"><button class="lx-order-edit-back" type="button" data-benefit-back aria-label="返回"><img src="/assets/icons/order-modal-back.svg" alt="" aria-hidden="true"></button><h2>${title}</h2></header><div class="lx-buy-wallet-box"><input type="text" inputmode="${isBeans ? 'numeric' : 'decimal'}" value="${value}" data-wallet-input="${type}" aria-label="${title}使用数量"><span data-wallet-discount>已抵 ${discount} 元</span></div><p class="lx-buy-wallet-hint">共 <em>${isBeans ? '5600' : '50'}</em> ${isBeans ? '乐豆' : '元限时红包'}，此单最高可用 <em>${isBeans ? '5600 乐豆，抵 56' : '50'}</em> 元</p><div class="lx-buy-coupon-actions"><button type="button" data-benefit-back>返回</button><button type="button" class="primary" data-wallet-confirm="${type}">确定</button></div>`;
      dialog.querySelector('[data-wallet-input]')?.focus();
    };
    const quickPaymentNames = ['支付宝', '花呗', '微信支付', '京东支付'];
    let lastOnlinePayment = orderState.payment === '对公支付' ? '支付宝' : orderState.payment;
    const updatePaymentFooter = () => {
      const selected = dialog.querySelector('[data-order-selected-payment]');
      if (!selected) return;
      const corporate = orderState.payment === '对公支付';
      selected.classList.toggle('is-corporate', corporate);
      selected.setAttribute('aria-live', 'polite');
      const paymentName = String(orderState.payment).split(' · ')[0];
      selected.innerHTML = corporate
        ? ''
        : [...quickPaymentNames, '花呗分期', '信用卡分期'].includes(paymentName) ? `<span>支付方式：</span><strong>${escapeHtml(paymentName)}</strong>` : '';
    };
    const showOrderEdit = () => {
      const quick = [['支付宝','/assets/icons/payment-alipay-reference.svg'],['花呗','/assets/icons/payment-huabei-official.svg'],['微信支付','/assets/icons/payment-wechat-reference.svg'],['京东支付','/assets/icons/payment-jd-official.svg']];
      const providers = [['huabei','花呗分期','/assets/icons/payment-huabei-official.svg'],['credit','信用卡分期','/assets/icons/payment-credit-card.svg']];
      const plans = [[3,.023],[6,.045],[12,.075]];
      const quickHtml = quick.map(([name, logo]) => `<button class="lx-order-quick${orderState.payment === name ? ' is-active' : ''}" type="button" data-order-payment="${name}"><img class="lx-order-logo" src="${logo}" alt="" aria-hidden="true">${name}</button>`).join('');
      const providersHtml = providers.map(([id, name, logo]) => {
        const planHtml = plans.map(([period, rate]) => { const value = `${name} · ${period}期`; const monthly = Math.round(payableAmount() * (1 + rate) / period).toLocaleString('zh-CN'); return `<button class="lx-order-plan${orderState.payment === value ? ' is-active' : ''}" type="button" data-order-payment="${value}"><strong class="lx-order-plan-term">${period}期</strong><span class="lx-order-plan-cost"><b>¥${monthly}/期</b><small>费率 ${(rate * 100).toFixed(2)}%</small></span><i class="lx-order-radio"></i></button>`; }).join('');
        return `<div><button class="lx-order-provider${orderState.expanded === id ? ' is-expanded' : ''}" type="button" data-order-provider="${id}"><img class="lx-order-logo" src="${logo}" alt="" aria-hidden="true"><b>${name}</b><small>支持 3、6 或 12 期</small><i class="lx-order-chevron"></i></button><div class="lx-order-plan-grid" ${orderState.expanded === id ? '' : 'hidden'}>${planHtml}</div></div>`;
      }).join('');
      const codes = ['CUS-BJ-20260803','CUS-SH-20260718','CUS-GZ-20260626'];
      dialog.className = 'lx-buy-direct-dialog lx-order-edit-dialog';
      const isCorporate = orderState.payment === '对公支付';
      dialog.innerHTML = `<header class="lx-order-edit-head"><button class="lx-order-edit-back" type="button" data-order-back aria-label="返回"><img src="/assets/icons/order-modal-back.svg" alt="" aria-hidden="true"></button><h2>修改订单</h2><button class="lx-buy-direct-close" type="button" aria-label="关闭">×</button></header><div class="lx-order-edit-body"><div class="lx-order-address"><img src="/assets/icons/order-address-location.svg" alt="" aria-hidden="true"><div class="lx-order-address-copy"><strong>${escapeHtml(orderState.recipientName)}　${escapeHtml(orderState.recipientPhone)}</strong><span>${escapeHtml(recipientAddress())}</span></div><button type="button" data-address-edit>修改地址</button></div><section class="lx-order-edit-section"><h3>选择支付方式</h3><div class="lx-order-payment-tabs" role="tablist" aria-label="支付方式"><button class="lx-order-channel${isCorporate ? '' : ' is-active'}" type="button" role="tab" aria-selected="${!isCorporate}" data-order-channel="online">在线支付</button><button class="lx-order-channel${isCorporate ? ' is-active' : ''}" type="button" role="tab" aria-selected="${isCorporate}" data-order-channel="corporate">对公支付</button></div><div data-online-payment ${isCorporate ? 'hidden' : ''}><div class="lx-order-subtitle">快捷支付</div><div class="lx-order-quick-grid">${quickHtml}</div><div class="lx-order-subtitle"><span>分期支付</span><small>*手续费以支付平台实际收取为准</small></div>${providersHtml}</div><div class="lx-order-corporate-panel" data-corporate-payment ${isCorporate ? '' : 'hidden'}>提交订单后将由企业客户经理与您确认付款及增值税专用发票信息。</div></section><section class="lx-order-edit-section lx-order-supplement-section"><h3>订单补充信息</h3><div class="lx-order-supplement-grid"><label class="lx-order-supplement-note" for="lxOrderNote"><span>订单备注</span><input id="lxOrderNote" data-order-note value="${escapeHtml(orderState.note)}"></label><label for="lxOrderCustomer"><span>客户编码</span><div class="lx-order-combobox"><input id="lxOrderCustomer" data-order-customer value="${escapeHtml(orderState.customerCode)}" readonly aria-haspopup="listbox" aria-expanded="false"><div class="lx-order-code-menu" data-order-code-menu role="listbox" hidden>${codes.map((code) => `<button type="button" role="option" data-order-code="${code}">${code}</button>`).join('')}</div></div></label><label><span>发票信息</span><button class="lx-order-invoice" type="button" data-order-invoice><span>${escapeHtml(invoicePreview())}</span><i class="lx-order-chevron"></i></button></label></div></section></div><footer class="lx-order-edit-footer"><span class="lx-order-selected-payment" data-order-selected-payment>当前选择　${escapeHtml(orderState.payment)}</span><button type="button" data-order-save>确认</button></footer>`;
      dialog.classList.add('lx-order-reference');
      dialog.querySelector('.lx-order-edit-section h3').textContent = '支付方式';
      dialog.querySelector('.lx-order-supplement-section h3').textContent = '订单信息';
      dialog.querySelectorAll('.lx-order-edit-body > .lx-order-edit-section > h3').forEach((heading) => {
        heading.style.setProperty('font-size', '18px', 'important');
        heading.style.setProperty('font-weight', '700', 'important');
        heading.style.setProperty('line-height', '26px', 'important');
        heading.style.setProperty('font-family', 'inherit', 'important');
        heading.style.setProperty('letter-spacing', '0', 'important');
        heading.style.setProperty('transform', 'none', 'important');
      });
      const onlinePanel = dialog.querySelector('[data-online-payment]');
      const installmentHeading = onlinePanel.querySelectorAll('.lx-order-subtitle')[1];
      const installments = document.createElement('div');
      installments.className = 'lx-order-installments';
      installments.innerHTML = '<div class="lx-order-installment-heading">分期支付</div>';
      while (installmentHeading.nextElementSibling) installments.appendChild(installmentHeading.nextElementSibling);
      installmentHeading.replaceWith(installments);
      const installmentNote = document.createElement('p');
      installmentNote.className = 'lx-order-installment-note';
      installmentNote.textContent = '*手续费以支付平台实际收取为准';
      installments.querySelector('.lx-order-installment-heading').appendChild(installmentNote);
      const updateSelectedPayment = () => {
        const selected = dialog.querySelector('[data-order-selected-payment]');
        updatePaymentFooter();
      };
      updateSelectedPayment();
      dialog.querySelector('[data-order-back]').addEventListener('click', (event) => { event.stopPropagation(); showOrder(); });
    };
    const showAddressManager = (tab = 'select', editId = '') => {
      const isCreate = tab === 'create';
      dialog.className = 'lx-buy-direct-dialog lx-order-edit-dialog lx-address-dialog';
      const tabs = `<div class="lx-address-tabs" role="tablist" aria-label="地址管理"><button class="${isCreate ? '' : 'is-active'}" type="button" role="tab" aria-selected="${!isCreate}" data-address-tab="select">选择地址</button><button class="${isCreate ? 'is-active' : ''}" type="button" role="tab" aria-selected="${isCreate}" data-address-tab="create">新建地址</button></div>`;
      if (isCreate) {
        const editing = addressBook.find((address) => address.id === editId);
        dialog.innerHTML = `<header class="lx-order-edit-head lx-address-head"><button class="lx-order-edit-back" type="button" data-address-back aria-label="返回修改订单"><img src="/assets/icons/order-modal-back.svg" alt="" aria-hidden="true"></button>${tabs}<button class="lx-buy-direct-close" type="button" aria-label="关闭">×</button></header><div class="lx-order-edit-body lx-address-create-body"><form class="lx-address-form" data-address-form data-address-editing="${escapeHtml(editing?.id || '')}"><label for="lxAddressName">姓名：</label><input id="lxAddressName" name="name" value="${escapeHtml(editing?.name || '')}" placeholder="请输入姓名" autocomplete="name"><label for="lxAddressPhone">手机：</label><input id="lxAddressPhone" name="phone" value="${escapeHtml(editing?.phone || '')}" placeholder="请输入手机号" inputmode="tel" autocomplete="tel"><label for="lxAddressRegion">省市：</label><select id="lxAddressRegion" name="region"><option value="">请选择省/市/区/街道</option><option value="北京市海淀区中关村街道"${editing?.region === '北京市海淀区中关村街道' ? ' selected' : ''}>北京市 / 海淀区 / 中关村街道</option><option value="北京市海淀区中关村软件园2期"${editing?.region === '北京市海淀区中关村软件园2期' ? ' selected' : ''}>北京市 / 海淀区 / 中关村软件园2期</option><option value="上海市浦东新区张江镇"${editing?.region === '上海市浦东新区张江镇' ? ' selected' : ''}>上海市 / 浦东新区 / 张江镇</option><option value="广东省深圳市南山区粤海街道"${editing?.region === '广东省深圳市南山区粤海街道' ? ' selected' : ''}>广东省 / 深圳市 / 南山区 / 粤海街道</option></select><label for="lxAddressDetail">地址：</label><textarea id="lxAddressDetail" name="detail" placeholder="请输入详细地址">${escapeHtml(editing?.detail || '')}</textarea><label class="lx-address-default"><input type="checkbox" name="isDefault" ${editing?.isDefault ? 'checked' : ''}><span>设为默认地址</span></label></form></div><footer class="lx-order-edit-footer lx-address-footer"><button type="button" data-address-save>保存</button></footer>`;
        dialog.querySelector('#lxAddressName')?.focus();
        return;
      }
      const cards = addressBook.map((address) => `<article class="lx-address-card${orderState.addressId === address.id ? ' is-selected' : ''}" data-address-card="${address.id}"><button class="lx-address-card-main" type="button" data-address-select="${address.id}"><strong>${address.isDefault ? '<em>默认</em>' : ''}<span>${escapeHtml(address.name)}</span><span>${escapeHtml(address.phone)}</span></strong><small>${escapeHtml(address.region + address.detail)}</small></button><button class="lx-address-card-edit" type="button" data-address-card-edit="${address.id}" aria-label="编辑${escapeHtml(address.name)}的地址">✎</button></article>`).join('');
      dialog.innerHTML = `<header class="lx-order-edit-head lx-address-head"><button class="lx-order-edit-back" type="button" data-address-back aria-label="返回修改订单"><img src="/assets/icons/order-modal-back.svg" alt="" aria-hidden="true"></button>${tabs}<button class="lx-buy-direct-close" type="button" aria-label="关闭">×</button></header><div class="lx-order-edit-body lx-address-select-body"><div class="lx-address-grid">${cards}</div></div><footer class="lx-order-edit-footer lx-address-footer"><button type="button" data-address-confirm>确定</button></footer>`;
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
    const showInvoiceNotice = () => {
      syncInvoiceDraft();
      dialog.className = 'lx-buy-direct-dialog lx-order-edit-dialog lx-invoice-dialog lx-invoice-notice-view';
      dialog.innerHTML = `<header class="lx-order-edit-head"><button class="lx-order-edit-back" type="button" data-invoice-notice-back aria-label="返回发票信息"><img src="/assets/icons/order-modal-back.svg" alt="" aria-hidden="true"></button><h2>发票须知</h2><button class="lx-buy-direct-close" type="button" aria-label="关闭">×</button></header><div class="lx-order-edit-body lx-invoice-notice-body"><section><h3>开具发票说明</h3><ol><li>联想在线商城所售商品，每张订单都会开具“商品专用发票”。</li><li>发票金额为订单金额，含配送费。</li><li>发票内容默认为订购的商品明细，不支持修改。</li><li>使用优惠券支付的金额不开具发票；积分商品不提供发票。</li><li>发票抬头不能为空，可选择个人或公司名称，请仔细核对发票类型和公司名称。</li><li>联想实行货票同行；不能同行时按收货地址另行寄送。</li><li>目前只有联想（上海）电子科技有限公司能开具电子票。</li><li>第三方卖家商品或服务的发票由卖家按实际情况开具。</li></ol><h3>电子发票常见问题</h3><ol><li>电子发票与纸质发票具有同等法律效力。</li><li>订单确认收货后开具电子发票。</li><li>电子发票与纸质普票法律效力相同，不建议更换。</li><li>增值税专用发票资质在“我的商城—设置—发票抬头管理”维护并审核通过。</li><li>全电发票是票面信息全面数字化、全国统一赋码的电子发票。</li><li>增值税专用发票（数电票）预计在确认收货后 5 个工作日内开具，可在订单详情下载。</li><li>联想自营商品已全面实现增值税专用发票（数电票）。</li></ol></section></div><footer class="lx-order-edit-footer lx-invoice-notice-footer"><button type="button" data-invoice-notice-close>我知道了</button></footer>`;
      dialog.querySelector('[data-invoice-notice-close]')?.focus();
    };
    const showInvoiceEdit = () => {
      const options = [{ label: '普通发票-个人', value: '普通发票-个人' },{ label: '普通发票-单位', value: '普通发票-单位' },{ label: '增值税专票', value: '增值税专票' }];
      const isVat = orderState.invoiceDraft === '增值税专票';
      const isPersonal = orderState.invoiceDraft === '普通发票-个人';
      const fields = isVat
        ? `<div class="lx-invoice-form"><label for="lxInvoiceCompany">单位名称</label><input id="lxInvoiceCompany" value="联想（北京）有限公司" readonly><label for="lxInvoiceTaxId">纳税人识别号</label><input id="lxInvoiceTaxId" data-invoice-field="invoiceTaxNo" value="9111010870000458B" readonly><label for="lxInvoiceAddress">注册地址</label><input id="lxInvoiceAddress" data-invoice-field="invoiceAddress" value="${escapeHtml(orderState.invoiceAddress)}"><label for="lxInvoicePhone">注册电话</label><input id="lxInvoicePhone" data-invoice-field="invoiceRegisteredPhone" value="${escapeHtml(orderState.invoiceRegisteredPhone)}"><label for="lxInvoiceBank">开户银行</label><input id="lxInvoiceBank" data-invoice-field="invoiceBank" value="${escapeHtml(orderState.invoiceBank)}"><label for="lxInvoiceAccount">银行账号</label><input id="lxInvoiceAccount" data-invoice-field="invoiceBankAccount" value="${escapeHtml(orderState.invoiceBankAccount)}"><label for="lxInvoiceRemark">备注</label><textarea id="lxInvoiceRemark" data-invoice-field="invoiceRemark" placeholder="请填写备注">${escapeHtml(orderState.invoiceRemark)}</textarea></div><div class="lx-invoice-delay-field"><label>延时开票</label><button class="lx-invoice-delay-trigger" type="button" data-invoice-delay-open><span class="lx-invoice-delay-value${orderState.invoiceDelayDate ? ' has-value' : ''}">${escapeHtml(formatInvoiceDelayDate(orderState.invoiceDelayDate))}</span><i class="lx-invoice-delay-chevron" aria-hidden="true"></i></button><p class="lx-invoice-delay-help">选择后将在该日期起进入开票处理；请在此日期前确保增票资质已审核通过。未选择则按原开票时效处理。</p></div>`
        : `<div class="lx-invoice-form"><label for="lxInvoiceTitle">发票抬头</label><input id="lxInvoiceTitle" data-invoice-field="invoiceTitle" value="${isPersonal ? '个人' : '联想（北京）有限公司'}">${isPersonal ? '' : '<label for="lxInvoiceTaxId">纳税人识别号</label><input id="lxInvoiceTaxId" data-invoice-field="invoiceTaxNo" value="123123123123123">'}<label for="lxInvoiceRecipientPhone">收票人手机</label><input id="lxInvoiceRecipientPhone" data-invoice-field="invoicePhone" value="${escapeHtml(orderState.invoicePhone)}"><label for="lxInvoiceEmail">收票人邮箱</label><input id="lxInvoiceEmail" data-invoice-field="invoiceEmail" value="${escapeHtml(orderState.invoiceEmail)}">${isPersonal ? '' : `<label for="lxInvoiceRemark">备注</label><textarea id="lxInvoiceRemark" data-invoice-field="invoiceRemark" placeholder="请填写备注">${escapeHtml(orderState.invoiceRemark)}</textarea>`}</div>`;
      dialog.className = 'lx-buy-direct-dialog lx-order-edit-dialog lx-invoice-dialog';
      dialog.innerHTML = `<header class="lx-order-edit-head"><button class="lx-order-edit-back" type="button" data-invoice-back aria-label="返回"><img src="/assets/icons/order-modal-back.svg" alt="" aria-hidden="true"></button><h2>发票信息</h2><button class="lx-buy-direct-close" type="button" aria-label="关闭">×</button></header><div class="lx-order-edit-body"><section class="lx-order-edit-section"><div class="lx-invoice-type-row"><div class="lx-order-channel-grid lx-invoice-type-grid">${options.map((option) => `<button class="lx-order-channel${orderState.invoiceDraft === option.value ? ' is-active' : ''}" type="button" data-invoice-option="${option.value}"><strong>${option.label}</strong></button>`).join('')}</div><button class="lx-invoice-notice-entry" type="button" data-invoice-notice-open>发票须知</button></div></section><p class="lx-invoice-tip">*自营商品的增值税专用发票（数电票）会在确认收货后预计 5 个工作日内开具。</p>${fields}</div><footer class="lx-order-edit-footer"><button type="button" data-invoice-save>保存</button></footer>`;
      if (!isVat) dialog.querySelector('.lx-invoice-tip').remove();
      dialog.querySelector('[data-invoice-back]').addEventListener('click', (event) => { event.stopPropagation(); showOrderEdit(); });
    };
    modal.addEventListener('pointerdown', (event) => {
      const target = event.target;
      if (target.closest('[data-address-back]')) {
        event.preventDefault();
        event.stopImmediatePropagation();
        showOrderEdit();
      } else if (target.closest('[data-order-back],[data-config-back]')) {
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
      if (target.closest('[data-invoice-notice-close],[data-invoice-notice-back]')) return showInvoiceEdit();
      if (target.closest('.lx-buy-direct-close')) { stopPaymentTimer(); if (paymentState.chatCard) { modal.hidden = true; return; } return modal.remove(); }
      if (target.closest('.lx-buy-direct-mask')) return;
      if (target.closest('[data-pay-now]')) { if (paymentState.started) return; paymentState.started=true; snapshot(); applyReadonly(); openPaymentPage(); appendPaymentChatCard(); showPaymentProcessing(); return; }
      if (target.closest('[data-go-pay]')) return openPaymentPage();
      if (target.closest('[data-confirm-payment]')) return showPaymentSuccess();
      if (target.closest('[data-view-paid-order]')) return openPaidOrderDetail();
      if (target.closest('[data-price-detail]')) return showPriceDetail();
      if (target.closest('[data-benefit-info]')) return showToast('预订单支付前，优惠仍可用于其他商品;支付发票成功将锁定至本单，取消订单后自动释放', 6000);
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
      if (target.closest('[data-invoice-notice-open]')) return showInvoiceNotice();
      if (target.closest('[data-invoice-back]')) return showOrderEdit();
      const invoiceOption = target.closest('[data-invoice-option]');
      if (invoiceOption) { syncInvoiceDraft(); orderState.invoiceDraft = invoiceOption.dataset.invoiceOption; return showInvoiceEdit(); }
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
        syncInvoiceDraft(); orderState.invoice = orderState.invoiceDraft;
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
          const providerName = provider.dataset.orderProvider === 'huabei' ? '花呗分期' : '信用卡分期';
          if (!String(orderState.payment).startsWith(providerName)) orderState.payment = providerName;
          lastOnlinePayment = orderState.payment;
          dialog.querySelectorAll('[data-order-payment]').forEach((button) => button.classList.toggle('is-active', button.dataset.orderPayment === orderState.payment));
          updatePaymentFooter();
        }
        return;
      }
      const payment = target.closest('[data-order-payment]');
      if (payment) {
        orderState.payment = payment.dataset.orderPayment;
        lastOnlinePayment = orderState.payment;
        dialog.querySelectorAll('[data-order-payment]').forEach((button) => button.classList.toggle('is-active', button === payment));
        const selectedPayment = dialog.querySelector('[data-order-selected-payment]');
        updatePaymentFooter();
        return;
      }
      const channel = target.closest('[data-order-channel]');
      if (channel) {
        dialog.querySelectorAll('[data-order-channel]').forEach((button) => button.classList.toggle('is-active', button === channel));
        const online = dialog.querySelector('[data-online-payment]');
        const corporate = dialog.querySelector('[data-corporate-payment]');
        online.hidden = channel.dataset.orderChannel === 'corporate';
        corporate.hidden = !online.hidden;
        dialog.querySelectorAll('[data-order-channel]').forEach((button) => button.setAttribute('aria-selected', String(button === channel)));
        if (online.hidden) {
          if (orderState.payment !== '对公支付') lastOnlinePayment = orderState.payment;
          orderState.payment = '对公支付';
        } else {
          orderState.payment = lastOnlinePayment;
          dialog.querySelectorAll('[data-order-payment]').forEach((button) => button.classList.toggle('is-active', button.dataset.orderPayment === orderState.payment));
        }
        const selectedPayment = dialog.querySelector('[data-order-selected-payment]');
        updatePaymentFooter();
        return;
      }
      const customerInput = target.closest('[data-order-customer]');
      if (customerInput) { const menu = dialog.querySelector('[data-order-code-menu]'); menu.hidden = !menu.hidden; customerInput.setAttribute('aria-expanded', String(!menu.hidden)); return; }
      if (target.closest('[data-claim-national-subsidy]')) { showToast('国补资格将在结算时核验，价格以实际支付为准'); return; }
      if (target.closest('[data-address-back]')) return showOrderEdit();
      if (target.closest('[data-address-edit]')) return showAddressManager('select');
      const addressTab = target.closest('[data-address-tab]');
      if (addressTab) return showAddressManager(addressTab.dataset.addressTab);
      const addressCardEdit = target.closest('[data-address-card-edit]');
      if (addressCardEdit) return showAddressManager('create', addressCardEdit.dataset.addressCardEdit);
      const addressChoice = target.closest('[data-address-select]');
      if (addressChoice) {
        orderState.addressId = addressChoice.dataset.addressSelect;
        dialog.querySelectorAll('[data-address-card]').forEach((card) => card.classList.toggle('is-selected', card.dataset.addressCard === orderState.addressId));
        return;
      }
      if (target.closest('[data-address-confirm]')) {
        applyAddress(selectedAddress());
        showOrderEdit();
        showToast('收货地址已更新');
        return;
      }
      if (target.closest('[data-address-save]')) {
        const form = dialog.querySelector('[data-address-form]');
        const name = form?.elements.name?.value.trim() || '';
        const phone = form?.elements.phone?.value.trim() || '';
        const region = form?.elements.region?.value.trim() || '';
        const detail = form?.elements.detail?.value.trim() || '';
        if (!name) return form?.elements.name?.focus();
        if (!/^1\d{10}$/.test(phone)) { showToast('请输入正确的11位手机号'); return form?.elements.phone?.focus(); }
        if (!region) return form?.elements.region?.focus();
        if (!detail) return form?.elements.detail?.focus();
        const editingId = form.dataset.addressEditing;
        let saved = addressBook.find((address) => address.id === editingId);
        if (!saved) { saved = { id: `address-${Date.now()}` }; addressBook.push(saved); }
        if (form.elements.isDefault.checked) addressBook.forEach((address) => { address.isDefault = false; });
        Object.assign(saved, { name, phone, region, detail, isDefault: form.elements.isDefault.checked });
        orderState.addressId = saved.id;
        applyAddress(saved);
        showAddressManager('select');
        showToast(editingId ? '地址已保存' : '新地址已保存');
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
    checkoutSessions.set(id, {modal, openOrder:showOrder, openPayment:openPaymentFromChatCard});
    const pending = window.__lxState?.pendingOrderProduct;
    const pendingCards = Array.from(document.querySelectorAll('[data-lx-result-id="modal:pending-payment"]'));
    const pendingCard = pendingCards.filter(card => !card.dataset.checkoutOrderId).pop();
    if (pendingCard && String(pending?._pendingOrderNo || '') === id) pendingCard.dataset.checkoutOrderId=id;
    snapshot();
    modal.querySelector('.primary')?.focus();
    return modal;
  };

  window.__lxOpenUnifiedDiscountOrder = product => {
    try { return openOrderModal({...window.__lxPurchaseContext.normalize(product), _pendingOrderNo:product._pendingOrderNo || product._checkoutId, originalPrice: Number(product.originalPrice || product.original_price || product.price), discount: Math.max(0, Number(product.discount) || 0)}); } catch (error) { showToast(error.message); }
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
    try { const product = await visibleDetailProduct(button); if (request === purchaseRequest && button.isConnected && window.__lxPurchaseContext.targetSku(button, window.__lxState) === product.sku) {
      const state=window.__lxState;
      if (!state || !window.__lxBridge?.sendChat) throw new Error('下单服务尚未就绪，请重试');
      if (state.sending || state._buyFlowRunning) return;
      state._pendingDiscountOrderProduct=product;
      state._unifiedOrderSourceProduct=product;
      await window.__lxBridge.sendChat(`我要购买${product.name}，请帮我自动领取所有可用优惠并生成待支付订单`);
    } }
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
      if (previewMode === 'edit' || previewMode === 'address' || previewMode === 'address-new') document.querySelector('[data-edit-order]')?.click();
      if (previewMode === 'address' || previewMode === 'address-new') document.querySelector('[data-address-edit]')?.click();
      if (previewMode === 'address-new') document.querySelector('[data-address-tab="create"]')?.click();
      if (previewMode === 'invoice') { document.querySelector('[data-edit-order]')?.click(); document.querySelector('[data-order-invoice]')?.click(); }
      if (previewMode === 'invoice-unit') { document.querySelector('[data-edit-order]')?.click(); document.querySelector('[data-order-invoice]')?.click(); document.querySelector('[data-invoice-option="普通发票-单位"]')?.click(); }
      if (previewMode === 'invoice-vat') { document.querySelector('[data-edit-order]')?.click(); document.querySelector('[data-order-invoice]')?.click(); document.querySelector('[data-invoice-option="增值税专票"]')?.click(); }
      if (previewMode === 'invoice-notice') { document.querySelector('[data-edit-order]')?.click(); document.querySelector('[data-order-invoice]')?.click(); document.querySelector('[data-invoice-notice-open]')?.click(); }
      if (previewMode === 'config') document.querySelector('[data-edit-config]')?.click();
      if (previewMode === 'payment') document.querySelector('[data-pay-now]')?.click();
      if (previewMode === 'success') { document.querySelector('[data-pay-now]')?.click(); document.querySelector('[data-confirm-payment]')?.click(); }
    };
    document.readyState === 'loading' ? document.addEventListener('DOMContentLoaded', showPreview, { once: true }) : showPreview();
  }
})();

/* v60-fulfillment-subsidy-checkout-20260904 */
(function () {
  'use strict';
  var originalOpen = window.__lxOpenUnifiedDiscountOrder;
  if (typeof originalOpen !== 'function' || window.__lxFulfillmentCheckoutV60) return;

  var stores = [
    { id: 'xibeiwang', name: '联想官方体验店（西北旺万象汇店）', address: '北京市海淀区马连洼街道德政路16号院万象汇A区 F4 405', hours: '9:30-21:00', phone: '13426251637', distance: '200m' },
    { id: 'zhongguancun', name: '联想来酷智生活（中关村店）', address: '北京市海淀区中关村大街19号新中关购物中心 B1', hours: '10:00-21:30', phone: '010 6602 6688', distance: '2.6km' },
    { id: 'wukesong', name: '联想官方体验店（五棵松华熙店）', address: '北京市海淀区复兴路69号华熙LIVE南区 1F', hours: '10:00-22:00', phone: '010 5971 6888', distance: '4.1km' }
  ];
  var orderAddress = '北京市海淀区中关村软件园2期北京联想总部东区E1';
  var sessions = new WeakMap();

  function esc(value) {
    return String(value == null ? '' : value).replace(/[&<>"']/g, function (char) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char];
    });
  }
  function shopIcon() {
    return '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 9h16l-1.2-5H5.2L4 9Zm1 0v10h14V9M8 19v-6h8v6" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round"/><path d="M3.5 9c0 1.4 1.1 2.5 2.5 2.5S8.5 10.4 8.5 9c0 1.4 1.1 2.5 2.5 2.5s2.5-1.1 2.5-2.5c0 1.4 1.1 2.5 2.5 2.5s2.5-1.1 2.5-2.5" fill="none" stroke="currentColor" stroke-width="1.7"/></svg>';
  }
  function locationIcon() {
    return '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 21s7-6.1 7-12A7 7 0 1 0 5 9c0 5.9 7 12 7 12Z" fill="none" stroke="currentColor" stroke-width="1.7"/><circle cx="12" cy="9" r="2.4" fill="currentColor"/></svg>';
  }
  function qrMarkup() {
    return '<div class="lx-demo-qr" aria-label="模拟二维码"><svg viewBox="0 0 84 84" role="img"><rect width="84" height="84" fill="#fff"/><g fill="#000"><path d="M3 3h24v24H3zm4 4v16h16V7zm4 4h8v8h-8zM57 3h24v24H57zm4 4v16h16V7zm4 4h8v8h-8zM3 57h24v24H3zm4 4v16h16V61zm4 4h8v8h-8z" fill-rule="evenodd"/><path d="M33 4h6v6h-6zm9 0h5v12h-5zm-9 15h6v6h-6zm11 2h7v7h-7zm-13 10h7v6h-7zm11 0h6v6h-6zm10 0h8v6h-8zm12 0h6v8h-6zm10 0h7v6h-7zM30 41h7v7h-7zm11-2h6v13h-6zm10 2h6v6h-6zm10 0h13v6H61zm-28 15h7v6h-7zm10 0h6v13h-6zm10-5h7v7h-7zm11 0h6v13h-6zm10-1h7v7h-7zM31 67h7v7h-7zm11 5h8v8h-8zm11-10h6v18h-6zm10 5h7v6h-7zm11-6h7v19h-7z"/></g></svg></div>';
  }

  if (!document.querySelector('[data-fulfillment-checkout-v60-style]')) {
    var style = document.createElement('style');
    style.dataset.fulfillmentCheckoutV60Style = 'true';
    style.textContent = '.lx-fulfillment-suggestion{margin:10px 0 0;color:#353037;font-size:14px;line-height:1.8}.lx-fulfillment-link{display:inline;padding:0 2px;border:0;border-bottom:1px solid currentColor;background:transparent;color:#681057;font:inherit;font-weight:700;line-height:inherit;cursor:pointer}.lx-fulfillment-link:hover,.lx-fulfillment-link:focus{color:#a51f42}[data-buy-modal-direct] .lx-buy-direct-dialog:not(.lx-buy-sub-dialog):not(.lx-order-edit-dialog) .lx-order-product-card.has-store-kicker{grid-template-areas:"store store store" "visual heading action" "visual specs specs"!important;grid-template-rows:16px 48px 16px!important;height:100px!important;min-height:100px!important;row-gap:1px!important;padding-block:9px!important;overflow:hidden!important}[data-buy-modal-direct] .lx-buy-direct-dialog:not(.lx-buy-sub-dialog):not(.lx-order-edit-dialog) .lx-order-product-card.has-store-kicker .lx-buy-direct-product>img{width:48px!important;height:48px!important;align-self:start!important}[data-buy-modal-direct] .lx-buy-direct-dialog:not(.lx-buy-sub-dialog):not(.lx-order-edit-dialog) .lx-order-product-card.has-store-kicker .lx-buy-direct-product-copy{align-self:start!important;min-height:48px!important}[data-buy-modal-direct] .lx-buy-direct-dialog:not(.lx-buy-sub-dialog):not(.lx-order-edit-dialog) .lx-order-product-card.has-store-kicker .lx-buy-direct-product-spec{align-self:start!important;min-height:16px!important}.lx-order-store-kicker{grid-area:store;align-self:start;display:flex;align-items:center;gap:6px;min-height:16px;margin:0 0 2px;color:#681057;font-size:11px;font-weight:600}.lx-order-store-kicker svg{width:15px;height:15px}.lx-fulfillment-address{display:grid;gap:10px;padding:2px 0}.lx-fulfillment-address-row{display:grid;grid-template-columns:22px minmax(0,1fr) auto;gap:10px;align-items:start}.lx-fulfillment-address-row svg{width:20px;height:20px;color:#575258}.lx-fulfillment-address-copy{display:grid;gap:3px;min-width:0}.lx-fulfillment-address-copy strong{font-size:13px;font-weight:600;line-height:19px}.lx-fulfillment-address-copy span{overflow:hidden;color:#77717d;font-size:11px;line-height:17px;text-overflow:ellipsis;white-space:nowrap}.lx-fulfillment-address-row button{padding:1px 0;border:0;border-bottom:1px solid currentColor;background:transparent;color:#77717d;font:inherit;cursor:pointer}.lx-fulfillment-pickup-address{color:#77717d;font-size:11px;line-height:17px}.lx-fulfillment-contact{display:flex;gap:14px;padding-left:0;font-size:12px}.lx-fulfillment-contact b{font-weight:600}.lx-fulfillment-dialog{padding:0!important;display:flex!important;flex-direction:column!important;overflow:hidden!important}.lx-fulfillment-head{height:64px;flex:none;display:flex;align-items:center;padding:0 26px}.lx-fulfillment-head h2{margin:0!important;background:none!important;color:#19171b!important;-webkit-text-fill-color:initial!important;font-size:20px!important}.lx-fulfillment-head h2:before{content:none!important}.lx-fulfillment-body{flex:1;min-height:0;padding:12px 26px 18px;overflow:auto}.lx-fulfillment-form{display:grid;grid-template-columns:70px 1fr 55px 1fr;gap:12px;align-items:center;margin-bottom:20px}.lx-fulfillment-form label{font-weight:600}.lx-fulfillment-form input{height:42px;box-sizing:border-box;padding:0 12px;border:1px solid #e2ddeb;border-radius:4px;background:#fbf9fc;font:inherit}.lx-fulfillment-section-title{margin:0 0 12px;font-size:14px}.lx-fulfillment-location{display:flex;align-items:center;gap:10px;min-height:52px;box-sizing:border-box;margin-bottom:14px;padding:0 14px;border:1px solid #ebe5ed;border-radius:4px;background:#fbf9fc;color:#681057}.lx-fulfillment-location svg{width:22px;flex:0 0 22px}.lx-fulfillment-location span{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.lx-fulfillment-location b{margin-left:auto}.lx-fulfillment-store-list{display:grid;gap:10px}.lx-fulfillment-store{position:relative;display:grid;gap:7px;min-height:104px;box-sizing:border-box;padding:17px 96px 15px 18px;border:1px solid #ebe5ed;border-radius:8px;background:#fcfbfd;color:#272329;text-align:left;cursor:pointer}.lx-fulfillment-store.is-active{border-color:#681057;box-shadow:inset 0 0 0 1px #b8252e}.lx-fulfillment-store strong{font-size:14px}.lx-fulfillment-store span{color:#77717d}.lx-fulfillment-store small{color:#5e5861}.lx-fulfillment-store em{position:absolute;right:18px;bottom:22px;color:#681057;font-size:13px;font-style:normal;font-weight:600}.lx-fulfillment-footer{height:70px;flex:none;display:flex;align-items:center;justify-content:flex-end;padding:0 26px;background:#fff}.lx-fulfillment-footer button{width:164px;height:44px;border:0;border-radius:100px;background:linear-gradient(90deg,#4d144a,#b8252e);color:#fff;font-size:14px;font-weight:600;cursor:pointer}.lx-subsidy-dialog .lx-fulfillment-body{padding-top:4px}.lx-subsidy-step{margin:0 0 16px}.lx-subsidy-step h3{margin:0 0 6px;font-size:14px}.lx-subsidy-step p{margin:0;color:#5f5863;line-height:1.7}.lx-subsidy-outline{height:34px;margin-top:8px;padding:0 18px;border:1px solid #681057;border-radius:100px;background:#fff;color:#681057;cursor:pointer}.lx-subsidy-qr-row{display:flex;align-items:center;gap:16px}.lx-subsidy-qr-copy{color:#5f5863;line-height:1.65}.lx-subsidy-code{display:grid;grid-template-columns:1fr auto;width:min(460px,100%);height:42px;border:1px solid #e3dce6;border-radius:100px;overflow:hidden}.lx-subsidy-code input{min-width:0;padding:0 16px;border:0;outline:0}.lx-subsidy-code button{margin:4px;padding:0 16px;border:0;border-radius:100px;background:#eadce6;color:#fff;cursor:pointer}.lx-demo-qr{width:86px;height:86px;flex:0 0 86px;padding:6px;box-sizing:border-box;border:1px solid #e6e1e8;background:#fff}.lx-demo-qr svg{width:100%;height:100%;display:block}.lx-realname-notice{margin:0 0 24px;padding:10px 12px;border-radius:6px;background:#fff0e9;color:#b46048}.lx-realname-grid{display:grid;grid-template-columns:55px 1fr 55px 1fr;gap:20px 12px;align-items:center}.lx-realname-grid label:before{content:"*";margin-right:4px;color:#cf2c2c}.lx-realname-grid input{height:40px;min-width:0;box-sizing:border-box;padding:0 12px;border:1px solid #e3dce6;background:#fbf9fc}.lx-realname-code{display:grid;grid-template-columns:1fr auto}.lx-realname-code button{border:0;border-left:1px solid #e3dce6;background:#fff;color:#681057}.lx-realname-consent{display:flex;align-items:center;gap:7px;margin-top:auto;color:#5f5863}.lx-realname-consent input{accent-color:#681057}.lx-realname-actions{display:flex;gap:16px}.lx-realname-actions .secondary{border:1px solid #681057;background:#fff;color:#681057}.lx-pickup-success{height:100%;display:flex;flex-direction:column;padding:12px 4px 0}.lx-pickup-success-title{display:flex;align-items:center;gap:10px;margin:0 0 14px;font-size:21px}.lx-pickup-success-title i{width:34px;height:34px;display:grid;place-items:center;border-radius:50%;background:#50d5a0;color:#fff;font-style:normal}.lx-pickup-success-copy{margin:0;font-size:15px;line-height:1.8}.lx-pickup-success-copy b{font-weight:700}.lx-pickup-code{display:grid;gap:10px;margin:22px 0 16px;padding:18px;border-radius:16px;background:#fcfbfd}.lx-pickup-code-head{display:flex;align-items:center;gap:8px;font-size:17px}.lx-pickup-code-head span{padding:2px 10px;border-radius:100px;background:#faedf8;color:#681057;font-size:12px}.lx-pickup-code .lx-demo-qr{justify-self:center;width:122px;height:122px}.lx-pickup-code strong{justify-self:center;font-size:20px;letter-spacing:3px}.lx-pickup-success .lx-payment-actions{margin-top:auto}@media(max-width:620px){.lx-fulfillment-form,.lx-realname-grid{grid-template-columns:72px 1fr}.lx-fulfillment-store{padding-right:72px}.lx-fulfillment-head,.lx-fulfillment-footer{padding-right:18px;padding-left:18px}.lx-fulfillment-body{padding-right:18px;padding-left:18px}}';
    document.head.appendChild(style);
  }

  if (!document.querySelector('[data-checkout-answer-v69-style]')) {
    var answerStyle = document.createElement('style');
    answerStyle.dataset.checkoutAnswerV69Style = 'true';
    answerStyle.textContent = '.lx-checkout-benefit-list{display:grid;gap:10px;margin:14px 0 4px}.lx-checkout-benefit-row{display:grid;grid-template-columns:18px minmax(0,1fr) auto;gap:8px;align-items:center;color:#2f2a31;font-size:13px;line-height:20px}.lx-checkout-benefit-check{display:grid;width:16px;height:16px;place-items:center;border-radius:50%;background:#e6f7ef;color:#19a365}.lx-checkout-benefit-check svg{display:block;width:12px;height:12px}.lx-checkout-benefit-name{font-weight:600}.lx-checkout-benefit-amount{color:#ff3030;font-variant-numeric:tabular-nums}.lx-fulfillment-stream.is-streaming:after{content:"";display:inline-block;width:2px;height:14px;margin-left:3px;vertical-align:-2px;background:#681057;animation:lx-cursor-blink .72s steps(1) infinite}';
    document.head.appendChild(answerStyle);
  }

  function normalizeProduct(product) {
    var copy = Object.assign({}, product);
    copy.image_url = copy.image_url || copy.image || '';
    copy.originalPrice = Number(copy.originalPrice || copy.original_price || copy.price);
    copy.discount = Math.max(0, Number(copy.discount) || 0);
    return copy;
  }
  function latestAssistantBody() {
    var messages = Array.prototype.slice.call(document.querySelectorAll('.lx-p0-messages .lx-p0-message.ai, .lx-p0-messages .msg.ai, .lxfd-thread .lxfd-msg-ai'));
    var message = messages[messages.length - 1];
    return message && (message.querySelector('.ai-body,.lxfd-ai-body') || message);
  }
  function benefitItems(product) {
    var fallback = [
      { label: '国补焕新专享券', amount: 2550 },
      { label: '商品平台满减券', amount: 500 },
      { label: '联想会员折扣券', amount: 300 }
    ];
    var source = Array.isArray(product && product.benefits) ? product.benefits.slice(0, 3) : [];
    return fallback.map(function (item, index) {
      var current = source[index] || item;
      var label = index === 0 || /国家补贴|国补/.test(String(current.label || '')) ? '国补焕新专享券' : String(current.label || item.label);
      return { label: label, amount: Math.abs(Number(current.amount) || item.amount) };
    });
  }
  function benefitMarkup(product) {
    var check = window.__lxApprovedIcon ? window.__lxApprovedIcon('global-check') : '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="m3.2 8.1 2.7 2.7 6.5-6.3" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>';
    return '<div class="lx-checkout-benefit-list" aria-label="已使用优惠">' + benefitItems(product).map(function (item) {
      return '<div class="lx-checkout-benefit-row"><span class="lx-checkout-benefit-check" aria-hidden="true">' + check + '</span><span class="lx-checkout-benefit-name">' + esc(item.label) + '</span><span class="lx-checkout-benefit-amount">-¥' + item.amount.toLocaleString('zh-CN') + '</span></div>';
    }).join('') + '</div>';
  }
  function purchaseCopyMarkup() {
    return '<p>已为你自动领取<strong>3项可用优惠</strong>，共节省<strong>¥3,350</strong>。商品、优惠与收货信息已核对，请在<strong>待支付订单</strong>中确认后继续。查询到您附近门店存在此商品的库存，您是否想要今日就可取到商品呢，您可 <button class="lx-fulfillment-link" type="button" data-open-fulfillment="pickup">到店自提</button> <button class="lx-fulfillment-link" type="button" data-open-fulfillment="flash">门店闪送</button> 进行下单哦~</p>';
  }
  function normalizePurchaseAnswer(body, product) {
    if (!body) return;
    var copy = body.querySelector('.lx-payment-confirm-copy');
    if (!copy) return;
    copy.dataset.fulfillmentSuggestion = String(product.sku || product.name || 'product');
    copy.classList.add('lx-fulfillment-suggestion');
    copy.innerHTML = purchaseCopyMarkup();
    copy._lxProduct = product;
    body.querySelectorAll('.lx-fulfillment-suggestion').forEach(function (node) {
      if (node !== copy) node.remove();
    });
    var oldBenefits = body.querySelector('.lx-discount-detail-list');
    if (oldBenefits) oldBenefits.remove();
    var existingBenefits = body.querySelector('.lx-checkout-benefit-list');
    if (existingBenefits) existingBenefits.remove();
    copy.insertAdjacentHTML('afterend', benefitMarkup(product));
    var card = body.querySelector('.answer-cta,[data-answer-card],.lx-answer-card');
    var benefits = body.querySelector('.lx-checkout-benefit-list');
    if (card && benefits) benefits.insertAdjacentElement('afterend', card);
  }
  function appendSuggestion(product, attempt) {
    attempt = attempt || 0;
    var body = latestAssistantBody();
    if (!body) {
      if (attempt < 10) window.setTimeout(function () { appendSuggestion(product, attempt + 1); }, 160);
      return;
    }
    normalizePurchaseAnswer(body, product);
    var thread = body.closest('.lx-p0-messages,.lxfd-thread');
    if (thread) thread.scrollTop = thread.scrollHeight;
  }
  function appendFulfillmentChat(product, mode) {
    var modeLabel = mode === 'pickup' ? '到店自提' : '门店闪送';
    var orderId = 'LX' + Date.now() + Math.random().toString(36).slice(2, 6);
    var originalPrice = Number(product.originalPrice || product.original_price || product.price) || 0;
    var discount = Number(product.discount) || Math.max(0, originalPrice - Number(product.price || originalPrice));
    var pending = Object.assign({}, product, {
      _pendingOrderNo: orderId,
      originalPrice: originalPrice,
      original_price: originalPrice,
      discount: discount,
      price: Math.max(0, originalPrice - discount),
      benefits: Array.isArray(product.benefits) ? product.benefits : []
    });
    var currentBody = latestAssistantBody();
    var host = currentBody && currentBody.closest('.lx-p0-messages,.lxfd-thread');
    host = host || document.querySelector('.lx-p0-messages') || document.querySelector('.lxfd-thread');
    if (!host) return;
    var fullscreen = host.classList.contains('lxfd-thread');
    var query = '购买' + String(product.name || '这件商品') + '，' + modeLabel;
    var user = document.createElement('div');
    user.className = fullscreen ? 'lxfd-msg-user' : 'lx-p0-message msg user';
    if (fullscreen) user.textContent = query;
    else user.innerHTML = '<div class="user-bubble">' + esc(query) + '</div>';
    host.appendChild(user);
    var card = '<button class="answer-cta lx-answer-page lx-auth-answer-card lx-edu-auth-reco lx-payment-confirm-reco" type="button" data-lx-recommended-modal="pending-payment" data-open-payment-confirm data-lx-order-id="' + esc(orderId) + '" data-lx-result-id="modal:pending-payment" aria-label="打开待支付订单弹窗" aria-pressed="false"><span class="answer-cta-title">待支付订单</span><span class="answer-cta-icon" aria-hidden="true">' + (window.__lxApprovedIcon ? window.__lxApprovedIcon('global-next') : '') + '</span></button>';
    var answerText = '已为你按' + modeLabel + '方式重新生成【' + String(product.name || '该商品') + '】的待支付订单，请确认门店、收货信息和优惠后继续。';
    var answerShell = '<div class="lx-payment-confirm-copy"><p class="lx-fulfillment-stream is-streaming"></p></div>';
    var assistantMessage = !fullscreen && window.__lxAgentAPI && window.__lxAgentAPI.addAiMessage ? window.__lxAgentAPI.addAiMessage(answerShell) : null;
    if (!assistantMessage) {
      assistantMessage = document.createElement('div');
      assistantMessage.className = fullscreen ? 'lxfd-msg-ai lx-chat-skin' : 'lx-p0-message msg ai lx-chat-skin';
      assistantMessage.innerHTML = fullscreen ? '<div class="lxfd-ai-body">' + answerShell + '</div>' : '<div class="ai-body">' + answerShell + '</div>';
      host.appendChild(assistantMessage);
    }
    if (window.__lxState) {
      window.__lxState.pendingOrderProduct = pending;
      window.__lxState.queryHistory = Array.isArray(window.__lxState.queryHistory) ? window.__lxState.queryHistory : [];
      window.__lxState.queryHistory.push(query);
    }
    window.__lxSetConversationQuery && window.__lxSetConversationQuery(query);
    host.scrollTop = host.scrollHeight;
    var answerBody = assistantMessage.querySelector('.ai-body,.lxfd-ai-body') || assistantMessage;
    var stream = answerBody.querySelector('.lx-fulfillment-stream');
    var index = 0;
    var finish = function () {
      stream.classList.remove('is-streaming');
      stream.innerHTML = '已为你按<strong>' + modeLabel + '</strong>方式重新生成【' + esc(product.name || '该商品') + '】的待支付订单，请确认门店、收货信息和优惠后继续。';
      answerBody.insertAdjacentHTML('beforeend', benefitMarkup(pending) + card);
      if (window.__lxState) window.__lxState.pendingOrderProduct = pending;
      host.scrollTop = host.scrollHeight;
      try { window.__lxSaveConversationNow && window.__lxSaveConversationNow(); } catch (ignore) {}
      window.requestAnimationFrame(function () {
        openWithMode(pending, { mode: mode, skipSuggestion: true });
      });
    };
    var write = function () {
      if (!stream || !stream.isConnected) return;
      index += 1;
      stream.textContent = answerText.slice(0, index);
      host.scrollTop = host.scrollHeight;
      if (index >= answerText.length) return finish();
      window.setTimeout(write, 16);
    };
    window.setTimeout(write, 220);
  }
  function shippingMarkup(session) {
    var store = session.store;
    if (session.mode === 'pickup') {
      return '<div class="lx-fulfillment-address"><div class="lx-fulfillment-address-row">' + shopIcon() + '<span class="lx-fulfillment-address-copy"><strong>' + esc(store.name) + '</strong></span><button type="button" data-select-fulfillment-store>选择门店</button></div><div class="lx-fulfillment-pickup-address">' + esc(store.address) + '</div><div class="lx-fulfillment-contact"><b>联小想</b><span>13028280000</span></div></div>';
    }
    if (session.mode === 'flash') {
      return '<div class="lx-fulfillment-address"><div class="lx-fulfillment-address-row">' + shopIcon() + '<span class="lx-fulfillment-address-copy"><strong>' + esc(store.name) + '</strong></span><button type="button" data-select-fulfillment-store>选择门店</button></div><div class="lx-fulfillment-address-row">' + locationIcon() + '<span class="lx-fulfillment-address-copy"><strong>联小想　13028280000</strong><span>' + orderAddress + '</span></span></div></div>';
    }
    return '';
  }
  function decorateOrder(session) {
    var dialog = session.modal.querySelector('.lx-buy-direct-dialog');
    var shipping = dialog && dialog.querySelector('.lx-order-shipping');
    if (!shipping || session.mode === 'delivery') return;
    if (shipping.dataset.fulfillmentMode !== session.mode) {
      shipping.innerHTML = shippingMarkup(session);
      shipping.dataset.fulfillmentMode = session.mode;
    }
    if (session.mode === 'flash') {
      var card = dialog.querySelector('.lx-order-product-card');
      if (card && !card.querySelector('.lx-order-store-kicker')) {
        card.classList.add('has-store-kicker');
        card.insertAdjacentHTML('afterbegin', '<span class="lx-order-store-kicker">' + shopIcon() + esc(session.store.name) + '</span>');
      }
    }
  }
  function rememberSize(session) {
    if (session.size) return;
    var dialog = session.modal.querySelector('.lx-buy-direct-dialog');
    var rect = dialog && dialog.getBoundingClientRect();
    if (rect && rect.width && rect.height) session.size = { width: Math.round(rect.width), height: Math.round(rect.height) };
  }
  function applySize(dialog, session) {
    rememberSize(session);
    if (!session.size) return;
    dialog.style.width = session.size.width + 'px';
    dialog.style.height = session.size.height + 'px';
  }
  function renderCustom(session, className, html) {
    var dialog = session.modal.querySelector('.lx-buy-direct-dialog');
    applySize(dialog, session);
    dialog.className = 'lx-buy-direct-dialog lx-fulfillment-dialog ' + className;
    dialog.innerHTML = html;
  }
  function rerenderOrder(session) {
    return window.__lxOpenUnifiedDiscountOrder(session.product, { mode: session.mode, storeId: session.store.id, skipSuggestion: true, size: session.size });
  }
  function storeCards(session) {
    return stores.map(function (store) {
      return '<button class="lx-fulfillment-store' + (session.draftStoreId === store.id ? ' is-active' : '') + '" type="button" data-fulfillment-store="' + store.id + '"><strong>' + esc(store.name) + '</strong><span>' + esc(store.address) + '</span><small>营业时间　' + store.hours + '　　电话　' + store.phone + '</small><em>距离 ' + store.distance + '</em></button>';
    }).join('');
  }
  function showStoreSelector(session) {
    session.draftStoreId = session.store.id;
    var contact = session.mode === 'pickup' ? '<div class="lx-fulfillment-form"><label for="lxPickupName">收货人</label><input id="lxPickupName" value="联小想"><label for="lxPickupPhone">电话</label><input id="lxPickupPhone" value="13028280000"></div><h3 class="lx-fulfillment-section-title">选择地址</h3>' : '';
    renderCustom(session, 'lx-store-selector-dialog', '<header class="lx-fulfillment-head"><h2>选择门店</h2><button class="lx-buy-direct-close" type="button" aria-label="关闭">×</button></header><div class="lx-fulfillment-body">' + contact + '<div class="lx-fulfillment-location">' + locationIcon() + '<span>位置：' + orderAddress + '</span><b>›</b></div><div class="lx-fulfillment-store-list">' + storeCards(session) + '</div></div><footer class="lx-fulfillment-footer"><button type="button" data-fulfillment-store-confirm>确定</button></footer>');
  }
  function subsidyGuide(session) {
    var authText = session.authenticated ? '实名认证已完成，可继续领取国家补贴。' : '检测您还未实名认证，请先完成实名可使用国家补贴优惠';
    var authButton = session.authenticated ? '已完成认证' : '实名认证';
    var html = '<header class="lx-fulfillment-head"><h2>领取国家补贴</h2><button class="lx-buy-direct-close" type="button" aria-label="关闭">×</button></header><div class="lx-fulfillment-body">';
    html += '<section class="lx-subsidy-step"><h3>第一步：实名认证</h3><p>' + authText + '</p><button class="lx-subsidy-outline" type="button" data-national-realname>' + authButton + '</button></section>';
    html += '<section class="lx-subsidy-step"><h3>第二步：去“京通微信小程序”领取/复制国补资格码</h3><div class="lx-subsidy-qr-row">' + qrMarkup() + '<div class="lx-subsidy-qr-copy">进入“京通小程序”<br>搜索“北京政府补贴”或点击“首页京通码”<br>点击“以旧换新资格码”<br>完成认证并领取</div></div></section>';
    html += '<section class="lx-subsidy-step"><h3>第三步：粘贴国补资格码享补贴</h3><div class="lx-subsidy-code"><input type="text" data-subsidy-code placeholder="请输入资格码"><button type="button" data-subsidy-bind>绑定资格码</button></div></section>';
    html += '<section class="lx-subsidy-step"><h3>第四步：回联想下单，下单时选择符合条件的发票自动抵扣</h3></section></div><footer class="lx-fulfillment-footer"><button type="button" data-subsidy-back>返回订单</button></footer>';
    renderCustom(session, 'lx-subsidy-dialog', html);
  }
  function showRealName(session) {
    var html = '<header class="lx-fulfillment-head"><h2>实名认证</h2><button class="lx-buy-direct-close" type="button" aria-label="关闭">×</button></header>';
    html += '<div class="lx-fulfillment-body" style="display:flex;flex-direction:column"><p class="lx-realname-notice">实名认证需获取您的姓名、银行卡、手机号、证件信息（支持中国身份证）</p>';
    html += '<div class="lx-realname-grid"><label for="lxRealName">姓名</label><input id="lxRealName" placeholder="请输入姓名"><label for="lxRealId">证件</label><input id="lxRealId" placeholder="请输入证件号"><label for="lxRealPhone">手机</label><input id="lxRealPhone" placeholder="请输入手机号"><label for="lxRealCode">验证码</label><span class="lx-realname-code"><input id="lxRealCode" placeholder="请输入验证码"><button type="button" data-auth-code>获取验证码</button></span></div>';
    html += '<label class="lx-realname-consent"><input type="checkbox" data-realname-consent>我同意《实名认证协议》《联想网站隐私政策》</label><small style="margin-top:6px;color:#a39da6">请填写您的真实个人信息，一经填写不支持修改。禁止通过内部额度/福利，将产品进行二次销售从中牟利。</small></div>';
    html += '<footer class="lx-fulfillment-footer lx-realname-actions"><button class="secondary" type="button" data-realname-back>返回</button><button type="button" data-realname-next>下一步</button></footer>';
    renderCustom(session, 'lx-realname-dialog', html);
  }
  function pickupSuccess(session) {
    return '<button class="lx-buy-direct-close" type="button" aria-label="关闭">×</button><div class="lx-pickup-success"><h3 class="lx-pickup-success-title"><i>✓</i>支付成功</h3><p class="lx-pickup-success-copy">已成功购买' + esc(session.product.name) + '，您可前往<b>' + esc(session.store.name) + '</b>凭自提码进行核销取货。</p><div class="lx-pickup-code"><div class="lx-pickup-code-head">自提码 <span>到店出示</span></div>' + qrMarkup() + '<strong>ABCDEFJ</strong></div><div class="lx-payment-actions"><button type="button" class="primary" data-view-paid-order>查看订单</button></div></div>';
  }
  function customizeSuccess(session, dialog) {
    var title = dialog.querySelector('#lxBuyDirectTitle');
    if (!title || title.textContent.trim() !== '支付成功') return;
    var newest = window.__lxState && window.__lxState.orders && window.__lxState.orders.find(function(order){return String(order.orderId) === String(session.modal.dataset.checkoutOrder);});
    if (newest && session.mode !== 'delivery') {
      newest.type = session.mode;
      newest.typeLabel = session.mode === 'pickup' ? '到店自提' : '门店闪送';
      newest.status = session.mode === 'pickup' ? '待取货' : '待发货';
      newest.fulfillmentMode = session.mode;
      newest.fulfillmentStore = session.store;
      if (session.mode === 'pickup') newest.pickupStore = session.store;
      try { localStorage.setItem('lexiang.orders.v1', JSON.stringify(window.__lxState.orders)); } catch (ignore) {}
    }
    if (session.mode !== 'pickup' || dialog.dataset.pickupSuccess === 'true') return;
    dialog.dataset.pickupSuccess = 'true';
    dialog.innerHTML = pickupSuccess(session);
  }
  function observe(session) {
    var dialog = session.modal.querySelector('.lx-buy-direct-dialog');
    var observer = new MutationObserver(function () {
      decorateOrder(session);
      customizeSuccess(session, dialog);
    });
    observer.observe(dialog, { childList: true, subtree: true });
    session.observer = observer;
  }
  function openWithMode(product, options) {
    options = options || {};
    var normalized = normalizeProduct(product);
    var reopened = originalOpen(normalized);
    var modal = document.querySelector('[data-buy-modal-direct]');
    if (!modal) return;
    var priorSession = sessions.get(modal);
    if (priorSession) {
      if (options.mode && modal.dataset.checkoutLocked !== 'true') {
        priorSession.mode = options.mode;
        priorSession.store = stores.filter(function(store){return store.id === options.storeId;})[0] || priorSession.store;
        modal.dataset.fulfillmentMode = priorSession.mode;
        priorSession.size = null;
        var priorDialog = modal.querySelector('.lx-buy-direct-dialog');
        var modeHeight = Math.min(priorSession.mode === 'delivery' ? 560 : 600, window.innerHeight - 32);
        priorDialog.style.setProperty('height', modeHeight + 'px', 'important');
        priorDialog.style.setProperty('min-height', modeHeight + 'px', 'important');
      }
      decorateOrder(priorSession);
      return modal;
    }
    var mode = options.mode === 'pickup' || options.mode === 'flash' ? options.mode : 'delivery';
    var selectedStore = stores.filter(function (store) { return store.id === options.storeId; })[0] || stores[0];
    var session = { modal: modal, product: normalized, mode: mode, store: selectedStore, size: options.size || null, authenticated: false, draftStoreId: '' };
    sessions.set(modal, session);
    modal._lxFulfillmentSession = session;
    modal.dataset.fulfillmentMode = mode;
    if (mode === 'pickup' || mode === 'flash') {
      var fulfillmentDialog = modal.querySelector('.lx-buy-direct-dialog');
      if (fulfillmentDialog) {
        var fulfillmentHeight = Math.min(600, Math.max(0, window.innerHeight - 32));
        fulfillmentDialog.style.setProperty('height', fulfillmentHeight + 'px', 'important');
        fulfillmentDialog.style.setProperty('min-height', fulfillmentHeight + 'px', 'important');
      }
    }
    window.requestAnimationFrame(function () { rememberSize(session); decorateOrder(session); });
    observe(session);
    if (!options.skipSuggestion && mode === 'delivery') appendSuggestion(normalized);
    return modal;
  }

  window.__lxOpenUnifiedDiscountOrder = openWithMode;
  window.__lxFulfillmentCheckoutV60 = Object.freeze({ stores: stores, open: openWithMode });

  document.addEventListener('click', function (event) {
    var link = event.target.closest && event.target.closest('[data-open-fulfillment]');
    if (link) {
      var suggestion = link.closest('[data-fulfillment-suggestion]');
      if (!suggestion || !suggestion._lxProduct) return;
      event.preventDefault();
      event.stopImmediatePropagation();
      appendFulfillmentChat(suggestion._lxProduct, link.dataset.openFulfillment);
      return;
    }
    var modal = event.target.closest && event.target.closest('[data-buy-modal-direct]');
    var session = modal && sessions.get(modal);
    if (!session) return;
    var action = event.target.closest('[data-select-fulfillment-store],[data-fulfillment-store],[data-fulfillment-store-confirm],[data-claim-national-subsidy],[data-national-realname],[data-subsidy-back],[data-realname-back],[data-realname-next],[data-auth-code],[data-subsidy-bind]');
    if (!action) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    if (action.matches('[data-select-fulfillment-store]')) return showStoreSelector(session);
    if (action.matches('[data-fulfillment-store]')) {
      session.draftStoreId = action.dataset.fulfillmentStore;
      Array.prototype.forEach.call(modal.querySelectorAll('[data-fulfillment-store]'), function (card) { card.classList.toggle('is-active', card === action); });
      return;
    }
    if (action.matches('[data-fulfillment-store-confirm]')) {
      session.store = stores.filter(function (store) { return store.id === session.draftStoreId; })[0] || session.store;
      return rerenderOrder(session);
    }
    if (action.matches('[data-claim-national-subsidy]')) return subsidyGuide(session);
    if (action.matches('[data-national-realname]')) return showRealName(session);
    if (action.matches('[data-subsidy-back]')) return rerenderOrder(session);
    if (action.matches('[data-realname-back]')) return subsidyGuide(session);
    if (action.matches('[data-auth-code]')) {
      action.textContent = '60s后重试';
      action.disabled = true;
      window.setTimeout(function () {
        if (action.isConnected) { action.textContent = '获取验证码'; action.disabled = false; }
      }, 3000);
      return;
    }
    if (action.matches('[data-realname-next]')) {
      if (!modal.querySelector('[data-realname-consent]').checked) {
        window.alert('请先阅读并同意实名认证协议及隐私政策');
        return;
      }
      session.authenticated = true;
      return subsidyGuide(session);
    }
    if (action.matches('[data-subsidy-bind]')) {
      var input = modal.querySelector('[data-subsidy-code]');
      if (!input.value.trim()) { input.focus(); return; }
      action.textContent = '已绑定';
      action.disabled = true;
    }
  }, true);

  var previewMode = new URLSearchParams(location.search).get('showOrder');
  if (['pickup', 'flash', 'pickup-store', 'flash-store', 'subsidy', 'realname', 'pickup-success'].indexOf(previewMode) >= 0) {
    window.setTimeout(function () {
      var mode = previewMode.indexOf('flash') === 0 ? 'flash' : previewMode === 'subsidy' || previewMode === 'realname' ? 'delivery' : 'pickup';
      var modal = openWithMode({ sku: 'preview-y7000p', name: '联想拯救者Y7000P 2025 16英寸电竞游戏笔记本', price: 9799, originalPrice: 9999, discount: 200, image_url: '/assets/product-placeholder.svg', series: '拯救者', size: '16英寸', configuration: '16G/1T SSD', configurationLabel: '16G/1T SSD' }, { mode: mode, skipSuggestion: true });
      var session = modal && sessions.get(modal);
      if (!session) return;
      if (previewMode.indexOf('-store') > 0) showStoreSelector(session);
      if (previewMode === 'subsidy') subsidyGuide(session);
      if (previewMode === 'realname') showRealName(session);
      if (previewMode === 'pickup-success') {
        var dialog = modal.querySelector('.lx-buy-direct-dialog');
        applySize(dialog, session);
        dialog.className = 'lx-buy-direct-dialog lx-payment-dialog';
        dialog.innerHTML = pickupSuccess(session);
      }
    }, 50);
  }
})();

(()=>{
 if(window.__lxAddressDialogV142)return;window.__lxAddressDialogV142=true;
 const data=window.__lxAddressRegionsV142||[];
 function init(){document.querySelectorAll('#lxAddrRegion').forEach(input=>{
  if(input.dataset.cascadeReady)return;input.dataset.cascadeReady='true';
  const modal=input.closest('.lx-p0-modal');if(!modal)return;modal.classList.add('lx-address-standard');
  const field=input.closest('label');input.type='hidden';field.querySelectorAll('svg').forEach(n=>n.remove());field.classList.add('lx-address-regions');
  const selects=['省 / 直辖市','市','区 / 县'].map(label=>{const s=document.createElement('select');s.setAttribute('aria-label',label);s.required=true;field.appendChild(s);return s});
  function fill(select,items,label){select.replaceChildren(new Option('请选择'+label,''));items.forEach(item=>select.add(new Option(item.name,item.code)));select.disabled=!items.length;}
  fill(selects[0],data,'省');fill(selects[1],[],'市');fill(selects[2],[],'区');
  function cities(){return data.find(p=>p.code===selects[0].value)?.children||[]}
  function districts(){return cities().find(c=>c.code===selects[1].value)?.children||[]}
  function sync(){input.value=selects.every(s=>s.value)?selects.map(s=>s.selectedOptions[0].text).join(' / '):'';input.dispatchEvent(new Event('input',{bubbles:true}));}
  selects[0].addEventListener('change',()=>{fill(selects[1],cities(),'市');fill(selects[2],[],'区');sync()});
  selects[1].addEventListener('change',()=>{fill(selects[2],districts(),'区');sync()});selects[2].addEventListener('change',sync);
  [['lxAddrName','收货人姓名'],['lxAddrPhone','手机号'],['lxAddrRegion','所在地区'],['lxAddrDetail','详细地址']].forEach(([id,label])=>{
   const el=modal.querySelector('#'+id),box=el.closest('label'),wrapper=document.createElement('div');wrapper.className='lx-address-control';box.before(wrapper);const title=document.createElement('span');title.className='lx-address-label';title.textContent='* '+label;wrapper.append(title,box);
   el.setAttribute('aria-label',label);if(id!=='lxAddrRegion')el.required=true;
   box.querySelectorAll('svg').forEach(n=>n.remove());
   if(id==='lxAddrPhone'){el.type='tel';el.inputMode='tel';el.pattern='1[3-9][0-9]{9}';el.maxLength=11;}
  });
  const save=modal.querySelector('[data-addr-save]');if(save){const footer=document.createElement('div');footer.className='lx-address-footer';save.before(footer);const cancel=document.createElement('button');cancel.type='button';cancel.textContent='取消';cancel.className='lx-address-cancel';cancel.onclick=()=>modal.querySelector('.x.lx-p0-close')?.click();footer.append(cancel,save);}
 });}
 document.addEventListener('click',event=>{const save=event.target.closest('[data-addr-save]');if(!save)return;const modal=save.closest('.lx-address-standard');if(!modal)return;
  for(const el of modal.querySelectorAll('#lxAddrName,#lxAddrPhone,.lx-address-regions select,#lxAddrDetail')){
   if(!el.value.trim()||!el.checkValidity()){event.preventDefault();event.stopImmediatePropagation();el.disabled=false;el.reportValidity();el.focus();return;}
  }
 },true);
 new MutationObserver(init).observe(document.body,{childList:true,subtree:true});init();
})();

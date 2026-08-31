const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict');
const results=[];
for(const name of ['home','shop-chat','b-chat','biz-chat']){
 const s=fs.readFileSync(path.join(__dirname,'../../public/leaip0/assets/frontend/js/core',name+'.ref-sync-v140.js'),'utf8');
 const start=s.indexOf('function Mt('),end=s.indexOf('function It(',start);assert.ok(start>=0&&end>start);
 const marker='data-open-payment-confirm data-lx-order-id=';const at=s.indexOf(marker);assert.ok(at>0);
 const cardStart=s.lastIndexOf('`<button',at),cardEnd=s.indexOf('`);',at);assert.ok(cardStart>0&&cardEnd>at);
 const confirmStart=s.indexOf('function(){const t=d.pendingOrderProduct;if(!t)return E("待支付订单已失效，请重新领取优惠");const e=');
 const confirmEnd=s.indexOf('}()),t.target.closest',confirmStart);assert.ok(confirmStart>0&&confirmEnd>confirmStart);
 const state={};let modal='';
 const ctx={d:state,window:{__lxState:state,__lxApprovedIcon:()=>''},Ht:t=>({...t}),wt:()=>({claimed:[],discount:0,finalPrice:100}),Dt:()=>[{name:'测试地址'}],P:()=>{},v:x=>String(x),j:(title,body)=>modal=body,E:m=>{throw Error(m)},Pt:()=> '演示方式',r:{},Ie:(r,html)=>r.html=html};
 vm.createContext(ctx);vm.runInContext(s.slice(start,end),ctx);vm.runInContext('Mt({name:"测试商品",price:100,sku:"TEST"})',ctx);const id=state.pendingOrderProduct._pendingOrderNo;assert.ok(id);
 vm.runInContext('Ie(r,'+s.slice(cardStart,cardEnd+1)+')',ctx);assert.ok(ctx.r.html.includes('data-lx-order-id="'+id+'"'));
 vm.runInContext('('+s.slice(confirmStart,confirmEnd+1)+')()',ctx);assert.equal(state.pendingOrderProduct._pendingOrderNo,id);assert.ok(modal.includes(id));
 vm.runInContext('('+s.slice(confirmStart,confirmEnd+1)+')()',ctx);assert.equal(state.pendingOrderProduct._pendingOrderNo,id);
 results.push({channel:name,cardAndPaymentIdStable:true});
}
fs.writeFileSync(path.join(__dirname,'runtime-test-result.json'),JSON.stringify(results,null,2));console.log(results);

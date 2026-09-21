#!/usr/bin/env node
/* One-time source migration. Existing bytes are read only from an isolated,
 * version-pinned baseline; this tool never deploys or writes to that baseline. */
const fs=require('fs'),path=require('path'),crypto=require('crypto'),vm=require('vm');
const {pathToFileURL}=require('url');
const baseline=path.resolve(process.argv[2]||'../p0-architecture-20260921-154140');
const target=path.resolve('.'), publicRoot=path.join(target,'public/leaip0');
const {extract}=require('./extract-business.cjs');
const {packageStyles}=require('./package-styles.cjs');
const {extractInlineStyles}=require('./extract-inline-styles.cjs');
const sha=s=>crypto.createHash('sha256').update(s).digest('hex').slice(0,16);
const buildVersion=sha(['migrate.cjs','runtime.js','extract-business.cjs','package-styles.cjs','extract-inline-styles.cjs'].map(f=>fs.readFileSync(path.join(__dirname,f),'utf8')).join('\n'));
const moduleUrl=(owner,type)=>'/modules/'+owner+'/index.'+type+'?p0v='+buildVersion;
const read=p=>fs.readFileSync(path.join(baseline,p),'utf8');
const registry=JSON.parse(read('scripts/p0-package-architecture/registry.json'));
const modules=[...registry.shared,...registry.pages,...registry.modals].map(m=>({...m,owner:m.css.replace('scripts/p0-package-architecture/','').replace('/index.css','')}));
const owners=Object.fromEntries(modules.map(m=>[m.owner,{sources:[],factories:[]}]));
const manifest=JSON.parse(read('public/leaip0/assets/frontend/bundles/p0-home-manifest.json'));
const groups=new Map(manifest.groups.map(g=>[g.url.split('?')[0],g]));
const allFiles=d=>fs.readdirSync(d,{withFileTypes:true}).flatMap(f=>f.isDirectory()?allFiles(path.join(d,f.name)):[path.join(d,f.name)]);
const baselinePublic=path.join(baseline,'public/leaip0');
const files=allFiles(baselinePublic).filter(p=>/\.(js|css)$/.test(p));
const slots={},units=new Map(),cssEntries=[],cssSlots={},urlMap=new Map(),extraction=[];
function ownerFor(url){
 const s=url.toLowerCase();
 const rules=[[/notification-toast|toast-v/,'modals/toast'],[/workplace/,'modals/workplace-auth'],[/enterprise-auth|enterprise-member-auth/,'modals/enterprise-auth'],[/education-auth/,'modals/education-auth'],[/lead-modal|lead-card/,'modals/lead-form'],[/history/,'modals/conversation-history'],[/auth-dialog|order-login/,'modals/login'],[/reco-match/,'modals/product-match'],[/device-bind/,'modals/device-bind'],[/scanpay|payment/,'modals/payment-processing'],[/buy-modal|order-modal/,'modals/order-payment-confirm'],[/address-dialog|address-regions/,'modals/order-edit'],[/order-center|order-demo|paid-order|view-orders|hide-legacy-demo-orders/,'pages/order-list'],[/member-coupon/,'pages/coupon-center'],[/member-asset-ledger|member-asset-rules/,'pages/ledou-center'],[/member-device/,'pages/device-list'],[/member-|member\./,'pages/member-center'],[/store-|store\./,'pages/store-detail'],[/product-detail|product-review|product-specs|review-media/,'pages/product-detail'],[/product-floor|product-card|product-intent|product-list|reco-names|recruitment|gaming-query/,'pages/product-list'],[/compare-column|comparison-display/,'pages/product-compare'],[/solution-result|manufacturing-solution/,'pages/solution-list'],[/industry-solutions|whitepaper/,'pages/solution-detail'],[/app-lxfd|app-agent|app-intent|app-conv|generation|composer|followup|thinking|answer-actions|query-result|assistant|stream-view|conversation-location|tabbar|tab-reorder|prompt-menu/,'shared/agent-content'],[/pages\/brand|brand-|app-brand/,'pages/brand-home'],[/pages\/biz|biz-chat|biz-core|enterprise-banner|biz-hero/,'pages/enterprise-home'],[/pages\/smb|b-chat|smb-core|smb-hero|smb-/,'pages/smb-home'],[/pages\/shop|shop-chat|shop-core|scene-banner|channel-home/,'pages/consumer-home'],[/pages\/home|home\.solution|home\.ref|home-core|\/app\.js/,'pages/home']];
 return rules.find(([re])=>re.test(s))?.[1]||'shared/common';
}
function addUnit(source,label,owner){
 const id='u'+sha(source);
 if(!units.has(id)){units.set(id,{id,source,label,owner});owners[owner].sources.push(id);}
 return id;
}
function newUrl(key,type){
 return moduleUrl(ownerFor(key),type)+'#p0-'+(type==='js'?'script':'style')+'='+encodeURIComponent(key);
}
for(const file of files){
 const key='/'+path.relative(baselinePublic,file).split(path.sep).join('/');
 const type=path.extname(file).slice(1);urlMap.set(key,newUrl(key,type));
 if(type==='js'){
  const g=groups.get(key);
  slots[key]=(g?g.files:[path.relative(baseline,file)]).map(f=>addUnit(read(f),f,ownerFor(f)));
 }else cssEntries.push({id:key,url:key,source:fs.readFileSync(file,'utf8'),defaultOwner:ownerFor(key)});
}
function replacement(s){
 // URLs are resolved from known files, never guessed from similarly named assets.
 for(const [old,next] of [...urlMap].sort((a,b)=>b[0].length-a[0].length)){
  const aliases=[old];
  if(old.startsWith('/assets/frontend/'))aliases.push(old.slice(7),'..'+old.slice(7));
  for(const a of aliases){
   const escaped=a.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
   const re=new RegExp('(?<![a-zA-Z0-9_:/.-])'+escaped+'(?:\\?[^\\s"\'`<>\\\\)]*)?','g');
   s=s.replace(re,()=>next);
  }
 }
 return s;
}
(async()=>{
 let parser;
 for(const candidate of ['parse5',process.env.P0_PARSE5_PATH,path.resolve('../education-home-result-20260916/tooling/node_modules/parse5/dist/index.js')].filter(Boolean)){try{parser=require.resolve(candidate);break}catch{}}
 if(!parser)throw Error('Install migration dependencies in scripts/p0-modules or set P0_PARSE5_PATH.');
 const parse5=await import(pathToFileURL(parser).href);
 const htmlFiles=allFiles(baselinePublic).filter(f=>f.endsWith('.html'));
 const htmlPlans=[];
 for(const file of htmlFiles){
  const relative=path.relative(baselinePublic,file),html=fs.readFileSync(file,'utf8'),doc=parse5.parse(html,{sourceCodeLocationInfo:true}),changes=[];
  const primary=['index.html','shop-chat/index.html','b-chat/index.html','biz-chat/index.html','brand/index.html'].includes(relative);
  if(!primary&&!/scene-banner-v154\/scene-banner\.html$/.test(relative)){fs.writeFileSync(path.join(publicRoot,relative),html);continue;}
  const pageOwner=ownerFor('/pages/'+({'index.html':'home','shop-chat/index.html':'shop','b-chat/index.html':'smb','biz-chat/index.html':'biz','brand/index.html':'brand'}[relative]||'shared')+'/inline.js');
  let headEnd;
  function visit(node){
   const loc=node.sourceCodeLocation;
   if(node.tagName==='head'&&loc?.startTag)headEnd=loc.startTag.endOffset;
   if(primary&&loc&&node.tagName==='script'){
    const attrs=Object.fromEntries(node.attrs.map(a=>[a.name,a.value]));
    const executable=!attrs.type||/^(text|application)\/javascript$/.test(attrs.type);
    if(!attrs.src&&executable&&loc.endTag){
     const src=html.slice(loc.startTag.endOffset,loc.endTag.startOffset);
     if(src.trim()){
      const key='/@inline/'+relative+'/'+loc.startOffset+'.js';
      slots[key]=[addUnit(src,key,pageOwner)];
      changes.push({start:loc.startTag.endOffset,end:loc.endTag.startOffset,value:'window.__p0Modules.run('+JSON.stringify(key)+',document.currentScript);'});
     }
    }
   }
   if(primary&&loc&&node.tagName==='style'&&loc.endTag){
    const key='/@inline/'+relative+'/'+loc.startOffset+'.css';
    cssEntries.push({id:key,url:'/'+relative,source:html.slice(loc.startTag.endOffset,loc.endTag.startOffset),defaultOwner:pageOwner});
    changes.push({start:loc.startOffset,end:loc.endOffset,value:'<link rel="stylesheet" href="'+moduleUrl(pageOwner,'css')+'#p0-style='+encodeURIComponent(key)+'"><script>window.__p0Modules.mountStyle(document.currentScript.previousElementSibling,'+JSON.stringify(key)+');</script>'});
   }
   if(loc&&node.tagName==='link'){
    const attrs=Object.fromEntries(node.attrs.map(a=>[a.name,a.value]));
    if(attrs.rel==='stylesheet'&&attrs.href){
     let key;try{key=new URL(attrs.href,'https://p0.leaibot.cn/'+relative).pathname}catch{}
     if(urlMap.has(key))changes.push({start:loc.endOffset,end:loc.endOffset,value:'<script>window.__p0Modules.mountStyle(document.currentScript.previousElementSibling,'+JSON.stringify(key)+');</script>'});
    }
   }
   for(const c of node.childNodes||[])visit(c);
  }
  visit(doc);
  if(!headEnd)throw Error('Missing explicit head '+relative);
  htmlPlans.push({relative,html,changes,headEnd,primary});
 }
 // Retain the transitive code graph of the active entry documents, including
 // their lazy feature URLs. Older unreferenced variants must not re-enter the
 // download merely because their owner module is used by another page.
 const activeUnits=new Set(htmlPlans.filter(plan=>plan.primary).flatMap(plan=>[...librariesFor(plan).unitIds]));
 const retiredUnits=[...units.values()].filter(unit=>!activeUnits.has(unit.id)).map(unit=>({id:unit.id,label:unit.label,bytes:Buffer.byteLength(unit.source)}));
 for(const id of units.keys())if(!activeUnits.has(id))units.delete(id);
 for(const owner of Object.values(owners))owner.sources=owner.sources.filter(id=>activeUnits.has(id));
 for(const [key,ids] of Object.entries(slots))if(ids.some(id=>!activeUnits.has(id)))delete slots[key];
 const styleReferences=[...htmlFiles.map(file=>fs.readFileSync(file,'utf8')),...[...units.values()].map(unit=>unit.source)];
 for(let i=cssEntries.length-1;i>=0;i--){
  const entry=cssEntries[i];if(entry.id.startsWith('/@'))continue;
  const refs=[entry.id,path.posix.basename(entry.id)];
  if(!styleReferences.some(text=>refs.some(ref=>text.includes(ref))))cssEntries.splice(i,1);
 }
 for(const unit of units.values()){
  const inline=extractInlineStyles(unit.source,unit.label,unit.owner);
  unit.source=inline.source;cssEntries.push(...inline.entries);
 }
 const css=packageStyles(cssEntries);
 Object.assign(cssSlots,css.slots);
 for(const unit of units.values()){
  const source=replacement(unit.source);
  const result=extract(source,unit.label,unit.owner);
  new vm.Script(result.source,{filename:unit.label});
  unit.output=result.source;
  unit.requiredOwners=[...new Set(result.implementations.map(i=>i.owner))];
  extraction.push({id:unit.id,label:unit.label,owner:unit.owner,...result.report});
  for(const impl of result.implementations){
   if(!owners[impl.owner])throw Error('Unknown owner '+impl.owner);
   owners[impl.owner].factories.push(impl);
  }
 }
 const outDir=path.join(publicRoot,'modules');
 fs.mkdirSync(outDir,{recursive:true});
 const runtime=fs.readFileSync('scripts/p0-modules/runtime.js','utf8');
 for(const m of modules){
  const dir=path.join(outDir,m.owner);fs.mkdirSync(dir,{recursive:true});
  const chunks=['/* '+m.name+' — P0 business implementations. */'];
  if(m.owner==='shared/common')chunks.push(runtime,'window.__p0Modules.scripts='+JSON.stringify(slots)+';','window.__p0Modules.css='+JSON.stringify(cssSlots)+';');
  chunks.push('if (!window.__p0Modules.installed['+JSON.stringify(m.owner)+']) {','window.__p0Modules.installed['+JSON.stringify(m.owner)+']=true;');
  for(const id of owners[m.owner].sources){const u=units.get(id);chunks.push('\n/* '+u.label.replace(/\*\//g,'')+' */','window.__p0Modules.sources['+JSON.stringify(id)+']=function(){\n'+u.output+'\n};');}
  const seen=new Map();for(const impl of owners[m.owner].factories){if(seen.has(impl.id)){if(seen.get(impl.id)!==impl.code)throw Error('Factory ID collision '+impl.id);continue;}seen.set(impl.id,impl.code);chunks.push('\n/* Business: '+(impl.name||impl.id)+' */','window.__p0Modules.factories['+JSON.stringify(impl.id)+']='+impl.code+';');}
  chunks.push('}','window.__p0Modules.dispatch(document.currentScript);');
  const js=chunks.join('\n');new vm.Script(js,{filename:m.owner});fs.writeFileSync(path.join(dir,'index.js'),js+'\n');
  fs.writeFileSync(path.join(dir,'index.css'),'/* '+m.name+' — ordered style fragments. */\n'+(css.owners[m.owner]||'')+'\n');
 }
 function librariesFor(plan){
  const selected=new Set(), texts=[plan.html], seenUnits=new Set();
  const aliases=[...urlMap.keys()].filter(k=>k.endsWith('.js')).map(key=>({key,refs:[key,...(key.startsWith('/assets/frontend/')?[key.slice(7),'..'+key.slice(7)]:[])]}));
  for(const [key,ids] of Object.entries(slots))if(key.startsWith('/@inline/'+plan.relative+'/'))for(const id of ids){seenUnits.add(id);texts.push(units.get(id).source);}
  while(texts.length){
   const text=texts.pop();
   for(const {key,refs} of aliases){
    if(selected.has(key)||!refs.some(ref=>text.includes(ref)))continue;
    selected.add(key);
    for(const id of slots[key]||[])if(!seenUnits.has(id)){seenUnits.add(id);texts.push(units.get(id).source);}
   }
  }
  const required=new Set(['shared/common']);
  for(const id of seenUnits){const u=units.get(id);required.add(u.owner);for(const owner of u.requiredOwners||[])required.add(owner);}
  const libraries=modules.filter(m=>required.has(m.owner));
  libraries.unitIds=seenUnits;
  return libraries;
 }
 function stylesFor(plan,libraries){
  // All parts required by a synchronous styleText() call must be registered
  // before the original script slot executes. Include reachable lazy features,
  // while keeping the self-contained banner iframe's three sheets independent.
  const texts=[plan.html,...[...(libraries.unitIds||[])].map(id=>units.get(id).source)];
  const keys=new Set(Object.keys(cssSlots).filter(key=>key.startsWith('/@inline/'+plan.relative+'/')));
  for(const key of Object.keys(cssSlots)){
   const refs=[key];
   if(key.startsWith('/assets/frontend/'))refs.push(key.slice(7),'..'+key.slice(7));
   // Known basenames also cover a literal filename concatenated to an asset
   // directory; extra parts are harmless because library media stays inactive.
   if(!key.startsWith('/@'))refs.push(path.posix.basename(key));
   if(texts.some(text=>refs.some(ref=>text.includes(ref))))keys.add(key);
  }
  const required=new Set();
  for(const key of keys)for(const part of cssSlots[key])required.add(part.owner);
  return modules.filter(m=>required.has(m.owner));
 }
 for(const plan of htmlPlans){
  const libraries=plan.primary?librariesFor(plan):modules.filter(m=>m.owner==='shared/common');
  const styleLibraries=stylesFor(plan,libraries);
  const styleBootstrap=styleLibraries.map(m=>'<link rel="stylesheet" data-p0-style-library href="'+moduleUrl(m.owner,'css')+'">').join('\n');
  const bootstrap=styleBootstrap+'\n'+libraries.map(m=>'<script data-p0-library src="'+moduleUrl(m.owner,'js')+'"></script>').join('\n')+'\n<script>window.__p0Modules.collectStyles();</script>\n';
  let html=plan.html;plan.changes.push({start:plan.headEnd,end:plan.headEnd,value:'\n<!-- P0 48 business modules: register only; run at the original document slots. -->\n'+bootstrap});
  for(const c of plan.changes.sort((a,b)=>b.start-a.start))html=html.slice(0,c.start)+c.value+html.slice(c.end);
  html=replacement(html);
  const out=path.join(publicRoot,plan.relative);fs.writeFileSync(out,html);
 }
 for(const file of files){fs.rmSync(path.join(publicRoot,path.relative(baselinePublic,file)),{force:true});}
 // Old production manifest described deleted resources. The active manifest is below.
 fs.rmSync(path.join(publicRoot,'assets/frontend/bundles/p0-home-manifest.json'),{force:true});
 const result={version:2,buildVersion,baseline:'9585cb03a47c5a63d9049cc79a6f50c7e449d620',moduleCount:48,fileCount:96,modules:modules.map(m=>({id:m.id,name:m.name,owner:m.owner,css:'/modules/'+m.owner+'/index.css',js:'/modules/'+m.owner+'/index.js',sourceUnits:owners[m.owner].sources.length,implementations:new Set(owners[m.owner].factories.map(f=>f.id)).size,cssBytes:Buffer.byteLength(css.owners[m.owner]||'')})),oldResources:[...urlMap.keys()],retiredUnits,extraction,styles:css.report};
 fs.writeFileSync(path.join(outDir,'manifest.json'),JSON.stringify(result,null,2)+'\n');
 fs.mkdirSync('scripts/p0-modules/reports',{recursive:true});fs.writeFileSync('scripts/p0-modules/reports/resource-map.json',JSON.stringify(Object.fromEntries(urlMap),null,2)+'\n');
 console.log(JSON.stringify({files:96,units:units.size,extracted:result.modules.reduce((n,m)=>n+m.implementations,0),emptyJs:result.modules.filter(m=>!m.sourceUnits&&!m.implementations).map(m=>m.owner),emptyCss:result.modules.filter(m=>!m.cssBytes).map(m=>m.owner)},null,2));
})().catch(e=>{console.error(e);process.exit(1)});

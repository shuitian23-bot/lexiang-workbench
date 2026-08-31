const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict'),path=require('node:path');
const input=process.argv[2]||path.join(__dirname,'../../public/leaip0/assets/frontend/js/core/home.ref-sync-v140.js'),source=fs.readFileSync(input,'utf8');
const start=source.includes('function lxLoadFeatureRuntime(')?source.indexOf('function lxLoadFeatureRuntime('):source.indexOf('async function te(');
const end=source.indexOf('async function',source.indexOf('async function ae(')+10);
const block=source.slice(start,end),results=[];
const flush=async()=>{for(let i=0;i<16;i++)await Promise.resolve()};
function env(kind,manualCSS=false){
 const nodes=new Map(),requests=[],styles=[],timers=new Map();let seq=0,mounts=0;
 class Element{
  constructor(tag){this.tag=tag;this.id='';this.dataset={};this.listeners={};this.isConnected=true;this.innerHTML='';this.classList={toggle(){}}}
  addEventListener(event,fn){(this.listeners[event]??=new Set()).add(fn)}
  removeEventListener(event,fn){this.listeners[event]?.delete(fn)}
  emit(event){this['on'+event]?.({type:event});for(const fn of [...(this.listeners[event]||[])])fn({type:event})}
  remove(){this.isConnected=false;if(nodes.get(this.id)===this)nodes.delete(this.id)}
  closest(){return null}
 }
 const host=new Element('div'),root=new Element('div');root.querySelector=()=>host;
 const document={getElementById:id=>nodes.get(id)||null,querySelector:()=>null,querySelectorAll:()=>[],createElement:tag=>new Element(tag),head:{appendChild(node){nodes.set(node.id,node);if(node.tag==='script')requests.push(node);if(node.tag==='link'){styles.push(node);if(!manualCSS)Promise.resolve().then(()=>{node.sheet={};node.emit('load')})}return node}}};
 const window={setTimeout(fn){let id=++seq;timers.set(id,fn);return id},clearTimeout(id){timers.delete(id)},setInterval(){return ++seq},clearInterval(){}};
 const state={activeTabId:'test'},ctx=vm.createContext({window,document,Promise,Error,d:state,xn(){},ys(){}});
 vm.runInContext('let Yt=null;'+block+';globalThis.entry={member:te,store:ae}',ctx);
 const descriptor={id:'test',memberComponentView:'devices',storeComponentView:'stores'};
 let completed=0;
 return {nodes,requests,styles,timers,window,host,state,root,
  begin(){return ctx.entry[kind](descriptor,root).then(()=>{completed++})},
  get completed(){return completed},get mounts(){return mounts},
  register(){window[kind==='member'?'LXMemberService':'LXStoreService']={mount(){mounts++;return {}}}},
  expire(){for(const [id,fn] of [...timers]){timers.delete(id);fn()}},
  existing(){const n=new Element('script');n.id='lx-'+kind+'-component-runtime';nodes.set(n.id,n);return n}
 };
}
async function test(kind,name,fn){try{await fn(env(kind, name.startsWith('CSS:')));results.push({kind,name,pass:true})}catch(error){results.push({kind,name,pass:false,error:error.message})}}
(async()=>{
 for(const [name,fn] of [
 ['CSS:失败阻止无样式挂载并可重试',async e=>{e.begin();e.register();e.requests[0].emit('load');e.styles[0].emit('error');await flush();assert.equal(e.mounts,0);assert.match(e.host.innerHTML,/暂时无法加载/);e.begin();assert.equal(e.styles.length,2);e.styles[1].sheet={};e.styles[1].emit('load');await flush();assert.equal(e.mounts,1);assert.equal(e.requests.length,1)}],
 ['CSS:已有组件仍等待样式',async e=>{e.register();e.begin();await flush();assert.equal(e.mounts,0);assert.equal(e.styles.length,1);e.styles[0].sheet={};e.styles[0].emit('load');await flush();assert.equal(e.mounts,1)}],
 ['CSS:超时后清理并可重新请求',async e=>{e.register();e.begin();e.expire();await flush();assert.equal(e.completed,1);assert.equal(e.mounts,0);e.begin();assert.equal(e.styles.length,2);e.styles[1].sheet={};e.styles[1].emit('load');await flush();assert.equal(e.mounts,1);assert.equal(e.timers.size,0)}],
 ['CSS:并发进入共用样式请求',async e=>{e.register();e.begin();e.begin();assert.equal(e.styles.length,1);e.styles[0].sheet={};e.styles[0].emit('load');await flush();assert.equal(e.completed,2);assert.equal(e.timers.size,0)}],
 ['CSS:已加载样式直接复用',async e=>{e.register();e.begin();assert.equal(e.styles.length,1);e.styles[0].sheet={};e.styles[0].emit('load');await flush();e.begin();await flush();assert.equal(e.styles.length,1);assert.equal(e.mounts,2)}],
 ['CSS:旧事件不移除新的样式链接',async e=>{e.register();e.begin();const old=e.styles[0];assert.ok(old);e.expire();await flush();e.begin();const current=e.styles[1];assert.ok(current);old.emit('error');old.emit('load');assert.equal(e.nodes.get(current.id),current);current.sheet={};current.emit('load');await flush();assert.equal(e.mounts,1)}],
 ['CSS:样式成功但脚本失败保留样式',async e=>{e.begin();e.styles[0].sheet={};e.styles[0].emit('load');e.requests[0].emit('error');await flush();e.begin();assert.equal(e.styles.length,1);assert.equal(e.requests.length,2);e.register();e.requests[1].emit('load');await flush();assert.equal(e.mounts,1)}],
 ['CSS:移除已加载样式后重新加载',async e=>{e.register();e.begin();assert.ok(e.styles[0]);e.styles[0].sheet={};e.styles[0].emit('load');await flush();e.styles[0].remove();e.begin();assert.equal(e.styles.length,2);e.styles[1].sheet={};e.styles[1].emit('load');await flush();assert.equal(e.mounts,2)}]
 ])await test('member',name,fn);
 for(const kind of ['member','store']){
  await test(kind,'成功加载并清理计时器',async e=>{e.begin();assert.equal(e.requests.length,1);e.register();e.requests[0].emit('load');await flush();assert.equal(e.mounts,1);assert.equal(e.timers.size,0)});
  await test(kind,'网络失败后重新进入可重新请求',async e=>{e.begin();e.requests[0].emit('error');await flush();assert.match(e.host.innerHTML,/暂时无法加载/);e.begin();assert.equal(e.requests.length,2);e.register();e.requests[1].emit('load');await flush();assert.equal(e.mounts,1)});
  await test(kind,'首次加载超时后可重试',async e=>{e.begin();e.expire();await flush();assert.equal(e.completed,1);assert.match(e.host.innerHTML,/暂时无法加载/);e.begin();assert.equal(e.requests.length,2);e.register();e.requests[1].emit('load');await flush();assert.equal(e.mounts,1)});
  await test(kind,'加载完成但组件未注册可重试',async e=>{e.begin();e.requests[0].emit('load');await flush();assert.equal(e.mounts,0);e.begin();assert.equal(e.requests.length,2);e.register();e.requests[1].emit('load');await flush();assert.equal(e.mounts,1)});
  await test(kind,'已有未完成脚本超时清理',async e=>{e.existing();e.begin();assert.equal(e.requests.length,0);e.expire();await flush();assert.equal(e.completed,1);e.begin();assert.equal(e.requests.length,1);e.register();e.requests[0].emit('load');await flush();assert.equal(e.mounts,1)});
  await test(kind,'连续进入共用一个脚本请求',async e=>{e.begin();e.begin();e.begin();assert.equal(e.requests.length,1);e.register();e.requests[0].emit('load');await flush();assert.equal(e.completed,3);assert.equal(e.timers.size,0)});
  await test(kind,'已注册组件不重新下载',async e=>{e.register();await e.begin();assert.equal(e.requests.length,0);assert.equal(e.mounts,1)});
  await test(kind,'切换标签后不挂载旧视图',async e=>{e.begin();e.state.activeTabId='other';e.register();e.requests[0].emit('load');await flush();assert.equal(e.mounts,0)});
  await test(kind,'离开视图后不挂载已移除节点',async e=>{e.begin();e.host.isConnected=false;e.register();e.requests[0].emit('load');await flush();assert.equal(e.mounts,0)});
  await test(kind,'旧请求迟到事件不清理新请求',async e=>{e.begin();const old=e.requests[0];e.expire();await flush();assert.equal(e.completed,1);e.begin();const current=e.requests[1];assert.ok(current);old.emit('error');old.emit('load');assert.equal(e.nodes.get(current.id),current);e.register();current.emit('load');await flush();assert.equal(e.mounts,1);assert.equal(e.timers.size,0)});
  await test(kind,'既有脚本成功事件可复用',async e=>{const script=e.existing();e.begin();e.register();script.emit('load');await flush();assert.equal(e.mounts,1);assert.equal(e.requests.length,0);assert.equal(e.timers.size,0)});
 }
 console.log(JSON.stringify({source:input,passed:results.filter(r=>r.pass).length,total:results.length,results},null,2));if(results.some(r=>!r.pass))process.exitCode=1;
})();

#!/usr/bin/env node
const fs=require('fs'),path=require('path'),vm=require('vm');
const root='public/leaip0',manifest=JSON.parse(fs.readFileSync(root+'/modules/manifest.json'));
const registry=JSON.parse(fs.readFileSync('scripts/p0-package-architecture/registry.json'));
const walk=d=>fs.readdirSync(d,{withFileTypes:true}).flatMap(e=>e.isDirectory()?walk(path.join(d,e.name)):[path.join(d,e.name)]);
const files=walk(root).filter(f=>/\.(?:js|css)$/.test(f)),errors=[];
if(files.length!==96)errors.push('公开 JS/CSS 必须正好96个，实际'+files.length);
if(registry.pages.length!==22||registry.modals.length!==24||registry.shared.length!==2)errors.push('模块分组数量错误');
const actual=new Set(files);
for(const module of manifest.modules){
 for(const ext of ['css','js']){
  const file=root+module[ext];
  if(!actual.has(file)){errors.push('缺少模块文件 '+file);continue;}
  const source=fs.readFileSync(file,'utf8');
  if(ext==='js'){
   try{new vm.Script(source,{filename:file})}catch(e){errors.push(e.message)}
   if(!module.sourceUnits&&!module.implementations)errors.push('JS仍为空占位 '+file);
  }else if(!module.cssBytes||!source.includes('@media (-p0-part:'))errors.push('CSS仍为空占位 '+file);
 }
}
for(const old of manifest.oldResources)if(fs.existsSync(root+old))errors.push('旧运行文件仍存在 '+old);
const primary=new Set(['index.html','shop-chat/index.html','b-chat/index.html','biz-chat/index.html','brand/index.html']);
for(const file of walk(root).filter(p=>p.endsWith('.html')).map(p=>path.relative(root,p))){
 const html=fs.readFileSync(root+'/'+file,'utf8');
 if(primary.has(file)&&(!html.includes('data-p0-library')||!html.includes('data-p0-style-library')))errors.push('缺少模块加载 '+file);
 const base=html.match(/<base\b[^>]*href=["']([^"']+)["']/i)?.[1]||('/'+file);
 for(const m of html.matchAll(/<(?:script|link)\b[^>]*(?:src|href)=["']([^"']+)["']/gi)){
  const url=new URL(m[1],new URL(base,'https://p0.leaibot.cn/'+file));
  if(url.origin==='https://p0.leaibot.cn'&&/\.(?:js|css)$/.test(url.pathname)&&!fs.existsSync(root+url.pathname))errors.push('入口断链 '+file+' -> '+url.pathname);
 }
}
console.log(JSON.stringify({pass:!errors.length,publicCodeFiles:files.length,js:files.filter(f=>f.endsWith('.js')).length,css:files.filter(f=>f.endsWith('.css')).length,pagePackages:22,modalPackages:24,sharedPackages:2,errors},null,2));
if(errors.length)process.exit(1);

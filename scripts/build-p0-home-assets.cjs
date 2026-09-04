#!/usr/bin/env node
// Run from the repository root: node scripts/build-p0-home-assets.cjs --check
// After canonical source edits, use --stage /an/empty/staging/directory.
// This never deploys or overwrites live files. Review the stage, lock and hash-guard the release.
const fs=require('fs'),path=require('path'),crypto=require('crypto'),vm=require('vm');
const root=process.cwd(),base='public/leaip0',manifestFile=base+'/assets/frontend/bundles/p0-home-manifest.json';
const manifest=JSON.parse(fs.readFileSync(manifestFile,'utf8'));
const hash=s=>crypto.createHash('sha256').update(s).digest('hex');
const staged=new Map();let html=fs.readFileSync(base+'/index.html','utf8');
for(const embedding of manifest.embedded || []) {
  const source=fs.readFileSync(embedding.source,'utf8');new vm.Script(source);
  const target=fs.readFileSync(embedding.target,'utf8'),a=target.indexOf(embedding.start),b=target.indexOf(embedding.end);
  if(a<0||b<a)throw Error('Missing embedded module markers: '+embedding.target);
  staged.set(embedding.target,target.slice(0,a)+embedding.start+'\n'+source+'\n'+target.slice(b));
}
for(const g of manifest.groups){
  const content=g.files.map(file=>{
    let s=staged.get(file) || fs.readFileSync(file,'utf8');
    if(g.type==='js'){
      if(/document\.currentScript|document\.write\s*\(/.test(s))throw Error('Unsafe script: '+file);
      new vm.Script(s,{filename:file});return '\n;/* '+file+' */\n'+s+'\n;\n';
    }
    if(/@import\b/i.test(s))throw Error('Review CSS import: '+file);
    s=s.replace(/@charset\s+["'][^"']+["'];?/gi,'');
    s=s.replace(/url\(\s*(?:"([^"]*)"|'([^']*)'|([^\s)]*))\s*\)/gi,(m,a,b,c)=>{
      const u=a??b??c;if(!u||/^(?:data:|https?:|\/|#)/i.test(u))return m;
      if(u.includes('\\'))throw Error('Review escaped CSS URL: '+file);
      const full=new URL(u,'https://p0.leaibot.cn'+file.slice(base.length));
      return 'url("'+full.pathname+full.search+full.hash+'")';
    });return '\n/* '+file+' */\n'+s;
  }).join('\n');
  if(g.type==='js')new vm.Script(content,{filename:g.label});
  const digest=hash(content),url=g.url.split('?')[0]+'?p0v='+digest.slice(0,16);
  staged.set(base+url.split('?')[0],content);
  html=html.split(g.url).join(url).split(g.url.replaceAll('&','&amp;')).join(url.replaceAll('&','&amp;'));
  g.url=url;g.hash=digest;g.sourceHashes=g.files.map(f=>hash(staged.get(f)||fs.readFileSync(f)));
}
for(const file of manifest.inlineSources || [base+'/assets/frontend/js/core/p0-home-features-v1.js']) {
 const source=fs.readFileSync(file,'utf8');new vm.Script(source);
 const start='<script data-p0-inline-source="'+file.slice(base.length)+'">',i=html.indexOf(start),end=html.indexOf('</script>',i);
 if(i<0||end<i)throw Error('Missing inline module: '+file);
 html=html.slice(0,i)+start+source.replace(/<\/script/gi,'<\\/script')+'</script>'+html.slice(end+9);
}
staged.set(base+'/index.html',html);
for(const entry of manifest.standaloneEntrypoints || []) {
 const source=staged.get(entry.source)||fs.readFileSync(entry.source),page=fs.readFileSync(entry.file,'utf8');
 const escaped=entry.url.replace(/[.*+?^$()|[\]\\]/g,'\\$&');
 const regex=new RegExp(escaped+'(?:\\?[^"<>]*)?','g');
 if(!regex.test(page))throw Error('Missing standalone entry: '+entry.file);
 staged.set(entry.file,page.replace(regex,entry.url+'?p0v='+hash(source).slice(0,16)));
}staged.set(manifestFile,JSON.stringify(manifest,null,2)+'\n');
const changed=[...staged].filter(([f,s])=>!fs.existsSync(f)||hash(fs.readFileSync(f))!==hash(s));
if(process.argv[2]==='--check'){
  console.log(JSON.stringify({consistent:!changed.length,changed:changed.map(([f])=>f)}));process.exitCode=changed.length?1:0;
}else if(process.argv[2]==='--stage'&&process.argv[3]){
  const output=path.resolve(process.argv[3]);if(fs.existsSync(output))throw Error('Stage must not already exist');
  for(const[f,s]of changed){const p=path.join(output,f);fs.mkdirSync(path.dirname(p),{recursive:true});fs.writeFileSync(p,s);}
  console.log(JSON.stringify({output,files:changed.map(([f])=>f)}));
}else throw Error('Use --check or --stage <new-directory>');

const fs=require('node:fs'),vm=require('node:vm'),path=require('node:path'),assert=require('node:assert/strict');
const rows=JSON.parse(fs.readFileSync(path.join(__dirname,'../../docs/p0-feature-cache-expressions.json'))),pages={'home.ref-sync-v140.js':'index.html','shop-chat.ref-sync-v140.js':'shop-chat/index.html','b-chat.ref-sync-v140.js':'b-chat/index.html','biz-chat.ref-sync-v140.js':'biz-chat/index.html','app-brand.industry-v114.trace-first-v117.tabs-v120.min.js':'brand/index.html'};
const results=[];
for(const row of rows){const html=fs.readFileSync(path.join(__dirname,'../../public/leaip0',pages[row.runtime]),'utf8');const tags=html.match(/<link\b[^>]+>/g)||[];const tag=tags.find(t=>t.includes('rel="preload"')&&t.includes('as="'+row.kind+'"')&&t.includes('href="'+row.path+'?'));assert.ok(tag,'missing preload '+row.runtime+' '+row.path);const href=new URL(tag.match(/href="([^"]+)"/)[1].replaceAll('&amp;','&'),'https://p0.leaibot.cn').href;
const expectedSelector='link[rel="preload"][as="'+row.kind+'"][href^="'+row.path+'?"]';
const resolved=vm.runInNewContext(row.expression,{document:{querySelector(selector){assert.equal(selector,expectedSelector);return {href}}}});assert.equal(resolved,href);assert.match(resolved,/[?&]p0v=[a-f0-9]{16}/);
assert.equal(vm.runInNewContext(row.expression,{document:{querySelector:()=>null}}),row.fallback);
results.push({runtime:row.runtime,path:row.path,preload:href,resolvedMatchesPreload:true,missingPreloadKeepsFallback:true});}
fs.writeFileSync(path.join(__dirname,'url-tests.json'),JSON.stringify(results,null,2));console.log(results.length+' preload matches and '+results.length+' fallback checks passed');

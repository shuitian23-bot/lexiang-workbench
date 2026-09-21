#!/usr/bin/env node
// Inspect the current module layout without silently resetting old budgets.
const fs=require('fs'),path=require('path'),z=require('zlib'),cp=require('child_process');
cp.execFileSync(process.execPath,['scripts/validate-p0-public-assets.cjs'],{stdio:'inherit'});
const root=path.resolve('public/leaip0'),budget=JSON.parse(fs.readFileSync('scripts/p0-performance-budget.json'));
const rows=[],violations=[];
for(const entry of budget.pages){
 const html=fs.readFileSync(path.join(root,entry.file),'utf8');
 const urls=new Map();
 for(const match of html.matchAll(/<(?:script|link)\b[^>]*(?:src|href)="([^"]+)"[^>]*>/g)){
  const url=new URL(match[1].replaceAll('&amp;','&'),'https://p0.leaibot.cn/'+entry.file);
  if(url.origin!=='https://p0.leaibot.cn'||!(/\.(js|css)$/.test(url.pathname)))continue;
  // Fragment identifiers select execution/style slots; they do not transfer a
  // second copy of the same HTTP resource in a normal cached browser session.
  urls.set(url.pathname+url.search,url);
 }
 let raw=0,gzip=0;
 for(const url of urls.values()){
  const bytes=fs.readFileSync(root+url.pathname),compressed=z.gzipSync(bytes).length;
  raw+=bytes.length;gzip+=compressed;
  if(!/^[a-f0-9]{16}$/.test(url.searchParams.get('p0v')||''))violations.push(entry.file+': missing version '+url.pathname);
  const max=url.pathname.endsWith('.js')?budget.maxSingleJsGzip:budget.maxSingleCssGzip;
  if(compressed>max)violations.push(entry.file+': historical single-asset budget exceeded '+url.pathname);
 }
 const htmlGzip=z.gzipSync(html).length;
 if(urls.size>entry.maxRequests)violations.push(entry.file+': historical request budget exceeded');
 if(gzip>entry.maxGzip)violations.push(entry.file+': historical gzip budget exceeded');
 if(htmlGzip>entry.maxHtmlGzip)violations.push(entry.file+': historical HTML budget exceeded');
 rows.push({page:entry.file,uniqueCodeRequests:urls.size,rawBytes:raw,gzipBytes:gzip,htmlGzipBytes:htmlGzip});
}
console.log(JSON.stringify({budgetDate:budget.measured,scope:budget.scope,rows,violations,pass:!violations.length},null,2));
// --report is an explicit measurement mode, never a passing performance gate.
if(violations.length&&!process.argv.includes('--report'))process.exitCode=1;

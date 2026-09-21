#!/usr/bin/env node
const fs=require('fs'),path=require('path'),cp=require('child_process');
const root='public/leaip0',manifestPath=root+'/assets/frontend/bundles/p0-home-manifest.json';
const manifest=JSON.parse(fs.readFileSync(manifestPath));
const registry=JSON.parse(fs.readFileSync('scripts/p0-package-architecture/registry.json'));
const code=[];(function walk(d){for(const e of fs.readdirSync(d,{withFileTypes:true})){const p=path.join(d,e.name);if(e.isDirectory())walk(p);else if(/\.(?:js|css)$/.test(p))code.push(p)}})(root);
const errors=[];
if(registry.pages.length!==22)errors.push(`页面包数量 ${registry.pages.length}，应为 22`);
if(registry.modals.length!==24)errors.push(`弹窗包数量 ${registry.modals.length}，应为 24`);
for(const p of [...registry.pages,...registry.modals,...registry.shared])for(const k of ['css','js'])if(!fs.existsSync(p[k]))errors.push(`缺少包入口 ${p[k]}`);
const sources=[];for(const g of manifest.groups)for(const f of g.files)sources.push(f);for(const x of manifest.inlineSources||[])sources.push(typeof x==='string'?x:x.source);for(const x of manifest.embedded||[])sources.push(x.source);for(const x of manifest.standaloneEntrypoints||[])sources.push(x.source);
for(const f of manifest.pureBuildSources||[]){if(f.startsWith(root+'/'))errors.push(`纯构建源码仍在公开目录：${f}`);if(!fs.existsSync(f))errors.push(`缺少纯构建源码：${f}`)}
if(code.length!==199)errors.push(`公开 JS/CSS 数量 ${code.length}，当前兼容基线应为 199`);
const check=cp.spawnSync(process.execPath,['scripts/build-p0-home-assets.cjs','--check'],{encoding:'utf8'});if(check.status!==0)errors.push(`构建一致性失败：${check.stdout}${check.stderr}`);
console.log(JSON.stringify({pass:!errors.length,publicCodeFiles:code.length,sourceFiles:new Set(sources).size,pagePackages:registry.pages.length,modalPackages:registry.modals.length,sharedPackages:registry.shared.length,errors},null,2));
if(errors.length)process.exit(1);

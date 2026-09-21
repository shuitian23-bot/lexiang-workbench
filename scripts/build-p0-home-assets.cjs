#!/usr/bin/env node
// P0's 48 module pairs are the canonical published source. No historical bundle
// is rebuilt or copied back into the public directory after the migration.
const {spawnSync}=require('child_process');
if(process.argv[2]!=='--check')throw Error('P0模块源码直接发布，请使用 --check 校验；不再生成历史打包文件。');
const result=spawnSync(process.execPath,['scripts/validate-p0-public-assets.cjs'],{stdio:'inherit'});
process.exit(result.status||0);

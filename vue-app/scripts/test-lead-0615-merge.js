import fs from 'fs';
import path from 'path';
import assert from 'assert';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const sourcePath = path.resolve(__dirname, '../public/admin-runtime/workbench-lead.js');
const source = fs.readFileSync(sourcePath, 'utf8');

const requiredMarkers = [
  'LEAD_SOURCES3',
  'TEAM_METRIC_FILTER',
  'leadTeamDrill',
  'fSource2',
  'fSource3',
  'fMql',
  'fAssign',
  'DATE_SCOPES',
  'leadOpenAssignCond',
  'leadConfirmAssignCond',
  'leadOpenAssignBatch',
  'leadConfirmAssignBatch',
  'leadDownloadAssignTpl',
  'leadOpenMql',
  'leadConfirmMql',
  'editIndex',
  '是否MQL',
  'kbAppliedFilters',
  'leadApplyKbFilters',
];

const retainedMarkers0708 = [
  'tch-name',
  'tch-desc',
  '请输入触达名称',
  '触达描述',
  'pageSize = 20',
  'lead.dashboard',
  'lead.pool',
  'lead.score',
  'leadSRBehToNow',
  'leadSRLinkAdd',
  'leadSRKeywordsSet',
  'leadSRProductTargetMode',
  '至今',
  '留资链接',
  'FA + 产品组',
  '商品编码',
  '搜索关键词',
  '多个关键词用英文,隔开',
  'sqlAmountPc',
  'sqlAmountSd',
  'sqlAmountSs',
  'sqlAmountSi',
  'SQL_AMOUNT_LIMITS',
  'leadReturnFollowEdit',
  'leadConfirmFollowOverLimit',
  'SQL金额-PC（万元）',
  'SQL金额-SD（万元）',
  'SQL金额-SS（万元）',
  'SQL金额-SI（万元）',
  '金额超限确认',
  '继续提交',
  '返回修改',
  'CONVERT_PRODUCT_GROUPS',
  'leadConvertProductNameChange',
  'cvt-product-name',
  'cvt-product-code',
  '产品组名称',
  'convertModelControlHtml',
  'leadRenderConvertModel',
  'allowCustomModel',
  'cvt-model-host',
];

const groups = [
  { name: '0615 merge markers', markers: requiredMarkers },
  { name: '0708 retained markers', markers: retainedMarkers0708 },
];

const missing = groups.flatMap((group) =>
  group.markers
    .filter((marker) => !source.includes(marker))
    .map((marker) => ({ group: group.name, marker })),
);

if (missing.length > 0) {
  console.error('Missing markers:');
  for (const item of missing) {
    console.error(`- [${item.group}] ${item.marker}`);
  }
}

assert.strictEqual(
  missing.length,
  0,
  `Expected all lead merge markers to exist, but ${missing.length} marker(s) are missing.`,
);

assert.match(
  source,
  /Object\.assign\(LEAD,\s*TEAM_METRIC_FILTER\[d\.metric\][\s\S]*?LEAD\.poolAppliedFilters\s*=\s*capturePoolFilters\(\)[\s\S]*?switchPage\('lead\.pool'\)/,
  'Dashboard drill-down must update the applied filter snapshot before navigation.',
);
assert.match(source, /if\s*\(LEAD\.role\s*===\s*'ops'\)[^\n]*leadOpenMql\(\)/, 'Batch MQL must only be visible to operations users.');
assert.match(source, /window\.leadOpenMql\s*=\s*function[\s\S]*?LEAD\.role\s*!==\s*'ops'/, 'Batch MQL handler must enforce operations-only access.');
assert.match(source, /window\.leadConfirmMql\s*=\s*function[\s\S]*?LEAD\.role\s*!==\s*'ops'/, 'Batch MQL confirmation must enforce operations-only access.');
const pendingValidationIndex = source.indexOf('if (!pendingMetrics.length)');
const rollbackIndex = source.indexOf('// 修改：先回滚原记录');
assert.ok(pendingValidationIndex >= 0 && rollbackIndex >= 0 && pendingValidationIndex < rollbackIndex, 'Data-edit values must be validated before rollback.');
assert.ok(source.includes('accept=".csv"') && !source.includes('accept=".csv,.xlsx,.xls"'), 'Upload assignment must advertise CSV only.');
const rerenderBlock = source.match(/function rerenderCurrent\(\) \{[\s\S]*?\n  \}/)?.[0] || '';
assert.ok(!rerenderBlock.includes("getElementById('page-content')"), 'Lead rerendering must not overwrite the Vue router content host.');
assert.match(rerenderBlock, /closest\('\.lead-dashboard-native, \.lead-pool-native, \.lead-score-native'\)/, 'Lead rerendering must stay inside the active Vue route wrapper.');assert.match(
  source,
  /onclick=\"leadApplyKbFilters\(\)\">查询<\/button>/,
  'Lead dashboard filter bar must expose an explicit Query button.',
);
assert.ok(!source.includes('tch-method') && !source.includes('tch-result') && !source.includes('tch-note'), 'Touch modal must use the confirmed name/description fields instead of method/result/note.');
assert.match(source, /leadConfirmTouch\(\)[\s\S]*确定/, 'Touch modal primary action must be 确定.');
assert.ok(!source.includes('PC端每') && !source.includes('WAP端'), 'Product detail behavior must remove PC/WAP dwell-second settings.');
assert.match(source, /leadSRBehToNow[\s\S]*至今/, 'Behavior date range must support 至今.');
assert.match(source, /leadSRProductTargetMode[\s\S]*商品编码/, 'Product detail behavior must support FA/product group/item code target modes.');
assert.match(source, /leadSRKeywordsSet[\s\S]*搜索关键词/, 'Search behavior must support comma-separated keywords in one input.');
assert.ok(
  !source.includes('leadSRKeywordAdd') &&
    !source.includes('leadSRKeywordDel') &&
    !source.includes('+ 添加关键词'),
  'Search behavior must not render or retain multiple keyword input controls.',
);
assert.ok(
  !source.includes('leadFFRowAdd') &&
    !source.includes('leadFFRowDel') &&
    !source.includes('+ 添加产品') &&
    !source.includes('选择有效质量时，至少填写一条产品类别和SQL金额'),
  'Feedback modal must remove product category dynamic rows and effective-lead amount requirement.',
);
assert.match(
  source,
  /SQL_AMOUNT_LIMITS\s*=\s*\{[\s\S]*?sqlAmountPc:\s*500[\s\S]*?sqlAmountSd:\s*50[\s\S]*?sqlAmountSs:\s*50/,
  'Feedback amount limits must match PC/SD/SS thresholds.',
);
assert.ok(
  !/SQL_AMOUNT_LIMITS\s*=\s*\{[^}]*sqlAmountSi/.test(source),
  'SI must not have an over-limit threshold.',
);
assert.match(
  source,
  /type="number"[^>]*min="0"[^>]*step="any"/,
  'Feedback amount inputs must support non-negative decimals.',
);
assert.match(
  source,
  /SQL_AMOUNT_FIELDS\.map\(f\s*=>\s*sortable\(f\.key,\s*f\.label\)\)/,
  'Lead list must render all four SQL amount columns.',
);
assert.match(
  source,
  /const headers\s*=\s*\[[\s\S]*?'SQL金额-PC（万元）'[\s\S]*?'SQL金额-SI（万元）'/,
  'CSV export must include all four SQL amount columns.',
);
assert.match(
  source,
  /function renderLeadDetailPage\(\)[\s\S]*?SQL_AMOUNT_FIELDS\.map\(f\s*=>\s*fld\(f\.label/,
  'Routed lead detail must display all four SQL amount fields.',
);
const convertProductPairs = [
  ['ThinkBook', '83'],
  ['TP Premium', '84'],
  ['Yangtian NB', '49'],
  ['Yangtian DT', '68'],
  ['ThinkCentre', '82'],
  ['RuiTian DT', 'R1'],
  ['RuiTian NB', 'R2'],
  ['服务', '46'],
  ['thinkplus', '86'],
  ['thinkplus RT', 'R3'],
  ['百应', '百应'],
];
convertProductPairs.forEach(([name, code]) => {
  assert.ok(source.includes(`name: '${name}', code: '${code}'`), `Missing ${name} -> ${code} mapping.`);
});
assert.match(source, /current\.startsWith\(item\.code \+ '-'\)/, 'Existing compound product codes must resolve by code prefix.');
assert.match(source, /id="cvt-product-code"[^>]*readonly/, 'Product code must be readonly.');
assert.match(source, /CVT\.productName\s*=\s*val\('cvt-product-name'\)/, 'Convert must save product name.');
assert.match(source, /CVT\.product\s*=\s*val\('cvt-product-code'\)/, 'Convert must save mapped product code.');
assert.ok(!source.includes("msHtml('product'"), 'Dashboard product filter control must be removed.');
assert.ok(!source.includes('filters.product'), 'Dashboard product filter calculation must be removed.');
assert.ok(!/kbFilters:\s*\{[^}]*product:/.test(source), 'Dashboard product filter state must be removed.');
const convertModelMarkers = [
  'T14', 'T16', 'T14p', 'T14s', 'T1g', 'T16g', 'P1', 'P14s', 'P16s', 'P16v', 'Lenovo P16v', 'R14', 'S2',
  'V14', 'V15', 'TB 14', 'TB 16', 'TB X', 'TB 14+', 'TB 16+', 'TB 16p', 'TB Plus Hybrid', 'ThinkBook Plus G7 Auto Twist',
  'M4000q', 'S660', 'M460', 'T4900K', '显示器', 'P900c', 'neo S500', 'P600',
  '瑞天100', '瑞天300', '瑞天500', '瑞天900', '瑞天T14', 'MA',
  'PC内采', 'AI主机-mini 100', 'AI主机 300', 'AI主机 Pro 700', 'PC外采', '工作站', '服务器', '微软', '其它',
];
convertModelMarkers.forEach((model) => assert.ok(source.includes(`'${model}'`), `Missing convert model ${model}.`));
assert.ok(source.includes("name: 'ThinkBook', code: '83'"), 'ThinkBook code must be updated to 83.');
assert.ok(source.includes("name: 'thinkplus RT', code: 'R3'"), 'thinkplus RT -> R3 mapping must exist.');
['86', 'R3', '46', '百应'].forEach((code) => {
  assert.match(source, new RegExp(`code: '${code}'[^}]*allowCustomModel: true`), `${code} must allow custom model input.`);
});
assert.match(source, /if\s*\(!group\.allowCustomModel\s*&&\s*!group\.models\.includes\(model\)\)/, 'Strict groups must reject models outside their mapping.');
assert.match(source, /CVT\.model\s*=\s*model/, 'Convert must save the selected or entered model.');
console.log('All required lead merge markers are present.');

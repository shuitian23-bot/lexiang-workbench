'use strict';

// Move actual business functions without widening their lexical environment.
// The surrounding classic script remains byte-for-byte intact outside the
// extracted function ranges. Runtime contract: factories[id](scope) returns the
// original implementation, and invoke(id, scope, receiver, args) applies it.
const path = require('path');
const crypto = require('crypto');
function dependency(name) {
  for (const root of [null, process.env.P0_NODE_MODULES,
    path.resolve(__dirname, '../../../four-step-20260904/tooling/node_modules')]) {
    try { return require(root ? path.join(root, name) : name); } catch (error) {
      if (error.code !== 'MODULE_NOT_FOUND') throw error;
    }
  }
  throw new Error('Missing extraction dependency: ' + name);
}
const acorn = dependency('acorn');
const eslintScope = dependency('eslint-scope');
const FUNCTION_TYPES = new Set(['FunctionDeclaration', 'FunctionExpression', 'ArrowFunctionExpression']);
const parse = source => acorn.parse(source, { ecmaVersion: 'latest', sourceType: 'script', ranges: true, locations: true });
function traverse(node, visit, parent = null) {
  if (!node || typeof node.type !== 'string') return;
  visit(node, parent);
  for (const [key, value] of Object.entries(node)) {
    if (key === 'loc' || key === 'range') continue;
    if (Array.isArray(value)) value.forEach(child => traverse(child, visit, node));
    else if (value && typeof value.type === 'string') traverse(value, visit, node);
  }
}
const within = (outer, inner) => inner.start >= outer.start && inner.end <= outer.end;
const overlapping = (a, b) => a.start < b.end && b.start < a.end;

const NAMED = {
  // Historical lexical names are accepted only with their semantic anchor.
  ie: ['modals/login', 'lx-auth-logo-wrap'],
  pe: ['modals/login-success', 'lx-auth-success-title'],
  Fs: ['modals/lead-form', 'leadScenario'],
  qn: ['modals/enterprise-auth', 'lxEnterpriseAuthForm'],
  Ca: ['modals/education-auth', '教育认证'],
  Pa: ['modals/workplace-auth', '企业职工认证'],
  Ze: ['modals/conversation-history', 'lx-history-modal'],
  as: ['pages/member-center', '会员中心'],
  ss: ['pages/coupon-center', 'asset:coupons'],
  is: ['pages/ledou-center', 'asset:points'],
  rs: ['pages/voucher-center', 'asset:vouchers'],
  ls: ['pages/red-envelope', 'asset:redpacket'],
  os: ['pages/device-list', '我的设备'],
  Ut: ['pages/solution-compare', 'solutionCompareRegistry'],
  Xt: ['pages/solution-compare', 'info:solution-compare:'],
  mountCompareAppend: ['pages/solution-compare', 'data-solution-compare-append'],
  tt: ['pages/product-list', '.product-card'],
  co: ['pages/product-list', 'data-reco-select'],
  oe: ['pages/product-compare', '.compare-page'],
  openConfig: ['modals/configuration-edit', 'lx-product-config-modal'],
  closeConfig: ['modals/configuration-edit', 'lx-order-modal-mask'],
  renderChoices: ['modals/configuration-edit', 'data-lx-config-grid'],
  openProfileEditorModal: ['modals/profile-edit'],
  openPhoneRebindModal: ['modals/profile-edit'],
  clearPhoneCodeCountdown: ['modals/profile-edit'],
  memberProfilePage: ['modals/profile-edit'],
  openStudentModal: ['modals/education-auth'],
  renderStudentModal: ['modals/education-auth'],
  submitDeviceBindModal: ['modals/device-bind'],
  runPurchasedDeviceBind: ['modals/device-bind'],
  runAddDeviceTask: ['modals/device-bind'],
  completePurchasedDeviceBindTransition: ['modals/device-bind'],
  openDiamondUpgrade: ['modals/diamond-upgrade'],
  onDiamondModalClick: ['modals/diamond-upgrade'],
  openEnterpriseMemberAuth: ['modals/diamond-upgrade', '钻石'],
  // Current native/Shadow DOM store flow (v70/v71), not the retired v66 wizard.
  storeListItem: ['pages/store-list'],
  renderStoreResults: ['pages/store-list'],
  openAppointmentSummary: ['modals/store-appointment-confirm'],
  openAppointmentSuccess: ['modals/store-appointment-confirm'],
  openAppointmentStoreStep: ['modals/store-select'],
  openAppointmentTimeStep: ['modals/arrival-time'],
  openAppointmentPurposeStep: ['modals/store-purpose'],
  openCouponUse: ['modals/store-coupon-verify'],
  openCouponDetail: ['modals/store-coupon-verify'],
  couponBarcodeMarkup: ['modals/store-coupon-verify'],
  couponQrMarkup: ['modals/store-coupon-verify'],
  openCouponCodeModal: ['modals/store-coupon-verify'],
  openCouponDetailModal: ['modals/store-coupon-verify'],
  openReserveConfirmModal: ['modals/store-appointment-confirm'],
  renderConfirmHtml: ['modals/store-appointment-confirm', 'lxst-confirm'],
  openReserveSuccessModal: ['modals/store-appointment-confirm'],
  renderSuccessHtml: ['modals/store-appointment-confirm', 'lxst-success'],
  confirmReservation: ['modals/store-appointment-confirm'],
  openWizardStep1: ['modals/store-select'],
  renderWizardStep1: ['modals/store-select'],
  renderWizardStep2: ['modals/arrival-time'],
  renderWizardStep3: ['modals/store-purpose'],
  renderModifyOrderHtml: ['modals/order-edit'],
  openModifyOrder: ['modals/order-edit'],
  showOrderEdit: ['modals/order-edit'],
  renderInvoiceHtml: ['modals/invoice-edit'],
  openInvoice: ['modals/invoice-edit'],
  showInvoiceEdit: ['modals/invoice-edit'],
  syncInvoiceDraft: ['modals/invoice-edit'],
  showInvoiceDelayPicker: ['modals/invoice-edit'],
  showInvoiceNotice: ['modals/invoice-edit'],
  renderPaymentHtml: ['modals/payment-processing'],
  openPayment: ['modals/payment-processing'],
  showPaymentProcessing: ['modals/payment-processing'],
  renderPaymentSuccessHtml: ['modals/payment-success'],
  showPaymentSuccess: ['modals/payment-success'],
  renderOrderDetailHtml: ['pages/order-detail'],
  renderOrderDetail: ['pages/order-detail'],
  openPaidOrderDetail: ['pages/order-detail'],
  renderOrderList: ['pages/order-list'],
  buildOrdersPage: ['pages/order-list'],
  openOrdersFromChat: ['pages/order-list'],
  orderCard: ['pages/order-list'],
  renderStoreTabHtml: ['pages/store-list'],
  renderStoreListRow: ['pages/store-list'],
  renderStoreCard: ['pages/store-list'],
  renderStoreDetailHtml: ['pages/store-detail'],
  openStoreDetail: ['pages/store-detail'],
  openMemberDevices: ['pages/device-list'],
  memberDevicesPage: ['pages/device-list'],
  memberDeviceListRow: ['pages/device-list'],
  openDeviceDetail: ['pages/device-detail'],
  memberDeviceDetailPage: ['pages/device-detail'],
  memberDeviceSpecificationsHtml: ['pages/device-detail'],
  memberPage: ['pages/member-center'],
  memberProfileHeader: ['pages/member-center'],
  memberAssetSummary: ['pages/member-center'],
  renderCouponRecords: ['pages/coupon-center'],
  couponProductsPage: ['pages/coupon-center'],
  renderRedpacketRecords: ['pages/red-envelope'],
  renderLedouRecords: ['pages/ledou-center'],
  ledouPage: ['pages/ledou-center'],
  ledouProductPage: ['pages/ledou-center'],
  ledouProductCard: ['pages/ledou-center'],
  memberLedouShowcase: ['pages/ledou-center'],
};

function nameOf(node, parents) {
  if (node.id?.name) return node.id.name;
  const parent = parents.get(node);
  if (parent?.type === 'VariableDeclarator' && parent.id.type === 'Identifier') return parent.id.name;
  return '';
}
function classify(node, source, sourceId, defaultOwner, parents) {
  const text = source.slice(node.start, node.end);
  const name = nameOf(node, parents);
  const named = NAMED[name];
  if (named && (!named[1] || text.includes(named[1]))) return { owner: named[0], reason: 'named:' + name, rank: 100 };
  // These anonymous callbacks contain the actual registration and profile flows.
  if (text.length < 12000 && text.includes('[data-auth-register-title]') && !text.includes('lx-auth-logo-wrap'))
    return { owner: 'modals/register', reason: 'auth-register-switch', rank: 105 };
  if (text.length < 5000 && text.includes('lx-auth-success-title'))
    return { owner: 'modals/login-success', reason: 'auth-success-render', rank: 110 };
  if (text.length < 22000 && text.includes('编辑个人资料') && text.includes('nickname') && !text.includes('lexiang:open-student-auth'))
    return { owner: 'modals/profile-edit', reason: 'profile-editor', rank: 90 };
  if (/order-modal-reference-config|buy-modal-direct/.test(sourceId) && /^(renderConfig|openConfig|closeConfig|showConfig)$/.test(name))
    return { owner: 'modals/configuration-edit', reason: 'order-configuration:' + name, rank: 100 };
  if (/buy-modal-direct/.test(sourceId) && name === 'orderHtml')
    return { owner: 'modals/order-payment-confirm', reason: 'checkout-order-markup', rank: 100 };
  if (/reco-match/.test(sourceId) && /^(analysis|render|open|ensure|close|decorate)$/.test(name))
    return { owner: 'modals/product-match', reason: 'product-match:' + name, rank: 100 };
  if (/notification-toast/.test(sourceId) && name)
    return { owner: 'modals/toast', reason: 'toast:' + name, rank: 100 };
  if (/recommendation-followups|answer-actions|app-agent|app-voice|app-lxfd|app-conv|stream-view|query-result-runtime|generation-control|thinking-auto|composer-|split-frame|conversation-location/.test(sourceId) && name)
    return { owner: 'shared/agent-content', reason: 'agent:' + name, rank: 40 };
  if (/product-detail/.test(sourceId) && name && !/order-modal/.test(sourceId))
    return { owner: 'pages/product-detail', reason: 'product-detail:' + name, rank: 40 };
  if (/p0-solution|solution-result|manufacturing-solution/.test(sourceId) && name)
    return { owner: /compare/i.test(name) ? 'pages/solution-compare' : /detail/i.test(name) ? 'pages/solution-detail' : 'pages/solution-list', reason: 'solution:' + name, rank: 40 };
  if (/comparison-display|compare-column|product-floor-compare/.test(sourceId) && name)
    return { owner: 'pages/product-compare', reason: 'product-compare:' + name, rank: 40 };
  // Dedicated owner fallback is deliberately limited to named functions. A
  // mixed root closure must not become a supposed "business extraction".
  if (defaultOwner && name && !/^(?:app\.js$|.*ref-sync|.*solution-original|app-brand)/.test(path.basename(sourceId)) && text.length < 60000)
    return { owner: defaultOwner, reason: 'dedicated-source:' + name, rank: 10 };
  return null;
}

function unsafeReason(node, parents, source, allReferences) {
  if (node.generator) return 'generator';
  if (node.params.some(param => param.type !== 'Identifier')) return 'non-simple-parameters';
  if (node.type === 'FunctionDeclaration' && !['Program', 'BlockStatement'].includes(parents.get(node)?.type)) return 'annex-b-declaration';
  const parent = parents.get(node);
  if (node.type === 'FunctionExpression' && parent && ['MethodDefinition', 'Property'].includes(parent.type) && (parent.method || parent.kind !== 'init')) return 'method-or-accessor';
  let reason = '';
  traverse(node, child => {
    if (reason) return;
    if (child.type === 'Super' || child.type === 'MetaProperty') reason = 'super-or-meta-property';
    if (child.type === 'ClassDeclaration' || child.type === 'ClassExpression') reason = 'class';
    if (child.type === 'CallExpression' && child.callee.type === 'Identifier' && child.callee.name === 'eval') reason = 'eval';
    if (node.type === 'ArrowFunctionExpression' && (child.type === 'ThisExpression' || child.type === 'Identifier' && child.name === 'arguments')) reason = 'arrow-lexical-receiver';
  });
  if (reason) return reason;
  // A dispatched implementation would have a separate prototype. No constructor
  // or identity-dependent function is moved.
  const name = nameOf(node, parents);
  if (name && allReferences.some(ref => ref.identifier.name === name &&
    parents.get(ref.identifier)?.type === 'NewExpression' && parents.get(ref.identifier).callee === ref.identifier)) return 'constructor-use';
  if (name && new RegExp('\\b' + name.replace(/[$]/g, '\\$') + '\\s*\\.\\s*(?:prototype|caller|arguments)\\b').test(source)) return 'function-introspection';
  return '';
}

function extract(source, sourceId, defaultOwner = null) {
  const ast = parse(source);
  const parents = new WeakMap(), functions = [];
  traverse(ast, (node, parent) => { parents.set(node, parent); if (FUNCTION_TYPES.has(node.type)) functions.push(node); });
  const manager = eslintScope.analyze(ast, { ecmaVersion: 2022, sourceType: 'script', optimistic: true, ignoreEval: false, impliedStrict: false });
  const references = manager.scopes.flatMap(scope => scope.references);
  const candidates = [], skipped = [];
  for (const node of functions) {
    const business = classify(node, source, sourceId, defaultOwner, parents);
    if (!business || business.owner === defaultOwner) continue;
    const reason = unsafeReason(node, parents, source, references);
    const summary = { owner: business.owner, name: nameOf(node, parents) || '(anonymous)', line: node.loc.start.line };
    if (reason) skipped.push({ ...summary, reason });
    else candidates.push({ node, business, summary });
  }
  // Extract precise inner handlers before a broader outer flow. Extracting both
  // would require compiling a second lexical closure; retaining the outer flow
  // in place preserves state and gives the inner module real responsibility.
  candidates.sort((a, b) => b.business.rank - a.business.rank || (a.node.end - a.node.start) - (b.node.end - b.node.start));
  const selected = [];
  for (const candidate of candidates) {
    if (selected.some(item => overlapping(candidate.node, item.node))) {
      skipped.push({ ...candidate.summary, reason: 'overlapping-extraction' });
    } else selected.push(candidate);
  }
  const implementations = [], sourceEdits = [];
  for (const { node, business, summary } of selected.sort((a, b) => a.node.start - b.node.start)) {
    const fnScope = manager.acquire(node) || manager.scopes.find(scope => scope.block === node);
    const deps = new Map();
    const identifierEdits = [];
    let scopeName = '__p0Scope';
    const body = source.slice(node.start, node.end);
    while (new RegExp('\\b' + scopeName + '\\b').test(body)) scopeName += '_';
    let skippedWith = false;
    for (const ref of references) {
      const id = ref.identifier;
      if (!within(node, id) || !ref.resolved) continue;
      const variable = ref.resolved;
      if (within(node, variable.scope.block)) continue;
      if (variable.name === 'arguments' && node.type !== 'ArrowFunctionExpression') continue;
      if (variable.scope.type === 'with') { skippedWith = true; break; }
      if (!deps.has(variable.name)) deps.set(variable.name, { name: variable.name, read: false, write: false });
      const dep = deps.get(variable.name); dep.read ||= ref.isRead(); dep.write ||= ref.isWrite();
      const parent = parents.get(id);
      let replacement = scopeName + '.' + variable.name;
      if (parent && ((parent.type === 'CallExpression' && parent.callee === id) || (parent.type === 'TaggedTemplateExpression' && parent.tag === id))) replacement = '(0,' + replacement + ')';
      if (parent?.type === 'Property' && parent.shorthand && parent.value === id) replacement = source.slice(parent.key.start, parent.key.end) + ':' + replacement;
      // Destructuring assignment defaults: ({outer = 1} = object).
      if (parent?.type === 'AssignmentPattern') {
        const property = parents.get(parent);
        if (property?.type === 'Property' && property.shorthand && parent.left === id) replacement = source.slice(property.key.start, property.key.end) + ':' + replacement;
      }
      identifierEdits.push({ start: id.start - node.start, end: id.end - node.start, value: replacement });
    }
    if (skippedWith) { skipped.push({ ...summary, reason: 'with-scope' }); continue; }
    // eslint-scope can describe the same read/write identifier twice; edit once.
    const uniqueEdits = [...new Map(identifierEdits.map(edit => [edit.start + ':' + edit.end, edit])).values()];
    let implementation = applyEdits(body, uniqueEdits);
    const strict = Boolean(fnScope?.isStrict);
    const factory = 'function(' + scopeName + '){' + (strict ? '"use strict";' : '') + 'return (' + implementation + '); }';
    parse('(' + factory + ')');
    const id = business.owner + '#' + (nameOf(node, parents) || 'anonymous') + ':' + crypto.createHash('sha256').update(factory).digest('hex').slice(0, 24);
    const context = '{' + [...deps.values()].map(dep => 'get [' + JSON.stringify(dep.name) + '](){return ' + dep.name + '}' +
      (dep.write ? ',set [' + JSON.stringify(dep.name) + '](__p0Value){' + dep.name + '=__p0Value}' : '')).join(',') + '}';
    const params = node.params.map(param => source.slice(param.start, param.end)).join(',');
    const arrow = node.type === 'ArrowFunctionExpression';
    const invocation = 'window.__p0Modules.invoke(' + JSON.stringify(id) + ',' + context + ',' + (arrow ? 'undefined,[' + params + ']' : 'this,arguments') + ')';
    const wrapper = arrow ? (node.async ? 'async ' : '') + '(' + params + ')=>' + invocation :
      (node.async ? 'async ' : '') + 'function' + (node.id?.name ? ' ' + node.id.name : '') + '(' + params + '){return ' + invocation + ';}';
    sourceEdits.push({ start: node.start, end: node.end, value: wrapper });
    implementations.push({ owner: business.owner, id, code: factory, dependencies: [...deps.keys()], dependencyAccess: [...deps.values()],
      name: nameOf(node, parents) || '(anonymous)', line: node.loc.start.line, reason: business.reason, strict, async: node.async, originalBytes: Buffer.byteLength(body) });
  }
  const rewrittenSource = applyEdits(source, sourceEdits);
  parse(rewrittenSource);
  const owners = {};
  for (const item of implementations) owners[item.owner] = (owners[item.owner] || 0) + 1;
  return { source: rewrittenSource, implementations, report: { sourceId, extracted: implementations.length, owners, skipped,
    originalBytes: Buffer.byteLength(source), rewrittenBytes: Buffer.byteLength(rewrittenSource) } };
}
function applyEdits(source, edits) {
  let result = source;
  for (const edit of [...edits].sort((a, b) => b.start - a.start)) result = result.slice(0, edit.start) + edit.value + result.slice(edit.end);
  return result;
}
module.exports = { extract, classify, parse };

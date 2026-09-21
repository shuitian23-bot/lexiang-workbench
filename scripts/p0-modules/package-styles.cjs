'use strict';

// Move real stylesheet rules to their business owners while retaining an ordered
// list of parts for each original cascade slot. The deliberately unknown media
// feature keeps the transport stylesheet inert. The runtime installs its inner
// CSS rules at the original link/style position, not at the package position.
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

function loadPostcss() {
  const candidates = [
    process.env.P0_POSTCSS_PATH,
    'postcss',
    path.resolve(__dirname, '../../../four-step-20260904/tooling/node_modules/postcss'),
  ].filter(Boolean);
  for (const candidate of candidates) {
    try { return require(candidate); } catch (error) {
      if (error.code !== 'MODULE_NOT_FOUND') throw error;
    }
  }
  throw new Error('package-styles requires postcss; set P0_POSTCSS_PATH to its installed directory.');
}
const postcss = loadPostcss();
const ownerIds = {
  pages: ['home', 'consumer-home', 'smb-home', 'enterprise-home', 'brand-home', 'product-list', 'solution-list', 'store-list', 'device-list', 'product-detail', 'solution-detail', 'store-detail', 'device-detail', 'product-compare', 'solution-compare', 'order-list', 'order-detail', 'member-center', 'coupon-center', 'voucher-center', 'red-envelope', 'ledou-center'],
  modals: ['login', 'register', 'login-success', 'lead-form', 'education-auth', 'workplace-auth', 'enterprise-auth', 'diamond-upgrade', 'profile-edit', 'store-appointment-confirm', 'store-select', 'arrival-time', 'store-purpose', 'order-payment-confirm', 'order-edit', 'configuration-edit', 'invoice-edit', 'payment-processing', 'payment-success', 'store-coupon-verify', 'product-match', 'device-bind', 'toast', 'conversation-history'],
  shared: ['common', 'agent-content'],
};
const validOwners = new Set(Object.entries(ownerIds).flatMap(([group, ids]) => ids.map(id => `${group}/${id}`)));

// Specific dialog/state selectors precede the page that opens them. A selector
// that does not identify a component retains its caller-supplied source owner.
const ownership = [
  ['modals/register', /register-active|data-auth-(?:mode|tab)\s*=\s*["']?register|auth-register|registration-form/i],
  ['modals/login-success', /auth-success|login-success|login-complete/i],
  ['modals/diamond-upgrade', /lx-diamond-|diamond-upgrade|diamond-application/i],
  ['modals/enterprise-auth', /enterprise-member-auth|lxEnterpriseAuthOriginal|enterprise-auth|enterprise-cert/i],
  ['modals/workplace-auth', /lx-wpa-|workplace-auth|workplace-cert/i],
  ['modals/education-auth', /lx-stuauth|lx-edu-(?:auth|success)|student-auth|education-auth/i],
  ['modals/profile-edit', /is-profile-editor|data-profile-parity|leai-profile-|lx-global-profile-|member-profile-edit/i],
  ['modals/lead-form', /lx-lead-|lx-enterprise-lead|lead-modal|lead-form/i],
  ['modals/store-coupon-verify', /lxst-coupon-code|coupon-(?:verify|redeem|verification)|store-coupon/i],
  ['modals/store-select', /store-(?:select|picker|choose)|lxst-store-list|lx-appointment-store-|data-(?:store|appointment)-view\s*=\s*["']?(?:select|stores)/i],
  ['modals/arrival-time', /arrival-time|visit-time|time-picker|appointment-(?:time|date)|lxst-(?:time|date)|lx-(?:date|time)-(?:grid|option)|data-(?:store|appointment)-view\s*=\s*["']?(?:time|date)/i],
  ['modals/store-purpose', /store-purpose|appointment-purpose|visit-purpose|lxst-purpose|lx-purpose-|data-(?:store|appointment)-view\s*=\s*["']?purpose/i],
  ['modals/store-appointment-confirm', /lx-appointment-|appointment-(?:confirm|modal|dialog)|lxst-(?:confirm|modal|mask|dialog)|lxsv5-appointment|store-appointment/i],
  ['modals/invoice-edit', /invoice|fapiao/i],
  ['modals/configuration-edit', /(?:sku|config)-(?:modal|dialog|sheet)|edit-config|data-checkout-view\s*=\s*["']?(?:config|sku)|lx-buy-direct-config|lxof-config/i],
  ['modals/payment-success', /payment-success|pay-success|lx-checkout5-result|data-checkout-view\s*=\s*["']?result|paid-order-result/i],
  ['modals/payment-processing', /payment-processing|pay-processing|scanpay|scan-pay|lx-checkout5-pay-|data-checkout-view\s*=\s*["']?payment|pay-qrcode/i],
  ['modals/order-edit', /order-edit|edit-order|data-checkout-view\s*=\s*["']?edit|lxof-edit/i],
  ['modals/order-payment-confirm', /lxof-pay-confirm|lx-buy-direct|lx-order-modal|lx-order-skin|lx-checkout5|lxof-/i],
  ['modals/product-match', /reco-match|product-match|match-(?:dialog|modal|popover)/i],
  ['modals/device-bind', /device-bind|bind-device|binding-device|bind-(?:dialog|modal)/i],
  ['modals/toast', /toast|notification-(?:notice|popup)/i],
  ['modals/conversation-history', /(?:lx|lxfd|assistant)-history|history-(?:modal|popover|search|list|row|pagination|sidebar)/i],
  ['modals/login', /lx-auth-|auth-dialog|auth-modal|login-(?:form|dialog|modal)/i],
  ['pages/solution-compare', /solution-compare|lx-cmp-axis/i],
  ['pages/product-compare', /product-compare|compare-(?:table|column|page|header|body)|\.comparison\b/i],
  ['pages/solution-detail', /solution-detail|solution-article/i],
  ['pages/solution-list', /solution-(?:result|list|card|grid|tabs)|industry-solution/i],
  ['pages/store-detail', /store-detail|lxsv5-detail|store-map/i],
  ['pages/store-list', /store-(?:list|card|grid|result|page)|lxsv5-|lx-store-/i],
  ['pages/device-detail', /device-detail|device-(?:warranty|service-detail)/i],
  ['pages/device-list', /device-(?:list|card|grid|page|empty)|leai-device-/i],
  ['pages/order-detail', /order-detail|order-(?:logistics|tracking)/i],
  ['pages/order-list', /order-(?:center|list|card|page|tabs|empty)|lx-orders/i],
  ['pages/voucher-center', /voucher|cash-coupon/i],
  ['pages/red-envelope', /red-envelope|redpacket|red-packet|hongbao/i],
  ['pages/ledou-center', /ledou|bean-(?:page|list|ledger|card)|points-(?:page|list|ledger)/i],
  ['pages/coupon-center', /coupon-(?:center|page|grid|card|list|detail|products|product|actions|copy|value|state|rule)/i],
  ['pages/member-center', /leai-member|member-(?:page|center|asset|benefit|insight|ledger|service)|leai-asset/i],
  ['pages/product-detail', /product-detail|data-view\s*=\s*["']?detail|\.detail-|lx-detail-|lx-spu-|product-(?:spec|review|benefit)/i],
  ['pages/product-list', /product-(?:card|floor|grid|list)|reco-(?:product|grid|list)|recommendation-(?:card|list)/i],
  ['shared/agent-content', /lxfd-|lx-p0-message|\.ai-body|\.msg\b|assistant-|composer|followup|follow-up|answer-|skill-trace|streaming|thinking|generation|typing-/i],
];

function normalizeOwner(owner) {
  const normalized = String(owner || 'shared/common').replace(/^(?:scripts\/p0-package-architecture|(?:public\/leaip0\/)?modules)\//, '').replace(/\/index\.(?:css|js)$/, '');
  if (!validOwners.has(normalized)) throw new Error(`Unknown CSS owner: ${owner}`);
  return normalized;
}

function selectorOwner(selector, fallback) {
  for (const [owner, pattern] of ownership) if (pattern.test(selector)) return owner;
  return fallback;
}

function nodeOwner(node, fallback) {
  if (node.type === 'rule') {
    const owners = new Set(node.selectors.map(selector => selectorOwner(selector, fallback)));
    return owners.size === 1 ? [...owners][0] : 'shared/common';
  }
  if (node.type === 'atrule') {
    if (/^(?:-webkit-)?keyframes$/i.test(node.name)) return selectorOwner(node.params, fallback);
    const owners = new Set();
    node.walkRules(rule => {
      // Keyframe selectors such as "from" and "60%" are not component selectors.
      if (rule.parent.type === 'atrule' && /keyframes$/i.test(rule.parent.name)) return;
      for (const selector of rule.selectors) owners.add(selectorOwner(selector, fallback));
    });
    return owners.size === 1 ? [...owners][0] : owners.size > 1 ? 'shared/common' : fallback;
  }
  return fallback;
}

function cssUnescape(value) {
  return value.replace(/\\(?:([0-9a-fA-F]{1,6})(?:\r\n|[\t\n\r\f ])?|([\s\S]))/g, (_, hex, char) => {
    if (hex) {
      const code = parseInt(hex, 16);
      return code === 0 || code > 0x10ffff || code >= 0xd800 && code <= 0xdfff ? '\ufffd' : String.fromCodePoint(code);
    }
    return /[\r\n\f]/.test(char) ? '' : char;
  });
}

function rebaseUrls(value, base, report) {
  // URLs in quoted strings are consumed as one token; escaped quotes, spaces and
  // parentheses remain valid. Do not apply a raw url(...) regex inside strings.
  const token = /"(?:\\[\s\S]|[^"\\])*"|'(?:\\[\s\S]|[^'\\])*'|\/\*[\s\S]*?\*\/|url\(\s*(?:"((?:\\[\s\S]|[^"\\])*)"|'((?:\\[\s\S]|[^'\\])*)'|((?:\\[\s\S]|[^)\\])*))\s*\)/gi;
  return value.replace(token, (match, double, single, unquoted) => {
    if (!/^url\(/i.test(match)) return match;
    const raw = cssUnescape(double ?? single ?? (unquoted || '').trim());
    if (!raw || /^(?:[a-z][a-z\d+.-]*:|\/|#)/i.test(raw)) return match;
    const resolved = new URL(raw, base);
    report.rebasedUrls += 1;
    return `url(${JSON.stringify(resolved.origin === base.origin ? resolved.pathname + resolved.search + resolved.hash : resolved.href)})`;
  });
}

function readSource(source) {
  if (typeof source !== 'string') throw new TypeError('CSS entry.source must be CSS text or a file path.');
  if (source.length < 4096 && !/[\n\r{}]/.test(source) && fs.existsSync(source) && fs.statSync(source).isFile()) return fs.readFileSync(source, 'utf8');
  return source;
}

function packageStyles(entries) {
  if (!Array.isArray(entries)) throw new TypeError('packageStyles(entries) expects an array.');
  const owners = Object.fromEntries([...validOwners].map(owner => [owner, '']));
  const slots = {};
  const report = { entryCount: 0, ruleCount: 0, partCount: 0, uniquePartCount: 0, reusedPartCount: 0, deduplicatedBytes: 0, rebasedUrls: 0, removedCharsets: 0, entries: [], owners: {} };
  const seenParts = new Map();
  for (const entry of entries) {
    if (!entry || typeof entry.id !== 'string' || !entry.id) throw new Error('Every CSS entry needs a nonempty string id.');
    if (Object.hasOwn(slots, entry.id)) throw new Error(`Duplicate CSS slot: ${entry.id}`);
    const source = readSource(entry.source);
    const fallback = normalizeOwner(entry.defaultOwner);
    const base = new URL(entry.url || '/', 'https://p0.leaibot.cn');
    const root = postcss.parse(source, { from: entry.url || entry.id });
    root.walkAtRules(rule => {
      const name = rule.name.toLowerCase();
      if (name === 'import' || name === 'namespace' || name === 'layer') throw new Error(`Cannot safely transport @${name}: ${entry.id}`);
      if (name === 'charset') { rule.remove(); report.removedCharsets += 1; }
    });
    root.walkDecls(declaration => {
      // Bare image-set strings also resolve relative to a stylesheet. Require
      // explicit handling if one appears, instead of silently changing its URL.
      if (/(?:-webkit-)?image-set\s*\(\s*["']/i.test(declaration.value)) throw new Error(`Review image-set string URL before packaging: ${entry.id}`);
      declaration.value = rebaseUrls(declaration.value, base, report);
    });
    const runs = [];
    let leadingComments = [];
    for (const node of root.nodes) {
      if (node.type === 'comment') { leadingComments.push(node); continue; }
      if (node.type !== 'rule' && node.type !== 'atrule') throw new Error(`Unexpected top-level CSS ${node.type}: ${entry.id}`);
      const owner = nodeOwner(node, fallback);
      let run = runs[runs.length - 1];
      if (!run || run.owner !== owner) { run = { owner, nodes: [] }; runs.push(run); }
      run.nodes.push(...leadingComments, node);
      leadingComments = [];
      report.ruleCount += 1;
    }
    if (leadingComments.length && runs.length) runs[runs.length - 1].nodes.push(...leadingComments);
    slots[entry.id] = [];
    const entryReport = { id: entry.id, sourceHash: crypto.createHash('sha256').update(source).digest('hex'), rules: runs.reduce((sum, run) => sum + run.nodes.filter(node => node.type !== 'comment').length, 0), parts: runs.length };
    runs.forEach(run => {
      const media = postcss.atRule({ name: 'media', params: '(-p0-part: pending)' });
      for (const node of run.nodes) media.append(node.clone());
      // Share only byte-identical runs owned by the same business module. Each
      // legacy slot still references every occurrence at its original position;
      // this removes duplicate transport bytes, never duplicate cascade rules.
      const identity = run.owner + '\0' + media.toString();
      const part = 'p' + crypto.createHash('sha256').update(identity).digest('hex').slice(0, 20);
      const previous = seenParts.get(part);
      if (previous !== undefined && previous !== identity) throw new Error(`CSS part hash collision: ${part}`);
      media.params = `(-p0-part: ${part})`;
      const output = media.toString() + '\n';
      if (previous === undefined) {
        seenParts.set(part, identity);
        owners[run.owner] += output;
        report.uniquePartCount += 1;
      } else {
        report.reusedPartCount += 1;
        report.deduplicatedBytes += Buffer.byteLength(output);
      }
      slots[entry.id].push({ owner: run.owner, part });
      report.owners[run.owner] = (report.owners[run.owner] || 0) + run.nodes.filter(node => node.type !== 'comment').length;
      report.partCount += 1;
    });
    report.entries.push(entryReport);
    report.entryCount += 1;
  }
  report.emptyOwners = [...validOwners].filter(owner => !owners[owner]);
  return { owners, slots, report };
}

module.exports = { packageStyles, normalizeOwner, classifySelector: selectorOwner };

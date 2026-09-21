'use strict';

// Extract values assigned to actual STYLE elements, not HTML/content strings.
// Resolve only side-effect-free static expressions. In particular, legacy store
// styles are sliced by character offsets: evaluate those slices before replacing
// the final textContent value, never normalize the original CSS constant first.
const path = require('path');
const crypto = require('crypto');
const vm = require('vm');
function dependency(name) {
  for (const root of [null, process.env.P0_NODE_MODULES, path.resolve(__dirname, '../../../four-step-20260904/tooling/node_modules')]) {
    try { return require(root ? path.join(root, name) : name); } catch (error) {
      if (error.code !== 'MODULE_NOT_FOUND') throw error;
    }
  }
  throw new Error('Missing inline-style extraction dependency: ' + name);
}
const acorn = dependency('acorn');
const eslintScope = dependency('eslint-scope');
const postcss = dependency('postcss');
const UNKNOWN = Symbol('unknown');
const parse = source => acorn.parse(source, { ecmaVersion: 'latest', sourceType: 'script', ranges: true, locations: true });
const within = (outer, inner) => inner.start >= outer.start && inner.end <= outer.end;
function property(node) {
  if (!node || node.type !== 'MemberExpression') return null;
  return node.computed ? node.property.type === 'Literal' ? node.property.value : null : node.property.name;
}
function traverse(node, fn, parent = null) {
  if (!node || typeof node.type !== 'string') return;
  fn(node, parent);
  for (const [key, value] of Object.entries(node)) {
    if (key === 'range' || key === 'loc') continue;
    if (Array.isArray(value)) value.forEach(child => traverse(child, fn, node));
    else if (value && typeof value.type === 'string') traverse(value, fn, node);
  }
}
function looksLikeCss(value) {
  if (typeof value !== 'string' || !value.includes('{') || !value.includes('}')) return false;
  try {
    const root = postcss.parse(value);
    return root.nodes.some(node => node.type === 'rule' || node.type === 'atrule') && !root.nodes.some(node => node.type === 'decl');
  } catch { return false; }
}

function extractInlineStyles(source, sourceId, defaultOwner, options = {}) {
  const ast = parse(source);
  const manager = eslintScope.analyze(ast, { ecmaVersion: 2022, sourceType: 'script', optimistic: true, ignoreEval: true });
  const bindings = new Map(), parents = new Map(), nodes = [], variables = new Set(), declarations = new Map();
  for (const scope of manager.scopes) {
    for (const variable of scope.variables) {
      variables.add(variable);
      for (const definition of variable.defs) {
        if (definition.name) bindings.set(definition.name, variable);
        if (definition.node.type === 'VariableDeclarator') declarations.set(variable, definition.node);
      }
      for (const reference of variable.references) bindings.set(reference.identifier, variable);
    }
    for (const reference of scope.references) if (reference.resolved) bindings.set(reference.identifier, reference.resolved);
  }
  traverse(ast, (node, parent) => { nodes.push(node); if (parent) parents.set(node, parent); });
  const immutable = variable => variable && variable.defs.length === 1 && !variable.references.some(reference => reference.isWrite() && !reference.init);
  function staticValue(node, used = new Set(), stack = new Set()) {
    if (!node) return UNKNOWN;
    if (node.type === 'Literal') return node.regex ? new RegExp(node.regex.pattern, node.regex.flags) : node.value;
    if (node.type === 'Identifier') {
      const variable = bindings.get(node), declaration = declarations.get(variable);
      if (!immutable(variable) || !declaration?.init || stack.has(variable)) return UNKNOWN;
      used.add(variable); stack.add(variable);
      const value = staticValue(declaration.init, used, stack); stack.delete(variable); return value;
    }
    if (node.type === 'TemplateLiteral') {
      let text = node.quasis[0].value.cooked;
      if (text === null) return UNKNOWN;
      for (let i = 0; i < node.expressions.length; i += 1) {
        const value = staticValue(node.expressions[i], used, stack);
        if (value === UNKNOWN || value !== null && typeof value === 'object' || node.quasis[i + 1].value.cooked === null) return UNKNOWN;
        text += String(value) + node.quasis[i + 1].value.cooked;
      }
      return text;
    }
    if (node.type === 'BinaryExpression' && node.operator === '+') {
      const left = staticValue(node.left, used, stack), right = staticValue(node.right, used, stack);
      if (left === UNKNOWN || right === UNKNOWN || left !== null && typeof left === 'object' || right !== null && typeof right === 'object') return UNKNOWN;
      return left + right;
    }
    if (node.type === 'UnaryExpression' && node.operator === '-') {
      const value = staticValue(node.argument, used, stack); return typeof value === 'number' ? -value : UNKNOWN;
    }
    if (node.type === 'ArrayExpression') {
      const values = node.elements.map(element => staticValue(element, used, stack));
      return values.includes(UNKNOWN) ? UNKNOWN : values;
    }
    if (node.type === 'CallExpression' && node.callee.type === 'MemberExpression') {
      const method = property(node.callee);
      if (!['slice', 'substring', 'substr', 'indexOf', 'lastIndexOf', 'replace', 'replaceAll', 'concat', 'join', 'trim'].includes(method)) return UNKNOWN;
      const receiver = staticValue(node.callee.object, used, stack);
      const args = node.arguments.map(argument => staticValue(argument, used, stack));
      if (receiver === UNKNOWN || args.includes(UNKNOWN) || typeof receiver !== 'string' && !Array.isArray(receiver)) return UNKNOWN;
      if (typeof receiver[method] !== 'function') return UNKNOWN;
      try { return receiver[method](...args); } catch { return UNKNOWN; }
    }
    return UNKNOWN;
  }
  const createdStyle = node => node?.type === 'CallExpression' && property(node.callee) === 'createElement' && node.arguments[0]?.type === 'Literal' && String(node.arguments[0].value).toLowerCase() === 'style';
  const styleBindings = new Set();
  for (const node of nodes) {
    if (node.type === 'VariableDeclarator' && node.id.type === 'Identifier' && createdStyle(node.init)) styleBindings.add(bindings.get(node.id));
    if (node.type === 'AssignmentExpression' && node.operator === '=' && node.left.type === 'Identifier' && createdStyle(node.right)) styleBindings.add(bindings.get(node.left));
  }
  styleBindings.delete(undefined);
  let changed = true;
  while (changed) {
    changed = false;
    for (const [variable, declaration] of declarations) {
      if (immutable(variable) && declaration.init?.type === 'Identifier' && styleBindings.has(bindings.get(declaration.init)) && !styleBindings.has(variable)) { styleBindings.add(variable); changed = true; }
    }
  }
  const sinks = nodes.filter(node => node.type === 'AssignmentExpression' && ['=', '+='].includes(node.operator) && property(node.left) === 'textContent' && node.left.object.type === 'Identifier' && styleBindings.has(bindings.get(node.left.object)));
  const entries = [], replacements = [], touched = new Set();
  const report = { extracted: 0, extractedBytes: 0, clearedConstants: 0, dynamicBlocks: [], injectCalls: 0, documentBase: options.documentBase || '/assets/templates/' };
  const extractedRanges = new Set();
  function attempt(node, kind) {
    const used = new Set(), value = staticValue(node, used);
    if (value === UNKNOWN) {
      report.dynamicBlocks.push({ sourceId, line: node.loc.start.line, kind, preview: source.slice(node.start, Math.min(node.end, node.start + 100)) }); return false;
    }
    if (!looksLikeCss(value)) return false;
    const range = `${node.start}:${node.end}`;
    if (extractedRanges.has(range)) return true;
    if (replacements.some(replacement => within(replacement, node) || within(node, replacement))) return false;
    extractedRanges.add(range);
    const id = '/@script-style/' + crypto.createHash('sha256').update(String(sourceId) + '\0' + node.start + '\0' + value).digest('hex').slice(0, 24) + '.css';
    entries.push({ id, url: report.documentBase, source: value, defaultOwner });
    replacements.push({ start: node.start, end: node.end, value: `window.__p0Modules.styleText(${JSON.stringify(id)})` });
    used.forEach(variable => touched.add(variable));
    report.extracted += 1; report.extractedBytes += Buffer.byteLength(value); return true;
  }
  for (const sink of sinks) attempt(sink.right, 'style.textContent');

  // A helper's name alone is insufficient. Its parameter must feed the proven
  // STYLE textContent assignment, and calls must resolve to that same function.
  const helperParameters = new Map();
  for (const sink of sinks) {
    if (sink.right.type !== 'Identifier') continue;
    const parameter = bindings.get(sink.right);
    const definition = parameter?.defs.find(definition => definition.type === 'Parameter');
    if (!definition) continue;
    if (parameter.references.some(reference => !sinks.some(candidate => candidate.right === reference.identifier))) continue;
    const fn = definition.node;
    const index = fn.params.findIndex(param => param.type === 'Identifier' && bindings.get(param) === parameter);
    if (index < 0) continue;
    let functionVariable;
    if (fn.id) functionVariable = bindings.get(fn.id);
    const parent = parents.get(fn);
    if (!functionVariable && parent?.type === 'VariableDeclarator' && parent.id.type === 'Identifier') functionVariable = bindings.get(parent.id);
    if (!functionVariable) continue;
    if (!helperParameters.has(functionVariable)) helperParameters.set(functionVariable, new Set());
    helperParameters.get(functionVariable).add(index);
  }
  for (const node of nodes) {
    if (node.type !== 'CallExpression' || node.callee.type !== 'Identifier') continue;
    const indices = helperParameters.get(bindings.get(node.callee));
    if (indices) for (const index of indices) if (node.arguments[index] && attempt(node.arguments[index], 'style helper argument')) report.injectCalls += 1;
  }

  // Once every reference is replaced (or only used to compute another dead
  // static constant), discard the original CSS string so JS retains no duplicate
  // style implementation. Keep declaration identity for lexical compatibility.
  const removable = new Set(touched);
  let reduced = true;
  while (reduced) {
    reduced = false;
    for (const variable of [...removable]) {
      const live = variable.references.some(reference => {
        if (reference.init) return false;
        const identifier = reference.identifier;
        if (replacements.some(replacement => within(replacement, identifier))) return false;
        for (const dependent of removable) {
          const init = declarations.get(dependent)?.init;
          if (init && within(init, identifier)) return false;
        }
        return true;
      });
      if (live) { removable.delete(variable); reduced = true; }
    }
  }
  for (const variable of removable) {
    const init = declarations.get(variable)?.init;
    if (!init || replacements.some(replacement => within(replacement, init) || within(init, replacement))) continue;
    const value = staticValue(init);
    if (looksLikeCss(value)) {
      replacements.push({ start: init.start, end: init.end, value: '"" /* styles owned by P0 CSS modules */' });
      report.clearedConstants += 1;
    }
  }
  let output = source;
  for (const replacement of replacements.sort((a, b) => b.start - a.start)) output = output.slice(0, replacement.start) + replacement.value + output.slice(replacement.end);
  parse(output);
  new vm.Script(output, { filename: String(sourceId) });
  return { source: output, entries, report };
}

module.exports = { extractInlineStyles };

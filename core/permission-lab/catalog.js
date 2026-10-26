'use strict';

// Local development only. Reuse the trusted, versioned Vue POC catalog instead
// of accepting permission definitions from a browser or duplicating the catalog.
const fs = require('node:fs');
const path = require('node:path');
const Module = require('node:module');
function loadCatalog() {
  const ts = require('../../vue-app/node_modules/typescript');
  const filename = path.resolve(__dirname, '../../vue-app/src/components/permissions/permissionScopeCatalog.ts');
  const source = fs.readFileSync(filename, 'utf8');
  const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } });
  const compiledModule = new Module(filename, module);
  compiledModule._compile(compiled.outputText, filename);
  const catalog = compiledModule.exports.createPermissionScopeCatalog();
  const { detectCustomDataRoleConflicts } = require('../../vue-app/src/components/permissions/customDataRoleConflict.js');
  return { ...catalog, detectCustomDataRoleConflicts };
}
module.exports = { loadCatalog };

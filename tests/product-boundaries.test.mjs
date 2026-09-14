import assert from 'node:assert/strict';
import test from 'node:test';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { audit, importsOf } from '../scripts/check-product-boundaries.mjs';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const contract = JSON.parse(fs.readFileSync(path.join(root, 'docs/product-boundaries.json'), 'utf8'));
test('all domain modules and Logistics UI closure respect declared boundaries', () => {
  assert.deepEqual(audit(root, contract).errors, []);
});
test('AST scanner includes type imports, reexports and dynamic/commonjs dependencies, not comments', () => {
  assert.deepEqual(importsOf(`// import 'fake';\nimport type {T} from './types'; export * from './other'; import('./lazy'); require('./legacy'); import(variable); import a = require('./equals');`), ['./types','./other','./lazy','./legacy',null,'./equals']);
});
test('removing an allowed shared helper is detected transitively', () => {
  const altered = structuredClone(contract);
  altered.logistics.files = altered.logistics.files.filter(file => !file.endsWith('/trial-notice.tsx'));
  assert.ok(audit(root, altered).errors.some(error => error.includes('forbidden dependency') && error.includes('trial-notice.tsx')));
});
test('undeclared external dependencies fail closed', () => {
  const altered = structuredClone(contract);
  altered.logistics.externals = [];
  assert.ok(audit(root, altered).errors.some(error => error.includes('undeclared external react')));
});

import assert from 'node:assert/strict';
import test from 'node:test';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { audit } from '../scripts/check-product-boundaries.mjs';
import { balanceNavigationHref, parseBalanceNavigation } from '../apps/tender-balance/src/balance-sheet-navigation.ts';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const contract = JSON.parse(fs.readFileSync(path.join(root, 'docs/product-boundaries.json'), 'utf8'));
const read = relative => fs.readFileSync(path.join(root, relative), 'utf8').replaceAll('\r\n', '\n');

test('Balance extraction preserves all 19 original UI and helper files', () => {
  const names = fs.readdirSync(path.join(root, 'apps/tender-balance/src')).filter(name => name !== 'main.tsx');
  assert.equal(names.length, 19);
  for (const name of names) assert.equal(read(`apps/tender-balance/src/${name}`), read(`apps/tender-apps/src/${name}`), name);
});

test('Balance entry closure rejects sibling products and undeclared helpers', () => {
  assert.deepEqual(audit(root, contract).errors, []);
  const altered = structuredClone(contract);
  altered.products[0].files = altered.products[0].files.filter(file => !file.endsWith('/fin-form-shared.tsx'));
  assert.ok(audit(root, altered).errors.some(error => error.includes('Balance UI: forbidden dependency') && error.includes('fin-form-shared')));
});

test('Balance case navigation preserves identity and demo mode', () => {
  const state = {surface:'fin',caseId:'synthetic:balance-extraction',demo:true};
  assert.deepEqual(parseBalanceNavigation(balanceNavigationHref(state)), state);
  assert.equal(parseBalanceNavigation('/tenderbalance?view=result').surface, 'cases');
});

test('Balance preserves storage keys, illustration and local OCR paths', () => {
  const app = read('apps/tender-balance/src/balance-sheet-app.tsx');
  for (const key of ['client-cases', 'case-contexts', 'comparison-decisions']) assert.ok(app.includes(`tenderapps:tenderbalance:${key}:v1`));
  const image = 'public/tenderbalance/illustrations/tenderbalance-finance-reviewer.png';
  assert.deepEqual(fs.readFileSync(path.join(root, 'apps/tender-balance', image)), fs.readFileSync(path.join(root, 'apps/tender-apps', image)));
  const config = read('apps/tender-balance/vite.config.ts');
  for (const name of ['tesseract-worker.min.js','tesseract-core-lstm.wasm.js','eng.traineddata.gz']) assert.ok(config.includes(name));
  assert.match(config, /configureServer/);
  assert.match(config, /closeBundle/);
  const pkg = JSON.parse(read('apps/tender-balance/package.json'));
  assert.equal(pkg.scripts.dev, undefined);
  assert.equal(pkg.scripts.preview, undefined);
  assert.equal(pkg.dependencies['tesseract.js'], '7.0.0');
});

import assert from 'node:assert/strict';
import test from 'node:test';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { audit } from '../scripts/check-product-boundaries.mjs';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const original = path.join(root, 'apps/tender-apps/src');
const extracted = path.join(root, 'apps/tender-logistics/src');
test('copied implementation retains parity except reviewed Stage 3 type repairs', () => {
  for (const name of fs.readdirSync(extracted).filter(name => !['main.tsx', 'logistics-responsive.css'].includes(name))) {
    let expected = fs.readFileSync(path.join(original, name), 'utf8').replaceAll('\r\n', '\n');
    if (name === 'document-semantic-extraction.ts') expected = expected.replace('if (value === undefined || value <= 0)', 'if (!amountLine || value === undefined || value <= 0)');
    if (name === 'logistics-costing-app.tsx') expected = expected.replace('selectedSavedCase.result.sourceNamedPlace', '(selectedSavedCase.result as CalculationResult & { sourceNamedPlace?: string }).sourceNamedPlace');
    if (name === 'logistics-calculation-excel.ts') expected = expected
      .replace('sheet.getRow(cell.row)', 'sheet.getRow(Number(cell.row))')
      .replace('const row = cell.row + 1;', 'const row = Number(cell.row) + 1;')
      .replace('  workbook.calcProperties.forceFullCalc = true;\n', '')
      .replace('  workbook.worksheets.forEach((sheet) => { sheet.orderNo = order.indexOf(sheet.name); });', '  // ExcelJS 4.4.0 sorts worksheets by this runtime field, omitted from its public types.\n  workbook.worksheets.forEach((sheet) => { (sheet as Worksheet & { orderNo: number }).orderNo = order.indexOf(sheet.name); });');
    assert.equal(fs.readFileSync(path.join(extracted, name), 'utf8').replaceAll('\r\n','\n'), expected.replaceAll('\r\n','\n'), name);
  }
});
test('extracted entry closes over Logistics and explicit shared helper copies only', () => {
  const contract = JSON.parse(fs.readFileSync(path.join(root, 'docs/product-boundaries.json'), 'utf8'));
  contract.logistics.entries = ['apps/tender-logistics/src/main.tsx'];
  contract.logistics.files = fs.readdirSync(extracted).map(name => 'apps/tender-logistics/src/' + name);
  contract.logistics.externals.push('react-dom');
  assert.deepEqual(audit(root, contract).errors, []);
});
test('own package declares no OCR or sibling product dependency and no unauthorized server launcher', () => {
  const pkg = JSON.parse(fs.readFileSync(path.join(root, 'apps/tender-logistics/package.json'), 'utf8'));
  assert.equal(pkg.scripts.dev, undefined);
  assert.equal(pkg.scripts.preview, undefined);
  assert.ok(!JSON.stringify(pkg.dependencies).match(/tesseract|tender-balance|tendermatch/));
});
test('illustration and persisted case key remain unchanged', () => {
  const relative = 'public/logistics-cost/illustrations/logistics-cost-planner.png';
  assert.deepEqual(fs.readFileSync(path.join(root, 'apps/tender-logistics', relative)), fs.readFileSync(path.join(root, 'apps/tender-apps', relative)));
  assert.match(fs.readFileSync(path.join(extracted, 'logistics-costing-app.tsx'), 'utf8'), /tenderapps\.landed-cost\.saved-cases\.v1/);
});

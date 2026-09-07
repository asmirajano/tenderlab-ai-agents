import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const main = readFileSync("apps/tender-apps/src/main.tsx", "utf8");
const typography = readFileSync("apps/tender-apps/src/financial-data-typography.css", "utf8");
const balanceCss = readFileSync("apps/tender-apps/src/balance-sheet.css", "utf8");
const balanceExcel = readFileSync("packages/tender-balance/src/excel.ts", "utf8");
const logisticsExcel = readFileSync("apps/tender-apps/src/logistics-calculation-excel.ts", "utf8");

test("TenderBalance and TenderLogistics share conventional financial typography", () => {
  assert.match(main, /import "\.\/financial-data-typography\.css";/);
  assert.match(typography, /:where\(\.bs-page, \.costing-page\)/);
  assert.match(typography, /--financial-data-font-family:\s*var\(--font-geist-sans\)/);
  assert.match(typography, /font-variant-numeric:\s*lining-nums tabular-nums/);
  assert.match(typography, /\.bs-client-result-table td:nth-child\(n \+ 3\) b/);
  assert.match(typography, /\.fin-generated-form td:not\(:first-child\)/);
  assert.match(typography, /\.cost-lines-table td:nth-child\(2\)/);
  assert.match(typography, /\.production-cost-breakdown tbody td:nth-child\(2\)/);
  assert.match(typography, /\.result-total strong/);
  assert.match(typography, /text-align:\s*right/);
  assert.match(typography, /@media print/);
  assert.doesNotMatch(typography, /font-geist-mono|Cascadia|Consolas/);
  assert.match(
    balanceCss,
    /\.bs-client-result-table td:nth-child\(n\+3\) b \{[^}]*font-family: var\(--font-geist-sans\);[^}]*font-variant-numeric: lining-nums tabular-nums;/s,
  );
});

test("financial workbook exports retain professional spreadsheet fonts", () => {
  assert.match(balanceExcel, /<name val=\\"Aptos\\"\/>/);
  assert.match(logisticsExcel, /name:\s*"Aptos"/);
});

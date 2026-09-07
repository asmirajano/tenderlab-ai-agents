import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const balanceApp = readFileSync("apps/tender-apps/src/balance-sheet-app.tsx", "utf8");
const fin1Workspace = readFileSync("apps/tender-apps/src/fin-forms-workspace.tsx", "utf8");
const fin2Workspace = readFileSync("apps/tender-apps/src/fin2-workspace.tsx", "utf8");
const balanceCss = readFileSync("apps/tender-apps/src/balance-sheet.css", "utf8");
const logisticsApp = readFileSync("apps/tender-apps/src/logistics-costing-app.tsx", "utf8");
const tenderMatchApp = readFileSync("apps/tender-apps/src/tendermatch-app.tsx", "utf8");

test("applies the approved Excel Dark format to every TenderBalance table", () => {
  const tenderBalanceSources = [balanceApp, fin1Workspace, fin2Workspace].join("\n");
  assert.equal((tenderBalanceSources.match(/<table\b/g) ?? []).length, 7);
  assert.equal((tenderBalanceSources.match(/data-table-format="excel-dark"/g) ?? []).length, 7);
  assert.equal((tenderBalanceSources.match(/excel-dark-table/g) ?? []).length, 7);
});

test("implements the supplied Excel Dark visual contract as a shared table primitive", () => {
  assert.match(balanceCss, /\.bs-page \.excel-dark-table \{[^}]*border: 1px solid #595959;[^}]*font-family: var\(--font-geist-sans\);[^}]*font-size: 13px;/s);
  assert.match(balanceCss, /\.bs-page \.excel-dark-table thead th \{[^}]*background: #595959;[^}]*border: 1px solid #404040;[^}]*color: #fff;[^}]*font-size: 12px;[^}]*padding: 8px 12px;/s);
  assert.match(balanceCss, /\.bs-page \.excel-dark-table tbody td,[\s\S]*?border: 1px solid #d9d9d9;[\s\S]*?padding: 7px 12px;/);
  assert.match(balanceCss, /nth-child\(odd\)[^}]*background: #fff/);
  assert.match(balanceCss, /nth-child\(even\)[^}]*background: #f2f2f2/);
  assert.match(balanceCss, /font-variant-numeric: tabular-nums/);
});

test("preserves responsive scrolling and keeps the table change scoped to TenderBalance", () => {
  assert.match(balanceCss, /\.bs-table-scroll \{ overflow: auto; \}/);
  assert.doesNotMatch(logisticsApp, /excel-dark-table|data-table-format="excel-dark"/);
  assert.doesNotMatch(tenderMatchApp, /excel-dark-table|data-table-format="excel-dark"/);
});

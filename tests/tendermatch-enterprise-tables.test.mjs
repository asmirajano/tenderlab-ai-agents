import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";

const projectRoot = path.resolve(import.meta.dirname, "..");

async function source(relativePath) {
  return readFile(path.join(projectRoot, relativePath), "utf8");
}

test("uses the Entity Readiness Grid format across pages 03A, 03B, 04 and 05", async () => {
  const page = await source("apps/tender-apps/src/tendermatch-app.tsx");
  const styles = await source("apps/tender-apps/src/tendermatch.css");

  for (const table of ["tb3-supplier-table", "tb3-tender-table", "tb3-ranking-table", "tb3-evidence-table"]) {
    assert.match(page, new RegExp(`<table className="tb3-data-table tb3-entity-grid ${table}" data-table-format="entity-readiness-grid">`));
  }
  assert.match(page, /<table className="tb3-data-table tb3-entity-grid" data-table-format="entity-readiness-grid" aria-label="Formula v1\.1 criterion audit">/);
  assert.match(page, /className="tb3-matrix-panel tb3-entity-grid-panel" data-table-format="entity-readiness-grid"/);
  assert.match(page, /className="tb3-matrix-table tb3-entity-matrix" role="grid"/);
  assert.match(page, /function DataTableToolbar/);
  assert.match(page, /function TablePager/);
  assert.match(styles, /\.tb3-data-table thead th[^}]+position: sticky/);
  assert.match(styles, /\.tb3-data-table \.sticky-column[^}]+position: sticky/);
  assert.match(styles, /\.tb3-data-table \.numeric[^}]+font-variant-numeric: tabular-nums[^}]+text-align: right/);
  assert.match(styles, /\.tb3-data-table\.tb3-entity-grid[^}]+border: 1px solid #94a3b8[^}]+border-collapse: collapse[^}]+font-size: 12px/);
  assert.match(styles, /\.tb3-data-table\.tb3-entity-grid th,[\s\S]+?padding: 6px 10px/);
  assert.match(styles, /\.tb3-data-table\.tb3-entity-grid thead th[^}]+background: #e2e8f0[^}]+border-color: #cbd5e1[^}]+font-size: 10px/);
  assert.match(styles, /\.tb3-data-table\.tb3-entity-grid tbody tr:nth-child\(even\) > \*[^}]+background: #f8fafc/);
  assert.match(styles, /\.tb3-data-table\.tb3-entity-grid tbody tr:hover > \*[^}]+background: #fef08a/);
  assert.match(styles, /\.tb3-data-table\.tb3-entity-grid \.numeric[^}]+"Courier New"[^}]+font-weight: 700/);
  assert.match(styles, /\.tb3-data-table\.tb3-entity-grid \.tb3-status-text::before \{ display: none; \}/);
  assert.doesNotMatch(page, /tb3-directory-row|tb3-directory-head|tb3-fact-table/);
});

test("provides scalable search, filtering, sorting and pagination controls", async () => {
  const page = await source("apps/tender-apps/src/tendermatch-app.tsx");

  for (const label of ["Supplier table controls", "Tender table controls", "Evidence table controls", "Pair ranking table controls", "Match matrix controls"]) {
    assert.match(page, new RegExp(label));
  }
  for (const option of ["Supplier A–Z", "Evidence count", "Deadline soonest", "Top pair score", "Data coverage"]) {
    assert.match(page, new RegExp(option));
  }
  assert.match(page, /type="search"/);
  assert.match(page, /\[10, 25, 50, 100\]/);
  assert.match(page, /Previous[\s\S]+Page \{safePage \+ 1\} of \{pageCount\}[\s\S]+Next/);
  assert.match(page, /safeSupplierPage[\s\S]+safeTenderPage/);
  assert.match(page, /filteredSuppliers\.length \* filteredTenders\.length/);
});

test("keeps the specialist matrix compact, sticky, grid-styled and independently paginated on both axes", async () => {
  const page = await source("apps/tender-apps/src/tendermatch-app.tsx");
  const styles = await source("apps/tender-apps/src/tendermatch.css");

  assert.match(page, /aria-rowcount=\{filteredSuppliers\.length \+ 1\}/);
  assert.match(page, /aria-colcount=\{filteredTenders\.length \+ 1\}/);
  assert.match(page, /noun="suppliers"[\s\S]+noun="tenders"/);
  assert.match(page, /Tender filter/);
  assert.match(page, /Tender columns/);
  assert.match(styles, /\.tb3-matrix-header[^}]+position: sticky/);
  assert.match(styles, /\.tb3-matrix-company[^}]+left: 0[^}]+position: sticky/);
  assert.match(styles, /\.tb3-entity-matrix \.tb3-matrix-header[^}]+background: #e2e8f0/);
  assert.match(styles, /\.tb3-entity-matrix \.tb3-matrix-company,[\s\S]+?min-height: 48px/);
  assert.match(styles, /\.tb3-entity-matrix \.tb3-matrix-cell b[^}]+"Courier New"[^}]+font-weight: 700/);
  assert.match(styles, /\.tb3-entity-matrix \.tb3-matrix-row:hover > \.tb3-matrix-company,[\s\S]+?background: #fef08a/);
});

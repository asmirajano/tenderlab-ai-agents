import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";

const projectRoot = path.resolve(import.meta.dirname, "..");

async function source(relativePath) {
  return readFile(path.join(projectRoot, relativePath), "utf8");
}

test("uses one semantic enterprise-table family across TenderMatch data surfaces", async () => {
  const page = await source("apps/tender-apps/src/tendermatch-app.tsx");
  const styles = await source("apps/tender-apps/src/tendermatch.css");

  for (const table of ["tb3-supplier-table", "tb3-tender-table", "tb3-ranking-table", "tb3-evidence-table"]) {
    assert.match(page, new RegExp(`<table className="tb3-data-table ${table}">`));
  }
  assert.match(page, /<table className="tb3-data-table" aria-label="Formula v1\.1 criterion audit">/);
  assert.match(page, /function DataTableToolbar/);
  assert.match(page, /function TablePager/);
  assert.match(styles, /\.tb3-data-table thead th[^}]+position: sticky/);
  assert.match(styles, /\.tb3-data-table \.sticky-column[^}]+position: sticky/);
  assert.match(styles, /\.tb3-data-table \.numeric[^}]+font-variant-numeric: tabular-nums[^}]+text-align: right/);
  assert.match(styles, /\.tb3-data-table th, \.tb3-data-table td[^}]+padding: 8px 10px/);
  assert.match(styles, /\.tb3-status-text::before/);
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

test("keeps the specialist matrix compact, sticky and independently paginated on both axes", async () => {
  const page = await source("apps/tender-apps/src/tendermatch-app.tsx");
  const styles = await source("apps/tender-apps/src/tendermatch.css");

  assert.match(page, /aria-rowcount=\{filteredSuppliers\.length \+ 1\}/);
  assert.match(page, /aria-colcount=\{filteredTenders\.length \+ 1\}/);
  assert.match(page, /noun="suppliers"[\s\S]+noun="tenders"/);
  assert.match(page, /Tender filter/);
  assert.match(page, /Tender columns/);
  assert.match(styles, /\.tb3-matrix-header[^}]+position: sticky/);
  assert.match(styles, /\.tb3-matrix-company[^}]+left: 0[^}]+position: sticky/);
  assert.match(styles, /\.tb3-matrix-cell[^}]+min-height: 52px/);
  assert.match(styles, /\.tb3-matrix-cell b[^}]+font-variant-numeric: tabular-nums/);
});

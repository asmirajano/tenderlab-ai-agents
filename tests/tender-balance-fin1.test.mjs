import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import {
  buildCanonicalFinancialDataset,
  financialInputFromBalanceReview,
  generateFin1,
  normalizeFinancialPeriod,
  prepareFin1FromBalanceReview,
} from "../packages/tender-balance/src/fin-forms.ts";
import { fin1ExcelFileName, fin1ToExcel } from "../packages/tender-balance/src/excel.ts";
import { buildBalanceSheetReview } from "../packages/tender-balance/src/model.ts";

const fixture = JSON.parse(await readFile(new URL("./fixtures/SYNTHETIC_FIN1_CONTAMINATION_REGRESSION.json", import.meta.url), "utf8"));
const [sourceFixture, templateFixture] = fixture.inputs;
const sourceReview = buildBalanceSheetReview(sourceFixture.reviewInput);
const templateReview = buildBalanceSheetReview(templateFixture.reviewInput);
const multiStatementFixture = JSON.parse(await readFile(new URL("./fixtures/SYNTHETIC_FIN1_MULTI_STATEMENT_REGRESSION.json", import.meta.url), "utf8"));

function buildRegressionDataset() {
  return buildCanonicalFinancialDataset([
    financialInputFromBalanceReview(sourceReview, sourceFixture.role),
    financialInputFromBalanceReview(templateReview, templateFixture.role),
  ]);
}

function readStoredZipEntries(bytes) {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const decoder = new TextDecoder();
  const entries = new Map();
  let offset = 0;
  while (offset + 30 <= bytes.length && view.getUint32(offset, true) === 0x04034b50) {
    assert.equal(view.getUint16(offset + 8, true), 0, "Excel test expects uncompressed OpenXML entries");
    const size = view.getUint32(offset + 18, true);
    const nameLength = view.getUint16(offset + 26, true);
    const extraLength = view.getUint16(offset + 28, true);
    const nameStart = offset + 30;
    const dataStart = nameStart + nameLength + extraLength;
    const name = decoder.decode(bytes.subarray(nameStart, nameStart + nameLength));
    entries.set(name, decoder.decode(bytes.subarray(dataStart, dataStart + size)));
    offset = dataStart + size;
  }
  return entries;
}

test("blocks populated FIN template examples from canonical financial data", () => {
  const dataset = buildRegressionDataset();
  const template = dataset.documents.find((document) => document.role === "TEMPLATE");

  assert.equal(template.eligibleForCanonicalFinancialDataset, false);
  assert.equal(template.eligibleForGeneratedFinValues, false);
  assert.deepEqual(dataset.availableYears, ["2016", "2017"]);
  assert.equal(dataset.values.some((value) => value.value >= 8_888_881), false);
  assert.equal(dataset.sources.some((source) => source.documentId === templateReview.source.documentId), false);
  assert.ok(dataset.issues.some((issue) => issue.id.startsWith("issue:template-blocked:")));
});

test("generates only legitimate dynamic FIN periods and never turns Average into a year", () => {
  const dataset = buildRegressionDataset();
  const form = generateFin1(dataset);

  assert.deepEqual(form.years, ["2016", "2017"]);
  assert.equal(form.mappings.length, 18);
  assert.equal(form.years.includes("Average"), false);
  assert.equal(form.years.some((year) => /Earlier|Additional|Missing/i.test(year)), false);
  assert.equal(dataset.periodMappings.find((period) => period.originalPeriod === "Average").status, "excluded");
});

test("isolates statement-local periods and reconstructs FIN-1 from balance and income statements", () => {
  const review = buildBalanceSheetReview(multiStatementFixture);
  const { dataset, form } = prepareFin1FromBalanceReview(review);
  const expected = {
    "total_assets:2022": 2_776_046,
    "total_assets:2023": 3_568_323,
    "total_liabilities:2022": 7_946_704,
    "total_liabilities:2023": 10_419_639,
    "net_worth:2022": -5_170_658,
    "net_worth:2023": -6_851_316,
    "current_assets:2022": 609_707,
    "current_assets:2023": 1_880_513,
    "current_liabilities:2022": 7_946_704,
    "current_liabilities:2023": 10_403_744,
    "working_capital:2022": -7_336_997,
    "working_capital:2023": -8_523_231,
    "total_revenue:2022": 1_222_756,
    "total_revenue:2023": 2_689_237,
    "profit_before_tax:2022": -2_152_484,
    "profit_before_tax:2023": -2_535_490,
    "profit_after_tax:2022": -2_152_484,
    "profit_after_tax:2023": -2_535_490
  };

  assert.deepEqual(review.statement.periods, ["December 31, 2023", "2022"]);
  assert.deepEqual(form.years, ["2022", "2023"]);
  assert.equal(form.years.includes("2021"), false);
  assert.equal(dataset.incomeStatementDetected, true);
  assert.equal(form.readiness.status, "ready");
  assert.equal(form.readiness.canGenerate, true);
  assert.equal(form.mappings.length, 18);
  assert.equal(form.mappings.every((mapping) => mapping.status === "ready"), true);
  for (const mapping of form.mappings) {
    assert.equal(mapping.value, expected[`${mapping.field}:${mapping.displayYear}`]);
  }
  const assets2023 = form.mappings.find((mapping) => mapping.field === "total_assets" && mapping.displayYear === "2023");
  const revenue2023 = form.mappings.find((mapping) => mapping.field === "total_revenue" && mapping.displayYear === "2023");
  assert.equal(dataset.sources.find((source) => assets2023.sourceIds.includes(source.sourceId)).page, 2);
  assert.equal(dataset.sources.find((source) => revenue2023.sourceIds.includes(source.sourceId)).page, 3);
});

test("keeps note tables out of the primary balance sheet and accepts comprehensive-income statement titles", () => {
  const review = buildBalanceSheetReview({
    source: { documentId: "synthetic:notes-page-isolation", fileName: "SYNTHETIC_NOTES_PAGE_ISOLATION.pdf", sha256: "synthetic-notes-page-isolation", synthetic: true },
    pages: [
      {
        pageNumber: 1,
        extractionMethod: "digital-text",
        confidence: 0.99,
        text: [
          "SYNTHETIC COMPANY LTD",
          "Consolidated Balance Sheets",
          "December 31, 2024 and 2023",
          "USD thousands",
          "Assets 2024 2023",
          "Total current assets 50 45",
          "Total assets 100 90",
          "Total current liabilities 20 18",
          "Total liabilities 60 55",
          "Total partners' deficit 40 35",
          "Total liabilities and partners' deficit 100 90",
        ].join("\n"),
      },
      {
        pageNumber: 2,
        extractionMethod: "digital-text",
        confidence: 0.99,
        text: [
          "SYNTHETIC COMPANY LTD",
          "Notes to Consolidated Financial Statements",
          "Balance Sheet",
          "December 31, 2024 and 2023",
          "Derivative asset 999 888",
        ].join("\n"),
      },
      {
        pageNumber: 3,
        extractionMethod: "digital-text",
        confidence: 0.99,
        text: [
          "SYNTHETIC COMPANY LTD",
          "Consolidated Statements of Income and Comprehensive Income",
          "Years ended December 31, 2024 and 2023",
          "Net sales 200 180",
          "Income from continuing operations before tax expense 30 25",
          "Total net income 24 20",
        ].join("\n"),
      },
    ],
  });

  const { form } = prepareFin1FromBalanceReview(review);
  assert.deepEqual([...new Set(review.lineItems.flatMap((item) => item.values.map((value) => value.source.page)))], [1]);
  assert.deepEqual(review.statement.periods, ["December 31, 2024", "2023"]);
  assert.equal(review.lineItems.some((item) => item.originalLabel === "Derivative asset"), false);
  assert.equal(form.readiness.status, "ready");
  assert.equal(form.readiness.readyFields, 18);
  assert.equal(form.readiness.missingFields, 0);
  assert.equal(form.mappings.find((mapping) => mapping.field === "total_assets" && mapping.displayYear === "2023")?.value, 90_000);
  assert.equal(form.mappings.find((mapping) => mapping.field === "total_revenue" && mapping.displayYear === "2024")?.value, 200_000);
  assert.equal(form.mappings.find((mapping) => mapping.field === "profit_before_tax" && mapping.displayYear === "2023")?.value, 25_000);
  assert.equal(form.mappings.find((mapping) => mapping.field === "profit_after_tax" && mapping.displayYear === "2024")?.value, 24_000);
});

test("uses MISSING only for unavailable fields inside available years", () => {
  const form = generateFin1(buildRegressionDataset());
  const missing = form.mappings.filter((mapping) => mapping.status === "missing");

  assert.equal(missing.length, 6);
  assert.deepEqual([...new Set(missing.map((mapping) => mapping.displayYear))], ["2016", "2017"]);
  assert.deepEqual([...new Set(missing.map((mapping) => mapping.field))], ["total_revenue", "profit_before_tax", "profit_after_tax"]);
  assert.ok(missing.every((mapping) => mapping.problemType === "source-data-gap" && mapping.action === "Add Income Statement"));
  assert.equal(form.coverage.requiredYears, null);
  assert.equal(form.coverage.status, "not-specified");
});

test("normalizes a validated opening position to the prior year and retains its original date", () => {
  const opening = normalizeFinancialPeriod(sourceReview, "January 1");
  const closing = normalizeFinancialPeriod(sourceReview, "December 31");

  assert.equal(opening.displayYear, "2016");
  assert.equal(opening.status, "normalized");
  assert.equal(opening.originalPeriod, "January 1");
  assert.match(opening.rationale, /immediately preceding year-end/);
  assert.equal(closing.displayYear, "2017");
  assert.equal(closing.status, "direct");
});

test("calculates Working Capital only from eligible Current Assets and Current Liabilities", () => {
  const dataset = buildRegressionDataset();
  const workingCapital2016 = dataset.values.find((value) => value.field === "working_capital" && value.displayYear === "2016");
  const workingCapital2017 = dataset.values.find((value) => value.field === "working_capital" && value.displayYear === "2017");

  assert.equal(workingCapital2016.value, 150);
  assert.equal(workingCapital2017.value, 180);
  assert.equal(workingCapital2016.provenance, "CALCULATED");
  assert.equal(workingCapital2016.calculationFormula, "Current Assets − Current Liabilities");
  assert.equal(workingCapital2016.operandSourceIds.length, 2);
});

test("keeps reported and calculated Net Worth separately auditable", () => {
  const dataset = buildRegressionDataset();
  const netWorth2016 = dataset.values.find((value) => value.field === "net_worth" && value.displayYear === "2016");

  assert.equal(netWorth2016.value, 599);
  assert.equal(netWorth2016.reportedValue, 599);
  assert.equal(netWorth2016.calculatedValue, 600);
  assert.equal(netWorth2016.difference, -1);
  assert.equal(netWorth2016.provenance, "SOURCE");
  assert.equal(netWorth2016.status, "source-inconsistency");
});

test("allows a partial FIN-1 to be reviewed and generated without inventing income values", () => {
  const form = generateFin1(buildRegressionDataset());

  assert.equal(form.readiness.status, "partial");
  assert.equal(form.readiness.canGenerate, true);
  assert.equal(form.readiness.missingFields, 6);
  assert.equal(form.mappings.find((mapping) => mapping.field === "total_assets" && mapping.displayYear === "2016").value, 1_000);
  assert.equal(form.mappings.find((mapping) => mapping.field === "total_revenue" && mapping.displayYear === "2016").value, null);
});

test("exports FIN-1 as a typed Excel workbook with a source mapping audit", () => {
  const form = generateFin1(buildRegressionDataset());
  const bytes = fin1ToExcel(form);
  const entries = readStoredZipEntries(bytes);

  assert.match(fin1ExcelFileName(sourceReview), /-FIN-1\.xlsx$/);
  assert.match(entries.get("xl/workbook.xml"), /FIN-1 Form/);
  assert.match(entries.get("xl/workbook.xml"), /Source &amp; Mapping/);
  assert.match(entries.get("xl/worksheets/sheet1.xml"), /Historical Financial Performance/);
  assert.match(entries.get("xl/worksheets/sheet1.xml"), /<v>1000<\/v>/);
  assert.match(entries.get("xl/worksheets/sheet1.xml"), /MISSING/);
  assert.match(entries.get("xl/worksheets/sheet2.xml"), /Current Assets − Current Liabilities/);
  assert.match(entries.get("xl/worksheets/sheet2.xml"), /source-inconsistency/);
});

test("keeps historical coverage separate from the primary FIN table", () => {
  const form = generateFin1(buildRegressionDataset(), 3);

  assert.deepEqual(form.years, ["2016", "2017"]);
  assert.equal(form.coverage.availableYears, 2);
  assert.equal(form.coverage.requiredYears, 3);
  assert.equal(form.coverage.status, "insufficient");
  assert.equal(form.mappings.length, 18);
});

test("publishes a stable FIN-1 structured-output schema", async () => {
  const schema = JSON.parse(await readFile(new URL("../packages/catalog-schema/schema/fin1-historical-performance.schema.json", import.meta.url), "utf8"));

  assert.equal(schema.properties.schemaVersion.const, "1.0.0");
  assert.equal(schema.properties.templateId.const, "FIN-1");
  assert.ok(schema.required.includes("mappings"));
  assert.ok(schema.properties.mappings.items.properties.provenance.enum.includes("TEMPLATE_EXAMPLE"));
  assert.ok(schema.properties.mappings.items.properties.status.enum.includes("source-inconsistency"));
});

import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import {
  buildCanonicalFinancialDataset,
  financialInputFromBalanceReview,
  generateFin1,
  normalizeFinancialPeriod,
} from "../packages/tender-balance/src/fin-forms.ts";
import { buildBalanceSheetReview } from "../packages/tender-balance/src/model.ts";

const fixture = JSON.parse(await readFile(new URL("./fixtures/SYNTHETIC_FIN1_CONTAMINATION_REGRESSION.json", import.meta.url), "utf8"));
const [sourceFixture, templateFixture] = fixture.inputs;
const sourceReview = buildBalanceSheetReview(sourceFixture.reviewInput);
const templateReview = buildBalanceSheetReview(templateFixture.reviewInput);

function buildRegressionDataset() {
  return buildCanonicalFinancialDataset([
    financialInputFromBalanceReview(sourceReview, sourceFixture.role),
    financialInputFromBalanceReview(templateReview, templateFixture.role),
  ]);
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

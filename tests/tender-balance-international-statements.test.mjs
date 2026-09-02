import assert from "node:assert/strict";
import test from "node:test";

import { buildBalanceSheetReview } from "../packages/tender-balance/src/model.ts";
import { prepareFin1FromBalanceReview } from "../packages/tender-balance/src/fin-forms.ts";
import { generateFin2 } from "../packages/tender-balance/src/fin2.ts";

function source(documentId, pages) {
  return buildBalanceSheetReview({
    source: {
      documentId,
      fileName: `SYNTHETIC_${documentId}.pdf`,
      mimeType: "application/pdf",
      sha256: `synthetic-${documentId}`,
      pageCount: pages.length,
      synthetic: true,
    },
    pages: pages.map((text, index) => ({ pageNumber: index + 1, text, extractionMethod: "digital-text", confidence: 0.99 })),
  });
}

test("reconstructs a two-page Scandinavian balance sheet with k-currency units", () => {
  const review = source("scandinavian-kcurrency", [
    "SYNTHETIC NORDIC FINANCE A/S\nAnnual Report 2023",
    [
      "SYNTHETIC NORDIC FINANCE A/S", "Income Statement", "2023", "kDKK", "2022", "kDKK",
      "Profit/loss before tax\t22.409\t2.659", "Profit/loss for the year\t4.160\t-12.796",
    ].join("\n"),
    [
      "SYNTHETIC NORDIC FINANCE A/S", "Balance Sheet as of 31 December", "2023", "kDKK", "2022", "kDKK", "Assets",
      "Non-current assets\t5.982\t985.372", "Current assets\t11.190.919\t11.510.639", "Assets\t11.196.901\t12.496.011",
    ].join("\n"),
    [
      "SYNTHETIC NORDIC FINANCE A/S", "Balance Sheet as of 31 December", "2023", "kDKK", "2022", "kDKK", "Liabilities and equity",
      "Equity\t523.533\t521.105", "Long-term liabilities\t0\t2.102.924", "Short-term liabilities\t10.673.368\t9.871.982",
      "Liabilities\t10.673.368\t11.974.906", "Liabilities, provisions and equity\t11.196.901\t12.496.011",
    ].join("\n"),
  ]);
  const { form } = prepareFin1FromBalanceReview(review);

  assert.equal(review.statement.reportingEntity, "SYNTHETIC NORDIC FINANCE A/S");
  assert.equal(review.statement.reportingDate, "31 December 2023");
  assert.equal(review.statement.currency, "DKK");
  assert.equal(review.statement.unitScale, 1_000);
  assert.deepEqual(review.statement.periods, ["2023", "2022"]);
  assert.deepEqual([...new Set(review.lineItems.flatMap((item) => item.values.map((value) => value.source.page)))], [3, 4]);
  assert.equal(form.readiness.canGenerate, true);
  assert.equal(form.mappings.find((mapping) => mapping.field === "profit_before_tax" && mapping.displayYear === "2023")?.value, 22_409_000);
  assert.equal(form.mappings.find((mapping) => mapping.field === "profit_after_tax" && mapping.displayYear === "2022")?.value, -12_796_000);
  assert.equal(form.mappings.find((mapping) => mapping.field === "total_revenue")?.value, null);
});

test("keeps source column order across an untitled IFRS continuation page and derives total liabilities", () => {
  const review = source("ifrs-continuation", [
    "1 SYNTHETIC HOLDING AG Annual Report 2023",
    [
      "SYNTHETIC HOLDING AG Annual Report 2023", "Consolidated statement of comprehensive income for the period", "in EUR thousand", "2023", "2022 adjusted",
      "Revenue\t241,826\t250,950", "Consolidated profit\t10,446\t8,005",
    ].join("\n"),
    [
      "SYNTHETIC HOLDING AG Annual Report 2023", "Consolidated statement of financial position as at 31 December 2023", "ASSETS",
      "in EUR thousand\tNotes\t31.12.2023\t31.12.2022", "NON-CURRENT ASSETS\t78,490\t76,476", "CURRENT ASSETS\t97,650\t96,765", "Assets\t176,140\t173,241",
    ].join("\n"),
    [
      "SYNTHETIC HOLDING AG Annual Report 2023", "EQUITY AND LIABILITIES", "in EUR thousand\tNotes\t31.12.2023\t31.12.2022",
      "EQUITY\t34,359\t25,021", "NON-CURRENT LIABILITIES\t49,776\t50,631", "CURRENT LIABILITIES\t92,005\t97,589", "Equity and liabilities\t176,140\t173,241",
    ].join("\n"),
  ]);
  const { dataset, form } = prepareFin1FromBalanceReview(review);
  const fin2 = generateFin2(dataset, { comparisonCurrency: "EUR" });

  assert.deepEqual(review.statement.periods, ["2023", "2022"]);
  assert.deepEqual(review.lineItems.find((item) => item.normalizedConcept === "owners_equity")?.values.map((value) => value.reportedValue), [34_359, 25_021]);
  assert.equal(form.mappings.find((mapping) => mapping.field === "total_liabilities" && mapping.displayYear === "2023")?.value, 141_781_000);
  assert.equal(form.mappings.find((mapping) => mapping.field === "total_liabilities" && mapping.displayYear === "2023")?.provenance, "CALCULATED");
  assert.equal(form.readiness.canGenerate, true);
  assert.equal(fin2.readiness.canGenerate, true);
  assert.deepEqual(fin2.years, ["2022", "2023"]);
});

test("reconstructs an unlabelled UK balance subtotal and normalizes deduction-presented liabilities", () => {
  const review = source("uk-abbreviated-balance", [
    "Independent Auditor’s Report to the Members of SYNTHETIC ANALYSTS Society of the UK",
    [
      "PROFIT AND LOSS ACCOUNT FOR", "THE YEAR ENDED 30 JUNE 2023", "Notes\t2023\t2022", "£\t£",
      "REVENUE\t4\t6,607,968\t8,557,988", "PROFIT ON ORDINARY ACTIVITIES BEFORE TAXATION\t7\t702,713\t2,793,339", "PROFIT ON ORDINARY ACTIVITIES AFTER TAXATION\t15\t427,626\t2,375,343",
    ].join("\n"),
    [
      "BALANCE SHEET AS AT 30 JUNE 2023", "Notes\t2023\t2022", "£\t£", "FIXED ASSETS",
      "Tangible assets\t9\t114,459\t25,395", "Intangible assets\t10\t297,764\t220,645", "Investments\t11\t6,026,232\t5,663,433", "6,438,455\t5,909,473",
      "CURRENT ASSETS", "Stock\t52,189\t50,077", "Debtors\t12\t1,232,941\t1,049,882", "Cash at bank and in hand\t2,607,896\t3,257,691", "3,893,026\t4,357,650",
      "CREDITORS", "Amounts falling due within one year\t13\t(1,208,140)\t(1,460,594)", "Net current assets\t2,684,886\t2,897,056",
      "Total assets less current liabilities\t9,123,341\t8,806,529", "Provisions for liabilities and charges\t14\t(235,115)\t(160,398)", "Deferred income\t(855,743)\t(1,041,274)",
      "Net assets\t8,032,483\t7,604,857", "RESERVES", "Members’ funds\t8,032,483\t7,604,857",
    ].join("\n"),
    "CASH FLOW STATEMENT FOR\nTHE YEAR ENDED 30 JUNE 2023\nCash from operations 999 888",
  ]);
  const { dataset, form } = prepareFin1FromBalanceReview(review);
  const fin2 = generateFin2(dataset, { comparisonCurrency: "GBP" });
  const reportedCurrentLiabilities = review.lineItems.find((item) => item.normalizedConcept === "current_liabilities");
  const mappedCurrentLiabilities = form.mappings.find((mapping) => mapping.field === "current_liabilities" && mapping.displayYear === "2023");

  assert.equal(review.statement.reportingEntity, "SYNTHETIC ANALYSTS Society of the UK");
  assert.equal(review.statement.reportingDate, "30 JUNE 2023");
  assert.deepEqual([...new Set(review.lineItems.flatMap((item) => item.values.map((value) => value.source.page)))], [3]);
  assert.equal(review.lineItems.filter((item) => item.originalLabel === "[no printed label]").length, 2);
  assert.equal(reportedCurrentLiabilities?.values[0].reportedValue, -1_208_140);
  assert.equal(mappedCurrentLiabilities?.value, 1_208_140);
  assert.equal(mappedCurrentLiabilities?.reportedValue, -1_208_140);
  assert.equal(mappedCurrentLiabilities?.provenance, "CALCULATED");
  assert.equal(form.mappings.find((mapping) => mapping.field === "total_assets" && mapping.displayYear === "2023")?.value, 10_331_481);
  assert.equal(form.mappings.find((mapping) => mapping.field === "total_liabilities" && mapping.displayYear === "2023")?.value, 2_298_998);
  assert.equal(form.readiness.status, "ready");
  assert.equal(form.readiness.canGenerate, true);
  assert.equal(fin2.readiness.canGenerate, true);
});

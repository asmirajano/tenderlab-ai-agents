import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import { buildBalanceSheetReview } from "../packages/tender-balance/src/model.ts";
import {
  buildCanonicalFinancialDataset,
  financialInputFromBalanceReview,
} from "../packages/tender-balance/src/fin-forms.ts";
import { fin2ToCsv, generateFin2 } from "../packages/tender-balance/src/fin2.ts";
import { fin2ExcelFileName, fin2ToExcel } from "../packages/tender-balance/src/excel.ts";

const contaminationFixture = JSON.parse(await readFile(new URL("./fixtures/SYNTHETIC_FIN2_TEMPLATE_CONTAMINATION_REGRESSION.json", import.meta.url), "utf8"));

function readStoredZipEntries(bytes) {
  const entries = new Map();
  let offset = 0;
  while (offset + 30 <= bytes.length) {
    const signature = bytes[offset] | (bytes[offset + 1] << 8) | (bytes[offset + 2] << 16) | (bytes[offset + 3] << 24);
    if (signature !== 0x04034b50) break;
    const size = bytes[offset + 18] | (bytes[offset + 19] << 8) | (bytes[offset + 20] << 16) | (bytes[offset + 21] << 24);
    const nameLength = bytes[offset + 26] | (bytes[offset + 27] << 8);
    const extraLength = bytes[offset + 28] | (bytes[offset + 29] << 8);
    const nameStart = offset + 30;
    const dataStart = nameStart + nameLength + extraLength;
    const name = new TextDecoder().decode(bytes.slice(nameStart, nameStart + nameLength));
    entries.set(name, new TextDecoder().decode(bytes.slice(dataStart, dataStart + size)));
    offset = dataStart + size;
  }
  return entries;
}

function sourceDataset() {
  const sourceReview = buildBalanceSheetReview(contaminationFixture.financialSource);
  const templateReview = buildBalanceSheetReview(contaminationFixture.populatedTemplate);
  const dataset = buildCanonicalFinancialDataset([
    financialInputFromBalanceReview(sourceReview, "FINANCIAL_SOURCE"),
    financialInputFromBalanceReview(templateReview, "TEMPLATE"),
  ]);
  return { sourceReview, templateReview, dataset };
}

test("uses a populated FIN-2 template only for structure and blocks all example facts", () => {
  const { dataset, templateReview } = sourceDataset();
  const form = generateFin2(dataset, {
    comparisonCurrency: "USD",
    administrative: {
      biddingProcess: "SYNTHETIC CLIENT PROCUREMENT",
      invitationNumber: "SYNTHETIC-001",
      purchaser: "SYNTHETIC CLIENT PURCHASER",
    },
  });

  assert.deepEqual(form.years, ["2020", "2021"]);
  assert.equal(form.bidder.value, "SYNTHETIC SOURCE COMPANY LLC");
  assert.equal(form.bidder.value.includes("TEMPLATE EXAMPLE"), false);
  assert.equal(form.mappings.some((mapping) => [6_133_512, 23_763_193, 9_386_124].includes(mapping.sourceValue)), false);
  assert.equal(form.mappings.some((mapping) => ["2022", "2023", "2024"].includes(mapping.displayYear)), false);
  assert.equal(dataset.sources.some((source) => source.documentId === templateReview.source.documentId), false);
  assert.equal(dataset.documents.find((document) => document.documentId === templateReview.source.documentId)?.eligibleForGeneratedFinValues, false);
  assert.equal(form.averageAnnualTurnover.value, 660);
  assert.deepEqual(form.averageAnnualTurnover.yearsIncluded, ["2020", "2021"]);
  assert.equal(form.averageAnnualTurnover.provenance, "CALCULATED");
  assert.equal(form.bidderModel, "SINGLE_BIDDER");
});

test("converts source turnover with auditable year-end CBU rates and calculates the average", () => {
  const review = buildBalanceSheetReview({
    source: {
      documentId: "synthetic:fin2-uzs-source",
      fileName: "SYNTHETIC_FIN2_UZS_SOURCE.pdf",
      sha256: "synthetic-fin2-uzs-source",
      synthetic: true,
    },
    pages: [
      {
        pageNumber: 1,
        extractionMethod: "digital-text",
        confidence: 0.99,
        text: [
          "SYNTHETIC UZS BIDDER LLC",
          "Balance Sheets",
          "December 31, 2024 and 2023",
          "UZS thousands",
          "Total current assets 80 70",
          "Total assets 100 90",
          "Total current liabilities 20 18",
          "Total liabilities 60 55",
          "Total partners' equity 40 35",
          "Total liabilities and partners' equity 100 90",
        ].join("\n"),
      },
      {
        pageNumber: 2,
        extractionMethod: "digital-text",
        confidence: 0.99,
        text: [
          "SYNTHETIC UZS BIDDER LLC",
          "Statements of Income",
          "Years ended December 31, 2024 and 2023",
          "Annual turnover 9,386,124 23,763,193",
          "Profit before tax 562,245 1,425,791",
          "Net income 465,804 1,211,916",
        ].join("\n"),
      },
    ],
  });
  const dataset = buildCanonicalFinancialDataset([financialInputFromBalanceReview(review)]);
  const form = generateFin2(dataset, { comparisonCurrency: "USD", requiredYearCount: 3 });
  const year2024 = form.mappings.find((mapping) => mapping.displayYear === "2024");
  const year2023 = form.mappings.find((mapping) => mapping.displayYear === "2023");

  assert.deepEqual(form.years, ["2023", "2024"]);
  assert.equal(year2024.sourceValue, 9_386_124_000);
  assert.equal(year2024.sourceValue / year2024.sourceUnitScale, 9_386_124);
  assert.equal(year2024.exchangeRate.rateType, "closing");
  assert.equal(year2024.exchangeRate.closingDate, "2024-12-27");
  assert.ok(Math.abs(year2024.sourceUnitsPerComparisonUnit - 12_920.48) < 0.01);
  assert.ok(Math.abs(year2024.convertedValue - 726_453) < 1);
  assert.ok(Math.abs(year2023.convertedValue - 1_925_896) < 1);
  assert.equal(year2024.convertedProvenance, "CALCULATED");
  assert.match(year2024.conversionFormula, /UZS.*USD/);
  assert.ok(Math.abs(form.averageAnnualTurnover.value - ((year2023.convertedValue + year2024.convertedValue) / 2)) < 0.000001);
  assert.deepEqual(form.averageAnnualTurnover.yearsIncluded, ["2023", "2024"]);
  assert.equal(form.coverage.status, "insufficient");
  assert.equal(form.coverage.availableYears, 2);
  assert.equal(form.coverage.requiredYears, 3);
  assert.deepEqual(form.years, ["2023", "2024"]);
});

test("does not turn a balance-only period into a FIN-2 turnover blocker", () => {
  const { dataset } = sourceDataset();
  dataset.availableYears = ["2019", ...dataset.availableYears];
  const form = generateFin2(dataset, { comparisonCurrency: "USD" });

  assert.deepEqual(form.years, ["2020", "2021"]);
  assert.equal(form.mappings.some((mapping) => mapping.displayYear === "2019"), false);
  assert.equal(form.readiness.canGenerate, true);
});

test("distinguishes missing turnover from a semantically ambiguous turnover candidate", () => {
  const missingReview = buildBalanceSheetReview({
    source: { documentId: "synthetic:fin2-missing", fileName: "SYNTHETIC_FIN2_MISSING.pdf", sha256: "synthetic-fin2-missing", synthetic: true },
    pages: [{
      pageNumber: 1,
      extractionMethod: "digital-text",
      confidence: 0.99,
      text: "SYNTHETIC MISSING LLC\nBalance Sheets\nDecember 31, 2024 and 2023\nUSD units\nTotal current assets 80 70\nTotal assets 100 90\nTotal current liabilities 20 18\nTotal liabilities 60 55\nTotal equity 40 35",
    }],
  });
  const missingDataset = buildCanonicalFinancialDataset([financialInputFromBalanceReview(missingReview)]);
  const missingForm = generateFin2(missingDataset, { comparisonCurrency: "USD" });
  assert.deepEqual(missingForm.years, ["2023", "2024"]);
  assert.equal(missingForm.mappings.every((mapping) => mapping.status === "missing" && mapping.sourceProvenance === "MISSING"), true);
  assert.equal(missingForm.readiness.canGenerate, false);

  const ambiguousReview = buildBalanceSheetReview({
    source: { documentId: "synthetic:fin2-ambiguous", fileName: "SYNTHETIC_FIN2_AMBIGUOUS.pdf", sha256: "synthetic-fin2-ambiguous", synthetic: true },
    pages: [
      ...missingReview.pages,
      {
        pageNumber: 2,
        extractionMethod: "digital-text",
        confidence: 0.99,
        text: "SYNTHETIC MISSING LLC\nStatements of Income\nYears ended December 31, 2024 and 2023\nReceipts 200 180\nNet income 20 18",
      },
    ],
  });
  const ambiguousDataset = buildCanonicalFinancialDataset([financialInputFromBalanceReview(ambiguousReview)]);
  const ambiguousForm = generateFin2(ambiguousDataset, { comparisonCurrency: "USD" });
  assert.equal(ambiguousForm.mappings.every((mapping) => mapping.status === "mapping-review-required"), true);
  assert.equal(ambiguousForm.mappings.every((mapping) => mapping.sourceProvenance === "MAPPING_REVIEW_REQUIRED"), true);
  assert.equal(ambiguousForm.mappings.every((mapping) => mapping.originalLabels.includes("Receipts")), true);
  assert.equal(ambiguousForm.readiness.canGenerate, false);
});

test("exports FIN-2 with clean form, mapping, and FX-audit sheets", () => {
  const { sourceReview, dataset } = sourceDataset();
  const form = generateFin2(dataset, { comparisonCurrency: "USD" });
  const entries = readStoredZipEntries(fin2ToExcel(form));
  const workbook = entries.get("xl/workbook.xml");

  assert.match(fin2ExcelFileName(sourceReview, "USD"), /-FIN-2-USD\.xlsx$/);
  assert.match(workbook, /FIN-2 Form/);
  assert.match(workbook, /Source &amp; Mapping/);
  assert.match(workbook, /FX Conversion Audit/);
  assert.match(entries.get("xl/worksheets/sheet1.xml"), /Average Annual Turnover/);
  assert.match(entries.get("xl/worksheets/sheet2.xml"), /Net revenue/);
  assert.match(entries.get("xl/worksheets/sheet3.xml"), /Identity conversion/);
  assert.match(fin2ToCsv(form), /Average Annual Turnover/);
  assert.doesNotMatch(fin2ToCsv(form), /Joint Venture|Consortium|JV Partner/i);
});

test("publishes a stable single-bidder FIN-2 structured-output schema", async () => {
  const schema = JSON.parse(await readFile(new URL("../packages/catalog-schema/schema/fin2-size-of-operation.schema.json", import.meta.url), "utf8"));
  const serialized = JSON.stringify(schema);

  assert.equal(schema.properties.schemaVersion.const, "1.0.0");
  assert.equal(schema.properties.templateId.const, "FIN-2");
  assert.equal(schema.properties.bidderModel.const, "SINGLE_BIDDER");
  assert.equal(schema.properties.exchangeRateBasis.const, "closing");
  assert.ok(schema.properties.mappings.items.properties.sourceProvenance.enum.includes("MAPPING_REVIEW_REQUIRED"));
  assert.doesNotMatch(serialized, /joint venture|consortium|jv partner|member percentage/i);
});

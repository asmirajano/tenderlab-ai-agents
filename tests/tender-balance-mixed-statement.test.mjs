import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import { prepareFin1FromBalanceReview } from "../packages/tender-balance/src/fin-forms.ts";
import { buildBalanceSheetReview } from "../packages/tender-balance/src/model.ts";

const review = buildBalanceSheetReview({
  source: {
    documentId: "synthetic:mixed-statement-zero-liabilities",
    fileName: "SYNTHETIC_MIXED_STATEMENT_ZERO_LIABILITIES.pdf",
    mimeType: "application/pdf",
    sha256: "synthetic-mixed-statement-zero-liabilities",
    pageCount: 2,
    expectedPageCount: 2,
    synthetic: true,
    processingVersion: "tender-balance/regression",
  },
  pages: [
    {
      pageNumber: 1,
      extractionMethod: "digital-text",
      confidence: 0.99,
      text: "SYNTHETIC OFFERING DISCLOSURE — NOT CLIENT EVIDENCE\nThe issuer may offer up to 500 thousand shares.",
    },
    {
      pageNumber: 2,
      extractionMethod: "digital-text",
      confidence: 0.99,
      text: [
        "SYNTHETIC ZERO DEBT COMPANY, INC.",
        "BALANCE SHEETS",
        "As of March 31, 2025 and March 31, 2024",
        "Cash $100.00 $80.00",
        "Total Current Assets 100.00 80.00",
        "TOTAL ASSETS $100.00 $80.00",
        "Total Liabilities - -",
        "Additional Paid-in Capital 140.00 110.00",
        "Accumulated Deficit (40.00) (30.00)",
        "Total Stockholders' Equity 100.00 80.00",
        "Total Liabilities and Stockholders' Equity $100.00 $80.00",
        "STATEMENTS OF OPERATIONS",
        "For the fiscal years ended March 31, 2025 and March 31, 2024",
        "Revenue - -",
        "Total Operating Expenses 40.00 30.00",
        "Net Loss $(40.00) $(30.00)",
      ].join("\n"),
    },
  ],
});

test("isolates a same-page balance sheet and derives reliable named-date metadata", () => {
  assert.equal(review.statement.reportingEntity, "SYNTHETIC ZERO DEBT COMPANY, INC.");
  assert.equal(review.statement.reportingDate, "2025");
  assert.deepEqual(review.statement.periods, ["March 31, 2025", "March 31, 2024"]);
  assert.equal(review.statement.currency, "USD");
  assert.equal(review.statement.unitLabel, "units");
  assert.equal(review.statement.unitScale, 1);
  assert.deepEqual([...new Set(review.lineItems.flatMap((item) => item.values.map((value) => value.source.page)))], [2]);
  assert.equal(review.lineItems.some((item) => item.originalLabel === "Revenue"), false);
  assert.equal(review.lineItems.some((item) => item.originalLabel === "Net Loss"), false);
  assert.equal(review.lineItems.some((item) => item.originalLabel.includes("thousand shares")), false);
});

test("produces a truthful partial FIN-1 from explicit nils and calculated zero current liabilities", () => {
  const { form } = prepareFin1FromBalanceReview(review);
  const mapping = (field, year) => form.mappings.find((candidate) => candidate.field === field && candidate.displayYear === year);

  assert.deepEqual(form.years, ["2024", "2025"]);
  assert.equal(form.readiness.canGenerate, true);
  assert.equal(form.readiness.status, "partial");
  assert.equal(mapping("total_liabilities", "2025")?.value, 0);
  assert.equal(mapping("total_liabilities", "2025")?.provenance, "SOURCE");
  assert.equal(mapping("current_liabilities", "2025")?.value, 0);
  assert.equal(mapping("current_liabilities", "2025")?.provenance, "CALCULATED");
  assert.equal(mapping("working_capital", "2025")?.value, 100);
  assert.equal(mapping("total_revenue", "2025")?.value, 0);
  assert.equal(mapping("profit_after_tax", "2025")?.value, -40);
  assert.equal(mapping("profit_before_tax", "2025")?.value, null);
  assert.equal(mapping("profit_before_tax", "2025")?.status, "missing");
});

test("does not block a Case merely because the summary reporting date is unconfirmed when FIN years are explicit", async () => {
  const source = await readFile(new URL("../apps/tender-apps/src/balance-sheet-app.tsx", import.meta.url), "utf8");
  const guard = source.match(/function hasExtractionPeriodProblem[\s\S]*?\n\}/)?.[0] ?? "";

  assert.match(guard, /form\.years\.length === 0/);
  assert.doesNotMatch(guard, /reportingDate\s*===\s*["']Unconfirmed["']/);
});

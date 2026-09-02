import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  formatWholeFinancialFigure,
  roundFinancialFigure,
  roundedFinancialFigure,
} from "../packages/tender-balance/src/financial-rounding.ts";
import { buildBalanceSheetReview, reviewToCsv } from "../packages/tender-balance/src/model.ts";

test("rounds client financial figures to whole numbers with symmetric negative handling", () => {
  assert.equal(roundFinancialFigure(12.5), 13);
  assert.equal(roundFinancialFigure(-12.5), -13);
  assert.equal(roundedFinancialFigure(12_550, 1_000), 13);
  assert.equal(formatWholeFinancialFigure(12_550, 1_000), "13");
  assert.equal(formatWholeFinancialFigure(-12_550, 1_000), "(13)");
});

test("exports rounded balance figures while retaining the exact source token", () => {
  const review = buildBalanceSheetReview({
    source: {
      documentId: "rounding-policy",
      fileName: "rounding-policy.pdf",
      sha256: "rounding-policy",
      pageCount: 1,
      receivedAt: "2026-09-02T00:00:00.000Z",
    },
    pages: [{ pageNumber: 1, extractionMethod: "digital-text", confidence: 0.99, text: "Rounding Policy Ltd\nBalance sheet\n2025\nUSD units" }],
    reportingEntity: "Rounding Policy Ltd",
    reportingDate: "2025",
    periods: ["2025"],
    currency: "USD",
    unitLabel: "units",
    unitScale: 1,
    language: "en",
    lineItems: [{
      originalLabel: "Total assets",
      concept: "total_assets",
      classification: "total_asset",
      isTotal: true,
      page: 1,
      values: [{ period: "2025", raw: "1,234.60" }],
    }],
  });

  const csv = reviewToCsv(review);
  assert.match(csv, /"1,234\.60"/);
  assert.match(csv, /,"1235","1235",/);
});

test("TenderBalance amount components use the shared zero-decimal formatter", () => {
  const shared = readFileSync(new URL("../apps/tender-apps/src/fin-form-shared.tsx", import.meta.url), "utf8");
  const balance = readFileSync(new URL("../apps/tender-apps/src/balance-sheet-app.tsx", import.meta.url), "utf8");
  const fin2 = readFileSync(new URL("../apps/tender-apps/src/fin2-workspace.tsx", import.meta.url), "utf8");
  assert.match(shared, /formatWholeFinancialFigure/);
  assert.match(balance, /formatReportedAmount/);
  assert.match(fin2, /formatWholeFinancialFigure/);
  assert.doesNotMatch(shared, /maximumFractionDigits:\s*2/);
  assert.doesNotMatch(fin2, /maximumFractionDigits:\s*2/);
});

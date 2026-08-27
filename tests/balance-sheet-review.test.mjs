import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import {
  approveEligibleLineItems,
  approveStatement,
  buildBalanceSheetReview,
  canApproveStatement,
  compareBalanceSheetReviews,
  correctLineItemValue,
  parseReportedNumber,
  reviewToCsv,
} from "../packages/tender-balance/src/model.ts";
import { syntheticBalanceSheetReviews } from "../packages/tender-balance/src/fixtures.ts";
import { readPdfPages } from "../packages/tender-balance/src/file-reader.ts";
import { agentDatasetContributions } from "../packages/catalog-data/src/agent-dataset-relations.ts";

const [clean, lowConfidence, negative, missingPage, comparativeConflict] = syntheticBalanceSheetReviews;

function createSyntheticTextPdf(lines) {
  const escapedLines = lines.map((line) => line.replace(/([\\()])/g, "\\$1"));
  const commands = ["BT", "/F1 10 Tf", "72 720 Td", ...escapedLines.flatMap((line, index) => [`(${line}) Tj`, ...(index < escapedLines.length - 1 ? ["0 -14 Td"] : [])]), "ET"].join("\n");
  const objects = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>",
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
    `<< /Length ${Buffer.byteLength(commands, "latin1")} >>\nstream\n${commands}\nendstream`,
  ];
  let pdf = "%PDF-1.4\n";
  const offsets = [0];
  objects.forEach((object, index) => {
    offsets.push(Buffer.byteLength(pdf, "latin1"));
    pdf += `${index + 1} 0 obj\n${object}\nendobj\n`;
  });
  const xrefOffset = Buffer.byteLength(pdf, "latin1");
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  pdf += offsets.slice(1).map((offset) => `${String(offset).padStart(10, "0")} 00000 n \n`).join("");
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF\n`;
  const bytes = Buffer.from(pdf, "latin1");
  return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength);
}

test("ships five explicitly synthetic acceptance fixtures", () => {
  assert.equal(syntheticBalanceSheetReviews.length, 5);
  assert.ok(syntheticBalanceSheetReviews.every((review) => review.source.synthetic));
  assert.ok(syntheticBalanceSheetReviews.every((review) => review.source.fileName.startsWith("SYNTHETIC_")));
});

test("extracts and normalizes the required balance-sheet concepts with complete traceability", () => {
  const required = ["total_assets", "total_liabilities", "owners_equity", "current_assets", "current_liabilities"];
  assert.deepEqual(clean.statement.periods, ["2025", "2024"]);
  assert.equal(clean.statement.reportingEntity, "Northstar Components Ltd");
  assert.equal(clean.statement.currency, "USD");
  assert.equal(clean.statement.unitScale, 1_000);
  for (const concept of required) assert.ok(clean.lineItems.some((item) => item.normalizedConcept === concept), concept);
  for (const item of clean.lineItems) {
    assert.ok(item.originalLabel);
    assert.ok(item.values.length >= 1);
    for (const value of item.values) {
      assert.equal(value.source.documentId, clean.source.documentId);
      assert.equal(value.source.fileName, clean.source.fileName);
      assert.ok(value.source.page >= 1);
      assert.equal(value.source.originalLabel, item.originalLabel);
      assert.equal(value.source.period, value.period);
      assert.ok(value.source.confidence > 0);
    }
  }
});

test("validates the accounting equation, net assets, and substantiated subtotals", () => {
  assert.equal(clean.arithmeticChecks.length, 8);
  assert.ok(clean.arithmeticChecks.every((check) => check.status === "passed"));
  assert.equal(clean.issues.filter((issue) => issue.severity === "blocking").length, 0);
});

test("keeps reported, normalized, corrected, and calculated values separate", () => {
  const assets = clean.lineItems.find((item) => item.normalizedConcept === "total_assets");
  assert.ok(assets);
  const original = assets.values.find((value) => value.period === "2025");
  assert.equal(original.rawReportedValue, "41,000");
  assert.equal(original.reportedValue, 41_000);
  assert.equal(original.normalizedValue, 41_000_000);

  const changed = correctLineItemValue(clean, assets.id, "2025", 42_000, "Synthetic OCR correction test", "Reviewer", "2026-08-26T10:00:00.000Z");
  const changedValue = changed.lineItems.find((item) => item.id === assets.id).values.find((value) => value.period === "2025");
  assert.equal(changedValue.rawReportedValue, "41,000");
  assert.equal(changedValue.reportedValue, 41_000);
  assert.equal(changedValue.normalizedValue, 41_000_000);
  assert.equal(changedValue.correction.correctedReportedValue, 42_000);
  assert.equal(changedValue.correction.correctedNormalizedValue, 42_000_000);
  assert.ok(changed.issues.some((issue) => issue.code === "ACCOUNTING_EQUATION_MISMATCH"));
});

test("flags low-confidence scanned extraction and requires explicit line review", () => {
  assert.ok(lowConfidence.issues.some((issue) => issue.code === "OCR_LOW_CONFIDENCE"));
  assert.ok(lowConfidence.lineItems.every((item) => item.reviewStatus === "needs-review"));
  assert.equal(canApproveStatement(lowConfidence), false);
  const bulkApproved = approveEligibleLineItems(lowConfidence, "Reviewer", "2026-08-26T10:00:00.000Z");
  assert.ok(bulkApproved.lineItems.every((item) => item.reviewStatus === "needs-review"));
});

test("preserves legitimate negative balances without silent sign coercion", () => {
  const retainedEarnings = negative.lineItems.find((item) => item.normalizedConcept === "retained_earnings");
  assert.ok(retainedEarnings);
  assert.equal(retainedEarnings.values[0].rawReportedValue, "(4,000)");
  assert.equal(retainedEarnings.values[0].reportedValue, -4_000);
  assert.equal(retainedEarnings.values[0].normalizedValue, -4_000_000);
  assert.ok(negative.arithmeticChecks.every((check) => check.status === "passed"));
  assert.equal(negative.issues.some((issue) => issue.code === "SIGN_ANOMALY"), false);
});

test("blocks approval when an expected statement page is missing", () => {
  assert.ok(missingPage.issues.some((issue) => issue.code === "MISSING_PAGE" && issue.severity === "blocking"));
  assert.equal(canApproveStatement(missingPage), false);
});

test("detects comparative-period discrepancies across documents", () => {
  const comparison = compareBalanceSheetReviews(clean, comparativeConflict);
  assert.ok(comparison.overlaps.some((item) => item.period === "2025"));
  assert.ok(comparison.issues.some((issue) => issue.code === "COMPARATIVE_PERIOD_DISCREPANCY"));
  assert.ok(comparison.issues.every((issue) => issue.sourceRefs.length >= 2));
});

test("supports a complete clean review and statement approval gate", () => {
  const rowsApproved = approveEligibleLineItems(clean, "Finance reviewer", "2026-08-26T11:00:00.000Z");
  assert.equal(canApproveStatement(rowsApproved), true);
  const approved = approveStatement(rowsApproved, "Finance reviewer", "2026-08-26T11:30:00.000Z");
  assert.equal(approved.review.status, "approved");
  assert.equal(approved.review.reviewer, "Finance reviewer");
  assert.equal(approved.review.auditTrail.at(-1).action, "statement-approved");
});

test("parses a clean text-layer extraction envelope and image-only failure safely", () => {
  const digital = buildBalanceSheetReview({
    source: { documentId: "test:digital", fileName: "digital.txt", mimeType: "text/plain", sha256: "abc", pageCount: 1 },
    pages: [{ pageNumber: 1, extractionMethod: "digital-text", confidence: 0.98, text: [
      "Example Manufacturing LLC",
      "Balance sheet",
      "USD thousands",
      "2025 | 2024",
      "Cash and cash equivalents | 3,000 | 2,000",
      "Trade receivables | 2,000 | 2,000",
      "Total current assets | 5,000 | 4,000",
      "Total assets | 10,000 | 9,000",
      "Trade payables | 2,000 | 2,000",
      "Total current liabilities | 2,000 | 2,000",
      "Total liabilities | 4,000 | 4,000",
      "Owners' equity | 6,000 | 5,000",
    ].join("\n") }],
  });
  assert.equal(digital.statement.reportingEntity, "Example Manufacturing LLC");
  assert.equal(digital.lineItems.find((item) => item.normalizedConcept === "total_assets").values[0].reportedValue, 10_000);
  assert.equal(digital.arithmeticChecks.find((check) => check.id === "check:equation:2025").status, "passed");

  const imageOnly = buildBalanceSheetReview({
    source: { documentId: "test:image", fileName: "scan.png", mimeType: "image/png", sha256: "def", pageCount: 1 },
    pages: [{ pageNumber: 1, extractionMethod: "ocr", imageOnly: true, text: "" }],
  });
  assert.ok(imageOnly.issues.some((issue) => issue.code === "OCR_REQUIRED" && issue.severity === "blocking"));
  assert.equal(imageOnly.lineItems.length, 0);
});

test("reads text from a real synthetic digital PDF without external services", async () => {
  const buffer = createSyntheticTextPdf([
    "SYNTHETIC FIXTURE - NOT CLIENT EVIDENCE",
    "Northstar Components Ltd",
    "Balance sheet",
    "USD thousands",
    "2025 | 2024",
    "Total current assets | 5,000 | 4,000",
    "Total assets | 10,000 | 9,000",
    "Total current liabilities | 2,000 | 2,000",
    "Total liabilities | 4,000 | 4,000",
    "Owners equity | 6,000 | 5,000",
  ]);
  const pages = await readPdfPages(buffer);
  assert.equal(pages.length, 1);
  assert.equal(pages[0].imageOnly, false);
  assert.match(pages[0].text, /SYNTHETIC FIXTURE/);
  assert.match(pages[0].text, /Northstar Components Ltd/);
  assert.match(pages[0].text, /Total assets/);
});

test("normalizes common number formats without changing their raw representation", () => {
  assert.equal(parseReportedNumber("(1,250)"), -1_250);
  assert.equal(parseReportedNumber("1 250"), 1_250);
  assert.equal(parseReportedNumber("1.250"), 1_250);
  assert.equal(parseReportedNumber("12,50"), 12.5);
  assert.equal(parseReportedNumber("—"), null);
});

test("exports a stable flat CSV with provenance-preserving columns", () => {
  const csv = reviewToCsv(clean);
  assert.match(csv, /raw_reported_value/);
  assert.match(csv, /normalized_value/);
  assert.match(csv, /corrected_reported_value/);
  assert.match(csv, /SYNTHETIC_Northstar_Balance_Sheet_2025\.pdf/);
});

test("publishes a machine-readable schema and TL-A008 dataset lineage", async () => {
  const schema = JSON.parse(await readFile(new URL("../packages/catalog-schema/schema/balance-sheet-review.schema.json", import.meta.url), "utf8"));
  assert.equal(schema.properties.schemaVersion.const, "1.0.0");
  assert.equal(schema.properties.capability.properties.ownerAgentId.const, "agent:TL-A008");
  assert.ok(schema.required.includes("lineItems"));
  const agent8Relations = agentDatasetContributions.filter((relation) => relation.agentId === "agent:TL-A008");
  assert.ok(agent8Relations.some((relation) => relation.datasetId === "dataset:TEA-DS-FINANCIAL-FILINGS" && relation.relationshipType === "creates-record"));
  assert.ok(agent8Relations.some((relation) => relation.datasetId === "dataset:TEA-DS-EVIDENCE-VAULT"));
});

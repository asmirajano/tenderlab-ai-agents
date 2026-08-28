import assert from "node:assert/strict";
import { File } from "node:buffer";
import { readFile } from "node:fs/promises";
import test from "node:test";

import {
  approveEligibleLineItems,
  approveStatement,
  buildBalanceSheetReview,
  canApproveStatement,
  compareBalanceSheetReviews,
  correctLineItemValue,
  detectPeriods,
  parseStatementLine,
  parseReportedNumber,
  reviewToCsv,
} from "../packages/tender-balance/src/model.ts";
import { syntheticBalanceSheetReviews } from "../packages/tender-balance/src/fixtures.ts";
import { fuseStatutoryRecognition, readBalanceSheetFile, readPdfPages, reconstructPdfPageText, statutoryRecognitionScore } from "../packages/tender-balance/src/file-reader.ts";
import { clusterOcrRows, mergeWrappedOcrRows } from "../packages/tender-balance/src/ocr.ts";
import { balanceSheetExcelFileName, reviewToExcel } from "../packages/tender-balance/src/excel.ts";
import { agentDatasetContributions } from "../packages/catalog-data/src/agent-dataset-relations.ts";

const [clean, lowConfidence, negative, missingPage, comparativeConflict] = syntheticBalanceSheetReviews;

test("reconstructs adjacent PDF number fragments without collapsing reporting columns", () => {
  const items = [
    { str: "December 31,", width: 58, transform: [1, 0, 0, 1, 395, 660] },
    { str: "", hasEOL: true, width: 0, transform: [1, 0, 0, 1, 370, 647] },
    { str: "202", width: 15, transform: [1, 0, 0, 1, 370, 647] },
    { str: "4", width: 5, transform: [1, 0, 0, 1, 385, 647] },
    { str: "202", width: 15, transform: [1, 0, 0, 1, 461, 647] },
    { str: "3", width: 5, transform: [1, 0, 0, 1, 476, 647] },
    { str: "", hasEOL: true, width: 0, transform: [1, 0, 0, 1, 115, 585] },
    { str: "Prepaid expenses", width: 69, transform: [1, 0, 0, 1, 115, 585] },
    { str: "and other current assets", width: 94, transform: [1, 0, 0, 1, 187, 585] },
    { str: "1", width: 5, transform: [1, 0, 0, 1, 403, 585] },
    { str: "01", width: 10, transform: [1, 0, 0, 1, 408, 585] },
    { str: "1", width: 5, transform: [1, 0, 0, 1, 491, 585] },
    { str: "75", width: 10, transform: [1, 0, 0, 1, 496, 585] },
  ];

  const text = reconstructPdfPageText(items);
  assert.match(text, /December 31,\n2024\t2023/);
  assert.match(text, /Prepaid expenses and other current assets\t101\t175/);
});

test("preserves wide PDF table-cell gaps and does not shift a single Uzbek value into another period", () => {
  const items = [
    { str: "Мақсадли давлат жамғармалари ва суғурталар бўйича бўнак тўловлари (4500)", width: 230, transform: [1, 0, 0, 1, 42, 480] },
    { str: " ", width: 139, transform: [1, 0, 0, 1, 272, 480] },
    { str: "280", width: 10, transform: [1, 0, 0, 1, 411, 480] },
    { str: " ", width: 52, transform: [1, 0, 0, 1, 421, 480] },
    { str: "1,00", width: 12, transform: [1, 0, 0, 1, 473, 480] },
  ];

  const text = reconstructPdfPageText(items);
  const parsed = parseStatementLine(text, 2);
  assert.equal(parsed.sourceRowCode, "280");
  assert.deepEqual(parsed.rawValues, ["1,00", ""]);
});

test("keeps blank statutory rows structural and recovers a collapsed trailing row code", () => {
  assert.deepEqual(parseStatementLine("The initial cost (0400)\t020", 2), {
    label: "The initial cost (0400)", sourceRowCode: "020", rawValues: ["", ""],
  });
  assert.deepEqual(parseStatementLine("Debtors, total (line 220+240+250) 210\t1 022 964,00\t534 995,00", 2), {
    label: "Debtors, total (line 220+240+250)", sourceRowCode: "210", rawValues: ["1 022 964,00", "534 995,00"],
  });

  const review = buildBalanceSheetReview({
    source: { documentId: "synthetic:blank-statutory-row", fileName: "SYNTHETIC_BLANK_STATUTORY_ROW.pdf", mimeType: "application/pdf", sha256: "synthetic", pageCount: 1, synthetic: true },
    pages: [{ pageNumber: 1, text: [
      "Accounting balance sheet - form No.1", "Fourth quarter of 2023", "Unit of measurement, thousand soums",
      "At the beginning of the reporting period", "At the end of the reporting period",
      "The initial cost (0400)\t020",
      "Total balance sheet asset\t400\t1 000,00\t1 400,00",
    ].join("\n") }],
  });
  const blank = review.lineItems.find((item) => item.sourceRowCode === "020");
  assert.ok(blank);
  assert.deepEqual(blank.values.map((value) => value.reportedValue), [null, null]);
  assert.equal(blank.values.some((value) => value.reportedValue === -400 || value.reportedValue === 20), false);
});

test("selects statutory OCR by core-row coverage and recovers only malformed numeric cells from digital text", () => {
  const sparse = [
    "Total current assets\t390\t2 877 316,00\t4 461 811,00",
    "Total assets\t400\t6 237 204,00\t7179 99",
    "Equity, total\t480\t1 933 327,00\t2 195 806,00",
    "Long-term liabilities, total\t490\t3 750 000,00\t28 799,00",
    "Current liabilities, total\t600\t5563 879,00\t4 955 393,00",
    "Total liabilities\t770\t4 303 879,00\t4 984 192,00",
    "Total liabilities and equity\t780\t6 237 206,00\t7 179 998,00",
  ].join("\n");
  const autoWithDroppedRows = [
    "Total current assets\t390\t2 877 316,00\t4 461 811,00",
    "Total assets\t400\t6 237 204,00\t7 179 997,00",
    "Total liabilities\t770\t4 303 879,00\t4 984 192,00",
  ].join("\n");
  const digital = [
    "Total current assets\t390\t2 877 3,16,00\t4 461 811,00",
    "Total assets\t400\t6 237 204,00\t7 179 997,00",
    "Current liabilities, total\t600\t553 879,00\t4 955 393,00",
  ].join("\n");

  assert.ok(statutoryRecognitionScore(sparse) > statutoryRecognitionScore(autoWithDroppedRows));
  assert.ok(statutoryRecognitionScore([
    "Net revenue\t010\t5 558 561,00\tx\t6 133 512,00\tx",
    "Profit before tax\t240\t336 488,00\t0,00\t310 442,00\t0,00",
    "Net profit\t270\t286 015,00\t0,00\t263 872,00\t0,00",
  ].join("\n")) > 0);
  const fused = fuseStatutoryRecognition(sparse, digital);
  assert.match(fused, /390\t2 877 316,00\t4 461 811,00/);
  assert.match(fused, /400\t6 237 204,00\t7 179 997,00/);
  assert.match(fused, /600\t553 879,00\t4 955 393,00/);
  assert.doesNotMatch(fused, /2 877 3,16,00/);
  assert.doesNotMatch(fused, /5563 879,00/);
});

test("reattaches spatially displaced statutory total cells without stealing the preceding row", () => {
  assert.deepEqual(mergeWrappedOcrRows([
    "Provisions for future expenses\t470\t0,00\t0,00\t480\t2 195 806,00\t3 407 722,00",
    "Total for section I",
  ]), [
    "Provisions for future expenses\t470\t0,00\t0,00",
    "Total for section I\t480\t2 195 806,00\t3 407 722,00",
  ]);
});

test("repairs cascading statutory total cells while preserving each original label", () => {
  assert.deepEqual(mergeWrappedOcrRows([
    "Other current assets\t380\t10,00\t20,00\t390\t700,00\t1 000,00",
    "Total for part II\t400\t1 000,00\t1 400,00",
    "Total on balance sheet assets",
  ]), [
    "Other current assets\t380\t10,00\t20,00",
    "Total for part II\t390\t700,00\t1 000,00",
    "Total on balance sheet assets\t400\t1 000,00\t1 400,00",
  ]);
});

test("deskews a statutory table row before clustering its distant value columns", () => {
  const word = (text, left, top, width, blockNumber, lineNumber = 1) => ({
    text, left, top, width, height: 20, confidence: 95, blockNumber, paragraphNumber: 1, lineNumber,
  });
  const words = [
    word("1", 102, 291, 18, 20), word("2", 1660, 310, 18, 21), word("3", 1935, 313, 18, 22),
    word("4", 2393, 319, 18, 23), word("5", 2753, 323, 18, 24), word("6", 3220, 328, 18, 25),
    word("Net", 102, 416, 40, 1), word("revenue", 160, 417, 80, 1), word("from", 260, 419, 45, 1),
    word("sales", 325, 420, 55, 1), word("of", 400, 421, 25, 1), word("products", 445, 422, 90, 1),
    word("010", 1660, 431, 45, 2), word("5,558,561", 1935, 434, 120, 3), word("x", 2393, 448, 20, 4),
    word("6,133,512", 2753, 444, 120, 5), word("x", 3220, 458, 20, 6),
    word("Cost", 100, 466, 45, 7), word("of", 165, 467, 25, 7), word("products", 210, 468, 90, 7),
    word("020", 1660, 481, 45, 8), word("4,817,184", 1935, 484, 120, 9),
  ];

  const rows = clusterOcrRows(words, 3400);
  const revenueRow = rows.find((row) => row.words.some((candidate) => candidate.text === "010"));
  assert.ok(revenueRow);
  assert.deepEqual(revenueRow.words.map((candidate) => candidate.text), [
    "Net", "revenue", "from", "sales", "of", "products", "010", "5,558,561", "x", "6,133,512", "x",
  ]);
  assert.equal(revenueRow.words.some((candidate) => candidate.text === "Cost"), false);
});

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
  assert.equal(clean.arithmeticChecks.length, 12);
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

test("normalizes English statutory comparative columns with page-specific years across statement sets", () => {
  assert.deepEqual(detectPeriods(
    "At the beginning of\nIndicator name  the reporting  At the end of the\ncode  reporting period\nperiod",
    "2023",
  ), ["2022", "2023"]);
  assert.deepEqual(detectPeriods(
    "For corresponding period last year\nFor accounting period",
    "2023",
  ), ["2022", "2023"]);
  assert.deepEqual(detectPeriods(
    "Work in progress (2000, 2100)\nAdvances made to staff 1 975,00\nRetained earnings 1 933 327,00",
    null,
  ), []);
  assert.deepEqual(detectPeriods([
    "Accounting balance form No. 1",
    "Indicator name String code Begg the reporting period By the end of the reporting period",
    "Initial value (0100, 0300)\t010\t4 726 926,00\t4 839 764,00",
    "Work in progress (2000, 2100)\t160",
    "Total for part II\t390\t4 461 811,00\t7 610 621,00",
  ].join("\n"), "2023"), ["2022", "2023"]);

  const review = buildBalanceSheetReview({
    source: { documentId: "synthetic:statutory-comparatives", fileName: "SYNTHETIC_STATUTORY_COMPARATIVES.pdf", mimeType: "application/pdf", sha256: "synthetic", pageCount: 6, synthetic: true },
    pages: [
      { pageNumber: 1, text: "AUDIT REPORT\nThe report is addressed to: OOO ALPHA TRADING\nFinancial statements for 2022" },
      { pageNumber: 2, text: "Accounting balance sheet - form No. 1\nFourth quarter of 2022" },
      { pageNumber: 3, text: [
        "Unit of measurement, thousand soums",
        "At the beginning of the reporting period\nAt the end of the reporting period",
        "Total current assets\t390\t700,00\t1 000,00",
        "Total balance sheet asset\t400\t1 000,00\t1 400,00",
        "Owners' equity\t480\t400,00\t600,00",
        "Total current liabilities\t600\t500,00\t700,00",
        "Total liabilities\t770\t600,00\t800,00",
      ].join("\n") },
      { pageNumber: 4, text: "Report on financial results - Form No.2\nFourth quarter of 2022\nFor corresponding period last year\nFor accounting period" },
      { pageNumber: 5, text: "AUDIT REPORT\nFinancial statements for 2023" },
      { pageNumber: 6, text: [
        "Accounting balance form No. 1",
        "Fourth quarter of 2023",
        "Unit of measurement, thousand soums",
        "At the beginning of the reporting period\nAt the end of the reporting period",
        "Total current assets\t390\t1 000,00\t1 300,00",
        "Total balance sheet asset\t400\t1 400,00\t1 800,00",
        "Owners' equity\t480\t600,00\t800,00",
        "Total current liabilities\t600\t700,00\t900,00",
        "Total liabilities\t770\t800,00\t1 000,00",
      ].join("\n") },
    ],
  });

  assert.equal(review.statement.reportingEntity, "ALPHA TRADING LLC");
  assert.equal(review.statement.reportingDate, "2023");
  assert.deepEqual(review.statement.periods, ["2021", "2022", "2023"]);
  assert.equal(review.statement.currency, "UZS");
  assert.equal(review.statement.unitScale, 1_000);
  assert.equal(review.pages.find((page) => page.pageNumber === 3)?.reportingYear, "2022");
  assert.equal(review.pages.find((page) => page.pageNumber === 6)?.reportingYear, "2023");
  const equationChecks = review.arithmeticChecks.filter((check) => check.formula === "assets = liabilities + equity");
  assert.deepEqual(equationChecks.map((check) => [check.period, check.status]), [["2021", "passed"], ["2022", "passed"], ["2023", "passed"]]);
});

test("prefers an explicit statement currency declaration over an isolated OCR symbol", () => {
  const review = buildBalanceSheetReview({
    source: { documentId: "synthetic:currency-declaration", fileName: "SYNTHETIC_CURRENCY_DECLARATION.pdf", mimeType: "application/pdf", sha256: "synthetic", pageCount: 1, synthetic: true },
    pages: [{ pageNumber: 1, text: [
      "Accounting balance sheet - form No.1",
      "Fourth quarter of 2023",
      "Unit of measurement, thousand soums",
      "At the beginning of the reporting period\nAt the end of the reporting period",
      "Total balance sheet asset\t400\t1 000,00\t1 400,00",
      "OCR footer artefact: a $4",
    ].join("\n") }],
  });

  assert.equal(review.statement.currency, "UZS");
  assert.equal(review.statement.unitScale, 1_000);
});

test("propagates an English statutory quarter-cover year through its adjacent Form No.1 and Form No.2 pages", () => {
  const review = buildBalanceSheetReview({
    source: { documentId: "synthetic:quarter-cover-context", fileName: "SYNTHETIC_QUARTER_COVER_CONTEXT.pdf", mimeType: "application/pdf", sha256: "synthetic", pageCount: 6, synthetic: true },
    pages: [
      { pageNumber: 1, text: "AUDITOR'S REPORT\nThe report is addressed to: OOO PREMIER UNITED\nFinancial statements on 2022 year 4 quarter" },
      { pageNumber: 2, text: [
        "ACCOUNTING BALANCE SHEET - Form No.1",
        "Unit of measurement, thousand soums",
        "At the beginning of the reporting period\nAt the end of the reporting period",
        "Total current assets\t390\t700,00\t1 000,00",
        "Total balance sheet asset\t400\t1 000,00\t1 400,00",
        "Owners' equity\t480\t400,00\t600,00",
        "Total current liabilities\t600\t500,00\t700,00",
        "Total liabilities\t770\t600,00\t800,00",
      ].join("\n") },
      { pageNumber: 3, text: [
        "REPORT ON FINANCIAL RESULTS - Form No.2",
        "For corresponding period last year\nFor accounting period",
        "Net sales revenue\t010\t5 508 561,00\t6 133 512,00",
      ].join("\n") },
      { pageNumber: 4, text: "AUDITOR'S REPORT\nFinancial statements on 2023 year 4 quarter" },
      { pageNumber: 5, text: [
        "ACCOUNTING BALANCE SHEET - Form No.1",
        "Unit of measurement, thousand soums",
        "At the beginning of the reporting period\nAt the end of the reporting period",
        "Total current assets\t390\t1 000,00\t1 300,00",
        "Total balance sheet asset\t400\t1 400,00\t1 800,00",
        "Owners' equity\t480\t600,00\t800,00",
        "Total current liabilities\t600\t700,00\t900,00",
        "Total liabilities\t770\t800,00\t1 000,00",
      ].join("\n") },
      { pageNumber: 6, text: [
        "Report on financial results - form No.2",
        "For corresponding period last year\nFor reporting period",
        "Net sales revenue\t010\t6 133 512,00\t23 763 193,00",
      ].join("\n") },
    ],
  });

  assert.equal(review.statement.reportingEntity, "PREMIER UNITED LLC");
  assert.equal(review.statement.reportingDate, "2023");
  assert.deepEqual(review.statement.periods, ["2021", "2022", "2023"]);
  assert.deepEqual(review.pages.map((page) => [page.pageNumber, page.reportingYear]), [
    [1, "2022"], [2, "2022"], [3, "2022"],
    [4, "2023"], [5, "2023"], [6, "2023"],
  ]);
});

test("retains continuation-page rows that precede a balance-sheet total", () => {
  const review = buildBalanceSheetReview({
    source: { documentId: "synthetic:balance-continuation", fileName: "SYNTHETIC_BALANCE_CONTINUATION.pdf", mimeType: "application/pdf", sha256: "synthetic", pageCount: 2, synthetic: true },
    pages: [
      { pageNumber: 1, text: [
        "Accounting balance sheet - form No.1", "Fourth quarter of 2022", "Unit of measurement, thousand soums",
        "At the beginning of the reporting period", "At the end of the reporting period",
      ].join("\n") },
      { pageNumber: 2, text: [
        "Other current assets\t380\t10,00\t20,00",
        "Total for section II\t390\t2 877 316,00\t4 461 811,00",
        "Total balance sheet asset\t400\t6 237 204,00\t7 179 997,00",
      ].join("\n") },
    ],
  });

  const currentAssets = review.lineItems.find((item) => item.sourceRowCode === "390");
  assert.ok(currentAssets);
  assert.equal(currentAssets.normalizedConcept, "current_assets");
  assert.deepEqual(currentAssets.values.map((value) => value.reportedValue), [2_877_316, 4_461_811]);
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

test("runs the supplied clean balance-sheet image through OCR, structure, normalization, traceability, and genuine discrepancy checks", { timeout: 60_000 }, async () => {
  const bytes = await readFile(new URL("./fixtures/BALANCE_SHEET_IMAGE_REGRESSION.jpg", import.meta.url));
  const progress = [];
  const review = await readBalanceSheetFile(
    new File([bytes], "BALANCE_SHEET_IMAGE_REGRESSION.jpg", { type: "image/jpeg" }),
    (event) => progress.push(event),
  );

  assert.deepEqual(review.statement.periods, ["Month 1", "Month 2"]);
  assert.equal(review.statement.reportingEntity, "Unconfirmed reporting entity");
  assert.equal(review.statement.reportingDate, "Unconfirmed");
  assert.equal(review.statement.currency, "USD");
  assert.equal(review.lineItems.length, 23);
  assert.equal(review.pages[0].extractionMethod, "ocr");
  assert.equal(review.pages[0].imageOnly, false);
  assert.ok(review.pages[0].confidence >= 0.9);
  assert.ok(progress.some((event) => event.stage === "ocr"));
  assert.ok(progress.some((event) => event.stage === "structuring"));
  assert.equal(review.issues.some((issue) => issue.code === "OCR_REQUIRED" || issue.code === "STATEMENT_PAGE_NOT_FOUND"), false);

  const expected = new Map([
    ["cash_and_cash_equivalents", [89_000, 120]],
    ["current_assets", [111_000, 32_120]],
    ["total_assets", [174_000, 99_120]],
    ["current_liabilities", [159_500, 167_400]],
    ["total_liabilities", [243_500, 258_400]],
    ["owners_equity", [25_000, 102_000]],
    ["total_liabilities_and_equity", [293_500, 462_400]],
  ]);
  for (const [concept, values] of expected) {
    const item = review.lineItems.find((candidate) => candidate.normalizedConcept === concept);
    assert.ok(item, concept);
    assert.deepEqual(item.values.map((value) => value.reportedValue), values, concept);
    assert.ok(item.values.every((value) => value.source.fileName === "BALANCE_SHEET_IMAGE_REGRESSION.jpg" && value.source.page === 1 && value.source.extractionMethod === "ocr"));
  }

  const checks = new Map(review.arithmeticChecks.map((check) => [check.id, check]));
  assert.equal(checks.get("check:subtotal:current_assets:Month 1").status, "passed");
  assert.equal(checks.get("check:subtotal:current_liabilities:Month 2").status, "passed");
  assert.equal(checks.get("check:subtotal:total_assets:Month 1").status, "passed");
  assert.equal(checks.get("check:subtotal:total_liabilities:Month 2").status, "passed");
  assert.equal(checks.get("check:equation:Month 1").difference, -94_500);
  assert.equal(checks.get("check:equation:Month 2").difference, -261_280);
  assert.equal(checks.get("check:reported-liabilities-equity:Month 1").difference, 25_000);
  assert.equal(checks.get("check:reported-liabilities-equity:Month 2").difference, 102_000);
  assert.ok(review.issues.some((issue) => issue.code === "ACCOUNTING_EQUATION_MISMATCH" && issue.difference === -94_500));
  assert.ok(review.issues.some((issue) => issue.code === "NET_ASSETS_MISMATCH" && issue.difference === 261_280));
});

test("digitizes the supplied MF291 benchmark as one automatic 35-row, 105-value result", async (context) => {
  const benchmarkPath = "C:/Users/Cowork 2/OneDrive/Desktop/balance-sheet-a-financial-management-tool_MF291.pdf";
  let bytes;
  try {
    bytes = await readFile(benchmarkPath);
  } catch {
    context.skip("The explicitly supplied benchmark PDF is not available on this machine.");
    return;
  }

  const review = await readBalanceSheetFile(new File([bytes], "balance-sheet-a-financial-management-tool_MF291.pdf", { type: "application/pdf" }));
  assert.equal(review.statement.reportingEntity, "Joe and Jean Farmer");
  assert.equal(review.statement.reportingDate, "2017");
  assert.deepEqual(review.statement.periods, ["January 1", "December 31", "Average"]);
  assert.equal(review.lineItems.length, 35);
  assert.equal(review.lineItems.reduce((sum, item) => sum + item.values.length, 0), 105);
  assert.deepEqual([...new Set(review.lineItems.flatMap((item) => item.values.map((value) => value.source.page)))], [3]);
  assert.ok(review.lineItems.some((item) => item.originalLabel === "TOTAL FARM AND PERSONAL LIABILITIES" && item.normalizedConcept === "total_liabilities_including_personal"));
  assert.ok(review.lineItems.some((item) => item.originalLabel === "TOTAL FARM AND PERSONAL NET WORTH" && item.normalizedConcept === "total_net_worth_including_personal"));
  assert.equal(review.issues.some((issue) => issue.code === "CLASSIFICATION_ANOMALY" || issue.severity === "blocking"), false);
  assert.equal(review.issues.filter((issue) => issue.code === "ROUNDING_DIFFERENCE").length, 8);
  assert.ok(review.issues.every((issue) => issue.code === "ROUNDING_DIFFERENCE"));
  assert.ok(review.lineItems.every((item) => item.values.every((value) => value.source.fileName === "balance-sheet-a-financial-management-tool_MF291.pdf")));
});

test("normalizes common number formats without changing their raw representation", () => {
  assert.equal(parseReportedNumber("(1,250)"), -1_250);
  assert.equal(parseReportedNumber("$(296.60)"), -296.6);
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

test("exports a valid multi-sheet Excel package with typed figures and traceability", () => {
  const bytes = reviewToExcel(clean);
  const entries = readStoredZipEntries(bytes);

  assert.equal(String.fromCharCode(bytes[0], bytes[1]), "PK");
  assert.equal(balanceSheetExcelFileName(clean), "SYNTHETIC_Northstar_Balance_Sheet_2025-digitized.xlsx");
  assert.ok(entries.has("[Content_Types].xml"));
  assert.ok(entries.has("xl/workbook.xml"));
  assert.ok(entries.has("xl/styles.xml"));
  assert.match(entries.get("xl/workbook.xml"), /Balance Sheet/);
  assert.match(entries.get("xl/workbook.xml"), /Arithmetic Checks/);
  assert.match(entries.get("xl/workbook.xml"), /Findings/);
  assert.match(entries.get("xl/workbook.xml"), /Source Trace/);
  assert.match(entries.get("xl/worksheets/sheet1.xml"), /Cash and cash equivalents/);
  assert.match(entries.get("xl/worksheets/sheet1.xml"), /<v>8500<\/v>/);
  assert.match(entries.get("xl/worksheets/sheet4.xml"), /<v>8500000<\/v>/);
  assert.match(entries.get("xl/worksheets/sheet4.xml"), /rawReportedValue|Raw reported value/);
  assert.match(entries.get("xl/worksheets/sheet4.xml"), /digital-text/);
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

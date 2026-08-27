import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import {
  balanceSheetEvidenceScore,
  chooseOcrCandidatePages,
  OCR_DISCOVERY_BATCH_SIZE,
} from "../packages/tender-balance/src/file-reader.ts";
import { shouldReloadAfterPreloadFailure } from "../apps/tender-apps/src/preload-recovery.ts";

const imagePage = (pageNumber) => ({ pageNumber, text: "", extractionMethod: "digital-text", imageOnly: true });

test("reloads once for a stale Vite chunk and prevents a recovery loop", () => {
  assert.equal(shouldReloadAfterPreloadFailure(null, 100_000), true);
  assert.equal(shouldReloadAfterPreloadFailure("90000", 100_000), false);
  assert.equal(shouldReloadAfterPreloadFailure("60000", 100_000), true);
});

test("installs stale-chunk recovery before rendering TenderApps", async () => {
  const source = await readFile(new URL("../apps/tender-apps/src/main.tsx", import.meta.url), "utf8");
  assert.match(source, /installVitePreloadRecovery\(\);[\s\S]*createRoot\(root\)\.render/);
});

test("triages a large scanned PDF in bounded OCR batches", () => {
  const pages = Array.from({ length: 78 }, (_, index) => imagePage(index + 1));
  assert.deepEqual(chooseOcrCandidatePages(pages), Array.from({ length: OCR_DISCOVERY_BATCH_SIZE }, (_, index) => index + 1));
  const attempted = new Set(Array.from({ length: OCR_DISCOVERY_BATCH_SIZE }, (_, index) => index + 1));
  assert.deepEqual(chooseOcrCandidatePages(pages, attempted), Array.from({ length: OCR_DISCOVERY_BATCH_SIZE }, (_, index) => index + 13));
});

test("prioritizes image pages immediately after a searchable balance-sheet contents page", () => {
  const pages = [
    { pageNumber: 16, text: "Consolidated Financial Statements\nConsolidated Balance Sheets 1", extractionMethod: "digital-text", imageOnly: false },
    imagePage(17),
    imagePage(18),
    imagePage(19),
    imagePage(20),
  ];
  assert.deepEqual(chooseOcrCandidatePages(pages), [17, 18, 19]);
});

test("requires balance-sheet semantics and tabular evidence before ending OCR discovery", () => {
  assert.ok(balanceSheetEvidenceScore("Consolidated Balance Sheet\nTotal assets 100 90\nTotal liabilities 70 60\nStockholders' equity 30 30") >= 11);
  assert.ok(balanceSheetEvidenceScore("Independent auditor report\nSigned April 30, 2024") < 11);
  assert.ok(balanceSheetEvidenceScore("Consolidated Statement of Profit and Loss\nRevenue 100 90\nExpenses 70 60") < 11);
});

import { buildBalanceSheetReview, type BalanceSheetInput, type BalanceSheetConcept, type LineItemInput } from "./model.ts";

const periods2025 = ["2025", "2024"];

function values(periods: string[], amounts: Array<number | null>, confidence = 0.99) {
  return amounts.map((amount, index) => ({
    period: periods[index],
    raw: amount === null ? "—" : amount < 0 ? `(${Math.abs(amount).toLocaleString("en-US")})` : amount.toLocaleString("en-US"),
    value: amount,
    confidence,
    columnIndex: index,
  }));
}

function line(page: number, originalLabel: string, concept: BalanceSheetConcept, periods: string[], amounts: Array<number | null>, confidence = 0.99): LineItemInput {
  return { page, originalLabel, concept, values: values(periods, amounts, confidence), confidence, extractionMethod: confidence < 0.9 ? "ocr" : "digital-text" };
}

const cleanDigital: BalanceSheetInput = {
  source: {
    documentId: "synthetic:clean-digital-2025",
    fileName: "SYNTHETIC_Northstar_Balance_Sheet_2025.pdf",
    mimeType: "application/pdf",
    sha256: "synthetic-clean-2025-7d61a92d",
    pageCount: 2,
    expectedPageCount: 2,
    synthetic: true,
  },
  pages: [
    { pageNumber: 1, extractionMethod: "digital-text", confidence: 0.99, text: "SYNTHETIC FIXTURE — NOT CLIENT EVIDENCE\nNorthstar Components Ltd\nIndependent financial statements\nYear ended 31 December 2025" },
    { pageNumber: 2, extractionMethod: "digital-text", confidence: 0.99, text: "Northstar Components Ltd\nStatement of financial position / Balance sheet\n31 December 2025 and 2024\nCurrency: USD · amounts in thousands" },
  ],
  reportingEntity: "Northstar Components Ltd",
  reportingDate: "2025-12-31",
  periods: periods2025,
  currency: "USD",
  unitLabel: "thousands",
  unitScale: 1_000,
  language: "en",
  lineItems: [
    line(2, "Cash and cash equivalents", "cash_and_cash_equivalents", periods2025, [8_500, 7_500]),
    line(2, "Trade receivables", "trade_receivables", periods2025, [6_000, 5_500]),
    line(2, "Inventories", "inventories", periods2025, [5_000, 4_500]),
    line(2, "Other current assets", "other_current_assets", periods2025, [2_500, 2_000]),
    line(2, "Total current assets", "current_assets", periods2025, [22_000, 19_500]),
    line(2, "Property, plant and equipment", "property_plant_equipment", periods2025, [18_000, 16_500]),
    line(2, "Intangible assets", "intangible_assets", periods2025, [1_000, 1_000]),
    line(2, "TOTAL ASSETS", "total_assets", periods2025, [41_000, 37_000]),
    line(2, "Trade payables", "trade_payables", periods2025, [7_000, 6_500]),
    line(2, "Short-term borrowings", "short_term_borrowings", periods2025, [3_000, 2_500]),
    line(2, "Other current liabilities", "other_current_liabilities", periods2025, [2_000, 1_500]),
    line(2, "Total current liabilities", "current_liabilities", periods2025, [12_000, 10_500]),
    line(2, "Long-term borrowings", "long_term_borrowings", periods2025, [9_000, 8_500]),
    line(2, "TOTAL LIABILITIES", "total_liabilities", periods2025, [21_000, 19_000]),
    line(2, "Share capital", "share_capital", periods2025, [12_000, 12_000]),
    line(2, "Retained earnings", "retained_earnings", periods2025, [8_000, 6_000]),
    line(2, "TOTAL OWNERS’ EQUITY", "owners_equity", periods2025, [20_000, 18_000]),
    line(2, "Net assets", "net_assets", periods2025, [20_000, 18_000]),
  ],
};

const lowConfidenceScan: BalanceSheetInput = {
  source: {
    documentId: "synthetic:low-confidence-scan-2025",
    fileName: "SYNTHETIC_Tashkent_Machinery_Scanned_Balance_2025.pdf",
    mimeType: "application/pdf",
    sha256: "synthetic-ocr-2025-35bc2e11",
    pageCount: 1,
    expectedPageCount: 1,
    synthetic: true,
  },
  pages: [{ pageNumber: 1, extractionMethod: "ocr", confidence: 0.62, text: "SYNTHETIC OCR FIXTURE — NOT CLIENT EVIDENCE\nTashkent Machinery MCHJ\nBUXGALTERIYA BALANSI\n31.12.2025\nmln UZS" }],
  reportingEntity: "Tashkent Machinery MCHJ",
  reportingDate: "2025-12-31",
  periods: ["2025"],
  currency: "UZS",
  unitLabel: "millions",
  unitScale: 1_000_000,
  language: "uz",
  lineItems: [
    line(1, "Pul mablag'lari", "cash_and_cash_equivalents", ["2025"], [12], 0.58),
    line(1, "Debitor qarzdorlik", "trade_receivables", ["2025"], [18], 0.69),
    line(1, "Tovar-moddiy zaxiralar", "inventories", ["2025"], [12], 0.64),
    line(1, "Jami joriy aktivlar", "current_assets", ["2025"], [42], 0.61),
    line(1, "Asosiy vositalar", "property_plant_equipment", ["2025"], [33], 0.71),
    line(1, "Jami aktivlar", "total_assets", ["2025"], [75], 0.55),
    line(1, "Kreditor qarzdorlik", "trade_payables", ["2025"], [19], 0.66),
    line(1, "Qisqa muddatli qarzlar", "short_term_borrowings", ["2025"], [9], 0.59),
    line(1, "Jami joriy majburiyatlar", "current_liabilities", ["2025"], [28], 0.6),
    line(1, "Uzoq muddatli qarzlar", "long_term_borrowings", ["2025"], [12], 0.7),
    line(1, "Jami majburiyatlar", "total_liabilities", ["2025"], [40], 0.58),
    line(1, "Jami xususiy kapital", "owners_equity", ["2025"], [35], 0.63),
  ],
};

const negativeBalances: BalanceSheetInput = {
  source: {
    documentId: "synthetic:negative-balances-2025",
    fileName: "SYNTHETIC_Atlas_Services_Negative_Balances_2025.pdf",
    mimeType: "application/pdf",
    sha256: "synthetic-negative-2025-d221b9a0",
    pageCount: 1,
    expectedPageCount: 1,
    synthetic: true,
  },
  pages: [{ pageNumber: 1, extractionMethod: "digital-text", confidence: 0.98, text: "SYNTHETIC FIXTURE — NOT CLIENT EVIDENCE\nAtlas Services LLC\nBalance sheet\n31 December 2025\nUSD thousands" }],
  reportingEntity: "Atlas Services LLC",
  reportingDate: "2025-12-31",
  periods: ["2025"],
  currency: "USD",
  unitLabel: "thousands",
  unitScale: 1_000,
  language: "en",
  lineItems: [
    line(1, "Cash and cash equivalents", "cash_and_cash_equivalents", ["2025"], [2_000]),
    line(1, "Trade receivables", "trade_receivables", ["2025"], [2_500]),
    line(1, "Inventories", "inventories", ["2025"], [1_500]),
    line(1, "Total current assets", "current_assets", ["2025"], [6_000]),
    line(1, "Property, plant and equipment", "property_plant_equipment", ["2025"], [14_000]),
    line(1, "Total assets", "total_assets", ["2025"], [20_000]),
    line(1, "Trade payables", "trade_payables", ["2025"], [3_000]),
    line(1, "Short-term borrowings", "short_term_borrowings", ["2025"], [2_000]),
    line(1, "Total current liabilities", "current_liabilities", ["2025"], [5_000]),
    line(1, "Long-term borrowings", "long_term_borrowings", ["2025"], [9_000]),
    line(1, "Total liabilities", "total_liabilities", ["2025"], [14_000]),
    line(1, "Share capital", "share_capital", ["2025"], [10_000]),
    line(1, "Accumulated loss", "retained_earnings", ["2025"], [-4_000]),
    line(1, "Owners’ equity", "owners_equity", ["2025"], [6_000]),
  ],
};

const missingPage: BalanceSheetInput = {
  source: {
    documentId: "synthetic:missing-page-2025",
    fileName: "SYNTHETIC_Orion_Logistics_Incomplete_2025.pdf",
    mimeType: "application/pdf",
    sha256: "synthetic-missing-page-6c0369f1",
    pageCount: 3,
    expectedPageCount: 3,
    synthetic: true,
  },
  pages: [
    { pageNumber: 1, extractionMethod: "digital-text", confidence: 0.98, text: "SYNTHETIC FIXTURE — NOT CLIENT EVIDENCE\nOrion Logistics JSC\nFinancial statements 2025" },
    { pageNumber: 3, extractionMethod: "digital-text", confidence: 0.97, text: "Orion Logistics JSC\nBalance sheet continuation\nUSD thousands" },
  ],
  reportingEntity: "Orion Logistics JSC",
  reportingDate: "2025-12-31",
  periods: ["2025"],
  currency: "USD",
  unitLabel: "thousands",
  unitScale: 1_000,
  language: "en",
  lineItems: [
    line(3, "Cash and cash equivalents", "cash_and_cash_equivalents", ["2025"], [4_000]),
    line(3, "Trade receivables", "trade_receivables", ["2025"], [5_000]),
    line(3, "Inventories", "inventories", ["2025"], [3_000]),
    line(3, "Total current assets", "current_assets", ["2025"], [12_000]),
    line(3, "Property, plant and equipment", "property_plant_equipment", ["2025"], [18_000]),
    line(3, "Total assets", "total_assets", ["2025"], [30_000]),
    line(3, "Trade payables", "trade_payables", ["2025"], [4_000]),
    line(3, "Short-term borrowings", "short_term_borrowings", ["2025"], [3_000]),
    line(3, "Total current liabilities", "current_liabilities", ["2025"], [7_000]),
    line(3, "Long-term borrowings", "long_term_borrowings", ["2025"], [8_000]),
    line(3, "Total liabilities", "total_liabilities", ["2025"], [15_000]),
    line(3, "Owners’ equity", "owners_equity", ["2025"], [15_000]),
  ],
};

const comparativeConflict: BalanceSheetInput = {
  source: {
    documentId: "synthetic:comparative-conflict-2026",
    fileName: "SYNTHETIC_Northstar_Balance_Sheet_2026_Comparative_Conflict.pdf",
    mimeType: "application/pdf",
    sha256: "synthetic-comparative-2026-b6f84c31",
    pageCount: 1,
    expectedPageCount: 1,
    synthetic: true,
  },
  pages: [{ pageNumber: 1, extractionMethod: "digital-text", confidence: 0.99, text: "SYNTHETIC FIXTURE — NOT CLIENT EVIDENCE\nNorthstar Components Ltd\nStatement of financial position\n31 December 2026 with 2025 comparatives\nUSD thousands" }],
  reportingEntity: "Northstar Components Ltd",
  reportingDate: "2026-12-31",
  periods: ["2026", "2025"],
  currency: "USD",
  unitLabel: "thousands",
  unitScale: 1_000,
  language: "en",
  lineItems: [
    line(1, "Cash and cash equivalents", "cash_and_cash_equivalents", ["2026", "2025"], [9_000, 8_300]),
    line(1, "Trade receivables", "trade_receivables", ["2026", "2025"], [6_500, 6_000]),
    line(1, "Inventories", "inventories", ["2026", "2025"], [5_500, 5_000]),
    line(1, "Other current assets", "other_current_assets", ["2026", "2025"], [3_000, 2_500]),
    line(1, "Total current assets", "current_assets", ["2026", "2025"], [24_000, 21_800]),
    line(1, "Property, plant and equipment", "property_plant_equipment", ["2026", "2025"], [20_000, 18_000]),
    line(1, "Intangible assets", "intangible_assets", ["2026", "2025"], [1_000, 1_000]),
    line(1, "Total assets", "total_assets", ["2026", "2025"], [45_000, 40_800]),
    line(1, "Trade payables", "trade_payables", ["2026", "2025"], [7_500, 7_000]),
    line(1, "Short-term borrowings", "short_term_borrowings", ["2026", "2025"], [3_000, 3_000]),
    line(1, "Other current liabilities", "other_current_liabilities", ["2026", "2025"], [2_000, 2_000]),
    line(1, "Total current liabilities", "current_liabilities", ["2026", "2025"], [12_500, 12_000]),
    line(1, "Long-term borrowings", "long_term_borrowings", ["2026", "2025"], [10_500, 8_800]),
    line(1, "Total liabilities", "total_liabilities", ["2026", "2025"], [23_000, 20_800]),
    line(1, "Owners’ equity", "owners_equity", ["2026", "2025"], [22_000, 20_000]),
  ],
};

export const syntheticBalanceSheetInputs = [cleanDigital, lowConfidenceScan, negativeBalances, missingPage, comparativeConflict];
export const syntheticBalanceSheetReviews = syntheticBalanceSheetInputs.map(buildBalanceSheetReview);

export const syntheticFixtureLabels: Record<string, { label: string; description: string }> = {
  "synthetic:clean-digital-2025": { label: "Clean digital PDF", description: "Two periods, exact subtotals, complete provenance." },
  "synthetic:low-confidence-scan-2025": { label: "Low-confidence scan", description: "OCR-derived Uzbek labels; every low-confidence row needs review." },
  "synthetic:negative-balances-2025": { label: "Negative balance", description: "Accumulated loss is preserved as reported, without sign coercion." },
  "synthetic:missing-page-2025": { label: "Missing statement page", description: "Partial values remain visible, while approval is blocked." },
  "synthetic:comparative-conflict-2026": { label: "Comparative conflict", description: "2025 comparatives differ from the prior document and are flagged in Compare." },
};

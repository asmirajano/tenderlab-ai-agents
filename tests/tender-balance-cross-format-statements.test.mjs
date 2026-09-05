import assert from "node:assert/strict";
import test from "node:test";

import { buildBalanceSheetReview, parseStatementLine } from "../packages/tender-balance/src/model.ts";
import { prepareFin1FromBalanceReview } from "../packages/tender-balance/src/fin-forms.ts";

function source(documentId, fileName, pageCount) {
  return {
    documentId,
    fileName,
    mimeType: "application/pdf",
    sha256: `synthetic-${documentId}`,
    pageCount,
    expectedPageCount: pageCount,
    synthetic: true,
  };
}

test("does not reinterpret a three-digit comparative amount as a statutory row code", () => {
  assert.deepEqual(parseStatementLine("Share Capital\t\t1,277\t\t706", 2), {
    label: "Share Capital",
    rawValues: ["1,277", "706"],
  });
  assert.deepEqual(parseStatementLine("Total shareholders’ equity and liabilities\t150\t135", 2), {
    label: "Total shareholders’ equity and liabilities",
    rawValues: ["150", "135"],
  });
});

test("keeps a footnoted dash in its source column instead of promoting the note number", () => {
  assert.deepEqual(parseStatementLine("Issued capital\t\t26\t\t9\t\t–*", 2), {
    label: "Issued capital",
    rawValues: ["9", "–*"],
  });
});

test("uses an anchored income-statement title instead of a narrative mention", () => {
  const review = buildBalanceSheetReview({
    source: source("synthetic:income-page-authority", "SYNTHETIC_INCOME_PAGE_AUTHORITY.pdf", 3),
    pages: [
      {
        pageNumber: 1,
        extractionMethod: "digital-text",
        confidence: 0.99,
        text: [
          "Example Devices B.V.",
          "Balance sheet as at December 31, 2023",
          "2023\t2022",
          "€\t€",
          "Total assets\t400\t350",
          "Current assets\t250\t200",
          "Total liabilities\t300\t270",
          "Current liabilities\t180\t160",
          "Total shareholders’ equity\t100\t80",
        ].join("\n"),
      },
      {
        pageNumber: 2,
        extractionMethod: "digital-text",
        confidence: 0.99,
        text: [
          "Management report",
          "The Statement of Income and Expenses for the year is discussed in the financial statements.",
          "Result before taxation\t356,852\t1",
        ].join("\n"),
      },
      {
        pageNumber: 3,
        extractionMethod: "digital-text",
        confidence: 0.99,
        text: [
          "Example Devices B.V.",
          "Statement of Income and Expenses for the year ended December 31, 2023",
          "2023\t2022",
          "Net turnover\t500\t450",
          "Result before taxation\t50\t45",
          "Net result for the year\t40\t35",
        ].join("\n"),
      },
    ],
  });

  const { dataset } = prepareFin1FromBalanceReview(review);
  assert.equal(dataset.incomeStatementDetected, true);
  assert.equal(dataset.values.find((value) => value.field === "total_revenue" && value.displayYear === "2023")?.value, 500);
  assert.equal(dataset.values.find((value) => value.field === "profit_before_tax" && value.displayYear === "2023")?.value, 50);
  assert.equal(dataset.values.find((value) => value.field === "profit_after_tax" && value.displayYear === "2023")?.value, 40);
  assert.equal(dataset.sources.find((item) => item.sourceId.includes(":income:profit_before_tax:2023:"))?.page, 3);
});

test("derives complete total liabilities from assets and equity when provisions sit outside liability subtotals", () => {
  const review = buildBalanceSheetReview({
    source: source("synthetic:separate-provisions", "SYNTHETIC_SEPARATE_PROVISIONS.pdf", 1),
    pages: [{
      pageNumber: 1,
      extractionMethod: "digital-text",
      confidence: 0.99,
      text: "Example Devices B.V.\nBalance sheet as at December 31, 2023\n2023\t2022",
    }],
    periods: ["2023", "2022"],
    lineItems: [
      { page: 1, originalLabel: "Total assets", concept: "total_assets", classification: "asset", isTotal: true, values: [{ period: "2023", raw: "100", value: 100, confidence: 0.99 }, { period: "2022", raw: "90", value: 90, confidence: 0.99 }] },
      { page: 1, originalLabel: "Total shareholders’ equity", concept: "owners_equity", classification: "equity", isTotal: true, values: [{ period: "2023", raw: "25", value: 25, confidence: 0.99 }, { period: "2022", raw: "20", value: 20, confidence: 0.99 }] },
      { page: 1, originalLabel: "Provisions", concept: "other_non_current_liabilities", classification: "non_current_liability", values: [{ period: "2023", raw: "10", value: 10, confidence: 0.99 }, { period: "2022", raw: "8", value: 8, confidence: 0.99 }] },
      { page: 1, originalLabel: "Non-current liabilities", concept: "non_current_liabilities", classification: "non_current_liability", isTotal: true, values: [{ period: "2023", raw: "15", value: 15, confidence: 0.99 }, { period: "2022", raw: "12", value: 12, confidence: 0.99 }] },
      { page: 1, originalLabel: "Current liabilities", concept: "current_liabilities", classification: "current_liability", isTotal: true, values: [{ period: "2023", raw: "50", value: 50, confidence: 0.99 }, { period: "2022", raw: "50", value: 50, confidence: 0.99 }] },
    ],
  });

  const { dataset } = prepareFin1FromBalanceReview(review);
  const liabilities = dataset.values.find((value) => value.field === "total_liabilities" && value.displayYear === "2023");
  const netWorth = dataset.values.find((value) => value.field === "net_worth" && value.displayYear === "2023");
  assert.equal(liabilities?.value, 75);
  assert.equal(liabilities?.calculationFormula, "Total Assets − reported Net Worth");
  assert.equal(netWorth?.status, "ready");
  assert.equal(dataset.issues.some((issue) => issue.id.includes("net-worth:2023")), false);
});

test("prefers a consolidated GBP-thousands balance sheet over the following company-only statement", () => {
  const review = buildBalanceSheetReview({
    source: source("synthetic:consolidated-and-company", "SYNTHETIC_CONSOLIDATED_AND_COMPANY.pdf", 3),
    pages: [
      {
        pageNumber: 1,
        extractionMethod: "ocr",
        confidence: 0.95,
        text: [
          "Example Security plc",
          "Consolidated Balance Sheet",
          "As at 31 December 2023",
          "2023\t2022",
          "Note\t£000\t£000",
          "Fixed assets",
          "Intangible assets\t373\t488",
          "Tangible assets\t7,393\t7,002",
          "\t7,766\t7,490",
          "Current assets",
          "Stocks\t5,542\t9,760",
          "Debtors\t10,160\t10,568",
          "Cash at bank and in hand\t21,192\t23,572",
          "\t36,894\t43,900",
          "Creditors: amounts falling due within 1 year\t(12,005)\t(18,203)",
          "Net current assets\t24,889\t25,697",
          "Total assets less current liabilities\t32,655\t33,187",
          "Provisions for liabilities and charges\t(243)\t(387)",
          "Net assets\t32,412\t32,800",
          "Called up share capital\t44,126\t44,126",
          "Profit and loss account\t(11,714)\t(11,326)",
          "Equity shareholders’ funds\t32,412\t32,800",
          "The notes on pages 24 to 45 form part of these financial statements. Approved and authorised for issue.",
        ].join("\n"),
      },
      {
        pageNumber: 2,
        extractionMethod: "ocr",
        confidence: 0.95,
        text: [
          "Example Security plc",
          "Company Balance Sheet",
          "As at 31 December 2023",
          "2023\t2022",
          "Net assets\t31,497\t30,000",
          "Equity shareholders’ funds\t31,497\t30,000",
        ].join("\n"),
      },
      {
        pageNumber: 3,
        extractionMethod: "ocr",
        confidence: 0.55,
        text: "Narrative note page with low OCR confidence but no canonical balance-sheet values.",
      },
    ],
  });

  assert.deepEqual(review.pages.filter((page) => review.lineItems.some((item) => item.values.some((value) => value.source.page === page.pageNumber))).map((page) => page.pageNumber), [1]);
  assert.equal(review.statement.currency, "GBP");
  assert.equal(review.statement.unitLabel, "thousands");
  assert.equal(review.statement.unitScale, 1_000);
  assert.equal(review.lineItems.some((item) => /^(?:As at|Note|The notes on pages)/i.test(item.originalLabel)), false);
  const currentLiabilities = review.lineItems.find((item) => item.normalizedConcept === "current_liabilities");
  assert.equal(currentLiabilities?.classification, "current_liability");
  assert.deepEqual(currentLiabilities?.values.map((value) => value.reportedValue), [-12_005, -18_203]);
  assert.equal(review.lineItems.find((item) => item.originalLabel === "Tangible assets")?.normalizedConcept, "property_plant_equipment");
  assert.equal(review.lineItems.find((item) => item.originalLabel === "Stocks")?.normalizedConcept, "inventories");
  assert.equal(review.lineItems.find((item) => item.originalLabel === "Debtors")?.normalizedConcept, "trade_receivables");
  assert.equal(review.lineItems.find((item) => item.originalLabel === "Profit and loss account")?.normalizedConcept, "retained_earnings");
  assert.equal(review.lineItems.find((item) => item.originalLabel === "Equity shareholders’ funds")?.normalizedConcept, "owners_equity");
  assert.equal(review.issues.length, 0, JSON.stringify(review.issues, null, 2));
  assert.equal(review.lineItems.some((item) => item.values.some((value) => value.reportedValue === 31_497_000)), false);
});

test("anchors entity and unit scale to an ordinary EUR statement instead of narrative text", () => {
  const review = buildBalanceSheetReview({
    source: source("synthetic:euro-private-company", "SYNTHETIC_EURO_PRIVATE_COMPANY.pdf", 2),
    pages: [
      {
        pageNumber: 1,
        extractionMethod: "digital-text",
        confidence: 0.99,
        text: [
          "The company’s business objective",
          "The service reached three million customers during the year.",
        ].join("\n"),
      },
      {
        pageNumber: 2,
        extractionMethod: "digital-text",
        confidence: 0.99,
        text: [
          "Fair Devices B.V.",
          "Balance sheet as at December 31, 2026",
          "Notes\tDecember 31, 2026\tDecember 31, 2025",
          "€\t\t€",
          "Assets",
          "Total assets\t40,000\t31,000",
          "Shareholders’ equity",
          "Share Capital\t\t1,277\t\t706",
          "Total shareholders’ equity\t18,000\t13,000",
          "Current liabilities\t22,000\t18,000",
          "Total shareholders’ equity and liabilities\t40,000\t31,000",
        ].join("\n"),
      },
    ],
  });

  assert.equal(review.statement.reportingEntity, "Fair Devices B.V.");
  assert.equal(review.statement.currency, "EUR");
  assert.equal(review.statement.unitLabel, "units");
  assert.equal(review.statement.unitScale, 1);
  const shareCapital = review.lineItems.find((item) => item.normalizedConcept === "share_capital");
  assert.ok(shareCapital);
  assert.equal(shareCapital.originalLabel, "Share Capital");
  assert.deepEqual(shareCapital.values.map((value) => value.reportedValue), [1_277, 706]);
});

test("validates balance sheets that report provisions separately and derive total liabilities from assets and equity", () => {
  const review = buildBalanceSheetReview({
    source: source("synthetic:separate-provisions-review", "SYNTHETIC_SEPARATE_PROVISIONS_REVIEW.pdf", 1),
    pages: [{
      pageNumber: 1,
      extractionMethod: "digital-text",
      confidence: 0.99,
      text: [
        "Example Devices B.V.",
        "Balance sheet as at December 31, 2026",
        "2026\t2025",
        "€\t€",
        "Fixed assets",
        "Intangible fixed assets\t20\t18",
        "Tangible fixed assets\t30\t27",
        "Financial fixed asset\t10\t10",
        "Total fixed assets\t60\t55",
        "Inventory\t40\t35",
        "Receivables\t30\t25",
        "Cash and cash equivalents\t20\t20",
        "Total current assets\t90\t80",
        "Total assets\t150\t135",
        "Share Capital\t10\t10",
        "Share Premium\t20\t15",
        "Other legal reserves\t5\t5",
        "Undistributed result\t15\t10",
        "Total shareholders’ equity\t50\t40",
        "Provisions\t10\t8",
        "Non-current liabilities\t20\t17",
        "Current liabilities\t70\t70",
        "Total shareholders’ equity and liabilities\t150\t135",
      ].join("\n"),
    }],
  });

  assert.equal(review.lineItems.find((item) => item.originalLabel === "Total fixed assets")?.normalizedConcept, "non_current_assets");
  assert.equal(review.lineItems.find((item) => item.originalLabel === "Provisions")?.classification, "liability");
  assert.equal(review.lineItems.find((item) => item.originalLabel === "Receivables")?.normalizedConcept, "trade_receivables");
  assert.equal(review.lineItems.find((item) => item.originalLabel === "Share Premium")?.normalizedConcept, "other_equity");
  assert.equal(review.lineItems.find((item) => item.originalLabel === "Undistributed result")?.normalizedConcept, "retained_earnings");
  assert.equal(review.lineItems.find((item) => item.originalLabel === "Total shareholders’ equity and liabilities")?.normalizedConcept, "total_liabilities_and_equity");
  assert.equal(review.issues.length, 0, JSON.stringify(review.issues, null, 2));
  assert.equal(review.arithmeticChecks.every((check) => check.status === "passed"), true);
});

test("reconstructs split-label RMB statements and derives complete FIN balance fields", () => {
  const review = buildBalanceSheetReview({
    source: source("synthetic:split-rmb-position", "SYNTHETIC_SPLIT_RMB_POSITION.pdf", 3),
    pages: [
      {
        pageNumber: 1,
        extractionMethod: "digital-text",
        confidence: 0.99,
        text: [
          "Orbital Hygiene Group Ltd",
          "CONSOLIDATED STATEMENT OF FINANCIAL POSITION",
          "AT 31 December 2024",
          "2024\t2023",
          "NOTE\tRMB’000\tRMB’000",
          "Non-current assets",
          "Intangible assets",
          "12\t–\t10",
          "Investment properties",
          "13\t40\t41",
          "Property, plant and equipment",
          "14\t60\t59",
          "Deposits paid for acquisition of property, plant and",
          "equipment and right-of-use assets\t20\t10",
          "120\t120",
          "Current assets",
          "Inventories",
          "16\t30\t40",
          "Trade and other receivables",
          "17\t50\t60",
          "Cash and cash equivalents",
          "18\t20\t10",
          "100\t110",
          "Current liabilities",
          "Trade and other payables",
          "21\t40\t50",
          "Interest-bearing borrowings",
          "22\t10\t20",
          "50\t70",
          "Net current assets\t50\t40",
          "Total assets less current liabilities\t170\t160",
        ].join("\n"),
      },
      {
        pageNumber: 2,
        extractionMethod: "digital-text",
        confidence: 0.99,
        text: [
          "Orbital Hygiene Group Ltd",
          "CONSOLIDATED STATEMENT OF FINANCIAL POSITION",
          "AT 31 December 2024",
          "2024\t2023",
          "NOTE\tRMB’000\tRMB’000",
          "Non-current liabilities",
          "Lease liabilities",
          "15\t5\t6",
          "Deferred tax liabilities",
          "24\t5\t4",
          "10\t10",
          "NET ASSETS\t160\t150",
          "Capital and reserves",
          "Issued capital",
          "26\t10\t10",
          "Reserves",
          "26\t150\t140",
          "TOTAL EQUITY\t160\t150",
        ].join("\n"),
      },
      {
        pageNumber: 3,
        extractionMethod: "digital-text",
        confidence: 0.99,
        text: [
          "Orbital Hygiene Group Ltd",
          "CONSOLIDATED STATEMENT OF PROFIT OR LOSS AND",
          "OTHER COMPREHENSIVE INCOME",
          "Year ended December 31, 2024",
          "2024\t2023",
          "NOTE\tRMB’000\tRMB’000",
          "Revenue",
          "4\t300\t280",
          "Profit before tax\t90\t80",
          "Profit for the year\t70\t60",
        ].join("\n"),
      },
    ],
  });

  assert.equal(review.statement.currency, "RMB");
  assert.equal(review.statement.unitLabel, "thousands");
  assert.equal(review.statement.unitScale, 1_000);
  assert.equal(review.lineItems.some((item) => /^(?:AT 31|NOTE RMB)/i.test(item.originalLabel)), false);
  const intangible = review.lineItems.find((item) => item.originalLabel === "Intangible assets");
  assert.deepEqual(intangible?.values.map((value) => value.reportedValue), [null, 10]);
  assert.equal(intangible?.values[0]?.rawReportedValue, "–");
  assert.deepEqual(review.lineItems.find((item) => item.originalLabel === "Deposits paid for acquisition of property, plant and equipment and right-of-use assets")?.values.map((value) => value.reportedValue), [20, 10]);
  assert.deepEqual(review.lineItems.find((item) => item.normalizedConcept === "current_assets")?.values.map((value) => value.reportedValue), [100, 110]);
  assert.deepEqual(review.lineItems.find((item) => item.normalizedConcept === "non_current_assets")?.values.map((value) => value.reportedValue), [120, 120]);
  assert.deepEqual(review.lineItems.find((item) => item.normalizedConcept === "current_liabilities")?.values.map((value) => value.reportedValue), [50, 70]);
  assert.deepEqual(review.lineItems.find((item) => item.normalizedConcept === "non_current_liabilities")?.values.map((value) => value.reportedValue), [10, 10]);
  assert.equal(review.lineItems.find((item) => item.originalLabel === "Issued capital")?.normalizedConcept, "share_capital");
  assert.equal(review.lineItems.find((item) => item.originalLabel === "Reserves")?.normalizedConcept, "other_equity");

  const { dataset, form } = prepareFin1FromBalanceReview(review);
  assert.equal(dataset.values.find((value) => value.field === "total_assets" && value.displayYear === "2024")?.value, 220_000);
  assert.equal(dataset.values.find((value) => value.field === "total_liabilities" && value.displayYear === "2024")?.value, 60_000);
  assert.equal(dataset.values.find((value) => value.field === "total_revenue" && value.displayYear === "2024")?.value, 300_000);
  assert.equal(dataset.values.find((value) => value.field === "profit_before_tax" && value.displayYear === "2024")?.value, 90_000);
  assert.equal(dataset.values.find((value) => value.field === "profit_after_tax" && value.displayYear === "2024")?.value, 70_000);
  assert.equal(form.readiness.canGenerate, true);
  assert.equal(form.readiness.missingFields, 0);
});

import {
  TENDERMATCH_FORMULA_EXPORT_COLUMNS,
  formulaEvaluationExportRows,
  summarizeExploratoryEvaluations,
  type ExploratoryMatchEvaluation,
  type SupplierProfileApiRecord,
  type TenderRecord,
} from "../../../packages/tendermatch/src/index.ts";

const STATUS_ORDER = [
  "BINGO_MATCH",
  "STRONG_CANDIDATE",
  "POTENTIAL_MATCH",
  "NEEDS_VERIFICATION",
  "NO_MATCH",
  "BLOCKED_INELIGIBLE",
  "UNASSESSED",
] as const;

const COLUMN_WIDTHS = [
  38, 24, 18, 36, 24, 54, 34, 18, 24, 36, 24, 14, 18, 18,
  16, 20, 72, 92, 38, 62, 62, 72, 20, 36, 44, 24, 34,
] as const;

export async function tenderMatchFormulaToExcel(
  evaluations: ExploratoryMatchEvaluation[],
  tenders: TenderRecord[],
  suppliers: SupplierProfileApiRecord[],
): Promise<Uint8Array> {
  const { default: ExcelJS } = await import("exceljs");
  const workbook = new ExcelJS.Workbook();
  const summary = summarizeExploratoryEvaluations(evaluations);
  workbook.creator = "TenderApps · TenderMatch";
  workbook.created = new Date(summary.evaluatedAt);
  workbook.modified = new Date(summary.evaluatedAt);
  workbook.subject = "TenderMatch Formula v1.1 pair-scoring audit";
  workbook.title = "TenderMatch Formula v1.1 Audit";

  const overview = workbook.addWorksheet("Formula Summary", { views: [{ state: "frozen", ySplit: 1 }] });
  overview.columns = [{ width: 34 }, { width: 64 }];
  overview.addRow(["TenderMatch Formula v1.1", "Coverage-adjusted scoring audit"]);
  overview.addRows([
    ["Reader label", evaluations[0]?.label ?? "Preliminary notice-level match"],
    ["Engine version", summary.engineVersion],
    ["Policy version", summary.policyVersion],
    ["Evaluation timestamp", new Date(summary.evaluatedAt)],
    ["Tender records", tenders.length],
    ["Supplier profiles", suppliers.length],
    ["Unique pair evaluations", summary.total],
    ["Numeric pair scores", summary.numeric],
    ["Missing numeric scores", summary.missing],
    [],
    ["Pair status", "Count"],
    ...STATUS_ORDER.map((status) => [status, summary.byStatus[status]]),
    [],
    ["Scoring boundary", "This formula scores every pair; it does not define a Match or Non-match threshold."],
    ["Human authority", "Consultant decision remains separate; the workbook does not issue Bid/No-Bid, eligibility approval, or outreach action."],
    ["Evidence boundary", "STATED_UNVERIFIED and INFERRED remain explicit. This supplier batch contains zero VERIFIED claims."],
  ]);
  overview.getRow(1).font = { bold: true, color: { argb: "FFFFFFFF" }, size: 15 };
  overview.getRow(1).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF123B2D" } };
  overview.getRow(12).font = { bold: true, color: { argb: "FF123B2D" } };
  overview.getCell("B5").numFmt = "yyyy-mm-dd hh:mm:ss";
  overview.eachRow((row) => { row.alignment = { vertical: "top", wrapText: true }; });

  const pairs = workbook.addWorksheet("Pair Evaluations", {
    properties: { defaultRowHeight: 18 },
    views: [{ state: "frozen", xSplit: 2, ySplit: 1 }],
  });
  pairs.columns = TENDERMATCH_FORMULA_EXPORT_COLUMNS.map((header, index) => ({ header, key: `column-${index + 1}`, width: COLUMN_WIDTHS[index] }));
  const rows = formulaEvaluationExportRows(evaluations, tenders, suppliers);
  for (const values of rows) {
    const row = pairs.addRow(values.map((value, index) => index === 25 && typeof value === "string" ? new Date(value) : value));
    row.alignment = { vertical: "top", wrapText: true };
  }
  pairs.autoFilter = { from: "A1", to: "Z1" };
  pairs.getRow(1).height = 34;
  pairs.getRow(1).font = { bold: true, color: { argb: "FFFFFFFF" } };
  pairs.getRow(1).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF123B2D" } };
  pairs.getRow(1).alignment = { horizontal: "center", vertical: "middle", wrapText: true };
  pairs.getColumn(12).numFmt = "0";
  pairs.getColumn(13).numFmt = "0";
  pairs.getColumn(15).numFmt = '0"%"';
  pairs.getColumn(16).numFmt = '0"%"';
  pairs.getColumn(26).numFmt = "yyyy-mm-dd hh:mm:ss";

  const buffer = await workbook.xlsx.writeBuffer();
  return new Uint8Array(buffer as ArrayBuffer);
}

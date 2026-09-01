import type { ExploratoryMatchEvaluation } from "./exploratory-matching.ts";
import type { SupplierProfileApiRecord } from "./supplier-contract.ts";
import type { TenderRecord } from "./types.ts";

function cell(value: unknown) {
  const text = value === null || value === undefined ? "" : typeof value === "string" ? value : JSON.stringify(value);
  return `"${text.replace(/"/g, '""')}"`;
}

export const TENDERMATCH_FORMULA_EXPORT_COLUMNS = [
  "Tender ID", "Tender reference", "Tender procurement type", "Tender snapshot", "Tender version",
  "Supplier ID", "Supplier name", "Supplier role", "Supplier profile version", "Supplier batch",
  "Scoring stage", "Pair Score", "Assessed Fit Score", "Score value class", "Data Coverage", "Evidence Confidence",
  "Mandatory gates", "Weighted criteria", "Main reason", "Blockers", "Missing inputs", "Evidence IDs",
  "Consultant decision", "Engine version", "Policy version", "Evaluated at", "Reader label",
] as const;

export type TenderMatchFormulaExportCell = string | number | null;

export function formulaEvaluationExportRows(evaluations: ExploratoryMatchEvaluation[], tenders: TenderRecord[], suppliers: SupplierProfileApiRecord[]): TenderMatchFormulaExportCell[][] {
  const tenderById = new Map(tenders.map((tender) => [tender.id, tender]));
  const supplierById = new Map(suppliers.map((supplier) => [`supplier:NEON:${supplier.canonicalEntityId}`, supplier]));
  return evaluations.map((evaluation) => {
    const tender = tenderById.get(evaluation.tenderId);
    const supplier = supplierById.get(evaluation.supplierId);
    return [
      evaluation.tenderId, evaluation.tenderReference, tender?.procurementType ?? "UNKNOWN", evaluation.tenderSnapshotId, evaluation.tenderVersion,
      evaluation.supplierId, supplier?.displayName ?? "Unknown supplier", evaluation.procurementApplicability.supplierClassification, evaluation.supplierProfileVersion, evaluation.supplierBatchCode,
      "SCORING_ONLY", evaluation.value, evaluation.assessedFitScore, evaluation.valueClass, evaluation.dataCoverage, evaluation.evidenceConfidence,
      JSON.stringify(evaluation.mandatoryGates), JSON.stringify(evaluation.criteria), evaluation.mainReason, evaluation.blockers.join(" | "), evaluation.missingInputs.join(" | "), evaluation.evidenceIds.join(" | "),
      evaluation.consultantDecision, evaluation.engineVersion, evaluation.policyVersion, evaluation.evaluatedAt, evaluation.label,
    ];
  });
}

export function formulaEvaluationsToCsv(evaluations: ExploratoryMatchEvaluation[], tenders: TenderRecord[], suppliers: SupplierProfileApiRecord[]) {
  const rows = formulaEvaluationExportRows(evaluations, tenders, suppliers).map((row) => row.map(cell).join(","));
  return `${TENDERMATCH_FORMULA_EXPORT_COLUMNS.map(cell).join(",")}\r\n${rows.join("\r\n")}\r\n`;
}

export function tenderMatchFormulaExportFileName(evaluatedAt: string) {
  return `TenderMatch-Formula-v1-${evaluatedAt.slice(0, 10)}.csv`;
}

export function tenderMatchFormulaExcelFileName(evaluatedAt: string) {
  return `TenderMatch-Formula-v1-${evaluatedAt.slice(0, 10)}.xlsx`;
}

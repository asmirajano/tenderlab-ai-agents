import type { WorkSheet } from "xlsx";
import type {
  CalculationInput,
  CalculationResult,
  CostLine,
  DocumentIntakeRecord,
  ProductionLogisticsEstimate,
} from "../../../packages/logistics-costing/src";

export type LogisticsCalculationWorkbookModel = {
  caseId: string;
  caseName: string;
  savedAt?: string;
  cargo: string;
  quantity: string;
  origin: string;
  destination: string;
  transportMode: string;
  specialCargoDeclaration: string;
  input: CalculationInput;
  result: CalculationResult;
  productionEstimate: ProductionLogisticsEstimate;
  effectiveCostLines: CostLine[];
  warnings: string[];
  sourceDocuments: Array<Pick<DocumentIntakeRecord, "fileName" | "status" | "facts" | "warnings" | "documentProfile" | "extractionMethod">>;
};

function excelText(value: unknown) {
  if (Array.isArray(value)) return value.join("; ");
  if (value === undefined || value === null) return "";
  return String(value);
}

function derivationInputs(line: CostLine) {
  return line.calculation?.inputs.map((input) => `${input.label}: ${input.value}${input.unit ? ` ${input.unit}` : ""} [${input.evidenceKind}; ${input.sourceRef}]`).join(" | ") ?? "";
}

function setSheetWidths(sheet: WorkSheet, widths: number[]) {
  sheet["!cols"] = widths.map((wch) => ({ wch }));
  sheet["!autofilter"] = sheet["!ref"] ? { ref: sheet["!ref"] } : undefined;
}

function styleRange(sheet: WorkSheet, XLSX: typeof import("xlsx"), range: string, style: Record<string, unknown>) {
  const decoded = XLSX.utils.decode_range(range);
  for (let row = decoded.s.r; row <= decoded.e.r; row += 1) {
    for (let column = decoded.s.c; column <= decoded.e.c; column += 1) {
      const address = XLSX.utils.encode_cell({ r: row, c: column });
      const cell = (sheet[address] ??= { t: "s", v: "" }) as { s?: Record<string, unknown> };
      cell.s = style;
    }
  }
}

function setNumberFormat(sheet: WorkSheet, XLSX: typeof import("xlsx"), range: string, format: string) {
  const decoded = XLSX.utils.decode_range(range);
  for (let row = decoded.s.r; row <= decoded.e.r; row += 1) {
    for (let column = decoded.s.c; column <= decoded.e.c; column += 1) {
      const cell = sheet[XLSX.utils.encode_cell({ r: row, c: column })] as { z?: string } | undefined;
      if (cell) cell.z = format;
    }
  }
}

function formatAuditSheet(sheet: WorkSheet, XLSX: typeof import("xlsx"), headerRange: string, bodyRange: string) {
  styleRange(sheet, XLSX, headerRange, {
    fill: { fgColor: { rgb: "0D3026" } },
    font: { bold: true, color: { rgb: "FFFFFF" } },
    alignment: { vertical: "center", wrapText: true },
  });
  styleRange(sheet, XLSX, bodyRange, {
    alignment: { vertical: "top", wrapText: true },
  });
  sheet["!rows"] = [{ hpt: 30 }];
}

export function logisticsCalculationExcelFileName(model: LogisticsCalculationWorkbookModel) {
  const safe = model.caseName.trim().replace(/[\\/:*?"<>|]+/g, "-").replace(/\s+/g, "-").slice(0, 80) || "tender-logistics-cost";
  return `${safe}-calculation.xlsx`;
}

export async function logisticsCalculationToExcel(model: LogisticsCalculationWorkbookModel): Promise<Uint8Array> {
  const XLSX = await import("xlsx");
  const workbook = XLSX.utils.book_new();
  workbook.Props = {
    Title: `${model.caseName} · Tender Logistics Cost calculation`,
    Subject: "Audit-friendly logistics costing workbook",
    Author: "TenderApps · Tender Logistics Cost",
    Comments: "Generated from the same canonical calculation model used by the Results Dashboard.",
  };

  const costRows = model.effectiveCostLines.map((line) => {
    const treatment = model.result.treatments.find((candidate) => candidate.lineId === line.id || candidate.component === line.component && candidate.label === line.label);
    const agentEstimate = line.agentEstimate?.calculation?.resultValue ?? line.agentEstimate?.amount ?? (line.evidenceKind === "assumption" ? line.amount : undefined);
    const override = line.userOverride?.amount;
    const effective = treatment?.treatment === "added" ? treatment.amount : treatment?.treatment === "removed" ? -treatment.amount : line.component === "insurance" ? model.result.insurance : 0;
    return [
      line.component,
      line.label,
      treatment?.treatment ?? "excluded",
      agentEstimate ?? "",
      override ?? "",
      line.currency,
      effective,
      line.calculation?.formula ?? line.note ?? "",
      derivationInputs(line),
      line.calculation?.benchmark?.id ?? "",
      line.calculation?.benchmark?.asOf ?? line.rateDate ?? "",
      line.calculation?.confidence ?? line.confidence,
      line.sourceRef ?? "",
      line.userOverride?.sourceRef ?? "",
      excelText(line.calculation?.assumptions ?? []),
    ];
  });
  const costHeader = ["Component code", "Logistics component", "Responsibility treatment", "Agent estimate", "User-adjusted value", "Currency", "Effective amount", "Calculation formula", "Inputs used and provenance", "Benchmark ID", "Benchmark vintage", "Confidence", "Source / provenance", "Override provenance", "Assumptions"];
  const costSheet = XLSX.utils.aoa_to_sheet([costHeader, ...costRows, ["", "Estimated Logistics Cost", "", "", "", model.result.currency, { t: "n", v: model.result.incrementalCost, f: `SUM(G2:G${costRows.length + 1})` }]]);
  setSheetWidths(costSheet, [20, 30, 22, 16, 18, 10, 16, 50, 90, 32, 18, 14, 55, 35, 55]);
  formatAuditSheet(costSheet, XLSX, "A1:O1", `A2:O${costRows.length + 2}`);
  styleRange(costSheet, XLSX, `A${costRows.length + 2}:O${costRows.length + 2}`, {
    fill: { fgColor: { rgb: "DFF3E7" } },
    font: { bold: true, color: { rgb: "0D3026" } },
    alignment: { vertical: "center", wrapText: true },
  });
  setNumberFormat(costSheet, XLSX, `D2:G${costRows.length + 2}`, "#,##0.00");
  costSheet["!autofilter"] = { ref: `A1:O${costRows.length + 1}` };
  XLSX.utils.book_append_sheet(workbook, costSheet, "Cost Model");

  const cargoRows = model.productionEstimate.cargo.calculationRows.map((row) => [
    row.id,
    row.description,
    row.quantity,
    row.sourceMetric,
    row.estimationMethod,
    row.unitVolumeM3,
    row.estimatedVolumeM3,
    row.unitGrossWeightKg,
    row.estimatedGrossWeightKg,
    row.confidence,
    row.sourceRef,
  ]);
  const cargoHeader = ["Row / group ID", "Item or calculation group", "Qty / source lines", "Source dimension / weight status", "Packing / estimation method", "Unit volume m³", "Estimated packed volume m³", "Unit gross weight kg", "Estimated gross weight kg", "Confidence", "Source / provenance"];
  const cargoTotalRow = cargoRows.length + 2;
  const cargoSheet = XLSX.utils.aoa_to_sheet([
    cargoHeader,
    ...cargoRows,
    ["", "Cargo totals", "", "", "", "", { t: "n", v: model.productionEstimate.cargo.packedVolumeM3.value, f: `SUM(G2:G${cargoTotalRow - 1})` }, "", { t: "n", v: model.productionEstimate.cargo.grossWeightKg.value, f: `SUM(I2:I${cargoTotalRow - 1})` }],
    [],
    ["Loadability factor", model.productionEstimate.cargo.loadabilityFactor.value, "Planning volume m³", model.productionEstimate.cargo.planningVolumeM3, "Formula", "packed volume ÷ loadability factor"],
    ["Required transport units", model.productionEstimate.transport.requiredTruckCount, "Unit", model.productionEstimate.transport.unit.label, "Limiting factor", model.productionEstimate.transport.limitingFactor],
    ["Confidence score", model.productionEstimate.confidence.score, "Confidence label", model.productionEstimate.confidence.label, "Main uncertainty", model.productionEstimate.confidence.mainUncertainty],
    [],
    ["Confidence factors"],
    ...model.productionEstimate.cargo.confidenceFactors.map((factor) => [factor]),
  ]);
  setSheetWidths(cargoSheet, [30, 44, 18, 56, 64, 18, 24, 20, 26, 14, 58]);
  formatAuditSheet(cargoSheet, XLSX, "A1:K1", `A2:K${Math.max(cargoSheet["!ref"] ? XLSX.utils.decode_range(cargoSheet["!ref"]).e.r + 1 : 2, 2)}`);
  styleRange(cargoSheet, XLSX, `A${cargoTotalRow}:K${cargoTotalRow}`, {
    fill: { fgColor: { rgb: "DFF3E7" } },
    font: { bold: true, color: { rgb: "0D3026" } },
    alignment: { vertical: "center", wrapText: true },
  });
  setNumberFormat(cargoSheet, XLSX, `F2:I${cargoTotalRow}`, "#,##0.000");
  XLSX.utils.book_append_sheet(workbook, cargoSheet, "Cargo Model");

  const costTotalCell = `'Cost Model'!G${costRows.length + 2}`;
  const summaryRows: unknown[][] = [
    ["TENDER LOGISTICS COST · CANONICAL CALCULATION EXPORT"],
    ["Case ID", model.caseId],
    ["Case name", model.caseName],
    ["Saved / exported at", model.savedAt ?? new Date().toISOString()],
    [],
    ["SOURCE / TARGET"],
    ["Source Incoterm", model.input.sourceTerm],
    ["Source named place", model.input.sourceNamedPlace],
    ["Target Incoterm", model.input.targetTerm ?? model.input.logisticsScopeIncoterm ?? ""],
    ["Target named place", model.input.targetNamedPlace ?? model.destination],
    ["Route", `${model.origin} → ${model.destination}`],
    ["Transport mode", model.transportMode],
    [],
    ["CARGO / TRANSPORT"],
    ["Cargo", model.cargo],
    ["Quantity / package count", model.quantity],
    ["Estimated packed volume m³", model.productionEstimate.cargo.packedVolumeM3.value],
    ["Estimated gross weight kg", model.productionEstimate.cargo.grossWeightKg.value],
    ["Planning volume m³", model.productionEstimate.cargo.planningVolumeM3],
    ["Transport requirement", `${model.productionEstimate.transport.requiredTruckCount} × ${model.productionEstimate.transport.unit.label}`],
    ["Limiting factor", model.productionEstimate.transport.limitingFactor],
    [],
    ["COMMERCIAL SUMMARY"],
    ["Source commercial value", model.result.sourceContractTotal, model.result.currency],
    ["Estimated Logistics Cost", { t: "n", v: model.result.incrementalCost, f: costTotalCell }, model.result.currency],
    ["Estimated target commercial total", { t: "n", v: model.result.revisedContractTotal, f: `B24+B25` }, model.result.currency],
    ["Estimated logistics uplift", { t: "n", v: model.result.logisticsUpliftPercent / 100, f: `IF(B24=0,0,B25/B24)` }, "%"],
    [],
    ["Insurance", model.result.insurance, model.result.currency],
    ["Duties / taxes", model.result.dutiesTaxes, model.result.currency],
    ["Special-cargo declaration", model.specialCargoDeclaration || "Not confirmed"],
    ["Calculation status", model.result.status],
    ["Engine version", model.result.audit.engineVersion],
  ];
  const summarySheet = XLSX.utils.aoa_to_sheet(summaryRows);
  summarySheet.B27 = { t: "n", v: model.result.logisticsUpliftPercent / 100, f: "IF(B24=0,0,B25/B24)", z: "0.0%" };
  setSheetWidths(summarySheet, [34, 72, 18]);
  styleRange(summarySheet, XLSX, "A1:C1", {
    fill: { fgColor: { rgb: "0D3026" } },
    font: { bold: true, color: { rgb: "FFFFFF" }, sz: 16 },
    alignment: { vertical: "center" },
  });
  for (const row of [6, 14, 23]) styleRange(summarySheet, XLSX, `A${row}:C${row}`, {
    fill: { fgColor: { rgb: "DFF3E7" } },
    font: { bold: true, color: { rgb: "08795E" } },
    alignment: { vertical: "center" },
  });
  styleRange(summarySheet, XLSX, "A24:C27", { alignment: { vertical: "center" }, font: { bold: true } });
  styleRange(summarySheet, XLSX, "A25:C26", {
    fill: { fgColor: { rgb: "ECF8F0" } },
    font: { bold: true, color: { rgb: "0D3026" } },
    alignment: { vertical: "center" },
  });
  setNumberFormat(summarySheet, XLSX, "B17:B19", "#,##0.000");
  setNumberFormat(summarySheet, XLSX, "B24:B26", "#,##0.00");
  summarySheet["!rows"] = [{ hpt: 34 }, ...Array(32).fill({ hpt: 20 })];
  XLSX.utils.book_append_sheet(workbook, summarySheet, "Summary");

  const sourceRows: unknown[][] = [
    ["Type", "Detail", "Source / date"],
    ...model.productionEstimate.assumptions.map((value) => ["Assumption", value, model.productionEstimate.benchmark.sourceRef]),
    ...model.warnings.map((value) => ["Warning / exclusion", value, "Canonical result snapshot"]),
    ...model.sourceDocuments.flatMap((document) => [
      ["Source document", document.fileName, `${document.extractionMethod ?? "unknown"} · ${document.status}`],
      ...document.facts.map((fact) => ["Document fact", fact, document.fileName]),
      ...document.warnings.map((warning) => ["Document warning", warning.message, `${document.fileName} · ${warning.code}`]),
    ]),
  ];
  const sourcesSheet = XLSX.utils.aoa_to_sheet(sourceRows);
  setSheetWidths(sourcesSheet, [24, 100, 65]);
  formatAuditSheet(sourcesSheet, XLSX, "A1:C1", `A2:C${sourceRows.length}`);
  XLSX.utils.book_append_sheet(workbook, sourcesSheet, "Assumptions & Sources");

  const output = XLSX.write(workbook, { type: "array", bookType: "xlsx", compression: true, cellStyles: true }) as ArrayBuffer | Uint8Array;
  return output instanceof Uint8Array ? output : new Uint8Array(output);
}

import type { Cell, Worksheet } from "exceljs";
import type {
  CalculationInput,
  CalculationResult,
  CommercialItemEvidence,
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
  sourceDocuments: Array<Pick<DocumentIntakeRecord, "fileName" | "status" | "facts" | "warnings" | "documentProfile" | "extractionMethod" | "commercialItems" | "fieldSources" | "fieldEvidence">>;
};

type CellRef = { address: string; result: number };
type CargoSheetRefs = {
  packedVolume: CellRef;
  grossWeight: CellRef;
  planningVolume: CellRef;
  requiredUnits: CellRef;
  displayedUnits: CellRef;
  limitingFactor: { address: string; result: string };
};
type CostSheetRefs = {
  total: CellRef;
  insurance: CellRef;
  targetTotal: CellRef;
  uplift: CellRef;
  componentRows: Array<{ line: CostLine; row: number; effective: number }>;
};

const COLORS = {
  ink: "0C2F26",
  green: "08795E",
  lime: "C9F45D",
  pale: "E8F4ED",
  paleBlue: "EAF2F5",
  input: "FFF2CC",
  assumption: "FCE8D8",
  formula: "E2F0D9",
  warning: "FFF4E5",
  white: "FFFFFF",
  grid: "C9D7D1",
  muted: "60736D",
};

const moneyFormat = '"USD" #,##0.00;[Red]-"USD" #,##0.00';
const integerFormat = "#,##0";
const decimalFormat = "#,##0.000";
const percentFormat = "0.0%";

function quotedSheet(name: string) {
  return `'${name.replaceAll("'", "''")}'`;
}

function fill(color: string) {
  return { type: "pattern" as const, pattern: "solid" as const, fgColor: { argb: color } };
}

function border() {
  const side = { style: "thin" as const, color: { argb: COLORS.grid } };
  return { top: side, left: side, bottom: side, right: side };
}

function setFormula(cell: Cell, formula: string, result: number | string | boolean) {
  cell.value = { formula, result };
}

function styleTitle(sheet: Worksheet, range: string, title: string, subtitle?: string) {
  sheet.mergeCells(range);
  const cell = sheet.getCell(range.split(":")[0]);
  cell.value = title;
  cell.fill = fill(COLORS.ink);
  cell.font = { name: "Aptos Display", size: 20, bold: true, color: { argb: COLORS.white } };
  cell.alignment = { vertical: "middle", horizontal: "left" };
  sheet.getRow(cell.row).height = 38;
  if (subtitle) {
    const row = cell.row + 1;
    const start = range.split(":")[0].replace(/\d+$/, String(row));
    const end = range.split(":")[1].replace(/\d+$/, String(row));
    sheet.mergeCells(`${start}:${end}`);
    const subtitleCell = sheet.getCell(start);
    subtitleCell.value = subtitle;
    subtitleCell.font = { name: "Aptos", size: 10, color: { argb: COLORS.muted }, italic: true };
    subtitleCell.alignment = { wrapText: true, vertical: "middle" };
    sheet.getRow(row).height = 30;
  }
}

function styleSection(sheet: Worksheet, row: number, title: string, lastColumn: number) {
  sheet.mergeCells(row, 1, row, lastColumn);
  const cell = sheet.getCell(row, 1);
  cell.value = title.toUpperCase();
  cell.fill = fill(COLORS.pale);
  cell.font = { name: "Aptos", size: 10, bold: true, color: { argb: COLORS.green } };
  cell.alignment = { vertical: "middle" };
  sheet.getRow(row).height = 23;
}

function styleHeaderRow(sheet: Worksheet, row: number, firstColumn: number, lastColumn: number) {
  for (let column = firstColumn; column <= lastColumn; column += 1) {
    const cell = sheet.getCell(row, column);
    cell.fill = fill(COLORS.ink);
    cell.font = { name: "Aptos", size: 9, bold: true, color: { argb: COLORS.white } };
    cell.alignment = { vertical: "middle", horizontal: "center", wrapText: true };
    cell.border = border();
  }
  sheet.getRow(row).height = 32;
}

function styleDataRange(sheet: Worksheet, startRow: number, endRow: number, firstColumn: number, lastColumn: number) {
  for (let row = startRow; row <= endRow; row += 1) {
    for (let column = firstColumn; column <= lastColumn; column += 1) {
      const cell = sheet.getCell(row, column);
      cell.font = { name: "Aptos", size: 9, color: { argb: COLORS.ink } };
      cell.alignment = { vertical: "top", wrapText: true };
      cell.border = border();
    }
  }
}

function configurePrint(sheet: Worksheet, orientation: "portrait" | "landscape", printArea: string, repeatRows?: string) {
  sheet.pageSetup = {
    orientation,
    paperSize: 9,
    fitToPage: true,
    fitToWidth: 1,
    fitToHeight: 0,
    horizontalCentered: true,
    margins: { left: 0.35, right: 0.35, top: 0.55, bottom: 0.55, header: 0.2, footer: 0.25 },
    printArea,
    ...(repeatRows ? { printTitlesRow: repeatRows } : {}),
  };
  sheet.headerFooter = {
    oddHeader: `&L&BTenderApps · Tender Logistics Cost&R${sheet.name}`,
    oddFooter: "&LPreliminary estimate · not a carrier quotation&CPage &P of &N&RGenerated from canonical Case data",
  };
  sheet.views = [{ state: "frozen", ySplit: repeatRows ? Number(repeatRows.split(":")[1]) : 2, showGridLines: false }];
}

function uniqueCommercialItems(model: LogisticsCalculationWorkbookModel) {
  const seen = new Set<string>();
  const items: CommercialItemEvidence[] = [];
  for (const document of model.sourceDocuments) {
    for (const item of document.commercialItems ?? []) {
      const key = `${document.fileName}:${item.id}`;
      if (!seen.has(key)) {
        seen.add(key);
        items.push(item);
      }
    }
  }
  return items;
}

function sourceInputRows(model: LogisticsCalculationWorkbookModel) {
  return [
    ["Case", "Case ID", model.caseId, "", "Saved Case", "confirmed"],
    ["Case", "Case name", model.caseName, "", "Client Case", "confirmed"],
    ["Route", "Source Incoterm", model.input.sourceTerm, "Incoterms® 2020", "Supplier/source condition", "high"],
    ["Route", "Source named place", model.input.sourceNamedPlace, "", "Supplier/document or client input", "medium"],
    ["Route", "Target Incoterm", model.input.targetTerm ?? model.input.logisticsScopeIncoterm ?? "", "Incoterms® 2020", "Client-selected target", "confirmed"],
    ["Route", "Target named place", model.input.targetNamedPlace ?? model.destination, "", "Client/document case input", "confirmed"],
    ["Route", "Transport mode", model.transportMode, "", "Mandatory client input", "confirmed"],
    ["Commercial", "Source commercial value", model.result.sourceContractTotal, model.result.currency, "Working quotation baseline", "high"],
    ["Commercial", "Currency", model.result.currency, "", "Source/client input", "high"],
    ["Cargo", "Cargo description", model.cargo, "", "Source document/client input", "medium"],
    ["Cargo", "Quantity description", model.quantity, "", "Source document/client input", "medium"],
    ["Cargo assumption", "Loadability factor", model.productionEstimate.cargo.loadabilityFactor.value, "% as decimal", model.productionEstimate.cargo.loadabilityFactor.sourceRef, model.productionEstimate.cargo.loadabilityFactor.confidence],
    ["Transport reference", "Usable volume per unit", model.productionEstimate.transport.unit.usableVolumeM3, "m³", model.productionEstimate.transport.unit.label, "medium"],
    ["Transport reference", "Payload per unit", model.productionEstimate.transport.unit.payloadKg, "kg", model.productionEstimate.transport.unit.label, "medium"],
    ["Transit", "Minimum transit", model.productionEstimate.transport.transitDays[0], "days", model.productionEstimate.benchmark.id, "low"],
    ["Transit", "Maximum transit", model.productionEstimate.transport.transitDays[1], "days", model.productionEstimate.benchmark.id, "low"],
    ["Benchmark", "Benchmark ID", model.productionEstimate.benchmark.id, "", model.productionEstimate.benchmark.sourceRef, "low"],
    ["Benchmark", "Benchmark label", model.productionEstimate.benchmark.label, "", model.productionEstimate.benchmark.sourceRef, "low"],
    ["Benchmark", "Benchmark vintage", model.productionEstimate.benchmark.asOf, "", model.productionEstimate.benchmark.sourceRef, "low"],
    ["Approval", "Special-cargo declaration", model.specialCargoDeclaration || "Not confirmed", "", "Client case state", model.specialCargoDeclaration ? "confirmed" : "provisional"],
  ];
}

function addSourceInputsSheet(workbook: import("exceljs").Workbook, model: LogisticsCalculationWorkbookModel) {
  const sheet = workbook.addWorksheet("Source & Inputs", { properties: { tabColor: { argb: COLORS.input } } });
  styleTitle(sheet, "A1:F1", "SOURCE, USER INPUTS & ASSUMPTIONS", "Yellow/orange cells are editable source or benchmark inputs. Formula sheets reference these cells.");
  const headers = ["Type", "Input / fact", "Value", "Unit", "Source / provenance", "Confidence"];
  headers.forEach((value, index) => { sheet.getCell(4, index + 1).value = value; });
  styleHeaderRow(sheet, 4, 1, 6);
  const rows = sourceInputRows(model);
  rows.forEach((values, index) => {
    const row = index + 5;
    values.forEach((value, column) => { sheet.getCell(row, column + 1).value = value; });
    sheet.getCell(row, 3).fill = fill(values[0] === "Cargo assumption" || values[0] === "Transport reference" || values[0] === "Benchmark" || values[0] === "Transit" ? COLORS.assumption : COLORS.input);
  });
  styleDataRange(sheet, 5, rows.length + 4, 1, 6);
  sheet.getCell("C12").numFmt = moneyFormat;
  sheet.getCell("C16").numFmt = "0.0%";

  const refs = {
    sourceValue: `C12`,
    loadability: `C16`,
    usableVolume: `C17`,
    payload: `C18`,
    transitMin: `C19`,
    transitMax: `C20`,
  };

  let row = rows.length + 7;
  styleSection(sheet, row, "Commercial source lines preserved from the uploaded evidence", 6);
  row += 1;
  ["Item code", "Description", "Commercial quantity", "Unit price", "Line total", "Source / working baseline"].forEach((value, index) => { sheet.getCell(row, index + 1).value = value; });
  styleHeaderRow(sheet, row, 1, 6);
  const items = uniqueCommercialItems(model);
  if (!items.length) {
    row += 1;
    sheet.mergeCells(row, 1, row, 6);
    sheet.getCell(row, 1).value = "Item-level commercial evidence was not preserved in this legacy Case. Cargo Calculation retains the canonical proxy row(s) used by the app.";
    sheet.getCell(row, 1).fill = fill(COLORS.warning);
    sheet.getCell(row, 1).alignment = { wrapText: true };
  } else {
    const start = row + 1;
    items.forEach((item, index) => {
      const targetRow = start + index;
      sheet.getCell(targetRow, 1).value = item.itemCode ?? "";
      sheet.getCell(targetRow, 2).value = item.description;
      sheet.getCell(targetRow, 3).value = item.quantity ?? "";
      sheet.getCell(targetRow, 4).value = item.unitPrice ?? "";
      sheet.getCell(targetRow, 5).value = item.lineTotal ?? "";
      sheet.getCell(targetRow, 6).value = `${item.sourceRef} · ${item.workingBaselineIncluded ? "included" : "evidence only"}`;
      sheet.getCell(targetRow, 3).fill = fill(COLORS.input);
      sheet.getCell(targetRow, 4).fill = fill(COLORS.input);
      sheet.getCell(targetRow, 5).fill = fill(COLORS.input);
    });
    row = start + items.length - 1;
    styleDataRange(sheet, start, row, 1, 6);
    for (let itemRow = start; itemRow <= row; itemRow += 1) {
      sheet.getCell(itemRow, 4).numFmt = moneyFormat;
      sheet.getCell(itemRow, 5).numFmt = moneyFormat;
    }
  }
  sheet.columns = [{ width: 22 }, { width: 37 }, { width: 18 }, { width: 17 }, { width: 18 }, { width: 68 }];
  sheet.autoFilter = { from: "A4", to: `F${rows.length + 4}` };
  configurePrint(sheet, "landscape", `A1:F${row}`, "1:4");
  return { sheet, refs };
}

function addCargoSheet(workbook: import("exceljs").Workbook, model: LogisticsCalculationWorkbookModel, sourceRefs: ReturnType<typeof addSourceInputsSheet>["refs"]): CargoSheetRefs {
  const sheet = workbook.addWorksheet("Cargo Calculation", { properties: { tabColor: { argb: COLORS.green } } });
  styleTitle(sheet, "A1:M1", "CARGO & TRANSPORT CALCULATION", "Commercial quantity is preserved separately from planning units. Product specifications are not silently treated as shipment packing data.");
  const headers = ["Row ID", "Item code", "Source line / group", "Commercial qty", "Planning units", "Source metric status", "Unit packed volume m³", "Line packed volume m³", "Unit gross weight kg", "Line gross weight kg", "Estimation method", "Confidence", "Source / provenance"];
  headers.forEach((value, index) => { sheet.getCell(4, index + 1).value = value; });
  styleHeaderRow(sheet, 4, 1, 13);
  const rows = model.productionEstimate.cargo.calculationRows;
  const firstRow = 5;
  rows.forEach((item, index) => {
    const row = firstRow + index;
    sheet.getCell(row, 1).value = item.id;
    sheet.getCell(row, 2).value = item.itemCode ?? "";
    sheet.getCell(row, 3).value = item.description;
    sheet.getCell(row, 4).value = item.quantity;
    sheet.getCell(row, 5).value = item.planningQuantity;
    sheet.getCell(row, 6).value = item.sourceMetric;
    sheet.getCell(row, 7).value = item.unitVolumeM3;
    setFormula(sheet.getCell(row, 8), `E${row}*G${row}`, item.estimatedVolumeM3);
    sheet.getCell(row, 9).value = item.unitGrossWeightKg;
    setFormula(sheet.getCell(row, 10), `E${row}*I${row}`, item.estimatedGrossWeightKg);
    sheet.getCell(row, 11).value = item.estimationMethod;
    sheet.getCell(row, 12).value = item.confidence;
    sheet.getCell(row, 13).value = item.sourceRef;
    for (const column of [5, 7, 9]) sheet.getCell(row, column).fill = fill(COLORS.assumption);
    for (const column of [8, 10]) sheet.getCell(row, column).fill = fill(COLORS.formula);
  });
  const lastItemRow = firstRow + rows.length - 1;
  const totalRow = lastItemRow + 1;
  sheet.getCell(totalRow, 3).value = "CARGO TOTALS";
  setFormula(sheet.getCell(totalRow, 8), `SUM(H${firstRow}:H${lastItemRow})`, model.productionEstimate.cargo.packedVolumeM3.value);
  setFormula(sheet.getCell(totalRow, 10), `SUM(J${firstRow}:J${lastItemRow})`, model.productionEstimate.cargo.grossWeightKg.value);
  for (let column = 1; column <= 13; column += 1) {
    sheet.getCell(totalRow, column).fill = fill(COLORS.pale);
    sheet.getCell(totalRow, column).font = { name: "Aptos", bold: true, color: { argb: COLORS.ink } };
    sheet.getCell(totalRow, column).border = border();
  }
  styleDataRange(sheet, firstRow, lastItemRow, 1, 13);
  for (let row = firstRow; row <= totalRow; row += 1) {
    for (const column of [7, 8, 9, 10]) sheet.getCell(row, column).numFmt = decimalFormat;
  }

  const physicalHeader = totalRow + 3;
  styleSection(sheet, physicalHeader, "Physical model and transport requirement", 13);
  const physicalRows = [
    ["Estimated packed volume", `=H${totalRow}`, model.productionEstimate.cargo.packedVolumeM3.value, "m³", "SUM of item/group line formulas"],
    ["Estimated gross weight", `=J${totalRow}`, model.productionEstimate.cargo.grossWeightKg.value, "kg", "SUM of item/group line formulas"],
    ["Loadability factor", `=${quotedSheet("Source & Inputs")}!${sourceRefs.loadability}`, model.productionEstimate.cargo.loadabilityFactor.value, "%", "Editable benchmark assumption"],
    ["Planning volume", `=B${physicalHeader + 2}/B${physicalHeader + 4}`, model.productionEstimate.cargo.planningVolumeM3, "m³", "Packed volume ÷ loadability"],
    ["Usable volume per transport unit", `=${quotedSheet("Source & Inputs")}!${sourceRefs.usableVolume}`, model.productionEstimate.transport.unit.usableVolumeM3, "m³", model.productionEstimate.transport.unit.label],
    ["Payload per transport unit", `=${quotedSheet("Source & Inputs")}!${sourceRefs.payload}`, model.productionEstimate.transport.unit.payloadKg, "kg", model.productionEstimate.transport.unit.label],
    ["Volume-required unit count", `=MAX(1,ROUNDUP(B${physicalHeader + 5}/B${physicalHeader + 6},0))`, model.productionEstimate.transport.volumeRequiredCount, "units", "Rounded up"],
    ["Weight-required unit count", `=MAX(1,ROUNDUP(B${physicalHeader + 3}/B${physicalHeader + 7},0))`, model.productionEstimate.transport.weightRequiredCount, "units", "Rounded up"],
    ["Required transport units", `=MAX(B${physicalHeader + 8},B${physicalHeader + 9})`, model.productionEstimate.transport.requiredTruckCount, "units", "Greater of volume and weight requirements"],
    ["Displayed units", `=B${physicalHeader + 10}+1`, model.productionEstimate.transport.displayedTruckCount, "units", "Required units + one free capacity reference"],
  ];
  sheet.getCell(physicalHeader + 1, 1).value = "Metric";
  sheet.getCell(physicalHeader + 1, 2).value = "Calculated value";
  sheet.getCell(physicalHeader + 1, 3).value = "Unit";
  sheet.getCell(physicalHeader + 1, 4).value = "Logic / source";
  styleHeaderRow(sheet, physicalHeader + 1, 1, 4);
  physicalRows.forEach((values, index) => {
    const row = physicalHeader + 2 + index;
    sheet.getCell(row, 1).value = values[0] as string;
    setFormula(sheet.getCell(row, 2), String(values[1]).slice(1), values[2] as number);
    sheet.getCell(row, 3).value = values[3] as string;
    sheet.getCell(row, 4).value = values[4] as string;
    sheet.getCell(row, 2).fill = fill(COLORS.formula);
  });
  const packedRow = physicalHeader + 2;
  const weightRow = physicalHeader + 3;
  const loadabilityRow = physicalHeader + 4;
  const planningRow = physicalHeader + 5;
  const usableRow = physicalHeader + 6;
  const payloadRow = physicalHeader + 7;
  const volumeCountRow = physicalHeader + 8;
  const weightCountRow = physicalHeader + 9;
  const requiredRow = physicalHeader + 10;
  const displayedRow = physicalHeader + 11;
  const limitingRow = physicalHeader + 12;
  sheet.getCell(limitingRow, 1).value = "Limiting factor";
  const limitingFormula = `IF(AND(B${volumeCountRow}=B${weightCountRow},MIN(B${planningRow}/(B${usableRow}*B${requiredRow}),B${weightRow}/(B${payloadRow}*B${requiredRow}))>=0.85*MAX(B${planningRow}/(B${usableRow}*B${requiredRow}),B${weightRow}/(B${payloadRow}*B${requiredRow}))),"BOTH",IF(B${volumeCountRow}>=B${weightCountRow},"VOLUME / LOADABILITY","WEIGHT"))`;
  setFormula(sheet.getCell(limitingRow, 2), limitingFormula, model.productionEstimate.transport.limitingFactor);
  sheet.getCell(limitingRow, 3).value = "";
  sheet.getCell(limitingRow, 4).value = "Same materiality rule as the production engine";
  sheet.getCell(limitingRow, 2).fill = fill(COLORS.formula);
  styleDataRange(sheet, packedRow, limitingRow, 1, 4);
  for (const row of [packedRow, weightRow, planningRow, usableRow, payloadRow]) sheet.getCell(row, 2).numFmt = decimalFormat;
  sheet.getCell(loadabilityRow, 2).numFmt = "0.0%";
  for (const row of [volumeCountRow, weightCountRow, requiredRow, displayedRow]) sheet.getCell(row, 2).numFmt = integerFormat;

  sheet.columns = [{ width: 23 }, { width: 15 }, { width: 35 }, { width: 16 }, { width: 16 }, { width: 44 }, { width: 18 }, { width: 20 }, { width: 19 }, { width: 20 }, { width: 52 }, { width: 14 }, { width: 54 }];
  sheet.autoFilter = { from: "A4", to: `M${lastItemRow}` };
  configurePrint(sheet, "landscape", `A1:M${limitingRow}`, "1:4");
  sheet.pageSetup.fitToWidth = 2;
  return {
    packedVolume: { address: `B${packedRow}`, result: model.productionEstimate.cargo.packedVolumeM3.value },
    grossWeight: { address: `B${weightRow}`, result: model.productionEstimate.cargo.grossWeightKg.value },
    planningVolume: { address: `B${planningRow}`, result: model.productionEstimate.cargo.planningVolumeM3 },
    requiredUnits: { address: `B${requiredRow}`, result: model.productionEstimate.transport.requiredTruckCount },
    displayedUnits: { address: `B${displayedRow}`, result: model.productionEstimate.transport.displayedTruckCount },
    limitingFactor: { address: `B${limitingRow}`, result: model.productionEstimate.transport.limitingFactor },
  };
}

function derivationInput(line: CostLine, label: string, fallback = 0) {
  const input = line.calculation?.inputs.find((candidate) => candidate.label.toLowerCase().includes(label.toLowerCase()));
  const value = Number(input?.value);
  return Number.isFinite(value) ? value : fallback;
}

function agentEstimateFor(line: CostLine) {
  return line.agentEstimate?.calculation?.resultValue ?? line.agentEstimate?.amount ?? line.calculation?.resultValue ?? line.amount;
}

function effectiveAmount(model: LogisticsCalculationWorkbookModel, line: CostLine) {
  if (line.component === "insurance") return model.result.insurance;
  const treatment = model.result.treatments.find((candidate) => candidate.lineId === line.id || candidate.component === line.component && candidate.label === line.label);
  if (treatment?.treatment === "added") return treatment.amount;
  if (treatment?.treatment === "removed") return -treatment.amount;
  return 0;
}

function addCostSheet(workbook: import("exceljs").Workbook, model: LogisticsCalculationWorkbookModel, sourceRefs: ReturnType<typeof addSourceInputsSheet>["refs"], cargoRefs: CargoSheetRefs): CostSheetRefs {
  const sheet = workbook.addWorksheet("Cost Calculation", { properties: { tabColor: { argb: COLORS.lime } } });
  styleTitle(sheet, "A1:O1", "LOGISTICS COST CALCULATION", "Agent estimate, user override and effective value remain separate. Green cells calculate from the canonical inputs.");
  const headers = ["Component", "Logistics component", "Responsibility", "Basis quantity", "Rate / factor", "Agent estimate", "User override", "Effective value", "Currency", "Executable logic", "Benchmark / vintage", "Source / provenance", "Confidence", "Assumptions / note", "Check vs app"];
  headers.forEach((value, index) => { sheet.getCell(4, index + 1).value = value; });
  styleHeaderRow(sheet, 4, 1, 15);
  const firstRow = 5;
  const componentRows: CostSheetRefs["componentRows"] = [];
  let insuranceRow = -1;
  let contingencyRow = -1;
  const nonInsuranceRows: number[] = [];
  model.effectiveCostLines.forEach((line, index) => {
    const row = firstRow + index;
    const treatment = model.result.treatments.find((candidate) => candidate.lineId === line.id || candidate.component === line.component && candidate.label === line.label)?.treatment ?? (line.component === "insurance" ? "added" : "excluded");
    const agentEstimate = agentEstimateFor(line);
    const effective = effectiveAmount(model, line);
    sheet.getCell(row, 1).value = line.component;
    sheet.getCell(row, 2).value = line.label;
    sheet.getCell(row, 3).value = treatment;

    let quantity = 1;
    let rate = agentEstimate;
    let formula = `D${row}*E${row}`;
    if (line.component === "origin_loading") {
      quantity = derivationInput(line, "Origin handling benchmark", agentEstimate / 0.34);
      rate = derivationInput(line, "Loading allocation", 34) / 100;
    } else if (line.component === "origin_pickup") {
      quantity = derivationInput(line, "Origin handling benchmark", agentEstimate / 0.5);
      rate = derivationInput(line, "Pickup allocation", 50) / 100;
    } else if (line.component === "origin_terminal") {
      quantity = derivationInput(line, "Origin handling benchmark", agentEstimate);
      rate = 0.16;
    } else if (line.component === "main_freight") {
      quantity = cargoRefs.requiredUnits.result;
      rate = derivationInput(line, "Freight rate per unit", quantity ? agentEstimate / quantity : agentEstimate);
      formula = `${quotedSheet("Cargo Calculation")}!${cargoRefs.requiredUnits.address}*E${row}`;
    } else if (line.component === "contingency") {
      contingencyRow = row;
      rate = derivationInput(line, "Contingency rate", 0) / 100 || (agentEstimate / Math.max(model.productionEstimate.nonInsuranceCost - agentEstimate, 1));
      quantity = agentEstimate / Math.max(rate, Number.EPSILON);
      formula = "__CONTINGENCY__";
    } else if (line.component === "insurance") {
      insuranceRow = row;
      quantity = derivationInput(line, "Premium rate", model.productionEstimate.insuranceRate * 100) / 100;
      rate = derivationInput(line, "Insured-value factor", model.productionEstimate.insuranceCoverageFactor * 100) / 100;
      formula = "__INSURANCE__";
    }
    sheet.getCell(row, 4).value = quantity;
    sheet.getCell(row, 5).value = rate;
    if (formula !== "__CONTINGENCY__" && formula !== "__INSURANCE__") setFormula(sheet.getCell(row, 6), formula, agentEstimate);
    sheet.getCell(row, 7).value = line.userOverride?.amount ?? null;
    const effectiveFormula = line.component === "insurance" ? "__INSURANCE_EFFECTIVE__" : `IF(C${row}="added",IF(ISNUMBER(G${row}),G${row},F${row}),IF(C${row}="removed",-IF(ISNUMBER(G${row}),G${row},F${row}),0))`;
    if (effectiveFormula !== "__INSURANCE_EFFECTIVE__") setFormula(sheet.getCell(row, 8), effectiveFormula, effective);
    sheet.getCell(row, 9).value = line.currency;
    sheet.getCell(row, 10).value = line.calculation?.formula ?? line.note ?? "Input / allowance";
    sheet.getCell(row, 11).value = `${line.calculation?.benchmark?.id ?? ""}${line.calculation?.benchmark?.asOf || line.rateDate ? ` · ${line.calculation?.benchmark?.asOf ?? line.rateDate}` : ""}`;
    sheet.getCell(row, 12).value = line.sourceRef ?? line.calculation?.benchmark?.sourceRef ?? "";
    sheet.getCell(row, 13).value = line.calculation?.confidence ?? line.confidence;
    sheet.getCell(row, 14).value = [...(line.calculation?.assumptions ?? []), line.note ?? ""].filter(Boolean).join(" · ");
    setFormula(sheet.getCell(row, 15), `IF(ABS(H${row}-${effective.toFixed(12)})<0.01,"OK","REVIEW")`, "OK");
    sheet.getCell(row, 4).fill = fill(COLORS.assumption);
    sheet.getCell(row, 5).fill = fill(COLORS.assumption);
    sheet.getCell(row, 6).fill = fill(COLORS.formula);
    sheet.getCell(row, 7).fill = fill(COLORS.input);
    sheet.getCell(row, 8).fill = fill(COLORS.formula);
    if (line.component !== "insurance" && line.component !== "contingency") nonInsuranceRows.push(row);
    componentRows.push({ line, row, effective });
  });

  if (contingencyRow > 0) {
    const sumRows = nonInsuranceRows.map((row) => `F${row}`).join(",");
    const effectiveRows = nonInsuranceRows.map((row) => `H${row}`).join(",");
    setFormula(sheet.getCell(contingencyRow, 6), `SUM(${sumRows})*E${contingencyRow}`, agentEstimateFor(model.effectiveCostLines.find((line) => line.component === "contingency")!));
    const effective = componentRows.find((entry) => entry.row === contingencyRow)!.effective;
    setFormula(sheet.getCell(contingencyRow, 8), `IF(C${contingencyRow}="added",IF(ISNUMBER(G${contingencyRow}),G${contingencyRow},SUM(${effectiveRows})*E${contingencyRow}),0)`, effective);
  }
  if (insuranceRow > 0) {
    const preInsuranceRows = componentRows.filter((entry) => entry.row !== insuranceRow).map((entry) => `F${entry.row}`).join(",");
    const effectivePreInsuranceRows = componentRows.filter((entry) => entry.row !== insuranceRow).map((entry) => `H${entry.row}`).join(",");
    const insuranceFormula = `ROUND((${quotedSheet("Source & Inputs")}!${sourceRefs.sourceValue}+SUM(${preInsuranceRows}))*D${insuranceRow}*E${insuranceRow}/(1-D${insuranceRow}*E${insuranceRow}),2)`;
    setFormula(sheet.getCell(insuranceRow, 6), insuranceFormula, model.productionEstimate.estimatedInsurance);
    const effectiveFormula = `IF(C${insuranceRow}="added",IF(ISNUMBER(G${insuranceRow}),G${insuranceRow},ROUND((${quotedSheet("Source & Inputs")}!${sourceRefs.sourceValue}+SUM(${effectivePreInsuranceRows}))*D${insuranceRow}*E${insuranceRow}/(1-D${insuranceRow}*E${insuranceRow}),2)),0)`;
    setFormula(sheet.getCell(insuranceRow, 8), effectiveFormula, model.result.insurance);
  }

  const lastComponentRow = firstRow + model.effectiveCostLines.length - 1;
  styleDataRange(sheet, firstRow, lastComponentRow, 1, 15);
  for (let row = firstRow; row <= lastComponentRow; row += 1) {
    const component = String(sheet.getCell(row, 1).value);
    sheet.getCell(row, 4).numFmt = component === "insurance" ? "0.00%" : ["origin_loading", "origin_pickup", "origin_terminal", "contingency"].includes(component) ? moneyFormat : "0.000";
    sheet.getCell(row, 5).numFmt = ["origin_loading", "origin_pickup", "origin_terminal", "contingency", "insurance"].includes(component) ? "0.00%" : moneyFormat;
    for (const column of [6, 7, 8]) sheet.getCell(row, column).numFmt = moneyFormat;
  }

  const totalRow = lastComponentRow + 2;
  sheet.getCell(totalRow, 2).value = "ESTIMATED LOGISTICS COST";
  setFormula(sheet.getCell(totalRow, 8), `SUM(H${firstRow}:H${lastComponentRow})`, model.result.incrementalCost);
  sheet.getCell(totalRow, 9).value = model.result.currency;
  const targetRow = totalRow + 1;
  sheet.getCell(targetRow, 2).value = "ESTIMATED TARGET COMMERCIAL VALUE";
  setFormula(sheet.getCell(targetRow, 8), `${quotedSheet("Source & Inputs")}!${sourceRefs.sourceValue}+H${totalRow}`, model.result.revisedContractTotal);
  sheet.getCell(targetRow, 9).value = model.result.currency;
  const upliftRow = targetRow + 1;
  sheet.getCell(upliftRow, 2).value = "LOGISTICS UPLIFT";
  setFormula(sheet.getCell(upliftRow, 8), `IF(${quotedSheet("Source & Inputs")}!${sourceRefs.sourceValue}=0,0,H${totalRow}/${quotedSheet("Source & Inputs")}!${sourceRefs.sourceValue})`, model.result.logisticsUpliftPercent / 100);
  for (const row of [totalRow, targetRow, upliftRow]) {
    for (let column = 1; column <= 15; column += 1) {
      sheet.getCell(row, column).fill = fill(row === totalRow ? COLORS.ink : COLORS.pale);
      sheet.getCell(row, column).font = { name: "Aptos", bold: true, color: { argb: row === totalRow ? COLORS.white : COLORS.ink } };
      sheet.getCell(row, column).border = border();
    }
  }
  sheet.getCell(totalRow, 8).numFmt = moneyFormat;
  sheet.getCell(targetRow, 8).numFmt = moneyFormat;
  sheet.getCell(upliftRow, 8).numFmt = percentFormat;
  sheet.columns = [{ width: 21 }, { width: 29 }, { width: 17 }, { width: 16 }, { width: 15 }, { width: 17 }, { width: 17 }, { width: 18 }, { width: 11 }, { width: 49 }, { width: 31 }, { width: 53 }, { width: 14 }, { width: 55 }, { width: 13 }];
  sheet.autoFilter = { from: "A4", to: `O${lastComponentRow}` };
  configurePrint(sheet, "landscape", `A1:O${upliftRow}`, "1:4");
  sheet.pageSetup.fitToWidth = 2;
  return {
    total: { address: `H${totalRow}`, result: model.result.incrementalCost },
    insurance: { address: insuranceRow > 0 ? `H${insuranceRow}` : "H1", result: model.result.insurance },
    targetTotal: { address: `H${targetRow}`, result: model.result.revisedContractTotal },
    uplift: { address: `H${upliftRow}`, result: model.result.logisticsUpliftPercent / 100 },
    componentRows,
  };
}

function addExecutiveSummary(workbook: import("exceljs").Workbook, model: LogisticsCalculationWorkbookModel, cargoRefs: CargoSheetRefs, costRefs: CostSheetRefs, sourceRefs: ReturnType<typeof addSourceInputsSheet>["refs"]) {
  const sheet = workbook.addWorksheet("Executive Summary", { properties: { tabColor: { argb: COLORS.ink } } });
  styleTitle(sheet, "A1:H1", "TENDER LOGISTICS COST", "Formula-driven Case calculation · preliminary benchmark estimate, not a carrier quotation");
  sheet.mergeCells("A4:H4");
  sheet.getCell("A4").value = model.caseName;
  sheet.getCell("A4").font = { name: "Aptos Display", size: 16, bold: true, color: { argb: COLORS.ink } };
  sheet.getCell("A4").alignment = { wrapText: true, vertical: "middle" };
  sheet.getRow(4).height = 30;
  sheet.mergeCells("A5:H5");
  sheet.getCell("A5").value = `${model.input.sourceTerm} ${model.input.sourceNamedPlace} → ${model.input.targetTerm ?? model.input.logisticsScopeIncoterm ?? ""} ${model.input.targetNamedPlace ?? model.destination} · ${model.transportMode}`;
  sheet.getCell("A5").font = { name: "Aptos", size: 11, color: { argb: COLORS.green }, bold: true };

  sheet.mergeCells("A7:H7");
  sheet.getCell("A7").value = "ESTIMATED LOGISTICS COST";
  sheet.getCell("A7").fill = fill(COLORS.ink);
  sheet.getCell("A7").font = { name: "Aptos", bold: true, color: { argb: COLORS.lime } };
  sheet.mergeCells("A8:H10");
  const roundedHeroCost = Math.round(costRefs.total.result / 1_000) * 1_000;
  setFormula(sheet.getCell("A8"), `ROUND(${quotedSheet("Cost Calculation")}!${costRefs.total.address},-3)`, roundedHeroCost);
  sheet.getCell("A8").fill = fill(COLORS.ink);
  sheet.getCell("A8").font = { name: "Aptos Display", size: 32, bold: true, color: { argb: COLORS.white } };
  sheet.getCell("A8").alignment = { vertical: "middle", horizontal: "center" };
  sheet.getCell("A8").numFmt = '"≈ USD" #,##0';
  sheet.getRow(14).height = 25;
  sheet.getRow(15).height = 25;

  styleSection(sheet, 12, "Shipment estimate", 8);
  const kpis = [
    ["Estimated packed volume", `${quotedSheet("Cargo Calculation")}!${cargoRefs.packedVolume.address}`, cargoRefs.packedVolume.result, '"≈" #,##0 "m³"'],
    ["Estimated gross weight", `${quotedSheet("Cargo Calculation")}!${cargoRefs.grossWeight.address}`, cargoRefs.grossWeight.result, '"≈" #,##0 "kg"'],
    ["Transport requirement", `${quotedSheet("Cargo Calculation")}!${cargoRefs.requiredUnits.address}`, cargoRefs.requiredUnits.result, `0 "× ${model.productionEstimate.transport.unit.label.replaceAll('"', "'")}"`],
    ["Estimated transit", `${quotedSheet("Source & Inputs")}!${sourceRefs.transitMin}`, model.productionEstimate.transport.transitDays[0], `0 "–${model.productionEstimate.transport.transitDays[1]} days"`],
  ];
  kpis.forEach((values, index) => {
    const startColumn = index * 2 + 1;
    sheet.mergeCells(13, startColumn, 13, startColumn + 1);
    sheet.mergeCells(14, startColumn, 15, startColumn + 1);
    const label = sheet.getCell(13, startColumn);
    label.value = values[0] as string;
    label.fill = fill(COLORS.paleBlue);
    label.font = { name: "Aptos", size: 9, bold: true, color: { argb: COLORS.muted } };
    const value = sheet.getCell(14, startColumn);
    setFormula(value, String(values[1]), values[2] as number);
    value.fill = fill(COLORS.paleBlue);
    value.font = { name: "Aptos Display", size: 17, bold: true, color: { argb: COLORS.ink } };
    value.numFmt = values[3] as string;
    value.alignment = { vertical: "middle", horizontal: "center", wrapText: true };
  });

  styleSection(sheet, 17, "Logistics cost breakdown", 8);
  sheet.getCell("A18").value = "Component";
  sheet.getCell("D18").value = "Estimated cost";
  sheet.mergeCells("A18:C18");
  sheet.mergeCells("D18:E18");
  sheet.getCell("F18").value = "Component";
  sheet.getCell("H18").value = "Estimated cost";
  sheet.mergeCells("F18:G18");
  styleHeaderRow(sheet, 18, 1, 8);
  const visible = costRefs.componentRows.filter((entry) => Math.abs(entry.effective) > 0.005);
  visible.forEach((entry, index) => {
    const left = index % 2 === 0;
    const row = 19 + Math.floor(index / 2);
    const labelStart = left ? 1 : 6;
    const labelEnd = left ? 3 : 7;
    const valueColumn = left ? 4 : 8;
    if (left) sheet.mergeCells(row, labelStart, row, labelEnd);
    else sheet.mergeCells(row, labelStart, row, labelEnd);
    sheet.getCell(row, labelStart).value = entry.line.component === "insurance" ? "Insurance" : entry.line.label;
    setFormula(sheet.getCell(row, valueColumn), `${quotedSheet("Cost Calculation")}!H${entry.row}`, entry.effective);
    sheet.getCell(row, valueColumn).numFmt = '"≈ USD" #,##0';
    for (let column = labelStart; column <= valueColumn; column += 1) sheet.getCell(row, column).border = border();
  });
  const breakdownEnd = 18 + Math.max(1, Math.ceil(visible.length / 2));

  const commercialHeader = breakdownEnd + 2;
  styleSection(sheet, commercialHeader, "Commercial summary", 8);
  const summaryRows = [
    ["Goods / source value", `${quotedSheet("Source & Inputs")}!${sourceRefs.sourceValue}`, model.result.sourceContractTotal],
    ["Estimated logistics cost", `ROUND(${quotedSheet("Cost Calculation")}!${costRefs.total.address},-3)`, Math.round(model.result.incrementalCost / 1_000) * 1_000],
    ["Estimated target / CIP value", `ROUND(${quotedSheet("Cost Calculation")}!${costRefs.targetTotal.address},-3)`, Math.round(model.result.revisedContractTotal / 1_000) * 1_000],
    ["Estimated logistics uplift", `${quotedSheet("Cost Calculation")}!${costRefs.uplift.address}`, model.result.logisticsUpliftPercent / 100],
  ];
  summaryRows.forEach((values, index) => {
    const row = commercialHeader + 1 + index;
    sheet.mergeCells(row, 1, row, 4);
    sheet.mergeCells(row, 5, row, 8);
    sheet.getCell(row, 1).value = values[0] as string;
    setFormula(sheet.getCell(row, 5), String(values[1]), values[2] as number);
    sheet.getCell(row, 5).numFmt = index === 3 ? percentFormat : index === 0 ? moneyFormat : '"≈ USD" #,##0';
    for (let column = 1; column <= 8; column += 1) {
      sheet.getCell(row, column).border = border();
      sheet.getCell(row, column).fill = fill(index === 2 ? COLORS.pale : COLORS.white);
      sheet.getCell(row, column).font = { name: "Aptos", bold: index >= 1, color: { argb: COLORS.ink } };
    }
  });

  const confidenceHeader = commercialHeader + 6;
  styleSection(sheet, confidenceHeader, "Confidence, main uncertainty and key warnings", 8);
  sheet.mergeCells(confidenceHeader + 1, 1, confidenceHeader + 1, 4);
  sheet.getCell(confidenceHeader + 1, 1).value = `Confidence: ${model.productionEstimate.confidence.score}% · ${model.productionEstimate.confidence.label}`;
  sheet.getCell(confidenceHeader + 1, 1).font = { name: "Aptos", bold: true, color: { argb: COLORS.green } };
  sheet.mergeCells(confidenceHeader + 1, 5, confidenceHeader + 1, 8);
  sheet.getCell(confidenceHeader + 1, 5).value = `Main uncertainty: ${model.productionEstimate.confidence.mainUncertainty}`;
  sheet.getCell(confidenceHeader + 1, 5).font = { name: "Aptos", bold: true, color: { argb: COLORS.ink } };
  const warnings = model.warnings.slice(0, 5);
  warnings.forEach((warning, index) => {
    const row = confidenceHeader + 2 + index;
    sheet.mergeCells(row, 1, row, 8);
    sheet.getCell(row, 1).value = `△ ${warning}`;
    sheet.getCell(row, 1).fill = fill(COLORS.warning);
    sheet.getCell(row, 1).alignment = { wrapText: true, vertical: "middle" };
  });
  const lastRow = confidenceHeader + 1 + Math.max(1, warnings.length);
  sheet.columns = Array.from({ length: 8 }, () => ({ width: 15 }));
  configurePrint(sheet, "portrait", `A1:H${lastRow}`, undefined);
  sheet.pageSetup.fitToHeight = 1;
  return sheet;
}

function addAuditSheet(workbook: import("exceljs").Workbook, model: LogisticsCalculationWorkbookModel, cargoRefs: CargoSheetRefs, costRefs: CostSheetRefs) {
  const sheet = workbook.addWorksheet("Audit & Checks", { properties: { tabColor: { argb: COLORS.warning } } });
  styleTitle(sheet, "A1:F1", "AUDIT, ASSUMPTIONS & VALIDATION CHECKS", "Formula checks compare the Excel calculation with the same canonical saved Case result used by the app.");
  styleSection(sheet, 4, "Automated reconciliation checks", 6);
  ["Check", "Excel formula result", "Canonical app result", "Variance", "Status", "Tolerance / rule"].forEach((value, index) => { sheet.getCell(5, index + 1).value = value; });
  styleHeaderRow(sheet, 5, 1, 6);
  const checks = [
    ["Packed volume reconciles", `${quotedSheet("Cargo Calculation")}!${cargoRefs.packedVolume.address}`, cargoRefs.packedVolume.result, 0.000001],
    ["Gross weight reconciles", `${quotedSheet("Cargo Calculation")}!${cargoRefs.grossWeight.address}`, cargoRefs.grossWeight.result, 0.000001],
    ["Planning volume reconciles", `${quotedSheet("Cargo Calculation")}!${cargoRefs.planningVolume.address}`, cargoRefs.planningVolume.result, 0.000001],
    ["Required units reconcile", `${quotedSheet("Cargo Calculation")}!${cargoRefs.requiredUnits.address}`, cargoRefs.requiredUnits.result, 0],
    ["Logistics cost reconciles", `${quotedSheet("Cost Calculation")}!${costRefs.total.address}`, costRefs.total.result, 0.01],
    ["Insurance reconciles", `${quotedSheet("Cost Calculation")}!${costRefs.insurance.address}`, costRefs.insurance.result, 0.01],
    ["Target commercial value reconciles", `${quotedSheet("Cost Calculation")}!${costRefs.targetTotal.address}`, costRefs.targetTotal.result, 0.01],
  ];
  checks.forEach((values, index) => {
    const row = 6 + index;
    sheet.getCell(row, 1).value = values[0] as string;
    setFormula(sheet.getCell(row, 2), String(values[1]), values[2] as number);
    sheet.getCell(row, 3).value = values[2] as number;
    setFormula(sheet.getCell(row, 4), `B${row}-C${row}`, 0);
    setFormula(sheet.getCell(row, 5), `IF(ABS(D${row})<=${values[3]},"PASS","FAIL")`, "PASS");
    sheet.getCell(row, 6).value = values[3] === 0 ? "Exact match" : `±${values[3]}`;
    sheet.getCell(row, 5).fill = fill(COLORS.formula);
    sheet.getCell(row, 5).font = { name: "Aptos", bold: true, color: { argb: COLORS.green } };
  });
  styleDataRange(sheet, 6, 5 + checks.length, 1, 6);

  let row = 7 + checks.length;
  styleSection(sheet, row, "Assumptions and warnings", 6);
  row += 1;
  ["Type", "Statement", "Source / basis", "Confidence", "Case / benchmark date", "Status"].forEach((value, index) => { sheet.getCell(row, index + 1).value = value; });
  styleHeaderRow(sheet, row, 1, 6);
  const auditRows = [
    ...model.productionEstimate.assumptions.map((value) => ["Assumption", value, model.productionEstimate.benchmark.sourceRef, "low", model.productionEstimate.benchmark.asOf, "active"]),
    ...model.warnings.map((value) => ["Warning / exclusion", value, "Canonical saved Case", "provisional", model.savedAt ?? "", "open"]),
    ...model.sourceDocuments.flatMap((document) => [
      ["Source document", document.fileName, `${document.extractionMethod ?? "unknown"} · ${document.status}`, "", model.savedAt ?? "", document.status],
      ...document.facts.map((fact) => ["Document fact", fact, document.fileName, "", model.savedAt ?? "", "preserved"]),
      ...document.warnings.map((warning) => ["Document warning", warning.message, `${document.fileName} · ${warning.code}`, "", model.savedAt ?? "", warning.severity]),
    ]),
  ];
  const startAudit = row + 1;
  auditRows.forEach((values, index) => values.forEach((value, column) => { sheet.getCell(startAudit + index, column + 1).value = value; }));
  if (auditRows.length) styleDataRange(sheet, startAudit, startAudit + auditRows.length - 1, 1, 6);
  const lastRow = Math.max(startAudit, startAudit + auditRows.length - 1);
  sheet.columns = [{ width: 23 }, { width: 86 }, { width: 64 }, { width: 15 }, { width: 21 }, { width: 17 }];
  configurePrint(sheet, "landscape", `A1:F${lastRow}`, "1:5");
  return sheet;
}

export function logisticsCalculationExcelFileName(model: LogisticsCalculationWorkbookModel) {
  const safe = model.caseName.trim().replace(/[\\/:*?"<>|]+/g, "-").replace(/\s+/g, "-").slice(0, 80) || "tender-logistics-cost";
  return `${safe}-calculation.xlsx`;
}

export async function logisticsCalculationToExcel(model: LogisticsCalculationWorkbookModel): Promise<Uint8Array> {
  const { default: ExcelJS } = await import("exceljs");
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "TenderApps · Tender Logistics Cost";
  workbook.lastModifiedBy = "TenderApps · Tender Logistics Cost";
  workbook.created = new Date(model.savedAt ?? Date.now());
  workbook.modified = new Date();
  workbook.title = `${model.caseName} · Tender Logistics Cost calculation`;
  workbook.subject = "Formula-driven, audit-ready logistics costing workbook";
  workbook.description = "Generated from the same canonical saved Case model used by the Results Dashboard.";
  workbook.calcProperties.fullCalcOnLoad = true;
  workbook.calcProperties.forceFullCalc = true;

  const source = addSourceInputsSheet(workbook, model);
  const cargo = addCargoSheet(workbook, model, source.refs);
  const cost = addCostSheet(workbook, model, source.refs, cargo);
  addExecutiveSummary(workbook, model, cargo, cost, source.refs);
  addAuditSheet(workbook, model, cargo, cost);

  const order = ["Executive Summary", "Cost Calculation", "Cargo Calculation", "Source & Inputs", "Audit & Checks"];
  workbook.worksheets.forEach((sheet) => { sheet.orderNo = order.indexOf(sheet.name); });
  const buffer = await workbook.xlsx.writeBuffer();
  return new Uint8Array(buffer);
}

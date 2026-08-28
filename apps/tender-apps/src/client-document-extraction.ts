import pdfWorkerUrl from "pdfjs-dist/build/pdf.worker.min.mjs?url";
import {
  extractSpreadsheetCommercialSummary,
  parseStructuredDocument,
  type CalculationWarning,
  type DocumentIntakeRecord,
} from "../../../packages/logistics-costing/src";
import { extractSemanticBusinessFacts, type SemanticTextSection } from "./document-semantic-extraction";

export type DocumentProcessingStage = "idle" | "uploading" | "reading" | "extracting" | "mapping" | "complete" | "failed";

const untrustedInstructionPatterns = [
  /ignore\s+(all\s+)?previous\s+instructions?/i,
  /system\s+message/i,
  /developer\s+message/i,
  /reveal\s+(the\s+)?prompt/i,
  /execute\s+(this\s+)?command/i,
  /do\s+not\s+follow\s+the\s+user/i,
];

function normalizedKey(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "");
}

function findUntrustedInstructions(sections: SemanticTextSection[]) {
  return sections.flatMap((section) => section.text.split(/\r?\n/).filter((line) => untrustedInstructionPatterns.some((pattern) => pattern.test(line))).map((line) => `${section.label}: ${line.slice(0, 180)}`));
}

function pdfItemsToLines(items: unknown[]) {
  const lineMap = new Map<number, Array<{ x: number; text: string }>>();
  for (const candidate of items) {
    if (!candidate || typeof candidate !== "object" || !("str" in candidate) || !("transform" in candidate)) continue;
    const item = candidate as { str: string; transform: number[] };
    if (!item.str.trim()) continue;
    const y = Math.round((item.transform[5] ?? 0) / 3) * 3;
    const line = lineMap.get(y) ?? [];
    line.push({ x: item.transform[4] ?? 0, text: item.str });
    lineMap.set(y, line);
  }
  return [...lineMap.entries()].sort(([left], [right]) => right - left).map(([, line]) => line.sort((left, right) => left.x - right.x).map((item) => item.text).join(" ")).join("\n");
}

async function parsePdf(file: File): Promise<DocumentIntakeRecord> {
  const pdfjs = await import("pdfjs-dist");
  pdfjs.GlobalWorkerOptions.workerSrc = pdfWorkerUrl;
  const data = new Uint8Array(await file.arrayBuffer());
  const pdf = await pdfjs.getDocument({ data }).promise;
  const sections: SemanticTextSection[] = [];
  for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
    const page = await pdf.getPage(pageNumber);
    const content = await page.getTextContent();
    sections.push({ label: `${file.name} · page ${pageNumber}`, pageNumber, text: pdfItemsToLines(content.items) });
  }
  const extractedTextLength = sections.reduce((total, section) => total + section.text.trim().length, 0);
  if (extractedTextLength < 40) return {
    id: `document:${file.name}:${file.size}`,
    fileName: file.name,
    format: "pdf",
    status: "staged-for-review",
    rows: [],
    facts: [],
    ignoredInstructions: [],
    extractionMethod: "manual-review",
    extractedTextLength,
    warnings: [{ code: "IMAGE_BASED_PDF", severity: "warning", message: `${file.name} appears image-based or contains no usable text. Upload a text-searchable PDF, provide an XLSX/CSV export, or complete the missing fields manually.` }],
  };
  const extracted = extractSemanticBusinessFacts(sections);
  const recognizedCount = Object.keys(extracted.row).length;
  const warnings: CalculationWarning[] = [...extracted.warnings, ...(recognizedCount ? [] : [{ code: "NO_RECOGNIZED_FIELDS", severity: "warning" as const, message: `${file.name} was read successfully, but no document-level commercial or shipment values matched the current schema. Review the document and enter the missing fields manually.` }])];
  const ignoredInstructions = findUntrustedInstructions(sections);
  if (ignoredInstructions.length) warnings.push({ code: "UNTRUSTED_DOCUMENT_INSTRUCTION", severity: "warning", message: `${ignoredInstructions.length} instruction-like value(s) were quarantined as document content and were not executed.` });
  const commercialItems = Array.isArray(extracted.row.commercial_items)
    ? extracted.row.commercial_items.flatMap((candidate, index) => candidate && typeof candidate === "object"
      ? [{
        id: String((candidate as { id?: unknown }).id ?? `document-line-${index + 1}`),
        description: String((candidate as { rawLine?: unknown }).rawLine ?? "Commercial line"),
        lineTotal: Number((candidate as { lineTotal?: unknown }).lineTotal) || undefined,
        sourceRef: String((candidate as { sourceRef?: unknown }).sourceRef ?? file.name),
        workingBaselineIncluded: Boolean((candidate as { workingBaselineIncluded?: unknown }).workingBaselineIncluded),
      }]
      : [])
    : [];
  return {
    id: `document:${file.name}:${file.size}`,
    fileName: file.name,
    format: "pdf",
    status: "parsed",
    rows: recognizedCount ? [extracted.row] : [],
    facts: Object.entries(extracted.row).map(([key, value]) => `[${extracted.fieldEvidence[key]?.scope ?? "document"}] ${key} = ${String(value)}`),
    ignoredInstructions,
    warnings,
    fieldSources: Object.fromEntries(Object.entries(extracted.fieldSources).map(([key, source]) => [normalizedKey(key), source])),
    fieldEvidence: Object.fromEntries(Object.entries(extracted.fieldEvidence).map(([key, evidence]) => [normalizedKey(key), evidence])),
    documentProfile: extracted.profile,
    extractionMethod: "pdf-text",
    extractedTextLength,
    commercialItems,
  };
}

async function parseSpreadsheet(file: File): Promise<DocumentIntakeRecord> {
  const XLSX = await import("xlsx");
  const workbook = XLSX.read(await file.arrayBuffer(), { type: "array", cellDates: true });
  const rows: Record<string, unknown>[] = [];
  const summaryRow: Record<string, unknown> = {};
  const fieldSources: Record<string, string> = {};
  const spreadsheetFieldEvidence: NonNullable<DocumentIntakeRecord["fieldEvidence"]> = {};
  const spreadsheetWarnings: CalculationWarning[] = [];
  const commercialItems: NonNullable<DocumentIntakeRecord["commercialItems"]> = [];
  let spreadsheetLineItemCount = 0;
  let spreadsheetCalculatedTotal: number | undefined;
  let spreadsheetPrintedTotal: number | undefined;
  const sections: SemanticTextSection[] = [];
  for (const sheetName of workbook.SheetNames) {
    const sheet = workbook.Sheets[sheetName];
    if (!sheet) continue;
    const arrayRows = XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1, raw: false, defval: "" });
    const commercialSummary = extractSpreadsheetCommercialSummary(arrayRows, file.name, sheetName);
    Object.entries(commercialSummary.row).forEach(([key, value]) => {
      summaryRow[key] = value;
      const sourceRef = commercialSummary.fieldSources[key] ?? `${file.name} · ${sheetName}`;
      fieldSources[key] = sourceRef;
      spreadsheetFieldEvidence[key] = { sourceRef, confidence: "high", scope: "document", basis: key === "contract_value" ? "Independently summed from priced quotation rows and reconciled against any labelled total." : "Read from the quotation table or labelled commercial-total row." };
    });
    spreadsheetWarnings.push(...commercialSummary.warnings);
    commercialItems.push(...commercialSummary.commercialItems);
    spreadsheetLineItemCount = Math.max(spreadsheetLineItemCount, commercialSummary.lineItemCount ?? 0);
    if (commercialSummary.calculatedLineItemTotal !== undefined) spreadsheetCalculatedTotal = commercialSummary.calculatedLineItemTotal;
    if (commercialSummary.printedCommercialTotal !== undefined) spreadsheetPrintedTotal = commercialSummary.printedCommercialTotal;
    const textLines: string[] = [];
    arrayRows.forEach((cells, index) => {
      const values = cells.map((cell) => String(cell).trim()).filter(Boolean);
      if (values.length) textLines.push(values.join(" | "));
      if (values.length >= 2) {
        const key = normalizedKey(values[0]);
        if (key && !(key in summaryRow)) {
          summaryRow[key] = values[1];
          fieldSources[key] = `${file.name} · ${sheetName} · row ${index + 1}`;
        }
      }
    });
    sections.push({ label: `${file.name} · sheet ${sheetName}`, text: textLines.join("\n") });
    const tableRows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { raw: false, defval: "" });
    tableRows.forEach((row, index) => rows.push({ ...row, __sourceRef: `${file.name} · ${sheetName} · row ${index + 2}` }));
  }
  const textExtraction = extractSemanticBusinessFacts(sections);
  const ignoredInstructions = findUntrustedInstructions(sections);
  Object.entries(textExtraction.row).forEach(([key, value]) => {
    if (!(key in summaryRow)) summaryRow[key] = value;
  });
  Object.entries(textExtraction.fieldSources).forEach(([key, value]) => {
    if (!fieldSources[key]) fieldSources[key] = value;
  });
  if (commercialItems.length) summaryRow.commercial_items = commercialItems;
  if (Object.keys(summaryRow).length) rows.unshift(summaryRow);
  const recognizedCount = Object.keys(textExtraction.row).length + Object.keys(summaryRow).filter((key) => !key.startsWith("__")).length;
  const warnings: CalculationWarning[] = rows.length ? [...textExtraction.warnings, ...spreadsheetWarnings] : [{ code: "EMPTY_SPREADSHEET", severity: "blocking", message: `${file.name} contains no readable worksheet cells. Upload a populated workbook or another supported format.` }];
  if (rows.length && recognizedCount === 0) warnings.push({ code: "NO_RECOGNIZED_FIELDS", severity: "warning", message: `${file.name} was read, but its headings did not match transaction or logistics fields. Use clear labels or complete the missing fields manually.` });
  if (ignoredInstructions.length) warnings.push({ code: "UNTRUSTED_DOCUMENT_INSTRUCTION", severity: "warning", message: `${ignoredInstructions.length} instruction-like spreadsheet value(s) were quarantined as document content and were not executed.` });
  return {
    id: `document:${file.name}:${file.size}`,
    fileName: file.name,
    format: "spreadsheet",
    status: rows.length ? "parsed" : "rejected",
    rows,
    facts: Object.entries(summaryRow).slice(0, 40).map(([key, value]) => `${key} = ${String(value)}`),
    ignoredInstructions,
    warnings,
    fieldSources: Object.fromEntries(Object.entries(fieldSources).map(([key, source]) => [normalizedKey(key), source])),
    fieldEvidence: { ...Object.fromEntries(Object.entries(textExtraction.fieldEvidence).map(([key, evidence]) => [normalizedKey(key), evidence])), ...spreadsheetFieldEvidence },
    documentProfile: {
      ...textExtraction.profile,
      documentType: textExtraction.profile.documentType === "unknown" && spreadsheetLineItemCount > 0 ? "quotation" : textExtraction.profile.documentType,
      lineItemCount: spreadsheetLineItemCount || textExtraction.profile.lineItemCount,
      workingCommercialLineCount: spreadsheetLineItemCount || textExtraction.profile.workingCommercialLineCount,
      calculatedLineItemTotal: spreadsheetCalculatedTotal ?? textExtraction.profile.calculatedLineItemTotal,
      printedCommercialTotal: spreadsheetPrintedTotal ?? textExtraction.profile.printedCommercialTotal,
      commercialTotalDiscrepancy: spreadsheetCalculatedTotal !== undefined && spreadsheetPrintedTotal !== undefined ? spreadsheetCalculatedTotal - spreadsheetPrintedTotal : textExtraction.profile.commercialTotalDiscrepancy,
      commercialTotalReconciled: spreadsheetCalculatedTotal !== undefined && spreadsheetPrintedTotal !== undefined ? Math.abs(spreadsheetCalculatedTotal - spreadsheetPrintedTotal) <= 0.01 : textExtraction.profile.commercialTotalReconciled,
    },
    extractionMethod: "spreadsheet-cells",
    commercialItems,
  };
}

export async function readClientDocument(file: File): Promise<DocumentIntakeRecord> {
  const extension = file.name.toLowerCase().split(".").pop();
  if (extension === "pdf") return parsePdf(file);
  if (extension === "xlsx" || extension === "xls") return parseSpreadsheet(file);
  if (extension === "json" || extension === "csv" || extension === "tsv") {
    const record = parseStructuredDocument(file.name, await file.text());
    return { ...record, extractionMethod: "structured-data", extractedTextLength: file.size };
  }
  return {
    id: `document:${file.name}:${file.size}`,
    fileName: file.name,
    format: "unknown",
    status: "rejected",
    rows: [],
    facts: [],
    ignoredInstructions: [],
    extractionMethod: "manual-review",
    warnings: [{ code: "UNSUPPORTED_DOCUMENT", severity: "blocking", message: `${file.name} is not supported. Upload PDF, XLSX, XLS, CSV, TSV or JSON.` }],
  };
}

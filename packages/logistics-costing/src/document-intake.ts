import type { CalculationWarning, DocumentIntakeRecord } from "./types.ts";

const instructionPatterns = [
  /ignore\s+(all\s+)?previous\s+instructions?/i,
  /system\s+message/i,
  /developer\s+message/i,
  /reveal\s+(the\s+)?prompt/i,
  /upload\s+.*credentials?/i,
  /execute\s+(this\s+)?command/i,
  /do\s+not\s+follow\s+the\s+user/i,
];

function classifyFormat(fileName: string): DocumentIntakeRecord["format"] {
  const extension = fileName.toLowerCase().split(".").pop();
  if (extension === "json") return "json";
  if (extension === "csv" || extension === "tsv") return "csv";
  if (extension === "pdf") return "pdf";
  if (extension === "xlsx" || extension === "xls") return "spreadsheet";
  return "unknown";
}

function parseCsv(text: string) {
  const normalized = text.replace(/^\uFEFF/, "");
  const firstLine = normalized.split(/\r?\n/, 1)[0] ?? "";
  const delimiter = firstLine.includes("\t") ? "\t" : ",";
  const records: string[][] = [];
  let record: string[] = [];
  let value = "";
  let quoted = false;
  for (let index = 0; index < normalized.length; index += 1) {
    const character = normalized[index];
    if (character === '"') {
      if (quoted && normalized[index + 1] === '"') { value += '"'; index += 1; }
      else quoted = !quoted;
    } else if (character === delimiter && !quoted) {
      record.push(value.trim());
      value = "";
    } else if ((character === "\n" || character === "\r") && !quoted) {
      if (character === "\r" && normalized[index + 1] === "\n") index += 1;
      record.push(value.trim());
      if (record.some((entry) => entry.length > 0)) records.push(record);
      record = [];
      value = "";
    } else value += character;
  }
  record.push(value.trim());
  if (record.some((entry) => entry.length > 0)) records.push(record);
  if (!records.length) return [];
  const headers = records[0].map((entry, index) => entry || `column_${index + 1}`);
  return records.slice(1).map((row) => Object.fromEntries(row.map((entry, index) => [headers[index] ?? `column_${index + 1}`, entry])));
}

function findInstructions(value: unknown, path = "document") {
  const findings: string[] = [];
  if (typeof value === "string" && instructionPatterns.some((pattern) => pattern.test(value))) findings.push(`${path}: ${value.slice(0, 180)}`);
  else if (Array.isArray(value)) value.forEach((entry, index) => findings.push(...findInstructions(entry, `${path}[${index}]`)));
  else if (value && typeof value === "object") Object.entries(value).forEach(([key, entry]) => findings.push(...findInstructions(entry, `${path}.${key}`)));
  return findings;
}

export function parseStructuredDocument(fileName: string, content?: string): DocumentIntakeRecord {
  const format = classifyFormat(fileName);
  const warnings: CalculationWarning[] = [];
  let rows: Record<string, unknown>[] = [];
  if (format === "json" && content !== undefined) {
    try {
      const parsed = JSON.parse(content) as unknown;
      rows = Array.isArray(parsed) ? parsed.filter((item): item is Record<string, unknown> => Boolean(item) && typeof item === "object") : parsed && typeof parsed === "object" ? [parsed as Record<string, unknown>] : [];
    } catch {
      warnings.push({ code: "INVALID_JSON", severity: "blocking", message: `${fileName} is not valid JSON.` });
    }
  } else if (format === "csv" && content !== undefined) rows = parseCsv(content);
  else if (format === "pdf" || format === "spreadsheet") warnings.push({ code: "BINARY_REVIEW_REQUIRED", severity: "warning", message: `${fileName} is staged only. This client prototype does not extract binary PDF/XLSX content; source-controlled extraction remains a migration dependency.` });
  else warnings.push({ code: "UNSUPPORTED_DOCUMENT", severity: "blocking", message: `${fileName} is not a supported intake format.` });

  const ignoredInstructions = findInstructions(rows);
  if (ignoredInstructions.length) warnings.push({ code: "UNTRUSTED_DOCUMENT_INSTRUCTION", severity: "warning", message: `${ignoredInstructions.length} instruction-like document value(s) were quarantined as untrusted content and were not executed.` });
  const facts = rows.flatMap((row, index) => Object.entries(row).slice(0, 12).map(([key, value]) => `row ${index + 1}.${key} = ${String(value)}`));
  return {
    id: `document:${fileName}:${content?.length ?? 0}`,
    fileName,
    format,
    status: warnings.some((warning) => warning.severity === "blocking") ? "rejected" : format === "json" || format === "csv" ? "parsed" : "staged-for-review",
    rows,
    facts,
    ignoredInstructions,
    warnings,
  };
}

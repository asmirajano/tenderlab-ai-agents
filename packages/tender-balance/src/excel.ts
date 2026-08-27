/* eslint-disable no-useless-escape -- XML attributes stay visually explicit inside template literals. */
import type { BalanceSheetReview } from "./model.ts";

type CellValue = string | number | null | undefined;
type CellSpec = { value: CellValue; style?: number };

const encoder = new TextEncoder();

function xml(value: CellValue) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function columnName(index: number) {
  let value = index + 1;
  let result = "";
  while (value > 0) {
    value -= 1;
    result = String.fromCharCode(65 + (value % 26)) + result;
    value = Math.floor(value / 26);
  }
  return result;
}

function cellXml(row: number, column: number, spec: CellSpec) {
  if (spec.value === null || spec.value === undefined) return "";
  const reference = `${columnName(column)}${row}`;
  const style = spec.style === undefined ? "" : ` s=\"${spec.style}\"`;
  if (typeof spec.value === "number" && Number.isFinite(spec.value)) return `<c r=\"${reference}\"${style}><v>${spec.value}</v></c>`;
  return `<c r=\"${reference}\" t=\"inlineStr\"${style}><is><t xml:space=\"preserve\">${xml(spec.value)}</t></is></c>`;
}

function worksheetXml(options: {
  rows: CellSpec[][];
  widths: number[];
  freezeRow?: number;
  autoFilterRow?: number;
  mergeTitle?: boolean;
}) {
  const lastColumn = columnName(Math.max(0, options.rows.reduce((max, row) => Math.max(max, row.length), 0) - 1));
  const rowXml = options.rows.map((cells, index) => `<row r=\"${index + 1}\">${cells.map((cell, column) => cellXml(index + 1, column, cell)).join("")}</row>`).join("");
  const columns = options.widths.map((width, index) => `<col min=\"${index + 1}\" max=\"${index + 1}\" width=\"${width}\" customWidth=\"1\"/>`).join("");
  const pane = options.freezeRow ? `<pane ySplit=\"${options.freezeRow}\" topLeftCell=\"A${options.freezeRow + 1}\" activePane=\"bottomLeft\" state=\"frozen\"/>` : "";
  const autoFilter = options.autoFilterRow ? `<autoFilter ref=\"A${options.autoFilterRow}:${lastColumn}${options.rows.length}\"/>` : "";
  const mergeCells = options.mergeTitle ? `<mergeCells count=\"1\"><mergeCell ref=\"A1:${lastColumn}1\"/></mergeCells>` : "";
  return `<?xml version=\"1.0\" encoding=\"UTF-8\" standalone=\"yes\"?><worksheet xmlns=\"http://schemas.openxmlformats.org/spreadsheetml/2006/main\"><dimension ref=\"A1:${lastColumn}${Math.max(options.rows.length, 1)}\"/><sheetViews><sheetView workbookViewId=\"0\">${pane}</sheetView></sheetViews><sheetFormatPr defaultRowHeight=\"15\"/><cols>${columns}</cols><sheetData>${rowXml}</sheetData>${autoFilter}${mergeCells}<pageMargins left=\"0.35\" right=\"0.35\" top=\"0.55\" bottom=\"0.55\" header=\"0.2\" footer=\"0.2\"/></worksheet>`;
}

function uint16(value: number) {
  return new Uint8Array([value & 0xff, (value >>> 8) & 0xff]);
}

function uint32(value: number) {
  return new Uint8Array([value & 0xff, (value >>> 8) & 0xff, (value >>> 16) & 0xff, (value >>> 24) & 0xff]);
}

function concat(parts: Uint8Array[]) {
  const output = new Uint8Array(parts.reduce((sum, part) => sum + part.length, 0));
  let offset = 0;
  for (const part of parts) {
    output.set(part, offset);
    offset += part.length;
  }
  return output;
}

const crcTable = (() => {
  const table = new Uint32Array(256);
  for (let index = 0; index < 256; index += 1) {
    let value = index;
    for (let bit = 0; bit < 8; bit += 1) value = (value & 1) ? 0xedb88320 ^ (value >>> 1) : value >>> 1;
    table[index] = value >>> 0;
  }
  return table;
})();

function crc32(bytes: Uint8Array) {
  let value = 0xffffffff;
  for (const byte of bytes) value = crcTable[(value ^ byte) & 0xff] ^ (value >>> 8);
  return (value ^ 0xffffffff) >>> 0;
}

function zip(files: Array<{ name: string; content: string }>) {
  const localParts: Uint8Array[] = [];
  const centralParts: Uint8Array[] = [];
  let offset = 0;
  for (const file of files) {
    const name = encoder.encode(file.name);
    const data = encoder.encode(file.content);
    const crc = crc32(data);
    const localHeader = concat([
      uint32(0x04034b50), uint16(20), uint16(0x0800), uint16(0), uint16(0), uint16(0),
      uint32(crc), uint32(data.length), uint32(data.length), uint16(name.length), uint16(0), name,
    ]);
    localParts.push(localHeader, data);
    centralParts.push(concat([
      uint32(0x02014b50), uint16(20), uint16(20), uint16(0x0800), uint16(0), uint16(0), uint16(0),
      uint32(crc), uint32(data.length), uint32(data.length), uint16(name.length), uint16(0), uint16(0),
      uint16(0), uint16(0), uint32(0), uint32(offset), name,
    ]));
    offset += localHeader.length + data.length;
  }
  const centralDirectory = concat(centralParts);
  const end = concat([
    uint32(0x06054b50), uint16(0), uint16(0), uint16(files.length), uint16(files.length),
    uint32(centralDirectory.length), uint32(offset), uint16(0),
  ]);
  return concat([...localParts, centralDirectory, end]);
}

function text(value: CellValue, style?: number): CellSpec {
  return { value, style };
}

function number(value: number | null | undefined, style = 4): CellSpec {
  return { value, style };
}

const stylesXml = `<?xml version=\"1.0\" encoding=\"UTF-8\" standalone=\"yes\"?><styleSheet xmlns=\"http://schemas.openxmlformats.org/spreadsheetml/2006/main\"><numFmts count=\"1\"><numFmt numFmtId=\"164\" formatCode=\"#,##0;[Red](#,##0);-\"/></numFmts><fonts count=\"4\"><font><sz val=\"10\"/><name val=\"Aptos\"/></font><font><b/><sz val=\"16\"/><color rgb=\"FF0F5132\"/><name val=\"Aptos Display\"/></font><font><b/><sz val=\"10\"/><color rgb=\"FF0F2A24\"/><name val=\"Aptos\"/></font><font><b/><sz val=\"10\"/><color rgb=\"FFFFFFFF\"/><name val=\"Aptos\"/></font></fonts><fills count=\"5\"><fill><patternFill patternType=\"none\"/></fill><fill><patternFill patternType=\"gray125\"/></fill><fill><patternFill patternType=\"solid\"><fgColor rgb=\"FF0F2A24\"/><bgColor indexed=\"64\"/></patternFill></fill><fill><patternFill patternType=\"solid\"><fgColor rgb=\"FFEAF3EE\"/><bgColor indexed=\"64\"/></patternFill></fill><fill><patternFill patternType=\"solid\"><fgColor rgb=\"FFFFF4D6\"/><bgColor indexed=\"64\"/></patternFill></fill></fills><borders count=\"2\"><border><left/><right/><top/><bottom/><diagonal/></border><border><left/><right/><top style=\"thin\"><color rgb=\"FF799387\"/></top><bottom/><diagonal/></border></borders><cellStyleXfs count=\"1\"><xf numFmtId=\"0\" fontId=\"0\" fillId=\"0\" borderId=\"0\"/></cellStyleXfs><cellXfs count=\"10\"><xf numFmtId=\"0\" fontId=\"0\" fillId=\"0\" borderId=\"0\" xfId=\"0\"/><xf numFmtId=\"0\" fontId=\"1\" fillId=\"0\" borderId=\"0\" xfId=\"0\" applyFont=\"1\"/><xf numFmtId=\"0\" fontId=\"2\" fillId=\"3\" borderId=\"0\" xfId=\"0\" applyFont=\"1\" applyFill=\"1\"/><xf numFmtId=\"0\" fontId=\"3\" fillId=\"2\" borderId=\"0\" xfId=\"0\" applyFont=\"1\" applyFill=\"1\" applyAlignment=\"1\"><alignment horizontal=\"center\" vertical=\"center\" wrapText=\"1\"/></xf><xf numFmtId=\"164\" fontId=\"0\" fillId=\"0\" borderId=\"0\" xfId=\"0\" applyNumberFormat=\"1\"/><xf numFmtId=\"0\" fontId=\"2\" fillId=\"3\" borderId=\"1\" xfId=\"0\" applyFont=\"1\" applyFill=\"1\" applyBorder=\"1\"/><xf numFmtId=\"164\" fontId=\"2\" fillId=\"3\" borderId=\"1\" xfId=\"0\" applyFont=\"1\" applyFill=\"1\" applyBorder=\"1\" applyNumberFormat=\"1\"/><xf numFmtId=\"10\" fontId=\"0\" fillId=\"0\" borderId=\"0\" xfId=\"0\" applyNumberFormat=\"1\"/><xf numFmtId=\"0\" fontId=\"0\" fillId=\"4\" borderId=\"0\" xfId=\"0\" applyFill=\"1\" applyAlignment=\"1\"><alignment vertical=\"top\" wrapText=\"1\"/></xf><xf numFmtId=\"0\" fontId=\"0\" fillId=\"0\" borderId=\"0\" xfId=\"0\" applyAlignment=\"1\"><alignment vertical=\"top\" wrapText=\"1\"/></xf></cellXfs><cellStyles count=\"1\"><cellStyle name=\"Normal\" xfId=\"0\" builtinId=\"0\"/></cellStyles></styleSheet>`;

export function balanceSheetExcelFileName(review: BalanceSheetReview) {
  const stem = review.source.fileName.replace(/\.[^.]+$/, "").replace(/[^a-z0-9._-]+/gi, "-").replace(/^-+|-+$/g, "") || "balance-sheet";
  return `${stem}-digitized.xlsx`;
}

export function reviewToExcel(review: BalanceSheetReview) {
  const periods = review.statement.periods;
  const mainHeaders = ["Section", "Original balance item", "Normalized concept", ...periods.map((period) => `${period} — reported`), "Source page", "Confidence", "Review status"];
  const mainRows: CellSpec[][] = [
    [text("TenderBalance — Digitized Balance Sheet", 1)],
    [text("Entity", 2), text(review.statement.reportingEntity), text("Reporting date", 2), text(review.statement.reportingDate)],
    [text("Source file", 2), text(review.source.fileName), text("Currency / units", 2), text(`${review.statement.currency} · ${review.statement.unitLabel}`)],
    [text("Source identity", 2), text(review.source.sha256), text("Processing version", 2), text(review.source.processingVersion ?? "tender-balance/1.0.0")],
    [text("Result status", 2), text(review.issues.some((issue) => issue.severity !== "info") ? "Completed with findings" : "Completed"), text("Rows / values", 2), text(`${review.lineItems.length} / ${review.lineItems.reduce((sum, item) => sum + item.values.length, 0)}`)],
    [],
    mainHeaders.map((header) => text(header, 3)),
    ...review.lineItems.map((item) => {
      const pages = Array.from(new Set(item.values.map((value) => value.source.page))).join(", ");
      return [
        text(item.classification.replaceAll("_", " "), item.isTotal ? 5 : 0),
        text(item.originalLabel, item.isTotal ? 5 : 0),
        text(item.normalizedConcept, item.isTotal ? 5 : 0),
        ...periods.map((period) => number(item.values.find((value) => value.period === period)?.normalizedValue, item.isTotal ? 6 : 4)),
        text(pages, item.isTotal ? 5 : 0),
        number(item.confidence, 7),
        text(item.reviewStatus, item.isTotal ? 5 : 0),
      ];
    }),
  ];

  const checkRows: CellSpec[][] = [
    [text("TenderBalance — Arithmetic Checks", 1)],
    [text("Period", 3), text("Relationship", 3), text("Reported / left", 3), text("Calculated / right", 3), text("Difference", 3), text("Status", 3)],
    ...review.arithmeticChecks.map((check) => [text(check.period), text(check.formula), number(check.leftValue), number(check.rightValue), number(check.difference), text(check.status, check.status === "failed" ? 8 : 0)]),
  ];

  const findingRows: CellSpec[][] = [
    [text("TenderBalance — Validation Findings", 1)],
    [text("Severity", 3), text("Code", 3), text("Period", 3), text("Message", 3), text("Difference", 3), text("Source pages", 3)],
    ...review.issues.map((issue) => [text(issue.severity, issue.severity === "warning" ? 8 : 0), text(issue.code), text(issue.period ?? "Document"), text(issue.message, 9), number(issue.difference), text(Array.from(new Set(issue.sourceRefs.map((reference) => reference.page))).join(", "))]),
  ];

  const traceRows: CellSpec[][] = [
    [text("TenderBalance — Source Trace", 1)],
    ["Line ID", "Section", "Original label", "Normalized concept", "Period", "Raw reported value", "Numeric reported value", "Normalized value", "Corrected value", "Page", "Extraction method", "Confidence", "Review status"].map((header) => text(header, 3)),
    ...review.lineItems.flatMap((item) => item.values.map((value) => [
      text(item.id), text(item.classification), text(item.originalLabel), text(item.normalizedConcept), text(value.period), text(value.rawReportedValue),
      number(value.reportedValue), number(value.normalizedValue), number(value.correction?.correctedNormalizedValue), number(value.source.page, 0), text(value.source.extractionMethod), number(value.source.confidence, 7), text(item.reviewStatus),
    ])),
  ];

  const sheets = [
    { name: "Balance Sheet", xml: worksheetXml({ rows: mainRows, widths: [22, 48, 30, ...periods.map(() => 18), 12, 13, 16], freezeRow: 7, autoFilterRow: 7, mergeTitle: true }) },
    { name: "Arithmetic Checks", xml: worksheetXml({ rows: checkRows, widths: [18, 46, 19, 19, 16, 16], freezeRow: 2, autoFilterRow: 2, mergeTitle: true }) },
    { name: "Findings", xml: worksheetXml({ rows: findingRows, widths: [14, 34, 18, 90, 16, 16], freezeRow: 2, autoFilterRow: 2, mergeTitle: true }) },
    { name: "Source Trace", xml: worksheetXml({ rows: traceRows, widths: [40, 22, 34, 30, 18, 22, 20, 18, 18, 10, 18, 13, 16], freezeRow: 2, autoFilterRow: 2, mergeTitle: true }) },
  ];

  const workbookXml = `<?xml version=\"1.0\" encoding=\"UTF-8\" standalone=\"yes\"?><workbook xmlns=\"http://schemas.openxmlformats.org/spreadsheetml/2006/main\" xmlns:r=\"http://schemas.openxmlformats.org/officeDocument/2006/relationships\"><bookViews><workbookView xWindow=\"0\" yWindow=\"0\" windowWidth=\"24000\" windowHeight=\"12000\"/></bookViews><sheets>${sheets.map((sheet, index) => `<sheet name=\"${xml(sheet.name)}\" sheetId=\"${index + 1}\" r:id=\"rId${index + 1}\"/>`).join("")}</sheets></workbook>`;
  const workbookRelationships = `<?xml version=\"1.0\" encoding=\"UTF-8\" standalone=\"yes\"?><Relationships xmlns=\"http://schemas.openxmlformats.org/package/2006/relationships\">${sheets.map((_, index) => `<Relationship Id=\"rId${index + 1}\" Type=\"http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet\" Target=\"worksheets/sheet${index + 1}.xml\"/>`).join("")}<Relationship Id=\"rId${sheets.length + 1}\" Type=\"http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles\" Target=\"styles.xml\"/></Relationships>`;
  const contentTypes = `<?xml version=\"1.0\" encoding=\"UTF-8\" standalone=\"yes\"?><Types xmlns=\"http://schemas.openxmlformats.org/package/2006/content-types\"><Default Extension=\"rels\" ContentType=\"application/vnd.openxmlformats-package.relationships+xml\"/><Default Extension=\"xml\" ContentType=\"application/xml\"/><Override PartName=\"/xl/workbook.xml\" ContentType=\"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml\"/><Override PartName=\"/xl/styles.xml\" ContentType=\"application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml\"/>${sheets.map((_, index) => `<Override PartName=\"/xl/worksheets/sheet${index + 1}.xml\" ContentType=\"application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml\"/>`).join("")}</Types>`;

  return zip([
    { name: "[Content_Types].xml", content: contentTypes },
    { name: "_rels/.rels", content: `<?xml version=\"1.0\" encoding=\"UTF-8\" standalone=\"yes\"?><Relationships xmlns=\"http://schemas.openxmlformats.org/package/2006/relationships\"><Relationship Id=\"rId1\" Type=\"http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument\" Target=\"xl/workbook.xml\"/></Relationships>` },
    { name: "xl/workbook.xml", content: workbookXml },
    { name: "xl/_rels/workbook.xml.rels", content: workbookRelationships },
    { name: "xl/styles.xml", content: stylesXml },
    ...sheets.map((sheet, index) => ({ name: `xl/worksheets/sheet${index + 1}.xml`, content: sheet.xml })),
  ]);
}

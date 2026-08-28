import type { CalculationWarning, CommercialItemEvidence } from "./types.ts";

function normalizedKey(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "");
}

function spreadsheetNumber(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  const text = String(value ?? "").trim();
  if (!text) return undefined;
  const negative = /^\(.*\)$/.test(text);
  const normalized = text.replace(/\s/g, "").replace(/[^0-9.,-]/g, "");
  const lastComma = normalized.lastIndexOf(",");
  const lastDot = normalized.lastIndexOf(".");
  let canonical: string;
  if (lastComma >= 0 && lastDot < 0 && /^-?\d{1,3}(,\d{3})+$/.test(normalized)) canonical = normalized.replace(/,/g, "");
  else if (lastDot >= 0 && lastComma < 0 && /^-?\d{1,3}(\.\d{3})+$/.test(normalized)) canonical = normalized.replace(/\./g, "");
  else {
    const decimalSeparator = lastComma > lastDot ? "," : ".";
    canonical = normalized.replace(decimalSeparator === "," ? /\./g : /,/g, "").replace(decimalSeparator, ".").replace(/(?!^)-/g, "");
  }
  const parsed = Number(canonical);
  return Number.isFinite(parsed) ? (negative ? -Math.abs(parsed) : parsed) : undefined;
}

export type SpreadsheetCommercialSummary = {
  row: Record<string, unknown>;
  fieldSources: Record<string, string>;
  warnings: CalculationWarning[];
  commercialItems: CommercialItemEvidence[];
  lineItemCount?: number;
  calculatedLineItemTotal?: number;
  printedCommercialTotal?: number;
};

/** Detects a conventional quotation table even when currency appears only in column headings. */
export function extractSpreadsheetCommercialSummary(arrayRows: unknown[][], fileName: string, sheetName: string): SpreadsheetCommercialSummary {
  const row: Record<string, unknown> = {};
  const fieldSources: Record<string, string> = {};
  const warnings: CalculationWarning[] = [];
  const cells = arrayRows.map((candidate) => candidate.map((cell) => String(cell ?? "").trim()));
  const headerIndex = cells.findIndex((candidate) => {
    const headings = candidate.map(normalizedKey);
    return headings.some((heading) => /^(qty|quantity)$/.test(heading))
      && headings.some((heading) => /unit.*price|price.*unit/.test(heading))
      && headings.some((heading) => /^(amount|total)(_|$)|amount.*usd|total.*usd/.test(heading));
  });
  if (headerIndex < 0) return { row, fieldSources, warnings, commercialItems: [] };

  const headings = cells[headerIndex].map(normalizedKey);
  const itemCodeColumn = headings.findIndex((heading) => /^(item_?code|code|sku|product_?code)$/.test(heading));
  const itemDescriptionColumn = headings.findIndex((heading) => /^(item|description|item_?description)$/.test(heading));
  const productNameColumn = headings.findIndex((heading) => /product.*name|name.*product/.test(heading));
  const modelColumn = headings.findIndex((heading) => /^(model|model_?no|model_?number)$/.test(heading));
  const quantityColumn = headings.findIndex((heading) => /^(qty|quantity)$/.test(heading));
  const unitPriceColumn = headings.findIndex((heading) => /unit.*price|price.*unit/.test(heading));
  const amountColumn = headings.findIndex((heading) => /^(amount|total)(_|$)|amount.*usd|total.*usd/.test(heading));
  const currencyMatch = cells[headerIndex].join(" ").toUpperCase().match(/\b(USD|EUR|GBP|CNY|RMB|UZS|JPY|CHF|AED)\b/);
  const itemAmounts: number[] = [];
  const commercialItems: CommercialItemEvidence[] = [];
  let printedCommercialTotal: number | undefined;
  let printedTotalRow = -1;
  let sourceIncoterm: string | undefined;
  let carriedItemCode = "";

  for (let index = headerIndex + 1; index < cells.length; index += 1) {
    const candidate = cells[index];
    const label = candidate.join(" ").replace(/\s+/g, " ").trim();
    const totalLabel = /\b(grand\s+total|quotation\s+total|total\s+amount|total\s+price|exw\s+price|fca\s+price|cpt\s+price|cip\s+price|dap\s+price|dpu\s+price|ddp\s+price|fob\s+price|cfr\s+price|cif\s+price)\b/i.test(label);
    if (totalLabel) {
      const numericCells = candidate.map(spreadsheetNumber).filter((value): value is number => value !== undefined);
      printedCommercialTotal = spreadsheetNumber(candidate[amountColumn]) ?? numericCells.at(-1);
      printedTotalRow = index;
      sourceIncoterm = label.toUpperCase().match(/\b(EXW|FCA|CPT|CIP|DAP|DPU|DDP|FAS|FOB|CFR|CIF)\b/)?.[1];
      continue;
    }
    const quantity = spreadsheetNumber(candidate[quantityColumn]);
    const unitPrice = spreadsheetNumber(candidate[unitPriceColumn]);
    const amount = spreadsheetNumber(candidate[amountColumn]);
    if (quantity !== undefined && quantity > 0 && (amount !== undefined || unitPrice !== undefined)) {
      const lineTotal = amount ?? quantity * (unitPrice ?? 0);
      itemAmounts.push(lineTotal);
      const explicitCode = itemCodeColumn >= 0 ? candidate[itemCodeColumn]?.trim() : "";
      if (explicitCode) carriedItemCode = explicitCode;
      const itemDescription = itemDescriptionColumn >= 0 ? candidate[itemDescriptionColumn]?.trim() : "";
      const productName = productNameColumn >= 0 ? candidate[productNameColumn]?.trim() : "";
      const model = modelColumn >= 0 ? candidate[modelColumn]?.trim() : "";
      const description = [itemDescription, productName, model].filter((value) => value && !/^\d+(?:\.\d+)?$/.test(value)).join(" · ") || carriedItemCode || `Commercial line ${commercialItems.length + 1}`;
      commercialItems.push({
        id: `${normalizedKey(sheetName) || "sheet"}-line-${index + 1}`,
        ...(carriedItemCode ? { itemCode: carriedItemCode } : {}),
        description,
        ...(productName ? { productName } : {}),
        ...(model ? { model } : {}),
        quantity,
        ...(unitPrice !== undefined ? { unitPrice } : {}),
        lineTotal,
        ...(currencyMatch?.[1] ? { currency: currencyMatch[1] === "RMB" ? "CNY" : currencyMatch[1] } : {}),
        sourceRef: `${fileName} · ${sheetName} · row ${index + 1}`,
        workingBaselineIncluded: true,
      });
    }
  }

  if (!itemAmounts.length && printedCommercialTotal === undefined) return { row, fieldSources, warnings, commercialItems };
  const calculatedLineItemTotal = itemAmounts.length ? Math.round((itemAmounts.reduce((sum, value) => sum + value, 0) + Number.EPSILON) * 100) / 100 : undefined;
  const workingTotal = calculatedLineItemTotal ?? printedCommercialTotal;
  const totalSourceRow = printedTotalRow >= 0 ? printedTotalRow + 1 : headerIndex + 1;
  const sourceRef = `${fileName} · ${sheetName} · ${itemAmounts.length} priced row${itemAmounts.length === 1 ? "" : "s"}`;
  if (workingTotal !== undefined) { row.contract_value = workingTotal; fieldSources.contract_value = sourceRef; }
  if (currencyMatch?.[1]) { row.currency = currencyMatch[1] === "RMB" ? "CNY" : currencyMatch[1]; fieldSources.currency = `${fileName} · ${sheetName} · row ${headerIndex + 1}`; }
  if (sourceIncoterm) { row.source_incoterm = sourceIncoterm; fieldSources.source_incoterm = `${fileName} · ${sheetName} · row ${totalSourceRow}`; }
  if (calculatedLineItemTotal !== undefined && printedCommercialTotal !== undefined) {
    const discrepancy = Math.round((calculatedLineItemTotal - printedCommercialTotal + Number.EPSILON) * 100) / 100;
    if (Math.abs(discrepancy) > 0.01) warnings.push({ code: "COMMERCIAL_TOTAL_DISCREPANCY", severity: "warning", message: `Calculated line-item value ${calculatedLineItemTotal.toFixed(2)} differs from the labelled quotation total ${printedCommercialTotal.toFixed(2)} by ${discrepancy.toFixed(2)}. The calculated line-item total is used as the working commercial baseline.` });
  }
  return { row, fieldSources, warnings, commercialItems, lineItemCount: itemAmounts.length || undefined, calculatedLineItemTotal, printedCommercialTotal };
}

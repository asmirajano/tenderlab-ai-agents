import {
  componentLabels,
  costComponentCodes,
  type CalculationWarning,
  type CostComponentCode,
  type DocumentFieldEvidence,
  type DocumentProfile,
} from "../../../packages/logistics-costing/src/index.ts";

export type SemanticTextSection = { label: string; text: string; pageNumber?: number };

type SemanticExtraction = {
  row: Record<string, unknown>;
  fieldSources: Record<string, string>;
  fieldEvidence: Record<string, DocumentFieldEvidence>;
  profile: DocumentProfile;
  warnings: CalculationWarning[];
};

const incotermPattern = "EXW|FCA|CPT|CIP|DAP|DPU|DDP|FAS|FOB|CFR|CIF";
const currencyCodes = "USD|EUR|GBP|CNY|RMB|UZS|JPY|CHF|AED";

const componentTextAliases: Partial<Record<CostComponentCode, string[]>> = {
  export_packing: ["export packing", "packing charge", "crating charge"],
  origin_loading: ["origin loading", "loading charge", "factory loading"],
  origin_pickup: ["inland pickup", "origin pickup", "pre carriage", "pre-carriage"],
  origin_terminal: ["origin terminal", "origin thc", "origin handling"],
  vessel_loading: ["vessel loading", "on board handling", "on-board handling"],
  export_clearance: ["export clearance", "export customs", "export documents"],
  main_freight: ["main freight", "international freight", "rail freight", "air freight", "ocean freight", "sea freight"],
  transit_handling: ["transit handling", "border handling"],
  transshipment: ["transshipment", "transhipment"],
  insurance: ["cargo insurance", "insurance premium"],
  destination_terminal: ["destination terminal", "destination thc", "destination handling"],
  import_clearance: ["import clearance", "import customs", "customs brokerage"],
  duty: ["customs duty", "import duty"],
  vat_tax: ["import vat", "import tax", "taxes"],
  final_delivery: ["final delivery", "last mile", "on carriage", "on-carriage"],
  destination_unloading: ["destination unloading", "unloading charge"],
  cold_chain: ["cold chain", "refrigerated transport"],
  dangerous_goods: ["dangerous goods", "dg handling"],
  storage: ["storage charge", "storage fee"],
  demurrage_detention: ["demurrage", "detention"],
  contingency: ["contingency", "rate validity allowance"],
};

const categoryRules: Array<{ label: string; pattern: RegExp }> = [
  { label: "medical", pattern: /\b(?:medical|clinical|diagnostic|ultrasound|oximeter|hematology|patient)\b/gi },
  { label: "veterinary", pattern: /\b(?:veterinary|veterinarian|animal|vet)\b/gi },
  { label: "laboratory", pattern: /\b(?:laboratory|microscope|analy[sz]er|centrifuge|balance|spectro\w*|refractometer|incubator|distiller|laminar|autoclave|shaker)\b/gi },
  { label: "industrial", pattern: /\b(?:industrial|machinery|machine|production line|compressor|generator|pump)\b/gi },
  { label: "electrical", pattern: /\b(?:electrical|electronic|switchgear|transformer|cable|power supply)\b/gi },
  { label: "information technology", pattern: /\b(?:computer|server|network|software|printer|scanner|workstation)\b/gi },
];

function cleanedValue(value: string) {
  return value.replace(/^[\s:;|–—-]+|[\s|]+$/g, "").replace(/\s{2,}/g, " ").trim();
}

function escapePattern(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function sectionLines(section: SemanticTextSection) {
  return section.text.split(/\r?\n/).map(cleanedValue).filter(Boolean);
}

function parseBusinessNumber(value: string) {
  let normalized = value.replace(/[\s']/g, "").replace(/[^0-9,.-]/g, "");
  if (normalized.includes(",") && normalized.includes(".")) normalized = normalized.replace(/,/g, "");
  else if ((normalized.match(/,/g) ?? []).length > 1 || /,\d{3}$/.test(normalized)) normalized = normalized.replace(/,/g, "");
  else if (/^\d+,\d{1,2}$/.test(normalized)) normalized = normalized.replace(",", ".");
  else normalized = normalized.replace(/,/g, "");
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function findMatch(sections: SemanticTextSection[], patterns: RegExp[]) {
  for (const section of sections) {
    for (const pattern of patterns) {
      const match = pattern.exec(section.text);
      const value = cleanedValue(match?.[1] ?? "");
      if (value) return { value, sourceRef: section.label, section };
    }
  }
  return undefined;
}

function companyTitle(value: string) {
  if (value !== value.toUpperCase()) return value;
  return value.toLowerCase().replace(/\b[a-z]/g, (character) => character.toUpperCase()).replace(/\bCo\b/g, "Co").replace(/\bLtd\b/g, "Ltd");
}

function trailingCityCountry(line: string) {
  const match = line.match(/([A-Za-z][A-Za-z .'-]{1,38}),\s*([A-Za-z][A-Za-z .'-]{1,38})\s*$/);
  return match ? `${cleanedValue(match[1])}, ${cleanedValue(match[2])}` : undefined;
}

function joinCategories(labels: string[]) {
  if (labels.length === 1) return labels[0];
  if (labels.length === 2) return `${labels[0]} and ${labels[1]}`;
  return `${labels.slice(0, -1).join(", ")} and ${labels.at(-1)}`;
}

function detectDocumentType(sections: SemanticTextSection[]) {
  const heading = sections.slice(0, 2).map((section) => section.text).join("\n");
  const candidates: Array<[DocumentProfile["documentType"], RegExp]> = [
    ["quotation", /(?:^|\n)\s*(?:commercial\s+)?quotation\s*(?:\n|$)/im],
    ["invoice", /(?:^|\n)\s*(?:commercial\s+|proforma\s+)?invoice\s*(?:\n|$)/im],
    ["purchase-order", /\b(?:purchase order|p\.o\.)\b/i],
    ["packing-list", /\bpacking list\b/i],
    ["contract", /(?:^|\n)\s*contract\s*(?:\n|$)/im],
    ["freight-quote", /\b(?:freight|transport) (?:quotation|quote)\b/i],
  ];
  return candidates.find(([, pattern]) => pattern.test(heading))?.[0] ?? "unknown";
}

function moneyTokens(line: string) {
  return [...line.matchAll(new RegExp(`(?:\\b(?:${currencyCodes})\\b\\s*|[$€£¥]\\s*)([\\d][\\d,.'\\s]*(?:\\.\\d{1,2})?)`, "gi"))]
    .map((match) => parseBusinessNumber(match[1]))
    .filter((value): value is number => value !== undefined);
}

function priceRows(sections: SemanticTextSection[]) {
  return sections.flatMap((section) => sectionLines(section).map((line, lineIndex) => ({ section, line, lineIndex, amounts: moneyTokens(line) })))
    .filter((candidate) => candidate.amounts.length >= 2 && /\d/.test(candidate.line.slice(0, Math.max(1, candidate.line.search(/(?:USD|EUR|GBP|CNY|RMB|UZS|[$€£¥])/i)))));
}

function workingCommercialRows(sections: SemanticTextSection[], pricedRows: ReturnType<typeof priceRows>) {
  const selected = new Set(pricedRows.filter((candidate) => /^\d+\b/.test(candidate.line)));

  for (const section of sections) {
    const lines = sectionLines(section);
    const sectionRows = pricedRows.filter((candidate) => candidate.section === section);
    const unnumberedRows = sectionRows.filter((candidate) => !/^\d+\b/.test(candidate.line));
    const standaloneNumbers = lines.map((line, lineIndex) => ({ line, lineIndex })).filter(({ line }) => /^\d+$/.test(line));

    standaloneNumbers.forEach(({ lineIndex }, markerIndex) => {
      const previousMarker = standaloneNumbers[markerIndex - 1]?.lineIndex ?? -1;
      const preceding = unnumberedRows.filter((candidate) => candidate.lineIndex > previousMarker && candidate.lineIndex < lineIndex);
      if (preceding.length) {
        selected.add(preceding[0]);
        return;
      }
      const nextBoundary = standaloneNumbers[markerIndex + 1]?.lineIndex ?? lines.length;
      const following = unnumberedRows.filter((candidate) => candidate.lineIndex > lineIndex && candidate.lineIndex < nextBoundary);
      if (following.length) selected.add(following[0]);
    });
  }

  return pricedRows.filter((candidate) => selected.has(candidate));
}

function fieldWriter(row: Record<string, unknown>, sources: Record<string, string>, evidence: Record<string, DocumentFieldEvidence>) {
  return (key: string, value: unknown, fieldEvidence: DocumentFieldEvidence) => {
    if (value === undefined || value === null || value === "" || key in row) return;
    row[key] = value;
    sources[key] = fieldEvidence.sourceRef;
    evidence[key] = fieldEvidence;
  };
}

export function extractSemanticBusinessFacts(sections: SemanticTextSection[]): SemanticExtraction {
  const row: Record<string, unknown> = {};
  const fieldSources: Record<string, string> = {};
  const fieldEvidence: Record<string, DocumentFieldEvidence> = {};
  const warnings: CalculationWarning[] = [];
  const write = fieldWriter(row, fieldSources, fieldEvidence);
  const documentType = detectDocumentType(sections);
  const firstSection = sections[0];
  const firstLines = firstSection ? sectionLines(firstSection) : [];
  const allText = sections.map((section) => section.text).join("\n");
  const firstDocumentLabel = sections[0]?.label.replace(/\s*·\s*page\s+\d+$/i, "") ?? "document";
  const pageRangeLabel = sections.length > 1 ? `${firstDocumentLabel} · pages ${sections[0]?.pageNumber ?? 1}–${sections.at(-1)?.pageNumber ?? sections.length}` : sections[0]?.label ?? "document";
  const pricedRows = priceRows(sections);
  const commercialRows = workingCommercialRows(sections, pricedRows);
  const lineItemTotal = commercialRows.reduce((sum, candidate) => sum + (candidate.amounts.at(-1) ?? 0), 0);

  const explicitSupplier = findMatch(sections.slice(0, 2), [/^(?:supplier|seller|vendor|from)\s*[:–—-]\s*([^\n]{3,180})/im]);
  const headerCompany = firstLines.find((line) => /\b(?:CO\.?\s*,?\s*LTD\.?|LTD\.?|LLC|INC\.?|GMBH|S\.A\.?|PLC)\b/i.test(line) && !/^(?:to|customer|buyer|client)\b/i.test(line));
  const company = explicitSupplier?.value ?? headerCompany;
  if (company && firstSection) {
    const explicitOrigin = findMatch(sections.slice(0, 2), [/^(?:ship from|origin|place of dispatch|delivery place)\s*[:–—-]\s*([^\n]{2,100})/im]);
    const headerLocation = firstLines.slice(0, 16).filter((line) => !/\b(?:CO\.?\s*,?\s*LTD\.?|LTD\.?|LLC|INC\.?|GMBH|S\.A\.?|PLC)\b/i.test(line)).map(trailingCityCountry).find(Boolean);
    let location = explicitOrigin?.value;
    if (location && headerLocation && !location.toLowerCase().includes(headerLocation.split(",").at(-1)?.trim().toLowerCase() ?? "")) location = `${location}, ${headerLocation.split(",").at(-1)?.trim()}`;
    if (!location) location = headerLocation;
    const value = location ? `${companyTitle(company)} — ${location}` : companyTitle(company);
    write("supplier_origin", value, {
      sourceRef: `${firstSection.label} · supplier header${location ? " and location" : ""}`,
      confidence: location ? "medium" : "medium",
      scope: "document",
      basis: location ? "Supplier identity is explicit; supplier location is proposed as cargo origin and needs confirmation." : "Supplier identity extracted from the document header; cargo origin remains to be confirmed.",
    });
  }

  const destination = findMatch(sections.slice(0, 3), [
    /^(?:final\s+)?destination\s*[:–—-]\s*([^\n]{2,140})/im,
    /^(?:ship to|consignee location)\s*[:–—-]\s*([^\n]{2,140})/im,
  ]);
  if (destination) write("destination", destination.value, { sourceRef: `${destination.sourceRef} · destination field`, confidence: "high", scope: "document", basis: "Explicit transaction destination." });

  const explicitCurrency = findMatch(sections, [/^(?:currency|quotation currency|contract currency)\s*[:–—-]\s*([A-Z]{3})\b/im]);
  const tableCurrency = findMatch(sections.slice(0, 3), [
    new RegExp(`(?:unit price|total|amount)\\s*\\(\\s*(${currencyCodes})\\s*\\)`, "i"),
    new RegExp(`\\(\\s*(${currencyCodes})\\s*\\)`, "i"),
  ]);
  const dollarSection = sections.find((section) => /\$\s*[\d]/.test(section.text));
  const currency = explicitCurrency ?? tableCurrency ?? (dollarSection ? { value: "USD", sourceRef: dollarSection.label } : undefined);
  if (currency) write("currency", currency.value.toUpperCase(), { sourceRef: `${currency.sourceRef} · ${explicitCurrency ? "currency field" : tableCurrency ? "price-table heading" : "currency symbol"}`, confidence: explicitCurrency || tableCurrency ? "high" : "medium", scope: "document", basis: explicitCurrency || tableCurrency ? "Currency explicitly labels the commercial amounts." : "USD inferred from repeated dollar-denominated commercial prices; client confirmation recommended." });

  const explicitTotal = findMatch(sections, [
    /^(?:grand total|quotation total|contract value|goods value|total amount|total value)\s*[:–—-]?\s*(?:[A-Z]{3}\s*|[$€£¥]\s*)?([\d][\d,.'\s]*(?:\.\d{1,2})?)/im,
  ]);
  const finalStandaloneTotals = sections.slice(Math.max(0, sections.length - 3)).flatMap((section) => sectionLines(section)
    .map((line) => ({ section, line, amounts: moneyTokens(line) }))
    .filter((candidate) => candidate.amounts.length === 1 && new RegExp(`^(?:${currencyCodes}|[$€£¥])?\\s*[\\d,.' ]+(?:\\.\\d{1,2})?$`, "i").test(candidate.line)));
  const standaloneTotal = finalStandaloneTotals.at(-1);
  const printedTotalValue = explicitTotal ? parseBusinessNumber(explicitTotal.value) : standaloneTotal?.amounts[0];
  const calculatedLineItemTotal = commercialRows.length >= 2 && lineItemTotal > 0 ? lineItemTotal : undefined;
  const totalValue = calculatedLineItemTotal ?? printedTotalValue;
  if (totalValue !== undefined) {
    const totalSource = explicitTotal?.sourceRef ?? standaloneTotal?.section.label ?? sections.at(-1)?.label ?? "document";
    const reconciled = printedTotalValue !== undefined && calculatedLineItemTotal !== undefined && Math.abs(calculatedLineItemTotal - printedTotalValue) <= 0.01;
    write("contract_value", totalValue, {
      sourceRef: calculatedLineItemTotal !== undefined ? `${pageRangeLabel} · calculated from ${commercialRows.length} primary commercial lines${reconciled ? " · reconciled to printed total" : ""}` : `${totalSource} · ${explicitTotal ? "labelled commercial total" : "final quotation total"}`,
      confidence: "high",
      scope: "document",
      basis: calculatedLineItemTotal !== undefined ? `Working commercial baseline is the independently calculated sum of ${commercialRows.length} primary commercial lines.${pricedRows.length > commercialRows.length ? ` ${pricedRows.length - commercialRows.length} subordinate priced subline(s) remain preserved as evidence but are excluded from the baseline to avoid double counting parent-item accessories.` : ""}${printedTotalValue !== undefined && !reconciled ? ` Supplier printed total differs by ${Math.abs(printedTotalValue - calculatedLineItemTotal).toFixed(2)}.` : ""}` : "Final document-level commercial total; item reconciliation was not available.",
    });
  }

  if (calculatedLineItemTotal !== undefined && printedTotalValue !== undefined && Math.abs(calculatedLineItemTotal - printedTotalValue) > 0.01) warnings.push({
    code: "COMMERCIAL_TOTAL_DISCREPANCY",
    severity: "warning",
    message: `Calculated line-item value ${calculatedLineItemTotal.toFixed(2)} differs from the supplier's printed total ${printedTotalValue.toFixed(2)} by ${Math.abs(printedTotalValue - calculatedLineItemTotal).toFixed(2)}. The line-item total is used as the working baseline unless the client overrides it.`,
  });

  if (pricedRows.length >= 2) row.commercial_items = pricedRows.map((candidate, index) => ({
    id: `document-line-${index + 1}`,
    sourceRef: candidate.section.label,
    rawLine: candidate.line,
    lineTotal: candidate.amounts.at(-1),
    workingBaselineIncluded: commercialRows.includes(candidate),
  }));

  if (pricedRows.length > commercialRows.length) warnings.push({
    code: "SUBORDINATE_PRICED_LINES_EXCLUDED",
    severity: "warning",
    message: `${pricedRows.length - commercialRows.length} subordinate priced subline(s) were preserved in the extracted item evidence but excluded from the independently calculated commercial baseline to avoid double counting parent-item accessories. Client review remains available.`,
  });

  const explicitTerm = findMatch(sections, [new RegExp(`^(?:current|existing|source)?\\s*incoterm(?:s)?(?:®)?(?:\\s+2020)?\\s*[:–—-]\\s*(${incotermPattern})\\b`, "im")]);
  const contextualTerm = findMatch(sections, [
    new RegExp(`^(?:[^\\n]{0,80}\\b(?:prices?|pricing|terms?)\\b[^\\n]{0,80})\\b(${incotermPattern})\\b[^\\n]{0,100}(?:shipping|freight|cost|basis)?`, "im"),
    new RegExp(`^([^\\n]{0,1})(${incotermPattern})\\b[^\\n]{0,100}(?:without|excluding|included|shipping|freight|price)`, "im"),
  ]);
  const termValue = explicitTerm?.value ?? contextualTerm?.value.match(new RegExp(`\\b(${incotermPattern})\\b`, "i"))?.[1];
  const termSource = explicitTerm?.sourceRef ?? contextualTerm?.sourceRef;
  if (termValue && termSource) write("current_incoterm", termValue.toUpperCase(), { sourceRef: `${termSource} · ${explicitTerm ? "Incoterm field" : "commercial pricing note"}`, confidence: "high", scope: "document", basis: "Commercial price basis explicitly states the Incoterm." });

  const shipmentVolume = findMatch(sections, [
    /^(?:total\s+)?(?:shipment|cargo|packed|packing)\s+(?:packed\s+)?volume\s*(?:\(?(?:m3|m³|cbm)\)?)?\s*[:–—-]\s*([\d,.]+)/im,
    /^(?:total\s+)?(?:cbm|cubic metres?)\s*[:–—-]\s*([\d,.]+)/im,
  ]);
  const shipmentWeight = findMatch(sections, [
    /^(?:total\s+gross\s+weight|(?:shipment|cargo|consignment|packing)\s+(?:gross\s+)?weight)\s*(?:\(?(?:kg|kgs|kilograms?)\)?)?\s*[:–—-]\s*([\d,.]+)/im,
  ]);
  if (shipmentVolume) write("packed_volume_m3", parseBusinessNumber(shipmentVolume.value), { sourceRef: `${shipmentVolume.sourceRef} · shipment-level packed volume`, confidence: "high", scope: "shipment", basis: "Explicit shipment/packing total; product capacities and dimensions are excluded." });
  if (shipmentWeight) write("gross_weight_kg", parseBusinessNumber(shipmentWeight.value), { sourceRef: `${shipmentWeight.sourceRef} · shipment-level gross weight`, confidence: "high", scope: "shipment", basis: "Explicit shipment/packing total; individual equipment weights are excluded." });

  if (pricedRows.length >= 2) {
    write("line_count", pricedRows.length, { sourceRef: `${pageRangeLabel} · priced item table`, confidence: "high", scope: "document", basis: `${pricedRows.length} priced commercial rows detected.` });
    const matchedCategories = categoryRules.filter(({ pattern }) => (allText.match(pattern) ?? []).length >= 2).map(({ label }) => label).slice(0, 3);
    const cargoCategory = matchedCategories.length ? `${joinCategories(matchedCategories)} equipment` : "mixed commercial goods";
    const value = `${cargoCategory.charAt(0).toUpperCase()}${cargoCategory.slice(1)} — ${pricedRows.length >= 100 ? "100+" : pricedRows.length} line-item ${documentType === "unknown" ? "document" : documentType.replaceAll("-", " ")}`;
    write("cargo_description", value, { sourceRef: `${pageRangeLabel} · derived from the priced item table`, confidence: "medium", scope: "document", basis: `Transaction-level cargo category synthesized from ${pricedRows.length} priced rows; not copied from a single product specification.` });
  }

  for (const component of costComponentCodes) {
    const aliases = componentTextAliases[component] ?? [componentLabels[component]];
    const candidate = sections.flatMap((section) => sectionLines(section).map((line) => ({ section, line }))).find(({ line }) => {
      if (moneyTokens(line).length !== 1) return false;
      return aliases.some((alias) => new RegExp(`^${escapePattern(alias)}(?:\\s+(?:charge|cost|fee|amount|premium|rate))?\\s*[:–—-]?`, "i").test(line));
    });
    if (!candidate) continue;
    const amount = moneyTokens(candidate.line)[0];
    if (amount === undefined) continue;
    write(`${component}_amount`, amount, { sourceRef: `${candidate.section.label} · explicit ${componentLabels[component]} monetary line`, confidence: "high", scope: "shipment", basis: "Explicitly labelled logistics monetary value; technical specifications and merchandise price rows are excluded." });
  }

  const metricSpecificationLines = sections.flatMap(sectionLines).filter((line) => /\b(?:gross weight|net weight|volume|capacity|dimensions?)\b/i.test(line));
  const shipmentMetricsFound = Boolean(shipmentVolume || shipmentWeight);
  const suppressedLineItemMetricCount = Math.max(0, metricSpecificationLines.length - Number(Boolean(shipmentVolume)) - Number(Boolean(shipmentWeight)));
  if (suppressedLineItemMetricCount) warnings.push({ code: "LINE_ITEM_METRICS_EXCLUDED", severity: "info", message: `${suppressedLineItemMetricCount} product-level weight, volume, capacity or dimension specifications were kept out of shipment packed-volume and gross-weight fields.` });

  const profile: DocumentProfile = {
    documentType,
    pageCount: sections.length,
    lineItemCount: pricedRows.length || undefined,
    workingCommercialLineCount: commercialRows.length || undefined,
    pricedSublineCount: pricedRows.length - commercialRows.length || undefined,
    calculatedLineItemTotal,
    printedCommercialTotal: printedTotalValue,
    commercialTotalDiscrepancy: calculatedLineItemTotal !== undefined && printedTotalValue !== undefined ? printedTotalValue - calculatedLineItemTotal : undefined,
    commercialTotalReconciled: printedTotalValue !== undefined && calculatedLineItemTotal !== undefined ? Math.abs(calculatedLineItemTotal - printedTotalValue) <= 0.01 : undefined,
    shipmentMetricsFound,
    suppressedLineItemMetricCount,
  };

  return { row, fieldSources, fieldEvidence, profile, warnings };
}

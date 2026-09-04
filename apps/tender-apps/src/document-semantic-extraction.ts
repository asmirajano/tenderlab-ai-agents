import {
  componentLabels,
  costComponentCodes,
  type CalculationWarning,
  type CostComponentCode,
  type DocumentFieldEvidence,
  type DocumentPhysicalEvidence,
  type DocumentProfile,
} from "../../../packages/logistics-costing/src/index.ts";

export type SemanticTextSection = { label: string; text: string; pageNumber?: number };

type SemanticExtraction = {
  row: Record<string, unknown>;
  fieldSources: Record<string, string>;
  fieldEvidence: Record<string, DocumentFieldEvidence>;
  physicalEvidence: DocumentPhysicalEvidence[];
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
  { label: "electrical", pattern: /\b(?:electrical|electronic|switchgear|transformers?|cable|power supply)\b/gi },
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
  const companyLabelValue = value.match(/\bcompany\s+name\s*[:：]\s*([^\n]{2,140})/i)?.[1];
  const legalNameMatches = [...value.matchAll(/([A-Za-z][A-Za-z0-9&'().,\- ]{1,110}?\b(?:CO\.?\s*,?\s*LTD\.?|LTD\.?|LLC|INC\.?|GMBH|S\.A\.?|PLC))/gi)];
  const candidate = companyLabelValue ?? legalNameMatches.at(-1)?.[1] ?? value;
  const bounded = cleanedValue(candidate.split(/\b(?:mobile|tel(?:ephone)?|phone|email|e-mail|fax|skype|wechat|contact|address|add)\s*[:：]/i)[0] ?? candidate).slice(0, 120);
  if (bounded !== bounded.toUpperCase()) return bounded;
  return bounded.toLowerCase().replace(/\b[a-z]/g, (character) => character.toUpperCase()).replace(/\bCo\b/g, "Co").replace(/\bLtd\b/g, "Ltd");
}

function trailingCityCountry(line: string) {
  const match = line.match(/([A-Za-z][A-Za-z .'-]{1,38}),\s*([A-Za-z][A-Za-z .'-]{1,38})\s*$/);
  if (!match) return undefined;
  const left = cleanedValue(match[1]);
  const right = cleanedValue(match[2]);
  if (/^(?:cm|mm|kg|kgs?|with|without|and|the|a|an)$/i.test(left) || /^(?:cm|mm|kg|kgs?|with|without|and|the|a|an)$/i.test(right)) return undefined;
  return `${left}, ${right}`;
}

function joinCategories(labels: string[]) {
  if (labels.length === 1) return labels[0];
  if (labels.length === 2) return `${labels[0]} and ${labels[1]}`;
  return `${labels.slice(0, -1).join(", ")} and ${labels.at(-1)}`;
}

function detectDocumentType(sections: SemanticTextSection[]) {
  const heading = sections.slice(0, 2).map((section) => section.text).join("\n");
  const candidates: Array<[DocumentProfile["documentType"], RegExp]> = [
    ["quotation", /(?:^|\n)\s*(?:commercial\s+)?quotation(?:\s+of\b[^\n]*)?\s*(?:\n|$)/im],
    ["quotation", /(?:^|\n)\s*(?:commercial\s+)?q\s*uot(?:ation)?\s*(?:\n|$)/im],
    ["invoice", /(?:^|\n)\s*(?:commercial\s+|proforma\s+)?invoice\s*(?:\n|$)/im],
    ["purchase-order", /\b(?:purchase order|p\.o\.)\b/i],
    ["packing-list", /\bpacking list\b/i],
    ["contract", /(?:^|\n)\s*contract\s*(?:\n|$)/im],
    ["freight-quote", /\b(?:freight|transport) (?:quotation|quote)\b/i],
  ];
  return candidates.find(([, pattern]) => pattern.test(heading))?.[0] ?? "unknown";
}

function moneyTokens(line: string) {
  return [...line.matchAll(new RegExp(`(?:(?:\\b(?:${currencyCodes})\\b|[$€£¥])\\s*([\\d][\\d,.'’]*(?:\\.\\d{1,2})?)|([\\d][\\d,.'’]*(?:\\.\\d{1,2})?)\\s*(?:${currencyCodes})\\b)`, "gi"))]
    .map((match) => parseBusinessNumber(match[1] ?? match[2]))
    .filter((value): value is number => value !== undefined);
}

function numericTokens(line: string) {
  return [...line.matchAll(/(?<![A-Za-z])\d[\d,.'’]*(?:\.\d+)?(?![A-Za-z])/g)]
    .map((match) => parseBusinessNumber(match[0]))
    .filter((value): value is number => value !== undefined);
}

function commercialQuantity(line: string) {
  const match = line.match(/\b(\d+(?:\.\d+)?)\s*(?:sets?|pcs?|pieces?|units?)\b/i)
    ?? line.match(new RegExp(`(?:${currencyCodes})\\b\\s*[\\d][\\d,.'’]*(?:\\.\\d{1,2})?\\s+(\\d+(?:\\.\\d+)?)\\s*$`, "i"))
    ?? line.match(/\b(\d+(?:\.\d+)?)\s+(?=[$€£¥]\s*[\d][\d,.']*(?:\.\d{1,2})?\s+[$€£¥])/i)
    ?? line.match(new RegExp(`[\\d][\\d,.'\\s]*(?:\\.\\d{1,2})?\\s*(?:${currencyCodes})\\b\\s+(\\d+(?:\\.\\d+)?)\\s+(?=[\\d][\\d,.'\\s]*(?:\\.\\d{1,2})?\\s*(?:${currencyCodes})\\b)`, "i"))
    ?? line.match(new RegExp(`(?:${currencyCodes})\\b\\s*[\\d][\\d,.'\\s]*(?:\\.\\d{1,2})?\\s+(\\d+(?:\\.\\d+)?)\\s+(?=(?:${currencyCodes})\\b|[$€£¥]|[\\d])`, "i"))
    ?? line.match(new RegExp(`(?:${currencyCodes})\\b\\s*(\\d+(?:\\.\\d+)?)\\s*$`, "i"))
    ?? line.match(new RegExp(`^\\s*(\\d+(?:\\.\\d+)?)\\s+(?=(?:${currencyCodes})\\b|[$€£¥])`, "i"))
    ?? line.match(/^\s*(\d+(?:\.\d+)?)\s+(?=[$€£¥])/);
  const quantity = Number(match?.[1]);
  return Number.isFinite(quantity) && quantity > 0 ? quantity : undefined;
}

function commercialDescription(lines: string[], lineIndex: number, line: string) {
  const preceding = lines.slice(Math.max(0, lineIndex - 7), lineIndex);
  const lastItemMarker = preceding.map((value, index) => /^\d+$/.test(value) ? index : -1).filter((index) => index >= 0).at(-1);
  const block = (lastItemMarker === undefined ? preceding.slice(-5) : preceding.slice(lastItemMarker + 1))
    .filter((value) => /[A-Za-z]/.test(value))
    .filter((value) => !/^(?:quotation|machine|model|unit price|qty|quantity|amount|description|item no\.?|marks?\s*&|number description)$/i.test(value))
    .filter((value) => !/\bdescription\b.*\b(?:qty|quantity)\b.*\b(?:price|amount)\b/i.test(value))
    .filter((value) => !/\b(?:mobile|email|phone|fax|skype|wechat|address|add)\s*[:：]/i.test(value));
  const following = lines.slice(lineIndex + 1, lineIndex + 4)
    .filter((value) => /[A-Za-z]/.test(value))
    .filter((value) => !/^(?:total|remarks?|payment(?:\s+terms?)?)\b/i.test(value));
  const current = line
    .replace(new RegExp(`(?:\\b(?:${currencyCodes})\\b|[$€£¥])\\s*[\\d][\\d,.'\\s]*(?:\\.\\d{1,2})?`, "gi"), " ")
    .replace(new RegExp(`[\\d][\\d,.'\\s]*(?:\\.\\d{1,2})?\\s*(?:${currencyCodes})\\b`, "gi"), " ")
    .replace(/\b\d+(?:\.\d+)?\s*(?:sets?|pcs?|pieces?|units?)\b/gi, " ")
    .replace(/^\s*\d+\s*/, " ")
    .replace(/\b\d+(?:\.\d+)?\s*$/, " ");
 const description = cleanedValue([...block, current, ...following].filter((value) => /[A-Za-z]/.test(value)).join(" "))
    .replace(/^(?:(?:commercial\s+)?q\s*uot(?:ation)?\s+)?(?:machine\s+model\s+unit\s+price\s+qty\s+amount\s+)?/i, "")
    .replace(/\b([A-Z])\s+([A-Z])\s+([A-Z])\s*-\s*(\d+)/g, "$1$2$3-$4")
    .replace(/\b([A-Z]{2,})\s*-\s*(\d+)/g, "$1-$2")
    .replace(/\s+\d[\d,.'’]*\s*$/, "");
  return description || cleanedValue(line);
}

function priceRows(sections: SemanticTextSection[]) {
  return sections.flatMap((section) => {
    const lines = sectionLines(section);
    let inQuotationTable = false;
    return lines.flatMap((line, lineIndex) => {
      if (/^(?:commercial\s+)?q\s*uot(?:ation)?$/i.test(line)
        || /(?:item\s*(?:no\.?|number).*product|\bmodel\b.*\bunit\s+price\b).*(?:qty|quantity|price)/i.test(line)
        || /\bunit\s+price\b.*\b(?:qty|quantity)\b/i.test(line)
        || /\b(?:qty|quantity)\b.*\b(?:amount|total|unit\s+price)\b/i.test(line)) inQuotationTable = true;
      const explicitAmounts = moneyTokens(line);
      const endsQuotationTable = (/^(?:total(?:\s+amount)?|grand total)\b/i.test(line) && explicitAmounts.length > 0) || /^(?:remarks?|payment(?:\s+terms?|\s+items?)?)\b/i.test(line);
      const tableNumbers = numericTokens(line);
      const currencylessNumberedRow = inQuotationTable && /^\d+[.)]?\s+/.test(line) && !/[A-Za-z]/.test(line) && explicitAmounts.length === 0 && tableNumbers.length >= 4;
      const amounts = currencylessNumberedRow ? tableNumbers.slice(-2) : explicitAmounts;
      const quantity = commercialQuantity(line) ?? (currencylessNumberedRow ? tableNumbers.at(-3) : undefined);
      const tableCandidate = inQuotationTable && !endsQuotationTable && amounts.length >= 1 && Boolean(quantity);
      const legacyCandidate = amounts.length >= 2 && /\d/.test(line.slice(0, Math.max(1, line.search(/(?:USD|EUR|GBP|CNY|RMB|UZS|[$€£¥])/i))));
      if (endsQuotationTable) inQuotationTable = false;
      return tableCandidate || legacyCandidate ? [{ section, line, lineIndex, amounts, quantity, description: commercialDescription(lines, lineIndex, line), tableCandidate }] : [];
    });
  });
}

function workingCommercialRows(sections: SemanticTextSection[], pricedRows: ReturnType<typeof priceRows>) {
  const startsWithItemNumber = (line: string) => /^\d+[.)]?\s+/.test(line);
  const selected = new Set(pricedRows.filter((candidate) => startsWithItemNumber(candidate.line)));

  for (const section of sections) {
    const lines = sectionLines(section);
    const sectionRows = pricedRows.filter((candidate) => candidate.section === section);
    const unnumberedRows = sectionRows.filter((candidate) => !startsWithItemNumber(candidate.line));
    const standaloneNumbers = lines.map((line, lineIndex) => ({ line, lineIndex })).filter(({ line }) => /^\d+$/.test(line));

    if (!sectionRows.some((candidate) => startsWithItemNumber(candidate.line))) {
      sectionRows.filter((candidate) => candidate.tableCandidate).forEach((candidate) => selected.add(candidate));
    }

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

function parseDimensionsCm(line: string) {
  const normalizedLine = line.replace(/\bm\s+m\b/gi, "mm").replace(/\bc\s+m\b/gi, "cm");
  const match = normalizedLine.match(/(?:\bL(?:ength)?\s*)?([\d,.]+)\s*(?:mm|cm|m)?\s*[x×*]\s*(?:\bW(?:idth)?\s*)?([\d,.]+)\s*(?:mm|cm|m)?\s*[x×*]\s*(?:\bH(?:eight)?\s*)?([\d,.]+)\s*(mm|cm|m)\b/i);
  if (!match) return undefined;
  const factor = match[4].toLowerCase() === "mm" ? 0.1 : match[4].toLowerCase() === "m" ? 100 : 1;
  const values = [match[1], match[2], match[3]].map((value) => parseBusinessNumber(value));
  if (values.some((value) => value === undefined || value <= 0)) return undefined;
  return { length: values[0]! * factor, width: values[1]! * factor, height: values[2]! * factor };
}

function parseWeightKg(line: string) {
  const match = [...line.matchAll(/([\d][\d,.'’]*(?:\.\d+)?)\s*(kgs?|kilograms?|t|tons?|tonnes?)\b/gi)]
    .find((candidate) => !/-\s*$/.test(line.slice(0, candidate.index).trimEnd()));
  const value = parseBusinessNumber(match?.[1] ?? "");
  if (!value || value <= 0 || !match) return undefined;
  return /^(?:t|tons?|tonnes?)$/i.test(match[2]) ? value * 1_000 : value;
}

function extractPhysicalEvidence(sections: SemanticTextSection[]): DocumentPhysicalEvidence[] {
  const evidence: DocumentPhysicalEvidence[] = [];
  for (const section of sections) {
    const lines = sectionLines(section);
    for (const [lineIndex, line] of lines.entries()) {
      const adjacentContext = [lines[lineIndex - 1], line, lines[lineIndex + 1]].filter(Boolean).join(" ");
      const packingContext = /\b(?:pack(?:ed|ing|age|aging)?|case|crate|crating|wooden)\b/i.test(adjacentContext);
      const mayStartDimension = /[x×*]|\b(?:dimension|size)\b/i.test(line);
      const dimensionSourceText = parseDimensionsCm(line) ? line : mayStartDimension && parseDimensionsCm(`${line} ${lines[lineIndex + 1] ?? ""}`) ? `${line} ${lines[lineIndex + 1]}` : undefined;
      const dimensionsCm = dimensionSourceText ? parseDimensionsCm(dimensionSourceText) : undefined;
      if (dimensionsCm) {
        const role = packingContext ? "packed-dimensions" : "product-dimensions";
        evidence.push({
          id: `physical:${section.pageNumber ?? 0}:${lineIndex + 1}:${role}`,
          role,
          scope: packingContext ? "lot" : "line-item",
          dimensionsCm,
          sourceText: dimensionSourceText!,
          sourceRef: `${section.label} · ${packingContext ? "packed dimensions" : "equipment dimensions"}`,
          confidence: "high",
          basis: packingContext ? "Explicit packing/package dimensions." : "Explicit product/equipment envelope; retained only as a minimum fit constraint, not shipment packed cube.",
        });
      }
      const weightKg = parseWeightKg(line);
      if (weightKg) {
        const declaredTotal = /\btotal\s+weight\b/i.test(adjacentContext);
        const role = packingContext ? "packed-gross-weight" : declaredTotal ? "declared-total-weight" : "product-weight";
        evidence.push({
          id: `physical:${section.pageNumber ?? 0}:${lineIndex + 1}:${role}`,
          role,
          scope: packingContext ? "lot" : declaredTotal ? "shipment" : "line-item",
          weightKg,
          sourceText: line,
          sourceRef: `${section.label} · ${role.replaceAll("-", " ")}`,
          confidence: "high",
          basis: packingContext ? "Explicit packed/package gross weight." : declaredTotal ? "Explicit declared total weight; a lower bound until packed gross weight is confirmed." : "Explicit product/net/equipment weight; a lower bound, not packed gross weight.",
        });
      }
    }
  }
  return evidence;
}

function findIncotermNamedPlace(sections: SemanticTextSection[]) {
  for (const section of sections) {
    for (const line of sectionLines(section)) {
      const match = line.match(new RegExp(`\\b(${incotermPattern})\\b(?:\\s*\\(\\s*([^)]{2,100})\\s*\\)|\\s+([^\\n]{2,160}))`, "i"));
      if (!match) continue;
      const rawPlace = cleanedValue(match[2] ?? match[3] ?? "")
        .replace(/\s+\((?:sets?|pcs?|pieces?|units?)\).*$/i, "")
        .replace(/\s+(?:price|basis|terms?|by\s+(?:sea|air|road|rail))\b.*$/i, "")
        .replace(/[.,;:]+$/, "");
      const place = /^(?:amount|price|unit\s+price|total|terms?|qty|quantity|pcs|usd|eur|rmb|cny)$/i.test(rawPlace) ? undefined : rawPlace;
      const normalizedPlace = place && place === place.toUpperCase() ? place.toLowerCase().replace(/\b[a-z]/g, (character) => character.toUpperCase()) : place;
      return { term: match[1].toUpperCase(), place: normalizedPlace, sourceRef: section.label, line };
    }
  }
  return undefined;
}

export function extractSemanticBusinessFacts(sections: SemanticTextSection[]): SemanticExtraction {
  const row: Record<string, unknown> = {};
  const fieldSources: Record<string, string> = {};
  const fieldEvidence: Record<string, DocumentFieldEvidence> = {};
  const physicalEvidence = extractPhysicalEvidence(sections);
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
  const ancillaryCommercialRows = commercialRows.filter((candidate) => /\b(?:packing|packaging|crate|crating|wooden\s+case)\b/i.test(candidate.description));
  const cargoRows = commercialRows.filter((candidate) => !ancillaryCommercialRows.includes(candidate));
  const lineItemTotal = commercialRows.reduce((sum, candidate) => sum + (candidate.amounts.at(-1) ?? 0), 0);

  const explicitSupplier = findMatch(sections.slice(0, 2), [/^(?:supplier|seller|vendor|from)\s*[:–—-]\s*([^\n]{3,180})/im]);
  const headerCompany = firstLines.find((line) => /\b(?:CO\.?\s*,?\s*LTD\.?|LTD\.?|LLC|INC\.?|GMBH|S\.A\.?|PLC)\b/i.test(line) && !/^(?:to|customer|buyer|client)\b/i.test(line));
  const company = explicitSupplier?.value ?? headerCompany;
  if (company && firstSection) {
    const explicitOrigin = findMatch(sections.slice(0, 2), [/^(?:ship from|origin|place of dispatch|delivery place)\s*[:–—-]\s*([^\n]{2,100})/im]);
    const headerLocation = firstLines.slice(0, 16).filter((line) => !/\b(?:CO\.?\s*,?\s*LTD\.?|LTD\.?|LLC|INC\.?|GMBH|S\.A\.?|PLC)\b/i.test(line) && !/\b(?:FOB|CIF|CFR|price|payment|terms?)\b/i.test(line)).map(trailingCityCountry).find(Boolean);
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
  const suffixCurrencySection = sections.find((section) => new RegExp(`[\\d]\\s*(${currencyCodes})\\b`, "i").test(section.text));
  const suffixCurrency = suffixCurrencySection?.text.match(new RegExp(`[\\d]\\s*(${currencyCodes})\\b`, "i"));
  const currency = explicitCurrency ?? tableCurrency ?? (dollarSection ? { value: "USD", sourceRef: dollarSection.label } : suffixCurrencySection && suffixCurrency ? { value: suffixCurrency[1], sourceRef: suffixCurrencySection.label } : undefined);
  if (currency) write("currency", currency.value.toUpperCase(), { sourceRef: `${currency.sourceRef} · ${explicitCurrency ? "currency field" : tableCurrency ? "price-table heading" : dollarSection ? "currency symbol" : "currency suffix"}`, confidence: explicitCurrency || tableCurrency || suffixCurrency ? "high" : "medium", scope: "document", basis: explicitCurrency || tableCurrency || suffixCurrency ? "Currency explicitly labels the commercial amounts." : "USD inferred from repeated dollar-denominated commercial prices; client confirmation recommended." });

  const explicitTotal = findMatch(sections, [
    new RegExp(`^(?:grand total|quotation total|contract value|goods value|total amount|total value|total)\\s*[:–—-]?\\s*(?:(?:\\(\\s*(?:${currencyCodes})\\s*\\)|(?:${currencyCodes})|[$€£¥])\\s*)?([\\d][\\d,.'\\s]*(?:\\.\\d{1,2})?)`, "im"),
  ]);
  const finalStandaloneTotals = sections.slice(Math.max(0, sections.length - 3)).flatMap((section) => sectionLines(section)
    .map((line) => ({ section, line, amounts: moneyTokens(line) }))
    .filter((candidate) => candidate.amounts.length === 1 && new RegExp(`^(?:${currencyCodes}|[$€£¥])?\\s*[\\d,.' ]+(?:\\.\\d{1,2})?$`, "i").test(candidate.line)));
  const standaloneTotal = finalStandaloneTotals.at(-1);
  const printedTotalValue = explicitTotal ? parseBusinessNumber(explicitTotal.value) : standaloneTotal?.amounts[0];
  const calculatedLineItemTotal = commercialRows.length >= 1 && lineItemTotal > 0 ? lineItemTotal : undefined;
  const unconfirmedMultiRowBaseline = calculatedLineItemTotal !== undefined && printedTotalValue === undefined && commercialRows.length > 1;
  const totalValue = calculatedLineItemTotal ?? printedTotalValue;
  if (totalValue !== undefined) {
    const totalSource = explicitTotal?.sourceRef ?? standaloneTotal?.section.label ?? sections.at(-1)?.label ?? "document";
    const reconciled = printedTotalValue !== undefined && calculatedLineItemTotal !== undefined && Math.abs(calculatedLineItemTotal - printedTotalValue) <= 0.01;
    write("contract_value", totalValue, {
      sourceRef: calculatedLineItemTotal !== undefined ? `${pageRangeLabel} · calculated from ${commercialRows.length} primary commercial lines${reconciled ? " · reconciled to printed total" : ""}` : `${totalSource} · ${explicitTotal ? "labelled commercial total" : "final quotation total"}`,
      confidence: unconfirmedMultiRowBaseline ? "medium" : "high",
      scope: "document",
      basis: calculatedLineItemTotal !== undefined ? `Working commercial baseline is the independently calculated sum of ${commercialRows.length} primary commercial lines.${pricedRows.length > commercialRows.length ? ` ${pricedRows.length - commercialRows.length} subordinate priced subline(s) remain preserved as evidence but are excluded from the baseline to avoid double counting parent-item accessories.` : ""}${printedTotalValue !== undefined && !reconciled ? ` Supplier printed total differs by ${Math.abs(printedTotalValue - calculatedLineItemTotal).toFixed(2)}.` : ""}` : "Final document-level commercial total; item reconciliation was not available.",
    });
  }

  if (calculatedLineItemTotal !== undefined && printedTotalValue !== undefined && Math.abs(calculatedLineItemTotal - printedTotalValue) > 0.01) warnings.push({
    code: "COMMERCIAL_TOTAL_DISCREPANCY",
    severity: "warning",
    message: `Calculated line-item value ${calculatedLineItemTotal.toFixed(2)} differs from the supplier's printed total ${printedTotalValue.toFixed(2)} by ${Math.abs(printedTotalValue - calculatedLineItemTotal).toFixed(2)}. The line-item total is used as the working baseline unless the client overrides it.`,
  });
  if (unconfirmedMultiRowBaseline) warnings.push({
    code: "UNCONFIRMED_MULTI_ROW_BASELINE",
    severity: "warning",
    message: `The document has ${commercialRows.length} priced rows but no printed commercial total. ${calculatedLineItemTotal.toFixed(2)} is the arithmetic sum only if every priced row is ordered; confirm that the rows are not alternatives before approval.`,
  });

  if (pricedRows.length >= 1) row.commercial_items = pricedRows.map((candidate, index) => ({
    id: `document-line-${index + 1}`,
    sourceRef: candidate.section.label,
    rawLine: candidate.description,
    quantity: candidate.quantity,
    lineTotal: candidate.amounts.at(-1),
    workingBaselineIncluded: commercialRows.includes(candidate),
  }));

  if (pricedRows.length > commercialRows.length) warnings.push({
    code: "SUBORDINATE_PRICED_LINES_EXCLUDED",
    severity: "warning",
    message: `${pricedRows.length - commercialRows.length} subordinate priced subline(s) were preserved in the extracted item evidence but excluded from the independently calculated commercial baseline to avoid double counting parent-item accessories. Client review remains available.`,
  });

  const namedTerm = findIncotermNamedPlace(sections);
  const explicitTerm = findMatch(sections, [new RegExp(`^(?:current|existing|source)?\\s*incoterm(?:s)?(?:®)?(?:\\s+2020)?\\s*[:–—-]\\s*(${incotermPattern})\\b`, "im")]);
  const contextualTerm = findMatch(sections, [
    new RegExp(`^(?:[^\\n]{0,80}\\b(?:prices?|pricing|terms?)\\b[^\\n]{0,80})\\b(${incotermPattern})\\b[^\\n]{0,100}(?:shipping|freight|cost|basis)?`, "im"),
    new RegExp(`^([^\\n]{0,1})(${incotermPattern})\\b[^\\n]{0,100}(?:without|excluding|included|shipping|freight|price)`, "im"),
  ]);
  const termValue = explicitTerm?.value ?? namedTerm?.term ?? contextualTerm?.value.match(new RegExp(`\\b(${incotermPattern})\\b`, "i"))?.[1];
  const termSource = explicitTerm?.sourceRef ?? namedTerm?.sourceRef ?? contextualTerm?.sourceRef;
  if (termValue && termSource) write("current_incoterm", termValue.toUpperCase(), { sourceRef: `${termSource} · ${explicitTerm ? "Incoterm field" : "commercial pricing note"}`, confidence: "high", scope: "document", basis: "Commercial price basis explicitly states the Incoterm." });
  if (namedTerm?.place) write("source_named_place", namedTerm.place, { sourceRef: `${namedTerm.sourceRef} · named place attached to ${namedTerm.term}`, confidence: "high", scope: "document", basis: "Incoterm named place extracted independently from the supplier's address." });

  const shipmentVolume = findMatch(sections, [
    /^(?:total\s+)?(?:shipment|cargo|packed|packing)\s+(?:packed\s+)?volume\s*(?:\(?(?:m3|m³|cbm)\)?)?\s*[:–—-]\s*([\d,.]+)/im,
    /^(?:total\s+)?(?:cbm|cubic metres?)\s*[:–—-]\s*([\d,.]+)/im,
  ]);
  const shipmentWeight = findMatch(sections, [
    /^(?:total\s+gross\s+weight|(?:shipment|cargo|consignment|packing)\s+(?:gross\s+)?weight)\s*(?:\(?(?:kg|kgs|kilograms?)\)?)?\s*[:–—-]\s*([\d,.]+)/im,
  ]);
  if (shipmentVolume) write("packed_volume_m3", parseBusinessNumber(shipmentVolume.value), { sourceRef: `${shipmentVolume.sourceRef} · shipment-level packed volume`, confidence: "high", scope: "shipment", basis: "Explicit shipment/packing total; product capacities and dimensions are excluded." });
  if (shipmentWeight) write("gross_weight_kg", parseBusinessNumber(shipmentWeight.value), { sourceRef: `${shipmentWeight.sourceRef} · shipment-level gross weight`, confidence: "high", scope: "shipment", basis: "Explicit shipment/packing total; individual equipment weights are excluded." });

  if (cargoRows.length >= 1) {
    write("line_count", cargoRows.length, { sourceRef: `${pageRangeLabel} · priced item table`, confidence: "high", scope: "document", basis: `${cargoRows.length} priced cargo row${cargoRows.length === 1 ? "" : "s"} detected; separately priced packing/service rows are excluded from cargo count but retained in the commercial baseline.` });
    const totalCargoQuantity = cargoRows.reduce((sum, candidate) => sum + (candidate.quantity ?? 0), 0);
    if (totalCargoQuantity > 0) write("quantity_package_count", `${totalCargoQuantity} item unit${totalCargoQuantity === 1 ? "" : "s"} across ${cargoRows.length} priced cargo row${cargoRows.length === 1 ? "" : "s"}`, { sourceRef: `${pageRangeLabel} · calculated from priced cargo rows`, confidence: unconfirmedMultiRowBaseline ? "medium" : "high", scope: "document", basis: `Exact commercial item quantity from the priced rows; this is not a package count and is never used as packed-cargo evidence without a per-unit packing basis.` });
    const matchedCategories = categoryRules.filter(({ pattern }) => (allText.match(pattern) ?? []).length >= 2).map(({ label }) => label).slice(0, 3);
    const cargoCategory = matchedCategories.length ? `${joinCategories(matchedCategories)} equipment` : "mixed commercial goods";
    const value = cargoRows.length === 1 ? cargoRows[0].description : `${cargoCategory.charAt(0).toUpperCase()}${cargoCategory.slice(1)} — ${cargoRows.length} line-item ${documentType === "unknown" ? "document" : documentType.replaceAll("-", " ")}`;
    write("cargo_description", value, { sourceRef: `${pageRangeLabel} · derived from the priced item table`, confidence: cargoRows.length === 1 ? "high" : "medium", scope: "document", basis: cargoRows.length === 1 ? "Single priced cargo description preserved from the quotation table." : `Transaction-level cargo category synthesized from ${cargoRows.length} priced cargo rows.` });
  }

  if (ancillaryCommercialRows.length) {
    const sourcePackingAmount = ancillaryCommercialRows.reduce((sum, candidate) => sum + (candidate.amounts.at(-1) ?? 0), 0);
    write("export_packing_amount", sourcePackingAmount, { sourceRef: `${pageRangeLabel} · separately priced packing row`, confidence: "high", scope: "document", basis: "Packing/crating is separately priced and already included in the source commercial baseline; it must not be added again without an explicit reinforcement requirement." });
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
  const shipmentMetricsFound = Boolean(shipmentVolume || shipmentWeight || physicalEvidence.some((item) => item.role === "packed-dimensions" || item.role === "packed-gross-weight"));
  const suppressedLineItemMetricCount = Math.max(0, metricSpecificationLines.length - Number(Boolean(shipmentVolume)) - Number(Boolean(shipmentWeight)));
  if (suppressedLineItemMetricCount) warnings.push({ code: "LINE_ITEM_METRICS_TYPED", severity: "info", message: `${physicalEvidence.length} physical source fact${physicalEvidence.length === 1 ? " was" : "s were"} preserved separately as equipment/packing constraints; product dimensions and weights were not relabelled as shipment packed metrics.` });

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

  return { row, fieldSources, fieldEvidence, physicalEvidence, profile, warnings };
}

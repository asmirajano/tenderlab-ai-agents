/** Shared, UI-agnostic balance-sheet review engine for TenderBalance. */
export const BALANCE_SHEET_SCHEMA_VERSION = "1.0.0";

export type DocumentLanguage = "en" | "ru" | "uz" | "und";
export type ExtractionMethod = "digital-text" | "ocr" | "manual-transcription";
export type ReviewStatus = "unreviewed" | "needs-review" | "corrected" | "approved";
export type StatementStatus = "draft" | "needs-review" | "approved";
export type IssueSeverity = "info" | "warning" | "error" | "blocking";
export type BalanceSheetConcept =
  | "total_assets"
  | "total_liabilities"
  | "owners_equity"
  | "net_assets"
  | "current_assets"
  | "current_liabilities"
  | "cash_and_cash_equivalents"
  | "trade_receivables"
  | "inventories"
  | "other_current_assets"
  | "property_plant_equipment"
  | "intangible_assets"
  | "other_non_current_assets"
  | "trade_payables"
  | "short_term_borrowings"
  | "other_current_liabilities"
  | "long_term_borrowings"
  | "other_non_current_liabilities"
  | "share_capital"
  | "retained_earnings"
  | "other_equity"
  | "unmapped";

export type BalanceSheetClassification =
  | "asset"
  | "current_asset"
  | "non_current_asset"
  | "liability"
  | "current_liability"
  | "non_current_liability"
  | "equity"
  | "unclassified";

export type SourcePageInput = {
  pageNumber: number;
  text?: string;
  extractionMethod?: ExtractionMethod;
  confidence?: number;
  missing?: boolean;
  imageOnly?: boolean;
};

export type SourceDocumentInput = {
  documentId: string;
  fileName: string;
  mimeType: string;
  sha256: string;
  pageCount: number;
  expectedPageCount?: number;
  synthetic?: boolean;
};

export type ReportedValueInput = {
  period: string;
  raw: string;
  value?: number | null;
  confidence?: number;
  columnIndex?: number;
};

export type LineItemInput = {
  id?: string;
  page: number;
  originalLabel: string;
  concept?: BalanceSheetConcept;
  classification?: BalanceSheetClassification;
  isTotal?: boolean;
  values: ReportedValueInput[];
  extractionMethod?: ExtractionMethod;
  confidence?: number;
};

export type BalanceSheetInput = {
  source: SourceDocumentInput;
  pages: SourcePageInput[];
  reportingEntity?: string;
  reportingDate?: string;
  periods?: string[];
  currency?: string;
  unitLabel?: string;
  unitScale?: number;
  language?: DocumentLanguage;
  lineItems?: LineItemInput[];
};

export type SourceReference = {
  documentId: string;
  fileName: string;
  page: number;
  originalLabel: string;
  period: string;
  columnIndex: number;
  extractionMethod: ExtractionMethod;
  confidence: number;
};

export type LineItemValue = {
  period: string;
  rawReportedValue: string;
  reportedValue: number | null;
  normalizedValue: number | null;
  correction?: {
    correctedReportedValue: number;
    correctedNormalizedValue: number;
    reason: string;
    reviewer: string;
    at: string;
  };
  source: SourceReference;
};

export type BalanceSheetLineItem = {
  id: string;
  originalLabel: string;
  normalizedConcept: BalanceSheetConcept;
  classification: BalanceSheetClassification;
  isTotal: boolean;
  values: LineItemValue[];
  confidence: number;
  reviewStatus: ReviewStatus;
};

export type ReviewIssue = {
  id: string;
  code:
    | "MISSING_PAGE"
    | "OCR_REQUIRED"
    | "OCR_LOW_CONFIDENCE"
    | "STATEMENT_PAGE_NOT_FOUND"
    | "REQUIRED_TOTAL_MISSING"
    | "ACCOUNTING_EQUATION_MISMATCH"
    | "NET_ASSETS_MISMATCH"
    | "SUBTOTAL_MISMATCH"
    | "SIGN_ANOMALY"
    | "CLASSIFICATION_ANOMALY"
    | "COMPARATIVE_PERIOD_DISCREPANCY"
    | "OPENING_CLOSING_INCONSISTENCY";
  severity: IssueSeverity;
  message: string;
  period?: string;
  lineItemId?: string;
  difference?: number;
  sourceRefs: SourceReference[];
};

export type ArithmeticCheck = {
  id: string;
  period: string;
  formula: "assets = liabilities + equity" | "net assets = assets - liabilities" | "subtotal = underlying lines";
  leftValue: number | null;
  rightValue: number | null;
  difference: number | null;
  status: "passed" | "failed" | "not-testable";
  inputs: Array<{ concept: BalanceSheetConcept; value: number | null; lineItemId?: string }>;
};

export type AuditEvent = {
  id: string;
  action: "created" | "corrected" | "line-approved" | "statement-approved" | "approval-revoked";
  actor: string;
  at: string;
  detail: string;
};

export type BalanceSheetReview = {
  schemaVersion: typeof BALANCE_SHEET_SCHEMA_VERSION;
  reviewId: string;
  capability: {
    disposition: "EXISTING AGENT — SPECIALIZED CAPABILITY";
    ownerAgentId: "agent:TL-A008";
    ownerAgentName: "Company Verification Agent";
    supportingAgentIds: string[];
  };
  source: SourceDocumentInput;
  pages: SourcePageInput[];
  statement: {
    reportingEntity: string;
    reportingDate: string;
    periods: string[];
    currency: string;
    unitLabel: string;
    unitScale: number;
    language: DocumentLanguage;
  };
  lineItems: BalanceSheetLineItem[];
  arithmeticChecks: ArithmeticCheck[];
  issues: ReviewIssue[];
  review: {
    status: StatementStatus;
    reviewer?: string;
    approvedAt?: string;
    auditTrail: AuditEvent[];
  };
};

export type RecordComparison = {
  leftReviewId: string;
  rightReviewId: string;
  overlaps: Array<{
    period: string;
    concept: BalanceSheetConcept;
    leftValue: number;
    rightValue: number;
    difference: number;
    matches: boolean;
  }>;
  issues: ReviewIssue[];
};

const conceptRules: Array<{
  concept: BalanceSheetConcept;
  classification: BalanceSheetClassification;
  isTotal?: boolean;
  patterns: RegExp[];
}> = [
  { concept: "total_assets", classification: "asset", isTotal: true, patterns: [/^total assets$/i, /^assets total$/i, /^итого активы?$/i, /^баланс.*актив/i, /^jami aktivlar$/i] },
  { concept: "total_liabilities", classification: "liability", isTotal: true, patterns: [/^total liabilities$/i, /^итого обязательств/i, /^jami majburiyatlar$/i] },
  { concept: "owners_equity", classification: "equity", isTotal: true, patterns: [/^(total )?(owners.?|shareholders.?)?\s*equity$/i, /^капитал( и резервы)?$/i, /^собственный капитал$/i, /^jami xususiy kapital$/i] },
  { concept: "net_assets", classification: "equity", isTotal: true, patterns: [/^net assets$/i, /^чистые активы$/i, /^sof aktivlar$/i] },
  { concept: "current_assets", classification: "current_asset", isTotal: true, patterns: [/^total current assets$/i, /^current assets$/i, /^оборотные активы$/i, /^jami joriy aktivlar$/i] },
  { concept: "current_liabilities", classification: "current_liability", isTotal: true, patterns: [/^total current liabilities$/i, /^current liabilities$/i, /^краткосрочные обязательства$/i, /^jami joriy majburiyatlar$/i] },
  { concept: "cash_and_cash_equivalents", classification: "current_asset", patterns: [/cash( and cash equivalents)?/i, /денежн/i, /pul mablag/i] },
  { concept: "trade_receivables", classification: "current_asset", patterns: [/trade (and other )?receivables/i, /accounts receivable/i, /дебитор/i, /debitor/i] },
  { concept: "inventories", classification: "current_asset", patterns: [/inventor/i, /запас/i, /tovar.?moddiy/i] },
  { concept: "other_current_assets", classification: "current_asset", patterns: [/other current assets/i, /прочие оборотные/i, /boshqa joriy aktiv/i] },
  { concept: "property_plant_equipment", classification: "non_current_asset", patterns: [/property.*plant.*equipment/i, /fixed assets/i, /основные средства/i, /asosiy vositalar/i] },
  { concept: "intangible_assets", classification: "non_current_asset", patterns: [/intangible assets/i, /нематериальные активы/i, /nomoddiy aktivlar/i] },
  { concept: "other_non_current_assets", classification: "non_current_asset", patterns: [/other non.?current assets/i, /прочие внеоборотные/i, /boshqa uzoq muddatli aktiv/i] },
  { concept: "trade_payables", classification: "current_liability", patterns: [/trade (and other )?payables/i, /accounts payable/i, /кредитор/i, /kreditor/i] },
  { concept: "short_term_borrowings", classification: "current_liability", patterns: [/short.?term borrow/i, /current borrow/i, /краткосрочн.*за[её]м/i, /qisqa muddatli qarz/i] },
  { concept: "other_current_liabilities", classification: "current_liability", patterns: [/other current liabilities/i, /прочие краткосрочные/i, /boshqa joriy majburiyat/i] },
  { concept: "long_term_borrowings", classification: "non_current_liability", patterns: [/long.?term borrow/i, /non.?current borrow/i, /долгосрочн.*за[её]м/i, /uzoq muddatli qarz/i] },
  { concept: "other_non_current_liabilities", classification: "non_current_liability", patterns: [/other non.?current liabilities/i, /прочие долгосрочные/i, /boshqa uzoq muddatli majburiyat/i] },
  { concept: "share_capital", classification: "equity", patterns: [/share capital/i, /уставн.*капитал/i, /ustav kapital/i] },
  { concept: "retained_earnings", classification: "equity", patterns: [/retained earnings/i, /accumulated (loss|profit)/i, /нераспределенн.*прибыл/i, /непокрыт.*убыт/i, /taqsimlanmagan/i] },
  { concept: "other_equity", classification: "equity", patterns: [/other (reserves|equity)/i, /прочие резервы/i, /boshqa kapital/i] },
];

const requiredConcepts: BalanceSheetConcept[] = [
  "total_assets",
  "total_liabilities",
  "owners_equity",
  "current_assets",
  "current_liabilities",
];

const statementPatterns = [/balance sheet/i, /statement of financial position/i, /бухгалтерский баланс/i, /баланс/i, /moliyaviy holat/i];

function cleanLabel(label: string) {
  return label.replace(/^\s*\d+[.)]?\s*/, "").replace(/\s+/g, " ").trim();
}

export function normalizeConcept(label: string) {
  const cleaned = cleanLabel(label);
  const rule = conceptRules.find((candidate) => candidate.patterns.some((pattern) => pattern.test(cleaned)));
  return {
    concept: rule?.concept ?? "unmapped" as BalanceSheetConcept,
    classification: rule?.classification ?? "unclassified" as BalanceSheetClassification,
    isTotal: rule?.isTotal ?? false,
  };
}

export function parseReportedNumber(raw: string): number | null {
  const trimmed = raw.trim();
  if (!trimmed || /^(?:—|–|-|n\/a)$/i.test(trimmed)) return null;
  const negative = /^\(.*\)$/.test(trimmed) || /^[-−]/.test(trimmed);
  let token = trimmed.replace(/[()\s\u00a0'’]/g, "").replace(/^[-−]/, "").replace(/[^\d.,]/g, "");
  if (!token) return null;
  const lastComma = token.lastIndexOf(",");
  const lastDot = token.lastIndexOf(".");
  if (lastComma >= 0 && lastDot >= 0) {
    const decimal = lastComma > lastDot ? "," : ".";
    const grouping = decimal === "," ? /\./g : /,/g;
    token = token.replace(grouping, "").replace(decimal, ".");
  } else if (lastComma >= 0) {
    const decimals = token.length - lastComma - 1;
    token = decimals === 2 ? token.replace(",", ".") : token.replace(/,/g, "");
  } else if (lastDot >= 0) {
    const decimals = token.length - lastDot - 1;
    if (decimals === 3 && /^\d{1,3}(?:\.\d{3})+$/.test(token)) token = token.replace(/\./g, "");
  }
  const value = Number(token);
  return Number.isFinite(value) ? (negative ? -value : value) : null;
}

function detectLanguage(text: string): DocumentLanguage {
  if (/[ўқғҳ]/i.test(text)) return "uz";
  if (/[а-яё]/i.test(text)) return "ru";
  if (/[a-z]/i.test(text)) return "en";
  return "und";
}

function detectCurrency(text: string) {
  if (/\b(?:USD|US dollars?)\b|\$/i.test(text)) return "USD";
  if (/\bEUR\b|€/i.test(text)) return "EUR";
  if (/\bUZS\b|сум|so['’]?m/i.test(text)) return "UZS";
  if (/\bRUB\b|руб/i.test(text)) return "RUB";
  if (/\bKZT\b|тенге/i.test(text)) return "KZT";
  if (/\bGBP\b|£/i.test(text)) return "GBP";
  if (/₾|\bGEL\b/i.test(text)) return "GEL";
  return "UNSPECIFIED";
}

function detectUnits(text: string) {
  if (/\b(?:million|millions|mln|млн)\b/i.test(text)) return { unitLabel: "millions", unitScale: 1_000_000 };
  if (/\b(?:thousand|thousands|тыс\.?|ming)\b/i.test(text)) return { unitLabel: "thousands", unitScale: 1_000 };
  return { unitLabel: "units", unitScale: 1 };
}

function detectPeriods(text: string) {
  const periods: string[] = [];
  for (const match of text.matchAll(/\b(?:19|20)\d{2}\b/g)) {
    if (!periods.includes(match[0])) periods.push(match[0]);
  }
  return periods.slice(0, 4);
}

function detectEntity(text: string) {
  const candidates = text.split(/\r?\n/).map((line) => line.trim()).filter(Boolean).slice(0, 16);
  return candidates.find((line) => /\b(?:ltd|llc|jsc|inc|plc|company|corp|mchj|ооо|ао)\b/i.test(line))
    ?? candidates.find((line) => !statementPatterns.some((pattern) => pattern.test(line)) && !/\b(?:19|20)\d{2}\b/.test(line))
    ?? "Unconfirmed reporting entity";
}

function inferClassification(concept: BalanceSheetConcept): BalanceSheetClassification {
  return conceptRules.find((rule) => rule.concept === concept)?.classification ?? "unclassified";
}

function inferIsTotal(concept: BalanceSheetConcept) {
  return conceptRules.find((rule) => rule.concept === concept)?.isTotal ?? false;
}

function parseLineItems(pages: SourcePageInput[], periods: string[]): LineItemInput[] {
  const items: LineItemInput[] = [];
  for (const page of pages) {
    if (page.missing || page.imageOnly || !page.text) continue;
    for (const sourceLine of page.text.split(/\r?\n/)) {
      const line = sourceLine.trim();
      if (!line) continue;
      const pipeParts = line.split(/\s*\|\s*|\t+/).filter(Boolean);
      let label = "";
      let rawValues: string[] = [];
      if (pipeParts.length >= 2) {
        label = pipeParts[0];
        rawValues = pipeParts.slice(1).filter((part) => parseReportedNumber(part) !== null || /^(?:—|–|-)$/.test(part));
      } else {
        const match = line.match(/^(.*?)\s+(\(?[-−]?\d[\d,.'’]*\)?|—|–|-)(?:\s+(\(?[-−]?\d[\d,.'’]*\)?|—|–|-))?\s*$/);
        if (match) {
          label = match[1];
          rawValues = [match[2], match[3]].filter((value): value is string => Boolean(value));
        }
      }
      if (!label || rawValues.length === 0) continue;
      const normalized = normalizeConcept(label);
      if (normalized.concept === "unmapped" && !/[a-zа-яўқғҳ]/i.test(label)) continue;
      const usedPeriods = periods.length ? periods : rawValues.map((_, index) => `column-${index + 1}`);
      items.push({
        page: page.pageNumber,
        originalLabel: cleanLabel(label),
        ...normalized,
        values: rawValues.slice(0, usedPeriods.length).map((raw, index) => ({
          period: usedPeriods[index] ?? `column-${index + 1}`,
          raw,
          value: parseReportedNumber(raw),
          confidence: page.confidence,
          columnIndex: index,
        })),
        extractionMethod: page.extractionMethod,
        confidence: page.confidence,
      });
    }
  }
  return items;
}

function sourceRefsFor(item: BalanceSheetLineItem | undefined, period?: string) {
  if (!item) return [];
  return item.values.filter((value) => !period || value.period === period).map((value) => value.source);
}

export function effectiveNormalizedValue(item: BalanceSheetLineItem | undefined, period: string) {
  const value = item?.values.find((candidate) => candidate.period === period);
  return value?.correction?.correctedNormalizedValue ?? value?.normalizedValue ?? null;
}

function firstConcept(items: BalanceSheetLineItem[], concept: BalanceSheetConcept) {
  return items.find((item) => item.normalizedConcept === concept);
}

function arithmetic(items: BalanceSheetLineItem[], periods: string[], unitScale: number) {
  const checks: ArithmeticCheck[] = [];
  const tolerance = Math.max(1, unitScale * 0.001);
  for (const period of periods) {
    const assetsItem = firstConcept(items, "total_assets");
    const liabilitiesItem = firstConcept(items, "total_liabilities");
    const equityItem = firstConcept(items, "owners_equity");
    const netAssetsItem = firstConcept(items, "net_assets");
    const assets = effectiveNormalizedValue(assetsItem, period);
    const liabilities = effectiveNormalizedValue(liabilitiesItem, period);
    const equity = effectiveNormalizedValue(equityItem, period);
    const equationRight = liabilities === null || equity === null ? null : liabilities + equity;
    const equationDifference = assets === null || equationRight === null ? null : assets - equationRight;
    checks.push({
      id: `check:equation:${period}`,
      period,
      formula: "assets = liabilities + equity",
      leftValue: assets,
      rightValue: equationRight,
      difference: equationDifference,
      status: equationDifference === null ? "not-testable" : Math.abs(equationDifference) <= tolerance ? "passed" : "failed",
      inputs: [
        { concept: "total_assets", value: assets, lineItemId: assetsItem?.id },
        { concept: "total_liabilities", value: liabilities, lineItemId: liabilitiesItem?.id },
        { concept: "owners_equity", value: equity, lineItemId: equityItem?.id },
      ],
    });
    const calculatedNetAssets = assets === null || liabilities === null ? null : assets - liabilities;
    const reportedNetAssets = netAssetsItem ? effectiveNormalizedValue(netAssetsItem, period) : equity;
    const netAssetsDifference = reportedNetAssets === null || calculatedNetAssets === null ? null : reportedNetAssets - calculatedNetAssets;
    checks.push({
      id: `check:net-assets:${period}`,
      period,
      formula: "net assets = assets - liabilities",
      leftValue: reportedNetAssets,
      rightValue: calculatedNetAssets,
      difference: netAssetsDifference,
      status: netAssetsDifference === null ? "not-testable" : Math.abs(netAssetsDifference) <= tolerance ? "passed" : "failed",
      inputs: [
        { concept: netAssetsItem ? "net_assets" : "owners_equity", value: reportedNetAssets, lineItemId: (netAssetsItem ?? equityItem)?.id },
        { concept: "total_assets", value: assets, lineItemId: assetsItem?.id },
        { concept: "total_liabilities", value: liabilities, lineItemId: liabilitiesItem?.id },
      ],
    });

    const subtotalSpecs: Array<[BalanceSheetConcept, BalanceSheetClassification]> = [
      ["current_assets", "current_asset"],
      ["current_liabilities", "current_liability"],
    ];
    for (const [concept, classification] of subtotalSpecs) {
      const subtotalItem = firstConcept(items, concept);
      const subtotal = effectiveNormalizedValue(subtotalItem, period);
      const components = items.filter((item) => item.classification === classification && !item.isTotal);
      const componentValues = components.map((item) => effectiveNormalizedValue(item, period)).filter((value): value is number => value !== null);
      const componentSum = componentValues.length ? componentValues.reduce((sum, value) => sum + value, 0) : null;
      const difference = subtotal === null || componentSum === null ? null : subtotal - componentSum;
      checks.push({
        id: `check:subtotal:${concept}:${period}`,
        period,
        formula: "subtotal = underlying lines",
        leftValue: subtotal,
        rightValue: componentSum,
        difference,
        status: difference === null ? "not-testable" : Math.abs(difference) <= tolerance ? "passed" : "failed",
        inputs: [
          { concept, value: subtotal, lineItemId: subtotalItem?.id },
          ...components.map((item) => ({ concept: item.normalizedConcept, value: effectiveNormalizedValue(item, period), lineItemId: item.id })),
        ],
      });
    }
  }
  return checks;
}

function validate(review: Omit<BalanceSheetReview, "issues" | "arithmeticChecks">) {
  const issues: ReviewIssue[] = [];
  const arithmeticChecks = arithmetic(review.lineItems, review.statement.periods, review.statement.unitScale);
  const sourceRef = (lineItemId?: string, period?: string) => sourceRefsFor(review.lineItems.find((item) => item.id === lineItemId), period);
  const expectedPages = review.source.expectedPageCount ?? review.source.pageCount;
  const presentPages = new Set(review.pages.filter((page) => !page.missing).map((page) => page.pageNumber));
  const missingNumbers = Array.from({ length: expectedPages }, (_, index) => index + 1).filter((page) => !presentPages.has(page));
  if (missingNumbers.length) {
    issues.push({ id: "issue:missing-pages", code: "MISSING_PAGE", severity: "blocking", message: `Missing expected page(s): ${missingNumbers.join(", ")}.`, sourceRefs: [] });
  }
  const imageOnlyPages = review.pages.filter((page) => page.imageOnly);
  if (imageOnlyPages.length) {
    issues.push({ id: "issue:ocr-required", code: "OCR_REQUIRED", severity: "blocking", message: `Page(s) ${imageOnlyPages.map((page) => page.pageNumber).join(", ")} contain no usable text layer; OCR or manual transcription is required.`, sourceRefs: [] });
  }
  const lowConfidencePages = review.pages.filter((page) => page.confidence !== undefined && page.confidence < 0.8);
  if (lowConfidencePages.length) {
    issues.push({ id: "issue:low-confidence-pages", code: "OCR_LOW_CONFIDENCE", severity: "warning", message: `Low-confidence extraction on page(s) ${lowConfidencePages.map((page) => page.pageNumber).join(", ")}; confirm affected values manually.`, sourceRefs: review.lineItems.flatMap((item) => item.values.filter((value) => lowConfidencePages.some((page) => page.pageNumber === value.source.page)).map((value) => value.source)) });
  }
  const allText = review.pages.map((page) => page.text ?? "").join("\n");
  if (!statementPatterns.some((pattern) => pattern.test(allText)) && review.lineItems.length === 0) {
    issues.push({ id: "issue:statement-page", code: "STATEMENT_PAGE_NOT_FOUND", severity: "blocking", message: "No balance-sheet or statement-of-financial-position page was identified.", sourceRefs: [] });
  }
  for (const concept of requiredConcepts) {
    if (!firstConcept(review.lineItems, concept)) {
      issues.push({ id: `issue:missing:${concept}`, code: "REQUIRED_TOTAL_MISSING", severity: "blocking", message: `Required balance-sheet concept is missing: ${concept}.`, sourceRefs: [] });
    }
  }
  for (const check of arithmeticChecks) {
    if (check.status !== "failed") continue;
    const lineRefs = check.inputs.flatMap((input) => sourceRef(input.lineItemId, check.period));
    issues.push({
      id: `issue:${check.id}`,
      code: check.formula === "assets = liabilities + equity" ? "ACCOUNTING_EQUATION_MISMATCH" : check.formula === "net assets = assets - liabilities" ? "NET_ASSETS_MISMATCH" : "SUBTOTAL_MISMATCH",
      severity: check.formula === "subtotal = underlying lines" ? "warning" : "blocking",
      message: `${check.formula} differs by ${check.difference?.toLocaleString("en-US") ?? "an unknown amount"} for ${check.period}. Reported figures were not changed.`,
      period: check.period,
      difference: check.difference ?? undefined,
      sourceRefs: lineRefs,
    });
  }
  for (const item of review.lineItems) {
    if (item.normalizedConcept === "unmapped") {
      issues.push({ id: `issue:classification:${item.id}`, code: "CLASSIFICATION_ANOMALY", severity: "warning", message: `Original label “${item.originalLabel}” is not mapped to a normalized concept.`, lineItemId: item.id, sourceRefs: sourceRefsFor(item) });
    }
    for (const value of item.values) {
      const effective = value.correction?.correctedNormalizedValue ?? value.normalizedValue;
      if (effective !== null && effective < 0 && item.isTotal && item.normalizedConcept !== "owners_equity" && item.normalizedConcept !== "net_assets") {
        issues.push({ id: `issue:sign:${item.id}:${value.period}`, code: "SIGN_ANOMALY", severity: "warning", message: `Negative total reported for ${item.normalizedConcept} in ${value.period}; verify the sign convention.`, period: value.period, lineItemId: item.id, sourceRefs: [value.source] });
      }
    }
  }
  return { arithmeticChecks, issues };
}

function lineItemFromInput(input: LineItemInput, source: SourceDocumentInput, unitScale: number, index: number): BalanceSheetLineItem {
  const normalized = input.concept ? { concept: input.concept, classification: input.classification ?? inferClassification(input.concept), isTotal: input.isTotal ?? inferIsTotal(input.concept) } : normalizeConcept(input.originalLabel);
  const extractionMethod = input.extractionMethod ?? "digital-text";
  const confidence = input.confidence ?? Math.min(...input.values.map((value) => value.confidence ?? 0.98));
  return {
    id: input.id ?? `line:${source.documentId}:${index + 1}`,
    originalLabel: input.originalLabel,
    normalizedConcept: normalized.concept,
    classification: input.classification ?? normalized.classification,
    isTotal: input.isTotal ?? normalized.isTotal,
    confidence,
    reviewStatus: confidence < 0.8 ? "needs-review" : "unreviewed",
    values: input.values.map((value, valueIndex) => {
      const reportedValue = value.value === undefined ? parseReportedNumber(value.raw) : value.value;
      return {
        period: value.period,
        rawReportedValue: value.raw,
        reportedValue,
        normalizedValue: reportedValue === null ? null : reportedValue * unitScale,
        source: {
          documentId: source.documentId,
          fileName: source.fileName,
          page: input.page,
          originalLabel: input.originalLabel,
          period: value.period,
          columnIndex: value.columnIndex ?? valueIndex,
          extractionMethod,
          confidence: value.confidence ?? confidence,
        },
      };
    }),
  };
}

export function buildBalanceSheetReview(input: BalanceSheetInput): BalanceSheetReview {
  const allText = input.pages.map((page) => page.text ?? "").join("\n");
  const periods = input.periods?.length ? input.periods : detectPeriods(allText);
  const units = detectUnits(allText);
  const unitScale = input.unitScale ?? units.unitScale;
  const parsedItems = input.lineItems?.length ? input.lineItems : parseLineItems(input.pages, periods);
  const lineItems = parsedItems.map((item, index) => lineItemFromInput(item, input.source, unitScale, index));
  const base: Omit<BalanceSheetReview, "issues" | "arithmeticChecks"> = {
    schemaVersion: BALANCE_SHEET_SCHEMA_VERSION,
    reviewId: `bs-review:${input.source.documentId}`,
    capability: {
      disposition: "EXISTING AGENT — SPECIALIZED CAPABILITY",
      ownerAgentId: "agent:TL-A008",
      ownerAgentName: "Company Verification Agent",
      supportingAgentIds: ["agent:TL-A002", "agent:TL-A003", "agent:TL-A004", "agent:TL-A022"],
    },
    source: input.source,
    pages: input.pages,
    statement: {
      reportingEntity: input.reportingEntity ?? detectEntity(allText),
      reportingDate: input.reportingDate ?? periods[0] ?? "Unconfirmed",
      periods,
      currency: input.currency ?? detectCurrency(allText),
      unitLabel: input.unitLabel ?? units.unitLabel,
      unitScale,
      language: input.language ?? detectLanguage(allText),
    },
    lineItems,
    review: {
      status: "draft",
      auditTrail: [{ id: `audit:${input.source.documentId}:created`, action: "created", actor: "Balance Sheet Digitization capability", at: "2026-08-26T00:00:00.000Z", detail: "Review record created from supplied source without altering reported figures." }],
    },
  };
  const validated = validate(base);
  return { ...base, ...validated, review: { ...base.review, status: validated.issues.some((issue) => issue.severity === "blocking" || issue.severity === "error") ? "needs-review" : "draft" } };
}

function revalidate(review: BalanceSheetReview): BalanceSheetReview {
  const validated = validate(review);
  const hasBlocking = validated.issues.some((issue) => issue.severity === "blocking" || issue.severity === "error");
  return { ...review, ...validated, review: { ...review.review, status: review.review.status === "approved" && !hasBlocking ? "approved" : hasBlocking ? "needs-review" : "draft" } };
}

export function correctLineItemValue(review: BalanceSheetReview, lineItemId: string, period: string, correctedReportedValue: number, reason: string, reviewer: string, at = new Date().toISOString()): BalanceSheetReview {
  const lineItems = review.lineItems.map((item) => item.id !== lineItemId ? item : {
    ...item,
    reviewStatus: "corrected" as const,
    values: item.values.map((value) => value.period !== period ? value : {
      ...value,
      correction: {
        correctedReportedValue,
        correctedNormalizedValue: correctedReportedValue * review.statement.unitScale,
        reason,
        reviewer,
        at,
      },
    }),
  });
  return revalidate({
    ...review,
    lineItems,
    review: {
      status: "draft",
      auditTrail: [...review.review.auditTrail, { id: `audit:${lineItemId}:${period}:${at}`, action: "corrected", actor: reviewer, at, detail: `${lineItemId} ${period} corrected to ${correctedReportedValue}; source value preserved. Reason: ${reason}` }],
    },
  });
}

export function approveLineItem(review: BalanceSheetReview, lineItemId: string, reviewer: string, at = new Date().toISOString()): BalanceSheetReview {
  return {
    ...review,
    lineItems: review.lineItems.map((item) => item.id === lineItemId ? { ...item, reviewStatus: item.reviewStatus === "corrected" ? "corrected" as const : "approved" as const } : item),
    review: {
      ...review.review,
      auditTrail: [...review.review.auditTrail, { id: `audit:${lineItemId}:approved:${at}`, action: "line-approved" as const, actor: reviewer, at, detail: `${lineItemId} inspected and approved.` }],
    },
  };
}

export function approveEligibleLineItems(review: BalanceSheetReview, reviewer: string, at = new Date().toISOString()): BalanceSheetReview {
  return review.lineItems.reduce((current, item) => item.confidence >= 0.8 && item.reviewStatus === "unreviewed" ? approveLineItem(current, item.id, reviewer, at) : current, review);
}

export function canApproveStatement(review: BalanceSheetReview) {
  const hasBlocking = review.issues.some((issue) => issue.severity === "blocking" || issue.severity === "error");
  const hasUnreviewedValues = review.lineItems.some((item) => !["approved", "corrected"].includes(item.reviewStatus));
  return !hasBlocking && review.lineItems.length > 0 && !hasUnreviewedValues;
}

export function approveStatement(review: BalanceSheetReview, reviewer: string, at = new Date().toISOString()): BalanceSheetReview {
  if (!canApproveStatement(review)) return review;
  return {
    ...review,
    review: {
      status: "approved",
      reviewer,
      approvedAt: at,
      auditTrail: [...review.review.auditTrail, { id: `audit:${review.reviewId}:approved:${at}`, action: "statement-approved", actor: reviewer, at, detail: "All extracted values reviewed; statement approved for downstream use. Approval is not a tender eligibility decision." }],
    },
  };
}

export function compareBalanceSheetReviews(left: BalanceSheetReview, right: BalanceSheetReview): RecordComparison {
  const overlaps: RecordComparison["overlaps"] = [];
  const issues: ReviewIssue[] = [];
  const sharedPeriods = left.statement.periods.filter((period) => right.statement.periods.includes(period));
  const concepts = Array.from(new Set(left.lineItems.map((item) => item.normalizedConcept).filter((concept) => concept !== "unmapped")));
  for (const period of sharedPeriods) {
    for (const concept of concepts) {
      const leftItem = firstConcept(left.lineItems, concept);
      const rightItem = firstConcept(right.lineItems, concept);
      const leftValue = effectiveNormalizedValue(leftItem, period);
      const rightValue = effectiveNormalizedValue(rightItem, period);
      if (leftValue === null || rightValue === null) continue;
      const difference = leftValue - rightValue;
      const matches = Math.abs(difference) <= Math.max(1, left.statement.unitScale * 0.001);
      overlaps.push({ period, concept, leftValue, rightValue, difference, matches });
      if (!matches) {
        issues.push({
          id: `issue:comparative:${period}:${concept}:${left.reviewId}:${right.reviewId}`,
          code: "COMPARATIVE_PERIOD_DISCREPANCY",
          severity: "warning",
          message: `${concept} for comparative period ${period} differs across documents by ${difference.toLocaleString("en-US")}.`,
          period,
          difference,
          sourceRefs: [...sourceRefsFor(leftItem, period), ...sourceRefsFor(rightItem, period)],
        });
      }
    }
  }
  const leftLatest = left.statement.periods[0];
  const rightPrior = right.statement.periods.find((period) => period === leftLatest);
  if (rightPrior) {
    for (const concept of ["total_assets", "total_liabilities", "owners_equity"] as BalanceSheetConcept[]) {
      const leftItem = firstConcept(left.lineItems, concept);
      const rightItem = firstConcept(right.lineItems, concept);
      const leftValue = effectiveNormalizedValue(leftItem, leftLatest);
      const rightValue = effectiveNormalizedValue(rightItem, rightPrior);
      if (leftValue !== null && rightValue !== null && leftValue !== rightValue) {
        issues.push({ id: `issue:opening-closing:${concept}:${leftLatest}`, code: "OPENING_CLOSING_INCONSISTENCY", severity: "warning", message: `${concept} closing balance for ${leftLatest} does not match the same reported period in the comparison document.`, period: leftLatest, difference: leftValue - rightValue, sourceRefs: [...sourceRefsFor(leftItem, leftLatest), ...sourceRefsFor(rightItem, rightPrior)] });
      }
    }
  }
  return { leftReviewId: left.reviewId, rightReviewId: right.reviewId, overlaps, issues };
}

export function reviewToCsv(review: BalanceSheetReview) {
  const header = ["review_id", "document_id", "file_name", "entity", "page", "original_label", "normalized_concept", "classification", "period", "raw_reported_value", "reported_value", "normalized_value", "corrected_reported_value", "corrected_normalized_value", "currency", "unit_scale", "confidence", "review_status"];
  const rows = review.lineItems.flatMap((item) => item.values.map((value) => [
    review.reviewId,
    review.source.documentId,
    review.source.fileName,
    review.statement.reportingEntity,
    value.source.page,
    item.originalLabel,
    item.normalizedConcept,
    item.classification,
    value.period,
    value.rawReportedValue,
    value.reportedValue ?? "",
    value.normalizedValue ?? "",
    value.correction?.correctedReportedValue ?? "",
    value.correction?.correctedNormalizedValue ?? "",
    review.statement.currency,
    review.statement.unitScale,
    value.source.confidence,
    item.reviewStatus,
  ]));
  const escape = (value: string | number) => `"${String(value).replace(/"/g, '""')}"`;
  return [header, ...rows].map((row) => row.map(escape).join(",")).join("\n");
}

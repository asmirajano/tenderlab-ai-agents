import {
  detectPeriods,
  effectiveNormalizedValue,
  parseReportedNumber,
  parseStatementLine,
  type BalanceSheetConcept,
  type BalanceSheetLineItem,
  type BalanceSheetReview,
} from "./model.ts";

export const FIN_FORMS_SCHEMA_VERSION = "1.0.0";

export type FinancialDocumentRole =
  | "FINANCIAL_SOURCE"
  | "TEMPLATE"
  | "USER_INPUT"
  | "OTHER_SUPPORTING_DOCUMENT";

export type FinancialProvenance =
  | "SOURCE"
  | "CALCULATED"
  | "USER_INPUT"
  | "ESTIMATED"
  | "TEMPLATE_EXAMPLE";

export type FinancialProblemType =
  | "extraction-problem"
  | "source-data-gap"
  | "mapping-problem"
  | "source-inconsistency"
  | "coverage-requirement";

export type Fin1FieldId =
  | "total_assets"
  | "total_liabilities"
  | "net_worth"
  | "current_assets"
  | "current_liabilities"
  | "working_capital"
  | "total_revenue"
  | "profit_before_tax"
  | "profit_after_tax";

export type FinancialUserValue = {
  id?: string;
  field: Fin1FieldId;
  period: string;
  value: number;
  currency: string;
  unitScale?: number;
  sourceLabel: string;
  provenance?: "USER_INPUT" | "ESTIMATED";
  estimationExplicitlyPermitted?: boolean;
};

export type FinancialDatasetInput = {
  documentId: string;
  fileName: string;
  role: FinancialDocumentRole;
  review?: BalanceSheetReview;
  userValues?: FinancialUserValue[];
};

export type FinancialDocumentRegistration = {
  documentId: string;
  fileName: string;
  role: FinancialDocumentRole;
  eligibleForCanonicalFinancialDataset: boolean;
  eligibleForGeneratedFinValues: boolean;
  decision: string;
};

export type NormalizedFinancialPeriod = {
  id: string;
  sourceDocumentId: string;
  originalPeriod: string;
  displayYear: string | null;
  status: "direct" | "normalized" | "excluded" | "needs-review";
  rationale: string;
  confidence: "high" | "review-required";
  eligibleForFin: boolean;
};

export type CanonicalFinancialSource = {
  sourceId: string;
  documentId: string;
  fileName: string;
  documentRole: FinancialDocumentRole;
  page: number | null;
  originalLabel: string;
  rawReportedValue?: string;
  originalPeriod: string;
  displayYear: string;
  provenance: FinancialProvenance;
  eligibleForCanonicalFinancialDataset: boolean;
  eligibleForGeneratedFinValues: boolean;
};

export type CanonicalFinancialValue = {
  id: string;
  field: Fin1FieldId;
  displayYear: string;
  value: number;
  currency: string;
  unitScale: number;
  reportedValue: number | null;
  calculatedValue: number | null;
  difference: number | null;
  provenance: FinancialProvenance;
  sourceIds: string[];
  calculationFormula?: string;
  operandSourceIds?: string[];
  status: "ready" | "extraction-problem" | "mapping-problem" | "source-inconsistency";
  problemType?: FinancialProblemType;
};

export type CanonicalFinancialDataset = {
  schemaVersion: typeof FIN_FORMS_SCHEMA_VERSION;
  entity: string;
  currency: string;
  unitLabel: string;
  unitScale: number;
  incomeStatementDetected: boolean;
  documents: FinancialDocumentRegistration[];
  periodMappings: NormalizedFinancialPeriod[];
  availableYears: string[];
  sources: CanonicalFinancialSource[];
  values: CanonicalFinancialValue[];
  issues: Array<{
    id: string;
    type: FinancialProblemType;
    message: string;
    action: string;
    field?: Fin1FieldId;
    displayYear?: string;
    sourceIds?: string[];
  }>;
};

export type Fin1Mapping = {
  id: string;
  field: Fin1FieldId;
  label: string;
  displayYear: string;
  value: number | null;
  currency: string;
  unitScale: number;
  provenance: FinancialProvenance | null;
  sourceIds: string[];
  sourceSummary: string;
  originalPeriods: string[];
  calculationFormula?: string;
  operandSourceIds?: string[];
  reportedValue: number | null;
  calculatedValue: number | null;
  difference: number | null;
  status: "ready" | "missing" | "extraction-problem" | "mapping-problem" | "source-inconsistency";
  problemType?: FinancialProblemType;
  action?: string;
};

export type Fin1Form = {
  schemaVersion: typeof FIN_FORMS_SCHEMA_VERSION;
  templateId: "FIN-1";
  title: "Historical Financial Performance";
  entity: string;
  currency: string;
  unitLabel: string;
  unitScale: number;
  years: string[];
  mappings: Fin1Mapping[];
  readiness: {
    status: "ready" | "partial" | "not-ready";
    canGenerate: boolean;
    readyFields: number;
    missingFields: number;
    problemFields: number;
    message: string;
  };
  coverage: {
    availableYears: number;
    requiredYears: number | null;
    status: "not-specified" | "sufficient" | "insufficient";
    message: string;
  };
};

export const FIN1_FIELDS: ReadonlyArray<{ id: Fin1FieldId; label: string; sourceType: "balance-sheet" | "income-statement" | "calculated" }> = [
  { id: "total_assets", label: "Total Assets", sourceType: "balance-sheet" },
  { id: "total_liabilities", label: "Total Liabilities", sourceType: "balance-sheet" },
  { id: "net_worth", label: "Net Worth", sourceType: "balance-sheet" },
  { id: "current_assets", label: "Current Assets", sourceType: "balance-sheet" },
  { id: "current_liabilities", label: "Current Liabilities", sourceType: "balance-sheet" },
  { id: "working_capital", label: "Working Capital", sourceType: "calculated" },
  { id: "total_revenue", label: "Total Revenue", sourceType: "income-statement" },
  { id: "profit_before_tax", label: "Profit Before Tax", sourceType: "income-statement" },
  { id: "profit_after_tax", label: "Profit After Tax", sourceType: "income-statement" },
];

const FINANCIAL_FACT_ROLES = new Set<FinancialDocumentRole>(["FINANCIAL_SOURCE", "USER_INPUT"]);
const BALANCE_FIELD_CONCEPTS: Partial<Record<Fin1FieldId, BalanceSheetConcept>> = {
  total_assets: "total_assets",
  total_liabilities: "total_liabilities",
  current_assets: "current_assets",
  current_liabilities: "current_liabilities",
};

function yearFrom(value: string) {
  return value.match(/\b(?:19|20)\d{2}\b/)?.[0] ?? null;
}

function isAverage(value: string) {
  return /\baverage\b/i.test(value);
}

function isJanuaryFirst(value: string) {
  return /(?:\bjanuary\s+1\b|\b1(?:st)?\s+january\b)/i.test(value);
}

function isDecemberThirtyFirst(value: string) {
  return /(?:\bdecember\s+31\b|\b31(?:st)?\s+december\b)/i.test(value);
}

function periodId(documentId: string, originalPeriod: string) {
  return `period:${documentId}:${originalPeriod}`;
}

export function normalizeFinancialPeriod(review: BalanceSheetReview, originalPeriod: string): NormalizedFinancialPeriod {
  const documentId = review.source.documentId;
  if (isAverage(originalPeriod)) {
    return {
      id: periodId(documentId, originalPeriod),
      sourceDocumentId: documentId,
      originalPeriod,
      displayYear: null,
      status: "excluded",
      rationale: "Average is retained in source data but is not a historical FIN year.",
      confidence: "high",
      eligibleForFin: false,
    };
  }

  const explicitYear = yearFrom(originalPeriod);
  const reportingYear = yearFrom(review.statement.reportingDate);
  const closingPeriod = review.statement.periods.find((period) => isDecemberThirtyFirst(period));
  const closingYear = closingPeriod ? yearFrom(closingPeriod) ?? reportingYear : null;

  if (isJanuaryFirst(originalPeriod) && closingPeriod) {
    const openingYear = explicitYear ?? reportingYear;
    if (openingYear && closingYear === openingYear) {
      return {
        id: periodId(documentId, originalPeriod),
        sourceDocumentId: documentId,
        originalPeriod,
        displayYear: String(Number(openingYear) - 1),
        status: "normalized",
        rationale: "Opening balance carried into the reporting year; mapped to the immediately preceding year-end for balance-sheet point-in-time fields only.",
        confidence: "high",
        eligibleForFin: true,
      };
    }
  }

  if (isDecemberThirtyFirst(originalPeriod) && (explicitYear ?? reportingYear)) {
    return {
      id: periodId(documentId, originalPeriod),
      sourceDocumentId: documentId,
      originalPeriod,
      displayYear: explicitYear ?? reportingYear,
      status: "direct",
      rationale: "Closing balance mapped directly to its reporting year.",
      confidence: "high",
      eligibleForFin: true,
    };
  }

  if (/^(?:19|20)\d{2}$/.test(originalPeriod.trim())) {
    return {
      id: periodId(documentId, originalPeriod),
      sourceDocumentId: documentId,
      originalPeriod,
      displayYear: originalPeriod.trim(),
      status: "direct",
      rationale: "Source period is already expressed as a financial year.",
      confidence: "high",
      eligibleForFin: true,
    };
  }

  if (explicitYear) {
    return {
      id: periodId(documentId, originalPeriod),
      sourceDocumentId: documentId,
      originalPeriod,
      displayYear: explicitYear,
      status: "direct",
      rationale: "The source period explicitly identifies the financial year.",
      confidence: "high",
      eligibleForFin: true,
    };
  }

  return {
    id: periodId(documentId, originalPeriod),
    sourceDocumentId: documentId,
    originalPeriod,
    displayYear: null,
    status: "needs-review",
    rationale: "No reliable financial-year mapping can be established from this source label.",
    confidence: "review-required",
    eligibleForFin: false,
  };
}

function roleRegistration(input: FinancialDatasetInput): FinancialDocumentRegistration {
  const eligible = FINANCIAL_FACT_ROLES.has(input.role);
  const decision = input.role === "TEMPLATE"
    ? "Structure and requirements only. Populated template examples are technically ineligible for client financial data."
    : input.role === "OTHER_SUPPORTING_DOCUMENT"
      ? "Supporting context only; no financial figure may be generated from this document."
      : input.role === "USER_INPUT"
        ? "Explicit user-supplied figures are eligible only with field-level provenance."
        : "Validated financial-source values are eligible with source traceability.";
  return {
    documentId: input.documentId,
    fileName: input.fileName,
    role: input.role,
    eligibleForCanonicalFinancialDataset: eligible,
    eligibleForGeneratedFinValues: eligible,
    decision,
  };
}

function isExplicitReportedZero(raw: string) {
  return /^(?:[$€£₾]\s*)?[—–-]$/.test(raw.trim());
}

function sourceFor(
  review: BalanceSheetReview,
  item: BalanceSheetLineItem,
  originalPeriod: string,
  displayYear: string,
  role: FinancialDocumentRole,
  provenance: FinancialProvenance,
): CanonicalFinancialSource | null {
  const value = item.values.find((candidate) => candidate.period === originalPeriod);
  if (!value) return null;
  return {
    sourceId: `source:${review.reviewId}:${item.id}:${originalPeriod}`,
    documentId: review.source.documentId,
    fileName: review.source.fileName,
    documentRole: role,
    page: value.source.page,
    originalLabel: item.originalLabel,
    rawReportedValue: value.rawReportedValue,
    originalPeriod,
    displayYear,
    provenance,
    eligibleForCanonicalFinancialDataset: true,
    eligibleForGeneratedFinValues: true,
  };
}

function valueForConcept(
  review: BalanceSheetReview,
  concept: BalanceSheetConcept,
  field: Fin1FieldId,
  originalPeriod: string,
  displayYear: string,
  role: FinancialDocumentRole,
  sources: CanonicalFinancialSource[],
): CanonicalFinancialValue | null {
  const candidates = review.lineItems.flatMap((item) => {
    if (item.normalizedConcept !== concept) return [];
    const lineValue = item.values.find((candidate) => candidate.period === originalPeriod);
    if (!lineValue) return [];
    const value = effectiveNormalizedValue(item, originalPeriod) ?? (isExplicitReportedZero(lineValue.rawReportedValue) ? 0 : null);
    if (value === null) return [];
    const provenance: FinancialProvenance = lineValue.correction ? "USER_INPUT" : "SOURCE";
    const source = sourceFor(review, item, originalPeriod, displayYear, role, provenance);
    return source ? [{ item, lineValue, value, provenance, source }] : [];
  });
  if (!candidates.length) return null;

  for (const candidate of candidates) {
    if (!sources.some((source) => source.sourceId === candidate.source.sourceId)) sources.push(candidate.source);
  }

  const primary = candidates[0];
  const conflicting = candidates.some((candidate) =>
    candidate.source.documentId !== primary.source.documentId
      || Math.abs(candidate.value - primary.value) > tolerance(review.statement.unitScale));
  const extractionProblem = candidates.some((candidate) => candidate.item.confidence < 0.8);
  const provenance: FinancialProvenance = candidates.some((candidate) => candidate.provenance === "USER_INPUT") ? "USER_INPUT" : "SOURCE";
  return {
    id: `value:${field}:${displayYear}:${review.source.documentId}`,
    field,
    displayYear,
    value: primary.value,
    currency: review.statement.currency,
    unitScale: review.statement.unitScale,
    reportedValue: primary.lineValue.normalizedValue ?? (isExplicitReportedZero(primary.lineValue.rawReportedValue) ? 0 : null),
    calculatedValue: null,
    difference: null,
    provenance,
    sourceIds: candidates.map((candidate) => candidate.source.sourceId),
    status: conflicting ? "source-inconsistency" : extractionProblem ? "extraction-problem" : "ready",
    problemType: conflicting ? "source-inconsistency" : extractionProblem ? "extraction-problem" : undefined,
  };
}

function tolerance(unitScale: number) {
  return Math.max(0.000001, unitScale * 0.000001);
}

function pushIssue(dataset: CanonicalFinancialDataset, issue: CanonicalFinancialDataset["issues"][number]) {
  if (!dataset.issues.some((candidate) => candidate.id === issue.id)) dataset.issues.push(issue);
}

function addBalanceSourceValues(dataset: CanonicalFinancialDataset, input: FinancialDatasetInput) {
  const review = input.review;
  if (!review || input.role !== "FINANCIAL_SOURCE") return;
  const periodMappings = review.statement.periods.map((period) => normalizeFinancialPeriod(review, period));
  dataset.periodMappings.push(...periodMappings);

  for (const period of periodMappings) {
    if (!period.eligibleForFin || !period.displayYear) {
      if (period.status === "needs-review") {
        pushIssue(dataset, {
          id: `issue:period:${review.source.documentId}:${period.originalPeriod}`,
          type: "mapping-problem",
          message: `The source period “${period.originalPeriod}” could not be normalized to a reliable FIN year.`,
          action: "Review period mapping",
        });
      }
      continue;
    }
    for (const [field, concept] of Object.entries(BALANCE_FIELD_CONCEPTS) as Array<[Fin1FieldId, BalanceSheetConcept]>) {
      const mapped = valueForConcept(review, concept, field, period.originalPeriod, period.displayYear, input.role, dataset.sources);
      if (mapped) {
        dataset.values.push(mapped);
        if (mapped.status === "source-inconsistency") {
          pushIssue(dataset, {
            id: `issue:balance-conflict:${review.source.documentId}:${field}:${period.displayYear}`,
            type: "source-inconsistency",
            field,
            displayYear: period.displayYear,
            sourceIds: [...mapped.sourceIds],
            message: `Two eligible balance-statement rows report different ${FIN1_FIELDS.find((definition) => definition.id === field)?.label ?? field} values for ${period.displayYear}. Neither value was silently replaced.`,
            action: "Review the conflicting source rows",
          });
        }
      }
    }

    const totalLiabilities = dataset.values.find((value) => value.field === "total_liabilities" && value.displayYear === period.displayYear);
    const mappedCurrentLiabilities = dataset.values.find((value) => value.field === "current_liabilities" && value.displayYear === period.displayYear);
    const hasNonZeroLiabilityComponent = review.lineItems.some((item) => {
      if (!["current_liability", "non_current_liability"].includes(item.classification) || item.normalizedConcept === "total_liabilities") return false;
      const value = effectiveNormalizedValue(item, period.originalPeriod);
      return value !== null && value !== 0;
    });
    if (!mappedCurrentLiabilities && totalLiabilities?.status === "ready" && totalLiabilities.value === 0 && !hasNonZeroLiabilityComponent) {
      dataset.values.push({
        id: `value:current_liabilities:${period.displayYear}:calculated-zero`,
        field: "current_liabilities",
        displayYear: period.displayYear,
        value: 0,
        currency: review.statement.currency,
        unitScale: review.statement.unitScale,
        reportedValue: null,
        calculatedValue: 0,
        difference: null,
        provenance: "CALCULATED",
        sourceIds: [...totalLiabilities.sourceIds],
        calculationFormula: "Total Liabilities are zero; no non-zero liability component is reported",
        operandSourceIds: [...totalLiabilities.sourceIds],
        status: "ready",
      });
    }

    const reportedNetWorth = valueForConcept(review, "owners_equity", "net_worth", period.originalPeriod, period.displayYear, input.role, dataset.sources)
      ?? valueForConcept(review, "net_assets", "net_worth", period.originalPeriod, period.displayYear, input.role, dataset.sources);
    const assets = dataset.values.find((value) => value.field === "total_assets" && value.displayYear === period.displayYear);
    const liabilities = dataset.values.find((value) => value.field === "total_liabilities" && value.displayYear === period.displayYear);
    const calculatedNetWorth = assets && liabilities ? assets.value - liabilities.value : null;
    if (reportedNetWorth) {
      const difference = calculatedNetWorth === null ? null : reportedNetWorth.value - calculatedNetWorth;
      reportedNetWorth.calculatedValue = calculatedNetWorth;
      reportedNetWorth.difference = difference;
      reportedNetWorth.calculationFormula = "Total Assets − Total Liabilities";
      reportedNetWorth.operandSourceIds = [...(assets?.sourceIds ?? []), ...(liabilities?.sourceIds ?? [])];
      if (difference !== null && Math.abs(difference) > tolerance(review.statement.unitScale)) {
        reportedNetWorth.status = "source-inconsistency";
        reportedNetWorth.problemType = "source-inconsistency";
        pushIssue(dataset, {
          id: `issue:net-worth:${period.displayYear}:${review.source.documentId}`,
          type: "source-inconsistency",
          field: "net_worth",
          displayYear: period.displayYear,
          message: `Reported Net Worth differs from Assets − Liabilities by ${difference.toLocaleString("en-US")} ${review.statement.currency}. The reported value remains unchanged.`,
          action: "Review reported and calculated values",
        });
      }
      dataset.values.push(reportedNetWorth);
    } else if (calculatedNetWorth !== null && assets && liabilities) {
      dataset.values.push({
        id: `value:net_worth:${period.displayYear}:calculated`,
        field: "net_worth",
        displayYear: period.displayYear,
        value: calculatedNetWorth,
        currency: review.statement.currency,
        unitScale: review.statement.unitScale,
        reportedValue: null,
        calculatedValue: calculatedNetWorth,
        difference: null,
        provenance: "CALCULATED",
        sourceIds: [...assets.sourceIds, ...liabilities.sourceIds],
        calculationFormula: "Total Assets − Total Liabilities",
        operandSourceIds: [...assets.sourceIds, ...liabilities.sourceIds],
        status: "ready",
      });
    }

    const currentAssets = dataset.values.find((value) => value.field === "current_assets" && value.displayYear === period.displayYear);
    const currentLiabilities = dataset.values.find((value) => value.field === "current_liabilities" && value.displayYear === period.displayYear);
    if (currentAssets && currentLiabilities) {
      dataset.values.push({
        id: `value:working_capital:${period.displayYear}:calculated`,
        field: "working_capital",
        displayYear: period.displayYear,
        value: currentAssets.value - currentLiabilities.value,
        currency: review.statement.currency,
        unitScale: review.statement.unitScale,
        reportedValue: null,
        calculatedValue: currentAssets.value - currentLiabilities.value,
        difference: null,
        provenance: "CALCULATED",
        sourceIds: [...currentAssets.sourceIds, ...currentLiabilities.sourceIds],
        calculationFormula: "Current Assets − Current Liabilities",
        operandSourceIds: [...currentAssets.sourceIds, ...currentLiabilities.sourceIds],
        status: currentAssets.status === "ready" && currentLiabilities.status === "ready" ? "ready" : "extraction-problem",
        problemType: currentAssets.status === "ready" && currentLiabilities.status === "ready" ? undefined : "extraction-problem",
      });
    }
  }
}

const INCOME_FIELD_PATTERNS: Array<{ field: Fin1FieldId; patterns: RegExp[] }> = [
  { field: "total_revenue", patterns: [/^net revenue$/i, /^total revenue$/i, /^revenue$/i, /^sales revenue$/i, /^net sales$/i, /^annual turnover$/i, /^turnover$/i, /^sales turnover$/i, /маҳсулот.*сотишдан соф тушум/iu] },
  { field: "profit_before_tax", patterns: [/^(?:income|loss|profit).*before.*(?:income )?tax(?:es| expense)?$/i, /^profit before tax$/i, /фойда солиғини тўлагунга қадар фойда/iu] },
  { field: "profit_after_tax", patterns: [/^net income.*net loss/i, /^net (?:income|loss)$/i, /^total net (?:income|loss)$/i, /^profit after tax$/i, /ҳисобот даврининг соф фойдаси/iu] },
];

const TURNOVER_REVIEW_PATTERNS = [/^(?:total )?sales$/i, /^(?:total )?receipts$/i, /^(?:total )?income$/i, /^gross income$/i];

function incomeStatementPages(review: BalanceSheetReview) {
  const titled = review.pages.filter((page) => page.text?.split(/\r?\n/).some((line) => {
    const normalized = line.replace(/\s+/g, " ").trim();
    return /^(?:audited\s+)?(?:consolidated\s+)?statements? of (?:operations|income|profit(?: or loss)?)(?: and comprehensive income)?$/i.test(normalized)
      || /^(?:consolidated\s+)?income statements?$/i.test(normalized)
      || /^report on financial results\s*[-–—]\s*form no\.?\s*2$/i.test(normalized)
      || /молиявий натижалар.*(?:ҳисобот|хисобот)/iu.test(normalized);
  }));
  const withTargetRows = titled.filter((page) => INCOME_FIELD_PATTERNS.some((definition) => definition.patterns.some((pattern) => pattern.test(page.text ?? ""))));
  return withTargetRows.length ? withTargetRows : titled;
}

function normalizeIncomeLabel(label: string) {
  return label
    .replace(/[{}]/g, (token) => token === "{" ? "(" : ")")
    .replace(/\s+([)}\]])/g, "$1")
    .replace(/\s+/g, " ")
    .trim();
}

function incomeDefinitionForLabel(label: string) {
  const normalized = normalizeIncomeLabel(label).replace(/[:\s]+$/, "");
  return INCOME_FIELD_PATTERNS.find((candidate) => candidate.patterns.some((pattern) => pattern.test(normalized)));
}

function parseIncomeStatementLine(sourceLine: string, expectedValueCount: number) {
  const tabular = sourceLine.includes("\t") ? parseStatementLine(sourceLine, expectedValueCount) : undefined;
  if (tabular) {
    const label = normalizeIncomeLabel(tabular.label).replace(/\s+\d{3}$/, "");
    if (incomeDefinitionForLabel(label)) return { ...tabular, label };
  }
  const normalized = normalizeIncomeLabel(sourceLine);
  const parsed = parseStatementLine(normalized, expectedValueCount);
  if (parsed) {
    const label = normalizeIncomeLabel(parsed.label).replace(/\s+\d{3}$/, "");
    if (incomeDefinitionForLabel(label)) return { ...parsed, label };
  }

  const valueTokens = Array.from(normalized.matchAll(/(?:[$€£₾]\s*)?(?:[—–-]|\(\s*[-−]?\d[\d,.'’]*\s*\)|[-−]?\d[\d,.'’]*\d?)/g));
  if (valueTokens.length < expectedValueCount) return undefined;
  const selected = valueTokens.slice(-expectedValueCount);
  const firstIndex = selected[0]?.index ?? -1;
  if (firstIndex < 0) return undefined;
  const label = normalized.slice(0, firstIndex).replace(/[:\s]+$/, "");
  if (!incomeDefinitionForLabel(label)) return undefined;
  return { label, rawValues: selected.map((match) => match[0].trim()) };
}

function incomeDefinitionForLine(sourceLine: string) {
  const normalized = normalizeIncomeLabel(sourceLine);
  const parsed = parseIncomeStatementLine(normalized, 1);
  return incomeDefinitionForLabel(parsed?.label ?? normalized);
}

function parseIncomeReportedNumber(raw: string) {
  return isExplicitReportedZero(raw) ? 0 : parseReportedNumber(raw);
}

function parseUzbekIncomeRows(text: string) {
  const rows: Array<{ label: string; rawValues: string[] }> = [];
  let pending = "";
  const moneyToken = /(?:x|[-−]?\d{1,3}(?:[ \u00a0]\d{3})*(?:[,.]\d{2}))/giu;
  for (const sourceLine of text.split(/\r?\n/)) {
    const line = normalizeIncomeLabel(sourceLine);
    if (!line) continue;
    const row = line.match(/\b(\d{3})\s+((?:x|[-−]?\d)[\s\S]*)$/iu);
    if (row) {
      const beforeCode = line.slice(0, row.index).trim();
      const label = normalizeIncomeLabel(`${pending} ${beforeCode}`);
      const tokens = Array.from(row[2].matchAll(moneyToken), (match) => match[0]);
      const rawValues = tokens.length >= 4 ? [tokens[0], tokens[2]] : tokens.filter((token) => !/^x$/i.test(token)).slice(0, 2);
      if (label && rawValues.length) rows.push({ label, rawValues });
      pending = "";
      continue;
    }
    if (/^(?:lc=|даромадлар|харажатлар|\(фойда\)|\(зарарлар\)|[1-6](?:\s+[1-6])+)$/iu.test(line)
      || /^(?:сатр|коди|кўрсаткичлар номи|ўтган йилнинг)/iu.test(line)
      || /молиявий натижалар.*(?:ҳисобот|хисобот)/iu.test(line)) {
      pending = "";
      continue;
    }
    pending = INCOME_FIELD_PATTERNS.some((definition) => definition.patterns.some((pattern) => pattern.test(line)))
      ? line
      : normalizeIncomeLabel(`${pending} ${line}`).split(" ").slice(-32).join(" ");
  }
  return rows;
}

function addIncomeSourceValues(dataset: CanonicalFinancialDataset, input: FinancialDatasetInput) {
  const review = input.review;
  if (!review || input.role !== "FINANCIAL_SOURCE") return;
  const pages = incomeStatementPages(review);
  if (!pages.length) return;
  dataset.incomeStatementDetected = true;
  const discovered = new Set<string>();
  const locatedFields = new Set<Fin1FieldId>();
  const incomeStatementYears = new Set<string>();

  for (const page of pages) {
    const pageReportingYear = "reportingYear" in page && typeof page.reportingYear === "string"
      ? page.reportingYear
      : yearFrom(review.statement.reportingDate);
    const periods = detectPeriods(page.text ?? "", pageReportingYear).filter((period) => Boolean(yearFrom(period)));
    for (const period of periods) {
      const displayYear = yearFrom(period);
      if (displayYear) incomeStatementYears.add(displayYear);
    }
    if (!periods.length) {
      pushIssue(dataset, {
        id: `issue:income-period:${review.source.documentId}:${page.pageNumber}`,
        type: "mapping-problem",
        message: `An income statement was found on page ${page.pageNumber}, but its reporting years could not be mapped reliably.`,
        action: "Review income-statement periods",
      });
      continue;
    }

    for (const sourceLine of (page.text ?? "").split(/\r?\n/)) {
      const located = incomeDefinitionForLine(sourceLine);
      if (located) locatedFields.add(located.field);
    }

    for (const sourceLine of (page.text ?? "").split(/\r?\n/)) {
      const parsedCandidate = parseStatementLine(normalizeIncomeLabel(sourceLine), periods.length);
      const candidateLabel = normalizeIncomeLabel(parsedCandidate?.label ?? "").replace(/[:\s]+$/, "");
      if (!candidateLabel || incomeDefinitionForLabel(candidateLabel) || !TURNOVER_REVIEW_PATTERNS.some((pattern) => pattern.test(candidateLabel))) continue;
      const rawValues = (parsedCandidate?.rawValues ?? []).slice(-periods.length);
      for (let index = 0; index < periods.length; index += 1) {
        const displayYear = yearFrom(periods[index]);
        const rawReportedValue = rawValues[index] ?? "";
        if (!displayYear || parseIncomeReportedNumber(rawReportedValue) === null) continue;
        const sourceId = `source:${review.reviewId}:turnover-candidate:${displayYear}:${page.pageNumber}`;
        dataset.sources.push({
          sourceId,
          documentId: review.source.documentId,
          fileName: review.source.fileName,
          documentRole: input.role,
          page: page.pageNumber,
          originalLabel: candidateLabel,
          rawReportedValue,
          originalPeriod: periods[index],
          displayYear,
          provenance: "SOURCE",
          eligibleForCanonicalFinancialDataset: true,
          eligibleForGeneratedFinValues: false,
        });
        pushIssue(dataset, {
          id: `issue:turnover-mapping:${review.source.documentId}:${displayYear}:${page.pageNumber}`,
          type: "mapping-problem",
          field: "total_revenue",
          displayYear,
          sourceIds: [sourceId],
          message: `“${candidateLabel}” is reported for ${displayYear}, but its meaning is not specific enough to map automatically to Annual Turnover.`,
          action: "Review whether the reported indicator is legitimate Annual Turnover evidence",
        });
      }
    }

    const sourceRows = /[ўқғҳ]/i.test(page.text ?? "")
      ? parseUzbekIncomeRows(page.text ?? "")
      : (page.text ?? "").split(/\r?\n/).map((sourceLine) => parseIncomeStatementLine(sourceLine.trim(), periods.length)).filter((parsed): parsed is NonNullable<typeof parsed> => Boolean(parsed));
    for (const parsed of sourceRows) {
      if (!parsed) continue;
      const label = normalizeIncomeLabel(parsed.label);
      const definition = INCOME_FIELD_PATTERNS.find((candidate) => candidate.patterns.some((pattern) => pattern.test(label)));
      if (!definition) continue;
      const rawValues = parsed.rawValues.slice(-periods.length);
      for (let index = 0; index < periods.length; index += 1) {
        const displayYear = yearFrom(periods[index]);
        const rawReportedValue = rawValues[index] ?? "";
        const reportedValue = parseIncomeReportedNumber(rawReportedValue);
        if (!displayYear || reportedValue === null) continue;
        const sourceId = `source:${review.reviewId}:income:${definition.field}:${displayYear}:${page.pageNumber}`;
        const confidence = page.confidence ?? 0.65;
        dataset.sources.push({
          sourceId,
          documentId: review.source.documentId,
          fileName: review.source.fileName,
          documentRole: input.role,
          page: page.pageNumber,
          originalLabel: label,
          rawReportedValue,
          originalPeriod: periods[index],
          displayYear,
          provenance: "SOURCE",
          eligibleForCanonicalFinancialDataset: true,
          eligibleForGeneratedFinValues: true,
        });
        const normalizedIncomeValue: CanonicalFinancialValue = {
          id: `value:${definition.field}:${displayYear}:${review.source.documentId}`,
          field: definition.field,
          displayYear,
          value: reportedValue * review.statement.unitScale,
          currency: review.statement.currency,
          unitScale: review.statement.unitScale,
          reportedValue: reportedValue * review.statement.unitScale,
          calculatedValue: null,
          difference: null,
          provenance: "SOURCE",
          sourceIds: [sourceId],
          status: confidence < 0.8 ? "extraction-problem" : "ready",
          problemType: confidence < 0.8 ? "extraction-problem" : undefined,
        };
        const existing = dataset.values.find((value) => value.field === definition.field && value.displayYear === displayYear);
        if (!existing) {
          dataset.values.push(normalizedIncomeValue);
        } else if (existing.currency === normalizedIncomeValue.currency && Math.abs(existing.value - normalizedIncomeValue.value) <= tolerance(normalizedIncomeValue.unitScale)) {
          if (!existing.sourceIds.includes(sourceId)) existing.sourceIds.push(sourceId);
        } else {
          existing.status = "source-inconsistency";
          existing.problemType = "source-inconsistency";
          if (!existing.sourceIds.includes(sourceId)) existing.sourceIds.push(sourceId);
          pushIssue(dataset, {
            id: `issue:income-conflict:${review.source.documentId}:${definition.field}:${displayYear}`,
            type: "source-inconsistency",
            field: definition.field,
            displayYear,
            sourceIds: [...existing.sourceIds],
            message: `Two eligible income-statement pages report different ${FIN1_FIELDS.find((field) => field.id === definition.field)?.label ?? definition.field} values for ${displayYear}. Neither value was silently replaced.`,
            action: "Review the conflicting source pages",
          });
        }
        discovered.add(`${definition.field}:${displayYear}`);
      }
    }
  }

  for (const displayYear of incomeStatementYears) {
    for (const definition of INCOME_FIELD_PATTERNS) {
      if (discovered.has(`${definition.field}:${displayYear}`)) continue;
      if (!locatedFields.has(definition.field)) continue;
      pushIssue(dataset, {
        id: `issue:income-extraction:${review.source.documentId}:${definition.field}:${displayYear}`,
        type: "extraction-problem",
        field: definition.field,
        displayYear,
        message: `The uploaded document contains an income statement for ${displayYear}, but ${FIN1_FIELDS.find((field) => field.id === definition.field)?.label ?? definition.field} was not extracted reliably.`,
        action: "Review income-statement extraction",
      });
    }
  }
}

function addUserValues(dataset: CanonicalFinancialDataset, input: FinancialDatasetInput) {
  if (input.role !== "USER_INPUT") return;
  for (const [index, supplied] of (input.userValues ?? []).entries()) {
    const provenance = supplied.provenance ?? "USER_INPUT";
    if (provenance === "ESTIMATED" && !supplied.estimationExplicitlyPermitted) {
      pushIssue(dataset, {
        id: `issue:estimate:${input.documentId}:${index}`,
        type: "mapping-problem",
        field: supplied.field,
        displayYear: supplied.period,
        message: `An estimated ${supplied.field} value was excluded because estimation was not explicitly permitted.`,
        action: "Provide a sourced or explicitly permitted value",
      });
      continue;
    }
    const displayYear = yearFrom(supplied.period);
    if (!displayYear) {
      pushIssue(dataset, {
        id: `issue:user-period:${input.documentId}:${index}`,
        type: "mapping-problem",
        field: supplied.field,
        message: `The user-supplied period “${supplied.period}” is not a valid FIN year.`,
        action: "Review period mapping",
      });
      continue;
    }
    const sourceId = `source:user:${input.documentId}:${index}`;
    dataset.sources.push({
      sourceId,
      documentId: input.documentId,
      fileName: input.fileName,
      documentRole: input.role,
      page: null,
      originalLabel: supplied.sourceLabel,
      originalPeriod: supplied.period,
      displayYear,
      provenance,
      eligibleForCanonicalFinancialDataset: true,
      eligibleForGeneratedFinValues: true,
    });
    dataset.periodMappings.push({
      id: periodId(input.documentId, supplied.period),
      sourceDocumentId: input.documentId,
      originalPeriod: supplied.period,
      displayYear,
      status: "direct",
      rationale: "Explicit user input identifies the financial year.",
      confidence: "high",
      eligibleForFin: true,
    });
    dataset.values.push({
      id: supplied.id ?? `value:user:${supplied.field}:${displayYear}:${index}`,
      field: supplied.field,
      displayYear,
      value: supplied.value * (supplied.unitScale ?? 1),
      currency: supplied.currency,
      unitScale: supplied.unitScale ?? 1,
      reportedValue: supplied.value * (supplied.unitScale ?? 1),
      calculatedValue: null,
      difference: null,
      provenance,
      sourceIds: [sourceId],
      status: "ready",
    });
  }
}

export function financialInputFromBalanceReview(review: BalanceSheetReview, role: FinancialDocumentRole = "FINANCIAL_SOURCE"): FinancialDatasetInput {
  return {
    documentId: review.source.documentId,
    fileName: review.source.fileName,
    role,
    review,
  };
}

export function buildCanonicalFinancialDataset(inputs: FinancialDatasetInput[]): CanonicalFinancialDataset {
  const eligibleReview = inputs.find((input) => input.role === "FINANCIAL_SOURCE" && input.review)?.review;
  const dataset: CanonicalFinancialDataset = {
    schemaVersion: FIN_FORMS_SCHEMA_VERSION,
    entity: eligibleReview?.statement.reportingEntity ?? "Unconfirmed reporting entity",
    currency: eligibleReview?.statement.currency ?? inputs.flatMap((input) => input.userValues ?? [])[0]?.currency ?? "UNSPECIFIED",
    unitLabel: eligibleReview?.statement.unitLabel ?? "units",
    unitScale: eligibleReview?.statement.unitScale ?? 1,
    incomeStatementDetected: false,
    documents: inputs.map(roleRegistration),
    periodMappings: [],
    availableYears: [],
    sources: [],
    values: [],
    issues: [],
  };

  for (const input of inputs) {
    if (input.role === "TEMPLATE" && input.review?.lineItems.length) {
      pushIssue(dataset, {
        id: `issue:template-blocked:${input.documentId}`,
        type: "mapping-problem",
        message: `${input.fileName} contains populated TEMPLATE EXAMPLE content. Its years and values were rejected from client financial data.`,
        action: "Use the template for structure only",
      });
    }
    addBalanceSourceValues(dataset, input);
    addIncomeSourceValues(dataset, input);
    addUserValues(dataset, input);
  }

  dataset.periodMappings = dataset.periodMappings.filter((period, index, periods) =>
    periods.findIndex((candidate) => candidate.id === period.id) === index
  );
  dataset.availableYears = Array.from(new Set(dataset.periodMappings
    .filter((period) => period.eligibleForFin && period.displayYear)
    .map((period) => period.displayYear as string)))
    .sort((left, right) => Number(left) - Number(right));
  dataset.values = dataset.values.filter((value, index, values) =>
    values.findIndex((candidate) => candidate.field === value.field && candidate.displayYear === value.displayYear) === index
  );
  return dataset;
}

function missingAction(field: Fin1FieldId, incomeStatementDetected: boolean) {
  return ["total_revenue", "profit_before_tax", "profit_after_tax"].includes(field)
    ? incomeStatementDetected ? "Provide a source that separately reports this field" : "Add Income Statement"
    : "Add financial statement or review mapping";
}

export function generateFin1(dataset: CanonicalFinancialDataset, requiredYearCount?: number): Fin1Form {
  const mappings: Fin1Mapping[] = [];
  for (const fieldDefinition of FIN1_FIELDS) {
    for (const displayYear of dataset.availableYears) {
      const value = dataset.values.find((candidate) => candidate.field === fieldDefinition.id && candidate.displayYear === displayYear);
      const sources = value ? dataset.sources.filter((source) => value.sourceIds.includes(source.sourceId)) : [];
      const missing = !value;
      const missingIssue = missing ? dataset.issues.find((issue) => issue.field === fieldDefinition.id && issue.displayYear === displayYear && ["extraction-problem", "mapping-problem"].includes(issue.type)) : undefined;
      const missingStatus: Fin1Mapping["status"] = missingIssue?.type === "extraction-problem" || missingIssue?.type === "mapping-problem" ? missingIssue.type : "missing";
      mappings.push({
        id: `fin1:${fieldDefinition.id}:${displayYear}`,
        field: fieldDefinition.id,
        label: fieldDefinition.label,
        displayYear,
        value: value?.value ?? null,
        currency: value?.currency ?? dataset.currency,
        unitScale: value?.unitScale ?? dataset.unitScale,
        provenance: value?.provenance ?? null,
        sourceIds: value?.sourceIds ?? [],
        sourceSummary: value?.calculationFormula ?? (sources.map((source) => `${source.fileName} · ${source.originalLabel}`).join("; ") || (fieldDefinition.sourceType === "income-statement" ? dataset.incomeStatementDetected ? "Not separately reported in the eligible Income Statement" : "Income Statement unavailable" : "Required source value unavailable")),
        originalPeriods: Array.from(new Set(sources.map((source) => source.originalPeriod))),
        calculationFormula: value?.calculationFormula,
        operandSourceIds: value?.operandSourceIds,
        reportedValue: value?.reportedValue ?? null,
        calculatedValue: value?.calculatedValue ?? null,
        difference: value?.difference ?? null,
        status: missing ? missingStatus : value.status,
        problemType: missing ? (missingIssue?.type ?? "source-data-gap") : value.problemType,
        action: missing ? (missingIssue?.action ?? missingAction(fieldDefinition.id, dataset.incomeStatementDetected)) : value.status === "source-inconsistency" ? "Review reported and calculated values" : value.status === "extraction-problem" ? "Review extraction" : value.status === "mapping-problem" ? "Review mapping" : undefined,
      });
    }
  }

  const readyFields = mappings.filter((mapping) => mapping.status === "ready").length;
  const missingFields = mappings.filter((mapping) => mapping.status === "missing").length;
  const problemFields = mappings.filter((mapping) => ["extraction-problem", "mapping-problem", "source-inconsistency"].includes(mapping.status)).length;
  const requiredBalanceFields = new Set<Fin1FieldId>(["total_assets", "total_liabilities", "net_worth", "current_assets", "current_liabilities", "working_capital"]);
  const balanceComplete = dataset.availableYears.every((displayYear) => Array.from(requiredBalanceFields).every((field) => mappings.some((mapping) => mapping.field === field && mapping.displayYear === displayYear && mapping.value !== null)));
  const blockingMappingProblem = mappings.some((mapping) => mapping.status === "extraction-problem" || mapping.status === "mapping-problem");
  const canGenerate = dataset.availableYears.length > 0 && balanceComplete && !blockingMappingProblem;
  const status: Fin1Form["readiness"]["status"] = !canGenerate ? "not-ready" : missingFields || problemFields ? "partial" : "ready";
  const requiredYears = requiredYearCount && requiredYearCount > 0 ? requiredYearCount : null;
  const coverageStatus: Fin1Form["coverage"]["status"] = requiredYears === null
    ? "not-specified"
    : dataset.availableYears.length >= requiredYears ? "sufficient" : "insufficient";

  return {
    schemaVersion: FIN_FORMS_SCHEMA_VERSION,
    templateId: "FIN-1",
    title: "Historical Financial Performance",
    entity: dataset.entity,
    currency: dataset.currency,
    unitLabel: dataset.unitLabel,
    unitScale: dataset.unitScale,
    years: dataset.availableYears,
    mappings,
    readiness: {
      status,
      canGenerate,
      readyFields,
      missingFields,
      problemFields,
      message: status === "ready"
        ? "All FIN-1 fields are available for the legitimate source-driven periods."
        : status === "partial"
          ? "FIN-1 is partially ready. Available values can be reviewed and generated while genuine source-data gaps remain explicit."
          : !balanceComplete
            ? "FIN-1 cannot be generated until every required balance-sheet field is reliably mapped for each source-driven year."
            : "FIN-1 cannot be generated while extraction or period-mapping problems remain unresolved.",
    },
    coverage: {
      availableYears: dataset.availableYears.length,
      requiredYears,
      status: coverageStatus,
      message: coverageStatus === "not-specified"
        ? `${dataset.availableYears.length} source-driven year${dataset.availableYears.length === 1 ? " is" : "s are"} available; no tender-specific requirement is set.`
        : coverageStatus === "sufficient"
          ? `Historical coverage: ${dataset.availableYears.length} of ${requiredYears} required years available.`
          : `Historical coverage: ${dataset.availableYears.length} of ${requiredYears} required years available.`,
    },
  };
}

export function prepareFin1FromBalanceReview(review: BalanceSheetReview, requiredYearCount?: number) {
  const dataset = buildCanonicalFinancialDataset([financialInputFromBalanceReview(review)]);
  return { dataset, form: generateFin1(dataset, requiredYearCount) };
}

export function fin1ToCsv(form: Fin1Form) {
  const rows = [
    ["Financial Indicator", ...form.years.map((year) => `${year} — ${form.currency} · ${form.unitLabel}`)],
    ...FIN1_FIELDS.map((field) => [
      field.label,
      ...form.years.map((year) => {
        const mapping = form.mappings.find((candidate) => candidate.field === field.id && candidate.displayYear === year);
        return mapping?.value === null || mapping?.value === undefined ? "MISSING" : mapping.value / mapping.unitScale;
      }),
    ]),
  ];
  const escape = (value: string | number) => `"${String(value).replace(/"/g, '""')}"`;
  return rows.map((row) => row.map(escape).join(",")).join("\n");
}

import {
  cbuFinFxMetadata,
  resolveFinancialFxRate,
  type FinancialFxEvidence,
  type FinPresentationCurrency,
} from "./fin1-fx.ts";
import type {
  CanonicalFinancialDataset,
  FinancialProvenance,
} from "./fin-forms.ts";

export const FIN2_SCHEMA_VERSION = "1.1.0";

export type Fin2AdministrativeInput = {
  biddingProcess?: string;
  invitationNumber?: string;
  purchaser?: string;
};

export type Fin2AdministrativeField = {
  value: string | null;
  provenance: "SOURCE" | "USER_INPUT" | "MISSING";
};

export type Fin2MappingStatus =
  | "ready"
  | "missing"
  | "mapping-review-required"
  | "extraction-problem"
  | "fx-rate-missing";

export type Fin2TurnoverMapping = {
  id: string;
  field: "annual_turnover";
  label: "Annual Turnover";
  displayYear: string;
  sourceReportedValue: number | null;
  sourceValue: number | null;
  sourceCurrency: string;
  sourceUnitLabel: string;
  sourceUnitScale: number;
  sourceProvenance: FinancialProvenance | "MISSING" | "MAPPING_REVIEW_REQUIRED";
  sourceIds: string[];
  sourceSummary: string;
  originalLabels: string[];
  originalPeriods: string[];
  sourcePages: number[];
  rawReportedValues: string[];
  exchangeRate: FinancialFxEvidence | null;
  sourceUnitsPerComparisonUnit: number | null;
  convertedValue: number | null;
  comparisonCurrency: FinPresentationCurrency;
  comparisonUnitScale: 1;
  convertedProvenance: "CALCULATED" | "MISSING";
  sourceScaleFormula: string | null;
  conversionFormula: string | null;
  status: Fin2MappingStatus;
  action: string | null;
};

export type Fin2Form = {
  schemaVersion: typeof FIN2_SCHEMA_VERSION;
  templateId: "FIN-2";
  title: "Size of Operation (Average Annual Turnover)";
  bidderModel: "SINGLE_BIDDER";
  bidder: Fin2AdministrativeField;
  biddingProcess: Fin2AdministrativeField;
  invitationNumber: Fin2AdministrativeField;
  purchaser: Fin2AdministrativeField;
  sourceCurrency: string;
  sourceUnitLabel: string;
  sourceUnitScale: number;
  comparisonCurrency: FinPresentationCurrency;
  comparisonUnitLabel: "units";
  comparisonUnitScale: 1;
  exchangeRateBasis: "closing";
  years: string[];
  mappings: Fin2TurnoverMapping[];
  averageAnnualTurnover: {
    value: number | null;
    currency: FinPresentationCurrency;
    unitScale: 1;
    provenance: "CALCULATED" | "MISSING";
    yearsIncluded: string[];
    mappingIds: string[];
    formula: string;
  };
  readiness: {
    status: "ready" | "partial" | "not-ready";
    canGenerate: boolean;
    readyYears: number;
    missingYears: number;
    problemYears: number;
    missingAdministrativeFields: string[];
    message: string;
  };
  coverage: {
    availableYears: number;
    eligibleTurnoverYears: number;
    requiredYears: number | null;
    status: "not-specified" | "sufficient" | "insufficient";
    message: string;
  };
  fxDataset: ReturnType<typeof cbuFinFxMetadata>;
};

export type GenerateFin2Options = {
  comparisonCurrency: FinPresentationCurrency;
  requiredYearCount?: number | null;
  administrative?: Fin2AdministrativeInput;
};

function userField(value?: string): Fin2AdministrativeField {
  const normalized = value?.trim() ?? "";
  return normalized
    ? { value: normalized, provenance: "USER_INPUT" }
    : { value: null, provenance: "MISSING" };
}

function sourceSummary(fileName: string, originalLabels: string[], sourcePages: number[]) {
  const labels = originalLabels.join(" / ");
  const pages = sourcePages.length ? ` · p.${sourcePages.join(", ")}` : "";
  return labels ? `${fileName} · ${labels}${pages}` : fileName;
}

function auditNumber(value: number) {
  return value.toLocaleString("en-US", { maximumFractionDigits: 12 });
}

export function fin2ReportedUnitName(unitLabel: string, unitScale: number, currency: string) {
  if (unitScale === 1 || /^units?$/i.test(unitLabel)) return currency;
  if (/^thousands?$/i.test(unitLabel)) return `thousand ${currency}`;
  if (/^millions?$/i.test(unitLabel)) return `million ${currency}`;
  return `${unitLabel} ${currency}`;
}

function sourceScaleFormula(
  reportedValue: number,
  unitLabel: string,
  unitScale: number,
  currency: string,
  fullValue: number,
) {
  return `${auditNumber(reportedValue)} ${fin2ReportedUnitName(unitLabel, unitScale, currency)} × ${auditNumber(unitScale)} = ${auditNumber(fullValue)} ${currency}`;
}

function mappingForYear(
  dataset: CanonicalFinancialDataset,
  displayYear: string,
  comparisonCurrency: FinPresentationCurrency,
): Fin2TurnoverMapping {
  const id = `fin2:annual_turnover:${displayYear}`;
  const value = dataset.values.find((candidate) => candidate.field === "total_revenue" && candidate.displayYear === displayYear);
  const problem = dataset.issues.find((issue) => issue.field === "total_revenue" && issue.displayYear === displayYear && ["mapping-problem", "extraction-problem"].includes(issue.type));
  const sourceIds = value?.sourceIds ?? problem?.sourceIds ?? [];
  const sources = dataset.sources.filter((source) => sourceIds.includes(source.sourceId));
  const originalLabels = Array.from(new Set(sources.map((source) => source.originalLabel)));
  const originalPeriods = Array.from(new Set(sources.map((source) => source.originalPeriod)));
  const sourcePages = Array.from(new Set(sources.flatMap((source) => source.page === null ? [] : [source.page]))).sort((left, right) => left - right);
  const rawReportedValues = Array.from(new Set(sources.flatMap((source) => source.rawReportedValue === undefined ? [] : [source.rawReportedValue])));
  const fileName = sources[0]?.fileName ?? dataset.documents.find((document) => document.eligibleForGeneratedFinValues)?.fileName ?? "Eligible financial source";
  const sourceUnitScale = value?.unitScale ?? dataset.unitScale;
  const sourceReportedValue = value?.value === null || value?.value === undefined ? null : value.value / sourceUnitScale;
  const scaleFormula = sourceReportedValue === null || value?.value === null || value?.value === undefined
    ? null
    : sourceScaleFormula(sourceReportedValue, dataset.unitLabel, sourceUnitScale, value.currency, value.value);

  const base = {
    id,
    field: "annual_turnover" as const,
    label: "Annual Turnover" as const,
    displayYear,
    sourceReportedValue,
    sourceValue: value?.value ?? null,
    sourceCurrency: value?.currency ?? dataset.currency,
    sourceUnitLabel: dataset.unitLabel,
    sourceUnitScale,
    sourceIds,
    sourceSummary: sourceSummary(fileName, originalLabels, sourcePages),
    originalLabels,
    originalPeriods,
    sourcePages,
    rawReportedValues,
    sourceScaleFormula: scaleFormula,
    comparisonCurrency,
    comparisonUnitScale: 1 as const,
  };

  if (!value) {
    const reviewRequired = problem?.type === "mapping-problem";
    return {
      ...base,
      sourceProvenance: reviewRequired ? "MAPPING_REVIEW_REQUIRED" : "MISSING",
      exchangeRate: null,
      sourceUnitsPerComparisonUnit: null,
      convertedValue: null,
      convertedProvenance: "MISSING",
      conversionFormula: null,
      status: reviewRequired ? "mapping-review-required" : problem?.type === "extraction-problem" ? "extraction-problem" : "missing",
      action: problem?.action ?? "Provide turnover/revenue evidence for this financial year",
      sourceSummary: problem?.message ?? "Turnover/revenue evidence is unavailable in the eligible financial source",
    };
  }

  if (value.status !== "ready") {
    return {
      ...base,
      sourceProvenance: value.provenance,
      exchangeRate: null,
      sourceUnitsPerComparisonUnit: null,
      convertedValue: null,
      convertedProvenance: "MISSING",
      conversionFormula: null,
      status: value.status === "extraction-problem" ? "extraction-problem" : "mapping-review-required",
      action: "Review the source turnover mapping before conversion",
    };
  }

  const resolvedRate = resolveFinancialFxRate(value.currency, comparisonCurrency, displayYear, "closing");
  if (!resolvedRate) {
    return {
      ...base,
      sourceProvenance: value.provenance,
      exchangeRate: null,
      sourceUnitsPerComparisonUnit: null,
      convertedValue: null,
      convertedProvenance: "MISSING",
      conversionFormula: null,
      status: "fx-rate-missing",
      action: `Provide and approve an authorized ${value.currency}/${comparisonCurrency} year-end rate for ${displayYear}`,
    };
  }

  const convertedValue = value.value * resolvedRate.rate;
  const sourceUnitsPerComparisonUnit = 1 / resolvedRate.rate;
  const conversionFormula = `${scaleFormula}; ${auditNumber(value.value)} ${value.currency} × ${auditNumber(resolvedRate.rate)} ${comparisonCurrency}/${value.currency}${value.currency === comparisonCurrency ? " (identity)" : ""} = ${auditNumber(convertedValue)} ${comparisonCurrency}`;
  return {
    ...base,
    sourceProvenance: value.provenance,
    exchangeRate: resolvedRate.evidence,
    sourceUnitsPerComparisonUnit,
    convertedValue,
    convertedProvenance: "CALCULATED",
    conversionFormula,
    status: "ready",
    action: null,
  };
}

export function generateFin2(dataset: CanonicalFinancialDataset, options: GenerateFin2Options): Fin2Form {
  const turnoverYears = Array.from(new Set([
    ...dataset.values.filter((value) => value.field === "total_revenue").map((value) => value.displayYear),
    ...dataset.issues.filter((issue) => issue.field === "total_revenue" && issue.displayYear).map((issue) => issue.displayYear as string),
  ]));
  // Once the source exposes turnover-specific years, FIN-2 must not inherit an
  // unrelated balance-only period and turn it into a false blocker. A balance-
  // year fallback remains useful only when no income/turnover evidence exists,
  // because it tells the reviewer which historical statements are still needed.
  const fin2Years = (turnoverYears.length ? turnoverYears : dataset.availableYears)
    .sort((left, right) => Number(left) - Number(right));
  const mappings = fin2Years.map((year) => mappingForYear(dataset, year, options.comparisonCurrency));
  const eligible = mappings.filter((mapping) => mapping.status === "ready" && mapping.convertedValue !== null);
  const problemYears = mappings.filter((mapping) => ["mapping-review-required", "extraction-problem", "fx-rate-missing"].includes(mapping.status)).length;
  const missingYears = mappings.filter((mapping) => mapping.status === "missing").length;
  const requiredYears = options.requiredYearCount && options.requiredYearCount > 0 ? Math.floor(options.requiredYearCount) : null;
  const coverageStatus = requiredYears === null
    ? "not-specified"
    : eligible.length >= requiredYears ? "sufficient" : "insufficient";
  const administrative = options.administrative ?? {};
  const biddingProcess = userField(administrative.biddingProcess);
  const invitationNumber = userField(administrative.invitationNumber);
  const purchaser = userField(administrative.purchaser);
  const missingAdministrativeFields = [
    ["Bidding process", biddingProcess],
    ["Invitation number", invitationNumber],
    ["Purchaser", purchaser],
  ].filter(([, field]) => (field as Fin2AdministrativeField).provenance === "MISSING").map(([label]) => label as string);
  const canGenerate = eligible.length > 0 && problemYears === 0;
  const complete = canGenerate && missingYears === 0 && missingAdministrativeFields.length === 0 && coverageStatus !== "insufficient";
  const readinessStatus = !canGenerate ? "not-ready" : complete ? "ready" : "partial";
  const yearsIncluded = eligible.map((mapping) => mapping.displayYear);
  const average = eligible.length
    ? eligible.reduce((sum, mapping) => sum + (mapping.convertedValue ?? 0), 0) / eligible.length
    : null;

  return {
    schemaVersion: FIN2_SCHEMA_VERSION,
    templateId: "FIN-2",
    title: "Size of Operation (Average Annual Turnover)",
    bidderModel: "SINGLE_BIDDER",
    bidder: { value: dataset.entity, provenance: "SOURCE" },
    biddingProcess,
    invitationNumber,
    purchaser,
    sourceCurrency: dataset.currency,
    sourceUnitLabel: dataset.unitLabel,
    sourceUnitScale: dataset.unitScale,
    comparisonCurrency: options.comparisonCurrency,
    comparisonUnitLabel: "units",
    comparisonUnitScale: 1,
    exchangeRateBasis: "closing",
    years: fin2Years,
    mappings,
    averageAnnualTurnover: {
      value: average,
      currency: options.comparisonCurrency,
      unitScale: 1,
      provenance: average === null ? "MISSING" : "CALCULATED",
      yearsIncluded,
      mappingIds: eligible.map((mapping) => mapping.id),
      formula: average === null
        ? "No eligible converted annual-turnover values are available"
        : `Average of full-unit ${options.comparisonCurrency} equivalents after source-unit scaling and FX: (${eligible.map((mapping) => `${auditNumber(mapping.convertedValue ?? 0)} ${options.comparisonCurrency}`).join(" + ")}) ÷ ${eligible.length} = ${auditNumber(average)} ${options.comparisonCurrency}`,
    },
    readiness: {
      status: readinessStatus,
      canGenerate,
      readyYears: eligible.length,
      missingYears,
      problemYears,
      missingAdministrativeFields,
      message: !canGenerate
        ? problemYears > 0
          ? "FIN-2 cannot be generated until the turnover mapping or exchange-rate blockers are resolved."
          : "FIN-2 needs at least one legitimate Annual Turnover value from an eligible financial source."
        : complete
          ? "FIN-2 is ready from source-driven turnover evidence and auditable year-end exchange rates."
          : "FIN-2 can be generated with declared administrative or historical-coverage gaps.",
    },
    coverage: {
      availableYears: fin2Years.length,
      eligibleTurnoverYears: eligible.length,
      requiredYears,
      status: coverageStatus,
      message: requiredYears === null
        ? `${eligible.length} source-driven turnover year${eligible.length === 1 ? " is" : "s are"} available; no tender-specific requirement is set.`
        : coverageStatus === "sufficient"
          ? `${eligible.length}/${requiredYears} required turnover years are supported.`
          : `${eligible.length}/${requiredYears} required turnover years are supported; additional turnover evidence is required.`,
    },
    fxDataset: cbuFinFxMetadata(),
  };
}

export function prepareFin2FromCanonicalDataset(dataset: CanonicalFinancialDataset, options: GenerateFin2Options) {
  return generateFin2(dataset, options);
}

export function fin2ToCsv(form: Fin2Form) {
  const rows: Array<Array<string | number>> = [
    ["Form", form.templateId],
    ["Bidder", form.bidder.value ?? "MISSING"],
    ["Bidding process", form.biddingProcess.value ?? "MISSING"],
    ["Invitation number", form.invitationNumber.value ?? "MISSING"],
    ["Purchaser", form.purchaser.value ?? "MISSING"],
    [],
    ["Year", "Original reported amount", "Source currency", "Source unit", "Source unit scale", "Full source-currency amount", "Original label", `FX rate (${form.comparisonCurrency} per ${form.sourceCurrency})`, `Published quote (${form.sourceCurrency} per ${form.comparisonCurrency})`, "Rate basis/date", `Full ${form.comparisonCurrency} equivalent`, "Conversion formula", "Source", "Status"],
    ...form.mappings.map((mapping) => [
      mapping.displayYear,
      mapping.sourceReportedValue ?? "MISSING",
      mapping.sourceCurrency,
      mapping.sourceUnitLabel,
      mapping.sourceUnitScale,
      mapping.sourceValue ?? "MISSING",
      mapping.originalLabels.join(" / "),
      mapping.exchangeRate?.targetUnitsPerSourceUnit ?? "MISSING",
      mapping.sourceUnitsPerComparisonUnit ?? "MISSING",
      mapping.exchangeRate ? `${mapping.exchangeRate.rateType}${mapping.exchangeRate.closingDate ? ` · ${mapping.exchangeRate.closingDate}` : ""}` : "MISSING",
      mapping.convertedValue ?? "MISSING",
      mapping.conversionFormula ?? "MISSING",
      mapping.sourceSummary,
      mapping.status,
    ]),
    [],
    ["Average Annual Turnover (full target-currency units)", form.averageAnnualTurnover.value ?? "MISSING", form.comparisonCurrency, "units", form.averageAnnualTurnover.formula],
  ];
  const escape = (value: string | number) => `"${String(value).replace(/"/g, '""')}"`;
  return rows.map((row) => row.map(escape).join(",")).join("\n");
}

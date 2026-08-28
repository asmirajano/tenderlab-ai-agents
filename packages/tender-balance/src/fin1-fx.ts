import cbuFinFxJson from "./data/cbu-fin-fx-2015-2025.json" with { type: "json" };
import type { Fin1FieldId, Fin1Form, Fin1Mapping, FinancialProvenance } from "./fin-forms.ts";

export const FIN1_FX_PRESENTATION_VERSION = "1.0.0";

export type FinPresentationCurrency = "USD" | "EUR";
export type FinancialFxRateType = "closing" | "average" | "identity";
export type Fin1PresentationCurrency = FinPresentationCurrency;
export type Fin1FxRateType = FinancialFxRateType;

type CbuTargetRate = {
  average: number;
  closing: number;
  closingDate: string;
  observationCount: number;
};

type CbuCurrencyRecord = {
  numericCode: string | null;
  name: string;
  years: Record<string, Partial<Record<Fin1PresentationCurrency, CbuTargetRate>>>;
};

type CbuFinFxDataset = {
  schemaVersion: string;
  datasetId: string;
  provider: string;
  providerArchiveUrl: string;
  providerApiDocumentationUrl: string;
  retrievedAt: string;
  range: { from: string; to: string };
  targetCurrencies: Fin1PresentationCurrency[];
  methodology: {
    quote: string;
    closing: string;
    average: string;
    sourceNormalization: string;
  };
  normalizedObservationCount: number;
  normalizedObservationSha256: string;
  currencies: Record<string, CbuCurrencyRecord>;
};

export type FinancialFxEvidence = {
  version: typeof FIN1_FX_PRESENTATION_VERSION;
  provenance: "CALCULATED";
  provider: string;
  datasetId: string;
  datasetSha256: string;
  providerArchiveUrl: string;
  sourceCurrency: string;
  targetCurrency: FinPresentationCurrency;
  year: string;
  rateType: FinancialFxRateType;
  targetUnitsPerSourceUnit: number;
  closingDate: string | null;
  observationCount: number;
  formula: string;
};

export type Fin1FxEvidence = FinancialFxEvidence;

export type PresentedFin1Mapping = Omit<Fin1Mapping, "provenance"> & {
  provenance: FinancialProvenance | null;
  sourceValue: number | null;
  sourceCurrency: string;
  sourceUnitScale: number;
  sourceProvenance: FinancialProvenance | null;
  sourceReportedValue: number | null;
  sourceCalculatedValue: number | null;
  sourceDifference: number | null;
  fx: Fin1FxEvidence | null;
};

export type PresentedFin1Form = Omit<Fin1Form, "mappings"> & {
  presentationVersion: typeof FIN1_FX_PRESENTATION_VERSION;
  sourceCurrency: string;
  sourceUnitLabel: string;
  sourceUnitScale: number;
  currency: Fin1PresentationCurrency;
  unitLabel: "thousands";
  unitScale: 1_000;
  mappings: PresentedFin1Mapping[];
  fxDataset: {
    provider: string;
    datasetId: string;
    retrievedAt: string;
    range: CbuFinFxDataset["range"];
    normalizedObservationSha256: string;
    methodology: CbuFinFxDataset["methodology"];
  };
};

export type Fin1PresentationResult = {
  status: "ready" | "unavailable";
  targetCurrency: Fin1PresentationCurrency;
  form: PresentedFin1Form | null;
  issues: Array<{
    id: string;
    year?: string;
    field?: Fin1FieldId;
    message: string;
    action: string;
  }>;
};

const cbuFinFx = cbuFinFxJson as unknown as CbuFinFxDataset;
const INCOME_FIELDS = new Set<Fin1FieldId>(["total_revenue", "profit_before_tax", "profit_after_tax"]);

function fxRateType(field: Fin1FieldId): Exclude<Fin1FxRateType, "identity"> {
  return INCOME_FIELDS.has(field) ? "average" : "closing";
}

function convertNullable(value: number | null, rate: number) {
  return value === null ? null : value * rate;
}

export function resolveFinancialFxRate(
  sourceCurrencyInput: string,
  targetCurrency: FinPresentationCurrency,
  year: string,
  rateTypeInput: Exclude<FinancialFxRateType, "identity">,
) {
  const sourceCurrency = sourceCurrencyInput.trim().toUpperCase();
  if (sourceCurrency === targetCurrency) {
    return {
      rate: 1,
      evidence: {
        version: FIN1_FX_PRESENTATION_VERSION,
        provenance: "CALCULATED" as const,
        provider: "Identity conversion",
        datasetId: cbuFinFx.datasetId,
        datasetSha256: cbuFinFx.normalizedObservationSha256,
        providerArchiveUrl: cbuFinFx.providerArchiveUrl,
        sourceCurrency,
        targetCurrency,
        year,
        rateType: "identity" as const,
        targetUnitsPerSourceUnit: 1,
        closingDate: null,
        observationCount: 0,
        formula: `1 ${sourceCurrency} = 1 ${targetCurrency}`,
      },
    };
  }

  const rateType = rateTypeInput;
  const rateRecord = cbuFinFx.currencies[sourceCurrency]?.years[year]?.[targetCurrency];
  const rate = rateRecord?.[rateType];
  if (!rateRecord || !Number.isFinite(rate) || !(rate > 0)) return null;
  return {
    rate,
    evidence: {
      version: FIN1_FX_PRESENTATION_VERSION,
      provenance: "CALCULATED" as const,
      provider: cbuFinFx.provider,
      datasetId: cbuFinFx.datasetId,
      datasetSha256: cbuFinFx.normalizedObservationSha256,
      providerArchiveUrl: cbuFinFx.providerArchiveUrl,
      sourceCurrency,
      targetCurrency,
      year,
      rateType,
      targetUnitsPerSourceUnit: rate,
      closingDate: rateType === "closing" ? rateRecord.closingDate : null,
      observationCount: rateRecord.observationCount,
      formula: `${sourceCurrency} amount × ${rate.toPrecision(12)} ${targetCurrency}/${sourceCurrency}`,
    },
  };
}

function rateFor(sourceCurrency: string, targetCurrency: Fin1PresentationCurrency, year: string, field: Fin1FieldId) {
  return resolveFinancialFxRate(sourceCurrency, targetCurrency, year, fxRateType(field));
}

export function cbuFinFxMetadata() {
  return {
    provider: cbuFinFx.provider,
    datasetId: cbuFinFx.datasetId,
    retrievedAt: cbuFinFx.retrievedAt,
    range: cbuFinFx.range,
    normalizedObservationCount: cbuFinFx.normalizedObservationCount,
    normalizedObservationSha256: cbuFinFx.normalizedObservationSha256,
    supportedCurrencies: Object.keys(cbuFinFx.currencies).sort(),
  };
}

export function prepareFin1Presentation(form: Fin1Form, targetCurrency: Fin1PresentationCurrency): Fin1PresentationResult {
  const sourceCurrency = form.currency.trim().toUpperCase();
  const issues: Fin1PresentationResult["issues"] = [];

  if (!sourceCurrency || sourceCurrency === "UNSPECIFIED") {
    issues.push({
      id: "fx:source-currency-missing",
      message: "The source currency is not confirmed, so FIN-1 cannot be converted truthfully.",
      action: "Confirm the source document currency",
    });
  } else if (sourceCurrency !== targetCurrency && !cbuFinFx.currencies[sourceCurrency]) {
    issues.push({
      id: `fx:unsupported-source:${sourceCurrency}`,
      message: `${sourceCurrency} is not available in the saved CBU 2015–2025 FIN exchange-rate dataset.`,
      action: "Provide an authorized historical rate or use a supported source currency",
    });
  }

  const convertedMappings: PresentedFin1Mapping[] = form.mappings.map((mapping) => {
    if (mapping.value === null) {
      return {
        ...mapping,
        currency: targetCurrency,
        unitScale: 1_000,
        sourceValue: null,
        sourceCurrency: mapping.currency,
        sourceUnitScale: mapping.unitScale,
        sourceProvenance: mapping.provenance,
        sourceReportedValue: mapping.reportedValue,
        sourceCalculatedValue: mapping.calculatedValue,
        sourceDifference: mapping.difference,
        fx: null,
      } as PresentedFin1Mapping;
    }
    const rate = rateFor(sourceCurrency, targetCurrency, mapping.displayYear, mapping.field);
    if (!rate) {
      issues.push({
        id: `fx:rate-missing:${mapping.field}:${mapping.displayYear}:${targetCurrency}`,
        year: mapping.displayYear,
        field: mapping.field,
        message: `No saved ${targetCurrency} ${fxRateType(mapping.field)} rate is available for ${sourceCurrency} in ${mapping.displayYear}.`,
        action: "Provide and approve an authorized historical rate",
      });
      return {
        ...mapping,
        value: null,
        currency: targetCurrency,
        unitScale: 1_000,
        provenance: null,
        sourceValue: mapping.value,
        sourceCurrency: mapping.currency,
        sourceUnitScale: mapping.unitScale,
        sourceProvenance: mapping.provenance,
        sourceReportedValue: mapping.reportedValue,
        sourceCalculatedValue: mapping.calculatedValue,
        sourceDifference: mapping.difference,
        fx: null,
        status: "missing",
        problemType: "source-data-gap",
        action: "Provide and approve an authorized historical rate",
      };
    }
    return {
      ...mapping,
      value: mapping.value * rate.rate,
      currency: targetCurrency,
      unitScale: 1_000,
      provenance: rate.evidence.rateType === "identity" ? mapping.provenance : "CALCULATED",
      sourceValue: mapping.value,
      sourceCurrency: mapping.currency,
      sourceUnitScale: mapping.unitScale,
      sourceProvenance: mapping.provenance,
      sourceReportedValue: mapping.reportedValue,
      sourceCalculatedValue: mapping.calculatedValue,
      sourceDifference: mapping.difference,
      reportedValue: convertNullable(mapping.reportedValue, rate.rate),
      calculatedValue: convertNullable(mapping.calculatedValue, rate.rate),
      difference: convertNullable(mapping.difference, rate.rate),
      fx: rate.evidence,
    };
  });

  const uniqueIssues = issues.filter((issue, index) => issues.findIndex((candidate) => candidate.id === issue.id) === index);
  if (uniqueIssues.length) return { status: "unavailable", targetCurrency, form: null, issues: uniqueIssues };

  return {
    status: "ready",
    targetCurrency,
    issues: [],
    form: {
      ...form,
      presentationVersion: FIN1_FX_PRESENTATION_VERSION,
      sourceCurrency: form.currency,
      sourceUnitLabel: form.unitLabel,
      sourceUnitScale: form.unitScale,
      currency: targetCurrency,
      unitLabel: "thousands",
      unitScale: 1_000,
      mappings: convertedMappings,
      fxDataset: {
        provider: cbuFinFx.provider,
        datasetId: cbuFinFx.datasetId,
        retrievedAt: cbuFinFx.retrievedAt,
        range: cbuFinFx.range,
        normalizedObservationSha256: cbuFinFx.normalizedObservationSha256,
        methodology: cbuFinFx.methodology,
      },
    },
  };
}

import { incotermProfiles, isSellerPaid, validateTermMode } from "./incoterms.ts";
import type {
  AllocatedContractLine,
  CalculationInput,
  CalculationResult,
  CalculationWarning,
  ComponentTreatment,
  ContractBoundaryOverride,
  ContractLine,
  CostComponentCode,
  CostLine,
  EvidenceKind,
  ExchangeRate,
  IncotermCode,
  LogisticsScope,
  ResponsibilitySummary,
} from "./types.ts";

export const LOGISTICS_COSTING_ENGINE_VERSION = "0.1.0";

export const componentLabels: Record<CostComponentCode, string> = {
  export_packing: "Export packing / crating",
  origin_loading: "Origin loading",
  origin_pickup: "Inland pickup",
  origin_terminal: "Origin terminal charges",
  vessel_loading: "Vessel loading / on-board handling",
  export_clearance: "Export clearance / documents",
  main_freight: "Main international freight",
  transit_handling: "Transit / border handling",
  transshipment: "Transshipment",
  insurance: "Cargo insurance",
  destination_terminal: "Destination terminal charges",
  import_clearance: "Import clearance",
  duty: "Customs duty",
  vat_tax: "VAT / import taxes",
  final_delivery: "Final delivery",
  destination_unloading: "Destination unloading",
  cold_chain: "Cold-chain treatment",
  dangerous_goods: "Dangerous-goods handling",
  battery_refrigerant: "Battery / refrigerant declarations",
  oversized_nonstackable: "Oversized / non-stackable treatment",
  inspection_permit: "Inspections / permits",
  storage: "Storage",
  demurrage_detention: "Demurrage / detention",
  contingency: "Contingency / rate-validity allowance",
};

export const logisticsScopeComponents: Record<Exclude<LogisticsScope, "custom">, CostComponentCode[]> = {
  "factory-to-terminal": ["origin_loading", "origin_pickup", "origin_terminal", "export_clearance"],
  "port-to-port": ["origin_terminal", "vessel_loading", "export_clearance", "main_freight", "transshipment", "destination_terminal"],
  "airport-to-airport": ["origin_terminal", "export_clearance", "main_freight", "transshipment", "destination_terminal"],
  "terminal-to-terminal": ["origin_terminal", "main_freight", "transit_handling", "transshipment", "destination_terminal"],
  "door-to-door": ["origin_loading", "origin_pickup", "origin_terminal", "vessel_loading", "export_clearance", "main_freight", "transit_handling", "transshipment", "destination_terminal", "import_clearance", "final_delivery", "destination_unloading"],
  "domestic-delivery": ["final_delivery", "destination_unloading"],
  "international-freight": ["main_freight", "transit_handling", "transshipment"],
  "export-side": ["export_packing", "origin_loading", "origin_pickup", "origin_terminal", "vessel_loading", "export_clearance"],
  "import-side": ["destination_terminal", "import_clearance", "duty", "vat_tax", "final_delivery", "destination_unloading"],
  "contract-logistics-ex-duty-tax": ["export_packing", "origin_loading", "origin_pickup", "origin_terminal", "vessel_loading", "export_clearance", "main_freight", "transit_handling", "transshipment", "insurance", "destination_terminal", "final_delivery", "destination_unloading", "cold_chain", "dangerous_goods", "battery_refrigerant", "oversized_nonstackable", "inspection_permit", "storage", "demurrage_detention", "contingency"],
  "landed-cost-including-duty-tax": ["export_packing", "origin_loading", "origin_pickup", "origin_terminal", "vessel_loading", "export_clearance", "main_freight", "transit_handling", "transshipment", "insurance", "destination_terminal", "import_clearance", "duty", "vat_tax", "final_delivery", "destination_unloading", "cold_chain", "dangerous_goods", "battery_refrigerant", "oversized_nonstackable", "inspection_permit", "storage", "demurrage_detention", "contingency"],
};

const dutiesTaxComponents = new Set<CostComponentCode>(["import_clearance", "duty", "vat_tax"]);
const specialComponents = new Set<CostComponentCode>(["cold_chain", "dangerous_goods", "battery_refrigerant", "oversized_nonstackable", "inspection_permit", "storage", "demurrage_detention", "contingency"]);

export function roundMoney(value: number) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

function exchange(line: CostLine, targetCurrency: string, rates: ExchangeRate[], warnings: CalculationWarning[]) {
  if (line.currency === targetCurrency) return line.amount;
  const direct = rates.find((rate) => rate.from === line.currency && rate.to === targetCurrency && Number.isFinite(rate.rate) && rate.rate > 0);
  const inverse = rates.find((rate) => rate.from === targetCurrency && rate.to === line.currency && Number.isFinite(rate.rate) && rate.rate > 0);
  if (direct) {
    if (direct.confidence === "provisional" || direct.confidence === "low") warnings.push({ code: "PROVISIONAL_FX", severity: "warning", message: `${line.label} uses ${direct.confidence} FX ${direct.from}/${direct.to} ${direct.rate} dated ${direct.asOf}.` });
    return line.amount * direct.rate;
  }
  if (inverse && inverse.rate !== 0) {
    if (inverse.confidence === "provisional" || inverse.confidence === "low") warnings.push({ code: "PROVISIONAL_FX", severity: "warning", message: `${line.label} uses inverse ${inverse.confidence} FX ${inverse.from}/${inverse.to} ${inverse.rate} dated ${inverse.asOf}.` });
    return line.amount / inverse.rate;
  }
  warnings.push({ code: "MISSING_FX", severity: "blocking", message: `No exchange rate converts ${line.currency} to ${targetCurrency} for ${line.label}.` });
  return 0;
}

function responsibility(term: IncotermCode, namedPlace: string, overrides: ContractBoundaryOverride[] = []): ResponsibilitySummary {
  const profile = incotermProfiles[term];
  const standard: ResponsibilitySummary = {
    term,
    namedPlace,
    deliveryPoint: profile.deliveryPoint,
    riskTransferPoint: profile.riskTransferPoint,
    costBoundary: profile.costBoundary,
    exportClearance: profile.exportClearance,
    importClearance: profile.importClearance,
    loading: profile.loading,
    unloading: profile.unloading,
    carriage: profile.carriage,
    insurance: profile.insurance,
    basis: "standard-rule",
    contractDeviations: [],
  };
  return overrides.reduce<ResponsibilitySummary>((current, override) => ({
    ...current,
    namedPlace: override.namedPlace ?? current.namedPlace,
    deliveryPoint: override.deliveryPoint ?? current.deliveryPoint,
    riskTransferPoint: override.riskTransferPoint ?? current.riskTransferPoint,
    costBoundary: override.costBoundary ?? current.costBoundary,
    exportClearance: override.exportClearance ?? current.exportClearance,
    importClearance: override.importClearance ?? current.importClearance,
    loading: override.loading ?? current.loading,
    unloading: override.unloading ?? current.unloading,
    carriage: override.carriage ?? current.carriage,
    insurance: override.insurance ?? current.insurance,
    basis: "contract-modified",
    contractDeviations: [...current.contractDeviations, { description: override.description, ...(override.sourceRef ? { sourceRef: override.sourceRef } : {}) }],
  }), standard);
}

function inclusionFor(
  input: CalculationInput,
  line: CostLine,
  side: "start" | "target",
): { included: boolean; basis: ComponentTreatment["inclusionBasis"] } {
  const override = input.contractOverrides?.find((candidate) => {
    const overrideValue = side === "start" ? candidate.startIncluded : candidate.targetIncluded;
    return candidate.component === line.component && overrideValue !== undefined;
  });
  if (override) {
    const overrideValue = side === "start" ? override.startIncluded : override.targetIncluded;
    return { included: Boolean(overrideValue), basis: "contract-override" };
  }
  const lineValue = side === "start" ? line.startIncluded : line.targetIncluded;
  if (lineValue !== undefined) return { included: lineValue, basis: "cost-line" };

  if (input.mode === "logistics-only") {
    const scope = input.logisticsScope ?? "custom";
    const selected = input.logisticsScopeIncoterm
      ? incotermProfiles[input.logisticsScopeIncoterm].sellerPaidComponents
      : scope === "custom" ? input.customScopeComponents ?? [] : logisticsScopeComponents[scope];
    return { included: side === "target" && selected.includes(line.component), basis: "logistics-scope" };
  }

  const term = side === "start" ? input.sourceTerm : input.targetTerm!;
  if (specialComponents.has(line.component)) return { included: false, basis: "standard-rule" };
  return { included: isSellerPaid(term, line.component), basis: "standard-rule" };
}

function insuranceRequired(term?: IncotermCode) {
  return term === "CIP" || term === "CIF";
}

function computedInsurancePremium(preInsuranceValue: number, premiumRate: number, coverageFactor: number, basis: "final-contract-value" | "cost-before-insurance") {
  if (premiumRate <= 0 || coverageFactor <= 0) return 0;
  const factor = premiumRate * coverageFactor;
  if (basis === "cost-before-insurance") return roundMoney(preInsuranceValue * factor);
  if (factor >= 1) return Number.NaN;
  return roundMoney(preInsuranceValue * factor / (1 - factor));
}

export function calculateScenario(input: CalculationInput): CalculationResult {
  const warnings: CalculationWarning[] = [];
  const targetTerm = input.mode === "incoterm-conversion" ? input.targetTerm : undefined;
  const sourceModeWarning = validateTermMode(input.sourceTerm, input.transportMode);
  if (sourceModeWarning) warnings.push({ code: "INVALID_SOURCE_TERM_MODE", severity: "blocking", message: sourceModeWarning });
  if (input.mode === "incoterm-conversion" && !targetTerm) warnings.push({ code: "MISSING_TARGET_TERM", severity: "blocking", message: "A target Incoterm is required for conversion." });
  if (targetTerm) {
    const targetModeWarning = validateTermMode(targetTerm, input.transportMode);
    if (targetModeWarning) warnings.push({ code: "INVALID_TARGET_TERM_MODE", severity: "blocking", message: targetModeWarning });
  }
  if (!Number.isFinite(input.sourceContractTotal) || input.sourceContractTotal < 0) warnings.push({ code: "INVALID_SOURCE_TOTAL", severity: "blocking", message: "Source contract total must be a non-negative number." });
  const lineIds = new Set<string>();
  for (const line of input.costLines) {
    if (lineIds.has(line.id)) warnings.push({ code: "DUPLICATE_COST_LINE_ID", severity: "blocking", message: `Cost line ID ${line.id} is duplicated; each auditable service line needs a stable unique identity.` });
    lineIds.add(line.id);
    if (!Number.isFinite(line.amount) || line.amount < 0) warnings.push({ code: "INVALID_COST_AMOUNT", severity: "blocking", message: `${line.label} must have a finite, non-negative amount.` });
    if (!line.currency.trim()) warnings.push({ code: "MISSING_COST_CURRENCY", severity: "blocking", message: `${line.label} has no currency.` });
  }
  if (!input.sourceNamedPlace.trim()) warnings.push({ code: "MISSING_SOURCE_PLACE", severity: "warning", message: "Starting named place is missing; delivery and risk boundaries remain provisional." });
  if (targetTerm && !input.targetNamedPlace?.trim()) warnings.push({ code: "MISSING_TARGET_PLACE", severity: "warning", message: "Target named place is missing; delivery and cost boundaries remain provisional." });

  const rates = input.exchangeRates ?? [];
  for (const rate of rates) {
    if (!Number.isFinite(rate.rate) || rate.rate <= 0) warnings.push({ code: "INVALID_FX_RATE", severity: "blocking", message: `${rate.from}/${rate.to} exchange rate must be a positive finite number.` });
    if (!rate.asOf.trim()) warnings.push({ code: "MISSING_FX_DATE", severity: "blocking", message: `${rate.from}/${rate.to} exchange rate has no as-of date.` });
    if (!rate.source.trim()) warnings.push({ code: "MISSING_FX_SOURCE", severity: "warning", message: `${rate.from}/${rate.to} exchange rate has no source.` });
  }
  const treatments: ComponentTreatment[] = input.costLines.map((line) => {
    const start = input.mode === "logistics-only" ? { included: false, basis: "logistics-scope" as const } : inclusionFor(input, line, "start");
    const target = inclusionFor(input, line, "target");
    const amount = roundMoney(exchange(line, input.currency, rates, warnings));
    const treatment = start.included && target.included ? "retained" : start.included ? "removed" : target.included ? "added" : "excluded";
    const override = input.contractOverrides?.find((candidate) => candidate.component === line.component);
    return {
      lineId: line.id,
      component: line.component,
      label: line.label,
      amount,
      originalAmount: line.amount,
      originalCurrency: line.currency,
      currency: input.currency,
      sourceRef: line.sourceRef,
      rateDate: line.rateDate,
      startIncluded: start.included,
      targetIncluded: target.included,
      treatment,
      inclusionBasis: target.basis === "contract-override" || start.basis === "contract-override" ? "contract-override" : target.basis,
      evidenceKind: line.evidenceKind,
      confidence: line.confidence,
      note: override ? `${override.description}${override.sourceRef ? ` (${override.sourceRef})` : ""}` : line.note,
    };
  });

  const explicitInsurance = treatments.find((line) => line.component === "insurance");
  const addedBeforeInsurance = treatments.filter((line) => line.treatment === "added" && line.component !== "insurance").reduce((sum, line) => sum + line.amount, 0);
  const removedBeforeInsurance = treatments.filter((line) => line.treatment === "removed" && line.component !== "insurance").reduce((sum, line) => sum + line.amount, 0);
  let insurance = explicitInsurance?.treatment === "added" ? explicitInsurance.amount : 0;

  const scopeIncludesInsurance = input.mode === "logistics-only" && inclusionFor(input, { id: "scope-insurance", component: "insurance", label: "Insurance", amount: 0, currency: input.currency, evidenceKind: "calculation", confidence: "provisional" }, "target").included;
  const needsTargetInsurance = targetTerm ? insuranceRequired(targetTerm) : scopeIncludesInsurance;
  const hasExplicitInsuranceAmount = Boolean(explicitInsurance?.targetIncluded && explicitInsurance.amount > 0);
  if (needsTargetInsurance && !hasExplicitInsuranceAmount) {
    if (!input.insurance?.enabled) {
      warnings.push({ code: "MISSING_INSURANCE_BASIS", severity: targetTerm && insuranceRequired(targetTerm) ? "blocking" : "warning", message: `${targetTerm ?? "Selected logistics scope"} requires an insurance amount or an enabled premium model.` });
    } else {
      const preInsuranceValue = input.sourceContractTotal + addedBeforeInsurance - removedBeforeInsurance;
      insurance = computedInsurancePremium(preInsuranceValue, input.insurance.premiumRate, input.insurance.coverageFactor, input.insurance.basis);
      if (!Number.isFinite(insurance)) {
        insurance = 0;
        warnings.push({ code: "INVALID_INSURANCE_RATE", severity: "blocking", message: "Insurance rate × coverage factor must be below 100% for a final-value basis." });
      } else {
        const computedTreatment: ComponentTreatment = {
          lineId: "computed-insurance",
          component: "insurance",
          label: `${targetTerm ?? "Cargo"} insurance (${input.insurance.clauses ? `Clauses ${input.insurance.clauses}` : "coverage pending"})`,
          amount: insurance,
          originalAmount: insurance,
          originalCurrency: input.currency,
          currency: input.currency,
          startIncluded: false,
          targetIncluded: true,
          treatment: "added",
          inclusionBasis: input.mode === "logistics-only" ? "logistics-scope" : "standard-rule",
          evidenceKind: "calculation",
          confidence: input.insurance.note ? "medium" : "provisional",
          note: `Premium = rate ${(input.insurance.premiumRate * 100).toFixed(3)}% × insured factor ${(input.insurance.coverageFactor * 100).toFixed(0)}%${input.insurance.basis === "final-contract-value" ? ", solved against final contract value" : ""}.`,
        };
        if (explicitInsurance) treatments.splice(treatments.indexOf(explicitInsurance), 1, computedTreatment);
        else treatments.push(computedTreatment);
      }
    }
  }

  if (targetTerm === "CIP" && input.insurance?.clauses && input.insurance.clauses !== "A" && input.insurance.clauses !== "custom") warnings.push({ code: "CIP_INSURANCE_COVER", severity: "warning", message: "CIP Incoterms® 2020 normally requires Clauses (A) or similar cover unless the parties agree otherwise." });
  if (targetTerm === "CIF" && input.insurance?.clauses === "A") warnings.push({ code: "CIF_HIGHER_COVER", severity: "info", message: "CIF defaults to Clauses (C) or similar; higher Clauses (A) cover is an allowed contractual enhancement." });

  if (targetTerm === "DDP") {
    if (!input.importJurisdiction) warnings.push({ code: "DDP_MISSING_JURISDICTION", severity: "blocking", message: "DDP requires the import jurisdiction for duty, tax and clearance validation." });
    if (!input.importerOfRecord) warnings.push({ code: "DDP_MISSING_IOR", severity: "blocking", message: "DDP requires a confirmed seller-side importer of record or lawful equivalent." });
    if (!input.taxRegistrationBasis) warnings.push({ code: "DDP_MISSING_TAX_BASIS", severity: "warning", message: "Tax registration / recovery basis is missing for DDP." });
    for (const component of ["import_clearance", "duty", "vat_tax"] as const) {
      if (!treatments.some((line) => line.component === component && line.targetIncluded && line.amount > 0)) warnings.push({ code: `DDP_MISSING_${component.toUpperCase()}`, severity: "blocking", message: `DDP target has no positive ${componentLabels[component]} line.` });
    }
  }

  if (targetTerm) {
    const representedComponents = new Set(input.costLines.map((line) => line.component));
    const unvaluedAdditions = incotermProfiles[targetTerm].sellerPaidComponents.filter((component) => !isSellerPaid(input.sourceTerm, component) && !representedComponents.has(component) && !(component === "insurance" && input.insurance?.enabled));
    for (const component of unvaluedAdditions) warnings.push({ code: "UNVALUED_ADDED_COST", severity: "warning", message: `${componentLabels[component]} is normally outside ${input.sourceTerm} and inside ${targetTerm}, but no separate amount is available. Confirm that it is bundled in another sourced line or add a valued line.` });
    const unvaluedRemovals = incotermProfiles[input.sourceTerm].sellerPaidComponents.filter((component) => !isSellerPaid(targetTerm, component) && !representedComponents.has(component));
    for (const component of unvaluedRemovals) warnings.push({ code: "UNVALUED_REMOVED_COST", severity: "warning", message: `${componentLabels[component]} is normally in ${input.sourceTerm} but outside ${targetTerm}; no source amount is available to remove, so the reverse-conversion result is incomplete.` });
  }

  if (input.mode === "logistics-only" && !input.logisticsScope && !input.logisticsScopeIncoterm) warnings.push({ code: "MISSING_LOGISTICS_SCOPE", severity: "blocking", message: "Select a logistics scope or use the current Incoterm responsibility boundary for a logistics-only calculation." });
  for (const override of input.contractOverrides ?? []) {
    warnings.push({ code: "CONTRACT_OVERRIDE", severity: "info", message: `Contract deviation preserved: ${componentLabels[override.component]} — ${override.description}` });
  }
  for (const override of input.contractBoundaryOverrides ?? []) {
    const hasBoundaryValue = [override.namedPlace, override.deliveryPoint, override.riskTransferPoint, override.costBoundary, override.exportClearance, override.importClearance, override.loading, override.unloading, override.carriage, override.insurance].some((value) => Boolean(value?.trim()));
    if (!override.description.trim()) warnings.push({ code: "MISSING_BOUNDARY_OVERRIDE_DESCRIPTION", severity: "blocking", message: `The ${override.side} contract-boundary override needs a description or clause basis.` });
    if (!hasBoundaryValue) warnings.push({ code: "EMPTY_BOUNDARY_OVERRIDE", severity: "blocking", message: `The ${override.side} contract-boundary override does not change any responsibility field.` });
    if (override.side === "target" && !targetTerm) warnings.push({ code: "TARGET_BOUNDARY_WITHOUT_TARGET", severity: "blocking", message: "A target responsibility override cannot be applied when no target Incoterm exists." });
    warnings.push({ code: "CONTRACT_BOUNDARY_OVERRIDE", severity: "info", message: `Contract boundary preserved for the ${override.side} basis: ${override.description}${override.sourceRef ? ` (${override.sourceRef})` : ""}` });
  }
  if (treatments.some((line) => line.targetIncluded && (line.confidence === "low" || line.confidence === "provisional"))) warnings.push({ code: "PROVISIONAL_COST_INPUTS", severity: "warning", message: "One or more included cost lines are provisional or low confidence." });

  const addedCosts = roundMoney(treatments.filter((line) => line.treatment === "added").reduce((sum, line) => sum + line.amount, 0));
  const removedCosts = roundMoney(treatments.filter((line) => line.treatment === "removed").reduce((sum, line) => sum + line.amount, 0));
  const retainedCosts = roundMoney(treatments.filter((line) => line.treatment === "retained").reduce((sum, line) => sum + line.amount, 0));
  const dutiesTaxes = roundMoney(treatments.filter((line) => line.treatment === "added" && dutiesTaxComponents.has(line.component)).reduce((sum, line) => sum + line.amount, 0));
  const nonInsuranceAdded = roundMoney(addedCosts - insurance);
  const incrementalCost = roundMoney(addedCosts - removedCosts);
  const revisedContractTotal = roundMoney(input.sourceContractTotal + incrementalCost);
  if (revisedContractTotal < 0) warnings.push({ code: "NEGATIVE_REVISED_TOTAL", severity: "blocking", message: "Removed costs exceed the source contract total; verify source inclusion amounts and currency basis." });
  const evidenceKinds: Record<EvidenceKind, number> = { "sourced-fact": 0, "user-input": 0, assumption: 0, calculation: 0 };
  treatments.forEach((line) => { evidenceKinds[line.evidenceKind] += 1; });
  const status = warnings.some((warning) => warning.severity === "blocking") ? "blocked" : warnings.some((warning) => warning.severity === "warning") ? "provisional" : "ready";

  return {
    id: `${input.id}:result`,
    status,
    mode: input.mode,
    currency: input.currency,
    sourceContractTotal: roundMoney(input.sourceContractTotal),
    sourceTerm: input.sourceTerm,
    targetTerm,
    logisticsScope: input.logisticsScope,
    logisticsScopeIncoterm: input.logisticsScopeIncoterm,
    nonInsuranceAdded,
    insurance: roundMoney(insurance),
    dutiesTaxes,
    retainedCosts,
    addedCosts,
    removedCosts,
    incrementalCost,
    revisedContractTotal,
    logisticsUpliftPercent: input.sourceContractTotal ? Math.round(incrementalCost / input.sourceContractTotal * 10000) / 100 : 0,
    treatments,
    startResponsibilities: responsibility(input.sourceTerm, input.sourceNamedPlace, (input.contractBoundaryOverrides ?? []).filter((override) => override.side === "start")),
    targetResponsibilities: targetTerm ? responsibility(targetTerm, input.targetNamedPlace ?? "Unnamed place", (input.contractBoundaryOverrides ?? []).filter((override) => override.side === "target")) : undefined,
    warnings,
    assumptions: [
      "Incoterms® 2020 standard allocation is used only where no cost-line fact or contractual override exists.",
      "Quoted rates remain subject to validity, route, cargo and carrier confirmation.",
      ...(input.assumptions ?? []),
    ],
    audit: {
      engineVersion: LOGISTICS_COSTING_ENGINE_VERSION,
      calculatedAt: new Date().toISOString(),
      formula: "revised total = source total + added target-scope costs − removed source-scope costs; computed final-value insurance solves premium = rate × cover factor × (pre-insurance value + premium)",
      evidenceKinds,
    },
  };
}

export function allocateResultToContractLines(lines: ContractLine[], result: CalculationResult): AllocatedContractLine[] {
  const sourceTotal = roundMoney(lines.reduce((sum, line) => sum + line.sourcePrice, 0));
  if (!lines.length || sourceTotal === 0) return [];
  const allocate = (total: number, index: number) => {
    if (index === lines.length - 1) {
      const allocatedBefore = lines.slice(0, -1).reduce((sum, line) => sum + roundMoney(total * line.sourcePrice / sourceTotal), 0);
      return roundMoney(total - allocatedBefore);
    }
    return roundMoney(total * lines[index].sourcePrice / sourceTotal);
  };
  return lines.map((line, index) => {
    const included = allocate(result.retainedCosts, index);
    const additional = allocate(result.nonInsuranceAdded - result.dutiesTaxes, index);
    const removed = allocate(result.removedCosts, index);
    const insurance = allocate(result.insurance, index);
    const dutiesTaxes = allocate(result.dutiesTaxes, index);
    return {
      ...line,
      includedLogistics: included,
      additionalLogistics: additional,
      removedCosts: removed,
      insurance,
      dutiesTaxes,
      resultingPrice: roundMoney(line.sourcePrice + additional + insurance + dutiesTaxes - removed),
      allocationMethod: "source-value-pro-rata",
      assumptions: ["Shared logistics allocated in proportion to source line value; replace with weight, volume, unit or direct allocation where available."],
    };
  });
}

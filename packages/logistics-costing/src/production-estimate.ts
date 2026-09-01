import type { CalculationDerivation, CalculationOperand, CommercialItemEvidence, Confidence, CostComponentCode, CostLine, DocumentPhysicalEvidence, TransportMode, TransportUnit } from "./types.ts";
import { transportUnits } from "./packing.ts";

export type EstimateValue<T> = {
  value: T;
  kind: "sourced-fact" | "calculation" | "evidence-estimate" | "benchmark-assumption";
  confidence: Confidence;
  sourceRef: string;
  method: string;
};

export type TruckAllocation = {
  index: number;
  state: "full" | "partial" | "free";
  allocatedPlanningVolumeM3: number;
  allocatedWeightKg: number;
  volumeUtilizationPercent: number;
  weightUtilizationPercent: number;
};

export type LimitingFactor = "VOLUME / LOADABILITY" | "WEIGHT" | "BOTH";

export type PhysicalReadinessBlocker = {
  code: "MISSING_PACKED_DIMENSIONS" | "MISSING_PACKED_GROSS_WEIGHT" | "UNIT_FIT_CONTRADICTION" | "GENERIC_MODE_FALLBACK_NOT_APPLICABLE";
  message: string;
  nextAction: string;
  sourceRefs: string[];
};

export type HsCandidate = {
  code: string;
  description: string;
  confidence: Confidence;
  matchedTerms: string[];
  sourceRef: string;
};

export type CargoCalculationRow = {
  id: string;
  description: string;
  quantity: number;
  planningQuantity: number;
  itemCode?: string;
  sourceLineTotal?: number;
  sourceMetric: string;
  estimationMethod: string;
  unitVolumeM3: number;
  estimatedVolumeM3: number;
  unitGrossWeightKg: number;
  estimatedGrossWeightKg: number;
  sourceRef: string;
  confidence: Confidence;
};

export type ProductionEstimateInput = {
  sourceValue: number;
  currency: string;
  cargoDescription: string;
  quantityDescription?: string;
  sourceLineCount?: number;
  commercialItems?: CommercialItemEvidence[];
  physicalEvidence?: DocumentPhysicalEvidence[];
  sourcePackedVolumeM3?: number;
  sourceGrossWeightKg?: number;
  origin: string;
  destination: string;
  transportMode: TransportMode;
  preferredUnitId?: string;
  pickupConfirmed?: boolean;
  specialCargoConfirmed?: boolean;
  evidenceText?: string;
  asOf?: string;
};

export type ProductionLogisticsEstimate = {
  cargo: {
    packedVolumeM3: EstimateValue<number>;
    grossWeightKg: EstimateValue<number>;
    loadabilityFactor: EstimateValue<number>;
    planningVolumeM3: number;
    sourceLineCount?: number;
    calculationRows: CargoCalculationRow[];
    confidenceFactors: string[];
    packedVolumeStatus: "confirmed" | "estimated" | "missing";
    grossWeightStatus: "confirmed" | "lower-bound" | "estimated" | "missing";
    minimumEquipmentEnvelopeVolumeM3?: number;
    explicitWeightLowerBoundKg?: number;
  };
  transport: {
    unit: TransportUnit;
    requiredTruckCount: number;
    displayedTruckCount: number;
    volumeRequiredCount: number;
    weightRequiredCount: number;
    limitingFactor: LimitingFactor;
    allocations: TruckAllocation[];
    transitDays: [number, number];
    selectionStatus: "qualified" | "blocked";
  };
  readiness: { status: "ready" | "blocked"; blockers: PhysicalReadinessBlocker[] };
  costLines: CostLine[];
  nonInsuranceCost: number;
  insuranceRate: number;
  insuranceCoverageFactor: number;
  estimatedInsurance: number;
  estimatedLogisticsCost: number;
  estimatedCommercialTotal: number;
  upliftPercent: number;
  confidence: { score: number; label: "High" | "Medium" | "Medium/Low" | "Low"; mainUncertainty: string };
  assumptions: string[];
  warnings: string[];
  benchmark: { id: string; label: string; sourceRef: string; asOf: string; isLiveQuote: false };
  hsCandidates: HsCandidate[];
};

type CargoProxy = {
  id: string;
  patterns: RegExp[];
  volumePerLineM3: number;
  weightPerLineKg: number;
  loadabilityFactor: number;
  confidence: Confidence;
  sourceRef: string;
};

const cargoProxies: CargoProxy[] = [
  {
    id: "mixed-medical-laboratory-equipment",
    patterns: [/medical/i, /laborator/i, /veterinar/i, /microscope|centrifuge|analy[sz]er/i],
    volumePerLineM3: 0.5135877269760479,
    weightPerLineKg: 64.4231616766467,
    loadabilityFactor: 0.78,
    confidence: "low",
    sourceRef: "Cargo proxy library v2026.08 · mixed medical/laboratory equipment",
  },
  {
    id: "mixed-machinery",
    patterns: [/machinery|equipment|machine|industrial/i],
    volumePerLineM3: 0.62,
    weightPerLineKg: 115,
    loadabilityFactor: 0.8,
    confidence: "low",
    sourceRef: "Cargo proxy library v2026.08 · mixed machinery",
  },
  {
    id: "mixed-commercial-goods",
    patterns: [/.*/],
    volumePerLineM3: 0.38,
    weightPerLineKg: 42,
    loadabilityFactor: 0.85,
    confidence: "provisional",
    sourceRef: "Cargo proxy library v2026.08 · mixed commercial goods fallback",
  },
];

type RouteBenchmark = {
  id: string;
  label: string;
  originPatterns: RegExp[];
  destinationPatterns: RegExp[];
  mode: TransportMode;
  unitId: string;
  asOf: string;
  currency: "USD";
  transitDays: [number, number];
  packingBase: number;
  originHandling: number;
  exportDocuments: number;
  freightPerUnit: number;
  transitBorder: number;
  destinationCarriage: number;
  contingencyRate: number;
  insuranceRate: number;
  insuranceCoverageFactor: number;
  sourceRef: string;
};

const routeBenchmarks: RouteBenchmark[] = [
  {
    id: "south-china-central-asia-road-2026q3",
    label: "South China → Central Asia · road FTL planning benchmark",
    originPatterns: [/guangzhou|shenzhen|foshan|dongguan|south china/i],
    destinationPatterns: [/tashkent|uzbekistan|central asia/i],
    mode: "road",
    unitId: "road-enclosed-136",
    asOf: "2026-08-27",
    currency: "USD",
    transitDays: [12, 18],
    packingBase: 3_000,
    originHandling: 600,
    exportDocuments: 500,
    freightPerUnit: 7_400,
    transitBorder: 1_100,
    destinationCarriage: 500,
    contingencyRate: 0.1,
    insuranceRate: 0.0035,
    insuranceCoverageFactor: 1.1,
    sourceRef: "Maintained internal route benchmark · validated planning fixture · not a carrier quotation",
  },
  {
    id: "generic-international-road-2026q3",
    label: "Generic international road FTL planning benchmark",
    originPatterns: [/.*/],
    destinationPatterns: [/.*/],
    mode: "road",
    unitId: "road-enclosed-136",
    asOf: "2026-08-27",
    currency: "USD",
    transitDays: [10, 20],
    packingBase: 2_400,
    originHandling: 650,
    exportDocuments: 550,
    freightPerUnit: 8_500,
    transitBorder: 1_250,
    destinationCarriage: 650,
    contingencyRate: 0.12,
    insuranceRate: 0.0035,
    insuranceCoverageFactor: 1.1,
    sourceRef: "Maintained internal generic road benchmark · low-confidence fallback · not a carrier quotation",
  },
  {
    id: "generic-mode-fallback-2026q3",
    label: "Generic international transport planning benchmark",
    originPatterns: [/.*/],
    destinationPatterns: [/.*/],
    mode: "multimodal",
    unitId: "multimodal-40hc",
    asOf: "2026-08-27",
    currency: "USD",
    transitDays: [15, 28],
    packingBase: 2_500,
    originHandling: 700,
    exportDocuments: 550,
    freightPerUnit: 9_500,
    transitBorder: 1_400,
    destinationCarriage: 700,
    contingencyRate: 0.15,
    insuranceRate: 0.0035,
    insuranceCoverageFactor: 1.1,
    sourceRef: "Maintained internal cross-mode fallback · provisional only · not a carrier quotation",
  },
];

const hsReferences: Array<{ code: string; description: string; terms: RegExp[] }> = [
  { code: "9018", description: "Medical, surgical, dental or veterinary instruments and appliances", terms: [/medical|clinical|veterinar|patient monitor|ultrasound/i] },
  { code: "9027", description: "Instruments and apparatus for physical or chemical analysis", terms: [/laborator|analy[sz]er|spectro|refractometer|chromatograph/i] },
  { code: "9011", description: "Compound optical microscopes", terms: [/microscope/i] },
  { code: "8419", description: "Laboratory machinery involving temperature treatment", terms: [/incubator|autoclave|distiller|drying|heating|cooling/i] },
  { code: "8418", description: "Refrigerators, freezers and other refrigerating equipment", terms: [/refrigerator|freezer|refrigerat/i] },
  { code: "8421", description: "Centrifuges and filtering or purifying machinery", terms: [/centrifuge|purification|filter/i] },
];

function parsedCount(value?: string) {
  if (!value) return undefined;
  const candidate = Number(value.match(/\b(\d{1,5})\b/)?.[1]);
  return Number.isFinite(candidate) && candidate > 0 ? candidate : undefined;
}

function selectCargoProxy(description: string) {
  return cargoProxies.find((proxy) => proxy.patterns.some((pattern) => pattern.test(description))) ?? cargoProxies.at(-1)!;
}

function selectBenchmark(origin: string, destination: string, mode: TransportMode) {
  return routeBenchmarks.find((benchmark) => benchmark.mode === mode && benchmark.originPatterns.some((pattern) => pattern.test(origin)) && benchmark.destinationPatterns.some((pattern) => pattern.test(destination)))
    ?? routeBenchmarks.find((benchmark) => benchmark.id === "generic-international-road-2026q3" && mode === "road")
    ?? { ...routeBenchmarks.find((benchmark) => benchmark.id === "generic-mode-fallback-2026q3")!, mode };
}

function selectedUnit(benchmark: RouteBenchmark, mode: TransportMode, preferredUnitId?: string) {
  return transportUnits.find((unit) => unit.id === preferredUnitId && unit.mode === mode)
    ?? transportUnits.find((unit) => unit.id === benchmark.unitId && unit.mode === mode)
    ?? transportUnits.find((unit) => unit.mode === mode && !unit.refrigerated)
    ?? transportUnits.find((unit) => unit.id === "multimodal-40hc")!;
}

function limitingFactor(volumeCount: number, weightCount: number, volumeRatio: number, weightRatio: number): LimitingFactor {
  if (volumeCount === weightCount && Math.min(volumeRatio, weightRatio) >= 0.85 * Math.max(volumeRatio, weightRatio)) return "BOTH";
  return volumeCount >= weightCount ? "VOLUME / LOADABILITY" : "WEIGHT";
}

function allocateUnits(planningVolumeM3: number, grossWeightKg: number, unit: TransportUnit, required: number): TruckAllocation[] {
  const allocations: TruckAllocation[] = [];
  let remainingVolume = planningVolumeM3;
  let remainingWeight = grossWeightKg;
  for (let index = 1; index <= required; index += 1) {
    const remainingUnits = required - index + 1;
    const allocatedPlanningVolumeM3 = Math.min(unit.usableVolumeM3, remainingVolume);
    const volumeShare = planningVolumeM3 > 0 ? allocatedPlanningVolumeM3 / planningVolumeM3 : 1 / required;
    const minimumWeightNow = Math.max(0, remainingWeight - unit.payloadKg * (remainingUnits - 1));
    const allocatedWeightKg = index === required ? remainingWeight : Math.min(unit.payloadKg, Math.max(minimumWeightNow, remainingWeight / remainingUnits, grossWeightKg * volumeShare));
    const volumeUtilizationPercent = allocatedPlanningVolumeM3 / unit.usableVolumeM3 * 100;
    const weightUtilizationPercent = allocatedWeightKg / unit.payloadKg * 100;
    allocations.push({
      index,
      state: index < required && (volumeUtilizationPercent >= 98 || weightUtilizationPercent >= 98) ? "full" : "partial",
      allocatedPlanningVolumeM3,
      allocatedWeightKg,
      volumeUtilizationPercent,
      weightUtilizationPercent,
    });
    remainingVolume = Math.max(0, remainingVolume - allocatedPlanningVolumeM3);
    remainingWeight = Math.max(0, remainingWeight - allocatedWeightKg);
  }
  allocations.push({ index: required + 1, state: "free", allocatedPlanningVolumeM3: 0, allocatedWeightKg: 0, volumeUtilizationPercent: 0, weightUtilizationPercent: 0 });
  return allocations;
}

function operand(label: string, value: number | string, unit: string | undefined, sourceRef: string, evidenceKind: CalculationOperand["evidenceKind"], confidence: Confidence): CalculationOperand {
  return { label, value, ...(unit ? { unit } : {}), sourceRef, evidenceKind, confidence };
}

function derivation(id: string, formula: string, inputs: CalculationOperand[], resultValue: number, resultUnit: string, benchmark: RouteBenchmark, assumptions: string[] = []): CalculationDerivation {
  const confidence: Confidence = benchmark.id.startsWith("generic-") ? "low" : "medium";
  return {
    id,
    engineVersion: "production-logistics-estimate:0.2.0",
    formula,
    inputs,
    resultValue,
    resultUnit,
    confidence,
    assumptions,
    benchmark: { id: benchmark.id, label: benchmark.label, asOf: benchmark.asOf, sourceRef: benchmark.sourceRef },
  };
}

function makeCostLine(component: CostComponentCode, label: string, amount: number, benchmark: RouteBenchmark, note: string, calculation: CalculationDerivation, targetIncluded?: boolean): CostLine {
  return {
    id: `estimate-${component}`,
    component,
    label,
    amount,
    currency: benchmark.currency,
    rateDate: benchmark.asOf,
    sourceRef: `${benchmark.id} · ${benchmark.sourceRef}`,
    evidenceKind: "assumption",
    confidence: benchmark.id.startsWith("generic-") ? "low" : "medium",
    ...(targetIncluded === undefined ? {} : { targetIncluded }),
    note,
    calculation,
    agentEstimate: { amount, currency: benchmark.currency, calculation },
  };
}

function matchHsCandidates(text: string): HsCandidate[] {
  return hsReferences.flatMap((entry) => {
    const matchedTerms = entry.terms.filter((pattern) => pattern.test(text)).map((pattern) => pattern.source.replaceAll("\\b", ""));
    return matchedTerms.length ? [{ code: entry.code, description: entry.description, confidence: matchedTerms.length > 1 ? "medium" as const : "low" as const, matchedTerms, sourceRef: "Maintained HS heading reference v2026.08" }] : [];
  }).slice(0, 5);
}

function dimensionsVolumeM3(dimensions: { length: number; width: number; height: number }, quantity = 1) {
  return dimensions.length * dimensions.width * dimensions.height / 1_000_000 * quantity;
}

function fitsLoadingEnvelope(item: { length: number; width: number; height: number }, unit?: { length: number; width: number; height: number }) {
  if (!unit) return true;
  const itemAxes = [item.length, item.width, item.height].sort((left, right) => left - right);
  const unitAxes = [unit.length, unit.width, unit.height].sort((left, right) => left - right);
  return itemAxes.every((axis, index) => axis <= unitAxes[index]);
}

export function buildProductionLogisticsEstimate(input: ProductionEstimateInput): ProductionLogisticsEstimate {
  const evidenceText = `${input.cargoDescription}\n${input.quantityDescription ?? ""}\n${input.evidenceText ?? ""}`;
  const proxy = selectCargoProxy(evidenceText);
  const commercialItems = input.commercialItems?.filter((item) => item.workingBaselineIncluded) ?? [];
  const physicalEvidence = input.physicalEvidence ?? [];
  const lineCount = input.sourceLineCount ?? (commercialItems.length || undefined) ?? parsedCount(input.quantityDescription) ?? 1;
  const sourcePackedDimensions = physicalEvidence.filter((item) => item.role === "packed-dimensions" && item.dimensionsCm);
  const sourceProductDimensions = physicalEvidence.filter((item) => item.role === "product-dimensions" && item.dimensionsCm);
  const sourcePackedWeights = physicalEvidence.filter((item) => item.role === "packed-gross-weight" && item.weightKg);
  const sourceDeclaredWeights = physicalEvidence.filter((item) => item.role === "declared-total-weight" && item.weightKg);
  const sourceProductWeights = physicalEvidence.filter((item) => item.role === "product-weight" && item.weightKg);
  const packedDimensionsVolume = sourcePackedDimensions.reduce((sum, item) => sum + dimensionsVolumeM3(item.dimensionsCm!, item.quantity ?? 1), 0);
  const minimumEquipmentEnvelopeVolumeM3 = sourceProductDimensions.length ? Math.max(...sourceProductDimensions.map((item) => dimensionsVolumeM3(item.dimensionsCm!, item.quantity ?? 1))) : undefined;
  const packedEvidenceWeight = sourcePackedWeights.length ? Math.max(...sourcePackedWeights.map((item) => item.weightKg!)) : undefined;
  const declaredWeightLowerBound = sourceDeclaredWeights.length ? Math.max(...sourceDeclaredWeights.map((item) => item.weightKg!)) : undefined;
  const productWeightLowerBound = sourceProductWeights.length ? (lineCount === 1 ? sourceProductWeights.reduce((sum, item) => sum + item.weightKg!, 0) : Math.max(...sourceProductWeights.map((item) => item.weightKg!))) : undefined;
  const explicitWeightLowerBoundKg = Math.max(declaredWeightLowerBound ?? 0, productWeightLowerBound ?? 0) || undefined;
  const directVolumeFromSource = Number.isFinite(input.sourcePackedVolumeM3) && (input.sourcePackedVolumeM3 ?? 0) > 0;
  const directWeightFromSource = Number.isFinite(input.sourceGrossWeightKg) && (input.sourceGrossWeightKg ?? 0) > 0;
  const volumeFromSource = directVolumeFromSource || packedDimensionsVolume > 0;
  const weightFromSource = directWeightFromSource || Boolean(packedEvidenceWeight);
  const proxyVolume = proxy.volumePerLineM3 * lineCount;
  const proxyWeight = proxy.weightPerLineKg * lineCount;
  const packedVolumeM3: EstimateValue<number> = volumeFromSource
    ? { value: directVolumeFromSource ? input.sourcePackedVolumeM3! : packedDimensionsVolume, kind: "sourced-fact", confidence: "high", sourceRef: directVolumeFromSource ? "Shipment-level client/document input" : sourcePackedDimensions.map((item) => item.sourceRef).join(" · "), method: directVolumeFromSource ? "Used confirmed shipment-level packed volume without estimation." : "Calculated from explicit packed/package dimensions and quantity." }
    : { value: proxyVolume, kind: "evidence-estimate", confidence: proxy.confidence, sourceRef: proxy.sourceRef, method: `${lineCount} source lines × ${proxy.volumePerLineM3.toFixed(3)} m³ category proxy.` };
  const grossWeightKg: EstimateValue<number> = weightFromSource
    ? { value: directWeightFromSource ? input.sourceGrossWeightKg! : packedEvidenceWeight!, kind: "sourced-fact", confidence: "high", sourceRef: directWeightFromSource ? "Shipment-level client/document input" : sourcePackedWeights.map((item) => item.sourceRef).join(" · "), method: "Used confirmed shipment packed gross weight without estimation." }
    : explicitWeightLowerBoundKg
      ? { value: Math.max(proxyWeight, explicitWeightLowerBoundKg), kind: "sourced-fact", confidence: "high", sourceRef: [...sourceDeclaredWeights, ...sourceProductWeights].map((item) => item.sourceRef).join(" · "), method: `Explicit source weight retained as a ${explicitWeightLowerBoundKg.toFixed(1)} kg lower bound; the generic proxy cannot reduce it.` }
      : { value: proxyWeight, kind: "evidence-estimate", confidence: proxy.confidence, sourceRef: proxy.sourceRef, method: `${lineCount} source lines × ${proxy.weightPerLineKg.toFixed(1)} kg category proxy.` };
  const loadabilityFactor: EstimateValue<number> = { value: proxy.loadabilityFactor, kind: "benchmark-assumption", confidence: "low", sourceRef: proxy.sourceRef, method: "Practical usable-space factor for mixed, fragile and partly non-stackable cargo." };
  const planningVolumeM3 = packedVolumeM3.value / loadabilityFactor.value;
  const cargoCalculationRows: CargoCalculationRow[] = volumeFromSource || weightFromSource
    ? [{
      id: "shipment-source-input",
      description: "Shipment-level cargo input",
      quantity: lineCount,
      planningQuantity: lineCount,
      sourceMetric: "Shipment-level packed volume / gross weight",
      estimationMethod: volumeFromSource && weightFromSource ? "Used confirmed shipment-level values without estimation." : "Used the available shipment-level value and retained the category proxy only for the missing metric.",
      unitVolumeM3: packedVolumeM3.value / lineCount,
      estimatedVolumeM3: packedVolumeM3.value,
      unitGrossWeightKg: grossWeightKg.value / lineCount,
      estimatedGrossWeightKg: grossWeightKg.value,
      sourceRef: "Shipment-level client/document input",
      confidence: volumeFromSource && weightFromSource ? "high" : proxy.confidence,
    }]
    : commercialItems.length
      ? [
        ...commercialItems.map((item) => ({
          id: item.id,
          description: item.description,
          quantity: item.quantity ?? 1,
          planningQuantity: 1,
          ...(item.itemCode ? { itemCode: item.itemCode } : {}),
          ...(item.lineTotal !== undefined ? { sourceLineTotal: item.lineTotal } : {}),
          sourceMetric: "Commercial quantity is sourced; confirmed per-unit packed dimensions and gross weight are unavailable.",
          estimationMethod: `One quotation-line planning unit × ${proxy.id} category proxy. Commercial quantity remains visible but is not treated as a packing quantity without supplier packing evidence.`,
          unitVolumeM3: proxy.volumePerLineM3,
          estimatedVolumeM3: proxy.volumePerLineM3,
          unitGrossWeightKg: proxy.weightPerLineKg,
          estimatedGrossWeightKg: proxy.weightPerLineKg,
          sourceRef: item.sourceRef,
          confidence: proxy.confidence,
        })),
        ...(commercialItems.length < lineCount ? [{
          id: `proxy-unidentified-lines:${proxy.id}`,
          description: `${lineCount - commercialItems.length} source line(s) without preserved item detail`,
          quantity: lineCount - commercialItems.length,
          planningQuantity: lineCount - commercialItems.length,
          sourceMetric: "Source-line count is preserved, but item-level content is unavailable in this legacy Case snapshot.",
          estimationMethod: `Remaining quotation lines × ${proxy.id} category proxy.`,
          unitVolumeM3: proxy.volumePerLineM3,
          estimatedVolumeM3: proxy.volumePerLineM3 * (lineCount - commercialItems.length),
          unitGrossWeightKg: proxy.weightPerLineKg,
          estimatedGrossWeightKg: proxy.weightPerLineKg * (lineCount - commercialItems.length),
          sourceRef: proxy.sourceRef,
          confidence: proxy.confidence,
        }] : []),
      ]
      : [{
        id: `proxy-group:${proxy.id}`,
        description: `${input.cargoDescription || "Cargo"} · quotation-line proxy group`,
        quantity: lineCount,
        planningQuantity: lineCount,
        sourceMetric: `${lineCount} source commercial line(s); no confirmed packing list dimensions or gross weights were available to this model`,
        estimationMethod: `Category proxy ${proxy.id}; product-line specifications are not silently treated as packed shipment dimensions.`,
        unitVolumeM3: proxy.volumePerLineM3,
        estimatedVolumeM3: packedVolumeM3.value,
        unitGrossWeightKg: proxy.weightPerLineKg,
        estimatedGrossWeightKg: grossWeightKg.value,
        sourceRef: proxy.sourceRef,
        confidence: proxy.confidence,
      }];
  const physicalCalculationRows: CargoCalculationRow[] = physicalEvidence.map((item) => ({
    id: item.id,
    description: item.role.replaceAll("-", " "),
    quantity: item.quantity ?? 1,
    planningQuantity: item.quantity ?? 1,
    sourceMetric: item.sourceText,
    estimationMethod: item.basis,
    unitVolumeM3: item.role === "packed-dimensions" && item.dimensionsCm ? dimensionsVolumeM3(item.dimensionsCm) : 0,
    estimatedVolumeM3: item.role === "packed-dimensions" && item.dimensionsCm ? dimensionsVolumeM3(item.dimensionsCm, item.quantity ?? 1) : 0,
    unitGrossWeightKg: item.weightKg ?? 0,
    estimatedGrossWeightKg: item.weightKg ? item.weightKg * (item.quantity ?? 1) : 0,
    sourceRef: item.sourceRef,
    confidence: item.confidence,
  }));
  const calculationRows = physicalCalculationRows.length ? [...physicalCalculationRows, ...cargoCalculationRows] : cargoCalculationRows;
  const benchmark = selectBenchmark(input.origin, input.destination, input.transportMode);
  const unit = selectedUnit(benchmark, input.transportMode, input.preferredUnitId);
  const fitFailures = physicalEvidence.filter((item) => item.dimensionsCm && !fitsLoadingEnvelope(item.dimensionsCm, unit.internalDimensionsCm));
  const blockers: PhysicalReadinessBlocker[] = [];
  if (fitFailures.length) blockers.push({
    code: "UNIT_FIT_CONTRADICTION",
    message: `${fitFailures.length} explicit equipment/packing envelope${fitFailures.length === 1 ? " does" : "s do"} not fit the clear internal dimensions of ${unit.label}. The standard unit is not a qualified transport selection.`,
    nextAction: "Obtain a forwarder loading plan and an oversized/open-top/flat-rack or other suitable unit quotation.",
    sourceRefs: fitFailures.map((item) => item.sourceRef),
  });
  const physicalProxyRequiresPacking = proxy.id === "mixed-machinery" || benchmark.id === "generic-mode-fallback-2026q3";
  if (!volumeFromSource && physicalProxyRequiresPacking) blockers.push({
    code: "MISSING_PACKED_DIMENSIONS",
    message: `Packed shipment dimensions or a supplier packing list are missing. ${minimumEquipmentEnvelopeVolumeM3 ? `The ${minimumEquipmentEnvelopeVolumeM3.toFixed(3)} m³ equipment envelope is only a minimum fit constraint and cannot be treated as packed cube.` : "The machinery proxy is not sufficient to qualify a transport unit."}`,
    nextAction: "Obtain supplier packed dimensions/package count or a forwarder-approved loading plan.",
    sourceRefs: sourceProductDimensions.map((item) => item.sourceRef),
  });
  if (!weightFromSource && physicalProxyRequiresPacking) blockers.push({
    code: "MISSING_PACKED_GROSS_WEIGHT",
    message: explicitWeightLowerBoundKg ? `Packed gross weight is missing. The explicit ${explicitWeightLowerBoundKg.toFixed(0)} kg source weight is retained as a lower bound and cannot be replaced by the ${proxyWeight.toFixed(0)} kg category proxy.` : "Packed gross weight is missing and the machinery proxy is insufficient for a qualified freight selection.",
    nextAction: "Obtain supplier packed gross weight; retain the source product/declared weight as the minimum.",
    sourceRefs: [...sourceDeclaredWeights, ...sourceProductWeights].map((item) => item.sourceRef),
  });
  if (benchmark.id === "generic-mode-fallback-2026q3" && (!volumeFromSource || !weightFromSource)) blockers.push({
    code: "GENERIC_MODE_FALLBACK_NOT_APPLICABLE",
    message: "The generic cross-mode benchmark cannot become the best estimate while packed physical fit remains unresolved.",
    nextAction: "Confirm packed cargo data and a compatible transport unit, then apply a route/mode-specific benchmark or forwarder quotation.",
    sourceRefs: [benchmark.sourceRef],
  });
  const physicalReady = blockers.length === 0;
  const volumeRequiredCount = Math.max(1, Math.ceil(planningVolumeM3 / unit.usableVolumeM3));
  const weightRequiredCount = Math.max(1, Math.ceil(grossWeightKg.value / unit.payloadKg));
  const requiredTruckCount = Math.max(volumeRequiredCount, weightRequiredCount);
  const volumeRatio = planningVolumeM3 / (unit.usableVolumeM3 * requiredTruckCount);
  const weightRatio = grossWeightKg.value / (unit.payloadKg * requiredTruckCount);
  const factor = limitingFactor(volumeRequiredCount, weightRequiredCount, volumeRatio, weightRatio);
  const allocations = allocateUnits(planningVolumeM3, grossWeightKg.value, unit, requiredTruckCount);

  const originLoading = benchmark.originHandling * 0.34;
  const originPickup = benchmark.originHandling * 0.5;
  const originTerminal = benchmark.originHandling - originLoading - originPickup;
  const mainFreight = benchmark.freightPerUnit * requiredTruckCount;
  const beforeContingency = benchmark.packingBase + benchmark.originHandling + benchmark.exportDocuments + mainFreight + benchmark.transitBorder + benchmark.destinationCarriage;
  const contingency = beforeContingency * benchmark.contingencyRate;
  const nonInsuranceCost = beforeContingency + contingency;
  const insuranceFactor = benchmark.insuranceRate * benchmark.insuranceCoverageFactor;
  const estimatedInsurance = (input.sourceValue + nonInsuranceCost) * insuranceFactor / (1 - insuranceFactor);
  const estimatedLogisticsCost = nonInsuranceCost + estimatedInsurance;
  const benchmarkSource = `${benchmark.id} · ${benchmark.sourceRef}`;
  const benchmarkConfidence: Confidence = benchmark.id.startsWith("generic-") ? "low" : "medium";
  const packingCalculation = derivation("cost:export_packing", "packing benchmark allowance per shipment", [
    operand("Packing allowance", benchmark.packingBase, benchmark.currency, benchmarkSource, "assumption", benchmarkConfidence),
    operand("Cargo category", proxy.id, undefined, proxy.sourceRef, "assumption", proxy.confidence),
  ], benchmark.packingBase, benchmark.currency, benchmark, ["The current maintained benchmark is a shipment-level planning allowance, not a supplier packing quotation."]);
  const originLoadingCalculation = derivation("cost:origin_loading", "origin handling benchmark × 34% loading allocation", [
    operand("Origin handling benchmark", benchmark.originHandling, benchmark.currency, benchmarkSource, "assumption", benchmarkConfidence),
    operand("Loading allocation", 34, "%", "Production logistics cost allocation policy v0.2", "calculation", "medium"),
  ], originLoading, benchmark.currency, benchmark);
  const originPickupCalculation = derivation("cost:origin_pickup", "origin handling benchmark × 50% pickup allocation", [
    operand("Origin handling benchmark", benchmark.originHandling, benchmark.currency, benchmarkSource, "assumption", benchmarkConfidence),
    operand("Pickup allocation", 50, "%", "Production logistics cost allocation policy v0.2", "calculation", "medium"),
  ], originPickup, benchmark.currency, benchmark, [input.pickupConfirmed ? "Pickup location confirmed." : "Pickup location uses the best supplier-side location reference and remains subject to confirmation."]);
  const originDispatchCalculation = derivation("cost:origin_terminal", "origin handling benchmark − loading allocation − pickup allocation", [
    operand("Origin handling benchmark", benchmark.originHandling, benchmark.currency, benchmarkSource, "assumption", benchmarkConfidence),
    operand("Loading allocation", originLoading, benchmark.currency, "Canonical origin-loading calculation", "calculation", benchmarkConfidence),
    operand("Pickup allocation", originPickup, benchmark.currency, "Canonical origin-pickup calculation", "calculation", benchmarkConfidence),
  ], originTerminal, benchmark.currency, benchmark);
  const exportDocumentsCalculation = derivation("cost:export_clearance", "export-document benchmark allowance per shipment", [
    operand("Export document allowance", benchmark.exportDocuments, benchmark.currency, benchmarkSource, "assumption", benchmarkConfidence),
  ], benchmark.exportDocuments, benchmark.currency, benchmark);
  const mainFreightCalculation = derivation("cost:main_freight", "required transport units × benchmark freight rate per unit", [
    operand("Required transport units", requiredTruckCount, unit.label, "Canonical transport capacity model", "calculation", factor === "BOTH" ? "medium" : packedVolumeM3.confidence),
    operand("Freight rate per unit", benchmark.freightPerUnit, `${benchmark.currency}/${unit.label}`, benchmarkSource, "assumption", benchmarkConfidence),
  ], mainFreight, benchmark.currency, benchmark, ["Benchmark planning rate; not a live carrier quotation."]);
  const transitCalculation = derivation("cost:transit_handling", "transit and border benchmark allowance per shipment", [
    operand("Transit / border allowance", benchmark.transitBorder, benchmark.currency, benchmarkSource, "assumption", benchmarkConfidence),
  ], benchmark.transitBorder, benchmark.currency, benchmark);
  const transshipmentCalculation = derivation("cost:transshipment", "direct-service benchmark contains no separate transshipment allowance", [
    operand("Separate transshipment allowance", 0, benchmark.currency, benchmarkSource, "assumption", benchmarkConfidence),
  ], 0, benchmark.currency, benchmark);
  const destinationCalculation = derivation("cost:destination_terminal", "destination carriage benchmark allowance per shipment", [
    operand("Destination carriage allowance", benchmark.destinationCarriage, benchmark.currency, benchmarkSource, "assumption", benchmarkConfidence),
    operand("Named destination", input.destination, undefined, "Client/document case input", "user-input", "medium"),
  ], benchmark.destinationCarriage, benchmark.currency, benchmark);
  const contingencyCalculation = derivation("cost:contingency", "subtotal before contingency × contingency rate", [
    operand("Subtotal before contingency", beforeContingency, benchmark.currency, "Sum of canonical non-insurance cost derivations", "calculation", benchmarkConfidence),
    operand("Contingency rate", benchmark.contingencyRate * 100, "%", benchmarkSource, "assumption", benchmarkConfidence),
  ], contingency, benchmark.currency, benchmark);
  const insuranceCalculation = derivation("cost:insurance", "(source value + non-insurance logistics) × premium factor ÷ (1 − premium factor)", [
    operand("Source commercial value", input.sourceValue, input.currency, "Source quotation / client case input", "sourced-fact", "high"),
    operand("Non-insurance logistics", nonInsuranceCost, benchmark.currency, "Sum of canonical non-insurance cost derivations", "calculation", benchmarkConfidence),
    operand("Premium rate", benchmark.insuranceRate * 100, "%", benchmarkSource, "assumption", benchmarkConfidence),
    operand("Insured-value factor", benchmark.insuranceCoverageFactor * 100, "%", benchmarkSource, "assumption", benchmarkConfidence),
  ], estimatedInsurance, benchmark.currency, benchmark, ["Self-inclusive CIP insurance estimate; replace with an insurer quotation when available."]);
  const calculatedCostLines: CostLine[] = [
    { ...makeCostLine("export_packing", "Packing reinforcement", benchmark.packingBase, benchmark, "Shipment-level packing reinforcement benchmark allowance.", packingCalculation), startIncluded: false, targetIncluded: true },
    makeCostLine("origin_loading", "Origin handling · loading", originLoading, benchmark, "34% allocated share of the origin-handling benchmark.", originLoadingCalculation),
    makeCostLine("origin_pickup", "Origin handling · pickup", originPickup, benchmark, "50% allocated share of the origin-handling benchmark; pickup point remains subject to confirmation.", originPickupCalculation),
    makeCostLine("origin_terminal", "Origin handling · dispatch", originTerminal, benchmark, "Residual 16% allocated share of the origin-handling benchmark.", originDispatchCalculation),
    makeCostLine("export_clearance", "Export documents", benchmark.exportDocuments, benchmark, "Budgetary export documentation and clearance allowance.", exportDocumentsCalculation),
    makeCostLine("main_freight", `Main ${input.transportMode} freight`, mainFreight, benchmark, `${requiredTruckCount} × ${benchmark.currency} ${benchmark.freightPerUnit.toFixed(0)} per ${unit.label}.`, mainFreightCalculation),
    makeCostLine("transit_handling", "Transit / border", benchmark.transitBorder, benchmark, "Budgetary transit and border-handling allowance.", transitCalculation),
    makeCostLine("transshipment", "Transshipment", 0, benchmark, "No separate transshipment amount in the selected direct-service benchmark.", transshipmentCalculation),
    makeCostLine("destination_terminal", "Destination carriage", benchmark.destinationCarriage, benchmark, "Carriage/handling to the named CIP destination; final site delivery is excluded unless the selected rule requires it.", destinationCalculation),
    makeCostLine("contingency", "Contingency", contingency, benchmark, `${(benchmark.contingencyRate * 100).toFixed(0)}% benchmark-validity allowance applied before insurance.`, contingencyCalculation, true),
    makeCostLine("insurance", "Estimated insurance basis", 0, benchmark, `${(benchmark.insuranceRate * 100).toFixed(2)}% premium benchmark on ${(benchmark.insuranceCoverageFactor * 100).toFixed(0)}% of the insured value; the calculation engine computes the self-inclusive premium.`, insuranceCalculation),
  ];
  const costLines = physicalReady ? calculatedCostLines : calculatedCostLines.filter((line) => ["export_packing", "origin_loading", "origin_pickup", "origin_terminal", "export_clearance"].includes(line.component));

  const specialHints = [/battery|lithium/i, /refrigerant|freezer|refrigerator/i, /cryogenic|liquid nitrogen/i, /gas cylinder|compressed gas/i, /dangerous goods|\bDG\b/i, /temperature[- ]sensitive|cold chain/i].filter((pattern) => pattern.test(evidenceText));
  const warnings = [
    ...blockers.map((blocker) => `${blocker.message} Next action: ${blocker.nextAction}`),
    ...(!volumeFromSource || !weightFromSource ? ["Packing information is partly estimated from category and source-line proxies."] : []),
    ...(!input.pickupConfirmed ? ["Pickup point is assumed from the best supplier-side location reference."] : []),
    ...(!input.specialCargoConfirmed ? ["Special-cargo status is not confirmed. The estimate excludes unidentified DG, cold-chain and special-handling surcharges."] : []),
    ...(specialHints.length ? ["Product descriptions contain possible special-cargo indicators; technical declarations and carrier acceptance are still required."] : []),
    "Freight uses a maintained benchmark, not a live carrier quotation.",
    "Import duties and VAT are excluded from standard CIP.",
  ];
  const assumptions = [
    `${benchmark.label}; benchmark vintage ${benchmark.asOf}.`,
    `Planning volume = packed volume ÷ ${(loadabilityFactor.value * 100).toFixed(0)}% loadability.`,
    physicalReady ? `${requiredTruckCount} required ${unit.label}${requiredTruckCount === 1 ? "" : "s"}; one additional free unit is shown only as a capacity reference.` : `Transport-unit selection is blocked until the physical-fit requirements are resolved; ${unit.label} remains an unqualified comparison only.`,
    physicalReady ? `Insurance estimated at ${(benchmark.insuranceRate * 100).toFixed(2)}% on ${(benchmark.insuranceCoverageFactor * 100).toFixed(0)}% of the self-inclusive CIP value.` : "Insurance and the final logistics total remain uncalculated while freight selection is blocked.",
  ];

  const confidenceDeductions = [
    volumeFromSource ? 0 : 18,
    weightFromSource ? 0 : 14,
    input.pickupConfirmed ? 0 : 6,
    input.specialCargoConfirmed ? 0 : 7,
    benchmark.id.startsWith("generic-") ? 18 : 8,
    input.destination.includes(",") ? 0 : 8,
  ];
  const score = physicalReady ? Math.max(20, Math.min(90, 98 - confidenceDeductions.reduce((sum, value) => sum + value, 0))) : Math.max(10, 35 - blockers.length * 5);
  const label = score >= 75 ? "High" : score >= 60 ? "Medium" : score >= 40 ? "Medium/Low" : "Low";
  const mainUncertainty = !physicalReady ? "Physical fit & packing" : !volumeFromSource ? "Packing & loadability" : benchmark.id.startsWith("generic-") ? "Freight benchmark" : !input.pickupConfirmed ? "Pickup location" : !input.specialCargoConfirmed ? "Special-cargo status" : "Rate validity";

  return {
    cargo: {
      packedVolumeM3,
      grossWeightKg,
      loadabilityFactor,
      planningVolumeM3,
      sourceLineCount: lineCount,
      calculationRows,
      confidenceFactors: [
        volumeFromSource ? "Shipment-level packed volume is provided." : `${lineCount} source line(s) use the ${proxy.id} volume proxy because confirmed packing dimensions are unavailable.`,
        weightFromSource ? "Shipment-level gross weight is provided." : `${lineCount} source line(s) use the ${proxy.id} gross-weight proxy because confirmed shipment gross weights are unavailable.`,
        `Loadability uses a ${(loadabilityFactor.value * 100).toFixed(0)}% category assumption.`,
        input.pickupConfirmed ? "Pickup location is confirmed." : "Pickup location is assumed from supplier-side evidence.",
        input.specialCargoConfirmed ? "Special-cargo status is confirmed for this estimate." : "Special-cargo status is not confirmed.",
      ],
      packedVolumeStatus: volumeFromSource ? "confirmed" : physicalReady ? "estimated" : "missing",
      grossWeightStatus: weightFromSource ? "confirmed" : explicitWeightLowerBoundKg ? "lower-bound" : physicalReady ? "estimated" : "missing",
      minimumEquipmentEnvelopeVolumeM3,
      explicitWeightLowerBoundKg,
    },
    transport: { unit, requiredTruckCount, displayedTruckCount: requiredTruckCount + 1, volumeRequiredCount, weightRequiredCount, limitingFactor: factor, allocations, transitDays: benchmark.transitDays, selectionStatus: physicalReady ? "qualified" : "blocked" },
    readiness: { status: physicalReady ? "ready" : "blocked", blockers },
    costLines,
    nonInsuranceCost: physicalReady ? nonInsuranceCost : 0,
    insuranceRate: benchmark.insuranceRate,
    insuranceCoverageFactor: benchmark.insuranceCoverageFactor,
    estimatedInsurance: physicalReady ? estimatedInsurance : 0,
    estimatedLogisticsCost: physicalReady ? estimatedLogisticsCost : 0,
    estimatedCommercialTotal: physicalReady ? input.sourceValue + estimatedLogisticsCost : input.sourceValue,
    upliftPercent: physicalReady && input.sourceValue > 0 ? estimatedLogisticsCost / input.sourceValue * 100 : 0,
    confidence: { score, label, mainUncertainty },
    assumptions,
    warnings,
    benchmark: { id: benchmark.id, label: benchmark.label, sourceRef: benchmark.sourceRef, asOf: input.asOf ?? benchmark.asOf, isLiveQuote: false },
    hsCandidates: matchHsCandidates(evidenceText),
  };
}

export function isSpecificNamedDestination(value: string) {
  const normalized = value.trim().toLowerCase();
  if (!normalized) return false;
  const countryOnly = new Set(["uzbekistan", "china", "kazakhstan", "kyrgyzstan", "tajikistan", "turkmenistan", "russia", "united states", "usa", "germany", "france", "italy", "india"]);
  return !countryOnly.has(normalized);
}

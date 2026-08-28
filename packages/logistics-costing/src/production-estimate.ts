import type { CalculationDerivation, CalculationOperand, Confidence, CostComponentCode, CostLine, TransportMode, TransportUnit } from "./types.ts";
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
  };
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

export function buildProductionLogisticsEstimate(input: ProductionEstimateInput): ProductionLogisticsEstimate {
  const evidenceText = `${input.cargoDescription}\n${input.quantityDescription ?? ""}\n${input.evidenceText ?? ""}`;
  const proxy = selectCargoProxy(evidenceText);
  const lineCount = input.sourceLineCount ?? parsedCount(input.quantityDescription) ?? 1;
  const volumeFromSource = Number.isFinite(input.sourcePackedVolumeM3) && (input.sourcePackedVolumeM3 ?? 0) > 0;
  const weightFromSource = Number.isFinite(input.sourceGrossWeightKg) && (input.sourceGrossWeightKg ?? 0) > 0;
  const packedVolumeM3: EstimateValue<number> = volumeFromSource
    ? { value: input.sourcePackedVolumeM3!, kind: "sourced-fact", confidence: "high", sourceRef: "Shipment-level client/document input", method: "Used without estimation." }
    : { value: proxy.volumePerLineM3 * lineCount, kind: "evidence-estimate", confidence: proxy.confidence, sourceRef: proxy.sourceRef, method: `${lineCount} source lines × ${proxy.volumePerLineM3.toFixed(3)} m³ category proxy.` };
  const grossWeightKg: EstimateValue<number> = weightFromSource
    ? { value: input.sourceGrossWeightKg!, kind: "sourced-fact", confidence: "high", sourceRef: "Shipment-level client/document input", method: "Used without estimation." }
    : { value: proxy.weightPerLineKg * lineCount, kind: "evidence-estimate", confidence: proxy.confidence, sourceRef: proxy.sourceRef, method: `${lineCount} source lines × ${proxy.weightPerLineKg.toFixed(1)} kg category proxy.` };
  const loadabilityFactor: EstimateValue<number> = { value: proxy.loadabilityFactor, kind: "benchmark-assumption", confidence: "low", sourceRef: proxy.sourceRef, method: "Practical usable-space factor for mixed, fragile and partly non-stackable cargo." };
  const planningVolumeM3 = packedVolumeM3.value / loadabilityFactor.value;
  const cargoCalculationRows: CargoCalculationRow[] = [{
    id: volumeFromSource || weightFromSource ? "shipment-source-input" : `proxy-group:${proxy.id}`,
    description: volumeFromSource || weightFromSource ? "Shipment-level cargo input" : `${input.cargoDescription || "Cargo"} · quotation-line proxy group`,
    quantity: lineCount,
    sourceMetric: volumeFromSource || weightFromSource ? "Shipment-level packed volume / gross weight" : `${lineCount} source commercial line(s); no confirmed packing list dimensions or gross weights were available to this model`,
    estimationMethod: volumeFromSource && weightFromSource ? "Used confirmed shipment-level values without estimation." : `Category proxy ${proxy.id}; product-line specifications are not silently treated as packed shipment dimensions.`,
    unitVolumeM3: volumeFromSource ? packedVolumeM3.value / lineCount : proxy.volumePerLineM3,
    estimatedVolumeM3: packedVolumeM3.value,
    unitGrossWeightKg: weightFromSource ? grossWeightKg.value / lineCount : proxy.weightPerLineKg,
    estimatedGrossWeightKg: grossWeightKg.value,
    sourceRef: volumeFromSource || weightFromSource ? "Shipment-level client/document input" : proxy.sourceRef,
    confidence: volumeFromSource && weightFromSource ? "high" : proxy.confidence,
  }];
  const benchmark = selectBenchmark(input.origin, input.destination, input.transportMode);
  const unit = selectedUnit(benchmark, input.transportMode, input.preferredUnitId);
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
  const costLines: CostLine[] = [
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

  const specialHints = [/battery|lithium/i, /refrigerant|freezer|refrigerator/i, /cryogenic|liquid nitrogen/i, /gas cylinder|compressed gas/i, /dangerous goods|\bDG\b/i, /temperature[- ]sensitive|cold chain/i].filter((pattern) => pattern.test(evidenceText));
  const warnings = [
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
    `${requiredTruckCount} required ${unit.label}${requiredTruckCount === 1 ? "" : "s"}; one additional free unit is shown only as a capacity reference.`,
    `Insurance estimated at ${(benchmark.insuranceRate * 100).toFixed(2)}% on ${(benchmark.insuranceCoverageFactor * 100).toFixed(0)}% of the self-inclusive CIP value.`,
  ];

  const confidenceDeductions = [
    volumeFromSource ? 0 : 18,
    weightFromSource ? 0 : 14,
    input.pickupConfirmed ? 0 : 6,
    input.specialCargoConfirmed ? 0 : 7,
    benchmark.id.startsWith("generic-") ? 18 : 8,
    input.destination.includes(",") ? 0 : 8,
  ];
  const score = Math.max(20, Math.min(90, 98 - confidenceDeductions.reduce((sum, value) => sum + value, 0)));
  const label = score >= 75 ? "High" : score >= 60 ? "Medium" : score >= 40 ? "Medium/Low" : "Low";
  const mainUncertainty = !volumeFromSource ? "Packing & loadability" : benchmark.id.startsWith("generic-") ? "Freight benchmark" : !input.pickupConfirmed ? "Pickup location" : !input.specialCargoConfirmed ? "Special-cargo status" : "Rate validity";

  return {
    cargo: {
      packedVolumeM3,
      grossWeightKg,
      loadabilityFactor,
      planningVolumeM3,
      sourceLineCount: lineCount,
      calculationRows: cargoCalculationRows,
      confidenceFactors: [
        volumeFromSource ? "Shipment-level packed volume is provided." : `${lineCount} source line(s) use the ${proxy.id} volume proxy because confirmed packing dimensions are unavailable.`,
        weightFromSource ? "Shipment-level gross weight is provided." : `${lineCount} source line(s) use the ${proxy.id} gross-weight proxy because confirmed shipment gross weights are unavailable.`,
        `Loadability uses a ${(loadabilityFactor.value * 100).toFixed(0)}% category assumption.`,
        input.pickupConfirmed ? "Pickup location is confirmed." : "Pickup location is assumed from supplier-side evidence.",
        input.specialCargoConfirmed ? "Special-cargo status is confirmed for this estimate." : "Special-cargo status is not confirmed.",
      ],
    },
    transport: { unit, requiredTruckCount, displayedTruckCount: requiredTruckCount + 1, volumeRequiredCount, weightRequiredCount, limitingFactor: factor, allocations, transitDays: benchmark.transitDays },
    costLines,
    nonInsuranceCost,
    insuranceRate: benchmark.insuranceRate,
    insuranceCoverageFactor: benchmark.insuranceCoverageFactor,
    estimatedInsurance,
    estimatedLogisticsCost,
    estimatedCommercialTotal: input.sourceValue + estimatedLogisticsCost,
    upliftPercent: input.sourceValue > 0 ? estimatedLogisticsCost / input.sourceValue * 100 : 0,
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

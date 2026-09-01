import type { CalculationWarning, Confidence, PackingEstimate, PackingItem, TransportMode, TransportUnit } from "./types.ts";

export const transportUnits: TransportUnit[] = [
  { id: "rail-40hc", label: "40HC rail container", mode: "rail", usableVolumeM3: 76.3, payloadKg: 26_500, internalDimensionsCm: { length: 1_203, width: 235, height: 269 } },
  { id: "rail-20std", label: "20ft rail container", mode: "rail", usableVolumeM3: 33.2, payloadKg: 28_000, internalDimensionsCm: { length: 589, width: 235, height: 239 } },
  { id: "sea-40hc", label: "40HC sea container", mode: "sea", usableVolumeM3: 76.3, payloadKg: 26_500, internalDimensionsCm: { length: 1_203, width: 235, height: 269 } },
  { id: "sea-40std", label: "40ft standard container", mode: "sea", usableVolumeM3: 67.7, payloadKg: 26_500, internalDimensionsCm: { length: 1_203, width: 235, height: 239 } },
  { id: "sea-20std", label: "20ft standard container", mode: "sea", usableVolumeM3: 33.2, payloadKg: 28_000, internalDimensionsCm: { length: 589, width: 235, height: 239 } },
  { id: "road-curtain", label: "13.6m curtain-side truck", mode: "road", usableVolumeM3: 90, payloadKg: 24_000, internalDimensionsCm: { length: 1_360, width: 248, height: 270 } },
  { id: "road-enclosed-136", label: "13.6m enclosed FTL truck", mode: "road", usableVolumeM3: 86, payloadKg: 22_000, internalDimensionsCm: { length: 1_360, width: 248, height: 265 } },
  { id: "air-pallet", label: "Air-freight pallet position", mode: "air", usableVolumeM3: 10, payloadKg: 4_500 },
  { id: "inland-40hc", label: "40HC inland-waterway container position", mode: "inland-waterway", usableVolumeM3: 76.3, payloadKg: 26_500, internalDimensionsCm: { length: 1_203, width: 235, height: 269 } },
  { id: "multimodal-40hc", label: "40HC multimodal planning unit", mode: "multimodal", usableVolumeM3: 76.3, payloadKg: 26_500, internalDimensionsCm: { length: 1_203, width: 235, height: 269 } },
  { id: "reefer-40hc", label: "40HC refrigerated container", mode: "sea", usableVolumeM3: 67, payloadKg: 27_000, internalDimensionsCm: { length: 1_154, width: 229, height: 255 }, refrigerated: true },
];

const confidenceRank: Record<Confidence, number> = { confirmed: 5, high: 4, medium: 3, low: 2, provisional: 1 };

function volumeOf(item: PackingItem) {
  if (item.packedDimensionsCm) {
    const { length, width, height } = item.packedDimensionsCm;
    return length * width * height / 1_000_000 * item.quantity;
  }
  return (item.proxyPackedVolumeM3 ?? 0) * item.quantity;
}

function weightOf(item: PackingItem) {
  return (item.grossWeightKg ?? item.proxyGrossWeightKg ?? 0) * item.quantity;
}

export function recommendTransportUnit(volumeM3: number, grossWeightKg: number, mode: TransportMode, preferredUnitId?: string, utilizationFactor = 0.92) {
  const candidates = transportUnits.filter((unit) => unit.mode === mode && !unit.refrigerated);
  const unit = transportUnits.find((candidate) => candidate.id === preferredUnitId && candidate.mode === mode) ?? candidates[0] ?? transportUnits.find((candidate) => candidate.id === "multimodal-40hc")!;
  const volumeQuantity = Math.max(1, Math.ceil(volumeM3 / (unit.usableVolumeM3 * utilizationFactor)));
  const weightQuantity = Math.max(1, Math.ceil(grossWeightKg / unit.payloadKg));
  const quantity = Math.max(volumeQuantity, weightQuantity);
  return {
    unit,
    quantity,
    volumeUtilizationPercent: Math.round(volumeM3 / (unit.usableVolumeM3 * quantity) * 1000) / 10,
    weightUtilizationPercent: Math.round(grossWeightKg / (unit.payloadKg * quantity) * 1000) / 10,
    reason: volumeQuantity >= weightQuantity ? "Volume governs unit count." : "Payload weight governs unit count.",
  };
}

export function estimatePacking(items: PackingItem[], mode: TransportMode, preferredUnitId?: string): PackingEstimate {
  const warnings: CalculationWarning[] = [];
  let volumeM3 = 0;
  let grossWeightKg = 0;
  let packages = 0;
  let proxyItemCount = 0;
  const specialCargo = new Set<string>();

  for (const item of items) {
    const hasPackedDimensions = Boolean(item.packedDimensionsCm);
    const hasPackedWeight = item.grossWeightKg !== undefined;
    if (!hasPackedDimensions || !hasPackedWeight) proxyItemCount += 1;
    if (item.productDimensionsCm && !hasPackedDimensions) warnings.push({ code: "PRODUCT_NOT_PACKED_DIMENSIONS", severity: "warning", message: `${item.description}: product dimensions are not packed dimensions; editable packing proxy used.` });
    const dimensions = item.packedDimensionsCm;
    if (dimensions && Object.values(dimensions).some((value) => !Number.isFinite(value) || value <= 0 || value > 3_000)) warnings.push({ code: "IMPLAUSIBLE_PACKED_DIMENSIONS", severity: "blocking", message: `${item.description}: packed dimensions are non-positive or exceed 30 m on one axis.` });
    const unitWeight = item.grossWeightKg ?? item.proxyGrossWeightKg ?? 0;
    if (!Number.isFinite(unitWeight) || unitWeight <= 0) warnings.push({ code: "MISSING_GROSS_WEIGHT", severity: "warning", message: `${item.description}: positive packed gross weight is missing.` });
    if (item.productWeightKg && unitWeight > 0 && unitWeight < item.productWeightKg) warnings.push({ code: "PACKED_WEIGHT_BELOW_PRODUCT", severity: "blocking", message: `${item.description}: gross packed weight is below product net weight.` });
    if (item.quantity <= 0 || !Number.isFinite(item.quantity)) warnings.push({ code: "INVALID_PACKING_QUANTITY", severity: "blocking", message: `${item.description}: quantity must be positive.` });
    volumeM3 += volumeOf(item);
    grossWeightKg += weightOf(item);
    packages += item.packages ?? item.quantity;
    if (item.stackable === false) specialCargo.add("Non-stackable cargo reduces practical cube utilization.");
    if (item.fragile) specialCargo.add("Fragile handling and securement required.");
    if (item.oversized) specialCargo.add("Oversized cargo requires route and unit-gauge validation.");
    if (item.temperatureControlled) specialCargo.add("Temperature-controlled cargo requires a separate provisional cold-chain plan.");
    if (item.dangerousGoods) specialCargo.add("Dangerous-goods classification, declaration and carrier acceptance required.");
    if (item.batteryOrRefrigerant) specialCargo.add("Battery / refrigerant declaration and mode-specific acceptance required.");
    if (item.segregated) specialCargo.add("Segregated loading is required.");
  }

  const confidence = items.reduce<Confidence>((lowest, item) => confidenceRank[item.confidence] < confidenceRank[lowest] ? item.confidence : lowest, "confirmed");
  const utilizationFactor = items.some((item) => item.stackable === false || item.fragile || item.oversized) ? 0.78 : 0.92;
  const recommendation = recommendTransportUnit(volumeM3, grossWeightKg, mode, preferredUnitId, utilizationFactor);
  if (recommendation.volumeUtilizationPercent > utilizationFactor * 100) warnings.push({ code: "UNIT_CAPACITY_TIGHT", severity: "warning", message: "Calculated cube exceeds the planning utilization threshold; an additional unit or loading plan review may be required." });
  if (items.some((item) => item.temperatureControlled) && !recommendation.unit.refrigerated) warnings.push({ code: "COLD_CHAIN_SEPARATE_UNIT", severity: "warning", message: "General unit recommendation excludes the provisional cold-chain parcel." });

  return {
    volumeM3: Math.round(volumeM3 * 1000) / 1000,
    grossWeightKg: Math.round(grossWeightKg * 10) / 10,
    packages,
    confidence,
    proxyItemCount,
    warnings,
    recommendation,
    specialCargo: [...specialCargo],
  };
}

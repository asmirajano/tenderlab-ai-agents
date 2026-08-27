import assert from "node:assert/strict";
import test from "node:test";
import path from "node:path";
import { pathToFileURL } from "node:url";

const projectRoot = process.cwd();
const load = (relativePath) => import(pathToFileURL(path.join(projectRoot, relativePath)).href);

const allCostLines = [
  ["pack", "export_packing", 100],
  ["load", "origin_loading", 110],
  ["pickup", "origin_pickup", 120],
  ["origin-terminal", "origin_terminal", 130],
  ["vessel-loading", "vessel_loading", 135],
  ["export", "export_clearance", 140],
  ["freight", "main_freight", 1_500],
  ["transit", "transit_handling", 150],
  ["transship", "transshipment", 160],
  ["insurance", "insurance", 170],
  ["destination-terminal", "destination_terminal", 180],
  ["import", "import_clearance", 190],
  ["duty", "duty", 200],
  ["tax", "vat_tax", 210],
  ["delivery", "final_delivery", 220],
  ["unload", "destination_unloading", 230],
].map(([id, component, amount]) => ({ id, component, label: String(component), amount, currency: "USD", evidenceKind: "sourced-fact", confidence: "confirmed" }));

function scenario(sourceTerm, targetTerm, transportMode) {
  return {
    id: `${sourceTerm}-${targetTerm}-${transportMode}`,
    mode: "incoterm-conversion",
    sourceContractTotal: 100_000,
    currency: "USD",
    sourceTerm,
    sourceNamedPlace: "Exact source place",
    targetTerm,
    targetNamedPlace: "Exact target place",
    incotermsVersion: "2020",
    transportMode,
    costLines: allCostLines,
    insurance: { enabled: true, premiumRate: 0.003, coverageFactor: 1.1, basis: "cost-before-insurance", clauses: targetTerm === "CIF" ? "C" : "A", note: "Test quotation" },
    importJurisdiction: targetTerm === "DDP" ? "Test jurisdiction" : undefined,
    importerOfRecord: targetTerm === "DDP" ? "Test seller importer" : undefined,
    taxRegistrationBasis: targetTerm === "DDP" ? "Test registration" : undefined,
  };
}

test("representative conversion families calculate with one treatment per service", async () => {
  const { calculateScenario } = await load("packages/logistics-costing/src/index.ts");
  const cases = [
    ...["FCA", "CPT", "CIP", "DAP", "DPU", "DDP"].map((target) => ["EXW", target, "multimodal"]),
    ...["CPT", "CIP", "DAP"].map((target) => ["FCA", target, "rail"]),
    ["FAS", "FOB", "sea"], ["FOB", "CFR", "sea"], ["FOB", "CIF", "sea"],
    ["CIF", "DAP", "sea"], ["CIF", "DDP", "sea"],
    ["CIP", "DAP", "rail"], ["CIP", "DDP", "rail"],
    ["DAP", "DPU", "road"], ["DAP", "DDP", "road"],
  ];
  for (const [source, target, mode] of cases) {
    const result = calculateScenario(scenario(source, target, mode));
    assert.notEqual(result.status, "blocked", `${source} → ${target} should be calculable on ${mode}: ${result.warnings.map((item) => item.code).join(", ")}`);
    assert.equal(new Set(result.treatments.map((line) => line.lineId)).size, result.treatments.length, `${source} → ${target} duplicated a service line`);
    assert.equal(result.revisedContractTotal, Math.round((result.sourceContractTotal + result.addedCosts - result.removedCosts) * 100) / 100);
  }
  const fasToFob = calculateScenario(scenario("FAS", "FOB", "sea"));
  assert.equal(fasToFob.treatments.find((line) => line.component === "vessel_loading").treatment, "added");
});

test("invalid source or target maritime rules block the whole scenario", async () => {
  const { calculateScenario } = await load("packages/logistics-costing/src/index.ts");
  const invalidSource = calculateScenario(scenario("FOB", "DAP", "air"));
  assert.equal(invalidSource.status, "blocked");
  assert.ok(invalidSource.warnings.some((warning) => warning.code === "INVALID_SOURCE_TERM_MODE"));
  const invalidTarget = calculateScenario(scenario("EXW", "CIF", "rail"));
  assert.equal(invalidTarget.status, "blocked");
  assert.ok(invalidTarget.warnings.some((warning) => warning.code === "INVALID_TARGET_TERM_MODE"));
});

test("every named logistics-only scope is independently calculable and custom scope is explicit", async () => {
  const { calculateScenario, logisticsScopeComponents } = await load("packages/logistics-costing/src/index.ts");
  for (const scope of Object.keys(logisticsScopeComponents)) {
    const result = calculateScenario({
      id: `scope-${scope}`, mode: "logistics-only", sourceContractTotal: 100_000, currency: "USD", sourceTerm: "EXW", sourceNamedPlace: "Factory",
      incotermsVersion: "2020", transportMode: "multimodal", logisticsScope: scope, costLines: allCostLines,
      insurance: { enabled: true, premiumRate: 0.003, coverageFactor: 1.1, basis: "cost-before-insurance", clauses: "A", note: "Test" },
    });
    assert.notEqual(result.status, "blocked", scope);
    assert.equal(result.sourceTerm, "EXW");
    assert.equal(result.targetTerm, undefined);
    assert.ok(result.incrementalCost >= 0);
  }
  const customLines = allCostLines.map((line) => ({ ...line, targetIncluded: ["main_freight", "cold_chain"].includes(line.component) }));
  customLines.push({ id: "cold", component: "cold_chain", label: "Cold chain", amount: 900, currency: "USD", targetIncluded: true, evidenceKind: "user-input", confidence: "high" });
  const custom = calculateScenario({
    id: "custom-scope", mode: "logistics-only", sourceContractTotal: 100_000, currency: "USD", sourceTerm: "FCA", sourceNamedPlace: "Terminal",
    incotermsVersion: "2020", transportMode: "air", logisticsScope: "custom", customScopeComponents: ["main_freight", "cold_chain"], costLines: customLines,
  });
  assert.equal(custom.incrementalCost, 2_400);
  assert.deepEqual(custom.treatments.filter((line) => line.targetIncluded).map((line) => line.component).sort(), ["cold_chain", "main_freight"]);
});

test("contract modifications overlay rather than mutate the canonical DAP rule", async () => {
  const { calculateScenario, incotermProfiles } = await load("packages/logistics-costing/src/index.ts");
  const before = [...incotermProfiles.DAP.sellerPaidComponents];
  const result = calculateScenario({
    ...scenario("EXW", "DAP", "road"),
    contractOverrides: [
      { component: "destination_unloading", targetIncluded: true, description: "DAP unloaded under Contract Schedule 4", sourceRef: "Schedule 4 §3" },
      { component: "vat_tax", targetIncluded: true, description: "Seller reimburses a named non-import tax", sourceRef: "Price Schedule note 8" },
    ],
    contractBoundaryOverrides: [{
      side: "target",
      description: "Delivery and risk pass only after seller completes unloading.",
      sourceRef: "Schedule 4 §3",
      deliveryPoint: "Buyer site after unloading and signed handover.",
      riskTransferPoint: "After unloading and signed handover at the buyer site.",
      costBoundary: "Seller pays delivery, unloading and the separately named reimbursable tax.",
    }],
  });
  assert.equal(result.treatments.find((line) => line.component === "destination_unloading").treatment, "added");
  assert.equal(result.treatments.find((line) => line.component === "vat_tax").treatment, "added");
  assert.deepEqual(incotermProfiles.DAP.sellerPaidComponents, before);
  assert.equal(result.warnings.filter((warning) => warning.code === "CONTRACT_OVERRIDE").length, 2);
  assert.equal(result.targetResponsibilities.basis, "contract-modified");
  assert.match(result.targetResponsibilities.deliveryPoint, /after unloading/i);
  assert.match(result.targetResponsibilities.riskTransferPoint, /signed handover/i);
  assert.deepEqual(result.targetResponsibilities.contractDeviations, [{ description: "Delivery and risk pass only after seller completes unloading.", sourceRef: "Schedule 4 §3" }]);
  assert.ok(result.warnings.some((warning) => warning.code === "CONTRACT_BOUNDARY_OVERRIDE"));
});

test("special cargo produces visible handling and segregation findings", async () => {
  const { estimatePacking } = await load("packages/logistics-costing/src/index.ts");
  const estimate = estimatePacking([{
    id: "special", description: "Refrigerated battery-powered analyzer", quantity: 2,
    packedDimensionsCm: { length: 140, width: 100, height: 130 }, grossWeightKg: 900, packages: 2,
    stackable: false, fragile: true, oversized: true, temperatureControlled: true, dangerousGoods: true,
    batteryOrRefrigerant: true, segregated: true, evidenceKind: "user-input", confidence: "medium",
  }], "air");
  for (const pattern of [/Non-stackable/i, /Fragile/i, /Oversized/i, /Temperature-controlled/i, /Dangerous-goods/i, /Battery \/ refrigerant/i, /Segregated/i]) {
    assert.ok(estimate.specialCargo.some((finding) => pattern.test(finding)), pattern.source);
  }
  assert.ok(estimate.warnings.some((warning) => warning.code === "COLD_CHAIN_SEPARATE_UNIT"));
});

test("packing validation catches missing, impossible and capacity-driving inputs", async () => {
  const { estimatePacking, recommendTransportUnit } = await load("packages/logistics-costing/src/index.ts");
  const missing = estimatePacking([{ id: "missing", description: "Unpacked item", quantity: 1, productDimensionsCm: { length: 10, width: 10, height: 10 }, evidenceKind: "assumption", confidence: "low" }], "road");
  assert.ok(missing.warnings.some((warning) => warning.code === "PRODUCT_NOT_PACKED_DIMENSIONS"));
  assert.ok(missing.warnings.some((warning) => warning.code === "MISSING_GROSS_WEIGHT"));
  const impossible = estimatePacking([{ id: "impossible", description: "Impossible crate", quantity: 1, packedDimensionsCm: { length: 4_000, width: 100, height: 100 }, grossWeightKg: 50, evidenceKind: "user-input", confidence: "high" }], "road");
  assert.ok(impossible.warnings.some((warning) => warning.code === "IMPLAUSIBLE_PACKED_DIMENSIONS"));
  const volumeDriven = recommendTransportUnit(180, 2_000, "road");
  assert.match(volumeDriven.reason, /Volume/);
  const weightDriven = recommendTransportUnit(20, 50_000, "road");
  assert.match(weightDriven.reason, /weight/i);
  assert.ok(volumeDriven.quantity >= 3);
  assert.ok(weightDriven.quantity >= 3);
  for (const mode of ["road", "rail", "air", "sea", "inland-waterway", "multimodal"]) assert.equal(recommendTransportUnit(20, 1_000, mode).unit.mode, mode);
  assert.ok(recommendTransportUnit(100, 5_000, "sea", "sea-20std").quantity > recommendTransportUnit(100, 5_000, "sea", "sea-40hc").quantity);
  assert.equal(recommendTransportUnit(20, 1_000, "sea", "reefer-40hc").unit.refrigerated, true);
  assert.equal(recommendTransportUnit(20, 1_000, "road", "rail-40hc").unit.mode, "road", "an incompatible preferred unit must not leak across transport modes");
});

test("CIP and CIF insurance requirements differ and remain separately auditable", async () => {
  const { calculateScenario, incotermProfiles } = await load("packages/logistics-costing/src/index.ts");
  assert.equal(incotermProfiles.CIP.insurance, "seller-required-a");
  assert.equal(incotermProfiles.CIF.insurance, "seller-required-c");
  const cipWrongCover = calculateScenario({ ...scenario("EXW", "CIP", "rail"), insurance: { enabled: true, premiumRate: .003, coverageFactor: 1.1, basis: "cost-before-insurance", clauses: "C" } });
  assert.ok(cipWrongCover.warnings.some((warning) => warning.code === "CIP_INSURANCE_COVER"));
  const cifHigherCover = calculateScenario({ ...scenario("FOB", "CIF", "sea"), insurance: { enabled: true, premiumRate: .003, coverageFactor: 1.1, basis: "cost-before-insurance", clauses: "A" } });
  assert.ok(cifHigherCover.warnings.some((warning) => warning.code === "CIF_HIGHER_COVER"));
});

test("rate-validity contingency and optional tax remain separately disclosed", async () => {
  const { calculateScenario } = await load("packages/logistics-costing/src/index.ts");
  const result = calculateScenario({
    id: "allowances", mode: "logistics-only", sourceContractTotal: 50_000, currency: "USD", sourceTerm: "FCA", sourceNamedPlace: "Origin",
    incotermsVersion: "2020", transportMode: "road", logisticsScope: "custom", customScopeComponents: ["main_freight", "contingency"],
    costLines: [
      { id: "freight", component: "main_freight", label: "Freight valid 7 days", amount: 3_000, currency: "USD", targetIncluded: true, rateDate: "2026-08-26", evidenceKind: "sourced-fact", confidence: "high" },
      { id: "allowance", component: "contingency", label: "Rate-validity allowance", amount: 250, currency: "USD", targetIncluded: true, evidenceKind: "assumption", confidence: "provisional" },
      { id: "tax", component: "vat_tax", label: "Optional VAT", amount: 500, currency: "USD", targetIncluded: false, evidenceKind: "user-input", confidence: "high" },
    ],
  });
  assert.equal(result.incrementalCost, 3_250);
  assert.equal(result.dutiesTaxes, 0);
  assert.equal(result.treatments.find((line) => line.component === "vat_tax").treatment, "excluded");
  assert.ok(result.warnings.some((warning) => warning.code === "PROVISIONAL_COST_INPUTS"));
});

test("duplicate, negative and unvalued reverse-conversion lines cannot pass silently", async () => {
  const { calculateScenario } = await load("packages/logistics-costing/src/index.ts");
  const invalid = calculateScenario({
    id: "invalid-lines", mode: "incoterm-conversion", sourceContractTotal: 1_000, currency: "USD", sourceTerm: "CIP", sourceNamedPlace: "Destination",
    targetTerm: "FCA", targetNamedPlace: "Origin", incotermsVersion: "2020", transportMode: "rail",
    costLines: [
      { id: "same", component: "main_freight", label: "Freight", amount: -1, currency: "USD", evidenceKind: "user-input", confidence: "high" },
      { id: "same", component: "insurance", label: "Insurance", amount: 10, currency: "USD", evidenceKind: "sourced-fact", confidence: "confirmed" },
    ],
  });
  assert.equal(invalid.status, "blocked");
  assert.ok(invalid.warnings.some((warning) => warning.code === "DUPLICATE_COST_LINE_ID"));
  assert.ok(invalid.warnings.some((warning) => warning.code === "INVALID_COST_AMOUNT"));
  assert.ok(invalid.warnings.some((warning) => warning.code === "UNVALUED_REMOVED_COST"));
});

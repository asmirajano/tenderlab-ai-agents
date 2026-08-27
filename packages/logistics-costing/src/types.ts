export const incotermCodes = [
  "EXW", "FCA", "CPT", "CIP", "DAP", "DPU", "DDP", "FAS", "FOB", "CFR", "CIF",
] as const;

export type IncotermCode = typeof incotermCodes[number];

export const transportModes = ["road", "rail", "air", "sea", "inland-waterway", "multimodal"] as const;
export type TransportMode = typeof transportModes[number];

export const costComponentCodes = [
  "export_packing",
  "origin_loading",
  "origin_pickup",
  "origin_terminal",
  "vessel_loading",
  "export_clearance",
  "main_freight",
  "transit_handling",
  "transshipment",
  "insurance",
  "destination_terminal",
  "import_clearance",
  "duty",
  "vat_tax",
  "final_delivery",
  "destination_unloading",
  "cold_chain",
  "dangerous_goods",
  "battery_refrigerant",
  "oversized_nonstackable",
  "inspection_permit",
  "storage",
  "demurrage_detention",
  "contingency",
] as const;

export type CostComponentCode = typeof costComponentCodes[number];
export type EvidenceKind = "sourced-fact" | "user-input" | "assumption" | "calculation";
export type Confidence = "confirmed" | "high" | "medium" | "low" | "provisional";

export type IncotermProfile = {
  code: IncotermCode;
  name: string;
  version: "2020";
  modeFamily: "any-mode" | "sea-inland-waterway";
  sellerPaidComponents: CostComponentCode[];
  deliveryPoint: string;
  riskTransferPoint: string;
  costBoundary: string;
  exportClearance: "seller" | "buyer";
  importClearance: "seller" | "buyer";
  loading: string;
  unloading: string;
  carriage: string;
  insurance: "seller-required-a" | "seller-required-c" | "no-obligation";
  notes: string[];
};

export type CostLine = {
  id: string;
  component: CostComponentCode;
  label: string;
  amount: number;
  currency: string;
  quantity?: number;
  rateDate?: string;
  sourceRef?: string;
  evidenceKind: EvidenceKind;
  confidence: Confidence;
  startIncluded?: boolean;
  targetIncluded?: boolean;
  note?: string;
};

export type ContractOverride = {
  component: CostComponentCode;
  startIncluded?: boolean;
  targetIncluded?: boolean;
  description: string;
  sourceRef?: string;
};

export type ContractBoundaryOverride = {
  side: "start" | "target";
  description: string;
  sourceRef?: string;
  namedPlace?: string;
  deliveryPoint?: string;
  riskTransferPoint?: string;
  costBoundary?: string;
  exportClearance?: string;
  importClearance?: string;
  loading?: string;
  unloading?: string;
  carriage?: string;
  insurance?: string;
};

export type ExchangeRate = {
  from: string;
  to: string;
  rate: number;
  asOf: string;
  source: string;
  confidence: Confidence;
};

export type InsuranceInput = {
  enabled: boolean;
  premiumRate: number;
  coverageFactor: number;
  basis: "final-contract-value" | "cost-before-insurance";
  clauses?: "A" | "C" | "custom";
  note?: string;
};

export type LogisticsScope =
  | "factory-to-terminal"
  | "port-to-port"
  | "airport-to-airport"
  | "terminal-to-terminal"
  | "door-to-door"
  | "domestic-delivery"
  | "international-freight"
  | "export-side"
  | "import-side"
  | "contract-logistics-ex-duty-tax"
  | "landed-cost-including-duty-tax"
  | "custom";

export type CalculationMode = "incoterm-conversion" | "logistics-only";

export type CalculationInput = {
  id: string;
  mode: CalculationMode;
  sourceContractTotal: number;
  currency: string;
  sourceTerm: IncotermCode;
  sourceNamedPlace: string;
  targetTerm?: IncotermCode;
  targetNamedPlace?: string;
  incotermsVersion: "2020";
  transportMode: TransportMode;
  logisticsScope?: LogisticsScope;
  customScopeComponents?: CostComponentCode[];
  costLines: CostLine[];
  contractOverrides?: ContractOverride[];
  contractBoundaryOverrides?: ContractBoundaryOverride[];
  exchangeRates?: ExchangeRate[];
  insurance?: InsuranceInput;
  importJurisdiction?: string;
  importerOfRecord?: string;
  taxRegistrationBasis?: string;
  assumptions?: string[];
};

export type ComponentTreatment = {
  lineId: string;
  component: CostComponentCode;
  label: string;
  amount: number;
  originalAmount: number;
  originalCurrency: string;
  currency: string;
  sourceRef?: string;
  rateDate?: string;
  startIncluded: boolean;
  targetIncluded: boolean;
  treatment: "added" | "removed" | "retained" | "excluded";
  inclusionBasis: "standard-rule" | "cost-line" | "contract-override" | "logistics-scope";
  evidenceKind: EvidenceKind;
  confidence: Confidence;
  note?: string;
};

export type CalculationWarning = {
  code: string;
  severity: "info" | "warning" | "blocking";
  message: string;
};

export type ResponsibilitySummary = {
  term: IncotermCode;
  namedPlace: string;
  deliveryPoint: string;
  riskTransferPoint: string;
  costBoundary: string;
  exportClearance: string;
  importClearance: string;
  loading: string;
  unloading: string;
  carriage: string;
  insurance: string;
  basis: "standard-rule" | "contract-modified";
  contractDeviations: Array<{ description: string; sourceRef?: string }>;
};

export type CalculationResult = {
  id: string;
  status: "ready" | "provisional" | "blocked";
  mode: CalculationMode;
  currency: string;
  sourceContractTotal: number;
  sourceTerm: IncotermCode;
  targetTerm?: IncotermCode;
  logisticsScope?: LogisticsScope;
  nonInsuranceAdded: number;
  insurance: number;
  dutiesTaxes: number;
  retainedCosts: number;
  addedCosts: number;
  removedCosts: number;
  incrementalCost: number;
  revisedContractTotal: number;
  logisticsUpliftPercent: number;
  treatments: ComponentTreatment[];
  startResponsibilities: ResponsibilitySummary;
  targetResponsibilities?: ResponsibilitySummary;
  warnings: CalculationWarning[];
  assumptions: string[];
  audit: {
    engineVersion: string;
    calculatedAt: string;
    formula: string;
    evidenceKinds: Record<EvidenceKind, number>;
  };
};

export type ContractLine = {
  id: string;
  description: string;
  quantity: number;
  unit: string;
  sourcePrice: number;
  currency: string;
  sourceRef?: string;
};

export type AllocatedContractLine = ContractLine & {
  includedLogistics: number;
  additionalLogistics: number;
  removedCosts: number;
  insurance: number;
  dutiesTaxes: number;
  resultingPrice: number;
  allocationMethod: "source-value-pro-rata" | "direct";
  assumptions: string[];
};

export type PackingItem = {
  id: string;
  description: string;
  quantity: number;
  productDimensionsCm?: { length: number; width: number; height: number };
  packedDimensionsCm?: { length: number; width: number; height: number };
  productWeightKg?: number;
  grossWeightKg?: number;
  proxyPackedVolumeM3?: number;
  proxyGrossWeightKg?: number;
  packages?: number;
  stackable?: boolean;
  fragile?: boolean;
  oversized?: boolean;
  temperatureControlled?: boolean;
  dangerousGoods?: boolean;
  batteryOrRefrigerant?: boolean;
  segregated?: boolean;
  evidenceKind: EvidenceKind;
  confidence: Confidence;
};

export type TransportUnit = {
  id: string;
  label: string;
  mode: TransportMode;
  usableVolumeM3: number;
  payloadKg: number;
  refrigerated?: boolean;
};

export type PackingEstimate = {
  volumeM3: number;
  grossWeightKg: number;
  packages: number;
  confidence: Confidence;
  proxyItemCount: number;
  warnings: CalculationWarning[];
  recommendation: {
    unit: TransportUnit;
    quantity: number;
    volumeUtilizationPercent: number;
    weightUtilizationPercent: number;
    reason: string;
  };
  specialCargo: string[];
};

export type DocumentIntakeRecord = {
  id: string;
  fileName: string;
  format: "json" | "csv" | "pdf" | "spreadsheet" | "unknown";
  status: "parsed" | "staged-for-review" | "rejected";
  rows: Record<string, unknown>[];
  facts: string[];
  ignoredInstructions: string[];
  warnings: CalculationWarning[];
};

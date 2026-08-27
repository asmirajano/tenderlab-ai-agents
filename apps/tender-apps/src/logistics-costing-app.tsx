/* eslint-disable react-hooks/static-components, react/no-unescaped-entities -- The stateless questionnaire is draft-scoped; client copy intentionally uses natural contractions. */
import { useMemo, useState, type ChangeEvent } from "react";
import {
  allocateResultToContractLines,
  buildProductionLogisticsEstimate,
  calculateScenario,
  componentLabels,
  costComponentCodes,
  exwGuangzhouToCipTashkent,
  incotermCodes,
  incotermProfiles,
  isSpecificNamedDestination,
  incotermsAuthoritativeSources,
  logisticsScopeComponents,
  logisticsCostingProcessDefinition,
  regressionCostLines,
  roundMoney,
  transportUnits,
  transportModes,
  type CalculationInput,
  type CalculationResult,
  type ContractOverride,
  type CostComponentCode,
  type CostLine,
  type DocumentFactScope,
  type DocumentIntakeRecord,
  type IncotermCode,
  type LogisticsScope,
  type ProductionLogisticsEstimate,
  type TruckAllocation,
  type TransportMode,
} from "../../../packages/logistics-costing/src";
import { readClientDocument, type DocumentProcessingStage } from "./client-document-extraction";

type WorkspaceMode = "conversion" | "logistics";
type ClientSurface = "welcome" | "intake" | "result" | "cases" | "audit";
type ClientGoal = "" | "logistics" | "conversion" | "landed" | "term-advice";
type TermKnowledge = "" | "known" | "help";
type InputSupplyMode = "" | "manual" | "documents";
type CostScopeBasis = "incoterm" | LogisticsScope;
type CostInputState = "unknown" | "provided" | "extracted" | "estimated" | "needs-confirmation" | "not-applicable";
type SpecialCargoDeclaration = "" | "standard-confirmed" | "possible-special" | "declared-special";
type IntakeFieldKey = "cargoDescription" | "quantityDescription" | "sourceTotal" | "currency" | "sourcePlace" | "targetPlace" | "transportMode" | "packedVolumeM3" | "grossWeightKg" | "sourceTerm" | "targetTerm";
type ExtractedInputEvidence = {
  status: "extracted-confidently" | "needs-confirmation" | "client-adjusted";
  sourceRef: string;
  originalValue: string | number;
  basis?: string;
  scope?: DocumentFactScope;
};
type ExtractedValue = Omit<ExtractedInputEvidence, "status"> & { confidence: "high" | "medium" };
type DocumentExtraction = {
  fields: Partial<Record<IntakeFieldKey, ExtractedValue>>;
  costs: Partial<Record<CostComponentCode, ExtractedValue & { currency?: string }>>;
};
type ResponsibilityAnswer = "" | "seller" | "buyer" | "unknown";
type ResponsibilityAnswers = {
  exportClearance: ResponsibilityAnswer;
  internationalFreight: ResponsibilityAnswer;
  insurance: ResponsibilityAnswer;
  finalDestination: ResponsibilityAnswer;
  importClearance: ResponsibilityAnswer;
  dutiesTaxes: ResponsibilityAnswer;
  unloading: ResponsibilityAnswer;
};

type SavedCase = {
  id: string;
  name: string;
  approvedAt: string;
  status: "approved";
  cargo: string;
  quantity: string;
  origin: string;
  destination: string;
  packedVolumeM3: number;
  grossWeightKg: number;
  specialCargoDeclaration?: SpecialCargoDeclaration;
  input: CalculationInput;
  result: CalculationResult;
};

const SAVED_CASES_KEY = "tenderapps.landed-cost.saved-cases.v1";

const guidedSteps = [
  { id: 1, short: "Goal", label: "What do you need?" },
  { id: 2, short: "Shipment", label: "Tell us about the transaction" },
  { id: 3, short: "Current terms", label: "How is delivery handled now?" },
  { id: 4, short: "Desired terms", label: "What should change?" },
  { id: 5, short: "Costs", label: "Review prepared cost inputs" },
  { id: 6, short: "Review", label: "Check what we understood" },
] as const;

const clientGoals: Array<{ id: Exclude<ClientGoal, "">; title: string; description: string }> = [
  { id: "logistics", title: "Calculate logistics cost", description: "Price a route or selected logistics scope without changing the commercial term." },
  { id: "conversion", title: "Change delivery responsibilities", description: "See the cost impact of moving from the current arrangement to a different one." },
  { id: "landed", title: "Calculate landed cost", description: "Include the complete route and, when supplied, import clearance, duties and taxes." },
  { id: "term-advice", title: "Help structure delivery terms", description: "Describe who should handle each responsibility and receive a closest-rule suggestion." },
];

const responsibilityQuestions: Array<{ key: keyof ResponsibilityAnswers; label: string; hint: string }> = [
  { key: "exportClearance", label: "Who handles export customs?", hint: "Formalities in the supplier's country." },
  { key: "internationalFreight", label: "Who pays the main international transport?", hint: "Rail, road, air, sea or multimodal freight." },
  { key: "insurance", label: "Who arranges cargo insurance?", hint: "Only if insurance forms part of the arrangement." },
  { key: "finalDestination", label: "Who pays delivery to the final destination?", hint: "Beyond the main terminal or port." },
  { key: "importClearance", label: "Who handles import customs?", hint: "Importer-of-record and clearance responsibility." },
  { key: "dutiesTaxes", label: "Who pays import duties and taxes?", hint: "Keep actual amounts separate from responsibility." },
  { key: "unloading", label: "Who pays unloading at destination?", hint: "Unloading from the arriving vehicle or unit." },
];

function emptyResponsibilityAnswers(): ResponsibilityAnswers {
  return { exportClearance: "", internationalFreight: "", insurance: "", finalDestination: "", importClearance: "", dutiesTaxes: "", unloading: "" };
}

function inferClosestTerm(answers: ResponsibilityAnswers): IncotermCode | undefined {
  if (answers.importClearance === "seller" || answers.dutiesTaxes === "seller") return "DDP";
  if (answers.finalDestination === "seller" && answers.unloading === "seller") return "DPU";
  if (answers.finalDestination === "seller") return "DAP";
  if (answers.internationalFreight === "seller" && answers.insurance === "seller") return "CIP";
  if (answers.internationalFreight === "seller") return "CPT";
  if (answers.exportClearance === "seller") return "FCA";
  if (Object.values(answers).some((answer) => answer === "buyer")) return "EXW";
  return undefined;
}

function makeEmptyCostLines(): CostLine[] {
  return regressionCostLines.map((line) => ({
    ...line,
    label: componentLabels[line.component],
    amount: 0,
    sourceRef: undefined,
    rateDate: undefined,
    evidenceKind: "user-input",
    confidence: "provisional",
    note: undefined,
  }));
}

function normalizeDocumentKey(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "");
}

function flattenDocumentValue(value: unknown, path = "", entries: Array<{ key: string; value: unknown }> = []) {
  if (Array.isArray(value)) value.forEach((entry, index) => flattenDocumentValue(entry, `${path}_${index + 1}`, entries));
  else if (value && typeof value === "object") Object.entries(value as Record<string, unknown>).forEach(([key, entry]) => flattenDocumentValue(entry, path ? `${path}_${key}` : key, entries));
  else if (path) entries.push({ key: normalizeDocumentKey(path), value });
  return entries;
}

function numericDocumentValue(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value !== "string") return undefined;
  const normalized = value.replace(/[^0-9.-]+/g, "");
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function extractDocumentInputs(records: DocumentIntakeRecord[]): DocumentExtraction {
  const extraction: DocumentExtraction = { fields: {}, costs: {} };
  const aliases: Record<IntakeFieldKey, string[]> = {
    cargoDescription: ["product_or_cargo", "cargo_description", "product_description", "goods_description", "item_description", "cargo", "product"],
    quantityDescription: ["quantity_package_count", "package_count", "package_quantity", "quantity", "packages", "line_count"],
    sourceTotal: ["contract_or_goods_value", "contract_value", "goods_value", "quotation_total", "grand_total", "total_amount", "total_value"],
    currency: ["contract_currency", "quotation_currency", "currency", "currency_code"],
    sourcePlace: ["supplier_origin", "source_named_place", "source_place", "ship_from", "supplier_location", "origin"],
    targetPlace: ["target_named_place", "delivery_place", "ship_to", "destination", "delivery_location"],
    transportMode: ["transport_mode", "freight_mode", "shipment_mode", "mode_of_transport"],
    packedVolumeM3: ["estimated_packed_volume_m3", "packed_volume_m3", "volume_m3", "total_cbm", "cbm"],
    grossWeightKg: ["estimated_gross_weight_kg", "gross_weight_kg", "total_gross_weight_kg", "weight_kg"],
    sourceTerm: ["current_incoterm", "source_incoterm", "existing_incoterm", "incoterm"],
    targetTerm: ["target_incoterm", "desired_incoterm", "proposed_incoterm"],
  };
  const validTerms = new Set<string>(incotermCodes);
  const validModes = new Set<string>(transportModes);

  for (const record of records.filter((candidate) => candidate.status === "parsed")) {
    const entries = record.rows.flatMap((row) => flattenDocumentValue(row));
    for (const [field, fieldAliases] of Object.entries(aliases) as Array<[IntakeFieldKey, string[]]>) {
      if (extraction.fields[field]) continue;
      const match = entries.find((entry) => fieldAliases.some((alias) => entry.key === alias || entry.key.endsWith(`_${alias}`)));
      if (!match || match.value === "" || match.value === null || match.value === undefined) continue;
      let parsedValue: string | number = String(match.value).trim();
      if (["sourceTotal", "packedVolumeM3", "grossWeightKg"].includes(field)) {
        const numeric = numericDocumentValue(match.value);
        if (numeric === undefined) continue;
        parsedValue = numeric;
      }
      if (field === "currency") parsedValue = String(parsedValue).toUpperCase().slice(0, 3);
      if (field === "sourceTerm" || field === "targetTerm") {
        const term = String(parsedValue).toUpperCase().match(/\b(EXW|FCA|CPT|CIP|DAP|DPU|DDP|FAS|FOB|CFR|CIF)\b/)?.[1];
        if (!term || !validTerms.has(term)) continue;
        parsedValue = term;
      }
      if (field === "transportMode") {
        const mode = String(parsedValue).toLowerCase().replace("road freight", "road").replace("rail freight", "rail").replace("air freight", "air").replace("sea freight", "sea");
        if (!validModes.has(mode)) continue;
        parsedValue = mode;
      }
      const exactAlias = fieldAliases.some((alias) => match.key === alias);
      const semanticEvidence = record.fieldEvidence?.[match.key];
      extraction.fields[field] = {
        originalValue: parsedValue,
        sourceRef: semanticEvidence?.sourceRef ?? record.fieldSources?.[match.key] ?? `${record.fileName} · ${match.key.replaceAll("_", " ")}`,
        confidence: semanticEvidence?.confidence === "high" ? "high" : exactAlias && !semanticEvidence ? "high" : "medium",
        basis: semanticEvidence?.basis,
        scope: semanticEvidence?.scope,
      };
    }

    for (const row of record.rows) {
      const normalizedRow = Object.fromEntries(Object.entries(row).map(([key, value]) => [normalizeDocumentKey(key), value]));
      const componentName = String(normalizedRow.component ?? normalizedRow.cost_component ?? normalizedRow.service ?? normalizedRow.description ?? normalizedRow.label ?? "");
      const normalizedComponentName = normalizeDocumentKey(componentName);
      const rowComponent = costComponentCodes.find((component) => normalizedComponentName === component || normalizedComponentName === normalizeDocumentKey(componentLabels[component]));
      const rowAmount = numericDocumentValue(normalizedRow.amount ?? normalizedRow.cost ?? normalizedRow.price ?? normalizedRow.value);
      if (rowComponent && rowAmount !== undefined && !extraction.costs[rowComponent]) {
        extraction.costs[rowComponent] = { originalValue: rowAmount, sourceRef: String(normalizedRow.source_ref ?? `${record.fileName} · ${componentName}`), confidence: "high", currency: String(normalizedRow.currency ?? "").toUpperCase() || undefined };
      }
    }

    for (const component of costComponentCodes) {
      if (extraction.costs[component]) continue;
      const componentAliases = [component, `${component}_amount`, normalizeDocumentKey(componentLabels[component]), `${normalizeDocumentKey(componentLabels[component])}_amount`];
      const match = entries.find((entry) => componentAliases.some((alias) => entry.key === alias || entry.key.endsWith(`_${alias}`)) && numericDocumentValue(entry.value) !== undefined);
      const amount = match ? numericDocumentValue(match.value) : undefined;
      if (match && amount !== undefined) {
        const semanticEvidence = record.fieldEvidence?.[match.key];
        extraction.costs[component] = { originalValue: amount, sourceRef: semanticEvidence?.sourceRef ?? record.fieldSources?.[match.key] ?? `${record.fileName} · ${match.key.replaceAll("_", " ")}`, confidence: semanticEvidence?.confidence === "high" ? "high" : "medium", basis: semanticEvidence?.basis, scope: semanticEvidence?.scope };
      }
    }
  }
  return extraction;
}

function readSavedCases(): SavedCase[] {
  try {
    const parsed = JSON.parse(localStorage.getItem(SAVED_CASES_KEY) ?? "[]") as unknown;
    return Array.isArray(parsed) ? parsed as SavedCase[] : [];
  } catch {
    return [];
  }
}

const logisticsScopes: Array<{ id: LogisticsScope; label: string }> = [
  { id: "factory-to-terminal", label: "Factory → terminal" },
  { id: "port-to-port", label: "Port → port" },
  { id: "airport-to-airport", label: "Airport → airport" },
  { id: "terminal-to-terminal", label: "Terminal → terminal" },
  { id: "door-to-door", label: "Door → door" },
  { id: "domestic-delivery", label: "Domestic delivery only" },
  { id: "international-freight", label: "International freight only" },
  { id: "export-side", label: "Export-side expenses" },
  { id: "import-side", label: "Import-side expenses" },
  { id: "contract-logistics-ex-duty-tax", label: "Complete logistics · ex duty / tax" },
  { id: "landed-cost-including-duty-tax", label: "Complete landed cost · incl duty / tax" },
  { id: "custom", label: "Custom contract responsibility set" },
];

const specialEditableComponents = new Set<CostComponentCode>([
  "insurance", "cold_chain", "dangerous_goods", "battery_refrigerant", "oversized_nonstackable", "inspection_permit", "storage", "demurrage_detention", "contingency",
]);

function money(value: number, currency = "USD") {
  return new Intl.NumberFormat("en-US", { style: "currency", currency, minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(value);
}

function number(value: number, digits = 1) {
  return new Intl.NumberFormat("en-US", { minimumFractionDigits: digits, maximumFractionDigits: digits }).format(value);
}

function approximateNumber(value: number, unit: string) {
  return `≈ ${new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 }).format(Math.round(value))} ${unit}`;
}

function approximateMoney(value: number, currency = "USD", headline = false) {
  const magnitude = headline && Math.abs(value) >= 10_000 ? 1_000 : 1;
  const rounded = Math.round(value / magnitude) * magnitude;
  return `≈ ${currency} ${new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 }).format(rounded)}`;
}

function exactMoney(value: number, currency = "USD") {
  return `${currency} ${new Intl.NumberFormat("en-US", { minimumFractionDigits: Number.isInteger(value) ? 0 : 2, maximumFractionDigits: 2 }).format(value)}`;
}

function TruckCutaway({ allocation, unitLabel }: { allocation: TruckAllocation; unitLabel: string }) {
  const fill = Math.max(0, Math.min(100, allocation.volumeUtilizationPercent));
  return <article className={`truck-allocation truck-${allocation.state}`}>
    <header><div><span>TRUCK {allocation.index}</span><strong>{allocation.state === "free" ? "FREE / NOT REQUIRED" : allocation.state === "full" ? "FULL / USED" : "PARTIALLY LOADED"}</strong></div>{allocation.state !== "free" && <em>{unitLabel}</em>}</header>
    <div className="truck-cutaway" aria-label={allocation.state === "free" ? `Truck ${allocation.index}, free capacity reference` : `Truck ${allocation.index}, approximately ${Math.round(fill)} percent occupied by planning volume`}>
      <svg viewBox="0 0 520 150" role="img" aria-hidden="true">
        <defs><clipPath id={`trailer-clip-${allocation.index}`}><rect x="30" y="18" width="405" height="96" rx="9" /></clipPath></defs>
        <rect className="trailer-shell" x="30" y="18" width="405" height="96" rx="9" />
        <rect className="cargo-fill" clipPath={`url(#trailer-clip-${allocation.index})`} x="30" y="18" width={405 * fill / 100} height="96" />
        <path className="truck-cab" d="M435 54h43l20 25v35h-63z" />
        <circle className="truck-wheel" cx="108" cy="126" r="14" /><circle className="truck-wheel" cx="386" cy="126" r="14" /><circle className="truck-wheel" cx="470" cy="126" r="14" />
        <path className="trailer-grid" d="M111 18v96M192 18v96M273 18v96M354 18v96" />
      </svg>
    </div>
    {allocation.state !== "free" ? <dl><div><dt>VOLUME</dt><dd>≈ {Math.round(allocation.volumeUtilizationPercent)}%</dd></div><div><dt>WEIGHT</dt><dd>≈ {Math.round(allocation.weightUtilizationPercent)}%</dd></div></dl> : <p>Capacity reference only</p>}
  </article>;
}

function downloadText(fileName: string, content: string, mime: string) {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = fileName;
  anchor.style.display = "none";
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 0);
}

function csvCell(value: unknown) {
  return `"${String(value ?? "").replaceAll('"', '""')}"`;
}

function StatusBadge({ result }: { result: CalculationResult }) {
  return <span className={`costing-status status-${result.status}`}><i />{result.status === "ready" ? "READY" : result.status === "blocked" ? "BLOCKED" : "PROVISIONAL"}</span>;
}

function ResponsibilityCard({ title, summary }: { title: string; summary: CalculationResult["startResponsibilities"] }) {
  return (
    <article className="responsibility-card">
      <header><span>{title}</span><strong>{summary.term} <small>Incoterms® 2020</small></strong><p>{summary.namedPlace}</p>{summary.basis === "contract-modified" && <b>CONTRACT-MODIFIED</b>}</header>
      <dl>
        <div><dt>DELIVERY</dt><dd>{summary.deliveryPoint}</dd></div>
        <div><dt>RISK TRANSFER</dt><dd>{summary.riskTransferPoint}</dd></div>
        <div><dt>COST BOUNDARY</dt><dd>{summary.costBoundary}</dd></div>
        <div><dt>CLEARANCE</dt><dd>Export: {summary.exportClearance} · Import: {summary.importClearance}</dd></div>
        <div><dt>LOADING / UNLOADING</dt><dd>{summary.loading} {summary.unloading}</dd></div>
        <div><dt>CARRIAGE / INSURANCE</dt><dd>{summary.carriage} Insurance: {summary.insurance}.</dd></div>
      </dl>
      {summary.contractDeviations.length > 0 && <div className="boundary-deviations"><strong>Preserved contractual wording</strong>{summary.contractDeviations.map((deviation, index) => <p key={`${deviation.description}-${index}`}>{deviation.description}{deviation.sourceRef ? <small>{deviation.sourceRef}</small> : null}</p>)}</div>}
    </article>
  );
}

export default function LogisticsCostingApp() {
  const [clientSurface, setClientSurface] = useState<ClientSurface>("welcome");
  const [clientStep, setClientStep] = useState(1);
  const [clientGoal, setClientGoal] = useState<ClientGoal>("");
  const [inputSupplyMode, setInputSupplyMode] = useState<InputSupplyMode>("");
  const [inputFieldEvidence, setInputFieldEvidence] = useState<Partial<Record<IntakeFieldKey, ExtractedInputEvidence>>>({});
  const [scenarioName, setScenarioName] = useState("");
  const [cargoDescription, setCargoDescription] = useState("");
  const [quantityDescription, setQuantityDescription] = useState("");
  const [transportModeAnswer, setTransportModeAnswer] = useState<TransportMode | "unknown" | "">("");
  const [specialCargoDeclaration, setSpecialCargoDeclaration] = useState<SpecialCargoDeclaration>("");
  const [sourceTermKnowledge, setSourceTermKnowledge] = useState<TermKnowledge>("");
  const [targetTermKnowledge, setTargetTermKnowledge] = useState<TermKnowledge>("");
  const [sourceTermSelected, setSourceTermSelected] = useState(false);
  const [targetTermSelected, setTargetTermSelected] = useState(false);
  const [currentResponsibilities, setCurrentResponsibilities] = useState<ResponsibilityAnswers>(emptyResponsibilityAnswers);
  const [desiredResponsibilities, setDesiredResponsibilities] = useState<ResponsibilityAnswers>(emptyResponsibilityAnswers);
  const [costInputStates, setCostInputStates] = useState<Record<string, CostInputState>>({});
  const [savedCases, setSavedCases] = useState<SavedCase[]>(readSavedCases);
  const [selectedCaseId, setSelectedCaseId] = useState<string | null>(null);
  const [approvedCaseId, setApprovedCaseId] = useState<string | null>(null);
  const [demoLoaded, setDemoLoaded] = useState(false);
  const [workspaceMode, setWorkspaceMode] = useState<WorkspaceMode>("conversion");
  const [sourceTotal, setSourceTotal] = useState(0);
  const [currency, setCurrency] = useState("");
  const [fxRate, setFxRate] = useState(1);
  const [fxAsOf, setFxAsOf] = useState("");
  const [fxSource, setFxSource] = useState("");
  const [sourceTerm, setSourceTerm] = useState<IncotermCode>(exwGuangzhouToCipTashkent.sourceTerm);
  const [targetTerm, setTargetTerm] = useState<IncotermCode>(exwGuangzhouToCipTashkent.targetTerm!);
  const [sourcePlace, setSourcePlace] = useState("");
  const [targetPlace, setTargetPlace] = useState("");
  const [transportMode, setTransportMode] = useState<TransportMode>("multimodal");
  const [preferredUnitId, setPreferredUnitId] = useState("multimodal-40hc");
  const [logisticsScope, setLogisticsScope] = useState<LogisticsScope | "">("");
  const [costScopeBasis, setCostScopeBasis] = useState<CostScopeBasis>("incoterm");
  const [costLines, setCostLines] = useState<CostLine[]>(makeEmptyCostLines);
  const [insuranceRatePercent, setInsuranceRatePercent] = useState(0);
  const [coveragePercent, setCoveragePercent] = useState(110);
  const [contractUnloadOverride, setContractUnloadOverride] = useState(false);
  const [customBoundaryEnabled, setCustomBoundaryEnabled] = useState(false);
  const [customDeliveryPoint, setCustomDeliveryPoint] = useState("");
  const [customRiskTransferPoint, setCustomRiskTransferPoint] = useState("");
  const [customCostBoundary, setCustomCostBoundary] = useState("");
  const [customBoundarySource, setCustomBoundarySource] = useState("");
  const [importJurisdiction, setImportJurisdiction] = useState("");
  const [importerOfRecord, setImporterOfRecord] = useState("");
  const [taxRegistrationBasis, setTaxRegistrationBasis] = useState("");
  const [packedVolumeM3, setPackedVolumeM3] = useState(0);
  const [grossWeightKg, setGrossWeightKg] = useState(0);
  const [documents, setDocuments] = useState<DocumentIntakeRecord[]>([]);
  const [documentProcessingStage, setDocumentProcessingStage] = useState<DocumentProcessingStage>("idle");
  const [documentProcessingMessage, setDocumentProcessingMessage] = useState("");
  const [showAllLines, setShowAllLines] = useState(false);
  const [newLineComponent, setNewLineComponent] = useState<CostComponentCode>("main_freight");
  const [newLineLabel, setNewLineLabel] = useState("");
  const [newLineAmount, setNewLineAmount] = useState(0);
  const [newLineCurrency, setNewLineCurrency] = useState("");
  const [newLineSource, setNewLineSource] = useState("");
  const [newLineRateDate, setNewLineRateDate] = useState("");
  const [newLineIncluded, setNewLineIncluded] = useState(false);

  const sourceLineCount = useMemo(() => documents.reduce((highest, document) => Math.max(highest, document.documentProfile?.lineItemCount ?? 0), 0) || undefined, [documents]);
  const documentEvidenceText = useMemo(() => documents.flatMap((document) => document.rows).map((row) => JSON.stringify(row)).join("\n"), [documents]);
  const productionEstimate = useMemo<ProductionLogisticsEstimate>(() => buildProductionLogisticsEstimate({
    sourceValue: sourceTotal,
    currency: currency || "USD",
    cargoDescription,
    quantityDescription,
    sourceLineCount,
    sourcePackedVolumeM3: packedVolumeM3 || undefined,
    sourceGrossWeightKg: grossWeightKg || undefined,
    origin: sourcePlace,
    destination: targetPlace,
    transportMode,
    preferredUnitId,
    pickupConfirmed: inputFieldEvidence.sourcePlace?.status === "client-adjusted",
    specialCargoConfirmed: specialCargoDeclaration === "standard-confirmed" || specialCargoDeclaration === "declared-special",
    evidenceText: documentEvidenceText,
  }), [sourceTotal, currency, cargoDescription, quantityDescription, sourceLineCount, packedVolumeM3, grossWeightKg, sourcePlace, targetPlace, transportMode, preferredUnitId, inputFieldEvidence.sourcePlace?.status, specialCargoDeclaration, documentEvidenceText]);

  const preparedCostLines = useMemo(() => {
    const benchmarkByComponent = new Map(productionEstimate.costLines.map((line) => [line.component, line]));
    return costLines.map((line) => {
      const state = costInputStates[line.component];
      if (line.amount > 0 || line.sourceRef || ["provided", "extracted", "needs-confirmation", "not-applicable"].includes(state)) return line;
      const estimate = benchmarkByComponent.get(line.component);
      return estimate ? { ...estimate, id: line.id, currency: currency || estimate.currency } : line;
    });
  }, [costLines, costInputStates, productionEstimate.costLines, currency]);

  const calculationInput = useMemo<CalculationInput>(() => {
    const contractOverrides: ContractOverride[] = [];
    if (workspaceMode !== "logistics" && costScopeBasis !== "incoterm") {
      const selectedComponents = new Set(costScopeBasis === "custom" ? costLines.filter((line) => line.targetIncluded).map((line) => line.component) : logisticsScopeComponents[costScopeBasis]);
      for (const component of costComponentCodes) {
        const standardIncluded = incotermProfiles[targetTerm].sellerPaidComponents.includes(component);
        const scopeIncluded = selectedComponents.has(component);
        if (standardIncluded !== scopeIncluded) contractOverrides.push({
          component,
          targetIncluded: scopeIncluded,
          description: `${logisticsScopes.find((scope) => scope.id === costScopeBasis)?.label ?? "Custom"} cost scope overrides the standard ${targetTerm} cost treatment for this component.`,
          sourceRef: "Client-selected alternative logistics scope",
        });
      }
    }
    if (contractUnloadOverride) contractOverrides.push({ component: "destination_unloading", targetIncluded: true, description: "Contract requires seller-paid unloading irrespective of standard target rule.", sourceRef: "User-entered contract override" });
    return {
      id: workspaceMode === "logistics" ? "workspace:logistics-only" : "workspace:incoterm-conversion",
      mode: workspaceMode === "logistics" ? "logistics-only" : "incoterm-conversion",
      sourceContractTotal: sourceTotal,
      currency,
      sourceTerm,
      sourceNamedPlace: sourcePlace,
      ...(workspaceMode === "logistics"
        ? costScopeBasis === "incoterm"
          ? { logisticsScopeIncoterm: sourceTerm }
          : { logisticsScope: logisticsScope || undefined }
        : { targetTerm, targetNamedPlace: targetPlace }),
      customScopeComponents: workspaceMode === "logistics" && costScopeBasis === "custom" ? costLines.filter((line) => line.targetIncluded).map((line) => line.component) : undefined,
      incotermsVersion: "2020",
      transportMode,
      costLines: preparedCostLines,
      exchangeRates: currency !== "USD" ? [{ from: "USD", to: currency, rate: fxRate, asOf: fxAsOf, source: fxSource || "Unspecified user input", confidence: "provisional" }] : [],
      contractOverrides,
      contractBoundaryOverrides: customBoundaryEnabled ? [{
        side: workspaceMode === "logistics" ? "start" : "target",
        description: "User-declared contract-specific delivery, risk or cost boundary.",
        sourceRef: customBoundarySource || undefined,
        deliveryPoint: customDeliveryPoint || undefined,
        riskTransferPoint: customRiskTransferPoint || undefined,
        costBoundary: customCostBoundary || undefined,
      }] : [],
      insurance: {
        enabled: true,
        premiumRate: insuranceRatePercent > 0 ? insuranceRatePercent / 100 : productionEstimate.insuranceRate,
        coverageFactor: coveragePercent > 0 ? coveragePercent / 100 : productionEstimate.insuranceCoverageFactor,
        basis: "final-contract-value",
        clauses: targetTerm === "CIF" ? "C" : "A",
        note: insuranceRatePercent > 0 ? "User-entered planning premium model; insurer quotation not attached." : `${productionEstimate.benchmark.id} · estimated insurance benchmark; insurer quotation not attached.`,
      },
      importJurisdiction: importJurisdiction || undefined,
      importerOfRecord: importerOfRecord || undefined,
      taxRegistrationBasis: taxRegistrationBasis || undefined,
      assumptions: [
        ...(demoLoaded ? ["The regression quotation total and counts are user-supplied facts; protected source files were not accessed or copied."] : []),
        ...(workspaceMode === "logistics" && costScopeBasis === "incoterm" ? [`The logistics-only scope follows the seller-paid component boundary of the current ${sourceTerm} Incoterm without changing the commercial term.`] : []),
        ...(workspaceMode !== "logistics" && costScopeBasis !== "incoterm" ? [`The client selected a ${logisticsScopes.find((scope) => scope.id === costScopeBasis)?.label ?? "custom"} cost scope that deviates from the standard ${targetTerm} cost boundary.`] : []),
        ...productionEstimate.assumptions,
        "Benchmark-derived values remain editable and never represent a live carrier or insurer quotation.",
      ],
    };
  }, [workspaceMode, sourceTotal, currency, fxRate, fxAsOf, fxSource, sourceTerm, sourcePlace, logisticsScope, costScopeBasis, targetTerm, targetPlace, transportMode, costLines, preparedCostLines, contractUnloadOverride, customBoundaryEnabled, customDeliveryPoint, customRiskTransferPoint, customCostBoundary, customBoundarySource, insuranceRatePercent, coveragePercent, importJurisdiction, importerOfRecord, taxRegistrationBasis, demoLoaded, productionEstimate]);

  const result = useMemo(() => calculateScenario(calculationInput), [calculationInput]);
  const compatibleTransportUnits = useMemo(() => transportUnits.filter((unit) => unit.mode === transportMode), [transportMode]);
  const selectedUnitId = compatibleTransportUnits.some((unit) => unit.id === preferredUnitId) ? preferredUnitId : compatibleTransportUnits[0]?.id;
  const transportPlan = useMemo(() => ({
    unit: productionEstimate.transport.unit,
    quantity: productionEstimate.transport.requiredTruckCount,
    volumeUtilizationPercent: productionEstimate.cargo.planningVolumeM3 / (productionEstimate.transport.unit.usableVolumeM3 * productionEstimate.transport.requiredTruckCount) * 100,
    weightUtilizationPercent: productionEstimate.cargo.grossWeightKg.value / (productionEstimate.transport.unit.payloadKg * productionEstimate.transport.requiredTruckCount) * 100,
    reason: `${productionEstimate.transport.limitingFactor} governs the transport requirement.`,
  }), [productionEstimate]);
  const contractLines = useMemo(() => [{ id: "contract-total", description: cargoDescription || "Subject contract total", quantity: 1, unit: quantityDescription || "contract", sourcePrice: sourceTotal, currency }], [cargoDescription, quantityDescription, sourceTotal, currency]);
  const allocatedLines = useMemo(() => allocateResultToContractLines(contractLines, result), [contractLines, result]);

  function updateCostLine(lineId: string, patch: Partial<CostLine>) {
    setCostLines((current) => current.map((line) => line.id === lineId ? { ...line, ...patch } : line));
  }

  function addCostLine() {
    const label = newLineLabel.trim() || componentLabels[newLineComponent];
    setCostLines((current) => [...current, {
      id: `user-${newLineComponent}-${crypto.randomUUID()}`,
      component: newLineComponent,
      label,
      amount: newLineAmount,
      currency: newLineCurrency.trim().toUpperCase() || currency,
      sourceRef: newLineSource.trim() || undefined,
      rateDate: newLineRateDate || undefined,
      ...(newLineIncluded ? { targetIncluded: true } : {}),
      evidenceKind: "user-input",
      confidence: "medium",
      note: "User-added service line; source and rate date should be attached in the exported review package.",
    }]);
    setNewLineLabel("");
    setNewLineAmount(0);
    setNewLineSource("");
    setNewLineRateDate("");
    setNewLineIncluded(false);
  }

  function resetRegression() {
    setDemoLoaded(true);
    setClientGoal("conversion");
    setInputSupplyMode("documents");
    setInputFieldEvidence({});
    setScenarioName("EXW Guangzhou → CIP Tashkent · approved production fixture");
    setCargoDescription("Medical, veterinary and laboratory equipment — multi-item quotation");
    setQuantityDescription("167 quotation lines");
    setTransportModeAnswer("road");
    setSpecialCargoDeclaration("possible-special");
    setSourceTermKnowledge("known");
    setTargetTermKnowledge("known");
    setSourceTermSelected(true);
    setTargetTermSelected(true);
    setCostInputStates({});
    setCurrentResponsibilities(emptyResponsibilityAnswers());
    setDesiredResponsibilities(emptyResponsibilityAnswers());
    setApprovedCaseId(null);
    setWorkspaceMode("conversion");
    setSourceTotal(1_586_386);
    setCurrency("USD");
    setFxRate(1);
    setFxAsOf("2026-08-27");
    setFxSource("User-entered planning rate");
    setSourceTerm("EXW");
    setTargetTerm("CIP");
    setCostScopeBasis("incoterm");
    setSourcePlace("Supplier premises, Guangzhou, China");
    setTargetPlace("Tashkent, Uzbekistan");
    setTransportMode("road");
    setPreferredUnitId("road-enclosed-136");
    setCostLines(makeEmptyCostLines());
    setInsuranceRatePercent(0);
    setCoveragePercent(110);
    setPackedVolumeM3(0);
    setGrossWeightKg(0);
    setContractUnloadOverride(false);
    setCustomBoundaryEnabled(false);
    setCustomDeliveryPoint("");
    setCustomRiskTransferPoint("");
    setCustomCostBoundary("");
    setCustomBoundarySource("");
    setImportJurisdiction("");
    setImporterOfRecord("");
    setTaxRegistrationBasis("");
    setNewLineComponent("main_freight");
    setNewLineLabel("");
    setNewLineAmount(0);
    setNewLineCurrency("USD");
    setNewLineSource("");
    setNewLineRateDate("");
    setNewLineIncluded(false);
    setShowAllLines(false);
  }

  function resetClientDraft() {
    setDemoLoaded(false);
    setClientGoal("");
    setInputSupplyMode("");
    setInputFieldEvidence({});
    setScenarioName("");
    setCargoDescription("");
    setQuantityDescription("");
    setTransportModeAnswer("");
    setSpecialCargoDeclaration("");
    setSourceTermKnowledge("");
    setTargetTermKnowledge("");
    setSourceTermSelected(false);
    setTargetTermSelected(false);
    setCurrentResponsibilities(emptyResponsibilityAnswers());
    setDesiredResponsibilities(emptyResponsibilityAnswers());
    setCostInputStates({});
    setApprovedCaseId(null);
    setSelectedCaseId(null);
    setWorkspaceMode("conversion");
    setSourceTotal(0);
    setCurrency("");
    setFxRate(1);
    setFxAsOf("");
    setFxSource("");
    setSourceTerm("EXW");
    setTargetTerm("CIP");
    setSourcePlace("");
    setTargetPlace("");
    setTransportMode("multimodal");
    setPreferredUnitId("multimodal-40hc");
    setLogisticsScope("");
    setCostScopeBasis("incoterm");
    setCostLines(makeEmptyCostLines());
    setInsuranceRatePercent(0);
    setCoveragePercent(110);
    setContractUnloadOverride(false);
    setCustomBoundaryEnabled(false);
    setCustomDeliveryPoint("");
    setCustomRiskTransferPoint("");
    setCustomCostBoundary("");
    setCustomBoundarySource("");
    setImportJurisdiction("");
    setImporterOfRecord("");
    setTaxRegistrationBasis("");
    setPackedVolumeM3(0);
    setGrossWeightKg(0);
    setDocuments([]);
    setDocumentProcessingStage("idle");
    setDocumentProcessingMessage("");
    setNewLineComponent("main_freight");
    setNewLineLabel("");
    setNewLineAmount(0);
    setNewLineCurrency("");
    setNewLineSource("");
    setNewLineRateDate("");
    setNewLineIncluded(false);
    setShowAllLines(false);
  }

  async function handleDocuments(event: ChangeEvent<HTMLInputElement>) {
    const files = [...(event.target.files ?? [])];
    if (!files.length) return;
    const records: DocumentIntakeRecord[] = [];
    const showStage = async (stage: DocumentProcessingStage, message: string) => {
      setDocumentProcessingStage(stage);
      setDocumentProcessingMessage(message);
      await new Promise<void>((resolve) => window.requestAnimationFrame(() => resolve()));
    };
    await showStage("uploading", `Receiving ${files.length} file${files.length === 1 ? "" : "s"}…`);
    for (const [index, file] of files.entries()) {
      await showStage("reading", `Reading ${file.name} (${index + 1} of ${files.length})…`);
      try {
        await showStage("extracting", `Classifying document, line-item and shipment evidence in ${file.name}…`);
        records.push(await readClientDocument(file));
      } catch (error) {
        records.push({
          id: `document:${file.name}:${file.size}`,
          fileName: file.name,
          format: "unknown",
          status: "rejected",
          rows: [],
          facts: [],
          ignoredInstructions: [],
          extractionMethod: "manual-review",
          warnings: [{ code: "DOCUMENT_READ_FAILED", severity: "blocking", message: `${file.name} could not be read: ${error instanceof Error ? error.message : "Unknown file-processing error"}. Try a text-searchable PDF, a valid workbook, or manual entry.` }],
        });
      }
    }
    setDocuments((current) => [...current, ...records]);
    setInputSupplyMode("documents");
    await showStage("mapping", "Mapping extracted values to transaction, Incoterm and logistics-cost fields…");
    const extracted = extractDocumentInputs(records);
    const evidencePatch: Partial<Record<IntakeFieldKey, ExtractedInputEvidence>> = {};
    const registerEvidence = (field: IntakeFieldKey, value: ExtractedValue) => {
      evidencePatch[field] = { status: value.confidence === "high" ? "extracted-confidently" : "needs-confirmation", sourceRef: value.sourceRef, originalValue: value.originalValue, basis: value.basis, scope: value.scope };
    };
    if (!cargoDescription.trim() && extracted.fields.cargoDescription) { setCargoDescription(String(extracted.fields.cargoDescription.originalValue)); registerEvidence("cargoDescription", extracted.fields.cargoDescription); }
    if (!quantityDescription.trim() && extracted.fields.quantityDescription) { setQuantityDescription(String(extracted.fields.quantityDescription.originalValue)); registerEvidence("quantityDescription", extracted.fields.quantityDescription); }
    if (!(sourceTotal > 0) && extracted.fields.sourceTotal) { setSourceTotal(Number(extracted.fields.sourceTotal.originalValue)); registerEvidence("sourceTotal", extracted.fields.sourceTotal); }
    if (!currency.trim() && extracted.fields.currency) {
      const nextCurrency = String(extracted.fields.currency.originalValue).toUpperCase();
      setCurrency(nextCurrency);
      setNewLineCurrency(nextCurrency);
      registerEvidence("currency", extracted.fields.currency);
    }
    if (!sourcePlace.trim() && extracted.fields.sourcePlace) { setSourcePlace(String(extracted.fields.sourcePlace.originalValue)); registerEvidence("sourcePlace", extracted.fields.sourcePlace); }
    if (!targetPlace.trim() && extracted.fields.targetPlace) { setTargetPlace(String(extracted.fields.targetPlace.originalValue)); registerEvidence("targetPlace", extracted.fields.targetPlace); }
    if ((!transportModeAnswer || transportModeAnswer === "unknown") && extracted.fields.transportMode) {
      const nextMode = String(extracted.fields.transportMode.originalValue) as TransportMode;
      setTransportModeAnswer(nextMode);
      setTransportMode(nextMode);
      setPreferredUnitId(nextMode === "road" ? "road-enclosed-136" : transportUnits.find((unit) => unit.mode === nextMode)?.id ?? "multimodal-40hc");
      registerEvidence("transportMode", extracted.fields.transportMode);
    }
    if (!(packedVolumeM3 > 0) && extracted.fields.packedVolumeM3) { setPackedVolumeM3(Number(extracted.fields.packedVolumeM3.originalValue)); registerEvidence("packedVolumeM3", extracted.fields.packedVolumeM3); }
    if (!(grossWeightKg > 0) && extracted.fields.grossWeightKg) { setGrossWeightKg(Number(extracted.fields.grossWeightKg.originalValue)); registerEvidence("grossWeightKg", extracted.fields.grossWeightKg); }
    if (!sourceTermSelected && extracted.fields.sourceTerm) {
      setSourceTerm(String(extracted.fields.sourceTerm.originalValue) as IncotermCode);
      setSourceTermKnowledge("known");
      setSourceTermSelected(true);
      registerEvidence("sourceTerm", extracted.fields.sourceTerm);
    }
    if (!targetTermSelected && extracted.fields.targetTerm) {
      setTargetTerm(String(extracted.fields.targetTerm.originalValue) as IncotermCode);
      setTargetTermKnowledge("known");
      setTargetTermSelected(true);
      setCostScopeBasis("incoterm");
      registerEvidence("targetTerm", extracted.fields.targetTerm);
    }
    setInputFieldEvidence((current) => ({ ...current, ...evidencePatch }));

    const appliedCosts = (Object.entries(extracted.costs) as Array<[CostComponentCode, NonNullable<DocumentExtraction["costs"][CostComponentCode]>]>).filter(([component]) => {
      const currentLine = costLines.find((line) => line.component === component);
      return currentLine && currentLine.amount === 0 && !currentLine.sourceRef;
    });
    if (appliedCosts.length) {
      const costUpdates = new Map(appliedCosts);
      setCostLines((current) => current.map((line) => {
        const update = costUpdates.get(line.component);
        if (!update || line.amount !== 0 || line.sourceRef) return line;
        return { ...line, amount: Number(update.originalValue), currency: update.currency || currency || "USD", sourceRef: update.sourceRef, evidenceKind: "sourced-fact", confidence: update.confidence, note: `Original extracted value: ${update.originalValue}. ${update.basis ?? "Client review remains required."}` };
      }));
      setCostInputStates((current) => ({ ...current, ...Object.fromEntries(appliedCosts.map(([component, value]) => [component, value.confidence === "high" ? "extracted" : "needs-confirmation"])) }));
    }
    const mappedFieldCount = Object.keys(evidencePatch).length;
    const failedCount = records.filter((record) => record.status === "rejected").length;
    const manualReviewCount = records.filter((record) => record.status === "staged-for-review").length;
    if (failedCount === records.length) await showStage("failed", "No uploaded file could be processed. Review the file-specific recovery guidance below.");
    else await showStage("complete", `${mappedFieldCount} transaction field${mappedFieldCount === 1 ? "" : "s"} and ${appliedCosts.length} cost value${appliedCosts.length === 1 ? "" : "s"} mapped. ${manualReviewCount ? `${manualReviewCount} file${manualReviewCount === 1 ? "" : "s"} need manual recovery.` : "Ready for client review."}`);
    event.target.value = "";
  }

  function markInputFieldAdjusted(field: IntakeFieldKey) {
    setInputFieldEvidence((current) => ({ ...current, [field]: current[field] ? { ...current[field]!, status: "client-adjusted" } : { status: "client-adjusted", sourceRef: "Client entry", originalValue: "Not extracted" } }));
  }

  function exportAudit() {
    downloadText("contract-logistics-audit.json", JSON.stringify({
      schema: "tenderapps.landed-cost.audit.v0.1",
      processDefinition: logisticsCostingProcessDefinition,
      input: calculationInput,
      result,
      packing: { packedVolumeM3, grossWeightKg, transportPlan, coldChainParcel: "provisional separate parcel" },
      productionEstimate,
      specialCargoDeclaration,
      sourceDocuments: documents,
      inputSupplyMode,
      inputFieldEvidence,
      lineAllocation: allocatedLines,
    }, null, 2), "application/json");
  }

  function exportLines() {
    const headers = ["Contract line", "Source price", "Included logistics", "Additional logistics", "Removed costs", "Insurance", "Duties/taxes", "Resulting price", "Currency", "Allocation method", "Assumptions"];
    const rows = allocatedLines.map((line) => [line.description, line.sourcePrice, line.includedLogistics, line.additionalLogistics, line.removedCosts, line.insurance, line.dutiesTaxes, line.resultingPrice, line.currency, line.allocationMethod, line.assumptions.join("; ")]);
    downloadText("contract-logistics-line-allocation.csv", [headers, ...rows].map((row) => row.map(csvCell).join(",")).join("\r\n"), "text/csv;charset=utf-8");
  }

  const visibleAllocatedLines = showAllLines ? allocatedLines : allocatedLines.slice(0, 8);
  const isRegressionMatch = demoLoaded && result.sourceTerm === "EXW" && result.targetTerm === "CIP" && result.sourceContractTotal === 1_586_386 && result.nonInsuranceAdded === 22_550 && result.insurance === 6_218.34;
  const inferredSourceTerm = inferClosestTerm(currentResponsibilities);
  const inferredTargetTerm = inferClosestTerm(desiredResponsibilities);
  const displayedTargetTerm = targetTermSelected ? targetTerm : inferredTargetTerm;
  const selectedSavedCase = savedCases.find((savedCase) => savedCase.id === selectedCaseId);

  const requiredCostComponents = useMemo<CostComponentCode[]>(() => {
    if (workspaceMode === "logistics") {
      if (costScopeBasis === "incoterm") return [...incotermProfiles[sourceTerm].sellerPaidComponents];
      if (!logisticsScope) return [];
      if (logisticsScope === "custom") return [...costComponentCodes];
      return [...logisticsScopeComponents[logisticsScope]];
    }
    const sourceComponents = new Set(incotermProfiles[sourceTerm].sellerPaidComponents);
    const targetComponents = new Set(costScopeBasis === "incoterm" ? incotermProfiles[targetTerm].sellerPaidComponents : costScopeBasis === "custom" ? costLines.filter((line) => line.targetIncluded).map((line) => line.component) : logisticsScopeComponents[costScopeBasis]);
    const changed = costComponentCodes.filter((component) => sourceComponents.has(component) !== targetComponents.has(component));
    if (!changed.includes("export_packing") && productionEstimate.costLines.some((line) => line.component === "export_packing" && line.amount > 0)) changed.unshift("export_packing");
    if (!changed.includes("contingency") && productionEstimate.costLines.some((line) => line.component === "contingency" && line.amount > 0)) changed.push("contingency");
    return changed;
  }, [workspaceMode, logisticsScope, sourceTerm, targetTerm, costScopeBasis, costLines, productionEstimate.costLines]);

  function costStateFor(component: CostComponentCode): CostInputState {
    const explicitState = costInputStates[component];
    if (explicitState && explicitState !== "unknown") return explicitState;
    if (component === "insurance" && requiredCostComponents.includes("insurance") && productionEstimate.estimatedInsurance > 0) return "estimated";
    const line = preparedCostLines.find((candidate) => candidate.component === component);
    if (line?.evidenceKind === "assumption" && line.sourceRef) return line.amount > 0 ? "estimated" : "not-applicable";
    if (line && line.amount > 0) return line.evidenceKind === "sourced-fact" ? "extracted" : "provided";
    return "unknown";
  }

  const unknownRequiredCosts = requiredCostComponents.filter((component) => costStateFor(component) === "unknown");
  const preparedRequiredCosts = requiredCostComponents.filter((component) => ["provided", "extracted", "estimated", "needs-confirmation"].includes(costStateFor(component)));
  const excludedRequiredCosts = requiredCostComponents.filter((component) => costStateFor(component) === "not-applicable");
  const blockingMissing = [
    !clientGoal && "calculation goal",
    !cargoDescription.trim() && "product or cargo",
    !(sourceTotal > 0) && "contract or goods value",
    !currency.trim() && "currency",
    !sourcePlace.trim() && "origin / supplier",
    !targetPlace.trim() && "destination",
    targetPlace.trim() && !isSpecificNamedDestination(targetPlace) && "exact named destination (city, terminal, airport or delivery site)",
    (!transportModeAnswer || transportModeAnswer === "unknown") && "transport mode",
    !sourceTermSelected && "current delivery arrangement",
    workspaceMode !== "logistics" && !targetTermSelected && "desired delivery arrangement",
    workspaceMode === "logistics" && costScopeBasis !== "incoterm" && !logisticsScope && "standalone logistics scope",
    workspaceMode !== "logistics" && targetTerm === "DDP" && !importJurisdiction.trim() && "DDP import jurisdiction",
    workspaceMode !== "logistics" && targetTerm === "DDP" && !importerOfRecord.trim() && "DDP seller-side importer of record",
  ].filter((item): item is string => Boolean(item));

  function persistSavedCases(next: SavedCase[]) {
    setSavedCases(next);
    localStorage.setItem(SAVED_CASES_KEY, JSON.stringify(next));
  }

  function startNewCalculation() {
    resetClientDraft();
    setClientStep(1);
    setClientSurface("intake");
  }

  function openDemoScenario() {
    resetRegression();
    setClientSurface("result");
  }

  function chooseGoal(goal: Exclude<ClientGoal, "">) {
    setClientGoal(goal);
    if (goal === "logistics") {
      setWorkspaceMode("logistics");
      setLogisticsScope("");
      setCostScopeBasis("incoterm");
    } else if (goal === "landed") {
      setWorkspaceMode("logistics");
      setLogisticsScope("landed-cost-including-duty-tax");
      setCostScopeBasis("landed-cost-including-duty-tax");
    } else {
      setWorkspaceMode("conversion");
      setCostScopeBasis("incoterm");
    }
  }

  function canContinueFromStep(step: number) {
    if (step === 1) return Boolean(clientGoal);
    if (step === 2) return Boolean(cargoDescription.trim() && sourceTotal > 0 && currency.trim() && sourcePlace.trim() && isSpecificNamedDestination(targetPlace) && transportModeAnswer && transportModeAnswer !== "unknown");
    if (step === 3) return sourceTermKnowledge === "known" ? sourceTermSelected : sourceTermKnowledge === "help" && Boolean(inferredSourceTerm);
    if (step === 4) return workspaceMode === "logistics" ? costScopeBasis === "incoterm" && sourceTermSelected || Boolean(logisticsScope) : (targetTermKnowledge === "known" ? targetTermSelected : targetTermKnowledge === "help" && Boolean(inferredTargetTerm));
    return true;
  }

  function continueIntake() {
    if (!canContinueFromStep(clientStep)) return;
    if (clientStep === 3 && sourceTermKnowledge === "help" && inferredSourceTerm) {
      setSourceTerm(inferredSourceTerm);
      setSourceTermSelected(true);
    }
    if (clientStep === 4 && workspaceMode !== "logistics" && targetTermKnowledge === "help" && inferredTargetTerm) {
      setTargetTerm(inferredTargetTerm);
      setTargetTermSelected(true);
      setCostScopeBasis("incoterm");
    }
    setClientStep((current) => Math.min(6, current + 1));
  }

  function setResponsibility(side: "current" | "desired", key: keyof ResponsibilityAnswers, answer: ResponsibilityAnswer) {
    if (side === "current") setCurrentResponsibilities((current) => ({ ...current, [key]: answer }));
    else setDesiredResponsibilities((current) => ({ ...current, [key]: answer }));
  }

  function setGuidedCostState(component: CostComponentCode, state: CostInputState) {
    setCostInputStates((current) => ({ ...current, [component]: state }));
    if (state === "not-applicable") {
      const line = costLines.find((candidate) => candidate.component === component);
      if (line) updateCostLine(line.id, { amount: 0, evidenceKind: "user-input", confidence: "medium" });
    }
  }

  function updateGuidedCostAmount(line: CostLine, amount: number) {
    const previousState = costStateFor(line.component);
    updateCostLine(line.id, {
      amount,
      currency: currency || "USD",
      evidenceKind: "user-input",
      confidence: "medium",
      note: previousState === "extracted" || previousState === "needs-confirmation" ? `${line.note ?? ""} Client-adjusted value: ${amount}.`.trim() : line.note,
    });
    setCostInputStates((current) => ({ ...current, [line.component]: "provided" }));
  }

  function InputEvidence({ field }: { field: IntakeFieldKey }) {
    const evidence = inputFieldEvidence[field];
    if (!evidence) return inputSupplyMode === "documents" && (documentProcessingStage === "complete" || documentProcessingStage === "failed") ? <small className="input-evidence not-found">— Not found · please provide</small> : null;
    const label = evidence.status === "extracted-confidently" ? "✓ Extracted confidently" : evidence.status === "needs-confirmation" ? "? Inferred · please confirm" : "✓ Client adjusted";
    return <small className={`input-evidence ${evidence.status}`} title={`Original extracted value: ${evidence.originalValue}`}><span>{label} · {evidence.sourceRef}</span>{evidence.basis && <em>{evidence.basis}</em>}</small>;
  }

  function DocumentIntakePanel({ compact = false }: { compact?: boolean }) {
    const stageOrder: DocumentProcessingStage[] = ["uploading", "reading", "extracting", "mapping", "complete"];
    const activeStageIndex = stageOrder.indexOf(documentProcessingStage);
    const isProcessing = ["uploading", "reading", "extracting", "mapping"].includes(documentProcessingStage);
    return <div className={`guided-document-intake document-first ${compact ? "compact" : ""}`}>
      <span>UPLOAD INPUTS · EXTRACT · REVIEW</span>
      {!compact && <div className="format-support-grid" aria-label="Automatic document support">
        <article><b>JSON / CSV / TSV</b><strong>Fully parsed automatically</strong><p>Structured fields and cost rows are mapped locally.</p></article>
        <article><b>XLSX / XLS</b><strong>Partially parsed automatically</strong><p>Worksheet cells, labelled values and cost tables are read locally.</p></article>
        <article><b>Text-searchable PDF</b><strong>Semantically parsed automatically</strong><p>Document totals, parties, terms and item tables are separated from product specifications with page provenance.</p></article>
        <article><b>Image-only PDF</b><strong>Accepted for manual recovery</strong><p>OCR is not yet available; upload a searchable PDF or complete missing fields manually.</p></article>
      </div>}
      <label className={`file-drop ${isProcessing ? "processing" : ""}`}><input accept=".pdf,.xlsx,.xls,.csv,.tsv,.json" disabled={isProcessing} multiple onChange={handleDocuments} type="file" /><strong>{isProcessing ? "Document processing in progress…" : "Choose quotation, contract, PO, invoice, packing list or freight quote"}</strong><small>{compact ? "Found values fill empty fields without overwriting your manual entries." : "Files are read locally in this browser. Extracted values remain editable and document instructions are never executed."}</small></label>
      {documentProcessingStage !== "idle" && <section className={`document-processing-progress stage-${documentProcessingStage}`} aria-live="polite" aria-busy={isProcessing}>
        <header><span>{documentProcessingStage === "failed" ? "PROCESSING FAILED" : documentProcessingStage === "complete" ? "READY FOR REVIEW" : "PROCESSING DOCUMENT"}</span><strong>{documentProcessingMessage}</strong></header>
        <ol>{stageOrder.map((stage, index) => <li className={documentProcessingStage === "failed" ? index < Math.max(activeStageIndex, 1) ? "complete" : "pending" : index < activeStageIndex ? "complete" : index === activeStageIndex ? "current" : "pending"} key={stage}><span>{index < activeStageIndex || documentProcessingStage === "complete" ? "✓" : index + 1}</span>{stage === "uploading" ? "Uploading" : stage === "reading" ? "Reading document" : stage === "extracting" ? "Extracting data" : stage === "mapping" ? "Mapping fields" : "Ready for review"}</li>)}</ol>
      </section>}
      {documents.length > 0 && <div className="document-preparation-summary"><strong>{documents.length} file(s) received</strong><span>{Object.values(inputFieldEvidence).filter((evidence) => evidence.status !== "client-adjusted").length} transaction field(s) pre-filled · {Object.values(costInputStates).filter((state) => state === "extracted" || state === "needs-confirmation").length} cost value(s) pre-filled</span><span>{documents.filter((document) => document.status === "parsed").length} processed · {documents.filter((document) => document.status === "staged-for-review").length} need a different source/manual recovery · {documents.filter((document) => document.status === "rejected").length} failed</span></div>}
      {documents.length > 0 && <div className="document-result-list" aria-label="Document extraction results">{documents.map((document) => <article className={`document-result status-${document.status}`} key={document.id}>
        <header><div><span>{document.status === "parsed" ? document.facts.length ? "✓ PROCESSED" : "△ READ · NO MAPPED VALUES" : document.status === "staged-for-review" ? "△ MANUAL RECOVERY NEEDED" : "× FAILED"}</span><strong>{document.fileName}</strong></div><em>{document.extractionMethod?.replaceAll("-", " ") ?? document.format}</em></header>
        {document.documentProfile && <div className="document-semantic-profile"><span>{document.documentProfile.documentType.replaceAll("-", " ")}</span>{document.documentProfile.pageCount && <span>{document.documentProfile.pageCount} pages</span>}{document.documentProfile.lineItemCount && <span>{document.documentProfile.lineItemCount} priced rows</span>}{document.documentProfile.commercialTotalReconciled && <span>✓ total reconciled</span>}{!document.documentProfile.shipmentMetricsFound && <span>shipment weight / cube not found</span>}</div>}
        <p>{document.status === "parsed" && document.facts.length ? `${document.facts.length} document-level, shipment-level or derived business fact${document.facts.length === 1 ? "" : "s"} passed to the shared case-data mapper.` : document.warnings[0]?.message ?? "No extractable values were found."}</p>
        {document.warnings.length > 0 && <ul>{document.warnings.map((warning) => <li key={`${warning.code}-${warning.message}`}><b>{warning.code.replaceAll("_", " ")}</b> · {warning.message}</li>)}</ul>}
        {document.facts.length > 0 && <details><summary>Show extracted document facts</summary><ul>{document.facts.slice(0, 12).map((fact) => <li key={fact}>{fact}</li>)}</ul>{document.facts.length > 12 && <p>+ {document.facts.length - 12} additional fact(s) retained in the case evidence.</p>}</details>}
      </article>)}</div>}
    </div>;
  }

  function GuidedCostRow({ component }: { component: CostComponentCode }) {
    const line = preparedCostLines.find((candidate) => candidate.component === component);
    if (!line) return null;
    const state = costStateFor(component);
    const displayedAmount = component === "insurance" && state === "estimated" ? result.insurance : line.amount;
    const sourceIncluded = incotermProfiles[sourceTerm].sellerPaidComponents.includes(component);
    const selectedTargetComponents = workspaceMode === "logistics"
      ? new Set(costScopeBasis === "incoterm" ? incotermProfiles[sourceTerm].sellerPaidComponents : !logisticsScope ? [] : logisticsScope === "custom" ? costLines.filter((candidate) => candidate.targetIncluded).map((candidate) => candidate.component) : logisticsScopeComponents[logisticsScope])
      : new Set(costScopeBasis === "incoterm" ? incotermProfiles[targetTerm].sellerPaidComponents : costScopeBasis === "custom" ? costLines.filter((candidate) => candidate.targetIncluded).map((candidate) => candidate.component) : logisticsScopeComponents[costScopeBasis]);
    const targetIncluded = selectedTargetComponents.has(component);
    const stateLabel = state === "provided" ? "✓ Found / provided" : state === "extracted" ? "✓ Extracted from document" : state === "estimated" ? "≈ Benchmark estimate" : state === "needs-confirmation" ? "△ Needs confirmation" : state === "not-applicable" ? "○ Not applicable" : "? Missing";
    return <article className={`cost-preparation-row state-${state}`}>
      <div className="cost-component-context"><span>{sourceIncluded && !targetIncluded ? "REMOVED FROM PRICE" : "REQUIRED FOR TARGET"}</span><strong>{componentLabels[component]}</strong><p>{sourceIncluded && !targetIncluded ? `The amount already included under ${sourceTerm} is needed so it can be removed without double counting.` : `${componentLabels[component]} is required by the selected ${workspaceMode === "logistics" ? costScopeBasis === "incoterm" ? `${sourceTerm} Incoterm scope` : logisticsScopes.find((scope) => scope.id === logisticsScope)?.label : costScopeBasis === "incoterm" ? `${targetTerm} responsibility boundary` : "alternative logistics scope"}.`}</p>{line.sourceRef && <small>Source: {line.sourceRef}</small>}</div>
      <div className={`cost-state-badge ${state}`}>{stateLabel}</div>
      <label><span>Review status</span><select value={state} onChange={(event) => setGuidedCostState(component, event.target.value as CostInputState)}><option value="unknown">Missing / unknown</option><option value="provided">Provided / confirmed</option>{state === "extracted" && <option value="extracted">Extracted from document</option>}{state === "estimated" && <option value="estimated">Benchmark estimate</option>}<option value="needs-confirmation">Needs confirmation</option><option value="not-applicable">Not applicable</option></select></label>
      <label><span>Amount · {currency || "currency"}</span><input disabled={state === "unknown" || state === "not-applicable"} min="0" step="0.01" type="number" value={state !== "unknown" && state !== "not-applicable" ? roundMoney(displayedAmount) || "" : ""} placeholder={state === "unknown" ? "Provide or leave open" : state === "not-applicable" ? "Excluded" : "0.00"} onChange={(event) => updateGuidedCostAmount(line, Number(event.target.value))} /></label>
      <label className="cost-source"><span>Source / note <i>Optional</i></span><input disabled={state === "unknown" || state === "not-applicable"} placeholder="Quotation, document page, clause or allowance" value={line.sourceRef ?? ""} onChange={(event) => updateCostLine(line.id, { sourceRef: event.target.value || undefined })} /></label>
    </article>;
  }

  function calculateClientScenario() {
    if (blockingMissing.length > 0) return;
    setApprovedCaseId(null);
    setClientSurface("result");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function approveResult() {
    if (approvedCaseId || result.status === "blocked") return;
    const id = crypto.randomUUID();
    const savedCase: SavedCase = {
      id,
      name: scenarioName.trim() || `${cargoDescription} · ${sourceTerm}${workspaceMode === "logistics" ? " logistics" : ` → ${targetTerm}`}`,
      approvedAt: new Date().toISOString(),
      status: "approved",
      cargo: cargoDescription,
      quantity: quantityDescription,
      origin: sourcePlace,
      destination: targetPlace,
      packedVolumeM3: productionEstimate.cargo.packedVolumeM3.value,
      grossWeightKg: productionEstimate.cargo.grossWeightKg.value,
      specialCargoDeclaration,
      input: calculationInput,
      result,
    };
    persistSavedCases([savedCase, ...savedCases]);
    setApprovedCaseId(id);
  }

  const clientWorkspaceNav = (
    <nav className="client-workspace-nav" aria-label="Landed Cost Studio pages">
      <button aria-current={clientSurface === "welcome" ? "page" : undefined} onClick={() => setClientSurface("welcome")} type="button">Overview</button>
      <button aria-current={clientSurface === "intake" || clientSurface === "result" ? "page" : undefined} onClick={startNewCalculation} type="button">New calculation</button>
      <button aria-current={clientSurface === "cases" ? "page" : undefined} onClick={() => { setSelectedCaseId(null); setClientSurface("cases"); }} type="button">Saved cases <span>{savedCases.length}</span></button>
      <button aria-current={clientSurface === "audit" ? "page" : undefined} onClick={() => setClientSurface("audit")} type="button">Calculation details / audit</button>
    </nav>
  );

  function ResponsibilityQuestionnaire({ side, answers, inferred }: { side: "current" | "desired"; answers: ResponsibilityAnswers; inferred?: IncotermCode }) {
    return (
      <div className="responsibility-questionnaire">
        {responsibilityQuestions.map((question) => (
          <fieldset key={question.key}>
            <legend>{question.label}</legend>
            <p>{question.hint}</p>
            <div role="group" aria-label={question.label}>
              {(["seller", "buyer", "unknown"] as const).map((answer) => (
                <button aria-pressed={answers[question.key] === answer} key={answer} onClick={() => setResponsibility(side, question.key, answer)} type="button">
                  {answer === "seller" ? "Supplier / seller" : answer === "buyer" ? "Client / buyer" : "Not sure"}
                </button>
              ))}
            </div>
          </fieldset>
        ))}
        <div className={`term-suggestion ${inferred ? "has-suggestion" : ""}`} aria-live="polite">
          <span>CLOSEST STANDARD RULE</span>
          {inferred ? <><strong>{inferred} · {incotermProfiles[inferred].name}</strong><p>This is a guided suggestion from your responsibility answers, not a contractual determination. Confirm the named place and contract wording.</p></> : <p>Answer the responsibility questions to receive a closest-rule suggestion.</p>}
        </div>
      </div>
    );
  }

  if (clientSurface === "welcome") {
    return (
      <main className="costing-page client-first-page">
        {clientWorkspaceNav}
        <section className="cost-product-manifesto">
          <header className="cost-product-heading">
            <p className="costing-eyebrow"><span /> LANDED COST STUDIO · REVIEWED COST EVIDENCE</p>
            <h1>Raw commercial inputs become a{" "}<br /><em>decision-ready delivery cost.</em></h1>
            <p>See how commercial source evidence becomes one defensible logistics estimate with transport capacity, cost logic, confidence and traceable assumptions.</p>
          </header>

          <div className="cost-product-story" aria-label="Commercial inputs transformed into a reviewed delivery cost estimate">
            <article className="raw-cost-inputs">
              <header><span>01</span><div><b>WHAT YOU PROVIDE</b><small>Raw commercial + shipment information</small></div></header>
              <div className="cost-document-stack" aria-label="Quotation, packing list and freight quote">
                <div className="cost-document document-back"><span>FREIGHT QUOTE</span><b>Rail rate</b><i>Origin · destination</i></div>
                <div className="cost-document document-middle"><span>PACKING LIST</span><b>Packages</b><i>Volume · gross weight</i></div>
                <div className="cost-document document-front"><span>QUOTATION / PO</span><b>Commercial offer</b><i>Goods · price · Incoterm</i></div>
              </div>
              <dl className="raw-input-facts">
                <div><dt>PRODUCT</dt><dd>Laboratory equipment</dd></div>
                <div><dt>ROUTE</dt><dd>Guangzhou → Tashkent</dd></div>
                <div><dt>TERMS</dt><dd>EXW → desired CIP</dd></div>
                <div><dt>COSTS</dt><dd>Known rates + open gaps</dd></div>
              </dl>
              <footer><span>PDF</span><span>XLSX</span><span>CSV / JSON</span><span>Manual input</span></footer>
            </article>

            <div className="cost-transformation-bridge" aria-label="Landed Cost Studio transformation">
              <span className="story-arrow" aria-hidden="true">→</span>
              <div className="cost-agent-medallion"><small>TENDER APPS</small><strong>Landed Cost</strong><b>Studio</b></div>
              <ol>
                <li>READ</li><li>STRUCTURE</li><li>ESTIMATE CARGO</li><li>SIZE TRANSPORT</li><li>PRICE LOGISTICS</li><li>EXPLAIN</li>
              </ol>
              <span className="story-arrow" aria-hidden="true">→</span>
            </div>

            <article className="finished-cost-preview">
              <header>
                <div><span>03 · WHAT YOU RECEIVE</span><small>ILLUSTRATIVE DEMO · NOT CLIENT DATA</small></div>
                <b>FINISHED PRODUCT</b>
              </header>
              <div className="preview-title-row"><div><h2>Estimated Logistics Cost</h2><p>Source term → target named destination · selected transport mode</p></div><span>METHOD PREVIEW</span></div>
              <div className="preview-cost-metrics">
                <div><span>ESTIMATED CARGO</span><strong>Packed cube + gross weight</strong></div>
                <div><span>TRANSPORT REQUIRED</span><strong>Calculated units</strong></div>
                <div><span>FREIGHT BENCHMARK</span><strong>Route + mode + vintage</strong></div>
                <div><span>INSURANCE</span><strong>Estimated separately</strong></div>
                <div><span>CONFIDENCE</span><strong>Main uncertainty disclosed</strong></div>
              </div>
              <div className="preview-result-total"><div><span>PRIMARY RESULT</span><strong>≈ Estimated Logistics Cost</strong></div><p>Commercial total remains secondary</p></div>
              <div className="preview-responsibility-table" role="table" aria-label="Illustrative responsibility and cost impact">
                <div className="table-head" role="row"><span>COMPONENT</span><span>CURRENT</span><span>TARGET</span><span>IMPACT</span></div>
                <div role="row"><b>Packing / origin</b><span>Source</span><span>Seller</span><strong>Estimated</strong></div>
                <div role="row"><b>Main freight</b><span>Source</span><span>Seller</span><strong>Benchmark</strong></div>
                <div role="row"><b>Cargo insurance</b><span>Source</span><span>Seller</span><strong>Estimated</strong></div>
                <div role="row"><b>Import duty / VAT</b><span>Buyer</span><span>Buyer</span><strong>Excluded for CIP</strong></div>
              </div>
              <ul className="preview-deliverables">
                <li>✓ Cargo evidence separated from proxies</li><li>✓ Transport capacity calculated</li><li>✓ Freight benchmark labelled</li><li>✓ Insurance disclosed separately</li><li>✓ Assumptions traceable</li><li>✓ One current estimate</li>
              </ul>
              <footer><div><span>APPROVED RESULT</span><strong>Ready for commercial / tender decision</strong></div><span aria-hidden="true">→</span></footer>
            </article>
          </div>

          <footer className="cost-product-actions">
            <div><strong>You provide the transaction evidence.</strong><span>Landed Cost Studio turns it into one calculation you can review, understand, and approve.</span></div>
            <div className="welcome-actions">
              <button className="primary-client-action" onClick={startNewCalculation} type="button">Start a logistics calculation <span>→</span></button>
              <button className="secondary-client-action" onClick={openDemoScenario} type="button">Open labelled methodology example</button>
              <button className="secondary-client-action" onClick={() => { setSelectedCaseId(null); setClientSurface("cases"); }} type="button">Open saved cases</button>
            </div>
          </footer>
        </section>

        <section className="overview-support" aria-label="How Landed Cost Studio works">
          <article className="guided-consultation-card">
            <header><span>GUIDED CONSULTATION</span><strong>A consultation, not a technical form</strong><p>We reuse uploaded and earlier inputs, ask only for genuine gaps, and never silently treat unknown costs as zero.</p></header>
            <ol>
              <li><b>1</b><span>Describe the shipment or upload available documents.</span></li>
              <li><b>2</b><span>Confirm current and desired delivery responsibilities.</span></li>
              <li><b>3</b><span>Review prepared costs and complete only missing inputs.</span></li>
              <li><b>4</b><span>Calculate, review, approve, and save one current estimate.</span></li>
            </ol>
          </article>
          <div className="client-capabilities" aria-label="Available calculations">
            <article><span>01</span><strong>Logistics cost</strong><p>Factory-to-terminal, international freight, door-to-door or a custom scope.</p></article>
            <article><span>02</span><strong>Delivery-term impact</strong><p>See only the responsibilities and costs that change—without double counting.</p></article>
            <article><span>03</span><strong>Commercial summary</strong><p>Keep the logistics addition primary and the revised commercial total secondary.</p></article>
          </div>
        </section>
        <section className="client-trust-note"><strong>How it works</strong><p>The calculation is deterministic and runs locally in your browser. No AI tokens are used. Missing cargo and rate values may be estimated only from visible, versioned proxies and benchmarks; they are never presented as source facts or live quotations.</p><button onClick={() => setClientSurface("audit")} type="button">Review calculation architecture</button></section>
        <footer className="costing-footer"><div><strong>TenderApps</strong><span>Landed Cost Studio · guided and auditable</span></div><p>Planning and review tool · not legal, tax, customs, insurance, or carrier advice</p></footer>
      </main>
    );
  }

  if (clientSurface === "cases") {
    return (
      <main className="costing-page client-first-page">
        {clientWorkspaceNav}
        <section className="cases-heading">
          <div><p className="costing-eyebrow"><span /> SAVED CASES</p><h1>Approved calculations,<br /><em>kept separately.</em></h1><p>Every approved calculation preserves its inputs, assumptions, result and approval time.</p></div>
          <button className="primary-client-action" onClick={startNewCalculation} type="button">New calculation <span>＋</span></button>
        </section>
        {savedCases.length === 0 ? (
          <section className="empty-cases"><span>0 SAVED CASES</span><strong>No approved calculations yet</strong><p>Complete a guided calculation and explicitly approve the result. It will appear here.</p><button onClick={startNewCalculation} type="button">Start the first calculation</button></section>
        ) : (
          <>
            <section className="saved-case-grid" aria-label="Saved calculations">
              {savedCases.map((savedCase) => <article key={savedCase.id}>
                <header><span>APPROVED</span><time dateTime={savedCase.approvedAt}>{new Date(savedCase.approvedAt).toLocaleString()}</time></header>
                <strong>{savedCase.name}</strong><p>{savedCase.cargo}{savedCase.quantity ? ` · ${savedCase.quantity}` : ""}</p>
                <dl><div><dt>ROUTE</dt><dd>{savedCase.origin} → {savedCase.destination}</dd></div><div><dt>TERMS / SCOPE</dt><dd>{savedCase.input.mode === "logistics-only" ? savedCase.input.logisticsScope : `${savedCase.input.sourceTerm} → ${savedCase.input.targetTerm}`}</dd></div><div><dt>ORIGINAL</dt><dd>{money(savedCase.result.sourceContractTotal, savedCase.result.currency)}</dd></div><div><dt>ADJUSTMENT</dt><dd>{money(savedCase.result.incrementalCost, savedCase.result.currency)}</dd></div><div><dt>RESULT</dt><dd>{money(savedCase.result.revisedContractTotal, savedCase.result.currency)}</dd></div></dl>
                <div><button onClick={() => setSelectedCaseId(savedCase.id)} type="button">Open case</button></div>
              </article>)}
            </section>
          </>
        )}
        {selectedSavedCase && <section className="case-detail" aria-label="Saved case details"><header><div><span>APPROVED CASE</span><h2>{selectedSavedCase.name}</h2></div><button onClick={() => setSelectedCaseId(null)} type="button" aria-label="Close saved case details">×</button></header><div className="case-detail-grid"><article><span>INPUTS</span><p><b>Cargo:</b> {selectedSavedCase.cargo}</p><p><b>Quantity:</b> {selectedSavedCase.quantity || "Not specified"}</p><p><b>Route:</b> {selectedSavedCase.origin} → {selectedSavedCase.destination}</p><p><b>Value:</b> {money(selectedSavedCase.input.sourceContractTotal, selectedSavedCase.input.currency)}</p></article><article><span>ASSUMPTIONS</span>{selectedSavedCase.result.assumptions.map((assumption) => <p key={assumption}>{assumption}</p>)}</article><article><span>RESULT</span><strong>{money(selectedSavedCase.result.revisedContractTotal, selectedSavedCase.result.currency)}</strong><p>Adjustment: {money(selectedSavedCase.result.incrementalCost, selectedSavedCase.result.currency)}</p><p>Status at calculation: {selectedSavedCase.result.status}</p></article><article><span>APPROVAL</span><strong>Approved</strong><p>{new Date(selectedSavedCase.approvedAt).toLocaleString()}</p><p>Saved locally in this browser.</p></article></div></section>}
        <footer className="costing-footer"><div><strong>TenderApps</strong><span>Saved cases · local browser storage</span></div><p>Export audit artifacts for durable tender or contract records</p></footer>
      </main>
    );
  }

  if (clientSurface === "intake") {
    return (
      <main className="costing-page client-first-page">
        {clientWorkspaceNav}
        <section className="intake-heading"><div><span>GUIDED CALCULATION</span><h1>{guidedSteps[clientStep - 1].label}</h1><p>Step {clientStep} of {guidedSteps.length}. We will keep your earlier answers as you move back and forward.</p></div><button onClick={() => setClientSurface("welcome")} type="button">Exit to start</button></section>
        <ol className="consultation-progress" aria-label="Calculation progress">
          {guidedSteps.map((step) => <li className={step.id < clientStep ? "completed" : step.id === clientStep ? "current" : "upcoming"} key={step.id} aria-current={step.id === clientStep ? "step" : undefined}><span>{step.id < clientStep ? "✓" : step.id}</span><b>{step.short}</b></li>)}
        </ol>
        <section className="intake-card" aria-live="polite">
          {clientStep === 1 && <div className="intake-step goal-step"><header><span>STEP 1 · YOUR GOAL</span><h2>What are you trying to calculate?</h2><p>Choose the business outcome. We will translate it into the appropriate calculation workflow.</p></header><div className="goal-choice-grid">{clientGoals.map((goal) => <button aria-pressed={clientGoal === goal.id} key={goal.id} onClick={() => chooseGoal(goal.id)} type="button"><span>{clientGoal === goal.id ? "✓" : "→"}</span><strong>{goal.title}</strong><p>{goal.description}</p></button>)}</div></div>}

          {clientStep === 2 && <div className="intake-step shipment-step">
            <header><span>STEP 2 · TRANSACTION</span><h2>How would you like to provide the details?</h2><p>Both options feed the same structured calculation. You can upload documents and still complete or correct any field manually.</p></header>
            <div className="input-supply-choice" role="group" aria-label="Choose how to provide transaction information">
              <button aria-pressed={inputSupplyMode === "manual"} onClick={() => setInputSupplyMode("manual")} type="button"><span>✎</span><strong>I will fill it myself</strong><p>I know the transaction details and will enter them in the guided form.</p></button>
              <button aria-pressed={inputSupplyMode === "documents"} onClick={() => setInputSupplyMode("documents")} type="button"><span>↑</span><strong>Fill automatically from uploaded inputs</strong><p>Upload a quotation, contract, PO, packing list, freight quote or other available data. We will prepare the same form for your review.</p></button>
            </div>
            {inputSupplyMode === "documents" && <DocumentIntakePanel />}
            {inputSupplyMode && <>
              <div className="prepared-form-heading"><div><span>{inputSupplyMode === "documents" ? "PRE-FILLED CLIENT INPUTS" : "MANUAL CLIENT INPUTS"}</span><h3>{inputSupplyMode === "documents" ? "Review what was found and complete the gaps" : "Tell us about the shipment"}</h3><p>{inputSupplyMode === "documents" ? "Automatically populated values are never final truth. Every field remains editable." : "Packing and transport details may remain unknown and will be carried forward as open items."}</p></div>{inputSupplyMode === "documents" && <div className="extraction-legend"><span>✓ Extracted confidently</span><span>? Needs confirmation</span><span>— Not found · please provide</span></div>}</div>
              <div className="client-field-grid">
                <label className="field-wide"><span>Product or cargo <b>Required</b></span><input placeholder="e.g. laboratory equipment" value={cargoDescription} onChange={(event) => { setCargoDescription(event.target.value); markInputFieldAdjusted("cargoDescription"); }} /><InputEvidence field="cargoDescription" /></label>
                <label><span>Quantity / package count <i>Optional</i></span><input placeholder="e.g. 165 lines or 24 pallets" value={quantityDescription} onChange={(event) => { setQuantityDescription(event.target.value); markInputFieldAdjusted("quantityDescription"); }} /><InputEvidence field="quantityDescription" /></label>
                <label><span>Contract or goods value <b>Required</b></span><input min="0" step="0.01" type="number" placeholder="0.00" value={sourceTotal || ""} onChange={(event) => { setSourceTotal(Number(event.target.value)); markInputFieldAdjusted("sourceTotal"); }} /><InputEvidence field="sourceTotal" /></label>
                <label><span>Currency <b>Required</b></span><input maxLength={3} placeholder="e.g. USD" value={currency} onChange={(event) => { const nextCurrency = event.target.value.toUpperCase(); setCurrency(nextCurrency); setNewLineCurrency(nextCurrency); setCostLines((current) => current.map((line) => line.amount === 0 && !line.sourceRef ? { ...line, currency: nextCurrency || line.currency } : line)); markInputFieldAdjusted("currency"); }} /><InputEvidence field="currency" /></label>
                <label><span>Supplier / origin <b>Required</b></span><input placeholder="City, country or supplier premises" value={sourcePlace} onChange={(event) => { setSourcePlace(event.target.value); markInputFieldAdjusted("sourcePlace"); }} /><InputEvidence field="sourcePlace" /></label>
                <label><span>Exact named destination <b>Required</b></span><input placeholder="e.g. Tashkent, Uzbekistan or named terminal/site" value={targetPlace} onChange={(event) => { setTargetPlace(event.target.value); markInputFieldAdjusted("targetPlace"); }} /><InputEvidence field="targetPlace" />{targetPlace && !isSpecificNamedDestination(targetPlace) && <small className="packing-empty-guidance">A country alone is not priceable. Add the city, terminal, airport or delivery site.</small>}</label>
                <label><span>Transport mode <b>Required</b></span><select value={transportModeAnswer} onChange={(event) => { const value = event.target.value as TransportMode | ""; setTransportModeAnswer(value); markInputFieldAdjusted("transportMode"); if (value) { setTransportMode(value); setPreferredUnitId(value === "road" ? "road-enclosed-136" : transportUnits.find((unit) => unit.mode === value)?.id ?? "multimodal-40hc"); } }}><option value="">Select transport mode</option>{transportModes.map((mode) => <option key={mode} value={mode}>{mode}</option>)}</select><InputEvidence field="transportMode" /></label>
                <label><span>Shipment packed volume · m³ <i>Optional</i></span><input min="0" step="0.1" type="number" placeholder="Agent-estimable" value={packedVolumeM3 || ""} onChange={(event) => { setPackedVolumeM3(Number(event.target.value)); markInputFieldAdjusted("packedVolumeM3"); }} /><InputEvidence field="packedVolumeM3" />{!packedVolumeM3 && <small className="packing-empty-guidance">If left blank, the agent estimates packed cube from source evidence and editable category proxies. Product dimensions are not silently treated as packed dimensions.</small>}</label>
                <label><span>Shipment gross weight · kg <i>Optional</i></span><input min="0" step="0.1" type="number" placeholder="Agent-estimable" value={grossWeightKg || ""} onChange={(event) => { setGrossWeightKg(Number(event.target.value)); markInputFieldAdjusted("grossWeightKg"); }} /><InputEvidence field="grossWeightKg" />{!grossWeightKg && <small className="packing-empty-guidance">If left blank, the agent estimates gross weight from source evidence and category proxies. It remains visibly provisional.</small>}</label>
                <label className="field-wide"><span>Special-cargo declaration <i>Required before approval</i></span><select value={specialCargoDeclaration} onChange={(event) => setSpecialCargoDeclaration(event.target.value as SpecialCargoDeclaration)}><option value="">Not confirmed yet — continue with warning</option><option value="standard-confirmed">No DG, cold-chain or special handling declared</option><option value="possible-special">Possible special cargo — declarations pending</option><option value="declared-special">Special cargo declared — review surcharges</option></select><small className="packing-empty-guidance">A preliminary estimate may continue without confirmation; approval remains unavailable until this declaration is completed.</small></label>
              </div>
              {inputSupplyMode === "manual" && <details className="hybrid-document-option"><summary>Optionally combine manual entry with document upload</summary><DocumentIntakePanel compact /></details>}
            </>}
          </div>}

          {clientStep === 3 && <div className="intake-step terms-step"><header><span>STEP 3 · CURRENT ARRANGEMENT</span><h2>How is delivery handled now?</h2><p>If you know the current Incoterm, select it directly. Otherwise describe who handles the work and we will suggest the closest standard rule.</p></header><div className="knowledge-switch" role="group" aria-label="Current Incoterm knowledge"><button aria-pressed={sourceTermKnowledge === "known"} onClick={() => setSourceTermKnowledge("known")} type="button">I know the current Incoterm</button><button aria-pressed={sourceTermKnowledge === "help"} onClick={() => { setSourceTermKnowledge("help"); setSourceTermSelected(false); }} type="button">I don't know · help me</button></div>{sourceTermKnowledge === "known" && <div className="known-term-card"><label><span>Current Incoterm</span><select value={sourceTermSelected ? sourceTerm : ""} onChange={(event) => { setSourceTerm(event.target.value as IncotermCode); setSourceTermSelected(true); markInputFieldAdjusted("sourceTerm"); }}><option value="">Select a rule</option>{incotermCodes.map((term) => <option key={term} value={term}>{term} · {incotermProfiles[term].name}</option>)}</select><InputEvidence field="sourceTerm" /></label><label><span>Current named place</span><input value={sourcePlace} onChange={(event) => { setSourcePlace(event.target.value); markInputFieldAdjusted("sourcePlace"); }} /><small>The exact place matters for delivery, risk and cost boundaries.</small></label></div>}{sourceTermKnowledge === "help" && <ResponsibilityQuestionnaire side="current" answers={currentResponsibilities} inferred={inferredSourceTerm} />}</div>}

          {clientStep === 4 && <div className="intake-step terms-step">
            <header><span>STEP 4 · DESIRED SITUATION</span><h2>{workspaceMode === "logistics" ? "Which responsibility boundary should define the logistics budget?" : "What delivery arrangement do you want?"}</h2><p>{workspaceMode === "logistics" ? `The existing ${sourceTermSelected ? sourceTerm : "commercial"} Incoterm remains unchanged and supplies the default cost scope.` : "Choose the target Incoterm once. Its standard cost boundary will automatically become the calculation scope."}</p></header>
            {workspaceMode === "logistics" ? <section className="inherited-scope-panel">
              <div className="inherited-scope-heading"><span>RECOMMENDED / DEFAULT</span><h3>Use the current Incoterm automatically</h3><p>The commercial term is not changed; its seller-paid responsibilities define which logistics costs belong in this standalone budget.</p></div>
              <button className="recommended-scope" aria-pressed={costScopeBasis === "incoterm"} onClick={() => { setCostScopeBasis("incoterm"); setLogisticsScope(""); }} type="button"><span>{costScopeBasis === "incoterm" ? "✓" : "○"}</span><div><b>As per current Incoterm — {sourceTerm} ({incotermProfiles[sourceTerm].name})</b><small>The Incoterms engine selects the relevant seller-paid cost components. Actual monetary rates still require document evidence, a client input or an explicitly approved planning allowance.</small></div><em>SELECTED BY DEFAULT</em></button>
              <details className="alternative-scope-options" open={costScopeBasis !== "incoterm"}><summary>Calculate a different / custom logistics scope instead</summary><p>Use this only when the budget intentionally differs from the current {sourceTerm} responsibility boundary.</p><div className="scope-choice-grid">{logisticsScopes.map((scope) => <button aria-pressed={costScopeBasis === scope.id} key={scope.id} onClick={() => { setLogisticsScope(scope.id); setCostScopeBasis(scope.id); }} type="button"><span>{costScopeBasis === scope.id ? "✓" : ""}</span><strong>{scope.label}</strong></button>)}</div></details>
              {costScopeBasis !== "incoterm" && <div className="scope-deviation-warning"><strong>△ Alternative logistics scope</strong><p>This budget no longer follows the standard seller-paid components of {sourceTerm}. The override remains visible in the audit trail.</p></div>}
            </section> : <>
              <div className="knowledge-switch" role="group" aria-label="Target Incoterm knowledge"><button aria-pressed={targetTermKnowledge === "known"} onClick={() => setTargetTermKnowledge("known")} type="button">I know the target Incoterm</button><button aria-pressed={targetTermKnowledge === "help"} onClick={() => { setTargetTermKnowledge("help"); setTargetTermSelected(false); }} type="button">Help me choose by responsibility</button></div>
              {targetTermKnowledge === "known" && <div className="known-term-card"><label><span>Target Incoterm</span><select value={targetTermSelected ? targetTerm : ""} onChange={(event) => { setTargetTerm(event.target.value as IncotermCode); setTargetTermSelected(true); setCostScopeBasis("incoterm"); markInputFieldAdjusted("targetTerm"); }}><option value="">Select a rule</option>{incotermCodes.map((term) => <option key={term} value={term}>{term} · {incotermProfiles[term].name}</option>)}</select><InputEvidence field="targetTerm" /></label><label><span>Target named place</span><input value={targetPlace} onChange={(event) => { setTargetPlace(event.target.value); markInputFieldAdjusted("targetPlace"); }} /><small>Use the terminal, port, airport or final delivery site stated in the proposed arrangement.</small></label></div>}
              {targetTermKnowledge === "help" && <ResponsibilityQuestionnaire side="desired" answers={desiredResponsibilities} inferred={inferredTargetTerm} />}
              {displayedTargetTerm && <section className="inherited-scope-panel">
                <div className="inherited-scope-heading"><span>CALCULATION SCOPE</span><h3>Use the selected Incoterm by default</h3><p>You do not need to define the same responsibility twice.</p></div>
                <button className="recommended-scope" aria-pressed={costScopeBasis === "incoterm"} onClick={() => setCostScopeBasis("incoterm")} type="button"><span>{costScopeBasis === "incoterm" ? "✓" : "○"}</span><div><b>As per selected Incoterm — {displayedTargetTerm} ({incotermProfiles[displayedTargetTerm].name})</b><small>The existing Incoterms engine determines the relevant seller-paid cost components.</small></div><em>RECOMMENDED</em></button>
                <details className="alternative-scope-options" open={costScopeBasis !== "incoterm"}><summary>Choose an alternative logistics scope</summary><p>Use this only when the cost exercise intentionally differs from the standard {displayedTargetTerm} boundary.</p><div className="scope-choice-grid">{logisticsScopes.map((scope) => <button aria-pressed={costScopeBasis === scope.id} key={scope.id} onClick={() => { setLogisticsScope(scope.id); setCostScopeBasis(scope.id); }} type="button"><span>{costScopeBasis === scope.id ? "✓" : ""}</span><strong>{scope.label}</strong></button>)}</div></details>
                {costScopeBasis !== "incoterm" && <div className="scope-deviation-warning"><strong>△ Contract-specific calculation scope</strong><p>This selection overrides the standard cost components implied by {displayedTargetTerm}. The deviation will remain visible in the assumptions and audit trail.</p></div>}
              </section>}
            </>}
          </div>}

          {clientStep === 5 && <div className="intake-step costs-step">
            <header><span>STEP 5 · PREPARED COST INPUTS</span><h2>Review the estimate we prepared</h2><p>Source evidence, cargo estimates, the selected {workspaceMode === "logistics" ? costScopeBasis === "incoterm" ? `${sourceTerm} responsibility boundary` : "logistics scope" : `${targetTerm} responsibility boundary`}, and maintained route benchmarks have already been applied. Review exceptions or replace any benchmark with your own quotation.</p></header>
            <section className="cost-preparation-summary" aria-live="polite"><div><span>PREPARATION STATUS</span><strong>We have {preparedRequiredCosts.length} of {requiredCostComponents.length} relevant cost components.</strong><p>{unknownRequiredCosts.length ? `We still need ${unknownRequiredCosts.length} item${unknownRequiredCosts.length === 1 ? "" : "s"} from you for a complete calculation.` : "No required cost value is currently missing."}</p></div><dl><div><dt>READY / FOUND</dt><dd>{preparedRequiredCosts.length}</dd></div><div><dt>NEEDS INPUT</dt><dd>{unknownRequiredCosts.length}</dd></div><div><dt>EXCLUDED</dt><dd>{excludedRequiredCosts.length}</dd></div></dl></section>
            {unknownRequiredCosts.length > 0 && <section className="prepared-cost-group needs-input"><header><div><span>NEEDS YOUR INPUT</span><h3>Only the remaining gaps</h3></div><p>These items could not be sourced or reasonably benchmarked. They remain open rather than being silently treated as zero.</p></header><div className="guided-cost-list">{unknownRequiredCosts.map((component) => <GuidedCostRow component={component} key={component} />)}</div></section>}
            {preparedRequiredCosts.length > 0 && <section className="prepared-cost-group ready"><header><div><span>READY FOR REVIEW</span><h3>Provided, extracted or benchmark-estimated values</h3></div><p>Every value is editable. Sources and benchmark vintage remain attached in the audit trail.</p></header><div className="guided-cost-list">{preparedRequiredCosts.map((component) => <GuidedCostRow component={component} key={component} />)}</div></section>}
            {excludedRequiredCosts.length > 0 && <details className="excluded-cost-group"><summary>{excludedRequiredCosts.length} component(s) marked not applicable</summary><div className="guided-cost-list">{excludedRequiredCosts.map((component) => <GuidedCostRow component={component} key={component} />)}</div></details>}
            {requiredCostComponents.includes("insurance") && <div className="insurance-guidance"><div><span>ESTIMATED INSURANCE</span><strong>{targetTerm === "CIF" ? "CIF default cover basis" : "CIP / cargo insurance basis"}</strong><p>{insuranceRatePercent > 0 ? "The client-entered planning rate replaces the maintained benchmark." : `Using the maintained ${(productionEstimate.insuranceRate * 100).toFixed(2)}% premium benchmark on ${(productionEstimate.insuranceCoverageFactor * 100).toFixed(0)}% insured value.`}</p></div><label><span>Override premium rate · %</span><input min="0" step="0.01" type="number" placeholder={(productionEstimate.insuranceRate * 100).toFixed(2)} value={insuranceRatePercent || ""} onChange={(event) => setInsuranceRatePercent(Number(event.target.value))} /></label><label><span>Insured value · %</span><input min="100" step="1" type="number" value={coveragePercent} onChange={(event) => setCoveragePercent(Number(event.target.value))} /></label></div>}
            <details className="advanced-cost-entry"><summary>Other / advanced / contract-specific costs</summary><div className="cost-line-toolbar" role="group" aria-label="Add logistics service line"><label><span>Component</span><select value={newLineComponent} onChange={(event) => setNewLineComponent(event.target.value as CostComponentCode)}>{costComponentCodes.map((component) => <option key={component} value={component}>{componentLabels[component]}</option>)}</select></label><label className="toolbar-wide"><span>Description</span><input value={newLineLabel} onChange={(event) => setNewLineLabel(event.target.value)} /></label><label><span>Amount</span><input min="0" step="0.01" type="number" value={newLineAmount || ""} onChange={(event) => setNewLineAmount(Number(event.target.value))} /></label><button onClick={addCostLine} type="button">Add service line</button></div></details>
            {unknownRequiredCosts.length > 0 && <div className="provisional-continuation-note"><strong>Continue with unknown costs</strong><p>The known subtotal can still be calculated. {unknownRequiredCosts.map((component) => componentLabels[component]).join(", ")} will remain open and will not be included in the numeric total until supplied.</p></div>}
          </div>}

          {clientStep === 6 && <div className="intake-step review-step"><header><span>STEP 6 · REVIEW</span><h2>Here is the calculation basis</h2><p>Review the commercial facts, estimated cargo profile, benchmark basis and remaining warnings before calculation.</p></header><div className="review-summary-grid"><article><header><span>GOAL</span><button onClick={() => setClientStep(1)} type="button">Edit</button></header><strong>{clientGoals.find((goal) => goal.id === clientGoal)?.title}</strong><p>{workspaceMode === "logistics" ? costScopeBasis === "incoterm" ? `As per current Incoterm — ${sourceTerm}` : logisticsScopes.find((scope) => scope.id === logisticsScope)?.label : `${sourceTerm} → ${targetTerm}`}</p></article><article><header><span>SHIPMENT</span><button onClick={() => setClientStep(2)} type="button">Edit</button></header><strong>{cargoDescription}</strong><p>{quantityDescription || `${sourceLineCount ?? 1} source line(s)`}</p><p>{sourcePlace} → {targetPlace}</p><p>{exactMoney(sourceTotal, currency)}</p></article><article><header><span>TRANSPORT</span><button onClick={() => setClientStep(2)} type="button">Edit</button></header><strong>{productionEstimate.transport.requiredTruckCount} × {productionEstimate.transport.unit.label}</strong><p>{productionEstimate.transport.limitingFactor} · {transportMode}</p></article><article><header><span>CARGO ESTIMATE</span><button onClick={() => setClientStep(2)} type="button">Edit</button></header><strong>{approximateNumber(productionEstimate.cargo.packedVolumeM3.value, "m³")} · {approximateNumber(productionEstimate.cargo.grossWeightKg.value, "kg")}</strong><p>Confidence {productionEstimate.confidence.score}% · {productionEstimate.confidence.label}</p></article></div><div className="review-findings"><section className={blockingMissing.length ? "blocking" : "complete"}><span>{blockingMissing.length ? "REQUIRED INFORMATION" : "REQUIRED INFORMATION COMPLETE"}</span>{blockingMissing.length ? <ul>{blockingMissing.map((item) => <li key={item}>{item}</li>)}</ul> : <p>All inputs required to define the calculation are present.</p>}</section><section className={unknownRequiredCosts.length ? "provisional" : "complete"}><span>{unknownRequiredCosts.length ? "UNESTIMABLE COST INPUTS" : "ESTIMATE PREPARED"}</span>{unknownRequiredCosts.length ? <ul>{unknownRequiredCosts.map((component) => <li key={component}>{componentLabels[component]}</li>)}</ul> : <p>Every relevant cost is sourced, provided, estimated or explicitly excluded.</p>}</section><section className="assumptions"><span>KEY BOUNDARIES</span><ul><li>Freight is benchmark-derived, not a carrier quotation.</li><li>Estimated packing remains separate from source facts.</li><li>Duties and VAT remain outside standard CIP.</li><li>{specialCargoDeclaration ? "Special-cargo declaration recorded for this preliminary case." : "Special-cargo declaration is still required before approval."}</li></ul></section></div><label className="scenario-name-field"><span>Case name <i>Optional</i></span><input placeholder={`${cargoDescription} · ${sourceTerm}${workspaceMode === "logistics" ? " logistics" : ` → ${targetTerm}`}`} value={scenarioName} onChange={(event) => setScenarioName(event.target.value)} /></label></div>}
          {clientStep === 5 && workspaceMode !== "logistics" && targetTerm === "DDP" && <div className="ddp-guidance"><div><span>DDP JURISDICTION GATE</span><strong>Confirm that seller-paid import is legally workable</strong><p>DDP requires an import jurisdiction and a lawful seller-side importer-of-record basis.</p></div><label><span>Import jurisdiction <b>Required</b></span><input placeholder="e.g. Uzbekistan" value={importJurisdiction} onChange={(event) => setImportJurisdiction(event.target.value)} /></label><label><span>Seller-side importer of record <b>Required</b></span><input placeholder="Legal entity or confirmed basis" value={importerOfRecord} onChange={(event) => setImporterOfRecord(event.target.value)} /></label><label><span>Tax registration / recovery basis <i>Optional</i></span><input placeholder="Registration and recoverability assumption" value={taxRegistrationBasis} onChange={(event) => setTaxRegistrationBasis(event.target.value)} /></label></div>}
        </section>
        <nav className="intake-actions" aria-label="Guided calculation actions"><button disabled={clientStep === 1} onClick={() => setClientStep((current) => Math.max(1, current - 1))} type="button">← Back</button><span>Your answers stay in this browser session.</span>{clientStep < 6 ? <button className="continue-button" disabled={!canContinueFromStep(clientStep)} onClick={continueIntake} type="button">Continue →</button> : <button className="continue-button" disabled={blockingMissing.length > 0} onClick={calculateClientScenario} type="button">Calculate result →</button>}</nav>
        <footer className="costing-footer"><div><strong>TenderApps</strong><span>Guided client consultation</span></div><p>Calculation details remain available in the audit view</p></footer>
      </main>
    );
  }

  if (clientSurface === "result") {
    const hasOpenCostInputs = unknownRequiredCosts.length > 0;
    const addedAmount = (...components: CostComponentCode[]) => result.treatments.filter((treatment) => treatment.treatment === "added" && components.includes(treatment.component)).reduce((sum, treatment) => sum + treatment.amount, 0);
    const costBreakdown = [
      { label: "Packing reinforcement", value: addedAmount("export_packing") },
      { label: "Origin handling", value: addedAmount("origin_loading", "origin_pickup", "origin_terminal", "vessel_loading") },
      { label: "Export documents", value: addedAmount("export_clearance") },
      { label: `Main ${transportMode} freight`, value: addedAmount("main_freight") },
      { label: "Transit / border", value: addedAmount("transit_handling", "transshipment") },
      { label: "Destination carriage", value: addedAmount("destination_terminal", "final_delivery") },
      { label: "Contingency", value: addedAmount("contingency") },
      { label: "Insurance", value: result.insurance },
    ];
    const displayedBreakdownTotal = costBreakdown.reduce((sum, line) => sum + line.value, 0);
    const primaryWarnings = [
      ...documents.flatMap((document) => document.warnings.filter((warning) => warning.code === "COMMERCIAL_TOTAL_DISCREPANCY").map((warning) => warning.message)),
      ...productionEstimate.warnings,
    ].slice(0, 5);
    const plainLanguage = productionEstimate.transport.limitingFactor === "VOLUME / LOADABILITY"
      ? `Груз не слишком тяжёлый для выбранного транспорта, но занимает много полезного пространства, и часть оборудования нельзя плотно штабелировать. Поэтому количество машин определяется прежде всего объёмом. ${productionEstimate.transport.requiredTruckCount > 1 ? `Вторая машина нужна для оставшихся примерно ${Math.round(productionEstimate.transport.allocations[1]?.volumeUtilizationPercent ?? 0)}% полезного объёма.` : "Одной машины достаточно с текущим запасом по объёму."}`
      : productionEstimate.transport.limitingFactor === "WEIGHT"
        ? `Груз помещается по объёму, но ограничение по полезной нагрузке требует ${productionEstimate.transport.requiredTruckCount} транспортных единиц. Поэтому расчёт определяется прежде всего весом.`
        : `Объём и вес одновременно близки к практическим ограничениям транспорта, поэтому для текущего груза требуется ${productionEstimate.transport.requiredTruckCount} транспортных единиц.`;
    return (
      <main className="costing-page client-first-page">
        {clientWorkspaceNav}
        {demoLoaded && <section className="demo-banner"><div><span>DEMO / REGRESSION SCENARIO</span><strong>These values are seeded test assumptions—not your commercial data.</strong></div><button onClick={startNewCalculation} type="button">Start with my own data</button></section>}
        <section className="production-result-hero">
          <div className="estimate-hero-copy"><p className="costing-eyebrow"><span /> ONE BEST CURRENT ESTIMATE</p><span className="estimate-label">Estimated Logistics Cost</span><h1>{approximateMoney(result.incrementalCost, currency, true)}</h1><p className="estimate-route">{sourceTerm} {sourcePlace} → {targetTerm ?? sourceTerm} {targetPlace} · {transportMode.charAt(0).toUpperCase() + transportMode.slice(1)}</p><div className="confidence-line"><strong>Confidence: {productionEstimate.confidence.score}% · {productionEstimate.confidence.label}</strong><span>Main uncertainty: {productionEstimate.confidence.mainUncertainty}</span></div><p className="preliminary-label">Preliminary estimate — not a carrier quotation</p></div>
          <aside><span>CALCULATION BASIS</span><strong>{productionEstimate.transport.requiredTruckCount} × {productionEstimate.transport.unit.label}</strong><p>{productionEstimate.benchmark.label}</p><small>Benchmark vintage {productionEstimate.benchmark.asOf} · full precision retained internally</small></aside>
        </section>
        <section className="production-kpis" aria-label="Shipment and transport summary"><article><span>ESTIMATED VOLUME</span><strong>{approximateNumber(productionEstimate.cargo.packedVolumeM3.value, "m³")}</strong><small>{productionEstimate.cargo.packedVolumeM3.kind.replaceAll("-", " ")}</small></article><article><span>ESTIMATED GROSS WEIGHT</span><strong>{approximateNumber(productionEstimate.cargo.grossWeightKg.value, "kg")}</strong><small>{productionEstimate.cargo.grossWeightKg.kind.replaceAll("-", " ")}</small></article><article><span>TRANSPORT REQUIREMENT</span><strong>{productionEstimate.transport.requiredTruckCount} × {productionEstimate.transport.unit.label}</strong><small>{productionEstimate.transport.limitingFactor}</small></article><article><span>ESTIMATED TRANSIT</span><strong>≈ {productionEstimate.transport.transitDays[0]}–{productionEstimate.transport.transitDays[1]} days</strong><small>Planning range · not a schedule commitment</small></article></section>

        <section className="truck-utilization-section">
          <header><div><span>TRANSPORT CAPACITY</span><h2>Dynamic truck utilization</h2></div><p>{productionEstimate.transport.requiredTruckCount} required + 1 free capacity reference</p></header>
          <div className="truck-allocation-grid">{productionEstimate.transport.allocations.map((allocation) => <TruckCutaway allocation={allocation} key={allocation.index} unitLabel={productionEstimate.transport.unit.label} />)}</div>
        </section>

        <section className="why-transport-section">
          <header><span>PHYSICAL MODEL</span><h2>Why This Transport?</h2></header>
          <div className="transport-model-grid"><dl><div><dt>Estimated packed volume</dt><dd>{approximateNumber(productionEstimate.cargo.packedVolumeM3.value, "m³")}</dd></div><div><dt>Planning volume after loadability</dt><dd>{approximateNumber(productionEstimate.cargo.planningVolumeM3, "m³")}</dd></div><div><dt>Estimated gross weight</dt><dd>{approximateNumber(productionEstimate.cargo.grossWeightKg.value, "kg")}</dd></div><div><dt>Usable volume per truck</dt><dd>{approximateNumber(productionEstimate.transport.unit.usableVolumeM3, "m³")}</dd></div><div><dt>Payload per truck</dt><dd>{approximateNumber(productionEstimate.transport.unit.payloadKg, "kg")}</dd></div><div><dt>Required trucks</dt><dd>{productionEstimate.transport.requiredTruckCount}</dd></div><div><dt>Limiting factor</dt><dd>{productionEstimate.transport.limitingFactor}</dd></div></dl><article><span>ПРОСТЫМИ СЛОВАМИ</span><h3>Почему требуется именно столько транспорта</h3><p>{plainLanguage}</p></article></div>
        </section>

        <section className="cost-and-commercial-grid">
          <article className="production-cost-breakdown"><header><span>COST MODEL</span><h2>Logistics Cost Breakdown</h2></header><table><thead><tr><th>Logistics component</th><th>Estimated cost</th></tr></thead><tbody>{costBreakdown.map((line) => <tr key={line.label}><th>{line.label}</th><td>{line.value > 0 ? approximateMoney(line.value, currency) : "—"}</td></tr>)}</tbody><tfoot><tr><th>Estimated Logistics Cost</th><td>{approximateMoney(displayedBreakdownTotal, currency, true)}</td></tr></tfoot></table>{Math.abs(displayedBreakdownTotal - result.incrementalCost) > 0.01 && <p className="reconciliation-error">Calculation reconciliation failed by {money(displayedBreakdownTotal - result.incrementalCost, currency)}.</p>}</article>
          <article className="commercial-summary"><header><span>SECONDARY COMMERCIAL RESULT</span><h2>Commercial Summary</h2></header><div><span>Goods / {sourceTerm} value</span><strong>{exactMoney(result.sourceContractTotal, currency)}</strong></div><b>＋</b><div><span>Estimated logistics cost</span><strong>{approximateMoney(result.incrementalCost, currency, true)}</strong></div><b>＝</b><div className="commercial-total"><span>Estimated {targetTerm ?? sourceTerm} total</span><strong>{approximateMoney(result.revisedContractTotal, currency, true)}</strong></div><p>Estimated logistics uplift: ≈ {number(result.logisticsUpliftPercent, 1)}%</p></article>
        </section>

        <section className="key-warnings"><header><span>KEY ASSUMPTIONS & WARNINGS</span><h2>What may change the estimate</h2></header><ul>{primaryWarnings.map((warning) => <li key={warning}>{warning}</li>)}</ul></section>

        <section className="result-next-actions"><div><span>NEXT DECISION</span><h2>{approvedCaseId ? "Estimate approved and saved" : !specialCargoDeclaration ? "Confirm special-cargo status before approval" : hasOpenCostInputs ? "Review the remaining unestimable inputs" : "Review or approve this estimate"}</h2><p>{approvedCaseId ? "The approved case is preserved in Saved cases." : "This remains a preliminary benchmark estimate until replaced by confirmed packing, carrier and insurer evidence."}</p></div><div>{!demoLoaded && <button className="approve-action" disabled={Boolean(approvedCaseId) || result.status === "blocked" || hasOpenCostInputs || !specialCargoDeclaration} onClick={approveResult} type="button">{approvedCaseId ? "✓ Approved and saved" : !specialCargoDeclaration ? "Confirm special cargo before approval" : "Approve estimate"}</button>}<button onClick={() => { setClientStep(hasOpenCostInputs ? 5 : 6); setClientSurface("intake"); }} type="button">Change inputs</button><button onClick={() => setClientSurface("audit")} type="button">Open methodology / audit</button><button onClick={exportAudit} type="button">Export audit JSON</button></div></section>
        <details className="client-result-details"><summary>Expandable methodology, sources and HS candidates</summary><div><section><span>METHODOLOGY / SOURCES</span><ul>{productionEstimate.assumptions.map((assumption) => <li key={assumption}>{assumption}</li>)}</ul><p><b>Benchmark:</b> {productionEstimate.benchmark.id} · {productionEstimate.benchmark.sourceRef}</p><p><b>Cargo volume:</b> {productionEstimate.cargo.packedVolumeM3.method} · {productionEstimate.cargo.packedVolumeM3.sourceRef}</p><p><b>Gross weight:</b> {productionEstimate.cargo.grossWeightKg.method} · {productionEstimate.cargo.grossWeightKg.sourceRef}</p></section><section><span>REFERENCE HS CANDIDATES</span>{productionEstimate.hsCandidates.length ? <><ul>{productionEstimate.hsCandidates.map((candidate) => <li key={candidate.code}><b>{candidate.code}</b> · {candidate.description} · {candidate.confidence} confidence</li>)}</ul><p>Reference HS classification — verify against the latest applicable customs tariff before actual shipment.</p></> : <p>No defensible reference HS candidate was identified from the available description. Provide item-level descriptions or HS codes.</p>}</section></div></details>
        <footer className="costing-footer"><div><strong>TenderApps</strong><span>Client-readable result · deterministic audit underneath</span></div><p>Engine {result.audit.engineVersion} · no AI-token consumption</p></footer>
      </main>
    );
  }

  return (
    <main className="costing-page">
      {clientWorkspaceNav}
      <section className="audit-mode-banner"><div><span>ADVANCED / AUDIT VIEW</span><strong>Technical calculation details</strong><p>This view exposes the engine inputs, rule boundaries, validation state and regression tools. It is not the first-time client workflow.</p></div><button onClick={() => setClientSurface(approvedCaseId || demoLoaded ? "result" : "welcome")} type="button">← Back to client view</button></section>

      <section className="costing-hero">
        <div>
          <p className="costing-eyebrow"><span /> LANDED COST STUDIO · PRODUCTION WORKFLOW</p>
          <h1>Contract Logistics<br /><em>& Incoterms Costing</em></h1>
          <p>Inspect the canonical cargo, transport, rate, insurance and Incoterms inputs behind the single client-facing logistics estimate.</p>
        </div>
        <aside>
          <span>CLIENT WORKSPACE</span>
          <strong>One estimate with an audit trail</strong>
          <p>Editable Incoterms logic, logistics scope, packing proxies, rate evidence, and explicit human approval boundaries.</p>
          <span className="architecture-owner-note">Advanced inspection · local deterministic calculation</span>
        </aside>
      </section>

      <section className="costing-governance" aria-label="Architecture and runtime status">
        <div><span>RULE SET</span><strong>Incoterms® 2020</strong></div>
        <div><span>CALCULATION</span><strong>Deterministic · versioned</strong></div>
        <div><span>DATA STATE</span><strong>Local browser session</strong></div>
        <div><span>MATURITY</span><strong>Production workflow · benchmark estimate</strong></div>
        <StatusBadge result={result} />
      </section>

      <section className="costing-mode-switch" role="group" aria-label="Calculation mode">
        <button aria-pressed={workspaceMode === "conversion"} onClick={() => setWorkspaceMode("conversion")} type="button"><span>01</span><b>Incoterms conversion</b><small>Add / remove only the changed responsibility costs</small></button>
        <button aria-pressed={workspaceMode === "logistics"} onClick={() => setWorkspaceMode("logistics")} type="button"><span>02</span><b>Logistics only</b><small>Cost a selected scope without changing the commercial term</small></button>
      </section>

      <div className="costing-workspace">
        <section className="costing-editor" aria-labelledby="scenario-input-title">
          <div className="panel-heading"><div><span>INPUT / REVIEW</span><h2 id="scenario-input-title">Scenario basis</h2></div><button type="button" onClick={resetRegression}>Load regression demo</button></div>

          <fieldset className="costing-fieldset">
            <legend>Commercial baseline</legend>
            <div className="field-grid commercial-grid">
              <label><span>Source contract total</span><input min="0" step="0.01" type="number" value={sourceTotal} onChange={(event) => setSourceTotal(Number(event.target.value))} /></label>
              <label><span>Currency</span><input maxLength={3} value={currency} onChange={(event) => setCurrency(event.target.value.toUpperCase())} /></label>
              <label><span>Transport mode</span><select value={transportMode} onChange={(event) => { const mode = event.target.value as TransportMode; setTransportMode(mode); setPreferredUnitId(mode === "road" ? "road-enclosed-136" : transportUnits.find((unit) => unit.mode === mode)?.id ?? "multimodal-40hc"); }}>{transportModes.map((mode) => <option key={mode} value={mode}>{mode}</option>)}</select></label>
              <label><span>Transport unit</span><select value={selectedUnitId} onChange={(event) => setPreferredUnitId(event.target.value)}>{compatibleTransportUnits.map((unit) => <option key={unit.id} value={unit.id}>{unit.label}</option>)}</select></label>
            </div>
          </fieldset>

          {currency !== "USD" && <fieldset className="costing-fieldset fx-fieldset">
            <legend>Exchange-rate basis</legend>
            <p>Fixture service lines are denominated in USD. The dated rate below converts them to the selected scenario currency and remains provisional until sourced.</p>
            <div className="field-grid compact-grid">
              <label><span>USD → {currency} rate</span><input min="0" step="0.000001" type="number" value={fxRate} onChange={(event) => setFxRate(Number(event.target.value))} /></label>
              <label><span>Rate date</span><input type="date" value={fxAsOf} onChange={(event) => setFxAsOf(event.target.value)} /></label>
              <label><span>Rate source</span><input value={fxSource} onChange={(event) => setFxSource(event.target.value)} /></label>
            </div>
          </fieldset>}

          <fieldset className="costing-fieldset">
            <legend>{workspaceMode === "logistics" ? "Existing commercial term and logistics scope" : "Starting and target responsibility"}</legend>
            <div className="field-grid term-grid">
              <label><span>Starting Incoterm</span><select value={sourceTerm} onChange={(event) => setSourceTerm(event.target.value as IncotermCode)}>{incotermCodes.map((term) => <option key={term} value={term}>{term} · {incotermProfiles[term].name}</option>)}</select></label>
              <label><span>Starting named place</span><input value={sourcePlace} onChange={(event) => setSourcePlace(event.target.value)} /></label>
              {workspaceMode === "logistics" ? (
                <label className="wide-field"><span>Logistics expense scope</span><select value={logisticsScope} onChange={(event) => setLogisticsScope(event.target.value as LogisticsScope | "")}><option value="">Select a standalone scope</option>{logisticsScopes.map((scope) => <option key={scope.id} value={scope.id}>{scope.label}</option>)}</select><small>The selected scope is costed separately; {sourceTerm} remains the commercial term.</small></label>
              ) : <>
                <label><span>Target Incoterm</span><select value={targetTerm} onChange={(event) => setTargetTerm(event.target.value as IncotermCode)}>{incotermCodes.map((term) => <option key={term} value={term}>{term} · {incotermProfiles[term].name}</option>)}</select></label>
                <label><span>Target named place</span><input value={targetPlace} onChange={(event) => setTargetPlace(event.target.value)} /></label>
              </>}
            </div>
            {workspaceMode !== "logistics" && <label className="check-field"><input checked={contractUnloadOverride} onChange={(event) => setContractUnloadOverride(event.target.checked)} type="checkbox" /><span><b>Contract deviation:</b> seller also pays destination unloading. This overrides the standard rule and remains visible in the audit.</span></label>}
            <label className="check-field boundary-check"><input checked={customBoundaryEnabled} onChange={(event) => setCustomBoundaryEnabled(event.target.checked)} type="checkbox" /><span><b>Contract-specific boundary:</b> preserve delivery, risk-transfer or cost-boundary wording that differs from the standard rule. Cost allocation remains controlled by the itemized services below.</span></label>
            {customBoundaryEnabled && <div className="field-grid boundary-override-fields">
              <label><span>Contract delivery point</span><input placeholder="Exact contractual delivery wording" value={customDeliveryPoint} onChange={(event) => setCustomDeliveryPoint(event.target.value)} /></label>
              <label><span>Contract risk-transfer point</span><input placeholder="May differ from cost boundary" value={customRiskTransferPoint} onChange={(event) => setCustomRiskTransferPoint(event.target.value)} /></label>
              <label><span>Contract cost boundary</span><input placeholder="Exact seller-paid boundary" value={customCostBoundary} onChange={(event) => setCustomCostBoundary(event.target.value)} /></label>
              <label><span>Clause / source reference</span><input placeholder="e.g. SCC 14.3 or user instruction" value={customBoundarySource} onChange={(event) => setCustomBoundarySource(event.target.value)} /></label>
            </div>}
          </fieldset>

          {(targetTerm === "CIP" || targetTerm === "CIF" || workspaceMode === "logistics") && (
            <fieldset className="costing-fieldset">
              <legend>Insurance basis</legend>
              <div className="field-grid insurance-grid">
                <label><span>Premium rate · %</span><input min="0" step="0.01" type="number" value={insuranceRatePercent} onChange={(event) => setInsuranceRatePercent(Number(event.target.value))} /></label>
                <label><span>Insured value · %</span><input min="100" step="1" type="number" value={coveragePercent} onChange={(event) => setCoveragePercent(Number(event.target.value))} /></label>
                <label><span>Explicit quoted premium</span><input min="0" step="0.01" type="number" value={costLines.find((line) => line.component === "insurance")?.amount ?? 0} onChange={(event) => updateCostLine("cost-insurance", { amount: Number(event.target.value), evidenceKind: "user-input" })} /><small>Zero uses the premium model; a positive sourced quotation overrides it.</small></label>
                <div className="read-only-field"><span>Coverage model</span><strong>{targetTerm === "CIF" ? "Clauses C default" : "Clauses A default"}</strong><small>Self-inclusive final contract value</small></div>
              </div>
            </fieldset>
          )}

          {workspaceMode !== "logistics" && targetTerm === "DDP" && (
            <fieldset className="costing-fieldset ddp-fieldset">
              <legend>DDP jurisdiction gate</legend>
              <p>DDP cannot be treated as a generic percentage. Confirm legal import capability, registration, and the actual tax basis.</p>
              <div className="field-grid">
                <label><span>Import jurisdiction</span><input placeholder="e.g. Uzbekistan" value={importJurisdiction} onChange={(event) => setImportJurisdiction(event.target.value)} /></label>
                <label><span>Seller-side importer of record</span><input placeholder="Legal entity / basis" value={importerOfRecord} onChange={(event) => setImporterOfRecord(event.target.value)} /></label>
                <label className="wide-field"><span>Tax registration / recovery basis</span><input placeholder="Registration and recoverability assumption" value={taxRegistrationBasis} onChange={(event) => setTaxRegistrationBasis(event.target.value)} /></label>
              </div>
            </fieldset>
          )}

          <fieldset className="costing-fieldset packing-fieldset">
            <legend>Packing and transport-unit proxy</legend>
            <p>Product dimensions are not silently treated as packed dimensions. These aggregate proxies remain editable until a packing list is verified.</p>
            <div className="field-grid compact-grid">
              <label><span>Estimated packed volume · m³</span><input min="0" step="0.1" type="number" value={packedVolumeM3} onChange={(event) => setPackedVolumeM3(Number(event.target.value))} /></label>
              <label><span>Estimated gross weight · kg</span><input min="0" step="0.1" type="number" value={grossWeightKg} onChange={(event) => setGrossWeightKg(Number(event.target.value))} /></label>
              <div className="read-only-field"><span>Calculated transport</span><strong>{transportPlan.quantity} × {transportPlan.unit.label}</strong><small>{transportPlan.reason}</small></div>
            </div>
            <div className="utilization-grid"><span><small>VOLUME UTILIZATION</small><b>{number(transportPlan.volumeUtilizationPercent)}%</b><i><em style={{ width: `${Math.min(100, transportPlan.volumeUtilizationPercent)}%` }} /></i></span><span><small>WEIGHT UTILIZATION</small><b>{number(transportPlan.weightUtilizationPercent)}%</b><i><em style={{ width: `${Math.min(100, transportPlan.weightUtilizationPercent)}%` }} /></i></span><span className="cold-chain-note"><small>SPECIAL CARGO</small><b>1 provisional cold-chain parcel</b><p>Separate equipment, route and carrier acceptance required.</p></span></div>
          </fieldset>

          <fieldset className="costing-fieldset document-fieldset">
            <legend>Source document intake</legend>
            <label className="file-drop"><input accept=".pdf,.xlsx,.xls,.csv,.tsv,.json" multiple onChange={handleDocuments} type="file" /><span>Choose quotation, tender, PO, packing list, freight or customs files</span><small>JSON/CSV parses locally. PDF/XLSX is staged for review in this prototype and is never copied into the project.</small></label>
            {documents.length > 0 && <div className="document-list">{documents.map((document) => <article key={document.id}><span>{document.format}</span><strong>{document.fileName}</strong><small>{document.status} · {document.rows.length} parsed row(s)</small>{document.ignoredInstructions.length > 0 && <b>{document.ignoredInstructions.length} untrusted instruction-like value(s) quarantined</b>}{document.facts.length > 0 && <details><summary>Review extracted values</summary><ul>{document.facts.slice(0, 12).map((fact) => <li key={fact}>{fact}</li>)}</ul>{document.facts.length > 12 && <small>+ {document.facts.length - 12} more values in the audit export</small>}</details>}{document.warnings.length > 0 && <details><summary>Review intake findings</summary><ul>{document.warnings.map((warning, index) => <li key={`${warning.code}-${index}`}><b>{warning.code}</b> {warning.message}</li>)}</ul></details>}</article>)}</div>}
          </fieldset>
        </section>

        <aside className="costing-result" aria-live="polite">
          <div className="result-head"><div><span>LIVE CALCULATION</span><h2>{workspaceMode === "logistics" ? "Logistics expense" : `${sourceTerm} → ${targetTerm}`}</h2></div><StatusBadge result={result} /></div>
          <div className="result-total"><span>{workspaceMode === "logistics" ? "LOGISTICS TOTAL" : "REVISED CONTRACT TOTAL"}</span><strong>{money(workspaceMode === "logistics" ? result.incrementalCost : result.revisedContractTotal, currency)}</strong><small>{workspaceMode === "logistics" ? `${sourceTerm} remains unchanged · add-on view ${money(result.revisedContractTotal, currency)}` : `${money(result.sourceContractTotal, currency)} source + ${money(result.incrementalCost, currency)} delta`}</small></div>
          <div className="result-metrics">
            <div><span>NON-INSURANCE</span><strong>{money(result.nonInsuranceAdded, currency)}</strong></div>
            <div><span>INSURANCE</span><strong>{money(result.insurance, currency)}</strong></div>
            <div><span>DUTIES / TAX</span><strong>{money(result.dutiesTaxes, currency)}</strong></div>
            <div><span>REMOVED COST</span><strong>{money(result.removedCosts, currency)}</strong></div>
            <div><span>UPLIFT</span><strong>{number(result.logisticsUpliftPercent, 2)}%</strong></div>
            <div><span>PACKED CUBE / WEIGHT</span><strong>{approximateNumber(productionEstimate.cargo.packedVolumeM3.value, "m³")} · {approximateNumber(productionEstimate.cargo.grossWeightKg.value, "kg")}</strong></div>
          </div>
          {isRegressionMatch && <div className="regression-pass"><span>✓</span><div><strong>Approved production fixture reproduced</strong><p>167 priced rows · USD 28,768.34 internal estimate · 2 trucks</p></div></div>}
          <div className="warning-list"><header><span>VALIDATION / OPEN ITEMS</span><b>{result.warnings.length}</b></header>{result.warnings.length ? result.warnings.map((warning, index) => <article className={`warning-${warning.severity}`} key={`${warning.code}-${index}`}><span>{warning.severity === "blocking" ? "!" : warning.severity === "warning" ? "△" : "i"}</span><p><strong>{warning.code.replaceAll("_", " ")}</strong>{warning.message}</p></article>) : <p className="no-warnings">No validation findings.</p>}</div>
          <div className="export-actions"><button onClick={exportAudit} type="button">Export audit JSON</button><button onClick={exportLines} type="button">Export line CSV</button></div>
          <p className="runtime-note">Engine {result.audit.engineVersion} · deterministic client calculation · approval is saved only after an explicit client action.</p>
        </aside>
      </div>

      <section className="costing-section responsibility-section" aria-labelledby="boundary-title">
        <div className="costing-section-heading"><div><span>RESPONSIBILITY MODEL</span><h2 id="boundary-title">Delivery, risk and cost are separate</h2></div><p>Standard rules are a baseline. Named places and documented contract modifications control the actual scenario.</p></div>
        <div className="responsibility-grid"><ResponsibilityCard title="STARTING BASIS" summary={result.startResponsibilities} />{result.targetResponsibilities ? <ResponsibilityCard title="TARGET BASIS" summary={result.targetResponsibilities} /> : <article className="responsibility-card scope-card"><header><span>LOGISTICS-ONLY SCOPE</span><strong>{logisticsScopes.find((scope) => scope.id === logisticsScope)?.label ?? "Not selected"}</strong><p>No target Incoterm is created.</p></header><p>The expense artifact remains separate from the {sourceTerm} commercial baseline. Selected service lines are calculated and allocated without rewriting contractual delivery or risk.</p></article>}</div>
      </section>

      <section className="costing-section cost-lines-section" aria-labelledby="cost-lines-title">
        <div className="costing-section-heading"><div><span>COST MODEL</span><h2 id="cost-lines-title">Itemized services and double-count control</h2></div><p>Rule defaults apply only when a line or contract override does not provide a stronger inclusion fact.</p></div>
        <div className="cost-line-toolbar" role="group" aria-label="Add logistics service line">
          <label><span>Component</span><select value={newLineComponent} onChange={(event) => setNewLineComponent(event.target.value as CostComponentCode)}>{costComponentCodes.map((component) => <option key={component} value={component}>{componentLabels[component]}</option>)}</select></label>
          <label className="toolbar-wide"><span>Description</span><input placeholder="Carrier quote, route leg or allowance" value={newLineLabel} onChange={(event) => setNewLineLabel(event.target.value)} /></label>
          <label><span>Amount</span><input min="0" step="0.01" type="number" value={newLineAmount} onChange={(event) => setNewLineAmount(Number(event.target.value))} /></label>
          <label><span>Currency</span><input maxLength={3} value={newLineCurrency} onChange={(event) => setNewLineCurrency(event.target.value.toUpperCase())} /></label>
          <label className="toolbar-wide"><span>Source reference</span><input placeholder="Quotation, clause, user input or dataset record" value={newLineSource} onChange={(event) => setNewLineSource(event.target.value)} /></label>
          <label><span>Rate date</span><input type="date" value={newLineRateDate} onChange={(event) => setNewLineRateDate(event.target.value)} /></label>
          <label className="toolbar-check"><input checked={newLineIncluded} onChange={(event) => setNewLineIncluded(event.target.checked)} type="checkbox" /><span>Force into target / custom scope</span></label>
          <button onClick={addCostLine} type="button">Add service line</button>
        </div>
        <div className="costing-table-wrap">
          <table className="cost-lines-table">
            <thead><tr><th>Component / service</th><th>Amount</th><th>Currency</th><th>Starting basis</th><th>Target / scope</th><th>Treatment</th><th>Evidence</th><th>Source / rate date</th><th>Confidence</th></tr></thead>
            <tbody>{result.treatments.filter((treatment) => treatment.lineId !== "computed-insurance").map((treatment) => {
              const sourceLine = costLines.find((line) => line.id === treatment.lineId)!;
              const inclusionEditable = specialEditableComponents.has(treatment.component) || (workspaceMode === "logistics" && logisticsScope === "custom");
              return <tr key={treatment.lineId}><th><span>{componentLabels[treatment.component]}</span><strong>{treatment.label}</strong>{treatment.note && <small>{treatment.note}</small>}</th><td><input aria-label={`${treatment.label} amount`} min="0" step="0.01" type="number" value={sourceLine.amount} onChange={(event) => updateCostLine(sourceLine.id, { amount: Number(event.target.value), evidenceKind: "user-input" })} /></td><td>{sourceLine.currency}</td><td><span className={treatment.startIncluded ? "included-yes" : "included-no"}>{treatment.startIncluded ? "Included" : "Not included"}</span></td><td>{inclusionEditable ? <button aria-pressed={Boolean(sourceLine.targetIncluded)} className="include-toggle" onClick={() => updateCostLine(sourceLine.id, { targetIncluded: !sourceLine.targetIncluded, evidenceKind: "user-input" })} type="button">{sourceLine.targetIncluded ? "Included" : "Excluded"}</button> : <span className={treatment.targetIncluded ? "included-yes" : "included-no"}>{treatment.targetIncluded ? "Included" : "Not included"}</span>}</td><td><span className={`treatment treatment-${treatment.treatment}`}>{treatment.treatment}</span></td><td><span className={`evidence-kind evidence-${treatment.evidenceKind}`}>{treatment.evidenceKind}</span></td><td className="source-cell">{treatment.sourceRef ?? "—"}{treatment.rateDate && <small>{treatment.rateDate}</small>}</td><td>{treatment.confidence}</td></tr>;
            })}
            {result.treatments.filter((line) => line.lineId === "computed-insurance").map((line) => <tr className="computed-row" key={line.lineId}><th><span>{componentLabels.insurance}</span><strong>{line.label}</strong><small>{line.note}</small></th><td>{money(line.amount, currency)}</td><td>{currency}</td><td><span className="included-no">Not included</span></td><td><span className="included-yes">Included</span></td><td><span className="treatment treatment-added">added</span></td><td><span className="evidence-kind evidence-calculation">calculation</span></td><td className="source-cell">Premium model</td><td>{line.confidence}</td></tr>)}</tbody>
            <tfoot><tr><th>Audited delta</th><td colSpan={5}>{money(result.addedCosts, currency)} added − {money(result.removedCosts, currency)} removed</td><td colSpan={3}>{money(result.incrementalCost, currency)}</td></tr></tfoot>
          </table>
        </div>
      </section>

      <section className="costing-section allocation-section" aria-labelledby="allocation-title">
        <div className="costing-section-heading"><div><span>ITEM-LEVEL OUTPUT</span><h2 id="allocation-title">Source-to-result allocation</h2></div><div className="reconcile-chip"><span>{allocatedLines.length} LINES</span><strong>{money(allocatedLines.reduce((sum, line) => sum + line.resultingPrice, 0), currency)}</strong></div></div>
        <div className="costing-table-wrap allocation-wrap">
          <table className="allocation-table">
            <thead><tr><th>Contract line</th><th>Source price</th><th>Included logistics</th><th>Additional logistics</th><th>Removed costs</th><th>Insurance</th><th>Duties / taxes</th><th>Resulting price</th><th>Currency</th><th>Allocation method</th><th>Assumptions</th></tr></thead>
            <tbody>{visibleAllocatedLines.map((line) => <tr key={line.id}><th><span>{line.id}</span><strong>{line.description}</strong></th><td>{money(line.sourcePrice, line.currency)}</td><td>{money(line.includedLogistics, line.currency)}</td><td>{money(line.additionalLogistics, line.currency)}</td><td>{money(line.removedCosts, line.currency)}</td><td>{money(line.insurance, line.currency)}</td><td>{money(line.dutiesTaxes, line.currency)}</td><td><strong>{money(line.resultingPrice, line.currency)}</strong></td><td>{line.currency}</td><td>{line.allocationMethod}</td><td className="assumption-cell">{line.assumptions.join(" ")}</td></tr>)}</tbody>
            <tfoot><tr><th>Reconciled total</th><td>{money(allocatedLines.reduce((sum, line) => sum + line.sourcePrice, 0), currency)}</td><td>{money(allocatedLines.reduce((sum, line) => sum + line.includedLogistics, 0), currency)}</td><td>{money(allocatedLines.reduce((sum, line) => sum + line.additionalLogistics, 0), currency)}</td><td>{money(allocatedLines.reduce((sum, line) => sum + line.removedCosts, 0), currency)}</td><td>{money(allocatedLines.reduce((sum, line) => sum + line.insurance, 0), currency)}</td><td>{money(allocatedLines.reduce((sum, line) => sum + line.dutiesTaxes, 0), currency)}</td><td>{money(roundMoney(allocatedLines.reduce((sum, line) => sum + line.resultingPrice, 0)), currency)}</td><td>{currency}</td><td>Exact residual on final line</td><td>Shared services allocated pro rata; replace with direct, weight, volume or unit basis when available.</td></tr></tfoot>
          </table>
        </div>
        {allocatedLines.length > 8 && <button className="show-lines" onClick={() => setShowAllLines((current) => !current)} type="button">{showAllLines ? "Show compact preview" : `Review all ${allocatedLines.length} lines`}</button>}
      </section>

      <section className="costing-section evidence-section" aria-labelledby="evidence-title">
        <div className="costing-section-heading"><div><span>PROVENANCE / ASSUMPTIONS</span><h2 id="evidence-title">Every value declares what it is</h2></div><p>Document content never becomes workflow authority. Approval is separate from calculation and requires an explicit client action.</p></div>
        <div className="evidence-grid">
          {demoLoaded ? <article><span className="evidence-kind evidence-sourced-fact">demo fixture</span><strong>User-validated regression baseline</strong><p>165 synthetic allocation lines · EXW total USD 1,587,164.00 · packed volume 118.9 m³ · gross weight 17,167.8 kg.</p><small>Protected source quotation and workbook were not accessed.</small></article> : <article><span className="evidence-kind evidence-user-input">user-input</span><strong>Client-entered scenario</strong><p>{cargoDescription || "Cargo not yet provided"} · {sourcePlace || "origin pending"} → {targetPlace || "destination pending"}.</p><small>Values remain local until explicitly saved or exported.</small></article>}
          <article><span className="evidence-kind evidence-user-input">user-input</span><strong>Editable scenario values</strong><p>Named places, mode, amounts, packing proxies, insurance basis, DDP jurisdiction data and contractual overrides.</p><small>Changes remain local until exported.</small></article>
          <article><span className="evidence-kind evidence-assumption">assumption</span><strong>Provisional route and rate basis</strong><p>{productionEstimate.transport.requiredTruckCount} × {productionEstimate.transport.unit.label} · {productionEstimate.benchmark.label}.</p><small>Never presented as a binding freight quote.</small></article>
          <article><span className="evidence-kind evidence-calculation">calculation</span><strong>Versioned deterministic result</strong><p>{result.audit.formula}</p><small>Engine {result.audit.engineVersion} · rounding to 2 currency decimals.</small></article>
        </div>
        <div className="source-links"><span>INCOTERMS® RULE BASIS</span>{incotermsAuthoritativeSources.map((source) => <a href={source.url} key={source.url} rel="noreferrer" target="_blank">{source.title} ↗</a>)}</div>
      </section>

      <footer className="costing-footer"><div><strong>TenderApps</strong><span>Landed Cost Studio · auditable planning workspace</span></div><p>Planning and review tool · not legal, tax, customs, insurance, or carrier advice</p></footer>
    </main>
  );
}

import { useMemo, useState, type ChangeEvent } from "react";
import {
  allocateResultToContractLines,
  calculateScenario,
  componentLabels,
  costComponentCodes,
  exwGuangzhouToCipTashkent,
  incotermCodes,
  incotermProfiles,
  incotermsAuthoritativeSources,
  logisticsCostingProcessDefinition,
  parseStructuredDocument,
  recommendTransportUnit,
  regressionCostLines,
  regressionQuotationLines,
  roundMoney,
  transportUnits,
  transportModes,
  type CalculationInput,
  type CalculationResult,
  type CostComponentCode,
  type CostLine,
  type DocumentIntakeRecord,
  type IncotermCode,
  type LogisticsScope,
  type TransportMode,
} from "../../../packages/logistics-costing/src";

type WorkspaceMode = "conversion" | "logistics" | "comparison";

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
  const [workspaceMode, setWorkspaceMode] = useState<WorkspaceMode>("conversion");
  const [sourceTotal, setSourceTotal] = useState(exwGuangzhouToCipTashkent.sourceContractTotal);
  const [currency, setCurrency] = useState(exwGuangzhouToCipTashkent.currency);
  const [fxRate, setFxRate] = useState(1);
  const [fxAsOf, setFxAsOf] = useState("2026-08-26");
  const [fxSource, setFxSource] = useState("User-entered planning rate");
  const [sourceTerm, setSourceTerm] = useState<IncotermCode>(exwGuangzhouToCipTashkent.sourceTerm);
  const [targetTerm, setTargetTerm] = useState<IncotermCode>(exwGuangzhouToCipTashkent.targetTerm!);
  const [sourcePlace, setSourcePlace] = useState(exwGuangzhouToCipTashkent.sourceNamedPlace);
  const [targetPlace, setTargetPlace] = useState(exwGuangzhouToCipTashkent.targetNamedPlace!);
  const [transportMode, setTransportMode] = useState<TransportMode>(exwGuangzhouToCipTashkent.transportMode);
  const [preferredUnitId, setPreferredUnitId] = useState("rail-40hc");
  const [logisticsScope, setLogisticsScope] = useState<LogisticsScope>("international-freight");
  const [costLines, setCostLines] = useState<CostLine[]>(() => regressionCostLines.map((line) => ({ ...line })));
  const [insuranceRatePercent, setInsuranceRatePercent] = useState(0.35);
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
  const [packedVolumeM3, setPackedVolumeM3] = useState(118.9);
  const [grossWeightKg, setGrossWeightKg] = useState(17_167.8);
  const [documents, setDocuments] = useState<DocumentIntakeRecord[]>([]);
  const [showAllLines, setShowAllLines] = useState(false);
  const [newLineComponent, setNewLineComponent] = useState<CostComponentCode>("main_freight");
  const [newLineLabel, setNewLineLabel] = useState("");
  const [newLineAmount, setNewLineAmount] = useState(0);
  const [newLineCurrency, setNewLineCurrency] = useState("USD");
  const [newLineSource, setNewLineSource] = useState("");
  const [newLineRateDate, setNewLineRateDate] = useState("");
  const [newLineIncluded, setNewLineIncluded] = useState(false);

  const calculationInput = useMemo<CalculationInput>(() => ({
    id: workspaceMode === "logistics" ? "workspace:logistics-only" : "workspace:incoterm-conversion",
    mode: workspaceMode === "logistics" ? "logistics-only" : "incoterm-conversion",
    sourceContractTotal: sourceTotal,
    currency,
    sourceTerm,
    sourceNamedPlace: sourcePlace,
    ...(workspaceMode === "logistics" ? { logisticsScope } : { targetTerm, targetNamedPlace: targetPlace }),
    customScopeComponents: workspaceMode === "logistics" && logisticsScope === "custom" ? costLines.filter((line) => line.targetIncluded).map((line) => line.component) : undefined,
    incotermsVersion: "2020",
    transportMode,
    costLines,
    exchangeRates: currency !== "USD" ? [{ from: "USD", to: currency, rate: fxRate, asOf: fxAsOf, source: fxSource || "Unspecified user input", confidence: "provisional" }] : [],
    contractOverrides: contractUnloadOverride ? [{ component: "destination_unloading", targetIncluded: true, description: "Contract requires seller-paid unloading irrespective of standard target rule.", sourceRef: "User-entered contract override" }] : [],
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
      premiumRate: insuranceRatePercent / 100,
      coverageFactor: coveragePercent / 100,
      basis: "final-contract-value",
      clauses: targetTerm === "CIF" ? "C" : "A",
      note: "Editable budgetary premium model; insurer quotation not attached.",
    },
    importJurisdiction: importJurisdiction || undefined,
    importerOfRecord: importerOfRecord || undefined,
    taxRegistrationBasis: taxRegistrationBasis || undefined,
    assumptions: [
      "The regression quotation total and counts are user-supplied facts; protected source files were not accessed or copied.",
      "Packing proxies and all route rates are editable planning assumptions.",
    ],
  }), [workspaceMode, sourceTotal, currency, fxRate, fxAsOf, fxSource, sourceTerm, sourcePlace, logisticsScope, targetTerm, targetPlace, transportMode, costLines, contractUnloadOverride, customBoundaryEnabled, customDeliveryPoint, customRiskTransferPoint, customCostBoundary, customBoundarySource, insuranceRatePercent, coveragePercent, importJurisdiction, importerOfRecord, taxRegistrationBasis]);

  const result = useMemo(() => calculateScenario(calculationInput), [calculationInput]);
  const compatibleTransportUnits = useMemo(() => transportUnits.filter((unit) => unit.mode === transportMode), [transportMode]);
  const selectedUnitId = compatibleTransportUnits.some((unit) => unit.id === preferredUnitId) ? preferredUnitId : compatibleTransportUnits[0]?.id;
  const transportPlan = useMemo(() => recommendTransportUnit(packedVolumeM3, grossWeightKg, transportMode, selectedUnitId, 0.92), [packedVolumeM3, grossWeightKg, transportMode, selectedUnitId]);
  const contractLines = useMemo(() => sourceTotal === 1_587_164 ? regressionQuotationLines : [{ id: "contract-total", description: "Subject contract total", quantity: 1, unit: "contract", sourcePrice: sourceTotal, currency }], [sourceTotal, currency]);
  const allocatedLines = useMemo(() => allocateResultToContractLines(contractLines, result), [contractLines, result]);

  const comparison = useMemo(() => {
    const variants: Array<{ label: string; term: IncotermCode; mode: TransportMode; route: string; unit: string; service: string; mainFreight?: number; finalDelivery?: number; unloading?: number; importCosts?: [number, number, number] }> = [
      { label: "Rail · CIP terminal", term: "CIP", mode: "rail", route: "Guangzhou → Tashkent rail terminal", unit: "2 × 40HC rail", service: "dedicated" },
      { label: "Rail · DAP door", term: "DAP", mode: "rail", route: "Guangzhou → Tashkent buyer site", unit: "2 × 40HC rail + truck", service: "dedicated", finalDelivery: 1_100 },
      { label: "Rail · DPU unloaded", term: "DPU", mode: "rail", route: "Guangzhou → Tashkent buyer site", unit: "2 × 40HC rail + truck", service: "dedicated", finalDelivery: 1_100, unloading: 450 },
      { label: "Rail · DDP budget", term: "DDP", mode: "rail", route: "Guangzhou → Tashkent buyer site", unit: "2 × 40HC rail + truck", service: "dedicated", finalDelivery: 1_100, importCosts: [1_300, 31_743.28, 190_459.68] },
      { label: "Air · CIP airport", term: "CIP", mode: "air", route: "Guangzhou CAN → Tashkent TAS", unit: "air-pallet positions", service: "consolidated", mainFreight: 68_400 },
      { label: "Sea · CIF port", term: "CIF", mode: "sea", route: "Nansha → named destination port", unit: "2 × 40HC sea", service: "dedicated", mainFreight: 10_500 },
    ];
    return variants.map((variant) => {
      const lines = costLines.map((line) => {
        if (line.component === "final_delivery" && variant.finalDelivery !== undefined) return { ...line, amount: variant.finalDelivery };
        if (line.component === "main_freight" && variant.mainFreight !== undefined) return { ...line, amount: variant.mainFreight };
        if (line.component === "destination_unloading" && variant.unloading !== undefined) return { ...line, amount: variant.unloading };
        if (variant.importCosts && line.component === "import_clearance") return { ...line, amount: variant.importCosts[0] };
        if (variant.importCosts && line.component === "duty") return { ...line, amount: variant.importCosts[1] };
        if (variant.importCosts && line.component === "vat_tax") return { ...line, amount: variant.importCosts[2] };
        return line;
      });
      const scenario = calculateScenario({
        ...calculationInput,
        id: `compare:${variant.term}`,
        mode: "incoterm-conversion",
        targetTerm: variant.term,
        targetNamedPlace: variant.route,
        transportMode: variant.mode,
        costLines: lines,
        insurance: calculationInput.insurance ? { ...calculationInput.insurance, clauses: variant.term === "CIF" ? "C" : "A" } : undefined,
        importJurisdiction: variant.term === "DDP" ? "Uzbekistan" : undefined,
        importerOfRecord: variant.term === "DDP" ? "Provisional seller-side importer" : undefined,
        taxRegistrationBasis: variant.term === "DDP" ? "Provisional registration assumption" : undefined,
      });
      return { ...variant, scenario };
    });
  }, [calculationInput, costLines]);

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
    setWorkspaceMode("conversion");
    setSourceTotal(1_587_164);
    setCurrency("USD");
    setFxRate(1);
    setFxAsOf("2026-08-26");
    setFxSource("User-entered planning rate");
    setSourceTerm("EXW");
    setTargetTerm("CIP");
    setSourcePlace("Supplier premises, Guangzhou, China");
    setTargetPlace("Rail terminal, Tashkent, Uzbekistan");
    setTransportMode("rail");
    setPreferredUnitId("rail-40hc");
    setCostLines(regressionCostLines.map((line) => ({ ...line })));
    setInsuranceRatePercent(0.35);
    setCoveragePercent(110);
    setPackedVolumeM3(118.9);
    setGrossWeightKg(17_167.8);
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

  async function handleDocuments(event: ChangeEvent<HTMLInputElement>) {
    const files = [...(event.target.files ?? [])];
    const records: DocumentIntakeRecord[] = [];
    for (const file of files) {
      const extension = file.name.toLowerCase().split(".").pop();
      const content = extension === "json" || extension === "csv" || extension === "tsv" ? await file.text() : undefined;
      records.push(parseStructuredDocument(file.name, content));
    }
    setDocuments(records);
  }

  function exportAudit() {
    downloadText("contract-logistics-audit.json", JSON.stringify({
      schema: "tenderapps.landed-cost.audit.v0.1",
      processDefinition: logisticsCostingProcessDefinition,
      input: calculationInput,
      result,
      packing: { packedVolumeM3, grossWeightKg, transportPlan, coldChainParcel: "provisional separate parcel" },
      sourceDocuments: documents,
      lineAllocation: allocatedLines,
    }, null, 2), "application/json");
  }

  function exportLines() {
    const headers = ["Contract line", "Source price", "Included logistics", "Additional logistics", "Removed costs", "Insurance", "Duties/taxes", "Resulting price", "Currency", "Allocation method", "Assumptions"];
    const rows = allocatedLines.map((line) => [line.description, line.sourcePrice, line.includedLogistics, line.additionalLogistics, line.removedCosts, line.insurance, line.dutiesTaxes, line.resultingPrice, line.currency, line.allocationMethod, line.assumptions.join("; ")]);
    downloadText("contract-logistics-line-allocation.csv", [headers, ...rows].map((row) => row.map(csvCell).join(",")).join("\r\n"), "text/csv;charset=utf-8");
  }

  const visibleAllocatedLines = showAllLines ? allocatedLines : allocatedLines.slice(0, 8);
  const isRegressionMatch = result.sourceTerm === "EXW" && result.targetTerm === "CIP" && result.sourceContractTotal === 1_587_164 && result.nonInsuranceAdded === 18_900 && result.insurance === 6_207.24;

  return (
    <main className="costing-page">

      <section className="costing-hero">
        <div>
          <p className="costing-eyebrow"><span /> LANDED COST STUDIO · PHASE 1</p>
          <h1>Contract Logistics<br /><em>& Incoterms Costing</em></h1>
          <p>Convert commercial terms, calculate logistics independently, and compare auditable contract-specific scenarios without conflating cost, risk, or delivery boundaries.</p>
        </div>
        <aside>
          <span>CLIENT WORKSPACE</span>
          <strong>Cost scenarios with an audit trail</strong>
          <p>Editable Incoterms logic, logistics scope, packing proxies, rate evidence, and explicit human approval boundaries.</p>
          <span className="architecture-owner-note">Phase 1 prototype · calculations remain local until exported</span>
        </aside>
      </section>

      <section className="costing-governance" aria-label="Architecture and runtime status">
        <div><span>RULE SET</span><strong>Incoterms® 2020</strong></div>
        <div><span>CALCULATION</span><strong>Deterministic · versioned</strong></div>
        <div><span>DATA STATE</span><strong>Local browser session</strong></div>
        <div><span>MATURITY</span><strong>Phase 1 · under validation</strong></div>
        <StatusBadge result={result} />
      </section>

      <section className="costing-mode-switch" role="group" aria-label="Calculation mode">
        <button aria-pressed={workspaceMode === "conversion"} onClick={() => setWorkspaceMode("conversion")} type="button"><span>01</span><b>Incoterms conversion</b><small>Add / remove only the changed responsibility costs</small></button>
        <button aria-pressed={workspaceMode === "logistics"} onClick={() => setWorkspaceMode("logistics")} type="button"><span>02</span><b>Logistics only</b><small>Cost a selected scope without changing the commercial term</small></button>
        <button aria-pressed={workspaceMode === "comparison"} onClick={() => setWorkspaceMode("comparison")} type="button"><span>03</span><b>Scenario comparison</b><small>Compare delivery rules, services, route assumptions and import basis</small></button>
      </section>

      {workspaceMode === "comparison" && (
        <section className="costing-section comparison-section" aria-labelledby="comparison-title">
          <div className="costing-section-heading"><div><span>SCENARIO MATRIX</span><h2 id="comparison-title">One source basis, alternative terms, routes and modes</h2></div><p>All values derive from the same editable lines below. Freight and DDP values are illustrative budget assumptions, not carrier or customs advice.</p></div>
          <div className="costing-table-wrap">
            <table className="comparison-table">
              <thead><tr><th>Scenario</th><th>Rule</th><th>Route / mode</th><th>Unit / service</th><th>Non-insurance logistics</th><th>Insurance</th><th>Import costs</th><th>Incremental</th><th>Resulting total</th><th>Uplift</th><th>Status</th></tr></thead>
              <tbody>{comparison.map((item) => <tr key={item.label}><th>{item.label}</th><td>{item.term}</td><td>{item.route}<small>{item.mode}</small></td><td>{item.unit}<small>{item.service}</small></td><td>{money(item.scenario.nonInsuranceAdded - item.scenario.dutiesTaxes, currency)}</td><td>{money(item.scenario.insurance, currency)}</td><td>{money(item.scenario.dutiesTaxes, currency)}</td><td>{money(item.scenario.incrementalCost, currency)}</td><td>{money(item.scenario.revisedContractTotal, currency)}</td><td>{number(item.scenario.logisticsUpliftPercent, 2)}%</td><td><StatusBadge result={item.scenario} /></td></tr>)}</tbody>
            </table>
          </div>
        </section>
      )}

      <div className="costing-workspace">
        <section className="costing-editor" aria-labelledby="scenario-input-title">
          <div className="panel-heading"><div><span>INPUT / REVIEW</span><h2 id="scenario-input-title">Scenario basis</h2></div><button type="button" onClick={resetRegression}>Reset regression</button></div>

          <fieldset className="costing-fieldset">
            <legend>Commercial baseline</legend>
            <div className="field-grid commercial-grid">
              <label><span>Source contract total</span><input min="0" step="0.01" type="number" value={sourceTotal} onChange={(event) => setSourceTotal(Number(event.target.value))} /></label>
              <label><span>Currency</span><input maxLength={3} value={currency} onChange={(event) => setCurrency(event.target.value.toUpperCase())} /></label>
              <label><span>Transport mode</span><select value={transportMode} onChange={(event) => { const mode = event.target.value as TransportMode; setTransportMode(mode); setPreferredUnitId(transportUnits.find((unit) => unit.mode === mode)?.id ?? "multimodal-40hc"); }}>{transportModes.map((mode) => <option key={mode} value={mode}>{mode}</option>)}</select></label>
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
                <label className="wide-field"><span>Logistics expense scope</span><select value={logisticsScope} onChange={(event) => setLogisticsScope(event.target.value as LogisticsScope)}>{logisticsScopes.map((scope) => <option key={scope.id} value={scope.id}>{scope.label}</option>)}</select><small>The selected scope is costed separately; {sourceTerm} remains the commercial term.</small></label>
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
              <div className="read-only-field"><span>Recommended unit</span><strong>{transportPlan.quantity} × {transportPlan.unit.label}</strong><small>{transportPlan.reason}</small></div>
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
            <div><span>PACKED CUBE / WEIGHT</span><strong>{number(packedVolumeM3)} m³ · {number(grossWeightKg)} kg</strong></div>
          </div>
          {isRegressionMatch && <div className="regression-pass"><span>✓</span><div><strong>Initial regression reproduced</strong><p>165 lines · USD 25,107.24 addition · 1.58% uplift</p></div></div>}
          <div className="warning-list"><header><span>VALIDATION / OPEN ITEMS</span><b>{result.warnings.length}</b></header>{result.warnings.length ? result.warnings.map((warning, index) => <article className={`warning-${warning.severity}`} key={`${warning.code}-${index}`}><span>{warning.severity === "blocking" ? "!" : warning.severity === "warning" ? "△" : "i"}</span><p><strong>{warning.code.replaceAll("_", " ")}</strong>{warning.message}</p></article>) : <p className="no-warnings">No validation findings.</p>}</div>
          <div className="export-actions"><button onClick={exportAudit} type="button">Export audit JSON</button><button onClick={exportLines} type="button">Export line CSV</button></div>
          <p className="runtime-note">Engine {result.audit.engineVersion} · deterministic client calculation · no persisted runtime or approval claim.</p>
        </aside>
      </div>

      <section className="costing-section responsibility-section" aria-labelledby="boundary-title">
        <div className="costing-section-heading"><div><span>RESPONSIBILITY MODEL</span><h2 id="boundary-title">Delivery, risk and cost are separate</h2></div><p>Standard rules are a baseline. Named places and documented contract modifications control the actual scenario.</p></div>
        <div className="responsibility-grid"><ResponsibilityCard title="STARTING BASIS" summary={result.startResponsibilities} />{result.targetResponsibilities ? <ResponsibilityCard title="TARGET BASIS" summary={result.targetResponsibilities} /> : <article className="responsibility-card scope-card"><header><span>LOGISTICS-ONLY SCOPE</span><strong>{logisticsScopes.find((scope) => scope.id === logisticsScope)?.label}</strong><p>No target Incoterm is created.</p></header><p>The expense artifact remains separate from the {sourceTerm} commercial baseline. Selected service lines are calculated and allocated without rewriting contractual delivery or risk.</p></article>}</div>
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
        <div className="costing-section-heading"><div><span>PROVENANCE / ASSUMPTIONS</span><h2 id="evidence-title">Every value declares what it is</h2></div><p>Document content never becomes workflow authority. Human approval remains external to this prototype.</p></div>
        <div className="evidence-grid">
          <article><span className="evidence-kind evidence-sourced-fact">sourced-fact</span><strong>User-validated regression baseline</strong><p>165 lines · EXW total USD 1,587,164.00 · packed volume 118.9 m³ · gross weight 17,167.8 kg.</p><small>Protected source quotation and workbook were not accessed.</small></article>
          <article><span className="evidence-kind evidence-user-input">user-input</span><strong>Editable scenario values</strong><p>Named places, mode, amounts, packing proxies, insurance basis, DDP jurisdiction data and contractual overrides.</p><small>Changes remain local until exported.</small></article>
          <article><span className="evidence-kind evidence-assumption">assumption</span><strong>Provisional route and rate basis</strong><p>2 × 40HC rail units plus a separate cold-chain parcel. Carrier, loading, temperature and rate validity need confirmation.</p><small>Never presented as a binding freight quote.</small></article>
          <article><span className="evidence-kind evidence-calculation">calculation</span><strong>Versioned deterministic result</strong><p>{result.audit.formula}</p><small>Engine {result.audit.engineVersion} · rounding to 2 currency decimals.</small></article>
        </div>
        <div className="source-links"><span>INCOTERMS® RULE BASIS</span>{incotermsAuthoritativeSources.map((source) => <a href={source.url} key={source.url} rel="noreferrer" target="_blank">{source.title} ↗</a>)}</div>
      </section>

      <footer className="costing-footer"><div><strong>TenderApps</strong><span>Landed Cost Studio · auditable planning workspace</span></div><p>Planning and review tool · not legal, tax, customs, insurance, or carrier advice</p></footer>
    </main>
  );
}

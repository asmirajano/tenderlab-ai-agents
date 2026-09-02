import { useEffect, useMemo, useState } from "react";
import type { BalanceSheetReview } from "../../../packages/tender-balance/src/model.ts";
import type { CanonicalFinancialDataset } from "../../../packages/tender-balance/src/fin-forms.ts";
import type { FinPresentationCurrency } from "../../../packages/tender-balance/src/fin1-fx.ts";
import {
  fin2ReportedUnitName,
  fin2ToCsv,
  generateFin2,
  type Fin2AdministrativeInput,
  type Fin2Form,
  type Fin2TurnoverMapping,
} from "../../../packages/tender-balance/src/fin2.ts";
import { fin2ExcelFileName, fin2ToExcel } from "../../../packages/tender-balance/src/excel.ts";
import { formatWholeFinancialFigure } from "../../../packages/tender-balance/src/financial-rounding.ts";
import { FinCurrencySwitcher, formatFigure } from "./fin-form-shared.tsx";

type Fin2View = "mapping" | "form";

type StoredFin2CaseInput = {
  administrative: Fin2AdministrativeInput;
  requiredYearCount: number | null;
};

type Fin2WorkspaceProps = {
  review: BalanceSheetReview;
  dataset: CanonicalFinancialDataset;
  demoMode: boolean;
  comparisonCurrency: FinPresentationCurrency;
  onComparisonCurrencyChange: (currency: FinPresentationCurrency) => void;
  onBackToCatalog: () => void;
  onBackToBalance: () => void;
  onStartNewReview: () => void;
};

function readStoredCaseInput(key: string): StoredFin2CaseInput {
  if (typeof window === "undefined") return { administrative: {}, requiredYearCount: null };
  try {
    const parsed = JSON.parse(window.localStorage.getItem(key) ?? "null") as Partial<StoredFin2CaseInput> | null;
    return {
      administrative: parsed?.administrative ?? {},
      requiredYearCount: Number.isInteger(parsed?.requiredYearCount) && Number(parsed?.requiredYearCount) > 0 ? Number(parsed?.requiredYearCount) : null,
    };
  } catch {
    return { administrative: {}, requiredYearCount: null };
  }
}

function downloadCsv(review: BalanceSheetReview, form: Fin2Form) {
  const url = URL.createObjectURL(new Blob([fin2ToCsv(form)], { type: "text/csv;charset=utf-8" }));
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `${review.source.documentId.replaceAll(":", "-")}-FIN-2-${form.comparisonCurrency}.csv`;
  anchor.click();
  URL.revokeObjectURL(url);
}

function downloadExcel(review: BalanceSheetReview, form: Fin2Form) {
  const bytes = fin2ToExcel(form);
  const url = URL.createObjectURL(new Blob([bytes.buffer as ArrayBuffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }));
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = fin2ExcelFileName(review, form.comparisonCurrency);
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 0);
}

function statusLabel(mapping: Fin2TurnoverMapping) {
  if (mapping.status === "ready") return "Ready";
  if (mapping.status === "missing") return "Missing source data";
  if (mapping.status === "mapping-review-required") return "Mapping review required";
  if (mapping.status === "fx-rate-missing") return "Exchange rate required";
  return "Extraction review required";
}

function formatFullAmount(value: number | null, currency: string) {
  return value === null ? "MISSING" : `${formatWholeFinancialFigure(value)} ${currency}`;
}

function sourceReportedAmount(mapping: Fin2TurnoverMapping) {
  if (mapping.sourceReportedValue === null) return "MISSING";
  return `${formatFigure(mapping.sourceValue, mapping.sourceUnitScale)} ${fin2ReportedUnitName(mapping.sourceUnitLabel, mapping.sourceUnitScale, mapping.sourceCurrency)}`;
}

function fxMultiplier(mapping: Fin2TurnoverMapping) {
  const rate = mapping.exchangeRate?.targetUnitsPerSourceUnit;
  if (rate === undefined) return "MISSING";
  return `× ${rate.toLocaleString("en-US", { maximumSignificantDigits: 12 })} ${mapping.comparisonCurrency}/${mapping.sourceCurrency}`;
}

function fxExplanation(mapping: Fin2TurnoverMapping) {
  if (!mapping.exchangeRate || mapping.sourceUnitsPerComparisonUnit === null) return "Authorized year-end rate required";
  if (mapping.sourceCurrency === mapping.comparisonCurrency) return `1 ${mapping.sourceCurrency} = 1 ${mapping.comparisonCurrency} · identity`;
  return `1 ${mapping.comparisonCurrency} = ${mapping.sourceUnitsPerComparisonUnit.toLocaleString("en-US", { maximumFractionDigits: 6 })} ${mapping.sourceCurrency} · ${mapping.exchangeRate.closingDate ?? "year-end"}`;
}

function Fin2Header({ view, canGenerate, onChange, onBackToCatalog }: {
  view: Fin2View;
  canGenerate: boolean;
  onChange: (view: Fin2View) => void;
  onBackToCatalog: () => void;
}) {
  return (
    <nav aria-label="FIN-2 workspace views" className="fin-view-switcher">
      <button onClick={onBackToCatalog} type="button">Forms</button>
      <button aria-current={view === "mapping" ? "page" : undefined} onClick={() => onChange("mapping")} type="button">Source &amp; Mapping</button>
      <button aria-current={view === "form" ? "page" : undefined} disabled={!canGenerate} onClick={() => onChange("form")} title={!canGenerate ? "Resolve turnover mapping and exchange-rate blockers before opening FIN-2." : undefined} type="button">FIN-2 Form</button>
    </nav>
  );
}

function Fin2AdministrativePanel({ form, value, requiredYearCount, onChange, onRequiredYearCountChange }: {
  form: Fin2Form;
  value: Fin2AdministrativeInput;
  requiredYearCount: number | null;
  onChange: (value: Fin2AdministrativeInput) => void;
  onRequiredYearCountChange: (value: number | null) => void;
}) {
  const field = (key: keyof Fin2AdministrativeInput, label: string, placeholder: string) => (
    <label>
      <span>{label}</span>
      <input onChange={(event) => onChange({ ...value, [key]: event.target.value })} placeholder={placeholder} type="text" value={value[key] ?? ""} />
      <small>Case-scoped user input · never taken from the template example</small>
    </label>
  );
  return (
    <section className="fin2-admin-panel">
      <header><div><span>TENDER DETAILS</span><h2>Complete the administrative fields.</h2><p>Financial evidence supplies turnover; these tender identifiers are explicit user inputs.</p></div><b>{form.readiness.missingAdministrativeFields.length ? `${form.readiness.missingAdministrativeFields.length} optional gap${form.readiness.missingAdministrativeFields.length === 1 ? "" : "s"}` : "Complete ✓"}</b></header>
      <div className="fin2-admin-grid">
        {field("biddingProcess", "Bidding process", "Procurement title")}
        {field("invitationNumber", "Invitation number", "IFI / tender reference")}
        {field("purchaser", "Purchaser", "Purchaser or executing agency")}
        <label>
          <span>Required historical years</span>
          <input min="1" onChange={(event) => onRequiredYearCountChange(event.target.value ? Math.max(1, Number(event.target.value)) : null)} placeholder="Not specified" type="number" value={requiredYearCount ?? ""} />
          <small>Leave blank until the specific tender requirement is known</small>
        </label>
      </div>
    </section>
  );
}

export function Fin2Workspace({
  review,
  dataset,
  demoMode,
  comparisonCurrency,
  onComparisonCurrencyChange,
  onBackToCatalog,
  onBackToBalance,
  onStartNewReview,
}: Fin2WorkspaceProps) {
  const [view, setView] = useState<Fin2View>("mapping");
  const storageKey = `tenderapps:fin2-case-input:${review.reviewId}`;
  const [caseInput, setCaseInput] = useState<StoredFin2CaseInput>(() => readStoredCaseInput(storageKey));
  useEffect(() => {
    window.localStorage.setItem(storageKey, JSON.stringify(caseInput));
  }, [caseInput, storageKey]);
  const form = useMemo(() => generateFin2(dataset, {
    comparisonCurrency,
    requiredYearCount: caseInput.requiredYearCount,
    administrative: caseInput.administrative,
  }), [caseInput, comparisonCurrency, dataset]);
  const unresolvedMappings = form.mappings.filter((mapping) => mapping.status !== "ready");

  if (view === "mapping") {
    return (
      <>
        {(demoMode || review.source.synthetic) && <div className="bs-synthetic-banner fin-synthetic-banner"><b>SYNTHETIC FIXTURE</b><span>FIN-2 is generated from test evidence, not client data.</span></div>}
        <section className="fin-workspace-heading">
          <div><p className="bs-eyebrow"><span /> FIN–2 · REVIEW MAPPING</p><h1>Verify turnover<br /><em>before averaging.</em></h1><p>{form.readiness.message}</p></div>
          <Fin2Header view={view} canGenerate={form.readiness.canGenerate} onChange={setView} onBackToCatalog={onBackToCatalog} />
        </section>

        <section className={`fin-readiness-panel is-${form.readiness.status}`} aria-live="polite">
          <div><span>{form.readiness.status.toUpperCase()}</span><h2>{form.years.length ? `${form.years.join(" · ")} are the legitimate source-driven periods.` : "Turnover evidence is required."}</h2><p>No template year is copied and no missing historical period is manufactured.</p></div>
          <dl><div><dt>Ready turnover years</dt><dd>{form.readiness.readyYears}</dd></div><div><dt>Source-data gaps</dt><dd>{form.readiness.missingYears}</dd></div><div><dt>Review blockers</dt><dd>{form.readiness.problemYears}</dd></div><div><dt>Can generate</dt><dd>{form.readiness.canGenerate ? `Yes · ${comparisonCurrency}` : "No"}</dd></div></dl>
        </section>

        <section className="fin-fx-policy is-ready">
          <div><span>FIN-2 COMPARISON CURRENCY</span><h2>{form.sourceCurrency} turnover → {comparisonCurrency} equivalent</h2><p>Each conversion preserves the source-reported amount and unit, applies the source unit scale once, then applies the saved year-end FX rate.</p></div>
          <FinCurrencySwitcher value={comparisonCurrency} onChange={onComparisonCurrencyChange} />
          <dl><div><dt>Provider</dt><dd>{form.fxDataset.provider}</dd></div><div><dt>Basis</dt><dd>Year-end closing</dd></div><div><dt>Dataset</dt><dd>{form.fxDataset.datasetId}</dd></div><div><dt>Coverage</dt><dd>{form.coverage.message}</dd></div></dl>
        </section>

        <Fin2AdministrativePanel
          form={form}
          value={caseInput.administrative}
          requiredYearCount={caseInput.requiredYearCount}
          onChange={(administrative) => setCaseInput((current) => ({ ...current, administrative }))}
          onRequiredYearCountChange={(requiredYearCount) => setCaseInput((current) => ({ ...current, requiredYearCount }))}
        />

        <div className="fin-mapping-table-wrap">
          <table className="fin-mapping-table fin2-mapping-table">
            <caption>Source-reported turnover → full source-currency units → FX → full {comparisonCurrency} equivalent</caption>
            <thead><tr><th>FIN-2 field</th><th>Year</th><th>Original turnover ({form.sourceCurrency} · {form.sourceUnitLabel})</th><th>Unit scale</th><th>FX rate</th><th>Full {comparisonCurrency} equivalent</th><th>Source</th><th>Status</th></tr></thead>
            <tbody>{form.mappings.map((mapping) => <tr className={`is-${mapping.status}`} key={mapping.id}>
              <td><b>Annual Turnover</b>{mapping.originalLabels.length > 0 && <small>Reported as: {mapping.originalLabels.join(" / ")}</small>}</td>
              <td><strong>{mapping.displayYear}</strong>{mapping.originalPeriods.length > 0 && <small>Source: {mapping.originalPeriods.join(" / ")}</small>}</td>
              <td className="fin2-source-amount"><b>{sourceReportedAmount(mapping)}</b><small>{mapping.sourceProvenance} · source reported</small></td>
              <td className="fin2-scale-step"><b>× {mapping.sourceUnitScale.toLocaleString("en-US")}</b><small>= {formatFullAmount(mapping.sourceValue, mapping.sourceCurrency)}</small></td>
              <td className="fin2-fx-step"><b>{fxMultiplier(mapping)}</b><small>{fxExplanation(mapping)}</small></td>
              <td className="fin2-target-amount"><b>{formatFullAmount(mapping.convertedValue, comparisonCurrency)}</b><small>{mapping.convertedProvenance} · full units</small></td>
              <td><span>{mapping.sourceSummary}</span></td>
              <td><span className="fin-mapping-status">{statusLabel(mapping)}</span>{mapping.action && <small>{mapping.action}</small>}</td>
            </tr>)}</tbody>
          </table>
        </div>

        <section className="fin2-average-audit">
          <div><span>CALCULATED RESULT · FULL {comparisonCurrency} UNITS</span><h2>Average Annual Turnover</h2><p>{form.averageAnnualTurnover.formula}</p></div>
          <dl><div><dt>Years included</dt><dd>{form.averageAnnualTurnover.yearsIncluded.join(" · ") || "NONE"}</dd></div><div><dt>Average</dt><dd>{form.averageAnnualTurnover.value === null ? "MISSING" : `${formatWholeFinancialFigure(form.averageAnnualTurnover.value)} ${comparisonCurrency}`}</dd></div><div><dt>Provenance</dt><dd>{form.averageAnnualTurnover.provenance}</dd></div></dl>
        </section>

        <section className="fin-review-actions"><div><span>NEXT STEP</span><h3>{form.readiness.canGenerate ? `Generate the ${comparisonCurrency} FIN-2.` : "Resolve the turnover evidence blockers."}</h3><p>{form.readiness.canGenerate ? "The generated form will remain linked to the original turnover, year-end rate, conversion formula, and average calculation." : form.readiness.message}</p></div><div>{form.readiness.canGenerate ? <button className="bs-primary-action" onClick={() => setView("form")} type="button">Generate {comparisonCurrency} FIN-2 <span aria-hidden="true">→</span></button> : <button className="bs-primary-action" onClick={onStartNewReview} type="button">Add or re-digitize source <span aria-hidden="true">→</span></button>}<button className="bs-secondary-action" onClick={onBackToCatalog} type="button">Back to forms</button></div></section>
        <footer className="bs-footer"><span>Tender Apps · TenderBalance · FIN-2 Mapping</span><span>Single bidder · no JV logic</span></footer>
      </>
    );
  }

  return (
    <>
      <section className="fin-workspace-heading fin-generated-heading">
        <div><p className="bs-eyebrow"><span /> FORM GENERATED · SOURCE + SCALE + FX CALCULATED</p><h1>FIN-2 is ready<br /><em>in {comparisonCurrency}.</em></h1><p>The original turnover remains in {form.sourceCurrency} · {form.sourceUnitLabel}; every full-unit equivalent and the average retain an auditable scale and FX path.</p></div>
        <Fin2Header view={view} canGenerate={form.readiness.canGenerate} onChange={setView} onBackToCatalog={onBackToCatalog} />
      </section>

      <section className="fin-generated-meta"><div><span>Bidder</span><b>{form.bidder.value}</b></div><div><span>Source currency / reported unit</span><b>{form.sourceCurrency} · {form.sourceUnitLabel} · ×{form.sourceUnitScale.toLocaleString("en-US")}</b></div><div><span>Historical periods</span><b>{form.years.join(" · ")}</b></div><div><span>Target currency / unit</span><b>{comparisonCurrency} · full units</b></div></section>

      <section className="fin-generated-form fin2-generated-form" aria-label="Generated FIN-2 Size of Operation">
        <header><div><span>FORM FIN–2</span><h2>Size of Operation (Average Annual Turnover)</h2><p>{form.bidder.value}</p></div><b>{form.readiness.status === "ready" ? "READY" : "GENERATED WITH DECLARED GAPS"}</b></header>
        <div className="fin2-form-admin">
          <p><span>Bidding process</span><b>{form.biddingProcess.value ?? "MISSING"}</b></p>
          <p><span>Invitation number</span><b>{form.invitationNumber.value ?? "MISSING"}</b></p>
          <p><span>Purchaser</span><b>{form.purchaser.value ?? "MISSING"}</b></p>
        </div>
        <div className="fin-form-table-wrap"><table><caption>Every target amount is calculated from the displayed source-reported amount, its unit scale, and the applicable FX rate.</caption><thead><tr><th>Year</th><th>Source reported amount ({form.sourceCurrency} · {form.sourceUnitLabel})</th><th>To full source units</th><th>FX rate</th><th>Full {comparisonCurrency} equivalent</th></tr></thead><tbody>{form.mappings.map((mapping) => <tr key={mapping.id}><td><b>{mapping.displayYear}</b></td><td className={mapping.sourceValue === null ? "is-missing" : ""}><b>{sourceReportedAmount(mapping)}</b><small>source reported</small></td><td className={mapping.sourceValue === null ? "is-missing" : ""}><b>× {mapping.sourceUnitScale.toLocaleString("en-US")}</b><small>= {formatFullAmount(mapping.sourceValue, mapping.sourceCurrency)}</small></td><td className={mapping.sourceUnitsPerComparisonUnit === null ? "is-missing" : ""}><b>{fxMultiplier(mapping)}</b><small>{fxExplanation(mapping)}</small></td><td className={mapping.convertedValue === null ? "is-missing" : ""}><b>{formatFullAmount(mapping.convertedValue, comparisonCurrency)}</b><small>full target-currency units</small></td></tr>)}</tbody></table></div>
        <div className="fin2-average-result"><span>Average Annual Turnover</span><strong>{form.averageAnnualTurnover.value === null ? "MISSING" : `${formatWholeFinancialFigure(form.averageAnnualTurnover.value)} ${comparisonCurrency}`}</strong><small>{form.averageAnnualTurnover.yearsIncluded.join(" · ")} · CALCULATED from full {comparisonCurrency} units after source scaling and FX · rounded to the nearest whole unit</small></div>
        <footer><p>Source-driven years only. Template examples and JV/Consortium fields are excluded from this single-bidder form.</p><span>{form.coverage.message}</span></footer>
      </section>

      {unresolvedMappings.length > 0 && <section className="fin-generated-notice"><span>!</span><div><b>{unresolvedMappings.length} turnover gap{unresolvedMappings.length === 1 ? "" : "s"} remain.</b><p>The average includes only legitimate converted turnover values. No missing value was estimated.</p></div></section>}

      <details className="fin-audit-disclosure fin2-calculation-disclosure"><summary>Inspect conversion and average calculations</summary><div className="fin2-calculation-list">{form.mappings.filter((mapping) => mapping.conversionFormula).map((mapping) => <p key={mapping.id}><b>{mapping.displayYear}</b><span>{mapping.conversionFormula}</span></p>)}<p><b>Average</b><span>{form.averageAnnualTurnover.formula}</span></p></div></details>

      <section className="fin-generated-actions"><div><span>FORM OPTIONS</span><h3>FIN-2 remains linked to its source and FX audits.</h3><p>Export the clean form with original labels, pages, values, exchange-rate evidence, formulas, gaps, and the calculated average.</p></div><div><button className="bs-primary-action" onClick={() => downloadExcel(review, form)} type="button">Export {comparisonCurrency} FIN-2 Excel <span aria-hidden="true">↓</span></button><button className="bs-secondary-action" onClick={() => downloadCsv(review, form)} type="button">Export CSV</button><button className="bs-secondary-action" onClick={() => setView("mapping")} type="button">Source &amp; Mapping</button><button className="bs-secondary-action" onClick={onBackToBalance} type="button">Back to balance result</button></div></section>
      <footer className="bs-footer"><span>Tender Apps · TenderBalance · Generated FIN-2</span><span>{demoMode ? "Demo workspace · not client evidence" : "Generated for this explicit Case"}</span></footer>
    </>
  );
}

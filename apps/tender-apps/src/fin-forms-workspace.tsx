import { useEffect, useMemo, useState } from "react";
import {
  FIN1_FIELDS,
  fin1ToCsv,
  prepareFin1FromBalanceReview,
  type Fin1Form,
  type Fin1Mapping,
} from "../../../packages/tender-balance/src/fin-forms.ts";
import {
  cbuFinFxMetadata,
  prepareFin1Presentation,
  type Fin1PresentationCurrency,
  type Fin1PresentationResult,
  type PresentedFin1Form,
} from "../../../packages/tender-balance/src/fin1-fx.ts";
import { fin1ExcelFileName, fin1ToExcel } from "../../../packages/tender-balance/src/excel.ts";
import type { BalanceSheetReview } from "../../../packages/tender-balance/src/model.ts";
import { FinCurrencySwitcher, formatFigure } from "./fin-form-shared.tsx";
import { generateFin2 } from "../../../packages/tender-balance/src/fin2.ts";
import { Fin2Workspace } from "./fin2-workspace.tsx";
import "./fin-forms.css";

type FinView = "catalog" | "mapping" | "form";
type FinFormId = "FIN-1" | "FIN-2";

type FinFormsWorkspaceProps = {
  review: BalanceSheetReview;
  demoMode: boolean;
  onBackToBalance: () => void;
  onStartNewReview: () => void;
};

function mappingLabel(mapping: Fin1Mapping) {
  if (mapping.status === "missing") return "Missing source data";
  if (mapping.status === "source-inconsistency") return "Check source difference";
  if (mapping.status === "extraction-problem") return "Review extraction";
  if (mapping.status === "mapping-problem") return "Review mapping";
  return "Ready";
}

function statusLabel(form: Fin1Form) {
  if (form.readiness.status === "ready") return "Ready";
  if (form.readiness.status === "partial") return "Partially ready";
  return "Period review needed";
}

function downloadCsv(review: BalanceSheetReview, form: PresentedFin1Form) {
  const url = URL.createObjectURL(new Blob([fin1ToCsv(form)], { type: "text/csv;charset=utf-8" }));
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `${review.source.documentId.replaceAll(":", "-")}-FIN-1-${form.currency}.csv`;
  anchor.click();
  URL.revokeObjectURL(url);
}

function downloadExcel(review: BalanceSheetReview, form: PresentedFin1Form) {
  const bytes = fin1ToExcel(form);
  const url = URL.createObjectURL(new Blob([bytes.buffer as ArrayBuffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }));
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = fin1ExcelFileName(review, form.currency);
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 0);
}

function FxPolicyPanel({ sourceCurrency, targetCurrency, presentation, onChange }: {
  sourceCurrency: string;
  targetCurrency: Fin1PresentationCurrency;
  presentation: Fin1PresentationResult;
  onChange: (currency: Fin1PresentationCurrency) => void;
}) {
  const metadata = cbuFinFxMetadata();
  return (
    <section className={`fin-fx-policy is-${presentation.status}`} aria-live="polite">
      <div>
        <span>FIN PRESENTATION CURRENCY</span>
        <h2>{sourceCurrency} source evidence → {targetCurrency} FIN-1</h2>
        <p>The digitized balance sheet remains unchanged. Balance fields use the saved year-end closing rate; income fields use the saved annual average rate.</p>
      </div>
      <FinCurrencySwitcher value={targetCurrency} onChange={onChange} />
      <dl>
        <div><dt>Provider</dt><dd>{metadata.provider}</dd></div>
        <div><dt>Archive</dt><dd>2015–2025</dd></div>
        <div><dt>Dataset</dt><dd>{metadata.datasetId}</dd></div>
        <div><dt>Conversion</dt><dd>{presentation.status === "ready" ? "Ready ✓" : "Rate review required"}</dd></div>
      </dl>
      {presentation.issues.length > 0 && <div className="fin-fx-issues"><b>Conversion cannot proceed yet.</b>{presentation.issues.map((issue) => <p key={issue.id}>{issue.message} <strong>Next: {issue.action}.</strong></p>)}</div>}
    </section>
  );
}

function FormHeader({ view, onChange, canGenerate }: { view: FinView; onChange: (view: FinView) => void; canGenerate: boolean }) {
  return (
    <nav aria-label="FIN-1 workspace views" className="fin-view-switcher">
      <button aria-current={view === "mapping" ? "page" : undefined} onClick={() => onChange("mapping")} type="button">Source &amp; Mapping</button>
      <button aria-current={view === "form" ? "page" : undefined} disabled={!canGenerate} onClick={() => onChange("form")} title={!canGenerate ? "Resolve the extraction and mapping blockers before opening FIN-1." : undefined} type="button">FIN-1 Form</button>
    </nav>
  );
}

function SourceRoleGate({ review, finReady }: { review: BalanceSheetReview; finReady: boolean }) {
  return (
    <section className="fin-source-gate" aria-label="Financial source role gate">
      <header><div><span>SOURCE-ROLE GATE</span><h2>Financial facts and form structure stay separate.</h2></div><b>ENFORCED</b></header>
      <div className="fin-role-record">
        <div><span>DOCUMENT</span><strong>{review.source.fileName}</strong><small>{review.source.documentId}</small></div>
        <div><span>ASSIGNED ROLE</span><strong>Financial source</strong><small>Eligible for canonical financial data</small></div>
        <div className={finReady ? "is-eligible" : "is-blocked"}><span>FIN FORMS READINESS</span><strong>{finReady ? "Mapped evidence ready ✓" : "Extraction review required"}</strong><small>{finReady ? "Every mapped value retains its source trace" : "The file is an allowed source, but no reliable financial year can be mapped from this saved extraction."}</small></div>
      </div>
      <p><b>Permanent rule:</b> a document classified as <code>TEMPLATE</code> can define FIN form structure and requirements, but its populated example names, years, and figures are technically blocked from client financial data.</p>
    </section>
  );
}

export function FinFormsWorkspace({ review, demoMode, onBackToBalance, onStartNewReview }: FinFormsWorkspaceProps) {
  const [view, setView] = useState<FinView>("catalog");
  const [selectedForm, setSelectedForm] = useState<FinFormId>("FIN-1");
  const [sourceHelpMapping, setSourceHelpMapping] = useState<Fin1Mapping | null>(null);
  const { dataset, form } = useMemo(() => prepareFin1FromBalanceReview(review), [review]);
  const currencyStorageKey = `tenderapps:fin1-presentation-currency:${review.reviewId}`;
  const [targetCurrency, setTargetCurrency] = useState<Fin1PresentationCurrency>(() => {
    if (typeof window === "undefined") return "USD";
    return window.localStorage.getItem(currencyStorageKey) === "EUR" ? "EUR" : "USD";
  });
  useEffect(() => {
    window.localStorage.setItem(currencyStorageKey, targetCurrency);
  }, [currencyStorageKey, targetCurrency]);
  const presentation = useMemo(() => prepareFin1Presentation(form, targetCurrency), [form, targetCurrency]);
  const presentedForm = presentation.form;
  const canGenerate = form.readiness.canGenerate && presentation.status === "ready";
  const fin2 = useMemo(() => generateFin2(dataset, { comparisonCurrency: targetCurrency }), [dataset, targetCurrency]);
  const incompleteMappings = form.mappings.filter((mapping) => mapping.status !== "ready");
  const missingIncomeFields = incompleteMappings.filter((mapping) => ["total_revenue", "profit_before_tax", "profit_after_tax"].includes(mapping.field));
  const missingBalanceFields = incompleteMappings.filter((mapping) => !["total_revenue", "profit_before_tax", "profit_after_tax"].includes(mapping.field));
  const normalizedPeriods = dataset.periodMappings.filter((period) => period.eligibleForFin);
  const excludedPeriods = dataset.periodMappings.filter((period) => !period.eligibleForFin && period.status === "excluded");
  const hasReliablePeriods = form.years.length > 0;

  if (selectedForm === "FIN-2" && view !== "catalog") {
    return (
      <Fin2Workspace
        review={review}
        dataset={dataset}
        demoMode={demoMode}
        comparisonCurrency={targetCurrency}
        onComparisonCurrencyChange={setTargetCurrency}
        onBackToCatalog={() => setView("catalog")}
        onBackToBalance={onBackToBalance}
        onStartNewReview={onStartNewReview}
      />
    );
  }

  if (view === "catalog") {
    return (
      <>
        {(demoMode || review.source.synthetic) && <div className="bs-synthetic-banner fin-synthetic-banner"><b>SYNTHETIC FIXTURE</b><span>FIN forms are generated from test evidence, not client data.</span></div>}
        <section className="fin-hero">
          <div><p className="bs-eyebrow"><span /> NEXT WORKFLOW STAGE</p><h1>Prepare IFI<br /><em>Financial Forms.</em></h1><p>The validated balance-sheet dataset is now the financial source for standard qualification forms. FIN templates provide the destination structure only.</p></div>
          <aside><span>AVAILABLE NOW</span><strong>2 FORMS</strong><p>FIN-1 Historical Performance · FIN-2 Average Annual Turnover</p><dl><div><dt>Years</dt><dd>{form.years.length || "—"}</dd></div><div><dt>FIN-1 mappings</dt><dd>{form.readiness.readyFields}</dd></div><div><dt>FIN-2 turnover years</dt><dd>{fin2.readiness.readyYears}</dd></div><div><dt>Currency</dt><dd>{targetCurrency}</dd></div></dl></aside>
        </section>

        <ol className="fin-workflow-line" aria-label="Financial form preparation workflow">
          <li className={hasReliablePeriods ? "is-complete" : "is-blocked"}><span>{hasReliablePeriods ? "✓" : "!"}</span><div><b>{hasReliablePeriods ? "Digitized" : "Extraction needs review"}</b><small>{hasReliablePeriods ? "Canonical balance data" : "No reliable reporting year"}</small></div></li>
          <li className="is-active"><span>2</span><div><b>Prepare</b><small>Select IFI form</small></div></li>
          <li><span>3</span><div><b>Review mapping</b><small>Sources and gaps</small></div></li>
          <li><span>4</span><div><b>Generate</b><small>Clean FIN form</small></div></li>
        </ol>

        <SourceRoleGate review={review} finReady={form.readiness.canGenerate} />

        <section className="fin-catalog-card">
          <div className="fin-form-identity"><span>FORM FIN–1</span><div><strong>Historical Financial Performance</strong><p>Source-driven periods · balance-derived indicators · income-statement evidence when available</p></div></div>
          <div className="fin-readiness-summary">
            <span className={`fin-state is-${form.readiness.status}`}>{statusLabel(form)}</span>
            <dl><div><dt>Available years</dt><dd>{form.years.join(" · ") || "Needs review"}</dd></div><div><dt>Field mappings</dt><dd>{form.mappings.length}</dd></div><div><dt>Missing fields</dt><dd>{form.readiness.missingFields}</dd></div><div><dt>Historical coverage</dt><dd>{form.coverage.requiredYears ? `${form.coverage.availableYears}/${form.coverage.requiredYears}` : `${form.coverage.availableYears} available · requirement not set`}</dd></div></dl>
          </div>
          <div className="fin-catalog-actions"><p>{hasReliablePeriods ? form.readiness.message : "This saved extraction has no reliable financial year, so FIN-1 has nothing trustworthy to map. Re-digitize the source with the corrected extractor; the original file must be selected again because client documents are not retained by this local-first app."}</p>{hasReliablePeriods ? <button className="bs-primary-action" onClick={() => { setSelectedForm("FIN-1"); setView("mapping"); }} type="button">Review FIN-1 mapping <span aria-hidden="true">→</span></button> : <button className="bs-primary-action" onClick={onStartNewReview} type="button">Re-digitize source <span aria-hidden="true">→</span></button>}<button className="bs-secondary-action" onClick={onBackToBalance} type="button">Back to balance result</button></div>
        </section>

        <section className="fin-catalog-card fin2-catalog-card">
          <div className="fin-form-identity"><span>FORM FIN–2</span><div><strong>Size of Operation — Average Annual Turnover</strong><p>Source-driven turnover · year-end FX evidence · calculated average · single bidder</p></div></div>
          <div className="fin-readiness-summary">
            <span className={`fin-state is-${fin2.readiness.status}`}>{fin2.readiness.status === "ready" ? "Ready" : fin2.readiness.status === "partial" ? "Partially ready" : "Turnover evidence needed"}</span>
            <dl><div><dt>Available years</dt><dd>{fin2.years.join(" · ") || "Needs review"}</dd></div><div><dt>Ready turnover years</dt><dd>{fin2.readiness.readyYears}</dd></div><div><dt>Missing years</dt><dd>{fin2.readiness.missingYears}</dd></div><div><dt>Historical coverage</dt><dd>{fin2.coverage.requiredYears ? `${fin2.coverage.eligibleTurnoverYears}/${fin2.coverage.requiredYears}` : `${fin2.coverage.eligibleTurnoverYears} available · requirement not set`}</dd></div></dl>
          </div>
          <div className="fin-catalog-actions"><p>{fin2.readiness.message} Turnover must come from eligible financial evidence; populated FIN-2 examples are technically prohibited.</p>{hasReliablePeriods ? <button className="bs-primary-action" onClick={() => { setSelectedForm("FIN-2"); setView("mapping"); }} type="button">Review FIN-2 mapping <span aria-hidden="true">→</span></button> : <button className="bs-primary-action" onClick={onStartNewReview} type="button">Re-digitize source <span aria-hidden="true">→</span></button>}<button className="bs-secondary-action" onClick={onBackToBalance} type="button">Back to balance result</button></div>
        </section>

        <section className="fin-scope-note"><span>FIN FORMS FRAMEWORK</span><div><b>FIN-1 and FIN-2 share one Case-scoped canonical financial dataset.</b><p>FIN-2 currently supports one bidder only. JV, Consortium, partner percentages, and combined-member calculations are deliberately outside scope.</p></div></section>
        <footer className="bs-footer"><span>Tender Apps · TenderBalance · IFI Financial Forms</span><span>Financial sources provide facts · templates provide structure</span></footer>
      </>
    );
  }

  if (view === "mapping") {
    return (
      <>
        <section className="fin-workspace-heading">
          <div><p className="bs-eyebrow"><span /> FIN–1 · REVIEW MAPPING</p><h1>Review the source<br /><em>before generating.</em></h1><p>{form.readiness.message}</p></div>
          <FormHeader view={view} onChange={setView} canGenerate={canGenerate} />
        </section>

        <section className={`fin-readiness-panel is-${form.readiness.status}`} aria-live="polite">
          <div><span>{statusLabel(form).toUpperCase()}</span><h2>{form.years.length ? `${form.years.join(" · ")} are the legitimate FIN periods.` : "A financial-year mapping is required."}</h2><p>Unprovided years were not manufactured. Average source columns remain auditable but are not treated as historical years.</p></div>
          <dl><div><dt>Ready mappings</dt><dd>{form.readiness.readyFields}</dd></div><div><dt>Source-data gaps</dt><dd>{form.readiness.missingFields}</dd></div><div><dt>Review findings</dt><dd>{form.readiness.problemFields}</dd></div><div><dt>Can generate</dt><dd>{canGenerate ? `Yes · ${targetCurrency}` : "No"}</dd></div></dl>
        </section>

        <FxPolicyPanel sourceCurrency={form.currency} targetCurrency={targetCurrency} presentation={presentation} onChange={setTargetCurrency} />

        <div className="fin-mapping-table-wrap">
          <table className="fin-mapping-table">
            <thead><tr><th>FIN-1 field</th><th>Year</th><th>Value</th><th>Source</th><th>Provenance</th><th>Status</th></tr></thead>
            <tbody>{form.mappings.map((mapping) => <tr className={`is-${mapping.status}`} key={mapping.id}><td><b>{mapping.label}</b>{mapping.calculationFormula && <small>{mapping.calculationFormula}</small>}</td><td><strong>{mapping.displayYear}</strong>{mapping.originalPeriods.length > 0 && <small>Source: {mapping.originalPeriods.join(" / ")}</small>}</td><td><b>{formatFigure(mapping.value, mapping.unitScale)}{mapping.value !== null ? ` ${mapping.currency}` : ""}</b>{mapping.difference !== null && <small>Calculated: {formatFigure(mapping.calculatedValue, mapping.unitScale)} · Δ {formatFigure(mapping.difference, mapping.unitScale)}</small>}</td><td><span>{mapping.sourceSummary}</span></td><td><code>{mapping.provenance ?? "—"}</code></td><td><span className="fin-mapping-status">{mappingLabel(mapping)}</span>{mapping.action && <button onClick={() => setSourceHelpMapping(mapping)} type="button">{mapping.action} →</button>}</td></tr>)}</tbody>
          </table>
        </div>

        {sourceHelpMapping && (
          <section className="fin-source-help" aria-live="polite">
            <div><span>{sourceHelpMapping.status === "missing" ? "ADDITIONAL SOURCE NEEDED" : "REVIEW REQUIRED"}</span><h3>{sourceHelpMapping.action ?? "Resolve this mapping"}</h3><p>{sourceHelpMapping.status === "missing" ? `${sourceHelpMapping.label} for ${sourceHelpMapping.displayYear} is not present in an eligible source. No value was estimated.` : `${sourceHelpMapping.label} for ${sourceHelpMapping.displayYear} could not be extracted or mapped reliably. FIN-1 generation remains blocked until it is resolved.`}</p></div>
            <button onClick={() => setSourceHelpMapping(null)} type="button">Close</button>
          </section>
        )}

        <details className="fin-audit-disclosure">
          <summary>View period normalization and source-role audit</summary>
          <div className="fin-audit-grid">
            <section><h3>Period normalization</h3>{normalizedPeriods.map((period) => <article key={period.id}><b>{period.displayYear}</b><div><strong>{period.originalPeriod}</strong><p>{period.rationale}</p></div><span>{period.status}</span></article>)}{excludedPeriods.map((period) => <article className="is-excluded" key={period.id}><b>—</b><div><strong>{period.originalPeriod}</strong><p>{period.rationale}</p></div><span>excluded</span></article>)}</section>
            <section><h3>Document roles</h3>{dataset.documents.map((document) => <article key={document.documentId}><b>{document.eligibleForGeneratedFinValues ? "✓" : "×"}</b><div><strong>{document.fileName}</strong><p>{document.decision}</p></div><span>{document.role.replaceAll("_", " ")}</span></article>)}</section>
          </div>
        </details>

        <section className="fin-review-actions"><div><span>NEXT STEP</span><h3>{canGenerate ? `Generate the ${targetCurrency} FIN-1.` : form.readiness.canGenerate ? "Resolve the exchange-rate presentation blocker." : "Resolve the blocking source mappings."}</h3><p>{canGenerate ? "Available source values and permitted calculations will be converted with the saved CBU historical basis. Genuine absent fields remain explicit." : form.readiness.canGenerate ? presentation.issues.map((issue) => issue.message).join(" ") : `${form.readiness.message} Re-digitize the statement or add the missing eligible source; the app will not invent unavailable figures.`}</p></div><div>{canGenerate ? <button className="bs-primary-action" onClick={() => setView("form")} type="button">Generate {targetCurrency} FIN-1 <span aria-hidden="true">→</span></button> : form.readiness.canGenerate ? <button className="bs-primary-action" disabled title="Select a supported currency or provide an authorized historical rate." type="button">FX rate required</button> : <button className="bs-primary-action" onClick={onStartNewReview} type="button">Re-digitize or add source <span aria-hidden="true">→</span></button>}<button className="bs-secondary-action" onClick={() => setView("catalog")} type="button">Back to forms</button></div></section>
        <footer className="bs-footer"><span>Tender Apps · TenderBalance · FIN-1 Mapping</span><span>Original dates and provenance retained</span></footer>
      </>
    );
  }

  if (!presentedForm) {
    return (
      <>
        <section className="fin-workspace-heading fin-generated-heading">
          <div><p className="bs-eyebrow"><span /> FX REVIEW REQUIRED</p><h1>FIN-1 needs an<br /><em>authorized rate.</em></h1><p>The source financial evidence remains intact. A converted client form is not generated without a supported historical rate.</p></div>
          <FormHeader view={view} onChange={setView} canGenerate={false} />
        </section>
        <FxPolicyPanel sourceCurrency={form.currency} targetCurrency={targetCurrency} presentation={presentation} onChange={setTargetCurrency} />
        <section className="fin-generated-actions"><div><span>RECOVERY</span><h3>Return to the mapping audit.</h3><p>Select another presentation currency or inspect the exact missing-rate blocker. No source figure has been changed.</p></div><div><button className="bs-primary-action" onClick={() => setView("mapping")} type="button">Source &amp; Mapping</button><button className="bs-secondary-action" onClick={onBackToBalance} type="button">Back to balance result</button></div></section>
      </>
    );
  }

  return (
    <>
      <section className="fin-workspace-heading fin-generated-heading">
        <div><p className="bs-eyebrow"><span /> FORM GENERATED · FX CALCULATED</p><h1>{presentedForm.readiness.status === "ready" ? <>FIN-1 is ready<br /><em>in {presentedForm.currency}.</em></> : <>FIN-1 contains<br /><em>declared source gaps.</em></>}</h1><p>The source statement remains in {presentedForm.sourceCurrency}. This client form is a calculated {presentedForm.currency} presentation with a retained FX audit.</p></div>
        <FormHeader view={view} onChange={setView} canGenerate={canGenerate} />
      </section>

      <FxPolicyPanel sourceCurrency={form.currency} targetCurrency={targetCurrency} presentation={presentation} onChange={setTargetCurrency} />

      <section className="fin-generated-meta"><div><span>Applicant</span><b>{presentedForm.entity}</b></div><div><span>Currency / units</span><b>{presentedForm.currency} · {presentedForm.unitLabel}</b></div><div><span>Historical periods</span><b>{presentedForm.years.join(" · ")}</b></div><div><span>Generation status</span><b>{statusLabel(presentedForm)}</b></div></section>

      <section className="fin-generated-form" aria-label="Generated FIN-1 Historical Financial Performance">
        <header><div><span>FORM FIN–1</span><h2>Historical Financial Performance</h2><p>{presentedForm.entity}</p></div><b>{presentedForm.readiness.status === "partial" ? "GENERATED WITH DECLARED GAPS" : "READY"}</b></header>
        <div className="fin-form-table-wrap"><table><thead><tr><th>Financial Indicator</th>{presentedForm.years.map((year) => <th key={year}>{year}<small>{presentedForm.currency} · {presentedForm.unitLabel}</small></th>)}</tr></thead><tbody>{FIN1_FIELDS.map((field) => <tr key={field.id}><td><b>{field.label}</b>{field.sourceType === "calculated" && <small>Calculated</small>}</td>{presentedForm.years.map((year) => {
          const mapping = presentedForm.mappings.find((candidate) => candidate.field === field.id && candidate.displayYear === year);
          const unavailableLabel = mapping?.status === "missing" ? mapping.sourceSummary : mapping?.action ?? "Review extraction or mapping";
          return <td className={mapping?.status === "missing" ? "is-missing" : mapping?.status !== "ready" ? "is-finding" : ""} key={year}><b>{formatFigure(mapping?.value ?? null, mapping?.unitScale ?? presentedForm.unitScale)}</b>{mapping?.status !== "ready" ? <small>{unavailableLabel}</small> : <small>{mapping?.fx?.rateType === "identity" ? mapping.sourceProvenance : `CALCULATED · FX ${mapping?.fx?.rateType}`}</small>}</td>;
        })}</tr>)}</tbody></table></div>
        <footer><p>Source-driven years only. Original source figures remain unchanged; converted values are calculated with the saved CBU historical dataset.</p><span>{presentedForm.coverage.message}</span></footer>
      </section>

      {incompleteMappings.length > 0 && <section className="fin-generated-notice"><span>!</span><div><b>{incompleteMappings.length} field {incompleteMappings.length === 1 ? "gap remains" : "gaps remain"}.</b><p>{missingBalanceFields.length > 0 ? `${missingBalanceFields.length} balance-sheet mapping ${missingBalanceFields.length === 1 ? "requires" : "require"} review. ` : ""}{missingIncomeFields.length > 0 ? `${missingIncomeFields.length} income-statement ${missingIncomeFields.length === 1 ? "value is" : "values are"} unavailable. ` : ""}No figures were estimated.</p></div></section>}

      <section className="fin-generated-actions"><div><span>FORM OPTIONS</span><h3>FIN-1 remains linked to its source and FX audits.</h3><p>Export the {presentedForm.currency} client form with original source values, mapping provenance, exchange-rate evidence, and conversion formulas.</p></div><div><button className="bs-primary-action" onClick={() => downloadExcel(review, presentedForm)} type="button">Export {presentedForm.currency} FIN-1 Excel <span aria-hidden="true">↓</span></button><button className="bs-secondary-action" onClick={() => downloadCsv(review, presentedForm)} type="button">Export CSV</button><button className="bs-secondary-action" onClick={() => setView("mapping")} type="button">Source &amp; Mapping</button><button className="bs-secondary-action" onClick={onBackToBalance} type="button">Back to balance result</button></div></section>
      <footer className="bs-footer"><span>Tender Apps · TenderBalance · Generated FIN-1</span><span>{demoMode ? "Demo workspace · not client evidence" : "Generated from the saved balance case"}</span></footer>
    </>
  );
}

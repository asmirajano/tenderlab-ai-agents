import { useMemo, useState } from "react";
import {
  FIN1_FIELDS,
  fin1ToCsv,
  prepareFin1FromBalanceReview,
  type Fin1Form,
  type Fin1Mapping,
} from "../../../packages/tender-balance/src/fin-forms.ts";
import type { BalanceSheetReview } from "../../../packages/tender-balance/src/model.ts";
import "./fin-forms.css";

type FinView = "catalog" | "mapping" | "form";

type FinFormsWorkspaceProps = {
  review: BalanceSheetReview;
  demoMode: boolean;
  onBackToBalance: () => void;
};

function formatFigure(value: number | null, scale: number) {
  if (value === null) return "MISSING";
  const displayed = value / scale;
  return displayed < 0
    ? `(${Math.abs(displayed).toLocaleString("en-US")})`
    : displayed.toLocaleString("en-US");
}

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

function downloadCsv(review: BalanceSheetReview, form: Fin1Form) {
  const url = URL.createObjectURL(new Blob([fin1ToCsv(form)], { type: "text/csv;charset=utf-8" }));
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `${review.source.documentId.replaceAll(":", "-")}-FIN-1.csv`;
  anchor.click();
  URL.revokeObjectURL(url);
}

function FormHeader({ view, onChange }: { view: FinView; onChange: (view: FinView) => void }) {
  return (
    <nav aria-label="FIN-1 workspace views" className="fin-view-switcher">
      <button aria-current={view === "mapping" ? "page" : undefined} onClick={() => onChange("mapping")} type="button">Source &amp; Mapping</button>
      <button aria-current={view === "form" ? "page" : undefined} onClick={() => onChange("form")} type="button">FIN-1 Form</button>
    </nav>
  );
}

function SourceRoleGate({ review }: { review: BalanceSheetReview }) {
  return (
    <section className="fin-source-gate" aria-label="Financial source role gate">
      <header><div><span>SOURCE-ROLE GATE</span><h2>Financial facts and form structure stay separate.</h2></div><b>ENFORCED</b></header>
      <div className="fin-role-record">
        <div><span>DOCUMENT</span><strong>{review.source.fileName}</strong><small>{review.source.documentId}</small></div>
        <div><span>ASSIGNED ROLE</span><strong>Financial source</strong><small>Eligible for canonical financial data</small></div>
        <div className="is-eligible"><span>FIN-1 ELIGIBILITY</span><strong>Eligible ✓</strong><small>Every mapped value retains its source trace</small></div>
      </div>
      <p><b>Permanent rule:</b> a document classified as <code>TEMPLATE</code> can define FIN-1 structure and requirements, but its populated example names, years, and figures are technically blocked from client financial data.</p>
    </section>
  );
}

export function FinFormsWorkspace({ review, demoMode, onBackToBalance }: FinFormsWorkspaceProps) {
  const [view, setView] = useState<FinView>("catalog");
  const [sourceHelpOpen, setSourceHelpOpen] = useState(false);
  const { dataset, form } = useMemo(() => prepareFin1FromBalanceReview(review), [review]);
  const missingIncomeFields = form.mappings.filter((mapping) => mapping.status === "missing" && ["total_revenue", "profit_before_tax", "profit_after_tax"].includes(mapping.field));
  const normalizedPeriods = dataset.periodMappings.filter((period) => period.eligibleForFin);
  const excludedPeriods = dataset.periodMappings.filter((period) => !period.eligibleForFin && period.status === "excluded");

  if (view === "catalog") {
    return (
      <>
        {(demoMode || review.source.synthetic) && <div className="bs-synthetic-banner fin-synthetic-banner"><b>SYNTHETIC FIXTURE</b><span>FIN-1 is generated from test evidence, not client data.</span></div>}
        <section className="fin-hero">
          <div><p className="bs-eyebrow"><span /> NEXT WORKFLOW STAGE</p><h1>Prepare IFI<br /><em>Financial Forms.</em></h1><p>The validated balance-sheet dataset is now the financial source for standard qualification forms. FIN templates provide the destination structure only.</p></div>
          <aside><span>AVAILABLE NOW</span><strong>FIN-1</strong><p>Historical Financial Performance</p><dl><div><dt>Years</dt><dd>{form.years.length || "—"}</dd></div><div><dt>Mapped</dt><dd>{form.readiness.readyFields}</dd></div><div><dt>Gaps</dt><dd>{form.readiness.missingFields}</dd></div><div><dt>Status</dt><dd>{statusLabel(form)}</dd></div></dl></aside>
        </section>

        <ol className="fin-workflow-line" aria-label="Financial form preparation workflow">
          <li className="is-complete"><span>✓</span><div><b>Digitized</b><small>Canonical balance data</small></div></li>
          <li className="is-active"><span>2</span><div><b>Prepare</b><small>Select IFI form</small></div></li>
          <li><span>3</span><div><b>Review mapping</b><small>Sources and gaps</small></div></li>
          <li><span>4</span><div><b>Generate</b><small>Clean FIN form</small></div></li>
        </ol>

        <SourceRoleGate review={review} />

        <section className="fin-catalog-card">
          <div className="fin-form-identity"><span>FORM FIN–1</span><div><strong>Historical Financial Performance</strong><p>Source-driven periods · balance-derived indicators · explicit income-statement gaps</p></div></div>
          <div className="fin-readiness-summary">
            <span className={`fin-state is-${form.readiness.status}`}>{statusLabel(form)}</span>
            <dl><div><dt>Available years</dt><dd>{form.years.join(" · ") || "Needs review"}</dd></div><div><dt>Field mappings</dt><dd>{form.mappings.length}</dd></div><div><dt>Missing fields</dt><dd>{form.readiness.missingFields}</dd></div><div><dt>Historical coverage</dt><dd>{form.coverage.requiredYears ? `${form.coverage.availableYears}/${form.coverage.requiredYears}` : `${form.coverage.availableYears} available · requirement not set`}</dd></div></dl>
          </div>
          <div className="fin-catalog-actions"><p>{form.readiness.message}</p><button className="bs-primary-action" disabled={!form.readiness.canGenerate} onClick={() => setView("mapping")} type="button">Review FIN-1 mapping <span aria-hidden="true">→</span></button><button className="bs-secondary-action" onClick={onBackToBalance} type="button">Back to balance result</button></div>
        </section>

        <section className="fin-scope-note"><span>FIRST PRODUCTION TEMPLATE</span><div><b>Only FIN-1 is implemented.</b><p>The mapping layer is reusable, but no inactive catalogue or unvalidated IFI forms have been added.</p></div></section>
        <footer className="bs-footer"><span>Tender Apps · TenderBalance · IFI Financial Forms</span><span>Financial sources provide facts · templates provide structure</span></footer>
      </>
    );
  }

  if (view === "mapping") {
    return (
      <>
        <section className="fin-workspace-heading">
          <div><p className="bs-eyebrow"><span /> FIN–1 · REVIEW MAPPING</p><h1>Review the source<br /><em>before generating.</em></h1><p>{form.readiness.message}</p></div>
          <FormHeader view={view} onChange={setView} />
        </section>

        <section className={`fin-readiness-panel is-${form.readiness.status}`} aria-live="polite">
          <div><span>{statusLabel(form).toUpperCase()}</span><h2>{form.years.length ? `${form.years.join(" · ")} are the legitimate FIN periods.` : "A financial-year mapping is required."}</h2><p>Unprovided years were not manufactured. Average source columns remain auditable but are not treated as historical years.</p></div>
          <dl><div><dt>Ready mappings</dt><dd>{form.readiness.readyFields}</dd></div><div><dt>Source-data gaps</dt><dd>{form.readiness.missingFields}</dd></div><div><dt>Review findings</dt><dd>{form.readiness.problemFields}</dd></div><div><dt>Can generate</dt><dd>{form.readiness.canGenerate ? "Yes" : "No"}</dd></div></dl>
        </section>

        <div className="fin-mapping-table-wrap">
          <table className="fin-mapping-table">
            <thead><tr><th>FIN-1 field</th><th>Year</th><th>Value</th><th>Source</th><th>Provenance</th><th>Status</th></tr></thead>
            <tbody>{form.mappings.map((mapping) => <tr className={`is-${mapping.status}`} key={mapping.id}><td><b>{mapping.label}</b>{mapping.calculationFormula && <small>{mapping.calculationFormula}</small>}</td><td><strong>{mapping.displayYear}</strong>{mapping.originalPeriods.length > 0 && <small>Source: {mapping.originalPeriods.join(" / ")}</small>}</td><td><b>{formatFigure(mapping.value, mapping.unitScale)}{mapping.value !== null ? ` ${mapping.currency}` : ""}</b>{mapping.difference !== null && <small>Calculated: {formatFigure(mapping.calculatedValue, mapping.unitScale)} · Δ {formatFigure(mapping.difference, mapping.unitScale)}</small>}</td><td><span>{mapping.sourceSummary}</span></td><td><code>{mapping.provenance ?? "—"}</code></td><td><span className="fin-mapping-status">{mappingLabel(mapping)}</span>{mapping.action && <button onClick={() => setSourceHelpOpen(true)} type="button">{mapping.action} →</button>}</td></tr>)}</tbody>
          </table>
        </div>

        {sourceHelpOpen && (
          <section className="fin-source-help" aria-live="polite">
            <div><span>ADDITIONAL SOURCE NEEDED</span><h3>Income Statement required</h3><p>Revenue and profit values are not inferred from balance-sheet movements. You can still generate a partial FIN-1 now; Income Statement ingestion is intentionally outside this first validated release.</p></div>
            <button onClick={() => setSourceHelpOpen(false)} type="button">Close</button>
          </section>
        )}

        <details className="fin-audit-disclosure">
          <summary>View period normalization and source-role audit</summary>
          <div className="fin-audit-grid">
            <section><h3>Period normalization</h3>{normalizedPeriods.map((period) => <article key={period.id}><b>{period.displayYear}</b><div><strong>{period.originalPeriod}</strong><p>{period.rationale}</p></div><span>{period.status}</span></article>)}{excludedPeriods.map((period) => <article className="is-excluded" key={period.id}><b>—</b><div><strong>{period.originalPeriod}</strong><p>{period.rationale}</p></div><span>excluded</span></article>)}</section>
            <section><h3>Document roles</h3>{dataset.documents.map((document) => <article key={document.documentId}><b>{document.eligibleForGeneratedFinValues ? "✓" : "×"}</b><div><strong>{document.fileName}</strong><p>{document.decision}</p></div><span>{document.role.replaceAll("_", " ")}</span></article>)}</section>
          </div>
        </details>

        <section className="fin-review-actions"><div><span>NEXT STEP</span><h3>Generate FIN-1 with declared gaps.</h3><p>Available source values and permitted calculations will be shown. Missing income-statement fields remain explicit.</p></div><div><button className="bs-primary-action" disabled={!form.readiness.canGenerate} onClick={() => setView("form")} type="button">Generate FIN-1 <span aria-hidden="true">→</span></button><button className="bs-secondary-action" onClick={() => setView("catalog")} type="button">Back to forms</button></div></section>
        <footer className="bs-footer"><span>Tender Apps · TenderBalance · FIN-1 Mapping</span><span>Original dates and provenance retained</span></footer>
      </>
    );
  }

  return (
    <>
      <section className="fin-workspace-heading fin-generated-heading">
        <div><p className="bs-eyebrow"><span /> FORM GENERATED</p><h1>FIN-1 is ready<br /><em>for client use.</em></h1><p>{form.readiness.status === "partial" ? "The form contains legitimate available values and clearly declared source-data gaps." : "All required fields are populated from eligible sources."}</p></div>
        <FormHeader view={view} onChange={setView} />
      </section>

      <section className="fin-generated-meta"><div><span>Applicant</span><b>{form.entity}</b></div><div><span>Currency / units</span><b>{form.currency} · {form.unitLabel}</b></div><div><span>Historical periods</span><b>{form.years.join(" · ")}</b></div><div><span>Generation status</span><b>{statusLabel(form)}</b></div></section>

      <section className="fin-generated-form" aria-label="Generated FIN-1 Historical Financial Performance">
        <header><div><span>FORM FIN–1</span><h2>Historical Financial Performance</h2><p>{form.entity}</p></div><b>{form.readiness.status === "partial" ? "GENERATED WITH DECLARED GAPS" : "READY"}</b></header>
        <div className="fin-form-table-wrap"><table><thead><tr><th>Financial Indicator</th>{form.years.map((year) => <th key={year}>{year}<small>{form.currency} · {form.unitLabel}</small></th>)}</tr></thead><tbody>{FIN1_FIELDS.map((field) => <tr key={field.id}><td><b>{field.label}</b>{field.sourceType === "calculated" && <small>Calculated</small>}</td>{form.years.map((year) => {
          const mapping = form.mappings.find((candidate) => candidate.field === field.id && candidate.displayYear === year);
          return <td className={mapping?.status === "missing" ? "is-missing" : mapping?.status === "source-inconsistency" ? "is-finding" : ""} key={year}><b>{formatFigure(mapping?.value ?? null, mapping?.unitScale ?? form.unitScale)}</b>{mapping?.status === "missing" ? <small>Income Statement required</small> : mapping?.provenance === "CALCULATED" ? <small>{mapping.calculationFormula}</small> : mapping?.status === "source-inconsistency" ? <small>Reported value · reconciliation finding retained</small> : <small>{mapping?.provenance}</small>}</td>;
        })}</tr>)}</tbody></table></div>
        <footer><p>Source-driven years only. Template example content is ineligible for client figures. Reported values remain distinct from calculated validation values.</p><span>{form.coverage.message}</span></footer>
      </section>

      {missingIncomeFields.length > 0 && <section className="fin-generated-notice"><span>!</span><div><b>{missingIncomeFields.length} genuine field gaps remain.</b><p>Total Revenue, Profit Before Tax, and Profit After Tax require an Income Statement for the available years. No figures were estimated.</p></div></section>}

      <section className="fin-generated-actions"><div><span>FORM OPTIONS</span><h3>FIN-1 remains linked to its mapping audit.</h3><p>Return to Source &amp; Mapping at any time to inspect normalized dates, provenance, calculations, and findings.</p></div><div><button className="bs-primary-action" onClick={() => downloadCsv(review, form)} type="button">Export FIN-1 CSV <span aria-hidden="true">↓</span></button><button className="bs-secondary-action" onClick={() => setView("mapping")} type="button">Source &amp; Mapping</button><button className="bs-secondary-action" onClick={onBackToBalance} type="button">Back to balance result</button></div></section>
      <footer className="bs-footer"><span>Tender Apps · TenderBalance · Generated FIN-1</span><span>{demoMode ? "Demo workspace · not client evidence" : "Generated from the saved balance case"}</span></footer>
    </>
  );
}

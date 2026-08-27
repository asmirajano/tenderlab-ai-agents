import { useRef, useState, type ChangeEvent, type DragEvent } from "react";
import { readBalanceSheetFile } from "../../../packages/tender-balance/src/file-reader.ts";
import {
  approveEligibleLineItems,
  approveLineItem,
  approveStatement,
  canApproveStatement,
  compareBalanceSheetReviews,
  correctLineItemValue,
  reviewToCsv,
  type BalanceSheetReview,
  type IssueSeverity,
} from "../../../packages/tender-balance/src/model.ts";
import { syntheticBalanceSheetReviews, syntheticFixtureLabels } from "../../../packages/tender-balance/src/fixtures.ts";
import "../../../packages/design-system/src/tokens.css";
import "./balance-sheet.css";

const conceptLabels: Record<string, string> = {
  total_assets: "Total assets",
  total_liabilities: "Total liabilities",
  owners_equity: "Owners’ equity",
  net_assets: "Net assets",
  current_assets: "Current assets",
  current_liabilities: "Current liabilities",
  cash_and_cash_equivalents: "Cash & equivalents",
  trade_receivables: "Trade receivables",
  inventories: "Inventories",
  other_current_assets: "Other current assets",
  property_plant_equipment: "Property, plant & equipment",
  intangible_assets: "Intangible assets",
  other_non_current_assets: "Other non-current assets",
  trade_payables: "Trade payables",
  short_term_borrowings: "Short-term borrowings",
  other_current_liabilities: "Other current liabilities",
  long_term_borrowings: "Long-term borrowings",
  other_non_current_liabilities: "Other non-current liabilities",
  share_capital: "Share capital",
  retained_earnings: "Retained earnings / loss",
  other_equity: "Other equity",
  unmapped: "Unmapped",
};

const severityRank: Record<IssueSeverity, number> = { blocking: 4, error: 3, warning: 2, info: 1 };

function formatAmount(value: number | null | undefined, currency: string, scale = 1) {
  if (value === null || value === undefined) return "—";
  const displayValue = value / scale;
  return `${displayValue < 0 ? `(${Math.abs(displayValue).toLocaleString("en-US")})` : displayValue.toLocaleString("en-US")} ${currency}`;
}

function download(name: string, content: string, mimeType: string) {
  const url = URL.createObjectURL(new Blob([content], { type: mimeType }));
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = name;
  anchor.click();
  URL.revokeObjectURL(url);
}

function StatusBadge({ status }: { status: string }) {
  return <span className={`bs-status status-${status}`}>{status.replaceAll("-", " ")}</span>;
}

export default function BalanceSheetApp() {
  const [reviews, setReviews] = useState<BalanceSheetReview[]>(syntheticBalanceSheetReviews);
  const [selectedReviewId, setSelectedReviewId] = useState(syntheticBalanceSheetReviews[0].reviewId);
  const [selectedLineId, setSelectedLineId] = useState(syntheticBalanceSheetReviews[0].lineItems[0]?.id ?? "");
  const [comparisonId, setComparisonId] = useState(syntheticBalanceSheetReviews[4].reviewId);
  const [reviewer, setReviewer] = useState("Finance reviewer");
  const [correctionValue, setCorrectionValue] = useState("");
  const [correctionReason, setCorrectionReason] = useState("");
  const [activePeriod, setActivePeriod] = useState(syntheticBalanceSheetReviews[0].statement.periods[0]);
  const [uploadState, setUploadState] = useState<"idle" | "reading" | "error">("idle");
  const [uploadMessage, setUploadMessage] = useState("Processed locally; no file is uploaded or published.");
  const inputRef = useRef<HTMLInputElement>(null);

  const review = reviews.find((candidate) => candidate.reviewId === selectedReviewId) ?? reviews[0];
  const selectedLine = review.lineItems.find((item) => item.id === selectedLineId) ?? review.lineItems[0];
  const comparisonReview = reviews.find((candidate) => candidate.reviewId === comparisonId && candidate.reviewId !== review.reviewId)
    ?? reviews.find((candidate) => candidate.reviewId !== review.reviewId);
  const comparison = comparisonReview ? compareBalanceSheetReviews(review, comparisonReview) : undefined;
  const sortedIssues = [...review.issues].sort((a, b) => severityRank[b.severity] - severityRank[a.severity]);
  const blockingCount = review.issues.filter((issue) => issue.severity === "blocking" || issue.severity === "error").length;
  const reviewedCount = review.lineItems.filter((item) => item.reviewStatus === "approved" || item.reviewStatus === "corrected").length;
  const averageConfidence = review.lineItems.length ? review.lineItems.reduce((sum, item) => sum + item.confidence, 0) / review.lineItems.length : 0;

  const replaceReview = (next: BalanceSheetReview) => {
    setReviews((current) => current.map((candidate) => candidate.reviewId === next.reviewId ? next : candidate));
  };

  const selectReview = (next: BalanceSheetReview) => {
    setSelectedReviewId(next.reviewId);
    setSelectedLineId(next.lineItems[0]?.id ?? "");
    setActivePeriod(next.statement.periods[0] ?? "");
    setCorrectionValue("");
    setCorrectionReason("");
    if (next.reviewId === comparisonId) {
      const alternative = reviews.find((candidate) => candidate.reviewId !== next.reviewId);
      if (alternative) setComparisonId(alternative.reviewId);
    }
  };

  const handleFiles = async (files: FileList | File[]) => {
    const file = files[0];
    if (!file) return;
    setUploadState("reading");
    setUploadMessage(`Reading ${file.name} locally…`);
    try {
      const next = await readBalanceSheetFile(file);
      setReviews((current) => [next, ...current.filter((candidate) => candidate.reviewId !== next.reviewId)]);
      setSelectedReviewId(next.reviewId);
      setSelectedLineId(next.lineItems[0]?.id ?? "");
      setActivePeriod(next.statement.periods[0] ?? "");
      setUploadState("idle");
      setUploadMessage(next.pages.some((page) => page.imageOnly)
        ? "Accepted, but no usable text layer was found. OCR/manual transcription is required; no figures were invented."
        : `Created ${next.lineItems.length} line-item records with source references.`);
    } catch (error) {
      setUploadState("error");
      setUploadMessage(error instanceof Error ? error.message : "The document could not be read.");
    }
  };

  const onFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    if (event.target.files) void handleFiles(event.target.files);
    event.target.value = "";
  };

  const onDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    void handleFiles(event.dataTransfer.files);
  };

  const submitCorrection = () => {
    if (!selectedLine || !activePeriod || !correctionReason.trim()) return;
    const parsed = Number(correctionValue.replace(/,/g, ""));
    if (!Number.isFinite(parsed)) return;
    replaceReview(correctLineItemValue(review, selectedLine.id, activePeriod, parsed, correctionReason.trim(), reviewer.trim() || "Unnamed reviewer"));
    setCorrectionValue("");
    setCorrectionReason("");
  };

  return (
    <main className="bs-page">
      <section className="bs-hero">
        <div>
          <p className="bs-eyebrow"><span /> TENDER APPS · VERIFIED COMPANY EVIDENCE</p>
          <h1>Balance sheets,<br /><em>ready to trust.</em></h1>
          <p>Source-locked extraction, arithmetic validation, and human approval—before any tender scoring or matching.</p>
        </div>
        <aside className="bs-tor-card">
          <span>BOUNDARY / TOR</span>
          <strong>Read · structure · validate · approve</strong>
          <p>No income statement, cash flow, audit opinion, eligibility decision, or supplier recommendation.</p>
          <div><b>Capability owner</b><span>TL-A008 · Company Verification Agent</span></div>
        </aside>
      </section>

      <section className="bs-workspace">
        <aside className="bs-source-rail">
          <div className="bs-panel-heading">
            <span>01 / SOURCE</span>
            <b>{reviews.length} documents</b>
          </div>
          <div
            className={`bs-dropzone ${uploadState}`}
            onDragOver={(event) => event.preventDefault()}
            onDrop={onDrop}
          >
            <input ref={inputRef} type="file" accept=".pdf,.txt,.json,.png,.jpg,.jpeg,.tif,.tiff" onChange={onFileChange} />
            <span aria-hidden="true">⇧</span>
            <strong>{uploadState === "reading" ? "Reading document…" : "Add balance sheet"}</strong>
            <p>Digital PDF, TXT, image, or JSON extraction envelope</p>
            <button type="button" disabled={uploadState === "reading"} onClick={() => inputRef.current?.click()}>Choose file</button>
          </div>
          <p className={`bs-upload-note ${uploadState === "error" ? "is-error" : ""}`}>{uploadMessage}</p>
          <div className="bs-document-list" aria-label="Available documents">
            {reviews.map((candidate) => {
              const fixture = syntheticFixtureLabels[candidate.source.documentId];
              const active = candidate.reviewId === review.reviewId;
              return (
                <button className={active ? "is-active" : ""} key={candidate.reviewId} onClick={() => selectReview(candidate)} type="button">
                  <i>{candidate.source.synthetic ? "DEMO" : "LOCAL"}</i>
                  <strong>{fixture?.label ?? candidate.source.fileName}</strong>
                  <span>{candidate.statement.reportingDate} · {candidate.statement.currency}</span>
                  <small>{fixture?.description ?? `${candidate.lineItems.length} extracted rows`}</small>
                  <StatusBadge status={candidate.review.status} />
                </button>
              );
            })}
          </div>
        </aside>

        <div className="bs-review-area">
          {review.source.synthetic && (
            <div className="bs-synthetic-banner"><b>SYNTHETIC FIXTURE</b><span>This record is a test simulation, not real client evidence.</span></div>
          )}

          <section className="bs-document-header">
            <div>
              <span>REPORTING ENTITY</span>
              <h2>{review.statement.reportingEntity}</h2>
              <p>{review.source.fileName}</p>
            </div>
            <div className="bs-header-status">
              <StatusBadge status={review.review.status} />
              <small>SHA-256 {review.source.sha256.slice(0, 14)}…</small>
            </div>
          </section>

          <section className="bs-metadata-grid" aria-label="Statement metadata">
            <div><span>Reporting date</span><b>{review.statement.reportingDate}</b></div>
            <div><span>Comparative columns</span><b>{review.statement.periods.join(" · ") || "Unconfirmed"}</b></div>
            <div><span>Currency / units</span><b>{review.statement.currency} · {review.statement.unitLabel}</b></div>
            <div><span>Language</span><b>{review.statement.language.toUpperCase()}</b></div>
            <div><span>Source pages</span><b>{review.pages.filter((page) => !page.missing).length} / {review.source.expectedPageCount ?? review.source.pageCount}</b></div>
          </section>

          <section className="bs-health-strip">
            <div className={blockingCount ? "is-alert" : "is-good"}><span>Blocking issues</span><b>{blockingCount}</b></div>
            <div><span>Extraction confidence</span><b>{Math.round(averageConfidence * 100)}%</b></div>
            <div><span>Reviewed rows</span><b>{reviewedCount} / {review.lineItems.length}</b></div>
            <div><span>Arithmetic checks</span><b>{review.arithmeticChecks.filter((check) => check.status === "passed").length} / {review.arithmeticChecks.length}</b></div>
          </section>

          <section className="bs-issues-panel">
            <div className="bs-section-title">
              <div><span>02 / EXCEPTIONS</span><h3>Review issues</h3></div>
              <b>{review.issues.length}</b>
            </div>
            {sortedIssues.length ? (
              <div className="bs-issue-list">
                {sortedIssues.map((issue) => (
                  <article className={`severity-${issue.severity}`} key={issue.id}>
                    <span>{issue.severity}</span>
                    <div><b>{issue.code.replaceAll("_", " ")}</b><p>{issue.message}</p></div>
                    <small>{issue.sourceRefs.length ? `p.${Array.from(new Set(issue.sourceRefs.map((ref) => ref.page))).join(", ")}` : "document-level"}</small>
                  </article>
                ))}
              </div>
            ) : <p className="bs-empty-state">No validation issue detected. Human review is still required before approval.</p>}
          </section>

          <section className="bs-line-section">
            <div className="bs-section-title bs-table-title">
              <div><span>03 / DIGITIZED STATEMENT</span><h3>Reported values and normalized concepts</h3></div>
              <div className="bs-period-tabs" aria-label="Active correction period">
                {review.statement.periods.map((period) => <button className={activePeriod === period ? "is-active" : ""} key={period} onClick={() => setActivePeriod(period)} type="button">{period}</button>)}
              </div>
            </div>
            <div className="bs-table-scroll">
              <table className="bs-line-table">
                <thead>
                  <tr>
                    <th>Original source label</th>
                    <th>Normalized concept</th>
                    {review.statement.periods.map((period) => <th key={period}>{period}<small>reported units</small></th>)}
                    <th>Trace</th>
                    <th>Review</th>
                  </tr>
                </thead>
                <tbody>
                  {review.lineItems.map((item) => (
                    <tr className={`${item.id === selectedLine?.id ? "is-selected" : ""} ${item.isTotal ? "is-total" : ""}`} key={item.id} onClick={() => { setSelectedLineId(item.id); setCorrectionValue(""); setCorrectionReason(""); }}>
                      <td><button type="button">{item.originalLabel}</button><small>{item.classification.replaceAll("_", " ")}</small></td>
                      <td><b>{conceptLabels[item.normalizedConcept]}</b><code>{item.normalizedConcept}</code></td>
                      {review.statement.periods.map((period) => {
                        const value = item.values.find((candidate) => candidate.period === period);
                        return <td className={value?.correction ? "is-corrected" : ""} key={period}><b>{value?.rawReportedValue ?? "—"}</b>{value?.correction && <small>corrected → {value.correction.correctedReportedValue.toLocaleString("en-US")}</small>}</td>;
                      })}
                      <td><span className={`bs-confidence ${item.confidence < 0.8 ? "is-low" : ""}`}>{Math.round(item.confidence * 100)}%</span><small>p.{item.values[0]?.source.page ?? "—"}</small></td>
                      <td><StatusBadge status={item.reviewStatus} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <section className="bs-review-grid">
            <article className="bs-line-inspector">
              <div className="bs-section-title"><div><span>04 / HUMAN REVIEW</span><h3>Inspect selected value</h3></div></div>
              {selectedLine ? (
                <>
                  <div className="bs-inspector-head"><div><span>ORIGINAL LABEL</span><b>{selectedLine.originalLabel}</b></div><StatusBadge status={selectedLine.reviewStatus} /></div>
                  <div className="bs-value-pair">
                    {selectedLine.values.map((value) => (
                      <button className={value.period === activePeriod ? "is-active" : ""} key={value.period} onClick={() => setActivePeriod(value.period)} type="button">
                        <span>{value.period}</span>
                        <b>{value.rawReportedValue}</b>
                        <small>normalized: {formatAmount(value.normalizedValue, review.statement.currency)}</small>
                        {value.correction && <em>approved correction: {formatAmount(value.correction.correctedNormalizedValue, review.statement.currency)}</em>}
                      </button>
                    ))}
                  </div>
                  {selectedLine.values.find((value) => value.period === activePeriod) && (
                    <div className="bs-provenance-card">
                      <span>SOURCE TRACE</span>
                      <code>{review.source.fileName} · p.{selectedLine.values.find((value) => value.period === activePeriod)?.source.page} · column {activePeriod}</code>
                      <p>“{selectedLine.originalLabel}” · {selectedLine.values.find((value) => value.period === activePeriod)?.source.extractionMethod} · {Math.round((selectedLine.values.find((value) => value.period === activePeriod)?.source.confidence ?? 0) * 100)}% confidence</p>
                    </div>
                  )}
                  <div className="bs-correction-form">
                    <label><span>Corrected value in reported units</span><input inputMode="decimal" value={correctionValue} onChange={(event) => setCorrectionValue(event.target.value)} placeholder="e.g. 12,500" /></label>
                    <label><span>Reason — required</span><input value={correctionReason} onChange={(event) => setCorrectionReason(event.target.value)} placeholder="What was wrong in extraction?" /></label>
                    <button type="button" disabled={!correctionReason.trim() || !Number.isFinite(Number(correctionValue.replace(/,/g, "")))} onClick={submitCorrection}>Record correction</button>
                    <p>The source value remains immutable. A correction is added as a separate reviewed value and triggers arithmetic revalidation.</p>
                  </div>
                  <button className="bs-approve-line" type="button" onClick={() => replaceReview(approveLineItem(review, selectedLine.id, reviewer.trim() || "Unnamed reviewer"))}>✓ Mark row inspected</button>
                </>
              ) : <p className="bs-empty-state">No line item is available for review.</p>}
            </article>

            <article className="bs-checks-card">
              <div className="bs-section-title"><div><span>05 / CONTROL</span><h3>Arithmetic evidence</h3></div></div>
              <div className="bs-check-list">
                {review.arithmeticChecks.map((check) => (
                  <div className={`check-${check.status}`} key={check.id}>
                    <span>{check.status === "passed" ? "✓" : check.status === "failed" ? "!" : "—"}</span>
                    <div><b>{check.formula}</b><small>{check.period}</small><p>{formatAmount(check.leftValue, review.statement.currency)} <i>vs</i> {formatAmount(check.rightValue, review.statement.currency)}</p></div>
                  </div>
                ))}
              </div>
            </article>
          </section>

          <section className="bs-compare-section">
            <div className="bs-section-title bs-compare-title">
              <div><span>06 / CROSS-DOCUMENT CHECK</span><h3>Compare periods and documents</h3></div>
              <select value={comparisonReview?.reviewId ?? ""} onChange={(event) => setComparisonId(event.target.value)} aria-label="Comparison document">
                {reviews.filter((candidate) => candidate.reviewId !== review.reviewId).map((candidate) => <option value={candidate.reviewId} key={candidate.reviewId}>{candidate.statement.reportingEntity} · {candidate.statement.reportingDate}</option>)}
              </select>
            </div>
            {comparison && comparison.overlaps.length ? (
              <div className="bs-comparison-grid">
                <div className="bs-comparison-summary">
                  <span>OVERLAPPING PERIODS</span>
                  <b>{comparison.overlaps.filter((item) => item.matches).length} matched · {comparison.issues.length} discrepancies</b>
                  <p>{comparisonReview?.source.fileName}</p>
                </div>
                <div className="bs-comparison-rows">
                  {comparison.overlaps.map((item) => (
                    <div className={item.matches ? "is-match" : "is-conflict"} key={`${item.period}:${item.concept}`}>
                      <span>{item.period}</span><b>{conceptLabels[item.concept]}</b><small>{formatAmount(item.leftValue, review.statement.currency)} ↔ {formatAmount(item.rightValue, comparisonReview?.statement.currency ?? "")}</small><em>{item.matches ? "MATCH" : `Δ ${item.difference.toLocaleString("en-US")}`}</em>
                    </div>
                  ))}
                </div>
              </div>
            ) : <p className="bs-empty-state">The selected documents have no overlapping period/concept values. Nothing was inferred.</p>}
          </section>

          <section className="bs-approval-section">
            <div>
              <span>07 / APPROVAL & EXPORT</span>
              <h3>Release only reviewed structured data</h3>
              <p>Approval confirms transcription and arithmetic review. It does not determine financial health, tender eligibility, or supplier suitability.</p>
            </div>
            <label className="bs-reviewer"><span>Reviewer</span><input value={reviewer} onChange={(event) => setReviewer(event.target.value)} /></label>
            <div className="bs-approval-actions">
              <button type="button" onClick={() => replaceReview(approveEligibleLineItems(review, reviewer.trim() || "Unnamed reviewer"))}>Approve high-confidence rows</button>
              <button className="is-primary" disabled={!canApproveStatement(review)} type="button" onClick={() => replaceReview(approveStatement(review, reviewer.trim() || "Unnamed reviewer"))}>Approve statement</button>
              <button type="button" onClick={() => download(`${review.source.documentId.replaceAll(":", "-")}.json`, JSON.stringify(review, null, 2), "application/json")}>Export JSON</button>
              <button type="button" onClick={() => download(`${review.source.documentId.replaceAll(":", "-")}.csv`, reviewToCsv(review), "text/csv;charset=utf-8")}>Export CSV</button>
            </div>
            {!canApproveStatement(review) && review.review.status !== "approved" && <small className="bs-approval-help">Resolve blocking issues and inspect every row before statement approval.</small>}
          </section>
        </div>
      </section>

      <footer className="bs-footer"><span>Tender Apps · TenderBalance · schema v{review.schemaVersion}</span><span>Private client workspace · no Command Center access</span></footer>
    </main>
  );
}

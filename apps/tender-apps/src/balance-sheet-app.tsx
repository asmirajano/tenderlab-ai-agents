import { useEffect, useRef, useState, type ChangeEvent, type DragEvent } from "react";
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
import { ClientProductManifesto } from "./client-product-manifesto.tsx";
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
const CLIENT_CASES_STORAGE_KEY = "tenderapps:tenderbalance:client-cases:v1";
const CLIENT_CONTEXTS_STORAGE_KEY = "tenderapps:tenderbalance:case-contexts:v1";
const COMPARISON_DECISIONS_STORAGE_KEY = "tenderapps:tenderbalance:comparison-decisions:v1";

type ComparisonDecision = {
  id: string;
  reviewId: string;
  comparisonReviewId: string;
  period: string;
  concept: string;
  action: "acknowledged-and-retained";
  reviewer: string;
  at: string;
};

type BalanceSurface = "welcome" | "intake" | "review" | "cases";

function isSyntheticReview(review: Partial<BalanceSheetReview>) {
  return review.source?.synthetic === true
    || review.source?.fileName?.toUpperCase().startsWith("SYNTHETIC_") === true
    || review.pages?.some((page) => /SYNTHETIC FIXTURE|NOT CLIENT EVIDENCE/i.test(page.text ?? "")) === true;
}

function readClientCases(): BalanceSheetReview[] {
  try {
    const parsed = JSON.parse(window.localStorage.getItem(CLIENT_CASES_STORAGE_KEY) ?? "[]") as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((candidate): candidate is BalanceSheetReview => {
      if (!candidate || typeof candidate !== "object") return false;
      const review = candidate as Partial<BalanceSheetReview>;
      return typeof review.reviewId === "string" && Boolean(review.source) && Boolean(review.statement) && !isSyntheticReview(review);
    });
  } catch {
    return [];
  }
}

function readClientContexts(): Record<string, string> {
  try {
    const parsed = JSON.parse(window.localStorage.getItem(CLIENT_CONTEXTS_STORAGE_KEY) ?? "{}") as unknown;
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed as Record<string, string> : {};
  } catch {
    return {};
  }
}

function readComparisonDecisions(): Record<string, ComparisonDecision> {
  try {
    const parsed = JSON.parse(window.localStorage.getItem(COMPARISON_DECISIONS_STORAGE_KEY) ?? "{}") as unknown;
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed as Record<string, ComparisonDecision> : {};
  } catch {
    return {};
  }
}

function normalizedEntityName(value: string) {
  return value.toLocaleLowerCase().replace(/[^\p{L}\p{N}]+/gu, "").trim();
}

function comparisonDecisionId(reviewId: string, comparisonReviewId: string, period: string, concept: string) {
  return [reviewId, comparisonReviewId, period, concept].join("::");
}

function latestActivity(review: BalanceSheetReview) {
  return review.review.approvedAt ?? review.review.auditTrail.at(-1)?.at ?? "";
}

function clientIssueCopy(issue: BalanceSheetReview["issues"][number]) {
  switch (issue.code) {
    case "MISSING_PAGE":
      return { title: "A statement page appears to be missing", why: "A missing page can hide balances needed to substantiate the totals.", action: "Please add the complete statement or confirm that the document is intentionally incomplete." };
    case "OCR_REQUIRED":
    case "STATEMENT_PAGE_NOT_FOUND":
      return { title: "I could not read a balance-sheet page", why: "No figures have been invented from an unreadable page.", action: "Please provide a clearer scan or enter the affected values during review." };
    case "OCR_LOW_CONFIDENCE":
      return { title: "Some scanned values need confirmation", why: "The text recognition was not reliable enough for automatic approval.", action: "Please compare the highlighted rows with the source image." };
    case "ACCOUNTING_EQUATION_MISMATCH":
      return { title: "Assets do not reconcile with liabilities and equity", why: "The core accounting equation is not satisfied by the reported or extracted figures.", action: "Please inspect the highlighted totals and correct only confirmed extraction errors." };
    case "NET_ASSETS_MISMATCH":
      return { title: "Reported net assets do not reconcile", why: "Net assets should equal assets minus liabilities.", action: "Please review the reported totals and their source references." };
    case "COMPARATIVE_PERIOD_DISCREPANCY":
    case "OPENING_CLOSING_INCONSISTENCY":
      return { title: "Comparative balances are inconsistent", why: "The same period is reported differently across the supplied documents.", action: "Please identify which source is authoritative or explain the restatement." };
    case "SIGN_ANOMALY":
    case "CLASSIFICATION_ANOMALY":
      return { title: "A balance may have an unusual sign or classification", why: "It may be valid, but it should not pass without human confirmation.", action: "Please inspect the original label, sign, and classification." };
    case "REQUIRED_TOTAL_MISSING":
    case "SUBTOTAL_MISMATCH":
      return { title: "A required total is missing or unsupported", why: "The structured result cannot yet substantiate the statement totals.", action: "Please review the underlying lines and confirm whether the source contains the missing total." };
    default:
      return { title: "This item needs your review", why: issue.message, action: "Please inspect the linked source evidence before approval." };
  }
}

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

function BalanceClientNav({ active, caseCount, onHome, onNew, onCases }: {
  active: BalanceSurface;
  caseCount: number;
  onHome: () => void;
  onNew: () => void;
  onCases: () => void;
}) {
  return (
    <nav aria-label="TenderBalance workspace" className="bs-client-nav">
      <button aria-current={active === "welcome" ? "page" : undefined} onClick={onHome} type="button">Overview</button>
      <button aria-current={active === "intake" || active === "review" ? "page" : undefined} onClick={onNew} type="button">New review</button>
      <button aria-current={active === "cases" ? "page" : undefined} onClick={onCases} type="button">Cases <span>{caseCount}</span></button>
    </nav>
  );
}

export default function BalanceSheetApp() {
  const [surface, setSurface] = useState<BalanceSurface>("welcome");
  const [reviews, setReviews] = useState<BalanceSheetReview[]>(readClientCases);
  const [demoReviews, setDemoReviews] = useState<BalanceSheetReview[]>(syntheticBalanceSheetReviews);
  const [caseContexts, setCaseContexts] = useState<Record<string, string>>(readClientContexts);
  const [comparisonDecisions, setComparisonDecisions] = useState<Record<string, ComparisonDecision>>(readComparisonDecisions);
  const [demoMode, setDemoMode] = useState(false);
  const [intakeReviewIds, setIntakeReviewIds] = useState<string[]>([]);
  const [companyContext, setCompanyContext] = useState("");
  const [selectedReviewId, setSelectedReviewId] = useState("");
  const [selectedLineId, setSelectedLineId] = useState("");
  const [comparisonId, setComparisonId] = useState("");
  const [reviewer, setReviewer] = useState("Finance reviewer");
  const [correctionValue, setCorrectionValue] = useState("");
  const [correctionReason, setCorrectionReason] = useState("");
  const [activePeriod, setActivePeriod] = useState("");
  const [uploadState, setUploadState] = useState<"idle" | "reading" | "error">("idle");
  const [uploadMessage, setUploadMessage] = useState("Processed locally; no file is uploaded or published.");
  const inputRef = useRef<HTMLInputElement>(null);
  const sourceRef = useRef<HTMLElement | null>(null);
  const issuesRef = useRef<HTMLElement | null>(null);
  const lineSectionRef = useRef<HTMLElement | null>(null);
  const inspectorRef = useRef<HTMLElement | null>(null);
  const comparisonRef = useRef<HTMLElement | null>(null);
  const approvalRef = useRef<HTMLElement | null>(null);

  const availableReviews = demoMode ? demoReviews : reviews;
  const review = availableReviews.find((candidate) => candidate.reviewId === selectedReviewId) ?? availableReviews[0];
  const intakeReviews = intakeReviewIds.map((reviewId) => reviews.find((candidate) => candidate.reviewId === reviewId)).filter((candidate): candidate is BalanceSheetReview => Boolean(candidate));
  const selectedLine = review?.lineItems.find((item) => item.id === selectedLineId) ?? review?.lineItems[0];
  const comparisonReview = review
    ? availableReviews.find((candidate) => candidate.reviewId === comparisonId && candidate.reviewId !== review.reviewId)
      ?? availableReviews.find((candidate) => candidate.reviewId !== review.reviewId)
    : undefined;
  const comparison = review && comparisonReview ? compareBalanceSheetReviews(review, comparisonReview) : undefined;
  const reviewEntityKey = normalizedEntityName(review?.statement.reportingEntity ?? "");
  const comparisonEntityKey = normalizedEntityName(comparisonReview?.statement.reportingEntity ?? "");
  const comparisonRelevant = Boolean(review && comparisonReview && (
    (reviewEntityKey && reviewEntityKey === comparisonEntityKey)
    || (caseContexts[review.reviewId] && caseContexts[review.reviewId] === caseContexts[comparisonReview.reviewId])
  ));
  const comparisonConflicts = comparisonRelevant ? comparison?.overlaps.filter((item) => !item.matches) ?? [] : [];
  const unresolvedComparisonConflicts = comparisonConflicts.filter((item) => !comparisonDecisions[comparisonDecisionId(review?.reviewId ?? "", comparisonReview?.reviewId ?? "", item.period, item.concept)]);
  const sortedIssues = review ? [...review.issues].sort((a, b) => severityRank[b.severity] - severityRank[a.severity]) : [];
  const blockingIssues = review?.issues.filter((issue) => issue.severity === "blocking" || issue.severity === "error") ?? [];
  const blockingCount = blockingIssues.length;
  const reviewedCount = review?.lineItems.filter((item) => item.reviewStatus === "approved" || item.reviewStatus === "corrected").length ?? 0;
  const unreviewedItems = review?.lineItems.filter((item) => !["approved", "corrected"].includes(item.reviewStatus)) ?? [];
  const bulkEligibleItems = unreviewedItems.filter((item) => item.confidence >= 0.8);
  const manualReviewItems = unreviewedItems.filter((item) => item.confidence < 0.8);
  const remainingActionCount = blockingCount + unreviewedItems.length + unresolvedComparisonConflicts.length;
  const finalApprovalReady = review ? canApproveStatement(review) && unresolvedComparisonConflicts.length === 0 : false;
  const averageConfidence = review?.lineItems.length ? review.lineItems.reduce((sum, item) => sum + item.confidence, 0) / review.lineItems.length : 0;

  useEffect(() => {
    try {
      window.localStorage.setItem(CLIENT_CASES_STORAGE_KEY, JSON.stringify(reviews));
    } catch {
      // The current session remains usable when browser storage is unavailable.
    }
  }, [reviews]);

  useEffect(() => {
    try {
      window.localStorage.setItem(CLIENT_CONTEXTS_STORAGE_KEY, JSON.stringify(caseContexts));
    } catch {
      // Optional case context remains available for this page when browser storage is unavailable.
    }
  }, [caseContexts]);

  useEffect(() => {
    try {
      const clientReviewIds = new Set(reviews.map((candidate) => candidate.reviewId));
      const clientDecisions = Object.fromEntries(Object.entries(comparisonDecisions).filter(([, decision]) => clientReviewIds.has(decision.reviewId)));
      window.localStorage.setItem(COMPARISON_DECISIONS_STORAGE_KEY, JSON.stringify(clientDecisions));
    } catch {
      // Review decisions remain available for this page when browser storage is unavailable.
    }
  }, [comparisonDecisions, reviews]);

  const replaceReview = (next: BalanceSheetReview) => {
    const replace = (current: BalanceSheetReview[]) => current.map((candidate) => candidate.reviewId === next.reviewId ? next : candidate);
    if (demoMode) setDemoReviews(replace);
    else setReviews(replace);
  };

  const selectReview = (next: BalanceSheetReview) => {
    setSelectedReviewId(next.reviewId);
    setSelectedLineId(next.lineItems[0]?.id ?? "");
    setActivePeriod(next.statement.periods[0] ?? "");
    setCorrectionValue("");
    setCorrectionReason("");
    if (next.reviewId === comparisonId) {
      const alternative = availableReviews.find((candidate) => candidate.reviewId !== next.reviewId);
      if (alternative) setComparisonId(alternative.reviewId);
    }
  };

  const openReview = (next: BalanceSheetReview, asDemo = false) => {
    setDemoMode(asDemo);
    selectReview(next);
    setSurface("review");
  };

  const startNewAnalysis = () => {
    setDemoMode(false);
    setIntakeReviewIds([]);
    setCompanyContext("");
    setSelectedReviewId("");
    setSelectedLineId("");
    setActivePeriod("");
    setUploadState("idle");
    setUploadMessage("Documents are processed locally in this prototype.");
    setSurface("intake");
  };

  const openDemo = () => {
    const firstDemo = demoReviews[0];
    setDemoMode(true);
    setSelectedReviewId(firstDemo.reviewId);
    setSelectedLineId(firstDemo.lineItems[0]?.id ?? "");
    setActivePeriod(firstDemo.statement.periods[0] ?? "");
    setComparisonId(demoReviews[4]?.reviewId ?? demoReviews[1]?.reviewId ?? "");
    setSurface("review");
  };

  const handleFiles = async (files: FileList | File[]) => {
    const suppliedFiles = Array.from(files);
    if (!suppliedFiles.length) return;
    setUploadState("reading");
    setUploadMessage(`Reading ${suppliedFiles.length} document${suppliedFiles.length === 1 ? "" : "s"} locally…`);
    const accepted: BalanceSheetReview[] = [];
    const failures: string[] = [];
    for (const file of suppliedFiles) {
      try {
        accepted.push(await readBalanceSheetFile(file));
      } catch (error) {
        failures.push(`${file.name}: ${error instanceof Error ? error.message : "could not be read"}`);
      }
    }
    const syntheticUploads = accepted.filter(isSyntheticReview);
    const clientAccepted = accepted.filter((candidate) => !isSyntheticReview(candidate));
    if (syntheticUploads.length) setDemoReviews(syntheticUploads);
    if (syntheticUploads.length && !clientAccepted.length) {
      const next = syntheticUploads[0];
      setDemoMode(true);
      setSelectedReviewId(next.reviewId);
      setSelectedLineId(next.lineItems[0]?.id ?? "");
      setActivePeriod(next.statement.periods[0] ?? "");
      setComparisonId(syntheticUploads[1]?.reviewId ?? "");
      setUploadState("idle");
      setUploadMessage("This file identifies itself as a synthetic fixture. It was opened in the separate demo workspace and was not saved as client evidence.");
      setSurface("review");
      return;
    }
    if (clientAccepted.length) {
      setDemoMode(false);
      setReviews((current) => [
        ...clientAccepted,
        ...current.filter((candidate) => !clientAccepted.some((next) => next.reviewId === candidate.reviewId)),
      ]);
      setIntakeReviewIds(clientAccepted.map((candidate) => candidate.reviewId));
      if (companyContext.trim()) {
        setCaseContexts((current) => ({
          ...current,
          ...Object.fromEntries(clientAccepted.map((candidate) => [candidate.reviewId, companyContext.trim()])),
        }));
      }
      const next = clientAccepted[0];
      setSelectedReviewId(next.reviewId);
      setSelectedLineId(next.lineItems[0]?.id ?? "");
      setActivePeriod(next.statement.periods[0] ?? "");
      setUploadState("idle");
      const totalRows = clientAccepted.reduce((sum, candidate) => sum + candidate.lineItems.length, 0);
      const imageOnly = clientAccepted.some((candidate) => candidate.pages.some((page) => page.imageOnly));
      setUploadMessage(imageOnly
        ? `${clientAccepted.length} document${clientAccepted.length === 1 ? " was" : "s were"} accepted. At least one scan needs OCR or manual transcription; no figures were invented.`
        : `I extracted ${totalRows} line items from ${clientAccepted.length} document${clientAccepted.length === 1 ? "" : "s"}. Please confirm what I found.${syntheticUploads.length ? ` ${syntheticUploads.length} synthetic fixture was kept out of client evidence.` : ""}`);
    } else {
      setUploadState("error");
      setUploadMessage(failures.join(" ") || "The supplied documents could not be read.");
    }
    if (clientAccepted.length && failures.length) {
      setUploadMessage(`${clientAccepted.length} document${clientAccepted.length === 1 ? " was" : "s were"} accepted. ${failures.length} could not be read: ${failures.join(" ")}`);
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
    if (!review || !selectedLine || !activePeriod || !correctionReason.trim()) return;
    const parsed = Number(correctionValue.replace(/,/g, ""));
    if (!Number.isFinite(parsed)) return;
    replaceReview(correctLineItemValue(review, selectedLine.id, activePeriod, parsed, correctionReason.trim(), reviewer.trim() || "Unnamed reviewer"));
    setCorrectionValue("");
    setCorrectionReason("");
  };

  const acknowledgeComparisonConflict = (period: string, concept: string) => {
    if (!review || !comparisonReview) return;
    const id = comparisonDecisionId(review.reviewId, comparisonReview.reviewId, period, concept);
    setComparisonDecisions((current) => ({
      ...current,
      [id]: {
        id,
        reviewId: review.reviewId,
        comparisonReviewId: comparisonReview.reviewId,
        period,
        concept,
        action: "acknowledged-and-retained",
        reviewer: reviewer.trim() || "Unnamed reviewer",
        at: new Date().toISOString(),
      },
    }));
  };

  const structuredPackageJson = () => JSON.stringify({
    schemaVersion: "tender-balance-client-package/v1",
    review,
    caseContext: review ? caseContexts[review.reviewId] ?? null : null,
    crossDocumentReview: review && comparisonReview && comparisonRelevant ? {
      comparisonReviewId: comparisonReview.reviewId,
      comparisonDocumentId: comparisonReview.source.documentId,
      discrepancies: comparisonConflicts.map((item) => ({
        period: item.period,
        concept: item.concept,
        leftValue: item.leftValue,
        rightValue: item.rightValue,
        difference: item.difference,
        decision: comparisonDecisions[comparisonDecisionId(review.reviewId, comparisonReview.reviewId, item.period, item.concept)] ?? null,
      })),
    } : null,
  }, null, 2);

  const scrollTo = (target: HTMLElement | null) => {
    target?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const openLineForReview = (lineItemId: string) => {
    const line = review?.lineItems.find((item) => item.id === lineItemId);
    if (!line) return;
    setSelectedLineId(line.id);
    setActivePeriod(line.values[0]?.period ?? review?.statement.periods[0] ?? "");
    setCorrectionValue("");
    setCorrectionReason("");
    window.requestAnimationFrame(() => scrollTo(inspectorRef.current));
  };

  const continueReview = () => {
    if (!review) return;
    const blockingLine = blockingIssues
      .map((issue) => issue.lineItemId)
      .find((lineItemId): lineItemId is string => Boolean(lineItemId && review.lineItems.some((item) => item.id === lineItemId)));
    if (blockingLine) {
      openLineForReview(blockingLine);
      return;
    }
    if (unreviewedItems[0]) {
      openLineForReview(unreviewedItems[0].id);
      return;
    }
    if (blockingIssues.some((issue) => issue.code === "MISSING_PAGE" || issue.code === "OCR_REQUIRED" || issue.code === "STATEMENT_PAGE_NOT_FOUND")) {
      scrollTo(sourceRef.current);
      return;
    }
    if (unresolvedComparisonConflicts.length) {
      scrollTo(comparisonRef.current);
      return;
    }
    scrollTo(issuesRef.current);
  };

  const approveEligibleAndContinue = () => {
    if (!review || !bulkEligibleItems.length) return;
    const updated = approveEligibleLineItems(review, reviewer.trim() || "Unnamed reviewer");
    replaceReview(updated);
    const next = updated.lineItems.find((item) => !["approved", "corrected"].includes(item.reviewStatus));
    if (next) openLineForReview(next.id);
    else window.requestAnimationFrame(() => scrollTo(approvalRef.current));
  };

  const approveSelectedAndContinue = () => {
    if (!review || !selectedLine) return;
    const updated = approveLineItem(review, selectedLine.id, reviewer.trim() || "Unnamed reviewer");
    replaceReview(updated);
    const next = updated.lineItems.find((item) => !["approved", "corrected"].includes(item.reviewStatus));
    if (next) {
      setSelectedLineId(next.id);
      setActivePeriod(next.values[0]?.period ?? updated.statement.periods[0] ?? "");
      setCorrectionValue("");
      setCorrectionReason("");
      window.requestAnimationFrame(() => scrollTo(inspectorRef.current));
    } else {
      window.requestAnimationFrame(() => scrollTo(blockingIssues.length ? issuesRef.current : unresolvedComparisonConflicts.length ? comparisonRef.current : approvalRef.current));
    }
  };

  const approveFinalResult = () => {
    if (!review || !finalApprovalReady) return;
    replaceReview(approveStatement(review, reviewer.trim() || "Unnamed reviewer"));
    window.requestAnimationFrame(() => scrollTo(approvalRef.current));
  };

  const clientNav = (
    <BalanceClientNav
      active={surface}
      caseCount={reviews.length}
      onCases={() => { setDemoMode(false); setSurface("cases"); }}
      onHome={() => { setDemoMode(false); setSurface("welcome"); }}
      onNew={startNewAnalysis}
    />
  );

  if (surface === "welcome") {
    return (
      <main className="bs-page bs-client-start">
        {clientNav}
        <ClientProductManifesto
          eyebrow={<p className="bs-eyebrow"><span /> TENDER APPS · VERIFIED COMPANY EVIDENCE</p>}
          title={<>Raw statements become an<br /><em>approved evidence package.</em></>}
          promise={<>See the finished product first: source-traceable figures, reconciled checks, explicit exceptions, human review, and a retained result for downstream tender work.</>}
          input={(
            <article className="bs-manifesto-input">
              <div className="bs-manifesto-label"><span>01</span><b>WHAT YOU PROVIDE</b></div>
              <div className="bs-raw-document-stack" aria-label="Examples of raw balance-sheet inputs">
                <div><span>PDF</span><b>Balance Sheet.pdf</b><small>Digital statement</small></div>
                <div><span>SCAN</span><b>Statement 2024.jpg</b><small>Image evidence</small></div>
                <div><span>PDF</span><b>Comparative 2025.pdf</b><small>Several periods</small></div>
              </div>
              <div className="bs-input-chips"><span>PDF</span><span>Scans</span><span>Multiple periods</span></div>
            </article>
          )}
          transformation={(
            <div className="bs-manifesto-agent" aria-label="TenderBalance transformation">
              <span className="bs-story-arrow" aria-hidden="true">→</span>
              <div className="bs-agent-core"><small>TENDER APPS</small><strong>Tender<br />Balance</strong></div>
              <ol><li>Read</li><li>Structure</li><li>Validate</li><li>Reconcile</li><li>Review</li></ol>
              <span className="bs-story-arrow" aria-hidden="true">→</span>
            </div>
          )}
          output={(
            <article className="bs-finished-package">
              <div className="bs-manifesto-label"><span>03</span><b>WHAT YOU RECEIVE</b><em>FINISHED PRODUCT</em></div>
              <header>
                <div><small>ILLUSTRATIVE PRODUCT PREVIEW · NOT CLIENT EVIDENCE</small><h2>Reviewed Financial Evidence</h2><p>Illustrative Company Ltd · Balance Sheet · 2025 / 2024</p></div>
                <span className="bs-example-approved">APPROVED EXAMPLE</span>
              </header>
              <div className="bs-output-preview-table" role="table" aria-label="Illustrative structured balance-sheet output">
                <div role="row" className="is-header"><span role="columnheader">Original</span><span role="columnheader">Normalized</span><span role="columnheader">2025</span><span role="columnheader">Trace</span><span role="columnheader">Status</span></div>
                <div role="row"><span role="cell">Cash and cash equivalents</span><span role="cell">Cash & equivalents</span><span role="cell">125,400</span><span role="cell">✓ p.2</span><span role="cell">Verified</span></div>
                <div role="row"><span role="cell">Trade receivables</span><span role="cell">Receivables</span><span role="cell">84,200</span><span role="cell">✓ p.2</span><span role="cell">Verified</span></div>
                <div role="row"><span role="cell">Total assets</span><span role="cell">Total assets</span><span role="cell">481,900</span><span role="cell">✓ p.2</span><span role="cell">Reconciled</span></div>
              </div>
              <ul className="bs-finished-checks" aria-label="Finished evidence package contents">
                <li><span>✓</span> Company & periods structured</li>
                <li><span>✓</span> Original labels preserved</li>
                <li><span>✓</span> Source traceability</li>
                <li><span>✓</span> Arithmetic reconciled</li>
                <li><span>✓</span> Exceptions reported</li>
                <li><span>✓</span> Human-reviewed & versioned</li>
              </ul>
              <div className="bs-package-release"><span>APPROVED RESULT</span><b>Ready for downstream tender analysis</b><i>→</i></div>
            </article>
          )}
          actions={(
            <>
              <p className="bs-manifesto-action-copy"><b>You provide the source.</b><span>TenderBalance guides everything required to reach this finished result.</span></p>
              <button className="bs-primary-action" onClick={startNewAnalysis} type="button">Start financial statement review <span aria-hidden="true">→</span></button>
              <button className="bs-secondary-action" onClick={() => setSurface("cases")} type="button">Open previous cases</button>
            </>
          )}
        />

        <details className="bs-landing-details">
          <summary>How it works, accepted inputs, and scope</summary>
          <div className="bs-client-journey" aria-label="How TenderBalance works">
            <article><span>01</span><strong>Provide evidence</strong><p>Add the balance-sheet document or document set you want reviewed.</p></article>
            <article><span>02</span><strong>Confirm what was found</strong><p>We identify the company, reporting dates, currency, units, language, and comparative columns.</p></article>
            <article><span>03</span><strong>Resolve important questions</strong><p>Missing pages, uncertain OCR, inconsistent totals, and discrepancies become clear client actions.</p></article>
            <article><span>04</span><strong>Approve and retain</strong><p>Approve only after review, export structured evidence, and reopen the saved case later.</p></article>
          </div>
          <section className="bs-trust-boundary">
            <div><span>SCOPE</span><strong>Digitization and validation—not a tender eligibility decision</strong></div>
            <p>The product preserves original reported values and keeps corrections separate. It does not assess income statements, cash flows, audit opinions, financial health, supplier suitability, or final tender eligibility.</p>
            <button onClick={openDemo} type="button">Open a clearly labelled demo</button>
          </section>
        </details>
        <footer className="bs-footer"><span>Tender Apps · TenderBalance</span><span>Private client workspace · no Command Center access</span></footer>
      </main>
    );
  }

  if (surface === "intake") {
    return (
      <main className="bs-page bs-client-intake-page">
        {clientNav}
        <section className="bs-intake-heading">
          <p className="bs-eyebrow"><span /> NEW FINANCIAL STATEMENT REVIEW</p>
          <h1>Provide the evidence.<br /><em>We’ll guide the review.</em></h1>
          <p>You can upload one statement or several related documents. We will extract reliable context from the documents first and ask you to type information only when it cannot be determined confidently.</p>
        </section>

        <ol className="bs-intake-progress" aria-label="Review progress">
          <li className="is-complete"><span>1</span><div><b>Purpose</b><small>Balance-sheet review</small></div></li>
          <li className={intakeReviews.length ? "is-complete" : "is-active"}><span>2</span><div><b>Documents</b><small>Provide source evidence</small></div></li>
          <li className={intakeReviews.length ? "is-active" : ""}><span>3</span><div><b>Confirm</b><small>Check extracted context</small></div></li>
          <li><span>4</span><div><b>Review</b><small>Resolve required items</small></div></li>
          <li><span>5</span><div><b>Approve</b><small>Release structured result</small></div></li>
        </ol>

        <section className="bs-intake-card">
          <header>
            <div><span>DOCUMENT INTAKE</span><h2>What balance-sheet documents do you have?</h2></div>
            <b>{intakeReviews.length ? `${intakeReviews.length} accepted` : "Start here"}</b>
          </header>
          <label className="bs-company-context">
            <span>Company or case context <small>Optional—leave blank if the document identifies the company clearly</small></span>
            <input value={companyContext} onChange={(event) => setCompanyContext(event.target.value)} placeholder="e.g. Supplier legal name or internal case reference" />
          </label>
          <div className={`bs-client-dropzone ${uploadState}`} onDragOver={(event) => event.preventDefault()} onDrop={onDrop}>
            <input ref={inputRef} type="file" multiple accept=".pdf,.txt,.json,.png,.jpg,.jpeg,.tif,.tiff" onChange={onFileChange} />
            <span aria-hidden="true">⇧</span>
            <div><strong>{uploadState === "reading" ? "Reading supplied documents…" : "Add one or several balance sheets"}</strong><p>PDF, TXT, JSON extraction envelope, PNG, JPG, or TIFF. Scans remain subject to OCR/manual review.</p></div>
            <button disabled={uploadState === "reading"} onClick={() => inputRef.current?.click()} type="button">Choose documents</button>
          </div>
          <p aria-live="polite" className={`bs-client-upload-message ${uploadState === "error" ? "is-error" : ""}`}>{uploadMessage}</p>
        </section>

        {intakeReviews.length > 0 && (
          <section className="bs-found-section">
            <header><div><span>WHAT I FOUND</span><h2>Please confirm the extracted context</h2></div><p>Nothing below has been approved yet.</p></header>
            <div className="bs-found-grid">
              {intakeReviews.map((candidate) => {
                const needsAction = candidate.issues.filter((issue) => issue.severity !== "info");
                return (
                  <article key={candidate.reviewId}>
                    <div className="bs-found-document"><span>DOCUMENT</span><strong>{candidate.source.fileName}</strong><small>{candidate.lineItems.length} extracted line items · {candidate.pages.length} source page{candidate.pages.length === 1 ? "" : "s"}</small></div>
                    <dl>
                      <div><dt>Company</dt><dd>{candidate.statement.reportingEntity || "Needs confirmation"}</dd></div>
                      <div><dt>Reporting date</dt><dd>{candidate.statement.reportingDate || "Needs confirmation"}</dd></div>
                      <div><dt>Periods</dt><dd>{candidate.statement.periods.join(" · ") || "Needs confirmation"}</dd></div>
                      <div><dt>Currency / units</dt><dd>{candidate.statement.currency} · {candidate.statement.unitLabel}</dd></div>
                      <div><dt>Language</dt><dd>{candidate.statement.language.toUpperCase()}</dd></div>
                    </dl>
                    {needsAction.length > 0 ? (
                      <div className="bs-client-questions">
                        <b>{needsAction.length} item{needsAction.length === 1 ? " needs" : "s need"} your attention</b>
                        {needsAction.slice(0, 3).map((issue) => {
                          const copy = clientIssueCopy(issue);
                          return <div key={issue.id}><strong>{copy.title}</strong><p>{copy.action}</p></div>;
                        })}
                      </div>
                    ) : <p className="bs-ready-note">No blocking extraction issue was detected. Human review is still required before approval.</p>}
                    <button className="bs-primary-action" onClick={() => openReview(candidate)} type="button">Confirm and open review <span aria-hidden="true">→</span></button>
                  </article>
                );
              })}
            </div>
          </section>
        )}
        <footer className="bs-footer"><span>Tender Apps · TenderBalance</span><span>Documents remain local in this prototype</span></footer>
      </main>
    );
  }

  if (surface === "cases") {
    return (
      <main className="bs-page bs-cases-page">
        {clientNav}
        <section className="bs-cases-heading">
          <div><p className="bs-eyebrow"><span /> SAVED CLIENT WORK</p><h1>Financial statement<br /><em>review cases.</em></h1></div>
          <button className="bs-primary-action" onClick={startNewAnalysis} type="button">Start new review <span aria-hidden="true">→</span></button>
        </section>
        {reviews.length ? (
          <section className="bs-case-list" aria-label="Saved balance-sheet cases">
            <div className="bs-case-list-header"><span>Company / document</span><span>Reporting period</span><span>Currency</span><span>Validation</span><span>Approval</span><span>Activity</span><span /></div>
            {reviews.map((candidate) => {
              const blocking = candidate.issues.filter((issue) => issue.severity === "blocking" || issue.severity === "error").length;
              const activity = latestActivity(candidate);
              return (
                <article key={candidate.reviewId}>
                  <div><strong>{candidate.statement.reportingEntity}</strong><small>{caseContexts[candidate.reviewId] ? `${caseContexts[candidate.reviewId]} · ${candidate.source.fileName}` : candidate.source.fileName}</small></div>
                  <span>{candidate.statement.periods.join(" · ") || candidate.statement.reportingDate}</span>
                  <span>{candidate.statement.currency} · {candidate.statement.unitLabel}</span>
                  <span>{blocking ? `${blocking} blocking` : `${candidate.arithmeticChecks.filter((check) => check.status === "passed").length}/${candidate.arithmeticChecks.length} checks passed`}</span>
                  <StatusBadge status={candidate.review.status} />
                  <span>{activity ? new Date(activity).toLocaleDateString("en-GB") : "—"}</span>
                  <button onClick={() => openReview(candidate)} type="button">Open case</button>
                </article>
              );
            })}
          </section>
        ) : (
          <section className="bs-no-cases"><span aria-hidden="true">□</span><h2>No client cases yet</h2><p>Your first review will appear here after you provide a balance-sheet document. Demo fixtures are kept separate.</p><button className="bs-primary-action" onClick={startNewAnalysis} type="button">Start first review <span aria-hidden="true">→</span></button></section>
        )}
        <footer className="bs-footer"><span>Tender Apps · TenderBalance</span><span>Saved locally for this browser session</span></footer>
      </main>
    );
  }

  if (!review) {
    return (
      <main className="bs-page bs-cases-page">
        {clientNav}
        <section className="bs-no-cases"><h2>No document is open</h2><p>Start a new review and provide the balance-sheet evidence first.</p><button className="bs-primary-action" onClick={startNewAnalysis} type="button">Start review <span aria-hidden="true">→</span></button></section>
      </main>
    );
  }

  return (
    <main className="bs-page">
      {clientNav}
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
          <div><b>Current stage</b><span>{review.review.status === "approved" ? "Client approved" : blockingCount ? "Client action required" : "Human review"}</span></div>
        </aside>
      </section>

      <section className="bs-workspace">
        <aside className="bs-source-rail" ref={sourceRef}>
          <div className="bs-panel-heading">
            <span>01 / SOURCE</span>
            <b>{availableReviews.length} documents</b>
          </div>
          <div
            className={`bs-dropzone ${uploadState}`}
            onDragOver={(event) => event.preventDefault()}
            onDrop={onDrop}
          >
            <input ref={inputRef} type="file" multiple accept=".pdf,.txt,.json,.png,.jpg,.jpeg,.tif,.tiff" onChange={onFileChange} />
            <span aria-hidden="true">⇧</span>
            <strong>{uploadState === "reading" ? "Reading document…" : "Add balance sheet"}</strong>
            <p>Digital PDF, TXT, image, or JSON extraction envelope</p>
            <button type="button" disabled={uploadState === "reading"} onClick={() => inputRef.current?.click()}>Choose file</button>
          </div>
          <p className={`bs-upload-note ${uploadState === "error" ? "is-error" : ""}`}>{uploadMessage}</p>
          <div className="bs-document-list" aria-label="Available documents">
            {availableReviews.map((candidate) => {
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
          {(demoMode || isSyntheticReview(review)) && (
            <div className="bs-synthetic-banner"><b>SYNTHETIC FIXTURE</b><span>This record is a test simulation, not real client evidence.</span></div>
          )}

          <section className="bs-document-header">
            <div>
              <span>REPORTING ENTITY</span>
              <h2>{review.statement.reportingEntity}</h2>
              <p>{review.source.fileName}{caseContexts[review.reviewId] ? ` · ${caseContexts[review.reviewId]}` : ""}</p>
            </div>
            <div className="bs-header-status">
              <StatusBadge status={review.review.status} />
              <small>{review.review.status === "approved" ? `Approved by ${review.review.reviewer ?? "reviewer"}` : "Not approved for downstream use"}</small>
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

          <section className={`bs-result-overview ${review.review.status === "approved" ? "is-approved" : blockingCount ? "needs-action" : "is-reviewing"}`}>
            <div>
              <span>CLIENT RESULT</span>
              <h3>{review.review.status === "approved" ? "This structured statement is approved." : blockingCount ? "Your review is needed before this result can be approved." : "The statement was structured successfully and is ready for human review."}</h3>
              <p>
                {review.source.fileName} contains {review.statement.periods.length || "unconfirmed"} reporting period{review.statement.periods.length === 1 ? "" : "s"} and {review.lineItems.length} extracted line items.
                {blockingCount ? ` ${blockingCount} blocking validation item${blockingCount === 1 ? " remains" : "s remain"}.` : " No blocking validation issue is currently open."}
                {review.review.status === "approved" ? " The reviewed result is available for export and downstream tender analysis." : " Original reported figures remain separate from any client corrections."}
              </p>
            </div>
            <dl>
              <div><dt>Documents processed</dt><dd>1</dd></div>
              <div><dt>Arithmetic</dt><dd>{review.arithmeticChecks.filter((check) => check.status === "passed").length}/{review.arithmeticChecks.length} passed</dd></div>
              <div><dt>Client review</dt><dd>{reviewedCount}/{review.lineItems.length} rows</dd></div>
              <div><dt>Release status</dt><dd>{review.review.status === "approved" ? "Approved" : "Not approved"}</dd></div>
            </dl>
          </section>

          <section className="bs-issues-panel" ref={issuesRef}>
            <div className="bs-section-title">
              <div><span>02 / EXCEPTIONS</span><h3>Review issues</h3></div>
              <b>{review.issues.length}</b>
            </div>
            {sortedIssues.length ? (
              <div className="bs-issue-list">
                {sortedIssues.map((issue) => {
                  const copy = clientIssueCopy(issue);
                  return (
                    <article className={`severity-${issue.severity}`} key={issue.id}>
                      <span>{issue.severity}</span>
                      <div>
                        <b>{copy.title}</b><p>{copy.why}</p><strong className="bs-issue-action">Next: {copy.action}</strong>
                        <button className="bs-open-issue" type="button" onClick={() => issue.lineItemId ? openLineForReview(issue.lineItemId) : scrollTo(sourceRef.current)}>{issue.lineItemId ? "Inspect linked row →" : "Open source documents →"}</button>
                      </div>
                      <small>{issue.sourceRefs.length ? `p.${Array.from(new Set(issue.sourceRefs.map((ref) => ref.page))).join(", ")}` : "document-level"}</small>
                    </article>
                  );
                })}
              </div>
            ) : <p className="bs-empty-state">No validation issue detected. Human review is still required before approval.</p>}
          </section>

          <section className="bs-line-section" ref={lineSectionRef}>
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
            <article className="bs-line-inspector" ref={inspectorRef} tabIndex={-1}>
              <div className="bs-section-title"><div><span>04 / HUMAN REVIEW</span><h3>Inspect selected value</h3></div></div>
              {selectedLine ? (
                <>
                  <div className="bs-review-sequence" aria-live="polite">
                    <span>HUMAN REVIEW</span>
                    <b>{unreviewedItems.length ? `Item ${Math.min(reviewedCount + 1, review.lineItems.length)} of ${review.lineItems.length}` : `${review.lineItems.length} of ${review.lineItems.length} reviewed`}</b>
                    <i><span style={{ width: `${review.lineItems.length ? (reviewedCount / review.lineItems.length) * 100 : 0}%` }} /></i>
                  </div>
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
                  {!["approved", "corrected"].includes(selectedLine.reviewStatus) ? (
                    <button className="bs-approve-line" type="button" onClick={approveSelectedAndContinue}>Mark reviewed and continue →</button>
                  ) : (
                    <button className="bs-approve-line is-complete" type="button" onClick={() => {
                      const next = unreviewedItems.find((item) => item.id !== selectedLine.id);
                      if (next) openLineForReview(next.id);
                      else scrollTo(approvalRef.current);
                    }}>Reviewed ✓ {unreviewedItems.length ? "· Next unresolved →" : "· Return to approval →"}</button>
                  )}
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

          <section className="bs-compare-section" ref={comparisonRef}>
            <div className="bs-section-title bs-compare-title">
              <div><span>06 / CROSS-DOCUMENT CHECK</span><h3>Compare periods and documents</h3></div>
              <select value={comparisonReview?.reviewId ?? ""} onChange={(event) => setComparisonId(event.target.value)} aria-label="Comparison document">
                {availableReviews.filter((candidate) => candidate.reviewId !== review.reviewId).map((candidate) => <option value={candidate.reviewId} key={candidate.reviewId}>{candidate.statement.reportingEntity} · {candidate.statement.reportingDate}</option>)}
              </select>
            </div>
            {comparisonReview && !comparisonRelevant ? (
              <div className="bs-comparison-scope-note">
                <span>NOT AN APPROVAL COMPARISON</span>
                <div><b>The selected documents identify different reporting entities.</b><p>{review.statement.reportingEntity} and {comparisonReview.statement.reportingEntity} are not reconciled as one company. Select a related document to perform a mandatory cross-document review.</p></div>
              </div>
            ) : comparison && comparison.overlaps.length ? (
              <div className="bs-comparison-grid">
                <div className="bs-comparison-summary">
                  <span>OVERLAPPING PERIODS</span>
                  <b>{comparison.overlaps.filter((item) => item.matches).length} matched · {comparisonConflicts.length} discrepancies</b>
                  <p>{comparisonReview?.source.fileName}</p>
                  {unresolvedComparisonConflicts.length > 0 && <strong>{unresolvedComparisonConflicts.length} require acknowledgement</strong>}
                </div>
                <div className="bs-comparison-rows">
                  {comparison.overlaps.map((item) => {
                    const decision = comparisonDecisions[comparisonDecisionId(review.reviewId, comparisonReview?.reviewId ?? "", item.period, item.concept)];
                    return (
                      <div className={item.matches ? "is-match" : decision ? "is-reviewed-conflict" : "is-conflict"} key={`${item.period}:${item.concept}`}>
                        <span>{item.period}</span><b>{conceptLabels[item.concept]}</b><small>{formatAmount(item.leftValue, review.statement.currency)} ↔ {formatAmount(item.rightValue, comparisonReview?.statement.currency ?? "")}</small>
                        {item.matches ? <em>MATCH</em> : decision ? <em>REVIEWED ✓</em> : <div className="bs-conflict-action"><i>Δ {item.difference.toLocaleString("en-US")}</i><button type="button" onClick={() => acknowledgeComparisonConflict(item.period, item.concept)}>Acknowledge & retain</button></div>}
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : <p className="bs-empty-state">The selected documents have no overlapping period/concept values. Nothing was inferred.</p>}
          </section>

          {review.review.status !== "approved" && (
            <section className={`bs-approval-readiness ${finalApprovalReady ? "is-ready" : "needs-action"}`} aria-live="polite">
              <header>
                <div><span>BEFORE THIS RESULT CAN BE APPROVED</span><h3>{finalApprovalReady ? "Review complete — ready for approval." : `${remainingActionCount} required action${remainingActionCount === 1 ? "" : "s"} remaining`}</h3></div>
                <b>{finalApprovalReady ? "READY" : `${reviewedCount}/${review.lineItems.length} ROWS`}</b>
              </header>
              <div className="bs-readiness-body">
                <ul>
                  <li className="is-complete"><span>✓</span><div><b>Documents processed</b><small>{review.source.fileName}</small></div></li>
                  <li className="is-complete"><span>✓</span><div><b>Company and periods identified</b><small>{review.statement.reportingEntity} · {review.statement.periods.join(" / ")}</small></div></li>
                  <li className={blockingCount ? "is-required" : "is-complete"}><span>{blockingCount ? "!" : "✓"}</span><div><b>{blockingCount ? `${blockingCount} blocking validation item${blockingCount === 1 ? "" : "s"}` : "No blocking validation issues"}</b><small>{blockingCount ? "Correct a confirmed extraction error or provide the missing/clearer source." : "Arithmetic and required totals are clear for release."}</small></div></li>
                  <li className={unreviewedItems.length ? "is-required" : "is-complete"}><span>{unreviewedItems.length ? "!" : "✓"}</span><div><b>{unreviewedItems.length ? `${unreviewedItems.length} row${unreviewedItems.length === 1 ? "" : "s"} still require review` : "Every row has been reviewed"}</b><small>{bulkEligibleItems.length ? `${bulkEligibleItems.length} meet the ≥80% bulk-confirm threshold; ${manualReviewItems.length} require individual inspection.` : manualReviewItems.length ? `${manualReviewItems.length} require individual inspection.` : "Original and corrected values remain distinct."}</small></div></li>
                  <li className={unresolvedComparisonConflicts.length ? "is-required" : "is-complete"}><span>{unresolvedComparisonConflicts.length ? "!" : "✓"}</span><div><b>{unresolvedComparisonConflicts.length ? `${unresolvedComparisonConflicts.length} cross-document discrepanc${unresolvedComparisonConflicts.length === 1 ? "y requires" : "ies require"} acknowledgement` : "Cross-document review is complete"}</b><small>{!comparisonRelevant && comparisonReview ? "The selected comparison belongs to a different reporting entity and does not block this case." : comparisonConflicts.length ? `${comparisonConflicts.length} reported difference${comparisonConflicts.length === 1 ? " was" : "s were"} reviewed or remain explicit; none is silently corrected.` : "No overlapping discrepancy is currently detected."}</small></div></li>
                </ul>
                <div className="bs-next-action">
                  <span>NEXT REQUIRED ACTION</span>
                  <strong>{finalApprovalReady ? "Approve and save the finished evidence package." : blockingCount ? clientIssueCopy(blockingIssues[0]).title : unreviewedItems.length ? `${unreviewedItems.length} extracted row${unreviewedItems.length === 1 ? "" : "s"} await confirmation.` : `${unresolvedComparisonConflicts.length} reported difference${unresolvedComparisonConflicts.length === 1 ? " awaits" : "s await"} acknowledgement.`}</strong>
                  <p>{finalApprovalReady ? "Final approval is now active below." : "TenderBalance will take you directly to the next unresolved item."}</p>
                  {!finalApprovalReady && <button className="is-primary" type="button" onClick={continueReview}>Continue review →</button>}
                  {bulkEligibleItems.length > 0 && <button type="button" onClick={approveEligibleAndContinue}>Accept {bulkEligibleItems.length} agent-validated row{bulkEligibleItems.length === 1 ? "" : "s"}</button>}
                </div>
              </div>
              <ol className="bs-approval-steps" aria-label="Approval sequence">
                <li className={bulkEligibleItems.length ? "is-current" : "is-complete"}><span>A</span><div><b>Accept agent-validated rows</b><small>Optional shortcut for unreviewed rows at or above 80% confidence.</small></div></li>
                <li className={manualReviewItems.length || blockingCount || unresolvedComparisonConflicts.length ? "is-current" : "is-complete"}><span>B</span><div><b>Resolve exceptions manually</b><small>Inspect uncertain rows, acknowledge reported differences, and correct only confirmed extraction errors.</small></div></li>
                <li className={finalApprovalReady ? "is-current" : ""}><span>C</span><div><b>Approve final result</b><small>Activates automatically when blockers, unreviewed rows, and unacknowledged differences reach zero.</small></div></li>
              </ol>
            </section>
          )}

          {review.review.status === "approved" ? (
            <section className="bs-approved-result" ref={approvalRef} tabIndex={-1} aria-live="polite">
              <div className="bs-approved-mark" aria-hidden="true">✓</div>
              <div className="bs-approved-copy">
                <span>REVIEW COMPLETED</span>
                <h3>Financial evidence approved</h3>
                <p>{review.statement.reportingEntity} · {review.statement.periods.join(" / ")} · approved by {review.review.reviewer ?? reviewer}{review.review.approvedAt ? ` on ${new Date(review.review.approvedAt).toLocaleDateString("en-GB")}` : ""}.</p>
                <ul><li>Structured balance sheet retained</li><li>Source traceability preserved</li><li>Arithmetic status recorded</li><li>Exceptions and corrections retained</li></ul>
                <strong>{demoMode ? "Demo result is not stored as client evidence." : "Saved automatically to Cases for this browser."}</strong>
              </div>
              <div className="bs-approved-actions">
                <button className="is-primary" type="button" onClick={() => scrollTo(lineSectionRef.current)}>View approved result</button>
                {!demoMode && <button type="button" onClick={() => setSurface("cases")}>Open saved case</button>}
                <button type="button" onClick={() => download(`${review.source.documentId.replaceAll(":", "-")}.json`, structuredPackageJson(), "application/json")}>Export JSON</button>
                <button type="button" onClick={() => download(`${review.source.documentId.replaceAll(":", "-")}.csv`, reviewToCsv(review), "text/csv;charset=utf-8")}>Export CSV</button>
                <button type="button" onClick={startNewAnalysis}>Start new review</button>
              </div>
            </section>
          ) : (
            <section className="bs-approval-section" ref={approvalRef} tabIndex={-1}>
              <div>
                <span>07 / APPROVAL & RETENTION</span>
                <h3>Release only reviewed structured data</h3>
                <p>Approval confirms transcription and arithmetic review, then saves the result to Cases. Export remains optional. Approval does not determine financial health, tender eligibility, or supplier suitability.</p>
              </div>
              <label className="bs-reviewer"><span>Reviewer</span><input value={reviewer} onChange={(event) => setReviewer(event.target.value)} /></label>
              <div className="bs-approval-actions">
                <button disabled={!bulkEligibleItems.length} title={bulkEligibleItems.length ? `Accept ${bulkEligibleItems.length} unreviewed rows at or above 80% confidence.` : "No unreviewed row currently meets the ≥80% bulk-confirm threshold."} type="button" onClick={approveEligibleAndContinue}>Accept agent-validated rows</button>
                <button className="is-primary" disabled={!finalApprovalReady} title={finalApprovalReady ? "All required reviews are complete." : `Final approval is unavailable: ${blockingCount} blocking validation item${blockingCount === 1 ? "" : "s"}, ${unreviewedItems.length} unreviewed row${unreviewedItems.length === 1 ? "" : "s"}, and ${unresolvedComparisonConflicts.length} unacknowledged cross-document discrepanc${unresolvedComparisonConflicts.length === 1 ? "y" : "ies"} remain.`} type="button" onClick={approveFinalResult}>Approve result</button>
                {!finalApprovalReady && <button className="is-review" type="button" onClick={continueReview}>Review remaining items →</button>}
                <button type="button" onClick={() => download(`${review.source.documentId.replaceAll(":", "-")}.json`, structuredPackageJson(), "application/json")}>Export JSON</button>
                <button type="button" onClick={() => download(`${review.source.documentId.replaceAll(":", "-")}.csv`, reviewToCsv(review), "text/csv;charset=utf-8")}>Export CSV</button>
              </div>
              {!finalApprovalReady && <small className="bs-approval-help"><b>Why approval is locked:</b> {blockingCount} blocking validation item{blockingCount === 1 ? "" : "s"}, {unreviewedItems.length} unreviewed row{unreviewedItems.length === 1 ? "" : "s"}, and {unresolvedComparisonConflicts.length} unacknowledged cross-document discrepanc{unresolvedComparisonConflicts.length === 1 ? "y" : "ies"} remain. Use “Review remaining items” to go directly to the next action.</small>}
            </section>
          )}

          <details className="bs-audit-details">
            <summary>Advanced audit and developer details</summary>
            <div>
              <p><b>Source identity</b><code>SHA-256 {review.source.sha256}</code></p>
              <p><b>Capability owner</b><code>{review.capability.ownerAgentId} · {review.capability.ownerAgentName}</code></p>
              <p><b>Schema</b><code>{review.schemaVersion}</code></p>
              <p><b>Evidence mode</b><code>{review.source.synthetic ? "Synthetic validation fixture" : "Client-supplied local document"}</code></p>
            </div>
          </details>
        </div>
      </section>

      <footer className="bs-footer"><span>Tender Apps · TenderBalance</span><span>{demoMode ? "Demo workspace · never stored as client evidence" : "Private client workspace · no Command Center access"}</span></footer>
    </main>
  );
}

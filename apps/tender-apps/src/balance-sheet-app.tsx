import { useEffect, useRef, useState, type ChangeEvent, type DragEvent } from "react";
import { readBalanceSheetFile } from "../../../packages/tender-balance/src/file-reader.ts";
import { balanceSheetExcelFileName, reviewToExcel } from "../../../packages/tender-balance/src/excel.ts";
import { prepareFin1FromBalanceReview } from "../../../packages/tender-balance/src/fin-forms.ts";
import { formatWholeFinancialFigure, roundFinancialFigure } from "../../../packages/tender-balance/src/financial-rounding.ts";
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
import { AgentRoleCallout } from "./agent-role-callout.tsx";
import { ClientProductManifesto } from "./client-product-manifesto.tsx";
import { PracticalAgentOverviewBoundary } from "./practical-agent-overview.tsx";
import { TrialNotice } from "./trial-notice.tsx";
import {
  balanceNavigationHref,
  isCaseSurface,
  parseBalanceNavigation,
  resolveBalanceCase,
  type BalanceNavigationState,
  type BalanceSurface,
} from "./balance-sheet-navigation.ts";
import { FinFormsWorkspace } from "./fin-forms-workspace.tsx";
import { consumePreloadRecoveryNotice } from "./preload-recovery.ts";
import {
  CollapsibleWorkspaceProvider,
  CollapsibleWorkspaceSection,
  WorkspaceGlobalControls,
} from "./collapsible-workspace.tsx";
import "./balance-sheet.css";

const conceptLabels: Record<string, string> = {
  total_assets: "Total assets",
  total_liabilities: "Total liabilities",
  total_liabilities_and_equity: "Total liabilities & equity",
  owners_equity: "Owners’ equity",
  net_assets: "Net assets",
  current_assets: "Current assets",
  non_current_assets: "Non-current assets",
  current_liabilities: "Current liabilities",
  non_current_liabilities: "Non-current liabilities",
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
  personal_assets: "Personal assets",
  total_assets_including_personal: "Total assets including personal assets",
  personal_liabilities: "Personal liabilities",
  personal_net_worth: "Personal net worth",
  total_liabilities_including_personal: "Total liabilities including personal liabilities",
  total_net_worth_including_personal: "Total net worth including personal assets and liabilities",
  unmapped: "Unmapped",
};

function englishItemLabel(item: BalanceSheetReview["lineItems"][number]) {
  return item.englishLabel || conceptLabels[item.normalizedConcept] || "Translation review required";
}

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

type ExtractionOutcome = "unreadable" | "readable-uncertain" | "financially-inconsistent" | "extracted" | "approved";
type AgentStage = "idle" | "reading" | "extracting" | "structuring" | "checking" | "preparing" | "complete" | "error";

function extractionOutcome(review: BalanceSheetReview): ExtractionOutcome {
  if (review.review.status === "approved") return "approved";
  const codes = new Set(review.issues.map((issue) => issue.code));
  if (!review.lineItems.length && ["OCR_REQUIRED", "STATEMENT_PAGE_NOT_FOUND"].some((code) => codes.has(code as BalanceSheetReview["issues"][number]["code"]))) return "unreadable";
  if (["ACCOUNTING_EQUATION_MISMATCH", "NET_ASSETS_MISMATCH", "SUBTOTAL_MISMATCH"].some((code) => codes.has(code as BalanceSheetReview["issues"][number]["code"]))) return "financially-inconsistent";
  if (review.issues.some((issue) => issue.code === "OCR_LOW_CONFIDENCE" || issue.code === "REQUIRED_TOTAL_MISSING" || issue.code === "CLASSIFICATION_ANOMALY")) return "readable-uncertain";
  return "extracted";
}

function outcomeCopy(review: BalanceSheetReview) {
  const outcome = extractionOutcome(review);
  if (outcome === "approved") return { outcome, title: "This structured statement is approved.", detail: "The reviewed result is retained and ready for export or downstream tender analysis." };
  if (outcome === "unreadable") return { outcome, title: "This page is genuinely unreadable to the current extraction pipeline.", detail: "No figures were invented. Provide a clearer source or transcribe the affected values with source review." };
  if (outcome === "financially-inconsistent") return { outcome, title: "The statement was extracted, but the reported figures do not reconcile.", detail: "This is a financial inconsistency in the extracted evidence—not an OCR failure. The reported values remain unchanged for review." };
  if (outcome === "readable-uncertain") return { outcome, title: "The statement is readable, but some extracted evidence remains uncertain.", detail: "Confirm the highlighted source rows before approval; uncertainty is retained rather than silently resolved." };
  return { outcome, title: "The statement was structured successfully and is ready for human review.", detail: "No blocking extraction or arithmetic issue is currently open." };
}

function isSyntheticReview(review: Partial<BalanceSheetReview>) {
  return review.source?.synthetic === true
    || review.source?.fileName?.toUpperCase().startsWith("SYNTHETIC_") === true
    || review.pages?.some((page) => /SYNTHETIC FIXTURE|NOT CLIENT EVIDENCE/i.test(page.text ?? "")) === true;
}

function fileReadErrorMessage(error: unknown) {
  if (error instanceof Error && error.message.trim()) return error.message.trim();
  if (error && typeof error === "object" && "message" in error) {
    const message = (error as { message?: unknown }).message;
    if (typeof message === "string" && message.trim()) return message.trim();
  }
  if (typeof error === "string" && error.trim()) return error.trim();
  return "could not be read";
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
  return review.review.approvedAt ?? review.source.processedAt ?? review.review.auditTrail.at(-1)?.at ?? "";
}

function hasExtractionPeriodProblem(review: BalanceSheetReview) {
  return prepareFin1FromBalanceReview(review).form.years.length === 0;
}

function resultStatus(review: BalanceSheetReview) {
  const needsSource = review.issues.some((issue) => ["MISSING_PAGE", "OCR_REQUIRED", "STATEMENT_PAGE_NOT_FOUND"].includes(issue.code));
  if (!review.lineItems.length || needsSource) return "Needs source";
  if (hasExtractionPeriodProblem(review)) return "Re-digitization required";
  if (review.issues.some((issue) => issue.severity !== "info")) return "Completed with findings";
  return "Completed";
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
    case "ROUNDING_DIFFERENCE":
      return { title: "Minor reported rounding difference", why: "The source was read successfully, but a reported total differs slightly from the calculated value.", action: "No action is required unless your control policy requires investigation." };
    default:
      return { title: "This item needs your review", why: issue.message, action: "Please inspect the linked source evidence before approval." };
  }
}

function formatAmount(value: number | null | undefined, currency: string, scale = 1) {
  if (value === null || value === undefined) return "—";
  return `${formatWholeFinancialFigure(value, scale)} ${currency}`;
}

function formatReportedAmount(value: { reportedValue: number | null; rawReportedValue: string } | undefined) {
  if (!value || value.reportedValue === null) return "—";
  return formatWholeFinancialFigure(value.reportedValue);
}

function wholeNumberReviewExport(review: BalanceSheetReview) {
  return {
    ...review,
    lineItems: review.lineItems.map((item) => ({
      ...item,
      values: item.values.map((value) => ({
        ...value,
        reportedValue: value.reportedValue === null ? null : roundFinancialFigure(value.reportedValue),
        normalizedValue: value.normalizedValue === null ? null : roundFinancialFigure(value.normalizedValue),
        correction: value.correction ? {
          ...value.correction,
          correctedReportedValue: roundFinancialFigure(value.correction.correctedReportedValue),
          correctedNormalizedValue: roundFinancialFigure(value.correction.correctedNormalizedValue),
        } : undefined,
      })),
    })),
    arithmeticChecks: review.arithmeticChecks.map((check) => ({
      ...check,
      leftValue: check.leftValue === null ? null : roundFinancialFigure(check.leftValue),
      rightValue: check.rightValue === null ? null : roundFinancialFigure(check.rightValue),
      difference: check.difference === null ? null : roundFinancialFigure(check.difference),
    })),
    issues: review.issues.map((issue) => ({
      ...issue,
      difference: issue.difference === undefined ? undefined : roundFinancialFigure(issue.difference),
    })),
  };
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

function downloadBytes(name: string, content: Uint8Array, mimeType: string) {
  const bytes = new Uint8Array(content);
  const url = URL.createObjectURL(new Blob([bytes.buffer], { type: mimeType }));
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = name;
  anchor.click();
  URL.revokeObjectURL(url);
}

function BalanceClientNav({ active, caseCount, onHome, onNew, onCases }: {
  active: BalanceSurface;
  caseCount: number;
  onHome: () => void;
  onNew: () => void;
  onCases: () => void;
}) {
  const casesActive = active === "cases" || isCaseSurface(active);
  return (
    <nav aria-label="TenderBalance Agent pages" className="bs-client-nav">
      <button aria-current={active === "welcome" ? "page" : undefined} onClick={onHome} type="button">Overview</button>
      <button aria-current={active === "intake" ? "page" : undefined} onClick={onNew} type="button">New review</button>
      <button aria-current={casesActive ? "page" : undefined} onClick={onCases} type="button">Cases <span>{caseCount}</span></button>
    </nav>
  );
}

function CaseWorkspaceNav({ review, active, context, demoMode, onCases, onResult, onFin }: {
  review: BalanceSheetReview;
  active: "review" | "fin";
  context?: string;
  demoMode: boolean;
  onCases: () => void;
  onResult: () => void;
  onFin: () => void;
}) {
  const identity = `${review.statement.reportingEntity} · ${review.statement.reportingDate}`;
  return (
    <section aria-label={`Selected case: ${identity}`} className="bs-case-context-bar">
      <div className="bs-case-context-identity">
        <nav aria-label="Case breadcrumb" className="bs-case-breadcrumb">
          <span>TenderBalance</span><i aria-hidden="true">/</i><button onClick={onCases} type="button">Cases</button><i aria-hidden="true">/</i><b>{review.statement.reportingEntity}</b>
        </nav>
        <div><span>{demoMode ? "DEMO CASE" : "SELECTED CASE"}</span><strong>{identity}</strong><small>{context ? `${context} · ${review.source.fileName}` : review.source.fileName}</small></div>
      </div>
      <nav aria-label={`${review.statement.reportingEntity} case outputs`} className="bs-case-output-nav">
        <button aria-current={active === "review" ? "page" : undefined} onClick={onResult} type="button">Result</button>
        <button aria-current={active === "fin" ? "page" : undefined} onClick={onFin} type="button">FIN Forms <span>FIN-1 · FIN-2</span></button>
      </nav>
    </section>
  );
}

export default function BalanceSheetApp() {
  return (
    <CollapsibleWorkspaceProvider>
      <BalanceSheetWorkspace />
    </CollapsibleWorkspaceProvider>
  );
}

function BalanceSheetWorkspace() {
  const [initialNavigation] = useState<BalanceNavigationState>(() => parseBalanceNavigation(window.location.href));
  const [surface, setSurface] = useState<BalanceSurface>(initialNavigation.surface);
  const [reviews, setReviews] = useState<BalanceSheetReview[]>(readClientCases);
  const [demoReviews, setDemoReviews] = useState<BalanceSheetReview[]>(syntheticBalanceSheetReviews);
  const [caseContexts, setCaseContexts] = useState<Record<string, string>>(readClientContexts);
  const [comparisonDecisions, setComparisonDecisions] = useState<Record<string, ComparisonDecision>>(readComparisonDecisions);
  const [demoMode, setDemoMode] = useState(initialNavigation.demo);
  const [companyContext, setCompanyContext] = useState("");
  const [selectedReviewId, setSelectedReviewId] = useState(initialNavigation.caseId);
  const initialReview = resolveBalanceCase(initialNavigation.demo ? demoReviews : reviews, initialNavigation.caseId);
  const [selectedLineId, setSelectedLineId] = useState(initialReview?.lineItems[0]?.id ?? "");
  const [comparisonId, setComparisonId] = useState("");
  const [reviewer, setReviewer] = useState("Finance reviewer");
  const [correctionValue, setCorrectionValue] = useState("");
  const [correctionReason, setCorrectionReason] = useState("");
  const [activePeriod, setActivePeriod] = useState(initialReview?.statement.periods[0] ?? "");
  const [uploadState, setUploadState] = useState<"idle" | "reading" | "error">("idle");
  const [uploadMessage, setUploadMessage] = useState(() => consumePreloadRecoveryNotice() || "Processed locally; no file is uploaded or published.");
  const [agentStage, setAgentStage] = useState<AgentStage>("idle");
  const inputRef = useRef<HTMLInputElement>(null);
  const sourceRef = useRef<HTMLElement | null>(null);
  const issuesRef = useRef<HTMLElement | null>(null);
  const lineSectionRef = useRef<HTMLElement | null>(null);
  const inspectorRef = useRef<HTMLElement | null>(null);
  const comparisonRef = useRef<HTMLElement | null>(null);
  const approvalRef = useRef<HTMLElement | null>(null);

  const availableReviews = demoMode ? demoReviews : reviews;
  const review = resolveBalanceCase(availableReviews, selectedReviewId);
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
  const agentStages: Array<{ id: AgentStage; label: string; detail: string }> = [
    { id: "reading", label: "Reading documents", detail: "Opening supplied pages and locating the financial statement" },
    { id: "extracting", label: "Extracting financial data", detail: "Reading original labels, columns, and reported values" },
    { id: "structuring", label: "Structuring the statement", detail: "Organizing assets, liabilities, equity, periods, and totals" },
    { id: "checking", label: "Checking arithmetic", detail: "Reconciling subtotals and accounting relationships" },
    { id: "preparing", label: "Preparing your result", detail: "Building the digital balance sheet and saving the case" },
  ];
  const activeAgentStageIndex = agentStages.findIndex((stage) => stage.id === agentStage);

  const navigateTo = (next: BalanceNavigationState, mode: "push" | "replace" = "push") => {
    setSurface(next.surface);
    setSelectedReviewId(next.caseId);
    setDemoMode(next.demo);
    const href = balanceNavigationHref(next, window.location.pathname);
    if (mode === "replace") window.history.replaceState(null, "", href);
    else window.history.pushState(null, "", href);
  };

  useEffect(() => {
    const onPopState = () => {
      const next = parseBalanceNavigation(window.location.href);
      setSurface(next.surface);
      setSelectedReviewId(next.caseId);
      setDemoMode(next.demo);
      setSelectedLineId("");
      setActivePeriod("");
      setCorrectionValue("");
      setCorrectionReason("");
    };
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, []);

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
    selectReview(next);
    navigateTo({ surface: "review", caseId: next.reviewId, demo: asDemo });
  };

  const startNewAnalysis = () => {
    setDemoMode(false);
    setCompanyContext("");
    setSelectedReviewId("");
    setSelectedLineId("");
    setActivePeriod("");
    setUploadState("idle");
    setAgentStage("idle");
    setUploadMessage("Documents are processed locally in this prototype.");
    navigateTo({ surface: "intake", caseId: "", demo: false });
  };

  const openDemo = () => {
    const firstDemo = demoReviews[0];
    setSelectedLineId(firstDemo.lineItems[0]?.id ?? "");
    setActivePeriod(firstDemo.statement.periods[0] ?? "");
    setComparisonId(demoReviews[4]?.reviewId ?? demoReviews[1]?.reviewId ?? "");
    navigateTo({ surface: "review", caseId: firstDemo.reviewId, demo: true });
  };

  const handleFiles = async (files: FileList | File[]) => {
    const suppliedFiles = Array.from(files);
    if (!suppliedFiles.length) return;
    setUploadState("reading");
    setAgentStage("reading");
    setUploadMessage(`Reading ${suppliedFiles.length} document${suppliedFiles.length === 1 ? "" : "s"} locally…`);
    const accepted: BalanceSheetReview[] = [];
    const failures: string[] = [];
    for (const file of suppliedFiles) {
      try {
        accepted.push(await readBalanceSheetFile(file, (progress) => {
          const percentage = progress.progress === undefined ? "" : ` · ${Math.round(progress.progress * 100)}%`;
          setUploadMessage(`${progress.label}${percentage}`);
          setAgentStage(progress.stage === "reading" ? "reading" : progress.stage === "structuring" ? "structuring" : "extracting");
        }));
      } catch (error) {
        const message = fileReadErrorMessage(error);
        const readableMessage = /dynamically imported module|importing a module script|modulepreload/i.test(message)
          ? "TenderApps was updated while this page was open. Refresh the page and choose the document again."
          : message;
        failures.push(`${file.name}: ${readableMessage}`);
      }
    }
    const syntheticUploads = accepted.filter(isSyntheticReview);
    const clientAccepted = accepted.filter((candidate) => !isSyntheticReview(candidate));
    if (syntheticUploads.length) setDemoReviews(syntheticUploads);
    if (syntheticUploads.length && !clientAccepted.length) {
      const next = syntheticUploads[0];
      setSelectedReviewId(next.reviewId);
      setSelectedLineId(next.lineItems[0]?.id ?? "");
      setActivePeriod(next.statement.periods[0] ?? "");
      setComparisonId(syntheticUploads[1]?.reviewId ?? "");
      setUploadState("idle");
      setAgentStage("complete");
      setUploadMessage("This file identifies itself as a synthetic fixture. It was opened in the separate demo workspace and was not saved as client evidence.");
      navigateTo({ surface: "review", caseId: next.reviewId, demo: true });
      return;
    }
    if (clientAccepted.length) {
      setReviews((current) => [
        ...clientAccepted,
        ...current.filter((candidate) => !clientAccepted.some((next) => next.reviewId === candidate.reviewId)),
      ]);
      if (companyContext.trim()) {
        setCaseContexts((current) => ({
          ...current,
          ...Object.fromEntries(clientAccepted.map((candidate) => [candidate.reviewId, companyContext.trim()])),
        }));
      }
      const next = clientAccepted[0];
      setSelectedLineId(next.lineItems[0]?.id ?? "");
      setActivePeriod(next.statement.periods[0] ?? "");
      const totalRows = clientAccepted.reduce((sum, candidate) => sum + candidate.lineItems.length, 0);
      const totalValues = clientAccepted.reduce((sum, candidate) => sum + candidate.lineItems.reduce((valueSum, item) => valueSum + item.values.length, 0), 0);
      const needsSource = clientAccepted.some((candidate) => candidate.issues.some((issue) => ["MISSING_PAGE", "OCR_REQUIRED", "STATEMENT_PAGE_NOT_FOUND"].includes(issue.code)));
      const inconsistent = clientAccepted.filter((candidate) => extractionOutcome(candidate) === "financially-inconsistent").length;
      const uncertain = clientAccepted.filter((candidate) => extractionOutcome(candidate) === "readable-uncertain").length;
      setAgentStage("checking");
      setUploadMessage(`Checking ${totalRows} rows and ${totalValues} reported values…`);
      await new Promise((resolve) => window.setTimeout(resolve, 160));
      setAgentStage("preparing");
      setUploadMessage("Preparing the finished digital balance sheet and saving the case…");
      await new Promise((resolve) => window.setTimeout(resolve, 160));
      setUploadState("idle");
      setAgentStage("complete");
      setUploadMessage(needsSource
        ? `${clientAccepted.length} document${clientAccepted.length === 1 ? " was" : "s were"} preserved, but at least one required page remains genuinely unavailable or unreadable. No figures were invented.`
        : `${totalRows} rows and ${totalValues} values were digitized.${inconsistent ? ` ${inconsistent} statement${inconsistent === 1 ? " contains" : "s contain"} reported figures that do not reconcile.` : uncertain ? ` ${uncertain} statement${uncertain === 1 ? " contains" : "s contain"} findings.` : ""} The result was saved automatically.${syntheticUploads.length ? ` ${syntheticUploads.length} synthetic fixture was kept out of client evidence.` : ""}`);
      navigateTo({ surface: "review", caseId: next.reviewId, demo: false });
    } else {
      setUploadState("error");
      setAgentStage("error");
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
    replaceReview(correctLineItemValue(review, selectedLine.id, activePeriod, roundFinancialFigure(parsed), correctionReason.trim(), reviewer.trim() || "Unnamed reviewer"));
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
    review: review ? wholeNumberReviewExport(review) : null,
    caseContext: review ? caseContexts[review.reviewId] ?? null : null,
    crossDocumentReview: review && comparisonReview && comparisonRelevant ? {
      comparisonReviewId: comparisonReview.reviewId,
      comparisonDocumentId: comparisonReview.source.documentId,
      discrepancies: comparisonConflicts.map((item) => ({
        period: item.period,
        concept: item.concept,
        leftValue: roundFinancialFigure(item.leftValue),
        rightValue: roundFinancialFigure(item.rightValue),
        difference: roundFinancialFigure(item.difference),
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
      onCases={() => navigateTo({ surface: "cases", caseId: "", demo: false })}
      onHome={() => navigateTo({ surface: "welcome", caseId: "", demo: false })}
      onNew={startNewAnalysis}
    />
  );

  const caseNav = review && isCaseSurface(surface) ? (
    <CaseWorkspaceNav
      active={surface}
      context={caseContexts[review.reviewId]}
      demoMode={demoMode}
      onCases={() => navigateTo({ surface: "cases", caseId: "", demo: false })}
      onFin={() => navigateTo({ surface: "fin", caseId: review.reviewId, demo: demoMode })}
      onResult={() => navigateTo({ surface: "review", caseId: review.reviewId, demo: demoMode })}
      review={review}
    />
  ) : null;

  if (surface === "welcome") {
    return (
      <main className="bs-page bs-client-start">
        {clientNav}
        <TrialNotice product="balance" productId="product:TA-BALANCE" />
        <ClientProductManifesto
          audience="client"
          eyebrow={<p className="bs-eyebrow"><span /> TENDER APPS · VERIFIED COMPANY EVIDENCE</p>}
          productId="product:TA-BALANCE"
          title={<>Raw statements become<br /><em>tender-ready financial forms.</em></>}
          promise={<>You provide the financial statements. TenderBalance digitizes and reconciles the evidence, maps eligible values, and prepares reviewable FIN-1 and FIN-2 forms for tender use.</>}
          roleCallout={(
            <AgentRoleCallout
              className="bs-role-callout"
              eyebrow="CLIENT FINANCIAL EVIDENCE WORKSPACE"
              imageAlt="Finance analyst calculating and reconciling balance-sheet totals"
              imagePosition="50% 42%"
              imageSrc="/tenderbalance/illustrations/tenderbalance-finance-reviewer.png"
              subtitle="Turn financial statements into traceable, reviewable FIN-1 and FIN-2 forms"
              tags={["#Digitize", "#Map", "#Prepare"]}
              title="Tender financial forms workspace"
              titleId="tenderbalance-role-title"
            />
          )}
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
              <ol><li>Read</li><li>Digitize</li><li>Reconcile</li><li>Map</li><li>Prepare</li></ol>
              <span className="bs-story-arrow" aria-hidden="true">→</span>
            </div>
          )}
          output={(
            <article className="bs-result-receipt">
              <div className="bs-manifesto-label"><span>03</span><b>WHAT YOU RECEIVE</b></div>
              <div className="bs-fin-packet" aria-label="Illustrative output: a reviewable, source-linked tender finance packet containing FIN-1 and FIN-2">
                <div className="bs-fin-packet-folder" aria-hidden="true">
                  <span>TENDER FINANCE</span>
                </div>
                <div className="bs-fin-packet-doc fin-one" aria-hidden="true">
                  <span>FIN-1</span>
                  <b>HISTORICAL<br />PERFORMANCE</b>
                  <i /><i /><i />
                </div>
                <div className="bs-fin-packet-doc fin-two" aria-hidden="true">
                  <span>FIN-2</span>
                  <b>ANNUAL<br />TURNOVER</b>
                  <i /><i /><i />
                </div>
                <strong>READY FOR REVIEW</strong>
              </div>
              <div className="bs-input-chips" aria-label="Output qualities"><span>FIN-1</span><span>FIN-2</span><span>Source-linked</span></div>
            </article>
          )}
          actions={(
            <>
              <p className="bs-manifesto-action-copy"><b>One client action.</b><span>Upload the financial statements; TenderBalance prepares the reviewable tender forms.</span></p>
              <button className="bs-primary-action" onClick={startNewAnalysis} type="button">Prepare tender financial forms <span aria-hidden="true">→</span></button>
              <button className="bs-secondary-action" onClick={() => navigateTo({ surface: "cases", caseId: "", demo: false })} type="button">Open previous cases</button>
            </>
          )}
        />

        <PracticalAgentOverviewBoundary as="details" className="bs-landing-details" productId="product:TA-BALANCE">
          <summary>How it works, accepted inputs, and scope</summary>
          <div className="bs-client-journey" aria-label="How TenderBalance works">
            <article><span>01</span><strong>Upload statements</strong><p>Add one balance sheet or several related source documents.</p></article>
            <article><span>02</span><strong>The agent works</strong><p>TenderBalance identifies, extracts, structures, reconciles, and validates the statement independently.</p></article>
            <article><span>03</span><strong>Receive the result</strong><p>The reconciled evidence Case and reviewable FIN-1 and FIN-2 forms appear in the app and save automatically.</p></article>
            <article><span>04</span><strong>Inspect only if useful</strong><p>Source trace, corrections, comparison, and formal approval remain optional professional controls.</p></article>
          </div>
          <section className="bs-trust-boundary">
            <div><span>SCOPE</span><strong>Financial-form preparation—not a tender eligibility decision</strong></div>
            <p>The product preserves original reported values and keeps corrections separate. It does not assess income statements, cash flows, audit opinions, financial health, supplier suitability, or final tender eligibility.</p>
            <button onClick={openDemo} type="button">Open a clearly labelled demo</button>
          </section>
        </PracticalAgentOverviewBoundary>
        <footer className="bs-footer"><span>Tender Apps · TenderBalance</span><span>Private client workspace · no Command Center access</span></footer>
      </main>
    );
  }

  if (surface === "intake") {
    return (
      <main className="bs-page bs-client-intake-page">
        {clientNav}
        <section className="bs-intake-heading">
          <p className="bs-eyebrow"><span /> NEW DIGITAL BALANCE SHEET</p>
          <h1>Upload the statement.<br /><em>TenderBalance does the work.</em></h1>
          <p>Add one balance sheet or several related documents. The agent will locate the statement, digitize its values, validate the arithmetic, save the case, and open the finished result automatically.</p>
        </section>

        <ol className="bs-intake-progress bs-three-step-progress" aria-label="Digitization progress">
          <li className={uploadState === "reading" ? "is-complete" : "is-active"}><span>1</span><div><b>Upload</b><small>Provide raw statements</small></div></li>
          <li className={uploadState === "reading" ? "is-active" : ""}><span>2</span><div><b>Agent works</b><small>Read · structure · check</small></div></li>
          <li><span>3</span><div><b>Result</b><small>Digital balance sheet</small></div></li>
        </ol>

        <section className="bs-intake-card">
          <header>
            <div><span>YOUR RAW MATERIAL</span><h2>Add the balance-sheet documents</h2></div>
            <b>{uploadState === "reading" ? "Agent working" : "One action"}</b>
          </header>
          <div className={`bs-client-dropzone ${uploadState}`} onDragOver={(event) => event.preventDefault()} onDrop={onDrop}>
            <input ref={inputRef} type="file" multiple accept=".pdf,.txt,.json,.png,.jpg,.jpeg,.tif,.tiff" onChange={onFileChange} />
            <span aria-hidden="true">⇧</span>
            <div><strong>{uploadState === "reading" ? "TenderBalance is working…" : "Drop one or several balance sheets here"}</strong><p>Digital PDF, scan, image, TXT, or structured JSON. The agent processes supplied evidence locally in this prototype.</p></div>
            <button disabled={uploadState === "reading"} onClick={() => inputRef.current?.click()} type="button">Choose documents</button>
          </div>
          <p aria-live="polite" className={`bs-client-upload-message ${uploadState === "error" ? "is-error" : ""}`}>{uploadMessage}</p>
          <details className="bs-optional-context">
            <summary>Add an optional internal company or case reference</summary>
            <label className="bs-company-context">
              <span>Reference <small>Leave blank when the document identifies the entity</small></span>
              <input value={companyContext} onChange={(event) => setCompanyContext(event.target.value)} placeholder="e.g. supplier or internal case reference" />
            </label>
          </details>
        </section>

        {uploadState === "reading" && (
          <section className="bs-agent-progress" aria-live="polite">
            <header><div><span>AGENT WORK</span><h2>TenderBalance is preparing your result</h2></div><b>Automatic</b></header>
            <ol>
              {agentStages.map((stage, index) => {
                const complete = activeAgentStageIndex > index || agentStage === "complete";
                const active = activeAgentStageIndex === index;
                return <li className={complete ? "is-complete" : active ? "is-active" : ""} key={stage.id}><span>{complete ? "✓" : active ? "•" : index + 1}</span><div><b>{stage.label}{active ? "…" : ""}</b><small>{stage.detail}</small></div></li>;
              })}
            </ol>
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
            <div className="bs-case-list-header"><span>Company / document</span><span>Reporting period</span><span>Currency</span><span>Validation</span><span>Result</span><span>Processed</span><span /></div>
            {reviews.map((candidate) => {
              const blocking = candidate.issues.filter((issue) => issue.severity === "blocking" || issue.severity === "error").length;
              const activity = latestActivity(candidate);
              return (
                <article key={candidate.reviewId}>
                  <div><strong>{candidate.statement.reportingEntity}</strong><small>{caseContexts[candidate.reviewId] ? `${caseContexts[candidate.reviewId]} · ${candidate.source.fileName}` : candidate.source.fileName}</small></div>
                  <span>{candidate.statement.periods.join(" · ") || candidate.statement.reportingDate}</span>
                  <span>{candidate.statement.currency} · {candidate.statement.unitLabel}</span>
                  <span>{blocking ? `${blocking} blocking` : `${candidate.arithmeticChecks.filter((check) => check.status === "passed").length}/${candidate.arithmeticChecks.length} checks passed`}</span>
                  <StatusBadge status={resultStatus(candidate).toLocaleLowerCase().replaceAll(" ", "-")} />
                  <span>{activity ? new Date(activity).toLocaleDateString("en-GB") : "—"}</span>
                  <button onClick={() => openReview(candidate)} type="button">Open case</button>
                </article>
              );
            })}
          </section>
        ) : (
          <section className="bs-no-cases"><span aria-hidden="true">□</span><h2>No client cases yet</h2><p>Your first result will be saved here automatically after you provide a balance-sheet document. Demo fixtures are kept separate.</p><button className="bs-primary-action" onClick={startNewAnalysis} type="button">Digitize first statement <span aria-hidden="true">→</span></button></section>
        )}
        <footer className="bs-footer"><span>Tender Apps · TenderBalance</span><span>Saved locally for this browser session</span></footer>
      </main>
    );
  }

  if (!review) {
    return (
      <main className="bs-page bs-cases-page">
        {clientNav}
        <section className="bs-no-cases"><h2>This Case is not available</h2><p>The requested Case was not found in this browser’s saved history. TenderBalance will not substitute the latest Case.</p><div className="bs-welcome-actions"><button className="bs-primary-action" onClick={() => navigateTo({ surface: "cases", caseId: "", demo: false })} type="button">Open Cases <span aria-hidden="true">→</span></button><button className="bs-secondary-action" onClick={startNewAnalysis} type="button">Start new review</button></div></section>
      </main>
    );
  }

  if (surface === "fin") {
    return (
      <main className="bs-page fin-page">
        {clientNav}
        {caseNav}
        <FinFormsWorkspace review={review} demoMode={demoMode} onBackToBalance={() => navigateTo({ surface: "review", caseId: review.reviewId, demo: demoMode })} onStartNewReview={startNewAnalysis} />
      </main>
    );
  }

  if (surface === "review") {
    const valueCount = review.lineItems.reduce((sum, item) => sum + item.values.filter((value) => value.reportedValue !== null).length, 0);
    const passedChecks = review.arithmeticChecks.filter((check) => check.status === "passed").length;
    const roundingFindings = review.issues.filter((issue) => issue.code === "ROUNDING_DIFFERENCE");
    const arithmeticFindingCount = review.issues.filter((issue) => ["ROUNDING_DIFFERENCE", "ACCOUNTING_EQUATION_MISMATCH", "NET_ASSETS_MISMATCH", "SUBTOTAL_MISMATCH"].includes(issue.code)).length;
    const genuineBlockers = review.issues.filter((issue) => ["MISSING_PAGE", "OCR_REQUIRED", "STATEMENT_PAGE_NOT_FOUND"].includes(issue.code));
    const findingCount = review.issues.filter((issue) => issue.severity !== "info").length;
    const statementPages = Array.from(new Set(review.lineItems.flatMap((item) => item.values.map((value) => value.source.page))));
    const hasConcept = (concept: string) => review.lineItems.some((item) => item.normalizedConcept === concept);
    const fin1 = prepareFin1FromBalanceReview(review).form;
    const extractionPeriodProblem = hasExtractionPeriodProblem(review);
    const resultReady = review.lineItems.length > 0 && genuineBlockers.length === 0 && !extractionPeriodProblem;
    const hasReadableRows = review.lineItems.length > 0;

    return (
      <main className="bs-page bs-result-page">
        {clientNav}
        {caseNav}

        {(demoMode || isSyntheticReview(review)) && (
          <div className="bs-synthetic-banner"><b>SYNTHETIC FIXTURE</b><span>This record is a test simulation, not real client evidence.</span></div>
        )}

        <section className={`bs-ready-hero ${genuineBlockers.length ? "needs-source" : "is-ready"}`}>
          <div className="bs-ready-copy">
            <p className="bs-eyebrow"><span /> {genuineBlockers.length ? "SOURCE CLARIFICATION NEEDED" : extractionPeriodProblem ? "EXTRACTION REVIEW REQUIRED" : "PROCESSING COMPLETE"}</p>
            <h1>{resultReady ? <>Your balance sheet<br /><em>is ready.</em></> : extractionPeriodProblem ? <>This saved result needs<br /><em>re-digitization.</em></> : <>TenderBalance needs<br /><em>clearer source evidence.</em></>}</h1>
            <p>{resultReady
              ? `${review.lineItems.length} rows and ${valueCount} reported values were digitized from ${review.source.fileName}. The complete result is available below and ${demoMode ? "remains in the demo workspace" : "was saved automatically to Cases"}.`
              : extractionPeriodProblem
                ? `The saved extraction did not establish a reliable financial year, so it is not safe for FIN-1 mapping. The displayed source rows remain available for audit, but this file must be selected again to run the corrected extractor.`
              : hasReadableRows
                ? `${review.lineItems.length} readable rows were preserved, but TenderBalance cannot safely complete the statement until the requested source evidence is supplied. No values were invented.`
                : "No values were invented. Add a clearer or complete statement and TenderBalance will continue automatically."}</p>
            <div className="bs-ready-actions">
              {resultReady && <button className="bs-primary-action" onClick={() => scrollTo(lineSectionRef.current)} type="button">View digital balance sheet <span aria-hidden="true">↓</span></button>}
              {findingCount > 0 && <button className="bs-secondary-action" onClick={() => scrollTo(issuesRef.current)} type="button">View {findingCount} finding{findingCount === 1 ? "" : "s"}</button>}
              {genuineBlockers.length > 0 && <button className="bs-secondary-action" onClick={() => inputRef.current?.click()} type="button">Add clearer or complete source</button>}
              {extractionPeriodProblem && <button className="bs-primary-action" onClick={startNewAnalysis} type="button">Re-digitize source <span aria-hidden="true">→</span></button>}
            </div>
          </div>
          <aside className="bs-finished-summary" aria-label="Finished result summary">
            <span>{resultReady ? "FINISHED PRODUCT" : extractionPeriodProblem ? "SAVED EXTRACTION — REVIEW REQUIRED" : "PRESERVED PARTIAL RESULT"}</span>
            <strong>{review.statement.reportingEntity}</strong>
            <p>Balance Sheet · {review.statement.reportingDate}</p>
            <dl>
              <div><dt>Rows</dt><dd>{review.lineItems.length}</dd></div>
              <div><dt>Values</dt><dd>{valueCount}</dd></div>
              <div><dt>Checks</dt><dd>{passedChecks}/{review.arithmeticChecks.length}</dd></div>
              <div><dt>Result</dt><dd>{extractionPeriodProblem ? "Re-digitize" : resultStatus(review)}</dd></div>
            </dl>
            <small>{demoMode ? "Demo result · not retained as client evidence" : "Saved automatically · reopen from Cases"}</small>
          </aside>
        </section>

        <section className="bs-result-metadata" aria-label="Statement identity">
          <div><span>Entity</span><b>{review.statement.reportingEntity}</b></div>
          <div><span>Reporting date</span><b>{review.statement.reportingDate}</b></div>
          <div><span>Columns</span><b>{review.statement.periods.join(" · ") || "Unconfirmed"}</b></div>
          <div><span>Currency / units</span><b>{review.statement.currency} · {review.statement.unitLabel}</b></div>
          <div><span>Statement page</span><b>{statementPages.length ? statementPages.join(", ") : "Not located"}</b></div>
        </section>

        <section className="bs-product-health" aria-label="Automatic extraction and validation summary">
          <article><span>EXTRACTION</span><strong>{review.lineItems.length} rows · {valueCount} values</strong><p>{Math.round(averageConfidence * 100)}% average text-recognition confidence</p></article>
          <article><span>STRUCTURE</span><strong>{["total_assets", "current_assets", "non_current_assets", "total_liabilities", "owners_equity"].filter(hasConcept).length}/5 core groups</strong><p>Assets · liabilities · net worth preserved</p></article>
          <article><span>ARITHMETIC</span><strong>{passedChecks} passed · {arithmeticFindingCount} finding{arithmeticFindingCount === 1 ? "" : "s"}</strong><p>{roundingFindings.length ? `${roundingFindings.length} small reported difference${roundingFindings.length === 1 ? "" : "s"} identified` : "Reported totals checked automatically"}</p></article>
          <article><span>CASE</span><strong>{demoMode ? "Demo only" : "Saved automatically"}</strong><p>{review.source.processingVersion ?? "tender-balance/1.0.0"} · {latestActivity(review) ? new Date(latestActivity(review)).toLocaleDateString("en-GB") : "current session"}</p></article>
        </section>

        <WorkspaceGlobalControls />

        <CollapsibleWorkspaceSection
          aside={<><b>{review.lineItems.length}/{review.lineItems.length} rows</b><small>{valueCount}/{valueCount} values</small></>}
          className="bs-digital-statement"
          description={`${review.statement.reportingEntity} · ${review.statement.reportingDate} · original reported values`}
          eyebrow="PRIMARY OUTPUT"
          primary
          ref={lineSectionRef}
          sectionId="balance-sheet-output"
          title="Digitized Balance Sheet"
        >
          {review.lineItems.length ? (
            <div className="bs-table-scroll">
              <table className="bs-client-result-table">
                <thead><tr><th>Section</th><th>Balance item</th>{review.statement.periods.map((period) => <th key={period}>{period}<small>reported</small></th>)}</tr></thead>
                <tbody>
                  {review.lineItems.map((item) => (
                    <tr className={item.isTotal ? "is-total" : ""} key={item.id}>
                      <td><span>{item.classification.replaceAll("_", " ")}</span></td>
                      <td><b>{englishItemLabel(item)}</b>{item.originalLabel !== englishItemLabel(item) && <small>Source: {item.originalLabel}</small>}{item.values.some((value) => value.correction) && <small>Correction retained separately</small>}</td>
                      {review.statement.periods.map((period) => {
                        const value = item.values.find((candidate) => candidate.period === period);
                        return <td className={value?.correction ? "is-corrected" : ""} key={period}><b>{formatReportedAmount(value)}</b>{value?.correction && <small>corrected: {formatWholeFinancialFigure(value.correction.correctedReportedValue)}</small>}</td>;
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : <p className="bs-empty-state">No balance-sheet rows could be read from the supplied source.</p>}
        </CollapsibleWorkspaceSection>

        <CollapsibleWorkspaceSection
          aside={<b>{genuineBlockers.length ? `${genuineBlockers.length} source request${genuineBlockers.length === 1 ? "" : "s"}` : "Result available"}</b>}
          className="bs-findings-summary"
          eyebrow="AUTOMATIC VALIDATION"
          ref={issuesRef}
          sectionId="automatic-validation"
          title={findingCount ? `${findingCount} finding${findingCount === 1 ? "" : "s"} reported` : "No validation finding detected"}
        >
          <div className="bs-validation-checks">
            <article><span>✓</span><div><b>Statement located</b><p>{statementPages.length ? `Source page ${statementPages.join(", ")}` : "Location unavailable"}</p></div></article>
            <article><span>✓</span><div><b>Original figures preserved</b><p>No reported value was silently altered</p></div></article>
            <article className={arithmeticFindingCount ? "has-finding" : ""}><span>{arithmeticFindingCount ? "△" : "✓"}</span><div><b>Arithmetic checked</b><p>{arithmeticFindingCount ? `${arithmeticFindingCount} reported difference${arithmeticFindingCount === 1 ? "" : "s"} retained` : `${passedChecks} relationships reconciled`}</p></div></article>
            <article className={genuineBlockers.length ? "has-blocker" : ""}><span>{genuineBlockers.length ? "!" : "✓"}</span><div><b>{genuineBlockers.length ? "Specific source evidence needed" : "No balance-sheet correction required"}</b><p>{genuineBlockers.length ? clientIssueCopy(genuineBlockers[0]).action : fin1.readiness.canGenerate ? "The balance result and FIN mappings are available." : "The balance result is available; FIN forms may still require additional historical source evidence."}</p></div></article>
          </div>
          {sortedIssues.length > 0 && (
            <details className="bs-finding-details">
              <summary>View detailed findings</summary>
              <div className="bs-issue-list">
                {sortedIssues.map((issue) => {
                  const copy = clientIssueCopy(issue);
                  return <article className={`severity-${issue.severity}`} key={issue.id}><span>{issue.severity}</span><div><b>{copy.title}</b><p>{issue.message}</p>{genuineBlockers.includes(issue) && <strong className="bs-issue-action">Needed: {copy.action}</strong>}</div><small>{issue.sourceRefs.length ? `p.${Array.from(new Set(issue.sourceRefs.map((ref) => ref.page))).join(", ")}` : "document-level"}</small></article>;
                })}
              </div>
            </details>
          )}
        </CollapsibleWorkspaceSection>

        {resultReady && (
          <section className="fin-next-stage">
            <div><span>NEXT WORKFLOW STAGE</span><h3>Prepare IFI Financial Forms</h3><p>Use the canonical financial dataset to review mappings and generate FIN-1 Historical Performance or FIN-2 Average Annual Turnover.</p></div>
            <div><b>{fin1.readiness.status === "ready" ? "FIN forms ready" : fin1.readiness.status === "partial" ? "FIN forms partially ready" : "Period review needed"}</b><small>{fin1.years.length ? `${fin1.years.join(" · ")} · ${fin1.readiness.missingFields} missing FIN-1 field${fin1.readiness.missingFields === 1 ? "" : "s"}` : "No reliable FIN year available"}</small><button className="bs-primary-action" onClick={() => navigateTo({ surface: "fin", caseId: review.reviewId, demo: demoMode })} type="button">Prepare this Case’s FIN Forms <span aria-hidden="true">→</span></button></div>
          </section>
        )}

        <section className="bs-result-actions-panel">
          <div><span>RESULT OPTIONS</span><h3>The finished product is already saved.</h3><p>Export, inspect source evidence, correct a value, compare documents, or add formal approval only when your workflow requires it.</p></div>
          <div><button className="is-primary" onClick={() => navigateTo({ surface: "cases", caseId: "", demo: false })} type="button">Open Cases</button><button onClick={() => download(`${review.source.documentId.replaceAll(":", "-")}.json`, structuredPackageJson(), "application/json")} type="button">Export JSON</button><button onClick={() => download(`${review.source.documentId.replaceAll(":", "-")}.csv`, reviewToCsv(review), "text/csv;charset=utf-8")} type="button">Export CSV</button><button onClick={() => downloadBytes(balanceSheetExcelFileName(review), reviewToExcel(review), "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")} type="button">Export Excel</button><button onClick={startNewAnalysis} type="button">Digitize another statement</button></div>
        </section>

        <CollapsibleWorkspaceSection
          className="bs-professional-controls"
          contentClassName="bs-professional-body"
          defaultExpanded={false}
          description="Source trace · normalized concepts · corrections · comparison · formal approval"
          eyebrow="OPTIONAL"
          sectionId="advanced-review-audit"
          title="Advanced Review & Audit"
        >
            <section className="bs-advanced-source" ref={sourceRef}>
              <div className="bs-section-title"><div><span>SOURCE EVIDENCE</span><h3>Documents and traceability</h3></div><b>{availableReviews.length}</b></div>
              <div className="bs-advanced-source-grid">
                <div className="bs-document-list">{availableReviews.map((candidate) => <button className={candidate.reviewId === review.reviewId ? "is-active" : ""} key={candidate.reviewId} onClick={() => openReview(candidate, demoMode)} type="button"><i>{candidate.source.synthetic ? "DEMO" : "LOCAL"}</i><strong>{candidate.source.fileName}</strong><span>{candidate.lineItems.length} rows · {candidate.statement.reportingDate}</span><small>{resultStatus(candidate)}</small></button>)}</div>
                <div className={`bs-dropzone ${uploadState}`} onDragOver={(event) => event.preventDefault()} onDrop={onDrop}><input ref={inputRef} type="file" multiple accept=".pdf,.txt,.json,.png,.jpg,.jpeg,.tif,.tiff" onChange={onFileChange} /><span aria-hidden="true">⇧</span><strong>Add related source</strong><p>Extend the case with another statement</p><button disabled={uploadState === "reading"} onClick={() => inputRef.current?.click()} type="button">Choose file</button></div>
              </div>
            </section>

            <section className="bs-line-section">
              <div className="bs-section-title"><div><span>EXTRACTION DETAIL</span><h3>Original and normalized rows</h3></div></div>
              <div className="bs-table-scroll"><table className="bs-line-table"><thead><tr><th>English item / source label</th><th>Normalized concept</th><th>Text confidence / trace</th><th>Professional status</th></tr></thead><tbody>{review.lineItems.map((item) => <tr className={`${item.id === selectedLine?.id ? "is-selected" : ""} ${item.isTotal ? "is-total" : ""}`} key={item.id} onClick={() => { setSelectedLineId(item.id); setActivePeriod(item.values[0]?.period ?? ""); }}><td><button type="button">{englishItemLabel(item)}</button><small>{item.originalLabel} · {item.classification.replaceAll("_", " ")}</small></td><td><b>{conceptLabels[item.normalizedConcept]}</b><code>{item.normalizedConcept}</code></td><td><b>{Math.round(item.confidence * 100)}%</b><small>p.{item.values[0]?.source.page ?? "—"}</small></td><td><StatusBadge status={item.reviewStatus} /></td></tr>)}</tbody></table></div>
            </section>

            <section className="bs-review-grid">
              <article className="bs-line-inspector" ref={inspectorRef} tabIndex={-1}>
                <div className="bs-section-title"><div><span>OPTIONAL CORRECTION</span><h3>Inspect or correct selected row</h3></div></div>
                {selectedLine ? <><div className="bs-inspector-head"><div><span>ENGLISH / ORIGINAL LABEL</span><b>{englishItemLabel(selectedLine)}</b><small>{selectedLine.originalLabel}</small></div><StatusBadge status={selectedLine.reviewStatus} /></div><div className="bs-value-pair">{selectedLine.values.map((value) => <button className={value.period === activePeriod ? "is-active" : ""} key={value.period} onClick={() => setActivePeriod(value.period)} type="button"><span>{value.period}</span><b>{formatReportedAmount(value)}</b><small>normalized: {formatAmount(value.normalizedValue, review.statement.currency)}</small></button>)}</div><div className="bs-provenance-card"><span>SOURCE TRACE</span><code>{review.source.fileName} · p.{selectedLine.values.find((value) => value.period === activePeriod)?.source.page ?? selectedLine.values[0]?.source.page}</code><p>“{selectedLine.originalLabel}” · {selectedLine.values[0]?.source.extractionMethod} · {Math.round(selectedLine.confidence * 100)}% text confidence</p></div><div className="bs-correction-form"><label><span>Corrected whole value in reported units</span><input inputMode="numeric" value={correctionValue} onChange={(event) => setCorrectionValue(event.target.value)} placeholder="e.g. 12,500" /></label><label><span>Reason — required</span><input value={correctionReason} onChange={(event) => setCorrectionReason(event.target.value)} placeholder="What was wrong in extraction?" /></label><button type="button" disabled={!correctionReason.trim() || !Number.isFinite(Number(correctionValue.replace(/,/g, "")))} onClick={submitCorrection}>Record correction</button><p>The exact source token remains immutable; the client figure is rounded to the nearest whole reported unit.</p></div></> : <p className="bs-empty-state">No line item is available.</p>}
              </article>
              <article className="bs-checks-card"><div className="bs-section-title"><div><span>ARITHMETIC EVIDENCE</span><h3>Reported vs calculated</h3></div></div><div className="bs-check-list">{review.arithmeticChecks.map((check) => <div className={`check-${check.status}`} key={check.id}><span>{check.status === "passed" ? "✓" : check.status === "failed" ? "!" : "—"}</span><div><b>{check.formula}</b><small>{check.period}</small><p>{formatAmount(check.leftValue, review.statement.currency)} <i>vs</i> {formatAmount(check.rightValue, review.statement.currency)}</p></div></div>)}</div></article>
            </section>

            <section className="bs-compare-section" ref={comparisonRef}>
              <div className="bs-section-title bs-compare-title"><div><span>OPTIONAL COMPARISON</span><h3>Compare periods and documents</h3></div><select value={comparisonReview?.reviewId ?? ""} onChange={(event) => setComparisonId(event.target.value)} aria-label="Comparison document"><option value="">Select another document</option>{availableReviews.filter((candidate) => candidate.reviewId !== review.reviewId).map((candidate) => <option value={candidate.reviewId} key={candidate.reviewId}>{candidate.statement.reportingEntity} · {candidate.statement.reportingDate}</option>)}</select></div>
              {comparison && comparisonRelevant && comparison.overlaps.length ? <div className="bs-comparison-rows">{comparison.overlaps.map((item) => <div className={item.matches ? "is-match" : "is-conflict"} key={`${item.period}:${item.concept}`}><span>{item.period}</span><b>{conceptLabels[item.concept]}</b><small>{formatAmount(item.leftValue, review.statement.currency)} ↔ {formatAmount(item.rightValue, comparisonReview?.statement.currency ?? "")}</small><em>{item.matches ? "MATCH" : `Δ ${formatWholeFinancialFigure(item.difference)}`}</em></div>)}</div> : <p className="bs-empty-state">Select a related document when cross-document comparison is useful.</p>}
            </section>

            <section className="bs-approval-section" ref={approvalRef} tabIndex={-1}>
              <div><span>OPTIONAL FORMAL CONTROL</span><h3>Human review and approval</h3><p>This is not required to receive, save, inspect, or export the result. Use it only when an organizational control policy requires named human approval.</p></div>
              <label className="bs-reviewer"><span>Reviewer</span><input value={reviewer} onChange={(event) => setReviewer(event.target.value)} /></label>
              <div className="bs-approval-actions"><button disabled={!bulkEligibleItems.length} type="button" onClick={approveEligibleAndContinue}>Accept agent-validated rows</button><button className="is-primary" disabled={!finalApprovalReady} type="button" onClick={approveFinalResult}>{review.review.status === "approved" ? "Formally approved" : "Approve formally"}</button></div>
              {!finalApprovalReady && review.review.status !== "approved" && <small className="bs-approval-help">Formal approval requires {blockingCount} blocking validation item{blockingCount === 1 ? "" : "s"}, {unreviewedItems.length} unreviewed row{unreviewedItems.length === 1 ? "" : "s"}, and {unresolvedComparisonConflicts.length} comparison discrepancy acknowledgement{unresolvedComparisonConflicts.length === 1 ? "" : "s"} to reach zero. These controls do not block the client result.</small>}
            </section>

            <details className="bs-audit-details"><summary>Developer and schema details</summary><div><p><b>Source identity</b><code>SHA-256 {review.source.sha256}</code></p><p><b>Processing</b><code>{review.source.processingVersion ?? "tender-balance/1.0.0"} · {latestActivity(review)}</code></p><p><b>Capability owner</b><code>{review.capability.ownerAgentId} · {review.capability.ownerAgentName}</code></p><p><b>Schema</b><code>{review.schemaVersion}</code></p></div></details>
        </CollapsibleWorkspaceSection>

        <footer className="bs-footer"><span>Tender Apps · TenderBalance</span><span>{demoMode ? "Demo workspace · never stored as client evidence" : "Private client workspace · saved automatically"}</span></footer>
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
          <p>No broader income-statement analysis, cash-flow analysis, audit-opinion analysis, eligibility decision, or supplier recommendation.</p>
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
                <button className={active ? "is-active" : ""} key={candidate.reviewId} onClick={() => openReview(candidate, demoMode)} type="button">
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

          <section className={`bs-result-overview outcome-${outcomeCopy(review).outcome} ${review.review.status === "approved" ? "is-approved" : blockingCount ? "needs-action" : "is-reviewing"}`}>
            <div>
              <span>CLIENT RESULT</span>
              <h3>{outcomeCopy(review).title}</h3>
              <p>
                {review.source.fileName} contains {review.statement.periods.length || "unconfirmed"} reporting period{review.statement.periods.length === 1 ? "" : "s"} and {review.lineItems.length} extracted line items.
                {blockingCount ? ` ${blockingCount} blocking validation item${blockingCount === 1 ? " remains" : "s remain"}.` : " No blocking validation issue is currently open."}
                {` ${outcomeCopy(review).detail}`} Original reported figures remain separate from any client corrections.
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
                    <th>English item / original source label</th>
                    <th>Normalized concept</th>
                    {review.statement.periods.map((period) => <th key={period}>{period}<small>reported units</small></th>)}
                    <th>Trace</th>
                    <th>Review</th>
                  </tr>
                </thead>
                <tbody>
                  {review.lineItems.map((item) => (
                    <tr className={`${item.id === selectedLine?.id ? "is-selected" : ""} ${item.isTotal ? "is-total" : ""}`} key={item.id} onClick={() => { setSelectedLineId(item.id); setCorrectionValue(""); setCorrectionReason(""); }}>
                      <td><button type="button">{englishItemLabel(item)}</button><small>{item.originalLabel} · {item.classification.replaceAll("_", " ")}</small></td>
                      <td><b>{conceptLabels[item.normalizedConcept]}</b><code>{item.normalizedConcept}</code></td>
                      {review.statement.periods.map((period) => {
                        const value = item.values.find((candidate) => candidate.period === period);
                        return <td className={value?.correction ? "is-corrected" : ""} key={period}><b>{formatReportedAmount(value)}</b>{value?.correction && <small>corrected → {formatWholeFinancialFigure(value.correction.correctedReportedValue)}</small>}</td>;
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
                  <div className="bs-inspector-head"><div><span>ENGLISH / ORIGINAL LABEL</span><b>{englishItemLabel(selectedLine)}</b><small>{selectedLine.originalLabel}</small></div><StatusBadge status={selectedLine.reviewStatus} /></div>
                  <div className="bs-value-pair">
                    {selectedLine.values.map((value) => (
                      <button className={value.period === activePeriod ? "is-active" : ""} key={value.period} onClick={() => setActivePeriod(value.period)} type="button">
                        <span>{value.period}</span>
                        <b>{formatReportedAmount(value)}</b>
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
                    <label><span>Corrected whole value in reported units</span><input inputMode="numeric" value={correctionValue} onChange={(event) => setCorrectionValue(event.target.value)} placeholder="e.g. 12,500" /></label>
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
                        {item.matches ? <em>MATCH</em> : decision ? <em>REVIEWED ✓</em> : <div className="bs-conflict-action"><i>Δ {formatWholeFinancialFigure(item.difference)}</i><button type="button" onClick={() => acknowledgeComparisonConflict(item.period, item.concept)}>Acknowledge & retain</button></div>}
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
                {!demoMode && <button type="button" onClick={() => navigateTo({ surface: "cases", caseId: "", demo: false })}>Open saved case</button>}
                <button type="button" onClick={() => download(`${review.source.documentId.replaceAll(":", "-")}.json`, structuredPackageJson(), "application/json")}>Export JSON</button>
                <button type="button" onClick={() => download(`${review.source.documentId.replaceAll(":", "-")}.csv`, reviewToCsv(review), "text/csv;charset=utf-8")}>Export CSV</button>
                <button type="button" onClick={() => downloadBytes(balanceSheetExcelFileName(review), reviewToExcel(review), "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")}>Export Excel</button>
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
                <button type="button" onClick={() => downloadBytes(balanceSheetExcelFileName(review), reviewToExcel(review), "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")}>Export Excel</button>
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

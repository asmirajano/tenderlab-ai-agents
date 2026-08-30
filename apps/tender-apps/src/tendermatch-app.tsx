import { useEffect, useMemo, useRef, useState, type KeyboardEvent, type KeyboardEvent as ReactKeyboardEvent, type PointerEvent as ReactPointerEvent, type ReactNode } from "react";
import {
  buildAllMatches,
  chinaRadarClusters,
  createCaseResult,
  demoSnapshot,
  demoSuppliers,
  demoTenders,
  fixtureSupplierKey,
  loadCaseResult,
  paritySummary,
  regionsForSupplier,
  resumeCaseResult,
  saveCaseResult,
  setConsultantDecision,
  supplierActivity,
  supplierRadarCoordinates,
  tenderRadarCoordinates,
  worldRadarClusters,
  type ConsultantDecision,
  type MatchAssessment,
  type SupplierRecord,
  type TenderMatchCaseResult,
  type TenderRecord,
} from "../../../packages/tendermatch/src";
import { PracticalAgentOverview, PracticalAgentOverviewBoundary, PracticalAgentOverviewPart } from "./practical-agent-overview.tsx";

type WorkspaceView =
  | "dashboard"
  | "radar-tenders"
  | "radar-suppliers"
  | "suppliers"
  | "verification"
  | "tenders"
  | "matrix"
  | "match-tenders"
  | "match-suppliers"
  | "audit";

type NavItem = { id: WorkspaceView; label: string; short: string; sublabel: string };
type NavGroupId = "overview" | "market" | "suppliers" | "tender-directory" | "match";
type NavGroup = {
  id: NavGroupId;
  label: string;
  short: string;
  family: "overview" | "intelligence" | "analysis";
  sublabel: string;
  items: NavItem[];
};

const navGroups: NavGroup[] = [
  { id: "overview", label: "Overview", short: "01", family: "overview", sublabel: "Internal matching workspace", items: [{ id: "dashboard", label: "Overview", short: "01", sublabel: "Internal matching workspace" }] },
  { id: "market", label: "Market Radar", short: "02", family: "intelligence", sublabel: "Source discovery", items: [
    { id: "radar-tenders", label: "Tenders", short: "02A", sublabel: "Global demand" },
    { id: "radar-suppliers", label: "Suppliers", short: "02B", sublabel: "Supplier market" },
  ] },
  { id: "suppliers", label: "Suppliers", short: "03", family: "intelligence", sublabel: "Profiles and evidence", items: [
    { id: "suppliers", label: "Profiles", short: "03A", sublabel: "10 companies" },
    { id: "verification", label: "Verification", short: "03B", sublabel: "Evidence + provenance" },
  ] },
  { id: "tender-directory", label: "Tenders", short: "04", family: "intelligence", sublabel: "16 opportunities", items: [{ id: "tenders", label: "Tenders", short: "04", sublabel: "16 opportunities" }] },
  { id: "match", label: "Match Matrix", short: "05", family: "analysis", sublabel: "Evaluate and review", items: [
    { id: "matrix", label: "Full Match Matrix", short: "05A", sublabel: "10 × 16" },
    { id: "match-tenders", label: "AutoMatch by Tenders", short: "05B", sublabel: "Tender-first" },
    { id: "match-suppliers", label: "AutoMatch by Suppliers", short: "05C", sublabel: "Supplier-first" },
    { id: "audit", label: "Detailed Case Review", short: "05D", sublabel: "Identity + decision" },
  ] },
];

const navItems = navGroups.flatMap((group) => group.items);
const workspaceViewIds = new Set<WorkspaceView>(navItems.map((item) => item.id));

export function resolveTenderMatchWorkspaceView(candidate: string | null | undefined): WorkspaceView {
  return candidate && workspaceViewIds.has(candidate as WorkspaceView) ? candidate as WorkspaceView : "dashboard";
}

function initialWorkspaceView(): WorkspaceView {
  if (typeof window === "undefined") return "dashboard";
  const url = new URL(window.location.href);
  const hashView = url.hash.replace(/^#\/?/, "").split("/").at(-1);
  return resolveTenderMatchWorkspaceView(url.searchParams.get("view") ?? hashView);
}

function navGroupForView(view: WorkspaceView) {
  return navGroups.find((group) => group.items.some((item) => item.id === view))!;
}

function activateNavigationFromKeyboard(event: KeyboardEvent<HTMLButtonElement>, action: () => void) {
  if (event.key !== "Enter" && event.key !== " ") return;
  event.preventDefault();
  action();
}

function WorkspaceNavigation({ compact = false, expanded, onToggle, onView, view }: {
  compact?: boolean;
  expanded: Record<NavGroupId, boolean>;
  onToggle: (group: NavGroupId) => void;
  onView: (view: WorkspaceView) => void;
  view: WorkspaceView;
}) {
  return <nav className={`tb3-nav-tree${compact ? " compact" : ""}`} aria-label={compact ? "TenderMatch mobile workflow" : "TenderMatch workflow"}>
    {navGroups.map((group) => {
      const standalone = group.items.length === 1;
      const active = group.items.some((item) => item.id === view);
      if (standalone) {
        const item = group.items[0]!;
        return <button aria-current={active ? "page" : undefined} className={`tb3-nav-standalone family-${group.family}${active ? " active" : ""}`} data-nav-family={group.id} key={group.id} onClick={() => onView(item.id)} onKeyDown={(event) => activateNavigationFromKeyboard(event, () => onView(item.id))}>
          <span>{group.short}</span><p><b>{group.label}</b><small>{group.sublabel}</small></p><i aria-hidden="true">→</i>
        </button>;
      }
      const isExpanded = expanded[group.id];
      return <section className={`tb3-nav-family family-${group.family}${active ? " current" : ""}`} data-nav-family={group.id} key={group.id}>
        <button aria-controls={`tb3-nav-children-${compact ? "mobile-" : ""}${group.id}`} aria-expanded={isExpanded} className="tb3-nav-family-toggle" onClick={() => onToggle(group.id)} onKeyDown={(event) => activateNavigationFromKeyboard(event, () => onToggle(group.id))}>
          <span>{group.short}</span><p><b>{group.label}</b><small>{active ? group.items.find((item) => item.id === view)?.label : group.sublabel}</small></p><i aria-hidden="true">⌄</i>
        </button>
        {isExpanded && <div className="tb3-nav-children" id={`tb3-nav-children-${compact ? "mobile-" : ""}${group.id}`}>
          {group.items.map((item) => <button aria-current={view === item.id ? "page" : undefined} className={view === item.id ? "active" : ""} key={item.id} onClick={() => onView(item.id)} onKeyDown={(event) => activateNavigationFromKeyboard(event, () => onView(item.id))}>
            <span>{item.short.slice(-1)}</span><p><b>{item.label}</b><small>{item.sublabel}</small></p><i aria-hidden="true">→</i>
          </button>)}
        </div>}
      </section>;
    })}
  </nav>;
}

const decisionLabel: Record<ConsultantDecision, string> = { pending: "Pending", approved: "Approved", hold: "On hold", rejected: "Rejected" };
const sourceCommit = "04b0b2a723223d11617837ee0e7562fa48168cd9";
const actorId = "actor:tenderlab-consultant:local-demo";

function slug(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 72);
}

function caseIdFor(tender: TenderRecord, supplier: SupplierRecord) {
  return `case:TM-DEMO:${slug(tender.reference)}:${slug(supplier.id)}`;
}

function matchKey(tender: TenderRecord, supplier: SupplierRecord) {
  return `${tender.reference}::${supplier.id}`;
}

function dateLabel(value: string) {
  return new Intl.DateTimeFormat("en-GB", { day: "2-digit", month: "short", year: "numeric", timeZone: "Asia/Tashkent" }).format(new Date(value));
}

function scoreBand(value: number | null) {
  if (value === null) return "missing";
  if (value >= 85) return "priority";
  if (value >= 70) return "review";
  return "archive";
}

function evidenceStatusClass(status: string) {
  if (["LEGACY_VERIFIED", "REVIEWED"].includes(status)) return "verified";
  if (status === "INFERRED") return "inferred";
  return "unknown";
}

function bestLegacyMatch(matches: MatchAssessment[]) {
  return [...matches].sort((left, right) => (right.matchScore.value ?? -1) - (left.matchScore.value ?? -1))[0];
}

function Metric({ label, value, note, signal = false, onClick }: { label: string; value: string | number; note: string; signal?: boolean; onClick?: () => void }) {
  const content = <><span>{label}</span><b>{value}</b><small>{note}</small>{onClick && <i aria-hidden="true">→</i>}</>;
  return onClick
    ? <button className={`tb3-metric ${signal ? "signal" : ""}`} onClick={onClick}>{content}</button>
    : <div className={`tb3-metric ${signal ? "signal" : ""}`}>{content}</div>;
}

function ViewHeader({ eyebrow, title, description, aside }: { eyebrow: string; title: string; description: string; aside?: ReactNode }) {
  return <header className="tb3-view-head"><div><span>{eyebrow}</span><h1>{title}</h1><p>{description}</p></div>{aside}</header>;
}

function MatchModeTabs({ view, onChange }: { view: WorkspaceView; onChange: (view: WorkspaceView) => void }) {
  return <nav className="tb3-subtabs" aria-label="Match Matrix views">
    <button aria-current={view === "matrix" ? "page" : undefined} className={view === "matrix" ? "active" : ""} onClick={() => onChange("matrix")}><b>Full Match Matrix</b><span>10 suppliers × 16 tenders</span></button>
    <button aria-current={view === "match-tenders" ? "page" : undefined} className={view === "match-tenders" ? "active" : ""} onClick={() => onChange("match-tenders")}><b>AutoMatch by Tenders</b><span>One tender × all suppliers</span></button>
    <button aria-current={view === "match-suppliers" ? "page" : undefined} className={view === "match-suppliers" ? "active" : ""} onClick={() => onChange("match-suppliers")}><b>AutoMatch by Suppliers</b><span>One supplier × all tenders</span></button>
  </nav>;
}

function SupplierTabs({ view, onChange }: { view: WorkspaceView; onChange: (view: WorkspaceView) => void }) {
  return <nav className="tb3-subtabs" aria-label="Supplier views">
    <button aria-current={view === "suppliers" ? "page" : undefined} className={view === "suppliers" ? "active" : ""} onClick={() => onChange("suppliers")}><b>Profiles</b><span>Identity, capabilities and readiness</span></button>
    <button aria-current={view === "verification" ? "page" : undefined} className={view === "verification" ? "active" : ""} onClick={() => onChange("verification")}><b>Verification</b><span>Evidence, confidence and provenance</span></button>
  </nav>;
}

export default function TenderMatchApp() {
  const [sessionNow, setSessionNow] = useState(() => new Date().toISOString());
  const initialMatches = useMemo(() => buildAllMatches(demoTenders, demoSuppliers, sessionNow), [sessionNow]);
  const initialAssessment = initialMatches.find((entry) => entry.auditedMatch.value !== null && entry.tenderFreshness.status !== "closed")
    ?? initialMatches.find((entry) => entry.matchScore.value !== null)
    ?? initialMatches[0];
  const initialTender = demoTenders.find((entry) => entry.id === initialAssessment.tenderId) ?? demoTenders[0];
  const initialSupplier = demoSuppliers.find((entry) => entry.id === initialAssessment.supplierId) ?? demoSuppliers[0];
  const initialResult = useMemo(() => createCaseResult(caseIdFor(initialTender, initialSupplier), initialTender, initialSupplier, sessionNow), []); // eslint-disable-line react-hooks/exhaustive-deps

  const [view, setView] = useState<WorkspaceView>(initialWorkspaceView);
  const [expandedNavGroups, setExpandedNavGroups] = useState<Record<NavGroupId, boolean>>({
    overview: true,
    market: false,
    suppliers: false,
    "tender-directory": true,
    match: false,
  });
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [selectedKey, setSelectedKey] = useState(initialResult.match.key);
  const [caseResults, setCaseResults] = useState<Record<string, TenderMatchCaseResult>>({ [initialResult.match.key]: initialResult });
  const [persistenceMessage, setPersistenceMessage] = useState("Not saved in this browser session");
  const [actionError, setActionError] = useState("");
  const [tenderRadarFilter, setTenderRadarFilter] = useState("All regions");
  const [supplierRadarFilter, setSupplierRadarFilter] = useState("All regions");
  const [tenderRadarZoom, setTenderRadarZoom] = useState(1);
  const [supplierRadarZoom, setSupplierRadarZoom] = useState(1);
  const [replayProgress, setReplayProgress] = useState(100);
  const [isReplaying, setIsReplaying] = useState(false);
  const viewSurfaceRef = useRef<HTMLDivElement>(null);
  const lastFocusedViewRef = useRef<WorkspaceView>("dashboard");

  const allMatches = useMemo(() => buildAllMatches(demoTenders, demoSuppliers, sessionNow), [sessionNow]);
  const matchByKey = useMemo(() => new Map(allMatches.map((entry) => [entry.key, entry])), [allMatches]);
  const result = caseResults[selectedKey] ?? initialResult;
  const tender = demoTenders.find((entry) => entry.id === result.tenderIdentity.id) ?? initialTender;
  const supplier = demoSuppliers.find((entry) => entry.id === result.supplierIdentity.id) ?? initialSupplier;
  const currentAssessment = result.match;
  const tenderMatches = allMatches.filter((entry) => entry.tenderId === tender.id).sort((left, right) => (right.matchScore.value ?? -1) - (left.matchScore.value ?? -1));
  const supplierMatches = allMatches.filter((entry) => entry.supplierId === supplier.id).sort((left, right) => (right.matchScore.value ?? -1) - (left.matchScore.value ?? -1));
  const evaluatedMatches = allMatches.filter((entry) => entry.matchScore.value !== null);
  const priorityMatches = evaluatedMatches.filter((entry) => (entry.matchScore.value ?? -1) >= 85).sort((left, right) => (right.matchScore.value ?? 0) - (left.matchScore.value ?? 0));
  const auditedMatches = allMatches.filter((entry) => entry.auditedMatch.value !== null);
  const evidenceCount = demoSuppliers.reduce((total, entry) => total + entry.evidence.length, 0);
  const sourceCount = new Set(demoTenders.map((entry) => entry.sourceLabel)).size;
  const summary = paritySummary();

  const changeView = (nextView: WorkspaceView) => {
    const activeGroup = navGroupForView(nextView);
    if (activeGroup.items.length > 1) {
      setExpandedNavGroups((current) => current[activeGroup.id] ? current : { ...current, [activeGroup.id]: true });
    }
    setView(nextView);
  };

  const openPair = (nextTender: TenderRecord, nextSupplier: SupplierRecord, nextView?: WorkspaceView) => {
    const nowIso = new Date().toISOString();
    const key = matchKey(nextTender, nextSupplier);
    const existing = caseResults[key];
    const nextResult = existing
      ? resumeCaseResult(existing, nextTender, nextSupplier, nowIso)
      : createCaseResult(caseIdFor(nextTender, nextSupplier), nextTender, nextSupplier, nowIso);
    setSessionNow(nowIso);
    setCaseResults((current) => ({ ...current, [key]: nextResult }));
    setSelectedKey(key);
    setActionError("");
    if (nextView) changeView(nextView);
  };

  const openAssessment = (assessment: MatchAssessment, nextView?: WorkspaceView) => {
    const nextTender = demoTenders.find((entry) => entry.id === assessment.tenderId);
    const nextSupplier = demoSuppliers.find((entry) => entry.id === assessment.supplierId);
    if (nextTender && nextSupplier) openPair(nextTender, nextSupplier, nextView);
  };

  const decide = (decision: ConsultantDecision) => {
    setActionError("");
    try {
      const decidedAt = new Date().toISOString();
      const updated = setConsultantDecision(result, decision, decidedAt, {
        actorId,
        rationale: `Consultant recorded ${decision} through the TenderMatch evidence-review workspace.`,
      });
      setCaseResults((current) => ({ ...current, [selectedKey]: updated }));
    } catch (error) {
      setActionError(error instanceof Error ? error.message : "The decision could not be recorded.");
    }
  };

  const saveCase = () => {
    setActionError("");
    try {
      saveCaseResult(window.localStorage, result);
      setPersistenceMessage(`Saved explicit Case ${result.caseIdentity.id}`);
    } catch (error) {
      setPersistenceMessage("Case remains available in memory; browser persistence failed");
      setActionError(error instanceof Error ? `Case save failed: ${error.message}` : "Case save failed. The current Case remains available in memory.");
    }
  };

  const loadCase = () => {
    setActionError("");
    try {
      const nowIso = new Date().toISOString();
      const saved = loadCaseResult(window.localStorage, result.caseIdentity.id, { tender, supplier, nowIso });
      if (!saved) { setPersistenceMessage("No saved record exists for this explicit Case ID"); return; }
      setSessionNow(nowIso);
      setCaseResults((current) => ({ ...current, [saved.match.key]: saved }));
      setSelectedKey(saved.match.key);
      setPersistenceMessage(`Loaded ${saved.caseIdentity.id} · deadline context recomputed`);
    } catch (error) {
      setActionError(error instanceof Error ? error.message : "The saved Case could not be reconstructed.");
    }
  };

  const runReplay = () => {
    if (isReplaying) return;
    setReplayProgress(0);
    setIsReplaying(true);
  };

  useEffect(() => {
    if (!isReplaying) return;
    const timer = window.setInterval(() => setReplayProgress((current) => {
      const next = Math.min(100, current + 10);
      if (next === 100) setIsReplaying(false);
      return next;
    }), 70);
    return () => window.clearInterval(timer);
  }, [isReplaying]);

  useEffect(() => {
    if (lastFocusedViewRef.current === view) return;
    lastFocusedViewRef.current = view;
    viewSurfaceRef.current?.focus();
  }, [view]);

  const toggleNavGroup = (group: NavGroupId) => {
    setExpandedNavGroups((current) => ({ ...current, [group]: !current[group] }));
  };

  const selectedRadarTenderMatches = allMatches.filter((entry) => entry.tenderId === tender.id);
  const selectedRadarBestMatch = bestLegacyMatch(selectedRadarTenderMatches);
  const visibleTenderClusters = tenderRadarFilter === "All regions" ? worldRadarClusters : worldRadarClusters.filter((entry) => entry.group === tenderRadarFilter);
  const visibleTenders = tenderRadarFilter === "All regions" ? demoTenders : demoTenders.filter((entry) => entry.region === tenderRadarFilter);
  const visibleSupplierClusters = supplierRadarFilter === "All regions" ? chinaRadarClusters : chinaRadarClusters.filter((entry) => entry.group === supplierRadarFilter);
  const visibleSuppliers = supplierRadarFilter === "All regions" ? demoSuppliers : demoSuppliers.filter((entry) => supplierRadarCoordinates[fixtureSupplierKey(entry)]?.group === supplierRadarFilter);

  const caseControls = <section className="tb3-case-strip">
    <div><span>EXPLICIT CASE</span><code>{result.caseIdentity.id}</code><small>{supplier.legalEnglishName} × {tender.reference}</small></div>
    <div><span>AUDITED / LEGACY</span><b>{result.match.auditedMatch.value ?? "MISSING"} <i>/</i> {result.match.matchScore.value ?? "MISSING"}</b><small>{result.match.tenderFreshness.status} · {result.match.tenderFreshness.freshness} · {result.match.tenderFreshness.daysRemaining}d</small></div>
    <div className="tb3-case-actions"><button onClick={saveCase}>Save Case</button><button onClick={loadCase}>Load Case</button><small>{persistenceMessage}</small></div>
  </section>;

  return <main className={`tb3-page ${view === "dashboard" ? "tb3-page-overview" : ""}`}>
    {view !== "dashboard" && <section className="tb3-product-intro">
      <div><p><i /> TENDERAPPS AGENT 03 · INTERNAL MATCHING WORKSPACE</p><h1>Tender<em>Match</em></h1><h2>Company × Tender evidence review for TenderLab Consultants.</h2><span>Select an explicit pair, inspect evidence-linked match support, gaps and freshness, then keep the consultant’s match disposition visible and human-controlled.</span></div>
      <aside><span>OPERATING ROLE</span><b>TL-A031</b><small>Company-to-Tender Match Score Agent · internal consultant workspace</small><strong>MATCH SUPPORT · EVIDENCE REVIEW · HUMAN DISPOSITION</strong></aside>
    </section>}

    <section className="tb3-layout">
      <aside className="tb3-workspace-nav">
        <header><span>WORKFLOW</span><b>TenderMatch workspace</b><small>5 page families · {navItems.length} reachable views</small></header>
        <WorkspaceNavigation expanded={expandedNavGroups} onToggle={toggleNavGroup} onView={changeView} view={view} />
        <div className="tb3-owner-note"><span>CANONICAL OWNER</span><b>agent:TL-A031</b><p>Company-to-Tender Match Score Agent</p><small>Evidence-linked matching and consultant review.</small></div>
      </aside>

      <section className="tb3-content">
        <section className="tb3-mobile-workspace-nav" aria-label="TenderMatch responsive workflow navigation">
          <button aria-controls="tb3-mobile-workflow-tree" aria-expanded={mobileNavOpen} className="tb3-mobile-nav-toggle" onClick={() => setMobileNavOpen((current) => !current)} onKeyDown={(event) => activateNavigationFromKeyboard(event, () => setMobileNavOpen((current) => !current))}>
            <span>WORKFLOW</span><p><b>{navGroupForView(view).short} · {navGroupForView(view).label}</b><small>{navItems.find((entry) => entry.id === view)?.label}</small></p><i aria-hidden="true">⌄</i>
          </button>
          {mobileNavOpen && <div id="tb3-mobile-workflow-tree"><WorkspaceNavigation compact expanded={expandedNavGroups} onToggle={toggleNavGroup} onView={(nextView) => { changeView(nextView); setMobileNavOpen(false); }} view={view} /></div>}
        </section>
        {actionError && <div className="tb3-alert" role="alert"><b>Action needs attention</b><span>{actionError}</span><button onClick={() => setActionError("")} aria-label="Dismiss action error">×</button></div>}

        {view !== "dashboard" && caseControls}

        <div className="tb3-view-surface" ref={viewSurfaceRef} role="region" aria-label={`${navItems.find((entry) => entry.id === view)?.label ?? "TenderMatch"} workspace`} tabIndex={-1}>
          {view === "dashboard" && <DashboardView allMatches={allMatches} auditedMatches={auditedMatches} caseControls={caseControls} evaluatedMatches={evaluatedMatches} evidenceCount={evidenceCount} priorityMatches={priorityMatches} caseResults={caseResults} summaryMissing={summary.missing} sourceCount={sourceCount} onView={changeView} onOpen={openAssessment} />}
          {view === "radar-tenders" && <TenderRadarView tender={tender} currentAssessment={currentAssessment} allMatches={allMatches} bestMatch={selectedRadarBestMatch} filter={tenderRadarFilter} zoom={tenderRadarZoom} clusters={visibleTenderClusters} visibleTenders={visibleTenders} sourceCount={sourceCount} onFilter={setTenderRadarFilter} onZoom={setTenderRadarZoom} onOpen={openAssessment} onView={changeView} />}
          {view === "radar-suppliers" && <SupplierRadarView supplier={supplier} filter={supplierRadarFilter} zoom={supplierRadarZoom} clusters={visibleSupplierClusters} visibleSuppliers={visibleSuppliers} allMatches={allMatches} onFilter={setSupplierRadarFilter} onZoom={setSupplierRadarZoom} onOpen={openAssessment} onView={changeView} />}
          {view === "suppliers" && <SupplierDirectoryView view={view} allMatches={allMatches} onView={changeView} onOpen={openAssessment} />}
          {view === "tenders" && <TenderDirectoryView allMatches={allMatches} onOpen={openAssessment} />}
          {view === "matrix" && <MatrixView view={view} matchByKey={matchByKey} onView={changeView} onOpen={openAssessment} />}
          {(view === "match-tenders" || view === "match-suppliers") && <MatchWorkspaceView view={view} tender={tender} supplier={supplier} result={result} allMatches={allMatches} tenderMatches={tenderMatches} supplierMatches={supplierMatches} caseResults={caseResults} replayProgress={replayProgress} isReplaying={isReplaying} onReplay={runReplay} onView={changeView} onOpen={openAssessment} onDecision={decide} />}
          {view === "verification" && <VerificationView view={view} supplier={supplier} allMatches={allMatches} onView={changeView} onOpen={openAssessment} />}
          {view === "audit" && <AuditView result={result} />}
        </div>
      </section>
    </section>
  </main>;
}

function DashboardView({ allMatches, auditedMatches, caseControls, evaluatedMatches, evidenceCount, priorityMatches, caseResults, summaryMissing, sourceCount, onView, onOpen }: { allMatches: MatchAssessment[]; auditedMatches: MatchAssessment[]; caseControls: ReactNode; evaluatedMatches: MatchAssessment[]; evidenceCount: number; priorityMatches: MatchAssessment[]; caseResults: Record<string, TenderMatchCaseResult>; summaryMissing: number; sourceCount: number; onView: (view: WorkspaceView) => void; onOpen: (assessment: MatchAssessment, view?: WorkspaceView) => void }) {
  const previewAssessment = priorityMatches.find((entry) => entry.auditedMatch.value !== null && entry.tenderFreshness.status !== "closed")
    ?? auditedMatches[0]
    ?? evaluatedMatches[0]
    ?? allMatches[0]!;
  const previewSupplier = demoSuppliers.find((entry) => entry.id === previewAssessment.supplierId) ?? demoSuppliers[0]!;
  const previewTender = demoTenders.find((entry) => entry.id === previewAssessment.tenderId) ?? demoTenders[0]!;
  const previewDecision = caseResults[previewAssessment.key]?.match.consultantDecision ?? previewAssessment.consultantDecision;

  return <>
    <PracticalAgentOverview audience="consultant" className="tb3-overview-manifesto" productId="product:TA-TENDERBOOST" aria-labelledby="tendermatch-overview-title">
      <PracticalAgentOverviewPart as="header" className="tb3-overview-heading" part="outcome-promise">
        <div>
          <span>TENDERMATCH · TENDERLAB CONSULTANT WORKSPACE · AGENT 03</span>
          <h1 id="tendermatch-overview-title">Turn one Tender × Company pair into a <em>reviewable match result.</em></h1>
          <p>TenderMatch is TenderLab Consultants’ internal workspace for comparing a specific supplier or company with a specific tender, explaining the available support and gaps, and keeping the consultant’s judgment explicit.</p>
        </div>
        <aside aria-label="TenderMatch operating role">
          <span>OPERATING ROLE TODAY</span>
          <strong>Internal matching</strong>
          <p>Canonical owner <b>TL-A031</b><br />Company × Tender decision support</p>
          <small>MATCHING SUPPORT · HUMAN-CONTROLLED DISPOSITION</small>
        </aside>
      </PracticalAgentOverviewPart>

      <div className="tb3-overview-story" aria-label="Tender snapshot and company evidence transformed into a reviewable match result">
        <PracticalAgentOverviewPart as="article" className="tb3-story-input" part="input">
          <header><span>01</span><div><b>WHAT YOU PROVIDE</b><small>An explicit pair and its evidence</small></div></header>
          <div className="tb3-input-stack" aria-label="TenderMatch inputs">
            <div><span>TENDER</span><b>Tender snapshot</b><small>Scope · buyer · deadline · source</small></div>
            <div><span>COMPANY</span><b>Supplier profile</b><small>Identity · capability · readiness</small></div>
            <div><span>EVIDENCE</span><b>Supporting records</b><small>Sources · dates · confidence</small></div>
          </div>
          <p>Inputs remain separately identified and dated. An absent evaluation or unsupported value stays <b>MISSING</b>—never silently converted to zero.</p>
        </PracticalAgentOverviewPart>

        <PracticalAgentOverviewPart as="article" className="tb3-story-work" part="agent-transformation">
          <header><span>02</span><div><b>WHAT TENDERMATCH DOES</b><small>Evidence-aware pair review</small></div></header>
          <ol>
            <li><span>1</span><p><b>Select and compare</b><small>One tender with one company</small></p></li>
            <li><span>2</span><p><b>Validate available evidence</b><small>Preserve provenance and MISSING values</small></p></li>
            <li><span>3</span><p><b>Assess and explain</b><small>Strengths, gaps, blockers and freshness</small></p></li>
            <li><span>4</span><p><b>Leave the decision human</b><small>Consultant disposition remains explicit</small></p></li>
          </ol>
        </PracticalAgentOverviewPart>

        <PracticalAgentOverviewPart as="article" className="tb3-story-output" part="finished-output">
          <header><div><span>03 · WHAT YOU RECEIVE</span><small>ILLUSTRATIVE FROZEN OUTPUT · NOT A LIVE DECISION</small></div><b>REVIEWABLE RESULT</b></header>
          <div className="tb3-preview-identities">
            <div><span>COMPANY</span><strong>{previewSupplier.legalEnglishName}</strong><small>{supplierActivity(previewSupplier)}</small></div>
            <i aria-hidden="true">×</i>
            <div><span>TENDER</span><strong>{previewTender.title}</strong><small>{previewTender.reference} · {previewTender.country}</small></div>
          </div>
          <dl className="tb3-preview-metrics">
            <div><dt>AUDITED MATCH SUPPORT</dt><dd>{previewAssessment.auditedMatch.value ?? "MISSING"}<small>{previewAssessment.auditedMatch.value === null ? "Insufficient linked evidence" : `${previewAssessment.auditedMatch.valueClass} · ${previewAssessment.auditedMatch.policyVersion}`}</small></dd></div>
            <div><dt>LINKED EVIDENCE</dt><dd>{previewAssessment.auditedMatch.evidenceIds.length}<small>{previewAssessment.auditedMatch.evidenceIds.length ? "Traceable record identities" : "MISSING"}</small></dd></div>
            <div><dt>DEADLINE FRESHNESS</dt><dd>{previewAssessment.tenderFreshness.status}<small>{dateLabel(previewTender.deadlineAt)} · {previewAssessment.tenderFreshness.freshness}</small></dd></div>
            <div><dt>CONSULTANT DECISION</dt><dd>{decisionLabel[previewDecision]}<small>Human-controlled match disposition</small></dd></div>
          </dl>
          <div className="tb3-preview-findings">
            <div><span>MATCH SUPPORT</span>{previewAssessment.linkedStrengths.slice(0, 2).map((claim) => <p key={claim.id}>✓ {claim.text}<small>{claim.evidenceIds.join(" · ")}</small></p>)}</div>
            <div><span>MISSING / BLOCKERS</span>{previewAssessment.gaps.slice(0, 2).map((gap) => <p key={gap}>? {gap}</p>)}</div>
          </div>
          <p className="tb3-preview-note">Legacy Match Score {previewAssessment.matchScore.value ?? "MISSING"} remains a separate historical estimate. Readiness, evidence quality, freshness, audited support, and consultant decision are not blended into one claim.</p>
        </PracticalAgentOverviewPart>
      </div>

      <PracticalAgentOverviewPart as="footer" className="tb3-overview-actions" part="primary-action">
        <div><strong>Review one evidence-linked match result.</strong><span>Open a pair, inspect gaps and freshness, and retain the consultant disposition as a separate human judgment.</span></div>
        <div>
          <button className="primary" type="button" onClick={() => onOpen(previewAssessment, "match-tenders")} onKeyDown={(event) => {
            if (event.key === "Enter" || event.key === " ") {
              event.preventDefault();
              onOpen(previewAssessment, "match-tenders");
            }
          }}>Open existing match for review <span aria-hidden="true">→</span></button>
          <button type="button" onClick={() => onView("matrix")}>Open Full Matrix</button>
        </div>
      </PracticalAgentOverviewPart>
    </PracticalAgentOverview>

    <PracticalAgentOverviewBoundary className="tb3-overview-method" productId="product:TA-TENDERBOOST" aria-label="How TenderMatch works and where its authority ends">
        <div>
          <span>HOW IT WORKS</span>
          <ol><li><b>1</b>Select an explicit pair</li><li><b>2</b>Review linked evidence</li><li><b>3</b>Explain support and gaps</li><li><b>4</b>Record consultant disposition</li></ol>
        </div>
        <aside>
          <span>DOWNSTREAM BOUNDARY</span>
          <strong>Promotion and outreach belong to a separate future Marketing Agent.</strong>
          <p>TenderMatch ends with a reviewable match result and human-controlled consultant disposition.</p>
        </aside>
    </PracticalAgentOverviewBoundary>

    {caseControls}

    <header className="tb3-demonstration-heading">
      <span>DEMONSTRATION DATA AND MIGRATION EVIDENCE</span>
      <h2>TenderMatch frozen matching baseline and truth controls</h2>
      <p>The frozen matching workspace is preserved. Historical estimates remain visible, while unassessed pairs and stale data are never presented as current facts.</p>
    </header>
    <section className="tb3-notice" role="status"><div><span>DATED DEMONSTRATION SNAPSHOT</span><b>Frozen {dateLabel(demoSnapshot.asOf)} · source commit {sourceCommit.slice(0, 7)}</b><p>Deadlines are absolute and recalculated from the current clock. The 1,000-item radar universes are legacy simulations, not live datasets.</p></div><strong>{summaryMissing === 0 ? "MATCHING INVENTORY COMPLETE" : `${summaryMissing} MISSING`}</strong></section>
    <section className="tb3-metrics-grid" aria-label="TenderMatch frozen-source dataset summary">
      <Metric label="TENDERS" value={demoTenders.length} note={`${sourceCount} source labels · frozen fixture`} onClick={() => onView("tenders")} />
      <Metric label="SUPPLIER PROFILES" value={demoSuppliers.length} note={`${evidenceCount} evidence records`} onClick={() => onView("suppliers")} />
      <Metric label="PAIR UNIVERSE" value={allMatches.length} note="10 × 16 explicit matrix" />
      <Metric label="EVALUATED" value={evaluatedMatches.length} note="legacy estimates 65–95" signal />
      <Metric label="UNASSESSED" value={allMatches.length - evaluatedMatches.length} note="MISSING · never zero" />
      <Metric label="AUDITED" value={auditedMatches.length} note={`${evaluatedMatches.length - auditedMatches.length} assessed pairs still MISSING`} />
    </section>
    <section className="tb3-overview-grid">
      <article className="tb3-panel tb3-queue"><header><div><span>CONSULTANT QUEUE</span><h2>Evaluated legacy matches</h2><p>Historical scores remain estimates; open a row for the audited result and current blockers.</p></div><button onClick={() => onView("matrix")}>All 160 pairs →</button></header><div>{priorityMatches.slice(0, 6).map((assessment, index) => {
        const rowSupplier = demoSuppliers.find((entry) => entry.id === assessment.supplierId)!;
        const rowTender = demoTenders.find((entry) => entry.id === assessment.tenderId)!;
        return <button key={assessment.key} onClick={() => onOpen(assessment, "match-tenders")}><span className="tb3-rank">{String(index + 1).padStart(2, "0")}</span><p><b>{rowSupplier.legalEnglishName}</b><small>{rowTender.reference} · {rowTender.country}</small></p><div>{assessment.linkedStrengths.slice(0, 2).map((claim) => <i key={claim.id}>{claim.text}</i>)}</div><strong>{assessment.matchScore.value}<small>LEGACY</small></strong><em className={`tb3-state ${assessment.tenderFreshness.status}`}>{assessment.tenderFreshness.status}</em></button>;
      })}</div></article>
      <aside className="tb3-panel tb3-flow"><header><span>LOCAL WORKFLOW</span><h2>Evidence to decision</h2></header>{[
        ["01", "Tender snapshot", "16 frozen records", true],
        ["02", "Supplier intelligence", "10 complete fixture profiles", true],
        ["03", "Pair evaluation", "18 assessed · 142 MISSING", true],
        ["04", "Audited support", "6 evidence-sufficient results", true],
        ["05", "Consultant decision", `${Object.values(caseResults).filter((entry) => entry.match.consultantDecision !== "pending").length} recorded in local Cases`, false],
      ].map(([number, title, note, done]) => <div className={done ? "done" : ""} key={String(number)}><span>{done ? "✓" : number}</span><p><b>{title}</b><small>{note}</small></p></div>)}</aside>
    </section>
    <section className="tb3-capability-strip"><div><span>CAPABILITY HANDOFFS</span><h2>Evidence flows into a human-controlled match result</h2></div><div><b>Tender Discovery</b><i>→</i><b>Supplier Intelligence</b><i>→</i><b className="active">TL-A031 · TenderMatch</b><i>→</i><b>Human participation decision</b></div></section>
  </>;
}

type GeographicRadarMarker = {
  id: string;
  label: string;
  shortLabel: string;
  selected: boolean;
  x: number;
  y: number;
  onSelect: () => void;
};

/* eslint-disable jsx-a11y/no-noninteractive-element-interactions, jsx-a11y/no-noninteractive-tabindex -- The self-hosted geographic canvas is an ARIA application with explicit drag and arrow-key pan; focusable cluster labels preserve the source map's tooltip access without inventing actions. */
function GeographicRadarMap({ kind, zoom, clusters, markers, clusterNoun, markerNoun }: { kind: "world" | "china"; zoom: number; clusters: typeof worldRadarClusters; markers: GeographicRadarMarker[]; clusterNoun: string; markerNoun: string }) {
  const viewportRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<{ pointerId: number; x: number; y: number; left: number; top: number } | null>(null);
  const sourceHref = kind === "world"
    ? "https://commons.wikimedia.org/wiki/File:BlankMap-World.png"
    : "https://commons.wikimedia.org/wiki/File:China_blank_map_by_prefectures.png";
  const pan = (left: number, top: number) => viewportRef.current?.scrollBy({ left, top, behavior: "smooth" });
  const onKeyDown = (event: ReactKeyboardEvent<HTMLDivElement>) => {
    const movement: Record<string, [number, number]> = { ArrowLeft: [-80, 0], ArrowRight: [80, 0], ArrowUp: [0, -80], ArrowDown: [0, 80] };
    const delta = movement[event.key];
    if (!delta) return;
    event.preventDefault();
    pan(delta[0], delta[1]);
  };
  const onPointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    if ((event.target as HTMLElement).closest("button")) return;
    dragRef.current = { pointerId: event.pointerId, x: event.clientX, y: event.clientY, left: event.currentTarget.scrollLeft, top: event.currentTarget.scrollTop };
    event.currentTarget.setPointerCapture(event.pointerId);
    event.currentTarget.dataset.dragging = "true";
  };
  const onPointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    event.currentTarget.scrollLeft = drag.left - (event.clientX - drag.x);
    event.currentTarget.scrollTop = drag.top - (event.clientY - drag.y);
  };
  const stopDragging = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (dragRef.current?.pointerId !== event.pointerId) return;
    dragRef.current = null;
    delete event.currentTarget.dataset.dragging;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
  };
  return <div className={`tb3-geo-map-shell ${kind}`} data-map-mode="local-geographic" data-map-snapshot="frozen">
    <div className="tb3-geo-map-viewport" ref={viewportRef} role="application" tabIndex={0} aria-label={`${kind === "world" ? "Global" : "China"} geographic ${markerNoun} distribution. Frozen demonstration coordinates. Use arrow keys or drag to pan after zooming.`} onKeyDown={onKeyDown} onPointerDown={onPointerDown} onPointerMove={onPointerMove} onPointerUp={stopDragging} onPointerCancel={stopDragging}>
      <div className="tb3-geo-map-inner" style={{ width: `${zoom * 100}%`, height: `${zoom * 100}%` }}>
        <div className="tb3-geo-map-geometry" aria-hidden="true" />
        {clusters.map((cluster) => <span className="cluster" tabIndex={0} role="img" style={{ left: `${cluster.x}%`, top: `${cluster.y}%` }} key={cluster.id} title={`${cluster.label}: ${cluster.count} simulated ${clusterNoun}`} aria-label={`${cluster.label}, ${cluster.count} simulated ${clusterNoun}`}><b>{cluster.count}</b></span>)}
        {markers.map((marker) => <button type="button" aria-label={marker.label} className={marker.selected ? "marker selected" : "marker"} style={{ left: `${marker.x}%`, top: `${marker.y}%` }} key={marker.id} title={marker.label} onClick={marker.onSelect}><i aria-hidden="true" /><span>{marker.shortLabel}</span></button>)}
      </div>
    </div>
    <div className="tb3-map-legend" aria-label="Map legend"><span><i className="universe" />Potential {markerNoun} cluster</span><span><i className="focus" />{kind === "world" ? "Focus Tender" : "Target Supplier"}</span></div>
    <a className="tb3-map-credit" href={sourceHref} target="_blank" rel="noreferrer">Map geometry · Wikimedia Commons</a>
    <p className="tb3-map-truth">FROZEN DEMONSTRATION COORDINATES · LOCAL MAP · NO LIVE TILES</p>
  </div>;
}
/* eslint-enable jsx-a11y/no-noninteractive-element-interactions, jsx-a11y/no-noninteractive-tabindex */

function TenderRadarView({ tender, currentAssessment, allMatches, bestMatch, filter, zoom, clusters, visibleTenders, sourceCount, onFilter, onZoom, onOpen, onView }: { tender: TenderRecord; currentAssessment: MatchAssessment; allMatches: MatchAssessment[]; bestMatch: MatchAssessment | undefined; filter: string; zoom: number; clusters: typeof worldRadarClusters; visibleTenders: TenderRecord[]; sourceCount: number; onFilter: (filter: string) => void; onZoom: React.Dispatch<React.SetStateAction<number>>; onOpen: (assessment: MatchAssessment) => void; onView: (view: WorkspaceView) => void }) {
  return <>
    <ViewHeader eyebrow="02 · MARKET RADAR / GLOBAL DEMAND" title="Global Tender Demand" description="Scan the frozen focus set inside the original simulated opportunity universe. Geography is locally rendered from the frozen source coordinates; it is not a live market feed." aside={<div className="tb3-view-badge"><span>SIMULATED UNIVERSE</span><b>1,000 opportunities</b></div>} />
    <nav className="tb3-subtabs" aria-label="Market Radar views"><button className="active" aria-current="page"><b>Tenders</b><span>Global procurement demand</span></button><button onClick={() => onView("radar-suppliers")}><b>Suppliers</b><span>Global supplier market</span></button></nav>
    <section className="tb3-radar-kpis"><Metric label="POTENTIAL TENDERS" value="1,000" note="legacy simulated universe" /><Metric label="COUNTRIES" value="86" note="legacy simulated metric" /><Metric label="FOCUS TENDERS" value={demoTenders.length} note="frozen matching set" signal /><Metric label="SOURCE LABELS" value={sourceCount} note="IFI and public procurement" /></section>
    <section className="tb3-radar-flow"><div><b>1,000</b><span>Potential Tenders</span></div><i>→</i><div className="selected"><b>16</b><span>Focus Tenders</span></div><strong>↕</strong><div className="engine"><small>TENDERMATCH</small><b>Evaluation</b></div><strong>↕</strong><div><b>10</b><span>Target Suppliers</span></div><i>←</i><div><b>1,000</b><span>Potential Suppliers</span></div></section>
    <section className="tb3-radar-layout"><article className="tb3-map-card"><header><div><span>GLOBAL OPPORTUNITY DENSITY · FROZEN</span><h2>Tender market distribution</h2></div><div className="tb3-zoom"><button aria-label="Zoom tender map out" onClick={() => onZoom((value) => Math.max(1, +(value - .2).toFixed(1)))}>−</button><b>{Math.round(zoom * 100)}%</b><button aria-label="Zoom tender map in" onClick={() => onZoom((value) => Math.min(1.8, +(value + .2).toFixed(1)))}>+</button></div></header><div className="tb3-filter-row">{["All regions", "Africa", "Americas", "Central Asia", "Asia Pacific", "Europe", "Middle East"].map((entry) => <button aria-pressed={filter === entry} className={filter === entry ? "active" : ""} key={entry} onClick={() => onFilter(entry)}>{entry}</button>)}</div><GeographicRadarMap kind="world" zoom={zoom} clusters={clusters} clusterNoun="tenders" markerNoun="tender" markers={visibleTenders.map((entry, index) => { const coordinate = tenderRadarCoordinates[entry.reference]; return { id: entry.id, label: `Open focus tender ${entry.reference}: ${entry.title}`, shortLabel: String(index + 1).padStart(2, "0"), selected: entry.id === tender.id, x: coordinate.x, y: coordinate.y, onSelect: () => { const nextBest = bestLegacyMatch(allMatches.filter((match) => match.tenderId === entry.id)); if (nextBest) onOpen(nextBest); } }; })} /></article><aside className="tb3-radar-detail"><div className="tb3-radar-detail-head"><div><span>FOCUS TENDER</span><b>{tender.reference}</b></div><em>{bestMatch?.matchScore.value ?? "MISSING"} MATCH</em></div><h2>{tender.title}</h2><p>{tender.country} · {tender.region}</p><dl><div><dt>Sector</dt><dd>{tender.tags.slice(0, 2).join(" · ")}</dd></div><div><dt>Source</dt><dd>{tender.sourceLabel}</dd></div><div><dt>Estimated value</dt><dd>{tender.budgetLabel}</dd></div><div><dt>Deadline</dt><dd>{dateLabel(tender.deadlineAt)} · {currentAssessment.tenderFreshness.status}</dd></div><div><dt>Match status</dt><dd>{bestMatch?.matchScore.value === null || !bestMatch ? "Not evaluated" : `${decisionLabel[bestMatch.consultantDecision]} · ${bestMatch.matchScore.value}/100 EST.`}</dd></div><div><dt>Potential suppliers</dt><dd>{allMatches.filter((match) => match.tenderId === tender.id && match.matchScore.value !== null).length} identified</dd></div></dl><div className="tb3-radar-detail-signal"><i>↯</i><p><b>TenderLab focus</b><span>Selected from a frozen simulated universe of 1,000 opportunities.</span></p></div><button onClick={() => onView("match-tenders")}>Open in AutoMatch by Tenders →</button></aside></section>
  </>;
}

function SupplierRadarView({ supplier, filter, zoom, clusters, visibleSuppliers, allMatches, onFilter, onZoom, onOpen, onView }: { supplier: SupplierRecord; filter: string; zoom: number; clusters: typeof chinaRadarClusters; visibleSuppliers: SupplierRecord[]; allMatches: MatchAssessment[]; onFilter: (filter: string) => void; onZoom: React.Dispatch<React.SetStateAction<number>>; onOpen: (assessment: MatchAssessment) => void; onView: (view: WorkspaceView) => void }) {
  return <>
    <ViewHeader eyebrow="02 · MARKET RADAR / SUPPLIER MARKET" title="Global Supplier Market" description="Navigate the original simulated supplier universe and the ten frozen target profiles used for matching review." aside={<div className="tb3-view-badge"><span>SIMULATED UNIVERSE</span><b>1,000 suppliers</b></div>} />
    <nav className="tb3-subtabs" aria-label="Market Radar views"><button onClick={() => onView("radar-tenders")}><b>Tenders</b><span>Global procurement demand</span></button><button className="active" aria-current="page"><b>Suppliers</b><span>Global supplier market</span></button></nav>
    <section className="tb3-radar-kpis"><Metric label="POTENTIAL SUPPLIERS" value="1,000" note="legacy simulated universe" /><Metric label="INDUSTRIAL REGIONS" value="15" note="legacy China cluster model" /><Metric label="TARGET SUPPLIERS" value={demoSuppliers.length} note="frozen researched profiles" signal /><Metric label="CAPABILITY FAMILIES" value="11" note="legacy simulated metric" /></section>
    <section className="tb3-radar-flow"><div><b>1,000</b><span>Potential Tenders</span></div><i>→</i><div><b>16</b><span>Focus Tenders</span></div><strong>↕</strong><div className="engine"><small>TENDERMATCH</small><b>Evaluation</b></div><strong>↕</strong><div className="selected"><b>10</b><span>Target Suppliers</span></div><i>←</i><div><b>1,000</b><span>Potential Suppliers</span></div></section>
    <section className="tb3-radar-layout"><article className="tb3-map-card"><header><div><span>GEOGRAPHIC SUPPLIER DENSITY · FROZEN</span><h2>Supplier market distribution</h2></div><div className="tb3-zoom"><button aria-label="Zoom supplier map out" onClick={() => onZoom((value) => Math.max(1, +(value - .2).toFixed(1)))}>−</button><b>{Math.round(zoom * 100)}%</b><button aria-label="Zoom supplier map in" onClick={() => onZoom((value) => Math.min(1.8, +(value + .2).toFixed(1)))}>+</button></div></header><div className="tb3-filter-row">{["All regions", "North China", "East China", "Central China", "South China", "West China"].map((entry) => <button aria-pressed={filter === entry} className={filter === entry ? "active" : ""} key={entry} onClick={() => onFilter(entry)}>{entry}</button>)}</div><GeographicRadarMap kind="china" zoom={zoom} clusters={clusters} clusterNoun="suppliers" markerNoun="supplier" markers={visibleSuppliers.map((entry, index) => { const coordinate = supplierRadarCoordinates[fixtureSupplierKey(entry)]; return { id: entry.id, label: `Select target supplier ${entry.legalEnglishName}, ${entry.headquarters.city}`, shortLabel: String(index + 1).padStart(2, "0"), selected: entry.id === supplier.id, x: coordinate.x, y: coordinate.y, onSelect: () => { const nextBest = bestLegacyMatch(allMatches.filter((match) => match.supplierId === entry.id)); if (nextBest) onOpen(nextBest); } }; })} /></article><aside className="tb3-radar-detail"><div className="tb3-radar-detail-head"><div><span>TARGET SUPPLIER</span><b>{supplier.headquarters.city}</b></div><em>{supplier.readiness.value} READY</em></div><h2>{supplier.legalEnglishName}</h2><p>{supplier.headquarters.city}, {supplier.headquarters.province} · {supplier.headquarters.country}</p><dl><div><dt>Product category</dt><dd>{supplier.categories.slice(0, 2).join(" · ")}</dd></div><div><dt>Supplier type</dt><dd>{supplier.companyType.join(" + ")}</dd></div><div><dt>Supplier readiness</dt><dd>{supplier.readiness.value}/100 · ESTIMATED</dd></div><div><dt>Relevant tenders</dt><dd>{supplier.legacyTenderMatches.length} identified</dd></div><div><dt>Evidence records</dt><dd>{supplier.evidence.length} frozen records</dd></div></dl><div className="tb3-radar-detail-signal"><i>↗</i><p><b>Matching target</b><span>Selected from the frozen simulated supplier universe for evidence-linked comparison.</span></p></div><button onClick={() => onView("verification")}>Verify supplier profile →</button></aside></section>
  </>;
}

function SupplierDirectoryView({ view, allMatches, onView, onOpen }: { view: WorkspaceView; allMatches: MatchAssessment[]; onView: (view: WorkspaceView) => void; onOpen: (assessment: MatchAssessment, view?: WorkspaceView) => void }) {
  return <>
    <ViewHeader eyebrow="03 · SUPPLIERS / PROFILES" title="Supplier Profiles" description="Review all frozen supplier identities, capabilities, products, markets, readiness estimates, and evidence coverage." aside={<div className="tb3-directory-count"><b>{demoSuppliers.length}</b><span>complete fixture profiles</span></div>} />
    <SupplierTabs view={view} onChange={onView} />
    <section className="tb3-directory" aria-label="Supplier profile directory"><div className="tb3-directory-head supplier"><span>SUPPLIER</span><span>READINESS</span><span>MARKETS</span><span>VERIFICATION</span><span>ACTION</span></div>{demoSuppliers.map((entry) => { const verified = entry.evidence.filter((record) => ["LEGACY_VERIFIED", "REVIEWED"].includes(record.reviewStatus)).length; const inferred = entry.evidence.filter((record) => record.reviewStatus === "INFERRED").length; return <button className="tb3-directory-row supplier" key={entry.id} onClick={() => { const best = bestLegacyMatch(allMatches.filter((match) => match.supplierId === entry.id)); if (best) onOpen(best, "verification"); }}><div className="identity"><span>CN</span><p><b>{entry.legalEnglishName}</b><small>{supplierActivity(entry)}</small><em>{entry.headquarters.city} · {entry.headquarters.country}</em></p></div><strong>{entry.readiness.value}<small>/100 EST.</small></strong><p>{regionsForSupplier(entry, demoTenders).slice(0, 2).join(" · ") || "MISSING"}<small>{entry.categories.slice(0, 3).join(" · ")}</small></p><div className="evidence"><span className="verified">{verified} verified</span>{inferred > 0 && <span className="inferred">{inferred} inferred</span>}</div><em>Verify profile →</em></button>; })}</section>
  </>;
}

function TenderDirectoryView({ allMatches, onOpen }: { allMatches: MatchAssessment[]; onOpen: (assessment: MatchAssessment, view?: WorkspaceView) => void }) {
  return <>
    <ViewHeader eyebrow="04 · OPPORTUNITY DATABASE" title="Tender Snapshot" description="All sixteen original opportunity records are preserved. Open/urgent/closed and remaining days are derived from absolute deadlines at review time." aside={<div className="tb3-directory-count"><b>{demoTenders.length}</b><span>dated opportunity records</span></div>} />
    <section className="tb3-directory" aria-label="Tender snapshot directory"><div className="tb3-directory-head tender"><span>NO.</span><span>TENDER</span><span>OBJECT</span><span>SOURCE</span><span>BUDGET</span><span>DEADLINE</span><span>TOP LEGACY</span><span>ACTION</span></div>{demoTenders.map((entry, index) => { const matches = allMatches.filter((match) => match.tenderId === entry.id); const best = bestLegacyMatch(matches); return <button className="tb3-directory-row tender" key={entry.id} onClick={() => best && onOpen(best, "match-tenders")}><span className="number">{index + 1}</span><div className="tender-name"><p><b>{entry.title}</b><small>{entry.buyer} · {entry.country}</small><em>{entry.reference}</em></p></div><span>{entry.object}</span><strong>{entry.sourceLabel}</strong><strong>{entry.budgetLabel}</strong><p>{best.tenderFreshness.daysRemaining} days<small>{dateLabel(entry.deadlineAt)} · {best.tenderFreshness.status}</small></p><div className="top-match"><b className={scoreBand(best.matchScore.value)}>{best.matchScore.value ?? "MISSING"}</b><p><strong>{demoSuppliers.find((supplier) => supplier.id === best.supplierId)?.legalEnglishName ?? "Not evaluated"}</strong><small>{best.matchScore.value === null ? "No assessed pair" : "Historical estimate"}</small></p></div><em>Open match →</em></button>; })}</section>
  </>;
}

function MatrixView({ view, matchByKey, onView, onOpen }: { view: WorkspaceView; matchByKey: Map<string, MatchAssessment>; onView: (view: WorkspaceView) => void; onOpen: (assessment: MatchAssessment, view?: WorkspaceView) => void }) {
  return <>
    <ViewHeader eyebrow="05 · MATCH MATRIX / PORTFOLIO" title="Full Match Matrix" description="Every Company × Tender intersection is present. The 142 source combinations that were never evaluated remain MISSING—not 0/100." aside={<div className="tb3-directory-count"><b>{demoSuppliers.length * demoTenders.length}</b><span>explicit pair cells</span></div>} />
    <MatchModeTabs view={view} onChange={onView} />
    <section className="tb3-matrix-panel"><header><div><span>PORTFOLIO OVERVIEW</span><h2>Legacy Match Score landscape</h2><p>Select any cell to inspect its audited support, evidence and human decision state.</p></div><div className="tb3-matrix-legend"><span className="priority">85–100</span><span className="review">70–84</span><span className="archive">1–69</span><span className="missing">MISSING · not evaluated</span></div></header><div className="tb3-matrix-scroll" role="region" aria-label="Full supplier by tender match matrix"><div className="tb3-matrix-table" style={{ minWidth: `${280 + demoTenders.length * 104}px` }}><div className="tb3-matrix-header" style={{ gridTemplateColumns: `280px repeat(${demoTenders.length}, 104px)` }}><div><b>SUPPLIER</b><span>READINESS EST.</span></div>{demoTenders.map((entry, index) => <div key={entry.id} title={`${entry.reference} · ${entry.country} · ${entry.object}`}><span>T{String(index + 1).padStart(2, "0")}</span><b>{entry.reference}</b><small>{entry.country}</small><em>{entry.object}</em></div>)}</div>{demoSuppliers.map((company) => <div className="tb3-matrix-row" style={{ gridTemplateColumns: `280px repeat(${demoTenders.length}, 104px)` }} key={company.id}><div className="tb3-matrix-company"><span>CN</span><p><b>{company.legalEnglishName}</b><small>{supplierActivity(company)}</small><em>{company.companyType.join(" + ")}</em></p><strong>{company.readiness.value}</strong></div>{demoTenders.map((opportunity) => { const assessment = matchByKey.get(matchKey(opportunity, company))!; return <button className={`tb3-matrix-cell ${scoreBand(assessment.matchScore.value)}`} key={opportunity.id} onClick={() => onOpen(assessment, "match-tenders")} aria-label={`Open ${company.legalEnglishName} and ${opportunity.reference}; ${assessment.matchScore.value === null ? "not evaluated, MISSING" : `legacy score ${assessment.matchScore.value}`}`}><b>{assessment.matchScore.value ?? "—"}</b><span>{assessment.matchScore.value === null ? "MISSING" : "ESTIMATED"}</span></button>; })}</div>)}</div></div></section>
  </>;
}

function MatchWorkspaceView({ view, tender, supplier, result, allMatches, tenderMatches, supplierMatches, caseResults, replayProgress, isReplaying, onReplay, onView, onOpen, onDecision }: { view: "match-tenders" | "match-suppliers"; tender: TenderRecord; supplier: SupplierRecord; result: TenderMatchCaseResult; allMatches: MatchAssessment[]; tenderMatches: MatchAssessment[]; supplierMatches: MatchAssessment[]; caseResults: Record<string, TenderMatchCaseResult>; replayProgress: number; isReplaying: boolean; onReplay: () => void; onView: (view: WorkspaceView) => void; onOpen: (assessment: MatchAssessment) => void; onDecision: (decision: ConsultantDecision) => void }) {
  return <>
    <ViewHeader eyebrow={`05 · MATCH MATRIX / ${view === "match-tenders" ? "TENDER-FIRST" : "SUPPLIER-FIRST"}`} title={view === "match-tenders" ? "AutoMatch by Tenders" : "AutoMatch by Suppliers"} description="Replay the frozen deterministic evaluation and inspect one explicit pair without turning MISSING into zero or mixing legacy score, audited support, readiness, evidence quality, urgency, and decision." aside={<button className="tb3-replay" onClick={onReplay} disabled={isReplaying}><span>↯</span><p><b>{isReplaying ? "Re-evaluating…" : "Re-evaluate snapshot"}</b><small>{Math.round((replayProgress / 100) * allMatches.length)} / {allMatches.length} pairs</small></p></button>} />
    <MatchModeTabs view={view} onChange={onView} />
    <div className="tb3-progress" role="progressbar" aria-label="Local snapshot re-evaluation progress" aria-valuemin={0} aria-valuemax={100} aria-valuenow={replayProgress}><i style={{ width: `${replayProgress}%` }} /><span>{replayProgress}%</span></div>
    <section className="tb3-match-workspace">
      <aside className="tb3-picker"><header><span>{view === "match-tenders" ? "TENDERS" : "SUPPLIERS"}</span><b>{view === "match-tenders" ? `${demoTenders.length} frozen records` : `${demoSuppliers.length} researched profiles`}</b></header>{view === "match-tenders" ? demoTenders.map((entry) => <button className={entry.id === tender.id ? "active" : ""} key={entry.id} onClick={() => { const best = bestLegacyMatch(allMatches.filter((match) => match.tenderId === entry.id)); if (best) onOpen(best); }}><span>{entry.sourceLabel}</span><b>{entry.reference}</b><p>{entry.title}</p><small>{entry.country} · {dateLabel(entry.deadlineAt)}</small></button>) : demoSuppliers.map((entry) => <button className={entry.id === supplier.id ? "active" : ""} key={entry.id} onClick={() => { const best = bestLegacyMatch(allMatches.filter((match) => match.supplierId === entry.id)); if (best) onOpen(best); }}><span>CN</span><p><b>{entry.legalEnglishName}</b><small>{supplierActivity(entry)} · readiness {entry.readiness.value}/100 EST.</small></p><i>→</i></button>)}</aside>
      <article className="tb3-ranking"><header><div><span>{view === "match-tenders" ? tender.sourceLabel : "SELECTED SUPPLIER"}</span><h2>{view === "match-tenders" ? tender.title : supplier.legalEnglishName}</h2><p>{view === "match-tenders" ? `${tender.buyer} · ${tender.country}` : `${supplier.headquarters.city}, ${supplier.headquarters.province} · ${supplier.companyType.join(" + ")}`}</p></div><div><small>{view === "match-tenders" ? "DEADLINE" : "READINESS"}</small><b>{view === "match-tenders" ? dateLabel(tender.deadlineAt) : `${supplier.readiness.value}/100`}</b><small>{view === "match-tenders" ? "STATUS" : "EVIDENCE"}</small><b>{view === "match-tenders" ? result.match.tenderFreshness.status : `${supplier.legacyEvidenceCompleteness}/100 EST.`}</b></div></header><div className="tb3-ranking-head"><span>{view === "match-tenders" ? "SUPPLIER" : "TENDER"}</span><span>READINESS</span><span>LEGACY</span><span>AUDITED</span><span>DECISION</span></div><div className="tb3-ranking-rows">{(view === "match-tenders" ? tenderMatches : supplierMatches).map((assessment) => { const rowSupplier = demoSuppliers.find((entry) => entry.id === assessment.supplierId)!; const rowTender = demoTenders.find((entry) => entry.id === assessment.tenderId)!; const cachedDecision = caseResults[assessment.key]?.match.consultantDecision ?? assessment.consultantDecision; return <button className={assessment.key === result.match.key ? "selected" : ""} key={assessment.key} onClick={() => onOpen(assessment)}><div><span>{view === "match-tenders" ? "CN" : "IFI"}</span><p><b>{view === "match-tenders" ? rowSupplier.legalEnglishName : rowTender.title}</b><small>{view === "match-tenders" ? supplierActivity(rowSupplier) : `${rowTender.reference} · ${rowTender.country} · ${rowTender.object}`}</small></p></div><strong>{rowSupplier.readiness.value}<small>EST.</small></strong><strong className={scoreBand(assessment.matchScore.value)}>{assessment.matchScore.value ?? "—"}<small>{assessment.matchScore.value === null ? "MISSING" : "EST."}</small></strong><strong className={scoreBand(assessment.auditedMatch.value)}>{assessment.auditedMatch.value ?? "—"}<small>{assessment.auditedMatch.value === null ? "MISSING" : "AUDITED"}</small></strong><em className={`tb3-state ${cachedDecision}`}>{decisionLabel[cachedDecision]}</em></button>; })}</div></article>
      <MatchReviewPanel result={result} tender={tender} supplier={supplier} onViewChange={onView} onDecision={onDecision} />
    </section>
  </>;
}

function VerificationView({ view, supplier, allMatches, onView, onOpen }: { view: WorkspaceView; supplier: SupplierRecord; allMatches: MatchAssessment[]; onView: (view: WorkspaceView) => void; onOpen: (assessment: MatchAssessment) => void }) {
  return <>
    <ViewHeader eyebrow="03 · SUPPLIERS / VERIFICATION" title="Verification" description="Inspect every evidence record, confidence value, source reference, retrieval date, risk, and verification question before using a claim." aside={<div className="tb3-directory-count"><b>{supplier.evidence.filter((entry) => ["LEGACY_VERIFIED", "REVIEWED"].includes(entry.reviewStatus)).length}/{supplier.evidence.length}</b><span>legacy-verified facts</span></div>} />
    <SupplierTabs view={view} onChange={onView} />
    <section className="tb3-evidence-layout"><aside className="tb3-picker"><header><span>SUPPLIERS</span><b>{demoSuppliers.length} profiles</b></header>{demoSuppliers.map((entry) => <button className={entry.id === supplier.id ? "active" : ""} key={entry.id} onClick={() => { const best = bestLegacyMatch(allMatches.filter((match) => match.supplierId === entry.id)); if (best) onOpen(best); }}><span>CN</span><p><b>{entry.legalEnglishName}</b><small>Readiness {entry.readiness.value}/100 · ESTIMATED</small></p><i>→</i></button>)}</aside><article className="tb3-evidence-card"><header><span>CN</span><div><p>PRELIMINARY PROFILE · FROZEN ACCIO RESEARCH</p><h2>{supplier.legalEnglishName}</h2><small>{supplier.legalChineseName} · {supplier.companyType.join(" + ")}</small></div></header><div className="tb3-evidence-legend"><span className="verified">Legacy verified</span><span className="inferred">Inferred · internal only</span><span className="unknown">Unknown / MISSING</span></div><div className="tb3-fact-table"><div className="head"><span>FACT</span><span>VALUE</span><span>STATUS</span><span>CONFIDENCE</span><span>SOURCE RECORD</span></div>{supplier.evidence.map((entry) => <div className="row" key={entry.id}><b>{entry.field}</b><p>{entry.value || "MISSING"}</p><span className={evidenceStatusClass(entry.reviewStatus)}>{entry.reviewStatus.replace("LEGACY_", "")}</span><strong>{entry.confidence ? `${entry.confidence}%` : "—"}</strong><small>{entry.sourceTitle}{entry.sourceUrl && <a href={entry.sourceUrl} target="_blank" rel="noreferrer">Open source ↗</a>}<i>{entry.retrievedAt} · {entry.id}</i></small></div>)}</div><div className="tb3-guardrail"><i>!</i><p><b>Claim protection</b><span>Inferred, unknown, low-confidence, and unlinked facts are excluded from match support.</span></p></div></article><aside className="tb3-audit-aside"><span>AUDIT SUMMARY</span><h3>Profile provenance</h3><div><b>{supplier.evidence.length}</b><small>evidence records</small></div><div><b>{supplier.evidence.filter((entry) => entry.reviewStatus === "INFERRED").length}</b><small>inferences</small></div><div><b>{supplier.evidence.filter((entry) => entry.reviewStatus === "UNKNOWN").length}</b><small>unknown fields</small></div><p>Every fact retains retrieval date, confidence, status, value class, and source identity.</p><section><b>CONSULTANT FLAGS</b>{supplier.risks.slice(0, 3).map((risk) => <p key={risk}>! {risk}</p>)}{supplier.verificationQuestions.slice(0, 2).map((question) => <p key={question}>? {question}</p>)}</section><a href={supplier.officialWebsite} target="_blank" rel="noreferrer">Official supplier website ↗</a><button onClick={() => onView("match-tenders")}>Back to match review</button></aside></section>
  </>;
}

function AuditView({ result }: { result: TenderMatchCaseResult }) {
  return <>
    <ViewHeader eyebrow="05 · CASE / AUDIT" title="Case Audit" description="The complete migration keeps the Stage 1/2 Case identity, evidence-linked scoring, saved-state migration, and consultant-decision provenance." />
    <section className="tb3-audit-grid"><article><span>IDENTITY CHAIN</span><h2>One matching result</h2><dl><div><dt>Case</dt><dd>{result.caseIdentity.id} · {result.caseIdentity.version}</dd></div><div><dt>Result</dt><dd>{result.resultIdentity.id}</dd></div><div><dt>Tender</dt><dd>{result.tenderIdentity.id}</dd></div><div><dt>Company</dt><dd>{result.supplierIdentity.id}</dd></div><div><dt>Match</dt><dd>{result.match.id} · {result.match.version}</dd></div><div><dt>Evidence</dt><dd>{result.evidenceSnapshotIdentity.id}</dd></div><div><dt>Decision</dt><dd>{result.decisionIdentity.id} · {result.match.decisionHistory.length} recorded</dd></div></dl></article><article><span>SOURCE + VALUE POLICY</span><h2>Dated inputs, explicit meanings</h2><p>Legacy score and readiness remain historical estimates. Audited support exists only with both required evidence components. Evidence quality, deadline urgency, and decision remain separate.</p><div className="tb3-value-classes">{["SOURCE", "CALCULATED", "ESTIMATED", "ASSUMED", "MISSING"].map((entry) => <b key={entry}>{entry}</b>)}</div><p><strong>Policies:</strong> {result.match.auditedMatch.policyVersion} · {result.match.deadlineUrgency.policyVersion}</p></article><article><span>DECISION PROVENANCE</span><h2>Human review history</h2><p>TenderMatch records match disposition only. It does not make a participation or Bid/No-Bid decision.</p><div className="tb3-decision-history">{result.match.decisionHistory.length ? result.match.decisionHistory.map((entry) => <div key={entry.id}><b>{entry.decision}</b><span>{entry.actorId} · {entry.decidedAt}</span><p>{entry.rationale}</p></div>) : <small>No consultant decision event recorded.</small>}</div></article><article><span>KNOWN LIMITATIONS</span><h2>Current safe boundary</h2>{result.knownLimitations.map((entry) => <p key={entry}>— {entry}</p>)}<p><strong>Case compatibility:</strong> {result.migration.status} · {result.migration.note}</p></article></section>
  </>;
}

function MatchReviewPanel({ result, tender, supplier, onViewChange, onDecision }: { result: TenderMatchCaseResult; tender: TenderRecord; supplier: SupplierRecord; onViewChange: (view: WorkspaceView) => void; onDecision: (decision: ConsultantDecision) => void }) {
  return <aside className="tb3-match-review"><header><span>SELECTED EXPLICIT CASE</span><b className={scoreBand(result.match.auditedMatch.value)}>{result.match.auditedMatch.value ?? "—"}</b></header><h2>{supplier.legalEnglishName}</h2><p>{tender.reference} · {tender.country}</p><div className="tb3-breakdown">{[
    ["Audited support", result.match.auditedMatch.value, result.match.auditedMatch.valueClass],
    ["Legacy score", result.match.matchScore.value, result.match.matchScore.valueClass],
    ["Readiness", result.match.supplierReadiness.value, result.match.supplierReadiness.valueClass],
    ["Evidence quality", result.match.verificationQuality.value, result.match.verificationQuality.valueClass],
    ["Deadline urgency", result.match.deadlineUrgency.value, result.match.deadlineUrgency.valueClass],
  ].map(([label, value, valueClass]) => <div key={String(label)}><span>{label}</span><i><b style={{ width: `${value ?? 0}%` }} /></i><strong>{value ?? "—"}<small>{value === null ? "MISSING" : valueClass}</small></strong></div>)}</div><section><span>EVIDENCE-LINKED STRENGTHS</span><div>{result.match.linkedStrengths.length ? result.match.linkedStrengths.map((claim) => <article key={claim.id}><b>✓ {claim.text}</b>{claim.evidenceIds.map((id) => <code key={id}>{id}</code>)}</article>) : <p>No evidence-linked strength is available.</p>}</div></section><section className="gaps"><span>GAPS / UNKNOWNS</span><div>{result.match.gaps.length ? result.match.gaps.map((gap) => <p key={gap}>? {gap}</p>) : <p>No legacy gap recorded.</p>}{result.reviewSupport.findings.map((finding) => <p key={finding.code}>! {finding.code}: {finding.nextAction}</p>)}</div></section><button className="tb3-evidence-link" onClick={() => onViewChange("verification")}>Open supplier verification →</button><div className="tb3-decision-actions"><button className={result.match.consultantDecision === "rejected" ? "selected reject" : ""} onClick={() => onDecision("rejected")}>Reject</button><button className={result.match.consultantDecision === "hold" ? "selected" : ""} onClick={() => onDecision("hold")}>Hold</button><button disabled={!result.reviewSupport.readyForCurrentDecision} className={result.match.consultantDecision === "approved" ? "selected" : ""} onClick={() => onDecision("approved")}>Approve match</button></div><small className="tb3-owner-boundary">Match disposition: TL-A031 workspace · human-controlled review state</small></aside>;
}

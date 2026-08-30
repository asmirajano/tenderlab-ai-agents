import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import {
  advanceLegacyCampaignSimulation,
  buildAllMatches,
  chinaRadarClusters,
  createCaseResult,
  createLegacyCampaign,
  demoSnapshot,
  demoSuppliers,
  demoTenders,
  fixtureSupplierKey,
  generateLegacyCampaignCopy,
  legacyCampaignActivationBlockers,
  legacyCampaignChannels,
  legacyCampaignObjectives,
  legacyCampaignPriority,
  loadCaseResult,
  loadLegacyCampaigns,
  paritySummary,
  recommendedLegacyCampaignChannel,
  regionsForSupplier,
  resumeCaseResult,
  reviseLegacyCampaign,
  saveCaseResult,
  saveLegacyCampaigns,
  setConsultantDecision,
  startLegacyCampaignSimulation,
  supplierActivity,
  supplierRadarCoordinates,
  tenderRadarCoordinates,
  toggleLegacyCampaignApproval,
  worldRadarClusters,
  type ConsultantDecision,
  type LegacyCampaignObjectiveId,
  type LegacyCampaignOrigin,
  type LegacyCampaignRecord,
  type LegacyCampaignStage,
  type MatchAssessment,
  type SupplierRecord,
  type TenderMatchCaseResult,
  type TenderRecord,
} from "../../../packages/tenderboost/src";

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
  | "audit"
  | "campaigns"
  | "followups";

type NavItem = { id: WorkspaceView; label: string; short: string; family: "overview" | "intelligence" | "analysis" | "legacy"; sublabel: string };

const navItems: NavItem[] = [
  { id: "dashboard", label: "Overview", short: "01", family: "overview", sublabel: "Migration baseline" },
  { id: "radar-tenders", label: "Radar · Tenders", short: "02A", family: "intelligence", sublabel: "Global demand" },
  { id: "radar-suppliers", label: "Radar · Suppliers", short: "02B", family: "intelligence", sublabel: "Supplier market" },
  { id: "suppliers", label: "Supplier Profiles", short: "03A", family: "intelligence", sublabel: "10 companies" },
  { id: "verification", label: "Verification", short: "03B", family: "intelligence", sublabel: "Evidence + provenance" },
  { id: "tenders", label: "Tenders", short: "04", family: "intelligence", sublabel: "16 opportunities" },
  { id: "matrix", label: "Full Matrix", short: "05A", family: "analysis", sublabel: "10 × 16" },
  { id: "match-tenders", label: "By Tender", short: "05B", family: "analysis", sublabel: "Tender-first" },
  { id: "match-suppliers", label: "By Supplier", short: "05C", family: "analysis", sublabel: "Supplier-first" },
  { id: "audit", label: "Case Audit", short: "05D", family: "analysis", sublabel: "Identity + decision" },
  { id: "campaigns", label: "Legacy Campaigns", short: "06A", family: "legacy", sublabel: "Isolated local drafts" },
  { id: "followups", label: "Legacy Follow-ups", short: "06B", family: "legacy", sublabel: "Simulation only" },
];

const campaignStageLabel: Record<LegacyCampaignStage, string> = {
  draft: "Draft",
  approved: "Approved content",
  "active-simulation": "Active simulation",
  "follow-up-simulation": "Follow-up simulation",
  "interested-simulation": "Interested simulation",
  "no-response-simulation": "No-response simulation",
  closed: "Closed simulation",
};

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

function CampaignTabs({ view, onChange }: { view: WorkspaceView; onChange: (view: WorkspaceView) => void }) {
  return <nav className="tb3-subtabs tb3-legacy-tabs" aria-label="Migrated legacy Campaign Studio views">
    <button aria-current={view === "campaigns" ? "page" : undefined} className={view === "campaigns" ? "active" : ""} onClick={() => onChange("campaigns")}><b>Campaigns</b><span>Local drafts · NOT SENT</span></button>
    <button aria-current={view === "followups" ? "page" : undefined} className={view === "followups" ? "active" : ""} onClick={() => onChange("followups")}><b>Follow-ups</b><span>Recorded simulation events only</span></button>
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

  const [view, setView] = useState<WorkspaceView>("dashboard");
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
  const [campaigns, setCampaigns] = useState<LegacyCampaignRecord[]>(() => {
    if (typeof window === "undefined") return [];
    try { return loadLegacyCampaigns(window.localStorage); } catch { return []; }
  });
  const [selectedCampaignId, setSelectedCampaignId] = useState<string | null>(null);
  const [campaignComposerOpen, setCampaignComposerOpen] = useState(false);
  const [campaignCreateMode, setCampaignCreateMode] = useState<"tender" | "supplier" | "match">("match");
  const [campaignTenderId, setCampaignTenderId] = useState(initialTender.id);
  const [campaignSupplierId, setCampaignSupplierId] = useState(initialSupplier.id);
  const [campaignSuggestionsOpen, setCampaignSuggestionsOpen] = useState(true);
  const [campaignPipelineOpen, setCampaignPipelineOpen] = useState(true);
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
    setCampaignTenderId(nextTender.id);
    setCampaignSupplierId(nextSupplier.id);
    setActionError("");
    if (nextView) setView(nextView);
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
        rationale: `Consultant recorded ${decision} through the complete TenderMatch parity workspace.`,
      });
      setCaseResults((current) => ({ ...current, [selectedKey]: updated }));
    } catch (error) {
      setActionError(error instanceof Error ? error.message : "The decision could not be recorded.");
    }
  };

  const saveCase = () => {
    saveCaseResult(window.localStorage, result);
    setPersistenceMessage(`Saved explicit Case ${result.caseIdentity.id}`);
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
    try { saveLegacyCampaigns(window.localStorage, campaigns); } catch { /* explicit actions surface recoverable errors */ }
  }, [campaigns]);

  useEffect(() => {
    if (lastFocusedViewRef.current === view) return;
    lastFocusedViewRef.current = view;
    viewSurfaceRef.current?.focus();
  }, [view]);

  const replaceCampaign = (next: LegacyCampaignRecord) => {
    setCampaigns((current) => current.some((entry) => entry.id === next.id)
      ? current.map((entry) => entry.id === next.id ? next : entry)
      : [next, ...current]);
    setSelectedCampaignId(next.id);
  };

  const resultForAssessment = (assessment: MatchAssessment) => {
    const nextTender = demoTenders.find((entry) => entry.id === assessment.tenderId) ?? tender;
    const nextSupplier = demoSuppliers.find((entry) => entry.id === assessment.supplierId) ?? supplier;
    return caseResults[assessment.key] ?? createCaseResult(caseIdFor(nextTender, nextSupplier), nextTender, nextSupplier, sessionNow);
  };

  const createCampaignFromAssessment = (assessment: MatchAssessment, origin: LegacyCampaignOrigin) => {
    setActionError("");
    try {
      const existing = campaigns.find((entry) => entry.matchKey === assessment.key);
      if (existing) {
        setSelectedCampaignId(existing.id);
        setCampaignComposerOpen(false);
        setView("campaigns");
        return;
      }
      const nextTender = demoTenders.find((entry) => entry.id === assessment.tenderId) ?? tender;
      const nextSupplier = demoSuppliers.find((entry) => entry.id === assessment.supplierId) ?? supplier;
      const campaignResult = resultForAssessment(assessment);
      const record = createLegacyCampaign(campaignResult, nextTender, nextSupplier, origin, actorId, new Date().toISOString());
      replaceCampaign(record);
      setCampaignComposerOpen(false);
      setView("campaigns");
    } catch (error) {
      setActionError(error instanceof Error ? error.message : "The local legacy campaign draft could not be created.");
    }
  };

  const currentCampaign = campaigns.find((entry) => entry.id === selectedCampaignId) ?? campaigns[0] ?? null;
  const currentCampaignAssessment = currentCampaign ? matchByKey.get(currentCampaign.matchKey) ?? currentAssessment : currentAssessment;
  const currentCampaignTender = demoTenders.find((entry) => entry.id === currentCampaignAssessment.tenderId) ?? tender;
  const currentCampaignSupplier = demoSuppliers.find((entry) => entry.id === currentCampaignAssessment.supplierId) ?? supplier;
  const currentCampaignResult = currentCampaign ? resultForAssessment(currentCampaignAssessment) : result;
  const campaignCandidates = evaluatedMatches.filter((entry) => (entry.matchScore.value ?? 0) > 0 && entry.consultantDecision !== "rejected");
  const suggestedCampaigns = campaignCandidates
    .filter((entry) => !campaigns.some((record) => record.matchKey === entry.key))
    .map((assessment) => ({ assessment, priority: legacyCampaignPriority(assessment, demoSuppliers.find((entry) => entry.id === assessment.supplierId)!) }))
    .filter((entry): entry is { assessment: MatchAssessment; priority: number } => entry.priority !== null)
    .sort((left, right) => right.priority - left.priority);
  const composerCandidates = campaignCreateMode === "tender"
    ? campaignCandidates.filter((entry) => entry.tenderId === campaignTenderId)
    : campaignCreateMode === "supplier"
      ? campaignCandidates.filter((entry) => entry.supplierId === campaignSupplierId)
      : currentAssessment.matchScore.value !== null ? [currentAssessment] : [];

  const updateCurrentCampaign = (changes: Parameters<typeof reviseLegacyCampaign>[1], rationale: string) => {
    if (!currentCampaign) return;
    replaceCampaign(reviseLegacyCampaign(currentCampaign, changes, actorId, new Date().toISOString(), rationale));
  };

  const changeCampaignObjective = (objective: LegacyCampaignObjectiveId) => {
    if (!currentCampaign) return;
    const channel = recommendedLegacyCampaignChannel(currentCampaignResult, currentCampaignSupplier, objective);
    updateCurrentCampaign({ objective, channel, draftCopy: generateLegacyCampaignCopy(currentCampaignResult, currentCampaignTender, currentCampaignSupplier, objective, channel) }, `Consultant selected ${legacyCampaignObjectives.find((entry) => entry.id === objective)?.label}.`);
  };

  const changeCampaignChannel = (channel: string) => {
    if (!currentCampaign) return;
    updateCurrentCampaign({ channel, draftCopy: generateLegacyCampaignCopy(currentCampaignResult, currentCampaignTender, currentCampaignSupplier, currentCampaign.objective, channel) }, `Consultant selected the ${channel} draft format.`);
  };

  const campaignAction = (action: "approval" | "simulate" | "follow-up" | "interested" | "no-response" | "closed") => {
    if (!currentCampaign) return;
    setActionError("");
    try {
      const nowIso = new Date().toISOString();
      const next = action === "approval"
        ? toggleLegacyCampaignApproval(currentCampaign, actorId, nowIso)
        : action === "simulate"
          ? startLegacyCampaignSimulation(currentCampaign, currentCampaignResult, currentCampaignSupplier, actorId, nowIso)
          : advanceLegacyCampaignSimulation(currentCampaign, action, actorId, nowIso);
      replaceCampaign(next);
    } catch (error) {
      setActionError(error instanceof Error ? error.message : "The local campaign state could not be changed.");
    }
  };

  const selectedRadarTenderMatches = allMatches.filter((entry) => entry.tenderId === tender.id);
  const selectedRadarBestMatch = bestLegacyMatch(selectedRadarTenderMatches);
  const visibleTenderClusters = tenderRadarFilter === "All regions" ? worldRadarClusters : worldRadarClusters.filter((entry) => entry.group === tenderRadarFilter);
  const visibleTenders = tenderRadarFilter === "All regions" ? demoTenders : demoTenders.filter((entry) => entry.region === tenderRadarFilter);
  const visibleSupplierClusters = supplierRadarFilter === "All regions" ? chinaRadarClusters : chinaRadarClusters.filter((entry) => entry.group === supplierRadarFilter);
  const visibleSuppliers = supplierRadarFilter === "All regions" ? demoSuppliers : demoSuppliers.filter((entry) => supplierRadarCoordinates[fixtureSupplierKey(entry)]?.group === supplierRadarFilter);

  return <main className="tb3-page">
    <section className="tb3-product-intro">
      <div><p><i /> TENDERAPPS AGENT 03 · COMPLETE MIGRATION BASELINE</p><h1>Tender<em>Match</em></h1><h2>Complete frozen TenderBoost workspace, adapted to the TenderApps design system.</h2><span>Company × Tender evaluation remains owned by TL-A031. Campaign Studio is retained only as an isolated local legacy module pending its own placement audit.</span></div>
      <aside><span>SOURCE BASELINE</span><b>04b0b2a</b><small>16 tenders · 10 companies · dated 15 Aug 2026</small><strong>LOCAL · NO SEND · NO CRM</strong></aside>
    </section>

    <section className="tb3-layout">
      <aside className="tb3-workspace-nav">
        <header><span>WORKSPACE</span><b>Complete migration</b><small>{navItems.length} reachable views</small></header>
        <nav aria-label="TenderMatch workspace sections">{navItems.map((entry) => <button aria-current={view === entry.id ? "page" : undefined} className={`${view === entry.id ? "active " : ""}family-${entry.family}`} key={entry.id} onClick={() => setView(entry.id)}><span>{entry.short}</span><p><b>{entry.label}</b><small>{entry.sublabel}</small></p><i aria-hidden="true">→</i></button>)}</nav>
        <div className="tb3-owner-note"><span>CANONICAL OWNER</span><b>agent:TL-A031</b><p>Company-to-Tender Match Score Agent</p><small>Campaign module excluded from ownership</small></div>
      </aside>

      <section className="tb3-content">
        <nav className="tb3-mobile-workspace-nav" aria-label="TenderMatch current view"><label><span>WORKSPACE VIEW</span><select value={view} onChange={(event) => setView(event.target.value as WorkspaceView)}>{navItems.map((entry) => <option value={entry.id} key={entry.id}>{entry.short} · {entry.label}</option>)}</select></label></nav>
        {actionError && <div className="tb3-alert" role="alert"><b>Action needs attention</b><span>{actionError}</span><button onClick={() => setActionError("")} aria-label="Dismiss action error">×</button></div>}

        <section className="tb3-case-strip">
          <div><span>EXPLICIT CASE</span><code>{result.caseIdentity.id}</code><small>{supplier.legalEnglishName} × {tender.reference}</small></div>
          <div><span>AUDITED / LEGACY</span><b>{result.match.auditedMatch.value ?? "MISSING"} <i>/</i> {result.match.matchScore.value ?? "MISSING"}</b><small>{result.match.tenderFreshness.status} · {result.match.tenderFreshness.freshness} · {result.match.tenderFreshness.daysRemaining}d</small></div>
          <div className="tb3-case-actions"><button onClick={saveCase}>Save Case</button><button onClick={loadCase}>Load Case</button><small>{persistenceMessage}</small></div>
        </section>

        <div className="tb3-view-surface" ref={viewSurfaceRef} role="region" aria-label={`${navItems.find((entry) => entry.id === view)?.label ?? "TenderMatch"} workspace`} tabIndex={-1}>
          {view === "dashboard" && <DashboardView allMatches={allMatches} auditedMatches={auditedMatches} evaluatedMatches={evaluatedMatches} evidenceCount={evidenceCount} priorityMatches={priorityMatches} caseResults={caseResults} summaryMissing={summary.missing} sourceCount={sourceCount} onView={setView} onOpen={openAssessment} />}
          {view === "radar-tenders" && <TenderRadarView tender={tender} currentAssessment={currentAssessment} allMatches={allMatches} bestMatch={selectedRadarBestMatch} filter={tenderRadarFilter} zoom={tenderRadarZoom} clusters={visibleTenderClusters} visibleTenders={visibleTenders} sourceCount={sourceCount} onFilter={setTenderRadarFilter} onZoom={setTenderRadarZoom} onOpen={openAssessment} onView={setView} />}
          {view === "radar-suppliers" && <SupplierRadarView supplier={supplier} filter={supplierRadarFilter} zoom={supplierRadarZoom} clusters={visibleSupplierClusters} visibleSuppliers={visibleSuppliers} allMatches={allMatches} onFilter={setSupplierRadarFilter} onZoom={setSupplierRadarZoom} onOpen={openAssessment} onView={setView} />}
          {view === "suppliers" && <SupplierDirectoryView view={view} allMatches={allMatches} onView={setView} onOpen={openAssessment} />}
          {view === "tenders" && <TenderDirectoryView allMatches={allMatches} onOpen={openAssessment} />}
          {view === "matrix" && <MatrixView view={view} matchByKey={matchByKey} onView={setView} onOpen={openAssessment} />}
          {(view === "match-tenders" || view === "match-suppliers") && <MatchWorkspaceView view={view} tender={tender} supplier={supplier} result={result} allMatches={allMatches} tenderMatches={tenderMatches} supplierMatches={supplierMatches} caseResults={caseResults} replayProgress={replayProgress} isReplaying={isReplaying} onReplay={runReplay} onView={setView} onOpen={openAssessment} onDecision={decide} onCampaign={() => createCampaignFromAssessment(result.match, "match-matrix")} />}
          {view === "verification" && <VerificationView view={view} supplier={supplier} allMatches={allMatches} onView={setView} onOpen={openAssessment} />}
          {view === "audit" && <AuditView result={result} />}
          {view === "campaigns" && <CampaignsView currentAssessment={currentAssessment} campaigns={campaigns} currentCampaign={currentCampaign} currentCampaignResult={currentCampaignResult} currentCampaignTender={currentCampaignTender} currentCampaignSupplier={currentCampaignSupplier} currentCampaignAssessment={currentCampaignAssessment} matchByKey={matchByKey} composerOpen={campaignComposerOpen} createMode={campaignCreateMode} campaignTenderId={campaignTenderId} campaignSupplierId={campaignSupplierId} composerCandidates={composerCandidates} suggestedCampaigns={suggestedCampaigns} suggestionsOpen={campaignSuggestionsOpen} pipelineOpen={campaignPipelineOpen} onView={setView} onComposerOpen={setCampaignComposerOpen} onCreateMode={setCampaignCreateMode} onTenderId={setCampaignTenderId} onSupplierId={setCampaignSupplierId} onCreate={createCampaignFromAssessment} onSuggestionsOpen={setCampaignSuggestionsOpen} onPipelineOpen={setCampaignPipelineOpen} onSelectCampaign={setSelectedCampaignId} onObjective={changeCampaignObjective} onChannel={changeCampaignChannel} onCopy={(draftCopy) => updateCurrentCampaign({ draftCopy }, "Consultant edited the local NOT SENT draft.")} onNote={(consultantNote) => updateCurrentCampaign({ consultantNote }, "Consultant updated the internal note.")} onApproval={() => campaignAction("approval")} onSimulate={() => campaignAction("simulate")} onAdvance={campaignAction} onVerification={() => openAssessment(currentCampaignAssessment, "verification")} />}
          {view === "followups" && <FollowupsView campaigns={campaigns} matchByKey={matchByKey} onView={setView} onSelectCampaign={setSelectedCampaignId} />}
        </div>
      </section>
    </section>
  </main>;
}

function DashboardView({ allMatches, auditedMatches, evaluatedMatches, evidenceCount, priorityMatches, caseResults, summaryMissing, sourceCount, onView, onOpen }: { allMatches: MatchAssessment[]; auditedMatches: MatchAssessment[]; evaluatedMatches: MatchAssessment[]; evidenceCount: number; priorityMatches: MatchAssessment[]; caseResults: Record<string, TenderMatchCaseResult>; summaryMissing: number; sourceCount: number; onView: (view: WorkspaceView) => void; onOpen: (assessment: MatchAssessment, view?: WorkspaceView) => void }) {
  return <>
    <ViewHeader eyebrow="01 · MIGRATION OVERVIEW" title="TenderBoost parity, with TenderMatch truth controls" description="Every original reader-facing workspace is restored. Historical estimates remain visible, but unassessed pairs, stale data, and local campaign simulations are no longer presented as live facts." aside={<button className="tb3-primary-action" onClick={() => onView("matrix")}>Open Full Matrix →</button>} />
    <section className="tb3-notice" role="status"><div><span>DATED DEMONSTRATION SNAPSHOT</span><b>Frozen {dateLabel(demoSnapshot.asOf)} · source commit {sourceCommit.slice(0, 7)}</b><p>Deadlines are absolute and recalculated from the current clock. The 1,000-item radar universes are legacy simulations, not live datasets.</p></div><strong>{summaryMissing === 0 ? "PARITY MATRIX COMPLETE" : `${summaryMissing} MISSING`}</strong></section>
    <section className="tb3-metrics-grid" aria-label="TenderBoost migration dataset summary">
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
        ["06", "Legacy Campaign Studio", "Isolated · drafts NOT SENT", false],
      ].map(([number, title, note, done]) => <div className={done ? "done" : ""} key={String(number)}><span>{done ? "✓" : number}</span><p><b>{title}</b><small>{note}</small></p></div>)}</aside>
    </section>
    <section className="tb3-capability-strip"><div><span>CAPABILITY HANDOFFS</span><h2>Matching stays separate from downstream work</h2></div><div><b>Tender Discovery</b><i>→</i><b>Supplier Intelligence</b><i>→</i><b className="active">TL-A031 · TenderMatch</b><i>→</i><b>Human participation decision</b><i>→</i><b className="legacy">Legacy Campaign module · unplaced</b></div></section>
  </>;
}

function TenderRadarView({ tender, currentAssessment, allMatches, bestMatch, filter, zoom, clusters, visibleTenders, sourceCount, onFilter, onZoom, onOpen, onView }: { tender: TenderRecord; currentAssessment: MatchAssessment; allMatches: MatchAssessment[]; bestMatch: MatchAssessment | undefined; filter: string; zoom: number; clusters: typeof worldRadarClusters; visibleTenders: TenderRecord[]; sourceCount: number; onFilter: (filter: string) => void; onZoom: React.Dispatch<React.SetStateAction<number>>; onOpen: (assessment: MatchAssessment) => void; onView: (view: WorkspaceView) => void }) {
  return <>
    <ViewHeader eyebrow="02 · MARKET RADAR / GLOBAL DEMAND" title="Global Tender Demand" description="Scan the frozen focus set inside the original simulated opportunity universe. The visualization is schematic and does not claim live geographic accuracy." aside={<div className="tb3-view-badge"><span>SIMULATED UNIVERSE</span><b>1,000 opportunities</b></div>} />
    <nav className="tb3-subtabs" aria-label="Market Radar views"><button className="active" aria-current="page"><b>Tenders</b><span>Global procurement demand</span></button><button onClick={() => onView("radar-suppliers")}><b>Suppliers</b><span>Global supplier market</span></button></nav>
    <section className="tb3-radar-kpis"><Metric label="POTENTIAL TENDERS" value="1,000" note="legacy simulated universe" /><Metric label="COUNTRIES" value="86" note="legacy simulated metric" /><Metric label="FOCUS TENDERS" value={demoTenders.length} note="frozen matching set" signal /><Metric label="SOURCE LABELS" value={sourceCount} note="IFI and public procurement" /></section>
    <section className="tb3-radar-flow"><div><b>1,000</b><span>Potential Tenders</span></div><i>→</i><div className="selected"><b>16</b><span>Focus Tenders</span></div><strong>↕</strong><div className="engine"><small>TENDERMATCH</small><b>Evaluation</b></div><strong>↕</strong><div><b>10</b><span>Target Suppliers</span></div><i>←</i><div><b>1,000</b><span>Potential Suppliers</span></div></section>
    <section className="tb3-radar-layout"><article className="tb3-map-card"><header><div><span>SCHEMATIC · NON-GEOSPATIAL</span><h2>Tender market distribution</h2></div><div className="tb3-zoom"><button aria-label="Zoom tender map out" onClick={() => onZoom((value) => Math.max(.8, +(value - .2).toFixed(1)))}>−</button><b>{Math.round(zoom * 100)}%</b><button aria-label="Zoom tender map in" onClick={() => onZoom((value) => Math.min(1.6, +(value + .2).toFixed(1)))}>+</button></div></header><div className="tb3-filter-row">{["All regions", "Africa", "Americas", "Central Asia", "Asia Pacific", "Europe", "Middle East"].map((entry) => <button aria-pressed={filter === entry} className={filter === entry ? "active" : ""} key={entry} onClick={() => onFilter(entry)}>{entry}</button>)}</div><div className="tb3-schematic-map world" data-map-mode="schematic-non-geospatial" role="img" aria-label="Schematic non-geospatial tender distribution"><div style={{ transform: `scale(${zoom})` }}>{clusters.map((cluster) => <span className="cluster" style={{ left: `${cluster.x}%`, top: `${cluster.y}%` }} key={cluster.id} title={`${cluster.label}: ${cluster.count} simulated tenders`}><b>{cluster.count}</b></span>)}{visibleTenders.map((entry, index) => { const coordinate = tenderRadarCoordinates[entry.reference]; return <button aria-label={`Select focus tender ${entry.reference}`} className={entry.id === tender.id ? "marker selected" : "marker"} style={{ left: `${coordinate.x}%`, top: `${coordinate.y}%` }} key={entry.id} onClick={() => { const best = bestLegacyMatch(allMatches.filter((match) => match.tenderId === entry.id)); if (best) onOpen(best); }}><span>{String(index + 1).padStart(2, "0")}</span></button>; })}</div><p>Fixed explanatory geometry · no tiles, coordinates, routing, or live density</p></div></article><aside className="tb3-radar-detail"><span>FOCUS TENDER</span><h2>{tender.title}</h2><p>{tender.country} · {tender.region}</p><dl><div><dt>Reference</dt><dd>{tender.reference}</dd></div><div><dt>Object</dt><dd>{tender.object}</dd></div><div><dt>Source</dt><dd>{tender.sourceLabel}</dd></div><div><dt>Budget</dt><dd>{tender.budgetLabel}</dd></div><div><dt>Deadline</dt><dd>{dateLabel(tender.deadlineAt)} · {currentAssessment.tenderFreshness.status}</dd></div><div><dt>Best evaluated match</dt><dd>{bestMatch?.matchScore.value ?? "MISSING"}</dd></div></dl><button onClick={() => onView("match-tenders")}>Open in AutoMatch →</button></aside></section>
  </>;
}

function SupplierRadarView({ supplier, filter, zoom, clusters, visibleSuppliers, allMatches, onFilter, onZoom, onOpen, onView }: { supplier: SupplierRecord; filter: string; zoom: number; clusters: typeof chinaRadarClusters; visibleSuppliers: SupplierRecord[]; allMatches: MatchAssessment[]; onFilter: (filter: string) => void; onZoom: React.Dispatch<React.SetStateAction<number>>; onOpen: (assessment: MatchAssessment) => void; onView: (view: WorkspaceView) => void }) {
  return <>
    <ViewHeader eyebrow="02 · MARKET RADAR / SUPPLIER MARKET" title="Global Supplier Market" description="Navigate the original simulated supplier universe and the ten frozen target profiles. No proposal, contact, or outreach event is claimed." aside={<div className="tb3-view-badge"><span>SIMULATED UNIVERSE</span><b>1,000 suppliers</b></div>} />
    <nav className="tb3-subtabs" aria-label="Market Radar views"><button onClick={() => onView("radar-tenders")}><b>Tenders</b><span>Global procurement demand</span></button><button className="active" aria-current="page"><b>Suppliers</b><span>Global supplier market</span></button></nav>
    <section className="tb3-radar-kpis"><Metric label="POTENTIAL SUPPLIERS" value="1,000" note="legacy simulated universe" /><Metric label="INDUSTRIAL REGIONS" value="15" note="legacy China cluster model" /><Metric label="TARGET SUPPLIERS" value={demoSuppliers.length} note="frozen researched profiles" signal /><Metric label="CAPABILITY FAMILIES" value="11" note="legacy simulated metric" /></section>
    <section className="tb3-radar-flow"><div><b>1,000</b><span>Potential Tenders</span></div><i>→</i><div><b>16</b><span>Focus Tenders</span></div><strong>↕</strong><div className="engine"><small>TENDERMATCH</small><b>Evaluation</b></div><strong>↕</strong><div className="selected"><b>10</b><span>Target Suppliers</span></div><i>←</i><div><b>1,000</b><span>Potential Suppliers</span></div></section>
    <section className="tb3-radar-layout"><article className="tb3-map-card"><header><div><span>SCHEMATIC · NON-GEOSPATIAL</span><h2>Supplier market distribution</h2></div><div className="tb3-zoom"><button aria-label="Zoom supplier map out" onClick={() => onZoom((value) => Math.max(.8, +(value - .2).toFixed(1)))}>−</button><b>{Math.round(zoom * 100)}%</b><button aria-label="Zoom supplier map in" onClick={() => onZoom((value) => Math.min(1.6, +(value + .2).toFixed(1)))}>+</button></div></header><div className="tb3-filter-row">{["All regions", "North China", "East China", "Central China", "South China", "West China"].map((entry) => <button aria-pressed={filter === entry} className={filter === entry ? "active" : ""} key={entry} onClick={() => onFilter(entry)}>{entry}</button>)}</div><div className="tb3-schematic-map china" data-map-mode="schematic-non-geospatial" role="img" aria-label="Schematic non-geospatial supplier distribution"><div style={{ transform: `scale(${zoom})` }}>{clusters.map((cluster) => <span className="cluster" style={{ left: `${cluster.x}%`, top: `${cluster.y}%` }} key={cluster.id} title={`${cluster.label}: ${cluster.count} simulated suppliers`}><b>{cluster.count}</b></span>)}{visibleSuppliers.map((entry) => { const coordinate = supplierRadarCoordinates[fixtureSupplierKey(entry)]; return <button aria-label={`Select target supplier ${entry.legalEnglishName}`} className={entry.id === supplier.id ? "marker selected" : "marker"} style={{ left: `${coordinate.x}%`, top: `${coordinate.y}%` }} key={entry.id} onClick={() => { const best = bestLegacyMatch(allMatches.filter((match) => match.supplierId === entry.id)); if (best) onOpen(best); }}><span>CN</span></button>; })}</div><p>Fixed explanatory geometry · CSP-safe local rendering · no live map</p></div></article><aside className="tb3-radar-detail"><span>TARGET SUPPLIER</span><h2>{supplier.legalEnglishName}</h2><p>{supplier.headquarters.city}, {supplier.headquarters.province} · {supplier.headquarters.country}</p><dl><div><dt>Product category</dt><dd>{supplier.categories.slice(0, 2).join(" · ")}</dd></div><div><dt>Supplier type</dt><dd>{supplier.companyType.join(" + ")}</dd></div><div><dt>Readiness</dt><dd>{supplier.readiness.value}/100 · ESTIMATED</dd></div><div><dt>Evaluated tenders</dt><dd>{supplier.legacyTenderMatches.length}</dd></div><div><dt>Outreach status</dt><dd>NOT SENT · no event recorded</dd></div></dl><button onClick={() => onView("verification")}>Verify supplier profile →</button></aside></section>
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

function MatchWorkspaceView({ view, tender, supplier, result, allMatches, tenderMatches, supplierMatches, caseResults, replayProgress, isReplaying, onReplay, onView, onOpen, onDecision, onCampaign }: { view: "match-tenders" | "match-suppliers"; tender: TenderRecord; supplier: SupplierRecord; result: TenderMatchCaseResult; allMatches: MatchAssessment[]; tenderMatches: MatchAssessment[]; supplierMatches: MatchAssessment[]; caseResults: Record<string, TenderMatchCaseResult>; replayProgress: number; isReplaying: boolean; onReplay: () => void; onView: (view: WorkspaceView) => void; onOpen: (assessment: MatchAssessment) => void; onDecision: (decision: ConsultantDecision) => void; onCampaign: () => void }) {
  return <>
    <ViewHeader eyebrow={`05 · MATCH MATRIX / ${view === "match-tenders" ? "TENDER-FIRST" : "SUPPLIER-FIRST"}`} title={view === "match-tenders" ? "AutoMatch by Tenders" : "AutoMatch by Suppliers"} description="Replay the frozen deterministic evaluation and inspect one explicit pair without turning MISSING into zero or mixing legacy score, audited support, readiness, evidence quality, urgency, and decision." aside={<button className="tb3-replay" onClick={onReplay} disabled={isReplaying}><span>↯</span><p><b>{isReplaying ? "Re-evaluating…" : "Re-evaluate snapshot"}</b><small>{Math.round((replayProgress / 100) * allMatches.length)} / {allMatches.length} pairs</small></p></button>} />
    <MatchModeTabs view={view} onChange={onView} />
    <div className="tb3-progress" role="progressbar" aria-label="Local snapshot re-evaluation progress" aria-valuemin={0} aria-valuemax={100} aria-valuenow={replayProgress}><i style={{ width: `${replayProgress}%` }} /><span>{replayProgress}%</span></div>
    <section className="tb3-match-workspace">
      <aside className="tb3-picker"><header><span>{view === "match-tenders" ? "TENDERS" : "SUPPLIERS"}</span><b>{view === "match-tenders" ? `${demoTenders.length} frozen records` : `${demoSuppliers.length} researched profiles`}</b></header>{view === "match-tenders" ? demoTenders.map((entry) => <button className={entry.id === tender.id ? "active" : ""} key={entry.id} onClick={() => { const best = bestLegacyMatch(allMatches.filter((match) => match.tenderId === entry.id)); if (best) onOpen(best); }}><span>{entry.sourceLabel}</span><b>{entry.reference}</b><p>{entry.title}</p><small>{entry.country} · {dateLabel(entry.deadlineAt)}</small></button>) : demoSuppliers.map((entry) => <button className={entry.id === supplier.id ? "active" : ""} key={entry.id} onClick={() => { const best = bestLegacyMatch(allMatches.filter((match) => match.supplierId === entry.id)); if (best) onOpen(best); }}><span>CN</span><p><b>{entry.legalEnglishName}</b><small>{supplierActivity(entry)} · readiness {entry.readiness.value}/100 EST.</small></p><i>→</i></button>)}</aside>
      <article className="tb3-ranking"><header><div><span>{view === "match-tenders" ? tender.sourceLabel : "SELECTED SUPPLIER"}</span><h2>{view === "match-tenders" ? tender.title : supplier.legalEnglishName}</h2><p>{view === "match-tenders" ? `${tender.buyer} · ${tender.country}` : `${supplier.headquarters.city}, ${supplier.headquarters.province} · ${supplier.companyType.join(" + ")}`}</p></div><div><small>{view === "match-tenders" ? "DEADLINE" : "READINESS"}</small><b>{view === "match-tenders" ? dateLabel(tender.deadlineAt) : `${supplier.readiness.value}/100`}</b><small>{view === "match-tenders" ? "STATUS" : "EVIDENCE"}</small><b>{view === "match-tenders" ? result.match.tenderFreshness.status : `${supplier.legacyEvidenceCompleteness}/100 EST.`}</b></div></header><div className="tb3-ranking-head"><span>{view === "match-tenders" ? "SUPPLIER" : "TENDER"}</span><span>READINESS</span><span>LEGACY</span><span>AUDITED</span><span>DECISION</span></div><div className="tb3-ranking-rows">{(view === "match-tenders" ? tenderMatches : supplierMatches).map((assessment) => { const rowSupplier = demoSuppliers.find((entry) => entry.id === assessment.supplierId)!; const rowTender = demoTenders.find((entry) => entry.id === assessment.tenderId)!; const cachedDecision = caseResults[assessment.key]?.match.consultantDecision ?? assessment.consultantDecision; return <button className={assessment.key === result.match.key ? "selected" : ""} key={assessment.key} onClick={() => onOpen(assessment)}><div><span>{view === "match-tenders" ? "CN" : "IFI"}</span><p><b>{view === "match-tenders" ? rowSupplier.legalEnglishName : rowTender.title}</b><small>{view === "match-tenders" ? supplierActivity(rowSupplier) : `${rowTender.reference} · ${rowTender.country} · ${rowTender.object}`}</small></p></div><strong>{rowSupplier.readiness.value}<small>EST.</small></strong><strong className={scoreBand(assessment.matchScore.value)}>{assessment.matchScore.value ?? "—"}<small>{assessment.matchScore.value === null ? "MISSING" : "EST."}</small></strong><strong className={scoreBand(assessment.auditedMatch.value)}>{assessment.auditedMatch.value ?? "—"}<small>{assessment.auditedMatch.value === null ? "MISSING" : "AUDITED"}</small></strong><em className={`tb3-state ${cachedDecision}`}>{decisionLabel[cachedDecision]}</em></button>; })}</div></article>
      <MatchReviewPanel result={result} tender={tender} supplier={supplier} onViewChange={onView} onDecision={onDecision} onCampaign={onCampaign} />
    </section>
  </>;
}

function VerificationView({ view, supplier, allMatches, onView, onOpen }: { view: WorkspaceView; supplier: SupplierRecord; allMatches: MatchAssessment[]; onView: (view: WorkspaceView) => void; onOpen: (assessment: MatchAssessment) => void }) {
  return <>
    <ViewHeader eyebrow="03 · SUPPLIERS / VERIFICATION" title="Verification" description="Inspect every evidence record, confidence value, source reference, retrieval date, risk, and verification question before using a claim." aside={<div className="tb3-directory-count"><b>{supplier.evidence.filter((entry) => ["LEGACY_VERIFIED", "REVIEWED"].includes(entry.reviewStatus)).length}/{supplier.evidence.length}</b><span>legacy-verified facts</span></div>} />
    <SupplierTabs view={view} onChange={onView} />
    <section className="tb3-evidence-layout"><aside className="tb3-picker"><header><span>SUPPLIERS</span><b>{demoSuppliers.length} profiles</b></header>{demoSuppliers.map((entry) => <button className={entry.id === supplier.id ? "active" : ""} key={entry.id} onClick={() => { const best = bestLegacyMatch(allMatches.filter((match) => match.supplierId === entry.id)); if (best) onOpen(best); }}><span>CN</span><p><b>{entry.legalEnglishName}</b><small>Readiness {entry.readiness.value}/100 · ESTIMATED</small></p><i>→</i></button>)}</aside><article className="tb3-evidence-card"><header><span>CN</span><div><p>PRELIMINARY PROFILE · FROZEN ACCIO RESEARCH</p><h2>{supplier.legalEnglishName}</h2><small>{supplier.legalChineseName} · {supplier.companyType.join(" + ")}</small></div></header><div className="tb3-evidence-legend"><span className="verified">Legacy verified</span><span className="inferred">Inferred · internal only</span><span className="unknown">Unknown / MISSING</span></div><div className="tb3-fact-table"><div className="head"><span>FACT</span><span>VALUE</span><span>STATUS</span><span>CONFIDENCE</span><span>SOURCE RECORD</span></div>{supplier.evidence.map((entry) => <div className="row" key={entry.id}><b>{entry.field}</b><p>{entry.value || "MISSING"}</p><span className={evidenceStatusClass(entry.reviewStatus)}>{entry.reviewStatus.replace("LEGACY_", "")}</span><strong>{entry.confidence ? `${entry.confidence}%` : "—"}</strong><small>{entry.sourceTitle}{entry.sourceUrl && <a href={entry.sourceUrl} target="_blank" rel="noreferrer">Open source ↗</a>}<i>{entry.retrievedAt} · {entry.id}</i></small></div>)}</div><div className="tb3-guardrail"><i>!</i><p><b>Claim protection</b><span>Inferred, unknown, low-confidence, and unlinked facts are excluded from campaign proof. All local drafts remain NOT SENT.</span></p></div></article><aside className="tb3-audit-aside"><span>AUDIT SUMMARY</span><h3>Profile provenance</h3><div><b>{supplier.evidence.length}</b><small>evidence records</small></div><div><b>{supplier.evidence.filter((entry) => entry.reviewStatus === "INFERRED").length}</b><small>inferences</small></div><div><b>{supplier.evidence.filter((entry) => entry.reviewStatus === "UNKNOWN").length}</b><small>unknown fields</small></div><p>Every fact retains retrieval date, confidence, status, value class, and source identity.</p><section><b>CONSULTANT FLAGS</b>{supplier.risks.slice(0, 3).map((risk) => <p key={risk}>! {risk}</p>)}{supplier.verificationQuestions.slice(0, 2).map((question) => <p key={question}>? {question}</p>)}</section><a href={supplier.officialWebsite} target="_blank" rel="noreferrer">Official supplier website ↗</a><button onClick={() => onView("match-tenders")}>Back to match review</button></aside></section>
  </>;
}

function AuditView({ result }: { result: TenderMatchCaseResult }) {
  return <>
    <ViewHeader eyebrow="05 · CASE / AUDIT" title="Case Audit" description="The complete migration keeps the Stage 1/2 Case identity, evidence-linked scoring, saved-state migration, and consultant-decision provenance." />
    <section className="tb3-audit-grid"><article><span>IDENTITY CHAIN</span><h2>One matching result</h2><dl><div><dt>Case</dt><dd>{result.caseIdentity.id} · {result.caseIdentity.version}</dd></div><div><dt>Result</dt><dd>{result.resultIdentity.id}</dd></div><div><dt>Tender</dt><dd>{result.tenderIdentity.id}</dd></div><div><dt>Company</dt><dd>{result.supplierIdentity.id}</dd></div><div><dt>Match</dt><dd>{result.match.id} · {result.match.version}</dd></div><div><dt>Evidence</dt><dd>{result.evidenceSnapshotIdentity.id}</dd></div><div><dt>Decision</dt><dd>{result.decisionIdentity.id} · {result.match.decisionHistory.length} recorded</dd></div></dl></article><article><span>SOURCE + VALUE POLICY</span><h2>Dated inputs, explicit meanings</h2><p>Legacy score and readiness remain historical estimates. Audited support exists only with both required evidence components. Evidence quality, deadline urgency, and decision remain separate.</p><div className="tb3-value-classes">{["SOURCE", "CALCULATED", "ESTIMATED", "ASSUMED", "MISSING"].map((entry) => <b key={entry}>{entry}</b>)}</div><p><strong>Policies:</strong> {result.match.auditedMatch.policyVersion} · {result.match.deadlineUrgency.policyVersion}</p></article><article><span>DECISION PROVENANCE</span><h2>Human review history</h2><p>TenderMatch records match disposition only. It does not make a participation or Bid/No-Bid decision.</p><div className="tb3-decision-history">{result.match.decisionHistory.length ? result.match.decisionHistory.map((entry) => <div key={entry.id}><b>{entry.decision}</b><span>{entry.actorId} · {entry.decidedAt}</span><p>{entry.rationale}</p></div>) : <small>No consultant decision event recorded.</small>}</div></article><article><span>KNOWN LIMITATIONS</span><h2>Current safe boundary</h2>{result.knownLimitations.map((entry) => <p key={entry}>— {entry}</p>)}<p>— Campaign Studio is a separately versioned local legacy parity module, not TL-A031 output.</p><p><strong>Case compatibility:</strong> {result.migration.status} · {result.migration.note}</p></article></section>
  </>;
}

type CampaignsViewProps = {
  currentAssessment: MatchAssessment;
  campaigns: LegacyCampaignRecord[];
  currentCampaign: LegacyCampaignRecord | null;
  currentCampaignResult: TenderMatchCaseResult;
  currentCampaignTender: TenderRecord;
  currentCampaignSupplier: SupplierRecord;
  currentCampaignAssessment: MatchAssessment;
  matchByKey: Map<string, MatchAssessment>;
  composerOpen: boolean;
  createMode: "tender" | "supplier" | "match";
  campaignTenderId: string;
  campaignSupplierId: string;
  composerCandidates: MatchAssessment[];
  suggestedCampaigns: Array<{ assessment: MatchAssessment; priority: number }>;
  suggestionsOpen: boolean;
  pipelineOpen: boolean;
  onView: (view: WorkspaceView) => void;
  onComposerOpen: (open: boolean) => void;
  onCreateMode: (mode: "tender" | "supplier" | "match") => void;
  onTenderId: (id: string) => void;
  onSupplierId: (id: string) => void;
  onCreate: (assessment: MatchAssessment, origin: LegacyCampaignOrigin) => void;
  onSuggestionsOpen: React.Dispatch<React.SetStateAction<boolean>>;
  onPipelineOpen: React.Dispatch<React.SetStateAction<boolean>>;
  onSelectCampaign: (id: string) => void;
  onObjective: (objective: LegacyCampaignObjectiveId) => void;
  onChannel: (channel: string) => void;
  onCopy: (value: string) => void;
  onNote: (value: string) => void;
  onApproval: () => void;
  onSimulate: () => void;
  onAdvance: (action: "approval" | "simulate" | "follow-up" | "interested" | "no-response" | "closed") => void;
  onVerification: () => void;
};

function CampaignsView(props: CampaignsViewProps) {
  return <>
    <ViewHeader eyebrow="06 · MIGRATED LEGACY MODULE / CAMPAIGNS" title="Campaign Studio" description="Complete original local drafting coverage is retained for migration parity. This module is unplaced, browser-local, NOT SENT, and outside agent:TL-A031." aside={<div className="tb3-campaign-actions"><span>LEGACY MODULE · NO INTEGRATION</span><button onClick={() => { props.onCreateMode("match"); props.onComposerOpen(true); }}>+ Create local draft</button></div>} />
    <CampaignTabs view="campaigns" onChange={props.onView} />
    <section className="tb3-legacy-warning"><div><span>ARCHITECTURE BOUNDARY</span><b>Retained for parity—not registered as an Agent</b><p>Campaign design, promotion, messaging, CRM action, delivery, and response tracking require a separate 64-Agent placement audit. No Agent 65 is reserved.</p></div><strong>ALL DRAFTS<br />NOT SENT</strong></section>
    {props.composerOpen && <section className="tb3-campaign-composer"><header><div><span>CONSULTANT-DRIVEN LOCAL CREATION</span><h2>Create Campaign Draft</h2><p>Choose an evaluated pair. Unassessed/MISSING pairs are excluded.</p></div><button aria-label="Close campaign creator" onClick={() => props.onComposerOpen(false)}>×</button></header><nav aria-label="Campaign creation starting point"><button className={props.createMode === "tender" ? "active" : ""} onClick={() => props.onCreateMode("tender")}>Start with Tender</button><button className={props.createMode === "supplier" ? "active" : ""} onClick={() => props.onCreateMode("supplier")}>Start with Supplier</button><button className={props.createMode === "match" ? "active" : ""} onClick={() => props.onCreateMode("match")}>Current Match</button></nav>{props.createMode === "tender" && <label><span>SELECT TENDER</span><select value={props.campaignTenderId} onChange={(event) => props.onTenderId(event.target.value)}>{demoTenders.map((entry) => <option key={entry.id} value={entry.id}>{entry.reference} · {entry.object} · {entry.country}</option>)}</select></label>}{props.createMode === "supplier" && <label><span>SELECT SUPPLIER</span><select value={props.campaignSupplierId} onChange={(event) => props.onSupplierId(event.target.value)}>{demoSuppliers.map((entry) => <option key={entry.id} value={entry.id}>{entry.legalEnglishName} · {supplierActivity(entry)}</option>)}</select></label>}<div className="tb3-composer-candidates">{props.composerCandidates.length ? props.composerCandidates.slice(0, 8).map((assessment) => { const rowSupplier = demoSuppliers.find((entry) => entry.id === assessment.supplierId)!; const rowTender = demoTenders.find((entry) => entry.id === assessment.tenderId)!; const existing = props.campaigns.find((entry) => entry.matchKey === assessment.key); return <article key={assessment.key}><div><span className={scoreBand(assessment.matchScore.value)}>{assessment.matchScore.value}</span><p><b>{rowSupplier.legalEnglishName}</b><small>{supplierActivity(rowSupplier)} → {rowTender.object}</small><em>{rowTender.reference} · {rowTender.country} · {assessment.tenderFreshness.daysRemaining}d</em></p></div><p>{assessment.auditedMatch.value === null ? "Audited support MISSING · draft allowed, activation blocked" : `Audited support ${assessment.auditedMatch.value} · ${assessment.linkedStrengths.length} evidence-linked claims`}</p><button onClick={() => props.onCreate(assessment, "consultant")}>{existing ? "Open Draft" : "Create Draft"}</button></article>; }) : <div className="tb3-empty"><b>No evaluated positive pair in this selection.</b><span>MISSING pairs are excluded rather than treated as zero.</span></div>}</div></section>}
    <section className="tb3-suggestions"><header><div><span>TENDERBOOST LEGACY RECOMMENDATIONS</span><h2>Suggested Campaign Drafts</h2><p>Priority remains separate from Match, readiness, evidence quality, urgency, and consultant decision.</p></div><div><b>{props.suggestedCampaigns.length} candidates</b><button aria-expanded={props.suggestionsOpen} onClick={() => props.onSuggestionsOpen((value) => !value)}>{props.suggestionsOpen ? "Collapse" : "Expand"}</button></div></header>{props.suggestionsOpen && <div>{props.suggestedCampaigns.length ? props.suggestedCampaigns.slice(0, 6).map(({ assessment, priority }) => { const rowSupplier = demoSuppliers.find((entry) => entry.id === assessment.supplierId)!; const rowTender = demoTenders.find((entry) => entry.id === assessment.tenderId)!; return <article key={assessment.key}><div className="tb3-priority"><span>LEGACY CAMPAIGN PRIORITY</span><b>{priority}<small>/100 EST.</small></b><i><em style={{ width: `${priority}%` }} /></i></div><section><div><span>SUPPLIER</span><h3>{rowSupplier.legalEnglishName}</h3><small>{supplierActivity(rowSupplier)}</small></div><b>×</b><div><span>TENDER</span><h3>{rowTender.title}</h3><small>{rowTender.object} · {rowTender.country}</small></div></section><p><b>Match {assessment.matchScore.value}/100 EST.</b><span>{assessment.auditedMatch.value === null ? "Audited support MISSING" : `Audited support ${assessment.auditedMatch.value}`}</span><span>{assessment.tenderFreshness.status} · {assessment.tenderFreshness.freshness}</span></p><button onClick={() => props.onCreate(assessment, "suggested")}>Create local draft →</button></article>; }) : <div className="tb3-empty"><b>No new draft suggestions.</b><span>Existing, rejected, and unassessed pairs are excluded.</span></div>}</div>}</section>
    <section className="tb3-campaign-pipeline"><header><div><span>LOCAL LIFECYCLE</span><h2>Campaign Pipeline</h2><p>Draft and approval are human actions. Every later stage is an explicit simulation and remains NOT SENT.</p></div><div><b>{props.campaigns.length} records</b><button aria-expanded={props.pipelineOpen} onClick={() => props.onPipelineOpen((value) => !value)}>{props.pipelineOpen ? "Collapse" : "Expand"}</button></div></header>{props.pipelineOpen && <div className="tb3-campaign-board">{[
      { title: "Drafts", stages: ["draft", "approved"] as LegacyCampaignStage[] },
      { title: "Active simulations", stages: ["active-simulation", "follow-up-simulation"] as LegacyCampaignStage[] },
      { title: "Completed simulations", stages: ["interested-simulation", "no-response-simulation", "closed"] as LegacyCampaignStage[] },
    ].map((group) => { const entries = props.campaigns.filter((record) => group.stages.includes(record.stage)); return <article key={group.title}><header><h3>{group.title}</h3><b>{entries.length}</b></header><div>{entries.length ? entries.map((record) => { const assessment = props.matchByKey.get(record.matchKey); const rowSupplier = demoSuppliers.find((entry) => entry.id === assessment?.supplierId); const rowTender = demoTenders.find((entry) => entry.id === assessment?.tenderId); return <button className={record.id === props.currentCampaign?.id ? "active" : ""} key={record.id} onClick={() => props.onSelectCampaign(record.id)}><span className={`tb3-campaign-stage ${record.stage}`}>{campaignStageLabel[record.stage]}</span><b>{rowSupplier?.legalEnglishName}</b><small>{rowTender?.reference} · {record.communicationStatus}</small><em>Revision {record.revision}</em></button>; }) : <p>No records in this stage.</p>}</div></article>; })}</div>}</section>
    {props.currentCampaign && <CampaignWorkspace record={props.currentCampaign} result={props.currentCampaignResult} tender={props.currentCampaignTender} supplier={props.currentCampaignSupplier} onObjective={props.onObjective} onChannel={props.onChannel} onCopy={props.onCopy} onNote={props.onNote} onApproval={props.onApproval} onSimulate={props.onSimulate} onAdvance={(action) => props.onAdvance(action)} onVerification={props.onVerification} />}
  </>;
}

function FollowupsView({ campaigns, matchByKey, onView, onSelectCampaign }: { campaigns: LegacyCampaignRecord[]; matchByKey: Map<string, MatchAssessment>; onView: (view: WorkspaceView) => void; onSelectCampaign: (id: string) => void }) {
  const simulated = campaigns.filter((entry) => entry.events.some((event) => event.type === "SIMULATION_STARTED"));
  return <>
    <ViewHeader eyebrow="06 · MIGRATED LEGACY MODULE / FOLLOW-UPS" title="Follow-ups" description="Only campaigns with a recorded local simulation-start event appear here. No message, call, delivery, CRM action, or external response is claimed." />
    <CampaignTabs view="followups" onChange={onView} />
    <section className="tb3-radar-kpis"><Metric label="CAMPAIGN RECORDS" value={campaigns.length} note="browser-local" /><Metric label="APPROVED CONTENT" value={campaigns.filter((entry) => entry.approval).length} note="not activation" /><Metric label="ACTIVE SIMULATIONS" value={campaigns.filter((entry) => ["active-simulation", "follow-up-simulation"].includes(entry.stage)).length} note="NOT SENT" /><Metric label="SIMULATED RESPONSES" value={campaigns.filter((entry) => ["interested-simulation", "no-response-simulation"].includes(entry.stage)).length} note="not external events" signal /></section>
    <section className="tb3-followup-layout"><article className="tb3-followup-table"><header><span>SIMULATION PIPELINE</span><h2>Campaign and follow-up status</h2></header><div className="head"><span>SUPPLIER / TENDER</span><span>DRAFT</span><span>STATUS</span><span>LAST EVENT</span><span>NOTE</span></div>{simulated.length ? simulated.map((record) => { const assessment = matchByKey.get(record.matchKey)!; const rowSupplier = demoSuppliers.find((entry) => entry.id === assessment.supplierId)!; const rowTender = demoTenders.find((entry) => entry.id === assessment.tenderId)!; const lastEvent = record.events.at(-1)!; return <div className="row" key={record.id}><div><b>{rowSupplier.legalEnglishName}</b><small>{rowTender.reference} · {rowTender.object}</small><button onClick={() => { onSelectCampaign(record.id); onView("campaigns"); }}>Open campaign →</button></div><div><span>{record.channel}</span><small>{record.communicationStatus}</small></div><div><strong>{campaignStageLabel[record.stage]}</strong><small>simulation only</small></div><div><span>{lastEvent.type.replaceAll("_", " ")}</span><small>{lastEvent.occurredAt}</small></div><div><span>{record.consultantNote || "No internal note"}</span></div></div>; }) : <div className="tb3-empty"><b>No follow-up simulation records yet.</b><span>Approve a local draft and explicitly start its isolated lifecycle simulation first.</span></div>}</article><aside className="tb3-event-log"><header><span>AUDIT LOG</span><h2>Latest local events</h2></header>{campaigns.flatMap((record) => record.events.map((event) => ({ record, event }))).sort((left, right) => right.event.occurredAt.localeCompare(left.event.occurredAt)).slice(0, 8).map(({ record, event }) => <div key={event.id}><span>{event.simulationOnly ? "SIMULATION" : "HUMAN"}</span><p><b>{event.type.replaceAll("_", " ")}</b><small>{record.id} · {event.occurredAt}</small></p></div>)}</aside></section>
    <section className="tb3-handoff-lock"><div><span>PROPOSALPREP AI</span><h2>External handoff is not part of this migration baseline</h2><p>A simulated interested response does not authorize a transfer. A separately approved integration event would be required.</p></div><button disabled>Transfer to ProposalPrep AI →</button></section>
  </>;
}

function MatchReviewPanel({ result, tender, supplier, onViewChange, onDecision, onCampaign }: { result: TenderMatchCaseResult; tender: TenderRecord; supplier: SupplierRecord; onViewChange: (view: WorkspaceView) => void; onDecision: (decision: ConsultantDecision) => void; onCampaign: () => void }) {
  return <aside className="tb3-match-review"><header><span>SELECTED EXPLICIT CASE</span><b className={scoreBand(result.match.auditedMatch.value)}>{result.match.auditedMatch.value ?? "—"}</b></header><h2>{supplier.legalEnglishName}</h2><p>{tender.reference} · {tender.country}</p><div className="tb3-breakdown">{[
    ["Audited support", result.match.auditedMatch.value, result.match.auditedMatch.valueClass],
    ["Legacy score", result.match.matchScore.value, result.match.matchScore.valueClass],
    ["Readiness", result.match.supplierReadiness.value, result.match.supplierReadiness.valueClass],
    ["Evidence quality", result.match.verificationQuality.value, result.match.verificationQuality.valueClass],
    ["Deadline urgency", result.match.deadlineUrgency.value, result.match.deadlineUrgency.valueClass],
  ].map(([label, value, valueClass]) => <div key={String(label)}><span>{label}</span><i><b style={{ width: `${value ?? 0}%` }} /></i><strong>{value ?? "—"}<small>{value === null ? "MISSING" : valueClass}</small></strong></div>)}</div><section><span>EVIDENCE-LINKED STRENGTHS</span><div>{result.match.linkedStrengths.length ? result.match.linkedStrengths.map((claim) => <article key={claim.id}><b>✓ {claim.text}</b>{claim.evidenceIds.map((id) => <code key={id}>{id}</code>)}</article>) : <p>No evidence-linked strength is available.</p>}</div></section><section className="gaps"><span>GAPS / UNKNOWNS</span><div>{result.match.gaps.length ? result.match.gaps.map((gap) => <p key={gap}>? {gap}</p>) : <p>No legacy gap recorded.</p>}{result.reviewSupport.findings.map((finding) => <p key={finding.code}>! {finding.code}: {finding.nextAction}</p>)}</div></section><button className="tb3-evidence-link" onClick={() => onViewChange("verification")}>Open supplier verification →</button><div className="tb3-decision-actions"><button className={result.match.consultantDecision === "rejected" ? "selected reject" : ""} onClick={() => onDecision("rejected")}>Reject</button><button className={result.match.consultantDecision === "hold" ? "selected" : ""} onClick={() => onDecision("hold")}>Hold</button><button disabled={!result.reviewSupport.readyForCurrentDecision} className={result.match.consultantDecision === "approved" ? "selected" : ""} onClick={() => onDecision("approved")}>Approve match</button></div>{result.match.matchScore.value !== null && result.match.matchScore.value > 0 && <button className="tb3-campaign-link" onClick={onCampaign}>Create legacy local draft →</button>}<small className="tb3-owner-boundary">Match decision: TL-A031 workspace · Campaign draft: isolated unplaced legacy module</small></aside>;
}

function CampaignWorkspace({ record, result, tender, supplier, onObjective, onChannel, onCopy, onNote, onApproval, onSimulate, onAdvance, onVerification }: { record: LegacyCampaignRecord; result: TenderMatchCaseResult; tender: TenderRecord; supplier: SupplierRecord; onObjective: (objective: LegacyCampaignObjectiveId) => void; onChannel: (channel: string) => void; onCopy: (value: string) => void; onNote: (value: string) => void; onApproval: () => void; onSimulate: () => void; onAdvance: (action: "follow-up" | "interested" | "no-response" | "closed") => void; onVerification: () => void }) {
  const blockers = legacyCampaignActivationBlockers(result, supplier);
  return <section className="tb3-campaign-workspace"><header><div><span>LOCAL LEGACY WORKSPACE · {record.origin.toUpperCase()}</span><h2>Campaign Workspace</h2><p>{supplier.legalEnglishName} <i>×</i> {tender.object}</p></div><div><b className={`tb3-campaign-stage ${record.stage}`}>{campaignStageLabel[record.stage]}</b><small>Revision {record.revision} · {record.communicationStatus}</small></div></header><section className="tb3-objective"><label><span>DRAFT OBJECTIVE</span><select value={record.objective} onChange={(event) => onObjective(event.target.value as LegacyCampaignObjectiveId)}>{legacyCampaignObjectives.map((entry) => <option value={entry.id} key={entry.id}>{entry.label}</option>)}</select><small>{legacyCampaignObjectives.find((entry) => entry.id === record.objective)?.description}</small></label><aside><span>REAL ACTIVATION GATE</span><b>{blockers.length ? `${blockers.length} blockers` : "Evidence gate satisfied"}</b>{blockers.length ? blockers.map((blocker) => <p key={blocker}>! {blocker.replaceAll("_", " ")}</p>) : <p>Sending still requires a separately authorized integration event.</p>}</aside></section><section className="tb3-campaign-context"><div><span>OPPORTUNITY</span><b>{tender.object}</b><p>{tender.reference} · {tender.country} · {result.match.tenderFreshness.status}</p></div><i>→</i><div><span>COMPANY</span><b>{supplier.legalEnglishName}</b><p>{supplierActivity(supplier)} · readiness {supplier.readiness.value} EST.</p></div><i>→</i><div><span>MATCH / AUDITED</span><b>{result.match.matchScore.value ?? "MISSING"} / {result.match.auditedMatch.value ?? "MISSING"}</b><p>separate historical and audited values</p></div><i>→</i><div><span>COMMUNICATION</span><b>{record.communicationStatus}</b><p>local draft or simulation only</p></div></section><section className="tb3-campaign-grid"><aside className="tb3-channel-list"><header><span>CHANNEL FORMATS</span><b>Local copy only</b></header>{legacyCampaignChannels.map((channel) => <button className={record.channel === channel ? "active" : ""} key={channel} onClick={() => onChannel(channel)}><span>{channel.slice(0, 2).toUpperCase()}</span><p><b>{channel}</b><small>{record.channel === channel ? "Selected · NOT SENT" : "Alternative format"}</small></p><i>{record.channel === channel ? "✓" : "→"}</i></button>)}</aside><article className="tb3-copy-editor"><header><div><span>LEGACY CAMPAIGN COPY · EVIDENCE-GATED</span><h2>{legacyCampaignObjectives.find((entry) => entry.id === record.objective)?.shortLabel} · {record.channel}</h2></div><b>{campaignStageLabel[record.stage].toUpperCase()} · NOT SENT</b></header><textarea aria-label="Editable local campaign draft" value={record.draftCopy} onChange={(event) => onCopy(event.target.value)} spellCheck /><div className="tb3-copy-evidence"><span>EVIDENCE IDS USED</span>{result.match.auditedMatch.evidenceIds.length ? result.match.auditedMatch.evidenceIds.map((id) => <code key={id}>{id}</code>) : <i>MISSING · no evidence-linked claim may be asserted</i>}</div><div className="tb3-copy-guardrail"><span>EXCLUDED / UNRESOLVED</span><p>{result.match.gaps.length ? result.match.gaps.slice(0, 4).join(" · ") : "No legacy gap recorded; current-source review may still be required."}</p></div><label><span>CONSULTANT NOTE</span><input value={record.consultantNote} onChange={(event) => onNote(event.target.value)} placeholder="Add an internal local note" /></label><div className="tb3-copy-actions"><button onClick={onVerification}>Open Verification</button>{["draft", "approved"].includes(record.stage) && <button className="approve" onClick={onApproval}>{record.stage === "approved" ? "Return to Draft" : "Approve Content"}</button>}{record.stage === "approved" && <button className="simulate" onClick={onSimulate}>Start lifecycle simulation</button>}{record.stage === "active-simulation" && <><button className="simulate" onClick={() => onAdvance("follow-up")}>Simulate follow-up</button><button onClick={() => onAdvance("interested")}>Simulate interested</button><button onClick={() => onAdvance("no-response")}>Simulate no response</button></>}{record.stage === "follow-up-simulation" && <><button onClick={() => onAdvance("interested")}>Simulate interested</button><button onClick={() => onAdvance("no-response")}>Simulate no response</button></>}{["interested-simulation", "no-response-simulation"].includes(record.stage) && <button onClick={() => onAdvance("closed")}>Close simulation</button>}<button disabled title="No authorized delivery integration or event exists">Send / activate externally</button></div></article><aside className="tb3-sequence"><span>{record.stage.includes("simulation") ? "SIMULATION ACTIVE · NOT SENT" : "LOCAL PLAN · NOT SCHEDULED"}</span><h3>Deadline-aware cadence</h3>{[0, 2, 5, Math.max(0, result.match.tenderFreshness.daysRemaining - 1)].filter((day, index, values) => day >= 0 && values.indexOf(day) === index).slice(0, 4).map((day, index) => <div key={day}><span>{index + 1}</span><p><b>Day {day}</b><small>{index === 0 ? "Opportunity brief" : index === 1 ? "Evidence summary" : index === 2 ? "Qualification call plan" : "Deadline reminder plan"}</small></p></div>)}<p>No task is scheduled and no external activity has occurred.</p><section><b>STOP RULES</b><p>Reply · opt-out · invalid address · consultant stop · tender deadline</p></section></aside></section><footer><span>EVENT PROVENANCE</span>{record.events.slice(-5).map((entry) => <div key={entry.id}><b>{entry.type.replaceAll("_", " ")}</b><small>{entry.simulationOnly ? "SIMULATION" : "HUMAN"} · {entry.occurredAt} · {entry.actorId}</small><p>{entry.rationale}</p></div>)}</footer></section>;
}

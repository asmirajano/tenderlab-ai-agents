import { useEffect, useMemo, useRef, useState, type KeyboardEvent, type KeyboardEvent as ReactKeyboardEvent, type PointerEvent as ReactPointerEvent, type ReactNode } from "react";
import {
  assessmentFromExploratoryEvaluation,
  countryTenderRadarClusters,
  createCaseResult,
  formulaEvaluationsToCsv,
  runtimeTenders,
  loadCaseResult,
  mapSupplierProfileToWorkspace,
  readinessLabel,
  resumeCaseResult,
  saveCaseResult,
  setConsultantDecision,
  tenderMatchFormulaExcelFileName,
  tenderMatchFormulaExportFileName,
  supplierActivity,
  tenderRadarCoordinate,
  worldRadarClusters,
  type ConsultantDecision,
  type ExploratoryMatchEvaluation,
  type MatchAssessment,
  type SupplierEvidenceApiRecord,
  type SupplierProfileApiRecord,
  type SupplierRecord,
  type TenderMatchRuntimePayload,
  type TenderMatchCaseResult,
  type TenderRecord,
} from "../../../packages/tendermatch/src";
import { AgentRoleCallout } from "./agent-role-callout.tsx";
import { PracticalAgentOverview, PracticalAgentOverviewBoundary, PracticalAgentOverviewPart } from "./practical-agent-overview.tsx";
import { loadSupplierEvidence, loadTenderMatchRuntime, type TenderMatchRuntimeState } from "./tendermatch-supplier-api.ts";
import { tenderMatchFormulaToExcel } from "./tendermatch-formula-excel.ts";

type WorkspaceView =
  | "dashboard"
  | "radar-tenders"
  | "radar-suppliers"
  | "suppliers"
  | "verification"
  | "tenders"
  | "matrix"
  | "match-tenders"
  | "match-suppliers";

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

function navGroupsFor(supplierCount: number): NavGroup[] { return [
  { id: "overview", label: "Overview", short: "01", family: "overview", sublabel: "Internal matching workspace", items: [{ id: "dashboard", label: "Overview", short: "01", sublabel: "Internal matching workspace" }] },
  { id: "market", label: "Market Radar", short: "02", family: "intelligence", sublabel: "Source discovery", items: [
    { id: "radar-tenders", label: "Tenders", short: "02A", sublabel: "Global demand" },
    { id: "radar-suppliers", label: "Suppliers", short: "02B", sublabel: "Supplier market" },
  ] },
  { id: "suppliers", label: "Suppliers", short: "03", family: "intelligence", sublabel: "Profiles and evidence", items: [
    { id: "suppliers", label: "Profiles", short: "03A", sublabel: `${supplierCount} companies` },
    { id: "verification", label: "Verification", short: "03B", sublabel: "Evidence + provenance" },
  ] },
  { id: "tender-directory", label: "Tenders", short: "04", family: "intelligence", sublabel: `${runtimeTenders.length} current records`, items: [{ id: "tenders", label: "Tenders", short: "04", sublabel: `${runtimeTenders.length} current records` }] },
  { id: "match", label: "Match Matrix", short: "05", family: "analysis", sublabel: "Evaluate and review", items: [
    { id: "matrix", label: "Full Match Matrix", short: "05A", sublabel: `${supplierCount} × ${runtimeTenders.length}` },
    { id: "match-tenders", label: "Review by Tenders", short: "05B", sublabel: "Tender-first" },
    { id: "match-suppliers", label: "Review by Suppliers", short: "05C", sublabel: "Supplier-first" },
  ] },
]; }

const workspaceViewIds = new Set<WorkspaceView>(navGroupsFor(0).flatMap((group) => group.items).map((item) => item.id));

export function resolveTenderMatchWorkspaceView(candidate: string | null | undefined): WorkspaceView {
  if (candidate === "audit") return "matrix";
  return candidate && workspaceViewIds.has(candidate as WorkspaceView) ? candidate as WorkspaceView : "dashboard";
}

function initialWorkspaceView(): WorkspaceView {
  if (typeof window === "undefined") return "dashboard";
  const url = new URL(window.location.href);
  const hashView = url.hash.replace(/^#\/?/, "").split("/").at(-1);
  return resolveTenderMatchWorkspaceView(url.searchParams.get("view") ?? hashView);
}

function navGroupForView(view: WorkspaceView, navGroups: NavGroup[]) {
  return navGroups.find((group) => group.items.some((item) => item.id === view))!;
}

function activateNavigationFromKeyboard(event: KeyboardEvent<HTMLButtonElement>, action: () => void) {
  if (event.key !== "Enter" && event.key !== " ") return;
  event.preventDefault();
  action();
}

function WorkspaceNavigation({ compact = false, expanded, navGroups, onToggle, onView, view }: {
  compact?: boolean;
  expanded: Record<NavGroupId, boolean>;
  navGroups: NavGroup[];
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
const actorId = "actor:tenderlab-consultant:local-demo";

function slug(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 72);
}

function caseIdFor(tender: TenderRecord, supplier: SupplierRecord) {
  return `case:TM-PILOT:${slug(tender.reference)}:${slug(supplier.id)}`;
}

function matchKey(tender: TenderRecord, supplier: SupplierRecord) {
  return `${tender.id}::${supplier.id}`;
}

function dateLabel(value: string) {
  return new Intl.DateTimeFormat("en-GB", { day: "2-digit", month: "short", year: "numeric", timeZone: "Asia/Tashkent" }).format(new Date(value));
}

function scoreBand(value: number | null) {
  if (value === null || value <= 20) return "archive";
  if (value >= 61) return "priority";
  if (value >= 41) return "review";
  return "archive";
}

function downloadText(fileName: string, contents: string) {
  const url = URL.createObjectURL(new Blob([contents], { type: "text/csv;charset=utf-8" }));
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = fileName;
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1_000);
}

function downloadBytes(fileName: string, contents: Uint8Array) {
  const url = URL.createObjectURL(new Blob([contents.buffer as ArrayBuffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }));
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = fileName;
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1_000);
}

function compareMatches(left: MatchAssessment, right: MatchAssessment) {
  return (right.auditedMatch.value ?? -1) - (left.auditedMatch.value ?? -1)
    || (right.auditedMatch.dataCoverage ?? 0) - (left.auditedMatch.dataCoverage ?? 0)
    || left.key.localeCompare(right.key);
}

function evidenceStatusClass(status: string) {
  if (["LEGACY_VERIFIED", "REVIEWED"].includes(status)) return "verified";
  if (status === "INFERRED") return "inferred";
  if (status === "STATED_UNVERIFIED") return "stated";
  return "unknown";
}

function bestLegacyMatch(matches: MatchAssessment[]) {
  return [...matches].sort(compareMatches)[0];
}

const supplierCountryCoordinates: Record<string, { x: number; y: number }> = {
  DE: { x: 51, y: 25 }, EG: { x: 57, y: 43 }, FR: { x: 47, y: 29 }, IN: { x: 70, y: 45 }, IT: { x: 52, y: 33 },
  JP: { x: 87, y: 35 }, KR: { x: 83, y: 37 }, MY: { x: 77, y: 58 }, PH: { x: 84, y: 56 }, PL: { x: 55, y: 25 },
  SA: { x: 62, y: 44 }, TH: { x: 77, y: 52 }, TR: { x: 57, y: 35 }, TW: { x: 83, y: 47 },
};

const supplierCountryNames: Record<string, string> = { DE: "Germany", EG: "Egypt", FR: "France", IN: "India", IT: "Italy", JP: "Japan", KR: "South Korea", MY: "Malaysia", PH: "Philippines", PL: "Poland", SA: "Saudi Arabia", TH: "Thailand", TR: "Türkiye", TW: "Taiwan" };

function supplierCountryCoordinate(supplier: SupplierRecord, index: number) {
  let hash = 0;
  for (const character of supplier.id) hash = (hash * 31 + character.charCodeAt(0)) >>> 0;
  const code = supplier.profile?.countryCode ?? "";
  const base = supplierCountryCoordinates[code] ?? { x: 50, y: 50 };
  return { x: base.x + (((hash + index * 17) % 7) - 3) * .8, y: base.y + (((Math.floor(hash / 29) + index * 11) % 7) - 3) * .8, group: `${(supplierCountryNames[code] ?? code) || "Unknown"} · country-level` };
}

function supplierCountryClusters(suppliers: SupplierRecord[]) {
  const groups = new Map<string, number>();
  for (const supplier of suppliers) {
    const code = supplier.profile?.countryCode ?? "UNKNOWN";
    groups.set(code, (groups.get(code) ?? 0) + 1);
  }
  return [...groups.entries()].map(([code, count]) => ({ id: `supplier-country:${code}`, label: supplierCountryNames[code] ?? code, count, x: (supplierCountryCoordinates[code] ?? { x: 50, y: 50 }).x, y: (supplierCountryCoordinates[code] ?? { x: 50, y: 50 }).y, group: "Supplier country" }));
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

function MatchModeTabs({ view, onChange, supplierCount }: { view: WorkspaceView; onChange: (view: WorkspaceView) => void; supplierCount: number }) {
  return <nav className="tb3-subtabs" aria-label="Match Matrix views">
    <button aria-current={view === "matrix" ? "page" : undefined} className={view === "matrix" ? "active" : ""} onClick={() => onChange("matrix")}><b>Full Match Matrix</b><span>{supplierCount} suppliers × {runtimeTenders.length} tenders</span></button>
    <button aria-current={view === "match-tenders" ? "page" : undefined} className={view === "match-tenders" ? "active" : ""} onClick={() => onChange("match-tenders")}><b>Review by Tenders</b><span>One tender × all suppliers</span></button>
    <button aria-current={view === "match-suppliers" ? "page" : undefined} className={view === "match-suppliers" ? "active" : ""} onClick={() => onChange("match-suppliers")}><b>Review by Suppliers</b><span>One supplier × all tenders</span></button>
  </nav>;
}

function SupplierTabs({ view, onChange }: { view: WorkspaceView; onChange: (view: WorkspaceView) => void }) {
  return <nav className="tb3-subtabs" aria-label="Supplier views">
    <button aria-current={view === "suppliers" ? "page" : undefined} className={view === "suppliers" ? "active" : ""} onClick={() => onChange("suppliers")}><b>Profiles</b><span>Identity, capabilities and readiness</span></button>
    <button aria-current={view === "verification" ? "page" : undefined} className={view === "verification" ? "active" : ""} onClick={() => onChange("verification")}><b>Verification</b><span>Evidence, confidence and provenance</span></button>
  </nav>;
}

export default function TenderMatchApp() {
  const [runtimeState, setRuntimeState] = useState<TenderMatchRuntimeState>({ status: "loading", progress: "Loading the approved read-only supplier data…" });
  useEffect(() => {
    const controller = new AbortController();
    loadTenderMatchRuntime(controller.signal)
      .then((payload) => setRuntimeState({ status: "ready", payload }))
      .catch((error) => {
        if (error instanceof DOMException && error.name === "AbortError") return;
        const offline = error instanceof TypeError;
        setRuntimeState({ status: offline ? "offline" : "error", message: offline
          ? "Neither the local supplier API nor the deployed pinned v1.3 supplier snapshot could be loaded. No historical fixture was substituted."
          : error instanceof Error ? error.message : "Supplier runtime failed safely." });
      });
    return () => controller.abort();
  }, []);
  if (runtimeState.status !== "ready") return <TenderMatchRuntimeGate state={runtimeState} />;
  return <TenderMatchWorkspace runtime={runtimeState.payload} />;
}

function TenderMatchRuntimeGate({ state }: { state: Exclude<TenderMatchRuntimeState, { status: "ready" }> }) {
  return <main className="tb3-page tb3-runtime-gate"><section role={state.status === "loading" ? "status" : "alert"} aria-live="polite">
    <span>SUPPLIER DATA BOUNDARY</span><h1>{state.status === "loading" ? "Loading the TenderMatch supplier workspace" : "Supplier service is offline"}</h1>
    <p>{state.status === "loading" ? state.progress : state.message}</p>
    <div><b>NO HISTORICAL FIXTURE FALLBACK</b><small>The ten frozen suppliers remain historical fixtures only. Production uses the explicitly identified sanitized v1.3 snapshot.</small></div>
    {state.status !== "loading" && <button type="button" onClick={() => window.location.reload()}>Retry supplier service</button>}
  </section></main>;
}

function TenderMatchWorkspace({ runtime }: { runtime: TenderMatchRuntimePayload }) {
  const supplierProfiles = runtime.suppliers;
  const suppliers = useMemo(() => supplierProfiles.map((profile) => mapSupplierProfileToWorkspace(profile)), [supplierProfiles]);
  const allMatches = useMemo(() => runtime.evaluations.map(assessmentFromExploratoryEvaluation), [runtime.evaluations]);
  const navGroups = useMemo(() => navGroupsFor(suppliers.length), [suppliers.length]);
  const navItems = useMemo(() => navGroups.flatMap((group) => group.items), [navGroups]);
  const [sessionNow, setSessionNow] = useState(() => new Date().toISOString());
  const initialMatches = allMatches;
  const initialAssessment = initialMatches.find((entry) => entry.auditedMatch.value !== null && entry.tenderFreshness.status !== "closed")
    ?? initialMatches.find((entry) => entry.matchScore.value !== null)
    ?? initialMatches[0];
  const initialTender = runtimeTenders.find((entry) => entry.id === initialAssessment.tenderId) ?? runtimeTenders[0];
  const initialSupplier = suppliers.find((entry) => entry.id === initialAssessment.supplierId) ?? suppliers[0]!;
  const initialResult = useMemo(() => createCaseResult(caseIdFor(initialTender, initialSupplier), initialTender, initialSupplier, sessionNow, initialAssessment), []); // eslint-disable-line react-hooks/exhaustive-deps

  const resolvedInitialWorkspaceView = useMemo(() => initialWorkspaceView(), []);
  const [view, setView] = useState<WorkspaceView>(resolvedInitialWorkspaceView);
  const initialNavGroup = navGroupForView(resolvedInitialWorkspaceView, navGroups).id;
  const [expandedNavGroups, setExpandedNavGroups] = useState<Record<NavGroupId, boolean>>({
    overview: true,
    market: initialNavGroup === "market",
    suppliers: initialNavGroup === "suppliers",
    "tender-directory": true,
    match: initialNavGroup === "match",
  });
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [selectedKey, setSelectedKey] = useState(initialResult.match.key);
  const [caseResults, setCaseResults] = useState<Record<string, TenderMatchCaseResult>>({ [initialResult.match.key]: initialResult });
  const [persistenceMessage, setPersistenceMessage] = useState("Not saved in this browser session");
  const [actionError, setActionError] = useState("");
  const [tenderRadarFilter, setTenderRadarFilter] = useState("All countries");
  const [supplierRadarFilter, setSupplierRadarFilter] = useState("All suppliers");
  const [tenderRadarZoom, setTenderRadarZoom] = useState(1);
  const [supplierRadarZoom, setSupplierRadarZoom] = useState(1);
  const [supplierEvidence, setSupplierEvidence] = useState<Record<string, SupplierEvidenceApiRecord[]>>({});
  const [evidenceErrors, setEvidenceErrors] = useState<Record<string, string>>({});
  const viewSurfaceRef = useRef<HTMLDivElement>(null);
  const lastFocusedViewRef = useRef<WorkspaceView>("dashboard");

  const matchByKey = useMemo(() => new Map(allMatches.map((entry) => [entry.key, entry])), [allMatches]);
  const result = caseResults[selectedKey] ?? initialResult;
  const tender = runtimeTenders.find((entry) => entry.id === result.tenderIdentity.id) ?? initialTender;
  const supplierProfile = supplierProfiles.find((entry) => `supplier:NEON:${entry.canonicalEntityId}` === result.supplierIdentity.id) ?? supplierProfiles[0]!;
  const supplier = mapSupplierProfileToWorkspace(supplierProfile, supplierEvidence[supplierProfile.canonicalEntityId] ?? []);
  const tenderMatches = allMatches.filter((entry) => entry.tenderId === tender.id).sort(compareMatches);
  const supplierMatches = allMatches.filter((entry) => entry.supplierId === supplier.id).sort(compareMatches);
  const evaluatedMatches = allMatches;
  const priorityMatches = [...evaluatedMatches].sort(compareMatches).slice(0, 10);
  const auditedMatches = allMatches;
  const sourceCount = new Set(runtimeTenders.map((entry) => entry.sourceLabel)).size;

  const changeView = (nextView: WorkspaceView) => {
    const activeGroup = navGroupForView(nextView, navGroups);
    if (activeGroup.items.length > 1) {
      setExpandedNavGroups((current) => current[activeGroup.id] ? current : { ...current, [activeGroup.id]: true });
    }
    setView(nextView);
  };

  const openPair = (nextTender: TenderRecord, nextSupplier: SupplierRecord, nextView?: WorkspaceView) => {
    const nowIso = new Date().toISOString();
    const key = matchKey(nextTender, nextSupplier);
    const assessment = matchByKey.get(key);
    if (!assessment) { setActionError(`The selected pair is not present in the ${allMatches.length.toLocaleString()}-result inventory.`); return; }
    const existing = caseResults[key];
    const nextResult = existing
      ? resumeCaseResult(existing, nextTender, nextSupplier, nowIso, assessment)
      : createCaseResult(caseIdFor(nextTender, nextSupplier), nextTender, nextSupplier, nowIso, assessment);
    setSessionNow(nowIso);
    setCaseResults((current) => ({ ...current, [key]: nextResult }));
    setSelectedKey(key);
    setActionError("");
    if (nextView) changeView(nextView);
  };

  const openAssessment = (assessment: MatchAssessment, nextView?: WorkspaceView) => {
    const nextTender = runtimeTenders.find((entry) => entry.id === assessment.tenderId);
    const nextSupplier = suppliers.find((entry) => entry.id === assessment.supplierId);
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
      const saved = loadCaseResult(window.localStorage, result.caseIdentity.id, { tender, supplier, nowIso, assessment: matchByKey.get(result.match.key) });
      if (!saved) { setPersistenceMessage("No saved record exists for this explicit Case ID"); return; }
      setSessionNow(nowIso);
      setCaseResults((current) => ({ ...current, [saved.match.key]: saved }));
      setSelectedKey(saved.match.key);
      setPersistenceMessage(`Loaded ${saved.caseIdentity.id} · deadline context recomputed`);
    } catch (error) {
      setActionError(error instanceof Error ? error.message : "The saved Case could not be reconstructed.");
    }
  };

  useEffect(() => {
    if (lastFocusedViewRef.current === view) return;
    lastFocusedViewRef.current = view;
    viewSurfaceRef.current?.focus();
  }, [view]);

  useEffect(() => {
    const id = supplierProfile.canonicalEntityId;
    if (supplierEvidence[id]) return;
    const controller = new AbortController();
    loadSupplierEvidence(id, controller.signal, runtime.mode)
      .then((records) => {
        setSupplierEvidence((current) => ({ ...current, [id]: records }));
        setEvidenceErrors((current) => {
          if (!current[id]) return current;
          const next = { ...current };
          delete next[id];
          return next;
        });
      })
      .catch((error) => {
        if (error instanceof DOMException && error.name === "AbortError") return;
        setEvidenceErrors((current) => ({ ...current, [id]: error instanceof Error ? error.message : "Evidence could not be retrieved." }));
      });
    return () => controller.abort();
  }, [runtime.mode, supplierProfile.canonicalEntityId, supplierEvidence]);

  const evidenceError = evidenceErrors[supplierProfile.canonicalEntityId] ?? "";
  const evidenceStatus: "loading" | "ready" | "error" = supplierEvidence[supplierProfile.canonicalEntityId]
    ? "ready"
    : evidenceError ? "error" : "loading";

  const toggleNavGroup = (group: NavGroupId) => {
    setExpandedNavGroups((current) => ({ ...current, [group]: !current[group] }));
  };

  const tenderClusters = countryTenderRadarClusters(runtimeTenders);
  const visibleTenderClusters = tenderRadarFilter === "All countries" ? tenderClusters : tenderClusters.filter((entry) => entry.label === tenderRadarFilter);
  const visibleTenders = tenderRadarFilter === "All countries" ? runtimeTenders : runtimeTenders.filter((entry) => entry.country === tenderRadarFilter);
  const supplierClusters = supplierCountryClusters(suppliers);
  const visibleSupplierClusters = supplierRadarFilter === "All suppliers" ? supplierClusters : supplierClusters.filter((entry) => entry.label === supplierRadarFilter);
  const visibleSuppliers = supplierRadarFilter === "All suppliers" ? suppliers : suppliers.filter((entry) => supplierCountryNames[entry.profile?.countryCode ?? ""] === supplierRadarFilter);

  const caseControls = <section className="tb3-case-strip">
    <div><span>EXPLICIT CASE</span><code>{result.caseIdentity.id}</code><small>{supplier.legalEnglishName} × {tender.reference}</small></div>
    <div><span>PAIR SCORE</span><b>{result.match.auditedMatch.value ?? 0}</b><small>{result.match.auditedMatch.dataCoverage ?? 0}% coverage · {result.match.auditedMatch.evidenceConfidence ?? 0}% confidence · {result.match.tenderFreshness.status}</small></div>
    <div className="tb3-case-actions"><button onClick={saveCase}>Save Case</button><button onClick={loadCase}>Load Case</button><small>{persistenceMessage}</small></div>
  </section>;

  return <main className={`tb3-page ${view === "dashboard" ? "tb3-page-overview" : ""}`}>
    {view !== "dashboard" && <section className="tb3-product-intro">
      <div><p><i /> TENDERAPPS AGENT 03 · INTERNAL MATCHING WORKSPACE</p><h1>Tender<em>Match</em></h1><h2>Company × Tender evidence review for TenderLab Consultants.</h2><span>Select an explicit pair, inspect evidence-linked match support, gaps and freshness, then keep the consultant’s match disposition visible and human-controlled.</span></div>
      <aside><span>OPERATING ROLE</span><b>TL-A031</b><small>Company-to-Tender Match Score Agent · internal consultant workspace</small><strong>MATCH SUPPORT · EVIDENCE REVIEW · HUMAN DISPOSITION</strong></aside>
    </section>}

    <section className="tb3-layout">
      <aside className="tb3-workspace-nav">
        <header><span>WORKFLOW</span><b>TenderMatch workspace</b><small>5 page families · {navItems.length} reachable views</small><em className="tb3-runtime-provenance">{runtime.mode === "static-pinned-snapshot" ? "PINNED V1.3 SNAPSHOT" : "LOCAL READ-ONLY API"} · AS OF {dateLabel(runtime.summary.retrievedAt)}</em></header>
        <WorkspaceNavigation expanded={expandedNavGroups} navGroups={navGroups} onToggle={toggleNavGroup} onView={changeView} view={view} />
      </aside>

      <section className="tb3-content">
        <section className="tb3-mobile-workspace-nav" aria-label="TenderMatch responsive workflow navigation">
          <button aria-controls="tb3-mobile-workflow-tree" aria-expanded={mobileNavOpen} className="tb3-mobile-nav-toggle" onClick={() => setMobileNavOpen((current) => !current)} onKeyDown={(event) => activateNavigationFromKeyboard(event, () => setMobileNavOpen((current) => !current))}>
            <span>WORKFLOW</span><p><b>{navGroupForView(view, navGroups).short} · {navGroupForView(view, navGroups).label}</b><small>{navItems.find((entry) => entry.id === view)?.label}</small></p><i aria-hidden="true">⌄</i>
          </button>
          {mobileNavOpen && <div id="tb3-mobile-workflow-tree"><WorkspaceNavigation compact expanded={expandedNavGroups} navGroups={navGroups} onToggle={toggleNavGroup} onView={(nextView) => { changeView(nextView); setMobileNavOpen(false); }} view={view} /></div>}
        </section>
        {actionError && <div className="tb3-alert" role="alert"><b>Action needs attention</b><span>{actionError}</span><button onClick={() => setActionError("")} aria-label="Dismiss action error">×</button></div>}

        {view !== "dashboard" && caseControls}

        <div className="tb3-view-surface" ref={viewSurfaceRef} role="region" aria-label={`${navItems.find((entry) => entry.id === view)?.label ?? "TenderMatch"} workspace`} tabIndex={-1}>
          {view === "dashboard" && <DashboardView allMatches={allMatches} auditedMatches={auditedMatches} evaluatedMatches={evaluatedMatches} priorityMatches={priorityMatches} suppliers={suppliers} onView={changeView} onOpen={openAssessment} />}
          {view === "radar-tenders" && <TenderRadarView allMatches={allMatches} suppliers={suppliers} filter={tenderRadarFilter} zoom={tenderRadarZoom} clusters={visibleTenderClusters} visibleTenders={visibleTenders} sourceCount={sourceCount} onFilter={setTenderRadarFilter} onZoom={setTenderRadarZoom} onOpen={openAssessment} onView={changeView} />}
          {view === "radar-suppliers" && <SupplierRadarView filter={supplierRadarFilter} zoom={supplierRadarZoom} clusters={visibleSupplierClusters} countryFilters={supplierClusters.map((entry) => entry.label).sort()} visibleSuppliers={visibleSuppliers} allMatches={allMatches} onFilter={setSupplierRadarFilter} onZoom={setSupplierRadarZoom} onOpen={openAssessment} onView={changeView} />}
          {view === "suppliers" && <SupplierDirectoryView view={view} suppliers={suppliers} profiles={supplierProfiles} allMatches={allMatches} onView={changeView} onOpen={openAssessment} />}
          {view === "tenders" && <TenderDirectoryView allMatches={allMatches} suppliers={suppliers} onOpen={openAssessment} />}
          {view === "matrix" && <MatrixView view={view} suppliers={suppliers} profiles={supplierProfiles} evaluations={runtime.evaluations} matchByKey={matchByKey} onView={changeView} onOpen={openAssessment} />}
          {(view === "match-tenders" || view === "match-suppliers") && <MatchWorkspaceView view={view} tender={tender} supplier={supplier} suppliers={suppliers} result={result} allMatches={allMatches} tenderMatches={tenderMatches} supplierMatches={supplierMatches} caseResults={caseResults} onView={changeView} onOpen={openAssessment} onDecision={decide} />}
          {view === "verification" && <VerificationView view={view} supplier={supplier} suppliers={suppliers} evidenceStatus={evidenceStatus} evidenceError={evidenceError} allMatches={allMatches} onView={changeView} onOpen={openAssessment} />}
        </div>
      </section>
    </section>
  </main>;
}

function DashboardView({ allMatches, auditedMatches, evaluatedMatches, priorityMatches, suppliers, onView, onOpen }: { allMatches: MatchAssessment[]; auditedMatches: MatchAssessment[]; evaluatedMatches: MatchAssessment[]; priorityMatches: MatchAssessment[]; suppliers: SupplierRecord[]; onView: (view: WorkspaceView) => void; onOpen: (assessment: MatchAssessment, view?: WorkspaceView) => void }) {
  const previewAssessment = priorityMatches.find((entry) => entry.auditedMatch.value !== null && entry.tenderFreshness.status !== "closed")
    ?? auditedMatches[0]
    ?? evaluatedMatches[0]
    ?? allMatches[0]!;
  const previewSupplier = suppliers.find((entry) => entry.id === previewAssessment.supplierId) ?? suppliers[0]!;
  const previewTender = runtimeTenders.find((entry) => entry.id === previewAssessment.tenderId) ?? runtimeTenders[0]!;
  return <>
    <PracticalAgentOverview audience="consultant" className="tb3-overview-manifesto" productId="product:TA-TENDERBOOST" aria-labelledby="tendermatch-overview-title">
      <PracticalAgentOverviewPart as="header" className="tb3-overview-heading" part="outcome-promise">
        <div>
          <span>TENDERMATCH · TENDERLAB CONSULTANT WORKSPACE · AGENT 03</span>
          <h1 id="tendermatch-overview-title">See why one company <em>matches one tender.</em></h1>
          <p>Evidence-linked Company × Tender review for TenderLab Consultants.</p>
        </div>
        <AgentRoleCallout
          className="tb3-role-callout"
          eyebrow="TENDERLAB CONSULTANT WORKSPACE"
          imageAlt="TenderLab analyst reviewing tender and supplier evidence"
          imageSrc="/tendermatch/illustrations/tendermatch-consultant.png"
          subtitle="Turn an open tender and supplier evidence into a reviewable match"
          tags={["#Discover", "#Compare", "#Explain"]}
          title="Tender matching workspace"
          titleId="tendermatch-role-title"
        />
      </PracticalAgentOverviewPart>

      <div className="tb3-overview-story" aria-label="Tender snapshot and company evidence transformed into a reviewable match result">
        <PracticalAgentOverviewPart as="article" className="tb3-story-input" part="input">
          <header><span>01</span><div><b>WHAT YOU PROVIDE</b><small>An explicit pair + evidence</small></div></header>
          <div className="tb3-pair-illustration" aria-label={`${previewTender.reference} tender paired with ${previewSupplier.legalEnglishName}`}>
            <div className="tb3-pair-card tender"><span>TENDER</span><b>{previewTender.reference}</b><small>{previewTender.object}</small><i>{previewTender.country} · {dateLabel(previewTender.deadlineAt)}</i></div>
            <strong aria-hidden="true">×</strong>
            <div className="tb3-pair-card company"><span>COMPANY</span><b>{previewSupplier.legalEnglishName}</b><small>{supplierActivity(previewSupplier)}</small><i>{previewSupplier.readiness.label ?? "Readiness unknown"}</i></div>
          </div>
          <div className="tb3-evidence-cues" aria-label="Supporting evidence cues"><span>Scope</span><span>Capability</span><span>Deadline</span><span>Sources</span></div>
        </PracticalAgentOverviewPart>

        <PracticalAgentOverviewPart className="tb3-story-work" part="agent-transformation" aria-label="TenderMatch evidence-aware transformation">
          <span className="tb3-story-arrow" aria-hidden="true">→</span>
          <div className="tb3-agent-medallion"><small>TENDER APPS</small><strong>Tender<br />Match</strong><i>TL-A031</i></div>
          <ol><li>SELECT</li><li>SCORE</li><li>SHOW COVERAGE</li><li>EXPLAIN</li></ol>
          <span className="tb3-story-arrow" aria-hidden="true">→</span>
        </PracticalAgentOverviewPart>

        <PracticalAgentOverviewPart as="article" className="tb3-story-output" part="finished-output">
          <header><div><span>03 · WHAT YOU RECEIVE</span></div><b>EXPLORATORY · NOT CLIENT DATA</b></header>
          <div className="tb3-match-network" role="img" aria-label="Illustrative digital evidence network: three company evidence nodes are routed through TenderMatch to three tender nodes. Solid luminous routes indicate candidate matches; a dashed route requires consultant review.">
            <svg className="tb3-match-graph" viewBox="0 0 640 300" aria-hidden="true">
              <defs>
                <pattern id="tb3-network-grid" width="20" height="20" patternUnits="userSpaceOnUse">
                  <circle cx="1" cy="1" r="1" fill="currentColor" />
                </pattern>
                <linearGradient id="tb3-network-link" x1="0" x2="1">
                  <stop offset="0" stopColor="#31aa82" />
                  <stop offset=".55" stopColor="#d0ff64" />
                  <stop offset="1" stopColor="#84de51" />
                </linearGradient>
                <radialGradient id="tb3-network-core">
                  <stop offset="0" stopColor="#d0ff64" stopOpacity=".4" />
                  <stop offset="1" stopColor="#d0ff64" stopOpacity="0" />
                </radialGradient>
                <filter id="tb3-network-glow" x="-70%" y="-70%" width="240%" height="240%">
                  <feGaussianBlur stdDeviation="4" result="blur" />
                  <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
                </filter>
              </defs>
              <rect className="tb3-graph-grid" width="640" height="300" rx="16" fill="url(#tb3-network-grid)" />
              <text className="tb3-graph-kicker" x="26" y="30">COMPANY EVIDENCE</text>
              <text className="tb3-graph-kicker" x="614" y="30" textAnchor="end">TENDER SIGNALS</text>

              <path className="tb3-graph-link match" d="M112 74 C214 74 222 121 309 144 C397 167 424 74 528 74" />
              <path className="tb3-graph-link match" d="M112 150 C216 150 224 150 309 150 C397 150 422 226 528 226" />
              <path className="tb3-graph-link review" d="M112 226 C213 226 236 181 309 156 C391 128 432 150 528 150" />
              <path className="tb3-graph-link ambient" d="M112 74 C213 91 236 122 309 144 C391 169 432 205 528 226" />

              <g className="tb3-graph-node company" transform="translate(78 74)">
                <circle className="node-halo" r="33" /><circle className="node-shell" r="20" />
                <path className="node-icon" d="M-8 8V-8H7V8M-3-3h2m4 0h2m-8 6h2m4 0h2" />
                <text x="-34" y="43">COMPANY A</text>
              </g>
              <g className="tb3-graph-node company" transform="translate(78 150)">
                <circle className="node-halo" r="33" /><circle className="node-shell" r="20" />
                <path className="node-icon" d="M-8 8V-8H7V8M-3-3h2m4 0h2m-8 6h2m4 0h2" />
                <text x="-34" y="43">COMPANY B</text>
              </g>
              <g className="tb3-graph-node company" transform="translate(78 226)">
                <circle className="node-halo" r="33" /><circle className="node-shell" r="20" />
                <path className="node-icon" d="M-8 8V-8H7V8M-3-3h2m4 0h2m-8 6h2m4 0h2" />
                <text x="-34" y="43">COMPANY C</text>
              </g>

              <g className="tb3-graph-engine" transform="translate(320 150)">
                <circle className="engine-field" r="74" fill="url(#tb3-network-core)" />
                <circle className="engine-orbit outer" r="46" />
                <circle className="engine-orbit inner" r="31" />
                <path className="engine-pulse" d="M-18 0h9l7-11 10 23 7-12h18" />
                <text y="58" textAnchor="middle">TENDERMATCH</text>
              </g>
              <circle className="tb3-data-packet" cx="238" cy="103" r="4" filter="url(#tb3-network-glow)" />
              <circle className="tb3-data-packet" cx="405" cy="119" r="4" filter="url(#tb3-network-glow)" />
              <circle className="tb3-data-packet review" cx="441" cy="150" r="4" />

              <g className="tb3-graph-node tender" transform="translate(562 74)">
                <circle className="node-halo" r="33" /><path className="node-shell" d="M0-23 23 0 0 23-23 0Z" />
                <path className="node-icon" d="M-8-10H5l7 7v13H-8zM5-10v7h7M-3 2h10M-3 7h7" />
                <text x="-37" y="43">TENDER 01</text>
              </g>
              <g className="tb3-graph-node tender" transform="translate(562 150)">
                <circle className="node-halo" r="33" /><path className="node-shell" d="M0-23 23 0 0 23-23 0Z" />
                <path className="node-icon" d="M-8-10H5l7 7v13H-8zM5-10v7h7M-3 2h10M-3 7h7" />
                <text x="-37" y="43">TENDER 02</text>
              </g>
              <g className="tb3-graph-node tender" transform="translate(562 226)">
                <circle className="node-halo" r="33" /><path className="node-shell" d="M0-23 23 0 0 23-23 0Z" />
                <path className="node-icon" d="M-8-10H5l7 7v13H-8zM5-10v7h7M-3 2h10M-3 7h7" />
                <text x="-37" y="43">TENDER 03</text>
              </g>
            </svg>
          </div>
          <footer className="tb3-match-network-legend"><span><i className="solid" />MATCH</span><span><i className="dashed" />REVIEW</span><b>CONSULTANT DECIDES</b></footer>
        </PracticalAgentOverviewPart>
      </div>

      <PracticalAgentOverviewPart as="footer" className="tb3-overview-actions" part="primary-action">
        <div><strong>Open the reviewable match.</strong><span>Inspect evidence, gaps and freshness; keep the decision human.</span></div>
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
      <PracticalAgentOverviewBoundary className="tb3-overview-boundary" productId="product:TA-TENDERBOOST" aria-label="TenderMatch authority boundary">
        <span>INTERNAL MATCHING ONLY</span>
        <p><b>Consultant decision stays explicit.</b> Promotion and outreach belong to a separate future Marketing Agent.</p>
        <div><span>MATCHING SUPPORT</span><span>HUMAN DECISION</span></div>
      </PracticalAgentOverviewBoundary>
    </PracticalAgentOverview>
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
function GeographicRadarMap({ kind, zoom, clusters, markers, clusterNoun }: { kind: "world" | "supplier-world"; zoom: number; clusters: typeof worldRadarClusters; markers: GeographicRadarMarker[]; clusterNoun: string }) {
  const viewportRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<{ pointerId: number; x: number; y: number; left: number; top: number } | null>(null);
  const sourceHref = "https://commons.wikimedia.org/wiki/File:BlankMap-World.png";
  const mapScope = kind === "world"
    ? "Central Asia country-level current-tender placement. Visual spacing is not a precise location."
    : "Global country-level supplier placement. Marker spread is deterministic visual spacing, not a precise supplier location.";
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
  return <div className={`tb3-geo-map-shell ${kind}`} data-map-mode="local-geographic" data-map-snapshot={kind === "world" ? "current-pilot" : "neon-supplier-v1.3"}>
    <div className="tb3-geo-map-viewport" ref={viewportRef} role="application" tabIndex={0} aria-label={`${mapScope} Use arrow keys or drag to pan after zooming.`} onKeyDown={onKeyDown} onPointerDown={onPointerDown} onPointerMove={onPointerMove} onPointerUp={stopDragging} onPointerCancel={stopDragging}>
      <div className="tb3-geo-map-inner" style={{ width: `${zoom * 100}%`, height: `${zoom * 100}%` }}>
        <div className="tb3-geo-map-geometry" aria-hidden="true" />
        {clusters.map((cluster) => <span className="cluster" tabIndex={0} role="img" style={{ left: `${cluster.x}%`, top: `${cluster.y}%` }} key={cluster.id} title={`${cluster.label}: ${cluster.count} ${kind === "world" ? "current-at-extraction" : "under-review"} ${clusterNoun}`} aria-label={`${cluster.label}, ${cluster.count} ${kind === "world" ? "current-at-extraction" : "under-review"} ${clusterNoun}`}><b>{cluster.count}</b></span>)}
        {markers.map((marker) => <button type="button" aria-label={marker.label} className={marker.selected ? "marker selected" : "marker"} style={{ left: `${marker.x}%`, top: `${marker.y}%` }} key={marker.id} title={marker.label} onClick={marker.onSelect}><i aria-hidden="true" /><span>{marker.shortLabel}</span></button>)}
      </div>
    </div>
    <div className="tb3-map-legend" aria-label="Map legend"><span><i className="universe" />{kind === "world" ? "Country record group" : "Country-level supplier group"}</span><span><i className="focus" />{kind === "world" ? "Current tender record" : "Under-review supplier"}</span></div>
    <a className="tb3-map-credit" href={sourceHref} target="_blank" rel="noreferrer">Map geometry · Wikimedia Commons</a>
    <p className="tb3-map-truth">COUNTRY-LEVEL PLACEMENT · VISUAL SPACING ONLY · LOCAL MAP · NO LIVE TILES</p>
  </div>;
}
/* eslint-enable jsx-a11y/no-noninteractive-element-interactions, jsx-a11y/no-noninteractive-tabindex */

function TenderRadarView({ allMatches, suppliers, filter, zoom, clusters, visibleTenders, sourceCount, onFilter, onZoom, onOpen, onView }: { allMatches: MatchAssessment[]; suppliers: SupplierRecord[]; filter: string; zoom: number; clusters: typeof worldRadarClusters; visibleTenders: TenderRecord[]; sourceCount: number; onFilter: (filter: string) => void; onZoom: React.Dispatch<React.SetStateAction<number>>; onOpen: (assessment: MatchAssessment, view?: WorkspaceView) => void; onView: (view: WorkspaceView) => void }) {
  return <>
    <ViewHeader eyebrow="02 · MARKET RADAR / CENTRAL ASIA" title="Current Tender Radar" description="Inspect the bounded read-only pilot snapshot. Markers use country-level placement with visual spacing only; they are not precise tender coordinates or a live feed." aside={<div className="tb3-view-badge"><span>CURRENT AT EXTRACTION</span><b>{runtimeTenders.length} records</b></div>} />
    <nav className="tb3-subtabs" aria-label="Market Radar views"><button className="active" aria-current="page"><b>Tenders</b><span>Global procurement demand</span></button><button onClick={() => onView("radar-suppliers")}><b>Suppliers</b><span>Global supplier market</span></button></nav>
    <section className="tb3-radar-kpis"><Metric label="CURRENT TENDERS" value={runtimeTenders.length} note="current at pilot extraction" signal /><Metric label="COUNTRIES REPRESENTED" value={new Set(runtimeTenders.map((entry) => entry.countryCode)).size} note="of five selected countries" /><Metric label="SOURCE SYSTEMS" value={sourceCount} note="source identities" /><Metric label="PAIR INVENTORY" value={allMatches.length.toLocaleString()} note="completed evaluations" /></section>
    <section className="tb3-radar-flow"><div className="selected"><b>{runtimeTenders.length}</b><span>Tenders</span></div><i>→</i><div><b>{allMatches.length.toLocaleString()}</b><span>Pair Evaluations</span></div><strong>↕</strong><div className="engine"><small>TENDERMATCH</small><b>Explore</b></div><strong>↕</strong><div><b>{suppliers.length}</b><span>Supplier Profiles</span></div><i>←</i><div><b>5</b><span>Selected Countries</span></div></section>
    <section className="tb3-radar-layout aggregate">
      <article className="tb3-map-card"><header><div><span>CENTRAL ASIA CURRENT-TENDER SNAPSHOT</span><h2>Country-level tender distribution</h2></div><div className="tb3-zoom"><button aria-label="Zoom tender map out" onClick={() => onZoom((value) => Math.max(1, +(value - .2).toFixed(1)))}>−</button><b>{Math.round(zoom * 100)}%</b><button aria-label="Zoom tender map in" onClick={() => onZoom((value) => Math.min(1.8, +(value + .2).toFixed(1)))}>+</button></div></header>
        <div className="tb3-filter-row">{["All countries", "Kazakhstan", "Kyrgyzstan", "Tajikistan", "Turkmenistan", "Uzbekistan"].map((entry) => <button aria-pressed={filter === entry} className={filter === entry ? "active" : ""} key={entry} onClick={() => onFilter(entry)}>{entry}</button>)}</div>
        <GeographicRadarMap kind="world" zoom={zoom} clusters={clusters} clusterNoun="current records" markers={visibleTenders.map((entry, index) => { const coordinate = tenderRadarCoordinate(entry, index); return { id: entry.id, label: `Open ${entry.reference}: ${entry.title}; country-level placement in ${entry.country}`, shortLabel: String(index + 1).padStart(2, "0"), selected: false, x: coordinate.x, y: coordinate.y, onSelect: () => { const nextBest = bestLegacyMatch(allMatches.filter((match) => match.tenderId === entry.id)); if (nextBest) onOpen(nextBest, "match-tenders"); } }; })} />
      </article>
    </section>
  </>;
}

function SupplierRadarView({ filter, zoom, clusters, countryFilters, visibleSuppliers, allMatches, onFilter, onZoom, onOpen, onView }: { filter: string; zoom: number; clusters: typeof worldRadarClusters; countryFilters: string[]; visibleSuppliers: SupplierRecord[]; allMatches: MatchAssessment[]; onFilter: (filter: string) => void; onZoom: React.Dispatch<React.SetStateAction<number>>; onOpen: (assessment: MatchAssessment, view?: WorkspaceView) => void; onView: (view: WorkspaceView) => void }) {
  return <>
    <ViewHeader eyebrow="02 · MARKET RADAR / SUPPLIER MARKET" title="Supplier Market" description="Inspect the 17 under-review GOODS/WORKS supplier profiles through the pinned Neon v1.3 read-only contract. Placement is country-level only; no precise location is inferred." aside={<div className="tb3-view-badge"><span>NEON V1.3 · READ ONLY</span><b>{visibleSuppliers.length} suppliers</b></div>} />
    <nav className="tb3-subtabs" aria-label="Market Radar views"><button onClick={() => onView("radar-tenders")}><b>Tenders</b><span>Global procurement demand</span></button><button className="active" aria-current="page"><b>Suppliers</b><span>Global supplier market</span></button></nav>
    <section className="tb3-radar-kpis"><Metric label="SUPPLIER PROFILES" value={visibleSuppliers.length} note="under review" signal /><Metric label="VERIFIED CLAIMS" value="0" note="no semantic inflation" /><Metric label="PAIR INVENTORY" value={allMatches.length.toLocaleString()} note="server-computed" /><Metric label="COUNTRIES" value={new Set(visibleSuppliers.map((entry) => entry.profile?.countryCode)).size} note="country-level evidence" /></section>
    <section className="tb3-radar-flow"><div><b>{runtimeTenders.length}</b><span>Tenders</span></div><i>→</i><div><b>{allMatches.length.toLocaleString()}</b><span>Pair Evaluations</span></div><strong>↕</strong><div className="engine"><small>TENDERMATCH</small><b>Explore</b></div><strong>↕</strong><div className="selected"><b>{visibleSuppliers.length}</b><span>Supplier Profiles</span></div><i>←</i><div><b>{new Set(visibleSuppliers.map((entry) => entry.profile?.countryCode)).size}</b><span>Supported Countries</span></div></section>
    <section className="tb3-radar-layout aggregate"><article className="tb3-map-card"><header><div><span>GEOGRAPHIC SUPPLIER DENSITY · UNDER REVIEW</span><h2>Global country-level supplier distribution</h2></div><div className="tb3-zoom"><button aria-label="Zoom supplier map out" onClick={() => onZoom((value) => Math.max(1, +(value - .2).toFixed(1)))}>−</button><b>{Math.round(zoom * 100)}%</b><button aria-label="Zoom supplier map in" onClick={() => onZoom((value) => Math.min(1.8, +(value + .2).toFixed(1)))}>+</button></div></header><div className="tb3-filter-row">{["All suppliers", ...countryFilters].map((entry) => <button aria-pressed={filter === entry} className={filter === entry ? "active" : ""} key={entry} onClick={() => onFilter(entry)}>{entry}</button>)}</div><GeographicRadarMap kind="supplier-world" zoom={zoom} clusters={clusters} clusterNoun="suppliers" markers={visibleSuppliers.map((entry, index) => { const coordinate = supplierCountryCoordinate(entry, index); return { id: entry.id, label: `Open supplier profile ${entry.legalEnglishName}; country-level placement in ${coordinate.group}`, shortLabel: String(index + 1).padStart(2, "0"), selected: false, x: coordinate.x, y: coordinate.y, onSelect: () => { const nextBest = bestLegacyMatch(allMatches.filter((match) => match.supplierId === entry.id)); if (nextBest) onOpen(nextBest, "verification"); } }; })} /></article></section>
  </>;
}

function SupplierDirectoryView({ view, suppliers, profiles, allMatches, onView, onOpen }: { view: WorkspaceView; suppliers: SupplierRecord[]; profiles: SupplierProfileApiRecord[]; allMatches: MatchAssessment[]; onView: (view: WorkspaceView) => void; onOpen: (assessment: MatchAssessment, view?: WorkspaceView) => void }) {
  const profileById = new Map(profiles.map((profile) => [`supplier:NEON:${profile.canonicalEntityId}`, profile]));
  return <>
    <ViewHeader eyebrow="03 · SUPPLIERS / PROFILES" title="Supplier Profiles" description="Review the normalized v1.3 GOODS/WORKS supplier profiles, source readiness, STATED_UNVERIFIED and INFERRED evidence, products, capabilities and explicit unknowns." aside={<div className="tb3-directory-count"><b>{suppliers.length}</b><span>Neon v1.3 · under review</span></div>} />
    <SupplierTabs view={view} onChange={onView} />
    <section className="tb3-directory" aria-label="Supplier profile directory"><div className="tb3-directory-head supplier"><span>SUPPLIER</span><span>READINESS</span><span>GEOGRAPHY</span><span>EVIDENCE</span><span>ACTION</span></div>{suppliers.map((entry) => { const profile = profileById.get(entry.id)!; return <button className="tb3-directory-row supplier" key={entry.id} onClick={() => { const best = bestLegacyMatch(allMatches.filter((match) => match.supplierId === entry.id)); if (best) onOpen(best, "verification"); }}><div className="identity"><span>{profile.countryCode ?? "?"}</span><p><b>{entry.legalEnglishName}</b><small>{profile.classification} · {supplierActivity(entry)}</small><em>{profile.verificationStatus.replace("_", " ")} · {profile.profileVersion}</em></p></div><strong>{readinessLabel(profile.readinessStatus)}<small>source state · not a score</small></strong><p>{entry.exportMarkets.slice(0, 2).join(" · ") || supplierCountryNames[profile.countryCode ?? ""] || "Unknown / not disclosed"}<small>{entry.categories.slice(0, 3).join(" · ") || "Categories not disclosed"}</small></p><div className="evidence"><span className="verified">{profile.evidenceVerifiedCount} verified</span><span className="stated">{profile.evidenceStatedUnverifiedCount} stated</span><span className="inferred">{profile.evidenceInferredCount} inferred</span><span className="unknown">{profile.evidenceUnknownCount} unknown</span></div><em>Review evidence →</em></button>; })}</section>
  </>;
}

function TenderDirectoryView({ allMatches, suppliers, onOpen }: { allMatches: MatchAssessment[]; suppliers: SupplierRecord[]; onOpen: (assessment: MatchAssessment, view?: WorkspaceView) => void }) {
  return <>
    <ViewHeader eyebrow="04 · CURRENT OPPORTUNITY DATABASE" title="Tender Snapshot" description={`All ${runtimeTenders.length} records met the approved Central Asia current-tender predicate at extraction. Deadline state is recalculated at review time; no browser-to-database connection exists.`} aside={<div className="tb3-directory-count"><b>{runtimeTenders.length}</b><span>current at extraction</span></div>} />
    <section className="tb3-directory" aria-label="Tender snapshot directory"><div className="tb3-directory-head tender"><span>NO.</span><span>TENDER</span><span>OBJECT</span><span>SOURCE</span><span>BUDGET</span><span>DEADLINE</span><span>TOP SCORE</span><span>ACTION</span></div>{runtimeTenders.map((entry, index) => { const matches = allMatches.filter((match) => match.tenderId === entry.id); const best = bestLegacyMatch(matches); return <button className="tb3-directory-row tender" key={entry.id} onClick={() => best && onOpen(best, "match-tenders")}><span className="number">{index + 1}</span><div className="tender-name"><p><b>{entry.title}</b><small>{entry.buyer} · {entry.country}</small><em>{entry.reference}</em></p></div><span>{entry.object}</span><strong>{entry.sourceLabel}</strong><strong>{entry.budgetLabel}</strong><p>{best.tenderFreshness.daysRemaining} days<small>{dateLabel(entry.deadlineAt)} · {best.tenderFreshness.status}</small></p><div className="top-match"><b className={scoreBand(best.auditedMatch.value)}>{best.auditedMatch.value ?? 0}</b><p><strong>{suppliers.find((supplier) => supplier.id === best.supplierId)?.legalEnglishName ?? "Not evaluated"}</strong><small>{best.auditedMatch.dataCoverage ?? 0}% coverage · score only</small></p></div><em>Open pair →</em></button>; })}</section>
  </>;
}

function MatrixView({ view, suppliers, profiles, evaluations, matchByKey, onView, onOpen }: { view: WorkspaceView; suppliers: SupplierRecord[]; profiles: SupplierProfileApiRecord[]; evaluations: ExploratoryMatchEvaluation[]; matchByKey: Map<string, MatchAssessment>; onView: (view: WorkspaceView) => void; onOpen: (assessment: MatchAssessment, view?: WorkspaceView) => void }) {
  const pageSize = 10;
  const [page, setPage] = useState(0);
  const [excelExporting, setExcelExporting] = useState(false);
  const pageCount = Math.ceil(suppliers.length / pageSize);
  const visibleSuppliers = suppliers.slice(page * pageSize, (page + 1) * pageSize);
  const matches = [...matchByKey.values()];
  const numeric = matches.filter((entry) => typeof entry.auditedMatch.value === "number").length;
  const scoreBands = [
    { label: "Score 0", count: matches.filter((entry) => (entry.auditedMatch.value ?? 0) === 0).length },
    { label: "Score 1–20", count: matches.filter((entry) => (entry.auditedMatch.value ?? 0) >= 1 && (entry.auditedMatch.value ?? 0) <= 20).length },
    { label: "Score 21–40", count: matches.filter((entry) => (entry.auditedMatch.value ?? 0) >= 21 && (entry.auditedMatch.value ?? 0) <= 40).length },
    { label: "Score 41–60", count: matches.filter((entry) => (entry.auditedMatch.value ?? 0) >= 41 && (entry.auditedMatch.value ?? 0) <= 60).length },
    { label: "Score 61–80", count: matches.filter((entry) => (entry.auditedMatch.value ?? 0) >= 61 && (entry.auditedMatch.value ?? 0) <= 80).length },
    { label: "Score 81–100", count: matches.filter((entry) => (entry.auditedMatch.value ?? 0) >= 81).length },
  ];
  async function exportExcel() {
    setExcelExporting(true);
    try {
      const bytes = await tenderMatchFormulaToExcel(evaluations, runtimeTenders, profiles);
      downloadBytes(tenderMatchFormulaExcelFileName(evaluations[0]?.evaluatedAt ?? "undated"), bytes);
    } finally {
      setExcelExporting(false);
    }
  }
  return <>
    <ViewHeader eyebrow="05 · MATCH MATRIX / SCORING" title="Full Match Matrix" description={`Every Company × Tender pair has a coverage-adjusted Formula v1.1 score from 0 to 100. All ${numeric} cells are numeric; coverage and evidence confidence remain separate, and no Match threshold is defined.`} aside={<div className="tb3-matrix-actions"><div className="tb3-directory-count"><b>{suppliers.length * runtimeTenders.length}</b><span>numeric pair scores</span></div><button type="button" onClick={() => downloadText(tenderMatchFormulaExportFileName(evaluations[0]?.evaluatedAt ?? "undated"), formulaEvaluationsToCsv(evaluations, runtimeTenders, profiles))}>Export Formula v1.1 CSV</button><button type="button" disabled={excelExporting} onClick={exportExcel}>{excelExporting ? "Preparing Excel…" : "Export Formula v1.1 Excel"}</button></div>} />
    <MatchModeTabs view={view} onChange={onView} supplierCount={suppliers.length} />
    <section className="tb3-status-summary" aria-label="Formula v1.1 numeric score distribution">
      {scoreBands.map((band) => <div key={band.label}><b>{band.count}</b><span>{band.label}</span></div>)}
    </section>
    <section className="tb3-matrix-panel"><header><div><span>FORMULA V1.1 · SCORING ONLY</span><h2>Evidence-aware pair scores</h2><p>Select any cell to inspect the score, weighted criteria, missing evidence, mandatory gates, coverage, confidence and separate human disposition.</p></div><div className="tb3-matrix-legend"><span className="priority">61–100</span><span className="review">41–60</span><span className="missing">0–40 · inspect coverage</span></div></header><div className="tb3-matrix-pagination" aria-label="Supplier matrix pages"><button disabled={page === 0} onClick={() => setPage((value) => Math.max(0, value - 1))}>← Previous suppliers</button><span>Suppliers {page * pageSize + 1}–{Math.min((page + 1) * pageSize, suppliers.length)} of {suppliers.length}</span><button disabled={page >= pageCount - 1} onClick={() => setPage((value) => Math.min(pageCount - 1, value + 1))}>Next suppliers →</button></div><div className="tb3-matrix-scroll" role="region" aria-label="Full supplier by tender score matrix"><div className="tb3-matrix-table" style={{ minWidth: `${280 + runtimeTenders.length * 104}px` }}><div className="tb3-matrix-header" style={{ gridTemplateColumns: `280px repeat(${runtimeTenders.length}, 104px)` }}><div><b>SUPPLIER</b><span>READINESS STATE</span></div>{runtimeTenders.map((entry, index) => <div key={entry.id} title={`${entry.reference} · ${entry.country} · ${entry.object}`}><span>T{String(index + 1).padStart(2, "0")}</span><b>{entry.reference}</b><small>{entry.country}</small><em>{entry.object}</em></div>)}</div>{visibleSuppliers.map((company) => <div className="tb3-matrix-row" style={{ gridTemplateColumns: `280px repeat(${runtimeTenders.length}, 104px)` }} key={company.id}><div className="tb3-matrix-company"><span>{company.profile?.countryCode ?? "?"}</span><p><b>{company.legalEnglishName}</b><small>{supplierActivity(company)}</small><em>{company.readiness.label}</em></p><strong>—</strong></div>{runtimeTenders.map((opportunity) => { const assessment = matchByKey.get(matchKey(opportunity, company))!; const score = assessment.auditedMatch.value ?? 0; const coverage = assessment.auditedMatch.dataCoverage ?? 0; return <button className={`tb3-matrix-cell ${scoreBand(score)}`} key={opportunity.id} onClick={() => onOpen(assessment, "match-tenders")} aria-label={`Open ${company.legalEnglishName} and ${opportunity.reference}; pair score ${score} of 100, ${coverage} percent coverage`}><b>{score}</b><span>{coverage}% coverage</span></button>; })}</div>)}</div></div></section>
  </>;
}

function MatchWorkspaceView({ view, tender, supplier, suppliers, result, allMatches, tenderMatches, supplierMatches, caseResults, onView, onOpen, onDecision }: { view: "match-tenders" | "match-suppliers"; tender: TenderRecord; supplier: SupplierRecord; suppliers: SupplierRecord[]; result: TenderMatchCaseResult; allMatches: MatchAssessment[]; tenderMatches: MatchAssessment[]; supplierMatches: MatchAssessment[]; caseResults: Record<string, TenderMatchCaseResult>; onView: (view: WorkspaceView) => void; onOpen: (assessment: MatchAssessment) => void; onDecision: (decision: ConsultantDecision) => void }) {
  return <>
    <ViewHeader eyebrow={`05 · MATCH MATRIX / ${view === "match-tenders" ? "TENDER-FIRST" : "SUPPLIER-FIRST"}`} title={view === "match-tenders" ? "Review by Tenders" : "Review by Suppliers"} description="Inspect deterministic Formula v1.1 scores. Pair Score, assessed-only fit, Data Coverage, Evidence Confidence, supplier readiness, freshness and consultant disposition remain separate." aside={<div className="tb3-replay" role="status"><span>✓</span><p><b>Formula v1.1 ready</b><small>{allMatches.length} / {allMatches.length} numeric pair scores completed</small></p></div>} />
    <MatchModeTabs view={view} onChange={onView} supplierCount={suppliers.length} />
    <div className="tb3-progress" role="progressbar" aria-label="Server-computed pair inventory progress" aria-valuemin={0} aria-valuemax={100} aria-valuenow={100}><i style={{ width: "100%" }} /><span>100%</span></div>
    <section className="tb3-match-workspace">
      <aside className="tb3-picker"><header><span>{view === "match-tenders" ? "TENDERS" : "SUPPLIERS"}</span><b>{view === "match-tenders" ? `${runtimeTenders.length} current-at-extraction records` : `${suppliers.length} under-review profiles`}</b></header>{view === "match-tenders" ? runtimeTenders.map((entry) => <button className={entry.id === tender.id ? "active" : ""} key={entry.id} onClick={() => { const best = bestLegacyMatch(allMatches.filter((match) => match.tenderId === entry.id)); if (best) onOpen(best); }}><span>{entry.sourceLabel}</span><b>{entry.reference}</b><p>{entry.title}</p><small>{entry.country} · {dateLabel(entry.deadlineAt)}</small></button>) : suppliers.map((entry) => <button className={entry.id === supplier.id ? "active" : ""} key={entry.id} onClick={() => { const best = bestLegacyMatch(allMatches.filter((match) => match.supplierId === entry.id)); if (best) onOpen(best); }}><span>{entry.profile?.countryCode ?? "?"}</span><p><b>{entry.legalEnglishName}</b><small>{supplierActivity(entry)} · {entry.readiness.label}</small></p><i>→</i></button>)}</aside>
      <article className="tb3-ranking"><header><div><span>{view === "match-tenders" ? tender.sourceLabel : "SELECTED SUPPLIER"}</span><h2>{view === "match-tenders" ? tender.title : supplier.legalEnglishName}</h2><p>{view === "match-tenders" ? `${tender.buyer} · ${tender.country}` : `${supplierActivity(supplier)} · ${supplier.profile?.verificationStatus.replace("_", " ")}`}</p></div><div><small>{view === "match-tenders" ? "DEADLINE" : "READINESS"}</small><b>{view === "match-tenders" ? dateLabel(tender.deadlineAt) : supplier.readiness.label}</b><small>{view === "match-tenders" ? "STATUS" : "VERIFIED CLAIMS"}</small><b>{view === "match-tenders" ? result.match.tenderFreshness.status : "0"}</b></div></header><div className="tb3-ranking-head"><span>{view === "match-tenders" ? "SUPPLIER" : "TENDER"}</span><span>READINESS</span><span>PAIR SCORE</span><span>COVERAGE / CONFIDENCE</span><span>DECISION</span></div><div className="tb3-ranking-rows">{(view === "match-tenders" ? tenderMatches : supplierMatches).map((assessment) => { const rowSupplier = suppliers.find((entry) => entry.id === assessment.supplierId)!; const rowTender = runtimeTenders.find((entry) => entry.id === assessment.tenderId)!; const cachedDecision = caseResults[assessment.key]?.match.consultantDecision ?? assessment.consultantDecision; return <button className={assessment.key === result.match.key ? "selected" : ""} key={assessment.key} onClick={() => onOpen(assessment)}><div><span>{view === "match-tenders" ? rowSupplier.profile?.countryCode ?? "?" : rowTender.countryCode ?? "?"}</span><p><b>{view === "match-tenders" ? rowSupplier.legalEnglishName : rowTender.title}</b><small>{view === "match-tenders" ? supplierActivity(rowSupplier) : `${rowTender.reference} · ${rowTender.country} · ${rowTender.object}`}</small></p></div><strong>—<small>{rowSupplier.readiness.label}</small></strong><strong className={scoreBand(assessment.auditedMatch.value)}>{assessment.auditedMatch.value ?? 0}<small>score only · no threshold</small></strong><strong>{assessment.auditedMatch.dataCoverage ?? 0}%<small>{assessment.auditedMatch.evidenceConfidence ?? 0}% confidence · {assessment.auditedMatch.evidenceIds.length} cited</small></strong><em className={`tb3-state ${cachedDecision}`}>{decisionLabel[cachedDecision]}</em></button>; })}</div></article>
      <MatchReviewPanel result={result} tender={tender} supplier={supplier} onViewChange={onView} onDecision={onDecision} />
    </section>
  </>;
}

function VerificationView({ view, supplier, suppliers, evidenceStatus, evidenceError, allMatches, onView, onOpen }: { view: WorkspaceView; supplier: SupplierRecord; suppliers: SupplierRecord[]; evidenceStatus: "idle" | "loading" | "ready" | "error"; evidenceError: string; allMatches: MatchAssessment[]; onView: (view: WorkspaceView) => void; onOpen: (assessment: MatchAssessment) => void }) {
  const profile = supplier.profile!;
  return <>
    <ViewHeader eyebrow="03 · SUPPLIERS / VERIFICATION" title="Evidence Review" description="Inspect the safe non-contact evidence projection, claim class, source record, artifact availability and explicit unknowns. This batch contains zero VERIFIED claims." aside={<div className="tb3-directory-count"><b>0/{profile.evidenceClaimCount}</b><span>verified profile claims</span></div>} />
    <SupplierTabs view={view} onChange={onView} />
    <section className="tb3-evidence-layout"><aside className="tb3-picker"><header><span>SUPPLIERS</span><b>{suppliers.length} profiles</b></header>{suppliers.map((entry) => <button className={entry.id === supplier.id ? "active" : ""} key={entry.id} onClick={() => { const best = bestLegacyMatch(allMatches.filter((match) => match.supplierId === entry.id)); if (best) onOpen(best); }}><span>{entry.profile?.countryCode ?? "?"}</span><p><b>{entry.legalEnglishName}</b><small>{entry.readiness.label}</small></p><i>→</i></button>)}</aside><article className="tb3-evidence-card"><header><span>{profile.countryCode ?? "?"}</span><div><p>NEON PROFILE V1.3 · UNDER REVIEW</p><h2>{supplier.legalEnglishName}</h2><small>{profile.classification} · {supplierActivity(supplier)} · {profile.profileVersion}</small></div></header><div className="tb3-evidence-legend"><span className="verified">0 verified</span><span className="stated">STATED_UNVERIFIED · saved artifact, not verified</span><span className="inferred">INFERRED · source-backed, not verified</span><span className="unknown">UNKNOWN / MISSING</span></div>{evidenceStatus === "loading" && <div className="tb3-evidence-state" role="status">Loading safe non-contact evidence…</div>}{evidenceStatus === "error" && <div className="tb3-evidence-state error" role="alert">{evidenceError}</div>}<div className="tb3-fact-table"><div className="head"><span>FACT</span><span>VALUE</span><span>STATUS</span><span>ARTIFACT</span><span>SOURCE RECORD</span></div>{supplier.evidence.map((entry) => <div className="row" key={entry.id}><b>{entry.field}</b><p>{entry.value || "Unknown / MISSING"}</p><span className={evidenceStatusClass(entry.reviewStatus)}>{entry.reviewStatus}</span><strong>{entry.notes.startsWith("Saved") ? "Linked" : "Unavailable"}</strong><small>{entry.sourceTitle}{entry.sourceUrl && <a href={entry.sourceUrl} target="_blank" rel="noreferrer">Open source reference ↗</a>}<i>{entry.retrievedAt} · {entry.id}</i></small></div>)}</div><div className="tb3-guardrail"><i>!</i><p><b>Claim protection</b><span>STATED_UNVERIFIED remains stated and INFERRED remains inferred. UNKNOWN remains MISSING. None becomes verified, zero, or negative evidence.</span></p></div></article><aside className="tb3-audit-aside"><span>AUDIT SUMMARY</span><h3>Profile provenance</h3><div><b>{supplier.evidence.length || "—"}</b><small>safe evidence records loaded</small></div><div><b>{profile.evidenceStatedUnverifiedCount}</b><small>stated-unverified profile claims</small></div><div><b>{profile.evidenceInferredCount}</b><small>inferred profile claims</small></div><div><b>{profile.evidenceUnknownCount}</b><small>unknown profile claims</small></div><p>Contacts, messaging fields, named people, addresses and raw source content are excluded from both the local API and the deployed sanitized snapshot.</p><section><b>CONSULTANT LIMITS</b>{supplier.verificationQuestions.slice(0, 3).map((question) => <p key={question}>? {question}</p>)}</section><button onClick={() => onView("match-tenders")}>Back to match review</button></aside></section>
  </>;
}

function MatchReviewPanel({ result, tender, supplier, onViewChange, onDecision }: { result: TenderMatchCaseResult; tender: TenderRecord; supplier: SupplierRecord; onViewChange: (view: WorkspaceView) => void; onDecision: (decision: ConsultantDecision) => void }) {
  const match = result.match.auditedMatch;
  return <aside className="tb3-match-review">
    <header><span>COVERAGE-ADJUSTED PAIR SCORE</span><b className={scoreBand(match.value)}>{match.value ?? 0}</b></header>
    <h2>{supplier.legalEnglishName}</h2><p>{tender.reference} · {tender.country}</p>
    <div className="tb3-pair-verdict"><strong>SCORING ONLY</strong><span>{match.mainReason} · no Match threshold has been defined</span></div>
    <div className="tb3-review-states"><span>{supplier.readiness.label}</span><span>Under review · 0 verified claims</span><span>Human disposition: {decisionLabel[result.match.consultantDecision]}</span></div>
    <div className="tb3-breakdown">{[
      ["Pair Score", match.value, match.valueClass],
      ["Assessed-only Fit", match.assessedFitScore ?? 0, "CALCULATED"],
      ["Data Coverage", match.dataCoverage ?? 0, "CALCULATED"],
      ["Evidence Confidence", match.evidenceConfidence ?? 0, "CALCULATED"],
      ["Deadline urgency", result.match.deadlineUrgency.value, result.match.deadlineUrgency.valueClass],
    ].map(([label, value, valueClass]) => <div key={String(label)}><span>{label}</span><i><b style={{ width: `${value ?? 0}%` }} /></i><strong>{value ?? "—"}<small>{value === null ? "MISSING" : valueClass}</small></strong></div>)}</div>
    <section className="tb3-formula-audit"><span>WEIGHTED CRITERIA</span><div className="tb3-formula-table" role="table" aria-label="Formula v1.1 criterion audit">
      <div className="head" role="row"><b>Criterion</b><b>Weight</b><b>Fit</b><b>Points</b><b>Class / confidence</b></div>
      {match.components.map((component) => <div className="row" role="row" key={component.code}><p><b>{component.code.replace(/-/g, " ")}</b><small>{component.rationale}</small>{component.evidenceIds.map((id) => <code key={id}>{id}</code>)}</p><strong>{Math.round(component.weight)}%</strong><strong>{component.fitLevel ?? "—"}/5</strong><strong>{component.weightedPoints ?? "—"}</strong><span>{component.valueClass}<small>{component.evidenceConfidence ?? 0}% confidence</small></span></div>)}
    </div></section>
    <section className="tb3-gate-audit"><span>MANDATORY GATES</span><div>{(match.gates ?? []).map((entry) => <article className={`state-${entry.state.toLowerCase()}`} key={entry.code}><b>{entry.state}</b><p><strong>{entry.label}</strong><small>{entry.rationale}</small></p></article>)}</div></section>
    <section className="gaps"><span>BLOCKERS / MISSING INPUTS</span><div>{(match.blockers ?? []).map((blocker) => <p key={blocker}>! {blocker}</p>)}{match.missingInputs.map((input) => <p key={input}>? {input}</p>)}{result.reviewSupport.findings.map((finding) => <p key={finding.code}>! {finding.code}: {finding.nextAction}</p>)}</div></section>
    <button className="tb3-evidence-link" onClick={() => onViewChange("verification")}>Open cited supplier evidence →</button>
    <div className="tb3-decision-actions"><button className={result.match.consultantDecision === "rejected" ? "selected reject" : ""} onClick={() => onDecision("rejected")}>Reject</button><button className={result.match.consultantDecision === "hold" ? "selected" : ""} onClick={() => onDecision("hold")}>Hold</button><button disabled={!result.reviewSupport.readyForCurrentDecision} className={result.match.consultantDecision === "approved" ? "selected" : ""} onClick={() => onDecision("approved")}>Approve match</button></div>
    <small className="tb3-owner-boundary">Pair scoring only · consultant-controlled disposition · never a Match/Non-match verdict, formal bid evaluation or Bid/No-Bid decision</small>
  </aside>;
}

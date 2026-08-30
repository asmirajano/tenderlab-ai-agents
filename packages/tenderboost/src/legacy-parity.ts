import type { SupplierRecord, TenderRecord } from "./types.ts";

export type LegacyParityStatus =
  | "preserved"
  | "adapted-to-tenderapps-design"
  | "truth-corrected"
  | "intentionally-isolated-for-future-agent-separation"
  | "missing";

export type LegacyParityItem = {
  id: string;
  category: "navigation" | "content" | "interaction" | "data" | "state";
  sourceSurface: string;
  targetSurface: string;
  status: LegacyParityStatus;
  note: string;
  sourceEvidence?: string;
};

const item = (
  id: string,
  category: LegacyParityItem["category"],
  sourceSurface: string,
  targetSurface: string,
  status: LegacyParityStatus,
  note: string,
  sourceEvidence?: string,
): LegacyParityItem => ({ id, category, sourceSurface, targetSurface, status, note, sourceEvidence });

/**
 * Reviewable source-to-target inventory for the frozen 04b0b2a TenderBoost UI.
 * Tests reject a checkpoint while any item remains `missing`.
 */
export const tenderBoostParityManifest: LegacyParityItem[] = [
  item("nav-dashboard", "navigation", "01 Dashboard", "Overview", "adapted-to-tenderapps-design", "Uses the shared TenderApps shell and an internal workspace navigator."),
  item("nav-market-tenders", "navigation", "02 Market Radar / Tenders", "Market Radar / Tenders", "adapted-to-tenderapps-design", "Grouped responsive subnavigation retained."),
  item("nav-market-suppliers", "navigation", "02 Market Radar / Suppliers", "Market Radar / Suppliers", "adapted-to-tenderapps-design", "Grouped responsive subnavigation retained."),
  item("nav-supplier-profiles", "navigation", "03 Suppliers / Profiles", "Suppliers / Profiles", "preserved", "All ten profiles remain reachable."),
  item("nav-supplier-verification", "navigation", "03 Suppliers / Verification", "Suppliers / Verification", "preserved", "Evidence tables and provenance remain reachable."),
  item("nav-tenders", "navigation", "04 Tenders", "Tenders", "preserved", "All sixteen tenders remain reachable."),
  item("nav-matrix-full", "navigation", "05 Full Match Matrix", "Match Matrix / Portfolio", "truth-corrected", "Unassessed cells show MISSING rather than zero."),
  item("nav-matrix-tenders", "navigation", "05 AutoMatch by Tenders", "Match Matrix / By tender", "adapted-to-tenderapps-design", "Tender-first ranking retained."),
  item("nav-matrix-suppliers", "navigation", "05 AutoMatch by Suppliers", "Match Matrix / By supplier", "adapted-to-tenderapps-design", "Supplier-first ranking retained."),
  item("nav-campaigns", "navigation", "06 Campaign Studio / Campaigns", "Legacy module / Campaigns", "intentionally-isolated-for-future-agent-separation", "Not represented as TL-A031 or a canonical Agent."),
  item("nav-followups", "navigation", "06 Campaign Studio / Follow-ups", "Legacy module / Follow-ups", "intentionally-isolated-for-future-agent-separation", "Only local simulation events can populate follow-up states."),
  item("content-dashboard-hero", "content", "Outbound activation hero", "Migration baseline hero", "truth-corrected", "No live or autonomous activation claim."),
  item("content-dashboard-metrics", "content", "Five dashboard metrics", "Six provenance-aware metrics", "truth-corrected", "Separates evaluated, unassessed, and audited pairs."),
  item("content-priority-queue", "content", "Priority activation matches", "Legacy evaluated-match queue", "truth-corrected", "Historical estimates are labelled and current blockers are shown."),
  item("content-workflow-route", "content", "Live activation route", "Migration workflow map", "truth-corrected", "Static/local status is explicit."),
  item("content-agent-strip", "content", "Agent stack strip", "Capability handoff strip", "truth-corrected", "Campaign preparation is marked outside TL-A031."),
  item("content-tender-radar-heading", "content", "Global Tender Demand", "Global Tender Demand", "preserved", "Explanatory copy retained with simulation labelling."),
  item("content-tender-radar-kpis", "content", "Tender radar KPIs", "Tender radar KPIs", "truth-corrected", "Universe figures are labelled simulated/assumed."),
  item("content-tender-radar-flow", "content", "Tender-supplier radar flow", "Tender-supplier radar flow", "preserved", "Original 1,000/16/10 conceptual flow remains visible."),
  item("content-tender-map", "content", "World density map", "Local schematic tender map", "truth-corrected", "No external tiles; fixed geometry is visibly non-geospatial."),
  item("content-tender-detail", "content", "Focus tender detail", "Focus tender detail", "truth-corrected", "Absolute deadline and evaluated/MISSING match state replace relative-only data."),
  item("content-supplier-radar-heading", "content", "Global Supplier Market", "Global Supplier Market", "preserved", "Original explanatory content retained."),
  item("content-supplier-radar-kpis", "content", "Supplier radar KPIs", "Supplier radar KPIs", "truth-corrected", "Participation proposal claim removed."),
  item("content-supplier-map", "content", "Leaflet supplier map", "Local schematic supplier map", "truth-corrected", "CSP-safe and visibly non-geospatial."),
  item("content-supplier-detail", "content", "Target supplier detail", "Target supplier detail", "truth-corrected", "Outreach status is NOT SENT without an event."),
  item("content-supplier-directory", "content", "Supplier directory", "Supplier directory", "preserved", "Readiness, markets, verification, and action retained."),
  item("content-tender-directory", "content", "Open tender directory", "Tender snapshot directory", "truth-corrected", "Open/closed and freshness derive from absolute deadlines."),
  item("content-full-matrix", "content", "10 × 16 matrix", "10 × 16 matrix", "truth-corrected", "18 evaluated cells and 142 MISSING cells remain distinct."),
  item("content-tender-ranked-list", "content", "Tender-first supplier ranking", "Tender-first supplier ranking", "truth-corrected", "Audited support, legacy score, and MISSING remain distinct."),
  item("content-supplier-ranked-list", "content", "Supplier-first tender ranking", "Supplier-first tender ranking", "truth-corrected", "Deadline freshness is recalculated from the supplied clock."),
  item("content-match-review", "content", "Selected match review", "Selected Case match review", "truth-corrected", "Uses the versioned canonical Case result and evidence links."),
  item("content-evidence-profile", "content", "Supplier identity and evidence", "Supplier identity and evidence", "preserved", "Every fixture evidence record is displayed."),
  item("content-evidence-audit", "content", "Profile provenance summary", "Profile provenance summary", "preserved", "Status, confidence, source and retrieval date retained."),
  item("content-campaign-suggestions", "content", "Suggested campaigns", "Legacy campaign candidates", "intentionally-isolated-for-future-agent-separation", "Only evaluated positive pairs are candidates."),
  item("content-campaign-pipeline", "content", "Campaign pipeline", "Local draft/simulation pipeline", "truth-corrected", "Active/follow-up/response labels always say simulation and NOT SENT."),
  item("content-campaign-workspace", "content", "Campaign workspace", "Legacy local campaign workspace", "intentionally-isolated-for-future-agent-separation", "Separate schema, revision and storage key."),
  item("content-channel-list", "content", "Seven channels", "Seven draft formats", "truth-corrected", "Channels generate local copy only; they do not deliver it."),
  item("content-copy-editor", "content", "Editable generated copy", "Editable NOT SENT draft", "truth-corrected", "Only evidence-linked claims are eligible for draft proof."),
  item("content-sequence", "content", "Deadline-aware sequence", "Local simulation cadence", "truth-corrected", "Nothing is scheduled externally."),
  item("content-followup-table", "content", "Campaign follow-up table", "Simulation follow-up table", "truth-corrected", "Requires a recorded simulation event."),
  item("content-event-log", "content", "Campaign event log", "Versioned local event log", "truth-corrected", "Events identify simulation versus human draft actions."),
  item("content-handoff", "content", "ProposalPrep handoff lock", "Disabled future handoff", "preserved", "No downstream transfer is claimed."),
  item("content-case-audit", "content", "No equivalent", "Case identity and audit", "preserved", "Approved Stage 1/2 integrity surface retained in addition to parity."),
  item("interaction-radar-tabs", "interaction", "Radar Tenders/Suppliers tabs", "Radar Tenders/Suppliers tabs", "preserved", "Pointer and keyboard semantic buttons."),
  item("interaction-radar-filter", "interaction", "Region filters", "Region filters", "preserved", "Filters clusters and focus records."),
  item("interaction-radar-zoom", "interaction", "Tender map zoom", "Both schematic map zoom controls", "adapted-to-tenderapps-design", "Bounded local transform; no map service."),
  item("interaction-radar-marker", "interaction", "Map marker selection", "Schematic marker selection", "preserved", "Selection updates the detail panel."),
  item("interaction-profile-selection", "interaction", "Supplier selection", "Supplier selection", "preserved", "Selection propagates to verification and match views."),
  item("interaction-tender-selection", "interaction", "Tender selection", "Tender selection", "preserved", "Selection propagates to match views."),
  item("interaction-matrix-cell", "interaction", "Matrix-cell drill-down", "Matrix-cell drill-down", "preserved", "Opens the selected explicit pair even when MISSING."),
  item("interaction-automatch-run", "interaction", "Run AutoMatch progress", "Re-evaluate snapshot progress", "truth-corrected", "Local deterministic replay; not live processing."),
  item("interaction-decision", "interaction", "Reject/Hold/Approve", "Hold/Reject/Approve match", "truth-corrected", "Approval obeys current evidence/freshness blockers and retains provenance."),
  item("interaction-evidence-link", "interaction", "Open supplier verification", "Open supplier verification", "preserved", "No route loss."),
  item("interaction-layout", "interaction", "Standalone Standard/Wide", "Shared TenderApps Standard/Wide", "adapted-to-tenderapps-design", "Single shared persisted layout control."),
  item("interaction-draft-create", "interaction", "Create Campaign", "Create local legacy draft", "intentionally-isolated-for-future-agent-separation", "No canonical ownership implied."),
  item("interaction-draft-edit", "interaction", "Edit channel/copy/note", "Edit channel/objective/copy/note", "preserved", "Every change increments the local campaign revision."),
  item("interaction-draft-approval", "interaction", "Approve campaign", "Approve draft content", "truth-corrected", "Approval is provenance, not delivery authorization."),
  item("interaction-lifecycle", "interaction", "Activate/follow-up/response", "Explicit lifecycle simulation", "truth-corrected", "No real state is claimed without an integration event."),
  item("interaction-response", "interaction", "Simulate response", "Simulate interested/no-response", "truth-corrected", "Impossible before a simulation-start event."),
  item("interaction-response-reset", "interaction", "Reset response simulation", "Versioned local response reset", "truth-corrected", "Reset returns the selected local record to follow-up simulation and records provenance; it cannot erase or imply an external event.", "app/tenderboost-ai/page.tsx:861-886,1251-1274"),
  item("interaction-collapse", "interaction", "Campaign suggestion and pipeline collapse", "Campaign suggestion and pipeline collapse", "preserved", "Uses aria-expanded and stable controls."),
  item("interaction-workspace-collapse", "interaction", "Campaign Workspace Collapse/Expand", "Legacy workspace Collapse/Expand", "intentionally-isolated-for-future-agent-separation", "The isolated workspace retains its own accessible disclosure control.", "app/tenderboost-ai/page.tsx:1223-1231"),
  item("content-objective-recommendation", "content", "AI recommended objective, rationale and Use recommendation", "Evidence-bounded local recommendation", "intentionally-isolated-for-future-agent-separation", "Recommendation remains local decision support and never activation authority.", "app/tenderboost-ai/page.tsx:1232-1237"),
  item("content-channel-recommendation", "content", "Recommended campaign channel", "Recommended local draft format", "intentionally-isolated-for-future-agent-separation", "The recommended format is visible without implying delivery.", "app/tenderboost-ai/page.tsx:1238-1241"),
  item("content-sequence-channels", "content", "Cadence day and channel", "Local cadence day, channel and action", "truth-corrected", "Each cadence step preserves its channel but remains NOT SCHEDULED.", "app/tenderboost-ai/page.tsx:1244-1247"),
  item("interaction-explicit-campaign-save", "interaction", "Save changes", "Guarded browser-local Save changes", "adapted-to-tenderapps-design", "Explicit save records a revision and visible saved/failure feedback; autosave remains separately labelled.", "app/tenderboost-ai/page.tsx:1242"),
  item("content-followup-next-action", "content", "Next Action and follow-up date", "Local simulation next action and date", "truth-corrected", "Dates are review cues stored on the local simulation record, not scheduler tasks.", "app/tenderboost-ai/page.tsx:1258-1274"),
  item("interaction-case-save", "interaction", "No explicit Case persistence", "Save explicit Case", "preserved", "Stage 1/2 result persistence retained."),
  item("interaction-case-load", "interaction", "No explicit Case resume", "Load explicit Case", "truth-corrected", "Deadline freshness recomputes from the injected clock."),
  item("interaction-campaign-persist", "interaction", "Session campaign state", "Browser-local legacy module state", "adapted-to-tenderapps-design", "Separate storage key and visible non-durable warning."),
  item("state-empty-priority", "state", "No priority matches", "No evaluated matches", "truth-corrected", "MISSING is not presented as a low score."),
  item("state-empty-campaign", "state", "No campaign suggestions", "No eligible legacy candidates", "truth-corrected", "Blocker next steps are shown."),
  item("state-empty-followup", "state", "No follow-up records", "No simulation follow-up records", "truth-corrected", "Explains the required event."),
  item("state-errors", "state", "Implicit action failures", "Visible action and persistence errors", "adapted-to-tenderapps-design", "Errors use role=alert."),
  item("state-campaign-load-error", "state", "Campaign initial load", "Recoverable visible load error", "adapted-to-tenderapps-design", "A failed browser read cannot discard valid in-memory edits or silently overwrite the unsafe payload.", "app/tenderboost-ai/page.tsx:721-731"),
  item("state-campaign-autosave-error", "state", "Campaign autosave", "Recoverable visible autosave error", "adapted-to-tenderapps-design", "Autosave failure is announced while the current local state stays usable.", "app/tenderboost-ai/page.tsx:733-742"),
  item("state-case-save-error", "state", "No explicit Case save", "Guarded explicit Case save", "adapted-to-tenderapps-design", "Storage failure is surfaced with role=alert and the active Case remains in memory.", "No frozen-source equivalent; Stage 1/2 integrity addition"),
  item("state-statuses", "state", "Pending/approved/hold/rejected", "Pending/approved/hold/rejected", "preserved", "Match decisions remain separate from scores."),
  item("state-campaign-statuses", "state", "Draft through closed", "Draft/approved plus simulated lifecycle", "truth-corrected", "Every non-draft downstream status names simulation."),
  item("data-tenders", "data", "16 tender records", "16 tender records", "preserved", "Titles, objects, buyers, countries, sources, budgets and tags retained."),
  item("data-deadlines", "data", "Relative daysLeft", "Absolute deadlineAt", "truth-corrected", "Days remaining and urgency are derived from the current/injected clock."),
  item("data-deadline-baseline-vector", "data", "Frozen daysLeft vector", "Deterministic whole-day deadline conversion", "truth-corrected", "At the frozen as-of instant, floor((end-of-day deadline - clock)/24h) reproduces [1,1,2,2,5,5,8,8,8,8,9,11,15,16,116,135].", "app/tenderboost-ai/page.tsx fixture tenderData[].daysLeft"),
  item("data-suppliers", "data", "10 supplier records", "10 supplier records", "preserved", "Frozen JSON blob is byte-identical."),
  item("data-evidence", "data", "Supplier evidence fields", "Versioned evidence records", "truth-corrected", "Source role, value class and review status are explicit."),
  item("data-matches", "data", "18 assessed pairs", "18 evaluated legacy pairs", "preserved", "Scores 65–95 remain historical estimates."),
  item("data-unassessed", "data", "142 implicit zero pairs", "142 explicit MISSING pairs", "truth-corrected", "A future evaluated zero remains distinguishable."),
  item("data-radar-universe", "data", "1,000/86/15 universe metrics", "Dated simulated universe annotations", "truth-corrected", "Not represented as sourced live data."),
  item("data-radar-geometry", "data", "Fixed map geometry and external tiles", "Fixed local schematic geometry", "truth-corrected", "CSP is unchanged."),
  item("data-legacy-provenance", "data", "TenderBoost source identity", "TenderBoost migration provenance", "preserved", "Commit 04b0b2a and snapshot identity remain visible."),
  item("data-product-identity", "data", "TenderBoost AI", "TenderMatch · legacy TenderBoost baseline", "adapted-to-tenderapps-design", "Both branding layers remain traceable."),
];

export const supplierActivityLabels: Record<string, string> = {
  yutong: "Bus Manufacturer",
  cggc: "EPC Contractor",
  mindray: "Medical Devices",
  ncs_testing: "Laboratory Equipment",
  chery: "Automotive",
  united_imaging: "Imaging Systems",
  kingpeng: "Greenhouse Systems",
  huawei: "Networking",
  sieyuan: "Power Equipment",
  promo_company: "Promotional Products",
};

export function fixtureSupplierKey(supplier: SupplierRecord) {
  return supplier.id.replace("supplier:TB:", "");
}

export function supplierActivity(supplier: SupplierRecord) {
  return supplierActivityLabels[fixtureSupplierKey(supplier)] ?? supplier.categories[0] ?? "Not classified";
}

export type RadarCluster = { id: string; label: string; count: number; x: number; y: number; group: string };
export type RadarCoordinate = { x: number; y: number; group: string };

export const worldRadarClusters: RadarCluster[] = [
  { id: "us-west", label: "Western North America", count: 12, x: 15, y: 34, group: "Americas" },
  { id: "us-east", label: "Eastern North America", count: 18, x: 24, y: 34, group: "Americas" },
  { id: "central-america", label: "Mexico & Central America", count: 24, x: 20, y: 47, group: "Americas" },
  { id: "brazil", label: "Brazil", count: 48, x: 35, y: 64, group: "Americas" },
  { id: "andean", label: "Andean Region", count: 40, x: 27, y: 59, group: "Americas" },
  { id: "southern-cone", label: "Southern Cone", count: 24, x: 30, y: 77, group: "Americas" },
  { id: "west-europe", label: "Western Europe", count: 35, x: 49, y: 30, group: "Europe" },
  { id: "east-europe", label: "Eastern Europe", count: 55, x: 56, y: 31, group: "Europe" },
  { id: "balkans", label: "Balkans", count: 35, x: 55, y: 37, group: "Europe" },
  { id: "caucasus", label: "Caucasus", count: 30, x: 62, y: 39, group: "Europe" },
  { id: "north-africa", label: "North Africa", count: 50, x: 52, y: 47, group: "Africa" },
  { id: "west-africa", label: "West Africa", count: 65, x: 48, y: 57, group: "Africa" },
  { id: "east-africa", label: "East Africa", count: 75, x: 61, y: 58, group: "Africa" },
  { id: "central-africa", label: "Central Africa", count: 35, x: 55, y: 62, group: "Africa" },
  { id: "southern-africa", label: "Southern Africa", count: 45, x: 57, y: 75, group: "Africa" },
  { id: "middle-east", label: "Middle East", count: 55, x: 64, y: 45, group: "Middle East" },
  { id: "central-asia", label: "Central Asia", count: 80, x: 67, y: 37, group: "Central Asia" },
  { id: "south-asia", label: "South Asia", count: 75, x: 75, y: 48, group: "Asia Pacific" },
  { id: "southeast-asia", label: "Southeast Asia", count: 70, x: 82, y: 59, group: "Asia Pacific" },
  { id: "east-asia", label: "East Asia", count: 40, x: 86, y: 39, group: "Asia Pacific" },
  { id: "china-near", label: "Greater China", count: 25, x: 80, y: 42, group: "Asia Pacific" },
  { id: "pacific", label: "Pacific", count: 15, x: 91, y: 70, group: "Asia Pacific" },
  { id: "japan-korea", label: "Japan & Korea", count: 33, x: 89, y: 38, group: "Asia Pacific" },
];

export const chinaRadarClusters: RadarCluster[] = [
  { id: "guangdong", label: "Guangdong", count: 170, x: 77, y: 69, group: "South China" },
  { id: "jiangsu", label: "Jiangsu", count: 125, x: 72, y: 43, group: "East China" },
  { id: "zhejiang", label: "Zhejiang", count: 115, x: 75, y: 53, group: "East China" },
  { id: "shandong", label: "Shandong", count: 85, x: 68, y: 31, group: "East China" },
  { id: "shanghai", label: "Shanghai", count: 60, x: 80, y: 46, group: "East China" },
  { id: "fujian", label: "Fujian", count: 55, x: 73, y: 63, group: "East China" },
  { id: "henan", label: "Henan", count: 45, x: 58, y: 40, group: "Central China" },
  { id: "hubei", label: "Hubei", count: 45, x: 56, y: 52, group: "Central China" },
  { id: "anhui", label: "Anhui", count: 40, x: 67, y: 49, group: "East China" },
  { id: "hebei", label: "Hebei", count: 35, x: 59, y: 24, group: "North China" },
  { id: "beijing-tianjin", label: "Beijing & Tianjin", count: 40, x: 63, y: 19, group: "North China" },
  { id: "sichuan-chongqing", label: "Sichuan & Chongqing", count: 45, x: 39, y: 51, group: "Central China" },
  { id: "liaoning", label: "Liaoning", count: 30, x: 71, y: 15, group: "North China" },
  { id: "jiangxi-hunan", label: "Jiangxi & Hunan", count: 50, x: 59, y: 61, group: "Central China" },
  { id: "western-china", label: "Western China", count: 50, x: 23, y: 43, group: "West China" },
];

export const tenderRadarCoordinates: Record<string, RadarCoordinate> = {
  "ACCESS/GOVTECH/GD-1": { x: 78, y: 46, group: "Asia Pacific" },
  "514122": { x: 68, y: 39, group: "Central Asia" },
  G05: { x: 70, y: 42, group: "Central Asia" },
  "DPA14004203 / ICB 514062": { x: 70, y: 38, group: "Central Asia" },
  "EC-ENEST/SKP/2026/EA-OP/0053": { x: 55, y: 37, group: "Europe" },
  "45376134": { x: 69, y: 44, group: "Central Asia" },
  "44846993": { x: 71, y: 42, group: "Central Asia" },
  "50/G/C2SC4.A16.8/26": { x: 54, y: 63, group: "Africa" },
  "SKIP_Z07.1": { x: 67, y: 34, group: "Central Asia" },
  "ADB-I/G-R1-LESCO-2026 (Lot-6)": { x: 72, y: 45, group: "Asia Pacific" },
  "UP/ICB/26/01": { x: 66, y: 40, group: "Central Asia" },
  "514110": { x: 69, y: 41, group: "Central Asia" },
  "UZ-CTSIP-10002-CW": { x: 65, y: 39, group: "Central Asia" },
  "SKIP_Z07.5": { x: 65, y: 35, group: "Central Asia" },
  "ZR-SPACE-252528-GO-RFB": { x: 56, y: 63, group: "Africa" },
  "RFQ/ALB/14/2025": { x: 54, y: 35, group: "Europe" },
};

export const supplierRadarCoordinates: Record<string, RadarCoordinate> = {
  yutong: { x: 58, y: 40, group: "Central China" },
  cggc: { x: 56, y: 52, group: "Central China" },
  mindray: { x: 77, y: 72, group: "South China" },
  ncs_testing: { x: 63, y: 19, group: "North China" },
  chery: { x: 70, y: 49, group: "East China" },
  united_imaging: { x: 80, y: 46, group: "East China" },
  kingpeng: { x: 64, y: 18, group: "North China" },
  huawei: { x: 77, y: 69, group: "South China" },
  sieyuan: { x: 79, y: 47, group: "East China" },
  promo_company: { x: 56, y: 53, group: "Central China" },
};

export function regionsForSupplier(supplier: SupplierRecord, tenders: TenderRecord[]) {
  return Array.from(new Set(supplier.legacyTenderMatches
    .map((match) => tenders.find((tender) => tender.reference === match.tenderReference)?.region)
    .filter((region): region is string => Boolean(region))));
}

export function paritySummary() {
  return tenderBoostParityManifest.reduce<Record<LegacyParityStatus, number>>((summary, entry) => {
    summary[entry.status] += 1;
    return summary;
  }, {
    preserved: 0,
    "adapted-to-tenderapps-design": 0,
    "truth-corrected": 0,
    "intentionally-isolated-for-future-agent-separation": 0,
    missing: 0,
  });
}

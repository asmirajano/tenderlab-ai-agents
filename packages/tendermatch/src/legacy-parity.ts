import type { SupplierRecord, TenderRecord } from "./types.ts";

export type LegacyParityStatus =
  | "preserved"
  | "adapted-to-tenderapps-design"
  | "truth-corrected"
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
 * Reviewable source-to-target inventory for the frozen 04b0b2a TenderBoost matching UI.
 * Campaign Studio entries were removed after the TenderMatch product-boundary decision.
 * Tests reject a checkpoint while any item remains `missing`.
 */
export const tenderBoostParityManifest: LegacyParityItem[] = [
  item("nav-dashboard", "navigation", "01 Dashboard", "Overview", "adapted-to-tenderapps-design", "Uses the shared TenderApps shell and an internal workspace navigator."),
  item("nav-market-tenders", "navigation", "02 Market Radar / Tenders", "Market Radar / Tenders", "adapted-to-tenderapps-design", "Grouped responsive subnavigation retained."),
  item("nav-market-suppliers", "navigation", "02 Market Radar / Suppliers", "Market Radar / Suppliers", "adapted-to-tenderapps-design", "Grouped responsive subnavigation retained."),
  item("nav-supplier-profiles", "navigation", "03 Suppliers / Profiles", "Suppliers / Profiles", "truth-corrected", "The ten frozen profiles and superseded 100-profile release remain historical evidence; all 17 approved Neon v1.3 profiles are reachable at runtime."),
  item("nav-supplier-verification", "navigation", "03 Suppliers / Verification", "Suppliers / Verification", "preserved", "Evidence tables and provenance remain reachable."),
  item("nav-tenders", "navigation", "04 Tenders", "Tenders", "truth-corrected", "The active current-at-extraction pilot tender set is reachable; the 16-row source fixture remains regression-only."),
  item("nav-matrix-full", "navigation", "05 Full Match Matrix", "Match Matrix / Portfolio", "truth-corrected", "Unassessed cells show MISSING rather than zero."),
  item("nav-matrix-tenders", "navigation", "05 AutoMatch by Tenders", "Match Matrix / By tender", "adapted-to-tenderapps-design", "Tender-first ranking retained."),
  item("nav-matrix-suppliers", "navigation", "05 AutoMatch by Suppliers", "Match Matrix / By supplier", "adapted-to-tenderapps-design", "Supplier-first ranking retained."),
  item("content-dashboard-hero", "content", "Outbound activation hero", "Migration baseline hero", "truth-corrected", "No live or autonomous activation claim."),
  item("content-dashboard-metrics", "content", "Five dashboard metrics", "Six provenance-aware metrics", "truth-corrected", "Separates evaluated, unassessed, and audited pairs."),
  item("content-priority-queue", "content", "Priority activation matches", "Legacy evaluated-match queue", "truth-corrected", "Historical estimates are labelled and current blockers are shown."),
  item("content-workflow-route", "content", "Live activation route", "Migration workflow map", "truth-corrected", "Static/local status is explicit."),
  item("content-agent-strip", "content", "Agent stack strip", "Capability handoff strip", "truth-corrected", "The active strip ends at the human-controlled participation decision."),
  item("content-tender-radar-heading", "content", "Global Tender Demand", "Global Tender Demand", "preserved", "Explanatory copy retained with simulation labelling."),
  item("content-tender-radar-kpis", "content", "Tender radar KPIs", "Current pilot KPI summary", "truth-corrected", "Counts derive from the active inputs and distinguish sparse exploratory estimates from completed MISSING evaluations."),
  item("content-tender-radar-flow", "content", "Tender-supplier radar flow", "Current pilot review flow", "truth-corrected", "The active tender and pair counts derive from runtime data rather than the legacy simulated universe."),
  item("content-tender-map", "content", "World density map", "Local country-level pilot map", "truth-corrected", "Self-hosted geometry and country-level marker placement are explicit; no precise coordinates, external tiles, or live feed."),
  item("content-tender-map-legend", "content", "Tender map legend and geometry attribution", "Tender map legend and geometry attribution", "preserved", "Potential-cluster and focus-tender symbols plus Wikimedia geometry credit are visible."),
  item("content-tender-focus-signal", "content", "TenderLab focus signal", "TenderLab focus signal", "truth-corrected", "The signal identifies the universe as frozen and simulated."),
  item("content-supplier-radar-heading", "content", "Global Supplier Market", "Supplier Market", "truth-corrected", "The active view describes the read-only under-review supplier contract rather than a simulated global market."),
  item("content-supplier-radar-kpis", "content", "Supplier radar KPIs", "Supplier radar KPIs", "truth-corrected", "Participation proposal claim removed."),
  item("content-supplier-map", "content", "Leaflet supplier map", "Local geographic supplier map", "truth-corrected", "A self-hosted geographic China map preserves frozen coordinate placement without external tiles or CSP weakening."),
  item("content-supplier-map-legend", "content", "Supplier map legend and attribution", "Supplier map legend and geometry attribution", "truth-corrected", "The cluster/target legend and bundled Wikimedia geometry credit are visible."),
  item("content-supplier-focus-signal", "content", "Supplier activation-target signal", "Supplier matching-target signal", "truth-corrected", "The visual cue is restored as a matching target without an external-action claim."),
  item("content-supplier-directory", "content", "Supplier directory", "Supplier directory", "truth-corrected", "All 17 approved GOODS/WORKS profiles are shown with source readiness and evidence states; no legacy score or readiness percentage is reused."),
  item("content-tender-directory", "content", "Open tender directory", "Current pilot tender directory", "truth-corrected", "The selected set was OPEN/current at extraction; freshness is recalculated from absolute deadlines."),
  item("content-full-matrix", "content", "10 × 16 matrix", "Runtime-derived 17 × 60 evaluation matrix", "truth-corrected", "All 1,020 pairs are evaluated under the pinned v1.3 contract; only policy-eligible, artifact-linked technical overlaps may receive an exploratory estimate and all others remain MISSING."),
  item("content-tender-ranked-list", "content", "Tender-first supplier ranking", "Tender-first review list", "truth-corrected", "Tender-first review separates sparse exploratory technical-fit estimates from completed MISSING evaluations."),
  item("content-supplier-ranked-list", "content", "Supplier-first tender ranking", "Supplier-first review list", "truth-corrected", "Supplier-first review preserves MISSING semantics and recomputes deadline freshness from the supplied clock."),
  item("content-match-review", "content", "Selected match review", "Selected Case match review", "truth-corrected", "Uses the versioned canonical Case result and evidence links."),
  item("content-evidence-profile", "content", "Supplier identity and evidence", "Supplier identity and evidence", "truth-corrected", "Safe non-contact evidence is loaded on demand from the pinned read-only v1.3 GOODS/WORKS contract; raw source content is not exposed."),
  item("content-evidence-audit", "content", "Profile provenance summary", "Profile provenance summary", "truth-corrected", "INFERRED and UNKNOWN classes, artifact linkage, source identity and retrieval date remain explicit; zero claims are presented as VERIFIED."),
  item("interaction-radar-tabs", "interaction", "Radar Tenders/Suppliers tabs", "Radar Tenders/Suppliers tabs", "preserved", "Pointer and keyboard semantic buttons."),
  item("interaction-radar-filter", "interaction", "Region filters", "Region filters", "preserved", "Filters clusters and focus records."),
  item("interaction-radar-zoom", "interaction", "Map zoom controls", "Both local geographic map zoom controls", "adapted-to-tenderapps-design", "Bounded zoom enlarges local geometry and markers without a map service."),
  item("interaction-radar-marker", "interaction", "Map marker selection", "Geographic marker selection", "preserved", "Pointer or keyboard selection opens the appropriate surviving tender-first or supplier-verification destination without an aggregate-page detail panel."),
  item("interaction-supplier-map-pan", "interaction", "Leaflet drag, touch and keyboard pan", "Local geographic drag, touch and arrow-key pan", "adapted-to-tenderapps-design", "Pan becomes available after zoom while keeping data and geometry self-hosted."),
  item("interaction-profile-selection", "interaction", "Supplier selection", "Supplier selection", "preserved", "Selection propagates to verification and match views."),
  item("interaction-tender-selection", "interaction", "Tender selection", "Tender selection", "preserved", "Selection propagates to match views."),
  item("interaction-matrix-cell", "interaction", "Matrix-cell drill-down", "Matrix-cell drill-down", "preserved", "Opens the selected explicit pair even when MISSING."),
  item("interaction-automatch-run", "interaction", "Run AutoMatch progress", "Re-evaluate snapshot progress", "truth-corrected", "Local deterministic replay; not live processing."),
  item("interaction-decision", "interaction", "Reject/Hold/Approve", "Hold/Reject/Approve match", "truth-corrected", "Approval obeys current evidence/freshness blockers and retains provenance."),
  item("interaction-evidence-link", "interaction", "Open supplier verification", "Open supplier verification", "preserved", "No route loss."),
  item("interaction-layout", "interaction", "Standalone Standard/Wide", "Shared TenderApps Standard/Wide", "adapted-to-tenderapps-design", "Single shared persisted layout control."),
  item("interaction-case-save", "interaction", "No explicit Case persistence", "Save explicit Case", "preserved", "Stage 1/2 result persistence retained."),
  item("interaction-case-load", "interaction", "No explicit Case resume", "Load explicit Case", "truth-corrected", "Deadline freshness recomputes from the injected clock."),
  item("state-empty-priority", "state", "No priority matches", "No evaluated matches", "truth-corrected", "MISSING is not presented as a low score."),
  item("state-errors", "state", "Implicit action failures", "Visible action and persistence errors", "adapted-to-tenderapps-design", "Errors use role=alert."),
  item("state-case-save-error", "state", "No frozen-source equivalent", "Guarded explicit Case save", "adapted-to-tenderapps-design", "Storage failure is surfaced with role=alert and the active Case remains in memory.", "No frozen-source equivalent; Stage 1/2 integrity addition"),
  item("state-statuses", "state", "Pending/approved/hold/rejected", "Pending/approved/hold/rejected", "preserved", "Match decisions remain separate from scores."),
  item("data-tenders", "data", "16 tender records", "Deterministic current Central Asia pilot snapshot", "truth-corrected", "The source fixture remains regression-only; runtime tender count and fields come from the sanitized authorized extraction."),
  item("data-deadlines", "data", "Relative daysLeft", "Absolute deadlineAt", "truth-corrected", "Days remaining and urgency are derived from the current/injected clock."),
  item("data-deadline-baseline-vector", "data", "Frozen daysLeft vector", "Deterministic whole-day deadline conversion", "truth-corrected", "At the frozen as-of instant, floor((end-of-day deadline - clock)/24h) reproduces [1,1,2,2,5,5,8,8,8,8,9,11,15,16,116,135].", "04b0b2a:app/tenderboost-ai/page.tsx:137-153 · tenders[].daysLeft"),
  item("data-suppliers", "data", "10 frozen supplier records", "17 pinned Neon v1.3 GOODS/WORKS supplier profiles", "truth-corrected", "The frozen JSON blob and superseded 100-profile release remain historical evidence and do not power runtime views."),
  item("data-evidence", "data", "Supplier evidence fields", "2,300 safe versioned evidence records", "truth-corrected", "Source role, value class, review status and artifact availability are explicit; contacts and raw source content are excluded."),
  item("data-matches", "data", "18 assessed pairs", "No pilot pair assessments", "truth-corrected", "The historical scores remain regression-only and cannot attach to Neon tender identities."),
  item("data-unassessed", "data", "142 implicit zero pairs", "Policy-gated 1,020-pair evaluation inventory", "truth-corrected", "Numeric exploratory technical fit is emitted only above the procurement, saved-artifact, and relevance gates; every other completed evaluation remains MISSING and a future evaluated zero remains distinguishable."),
  item("data-radar-universe", "data", "1,000/86/15 universe metrics", "Dated simulated universe annotations", "truth-corrected", "Not represented as sourced live data."),
  item("data-radar-geometry", "data", "Fixed world geometry and supplier tile map", "Self-hosted world and China geographic geometry", "truth-corrected", "Tender markers use country-level anchors and labelled visual spacing; supplier demonstration coordinates and local assets remain unchanged."),
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

const centralAsiaCountryCoordinates: Record<string, RadarCoordinate> = {
  KZ: { x: 64.5, y: 34.5, group: "Kazakhstan" },
  KG: { x: 68.5, y: 39.5, group: "Kyrgyzstan" },
  TJ: { x: 68.5, y: 42.5, group: "Tajikistan" },
  TM: { x: 64, y: 43, group: "Turkmenistan" },
  UZ: { x: 65.5, y: 40.5, group: "Uzbekistan" },
};

/**
 * Current-pilot tenders have country data, not precise coordinates. The small,
 * deterministic visual offset prevents coincident controls while retaining a
 * country-level marker contract; it must not be read as a tender location.
 */
export function tenderRadarCoordinate(tender: TenderRecord, index: number): RadarCoordinate {
  const base = tender.countryCode ? centralAsiaCountryCoordinates[tender.countryCode] : undefined;
  if (!base) return tenderRadarCoordinates[tender.reference] ?? { x: 67, y: 39, group: tender.country };
  const column = (index % 5) - 2;
  const row = (Math.floor(index / 5) % 3) - 1;
  return { x: base.x + column * .42, y: base.y + row * .42, group: base.group };
}

export function countryTenderRadarClusters(tenders: TenderRecord[]): RadarCluster[] {
  return Object.entries(centralAsiaCountryCoordinates).map(([countryCode, coordinate]) => ({
    id: `pilot-${countryCode.toLowerCase()}`,
    label: coordinate.group,
    count: tenders.filter((tender) => tender.countryCode === countryCode).length,
    ...coordinate,
  }));
}

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
    missing: 0,
  });
}

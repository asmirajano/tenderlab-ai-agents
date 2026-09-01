import type { SupplierEvidenceApiRecord, SupplierProfileApiRecord } from "./supplier-contract.ts";
import type { AuditedComponentCode, ConsultantDecision, MatchAssessment, TenderFreshness, TenderMatchGateState, TenderMatchMandatoryGate, TenderMatchPairStatus, TenderRecord } from "./types.ts";
import { calculateDeadlineUrgency, deriveTenderFreshness } from "./engine.ts";

export const TENDERMATCH_EXPLORATORY_ENGINE_VERSION = "tendermatch-match-formula/1.1.0" as const;
export const TENDERMATCH_EXPLORATORY_POLICY_VERSION = "tendermatch-coverage-adjusted-goods-works/1.1.0" as const;
export const TENDERMATCH_MATCH_ENGINE_VERSION = TENDERMATCH_EXPLORATORY_ENGINE_VERSION;
export const TENDERMATCH_MATCH_POLICY_VERSION = TENDERMATCH_EXPLORATORY_POLICY_VERSION;
export const TENDERMATCH_LEGACY_EXPLORATORY_BASELINE = { engineVersion: "tendermatch-exploratory-fit/5.0.0", policyVersion: "tendermatch-goods-works-evidence-overlap/2.0.0", result: "1,020 MISSING values; zero numeric results" } as const;

const TECHNICAL_FIELDS = new Set(["product_families", "works_specializations", "industries_served", "materials"]);
const IN_SCOPE = new Set(["GOODS", "WORKS"]);
const GENERIC = new Set(["about", "all", "and", "based", "company", "contract", "equipment", "firm", "for", "from", "goods", "international", "manufacturer", "manufacturing", "other", "product", "products", "project", "provision", "services", "supplier", "supply", "system", "tender", "the", "this", "under", "with", "works"]);
const CONCEPTS: Record<string, string[]> = {
  furniture: ["furniture", "chair", "chairs", "desk", "desks", "table", "tables", "cabinet", "seating", "waiting-area"],
  medical: ["medical", "diagnostic", "diagnostics", "cardiology", "ultrasound", "treadmill", "monitor", "healthcare", "rehabilitation"],
  electrical: ["electrical", "electricity", "substation", "transformer", "transformers", "voltage", "grid", "relay", "switchgear", "power"],
  construction: ["construction", "building", "buildings", "prefab", "modular", "civil", "reconstruction", "school"],
  water: ["water", "wastewater", "irrigation", "drainage", "sewerage", "treatment", "pump", "pumps"],
  road: ["road", "roads", "highway", "transport", "pavement", "bridge", "asphalt", "railway", "railways"],
  packaging: ["packaging", "plastic", "bag", "bags", "film", "paper", "carton"],
  agriculture: ["agriculture", "agricultural", "farm", "farming", "tractor", "tractors"],
  digital: ["digital", "software", "devops", "data", "technology", "telecom"],
  energy: ["energy", "plant", "plants", "cable", "cables", "infrastructure"],
};
const ALIAS_TO_CONCEPT = new Map(Object.entries(CONCEPTS).flatMap(([concept, aliases]) => aliases.map((alias) => [alias, concept] as const)));

export type ExploratoryReasonCode = string;
export type MatchCriterion = { code: AuditedComponentCode; label: string; weight: number; fitLevel: 0 | 1 | 2 | 3 | 4 | 5 | null; valueClass: "ESTIMATED" | "MISSING"; weightedPoints: number | null; evidenceConfidence: number | null; evidenceIds: string[]; reasonCodes: string[]; rationale: string; applicable: true };
export type ExploratoryMatchEvaluation = {
  id: string; key: string; tenderId: string; tenderReference: string; tenderSnapshotId: string; tenderVersion: string; supplierId: string; supplierProfileVersionId: string; supplierProfileVersion: string; supplierBatchCode: string;
  engineVersion: typeof TENDERMATCH_EXPLORATORY_ENGINE_VERSION; policyVersion: typeof TENDERMATCH_EXPLORATORY_POLICY_VERSION; evaluatedAt: string;
  value: number; valueClass: "ESTIMATED"; label: "Coverage-adjusted pair score"; pairStatus: TenderMatchPairStatus; assessedFitScore: number; dataCoverage: number; evidenceConfidence: number;
  criteria: MatchCriterion[]; mandatoryGates: TenderMatchMandatoryGate[]; mainReason: string; reasonCodes: ExploratoryReasonCode[]; blockers: string[]; missingInputs: string[]; evidenceIds: string[];
  technicalRelevance: { value: number | null; fitLevel: MatchCriterion["fitLevel"]; matchedConcepts: string[]; matchedTerms: string[]; evidenceIds: string[]; reasonCodes: string[] };
  procurementApplicability: { supplierClassification: SupplierProfileApiRecord["classification"]; tenderProcurementType: string; compatible: boolean };
  marketDelivery: { value: number | null; state: "supported" | "unknown"; evidenceIds: string[]; reasonCodes: string[] };
  capacity: { value: number | null; state: "stated-unverified" | "unknown"; evidenceIds: string[]; usedInTechnicalFit: false };
  turnover: { value: null; state: "stated-unverified" | "unknown"; evidenceIds: string[]; usedInTechnicalFit: false };
  evidenceCoverage: { cited: number; availableArtifacts: number; unavailableArtifacts: number };
  supplierReadinessStatus: SupplierProfileApiRecord["readinessStatus"]; verificationStatus: "under_review"; eligibility: "blocked" | "unknown"; compliance: "unknown"; references: "unknown"; freshness: TenderFreshness; limitations: string[]; consultantDecision: ConsultantDecision;
};
export type ExploratoryEvaluationSummary = { total: number; numeric: number; missing: number; byStatus: Record<TenderMatchPairStatus, number>; byReason: Record<string, number>; engineVersion: typeof TENDERMATCH_EXPLORATORY_ENGINE_VERSION; policyVersion: typeof TENDERMATCH_EXPLORATORY_POLICY_VERSION; evaluatedAt: string };

function plainText(value: string | null | undefined) { return (value ?? "").replace(/<[^>]*>/g, " ").replace(/&[a-z0-9#]+;/gi, " "); }
function tokens(value: string) { return new Set(value.toLowerCase().split(/[^\p{L}\p{N}]+/u).filter((token) => token.length > 2 && !GENERIC.has(token))); }
function concepts(values: Set<string>) { return new Set([...values].map((token) => ALIAS_TO_CONCEPT.get(token)).filter((value): value is string => Boolean(value))); }
function stableIdPart(value: string) { return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 64); }
function confidence(record: SupplierEvidenceApiRecord) {
  const sourceBand = record.status === "VERIFIED" ? 100 : record.status === "STATED_UNVERIFIED" ? 50 : record.status === "INFERRED" ? 30 : 0;
  return record.artifactAvailable ? sourceBand : Math.min(sourceBand, 30);
}
function mean(values: number[]) { return values.length ? Math.round(values.reduce((sum, value) => sum + value, 0) / values.length) : 0; }
function usable(record: SupplierEvidenceApiRecord) { return record.status !== "UNKNOWN" && Boolean(record.value?.trim()) && !/^(unknown|n\/a)$/i.test(record.value?.trim() ?? ""); }
function criterion(code: AuditedComponentCode, label: string, weight: number, fitLevel: MatchCriterion["fitLevel"], records: SupplierEvidenceApiRecord[], rationale: string, reasonCodes: string[] = []): MatchCriterion {
  const artifactReasons = records.some((record) => !record.artifactAvailable) ? ["CITED_ARTIFACT_UNAVAILABLE"] : [];
  return { code, label, weight, fitLevel, valueClass: fitLevel === null ? "MISSING" : "ESTIMATED", weightedPoints: fitLevel === null ? null : weight * fitLevel, evidenceConfidence: fitLevel === null ? null : mean(records.map(confidence)), evidenceIds: records.map((record) => record.claimId).sort(), reasonCodes: [...new Set([...reasonCodes, ...artifactReasons])], rationale, applicable: true };
}
function gate(code: string, label: string, state: TenderMatchGateState, rationale: string, evidenceIds: string[] = []): TenderMatchMandatoryGate { return { code, label, state, rationale, evidenceIds }; }
function missingCriterion(code: AuditedComponentCode, label: string, weight: number, input: string) { return criterion(code, label, weight, null, [], `${input} is not supported by the current notice-level pair evidence.`, [`${code.toUpperCase().replace(/-/g, "_")}_MISSING`]); }

function technicalCriterion(tender: TenderRecord, records: SupplierEvidenceApiRecord[]) {
  const code: AuditedComponentCode = tender.procurementType === "WORKS" ? "works-technical-relevance" : "technical-relevance";
  const label = tender.procurementType === "WORKS" ? "Works technical fit" : "Product technical fit";
  const weight = tender.procurementType === "WORKS" ? 25 : 35;
  const technical = records.filter((record) => TECHNICAL_FIELDS.has(record.field) && usable(record));
  if (!technical.length) return { criterion: criterion(code, label, weight, null, [], "Supplier technical scope is not available.", ["SUPPLIER_TECHNICAL_SCOPE_MISSING"]), matchedConcepts: [] as string[], matchedTerms: [] as string[] };
  // The complete notice text is retained for retrieval, but boilerplate project
  // prose must not create technical points. Scoring uses the procurement title,
  // object and explicit tags only.
  const tenderTokens = tokens([tender.title, tender.object, tender.procurementType, ...tender.tags].map(plainText).join(" "));
  const tenderConcepts = concepts(tenderTokens);
  const matchedTerms = new Set<string>(); const matchedConcepts = new Set<string>();
  for (const record of technical) { const claimTokens = tokens(record.value ?? ""); for (const token of claimTokens) if (tenderTokens.has(token)) matchedTerms.add(token); for (const concept of concepts(claimTokens)) if (tenderConcepts.has(concept)) matchedConcepts.add(concept); }
  const c = matchedConcepts.size; const t = matchedTerms.size;
  const fitLevel: MatchCriterion["fitLevel"] = c >= 2 || (c >= 1 && t >= 2) ? 5 : c >= 1 && t >= 1 ? 4 : c >= 1 ? 3 : t >= 2 ? 2 : t === 1 ? 1 : 0;
  return { criterion: criterion(code, label, weight, fitLevel, technical, fitLevel === 0 ? "The stated supplier scope has no normalized overlap with the notice-level tender requirement." : `Normalized overlap: ${[...matchedConcepts, ...matchedTerms].join(", ")}.`, [fitLevel === 0 ? "SUPPORTED_TECHNICAL_INCOMPATIBILITY" : "NORMALIZED_TECHNICAL_OVERLAP"]), matchedConcepts: [...matchedConcepts].sort(), matchedTerms: [...matchedTerms].sort() };
}
function capacityCriterion(tender: TenderRecord, records: SupplierEvidenceApiRecord[]) {
  const code: AuditedComponentCode = tender.procurementType === "WORKS" ? "personnel-equipment-capacity" : "capacity-delivery";
  const label = tender.procurementType === "WORKS" ? "Personnel, equipment and capacity" : "Supply capacity and delivery feasibility";
  const claims = records.filter((record) => record.field === "capacity" && usable(record));
  return claims.length ? criterion(code, label, 20, 3, claims, "A supplier-side capacity claim is available, but the tender notice does not state a comparable capacity threshold.", ["SUPPLIER_CAPACITY_STATED", "TENDER_CAPACITY_THRESHOLD_UNKNOWN"]) : criterion(code, label, 20, null, [], "Supplier capacity evidence is missing.", ["SUPPLIER_CAPACITY_MISSING"]);
}
function marketCriterion(tender: TenderRecord, records: SupplierEvidenceApiRecord[]) {
  const code: AuditedComponentCode = tender.procurementType === "WORKS" ? "mobilization-local-delivery" : "market-delivery";
  const label = tender.procurementType === "WORKS" ? "Mobilization and local delivery" : "Geography, logistics and after-sales";
  const weight = tender.procurementType === "WORKS" ? 15 : 10;
  const claims = records.filter((record) => record.field === "geographic_markets" && usable(record));
  if (!claims.length) return criterion(code, label, weight, null, [], "Supported delivery geography is missing.", ["MARKET_DELIVERY_UNKNOWN"]);
  const text = claims.map((record) => record.value).join(" ").toLowerCase(); const country = tender.country.toLowerCase();
  const fit: MatchCriterion["fitLevel"] = text.includes(country) || text.includes("central asia") ? 5 : /global|asia|international/.test(text) ? 4 : 2;
  return criterion(code, label, weight, fit, claims, "The supplier states a relevant operating geography; logistics and tender-specific delivery feasibility remain unverified.", ["MARKET_REACH_STATED", "DELIVERY_FEASIBILITY_UNVERIFIED"]);
}

export function evaluateExploratoryPair(tender: TenderRecord, supplier: SupplierProfileApiRecord, evidence: SupplierEvidenceApiRecord[], evaluatedAt: string): ExploratoryMatchEvaluation {
  const supplierEvidence = evidence.filter((record) => record.canonicalEntityId === supplier.canonicalEntityId);
  const freshness = deriveTenderFreshness(tender, evaluatedAt); const inScope = IN_SCOPE.has(tender.procurementType ?? ""); const compatible = inScope && tender.procurementType === supplier.classification;
  const roleState: TenderMatchGateState = !inScope ? "NOT_APPLICABLE" : compatible ? "PASS" : "FAIL";
  const blockedBySupplier = supplier.readinessStatus === "exclude_from_current_matching_run";
  const gates: TenderMatchMandatoryGate[] = [
    gate("PROCUREMENT_TYPE_SUPPLIER_ROLE", "Procurement type / supplier role", roleState, !inScope ? "Current Formula v1.1 is limited to GOODS and WORKS notices." : compatible ? `The ${supplier.classification} supplier role matches the ${tender.procurementType} notice.` : `The ${supplier.classification} supplier role does not match the ${tender.procurementType} notice.`),
    gate("EXCLUSION_RESTRICTION", "Exclusion, sanctions, debarment or funding restriction", blockedBySupplier ? "FAIL" : "UNKNOWN", blockedBySupplier ? "The supplier source state excludes this profile from the current run." : "No independent exclusion or sanctions clearance is present in this consumer contract."),
    gate("REQUIRED_LICENSES_CERTIFICATIONS", "Required licenses / certifications", "UNKNOWN", "Tender-specific requirements have not been mapped to supplier evidence."),
    gate("TURNOVER_THRESHOLD", "Turnover threshold", "UNKNOWN", "No reviewed tender-to-supplier turnover comparison is available."),
    gate("COMPARABLE_CONTRACT_THRESHOLD", "Comparable contract threshold", "UNKNOWN", "Comparable contract evidence is unavailable."),
    gate("CAPACITY_THRESHOLD", "Capacity threshold", "UNKNOWN", "Supplier capacity may be stated, but no comparable tender threshold is mapped."),
    gate("LOCAL_REGISTRATION_PARTNER", "Local registration / partner", "UNKNOWN", "Local registration or partner requirements are not established."),
    gate("DELIVERY_MOBILIZATION_IMPOSSIBILITY", "Delivery / mobilization impossibility", "UNKNOWN", "No reviewed evidence establishes delivery feasibility or impossibility."),
  ];
  let technical = { criterion: missingCriterion("technical-relevance", "Product technical fit", 35, "A GOODS or WORKS tender"), matchedConcepts: [] as string[], matchedTerms: [] as string[] };
  let criteria: MatchCriterion[];
  if (inScope && compatible) {
    technical = technicalCriterion(tender, supplierEvidence);
    criteria = tender.procurementType === "WORKS" ? [technical.criterion, missingCriterion("similar-contracts", "Similar contracts and references", 25, "Comparable contract evidence"), capacityCriterion(tender, supplierEvidence), marketCriterion(tender, supplierEvidence), missingCriterion("financial-procurement-readiness", "Financial and procurement readiness", 15, "A tender-specific financial threshold comparison")] : [technical.criterion, capacityCriterion(tender, supplierEvidence), missingCriterion("comparable-experience", "Comparable contract experience", 20, "Comparable contract evidence"), marketCriterion(tender, supplierEvidence), missingCriterion("financial-procurement-readiness", "Financial and procurement readiness", 15, "A tender-specific financial threshold comparison")];
  } else {
    criteria = tender.procurementType === "WORKS" ? [missingCriterion("works-technical-relevance", "Works technical fit", 25, "An applicable supplier role"), missingCriterion("similar-contracts", "Similar contracts and references", 25, "An applicable supplier role"), missingCriterion("personnel-equipment-capacity", "Personnel, equipment and capacity", 20, "An applicable supplier role"), missingCriterion("mobilization-local-delivery", "Mobilization and local delivery", 15, "An applicable supplier role"), missingCriterion("financial-procurement-readiness", "Financial and procurement readiness", 15, "An applicable supplier role")] : [missingCriterion("technical-relevance", "Product technical fit", 35, "An in-scope applicable supplier role"), missingCriterion("capacity-delivery", "Supply capacity and delivery feasibility", 20, "An in-scope applicable supplier role"), missingCriterion("comparable-experience", "Comparable contract experience", 20, "An in-scope applicable supplier role"), missingCriterion("market-delivery", "Geography, logistics and after-sales", 10, "An in-scope applicable supplier role"), missingCriterion("financial-procurement-readiness", "Financial and procurement readiness", 15, "An in-scope applicable supplier role")];
  }
  const assessed = criteria.filter((entry) => entry.fitLevel !== null); const totalWeight = criteria.reduce((sum, entry) => sum + entry.weight, 0); const assessedWeight = assessed.reduce((sum, entry) => sum + entry.weight, 0);
  const dataCoverage = Math.round(100 * assessedWeight / totalWeight);
  const weightedFitSum = assessed.reduce((sum, entry) => sum + (entry.fitLevel ?? 0) * entry.weight, 0);
  const assessedFitScore = assessedWeight > 0 ? Math.round(100 * weightedFitSum / (5 * assessedWeight)) : 0;
  const value = totalWeight > 0 ? Math.round(100 * weightedFitSum / (5 * totalWeight)) : 0;
  const evidenceConfidence = assessedWeight ? Math.round(assessed.reduce((sum, entry) => sum + (entry.evidenceConfidence ?? 0) * entry.weight, 0) / assessedWeight) : 0;
  const failedGates = gates.filter((entry) => entry.state === "FAIL");
  const pairStatus: TenderMatchPairStatus = "UNASSESSED";
  const mainReason = !inScope ? "CURRENT_SCOPE_GOODS_WORKS_ONLY" : failedGates.length ? failedGates[0].code : assessedWeight === 0 ? "NO_SUPPORTED_CRITERION_POINTS" : "SCORING_ONLY_NO_MATCH_THRESHOLD";
  const blockers = failedGates.map((entry) => `${entry.code}: ${entry.rationale}`); const missingInputs = criteria.filter((entry) => entry.fitLevel === null).map((entry) => entry.label); const evidenceIds = [...new Set(criteria.flatMap((entry) => entry.evidenceIds))].sort();
  const reasonCodes = [...new Set([mainReason, ...criteria.flatMap((entry) => entry.reasonCodes), ...gates.filter((entry) => entry.state === "UNKNOWN").map((entry) => `${entry.code}_UNKNOWN`), ...(freshness.status === "closed" ? ["TENDER_NOT_CURRENT"] : [])])];
  const capacity = criteria.find((entry) => entry.code === "capacity-delivery" || entry.code === "personnel-equipment-capacity"); const market = criteria.find((entry) => entry.code === "market-delivery" || entry.code === "mobilization-local-delivery"); const turnoverClaims = supplierEvidence.filter((record) => record.field === "financial" && usable(record));
  return {
    id: `evaluation:TM:${stableIdPart(tender.id)}:${supplier.canonicalEntityId}`, key: `${tender.id}::supplier:NEON:${supplier.canonicalEntityId}`, tenderId: tender.id, tenderReference: tender.reference, tenderSnapshotId: tender.snapshotId, tenderVersion: tender.version,
    supplierId: `supplier:NEON:${supplier.canonicalEntityId}`, supplierProfileVersionId: supplier.profileVersionId, supplierProfileVersion: supplier.profileVersion, supplierBatchCode: supplier.batchCode,
    engineVersion: TENDERMATCH_EXPLORATORY_ENGINE_VERSION, policyVersion: TENDERMATCH_EXPLORATORY_POLICY_VERSION, evaluatedAt, value, valueClass: "ESTIMATED", label: "Coverage-adjusted pair score", pairStatus, assessedFitScore, dataCoverage, evidenceConfidence,
    criteria, mandatoryGates: gates, mainReason, reasonCodes, blockers, missingInputs, evidenceIds,
    technicalRelevance: { value: technical.criterion.fitLevel === null ? null : technical.criterion.fitLevel * 20, fitLevel: technical.criterion.fitLevel, matchedConcepts: technical.matchedConcepts, matchedTerms: technical.matchedTerms, evidenceIds: technical.criterion.evidenceIds, reasonCodes: technical.criterion.reasonCodes },
    procurementApplicability: { supplierClassification: supplier.classification, tenderProcurementType: tender.procurementType ?? "UNKNOWN", compatible },
    marketDelivery: { value: market?.fitLevel === null || market?.fitLevel === undefined ? null : market.fitLevel * 20, state: market?.fitLevel === null || market?.fitLevel === undefined ? "unknown" : "supported", evidenceIds: market?.evidenceIds ?? [], reasonCodes: market?.reasonCodes ?? [] },
    capacity: { value: capacity?.fitLevel === null || capacity?.fitLevel === undefined ? null : capacity.fitLevel * 20, state: capacity?.fitLevel === null || capacity?.fitLevel === undefined ? "unknown" : "stated-unverified", evidenceIds: capacity?.evidenceIds ?? [], usedInTechnicalFit: false },
    turnover: { value: null, state: turnoverClaims.length ? "stated-unverified" : "unknown", evidenceIds: turnoverClaims.map((record) => record.claimId).sort(), usedInTechnicalFit: false },
    evidenceCoverage: { cited: evidenceIds.length, availableArtifacts: supplierEvidence.filter((record) => evidenceIds.includes(record.claimId) && record.artifactAvailable).length, unavailableArtifacts: supplierEvidence.filter((record) => evidenceIds.includes(record.claimId) && !record.artifactAvailable).length },
    supplierReadinessStatus: supplier.readinessStatus, verificationStatus: "under_review", eligibility: failedGates.length ? "blocked" : "unknown", compliance: "unknown", references: "unknown", freshness,
    limitations: ["The numeric result is a pair score only; it does not define a Match, legal eligibility, winner prediction, or Bid/No-Bid decision.", "The supplier batch contains zero VERIFIED claims. STATED_UNVERIFIED and INFERRED classes remain explicit.", "The score uses the fixed 100-point criterion denominator. Unsupported criteria earn zero score points while remaining MISSING in the criterion audit; Data Coverage reports the missing evidence separately.", "Supplier readiness, mandatory gates, deadline urgency and consultant disposition remain separate and never suppress or add score points."], consultantDecision: "pending",
  };
}

export function buildExploratoryEvaluationInventory(tenders: TenderRecord[], suppliers: SupplierProfileApiRecord[], evidence: SupplierEvidenceApiRecord[], evaluatedAt: string) { return tenders.flatMap((tender) => suppliers.map((supplier) => evaluateExploratoryPair(tender, supplier, evidence, evaluatedAt))).sort((left, right) => left.key.localeCompare(right.key)); }
export function summarizeExploratoryEvaluations(evaluations: ExploratoryMatchEvaluation[]): ExploratoryEvaluationSummary {
  const statuses: TenderMatchPairStatus[] = ["BINGO_MATCH", "STRONG_CANDIDATE", "POTENTIAL_MATCH", "NEEDS_VERIFICATION", "NO_MATCH", "BLOCKED_INELIGIBLE", "UNASSESSED"]; const byStatus = Object.fromEntries(statuses.map((status) => [status, 0])) as Record<TenderMatchPairStatus, number>; const byReason: Record<string, number> = {};
  for (const evaluation of evaluations) { byStatus[evaluation.pairStatus] += 1; for (const reason of evaluation.reasonCodes) byReason[reason] = (byReason[reason] ?? 0) + 1; }
  return { total: evaluations.length, numeric: evaluations.filter((entry) => entry.value !== null).length, missing: evaluations.filter((entry) => entry.value === null).length, byStatus, byReason, engineVersion: TENDERMATCH_EXPLORATORY_ENGINE_VERSION, policyVersion: TENDERMATCH_EXPLORATORY_POLICY_VERSION, evaluatedAt: evaluations[0]?.evaluatedAt ?? "" };
}

export function assessmentFromExploratoryEvaluation(evaluation: ExploratoryMatchEvaluation): MatchAssessment {
  const technical = evaluation.criteria.find((entry) => entry.code === "technical-relevance" || entry.code === "works-technical-relevance");
  return {
    id: evaluation.id.replace("evaluation:", "match:"), version: "v1", key: evaluation.key, tenderId: evaluation.tenderId, supplierId: evaluation.supplierId, exactLegacyPair: false,
    matchScore: { value: null, valueClass: "MISSING", method: "No historical or source-authored pair score exists for this supplier and tender." }, legacyBaseline: { policyVersion: "not-applicable/neon-supplier-v1.3", matchScore: null, supplierReadiness: null, globalVerificationQuality: 0, method: "Legacy fixture metrics are not applied to Neon supplier identities." },
    auditedMatch: { engineVersion: evaluation.engineVersion, policyVersion: evaluation.policyVersion, value: evaluation.value, valueClass: evaluation.valueClass, label: "exploratory-technical-fit", components: evaluation.criteria.map((entry) => ({ ...entry, value: entry.fitLevel === null ? null : entry.fitLevel * 20 })), evidenceIds: evaluation.evidenceIds, reasonCodes: evaluation.reasonCodes, missingInputs: evaluation.missingInputs, legacyScore: null, legacyDelta: null, method: `Formula v1.1: coverage-adjusted weighted fit over the fixed 100-point criterion denominator. Assessed-only fit is ${evaluation.assessedFitScore}; Data Coverage is ${evaluation.dataCoverage}%. Missing criterion evidence remains MISSING and contributes zero score points. Mandatory gates remain separate.`, status: evaluation.pairStatus, assessedFitScore: evaluation.assessedFitScore, dataCoverage: evaluation.dataCoverage, evidenceConfidence: evaluation.evidenceConfidence, gates: evaluation.mandatoryGates, mainReason: evaluation.mainReason, blockers: evaluation.blockers, noticeLabel: evaluation.label },
    supplierReadiness: { value: null, valueClass: "MISSING", method: "Supplier readiness is a source state and never contributes Match Score points.", status: evaluation.supplierReadinessStatus },
    verificationQuality: { value: evaluation.evidenceConfidence || null, valueClass: evaluation.evidenceConfidence ? "CALCULATED" : "MISSING", policyVersion: evaluation.policyVersion, evidenceIds: evaluation.evidenceIds, reasonCodes: evaluation.evidenceConfidence ? [] : ["PAIR_RELEVANT_EVIDENCE_MISSING"], method: "Weight-adjusted confidence of evidence used by assessed criteria; distinct from supplier readiness and Data Coverage." },
    deadlineUrgency: calculateDeadlineUrgency(evaluation.freshness), consultantDecision: evaluation.consultantDecision, decisionHistory: [],
    linkedStrengths: technical && technical.fitLevel !== null && technical.fitLevel > 0 ? [{ id: `${evaluation.id}:technical-support`, text: technical.rationale, evidenceIds: technical.evidenceIds.map((id) => `evidence:NEON:${id}`), linkage: "lexical" }] : [], inferredStrengths: [], unsupportedStrengths: [], gaps: [...evaluation.blockers, ...evaluation.missingInputs],
    trust: { recognition: "high", structural: "high", semantic: evaluation.value === null ? "low" : "medium", arithmeticDomain: evaluation.value === null ? "low" : "medium", humanReview: "unknown" }, tenderFreshness: evaluation.freshness,
  };
}

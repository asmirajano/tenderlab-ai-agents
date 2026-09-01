import {
  TENDERMATCH_AUDITED_MATCH_POLICY_VERSION,
  TENDERMATCH_DEADLINE_CONTEXT_POLICY_VERSION,
  TENDERMATCH_ENGINE_VERSION,
  TENDERMATCH_SCHEMA_VERSION,
  TENDERBOOST_DEMO_SNAPSHOT_ID,
  TENDERBOOST_LEGACY_BASELINE_POLICY_VERSION,
  TENDERBOOST_LEGACY_SCHEMA_VERSION,
  TENDERBOOST_STAGE_2_SCHEMA_VERSION,
  type AuditedComponentCode,
  type AuditedMatchResult,
  type AuditedPairEvidenceMapping,
  type AuditedReasonCode,
  type AuditedScoreComponent,
  type ConsultantDecision,
  type ConsultantReviewSupport,
  type EvidenceLinkedClaim,
  type MatchAssessment,
  type MatchDecisionRecord,
  type ReviewFinding,
  type StorageLike,
  type SupplierRecord,
  type TenderFreshness,
  type TenderMatchCaseResult,
  type TenderRecord,
  type VersionedIdentity,
} from "./types.ts";
import { auditedDemoPairMappingByKey } from "./experiment-data.ts";

const DAY_MS = 86_400_000;
const STOP_WORDS = new Set(["and", "the", "for", "with", "from", "has", "have", "company", "supplier", "tender", "verified"]);

function slug(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 96);
}

function tokens(value: string) {
  return new Set(value.toLowerCase().split(/[^a-z0-9]+/).filter((token) => token.length > 2 && !STOP_WORDS.has(token)));
}

function overlap(left: Set<string>, right: Set<string>) {
  let score = 0;
  for (const token of left) if (right.has(token)) score += 1;
  return score;
}

function isMaterialRisk(supplier: SupplierRecord) {
  return supplier.risks.some((risk) => /debar|exclusion|entity list|sanction|fraud|corrupt/i.test(risk));
}

function revisionNumber(result: TenderMatchCaseResult) {
  const parsed = Number(result.resultIdentity.version.replace(/^v/, ""));
  return Number.isFinite(parsed) ? parsed : 1;
}

function nextVersion(version: string | undefined) {
  const parsed = Number((version ?? "v1").replace(/^v/, ""));
  return `v${Number.isFinite(parsed) ? parsed + 1 : 2}`;
}

export function deriveTenderFreshness(tender: TenderRecord, nowIso: string): TenderFreshness {
  const now = new Date(nowIso).getTime();
  const deadline = new Date(tender.deadlineAt).getTime();
  const snapshot = new Date(tender.snapshotAsOf).getTime();
  if (![now, deadline, snapshot].every(Number.isFinite)) throw new Error("Tender freshness requires valid absolute dates.");
  const difference = deadline - now;
  // Deadlines are stored as end-of-day instants. Floor preserves the frozen
  // source's whole-calendar-day baseline while keeping freshness clock-derived.
  const daysRemaining = difference <= 0 ? 0 : Math.floor(difference / DAY_MS);
  const snapshotAgeDays = Math.max(0, Math.floor((now - snapshot) / DAY_MS));
  return {
    status: difference <= 0 ? "closed" : daysRemaining <= 7 ? "urgent" : "open",
    freshness: snapshotAgeDays <= 1 ? "current" : snapshotAgeDays <= 7 ? "aging" : "stale",
    daysRemaining,
    snapshotAgeDays,
    deadlineAt: tender.deadlineAt,
  };
}

function linkLegacyStrengths(supplier: SupplierRecord, strengths: string[]) {
  const linked: EvidenceLinkedClaim[] = [];
  const unsupported: string[] = [];
  for (const strength of strengths) {
    const strengthTokens = tokens(strength);
    const candidates = supplier.evidence
      .map((evidence) => ({ evidence, score: overlap(strengthTokens, tokens(`${evidence.field} ${evidence.value} ${evidence.notes}`)) }))
      .filter(({ evidence, score }) => score > 0 && evidence.reviewStatus === "LEGACY_VERIFIED")
      .sort((left, right) => right.score - left.score || left.evidence.id.localeCompare(right.evidence.id));
    if (!candidates.length) {
      unsupported.push(strength);
      continue;
    }
    const bestScore = candidates[0].score;
    linked.push({
      id: `claim:TM:${supplier.id.split(":").at(-1)}:${slug(strength)}`,
      text: strength,
      evidenceIds: candidates.filter((candidate) => candidate.score === bestScore).slice(0, 2).map((candidate) => candidate.evidence.id),
      linkage: "lexical",
    });
  }
  return { linked, unsupported };
}

function legacyVerificationQuality(supplier: SupplierRecord) {
  if (!supplier.evidence.length) return 0;
  const legacyVerified = supplier.evidence.filter((item) => item.reviewStatus === "LEGACY_VERIFIED").length;
  const inferred = supplier.evidence.filter((item) => item.reviewStatus === "INFERRED").length;
  return Math.round(((legacyVerified + inferred * 0.35) / supplier.evidence.length) * 100);
}

const AUDITED_COMPONENT_WEIGHTS: Record<AuditedComponentCode, number> = {
  "technical-relevance": 0.7,
  "market-delivery": 0.3,
};

const AUDITED_COMPONENT_MISSING: Record<AuditedComponentCode, { reason: AuditedReasonCode; input: string }> = {
  "technical-relevance": { reason: "TECHNICAL_EVIDENCE_MISSING", input: "Distinct reviewed evidence for technical relevance" },
  "market-delivery": { reason: "MARKET_EVIDENCE_MISSING", input: "Distinct reviewed evidence for market or delivery relevance" },
};

function mean(values: number[]) {
  return values.length ? Math.round(values.reduce((sum, value) => sum + value, 0) / values.length) : null;
}

function missingComponent(code: AuditedComponentCode, rationale: string, reasonCodes: AuditedReasonCode[] = [AUDITED_COMPONENT_MISSING[code].reason]): AuditedScoreComponent {
  return {
    code,
    value: null,
    valueClass: "MISSING",
    weight: AUDITED_COMPONENT_WEIGHTS[code],
    evidenceIds: [],
    evidenceConfidence: null,
    reasonCodes,
    rationale,
  };
}

function evaluateAssignment(code: AuditedComponentCode, mapping: AuditedPairEvidenceMapping | undefined, supplier: SupplierRecord): AuditedScoreComponent {
  const assignment = mapping?.assignments.find((item) => item.component === code);
  if (!assignment) return missingComponent(code, AUDITED_COMPONENT_MISSING[code].input);
  const records = assignment.evidenceIds.map((id) => supplier.evidence.find((item) => item.id === id));
  const reasons: AuditedReasonCode[] = [];
  if (records.some((record) => !record)) reasons.push("EVIDENCE_RECORD_NOT_FOUND");
  if (records.some((record) => record && !["LEGACY_VERIFIED", "REVIEWED"].includes(record.reviewStatus))) reasons.push("EVIDENCE_NOT_VERIFIED");
  if (records.some((record) => record && record.confidence < 75)) reasons.push("EVIDENCE_CONFIDENCE_BELOW_THRESHOLD");
  if (reasons.length) return missingComponent(code, assignment.rationale, reasons);
  const validRecords = records.filter((record): record is NonNullable<typeof record> => Boolean(record));
  return {
    code,
    value: assignment.semanticBand,
    valueClass: "ESTIMATED",
    weight: AUDITED_COMPONENT_WEIGHTS[code],
    evidenceIds: validRecords.map((record) => record.id),
    evidenceConfidence: mean(validRecords.map((record) => record.confidence)),
    reasonCodes: [],
    rationale: assignment.rationale,
  };
}

export function evaluateAuditedMatch(
  tender: TenderRecord,
  supplier: SupplierRecord,
  legacyScore: number | null,
  mapping: AuditedPairEvidenceMapping | undefined = auditedDemoPairMappingByKey.get(`${tender.reference}::${supplier.id}`),
): AuditedMatchResult {
  if (legacyScore === null) {
    return {
      engineVersion: TENDERMATCH_ENGINE_VERSION,
      policyVersion: TENDERMATCH_AUDITED_MATCH_POLICY_VERSION,
      value: null,
      valueClass: "MISSING",
      label: "insufficient-evidence",
      components: [
        missingComponent("technical-relevance", "The Company × Tender pair was not assessed in the frozen fixture."),
        missingComponent("market-delivery", "The Company × Tender pair was not assessed in the frozen fixture."),
      ],
      evidenceIds: [],
      reasonCodes: ["PAIR_UNASSESSED"],
      missingInputs: ["A reviewed Company × Tender assessment"],
      legacyScore: null,
      legacyDelta: null,
      method: "No audited score is calculated for an unassessed pair; MISSING is not zero.",
    };
  }

  let components = (["technical-relevance", "market-delivery"] as AuditedComponentCode[]).map((code) => evaluateAssignment(code, mapping, supplier));
  const used = new Set<string>();
  const reused = new Set<string>();
  for (const component of components) {
    for (const id of component.evidenceIds) {
      if (used.has(id)) reused.add(id);
      used.add(id);
    }
  }
  if (reused.size) {
    components = components.map((component) => component.evidenceIds.some((id) => reused.has(id))
      ? missingComponent(component.code, component.rationale, ["EVIDENCE_RECORD_REUSED"])
      : component);
  }

  const missingInputs = components.filter((component) => component.value === null).map((component) => AUDITED_COMPONENT_MISSING[component.code].input);
  const componentReasons = components.flatMap((component) => component.reasonCodes);
  const value = missingInputs.length === 0
    ? Math.round(components.reduce((sum, component) => sum + (component.value ?? 0) * component.weight, 0))
    : null;
  const evidenceIds = [...new Set(components.flatMap((component) => component.evidenceIds))];
  return {
    engineVersion: TENDERMATCH_ENGINE_VERSION,
    policyVersion: TENDERMATCH_AUDITED_MATCH_POLICY_VERSION,
    value,
    valueClass: value === null ? "MISSING" : "ESTIMATED",
    label: value === null ? "insufficient-evidence" : value >= 85 ? "strong" : value >= 70 ? "review" : "weak",
    components,
    evidenceIds,
    reasonCodes: value === null ? [...new Set(componentReasons)] : ["AUDITED_MATCH_AVAILABLE", "LEGACY_SCORE_NOT_REPRODUCED"],
    missingInputs,
    legacyScore,
    legacyDelta: value === null ? null : value - legacyScore,
    method: "Audited semantic bands: technical relevance 70% + market/delivery relevance 30%; both require distinct reviewed evidence records.",
  };
}

export function calculateDeadlineUrgency(freshness: TenderFreshness) {
  if (freshness.status === "closed") {
    return {
      value: null,
      valueClass: "MISSING" as const,
      policyVersion: TENDERMATCH_DEADLINE_CONTEXT_POLICY_VERSION,
      evidenceIds: [],
      reasonCodes: ["TENDER_CLOSED"],
      method: "Closed tenders have no current deadline-urgency value.",
    };
  }
  return {
    value: Math.max(25, Math.min(100, Math.round(102.5 - freshness.daysRemaining * 2.5))),
    valueClass: "CALCULATED" as const,
    policyVersion: TENDERMATCH_DEADLINE_CONTEXT_POLICY_VERSION,
    evidenceIds: [],
    reasonCodes: [],
    method: "Monotonic review context: 100 at one day, declining 2.5 points per additional day, floored at 25. It does not change Match Support.",
  };
}

function auditedVerificationQuality(audited: AuditedMatchResult) {
  const usableComponents = audited.components.filter((component) => component.evidenceConfidence !== null);
  const evidenceIds = [...new Set(usableComponents.flatMap((component) => component.evidenceIds))];
  const value = mean(usableComponents.map((component) => component.evidenceConfidence as number));
  return {
    value,
    valueClass: value === null ? "MISSING" as const : "CALCULATED" as const,
    policyVersion: TENDERMATCH_AUDITED_MATCH_POLICY_VERSION,
    evidenceIds,
    reasonCodes: value === null ? ["PAIR_RELEVANT_EVIDENCE_MISSING"] : [],
    method: "Mean confidence of distinct evidence records accepted for the audited pair components; not global supplier coverage.",
  };
}

export function assessMatch(tender: TenderRecord, supplier: SupplierRecord, nowIso: string, decision: ConsultantDecision = "pending"): MatchAssessment {
  const legacy = tender.snapshotId === TENDERBOOST_DEMO_SNAPSHOT_ID
    ? supplier.legacyTenderMatches.find((item) => item.tenderReference === tender.reference)
    : undefined;
  const freshness = deriveTenderFreshness(tender, nowIso);
  const globalLegacyQuality = legacyVerificationQuality(supplier);
  const { linked, unsupported } = linkLegacyStrengths(supplier, legacy?.verifiedStrengths ?? []);
  const score = legacy?.score ?? null;
  const auditedMatch = evaluateAuditedMatch(tender, supplier, score);
  return {
    id: `match:TM:${slug(tender.reference)}:${slug(supplier.id)}`,
    version: "v1",
    key: `${tender.reference}::${supplier.id}`,
    tenderId: tender.id,
    supplierId: supplier.id,
    exactLegacyPair: Boolean(legacy),
    matchScore: {
      value: score,
      valueClass: legacy ? "ESTIMATED" : "MISSING",
      method: legacy ? "legacy TenderBoost curated pair score; formula not independently revalidated" : "pair has not been evaluated; MISSING is not zero",
    },
    legacyBaseline: {
      policyVersion: TENDERBOOST_LEGACY_BASELINE_POLICY_VERSION,
      matchScore: score,
      supplierReadiness: supplier.readiness.value,
      globalVerificationQuality: globalLegacyQuality,
      method: "Frozen source metrics retained for historical comparison only; they do not determine the audited result.",
    },
    auditedMatch,
    supplierReadiness: supplier.readiness,
    verificationQuality: auditedVerificationQuality(auditedMatch),
    deadlineUrgency: calculateDeadlineUrgency(freshness),
    consultantDecision: decision,
    decisionHistory: [],
    linkedStrengths: linked,
    inferredStrengths: legacy?.inferredStrengths ?? [],
    unsupportedStrengths: unsupported,
    gaps: [...(legacy?.qualificationGaps ?? []), ...(legacy?.unknowns ?? []), ...unsupported.map((item) => `Unlinked legacy claim: ${item}`)],
    trust: {
      recognition: "high",
      structural: "high",
      semantic: legacy ? "medium" : "low",
      arithmeticDomain: "low",
      humanReview: decision === "pending" ? "unknown" : "medium",
    },
    tenderFreshness: freshness,
  };
}

function finding(code: ReviewFinding["code"], message: string, nextAction: string, ownerAgentId: string): ReviewFinding {
  return { code, message, nextAction, ownerAgentId };
}

export function evaluateConsultantReviewSupport(match: MatchAssessment, supplier: SupplierRecord): ConsultantReviewSupport {
  const findings: ReviewFinding[] = [];
  const exploratory = match.auditedMatch.policyVersion.startsWith("tendermatch-evidence-overlap/");
  if ((!match.exactLegacyPair || match.matchScore.value === null) && !exploratory) {
    findings.push(finding("MATCH_UNASSESSED", "This Company × Tender pair has not been evaluated.", "Run a separately approved pair assessment; do not convert MISSING to zero.", "agent:TL-A031"));
  } else if (match.auditedMatch.value === null) {
    findings.push(finding("AUDITED_MATCH_REQUIRED", "The audited calculation lacks one or more required evidence components.", `Resolve: ${match.auditedMatch.missingInputs.join("; ")}.`, "agent:TL-A031"));
  }
  if (match.tenderFreshness.status === "closed") {
    findings.push(finding("TENDER_CLOSED", "The tender deadline has passed.", "Confirm the current notice state through the deadline-monitoring handoff.", "agent:TL-A017"));
  }
  if (match.tenderFreshness.freshness === "stale") {
    findings.push(finding("SNAPSHOT_STALE", "The demonstration tender snapshot is stale.", "Refresh the tender record from an authorized source before making a current decision.", "agent:TL-A017"));
  }
  if (isMaterialRisk(supplier)) {
    findings.push(finding("MATERIAL_RISK_HANDOFF", "A material integrity or compliance signal requires separate review.", "Send the signal to the Risk & Integrity Agent; TenderMatch does not resolve it.", "agent:TL-A038"));
  }
  const currentReviewedEvidence = match.auditedMatch.evidenceIds.some((id) => supplier.evidence.find((item) => item.id === id)?.reviewStatus === "REVIEWED");
  if (match.auditedMatch.evidenceIds.length > 0 && !currentReviewedEvidence) {
    findings.push(finding("EVIDENCE_REFRESH_REQUIRED", "The accepted experiment records are legacy-reviewed rather than current reviewed evidence.", "Refresh claim-level evidence and provenance before treating the result as current.", "agent:TL-A003"));
  }
  return { readyForCurrentDecision: findings.length === 0, findings };
}

export function buildAllMatches(tenders: TenderRecord[], suppliers: SupplierRecord[], nowIso: string) {
  return tenders
    .flatMap((tender) => suppliers.map((supplier) => assessMatch(tender, supplier, nowIso)))
    .sort((left, right) => ((right.auditedMatch.value ?? -1) - (left.auditedMatch.value ?? -1)) || ((right.matchScore.value ?? -1) - (left.matchScore.value ?? -1)) || left.key.localeCompare(right.key));
}

function identities(caseId: string, resultVersion: number) {
  const version = `v${resultVersion}`;
  return {
    version,
    artifacts: [{ id: `artifact:TM:${slug(caseId)}:case-json`, version }],
  };
}

function reviseResult(result: TenderMatchCaseResult, changes: Partial<TenderMatchCaseResult>, nowIso: string): TenderMatchCaseResult {
  const nextRevision = revisionNumber(result) + 1;
  const { version, artifacts } = identities(result.caseIdentity.id, nextRevision);
  const merged = { ...result, ...changes };
  return {
    ...merged,
    schemaVersion: TENDERMATCH_SCHEMA_VERSION,
    engineVersion: TENDERMATCH_ENGINE_VERSION,
    caseIdentity: { ...merged.caseIdentity, version },
    resultIdentity: { id: `result:TM:${slug(merged.caseIdentity.id)}:${version}`, version },
    artifactIdentities: artifacts,
    updatedAt: nowIso,
  };
}

export function createCaseResult(caseId: string, tender: TenderRecord, supplier: SupplierRecord, nowIso: string, assessment?: MatchAssessment): TenderMatchCaseResult {
  if (!caseId.trim()) throw new Error("An explicit Case ID is required.");
  const match = assessment ?? assessMatch(tender, supplier, nowIso);
  const { version, artifacts } = identities(caseId, 1);
  return {
    schemaVersion: TENDERMATCH_SCHEMA_VERSION,
    engineVersion: TENDERMATCH_ENGINE_VERSION,
    caseIdentity: { id: caseId, version },
    resultIdentity: { id: `result:TM:${slug(caseId)}:${version}`, version },
    tenderIdentity: { id: tender.id, version: tender.version },
    supplierIdentity: { id: supplier.id, version: supplier.version },
    evidenceSnapshotIdentity: { id: tender.snapshotId, version: tender.snapshotAsOf },
    decisionIdentity: { id: `match-decision:TM:${slug(caseId)}:pending`, version: "v1" },
    artifactIdentities: artifacts,
    createdAt: nowIso,
    updatedAt: nowIso,
    workflowState: "preliminary",
    match,
    reviewSupport: evaluateConsultantReviewSupport(match, supplier),
    knownLimitations: [
      "The tender set is a deterministic local snapshot of records current at extraction time, not a live browser connection or continuously refreshed feed.",
      "Exploratory technical relevance is emitted only when the versioned evidence-overlap threshold is met; every other completed evaluation remains MISSING.",
      "Supplier readiness is retained as a source state and never creates or changes a Match Score.",
      "This supplier batch contains zero VERIFIED claims. INFERRED and UNKNOWN statuses remain explicit.",
      "Browser-local Case storage is not durable tenant-isolated persistence or a canonical Dataset write.",
      "TenderMatch provides fit explanation and consultant decision support only; Bid/No-Bid and participation design remain downstream responsibilities.",
      "Tender markers use honest country-level placement only; they do not represent a precise tender location, distance, routing, or live map accuracy.",
    ],
    migration: {
      status: "native-current",
      fromSchemaVersion: null,
      sourceProductName: null,
      migratedAt: null,
      note: "Created under the current TenderMatch matching-only schema.",
    },
  };
}

export function setConsultantDecision(
  result: TenderMatchCaseResult,
  decision: ConsultantDecision,
  nowIso: string,
  provenance: { actorId: string; rationale: string },
) {
  if (!provenance.actorId.trim() || !provenance.rationale.trim()) throw new Error("Match decision provenance requires an actor and rationale.");
  const sequence = result.match.decisionHistory.length + 1;
  const decisionRecord: MatchDecisionRecord = {
    id: `match-decision:TM:${slug(result.caseIdentity.id)}:${sequence}`,
    version: "v1",
    decision,
    actorId: provenance.actorId,
    decidedAt: nowIso,
    rationale: provenance.rationale,
    sourceRole: "USER_ASSERTION",
    valueClass: "SOURCE",
  };
  const match: MatchAssessment = {
    ...result.match,
    version: nextVersion(result.match.version),
    consultantDecision: decision,
    decisionHistory: [...result.match.decisionHistory, decisionRecord],
    trust: { ...result.match.trust, humanReview: decision === "pending" ? "unknown" : "medium" },
  };
  return reviseResult(result, {
    match,
    decisionIdentity: decisionRecord,
    workflowState: decision === "pending" ? "preliminary" : "reviewed",
  }, nowIso);
}

function currentStorageKey(caseId: string) {
  if (!caseId.trim()) throw new Error("An explicit Case ID is required.");
  return `tenderapps:tendermatch:case:${encodeURIComponent(caseId)}`;
}

function legacyStorageKey(caseId: string) {
  return `tenderapps:tenderboost:case:${encodeURIComponent(caseId)}`;
}

export function saveCaseResult(storage: StorageLike, result: TenderMatchCaseResult) {
  storage.setItem(currentStorageKey(result.caseIdentity.id), JSON.stringify(result));
  return result.caseIdentity.id;
}

export function resumeCaseResult(result: TenderMatchCaseResult, tender: TenderRecord, supplier: SupplierRecord, nowIso: string, assessment?: MatchAssessment) {
  if (result.tenderIdentity.id !== tender.id || result.supplierIdentity.id !== supplier.id) throw new Error("Resume context does not match the persisted TenderMatch Case identities.");
  const reassessed = assessment
    ? { ...assessment, consultantDecision: result.match.consultantDecision, decisionHistory: result.match.decisionHistory ?? [] }
    : assessMatch(tender, supplier, nowIso, result.match.consultantDecision);
  const match: MatchAssessment = {
    ...reassessed,
    version: nextVersion(result.match.version),
    consultantDecision: result.match.consultantDecision,
    decisionHistory: result.match.decisionHistory ?? [],
  };
  return reviseResult(result, { match, reviewSupport: evaluateConsultantReviewSupport(match, supplier) }, nowIso);
}

type HistoricalPersistedCase = {
  schemaVersion: string;
  caseIdentity?: VersionedIdentity;
  tenderIdentity?: VersionedIdentity;
  supplierIdentity?: VersionedIdentity;
  createdAt?: string;
  match?: Partial<MatchAssessment> & { consultantDecision?: ConsultantDecision; decisionHistory?: MatchDecisionRecord[] };
};

function migrateHistoricalCase(parsed: HistoricalPersistedCase, caseId: string, tender: TenderRecord, supplier: SupplierRecord, nowIso: string): TenderMatchCaseResult {
  if (parsed.caseIdentity?.id !== caseId) throw new Error("Persisted Case identity does not match the requested Case.");
  if (parsed.tenderIdentity?.id !== tender.id || parsed.supplierIdentity?.id !== supplier.id) throw new Error("Historical Case context does not match the supplied TenderMatch identities.");
  const decision = ["pending", "approved", "hold", "rejected"].includes(parsed.match?.consultantDecision ?? "")
    ? parsed.match?.consultantDecision as ConsultantDecision
    : "pending";
  const history = Array.isArray(parsed.match?.decisionHistory) ? parsed.match.decisionHistory : [];
  const migrated = createCaseResult(caseId, tender, supplier, nowIso);
  const match = {
    ...migrated.match,
    version: nextVersion(parsed.match?.version),
    consultantDecision: decision,
    decisionHistory: history,
    trust: { ...migrated.match.trust, humanReview: decision === "pending" ? "unknown" as const : "medium" as const },
  };
  const caseVersion = nextVersion(parsed.caseIdentity.version);
  return {
    ...migrated,
    caseIdentity: { id: caseId, version: caseVersion },
    resultIdentity: { id: `result:TM:${slug(caseId)}:${caseVersion}`, version: caseVersion },
    artifactIdentities: [{ id: `artifact:TM:${slug(caseId)}:case-json`, version: caseVersion }],
    decisionIdentity: history.at(-1) ?? migrated.decisionIdentity,
    createdAt: parsed.createdAt ?? nowIso,
    workflowState: decision === "pending" ? "preliminary" : "reviewed",
    match,
    reviewSupport: evaluateConsultantReviewSupport(match, supplier),
    migration: {
      status: "compatible-historical",
      fromSchemaVersion: parsed.schemaVersion,
      sourceProductName: "TenderBoost AI",
      migratedAt: nowIso,
      note: "Matching values and consultant-decision provenance were retained. Fields outside the audited TL-A031 matching contract were not imported; the original browser record remains under its legacy key.",
    },
  };
}

export function loadCaseResult(
  storage: StorageLike,
  caseId: string,
  context: { tender: TenderRecord; supplier: SupplierRecord; nowIso: string; assessment?: MatchAssessment },
): TenderMatchCaseResult | null {
  const currentRaw = storage.getItem(currentStorageKey(caseId));
  const legacyRaw = currentRaw ? null : storage.getItem(legacyStorageKey(caseId));
  const raw = currentRaw ?? legacyRaw;
  if (!raw) return null;
  const parsed = JSON.parse(raw) as HistoricalPersistedCase;
  if (parsed.caseIdentity?.id !== caseId) throw new Error("Persisted Case identity does not match the requested Case.");
  if (parsed.schemaVersion === TENDERMATCH_SCHEMA_VERSION) {
    return resumeCaseResult(parsed as TenderMatchCaseResult, context.tender, context.supplier, context.nowIso, context.assessment);
  }
  if (parsed.schemaVersion === TENDERBOOST_LEGACY_SCHEMA_VERSION || parsed.schemaVersion === TENDERBOOST_STAGE_2_SCHEMA_VERSION) {
    return migrateHistoricalCase(parsed, caseId, context.tender, context.supplier, context.nowIso);
  }
  throw new Error(`TenderMatch Case schema ${parsed.schemaVersion} is unsupported and requires an explicit migration.`);
}

export function removeCaseResult(storage: StorageLike, caseId: string) {
  storage.removeItem(currentStorageKey(caseId));
}

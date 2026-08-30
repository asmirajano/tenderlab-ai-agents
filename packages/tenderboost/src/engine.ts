import {
  TENDERBOOST_AUDITED_MATCH_POLICY_VERSION,
  TENDERBOOST_CAMPAIGN_PRIORITY_POLICY_VERSION,
  TENDERBOOST_DEMO_AS_OF,
  TENDERBOOST_DEMO_SNAPSHOT_ID,
  TENDERBOOST_ENGINE_VERSION,
  TENDERBOOST_LEGACY_BASELINE_POLICY_VERSION,
  TENDERBOOST_LEGACY_SCHEMA_VERSION,
  TENDERBOOST_SCHEMA_VERSION,
  type AuditedComponentCode,
  type AuditedMatchResult,
  type AuditedPairEvidenceMapping,
  type AuditedReasonCode,
  type AuditedScoreComponent,
  type CampaignBlocker,
  type CampaignChannel,
  type CampaignDraft,
  type CampaignEligibility,
  type CampaignEvent,
  type CampaignEventType,
  type CampaignLifecycle,
  type CampaignObjective,
  type ConsultantDecision,
  type EvidenceLinkedClaim,
  type MatchAssessment,
  type StorageLike,
  type SupplierRecord,
  type TenderBoostCaseResult,
  type TenderFreshness,
  type TenderRecord,
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

function revisionNumber(result: TenderBoostCaseResult) {
  const parsed = Number(result.resultIdentity.version.replace(/^v/, ""));
  return Number.isFinite(parsed) ? parsed : 1;
}

function nextVersion(version: string) {
  const parsed = Number(version.replace(/^v/, ""));
  return `v${Number.isFinite(parsed) ? parsed + 1 : 2}`;
}

export function deriveTenderFreshness(tender: TenderRecord, nowIso: string): TenderFreshness {
  const now = new Date(nowIso).getTime();
  const deadline = new Date(tender.deadlineAt).getTime();
  const snapshot = new Date(tender.snapshotAsOf).getTime();
  if (![now, deadline, snapshot].every(Number.isFinite)) throw new Error("Tender freshness requires valid absolute dates.");
  const difference = deadline - now;
  const daysRemaining = difference <= 0 ? 0 : Math.ceil(difference / DAY_MS);
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
      .map((evidence) => ({
        evidence,
        score: overlap(strengthTokens, tokens(`${evidence.field} ${evidence.value} ${evidence.notes}`)),
      }))
      .filter(({ evidence, score }) => score > 0 && evidence.reviewStatus === "LEGACY_VERIFIED")
      .sort((left, right) => right.score - left.score || left.evidence.id.localeCompare(right.evidence.id));
    if (!candidates.length) {
      unsupported.push(strength);
      continue;
    }
    const bestScore = candidates[0].score;
    const evidenceIds = candidates.filter((candidate) => candidate.score === bestScore).slice(0, 2).map((candidate) => candidate.evidence.id);
    linked.push({
      id: `claim:TB:${supplier.id.split(":").at(-1)}:${slug(strength)}`,
      text: strength,
      evidenceIds,
      linkage: "lexical",
      externalClaimEligible: evidenceIds.every((id) => supplier.evidence.find((item) => item.id === id)?.externalClaimEligible === true),
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

export function calculateLegacyBaselinePriority(matchScore: number | null, readiness: number, verification: number, freshness: TenderFreshness, decision: ConsultantDecision) {
  if (matchScore === null || matchScore <= 0 || decision === "rejected" || freshness.status === "closed") return null;
  const urgency = freshness.daysRemaining <= 3 ? 45 : freshness.daysRemaining <= 14 ? 100 : freshness.daysRemaining <= 30 ? 82 : 48;
  const humanRelevance = decision === "approved" ? 100 : decision === "hold" ? 20 : 60;
  return Math.round(matchScore * 0.48 + readiness * 0.18 + verification * 0.16 + urgency * 0.11 + humanRelevance * 0.07);
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

function evaluateAssignment(
  code: AuditedComponentCode,
  mapping: AuditedPairEvidenceMapping | undefined,
  supplier: SupplierRecord,
): AuditedScoreComponent {
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
      policyVersion: TENDERBOOST_AUDITED_MATCH_POLICY_VERSION,
      value: null,
      valueClass: "MISSING",
      label: "insufficient-evidence",
      components: [missingComponent("technical-relevance", "The Company × Tender pair was not assessed in the frozen fixture."), missingComponent("market-delivery", "The Company × Tender pair was not assessed in the frozen fixture.")],
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
  const canCalculate = missingInputs.length === 0;
  const value = canCalculate
    ? Math.round(components.reduce((sum, component) => sum + (component.value ?? 0) * component.weight, 0))
    : null;
  const evidenceIds = [...new Set(components.flatMap((component) => component.evidenceIds))];
  return {
    policyVersion: TENDERBOOST_AUDITED_MATCH_POLICY_VERSION,
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
      policyVersion: TENDERBOOST_CAMPAIGN_PRIORITY_POLICY_VERSION,
      evidenceIds: [],
      reasonCodes: ["TENDER_CLOSED"],
      method: "Closed tenders have no current campaign urgency value.",
    };
  }
  const value = Math.max(25, Math.min(100, Math.round(102.5 - freshness.daysRemaining * 2.5)));
  return {
    value,
    valueClass: "CALCULATED" as const,
    policyVersion: TENDERBOOST_CAMPAIGN_PRIORITY_POLICY_VERSION,
    evidenceIds: [],
    reasonCodes: [],
    method: "Monotonic deadline urgency: 100 at one day, declining 2.5 points per additional day, floored at 25.",
  };
}

function auditedVerificationQuality(audited: AuditedMatchResult) {
  const usableComponents = audited.components.filter((component) => component.evidenceConfidence !== null);
  const evidenceIds = [...new Set(usableComponents.flatMap((component) => component.evidenceIds))];
  const value = mean(usableComponents.map((component) => component.evidenceConfidence as number));
  return {
    value,
    valueClass: value === null ? "MISSING" as const : "CALCULATED" as const,
    policyVersion: TENDERBOOST_AUDITED_MATCH_POLICY_VERSION,
    evidenceIds,
    reasonCodes: value === null ? ["PAIR_RELEVANT_EVIDENCE_MISSING"] : [],
    method: "Mean confidence of distinct evidence records accepted for the audited pair components; not global supplier coverage.",
  };
}

export function calculateCampaignPriority(audited: AuditedMatchResult, verification: ReturnType<typeof auditedVerificationQuality>, urgency: ReturnType<typeof calculateDeadlineUrgency>) {
  if (audited.value === null || verification.value === null || urgency.value === null) {
    return {
      value: null,
      valueClass: "MISSING" as const,
      policyVersion: TENDERBOOST_CAMPAIGN_PRIORITY_POLICY_VERSION,
      evidenceIds: [...new Set([...audited.evidenceIds, ...verification.evidenceIds])],
      reasonCodes: ["REQUIRED_PRIORITY_OPERAND_MISSING"],
      method: "Priority remains MISSING until audited match, pair verification, and open-tender urgency are all available.",
    };
  }
  return {
    value: Math.round(audited.value * 0.65 + verification.value * 0.2 + urgency.value * 0.15),
    valueClass: "CALCULATED" as const,
    policyVersion: TENDERBOOST_CAMPAIGN_PRIORITY_POLICY_VERSION,
    evidenceIds: [...new Set([...audited.evidenceIds, ...verification.evidenceIds])],
    reasonCodes: [],
    method: "Audited match 65% + pair-specific verification 20% + deadline urgency 15%; readiness and consultant decision are deliberately excluded.",
  };
}

export function assessMatch(
  tender: TenderRecord,
  supplier: SupplierRecord,
  nowIso: string,
  decision: ConsultantDecision = "pending",
): MatchAssessment {
  const legacy = supplier.legacyTenderMatches.find((item) => item.tenderReference === tender.reference);
  const freshness = deriveTenderFreshness(tender, nowIso);
  const globalLegacyQuality = legacyVerificationQuality(supplier);
  const { linked, unsupported } = linkLegacyStrengths(supplier, legacy?.verifiedStrengths ?? []);
  const score = legacy?.score ?? null;
  const auditedMatch = evaluateAuditedMatch(tender, supplier, score);
  const quality = auditedVerificationQuality(auditedMatch);
  const deadlineUrgency = calculateDeadlineUrgency(freshness);
  const campaignPriority = calculateCampaignPriority(auditedMatch, quality, deadlineUrgency);
  return {
    id: `match:TB:${slug(tender.reference)}:${slug(supplier.id)}`,
    version: "v1",
    key: `${tender.reference}::${supplier.id}`,
    tenderId: tender.id,
    supplierId: supplier.id,
    exactLegacyPair: Boolean(legacy),
    matchScore: {
      value: score,
      valueClass: legacy ? "ESTIMATED" : "MISSING",
      method: legacy ? "legacy TenderBoost curated pair score; formula not yet independently revalidated" : "pair not evaluated in the frozen TenderBoost source fixture",
    },
    legacyBaseline: {
      policyVersion: TENDERBOOST_LEGACY_BASELINE_POLICY_VERSION,
      matchScore: score,
      supplierReadiness: supplier.readiness.value,
      globalVerificationQuality: globalLegacyQuality,
      campaignPriority: calculateLegacyBaselinePriority(score, supplier.readiness.value, globalLegacyQuality, freshness, decision),
      method: "Frozen Stage 1 behavior: match 48% + readiness 18% + global evidence coverage 16% + urgency band 11% + consultant decision 7%.",
    },
    auditedMatch,
    supplierReadiness: supplier.readiness,
    verificationQuality: quality,
    deadlineUrgency,
    campaignPriority,
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
      humanReview: decision === "approved" ? "medium" : "unknown",
    },
    tenderFreshness: freshness,
  };
}

function blocker(code: CampaignBlocker["code"], message: string, nextAction: string): CampaignBlocker {
  return { code, message, nextAction };
}

function operationalBlockers(match: MatchAssessment, supplier: SupplierRecord): CampaignBlocker[] {
  const blockers: CampaignBlocker[] = [];
  if (!match.exactLegacyPair || match.matchScore.value === null) blockers.push(blocker("MATCH_UNASSESSED", "This Company × Tender pair was not evaluated in the source fixture.", "Select an evaluated pair or run a separately approved assessment method."));
  else if (match.matchScore.value === 0) blockers.push(blocker("ZERO_MATCH", "This evaluated Company × Tender pair has a genuine zero score.", "Select a positive evidence-backed pair."));
  else if (match.auditedMatch.value === null) blockers.push(blocker("AUDITED_MATCH_REQUIRED", "The audited formula is missing one or more required evidence components.", `Resolve: ${match.auditedMatch.missingInputs.join("; ")}.`));
  if (match.consultantDecision === "rejected") blockers.push(blocker("MATCH_REJECTED", "The consultant rejected this match.", "Choose another match or record a new reviewed decision."));
  if (match.tenderFreshness.status === "closed") blockers.push(blocker("TENDER_CLOSED", "The tender deadline has passed.", "Refresh the tender record and select an open opportunity."));
  if (match.tenderFreshness.freshness === "stale") blockers.push(blocker("SNAPSHOT_STALE", "The demonstration tender snapshot is stale.", "Refresh from an authorized source before activation."));
  if (supplier.suppressionStatus === "UNKNOWN") blockers.push(blocker("SUPPRESSION_REVIEW_REQUIRED", "Suppression status has not been checked.", "Complete suppression screening for this supplier and channel."));
  if (supplier.suppressionStatus === "SUPPRESSED") blockers.push(blocker("SUPPRESSED", "The supplier is suppressed from outreach.", "Do not prepare or activate external outreach."));
  if (supplier.consentStatus === "MISSING") blockers.push(blocker("CONSENT_REQUIRED", "No consent or lawful-contact basis is recorded.", "Record the authorized contact basis before activation."));
  if (supplier.consentStatus === "REVOKED") blockers.push(blocker("CONSENT_REVOKED", "Contact consent was revoked.", "Keep the campaign blocked and review retention obligations."));
  if (isMaterialRisk(supplier)) blockers.push(blocker("MATERIAL_RISK_REVIEW", "A material integrity or compliance risk remains unresolved.", "Complete human compliance review and retain the decision evidence."));
  if (!match.linkedStrengths.some((claim) => claim.externalClaimEligible)) blockers.push(blocker("EVIDENCE_REFRESH_REQUIRED", "No current reviewed evidence is eligible for an external claim.", "Refresh and approve claim-level evidence before activation."));
  return blockers;
}

export function evaluateCampaignEligibility(
  match: MatchAssessment,
  supplier: SupplierRecord,
  campaign: CampaignDraft | null = null,
  events: CampaignEvent[] = [],
): CampaignEligibility {
  const base = operationalBlockers(match, supplier);
  const hardPreparationCodes = new Set<CampaignBlocker["code"]>(["MATCH_UNASSESSED", "ZERO_MATCH", "MATCH_REJECTED", "TENDER_CLOSED", "SUPPRESSED", "CONSENT_REVOKED"]);
  const canPrepareDraft = !base.some((item) => hardPreparationCodes.has(item.code));
  const eligibleForSuggestion = canPrepareDraft && base.length === 0;
  const blockers = [...base];
  if (match.consultantDecision !== "approved") blockers.push(blocker("CONSULTANT_APPROVAL_REQUIRED", "The match has not been approved by a consultant.", "Review the evidence and explicitly approve or reject the match."));
  const hasRetainedCampaignApproval = Boolean(campaign?.approvedAt && campaign.approvedBy) && campaign?.lifecycle !== "draft" && campaign?.lifecycle !== "rejected";
  if (!hasRetainedCampaignApproval) blockers.push(blocker("CAMPAIGN_APPROVAL_REQUIRED", "The campaign draft is not approved.", "Review and approve the exact channel copy."));
  const hasRecordedOutreach = events.some((event) => event.type === "outreach-sent" && event.mode !== "simulation" && Boolean(event.externalRecordId));
  if (!hasRecordedOutreach) blockers.push(blocker("OUTREACH_EVENT_REQUIRED", "No external outreach event is recorded.", "A future authorized integration must record the sent event before the lifecycle can become active."));
  return {
    canPrepareDraft,
    eligibleForSuggestion,
    eligibleForActivation: blockers.length === 0,
    blockers,
  };
}

export function buildAllMatches(tenders: TenderRecord[], suppliers: SupplierRecord[], nowIso: string) {
  return tenders
    .flatMap((tender) => suppliers.map((supplier) => assessMatch(tender, supplier, nowIso)))
    .sort((left, right) => ((right.matchScore.value ?? -1) - (left.matchScore.value ?? -1)) || left.key.localeCompare(right.key));
}

export function campaignSuggestions(tenders: TenderRecord[], suppliers: SupplierRecord[], nowIso: string) {
  const tenderById = new Map(tenders.map((item) => [item.id, item]));
  const supplierById = new Map(suppliers.map((item) => [item.id, item]));
  return buildAllMatches(tenders, suppliers, nowIso)
    .map((match) => ({ match, tender: tenderById.get(match.tenderId)!, supplier: supplierById.get(match.supplierId)! }))
    .filter(({ match, supplier }) => evaluateCampaignEligibility(match, supplier).eligibleForSuggestion)
    .sort((left, right) => (right.match.campaignPriority.value ?? -1) - (left.match.campaignPriority.value ?? -1));
}

function recommendedObjective(match: MatchAssessment): CampaignObjective {
  if (match.auditedMatch.value === null || match.gaps.length || (match.verificationQuality.value ?? 0) < 70) return "eligibility-readiness";
  if (match.consultantDecision === "approved" && match.auditedMatch.value >= 85) return "participation-services";
  if (match.auditedMatch.value >= 80) return "tender-opportunity";
  return "tender-intelligence";
}

export function recommendedChannel(match: MatchAssessment): CampaignChannel {
  if (match.tenderFreshness.daysRemaining <= 7) return "Telephone";
  if ((match.auditedMatch.value ?? 0) >= 85) return "Email";
  return "LinkedIn";
}

export function generateCampaignCopy(
  match: MatchAssessment,
  tender: TenderRecord,
  supplier: SupplierRecord,
  channel: CampaignChannel,
  objective: CampaignObjective,
) {
  const eligibleClaims = match.linkedStrengths.filter((claim) => claim.externalClaimEligible);
  const claimLines = eligibleClaims.length
    ? eligibleClaims.map((claim) => `• ${claim.text} [${claim.evidenceIds.join(", ")}]`).join("\n")
    : "• No current reviewed evidence is approved for external use.";
  const heading = channel === "Telephone" ? "CONSULTANT CALL BRIEF" : `${channel.toUpperCase()} DRAFT`;
  const legacyLabel = match.matchScore.value === null ? "MISSING · not evaluated" : `${match.matchScore.value}/100 (${match.matchScore.valueClass.toLowerCase()})`;
  const auditedLabel = match.auditedMatch.value === null ? `MISSING · ${match.auditedMatch.missingInputs.join("; ")}` : `${match.auditedMatch.value}/100 (${match.auditedMatch.label})`;
  return `${heading} · NOT SENT\n\nObjective: ${objective}\nSupplier: ${supplier.legalEnglishName}\nTender: ${tender.title}\nReference: ${tender.reference}\nAbsolute deadline: ${tender.deadlineAt}\n\nTenderBoost legacy Match Score: ${legacyLabel}\nAudited Match Support: ${auditedLabel}\n\nEvidence-approved claims:\n${claimLines}\n\nConsultant note:\nThis dated demonstration snapshot may support internal preparation only. Refresh the tender, evidence, suppression, consent, and compliance checks before any external activation.`;
}

function identities(caseId: string, resultVersion: number, hasCampaign: boolean) {
  const version = `v${resultVersion}`;
  const artifacts = [{ id: `artifact:TB:${slug(caseId)}:case-json`, version }];
  if (hasCampaign) artifacts.push({ id: `artifact:TB:${slug(caseId)}:campaign-brief`, version });
  return { version, artifacts };
}

function reviseResult(result: TenderBoostCaseResult, changes: Partial<TenderBoostCaseResult>, supplier: SupplierRecord, nowIso: string) {
  const nextVersion = revisionNumber(result) + 1;
  const { version, artifacts } = identities(result.caseIdentity.id, nextVersion, Boolean(changes.campaign ?? result.campaign));
  const merged = { ...result, ...changes };
  const activation = evaluateCampaignEligibility(merged.match, supplier, merged.campaign, merged.campaignEvents);
  return {
    ...merged,
    schemaVersion: TENDERBOOST_SCHEMA_VERSION,
    engineVersion: TENDERBOOST_ENGINE_VERSION,
    caseIdentity: { ...merged.caseIdentity, version },
    resultIdentity: { id: `result:TB:${slug(merged.caseIdentity.id)}:${version}`, version },
    artifactIdentities: artifacts,
    updatedAt: nowIso,
    activation,
  } satisfies TenderBoostCaseResult;
}

export function createCaseResult(
  caseId: string,
  tender: TenderRecord,
  supplier: SupplierRecord,
  nowIso: string,
): TenderBoostCaseResult {
  if (!caseId.trim()) throw new Error("An explicit Case ID is required.");
  const match = assessMatch(tender, supplier, nowIso);
  const { version, artifacts } = identities(caseId, 1, false);
  const result: TenderBoostCaseResult = {
    schemaVersion: TENDERBOOST_SCHEMA_VERSION,
    engineVersion: TENDERBOOST_ENGINE_VERSION,
    caseIdentity: { id: caseId, version },
    resultIdentity: { id: `result:TB:${slug(caseId)}:${version}`, version },
    tenderIdentity: { id: tender.id, version: tender.version },
    supplierIdentity: { id: supplier.id, version: supplier.version },
    evidenceSnapshotIdentity: { id: TENDERBOOST_DEMO_SNAPSHOT_ID, version: TENDERBOOST_DEMO_AS_OF },
    decisionIdentity: { id: `match-decision:TB:${slug(caseId)}:pending`, version: "v1" },
    artifactIdentities: artifacts,
    createdAt: nowIso,
    updatedAt: nowIso,
    workflowState: "preliminary",
    match,
    campaign: null,
    campaignEvents: [],
    simulationEvents: [],
    activation: evaluateCampaignEligibility(match, supplier),
    knownLimitations: [
      "The 16-tender and 10-supplier fixture is a dated demonstration snapshot, not a live feed.",
      "The audited policy is validated only on the bounded dated fixture; 12 of 18 assessed pairs remain MISSING because required evidence is incomplete.",
      "Legacy Match Score and readiness remain historical estimates and are not silently overwritten by the audited result.",
      "Browser-local Case storage is not durable tenant-isolated persistence.",
      "No sending, CRM, consent, suppression, or response integration is connected.",
      "The relationship diagram is schematic and non-geospatial; it does not represent coordinates, distance, routing, or live map accuracy.",
    ],
    migration: {
      status: "native-current",
      fromSchemaVersion: null,
      migratedAt: null,
      note: "Created under the current audited scoring schema.",
    },
  };
  return result;
}

export function setConsultantDecision(
  result: TenderBoostCaseResult,
  supplier: SupplierRecord,
  decision: ConsultantDecision,
  nowIso: string,
  provenance: { actorId: string; rationale: string },
) {
  if (!provenance.actorId.trim() || !provenance.rationale.trim()) throw new Error("Match decision provenance requires an actor and rationale.");
  const sequence = result.match.decisionHistory.length + 1;
  const decisionRecord = {
    id: `match-decision:TB:${slug(result.caseIdentity.id)}:${sequence}`,
    version: "v1",
    decision,
    actorId: provenance.actorId,
    decidedAt: nowIso,
    rationale: provenance.rationale,
    sourceRole: "USER_ASSERTION" as const,
    valueClass: "SOURCE" as const,
  };
  const match: MatchAssessment = {
    ...result.match,
    version: nextVersion(result.match.version),
    consultantDecision: decision,
    decisionHistory: [...result.match.decisionHistory, decisionRecord],
    trust: { ...result.match.trust, humanReview: decision === "pending" ? "unknown" : "medium" },
    legacyBaseline: {
      ...result.match.legacyBaseline,
      campaignPriority: calculateLegacyBaselinePriority(result.match.matchScore.value, result.match.supplierReadiness.value, result.match.legacyBaseline.globalVerificationQuality, result.match.tenderFreshness, decision),
    },
  };
  const campaign = decision === "rejected" && result.campaign ? { ...result.campaign, version: nextVersion(result.campaign.version), lifecycle: "rejected" as const, currentStatus: "Rejected · no outreach permitted" } : result.campaign;
  return reviseResult(result, { match, campaign, decisionIdentity: decisionRecord, workflowState: decision === "approved" ? "reviewed" : "preliminary" }, supplier, nowIso);
}

export function createCampaignDraft(
  result: TenderBoostCaseResult,
  tender: TenderRecord,
  supplier: SupplierRecord,
  nowIso: string,
  channel: CampaignChannel = recommendedChannel(result.match),
  objective: CampaignObjective = recommendedObjective(result.match),
) {
  const eligibility = evaluateCampaignEligibility(result.match, supplier);
  if (!eligibility.canPrepareDraft) throw new Error(eligibility.blockers[0]?.message ?? "Campaign draft is blocked.");
  const campaign: CampaignDraft = {
    id: `campaign:TB:${slug(result.caseIdentity.id)}`,
    version: "v1",
    caseId: result.caseIdentity.id,
    matchId: result.match.id,
    supplierId: supplier.id,
    tenderId: tender.id,
    lifecycle: "draft",
    objective,
    channel,
    copy: generateCampaignCopy(result.match, tender, supplier, channel, objective),
    copyEvidenceIds: result.match.linkedStrengths.filter((claim) => claim.externalClaimEligible).flatMap((claim) => claim.evidenceIds),
    createdAt: nowIso,
    approvedAt: null,
    approvedBy: null,
    currentStatus: "Draft only · no message sent",
    policyVersion: TENDERBOOST_CAMPAIGN_PRIORITY_POLICY_VERSION,
  };
  return reviseResult(result, { campaign }, supplier, nowIso);
}

export function approveCampaignDraft(result: TenderBoostCaseResult, supplier: SupplierRecord, approvedBy: string, nowIso: string) {
  if (!result.campaign) throw new Error("Create a campaign draft before approval.");
  if (result.match.consultantDecision !== "approved") throw new Error("The consultant must approve the match separately before approving campaign copy.");
  const campaign = {
    ...result.campaign,
    version: nextVersion(result.campaign.version),
    lifecycle: "approved" as const,
    approvedAt: nowIso,
    approvedBy,
    currentStatus: "Approved draft · no message sent",
  };
  return reviseResult(result, { campaign, workflowState: "approved" }, supplier, nowIso);
}

export function recordCampaignEvent(
  result: TenderBoostCaseResult,
  supplier: SupplierRecord,
  event: Omit<CampaignEvent, "id" | "version" | "campaignId">,
  nowIso: string,
) {
  if (!result.campaign) throw new Error("A Campaign identity is required before recording an event.");
  if (event.mode === "simulation" && event.type !== "simulation-preview") throw new Error("Simulation events cannot claim outreach, response, handoff, or no-response activity.");
  if (event.mode !== "simulation" && !event.externalRecordId) throw new Error("A real campaign event requires an integration or manual-record identity.");
  const sequence = result.campaignEvents.length + result.simulationEvents.length + 1;
  const record: CampaignEvent = {
    ...event,
    id: `campaign-event:TB:${slug(result.caseIdentity.id)}:${sequence}`,
    version: "v1",
    campaignId: result.campaign.id,
  };
  if (record.mode === "simulation") {
    return reviseResult(result, { simulationEvents: [...result.simulationEvents, record] }, supplier, nowIso);
  }
  return reviseResult(result, { campaignEvents: [...result.campaignEvents, record] }, supplier, nowIso);
}

function hasRealEvent(result: TenderBoostCaseResult, type: CampaignEventType) {
  return result.campaignEvents.some((event) => event.type === type && event.mode !== "simulation" && Boolean(event.externalRecordId));
}

export function transitionCampaignLifecycle(
  result: TenderBoostCaseResult,
  supplier: SupplierRecord,
  target: CampaignLifecycle,
  nowIso: string,
) {
  if (!result.campaign) throw new Error("A Campaign identity is required before lifecycle transition.");
  const current = result.campaign.lifecycle;
  if (target === "active") {
    if (current !== "approved") throw new Error("Only an approved campaign can become active.");
    const eligibility = evaluateCampaignEligibility(result.match, supplier, result.campaign, result.campaignEvents);
    if (!eligibility.eligibleForActivation) throw new Error(eligibility.blockers[0]?.message ?? "Campaign activation is blocked.");
  } else if (target === "follow-up") {
    if (current !== "active" || !hasRealEvent(result, "outreach-sent")) throw new Error("Follow-up requires an active campaign backed by an outreach event.");
  } else if (target === "interested") {
    if (!["active", "follow-up"].includes(current) || !hasRealEvent(result, "response-interested")) throw new Error("Interested requires an explicit non-simulation response event.");
  } else if (target === "no-response") {
    if (!["active", "follow-up"].includes(current) || !hasRealEvent(result, "no-response-observed")) throw new Error("No response requires an explicit non-simulation observation event.");
  } else if (target === "closed") {
    if (!["interested", "no-response"].includes(current)) throw new Error("Only a resolved response state can be closed.");
  } else if (target !== "rejected") {
    throw new Error(`Use the dedicated review action for ${target}.`);
  }
  const campaign = { ...result.campaign, version: nextVersion(result.campaign.version), lifecycle: target, currentStatus: `${target} · backed by recorded lifecycle evidence` };
  return reviseResult(result, { campaign }, supplier, nowIso);
}

function storageKey(caseId: string) {
  if (!caseId.trim()) throw new Error("An explicit Case ID is required.");
  return `tenderapps:tenderboost:case:${encodeURIComponent(caseId)}`;
}

export function saveCaseResult(storage: StorageLike, result: TenderBoostCaseResult) {
  storage.setItem(storageKey(result.caseIdentity.id), JSON.stringify(result));
  return result.caseIdentity.id;
}

export function resumeCaseResult(
  result: TenderBoostCaseResult,
  tender: TenderRecord,
  supplier: SupplierRecord,
  nowIso: string,
) {
  if (result.tenderIdentity.id !== tender.id || result.supplierIdentity.id !== supplier.id) throw new Error("Resume context does not match the persisted TenderBoost Case identities.");
  const reassessed = assessMatch(tender, supplier, nowIso, result.match.consultantDecision);
  const match: MatchAssessment = {
    ...reassessed,
    version: nextVersion(result.match.version),
    consultantDecision: result.match.consultantDecision,
    decisionHistory: result.match.decisionHistory ?? [],
  };
  const campaign = result.campaign ? { ...result.campaign, policyVersion: TENDERBOOST_CAMPAIGN_PRIORITY_POLICY_VERSION } : null;
  return reviseResult(result, { match, campaign }, supplier, nowIso);
}

export function loadCaseResult(
  storage: StorageLike,
  caseId: string,
  context: { tender: TenderRecord; supplier: SupplierRecord; nowIso: string },
): TenderBoostCaseResult | null {
  const raw = storage.getItem(storageKey(caseId));
  if (!raw) return null;
  const parsed = JSON.parse(raw) as Omit<TenderBoostCaseResult, "schemaVersion"> & { schemaVersion: string };
  if (parsed.caseIdentity.id !== caseId) throw new Error("Persisted Case identity does not match the requested Case.");
  if (!parsed.resultIdentity?.id || !parsed.match?.id) throw new Error("Persisted TenderBoost Case is incomplete.");
  if (parsed.schemaVersion !== TENDERBOOST_SCHEMA_VERSION && parsed.schemaVersion !== TENDERBOOST_LEGACY_SCHEMA_VERSION) {
    throw new Error(`TenderBoost Case schema ${parsed.schemaVersion} is unsupported and requires an explicit migration.`);
  }
  if (parsed.schemaVersion === TENDERBOOST_LEGACY_SCHEMA_VERSION) {
    const legacy = parsed as unknown as TenderBoostCaseResult;
    return resumeCaseResult({
      ...legacy,
      schemaVersion: TENDERBOOST_SCHEMA_VERSION,
      engineVersion: TENDERBOOST_ENGINE_VERSION,
      migration: {
        status: "compatible-historical",
        fromSchemaVersion: TENDERBOOST_LEGACY_SCHEMA_VERSION,
        migratedAt: context.nowIso,
        note: "Historical legacy values and human/event provenance were retained; audited derived fields were recomputed from the supplied Tender, Supplier, and clock.",
      },
    }, context.tender, context.supplier, context.nowIso);
  }
  return resumeCaseResult({ ...parsed, schemaVersion: TENDERBOOST_SCHEMA_VERSION }, context.tender, context.supplier, context.nowIso);
}

export function removeCaseResult(storage: StorageLike, caseId: string) {
  storage.removeItem(storageKey(caseId));
}

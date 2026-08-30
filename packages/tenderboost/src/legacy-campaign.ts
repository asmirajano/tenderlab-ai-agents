import type {
  ConsultantDecision,
  MatchAssessment,
  StorageLike,
  SupplierRecord,
  TenderMatchCaseResult,
  TenderRecord,
} from "./types.ts";

export const LEGACY_CAMPAIGN_SCHEMA_VERSION = "tenderboost-legacy-campaign/1.0.0" as const;
export const LEGACY_CAMPAIGN_POLICY_VERSION = "tenderboost-legacy-campaign-parity/1.0.0" as const;
export const LEGACY_CAMPAIGN_STORAGE_KEY = "tenderapps:tendermatch:legacy-campaigns:v1" as const;

export type LegacyCampaignStage =
  | "draft"
  | "approved"
  | "active-simulation"
  | "follow-up-simulation"
  | "interested-simulation"
  | "no-response-simulation"
  | "closed";
export type LegacyCampaignOrigin = "consultant" | "suggested" | "match-matrix";
export type LegacyCampaignObjectiveId = "tender-opportunity" | "tenderlab-platform" | "participation-services" | "tender-intelligence" | "eligibility-readiness";
export type LegacyCampaignEventType = "DRAFT_CREATED" | "DRAFT_UPDATED" | "CONTENT_APPROVED" | "CONTENT_RETURNED_TO_DRAFT" | "SIMULATION_STARTED" | "SIMULATED_FOLLOW_UP" | "SIMULATED_INTERESTED" | "SIMULATED_NO_RESPONSE" | "SIMULATION_CLOSED";

export type LegacyCampaignEvent = {
  id: string;
  type: LegacyCampaignEventType;
  occurredAt: string;
  actorId: string;
  rationale: string;
  simulationOnly: boolean;
};

export type LegacyCampaignRecord = {
  schemaVersion: typeof LEGACY_CAMPAIGN_SCHEMA_VERSION;
  policyVersion: typeof LEGACY_CAMPAIGN_POLICY_VERSION;
  id: string;
  revision: number;
  caseId: string;
  matchKey: string;
  supplierId: string;
  tenderId: string;
  stage: LegacyCampaignStage;
  origin: LegacyCampaignOrigin;
  objective: LegacyCampaignObjectiveId;
  channel: string;
  createdAt: string;
  updatedAt: string;
  draftCopy: string;
  consultantNote: string;
  communicationStatus: "NOT_SENT";
  operatingMode: "LOCAL_LEGACY_PARITY_MODULE";
  approval: null | { actorId: string; approvedAt: string; rationale: string };
  lastEligibilityBlockers: string[];
  events: LegacyCampaignEvent[];
};

export const legacyCampaignChannels = ["Email", "LinkedIn", "Telephone", "WhatsApp", "Website form", "Advertising", "Manual outreach"] as const;

export const legacyCampaignObjectives: Array<{ id: LegacyCampaignObjectiveId; label: string; shortLabel: string; description: string }> = [
  { id: "tender-opportunity", label: "Tender Opportunity", shortLabel: "Opportunity", description: "Prepare a local draft that introduces the exact tender for consultant review." },
  { id: "tenderlab-platform", label: "TenderLab.ai Platform Adoption", shortLabel: "Platform", description: "Draft a platform-value explanation grounded in the selected match." },
  { id: "participation-services", label: "Tender Participation Services", shortLabel: "Participation", description: "Draft a bounded offer for separate downstream participation support." },
  { id: "tender-intelligence", label: "Tender Intelligence Pack", shortLabel: "Intelligence", description: "Draft an offer for a decision-ready tender brief." },
  { id: "eligibility-readiness", label: "Eligibility & Readiness Review", shortLabel: "Readiness", description: "Draft a request to resolve qualification and evidence gaps." },
];

function slug(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 96);
}

function event(type: LegacyCampaignEventType, actorId: string, occurredAt: string, rationale: string, simulationOnly: boolean): LegacyCampaignEvent {
  return { id: `campaign-event:${slug(`${type}-${occurredAt}-${actorId}`)}`, type, actorId, occurredAt, rationale, simulationOnly };
}

function hasMaterialRisk(supplier: SupplierRecord) {
  return supplier.risks.some((risk) => /debar|exclusion|entity list|sanction/i.test(risk));
}

export function legacyCampaignObjective(match: MatchAssessment): LegacyCampaignObjectiveId {
  if (match.auditedMatch.value === null || match.verificationQuality.value === null || match.verificationQuality.value < 70) return "eligibility-readiness";
  if (match.matchScore.value !== null && match.matchScore.value >= 90 && match.tenderFreshness.daysRemaining > 30) return "tenderlab-platform";
  if (match.consultantDecision === "approved") return "participation-services";
  if (match.matchScore.value !== null && match.matchScore.value >= 85) return "tender-opportunity";
  return "tender-intelligence";
}

export function legacyCampaignPriority(match: MatchAssessment, supplier: SupplierRecord) {
  if (!match.exactLegacyPair || match.matchScore.value === null || match.matchScore.value <= 0 || match.consultantDecision === "rejected") return null;
  const decisionContext: Record<ConsultantDecision, number> = { pending: 60, approved: 100, hold: 20, rejected: 0 };
  const compliance = hasMaterialRisk(supplier) ? 25 : 100;
  return Math.round(
    match.matchScore.value * .44
    + match.supplierReadiness.value * .18
    + (match.verificationQuality.value ?? 0) * .16
    + (match.deadlineUrgency.value ?? 0) * .10
    + decisionContext[match.consultantDecision] * .07
    + compliance * .05,
  );
}

export function legacyCampaignActivationBlockers(result: TenderMatchCaseResult, supplier: SupplierRecord) {
  const blockers: string[] = [];
  const match = result.match;
  if (!match.exactLegacyPair || match.matchScore.value === null) blockers.push("PAIR_NOT_EVALUATED");
  if (match.auditedMatch.value === null) blockers.push("AUDITED_MATCH_MISSING");
  if (match.consultantDecision !== "approved") blockers.push("CURRENT_MATCH_APPROVAL_REQUIRED");
  if (match.tenderFreshness.status === "closed") blockers.push("TENDER_CLOSED");
  if (match.tenderFreshness.freshness !== "current") blockers.push("TENDER_OR_SNAPSHOT_NOT_CURRENT");
  if (!result.reviewSupport.readyForCurrentDecision) blockers.push("CURRENT_REVIEW_BLOCKERS_UNRESOLVED");
  if (hasMaterialRisk(supplier)) blockers.push("MATERIAL_RISK_REVIEW_REQUIRED");
  if (!match.auditedMatch.evidenceIds.length) blockers.push("EVIDENCE_LINKS_REQUIRED");
  return Array.from(new Set(blockers));
}

function reviewedClaims(result: TenderMatchCaseResult, supplier: SupplierRecord) {
  const evidenceById = new Map(supplier.evidence.map((record) => [record.id, record]));
  return result.match.linkedStrengths.filter((claim) => claim.linkage === "lexical" && claim.evidenceIds.length > 0 && claim.evidenceIds.every((id) => {
    const evidence = evidenceById.get(id);
    return evidence && ["LEGACY_VERIFIED", "REVIEWED"].includes(evidence.reviewStatus) && evidence.confidence >= 70;
  }));
}

function objectiveMeta(objective: LegacyCampaignObjectiveId) {
  return legacyCampaignObjectives.find((item) => item.id === objective) ?? legacyCampaignObjectives[0];
}

export function recommendedLegacyCampaignChannel(result: TenderMatchCaseResult, supplier: SupplierRecord, objective = legacyCampaignObjective(result.match)) {
  if (hasMaterialRisk(supplier) || result.match.auditedMatch.value === null) return "Manual outreach";
  if (objective === "eligibility-readiness") return result.match.tenderFreshness.daysRemaining <= 5 ? "Manual outreach" : "Telephone";
  if (objective === "participation-services") return result.match.tenderFreshness.daysRemaining <= 7 ? "Telephone" : "Email";
  if (objective === "tenderlab-platform") return "LinkedIn";
  return "Email";
}

export function generateLegacyCampaignCopy(
  result: TenderMatchCaseResult,
  tender: TenderRecord,
  supplier: SupplierRecord,
  objective: LegacyCampaignObjectiveId,
  channel: string,
) {
  const claims = reviewedClaims(result, supplier);
  const proof = claims.length ? claims.map((claim) => `• ${claim.text} [${claim.evidenceIds.join(", ")}]`).join("\n") : "• No evidence-linked external claim is currently available.";
  const matchValue = result.match.auditedMatch.value === null ? "MISSING" : `${result.match.auditedMatch.value}/100`;
  const meta = objectiveMeta(objective);
  const opportunity = `${tender.reference} · ${tender.object} · ${tender.country} · ${tender.sourceLabel} · deadline ${tender.deadlineAt}`;
  const guardrail = "LOCAL DRAFT · NOT SENT · Consultant review required. No delivery, CRM action, response, or downstream transfer is recorded.";
  if (channel === "Telephone") return `${guardrail}\n\nCALL PREPARATION · ${meta.label}\n\nOpening\nTenderMatch identified a potentially relevant tender for ${supplier.legalEnglishName}.\n\nAudited support\n${matchValue}\n\nEvidence-linked proof\n${proof}\n\nOpportunity\n${opportunity}\n\nClose\nAsk whether the supplier wants a separate consultant-led qualification review.`;
  if (channel === "Advertising") return `${guardrail}\n\nLOCAL AD CONCEPT · ${meta.label}\n\nHeadline\n${tender.object} opportunity for reviewed suppliers\n\nEvidence-linked proof\n${proof}\n\nCTA\nRequest a separate consultant review. No advertisement is published.`;
  return `${guardrail}\n\n${channel.toUpperCase()} DRAFT · ${meta.label}\n\nSubject: ${tender.object} · ${tender.country}\n\nHello ${supplier.legalEnglishName} team,\n\nTenderMatch identified a potentially relevant opportunity for consultant review.\n\nAudited support: ${matchValue}\nEvidence-linked proof:\n${proof}\n\nOpportunity:\n${opportunity}\n\nThis draft does not assert eligibility or participation readiness. Would you like a separate consultant-led review?`;
}

export function createLegacyCampaign(
  result: TenderMatchCaseResult,
  tender: TenderRecord,
  supplier: SupplierRecord,
  origin: LegacyCampaignOrigin,
  actorId: string,
  nowIso: string,
) {
  if (!result.match.exactLegacyPair || result.match.matchScore.value === null || result.match.matchScore.value <= 0) throw new Error("A legacy campaign draft requires a positively evaluated Company × Tender pair; MISSING is not zero.");
  const objective = legacyCampaignObjective(result.match);
  const channel = recommendedLegacyCampaignChannel(result, supplier, objective);
  const blockers = legacyCampaignActivationBlockers(result, supplier);
  const id = `legacy-campaign:${slug(result.caseIdentity.id)}`;
  return {
    schemaVersion: LEGACY_CAMPAIGN_SCHEMA_VERSION,
    policyVersion: LEGACY_CAMPAIGN_POLICY_VERSION,
    id,
    revision: 1,
    caseId: result.caseIdentity.id,
    matchKey: result.match.key,
    supplierId: supplier.id,
    tenderId: tender.id,
    stage: "draft",
    origin,
    objective,
    channel,
    createdAt: nowIso,
    updatedAt: nowIso,
    draftCopy: generateLegacyCampaignCopy(result, tender, supplier, objective, channel),
    consultantNote: "",
    communicationStatus: "NOT_SENT",
    operatingMode: "LOCAL_LEGACY_PARITY_MODULE",
    approval: null,
    lastEligibilityBlockers: blockers,
    events: [event("DRAFT_CREATED", actorId, nowIso, `Local ${origin} draft created from explicit Case ${result.caseIdentity.id}.`, false)],
  } satisfies LegacyCampaignRecord;
}

export function reviseLegacyCampaign(
  record: LegacyCampaignRecord,
  changes: Partial<Pick<LegacyCampaignRecord, "objective" | "channel" | "draftCopy" | "consultantNote" | "lastEligibilityBlockers">>,
  actorId: string,
  nowIso: string,
  rationale: string,
) {
  return {
    ...record,
    ...changes,
    revision: record.revision + 1,
    updatedAt: nowIso,
    events: [...record.events, event("DRAFT_UPDATED", actorId, nowIso, rationale, false)],
  } satisfies LegacyCampaignRecord;
}

export function toggleLegacyCampaignApproval(record: LegacyCampaignRecord, actorId: string, nowIso: string) {
  if (record.stage === "draft") return {
    ...record,
    revision: record.revision + 1,
    stage: "approved",
    approval: { actorId, approvedAt: nowIso, rationale: "Consultant approved local draft content only; this is not activation or delivery authorization, and the draft remains NOT SENT." },
    updatedAt: nowIso,
    events: [...record.events, event("CONTENT_APPROVED", actorId, nowIso, "Local draft content approved; this is not activation or delivery authorization.", false)],
  } satisfies LegacyCampaignRecord;
  if (record.stage === "approved") return {
    ...record,
    revision: record.revision + 1,
    stage: "draft",
    approval: null,
    updatedAt: nowIso,
    events: [...record.events, event("CONTENT_RETURNED_TO_DRAFT", actorId, nowIso, "Consultant returned local content to draft.", false)],
  } satisfies LegacyCampaignRecord;
  throw new Error("Content approval can change only while the local record is Draft or Approved.");
}

export function startLegacyCampaignSimulation(record: LegacyCampaignRecord, result: TenderMatchCaseResult, supplier: SupplierRecord, actorId: string, nowIso: string) {
  if (record.stage !== "approved" || !record.approval) throw new Error("Approve the local draft content before starting the isolated lifecycle simulation.");
  const blockers = legacyCampaignActivationBlockers(result, supplier);
  return {
    ...record,
    revision: record.revision + 1,
    stage: "active-simulation",
    updatedAt: nowIso,
    lastEligibilityBlockers: blockers,
    events: [...record.events, event("SIMULATION_STARTED", actorId, nowIso, `Isolated lifecycle simulation started with ${blockers.length} real-activation blocker(s). No communication was sent.`, true)],
  } satisfies LegacyCampaignRecord;
}

export function advanceLegacyCampaignSimulation(record: LegacyCampaignRecord, next: "follow-up" | "interested" | "no-response" | "closed", actorId: string, nowIso: string) {
  if (!record.events.some((item) => item.type === "SIMULATION_STARTED")) throw new Error("A recorded simulation-start event is required before follow-up or response states.");
  const transitions: Record<typeof next, { allowed: LegacyCampaignStage[]; stage: LegacyCampaignStage; type: LegacyCampaignEventType; rationale: string }> = {
    "follow-up": { allowed: ["active-simulation"], stage: "follow-up-simulation", type: "SIMULATED_FOLLOW_UP", rationale: "Local follow-up state simulated; no outreach event exists." },
    interested: { allowed: ["active-simulation", "follow-up-simulation"], stage: "interested-simulation", type: "SIMULATED_INTERESTED", rationale: "Interested response simulated; no external response is claimed." },
    "no-response": { allowed: ["active-simulation", "follow-up-simulation"], stage: "no-response-simulation", type: "SIMULATED_NO_RESPONSE", rationale: "No-response state simulated; no sent communication is claimed." },
    closed: { allowed: ["interested-simulation", "no-response-simulation"], stage: "closed", type: "SIMULATION_CLOSED", rationale: "Local lifecycle simulation closed." },
  };
  const transition = transitions[next];
  if (!transition.allowed.includes(record.stage)) throw new Error(`Cannot move ${record.stage} to ${next}.`);
  return {
    ...record,
    revision: record.revision + 1,
    stage: transition.stage,
    updatedAt: nowIso,
    events: [...record.events, event(transition.type, actorId, nowIso, transition.rationale, true)],
  } satisfies LegacyCampaignRecord;
}

export function saveLegacyCampaigns(storage: StorageLike, records: LegacyCampaignRecord[]) {
  storage.setItem(LEGACY_CAMPAIGN_STORAGE_KEY, JSON.stringify(records));
}

export function loadLegacyCampaigns(storage: StorageLike) {
  const raw = storage.getItem(LEGACY_CAMPAIGN_STORAGE_KEY);
  if (!raw) return [];
  const parsed = JSON.parse(raw) as LegacyCampaignRecord[];
  if (!Array.isArray(parsed) || parsed.some((record) => record.schemaVersion !== LEGACY_CAMPAIGN_SCHEMA_VERSION || record.communicationStatus !== "NOT_SENT")) {
    throw new Error("The saved legacy Campaign Studio workspace has an unsupported or unsafe schema.");
  }
  return parsed;
}

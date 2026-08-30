export const TENDERBOOST_SCHEMA_VERSION = "2.0.0" as const;
export const TENDERBOOST_LEGACY_SCHEMA_VERSION = "1.0.0" as const;
export const TENDERBOOST_ENGINE_VERSION = "tenderboost-match-campaign/2.0.0" as const;
export const TENDERBOOST_LEGACY_BASELINE_POLICY_VERSION = "tenderboost-legacy-baseline/1.0.0" as const;
export const TENDERBOOST_AUDITED_MATCH_POLICY_VERSION = "tenderboost-audited-match/2.0.0" as const;
export const TENDERBOOST_CAMPAIGN_PRIORITY_POLICY_VERSION = "tenderboost-campaign-priority/2.0.0" as const;
export const TENDERBOOST_DEMO_SNAPSHOT_ID = "snapshot:TB-DEMO-2026-08-15" as const;
export const TENDERBOOST_DEMO_AS_OF = "2026-08-15T00:00:00+05:00" as const;

export type SourceRole =
  | "AUTHORITATIVE_SOURCE"
  | "STRUCTURE_TEMPLATE"
  | "SUPPORTING_DOCUMENT"
  | "USER_ASSERTION";

export type ValueClass = "SOURCE" | "CALCULATED" | "ESTIMATED" | "ASSUMED" | "MISSING";
export type ConfidenceLevel = "high" | "medium" | "low" | "unknown";
export type EvidenceReviewStatus = "LEGACY_VERIFIED" | "INFERRED" | "UNKNOWN" | "REVIEWED";
export type ConsultantDecision = "pending" | "approved" | "hold" | "rejected";
export type WorkflowState = "draft" | "preliminary" | "reviewed" | "approved" | "released";
export type CampaignLifecycle = "draft" | "approved" | "active" | "follow-up" | "interested" | "no-response" | "closed" | "rejected";
export type CampaignChannel = "Email" | "LinkedIn" | "Telephone" | "WhatsApp" | "Website form" | "Manual outreach";
export type CampaignObjective = "tender-opportunity" | "participation-services" | "tender-intelligence" | "eligibility-readiness";

export type VersionedIdentity = {
  id: string;
  version: string;
};

export type TrustDimensions = {
  recognition: ConfidenceLevel;
  structural: ConfidenceLevel;
  semantic: ConfidenceLevel;
  arithmeticDomain: ConfidenceLevel;
  humanReview: ConfidenceLevel;
};

export type TenderFreshness = {
  status: "open" | "urgent" | "closed";
  freshness: "current" | "aging" | "stale";
  daysRemaining: number;
  snapshotAgeDays: number;
  deadlineAt: string;
};

export type TenderRecord = VersionedIdentity & {
  reference: string;
  title: string;
  object: string;
  buyer: string;
  country: string;
  region: string;
  sourceLabel: string;
  budgetLabel: string;
  deadlineAt: string;
  snapshotId: typeof TENDERBOOST_DEMO_SNAPSHOT_ID;
  snapshotAsOf: typeof TENDERBOOST_DEMO_AS_OF;
  sourceRole: SourceRole;
  valueClass: ValueClass;
  tags: string[];
};

export type EvidenceRecord = VersionedIdentity & {
  supplierId: string;
  field: string;
  value: string;
  reviewStatus: EvidenceReviewStatus;
  confidence: number;
  sourceTitle: string;
  sourceUrl: string;
  retrievedAt: string;
  notes: string;
  sourceRole: SourceRole;
  valueClass: ValueClass;
  externalClaimEligible: boolean;
};

export type LegacyTenderMatch = {
  tenderReference: string;
  score: number;
  verifiedStrengths: string[];
  inferredStrengths: string[];
  unknowns: string[];
  qualificationGaps: string[];
  consultantDecision: string;
};

export type SupplierRecord = VersionedIdentity & {
  legalEnglishName: string;
  legalChineseName: string;
  headquarters: { city: string; province: string; country: string };
  companyType: string[];
  officialWebsite: string;
  categories: string[];
  capabilities: string[];
  products: string[];
  exportMarkets: string[];
  evidence: EvidenceRecord[];
  legacyTenderMatches: LegacyTenderMatch[];
  readiness: { value: number; valueClass: "ESTIMATED"; method: string };
  technicalFit: number;
  exportReadiness: number;
  legacyEvidenceCompleteness: number;
  risks: string[];
  verificationQuestions: string[];
  suppressionStatus: "UNKNOWN" | "NOT_SUPPRESSED" | "SUPPRESSED";
  consentStatus: "MISSING" | "RECORDED" | "REVOKED";
  snapshotId: typeof TENDERBOOST_DEMO_SNAPSHOT_ID;
};

export type EvidenceLinkedClaim = {
  id: string;
  text: string;
  evidenceIds: string[];
  linkage: "lexical" | "unresolved";
  externalClaimEligible: boolean;
};

export type AuditedComponentCode = "technical-relevance" | "market-delivery";
export type AuditedSemanticBand = 60 | 80 | 100;
export type AuditedReasonCode =
  | "AUDITED_MATCH_AVAILABLE"
  | "PAIR_UNASSESSED"
  | "TECHNICAL_EVIDENCE_MISSING"
  | "MARKET_EVIDENCE_MISSING"
  | "EVIDENCE_RECORD_NOT_FOUND"
  | "EVIDENCE_NOT_VERIFIED"
  | "EVIDENCE_CONFIDENCE_BELOW_THRESHOLD"
  | "EVIDENCE_RECORD_REUSED"
  | "LEGACY_SCORE_NOT_REPRODUCED";

export type AuditedEvidenceAssignment = {
  component: AuditedComponentCode;
  semanticBand: AuditedSemanticBand;
  evidenceIds: string[];
  rationale: string;
};

export type AuditedPairEvidenceMapping = {
  key: string;
  sourceRole: "USER_ASSERTION";
  reviewStatus: "REVIEWED";
  reviewedAt: string;
  assignments: AuditedEvidenceAssignment[];
};

export type AuditedScoreComponent = {
  code: AuditedComponentCode;
  value: number | null;
  valueClass: "ESTIMATED" | "MISSING";
  weight: number;
  evidenceIds: string[];
  evidenceConfidence: number | null;
  reasonCodes: AuditedReasonCode[];
  rationale: string;
};

export type AuditedMatchResult = {
  policyVersion: typeof TENDERBOOST_AUDITED_MATCH_POLICY_VERSION;
  value: number | null;
  valueClass: "ESTIMATED" | "MISSING";
  label: "strong" | "review" | "weak" | "insufficient-evidence";
  components: AuditedScoreComponent[];
  evidenceIds: string[];
  reasonCodes: AuditedReasonCode[];
  missingInputs: string[];
  legacyScore: number | null;
  legacyDelta: number | null;
  method: string;
};

export type LegacyBaselineMetrics = {
  policyVersion: typeof TENDERBOOST_LEGACY_BASELINE_POLICY_VERSION;
  matchScore: number | null;
  supplierReadiness: number;
  globalVerificationQuality: number;
  campaignPriority: number | null;
  method: string;
};

export type CalculatedMetric = {
  value: number | null;
  valueClass: "CALCULATED" | "MISSING";
  policyVersion: string;
  evidenceIds: string[];
  reasonCodes: string[];
  method: string;
};

export type MatchDecisionRecord = VersionedIdentity & {
  decision: ConsultantDecision;
  actorId: string;
  decidedAt: string;
  rationale: string;
  sourceRole: "USER_ASSERTION";
  valueClass: "SOURCE";
};

export type MatchAssessment = VersionedIdentity & {
  key: string;
  tenderId: string;
  supplierId: string;
  exactLegacyPair: boolean;
  matchScore: { value: number | null; valueClass: "ESTIMATED" | "MISSING"; method: string };
  legacyBaseline: LegacyBaselineMetrics;
  auditedMatch: AuditedMatchResult;
  supplierReadiness: { value: number; valueClass: "ESTIMATED"; method: string };
  verificationQuality: CalculatedMetric;
  deadlineUrgency: CalculatedMetric;
  campaignPriority: CalculatedMetric;
  consultantDecision: ConsultantDecision;
  decisionHistory: MatchDecisionRecord[];
  linkedStrengths: EvidenceLinkedClaim[];
  inferredStrengths: string[];
  unsupportedStrengths: string[];
  gaps: string[];
  trust: TrustDimensions;
  tenderFreshness: TenderFreshness;
};

export type CampaignBlockerCode =
  | "MATCH_UNASSESSED"
  | "AUDITED_MATCH_REQUIRED"
  | "ZERO_MATCH"
  | "MATCH_REJECTED"
  | "TENDER_CLOSED"
  | "SNAPSHOT_STALE"
  | "SUPPRESSION_REVIEW_REQUIRED"
  | "SUPPRESSED"
  | "CONSENT_REQUIRED"
  | "CONSENT_REVOKED"
  | "MATERIAL_RISK_REVIEW"
  | "EVIDENCE_REFRESH_REQUIRED"
  | "CONSULTANT_APPROVAL_REQUIRED"
  | "CAMPAIGN_APPROVAL_REQUIRED"
  | "OUTREACH_EVENT_REQUIRED";

export type CampaignBlocker = {
  code: CampaignBlockerCode;
  message: string;
  nextAction: string;
};

export type CampaignEligibility = {
  canPrepareDraft: boolean;
  eligibleForSuggestion: boolean;
  eligibleForActivation: boolean;
  blockers: CampaignBlocker[];
};

export type CampaignDraft = VersionedIdentity & {
  caseId: string;
  matchId: string;
  supplierId: string;
  tenderId: string;
  lifecycle: CampaignLifecycle;
  objective: CampaignObjective;
  channel: CampaignChannel;
  copy: string;
  copyEvidenceIds: string[];
  createdAt: string;
  approvedAt: string | null;
  approvedBy: string | null;
  currentStatus: string;
  policyVersion: typeof TENDERBOOST_CAMPAIGN_PRIORITY_POLICY_VERSION;
};

export type CampaignEventMode = "integration" | "manual-record" | "simulation";
export type CampaignEventType = "outreach-sent" | "response-interested" | "no-response-observed" | "crm-handoff" | "simulation-preview";

export type CampaignEvent = VersionedIdentity & {
  campaignId: string;
  type: CampaignEventType;
  mode: CampaignEventMode;
  occurredAt: string;
  externalRecordId: string | null;
  note: string;
};

export type TenderBoostCaseResult = {
  schemaVersion: typeof TENDERBOOST_SCHEMA_VERSION;
  engineVersion: typeof TENDERBOOST_ENGINE_VERSION;
  caseIdentity: VersionedIdentity;
  resultIdentity: VersionedIdentity;
  tenderIdentity: VersionedIdentity;
  supplierIdentity: VersionedIdentity;
  evidenceSnapshotIdentity: VersionedIdentity;
  decisionIdentity: VersionedIdentity;
  artifactIdentities: VersionedIdentity[];
  createdAt: string;
  updatedAt: string;
  workflowState: WorkflowState;
  match: MatchAssessment;
  campaign: CampaignDraft | null;
  campaignEvents: CampaignEvent[];
  simulationEvents: CampaignEvent[];
  activation: CampaignEligibility;
  knownLimitations: string[];
  migration: {
    status: "native-current" | "compatible-historical";
    fromSchemaVersion: string | null;
    migratedAt: string | null;
    note: string;
  };
};

export type LegacySupplierFixture = {
  companyId: string;
  legalEnglishName: string;
  legalChineseName: string;
  headquarters: { city: string; province: string; country: string };
  companyType: string[];
  officialWebsite: string;
  categories: string[];
  capabilities: string[];
  products: string[];
  exportMarkets: string[];
  evidence: Array<{
    field: string;
    value: string;
    status: "VERIFIED" | "INFERRED" | "UNKNOWN";
    confidence: number;
    sourceUrl: string;
    sourceTitle: string;
    retrievalDate: string;
    notes: string;
  }>;
  tenderMatches: LegacyTenderMatch[];
  scores: { technicalFit: number; exportReadiness: number; evidenceCompleteness: number; overallReadiness: number };
  risks: string[];
  verificationQuestions: string[];
};

export type StorageLike = Pick<Storage, "getItem" | "setItem" | "removeItem">;

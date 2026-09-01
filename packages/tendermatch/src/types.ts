/**
 * TenderMatch is the active TenderApps product identity.
 *
 * The package path and frozen TB fixture identities remain unchanged so the
 * migrated source and historical Cases stay traceable to TenderBoost AI.
 */
export const TENDERMATCH_SCHEMA_VERSION = "3.0.0" as const;
export const TENDERMATCH_ENGINE_VERSION = "tendermatch-evaluation/3.0.0" as const;
export const TENDERMATCH_AUDITED_MATCH_POLICY_VERSION = "tendermatch-audited-match/3.0.0" as const;
export const TENDERMATCH_DEADLINE_CONTEXT_POLICY_VERSION = "tendermatch-deadline-context/3.0.0" as const;
export const TENDERBOOST_LEGACY_SCHEMA_VERSION = "1.0.0" as const;
export const TENDERBOOST_STAGE_2_SCHEMA_VERSION = "2.0.0" as const;
export const TENDERBOOST_LEGACY_BASELINE_POLICY_VERSION = "tenderboost-legacy-baseline/1.0.0" as const;
export const TENDERBOOST_DEMO_SNAPSHOT_ID = "snapshot:TB-DEMO-2026-08-15" as const;
export const TENDERBOOST_DEMO_AS_OF = "2026-08-15T00:00:00+05:00" as const;
export const TENDERMATCH_PILOT_SNAPSHOT_SCHEMA_VERSION = "tendermatch-tender-snapshot/1.0.0" as const;

export type SourceRole =
  | "AUTHORITATIVE_SOURCE"
  | "STRUCTURE_TEMPLATE"
  | "SUPPORTING_DOCUMENT"
  | "USER_ASSERTION";

export type ValueClass = "SOURCE" | "CALCULATED" | "ESTIMATED" | "ASSUMED" | "MISSING";
export type ConfidenceLevel = "high" | "medium" | "low" | "unknown";
export type EvidenceReviewStatus = "LEGACY_VERIFIED" | "VERIFIED" | "INFERRED" | "STATED_UNVERIFIED" | "UNKNOWN" | "REVIEWED";
export type ConsultantDecision = "pending" | "approved" | "hold" | "rejected";
export type WorkflowState = "preliminary" | "reviewed";

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
  externalRef?: string;
  sourceRef?: string | null;
  sourceNoticeUrl?: string | null;
  title: string;
  object: string;
  description?: string | null;
  procurementType?: string;
  databaseStatus?: "OPEN" | "CLOSED" | "AWARDED" | "CANCELLED" | "UNKNOWN";
  buyer: string;
  financierName?: string | null;
  country: string;
  countryCode?: "KZ" | "KG" | "TJ" | "TM" | "UZ";
  region: string;
  sourceLabel: string;
  sourceIdentity?: { id: string; code: string; name: string; type: string };
  feedIdentity?: { id: string; code: string; name: string; adapterType: string };
  budgetLabel: string;
  budget?: { amount: string | null; currency: string | null; usd: string | null; disclosure: "DISCLOSED" | "NOT_DISCLOSED" };
  publishedAt?: string;
  deadlineAt: string;
  snapshotId: string;
  snapshotAsOf: string;
  contentHash?: string;
  dataVersion?: number;
  lastSyncedAt?: string;
  syncState?: string;
  provenance?: Record<string, string>;
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
  readiness: {
    value: number | null;
    valueClass: "ESTIMATED" | "MISSING";
    method: string;
    status?: import("./supplier-contract.ts").SupplierReadinessStatus;
    label?: string;
  };
  technicalFit: number | null;
  exportReadiness: number | null;
  legacyEvidenceCompleteness: number | null;
  risks: string[];
  verificationQuestions: string[];
  snapshotId: string;
  sourceKind?: "LEGACY_FIXTURE" | "NEON_SUPPLIER_V1_3";
  profile?: import("./supplier-contract.ts").SupplierProfileApiRecord;
};

export type EvidenceLinkedClaim = {
  id: string;
  text: string;
  evidenceIds: string[];
  linkage: "lexical" | "unresolved";
};

export type AuditedComponentCode =
  | "technical-relevance"
  | "market-delivery"
  | "capacity-delivery"
  | "comparable-experience"
  | "financial-procurement-readiness"
  | "works-technical-relevance"
  | "similar-contracts"
  | "personnel-equipment-capacity"
  | "mobilization-local-delivery";
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
  | "LEGACY_SCORE_NOT_REPRODUCED"
  | import("./exploratory-matching.ts").ExploratoryReasonCode;

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
  fitLevel?: 0 | 1 | 2 | 3 | 4 | 5 | null;
  weightedPoints?: number | null;
  applicable?: boolean;
};

export type TenderMatchPairStatus =
  | "BINGO_MATCH"
  | "STRONG_CANDIDATE"
  | "POTENTIAL_MATCH"
  | "NEEDS_VERIFICATION"
  | "NO_MATCH"
  | "BLOCKED_INELIGIBLE"
  | "UNASSESSED";

export type TenderMatchGateState = "PASS" | "FAIL" | "UNKNOWN" | "NOT_APPLICABLE";

export type TenderMatchMandatoryGate = {
  code: string;
  label: string;
  state: TenderMatchGateState;
  evidenceIds: string[];
  rationale: string;
};

export type AuditedMatchResult = {
  engineVersion: string;
  policyVersion: string;
  value: number | null;
  valueClass: "ESTIMATED" | "MISSING";
  label: "strong" | "review" | "weak" | "insufficient-evidence" | "exploratory-technical-fit";
  components: AuditedScoreComponent[];
  evidenceIds: string[];
  reasonCodes: AuditedReasonCode[];
  missingInputs: string[];
  legacyScore: number | null;
  legacyDelta: number | null;
  method: string;
  status?: TenderMatchPairStatus;
  dataCoverage?: number;
  evidenceConfidence?: number;
  gates?: TenderMatchMandatoryGate[];
  mainReason?: string;
  blockers?: string[];
  noticeLabel?: "Preliminary notice-level match";
};

export type LegacyBaselineMetrics = {
  policyVersion: string;
  matchScore: number | null;
  supplierReadiness: number | null;
  globalVerificationQuality: number;
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
  supplierReadiness: { value: number | null; valueClass: "ESTIMATED" | "MISSING"; method: string; status?: import("./supplier-contract.ts").SupplierReadinessStatus; label?: string };
  verificationQuality: CalculatedMetric;
  deadlineUrgency: CalculatedMetric;
  consultantDecision: ConsultantDecision;
  decisionHistory: MatchDecisionRecord[];
  linkedStrengths: EvidenceLinkedClaim[];
  inferredStrengths: string[];
  unsupportedStrengths: string[];
  gaps: string[];
  trust: TrustDimensions;
  tenderFreshness: TenderFreshness;
};

export type ReviewFindingCode =
  | "MATCH_UNASSESSED"
  | "AUDITED_MATCH_REQUIRED"
  | "TENDER_CLOSED"
  | "SNAPSHOT_STALE"
  | "MATERIAL_RISK_HANDOFF"
  | "EVIDENCE_REFRESH_REQUIRED";

export type ReviewFinding = {
  code: ReviewFindingCode;
  message: string;
  nextAction: string;
  ownerAgentId: string;
};

export type ConsultantReviewSupport = {
  readyForCurrentDecision: boolean;
  findings: ReviewFinding[];
};

export type TenderMatchCaseResult = {
  schemaVersion: typeof TENDERMATCH_SCHEMA_VERSION;
  engineVersion: typeof TENDERMATCH_ENGINE_VERSION;
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
  reviewSupport: ConsultantReviewSupport;
  knownLimitations: string[];
  migration: {
    status: "native-current" | "compatible-historical";
    fromSchemaVersion: string | null;
    sourceProductName: "TenderBoost AI" | null;
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

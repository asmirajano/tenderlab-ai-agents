import type { EvidenceRecord, SupplierRecord } from "./types.ts";

export const TENDERMATCH_SUPPLIER_CONTRACT_VERSION = "tendermatch-supplier-goods-works-v1.3" as const;
export const TENDERMATCH_SUPPLIER_PROFILE_VERSION = "v1.3-critical-evidence-corrected-2026-09-01" as const;
export const TENDERMATCH_SUPPLIER_BATCH_CODE = "accio-goods-works-suppliers-2026-09-01-v1.3-critical-evidence-corrected-db-staged" as const;
export const TENDERMATCH_SUPPLIER_EXPECTED_PROFILE_COUNT = 17 as const;
export const TENDERMATCH_SUPPLIER_EXPECTED_EVIDENCE_COUNT = 289 as const;
export const TENDERMATCH_SUPPLIER_EXPECTED_ARTIFACT_COUNT = 243 as const;
export const TENDERMATCH_SUPPLIER_CURRENT_PROFILE_VIEW = "current_supplier_profiles" as const;
export const TENDERMATCH_SUPPLIER_CURRENT_EVIDENCE_VIEW = "current_supplier_evidence" as const;
export const TENDERMATCH_SUPPLIER_VERSIONED_PROFILE_VIEW = "supplier_profiles_goods_works_v1_3" as const;
export const TENDERMATCH_SUPPLIER_VERSIONED_EVIDENCE_VIEW = "supplier_evidence_goods_works_v1_3" as const;
export const TENDERMATCH_SUPPLIER_CONSUMER_ROLE = "tendermatch_supplier_consumer_dev" as const;

export type SupplierReadinessStatus = "ready_for_exploratory_matching" | "usable_with_limitations" | "requires_enrichment" | "exclude_from_current_matching_run";
export type SupplierEvidenceStatus = "VERIFIED" | "INFERRED" | "STATED_UNVERIFIED" | "UNKNOWN";
export type SupplierClassification = "GOODS" | "WORKS";

export type SupplierProfileApiRecord = {
  canonicalEntityId: string;
  profileVersionId: string;
  profileVersion: string;
  batchId: string;
  batchCode: string;
  sourceCandidateId: string;
  legalName: string;
  displayName: string;
  countryCode: string | null;
  city: string | null;
  region: string | null;
  classification: SupplierClassification;
  productFamilies: unknown;
  worksSpecializations: unknown;
  industriesServed: unknown;
  materials: unknown;
  certifications: unknown;
  operatingGeography: unknown;
  capacity: unknown;
  revenueOrTurnover: unknown;
  readinessStatus: SupplierReadinessStatus;
  readinessReasons: unknown;
  readinessGateResults: unknown;
  readinessContractVersion: string;
  verificationStatus: "under_review";
  coverageSummary: unknown;
  evidenceClaimCount: number;
  evidenceVerifiedCount: number;
  evidenceInferredCount: number;
  evidenceStatedUnverifiedCount: number;
  evidenceUnknownCount: number;
  claimsWithSavedArtifact: number;
  sourceRecordIds: string[];
  sourceArtifactIds: string[];
};

export type SupplierEvidenceApiRecord = {
  canonicalEntityId: string;
  profileVersionId: string;
  claimId: string;
  externalClaimId: string | null;
  field: string;
  value: string | null;
  normalizedValue: unknown;
  status: SupplierEvidenceStatus;
  sourceSystem: string | null;
  sourceTitle: string | null;
  sourceUrl: string | null;
  retrievedAt: string;
  sourceRecordId: string;
  sourceArtifactId: string | null;
  artifactAvailable: boolean;
  artifactStatus: string;
  artifactSha256: string | null;
  artifactLimitation: string;
};

export type SupplierDatasetSummary = {
  contractVersion: typeof TENDERMATCH_SUPPLIER_CONTRACT_VERSION;
  profileVersion: typeof TENDERMATCH_SUPPLIER_PROFILE_VERSION;
  batchCode: typeof TENDERMATCH_SUPPLIER_BATCH_CODE;
  consumerRole: typeof TENDERMATCH_SUPPLIER_CONSUMER_ROLE;
  views: {
    currentProfiles: typeof TENDERMATCH_SUPPLIER_CURRENT_PROFILE_VIEW;
    currentEvidence: typeof TENDERMATCH_SUPPLIER_CURRENT_EVIDENCE_VIEW;
    versionedProfiles: typeof TENDERMATCH_SUPPLIER_VERSIONED_PROFILE_VIEW;
    versionedEvidence: typeof TENDERMATCH_SUPPLIER_VERSIONED_EVIDENCE_VIEW;
  };
  profileCount: number;
  evidenceCount: number;
  classification: Record<SupplierClassification, number>;
  readiness: Record<SupplierReadinessStatus, number>;
  profileClaims: Record<SupplierEvidenceStatus, number>;
  evidenceStatuses: Record<SupplierEvidenceStatus, number>;
  artifacts: { available: number; unavailable: number };
  retrievedAt: string;
};

export type TenderMatchRuntimePayload = {
  status: "ready";
  mode: "neon-read-only";
  summary: SupplierDatasetSummary;
  suppliers: SupplierProfileApiRecord[];
  evaluations: import("./exploratory-matching.ts").ExploratoryMatchEvaluation[];
  evaluationSummary: import("./exploratory-matching.ts").ExploratoryEvaluationSummary;
};

export function stringsFromStructuredValue(value: unknown): string[] {
  if (typeof value === "string") return value.trim() && !/^(unknown|n\/a)$/i.test(value.trim()) ? [value.trim()] : [];
  if (Array.isArray(value)) return value.flatMap(stringsFromStructuredValue);
  if (value && typeof value === "object") return Object.values(value as Record<string, unknown>).flatMap(stringsFromStructuredValue);
  return [];
}

export function readinessLabel(status: SupplierReadinessStatus) {
  if (status === "ready_for_exploratory_matching") return "Ready for exploratory matching";
  if (status === "usable_with_limitations") return "Usable with limitations";
  if (status === "requires_enrichment") return "Requires enrichment";
  return "Excluded from current matching run";
}

export function mapSupplierProfileToWorkspace(profile: SupplierProfileApiRecord, evidence: SupplierEvidenceApiRecord[] = []): SupplierRecord {
  const evidenceRecords: EvidenceRecord[] = evidence.map((record) => ({
    id: `evidence:NEON:${record.claimId}`,
    version: profile.profileVersion,
    supplierId: `supplier:NEON:${profile.canonicalEntityId}`,
    field: record.field,
    value: record.value ?? "",
    reviewStatus: record.status,
    confidence: 0,
    sourceTitle: record.sourceTitle ?? record.sourceSystem ?? "Source record",
    sourceUrl: record.sourceUrl ?? "",
    retrievedAt: record.retrievedAt,
    notes: record.artifactAvailable ? "Saved source artifact linked." : record.artifactLimitation,
    sourceRole: "SUPPORTING_DOCUMENT",
    valueClass: record.status === "UNKNOWN" ? "MISSING" : "SOURCE",
  }));

  const productFamilies = stringsFromStructuredValue(profile.productFamilies);
  const worksSpecializations = stringsFromStructuredValue(profile.worksSpecializations);
  const industries = stringsFromStructuredValue(profile.industriesServed);
  const geography = stringsFromStructuredValue(profile.operatingGeography);
  return {
    id: `supplier:NEON:${profile.canonicalEntityId}`,
    version: profile.profileVersion,
    legalEnglishName: profile.displayName,
    legalChineseName: "",
    headquarters: { city: profile.city ?? "Unknown / not disclosed", province: profile.region ?? "", country: profile.countryCode ?? "Unknown" },
    companyType: [profile.classification],
    officialWebsite: "",
    categories: [...productFamilies, ...worksSpecializations, ...industries],
    capabilities: [...productFamilies, ...worksSpecializations],
    products: productFamilies,
    exportMarkets: geography,
    evidence: evidenceRecords,
    legacyTenderMatches: [],
    readiness: { value: null, valueClass: "MISSING", method: "Readiness is a source state, not a numeric Match Score.", status: profile.readinessStatus, label: readinessLabel(profile.readinessStatus) },
    technicalFit: null,
    exportReadiness: null,
    legacyEvidenceCompleteness: null,
    risks: [],
    verificationQuestions: stringsFromStructuredValue(profile.readinessReasons),
    snapshotId: `supplier-batch:${profile.batchCode}`,
    sourceKind: "NEON_SUPPLIER_V1_3",
    profile,
  };
}

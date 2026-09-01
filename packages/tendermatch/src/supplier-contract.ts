import type { EvidenceRecord, SupplierRecord } from "./types.ts";

export const TENDERMATCH_SUPPLIER_CONTRACT_VERSION = "tendermatch-supplier-read-contract-v1" as const;
export const TENDERMATCH_SUPPLIER_PROFILE_VERSION = "v2.1-policy-corrected-2026-09-01" as const;
export const TENDERMATCH_SUPPLIER_BATCH_CODE = "accio-neutral-suppliers-2026-09-01-v2.1-policy-corrected" as const;
export const TENDERMATCH_SUPPLIER_EXPECTED_PROFILE_COUNT = 100 as const;
export const TENDERMATCH_SUPPLIER_EXPECTED_EVIDENCE_COUNT = 2300 as const;

export type SupplierReadinessStatus =
  | "ready_for_exploratory_matching"
  | "usable_with_limitations"
  | "requires_enrichment"
  | "exclude_from_current_matching_run";

export type SupplierEvidenceStatus = "VERIFIED" | "INFERRED" | "UNKNOWN";

export type SupplierProfileApiRecord = {
  canonicalEntityId: string;
  profileVersionId: string;
  profileVersion: string;
  batchId: string;
  batchCode: string;
  legalName: string;
  displayName: string;
  countryCode: string | null;
  canonicalMarketplaceProfileUrl: string | null;
  operatingGeography: unknown;
  mainActivity: string | null;
  productPortfolio: unknown;
  productCategories: unknown;
  materialsSpecifications: unknown;
  capabilities: unknown;
  capacity: unknown;
  certifications: unknown;
  exportMarkets: unknown;
  localPresence: unknown;
  serviceCapabilities: unknown;
  commercialTerms: unknown;
  comparableReferences: unknown;
  scaleIndicators: unknown;
  complianceAndIntegrity: unknown;
  unresolvedChecks: unknown;
  readinessStatus: SupplierReadinessStatus;
  readinessReasons: unknown;
  readinessGateResults: unknown;
  readinessContractVersion: string;
  verificationStatus: "under_review";
  coverageSummary: unknown;
  evidenceClaimCount: number;
  evidenceVerifiedCount: number;
  evidenceInferredCount: number;
  evidenceUnknownCount: number;
  claimsWithSavedArtifact: number;
  sourceRecordIds: string[];
  sourceArtifactIds: string[];
};

export type SupplierEvidenceApiRecord = {
  canonicalEntityId: string;
  profileVersionId: string;
  claimId: string;
  field: string;
  value: string | null;
  status: SupplierEvidenceStatus;
  sourceTitle: string | null;
  sourceUrl: string | null;
  retrievedAt: string;
  sourceRecordId: string;
  sourceArtifactId: string | null;
  artifactAvailable: boolean;
  artifactStatus: string;
  artifactSha256: string | null;
  artifactLimitation: string;
  supersedesClaimId: string | null;
  policyCorrectionCode: string | null;
};

export type SupplierDatasetSummary = {
  contractVersion: typeof TENDERMATCH_SUPPLIER_CONTRACT_VERSION;
  profileVersion: typeof TENDERMATCH_SUPPLIER_PROFILE_VERSION;
  batchCode: typeof TENDERMATCH_SUPPLIER_BATCH_CODE;
  profileCount: number;
  evidenceCount: number;
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
    sourceTitle: record.sourceTitle ?? "Source record",
    sourceUrl: record.sourceUrl ?? "",
    retrievedAt: record.retrievedAt,
    notes: record.artifactAvailable ? "Saved source artifact linked." : record.artifactLimitation,
    sourceRole: "SUPPORTING_DOCUMENT",
    valueClass: record.status === "UNKNOWN" ? "MISSING" : "SOURCE",
  }));

  const country = profile.countryCode ?? "Unknown";
  const geography = stringsFromStructuredValue(profile.operatingGeography);
  return {
    id: `supplier:NEON:${profile.canonicalEntityId}`,
    version: profile.profileVersion,
    legalEnglishName: profile.displayName,
    legalChineseName: "",
    headquarters: { city: geography[0] ?? "Unknown / not disclosed", province: "", country },
    companyType: [],
    officialWebsite: profile.canonicalMarketplaceProfileUrl ?? "",
    categories: stringsFromStructuredValue(profile.productCategories),
    capabilities: [...stringsFromStructuredValue(profile.capabilities), ...stringsFromStructuredValue(profile.serviceCapabilities)],
    products: stringsFromStructuredValue(profile.productPortfolio),
    exportMarkets: stringsFromStructuredValue(profile.exportMarkets),
    evidence: evidenceRecords,
    legacyTenderMatches: [],
    readiness: {
      value: null,
      valueClass: "MISSING",
      method: "Readiness is a source state, not a numeric Match Score.",
      status: profile.readinessStatus,
      label: readinessLabel(profile.readinessStatus),
    },
    technicalFit: null,
    exportReadiness: null,
    legacyEvidenceCompleteness: null,
    risks: stringsFromStructuredValue(profile.complianceAndIntegrity),
    verificationQuestions: stringsFromStructuredValue(profile.unresolvedChecks),
    snapshotId: `supplier-batch:${profile.batchCode}`,
    sourceKind: "NEON_SUPPLIER_V2_1",
    profile: profile,
  };
}

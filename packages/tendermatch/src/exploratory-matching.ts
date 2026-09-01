import type { SupplierEvidenceApiRecord, SupplierProfileApiRecord } from "./supplier-contract.ts";
import type { ConsultantDecision, MatchAssessment, TenderFreshness, TenderRecord } from "./types.ts";
import { calculateDeadlineUrgency, deriveTenderFreshness } from "./engine.ts";

export const TENDERMATCH_EXPLORATORY_ENGINE_VERSION = "tendermatch-exploratory-fit/5.0.0" as const;
export const TENDERMATCH_EXPLORATORY_POLICY_VERSION = "tendermatch-goods-works-evidence-overlap/2.0.0" as const;

const TECHNICAL_FIELDS = new Set([
  "product_families",
  "works_specializations",
  "industries_served",
  "materials",
]);

const MARKET_FIELDS = new Set(["geographic_markets"]);
const GENERIC = new Set([
  "about", "all", "and", "based", "company", "consultant", "consulting", "contract", "development", "equipment",
  "firm", "for", "from", "goods", "implementation", "international", "manufacturer", "manufacturing", "market", "new",
  "other", "product", "products", "program", "project", "provision", "services", "supplier", "supply", "support", "system",
  "tender", "the", "this", "under", "with", "works",
]);

const CONCEPTS: Record<string, string[]> = {
  furniture: ["furniture", "chair", "chairs", "desk", "desks", "table", "tables", "cabinet", "sofa", "seating"],
  "medical-diagnostics": ["medical", "diagnostic", "cardiology", "ultrasound", "treadmill", "monitor", "healthcare"],
  "electrical-grid": ["electrical", "electricity", "substation", "transformer", "voltage", "grid", "relay", "switchgear"],
  construction: ["construction", "building", "prefab", "modular", "steel", "civil", "reconstruction"],
  water: ["water", "wastewater", "irrigation", "drainage", "sewerage", "treatment", "pump", "pumps"],
  road: ["road", "highway", "transport", "pavement", "bridge", "asphalt"],
  packaging: ["packaging", "plastic", "bag", "bags", "film", "paper", "carton"],
  agriculture: ["agriculture", "agricultural", "farm", "farming", "irrigation"],
  digital: ["digital", "software", "devops", "data", "technology", "it"],
  education: ["education", "school", "training", "learning"],
  climate: ["climate", "environmental", "sustainability", "resilient"],
  finance: ["financial", "finance", "insurance", "investment", "credit"],
  events: ["event", "events", "fair", "exhibition", "b2b"],
};

const ALIAS_TO_CONCEPT = new Map(Object.entries(CONCEPTS).flatMap(([concept, aliases]) => aliases.map((alias) => [alias, concept] as const)));

export type ExploratoryReasonCode =
  | "EXPLORATORY_TECHNICAL_FIT_AVAILABLE"
  | "INSUFFICIENT_RELEVANT_EVIDENCE"
  | "INSUFFICIENT_NORMALIZED_OVERLAP"
  | "SUPPLIER_REQUIRES_ENRICHMENT"
  | "SUPPLIER_EXCLUDED"
  | "NO_VERIFIED_SUPPLIER_CLAIMS"
  | "COMPLIANCE_UNKNOWN"
  | "REFERENCES_UNKNOWN"
  | "MARKET_DELIVERY_UNKNOWN"
  | "MARKET_DELIVERY_SUPPORTED"
  | "CITED_ARTIFACT_UNAVAILABLE"
  | "PROCUREMENT_CLASSIFICATION_MISMATCH"
  | "STATED_UNVERIFIED_INPUT"
  | "CAPACITY_NOT_USED_IN_TECHNICAL_FIT"
  | "TURNOVER_NOT_USED_IN_TECHNICAL_FIT"
  | "TENDER_NOT_CURRENT";

export type ExploratoryMatchEvaluation = {
  id: string;
  key: string;
  tenderId: string;
  tenderReference: string;
  tenderSnapshotId: string;
  tenderVersion: string;
  supplierId: string;
  supplierProfileVersionId: string;
  supplierProfileVersion: string;
  supplierBatchCode: string;
  engineVersion: typeof TENDERMATCH_EXPLORATORY_ENGINE_VERSION;
  policyVersion: typeof TENDERMATCH_EXPLORATORY_POLICY_VERSION;
  evaluatedAt: string;
  value: number | null;
  valueClass: "ESTIMATED" | "MISSING";
  label: "exploratory-technical-fit" | "insufficient-evidence";
  technicalRelevance: {
    value: number | null;
    matchedConcepts: string[];
    matchedTerms: string[];
    evidenceIds: string[];
    reasonCodes: ExploratoryReasonCode[];
  };
  procurementApplicability: { supplierClassification: SupplierProfileApiRecord["classification"]; tenderProcurementType: string; compatible: boolean };
  marketDelivery: {
    value: null;
    state: "supported" | "unknown";
    evidenceIds: string[];
    reasonCodes: ExploratoryReasonCode[];
  };
  capacity: { value: null; state: "stated-unverified" | "unknown"; evidenceIds: string[]; usedInTechnicalFit: false };
  turnover: { value: null; state: "stated-unverified" | "unknown"; evidenceIds: string[]; usedInTechnicalFit: false };
  evidenceCoverage: { cited: number; availableArtifacts: number; unavailableArtifacts: number };
  supplierReadinessStatus: SupplierProfileApiRecord["readinessStatus"];
  verificationStatus: "under_review";
  eligibility: "unknown";
  compliance: "unknown" | "source-finding-present";
  references: "present-inferred" | "unknown";
  freshness: TenderFreshness;
  reasonCodes: ExploratoryReasonCode[];
  limitations: string[];
  consultantDecision: ConsultantDecision;
};

export type ExploratoryEvaluationSummary = {
  total: number;
  numeric: number;
  missing: number;
  byReason: Record<string, number>;
  engineVersion: typeof TENDERMATCH_EXPLORATORY_ENGINE_VERSION;
  policyVersion: typeof TENDERMATCH_EXPLORATORY_POLICY_VERSION;
  evaluatedAt: string;
};

function plainText(value: string | null | undefined) {
  return (value ?? "").replace(/<[^>]*>/g, " ").replace(/&[a-z0-9#]+;/gi, " ");
}

function tokens(value: string) {
  return new Set(value.toLowerCase().split(/[^\p{L}\p{N}]+/u).filter((token) => token.length > 2 && !GENERIC.has(token)));
}

function concepts(tokenSet: Set<string>) {
  return new Set([...tokenSet].map((token) => ALIAS_TO_CONCEPT.get(token)).filter((value): value is string => Boolean(value)));
}

function tenderCorpora(tender: TenderRecord) {
  return {
    primary: [tender.title, tender.object, tender.procurementType].map(plainText).join(" "),
    complete: [tender.title, tender.object, tender.description, tender.procurementType, tender.country, tender.region, ...tender.tags].map(plainText).join(" "),
  };
}

function stableIdPart(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 64);
}

function isUnknownClaim(record: SupplierEvidenceApiRecord | undefined) {
  return !record || record.status === "UNKNOWN" || !record.value || /^(unknown|n\/a)$/i.test(record.value.trim());
}

export function evaluateExploratoryPair(
  tender: TenderRecord,
  supplier: SupplierProfileApiRecord,
  evidence: SupplierEvidenceApiRecord[],
  evaluatedAt: string,
): ExploratoryMatchEvaluation {
  const supplierEvidence = evidence.filter((record) => record.canonicalEntityId === supplier.canonicalEntityId);
  const technicalClaims = supplierEvidence.filter((record) => TECHNICAL_FIELDS.has(record.field) && (record.status === "INFERRED" || record.status === "STATED_UNVERIFIED") && Boolean(record.value?.trim()));
  const tenderText = tenderCorpora(tender);
  const tenderTokens = tokens(tenderText.complete);
  const tenderPrimaryTokens = tokens(tenderText.primary);
  const tenderConcepts = concepts(tenderTokens);
  const tenderPrimaryConcepts = concepts(tenderPrimaryTokens);
  const overlapCandidates = technicalClaims.map((record) => {
    const claimTokens = tokens(record.value ?? "");
    const direct = [...claimTokens].filter((token) => tenderTokens.has(token));
    const sharedConcepts = [...concepts(claimTokens)].filter((concept) => tenderConcepts.has(concept));
    const primaryDirect = [...claimTokens].filter((token) => tenderPrimaryTokens.has(token));
    const primaryConcepts = [...concepts(claimTokens)].filter((concept) => tenderPrimaryConcepts.has(concept));
    return { record, direct, concepts: sharedConcepts, primaryDirect, primaryConcepts };
  }).filter((candidate) => candidate.direct.length > 0 || candidate.concepts.length > 0);
  const cited = overlapCandidates.filter((candidate) => candidate.record.artifactAvailable);
  const matchedTerms = [...new Set(cited.flatMap((candidate) => candidate.direct))].sort();
  const matchedConcepts = [...new Set(cited.flatMap((candidate) => candidate.concepts))].sort();
  const matchedPrimaryTerms = [...new Set(cited.flatMap((candidate) => candidate.primaryDirect))].sort();
  const matchedPrimaryConcepts = [...new Set(cited.flatMap((candidate) => candidate.primaryConcepts))].sort();
  const evidenceIds = cited.map((candidate) => candidate.record.claimId).sort();
  const artifactAvailable = cited.filter((candidate) => candidate.record.artifactAvailable).length;
  const supplierBlocked = supplier.readinessStatus === "exclude_from_current_matching_run";
  const procurementEligible = (tender.procurementType === "GOODS" || tender.procurementType === "WORKS") && tender.procurementType === supplier.classification;
  const thresholdMet = !supplierBlocked
    && procurementEligible
    && cited.length >= 2
    && artifactAvailable >= 1
    && matchedPrimaryConcepts.length >= 1
    && (matchedPrimaryTerms.length >= 1 || matchedTerms.length >= 3);

  const technicalReasonCodes: ExploratoryReasonCode[] = [];
  if (supplierBlocked) technicalReasonCodes.push("SUPPLIER_EXCLUDED");
  if (supplier.readinessStatus === "requires_enrichment") technicalReasonCodes.push("SUPPLIER_REQUIRES_ENRICHMENT");
  if (!procurementEligible) technicalReasonCodes.push("PROCUREMENT_CLASSIFICATION_MISMATCH");
  if (cited.length < 2) technicalReasonCodes.push("INSUFFICIENT_RELEVANT_EVIDENCE");
  if (matchedPrimaryConcepts.length < 1 || (matchedPrimaryTerms.length < 1 && matchedTerms.length < 3)) technicalReasonCodes.push("INSUFFICIENT_NORMALIZED_OVERLAP");
  if (thresholdMet) technicalReasonCodes.push("EXPLORATORY_TECHNICAL_FIT_AVAILABLE");

  const technicalValue = thresholdMet
    ? Math.min(85, Math.round((40 + Math.min(20, matchedConcepts.length * 10) + Math.min(15, matchedTerms.length * 3) + Math.min(10, Math.max(0, cited.length - 2) * 2)) / 5) * 5)
    : null;

  const countryTokens = tokens(`${tender.country} ${tender.countryCode ?? ""} Central Asia`);
  const marketClaims = supplierEvidence.filter((record) => MARKET_FIELDS.has(record.field) && record.status === "STATED_UNVERIFIED" && record.artifactAvailable && Boolean(record.value?.trim()));
  const supportedMarket = marketClaims.filter((record) => [...tokens(record.value ?? "")].some((token) => countryTokens.has(token)));
  const marketState = supportedMarket.length ? "supported" as const : "unknown" as const;
  const freshness = deriveTenderFreshness(tender, evaluatedAt);
  const complianceClaim = undefined;
  const referenceClaim = undefined;
  const capacityClaims = supplierEvidence.filter((record) => record.field === "capacity" && record.status === "STATED_UNVERIFIED" && record.artifactAvailable);
  const turnoverClaims = supplierEvidence.filter((record) => record.field === "financial" && record.status === "STATED_UNVERIFIED" && record.artifactAvailable);
  const reasonCodes = [...technicalReasonCodes, "NO_VERIFIED_SUPPLIER_CLAIMS" as const, "CAPACITY_NOT_USED_IN_TECHNICAL_FIT" as const, "TURNOVER_NOT_USED_IN_TECHNICAL_FIT" as const];
  if (cited.some((candidate) => candidate.record.status === "STATED_UNVERIFIED")) reasonCodes.push("STATED_UNVERIFIED_INPUT");
  reasonCodes.push(marketState === "supported" ? "MARKET_DELIVERY_SUPPORTED" : "MARKET_DELIVERY_UNKNOWN");
  if (isUnknownClaim(complianceClaim)) reasonCodes.push("COMPLIANCE_UNKNOWN");
  if (isUnknownClaim(referenceClaim)) reasonCodes.push("REFERENCES_UNKNOWN");
  if (overlapCandidates.some((candidate) => !candidate.record.artifactAvailable)) reasonCodes.push("CITED_ARTIFACT_UNAVAILABLE");
  if (freshness.status === "closed") reasonCodes.push("TENDER_NOT_CURRENT");

  const limitations = [
    "All supplier claims are under review; this v1.3 batch contains zero VERIFIED claims.",
    "STATED_UNVERIFIED claims are exploratory inputs only when linked to a saved artifact; they are never presented as VERIFIED.",
    "Technical relevance is exploratory and does not establish eligibility, compliance, capacity, delivery, price, or past performance.",
    "Capacity and revenue/turnover remain separate source claims and are not used in technical fit unless a comparable tender requirement is explicitly mapped and reviewed.",
    marketState === "unknown" ? "Market and delivery fit remain UNKNOWN; absence of a market claim is not negative evidence." : "A source claim overlaps the tender market, but delivery feasibility remains unverified.",
    isUnknownClaim(complianceClaim) ? "Independent compliance and integrity screening is UNKNOWN." : "A source-backed compliance finding exists; it is not a clearance.",
    isUnknownClaim(referenceClaim) ? "Comparable project references are UNKNOWN." : "Comparable references are inferred and require review.",
  ];

  return {
    id: `evaluation:TM:${stableIdPart(tender.id)}:${supplier.canonicalEntityId}`,
    key: `${tender.id}::supplier:NEON:${supplier.canonicalEntityId}`,
    tenderId: tender.id,
    tenderReference: tender.reference,
    tenderSnapshotId: tender.snapshotId,
    tenderVersion: tender.version,
    supplierId: `supplier:NEON:${supplier.canonicalEntityId}`,
    supplierProfileVersionId: supplier.profileVersionId,
    supplierProfileVersion: supplier.profileVersion,
    supplierBatchCode: supplier.batchCode,
    engineVersion: TENDERMATCH_EXPLORATORY_ENGINE_VERSION,
    policyVersion: TENDERMATCH_EXPLORATORY_POLICY_VERSION,
    evaluatedAt,
    value: technicalValue,
    valueClass: technicalValue === null ? "MISSING" : "ESTIMATED",
    label: technicalValue === null ? "insufficient-evidence" : "exploratory-technical-fit",
    technicalRelevance: { value: technicalValue, matchedConcepts, matchedTerms, evidenceIds, reasonCodes: technicalReasonCodes },
    procurementApplicability: { supplierClassification: supplier.classification, tenderProcurementType: tender.procurementType ?? "UNKNOWN", compatible: procurementEligible },
    marketDelivery: {
      value: null,
      state: marketState,
      evidenceIds: supportedMarket.map((record) => record.claimId).sort(),
      reasonCodes: [marketState === "supported" ? "MARKET_DELIVERY_SUPPORTED" : "MARKET_DELIVERY_UNKNOWN"],
    },
    capacity: { value: null, state: capacityClaims.length ? "stated-unverified" : "unknown", evidenceIds: capacityClaims.map((record) => record.claimId).sort(), usedInTechnicalFit: false },
    turnover: { value: null, state: turnoverClaims.length ? "stated-unverified" : "unknown", evidenceIds: turnoverClaims.map((record) => record.claimId).sort(), usedInTechnicalFit: false },
    evidenceCoverage: {
      cited: overlapCandidates.length,
      availableArtifacts: artifactAvailable,
      unavailableArtifacts: overlapCandidates.length - artifactAvailable,
    },
    supplierReadinessStatus: supplier.readinessStatus,
    verificationStatus: "under_review",
    eligibility: "unknown",
    compliance: isUnknownClaim(complianceClaim) ? "unknown" : "source-finding-present",
    references: isUnknownClaim(referenceClaim) ? "unknown" : "present-inferred",
    freshness,
    reasonCodes: [...new Set(reasonCodes)],
    limitations,
    consultantDecision: "pending",
  };
}

export function buildExploratoryEvaluationInventory(
  tenders: TenderRecord[],
  suppliers: SupplierProfileApiRecord[],
  evidence: SupplierEvidenceApiRecord[],
  evaluatedAt: string,
) {
  const evaluations = tenders.flatMap((tender) => suppliers.map((supplier) => evaluateExploratoryPair(tender, supplier, evidence, evaluatedAt)));
  evaluations.sort((left, right) => left.key.localeCompare(right.key));
  return evaluations;
}

export function summarizeExploratoryEvaluations(evaluations: ExploratoryMatchEvaluation[]): ExploratoryEvaluationSummary {
  const byReason: Record<string, number> = {};
  for (const evaluation of evaluations) for (const reason of evaluation.reasonCodes) byReason[reason] = (byReason[reason] ?? 0) + 1;
  return {
    total: evaluations.length,
    numeric: evaluations.filter((entry) => entry.value !== null).length,
    missing: evaluations.filter((entry) => entry.value === null).length,
    byReason,
    engineVersion: TENDERMATCH_EXPLORATORY_ENGINE_VERSION,
    policyVersion: TENDERMATCH_EXPLORATORY_POLICY_VERSION,
    evaluatedAt: evaluations[0]?.evaluatedAt ?? "",
  };
}

export function assessmentFromExploratoryEvaluation(evaluation: ExploratoryMatchEvaluation): MatchAssessment {
  const technical = evaluation.technicalRelevance;
  const market = evaluation.marketDelivery;
  return {
    id: evaluation.id.replace("evaluation:", "match:"),
    version: "v1",
    key: evaluation.key,
    tenderId: evaluation.tenderId,
    supplierId: evaluation.supplierId,
    exactLegacyPair: false,
    matchScore: { value: null, valueClass: "MISSING", method: "No historical or source-authored pair score exists for this Neon supplier and pilot tender." },
    legacyBaseline: {
      policyVersion: "not-applicable/neon-supplier-v1.3",
      matchScore: null,
      supplierReadiness: null,
      globalVerificationQuality: 0,
      method: "Legacy fixture metrics are not applied to Neon supplier identities.",
    },
    auditedMatch: {
      engineVersion: evaluation.engineVersion,
      policyVersion: evaluation.policyVersion,
      value: evaluation.value,
      valueClass: evaluation.valueClass,
      label: evaluation.label,
      components: [
        {
          code: "technical-relevance",
          value: technical.value,
          valueClass: technical.value === null ? "MISSING" : "ESTIMATED",
          weight: 1,
          evidenceIds: technical.evidenceIds,
          evidenceConfidence: null,
          reasonCodes: technical.reasonCodes,
          rationale: technical.value === null
            ? "The minimum evidence-overlap gate was not met."
            : `Exploratory normalized overlap: ${technical.matchedConcepts.join(", ") || technical.matchedTerms.join(", ")}.`,
        },
        {
          code: "market-delivery",
          value: null,
          valueClass: "MISSING",
          weight: 0,
          evidenceIds: market.evidenceIds,
          evidenceConfidence: null,
          reasonCodes: market.reasonCodes,
          rationale: market.state === "supported"
            ? "A market claim overlaps the tender geography; delivery feasibility remains unverified."
            : "Market and delivery fit remain UNKNOWN and are not blended into technical relevance.",
        },
      ],
      evidenceIds: [...new Set([...technical.evidenceIds, ...market.evidenceIds])],
      reasonCodes: evaluation.reasonCodes,
      missingInputs: evaluation.value === null ? ["Minimum source-grounded technical evidence overlap"] : [],
      legacyScore: null,
      legacyDelta: null,
      method: "Exploratory technical relevance only. Market/delivery, eligibility, compliance, references, readiness, freshness, and human disposition remain separate.",
    },
    supplierReadiness: {
      value: null,
      valueClass: "MISSING",
      method: "Supplier readiness is retained as a source state and is never converted to a numeric Match Score.",
      status: evaluation.supplierReadinessStatus,
    },
    verificationQuality: {
      value: null,
      valueClass: "MISSING",
      policyVersion: evaluation.policyVersion,
      evidenceIds: technical.evidenceIds,
      reasonCodes: ["NO_VERIFIED_SUPPLIER_CLAIMS"],
      method: "This supplier batch contains zero VERIFIED claims; evidence quality is not inflated into a percentage.",
    },
    deadlineUrgency: calculateDeadlineUrgency(evaluation.freshness),
    consultantDecision: evaluation.consultantDecision,
    decisionHistory: [],
    linkedStrengths: technical.value === null ? [] : [{
      id: `${evaluation.id}:technical-support`,
      text: `Exploratory overlap: ${[...technical.matchedConcepts, ...technical.matchedTerms].slice(0, 8).join(", ")}`,
      evidenceIds: technical.evidenceIds,
      linkage: "lexical",
    }],
    inferredStrengths: [],
    unsupportedStrengths: [],
    gaps: evaluation.limitations,
    trust: {
      recognition: "high",
      structural: "high",
      semantic: evaluation.value === null ? "low" : "medium",
      arithmeticDomain: "medium",
      humanReview: "unknown",
    },
    tenderFreshness: evaluation.freshness,
  };
}

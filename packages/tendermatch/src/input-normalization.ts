import { exploratoryFeatureRules as rules } from "./exploratory-matching.ts";
import { sha256Content, stableStringify } from "./retrieval-features.ts";
import type { SupplierEvidenceApiRecord, SupplierEvidenceStatus } from "./supplier-contract.ts";

export const INPUT_FEATURE_VERSION = "tendermatch-source-features/2.0.0";
export const INPUT_ADAPTER_VERSION = "tendermatch-source-feature-adapter/1.0.0";
export const INPUT_SCHEMA_VERSION = "tendermatch-source-feature-schema/1.0.0";
export const DESCRIPTION_LIMIT = 12000;
export const CLAIM_LIMIT = 600;
export const SAFE_FIELDS = ["capacity", "certifications", "classification", "compliance_risks", "export_markets", "financial", "geographic_markets", "identity_company_type", "industries_served", "installation_after_sales", "local_presence", "main_activity", "manufacturing_capabilities_capacity", "materials", "materials_specs", "moq_lead_time_incoterms", "product_categories", "product_families", "products_portfolio", "project_references", "turnover_scale", "works_specializations"] as const;
type Json = null | boolean | number | string | Json[] | { [key: string]: Json };
type ValueClass = "SOURCE" | "CALCULATED" | "MISSING";
export type SourceClaim = {
  canonical_entity_id: string; profile_version_id: string; claim_id: string; external_claim_id: string | null;
  field: string; source_field: string; display_value: string | null; status: SupplierEvidenceStatus;
  value_class: "SOURCE" | "MISSING"; source_record_id: string; source_system: string | null; retrieved_at: string;
  source_artifact_id: string | null; artifact_available: boolean; artifact_status: string;
  artifact_sha256: string | null; artifact_limitation: string; formula_role: string;
};
export type SupplierInput = {
  kind: "supplier"; id: string; sourceVersion: string; baseContentHash: string;
  provenance: { [key: string]: Json };
  profile: { canonical_entity_id: string; profile_version_id: string | null; display_name: string; legal_name: string;
    country_code: string | null; entity_type_code: string; classification: string | null;
    classification_value_class: "SOURCE" | "MISSING"; classification_claim_ids: string[];
    profile_state: "PINNED" | "MISSING" | "AMBIGUOUS"; readiness_status: string | null;
    readiness_contract_version: string | null; verification_status: string; evidence_count: number };
  evidence: SourceClaim[];
};
export type TenderInput = {
  kind: "tender"; id: string; sourceVersion: string; baseContentHash: string; provenance: { [key: string]: Json };
  tender: { title: string; description: string | null; descriptionLength: number; procurementType: string; status: string;
    reference: string | null; budgetAmount: string | null; budgetCurrency: string | null; budgetUsd: string | null;
    deadlineAt: string | null; publishedAt: string | null; sourceTimezone: string | null; deadlineSourceText: string | null };
  lookups: { country: { id: string; name: string; isoAlpha2: string; isoAlpha3: string } | null;
    tags: { id: string; label: string; slug: string; kind: string; origin: string }[] };
};
export type SourceInput = SupplierInput | TenderInput;
export type Quantity = { metric: string | null; sourceText: string | null; evidenceIds: string[];
  amount: string | null; maximum: string | null; scale: string | null; normalizedAmount: string | null;
  normalizedMaximum: string | null; currency: string | null; unit: string | null; period: string | null;
  qualifier: string | null; valueClass: ValueClass; normalizedValueClass: "CALCULATED" | "MISSING"; reasons: string[] };
const hash = (value: unknown) => sha256Content(stableStringify(value));
const sorted = (values: string[]) => [...new Set(values)].sort();
const text = (value: string | null | undefined, limit = CLAIM_LIMIT) => rules.plainText(value).replace(/[\w.+-]+@[\w.-]+\.[a-z]{2,}/gi, "[contact omitted]").replace(/https?:\/\/\S+/g, "[link omitted]").trim().slice(0, limit);
const words = (value: string) => { const terms = [...rules.tokens(value)].sort(); return { terms, concepts: [...rules.concepts(new Set(terms))].sort() }; };
function scaled(decimal: string, exponent: number): string {
  const negative = decimal.startsWith("-"); const [whole, fraction = ""] = decimal.replace(/^-/, "").split(".");
  const digits = (whole + fraction).replace(/^0+(?=\d)/, ""); const places = fraction.length - exponent;
  const result = places <= 0 ? digits + "0".repeat(-places) : digits.padStart(places + 1, "0").slice(0, -places) + "." + digits.padStart(places + 1, "0").slice(-places);
  return (negative && !/^0+(\.0+)?$/.test(result) ? "-" : "") + result.replace(/^0+(?=\d)/, "");
}

/** Conservative extraction, never conversion of one named metric into another. */
export function normalizeQuantity(value: string | null, evidenceIds: string[], status: SupplierEvidenceStatus = "STATED_UNVERIFIED"): Quantity {
  const q: Quantity = { metric: null, sourceText: value ? text(value) : null, evidenceIds, amount: null, maximum: null,
    scale: null, normalizedAmount: null, normalizedMaximum: null, currency: null, unit: null, period: null,
    qualifier: null, valueClass: "MISSING", normalizedValueClass: "MISSING", reasons: [] };
  if (!value || status === "UNKNOWN" || /^(unknown|n\/a)$/i.test(value.trim())) { q.reasons.push("QUANTITY_MISSING"); return q; }
  if (value.length > CLAIM_LIMIT) { q.reasons.push("QUANTITY_TEXT_TRUNCATED"); return q; }
  // Small unit-led grammar, not a name/answer-key shortcut; original text is retained.
  const grammar = value.trim()
    .replace(/^([\d,]+\s*[-–]\s*[\d,]+) employees$/i, "Employees: $1 employees")
    .replace(/^Floor space ([\d,.]+\+?)\s*(m2|square meters|square metres)$/i, "Floor space: $1 $2")
    .replace(/^More than ([\d,]+) projects per year$/i, "Project throughput: more than $1 projects per year")
    .replace(/^Plant facilities in (\d+) countries$/i, "Plant location coverage: $1 countries")
    .replace(/^(\d+) years manufacturing experience$/i, "Manufacturing experience: $1 years");
  // Commas must be thousands groups. Period/year are parsed independently, never amounts.
  const match = grammar.match(/^([^:;\d]{2,80}):\s*(?:(over|more than|at least|around|approximately|up to)\s+)?(?:([A-Z]{3})\s+)?(-?(?:\d{1,3}(?:,\d{3})+|\d+)(?:\.\d+)?)(?:\s*[-–]\s*((?:\d{1,3}(?:,\d{3})+|\d+)(?:\.\d+)?))?\s*(thousand|million|billion|trillion|crore)?\s*(\+)?\s*(.*?)\s*$/i);
  if (!match) { q.reasons.push("QUANTITY_STRUCTURE_UNSUPPORTED"); return q; }
  const [, metric, qualifier, currency, amount, maximum, scale, plus, tail] = match;
  const periodPattern = /\b(?:H[12]\s+|FY\s*)?(?:19|20)\d{2}(?:[-–](?:\d{4}|\d{2}))?\b|\bper (?:year|month|day)\b/i;
  const period = tail.match(periodPattern)?.[0] ?? (/\bannual\b/i.test(metric) ? "annual (reporting year missing)" : null);
  const remaining = tail.replace(periodPattern, "").replace(/\(\s*\)/g, "").trim();
  if (/[\d,;:]/.test(remaining.replace(/^m2$/i, "")) || remaining.length > 45) { q.reasons.push("QUANTITY_AMBIGUOUS_COMPONENTS"); return q; }
  q.metric = metric.trim(); q.currency = currency?.toUpperCase() ?? null; q.unit = remaining || (/\bemployees\b/i.test(metric) ? "employees" : /\b(sites|facilities|units)\b/i.test(metric) ? "count" : null);
  q.period = period; q.qualifier = qualifier?.toLowerCase() ?? (plus ? "at least" : null); q.scale = scale?.toLowerCase() ?? "ones";
  if (q.currency && !["USD", "EUR", "GBP", "PLN", "TWD", "JPY", "KRW", "CNY", "PHP", "INR", "MYR", "SAR", "EGP", "TRY", "THB"].includes(q.currency)) { q.reasons.push("CURRENCY_UNSUPPORTED"); return q; }
  if (/revenue|turnover|sales|profit|loss|income|backlog|order book/i.test(metric) && !q.currency) { q.unit = null; q.reasons.push("FINANCIAL_CURRENCY_MISSING"); return q; }
  if (q.unit && !/^(count|plants|employees|units|pieces|metric tons|tonnes|square meters|square metres|m2|%|projects|countries|years)$/i.test(q.unit)) { q.unit = null; q.reasons.push("QUANTITY_UNIT_UNSUPPORTED"); return q; }
  if (!q.currency && !q.unit) { q.reasons.push("QUANTITY_UNIT_OR_CURRENCY_MISSING"); return q; }
  q.amount = amount.replaceAll(",", ""); q.maximum = maximum?.replaceAll(",", "") ?? null;
  if (q.maximum !== null && Number(q.maximum) < Number(q.amount)) { q.amount = null; q.maximum = null; q.reasons.push("QUANTITY_RANGE_CONTRADICTORY"); return q; }
  const exponent = ({ ones: 0, thousand: 3, million: 6, billion: 9, trillion: 12, crore: 7 })[q.scale] ?? 0;
  q.normalizedAmount = scaled(q.amount, exponent); q.normalizedMaximum = q.maximum === null ? null : scaled(q.maximum, exponent);
  q.valueClass = "SOURCE"; q.normalizedValueClass = "CALCULATED";
  if (!q.period) q.reasons.push("REPORTING_PERIOD_MISSING");
  return q;
}

export function inputFeatureIdentity(input: SourceInput, codeHash: string) {
  if (!/^[a-f0-9]{64}$/.test(codeHash) || !/^[a-f0-9]{64}$/.test(input.baseContentHash)) throw new Error("Feature code/source hash required");
  if (!input.id || !input.sourceVersion) throw new Error("Explicit entity/version required");
  return { kind: input.kind, entityId: input.id, sourceVersion: input.sourceVersion, baseContentHash: input.baseContentHash,
    consumedProjectionHash: hash(input), codeHash, featureVersion: INPUT_FEATURE_VERSION, adapterVersion: INPUT_ADAPTER_VERSION, schemaVersion: INPUT_SCHEMA_VERSION };
}
export const inputFeatureKey = (input: SourceInput, codeHash: string) => hash(inputFeatureIdentity(input, codeHash));

export function asFormulaEvidence(row: SourceClaim): SupplierEvidenceApiRecord {
  return { canonicalEntityId: row.canonical_entity_id, profileVersionId: row.profile_version_id, claimId: row.claim_id,
    externalClaimId: row.external_claim_id, field: row.field, value: row.value_class === "MISSING" ? null : row.display_value,
    normalizedValue: null, status: row.status, sourceSystem: row.source_system, sourceTitle: null, sourceUrl: null,
    retrievedAt: row.retrieved_at, sourceRecordId: row.source_record_id, sourceArtifactId: row.source_artifact_id,
    artifactAvailable: row.artifact_available, artifactStatus: row.artifact_status, artifactSha256: row.artifact_sha256,
    artifactLimitation: row.artifact_limitation };
}
function aggregate(records: SupplierEvidenceApiRecord[]) {
  return { count: records.length, confidence: records.length ? Math.round(records.reduce((sum, r) => sum + rules.confidence(r), 0) / records.length) : null, evidenceIds: records.map(r => r.claimId).sort() };
}
export function normalizeSourceInput(input: SourceInput, codeHash: string) {
  const identity = inputFeatureIdentity(input, codeHash); const reasons: string[] = [];
  let status: "NORMALIZED" | "LIMITED" | "QUARANTINED" = "NORMALIZED";
  let detail;
  if (input.kind === "supplier") {
    const p = input.profile;
    if (p.canonical_entity_id !== input.id || input.evidence.some(e => e.canonical_entity_id !== input.id || e.profile_version_id !== p.profile_version_id) || new Set(input.evidence.map(e => e.claim_id)).size !== input.evidence.length || p.evidence_count !== input.evidence.length) throw new Error("Supplier evidence association mismatch");
    if (input.evidence.some(e => !SAFE_FIELDS.includes(e.field as typeof SAFE_FIELDS[number]))) throw new Error("Unapproved source evidence field");
    if (p.profile_state !== "PINNED") { status = "QUARANTINED"; reasons.push("SOURCE_PROFILE_UNRESOLVED"); }
    if (p.classification === null) reasons.push("SUPPLIER_CLASSIFICATION_MISSING");
    if (p.classification === null && p.classification_value_class !== "MISSING" || p.classification !== null && (p.classification_value_class !== "SOURCE" || !p.classification_claim_ids.length)) throw new Error("Classification missingness/evidence mismatch");
    if (p.classification_claim_ids.some(id => !input.evidence.some(e => e.claim_id === id && e.field === "classification"))) throw new Error("Classification evidence orphan");
    const ordered = [...input.evidence].sort((a,b) => a.field < b.field ? -1 : a.field > b.field ? 1 : a.claim_id.localeCompare(b.claim_id));
    const records = ordered.map(asFormulaEvidence); const available = records.filter(rules.usable);
    const technical = available.filter(r => rules.isTechnicalField(r.field));
    const capacity = available.filter(r => r.field === "capacity"); const market = available.filter(r => r.field === "geographic_markets");
    const claims = ordered.map(e => ({ id: e.claim_id, field: e.field, sourceField: e.source_field,
      value: e.status === "UNKNOWN" || e.value_class === "MISSING" ? null : text(e.display_value), sourceStatus: e.status,
      valueClass: e.value_class, textTruncated: (e.display_value?.length ?? 0) > CLAIM_LIMIT,
      sourceRecordId: e.source_record_id, sourceSystem: e.source_system, retrievedAt: e.retrieved_at,
      artifactId: e.source_artifact_id, artifactHash: e.artifact_sha256, artifactAvailable: e.artifact_available,
      artifactStatus: e.artifact_status, artifactLimitation: text(e.artifact_limitation), sourceTextHash: hash(e.display_value) }));
    if (claims.some(c => c.value === null)) reasons.push("SUPPLIER_CLAIMS_MISSING");
    if (claims.some(c => !c.artifactAvailable)) reasons.push("SOURCE_ARTIFACT_UNAVAILABLE");
    if (claims.some(c => c.textTruncated)) reasons.push("CLAIM_TEXT_TRUNCATED");
    if (claims.some(c => c.sourceStatus !== "VERIFIED")) reasons.push("SOURCE_CLAIMS_NOT_INDEPENDENTLY_VERIFIED");
    const idsFor = (fields: string[]) => claims.filter(c => fields.includes(c.field)).map(c => c.id);
    const quantities = ordered.filter(e => ["capacity", "financial", "turnover_scale", "manufacturing_capabilities_capacity"].includes(e.field)).map(e => normalizeQuantity(e.value_class === "MISSING" ? null : e.display_value, [e.claim_id], e.status));
    if (quantities.some(q => q.valueClass === "MISSING")) reasons.push("TYPED_QUANTITIES_MISSING");
    const lexical = words(available.map(r => text(r.value)).join(" "));
    if (lexical.terms.length > 128) reasons.push("GENERAL_VOCABULARY_BOUNDED");
    detail = { displayName: text(p.display_name), legalName: text(p.legal_name), entityType: p.entity_type_code,
      procurementType: p.classification, classification: { valueClass: p.classification_value_class, evidenceIds: p.classification_claim_ids },
      sourceState: { profile: p.profile_state, readiness: p.readiness_status, readinessVersion: p.readiness_contract_version, verification: p.verification_status },
      geography: p.country_code ? [p.country_code] : [], claims, quantities,
      capabilities: idsFor(["main_activity", "product_categories", "products_portfolio", "product_families", "works_specializations", "industries_served", "manufacturing_capabilities_capacity", "materials", "materials_specs", "installation_after_sales"]),
      locations: idsFor(["export_markets", "geographic_markets", "local_presence"]), credentials: idsFor(["certifications"]),
      experience: idsFor(["project_references"]), delivery: idsFor(["moq_lead_time_incoterms"]), risk: idsFor(["compliance_risks"]),
      terms: lexical.terms.slice(0,128), concepts: lexical.concepts,
      formulaInputs: { technical: { ...aggregate(technical), ...words(technical.map(r => r.value ?? "").join(" ")) }, capacity: aggregate(capacity), market: { ...aggregate(market), text: market.map(r => r.value).join(" ").toLowerCase() } } };
  } else {
    const t = input.tender;
    if (t.status !== "OPEN") throw new Error("Non-OPEN input outside registered contract");
    if (input.lookups.tags.some(t => !t.id || !t.origin) || new Set(input.lookups.tags.map(t => t.id)).size !== input.lookups.tags.length) throw new Error("Tag association mismatch");
    if (!input.lookups.country) reasons.push("COUNTRY_MISSING");
    if (!t.deadlineAt) reasons.push("DEADLINE_MISSING");
    if (!t.sourceTimezone) reasons.push("SOURCE_TIMEZONE_MISSING");
    if (t.descriptionLength > DESCRIPTION_LIMIT) reasons.push("DESCRIPTION_PREFIX_ONLY");
    if (t.title.length > CLAIM_LIMIT) reasons.push("TITLE_DISPLAY_TRUNCATED");
    if (/[^\p{Script=Latin}\p{N}\p{P}\p{Z}\p{S}\s]/u.test(t.title)) reasons.push("NO_TRANSLATION_ENGLISH_CONCEPT_DICTIONARY");
    reasons.push("STRUCTURED_REQUIREMENTS_NOT_AVAILABLE", "SOURCE_NOTICE_NOT_INDEPENDENTLY_VERIFIED");
    const scoring = words([rules.plainText(t.title), t.procurementType].join(" "));
    const lexical = words([t.title, ...input.lookups.tags.map(t => t.label), text(t.description, DESCRIPTION_LIMIT)].join(" "));
    if (lexical.terms.length > 128) reasons.push("GENERAL_VOCABULARY_BOUNDED");
    const budget = (value: string | null, currency: string | null, field: string) => ({ value, currency, valueClass: (value === null ? "MISSING" : "SOURCE") as ValueClass, sourceField: field, sourceRecordId: input.id });
    detail = { title: text(t.title), reference: t.reference, procurementType: t.procurementType,
      geography: input.lookups.country ? [input.lookups.country.isoAlpha2, input.lookups.country.name] : [],
      country: input.lookups.country, tags: input.lookups.tags,
      requirements: { state: "MISSING", object: null, capacity: null, turnover: null, experience: null, certificates: null, delivery: null },
      budget: budget(t.budgetAmount,t.budgetCurrency,"budgetAmount"), reportedBudgetUsd: budget(t.budgetUsd,"USD","budgetUsd"),
      sourceDates: { deadlineAt: t.deadlineAt, publishedAt: t.publishedAt, timezone: t.sourceTimezone, deadlineSourceText: text(t.deadlineSourceText), semantics: "source timestamp without time zone; no UTC inference" },
      description: { sourceLength: t.descriptionLength, consumedCharacters: t.description?.length ?? 0, persistedBody: false },
      terms: sorted([...scoring.terms, ...lexical.terms]).slice(0,128), concepts: lexical.concepts,
      formulaInputs: { scoringTerms: scoring.terms, scoringConcepts: scoring.concepts, excludedDerivedTags: input.lookups.tags.length, sourceObject: null } };
  }
  if (status !== "QUARANTINED" && reasons.length) status = "LIMITED";
  const body = { ...detail, kind: input.kind, id: input.id, sourceVersion: input.sourceVersion,
    featureVersion: INPUT_FEATURE_VERSION, schemaVersion: INPUT_SCHEMA_VERSION,
    featureKey: hash(identity), inputIdentity: identity, sourceRole: "AUTHORITATIVE_SOURCE",
    provenance: input.provenance, normalization: { status, reasons: sorted(reasons), valueClass: "CALCULATED" },
    decisions: { readinessAssigned: false, eligibilityEvaluated: false, pairScored: false }, embedding: { state: "MISSING" } };
  return { ...body, contentHash: hash(body) };
}
export type SourceFeature = ReturnType<typeof normalizeSourceInput>;
export function validateSourceFeature(feature: SourceFeature, input: SourceInput, codeHash: string) {
  const { contentHash, ...body } = feature;
  if (contentHash !== hash(body) || feature.featureKey !== inputFeatureKey(input,codeHash) || hash(feature.inputIdentity) !== feature.featureKey || feature.id !== input.id || feature.kind !== input.kind) throw new Error("Stored feature identity/content mismatch");
  return feature;
}

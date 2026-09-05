import type { SupplierEvidenceApiRecord, SupplierProfileApiRecord } from "./supplier-contract.ts";
import { stringsFromStructuredValue } from "./supplier-contract.ts";
import type { SourceRole, TenderRecord } from "./types.ts";
import { exploratoryFeatureRules as rules } from "./exploratory-matching.ts";

export const TENDERMATCH_FEATURE_VERSION = "tendermatch-normalized-features/1.0.0" as const;
export const TENDERMATCH_RETRIEVAL_TERM_LIMIT = 128 as const;
export type ContentHasher = (value: string) => string;
export type EmbeddingMetadata = { state: "MISSING" | "READY"; model: string | null; dimensions: number | null; version: string | null; contentHash: string | null };
export type FeatureThreshold = { kind: "capacity" | "turnover" | "comparable-contract"; value: number | null; unit: string | null; valueClass: "SOURCE" | "CALCULATED" | "MISSING"; evidenceIds: string[] };
type FeatureBase = {
  id: string; sourceVersion: string; sourceSnapshot: string; featureVersion: typeof TENDERMATCH_FEATURE_VERSION;
  contentHash: string; featureKey: string; evidenceSnapshot: string;
  sourceRole: SourceRole;
  procurementType: string; geography: string[]; terms: string[]; concepts: string[];
  thresholds: FeatureThreshold[]; embedding: EmbeddingMetadata;
};
export type NormalizedTenderFeatures = FeatureBase & {
  kind: "tender"; reference: string; title: string; requirements: string[]; country: string;
  scoringTerms: string[]; scoringConcepts: string[]; deadlineAt: string; databaseStatus: string;
};
export type EvidenceAggregate = { count: number; confidence: number; evidenceIds: string[] };
export type NormalizedSupplierFeatures = FeatureBase & {
  kind: "supplier"; canonicalEntityId: string; profileVersionId: string; displayName: string;
  readinessStatus: SupplierProfileApiRecord["readinessStatus"]; capabilities: string[];
  formulaEvidence: { technical: EvidenceAggregate & { terms: string[]; concepts: string[] }; capacity: EvidenceAggregate; market: EvidenceAggregate & { text: string } };
};

/** Canonical JSON excludes property insertion order; arrays preserve source order. */
export function stableStringify(value: unknown): string {
  if (value === undefined) return "null";
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(",")}]`;
  return `{${Object.keys(value).sort().filter((key) => (value as Record<string, unknown>)[key] !== undefined).map((key) => `${JSON.stringify(key)}:${stableStringify((value as Record<string, unknown>)[key])}`).join(",")}}`;
}

// Synchronous SHA-256 for identical browser/server feature and cache identities.
// It hashes identities only; it is not used for passwords, signatures or secrets.
export function sha256Content(value: string): string {
  const input = new TextEncoder().encode(value);
  const bytes = new Uint8Array(Math.ceil((input.length + 9) / 64) * 64);
  bytes.set(input); bytes[input.length] = 0x80;
  const view = new DataView(bytes.buffer); const bitLength = input.length * 8;
  view.setUint32(bytes.length - 8, Math.floor(bitLength / 0x100000000)); view.setUint32(bytes.length - 4, bitLength >>> 0);
  const constants = [0x428a2f98,0x71374491,0xb5c0fbcf,0xe9b5dba5,0x3956c25b,0x59f111f1,0x923f82a4,0xab1c5ed5,0xd807aa98,0x12835b01,0x243185be,0x550c7dc3,0x72be5d74,0x80deb1fe,0x9bdc06a7,0xc19bf174,0xe49b69c1,0xefbe4786,0x0fc19dc6,0x240ca1cc,0x2de92c6f,0x4a7484aa,0x5cb0a9dc,0x76f988da,0x983e5152,0xa831c66d,0xb00327c8,0xbf597fc7,0xc6e00bf3,0xd5a79147,0x06ca6351,0x14292967,0x27b70a85,0x2e1b2138,0x4d2c6dfc,0x53380d13,0x650a7354,0x766a0abb,0x81c2c92e,0x92722c85,0xa2bfe8a1,0xa81a664b,0xc24b8b70,0xc76c51a3,0xd192e819,0xd6990624,0xf40e3585,0x106aa070,0x19a4c116,0x1e376c08,0x2748774c,0x34b0bcb5,0x391c0cb3,0x4ed8aa4a,0x5b9cca4f,0x682e6ff3,0x748f82ee,0x78a5636f,0x84c87814,0x8cc70208,0x90befffa,0xa4506ceb,0xbef9a3f7,0xc67178f2];
  const hash = [0x6a09e667,0xbb67ae85,0x3c6ef372,0xa54ff53a,0x510e527f,0x9b05688c,0x1f83d9ab,0x5be0cd19];
  const rotate = (n: number, b: number) => (n >>> b) | (n << (32 - b)); const w = new Uint32Array(64);
  for (let offset = 0; offset < bytes.length; offset += 64) {
    for (let i = 0; i < 16; i++) w[i] = view.getUint32(offset + i * 4);
    for (let i = 16; i < 64; i++) { const a = w[i - 15]; const b = w[i - 2]; w[i] = (w[i - 16] + (rotate(a,7)^rotate(a,18)^(a>>>3)) + w[i - 7] + (rotate(b,17)^rotate(b,19)^(b>>>10))) >>> 0; }
    let [a,b,c,d,e,f,g,h] = hash;
    for (let i = 0; i < 64; i++) { const t1 = (h + (rotate(e,6)^rotate(e,11)^rotate(e,25)) + ((e&f)^(~e&g)) + constants[i] + w[i]) >>> 0; const t2 = ((rotate(a,2)^rotate(a,13)^rotate(a,22)) + ((a&b)^(a&c)^(b&c))) >>> 0; h=g;g=f;f=e;e=(d+t1)>>>0;d=c;c=b;b=a;a=(t1+t2)>>>0; }
    for (const [i, n] of [a,b,c,d,e,f,g,h].entries()) hash[i] = (hash[i] + n) >>> 0;
  }
  return hash.map((n) => n.toString(16).padStart(8,"0")).join("");
}

// V8 substring views can otherwise retain a complete long notice for each token.
// Bounded interning both detaches those views and shares repeated vocabulary.
const vocabulary = new Map<string,string>();
function detachedTerm(value:string) { const known=vocabulary.get(value);if(known)return known;const detached=JSON.parse(JSON.stringify(value)) as string;if(vocabulary.size<100_000)vocabulary.set(detached,detached);return detached; }
function words(text: string) { const terms = rules.tokens(text); return { terms: [...terms].map(detachedTerm).sort(), concepts: [...rules.concepts(terms)].sort() }; }
function absentThresholds(): FeatureThreshold[] { return (["capacity", "turnover", "comparable-contract"] as const).map((kind) => ({ kind, value: null, unit: null, valueClass: "MISSING", evidenceIds: [] })); }
function missingEmbedding(): EmbeddingMetadata { return { state: "MISSING", model: null, dimensions: null, version: null, contentHash: null }; }
function evidenceAggregate(records: SupplierEvidenceApiRecord[]): EvidenceAggregate { return { count: records.length, confidence: records.length ? Math.round(records.reduce((sum, row) => sum + rules.confidence(row), 0) / records.length) : 0, evidenceIds: records.map((row) => row.claimId).sort() }; }
function featureKey(id: string, version: string, contentHash: string, hash:ContentHasher) { return hash(stableStringify([TENDERMATCH_FEATURE_VERSION, id, version, contentHash])); }
function boundedRetrieval(primary: string[], secondary: string) { const prioritized=new Set(primary);for(const term of rules.tokens(secondary)){if(prioritized.size>=TENDERMATCH_RETRIEVAL_TERM_LIMIT)break;prioritized.add(detachedTerm(term));}const terms=[...prioritized].slice(0,TENDERMATCH_RETRIEVAL_TERM_LIMIT).sort();return {terms,concepts:[...rules.concepts(new Set(terms))].sort()}; }
function freezeFeatures<T>(value:T):T { if(value&&typeof value==="object"&&!Object.isFrozen(value)){for(const child of Object.values(value))freezeFeatures(child);Object.freeze(value);}return value; }

export function normalizeTenderFeatures(tender: TenderRecord): NormalizedTenderFeatures {
  return normalizeTenderFeaturesWithHash(tender,sha256Content);
}
export function normalizeTenderFeaturesWithHash(tender:TenderRecord,hash:ContentHasher):NormalizedTenderFeatures {
  const contentHash = hash(stableStringify(tender));
  const scoring = words([tender.title,tender.object,tender.procurementType,...tender.tags].map((entry) => rules.plainText(entry)).join(" "));
  const retrieval = boundedRetrieval(scoring.terms,rules.plainText(tender.description));
  return freezeFeatures({ kind: "tender", id: tender.id, sourceVersion: tender.version, sourceSnapshot: tender.snapshotId, featureVersion: TENDERMATCH_FEATURE_VERSION, contentHash, featureKey: featureKey(tender.id,tender.version,contentHash,hash), evidenceSnapshot: tender.snapshotId, sourceRole:tender.sourceRole, procurementType: tender.procurementType ?? "UNKNOWN", geography: [tender.country], ...retrieval, thresholds: absentThresholds(), embedding: missingEmbedding(), reference: tender.reference, title: tender.title, requirements: [tender.title,tender.object,...tender.tags], country: tender.country.toLowerCase(), scoringTerms: scoring.terms, scoringConcepts: scoring.concepts, deadlineAt: tender.deadlineAt, databaseStatus: tender.databaseStatus ?? "UNKNOWN" });
}

export function normalizeSupplierFeatures(profile: SupplierProfileApiRecord, evidence: SupplierEvidenceApiRecord[]): NormalizedSupplierFeatures {
  return normalizeSupplierFeaturesWithHash(profile,evidence,sha256Content);
}
export function normalizeSupplierFeaturesWithHash(profile:SupplierProfileApiRecord,evidence:SupplierEvidenceApiRecord[],hash:ContentHasher):NormalizedSupplierFeatures {
  // Formula v1.1 concatenates geography evidence in source order. Preserve that
  // order in both operands and the snapshot identity; do not silently sort it.
  const records = evidence.filter((row) => row.canonicalEntityId === profile.canonicalEntityId);
  if (new Set(records.map((row) => row.claimId)).size !== records.length) throw new Error("Duplicate supplier evidence identity");
  const evidenceSnapshot = hash(stableStringify(records)); const contentHash = hash(stableStringify({ profile, evidenceSnapshot }));
  const technical = records.filter((row) => rules.isTechnicalField(row.field) && rules.usable(row));
  const capacity = records.filter((row) => row.field === "capacity" && rules.usable(row));
  const market = records.filter((row) => row.field === "geographic_markets" && rules.usable(row));
  const technicalWords = words(technical.map((row) => row.value ?? "").join(" "));
  const capabilities = [profile.productFamilies,profile.worksSpecializations,profile.industriesServed,profile.materials].flatMap(stringsFromStructuredValue);
  const retrieval = boundedRetrieval(words(capabilities.join(" ")).terms,records.filter(rules.usable).map((row)=>row.value??"").join(" "));
  const id = `supplier:NEON:${profile.canonicalEntityId}`;
  return freezeFeatures({ kind: "supplier", id, canonicalEntityId: profile.canonicalEntityId, sourceVersion: profile.profileVersion, profileVersionId: profile.profileVersionId, sourceSnapshot: profile.batchCode, featureVersion: TENDERMATCH_FEATURE_VERSION, contentHash, featureKey: featureKey(id,profile.profileVersionId,contentHash,hash), evidenceSnapshot, sourceRole:"SUPPORTING_DOCUMENT", procurementType: profile.classification, geography: stringsFromStructuredValue(profile.operatingGeography), ...retrieval, thresholds: absentThresholds(), embedding: missingEmbedding(), displayName: profile.displayName, readinessStatus: profile.readinessStatus, capabilities, formulaEvidence: { technical: {...evidenceAggregate(technical),...technicalWords}, capacity:evidenceAggregate(capacity), market: {...evidenceAggregate(market),text:market.map((row) => row.value).join(" ").toLowerCase()} } });
}

/** Reuse prepared features across evaluation jobs. Caller provides version-pinned source records. */
export class NormalizedFeatureStore {
  readonly tenders = new Map<string, NormalizedTenderFeatures>();
  readonly suppliers = new Map<string, NormalizedSupplierFeatures>();
  tender(tender: TenderRecord) { const key = sha256Content(stableStringify(tender)); const existing = this.tenders.get(key); if (existing) return existing; const normalized = normalizeTenderFeatures(tender); this.tenders.set(key,normalized); return normalized; }
  supplier(profile: SupplierProfileApiRecord, evidence: SupplierEvidenceApiRecord[]) { const rows = evidence.filter((row) => row.canonicalEntityId === profile.canonicalEntityId); const key = sha256Content(stableStringify({profile,rows})); const existing = this.suppliers.get(key); if (existing) return existing; const normalized = normalizeSupplierFeatures(profile,rows); this.suppliers.set(key,normalized); return normalized; }
}

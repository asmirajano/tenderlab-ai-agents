/** Retrieval relevance is ordering evidence only. This module never reads Formula points. */
export const RETRIEVAL_POLICY_VERSION = "tendermatch-hybrid-rrf/1.0.0" as const;
export const EMBEDDING_DIMENSIONS = 384 as const;
export type RetrievalChannel = "semantic" | "lexical" | "taxonomy";
export type RetrievalCandidate = {
  supplierId: string; tenderId: string;
  channels: Partial<Record<`${RetrievalChannel}Rank`, number>>;
  semanticSimilarity?: number;
};
export type RetrievalRelevance = {
  supplierId: string; tenderId: string; retrievalScore: number; retrievalRank: number;
  policyVersion: typeof RETRIEVAL_POLICY_VERSION; channels: RetrievalCandidate["channels"];
  semanticSimilarity: number | null; valueClass: "CALCULATED";
};
export type RetrievalEmbeddingMetadata = {
  modelVersion: string; dimensions: typeof EMBEDDING_DIMENSIONS; contentHash: string;
  state: "MISSING" | "READY" | "FAILED";
};

function positiveInteger(value: number, name: string, maximum: number) {
  if (!Number.isInteger(value) || value < 1 || value > maximum) throw new Error(`${name} must be an integer from 1 to ${maximum}.`);
}

/** RRF is deliberately not normalized to 0–100 or labelled as a match probability. */
export function fuseRetrievalCandidates(candidates: readonly RetrievalCandidate[], options: { rrfK?: number; limit?: number } = {}): RetrievalRelevance[] {
  const rrfK = options.rrfK ?? 60; const limit = options.limit ?? 20;
  positiveInteger(rrfK, "rrfK", 1_000); positiveInteger(limit, "limit", 1_000);
  const unique = new Map<string, RetrievalCandidate>();
  for (const candidate of candidates) {
    if (!candidate.supplierId || !candidate.tenderId) throw new Error("Retrieval requires explicit pair identities.");
    const key = JSON.stringify([candidate.supplierId, candidate.tenderId]);
    const merged = unique.get(key) ?? { supplierId: candidate.supplierId, tenderId: candidate.tenderId, channels: {} };
    for (const channel of ["semanticRank", "lexicalRank", "taxonomyRank"] as const) {
      const rank = candidate.channels[channel];
      if (rank !== undefined) { positiveInteger(rank, channel, 1_000_000); merged.channels[channel] = Math.min(rank, merged.channels[channel] ?? Infinity); }
    }
    if (candidate.semanticSimilarity !== undefined) {
      if (!Number.isFinite(candidate.semanticSimilarity) || candidate.semanticSimilarity < -1 || candidate.semanticSimilarity > 1) throw new Error("Cosine similarity must be finite and between -1 and 1.");
      merged.semanticSimilarity = Math.max(candidate.semanticSimilarity, merged.semanticSimilarity ?? -1);
    }
    unique.set(key, merged);
  }
  return [...unique.values()].filter((entry) => Object.keys(entry.channels).length > 0).map((entry) => ({ ...entry,
    retrievalScore: Object.values(entry.channels).reduce((sum, rank) => sum + 1 / (rrfK + rank), 0),
    retrievalRank: 0, policyVersion: RETRIEVAL_POLICY_VERSION, semanticSimilarity: entry.semanticSimilarity ?? null, valueClass: "CALCULATED" as const,
  })).sort((a, b) => b.retrievalScore - a.retrievalScore || a.supplierId.localeCompare(b.supplierId) || a.tenderId.localeCompare(b.tenderId))
    .slice(0, limit).map((entry, index) => ({ ...entry, retrievalRank: index + 1 }));
}

export type SearchableFeature = { id: string; terms: readonly string[]; concepts: readonly string[]; procurementType?: string };
export type LexicalRetrievalIndex = { features: ReadonlyMap<string, SearchableFeature>; terms: ReadonlyMap<string, readonly string[]>; concepts: ReadonlyMap<string, readonly string[]> };

/** Build once per versioned inventory; query work touches postings, not the entire pair universe. */
export function buildLexicalRetrievalIndex(features: readonly SearchableFeature[]): LexicalRetrievalIndex {
  const byId = new Map<string, SearchableFeature>(); const terms = new Map<string, string[]>(); const concepts = new Map<string, string[]>();
  for (const feature of features) {
    if (byId.has(feature.id)) throw new Error(`Duplicate feature identity: ${feature.id}`);
    byId.set(feature.id, feature);
    for (const [values, index] of [[feature.terms, terms], [feature.concepts, concepts]] as const) {
      for (const value of new Set(values)) { const ids = index.get(value) ?? []; ids.push(feature.id); index.set(value, ids); }
    }
  }
  return { features: byId, terms, concepts };
}

export function retrieveFeatureCandidates(query: SearchableFeature, index: LexicalRetrievalIndex, options: {
  direction: "supplier-to-tenders" | "tender-to-suppliers"; candidateLimit?: number; limit?: number;
  eligible: (id: string) => boolean;
  semantic?: { modelVersion: string; state: "READY" | "DISABLED" | "MISSING"; candidates: readonly { id: string; similarity: number }[] };
}): { results: RetrievalRelevance[]; semanticState: "READY" | "DISABLED" | "MISSING"; candidateCount: number; policyVersion: typeof RETRIEVAL_POLICY_VERSION } {
  const candidateLimit = options.candidateLimit ?? 200; positiveInteger(candidateLimit, "candidateLimit", 1_000);
  function ranked(values: readonly string[], postings: ReadonlyMap<string, readonly string[]>) {
    const counts = new Map<string, number>();
    for (const token of new Set(values)) for (const id of postings.get(token) ?? []) if (options.eligible(id)) counts.set(id, (counts.get(id) ?? 0) + 1);
    return [...counts].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).slice(0, candidateLimit).map(([id]) => id);
  }
  const pair = (id: string) => options.direction === "supplier-to-tenders" ? { supplierId: query.id, tenderId: id } : { supplierId: id, tenderId: query.id };
  const candidates: RetrievalCandidate[] = [];
  for (const [ids, channel] of [[ranked(query.terms, index.terms), "lexicalRank"], [ranked(query.concepts, index.concepts), "taxonomyRank"]] as const) {
    ids.forEach((id, position) => candidates.push({ ...pair(id), channels: { [channel]: position + 1 } }));
  }
  const semanticState = options.semantic?.state ?? "DISABLED";
  if (semanticState === "READY") {
    if (!options.semantic?.modelVersion) throw new Error("Semantic candidates require an explicit embedding model version.");
    options.semantic.candidates.filter((entry) => index.features.has(entry.id) && options.eligible(entry.id))
      .sort((a, b) => b.similarity - a.similarity || a.id.localeCompare(b.id)).slice(0, candidateLimit)
      .forEach((entry, position) => candidates.push({ ...pair(entry.id), channels: { semanticRank: position + 1 }, semanticSimilarity: entry.similarity }));
  } else if (options.semantic?.candidates.length) throw new Error("Unavailable semantic retrieval cannot supply fabricated candidates.");
  return { results: fuseRetrievalCandidates(candidates, { limit: options.limit }), semanticState,
    candidateCount: new Set(candidates.map((entry) => JSON.stringify([entry.supplierId, entry.tenderId]))).size, policyVersion: RETRIEVAL_POLICY_VERSION };
}

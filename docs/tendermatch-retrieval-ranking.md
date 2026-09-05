# TenderMatch retrieval, scoring and selective assessment

Implementation base: `71176817cc8feda1e6e7fe0fbe5a0c5dfd41eb98`, selected after fetching both configured remotes on 2026-09-05. Worktree: `C:/Users/Cowork 2/.codex/worktrees/tendermatch-retrieval-ranking`; branch: `codex/tendermatch-retrieval-ranking`.

## Authority and evidence

The base contains production source `origin/main` at `aa0afce3ff9032b6bb96fb0ca7fa956a5c4616b0` plus the preserved local Formula readability commit. The Formula source worktree `e852` was clean and one commit ahead. The old task checkout `25a9` at `5423a16` is not the implementation base. The older `7aa3` business-table branch at `49f83f2` is divergent and superseded by the approved enterprise-table work; it was preserved. All worktrees were inspected. Unrelated dirty work in the main, TenderBalance `8224`, and original-demo `a03d` worktrees was left untouched. The frozen standalone source worktree `8964` remained clean at `04b0b2a723223d11617837ee0e7562fa48168cd9`.

The deployed TenderApps HTML references `index-D8SRjjLe.js` and `index-DjcTAO9O.css`, matching the recorded `aa0afce` release build. This is asset-reference evidence; no new deployment or live database operation is part of this stage. The preserved port-4174 preview belongs to `e852` and the Formula checkpoint.

Canonical owner remains `agent:TL-A031`. The primary output is an inspectable Company × Tender scoring result for a TenderLab consultant. Formula results do not make a Match/Non-match or Bid/No-Bid decision. Discovery is upstream; readiness, verification, risk and human disposition remain independent. No canonical registry change is required.

Inputs are the existing authorized 60-tender and 17-supplier public snapshot plus 289 evidence records. They are not refreshed in this stage. Synthetic scale fixtures test runtime behavior; they do not establish predictive or semantic-retrieval quality.

## Implemented pipeline

`versioned source records → reusable normalized features → explicit eligibility → compact Formula v1.1 scores → lexical/taxonomy/available semantic retrieval → shortlist → justified assessment request → separate TORS artifact → human disposition`

Normalization has its own version and SHA-256 identity. Tender title/object/tags are scored as before; the full description may help retrieval but cannot create Formula points. Supplier technical, capacity, geography, financial and evidence-confidence fields retain their distinct roles. Unknown thresholds and embeddings remain explicitly absent.

| Signal | Meaning | Changes Formula points? |
| --- | --- | --- |
| Retrieval Relevance | Candidate ordering from available semantic, lexical and taxonomy ranks | No |
| Formula v1.1 Pair Score | Fixed-denominator supported fit, integer 0–100 | This is the independent score |
| Data Coverage | Weight of assessed criteria | No denominator renormalization |
| Evidence Confidence | Confidence in evidence supporting assessed criteria | No |
| Full TORS Assessment | Separately requested, versioned model analysis with evidence references | No |
| Human Disposition | Accountable consultant review and rationale | No |

Formula engine remains `tendermatch-match-formula/1.1.0`, policy `tendermatch-coverage-adjusted-goods-works/1.1.0`. Every eligible pair has a numeric score, including zero. Missing criterion evidence earns no points and remains Missing. The denominator remains 100. Historical outside-scope zeros remain inspectable with an explicit outside-scope state, never disguised as eligible scoring or Non-match. Known supplier exclusion and procurement-role mismatch are explicit hard filters for escalation; unknown evidence or unverified status alone is not a hard exclusion. Current deadline state is derived at query/review time rather than cached into Formula identity.

## PostgreSQL and vector strategy

The migration and executor adapter are separate from the read-only upstream supplier database. No migration is automatically applied by app startup. A future authorized rollout must provision a dedicated result store and tenant-scoped execution identity; it must not grant writes to the existing supplier consumer.

Embeddings are versioned independently by feature hash, model identity, dimensions and evidence snapshot. No credential or embedding provider is assumed. The vector column is 384-dimensional with cosine distance; the HNSW starting parameters are `m=16`, `ef_construction=64`. Query-time search breadth is configurable and must be calibrated against exact neighbors and representative filtered data. HNSW is selected for its documented speed/recall characteristics and lack of a training step, not from an unmeasured claim of live Neon performance. [pgvector documentation](https://github.com/pgvector/pgvector#hnsw).

ANN supplies candidates only. Lexical and taxonomy candidate unions protect exact terms and sparse metadata; reciprocal-rank fusion keeps retrieval independent of Formula scoring. Missing embeddings disable the semantic channel truthfully. Tenant, feature/model version, scope and other deterministic filters apply before eligibility for a shortlist. Index recall still requires later representative real-vector measurement.

## Deployment boundary

This is local implementation and validation. Authentication, tenant membership, a hosted result API, production operations, model-provider credentials and deployment remain separate rollout work. The queue adapter can be exercised with a local provider stub in tests, but no such stub is presented as a real assessment. A disabled provider produces a visible disabled state and zero model calls.

## Storage, cache and transport contracts

- Feature policy: `tendermatch-normalized-features/1.0.0`. Frozen normalized features retain source/evidence identities and hashes. Formula operands are not truncated; only retrieval vocabulary is bounded to 128 priority terms.
- Pair cache identity binds both normalized inputs, evidence snapshot and Formula version. A changed supplier or tender invalidates its affected pairs; unchanged identities can be inherited into an explicitly named new run. Each run binds exactly one immutable version of each pair. Conflicting payloads fail atomically rather than overwriting history.
- Incremental scoring uses bounded batches (default 500), immutable scores and explicit run progress. The PostgreSQL adapter provides leases, retry/reclaim, atomic score-plus-checkpoint commits and `SKIP LOCKED`. The local HTTP preview uses the in-memory adapter, not a durable production worker.
- The SQL migration defines 14 tables covering normalized features, model-specific embeddings, evaluation runs/membership, compact scores, retrieval requests/results, batch checkpoints, assessment jobs/artifacts and human dispositions. GIN and B-tree indexes support lexical/taxonomy and focused rank access; model-partitioned HNSW supplies an optional semantic candidate channel.
- Tenant/run/model boundaries and immutable retrieval-result identities are enforced in the adapter and RLS policies. A future server must inject an authenticated tenant identity. These tests do not establish an authentication service, cross-process worker operations or production tenant security.
- Assessment eligibility, provider lease/version, retry state and output artifact are separate from scoring. Ordinary scoring and retrieval make zero model calls. The active local/static product has no assessment provider; its request control reports Disabled, not a fabricated TORS result.

The runtime catalog replaces the former all-pairs narrative payload with 17 profiles, one illustrative detailed result, compact per-entity leaders, distribution and progress metadata. Focused HTTP queries are limited to 200 records, with query/run-bound cursors; matrix requests are limited to 25 suppliers by 8 tenders (200 cells). A single explicit pair loads its full explanation. The UI keeps at most 12 detailed results in its cache.

Static hosting uses 77 bounded partitions (17 supplier and 60 tender files), a catalog and index. The default 10-by-8 matrix displays 80 cells and may load eight 17-row tender partitions, rather than exactly 80 records. Its partition cache is bounded to eight entries and keyed by scoring run. Static generation is deliberately capped at 100 entities per axis; this is the pinned pilot transport, not a claim that static browser inventories support arbitrary scale. Larger inventories require the focused service/result store.

Window CSV/Excel exports contain the requested matrix window. The existing full-inventory domain exporter and its 1,020-row numerical regressions remain available as validation tools. The historical verbose supplier snapshot and its original manifest are preserved unchanged as provenance/golden evidence, but are not fetched by the new browser runtime. The exporter now consumes catalog-v2 plus bounded pair endpoints and checks one immutable run throughout; it was tested against a local fixture service, not live Neon.

## Measured results and limitations

The [versioned benchmark record](evidence/tendermatch-retrieval-benchmark.json) binds its four source files by SHA-256. This is one measured Windows/Node run per scenario, using cloned authorized evidence with synthetic identities, no model calls and no database connection. Scoring time excludes one-time normalization; retained heap is post-GC, not peak allocation.

| Synthetic workload | Legacy / compact scoring | Compact normalization | Legacy / compact retained heap | Legacy / compact serialized total | Warm-cache hits |
| --- | --- | --- | --- | --- | --- |
| 1 supplier × 20,000 tenders | 756.82 / 337.01 ms | 5,939.24 ms | 92.89 / 62.53 MiB | 144.28 / 72.30 MiB | 20,000 / 20,000 |
| 20 suppliers × 2,000 tenders | 1,665.88 / 518.18 ms | 645.65 ms | 183.86 / 39.22 MiB | 289.18 / 49.10 MiB | 40,000 / 40,000 |

The compact serialized total includes normalized features, not only pair rows. Cold ingestion of 20,000 distinct source identities remains slower overall than the legacy scoring-only loop. The first bounded 50-record Formula query took 36.45 ms and 19.29 ms respectively; these are not ANN latency measurements. No live Neon latency, real embedding quality, filtered ANN recall, model cost or predictive matching accuracy was measured.

The pinned oracle remains exactly 1,020 pairs: 48 currently eligible and 972 outside scoring scope or otherwise ineligible. Score, coverage, confidence, assessed-only fit and primary limitation agree with the previous Formula results. Retrieval metadata may differ by supplier-first versus tender-first direction; immutable Formula records do not.

## Validation and current maturity

The [completion evidence](evidence/tendermatch-retrieval-validation.md) records the reused full-suite/browser evidence and the final bounded gate. Full repository tests passed **368/368**, including actual transient PGlite/pgvector execution, with zero skips. The final focused retrieval/Formula gate passed **62/62**, zero skips. Full production builds and the final TenderApps production build passed; the final bundle is `index-B47XFTdH.js` / `index-CugebHFU.css` (110 modules). Full lint and changed-surface strict TypeScript passed. The full-app TypeScript command still reports **24 byte-identical baseline errors** in unchanged TenderBalance/Logistics surfaces; no unrelated correction is included.

This checkpoint is a locally validated retrieval/scoring pilot plus a locally exercised durable-store adapter, not a deployed enterprise matching service. Current functionality includes immutable feature/pair preparation, exact Formula replay, cache/incremental processing, bounded matrix and focused ranking, selected evidence explanations, explicit local Case reconstruction, window exports and truthful disabled assessments. Authenticated tenant storage, a deployed durable API/worker, real versioned embeddings and calibrated ANN recall, an authorized TORS provider, operational retention and production authorization remain separate decisions. Formula and Overview presentation, source datasets, canonical Agent identities and Campaign isolation are preserved.

## Failure and correction ledger

| What happened | Root cause | Correction | Reusable rule | Regression evidence |
| --- | --- | --- | --- | --- |
| Every pair carried complete repeated evidence narratives into one browser payload. | Universal deterministic arithmetic and selective detailed review shared one storage/transport shape. | Compact immutable pair records, normalized per-version inputs, bounded queries and on-demand detail. | Score eligible pairs cheaply once; load expensive evidence and assessments only for a justified request. | Core golden replay, API pagination, cache/invalidation, UI contract and scale benchmarks. |
| Full model analysis was interpreted as a universal pair step. | Retrieval, Formula scoring, TORS and consultant review had no enforced execution boundaries. | Separate typed ranking and assessment policy, provider adapter, leases and idempotency. | No model call is necessary for ordinary deterministic pair scoring. | Assessment policy/state-machine and score independence tests. |
| Compact rows initially hid expensive feature preprocessing and retained strings. | Large retrieval vocabularies, repeated JavaScript hashing and substring backing allocations dominated cold ingestion. | Bound retrieval-only vocabulary, detach/intern terms and use equivalent native server hashes. | Measure features, cold normalization, scoring, cache and total memory separately. | Benchmark correction ledger and four final source hashes. |
| Reordering source claims could alter split geography phrases and cached results. | Normalization treated Formula-sensitive source order as interchangeable. | Preserve evidence order in Formula operands and evidence-snapshot identity; freeze features. | Retrieval normalization must not silently change deterministic scoring semantics. | Native/browser hash equivalence, split-geography regression and all 1,020 oracle pairs. |
| Retry or cache imports could accept conflicting history. | Payload identity and run membership were not enforced at every write boundary. | Atomic collision checks, immutable provenance, one pair version per run, idempotent retrieval payloads and actual run-progress reconciliation. | Retry success must mean the same immutable result, not replacement by a newer payload. | Cache/run, SQL restart, payload-collision, RLS and model-partition negative tests. |
| The old snapshot exporter expected a full verbose runtime after the API became bounded. | The release projection still consumed the v1 transport shape. | Export catalog-v2 and bounded focused partitions with run/identity/count checks. | Transport changes must update generated release projections and their tests together. | Local exporter test, 79 artifact hashes and cross-index oracle comparison. |
| The selected explanation displayed the stored weight-times-Fit numerator as final Points. | Storage arithmetic and the 100-point display projection shared the same label. | Display numerator divided by five only for Formula v1.1; retain stored values and Missing. | Presentation must reconcile with the canonical result without rewriting historical schemas. | Display tests and browser values 21, 12, Missing, 8, Missing. |
| Local snapshot startup could date its source badge with the evaluation clock. | Source extraction time and current review time were conflated. | Preserve the pinned source timestamp while keeping selected-detail freshness clock-derived. | Source freshness, evaluation time and run identity are separate facts. | Local pinned source contract and final route disclosure. |

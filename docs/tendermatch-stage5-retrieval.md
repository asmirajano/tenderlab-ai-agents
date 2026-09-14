# Stage 5 — separate retrieval over sealed Formula records

Canonical owner: `agent:TL-A031`. Maturity is an isolated development method,
not a deployed API or an empirically calibrated semantic model. The approved
base is `decd4df7a7ebf67884081301f1e0ae3cdb00ddaa`. Stage 4 and its complete
707,660-candidate Formula dataset remain immutable.

## Evidence and relevance contract

One reusable profile per frozen entity is extracted from `formula_input` and
its explicit `formula_member` association. The loader verifies the approved
Stage 4 code, completion, every input body hash, every member association and
the complete input-set digest. There is no source database connection and no
new Stage 2A extraction. This stage uses the technical terms/concepts already
supported by that adapter; full descriptions, names, finance, capacity and
geography do not silently expand technical evidence. Scope is inherited,
never inferred by retrieval.

Profiles retain source and Formula input identities, technical references with
original verification status, Missing state and explicit limitations. Vocabulary
is deduplicated and Unicode-scalar sorted. The first 256 terms and 128 concepts
are retained; truncation affects retrieval only and is counted. The original
Formula inputs and scoring vocabulary are never truncated or overwritten.

| Output | Contract |
| --- | --- |
| Retrieval relevance | Separate `CALCULATED` ordering proxy, 0–1, not probability or Formula points |
| Formula result | Original Pair Score, Data Coverage, assessed-only fit, Evidence Confidence and complete criterion audit |
| Eligibility | Only existing `CANDIDATE_ELIGIBLE_WITH_LIMITATIONS` Formula records enter ranking |
| Semantic similarity | `null`; state `MISSING`; no embedding source/model |
| Human disposition / AI/TORS | Separate, not loaded or inferred by this layer |

Fallback method `tendermatch-pair-local-lexical-structured/1.0.0` uses two unique
set overlaps. Let L be the term intersection/union ratio and C the concept
intersection/union ratio. An empty union contributes zero. Store integer units:

`floor(800000 × L) + floor(200000 × C)`

Divide by 1,000,000 only to expose retrieval relevance. The 4:1 lexical/structured
weight is an explicit development policy, not an empirically calibrated fit
claim. Concepts are the inherited versioned taxonomy, not generated embeddings.
No corpus IDF, global rank fusion, score threshold or Formula-dependent tiebreak
is used. PostgreSQL independently checks both overlaps, unions, integer arithmetic
and limitation bits against the persisted profile operands.

Every existing Formula candidate is ranked, including zero overlap or Missing
technical evidence. The bounded first page is a retrieval shortlist, not an
elimination of any Formula row. All 1,320,301 unscored outcomes remain outside
this ranking dataset; no retrieval value is substituted for their null Formula
scores. Zero relevance means no overlap observed by this fallback, not incompatibility.

## Why the inherited ranking engine is not modified

The parallel retrieval worktree is clean at `d230590` and that implementation is
already part of the approved base. Its RRF values depend on directional corpus
ranks and its pilot inputs are not this sealed all-to-all dataset. Replacing it
would affect the existing frontend and prior Formula code binding. The additive
Stage 5 policy instead has pair-local values, allowing changed-entity invalidation
without changing unrelated stored relevance values. Existing production retrieval,
Formula and frontend files remain byte-identical.

## Versioning, persistence and incremental behavior

Five additive tables use schema `tendermatch_retrieval`:

- `ranking_profile`: immutable source-bound entity projection and hash.
- `ranking_run`: method/code identity, explicit sealed Formula run and input set.
- `ranking_member`: one version of every entity, sealed in the run transaction.
- `ranking_pair`: compact relevance components, profile keys and a foreign key to
  the original Formula pair. It has no Formula, human or model-output score columns.
- `ranking_completion`: verified whole-candidate count, zero count and result hash.

An unchanged input retrieves its versioned profile rather than extracting it again.
An unchanged pair reuses its immutable result. A changed supplier or tender input
gets a new profile and only its candidate intersections are recalculated; unaffected
pair/profile records remain reusable. A changed method/code identity creates a new
ranking method/run. Historical rows survive. Changes to scope require an upstream
sealed Formula run and are not authorized by a retrieval refresh.

Ordinal rank is a position within a query/run, not a persistent property of a pair.
One profile change may move other candidates' displayed positions while their
stored pair-local relevance remains reusable. Cursors therefore bind to the entire
run identity as well as direction and focus.

## Bounded contracts and index choice

`queryRanking` requires a named sealed run, `direction` (`supplier` or `tender`),
canonical focus UUID and limit 1–100 (default 25). Ordering is relevance descending,
then the opposite canonical UUID ascending. Keyset pagination has no OFFSET and
rejects malformed, wrong-run and wrong-focus cursors. It returns at most the chosen
limit plus a next cursor. Formula details are joined only after materializing the
bounded candidate page; there is no per-row Formula query or full-universe response.

`selectedRankingDetail` requires both canonical IDs and a completed ranking run.
It provides separate retrieval explanation, matched terms/concepts, source references,
the unchanged Formula record and expanded criterion audit. Noncandidate pairs return
no retrieval/Formula result in this contract; their original eligibility remains in
the Stage 3 all-outcomes contract. The function never silently chooses the latest run.

Two B-tree indexes begin with tenant, method, Formula policy and focused profile,
followed by relevance and the opposite canonical ID. They support exact focused
ordering without requiring a vector source. A profile-input index supports reuse.
The immutable source/profile/run keys prevent older input versions being mixed into
a selected run. Historical versions can increase scans/size over time; retention
and larger-scale workload calibration remain separate work.

## pgvector decision

Read-only inspection of the approved development database found PostgreSQL 18.6,
pgvector 0.8.6 installed/available, and zero embedding models/vectors. The inherited
384-dimension storage is not evidence of a real model. Stage 5 neither fills it
with lexical hashes nor registers a fabricated model.

No extension activation or ANN index is included in migration 080. For a later
approved real-vector corpus, exact search should establish recall first. HNSW can
be built without training; IVFFlat needs representative data before training its
lists. Approximate filtering can lose candidates, so tenant/model partitions and
filtered recall need measurement. These are documented properties, not measured
Neon ranking performance. [Primary pgvector documentation](https://github.com/pgvector/pgvector#hnsw).

Before any semantic extension, require an authorized model, model version,
dimensions, source-profile hash, reproducible generation, real vectors, representative
semantic relevance judgments and exact-versus-ANN evaluation. No external model API
call is authorized in this stage.

## Security and owner handoff

The runner defaults to disconnected `plan`. Other modes require explicit execution
approval plus exact project, branch and direct-endpoint attestation. The connector
checks TLS, database, login, role membership/attributes and owned-object restrictions.
It connects only to the isolated results database.

Migration 080 is owner-only and was applied by the orchestrator. It validates database, owner, branch attestation,
database comment, exact prior migrations and the approved Stage 4 completion.
It adds only new tables/functions/indexes and SELECT/INSERT grants to the existing
writer role. RLS, sealed membership and immutable triggers protect history. A
trusted service sets the tenant GUC; this is not end-user authentication. The writer
cannot update/delete/truncate or execute DDL. No source role gains permissions.

The exact owner action and verification are in
[the 080 owner runbook](tendermatch-stage5-owner-runbook.md). Owner DDL, authorized
writer persistence, local fixtures and read-only experimentation are separate
evidence stages; the final evidence report records their actual outcomes.
No frontend, static export, external model, AI/TORS, source write, push, merge,
deployment or publication is part of this stage.

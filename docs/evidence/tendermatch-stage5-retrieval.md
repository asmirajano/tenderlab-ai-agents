# Stage 5 evidence — persisted isolated retrieval fallback

Stage 5 is complete in the isolated development results environment and ready for
orchestrator review. It is not a deployed semantic service. The orchestrator
committed owner-only 080 DDL; the guarded writer persisted and verified the exact
707,660 existing Formula candidates. No embedding model/vector was invented or
requested. The separate final audit was read-only and committed no database writes.

## Selected identity and parallel-state audit

Approved Stage 4 base: `decd4df7a7ebf67884081301f1e0ae3cdb00ddaa`.
Worktree: `C:/CodexWork/tendermatch-neon-all-to-all`; branch:
`codex/tendermatch-neon-all-to-all`; no upstream. Both remotes were fetched/pruned.
`origin/main` remained `d230590cf5ee99a679f162b2e3a19b65752c0f16`; the starting
checkpoint was ahead 10 / behind 0 and clean.

The parallel `C:/Users/Cowork 2/.codex/worktrees/tendermatch-retrieval-ranking`
worktree was clean at that same `d230590` commit. Its implementation already exists
in this branch. The Formula, business-table, release and original standalone
source worktrees were inspected and preserved. The main checkout at `3395774`
has unrelated untracked build/deliverable/package-lock/tmp paths; none were touched.
No checkout, reset, merge or deployed-release substitution occurred.

The continuation preflight also observed the unrelated logistics-regression
worktree at `d230590` and a newer TenderBalance table-template checkpoint at
`6f5aa11a240cdbaeff1fdbc4295adc9c4ab85b98`; both were preserved. Their work is not
part of this selected Stage 5 implementation or its evidence.

Final fetch/prune and parallel recheck on 2026-09-07 (Asia/Tashkent) kept
`origin/main` at `d230590` and the relevant retrieval-ranking, business-table,
enterprise-table and selected release worktrees clean and unchanged. Unrelated
logistics-regression advanced to `8f1c0556e72aa41ad3542cee6e25fae2418fc0c6` and
TenderBalance table-template to `49f1ed73289d5e973569e2b0e7e1ee209eefe6fc`; neither
was merged or modified. The latter's status check emitted unrelated missing
partial-node-module symlink warnings, with no tracked or untracked Git changes.
The selected Stage 5 worktree contained only its 17 additive files before commit.

## Protected boundaries

Formula run:
`8c60354ecfd613fab2edca21528fab8c22aeb275df7115590a5916847c78efc5`.
Formula outcome:
`b7a12c75afc68f241ce740eaf557ada12abb79159406c1ebf6471e69ed6e5df6`.
Stage 4 implementation hash:
`3039fdbd0577772ac53f8fdce92e0e4cc101b448e84d5d3a74357f33baf289ca`.

The unchanged 117 × 17,333 population contains 2,027,961 Stage 3 outcomes:
707,660 Formula candidates, 414,604 scope-not-demonstrated, and 905,697
outside Formula scope. The latter 1,320,301 remain unscored. Retrieval consumes
only the existing sealed candidate rows and never alters their Formula scalar,
criteria, Missing, zero, confidence, eligibility or limitation semantics.

The loader reads only `tendermatch_results_dev`, verifies sealed completion and
every input hash/association, then extracts 17,450 reusable profiles. No source
capture, enrichment, supplier readiness mapping or Formula calculation is rerun
against live supplier/tender systems. No source connection was made.

## Actual pgvector availability

Read-only inspection, using the guarded results writer, returned PostgreSQL 18.6
and installed/available pgvector 0.8.6. `pg_am` exposes both `hnsw` and `ivfflat`.
There are zero registered embedding models and zero feature embeddings. The
inherited 384-dimensional schema is not a real embedding source. Its pre-existing
parent `feature_embedding_hnsw` index (m=16, ef_construction=64) is on an empty
partitioned table; it was neither changed nor treated as tested real-vector retrieval.

The implemented method is explicitly lexical/structured fallback. Its relevance
is a 0–1 ordering proxy, stored as integer millionths; semantic similarity remains
null. No model API, fake embedding, vector source, dimensionality guess, embedding
model registration or ANN index build occurred. Appropriate current indexes are
exact B-tree focused ranking indexes. Future HNSW/IVFFlat decisions require a real
authorized corpus, an exact-neighbor baseline and filtered recall measurement.
[Primary index behavior reference](https://github.com/pgvector/pgvector#hnsw).

## Reusable method and output inspection

Profile version: `tendermatch-frozen-retrieval-profile/1.0.0`.
Ranking method: `tendermatch-pair-local-lexical-structured/1.0.0`.
Schema: `tendermatch-development-ranking/1.0.0`.

Relevance uses unique-set Jaccard term/concept overlap with fixed 4:1 weights,
independent integer flooring, and empty-union zero. The weights are not calibrated
against human relevance labels. It is neither Formula scoring nor learned semantic
similarity. Vocabulary is inherited from supported frozen technical evidence;
financial, geography, capacity and company-name facts cannot create technical terms.

Profile references preserve original source status and artifact identities. Missing
technical evidence, truncation and zero observed overlap remain explicit. Every
candidate, including a retrieval zero, remains queryable. Canonical UUID tiebreaks
make full directional traversal stable. Bounded pages and selected detail expose
retrieval separately from the original Formula record and expanded criterion audit;
human disposition and AI/TORS are explicitly not loaded.

The recorded real-data samples are deterministic strata by scope, relevance bucket
and limitations, plus bounded supplier leaders. They show fallback mechanics and
traceability, not measured semantic accuracy or consultant acceptance. No human
labelled relevance corpus or precision/recall benchmark was available or invented.

## Full frozen-data experiment

See `tendermatch-stage5-inspect.json` for run/code/input identities, exact counters,
two whole-candidate result hashes, Formula candidate digests, sample explanations,
profile reuse, timing/memory/transport metrics and protected-state before/after.
The final code-bound run is
`b0ba6e965bc81ef5f3d53466d815c1c7c4c4596bd21b16ff9342b4098b484c7d`;
implementation hash `ff30b52ab11a8789cae5d9e5c30cb74153ce56a6a93e77c9039ec9a5dbbc27f5`.
Both complete passes produced ordered result hash
`1a7cc57af3cf1d06824700cfc4c367658b9abc67519d372a8e77fc1f4c123b47` and
the same independent Formula-candidate payload digest
`fa1c076d43a9ee1cc62015f0cc975e7991f6ddd5cb0eefaa5d197b778bb0d80e`.
This candidate-only digest is deliberately distinct from the Stage 4 all-outcome
hash, which also includes all unscored intersections.

| Measurement | Actual isolated-results read-only result |
| --- | ---: |
| Candidate rows per pass | 707,660 |
| Positive retrieval relevance | 24,007 |
| Zero retrieval relevance, still ranked | 683,653 |
| Relevance [0, 0.1) including zero | 695,760 |
| Relevance [0.1, 0.2) | 7,349 |
| Relevance [0.2, 0.3) | 4,538 |
| Relevance [0.3, 0.4) | 13 |
| Entity profiles | 17,450; 18 with Missing technical evidence; 0 truncated |
| Serialized profile payload | 18,700,746 bytes |
| Unchanged profile replay | 17,450 reused; 0 extracted |
| First full ranking experiment | 152,810 ms; 759 bounded pages |
| Independent full replay | 170,502 ms; same ranking and Formula candidate digests |
| Whole inspection session | 348,248 ms; 1,598 queries |
| Serialized request / response bytes | 413,586 / 647,898,980 |
| Largest single response / pending insert payload | 848,001 / 334,807 bytes |
| First-pass observed heap peak / final RSS | 356,368,024 / 526,848,000 bytes |
| Stage 5 Neon rows written during this read-only experiment | 0 |

Transport sizes are measured JSON request/response bytes, not billed network usage.
The experiment intentionally transfers original Formula component arrays to hash
their preservation; ordinary bounded ranking pages do not transfer that universe.

Inspection found a Works sample with retrieval 0 but Formula 6 / coverage 40,
and another with retrieval 0.326315 but Formula 31 / coverage 40. A Goods sample
has lexical `tractors` and inherited concept `agriculture`, relevance 0.3, Formula
48 / coverage 65. A concept-only `packaging` example has relevance 0.2, Formula
25 / coverage 45. These differences confirm that the signals are not substituted
for one another. A weak generic word-only hit (`heavy`, relevance 0.024242) remains
an ordering limitation, not evidence of qualification. Original INFERRED and
STATED_UNVERIFIED statuses are retained; no reference became VERIFIED.

## Isolated PostgreSQL benchmark

Evidence class: `SYNTHETIC_LOCAL_PGLITE_NOT_NEON`. Fixture: 8 suppliers × 500
Goods tenders, 4,000 candidates. These are clearly synthetic evidence/identities.
Both actual SQL migrations and the guarded persistence/query implementation were
executed locally, without a Neon or source connection.

| Measurement | Actual local result |
| --- | ---: |
| Profile extraction | 163.76 ms |
| Profile/run/member persistence | 168.28 ms |
| Rank calculation and persistence | 2,601 ms |
| Independent full SQL readback/recalculation | 1,471 ms |
| Unchanged result reuse | 4,000; 0 recalculations/inserts; 1,549 ms |
| Supplier page | 25 rows; 19,264 bytes; 12.44 ms |
| Tender page | 8 rows; 6,365 bytes; 10.66 ms |
| Supplier server plan | `ranking_pair_supplier`; 0.514 ms |
| Tender server plan | `ranking_pair_tender`; 0.248 ms |
| Complete paginated supplier traversal | 500 unique rows |

The tender plan additionally sorts its eight-row subset, a reasonable planner
choice at this cardinality. The supplier plan reads 26 index candidates for the
25-row page plus next-page sentinel. No model ranking or vector latency is implied.

Storage including indexes/toast: profile 999,424 bytes; run 32,768; member 385,024;
pair 5,218,304 (heap 1,310,720); completion 32,768. Total 6,668,288 bytes. These
measurements are not extrapolated into a fabricated Neon storage claim.
`tendermatch-stage5-benchmark.json` preserves complete EXPLAIN ANALYZE/BUFFERS plans,
hashes, per-pass metrics and profile/input provenance.

## Completed Neon persistence and independent audit

The orchestrator confirmed all 25 owner statements including COMMIT in project
`dry-union-87553313`, development branch `br-polished-boat-b1qddx0m`, database
`tendermatch_results_dev`, as `neondb_owner`. Guarded writer inspection verified
the migration marker, owner/RLS/grants and unchanged Stage 4 identity before
inserting. The worker used only `tendermatch_result_writer_dev`, never owner DDL.
`tendermatch-stage5-execute.json` records the actual execution; the separate
`tendermatch-stage5-validation.json` records the final read-only SQL audit.

| Persisted table | Exact rows | Total bytes including indexes/toast | Heap bytes |
| --- | ---: | ---: | ---: |
| `ranking_profile` | 17,450 | 32,186,368 | 24,526,848 |
| `ranking_run` | 1 | 32,768 | 8,192 |
| `ranking_member` | 17,450 | 10,551,296 | 3,866,624 |
| `ranking_pair` | 707,660 | 994,476,032 | 231,890,944 |
| `ranking_completion` | 1 | 32,768 | 8,192 |
| **Stage 5 total** | | **1,037,279,232** | |

Whole development database size at audit: **2,710,536,192 bytes**. This is an
observed database-size measurement, not billable storage or a before/after delta.
The pair indexes and repeated immutable identity keys materially exceed the pair
heap size; retention/compaction and operational storage budgeting remain future
work. No schema compression/rewrite was performed to improve these measurements.

| Measurement | Actual Neon result |
| --- | ---: |
| Full calculation/insertion | 707,660; 430,033 ms; 759 batches |
| Verified full persisted readback | 707,660; 204,802 ms; same ranking and Formula hashes |
| Unchanged full cache replay | 707,660 reused; 0 recalculations/inserts; 225,465 ms |
| Stored profiles reused by independent audit | 17,450; 0 extracted |
| Independent SQL uniqueness/component reconciliation | 707,660 unique; 0 invalid; 0 missing Formula links; 3,865 ms |
| Actual relevance range | 0–0.371428; 683,653 zero / 24,007 positive |
| Complete writer verification session | 942,666 ms; 5,765 queries |
| Writer-session request / response bytes | 584,328,383 / 1,267,596,722 |
| Largest response / pending insert payload | 848,001 / 334,807 bytes |
| Insertion observed heap peak / final session RSS | 308,057,000 / 524,464,128 bytes |
| Separate read-only audit session | 67,194 ms; 322 queries; 0 committed writes |

The verified readback path recomputes and compares every stored result before
hashing. Its `evaluated: 0` counter means no new cache calculation/insertion was
needed, not that verification was omitted. The following unchanged replay reads
the persisted cache without recomputation. Both, plus the two earlier read-only
experiment passes, produce the exact ordered outcome and Formula-candidate hashes
recorded above. The independent validator additionally checks database arithmetic,
set cardinality, run sealing and stored profile reuse in a read-only transaction.

| Focused query | Bounded default page | Complete keyset traversal |
| --- | --- | --- |
| Supplier | 25 rows, 19,362 bytes, 492 ms | 9,592 rows in 96 pages; 38,835 ms; 9,028 zeros |
| Tender | 25 rows, 19,425 bytes, 359 ms | 105 rows in 2 pages; 732 ms; 55 zeros |

Page timings include the sealed-completion check and network round trips; they
are single observations, not percentile/SLA claims. Full traversals use limit 100,
prove strict relevance/UUID order and uniqueness, and return at most 75,837 bytes
per supplier page / 75,437 per tender page. An empty supplier and empty tender
each return zero rows. Eleven selected-detail strata agree with full readback,
original Formula metrics, criterion-point sums and fixed denominator 100.

The execution report's page/detail parity loops take 7,567 ms for 25 supplier
details and 1,787 ms for five tender details; these intentionally include separate
selected-detail audits and are **not** ordinary bounded-page latency. Its recorded
server-side ranking-selector plans use `ranking_pair_supplier` (26 candidates,
0.291 ms, 137 shared hits) and `ranking_pair_tender` (five candidates, 0.243 ms,
17 shared hits), with no shared reads. Both use the pinned-member index; the tiny
tender subset is sorted in memory. These cached selector plans exclude network
and the subsequent bounded Formula join and do not establish cold-cache behavior.

All five tables are owned by `neondb_owner`, RLS enabled, and SELECT/INSERT only
for the writer. Actual negative probes deny update/delete/truncate/DDL, adding to
sealed membership, and cross-tenant writes; cross-tenant reads return zero.
All probes roll back, with zero committed probe rows. The trusted-service tenant
GUC is explicitly not end-user authentication. Protected legacy table counts,
zero embedding models/vectors, original Formula completion and every candidate
Formula payload digest are unchanged before/after persistence and final audit.

## Incremental, integrity and security evidence

Actual local SQL fixture tests prove:

- All four candidate pairs persist, including three retrieval zeros; two outside-scope
  intersections remain absent from ranking and unchanged in Formula/eligibility.
- Changed supplier and changed tender fixtures each extract one new profile, reuse
  four profiles, recalculate two candidate results and reuse two unaffected results.
  Prior run readback remains byte-equivalent.
- The unchanged fixture reuses all five profiles with zero extraction and all four
  pair results with zero recalculation/insert.
- Foreign keys require a real original Formula pair; profile/reference operands,
  overlap/union counts, integer relevance, Missing/truncation limitation bits,
  sealed membership and whole-run candidate count are independently DB-checked.
- Corrupt result arithmetic, fabricated profile operands, incomplete completion,
  post-transaction membership insertion and unauthorized DDL fail.
- SELECT/INSERT-only writer grants, no update/delete/truncate, and RLS cross-tenant
  zero-read/write denial are exercised. Tenant GUCs are a trusted-service boundary,
  not an end-user authentication system.
- Supplier/tender pagination covers zero ties without duplicates, rejects oversized
  and cross-focus cursors, and agrees with selected detail and Formula criterion sums.

The full real-data candidate histogram quantifies the existing incident sets:
supplier counts are 0 for 9 profiles, 2,995 for 3, 6,597 for 103, and 9,592 for 2;
tender counts are 0 for 7,741 profiles, 5 for 2,995, and 105 for 6,597. For a change
that preserves candidate eligibility, only that profile's incident ranking values
need recalculation; changed eligibility/profile inputs require a newly sealed
upstream Formula run and can change that incident set. No real frozen source
profile was mutated just to simulate invalidation. Synthetic changed-profile SQL
tests prove unaffected reuse while keeping prior run history readable.

## Failure/correction ledger

| What happened | Root cause | Correction | Reusable rule | Regression evidence |
| --- | --- | --- | --- | --- |
| Existing rank-fusion values would change for unrelated pairs after a corpus update. | Corpus-relative ordinal scores are not pair-local cache values. | Add a versioned pair-local fallback; compute displayed order from a pinned run. | Separate reusable pair relevance from query-relative rank positions. | Changed supplier/tender SQL fixture reuses unaffected results. |
| A broad static write guard initially matched a ranking INSERT containing a `formula_policy` column. | The regex treated a column name as the mutation target table. | Match the qualified Formula table immediately after INSERT/UPDATE. | Boundary guards should identify mutation targets, not incidental identifiers. | Focused source-boundary regression passes with actual Formula files byte-identical. |
| Runtime and PostgreSQL can disagree on non-ASCII sort order. | JS UTF-16 ordering and locale-dependent DB collation are different. | Explicit Unicode scalar ordering and PostgreSQL `COLLATE "C"`. | Hash/cap selection requires an explicit cross-runtime ordering policy. | Unicode/bounded-profile fixture plus actual SQL operand validation. |
| A per-row Formula join would scale HTTP/database work with page size. | Selected detail access was being reused for a complete page. | Materialize a bounded ranked page and join its Formula rows once. | Keep selected detail and bulk bounded-page query shapes separate. | Actual page/detail parity and benchmark plans. |

## Verification and local handoff

At the historical owner gate, full `npm test` passed 556/556 with zero skips.
The final persisted-evidence regression adds a thirteenth Stage 5 test, exercising
current code/report/validator binding and exact Neon counts. All 17 Stage 5 files
were staged before the final tracked-path naming/security guards ran.

Final full `npm test`: **557/557 passed**, zero failures/cancellations/skips;
test-runner duration **17,527.0031 ms**. All three application builds and generation
of 64 versioned Agent Specifications passed. Evidence-enabled Stage 4, Stage 5
experiment/benchmark and persisted-Neon regressions all ran, not skipped.
Existing chunk-size, CSS-name collision and route-classification warnings remain
outside this scope. No generated build output is committed or deployed.

Full `npm run lint` passed. Strict TypeScript for
`packages/tendermatch/src/retrieval-stage5.ts` passed with ES2022, NodeNext,
allowImportingTsExtensions and skipLibCheck. This is not a claim that unrelated
full-application TypeScript baselines were repaired. Final logs are
`outputs/stage5/final-full-tests.log`, `final-lint.log` and `final-typecheck.log`
(local ignored outputs).

The final code hash agrees with experiment, benchmark, persistence and independent
audit. Protected Formula hash remains exactly the approved Stage 4 value above.
Staged whitespace validation passed. The 17-file secret-pattern scan found zero
credential URLs, API/database tokens or private-key material.
The local commit containing this report is the Stage 5 handoff atop the exact
approved base `decd4df7a7ebf67884081301f1e0ae3cdb00ddaa`; its final Git SHA and
clean-worktree check are reported to the orchestrator after committing. All
changes are additive Stage 5 files: two migrations, three documentation contracts,
five evidence artifacts, the profile/method module, runner/library/benchmark/audit,
and test/fixture. No pre-existing source or Stage 4 implementation file changed.

## Owner action identity and remaining limitations

Exact SQL: `db/tendermatch-dev/080-ranking-up.sql`.
Exact action/verification: `docs/tendermatch-stage5-owner-runbook.md`.
Canonical LF SHA-256 of the exact 080 SQL text:
`fb6c91401508b348a8cb6715d71087e2f58b99aca6f76a3c6eaefb1bbe0b318b`.
Target: project `dry-union-87553313`, development branch
`br-polished-boat-b1qddx0m`, database `tendermatch_results_dev`, owner `neondb_owner`.
Five additive tables; no prior schema/data alteration, no vector activation.

The reviewed owner migration and guarded writer continuation are complete. Do not
reapply 080 or run its destructive rollback. This handoff stops for orchestrator
review; it does not authorize a next stage or production integration.

Other limits: no learned semantics/ANN recall, no labelled relevance accuracy,
no multilingual synonym enrichment, notice-level technical terms only, no business
thresholds, no frontend/API deployment or static export integration, no end-user
authentication, no AI/TORS/human decisions, and no retention/operational rollout.
No push, merge, deployment, publication, credential/billing change or source write.

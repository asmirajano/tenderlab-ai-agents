# Stage 4 evidence — Formula v1.1 candidate scoring

Selected base: `4b66114330e302f80f9415910d2e029106578d76`. Branch:
`codex/tendermatch-neon-all-to-all`. Worktree:
`C:/CodexWork/tendermatch-neon-all-to-all`. The enclosing commit identifies
the completed local Stage 4 checkpoint. Owner: TL-A031 TenderMatch.

Status: **complete local development checkpoint; awaiting Stage 4 orchestrator
review**. Persistence, full recalculated readback, unchanged cache replay,
independent SQL and all regressions passed on 2026-09-06.
This is an isolated development checkpoint, not a release or human decision.

The read-only Git preflight and later refetch both confirmed `origin/main` at
`d230590cf5ee99a679f162b2e3a19b65752c0f16`. The approved Stage 3 base is eight
local commits ahead, with no remote-only commits. The related TenderMatch
release/retrieval worktrees are clean. The original standalone TenderBoost
worktree is clean at `04b0b2a723223d11617837ee0e7562fa48168cd9`. No checkout,
merge, pull, reset, release or source synchronization was performed.

## Outcome and population

Exactly **707,660** approved Stage 3 candidate pairs receive a numeric
Formula v1.1 Pair Score, including **266,866 numeric zeros**. The other
**1,320,301** outcomes remain null/unscored. Every one of the pinned
117 suppliers × 17,333 tenders = **2,027,961** intersections is accounted for.

| Exclusive Stage 3 outcome | Total | Scored | Unscored |
| --- | ---: | ---: | ---: |
| Candidate eligible with limitations | 707,660 | 707,660 | 0 |
| Scope not demonstrated | 414,604 | 0 | 414,604 |
| Outside Formula v1.1 scope | 905,697 | 0 | 905,697 |
| **Total** | **2,027,961** | **707,660** | **1,320,301** |

The scored population is 692,685 Goods pairs and 14,975 Works pairs. The
140,600 service-oriented potential pairs from Stage 3 remain outside Formula
scope. All Stage 3 hard gates remain NOT_ASSESSED, and all 117 supplier
readiness records remain NEEDS_EVIDENCE. No eligibility promotion occurs.

Scores range **0–55**. Of the numeric zeros, 59,373 have zero assessed coverage;
207,493 have assessed evidence but earn zero points. Missing Fit is SQL null,
its criterion state is explicitly Missing, and its points are zero. Assessed
Fit 0 remains a different state. The denominator is **100 for every score**.

| Data Coverage | Candidate pairs |
| --- | ---: |
| 0 | 59,373 |
| 25 | 76 |
| 35 | 213,018 |
| 40 | 11,904 |
| 45 | 215,806 |
| 55 | 54,110 |
| 60 | 2,976 |
| 65 | 150,397 |

Evidence Confidence distribution: 0 for 59,373 pairs, 30 for 543,949, and
50 for 104,338. No independently VERIFIED source claims were created.
Assessed-only fit ranges 0–100; the 159 values of 100 concern assessed criteria
only and do not imply complete evidence or a 100-point Pair Score.

Principal limitation counts: technical relevance 683,874; capacity 5,716;
comparable experience 3,095; similar contracts 14,975. Selection uses maximum
unearned points, then Missing before assessed on a tie, then criterion order.
The complete score/coverage/fit/confidence/criterion distributions are retained
in the machine evidence; these summaries do not define score thresholds.

## Formula, adapter and identities

Formula `tendermatch-match-formula/1.1.0` and policy
`tendermatch-coverage-adjusted-goods-works/1.1.0` are unchanged from the approved
base, including the original scalar scorer. The versioned adapter and storage
contract are documented in [the Stage 4 runbook](../tendermatch-stage4-formula.md).

| Identity | Value |
| --- | --- |
| Stage 4 schema | `tendermatch-development-formula-result/1.0.0` |
| Adapter | `tendermatch-stage2a-formula-adapter/1.0.0` |
| Stage 4 run | `8c60354ecfd613fab2edca21528fab8c22aeb275df7115590a5916847c78efc5` |
| Stage 4 code | `3039fdbd0577772ac53f8fdce92e0e4cc101b448e84d5d3a74357f33baf289ca` |
| Stage 4 policy hash | `1c77e56b4e95ae4d5fd726ae27c12e3314a1bdbe0c567cf58107cbebfe5c44de` |
| Adapter input hash | `264a195e87118b5da01225547800d84a009a88cd91861e2ccbb7461de5075de9` |
| Full ordered result hash | `b7a12c75afc68f241ce740eaf557ada12abb79159406c1ebf6471e69ed6e5df6` |
| Stage 3 run | `7b3fbc39a401a72a6452c1d9bb050c18bc92d32a0f69acb4829f0a42236e102d` |
| Stage 3 outcome hash | `9afc0bf6971a5c0ece68ea1aea01a7f14731cee03ec77e8179e0a6d618d8434a` |
| Stage 2 manifest | `e928df5e6a432fa23c8ea95dbfbf1aee4f1c883646d5ed72fd2856d994102ac2` |
| Normalization | `782f8b38737b21f6940b5c3f4fe4ec6eb890be4e2d168f19ba29b4952530e5f9` |
| Stage 2A readiness | `ce4d742d71cccc329a3129bb549273c41f4efe3fafcdd3b862dbe4ef6058d844` |

Code identity uses canonical-JSON SHA-256 over LF-normalized source strings;
raw-byte artifact hashes are recorded separately. Run identity also retains
all Stage 2/2A outcome, schema, policy and code identities. Timestamps are
evaluation metadata; they do not affect deterministic scores or cache keys.

The adapter maps 380 claim/field reference groups and withholds 98 unresolved
or unsupported facts from the considered fields. It reuses supported technical
scope, unambiguous physical capacity and mapped geographic markets. Original
claim status, fact IDs, source records and artifact hashes remain inspectable.
One source claim contributes once per Formula field even if split into clauses.

All comparable-contract and financial-threshold criteria remain Missing.
Physical stock without a reporting vintage retains that limitation; output
capacity requires a time basis. Missing artifacts, uncertain or contradictory
quantities and unsupported values are withheld. Missing tender country cannot
trigger an empty-string geography match. No inferred threshold, invented
qualification or new evidence enters scoring.

## Persistence and measured validation

The orchestrator applied `070-formula-up.sql` through the authenticated owner
Console in the verified development target: project `dry-union-87553313`,
branch `br-polished-boat-b1qddx0m`, database `tendermatch_results_dev`, endpoint
`ep-dark-dew-b15ctyr1.c-5.eu-central-1.aws.neon.tech`. All 22 statements
committed. Migration version: `20260906-formula-stage4-v1`.

The existing `tendermatch_result_writer_dev` login performs all result writes.
Five additive `formula_*` tables preserve one shared entity projection, one
immutable evaluation per input pair/policy, sealed run membership and a verified
completion record. Seven compact criterion arrays retain state, nullable Fit,
points, maxima, confidence, evidence group and limitation masks. Source
references are shared per entity and expanded through the versioned audit API.
The rollback file is prepared only and refuses populated history.

Machine evidence: [final isolated experiment](tendermatch-stage4-inspect.json),
[execution/readback/reuse](tendermatch-stage4-execute.json), and
[independent SQL/regressions](tendermatch-stage4-validation.json).

| Pass | Intersections reconciled | Candidate calculations | New inserts | Time |
| --- | ---: | ---: | ---: | ---: |
| Final-code isolated experiment | 2,027,961 | 707,660 | 0 | 289.581 s |
| Initial persistence | 2,027,961 | 707,660 | 707,660 | 621.543 s |
| Independent full readback | 2,027,961 | 707,660 verification calculations | 0 | 342.001 s |
| Unchanged cache replay | 2,027,961 | 0 | 0 | 387.266 s |

All four passes have identical ordered result hashes and distributions, and
reproduce the original Stage 3 eligibility hash. Readback's `evaluated: 0`
counts cache misses, while `verified: 707660` records the actual independent
recalculations. The cache pass proves complete reuse; no faster latency is
claimed from these observations. Real retries: zero.

| Additive table | Rows | Total bytes including indexes/TOAST |
| --- | ---: | ---: |
| formula_input | 17,450 | 40,124,416 |
| formula_run | 1 | 65,536 |
| formula_member | 17,450 | 9,904,128 |
| formula_pair | 707,660 | 607,412,224 |
| formula_completion | 1 | 49,152 |
| **Total** | | **657,555,456 (627.09375 MiB)** |

The scoring heap itself is 289,857,536 bytes; the full score-table size above
includes its primary and tender lookup indexes. The complete development
database measured 1,673,043,968 bytes after execution. No second full pair
matrix is stored for the replay or run membership.

Each universe pass uses 585 pages of at most 4,096 intersections. The maximum
scoring insert payload is 1,022,922 serialized bytes. Entity projections total
27,350,552 serialized bytes and are loaded once per run. Highest batch-sampled
heap across persistence/readback/replay was 305,639,864 bytes; final process RSS
was 470,982,656 bytes. These are per-process observations, not continuous peak
RSS or whole-machine measurements.

The full writer session including preflight, registration, all three passes and
checks took 1,522.282 s: 4,417 queries, 2,092,141,694 serialized parameter bytes,
1,660,559,050 serialized returned-row bytes, maximum response 2,304,553 bytes.
These counters exclude SQL text and protocol/TLS overhead and are not billed
network traffic. The report's `startedAt` is assigned after input preflight;
`metrics.elapsedMs` includes that preflight. The separate final inspect session
took 388.917 s including its preflight. No source connection or per-pair source
query was made.

Bounded stored queries and expanded audit/export comparisons passed: a
supplier page returned 25 rows in 195 ms; a tender page, 25 rows in 98 ms;
one pair detail, 94 ms. Responses were 11,826 / 11,779 / 474 serialized bytes.
Database EXPLAIN ANALYZE used `formula_pair_pkey` and `formula_pair_tender` for
the two 25-row index probes, with execution times 0.107 / 0.140 ms and no shared
block reads. Those server times exclude network and application work. These
are observations, not a concurrency or production-latency benchmark.

Actual writer security checks denied UPDATE, DELETE, TRUNCATE and DDL on the
five new tables. Other-tenant reads returned zero rows, other-tenant writes
were denied, and sealed membership could not be appended. Zero probe rows
were committed. The existing restricted login/role owns no objects and gains
only SELECT/INSERT on the new ledger. Tenant GUC isolation is trusted-service
isolation, not user authentication. All 15 protected legacy scoring, retrieval,
model and human-state tables remained zero before and after.

## Regression and correction evidence

PGlite executed the actual additive SQL in a disposable PostgreSQL engine.
Tests prove candidate-only scoring, explicit Missing versus zero, original
Formula parity, conflicting/uncertain and absent-artifact handling, fixed
weights, component sums, evidence groups, deterministic limitations, complete
membership, immutable history, tenant/permission denials and bounded query
parity. Changed supplier and tender fixtures each recomputed exactly their two
candidate intersections and reused the other two; old runs remained readable.
Noncandidate intersections stayed unscored. No source data was changed to
manufacture incremental evidence.

Independent SQL found 707,660 rows and 707,660 unique input pairs, range 0–55,
266,866 zeros, 59,373 zero-coverage scores and **zero component-sum violations**
in 5.881 s. A separate full Stage 3-to-Formula join independently confirmed
905,697 outside-scope outcomes with zero scores, 414,604 scope-not-demonstrated
outcomes with zero scores and all 707,660 candidates scored. All 50 selected
real-input samples matched the original Formula's scalars and five criteria.
Synthetic clocks were used only by the oracle's unrelated freshness function
and were not stored as tender facts. All pinned tender scoring-term sets are
nonempty; no whitespace-only country operand was found.

Real-input cache-impact accounting identifies 103 suppliers with 6,597 candidate
intersections, three with 2,995, two with 9,592 and nine with zero. A changed
Goods tender affects 105 candidate scores; a Works tender affects five; an
outside-Formula tender affects zero scores. This is candidate scoring-key
invalidation, separate from Stage 3's full-universe eligibility invalidation.

The final complete repository suite passed **544 tests, zero failures, zero
skips**, with PGlite and real Stage 4 evidence assertions enabled (21.047 s).
Strict adapter/import TypeScript passed (2.656 s), and lint passed (36.627 s).
The 17 added Stage 4 test cases are included in that full count. Test and check
logs are retained under the ignored `outputs/stage4/` directory.

| What happened | Root cause / layer | Correction | Reusable rule | Evidence |
| --- | --- | --- | --- | --- |
| Initial new SQL did not parse in PGlite. | PL/pgSQL condition parsing around inline CASE. | Parenthesize CASE operands before deployment. | Execute the actual migration in a disposable database before applying it. | Final PGlite and all 707,660 guarded real inserts passed. |
| Two initial oracle fixtures failed before scoring. | Synthetic field name outside the existing source allowlist and missing oracle snapshot clock. | Use the real source field vocabulary and explicit synthetic valid oracle clocks. | Fixture setup must satisfy the unchanged source contract. | Original Formula boundary tests pass. |
| A final-code inspect was interrupted during task coordination. | Active process ended before report write. | Repeat only the discarded-write final inspect; preserve initial successful evidence and all Stage 2/3 artifacts. | Bind completion to a finished report and hash, not a progress line. | Final inspect and all three persisted/replay passes agree. |

All three production builds and generation of exactly 64 Agent specifications
passed. Existing chunk-size, CSS filename and route-classification warnings
remain. No frontend changed, so no new product-browser QA or deployment replay
is claimed. The unrelated full-app TypeScript baseline is not claimed fixed;
the changed adapter and imports receive a strict standalone check.

All 14 checkpoint files are additive Stage 4 paths: adapter; two runtime/input
libraries; explicit scorer and validation commands; two migration/rollback
files; focused tests; active-task/runbook documentation; and four evidence
reports. Existing tracked content, including Formula, Stage 2/2A/3, frontend,
source contracts and canonical registry, is byte-identical to the approved
base. A local secret-pattern scan found no findings in these Stage 4 files;
this is a bounded pattern check, not proof against every secret format.

## Scope and limitations

This stage uses the explicitly approved historical input pin. It makes no new
source capture and no claim that the source databases have remained unchanged
since Stage 3. It does revalidate every pinned normalized body, readiness body,
association, Stage 3 outcome and implementation identity before scoring.

The Formula remains a notice-level weighted comparison. Lexical overlap is
not a specification compliance review. Capacity Fit 3 indicates supported
supplier-side capacity evidence while the tender threshold remains unknown.
Geography points do not prove delivery feasibility. Mixed and provisional
supplier scopes remain subject to review. Source timezones, detailed tender
requirements, sanctions/compliance and independent verification are unresolved.

Even all presently supported Formula operands cannot reach 100 points:
comparable contracts and financial comparisons remain missing, and capacity
stays Fit 3. The theoretical adapter maxima are 57 Goods / 52 Works points,
with coverage 65 / 60. No weights or denominator are renormalized to hide this.

No thresholds, Match/Non-match labels, retrieval, embeddings, rankings, AI/TORS,
shortlist, frontend, source write, human disposition, credential/billing change,
push, merge, deployment or publication occurred. The original standalone source
worktree and canonical Agent registry remain unchanged.

Stop at the completed local checkpoint for orchestrator Stage 4 review.

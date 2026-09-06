# Stage 6 evidence — isolated persisted shortlist

The isolated implementation, full real-data comparison/replay, synthetic SQL
tests and authorized Neon persistence are complete. The orchestrator applied
the unchanged owner-only 090 migration; the guarded writer persisted exactly
17,450 contexts/members and 28,034 shortlist pairs. This is a development method,
not a deployed feature, human decision or authorization to execute AI/TORS.

## Selected identity and boundaries

Approved base `263389a58674484cbdae4539e8edeb95c9f2f215` in
`C:/CodexWork/tendermatch-neon-all-to-all`, branch
`codex/tendermatch-neon-all-to-all`, no upstream. Both remotes fetched/pruned;
`origin/main` remained `d230590cf5ee99a679f162b2e3a19b65752c0f16`; selected base
ahead 11 / behind 0 and clean at start. The parallel retrieval-ranking worktree
remained clean at `d230590`, with relevant business/enterprise/release worktrees
preserved. No parallel merge, checkout, reset or production-release substitution.

Canonical owner is `agent:TL-A031`; maturity is an isolated development method.
The scoring-governance and real-Agent development gates informed the separation
of evidence dimensions, realistic policy comparison, explicit limitations and
owner-action pause. They do not turn a shortlist into a fit or approval decision.

Sealed Stage 5 run:
`b0ba6e965bc81ef5f3d53466d815c1c7c4c4596bd21b16ff9342b4098b484c7d`;
outcome `1a7cc57af3cf1d06824700cfc4c367658b9abc67519d372a8e77fc1f4c123b47`.
Stage 4 run:
`8c60354ecfd613fab2edca21528fab8c22aeb275df7115590a5916847c78efc5`;
outcome `b7a12c75afc68f241ce740eaf557ada12abb79159406c1ebf6471e69ed6e5df6`.
All 707,660 ranking/Formula candidates, 17,450 retrieval profiles and 1,320,301
unscored outcomes remain untouched. No prior implementation or evidence file changed.

## Exact Stage 6 method identity

Policy version `tendermatch-directional-shortlist/1.0.0`, `balanced-100-3`;
schema `tendermatch-development-shortlist/1.0.0`.
Final implementation hash:
`952456e7ff4cf976bca3e987b22011445130eeac4297eadceeb8f939a6358711`.
Policy hash:
`6304ba18b66bd0f76ab3c4a3665d409b3933346137621872621472391d23f32d`.
Projected input hash:
`11ea3cd562cd587440e598b695fd2c22725403a051a9c1c2b46549e05b42ee90`.
Persisted run:
`239ec961dd32138d4a224fb2925c0fdc47b7115298b355e1874b33aa5a388884`.
Persisted union outcome:
`25811f4efab7676acd407d6145a58685b3c843bb27b5f3d78bc8c32b1b9fa137`.

The real comparison and synthetic benchmark bind the same final code hash. Their
run/input/outcome hashes differ deliberately because one uses real frozen records
and the other explicitly synthetic identities. The comparison-only balanced
policy output hash `673624471a229cd5ffb320bf47ec555f25907992500d72b75da82ffc114b1bb6`
includes input dimensions and nominations; it is not the persisted-context union
hash above, whose payload additionally binds context/policy identities.

## Real policy comparison and output audit

`tendermatch-stage6-comparison.json` records full results, deterministic reversed-
input replay, code/source/run identities, unchanged protected state, sample strata,
context reuse and dependency simulation. No source connection or Neon write occurred.

| Policy | Review candidates | Audit only | Union | Share of 707,660 |
| --- | ---: | ---: | ---: | ---: |
| Positive only | 24,007 | 0 | 24,007 | 3.3924% |
| Supplier 50 / tender 2 | 13,217 | 9,503 | 22,720 | 3.2106% |
| **Supplier 100 / tender 3** | **18,531** | **9,503** | **28,034** | **3.9615%** |
| Supplier 250 / tender 5 | 23,404 | 9,503 | 32,907 | 4.6501% |

The balanced policy's review component is 2.6186%; the separate audit component
is 1.3429%. This is a development workload budget, not a calibrated quality rule.
All four policies preserve their exact result under deterministic replay. Balanced
selection retains all 99 suppliers/5,645 tenders with positive retrieval evidence,
and the audit union yields total coverage of all 108 suppliers/9,592 tenders with
any candidate. No membership is invented for noncandidate focuses.

Selection order is retrieval, Formula score, coverage, confidence, then UUID—each
dimension remains independent. There is no blended score. Zero-only audit order
uses a stable pair hash, not inferred fit. Nomination caps are directional before
union, **not final incident caps**: actual final ranges are 52–2,361 per supplier
and 1–49 per tender. These are measured bounds for this run, not a general promise
of equal workload. The complete policy rationale and cap/tie contract are in
`docs/tendermatch-stage6-shortlist.md`.

There are 7,382 selected positive pairs with a tied nomination dimension group.
Current selected positive rows all have nonzero Formula score/coverage and Evidence
Confidence 30–50; these observations were not turned into acceptance thresholds.
Expected potential expensive-review intake is 18,531. Actual AI/TORS-ready or
authorized count is **zero**; no downstream readiness/authority gate exists yet.
The 9,503 audit-only pairs are not promising, qualified, Non-match or AI-ready.

Fourteen deterministic sample strata inspect one-direction/both-direction review,
one-direction/both-direction audit, ties, zero Formula, zero coverage/confidence
and nonzero Formula with zero retrieval. Examples include:

- Retrieval 0.024242, Formula 7, coverage 35, confidence 30: both review nominations,
  supplier nomination rank 73/tender rank 1, with an 11-row supplier tie.
- Retrieval zero, Formula 4, coverage 45/confidence 30: audit only, never a fit claim.
- Retrieval zero with Formula/coverage/confidence all zero: audit only with Missing
  technical evidence retained; no positive fit or readiness invented.
- Retrieval zero, Formula 24, coverage 60/confidence 50: still audit only, demonstrating
  that Formula metrics do not override the distinct retrieval-blind-spot label.

## Real-data performance and reuse

| Measurement | Observed read-only result |
| --- | ---: |
| Candidate projection | 707,660 rows; 80,285 ms; 222 bounded pages |
| Full comparison + reversed replay, each policy | 9,119 / 9,777 / 12,568 / 12,474 ms |
| Whole session including context/reuse/incremental experiments | 191,387 ms; 268 queries |
| Serialized request / response bytes | 72,139 / 130,069,452 |
| Maximum single response | 3,874,135 bytes (bounded pinned-member inventory) |
| Final observed RSS / heap used | 1,692,278,784 / 1,152,112,552 bytes |
| Context extraction / unchanged reuse | 17,450 extracted initially; 17,450 reused, 0 re-extracted |
| Serialized context / pair payload | 17,619,690 / 24,951,952 bytes |
| Maximum context payload | 20,032 bytes, below the 262,144-byte DB bound |
| Committed Neon Stage 6 writes during comparison | 0 |

Payload sizes are JSON transport/storage estimates, not measured database or
billable storage. The full experiment intentionally materializes a compact scalar
projection of the frozen population and is more memory-heavy than bounded client
queries. Streaming/chunked context construction is future optimization if this
population grows; current observed peak/final memory is not concealed as constant.

Real identity-change simulations were in-memory only:

| Changed identity | Rebuilt / reused contexts | Rebound / unchanged pair identities |
| --- | ---: | ---: |
| One Goods supplier | 6,598 / 10,852 | 19,365 / 8,669 |
| One Works tender | 6 / 17,444 | 9,151 / 18,883 |

Selection counts remain unchanged for these identity-only changes. The broad pair
rebinding is conservative and honest: a pair depends on both complete focus
contexts, and rank competition can change even when that pair's own evidence does
not. Unchanged disjoint contexts reuse exactly. No selection output feeds another
context, so there is no recursive cascade. Local SQL changed-evidence fixtures
also demonstrate changed nomination content and historical-run readability.

## Synthetic SQL benchmark and estimates

Evidence class `SYNTHETIC_LOCAL_PGLITE_NOT_NEON`, 8 suppliers × 500 tenders,
4,000 upstream candidates. It creates genuine local SQL rows using the actual
migrations, then executes the production-intended guarded shortlist library.
No synthetic evidence is written to Neon.

| Measurement | Actual local result |
| --- | ---: |
| Upstream synthetic Stage 3/4/5 fixture bootstrap | 177,964.7 ms (not Stage 6 execution time) |
| Context construction | 134.24 ms |
| Context/run/member persistence | 857.12 ms; 508 contexts/members |
| Pair persistence | 484 ms; 1,450 rows (950 review + 500 audit) |
| Full readback / unchanged replay | 78 / 91 ms; identical outcomes; 0 replay inserts |
| Supplier page | 25 rows; 22,546 bytes; 6.71 ms |
| Tender page | 6 rows; 5,706 bytes; 4.05 ms |
| Supplier / tender selector plan | 0.52 / 0.26 ms; focused indexes used |
| Full paginated supplier traversal | 285 unique rows |

An omitted synthetic candidate returns its original Formula evidence with
`NOT_STORED_IN_SHORTLIST`, `onDemandEscalationEligible: true`, `aiAuthorized: false`.
Page/detail Formula and criterion sums agree. The actual planner uses both focused
B-tree indexes and pinned membership indexes; small subsets may be sorted. Plans
are local cached observations, not Neon or latency percentile claims.

Local relation totals including indexes/toast: context 1,286,144 bytes; member
360,448; pair 2,146,304; run/completion 32,768 each. Total **3,858,432 bytes**.
A simple component-wise row-count extrapolation (contexts/members ×17,450/508,
pairs ×28,034/1,450, fixed one-run/completion overhead) is approximately **98 MB**.
That is a low-confidence planning estimate, not actual Neon size: tuple/index fill,
TOAST compression, nomination density and retained historical versions differ.
Actual Neon measurements are recorded below; they are not inferred from local ms.

## Actual Neon persistence

The orchestrator confirmed all 27 statements of unchanged 090 committed in
project `dry-union-87553313`, development branch `br-polished-boat-b1qddx0m`,
database `tendermatch_results_dev`, as `neondb_owner`. The worker independently
rechecked the exact database comment, owner, five empty RLS tables and restricted
writer grants before connecting the guarded writer. No owner DDL was attempted
with writer credentials, and no prior migration was rerun.

`tendermatch-stage6-execute.json` binds the same method/policy/input/run/outcome
as the real comparison. It records these actual committed cardinalities:

| Table | Rows |
| --- | ---: |
| shortlist_context | 17,450 |
| shortlist_member | 17,450 |
| shortlist_pair | 28,034 (18,531 review + 9,503 audit) |
| shortlist_run / shortlist_completion | 1 / 1 |

All contexts and membership were created in one atomic transaction. The exact
nomination policy, caps, tie counts and audit order were recomputed in PostgreSQL
before each context was accepted. No partially constructed run was exposed as
complete. Every membership is separate from the underlying Formula/ranking pair.

| Actual writer measurement | Result |
| --- | ---: |
| Full guarded session including loading, context validation, pair persistence and checks | 640,726 ms |
| Fresh candidate projection | 82,205 ms; 222 pages |
| 28,034 pair insert phase | 23,614 ms; maximum batch 445,720 bytes |
| Full pair readback | 12,988 ms; 28,034 verified, 0 inserts |
| Unchanged pair replay | 10,147 ms; 28,034 reused, 0 inserts |
| Queries / request bytes / response bytes | 1,039 / 76,478,022 / 183,631,289 |
| Final observed RSS / heap used | 487,886,848 / 234,633,296 bytes |

The total includes expensive database validation of all focus contexts; context
preparation was not separately instrumented in the approved runtime. Do not read
the 23.6-second pair phase as the complete Stage 6 persistence cost. Final memory
is an observed endpoint, not a sampled peak. Client query latency is reported
separately from setup, detail-parity probes and full-population verification.

Writer negative probes confirmed SELECT/INSERT-only privileges, denied updates,
deletes, truncates, DDL and post-creation membership, empty cross-tenant reads and
denied cross-tenant writes. Probe transactions committed zero rows. Original
Formula/ranking completions, row counts, profiles and empty human/model stores
were identical before and after. AI/TORS-ready/authorized count remains zero.

## Independent read-only final audit

`scripts/tendermatch-validate-stage6.mjs` ran in a separate guarded
REPEATABLE READ, READ ONLY transaction. Its normalized source hash is
`f6364c8497f3f2d48f2f5c41ce4a91dfb75ff091454b67eea0bbf225a3cc1594`;
the complete result is `tendermatch-stage6-validation.json`.

Freshly loaded all 707,660 candidates in 43,074 ms. Reused 17,450 stored contexts
with zero extractions, then independently rebuilt every context from reversed
inputs with no cache: all context bodies, memberships, run and outcome matched.
Full stored-pair readback verified 28,034 rows in 9,535 ms with zero inserts.

Independent SQL recomputed supplier/tender positive rankings, ties and hashed
zero-retrieval audit order over the full population: **31,764 nominations across
17,450 contexts; zero mismatches**, in 12,151 ms. These contain 22,046 positive
and 9,718 audit nominations; directional overlap reduces them to 18,531 review
and 9,503 audit-only unique pairs. SQL reconciliation found zero missing prior
records, invalid tiers/reasons/ranks or nomination-cap violations, and exactly
28,034 distinct canonical pairs. Completion matches the pre-owner outcome hash.

All seven installed Stage 6 function bodies exactly match the reviewed 090 SQL,
and its migration marker is present. Five owner-owned tables retain RLS and
SELECT/INSERT-only writer permissions. Protected state matches the original
comparison and writer reports. The audit committed zero writes, connected to
zero source systems and called zero models. Total audit: **156,782 ms**, 493
queries, 4,064,803 request bytes and 177,334,367 response bytes. Observed final
RSS/heap: 826,605,568 / 250,306,072 bytes, not a sampled peak.

### Actual bounded queries and selected detail

| Query | Rows | Response bytes | Network-inclusive elapsed |
| --- | ---: | ---: | ---: |
| Default supplier page | 25 | 22,679 | 628 ms (writer observation 413 ms) |
| Default tender page | 25 | 22,838 | 398 ms (writer observation 407 ms) |
| Largest supplier, complete traversal | 2,361 / 24 pages | max page 88,902 | 11,046 ms |
| Largest tender, complete traversal | 49 / 1 page | 44,007 | 391 ms |

Both complete traversals were unique and ordered, bounded to at most 100 rows per
request, and kept independent Formula/retrieval/tier dimensions. The largest
supplier has 474 review + 1,887 audit memberships; the largest tender has 48 + 1.
Focused selector EXPLAIN ANALYZE measured 0.264 ms supplier / 0.308 ms tender,
using `shortlist_pair_supplier` / `shortlist_pair_tender` and pinned-membership
indexes. Supplier traversal uses ordered index access; the 49-row tender subset
may use a small in-memory sort. These are cached observations, not p95 claims,
and selector execution time excludes network and the bounded Formula-detail join.

All 14 recorded real detail strata reproduced original Formula score, coverage,
confidence, retrieval units and nomination reasons. Expanded criterion points
sum to Pair Score, maximums sum to 100. Empty noncandidate focuses return no
memberships. A real omitted candidate still exposes its original zero Pair Score,
35 coverage / 30 confidence and zero retrieval, with `NOT_STORED_IN_SHORTLIST`,
on-demand escalation eligible and AI authorization false.

### Actual database size

| Stage 6 relation | Total bytes including indexes/TOAST | Heap bytes | Index bytes |
| --- | ---: | ---: | ---: |
| shortlist_context | 31,039,488 | 25,772,032 | 4,710,400 |
| shortlist_member | 9,830,400 | 3,178,496 | 6,610,944 |
| shortlist_pair | 41,050,112 | 15,310,848 | 25,698,304 |
| shortlist_run | 32,768 | 8,192 | 16,384 |
| shortlist_completion | 32,768 | 8,192 | 16,384 |

Stage 6 relation total: **81,985,536 bytes** (~82.0 MB). Complete results database:
**2,792,775,680 bytes**. Database growth is not identical to relation size because
catalogs, free-space maps and other overhead exist; neither is a billing quote.
The measured size is below the ~98 MB synthetic extrapolation, whose uncertainty
was explicit. Historical versions will increase storage; no retention deletion
or destructive rollback was executed.

## Regression, integrity and security

Thirteen Stage 6 tests passed with no skips, including real/benchmark and final
Neon execution/audit evidence binding. The exact owner migration fails closed in
the wrong local database.
SQL independently recalculates nominations, audit hash order, tie counts and caps;
checks source membership and input signatures; seals run membership; checks every
pair's nomination union/reasons/tier; and refuses incomplete completion.

Fixtures verify immutable reuse, changed supplier and tender dependency closure,
disjoint scope preservation, historical readback, rejection of stale reused
contexts, corrupt caches, fabricated nominees/ranks, wrong audit tier and partial
completion. Writer update/delete/truncate/DDL and post-creation membership fail;
cross-tenant reads are empty and writes denied. This remains a trusted-service
GUC boundary, not arbitrary-user authentication. No human/AI state is populated.

Final full `npm test`: **570/570 passed**, zero failures/cancellations/skips;
test-runner duration **43,795.2253 ms**. All three application builds and generation of 64
versioned Agent Specifications passed. Stage 4/5 evidence checks, Stage 6 recorded
comparison and persistence/audit evidence plus actual local SQL fixtures all ran
with their opt-in flags enabled. All 17 additions were staged before the
tracked-path naming/security guards ran. The prior owner-gate suite passed 569/569;
the added test binds the final committed Neon execution and independent audit.
The existing chunk-size, CSS-name collision and route-classification warnings are
unchanged baseline build warnings; no generated build output is committed/deployed.

Full lint and strict TypeScript for `shortlist-stage6.ts` passed. Strict module
checking is not a claim of repairing unrelated full-application TypeScript
baselines. Staged whitespace validation and a 17-file secret-pattern scan passed,
with zero credential URLs, API/database tokens or private-key material.
Logs are local ignored outputs under `outputs/stage6/`.

The pre-owner fetch/prune kept `origin/main` at `d230590`; the selected base was
ahead 11 / behind 0. Relevant retrieval-ranking/business/enterprise/release
worktrees were rechecked clean and unchanged. The owner-gate checkpoint contained
14 additive Stage 6 files; persistence and audit add two evidence artifacts and
one independent validator. Final fetch/prune again confirmed `origin/main` at
`d230590`, with the selected base ahead 11 / behind 0 before the local Stage 6
commit. The same four relevant parallel worktrees remained clean and unchanged.
No prior-stage implementation or evidence is edited. The local commit containing
this report is the Stage 6 checkpoint; its exact hash is supplied in the handoff.

## Changed files and remaining limitations

All changes are 17 additions; no existing file from the approved Stage 5 commit
is modified:

- SQL: `db/tendermatch-dev/090-shortlist-up.sql`, `090-shortlist-down.sql`.
- Method/runtime: `packages/tendermatch/src/shortlist-stage6.ts`,
  `scripts/lib/tendermatch-stage6.mjs`, `scripts/tendermatch-stage6.mjs`.
- Audit/benchmark: `scripts/tendermatch-validate-stage6.mjs`,
  `scripts/benchmark-tendermatch-stage6.mjs`.
- Tests: `tests/tendermatch-stage6-shortlist.test.mjs`,
  `tests/fixtures/tendermatch-stage6.mjs`.
- Contracts/runbook/checkpoint: `docs/tendermatch-stage6-shortlist.md`,
  `docs/tendermatch-stage6-owner-runbook.md`, `docs/tendermatch-stage6-active-task.md`.
- Evidence: this report and `docs/evidence/tendermatch-stage6-comparison.json`,
  `tendermatch-stage6-benchmark.json`, `tendermatch-stage6-execute.json`,
  `tendermatch-stage6-validation.json`.

The workload policy is not quality-calibrated; zero-retrieval blind spots remain
explicit audit-only items. Directional caps do not promise hard final incident
caps, and the measured union is uneven across suppliers. Rank dependencies can
cause broad conservative rebinding in the dense candidate graph. Full comparison
materializes the compact population; its ~1.69 GB observed RSS and expensive
database context validation may need future optimization at greater scale.
Historical runs are retained without automatic cleanup. RLS assumes a trusted
service; no end-user authentication, frontend, API deployment or AI/TORS readiness
gate is added. On-demand escalation remains possible but separately authorized.

## Failure and correction ledger

| What happened | Root cause | Correction | Reusable rule | Evidence |
| --- | --- | --- | --- | --- |
| Pair-local invalidation was insufficient for top-N nomination membership. | Rank competition depends on a full focus candidate set. | Hash independent focus contexts and rebind their membership closure. | Do not hide rank dependencies behind pair-only cache keys. | Real identity-change metrics and changed-evidence SQL tests. |
| A PL/pgSQL draft rejected the audit-tier condition. | Nested CASE needed explicit grouping inside IF. | Parenthesize the CASE expression and rerun actual PostgreSQL DDL. | Parse/test complete trigger bodies, not only statement names. | Exact 090 fixture installation and tier-denial tests. |
| A direction-switching join could obscure focused index predicates. | CASE selected between two indexed profile columns. | Explicit supplier/tender UNION branches with indexable equality. | Keep static focus columns explicit in reusable query plans. | Actual SQL tests and focused index benchmark. |
| Generic rank field names could be confused with Stage 5 retrieval ranks. | Selection has its own lexicographic tie policy and audit ordering. | Name fields supplier/tender NominationRank and document their domain. | Preserve signal and rank identities across layers. | Page/detail parity and evidence samples. |
| Synthetic upstream bootstrap dominated elapsed time. | Recreating Stage 3/4/5 was included before Stage 6 timing. | Report bootstrap separately from sub-second Stage 6 local operations. | Separate setup cost from the method being measured. | Benchmark phase timings. |

## Owner action and final scope

Exact action: `db/tendermatch-dev/090-shortlist-up.sql`; runbook:
`docs/tendermatch-stage6-owner-runbook.md`. SQL canonical-LF SHA-256:
`367a7131db5175d861d7410342bcf3878d5fb84dd7fbb7160181e71e39e2649c`.
Target: project `dry-union-87553313`, development branch
`br-polished-boat-b1qddx0m`, database `tendermatch_results_dev`, owner `neondb_owner`.
The original owner-gate inspection returned `shortlist_run: null`; after the
orchestrator's confirmed COMMIT, the worker verified the five empty owner-owned
tables and then persisted the exact counts above. The original empty-state
comparison report is retained unchanged as historical evidence. The worker did
not attempt owner DDL.

After full independent readback and cache/security/query/size verification and
the final regression suite, create the local Stage 6 commit and stop for
orchestrator review. No source connection/write, model/vector/AI/TORS call, frontend
or static-export integration, push, merge, reset, deploy or publication.

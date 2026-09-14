# Stage 3 completion evidence — eligibility and scope only

Date: 2026-09-06. Status: **development checkpoint; awaiting Stage 3 review**.
Base: `5a7f0a9124ada9053f5b1b466d79148cae6ccc16`; branch
`codex/tendermatch-neon-all-to-all`; worktree
`C:/CodexWork/tendermatch-neon-all-to-all`. The enclosing commit identifies
the completed checkpoint. Canonical owner remains TL-A031.

This report reconciles the already completed experiment, database execution,
independent full readback and unchanged rerun. The completion correction did
not repeat database execution or initiate a later product stage.

## Outcome

Every pinned **117 suppliers × 17,333 OPEN, nondeleted tenders = 2,027,961**
unique intersections has one stored scope/eligibility outcome. No scores,
retrieval results, embeddings, assessments, narratives or decisions were made.

| Exclusive outcome | Pairs |
| --- | ---: |
| Candidate eligible with limitations | 707,660 |
| No evidenced common scope | 414,604 |
| Outside Formula v1.1 scope | 905,697 |
| Needs evidence (exclusive pair state) | 0 |
| Hard excluded | 0 |
| **Total** | **2,027,961** |

**140,600** service-oriented potentially relevant pairs remain explicitly
outside Formula v1.1; this is not an assessment of consulting qualifications.
All **2,027,961 hard gates remain NOT_ASSESSED**. All **117 supplier readiness
records remain NEEDS_EVIDENCE**. Zero exclusive pair-state NEEDS_EVIDENCE is
therefore not evidence of full readiness: the supplied scoped candidates
retain unresolved verification, compliance, requirements and timezone flags.

The candidate total consists of 612,914 provisional-scope and 94,746
source-scope-with-limitations outcomes. Neither is an approved match, tender
qualification, clearance, or Bid/No-Bid decision.

## Input and output identities

Full machine evidence: [execution/readback/rerun](tendermatch-stage3-execute.json),
[isolated experiment](tendermatch-stage3-isolated-experiment.json), and
[checkpoint validation](tendermatch-stage3-validation.json).
Policy and runtime contract: [Stage 3 runbook](../tendermatch-stage3-eligibility.md).

| Identity | Value |
| --- | --- |
| Schema | `tendermatch-eligibility-scope/1.0.0` |
| Policy | `tendermatch-development-goods-works-scope/1.0.0` |
| Stage 3 code | `1c12380aa59c6c1a44e05b146a64e06072bdc9487bafb95865ec76228c84c921` |
| Policy hash | `e0e8d4887aecee90476a70a03e22751a9a5eb5fc63343c209a6817ab4a8b2ab4` |
| Input hash | `5f9131a54e15ffb549f43926a1a25f086b3da4195e200f878085c781f13ad524` |
| Run | `7b3fbc39a401a72a6452c1d9bb050c18bc92d32a0f69acb4829f0a42236e102d` |
| Full ordered result hash, all four passes | `9afc0bf6971a5c0ece68ea1aea01a7f14731cee03ec77e8179e0a6d618d8434a` |
| Stage 2 manifest | `e928df5e6a432fa23c8ea95dbfbf1aee4f1c883646d5ed72fd2856d994102ac2` |
| Normalization | `782f8b38737b21f6940b5c3f4fe4ec6eb890be4e2d168f19ba29b4952530e5f9` |
| Normalization outcome | `3503f4b0c4f42661f469b23bdc01945aa6619860f1d2ebb946f20a25d9de8caf` |
| Stage 2A readiness run | `ce4d742d71cccc329a3129bb549273c41f4efe3fafcdd3b862dbe4ef6058d844` |
| Readiness outcome | `ecb47df168f0df87a802d40a2bef623c1695a4c12ffdb6d3e7fe21f8f6aa5396` |

The run binds Stage 2A schema, policy and code hash separately. Code/migration
identity uses the repository's canonical-JSON SHA-256 helper over LF-normalized
source strings; it is not an unqualified raw-file SHA. The validation artifact
separately records raw-byte SHA-256 of the two immutable run reports.

Fresh source captures were repeatable-read, READ ONLY. Complete IDs, versions
and content hashes equal the pin: zero added, removed or changed supplier or
tender records. Supplier evidence remains 1,553 claims: 820 INFERRED,
126 STATED_UNVERIFIED, 607 UNKNOWN, **0 VERIFIED**. Full source hashes and
database transaction observations are in `sourceDrift` of the execution JSON.

### Population and scope accounting

| Tender source category | Tenders | Pairs |
| --- | ---: | ---: |
| Goods | 6,597 | 771,849 |
| Works | 2,995 | 350,415 |
| Services | 6,568 | 768,456 |
| Consulting | 832 | 97,344 |
| Other | 332 | 38,844 |
| EOI | 8 | 936 |
| Prequalification | 1 | 117 |
| **Total** | **17,333** | **2,027,961** |

| Supplier classification dimension | Suppliers | Pairs |
| --- | ---: | ---: |
| Source Goods | 14 | 242,662 |
| Source Works | 3 | 51,999 |
| Source Missing | 100 | 1,733,300 |
| Candidate Goods | 93 | 1,611,969 |
| Candidate Works | 3 | 51,999 |
| Candidate Services | 9 | 155,997 |
| Candidate Mixed | 12 | 207,996 |

Source and candidate classifications are separate accounting axes, each
summing to 117 suppliers / 2,027,961 pairs; they must not be added together.
The 43 source × candidate × tender-category × state combinations remain in
the machine report, and their total is regression-tested.

Nonexclusive reasons: unsupported category 905,697; no evidenced common scope
414,604; provisional scope 612,914; source scope with limitations 94,746;
mixed-scope review 207,996; independent verification, compliance not assessed,
tender requirements missing, and deadline timezone unresolved **2,027,961 each**.
Remaining reason codes have zero real occurrences, with negative branches
covered by deterministic synthetic tests.

## Persistence and measured execution

Applied once: `db/tendermatch-dev/060-eligibility-up.sql`, migration version
`20260906-eligibility-v1`. The rollback file is prepared, **not executed**.
Only the existing development result database received additive migration
and eligibility writes:

- Project `dry-union-87553313`, branch `br-polished-boat-b1qddx0m`.
- Endpoint `ep-dark-dew-b15ctyr1.c-5.eu-central-1.aws.neon.tech`.
- Database `tendermatch_results_dev`, schema `tendermatch_retrieval`.
- Existing login `tendermatch_result_writer_dev`, inherited grant role
  `tendermatch_result_writer`; no new credential or role.

| Additive table | Rows | Total bytes, including indexes/TOAST |
| --- | ---: | ---: |
| eligibility_input | 17,450 | 22,601,728 |
| eligibility_run | 1 | 32,768 |
| eligibility_member | 17,450 | 9,814,016 |
| eligibility_pair | 2,027,961 | 809,852,928 |
| eligibility_completion | 1 | 32,768 |
| **Total** | | **842,334,208 (803.3125 MiB)** |

The unique composite cache key and complete pinned membership reconcile all
intersections. The completion record was inserted only after full verified
readback; no second full run matrix is stored.

| Pass | Pairs read/reconciled | Newly evaluated | Newly inserted | Time |
| --- | ---: | ---: | ---: | ---: |
| Isolated discarded-write experiment | 2,027,961 | 2,027,961 | 0 | 5.280 s |
| Actual initial persistence | 2,027,961 | 2,027,961 | 2,027,961 | 246.537 s |
| Independent complete readback | 2,027,961 | See note | 0 | 278.577 s |
| Unchanged cache rerun | 2,027,961 | 0 | 0 | 296.781 s |

Readback **recalculates every pair** and compares all compact outcomes. Its
`evaluated: 0` metric means zero *cache misses*, not zero verification
calculations. All four ordered hashes and all count axes agree. The cached
rerun is slower than initial persistence in this observation; no warm-cache
latency improvement is claimed. It proves no new computation/write was needed.

Each pass uses 585 batches, at most 4,096 pairs per batch. Compact entity inputs
total 12,448,434 serialized bytes, loaded through 36 normalized-feature pages.
The largest serialized insert batch is 339,969 bytes. Batch-sampled heap peaked
at 202,512,736 bytes (193.13 MiB) during readback; this is not continuously
sampled process peak/RSS. Final process RSS was 389,558,272 bytes.

The measured result-connection session, including preflight and checks, took
945.331 seconds: 2,702 queries, 1,048,815,668 serialized parameter bytes,
731,908,894 serialized returned-row bytes, and maximum response 2,304,553 bytes.
These counters exclude SQL text, protocol/TLS overhead and source connections;
they are not billed-network measurements. Separate source connections made
19 supplier and 44 tender queries, returning 1,621,578 and 9,092,674 serialized
bytes respectively. Sources were not queried per pair. The report's
`startedAt` is assigned after input preflight; `metrics.elapsedMs` includes it.

## Cache, failure and security evidence

- Real rerun: 2,027,961 cache hits, zero misses/inserts, same outcome hash.
- Changed supplier/evidence: exactly its 17,333 keys invalidate; changed tender:
  exactly its 117 keys. Synthetic persisted SQL tests also prove 3-of-6 and
  2-of-6 affected-pair recomputation, with old runs intact. Real source records
  were not altered to manufacture an incremental experiment.
- Code/policy changes invalidate all pair keys. Manifest timestamps alone do
  not invalidate unchanged pair inputs. Duplicate/tampered identities fail.
- Real retries: **0**. Injected serialization/deadlock tests prove a maximum
  three attempts; deterministic, authorization and ambiguous connection errors
  are not retried. This is not real network-failover evidence.
- Actual writer tests: UPDATE/DELETE/TRUNCATE/DDL denied; other-tenant reads
  return zero; other-tenant writes and sealed membership inserts denied;
  zero probe rows committed. Existing role supplies SELECT/INSERT only on the
  five new tables. Tenant GUC is trusted-service isolation, **not user auth**.
- All 15 protected business/model tables were zero before and after, including
  evaluation/scoring, embeddings, retrieval, assessment, human disposition,
  old universe and criterion audit. No business result outside eligibility
  was introduced. Prior normalized bodies and associations were fully hashed.

## Final local validation

After the last test-only correction, without another database run:

- Focused development/eligibility/readiness/normalization/manifest/census
  suite: **159 passed, 0 failed, 0 skipped**.
- Full `npm test`: **527 passed, 0 failed, 0 skipped**; all three production
  builds and generation of exactly 64 Agent specifications passed.
- `npm run lint`: passed. Strict standalone TypeScript check of
  `eligibility-scope.ts` and its imports: passed.
- PGlite enabled for actual disposable SQL/security/incremental tests. No
  live source mutation is hidden behind synthetic fixtures.
- Three added evidence assertions bind the stored run to current code and
  migration identity, the independent experiment, exact accounting, source
  drift, cache replay and the protected-state/denial observations.
- Original standalone checks previously passed **3/3** in this Stage 3 run;
  final read-only Git check confirms the source remains clean at
  `04b0b2a723223d11617837ee0e7562fa48168cd9`.
- All previously tracked content is unchanged from the approved base, including
  Formula v1.1, Stage 0/1/2/2A artifacts, frontend, datasets and canonical registry.
  Only additive Stage 3 paths enter the checkpoint.
- Existing chunk-size/CSS filename/route-classification build warnings remain.
  The unrelated 24-error full-app TypeScript baseline is not modified or
  claimed resolved; this stage validates its strict changed surface.
- No UI changes, so no new product-browser QA or deployment replay is claimed.

## Failure/correction ledger

| What happened | Failure layer / root cause | Correction | Reusable rule | Regression evidence |
| --- | --- | --- | --- | --- |
| Prior scoring-oriented state could label a scope difference ineligible. | Semantic contract: scope, exclusion and readiness shared a status. | Separate candidate, scope-not-demonstrated, outside-scope and hard-gate dimensions. | Missing scope is not known incapability or clearance. | Scope/missing/hard/mixed tests and all 2,027,961 audited outcomes. |
| Existing universe storage required a scoring run. | Persistence contract: pre-scoring evidence was tied to evaluation lifecycle. | Five additive isolated eligibility tables; old contract untouched. | Never fabricate a scoring event to store a prerequisite. | Protected-table counts, migration boundaries, completion and SQL tests. |
| Zero exclusive NEEDS_EVIDENCE pairs could be read as fully verified. | Interpretation: pair scope and supplier readiness are different dimensions. | Retain all 117 readiness limitations and all unassessed hard gates. | Always report candidate state beside unresolved evidence. | Real count/reason assertions and this report. |

No execution/readback discrepancy was observed. There is no need to repeat the
heavy run merely to finish documentation. The interrupted completion was
recovered from the exact code/run hashes and persisted completion evidence.

## Limitations and stop

This is an auditable development scope experiment, not an operational matching
service. Scope candidates inherit Stage 2A's provisional lexical interpretation;
no independent claims are VERIFIED. Detailed tender requirements, compliance
screening and source timezones remain unresolved. The 1,989 OPEN tenders whose
database-timezone deadline diagnostic is past remain in the approved universe;
no deadline eligibility is inferred from an unknown source timezone.

No Formula adapter was activated and no Formula/coverage/retrieval score,
embedding, shortlist, AI/TORS artifact or human decision was produced.
No frontend/source data, original TenderBoost, canonical registry, credentials,
billing, release or production system changed. No push/merge/deploy/publish.

**Stop here for Stage 3 review. Stage 4 and scoring require the next explicit
instruction.**

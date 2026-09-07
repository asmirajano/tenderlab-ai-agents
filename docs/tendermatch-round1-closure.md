# TenderMatch all-to-all Round 1 closure

## Outcome

Round 1 is complete within its sealed development scope. It evaluated 117 suppliers
against 17,333 OPEN tenders (2,027,961 pairs), retained Formula v1.1 as Goods/Works
only, scored and ranked 707,660 eligible pairs, produced a 28,034-pair shortlist,
and persisted a bounded Stage 7 review plan in the isolated Neon results database.
Stages 8–10 remain validated local application/runtime capabilities, not a hosted
deployment. No AI/TORS execution was authorized or performed.

## Chronology

| Stage | Plain-language result | Retained output |
| --- | --- | --- |
| 0 | Isolated the development results environment and access boundaries. | Neon `tendermatch_results_dev` contract and migrations |
| 1 | Captured the initial supplier and OPEN-tender source universe. | Versioned source evidence |
| 2 | Normalized reusable supplier/tender profiles and refreshed the sealed manifest. | 117 suppliers and 17,333 OPEN tenders |
| 2a | Mapped the 100 newer suppliers to the minimum readiness baseline without inventing evidence. | Versioned readiness evidence |
| 3 | Evaluated eligibility for every pair. | 2,027,961 pair states; 707,660 candidates |
| 4 | Applied deterministic Formula v1.1 to every candidate. | 707,660 scores; 1,320,301 explicit unscored states |
| 5 | Ranked Formula candidates independently of Formula score. | 707,660 rankings; 24,007 positive relevance |
| 6 | Built bounded supplier- and tender-direction shortlists. | 28,034 pairs: 18,531 review + 9,503 audit |
| 7 | Persisted selective review intent without executing AI. | 1 plan, 28,034 decisions, 500 requests; 0 jobs/artifacts |
| 8 | Validated the authenticated bounded server/API contract. | Local PostgreSQL/HTTP evidence; fail-closed behavior |
| 9 | Validated ranked/paginated frontend behavior without a full-matrix download. | 23 browser checks and 10 screenshots |
| 10 | Validated incremental recalculation, reuse, resumability and atomic local publication. | Local SQLite coordinator evidence and final ledger |

## Sealed numbers

- Universe: 117 × 17,333 = 2,027,961 pairs.
- Formula-scored: 707,660.
- Scope not demonstrated: 414,604.
- Outside Formula v1.1 scope: 905,697.
- Retrieval-positive: 24,007; deterministic fallback was used because approved
  embedding rows/models were absent.
- Shortlist: 28,034 = 18,531 review + 9,503 audit.
- Stage 7: 500 planned, 18,031 deferred by budget, 9,503 audit-explicit-only.
- Actual AI/TORS: 0 calls, 0 input tokens, 0 output tokens, cost 0.

## Process improvements for Round 2

1. Freeze both sides of the scope before the full run: supplier classes and tender
   procurement types must be governed by the same versioned policy.
2. Treat Services and Consulting as new scoring models, not as an extension hidden
   inside the Goods/Works Formula v1.1 run.
3. Complete the minimum readiness contract before eligibility generation; keep
   unsupported facts `UNKNOWN` instead of re-researching or fabricating them.
4. Install owner-only result migrations before downstream API/frontend checkpoints,
   so later stages can validate the actual isolated target rather than only fixtures.
5. Capture the current OPEN tender manifest once at round start, seal it, and report
   later database growth as a new-round delta rather than silently changing history.
6. Populate and version approved embeddings before calling retrieval semantic;
   otherwise keep the deterministic lexical/structured fallback label.
7. Keep explicit completion markers and machine-readable counts/hashes for every
   stage so a restart can resume from the last verified checkpoint without repeating
   source capture or expensive pair computation.

## Deliberately deferred

Round 2 owns the refreshed OPEN tender population, Services/Consulting eligibility
and scoring, approved embeddings, and the resulting new versioned all-to-all run.
Production hosting, deployment and any paid AI/TORS execution remain separate
authorization gates and are not implied by Round 1 completion.

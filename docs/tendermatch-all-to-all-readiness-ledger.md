# All-to-all implementation and readiness ledger

Status: **Round 1 complete in the isolated Neon results environment, with the server/frontend/incremental layers validated locally and intentionally not deployed.** The machine-readable companion `docs/evidence/tendermatch-all-to-all-ledger.json` binds 18 retained evidence files by canonical-LF SHA-256. It does not recapture the sealed source universe or claim a current production deployment.

## Sealed development population

| Independent layer | Retained verified population |
| --- | ---: |
| Listed suppliers × OPEN tenders | 117 × 17,333 = 2,027,961 pairs |
| Formula-eligible and Formula-scored | 707,660 |
| Scope not demonstrated; null/unscored | 414,604 |
| Outside Formula v1.1 scope; null/unscored | 905,697 |
| Total not Formula-scored | 1,320,301 |
| Separately ranked candidates | 707,660 |
| Positive retrieval relevance | 24,007 |
| Shortlist | 28,034 = 18,531 review + 9,503 audit |
| Stage 7 persisted review-request intents | 500 |
| Actual AI/TORS calls, input/output tokens and cost | 0 / 0 / 0 / 0 |

The initial Stage 1 capture contained 17,323 OPEN tenders. Stage 2 refreshed the frozen source manifest to 17,333 before the sealed later stages. This is preserved capture history, not a count discrepancy concealed by rewriting evidence. Operational Stage 10 discovers current manifests dynamically; it does not hard-code either population.

## Architecture and evidence boundary

Safe source snapshots → reusable normalization/readiness → full eligibility universe → candidate-only Formula → independent lexical/structured ranking → two-tier shortlist → selective escalation planning → authenticated bounded API → explicit development UI.

Stage 10 wraps these unchanged algorithms with a local versioned delta planner, immutable cache, endpoint-only pair updates, directional shortlist dependency closure, resumable bounded transactions and an atomic latest-sealed pointer. Local identities are not silently substituted for the installed Neon identities. No local-to-Neon publication adapter or hosted runtime has been deployed.

| Stage | Evidence state | Execution / independent readback | Relevant table storage, including indexes |
| --- | --- | ---: | ---: |
| 3 eligibility | Sealed Neon evidence retained | 246.537 s / 278.577 s | 842,334,208 bytes |
| 4 Formula | Sealed Neon evidence retained | 621.543 s / 342.001 s | 657,555,456 bytes |
| 5 retrieval ranking | Sealed Neon evidence retained | 430.033 s / 204.802 s | 1,037,279,232 bytes |
| 6 shortlist | Sealed Neon evidence retained | 23.614 s / 12.988 s | 81,985,536 bytes |
| 7 selective TORS orchestration | Isolated Neon execution, replay and independent validation | 500 planned; 18,031 deferred; 9,503 audit-explicit-only | 46,170,112 bytes across seven relations |
| 8 server/API boundary | Local PostgreSQL/HTTP tested | 1,440-candidate synthetic benchmark; supplier/tender p95 109.36/84.70 ms | Local fixture only |
| 9 frontend | Actual local Edge/HTTP/PostgreSQL browser evidence | 23 checks; 10 screenshots; max response 43,348 bytes | No deployment; no full-matrix fetch |
| 10 incremental coordinator | Local SQLite, real unchanged algorithms on synthetic input | See bound benchmark for full/reuse/delta/query measurements | Local temporary data only |

Stage 3–6 storage totals 2,619,154,432 bytes across their reported tables. Stage 7 adds 46,170,112 bytes across its seven relations, including indexes and TOAST. These sums are not the current total database size, not a projection for repeated runs, and not Stage 10 SQLite usage. Full source normalization/readiness and unrelated tables are excluded. Exact run IDs, hashes, table bytes and evidence paths are in the JSON ledger.

pgvector 0.8.6 and an HNSW structure were available/installed in the retained Stage 5 inspection, but there were zero approved embedding rows/models. Ranking correctly used the deterministic lexical/structured fallback. It is not an embedding result, Formula score or automatic decision.

## Explicitly preserved boundaries

Formula v1.1 retains denominator 100 and exact numeric zeros. Missing evidence remains Missing, including zero point contribution, and is never invented to satisfy financial or comparable-contract criteria. Unscored/null scope states stay distinct from scored zero. Coverage, assessed-only fit and evidence confidence are not retrieval relevance, TORS or Human Disposition. Shortlist and escalation state are separate selections, not Match/Non-match labels. Audit-only is not a promising/AI-ready designation.

The 500 persisted Stage 7 requests use 99 supplier and 377 tender profiles and contain 5,033,461 measured input bytes. They reserve at most 1,500 attempts under the three-attempt bound and 2,048,000 output tokens. These are potential workload limits, not actual calls/tokens/cost. No execution authorization or provider exists, so actual calls, tokens and cost remain zero. Input-token and price estimates remain unavailable without a provider/tokenizer/pricing configuration.

The Overview and Formula page source/DOM guards from Stage 9 remain intact. The verified release lineage is `d230590cf5ee99a679f162b2e3a19b65752c0f16`, with `index-B47XFTdH.js` and `index-CugebHFU.css`; exact hashes are retained in the ledger. Stage 10 changes neither frontend nor that release. Development API failure remains explicitly unavailable and never falls back to the limited static snapshot.

## Round 1 completion and remaining operational gates

Stage 7 migration 100 is installed in the approved development branch. One immutable plan, 28,034 decisions and 500 requests were persisted. A clean replay reused all 500 requests; independent allocation and SQL hashes matched. Writer escalation authorization and audit-event creation are denied; authorization/job/artifact/event rows remain zero.

1. Approve an execution-time read-only source manifest publisher with immutable objects and atomic publication. Stage 10 consumes snapshots; it does not operate source connectors.
2. Review a publication adapter between local incremental identities and installed versioned Neon contracts, including atomic latest-sealed pin publication. Do not expose the operator-only SQLite surface as the server API.
3. Select and authorize a hosted authenticated server runtime with session/CSRF secret handling, tenant roles, bounded signed cursors, monitoring, backups and release/rollback controls. No browser-to-Neon connection is permitted.
4. Complete local lineage compaction beyond the explicit 32-version stop and measure cloud-scale operational capacity. Synthetic 12,000-pair timings and 2,027,961-pair metadata planning are not measured full-universe cloud recomputation.
5. Separately authorize any provider configuration, execution budget or actual TORS call. A user review/report/audit intent remains distinct from authorization, queueing and a validated artifact.

## Round 2 backlog

Round 1 remains sealed at 117 suppliers and 17,333 OPEN tenders. Round 2 should refresh the OPEN universe, introduce explicit Services and Consulting eligibility/scoring policies, re-run readiness through selective escalation under new versioned identities, and use semantic retrieval only after approved embeddings are populated. These are deliberate next-round changes, not corrections silently applied to Round 1 evidence.

No push, merge, deploy, publish, source write, model call or execution authorization occurred in Round 1. The only new Neon writes after the Stage 10 checkpoint were the separately approved Stage 7 schema and guarded plan/decision/request persistence in the isolated development results database.

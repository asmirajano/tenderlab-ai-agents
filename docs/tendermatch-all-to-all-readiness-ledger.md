# All-to-all implementation and readiness ledger

Status: locally implemented and validated; **not cloud-complete**. The machine-readable companion `docs/evidence/tendermatch-all-to-all-ledger.json` binds 12 retained evidence files by canonical-LF SHA-256. Stage 10 does not reconnect to sources or Neon and does not assert a fresh source capture.

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
| Stage 7 planned intents, not persisted/executed | 500 |
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
| 7 selective TORS orchestration | Owner-ready local code and real-data dry-run | 500 planned; 18,031 deferred; 9,503 audit-explicit-only | No new persisted Stage 7 population claimed |
| 8 server/API boundary | Local PostgreSQL/HTTP tested | 1,440-candidate synthetic benchmark; supplier/tender p95 109.36/84.70 ms | Local fixture only |
| 9 frontend | Actual local Edge/HTTP/PostgreSQL browser evidence | 23 checks; 10 screenshots; max response 43,348 bytes | No deployment; no full-matrix fetch |
| 10 incremental coordinator | Local SQLite, real unchanged algorithms on synthetic input | See bound benchmark for full/reuse/delta/query measurements | Local temporary data only |

Stage 3–6 storage totals 2,619,154,432 bytes across their reported tables. This sum is not the current total database size, not a storage projection for repeated runs, and not Stage 10 SQLite usage. Full source normalization/readiness and unrelated tables are excluded. The exact run IDs, outcome hashes, individual table bytes and source report paths are in the JSON ledger.

pgvector 0.8.6 and an HNSW structure were available/installed in the retained Stage 5 inspection, but there were zero approved embedding rows/models. Ranking correctly used the deterministic lexical/structured fallback. It is not an embedding result, Formula score or automatic decision.

## Explicitly preserved boundaries

Formula v1.1 retains denominator 100 and exact numeric zeros. Missing evidence remains Missing, including zero point contribution, and is never invented to satisfy financial or comparable-contract criteria. Unscored/null scope states stay distinct from scored zero. Coverage, assessed-only fit and evidence confidence are not retrieval relevance, TORS or Human Disposition. Shortlist and escalation state are separate selections, not Match/Non-match labels. Audit-only is not a promising/AI-ready designation.

The 500 Stage 7 planned requests would use 99 supplier and 377 tender profiles, 5,033,461 measured input bytes, up to 1,500 attempts at the three-attempt bound, and an output-token reservation of 2,048,000. These are potential workload bounds, not actual calls/tokens/cost. Input-token and price estimates remain unavailable without a provider/tokenizer/pricing configuration.

The Overview and Formula page source/DOM guards from Stage 9 remain intact. The verified release lineage is `d230590cf5ee99a679f162b2e3a19b65752c0f16`, with `index-B47XFTdH.js` and `index-CugebHFU.css`; exact hashes are retained in the ledger. Stage 10 changes neither frontend nor that release. Development API failure remains explicitly unavailable and never falls back to the limited static snapshot.

## Gates before operational cloud use

1. Separately confirm and install Stage 7 migration 100 in the approved isolated results target; validate the marker and least-privilege boundaries.
2. Execute guarded Stage 7 persistence and independently read back the exact planned population, hashes, reuse and security. Installation/persistence remain pending until this actually occurs.
3. Approve an execution-time read-only source manifest publisher with immutable objects and atomic publication. Stage 10 consumes snapshots; it does not operate source connectors.
4. Review a publication adapter between local incremental identities and installed versioned Neon contracts, including atomic latest-sealed pin publication. Do not expose the operator-only SQLite surface as the server API.
5. Select and authorize a hosted authenticated server runtime with session/CSRF secret handling, tenant roles, bounded signed cursors, monitoring, backups and release/rollback controls. No browser-to-Neon connection is permitted.
6. Complete local lineage compaction beyond the explicit 32-version stop and measure cloud-scale operational capacity. Synthetic 12,000-pair timings and 2,027,961-pair metadata planning are not measured full-universe cloud recomputation.
7. Separately authorize any provider configuration, execution budget or actual TORS call. A user review/report/audit intent remains distinct from authorization, queueing and a validated artifact.

No push, merge, deploy, publish, source write, new Neon write, model call or new execution authorization occurs in Stage 10. Stop at the local commit for orchestrator review.

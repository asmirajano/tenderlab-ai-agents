# Stage 10 evidence report

Outcome: an operational local incremental coordinator, not a cloud deployment. Base `ddf2ab2f854b84d1c75fc2cb5a1f39a6871fbf0a`; final identity is the local commit containing this report. All changes are additive Stage 10 files. No existing algorithm, UI, schema migration or prior evidence file changed.

## Authority and preserved work

Initial and final read-only preflight fetched/pruned configured remotes. `origin/main` remained `d230590cf5ee99a679f162b2e3a19b65752c0f16`; the selected base was ahead 15 / behind 0 with no configured upstream. The all-to-all worktree was initially clean. Retrieval-ranking, business-tables, enterprise-tables and the d230590 release worktrees remained clean at their inspected heads. The older divergent reconciled-release worktree remained clean and untouched. No branch switch, reset, merge, push or deployment occurred.

The retained deployed identity is the Stage 9 verified d230590 release with JS `index-B47XFTdH.js` and CSS `index-CugebHFU.css`; exact hashes remain in the final ledger. Stage 10 did not re-deploy or claim to refresh that live release. Its local TenderApps build retains the Stage 9 development-mode assets and source/DOM guards. All `apps/` and `packages/` files are unchanged from the approved base.

## Implementation and storage

The execution-time snapshot consumer discovers the complete supplier/tender manifests behind a bounded content-hashed `CURRENT.json`, filters listed suppliers and OPEN/nondeleted tenders, and hashes the active input identity. It never imports historical counts or browser pins as the current universe. A deterministic reviewable plan precedes writes and rejects tampered/stale affected-set decisions.

The durable phase machine is entities → affected pairs → directional contexts → shortlist → deterministic escalation planning → independent full readback → atomic latest-sealed publication. Batches are transactional, leased, resumable and idempotent. The local SQLite schema has 11 tables; only changed pair rows are appended. Immutable caches, parent history, tenant/file identity, parameterized queries, response limits and sealed-only access are enforced. A source-contract change is an explicit input invalidation, including when the raw record bytes are unchanged.

Existing normalization, readiness, eligibility, Formula, retrieval, shortlist nomination and escalation planning functions are reused without modification. Missing/zero/outside-scope semantics remain unchanged. No new ranking/Formula algorithm or blended score was introduced. Directional shortlist context changes have an explicit dependency closure; assessment reuse identities remain separate from global nomination position.

There is no new Neon migration, owner action, cloud writer, source connector, model adapter, job or request creation. The local cache/run namespace is not misrepresented as an installed Neon run. The Stage 8 production-facing service continues to fail closed if its Stage 7 dependencies are unavailable. Stage 10's operator-only local surface is not an Internet-authenticated API or a replacement for Stage 8.

## Measured synthetic execution

Evidence: `tendermatch-stage10-benchmark.json`, bound to the exact production/fixture/test/benchmark files and runtime. Node 24.19.0 / SQLite 3.53.3, Windows x64. All inputs are safe synthetic structured source records passed through the real existing algorithms. These are not live Neon/source measurements.

| Scenario | Active universe | Pair visits | New Formula/ranking results | Source record reads | Execution including sealing |
| --- | ---: | ---: | ---: | ---: | ---: |
| Full, 30 suppliers × 400 tenders | 12,000 | 12,000 | 7,200 / 7,200 | 430 | 74.813 s |
| Exact reuse | 12,000 | 0 | 0 / 0 | 0 | 53.118 ms |
| New supplier | 12,400 | 400 | 240 / 240 | 1 | 53.903 s |
| New OPEN tender | 12,431 | 31 | 31 / 31 | 1 | 51.828 s |
| One supplier's evidence changes | 12,431 | 401 | 241 / 241 | 1 | 63.647 s |
| One OPEN tender closes | 12,400 | 0 | 0 / 0 | 0 | 47.215 s |
| Final exact reuse | 12,400 | 0 | 0 / 0 | 0 | 61.085 ms |

Execution includes source rediscovery and the mandatory full sealing readback for new runs. Initial discovery/planning are separately reported (roughly 15–22 ms / 1–9 ms for the fixture); the benchmark's additional independent readback takes approximately 16–18 seconds per scenario. The zero-computation reuse timings do not include that deliberately extra audit. Delta scoring work is sharply reduced; total delta latency does not decrease proportionally because context/membership assembly and full readback remain substantial. No claim of measured 2-million-pair cloud recomputation speed is made.

Initial synthetic outcomes: 7,200 candidate/scored/ranked; 2,400 outside Formula scope and 2,400 scope not demonstrated remain null/unscored. Initial shortlist 3,229 = 2,980 review + 249 audit. This intentionally narrow fixture has a different shortlist percentage from the real sealed population; it exercises unchanged caps/policy rather than recalibrating the approved policy.

Final synthetic outcomes: 12,400 active pairs; 7,471 candidate/scored/ranked; 4,929 unscored (2,449 outside scope + 2,480 scope not demonstrated); 3,336 shortlisted (3,084 review + 252 audit). Across five new sealed versions, 12,832 total pair deltas were stored, not five complete matrices. There are 57,427 cached artifacts and 2,156 entity membership references. SQLite file size: 75,821,056 bytes (initial full run 38,604,800 bytes; exact reuse adds zero bytes). Sampled peak heap 142,143,848 bytes; sampled RSS 365,363,200; process high-water RSS 380,014,592 bytes. Bounds and the distinction between sampled peaks and the heap guard are documented in the runbook.

Final run `1e5e45f9ab36f2ccf7d76f270a7313c4dd51d53f534298f745dfde27d70dc3d3`:

- Pair hash `dcf3c70e438f4e3a741531711ca485b133deb9ec072ce49b8100eab93133ca7e`.
- Shortlist hash `4e0880714d8f5d774390a1089d8367501a0b5b930a00a10134378a5ef8eaed41`.
- A separate fresh process reopened SQLite read-only and revalidated the complete final proof in 11,493.951 ms. `PRAGMA foreign_key_check` returned zero violations and `PRAGMA integrity_check` returned `ok`.
- All scenarios: zero source/Neon connections, zero new TORS requests, zero model calls/tokens/cost and no execution authority.

## Planning and bounded query evidence

Synthetic metadata at 117 × 17,333 (2,027,961 possible pairs) took 161.619 ms to capture and 30.374 ms to full-plan. Exact-reuse planning took 104.815 ms. Adding one supplier, including metadata recapture, took 287.073 ms and identified exactly 17,333 affected pairs. No pair matrix was materialized; the CLI's entity-level plan is approximately 6.1–6.8 MB and is not a browser payload.

Both supplier/tender SQL plans use their direction-specific indexes before lineage resolution. Each response returned only 25 selected rows: supplier payload 54,606 bytes, median/max 205.614/220.384 ms; tender payload 49,092 bytes, median/max 230.213/245.357 ms, ten samples each. Both returned a bounded next cursor. The local adapter may sort one bounded focus in memory; it does not download or render the universe. Stage 8's authenticated signed-cursor HTTP contract and Stage 9 frontend are unchanged.

## Validation

`npm test -- --runInBand`: 631 passed, zero failed/skipped/cancelled; Node test duration 50,953.0053 ms. All Stage 4–10 evidence flags were enabled as applicable, together with isolated local PGlite. Stage 7 execution evidence was not claimed. The command rebuilt TenderLab, Ecosystem Atlas and TenderApps and generated 64 versioned Agent Specifications. Existing large-chunk, CSS filename, route-classification and plugin-timing warnings remain.

Stage 10 contributes 17 focused behavior tests plus 2 bound-evidence tests. Cases cover dynamic discovery, new supplier/tender, simultaneous deltas/intersection deduplication, source evidence/contract/version changes, closed/deleted/unlisted/removal, empty/reopened populations, exact reuse, crash before/after commit, disk restart, invocation/batch/lease/heap bounds, source drift including the final commit, plan tampering, cached result corruption, tenant mismatch, path/hash/payload budgets, stale cursors and exclusion of partial runs. The full suite also reran actual authenticated Stage 8/9 HTTP/PostgreSQL tests and preserved Overview/Formula guards.

Full lint passes. Syntax checks pass. Strict scoped TypeScript passes for the all-to-all UI and the reused normalization/readiness/eligibility/Formula/retrieval/shortlist/escalation contracts. The broad existing TenderApps project typecheck exits 2 with 24 errors in seven unchanged logistics/balance files; these are not silently presented as a clean global typecheck. Exact paths are in the validation JSON. There is no diff in those files from the approved base, and they were deliberately not changed in this stage.

## Remaining gates and limitations

The companion final ledger retains the actual sealed 117 × 17,333 universe, 707,660 scored/ranked candidates and 28,034 shortlist rows. It is based on existing hash-bound evidence, not a Stage 10 source recapture. Stage 7 migration 100 and guarded persistence were completed and independently validated after this Stage 10 checkpoint. A hosted authenticated runtime, source manifest publisher and reviewed incremental-to-Neon publication adapter remain unimplemented/unapproved gates. An operational compaction step is required before exceeding the local 32-version lineage cap; execution stops safely there. Synthetic timing/storage cannot replace cloud-scale capacity testing.

The scoring governor influenced the strict independent dimensions and explicit refusal to turn missing information or audit membership into fit, decisions or AI results. Development/release skills kept local evidence, historical sealed evidence and live release identity separate. No authorization, result, deployment or cloud readiness is inferred from local test success. Stop for orchestrator review after the clean local Stage 10 commit.

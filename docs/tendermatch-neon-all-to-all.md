# TenderMatch genuine all-to-all execution stage

Status: **source census completed; full execution blocked at the access/target gate**. This is not a completed all-to-all run, not a replacement snapshot, and not a deployment.

Base: `origin/main` at `d230590cf5ee99a679f162b2e3a19b65752c0f16`, freshly fetched after deployment. Isolated worktree: `C:/CodexWork/tendermatch-neon-all-to-all`, branch `codex/tendermatch-neon-all-to-all`. Other worktrees and previews are preserved. Owner stays `agent:TL-A031`; consultant decisions remain explicit.

## Actual read-only evidence

The [aggregate census](evidence/tendermatch-neon-all-to-all-census.json) binds the exact timestamps, endpoint fingerprints, database roles, predicates, counts, traversal checksum and measured query behavior. No connection URLs, credentials, supplier contacts, raw source bodies or individual source records are stored in it.

- Supplier query: 17 rows in the consumer view, **canonical listed count unknown**. The role cannot use `registry` and cannot create a schema. Historical documentation says other canonical entities were preserved, but that old count is deliberately not reused as a fresh total.
- Tender query: 17,322 rows for `status = 'OPEN' AND "deletedAt" IS NULL`. No country, deadline or sample limit filters. The count equals status-OPEN alone in this query. There are 1,974 past-deadline OPEN rows; freshness does not silently remove them from the considered universe.
- Goods 6,594 + Works 2,994 = 9,588 tenders within the current Formula scope. Consulting/Services/Other/EOI/Prequal total 7,734 outside it. These are tender counts, **not eligible pair counts**.
- Keyset traversal covers all 17,322 IDs exactly once in 18 pages of at most 1,000. Read transaction elapsed 11.09 seconds; 24 queries including identity/counts/plan, excluding the final rollback; end heap 10.38 MiB (not peak). The count plan used a sequential scan, 17.218 ms, 7,328 shared-buffer hits, no disk reads. These are census measurements, not scoring/index throughput.

The tender endpoint is documented as `br-morning-water-atqp6w7c`, `backup/pre-mvp-rc1-20260726`. Its SQL role/database were freshly verified; the Neon project/control-plane identity and its authority as today's current inventory are not established by that historical label. Do not silently promote this branch to the authoritative production dataset.

Reproduce the read-only census:

```powershell
node scripts/audit-tendermatch-neon-universe.mjs --supplier-env-file <existing-local-supplier-secret-file> --tender-env-file <existing-local-readonly-tender-secret-file>
```

The runner pins the known host/database/login, upgrades the older tender URL to TLS `verify-full` only in memory, begins a repeatable-read READ ONLY transaction, bounds pages, rolls back and suppresses secret-bearing error details. It cannot apply a migration or write results. It explicitly leaves canonical supplier count and all-to-all completion unresolved.

## Resume prerequisites

1. A versioned least-privilege full-listed supplier contract, with the canonical inclusion predicate and IDs/counts reconciled against active, approved and consumer-visible subsets. Missing profiles must remain listed with truthful missing-evidence states. Do not broaden the old pinned 17-profile contract or revive superseded profiles by guessing a latest timestamp.
2. An explicit authoritative current tender branch/view, or confirmation that the already available backup branch is the intended source for this run.
3. A positively identified **development result store**, distinct from source inventories, with permitted schema name, reversible migration authority, database/branch/endpoint identity and a server-side local secret-file path. Neither current source consumer can create a schema. A separate available application URL targets another endpoint and was not opened as a substitute result store.

Only after these gates may execution load all safe fields, prepare/version reusable inputs, materialize complete eligibility, calculate deployed Formula v1.1 exactly once per eligible pair, store compact results, rank bounded shortlists and expose the result service locally. Do not display `17 × 17,322` as the requested universe.

## Preserved semantics and remaining implementation

The new, unused `all-to-all-contract.ts` provides exact canonical-ID/consumer reconciliation, OPEN-universe validation, scope/profile-evidence accounting, independent scored/unscored projections, source identities that omit only declared run metadata, incremental invalidation planning and reference keyset pagination capped at 100 focused rows. It does not replace the deployed normalizer or implement a database service. The reference pager is for contract tests; a future SQL adapter must push the same bounded ordering into indexed queries.

The deployed formula/normalizer/SQL adapter and frontend are unchanged at this checkpoint. Formula identity remains `tendermatch-match-formula/1.1.0`, policy `tendermatch-coverage-adjusted-goods-works/1.1.0`. Missing criterion fit stays null; zero awarded points do not establish incompatible fit or Non-match. Outside scope and missing supplier profiles require separate considered-universe records rather than falsely inflating Formula-scored counts.

The independent audit identified follow-on seams: remove run timestamps from new source-feature identity without changing Formula operands; add an explicit universe/eligibility ledger; enforce bounded retry/checkpoint behavior; wire SQL retrieval ranking to focused pagination; and replace fixed 17/60 frontend validation only behind the new full-universe contract. Existing static and pinned paths stay intact until a real service replay proves the replacement.

PostgreSQL/pgvector and HNSW support remains implemented in the prior adapter but **has not been applied or run against Neon in this stage**. No embeddings, shortlist, TORS selection or model calls occurred. Full source processing, incremental live replay, performance/storage/index benchmarking, local result-service browser QA and complete-stage commit remain pending the gates above.

## Failure ledger

Validation of this preparatory checkpoint: 38 focused tests passed, including 15 new census/universe tests and the unchanged 1,020-pair Formula oracle; strict changed-module TypeScript and targeted ESLint passed. All production builds and the full repository suite passed: **383 tests, zero failures/skips**, including the optional transient PGlite/pgvector tests. These are local regression checks, not a Neon all-to-all execution. Initial missing package-workspace dependency links caused Excel/build resolution errors; linking the existing locked package dependencies resolved them without changing source or lockfiles. TenderApps output remains `index-B47XFTdH.js` / `index-CugebHFU.css`. No new result-service browser test is claimed because no result service or frontend change was made.

| What happened | Root cause | Correction | Reusable rule | Regression evidence |
| --- | --- | --- | --- | --- |
| The available supplier API exposed only a curated subset. | A pinned release contract was narrower than the requested canonical universe. | Census reports consumer count separately and refuses a full-universe claim. | Reconcile canonical IDs, not display counts, before Cartesian processing. | Census tests and live denied registry access. |
| The earlier tender extractor would omit countries and expired OPEN tenders. | Pilot selection was mistaken for global source status. | New census has exact OPEN/soft-delete predicate, no country/deadline reduction and bounded complete traversal. | Status, freshness and Formula scope are independent. | Predicate and duplicate/count tests; 17,322-row live traversal. |
| Available credentials cannot write a result schema. | Source read access is not result-store authority. | No migrations or writes attempted; explicit target handoff required. | Never infer development write authority from a read-only source connection. | Fresh role/schema privileges and zero write execution. |

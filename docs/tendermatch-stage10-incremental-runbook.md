# Stage 10 local incremental coordinator

Maturity: operational isolated local replay, not an installed cloud coordinator. Selected base: `ddf2ab2f854b84d1c75fc2cb5a1f39a6871fbf0a`. Stage 7 owner installation/persistence and the hosted authenticated runtime remain separate, unresolved gates. No source, Neon or model connection is made by this workflow.

## Input contract and execution-time discovery

The CLI reads `CURRENT.json` at each execution, not a historical count, frontend pin or saved list. Its schema is `tendermatch-current-source-manifests/1.0.0`. It contains `tenantId` and `supplier`/`tender` objects with relative `file` and canonical-JSON SHA-256 `digest` fields. Each referenced immutable manifest contains the same schema and tenant, its entity `kind`, a nonempty `contractVersion`, and `members`.

Every member has a UUID `id`, canonical-JSON source-record `digest`, relative `file`, and boolean `deleted`. Supplier members additionally have explicit boolean `listed`; tender members have `status`. Only listed, nondeleted suppliers and exactly OPEN, nondeleted tenders enter the new active universe. Inactive descriptors remain in the publication token but not in active pair membership. No count is hard-coded in the operational modules. The historical-size benchmark is deliberately separate.

Records are the existing safe structured `SourceInput` contract consumed by normalization/readiness, not raw database exports, arbitrary URLs or inferred evidence. Paths are realpath-contained; absolute paths, traversal, colon/URI paths and escaping links are rejected. Manifest/record digests and record IDs/kinds are checked. Source contract changes invalidate the affected entity kind even if its record bytes remain identical.

An approved upstream publisher must enumerate the complete source contracts, use immutable content-addressed record/manifests and atomically replace `CURRENT.json` only after all objects are durable. This stage implements the consumer, not that live publisher or source transaction. `tests/fixtures/tendermatch-stage10.mjs` is a synthetic test publisher, not a production extraction service. A publisher must not rewrite a record behind a retained content hash.

Discovery verifies both manifests and a stable pointer. Every batch checks the pointer; sealing also rereads full manifests. The pointer is checked synchronously again immediately before each local transaction commits. Drift interrupts the run and leaves the prior sealed run active. This is a captured-as-of publication boundary, not a distributed transaction that locks independent source systems indefinitely. A later publication is discovered on the next invocation.

## Operator commands

Use the already installed Node runtime with native TypeScript stripping and `node:sqlite` support (validated on Node 24.19.0 / SQLite 3.53.3). No dependency installation or database credential is required. Keep the snapshot and `.sqlite` file in an operator-controlled, nonpublic local directory with appropriate filesystem permissions.

```powershell
node scripts/tendermatch-stage10.mjs
node scripts/tendermatch-stage10.mjs --plan --source-dir C:/ApprovedSnapshot --state C:/LocalResults/tenant.sqlite --tenant example-tenant
node scripts/tendermatch-stage10.mjs --execute --source-dir C:/ApprovedSnapshot --state C:/LocalResults/tenant.sqlite --tenant example-tenant --plan-id <reviewed-run-sha256> --batch 128 --max-batches 1000
```

No arguments returns `DISCONNECTED`. Planning is read-only for an existing file and never creates a new file-backed store. Review the dynamic populations, added/changed/removed IDs, version changes, affected-pair count, shortlist dependency closure and execution authority (`false`) before execution. An exact current plan ID is mandatory. Wrong/stale plans fail closed. Changing the batch size while resuming is rejected; retain the original batch size.

`PAUSED_BUDGET` is an ordinary durable checkpoint. Repeat the same command to resume. `INTERRUPTED` retains already committed batches but does not publish partial results. A fresh plan is required when the source or code identity changes. The old interrupted run stays available for inspection, while content-addressed cached results may be reused by a new plan. After an exact unchanged run, `SEALED_REUSED` returns the same run ID with zero source-record reads, zero algorithm computations and zero new rows/requests/calls.

## State and identity model

`entities → pairs → contexts → shortlist → escalation planning → full readback → sealed active pointer`

Each phase is durably checkpointed in a local SQLite transaction. There is one worker, an expiring 60-second lease, a compare-and-swap against the previous active run, and uniqueness keys for every run/pair/membership. Faults before commit roll back the complete batch; faults after commit resume from its durable offset. A replacement worker can claim an expired lease. Concurrent workers fail closed; this is not a distributed queue.

The local schema is `tendermatch-local-incremental-store/1.0.0`: `metadata`, `run`, `active`, `lease`, `cache`, `entity_member`, `pair_delta`, `context_member`, `nomination`, `shortlist_member`, `decision_member`. Cache values, nominations and sealed runs/memberships are protected by immutability triggers. A file is bound to one tenant. IDs/values are parameterized and direction is allowlisted. OS filesystem control is the security boundary; this SQLite adapter is not presented as hosted authentication or PostgreSQL RLS.

Only changed pair rows are appended to `pair_delta`. Unchanged results are resolved from immutable parent runs, filtered by the new active entity membership. No unchanged full matrix is copied into a new run. Full readback streams effective pairs in deterministic order, checks Formula component/Missing/points/coverage/confidence invariants and evidence links, checks retrieval units, verifies shortlist candidate/tier boundaries and hashes the resulting identities. Historical versions remain readable.

Cache namespaces are explicitly local Stage 10 identities. They bind exact source-record/contract hashes and relevant algorithm file hashes, not a promise that these IDs equal existing Neon run IDs. The coordinator version also binds its files and Node/V8/SQLite runtime. Formula and ranking are invoked through existing unchanged stage functions; the coordinator does not duplicate their algorithms. Source-projection import is used only as a pure function; no imported source connector is invoked.

## Invalidation rules

| Change | Pair algorithm work | Other dependent work |
| --- | --- | --- |
| New/changed supplier | That supplier × active OPEN tenders | Its supplier context and affected tender contexts; memberships using either changed context |
| New/changed OPEN tender | That tender × listed active suppliers | Its tender context and affected supplier contexts; memberships using either changed context |
| Both endpoints change | Union of endpoint products, intersection visited once | Same directional dependency closure |
| Closed/deleted tender or removed/unlisted supplier | No old Formula/ranking recomputation | New active membership excludes it; dependent directional nominations are updated |
| Source contract, normalization, readiness or eligibility version | Explicit relevant endpoint/full eligibility invalidation | Dependent Formula, retrieval and directional identities |
| Formula version | Candidate Formula and dependent retrieval | Eligibility reused, shortlist contexts reconsidered |
| Retrieval version | Candidate retrieval | Formula/eligibility reused, shortlist contexts reconsidered |
| Shortlist policy version | No pair scoring/ranking | Directional contexts and membership identities |
| Escalation policy version | No pair scoring/ranking/shortlist | Reallocate bounded deterministic planning decisions |
| Prompt/provider/TORS schema version | No pair scoring/ranking/shortlist | Assessment reuse identity changes; unchanged allocation reused |
| Coordinator/runtime version | Conservative full pair visitation | Content caches still obey their independent version bindings |
| Exact unchanged source/code/config | Zero recomputation | Exact sealed run reused; no requests/calls |

Ranking relevance is endpoint-local. Directional shortlist ranks, ties and caps are not: inserting a tender can change existing supplier-focused nominations. The explicit context closure prevents stale memberships without rescoring unrelated pairs. Conservative context visits still reuse a cached context when its actual candidate inputs are identical. An assessment identity excludes its global run and nomination position, so unrelated rank movement does not by itself invalidate unchanged evidence/model/prompt inputs.

## Bounds and visibility

- Maximum 100,000 source descriptors, 10,000,000 active pairs, 32 MiB per manifest and 256 KiB per record/cached artifact.
- Default batch 128; maximum 512; maximum 10,000 batches per invocation; one worker. Contexts process one focus per transaction, with at most 100,000 candidates per focus.
- Maximum 100,000 shortlist rows and 64 MiB escalation input. The unchanged selective policy has a 500 automatic planning cap plus its supplier/tender caps. These are plans, not requests or execution authorizations.
- Heap guard: 512 MiB checked before work and before every commit. This fail-closed guard complements count/payload bounds; it is not an OS memory reservation or a guarantee of no transient allocation peak.
- Parent lineage is bounded to 32 runs. Beyond this, `LINEAGE_BUDGET_REBASE_REQUIRED` stops safely; an operational compaction/rebase implementation is an explicit next gate, not automatic deletion of history.
- Local `surface()` returns one required focus, maximum 100 rows, maximum 512 KiB; default 25. `detail()` requires one selected active pair and the same response cap. No full-universe download endpoint exists.
- A partial run is never visible. The exact latest sealed run ID and tenant are required; old run IDs and stale/wrong-focus cursors fail. Historical inspection uses internal store methods, not the latest-results contract.

The local focus query uses its supplier/tender index before parent resolution, then sorts at most one bounded focus. Cursor pagination is bounded but its local cursor is not an authenticated token; it must not be exposed directly on the Internet. The already validated Stage 8 authenticated, authorized, tenant-pinned, signed-cursor HTTP boundary remains unchanged. Stage 10 does not repoint that API or the Stage 9 UI to SQLite or invent hosted runtime credentials. A reviewed publication adapter and sealed-run pin update are required before cloud/UI consumption of new incremental results.

## Semantics and non-actions

Eligibility, Formula v1.1 Pair Score, Data Coverage, Assessed-only Fit, Evidence Confidence, Retrieval Relevance, shortlist tier, escalation plan, execution authorization, TORS and Human Disposition remain separate. Measured zero remains numeric zero. Missing remains unknown even when it contributes zero Formula points. Outside Formula scope remains unscored/null. Audit-only never means promising. No automatic Match/Non-match decision is created.

Escalation uses the existing deterministic budgeted planner only. `requestState` is `NOT_CREATED_BY_COORDINATOR`, `executionAuthority` is false, and TORS/human fields are null. No provider adapter, queue job, intent request, artifact, token or cost is generated by this coordinator. The future explicit Stage 8 user intent path remains separately authenticated and does not grant execution authority.

## Validation and handoff

```powershell
node --test tests/tendermatch-stage10.test.mjs
node scripts/benchmark-tendermatch-stage10.mjs
node scripts/build-tendermatch-final-ledger.mjs
```

The benchmark writes only synthetic temporary snapshot/SQLite data and its evidence JSON. The ledger reads and hashes prior checked-in evidence only; it does not recapture live counts. See `docs/evidence/tendermatch-stage10-benchmark.json`, `docs/evidence/tendermatch-all-to-all-ledger.json` and `docs/tendermatch-all-to-all-readiness-ledger.md` for measured/retained evidence and pending gates. No new owner migration is required for the local module. Migration 100 remains the separate Stage 7 owner gate; no owner DDL is attempted here.

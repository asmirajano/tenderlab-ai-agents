# TenderMatch Stage 1 — input universe registered

**Completed development-only input capture, 6 September 2026. Stop for Stage 1 review.**

117 canonical suppliers × 17,323 source-listed OPEN, nondeleted tenders =
**2,026,791 potential pairs**. This is inventory arithmetic, not evaluated coverage.
Scoring, eligibility decisions, shortlisting, normalization, embeddings, AI and TORS
are **NOT RUN**. No frontend source switch, push, merge, deployment or paid action.

Machine evidence: [tendermatch-development-stage1.json](tendermatch-development-stage1.json).
Active task/recovery record: [Stage 1 checklist](../tendermatch-stage1-active-task.md).

## Authority and selected state

- Worktree: `C:/CodexWork/tendermatch-neon-all-to-all`.
- Branch: `codex/tendermatch-neon-all-to-all`, no upstream.
- Approved Stage 0 base: `9f3bcb4ac785f42accd289502932a1f1e6cb7514`.
- Fetched remote `origin/main`: `d230590cf5ee99a679f162b2e3a19b65752c0f16`.
- Checkpoint identity: enclosing Git commit; executed runner/SQL hashes are in JSON.
- Executed implementation checkpoint: `acdc210eeb027e5010976eaebcd471671194555f`.
  Its successor removes one trailing SQL blank line flagged by the staged whitespace
  check; trimmed SQL is byte-equivalent and the retained applied-source hash is
  historical execution evidence. No migration was reapplied for this formatting fix.
- The stale `25a9` checkout was not used as this stage's implementation base.

The latest Stage 1 delegation explicitly confirmed the historical user selection
of the tender branch. The retained authenticated Neon Console inspection resolved
project **TenderLab**, `solitary-darkness-82235346`, branch
`backup/pre-mvp-rc1-20260726`, `br-morning-water-atqp6w7c`, primary compute
`ep-aged-feather-atm85iwd`. This agrees with the historical linkage contract in
[central-Asia pilot, source contract](../tendermatch-central-asia-current-pilot.md)
and the existing `neondb` / `th_qa_readonly` connection. It was **not selected by
largest row count**, and its name is not evidence that it is the newest/production
branch. This is the selected authoritative source for this approved capture.

The result/source-registry Console recheck confirmed `tender-entity-registry`,
`dry-union-87553313`, `development` / `br-polished-boat-b1qddx0m`, and direct compute
`ep-dark-dew-b15ctyr1.c-5.eu-central-1.aws.neon.tech`. PostgreSQL cannot independently
prove a Neon branch ID: Console evidence, exact endpoint, database, login and SQL
origin guard are combined. No role/password/database was provisioned or rotated.

## Captured contract and source truth

| Source | Exact population | Captured count | Source transaction (UTC) |
| --- | --- | ---: | --- |
| `tender_entity_registry.tendermatch_all_supplier_api` | Canonical `entity_type_code='company'`; all approved API members, no readiness/category filter | 117 | 10:15:20.461–10:15:22.439 |
| `neondb.public.tenders` | `status='OPEN' AND "deletedAt" IS NULL`; no geography, deadline, category or sample filter | 17,323 | 10:15:24.128–10:15:34.270 |

Supplier canonical, pinned and consumer counts and IDs agree. The dynamic source
manifest is checked before and after traversal; both ID checksums are
`c4339c6056ca50d92b188a2d7407a0fb`. Pinned profile versions remain 100 v2.1 and 17
v1.3. All 117 profiles are PINNED; all 1,553 allowlisted evidence rows were read.
Stable and versioned API views are set-equivalent. Duplicate, profile/version,
claim-link and artifact-link checks passed. Source/feed/country tender joins use
the inspected declared foreign keys; zero orphan references were found.

These are source-reported facts, **not new verification/readiness judgments**:

- Supplier classification: 14 Goods, 3 Works, **100 MISSING**.
- Existing readiness: 2 ready-for-exploratory-matching, 111 usable-with-limitations,
  4 requiring enrichment. No new eligibility classification was applied.
- Evidence: 0 VERIFIED, 126 STATED_UNVERIFIED, 820 INFERRED, 607 UNKNOWN.
- Values: 946 SOURCE claim texts, 607 MISSING; 167 artifacts unavailable.
- Tenders: 6,594 Goods, 2,994 Works, 827 Consulting, 6,567 Services, 332 Other,
  8 EOI and 1 Prequal. All are retained, regardless of future formula scope.
- 1,979 OPEN tenders were past deadline; none lacked a deadline. They remain in
  this exact source-status universe. OPEN is not an eligibility verdict.

## Consistency, hashes and drift rules

Each source uses `REPEATABLE READ READ ONLY`, a 30-second statement timeout,
monotonic UUID keysets and exact count/ID reconciliation. Supplier pages are
bounded at 100 profiles and 500 claims; tender pages at 500. Missing, duplicate,
out-of-order, oversized, orphaned or version-drifted input fails closed. There is
no fallback to the public 17×60 snapshot. Canonical-company drift (including
same-count ID replacement) requires a reviewed read-contract version.

Snapshots: supplier `41992:41992:`, tender `2085231:2085231:`. Each source retained
the same snapshot and inventory through its traversal. Their start-time skew is
3.667 seconds. Maximum allowed duration is 120 seconds/source, cross-source skew
15 minutes, registration age 30 minutes, and tender traversal safety cap 1 million
records (exceeding it blocks, never truncates). These are **independent captures**,
not a cross-database atomic snapshot. Both databases reported GMT. Timestamp-without-
time-zone source literals remain unaltered; past-deadline diagnostics use the
reported database timezone, without changing inclusion.

| Inventory | Canonical sorted-ID JSON SHA-256 | Compact-member SHA-256 |
| --- | --- | --- |
| Suppliers | `f0bcd0b9f9c897b80ea85ed4ce91088944cb20fac3cc4bb9ace878fe81610283` | `0680eda075657ac383a5acb191434198b5467adcc4bc0450f87d7b7ff5534a09` |
| OPEN tenders | `34950ee8e93bc4e9c9f2f94ac1b5239edd60ad73fb847c5864792730375864e4` | `e07fa8c3f82a69cf8704d58c96b6f6ebe116d47415b999dfe16055f18b840e7d` |

Supplier content hashes cover the complete safe profile and safe evidence rows
(claims sorted by stable ID); values are read in memory, not persisted as bodies.
Tender row hashes are computed server-side over the explicit `HASH_FIELDS` list:
identity/source references, version/contentHash, title/description, procurement
type/status, buyer/financier, geography ID, reported budget, timestamps and source
deadline/timezone cues. No raw/metadata body, embedding, search vector or derived
tag/category/sector relationship is captured. This is **not a scoring-cache key**:
future stages must hash/version any additional operands they intend to consume.

Manifest identity includes adapters, source identities/predicates, hash contracts,
counts, ID/content hashes and policy references. Capture clocks live in a separate
observation record. Changed source content/version produces a new manifest;
unchanged inputs reuse the existing one without overwriting history. Stage 0
used newline-joined ID SHA-256; Stage 1 explicitly uses canonical JSON arrays.
The common comma-joined MD5 agrees; these different SHA encodings are not drift.

A preliminary read-only capture at 10:11:54–10:12:14 produced the same manifest
and inventory hashes as the registered capture. This is an observed no-drift
comparison, not a promise that sources will remain unchanged later.

## Persisted development boundary

Target: `tendermatch_results_dev.tendermatch_retrieval`, tenant
`tendermatch-development-stage1`.

Manifest ID:
`1dde6c1b91bf02ff499493e99e236355016ff838cc39d11d1187bffada40a729`

Capture ID:
`dd3d7b86bfe7305f5b7b00228a8e15a55cdccb46ba384ec5ba851d147c8ccc05`

Registration transaction timestamp: `2026-09-06T10:15:38.433Z` (not a claimed
commit-completion clock). Separate committed readback passed at 10:18:56.205Z.

| Table | Rows | Purpose | Total allocated bytes, including indexes/TOAST |
| --- | ---: | --- | ---: |
| `input_manifest` | 1 | Versioned source/hash contract and aggregate counts | 49,152 |
| `input_member` | 17,440 | One supplier or tender ID + compact provenance/version/hash | 14,639,104 |
| `input_capture` | 1 | Independent source capture clocks, snapshots and diagnostics | 49,152 |

Total allocated storage is 14,737,408 bytes (~14.05 MiB). **No 2,026,791 pair rows**
were materialized. No tender titles/descriptions/bodies or supplier claim text is
stored in these three tables. The original 16 business/model tables remain globally
empty, verified using the owner after registration, not only tenant-filtered counts.

The additive `040-input-manifest-up.sql` preserved both prior migration records and
added `20260906-input-manifest-v1`. It creates only these three tables, two integrity
functions, their index/triggers and scoped grants. Membership must be inserted in
the header's creating transaction; a deferred count check rejects incomplete sets
at COMMIT. Committed membership is sealed. Updates/deletes are immutable even for
the normal owner. The prepared `049-input-manifest-down.sql` is **not executed**;
it refuses data-bearing rollback and needs a separate retention decision.

Existing writer login has only inherited SELECT/INSERT on the three new tables.
All have RLS; no PUBLIC or direct-login table grants were added. Live UPDATE,
DELETE, TRUNCATE, DDL, cross-tenant insert and post-commit member insertion were
denied; cross-tenant read returned zero. All probes left zero committed rows.
The trusted-service tenant setting is **not authentication**: never provide this
database credential to a browser or an end user.

## Measured execution and tests

| Operation | Queries/pages | Measured elapsed |
| --- | --- | ---: |
| Supplier capture | 15 queries; 2 profile pages + 4 evidence pages | 2,071 ms |
| Tender capture | 43 queries; 35 pages | 10,330 ms |
| Registration + full readback | 79 queries; 17,440 members inserted | 13,306 ms |
| Exact idempotent replay + full readback | 44 queries; **0 rows inserted** | 8,397 ms |

Capture counts include transaction control and final rollback; registration counts
include transaction control and readback. Connection/owner/negative-test queries
are separate. These are observed small development workload measurements, not
production latency or scoring-performance claims.

- Manifest suite: **19/19**, including actual disposable PostgreSQL/PGlite SQL.
- Focused input-manifest, preparation, census, all-to-all-contract suites: **59/59**.
- `npm run test`: **427/427**, zero failed/skipped; all three production builds and
  generated Agent specifications completed first. Synthetic scoring regression
  fixtures execute only locally, not against the Neon input universe.
- Targeted ESLint, Node syntax checks and strict all-to-all contract TypeScript
  check passed. Full ESLint result recorded in JSON.
- Original standalone at `04b0b2a723223d11617837ee0e7562fa48168cd9` remains clean;
  original rendered/static checks **3/3** passed.
- Existing build warnings remain: large shared chunks, vinext duplicate emitted
  CSS filename warning, and static route-classification limitations. No build failed.

Fixtures cover wrong source/role/TLS/attestation, duplicate/unordered/truncated
pagination, zero population, changed versions, missing-vs-zero, orphan/mislinked
evidence, stale/skewed captures, same-input reuse, explicit-ID readback, wrong tenant,
immutable membership and incomplete transaction rollback. No tests were weakened.

## Operator/recovery contract

Default `node scripts/tendermatch-input-manifest.mjs plan` is disconnected.
`capture` is read-only; `register` recaptures sources then inserts/reuses compact
membership. Both require explicit Stage 1 authority and fresh Console attestations
for **both** projects/branches/endpoints. `migrate` accepts only a temporary existing
results owner URL, exact branch and DB-origin guard, and exactly the two Stage 0
migrations. Do not rerun it after success or call Stage 0 provisioning again.

Existing ignored supplier/writer files and the explicit external read-only tender
env file were reused. No credentials/files were created, overwritten or rotated.
Windows secret-file inheritance remains disabled and access remains current-user
only. Temporary owner references and clipboard were cleared; the Console password
is hidden. SQL `log_statement` was `none`. Memory zeroization and third-party
logging cannot be guaranteed by JavaScript.

The old supplier API still returns **17 profiles / 289 evidence rows**; the new
API has exactly five inherited read-only views. No source schema, permission or
data mutation occurred. No app code, fixture, canonical Agent, Firebase or external
release configuration changed.

## Failure/correction and next decision

| What happened | Root cause | Correction | Reusable rule | Regression evidence |
| --- | --- | --- | --- | --- |
| An interrupted Stage 1 turn answered a historical Formula deployment question | Active objective was not anchored after compaction | Added and reread a local Stage 1 objective/acceptance file; resumed existing drafts | Resume from explicit active checkpoint/acceptance, not old conversation proximity | This registered manifest and enclosing Stage 1 evidence/checkpoint |
| A census/count alone could not serve as a durable input boundary | No persisted membership/version identity; source clocks were conflated with reusable input identity | Three append-only tables plus independent capture observations | Hash membership/content separately from observation clocks; fail incomplete traversal | 19 manifest tests, live full readback, zero-insert replay |

Current maturity: **validated development input capture**, not an all-to-all scoring
runtime. Input hashes do not archive source bodies. Later stages must reread exact
IDs, reject changed/missing versions/hashes, and explicitly extend the manifest for
any additional operands. Source-quality limitations remain visible; no positive
fit, eligibility, recommendation or human decision has been invented.

**Stop here.** The next safe action is orchestrator/user review of this Stage 1
boundary. Scoring/normalization, retrieval/AI/TORS and frontend/source replacement
require their later stage authorization.

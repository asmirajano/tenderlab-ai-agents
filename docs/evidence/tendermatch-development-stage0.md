# Stage 0 — development setup applied and validated

Executed on **6 September 2026**, from prepared commit `67483e663ced51f4be263b670b38966794adc83c`, on `codex/tendermatch-neon-all-to-all` in `C:/CodexWork/tendermatch-neon-all-to-all`. The enclosing commit records this evidence. Fetched `origin/main` remained `d230590cf5ee99a679f162b2e3a19b65752c0f16`. The approved SQL and setup runner were applied unchanged; this checkpoint changes documentation/evidence only.

## Applied boundary

The explicit Stage 0 handoff authorized the source contract, separate result database/schema, two restricted LOGIN credentials and protected ignored files. Authenticated Neon Console evidence confirmed TenderLab / `tender-entity-registry` / `development` (`br-polished-boat-b1qddx0m`) and direct compute `ep-dark-dew-b15ctyr1.c-5.eu-central-1.aws.neon.tech`. Every connection also passed exact host/database/role guards, `sslmode=verify-full` and required channel binding.

The existing owner credential was read privately from the authenticated Console, passed only in temporary child-process environments, never saved or rotated, and cleared from temporary references/clipboard afterward. PostgreSQL reported `log_statement=none`. This does not claim JavaScript memory zeroization or control of third-party platform logs.

| Ordered step | Actual result |
| --- | --- |
| `source-up` | New `tendermatch_all_supplier_api`, owner-only pinned membership/helper, five exposed views and NOLOGIN reader role; full traversal passed |
| `result-create` | New `tendermatch_results_dev`, owned by `neondb_owner`, exact reviewed origin marker; direct reconnect verified |
| `result-up` | `tendermatch_retrieval`: 17 tables, two migration records, PostgreSQL 18.6 / pgvector 0.8.6 |
| `provision-source` | New `tendermatch_all_supplier_consumer_dev`, inherited reader access only; live validation passed |
| `provision-results` | New `tendermatch_result_writer_dev`, bounded writer grants; live validation passed |
| `validate-source` | Reconnected from the newly written restricted secret file; all 117 IDs/evidence traversed, access/denial checks passed |
| `validate-results` | Reconnected from its new restricted file; positive write/status probe, RLS and denial checks passed; transaction rolled back |

The Console database inventory did not immediately display the SQL-created result database during this check. No duplicate database was created through the UI. Direct connection to the exact endpoint/database, `current_database()`, owner and origin comment independently verified its identity. This is a Console inventory limitation, not absence of the database.

## Actual source coverage — not a scoring verdict

| Measure | Result |
| --- | ---: |
| Canonical company IDs / consumer-visible IDs | 117 / 117 |
| Pinned / missing / ambiguous profiles | 117 / 0 / 0 |
| Pinned versions | 100 v2.1 + 17 v1.3 |
| Explicit classification | 14 Goods + 3 Works + **100 Missing** |
| Allowed evidence records | 1,553 |
| Independently VERIFIED claims | **0** |
| Stated-unverified / inferred / unknown | 126 / 820 / 607 |
| Available / unavailable exact artifacts | 1,386 / 167 |

All canonical IDs were traversed exactly once in nonempty pages of 50, 50 and 17. Sorted-ID SHA-256: `84bbd14d678a0ca6e1a15ce08de7616b9553f82010e44964a77fdfbbba3ba9b0`. Stable/versioned aliases reconcile. All 607 unknown values remain `MISSING`; `SOURCE` describes reported claim text, not verified truth. Full population is not full eligibility.

The 23-field allowlist excludes contact/raw/nested-private fields. Bounded email, messaging, phone and credential-pattern screening found zero flagged values in allowed pinned business fields. This is not comprehensive DLP; the contract remains server-side development access, not a public export.

## Preservation and permissions

Before/after fingerprints match for canonical entities, profile versions, claims and artifacts, and for the existing source schemas' ACLs. The old API is still **17 profiles / 289 evidence records**, with unchanged view definitions and projected-row hashes. Its original consumer credential still works and still cannot use `registry`. Exact hashes are in the [machine-readable evidence](tendermatch-development-stage0.json).

Both new LOGIN roles have connection limit 3, exactly one non-admin application membership, zero ownership, and no superuser, CREATEDB, CREATEROLE, replication or RLS-bypass attributes. Their grant roles are NOLOGIN. No direct LOGIN table grants exist.

- Reader: SELECT on exactly five exposed views; source entities, raw payloads, contact columns, private membership IDs, private pin helper, API writes, CREATE ROLE and CREATE DATABASE were denied.
- Writer: SELECT 17 tables; INSERT 15; UPDATE only batch/assessment state tables and `evaluation_run.status`. DDL, DELETE, score edits and model registration were denied. Same-tenant insertion/status update succeeded only inside a rolled-back test. Cross-tenant reads were empty and writes returned `42501`.
- New API schema and new result schema/database have no PUBLIC grants. Existing source PUBLIC CONNECT/TEMPORARY and unrelated ACLs were not broadened or revoked. Source CONNECT does not grant access to source tables.
- No forbidden role, database or table probe survived.

RLS uses a trusted service-set tenant identifier: **this is not end-user authentication**. Neither credential belongs in a browser or client bundle.

## Result store and fresh tender census

All **16 business/model tables are empty** after validation, including evaluation runs, universe pairs, Formula scores, embeddings, model registrations and assessment jobs. Only two schema-migration records exist. The 32 indexes include lexical/concept/geography GIN, rank/lease B-tree and the partitioned cosine HNSW parent (`vector(384)`, `m=16`, `ef_construction=64`). There are **no model partitions**, so this proves schema readiness, not active vector retrieval or ANN quality/performance. Fifteen tenant-bearing tables have RLS; the two global metadata tables are not tenant tables.

The separate existing read-only tender connection was censused at **2026-09-06 08:54:51 UTC** using `status = 'OPEN' AND "deletedAt" IS NULL`: **17,323** rows (not the previous 17,322), all traversed once in 18 bounded pages. Goods/Works: 9,588; other scopes: 7,735. Past-deadline OPEN rows: 1,979, retained; missing deadlines: 0. No tender source was modified.

That connection is the previously approved census endpoint `ep-aged-feather-atm85iwd` / `neondb` / `th_qa_readonly`, documented as `br-morning-water-atqp6w7c`. Its control-plane identity/authority for a future scoring run still needs a separate current-source decision. The historical census runner's “no full-listed contract” message applies to its **old 17-profile credential**, not to the new API validated above.

## Protected handoff files

| Ignored local file in this worktree | Sole variable |
| --- | --- |
| `.env.tendermatch-all-suppliers-dev` | `TENDERMATCH_ALL_SUPPLIER_DATABASE_URL` |
| `.env.tendermatch-results-dev` | `TENDERMATCH_RESULT_DATABASE_URL` |

Each contains exactly one assignment; both have Windows inheritance disabled and current-user FullControl only. Passwords were randomly generated in memory and never emitted into reports, patches or command arguments. Do not rerun provisioning to rotate/adopt these existing roles or overwrite these files. Use the existing guarded validation commands. Rollback remains the reviewed [runbook](../tendermatch-development-database-runbook.md), not an automatic next action.

## Regression evidence and stop condition

- Live: all seven setup/validation steps passed; fresh reader/writer replay from the restricted files passed; extra private-pin-helper denial passed; owner-side empty-store/source-preservation checks passed.
- Focused preparation + all-to-all + census + Formula: **50/50**, zero failures/skips, including disposable SQL and unchanged 1,020-pair Formula replay.
- Full repository tests: **408/408**, zero failures/skips (`node --experimental-strip-types --test tests/*.test.mjs`, existing built artifacts). SQL/model fixtures run only in disposable local PGlite/pgvector, never against the new Neon result store.
- Targeted setup-runner/test ESLint, runner JavaScript syntax, strict TypeScript for `all-to-all-contract.ts` and its imported graph, evidence arithmetic/secret-pattern checks, and `git diff --check`: passed.
- Original standalone static checks: **3/3**, clean at `04b0b2a723223d11617837ee0e7562fa48168cd9`.
- No application or engine code changed. Production-build and strict-TypeScript evidence from prepared checkpoint `67483e6` remains historical; it is not relabelled as a new deployment check.

No setup SQL/runner defect required a patch. Temporary runner-launch issues were corrected before any database mutation: the browser REPL lacks Node's `process` context, so the reviewed server runner was executed in a child process; the connection was normalized to explicit `verify-full` and `channel_binding=require` and then independently guarded. No permissions or TLS checks were weakened.

**Stage 0 stops here.** No business scoring, embeddings/TORS/provider calls, frontend/source replacement, canonical registry changes, owner password rotation, paid upgrade, push, merge or deployment occurred. The live 17×60 app and original TenderBoost remain untouched. The next safe stage requires an explicit source/adapter and development-run handoff; Stage 0 does not authorize it.

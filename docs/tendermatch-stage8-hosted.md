# Stage 8 — isolated development Neon Function

## Result and identity

The authenticated **read-only** subset of the existing sealed Stage 8 service is
hosted as Neon Function `tendermatchstage8`, deployment **2**, Node 24, Frankfurt:

https://br-polished-boat-b1qddx0m-tendermatchstage8.compute.c-5.eu-central-1.aws.neon.tech/

This is a controlled development API pilot, not a production/enterprise release,
public TenderApps integration, identity provider, scheduler or AI/TORS service.
An ordinary unauthenticated request must fail (401 on API routes). No token is
embedded in this document or a browser URL.

Selected base: `d584dd455e9b048d178099436d69b32e1cca2e2a` on
`codex/tendermatch-neon-all-to-all`, `C:/CodexWork/tendermatch-neon-all-to-all`.
Production remote remains `d230590cf5ee99a679f162b2e3a19b65752c0f16`.
Runtime/build code identity:
`0482e143cbb7791fefc1f1597881870f3751ae964f9adb8b673a1eaa0cd739d1`.
The deployment/build evidence maps this identity to every source hash and bundle
hash. The final local checkpoint contains these exact sources; no Git push/merge.

Project `dry-union-87553313`, organization `org-dark-snow-95046181`, branch
`br-polished-boat-b1qddx0m` (`development`), database `tendermatch_results_dev`.
No source/production database was connected. Original TenderBoost remains untouched.

## Exact sealed data contract

Binding: `26e1bab78a38d8d520d59563e702bc4540405213f39cbb7b40a49ecbb03a4080`.
All underlying run, policy, completion and plan hashes come from the unchanged
`developmentPin()` and are retained in the final readback evidence. No latest-run
selection, source refresh, formula calculation or earlier-stage replay occurred.

| Population | Sealed count |
| --- | ---: |
| Suppliers / OPEN tender snapshot | 117 / 17,333 |
| Original pair outcomes | 2,027,961 |
| Formula-scored / ranked | 707,660 |
| Explicitly unscored | 1,320,301 |
| Scope not demonstrated / outside Formula scope | 414,604 / 905,697 |
| Positive lexical retrieval | 24,007 |
| Shortlist: review / audit | 18,531 / 9,503 |
| Review plan / stored automatic requests | 1 / 500 |
| Authorization grants / jobs / artifacts / events | 0 / 0 / 0 / 0 |

Formula v1.1, Data Coverage, assessed-only Fit, Evidence Confidence, lexical
retrieval, shortlist tier, planned escalation and human disposition remain separate.
Missing fit stays null with zero contribution, never a measured Fit 0. Unscored
outside-scope pairs retain null Formula/retrieval values. Semantic similarity is
Missing, not an embedding result. Human disposition stays explicitly unavailable;
the API cannot approve a match/Bid decision. AI/TORS is unavailable in this host.

## Hosted routes and authentication

Prefix `/api/tendermatch/all-to-all/v1`; every route requires an opaque owner
bearer session and `binding=<exact binding>`:

| Method | Path after prefix | Output |
| --- | --- | --- |
| GET | `/health` | Exact sealed population/capabilities |
| GET | `/suppliers/:id/results` | Supplier-focused ranked candidate page |
| GET | `/tenders/:id/results` | Tender-focused ranked candidate page |
| GET | `/pairs/:supplierId/:tenderId` | Selected original pair and criterion evidence |

Default page 25, hard maximum 100. Signed HMAC-SHA256 cursors expire after 15
minutes and bind tenant, complete version, direction and focus. Unknown/duplicate
parameters, client tenant injection, invalid IDs and stale/forged cursors fail.
Only these reads exist. Intents and all writes return 405; job/artifact, bulk matrix
and export routes return 404. Responses advertise no intent or execution ability.

The current owner-only session expires **2026-09-07 16:56:44 UTC** (21:56:44 Tashkent).
An already-expired negative-test seed and an unconfigured-tenant negative-test seed
have no data authority. Server configuration stores only token hashes; raw owner
tokens/signing key/read credential are retained in CurrentUser DPAPI outside Git.
Expired sessions remain denied after isolate restart. No login/renewal endpoint,
browser token storage or user enrollment is implemented. Refresh/rotation requires
an explicitly scoped operator deployment and must not recreate the project key.

Stage 8 accepts **no browser Origin** (empty CORS allowlist). Non-browser
authenticated API clients work; browser/CORS integration belongs to Stage 9.
Authentication occurs before database acquisition. Errors contain safe codes,
not SQL, credentials, contacts or source payloads. Responses use no-store, nosniff,
no-referrer, noindex and an exact code-hash response header.

## Least privilege and changed schema

Added schema `tendermatch_stage8_v1` with **24 security-barrier views**, never
copies of result tables. Views use explicit columns, a constant tenant plus server
tenant setting, exact run/policy/plan identities and pinned membership predicates.
The detail evidence projection exposes only required reference/group/identity fields,
not complete supplier/tender projections. Unused dependency views expose no rows.
Existing schema markers, tables, grants and all sealed result rows remain unchanged.

Added NOLOGIN grant role `tendermatch_stage8_reader` and LOGIN runtime role
`tendermatch_stage8_reader_dev`: sole application membership in the grant role,
connection limit 3, no superuser/CREATEDB/CREATEROLE/replication/BYPASSRLS or ownership.
Inherited access is USAGE + SELECT only on the new views. No source/base-table reads
or writes. PUBLIC has no privileges on the new schema/views. Unrelated PUBLIC and
existing-role grants are not altered. Default transactions are read-only, with
five-second statements and eight-second idle-in-transaction timeout.

The approved API key `TenderMatch Stage 8 dev Functions 2026-09-07` is project-scoped
Editor access for this project, **all its branches**, not a branch-only credential.
No broader OAuth key was approved or used. Its key ID was not independently exposed
by the project metadata API; name, project scope and successful scoped calls are the
retained proof. Vault files:

- `%LOCALAPPDATA%/TenderMatch/stage8-dev/neon-project-deploy.dpapi`
- `%LOCALAPPDATA%/TenderMatch/stage8-dev/runtime-readonly-v1.dpapi`

Only the restricted reader URL is shipped to the Function. Both Neon-injected
`DATABASE_URL` aliases are explicitly overridden with that same reader URL, and
initialization refuses a mismatch. Owner provisioning credentials are temporary,
in-memory and never deployed. The deployment key is never part of the bundle.

## Reproducibility and rollback

- `scripts/tendermatch-stage8-host-preflight.mjs`: read-only target/seal inventory.
- `scripts/lib/tendermatch-stage8-views.mjs`: deterministic apply/rollback SQL
  generators; every view/column/predicate is reviewable here.
- `db/tendermatch-dev/110-stage8-reader-{up,down}.sql`: numbered, non-secret SQL
  projections generated by `scripts/generate-tendermatch-stage8-reader-sql.mjs`.
  The password is deliberately absent; the provisioner sets it in-memory.
- `scripts/tendermatch-stage8-provision.mjs --apply-approved`: attested additive
  transaction; refuses existing Stage 8 objects instead of overwriting.
- `scripts/build-tendermatch-stage8-function.mjs`: secret-free esbuild 0.28.1 /
  fflate 0.8.3 bundle, using `NEON_STAGE8_TOOL_ROOT` for the installed Neon CLI's
  dependencies. No project lockfile/dependency update.
- `scripts/tendermatch-stage8-deploy.mjs --deploy-approved`: exact-source-hash check
  and explicit dev multipart publication; `--status` is read-only.
- `scripts/tendermatch-stage8-db-check.mjs` and `...-hosted-probe.mjs`: real
  credential/probe evidence without printing bearer or connection values.

Rollback is **not executed**: after separate bounded rollback authority, first
disable/remove this exact dev Function or invalidate its owner sessions; then run
`rollbackViewSql()` inside an attested owner transaction. It revokes membership,
drops the 24 named views, schema and the two new roles without CASCADE. Any new
dependency must stop rollback. Do not drop/alter earlier tables or reused project
keys; revoking the project key is its own explicit decision.

## Actual evidence and corrections

Evidence: `docs/evidence/tendermatch-stage8-hosted-{db,deployment,probes,final}.json`.
The deployed probe made **25 serial requests / 60 assertions**. Authenticated health,
both page directions, continuation, max 100 and selected-pair detail passed.
Unauthorized/expired/wrong-tenant/wrong-pin/CORS/malformed-limit/forged, expired and
cross-focus cursor requests were denied. A full representative tender traversal
returned 105 unique candidates; supplier probes covered the first two 100-row pages,
not the complete 2-million-pair universe. Maximum response: **160,165 bytes**.
Eleven successful samples: **168–1,777 ms**, median **270 ms** (Windows to Frankfurt).
These are small probes, not a load, saturation, cold-start or availability SLA.

1. Selected-pair detail timed out through new security-barrier views → query
   planning/lookup layer → the original unrestricted join plan performed excessive
   work → hosted connector substitutes a pinned, one-row materialized lookup plus
   LATERAL Formula point lookup → preserve isolation and fix the query, not the
   timeout → actual indexed SQL and 28-pair synthetic exact-result equivalence.
2. A plan-name assertion expected only the directional index → security-barrier
   planner legitimately selected the composite primary key plus focus-local sort →
   validate indexed focus-bounded actual rows, no Formula sequential scan, and <5s
   execution instead of one index spelling → measured EXPLAIN plans retained.
3. Neon metadata returns environment names, not values → a probe incorrectly
   expected secret values → verify metadata names plus fail-closed runtime equality
   on the exact deployed hash → authenticated deployed health and negative tests.

Older Stage 8/10 ledgers remain historical evidence. The Stage 10 guard explicitly
allows only the new standalone hosted contract and its two additive SQL projections; every earlier algorithm,
frontend and migration remains protected byte-for-byte. Full validation totals are
recorded in the final evidence summary rather than inherited from prior stages.

## Runtime/cost limitations and next gate

Two admitted DB transactions/pool connections per isolate; role cap 3 across
isolates, five-second connect/statement bounds, 6.5-second client query wait,
20-second between-statement admission deadline, 512 KiB response ceiling. Connections
are discarded after transactions to avoid retaining broken transactions and idle
DB sessions. Session rate limiting is 120/minute **per isolate**, not distributed.
No public abuse/load test or billing hard cap is claimed. Owner sessions expire;
production IAM, audit retention, distributed throttling and operational monitoring
remain unimplemented.

Neon Functions are beta; their documented memory is fixed at 2 GiB and their
default account concurrency limit is 100. The existing plan/database compute billing
continues; no plan/compute/billing increase, AI call or purchase was made. Function
publication does not prove zero hosting cost or an enforced spend ceiling. See
[Neon runtime limits](https://neon.com/docs/compute/functions/reference/runtime-limits)
and [Function deployment](https://neon.com/docs/compute/functions/deploy).

**Next safe decision: Stage 9 authenticated frontend integration**, with its explicit
audience/session/CORS/human-workflow contract. Not implemented in this stage.
No Firebase deployment, public UI change, push, merge, source refresh or AI/TORS.

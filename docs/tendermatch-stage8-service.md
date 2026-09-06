# Stage 8 authenticated sealed-pipeline service boundary

This is a locally validated, additive server adapter for `agent:TL-A031`, not a
deployed service or a frontend change. Selected base is Stage 7 pre-owner commit
`23560646a3e2734d301d4ac88e5ee000f3a9a7dc`. Existing local/static routes retain their
old contracts. No external provider/model is configured or called by this layer.

## Authority and dependencies

The original all-to-all population remains authoritative: 2,027,961 eligibility
outcomes; 707,660 Formula/ranking candidates; 1,320,301 unscored outcomes; 24,007
positive retrieval rows; 28,034 shortlisted pairs (18,531 review, 9,503 audit).
These are the prior sealed evidence identities, not a new Stage 8 Neon readback.
Stage 7's expected 500 automatic review intents remain a separate owner/persistence
gate. A migration marker alone is insufficient to make this service available.

The factory requires explicit tenant pins, authentication sessions, signing key,
allowed origin and database connector. There is no implicit latest run, login,
credential discovery for users, public listener or legacy/static fallback. The
disconnected entry command is `node scripts/tendermatch-stage8.mjs`.

`createApprovedNeonStage8Store` is a guarded future constructor only. It reuses the
existing results-only target guard, requires the existing `--execute-approved` and
three exact target attestations, and does not open a connection merely by being
imported. No call to this constructor with approval was made in Stage 8. This name
does not authorize model execution. Its connector only opens the isolated result
database as the pre-existing restricted writer, never a source connection.

Every transaction checks all required 060/070/080/090/100 markers and tables,
restricted non-superuser/non-BYPASSRLS role, exact plan identity, plan code and
allocation hash, all Stage 3–6 completion/run/policy hashes, unchanged Formula and
retrieval method versions, and complete expected automatic-request population.
Missing tables return `PINNED_SCHEMA_UNAVAILABLE`; missing markers return
`REQUIRED_MIGRATION_UNAVAILABLE`; missing/incomplete plan returns
`PINNED_PIPELINE_INCOMPLETE` or `PINNED_PIPELINE_IDENTITY_MISMATCH` (HTTP 503).
The returned `bindingId` is a hash of the explicit complete pin and service version.
Clients must obtain the approved binding from trusted application configuration,
not from a latest/default discovery endpoint.

## HTTP contract

Prefix: `/api/tendermatch/all-to-all/v1`. Every request requires
`Authorization: Bearer <server-provisioned-opaque-session>` and an explicit
`binding=<approved-binding-id>` query parameter. Authentication precedes any DB
access. Requests cannot supply tenant or actor. Unknown or duplicate parameters,
duplicate security headers, malformed IDs and wrong methods fail closed.

| Operation | Route after prefix | Additional requirements |
| --- | --- | --- |
| Dependency status | `GET /health` | `read` scope; no full data dump |
| Supplier-focused ranked candidates | `GET /suppliers/:supplierId/results` | `read`; optional `limit` and `cursor` |
| Tender-focused ranked candidates | `GET /tenders/:tenderId/results` | `read`; optional `limit` and `cursor` |
| Selected original pair | `GET /pairs/:supplierId/:tenderId` | `read`; includes noncandidate original outcomes |
| Record attributed intent | `POST /intents` | `request-review` or `request-audit`; origin, CSRF, idempotency |
| Existing request and bounded job references | `GET /intents/:requestId` | `assessment-read`; max 10 jobs plus `moreJobs` |
| Any explicit future job | `GET /jobs/:jobId` | `assessment-read`; current pinned input and schema/prompt |
| Any explicit future validated artifact | `GET /artifacts/:artifactId?jobId=:jobId` | Also `binding`; explicit successful matching job |

All scopes also require `read`. Artifact and job IDs must be known explicitly;
there is no implicit latest artifact. If more than ten jobs reference a request,
the response flags this and individual known job IDs remain queryable. There is
no full-matrix route, bulk export, queue mutation, execution grant, provider
activation, human-disposition write or frontend integration.

List limit defaults to 25 and has a hard maximum of 100. Ordering is original
retrieval units descending, then opposite canonical UUID ascending. The HMAC-SHA256
cursor has a 15-minute expiry and binds service version, tenant, complete pin,
direction and focus ID. Its payload contains only ordering identities, not source
evidence. Tampering, noncanonical signature encoding, expired or cross-scope cursor
use is rejected. A previous run remains readable only when explicitly configured
with its own tenant pin; the current factory configures one approved run per tenant.

## Independent dimensions and truthful absence

`formula` returns stored Formula v1.1 Pair Score, fixed denominator 100, Data
Coverage, Assessed-only Fit, Evidence Confidence, criterion states/fit/points/max,
and deterministic main limitation. Detail expands only the existing frozen
per-criterion evidence references and limitations; lists do not download source
projections. No new scoring or evidence extraction is performed.

`retrieval` is the unchanged deterministic lexical/structured relevance, not a
Formula score. Semantic similarity remains null/Missing. `shortlist` and
`escalation` retain separate tiers, reasons and omissions. A zero retrieval value
is measured zero, not Non-match. Missing criterion fit remains null while its
contribution is zero. Outside-Formula and other ineligible original pairs return
their original eligibility state, null unscored Formula/ranking dimensions and a
nonrequestable state; they are not assigned zero scores.

`executionAuthorization` explicitly says the response grants no authority and has
not loaded actual authorization. It does not falsely assert that a future job
cannot have its own separately issued grant. `aiTors` is not loaded in list/detail;
only explicit job/artifact routes can return a validated advisory artifact.
No route creates one. Full TORS section-level missingness/confidence must never be
relabelled Formula Evidence Confidence.

`humanDisposition` is null with
`UNAVAILABLE_NO_COMPATIBLE_VERSIONED_HUMAN_CONTRACT` and `HUMAN_ONLY` authority.
Existing disposition tables reference legacy evaluation/pair identities, not these
sealed Stage 3–7 keys. Importing old decisions or inventing `pending` would claim a
workflow state that does not exist. A later separately authorized human workflow
needs an additive versioned contract; no new DDL is necessary to represent truthful
absence in this read service.

## Intent is not authority or queued work

POST JSON has exactly `supplierId`, `tenderId`, `kind`, `justification`. `kind` is
one of `USER_REVIEW`, `REPORT_REQUEST`, `AUDIT_REQUEST`. Justification is 3–2,000
characters, attributed to the verified session subject. It is a user assertion,
not evidence. Require an exact configured origin, separate session-bound
`X-CSRF-Token` and `Idempotency-Key` of 8–128 allowed identifier characters.

Audit-only rows require `AUDIT_REQUEST` and the audit scope. They are not upgraded
to promising or automatically AI-ready. An original candidate outside the stored
shortlist remains openable and explicitly requestable; its omission/zero values
are retained. On-demand requests freeze only existing Stage 4 projections and the
unchanged Stage 7 prompt/schema/input identity, and insert only `escalation_request`.
The receipt says recorded, no execution authority, zero queued executions and zero
model calls. This is not an accepted/queued model job.

The same tenant+plan+verified actor+idempotency key reuses the exact immutable
request when body and frozen input match. A changed body returns 409. The existing
Stage 7 unique tenant+plan+pair+kind key also prevents duplicate kinds, including a
different actor/key; that conflict is explicit, not an overwritten request.
An advisory transaction lock shares the exact 100-migration serialization domain.
The existing durable global caps remain 500 automatic and 100 on-demand intents
per plan (all users combined), not per process/session. A 101st new on-demand intent
returns `REQUEST_BUDGET_EXHAUSTED`; existing exact requests still reuse at the cap.
Changed upstream identity requires an explicitly configured new run/pin. Unchanged
frozen assessment input retains Stage 7's cross-plan versioned job reuse; this API
does not request or execute that reuse automatically.

## Resource and trust boundaries

Server-provisioned bearer/CSRF tokens must each be independently cryptographically
random (at least 256 bits), are distinct, and expire within 24 hours. The registry
stores hashes, bounded principal metadata, expiry and counters, not plaintext
tokens. Server-side revocation and 120 requests/session/minute are supported.
This is not an IdP, login/refresh flow, multi-instance distributed rate limiter,
credential storage service or public TLS termination. Those remain integration
gates before exposure. Do not persist tokens in browser/static data or logs.

Maximums: 1,000 configured sessions/tenants, 2 in-flight DB transactions (fixture
uses 1), 8 accepted HTTP connections, 32 headers, 8 KiB header/body limits, 512 KiB
response, 5-second request/header/per-statement deadlines and 1-second keepalive.
The inherited guarded Neon connector separately caps connect wait at 15 seconds;
no Neon/cold-connect latency was measured. No unbounded transaction wait queue is
maintained. A busy adapter returns 503; clients may retry reads, and intents only
with the original idempotency key. Statement cancellation/connection failures are
rolled back and capacity is released. No end-to-end production latency SLA is
claimed; the 5-second statement bound is not a 5-second whole-transaction promise.

The trusted server chooses the tenant and sets transaction-local RLS context.
Read routes use `BEGIN READ ONLY`; only attributed POST uses a write transaction.
Queries are parameterized; interpolated direction/table names are closed constants.
The development writer is never a browser/user credential. RLS protects database
tenant access under trusted service context, while session authentication and
server-derived tenant protect end-user access. Arbitrary SQL access to the trusted
writer would bypass that end-user boundary and must never be exposed. A separate
read-only service role could be added under a future owner gate; current read
transactions are read-only but reuse the installed writer connection.

Pages materialize at most `limit+1` original ranked candidates through existing
`ranking_pair_supplier` or `ranking_pair_tender` indexes. Per-row lateral Formula
lookups with `LIMIT 1` prevent a global Formula hash-join scan. Overlay reads are
at most 101 rows using existing decision indexes; detail fetches two frozen
projections. Marker/header validation incurs round trips each request instead of
silently caching unavailable dependencies. Actor/idempotency and job correlation
lookups are bounded by the existing 600-request per-plan cap. No index/extension or
owner migration beyond the already prepared 100 is added by this stage.

Responses use no-store, nosniff, no-referrer, restrictive CSP and noindex headers.
Errors expose stable codes, not SQL, evidence, credentials or raw provider errors.
No application request logging is installed; future observability must retain only
safe correlation IDs/codes. No browser CORS grant, cookie session or cross-origin
credential support is silently enabled.

## Reproduce locally; future installation gate

Use the explicitly installed isolated PGlite runtime directory in
`TENDERMATCH_PGLITE_ROOT`, then run:

```powershell
node scripts/benchmark-tendermatch-stage8.mjs
$env:TENDERMATCH_STAGE8_EVIDENCE='1'
node --test tests/tendermatch-stage8-service.test.mjs
```

The benchmark creates and closes an isolated in-memory PostgreSQL database, serves
only an ephemeral loopback HTTP listener, generates short-lived random fixture
sessions, verifies real SQL/HTTP behavior, and writes sanitized local evidence.
It does not touch Neon. Test-only future artifact fixtures are explicitly synthetic;
they are not evidence of real model quality or cost.

For a later approved target integration: independently verify the 100 owner action,
run the guarded Stage 7 execute/replay/independent audit from its runbook, validate
exact expected plan/request hashes, and then construct the Stage 8 store with the
approved pin. Supply actual server sessions/signing key/origin through a reviewed
server auth integration and mount the factory only under separate listener/exposure
authority. Start with authenticated read-only dependency/detail probes. Do not
record Neon user intents merely to make the service appear active. No Stage 8
SQL action is pending; 100 and the Stage 7 persistence audit remain the only current
data gate. Source databases, model activation, frontend and deployment stay out of
scope.

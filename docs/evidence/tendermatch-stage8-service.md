# Stage 8 local service evidence

## Identity and scope

Selected base: Stage 7 pre-owner local checkpoint
`23560646a3e2734d301d4ac88e5ee000f3a9a7dc` on
`codex/tendermatch-neon-all-to-all`, isolated worktree
`C:/CodexWork/tendermatch-neon-all-to-all`. That checkpoint contains exactly 17
additive Stage 7 files and does not claim owner installation or Neon persistence.
Fresh all-remote fetch/prune after that commit confirmed origin/main
`d230590cf5ee99a679f162b2e3a19b65752c0f16`, ahead 13/behind 0, no upstream and clean
starting state. Relevant retrieval-ranking, business, enterprise and release
worktrees were inspected, unchanged and preserved. No merge/reset/checkout occurred.
This report is selected local source/fixture evidence, not current deployed evidence.

Canonical owner remains `agent:TL-A031`. The scoring-governor skill preserved the
unchanged Formula/missingness/authority boundaries; release-identity reconciliation
selected the safe checkpoint; real-Agent development governance required actual
local empirical HTTP/SQL tests and the correction ledger below. No Overview or
frontend was introduced, so rendered Overview acceptance is not applicable.

Final service code identity (canonical LF):
`1a03e219e5530a67441107acbd4f68846f9c3395eb7a8c028e862b9702809fea`.
The machine-readable benchmark binds all four production files, benchmark script
and local fixture. An evidence regression test checks code binding and guarded
query/result invariants. Source Formula/ranking/shortlist/Stage 7 implementation and
100 SQL are unchanged by this stage.

## Result and compatible reuse

Implemented an independent Node HTTP/service factory with explicit authentication,
tenant pins, read/intent/assessment scopes, server-derived attribution, CSRF,
idempotency, hard bounds and signed focus/version cursors. Routes cover supplier and
tender ranking pages, exact selected original pair detail, three explicit user
intent kinds, existing request/job status and an explicitly selected validated
artifact. No full-matrix response or implicit latest/static fallback exists.

Existing local API/auth/assessment paths were inspected. They use in-memory legacy
pair identities, disabled providers and same-origin checks, not this sealed durable
contract or end-user authentication. They remain untouched. Existing 060–100
relations and indexes are sufficient; new owner DDL is **zero**. Human disposition
has no compatible sealed identity FK domain, so the service truthfully returns
unavailable/null rather than importing old decisions or manufacturing pending.

Stage 7 owner installation/persistence is still pending at this report's checkpoint.
The actual missing-schema fixture returns 503 `PINNED_SCHEMA_UNAVAILABLE` with no
fallback. A missing marker, incomplete/absent plan, altered expected completion,
wrong tenant, incorrect binding or privileged backend role also fails closed.
No Stage 8 Neon readback, persistence, network latency or deployed availability is
claimed. The prior sealed 707,660 ranking/Formula rows and 2,027,961 original outcomes
are configured by their exact historical hashes, not regenerated here.

## Empirical local PostgreSQL and HTTP evidence

`docs/evidence/tendermatch-stage8-benchmark.json` is an actual isolated PGlite/HTTP
run, explicitly **synthetic local, not Neon**. Bootstrap used the existing real SQL
migrations/guards and Stage 3–7 algorithms over 12 suppliers × 120 tenders. It
produced 1,440 candidate rows, 604 shortlist/decision rows, one plan and 80 automatic
intent fixtures. All state disappeared when the isolated in-memory database closed.

156 HTTP calls produced 155 successful responses and one expected 409 budget
rejection. The service inserted 100 explicitly attributed local user-review intents,
including one original candidate omitted from the stored shortlist. Total local
requests were 180. The 101st new on-demand request was denied; the existing exact
request reused successfully both before and after reaching the cap. Local grant,
job and artifact counts remained **0 / 0 / 0**. Full content digests and counts of
eligibility, Formula, ranking, shortlist and escalation-decision fixtures matched
before/after. No scoring, retrieval, tier or nomination data was modified.

| Local HTTP operation | Samples | Median ms | p95 ms | Maximum ms |
| --- | ---: | ---: | ---: | ---: |
| Supplier page (25/100 mix) | 12 | 92.83 | 109.36 | 109.36 |
| Tender page (25/100 requested) | 12 | 81.35 | 84.70 | 84.70 |
| Selected detail | 8 | 84.05 | 87.82 | 87.82 |
| Attributed intent insert | 100 | 92.95 | 129.23 | 367.74 |
| Existing request status | 8 | 75.10 | 80.02 | 80.02 |

Bootstrap: 23,039 ms. Maximum response: 170,522 bytes, below the 524,288-byte cap;
total response bytes: 1,775,855. HTTP work made 1,968 DB queries with 2,725,991 bytes
of DB row responses and a 62,577-byte largest DB rowset. At most 14 DB queries per
HTTP operation includes transaction setup, dependency checks and guarded intent
checks; Neon round-trip/cold-connect overhead remains unmeasured. The complete
supplier/tender traversals returned exactly 120/12 unique ordered rows without
duplicates or omissions, including stable zero-relevance ties.

Combined local HTTP+PGlite process RSS was 86,941,696 bytes initially and
515,522,560 bytes after fixture construction. Observed HTTP high-water RSS did not
exceed that already allocated baseline. This is not zero service memory use or a
production RSS estimate; PostgreSQL WASM/bootstrap allocation dominates and GC
variance is substantial. Earlier experimental runs showed a ~22.5 MB incremental
HTTP high-water increase. There is no full matrix in the production service heap.

## Natural query plans and storage

No planner flags were forced. First supplier page used `ranking_pair_supplier`,
26 bounded ranking rows, pinned-member index probes and 26 one-row Formula index
lookups: 4.116 ms EXPLAIN execution. Late supplier page used the same ranking index
through BitmapOr and five Formula lookups: 1.953 ms. Tender first/late pages used
`ranking_pair_tender` with 12/1 rows and single-row Formula lookups: 1.106/0.850 ms.
The small 132-row entity-member table legitimately uses a sequential scan in some
natural plans; no global ranking or Formula matrix scan is present in these final
plans. Full JSON EXPLAIN/BUFFERS plans are retained, including loops/row counts.

Local relation totals (heap plus indexes/TOAST): ranking_pair 1,982,464 bytes;
escalation_plan 32,768; escalation_decision 1,007,616; escalation_request 1,507,328.
These are fixture storage measurements, not Neon size growth. Stage 8 creates no
new table/index. Intents reuse the original Stage 7 input-size and global request
caps. A full-population real Neon API benchmark remains a post-install gate.

## Security and semantic regression coverage

Tests exercise actual HTTP backed by local PostgreSQL for authentication before DB
access, tenant RLS denial, read scope, server-derived actor, audit-only guard,
USER_REVIEW/REPORT_REQUEST/AUDIT_REQUEST, CSRF/origin, exact idempotent reuse/conflict,
selected list/detail parity, outside/null vs measured zero vs missing-fit null,
pagination, forged/cross-focus cursors, injection, excessive/duplicate parameters,
absent matrix route, missing schema/marker/plan and altered completion identity.
Separate boundary tests cover expiry/revocation/rate limits, direct adapter page
bounds, capacity exhaustion/release, ambiguous security headers, malformed/oversized
bodies, response caps and suppression of secret-like internal error messages.

A dedicated local test creates a clearly synthetic future completed artifact through
the existing Stage 7 fixture worker, then verifies authorized explicit job/artifact
reads and wrong-job denial. That test stub is not an external model or real TORS
assessment. The service factory has no provider/queue/grant write path. Unknown
token/cost usage in that stub remains null. Actual external model calls, tokens and
cost across Stage 8 are **0 / 0 / 0**; source and Neon connections are **0 / 0**.

## Correction ledger

| What happened | Root cause | Correction | Reusable rule | Regression evidence |
| --- | --- | --- | --- | --- |
| Initial test module could not load despite strict TS compile passing. | Node strip-types does not transform TypeScript constructor parameter properties. | Explicit class fields/assignments. | Compile and execute the actual runtime path. | Focused HTTP/SQL test module loads and passes. |
| Cursor decoder accepted decoded bytes without canonical text validation. | Base64url trailing bits can have multiple text spellings. | Require round-trip canonical signature text before constant-time MAC compare. | Authenticate canonical encodings, not only decoded bytes. | Tamper/scope/expiry regression tests. |
| A small supplier page caused a whole Formula-table scan. | Planner selected a global hash join after the bounded page CTE. | Correlated lateral single-row Formula lookup barrier. | A response limit does not alone prove bounded downstream SQL work. | Natural first/late plans and no-Formula-seq-scan assertions. |
| A blanket `authorized:false` could misdescribe a future separately authorized job. | Response authority and actual loaded authorization were conflated. | No authority granted; actual authorization explicitly not loaded. | Unknown authorization is not a negative fact. | Independent response fields and explicit status routes. |

## Validation and handoff

Full `npm test -- --runInBand` passed **604/604 tests, zero skips/failures**, with
all Stage 4–8 applicable evidence flags and isolated PGlite enabled. Node test time
was 57,153.3711 ms, excluding build time. All three builds passed and generated 64
Agent Specifications. Full `npm run lint`, scoped ESLint, strict TypeScript and
staged whitespace checks passed. Existing build warnings remain large chunks,
vinext CSS filename conflict, unknown route classification and plugin timings;
none prevented completion. The new production/evidence secret-pattern scan had no
matches. Final fetch/prune and relevant parallel-worktree checks repeated the exact
unchanged identities above. Machine-readable summary:
`docs/evidence/tendermatch-stage8-validation.json`.

Stage 8 implementation and public contract are in
`docs/tendermatch-stage8-service.md`; required post-install sequence remains the
Stage 7 owner runbook and independent audit. Authentication credential provisioning,
IdP/TLS/listener integration, multi-instance rate limits, live latency and a future
human-disposition contract are explicit remaining integration work, not secretly
enabled features. There are no source writes, vectors/models, frontend/static
changes, push/merge/deploy/publish actions.

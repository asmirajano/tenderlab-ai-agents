# Post-Stage 7 interface/service integration plan

Planning only, requested by the orchestrator while the Stage7 owner gate is handled.
No service, frontend, static export, API deployment or provider is changed here.
The orchestrator subsequently authorized the Stage 7 pre-owner checkpoint commit
and a bounded Stage 8 local service implementation while owner confirmation remains
pending. Stage 7 Neon integration still requires installed schema, persistence and
independent audit. The 100 migration alone does not authorize deployment or models.

## Current integration state

`scripts/serve-tendermatch-local.mjs` exposes existing runtime, pairs, pair and
assessments routes. It constructs an in-memory pair service and reports provider
disabled. Its assessments POST queues only the existing local disabled-state model
and reports zero calls. Same-origin JSON checking is present; it is not a tenant
authentication/authorization system. Do not mistake this server for the new durable
all-to-all pipeline or silently swap its legacy identities.

`scripts/lib/tendermatch-pair-service.mjs` uses `LocalAssessmentQueue` from
`selective-assessment.ts`; old assessment schema/identity differs from the Stage7
evidence schema and sealed Formula/ranking/shortlist keys. Keep that local/static
path compatible until a deliberate versioned adapter is tested. Never migrate old
records by manufacturing sealed Formula rows or by relabelling old artifacts.

## Proposed bounded service boundary

| Service operation | Existing Stage7 primitive | Required authority and identity |
| --- | --- | --- |
| Read request/status page | queryRequests | Authenticated tenant, explicit plan, supplier/tender focus, max100 and scope-bound cursor |
| Read candidate detail | selectedEscalationPair | Explicit plan and supplier/tender IDs; independent original dimensions |
| Record on-demand review/report/audit intent | onDemandRequest | Server-derived actor/tenant, attributed request ID/justification, CSRF protection, explicit audit-kind rule, request budget |
| Read execution status | queryJobs | Explicit authorization ID, authenticated role, bounded job-ID pagination |
| Read a validated advisory artifact | selectedArtifact | Explicit job+artifact IDs and verified successful matching job |
| Issue execution authority | No ordinary writer API | Separately scoped owner/operator approval with provider/model/version/caps/expiry |

Use a new explicitly versioned service contract, not a backwards-incompatible
replacement hidden under the old response shape. The exact route names are a later
API design choice; none is implemented by this plan. Fetch one selected detail on
demand rather than sending all evidence projections in a list response.

Every response should carry schema version, tenant-safe context, explicit plan and
upstream run identities, policy/code/input identities, source mode, generation time
and truthful capability state. Return a structured absence (`NOT_LOADED`, `MISSING`,
`NOT_REQUESTED`, `NOT_AUTHORIZED`, `PROVIDER_UNCONFIGURED`) rather than numeric zero
for information not computed or not loaded. The response must never flatten
eligibility, Formula score, coverage, confidence, retrieval, shortlist, escalation,
authorization, queue state, Full TORS and human disposition into one status/score.

## Authentication and least privilege before exposure

Do not ship direct Neon credentials, trusted-service tenant GUCs or writer access
to a browser/static bundle. Derive tenant and actor from a verified server session;
reject client-supplied tenant/actor overrides and cross-tenant IDs. Retain parameterized
queries, explicit run binding and bounded cursors. Separate read-only consumer
credentials from intent-writing credentials if a real application reader is added;
new roles/privileges require their own owner action gate. Current service RLS alone
does not prove end-user isolation.

A later API should map malformed input to400, authenticated absence to404 as
appropriate, forbidden audit/tenant actions to403, version/idempotency conflict to409,
and exhausted request budgets to a stable conflict/rate-limit response. Log safe
request/correlation IDs and error codes, never raw evidence or provider credentials.
Authentication, CSRF, request-size/time limits and rate limits must be tested before
any public deployment. Read-only routes must not enqueue or authorize work.

## UI semantics, only if separately authorized later

List views should initially display the selected context and independent Formula,
coverage/confidence, retrieval relevance and shortlist tier, with clear missingness.
Drill-down may show nomination/escalation reasons, omissions and frozen evidence.
An audit tier is labelled audit-only, not promising or AI-ready. A recorded request
is visibly distinct from authorized/queued/executed work. The current provider state
must say unavailable with zero executions; do not show simulated progress or a fake
Full TORS artifact. An omitted original candidate remains openable and explicitly
requestable under the on-demand policy.

Human disposition stays in its separately authorized workflow. Viewing an artifact
does not approve a supplier, establish compliance, change Match status or write a
human decision. Any future human action must preserve actor/revision/time/rationale
and never overwrite sealed machine-derived dimensions.

## Provider gate stays independent

A later executable provider requires an explicit adapter, validated identity and
server-side credentials, privacy approval for the exact frozen evidence, provider
idempotency, transport/timeouts, tokenizer/pricing if estimates are shown, a bounded
owner grant and a separately authorized small real-case experiment. Synthetic test
success does not authorize a call or establish Full TORS quality. Use the durable
lease/dispatch boundary and validated artifact path; never populate all500 intents
simply to make a dashboard appear complete. Unknown outcomes remain terminal until
explicitly reconciled; do not bypass reuse by changing a version label arbitrarily.

## Acceptance sequence for the next implementation handoff

1. Redo Git/worktree and sealed Neon identity reconciliation; confirm Stage7 final
   commit and exact persisted plan/request hashes. Preserve parallel work.
2. Select the intended local or deployed service and its actual release identity;
   document why its old/static schema cannot serve as the sealed data authority.
3. Add read-only versioned contracts first, test exact list/detail parity, all
   independent signals, missing/zero semantics, bounded pagination and tenant denial.
4. Add intent-writing only when authenticated actor/tenant and request-budget
   authority are approved; test duplicate/repeated/competing requests, audit-only
   triggers, omitted candidates and stale version errors. No provider call is implied.
5. If frontend work is separately authorized, integrate these contracts without
   altering original scoring or existing static compatibility. Test realistic
   supplier/tender pages, detail, empty/absent states, accessibility and responsive
   views; follow the required real-Agent Overview contract where a new Overview is
   actually in scope.
6. Run full repository tests/build/lint, independent state checks, least-privilege
   and browser/network evidence. Commit locally and stop for review. Provider
   activation, owner DDL and push/merge/deploy/publish remain separate gates.

## Post-install Stage7 commands, not yet executed at this checkpoint

The exact commands and owner empty-table verification are in
`docs/tendermatch-stage7-owner-runbook.md`. In order: guarded `execute`, read-only
`replay`, independent read-only `verify`, then final tests/commit. Only `execute`
inserts the bounded Stage7 intents/decisions; none of these commands calls a model
or creates execution grants/jobs. The read-only validator checks every decision
and request, independent reference allocation, source reason SQL, installed trigger
bodies, protected upstream state, role privileges, focused queries and real size.

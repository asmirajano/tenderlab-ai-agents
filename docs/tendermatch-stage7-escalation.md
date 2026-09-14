# Stage 7 selective Full TORS orchestration contract

Owner: `agent:TL-A031`. Maturity: isolated, tested method and durable boundary;
not a deployed end-user workflow or an executed AI assessment. Stage 7 consumes
the sealed Stage 6 shortlist and original Stage 4/5 candidate evidence only.
It creates no replacement eligibility, score, ranking, shortlist or human decision.

## Independent dimensions

| Dimension | Authority and storage |
| --- | --- |
| Eligibility and Formula scope | Original deterministic Stage 3 outcome; unchanged |
| Formula v1.1 Pair Score | Stage 4, fixed denominator 100, including measured zeros |
| Data Coverage / Evidence Confidence | Original independent Stage 4 fields |
| Retrieval Relevance | Stage 5 lexical/structured relevance, not semantic or Formula score |
| Shortlist tier and nominations | Stage 6 review candidate or audit-only; unchanged |
| Escalation eligibility/reasons and omission | Immutable Stage 7 decision, not execution authority |
| Request intent | Attributed explicit trigger or versioned automatic policy |
| Execution authority | Separately installed, owner-issued bounded provider/model grant |
| Queue state and dispatch | Durable job, lease, attempt and event journal |
| Full TORS artifact | Validated advisory structured findings with exact evidence references |
| Human Disposition | Separate existing human workflow; never inferred or populated here |

Missing evidence is unknown, not incompatible fit zero. An outside-scope outcome
does not become a Formula candidate. Zero retrieval is not Non-match. No weighted
blend, quality threshold, Match decision, numerical AI/TORS score, or fabricated
assessment is introduced.

## Deterministic planning, not a quality claim

The entire 28,034-row shortlist is projected and hashed. Review-tier pairs may have
three independently visible reasons:

1. `TOP_DIRECTIONAL_NOMINATION`: supplier nomination rank <=5 or tender nomination
   rank =1, using Stage 6's explicit nomination rank—not a renamed Stage 5 rank.
2. `TIED_NOMINATION_DIMENSIONS`: a supplier or tender nomination tie group >1.
   This means ordering ambiguity, not a claimed contradiction in evidence.
3. `FORMULA_CRITERION_EVIDENCE_MISSING`: at least one missing Formula criterion.
   This is a reason to investigate a gap, not evidence of a promising fit.

No contradictory fact is invented; conflict detection awaits supported evidence.
All audit-only pairs are omitted automatically with
`ZERO_RETRIEVAL_REQUIRES_DISTINCT_EXPLICIT_TRIGGER`.

The chosen `balanced-500` policy orders suppliers by canonical UUID and visits
them round-robin. Within each supplier it compares reason priority (top, tie,
missing), retrieval units, Formula score, coverage, confidence, then tender UUID.
All signal comparisons are lexicographic and remain separately visible. The caps
are **500 overall, 10 per supplier, 2 per tender**. Unlike Stage 6 nomination caps,
these are hard final selected-incident caps. Remaining eligible pairs carry every
applicable global/supplier/tender cap reason. A reversed-input replay must match.

Measured alternatives were 250 (supplier5/tender1), 500 (10/2), and 1,000 (20/3).
The selected 500 covers all 99 review-tier suppliers and 377 tenders; actual maximum
incidence is 6 per supplier and 2 per tender. The 250 policy covers 98 suppliers;
1,000 doubles potential calls without adding a supplier. This is an initial workload
policy, not precision/recall calibration or approval to make those calls.

## On-demand intent

`selectedEscalationPair(client, plan, {supplierId,tenderId})` pins the explicit
plan and its original ranking run, profiles and Formula policy. It returns null
outside the 707,660 original Formula candidates; shortlist membership is optional.
Formula, retrieval, shortlist and decision values are separate. Human and AI output
are explicitly NOT_LOADED, never silently taken from a latest record.

`onDemandRequest(client, plan, ids, trigger)` accepts `USER_REVIEW`, `REPORT_REQUEST`
or `AUDIT_REQUEST` with actor, request ID and justification. A stored audit-only pair
requires `AUDIT_REQUEST`; audit is never automatically promising. Trigger text is a
user assertion, not evidence or execution authorization. Non-shortlisted original
candidates remain requestable. The 100 on-demand slots are separate from the 500
automatic slots, with one immutable request per plan/pair/kind. An exact repeated
request is reused; a competing different request cannot overwrite it.

## Frozen evidence and versioning

Reusable entity extraction reads only existing ranking_profile -> formula_input
projections. Each distinct profile is loaded once per prepared batch. A selected
pair envelope contains exactly its two frozen projections, their stable IDs, the
pinned identity, prompt and schema; no source connections or new inferred facts.
The real 500-intent plan extracts 476 distinct entity projections (99+377).
Full source documents, provenance credibility and legal/technical completeness
are not implied by the existence of these structured projections.

Plan identity binds code, policy, shortlist run, whole input population, allocation,
limits, prompt and schema. Every pair decision has its compact input hash. Request
identity binds plan, pair, trigger and evidence input hash. Assessment input excludes
rank, shortlist context and plan identity: only changed endpoint evidence or an
assessment method/prompt/schema change invalidates a cached assessment. Global cap
allocation can rebalance when one input changes, but this does not re-call AI for
unchanged evidence. Jobs are globally unique within a tenant by input hash plus
provider/model/prompt/schema contract. Prior plans and terminal jobs remain readable.
Terminal unknown outcomes do not disappear or silently become a fresh job.

## Durable execution boundary

There is no registered executable provider. Active existing server/static code
explicitly disables assessments; the existing provider interface is not an adapter.
Only synthetic injected providers run in tests. No credentials are loaded and no
external requests are made. A generic environment key would not create an executable
or authorized provider. Current actual calls, input/output tokens and cost are zero.

Request creation never creates authorization or a job. An owner-issued authorization
must explicitly name plan, actor/rationale, expiry, provider/model/prompt/schema and
caps. Limits: <=600 jobs, <=1,800 reserved attempts, <=2 concurrent leases,
<=4,096 output tokens per attempt. No execution grant is part of the 100 migration.
The future provider adapter must enforce its authenticated provider identity,
idempotency key, token limits and abort signal; no such adapter is supplied here.

`enqueueAuthorized` requires both the matching injected executable adapter and an
owner grant. `claimJob` uses row locking/SKIP LOCKED, serializes grant budgeting,
reserves an attempt and provides a <=60-second lease. An atomic dispatch timestamp
permits at most one dispatch per lease. It rechecks live authorization and lease
before calling. A stale/cancelled lease, duplicate dispatcher or expired grant cannot
dispatch. Reserved attempts are an upper bound, not a claim of actual model calls.

Jobs are QUEUED, LEASED, RETRY_WAIT, FAILED, CANCELLED or SUCCEEDED. At most three
attempts are allowed. Confirmed retryable failures use bounded exponential backoff
(1–300 seconds allowed by SQL). An undispatched expired lease may be reclaimed;
a dispatched expired lease or unknown provider outcome becomes terminal FAILED.
No automatic retry follows an uncertain call. Cancellation records operator intent;
it cannot guarantee cancellation of an already dispatched remote call. An adapter
must honor a 45-second abort signal, while the durable lease bounds accepted results.
Safe error codes only are persisted; raw provider errors/credentials are not stored.

`persistValidatedArtifact` validates before persistence, then atomically commits the
artifact and successful job under the still-current lease. SQL independently checks
the output boundary and forbids orphan artifacts. Unknown usage remains null, not
zero. `selectedArtifact` requires explicit job and artifact IDs and a successful
matching job; there is no latest-result substitution.

## Full TORS output boundary

Schema `tendermatch-full-tors-evidence/2.0.0`, prompt
`tendermatch-frozen-evidence-tors/1.0.0`. The prompt treats evidence text as untrusted
data and forbids changes to original dimensions or automatic decisions.
Seven ordered sections are required: technical, capacity, experience, geography,
financial, compliance and evidence_gaps. Every finding has statement, independent
SUPPORTED/MISSING/CONFLICTING state and supplied evidence IDs. Supported requires
at least one reference; conflicting requires at least two distinct references.
Every artifact includes summary, limitations, advisory-only authority and required
human review. Numerical score fields and unexpected dimensions are rejected.

Limits: 131,072 input/output bytes, 7 sections, 1–20 findings per section, 1–30
limitations, 4,000 characters per statement and <=30 distinct references per finding.
Validation proves shape and reference membership, **not semantic truth or evidence
credibility**. No model output has yet been assessed for quality and no real Full
TORS artifact exists. The name denotes a complete required section contract, not
proof that missing financial, compliance or comparable-contract facts are available.

## Security and bounded queries

Seven additive RLS tables, prior schema/data untouched. Writer has SELECT on all;
INSERT only on plan, decision, request, job and artifact; column-limited state UPDATE
only on job. Writer cannot grant execution, forge events, delete/truncate, change
identity/history, perform DDL or bypass tenant policies. Non-job rows are immutable;
plan decisions seal in the plan's creation transaction with full-population validation.
A narrowly scoped definer trigger journals job state/revision with a fixed search
path and tenant check; direct function and event insertion privileges are revoked.
RLS uses the existing trusted-service tenant GUC. This is not end-user authentication,
and possession of service credentials is privileged; no public API is deployed.

`queryRequests` requires plan + supplier/tender focus, default25/max100, scope-bound
keyset cursor. Separate supplier/tender B-tree indexes support this contract. State
is explicitly RECORDED with authorization NOT_IMPLIED. `queryJobs` requires explicit
authorization ID and bounded job-ID pagination. The job-ready index supports grant
and state filtering; actual production job-index behavior awaits nonempty authorized
work. No client can request an unbounded endpoint through these query helpers.

Read-only simulation materializes 28,034 compact decisions, not 707,660 model inputs.
Storage is append-only and bounded per plan, not globally retention-limited. Future
retention, owner grant revocation UI, live API authentication, provider integration,
semantic validation and quality calibration need separately reviewed work.

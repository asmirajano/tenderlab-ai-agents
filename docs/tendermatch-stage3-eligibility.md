# Stage 3 — full-universe eligibility and Formula scope

Development-only TL-A031 experiment. Source inventories, the deployed frontend,
Formula v1.1 and prior Stage 0/1/2/2A evidence are unchanged. This is not a
release candidate, canonical classification, Bid/No-Bid decision or scoring run.

## Input and authority contract

Explicitly selected base: `5a7f0a9124ada9053f5b1b466d79148cae6ccc16`, branch
`codex/tendermatch-neon-all-to-all`, worktree
`C:/CodexWork/tendermatch-neon-all-to-all`. Stage 2 manifest
`e928df5e6a432fa23c8ea95dbfbf1aee4f1c883646d5ed72fd2856d994102ac2`
contains 117 suppliers and 17,333 tenders: **2,027,961 intersections**.
The tender predicate remains exactly `status='OPEN' AND deletedAt IS NULL`.
There is no geography, deadline, score, readiness or sample filter.

The runner verifies every Stage 2 feature body, association and outcome hash,
and every Stage 2A readiness body and identity. It retains source classification
separately from provisional scope candidate, source evidence and readiness.
The candidate's evidence IDs resolve through Stage 2A claim/source/artifact
lineage. Source material has role AUTHORITATIVE_SOURCE for what was reported;
this does not turn an inferred/self-reported assertion into independently
verified evidence. No source values, profile pins or evidence statuses change.

Fresh source capture runs in separate repeatable-read READ ONLY transactions.
The complete IDs/versions/content hashes must equal the approved manifest.
Ordinary drift stops before eligibility persistence and requires the established
separate Stage 1 registration and Stage 2 normalization boundary (and Stage 2A
alignment for changed suppliers). Stage 3 never silently mixes those versions.
Source clocks and diagnostic past-deadline counts are not input changes.

## Versioned policy

- Schema: `tendermatch-eligibility-scope/1.0.0`
- Policy: `tendermatch-development-goods-works-scope/1.0.0`
- Preserved Formula identity: `tendermatch-match-formula/1.1.0`
- All outputs: `NOT_SCORED`. No pair score, Fit, points, coverage, retrieval,
  embedding, narrative, shortlist or human-disposition field is produced.

| Exclusive state | Meaning |
| --- | --- |
| OUTSIDE_FORMULA_V1_1_SCOPE | Known tender category is not Goods or Works, including Services, Consulting, Other, EOI, Prequalification and unrecognized non-null categories. This says nothing about commercial relevance. |
| NEEDS_EVIDENCE | Tender category, supplier profile or supported scope is missing, or a claimed hard restriction lacks adequate evidence. Never INELIGIBLE or zero. |
| SCOPE_NOT_DEMONSTRATED | Available supplier scopes do not demonstrate the supported tender category. Not proof of incapability, incompatibility or a hard exclusion. |
| CANDIDATE_ELIGIBLE_WITH_LIMITATIONS | An evidence-linked common Goods/Works scope supports later development experiments only. Source/provisional basis and unresolved compliance, requirements, verification and dates remain explicit. Not approval. |
| HARD_EXCLUDED | A structured, applicable legal restriction, debarment or explicit prohibition has exact independently VERIFIED SOURCE evidence and artifact linkage. No such structured evidence is present in this real run. |

Hard gate (`NOT_ASSESSED`, `UNRESOLVED`, `EXCLUDED`), scope relationship and
outside-Formula service potential are independent fields. Unsupported tender
scope retains the outside-Formula state even when a genuine hard restriction
also applies; the separate hard gate and reason preserve that exclusion.
Services/Consulting × evidenced service-oriented supplier signals retain
`POTENTIALLY_RELEVANT_OUTSIDE_FORMULA`: this is scope-level potential, not a
positive assessment of a particular tender or a consulting qualification.

Mixed suppliers are checked against each Stage 2A evidenced signal, not forced
into one category. These lexical signals remain provisional; the Goods/Works
compatibility types in the old Formula API are neither changed nor activated.
An additional bounded adapter still requires its own approved stage.
Absent compliance evidence is **not clearance**. Unverified risk wording is
**not debarment**. There is no name/ID/country/amount-based decision shortcut.

Deadline strings remain source timestamp-without-timezone values. The current
pin has no source timezone, so all pairs retain
`DEADLINE_TIMEZONE_UNRESOLVED`. No UTC offset is invented and the OPEN universe
is not reduced by an uncertain time comparison. Read-time database deadline
diagnostics are reported separately, never used as hard-eligibility signals.

## Persistence and version identities

The Stage 0 `universe_pair` has scoring-oriented states, conflates a scope
difference with ineligibility, and is bound to `evaluation_run`. Reusing it
would fabricate a scoring run or redefine ELIGIBLE. Five **additive** tables
therefore implement the permitted separate state/field approach; old tables
and their tests are preserved:

| Table | Stored result |
| --- | --- |
| eligibility_input | One compact immutable projection per changed normalized entity/readiness input; no raw source body. |
| eligibility_run | Full Stage 2/2A, schema/policy/code/input hashes, counts and explicit development maturity. |
| eligibility_member | Exactly one pinned input membership per entity per run, sealed at commit. |
| eligibility_pair | One immutable compact outcome per supplier input × tender input × policy; no score columns. |
| eligibility_completion | Complete universe count, ordered full-result hash and aggregate audit; inserted only after verified readback. |

Compact state/reason dictionaries are versioned in `eligibility-scope.ts`.
Integer state code 0 means **outside Formula**, not score 0. Numeric codes are
storage encodings only; consumers must decode them through this exact policy.

Entity key covers source version/hash, normalized feature key/body hash,
supplier readiness ID/body hash, scope/evidence references and restrictions.
Policy key covers schema, policy, dictionaries and Stage 3 implementation hash.
Pair identity is `(policy key, supplier input key, tender input key)`; the
exportable SHA-256 cache identity is derived from the same tuple. Overall
manifest/run timestamps are not per-pair invalidators. Run identity additionally
binds whole-manifest, normalization and readiness outcome hashes. An unchanged
run reuses all pairs; one supplier/evidence change invalidates 17,333 pairs;
one tender change invalidates 117. Their intersection is counted only once.
Changed policy/code invalidates all pairs. Prior results remain immutable.

Membership references the exact existing normalization snapshot. Composite
foreign keys enforce input identity/kind; complete-count checks and unique
pair keys prove every intersection exactly once. The completion hash is
independently recomputed by the runner over ordered IDs, input keys and all
outcome values; the database independently enforces cardinality. A failed or
interrupted batch leaves reusable immutable outcomes, never a false completion.

## Runtime and security

Only the existing `tendermatch_results_dev` database on
`dry-union-87553313` / `br-polished-boat-b1qddx0m` receives writes.
Migration `060-eligibility-up.sql` guards database, owner, development marker,
branch attestation and exact four-version base. `060-eligibility-down.sql` is
an operator-reviewed rollback plan only; it is not executed. No database,
role, credential, production permission or source contract is created/changed.

The existing writer inherits SELECT/INSERT only on the new ledger, owns no
objects and cannot UPDATE/DELETE/TRUNCATE/DDL. PUBLIC has no grants. RLS uses
the existing trusted-service tenant GUC; **not end-user authentication**.
Source credentials remain read-only and exact endpoint/database/role/TLS
guards are retained. No connection URL, password or raw-source document goes
into committed reports, app bundles or the browser. Console migration uses
the already authenticated owner session, not a newly issued credential.

Execution is a bounded server-side Node worker, at most 4,096 pair outcomes per
cache/write/readback batch; it never allocates the full matrix. Sources are
normalized once per entity in Stage 2; they are not queried for each pair.
No scheduler, asynchronous service or production frontend integration is claimed.
Transient serialization/deadlock failures retry an atomic query at most three
times. Authentication, constraints and ambiguous connection failures stop;
explicit idempotent resumption rechecks persisted keys. No unbounded retries.

## Runbook and review

```text
node --experimental-strip-types scripts/tendermatch-evaluate-eligibility.mjs plan
node --experimental-strip-types scripts/tendermatch-evaluate-eligibility.mjs inspect --execute-approved
node --experimental-strip-types scripts/tendermatch-evaluate-eligibility.mjs execute --execute-approved
node --experimental-strip-types scripts/tendermatch-evaluate-eligibility.mjs replay --execute-approved
```

Reuse the existing Stage 1 project/branch/endpoint and fresh Console-attestation
environment variables, plus `TENDERMATCH_TENDER_ENV_FILE` for the existing
read-only tender credential. Never use the writable generic `.env`.
`plan` is disconnected; `inspect` performs complete source/feature verification
and a discarded-write-sink full experiment; `execute` persists, independently
recalculates/readbacks, seals and reruns; `replay` does not insert results.
Only safe aggregate evidence is committed. The full matrix stays in results_dev.

Stage 3 completes at a clean local checkpoint and orchestrator review.
Formula scoring and Stage 4 are not authorized by completion.

Completed execution, performance, limitations and final validation are recorded
in [the Stage 3 evidence report](evidence/tendermatch-stage3-eligibility.md).
The implementation remains frozen at the report's code hash. Await Stage 3
review; do not infer permission to run Formula scoring from candidate states.

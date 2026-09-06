# Active task: Stage 3 — Full-universe hard eligibility and scope

Read this file fully after every compaction. Stage 3 supersedes Stage 2A's wait;
historical deployment/frontend/Formula tasks and the stale 25a9 checkout are not active.

## Approved base and authority

- Worktree: `C:/CodexWork/tendermatch-neon-all-to-all`
- Branch: `codex/tendermatch-neon-all-to-all`
- Approved Stage 2A: `5a7f0a9124ada9053f5b1b466d79148cae6ccc16`
- Stage 2 base: `c1cdb6fb7070d62602bc44d09abadec4e7c35581`
- Development only, not release candidate or deployed. Requested reasoning: xhigh, not Ultra.
- Fetch/prune and verify HEAD, dirty paths, divergence, relevant parallel worktrees,
  protected remote/release state before implementation. Never silently merge or overwrite.

## Objective and invariants

Evaluate every intersection of the pinned 117 suppliers and 17,333 tenders
(`status='OPEN' AND deletedAt IS NULL`): 2,027,961 unique outcomes exactly once.
Reconfirm all Stage 2/2A input manifests and hashes. Ordinary drift creates a separate
manifest under the existing policy; do not mix source versions.

Keep procurement category/Formula scope, source supplier classification, provisional
Stage 2A candidate/limitations, hard exclusions, unresolved evidence and eligibility for
later experimental scoring separate. Formula v1.1 supports Goods and Works only.
Unsupported tender categories/types (including Services, Consulting, Other, EOI and
Prequalification) are explicitly OUTSIDE_FORMULA_V1_1_SCOPE, not zero or Non-match.
Missing evidence/classification is NEEDS_EVIDENCE/UNKNOWN, never INELIGIBLE.
Evaluate mixed suppliers against each supported evidenced scope. Preserve potential
service relevance outside Formula. Candidates remain experimental, not canonical.
Hard exclusions require explicit evidence; scope differences are not hard exclusions.
Never use names, IDs, country, zero or null as hidden eligibility signals.

## Implementation and validation

- Bounded server-side batches; version supplier/tender inputs, Stage 2 normalization,
  Stage 2A schema/policy/code/outcome, eligibility policy and implementation hash.
- Idempotent cache and affected-pair-only invalidation; immutable prior results.
- Compact persistence in the approved isolated `tendermatch_results_dev` when its
  schema expects it; minimal additive migration/writes authorized there only.
- No heavy source bodies or full matrix in frontend artifacts.
- Measure batching/query counts, elapsed time, rows, payload/storage/memory, full
  readback/hash, deterministic rerun and bounded retry behavior.
- Tests: unsupported/provisional/mixed/unknown/hard-excluded scopes, zero/null,
  drift/cache, tenant/role boundaries and exact universe accounting.
- Focused/full tests, builds, lint, strict changed-surface typecheck. Preserve all
  Stage 0/1/2/2A evidence and byte-identical Formula v1.1.

## Prohibitions and stop conditions

No Formula or other scores, coverage scores, retrieval, embeddings, shortlist,
AI/TORS, narrative or human dispositions. No frontend changes or source DB writes.
No push, merge, publish, deploy, paid action, credential/security changes, destructive
action, production mutation or material architecture change. Stop and report if any
such authority is required. Original TenderBoost and protected release remain untouched.

## Completion

Commit a clean local Stage 3 checkpoint, report base/final commit, files/schema,
exact state/category/source/candidate/reason counts, identities/hashes, DB/performance,
cache/invalidation and regression evidence with limitations. Send the orchestrator
`01a04ea3-451d-77d2-8140-ca35d2a28e37` the report. Stop for Stage 3 review;
Formula scoring and Stage 4 must not begin.

## Checklist

- [x] Latest-state and pinned-universe verification.
- [x] Inspect contracts and define evidence-grounded scope/eligibility policy.
- [x] Implement isolated deterministic engine and compact persistence.
- [x] Full-universe execution, actual-output audit, readback and rerun.
- [x] Incremental/negative/full regression and build validation.
- [x] Local checkpoint evidence and review stop; enclosing commit is the checkpoint.

## Completion state

The complete run is reconciled in
`docs/evidence/tendermatch-stage3-eligibility.md` and its linked JSON artifacts.
Final validation: 159 focused / 527 repository tests, no failures or skips;
all builds, lint and strict changed-surface typecheck passed.
The completion correction adds evidence and regression assertions only;
the frozen implementation and 2,027,961-pair run are not restarted.

**WAIT FOR STAGE 3 REVIEW. Do not start Stage 4 or scoring.**

# Active task: Stage 4 — unchanged Formula v1.1 scoring

Read this file fully after every compaction. Stage 3 is approved. Historical
deployment, frontend and other stale task instructions are not active.

## Authority

- Worktree: `C:/CodexWork/tendermatch-neon-all-to-all`.
- Branch: `codex/tendermatch-neon-all-to-all`.
- Approved base: `4b66114330e302f80f9415910d2e029106578d76`.
- Stage 3 run: `7b3fbc39a401a72a6452c1d9bb050c18bc92d32a0f69acb4829f0a42236e102d`.
- Requested reasoning: GPT-6 Astra xhigh, not Ultra.
- Local development, existing isolated `tendermatch_results_dev` only.

## Exact population and scoring contract

Score all and only **707,660 CANDIDATE_ELIGIBLE_WITH_LIMITATIONS** pairs from
the approved Stage 3 run. Leave **414,604 SCOPE_NOT_DEMONSTRATED** and
**905,697 OUTSIDE_FORMULA_V1_1_SCOPE** pairs null/unscored. Total universe stays
**117 suppliers × 17,333 tenders = 2,027,961**. Never promote eligibility.

Use unchanged Formula v1.1 weights and rules. A separately versioned,
deterministic Stage 2A-to-Formula adapter may translate supported evidence;
it must not invent, enrich or upgrade evidence. Fixed denominator 100.
Missing earns zero criterion points but remains Missing, not incompatibility.
Persist numeric Pair Score including zero; criterion Fit/state/points/max and
evidence references; Data Coverage; assessed-only fit; deterministic main
limitation. Keep evidence confidence, eligibility and human authority separate.

## Execution and validation

Verify Git/parallel state and approved hashes first. Audit the unchanged Formula
and pinned Stage 2/2A/3 inputs. Prove the adapter in an isolated experiment
before database persistence. Use bounded server-side batches, immutable version
identities and additive storage only as needed in the approved result database.

Prove exact population accounting, score/component 0–100 invariants, complete
readback/hash, unchanged cache reuse, proportional invalidation, score/coverage/
limitation distributions, least-privilege security and measured storage/runtime.
Run focused/full tests, PGlite persistence/security, lint, strict changed-surface
typecheck and all production builds. Keep prior stage artifacts unchanged.

## Prohibitions and completion

No thresholds or Match/Non-match labels. No retrieval, embeddings, shortlist,
AI/TORS, human decisions, frontend, source writes, credential/billing changes,
push, merge, publish or deployment. Do not change Formula or canonical registry.
Original TenderBoost worktree/app remains untouched. No destructive Git actions.

Create Markdown/JSON evidence and a clean local Stage 4 checkpoint. Report to
orchestrator `01a04ea3-451d-77d2-8140-ca35d2a28e37`, then stop for review.
Approval to continue this stage is not permission for a subsequent stage.

## Checkpoint

- [x] Base, pinned inputs and parallel state verified.
- [x] Formula contract and deterministic adapter experiment audited.
- [x] All 707,660 candidates scored and stored; others remain unscored.
- [x] Full readback, cache, incremental/security and regression evidence.
- [x] Final Markdown/JSON and enclosing local commit; stop for orchestrator review.

## Completed checkpoint

- Full report: [Stage 4 evidence](evidence/tendermatch-stage4-formula.md).
  Runbook: [Formula contract](tendermatch-stage4-formula.md).
- Run `8c60354ecfd613fab2edca21528fab8c22aeb275df7115590a5916847c78efc5`.
  Code `3039fdbd0577772ac53f8fdce92e0e4cc101b448e84d5d3a74357f33baf289ca`.
  Ordered result `b7a12c75afc68f241ce740eaf557ada12abb79159406c1ebf6471e69ed6e5df6`.
- Exactly 707,660 scored and 1,320,301 unscored; all four complete passes agree.
  One run, 17,450 adapter inputs, 17,450 memberships, 707,660 evaluations and
  one sealed completion in the existing isolated results database.
- The orchestrator applied 070 through the verified owner Console (22 statements).
  The existing restricted writer persisted the scores. No source connection,
  source write, retrieval, model, frontend, push, merge or deployment occurred.
- Final independent SQL, 50 real-input Formula oracle comparisons, synthetic
  persisted incremental/security checks, 544 full tests without failures/skips,
  strict changed-surface TypeScript, lint, all three builds and 64 specifications
  passed. No remaining implementation work is required for this Stage 4 scope.
- Do not rerun heavy execution merely to finish review. Existing immutable
  code/run/evidence identities are complete. A later stage requires a new
  instruction; this checkpoint stops for orchestrator review.

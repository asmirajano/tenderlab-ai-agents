# ACTIVE TASK — Stage 2 normalization/features

Read this file immediately after any context compaction. Historical Formula,
deployment, frontend and completed Stage 1 requests are NOT the active objective.

- Active authorization: execute Stage 2 normalization/features, development only;
  report in English, GPT-6 Astra xhigh (not Ultra), stop for orchestrator review.
- Exact worktree `C:/CodexWork/tendermatch-neon-all-to-all`; branch
  `codex/tendermatch-neon-all-to-all`; approved base
  `074d17fc1e4f062d98420fc6205b906a2d96bf93` (stage-approved, not a release).
- Fresh fetch: `origin/main=d230590cf5ee99a679f162b2e3a19b65752c0f16`, 5 ahead,
  0 behind, initially clean, no upstream. Do not implement in stale `25a9`.
- Manifest `1dde6c1b91bf02ff499493e99e236355016ff838cc39d11d1187bffada40a729`;
  capture `dd3d7b86bfe7305f5b7b00228a8e15a55cdccb46ba384ec5ba851d147c8ccc05`;
  tenant `tendermatch-development-stage1`; 117 suppliers + 17323 OPEN/nondeleted
  tenders; 17440 membership rows; 2026791 potential pairs, never scored.
- Source/result targets and protected credential handling are unchanged from
  `docs/evidence/tendermatch-development-stage1.json` and the development runbook.
  Reuse existing ignored files; no source writes/grants or password rotation.

Acceptance checklist:

- [x] Inspect authoritative feature, supplier, all-to-all and Formula contracts;
  write explicit field/lineage/quantity/lookup mappings before persistence.
- [x] Re-read every manifest ID and safe source evidence in bounded consistent
  snapshots; verify exact IDs/versions/hashes. Ordinary drift requires a fresh
  complete Stage 1 boundary, never relabeling the old manifest or source authority.
- [x] Normalize each entity once with explicit missing/limited/quarantined outcomes;
  preserve source classification, evidence status and metric qualifiers.
- [x] Key reusable features by all consumed inputs/lookups + adapter/schema versions;
  demonstrate unchanged reuse and one-entity incremental invalidation.
- [x] Reuse normalized_feature; apply only required additive development association
  schema, preserving existing source contracts and Stage 1 evidence.
- [x] Execute complete universe, read back/hash all stored outcomes, test idempotency,
  role/tenant boundaries, field coverage, memory/query/payload/time/storage metrics.
- [x] Run focused/full proportional tests, lint/typecheck/build and original checks.
- [x] Write Stage 2 Markdown/JSON evidence and mapping/runbook, commit locally, report.
- [x] Stop for review; do not start Stage 3.

Prohibited: eligibility evaluation, real pair scoring/materialization, retrieval,
ranking/shortlisting, embeddings/index activation, AI/TORS/provider calls, narrative
assessments, enrichment, source/canonical-registry changes, frontend replacement,
push/merge/deploy/publish, paid actions or any next stage. Formula semantics unchanged.

Progress (2026-09-06 12:08 UTC): mapping, normalizer, bounded runner, additive SQL
and execution complete. 17,450 features/outcomes persisted; full readback and retry
reuse 17,450 / recomputation 0 passed. Owner postflight confirms other business/model
tables empty. 30 Stage 2 / 84 focused / 457 full tests pass; lint, strict TS, all
builds and original 3/3 pass. This scoped local checkpoint is submitted for Stage 2
review. STOP here (no Stage 3 and no Formula deployment). See the final response
for the containing commit, not a self-referential hash inside this checklist.

Ordinary source drift was detected: 10 new OPEN tenders. Original Stage 1 manifest
is preserved. Existing guarded Stage 1 runner registered complete new manifest
`e928df5e6a432fa23c8ea95dbfbf1aee4f1c883646d5ed72fd2856d994102ac2`, capture
`5cedcbb7a4226046528bd49c090280acf7faf90ae31dee9fe2300cb129515c25`:
117 unchanged suppliers + 17,333 OPEN tenders = 17,450 inputs. Full readback and
idempotency passed. Evidence: `docs/evidence/tendermatch-stage2-refreshed-input-boundary.json`.
Use that explicit manifest for subsequent Stage 2 execution unless ordinary drift
requires another complete guarded boundary. Do not answer historical Formula tasks.

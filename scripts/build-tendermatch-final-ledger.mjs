/** Bind retained sealed evidence. This command does not recapture or contact a database. */
import { readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import assert from 'node:assert/strict';

const root = new URL('../', import.meta.url);
const names = [
  'tendermatch-development-stage1',
  'tendermatch-development-stage2',
  'tendermatch-stage2a-readiness',
  'tendermatch-stage3-execute',
  'tendermatch-stage4-execute',
  'tendermatch-stage5-execute',
  'tendermatch-stage6-execute',
  'tendermatch-stage7-comparison',
  'tendermatch-stage7-execute',
  'tendermatch-stage7-replay',
  'tendermatch-stage7-validation',
  'tendermatch-stage8-validation',
  'tendermatch-stage8-benchmark',
  'tendermatch-stage9-validation',
  'tendermatch-stage9-browser',
  'tendermatch-stage10-validation',
  'tendermatch-stage10-benchmark',
  'tendermatch-round1-closure',
];
const sourceBinding = {};
const reports = {};
for (const name of names) {
  const file = `docs/evidence/${name}.json`;
  const source = (await readFile(new URL(file, root), 'utf8')).replaceAll('\r\n', '\n');
  sourceBinding[file] = createHash('sha256').update(source).digest('hex');
  reports[name] = JSON.parse(source);
}
const get = (name) => reports[`tendermatch-${name}`];
const s1 = get('development-stage1');
const s2 = get('development-stage2');
const s3 = get('stage3-execute');
const s4 = get('stage4-execute');
const s5 = get('stage5-execute');
const s6 = get('stage6-execute');
const s7Comparison = get('stage7-comparison');
const s7Execute = get('stage7-execute');
const s7Replay = get('stage7-replay');
const s7Validation = get('stage7-validation');
const s8 = get('stage8-benchmark');
const s9 = get('stage9-validation');
const s10 = get('stage10-validation');

const population = {
  suppliers: s2.identity.supplierCount,
  openTenders: s2.identity.tenderCount,
  universe: s3.execution.total,
  formulaScored: s4.execution.scored,
  formulaUnscored: s4.execution.unscored,
  scopeNotDemonstrated: s3.execution.counts.state.SCOPE_NOT_DEMONSTRATED,
  outsideFormulaScope: s3.execution.counts.state.OUTSIDE_FORMULA_V1_1_SCOPE,
  ranked: s5.execution.count,
  positiveRetrieval: s5.execution.count - s5.execution.zero,
  shortlist: s6.execution.count,
  review: s7Comparison.population.reviewTier,
  audit: s7Comparison.population.auditTier,
  stage7PlannedIntents: s7Execute.rows.escalation_request,
  actualModelCalls: s7Validation.actual.modelCalls,
  inputTokens: s7Validation.actual.inputTokens,
  outputTokens: s7Validation.actual.outputTokens,
  cost: s7Validation.actual.cost,
};
assert.deepEqual(population, {
  suppliers: 117,
  openTenders: 17333,
  universe: 2027961,
  formulaScored: 707660,
  formulaUnscored: 1320301,
  scopeNotDemonstrated: 414604,
  outsideFormulaScope: 905697,
  ranked: 707660,
  positiveRetrieval: 24007,
  shortlist: 28034,
  review: 18531,
  audit: 9503,
  stage7PlannedIntents: 500,
  actualModelCalls: 0,
  inputTokens: 0,
  outputTokens: 0,
  cost: 0,
});
assert.equal(population.suppliers * population.openTenders, population.universe);
assert.equal(population.scopeNotDemonstrated + population.outsideFormulaScope, population.formulaUnscored);
assert.equal(population.formulaScored + population.formulaUnscored, population.universe);
assert.equal(population.review + population.audit, population.shortlist);
assert.equal(s7Execute.shortlistRunId, s6.runId);
assert.equal(s7Execute.planId, s7Replay.planId);
assert.equal(s7Execute.planId, s7Validation.planId);
assert.deepEqual(s7Execute.rows, s7Replay.rows);
assert.deepEqual(s7Execute.rows, s7Validation.rows);
assert.equal(s7Execute.decisions.outcomeHash, s7Replay.decisions.outcomeHash);
assert.equal(s7Execute.decisions.outcomeHash, s7Validation.independentAllocation.outcomeHash);
assert.equal(s7Execute.execution.outcomeHash, s7Replay.execution.outcomeHash);
assert.equal(s7Execute.execution.outcomeHash, s7Validation.fullRequests.outcomeHash);
assert.equal(s7Validation.independentAllocation.identical, true);
assert.deepEqual(s7Validation.sql, {
  total: 28034,
  unique_pairs: 28034,
  planned: 500,
  deferred: 18031,
  audit: 9503,
  invalid_reasons: 0,
});

const sealed = [s3, s4, s5, s6].map((report, index) => ({
  stage: index + 3,
  runId: report.runId,
  outcomeHash: report.execution.outcomeHash,
  executedRows: report.execution.total ?? report.execution.count,
  formulaScored: report.execution.scored ?? null,
  executionMs: report.execution.elapsedMs,
  readbackMs: report.readback.elapsedMs,
  tableBytes: report.storage.reduce((total, table) => total + Number(table.total_bytes), 0),
  tables: report.storage.map((table) => ({ name: table.table_name, totalBytes: Number(table.total_bytes) })),
  evidenceFile: `docs/evidence/tendermatch-stage${index + 3}-execute.json`,
}));

const ledger = {
  schemaVersion: 'tendermatch-all-to-all-final-ledger/1.1.0',
  baseCommit: 'ddf2ab2f854b84d1c75fc2cb5a1f39a6871fbf0a',
  round1ClosureBase: 'f3d0e3081f2d599eef5ea6aa4e321514342be953',
  state: 'ROUND1_COMPLETE_ISOLATED_NEON_AND_LOCAL_APP_VALIDATED',
  evidenceClass: 'SEALED_NEON_STAGES_3_TO_7_PLUS_LOCAL_STAGES_8_TO_10_HASH_BOUND',
  sourceBinding,
  population,
  chronology: {
    stage1OpenTenders: s1.identity.tender.count,
    sealedStage2OpenTenders: s2.identity.tenderCount,
    explanation: 'Stage 2 refreshed the source manifest; the later sealed 17,333 tender population supersedes the initial Stage 1 count, without rewriting that historical capture.',
  },
  sealed,
  vector: {
    available: s5.availability.available_vector,
    installed: s5.availability.installed_vector,
    embeddingRows: s5.availability.embedding_rows,
    embeddingModels: s5.availability.embedding_models,
    semanticState: s5.availability.semanticState,
    ranking: 'DETERMINISTIC_LEXICAL_STRUCTURED_FALLBACK',
    note: 'pgvector and an HNSW structure existed; no approved frozen embedding source was available or used.',
  },
  stage7: {
    ownerMigration: '100',
    ownerInstallation: 'VERIFIED_COMPLETE',
    persistence: 'EXECUTED_REPLAYED_INDEPENDENTLY_VALIDATED',
    migrationCanonicalSha256: s7Validation.migrationBindings.canonicalSqlHash,
    planId: s7Validation.planId,
    rows: s7Validation.rows,
    plannedStates: s7Execute.summary.byState,
    selectedReasons: s7Execute.summary.selectedReasons,
    executionAuthorizations: s7Validation.rows.escalation_authorization,
    jobs: s7Validation.rows.escalation_job,
    artifacts: s7Validation.rows.escalation_artifact,
    provider: 'UNCONFIGURED',
    workload: s7Comparison.workload,
    executionMetrics: s7Execute.metrics,
    replayMetrics: s7Replay.metrics,
    validationMetrics: s7Validation.metrics,
  },
  stage8: {
    state: 'LOCAL_POSTGRESQL_HTTP_VALIDATED_NOT_HOSTED',
    fixtureCandidates: s8.fixture.candidates,
    latency: s8.latency,
    modelCalls: s8.modelCalls,
    neonConnections: s8.neonConnections,
    failClosed: 'Absent Stage 7 marker/plan/API never falls back to static data',
  },
  stage9: {
    state: 'EXPLICIT_DEVELOPMENT_MODE_ONLY_NOT_DEPLOYED',
    browser: s9.browser,
    protectedOverviewFormula: s9.browser.protectedOverviewAndFormulaDOM,
    release: {
      commit: 'd230590cf5ee99a679f162b2e3a19b65752c0f16',
      js: 'index-B47XFTdH.js',
      jsSha256: '97cc8072376e0d8a29ae32b87b3d22401676ee4b1c39bfe48ccddefb927a2b63',
      css: 'index-CugebHFU.css',
      cssSha256: '13c15e609c9b32b06eb128c1eac7f7f949085b1a555b700e44608ff9a30293f3',
      evidence: 'Stage 9 read-only release reconciliation retained; Round 1 does not deploy.',
    },
  },
  stage10: {
    state: 'LOCAL_INCREMENTAL_COORDINATOR_VALIDATED_NOT_NEON_PUBLISHER',
    validationStatus: s10.status,
    benchmark: 'docs/evidence/tendermatch-stage10-benchmark.json',
    newOwnerMigration: false,
    sourceConnections: 0,
    neonConnections: 0,
    modelCalls: 0,
    newTorsRequests: 0,
    latestRunPublication: 'Atomic local sealed-run CAS; no change to Stage 8 hosted pin or historical Neon data.',
  },
  remainingOperationalGates: [
    'Approved read-only current-source manifest publisher with immutable objects and atomic CURRENT replacement',
    'Reviewed cross-store publication adapter translating local incremental identities to installed versioned Neon contracts',
    'Hosted authenticated/authorized server runtime, session/CSRF secret management, observability and explicit deployment authorization',
    'Operational lineage compaction beyond 32 local versions and measured cloud-scale capacity validation',
    'Separate provider configuration, execution budget and authorization before any AI/TORS call',
  ],
  round2Backlog: [
    'Refresh the OPEN tender universe at execution time rather than changing the sealed Round 1 population',
    'Add Consulting and Services supplier/tender eligibility and scoring policies instead of treating Formula v1.1 as universal',
    'Re-run readiness, eligibility, Formula, ranking, shortlist and selective escalation under new versioned policies',
    'Populate approved embeddings before claiming semantic retrieval; otherwise retain the labelled deterministic fallback',
  ],
  limitations: [
    'Source evidence remains limited; absent comparable-contract or financial threshold evidence is not invented',
    'Missing criterion evidence contributes zero points at denominator 100 but stays Missing, not measured incompatibility',
    'Outside-scope and scope-not-demonstrated pairs remain null/unscored; zero retrieval is not a Non-match decision',
    'Retrieval, Formula, Data Coverage, Assessed-only Fit, Evidence Confidence, shortlist, escalation, TORS and Human Disposition stay distinct',
    'No model/tokenizer/pricing configuration exists; potential byte counts are not token or cost estimates',
    'Stage 8–10 timings are local/synthetic and cannot be presented as hosted cloud production SLAs',
  ],
};

await writeFile(
  new URL('docs/evidence/tendermatch-all-to-all-ledger.json', root),
  `${JSON.stringify(ledger, null, 2)}\n`,
);
console.log(JSON.stringify({
  state: ledger.state,
  population,
  sourceEvidenceFiles: Object.keys(sourceBinding).length,
  sealedTableBytes: sealed.reduce((total, report) => total + report.tableBytes, 0),
  stage7Rows: ledger.stage7.rows,
}));

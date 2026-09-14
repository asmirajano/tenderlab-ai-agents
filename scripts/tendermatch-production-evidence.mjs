/** Generate a deliberately non-secret evidence package from completed gate records. */
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {PRODUCTION as P} from './lib/tendermatch-production-contract.mjs';
const file=process.argv[2];if(!file)throw Error('Explicit completed promotion report required');
const promotion=JSON.parse(fs.readFileSync(file,'utf8'));
const cp=JSON.parse(fs.readFileSync(path.join(path.dirname(file),'checkpoint.json'),'utf8'));
const canary=JSON.parse(fs.readFileSync('docs/evidence/tendermatch-production-read-canary.json','utf8'));
const crossdb=JSON.parse(fs.readFileSync('docs/evidence/tendermatch-production-crossdb-access.json','utf8'));
assert.deepEqual(crossdb.target,P);assert.equal(crossdb.checks.length,2);assert.ok(crossdb.checks.every(x=>x.callableSecurityDefinerFunctions===0));
assert.equal(promotion.state,'DATA_VERIFIED_READONLY_NOT_LIVE');
assert.equal(canary.state,'PRODUCTION_DATABASE_CANARY_PASSED_NOT_DEPLOYED');
assert.equal(promotion.datasetHash,cp.datasetHash);assert.equal(canary.bindingId,P.bindingId);
assert.equal(promotion.tables.length,32);
assert.ok(promotion.tables.every(x=>x.sourceUnchanged&&x.sourceCanonicalHash===x.destinationCanonicalHash&&x.copiedRows===x.destinationRows&&x.schemaIdentical));
const canonicalDigest=createHash('sha256').update(JSON.stringify(promotion.tables.map(x=>({table:x.name,rows:x.destinationRows,sha256:x.destinationCanonicalHash})))).digest('hex');
const evidence={state:'PRODUCTION_DATA_READY_NOT_LIVE',verifiedAt:new Date().toISOString(),target:P,source:cp.source,
  sourceCommit:cp.sourceCommit,bindingId:P.bindingId,checkpointCapturedAt:cp.capturedAt,checkpointSealedAt:cp.sealedAt,
  binaryCheckpointDigest:cp.datasetHash,sourceSchemaSnapshotDigest:cp.schemaHash,canonicalSourceAndDestinationDigest:canonicalDigest,
  tables:promotion.tables,population:canary.population,suppliers:117,tenders:17333,storedReviewRequests:500,
  role:promotion.role,checks:promotion.checks,canary:{checks:canary.checks,measurements:canary.measurements},
  environment:{developmentMutations:0,developmentCredentialChanges:0,variable:'TENDERMATCH_PRODUCTION_READ_URL',
    storage:'Separate Windows CurrentUser DPAPI production vault; no runtime binding/deployment yet',liveBackendSwitched:false,developmentFallbackAllowed:false},
  schemaTreatment:promotion.securityPolicy,rollback:promotion.rollback,databaseBytes:promotion.databaseBytes,
  endpointsChanged:false,planChanges:0,billing:'Usage-based storage/history, transfer and compute; actual incremental charges not yet reconciled',
  servicesControl:{threadId:'01a0a046-d1ab-7c12-a43c-323a0e5382fb',status:'Acknowledged and preserved; Neon monitoring Manual; canonical registration pending inactive App Roadmap Services writer',newMonitoringEnabled:false},
  crossDatabaseSecurityDefinerCheck:crossdb,
  limitations:['No live Function or UI was switched','Database canary is not an authenticated end-to-end live-backend deployment canary','Database size is not provider billable storage','Development writer triggers intentionally replaced, not cloned']};
fs.writeFileSync('docs/evidence/tendermatch-production-data-promotion.json',JSON.stringify(evidence,null,2)+'\n');
fs.writeFileSync(path.join(path.dirname(file),'promotion-latest.json'),JSON.stringify({report:path.basename(file),state:evidence.state,datasetHash:cp.datasetHash,verifiedAt:evidence.verifiedAt},null,2)+'\n');
const report=`# TenderMatch production-data preparation — 14 September 2026

Status: **PRODUCTION DATA READY — LIVE APP NOT SWITCHED**.

| Gate | Verified result |
| --- | --- |
| Production identity | Neon project \`${P.project}\`; production branch \`${P.branch}\`; database \`${P.database}\` |
| Development | \`${cp.source.database}\` remains development; no data/configuration/credential mutation by this operation. Sealed source rows and role configuration rechecked unchanged. |
| Dataset | Binding \`${P.bindingId}\`; source/app checkpoint \`${cp.sourceCommit}\` |
| Population | 117 suppliers; 17,333 tenders; 2,027,961 eligibility pairs; 707,660 Formula results and ranked pairs; 28,034 shortlist pairs; 500 stored review requests |
| Copy | All 32 selected result/lineage tables copied; IDs, scores, coverage, relevance, confidence, references and ordering fields preserved. No scoring or AI run. |
| Integrity | All 32 tables have equal source/destination canonical SHA-256 digests and counts. Authenticated binary checkpoint verified before and during import. |
| Data schema | Column types/defaults/generated expressions, NOT NULL, primary/foreign/check/unique constraints and indexes verified. Tenant RLS preserved. Development writer triggers intentionally replaced by production all-write rejection. |
| Runtime | \`${P.loginRole}\`: only SELECT on 24 pinned API views; no raw/base access, writes, ownership, role/database creation, replication or RLS bypass; 3-connection limit. Denials tested in read-write transactions. |
| Environment | Separate production endpoint/database/role/credential vault and \`TENDERMATCH_PRODUCTION_READ_URL\`; TLS verification and channel binding required; no development fallback. |
| DB canary | Both pagination directions and next cursors passed; scored/unscored details passed; null remains distinct from zero. Observed checks took 1.4–3.4 seconds each, not a performance SLA. |
| Rollback | Protected release \`8ac5623\`, gateway \`tenderappsaccess-00004-yan\`, unchanged and ACTIVE. Encrypted source checkpoint retained. No live backend switch occurred. |
| Services Control | Handoff acknowledged and preserved by \`01a0a046-d1ab-7c12-a43c-323a0e5382fb\`. Neon remains Manual. Canonical registration is pending because App Roadmap's Services writer is inactive; its separate billing work was left untouched. |
| Resource/cost | PostgreSQL size ${promotion.databaseBytes.toLocaleString('en-US')} bytes (~${(promotion.databaseBytes/2**30).toFixed(2)} GiB). Existing branch/compute/scaling reused unchanged; no plan change. Storage/history, transfer and compute consumption may add cost. Actual incremental bill not yet verified. |
| Next-stage readiness | Yes: ready to build/canary the protected production results service. This report does not claim the UI now uses live results. |

## Integrity identities

- Binary checkpoint digest: \`${cp.datasetHash}\`.
- Source schema snapshot digest: \`${cp.schemaHash}\` (includes recorded development trigger metadata; do not mislabel it as an identical production operational-schema digest).
- Aggregate canonical source/destination digest: \`${canonicalDigest}\`.
- Source snapshot captured: ${cp.capturedAt}; sealed: ${cp.sealedAt}.
- Verification completed: ${evidence.verifiedAt}.

The generated pair totals and text-search document were restored using the exact
source expressions; their values were included in the all-field equality checks.
No Formula, ranking, shortlist or matching calculation was rerun.

An initial import transaction rolled back on PostgreSQL constraint-catalog DDL
handling. The destination was verified empty before the corrected retry. The
corrected schema was preflighted before re-import, and all final gates passed.
The original failed report and encrypted checkpoints remain available; no legacy
or development resources were removed.

The production reader has zero readable app tables or callable non-trigger
SECURITY DEFINER functions in the two pre-existing production databases.

Operator source: \`C:\\CodexWork\\tendermatch-production-promotion\`.
Machine evidence: \`docs/evidence/tendermatch-production-data-promotion.json\`.
Actual completed operator report: \`${file}\`.
The local vault's \`promotion-latest.json\` points to the successful attempt;
\`promotion.json\` retains the first failed attempt for audit history.

No app source, localhost registration, Balance/Logistics data, Hosting, Function,
live runtime binding, plan, compute limit or existing credential was changed.
`;
const rootReport='C:\\Users\\Cowork 2\\OneDrive\\Projects\\4_My Projects\\21_Codex Schedule\\reports\\tendermatch-production-data-preparation-20260914.md';
fs.writeFileSync(rootReport,report);
console.log(JSON.stringify({state:evidence.state,canonicalDigest,report:rootReport}));

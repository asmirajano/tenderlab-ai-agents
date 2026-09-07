import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {currentVersions} from '../scripts/lib/tendermatch-stage10-plan.mjs';
const root=new URL('../',import.meta.url),enabled=!!process.env.TENDERMATCH_STAGE10_EVIDENCE;
const read=async file=>JSON.parse(await readFile(new URL(file,root),'utf8'));
async function bind(files){for(const [file,expected] of Object.entries(files)){const actual=createHash('sha256').update((await readFile(new URL(file,root),'utf8')).replaceAll('\r\n','\n')).digest('hex');assert.equal(actual,expected,file);}}
test('Stage 10 measured synthetic benchmark binds current code, exact reuse, endpoint deltas and indexed bounded pages',{skip:!enabled},async()=>{
  const b=await read('docs/evidence/tendermatch-stage10-benchmark.json');await bind(b.sourceBinding);assert.deepEqual(b.versions,await currentVersions());assert.equal(b.mode,'MEASURED_SYNTHETIC_LOCAL_SQLITE_NOT_NEON');assert.equal(b.scenarios.length,7);const [full,reuse,supplier,tender,changed,closed,final]=b.scenarios;
  assert.equal(full.proof.universe,12000);assert.equal(full.proof.candidates,7200);assert.equal(full.stats.computed.formula,7200);assert.equal(full.bodyReads,430);
  for(const r of [reuse,final]){assert.equal(r.state,'SEALED_REUSED');assert.equal(r.affectedPairs,0);assert.equal(r.bodyReads,0);assert.deepEqual(r.stats.computed,{});assert.equal(r.stats.requestsCreated,0);}
  assert.equal(reuse.runId,full.runId);assert.equal(supplier.affectedPairs,400);assert.equal(supplier.bodyReads,1);assert.equal(tender.affectedPairs,31);assert.equal(changed.affectedPairs,401);assert.equal(closed.affectedPairs,0);assert.equal(closed.stats.computed.formula??0,0);assert.equal(final.runId,closed.runId);assert.equal(b.resources.pairDeltas,12832);
  for(const r of b.scenarios){assert.equal(r.proof.candidates+r.proof.unscored,r.proof.universe);assert.equal(r.proof.review+r.proof.audit,r.proof.shortlist);assert.equal(r.proof.requestsCreated,0);assert.equal(r.proof.modelCalls,0);assert.ok(r.executionMs>=0);}
  for(const q of b.queries){assert.ok(q.returned<=25);assert.ok(q.responseBytes<=524288);assert.ok(q.explain.some(p=>p.detail.includes('pair_'+q.direction)));}assert.equal(b.metadataPlanning.scenarios[0].universe,2027961);assert.equal(b.metadataPlanning.scenarios[1].affectedPairs,0);assert.equal(b.metadataPlanning.scenarios[2].affectedPairs,17333);assert.ok(b.metadataPlanning.scenarios.every(p=>p.pairMatrixMaterialized===false));
  assert.equal(b.neonConnections+b.sourceConnections+b.modelCalls+b.tokens+b.cost+b.requestsCreated,0);
});
test('final ledger binds retained sealed counts and the completed isolated Stage 7 without refreshing sources',{skip:!enabled},async()=>{
  const l=await read('docs/evidence/tendermatch-all-to-all-ledger.json');await bind(l.sourceBinding);assert.equal(Object.keys(l.sourceBinding).length,18);assert.equal(l.population.universe,2027961);assert.equal(l.population.formulaScored,707660);assert.equal(l.population.formulaUnscored,1320301);assert.equal(l.population.shortlist,28034);assert.equal(l.population.review,18531);assert.equal(l.population.audit,9503);assert.equal(l.population.positiveRetrieval,24007);assert.equal(l.population.stage7PlannedIntents,500);assert.equal(l.stage7.ownerInstallation,'VERIFIED_COMPLETE');assert.equal(l.stage7.persistence,'EXECUTED_REPLAYED_INDEPENDENTLY_VALIDATED');assert.deepEqual(l.stage7.rows,{escalation_plan:1,escalation_decision:28034,escalation_request:500,escalation_authorization:0,escalation_job:0,escalation_artifact:0,escalation_event:0});assert.equal(l.population.actualModelCalls+l.population.inputTokens+l.population.outputTokens+l.population.cost,0);assert.equal(l.state,'ROUND1_COMPLETE_ISOLATED_NEON_AND_LOCAL_APP_VALIDATED');assert.equal(l.sealed.reduce((n,s)=>n+s.tableBytes,0),2619154432);
  const protectedDiff=execFileSync('git',['diff',l.baseCommit,'--','apps','packages','db','migrations'],{cwd:root,encoding:'utf8'});assert.equal(protectedDiff,'','Stage 10 must not mutate prior frontend, algorithms or installed schema');
});

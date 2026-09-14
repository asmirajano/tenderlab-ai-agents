/** Isolated Stage 5 entry. Default plan is disconnected; no owner DDL is executed. */
import {mkdir,writeFile} from 'node:fs/promises';
import {pathToFileURL} from 'node:url';
import {connectStage3} from './lib/tendermatch-eligibility-inputs.mjs';
import {executionAuthority,RESULT_TABLES,expectDenied} from './lib/tendermatch-dev-contract.mjs';
import {TENANT,sha} from './lib/tendermatch-input-manifest.mjs';
import {BASE,TABLES,inspectStage5Availability,loadSealedFormula,stage5CodeIdentity,createRankingRun,loadCachedProfiles,prepareRankingRun,executeRanking,completeRankingRun,queryRanking,selectedRankingDetail,rankingPageSpec} from './lib/tendermatch-stage5.mjs';
const root=new URL('../',import.meta.url);
async function protectedState(c){
 const legacy={};for(const table of RESULT_TABLES.filter(t=>!['normalized_feature','schema_migration'].includes(t))){legacy[table]=(await c.query(`SELECT count(*)::int n FROM tendermatch_retrieval.${table}`)).rows[0].n;if(legacy[table])throw new Error('Unexpected legacy model/scoring/human state');}
 const formula=(await c.query(`SELECT r.run_id,encode(r.policy_hash,'hex') policy_hash,c.outcome_hash,c.scored_count::text,c.unscored_count::text FROM tendermatch_retrieval.formula_run r JOIN tendermatch_retrieval.formula_completion c USING(tenant_id,run_id) ORDER BY r.run_id`)).rows;
 const formulaRows=(await c.query('SELECT count(*)::int n FROM tendermatch_retrieval.formula_pair')).rows[0].n;
 return {legacy,formula,formulaRows};
}
export async function stage5NegativeChecks(c,run){
 for(const table of TABLES){const [p]=(await c.query(`SELECT has_table_privilege(current_user,$1,'SELECT') s,has_table_privilege(current_user,$1,'INSERT') i,has_table_privilege(current_user,$1,'UPDATE,DELETE,TRUNCATE,REFERENCES,TRIGGER') extra`,[`tendermatch_retrieval.${table}`])).rows;
  if(!p.s||!p.i||p.extra)throw new Error('Unsafe Stage 5 writer grants');
  for(const q of [`UPDATE tendermatch_retrieval.${table} SET tenant_id=tenant_id WHERE false`,`DELETE FROM tendermatch_retrieval.${table} WHERE false`,`TRUNCATE tendermatch_retrieval.${table}`])await expectDenied(c,q);
 }
 await expectDenied(c,'CREATE TABLE tendermatch_retrieval.stage5_forbidden(id int)');
 await expectDenied(c,'INSERT INTO tendermatch_retrieval.ranking_member SELECT * FROM tendermatch_retrieval.ranking_member LIMIT 1',['P0001']);
 await c.query('BEGIN');try{await c.query("SELECT set_config('tendermatch.tenant_id','stage5-other-tenant-probe',true)");for(const table of TABLES)if((await c.query(`SELECT count(*)::int n FROM tendermatch_retrieval.${table}`)).rows[0].n)throw new Error('Cross-tenant ranking read');
  let code;try{await c.query(`INSERT INTO tendermatch_retrieval.ranking_completion(tenant_id,run_id,outcome_hash,pair_count,zero_count) VALUES($1,$2,$3,0,0)`,[TENANT,run.runId,sha('probe')]);}catch(e){code=e.code;}if(!['42501','P0001'].includes(code))throw new Error('Cross-tenant ranking write allowed');
 }finally{await c.query('ROLLBACK');}
 return {grants:'SELECT INSERT only',updateDeleteTruncateDdl:'denied',sealedMembership:'denied',crossTenantRead:'zero',crossTenantWrite:'denied',committedProbeRows:0,tenantBoundary:'TRUSTED_SERVICE_GUC_NOT_USER_AUTHENTICATION'};
}
async function queryEvidence(c,run,proof){
 const supplierId=Object.keys(proof.bySupplier).sort()[0],tenderId=Object.keys(proof.byTender).sort()[0],out={};
 for(const [direction,focusId] of [['supplier',supplierId],['tender',tenderId]]){
  const start=performance.now(),page=await queryRanking(c,run,{direction,focusId,limit:25});
  for(const pair of page.results){const detail=await selectedRankingDetail(c,run,pair);if(sha(detail.formula)!==sha(pair.formula)||detail.retrieval.relevanceUnits!==pair.retrieval.units)throw new Error('Ranked page/detail Formula parity differs');}
  out[direction]={elapsedMs:Math.round(performance.now()-start),rows:page.results.length,bytes:Buffer.byteLength(JSON.stringify(page)),pageDetailParity:true,hasMore:page.hasMore};
  const spec=rankingPageSpec(run,{direction,focusId,limit:25});out[`${direction}Plan`]=(await c.query('EXPLAIN (ANALYZE,BUFFERS,FORMAT JSON) '+spec.text,spec.values)).rows[0]['QUERY PLAN'];
 }
 return out;
}
export async function main(args=process.argv.slice(2)){
 const mode=args[0]??'plan';if(mode==='plan')return {stage:5,base:BASE,connects:false,scope:'Separate retrieval over sealed Stage 4 candidates',ownerDdlAutomatic:false,modes:['inspect','execute','replay']};
 if(!['inspect','execute','replay'].includes(mode))throw new Error('Unknown Stage 5 mode');executionAuthority(args,process.env);
 const c=await connectStage3(),started=performance.now();let transaction=false,phase='preflight';
 try{
  if(mode!=='execute'){await c.query('BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY');transaction=true;}
  const before=await protectedState(c),availability=await inspectStage5Availability(c),loaded=await loadSealedFormula(c),code=await stage5CodeIdentity();
  const cache=availability.ranking_run?await loadCachedProfiles(c,loaded.inputs):[],run=createRankingRun(loaded,code,{profileCache:cache});
  const report={stage:5,mode,base:BASE,startedAt:new Date().toISOString(),runId:run.runId,identity:run.identity,code,availability,protectedBefore:before,profiles:{suppliers:run.suppliers.length,tenders:run.tenders.length,...run.extraction,payloadBytes:Buffer.byteLength(JSON.stringify([...run.suppliers,...run.tenders])),missingTechnical: [...run.suppliers,...run.tenders].filter(p=>p.missingTechnicalEvidence).length,truncated:[...run.suppliers,...run.tenders].filter(p=>p.truncatedTerms||p.truncatedConcepts).length}};
  const progress=p=>console.log(JSON.stringify({stage:5,phase,...p}));
  if(mode==='inspect'){
   phase='isolated-frozen-candidate-experiment';report.experiment=await executeRanking(c,run,{isolated:true,onProgress:progress});
   const replay=createRankingRun(loaded,code,{profileCache:[...run.suppliers,...run.tenders]});if(replay.runId!==run.runId||replay.extraction.extracted)throw new Error('Unchanged entity profile extraction not reused');report.profileRerun=replay.extraction;
   phase='isolated-determinism-replay';report.replay=await executeRanking(c,replay,{isolated:true,onProgress:progress});
   if(report.replay.outcomeHash!==report.experiment.outcomeHash||report.replay.formulaCandidateHash!==report.experiment.formulaCandidateHash)throw new Error('Pinned ranking replay differs');
   report.storedStage5Rows=availability.ranking_run?(await c.query('SELECT count(*)::int n FROM tendermatch_retrieval.ranking_pair')).rows[0].n:0;report.storageState=availability.ranking_run?'INSPECTION_ONLY_NO_STAGE5_WRITES':'OWNER_MIGRATION_AND_PERSISTENCE_PENDING';
  }else{
   if(!availability.ranking_run)throw new Error('Owner-only 080 migration required; writer must not apply DDL');
   if(mode==='execute')report.preparation=await prepareRankingRun(c,run);
   phase='ranking-persistence';report.execution=await executeRanking(c,run,{readOnly:mode==='replay',onProgress:progress});
   phase='independent-ranking-readback';report.readback=await executeRanking(c,run,{readOnly:true,verify:true,onProgress:progress});
   if(report.execution.outcomeHash!==report.readback.outcomeHash||report.execution.formulaCandidateHash!==report.readback.formulaCandidateHash)throw new Error('Ranking/full Formula readback mismatch');
   if(mode==='execute'){report.completion=await completeRankingRun(c,run,report.readback);phase='unchanged-cache-replay';report.rerun=await executeRanking(c,run,{onProgress:progress});if(report.rerun.evaluated||report.rerun.inserted||report.rerun.outcomeHash!==report.readback.outcomeHash)throw new Error('Ranking unchanged cache replay failed');report.security=await stage5NegativeChecks(c,run);}
   report.queries=await queryEvidence(c,run,report.readback);
   report.rows={};for(const table of TABLES)report.rows[table]=(await c.query(`SELECT count(*)::int n FROM tendermatch_retrieval.${table}`)).rows[0].n;
   report.storage=(await c.query(`SELECT c.relname table_name,pg_total_relation_size(c.oid)::text total_bytes,pg_relation_size(c.oid)::text heap_bytes FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='tendermatch_retrieval' AND c.relname=ANY($1::text[]) ORDER BY c.relname`,[TABLES])).rows;
  }
  report.protectedAfter=await protectedState(c);if(sha(before)!==sha(report.protectedAfter))throw new Error('Protected previous-stage state changed');
  report.metrics={elapsedMs:Math.round(performance.now()-started),connection:c.metrics,memory:process.memoryUsage()};report.finishedAt=new Date().toISOString();report.noSourceConnections=true;report.noExternalModelCalls=true;report.noFormulaWrites=true;report.noFrontend=true;report.noDeployment=true;
  if(transaction){await c.query('ROLLBACK');transaction=false;}
  await mkdir(new URL('outputs/stage5/',root),{recursive:true});await writeFile(new URL(`docs/evidence/tendermatch-stage5-${mode}.json`,root),JSON.stringify(report,null,2)+'\n');
  return {runId:run.runId,availability,profiles:report.profiles,experiment:report.experiment&&{count:report.experiment.count,zero:report.experiment.zero,outcomeHash:report.experiment.outcomeHash},rows:report.rows,metrics:report.metrics};
 }catch(e){if(transaction)await c.query('ROLLBACK');throw new Error(`Stage 5 ${phase}: ${e.message}`,{cause:e});}finally{await c.end();}
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href)main().then(r=>console.log(JSON.stringify(r,null,2))).catch(e=>{console.error(JSON.stringify({status:'FAILED',phaseMessage:e.message?.replace(/postgres(?:ql)?:\/\/\S+/gi,'[redacted]'),code:e.cause?.code??'STAGE5_FAILED'}));process.exitCode=1;});

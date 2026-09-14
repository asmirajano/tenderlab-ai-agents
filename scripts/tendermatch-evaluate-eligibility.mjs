/** Explicit isolated Stage 3 runner. Default is a disconnected plan. */
import {writeFile,mkdir,readFile} from 'node:fs/promises';
import {pathToFileURL} from 'node:url';
import {authority} from './tendermatch-input-manifest.mjs';
import {TENANT,sha} from './lib/tendermatch-input-manifest.mjs';
import {RESULT_TABLES,expectDenied} from './lib/tendermatch-dev-contract.mjs';
import {connectStage3,inspectDrift,loadPinnedScopeInputs,BASE} from './lib/tendermatch-eligibility-inputs.mjs';
import {eligibilityCodeIdentity,createRun,prepareRun,executeUniverse,completeRun,TABLES} from './lib/tendermatch-eligibility.mjs';
const root=new URL('../',import.meta.url);
export async function protectedCounts(c){const counts={};for(const table of RESULT_TABLES.filter(t=>!['normalized_feature','schema_migration'].includes(t))){counts[table]=(await c.query(`SELECT count(*)::int n FROM tendermatch_retrieval.${table}`)).rows[0].n;if(counts[table]!==0)throw new Error('Unexpected existing scoring/model/human state');}return counts;}
export async function negativeEligibilityChecks(c,run){
 for(const table of TABLES){const [p]=(await c.query("SELECT has_table_privilege(current_user,$1,'SELECT') s,has_table_privilege(current_user,$1,'INSERT') i,has_table_privilege(current_user,$1,'UPDATE,DELETE,TRUNCATE,REFERENCES,TRIGGER') extra",[`tendermatch_retrieval.${table}`])).rows;if(!p.s||!p.i||p.extra)throw new Error('Unexpected Stage 3 writer grants');
  await expectDenied(c,`UPDATE tendermatch_retrieval.${table} SET tenant_id=tenant_id WHERE false`);await expectDenied(c,`DELETE FROM tendermatch_retrieval.${table} WHERE false`);await expectDenied(c,`TRUNCATE tendermatch_retrieval.${table}`);
 }
 await expectDenied(c,'CREATE TABLE tendermatch_retrieval.stage3_forbidden(id int)');
 await c.query('BEGIN');try{await c.query("SELECT set_config('tendermatch.tenant_id','stage3-other-tenant-probe',true)");for(const table of TABLES)if((await c.query(`SELECT count(*)::int n FROM tendermatch_retrieval.${table}`)).rows[0].n)throw new Error('Cross-tenant read');
  let code;try{await c.query("INSERT INTO tendermatch_retrieval.eligibility_completion(tenant_id,run_id,outcome_hash,pair_count,counts) VALUES($1,$2,$3,1,'{}')",[TENANT,run.runId,sha('probe')]);}catch(e){code=e.code;}if(!['42501','P0001'].includes(code))throw new Error('Cross-tenant insert unexpectedly allowed');
 }finally{await c.query('ROLLBACK');}
 await c.query('BEGIN');try{let code;try{await c.query('INSERT INTO tendermatch_retrieval.eligibility_member SELECT * FROM tendermatch_retrieval.eligibility_member WHERE tenant_id=$1 AND run_id=$2 LIMIT 1',[TENANT,run.runId]);}catch(e){code=e.code;}if(code!=='P0001')throw new Error('Sealed membership changed');}finally{await c.query('ROLLBACK');}
 return {updateDeleteTruncateDdl:'denied',crossTenantRead:'zero',crossTenantWrite:'denied',sealedMembership:'denied',committedProbeRows:0,tenantBoundary:'TRUSTED_SERVICE_GUC_NOT_USER_AUTHENTICATION'};
}
export async function main(args=process.argv.slice(2),env=process.env){
 const mode=args[0]??'plan';if(mode==='plan')return {stage:3,scope:'hard eligibility and Formula scope only',connects:false,base:BASE,expectedPairs:2027961,modes:['inspect','execute','replay']};
 if(!['inspect','execute','replay'].includes(mode))throw new Error('Unknown Stage 3 action');authority(args,env);
 const c=await connectStage3(),started=performance.now();
 const progress=p=>console.log(JSON.stringify({stage:3,...p}));
 try{
  const before=await protectedCounts(c),drift=await inspectDrift(c);
  if(Object.values(drift.captures).some(x=>x.added||x.removed||x.changed))throw new Error('SOURCE_DRIFT_REQUIRES_SEPARATE_STAGE1_2_BOUNDARY');
  const loaded=await loadPinnedScopeInputs(c),code=await eligibilityCodeIdentity(),run=createRun(loaded.inputs,loaded.protectedInputs,code);
  const report={stage:3,base:BASE,mode,startedAt:new Date().toISOString(),runId:run.runId,identity:run.identity,code,sourceDrift:drift.captures,
    inputs:{supplier:run.suppliers.length,tender:run.tenders.length,pairs:run.suppliers.length*run.tenders.length,payloadBytes:Buffer.byteLength(JSON.stringify(loaded.inputs)),pages:loaded.pages},protectedBefore:before};
  if(mode==='inspect'){
   const sink={query:async sql=>{if(sql.startsWith('SELECT'))return {rows:[]};if(sql.startsWith('INSERT INTO tendermatch_retrieval.eligibility_pair'))return {rowCount:0};throw new Error('Unexpected isolated experiment query');}};
   report.experiment=await executeUniverse(sink,run,{onProgress:progress});
  }
  if(mode!=='inspect'){
   const installed=(await c.query("SELECT version FROM tendermatch_retrieval.schema_migration WHERE version='20260906-eligibility-v1'")).rows;if(installed.length!==1)throw new Error('Stage 3 migration not installed');
   if(mode==='execute')report.preparation=await prepareRun(c,run);
   report.execution=await executeUniverse(c,run,{readOnly:mode==='replay',onProgress:progress});
   report.readback=await executeUniverse(c,run,{readOnly:true,verifyCalculation:true,onProgress:p=>progress({phase:'independent-readback',...p})});
   if(report.execution.outcomeHash!==report.readback.outcomeHash)throw new Error('Full outcome hash differs');
   if(mode==='execute'){
    report.completion=await completeRun(c,run,report.readback);
    report.rerun=await executeUniverse(c,run,{onProgress:p=>progress({phase:'idempotent-rerun',...p})});
    if(report.rerun.evaluated||report.rerun.inserted||report.rerun.reused!==2027961||report.rerun.outcomeHash!==report.readback.outcomeHash)throw new Error('Full deterministic cache rerun failed');
    report.negativeChecks=await negativeEligibilityChecks(c,run);
   }
   report.storage=(await c.query("SELECT c.relname table_name,pg_total_relation_size(c.oid)::text total_bytes,pg_relation_size(c.oid)::text heap_bytes FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='tendermatch_retrieval' AND c.relname=ANY($1::text[]) ORDER BY c.relname",[TABLES])).rows;
   report.rows={};for(const table of TABLES)report.rows[table]=(await c.query(`SELECT count(*)::int n FROM tendermatch_retrieval.${table}`)).rows[0].n;
  }
  report.protectedAfter=await protectedCounts(c);report.metrics={elapsedMs:Math.round(performance.now()-started),connection:c.metrics,memory:process.memoryUsage()};report.finishedAt=new Date().toISOString();
  report.noScores=true;report.noFrontend=true;report.noSourceWrites=true;report.noDeployment=true;
  const migration=await readFile(new URL('db/tendermatch-dev/060-eligibility-up.sql',root),'utf8');report.migrationHash=sha(migration.replaceAll('\r\n','\n'));
  if(mode==='inspect'){await mkdir(new URL('outputs/stage3/',root),{recursive:true});await writeFile(new URL('outputs/stage3/inspect.json',root),JSON.stringify(report,null,2));}
  else await writeFile(new URL(`docs/evidence/tendermatch-stage3-${mode}.json`,root),JSON.stringify(report,null,2)+'\n');
  return {runId:run.runId,identity:run.identity,inputs:report.inputs,execution:report.execution,readback:report.readback&&{total:report.readback.total,outcomeHash:report.readback.outcomeHash},rerun:report.rerun&&{reused:report.rerun.reused,evaluated:report.rerun.evaluated,inserted:report.rerun.inserted},rows:report.rows,metrics:report.metrics};
 }finally{await c.end();}
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href)main().then(r=>console.log(JSON.stringify(r,null,2))).catch(e=>{console.error(JSON.stringify({status:'FAILED',code:/^[A-Z0-9]{5}$/.test(e.code??'')?e.code:'STAGE3_FAILED',reason:e.message?.startsWith('SOURCE_DRIFT')?e.message:'Identity, scope or persistence check failed; credential-bearing details suppressed. Resume only through pinned/idempotent runner.'}));process.exitCode=1;});

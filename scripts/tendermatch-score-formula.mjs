/** Explicit Stage 4 development runner; plan is disconnected; sources never connected. */
import {writeFile} from 'node:fs/promises';
import {pathToFileURL} from 'node:url';
import {connectStage3} from './lib/tendermatch-eligibility-inputs.mjs';
import {BASE,loadFormulaInputs} from './lib/tendermatch-formula-inputs.mjs';
import {TENANT,sha} from './lib/tendermatch-input-manifest.mjs';
import {expectDenied,RESULT_TABLES} from './lib/tendermatch-dev-contract.mjs';
import {TABLES,formulaCodeIdentity,createFormulaRun,prepareFormulaRun,executeFormula,completeFormulaRun,queryFormula} from './lib/tendermatch-formula.mjs';
import {evaluateStage4Pair,expandCriterionAudit} from '../packages/tendermatch/src/formula-stage4-adapter.ts';
const root=new URL('../',import.meta.url);
async function protectedState(c){const result={};for(const table of RESULT_TABLES.filter(t=>!['normalized_feature','schema_migration'].includes(t))){result[table]=(await c.query(`SELECT count(*)::int n FROM tendermatch_retrieval.${table}`)).rows[0].n;if(result[table])throw new Error('Unapproved scoring/model/human state exists');}return result;}
export async function negativeFormulaChecks(c,run){
 for(const table of TABLES){const [p]=(await c.query("SELECT has_table_privilege(current_user,$1,'SELECT') s,has_table_privilege(current_user,$1,'INSERT') i,has_table_privilege(current_user,$1,'UPDATE,DELETE,TRUNCATE,REFERENCES,TRIGGER') extra",[`tendermatch_retrieval.${table}`])).rows;
  if(!p.s||!p.i||p.extra)throw new Error('Unsafe Formula writer grants');
  await expectDenied(c,`UPDATE tendermatch_retrieval.${table} SET tenant_id=tenant_id WHERE false`);await expectDenied(c,`DELETE FROM tendermatch_retrieval.${table} WHERE false`);await expectDenied(c,`TRUNCATE tendermatch_retrieval.${table}`);
 }
 await expectDenied(c,'CREATE TABLE tendermatch_retrieval.stage4_forbidden(id int)');
 await expectDenied(c,'INSERT INTO tendermatch_retrieval.formula_member SELECT * FROM tendermatch_retrieval.formula_member LIMIT 1',['P0001']);
 await c.query('BEGIN');try{
  await c.query("SELECT set_config('tendermatch.tenant_id','stage4-other-tenant-probe',true)");
  for(const table of TABLES)if((await c.query(`SELECT count(*)::int n FROM tendermatch_retrieval.${table}`)).rows[0].n)throw new Error('Cross-tenant Formula read');
  let code;try{await c.query("INSERT INTO tendermatch_retrieval.formula_completion(tenant_id,run_id,outcome_hash,scored_count,unscored_count,counts) VALUES($1,$2,$3,0,0,'{}')",[TENANT,run.runId,sha('probe')]);}catch(e){code=e.code;}if(!['42501','P0001'].includes(code))throw new Error('Cross-tenant Formula write allowed');
 }finally{await c.query('ROLLBACK');}
 return {updateDeleteTruncateDdl:'denied',crossTenantRead:'zero',crossTenantWrite:'denied',sealedMembership:'denied',committedProbeRows:0,tenantBoundary:'TRUSTED_SERVICE_GUC_NOT_USER_AUTHENTICATION'};
}
async function queryEvidence(c,run){
 const supplier=run.suppliers.find(s=>s.scopes.includes('GOODS')),tender=run.tenders.find(t=>t.prepared.procurementType==='GOODS');
 const output={};for(const [name,q] of [['supplier',{supplierId:supplier.id}],['tender',{tenderId:tender.id}],['detail',{supplierId:supplier.id,tenderId:tender.id}]]){
  const start=performance.now(),rows=await queryFormula(c,run,q);for(const row of rows){const s=run.suppliers.find(s=>s.id===row.supplierId),t=run.tenders.find(t=>t.id===row.tenderId),expected=evaluateStage4Pair(s,t,'CANDIDATE_ELIGIBLE_WITH_LIMITATIONS',run.runId,'2026-09-06T00:00:00Z');if(sha(expected)!==sha(row.result))throw new Error('Scoped view parity differs');
   const expanded=expandCriterionAudit(row.result,s,t);if(expanded.reduce((n,x)=>n+x.points,0)!==row.result.pairScore)throw new Error('Export parity differs');}
  output[name]={rows:rows.length,elapsedMs:Math.round(performance.now()-start),serializedBytes:Buffer.byteLength(JSON.stringify(rows)),numericDetailExportParity:true};
 }
 for(const [name,key,column] of [['supplierIndex',supplier.key,'supplier_key'],['tenderIndex',tender.key,'tender_key']])output[name]=(await c.query(`EXPLAIN (ANALYZE,BUFFERS,FORMAT JSON) SELECT pair_score FROM tendermatch_retrieval.formula_pair WHERE tenant_id=$1 AND policy_hash=decode($2,'hex') AND ${column}=decode($3,'hex') LIMIT 25`,[TENANT,run.policyHash,key])).rows[0]['QUERY PLAN'];
 return output;
}
export async function main(args=process.argv.slice(2)){
 const mode=args[0]??'plan';if(mode==='plan')return {stage:4,base:BASE,connects:false,scope:'707660 candidate scores; 1320301 unscored',modes:['inspect','execute','replay']};
 if(!['inspect','execute','replay'].includes(mode)||!args.includes('--execute-approved'))throw new Error('Explicit Stage 4 mode and authority required');
 const c=await connectStage3(),start=performance.now();let phase='preflight';const progress=p=>console.log(JSON.stringify({stage:4,phase,...p}));
 try{
  const before=await protectedState(c),loaded=await loadFormulaInputs(c),code=await formulaCodeIdentity(),run=createFormulaRun(loaded,code);
  const report={stage:4,mode,base:BASE,startedAt:new Date().toISOString(),runId:run.runId,identity:run.identity,code,protectedBefore:before,inputs:{suppliers:run.suppliers.length,tenders:run.tenders.length,total:run.suppliers.length*run.tenders.length,payloadBytes:Buffer.byteLength(JSON.stringify(loaded.inputs)),references:run.suppliers.reduce((n,s)=>n+s.references.length,0),withheld:run.suppliers.reduce((n,s)=>n+s.withheld.length,0),noSourceConnections:true}};
  if(mode==='inspect'){phase='isolated-real-input-experiment';report.experiment=await executeFormula(c,run,{isolated:true,onProgress:progress});}
  else{
   if(!(await c.query("SELECT 1 FROM tendermatch_retrieval.schema_migration WHERE version='20260906-formula-stage4-v1'")).rows.length)throw new Error('Stage 4 migration not installed');
   if(mode==='execute')report.preparation=await prepareFormulaRun(c,run);
   phase='persistence';report.execution=await executeFormula(c,run,{readOnly:mode==='replay',onProgress:progress});
   phase='independent-complete-readback';report.readback=await executeFormula(c,run,{readOnly:true,verifyCalculation:true,onProgress:progress});
   if(report.execution.outcomeHash!==report.readback.outcomeHash)throw new Error('Full Formula outcome differs');
   if(mode==='execute'){
    report.completion=await completeFormulaRun(c,run,report.readback);phase='unchanged-cache-rerun';report.rerun=await executeFormula(c,run,{onProgress:progress});
    if(report.rerun.evaluated||report.rerun.inserted||report.rerun.reused!==707660||report.rerun.outcomeHash!==report.readback.outcomeHash)throw new Error('Formula unchanged rerun failed');
    report.negativeChecks=await negativeFormulaChecks(c,run);
   }
   report.queries=await queryEvidence(c,run);
   report.storage=(await c.query("SELECT c.relname table_name,pg_total_relation_size(c.oid)::text total_bytes,pg_relation_size(c.oid)::text heap_bytes FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='tendermatch_retrieval' AND c.relname=ANY($1::text[]) ORDER BY c.relname",[TABLES])).rows;
   report.databaseBytes=(await c.query('SELECT pg_database_size(current_database())::text n')).rows[0].n;
   report.rows={};for(const table of TABLES)report.rows[table]=(await c.query(`SELECT count(*)::int n FROM tendermatch_retrieval.${table}`)).rows[0].n;
  }
  report.protectedAfter=await protectedState(c);if(sha(report.protectedAfter)!==sha(before))throw new Error('Protected tables changed');
  report.metrics={elapsedMs:Math.round(performance.now()-start),connection:c.metrics,memory:process.memoryUsage()};report.finishedAt=new Date().toISOString();report.noSourceWrites=true;report.noRetrieval=true;report.noFrontend=true;report.noDeployment=true;
  await writeFile(new URL(`docs/evidence/tendermatch-stage4-${mode}.json`,root),JSON.stringify(report,null,2)+'\n');
  return {runId:run.runId,inputs:report.inputs,execution:report.execution&&{scored:report.execution.scored,unscored:report.execution.unscored,inserted:report.execution.inserted,outcomeHash:report.execution.outcomeHash},experiment:report.experiment&&{scored:report.experiment.scored,unscored:report.experiment.unscored,counts:report.experiment.counts,outcomeHash:report.experiment.outcomeHash},rows:report.rows,metrics:report.metrics};
 }catch(e){throw new Error(`Stage 4 ${phase}: ${e.message}`,{cause:e});}finally{await c.end();}
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href)main().then(r=>console.log(JSON.stringify(r,null,2))).catch(e=>{console.error(JSON.stringify({status:'FAILED',phaseMessage:e.message?.replace(/postgres(?:ql)?:\/\/\S+/gi,'[redacted]'),code:e.cause?.code??'STAGE4_FAILED'}));process.exitCode=1;});

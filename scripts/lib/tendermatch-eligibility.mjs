import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {TENANT,sha} from './tendermatch-input-manifest.mjs';
import {ELIGIBILITY_SCHEMA,ELIGIBILITY_POLICY,STATES,REASONS,evaluateEligibility,encodeOutcome,decodeOutcome,reasonCodes,validateScopeInput} from '../../packages/tendermatch/src/eligibility-scope.ts';
export const TABLES=['eligibility_input','eligibility_run','eligibility_member','eligibility_pair','eligibility_completion'];
export const BATCH=4096;
const root=new URL('../../',import.meta.url);
export async function eligibilityCodeIdentity(){const files={};for(const file of ['packages/tendermatch/src/eligibility-scope.ts','scripts/lib/tendermatch-eligibility-inputs.mjs','scripts/lib/tendermatch-eligibility.mjs','scripts/tendermatch-evaluate-eligibility.mjs'])files[file]=sha((await readFile(new URL(file,root),'utf8')).replaceAll('\r\n','\n'));return {files,hash:sha(files)};}
export function createRun(inputs,protectedInputs,code){
 for(const input of inputs)validateScopeInput(input);
 const suppliers=inputs.filter(i=>i.kind==='supplier').sort((a,b)=>a.id.localeCompare(b.id)),tenders=inputs.filter(i=>i.kind==='tender').sort((a,b)=>a.id.localeCompare(b.id));
 if(!suppliers.length||!tenders.length||new Set(inputs.map(i=>`${i.kind}:${i.id}`)).size!==inputs.length)throw new Error('Invalid unique universe');
 const policyHash=sha({schema:ELIGIBILITY_SCHEMA,policy:ELIGIBILITY_POLICY,codeHash:code.hash,states:STATES,reasons:REASONS});
 const identity={...protectedInputs,schema:ELIGIBILITY_SCHEMA,policy:ELIGIBILITY_POLICY,codeHash:code.hash,policyHash,
   suppliers:suppliers.length,tenders:tenders.length,inputHash:sha([...suppliers,...tenders].map(i=>[i.kind,i.id,i.key])),scoring:'NOT_SCORED',maturity:'DEVELOPMENT_EXPERIMENT'};
 return {runId:sha(identity),identity,policyHash,suppliers,tenders};
}
export async function prepareRun(c,run){
 let inputInserted=0,memberInserted=0;await c.query('BEGIN');try{
 for(let i=0;i<run.suppliers.length+run.tenders.length;i+=250){const batch=[...run.suppliers,...run.tenders].slice(i,i+250);
  const result=await c.query(`INSERT INTO tendermatch_retrieval.eligibility_input(tenant_id,input_key,kind,entity_id,feature_key,projection) SELECT $1,decode(x->>'key','hex'),x->>'kind',(x->>'id')::uuid,x->>'featureKey',x FROM jsonb_array_elements($2::jsonb) x ON CONFLICT DO NOTHING`,[TENANT,JSON.stringify(batch)]);inputInserted+=result.rowCount;
  const read=(await c.query("SELECT projection FROM tendermatch_retrieval.eligibility_input WHERE tenant_id=$1 AND input_key=ANY($2::bytea[])",[TENANT,batch.map(i=>Buffer.from(i.key,'hex'))])).rows;
  if(read.length!==batch.length||sha(read.map(r=>r.projection).sort((a,b)=>a.key.localeCompare(b.key)))!==sha([...batch].sort((a,b)=>a.key.localeCompare(b.key))))throw new Error('Input cache readback mismatch');
 }
 const inserted=await c.query(`INSERT INTO tendermatch_retrieval.eligibility_run(tenant_id,run_id,policy_hash,normalization_id,identity,supplier_count,tender_count) VALUES($1,$2,decode($3,'hex'),$4,$5,$6,$7) ON CONFLICT DO NOTHING`,[TENANT,run.runId,run.policyHash,run.identity.normalizationId,JSON.stringify(run.identity),run.suppliers.length,run.tenders.length]);
 const [header]=(await c.query('SELECT identity FROM tendermatch_retrieval.eligibility_run WHERE tenant_id=$1 AND run_id=$2',[TENANT,run.runId])).rows;
 if(!header||sha(header.identity)!==run.runId)throw new Error('Run cache identity mismatch');
 if(inserted.rowCount){for(let i=0;i<run.suppliers.length+run.tenders.length;i+=500){const batch=[...run.suppliers,...run.tenders].slice(i,i+500);await c.query(`INSERT INTO tendermatch_retrieval.eligibility_member(tenant_id,run_id,kind,entity_id,input_key) SELECT $1,$2,x->>'kind',(x->>'id')::uuid,decode(x->>'key','hex') FROM jsonb_array_elements($3::jsonb) x`,[TENANT,run.runId,JSON.stringify(batch.map(i=>({kind:i.kind,id:i.id,key:i.key})))]);memberInserted+=batch.length;}}
 await c.query('COMMIT');return {inputInserted,runInserted:inserted.rowCount,memberInserted};
 }catch(e){await c.query('ROLLBACK');throw e;}
}
export async function retryAtomic(action,onRetry=()=>{},attempts=3){
 for(let attempt=1;attempt<=attempts;attempt++){try{return await action();}catch(e){if(!['40001','40P01'].includes(e.code)||attempt===attempts)throw e;onRetry(e.code,attempt);}}
}
const tally=(map,key)=>map[key]=(map[key]??0)+1;
const newCounts=()=>({state:{},reasons:{},hardGate:{},scopeRelation:{},servicePotential:{},byTenderCategory:{},bySupplierSource:{},bySupplierCandidate:{},bySourceCandidateCategoryState:{}});
function countOutcome(counts,s,t,o){
 tally(counts.state,o.state);for(const reason of reasonCodes(o.reasonMask))tally(counts.reasons,reason);
 tally(counts.hardGate,o.hardGate);tally(counts.scopeRelation,o.scopeRelation);tally(counts.servicePotential,o.servicePotential);
 tally(counts.byTenderCategory,t.category??'MISSING');tally(counts.bySupplierSource,s.category??'MISSING');tally(counts.bySupplierCandidate,s.candidateScope??'UNKNOWN');
 tally(counts.bySourceCandidateCategoryState,[s.category??'MISSING',s.candidateScope??'UNKNOWN',t.category??'MISSING',o.state].join('|'));
}
const cacheRows=async(c,run,s,page)=>(await c.query(`SELECT encode(tender_key,'hex') key,state,reasons,hard_gate,scope_relation,service_potential FROM tendermatch_retrieval.eligibility_pair WHERE tenant_id=$1 AND policy_hash=decode($2,'hex') AND supplier_key=decode($3,'hex') AND tender_key=ANY($4::bytea[])`,[TENANT,run.policyHash,s.key,page.map(t=>Buffer.from(t.key,'hex'))])).rows;
const rowValues=r=>[r.state,r.reasons,r.hard_gate,r.scope_relation,r.service_potential];
export async function executeUniverse(c,run,{readOnly=false,verifyCalculation=false,onProgress=()=>{}}={}){
 const started=performance.now(),counts=newCounts(),digest=createHash('sha256');
 let reused=0,evaluated=0,inserted=0,total=0,batches=0,retries=0,peakHeap=0,maxBatchBytes=0;
 const samples=[];
 for(const [supplierIndex,s] of run.suppliers.entries()){
  for(let i=0;i<run.tenders.length;i+=BATCH){const page=run.tenders.slice(i,i+BATCH),rows=await retryAtomic(()=>cacheRows(c,run,s,page),()=>retries++),cache=new Map(rows.map(r=>[r.key,rowValues(r)])),pending=[];
   if(cache.size!==rows.length)throw new Error('Duplicate cached outcome');
   for(const t of page){let values=cache.get(t.key);if(values){decodeOutcome(values);reused++;if(verifyCalculation&&sha(values)!==sha(encodeOutcome(evaluateEligibility(s,t))))throw new Error('Independent calculation/readback differs');}
    else {if(readOnly)throw new Error('Incomplete persisted eligibility');values=encodeOutcome(evaluateEligibility(s,t));evaluated++;pending.push([t.key,...values]);}
    const outcome=decodeOutcome(values);countOutcome(counts,s,t,outcome);digest.update(JSON.stringify([s.id,t.id,s.key,t.key,...values])+'\n');total++;
    if(!samples.some(x=>x.state===outcome.state&&x.category===t.category)&&samples.length<40)samples.push({supplierId:s.id,tenderId:t.id,category:t.category,sourceScope:s.category,candidateScope:s.candidateScope,...outcome,reasons:reasonCodes(outcome.reasonMask)});
   }
   if(pending.length){const json=JSON.stringify(pending);maxBatchBytes=Math.max(maxBatchBytes,Buffer.byteLength(json));
    const r=await retryAtomic(()=>c.query(`INSERT INTO tendermatch_retrieval.eligibility_pair(tenant_id,policy_hash,supplier_key,tender_key,state,reasons,hard_gate,scope_relation,service_potential) SELECT $1,decode($2,'hex'),decode($3,'hex'),decode(x->>0,'hex'),(x->>1)::smallint,(x->>2)::integer,(x->>3)::smallint,(x->>4)::smallint,(x->>5)::smallint FROM jsonb_array_elements($4::jsonb) x ON CONFLICT DO NOTHING`,[TENANT,run.policyHash,s.key,json]),()=>retries++);inserted+=r.rowCount;
   }
   batches++;peakHeap=Math.max(peakHeap,process.memoryUsage().heapUsed);
  }
  if(supplierIndex%10===0||supplierIndex===run.suppliers.length-1)onProgress({suppliers:supplierIndex+1,total,reused,evaluated,inserted});
 }
 const expected=run.suppliers.length*run.tenders.length;
 if(total!==expected||Object.values(counts.state).reduce((a,b)=>a+b,0)!==expected)throw new Error('Universe cardinality mismatch');
 return {total,reused,evaluated,inserted,batches,retries,peakHeap,maxBatchBytes,elapsedMs:Math.round(performance.now()-started),outcomeHash:digest.digest('hex'),counts,samples};
}
export async function completeRun(c,run,proof){
 await c.query(`INSERT INTO tendermatch_retrieval.eligibility_completion(tenant_id,run_id,outcome_hash,pair_count,counts) VALUES($1,$2,$3,$4,$5) ON CONFLICT DO NOTHING`,[TENANT,run.runId,proof.outcomeHash,proof.total,JSON.stringify(proof.counts)]);
 const [r]=(await c.query('SELECT outcome_hash,pair_count::text,counts FROM tendermatch_retrieval.eligibility_completion WHERE tenant_id=$1 AND run_id=$2',[TENANT,run.runId])).rows;
 if(!r||r.outcome_hash!==proof.outcomeHash||Number(r.pair_count)!==proof.total||sha(r.counts)!==sha(proof.counts))throw new Error('Completion readback mismatch');
 return {fullReadback:true,pairs:Number(r.pair_count),outcomeHash:r.outcome_hash};
}

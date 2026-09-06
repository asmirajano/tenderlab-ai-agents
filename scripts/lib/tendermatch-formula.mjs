import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {TENANT,sha} from './tendermatch-input-manifest.mjs';
import {retryAtomic} from './tendermatch-eligibility.mjs';
import {decodeOutcome} from '../../packages/tendermatch/src/eligibility-scope.ts';
import {STAGE4_ADAPTER,STAGE4_SCHEMA,FORMULA,FORMULA_POLICY,CRITERION_LIMITATIONS,validateFormulaInput,evaluateStage4Pair,validateFormulaResult,expandCriterionAudit,criterionCodes} from '../../packages/tendermatch/src/formula-stage4-adapter.ts';
export const TABLES=['formula_input','formula_run','formula_member','formula_pair','formula_completion'];
export const BATCH=4096;
const root=new URL('../../',import.meta.url);
export async function formulaCodeIdentity(){const files={};for(const f of ['packages/tendermatch/src/formula-stage4-adapter.ts','packages/tendermatch/src/exploratory-matching.ts','packages/tendermatch/src/retrieval-pipeline.ts','packages/tendermatch/src/retrieval-features.ts','scripts/lib/tendermatch-formula-inputs.mjs','scripts/lib/tendermatch-formula.mjs','scripts/tendermatch-score-formula.mjs','db/tendermatch-dev/070-formula-up.sql'])files[f]=sha((await readFile(new URL(f,root),'utf8')).replaceAll('\r\n','\n'));return {files,hash:sha(files)};}
export function createFormulaRun(loaded,code){
 loaded.inputs.forEach(validateFormulaInput);
 const suppliers=loaded.inputs.filter(i=>i.kind==='supplier').sort((a,b)=>a.id.localeCompare(b.id)),tenders=loaded.inputs.filter(i=>i.kind==='tender').sort((a,b)=>a.id.localeCompare(b.id));
 if(!suppliers.length||!tenders.length||new Set(loaded.inputs.map(i=>`${i.kind}:${i.id}`)).size!==loaded.inputs.length)throw new Error('Invalid unique Formula population');
 const policy={schema:STAGE4_SCHEMA,adapter:STAGE4_ADAPTER,formula:FORMULA,formulaPolicy:FORMULA_POLICY,codeHash:code.hash,stage3Policy:loaded.scope.policyHash,criterionLimitations:CRITERION_LIMITATIONS,mainLimitation:'largest lost points, Missing before assessed on tie, then original criterion order'};
 const policyHash=sha(policy),identity={...loaded.protectedInputs,...policy,policyHash,stage3RunId:loaded.scope.runId,stage3OutcomeHash:loaded.stage3OutcomeHash,
  suppliers:suppliers.length,tenders:tenders.length,expectedScored:loaded.stage3Counts.state.CANDIDATE_ELIGIBLE_WITH_LIMITATIONS,inputHash:sha([...suppliers,...tenders].map(i=>[i.kind,i.id,i.key])),maturity:'DEVELOPMENT_EXPERIMENT',authority:'SCORE_ONLY_NO_THRESHOLD_OR_HUMAN_DECISION'};
 return {runId:sha(identity),identity,policyHash,suppliers,tenders,scope:loaded.scope,stage3Counts:loaded.stage3Counts,stage3OutcomeHash:loaded.stage3OutcomeHash};
}
export async function prepareFormulaRun(c,run){
 const inputs=[...run.suppliers,...run.tenders];let inputInserted=0,memberInserted=0;await c.query('BEGIN');try{
  for(let i=0;i<inputs.length;i+=250){const batch=inputs.slice(i,i+250);inputInserted+=(await c.query(`INSERT INTO tendermatch_retrieval.formula_input(tenant_id,input_key,eligibility_key,kind,entity_id,projection) SELECT $1,decode(x->>'key','hex'),decode(x->>'eligibilityKey','hex'),x->>'kind',(x->>'id')::uuid,x FROM jsonb_array_elements($2::jsonb) x ON CONFLICT DO NOTHING`,[TENANT,JSON.stringify(batch)])).rowCount;
   const rows=(await c.query("SELECT projection FROM tendermatch_retrieval.formula_input WHERE tenant_id=$1 AND input_key=ANY($2::bytea[])",[TENANT,batch.map(i=>Buffer.from(i.key,'hex'))])).rows;
   if(rows.length!==batch.length||sha(rows.map(r=>r.projection).sort((a,b)=>a.key.localeCompare(b.key)))!==sha([...batch].sort((a,b)=>a.key.localeCompare(b.key))))throw new Error('Formula input readback differs');
  }
  const inserted=await c.query(`INSERT INTO tendermatch_retrieval.formula_run(tenant_id,run_id,policy_hash,stage3_run_id,identity,supplier_count,tender_count,expected_scored,formula_version,adapter_version) VALUES($1,$2,decode($3,'hex'),$4,$5,$6,$7,$8,$9,$10) ON CONFLICT DO NOTHING`,[TENANT,run.runId,run.policyHash,run.scope.runId,JSON.stringify(run.identity),run.suppliers.length,run.tenders.length,run.identity.expectedScored,FORMULA,STAGE4_ADAPTER]);
  const [header]=(await c.query('SELECT identity FROM tendermatch_retrieval.formula_run WHERE tenant_id=$1 AND run_id=$2',[TENANT,run.runId])).rows;
  if(!header||sha(header.identity)!==run.runId)throw new Error('Formula run identity differs');
  if(inserted.rowCount){for(let i=0;i<inputs.length;i+=500){const batch=inputs.slice(i,i+500);memberInserted+=(await c.query(`INSERT INTO tendermatch_retrieval.formula_member(tenant_id,run_id,kind,entity_id,input_key) SELECT $1,$2,x->>'kind',(x->>'id')::uuid,decode(x->>'key','hex') FROM jsonb_array_elements($3::jsonb) x`,[TENANT,run.runId,JSON.stringify(batch.map(({kind,id,key})=>({kind,id,key})))])).rowCount;}}
  await c.query('COMMIT');return {inputInserted,runInserted:inserted.rowCount,memberInserted};
 }catch(e){await c.query('ROLLBACK');throw e;}
}
export const resultColumns='pair_score,data_coverage,assessed_fit,evidence_confidence,denominator,fit,states,points,max_points,confidence,ref_groups,limitation_masks,limitation';
export function rowResult(r){return {pairScore:r.pair_score,dataCoverage:r.data_coverage,assessedFitScore:r.assessed_fit,evidenceConfidence:r.evidence_confidence,denominator:r.denominator,fit:r.fit,states:r.states,points:r.points,max:r.max_points,confidence:r.confidence,referenceGroups:r.ref_groups,limitationMasks:r.limitation_masks,limitation:r.limitation,formulaMainReason:r.data_coverage?'SCORING_ONLY_NO_MATCH_THRESHOLD':'NO_SUPPORTED_CRITERION_POINTS'};}
export async function insertFormulaBatch(c,run,s,pending){return (await c.query(`INSERT INTO tendermatch_retrieval.formula_pair(tenant_id,policy_hash,supplier_key,tender_key,${resultColumns}) SELECT $1,decode($2,'hex'),decode($3,'hex'),decode(x->>'key','hex'),(r->>'pairScore')::smallint,(r->>'dataCoverage')::smallint,(r->>'assessedFitScore')::smallint,(r->>'evidenceConfidence')::smallint,100,ARRAY(SELECT jsonb_array_elements_text(r->'fit')::smallint),ARRAY(SELECT jsonb_array_elements_text(r->'states')::smallint),ARRAY(SELECT jsonb_array_elements_text(r->'points')::smallint),ARRAY(SELECT jsonb_array_elements_text(r->'max')::smallint),ARRAY(SELECT jsonb_array_elements_text(r->'confidence')::smallint),ARRAY(SELECT jsonb_array_elements_text(r->'referenceGroups')::smallint),ARRAY(SELECT jsonb_array_elements_text(r->'limitationMasks')::smallint),(r->>'limitation')::smallint FROM jsonb_array_elements($4::jsonb) x CROSS JOIN LATERAL (SELECT x->'result' r) q ON CONFLICT DO NOTHING`,[TENANT,run.policyHash,s.key,JSON.stringify(pending)])).rowCount;}
const tally=(m,k)=>m[k]=(m[k]??0)+1;
const digestLine=(h,v)=>h.update(JSON.stringify(v)+'\n');
export async function executeFormula(c,run,{isolated=false,readOnly=false,verifyCalculation=false,onProgress=()=>{}}={}){
 const start=performance.now(),digest=createHash('sha256'),stage3Digest=createHash('sha256'),counts={eligibility:{},score:{},coverage:{},assessedFit:{},confidence:{},mainLimitation:{},byCategoryScore:{},criteria:{}};
 let total=0,scored=0,unscored=0,reused=0,evaluated=0,inserted=0,batches=0,retries=0,peakHeap=0,maxBatchBytes=0,verified=0;
 const samples=[],sampleKeys=new Set();
 for(const [supplierIndex,s] of run.suppliers.entries()){
  for(let offset=0;offset<run.tenders.length;offset+=BATCH){const page=run.tenders.slice(offset,offset+BATCH);
   const stage3=(await retryAtomic(()=>c.query(`SELECT encode(tender_key,'hex') key,state,reasons,hard_gate,scope_relation,service_potential FROM tendermatch_retrieval.eligibility_pair WHERE tenant_id=$1 AND policy_hash=decode($2,'hex') AND supplier_key=decode($3,'hex') AND tender_key=ANY($4::bytea[])`,[TENANT,run.scope.policyHash,s.eligibilityKey,page.map(t=>Buffer.from(t.eligibilityKey,'hex'))]),()=>retries++)).rows;
   const eligibility=new Map(stage3.map(r=>[r.key,[r.state,r.reasons,r.hard_gate,r.scope_relation,r.service_potential]]));
   if(eligibility.size!==page.length||stage3.length!==page.length)throw new Error('Stage 3 population incomplete');
   const rows=isolated?[]:(await retryAtomic(()=>c.query(`SELECT encode(tender_key,'hex') key,${resultColumns} FROM tendermatch_retrieval.formula_pair WHERE tenant_id=$1 AND policy_hash=decode($2,'hex') AND supplier_key=decode($3,'hex') AND tender_key=ANY($4::bytea[])`,[TENANT,run.policyHash,s.key,page.map(t=>Buffer.from(t.key,'hex'))]),()=>retries++)).rows;
   const cache=new Map(rows.map(r=>[r.key,rowResult(r)])),pending=[];if(cache.size!==rows.length)throw new Error('Duplicate Formula cache');
   for(const t of page){const values=eligibility.get(t.eligibilityKey),o=decodeOutcome(values);total++;tally(counts.eligibility,o.state);digestLine(stage3Digest,[s.id,t.id,s.eligibilityKey,t.eligibilityKey,...values]);
    let r=cache.get(t.key);
    if(o.state!=='CANDIDATE_ELIGIBLE_WITH_LIMITATIONS'){if(r)throw new Error('Noncandidate was scored');unscored++;digestLine(digest,[s.id,t.id,s.key,t.key,o.state,null]);continue;}
    if(r){reused++;validateFormulaResult(r,s,t.prepared.procurementType);if(verifyCalculation){const calculated=evaluateStage4Pair(s,t,o.state,run.runId,'2026-09-06T00:00:00Z');if(sha(r)!==sha(calculated))throw new Error('Independent Formula calculation differs');verified++;}}
    else{if(readOnly)throw new Error('Candidate score missing');r=evaluateStage4Pair(s,t,o.state,run.runId,'2026-09-06T00:00:00Z');evaluated++;pending.push({key:t.key,result:r});}
    scored++;digestLine(digest,[s.id,t.id,s.key,t.key,o.state,r]);
    for(const [key,value] of Object.entries({score:r.pairScore,coverage:r.dataCoverage,assessedFit:r.assessedFitScore,confidence:r.evidenceConfidence,mainLimitation:criterionCodes(t.prepared.procurementType)[r.limitation],byCategoryScore:`${t.prepared.procurementType}|${r.pairScore}`}))tally(counts[key],value);
    for(let i=0;i<5;i++)tally(counts.criteria,`${criterionCodes(t.prepared.procurementType)[i]}|${r.fit[i]===null?'MISSING':r.fit[i]}|${r.points[i]}`);
    const sampleKey=`${t.prepared.procurementType}|${r.pairScore}|${r.dataCoverage}`;
    if(!sampleKeys.has(sampleKey)&&samples.length<50){sampleKeys.add(sampleKey);samples.push({supplierId:s.id,tenderId:t.id,scope:t.prepared.procurementType,result:r,criteria:expandCriterionAudit(r,s,t)});}
   }
   if(pending.length){maxBatchBytes=Math.max(maxBatchBytes,Buffer.byteLength(JSON.stringify(pending)));if(!isolated)inserted+=await retryAtomic(()=>insertFormulaBatch(c,run,s,pending),()=>retries++);}
   batches++;peakHeap=Math.max(peakHeap,process.memoryUsage().heapUsed);
  }
  if(supplierIndex%10===0||supplierIndex===run.suppliers.length-1)onProgress({suppliers:supplierIndex+1,total,scored,unscored,reused,evaluated,inserted});
 }
 const eligibilityHash=stage3Digest.digest('hex');
 if(total!==run.suppliers.length*run.tenders.length||scored!==run.identity.expectedScored||eligibilityHash!==run.stage3OutcomeHash||sha(counts.eligibility)!==sha(run.stage3Counts.state))throw new Error('Approved exact population/hash differs');
 return {total,scored,unscored,reused,evaluated,inserted,verified,batches,retries,peakHeap,maxBatchBytes,elapsedMs:Math.round(performance.now()-start),outcomeHash:digest.digest('hex'),eligibilityHash,counts,samples};
}
export async function completeFormulaRun(c,run,proof){
 await c.query(`INSERT INTO tendermatch_retrieval.formula_completion(tenant_id,run_id,outcome_hash,scored_count,unscored_count,counts) VALUES($1,$2,$3,$4,$5,$6) ON CONFLICT DO NOTHING`,[TENANT,run.runId,proof.outcomeHash,proof.scored,proof.unscored,JSON.stringify(proof.counts)]);
 const [r]=(await c.query('SELECT outcome_hash,scored_count::text,unscored_count::text,counts FROM tendermatch_retrieval.formula_completion WHERE tenant_id=$1 AND run_id=$2',[TENANT,run.runId])).rows;
 if(!r||r.outcome_hash!==proof.outcomeHash||Number(r.scored_count)!==proof.scored||Number(r.unscored_count)!==proof.unscored||sha(r.counts)!==sha(proof.counts))throw new Error('Formula completion readback differs');
 return {fullReadback:true,scored:proof.scored,unscored:proof.unscored,outcomeHash:proof.outcomeHash};
}
/** Scope-constrained numeric views; no ranking model, filter threshold or decision. */
export async function queryFormula(c,run,{supplierId,tenderId,limit=25}={}){
 if(!supplierId&&!tenderId||!Number.isInteger(limit)||limit<1||limit>100)throw new Error('Bounded supplier or tender scope required');
 const rows=(await c.query(`SELECT s.entity_id::text supplier_id,t.entity_id::text tender_id,${resultColumns.split(',').map(x=>'p.'+x).join(',')} FROM tendermatch_retrieval.formula_pair p JOIN tendermatch_retrieval.formula_member s ON s.tenant_id=p.tenant_id AND s.run_id=$2 AND s.kind='supplier' AND s.input_key=p.supplier_key JOIN tendermatch_retrieval.formula_member t ON t.tenant_id=p.tenant_id AND t.run_id=$2 AND t.kind='tender' AND t.input_key=p.tender_key WHERE p.tenant_id=$1 AND p.policy_hash=decode($3,'hex') AND ($4::uuid IS NULL OR s.entity_id=$4::uuid) AND ($5::uuid IS NULL OR t.entity_id=$5::uuid) ORDER BY s.entity_id,t.entity_id LIMIT $6`,[TENANT,run.runId,run.policyHash,supplierId??null,tenderId??null,limit])).rows;
 return rows.map(r=>({supplierId:r.supplier_id,tenderId:r.tender_id,result:rowResult(r)}));
}

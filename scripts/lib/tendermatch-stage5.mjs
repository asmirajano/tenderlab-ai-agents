/** Results-only, sealed Formula consumer. No source capture, model provider or DDL. */
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {TENANT,sha} from './tendermatch-input-manifest.mjs';
import {formulaCodeIdentity,resultColumns,rowResult} from './tendermatch-formula.mjs';
import {validateFormulaInput,expandCriterionAudit} from '../../packages/tendermatch/src/formula-stage4-adapter.ts';
import {STAGE5_POLICY,STAGE5_METHOD,STAGE5_SCHEMA,RETRIEVAL_PROFILE_VERSION,extractRetrievalProfile,validateRetrievalProfile,calculatePairRetrieval,rankingExplanation} from '../../packages/tendermatch/src/retrieval-stage5.ts';
export const BASE='decd4df7a7ebf67884081301f1e0ae3cdb00ddaa';
export const TABLES=['ranking_profile','ranking_run','ranking_member','ranking_pair','ranking_completion'];
export const PAGE=1000;
const root=new URL('../../',import.meta.url),cmp=(a,b)=>a.id<b.id?-1:a.id>b.id?1:0;
const buffer=h=>Buffer.from(h,'hex');
export async function stage5CodeIdentity(){const files={};for(const file of ['packages/tendermatch/src/retrieval-stage5.ts','scripts/lib/tendermatch-stage5.mjs','scripts/tendermatch-stage5.mjs','db/tendermatch-dev/080-ranking-up.sql'])files[file]=sha((await readFile(new URL(file,root),'utf8')).replaceAll('\r\n','\n'));return {files,hash:sha(files)};}
export async function inspectStage5Availability(c){
 const [result]=(await c.query(`SELECT current_database() database,current_user role,version() postgres,
 (SELECT default_version FROM pg_available_extensions WHERE name='vector') available_vector,
 (SELECT extversion FROM pg_extension WHERE extname='vector') installed_vector,
 (SELECT count(*)::int FROM tendermatch_retrieval.feature_embedding) embedding_rows,
 (SELECT count(*)::int FROM tendermatch_retrieval.embedding_model) embedding_models,
 to_regclass('tendermatch_retrieval.ranking_run')::text ranking_run`)).rows;
 result.vectorIndexes=(await c.query(`SELECT tablename,indexname,indexdef FROM pg_indexes WHERE schemaname='tendermatch_retrieval' AND (indexdef LIKE '% USING hnsw %' OR indexdef LIKE '% USING ivfflat %') ORDER BY indexname`)).rows;
 result.semanticState='MISSING';result.reason='No approved frozen embedding source/model; existing unrelated vector rows would not be adopted';return result;
}
export async function loadSealedFormula(c){
 const proof=JSON.parse(await readFile(new URL('docs/evidence/tendermatch-stage4-execute.json',root),'utf8'));
 if(sha(await formulaCodeIdentity())!==sha(proof.code))throw new Error('Protected Stage 4 code identity differs');
 const [f]=(await c.query(`SELECT r.run_id,r.identity,encode(r.policy_hash,'hex') policy_hash,c.outcome_hash,c.scored_count::text,c.unscored_count::text FROM tendermatch_retrieval.formula_run r JOIN tendermatch_retrieval.formula_completion c USING(tenant_id,run_id) WHERE r.tenant_id=$1 AND r.run_id=$2`,[TENANT,proof.runId])).rows;
 if(!f||sha(f.identity)!==proof.runId||f.outcome_hash!==proof.readback.outcomeHash||Number(f.scored_count)!==707660||Number(f.unscored_count)!==1320301)throw new Error('Approved Stage 4 sealed completion differs');
 const inputs=[];let pages=0;
 for(const kind of ['supplier','tender']){let after=null;while(true){const rows=(await c.query(`SELECT f.entity_id::text,encode(f.input_key,'hex') input_key,i.projection FROM tendermatch_retrieval.formula_member f JOIN tendermatch_retrieval.formula_input i USING(tenant_id,input_key) WHERE f.tenant_id=$1 AND f.run_id=$2 AND f.kind=$3 AND ($4::uuid IS NULL OR f.entity_id>$4::uuid) ORDER BY f.entity_id LIMIT 500`,[TENANT,f.run_id,kind,after])).rows;pages++;
  for(const r of rows){const i=validateFormulaInput(r.projection);if(i.key!==r.input_key||i.id!==r.entity_id||i.kind!==kind)throw new Error('Formula member association differs');inputs.push(i);}
  if(rows.length<500)break;after=rows.at(-1).entity_id;
 }}
 if(sha(inputs.map(i=>[i.kind,i.id,i.key]))!==f.identity.inputHash||inputs.length!==17450)throw new Error('Frozen Formula input set differs');
 return {inputs,pages,formula:{runId:f.run_id,identity:f.identity,policyHash:f.policy_hash,outcomeHash:f.outcome_hash,scored:Number(f.scored_count),unscored:Number(f.unscored_count)}};
}
export function createRankingRun(loaded,code,{profileCache=[]}={}){
 const cache=new Map(profileCache.map(p=>[p.formulaInputKey,validateRetrievalProfile(p)]));
 if(cache.size!==profileCache.length)throw new Error('Duplicate retrieval profile cache');
 let extracted=0,reused=0;
 const profiles=loaded.inputs.map(i=>{validateFormulaInput(i);const prior=cache.get(i.key);if(prior){if(prior.id!==i.id||prior.kind!==i.kind)throw new Error('Cached profile association differs');reused++;return prior;}extracted++;return extractRetrievalProfile(i);});
 const suppliers=profiles.filter(p=>p.kind==='supplier').sort(cmp),tenders=profiles.filter(p=>p.kind==='tender').sort(cmp);
 if(new Set(profiles.map(p=>`${p.kind}:${p.id}`)).size!==profiles.length||!suppliers.length||!tenders.length)throw new Error('Duplicate/empty retrieval population');
 const policy={...STAGE5_POLICY,codeHash:code.hash},methodHash=sha(policy);
 const identity={schema:STAGE5_SCHEMA,formulaRunId:loaded.formula.runId,formulaOutcomeHash:loaded.formula.outcomeHash,formulaPolicy:loaded.formula.policyHash,
  formulaInputHash:loaded.formula.identity.inputHash,methodHash,policy,profileHash:sha([...suppliers,...tenders].map(p=>[p.kind,p.id,p.key])),suppliers:suppliers.length,tenders:tenders.length,expectedPairs:loaded.formula.scored,semanticState:'MISSING',model:null};
 return {runId:sha(identity),identity,methodHash,suppliers,tenders,formula:loaded.formula,extraction:{extracted,reused},inputByKey:new Map(loaded.inputs.map(i=>[i.key,i]))};
}
export async function loadCachedProfiles(c,inputs){
 const profiles=[];for(let i=0;i<inputs.length;i+=500){profiles.push(...(await c.query(`SELECT profile FROM tendermatch_retrieval.ranking_profile WHERE tenant_id=$1 AND input_key=ANY($2::bytea[]) AND profile->>'version'=$3`,[TENANT,inputs.slice(i,i+500).map(i=>buffer(i.key)),RETRIEVAL_PROFILE_VERSION])).rows.map(r=>r.profile));}return profiles;
}
export async function prepareRankingRun(c,run){
 let insertedProfiles=0,insertedMembers=0;const all=[...run.suppliers,...run.tenders];await c.query('BEGIN');try{
  for(let offset=0;offset<all.length;offset+=250){const rows=all.slice(offset,offset+250);insertedProfiles+=(await c.query(`INSERT INTO tendermatch_retrieval.ranking_profile(tenant_id,profile_key,input_key,kind,entity_id,profile) SELECT $1,decode(x->>'key','hex'),decode(x->>'formulaInputKey','hex'),x->>'kind',(x->>'id')::uuid,x FROM jsonb_array_elements($2::jsonb) x ON CONFLICT DO NOTHING`,[TENANT,JSON.stringify(rows)])).rowCount;
   const actual=(await c.query('SELECT profile FROM tendermatch_retrieval.ranking_profile WHERE tenant_id=$1 AND profile_key=ANY($2::bytea[])',[TENANT,rows.map(p=>buffer(p.key))])).rows.map(r=>r.profile).sort(cmp);
   if(sha(actual)!==sha([...rows].sort(cmp)))throw new Error('Retrieval profile persisted payload differs');
  }
  const header=await c.query(`INSERT INTO tendermatch_retrieval.ranking_run(tenant_id,run_id,method_hash,formula_run_id,identity,method_version) VALUES($1,$2,decode($3,'hex'),$4,$5,$6) ON CONFLICT DO NOTHING`,[TENANT,run.runId,run.methodHash,run.formula.runId,JSON.stringify(run.identity),STAGE5_METHOD]);
  const [actual]=(await c.query('SELECT identity FROM tendermatch_retrieval.ranking_run WHERE tenant_id=$1 AND run_id=$2',[TENANT,run.runId])).rows;
  if(!actual||sha(actual.identity)!==run.runId)throw new Error('Retrieval run payload differs');
  if(header.rowCount)for(let offset=0;offset<all.length;offset+=500)insertedMembers+=(await c.query(`INSERT INTO tendermatch_retrieval.ranking_member(tenant_id,run_id,kind,entity_id,profile_key,input_key) SELECT $1,$2,x->>'kind',(x->>'id')::uuid,decode(x->>'key','hex'),decode(x->>'formulaInputKey','hex') FROM jsonb_array_elements($3::jsonb) x`,[TENANT,run.runId,JSON.stringify(all.slice(offset,offset+500).map(({kind,id,key,formulaInputKey})=>({kind,id,key,formulaInputKey})))])).rowCount;
  await c.query('COMMIT');return {insertedProfiles,insertedRun:header.rowCount,insertedMembers};
 }catch(e){await c.query('ROLLBACK');throw e;}
}
const pairCols='lexical_overlap,lexical_union,structured_overlap,structured_union,relevance_units,limitation_mask';
export const rankingRow=r=>({lexicalOverlap:r.lexical_overlap,lexicalUnion:r.lexical_union,structuredOverlap:r.structured_overlap,structuredUnion:r.structured_union,relevanceUnits:r.relevance_units,limitationMask:r.limitation_mask});
export async function insertRankingBatch(c,run,s,rows){return (await c.query(`INSERT INTO tendermatch_retrieval.ranking_pair(tenant_id,method_hash,formula_policy,supplier_profile,tender_profile,supplier_key,tender_key,supplier_id,tender_id,${pairCols}) SELECT $1,decode($2,'hex'),decode($3,'hex'),decode($4,'hex'),decode(x->>'profileKey','hex'),decode($5,'hex'),decode(x->>'inputKey','hex'),$6::uuid,(x->>'id')::uuid,(r->>'lexicalOverlap')::smallint,(r->>'lexicalUnion')::smallint,(r->>'structuredOverlap')::smallint,(r->>'structuredUnion')::smallint,(r->>'relevanceUnits')::int,(r->>'limitationMask')::smallint FROM jsonb_array_elements($7::jsonb) x CROSS JOIN LATERAL(SELECT x->'result' r) q ON CONFLICT DO NOTHING`,[TENANT,run.methodHash,run.formula.policyHash,s.key,s.formulaInputKey,s.id,JSON.stringify(rows)])).rowCount;}
export async function* formulaCandidatePages(c,run){
 const tenders=new Map(run.tenders.map(t=>[t.id,t]));
 for(const s of run.suppliers){let after=null;while(true){const rows=(await c.query(`SELECT t.entity_id::text tender_id,encode(p.tender_key,'hex') tender_key,${resultColumns.split(',').map(x=>'p.'+x).join(',')} FROM tendermatch_retrieval.formula_pair p JOIN tendermatch_retrieval.formula_member t ON t.tenant_id=p.tenant_id AND t.input_key=p.tender_key AND t.run_id=$1 AND t.kind='tender' WHERE p.tenant_id=$2 AND p.policy_hash=decode($3,'hex') AND p.supplier_key=decode($4,'hex') AND ($5::uuid IS NULL OR t.entity_id>$5::uuid) ORDER BY t.entity_id LIMIT ${PAGE}`,[run.formula.runId,TENANT,run.formula.policyHash,s.formulaInputKey,after])).rows;
  const candidates=rows.map(r=>{const t=tenders.get(r.tender_id);if(!t||t.formulaInputKey!==r.tender_key)throw new Error('Unpinned Formula ranking candidate');return {t,formula:rowResult(r)};});
  yield {s,candidates};if(rows.length<PAGE)break;after=rows.at(-1).tender_id;
 }}
}
export async function executeRanking(c,run,{isolated=false,readOnly=false,verify=false,onProgress=()=>{}}={}){
 const start=performance.now(),digest=createHash('sha256'),formulaDigest=createHash('sha256');
 let count=0,zero=0,evaluated=0,reused=0,inserted=0,batches=0,peakHeap=0,maxBatchBytes=0;
 const distribution={},samples=[],sampleStates=new Set(),bySupplier={},byTender={},topBySupplier=new Map();
 for await(const {s,candidates} of formulaCandidatePages(c,run)){
  const stored=isolated?[]:(await c.query(`SELECT encode(tender_profile,'hex') profile_key,${pairCols} FROM tendermatch_retrieval.ranking_pair WHERE tenant_id=$1 AND method_hash=decode($2,'hex') AND formula_policy=decode($3,'hex') AND supplier_profile=decode($4,'hex') AND tender_profile=ANY($5::bytea[])`,[TENANT,run.methodHash,run.formula.policyHash,s.key,candidates.map(({t})=>buffer(t.key))])).rows;
  const cache=new Map(stored.map(r=>[r.profile_key,rankingRow(r)]));if(cache.size!==stored.length)throw new Error('Duplicate retrieval cache');
  const pending=[];
  for(const {t,formula} of candidates){let result=cache.get(t.key);if(result){reused++;if(verify&&sha(result)!==sha(calculatePairRetrieval(s,t)))throw new Error('Retrieval stored result differs');}else{if(readOnly)throw new Error('Ranking candidate missing');result=calculatePairRetrieval(s,t);evaluated++;pending.push({id:t.id,profileKey:t.key,inputKey:t.formulaInputKey,result});}
   count++;zero+=Number(result.relevanceUnits===0);digest.update(JSON.stringify([s.id,t.id,s.key,t.key,result])+'\n');formulaDigest.update(JSON.stringify([s.id,t.id,formula])+'\n');
   const bucket=String(Math.floor(result.relevanceUnits/100000)/10);distribution[bucket]=(distribution[bucket]??0)+1;bySupplier[s.id]=(bySupplier[s.id]??0)+1;byTender[t.id]=(byTender[t.id]??0)+1;
   const sampleState=`${t.scopes[0]}:${bucket}:${result.limitationMask}`;
   if(!sampleStates.has(sampleState)&&samples.length<30){sampleStates.add(sampleState);samples.push({supplierId:s.id,tenderId:t.id,retrieval:rankingExplanation(result,s,t),formula});}
   const top=topBySupplier.get(s.id)??[];top.push({supplierId:s.id,tenderId:t.id,units:result.relevanceUnits,formulaPairScore:formula.pairScore});top.sort((a,b)=>b.units-a.units||(a.tenderId<b.tenderId?-1:a.tenderId>b.tenderId?1:0));if(top.length>5)top.pop();topBySupplier.set(s.id,top);
  }
  maxBatchBytes=Math.max(maxBatchBytes,Buffer.byteLength(JSON.stringify(pending)));if(pending.length&&!isolated)inserted+=await insertRankingBatch(c,run,s,pending);
  batches++;peakHeap=Math.max(peakHeap,process.memoryUsage().heapUsed);if(batches%25===0)onProgress({batches,count,evaluated,reused,inserted});
 }
 if(count!==run.formula.scored)throw new Error('Ranking candidate count differs from sealed Formula');
 return {count,zero,evaluated,reused,inserted,batches,peakHeap,maxBatchBytes,elapsedMs:Math.round(performance.now()-start),outcomeHash:digest.digest('hex'),formulaCandidateHash:formulaDigest.digest('hex'),distribution,samples,bySupplier,byTender,topSamples:[...topBySupplier.values()].filter(x=>x.length).slice(0,10)};
}
export async function completeRankingRun(c,run,p){
 await c.query(`INSERT INTO tendermatch_retrieval.ranking_completion(tenant_id,run_id,outcome_hash,pair_count,zero_count) VALUES($1,$2,$3,$4,$5) ON CONFLICT DO NOTHING`,[TENANT,run.runId,p.outcomeHash,p.count,p.zero]);
 const [r]=(await c.query('SELECT outcome_hash,pair_count::text,zero_count::text FROM tendermatch_retrieval.ranking_completion WHERE tenant_id=$1 AND run_id=$2',[TENANT,run.runId])).rows;
 if(!r||r.outcome_hash!==p.outcomeHash||Number(r.pair_count)!==p.count||Number(r.zero_count)!==p.zero)throw new Error('Ranking completion collision');return r;
}
const uuid=/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/;
/** Rank cursor binds run, direction, focus and opposite profile identity; no OFFSET/unbounded mode. */
export function rankingPageSpec(run,{direction,focusId,limit=25,cursor=null}){
 if(!['supplier','tender'].includes(direction)||!uuid.test(focusId??'')||!Number.isInteger(limit)||limit<1||limit>100)throw new Error('Invalid bounded ranking request');
 const focus=(direction==='supplier'?run.suppliers:run.tenders).find(p=>p.id===focusId);if(!focus)throw new Error('Focus not in pinned ranking run');
 const scope=sha([run.runId,direction,focusId]);let after=null;
 if(cursor!==null){try{if(typeof cursor!=='string'||cursor.length>1024)throw 0;after=JSON.parse(Buffer.from(cursor,'base64url').toString());}catch{throw new Error('Malformed ranking cursor');}
  if(after.scope!==scope||!uuid.test(after.id??'')||!Number.isInteger(after.units)||after.units<0||after.units>1000000)throw new Error('Ranking cursor scope/value differs');}
 const opposite=direction==='supplier'?'tender':'supplier',focusColumn=`${direction}_profile`,oppositeId=`${opposite}_id`;
 return {scope,limit,text:`SELECT p.supplier_id::text,p.tender_id::text,encode(p.supplier_key,'hex') supplier_key,encode(p.tender_key,'hex') tender_key,encode(p.supplier_profile,'hex') supplier_profile,encode(p.tender_profile,'hex') tender_profile,${pairCols.split(',').map(x=>'p.'+x).join(',')} FROM tendermatch_retrieval.ranking_pair p JOIN tendermatch_retrieval.ranking_member m ON m.tenant_id=p.tenant_id AND m.run_id=$1 AND m.kind='${opposite}' AND m.profile_key=p.${opposite}_profile WHERE p.tenant_id=$2 AND p.method_hash=decode($3,'hex') AND p.formula_policy=decode($4,'hex') AND p.${focusColumn}=decode($5,'hex') AND ($6::int IS NULL OR p.relevance_units<$6 OR (p.relevance_units=$6 AND p.${oppositeId}>$7::uuid)) ORDER BY p.relevance_units DESC,p.${oppositeId} LIMIT $8`,values:[run.runId,TENANT,run.methodHash,run.formula.policyHash,focus.key,after?.units??null,after?.id??null,limit+1],direction};
}
export async function queryRanking(c,run,request){
 const [completion]=(await c.query('SELECT outcome_hash FROM tendermatch_retrieval.ranking_completion WHERE tenant_id=$1 AND run_id=$2',[TENANT,run.runId])).rows;if(!completion)throw new Error('Ranking run incomplete');
 const spec=rankingPageSpec(run,request),opposite=request.direction==='supplier'?'tender':'supplier';
 const raw=(await c.query(`WITH page AS MATERIALIZED (${spec.text}) SELECT page.*,${resultColumns.split(',').map(x=>'f.'+x).join(',')} FROM page JOIN tendermatch_retrieval.formula_pair f ON f.tenant_id=$2 AND f.policy_hash=decode($4,'hex') AND f.supplier_key=decode(page.supplier_key,'hex') AND f.tender_key=decode(page.tender_key,'hex') ORDER BY page.relevance_units DESC,page.${opposite}_id`,spec.values)).rows;
 const hasMore=raw.length>spec.limit,rows=raw.slice(0,spec.limit);
 const results=rows.map(r=>({supplierId:r.supplier_id,tenderId:r.tender_id,retrieval:{methodVersion:STAGE5_METHOD,relevance:r.relevance_units/1000000,units:r.relevance_units,semanticSimilarity:null,semanticState:'MISSING',valueClass:'CALCULATED'},formula:rowResult(r),eligibility:'CANDIDATE_ELIGIBLE_WITH_LIMITATIONS',humanDisposition:null,aiTors:null}));
 const last=rows.at(-1);return {runId:run.runId,formulaRunId:run.formula.runId,methodVersion:STAGE5_METHOD,results,hasMore,nextCursor:hasMore?Buffer.from(JSON.stringify({scope:spec.scope,id:last[`${spec.direction==='supplier'?'tender':'supplier'}_id`],units:last.relevance_units})).toString('base64url'):null,limitations:['NO_EMBEDDING_SOURCE','RETRIEVAL_ORDER_NOT_FORMULA_SCORE','HUMAN_DISPOSITION_AND_AI_TORS_NOT_LOADED']};
}
export async function selectedRankingDetail(c,run,{supplierId,tenderId}){
 if(!uuid.test(supplierId??'')||!uuid.test(tenderId??''))throw new Error('Explicit pair IDs required');
 const [completion]=(await c.query('SELECT outcome_hash FROM tendermatch_retrieval.ranking_completion WHERE tenant_id=$1 AND run_id=$2',[TENANT,run.runId])).rows;if(!completion)throw new Error('Ranking run incomplete');
 const s=run.suppliers.find(p=>p.id===supplierId),t=run.tenders.find(p=>p.id===tenderId);if(!s||!t)throw new Error('Pair outside pinned run');
 const [r]=(await c.query(`SELECT ${pairCols} FROM tendermatch_retrieval.ranking_pair p WHERE tenant_id=$1 AND method_hash=decode($2,'hex') AND formula_policy=decode($3,'hex') AND supplier_profile=decode($4,'hex') AND tender_profile=decode($5,'hex') AND EXISTS(SELECT 1 FROM tendermatch_retrieval.ranking_completion WHERE tenant_id=$1 AND run_id=$6)`,[TENANT,run.methodHash,run.formula.policyHash,s.key,t.key,run.runId])).rows;
 if(!r)return {runId:run.runId,supplierId,tenderId,retrieval:null,formula:null,state:'NOT_A_RANKED_FORMULA_CANDIDATE'};
 const [f]=(await c.query(`SELECT ${resultColumns} FROM tendermatch_retrieval.formula_pair WHERE tenant_id=$1 AND policy_hash=decode($2,'hex') AND supplier_key=decode($3,'hex') AND tender_key=decode($4,'hex')`,[TENANT,run.formula.policyHash,s.formulaInputKey,t.formulaInputKey])).rows;
 if(!f)throw new Error('Formula detail absent');const formula=rowResult(f);
 return {runId:run.runId,formulaRunId:run.formula.runId,supplierId,tenderId,eligibility:'CANDIDATE_ELIGIBLE_WITH_LIMITATIONS',retrieval:rankingExplanation(rankingRow(r),s,t),formula,criteria:expandCriterionAudit(formula,run.inputByKey.get(s.formulaInputKey),run.inputByKey.get(t.formulaInputKey)),profiles:{supplier:s,tender:t},humanDisposition:null,aiTors:null,limitations:['HUMAN_DISPOSITION_AND_AI_TORS_NOT_LOADED']};
}

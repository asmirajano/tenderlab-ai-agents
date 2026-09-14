import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {execFileSync} from 'node:child_process';
import {TENANT,sha} from '../scripts/lib/tendermatch-input-manifest.mjs';
import {alignSupplierReadiness} from '../packages/tendermatch/src/supplier-readiness.ts';
import {scopeInputKey} from '../packages/tendermatch/src/eligibility-scope.ts';
import {adaptStage2aSupplier,adaptStage2Tender,evaluateStage4Pair,expandCriterionAudit,validateFormulaInput,hashAdapter,STAGE4_ADAPTER} from '../packages/tendermatch/src/formula-stage4-adapter.ts';
import {evaluateExploratoryPair} from '../packages/tendermatch/src/exploratory-matching.ts';
import {createRun,prepareRun,executeUniverse,completeRun} from '../scripts/lib/tendermatch-eligibility.mjs';
import {createFormulaRun,prepareFormulaRun,executeFormula,completeFormulaRun,insertFormulaBatch,queryFormula,formulaCodeIdentity} from '../scripts/lib/tendermatch-formula.mjs';
const id=n=>`00000000-0000-0000-0000-${String(n).padStart(12,'0')}`;
const candidate='CANDIDATE_ELIGIBLE_WITH_LIMITATIONS';
const rekey=i=>{const {key,...body}=i;void key;return {...body,key:hashAdapter({adapter:STAGE4_ADAPTER,...body})};};
function scope(kind,n,category='GOODS',extra={}){const body={kind,id:id(n),featureKey:sha(['f',kind,n]),featureHash:sha(['h',n]),sourceHash:sha(['source',n]),sourceVersion:'synthetic/1',category,profileState:kind==='supplier'?'PINNED':null,candidateScope:kind==='supplier'?category:null,signals:kind==='supplier'?[category]:[],scopeEvidence:kind==='supplier'?[{id:id(80),sourceRecordId:id(81),artifactId:id(82),status:'INFERRED',valueClass:'SOURCE'}]:[],readinessId:null,readinessHash:null,readinessState:'NEEDS_EVIDENCE',classificationValueClass:'ESTIMATED',candidateReasons:[],deadline:null,timezone:null,requirementsMissing:true,hardEvidence:[],...extra};return {...body,key:scopeInputKey(body)};}
function supplier(n=1,claims=[['product_families','Steel parts and transformers'],['capacity','Employees: 120 employees'],['geographic_markets','Asia']],category='GOODS'){
 const evidence=claims.map(([field,value,status='STATED_UNVERIFIED',available=true],j)=>({canonical_entity_id:id(n),profile_version_id:id(n+100),claim_id:id(n*1000+j),external_claim_id:`synthetic-${n}-${j}`,field,source_field:field,display_value:value,status,value_class:status==='UNKNOWN'?'MISSING':'SOURCE',source_record_id:id(n*2000+j),source_system:'SYNTHETIC',retrieved_at:'2026-09-01T00:00:00Z',source_artifact_id:id(n*3000+j),artifact_available:available,artifact_status:available?'saved':'unavailable',artifact_sha256:available?sha(j):null,artifact_limitation:available?'':'Unavailable synthetic artifact',formula_role:'SUPPORTING_ONLY'}));
 const input={kind:'supplier',id:id(n),sourceVersion:'synthetic/1',baseContentHash:sha(evidence),provenance:{batch:'synthetic'},profile:{canonical_entity_id:id(n),profile_version_id:id(n+100),display_name:'Synthetic company',legal_name:'Synthetic company',country_code:'CN',entity_type_code:'company',classification:category,classification_value_class:'SOURCE',classification_claim_ids:[],profile_state:'PINNED',readiness_status:'usable_with_limitations',readiness_contract_version:'synthetic',verification_status:'under_review',evidence_count:evidence.length},evidence};
 const readiness=alignSupplierReadiness(input,sha('readiness-code'));readiness.classification.signals=[category];
 const s=scope('supplier',n,category,{readinessId:readiness.readinessId,readinessHash:readiness.contentHash});
 return {scope:s,readiness,adapted:adaptStage2aSupplier(readiness,s)};
}
function tender(n=20,category='GOODS',country='Uzbekistan',words='transformers electrical steel'){
 const s=scope('tender',n,category),f={id:id(n),sourceVersion:'synthetic/1',featureKey:s.featureKey,contentHash:s.featureHash,title:words,reference:'SYNTHETIC',procurementType:category,country:country?{name:country}:null,formulaInputs:{scoringTerms:words.split(' '),scoringConcepts:words.includes('electrical')?['electrical']:[]},sourceDates:{deadlineAt:null,timezone:null}};
 return {scope:s,adapted:adaptStage2Tender(f,s)};
}
const score=(s,t)=>evaluateStage4Pair(s,t,candidate,'synthetic-run','2026-09-06T00:00:00Z');
test('all noncandidate states remain null; candidate zero remains numeric with Missing fit',()=>{
 const s=supplier(1,[]).adapted,t=tender().adapted;
 for(const state of ['SCOPE_NOT_DEMONSTRATED','OUTSIDE_FORMULA_V1_1_SCOPE','NEEDS_EVIDENCE','HARD_EXCLUDED'])assert.equal(evaluateStage4Pair(s,t,state,'run','2026-09-06T00:00:00Z'),null);
 const r=score(s,t);assert.equal(r.pairScore,0);assert.equal(r.dataCoverage,0);assert.equal(r.denominator,100);assert.deepEqual(r.fit,[null,null,null,null,null]);assert.deepEqual(r.points,[0,0,0,0,0]);assert.deepEqual(r.states,[0,0,0,0,0]);
});
test('technical assessed zero and Missing criterion are independent; experience/finance never inferred',()=>{
 const s=supplier(1,[['product_families','Steel parts'],['financial','Turnover: USD 100 million (2025)'],['project_references','Supplied many international clients']]).adapted;
 const r=score(s,tender(20,'GOODS','Uzbekistan','medical').adapted);assert.equal(r.pairScore,0);assert.equal(r.fit[0],0);assert.equal(r.states[0],1);assert.equal(r.dataCoverage,35);assert.equal(r.fit[2],null);assert.equal(r.fit[4],null);assert.equal(r.limitation,0);
});
test('physical stock capacity survives absent reporting period; ambiguous rate/negation/conflict do not',()=>{
 for(const value of ['Employees: 120 employees','Equipment: 20 machines'])assert.equal(supplier(1,[['capacity',value]]).adapted.prepared.formulaEvidence.capacity.count,1,value);
 for(const value of ['Annual output capacity: unknown','Output: 120 units','Likely capacity: 100 units per year','No capacity available','Capacity: 100-20 units per year','Backlog: USD 10 million'])assert.equal(supplier(1,[['capacity',value]]).adapted.prepared.formulaEvidence.capacity.count,0,value);
});
test('unsupported status, absent artifact and duplicate clauses cannot upgrade evidence confidence',()=>{
 for(const claims of [[['product_families','Steel parts','UNKNOWN']],[['product_families','Steel parts','INFERRED',false]]]){const s=supplier(1,claims).adapted;assert.equal(s.prepared.formulaEvidence.technical.count,0);}
 const s=supplier(1,[['product_families','Steel parts; steel tubes; transformers','INFERRED']]).adapted;assert.equal(s.prepared.formulaEvidence.technical.count,1);assert.equal(s.prepared.formulaEvidence.technical.confidence,30);assert.ok(s.references[0].factIds.length>=1);
});
test('missing tender geography withholds geography evidence rather than matching empty country',()=>{
 const s=supplier().adapted,r=score(s,tender(20,'GOODS',null).adapted);assert.equal(r.fit[3],null);assert.equal(r.points[3],0);assert.equal(r.dataCoverage,55);
});
test('unchanged Formula oracle agrees for technical zero/partial/maximum and Goods/Works capacity/geography',()=>{
 for(const category of ['GOODS','WORKS'])for(const words of ['medical','steel','electrical','transformers electrical steel'])for(const country of ['Uzbekistan','China']){
  const s=supplier(1,undefined,category).adapted,t=tender(20,category,country,words).adapted,r=score(s,t);
  const oracle=evaluateExploratoryPair({id:t.id,reference:'synthetic',title:words,object:'',procurementType:category,tags:[],country,deadlineAt:'2030-01-01T00:00:00Z',snapshotAsOf:'2026-09-01T00:00:00Z',databaseStatus:'OPEN'},{canonicalEntityId:s.id,classification:category,readinessStatus:'requires_enrichment'},s.evidence,'2026-09-06T00:00:00Z');
  for(const [a,b] of [['pairScore','value'],['dataCoverage','dataCoverage'],['assessedFitScore','assessedFitScore'],['evidenceConfidence','evidenceConfidence']])assert.equal(r[a],oracle[b]);
  assert.deepEqual(r.fit,oracle.criteria.map(c=>c.fitLevel));assert.deepEqual(r.points,oracle.criteria.map(c=>(c.weightedPoints??0)/5));
  const audit=expandCriterionAudit(r,s,t);assert.equal(audit.reduce((n,c)=>n+c.maxPoints,0),100);assert.ok(audit.filter(c=>c.points).every(c=>c.references.length&&c.limitations.length));
 }
});
test('all currently supported operands at maximum still cannot fabricate full 100-point support',()=>{
 const s=supplier(1,[['product_families','Transformers electrical steel'],['capacity','Employees: 120 employees'],['geographic_markets','Uzbekistan']]).adapted,r=score(s,tender().adapted);assert.equal(r.pairScore,57);assert.equal(r.dataCoverage,65);assert.equal(r.fit[2],null);assert.equal(r.fit[4],null);
});
test('identical inputs/timestamps replay identically and body tamper fails',()=>{
 const s=supplier().adapted,t=tender().adapted;assert.deepEqual(score(s,t),evaluateStage4Pair(s,t,candidate,'another-run','2030-01-01T00:00:00Z'));assert.throws(()=>validateFormulaInput({...s,candidateScope:'OTHER'}));assert.notEqual(rekey({...s,readinessHash:sha('changed')}).key,s.key);
});
test('Formula, Stage 2/2A/3 and frontend remain byte-identical to approved Stage 3 base',async()=>{
 for(const file of ['packages/tendermatch/src/exploratory-matching.ts','packages/tendermatch/src/retrieval-pipeline.ts','packages/tendermatch/src/input-normalization.ts','packages/tendermatch/src/supplier-readiness.ts','packages/tendermatch/src/eligibility-scope.ts','docs/evidence/tendermatch-stage3-execute.json','apps/tender-apps/src/tendermatch-formula-contract.ts']){
  const previous=execFileSync('git',['show',`4b66114330e302f80f9415910d2e029106578d76:${file}`],{maxBuffer:8*1024*1024}).toString().replaceAll('\r\n','\n');assert.equal((await readFile(new URL('../'+file,import.meta.url),'utf8')).replaceAll('\r\n','\n'),previous);
 }
});
test('Stage 4 source boundary has no source connection, retrieval provider, model or frontend mutation',async()=>{
 for(const file of ['packages/tendermatch/src/formula-stage4-adapter.ts','scripts/lib/tendermatch-formula-inputs.mjs','scripts/lib/tendermatch-formula.mjs','scripts/tendermatch-score-formula.mjs']){
  const text=await readFile(new URL('../'+file,import.meta.url),'utf8');assert.doesNotMatch(text,/connectStage3\(['"]|embeddingProvider|generateEmbedding|fetch\(|INSERT INTO public\.|UPDATE registry\.|DELETE FROM registry\./);
 }
 const sql=await readFile(new URL('../db/tendermatch-dev/070-formula-up.sql',import.meta.url),'utf8');assert.doesNotMatch(sql,/CREATE ROLE|ALTER ROLE|CREATE DATABASE|CASCADE|UPDATE (?:public|registry)\.|DELETE FROM/);
});
test('ephemeral SQL scoring, constraints, incremental history, security and query parity',{skip:!process.env.TENDERMATCH_PGLITE_ROOT},async(t)=>{
 const {PGlite}=await import(pathToFileURL(path.join(process.env.TENDERMATCH_PGLITE_ROOT,'@electric-sql/pglite/dist/index.js')).href);const db=new PGlite(),c={query:async(q,v)=>{const r=await db.query(q,v);return {...r,rowCount:r.affectedRows??r.rows.length};}};
 try{
  await db.exec(`CREATE SCHEMA tendermatch_retrieval;CREATE ROLE tendermatch_result_writer NOLOGIN;GRANT USAGE ON SCHEMA tendermatch_retrieval TO tendermatch_result_writer;CREATE TABLE tendermatch_retrieval.schema_migration(version text primary key);CREATE FUNCTION tendermatch_retrieval.reject_immutable_change() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'Immutable'; END $$;
 CREATE TABLE tendermatch_retrieval.normalized_feature(tenant_id text,feature_key text,PRIMARY KEY(tenant_id,feature_key));
 CREATE TABLE tendermatch_retrieval.normalization_snapshot(tenant_id text,normalization_id text,supplier_count int,tender_count int,PRIMARY KEY(tenant_id,normalization_id));
 CREATE TABLE tendermatch_retrieval.normalization_member(tenant_id text,normalization_id text,kind text,entity_id uuid,feature_key text);`);
  for(const file of ['060-eligibility-up.sql','070-formula-up.sql']){const sql=await readFile(new URL('../db/tendermatch-dev/'+file,import.meta.url),'utf8');await assert.rejects(()=>db.exec(sql),/target mismatch/);await db.exec(sql.slice(sql.indexOf('CREATE TABLE')));}
  const seeds=[supplier(1),supplier(2),tender(20),tender(21),tender(22,'SERVICES')],inputs=seeds.map(x=>x.scope),norm=sha('synthetic norm');
  for(const i of inputs){await db.query('INSERT INTO tendermatch_retrieval.normalized_feature VALUES($1,$2)',[TENANT,i.featureKey]);await db.query('INSERT INTO tendermatch_retrieval.normalization_member VALUES($1,$2,$3,$4,$5)',[TENANT,norm,i.kind,i.id,i.featureKey]);}
  await db.query('INSERT INTO tendermatch_retrieval.normalization_snapshot VALUES($1,$2,2,3)',[TENANT,norm]);await db.exec('GRANT SELECT ON tendermatch_retrieval.normalization_snapshot,tendermatch_retrieval.normalization_member TO tendermatch_result_writer;SET ROLE tendermatch_result_writer;');await db.query("SELECT set_config('tendermatch.tenant_id',$1,false)",[TENANT]);
  const stage3=async(scopeInputs)=>{const scopeRun=createRun(scopeInputs,{normalizationId:norm},{hash:sha('scope-code')});await prepareRun(c,scopeRun);const p=await executeUniverse(c,scopeRun);await completeRun(c,scopeRun,p);return {scope:scopeRun,stage3OutcomeHash:p.outcomeHash,stage3Counts:p.counts,protectedInputs:{normalizationId:norm}};};
  const loaded={...await stage3(inputs),inputs:seeds.map(x=>x.adapted)},run=createFormulaRun(loaded,{hash:sha('formula-code')});let first;
  await t.test('unique numeric candidates, null exclusions, complete verified readback and idempotent reuse',async()=>{
   await prepareFormulaRun(c,run);first=await executeFormula(c,run);assert.equal(first.scored,4);assert.equal(first.unscored,2);assert.equal(first.inserted,4);
   const rb=await executeFormula(c,run,{readOnly:true,verifyCalculation:true});assert.equal(rb.outcomeHash,first.outcomeHash);assert.equal(rb.verified,4);await completeFormulaRun(c,run,rb);
   assert.equal((await prepareFormulaRun(c,run)).inputInserted,0);assert.equal((await executeFormula(c,run)).evaluated,0);
  });
  await t.test('changed supplier recomputes two candidate pairs; changed tender two; old results survive',async()=>{
   for(const index of [0,2]){const prior=inputs[index],body={...prior,sourceHash:sha(['changed',index])};delete body.key;const changedScope={...body,key:scopeInputKey(body)},newInputs=inputs.map((i,j)=>j===index?changedScope:i),adapted=loaded.inputs.map((i,j)=>j===index?rekey({...i,eligibilityKey:changedScope.key,prepared:{...i.prepared,sourceVersion:'synthetic/2'}}):i);
    const next=createFormulaRun({...await stage3(newInputs),inputs:adapted},{hash:sha('formula-code')});await prepareFormulaRun(c,next);const result=await executeFormula(c,next);assert.equal(result.evaluated,2);assert.equal(result.reused,2);await completeFormulaRun(c,next,await executeFormula(c,next,{readOnly:true,verifyCalculation:true}));
   }
   assert.equal((await executeFormula(c,run,{readOnly:true})).outcomeHash,first.outcomeHash);
  });
  await t.test('candidate scope, shape, Missing semantics, references, totals and limitation are database enforced',async()=>{
   const s=run.suppliers[0],tt=run.tenders[0],r=score(s,tt);for(const result of [{...r,pairScore:r.pairScore+1},{...r,fit:[...r.fit.slice(0,2),0,...r.fit.slice(3)]},{...r,max:[25,25,20,15,15]},{...r,referenceGroups:[0,2,0,3,0]},{...r,limitation:(r.limitation+1)%5}])await assert.rejects(()=>insertFormulaBatch(c,run,s,[{key:tt.key,result}]),/Formula|Missing|Criterion/);
   await assert.rejects(()=>insertFormulaBatch(c,run,s,[{key:run.tenders[2].key,result:r}]),/not a pinned candidate/);
  });
  await t.test('uncomputed run cannot complete; membership sealed; mutation and tenant crossing denied',async()=>{
   const fresh=createFormulaRun(loaded,{hash:sha('new-code')});await prepareFormulaRun(c,fresh);await assert.rejects(()=>completeFormulaRun(c,fresh,first),/Incomplete/);
   for(const q of ['UPDATE tendermatch_retrieval.formula_pair SET pair_score=0','DELETE FROM tendermatch_retrieval.formula_input','TRUNCATE tendermatch_retrieval.formula_pair','CREATE TABLE tendermatch_retrieval.forbidden(id int)'])await assert.rejects(()=>db.query(q),/permission denied/);
   await assert.rejects(()=>db.query('INSERT INTO tendermatch_retrieval.formula_member SELECT * FROM tendermatch_retrieval.formula_member LIMIT 1'),/sealed/);
   await db.query("SELECT set_config('tendermatch.tenant_id','other',false)");assert.equal((await db.query('SELECT count(*)::int n FROM tendermatch_retrieval.formula_pair')).rows[0].n,0);await assert.rejects(()=>prepareFormulaRun(c,run),/row-level security/);await db.query("SELECT set_config('tendermatch.tenant_id',$1,false)",[TENANT]);
  });
  await t.test('supplier, tender, detail and expanded export agree on stored numeric score',async()=>{
   for(const query of [{supplierId:id(1)},{tenderId:id(20)},{supplierId:id(1),tenderId:id(20)}]){const rows=await queryFormula(c,run,query);assert.ok(rows.length);for(const row of rows)assert.deepEqual(row.result,score(run.suppliers.find(s=>s.id===row.supplierId),run.tenders.find(t=>t.id===row.tenderId)));}
   await assert.rejects(()=>queryFormula(c,run,{}));await assert.rejects(()=>queryFormula(c,run,{supplierId:id(1),limit:101}));
  });
 }finally{await db.close();}
});
test('recorded Stage 4 real experiment binds exact population and unchanged Formula implementation',{skip:!process.env.TENDERMATCH_STAGE4_EVIDENCE},async()=>{
 const evidence=JSON.parse(await readFile(new URL('../docs/evidence/tendermatch-stage4-execute.json',import.meta.url),'utf8')),experiment=JSON.parse(await readFile(new URL('../docs/evidence/tendermatch-stage4-inspect.json',import.meta.url),'utf8'));
 assert.deepEqual(evidence.code,await formulaCodeIdentity());assert.equal(evidence.runId,sha(evidence.identity));assert.equal(experiment.runId,evidence.runId);
 for(const p of [evidence.execution,evidence.readback,evidence.rerun,experiment.experiment]){assert.equal(p.total,2027961);assert.equal(p.scored,707660);assert.equal(p.unscored,1320301);assert.equal(p.outcomeHash,experiment.experiment.outcomeHash);assert.deepEqual(p.counts,evidence.readback.counts);}
 assert.equal(evidence.readback.verified,707660);assert.equal(evidence.rerun.evaluated,0);assert.equal(evidence.rerun.inserted,0);assert.equal(evidence.rerun.reused,707660);assert.deepEqual(evidence.protectedBefore,evidence.protectedAfter);
});

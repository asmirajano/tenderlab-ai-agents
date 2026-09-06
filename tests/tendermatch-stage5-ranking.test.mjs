import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {execFileSync} from 'node:child_process';
import {TENANT,sha} from '../scripts/lib/tendermatch-input-manifest.mjs';
import {scopeInputKey} from '../packages/tendermatch/src/eligibility-scope.ts';
import {hashAdapter} from '../packages/tendermatch/src/formula-stage4-adapter.ts';
import {extractRetrievalProfile,validateRetrievalProfile,calculatePairRetrieval,rankingExplanation} from '../packages/tendermatch/src/retrieval-stage5.ts';
import {BASE,createRankingRun,prepareRankingRun,executeRanking,completeRankingRun,loadCachedProfiles,queryRanking,selectedRankingDetail,rankingPageSpec,insertRankingBatch,stage5CodeIdentity} from '../scripts/lib/tendermatch-stage5.mjs';
import {main} from '../scripts/tendermatch-stage5.mjs';
import {main as auditMain} from '../scripts/tendermatch-validate-stage5.mjs';
import {id,rekey,supplier,tender,sealSyntheticFormula} from './fixtures/tendermatch-stage5.mjs';
const pair=()=>[extractRetrievalProfile(supplier().adapted),extractRetrievalProfile(tender().adapted)];
const root=new URL('../',import.meta.url);
test('Stage 5 defaults disconnected and rejects unauthorized mode before a connection',async()=>{
 assert.equal((await main([])).connects,false);for(const mode of ['execute','replay','inspect','ddl'])await assert.rejects(()=>main([mode]),/approval|Unknown/);
 assert.deepEqual(await auditMain([]),{stage:5,connects:false,readOnly:true,modes:['verify']});await assert.rejects(()=>auditMain(['verify']),/approval/);
});
test('profile extracts frozen technical evidence only; unsupported financial/geography/name cannot create relevance',()=>{
 const a=supplier(1,[['product_families','Steel parts'],['financial','USD 100 million'],['geographic_markets','Global medical markets']]).adapted,p=extractRetrievalProfile(a);
 assert.ok(p.terms.includes('steel'));assert.ok(!p.terms.includes('medical'));assert.deepEqual(p.semantic,{state:'MISSING',model:null,dimensions:null});assert.ok(p.references.every(r=>r.sourceStatus==='STATED_UNVERIFIED'&&r.artifactId));
 for(const claims of [[],[['product_families','Steel parts','UNKNOWN']],[['product_families','Steel parts','INFERRED',false]]])assert.equal(extractRetrievalProfile(supplier(1,claims).adapted).terms.length,0);
 assert.throws(()=>validateRetrievalProfile({...p,terms:['fabricated']}),/identity/);
});
test('lexical/structured fallback is pair-local, zero-safe, rational and independent of Formula metrics',()=>{
 const [s,t]=pair(),r=calculatePairRetrieval(s,t),e=rankingExplanation(r,s,t);assert.ok(r.relevanceUnits>0&&r.relevanceUnits<=1000000);assert.equal(e.semanticSimilarity,null);assert.ok(e.supplierReferences.length);assert.equal(e.retrievalRelevance,r.relevanceUnits/1000000);
 assert.deepEqual(r,calculatePairRetrieval({...s,pairScore:100,dataCoverage:0,humanDisposition:'ignore',aiTors:999},{...t,pairScore:0}));
 const missing=extractRetrievalProfile(supplier(2,[]).adapted),zero=calculatePairRetrieval(missing,t);assert.equal(zero.relevanceUnits,0);assert.equal(zero.limitationMask,3);
 assert.throws(()=>calculatePairRetrieval(s,extractRetrievalProfile(tender(21,'WORKS').adapted)),/scope/);
});
test('profile identity is deterministic, bounded, Unicode-ordered and preserves original Formula inputs',()=>{
 const t=tender().adapted,terms=Array.from({length:300},(_,i)=>`term${String(i).padStart(3,'0')}`),input=rekey({...t,prepared:{...t.prepared,scoringTerms:[...terms,'𐐀','中','steel','steel']}}),before=sha(input),a=extractRetrievalProfile(input),b=extractRetrievalProfile(input);
 assert.deepEqual(a,b);assert.equal(a.terms.length,256);assert.equal(a.truncatedTerms,47);assert.equal(sha(input),before);
 const {key,...body}=a;void key;assert.throws(()=>validateRetrievalProfile({...body,semantic:{state:'READY',model:'fake',dimensions:3},key:hashAdapter({...body,semantic:{state:'READY',model:'fake',dimensions:3}})}),/shape/);
});
test('Stage 5 cannot mutate approved Stage 4, frontend or existing retrieval implementation',async()=>{
 for(const file of ['packages/tendermatch/src/formula-stage4-adapter.ts','packages/tendermatch/src/retrieval-ranking.ts','scripts/lib/tendermatch-formula.mjs','db/tendermatch-dev/070-formula-up.sql','docs/evidence/tendermatch-stage4-execute.json','apps/tender-apps/src/tendermatch-formula-contract.ts'])assert.equal((await readFile(new URL(file,root),'utf8')).replaceAll('\r\n','\n'),execFileSync('git',['show',`${BASE}:${file}`],{maxBuffer:8*1024*1024}).toString().replaceAll('\r\n','\n'));
 for(const file of ['packages/tendermatch/src/retrieval-stage5.ts','scripts/lib/tendermatch-stage5.mjs','scripts/tendermatch-stage5.mjs'])assert.doesNotMatch(await readFile(new URL(file,root),'utf8'),/connectStage3\(['"]|fetch\(|generateEmbedding|CREATE EXTENSION|(?:UPDATE|INSERT INTO)\s+tendermatch_retrieval\.formula_/);
 const sql=await readFile(new URL('db/tendermatch-dev/080-ranking-up.sql',root),'utf8');assert.doesNotMatch(sql,/CREATE EXTENSION|CREATE ROLE|ALTER ROLE|CREATE DATABASE|CASCADE|UPDATE (?:public|registry)\.|DELETE FROM|ALTER TABLE tendermatch_retrieval.formula/);
});
test('ephemeral Stage 5 SQL candidate ranking, immutable reuse, security and bounded query contract',{skip:!process.env.TENDERMATCH_PGLITE_ROOT},async(t)=>{
 const {PGlite}=await import(pathToFileURL(path.join(process.env.TENDERMATCH_PGLITE_ROOT,'@electric-sql/pglite/dist/index.js')).href),db=new PGlite(),c={query:async(q,v)=>{const r=await db.query(q,v);return {...r,rowCount:r.affectedRows??r.rows.length};}};
 try{
  await db.exec(`CREATE SCHEMA tendermatch_retrieval;CREATE ROLE tendermatch_result_writer NOLOGIN;GRANT USAGE ON SCHEMA tendermatch_retrieval TO tendermatch_result_writer;CREATE TABLE tendermatch_retrieval.schema_migration(version text primary key);CREATE FUNCTION tendermatch_retrieval.reject_immutable_change() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'Immutable'; END $$;
CREATE TABLE tendermatch_retrieval.normalized_feature(tenant_id text,feature_key text,PRIMARY KEY(tenant_id,feature_key));CREATE TABLE tendermatch_retrieval.normalization_snapshot(tenant_id text,normalization_id text,supplier_count int,tender_count int,PRIMARY KEY(tenant_id,normalization_id));CREATE TABLE tendermatch_retrieval.normalization_member(tenant_id text,normalization_id text,kind text,entity_id uuid,feature_key text);`);
  for(const file of ['060-eligibility-up.sql','070-formula-up.sql','080-ranking-up.sql']){const sql=await readFile(new URL('db/tendermatch-dev/'+file,root),'utf8');await assert.rejects(()=>db.exec(sql),/target mismatch/);await db.exec(sql.slice(sql.indexOf('CREATE TABLE')));}
  const seeds=[supplier(1),supplier(2,[]),tender(20),tender(21,'GOODS','medical'),tender(22,'SERVICES')],loaded=await sealSyntheticFormula(c,seeds,{register:true});
  await db.exec('GRANT SELECT ON tendermatch_retrieval.normalization_snapshot,tendermatch_retrieval.normalization_member TO tendermatch_result_writer;SET ROLE tendermatch_result_writer');await c.query("SELECT set_config('tendermatch.tenant_id',$1,false)",[TENANT]);
  const run=createRankingRun(loaded,{hash:sha('synthetic ranking code')});let first;
  await t.test('all four Formula candidates rank including three retrieval zeros; two scope exclusions stay absent',async()=>{
   assert.equal(run.extraction.extracted,5);await prepareRankingRun(c,run);first=await executeRanking(c,run);assert.equal(first.count,4);assert.equal(first.zero,3);assert.equal(first.inserted,4);
   const rb=await executeRanking(c,run,{readOnly:true,verify:true});assert.equal(rb.outcomeHash,first.outcomeHash);assert.equal(rb.formulaCandidateHash,first.formulaCandidateHash);await completeRankingRun(c,run,rb);
   const reused=createRankingRun(loaded,{hash:sha('synthetic ranking code')},{profileCache:await loadCachedProfiles(c,loaded.inputs)});assert.equal(reused.runId,run.runId);assert.deepEqual(reused.extraction,{extracted:0,reused:5});assert.equal((await prepareRankingRun(c,reused)).insertedProfiles,0);const replay=await executeRanking(c,reused);assert.equal(replay.reused,4);assert.equal(replay.evaluated,0);assert.equal(replay.inserted,0);
  });
  await t.test('bounded directional pagination and selected detail preserve independent Formula fields and all ties',async()=>{
   for(const [direction,focusId] of [['supplier',id(2)],['tender',id(21)]]){let cursor=null,rows=[];do{const p=await queryRanking(c,run,{direction,focusId,limit:1,cursor});rows.push(...p.results);cursor=p.nextCursor;}while(cursor);assert.equal(rows.length,2);assert.equal(new Set(rows.map(r=>r.supplierId+r.tenderId)).size,2);for(const r of rows){const d=await selectedRankingDetail(c,run,r);assert.deepEqual(d.formula,r.formula);assert.equal(d.retrieval.relevanceUnits,r.retrieval.units);assert.equal(d.criteria.reduce((n,x)=>n+x.points,0),r.formula.pairScore);}}
   const p=await queryRanking(c,run,{direction:'supplier',focusId:id(1),limit:1});await assert.rejects(()=>queryRanking(c,run,{direction:'supplier',focusId:id(2),cursor:p.nextCursor}),/cursor/);await assert.rejects(()=>queryRanking(c,run,{direction:'supplier',focusId:id(1),limit:101}),/bounded/);await assert.rejects(()=>queryRanking(c,run,{}),/bounded/);
   assert.equal((await selectedRankingDetail(c,run,{supplierId:id(1),tenderId:id(22)})).retrieval,null);
   const spec=rankingPageSpec(run,{direction:'supplier',focusId:id(1)});assert.match(spec.text,/LIMIT \$8/);assert.doesNotMatch(spec.text,/OFFSET/);
  });
  await t.test('changed supplier/tender recomputes only its two candidate pairs; history remains readable',async()=>{
   for(const index of [0,2]){const changed=seeds.map((seed,i)=>{if(i!==index)return seed;const body={...seed.scope,sourceHash:sha(['changed',index])};delete body.key;const s={...body,key:scopeInputKey(body)};return {scope:s,adapted:rekey({...seed.adapted,eligibilityKey:s.key,prepared:{...seed.adapted.prepared,sourceVersion:'synthetic/2'}})};});
    const nextLoaded=await sealSyntheticFormula(c,changed),next=createRankingRun(nextLoaded,{hash:sha('synthetic ranking code')},{profileCache:await loadCachedProfiles(c,nextLoaded.inputs)});assert.deepEqual(next.extraction,{extracted:1,reused:4});await prepareRankingRun(c,next);const p=await executeRanking(c,next);assert.equal(p.evaluated,2);assert.equal(p.reused,2);await completeRankingRun(c,next,p);
   }
   assert.equal((await executeRanking(c,run,{readOnly:true,verify:true})).outcomeHash,first.outcomeHash);
  });
  await t.test('DB rejects fabricated operands, cross-profile pairs, corrupted values and incomplete sealing',async()=>{
   const s=run.suppliers[0],tt=run.tenders[0],r=calculatePairRetrieval(s,tt);await assert.rejects(()=>insertRankingBatch(c,run,s,[{id:tt.id,profileKey:tt.key,inputKey:tt.formulaInputKey,result:{...r,relevanceUnits:r.relevanceUnits+1}}]),/components/);
   const fake={...s,terms:['fiction']};await assert.rejects(()=>c.query(`INSERT INTO tendermatch_retrieval.ranking_profile SELECT tenant_id,profile_key,input_key,kind,entity_id,$1 FROM tendermatch_retrieval.ranking_profile LIMIT 1`,[JSON.stringify(fake)]),/frozen/);
   const next=createRankingRun(loaded,{hash:sha('uncomputed policy')});await prepareRankingRun(c,next);await assert.rejects(()=>completeRankingRun(c,next,first),/Incomplete/);
  });
  await t.test('writer cannot mutate history, append sealed membership, cross tenants or execute owner DDL',async()=>{
   for(const q of ['UPDATE tendermatch_retrieval.ranking_pair SET relevance_units=0','DELETE FROM tendermatch_retrieval.ranking_profile','TRUNCATE tendermatch_retrieval.ranking_pair','CREATE TABLE tendermatch_retrieval.forbidden(id int)'])await assert.rejects(()=>c.query(q),/permission denied/);
   await assert.rejects(()=>c.query('INSERT INTO tendermatch_retrieval.ranking_member SELECT * FROM tendermatch_retrieval.ranking_member LIMIT 1'),/sealed/);
   await c.query("SELECT set_config('tendermatch.tenant_id','other',false)");assert.equal((await c.query('SELECT count(*)::int n FROM tendermatch_retrieval.ranking_pair')).rows[0].n,0);await assert.rejects(()=>prepareRankingRun(c,run),/row-level|no rows/);await c.query("SELECT set_config('tendermatch.tenant_id',$1,false)",[TENANT]);
  });
 }finally{await db.close();}
});
test('recorded Stage 5 frozen experiment binds unchanged code and candidate counts',{skip:!process.env.TENDERMATCH_STAGE5_EVIDENCE},async()=>{
 const proof=JSON.parse(await readFile(new URL('docs/evidence/tendermatch-stage5-inspect.json',root),'utf8'));assert.deepEqual(proof.code,await stage5CodeIdentity());assert.equal(proof.runId,sha(proof.identity));assert.equal(proof.experiment.count,707660);assert.equal(proof.replay.outcomeHash,proof.experiment.outcomeHash);assert.equal(proof.replay.formulaCandidateHash,proof.experiment.formulaCandidateHash);assert.deepEqual(proof.profileRerun,{extracted:0,reused:17450});assert.deepEqual(proof.protectedBefore,proof.protectedAfter);assert.equal(proof.noExternalModelCalls,true);
 const benchmark=JSON.parse(await readFile(new URL('docs/evidence/tendermatch-stage5-benchmark.json',root),'utf8'));assert.deepEqual(benchmark.code,proof.code);assert.equal(benchmark.execution.count,4000);assert.equal(benchmark.readback.outcomeHash,benchmark.execution.outcomeHash);assert.equal(benchmark.replay.reused,4000);assert.equal(benchmark.replay.evaluated,0);assert.equal(benchmark.visited,500);assert.match(JSON.stringify(benchmark.queries.supplierPlan),/ranking_pair_supplier/);assert.match(JSON.stringify(benchmark.queries.tenderPlan),/ranking_pair_tender/);
});
test('recorded Neon persistence, full verified readback, reuse and independent SQL audit agree',{skip:!process.env.TENDERMATCH_STAGE5_EXECUTION_EVIDENCE},async()=>{
 const p=JSON.parse(await readFile(new URL('docs/evidence/tendermatch-stage5-execute.json',root),'utf8')),i=JSON.parse(await readFile(new URL('docs/evidence/tendermatch-stage5-inspect.json',root),'utf8')),v=JSON.parse(await readFile(new URL('docs/evidence/tendermatch-stage5-validation.json',root),'utf8'));
 assert.deepEqual(p.code,await stage5CodeIdentity());assert.deepEqual(v.code,p.code);assert.equal(v.validatorHash,sha((await readFile(new URL('scripts/tendermatch-validate-stage5.mjs',root),'utf8')).replaceAll('\r\n','\n')));
 for(const pass of [p.execution,p.readback,p.rerun]){assert.equal(pass.count,707660);assert.equal(pass.zero,683653);assert.equal(pass.outcomeHash,i.experiment.outcomeHash);assert.equal(pass.formulaCandidateHash,i.experiment.formulaCandidateHash);}
 assert.equal(p.rerun.reused,707660);assert.equal(p.rerun.evaluated,0);assert.equal(p.rerun.inserted,0);assert.deepEqual(p.protectedBefore,p.protectedAfter);
 assert.deepEqual(p.rows,{ranking_profile:17450,ranking_run:1,ranking_member:17450,ranking_pair:707660,ranking_completion:1});
 assert.equal(v.sql.total,707660);assert.equal(v.sql.unique_pairs,707660);assert.equal(v.sql.invalid_components,0);assert.equal(v.sql.missing_formula,0);assert.deepEqual(v.profileReuse,{extracted:0,reused:17450});
 assert.equal(v.fullTraversals.supplier.rows,9592);assert.equal(v.fullTraversals.tender.rows,105);assert.equal(v.committedWrites,0);
 assert.equal(p.security.updateDeleteTruncateDdl,'denied');assert.equal(p.security.crossTenantRead,'zero');assert.equal(p.security.crossTenantWrite,'denied');assert.equal(p.security.committedProbeRows,0);assert.equal(p.availability.embedding_rows,0);assert.equal(p.availability.embedding_models,0);
});

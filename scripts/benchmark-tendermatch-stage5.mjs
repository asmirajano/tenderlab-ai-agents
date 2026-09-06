/** Synthetic local PGlite benchmark. Never connects to Neon or source databases. */
import {readFile,writeFile} from 'node:fs/promises';
import {pathToFileURL} from 'node:url';
import path from 'node:path';
import assert from 'node:assert/strict';
import {TENANT,sha} from './lib/tendermatch-input-manifest.mjs';
import {stage5CodeIdentity,createRankingRun,prepareRankingRun,executeRanking,completeRankingRun,queryRanking,selectedRankingDetail,rankingPageSpec,TABLES} from './lib/tendermatch-stage5.mjs';
import {supplier,tender,id,sealSyntheticFormula} from '../tests/fixtures/tendermatch-stage5.mjs';
const root=new URL('../',import.meta.url);
const pglite=process.env.TENDERMATCH_PGLITE_ROOT;if(!pglite)throw new Error('Explicit local PGlite dependency required');
const {PGlite}=await import(pathToFileURL(path.join(pglite,'@electric-sql/pglite/dist/index.js')).href),db=new PGlite();
const c={query:async(q,v)=>{const r=await db.query(q,v);return {...r,rowCount:r.affectedRows??r.rows.length};}};
const elapsed=async(fn)=>{const start=performance.now(),result=await fn();return {result,elapsedMs:Math.round((performance.now()-start)*100)/100};};
try{
 await db.exec(`CREATE SCHEMA tendermatch_retrieval;CREATE ROLE tendermatch_result_writer NOLOGIN;GRANT USAGE ON SCHEMA tendermatch_retrieval TO tendermatch_result_writer;CREATE TABLE tendermatch_retrieval.schema_migration(version text primary key);CREATE FUNCTION tendermatch_retrieval.reject_immutable_change() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'Immutable'; END $$;
CREATE TABLE tendermatch_retrieval.normalized_feature(tenant_id text,feature_key text,PRIMARY KEY(tenant_id,feature_key));CREATE TABLE tendermatch_retrieval.normalization_snapshot(tenant_id text,normalization_id text,supplier_count int,tender_count int,PRIMARY KEY(tenant_id,normalization_id));CREATE TABLE tendermatch_retrieval.normalization_member(tenant_id text,normalization_id text,kind text,entity_id uuid,feature_key text);`);
 for(const file of ['060-eligibility-up.sql','070-formula-up.sql','080-ranking-up.sql']){const sql=await readFile(new URL('db/tendermatch-dev/'+file,root),'utf8');await db.exec(sql.slice(sql.indexOf('CREATE TABLE')));}
 const seeds=[...Array.from({length:8},(_,n)=>supplier(n+1,n%3===0?[]:undefined)),...Array.from({length:500},(_,n)=>tender(n+10000,'GOODS',n%2?'medical supplies':'transformers electrical steel'))];
 const fixture=await elapsed(()=>sealSyntheticFormula(c,seeds,{register:true}));
 await db.exec('SET ROLE tendermatch_result_writer');await c.query("SELECT set_config('tendermatch.tenant_id',$1,false)",[TENANT]);
 const code=await stage5CodeIdentity(),profileStart=performance.now(),run=createRankingRun(fixture.result,code),profileMs=performance.now()-profileStart;
 const preparation=await elapsed(()=>prepareRankingRun(c,run)),execution=await executeRanking(c,run),readback=await executeRanking(c,run,{readOnly:true,verify:true});assert.equal(execution.count,4000);assert.equal(execution.outcomeHash,readback.outcomeHash);await completeRankingRun(c,run,readback);
 const replay=await executeRanking(c,run);assert.equal(replay.reused,4000);assert.equal(replay.evaluated,0);
 // Analyze is fixture-owner maintenance only. Production runner does not issue it.
 await db.exec('RESET ROLE;ANALYZE tendermatch_retrieval.ranking_pair;ANALYZE tendermatch_retrieval.ranking_member;SET ROLE tendermatch_result_writer');
 const queries={};for(const [direction,focusId] of [['supplier',id(2)],['tender',id(10000)]]){
  const measured=await elapsed(()=>queryRanking(c,run,{direction,focusId,limit:25})),page=measured.result;
  queries[direction]={elapsedMs:measured.elapsedMs,rows:page.results.length,bytes:Buffer.byteLength(JSON.stringify(page)),hasMore:page.hasMore};
  for(const pair of page.results){const detail=await selectedRankingDetail(c,run,pair);assert.deepEqual(detail.formula,pair.formula);assert.equal(detail.retrieval.relevanceUnits,pair.retrieval.units);}
  const spec=rankingPageSpec(run,{direction,focusId,limit:25});queries[`${direction}Plan`]=(await c.query('EXPLAIN (ANALYZE,BUFFERS,FORMAT JSON) '+spec.text,spec.values)).rows[0]['QUERY PLAN'];
 }
 let cursor=null,visited=0;do{const p=await queryRanking(c,run,{direction:'supplier',focusId:id(2),limit:100,cursor});visited+=p.results.length;cursor=p.nextCursor;}while(cursor);assert.equal(visited,500);
 const storage=(await c.query(`SELECT c.relname table_name,pg_total_relation_size(c.oid)::text total_bytes,pg_relation_size(c.oid)::text heap_bytes FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='tendermatch_retrieval' AND c.relname=ANY($1::text[]) ORDER BY c.relname`,[TABLES])).rows;
 const report={evidenceClass:'SYNTHETIC_LOCAL_PGLITE_NOT_NEON',stage:5,code,fixtureSourceHash:sha(await readFile(new URL('tests/fixtures/tendermatch-stage5.mjs',root),'utf8')),runId:run.runId,identity:run.identity,fixtureMs:fixture.elapsedMs,profileMs,preparation,execution,readback,replay,queries,storage,visited,sourceConnections:0,externalModelCalls:0};
 await writeFile(new URL('docs/evidence/tendermatch-stage5-benchmark.json',root),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({runId:run.runId,profileMs,preparationMs:preparation.elapsedMs,executionMs:execution.elapsedMs,readbackMs:readback.elapsedMs,replayMs:replay.elapsedMs,count:execution.count,queries,storage}));
}finally{await db.close();}

import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";
import path from "node:path";
import {pathToFileURL} from "node:url";
import test from "node:test";
import {createTenderMatchPostgresStore,HYBRID_RETRIEVAL_SQL} from "../scripts/lib/tendermatch-retrieval-postgres.mjs";
import {runDurableScoring,requestDurableAssessment} from "../scripts/lib/tendermatch-durable-pipeline.mjs";
import {normalizeSupplierFeatures,normalizeTenderFeatures,TENDERMATCH_FEATURE_VERSION} from "../packages/tendermatch/src/retrieval-features.ts";
import {runtimeTenders} from "../packages/tendermatch/src/pilot-data.ts";
import {TENDERMATCH_MATCH_ENGINE_VERSION} from "../packages/tendermatch/src/exploratory-matching.ts";

const migrationUrl=new URL("../db/migrations/20260905_tendermatch_retrieval.sql",import.meta.url);
const now="2026-09-05T10:00:00.000Z";

test("retrieval SQL confines reads to tenant/run/model and bounded candidate channels",async()=>{
  const sql=await readFile(migrationUrl,"utf8");
  assert.match(sql,/CREATE EXTENSION IF NOT EXISTS vector/);assert.match(sql,/embedding vector\(384\)/);
  assert.match(sql,/PARTITION BY LIST \(model_version\)/);assert.match(sql,/vector_cosine_ops\) WITH \(m=16,ef_construction=64\)/);
  assert.match(sql,/CHECK\(denominator=100\)/);assert.match(sql,/immutable_pair_score/);assert.match(sql,/ENABLE ROW LEVEL SECURITY/);
  assert.match(HYBRID_RETRIEVAL_SQL,/r\.run_id=\$2 and r\.eligibility='ELIGIBLE'/);
  assert.match(HYBRID_RETRIEVAL_SQL,/e\.tenant_id=\$1 and e\.model_version=\$4/);
  assert.equal((HYBRID_RETRIEVAL_SQL.match(/limit \$9/g)??[]).length,3);
  assert.match(HYBRID_RETRIEVAL_SQL,/union all/);assert.doesNotMatch(HYBRID_RETRIEVAL_SQL,/update|delete|set pair_score/i);
});

test("Postgres adapter rejects universe reads, oversized vectors and invalid score writes before query",async()=>{
  const pool={connect:async()=>({query:async()=>({rows:[],rowCount:0}),release(){}})};
  const store=createTenderMatchPostgresStore(pool,{tenantId:"test"});
  await assert.rejects(()=>store.listPairs({runId:"r"}),/focus/);
  await assert.rejects(()=>store.listPairs({runId:"r",supplierId:"s",limit:1000}),/limit/);
  await assert.rejects(()=>store.putEmbedding({featureKey:"x",modelVersion:"m",inputHash:"a".repeat(64),embedding:[1]}),/384/);
  await assert.rejects(()=>store.putScores("r",[{pairScore:null,denominator:100,retrievalScore:null,eligibility:{state:"ELIGIBLE"}}]),/Formula/);
});

// Optional transient PostgreSQL runtime; no database URL or production credentials.
// Install PGlite0.5.3 + pglite-pgvector0.0.4 into a TEMP directory, then set
// TENDERMATCH_PGLITE_ROOT to that directory's node_modules. Standard suite records
// a clear skip if the optional local facility is absent. The release evidence
// records the explicit run with the real pgvector0.8.1 extension enabled.
test("transient PostgreSQL/pgvector: migration, durable scoring, cache, retrieval and assessment slice",{skip:!process.env.TENDERMATCH_PGLITE_ROOT},async(t)=>{
  const modules=process.env.TENDERMATCH_PGLITE_ROOT;
  const {PGlite}=await import(pathToFileURL(path.join(modules,"@electric-sql/pglite/dist/index.js")).href);
  const {vector}=await import(pathToFileURL(path.join(modules,"@electric-sql/pglite-pgvector/dist/index.js")).href);
  const db=new PGlite({extensions:{vector}});
  const pool={connect:async()=>({query:async(sql,args)=>{const result=await db.query(sql,args);return {...result,rowCount:result.affectedRows??result.rows.length};},release(){}})};
  const store=createTenderMatchPostgresStore(pool,{tenantId:"tenant-test"});
  const snapshot=JSON.parse(await readFile(new URL("../apps/tender-apps/public/tendermatch/data/supplier-runtime-v1.3.json",import.meta.url),"utf8"));
  const evidence=JSON.parse(await readFile(new URL("../apps/tender-apps/public/tendermatch/data/supplier-evidence-v1.3.json",import.meta.url),"utf8")).evidenceBySupplier;
  const profiles=snapshot.suppliers.filter(s=>s.classification==="GOODS").slice(0,2);
  const suppliers=profiles.map(p=>normalizeSupplierFeatures(p,evidence[p.canonicalEntityId]??[]));
  const tenders=Array.from({length:4},(_,i)=>normalizeTenderFeatures({...runtimeTenders[0],id:`tender-sql-${i}`,title:i===0?"Refrigerators and electrical transformers":"Supply of medical equipment",description:"Nonconfidential SQL test fixture",object:i===3?"WORKS":"GOODS",procurementType:i===3?"WORKS":"GOODS",tags:[i===0?"electrical":"medical"]}));
  const args={store,tenantId:"tenant-test",runId:"run-sql-1",tenders,suppliers,evaluatedAt:now,now:()=>now,batchSize:2};
  let initial;
  try {
    await t.test("migration executes and installs pgvector with an isolated HNSW model partition",async()=>{
      await db.exec(await readFile(migrationUrl,"utf8"));
      const version=(await db.query("select extversion from pg_extension where extname='vector'")).rows[0].extversion;
      assert.match(version,/^0\.8\./);
      await db.exec("insert into tendermatch_retrieval.embedding_model(model_version,dimensions,provider,enabled) values('test-384-v1',384,'synthetic-integration-test',true); create table tendermatch_retrieval.test_embedding_partition partition of tendermatch_retrieval.feature_embedding for values in ('test-384-v1');");
      const indexes=(await db.query("select indexdef from pg_indexes where schemaname='tendermatch_retrieval' and tablename='test_embedding_partition'")).rows;
      assert.ok(indexes.some(row=>/hnsw.*vector_cosine_ops.*m='16'.*ef_construction='64'/.test(row.indexdef)));
    });
    await t.test("durable batches resume and retain all numeric Formula pairs exactly once",async()=>{
      const partial=await runDurableScoring({...args,maxBatches:1});assert.equal(partial.complete,false);assert.equal(partial.total,2);assert.equal(partial.status,"SCORING");
      initial=await runDurableScoring(args);assert.equal(initial.complete,true);assert.equal(initial.total,8);assert.equal(initial.eligible,6);assert.equal(initial.status,"COMPLETE");
      assert.equal((await db.query("select count(distinct (supplier_id,tender_id))::int count from tendermatch_retrieval.run_pair")).rows[0].count,8);
      assert.equal((await runDurableScoring(args)).calculated,0);
    });
    await t.test("keyset pages and selected-pair records agree, with explicit eligibility",async()=>{
      const first=await store.listPairs({runId:args.runId,supplierId:suppliers[0].id,limit:2});assert.equal(first.records.length,2);assert.ok(first.nextCursor);
      const second=await store.listPairs({runId:args.runId,supplierId:suppliers[0].id,limit:2,cursor:first.nextCursor});assert.equal(second.records.length,2);assert.equal(second.nextCursor,null);
      assert.equal(new Set([...first.records,...second.records].map(r=>r.key)).size,4);
      const selected=await store.selectedPair({runId:args.runId,supplierId:suppliers[0].id,tenderId:first.records[0].tenderId});assert.deepEqual(selected.record,first.records[0]);
      assert.equal([...first.records,...second.records].find(r=>r.tenderId==="tender-sql-3").eligibility.state,"INELIGIBLE");
      const otherTenant=createTenderMatchPostgresStore(pool,{tenantId:"tenant-other"});assert.equal((await otherTenant.listPairs({runId:args.runId,supplierId:suppliers[0].id})).records.length,0);
    });
    await t.test("cache immutability and new input versions retain history",async()=>{
      const one=(await store.listPairs({runId:args.runId,supplierId:suppliers[0].id,limit:1})).records[0];
      await assert.rejects(()=>store.putScores(args.runId,[{...one,pairScore:one.pairScore===100?99:one.pairScore+1}]),/collision/);
      for(const field of ["policyVersion","supplierVersion","tenderVersion","evidenceSnapshot","mainLimitation"]) {
        await assert.rejects(()=>store.putScores(args.runId,[{...one,[field]:`${one[field]}-changed`}]),/collision/);
      }
      await assert.rejects(()=>store.putScores(args.runId,[{...one,eligibility:{...one.eligibility,reasonCodes:["CHANGED_PROVENANCE"]}}]),/collision/);
      await assert.rejects(()=>db.query("update tendermatch_retrieval.pair_score set pair_score=0"),/Immutable/);
      const added=normalizeTenderFeatures({...runtimeTenders[0],id:"new-tender",title:"Refrigerators",object:"GOODS",procurementType:"GOODS",tags:[]});
      const next=await runDurableScoring({...args,runId:"run-sql-2",tenders:[...tenders,added],fromRunId:args.runId,changedTenderIds:[added.id],changedSupplierIds:[]});
      assert.equal(next.inherited,8);assert.equal(next.calculated,2);assert.equal(next.total,10);assert.equal(next.complete,true);
      assert.equal((await store.runSummary(args.runId)).total,8);
      await assert.rejects(()=>store.beginRun({runId:args.runId,formulaVersion:TENDERMATCH_MATCH_ENGINE_VERSION,featureVersion:TENDERMATCH_FEATURE_VERSION,inputIdentity:"wrong",evaluatedAt:now}),/different pinned/);
    });
    await t.test("hybrid query executes with actual vectors and lexical fallback, without changing Formula",async()=>{
      const vectorA=Array.from({length:384},(_,i)=>i===0?1:0);const vectorB=Array.from({length:384},(_,i)=>i===1?1:0);
      for(const [i,feature] of tenders.entries())await store.putEmbedding({featureKey:feature.featureKey,modelVersion:"test-384-v1",inputHash:feature.contentHash,embedding:i===0?vectorA:vectorB});
      const semantic=await store.retrieveCandidates({runId:args.runId,queryFeatureKey:suppliers[0].featureKey,modelVersion:"test-384-v1",embedding:vectorA,queryText:"refrigerators",concepts:["electrical"],limit:3});
      assert.equal(semantic.semanticState,"READY");assert.equal(semantic.results[0].tenderId,"tender-sql-0");assert.equal(semantic.results[0].semanticSimilarity,1);assert.ok(semantic.results.every(r=>r.tenderId!=="tender-sql-3"));
      await store.saveRetrieval({runId:args.runId,requestId:"test-retrieval",modelVersion:"test-384-v1",results:semantic.results,retrievedAt:now});
      const lexical=await store.retrieveCandidates({runId:args.runId,queryFeatureKey:suppliers[0].featureKey,queryText:"refrigerators",concepts:["electrical"],limit:3});assert.equal(lexical.semanticState,"DISABLED");assert.equal(lexical.results[0].tenderId,"tender-sql-0");
      const row=await store.selectedPair({runId:args.runId,supplierId:suppliers[0].id,tenderId:"tender-sql-0"});assert.equal(row.record.retrievalScore,null);assert.ok(Number.isInteger(row.record.pairScore));
    });
    await t.test("retrieval retry preserves the original payload and clock, and refuses drift or cross-run membership",async()=>{
      const vectorA=Array.from({length:384},(_,i)=>i===0?1:0);
      const retrieval=await store.retrieveCandidates({runId:args.runId,queryFeatureKey:suppliers[0].featureKey,modelVersion:"test-384-v1",embedding:vectorA,queryText:"refrigerators",concepts:["electrical"],limit:3});
      const request={runId:args.runId,requestId:"retry-test",modelVersion:"test-384-v1",results:retrieval.results,retrievedAt:now};
      assert.equal(await store.saveRetrieval(request),retrieval.results.length);
      assert.equal(await store.saveRetrieval({...request,results:[...retrieval.results].reverse(),retrievedAt:"2026-09-05T11:00:00Z"}),0);
      const stored=(await db.query("select retrieved_at from tendermatch_retrieval.retrieval_request where request_id='retry-test'")).rows[0];
      assert.equal(new Date(stored.retrieved_at).toISOString(),now);
      await assert.rejects(()=>store.saveRetrieval({...request,results:retrieval.results.slice(0,1)}),/different result/);
      await assert.rejects(()=>store.saveRetrieval({...request,results:retrieval.results.map((r,i)=>i===0?{...r,retrievalScore:r.retrievalScore+.001}:r)}),/different result/);
      await assert.rejects(()=>store.saveRetrieval({...request,results:[...retrieval.results,retrieval.results[0]]}),/duplicate/);
      const blocked=await store.selectedPair({runId:args.runId,supplierId:suppliers[0].id,tenderId:"tender-sql-3"});
      await assert.rejects(()=>store.saveRetrieval({...request,requestId:"blocked",results:[{...retrieval.results[0],cacheKey:blocked.record.cacheKey,tenderId:blocked.record.tenderId}]}),/eligible pairs/);
      await assert.rejects(()=>store.saveRetrieval({...request,runId:"missing-run"}),/eligible pairs/);
      await assert.rejects(()=>db.query("update tendermatch_retrieval.retrieval_result set relevance=0"),/Immutable/);
    });
    await t.test("semantic model partitions and row-level tenant policy remain isolated",async()=>{
      await db.exec("insert into tendermatch_retrieval.embedding_model(model_version,dimensions,provider,enabled) values('test-384-v2',384,'synthetic-integration-test',true); create table tendermatch_retrieval.test_embedding_partition_v2 partition of tendermatch_retrieval.feature_embedding for values in ('test-384-v2');");
      const result=await store.retrieveCandidates({runId:args.runId,queryFeatureKey:suppliers[0].featureKey,modelVersion:"test-384-v2",embedding:Array.from({length:384},(_,i)=>i===0?1:0)});
      assert.deepEqual(result.results,[]);
      await db.exec("create role tendermatch_transient_reader nologin; grant usage on schema tendermatch_retrieval to tendermatch_transient_reader; grant select on all tables in schema tendermatch_retrieval to tendermatch_transient_reader; set role tendermatch_transient_reader;");
      try {
        await db.query("select set_config('tendermatch.tenant_id','tenant-other',false)");
        assert.equal((await db.query("select count(*)::integer count from tendermatch_retrieval.pair_score")).rows[0].count,0);
        await db.query("select set_config('tendermatch.tenant_id','tenant-test',false)");
        assert.equal((await db.query("select count(*)::integer count from tendermatch_retrieval.pair_score")).rows[0].count,10);
      } finally {await db.exec("reset role;");}
    });
    await t.test("disabled assessment is truthful, queue lease is exclusive and provider artifact is separate",async()=>{
      const request={store,tenantId:"tenant-test",runId:args.runId,supplierId:suppliers[0].id,tenderId:"tender-sql-0",now,openedBy:"test-reviewer"};
      const disabled=await requestDurableAssessment(request);assert.equal(disabled.assessment.state,"DISABLED");
      assert.equal(await store.claimAssessment({runId:args.runId,providerVersion:"absent",worker:"w",now}),null);
      const pending=await requestDurableAssessment({...request,providerVersion:"test-provider"});assert.equal(pending.assessment.state,"QUEUED");
      assert.equal((await requestDurableAssessment({...request,providerVersion:"test-provider"})).assessment.id,pending.assessment.id);
      const lease=await store.claimAssessment({runId:args.runId,providerVersion:"test-provider",worker:"w1",now,leaseMs:1_000});assert.ok(lease);
      assert.equal(await store.claimAssessment({runId:args.runId,providerVersion:"test-provider",worker:"w2",now}),null);
      const reclaimed=await store.claimAssessment({runId:args.runId,providerVersion:"test-provider",worker:"w2",now:"2026-09-05T10:00:01.001Z"});assert.equal(reclaimed.attempts,2);
      await assert.rejects(()=>store.failAssessment({jobId:lease.id,token:lease.lease.token,now:"2026-09-05T10:00:01.002Z",retryable:false,reasonCode:"TEST_FAILED"}),/lost/);
      const artifact={id:"artifact-sql-test",jobId:reclaimed.id,identity:reclaimed.identity,schemaVersion:reclaimed.schemaVersion,providerVersion:"test-provider",modelVersion:"synthetic-test",promptVersion:"test-v1",inputHash:"a".repeat(64),createdAt:"2026-09-05T10:00:01.002Z",assessment:{summary:"Synthetic test of adapter storage only",findings:[],limitations:["No live model was called"]},authority:"ADVISORY_ONLY"};
      const finished=await store.completeAssessment({jobId:reclaimed.id,token:reclaimed.lease.token,now:artifact.createdAt,artifact});assert.equal(finished.state,"SUCCEEDED");
      assert.deepEqual(await store.assessmentArtifact({jobId:reclaimed.id,artifactId:artifact.id}),artifact);
      assert.equal((await store.selectedPair(request)).record.pairScore,disabled.record.pairScore);
    });
    await t.test("scoring leases guard atomic checkpoint completion",async()=>{
      await store.enqueueBatch({runId:args.runId,batchId:"lease-test",inputIdentity:initial.inputIdentity,cursor:{supplierId:suppliers[0].id,tenderIds:[]}});
      const first=await store.claimBatch({runId:args.runId,worker:"worker-a",now,leaseMs:1_000});assert.ok(first);
      assert.equal(await store.claimBatch({runId:args.runId,worker:"worker-b",now}),null);
      await assert.rejects(()=>store.completeBatch({runId:args.runId,batchId:first.batch_id,token:"wrong-token",now,cursor:first.cursor,records:[]}),/lost/);
      const next=await store.claimBatch({runId:args.runId,worker:"worker-b",now:"2026-09-05T10:00:01.001Z"});assert.equal(next.attempts,2);
      assert.equal(await store.completeBatch({runId:args.runId,batchId:next.batch_id,token:next.lease_token,now:"2026-09-05T10:00:01.002Z",cursor:next.cursor,records:[]}),0);
    });
  } finally {await db.close();}
});

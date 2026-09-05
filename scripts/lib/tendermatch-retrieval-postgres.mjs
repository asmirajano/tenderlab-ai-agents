import { randomUUID } from "node:crypto";
import { ASSESSMENT_POLICY_VERSION, ASSESSMENT_SCHEMA_VERSION } from "../../packages/tendermatch/src/selective-assessment.ts";
import { RETRIEVAL_POLICY_VERSION, EMBEDDING_DIMENSIONS } from "../../packages/tendermatch/src/retrieval-ranking.ts";
import { sha256Content, stableStringify } from "../../packages/tendermatch/src/retrieval-features.ts";

const schema = "tendermatch_retrieval";
const states = new Set(["ELIGIBLE", "INELIGIBLE", "OUTSIDE_SCORING_SCOPE"]);
const textId = (value, name) => { if (typeof value !== "string" || !value.trim() || value.length > 512) throw new Error(`${name} is required and bounded.`); return value; };
const limitOf = (value, maximum = 100) => { if (!Number.isInteger(value) || value < 1 || value > maximum) throw new Error(`limit must be an integer from 1 to ${maximum}.`); return value; };
const clock = (value) => { if (!Number.isFinite(Date.parse(value))) throw new Error("Explicit valid clock required."); return value; };
function featureVector(value) {
  if (!Array.isArray(value) || value.length !== EMBEDDING_DIMENSIONS || value.some((n) => !Number.isFinite(n)) || value.every((n) => n === 0)) throw new Error("A finite nonzero 384-dimensional embedding is required.");
  return `[${value.join(",")}]`;
}
function scoreFromRow(row, runId) {
  return { id: `compact-pair:${row.cache_key}`, cacheKey: row.cache_key, key: `${row.tender_id}::${row.supplier_id}`,
    supplierId: row.supplier_id, tenderId: row.tender_id, pairScore: row.pair_score, denominator: row.denominator,
    dataCoverage: row.data_coverage, evidenceConfidence: row.evidence_confidence, assessedFitScore: row.assessed_fit_score,
    supplierVersion: row.supplier_version, tenderVersion: row.tender_version, supplierFeatureHash: row.supplier_feature_hash, tenderFeatureHash: row.tender_feature_hash,
    formulaVersion: row.formula_version, policyVersion: row.policy_version, featureVersion: row.feature_version, evidenceSnapshot: row.evidence_snapshot,
    mainLimitation: row.main_limitation, eligibility: { state: row.eligibility, reasonCodes: row.eligibility_reasons },
    evaluatedAt: new Date(row.evaluated_at).toISOString(), runId, retrievalScore: null };
}
function jobFromRow(row) {
  if (!row) return null;
  return { id: row.job_id, idempotencyKey: row.idempotency_key, identity: row.identity, policyVersion: row.policy_version, schemaVersion: row.schema_version,
    providerVersion: row.provider_version, reasons: row.reasons, state: row.state, revision: row.revision, attempts: row.attempts, maxAttempts: row.max_attempts,
    createdAt: new Date(row.created_at).toISOString(), updatedAt: new Date(row.updated_at).toISOString(), nextAttemptAt: row.next_attempt_at ? new Date(row.next_attempt_at).toISOString() : null,
    lease: row.lease_token ? { token: row.lease_token, owner: row.lease_owner, expiresAt: new Date(row.lease_expires_at).toISOString() } : null,
    lastError: row.last_error, artifactId: row.artifact_id };
}

/** Inject a node-postgres Pool (or transient test adapter). No secrets are read and
 * no database connection/migration is started by importing this module.
 * tenantId must be resolved by trusted server authentication, never query input.
 */
export function createTenderMatchPostgresStore(pool, { tenantId }) {
  textId(tenantId, "tenantId");
  async function transaction(operation) {
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      await client.query("select set_config('tendermatch.tenant_id',$1,true), set_config('statement_timeout','30000',true)", [tenantId]);
      const result = await operation(client); await client.query("COMMIT"); return result;
    } catch (error) { try { await client.query("ROLLBACK"); } catch { /* Preserve the original error. */ } throw error; }
    finally { client.release(); }
  }
  async function beginRun(run) {
    textId(run.runId, "runId"); textId(run.formulaVersion, "formulaVersion"); textId(run.featureVersion, "featureVersion"); textId(run.inputIdentity, "inputIdentity"); clock(run.evaluatedAt);
    return transaction(async (client) => {
      await client.query(`insert into ${schema}.evaluation_run(tenant_id,run_id,formula_version,feature_version,input_identity,evaluated_at) values($1,$2,$3,$4,$5,$6) on conflict do nothing`, [tenantId,run.runId,run.formulaVersion,run.featureVersion,run.inputIdentity,run.evaluatedAt]);
      const result = await client.query(`select * from ${schema}.evaluation_run where tenant_id=$1 and run_id=$2`, [tenantId,run.runId]);
      const row = result.rows[0];
      if (row.formula_version !== run.formulaVersion || row.feature_version !== run.featureVersion || row.input_identity !== run.inputIdentity || new Date(row.evaluated_at).toISOString() !== new Date(run.evaluatedAt).toISOString()) throw new Error("Run identity already exists with different pinned inputs.");
      return row;
    });
  }
  async function putFeatures(runId, features) {
    textId(runId, "runId"); if (features.length > 500) throw new Error("Feature writes are limited to batches of 500.");
    if (!features.length) return 0;
    for (const feature of features) { textId(feature.featureKey, "featureKey"); if (!["supplier","tender"].includes(feature.kind)) throw new Error("Invalid feature kind."); }
    return transaction(async (client) => {
      const values = JSON.stringify(features);
      const result = await client.query(`with incoming as (select value f from jsonb_array_elements($2::jsonb))
        insert into ${schema}.normalized_feature(tenant_id,feature_key,kind,entity_id,input_version,feature_version,evidence_snapshot,content_hash,procurement_type,geography,terms,concepts,feature)
        select $1,f->>'featureKey',f->>'kind',f->>'id',f->>'sourceVersion',f->>'featureVersion',f->>'evidenceSnapshot',f->>'contentHash',f->>'procurementType',
          array(select jsonb_array_elements_text(f->'geography')),array(select jsonb_array_elements_text(f->'terms')),array(select jsonb_array_elements_text(f->'concepts')),f from incoming on conflict do nothing returning feature_key`, [tenantId,values]);
      const conflicts = await client.query(`select count(*)::integer as count from jsonb_array_elements($2::jsonb) i join ${schema}.normalized_feature f on f.tenant_id=$1 and f.feature_key=i->>'featureKey' where f.feature <> i`, [tenantId,values]);
      if (conflicts.rows[0].count) throw new Error("Immutable normalized feature collision.");
      await client.query(`insert into ${schema}.run_feature(tenant_id,run_id,kind,entity_id,feature_key)
        select $1,$2,i->>'kind',i->>'id',i->>'featureKey' from jsonb_array_elements($3::jsonb) i on conflict do nothing`, [tenantId,runId,values]);
      const drift = await client.query(`select count(*)::integer count from jsonb_array_elements($3::jsonb) i join ${schema}.run_feature f on f.tenant_id=$1 and f.run_id=$2 and f.kind=i->>'kind' and f.entity_id=i->>'id' where f.feature_key<>i->>'featureKey'`, [tenantId,runId,values]);
      if (drift.rows[0].count) throw new Error("Run feature identity is immutable; start a new input run.");
      return result.rowCount;
    });
  }
  async function putEmbedding({ featureKey, modelVersion, inputHash, embedding }) {
    const vector = featureVector(embedding);
    return transaction(async (client) => {
      const model = await client.query(`select dimensions,enabled from ${schema}.embedding_model where model_version=$1`, [textId(modelVersion,"modelVersion")]);
      if (!model.rows[0]?.enabled || model.rows[0].dimensions !== EMBEDDING_DIMENSIONS) throw new Error("Embedding model/version is not explicitly enabled.");
      const result = await client.query(`insert into ${schema}.feature_embedding(model_version,tenant_id,feature_key,input_hash,embedding) values($1,$2,$3,$4,$5::vector) on conflict do nothing returning feature_key`, [modelVersion,tenantId,featureKey,inputHash,vector]);
      const existing = await client.query(`select input_hash, embedding=$4::vector as same from ${schema}.feature_embedding where model_version=$1 and tenant_id=$2 and feature_key=$3`,[modelVersion,tenantId,featureKey,vector]);
      if (existing.rows[0].input_hash !== inputHash || !existing.rows[0].same) throw new Error("Embedding identity collision; register a new model/input version.");
      return result.rowCount === 1;
    });
  }
  async function writeScores(client, runId, records) {
    if (records.length > 1_000) throw new Error("Score writes are limited to batches of 1,000.");
    if (!records.length) return 0;
    for (const row of records) {
      if (!Number.isInteger(row.pairScore) || row.pairScore<0 || row.pairScore>100 || row.denominator!==100 || row.retrievalScore!==null || !states.has(row.eligibility.state)) throw new Error("Invalid immutable Formula record.");
    }
    const values = JSON.stringify(records);
    const run = await client.query(`select formula_version,feature_version from ${schema}.evaluation_run where tenant_id=$1 and run_id=$2`,[tenantId,runId]);
    if (!run.rows[0] || records.some((row) => row.formulaVersion!==run.rows[0].formula_version || row.featureVersion!==run.rows[0].feature_version)) throw new Error("Score formula/feature versions do not match this run.");
    const result = await client.query(`with incoming as (select value i from jsonb_array_elements($2::jsonb))
      insert into ${schema}.pair_score(tenant_id,cache_key,supplier_id,tender_id,pair_score,denominator,data_coverage,evidence_confidence,assessed_fit_score,supplier_version,tender_version,supplier_feature_hash,tender_feature_hash,formula_version,policy_version,feature_version,evidence_snapshot,main_limitation,eligibility,eligibility_reasons,evaluated_at)
      select $1,i->>'cacheKey',i->>'supplierId',i->>'tenderId',(i->>'pairScore')::smallint,100,(i->>'dataCoverage')::smallint,(i->>'evidenceConfidence')::smallint,(i->>'assessedFitScore')::smallint,
        i->>'supplierVersion',i->>'tenderVersion',i->>'supplierFeatureHash',i->>'tenderFeatureHash',i->>'formulaVersion',i->>'policyVersion',i->>'featureVersion',i->>'evidenceSnapshot',i->>'mainLimitation',i->'eligibility'->>'state',array(select jsonb_array_elements_text(i->'eligibility'->'reasonCodes')),(i->>'evaluatedAt')::timestamptz from incoming
      on conflict do nothing returning cache_key`,[tenantId,values]);
    const collisions = await client.query(`select count(*)::integer count from jsonb_array_elements($2::jsonb) i join ${schema}.pair_score s on s.tenant_id=$1 and s.cache_key=i->>'cacheKey'
      where (s.supplier_id,s.tender_id,s.pair_score,s.denominator,s.data_coverage,s.evidence_confidence,s.assessed_fit_score,s.formula_version,s.policy_version,s.feature_version,s.supplier_version,s.tender_version,s.supplier_feature_hash,s.tender_feature_hash,s.evidence_snapshot,s.main_limitation,s.eligibility,s.eligibility_reasons)
      is distinct from (i->>'supplierId',i->>'tenderId',(i->>'pairScore')::smallint,(i->>'denominator')::smallint,(i->>'dataCoverage')::smallint,(i->>'evidenceConfidence')::smallint,(i->>'assessedFitScore')::smallint,i->>'formulaVersion',i->>'policyVersion',i->>'featureVersion',i->>'supplierVersion',i->>'tenderVersion',i->>'supplierFeatureHash',i->>'tenderFeatureHash',i->>'evidenceSnapshot',i->>'mainLimitation',i->'eligibility'->>'state',array(select jsonb_array_elements_text(i->'eligibility'->'reasonCodes')))`,[tenantId,values]);
    if (collisions.rows[0].count) throw new Error("Immutable Formula cache collision.");
    await client.query(`insert into ${schema}.run_pair(tenant_id,run_id,supplier_id,tender_id,cache_key,pair_score,eligibility)
      select $1,$2,i->>'supplierId',i->>'tenderId',i->>'cacheKey',(i->>'pairScore')::smallint,i->'eligibility'->>'state' from jsonb_array_elements($3::jsonb) i on conflict do nothing`,[tenantId,runId,values]);
    const drift = await client.query(`select count(*)::integer count from jsonb_array_elements($3::jsonb) i join ${schema}.run_pair r on r.tenant_id=$1 and r.run_id=$2 and r.supplier_id=i->>'supplierId' and r.tender_id=i->>'tenderId' where r.cache_key<>i->>'cacheKey'`,[tenantId,runId,values]);
    if (drift.rows[0].count) throw new Error("Run pair membership is immutable; start a new run.");
    return result.rowCount;
  }
  const putScores = (runId,records) => transaction((client) => writeScores(client,textId(runId,"runId"),records));
  async function getCachedScores(cacheKeys) {
    if (cacheKeys.length>1_000) throw new Error("Cache reads are limited to 1,000 keys.");
    return transaction(async (client) => (await client.query(`select * from ${schema}.pair_score where tenant_id=$1 and cache_key=any($2::text[])`,[tenantId,cacheKeys])).rows.map((row)=>scoreFromRow(row,"cache-reuse")));
  }
  async function inheritScores({runId,fromRunId}) {
    return transaction(async(client)=>(await client.query(`insert into ${schema}.run_pair(tenant_id,run_id,supplier_id,tender_id,cache_key,pair_score,eligibility)
      select p.tenant_id,$2,p.supplier_id,p.tender_id,p.cache_key,p.pair_score,p.eligibility from ${schema}.run_pair p
      join ${schema}.pair_score s on s.tenant_id=p.tenant_id and s.cache_key=p.cache_key
      join ${schema}.evaluation_run r on r.tenant_id=p.tenant_id and r.run_id=$2 and r.formula_version=s.formula_version and r.feature_version=s.feature_version
      join ${schema}.run_feature sf on sf.tenant_id=p.tenant_id and sf.run_id=$2 and sf.kind='supplier' and sf.entity_id=p.supplier_id and sf.feature_key=s.supplier_feature_hash
      join ${schema}.run_feature tf on tf.tenant_id=p.tenant_id and tf.run_id=$2 and tf.kind='tender' and tf.entity_id=p.tender_id and tf.feature_key=s.tender_feature_hash
      where p.tenant_id=$1 and p.run_id=$3 on conflict do nothing returning cache_key`,[tenantId,textId(runId,"runId"),textId(fromRunId,"fromRunId")])).rowCount);
  }
  async function runSummary(runId) {
    return transaction(async(client)=>{
      const run=(await client.query(`select status from ${schema}.evaluation_run where tenant_id=$1 and run_id=$2`,[tenantId,runId])).rows[0];
      const pair=(await client.query(`select count(*)::integer total,count(*) filter(where eligibility='ELIGIBLE')::integer eligible from ${schema}.run_pair where tenant_id=$1 and run_id=$2`,[tenantId,runId])).rows[0];
      const batches=await client.query(`select state,count(*)::integer count from ${schema}.scoring_batch where tenant_id=$1 and run_id=$2 group by state`,[tenantId,runId]);
      return {runId,status:run?.status??null,total:pair.total,eligible:pair.eligible,batches:Object.fromEntries(batches.rows.map(row=>[row.state,row.count]))};
    });
  }
  async function synchronizeRunProgress({runId,expectedPairs}) {
    if(!Number.isSafeInteger(expectedPairs)||expectedPairs<0)throw new Error("Expected pair count must be a nonnegative safe integer.");
    return transaction(async(client)=>(await client.query(`update ${schema}.evaluation_run r set status=case
      when exists(select 1 from ${schema}.scoring_batch b where b.tenant_id=r.tenant_id and b.run_id=r.run_id and b.state='FAILED') then 'FAILED'
      when (select count(*) from ${schema}.run_pair p where p.tenant_id=r.tenant_id and p.run_id=r.run_id)=$3::bigint
        and not exists(select 1 from ${schema}.scoring_batch b where b.tenant_id=r.tenant_id and b.run_id=r.run_id and b.state<>'COMPLETE') then 'COMPLETE'
      else 'SCORING' end where r.tenant_id=$1 and r.run_id=$2 returning status`,[tenantId,textId(runId,"runId"),expectedPairs])).rows[0]?.status??null);
  }
  async function listPairs({runId,supplierId,tenderId,limit=50,cursor=null,eligibility=null}) {
    textId(runId,"runId"); limitOf(limit);
    if (Boolean(supplierId)===Boolean(tenderId)) throw new Error("Exactly one supplier or tender focus is required; universe reads are prohibited.");
    if (eligibility!==null && !states.has(eligibility)) throw new Error("Invalid eligibility filter.");
    if (cursor && (!Number.isInteger(cursor.score) || cursor.score<0 || cursor.score>100 || typeof cursor.id!=="string")) throw new Error("Invalid keyset cursor.");
    const focusColumn=supplierId ? "supplier_id" : "tender_id"; const otherColumn=supplierId ? "tender_id" : "supplier_id";
    return transaction(async (client) => {
      const result=await client.query(`select s.* from ${schema}.run_pair r join ${schema}.pair_score s on s.tenant_id=r.tenant_id and s.cache_key=r.cache_key
        where r.tenant_id=$1 and r.run_id=$2 and r.${focusColumn}=$3 and ($4::text is null or r.eligibility=$4)
          and ($5::smallint is null or r.pair_score<$5 or (r.pair_score=$5 and r.${otherColumn}>$6))
        order by r.pair_score desc,r.${otherColumn} asc limit $7`,[tenantId,runId,supplierId??tenderId,eligibility,cursor?.score??null,cursor?.id??null,limit+1]);
      const more=result.rows.length>limit; const rows=result.rows.slice(0,limit); const last=rows.at(-1);
      return {records:rows.map((row)=>scoreFromRow(row,runId)),nextCursor:more&&last ? {score:last.pair_score,id:last[otherColumn]} : null};
    });
  }
  async function selectedPair({runId,supplierId,tenderId}) {
    [runId,supplierId,tenderId].forEach((id)=>textId(id,"pair identity"));
    return transaction(async(client)=> {
      const result=await client.query(`select s.* from ${schema}.run_pair r join ${schema}.pair_score s on s.tenant_id=r.tenant_id and s.cache_key=r.cache_key where r.tenant_id=$1 and r.run_id=$2 and r.supplier_id=$3 and r.tender_id=$4`,[tenantId,runId,supplierId,tenderId]);
      if(!result.rows[0]) return null;
      const record=scoreFromRow(result.rows[0],runId);
      const jobs=await client.query(`select * from ${schema}.assessment_job where tenant_id=$1 and run_id=$2 and cache_key=$3 order by created_at desc limit 10`,[tenantId,runId,record.cacheKey]);
      const disposition=await client.query(`select * from ${schema}.human_disposition where tenant_id=$1 and run_id=$2 and cache_key=$3 order by revision desc limit 1`,[tenantId,runId,record.cacheKey]);
      return {record,assessments:jobs.rows.map(jobFromRow),humanDisposition:disposition.rows[0]??null};
    });
  }

  async function retrieveCandidates({runId,queryFeatureKey,modelVersion=null,embedding=null,queryText="",concepts=[],geography=null,candidateLimit=200,limit=20,rrfK=60,efSearch=100}) {
    textId(runId,"runId");textId(queryFeatureKey,"queryFeatureKey");limitOf(candidateLimit,1_000);limitOf(limit,100);limitOf(rrfK,1_000);limitOf(efSearch,1_000);
    const vector=embedding===null ? null : featureVector(embedding);
    if(Boolean(vector)!==Boolean(modelVersion)) throw new Error("Semantic queries require both a model version and its real embedding.");
    return transaction(async(client)=> {
      await client.query("select set_config('hnsw.ef_search',$1,true),set_config('hnsw.iterative_scan','strict_order',true)",[String(efSearch)]);
      if(modelVersion) {const enabled=await client.query(`select enabled from ${schema}.embedding_model where model_version=$1`,[modelVersion]);if(!enabled.rows[0]?.enabled) throw new Error("Requested semantic model is disabled.");}
      const result=await client.query(HYBRID_RETRIEVAL_SQL,[tenantId,runId,queryFeatureKey,modelVersion,vector,queryText,concepts,geography,candidateLimit,rrfK,limit]);
      return {policyVersion:RETRIEVAL_POLICY_VERSION,semanticState:vector?"READY":"DISABLED",results:result.rows.map((r,index)=>({supplierId:r.supplier_id,tenderId:r.tender_id,cacheKey:r.cache_key,retrievalScore:Number(r.relevance),retrievalRank:index+1,semanticSimilarity:r.semantic_similarity===null?null:Number(r.semantic_similarity),channels:r.channels,policyVersion:RETRIEVAL_POLICY_VERSION}))};
    });
  }
  async function saveRetrieval({runId,requestId,modelVersion=null,results,retrievedAt}) {
    textId(runId,"runId");textId(requestId,"requestId");clock(retrievedAt);if(results.length>100)throw new Error("Persist only the bounded shortlist.");
    if(new Set(results.map(r=>r.cacheKey)).size!==results.length)throw new Error("Retrieval shortlist contains duplicate pair identities.");
    const payload=results.map(r=>{
      if(!Number.isFinite(r.retrievalScore)||r.retrievalScore<0||r.retrievalScore>=1||r.policyVersion!==RETRIEVAL_POLICY_VERSION||!r.channels||Object.keys(r.channels).some(k=>!["semanticRank","lexicalRank","taxonomyRank"].includes(k))||Object.values(r.channels).some(n=>!Number.isInteger(n)||n<1))throw new Error("Invalid versioned retrieval relevance.");
      const similarity=r.semanticSimilarity??null;
      if(similarity!==null&&(!modelVersion||!Number.isFinite(similarity)||similarity< -1||similarity>1))throw new Error("Semantic retrieval requires a model-bound finite cosine value.");
      return {cacheKey:textId(r.cacheKey,"cacheKey"),supplierId:textId(r.supplierId,"supplierId"),tenderId:textId(r.tenderId,"tenderId"),retrievalScore:r.retrievalScore,semanticSimilarity:similarity,channels:r.channels};
    }).sort((a,b)=>a.cacheKey.localeCompare(b.cacheKey));
    // Retry clocks may advance; the original retrieval timestamp remains immutable.
    const resultHash=sha256Content(stableStringify({policyVersion:RETRIEVAL_POLICY_VERSION,modelVersion,results:payload}));
    return transaction(async(client)=>{
      const memberCount=await client.query(`select count(*)::integer count from jsonb_array_elements($3::jsonb) i join ${schema}.run_pair r on r.tenant_id=$1 and r.run_id=$2 and r.cache_key=i->>'cacheKey' and r.supplier_id=i->>'supplierId' and r.tender_id=i->>'tenderId' and r.eligibility='ELIGIBLE'`,[tenantId,runId,JSON.stringify(payload)]);
      if(memberCount.rows[0].count!==payload.length)throw new Error("Retrieval results must belong to eligible pairs in this tenant/run.");
      await client.query(`insert into ${schema}.retrieval_request(tenant_id,run_id,request_id,policy_version,model_version,result_hash,retrieved_at) values($1,$2,$3,$4,$5,$6,$7) on conflict do nothing`,[tenantId,runId,requestId,RETRIEVAL_POLICY_VERSION,modelVersion,resultHash,retrievedAt]);
      const request=(await client.query(`select result_hash,retrieved_at from ${schema}.retrieval_request where tenant_id=$1 and run_id=$2 and request_id=$3`,[tenantId,runId,requestId])).rows[0];
      if(request.result_hash!==resultHash)throw new Error("Retrieval request identity already exists with a different result payload.");
      return (await client.query(`insert into ${schema}.retrieval_result(tenant_id,run_id,request_id,cache_key,policy_version,model_version,relevance,semantic_similarity,channels,retrieved_at)
        select $1,$2,$3,i->>'cacheKey',$4,$5,(i->>'retrievalScore')::double precision,(i->>'semanticSimilarity')::double precision,i->'channels',$6::timestamptz from jsonb_array_elements($7::jsonb) i on conflict do nothing`,[tenantId,runId,requestId,RETRIEVAL_POLICY_VERSION,modelVersion,request.retrieved_at,JSON.stringify(payload)])).rowCount;
    });
  }
  async function enqueueBatch({runId,batchId,inputIdentity,cursor={}}) {
    return transaction(async(client)=>{await client.query(`insert into ${schema}.scoring_batch(tenant_id,run_id,batch_id,input_identity,cursor) values($1,$2,$3,$4,$5::jsonb) on conflict do nothing`,[tenantId,textId(runId,"runId"),textId(batchId,"batchId"),textId(inputIdentity,"inputIdentity"),JSON.stringify(cursor)]);const row=(await client.query(`select * from ${schema}.scoring_batch where tenant_id=$1 and run_id=$2 and batch_id=$3`,[tenantId,runId,batchId])).rows[0];if(row.input_identity!==inputIdentity)throw new Error("Batch identity changed.");return row;});
  }
  async function claimBatch({runId,worker,now,leaseMs=60_000}) {
    clock(now);limitOf(leaseMs,900_000);textId(worker,"worker");const token=randomUUID();
    return transaction(async(client)=>(await client.query(`with picked as (select batch_id from ${schema}.scoring_batch where tenant_id=$1 and run_id=$2 and (state='QUEUED' or (state='LEASED' and lease_expires_at<=$3::timestamptz)) order by batch_id for update skip locked limit 1)
      update ${schema}.scoring_batch b set state='LEASED',lease_owner=$4,lease_token=$5,lease_expires_at=$3::timestamptz+$6::integer*interval '1 millisecond',attempts=attempts+1,revision=revision+1 from picked where b.tenant_id=$1 and b.run_id=$2 and b.batch_id=picked.batch_id returning b.*`,[tenantId,runId,now,worker,token,leaseMs])).rows[0]??null);
  }
  async function completeBatch({runId,batchId,token,now,cursor,records}) {
    clock(now);
    return transaction(async(client)=>{const lease=await client.query(`select batch_id from ${schema}.scoring_batch where tenant_id=$1 and run_id=$2 and batch_id=$3 and state='LEASED' and lease_token=$4 and lease_expires_at>$5::timestamptz for update`,[tenantId,runId,batchId,token,now]);if(!lease.rows.length)throw new Error("Scoring lease lost or expired.");const inserted=await writeScores(client,runId,records);await client.query(`update ${schema}.scoring_batch set state='COMPLETE',cursor=$6::jsonb,lease_token=null,lease_owner=null,lease_expires_at=null,revision=revision+1 where tenant_id=$1 and run_id=$2 and batch_id=$3 and lease_token=$4 and lease_expires_at>$5::timestamptz`,[tenantId,runId,batchId,token,now,JSON.stringify(cursor)]);return inserted;});
  }
  async function enqueueAssessment(job) {
    if(job.identity.tenantId!==tenantId || job.policyVersion!==ASSESSMENT_POLICY_VERSION || job.schemaVersion!==ASSESSMENT_SCHEMA_VERSION)throw new Error("Assessment identity/policy mismatch.");
    if(!["NOT_ESCALATED","DISABLED","QUEUED"].includes(job.state))throw new Error("New assessment jobs must start pending or disabled.");
    if(job.state==="NOT_ESCALATED")return job;
    return transaction(async(client)=>{
      const pair=(await client.query(`select p.* from ${schema}.pair_score p join ${schema}.run_pair r on r.tenant_id=p.tenant_id and r.cache_key=p.cache_key where r.tenant_id=$1 and r.run_id=$2 and r.cache_key=$3 and r.supplier_id=$4 and r.tender_id=$5`,[tenantId,job.identity.runId,job.identity.pairCacheKey,job.identity.supplierId,job.identity.tenderId])).rows[0];
      if(!pair || (job.state!=="NOT_ESCALATED"&&pair.eligibility!=="ELIGIBLE") || pair.formula_version!==job.identity.formulaVersion || pair.evidence_snapshot!==job.identity.evidenceSnapshot || pair.supplier_version!==job.identity.supplierVersion || pair.tender_version!==job.identity.tenderVersion)throw new Error("Assessment does not match an eligible pinned pair.");
      await client.query(`insert into ${schema}.assessment_job(tenant_id,run_id,job_id,idempotency_key,cache_key,identity,policy_version,schema_version,provider_version,reasons,state,max_attempts,last_error,created_at,updated_at)
        values($1,$2,$3,$4,$5,$6::jsonb,$7,$8,$9,$10,$11,$12,$13,$14,$15) on conflict do nothing`,[tenantId,job.identity.runId,job.id,job.idempotencyKey,job.identity.pairCacheKey,JSON.stringify(job.identity),job.policyVersion,job.schemaVersion,job.providerVersion,job.reasons,job.state,job.maxAttempts,job.lastError,job.createdAt,job.updatedAt]);
      return jobFromRow((await client.query(`select * from ${schema}.assessment_job where tenant_id=$1 and idempotency_key=$2`,[tenantId,job.idempotencyKey])).rows[0]);
    });
  }
  async function claimAssessment({runId,providerVersion,worker,now,leaseMs=60_000}) {
    clock(now);textId(providerVersion,"providerVersion");textId(worker,"worker");limitOf(leaseMs,900_000);const token=randomUUID();
    return transaction(async(client)=>{await client.query(`update ${schema}.assessment_job set state='FAILED',last_error='LEASE_EXPIRED_ATTEMPTS_EXHAUSTED',lease_token=null,lease_owner=null,lease_expires_at=null,updated_at=$4,revision=revision+1 where tenant_id=$1 and run_id=$2 and provider_version=$3 and state='LEASED' and lease_expires_at<=$4::timestamptz and attempts>=max_attempts`,[tenantId,runId,providerVersion,now]);return jobFromRow((await client.query(`with picked as(select job_id from ${schema}.assessment_job where tenant_id=$1 and run_id=$2 and provider_version=$3 and attempts<max_attempts and
      ((state in('QUEUED','RETRY_WAIT') and (next_attempt_at is null or next_attempt_at<=$4::timestamptz)) or (state='LEASED' and lease_expires_at<=$4::timestamptz)) order by created_at,job_id for update skip locked limit 1)
      update ${schema}.assessment_job j set state='LEASED',lease_owner=$5,lease_token=$6,lease_expires_at=$4::timestamptz+$7::integer*interval '1 millisecond',attempts=attempts+1,revision=revision+1,updated_at=$4::timestamptz,next_attempt_at=null from picked where j.tenant_id=$1 and j.job_id=picked.job_id returning j.*`,[tenantId,runId,providerVersion,now,worker,token,leaseMs])).rows[0]);});
  }
  async function completeAssessment({jobId,token,now,artifact}) {
    clock(now);
    return transaction(async(client)=> {
      const row=(await client.query(`select * from ${schema}.assessment_job where tenant_id=$1 and job_id=$2 and state='LEASED' and lease_token=$3 and lease_expires_at>$4::timestamptz for update`,[tenantId,jobId,token,now])).rows[0];
      if(!row)throw new Error("Assessment lease lost or expired.");
      if(artifact.jobId!==jobId||artifact.providerVersion!==row.provider_version||artifact.schemaVersion!==row.schema_version||artifact.authority!=="ADVISORY_ONLY"||Object.entries(row.identity).some(([key,value])=>artifact.identity[key]!==value))throw new Error("Assessment artifact provenance mismatch.");
      await client.query(`insert into ${schema}.assessment_artifact(tenant_id,artifact_id,job_id,schema_version,provider_version,model_version,prompt_version,input_hash,result,created_at) values($1,$2,$3,$4,$5,$6,$7,$8,$9::jsonb,$10)`,[tenantId,artifact.id,jobId,artifact.schemaVersion,artifact.providerVersion,artifact.modelVersion,artifact.promptVersion,artifact.inputHash,JSON.stringify(artifact),artifact.createdAt]);
      return jobFromRow((await client.query(`update ${schema}.assessment_job set state='SUCCEEDED',artifact_id=$3,lease_token=null,lease_owner=null,lease_expires_at=null,updated_at=$4,revision=revision+1,last_error=null where tenant_id=$1 and job_id=$2 returning *`,[tenantId,jobId,artifact.id,now])).rows[0]);
    });
  }
  async function failAssessment({jobId,token,now,retryable,reasonCode}) {
    clock(now);if(!/^[A-Z_]{3,100}$/.test(reasonCode))throw new Error("Store a safe reason code, never a raw provider error.");
    return transaction(async(client)=>{const result=await client.query(`update ${schema}.assessment_job set state=case when $5 and attempts<max_attempts then 'RETRY_WAIT' else 'FAILED' end,
      next_attempt_at=case when $5 and attempts<max_attempts then $4::timestamptz+least(300,2^attempts)*interval '1 second' else null end,
      last_error=$6,lease_token=null,lease_owner=null,lease_expires_at=null,updated_at=$4,revision=revision+1 where tenant_id=$1 and job_id=$2 and state='LEASED' and lease_token=$3 and lease_expires_at>$4::timestamptz returning *`,[tenantId,jobId,token,now,retryable,reasonCode]);if(!result.rows.length)throw new Error("Assessment lease lost or expired.");return jobFromRow(result.rows[0]);});
  }
  async function assessmentArtifact({jobId,artifactId}) {
    return transaction(async(client)=>(await client.query(`select result from ${schema}.assessment_artifact where tenant_id=$1 and job_id=$2 and artifact_id=$3`,[tenantId,jobId,artifactId])).rows[0]?.result??null);
  }
  return {beginRun,putFeatures,putEmbedding,putScores,getCachedScores,inheritScores,runSummary,synchronizeRunProgress,listPairs,selectedPair,retrieveCandidates,saveRetrieval,enqueueBatch,claimBatch,completeBatch,enqueueAssessment,claimAssessment,completeAssessment,failAssessment,assessmentArtifact};
}

/** Bounded channel union: no ANN value enters pair_score. Model LIST partitions
 * isolate vector spaces. Iterative HNSW compensates for tenant/run filters; recall
 * still needs measured comparison to exact cosine before production promotion.
 */
export const HYBRID_RETRIEVAL_SQL = `
with source as (
  select f.* from tendermatch_retrieval.normalized_feature f join tendermatch_retrieval.run_feature rf on rf.tenant_id=f.tenant_id and rf.feature_key=f.feature_key
  where f.tenant_id=$1 and rf.run_id=$2 and f.feature_key=$3
), eligible_targets as (
  select f.feature_key,f.entity_id,f.search_document,f.concepts,r.supplier_id,r.tender_id,r.cache_key
  from source q join tendermatch_retrieval.run_pair r on r.tenant_id=q.tenant_id and r.run_id=$2 and r.eligibility='ELIGIBLE'
    and ((q.kind='supplier' and r.supplier_id=q.entity_id) or (q.kind='tender' and r.tender_id=q.entity_id))
  join tendermatch_retrieval.run_feature rf on rf.tenant_id=r.tenant_id and rf.run_id=r.run_id and rf.kind<>q.kind and rf.entity_id=case when q.kind='supplier' then r.tender_id else r.supplier_id end
  join tendermatch_retrieval.normalized_feature f on f.tenant_id=rf.tenant_id and f.feature_key=rf.feature_key
  where f.procurement_type=q.procurement_type and ($8::text[] is null or f.geography && $8::text[])
), semantic_nearest as (
  select e.feature_key,1-(e.embedding <=> $5::vector) similarity
  from tendermatch_retrieval.feature_embedding e where $5::vector is not null and e.tenant_id=$1 and e.model_version=$4
    and exists(select 1 from eligible_targets t where t.feature_key=e.feature_key)
  order by e.embedding <=> $5::vector limit $9
), semantic as (select feature_key,similarity,row_number() over(order by similarity desc,feature_key) rank from semantic_nearest),
lexical_nearest as (select feature_key,ts_rank_cd(search_document,plainto_tsquery('simple',$6)) relevance from eligible_targets where $6<>'' and search_document @@ plainto_tsquery('simple',$6) order by relevance desc,feature_key limit $9),
lexical as (select feature_key,row_number() over(order by relevance desc,feature_key) rank from lexical_nearest),
taxonomy_nearest as (select feature_key,(select count(*) from unnest(concepts) c where c=any($7::text[])) relevance from eligible_targets where concepts && $7::text[] order by relevance desc,feature_key limit $9),
taxonomy as (select feature_key,row_number() over(order by relevance desc,feature_key) rank from taxonomy_nearest),
channel_union as (
  select feature_key,'semanticRank' channel,rank,similarity from semantic union all
  select feature_key,'lexicalRank',rank,null::double precision from lexical union all
  select feature_key,'taxonomyRank',rank,null::double precision from taxonomy
), fused as (select feature_key,sum(1.0/($10+rank)) relevance,max(similarity) semantic_similarity,jsonb_object_agg(channel,rank) channels from channel_union group by feature_key)
select t.supplier_id,t.tender_id,t.cache_key,f.relevance,f.semantic_similarity,f.channels from fused f join eligible_targets t using(feature_key)
order by f.relevance desc,t.supplier_id,t.tender_id limit $11`;

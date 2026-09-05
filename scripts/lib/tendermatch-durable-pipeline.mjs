import { sha256Content, stableStringify, TENDERMATCH_FEATURE_VERSION } from "../../packages/tendermatch/src/retrieval-features.ts";
import { compactPairCacheKey, scoreCompactPair } from "../../packages/tendermatch/src/retrieval-pipeline.ts";
import { TENDERMATCH_MATCH_ENGINE_VERSION } from "../../packages/tendermatch/src/exploratory-matching.ts";
import { createAssessmentJob } from "../../packages/tendermatch/src/selective-assessment.ts";

/** Durable orchestration with an injected store. It never opens a connection or
 * discovers credentials. Features are prepared once before this boundary. Each
 * batch performs one bounded cache lookup and an atomic scores+checkpoint commit.
 * fromRunId reuses only identities whose exact normalized hashes still agree.
 */
export async function runDurableScoring({store,tenantId,runId,tenders,suppliers,evaluatedAt,now=()=>new Date().toISOString(),
  formulaVersion=TENDERMATCH_MATCH_ENGINE_VERSION,batchSize=500,worker="local-worker",fromRunId=null,
  changedTenderIds=null,changedSupplierIds=null,maxBatches=Number.MAX_SAFE_INTEGER}) {
  if(!Number.isInteger(batchSize)||batchSize<1||batchSize>1_000)throw new Error("batchSize must be from 1 to 1,000.");
  if(!Number.isInteger(maxBatches)||maxBatches<0)throw new Error("maxBatches must be nonnegative.");
  if(formulaVersion!==TENDERMATCH_MATCH_ENGINE_VERSION)throw new Error("No deterministic scorer is registered for this formula version.");
  if(new Set(tenders.map(f=>f.id)).size!==tenders.length||new Set(suppliers.map(f=>f.id)).size!==suppliers.length)throw new Error("Canonical inventory IDs must be unique.");
  const tenderIndex=new Map(tenders.map(f=>[f.id,f]));const supplierIndex=new Map(suppliers.map(f=>[f.id,f]));
  const inputIdentity=sha256Content(stableStringify({formulaVersion,tenders:tenders.map(f=>f.featureKey).sort(),suppliers:suppliers.map(f=>f.featureKey).sort()}));
  await store.beginRun({runId,formulaVersion,featureVersion:TENDERMATCH_FEATURE_VERSION,inputIdentity,evaluatedAt});
  const features=[...tenders,...suppliers];for(let start=0;start<features.length;start+=500)await store.putFeatures(runId,features.slice(start,start+500));
  const inherited=fromRunId ? await store.inheritScores({runId,fromRunId}) : 0;
  const changedTenders=changedTenderIds===null ? null : new Set(changedTenderIds);const changedSuppliers=changedSupplierIds===null ? null : new Set(changedSupplierIds);
  if(!fromRunId&&(changedTenders||changedSuppliers))throw new Error("A partial recalculation requires an explicit prior run for unchanged membership.");
  for(const supplier of [...suppliers].sort((a,b)=>a.id.localeCompare(b.id))) {
    const selected=(!changedTenders&&!changedSuppliers)||changedSuppliers?.has(supplier.id) ? tenders : tenders.filter(t=>changedTenders?.has(t.id));
    const ordered=[...selected].sort((a,b)=>a.id.localeCompare(b.id));
    for(let offset=0;offset<ordered.length;offset+=batchSize) {
      const tenderIds=ordered.slice(offset,offset+batchSize).map(t=>t.id);
      const batchId=sha256Content(stableStringify([inputIdentity,supplier.id,tenderIds]));
      await store.enqueueBatch({runId,batchId,inputIdentity,cursor:{supplierId:supplier.id,tenderIds}});
    }
  }
  let processedBatches=0;let calculated=0;let cacheHits=0;let inserted=0;
  while(processedBatches<maxBatches) {
    const job=await store.claimBatch({runId,worker,now:now()});if(!job)break;
    if(job.input_identity!==inputIdentity)throw new Error("Claimed batch belongs to different normalized inputs.");
    const supplier=supplierIndex.get(job.cursor.supplierId);if(!supplier)throw new Error("Pinned batch supplier is unavailable.");
    const batchTenders=job.cursor.tenderIds.map(id=>{const tender=tenderIndex.get(id);if(!tender)throw new Error("Pinned batch tender is unavailable.");return tender;});
    const keys=batchTenders.map(t=>compactPairCacheKey(t,supplier,formulaVersion));
    const cached=new Map((await store.getCachedScores(keys)).map(row=>[row.cacheKey,row]));
    const records=batchTenders.map((t,index)=>{const hit=cached.get(keys[index]);if(hit){cacheHits++;return {...hit,runId};}calculated++;return scoreCompactPair(t,supplier,{runId,evaluatedAt,formulaVersion});});
    inserted+=await store.completeBatch({runId,batchId:job.batch_id,token:job.lease_token,now:now(),cursor:job.cursor,records});processedBatches++;
  }
  await store.synchronizeRunProgress({runId,expectedPairs:tenders.length*suppliers.length});
  const summary=await store.runSummary(runId);const pending=(summary.batches.QUEUED??0)+(summary.batches.LEASED??0)+(summary.batches.FAILED??0);
  const complete=pending===0&&summary.total===tenders.length*suppliers.length;
  return {tenantId,runId,inputIdentity,formulaVersion,processedBatches,calculated,cacheHits,inserted,inherited,complete,expectedPairs:tenders.length*suppliers.length,...summary};
}

/** A single review request crosses the compact-score -> heavy-assessment boundary.
 * Retrieval, Formula, TORS and human disposition are returned as independent fields.
 */
export async function requestDurableAssessment({store,tenantId,runId,supplierId,tenderId,now,providerVersion=null,openedBy,shortlistRank,missingRequiredEvidence=false,conflictingEvidence=false,ambiguousEvidence=false,reportRequest}) {
  const selected=await store.selectedPair({runId,supplierId,tenderId});if(!selected)throw new Error("The selected pair does not exist in the explicit run.");
  const row=selected.record;
  const job=createAssessmentJob({tenantId,runId,supplierId,tenderId,pairCacheKey:row.cacheKey,supplierVersion:row.supplierVersion,tenderVersion:row.tenderVersion,evidenceSnapshot:row.evidenceSnapshot,formulaVersion:row.formulaVersion,
    eligible:row.eligibility.state==="ELIGIBLE",openedBy,shortlistRank,missingRequiredEvidence,conflictingEvidence,ambiguousEvidence,reportRequest},now,providerVersion);
  const assessment=await store.enqueueAssessment(job);
  return {record:row,assessment,humanDisposition:selected.humanDisposition};
}

import assert from "node:assert/strict";
import test from "node:test";
import {buildLexicalRetrievalIndex,fuseRetrievalCandidates,retrieveFeatureCandidates} from "../packages/tendermatch/src/retrieval-ranking.ts";
import {createAssessmentJob,assessmentReasons,LocalAssessmentQueue,executeAssessment} from "../packages/tendermatch/src/selective-assessment.ts";

const now="2026-09-05T10:00:00.000Z";
const identity={tenantId:"test",runId:"run-1",supplierId:"supplier-1",tenderId:"tender-1",pairCacheKey:"cache-1",supplierVersion:"v1",tenderVersion:"v1",evidenceSnapshot:"evidence-1",formulaVersion:"v1.1"};

test("retrieval RRF deduplicates channels and ties deterministically without Formula inputs",()=>{
  const input=[{supplierId:"s",tenderId:"b",channels:{lexicalRank:1}},{supplierId:"s",tenderId:"a",channels:{lexicalRank:1}},{supplierId:"s",tenderId:"a",channels:{taxonomyRank:2}},{supplierId:"s",tenderId:"a",channels:{taxonomyRank:3}}];
  const result=fuseRetrievalCandidates(input);
  assert.deepEqual(result.map(r=>r.tenderId),["a","b"]);
  assert.equal(result[0].retrievalScore,1/61+1/62);
  assert.equal(result[0].semanticSimilarity,null);assert.equal(result[0].pairScore,undefined);
  assert.deepEqual(fuseRetrievalCandidates([...input].reverse()),result);
  assert.throws(()=>fuseRetrievalCandidates([{...input[0],channels:{semanticRank:0}}]),/integer/);
  assert.throws(()=>fuseRetrievalCandidates([{...input[0],semanticSimilarity:NaN}]),/finite/);
});

test("lexical and taxonomy shortlist works without embeddings and obeys eligibility",()=>{
  const index=buildLexicalRetrievalIndex([{id:"t1",terms:["transformer"],concepts:["electrical"]},{id:"t2",terms:["pump"],concepts:["water"]},{id:"blocked",terms:["transformer"],concepts:["electrical"]}]);
  const result=retrieveFeatureCandidates({id:"s1",terms:["transformer"],concepts:["electrical"]},index,{direction:"supplier-to-tenders",eligible:id=>id!=="blocked",limit:1});
  assert.equal(result.semanticState,"DISABLED");assert.deepEqual(result.results.map(r=>r.tenderId),["t1"]);assert.equal(result.candidateCount,1);
  assert.throws(()=>retrieveFeatureCandidates({id:"s",terms:[],concepts:[]},index,{direction:"supplier-to-tenders",eligible:()=>true,semantic:{state:"DISABLED",modelVersion:"none",candidates:[{id:"t1",similarity:1}]}}),/fabricated/);
});

test("real supplied semantic candidates combine with lexical channels and cannot bypass exclusions",()=>{
  const index=buildLexicalRetrievalIndex([{id:"t1",terms:["transformer"],concepts:[]},{id:"t2",terms:[],concepts:[]}]);
  const result=retrieveFeatureCandidates({id:"s",terms:["transformer"],concepts:[]},index,{direction:"supplier-to-tenders",eligible:id=>id==="t1",semantic:{state:"READY",modelVersion:"test-v1",candidates:[{id:"t2",similarity:1},{id:"t1",similarity:.5}]}});
  assert.equal(result.results.length,1);assert.equal(result.results[0].semanticSimilarity,.5);assert.deepEqual(result.results[0].channels,{semanticRank:1,lexicalRank:1});
});

test("ordinary eligible pairs require no model; escalation reasons and disabled state are explicit",()=>{
  const ordinary=createAssessmentJob({...identity,eligible:true},now,null);assert.equal(ordinary.state,"NOT_ESCALATED");
  const review=createAssessmentJob({...identity,eligible:true,openedBy:"consultant"},now,null);assert.equal(review.state,"DISABLED");assert.deepEqual(review.reasons,["USER_OPENED_PAIR"]);
  assert.deepEqual(assessmentReasons({...identity,eligible:false,openedBy:"consultant",shortlistRank:1}),[]);
  assert.deepEqual(assessmentReasons({...identity,eligible:true,shortlistRank:21}),[]);
  assert.deepEqual(assessmentReasons({...identity,eligible:true,shortlistRank:1,ambiguousEvidence:true,missingRequiredEvidence:true,conflictingEvidence:true,reportRequest:{requestId:"r",actor:"human",justification:"Due diligence"}}),["SHORTLIST_TOP_RANKED","AMBIGUOUS_EVIDENCE","MISSING_REQUIRED_EVIDENCE","CONFLICTING_EVIDENCE","JUSTIFIED_REPORT_REQUEST"]);
});

test("assessment queue is idempotent, single-lease, restartable and rejects stale completion",()=>{
  const queue=new LocalAssessmentQueue();const job=createAssessmentJob({...identity,eligible:true,openedBy:"user"},now,"test-provider");
  assert.deepEqual(queue.enqueue(job),queue.enqueue(job));assert.equal(queue.jobs.size,1);
  const lease=queue.claim(job.idempotencyKey,"worker-a","token-a",now,1_000);assert.ok(lease);
  assert.equal(queue.claim(job.idempotencyKey,"worker-b","token-b",now),null);
  const reclaimed=queue.claim(job.idempotencyKey,"worker-b","token-b","2026-09-05T10:00:01.001Z");assert.equal(reclaimed.attempts,2);
  assert.throws(()=>queue.fail(job.idempotencyKey,"token-a","2026-09-05T10:00:01.002Z","FAIL",true),/lost/);
  const failed=queue.fail(job.idempotencyKey,"token-b","2026-09-05T10:00:01.002Z","PROVIDER_FAILED",true);assert.equal(failed.state,"RETRY_WAIT");
  assert.equal(queue.claim(job.idempotencyKey,"worker-b","token-c","2026-09-05T10:00:02.000Z"),null);
  assert.equal(queue.claim(job.idempotencyKey,"worker-b","token-c","2026-09-05T10:00:06.000Z").attempts,3);
  assert.equal(queue.fail(job.idempotencyKey,"token-c","2026-09-05T10:00:07.000Z","PROVIDER_FAILED",true).state,"FAILED");
});

test("test provider stores advisory artifact separately and cannot change Formula score or disposition",async()=>{
  const record=Object.freeze({pairScore:41,dataCoverage:65,evidenceConfidence:50,humanDisposition:"pending"});
  const queue=new LocalAssessmentQueue();const job=createAssessmentJob({...identity,eligible:true,openedBy:"user"},now,"test-provider");queue.enqueue(job);
  const lease=queue.claim(job.idempotencyKey,"worker","token",now);let calls=0;
  const provider={version:"test-provider",modelVersion:"synthetic-test-only",promptVersion:"test-prompt-v1",assess:async()=>{calls++;return {summary:"Test finding",findings:[{claim:"Supported test statement",evidenceIds:["e1"],missing:false}],limitations:["Synthetic adapter contract test"]};}};
  const result=await executeAssessment(queue,lease,provider,[{id:"e1",text:"Authorized nonconfidential test evidence"}],()=>"2026-09-05T10:00:00.001Z");
  assert.equal(calls,1);assert.equal(result.state,"SUCCEEDED");assert.equal(queue.artifacts.size,1);
  assert.deepEqual(record,{pairScore:41,dataCoverage:65,evidenceConfidence:50,humanDisposition:"pending"});
  const artifact=[...queue.artifacts.values()][0];assert.equal(artifact.authority,"ADVISORY_ONLY");assert.equal(artifact.pairScore,undefined);
});

test("unsupported provider claims fail evidence validation and raw provider errors are not stored",async()=>{
  const queue=new LocalAssessmentQueue();const job=createAssessmentJob({...identity,eligible:true,openedBy:"user"},now,"test-provider");queue.enqueue(job);
  const lease=queue.claim(job.idempotencyKey,"w","t",now);
  const provider={version:"test-provider",modelVersion:"synthetic",promptVersion:"v1",assess:async()=>({summary:"Invalid",findings:[{claim:"Invented claim",evidenceIds:["unknown"],missing:false}],limitations:[]})};
  const result=await executeAssessment(queue,lease,provider,[{id:"e1",text:"test"}],()=>"2026-09-05T10:00:00.001Z");
  assert.equal(result.state,"FAILED");assert.equal(result.lastError,"PROVIDER_EVIDENCE_LINKAGE_INVALID");assert.equal(queue.artifacts.size,0);
});

test("provider-disabled and cancelled jobs cannot execute; changed source/provider creates a new identity",async()=>{
  const queue=new LocalAssessmentQueue();const job=createAssessmentJob({...identity,eligible:true,openedBy:"user"},now,null);queue.enqueue(job);
  assert.equal(queue.claim(job.idempotencyKey,"w","t",now),null);assert.equal((await executeAssessment(queue,job,null,[],()=>now)).state,"DISABLED");
  assert.notEqual(createAssessmentJob({...identity,tenderVersion:"v2",eligible:true,openedBy:"user"},now,null).idempotencyKey,job.idempotencyKey);
  const enabled=createAssessmentJob({...identity,eligible:true,openedBy:"user"},now,"provider");assert.notEqual(enabled.idempotencyKey,job.idempotencyKey);queue.enqueue(enabled);
  queue.cancel(enabled.idempotencyKey,now);assert.equal(queue.claim(enabled.idempotencyKey,"w","t",now),null);
});

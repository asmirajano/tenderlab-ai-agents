import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { runtimeTenders } from "../packages/tendermatch/src/pilot-data.ts";
import { evaluateExploratoryPair, TENDERMATCH_EXPLORATORY_ENGINE_VERSION } from "../packages/tendermatch/src/exploratory-matching.ts";
import { normalizeTenderFeatures, normalizeSupplierFeatures, normalizeTenderFeaturesWithHash, normalizeSupplierFeaturesWithHash, NormalizedFeatureStore, sha256Content, stableStringify, TENDERMATCH_RETRIEVAL_TERM_LIMIT } from "../packages/tendermatch/src/retrieval-features.ts";
import { scoreCompactPair, compactPairCacheKey, MemoryPairStore, runIncrementalScoring, queryCompactPairs } from "../packages/tendermatch/src/retrieval-pipeline.ts";

const runtime = JSON.parse(await readFile(new URL("../apps/tender-apps/public/tendermatch/data/supplier-runtime-v1.3.json",import.meta.url),"utf8"));
const evidenceFile = JSON.parse(await readFile(new URL("../apps/tender-apps/public/tendermatch/data/supplier-evidence-v1.3.json",import.meta.url),"utf8"));
const evidence = Object.values(evidenceFile.evidenceBySupplier).flat();
const tenders = runtimeTenders.map(normalizeTenderFeatures);
const suppliers = runtime.suppliers.map((row)=>normalizeSupplierFeatures(row,evidence));
const evaluatedAt="2026-09-01T11:09:44.745Z";const context={runId:"run:core-test",evaluatedAt};
const goods = runtimeTenders.find((row)=>row.procurementType==="GOODS");
const goodsSupplier=runtime.suppliers.find((row)=>row.classification==="GOODS");

test("browser-safe SHA-256 and canonical source hashing match Node for Unicode and multi-block inputs",()=>{
  for(const value of ["","abc","tender:Uzbekistan", "Кыргызстан — 会社 × supplier", "a".repeat(10000)])assert.equal(sha256Content(value),createHash("sha256").update(value).digest("hex"));
  assert.equal(stableStringify({z:1,a:{b:2,a:3}}),stableStringify({a:{a:3,b:2},z:1}));
});

test("native server hashing and bounded retrieval vocabulary preserve identical features and Formula operands",()=>{
  const hash=(value)=>createHash("sha256").update(value).digest("hex");
  assert.deepEqual(normalizeTenderFeaturesWithHash(goods,hash),normalizeTenderFeatures(goods));
  assert.deepEqual(normalizeSupplierFeaturesWithHash(goodsSupplier,evidence,hash),normalizeSupplierFeatures(goodsSupplier,evidence));
  const long={...goods,description:Array.from({length:10000},(_,i)=>`boilerplate${i}`).join(" ")};
  const feature=normalizeTenderFeatures(long);assert.equal(feature.terms.length,TENDERMATCH_RETRIEVAL_TERM_LIMIT);assert.deepEqual(feature.scoringTerms,normalizeTenderFeatures(goods).scoringTerms);
  assert.equal(scoreCompactPair(feature,suppliers[0],context).pairScore,scoreCompactPair(normalizeTenderFeatures(goods),suppliers[0],context).pairScore);
});

test("all 1,020 pinned compact scores, coverage, confidence, fit and limitation exactly equal Formula v1.1 oracle",()=>{
  const store=new MemoryPairStore();const result=runIncrementalScoring({tenders,suppliers,store,...context});
  assert.equal(result.processed,1020);assert.equal(store.records.size,1020);assert.equal(result.modelCalls,0);
  for(const tender of runtimeTenders)for(const supplier of runtime.suppliers){
    const oracle=evaluateExploratoryPair(tender,supplier,evidence,evaluatedAt);const actual=store.getForPair(`supplier:NEON:${supplier.canonicalEntityId}`,tender.id);
    assert.deepEqual([actual.pairScore,actual.dataCoverage,actual.evidenceConfidence,actual.assessedFitScore,actual.mainLimitation],[oracle.value,oracle.dataCoverage,oracle.evidenceConfidence,oracle.assessedFitScore,oracle.mainReason],oracle.key);
    assert.equal(actual.denominator,100);assert.ok(Number.isInteger(actual.pairScore)&&actual.pairScore>=0&&actual.pairScore<=100);
  }
  assert.ok(result.eligible>0&&result.notEligible>0);assert.equal(new Set([...store.values()].map((row)=>row.key)).size,1020);
});

test("source normalization reuses unchanged versions and detects content drift without version bumps",()=>{
  const cache=new NormalizedFeatureStore();const first=cache.tender(goods);assert.equal(cache.tender({...goods}),first);
  const changed=cache.tender({...goods,title:`${goods.title} changed`});assert.notEqual(changed.featureKey,first.featureKey);
  const profile=cache.supplier(goodsSupplier,evidence);assert.equal(cache.supplier({...goodsSupplier},[...evidence]),profile);
  const changedEvidence=evidence.map((row)=>row.canonicalEntityId===goodsSupplier.canonicalEntityId?{...row,status:"VERIFIED"}:row);
  const revised=cache.supplier(goodsSupplier,changedEvidence);assert.notEqual(revised.evidenceSnapshot,profile.evidenceSnapshot);assert.notEqual(revised.featureKey,profile.featureKey);
  assert.equal(profile.embedding.state,"MISSING");assert.ok(profile.thresholds.every((row)=>row.value===null&&row.valueClass==="MISSING"));
  assert.throws(()=>{first.scoringTerms.push("invented");},TypeError);
  assert.throws(()=>{profile.formulaEvidence.technical.confidence=100;},TypeError);
});

test("normalization preserves Formula v1.1 geography evidence order and versions order-dependent operands",()=>{
  const base=evidence.find((row)=>row.canonicalEntityId===goodsSupplier.canonicalEntityId);
  const records=[{...base,claimId:"z-asia",field:"geographic_markets",value:"Asia"},{...base,claimId:"a-central",field:"geographic_markets",value:"Central"}];
  const notice={...goods,country:"Uganda"};const prepared=normalizeTenderFeatures(notice);
  const forward=normalizeSupplierFeatures(goodsSupplier,records);const reverse=normalizeSupplierFeatures(goodsSupplier,[...records].reverse());
  assert.equal(scoreCompactPair(prepared,forward,context).pairScore,evaluateExploratoryPair(notice,goodsSupplier,records,evaluatedAt).value);
  assert.equal(scoreCompactPair(prepared,reverse,context).pairScore,evaluateExploratoryPair(notice,goodsSupplier,[...records].reverse(),evaluatedAt).value);
  assert.deepEqual([scoreCompactPair(prepared,forward,context).pairScore,scoreCompactPair(prepared,reverse,context).pairScore],[8,10]);
  assert.notEqual(forward.evidenceSnapshot,reverse.evidenceSnapshot);
  const cache=new NormalizedFeatureStore();assert.notEqual(cache.supplier(goodsSupplier,records),cache.supplier(goodsSupplier,[...records].reverse()));
});

test("missing criteria yield numeric zero on denominator 100; inapplicable zero remains separately identified",()=>{
  const supplier=normalizeSupplierFeatures(goodsSupplier,[]);const tender=normalizeTenderFeatures(goods);const zero=scoreCompactPair(tender,supplier,context);
  assert.equal(zero.pairScore,0);assert.equal(zero.dataCoverage,0);assert.equal(zero.denominator,100);assert.equal(zero.eligibility.state,"ELIGIBLE");
  assert.equal(zero.mainLimitation,"NO_SUPPORTED_CRITERION_POINTS");
  const outside=scoreCompactPair(normalizeTenderFeatures({...goods,procurementType:"CONSULTING"}),supplier,context);
  assert.equal(outside.pairScore,0);assert.equal(outside.eligibility.state,"OUTSIDE_SCORING_SCOPE");
  const excluded=scoreCompactPair(tender,normalizeSupplierFeatures({...goodsSupplier,readinessStatus:"exclude_from_current_matching_run"},evidence),context);
  const ordinary=scoreCompactPair(tender,normalizeSupplierFeatures(goodsSupplier,evidence),context);
  assert.equal(excluded.eligibility.state,"INELIGIBLE");assert.equal(excluded.pairScore,ordinary.pairScore);
});

test("relevance, model output, readiness, urgency and human disposition cannot mutate cached Formula points",()=>{
  const row=scoreCompactPair(normalizeTenderFeatures(goods),normalizeSupplierFeatures(goodsSupplier,evidence),context);
  assert.throws(()=>{row.pairScore=100;},TypeError);
  const projected={...row,retrievalScore:0.99,assessment:{status:"COMPLETE",aiScore:100},humanDisposition:"approved"};
  assert.equal(projected.pairScore,row.pairScore);assert.equal(row.retrievalScore,null);
  const store=new MemoryPairStore();assert.throws(()=>store.putBatch([projected],context.runId),/immutable Formula/);
  const deadline=scoreCompactPair(normalizeTenderFeatures({...goods,deadlineAt:"2000-01-01T00:00:00Z"}),normalizeSupplierFeatures(goodsSupplier,evidence),context);
  assert.equal(deadline.pairScore,row.pairScore);assert.notEqual(deadline.cacheKey,row.cacheKey);
});

test("incremental affected-pair processing, unchanged cache reuse and immutable histories",()=>{
  const store=new MemoryPairStore();const first=runIncrementalScoring({tenders,suppliers,store,...context,batchSize:50});assert.equal(first.computed,1020);
  const replay=runIncrementalScoring({tenders,suppliers,store,runId:"run:replay",evaluatedAt,batchSize:50});assert.equal(replay.computed,0);assert.equal(replay.reused,1020);
  const changed=[{...suppliers[0],featureKey:sha256Content("revised supplier")},...suppliers.slice(1)];
  const delta=runIncrementalScoring({tenders,suppliers:changed,store,runId:"run:changed-supplier",evaluatedAt,changedSupplierIds:[changed[0].id]});
  assert.equal(delta.processed,60);assert.equal(delta.computed,60);assert.equal(store.records.size,1080);assert.equal([...store.values(context.runId)].length,1020);
  const oldPair=store.getForPair(suppliers[0].id,tenders[0].id,context.runId);const newPair=store.getForPair(suppliers[0].id,tenders[0].id,"run:changed-supplier");
  assert.notEqual(oldPair.cacheKey,newPair.cacheKey);assert.equal([...store.forScope(suppliers[0].id,undefined,context.runId)].length,60);
  assert.throws(()=>store.putBatch([newPair],context.runId),/another version/);
  const one=runIncrementalScoring({tenders:[...tenders,{...tenders[0],id:"tender:new",featureKey:sha256Content("new tender")}],suppliers:changed,store,runId:"run:new-tender",evaluatedAt,changedTenderIds:["tender:new"]});assert.equal(one.processed,17);
  const added={...suppliers[0],id:"supplier:NEON:new",canonicalEntityId:"new",featureKey:sha256Content("new supplier")};
  const newSupplier=runIncrementalScoring({tenders,suppliers:[...changed,added],store,runId:"run:new-supplier",evaluatedAt,changedSupplierIds:[added.id]});assert.equal(newSupplier.processed,60);assert.equal(newSupplier.computed,60);
  assert.throws(()=>runIncrementalScoring({tenders,suppliers:changed,store,...context}),/different inputs/);
  assert.throws(()=>scoreCompactPair(tenders[0],suppliers[0],{...context,formulaVersion:"unregistered/v2"}),/registered/);
  assert.notEqual(compactPairCacheKey(tenders[0],suppliers[0],TENDERMATCH_EXPLORATORY_ENGINE_VERSION),compactPairCacheKey(tenders[0],suppliers[0],"new-formula/v2"));
});

test("one supplier evidence revision invalidates only that supplier's normalized features",()=>{
  const identity=runtime.suppliers[0].canonicalEntityId;
  const revised=evidence.map((row)=>row.canonicalEntityId===identity?{...row,artifactAvailable:!row.artifactAvailable}:row);
  const changed=runtime.suppliers.map((profile,index)=>({id:profile.canonicalEntityId,changed:normalizeSupplierFeatures(profile,revised).featureKey!==suppliers[index].featureKey})).filter((row)=>row.changed);
  assert.deepEqual(changed.map((row)=>row.id),[identity]);
});

test("restartable batches and duplicate workers preserve pair uniqueness and atomic checkpoints",()=>{
  const store=new MemoryPairStore();const options={tenders,suppliers,store,...context,batchSize:25};
  const paused=runIncrementalScoring({...options,maxPairs:81});assert.equal(paused.checkpoint.nextOffset,81);assert.equal(paused.checkpoint.complete,false);
  const resumed=runIncrementalScoring({...options,resume:true});assert.equal(resumed.processed,939);assert.equal(resumed.checkpoint.complete,true);assert.equal(store.records.size,1020);
  const repeat=runIncrementalScoring(options);assert.equal(repeat.computed,0);assert.equal(store.records.size,1020);assert.equal([...store.values(context.runId)].length,1020);
  assert.throws(()=>runIncrementalScoring({...options,tenders:[tenders[0],tenders[0]],runId:"run:duplicate"}),/duplicate/);
});

test("cache writes reject conflicting deterministic payloads atomically and freeze imported records",()=>{
  const store=new MemoryPairStore();const row=scoreCompactPair(tenders[0],suppliers[0],context);
  const imported=JSON.parse(JSON.stringify(row));store.putBatch([imported],context.runId);
  imported.pairScore=99;assert.equal(store.get(row.cacheKey).pairScore,row.pairScore);
  assert.throws(()=>store.putBatch([{...row,pairScore:row.pairScore===100?0:100}],"run:conflict"),/conflicts/);
  assert.throws(()=>store.putBatch([{...row,dataCoverage:Number.NaN}],"run:invalid"),/immutable/);
  const pending=scoreCompactPair(tenders[1],suppliers[0],context);const count=store.records.size;
  assert.throws(()=>store.putBatch([pending,{...pending,evidenceConfidence:pending.evidenceConfidence===100?0:100}],"run:atomic"),/conflicts/);
  assert.equal(store.records.size,count);assert.equal(store.runs.has("run:atomic"),false);
  assert.throws(()=>runIncrementalScoring({tenders:[],suppliers:[],store,runId:"",evaluatedAt}),/explicit run/);
});

test("supplier and tender page queries remain bounded, deterministic and selected-pair consistent",()=>{
  const store=new MemoryPairStore();runIncrementalScoring({tenders,suppliers,store,...context});
  const first=queryCompactPairs(store,{supplierId:suppliers[0].id,limit:7});assert.equal(first.total,60);assert.equal(first.items.length,7);assert.equal(first.nextCursor,"7");
  const second=queryCompactPairs(store,{supplierId:suppliers[0].id,limit:7,offset:7});assert.equal(new Set([...first.items,...second.items].map((row)=>row.id)).size,14);
  for(const row of first.items)assert.equal(store.getForPair(row.supplierId,row.tenderId),row);
  const tender=queryCompactPairs(store,{tenderId:tenders[0].id,limit:100});assert.equal(tender.total,17);
  assert.throws(()=>queryCompactPairs(store,{limit:25}),/scope/);assert.throws(()=>queryCompactPairs(store,{supplierId:suppliers[0].id,limit:101}),/bounded/);
});

test("full notice text can change retrieval features but cannot create Formula technical points",()=>{
  const profile=normalizeSupplierFeatures(goodsSupplier,evidence);const original=normalizeTenderFeatures(goods);
  const changed=normalizeTenderFeatures({...goods,description:"power transformers healthcare furniture water road construction cables"});
  assert.deepEqual(changed.scoringTerms,original.scoringTerms);assert.notDeepEqual(changed.terms,original.terms);
  assert.equal(scoreCompactPair(changed,profile,context).pairScore,scoreCompactPair(original,profile,context).pairScore);
});

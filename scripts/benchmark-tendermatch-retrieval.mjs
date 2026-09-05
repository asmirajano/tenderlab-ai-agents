import { readFile } from "node:fs/promises";
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { fileURLToPath } from "node:url";
import { performance } from "node:perf_hooks";
import { runtimeTenders } from "../packages/tendermatch/src/pilot-data.ts";
import { evaluateExploratoryPair } from "../packages/tendermatch/src/exploratory-matching.ts";
import { normalizeTenderFeaturesWithHash, normalizeSupplierFeaturesWithHash } from "../packages/tendermatch/src/retrieval-features.ts";
import { MemoryPairStore, runIncrementalScoring, queryCompactPairs } from "../packages/tendermatch/src/retrieval-pipeline.ts";

const clock="2026-09-01T11:09:44.745Z";
const hashContent=(value)=>createHash("sha256").update(value).digest("hex");
const countBytes=(rows)=>{let bytes=2,count=0;for(const row of rows){bytes+=Buffer.byteLength(JSON.stringify(row))+(count?1:0);count++;}return bytes;};
const round=(n)=>Math.round(n*100)/100;
const scenarios=[{id:"supplier-1-tenders-20000",supplierCount:1,tenderCount:20_000},{id:"suppliers-20-tenders-2000",supplierCount:20,tenderCount:2_000}];
const worker=process.argv.indexOf("--worker");
if(worker!==-1){
  const mode=process.argv[worker+1];const scenario=scenarios.find((row)=>row.id===process.argv[worker+2]);if(!scenario)throw new Error("Unknown benchmark scenario");
  const runtime=JSON.parse(await readFile(new URL("../apps/tender-apps/public/tendermatch/data/supplier-runtime-v1.3.json",import.meta.url),"utf8"));
  const evidenceFile=JSON.parse(await readFile(new URL("../apps/tender-apps/public/tendermatch/data/supplier-evidence-v1.3.json",import.meta.url),"utf8"));
  const originalEvidence=Object.values(evidenceFile.evidenceBySupplier).flat();const available=runtime.suppliers.filter((row)=>row.classification==="GOODS");const notices=runtimeTenders.filter((row)=>row.procurementType==="GOODS");
  // Synthetic scale clones keep approved, non-confidential content. All are GOODS
  // so every pair is eligible; IDs/versions are synthetic and never exported live.
  const suppliers=Array.from({length:scenario.supplierCount},(_,i)=>({...available[i%available.length],canonicalEntityId:`benchmark-supplier-${i}`,profileVersionId:`benchmark-profile-${i}`}));
  const evidence=suppliers.flatMap((profile,i)=>originalEvidence.filter((row)=>row.canonicalEntityId===available[i%available.length].canonicalEntityId).map((row)=>({...row,canonicalEntityId:profile.canonicalEntityId,profileVersionId:profile.profileVersionId,claimId:`benchmark-${i}-${row.claimId}`})));
  const tenders=Array.from({length:scenario.tenderCount},(_,i)=>({...notices[i%notices.length],id:`tender:benchmark:${String(i).padStart(6,"0")}`,reference:`BENCH-${i}`,version:`benchmark-source-v1-${i}`}));
  global.gc?.();const startHeap=process.memoryUsage().heapUsed;const start=performance.now();let rows,featureRows,normalizationMs=0,scoringMs=0,cacheMs=null,cacheHits=0,batches=0,queryMs=0,selectedCount=0,modelCalls=0;
  if(mode==="legacy"){
    const scoreStart=performance.now();rows=tenders.flatMap((tender)=>suppliers.map((profile)=>evaluateExploratoryPair(tender,profile,evidence,clock)));scoringMs=performance.now()-scoreStart;
  }else{
    const preparedTenders=tenders.map((row)=>normalizeTenderFeaturesWithHash(row,hashContent));const preparedSuppliers=suppliers.map((profile)=>normalizeSupplierFeaturesWithHash(profile,evidence,hashContent));normalizationMs=performance.now()-start;
    const store=new MemoryPairStore();const scoreStart=performance.now();const result=runIncrementalScoring({tenders:preparedTenders,suppliers:preparedSuppliers,store,runId:"benchmark:initial",evaluatedAt:clock,batchSize:500,hashContent});scoringMs=performance.now()-scoreStart;batches=result.batches;modelCalls=result.modelCalls;
    const cacheStart=performance.now();const replay=runIncrementalScoring({tenders:preparedTenders,suppliers:preparedSuppliers,store,runId:"benchmark:cache-replay",evaluatedAt:clock,batchSize:500,hashContent});cacheMs=performance.now()-cacheStart;cacheHits=replay.reused;
    const queryStart=performance.now();const page=queryCompactPairs(store,{supplierId:preparedSuppliers[0].id,limit:50,eligibleOnly:true});queryMs=performance.now()-queryStart;selectedCount=page.items.length;rows=store.values();
    // Keep normalized features/store live through memory sampling, mirroring a local server.
    globalThis.__benchmarkRetained={preparedTenders,preparedSuppliers,store};
    featureRows=(function*(){yield* preparedTenders;yield* preparedSuppliers;})();
  }
  const elapsed=performance.now()-start;const jsonBytes=countBytes(rows);const featureBytes=featureRows?countBytes(featureRows):0;global.gc?.();const endHeap=process.memoryUsage().heapUsed;
  const result={scenario:scenario.id,mode,suppliers:scenario.supplierCount,tenders:scenario.tenderCount,pairs:scenario.supplierCount*scenario.tenderCount,eligiblePairs:scenario.supplierCount*scenario.tenderCount,normalizationMs:round(normalizationMs),scoringMs:round(scoringMs),cacheReplayMs:cacheMs===null?null:round(cacheMs),cacheHits,batches,queryMs:round(queryMs),shortlistSize:selectedCount,modelCalls,totalMeasuredMs:round(elapsed),retainedHeapGrowthMiB:round((endHeap-startHeap)/1048576),peakRssMiB:round(process.resourceUsage().maxRSS/1024),serializedRecordBytes:jsonBytes,serializedRecordMiB:round(jsonBytes/1048576),serializedFeatureBytes:featureBytes,serializedFeatureMiB:round(featureBytes/1048576),serializedTotalMiB:round((jsonBytes+featureBytes)/1048576)};
  process.stdout.write(JSON.stringify(result));
}else{
  const results=[];for(const scenario of scenarios)for(const mode of ["legacy","compact"]){const child=spawnSync(process.execPath,["--expose-gc","--experimental-strip-types",fileURLToPath(import.meta.url),"--worker",mode,scenario.id],{encoding:"utf8",maxBuffer:1024*1024});if(child.status!==0)throw new Error(child.stderr||child.stdout);results.push(JSON.parse(child.stdout));}
  const codeFiles=["packages/tendermatch/src/retrieval-features.ts","packages/tendermatch/src/retrieval-pipeline.ts","packages/tendermatch/src/exploratory-matching.ts","scripts/benchmark-tendermatch-retrieval.mjs"];
  const sourceCodeHashes=Object.fromEntries(await Promise.all(codeFiles.map(async(path)=>[path,hashContent((await readFile(new URL(`../${path}`,import.meta.url),"utf8")).replace(/\r\n/g,"\n"))])));
  const report={schemaVersion:"tendermatch-retrieval-benchmark/1.0.0",capturedAt:new Date().toISOString(),runtime:process.version,platform:process.platform,architecture:process.arch,evidenceClass:"LOCAL_SYNTHETIC_SCALE_EXPERIMENT",sourceCodeHashes,methodology:"Fresh Node process per mode/scenario, forced GC before/after, identical approved GOODS evidence cloned to unique synthetic identities. Compact retains normalized features and in-memory current/history indexes. Serialized bytes sum individual record and normalized-feature JSON without allocating an entire export. Total includes warm-cache replay and first bounded query for compact; scoringMs is the comparable scoring interval. Serialization measurement is outside timed intervals. No database or embedding/model calls. One measured run per scenario; timings are observations, not service guarantees.",priorReportedBaseline:{pairs:20000,deterministicSeconds:1,verboseJsonMiB:135,heapGrowthMiB:110,comparability:"Prior measurement used a different pair mix and allocation method. This report includes a same-process-method legacy control for comparison."},results};process.stdout.write(`${JSON.stringify(report,null,2)}\n`);
}

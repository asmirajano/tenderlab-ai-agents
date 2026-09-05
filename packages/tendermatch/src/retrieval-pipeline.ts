import { calculateExploratoryTechnicalFit, TENDERMATCH_EXPLORATORY_ENGINE_VERSION, TENDERMATCH_EXPLORATORY_POLICY_VERSION } from "./exploratory-matching.ts";
import { sha256Content, stableStringify, TENDERMATCH_FEATURE_VERSION } from "./retrieval-features.ts";
import type { ContentHasher, NormalizedSupplierFeatures, NormalizedTenderFeatures } from "./retrieval-features.ts";

export type PairEligibility = { state: "ELIGIBLE" | "OUTSIDE_SCORING_SCOPE" | "INELIGIBLE"; reasonCodes: string[] };
export type CompactPairRecord = {
  id: string; cacheKey: string; key: string; supplierId: string; tenderId: string;
  pairScore: number; dataCoverage: number; evidenceConfidence: number; assessedFitScore: number; denominator: 100;
  formulaVersion: string; policyVersion: string; supplierVersion: string; tenderVersion: string;
  supplierFeatureHash: string; tenderFeatureHash: string; evidenceSnapshot: string; featureVersion: string;
  mainLimitation: string; eligibility: PairEligibility; evaluatedAt: string; runId: string;
  /** Projection-only ranking field. The deterministic cache always stores null. */
  retrievalScore: number | null;
};
export type ScoringContext = { runId: string; evaluatedAt: string; formulaVersion?: string; hashContent?:ContentHasher };

/** Hard scope rules only. Unknown requirements cannot become invented exclusions.
 * Deadline freshness and authorization are independent assessment gates at request time.
 */
export function evaluateHardEligibility(tender: NormalizedTenderFeatures, supplier: NormalizedSupplierFeatures): PairEligibility {
  if (!["GOODS","WORKS"].includes(tender.procurementType)) return { state:"OUTSIDE_SCORING_SCOPE", reasonCodes:["CURRENT_SCOPE_GOODS_WORKS_ONLY"] };
  if (tender.procurementType !== supplier.procurementType) return { state:"INELIGIBLE",reasonCodes:["PROCUREMENT_TYPE_SUPPLIER_ROLE"] };
  if (supplier.readinessStatus === "exclude_from_current_matching_run") return { state:"INELIGIBLE",reasonCodes:["EXCLUSION_RESTRICTION"] };
  return { state:"ELIGIBLE",reasonCodes:[] };
}

export function compactPairCacheKey(tender: NormalizedTenderFeatures, supplier: NormalizedSupplierFeatures, formulaVersion: string = TENDERMATCH_EXPLORATORY_ENGINE_VERSION,hash:ContentHasher=sha256Content): string {
  return hash(stableStringify([formulaVersion,TENDERMATCH_EXPLORATORY_POLICY_VERSION,tender.featureKey,supplier.featureKey]));
}

/** Same Formula v1.1 scalar calculation, with normalized operands reused per source.
 * No model, relevance, deadline, readiness weight, decision, or threshold enters it.
 * Inapplicable numeric zero is retained solely for the pinned legacy matrix contract;
 * eligibility identifies it separately from an eligible, evidence-supported zero.
 */
export function scoreCompactPair(tender: NormalizedTenderFeatures, supplier: NormalizedSupplierFeatures, context: ScoringContext): CompactPairRecord {
  const formulaVersion = context.formulaVersion ?? TENDERMATCH_EXPLORATORY_ENGINE_VERSION;
  if (formulaVersion !== TENDERMATCH_EXPLORATORY_ENGINE_VERSION) throw new Error("Formula version has no registered deterministic implementation");
  if (!context.runId || !Number.isFinite(Date.parse(context.evaluatedAt))) throw new Error("Explicit run identity and valid evaluation clock required");
  const eligibility = evaluateHardEligibility(tender,supplier);
  const applicable = ["GOODS","WORKS"].includes(tender.procurementType) && tender.procurementType === supplier.procurementType;
  const works = tender.procurementType === "WORKS"; const technicalWeight = works ? 25 : 35; const marketWeight = works ? 15 : 10;
  let assessedWeight = 0; let weightedFit = 0; let weightedConfidence = 0;
  if (applicable) {
    const {technical,capacity,market} = supplier.formulaEvidence;
    if (technical.count) {
      const terms = technical.terms.reduce((sum,term) => sum + Number(tender.scoringTerms.includes(term)),0);
      const concepts = technical.concepts.reduce((sum,term) => sum + Number(tender.scoringConcepts.includes(term)),0);
      assessedWeight += technicalWeight; weightedFit += technicalWeight * calculateExploratoryTechnicalFit(concepts,terms); weightedConfidence += technicalWeight * technical.confidence;
    }
    if (capacity.count) { assessedWeight += 20; weightedFit += 20 * 3; weightedConfidence += 20 * capacity.confidence; }
    if (market.count) { const fit = market.text.includes(tender.country) || market.text.includes("central asia") ? 5 : /global|asia|international/.test(market.text) ? 4 : 2; assessedWeight += marketWeight; weightedFit += marketWeight * fit; weightedConfidence += marketWeight * market.confidence; }
  }
  const cacheKey = compactPairCacheKey(tender,supplier,formulaVersion,context.hashContent);
  const mainLimitation = eligibility.reasonCodes[0] ?? (assessedWeight === 0 ? "NO_SUPPORTED_CRITERION_POINTS" : "SCORING_ONLY_NO_MATCH_THRESHOLD");
  return Object.freeze({ id:`compact-pair:${cacheKey}`,cacheKey,key:`${tender.id}::${supplier.id}`,supplierId:supplier.id,tenderId:tender.id,pairScore:Math.round(weightedFit/5),dataCoverage:assessedWeight,evidenceConfidence:assessedWeight ? Math.round(weightedConfidence/assessedWeight) : 0,assessedFitScore:assessedWeight ? Math.round(100*weightedFit/(5*assessedWeight)) : 0,denominator:100,formulaVersion,policyVersion:TENDERMATCH_EXPLORATORY_POLICY_VERSION,supplierVersion:supplier.sourceVersion,tenderVersion:tender.sourceVersion,supplierFeatureHash:supplier.featureKey,tenderFeatureHash:tender.featureKey,evidenceSnapshot:supplier.evidenceSnapshot,featureVersion:TENDERMATCH_FEATURE_VERSION,mainLimitation,eligibility:Object.freeze({...eligibility,reasonCodes:Object.freeze(eligibility.reasonCodes) as unknown as string[]}),evaluatedAt:context.evaluatedAt,runId:context.runId,retrievalScore:null });
}

export type ScoringCheckpoint = { runId:string; inputIdentity:string; nextOffset:number; complete:boolean };
function deterministicRecordIdentity(row:CompactPairRecord) { const {runId: _runId,evaluatedAt: _evaluatedAt,...identity}=row;void _runId;void _evaluatedAt;return stableStringify(identity); }
/** Local/transient store. Atomic synchronous insert-if-absent mirrors the database
 * UNIQUE cache key contract. Historic evaluations and run membership stay separate.
 */
export class MemoryPairStore {
  readonly records = new Map<string,CompactPairRecord>();
  readonly currentByPair = new Map<string,CompactPairRecord>();
  readonly supplierPairs = new Map<string,Set<string>>();
  readonly tenderPairs = new Map<string,Set<string>>();
  readonly runs = new Map<string,Set<string>>();
  readonly runPairKeys = new Map<string,Map<string,string>>();
  readonly checkpoints = new Map<string,ScoringCheckpoint>();
  get(cacheKey:string) { return this.records.get(cacheKey); }
  getForPair(supplierId:string,tenderId:string,runId?:string) { const key=`${tenderId}::${supplierId}`;if(runId){const cacheKey=this.runPairKeys.get(runId)?.get(key);return cacheKey?this.records.get(cacheKey):undefined;}return this.currentByPair.get(key); }
  *values(runId?:string): IterableIterator<CompactPairRecord> { if (runId) { for (const key of this.runs.get(runId) ?? []) { const row=this.records.get(key);if(row) yield row; } } else yield* this.currentByPair.values(); }
  current(runId?:string) { return this.values(runId); }
  *forScope(supplierId?:string,tenderId?:string,runId?:string):IterableIterator<CompactPairRecord> { const keys=supplierId ? this.supplierPairs.get(supplierId) : tenderId ? this.tenderPairs.get(tenderId) : null;if(!keys)return;for(const key of keys){const cacheKey=runId?this.runPairKeys.get(runId)?.get(key):undefined;const row=runId?(cacheKey?this.records.get(cacheKey):undefined):this.currentByPair.get(key);if(row)yield row;} }
  putBatch(rows:CompactPairRecord[],runId:string) {
    if(!runId)throw new Error("Explicit run identity required");
    const identities=new Map<string,CompactPairRecord>();const batchPairs=new Map<string,string>();const runPairs=this.runPairKeys.get(runId)??new Map<string,string>();
    for (const row of rows) {
      if (row.retrievalScore !== null || [row.pairScore,row.dataCoverage,row.evidenceConfidence,row.assessedFitScore].some((value)=>!Number.isInteger(value)||value<0||value>100) || row.denominator!==100) throw new Error("Invalid immutable Formula record");
      const previous=identities.get(row.cacheKey)??this.records.get(row.cacheKey);
      if(previous&&previous!==row&&deterministicRecordIdentity(previous)!==deterministicRecordIdentity(row))throw new Error("Deterministic cache identity conflicts with an existing result");
      const previousPair=batchPairs.get(row.key)??runPairs.get(row.key);if(previousPair&&previousPair!==row.cacheKey)throw new Error("Evaluation run already binds another version of this pair");
      identities.set(row.cacheKey,row);
      batchPairs.set(row.key,row.cacheKey);
    }
    const membership=this.runs.get(runId) ?? new Set<string>(); let inserted=0;
    for(const row of rows) { let stored=this.records.get(row.cacheKey); if(!stored) { stored=Object.freeze({...row,eligibility:Object.freeze({...row.eligibility,reasonCodes:Object.freeze([...row.eligibility.reasonCodes]) as unknown as string[]})});this.records.set(row.cacheKey,stored);inserted++; } this.currentByPair.set(row.key,stored);membership.add(row.cacheKey);runPairs.set(row.key,row.cacheKey); const supplier=this.supplierPairs.get(row.supplierId)??new Set<string>();supplier.add(row.key);this.supplierPairs.set(row.supplierId,supplier);const tender=this.tenderPairs.get(row.tenderId)??new Set<string>();tender.add(row.key);this.tenderPairs.set(row.tenderId,tender); }
    this.runs.set(runId,membership);this.runPairKeys.set(runId,runPairs);return inserted;
  }
}

export type IncrementalScoringOptions = ScoringContext & {
  tenders:NormalizedTenderFeatures[];suppliers:NormalizedSupplierFeatures[];store:MemoryPairStore;batchSize?:number;
  changedTenderIds?:string[];changedSupplierIds?:string[];maxPairs?:number;resume?:boolean;
};
export function runIncrementalScoring(options:IncrementalScoringOptions) {
  const {tenders,suppliers,store,runId,evaluatedAt}=options;const batchSize=options.batchSize ?? 500;
  if(!Number.isInteger(batchSize)||batchSize<1||batchSize>10_000) throw new Error("batchSize must be 1..10000");
  if(options.maxPairs!==undefined&&(!Number.isInteger(options.maxPairs)||options.maxPairs<1)) throw new Error("maxPairs must be a positive integer");
  if(new Set(tenders.map((row)=>row.id)).size!==tenders.length||new Set(suppliers.map((row)=>row.id)).size!==suppliers.length) throw new Error("Source population contains duplicate canonical IDs");
  const tenderIds=options.changedTenderIds ? new Set(options.changedTenderIds) : null;const supplierIds=options.changedSupplierIds ? new Set(options.changedSupplierIds) : null;
  const filtered=Boolean(tenderIds||supplierIds);const formulaVersion=options.formulaVersion ?? TENDERMATCH_EXPLORATORY_ENGINE_VERSION;
  if(formulaVersion!==TENDERMATCH_EXPLORATORY_ENGINE_VERSION||!runId||!Number.isFinite(Date.parse(evaluatedAt)))throw new Error("Registered Formula, explicit run identity and valid evaluation clock required");
  const inputIdentity=(options.hashContent??sha256Content)(stableStringify([formulaVersion,tenders.map((row)=>row.featureKey),suppliers.map((row)=>row.featureKey),options.changedTenderIds,options.changedSupplierIds]));
  const previous=store.checkpoints.get(runId);if(previous&&previous.inputIdentity!==inputIdentity) throw new Error("Run identity already binds different inputs; start a new evaluation run");
  const start=options.resume ? previous?.nextOffset ?? 0 : 0;let offset=0,processed=0,computed=0,reused=0,batches=0,eligible=0;let pending:CompactPairRecord[]=[];let paused=false;
  const flush=()=>{if(!pending.length)return;store.putBatch(pending,runId);pending=[];batches++;store.checkpoints.set(runId,{runId,inputIdentity,nextOffset:offset,complete:false});};
  outer: for(const tender of tenders) for(const supplier of suppliers) {
    if(filtered&&!tenderIds?.has(tender.id)&&!supplierIds?.has(supplier.id)&&!supplierIds?.has(supplier.canonicalEntityId))continue;
    if(offset<start){offset++;continue;}
    if(processed===(options.maxPairs ?? Infinity)){paused=true;break outer;}
    const key=compactPairCacheKey(tender,supplier,formulaVersion,options.hashContent);let row=store.get(key);
    if(row)reused++;else{row=scoreCompactPair(tender,supplier,{runId,evaluatedAt,formulaVersion,hashContent:options.hashContent});computed++;}
    if(row.eligibility.state==="ELIGIBLE")eligible++;pending.push(row);offset++;processed++;if(pending.length>=batchSize)flush();
  }
  flush();const checkpoint={runId,inputIdentity,nextOffset:offset,complete:!paused};store.checkpoints.set(runId,checkpoint);
  return {runId,inputIdentity,processed,computed,reused,batches,eligible,notEligible:processed-eligible,checkpoint,modelCalls:0 as const};
}

export type CompactPairQuery = {supplierId?:string;tenderId?:string;runId?:string;limit?:number;offset?:number;sort?:"pairScore"|"retrievalScore";eligibleOnly?:boolean};
/** Bounded result window for a supplier or tender; it never emits the universe. */
export function queryCompactPairs(store:MemoryPairStore,query:CompactPairQuery) {
  if(!query.supplierId&&!query.tenderId)throw new Error("A supplier or tender scope is required");
  if(query.sort==="retrievalScore")throw new Error("Retrieval ranking requires the separate retrieval projection");
  const limit=query.limit ?? 25;const offset=query.offset ?? 0;
  if(!Number.isInteger(limit)||limit<1||limit>100||!Number.isInteger(offset)||offset<0)throw new Error("Invalid bounded page");
  let total=0;const window:CompactPairRecord[]=[];const compare=(a:CompactPairRecord,b:CompactPairRecord)=>b.pairScore-a.pairScore||a.key.localeCompare(b.key);
  for(const row of store.forScope(query.supplierId,query.tenderId,query.runId)){
    if(query.supplierId&&row.supplierId!==query.supplierId)continue;if(query.tenderId&&row.tenderId!==query.tenderId)continue;if(query.eligibleOnly&&row.eligibility.state!=="ELIGIBLE")continue;total++;
    let lo=0,hi=window.length;while(lo<hi){const mid=(lo+hi)>>>1;if(compare(row,window[mid])<0)hi=mid;else lo=mid+1;}window.splice(lo,0,row);if(window.length>offset+limit)window.pop();
  }
  const items=window.slice(offset,offset+limit);return {items,total,offset,limit,nextCursor:offset+items.length<total ? String(offset+items.length) : null};
}

/** Versioned adapter, not a new Formula or eligibility policy. */
import { scoreCompactPair } from "./retrieval-pipeline.ts";
import { calculateExploratoryTechnicalFit, exploratoryFeatureRules as rules, TENDERMATCH_EXPLORATORY_ENGINE_VERSION, TENDERMATCH_EXPLORATORY_POLICY_VERSION } from "./exploratory-matching.ts";
import { sha256Content, stableStringify, TENDERMATCH_FEATURE_VERSION } from "./retrieval-features.ts";
import type { NormalizedSupplierFeatures, NormalizedTenderFeatures } from "./retrieval-features.ts";
import type { SupplierReadiness } from "./supplier-readiness.ts";
import type { SupplierEvidenceApiRecord } from "./supplier-contract.ts";
import type { ScopeInput } from "./eligibility-scope.ts";

export const STAGE4_ADAPTER = "tendermatch-stage2a-formula-adapter/1.0.0";
export const STAGE4_SCHEMA = "tendermatch-development-formula-result/1.0.0";
export const FORMULA = TENDERMATCH_EXPLORATORY_ENGINE_VERSION;
export const FORMULA_POLICY = TENDERMATCH_EXPLORATORY_POLICY_VERSION;
export const hashAdapter = (value:unknown) => sha256Content(stableStringify(value));
type Scope = "GOODS" | "WORKS";
type Ref = { id:string; claimId:string; factIds:string[]; sourceRecordId:string; artifactId:string|null; artifactHash:string|null; sourceStatus:string; valueClass:string; field:string; reasons:string[] };
export type AdaptedSupplier = { kind:"supplier"; id:string; key:string; eligibilityKey:string; readinessId:string; readinessHash:string; sourceClassification:string|null; candidateScope:string; scopes:string[]; evidence:SupplierEvidenceApiRecord[]; references:Ref[]; groups:Record<string,string[]>; withheld:{factId:string;reason:string}[]; prepared:NormalizedSupplierFeatures };
export type TenderSeed = {id:string;sourceVersion:string;featureKey:string;contentHash:string;title:string;reference:string|null;procurementType:string;country:{name:string}|null;formulaInputs:{scoringTerms:string[];scoringConcepts:string[]};sourceDates:{deadlineAt:string|null;timezone:string|null}};
export type AdaptedTender = { kind:"tender";id:string;key:string;eligibilityKey:string;sourceFeatureHash:string;countryMissing:boolean;sourceTimezone:string|null;prepared:NormalizedTenderFeatures };
export type FormulaInput = AdaptedSupplier | AdaptedTender;
const unique=(values:string[])=>[...new Set(values)].sort();
const technicalFields=new Set(["product_families","works_specializations","industries_served","materials"]);
const capacityFields=new Set(["output_capacity","workforce","facilities","equipment"]);
const groupFor=(field:string)=>technicalFields.has(field)?"technical":field==="capacity"?"capacity":"market";

/** Preserve claim identity once per formula field; facts remain separately traceable.
 * Reporting vintage may remain absent for an otherwise unambiguous physical stock.
 * Output rate requires a time basis. Uncertain/negated/missing-artifact facts stay out.
 */
export function adaptStage2aSupplier(r:SupplierReadiness,scope:ScopeInput):AdaptedSupplier {
  if(r.supplierId!==scope.id||r.contentHash!==scope.readinessHash||r.readinessId!==scope.readinessId)throw new Error("Stage 2A / eligibility identity mismatch");
  const refs:Ref[]=[],evidence:SupplierEvidenceApiRecord[]=[],withheld:AdaptedSupplier["withheld"]=[];
  const groups=new Map<string,typeof r.facts>();
  for(const f of r.facts){
    const field=technicalFields.has(f.field)?f.field:capacityFields.has(f.field)?"capacity":f.field==="geographic_markets"?f.field:null;
    if(!field)continue;
    const audit=r.audit.find(a=>a.claimId===f.sourceClaimId);
    let allowed=f.state==="MAPPED"&&typeof f.value==="string"&&f.value.trim().length>0;
    if(field==="capacity"){
      const q=f.value&&typeof f.value==="object"&&!Array.isArray(f.value)?f.value:null;
      allowed=!!q&&typeof q.normalizedAmount==="string"&&/^\d+(?:\.\d+)?$/.test(q.normalizedAmount)&&!!q.unit&&!!q.metric
        &&f.reasons.every(reason=>reason==="REPORTING_PERIOD_MISSING")&&(f.field!=="output_capacity"||!!q.timeBasis||!!q.reportingPeriod);
    }
    if(!allowed||!audit||audit.sourceStatus==="UNKNOWN"||audit.sourceValueClass!=="SOURCE"||!audit.sourceRecordId||!audit.artifactAvailable||!audit.artifactId){withheld.push({factId:f.id,reason:"UNRESOLVED_OR_UNSUPPORTED_FORMULA_OPERAND"});continue;}
    const key=`${field}:${f.sourceClaimId}`;groups.set(key,[...(groups.get(key)??[]),f]);
  }
  for(const [key,facts] of [...groups].sort(([a],[b])=>a.localeCompare(b))){
    const field=key.slice(0,key.indexOf(':')),claimId=facts[0].sourceClaimId,a=r.audit.find(a=>a.claimId===claimId)!;
    const id=`adapter:${key}`,value=unique(facts.map(f=>typeof f.value==="string"?f.value:f.sourceSpan)).join("; ");
    refs.push({id,claimId,factIds:facts.map(f=>f.id).sort(),sourceRecordId:a.sourceRecordId,artifactId:a.artifactId,artifactHash:a.artifactHash,sourceStatus:a.sourceStatus,valueClass:a.sourceValueClass,field,reasons:unique(facts.flatMap(f=>f.reasons))});
    evidence.push({canonicalEntityId:r.supplierId,profileVersionId:r.identity.profileVersionId!,claimId:id,externalClaimId:claimId,field,value,normalizedValue:null,status:a.sourceStatus,sourceSystem:a.sourceSystem,sourceTitle:null,sourceUrl:null,retrievedAt:a.retrievedAt,sourceRecordId:a.sourceRecordId,sourceArtifactId:a.artifactId,artifactAvailable:a.artifactAvailable,artifactStatus:a.artifactStatus,artifactSha256:a.artifactHash,artifactLimitation:a.artifactLimitation});
  }
  const aggregate=(group:string)=>{const rows=evidence.filter(e=>groupFor(e.field)===group);return {count:rows.length,confidence:rows.length?Math.round(rows.reduce((n,e)=>n+rules.confidence(e),0)/rows.length):0,evidenceIds:rows.map(e=>e.claimId).sort()};};
  const technical=aggregate("technical"),capacity=aggregate("capacity"),market=aggregate("market");
  const terms=unique(evidence.filter(e=>groupFor(e.field)==="technical").flatMap(e=>[...rules.tokens(e.value??"")]));
  const prepared:NormalizedSupplierFeatures={kind:"supplier",id:r.supplierId,canonicalEntityId:r.supplierId,profileVersionId:r.identity.profileVersionId!,displayName:r.profile.display_name,sourceVersion:r.identity.sourceVersion,sourceSnapshot:r.readinessId,featureVersion:TENDERMATCH_FEATURE_VERSION,contentHash:r.contentHash,featureKey:scope.key,evidenceSnapshot:r.contentHash,sourceRole:"AUTHORITATIVE_SOURCE",procurementType:"UNRESOLVED",geography:[],terms:[],concepts:[],thresholds:[],embedding:{state:"MISSING",model:null,dimensions:null,version:null,contentHash:null},readinessStatus:"requires_enrichment",capabilities:[],formulaEvidence:{technical:{...technical,terms,concepts:[...rules.concepts(new Set(terms))].sort()},capacity,market:{...market,text:evidence.filter(e=>e.field==="geographic_markets").map(e=>e.value).join(" ").toLowerCase()}}};
  const body={kind:"supplier" as const,id:r.supplierId,eligibilityKey:scope.key,readinessId:r.readinessId,readinessHash:r.contentHash,sourceClassification:r.classification.sourceClassification,candidateScope:r.classification.scope,scopes:r.classification.signals,evidence,references:refs,groups:{technical:technical.evidenceIds,capacity:capacity.evidenceIds,market:market.evidenceIds},withheld,prepared};
  return {...body,key:hashAdapter({adapter:STAGE4_ADAPTER,...body})};
}

export function adaptStage2Tender(f:TenderSeed,scope:ScopeInput):AdaptedTender {
  if(f.id!==scope.id||f.contentHash!==scope.featureHash||f.featureKey!==scope.featureKey||f.procurementType!==scope.category)throw new Error("Stage 2 / eligibility tender mismatch");
  // Only exact Stage 2 scoring operands; display title truncation and derived tags
  // cannot silently change Formula scoring. No deadline parsing or UTC inference.
  const prepared:NormalizedTenderFeatures={kind:"tender",id:f.id,sourceVersion:f.sourceVersion,sourceSnapshot:f.featureKey,featureVersion:TENDERMATCH_FEATURE_VERSION,contentHash:f.contentHash,featureKey:scope.key,evidenceSnapshot:f.featureKey,sourceRole:"AUTHORITATIVE_SOURCE",procurementType:f.procurementType,geography:[],terms:[],concepts:[],thresholds:[],embedding:{state:"MISSING",model:null,dimensions:null,version:null,contentHash:null},reference:f.reference??f.id,title:f.title,requirements:[],country:f.country?.name.toLowerCase()??"",scoringTerms:f.formulaInputs.scoringTerms,scoringConcepts:f.formulaInputs.scoringConcepts,deadlineAt:f.sourceDates.deadlineAt??"",databaseStatus:"OPEN"};
  const body={kind:"tender" as const,id:f.id,eligibilityKey:scope.key,sourceFeatureHash:f.contentHash,countryMissing:!f.country?.name,sourceTimezone:f.sourceDates.timezone,prepared};
  return {...body,key:hashAdapter({adapter:STAGE4_ADAPTER,...body})};
}
export function validateFormulaInput(input:FormulaInput){const {key,...body}=input;if(key!==hashAdapter({adapter:STAGE4_ADAPTER,...body}))throw new Error("Adapter input body changed");return input;}

export const criterionCodes=(scope:Scope)=>scope==="WORKS"?["works-technical-relevance","similar-contracts","personnel-equipment-capacity","mobilization-local-delivery","financial-procurement-readiness"]:["technical-relevance","capacity-delivery","comparable-experience","market-delivery","financial-procurement-readiness"];
export type FormulaResult={pairScore:number;dataCoverage:number;assessedFitScore:number;evidenceConfidence:number;denominator:100;fit:(number|null)[];states:number[];points:number[];max:number[];confidence:(number|null)[];referenceGroups:number[];limitationMasks:number[];limitation:number;formulaMainReason:string};
export const CRITERION_LIMITATIONS = ["CRITERION_EVIDENCE_MISSING","TENDER_CAPACITY_THRESHOLD_UNKNOWN","INDEPENDENT_VERIFICATION_MISSING","NO_NORMALIZED_TECHNICAL_OVERLAP","NOTICE_LEVEL_TECHNICAL_COMPARISON","DELIVERY_FEASIBILITY_UNVERIFIED"] as const;
/** Group 0 = none/Missing, 1 = technical, 2 = capacity, 3 = market. State 0 =
 * MISSING, state 1 = assessed. Criteria are in the unchanged Formula order.
 */
export function evaluateStage4Pair(s:AdaptedSupplier,t:AdaptedTender,eligibilityState:string,runId:string,evaluatedAt:string):FormulaResult|null {
  if(eligibilityState!=="CANDIDATE_ELIGIBLE_WITH_LIMITATIONS")return null;
  const scope=t.prepared.procurementType;
  if(!["GOODS","WORKS"].includes(scope)||!s.scopes.includes(scope))throw new Error("Candidate scope contradiction");
  const e=s.prepared.formulaEvidence;
  // Empty geography must not reach Formula's includes("") branch.
  const market=t.countryMissing?{count:0,confidence:0,evidenceIds:[],text:""}:e.market;
  const projected={...s.prepared,procurementType:scope,formulaEvidence:{...e,market}};
  const scalar=scoreCompactPair(t.prepared,projected,{runId,evaluatedAt});
  const technicalFit=e.technical.count?calculateExploratoryTechnicalFit(e.technical.concepts.filter(x=>t.prepared.scoringConcepts.includes(x)).length,e.technical.terms.filter(x=>t.prepared.scoringTerms.includes(x)).length):null;
  const capacityFit=e.capacity.count?3:null,marketFit=market.count?(market.text.includes(t.prepared.country)||market.text.includes("central asia")?5:/global|asia|international/.test(market.text)?4:2):null;
  const works=scope==="WORKS",fit=works?[technicalFit,null,capacityFit,marketFit,null]:[technicalFit,capacityFit,null,marketFit,null],max=works?[25,25,20,15,15]:[35,20,20,10,15];
  const confidence=works?[e.technical.count?e.technical.confidence:null,null,e.capacity.count?e.capacity.confidence:null,market.count?market.confidence:null,null]:[e.technical.count?e.technical.confidence:null,e.capacity.count?e.capacity.confidence:null,null,market.count?market.confidence:null,null];
  const points=fit.map((f,i)=>f===null?0:max[i]*f/5),states=fit.map(f=>f===null?0:1),referenceGroups=(works?[1,0,2,3,0]:[1,2,0,3,0]).map((g,i)=>fit[i]===null?0:g);
  const limitation=max.map((m,i)=>({i,lost:m-points[i],missing:fit[i]===null})).sort((a,b)=>b.lost-a.lost||Number(b.missing)-Number(a.missing)||a.i-b.i)[0].i;
  const limitationMasks=fit.map((f,i)=>f===null?1:(confidence[i]!==100?4:0)|(referenceGroups[i]===1?16|(f===0?8:0):referenceGroups[i]===2?2:32));
  const result:FormulaResult={pairScore:scalar.pairScore,dataCoverage:scalar.dataCoverage,assessedFitScore:scalar.assessedFitScore,evidenceConfidence:scalar.evidenceConfidence,denominator:100,fit,states,points,max,confidence,referenceGroups,limitationMasks,limitation,formulaMainReason:scalar.mainLimitation};
  validateFormulaResult(result,s,scope as Scope);return result;
}
export function validateFormulaResult(r:FormulaResult,s:AdaptedSupplier,scope:Scope){
  const expected=scope==="WORKS"?[25,25,20,15,15]:[35,20,20,10,15];
  if(r.denominator!==100||JSON.stringify(r.max)!==JSON.stringify(expected)||[r.fit,r.states,r.points,r.confidence,r.referenceGroups,r.limitationMasks].some(a=>a.length!==5))throw new Error("Formula component shape/weights changed");
  for(let i=0;i<5;i++){
    const f=r.fit[i];if(f!==null&&(!Number.isInteger(f)||f<0||f>5)||r.states[i]!==Number(f!==null)||r.points[i]!==r.max[i]*(f??0)/5)throw new Error("Fit/Missing/points invariant failed");
    const group=["","technical","capacity","market"][r.referenceGroups[i]];
    if(f===null&&(r.confidence[i]!==null||r.referenceGroups[i]!==0)||f!==null&&(!group||!s.groups[group]?.length||r.confidence[i]===null))throw new Error("Criterion evidence linkage failed");
    if(r.limitationMasks[i]!== (f===null?1:(r.confidence[i]!==100?4:0)|(r.referenceGroups[i]===1?16|(f===0?8:0):r.referenceGroups[i]===2?2:32)))throw new Error("Criterion limitation flags differ");
  }
  const coverage=r.max.reduce((n,w,i)=>n+(r.fit[i]===null?0:w),0),points=r.points.reduce((a,b)=>a+b,0);
  const confidence=coverage?Math.round(r.max.reduce((n,w,i)=>n+w*(r.confidence[i]??0),0)/coverage):0;
  if(r.pairScore!==points||r.dataCoverage!==coverage||r.assessedFitScore!==(coverage?Math.round(points*100/coverage):0)||r.evidenceConfidence!==confidence||[r.pairScore,r.dataCoverage,r.assessedFitScore,r.evidenceConfidence].some(n=>!Number.isInteger(n)||n<0||n>100))throw new Error("Formula scalar/component invariant failed");
  return r;
}
export function expandCriterionAudit(r:FormulaResult,s:AdaptedSupplier,t:AdaptedTender){return criterionCodes(t.prepared.procurementType as Scope).map((code,i)=>({code,fit:r.fit[i],state:r.states[i]===0?"MISSING":"ASSESSED",valueClass:r.states[i]===0?"MISSING":"ESTIMATED",points:r.points[i],maxPoints:r.max[i],evidenceConfidence:r.confidence[i],references:(s.groups[["","technical","capacity","market"][r.referenceGroups[i]]]??[]).map(id=>s.references.find(ref=>ref.id===id)!),tenderEvidence:{sourceRecordId:t.id,featureHash:t.sourceFeatureHash},limitations:CRITERION_LIMITATIONS.filter((_,bit)=>r.limitationMasks[i]&(1<<bit)),mainLimitation:i===r.limitation}));}

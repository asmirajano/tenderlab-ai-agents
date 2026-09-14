/** Isolated Stage 3. No Formula evaluator, model, retrieval or human decisions. */
import { sha256Content, stableStringify } from "./retrieval-features.ts";

export const ELIGIBILITY_SCHEMA = "tendermatch-eligibility-scope/1.0.0";
export const ELIGIBILITY_POLICY = "tendermatch-development-goods-works-scope/1.0.0";
export const STATES = ["OUTSIDE_FORMULA_V1_1_SCOPE", "NEEDS_EVIDENCE", "SCOPE_NOT_DEMONSTRATED", "CANDIDATE_ELIGIBLE_WITH_LIMITATIONS", "HARD_EXCLUDED"] as const;
export const REASONS = ["UNSUPPORTED_TENDER_CATEGORY", "TENDER_CATEGORY_MISSING", "SUPPLIER_PROFILE_UNRESOLVED", "SUPPLIER_SCOPE_MISSING", "NO_EVIDENCED_COMMON_SCOPE", "PROVISIONAL_SCOPE_REQUIRES_REVIEW", "SOURCE_SCOPE_WITH_LIMITATIONS", "INDEPENDENT_VERIFICATION_REQUIRED", "COMPLIANCE_NOT_ASSESSED", "TENDER_REQUIREMENTS_MISSING", "DEADLINE_TIMEZONE_UNRESOLVED", "EXPLICIT_HARD_EXCLUSION", "UNRESOLVED_EXCLUSION_EVIDENCE", "MIXED_SCOPE_REVIEW_REQUIRED"] as const;
export type Scope = "GOODS" | "WORKS" | "SERVICES" | "CONSULTING";
export type EvidenceRef = { id:string; sourceRecordId:string; artifactId:string|null; status:string; valueClass:string };
export type HardEvidence = { reason:"LEGAL_RESTRICTION"|"DEBARMENT"|"EXPLICIT_PROHIBITION"; applies:boolean|null; evidence:EvidenceRef[] };
export type ScopeInput = {
  kind:"supplier"|"tender"; id:string; key:string; featureKey:string; featureHash:string;
  sourceHash:string; sourceVersion:string; category:string|null; profileState:string|null;
  candidateScope:string|null; signals:Scope[]; scopeEvidence:EvidenceRef[];
  readinessId:string|null; readinessHash:string|null; readinessState:string|null;
  classificationValueClass:string|null; candidateReasons:string[];
  deadline:string|null; timezone:string|null; requirementsMissing:boolean;
  hardEvidence:HardEvidence[];
};
const hash=(v:unknown)=>sha256Content(stableStringify(v));
export const scopeInputKey=(v:Omit<ScopeInput,"key">)=>hash({schema:ELIGIBILITY_SCHEMA,...v});
export function validateScopeInput(v:ScopeInput) {
  const {key,...body}=v;
  if (!/^[a-f0-9-]{36}$/i.test(v.id)||key!==scopeInputKey(body)||!["supplier","tender"].includes(v.kind)
    || [v.featureKey,v.featureHash,v.sourceHash].some(x=>!/^[a-f0-9]{64}$/.test(x))) throw new Error("Scope input identity mismatch");
  if (v.signals.some(x=>!["GOODS","WORKS","SERVICES","CONSULTING"].includes(x))||new Set(v.signals).size!==v.signals.length) throw new Error("Invalid scope signals");
  return v;
}
export type ScopeOutcome = { state:typeof STATES[number]; reasonMask:number; hardGate:"NOT_ASSESSED"|"UNRESOLVED"|"EXCLUDED";
  scopeRelation:"UNKNOWN"|"COMMON_EVIDENCED_SCOPE"|"NOT_DEMONSTRATED"|"OUTSIDE_FORMULA";
  servicePotential:"NOT_EVALUATED"|"POTENTIALLY_RELEVANT_OUTSIDE_FORMULA";
  scoringState:"NOT_SCORED" };
export function reasonCodes(mask:number) {return REASONS.filter((_,i)=>(mask&(1<<i))!==0);}
const maskOf=(codes:readonly typeof REASONS[number][])=>codes.reduce((m,c)=>m|(1<<REASONS.indexOf(c)),0);

/** Trusted structured restrictions only. Raw lexical risk wording is not a hard exclusion. */
export function evaluateEligibility(s:ScopeInput,t:ScopeInput):ScopeOutcome {
  if(s.kind!=="supplier"||t.kind!=="tender")throw new Error("Wrong pair orientation");
  const hard=[...s.hardEvidence,...t.hardEvidence];
  const supportedHard=hard.some(h=>h.applies===true&&h.evidence.length>0&&h.evidence.every(e=>e.status==="VERIFIED"&&e.valueClass==="SOURCE"&&!!e.id&&!!e.sourceRecordId&&!!e.artifactId));
  const unresolved=hard.some(h=>h.applies!==false)&&!supportedHard;
  const hardGate=supportedHard?"EXCLUDED":unresolved?"UNRESOLVED":"NOT_ASSESSED";
  const hasScope=s.scopeEvidence.some(e=>e.status!=="UNKNOWN"&&e.valueClass==="SOURCE"&&!!e.id&&!!e.sourceRecordId);
  const common=hasScope&&s.signals.includes(t.category as Scope);
  const outside=t.category!==null&&!["GOODS","WORKS"].includes(t.category);
  const servicePotential=outside&&hasScope&&["SERVICES","CONSULTING"].includes(t.category!)&&s.signals.some(x=>x==="SERVICES"||x==="CONSULTING")?"POTENTIALLY_RELEVANT_OUTSIDE_FORMULA":"NOT_EVALUATED";
  const reasons:typeof REASONS[number][]=[];
  let state:ScopeOutcome["state"],scopeRelation:ScopeOutcome["scopeRelation"];
  if(outside){state="OUTSIDE_FORMULA_V1_1_SCOPE";scopeRelation="OUTSIDE_FORMULA";reasons.push("UNSUPPORTED_TENDER_CATEGORY");}
  else if(t.category===null){state="NEEDS_EVIDENCE";scopeRelation="UNKNOWN";reasons.push("TENDER_CATEGORY_MISSING");}
  else if(s.profileState!=="PINNED"){state="NEEDS_EVIDENCE";scopeRelation="UNKNOWN";reasons.push("SUPPLIER_PROFILE_UNRESOLVED");}
  else if(!hasScope||!s.signals.length){state="NEEDS_EVIDENCE";scopeRelation="UNKNOWN";reasons.push("SUPPLIER_SCOPE_MISSING");}
  else if(!common){state="SCOPE_NOT_DEMONSTRATED";scopeRelation="NOT_DEMONSTRATED";reasons.push("NO_EVIDENCED_COMMON_SCOPE");}
  else {state="CANDIDATE_ELIGIBLE_WITH_LIMITATIONS";scopeRelation="COMMON_EVIDENCED_SCOPE";
    reasons.push(s.classificationValueClass==="ESTIMATED"||s.category!==t.category?"PROVISIONAL_SCOPE_REQUIRES_REVIEW":"SOURCE_SCOPE_WITH_LIMITATIONS");}
  if(s.candidateScope==="MIXED")reasons.push("MIXED_SCOPE_REVIEW_REQUIRED");
  reasons.push("COMPLIANCE_NOT_ASSESSED");
  if(s.scopeEvidence.some(e=>e.status!=="VERIFIED")||!s.scopeEvidence.length)reasons.push("INDEPENDENT_VERIFICATION_REQUIRED");
  if(t.requirementsMissing)reasons.push("TENDER_REQUIREMENTS_MISSING");
  if(!t.timezone)reasons.push("DEADLINE_TIMEZONE_UNRESOLVED");
  if(supportedHard){reasons.push("EXPLICIT_HARD_EXCLUSION");if(!outside)state="HARD_EXCLUDED";}
  else if(unresolved){reasons.push("UNRESOLVED_EXCLUSION_EVIDENCE");if(!outside)state="NEEDS_EVIDENCE";}
  return {state,reasonMask:maskOf(reasons),hardGate,scopeRelation,servicePotential,scoringState:"NOT_SCORED"};
}
export const HARD=["NOT_ASSESSED","UNRESOLVED","EXCLUDED"] as const;
export const RELATION=["UNKNOWN","COMMON_EVIDENCED_SCOPE","NOT_DEMONSTRATED","OUTSIDE_FORMULA"] as const;
export const POTENTIAL=["NOT_EVALUATED","POTENTIALLY_RELEVANT_OUTSIDE_FORMULA"] as const;
export const encodeOutcome=(o:ScopeOutcome)=>[STATES.indexOf(o.state),o.reasonMask,HARD.indexOf(o.hardGate),RELATION.indexOf(o.scopeRelation),POTENTIAL.indexOf(o.servicePotential)];
export function decodeOutcome(v:readonly number[]):ScopeOutcome {
  if(v.length!==5||v.some(n=>!Number.isInteger(n))||!STATES[v[0]]||v[1]<1||v[1]>=(1<<REASONS.length)||!HARD[v[2]]||!RELATION[v[3]]||!POTENTIAL[v[4]])throw new Error("Invalid compact eligibility outcome");
  return {state:STATES[v[0]],reasonMask:v[1],hardGate:HARD[v[2]],scopeRelation:RELATION[v[3]],servicePotential:POTENTIAL[v[4]],scoringState:"NOT_SCORED"};
}
export const eligibilityCacheKey=(supplierKey:string,tenderKey:string,policyHash:string)=>hash([ELIGIBILITY_SCHEMA,policyHash,supplierKey,tenderKey]);

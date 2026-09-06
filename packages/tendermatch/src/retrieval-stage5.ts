/** Isolated pair-local fallback. Never consumes Formula points or invents vectors. */
import { hashAdapter, validateFormulaInput } from './formula-stage4-adapter.ts';
import type { FormulaInput } from './formula-stage4-adapter.ts';

export const RETRIEVAL_PROFILE_VERSION = 'tendermatch-frozen-retrieval-profile/1.0.0';
export const STAGE5_METHOD = 'tendermatch-pair-local-lexical-structured/1.0.0';
export const STAGE5_SCHEMA = 'tendermatch-development-ranking/1.0.0';
export const RANKING_SCALE = 1_000_000;
export const STAGE5_POLICY = Object.freeze({
  version: STAGE5_METHOD, profileVersion: RETRIEVAL_PROFILE_VERSION, schema: STAGE5_SCHEMA,
  lexicalWeight: 4, structuredWeight: 1, denominator: 5, scale: RANKING_SCALE,
  overlap: 'unique-set Jaccard; empty union contributes zero; floor each weighted channel',
  ordering: 'relevance descending, canonical opposite entity UUID ascending',
  semanticState: 'MISSING', embeddingModel: null, maxTerms: 256, maxConcepts: 128,
  population: 'every and only sealed Formula candidate, including retrieval zero',
});
export const RANKING_LIMITATIONS = ['NO_EMBEDDING_SOURCE', 'LEXICAL_STRUCTURED_PROXY_NOT_SEMANTIC_SIMILARITY',
  'NOTICE_LEVEL_FROZEN_TECHNICAL_EVIDENCE', 'NOT_A_FORMULA_SCORE_OR_MATCH_DECISION'] as const;

export type RetrievalProfile = {
  key: string; version: typeof RETRIEVAL_PROFILE_VERSION; kind: 'supplier'|'tender'; id: string;
  formulaInputKey: string; sourceHash: string; sourceVersion: string;
  terms: string[]; concepts: string[]; scopes: string[];
  references: {id:string; sourceRecordId:string; artifactId:string|null; sourceStatus:string; valueClass:string}[];
  missingTechnicalEvidence: boolean; truncatedTerms: number; truncatedConcepts: number;
  semantic: {state:'MISSING'; model:null; dimensions:null}; limitations: string[];
};
// Unicode scalar ordering agrees with PostgreSQL COLLATE "C", including supplementary letters.
const scalarOrder=(a:string,b:string)=>{const aa=Array.from(a),bb=Array.from(b);for(let i=0;i<Math.min(aa.length,bb.length);i++){const d=aa[i].codePointAt(0)!-bb[i].codePointAt(0)!;if(d)return d;}return aa.length-bb.length;};
const canonical = (terms:readonly string[]) => [...new Set(terms)].sort(scalarOrder);
export function extractRetrievalProfile(input:FormulaInput):RetrievalProfile {
  validateFormulaInput(input);
  const supplier=input.kind==='supplier';
  const allTerms=canonical(supplier?input.prepared.formulaEvidence.technical.terms:input.prepared.scoringTerms);
  const allConcepts=canonical(supplier?input.prepared.formulaEvidence.technical.concepts:input.prepared.scoringConcepts);
  const references=supplier?input.references.filter(r=>input.groups.technical.includes(r.id)).map(r=>({
    id:r.id,sourceRecordId:r.sourceRecordId,artifactId:r.artifactId,sourceStatus:r.sourceStatus,valueClass:r.valueClass,
  })).sort((a,b)=>a.id<b.id?-1:a.id>b.id?1:0):[{
    id:input.id,sourceRecordId:input.id,artifactId:null,sourceStatus:'PINNED_NOTICE_RECORD',valueClass:'SOURCE',
  }];
  const body:Omit<RetrievalProfile,'key'>={version:RETRIEVAL_PROFILE_VERSION,kind:input.kind,id:input.id,formulaInputKey:input.key,
    sourceHash:supplier?input.readinessHash:input.sourceFeatureHash,sourceVersion:input.prepared.sourceVersion,
    terms:allTerms.slice(0,STAGE5_POLICY.maxTerms),concepts:allConcepts.slice(0,STAGE5_POLICY.maxConcepts),
    scopes:canonical(supplier?input.scopes:[input.prepared.procurementType]),references,
    missingTechnicalEvidence:supplier?input.prepared.formulaEvidence.technical.count===0:allTerms.length===0,
    truncatedTerms:Math.max(0,allTerms.length-STAGE5_POLICY.maxTerms),truncatedConcepts:Math.max(0,allConcepts.length-STAGE5_POLICY.maxConcepts),
    semantic:{state:'MISSING' as const,model:null,dimensions:null},limitations:[...RANKING_LIMITATIONS,
      ...(supplier&&references.some(r=>r.sourceStatus!=='VERIFIED')?['SOURCE_STATUS_NOT_UPGRADED']:[]),
      ...(allTerms.length>STAGE5_POLICY.maxTerms||allConcepts.length>STAGE5_POLICY.maxConcepts?['RETRIEVAL_ONLY_VOCABULARY_TRUNCATED']:[])]};
  return validateRetrievalProfile({...body,key:hashAdapter(body)});
}
export function validateRetrievalProfile(profile:RetrievalProfile) {
  const {key,...body}=profile;
  if(key!==hashAdapter(body)||profile.version!==RETRIEVAL_PROFILE_VERSION||profile.semantic.state!=='MISSING'
    ||profile.semantic.model!==null||profile.semantic.dimensions!==null
    ||profile.terms.length>256||profile.concepts.length>128
    ||JSON.stringify(profile.terms)!==JSON.stringify(canonical(profile.terms))
    ||JSON.stringify(profile.concepts)!==JSON.stringify(canonical(profile.concepts)))throw new Error('Retrieval profile identity/shape differs');
  if(profile.kind==='supplier'&&((profile.terms.length||profile.concepts.length)&&!profile.references.length
    ||profile.references.some(r=>!r.artifactId||!r.sourceRecordId||r.sourceStatus==='UNKNOWN'||r.valueClass!=='SOURCE')))
    throw new Error('Retrieval profile lacks supported technical references');
  return profile;
}
function overlap(a:readonly string[],b:readonly string[]) {
  const values=a.filter(x=>b.includes(x));return {overlap:values.length,union:a.length+b.length-values.length};
}
export type PairRetrieval = {lexicalOverlap:number; lexicalUnion:number; structuredOverlap:number; structuredUnion:number;
  relevanceUnits:number; limitationMask:number};
/** Fixed rational arithmetic is independent of other entities and Formula scalars. */
export function calculatePairRetrieval(s:RetrievalProfile,t:RetrievalProfile):PairRetrieval {
  if(s.kind!=='supplier'||t.kind!=='tender'||!s.scopes.includes(t.scopes[0]))throw new Error('Retrieval candidate scope contradiction');
  const lexical=overlap(s.terms,t.terms),structured=overlap(s.concepts,t.concepts);
  return {lexicalOverlap:lexical.overlap,lexicalUnion:lexical.union,structuredOverlap:structured.overlap,structuredUnion:structured.union,
    relevanceUnits:(lexical.union?Math.floor(800_000*lexical.overlap/lexical.union):0)+(structured.union?Math.floor(200_000*structured.overlap/structured.union):0),
    limitationMask:(s.missingTechnicalEvidence||t.missingTechnicalEvidence?1:0)|(lexical.overlap+structured.overlap===0?2:0)
      |(s.truncatedTerms+t.truncatedTerms+s.truncatedConcepts+t.truncatedConcepts>0?4:0)};
}
export function rankingExplanation(r:PairRetrieval,s:RetrievalProfile,t:RetrievalProfile) {
  return {methodVersion:STAGE5_METHOD,valueClass:'CALCULATED',retrievalRelevance:r.relevanceUnits/RANKING_SCALE,
    ...r,semanticSimilarity:null,semanticState:'MISSING',embeddingModel:null,
    matchedTerms:s.terms.filter(x=>t.terms.includes(x)),matchedConcepts:s.concepts.filter(x=>t.concepts.includes(x)),
    supplierReferences:s.references,tenderReferences:t.references,limitations:[...RANKING_LIMITATIONS,
      ...(r.limitationMask&1?['TECHNICAL_EVIDENCE_MISSING']:[]),...(r.limitationMask&2?['NO_OBSERVED_RETRIEVAL_OVERLAP']:[]),
      ...(r.limitationMask&4?['RETRIEVAL_ONLY_VOCABULARY_TRUNCATED']:[])]};
}

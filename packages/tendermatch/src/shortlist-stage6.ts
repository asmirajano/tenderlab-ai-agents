/** Deterministic review-budget policy, never a fit score or automated decision. */
import {createHash} from 'node:crypto';
export const SHORTLIST_VERSION='tendermatch-directional-shortlist/1.0.0';
export const SHORTLIST_SCHEMA='tendermatch-development-shortlist/1.0.0';
export interface ShortlistPolicy {name:string;supplierReview:number;tenderReview:number;supplierAudit:number;tenderAudit:number}
export const POLICIES:ShortlistPolicy[]=[
 {name:'positive-only',supplierReview:1000000,tenderReview:0,supplierAudit:0,tenderAudit:0},
 {name:'focused-50-2',supplierReview:50,tenderReview:2,supplierAudit:2,tenderAudit:1},
 {name:'balanced-100-3',supplierReview:100,tenderReview:3,supplierAudit:2,tenderAudit:1},
 {name:'broad-250-5',supplierReview:250,tenderReview:5,supplierAudit:2,tenderAudit:1},
];
export interface SelectionInput {supplierId:string;tenderId:string;units:number;score:number;coverage:number;confidence:number;mask:number;limitation:number}
export interface Nomination {supplierId:string;tenderId:string;tier:'REVIEW_CANDIDATE'|'AUDIT_ONLY';rank:number;tieSize:number;reason:string}
const cmp=(a:string,b:string)=>a<b?-1:a>b?1:0;
export const keyOf=(p:SelectionInput|Nomination)=>`${p.supplierId}:${p.tenderId}`;
export const auditPriority=(p:SelectionInput)=>createHash('sha256').update(JSON.stringify([SHORTLIST_VERSION,'blind-spot-audit',p.supplierId,p.tenderId])).digest('hex');
export function validateSelectionInput(p:SelectionInput){
 const uuid=/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/;
 if(!uuid.test(p.supplierId)||!uuid.test(p.tenderId)||!Number.isInteger(p.units)||p.units<0||p.units>1000000||![p.score,p.coverage,p.confidence].every(x=>Number.isInteger(x)&&x>=0&&x<=100)||!Number.isInteger(p.mask)||p.mask<0||p.mask>7||!Number.isInteger(p.limitation)||p.limitation<0||p.limitation>4)throw new Error('Invalid frozen shortlist input');
 return p;
}
export function nominate(rows:SelectionInput[],kind:'supplier'|'tender',policy:ShortlistPolicy):Nomination[]{
 if(!['supplier','tender'].includes(kind)||new Set(rows.map(p=>p[kind==='supplier'?'supplierId':'tenderId'])).size>1)throw new Error('Nomination requires one explicit focus');
 const cap=kind==='supplier'?policy.supplierReview:policy.tenderReview,auditCap=kind==='supplier'?policy.supplierAudit:policy.tenderAudit;
 if(![cap,auditCap].every(x=>Number.isInteger(x)&&x>=0&&x<=1000000))throw new Error('Invalid nomination budget');
 const opposite=(p:SelectionInput)=>kind==='supplier'?p.tenderId:p.supplierId;
 // Lexicographic dimensions remain separate. No weighted or blended score.
 const ordered=rows.filter(p=>p.units>0).sort((a,b)=>b.units-a.units||b.score-a.score||b.coverage-a.coverage||b.confidence-a.confidence||cmp(opposite(a),opposite(b)));
 const ties=new Map<string,number>();for(const p of ordered){const k=JSON.stringify([p.units,p.score,p.coverage,p.confidence]);ties.set(k,(ties.get(k)??0)+1);}
 const result:Nomination[]=ordered.slice(0,cap).map((p,i)=>({supplierId:p.supplierId,tenderId:p.tenderId,tier:'REVIEW_CANDIDATE',rank:i+1,tieSize:ties.get(JSON.stringify([p.units,p.score,p.coverage,p.confidence]))!,reason:`${kind.toUpperCase()}_POSITIVE_BUDGET`}));
 const audits=rows.filter(p=>p.units===0).map(p=>({p,priority:auditPriority(p)})).sort((a,b)=>cmp(a.priority,b.priority)||cmp(opposite(a.p),opposite(b.p)));
 result.push(...audits.slice(0,auditCap).map(({p},i)=>({supplierId:p.supplierId,tenderId:p.tenderId,tier:'AUDIT_ONLY' as const,rank:i+1,tieSize:audits.length,reason:`${kind.toUpperCase()}_ZERO_RETRIEVAL_AUDIT`})));return result;
}
export function simulatePolicy(rows:SelectionInput[],policy:ShortlistPolicy){
 const contexts={supplier:new Map<string,SelectionInput[]>(),tender:new Map<string,SelectionInput[]>()};
 for(const p of rows){validateSelectionInput(p);for(const kind of ['supplier','tender'] as const){const id=kind==='supplier'?p.supplierId:p.tenderId;let list=contexts[kind].get(id);if(!list)contexts[kind].set(id,list=[]);list.push(p);}}
 const selected=new Map<string,{input:SelectionInput;nominations:Nomination[]}>(),byKey=new Map(rows.map(p=>[keyOf(p),p]));
 if(byKey.size!==rows.length)throw new Error('Duplicate shortlist pair');
 for(const kind of ['supplier','tender'] as const)for(const list of contexts[kind].values())for(const nomination of nominate(list,kind,policy)){const key=keyOf(nomination);let prior=selected.get(key);if(!prior)selected.set(key,prior={input:byKey.get(key)!,nominations:[]});prior.nominations.push(nomination);}
 const values=[...selected.values()].sort((a,b)=>cmp(keyOf(a.input),keyOf(b.input))),positive=values.filter(v=>v.input.units>0),audit=values.filter(v=>v.input.units===0);
 const histogram=(values:typeof positive,kind:'supplier'|'tender')=>{const counts=new Map<string,number>();for(const v of values){const id=kind==='supplier'?v.input.supplierId:v.input.tenderId;counts.set(id,(counts.get(id)??0)+1);}const ns=[...counts.values()];return {covered:counts.size,min:ns.length?Math.min(...ns):0,max:ns.length?Math.max(...ns):0};};
 return {values,summary:{policy,candidates:rows.length,positivePopulation:rows.filter(p=>p.units>0).length,selected:values.length,selectedPercent:100*values.length/rows.length,reviewCandidates:positive.length,auditOnly:audit.length,actualAiTorsReady:0,reviewSupplier:histogram(positive,'supplier'),reviewTender:histogram(positive,'tender'),auditSupplier:histogram(audit,'supplier'),auditTender:histogram(audit,'tender'),allSupplier:histogram(values,'supplier'),allTender:histogram(values,'tender'),ambiguousSelected:positive.filter(v=>v.nominations.some(n=>n.tieSize>1)).length,formulaZeroReview:positive.filter(v=>v.input.score===0).length,coverageZeroReview:positive.filter(v=>v.input.coverage===0).length,confidenceRange:positive.length?[Math.min(...positive.map(v=>v.input.confidence)),Math.max(...positive.map(v=>v.input.confidence))]:[],outcomeHash:createHash('sha256').update(JSON.stringify(values)).digest('hex')}};
}

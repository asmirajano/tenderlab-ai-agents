/** Deterministic affected-set planning: entity-sized metadata, never a pair matrix. */
import {readFile} from 'node:fs/promises';
import {sha} from './tendermatch-input-manifest.mjs';
import {digest,BOUNDS} from './tendermatch-stage10-source.mjs';
export const COORDINATOR_VERSION='tendermatch-incremental-coordinator/1.0.0';
export const VERSION_KEYS=['normalization','readiness','eligibility','formula','retrieval','shortlist','escalation','prompt','provider','torsSchema','coordinator'];
const root=new URL('../../',import.meta.url);
export async function currentVersions(){
  const groups={normalization:['packages/tendermatch/src/input-normalization.ts','packages/tendermatch/src/retrieval-features.ts','packages/tendermatch/src/exploratory-matching.ts'],readiness:['packages/tendermatch/src/supplier-readiness.ts'],eligibility:['packages/tendermatch/src/eligibility-scope.ts','scripts/lib/tendermatch-eligibility-inputs.mjs'],formula:['packages/tendermatch/src/formula-stage4-adapter.ts','packages/tendermatch/src/retrieval-pipeline.ts','packages/tendermatch/src/exploratory-matching.ts'],retrieval:['packages/tendermatch/src/retrieval-stage5.ts'],shortlist:['packages/tendermatch/src/shortlist-stage6.ts','scripts/lib/tendermatch-stage6.mjs'],escalation:['packages/tendermatch/src/escalation-stage7.ts'],coordinator:['scripts/lib/tendermatch-stage10-source.mjs','scripts/lib/tendermatch-stage10-plan.mjs','scripts/lib/tendermatch-stage10-store.mjs','scripts/lib/tendermatch-stage10.mjs','scripts/tendermatch-stage10.mjs']};
  groups.readiness.push('packages/tendermatch/src/input-normalization.ts','packages/tendermatch/src/retrieval-features.ts');groups.formula.push('packages/tendermatch/src/retrieval-features.ts');
  const versions={};for(const [kind,files] of Object.entries(groups)){const values={};for(const f of files)values[f]=sha((await readFile(new URL(f,root),'utf8')).replaceAll('\r\n','\n'));versions[kind]=sha(kind==='coordinator'?{files:values,node:process.versions.node,v8:process.versions.v8,sqlite:process.versions.sqlite}:values);}
  const {PROMPT_VERSION,PROMPT,TORS_SCHEMA}=await import('../../packages/tendermatch/src/escalation-stage7.ts');return {...versions,prompt:sha([PROMPT_VERSION,PROMPT]),provider:sha({state:'UNCONFIGURED',executableAdapters:0}),torsSchema:sha(TORS_SCHEMA)};
}
export function planDelta(capture,previous,versions){
  if(VERSION_KEYS.some(k=>!digest(versions[k]))||Object.keys(versions).some(k=>!VERSION_KEYS.includes(k)))throw Error('VERSION_BINDING_REQUIRED');
  if(previous&&previous.tenantId!==capture.tenantId)throw Error('TENANT_MISMATCH');
  const old=new Map((previous?.members??[]).map(m=>[m.kind+':'+m.id,m])),now=new Map(capture.members.map(m=>[m.kind+':'+m.id,m]));
  const changedVersions=VERSION_KEYS.filter(k=>versions[k]!==previous?.versions[k]),sourceContractChanges=['supplier','tender'].filter(k=>previous&&capture.identity.contracts[k]!==previous.identity.contracts[k]),changes={};
  for(const kind of ['supplier','tender']){const current=capture.members.filter(m=>m.kind===kind);changes[kind]={added:current.filter(m=>!old.has(kind+':'+m.id)).map(m=>m.id),changed:current.filter(m=>old.has(kind+':'+m.id)&&(old.get(kind+':'+m.id).digest!==m.digest||sourceContractChanges.includes(kind))).map(m=>m.id),removed:[...old.values()].filter(m=>m.kind===kind&&!now.has(kind+':'+m.id)).map(m=>m.id)};}
  const full=!previous||changedVersions.some(k=>['normalization','readiness','eligibility','formula','retrieval','coordinator'].includes(k));
  const supplierIds=full?capture.members.filter(m=>m.kind==='supplier').map(m=>m.id):[...changes.supplier.added,...changes.supplier.changed].sort();
  const tenderIds=full?[]:[...changes.tender.added,...changes.tender.changed].sort();
  const affectedPairs=supplierIds.length*capture.tenderCount+tenderIds.length*(capture.supplierCount-supplierIds.length);
  const noop=!!previous&&previous.inputHash===capture.inputHash&&changedVersions.length===0;
  const identity={version:COORDINATOR_VERSION,tenantId:capture.tenantId,parentRunId:previous?.runId??null,inputHash:capture.inputHash,versions};
  const contextGlobal=!previous||affectedPairs>0&&full||changedVersions.includes('shortlist');
  return {runId:noop?previous.runId:sha(identity),identity,capture,versions,changes,changedVersions,sourceContractChanges,noop,parentRunId:previous?.runId??null,
    pairWork:{supplierIds,tenderIds,affectedPairs,full,universe:capture.universe,retainedPairs:previous?capture.universe-affectedPairs:0},
    invalidation:{pairStage:changedVersions.some(k=>['normalization','readiness','eligibility','coordinator'].includes(k))?'ELIGIBILITY':changedVersions.includes('formula')?'FORMULA':changedVersions.includes('retrieval')?'RETRIEVAL':affectedPairs?'ENDPOINT_INPUT':'NONE',contextGlobal,shortlistRule:'Rebuild changed directional contexts and memberships depending on either context; no rescoring of unchanged pairs',assessmentRule:'Prompt/provider/schema/input changes invalidate only assessment reuse identity; coordinator creates no requests or calls'},
    bounds:BOUNDS,executionAuthority:false,modelCalls:0};
}
export function* affectedPages(plan,batch=BOUNDS.batch){
  if(!Number.isInteger(batch)||batch<1||batch>BOUNDS.maxBatch)throw Error('BATCH_BUDGET');
  const suppliers=plan.capture.members.filter(m=>m.kind==='supplier'),tenders=plan.capture.members.filter(m=>m.kind==='tender'),ss=new Set(plan.pairWork.supplierIds),tt=new Set(plan.pairWork.tenderIds);
  for(const s of suppliers){const relevant=ss.has(s.id)?tenders:tenders.filter(t=>tt.has(t.id));for(let i=0;i<relevant.length;i+=batch)yield {supplierId:s.id,tenderIds:relevant.slice(i,i+batch).map(t=>t.id)};}
}

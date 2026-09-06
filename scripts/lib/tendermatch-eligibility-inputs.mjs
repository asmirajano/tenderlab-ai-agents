/** Read-only approved Stage 2/2A inputs. Never refresh an accepted pin implicitly. */
import {readFile} from 'node:fs/promises';
import pg from 'pg';
import {secret} from '../tendermatch-input-manifest.mjs';
import {DEV_TARGET as T,guardUrl,assertRestrictedRole} from './tendermatch-dev-contract.mjs';
import {TENANT,TENDER,guardTenderUrl,captureSource,sha,inventoryDigest} from './tendermatch-input-manifest.mjs';
import {loadRegistered,normalizerCodeIdentity} from './tendermatch-normalization.mjs';
import {readinessCodeIdentity} from '../tendermatch-align-suppliers.mjs';
import {scopeInputKey,validateScopeInput} from '../../packages/tendermatch/src/eligibility-scope.ts';
const root=new URL('../../',import.meta.url);
export const BASE='5a7f0a9124ada9053f5b1b466d79148cae6ccc16';
export const stage2=JSON.parse(await readFile(new URL('docs/evidence/tendermatch-development-stage2.json',root),'utf8'));
export const stage2a=JSON.parse(await readFile(new URL('docs/evidence/tendermatch-stage2a-readiness.json',root),'utf8'));
export async function connectStage3(kind='results'){
 const source=kind==='source',tender=kind==='tender';
 const value=await secret(tender?process.env.TENDERMATCH_TENDER_ENV_FILE:new URL(source?T.consumerSecretFile:T.writerSecretFile,root),tender?'TENDERMATCH_NEON_DATABASE_URL':source?T.consumerVariable:T.writerVariable);
 const url=tender?guardTenderUrl(value):guardUrl(value,kind,source?T.consumerLogin:T.writerLogin);
 const c=new pg.Client({connectionString:url.href,connectionTimeoutMillis:15000,query_timeout:60000,enableChannelBinding:true});c.on('error',()=>{});
 const query=c.query.bind(c);c.metrics={kind,queries:0,responseBytes:0,requestBytes:0,maxResponseBytes:0};
 c.query=async(q,v)=>{c.metrics.queries++;c.metrics.requestBytes+=Buffer.byteLength(JSON.stringify(v??[]));const r=await query(q,v);const n=Buffer.byteLength(JSON.stringify(r.rows??[]));c.metrics.responseBytes+=n;c.metrics.maxResponseBytes=Math.max(c.metrics.maxResponseBytes,n);return r;};
 try{await c.connect();const [actual]=(await c.query('SELECT current_database() db,current_user role')).rows;
  if(actual.db!==(tender?TENDER.database:source?T.sourceDatabase:T.resultDatabase)||actual.role!==(tender?TENDER.role:source?T.consumerLogin:T.writerLogin))throw new Error('Target mismatch');
  if(!tender)await assertRestrictedRole(c,source?T.consumerLogin:T.writerLogin,source?T.readerRole:T.writerRole,true);
  if(!source&&!tender)await c.query("SELECT set_config('tendermatch.tenant_id',$1,false)",[TENANT]);return c;
 }catch{await c.end().catch(()=>{});throw new Error('Stage 3 connection identity failed; secret details suppressed');}
}
export async function inspectDrift(c){
 const registered=await loadRegistered(c,stage2.manifestId),captures={};
 for(const kind of ['supplier','tender']){const client=await connectStage3(kind==='supplier'?'source':'tender');try{
  const capture=await captureSource(client,kind);const pinned=registered.members.filter(m=>m.kind===kind),before=new Map(pinned.map(m=>[m.entity_id,sha(m.provenance)])),after=new Map(capture.members.map(m=>[m.entity_id,sha(m.provenance)]));
  captures[kind]={pinned:inventoryDigest(pinned),observed:inventoryDigest(capture.members),
    added:[...after.keys()].filter(id=>!before.has(id)).length,removed:[...before.keys()].filter(id=>!after.has(id)).length,
    changed:[...after].filter(([id,h])=>before.has(id)&&before.get(id)!==h).length,
    observation:capture.observation,metrics:client.metrics};
 }finally{await client.end();}}
 if(captures.supplier.added||captures.supplier.removed||captures.supplier.changed)throw new Error('Supplier evidence drift requires new Stage 2A boundary');
 return {registered,captures};
}
export function projectScopeInput(f,r){
 const common={kind:f.kind,id:f.id,featureKey:f.featureKey,featureHash:f.contentHash,sourceHash:f.inputIdentity.baseContentHash,sourceVersion:f.sourceVersion,
  category:f.procurementType??null,profileState:null,candidateScope:null,signals:[],scopeEvidence:[],readinessId:null,readinessHash:null,readinessState:null,classificationValueClass:null,candidateReasons:[],deadline:null,timezone:null,requirementsMissing:true,hardEvidence:[]};
 if(f.kind==='supplier'){
  if(!r||r.supplierId!==f.id||r.identity.baseContentHash!==common.sourceHash||r.identity.sourceVersion!==f.sourceVersion)throw new Error('Readiness/normalization source mismatch');
  const ids=new Set(r.classification.evidenceIds);
  Object.assign(common,{profileState:f.sourceState.profile,candidateScope:r.classification.scope,signals:[...r.classification.signals].sort(),
    scopeEvidence:r.audit.filter(a=>ids.has(a.claimId)).map(a=>({id:a.claimId,sourceRecordId:a.sourceRecordId,artifactId:a.artifactId,status:a.sourceStatus,valueClass:a.sourceValueClass})).sort((a,b)=>a.id.localeCompare(b.id)),
    readinessId:r.readinessId,readinessHash:r.contentHash,readinessState:r.readiness.state,classificationValueClass:r.classification.valueClass,candidateReasons:r.classification.reasons});
 }else{if(f.provenance.status!=='OPEN'||f.provenance.deleted===true)throw new Error('Pinned tender is outside OPEN/nondeleted universe');Object.assign(common,{deadline:f.sourceDates.deadlineAt,timezone:f.sourceDates.timezone});}
 return validateScopeInput({...common,key:scopeInputKey(common)});
}
export async function loadPinnedScopeInputs(c){
 if((await normalizerCodeIdentity()).hash!==stage2.code.hash||(await readinessCodeIdentity()).hash!==stage2a.code.hash)throw new Error('Protected Stage 2/2A implementation drift');
 const readiness=JSON.parse(await readFile(new URL(`outputs/stage2a/readiness-${stage2a.runId}.json`,root),'utf8'));
 if(readiness.runId!==stage2a.runId||readiness.sourceHash!==stage2a.sourceHash||sha(readiness.records.map(r=>[r.supplierId,r.readinessId,r.contentHash]))!==stage2a.outcomeHash)throw new Error('Readiness pinned outcome mismatch');
 for(const r of readiness.records){const {contentHash,...body}=r;if(sha(body)!==contentHash||sha(r.identity)!==r.readinessId)throw new Error('Readiness body mismatch');}
 const readies=new Map(readiness.records.map(r=>[r.supplierId,r]));
 const [header]=(await c.query('SELECT identity FROM tendermatch_retrieval.normalization_snapshot WHERE tenant_id=$1 AND normalization_id=$2',[TENANT,stage2.normalizationId])).rows;
 if(!header||sha(header.identity)!==stage2.normalizationId)throw new Error('Pinned normalization missing or corrupt');
 const inputs=[],outcomes=[];let pages=0;
 for(const kind of ['supplier','tender']){let after=null;while(true){const {rows}=await c.query(`SELECT m.kind,m.entity_id::text,m.feature_key,m.content_hash,m.state,m.reasons,f.feature FROM tendermatch_retrieval.normalization_member m JOIN tendermatch_retrieval.normalized_feature f USING(tenant_id,feature_key) WHERE m.tenant_id=$1 AND m.normalization_id=$2 AND m.kind=$3 AND ($4::uuid IS NULL OR m.entity_id>$4::uuid) ORDER BY m.entity_id LIMIT 500`,[TENANT,stage2.normalizationId,kind,after]);pages++;
  for(const row of rows){const {feature:f,...o}=row,{contentHash,...body}=f;if(sha(body)!==contentHash||contentHash!==o.content_hash||f.featureKey!==o.feature_key||f.id!==o.entity_id)throw new Error('Normalized body/association mismatch');inputs.push(projectScopeInput(f,readies.get(f.id)));outcomes.push(o);}
  if(rows.length<500)break;after=rows.at(-1).entity_id;
 }}
 if(sha(outcomes)!==stage2.identity.outcomeHash||inputs.filter(i=>i.kind==='supplier').length!==117||inputs.filter(i=>i.kind==='tender').length!==17333)throw new Error('Pinned universe hash/count mismatch');
 return {inputs,pages,protectedInputs:{manifestId:stage2.manifestId,normalizationId:stage2.normalizationId,normalizationOutcome:stage2.identity.outcomeHash,readinessRun:stage2a.runId,readinessOutcome:stage2a.outcomeHash,readinessSchema:stage2a.schema,readinessPolicy:stage2a.policy,readinessCodeHash:stage2a.code.hash}};
}

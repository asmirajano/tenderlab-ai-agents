/** Source feature preparation only: no evaluation/retrieval execution imports. */
import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { captureSource, assemble, sha, canonical, TENDER_PAGE, TENANT, inventoryDigest } from './tendermatch-input-manifest.mjs';
import { INPUT_FEATURE_VERSION, INPUT_ADAPTER_VERSION, INPUT_SCHEMA_VERSION, DESCRIPTION_LIMIT, normalizeSourceInput, inputFeatureKey, validateSourceFeature } from '../../packages/tendermatch/src/input-normalization.ts';

const root=new URL('../../',import.meta.url);
export const NORMALIZATION_VERSION='tendermatch-manifest-normalization/1.0.0';
export const CODE_FILES=['packages/tendermatch/src/input-normalization.ts','packages/tendermatch/src/retrieval-features.ts','packages/tendermatch/src/exploratory-matching.ts','packages/tendermatch/src/supplier-contract.ts','packages/tendermatch/src/types.ts','scripts/lib/tendermatch-normalization.mjs','scripts/lib/tendermatch-input-manifest.mjs','scripts/lib/tendermatch-dev-contract.mjs','db/tendermatch-dev/target.json'];
export async function normalizerCodeIdentity(){const files={};for(const f of CODE_FILES) files[f]=createHash('sha256').update((await readFile(new URL(f,root),'utf8')).replaceAll('\r\n','\n')).digest('hex');return {files,hash:sha(files)};}

// The original inventory query and hash stay byte-for-byte in this CTE. Every
// additional consumed FK value (including tag relationship origin) is in stage2.
export const FEATURE_TENDER_PAGE=`WITH members AS (${TENDER_PAGE}) SELECT m.*,
 jsonb_build_object('tender',jsonb_build_object(
 'title',t.title,'description',left(t.description,${DESCRIPTION_LIMIT}),'descriptionLength',coalesce(length(t.description),0),
 'procurementType',t."procurementType",'status',t.status,'reference',coalesce(t."externalRef",t."sourceRef"),
 'budgetAmount',t."budgetAmount"::text,'budgetCurrency',t."budgetCurrency",'budgetUsd',t."budgetUsd"::text,
 'deadlineAt',m.deadline,'publishedAt',to_char(t."publishedAt",'YYYY-MM-DD"T"HH24:MI:SS.US'),
 'sourceTimezone',t."sourceTimezone",'deadlineSourceText',t."deadlineSourceText"),
 'references',jsonb_build_object('externalRef',t."externalRef",'sourceRef',t."sourceRef",'sourceNoticeUrl',t."sourceNoticeUrl"),
 'lookups',jsonb_build_object('country',CASE WHEN c.id IS NULL THEN NULL ELSE jsonb_build_object('id',c.id,'name',c.name,'isoAlpha2',c."isoAlpha2",'isoAlpha3',c."isoAlpha3") END,
 'tags',coalesce(tags.items,'[]'::jsonb))) stage2
 FROM members m JOIN public.tenders t ON t.id=m.id::uuid
 LEFT JOIN public.countries c ON c.id=t."primaryCountryId"
 LEFT JOIN LATERAL(SELECT jsonb_agg(jsonb_build_object('id',g.id,'label',g.label,'slug',g.slug,'kind',g.kind,'origin',tt.origin) ORDER BY g.id) items
 FROM public.tender_tags tt LEFT JOIN public.tags g ON g.id=tt."tagId" WHERE tt."tenderId"=t.id) tags ON true ORDER BY m.id`;

export async function captureFeatureSource(client,kind) {
  const profiles=[],evidence=[],projections=new Map();let payloadBytes=0,maxPageBytes=0,peakHeapBytes=0;
  const measured={query:async(sql,values)=>{
    const result=await client.query(sql===TENDER_PAGE?FEATURE_TENDER_PAGE:sql,values);
    const bytes=Buffer.byteLength(JSON.stringify(result.rows));payloadBytes+=bytes;maxPageBytes=Math.max(maxPageBytes,bytes);peakHeapBytes=Math.max(peakHeapBytes,process.memoryUsage().heapUsed);
    if(bytes>12*1024*1024)throw new Error('Source page payload limit');
    if(sql===TENDER_PAGE){result.rows=result.rows.map(row=>{const {stage2,...member}=row;if(stage2.lookups.tags.length>1000)throw new Error('Tender tag count limit');projections.set(row.id,stage2);return member;});}
    else if(sql.startsWith('SELECT * FROM tendermatch_all_supplier_api.current_supplier_profiles WHERE')) profiles.push(...result.rows);
    else if(sql.startsWith('SELECT * FROM tendermatch_all_supplier_api.current_supplier_evidence WHERE')) evidence.push(...result.rows);
    return result;
  }};
  const captured=await captureSource(measured,kind);
  const source=captured.members.map(member=>{
    if(kind==='tender'){const p=projections.get(member.entity_id);if(!p)throw new Error('Missing tender body');return {kind,id:member.entity_id,sourceVersion:String(member.provenance.version),baseContentHash:member.provenance.content_sha256,provenance:{...member.provenance,references:p.references},tender:p.tender,lookups:p.lookups};}
    const profile=profiles.find(p=>p.canonical_entity_id===member.entity_id);
    if(!profile)throw new Error('Missing supplier body');
    const rows=evidence.filter(e=>e.canonical_entity_id===member.entity_id).sort((a,b)=>a.claim_id.localeCompare(b.claim_id));
    return JSON.parse(canonical({kind,id:member.entity_id,sourceVersion:profile.profile_version??`unresolved:${profile.profile_state}`,baseContentHash:member.provenance.content_sha256,provenance:member.provenance,profile,evidence:rows}));
  });
  return {captured,source,metrics:{...captured.observation.metrics,payloadBytes,maxPageBytes,peakHeapBytes}};
}
export function reconcileSourceCapture(supplier,tender,registered) {
  const fresh=assemble(supplier.captured,tender.captured);
  if(sha(registered.identity)!==registered.manifestId)throw new Error('Registered manifest identity corrupted');
  for(const kind of ['supplier','tender'])if(sha(inventoryDigest(registered.members.filter(m=>m.kind===kind)))!==sha(registered.identity[kind]))throw new Error('Registered membership corrupted');
  return {fresh,unchanged:fresh.manifestId===registered.manifestId,source:[...supplier.source,...tender.source]};
}
export async function loadRegistered(client,manifestId) {
  if(!/^[a-f0-9]{64}$/.test(manifestId??''))throw new Error('Explicit registered manifest required');
  const [header]=(await client.query('SELECT identity FROM tendermatch_retrieval.input_manifest WHERE tenant_id=$1 AND manifest_id=$2',[TENANT,manifestId])).rows;
  if(!header)throw new Error('Registered manifest absent');
  const members=[];
  for(const kind of ['supplier','tender']){
    let after=null;while(true){const {rows}=await client.query('SELECT kind,entity_id::text,provenance FROM tendermatch_retrieval.input_member WHERE tenant_id=$1 AND manifest_id=$2 AND kind=$3 AND ($4::uuid IS NULL OR entity_id>$4::uuid) ORDER BY entity_id LIMIT 500',[TENANT,manifestId,kind,after]);members.push(...rows);if(rows.length<500)break;after=rows.at(-1).entity_id;}
  }
  return {manifestId,identity:header.identity,members};
}
export async function prepareFeatures(client,inputs,codeHash) {
  const start=performance.now(),features=[];let reused=0,normalized=0,cacheQueries=0,peakHeapBytes=0;
  for(let i=0;i<inputs.length;i+=500){
    const page=inputs.slice(i,i+500),keys=page.map(x=>inputFeatureKey(x,codeHash));
    const existing=new Map((await client.query('SELECT feature_key,feature,content_hash FROM tendermatch_retrieval.normalized_feature WHERE tenant_id=$1 AND feature_key=ANY($2::text[])',[TENANT,keys])).rows.map(r=>{if(r.content_hash!==r.feature.contentHash)throw new Error('Stored hash projection mismatch');return [r.feature_key,r.feature];}));cacheQueries++;
    for(const [j,input] of page.entries()){
      let f=existing.get(keys[j]);if(f){validateSourceFeature(f,input,codeHash);reused++;}else{f=normalizeSourceInput(input,codeHash);normalized++;}
      if(Buffer.byteLength(JSON.stringify(f))>131072)throw new Error('Compact feature limit exceeded');features.push(f);
    }
    peakHeapBytes=Math.max(peakHeapBytes,process.memoryUsage().heapUsed);
  }
  return {features,metrics:{reused,normalized,cacheQueries,elapsedMs:Math.round(performance.now()-start),peakHeapBytes}};
}
export function normalizationIdentity(manifestId,codeHash,features) {
  const outcomes=features.map(f=>({kind:f.kind,entity_id:f.id,feature_key:f.featureKey,content_hash:f.contentHash,state:f.normalization.status,reasons:f.normalization.reasons})).sort((a,b)=>a.kind.localeCompare(b.kind)||a.entity_id.localeCompare(b.entity_id));
  if(new Set(outcomes.map(o=>`${o.kind}:${o.entity_id}`)).size!==outcomes.length)throw new Error('Duplicate feature outcome');
  const identity={version:NORMALIZATION_VERSION,manifestId,codeHash,featureVersion:INPUT_FEATURE_VERSION,adapterVersion:INPUT_ADAPTER_VERSION,schemaVersion:INPUT_SCHEMA_VERSION,outcomeHash:sha(outcomes),supplierCount:outcomes.filter(f=>f.kind==='supplier').length,tenderCount:outcomes.filter(f=>f.kind==='tender').length};
  return {normalizationId:sha(identity),identity,outcomes};
}
export async function readbackNormalization(client,snapshot,features) {
  const [header]=(await client.query('SELECT identity FROM tendermatch_retrieval.normalization_snapshot WHERE tenant_id=$1 AND normalization_id=$2',[TENANT,snapshot.normalizationId])).rows;
  if(!header||sha(header.identity)!==snapshot.normalizationId)throw new Error('Normalization header mismatch');
  const expected=new Map(features.map(f=>[`${f.kind}:${f.id}`,f]));const outcomes=[];let queries=1;
  for(const kind of ['supplier','tender']){
    let after=null;while(true){const {rows}=await client.query(`SELECT m.kind,m.entity_id::text,m.feature_key,m.content_hash,m.state,m.reasons,f.feature FROM tendermatch_retrieval.normalization_member m JOIN tendermatch_retrieval.normalized_feature f USING(tenant_id,feature_key) WHERE m.tenant_id=$1 AND m.normalization_id=$2 AND m.kind=$3 AND ($4::uuid IS NULL OR m.entity_id>$4::uuid) ORDER BY m.entity_id LIMIT 500`,[TENANT,snapshot.normalizationId,kind,after]);queries++;
      for(const row of rows){const {feature,...o}=row,e=expected.get(`${kind}:${row.entity_id}`);if(!e||sha(feature)!==sha(e)||row.content_hash!==feature.contentHash||row.state!==feature.normalization.status||sha(row.reasons)!==sha(feature.normalization.reasons))throw new Error('Feature full readback mismatch');outcomes.push(o);}
      if(rows.length<500)break;after=rows.at(-1).entity_id;
    }
  }
  if(outcomes.length!==expected.size||sha(outcomes)!==snapshot.identity.outcomeHash)throw new Error('Outcome coverage/hash mismatch');
  return {rows:outcomes.length,queries,outcomeHash:sha(outcomes),allFeatureBodiesEqual:true};
}
export async function persistNormalization(client,snapshot,features) {
  let queries=0,insertedFeatures=0,insertedOutcomes=0;const start=performance.now();
  const q=async(sql,v)=>{queries++;return client.query(sql,v);};
  await q('BEGIN');try{
    await q("SET LOCAL statement_timeout='30s'");await q("SELECT set_config('tendermatch.tenant_id',$1,true)",[TENANT]);
    const h=await q('INSERT INTO tendermatch_retrieval.normalization_snapshot(tenant_id,normalization_id,manifest_id,identity,supplier_count,tender_count) VALUES($1,$2,$3,$4,$5,$6) ON CONFLICT DO NOTHING RETURNING normalization_id',[TENANT,snapshot.normalizationId,snapshot.identity.manifestId,JSON.stringify(snapshot.identity),snapshot.identity.supplierCount,snapshot.identity.tenderCount]);
    for(let i=0;i<features.length;i+=250){
      const page=features.slice(i,i+250).map(f=>({feature_key:f.featureKey,kind:f.kind,entity_id:f.id,input_version:f.sourceVersion,feature_version:f.featureVersion,evidence_snapshot:f.inputIdentity.consumedProjectionHash,content_hash:f.contentHash,procurement_type:f.procurementType??'MISSING',geography:f.geography,terms:f.terms,concepts:f.concepts,feature:f}));
      const inserted=await q(`INSERT INTO tendermatch_retrieval.normalized_feature(tenant_id,feature_key,kind,entity_id,input_version,feature_version,evidence_snapshot,content_hash,procurement_type,geography,terms,concepts,feature) SELECT $1,x.* FROM jsonb_to_recordset($2::jsonb) x(feature_key text,kind text,entity_id text,input_version text,feature_version text,evidence_snapshot text,content_hash text,procurement_type text,geography text[],terms text[],concepts text[],feature jsonb) ON CONFLICT DO NOTHING RETURNING feature_key`,[TENANT,JSON.stringify(page)]);insertedFeatures+=inserted.rows.length;
    }
    if(h.rows.length)for(let i=0;i<snapshot.outcomes.length;i+=500){const page=snapshot.outcomes.slice(i,i+500);await q(`INSERT INTO tendermatch_retrieval.normalization_member(tenant_id,normalization_id,manifest_id,kind,entity_id,feature_key,content_hash,state,reasons) SELECT $1,$2,$3,x.* FROM jsonb_to_recordset($4::jsonb) x(kind text,entity_id uuid,feature_key text,content_hash text,state text,reasons jsonb)`,[TENANT,snapshot.normalizationId,snapshot.identity.manifestId,JSON.stringify(page)]);insertedOutcomes+=page.length;}
    const proof=await readbackNormalization({query:q},snapshot,features);await q('COMMIT');
    return {insertedSnapshots:h.rows.length,insertedFeatures,insertedOutcomes,readback:proof,queries,elapsedMs:Math.round(performance.now()-start)};
  }catch(e){await client.query('ROLLBACK');throw e;}
}

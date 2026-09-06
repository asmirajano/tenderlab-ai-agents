/** Local-only Stage 2A artifact generation. No database writes or pair operations. */
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import {pathToFileURL} from 'node:url';
import {sha} from './lib/tendermatch-input-manifest.mjs';
import {normalizerCodeIdentity} from './lib/tendermatch-normalization.mjs';
import {readPinnedSuppliers,STAGE2_BASE,STAGE2_MANIFEST} from './lib/tendermatch-supplier-readiness.mjs';
import {alignSupplierReadiness,supplierReadinessIdentity,validateSupplierReadiness,READINESS_SCHEMA,READINESS_POLICY,READINESS_FIELDS} from '../packages/tendermatch/src/supplier-readiness.ts';

const root=new URL('../',import.meta.url);
const cacheDir=new URL('outputs/stage2a/',root);
export async function readinessCodeIdentity(){
  const inherited=await normalizerCodeIdentity();const files={...inherited.files};
  for(const path of ['packages/tendermatch/src/supplier-readiness.ts','scripts/lib/tendermatch-supplier-readiness.mjs','scripts/tendermatch-align-suppliers.mjs'])files[path]=sha((await readFile(new URL(path,root),'utf8')).replaceAll('\r\n','\n'));
  return {files,hash:sha(files)};
}
export function extractOnce(source,codeHash,previous=[]){
  const cache=new Map(previous.map(r=>[r.readinessId,r]));let extracted=0,reused=0;
  const records=source.map(input=>{
    const key=sha(supplierReadinessIdentity(input,codeHash));
    if(cache.has(key)){reused++;return validateSupplierReadiness(cache.get(key),input,codeHash);}
    extracted++;return alignSupplierReadiness(input,codeHash);
  }).sort((a,b)=>a.supplierId.localeCompare(b.supplierId));
  if(new Set(records.map(r=>r.supplierId)).size!==source.length)throw new Error('Duplicate supplier readiness outcome');
  return {records,extracted,reused,outcomeHash:sha(records.map(r=>[r.supplierId,r.readinessId,r.contentHash]))};
}
const counts=values=>Object.fromEntries([...new Set(values)].sort().map(v=>[v,values.filter(x=>x===v).length]));
export function summarizeReadiness(source,records){
  const result={};
  for(const group of ['neutral100','original17','all117']){
    const inputs=source.filter(s=>group==='all117'||(group==='neutral100'?s.sourceVersion.startsWith('v2.1'):s.sourceVersion.startsWith('v1.3')));
    const ids=new Set(inputs.map(i=>i.id));const selected=records.filter(r=>ids.has(r.supplierId));
    const claims=inputs.flatMap(i=>i.evidence);
    result[group]={suppliers:inputs.length,claims:claims.length,
      before:{classification:counts(inputs.map(i=>i.profile.classification??'UNKNOWN')),sourceReadiness:counts(inputs.map(i=>i.profile.readiness_status??'UNKNOWN')),
        sourceFieldCoverage:Object.fromEntries([...new Set(claims.map(e=>e.field))].sort().map(field=>[field,inputs.filter(i=>i.evidence.some(e=>e.field===field&&e.status!=='UNKNOWN'&&e.value_class==='SOURCE')).length])),
        formulaNamedTechnicalCoverage:inputs.filter(i=>i.evidence.some(e=>['product_families','works_specializations','materials','industries_served'].includes(e.field)&&e.status!=='UNKNOWN'&&e.value_class==='SOURCE')).length},
      after:{classification:counts(selected.map(r=>r.classification.scope)),formulaScope:counts(selected.map(r=>r.classification.formulaScope)),
        readiness:counts(selected.map(r=>r.readiness.state)),fieldCoverage:Object.fromEntries(READINESS_FIELDS.map(field=>[field,counts(selected.map(r=>r.fields[field].state))])),
        formulaCandidateTechnicalCoverage:selected.filter(r=>r.formulaInputCandidates.technical.length>0).length,
        auditDispositions:counts(selected.flatMap(r=>r.audit.map(a=>a.disposition))),
        quantitativeReasons:counts(selected.flatMap(r=>r.facts.filter(f=>f.rule==='typed-measure-v1').flatMap(f=>f.reasons)))},
      sourceStatuses:counts(claims.map(e=>e.status)),sourceValueClasses:counts(claims.map(e=>e.value_class)),
      unchangedStatusAndLineage:selected.every(r=>r.audit.every(a=>{const e=claims.find(e=>e.claim_id===a.claimId);return e&&e.status===a.sourceStatus&&e.profile_version_id===a.profileVersionId&&e.source_record_id===a.sourceRecordId&&e.source_artifact_id===a.artifactId&&e.artifact_sha256===a.artifactHash&&sha(e)===a.sourceClaimHash;}))};
  }
  return result;
}
export function safeRecord(record){
  return {supplierId:record.supplierId,profileVersionId:record.identity.profileVersionId,sourceVersion:record.identity.sourceVersion,
    sourceHash:record.identity.baseContentHash,inputHash:record.identity.inputHash,readinessId:record.readinessId,contentHash:record.contentHash,
    classification:record.classification,readiness:record.readiness,
    fields:Object.fromEntries(Object.entries(record.fields).map(([field,value])=>[field,{state:value.state,evidenceIds:value.evidenceIds,reasons:value.reasons}])),
    claimAudit:record.audit.map(a=>({claimId:a.claimId,sourceRecordId:a.sourceRecordId,artifactId:a.artifactId,
      sourceClaimHash:a.sourceClaimHash,sourceStatus:a.sourceStatus,disposition:a.disposition,
      targets:[...new Set(record.facts.filter(f=>f.sourceClaimId===a.claimId).map(f=>f.field))].sort(),
      reasons:[...new Set(record.facts.filter(f=>f.sourceClaimId===a.claimId).flatMap(f=>f.reasons))].sort()})),
    trust:record.trust};
}
async function main(){
  const mode=process.argv[2]??'plan';
  if(mode==='plan'){console.log(JSON.stringify({stage:'2A',scope:'117 supplier readiness only',databaseWrites:0,modes:['capture','run','replay']}));return;}
  if(!['capture','run','replay'].includes(mode))throw new Error('Unknown Stage 2A mode');
  await mkdir(cacheDir,{recursive:true});
  if(mode==='capture'){
    const input=await readPinnedSuppliers();const file=new URL(`source-${input.sourceHash}.json`,cacheDir);
    try{const prior=JSON.parse(await readFile(file,'utf8'));if(sha(prior.source)!==input.sourceHash)throw new Error('Captured source hash mismatch');}
    catch(e){if(e.code!=='ENOENT')throw e;await writeFile(file,JSON.stringify(input,null,2),{flag:'wx'});}
    console.log(JSON.stringify({suppliers:input.source.length,sourceHash:input.sourceHash,path:file.pathname,databaseWrites:0}));return;
  }
  const file=process.argv[3];if(!file)throw new Error('Explicit source artifact path required; no latest fallback');
  const input=JSON.parse(await readFile(file,'utf8'));
  if(input.stage2Base!==STAGE2_BASE||input.stage2ManifestId!==STAGE2_MANIFEST||input.sourceHash!==sha(input.source)||input.source.length!==117)throw new Error('Unapproved Stage 2A input boundary');
  const code=await readinessCodeIdentity();const runId=sha({sourceHash:input.sourceHash,codeHash:code.hash,schema:READINESS_SCHEMA,policy:READINESS_POLICY});
  const outputFile=new URL(`readiness-${runId}.json`,cacheDir);
  let prior;try{prior=JSON.parse(await readFile(outputFile,'utf8'));}catch(e){if(e.code!=='ENOENT')throw e;}
  const first=extractOnce(input.source,code.hash,prior?.records??[]);
  const again=extractOnce(input.source,code.hash,first.records);
  const reversed=extractOnce([...input.source].reverse().map(s=>({...s,evidence:[...s.evidence].reverse()})),code.hash);
  if(sha(first.records)!==sha(again.records)||first.outcomeHash!==reversed.outcomeHash||again.extracted!==0||again.reused!==117)throw new Error('Determinism/idempotence failed');
  if(prior&&sha(prior.records)!==sha(first.records))throw new Error('Immutable artifact differs');
  if(!prior)await writeFile(outputFile,JSON.stringify({runId,code,sourceHash:input.sourceHash,...first},null,2),{flag:'wx'});
  const readback=JSON.parse(await readFile(outputFile,'utf8'));
  if(sha(readback.records)!==sha(first.records))throw new Error('Readiness artifact readback mismatch');
  const report={stage:'2A',base:STAGE2_BASE,sourceManifest:STAGE2_MANIFEST,sourceHash:input.sourceHash,
    supplierInventoryHash:input.supplierInventoryHash,schema:READINESS_SCHEMA,policy:READINESS_POLICY,code,runId,outcomeHash:first.outcomeHash,
    evidenceClass:'ISOLATED_AUTHORIZED_REALISTIC_DOCUMENT',maturity:'ISOLATED_METHOD_VALIDATED',
    validation:{suppliers:117,claims:input.source.reduce((n,s)=>n+s.evidence.length,0),firstExtracted:first.extracted,firstReused:first.reused,
      retryExtracted:again.extracted,retryReused:again.reused,permutationEqual:true,fullArtifactReadbackEqual:true,
      databaseWrites:0,tenderConnections:0,pairEvaluations:0,eligibilityOutcomes:0,retrievalRuns:0,humanDispositions:0,stage3Started:false,deployed:false},
    groups:summarizeReadiness(input.source,first.records),records:first.records.map(safeRecord)};
  if(Object.values(report.groups).some(g=>!g.unchangedStatusAndLineage))throw new Error('Source status/lineage changed');
  const head=execFileSync('git',['rev-parse','HEAD'],{cwd:root,encoding:'utf8',windowsHide:true}).trim();
  if(mode==='run')await writeFile(new URL('docs/evidence/tendermatch-stage2a-readiness.json',root),JSON.stringify(report,null,2)+'\n');
  console.log(JSON.stringify({head,runId,outcomeHash:first.outcomeHash,validation:report.validation,groups:report.groups},null,2));
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href)main().catch(()=>{console.error('Stage 2A stopped: source, identity, artifact or validation failure. No source/database writes performed.');process.exitCode=1;});

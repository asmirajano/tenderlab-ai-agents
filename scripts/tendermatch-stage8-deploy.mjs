/** Explicit development Function deployment only. Secrets remain in-memory multipart fields. */
import {readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {attestTarget,neonApi,functionPath,TARGET} from './lib/tendermatch-stage8-operator.mjs';
import {loadOperatorSecret} from './lib/tendermatch-stage8-vault.mjs';
import {developmentPin} from './tendermatch-stage8.mjs';
import {bindPin} from './lib/tendermatch-stage8-store.mjs';
import {sessionHashes} from './tendermatch-stage8-provision.mjs';
import {guardedRuntimeUrl} from '../functions/tendermatch-stage8/database.mjs';
const safeFunction=f=>({id:f.id,slug:f.slug,name:f.name,status:f.status,invocation_url:f.invocation_url,created_at:f.created_at,updated_at:f.updated_at,current_deployment:f.current_deployment?{id:f.current_deployment.id,status:f.current_deployment.status,runtime:f.current_deployment.runtime}:undefined,active_deployment:f.active_deployment?{id:f.active_deployment.id,status:f.active_deployment.status,runtime:f.active_deployment.runtime}:undefined});
const target=await attestTarget();
if(process.argv.includes('--status')){
  const r=await neonApi(functionPath+'/'+TARGET.slug);console.log(JSON.stringify({keys:Object.keys(r),function:safeFunction(r.function??r)},null,2));
}else{
  if(!process.argv.includes('--deploy-approved'))throw new Error('Explicit --deploy-approved required');
  const {functions}=await neonApi(functionPath);if(functions.some(f=>f.slug!==TARGET.slug))throw new Error('Unexpected Function inventory; preserve and inspect');
  const manifest=JSON.parse(await readFile('build/tendermatch-stage8/manifest.json','utf8')),zip=await readFile('build/tendermatch-stage8/function.zip');
  if(createHash('sha256').update(zip).digest('hex')!==manifest.zip.sha256)throw new Error('Bundle identity mismatch');
  for(const [name,expected] of Object.entries(manifest.sources))if(createHash('sha256').update((await readFile(name,'utf8')).replaceAll('\r\n','\n')).digest('hex')!==expected)throw new Error('Build is stale');
  const v=await loadOperatorSecret('runtime-readonly-v1'),pin=await developmentPin(),readUrl=guardedRuntimeUrl(v.readUrl);
  if(v.projectId!==TARGET.project||v.branchId!==TARGET.branch||bindPin(pin).bindingId!=='26e1bab78a38d8d520d59563e702bc4540405213f39cbb7b40a49ecbb03a4080'||v.sessions.find(s=>s.name==='owner').expiresAt<=Date.now()+300000)throw new Error('Pinned runtime/session unavailable');
  const environment={TENDERMATCH_STAGE8_READ_URL:readUrl,TENDERMATCH_STAGE8_PIN_JSON:JSON.stringify(pin),TENDERMATCH_STAGE8_CURSOR_KEY:v.cursorKey,TENDERMATCH_STAGE8_SESSIONS_JSON:JSON.stringify(sessionHashes(v)),TENDERMATCH_STAGE8_CODE_HASH:manifest.codeHash,DATABASE_URL:readUrl,DATABASE_URL_UNPOOLED:readUrl};
  const body=new FormData();body.set('zip',new File([zip],'function.zip',{type:'application/zip'}));body.set('runtime','nodejs24');body.set('environment',JSON.stringify(environment));
  const r=await neonApi(functionPath+'/'+TARGET.slug+'/deployments',{method:'POST',body});
  // Persist only explicitly allowed metadata, never the provider environment response.
  const evidence={target,slug:TARGET.slug,submittedAt:new Date().toISOString(),build:manifest,bindingId:bindPin(pin).bindingId,ownerSessionExpiresAt:new Date(v.sessions.find(s=>s.name==='owner').expiresAt).toISOString(),response:{keys:Object.keys(r),id:r.id??r.deployment?.id,status:r.status??r.deployment?.status,function:r.function?safeFunction(r.function):undefined},secretNames:Object.keys(environment),readOnly:true};
  await writeFile('docs/evidence/tendermatch-stage8-hosted-deployment.json',JSON.stringify(evidence,null,2)+'\n');console.log(JSON.stringify({submitted:true,slug:TARGET.slug,codeHash:manifest.codeHash,response:evidence.response}));
}

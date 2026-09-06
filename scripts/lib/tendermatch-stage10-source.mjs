/** Read-only execution-time source snapshot discovery. No source/Neon connector. */
import {readFile,realpath,stat} from 'node:fs/promises';
import {readFileSync,realpathSync,statSync} from 'node:fs';
import path from 'node:path';
import {sha} from './tendermatch-input-manifest.mjs';
export const SOURCE_SCHEMA='tendermatch-current-source-manifests/1.0.0';
export const BOUNDS=Object.freeze({entities:100000,universe:10000000,manifestBytes:32*1024*1024,recordBytes:262144,batch:128,maxBatch:512,focus:100000,shortlist:100000,responseBytes:524288,heapBytes:512*1024*1024,concurrency:1});
export const uuid=x=>typeof x==='string'&&/^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/.test(x);
export const digest=x=>typeof x==='string'&&/^[a-f0-9]{64}$/.test(x);
export function manifestCapture(manifests,tenantId){
  if(!/^[a-zA-Z0-9:_-]{3,100}$/.test(tenantId))throw Error('TENANT_REQUIRED');
  const members=[];let total=0;
  for(const kind of ['supplier','tender']){
    const m=manifests[kind];if(!m||m.schema!==SOURCE_SCHEMA||m.kind!==kind||m.tenantId!==tenantId||!Array.isArray(m.members)||m.members.length>BOUNDS.entities||typeof m.contractVersion!=='string'||!m.contractVersion)throw Error('SOURCE_MANIFEST_INVALID');
    const seen=new Set();for(const row of m.members){total++;if(!uuid(row.id)||seen.has(row.id)||!digest(row.digest)||typeof row.file!=='string'||!row.file||typeof row.deleted!=='boolean'||kind==='supplier'&&typeof row.listed!=='boolean'||kind==='tender'&&typeof row.status!=='string')throw Error('SOURCE_MEMBERSHIP_INVALID');seen.add(row.id);
      if(kind==='supplier'?row.listed&&!row.deleted:row.status==='OPEN'&&!row.deleted)members.push({kind,id:row.id,digest:row.digest,file:row.file,contractVersion:m.contractVersion});
    }
  }
  if(total>BOUNDS.entities)throw Error('SOURCE_ENTITY_BUDGET');members.sort((a,b)=>a.kind.localeCompare(b.kind)||a.id.localeCompare(b.id));
  const supplierCount=members.filter(m=>m.kind==='supplier').length,tenderCount=members.length-supplierCount;
  if(supplierCount*tenderCount>BOUNDS.universe)throw Error('PAIR_UNIVERSE_BUDGET');
  const identity={schema:SOURCE_SCHEMA,tenantId,contracts:Object.fromEntries(['supplier','tender'].map(k=>[k,manifests[k].contractVersion])),members:members.map(({kind,id,digest})=>({kind,id,digest}))};
  return {tenantId,members,supplierCount,tenderCount,universe:supplierCount*tenderCount,inputHash:sha(identity),sourceToken:sha(manifests),identity};
}
export async function createFileSource(directory,tenantId){
  const root=await realpath(directory);
  async function safeRead(relative,limit){if(path.isAbsolute(relative)||relative.includes('..')||relative.includes(':'))throw Error('SOURCE_PATH_REJECTED');const file=await realpath(path.join(root,relative));if(!file.startsWith(root+path.sep))throw Error('SOURCE_PATH_ESCAPE');if((await stat(file)).size>limit)throw Error('SOURCE_PAYLOAD_BUDGET');const data=await readFile(file);if(data.length>limit)throw Error('SOURCE_PAYLOAD_BUDGET');return JSON.parse(data.toString('utf8'));}
  async function discover(){const pointer=await safeRead('CURRENT.json',8192);if(pointer.schema!==SOURCE_SCHEMA||pointer.tenantId!==tenantId)throw Error('SOURCE_POINTER_INVALID');const manifests={};for(const kind of ['supplier','tender']){const p=pointer[kind];if(!p||!digest(p.digest))throw Error('SOURCE_POINTER_INVALID');const body=await safeRead(p.file,BOUNDS.manifestBytes);if(sha(body)!==p.digest)throw Error('SOURCE_MANIFEST_HASH');manifests[kind]=body;}if(sha(await safeRead('CURRENT.json',8192))!==sha(pointer))throw Error('SOURCE_DRIFT');return {...manifestCapture(manifests,tenantId),pointerDigest:sha(pointer)};}
  const assertCurrentSync=capture=>{const file=realpathSync(path.join(root,'CURRENT.json'));if(!file.startsWith(root+path.sep)||statSync(file).size>8192)throw Error('SOURCE_POINTER_INVALID');if(sha(JSON.parse(readFileSync(file,'utf8')))!==capture.pointerDigest)throw Error('SOURCE_DRIFT');};
  return {capture:discover,assertCurrentSync,assertCurrent:async(capture,{deep=false}={})=>{if(sha(await safeRead('CURRENT.json',8192))!==capture.pointerDigest||deep&&(await discover()).sourceToken!==capture.sourceToken)throw Error('SOURCE_DRIFT');},read:async member=>{const input=await safeRead(member.file,BOUNDS.recordBytes);if(sha(input)!==member.digest||input.kind!==member.kind||input.id!==member.id||member.kind==='tender'&&(input.tender?.status!=='OPEN'||input.provenance?.deleted!==false))throw Error('SOURCE_RECORD_IDENTITY');return input;}};
}

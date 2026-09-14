/** One additive attested dev-role transaction. No source or production connection. */
import {randomBytes,createHash} from 'node:crypto';
import {pathToFileURL} from 'node:url';
import {ownerConnection,TARGET} from './lib/tendermatch-stage8-operator.mjs';
import {loadOperatorSecret,saveOperatorSecret} from './lib/tendermatch-stage8-vault.mjs';
import {developmentPin} from './tendermatch-stage8.mjs';
import {bindPin,HEADER_SQL} from './lib/tendermatch-stage8-store.mjs';
import {API_SCHEMA,LOGIN_ROLE,applyViewSql,viewDefinitions} from './lib/tendermatch-stage8-views.mjs';
export async function runtimeSecrets(){
  try{return await loadOperatorSecret('runtime-readonly-v1');}catch(e){if(e.code!=='ENOENT')throw e;}
  const now=Date.now(),credential=()=>randomBytes(32).toString('base64url');
  const sessions=[{name:'owner',token:credential(),subject:'stage8-owner-probe',tenantId:'tendermatch-development-stage1',issuedAt:now,expiresAt:now+6*3600000},{name:'expired',token:credential(),subject:'stage8-expired-probe',tenantId:'tendermatch-development-stage1',issuedAt:now-7200000,expiresAt:now-3600000},{name:'wrongTenant',token:credential(),subject:'stage8-isolation-probe',tenantId:'stage8-unconfigured-tenant',issuedAt:now,expiresAt:now+6*3600000}];
  const password=credential(),u=new URL('postgresql://'+LOGIN_ROLE+'@'+TARGET.host+'/'+TARGET.database);u.password=password;u.searchParams.set('sslmode','verify-full');u.searchParams.set('channel_binding','require');
  const value={projectId:TARGET.project,branchId:TARGET.branch,role:LOGIN_ROLE,password,readUrl:u.href,cursorKey:randomBytes(32).toString('hex'),sessions};
  await saveOperatorSecret('runtime-readonly-v1',value);return value;
}
export function sessionHashes(v){return v.sessions.map(({token,subject,tenantId,issuedAt,expiresAt})=>({tokenHash:createHash('sha256').update(token).digest('hex'),subject,tenantId,issuedAt,expiresAt}));}
export async function provision(){
  if(!process.argv.includes('--apply-approved'))throw new Error('Explicit --apply-approved required');
  const pin=await developmentPin();if(bindPin(pin).bindingId!=='26e1bab78a38d8d520d59563e702bc4540405213f39cbb7b40a49ecbb03a4080')throw new Error('Round 1 mismatch');
  const c=await ownerConnection();
  try{
    await c.query('BEGIN');await c.query("SELECT set_config('tendermatch.tenant_id',$1,true),set_config('statement_timeout','10000',true)",[pin.tenantId]);
    const h=(await c.query(HEADER_SQL,[pin.tenantId,pin.planId])).rows[0];
    if(!h||h.universeCount!==2027961||h.candidateCount!==707660||h.storedAutomaticRequests!==500)throw new Error('Sealed target unavailable');
    const present=(await c.query("SELECT 1 FROM pg_namespace WHERE nspname=$1 UNION ALL SELECT 1 FROM pg_roles WHERE rolname LIKE 'tendermatch_stage8_%'",[API_SCHEMA])).rows;
    if(present.length)throw new Error('Stage 8 objects already exist; inspect rather than overwrite');
    const secrets=await runtimeSecrets();
    await c.query(applyViewSql(pin));
    await c.query("SELECT set_config('tendermatch.stage8_password',$1,true)",[secrets.password]);
    await c.query(`DO $$ BEGIN EXECUTE format('ALTER ROLE ${LOGIN_ROLE} PASSWORD %L',current_setting('tendermatch.stage8_password')); END $$`);
    await c.query('COMMIT');console.log(JSON.stringify({applied:true,schema:API_SCHEMA,login:LOGIN_ROLE,views:viewDefinitions(pin).length,sourceWrites:0,resultRowWrites:0}));
  }catch(e){await c.query('ROLLBACK').catch(()=>{});throw new Error('Provision failed: '+(e.code??'target/precondition; details suppressed'));}finally{await c.end();}
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href)await provision();

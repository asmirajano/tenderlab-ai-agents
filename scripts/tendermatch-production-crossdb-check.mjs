/** Audit other existing production DBs without granting/changing anything. */
import assert from 'node:assert/strict';
import {writeFile} from 'node:fs/promises';
import pg from 'pg';
import {neonApi} from './lib/tendermatch-stage8-operator.mjs';
import {PRODUCTION as p} from './lib/tendermatch-production-contract.mjs';
const proof={target:p,observedAt:new Date().toISOString(),checks:[]};
for(const database of ['neondb','tender_entity_registry']){
  const {uri}=await neonApi('/projects/'+p.project+'/connection_uri?'+new URLSearchParams({branch_id:p.branch,database_name:database,role_name:'neondb_owner',pooled:'false'}));
  const u=new URL(uri);assert.equal(u.hostname,p.host);assert.equal(u.pathname,'/'+database);assert.equal(u.username,'neondb_owner');
  u.searchParams.set('sslmode','verify-full');u.searchParams.set('channel_binding','require');
  const c=new pg.Client({connectionString:u.href,enableChannelBinding:true,connectionTimeoutMillis:10000,query_timeout:10000});c.on('error',()=>{});
  try{
    await c.connect();await c.query('BEGIN READ ONLY');
    const result=(await c.query("SELECT count(*)::int n FROM pg_proc f JOIN pg_namespace n ON n.oid=f.pronamespace WHERE n.nspname NOT IN ('pg_catalog','information_schema') AND n.nspname NOT LIKE 'pg_toast%' AND f.prosecdef AND f.prorettype NOT IN ('trigger'::regtype,'event_trigger'::regtype) AND has_schema_privilege($1,n.oid,'USAGE') AND has_function_privilege($1,f.oid,'EXECUTE')",[p.loginRole])).rows[0];
    assert.equal(result.n,0);proof.checks.push({database,callableSecurityDefinerFunctions:result.n});
  }catch(e){throw Error('Cross-database privilege check failed: '+(e.code??'PRIVILEGE_GATE'));}
  finally{await c.end().catch(()=>{});}
}
await writeFile('docs/evidence/tendermatch-production-crossdb-access.json',JSON.stringify(proof,null,2)+'\n');
console.log(JSON.stringify({checks:proof.checks}));

import {attestTarget,neonApi,functionPath,ownerConnection} from './lib/tendermatch-stage8-operator.mjs';
import {developmentPin} from './tendermatch-stage8.mjs';
import {bindPin,HEADER_SQL} from './lib/tendermatch-stage8-store.mjs';
const target=await attestTarget(),pin=bindPin(await developmentPin());
if(pin.bindingId!=='26e1bab78a38d8d520d59563e702bc4540405213f39cbb7b40a49ecbb03a4080')throw new Error('Round 1 pin mismatch');
const {functions}=await neonApi(functionPath);const c=await ownerConnection();
try {
  await c.query('BEGIN READ ONLY');await c.query("SELECT set_config('tendermatch.tenant_id',$1,true),set_config('statement_timeout','5000',true)",[pin.tenantId]);
  const header=(await c.query(HEADER_SQL,[pin.tenantId,pin.planId])).rows;
  const counts=(await c.query(`SELECT (SELECT count(*)::int FROM tendermatch_retrieval.escalation_plan) plans,(SELECT count(*)::int FROM tendermatch_retrieval.escalation_decision) decisions,(SELECT count(*)::int FROM tendermatch_retrieval.escalation_request) requests,(SELECT count(*)::int FROM tendermatch_retrieval.escalation_authorization) grants,(SELECT count(*)::int FROM tendermatch_retrieval.escalation_job) jobs,(SELECT count(*)::int FROM tendermatch_retrieval.escalation_artifact) artifacts,(SELECT count(*)::int FROM tendermatch_retrieval.escalation_event) events`)).rows[0];
  const roles=(await c.query("SELECT rolname,rolsuper,rolcreaterole,rolcreatedb,rolcanlogin,rolreplication,rolbypassrls,rolconnlimit FROM pg_roles WHERE rolname LIKE 'tendermatch%'")).rows;
  const relations=(await c.query("SELECT n.nspname,c.relname,c.relkind,c.relrowsecurity,c.relforcerowsecurity,pg_get_userbyid(c.relowner) owner,c.relacl::text FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname IN ('tendermatch_retrieval','tendermatch_stage8_v1') ORDER BY 1,2")).rows;
  const namespaces=(await c.query("SELECT nspname,nspacl::text FROM pg_namespace WHERE nspname NOT LIKE 'pg_%' AND nspname<>'information_schema'")).rows;
  const h=header[0];if(!h||h.universeCount!==2027961||h.candidateCount!==707660||h.shortlistCount!==28034||h.storedAutomaticRequests!==500||counts.jobs||counts.artifacts||counts.grants||counts.events)throw new Error('Sealed counts mismatch');
  console.log(JSON.stringify({target,bindingId:pin.bindingId,functions:functions.map(f=>({slug:f.slug,id:f.id})),header,counts,roles,namespaces,relations},null,2));
}finally{await c.query('ROLLBACK').catch(()=>{});await c.end();}

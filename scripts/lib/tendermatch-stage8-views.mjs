/** Additive immutable schema projection. Pinned predicates are not a latest alias. */
import {bindPin,REQUIRED_TABLES,REQUIRED_MARKERS} from './tendermatch-stage8-store.mjs';
import {resultColumns} from '../../functions/tendermatch-stage8/projection.mjs';
export const API_SCHEMA='tendermatch_stage8_v1';
export const GRANT_ROLE='tendermatch_stage8_reader';
export const LOGIN_ROLE='tendermatch_stage8_reader_dev';
export function viewDefinitions(input){
  const p=bindPin(input),tenant=`r.tenant_id='${p.tenantId}' AND current_setting('tendermatch.tenant_id',true)='${p.tenantId}'`;
  const specs=[];
  const add=(name,columns,predicate)=>specs.push({name,columns,predicate,sql:`CREATE VIEW ${API_SCHEMA}.${name} WITH (security_barrier=true) AS SELECT ${columns} FROM tendermatch_retrieval.${name} r WHERE ${name==='schema_migration'?'':tenant+' AND '}${predicate};`});
  add('schema_migration','version',`version IN (${REQUIRED_MARKERS.map(x=>`'${x}'`).join(',')})`);
  const runColumns={eligibility:'tenant_id,run_id,policy_hash',formula:'tenant_id,run_id,stage3_run_id,policy_hash,formula_version',ranking:'tenant_id,run_id,formula_run_id,method_hash,method_version',shortlist:'tenant_id,run_id,ranking_run_id'};
  const completionColumns={eligibility:'tenant_id,run_id,outcome_hash,pair_count',formula:'tenant_id,run_id,outcome_hash,scored_count,unscored_count',ranking:'tenant_id,run_id,outcome_hash',shortlist:'tenant_id,run_id,outcome_hash,pair_count'};
  for(const stage of ['eligibility','formula','ranking','shortlist']){
    add(stage+'_run',runColumns[stage],`r.run_id='${p[stage+'RunId']}'`);
    add(stage+'_completion',completionColumns[stage],`r.run_id='${p[stage+'RunId']}'`);
    if(stage!=='shortlist')add(stage+'_member','tenant_id,run_id,kind,entity_id,input_key'+(stage==='ranking'?',profile_key':''),`r.run_id='${p[stage+'RunId']}'`);
  }
  const member=(stage,kind,key)=>`EXISTS(SELECT 1 FROM tendermatch_retrieval.${stage}_member m WHERE m.tenant_id=r.tenant_id AND m.run_id='${p[stage+'RunId']}' AND m.kind='${kind}' AND m.${stage==='ranking'?'profile_key':'input_key'}=r.${key})`;
  for(const stage of ['eligibility','formula'])add(stage+'_pair','tenant_id,policy_hash,supplier_key,tender_key,'+(stage==='formula'?resultColumns:'state,reasons,hard_gate,scope_relation,service_potential'),`r.policy_hash=decode('${p[stage+'Policy']}','hex') AND ${member(stage,'supplier','supplier_key')} AND ${member(stage,'tender','tender_key')}`);
  add('ranking_pair','tenant_id,method_hash,formula_policy,supplier_profile,tender_profile,supplier_key,tender_key,supplier_id,tender_id,relevance_units,limitation_mask',`r.method_hash=decode('${p.methodHash}','hex') AND r.formula_policy=decode('${p.formulaPolicy}','hex') AND ${member('ranking','supplier','supplier_profile')} AND ${member('ranking','tender','tender_profile')}`);
  add('ranking_profile','tenant_id,profile_key,input_key,kind',`EXISTS(SELECT 1 FROM tendermatch_retrieval.ranking_member m WHERE m.tenant_id=r.tenant_id AND m.run_id='${p.rankingRunId}' AND m.kind=r.kind AND m.profile_key=r.profile_key)`);
  // Only fields consumed by expandCriterionAudit; never full supplier/tender payloads.
  add('formula_input',`tenant_id,input_key,jsonb_build_object('id',projection->'id','sourceFeatureHash',projection->'sourceFeatureHash','groups',projection->'groups','references',projection->'references','prepared',jsonb_build_object('procurementType',projection#>'{prepared,procurementType}')) projection`,`EXISTS(SELECT 1 FROM tendermatch_retrieval.formula_member m WHERE m.tenant_id=r.tenant_id AND m.run_id='${p.formulaRunId}' AND m.kind=r.kind AND m.input_key=r.input_key)`);
  add('shortlist_pair','tenant_id,pair_key,selection,tier',`EXISTS(SELECT 1 FROM tendermatch_retrieval.escalation_decision d WHERE d.tenant_id=r.tenant_id AND d.plan_id='${p.planId}' AND d.pair_key=r.pair_key)`);
  add('escalation_plan','tenant_id,plan_id,shortlist_run_id,identity',`r.plan_id='${p.planId}'`);
  add('escalation_decision','tenant_id,plan_id,pair_key,supplier_id,tender_id,decision',`r.plan_id='${p.planId}'`);
  add('escalation_request','tenant_id,plan_id,kind',`r.plan_id='${p.planId}' AND r.kind='AUTOMATIC_REVIEW'`);
  // Store dependency checks include these tables, but hosted routes cannot read their data.
  for(const name of REQUIRED_TABLES.filter(n=>!specs.some(s=>s.name===n)))add(name,'NULL::text unavailable','false');
  return specs;
}
export function applyViewSql(pin){
  const specs=viewDefinitions(pin);
  return `CREATE SCHEMA ${API_SCHEMA}; REVOKE ALL ON SCHEMA ${API_SCHEMA} FROM PUBLIC;
CREATE ROLE ${GRANT_ROLE} NOLOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS;
CREATE ROLE ${LOGIN_ROLE} LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS CONNECTION LIMIT 3;
GRANT ${GRANT_ROLE} TO ${LOGIN_ROLE};
GRANT CONNECT ON DATABASE tendermatch_results_dev TO ${LOGIN_ROLE};
ALTER ROLE ${LOGIN_ROLE} SET default_transaction_read_only=on;
ALTER ROLE ${LOGIN_ROLE} SET statement_timeout='5s';
ALTER ROLE ${LOGIN_ROLE} SET idle_in_transaction_session_timeout='8s';
ALTER ROLE ${LOGIN_ROLE} SET search_path=pg_catalog;
${specs.map(s=>s.sql).join('\n')}
REVOKE ALL ON ALL TABLES IN SCHEMA ${API_SCHEMA} FROM PUBLIC;
GRANT USAGE ON SCHEMA ${API_SCHEMA} TO ${GRANT_ROLE};
GRANT SELECT ON ALL TABLES IN SCHEMA ${API_SCHEMA} TO ${GRANT_ROLE};`;
}
export function rollbackViewSql(){
  return `REVOKE ${GRANT_ROLE} FROM ${LOGIN_ROLE}; REVOKE CONNECT ON DATABASE tendermatch_results_dev FROM ${LOGIN_ROLE};
${[...REQUIRED_TABLES].reverse().map(n=>`DROP VIEW ${API_SCHEMA}.${n};`).join('\n')}
REVOKE USAGE ON SCHEMA ${API_SCHEMA} FROM ${GRANT_ROLE}; DROP SCHEMA ${API_SCHEMA}; DROP ROLE ${LOGIN_ROLE}; DROP ROLE ${GRANT_ROLE};`;
}

import {viewDefinitions} from './tendermatch-stage8-views.mjs';
import {bindPin} from './tendermatch-stage8-store.mjs';

export const PRODUCTION = Object.freeze({project: 'dry-union-87553313', branch: 'br-wispy-bird-b1fj8mih',
  database: 'tendermatch_results_prod', host: 'ep-misty-brook-b1fmfplb.c-5.eu-central-1.aws.neon.tech',
  region: 'aws-eu-central-1', grantRole: 'tendermatch_results_reader', loginRole: 'tendermatch_results_reader_prod',
  bindingId: '26e1bab78a38d8d520d59563e702bc4540405213f39cbb7b40a49ecbb03a4080'});
export const BASE_SCHEMA = 'tendermatch_retrieval';
export const API_SCHEMA = 'tendermatch_stage8_v1';
export function guardedProductionReadUrl(value){
  const u=new URL(value);
  if(u.protocol!=='postgresql:'||u.hostname!==PRODUCTION.host||u.port&&u.port!=='5432'||
    u.pathname!=='/'+PRODUCTION.database||decodeURIComponent(u.username)!==PRODUCTION.loginRole||!u.password||
    u.searchParams.get('sslmode')!=='verify-full'||u.searchParams.get('channel_binding')!=='require'||
    [...u.searchParams.keys()].some(x=>!['sslmode','channel_binding'].includes(x)))throw Error('Restricted production runtime URL required');
  return u.href;
}
export const GENERATED = Object.freeze({
  'eligibility_run.expected_pairs': '((supplier_count)::bigint * (tender_count)::bigint)',
  'input_manifest.potential_pairs': '((supplier_count)::bigint * (tender_count)::bigint)',
  'normalized_feature.search_document': "to_tsvector('simple'::regconfig, ((COALESCE((feature ->> 'title'::text), (feature ->> 'displayName'::text), ''::text) || ' '::text) || COALESCE((feature ->> 'terms'::text), ''::text)))",
});
export function validateColumns(table,columns){
  if(!columns.length||columns.some(x=>x.identity||x.default_expression?.includes('nextval(')||
    x.generated&&(x.generated!=='s'||GENERATED[table+'.'+x.name]!==x.default_expression)))throw Error('Unreviewed generated/sequence column');
}
export function restorableDataConstraints(constraints){
  if(constraints.some(x=>!['c','f','n','p','t','u','x'].includes(x.type)))throw Error('Unreviewed constraint type');
  return constraints.filter(x=>!['n','t'].includes(x.type));
}
export function ident(value) {
  if (!/^[a-z][a-z0-9_]*$/.test(value)) throw Error('Unexpected SQL identifier');
  return '"' + value + '"';
}
export function sealedSelections(input) {
  const raw = {...input}; delete raw.bindingId;
  const p = bindPin(raw);
  if (p.bindingId !== PRODUCTION.bindingId) throw Error('Unapproved sealed binding');
  const tenant = `r.tenant_id='${p.tenantId}'`;
  const selected = Object.fromEntries(viewDefinitions(p).map(v => [v.name,
    v.name === 'schema_migration' ? v.predicate : `${tenant} AND (${v.predicate})`]));
  selected.eligibility_input = `${tenant} AND EXISTS (SELECT 1 FROM ${BASE_SCHEMA}.eligibility_member m WHERE m.tenant_id=r.tenant_id AND m.run_id='${p.eligibilityRunId}' AND m.input_key=r.input_key)`;
  selected.normalized_feature = `${tenant} AND EXISTS (SELECT 1 FROM ${BASE_SCHEMA}.eligibility_input i JOIN ${BASE_SCHEMA}.eligibility_member m ON m.tenant_id=i.tenant_id AND m.input_key=i.input_key WHERE m.tenant_id=r.tenant_id AND m.run_id='${p.eligibilityRunId}' AND i.feature_key=r.feature_key)`;
  const normalization = `SELECT normalization_id FROM ${BASE_SCHEMA}.eligibility_run WHERE tenant_id='${p.tenantId}' AND run_id='${p.eligibilityRunId}'`;
  selected.normalization_snapshot = `${tenant} AND r.normalization_id IN (${normalization})`;
  selected.normalization_member = `${tenant} AND r.normalization_id IN (${normalization})`;
  selected.input_manifest = `${tenant} AND r.manifest_id IN (SELECT manifest_id FROM ${BASE_SCHEMA}.normalization_snapshot WHERE tenant_id='${p.tenantId}' AND normalization_id IN (${normalization}))`;
  selected.input_member = `${tenant} AND EXISTS (SELECT 1 FROM ${BASE_SCHEMA}.normalization_member m WHERE m.tenant_id=r.tenant_id AND m.normalization_id IN (${normalization}) AND m.manifest_id=r.manifest_id AND m.kind=r.kind AND m.entity_id=r.entity_id)`;
  selected.shortlist_member = `${tenant} AND r.run_id='${p.shortlistRunId}'`;
  selected.shortlist_context = `${tenant} AND EXISTS (SELECT 1 FROM ${BASE_SCHEMA}.shortlist_member m WHERE m.tenant_id=r.tenant_id AND m.run_id='${p.shortlistRunId}' AND m.context_key=r.context_key)`;
  return selected;
}
export function selectRows(table, columns, primaryKey, predicate = 'true') {
  return `SELECT ${columns.map(c => 'r.' + ident(c)).join(',')} FROM ${BASE_SCHEMA}.${ident(table)} r WHERE ${predicate} ORDER BY ${primaryKey.map(c => 'r.' + ident(c)).join(',')}`;
}

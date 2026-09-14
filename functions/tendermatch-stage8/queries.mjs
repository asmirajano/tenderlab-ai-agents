/** Same selected-pair projection, with a bounded Formula lookup behind security-barrier views. */
import {resultColumns} from './projection.mjs';
export const HOSTED_DETAIL_SQL=`WITH chosen AS MATERIALIZED (
 SELECT r.* FROM tendermatch_stage8_v1.ranking_pair r
 WHERE r.tenant_id=$1 AND r.method_hash=$5 AND r.formula_policy=$6
 AND r.supplier_profile=(SELECT profile_key FROM tendermatch_stage8_v1.ranking_member WHERE tenant_id=$1 AND run_id=$2 AND kind='supplier' AND entity_id=$3)
 AND r.tender_profile=(SELECT profile_key FROM tendermatch_stage8_v1.ranking_member WHERE tenant_id=$1 AND run_id=$2 AND kind='tender' AND entity_id=$4)
 LIMIT 1)
 SELECT r.supplier_id::text,r.tender_id::text,encode(r.supplier_profile,'hex') supplier_profile,encode(r.tender_profile,'hex') tender_profile,r.relevance_units,r.limitation_mask,${resultColumns.split(',').map(x=>'f.'+x).join(',')}
 FROM chosen r JOIN LATERAL (SELECT ${resultColumns} FROM tendermatch_stage8_v1.formula_pair f
 WHERE f.tenant_id=r.tenant_id AND f.policy_hash=r.formula_policy AND f.supplier_key=r.supplier_key AND f.tender_key=r.tender_key LIMIT 1) f ON true`;
export function selectedPairQuery(text){
  return text.startsWith('SELECT r.supplier_id::text,r.tender_id::text,encode(r.supplier_profile,')&&text.includes('JOIN tendermatch_retrieval.formula_pair f ON f.tenant_id=r.tenant_id');
}

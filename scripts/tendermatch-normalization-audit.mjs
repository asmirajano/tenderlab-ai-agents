/** Owner read-only postflight. Existing temporary owner supplied privately, never saved. */
import pg from 'pg';
import {readFile,writeFile} from 'node:fs/promises';
import {DEV_TARGET as T,guardUrl,assertRestrictedRole,RESULT_TABLES} from './lib/tendermatch-dev-contract.mjs';
import {TENANT} from './lib/tendermatch-input-manifest.mjs';
const reportFile=new URL('../docs/evidence/tendermatch-development-stage2.json',import.meta.url);
const report=JSON.parse(await readFile(reportFile,'utf8'));
const owner=guardUrl(process.env.TENDERMATCH_RESULTS_OWNER_URL,'results');
const proof={at:new Date().toISOString(),writes:0};
try{
 for(const kind of ['results','source']){
  const u=new URL(owner.href);u.pathname=`/${kind==='results'?T.resultDatabase:T.sourceDatabase}`;guardUrl(u.href,kind);
  const c=new pg.Client({connectionString:u.href,enableChannelBinding:true});c.on('error',()=>{});
  try{await c.connect();await c.query('BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY');
   if(kind==='results'){
    await assertRestrictedRole(c,T.writerLogin,T.writerRole,true);await assertRestrictedRole(c,T.writerRole,null,false);
    proof.globalCounts={};for(const name of [...RESULT_TABLES,'input_manifest','input_member','input_capture','normalization_snapshot','normalization_member'])proof.globalCounts[name]=(await c.query(`SELECT count(*)::int n FROM tendermatch_retrieval.${name}`)).rows[0].n;
    for(const name of RESULT_TABLES.filter(n=>!['schema_migration','normalized_feature'].includes(n)))if(proof.globalCounts[name]!==0)throw new Error('Out-of-stage state detected');
    if(proof.globalCounts.normalized_feature!==report.coverage.total||proof.globalCounts.normalization_member!==report.coverage.total)throw new Error('Global feature coverage mismatch');
    proof.membershipDelta=(await c.query(`WITH old AS(SELECT * FROM tendermatch_retrieval.input_member WHERE tenant_id=$1 AND manifest_id=$2),fresh AS(SELECT * FROM tendermatch_retrieval.input_member WHERE tenant_id=$1 AND manifest_id=$3) SELECT coalesce(o.kind,n.kind) kind,count(*) FILTER(WHERE o.entity_id IS NULL)::int added,count(*) FILTER(WHERE n.entity_id IS NULL)::int removed,count(*) FILTER(WHERE o.entity_id IS NOT NULL AND n.entity_id IS NOT NULL AND o.provenance<>n.provenance)::int changed,count(*) FILTER(WHERE o.provenance=n.provenance)::int unchanged FROM old o FULL JOIN fresh n USING(kind,entity_id) GROUP BY coalesce(o.kind,n.kind) ORDER BY kind`,[TENANT,'1dde6c1b91bf02ff499493e99e236355016ff838cc39d11d1187bffada40a729',report.manifestId])).rows;
    proof.migrations=(await c.query('SELECT version FROM tendermatch_retrieval.schema_migration ORDER BY version')).rows.map(r=>r.version);
    proof.newTableGrants=(await c.query("SELECT table_name,grantee,privilege_type FROM information_schema.table_privileges WHERE table_schema='tendermatch_retrieval' AND table_name IN ('normalization_snapshot','normalization_member') AND grantee<>'neondb_owner' ORDER BY table_name,grantee,privilege_type")).rows;
    if(proof.newTableGrants.some(r=>r.grantee!==T.writerRole||!['SELECT','INSERT'].includes(r.privilege_type))||proof.newTableGrants.length!==4)throw new Error('Unexpected association grants');
   }else{
    await assertRestrictedRole(c,T.consumerLogin,T.readerRole,true);await assertRestrictedRole(c,T.readerRole,null,false);
    proof.sourceCounts=(await c.query("SELECT (SELECT count(*)::int FROM registry.entities WHERE entity_type_code='company') canonical_companies,(SELECT count(*)::int FROM tendermatch_all_supplier_api.current_supplier_profiles) profiles,(SELECT count(*)::int FROM tendermatch_all_supplier_api.current_supplier_evidence) evidence,(SELECT count(*)::int FROM tendermatch_supplier_api.current_supplier_profiles) legacy_profiles,(SELECT count(*)::int FROM tendermatch_supplier_api.current_supplier_evidence) legacy_evidence")).rows[0];
    if(JSON.stringify(Object.values(proof.sourceCounts))!==JSON.stringify([117,117,1553,17,289]))throw new Error('Preserved source count mismatch');
   }
  }finally{await c.query('ROLLBACK').catch(()=>{});await c.end().catch(()=>{});}
 }
 report.ownerPostflight=proof;await writeFile(reportFile,JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(proof));
}catch(e){console.error(JSON.stringify({status:'FAILED',code:e.code??'READ_ONLY_POSTFLIGHT_FAILED'}));process.exitCode=1;}
finally{delete process.env.TENDERMATCH_RESULTS_OWNER_URL;}

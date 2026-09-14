/** Bounded real development readback and credential denial checks; no result writes. */
import assert from 'node:assert/strict';
import pg from 'pg';
import {writeFile} from 'node:fs/promises';
import {loadOperatorSecret} from './lib/tendermatch-stage8-vault.mjs';
import {attestTarget} from './lib/tendermatch-stage8-operator.mjs';
import {developmentPin} from './tendermatch-stage8.mjs';
import {createStage8Store,bindPin,rankingQuery} from './lib/tendermatch-stage8-store.mjs';
import {createCursorCodec} from '../packages/tendermatch/src/service-stage8.ts';
import {createReadPool,guardedRuntimeUrl,mappedReadQuery,READ_ROLE,READ_SCHEMA} from '../functions/tendermatch-stage8/database.mjs';
import {HOSTED_DETAIL_SQL} from '../functions/tendermatch-stage8/queries.mjs';
const target=await attestTarget(),v=await loadOperatorSecret('runtime-readonly-v1'),pin=await developmentPin(),binding=bindPin(pin).bindingId;
const {pool,connect}=createReadPool(v.readUrl,{onQueryError:diagnostic=>console.error(JSON.stringify(diagnostic))}),store=createStage8Store({connect,pins:[pin],cursors:createCursorCodec(Buffer.from(v.cursorKey,'hex'))});
const principal={tenantId:pin.tenantId},proof={target,bindingId:binding,observedAt:new Date().toISOString(),checks:[],queries:{},measurements:[]};
const c=new pg.Client({connectionString:guardedRuntimeUrl(v.readUrl),enableChannelBinding:true,connectionTimeoutMillis:5000,query_timeout:6500});c.on('error',()=>{});
const check=(name,ok)=>{assert.ok(ok,name);proof.checks.push({name,passed:true});};
const measured=async(name,fn)=>{const start=performance.now(),r=await fn();const m={name,ms:Math.round(performance.now()-start),bytes:Buffer.byteLength(JSON.stringify(r))};proof.measurements.push(m);console.log(JSON.stringify(m));return r;};
try{
  await c.connect();await c.query("SELECT set_config('tendermatch.tenant_id',$1,false)",[pin.tenantId]);
  const role=(await c.query('SELECT rolname,rolsuper,rolcreatedb,rolcreaterole,rolreplication,rolbypassrls,rolconnlimit FROM pg_roles WHERE rolname=current_user')).rows[0];
  check('restricted runtime identity',role.rolname===READ_ROLE&&!role.rolsuper&&!role.rolcreatedb&&!role.rolcreaterole&&!role.rolreplication&&!role.rolbypassrls&&role.rolconnlimit===3);proof.role=role;
  proof.memberships=(await c.query('SELECT r.rolname FROM pg_auth_members m JOIN pg_roles r ON r.oid=m.roleid JOIN pg_roles u ON u.oid=m.member WHERE u.rolname=current_user')).rows.map(r=>r.rolname);
  assert.deepEqual(proof.memberships,['tendermatch_stage8_reader']);
  proof.privileges=(await c.query("SELECT n.nspname,c.relname,has_table_privilege(current_user,c.oid,'SELECT') can_read,has_table_privilege(current_user,c.oid,'INSERT,UPDATE,DELETE,TRUNCATE,REFERENCES,TRIGGER') can_write,pg_get_userbyid(c.relowner)=current_user owns FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE c.relkind IN ('r','v') AND n.nspname IN ('tendermatch_retrieval',$1) ORDER BY 1,2",[READ_SCHEMA])).rows;
  check('zero base-table reads/writes/ownership',proof.privileges.filter(r=>r.nspname==='tendermatch_retrieval').every(r=>!r.can_read&&!r.can_write&&!r.owns));
  check('only SELECT on pinned views',proof.privileges.filter(r=>r.nspname===READ_SCHEMA).every(r=>r.can_read&&!r.can_write&&!r.owns));
  const health=await measured('read-role health',()=>store.health(principal,binding));proof.population=health.context.population;assert.deepEqual(proof.population,{universe:2027961,candidates:707660,unscored:1320301,shortlist:28034});
  proof.members=(await c.query('SELECT kind,count(*)::int n FROM '+READ_SCHEMA+'.ranking_member GROUP BY kind')).rows;check('117 suppliers and 17333 tenders',proof.members.find(r=>r.kind==='supplier').n===117&&proof.members.find(r=>r.kind==='tender').n===17333);
  const selected=(await c.query('SELECT supplier_id::text,tender_id::text FROM '+READ_SCHEMA+'.escalation_decision LIMIT 1')).rows[0];proof.selected={supplierId:selected.supplier_id,tenderId:selected.tender_id};
  for(const direction of ['supplier','tender']){
    const focusId=selected[direction+'_id'],request={direction,focusId,limit:100};
    const page=await measured(direction+' first max page',()=>store.page(principal,binding,request));check(direction+' page max100',page.results.length<=100&&page.results.length>0);proof[direction]={count:page.results.length,hasMore:page.hasMore};
    if(page.nextCursor){const second=await measured(direction+' second page',()=>store.page(principal,binding,{...request,cursor:page.nextCursor}));check(direction+' no page duplicates',!second.results.some(p=>page.results.some(q=>p.supplierId===q.supplierId&&p.tenderId===q.tenderId)));}
    const focus=(await c.query('SELECT profile_key FROM '+READ_SCHEMA+'.ranking_member WHERE kind=$1 AND entity_id=$2',[direction,focusId])).rows[0].profile_key;
    const query=rankingQuery(pin,focus,request,null),mapped=mappedReadQuery(query.text,query.values);proof.queries[direction]=(await c.query('EXPLAIN (ANALYZE,BUFFERS,FORMAT JSON) '+mapped.text,mapped.values)).rows[0]['QUERY PLAN'];
  }
  const detail=await measured('scored pair detail',()=>store.detail(principal,binding,proof.selected.supplierId,proof.selected.tenderId));check('scored detail independent dimensions',detail.pair.formula.state==='SCORED'&&detail.pair.formula.denominator===100&&detail.pair.retrieval.semanticSimilarity===null&&detail.pair.humanDisposition.value===null);
  proof.criteria=detail.pair.criteria.map(r=>({code:r.code,state:r.state,fit:r.fit,points:r.points,references:r.references.length}));
  proof.queries.detail=(await c.query('EXPLAIN (ANALYZE,BUFFERS,FORMAT JSON) '+HOSTED_DETAIL_SQL,[pin.tenantId,pin.rankingRunId,proof.selected.supplierId,proof.selected.tenderId,Buffer.from(pin.methodHash,'hex'),Buffer.from(pin.formulaPolicy,'hex')])).rows[0]['QUERY PLAN'];
  const outside=(await c.query(`SELECT s.entity_id::text supplier_id,t.entity_id::text tender_id,p.state FROM ${READ_SCHEMA}.eligibility_pair p JOIN ${READ_SCHEMA}.eligibility_member s ON s.kind='supplier' AND s.input_key=p.supplier_key JOIN ${READ_SCHEMA}.eligibility_member t ON t.kind='tender' AND t.input_key=p.tender_key WHERE p.state=0 LIMIT 1`)).rows[0];
  proof.outside={supplierId:outside.supplier_id,tenderId:outside.tender_id};const outsideDetail=await measured('outside scope detail',()=>store.detail(principal,binding,outside.supplier_id,outside.tender_id));check('outside remains null not zero',outsideDetail.pair.formula.pairScore===null&&outsideDetail.pair.eligibility.state==='OUTSIDE_FORMULA_V1_1_SCOPE');
  for(const [name,sql] of [['base table','SELECT * FROM tendermatch_retrieval.formula_pair LIMIT 1'],['raw/source projection','SELECT * FROM tendermatch_retrieval.formula_input LIMIT 1'],['write view',"INSERT INTO "+READ_SCHEMA+".schema_migration(version) SELECT 'forbidden' WHERE false"],['create role','CREATE ROLE stage8_forbidden_probe']]){
    await c.query('BEGIN READ WRITE');let error;try{await c.query(sql);}catch(e){error=e.code;}finally{await c.query('ROLLBACK');}check(name+' denied by ACL',error==='42501');
  }
  let createDbCode;try{await c.query('CREATE DATABASE stage8_forbidden_probe');}catch(e){createDbCode=e.code;}check('create database denied',createDbCode==='42501'||createDbCode==='25006');
  await c.query("SELECT set_config('tendermatch.tenant_id','wrong-tenant',false)");check('wrong DB tenant sees no member',!(await c.query('SELECT 1 FROM '+READ_SCHEMA+'.ranking_member LIMIT 1')).rows.length);
  const nodes=x=>!x||typeof x!=='object'?[]:[...(x['Node Type']?[x]:[]),...Object.values(x).flatMap(nodes)];
  // Security-barrier views can legitimately choose the composite primary key plus
  // a focus-local sort instead of the directional index. Bound actual work, not a plan name.
  for(const [direction,plan] of Object.entries(proof.queries)){
    const scans=nodes(plan).filter(n=>n['Relation Name']==='ranking_pair');
    check(direction+' uses focus-bounded ranking index',scans.length>0&&scans.every(n=>n['Index Name']?.startsWith('ranking_pair_')&&n['Actual Rows']*n['Actual Loops']<=17333));
    check(direction+' no Formula full scan',!nodes(plan).some(n=>n['Relation Name']==='formula_pair'&&n['Node Type']==='Seq Scan'));
    check(direction+' SQL within 5s budget',plan[0]['Execution Time']<5000);
  }
  proof.roleState='READ_ONLY_PINNED_VIEWS';proof.sourceConnections=0;proof.resultWrites=0;proof.modelCalls=0;
  await writeFile('docs/evidence/tendermatch-stage8-hosted-db.json',JSON.stringify(proof,null,2)+'\n');console.log(JSON.stringify({checks:proof.checks.length,population:proof.population,measurements:proof.measurements,selected:proof.selected,outside:proof.outside}));
}catch(e){console.error('Stage 8 DB validation failed:',e instanceof assert.AssertionError?e.message:e.code??e.message);process.exitCode=1;}finally{await c.end().catch(()=>{});await pool.end();}

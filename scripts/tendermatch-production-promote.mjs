/** Explicit, fail-closed sealed-data promotion. Never deploys or edits development. */
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import pg from 'pg';
import {createHash,createDecipheriv,randomBytes} from 'node:crypto';
import {createGunzip} from 'node:zlib';
import {pipeline} from 'node:stream/promises';
import {Transform,Writable} from 'node:stream';
import {createRequire} from 'node:module';
import {neonApi,ownerConnection,TARGET} from './lib/tendermatch-stage8-operator.mjs';
import {PRODUCTION as P,BASE_SCHEMA as B,API_SCHEMA as A,ident,sealedSelections,validateColumns,restorableDataConstraints} from './lib/tendermatch-production-contract.mjs';
import {writableBinaryColumns} from './lib/tendermatch-binary-columns.mjs';
import {productionVault,loadProductionSecret,saveProductionSecret} from './lib/tendermatch-production-vault.mjs';
import {viewDefinitions} from './lib/tendermatch-stage8-views.mjs';
import {HEADER_SQL} from './lib/tendermatch-stage8-store.mjs';
const require=createRequire(new URL('./production-promotion-tools/package.json',import.meta.url));
const {from:copyFrom}=require('pg-copy-streams');
const hash=x=>createHash('sha256').update(JSON.stringify(x)).digest('hex');
const checkpointPath=process.argv[2];
const resume=process.argv[3]==='--resume-empty-approved';
if (!checkpointPath || !['--create-approved','--resume-empty-approved'].includes(process.argv[3])) throw Error('Explicit sealed checkpoint and approved create/resume mode required');
const directory=path.dirname(path.resolve(checkpointPath));
assert.ok(directory.startsWith(path.resolve(productionVault)+path.sep),'Checkpoint must be in isolated operator vault');
const cp=JSON.parse(fs.readFileSync(checkpointPath,'utf8'));
assert.equal(cp.state,'SEALED');assert.deepEqual(cp.destination,P);assert.deepEqual(cp.source,TARGET);
assert.equal(cp.pin.bindingId,P.bindingId);
assert.equal(hash(cp.tables.map(({name,count,sha256})=>({name,count,sha256}))),cp.datasetHash);
assert.equal(hash(cp.tables.map(({name,columns,primaryKey,constraints,indexes})=>({name,columns,primaryKey,constraints,indexes}))),cp.schemaHash);
assert.deepEqual(cp.tables.map(t=>t.name).sort(),Object.keys(sealedSelections(cp.pin)).sort());
const secret=await loadProductionSecret(cp.keyName);
assert.equal(secret.directory,directory);const key=Buffer.from(secret.key,'hex');
const originalReport=path.join(directory,'promotion.json');
if(resume){const old=JSON.parse(fs.readFileSync(originalReport,'utf8'));assert.equal(old.state,'STOPPED');assert.equal(old.failureCode,'42601');assert.equal(old.datasetHash,cp.datasetHash);assert.ok(!old.secretPath);}
const reportPath=resume?path.join(directory,'promotion-retry-'+Date.now()+'.json'):originalReport;
if(fs.existsSync(reportPath))throw Error('Existing promotion attempt: reconcile; no automatic retry/overwrite');
const proof={state:'PREFLIGHT',startedAt:new Date().toISOString(),target:P,bindingId:cp.pin.bindingId,
  datasetHash:cp.datasetHash,schemaHash:cp.schemaHash,checkpoint:checkpointPath,checks:[],tables:[],rollback:cp.rollback,
  developmentMutations:0,liveBackendSwitched:false,modelCalls:0};
const persist=()=>fs.writeFileSync(reportPath,JSON.stringify(proof,null,2)+'\n');
const check=(name,condition)=>{assert.ok(condition,name);proof.checks.push(name);persist();};
persist();
let admin,reader,runtimeProvisioned=false;
async function productionConnection(database=P.database) {
  const {project}=await neonApi('/projects/'+P.project);
  const {branch}=await neonApi(`/projects/${P.project}/branches/${P.branch}`);
  assert.equal(project.region_id,P.region);assert.equal(project.org_id,TARGET.org);
  assert.equal(branch.id,P.branch);assert.equal(branch.name,'production');assert.equal(branch.default,true);
  const {uri}=await neonApi('/projects/'+P.project+'/connection_uri?'+new URLSearchParams({branch_id:P.branch,database_name:database,role_name:'neondb_owner',pooled:'false'}));
  const u=new URL(uri);assert.equal(u.hostname,P.host);assert.equal(u.pathname,'/'+database);assert.equal(u.username,'neondb_owner');
  u.searchParams.set('sslmode','verify-full');u.searchParams.set('channel_binding','require');
  const c=new pg.Client({connectionString:u.href,enableChannelBinding:true,connectionTimeoutMillis:10000});c.on('error',()=>{});
  await c.connect();assert.equal((await c.query('SELECT current_database() db')).rows[0].db,database);
  await c.query("SET statement_timeout='15min'; SET TimeZone='UTC'; SET DateStyle='ISO, YMD'; SET extra_float_digits=3; SET bytea_output='hex'; SET IntervalStyle='postgres'");
  return c;
}
async function fingerprint(c,t,predicate='true') {
  // Independent server-side SHA-256 over every typed field, in stable PK order.
  // Each row digest has fixed width, so concatenation is unambiguous. This
  // avoids retransmitting the full matrix twice merely to compare its contents.
  const fields=t.columns.map(x=>'r.'+ident(x.name)).join(',');
  const order=t.primaryKey.map(x=>'r.'+ident(x)).join(',');
  const sql=`SELECT count(*)::text count,encode(sha256(convert_to(coalesce(string_agg(encode(sha256(convert_to(ROW(${fields})::text,'UTF8')),'hex'),'' ORDER BY ${order}),''),'UTF8')),'hex') sha256 FROM ${B}.${ident(t.name)} r WHERE ${predicate}`;
  const result=(await c.query(sql)).rows[0];return {count:Number(result.count),sha256:result.sha256};
}
async function createTables(c){
  await c.query(`CREATE SCHEMA ${B}; REVOKE ALL ON SCHEMA ${B} FROM PUBLIC`);
  for(const t of cp.tables){
    const columns=t.columns.map(x=>`${ident(x.name)} ${x.type}${x.generated?' GENERATED ALWAYS AS ('+x.default_expression+') STORED':x.default_expression?' DEFAULT '+x.default_expression:''}${x.not_null?' NOT NULL':''}`).join(',');
    await c.query(`CREATE TABLE ${B}.${ident(t.name)} (${columns})`);
  }
}
async function createDataConstraints(c){
  for(const foreign of [false,true])for(const t of cp.tables)for(const constraint of restorableDataConstraints(t.constraints).filter(x=>(x.type==='f')===foreign)){
    await c.query(`ALTER TABLE ${B}.${ident(t.name)} ADD CONSTRAINT ${ident(constraint.name)} ${constraint.definition}`);
  }
  for(const t of cp.tables)for(const index of t.indexes)await c.query(index);
}
try {
  // Authenticate every encrypted stream and checksum before the first production mutation.
  for(const t of cp.tables){
    assert.equal(t.file,t.name+'.copy.gz.aes');ident(t.name);validateColumns(t.name,t.columns);
    const decipher=createDecipheriv('aes-256-gcm',key,Buffer.from(t.nonce,'hex'));decipher.setAuthTag(Buffer.from(t.tag,'hex'));
    const h=createHash('sha256');let bytes=0;
    await pipeline(fs.createReadStream(path.join(directory,t.file)),decipher,createGunzip(),new Writable({write(b,e,cb){h.update(b);bytes+=b.length;cb();}}));
    assert.equal(h.digest('hex'),t.sha256);assert.equal(bytes,t.bytes);
  }
  check('all checkpoint files authenticated and hashed before creation',true);
  const securitySource=await ownerConnection();
  try{
    await securitySource.query('BEGIN READ ONLY');
    proof.sourceSecurity=(await securitySource.query("SELECT c.relname,c.relrowsecurity,c.relforcerowsecurity,(SELECT count(*)::int FROM pg_trigger t WHERE t.tgrelid=c.oid AND NOT t.tgisinternal) writer_triggers FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname=$1 AND c.relname=ANY($2::text[]) ORDER BY 1",[B,cp.tables.map(x=>x.name)])).rows;
    const policies=(await securitySource.query("SELECT c.relname,p.polname,p.polcmd,pg_get_expr(p.polqual,p.polrelid) qual,pg_get_expr(p.polwithcheck,p.polrelid) check_expr,p.polroles::text roles FROM pg_policy p JOIN pg_class c ON c.oid=p.polrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname=$1 AND c.relname=ANY($2::text[]) ORDER BY 1",[B,cp.tables.map(x=>x.name)])).rows;
    assert.equal(policies.length,cp.tables.filter(t=>t.columns.some(x=>x.name==='tenant_id')).length);
    check('source tenant policy understood before promotion',policies.every(x=>x.polname==='tenant_isolation'&&x.polcmd==='*'&&x.roles==='{0}'&&x.qual==="(tenant_id = current_setting('tendermatch.tenant_id'::text, true))"&&x.check_expr===x.qual));
    proof.securityPolicy='Preserve tenant RLS; replace development generation/job writer triggers with a production all-write rejection. No writer/model execution is deployed.';
  }finally{await securitySource.end().catch(()=>{});}
  const endpoint=`/projects/${P.project}/branches/${P.branch}/databases`;
  const before=(await neonApi(endpoint)).databases;
  check(resume?'dedicated destination exists for verified empty retry':'dedicated destination absent',resume?before.some(x=>x.name===P.database):!before.some(x=>x.name===P.database));
  assert.deepEqual(before.filter(d=>!resume||d.name!==P.database).map(d=>({name:d.name,owner:d.owner_name})),cp.productionBefore);
  admin=await productionConnection('neondb');
  proof.productionRolesBefore=(await admin.query('SELECT rolname FROM pg_roles ORDER BY rolname')).rows.map(x=>x.rolname);
  check('new production role names unused',!proof.productionRolesBefore.includes(P.loginRole)&&!proof.productionRolesBefore.includes(P.grantRole));
  proof.endpointConfigurationBefore=(await neonApi(`/projects/${P.project}/endpoints`)).endpoints.map(x=>({id:x.id,branch:x.branch_id,host:x.host,minCu:x.autoscaling_limit_min_cu,maxCu:x.autoscaling_limit_max_cu})).sort((a,b)=>a.id.localeCompare(b.id));
  assert.equal((await admin.query('SHOW server_version_num')).rows[0].server_version_num.slice(0,2),cp.databaseVersion.slice(0,2));
  await admin.end();admin=null;
  proof.state=resume?'ATTESTING_EMPTY_RETRY':'CREATING_DATABASE';persist();
  if(!resume)await neonApi(endpoint,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({database:{name:P.database,owner_name:'neondb_owner'}})});
  proof.state='DATABASE_CREATED_NOT_LIVE';persist();
  admin=await productionConnection();
  if(resume){
    const description=(await admin.query("SELECT shobj_description(oid,'pg_database') description FROM pg_database WHERE datname=current_database()")).rows[0].description;
    assert.equal(description,`TenderMatch sealed production results; binding ${cp.pin.bindingId}; dataset ${cp.datasetHash}; not live`);
    const userRelations=(await admin.query("SELECT count(*)::int n FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname NOT IN ('pg_catalog','information_schema') AND n.nspname NOT LIKE 'pg_toast%'")).rows[0].n;
    check('failed import rolled back completely; no destination user relations',userRelations===0);
    check('no staged schema survived failed transaction',!(await admin.query('SELECT 1 FROM pg_namespace WHERE nspname=ANY($1::text[])',[[B,A]])).rows.length);
  }
  await admin.query(`REVOKE ALL ON DATABASE ${ident(P.database)} FROM PUBLIC; REVOKE ALL ON SCHEMA public FROM PUBLIC`);
  await admin.query(`COMMENT ON DATABASE ${ident(P.database)} IS 'TenderMatch sealed production results; binding ${cp.pin.bindingId}; dataset ${cp.datasetHash}; not live'`);
  check('production database has no PUBLIC connect/temp rights',!(await admin.query("SELECT 1 FROM pg_database d CROSS JOIN LATERAL aclexplode(coalesce(d.datacl,acldefault('d',d.datdba))) a WHERE d.datname=current_database() AND a.grantee=0")).rows.length);
  await admin.query('BEGIN');await createTables(admin);await createDataConstraints(admin);await admin.query('ROLLBACK');
  check('all data schema/constraint/index DDL validated on empty transactional schema before copy',true);
  proof.state='COPYING_UNPUBLISHED';persist();
  await admin.query('BEGIN');
  await createTables(admin);
  for(const t of cp.tables){
    const decipher=createDecipheriv('aes-256-gcm',key,Buffer.from(t.nonce,'hex'));decipher.setAuthTag(Buffer.from(t.tag,'hex'));
    const h=createHash('sha256');let bytes=0;
    const meter=new Transform({transform(b,e,cb){h.update(b);bytes+=b.length;cb(null,b);}});
    const streams=[fs.createReadStream(path.join(directory,t.file)),decipher,createGunzip(),meter];
    if(t.columns.some(x=>x.generated))streams.push(writableBinaryColumns(t.columns));
    streams.push(admin.query(copyFrom(`COPY ${B}.${ident(t.name)} (${t.columns.filter(x=>!x.generated).map(x=>ident(x.name)).join(',')}) FROM STDIN WITH(FORMAT binary)`)));
    await pipeline(...streams);
    assert.equal(h.digest('hex'),t.sha256);assert.equal(bytes,t.bytes);
    proof.tables.push({name:t.name,copiedRows:t.count,copyHash:t.sha256});persist();
    console.log(JSON.stringify({copied:t.name,rows:t.count,complete:proof.tables.length,total:cp.tables.length}));
  }
  // Column-level NOT NULL is already reproduced by CREATE TABLE. PostgreSQL 18
  // exposes it as contype=n, but its catalog text is not ADD CONSTRAINT syntax.
  // contype=t belongs to development writer constraint-triggers, intentionally
  // replaced by the sealed-production no-write boundary rather than replayed.
  await createDataConstraints(admin);
  for(const t of cp.tables.filter(t=>t.columns.some(x=>x.name==='tenant_id'))){
    await admin.query(`ALTER TABLE ${B}.${ident(t.name)} ENABLE ROW LEVEL SECURITY;
      CREATE POLICY tenant_isolation ON ${B}.${ident(t.name)} USING(tenant_id=current_setting('tendermatch.tenant_id',true)) WITH CHECK(tenant_id=current_setting('tendermatch.tenant_id',true))`);
  }
  await admin.query(`CREATE FUNCTION ${B}.reject_production_mutation() RETURNS trigger LANGUAGE plpgsql AS $body$ BEGIN RAISE EXCEPTION 'Sealed production results are immutable; a new approved promotion is required'; END; $body$;
    REVOKE ALL ON FUNCTION ${B}.reject_production_mutation() FROM PUBLIC`);
  for(const t of cp.tables)await admin.query(`CREATE TRIGGER sealed_production_immutable BEFORE INSERT OR UPDATE OR DELETE OR TRUNCATE ON ${B}.${ident(t.name)} FOR EACH STATEMENT EXECUTE FUNCTION ${B}.reject_production_mutation()`);
  await admin.query(`REVOKE ALL ON ALL TABLES IN SCHEMA ${B} FROM PUBLIC`);
  await admin.query('COMMIT');
  for(const t of cp.tables)await admin.query(`ANALYZE ${B}.${ident(t.name)}`);
  proof.state='COPIED_PRIVATE_VALIDATING';persist();
  // No runtime role exists yet, and no application endpoint points here.
  // Fresh read-only connections avoid COPY stream reuse and validate committed data.
  for(const t of cp.tables){
    const c=await productionConnection();
    try{
      await c.query('BEGIN READ ONLY');
      const count=Number((await c.query(`SELECT count(*)::text n FROM ${B}.${ident(t.name)}`)).rows[0].n);
      assert.equal(count,t.count);
      const columns=(await c.query("SELECT a.attname name,format_type(a.atttypid,a.atttypmod) type,a.attnotnull not_null,a.attidentity identity,a.attgenerated generated,pg_get_expr(d.adbin,d.adrelid) default_expression FROM pg_attribute a LEFT JOIN pg_attrdef d ON d.adrelid=a.attrelid AND d.adnum=a.attnum WHERE a.attrelid=$1::regclass AND a.attnum>0 AND NOT a.attisdropped ORDER BY a.attnum",[B+'.'+t.name])).rows;
      assert.deepEqual(columns,t.columns);
      const constraints=(await c.query("SELECT conname name,contype type,pg_get_constraintdef(oid) definition,CASE WHEN confrelid<>0 THEN confrelid::regclass::text ELSE null END referenced_table FROM pg_constraint WHERE conrelid=$1::regclass ORDER BY conname",[B+'.'+t.name])).rows;
      assert.deepEqual(constraints,t.constraints.filter(x=>x.type!=='t'));
      const indexes=(await c.query("SELECT pg_get_indexdef(i.indexrelid) definition FROM pg_index i WHERE i.indrelid=$1::regclass AND NOT EXISTS (SELECT 1 FROM pg_constraint c WHERE c.conindid=i.indexrelid) ORDER BY i.indexrelid::regclass::text",[B+'.'+t.name])).rows.map(x=>x.definition);
      assert.deepEqual(indexes,t.indexes);
      const actual=await fingerprint(c,t);assert.equal(actual.count,t.count);
      Object.assign(proof.tables.find(x=>x.name===t.name),{destinationRows:count,destinationCanonicalHash:actual.sha256,schemaIdentical:true});persist();
      console.log(JSON.stringify({verifiedDestination:t.name,rows:count}));
    }finally{await c.end().catch(()=>{});}
  }
  check('all committed production counts/schema verified and every field independently hashed',true);
  // Recheck the source without any source mutation or recomputation.
  for(const t of cp.tables){
    const c=await ownerConnection();c.connectionParameters.query_timeout=0;
    try{
      await c.query('BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY');
      await c.query("SET LOCAL statement_timeout='15min'; SET LOCAL TimeZone='UTC'; SET LOCAL DateStyle='ISO, YMD'; SET LOCAL extra_float_digits=3; SET LOCAL bytea_output='hex'; SET LOCAL IntervalStyle='postgres'");
      await c.query("SELECT set_config('tendermatch.tenant_id',$1,true)",[cp.pin.tenantId]);
      const actual=await fingerprint(c,t,t.predicate);assert.equal(actual.count,t.count);
      const record=proof.tables.find(x=>x.name===t.name);assert.equal(actual.sha256,record.destinationCanonicalHash);
      Object.assign(record,{sourceCanonicalHash:actual.sha256,sourceUnchanged:true});persist();
      console.log(JSON.stringify({verifiedSourceUnchanged:t.name}));
    }finally{await c.end().catch(()=>{});}
  }
  const source=await ownerConnection();
  try{
    await source.query('BEGIN READ ONLY');
    const roles=(await source.query("SELECT rolname,rolsuper,rolcreatedb,rolcreaterole,rolcanlogin,rolreplication,rolbypassrls,rolconnlimit,rolconfig FROM pg_roles WHERE rolname LIKE 'tendermatch%' ORDER BY rolname")).rows;
    assert.deepEqual(roles,cp.sourceRoleState);
  }finally{await source.end().catch(()=>{});}
  check('development pinned data and role configuration unchanged',true);
  proof.state='PROVISIONING_READONLY';persist();
  const password=randomBytes(36).toString('base64url');
  const readUrl=new URL('postgresql://'+P.host+'/'+P.database);readUrl.username=P.loginRole;readUrl.password=password;
  readUrl.searchParams.set('sslmode','verify-full');readUrl.searchParams.set('channel_binding','require');
  proof.secretPath=await saveProductionSecret('runtime-readonly-v1',{projectId:P.project,branchId:P.branch,database:P.database,
    variable:'TENDERMATCH_PRODUCTION_READ_URL',readUrl:readUrl.href,cursorKey:randomBytes(32).toString('hex'),bindingId:cp.pin.bindingId});
  await admin.query('BEGIN');
  await admin.query(`CREATE SCHEMA ${A}; REVOKE ALL ON SCHEMA ${A} FROM PUBLIC;
    CREATE ROLE ${P.grantRole} NOLOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS;
    CREATE ROLE ${P.loginRole} LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS CONNECTION LIMIT 3 PASSWORD '${password}';
    GRANT ${P.grantRole} TO ${P.loginRole}; GRANT CONNECT ON DATABASE ${P.database} TO ${P.loginRole};
    ALTER ROLE ${P.loginRole} SET default_transaction_read_only=on;
    ALTER ROLE ${P.loginRole} SET statement_timeout='5s';
    ALTER ROLE ${P.loginRole} SET idle_in_transaction_session_timeout='8s';
    ALTER ROLE ${P.loginRole} SET search_path=pg_catalog;`);
  for(const v of viewDefinitions(cp.pin))await admin.query(v.sql);
  await admin.query(`REVOKE ALL ON ALL TABLES IN SCHEMA ${A} FROM PUBLIC;
    GRANT USAGE ON SCHEMA ${A} TO ${P.grantRole}; GRANT SELECT ON ALL TABLES IN SCHEMA ${A} TO ${P.grantRole}`);
  await admin.query('COMMIT');
  runtimeProvisioned=true;
  for(const database of cp.productionBefore.map(x=>x.name)){
    const other=await productionConnection(database);
    try{
      const readable=(await other.query("SELECT count(*)::int n FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE c.relkind IN ('r','v','m','f') AND n.nspname NOT IN ('pg_catalog','information_schema') AND n.nspname NOT LIKE 'pg_toast%' AND has_schema_privilege($1,n.oid,'USAGE') AND has_table_privilege($1,c.oid,'SELECT')",[P.loginRole])).rows[0].n;
      check('production reader cannot read unrelated database '+database,readable===0);
    }finally{await other.end().catch(()=>{});}
  }
  reader=new pg.Client({connectionString:readUrl.href,enableChannelBinding:true,connectionTimeoutMillis:10000,query_timeout:7000});reader.on('error',()=>{});await reader.connect();
  await reader.query("SELECT set_config('tendermatch.tenant_id',$1,false)",[cp.pin.tenantId]);
  proof.role=(await reader.query('SELECT rolname,rolsuper,rolcreatedb,rolcreaterole,rolreplication,rolbypassrls,rolconnlimit FROM pg_roles WHERE rolname=current_user')).rows[0];
  check('restricted production runtime identity',proof.role.rolname===P.loginRole&&!proof.role.rolsuper&&!proof.role.rolcreatedb&&!proof.role.rolcreaterole&&!proof.role.rolreplication&&!proof.role.rolbypassrls&&proof.role.rolconnlimit===3);
  const memberships=(await reader.query('SELECT r.rolname FROM pg_auth_members m JOIN pg_roles r ON r.oid=m.roleid JOIN pg_roles u ON u.oid=m.member WHERE u.rolname=current_user ORDER BY r.rolname')).rows.map(x=>x.rolname);
  assert.deepEqual(memberships,[P.grantRole]);check('sole application membership is production NOLOGIN reader',true);
  const privileges=(await reader.query("SELECT n.nspname,has_table_privilege(current_user,c.oid,'SELECT') can_read,has_table_privilege(current_user,c.oid,'INSERT,UPDATE,DELETE,TRUNCATE,REFERENCES,TRIGGER') can_write,pg_get_userbyid(c.relowner)=current_user owns FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE c.relkind IN ('r','v') AND n.nspname IN ($1,$2)",[B,A])).rows;
  check('no base access or writes/ownership',privileges.filter(x=>x.nspname===B).every(x=>!x.can_read&&!x.can_write&&!x.owns));
  check('only read access on exact pinned views',privileges.filter(x=>x.nspname===A).length===viewDefinitions(cp.pin).length&&privileges.filter(x=>x.nspname===A).every(x=>x.can_read&&!x.can_write&&!x.owns));
  const ownership=(await admin.query("SELECT count(*)::int n FROM pg_shdepend d JOIN pg_roles r ON r.oid=d.refobjid WHERE d.refclassid='pg_authid'::regclass AND d.deptype='o' AND r.rolname=ANY($1::text[])",[[P.loginRole,P.grantRole]])).rows[0].n;
  check('runtime and grant role own zero objects',ownership===0);
  const header=(await reader.query(HEADER_SQL.replaceAll(B+'.',A+'.'),[cp.pin.tenantId,cp.pin.planId])).rows[0];
  assert.deepEqual(header,cp.header);check('actual production reader sees exact sealed population/header',true);
  for(const [name,sql] of [['base read',`SELECT * FROM ${B}.formula_pair LIMIT 1`],['raw input read',`SELECT * FROM ${B}.formula_input LIMIT 1`],['API write',`INSERT INTO ${A}.schema_migration(version) SELECT 'forbidden' WHERE false`],['role creation','CREATE ROLE tendermatch_forbidden_probe']]){
    await reader.query('BEGIN READ WRITE');let code;
    try{await reader.query(sql);}catch(e){code=e.code;}finally{await reader.query('ROLLBACK');}
    check(name+' denied by ACL',code==='42501');
  }
  await reader.query('SET default_transaction_read_only=off');let dbCode;
  try{await reader.query('CREATE DATABASE tendermatch_forbidden_probe');}catch(e){dbCode=e.code;}
  check('database creation denied by ACL',dbCode==='42501');
  await reader.query('SET default_transaction_read_only=on');
  await reader.query("SELECT set_config('tendermatch.tenant_id','wrong-tenant',false)");
  check('wrong tenant has no visible ranking members',!(await reader.query(`SELECT 1 FROM ${A}.ranking_member LIMIT 1`)).rows.length);
  proof.databaseBytes=Number((await admin.query('SELECT pg_database_size(current_database())::text n')).rows[0].n);
  const after=(await neonApi(endpoint)).databases;
  assert.deepEqual(after.filter(x=>x.name!==P.database).map(d=>({name:d.name,owner:d.owner_name})),cp.productionBefore);
  check('pre-existing production database identities unchanged',true);
  const endpointAfter=(await neonApi(`/projects/${P.project}/endpoints`)).endpoints.map(x=>({id:x.id,branch:x.branch_id,host:x.host,minCu:x.autoscaling_limit_min_cu,maxCu:x.autoscaling_limit_max_cu})).sort((a,b)=>a.id.localeCompare(b.id));
  assert.deepEqual(endpointAfter,proof.endpointConfigurationBefore);check('no compute endpoint or scaling configuration changed',true);
  proof.state='DATA_VERIFIED_READONLY_NOT_LIVE';proof.completedAt=new Date().toISOString();persist();
  console.log(JSON.stringify({state:proof.state,tables:proof.tables.length,checks:proof.checks.length,report:reportPath,databaseBytes:proof.databaseBytes}));
} catch(e) {
  // Retain data for investigation but disable only our new reader on a failed gate.
  if(admin){await admin.query('ROLLBACK').catch(()=>{});if(runtimeProvisioned)await admin.query(`ALTER ROLE ${P.loginRole} NOLOGIN`).catch(()=>{});}
  proof.state='STOPPED';proof.failureCode=e.code??'PROMOTION_GATE';proof.failure= e instanceof assert.AssertionError ? e.message : (e.code ? 'Database operation failed; no secret output' : e.message);persist();
  console.error(JSON.stringify({state:proof.state,code:proof.failureCode,reason:proof.failure,report:reportPath}));process.exitCode=1;
} finally {key.fill(0);if(reader)await reader.end().catch(()=>{});if(admin)await admin.end().catch(()=>{});}

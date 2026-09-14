/** Explicit Stage 1 CLI; default plan is disconnected. Never prints credentials. */
import { readFile } from "node:fs/promises";
import { pathToFileURL } from "node:url";
import { execFileSync } from "node:child_process";
import pg from "pg";
import { DEV_TARGET as T, guardUrl, executionAuthority, RESULT_TABLES, expectDenied } from "./lib/tendermatch-dev-contract.mjs";
import { VERSION, ADAPTER, TENANT, TENDER, SOURCES, LIMITS, guardTenderUrl, captureSource, assemble, validateWriter, register, sha } from "./lib/tendermatch-input-manifest.mjs";

const root=new URL("../",import.meta.url);
export async function secret(file,key) {
  const text=await readFile(file,"utf8");
  const lines=text.split(/\r?\n/).filter(line=>line.startsWith(`${key}=`));
  if(lines.length!==1) throw new Error("Missing or ambiguous private credential assignment");
  return lines[0].slice(key.length+1).trim().replace(/^['"]|['"]$/g,"");
}
export function authority(args,env,now=Date.now()) {
  executionAuthority(args,env);
  const verified=Date.parse(env.TENDERMATCH_CONSOLE_VERIFIED_AT);
  if(!Number.isFinite(verified) || verified>now || now-verified>86400000 || env.TENDERMATCH_TENDER_PROJECT_ID!==TENDER.projectId || env.TENDERMATCH_TENDER_BRANCH_ID!==TENDER.branchId || env.TENDERMATCH_TENDER_ENDPOINT!==TENDER.host) throw new Error("Fresh source Console attestation required");
}
async function connection(value,database,role) {
  const client=new pg.Client({connectionString:value,connectionTimeoutMillis:15000,query_timeout:35000,enableChannelBinding:true});
  client.on("error",()=>{});
  try {
    await client.connect();
    const [actual]=(await client.query("SELECT current_database() database,current_user role")).rows;
    if(actual.database!==database || actual.role!==role) throw new Error("Connected identity mismatch");
    return client;
  } catch {await client.end().catch(()=>{});throw new Error("Connection or target validation failed");}
}
export async function migrate(client) {
  await client.query("BEGIN");
  try {
    await client.query("SELECT set_config('tendermatch.approved_branch_id',$1,true)",[T.branchId]);
    const source=await readFile(new URL("db/tendermatch-dev/040-input-manifest-up.sql",root),"utf8");
    await client.query(source);
    await client.query("COMMIT");
    return {migration:'20260906-input-manifest-v1',sqlSha256:sha(source),tables:['input_manifest','input_member','input_capture'],credentialsCreated:0,sourceChanges:0};
  } catch(e) {await client.query("ROLLBACK");throw e;}
}
async function businessCounts(client) {
  const counts={};
  for(const table of RESULT_TABLES.filter(t=>t!=='schema_migration')) counts[table]=(await client.query(`SELECT count(*)::int count FROM tendermatch_retrieval.${table}`)).rows[0].count;
  if(Object.values(counts).some(n=>n!==0)) throw new Error("Stage 1 requires empty scoring/model state; no automatic adoption");
  return counts;
}
async function negativeChecks(client,capture) {
  await expectDenied(client,"UPDATE tendermatch_retrieval.input_member SET provenance='{}' WHERE false");
  await expectDenied(client,"DELETE FROM tendermatch_retrieval.input_manifest WHERE false");
  await expectDenied(client,"TRUNCATE tendermatch_retrieval.input_capture");
  await expectDenied(client,"CREATE TABLE tendermatch_retrieval.stage1_forbidden(id int)");
  await client.query("BEGIN");
  try {
    await client.query("SELECT set_config('tendermatch.tenant_id','stage1-other-tenant-probe',true)");
    if((await client.query("SELECT * FROM tendermatch_retrieval.input_member WHERE manifest_id=$1",[capture.manifestId])).rows.length) throw new Error("Tenant read isolation failed");
    let code;
    try {await client.query("INSERT INTO tendermatch_retrieval.input_capture(tenant_id,capture_id,manifest_id,observations) VALUES($1,$2,$3,'{}')",[TENANT,'f'.repeat(64),capture.manifestId]);} catch(e) {code=e.code;}
    if(code!=='42501') throw new Error("Tenant write isolation failed");
  } finally {await client.query("ROLLBACK");}
  await client.query("BEGIN");
  try {
    await client.query("SELECT set_config('tendermatch.tenant_id',$1,true)",[TENANT]);
    let code;
    try {await client.query("INSERT INTO tendermatch_retrieval.input_member VALUES($1,$2,'tender','00000000-0000-0000-0000-000000000001','{}')",[TENANT,capture.manifestId]);} catch(e) {code=e.code;}
    if(code!=='P0001') throw new Error("Committed membership seal failed");
  } finally {await client.query("ROLLBACK");}
  return {updateDeleteTruncateDdl:'denied',crossTenantRead:'zero rows',crossTenantWrite:'denied',lateMemberInsert:'denied',probeRowsCommitted:0,boundary:'trusted service tenant GUC, not authentication'};
}
export async function main(args=process.argv.slice(2),env=process.env) {
  const action=args[0]??'plan';
  try {
    if(action==='plan') return {version:VERSION,adapter:ADAPTER,connects:false,actions:['migrate','capture','register'],sources:SOURCES,result:{projectId:T.projectId,branchId:T.branchId,host:T.host,database:T.resultDatabase,schema:T.resultSchema},limits:LIMITS,scoring:'NOT RUN'};
    if(!['migrate','capture','register'].includes(action)) throw new Error("Unknown Stage 1 action");
    authority(args,env);
    if(action==='migrate') {
      const url=guardUrl(env.TENDERMATCH_RESULTS_OWNER_URL,'results');
      const c=await connection(url.href,T.resultDatabase,T.owner);
      try {return await migrate(c);} finally {await c.end();}
    }
    // Reuse only named existing private files. Never load the writable .env.
    const supplierUrl=guardUrl(await secret(new URL(T.consumerSecretFile,root),T.consumerVariable),'source',T.consumerLogin);
    const tenderFile=env.TENDERMATCH_TENDER_ENV_FILE;
    if(!tenderFile) throw new Error("Explicit tender read-only env file required");
    const tenderUrl=guardTenderUrl(await secret(tenderFile,'TENDERMATCH_NEON_DATABASE_URL'));
    const s=await connection(supplierUrl.href,T.sourceDatabase,T.consumerLogin);
    let supplier;
    try {supplier=await captureSource(s,'supplier');} finally {await s.end();}
    const t=await connection(tenderUrl.href,TENDER.database,TENDER.role);
    let tender;
    try {tender=await captureSource(t,'tender');} finally {await t.end();}
    const capture=assemble(supplier,tender);
    const report={version:VERSION,status:action==='capture'?'CAPTURED_NOT_REGISTERED':'REGISTERED',manifestId:capture.manifestId,captureId:capture.captureId,identity:capture.identity,observations:capture.observations,potentialPairs:supplier.members.length*tender.members.length,scoring:'NOT RUN',eligibility:'NOT RUN',shortlisting:'NOT RUN',ai:'NOT RUN',frontEndChanged:false,sourceWrites:0};
    if(action==='register') {
      const url=guardUrl(await secret(new URL(T.writerSecretFile,root),T.writerVariable),'results',T.writerLogin);
      const c=await connection(url.href,T.resultDatabase,T.writerLogin);
      try {
        await validateWriter(c);
        await c.query("SELECT set_config('tendermatch.tenant_id',$1,false)",[TENANT]);
        report.businessBefore=await businessCounts(c);
        report.registration=await register(c,capture);
        report.idempotentReplay=await register(c,capture);
        if(report.idempotentReplay.insertedManifest || report.idempotentReplay.insertedMembers || report.idempotentReplay.insertedCapture) throw new Error("Idempotent replay changed membership");
        report.negativeChecks=await negativeChecks(c,capture);
        report.businessAfter=await businessCounts(c);
        report.storage=(await c.query("SELECT c.relname table_name,pg_total_relation_size(c.oid)::text total_bytes,pg_relation_size(c.oid)::text heap_bytes FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='tendermatch_retrieval' AND c.relname IN ('input_manifest','input_member','input_capture') ORDER BY c.relname")).rows;
        report.persistedRows={};
        for(const table of ['input_manifest','input_member','input_capture']) report.persistedRows[table]=(await c.query(`SELECT count(*)::int count FROM tendermatch_retrieval.${table}`)).rows[0].count;
      } finally {await c.end();}
    }
    report.codeCommit=execFileSync('git',['rev-parse','HEAD'],{cwd:root,encoding:'utf8',windowsHide:true}).trim();
    report.executedFiles={};
    for(const file of ['scripts/lib/tendermatch-input-manifest.mjs','scripts/tendermatch-input-manifest.mjs','db/tendermatch-dev/040-input-manifest-up.sql']) report.executedFiles[file]=sha(await readFile(new URL(file,root),'utf8'));
    return report;
  } finally {delete env.TENDERMATCH_RESULTS_OWNER_URL;}
}
if(process.argv[1] && import.meta.url===pathToFileURL(process.argv[1]).href) main().then(r=>console.log(JSON.stringify(r,null,2))).catch(e=>{console.error(JSON.stringify({status:'FAILED',code:/^[A-Z0-9]{5}$/.test(e.code??'')?e.code:'STAGE1_FAILED',details:'Credential-bearing errors suppressed; no automatic retry or source changes.'}));process.exitCode=1;});

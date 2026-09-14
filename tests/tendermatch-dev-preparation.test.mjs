import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";
import test from "node:test";
import { DEV_TARGET as T, guardUrl, executionAuthority, assertManifest, profilePageQuery, evidencePageQuery, validateSourceData, validateLogin, expectDenied, idDigest } from "../scripts/lib/tendermatch-dev-contract.mjs";
import { main, transactionBody } from "../scripts/tendermatch-dev-setup.mjs";

const readSql = name => readFile(new URL(`../db/tendermatch-dev/${name}`,import.meta.url),"utf8");
const executableSql = value => value.replace(/^\s*--.*$/gm, "");
const ownerUrl = `postgresql://neondb_owner:synthetic-only@${T.host}/${T.sourceDatabase}?sslmode=verify-full&channel_binding=require`;
const id = i => `00000000-0000-0000-0000-${String(i).padStart(12,"0")}`;

test("development preparation defaults to disconnected plan and clears temporary owner environment",async()=>{
 const env={TENDERMATCH_SOURCE_OWNER_URL:ownerUrl,TENDERMATCH_RESULTS_OWNER_URL:"synthetic"};
 const report=await main([],env);assert.equal(report.state,"PREPARED_NOT_APPLIED");assert.equal(report.connects,false);
 assert.deepEqual(env,{});assert.equal(report.target.expectedCompanies,117);assert.doesNotMatch(JSON.stringify(report),/synthetic-only/);
});
test("every executable action is approval-gated before touching pg or environment credentials",async()=>{
 for(const action of ["source-up","result-create","result-up","provision-source","provision-results","source-down","result-down","validate-source","validate-results"])
  await assert.rejects(()=>main([action],{}),/approval/);
});
test("host database owner TLS and connection option guards reject unsafe targets without leaking URL",()=>{
 assert.equal(guardUrl(ownerUrl,"source").hostname,T.host);
 for(const value of [ownerUrl.replace(T.host,"prod.neon.tech"),ownerUrl.replace(T.host,T.host.replace(".c-5","-pooler.c-5")),ownerUrl.replace(T.sourceDatabase,T.resultDatabase),ownerUrl.replace("neondb_owner:","other:"),ownerUrl.replace("verify-full","require"),ownerUrl+"&options=unsafe",ownerUrl.replace("channel_binding=require","channel_binding=disable")]) {
  assert.throws(()=>guardUrl(value,"source"),e=>!e.message.includes("synthetic-only"));
 }
});
test("execution target attestation requires project branch and direct endpoint together",()=>{
 const env={TENDERMATCH_APPROVED_PROJECT_ID:T.projectId,TENDERMATCH_APPROVED_BRANCH_ID:T.branchId,TENDERMATCH_APPROVED_ENDPOINT:T.host};
 assert.doesNotThrow(()=>executionAuthority(["--execute-approved"],env));
 for(const key of Object.keys(env))assert.throws(()=>executionAuthority(["--execute-approved"],{...env,[key]:"wrong"}));
});
test("population manifest rejects 17-row fallback, same-count ID drift and unknown version",()=>{
 const m={contract_version:T.contractVersion,expected_company_count:117,source_company_count:117,profile_count:117,pinned_id_checksum:"a".repeat(32),source_id_checksum:"a".repeat(32)};
 assert.equal(assertManifest(m),m);
 for(const patch of [{profile_count:17},{source_company_count:118},{source_id_checksum:"b".repeat(32)},{contract_version:"latest"}])assert.throws(()=>assertManifest({...m,...patch}));
});
test("profile and evidence pages use bounded parameterized deterministic keysets",()=>{
 const q=profilePageQuery({after:id(50),limit:50});assert.deepEqual(q.values,[id(50),T.contractVersion,50]);assert.match(q.text,/ORDER BY canonical_entity_id LIMIT \$3/);
 assert.throws(()=>profilePageQuery({limit:1000}));assert.throws(()=>profilePageQuery({after:"'; DROP TABLE"}));
 const e=evidencePageQuery({supplierId:id(1),after:{field:"capacity",claimId:id(2)}});assert.match(e.text,/\(field,claim_id\)>/);assert.deepEqual(e.values,[id(1),"capacity",id(2),100]);
 assert.throws(()=>evidencePageQuery({}));assert.equal(idDigest([id(2),id(1)]),idDigest([id(1),id(2)]));
});
test("denial helper always rolls back even when forbidden command unexpectedly succeeds",async()=>{
 const log=[];await assert.rejects(()=>expectDenied({query:async q=>{log.push(q);return {rows:[]};}},"DELETE X"));assert.deepEqual(log,["BEGIN","DELETE X","ROLLBACK"]);
});
test("migrations are additive, pin versions, use exact artifact links and never select latest",async()=>{
 const s=executableSql(await readSql("010-source-up.sql"));assert.match(s,/entity_type_code='company'/);assert.match(s,/candidate_count=1/);
 for(const pin of T.profilePins){assert.ok(s.includes(pin.batch));assert.ok(s.includes(pin.version));}
 assert.doesNotMatch(s,/ORDER BY.*created_at|LIMIT 1|normalized_profile|raw_payload|raw_content|preservation_note/);
 assert.match(s,/a.id=c.source_artifact_id AND a.batch_id=p.batch_id AND a.entity_id=c.entity_id/);
 assert.doesNotMatch(s,/ALTER .*registry\.|UPDATE registry\.|INSERT INTO registry\.|DROP .*tendermatch_supplier_api\./);
 assert.match(s,/COALESCE\(c.source_assertion_status,c.claim_status,'UNKNOWN'\)/);
});
test("result DB is a separate nontransactional step and base schema is reused without nested commits",async()=>{
 const create=await readSql("020-create-result-database.sql");assert.match(create,/CREATE DATABASE tendermatch_results_dev OWNER neondb_owner;/);assert.doesNotMatch(create,/BEGIN;/);
 const base=await readFile(new URL("../db/migrations/20260905_tendermatch_retrieval.sql",import.meta.url),"utf8");const body=transactionBody(base);assert.doesNotMatch(body,/\bBEGIN;|\bCOMMIT;/);assert.match(body,/vector\(384\)/);
 assert.throws(()=>transactionBody("CREATE TABLE x(id int)"));
});
test("source and result SQL guards independently reject wrong database and missing branch attestation",async()=>{
 for(const name of ["001-source-guard.sql","021-result-guard.sql"]){const s=await readSql(name);assert.match(s,/current_database\(\)/);assert.match(s,/current_user/);assert.match(s,/IS DISTINCT FROM 'br-polished-boat-b1qddx0m'/);}
});
test("rollback scripts are ordered, bounded and non-cascading; no database or extension is dropped",async()=>{
 for(const name of ["019-source-down.sql","039-result-down.sql"]){const s=executableSql(await readSql(name));assert.doesNotMatch(s,/DROP[^;]+CASCADE;|DROP DATABASE [a-z]|DROP EXTENSION [a-z]/);}
 const source=await readFile(new URL("../scripts/tendermatch-dev-setup.mjs",import.meta.url),"utf8");assert.match(source,/Result data exists/);assert.match(source,/NOLOGIN PASSWORD NULL/);assert.match(source,/"wx", 0o600/);assert.match(source,/check-ignore/);assert.doesNotMatch(source,/import[^;]*["']dotenv|console\.log\(.*credential|readFile\(.*\.env/);
});

test("ephemeral SQL: all-company projection, privacy, grants, count/ID drift and rollback",{skip:!process.env.TENDERMATCH_PGLITE_ROOT},async(t)=>{
 const {PGlite}=await import(pathToFileURL(path.join(process.env.TENDERMATCH_PGLITE_ROOT,"@electric-sql/pglite/dist/index.js")).href);
 const db=new PGlite();const client={query:(text,values)=>values?.length?db.query(text,values):db.query(text)};
 try {
  await db.exec(await readFile(new URL("fixtures/tendermatch-dev-registry.sql",import.meta.url),"utf8"));
  await t.test("production target guard refuses the ephemeral postgres database",async()=>{await assert.rejects(async()=>db.exec(await readSql("001-source-guard.sql")),/target guard/);});
  // Bodies tested here; the unmodified production target guards are tested separately above.
  await db.exec(await readSql("010-source-up.sql"));
  await t.test("all 117 retained including missing/ambiguous pins; future profile excluded",async()=>{
   const report=await validateSourceData(client);assert.equal(report.companies,117);assert.equal(report.profilesMissing,1);assert.equal(report.profilesAmbiguous,1);assert.equal(report.classificationMissing,116);assert.equal(report.evidence,10);
   const p=(await db.query("SELECT * FROM tendermatch_all_supplier_api.current_supplier_profiles WHERE canonical_entity_id=$1",[id(1)])).rows[0];assert.equal(p.profile_version,T.profilePins[0].version);assert.equal(p.classification,"GOODS");
  });
  await t.test("allowlisted evidence excludes contact/raw/nested private content, retains Missing and source classes",async()=>{
   const rows=(await db.query("SELECT * FROM tendermatch_all_supplier_api.current_supplier_evidence ORDER BY field,claim_id")).rows;
   assert.doesNotMatch(JSON.stringify(rows),/DO_NOT_EXPOSE|contact_email|private_notes/);
   assert.equal(rows.find(r=>r.field==="capacity").value_class,"MISSING");assert.equal(rows.find(r=>r.field==="geographic_markets").status,"INFERRED");assert.equal(rows.find(r=>r.field==="product_families").artifact_available,true);
   for(const field of ["manufacturing_capabilities_capacity","products_portfolio","turnover_scale","export_markets","materials_specs"]){const r=rows.find(r=>r.source_field===field);assert.equal(r.field,field);assert.equal(r.formula_role,"SUPPORTING_ONLY");}
  });
  await t.test("wrong-entity artifact links never become verified availability",async()=>{
   await db.exec(`UPDATE registry.source_artifacts SET entity_id='${id(2)}'`);
   assert.equal((await db.query("SELECT artifact_available FROM tendermatch_all_supplier_api.current_supplier_evidence WHERE field='product_families'")).rows[0].artifact_available,false);
   await db.exec(`UPDATE registry.source_artifacts SET entity_id='${id(1)}'`);
  });
  await t.test("reader inherits exact safe view SELECT and cannot access private helper/base data",async()=>{
   await db.exec(`CREATE ROLE ${T.consumerLogin} LOGIN INHERIT CONNECTION LIMIT 3; GRANT ${T.readerRole} TO ${T.consumerLogin}; SET ROLE ${T.consumerLogin};`);
   assert.equal((await validateSourceData(client)).companies,117);
   assert.equal((await validateLogin(client,"source")).negativePrivileges,"passed");
   await expectDenied(client,"SELECT * FROM registry.entities");await expectDenied(client,"SELECT * FROM tendermatch_all_supplier_api.approved_company_ids_v1");
   await expectDenied(client,"CREATE ROLE tendermatch_forbidden_role_probe NOLOGIN");
   await db.exec("RESET ROLE");
  });
  await t.test("same count but replaced canonical ID triggers manifest failure",async()=>{
   await db.exec(`UPDATE registry.entities SET id='${id(118)}' WHERE id='${id(117)}'`);await assert.rejects(()=>validateSourceData(client),/drift/);
   await db.exec(`UPDATE registry.entities SET id='${id(117)}' WHERE id='${id(118)}'`);
  });
  await t.test("source rollback leaves all companies and original 17-profile API intact",async()=>{
   await db.exec(`REVOKE ${T.readerRole} FROM ${T.consumerLogin}; DROP ROLE ${T.consumerLogin};`);
   await db.exec(await readSql("019-source-down.sql"));
   assert.equal((await db.query("SELECT count(*)::int n FROM registry.entities WHERE entity_type_code='company'")).rows[0].n,117);
   assert.equal((await db.query("SELECT count(*)::int n FROM tendermatch_supplier_api.current_supplier_profiles")).rows[0].n,17);
  });
 } finally {await db.close();}
});

test("ephemeral SQL: result schema, all-pair missingness, immutable audit, RLS and rollback",{skip:!process.env.TENDERMATCH_PGLITE_ROOT},async(t)=>{
 const modules=process.env.TENDERMATCH_PGLITE_ROOT;
 const {PGlite}=await import(pathToFileURL(path.join(modules,"@electric-sql/pglite/dist/index.js")).href);
 const {vector}=await import(pathToFileURL(path.join(modules,"@electric-sql/pglite-pgvector/dist/index.js")).href);
 const db=new PGlite({extensions:{vector}});
 try {
  await db.exec("CREATE DATABASE tendermatch_results_dev");
  await db.exec(await readFile(new URL("../db/migrations/20260905_tendermatch_retrieval.sql",import.meta.url),"utf8"));
  await db.exec(await readSql("030-result-up.sql"));
  await db.exec(`INSERT INTO tendermatch_retrieval.evaluation_run(tenant_id,run_id,formula_version,feature_version,input_identity,evaluated_at) VALUES('test','run','formula/1.1','features/1','input',now());
  INSERT INTO tendermatch_retrieval.universe_snapshot VALUES('test','run','all/1','supplier/1','tender/1',117,17322,repeat('a',64),repeat('b',64),now());`);
  const unscored="INSERT INTO tendermatch_retrieval.universe_pair VALUES('test','run','supplier','tender','NEEDS_EVIDENCE',ARRAY['CLASSIFICATION_MISSING'],'NOT_SCORED',NULL,NULL)";
  await t.test("considered-pair count uses full Cartesian cardinality and unassessed remains NULL",async()=>{
   assert.equal(Number((await db.query("SELECT considered_pairs FROM tendermatch_retrieval.universe_snapshot")).rows[0].considered_pairs),2026674);
   await db.exec(unscored);assert.equal((await db.query("SELECT pair_score FROM tendermatch_retrieval.universe_pair")).rows[0].pair_score,null);
   await assert.rejects(()=>db.exec(unscored.replace("'tender'","'tender-2'").replace("NULL,NULL)","NULL,0)")),/check constraint/);
  });
  await t.test("out-of-scope cannot be scored and immutable universe cannot be overwritten",async()=>{
   await assert.rejects(()=>db.exec("UPDATE tendermatch_retrieval.universe_pair SET reason_codes=ARRAY['changed']"),/Immutable/);
   await assert.rejects(()=>db.exec("INSERT INTO tendermatch_retrieval.universe_pair VALUES('test','run','s','t','OUTSIDE_SCORING_SCOPE',ARRAY['SCOPE'],'SCORED','x',0)"));
  });
  await t.test("criterion NULL-vs-zero arithmetic and complete five-component score reconciliation",async()=>{
   await db.exec(`INSERT INTO tendermatch_retrieval.pair_score VALUES('test','score','s0','t0',0,100,0,0,0,'s1','t1','sh','th','formula/1.1','policy/1','features/1','ev','Missing','ELIGIBLE',ARRAY['ELIGIBLE'],now());`);
   await assert.rejects(()=>db.exec("INSERT INTO tendermatch_retrieval.criterion_audit VALUES('test','score','bad',20,NULL,0,ARRAY[]::text[],ARRAY['MISSING'],'MISSING','{}')"),/check constraint/);
   await assert.rejects(()=>db.exec("INSERT INTO tendermatch_retrieval.universe_pair VALUES('test','run','s0','t0','ELIGIBLE',ARRAY['ELIGIBLE'],'SCORED','score',0)"),/five reconciled/);
   await db.exec("INSERT INTO tendermatch_retrieval.criterion_audit SELECT 'test','score','criterion-'||i,20,NULL,NULL,ARRAY[]::text[],ARRAY['MISSING'],'MISSING','{}' FROM generate_series(1,5) i");
   await db.exec("INSERT INTO tendermatch_retrieval.universe_pair VALUES('test','run','s0','t0','ELIGIBLE',ARRAY['ELIGIBLE'],'SCORED','score',0)");
   assert.equal((await db.query("SELECT pair_score FROM tendermatch_retrieval.universe_pair WHERE supplier_id='s0'")).rows[0].pair_score,0);
   await assert.rejects(()=>db.exec("INSERT INTO tendermatch_retrieval.criterion_audit VALUES('test','score','sixth',20,NULL,NULL,ARRAY[]::text[],ARRAY['MISSING'],'MISSING','{}')"),/exceeds Formula/);
  });
  await t.test("writer has bounded writes, RLS and no score edits, deletes, DDL or model registration",async()=>{
   await db.exec(`CREATE ROLE ${T.writerLogin} LOGIN INHERIT CONNECTION LIMIT 3; GRANT ${T.writerRole} TO ${T.writerLogin}; SET ROLE ${T.writerLogin}`);
   const client={query:(q,v)=>db.query(q,v)};
   await validateLogin(client,"results");
   assert.equal((await db.query("SELECT * FROM tendermatch_retrieval.universe_pair")).rows.length,0);
   await db.exec("RESET ROLE");
  });
  await t.test("rollback SQL drops only prepared schema; source/extension/database are not cascaded",async()=>{
   await db.exec(`REVOKE ${T.writerRole} FROM ${T.writerLogin}; DROP ROLE ${T.writerLogin}`);
   // Here the disposable fixture is intentionally discarded. The real runner
   // forbids this operation when business rows exist.
   await db.exec(await readSql("039-result-down.sql"));
   assert.equal((await db.query("SELECT count(*)::int n FROM pg_namespace WHERE nspname='tendermatch_retrieval'")).rows[0].n,0);
   assert.equal((await db.query("SELECT count(*)::int n FROM pg_extension WHERE extname='vector'")).rows[0].n,1);
  });
 } finally {await db.close();}
});

import assert from 'node:assert/strict';
import test from 'node:test';
import {readFile} from 'node:fs/promises';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {VERSION,TENANT,TENDER,SOURCES,LIMITS,TENDER_PAGE,canonical,sha,guardTenderUrl,traverse,supplierMembers,tenderMember,assemble,validateCapture,register,readback} from '../scripts/lib/tendermatch-input-manifest.mjs';
import {DEV_TARGET as T} from '../scripts/lib/tendermatch-dev-contract.mjs';
import {authority,main} from '../scripts/tendermatch-input-manifest.mjs';

const id=n=>`00000000-0000-0000-0000-${String(n).padStart(12,'0')}`;
const date='2026-09-06T12:00:00.000Z';
const now=Date.parse(date);
const tender=(n=1)=>({id:id(n),version:1,source_content_hash:'source hash',source_id:id(80),feed_id:id(81),country_id:null,procurement_type:'OTHER',status:'OPEN',deleted:false,deadline:null,updated_at:'2026-09-01T10:00:00.000000',content_sha256:'a'.repeat(64)});
const profile=()=>({canonical_entity_id:id(1),contract_version:T.contractVersion,entity_type_code:'company',profile_state:'PINNED',profile_candidate_count:1,profile_version_id:id(20),profile_version:T.profilePins[0].version,batch_id:id(21),batch_code:T.profilePins[0].batch,evidence_count:1,classification:null,classification_value_class:'MISSING',classification_claim_ids:[]});
const evidence=()=>({canonical_entity_id:id(1),contract_version:T.contractVersion,profile_version_id:id(20),profile_version:T.profilePins[0].version,batch_id:id(21),batch_code:T.profilePins[0].batch,claim_id:id(30),source_record_id:id(31),status:'UNKNOWN',value_class:'MISSING',artifact_available:false,artifact_limitation:'NO_EXACT_ARTIFACT_LINK',field:'capacity',display_value:null});
function capture() {
  const observation=kind=>({database:SOURCES[kind].database,role:SOURCES[kind].role,started_at:date,finished_at:date,read_only:'on',isolation:'repeatable read',snapshot:'1:2:',timezone:'UTC'});
  return assemble({members:supplierMembers([profile()],[evidence()]),observation:observation('supplier'),inventory:{count:1}}, {members:[tenderMember(tender())],observation:observation('tender'),inventory:{count:1}});
}
function rehash(c){c.manifestId=sha(c.identity);c.captureId=sha({manifestId:c.manifestId,observations:c.observations});return c;}
test('Stage 1 defaults disconnected, never initializes scoring, and removes temporary owner',async()=>{
 const env={TENDERMATCH_RESULTS_OWNER_URL:'private-canary'};const p=await main([],env);assert.equal(p.connects,false);assert.equal(p.scoring,'NOT RUN');assert.deepEqual(env,{});
 for(const action of ['capture','register','migrate'])await assert.rejects(()=>main([action],{}),/approval/);
});
test('fresh Console authorization binds both independent projects and branches',()=>{
 const env={TENDERMATCH_APPROVED_PROJECT_ID:T.projectId,TENDERMATCH_APPROVED_BRANCH_ID:T.branchId,TENDERMATCH_APPROVED_ENDPOINT:T.host,TENDERMATCH_TENDER_PROJECT_ID:TENDER.projectId,TENDERMATCH_TENDER_BRANCH_ID:TENDER.branchId,TENDERMATCH_TENDER_ENDPOINT:TENDER.host,TENDERMATCH_CONSOLE_VERIFIED_AT:date};
 authority(['--execute-approved'],env,now);
 for(const key of Object.keys(env))assert.throws(()=>authority(['--execute-approved'],{...env,[key]:'wrong'},now));
 assert.throws(()=>authority(['--execute-approved'],env,now+86400001));
});
test('exact tender guard privately upgrades TLS and rejects wrong role/host/database/options',()=>{
 const u=`postgresql://th_qa_readonly:synthetic-only@${TENDER.host}/neondb?sslmode=require`;
 assert.equal(guardTenderUrl(u).searchParams.get('sslmode'),'verify-full');
 for(const v of [u.replace('th_qa_readonly','th_app'),u.replace('/neondb','/other'),u.replace(TENDER.host,'ep-aged-feather-atm85iwd.evil.neon.tech'),u+'&options=x',u+'&channel_binding=disable'])assert.throws(()=>guardTenderUrl(v),e=>!e.message.includes('synthetic-only'));
});
test('canonical hash is insensitive to object key order, not value/missingness/version',()=>{
 assert.equal(sha({b:2,a:1}),sha({a:1,b:2}));assert.notEqual(sha({value:null}),sha({value:0}));assert.throws(()=>canonical(undefined));
 assert.notEqual(sha(tender()),sha({...tender(),version:2}));
});
test('bounded keyset visits all IDs once, with exact page-size boundaries and zero population',async()=>{
 const rows=Array.from({length:10},(_,i)=>({id:id(i+1)}));let calls=0;
 const r=await traverse(async(after,n)=>{calls++;return rows.filter(r=>!after||r.id>after).slice(0,n);},10,{pageSize:5});
 assert.equal(r.rows.length,10);assert.equal(calls,3);
 assert.equal((await traverse(async()=>[],0)).rows.length,0);
});
test('truncated/duplicate/unordered/excessive pages fail closed',async()=>{
 await assert.rejects(()=>traverse(async()=>[{id:id(1)}],2),/Incomplete/);
 await assert.rejects(()=>traverse(async()=>[{id:id(2)},{id:id(1)}],2),/unordered/);
 await assert.rejects(()=>traverse(async()=>[{id:id(1)},{id:id(1)}],2),/Duplicate/);
 await assert.rejects(()=>traverse(async()=>[{id:id(1)},{id:id(2)}],1),/drift/);
 await assert.rejects(()=>traverse(async()=>[],1,{pageSize:1001}),/bounded/);
});
test('all-company missing classification and evidence are retained; no fabricated zero or decision',()=>{
 const [m]=supplierMembers([profile()],[evidence()]);assert.equal(m.provenance.classification,null);assert.equal(m.provenance.classification_value_class,'MISSING');
 assert.equal(m.provenance.evidence_count,1);assert.doesNotMatch(JSON.stringify(m),/display_value|score|eligib|readiness|decision/);
 const missing={...profile(),profile_state:'MISSING',profile_version_id:null,profile_version:null,batch_id:null,batch_code:null,evidence_count:0};
 assert.equal(supplierMembers([missing],[])[0].provenance.profile_state,'MISSING');
});
test('claim duplicates, orphans, wrong batch/profile/version and false artifact availability are blocked',()=>{
 for(const patch of [{canonical_entity_id:id(2)},{profile_version_id:id(99)},{profile_version:'future'},{batch_id:id(99)},{contract_version:'future'},{artifact_available:true},{source_record_id:null}])assert.throws(()=>supplierMembers([profile()],[{...evidence(),...patch}]));
 assert.throws(()=>supplierMembers([{...profile(),evidence_count:2}],[evidence(),evidence()]),/Duplicate/);
 assert.throws(()=>supplierMembers([{...profile(),classification_claim_ids:[id(99)]}],[evidence()]),/orphan/);
});
test('tender membership retains past deadline, other scope, missing country/deadline, rejects closed/deleted/invalid version',()=>{
 const m=tenderMember(tender());assert.equal(m.provenance.country_id,null);assert.equal(m.provenance.procurement_type,'OTHER');
 assert.equal(tenderMember({...tender(),deadline:'2000-01-01T00:00:00.000000'}).provenance.status,'OPEN');
 for(const patch of [{status:'CLOSED'},{deleted:true},{version:0},{version:null},{source_id:null},{title:'not persisted'}])assert.throws(()=>tenderMember({...tender(),...patch}));
 assert.match(TENDER_PAGE,/status = 'OPEN' AND "deletedAt" IS NULL/);assert.doesNotMatch(TENDER_PAGE,/deadlineAt"\s*[<>]|procurementType"\s+IN/);
});
test('unchanged inputs reuse manifest independently of observation clock; content/version changes create another',()=>{
 const a=capture(),b=capture();b.observations.supplier.started_at='2026-09-06T12:00:01Z';rehash(b);
 assert.equal(a.manifestId,b.manifestId);assert.notEqual(a.captureId,b.captureId);
 const c=assemble({members:a.members.filter(r=>r.kind==='supplier'),inventory:{},observation:a.observations.supplier},{members:[tenderMember({...tender(),version:2})],inventory:{},observation:a.observations.tender});assert.notEqual(a.manifestId,c.manifestId);
});
test('capture seals input hashes, explicit source identity and per-source clock limits',()=>{
 validateCapture(capture(),now);
 const altered=capture();altered.members.pop();assert.throws(()=>validateCapture(altered,now),/Incomplete/);
 const wrong=capture();wrong.identity.sources={...SOURCES,tender:{...SOURCES.tender,branchId:'wrong'}};rehash(wrong);assert.throws(()=>validateCapture(wrong,now),/source/);
 assert.throws(()=>validateCapture(capture(),now+LIMITS.registrationAgeMs+1),/Stale/);
 const long=capture();long.observations.supplier.started_at=new Date(now-LIMITS.sourceDurationMs-1).toISOString();rehash(long);assert.throws(()=>validateCapture(long,now),/Stale/);
 const skew=capture();skew.observations.supplier.started_at=skew.observations.supplier.finished_at=new Date(now-LIMITS.sourceSkewMs-1).toISOString();rehash(skew);assert.throws(()=>validateCapture(skew,now),/skew/);
});
test('additive migration uses bounded guard, transaction seal, deferred completeness, RLS and no source writes',async()=>{
 const sql=await readFile(new URL('../db/tendermatch-dev/040-input-manifest-up.sql',import.meta.url),'utf8');
 for(const term of ['current_database()','current_user','br-polished-boat-b1qddx0m','creation_xid','DEFERRABLE INITIALLY DEFERRED','ENABLE ROW LEVEL SECURITY','GRANT SELECT,INSERT'])assert.ok(sql.includes(term));
 assert.doesNotMatch(sql,/INSERT INTO registry\.|ALTER ROLE|CREATE DATABASE|CREATE ROLE|CASCADE/);
});
test('ephemeral SQL validates manifest persistence, sealing, idempotency, RLS, grants and incomplete rollback',{skip:!process.env.TENDERMATCH_PGLITE_ROOT},async(t)=>{
 const {PGlite}=await import(pathToFileURL(path.join(process.env.TENDERMATCH_PGLITE_ROOT,'@electric-sql/pglite/dist/index.js')).href);
 const db=new PGlite();const client={query:(q,v)=>db.query(q,v)};
 try {
  await db.exec(`CREATE SCHEMA tendermatch_retrieval; CREATE ROLE tendermatch_result_writer NOLOGIN; GRANT USAGE ON SCHEMA tendermatch_retrieval TO tendermatch_result_writer;
  CREATE TABLE tendermatch_retrieval.schema_migration(version text primary key); INSERT INTO tendermatch_retrieval.schema_migration VALUES('20260905-retrieval-v1'),('20260906-all-to-all-dev-v1');
  CREATE FUNCTION tendermatch_retrieval.reject_immutable_change() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'Immutable'; END $$;`);
  const sql=await readFile(new URL('../db/tendermatch-dev/040-input-manifest-up.sql',import.meta.url),'utf8');
  await t.test('unmodified production guard rejects ephemeral database',async()=>{await assert.rejects(()=>db.exec(sql),/target mismatch/);});
  // Test SQL body without altering shipped guard; PGlite cannot be this Neon database.
  await db.exec(sql.slice(sql.indexOf('CREATE TABLE')));
  await db.exec(`SET ROLE tendermatch_result_writer`);
  const c=capture();
  await t.test('one complete manifest persists exactly two members and reuses unchanged inputs',async()=>{
   const first=await register(client,c,{now});assert.equal(first.insertedMembers,2);
   const second=await register(client,c,{now});assert.equal(second.insertedManifest,0);assert.equal(second.insertedMembers,0);assert.equal(second.insertedCapture,0);
  });
  await t.test('readback is explicit-ID only, and another tenant cannot see membership',async()=>{
   await db.query("SELECT set_config('tendermatch.tenant_id',$1,false)",[TENANT]);await readback(client,c);
   await assert.rejects(()=>readback(client,{...c,manifestId:'b'.repeat(64)}),/readback/);
   await db.query("SELECT set_config('tendermatch.tenant_id','other',false)");assert.equal((await db.query('SELECT * FROM tendermatch_retrieval.input_member')).rows.length,0);
   await assert.rejects(()=>db.query("INSERT INTO tendermatch_retrieval.input_capture VALUES($1,$2,$3,'{}',now())",[TENANT,'b'.repeat(64),c.manifestId]),/row-level security/);
  });
  await t.test('writer cannot update/delete/truncate or append members to committed manifest',async()=>{
   for(const q of ['UPDATE tendermatch_retrieval.input_manifest SET identity=\'{}\'','DELETE FROM tendermatch_retrieval.input_member','TRUNCATE tendermatch_retrieval.input_capture'])await assert.rejects(()=>db.query(q),/permission denied/);
   await db.query("SELECT set_config('tendermatch.tenant_id',$1,false)",[TENANT]);
   await assert.rejects(()=>db.query("INSERT INTO tendermatch_retrieval.input_member VALUES($1,$2,'tender',$3,'{}')",[TENANT,c.manifestId,id(9)]),/sealed/);
  });
  await t.test('incomplete transaction fails at COMMIT and leaves no header or members',async()=>{
   await db.exec('BEGIN');await db.query("INSERT INTO tendermatch_retrieval.input_manifest(tenant_id,manifest_id,contract_version,identity,supplier_count,tender_count) VALUES($1,$2,$3,'{}',1,1)",[TENANT,'d'.repeat(64),VERSION]);
   await assert.rejects(()=>db.exec('COMMIT'),/Incomplete/);await db.exec('ROLLBACK');
   assert.equal((await db.query('SELECT count(*)::int count FROM tendermatch_retrieval.input_manifest')).rows[0].count,1);
  });
  await t.test('owner cannot rewrite historical content; original capture still reads back',async()=>{
   await db.exec('RESET ROLE');await assert.rejects(()=>db.query("UPDATE tendermatch_retrieval.input_member SET provenance='{}'"),/Immutable/);await readback(client,c);
  });
 } finally {await db.close();}
});

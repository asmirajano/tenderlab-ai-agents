import fs from 'node:fs';
import path from 'node:path';
import {createHash, randomBytes, createCipheriv} from 'node:crypto';
import {pipeline} from 'node:stream/promises';
import {Transform} from 'node:stream';
import {createGzip} from 'node:zlib';
import {createRequire} from 'node:module';
import {execFileSync} from 'node:child_process';
import {ownerConnection, TARGET, neonApi} from './lib/tendermatch-stage8-operator.mjs';
import {developmentPin} from './tendermatch-stage8.mjs';
import {bindPin, HEADER_SQL, pinFromHeader} from './lib/tendermatch-stage8-store.mjs';
import {PRODUCTION, BASE_SCHEMA, ident, sealedSelections, selectRows,validateColumns} from './lib/tendermatch-production-contract.mjs';
import {productionVault, secureDirectory, saveProductionSecret} from './lib/tendermatch-production-vault.mjs';
const require = createRequire(new URL('./production-promotion-tools/package.json', import.meta.url));
const {to:copyTo} = require('pg-copy-streams');

const stamp = new Date().toISOString().replace(/[:.]/g, '-');
const directory = path.join(productionVault, 'checkpoint-' + stamp);
await secureDirectory(directory);
const pin = bindPin(await developmentPin());
const selections = sealedSelections(pin);
const key = randomBytes(32);
const keyName = 'checkpoint-' + stamp.toLowerCase();
await saveProductionSecret(keyName, {key:key.toString('hex'), directory});
const checkpoint = {version:1, state:'CAPTURING', capturedAt:new Date().toISOString(), source:TARGET, destination:PRODUCTION,
  sourceCommit:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(), pin, keyName, tables:[],
  rollback:{applicationCommit:'8ac562342afcaf62c13f73037b693f253a3edbe0',gatewayRevision:'tenderappsaccess-00004-yan',
    liveBackendSwitched:false,developmentFallbackAllowed:false,keepExistingSnapshot:true}};
const report = path.join(directory, 'checkpoint.json');
const persist = () => fs.writeFileSync(report, JSON.stringify(checkpoint,null,2)+'\n');
persist();
let c;
try {
  const {databases} = await neonApi(`/projects/${PRODUCTION.project}/branches/${PRODUCTION.branch}/databases`);
  if (databases.some(d=>d.name===PRODUCTION.database)) throw Error('Production destination already exists; reconcile first');
  checkpoint.productionBefore = databases.map(d=>({name:d.name,owner:d.owner_name}));
  c = await ownerConnection();
  c.connectionParameters.query_timeout = 0;
  await c.query('BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY');
  await c.query("SET LOCAL statement_timeout='15min'; SET LOCAL idle_in_transaction_session_timeout='10min'; SET LOCAL TimeZone='UTC'; SET LOCAL DateStyle='ISO, YMD'; SET LOCAL extra_float_digits=3");
  await c.query("SELECT set_config('tendermatch.tenant_id',$1,true)",[pin.tenantId]);
  checkpoint.databaseVersion = (await c.query('SHOW server_version_num')).rows[0].server_version_num;
  checkpoint.snapshot = (await c.query('SELECT pg_current_snapshot()::text snapshot')).rows[0].snapshot;
  const exportedSnapshot = (await c.query('SELECT pg_export_snapshot() snapshot')).rows[0].snapshot;
  const header = (await c.query(HEADER_SQL,[pin.tenantId,pin.planId])).rows[0];
  if (!header || bindPin(pinFromHeader(pin.tenantId,header)).bindingId !== pin.bindingId || header.universeCount!==2027961 || header.candidateCount!==707660 || header.storedAutomaticRequests!==500) throw Error('Sealed header mismatch');
  checkpoint.header = header;
  checkpoint.sourceRoleState = (await c.query("SELECT rolname,rolsuper,rolcreatedb,rolcreaterole,rolcanlogin,rolreplication,rolbypassrls,rolconnlimit,rolconfig FROM pg_roles WHERE rolname LIKE 'tendermatch%' ORDER BY rolname")).rows;
  for (const table of Object.keys(selections).sort()) {
    const reg = BASE_SCHEMA+'.'+table;
    const columns = (await c.query("SELECT a.attname name,format_type(a.atttypid,a.atttypmod) type,a.attnotnull not_null,a.attidentity identity,a.attgenerated generated,pg_get_expr(d.adbin,d.adrelid) default_expression FROM pg_attribute a LEFT JOIN pg_attrdef d ON d.adrelid=a.attrelid AND d.adnum=a.attnum WHERE a.attrelid=$1::regclass AND a.attnum>0 AND NOT a.attisdropped ORDER BY a.attnum",[reg])).rows;
    validateColumns(table,columns);
    const constraints = (await c.query("SELECT conname name,contype type,pg_get_constraintdef(oid) definition,CASE WHEN confrelid<>0 THEN confrelid::regclass::text ELSE null END referenced_table FROM pg_constraint WHERE conrelid=$1::regclass ORDER BY conname",[reg])).rows;
    const primaryKey = (await c.query("SELECT a.attname FROM pg_index i CROSS JOIN LATERAL unnest(i.indkey) WITH ORDINALITY k(num,ord) JOIN pg_attribute a ON a.attrelid=i.indrelid AND a.attnum=k.num WHERE i.indrelid=$1::regclass AND i.indisprimary ORDER BY k.ord",[reg])).rows.map(x=>x.attname);
    if (!primaryKey.length) throw Error('Stable primary-key order required');
    for (const foreign of constraints.filter(x=>x.type==='f')) if (!selections[foreign.referenced_table?.replace(BASE_SCHEMA+'.','')]) throw Error('Unselected foreign-key parent: '+table+' -> '+foreign.referenced_table);
    const indexes = (await c.query("SELECT pg_get_indexdef(i.indexrelid) definition FROM pg_index i WHERE i.indrelid=$1::regclass AND NOT EXISTS (SELECT 1 FROM pg_constraint c WHERE c.conindid=i.indexrelid) ORDER BY i.indexrelid::regclass::text",[reg])).rows.map(x=>x.definition);
    const sql = selectRows(table,columns.map(x=>x.name),primaryKey,selections[table]);
    const count = Number((await c.query(`SELECT count(*)::text n FROM ${BASE_SCHEMA}.${ident(table)} r WHERE ${selections[table]}`)).rows[0].n);
    const hash = createHash('sha256'); let bytes = 0;
    const meter = new Transform({transform(chunk,encoding,callback){hash.update(chunk);bytes+=chunk.length;callback(null,chunk);}});
    const nonce = randomBytes(12), cipher=createCipheriv('aes-256-gcm',key,nonce);
    const file = table+'.copy.gz.aes';
    // A fresh COPY connection avoids pg-copy-streams/TLS reuse stalls. Every
    // reader imports the same immutable read-only snapshot held above.
    const reader = await ownerConnection();
    reader.connectionParameters.query_timeout = 0;
    try {
      await reader.query('BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY');
      if (!/^[0-9A-F-]+$/.test(exportedSnapshot)) throw Error('Unexpected snapshot token');
      await reader.query(`SET TRANSACTION SNAPSHOT '${exportedSnapshot}'`);
      await reader.query("SET LOCAL statement_timeout='15min'; SET LOCAL TimeZone='UTC'");
      await reader.query("SELECT set_config('tendermatch.tenant_id',$1,true)",[pin.tenantId]);
      let reported = Date.now();
      meter.on('data',()=>{if(Date.now()-reported>30000){console.log(JSON.stringify({copying:table,bytes}));reported=Date.now();}});
      await pipeline(reader.query(copyTo(`COPY (${sql}) TO STDOUT WITH (FORMAT binary)`)),meter,createGzip(),cipher,fs.createWriteStream(path.join(directory,file),{flags:'wx'}));
      await reader.query('ROLLBACK');
    } finally {await reader.end().catch(()=>{});}
    checkpoint.tables.push({name:table,columns,primaryKey,constraints,indexes,predicate:selections[table],count,bytes,
      sha256:hash.digest('hex'),file,nonce:nonce.toString('hex'),tag:cipher.getAuthTag().toString('hex')});
    persist(); console.log(JSON.stringify({checkpoint:table,rows:count,bytes,complete:checkpoint.tables.length,total:Object.keys(selections).length}));
  }
  await c.query('ROLLBACK');
  checkpoint.schemaHash = createHash('sha256').update(JSON.stringify(checkpoint.tables.map(({name,columns,primaryKey,constraints,indexes})=>({name,columns,primaryKey,constraints,indexes})))).digest('hex');
  checkpoint.datasetHash = createHash('sha256').update(JSON.stringify(checkpoint.tables.map(({name,count,sha256})=>({name,count,sha256})))).digest('hex');
  checkpoint.state='SEALED';checkpoint.sealedAt=new Date().toISOString();persist();
  console.log(JSON.stringify({state:checkpoint.state,checkpoint:report,datasetHash:checkpoint.datasetHash,schemaHash:checkpoint.schemaHash,productionMutations:0}));
} catch(e) {
  checkpoint.state='FAILED';checkpoint.failureCode=e.code??'CHECKPOINT_VALIDATION';persist();
  console.error('Checkpoint stopped:',e.code??e.message);process.exitCode=1;
} finally {key.fill(0);if(c){await c.query('ROLLBACK').catch(()=>{});await c.end().catch(()=>{});}}

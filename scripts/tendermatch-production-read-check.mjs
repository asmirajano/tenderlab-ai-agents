/** Read-only functional canary against the dedicated production DB, not a live deployment. */
import assert from 'node:assert/strict';
import pg from 'pg';
import {writeFile} from 'node:fs/promises';
import {loadProductionSecret} from './lib/tendermatch-production-vault.mjs';
import {PRODUCTION as P,API_SCHEMA as A,guardedProductionReadUrl} from './lib/tendermatch-production-contract.mjs';
import {developmentPin} from './tendermatch-stage8.mjs';
import {createStage8Store,bindPin} from './lib/tendermatch-stage8-store.mjs';
import {createCursorCodec} from '../packages/tendermatch/src/service-stage8.ts';
import {mappedReadQuery} from '../functions/tendermatch-stage8/database.mjs';
const v=await loadProductionSecret('runtime-readonly-v1');
assert.equal(v.projectId,P.project);assert.equal(v.branchId,P.branch);assert.equal(v.database,P.database);
assert.equal(v.variable,'TENDERMATCH_PRODUCTION_READ_URL');
const u=new URL(guardedProductionReadUrl(v.readUrl));
assert.equal(u.hostname,P.host);assert.equal(u.pathname,'/'+P.database);assert.equal(u.username,P.loginRole);
assert.equal(u.searchParams.get('sslmode'),'verify-full');assert.equal(u.searchParams.get('channel_binding'),'require');
assert.ok(u.password);assert.ok([...u.searchParams.keys()].every(k=>['sslmode','channel_binding'].includes(k)));
const pool=new pg.Pool({connectionString:u.href,max:2,enableChannelBinding:true,connectionTimeoutMillis:10000,query_timeout:6500});pool.on('error',()=>{});
const connect=async()=>{const c=await pool.connect();return {query:async(text,values)=>{const q=mappedReadQuery(text,values);return c.query(q.text,q.values);},end:async()=>c.release(true)};};
const pin=await developmentPin(),binding=bindPin(pin).bindingId;
assert.equal(binding,P.bindingId);
const store=createStage8Store({connect,pins:[pin],cursors:createCursorCodec(Buffer.from(v.cursorKey,'hex'))});
const principal={tenantId:pin.tenantId};
const proof={target:P,bindingId:binding,observedAt:new Date().toISOString(),checks:[],measurements:[],liveBackendSwitched:false};
const check=(name,value)=>{assert.ok(value,name);proof.checks.push(name);};
const measured=async(name,fn)=>{const start=performance.now(),r=await fn();proof.measurements.push({name,ms:Math.round(performance.now()-start)});return r;};
let client;
try{
  const health=await measured('read-role health',()=>store.health(principal,binding));
  assert.deepEqual(health.context.population,{universe:2027961,candidates:707660,unscored:1320301,shortlist:28034});
  proof.population=health.context.population;
  client=await pool.connect();await client.query("SELECT set_config('tendermatch.tenant_id',$1,false)",[pin.tenantId]);
  const members=(await client.query(`SELECT kind,count(*)::int n FROM ${A}.ranking_member GROUP BY kind`)).rows;
  check('117 suppliers / 17333 tenders',members.find(x=>x.kind==='supplier').n===117&&members.find(x=>x.kind==='tender').n===17333);
  const selected=(await client.query(`SELECT supplier_id::text,tender_id::text FROM ${A}.escalation_decision ORDER BY supplier_id,tender_id LIMIT 1`)).rows[0];
  for(const direction of ['supplier','tender']){
    const request={direction,focusId:selected[direction+'_id'],limit:100};
    const first=await measured(direction+' first page',()=>store.page(principal,binding,request));
    check(direction+' bounded first page',first.results.length>0&&first.results.length<=100);
    if(first.nextCursor){
      const next=await measured(direction+' second page',()=>store.page(principal,binding,{...request,cursor:first.nextCursor}));
      check(direction+' stable cursor without duplicates',!next.results.some(p=>first.results.some(q=>p.supplierId===q.supplierId&&p.tenderId===q.tenderId)));
    }
  }
  const detail=await measured('scored detail',()=>store.detail(principal,binding,selected.supplier_id,selected.tender_id));
  check('scored dimensions remain distinct',detail.pair.formula.state==='SCORED'&&detail.pair.formula.denominator===100&&detail.pair.retrieval.semanticSimilarity===null&&detail.pair.humanDisposition.value===null);
  const outside=(await client.query(`SELECT s.entity_id::text supplier_id,t.entity_id::text tender_id FROM ${A}.eligibility_pair p JOIN ${A}.eligibility_member s ON s.kind='supplier' AND s.input_key=p.supplier_key JOIN ${A}.eligibility_member t ON t.kind='tender' AND t.input_key=p.tender_key WHERE p.state=0 LIMIT 1`)).rows[0];
  const outsideDetail=await measured('unscored detail',()=>store.detail(principal,binding,outside.supplier_id,outside.tender_id));
  check('unscored remains null, not zero',outsideDetail.pair.formula.pairScore===null&&outsideDetail.pair.eligibility.state==='OUTSIDE_FORMULA_V1_1_SCOPE');
  proof.state='PRODUCTION_DATABASE_CANARY_PASSED_NOT_DEPLOYED';
  await writeFile('docs/evidence/tendermatch-production-read-canary.json',JSON.stringify(proof,null,2)+'\n');
  console.log(JSON.stringify(proof));
}catch(e){console.error(JSON.stringify({state:'CANARY_FAILED',code:e.code??'CANARY_GATE',reason:e instanceof assert.AssertionError?e.message:'Production read canary failed; no secret output'}));process.exitCode=1;}
finally{if(client)client.release(true);await pool.end();}

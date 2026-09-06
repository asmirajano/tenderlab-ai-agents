import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,readFile,writeFile,stat} from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {sha} from '../scripts/lib/tendermatch-input-manifest.mjs';
import {createFileSource,manifestCapture,BOUNDS} from '../scripts/lib/tendermatch-stage10-source.mjs';
import {currentVersions,planDelta,affectedPages} from '../scripts/lib/tendermatch-stage10-plan.mjs';
import {IncrementalStore} from '../scripts/lib/tendermatch-stage10-store.mjs';
import {executeIncremental} from '../scripts/lib/tendermatch-stage10.mjs';
import {main} from '../scripts/tendermatch-stage10.mjs';
import {supplier,tender,id,TENANT,memorySource,manifestSet,publishFiles} from './fixtures/tendermatch-stage10.mjs';
import {simulatePolicy,POLICIES} from '../packages/tendermatch/src/shortlist-stage6.ts';
const versions=await currentVersions(),base=()=>[supplier(1),supplier(2,{terms:'Medical supplies and hospital equipment',capacity:false}),tender(1000),tender(1001,{title:'Steel components'}),tender(1002,{category:'SERVICES'}),tender(1003,{category:'WORKS',title:'Road construction'})];
const count=(store,table)=>store.db.prepare('SELECT count(*) n FROM '+table).get().n;
async function run(store,source,v=versions,options={}){const plan=planDelta(await source.capture(),store.active(),v);return {plan,result:await executeIncremental({store,source,plan,versions:v,...options})};}
const value=(r,k)=>r.stats.computed[k]??0;
test('Stage 10 defaults disconnected and plans without creating a file-backed result store',async()=>{
  assert.equal((await main()).state,'DISCONNECTED');await assert.rejects(()=>main(['--execute']),/EXPLICIT/);
  const dir=await mkdtemp(path.join(os.tmpdir(),'tm-stage10-cli-')),state=path.join(dir,'state.sqlite');await publishFiles(dir,base());
  const args=['--source-dir',dir,'--state',state,'--tenant',TENANT],p=await main(['--plan',...args]);assert.equal(p.state,'PLANNED_LOCAL_ONLY');await assert.rejects(()=>stat(state),{code:'ENOENT'});
  await assert.rejects(()=>main(['--execute',...args,'--plan-id','0'.repeat(64)]),/REVIEWED_PLAN/);await assert.rejects(()=>stat(state),{code:'ENOENT'});
  const result=await main(['--execute',...args,'--plan-id',p.plan.runId]);assert.equal(result.state,'SEALED');assert.equal(result.proof.universe,8);
});
test('execution-time manifests discover all listed suppliers and exactly OPEN/nondeleted tenders without historical pins',async()=>{
  const source=memorySource([...base(),supplier(3),tender(1004,{status:'CLOSED'}),tender(1005,{deleted:true}),tender(1006)],{unlisted:[id(3)]});let c=await source.capture();assert.equal(c.supplierCount,2);assert.equal(c.tenderCount,5);assert.equal(c.universe,10);
  source.replace([...base(),supplier(3),tender(1007)]);c=await source.capture();assert.equal(c.supplierCount,2); // Explicit listing contract remains in force.
  const plan=planDelta(c,null,versions);assert.equal([...affectedPages(plan,2)].flatMap(p=>p.tenderIds).length,c.universe);assert.throws(()=>[...affectedPages(plan,513)],/BATCH/);
  const duplicate=manifestSet(base());duplicate.supplier.members.push(duplicate.supplier.members[0]);assert.throws(()=>manifestCapture(duplicate,TENANT),/MEMBERSHIP/);
});
test('full local execution preserves zero/Missing/outside scope, exact shortlist policy, immutable history and no AI',async()=>{
  const store=new IncrementalStore(':memory:',TENANT),source=memorySource(base());try{
    const {result:r}=await run(store,source);assert.equal(r.proof.universe,8);assert.equal(r.proof.candidates,4);assert.equal(r.proof.ranked,4);assert.equal(r.proof.unscored,4);assert.equal(r.proof.states.OUTSIDE_FORMULA_V1_1_SCOPE,2);assert.equal(r.proof.states.SCOPE_NOT_DEMONSTRATED,2);
    const zero=store.detail({tenantId:TENANT,runId:r.runId,supplierId:id(2),tenderId:id(1000)});assert.equal(zero.formula.pairScore,0);assert.ok(zero.formula.fit.includes(null));assert.equal(zero.formula.fit[0],0);assert.equal(zero.retrieval.relevanceUnits,0);assert.equal(zero.humanDisposition,null);assert.equal(zero.aiTors,null);
    const outside=store.detail({tenantId:TENANT,runId:r.runId,supplierId:id(1),tenderId:id(1002)});assert.equal(outside.formula,null);assert.equal(outside.retrieval,null);
    const pairs=[1,2].flatMap(n=>store.focus(r.runId,'supplier',id(n),{candidates:true}).map(p=>store.selectionInput(p))),oracle=simulatePolicy(pairs,POLICIES[2]);assert.equal(r.proof.shortlist,oracle.summary.selected);assert.equal(r.proof.review,oracle.summary.reviewCandidates);assert.equal(r.proof.audit,oracle.summary.auditOnly);
    assert.equal(r.stats.requestsCreated,0);assert.equal(r.stats.modelCalls,0);assert.throws(()=>store.db.prepare('UPDATE cache SET body=\'{}\'').run(),/IMMUTABLE/);assert.throws(()=>store.db.prepare('DELETE FROM pair_delta WHERE run_id=?').run(r.runId),/IMMUTABLE/);
  }finally{store.close();}
});
test('unchanged manifests/config/code reuse the exact run with zero body reads, recomputation or new requests',async()=>{
  const store=new IncrementalStore(':memory:',TENANT),source=memorySource(base());try{const first=await run(store,source),before={cache:count(store,'cache'),runs:count(store,'run'),reads:source.reads()};const again=await run(store,source);assert.equal(again.result.runId,first.result.runId);assert.equal(again.result.state,'SEALED_REUSED');assert.deepEqual(again.result.stats.computed,{});assert.equal(source.reads(),before.reads);assert.equal(count(store,'cache'),before.cache);assert.equal(count(store,'run'),before.runs);}finally{store.close();}
});
test('new supplier or OPEN tender visits only endpoint delta, stores only changed pairs and preserves old results',async()=>{
  for(const kind of ['supplier','tender']){const inputs=base(),store=new IncrementalStore(':memory:',TENANT),source=memorySource(inputs);try{const first=await run(store,source),old=store.pair(first.result.runId,id(1),id(1000));source.replace([...inputs,kind==='supplier'?supplier(3):tender(1004)]);const {plan,result}=await run(store,source);const expected=kind==='supplier'?4:2;assert.equal(plan.pairWork.affectedPairs,expected);assert.equal(result.stats.pairVisits,expected);assert.equal(value(result,'normalization'),1);assert.equal(value(result,'eligibility'),expected);assert.equal(count(store,'pair_delta'),8+expected);assert.equal(store.pair(result.runId,id(1),id(1000)).scope_key,old.scope_key);assert.deepEqual(store.run(first.result.runId).proof,first.result.proof);}finally{store.close();}}
});
test('supplier/tender evidence changes invalidate only dependent pair layers; simultaneous deltas deduplicate their intersection',async()=>{
  for(const kind of ['supplier','tender','both']){const inputs=base(),store=new IncrementalStore(':memory:',TENANT),source=memorySource(inputs);try{const first=await run(store,source),next=structuredClone(inputs);if(kind!=='tender'){next[0].evidence[1].display_value='Medical equipment';next[0].sourceVersion='synthetic/2';}if(kind!=='supplier'){next[2].tender.title='Medical equipment';next[2].sourceVersion='synthetic/2';}source.replace(next);const {result,plan}=await run(store,source),expected=kind==='supplier'?4:kind==='tender'?2:5;assert.equal(plan.pairWork.affectedPairs,expected);assert.equal(result.stats.pairVisits,expected);assert.equal(value(result,'normalization'),kind==='both'?2:1);assert.equal(store.pair(result.runId,id(2),id(1001)).formula_key,store.pair(first.result.runId,id(2),id(1001)).formula_key);}finally{store.close();}}
});
test('closed/deleted/removal transitions change only active membership and dependent nominations, never historical Formula',async()=>{
  for(const transition of ['closed','deleted','removed','unlisted']){const inputs=base(),store=new IncrementalStore(':memory:',TENANT),source=memorySource(inputs);try{const first=await run(store,source),next=structuredClone(inputs);if(transition==='closed'){next[2].tender.status='CLOSED';next[2].provenance.status='CLOSED';}else if(transition==='deleted')next[2].provenance.deleted=true;else if(transition==='removed')next.splice(2,1);source.replace(next,transition==='unlisted'?{unlisted:[id(1)]}:{});const {result}=await run(store,source);assert.equal(result.stats.pairVisits,0);assert.equal(value(result,'formula'),0);assert.equal(value(result,'retrieval'),0);assert.equal(result.proof.universe,transition==='unlisted'?4:6);assert.ok(store.pair(first.result.runId,id(1),id(1000)));assert.equal(store.pair(result.runId,id(1),id(1000)),undefined);}finally{store.close();}}
});
test('version/code cache epochs have explicit scoped invalidation; prompt/provider/schema never rescore or create requests',async()=>{
  for(const changed of ['normalization','readiness','eligibility','formula','retrieval','shortlist','escalation','prompt','provider','torsSchema']){const store=new IncrementalStore(':memory:',TENANT),source=memorySource(base());try{await run(store,source);const next={...versions,[changed]:sha(['synthetic-version-invalidation',changed])},{result,plan}=await run(store,source,next);assert.deepEqual(plan.changedVersions,[changed]);assert.equal(result.stats.requestsCreated,0);assert.equal(result.stats.modelCalls,0);
    if(['shortlist','escalation','prompt','provider','torsSchema'].includes(changed)){assert.equal(result.stats.pairVisits,0);assert.equal(value(result,'formula'),0);assert.equal(value(result,'retrieval'),0);assert.equal(value(result,'normalization'),0);}
    if(changed==='formula'){assert.equal(value(result,'eligibility'),0);assert.equal(value(result,'formula'),4);}
    if(changed==='retrieval'){assert.equal(value(result,'eligibility'),0);assert.equal(value(result,'formula'),0);assert.equal(value(result,'retrieval'),4);}
    if(['prompt','provider','torsSchema'].includes(changed)){assert.equal(value(result,'context'),0);assert.equal(value(result,'shortlist'),0);assert.equal(result.stats.allocationReused,1);assert.ok(value(result,'decision')>0);}
  }finally{store.close();}}
});
test('crash before/after atomic batch commit resumes idempotently with exact replay and no duplicate pair results',async()=>{
  for(const point of ['beforeCommit','afterCommit']){const store=new IncrementalStore(':memory:',TENANT),oracle=new IncrementalStore(':memory:',TENANT),source=memorySource(base());try{const plan=planDelta(await source.capture(),null,versions);let crashed=false;await assert.rejects(()=>executeIncremental({store,source,plan,versions,batch:2,fault:event=>{if(!crashed&&event.phase==='pairs'&&event.point===point){crashed=true;throw Error('INJECTED_CRASH');}}}),/INJECTED/);assert.equal(store.active(),null);assert.equal(store.run(plan.runId).state,'INTERRUPTED');const resumed=await executeIncremental({store,source,plan,versions,batch:2}),full=await run(oracle,source,versions,{batch:2});assert.deepEqual(resumed.proof,full.result.proof);assert.equal(resumed.stats.pairVisits,8);assert.equal(count(store,'pair_delta'),8);assert.equal(value(resumed,'formula'),4);}finally{store.close();oracle.close();}}
});
test('disk restart, hard invocation budget, exclusive lease and checkpoint batch identity are operational',async()=>{
  const dir=await mkdtemp(path.join(os.tmpdir(),'tm-stage10-resume-')),file=path.join(dir,'journal.sqlite'),source=memorySource(base());let store=new IncrementalStore(file,TENANT);const plan=planDelta(await source.capture(),null,versions);try{const paused=await executeIncremental({store,source,plan,versions,batch:2,maxBatches:1});assert.equal(paused.state,'PAUSED_BUDGET');store.close();store=new IncrementalStore(file,TENANT);await assert.rejects(()=>executeIncremental({store,source,plan,versions,batch:3}),/CHECKPOINT_BATCH/);
    store.claim('other-worker',Date.now());await assert.rejects(()=>executeIncremental({store,source,plan,versions,batch:2}),/COORDINATOR_BUSY/);store.db.prepare('UPDATE lease SET expires=0').run();const done=await executeIncremental({store,source,plan,versions,batch:2});assert.equal(done.state,'SEALED');assert.equal(done.proof.universe,8);
    for(const options of [{batch:0},{batch:513},{concurrency:2},{maxBatches:0},{maxBatches:10001}])await assert.rejects(()=>executeIncremental({store,source,plan,versions,...options}),/RESOURCE_BUDGET/);
  }finally{store.close();}
});
test('source drift before writes or during processing fails closed and never publishes a partial run',async()=>{
  const inputs=base(),source=memorySource(inputs),store=new IncrementalStore(':memory:',TENANT);try{const old=await run(store,source),next=[...inputs,supplier(3)];source.replace(next);const plan=planDelta(await source.capture(),store.active(),versions);source.replace([...next,tender(1005)]);await assert.rejects(()=>executeIncremental({store,source,plan,versions}),/SOURCE_OR_PLAN_DRIFT/);assert.equal(count(store,'run'),1);
    source.replace(next);let drifted=false;await assert.rejects(()=>executeIncremental({store,source,plan,versions,fault:e=>{if(!drifted&&e.point==='afterCommit'){drifted=true;source.replace([...next,tender(1005)]);}}}),/SOURCE_DRIFT/);assert.equal(store.active().runId,old.result.runId);const fresh=await run(store,source);assert.equal(fresh.result.proof.universe,15);assert.equal(store.run(plan.runId).state,'INTERRUPTED');
  }finally{store.close();}
});
test('bounded active surface requires tenant and exact latest seal; stale cursor/partial/focus injection fail closed',async()=>{
  const inputs=[supplier(),...Array.from({length:32},(_,i)=>tender(1000+i))],source=memorySource(inputs),store=new IncrementalStore(':memory:',TENANT);try{
    assert.throws(()=>store.surface({tenantId:TENANT,runId:'0'.repeat(64),direction:'supplier',focusId:id(1)}),/NO_SEALED/);const first=await run(store,source),request={tenantId:TENANT,runId:first.result.runId,direction:'supplier',focusId:id(1)},p=store.surface(request);assert.equal(p.results.length,25);assert.equal(store.surface({...request,cursor:p.nextCursor}).results.length,7);
    for(const change of [{tenantId:'wrong-tenant'},{runId:'0'.repeat(64)},{limit:101},{focusId:"' OR true--"},{direction:'matrix'}])assert.throws(()=>store.surface({...request,...change}));
    source.replace([...inputs,tender(1100)]);const plan=planDelta(await source.capture(),store.active(),versions);await executeIncremental({store,source,plan,versions,maxBatches:1});assert.equal(store.active().runId,first.result.runId);assert.throws(()=>store.surface({...request,runId:plan.runId}),/ACTIVE_VERSION/);await executeIncremental({store,source,plan,versions});assert.throws(()=>store.surface(request),/ACTIVE_VERSION/);assert.throws(()=>store.surface({...request,runId:plan.runId,cursor:p.nextCursor}),/STALE/);assert.equal(count(store,'pair_delta'),33);
  }finally{store.close();}
});
test('file manifests enforce path/hash/body caps and source metadata budgets',async()=>{
  const dir=await mkdtemp(path.join(os.tmpdir(),'tm-stage10-source-'));await publishFiles(dir,base());const source=await createFileSource(dir,TENANT),capture=await source.capture(),member=capture.members[0];await assert.rejects(()=>source.read({...member,file:'../outside.json'}),/SOURCE_PATH/);const file=path.join(dir,member.file),body=JSON.parse(await readFile(file));body.sourceVersion='tampered';await writeFile(file,JSON.stringify(body));await assert.rejects(()=>source.read(member),/RECORD_IDENTITY/);await writeFile(file,' '.repeat(BOUNDS.recordBytes+1));await assert.rejects(()=>source.read(member),/PAYLOAD_BUDGET/);
  const many=manifestSet([]);for(let i=0;i<4000;i++){many.supplier.members.push({id:id(i+1),digest:'a'.repeat(64),file:'x',listed:true,deleted:false});many.tender.members.push({id:id(i+10000),digest:'b'.repeat(64),file:'x',status:'OPEN',deleted:false});}assert.throws(()=>manifestCapture(many,TENANT),/PAIR_UNIVERSE_BUDGET/);
});
test('source contract changes invalidate only that entity kind even when record bytes are unchanged',async()=>{
  for(const kind of ['supplier','tender']){const store=new IncrementalStore(':memory:',TENANT),source=memorySource(base());try{const first=await run(store,source);source.replace(base(),{contracts:{[kind]:'synthetic-safe-source/2'}});const next=await run(store,source);assert.deepEqual(next.plan.sourceContractChanges,[kind]);assert.equal(next.result.stats.pairVisits,8);assert.equal(value(next.result,'normalization'),kind==='supplier'?2:4);assert.notEqual(store.pair(first.result.runId,id(1),id(1000)).scope_key,store.pair(next.result.runId,id(1),id(1000)).scope_key);assert.deepEqual((await run(store,source)).result.stats.computed,{});}finally{store.close();}}
});
test('source drift at final commit rolls back publication; empty and reactivated membership preserve history',async()=>{
  const store=new IncrementalStore(':memory:',TENANT),source=memorySource(base());try{const first=await run(store,source);source.replace([...base(),supplier(3)]);const plan=planDelta(await source.capture(),store.active(),versions);await assert.rejects(()=>executeIncremental({store,source,plan,versions,fault:e=>{if(e.point==='beforeCommit'&&e.phase==='seal')source.replace([]);}}),/SOURCE_DRIFT/);assert.equal(store.active().runId,first.result.runId);const empty=await run(store,source);assert.equal(empty.result.proof.universe,0);assert.equal(empty.result.stats.pairVisits,0);source.replace(base());const reopened=await run(store,source);assert.equal(reopened.result.proof.universe,8);assert.equal(value(reopened.result,'formula'),0);assert.deepEqual(store.run(first.result.runId).proof,first.result.proof);}finally{store.close();}
});
test('full readback detects cached result corruption and local files reject other tenants',async()=>{
  const dir=await mkdtemp(path.join(os.tmpdir(),'tm-stage10-isolation-')),file=path.join(dir,'state.sqlite'),store=new IncrementalStore(file,TENANT),source=memorySource(base());try{const first=await run(store,source);assert.throws(()=>new IncrementalStore(file,'another-tenant',{readOnly:true}),/TENANT/);store.db.exec('DROP TRIGGER cache_immutable_update');store.db.prepare("UPDATE cache SET body='{}' WHERE stage='formula'").run();assert.throws(()=>store.proof(first.result.runId),/CACHE_BODY_CORRUPT/);}finally{store.close();}
});
test('tampered affected-set decisions and heap budget exhaustion are rejected before publication',async()=>{
  const store=new IncrementalStore(':memory:',TENANT),source=memorySource(base());try{const plan=planDelta(await source.capture(),null,versions);const tampered=structuredClone(plan);tampered.invalidation.contextGlobal=false;await assert.rejects(()=>executeIncremental({store,source,plan:tampered,versions}),/SOURCE_OR_PLAN_DRIFT/);assert.equal(count(store,'run'),0);let calls=0;await assert.rejects(()=>executeIncremental({store,source,plan,versions,resourceProbe:()=>({heapUsed:++calls===1?0:BOUNDS.heapBytes+1})}),/HEAP_BUDGET/);assert.equal(store.active(),null);assert.equal(count(store,'entity_member'),0);assert.equal((await run(store,source)).result.proof.universe,8);}finally{store.close();}
});

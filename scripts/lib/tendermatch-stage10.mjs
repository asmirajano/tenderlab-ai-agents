/** Operational local coordinator. Calls sealed algorithms; never a provider or source DB. */
import {randomUUID} from 'node:crypto';
import {sha} from './tendermatch-input-manifest.mjs';
import {normalizeSourceInput,validateSourceFeature} from '../../packages/tendermatch/src/input-normalization.ts';
import {alignSupplierReadiness,validateSupplierReadiness} from '../../packages/tendermatch/src/supplier-readiness.ts';
import {projectScopeInput} from './tendermatch-eligibility-inputs.mjs';
import {evaluateEligibility} from '../../packages/tendermatch/src/eligibility-scope.ts';
import {adaptStage2aSupplier,adaptStage2Tender,evaluateStage4Pair,validateFormulaResult} from '../../packages/tendermatch/src/formula-stage4-adapter.ts';
import {extractRetrievalProfile,calculatePairRetrieval} from '../../packages/tendermatch/src/retrieval-stage5.ts';
import {nominate,POLICIES} from '../../packages/tendermatch/src/shortlist-stage6.ts';
import {planEscalations,BUDGETS,assessmentInputIdentity} from '../../packages/tendermatch/src/escalation-stage7.ts';
import {BOUNDS} from './tendermatch-stage10-source.mjs';
import {planDelta,affectedPages} from './tendermatch-stage10-plan.mjs';
const POLICY=POLICIES.find(p=>p.name==='balanced-100-3'),key=(stage,...v)=>sha(['stage10-local',stage,...v]);
function prepareEntity(store,m,input,v,stats){
  if(sha(input)!==m.digest||input.id!==m.id||input.kind!==m.kind)throw Error('SOURCE_RECORD_IDENTITY');
  const normal=key('normalization',v.normalization,m.contractVersion,m.digest),f=store.compute('normalization',normal,()=>normalizeSourceInput(input,v.normalization),stats);validateSourceFeature(f,input,v.normalization);
  let ready=null,r=null;if(m.kind==='supplier'){ready=key('readiness',v.readiness,m.contractVersion,m.digest);r=store.compute('readiness',ready,()=>alignSupplierReadiness(input,v.readiness),stats);validateSupplierReadiness(r,input,v.readiness);}
  const scope=key('scope',v.eligibility,normal,ready),s=store.compute('scope',scope,()=>projectScopeInput(f,r),stats);
  const adapted=key('adapted',v.formula,normal,ready,scope),a=store.compute('adapted',adapted,()=>m.kind==='supplier'?adaptStage2aSupplier(r,s):adaptStage2Tender(f,s),stats);
  const profile=key('profile',v.retrieval,adapted);store.compute('profile',profile,()=>extractRetrievalProfile(a),stats);return {normal,ready,scope,adapted,profile};
}
function processPair(store,run,sid,tid,stats){
  const v=run.identity.versions,s=store.entity(run.id,'supplier',sid),t=store.entity(run.id,'tender',tid),scopeKey=key('eligibility',v.coordinator,v.eligibility,s.scope,t.scope);
  const outcome=store.compute('eligibility',scopeKey,()=>evaluateEligibility(store.cached(s.scope),store.cached(t.scope)),stats);
  let formulaKey=null,rankingKey=null,units=null;
  if(outcome.state==='CANDIDATE_ELIGIBLE_WITH_LIMITATIONS'){
    formulaKey=key('formula',v.formula,scopeKey,s.adapted,t.adapted);
    const formula=store.compute('formula',formulaKey,()=>evaluateStage4Pair(store.cached(s.adapted),store.cached(t.adapted),outcome.state,run.id,new Date().toISOString()),stats);validateFormulaResult(formula,store.cached(s.adapted),store.cached(t.adapted).prepared.procurementType);
    rankingKey=key('retrieval',v.retrieval,formulaKey,s.profile,t.profile);units=store.compute('retrieval',rankingKey,()=>calculatePairRetrieval(store.cached(s.profile),store.cached(t.profile)),stats).relevanceUnits;
  }
  store.db.prepare('INSERT INTO pair_delta VALUES(?,?,?,?,?,?,?)').run(run.id,sid,tid,scopeKey,formulaKey,rankingKey,units);stats.pairVisits++;
}
function contextDirty(plan,m){if(plan.invalidation.contextGlobal)return true;const self=plan.changes[m.kind],other=plan.changes[m.kind==='supplier'?'tender':'supplier'];return self.added.includes(m.id)||self.changed.includes(m.id)||other.added.length+other.changed.length+other.removed.length>0;}
function processContext(store,run,m,stats){
  const plan=run.plan,previous=plan.parentRunId&&!contextDirty(plan,m)?store.db.prepare('SELECT key FROM context_member WHERE run_id=? AND kind=? AND id=?').get(plan.parentRunId,m.kind,m.id):null;
  if(previous){store.db.prepare('INSERT INTO context_member VALUES(?,?,?,?)').run(run.id,m.kind,m.id,previous.key);stats.reused.context=(stats.reused.context??0)+1;return;}
  const pairs=store.focus(run.id,m.kind,m.id,{candidates:true}),rows=pairs.map(p=>store.selectionInput(p)),refs=store.entity(run.id,m.kind,m.id);
  const contextKey=key('context',run.identity.versions.shortlist,refs.profile,pairs.map(p=>[p.supplier_id,p.tender_id,p.formula_key,p.ranking_key]));
  const context=store.compute('context',contextKey,()=>({kind:m.kind,id:m.id,profile:refs.profile,candidateCount:rows.length,nominations:nominate(rows,m.kind,POLICY)}),stats);
  store.db.prepare('INSERT INTO context_member VALUES(?,?,?,?)').run(run.id,m.kind,m.id,contextKey);
  for(const n of context.nominations)store.db.prepare('INSERT INTO nomination VALUES(?,?,?,?) ON CONFLICT DO NOTHING').run(contextKey,n.supplierId,n.tenderId,JSON.stringify(n));stats.contextVisits++;
}
function selectedPage(store,run,after,batch){
  return store.db.prepare(`SELECT n.supplier_id,n.tender_id,max(CASE WHEN m.kind='supplier' THEN n.body END) sn,max(CASE WHEN m.kind='tender' THEN n.body END) tn
FROM context_member m JOIN nomination n ON n.context_key=m.key WHERE m.run_id=? AND (n.supplier_id||':'||n.tender_id)>? GROUP BY n.supplier_id,n.tender_id ORDER BY n.supplier_id,n.tender_id LIMIT ?`).all(run,after,batch);
}
function processShortlist(store,run,row,stats){
  const s=store.db.prepare('SELECT key FROM context_member WHERE run_id=? AND kind=\'supplier\' AND id=?').get(run.id,row.supplier_id),t=store.db.prepare('SELECT key FROM context_member WHERE run_id=? AND kind=\'tender\' AND id=?').get(run.id,row.tender_id),pair=store.pair(run.id,row.supplier_id,row.tender_id);
  if(!pair?.formula_key)throw Error('NOMINATION_NOT_CANDIDATE');const k=key('shortlist',run.identity.versions.shortlist,s.key,t.key);
  const p=store.compute('shortlist',k,()=>{const sn=row.sn?JSON.parse(row.sn):null,tn=row.tn?JSON.parse(row.tn):null,tier=pair.units>0?1:2;if([sn,tn].filter(Boolean).some(n=>n.tier!==(tier===1?'REVIEW_CANDIDATE':'AUDIT_ONLY')))throw Error('AUDIT_TIER_BOUNDARY');
    const selection={reasonMask:(sn?(tier===1?1:4):0)|(tn?(tier===1?2:8):0),supplierNominationRank:sn?.rank??null,tenderNominationRank:tn?.rank??null,supplierTieSize:sn?.tieSize??null,tenderTieSize:tn?.tieSize??null};
    return {pairKey:k,supplierId:row.supplier_id,tenderId:row.tender_id,tier,selection,supplierProfile:store.entity(run.id,'supplier',row.supplier_id).profile,tenderProfile:store.entity(run.id,'tender',row.tender_id).profile,methodHash:run.identity.versions.retrieval,formulaPolicy:run.identity.versions.formula};},stats);
  store.db.prepare('INSERT INTO shortlist_member VALUES(?,?,?,?)').run(run.id,p.supplierId,p.tenderId,k);
}
export async function executeIncremental({store,source,plan,versions=plan.versions,batch=BOUNDS.batch,maxBatches=1000,concurrency=1,clock=Date.now,owner=randomUUID(),fault=()=>{},onProgress=()=>{},resourceProbe=process.memoryUsage}){
  if(concurrency!==1||!Number.isInteger(batch)||batch<1||batch>BOUNDS.maxBatch||!Number.isInteger(maxBatches)||maxBatches<1||maxBatches>10000)throw Error('EXECUTION_RESOURCE_BUDGET');
  if(typeof source.assertCurrentSync!=='function')throw Error('PUBLICATION_SOURCE_GUARD_REQUIRED');
  const start=performance.now(),capture=await source.capture();const expected=planDelta(capture,store.active(),versions);
  if(expected.runId!==plan.runId||['identity','pairWork','changes','invalidation','sourceContractChanges','changedVersions','bounds'].some(k=>sha(expected[k])!==sha(plan[k])))throw Error('SOURCE_OR_PLAN_DRIFT');
  if(resourceProbe().heapUsed>BOUNDS.heapBytes)throw Error('HEAP_BUDGET');
  if(expected.noop){await source.assertCurrent(capture,{deep:true});return {state:'SEALED_REUSED',runId:plan.runId,proof:store.active().proof,stats:{computed:{},reused:{run:1},pairVisits:0,requestsCreated:0,modelCalls:0},elapsedMs:performance.now()-start};}
  store.claim(owner,clock());let invocationBatches=0,pairIterator=null;
  try{
    await source.assertCurrent(capture);store.transaction(()=>store.begin(plan));
    while(invocationBatches<maxBatches){let run=store.run(plan.runId);if(run.state==='SEALED')return {state:'SEALED',runId:run.id,proof:run.proof,stats:run.stats,invocationBatches,elapsedMs:performance.now()-start};
      await source.assertCurrent(capture,{deep:run.phase==='seal'});const stats=structuredClone(run.stats);let phase=run.phase,offset=run.offset,inputs=[];
      if(stats.batchSize&&stats.batchSize!==batch)throw Error('CHECKPOINT_BATCH_IDENTITY');stats.batchSize=batch;
      if(phase==='entities')for(const m of capture.members.slice(offset,offset+batch)){
        const prior=plan.parentRunId&&!plan.sourceContractChanges.includes(m.kind)&&!plan.changedVersions.some(k=>['normalization','readiness','eligibility','formula','retrieval'].includes(k))?store.db.prepare('SELECT digest,refs FROM entity_member WHERE run_id=? AND kind=? AND id=?').get(plan.parentRunId,m.kind,m.id):null;
        inputs.push([m,prior?.digest===m.digest?null:await source.read(m),prior?.digest===m.digest?JSON.parse(prior.refs):null]);
      }
      fault({point:'beforeBatch',phase,offset});
      store.transaction(()=>{
        store.renew(owner,clock());
        if(phase==='entities'){
          for(const [m,input,prior] of inputs){const refs=prior??prepareEntity(store,m,input,versions,stats);if(prior){for(const ref of Object.values(prior).filter(Boolean))if(!store.cached(ref))throw Error('ENTITY_CACHE_MISSING');stats.reused.entityRefs=(stats.reused.entityRefs??0)+1;}store.db.prepare('INSERT INTO entity_member VALUES(?,?,?,?,?)').run(run.id,m.kind,m.id,m.digest,JSON.stringify(refs));}
          offset+=inputs.length;if(offset>=capture.members.length){phase='pairs';offset=0;}
        }else if(phase==='pairs'){
          if(!pairIterator){pairIterator=affectedPages(plan,batch);for(let i=0;i<offset;i++)pairIterator.next();}const page=pairIterator.next().value;
          if(page){for(const tid of page.tenderIds)processPair(store,run,page.supplierId,tid,stats);offset++;}else{phase='contexts';offset=0;}
        }else if(phase==='contexts'){
          // One bounded focus per transaction; a changed context never rescales Formula.
          const m=capture.members[offset];if(m){processContext(store,run,m,stats);offset++;}else{phase='shortlist';offset=0;}
        }else if(phase==='shortlist'){
          const last=store.db.prepare('SELECT supplier_id||\':\'||tender_id key FROM shortlist_member WHERE run_id=? ORDER BY supplier_id DESC,tender_id DESC LIMIT 1').get(run.id)?.key??'',rows=selectedPage(store,run.id,last,batch);
          if(offset+rows.length>BOUNDS.shortlist)throw Error('SHORTLIST_BUDGET');for(const row of rows)processShortlist(store,run,row,stats);offset+=rows.length;if(rows.length<batch){phase='escalation';offset=0;}
        }else if(phase==='escalation'){
          const rows=store.db.prepare('SELECT c.body FROM shortlist_member m JOIN cache c ON c.key=m.key WHERE m.run_id=? ORDER BY m.supplier_id,m.tender_id').all(run.id).map(r=>JSON.parse(r.body));
          if(rows.length>BOUNDS.shortlist||Buffer.byteLength(JSON.stringify(rows))>64*1024*1024)throw Error('ESCALATION_PLANNING_BUDGET');
          const inputs=rows.map(p=>{const r=store.pair(run.id,p.supplierId,p.tenderId),f=store.cached(r.formula_key);return {...p,...store.selectionInput(r),states:f.states};});
          const allocationInputHash=sha([versions.escalation,inputs]),prior=plan.parentRunId?store.run(plan.parentRunId):null;
          const allocation=prior?.stats.allocationInputHash===allocationInputHash?{summary:{selected:prior.stats.escalationPlanned},rows:store.db.prepare('SELECT c.body FROM decision_member m JOIN cache c ON c.key=m.key WHERE m.run_id=?').all(prior.id).map(r=>{const {assessmentKey,requestState,executionAuthority,...d}=JSON.parse(r.body);void assessmentKey;void requestState;void executionAuthority;return d;})}:planEscalations(inputs,BUDGETS[1]);
          stats[prior?.stats.allocationInputHash===allocationInputHash?'allocationReused':'allocationComputed']=1;stats.allocationInputHash=allocationInputHash;stats.escalationPlanned=allocation.summary.selected;const byKey=new Map(rows.map(p=>[p.pairKey,p]));
          for(const d of allocation.rows){const p=byKey.get(d.pairKey),assessmentKey=key('assessment',assessmentInputIdentity(p),versions.prompt,versions.provider,versions.torsSchema),dk=key('decision',versions.escalation,d,assessmentKey);store.compute('decision',dk,()=>({...d,assessmentKey,requestState:'NOT_CREATED_BY_COORDINATOR',executionAuthority:false}),stats);store.db.prepare('INSERT INTO decision_member VALUES(?,?,?,?)').run(run.id,d.supplierId,d.tenderId,dk);}phase='seal';offset=0;
        }else if(phase==='seal'){
          const proof=store.proof(run.id);if(proof.universe!==capture.universe||stats.pairVisits!==plan.pairWork.affectedPairs)throw Error('FULL_RUN_READBACK_MISMATCH');
          if((store.active()?.runId??null)!==plan.parentRunId)throw Error('ACTIVE_BASE_CHANGED');
          stats.batches++;store.db.prepare('UPDATE run SET state=\'SEALED\',phase=\'complete\',proof=?,stats=? WHERE id=?').run(JSON.stringify(proof),JSON.stringify(stats),run.id);
          store.db.prepare('INSERT INTO active VALUES(1,?) ON CONFLICT(singleton) DO UPDATE SET run_id=excluded.run_id').run(run.id);
        }else throw Error('UNKNOWN_CHECKPOINT_PHASE');
        if(run.phase!=='seal'){stats.batches++;store.checkpoint(run.id,phase,offset,stats);}fault({point:'beforeCommit',phase:run.phase,offset:run.offset});source.assertCurrentSync(capture);if(resourceProbe().heapUsed>BOUNDS.heapBytes)throw Error('HEAP_BUDGET');
      });
      invocationBatches++;fault({point:'afterCommit',phase:run.phase,offset:run.offset});if(invocationBatches%100===0)onProgress({runId:run.id,phase,offset,invocationBatches});
    }
    const run=store.run(plan.runId);if(run.state!=='SEALED')store.db.prepare('UPDATE run SET state=\'PAUSED_BUDGET\' WHERE id=?').run(run.id);return {state:run.state==='SEALED'?'SEALED':'PAUSED_BUDGET',runId:run.id,phase:run.phase,offset:run.offset,proof:run.proof,stats:run.stats,invocationBatches,elapsedMs:performance.now()-start};
  }catch(e){const run=store.run(plan.runId);if(run&&run.state!=='SEALED')store.db.prepare('UPDATE run SET state=\'INTERRUPTED\' WHERE id=?').run(run.id);throw e;}finally{store.release(owner);}
}

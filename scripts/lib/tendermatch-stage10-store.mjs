/** Local-only durable control/results store. Not a Neon schema or Stage 8 data source. */
import {DatabaseSync} from 'node:sqlite';
import {createHash} from 'node:crypto';
import {sha} from './tendermatch-input-manifest.mjs';
import {BOUNDS,digest,uuid} from './tendermatch-stage10-source.mjs';
import {validateFormulaResult} from '../../packages/tendermatch/src/formula-stage4-adapter.ts';
const SCHEMA='tendermatch-local-incremental-store/1.0.0';
const parse=JSON.parse;
export class IncrementalStore {
  constructor(file,tenantId,{readOnly=false}={}){
    if(!/^[A-Za-z0-9:_-]{3,100}$/.test(tenantId)||file!==':memory:'&&(!file.endsWith('.sqlite')||file.includes('://')))throw Error('LOCAL_STORE_IDENTITY');
    this.tenantId=tenantId;this.db=new DatabaseSync(file,{readOnly});this.db.exec('PRAGMA foreign_keys=ON;PRAGMA busy_timeout=1000;');
    if(!readOnly)this.db.exec(`
CREATE TABLE IF NOT EXISTS metadata(schema TEXT NOT NULL,tenant TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS run(id TEXT PRIMARY KEY,parent TEXT REFERENCES run(id),identity TEXT NOT NULL,capture TEXT NOT NULL,plan TEXT NOT NULL,state TEXT NOT NULL,phase TEXT NOT NULL,offset INTEGER NOT NULL,stats TEXT NOT NULL,proof TEXT);
CREATE TABLE IF NOT EXISTS active(singleton INTEGER PRIMARY KEY CHECK(singleton=1),run_id TEXT NOT NULL REFERENCES run(id));
CREATE TABLE IF NOT EXISTS lease(singleton INTEGER PRIMARY KEY CHECK(singleton=1),owner TEXT NOT NULL,expires INTEGER NOT NULL);
CREATE TABLE IF NOT EXISTS cache(key TEXT PRIMARY KEY,stage TEXT NOT NULL,body TEXT NOT NULL,hash TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS entity_member(run_id TEXT NOT NULL REFERENCES run(id),kind TEXT NOT NULL,id TEXT NOT NULL,digest TEXT NOT NULL,refs TEXT NOT NULL,PRIMARY KEY(run_id,kind,id));
CREATE TABLE IF NOT EXISTS pair_delta(run_id TEXT NOT NULL REFERENCES run(id),supplier_id TEXT NOT NULL,tender_id TEXT NOT NULL,scope_key TEXT NOT NULL REFERENCES cache(key),formula_key TEXT REFERENCES cache(key),ranking_key TEXT REFERENCES cache(key),units INTEGER,PRIMARY KEY(run_id,supplier_id,tender_id),CHECK((formula_key IS NULL AND ranking_key IS NULL AND units IS NULL) OR (formula_key IS NOT NULL AND ranking_key IS NOT NULL AND units BETWEEN 0 AND 1000000)));
CREATE INDEX IF NOT EXISTS pair_supplier ON pair_delta(supplier_id,run_id,tender_id);
CREATE INDEX IF NOT EXISTS pair_tender ON pair_delta(tender_id,run_id,supplier_id);
CREATE TABLE IF NOT EXISTS context_member(run_id TEXT NOT NULL REFERENCES run(id),kind TEXT NOT NULL,id TEXT NOT NULL,key TEXT NOT NULL REFERENCES cache(key),PRIMARY KEY(run_id,kind,id));
CREATE TABLE IF NOT EXISTS nomination(context_key TEXT NOT NULL REFERENCES cache(key),supplier_id TEXT NOT NULL,tender_id TEXT NOT NULL,body TEXT NOT NULL,PRIMARY KEY(context_key,supplier_id,tender_id));
CREATE TABLE IF NOT EXISTS shortlist_member(run_id TEXT NOT NULL REFERENCES run(id),supplier_id TEXT NOT NULL,tender_id TEXT NOT NULL,key TEXT NOT NULL REFERENCES cache(key),PRIMARY KEY(run_id,supplier_id,tender_id));
CREATE TABLE IF NOT EXISTS decision_member(run_id TEXT NOT NULL REFERENCES run(id),supplier_id TEXT NOT NULL,tender_id TEXT NOT NULL,key TEXT NOT NULL REFERENCES cache(key),PRIMARY KEY(run_id,supplier_id,tender_id));
CREATE TRIGGER IF NOT EXISTS cache_immutable_update BEFORE UPDATE ON cache BEGIN SELECT RAISE(ABORT,'IMMUTABLE_CACHE');END;
CREATE TRIGGER IF NOT EXISTS cache_immutable_delete BEFORE DELETE ON cache BEGIN SELECT RAISE(ABORT,'IMMUTABLE_CACHE');END;
CREATE TRIGGER IF NOT EXISTS nomination_immutable_update BEFORE UPDATE ON nomination BEGIN SELECT RAISE(ABORT,'IMMUTABLE_NOMINATION');END;
CREATE TRIGGER IF NOT EXISTS nomination_immutable_delete BEFORE DELETE ON nomination BEGIN SELECT RAISE(ABORT,'IMMUTABLE_NOMINATION');END;
CREATE TRIGGER IF NOT EXISTS run_sealed BEFORE UPDATE ON run WHEN OLD.state='SEALED' BEGIN SELECT RAISE(ABORT,'IMMUTABLE_SEALED_RUN');END;`);
    if(!readOnly&&!this.db.prepare('SELECT count(*) n FROM metadata').get().n)this.db.prepare('INSERT INTO metadata VALUES(?,?)').run(SCHEMA,tenantId);
    const meta=this.db.prepare('SELECT * FROM metadata').get();if(meta?.schema!==SCHEMA||meta?.tenant!==tenantId){this.db.close();throw Error('LOCAL_SCHEMA_OR_TENANT_MISMATCH');}
    if(!readOnly)for(const table of ['entity_member','pair_delta','context_member','shortlist_member','decision_member'])for(const op of ['INSERT','UPDATE','DELETE'])this.db.exec(`CREATE TRIGGER IF NOT EXISTS ${table}_${op} BEFORE ${op} ON ${table} WHEN (SELECT state FROM run WHERE id=${op==='DELETE'?'OLD':'NEW'}.run_id)='SEALED' BEGIN SELECT RAISE(ABORT,'IMMUTABLE_MEMBERSHIP');END;`);
  }
  close(){this.db.close();}
  transaction(fn){this.db.exec('BEGIN IMMEDIATE');try{const value=fn();this.db.exec('COMMIT');return value;}catch(e){this.db.exec('ROLLBACK');throw e;}}
  active(){const row=this.db.prepare('SELECT r.* FROM active a JOIN run r ON r.id=a.run_id WHERE r.state=\'SEALED\'').get();return row?{runId:row.id,...parse(row.capture),versions:parse(row.identity).versions,proof:parse(row.proof)}:null;}
  run(id){const row=this.db.prepare('SELECT * FROM run WHERE id=?').get(id);return row?{...row,identity:parse(row.identity),capture:parse(row.capture),plan:parse(row.plan),stats:parse(row.stats),proof:row.proof?parse(row.proof):null}:null;}
  begin(plan){if(plan.capture.tenantId!==this.tenantId||sha(plan.identity)!==plan.runId)throw Error('PLAN_IDENTITY');const existing=this.run(plan.runId);if(existing){if(sha(existing.identity)!==plan.runId)throw Error('RUN_COLLISION');return existing;}
    if((this.active()?.runId??null)!==plan.parentRunId)throw Error('ACTIVE_BASE_CHANGED');
    if(plan.parentRunId){const depth=this.db.prepare('WITH RECURSIVE h(id,parent,n) AS(SELECT id,parent,1 FROM run WHERE id=? UNION ALL SELECT r.id,r.parent,h.n+1 FROM run r JOIN h ON r.id=h.parent) SELECT max(n) n FROM h').get(plan.parentRunId).n;if(depth>=32)throw Error('LINEAGE_BUDGET_REBASE_REQUIRED');}
    this.db.prepare('INSERT INTO run VALUES(?,?,?,?,?,?,?,?,?,NULL)').run(plan.runId,plan.parentRunId,JSON.stringify(plan.identity),JSON.stringify(plan.capture),JSON.stringify(plan),'RUNNING','entities',0,JSON.stringify({computed:{},reused:{},batches:0,pairVisits:0,contextVisits:0,requestsCreated:0,modelCalls:0}));return this.run(plan.runId);
  }
  claim(owner,now){this.transaction(()=>{const row=this.db.prepare('SELECT * FROM lease').get();if(row&&row.owner!==owner&&row.expires>now)throw Error('COORDINATOR_BUSY');this.db.prepare('INSERT INTO lease VALUES(1,?,?) ON CONFLICT(singleton) DO UPDATE SET owner=excluded.owner,expires=excluded.expires').run(owner,now+60000);});}
  renew(owner,now){if(!this.db.prepare('UPDATE lease SET expires=? WHERE owner=? AND expires>?').run(now+60000,owner,now).changes)throw Error('LEASE_LOST');}
  release(owner){this.db.prepare('DELETE FROM lease WHERE owner=?').run(owner);}
  checkpoint(id,phase,offset,stats){this.db.prepare('UPDATE run SET phase=?,offset=?,stats=?,state=\'RUNNING\' WHERE id=? AND state<>\'SEALED\'').run(phase,offset,JSON.stringify(stats),id);}
  cached(key){const r=this.db.prepare('SELECT body,hash FROM cache WHERE key=?').get(key);if(!r)return undefined;const body=parse(r.body);if(sha(body)!==r.hash)throw Error('CACHE_BODY_CORRUPT');return body;}
  compute(stage,key,fn,stats){let value=this.cached(key);if(value!==undefined){stats.reused[stage]=(stats.reused[stage]??0)+1;return value;}value=fn();const body=JSON.stringify(value);if(Buffer.byteLength(body)>BOUNDS.recordBytes)throw Error('CACHE_PAYLOAD_BUDGET');this.db.prepare('INSERT INTO cache VALUES(?,?,?,?)').run(key,stage,body,sha(value));stats.computed[stage]=(stats.computed[stage]??0)+1;return value;}
  entity(run,kind,id){const row=this.db.prepare('SELECT refs FROM entity_member WHERE run_id=? AND kind=? AND id=?').get(run,kind,id);if(!row)throw Error('ENTITY_NOT_PREPARED');return parse(row.refs);}
  /** Lineage stores only changed pair rows. One focus is bounded before ranking/paging. */
  effectiveSQL(filter=''){return `WITH RECURSIVE lineage(id,depth) AS(SELECT ?,0 UNION ALL SELECT r.parent,l.depth+1 FROM run r JOIN lineage l ON r.id=l.id WHERE r.parent IS NOT NULL AND l.depth<32),
ranked AS(SELECT p.*,row_number() OVER(PARTITION BY p.supplier_id,p.tender_id ORDER BY l.depth) priority FROM pair_delta p JOIN lineage l ON l.id=p.run_id ${filter})
SELECT p.* FROM ranked p JOIN entity_member s ON s.run_id=? AND s.kind='supplier' AND s.id=p.supplier_id JOIN entity_member t ON t.run_id=s.run_id AND t.kind='tender' AND t.id=p.tender_id WHERE p.priority=1`;}
  focus(run,kind,id,{candidates=false}={}){if(!['supplier','tender'].includes(kind)||!uuid(id))throw Error('INVALID_FOCUS');const q=this.effectiveSQL('WHERE p.'+kind+'_id=?')+(candidates?' AND p.units IS NOT NULL':'')+' ORDER BY p.supplier_id,p.tender_id LIMIT ?';const rows=this.db.prepare(q).all(run,id,run,BOUNDS.focus+1);if(rows.length>BOUNDS.focus)throw Error('FOCUS_BUDGET');return rows;}
  pair(run,supplierId,tenderId){const q=this.effectiveSQL('WHERE p.supplier_id=? AND p.tender_id=?');return this.db.prepare(q).get(run,supplierId,tenderId,run);}
  selectionInput(row){const f=this.cached(row.formula_key),r=this.cached(row.ranking_key);return {supplierId:row.supplier_id,tenderId:row.tender_id,units:r.relevanceUnits,score:f.pairScore,coverage:f.dataCoverage,confidence:f.evidenceConfidence,mask:r.limitationMask,limitation:f.limitation};}
  proof(run){const h=createHash('sha256'),counts={universe:0,candidates:0,unscored:0,states:{}};const query=this.effectiveSQL()+' ORDER BY p.supplier_id,p.tender_id';for(const row of this.db.prepare(query).iterate(run,run)){const outcome=this.cached(row.scope_key);if(!outcome)throw Error('SCOPE_RESULT_MISSING');counts.universe++;counts.states[outcome.state]=(counts.states[outcome.state]??0)+1;const candidate=outcome.state==='CANDIDATE_ELIGIBLE_WITH_LIMITATIONS';if(candidate!==!!row.formula_key||candidate!==!!row.ranking_key)throw Error('CANDIDATE_FORMULA_BOUNDARY');if(candidate){const formula=this.cached(row.formula_key),ranking=this.cached(row.ranking_key),s=this.cached(this.entity(run,'supplier',row.supplier_id).adapted),t=this.cached(this.entity(run,'tender',row.tender_id).adapted);if(!formula||!ranking||ranking.relevanceUnits!==row.units||!Number.isInteger(row.units)||row.units<0||row.units>1000000)throw Error('FULL_RESULT_READBACK');validateFormulaResult(formula,s,t.prepared.procurementType);counts.candidates++;}else {if(row.units!==null)throw Error('UNSCORED_RETRIEVAL_BOUNDARY');counts.unscored++;}h.update(JSON.stringify([row.supplier_id,row.tender_id,row.scope_key,row.formula_key,row.ranking_key,row.units])+'\n');}
    const short=this.db.prepare('SELECT key FROM shortlist_member WHERE run_id=? ORDER BY supplier_id,tender_id').all(run).map(r=>this.cached(r.key));for(const p of short){const row=this.pair(run,p.supplierId,p.tenderId);if(!row?.formula_key||p.tier!==(row.units>0?1:2))throw Error('SHORTLIST_READBACK_BOUNDARY');}return {...counts,ranked:counts.candidates,shortlist:short.length,review:short.filter(p=>p.tier===1).length,audit:short.filter(p=>p.tier===2).length,pairHash:h.digest('hex'),shortlistHash:sha(short),requestsCreated:0,modelCalls:0};}
  surface({tenantId,runId,direction,focusId,limit=25,cursor=null}){
    if(tenantId!==this.tenantId)throw Error('TENANT_MISMATCH');const active=this.active();if(!active)throw Error('NO_SEALED_ACTIVE_RUN');if(runId!==active.runId)throw Error('ACTIVE_VERSION_REQUIRED');if(!Number.isInteger(limit)||limit<1||limit>100||!['supplier','tender'].includes(direction)||!uuid(focusId))throw Error('BOUNDED_FOCUS_REQUIRED');
    let after=null;if(cursor){if(typeof cursor!=='string'||cursor.length>1024)throw Error('INVALID_CURSOR');try{after=parse(Buffer.from(cursor,'base64url').toString());}catch{throw Error('INVALID_CURSOR');}if(after.runId!==runId||after.direction!==direction||after.focusId!==focusId||!Number.isInteger(after.units)||!uuid(after.id))throw Error('STALE_OR_WRONG_CURSOR');}
    const opposite=direction==='supplier'?'tender_id':'supplier_id',rows=this.focus(runId,direction,focusId,{candidates:true}).sort((a,b)=>b.units-a.units||a[opposite].localeCompare(b[opposite])).filter(r=>!after||r.units<after.units||r.units===after.units&&r[opposite]>after.id),kept=rows.slice(0,limit),last=kept.at(-1);
    const value={schema:'tendermatch-local-incremental-surface/1.0.0',runId,source:'LOCAL_COORDINATOR_NOT_STAGE8_OR_NEON',results:kept.map(r=>this.detail({tenantId,runId,supplierId:r.supplier_id,tenderId:r.tender_id})),nextCursor:rows.length>limit?Buffer.from(JSON.stringify({runId,direction,focusId,units:last.units,id:last[opposite]})).toString('base64url'):null,cloudRuntime:'UNAVAILABLE_PENDING_STAGE7_AND_APPROVED_PUBLICATION'};
    if(Buffer.byteLength(JSON.stringify(value))>BOUNDS.responseBytes)throw Error('RESPONSE_BUDGET');return value;
  }
  detail({tenantId,runId,supplierId,tenderId}){if(tenantId!==this.tenantId)throw Error('TENANT_MISMATCH');if(!digest(runId)||this.active()?.runId!==runId)throw Error('ACTIVE_VERSION_REQUIRED');if(!uuid(supplierId)||!uuid(tenderId))throw Error('INVALID_PAIR');const row=this.pair(runId,supplierId,tenderId);if(!row)throw Error('PAIR_NOT_ACTIVE');const member=table=>this.db.prepare('SELECT key FROM '+table+' WHERE run_id=? AND supplier_id=? AND tender_id=?').get(runId,supplierId,tenderId)?.key;
    const shortlist=member('shortlist_member'),decision=member('decision_member'),value={supplierId,tenderId,eligibility:this.cached(row.scope_key),formula:row.formula_key?this.cached(row.formula_key):null,retrieval:row.ranking_key?this.cached(row.ranking_key):null,shortlist:shortlist?this.cached(shortlist):null,escalation:decision?this.cached(decision):null,humanDisposition:null,aiTors:null,executionAuthority:false};if(Buffer.byteLength(JSON.stringify(value))>BOUNDS.responseBytes)throw Error('RESPONSE_BUDGET');return value;}
}

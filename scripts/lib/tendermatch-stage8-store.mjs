/** Bounded parameterized adapter over sealed records. No provider or legacy fallback. */
import {SERVICE_VERSION,SERVICE_LIMITS,ServiceError,fail,digest,uuid,intentInput} from '../../packages/tendermatch/src/service-stage8.ts';
import {hash,PROMPT,PROMPT_VERSION,TORS_SCHEMA,assessmentInputIdentity,validateTrigger} from '../../packages/tendermatch/src/escalation-stage7.ts';
import {decodeOutcome,reasonCodes} from '../../packages/tendermatch/src/eligibility-scope.ts';
import {FORMULA,criterionCodes,CRITERION_LIMITATIONS,expandCriterionAudit} from '../../packages/tendermatch/src/formula-stage4-adapter.ts';
import {resultColumns,rowResult} from './tendermatch-formula.mjs';
const METHOD='tendermatch-pair-local-lexical-structured/1.0.0';
export const REQUIRED_MARKERS=['20260906-eligibility-v1','20260906-formula-stage4-v1','20260906-ranking-stage5-v1','20260907-shortlist-stage6-v1','20260907-escalation-stage7-v1'];
export const REQUIRED_TABLES=['schema_migration',...['eligibility','formula','ranking'].flatMap(p=>[p+'_run',p+'_member',p+'_pair',p+'_completion']), 'formula_input','ranking_profile','shortlist_run','shortlist_pair','shortlist_completion','escalation_plan','escalation_decision','escalation_request','escalation_authorization','escalation_job','escalation_artifact'];
export const HEADER_SQL=`SELECT ep.plan_id "planId",ep.identity "planIdentity",sr.run_id "shortlistRunId",sc.outcome_hash "shortlistOutcomeHash",
 rr.run_id "rankingRunId",rc.outcome_hash "rankingOutcomeHash",rr.method_version "methodVersion",encode(rr.method_hash,'hex') "methodHash",
 fr.run_id "formulaRunId",fc.outcome_hash "formulaOutcomeHash",fr.formula_version "formulaVersion",encode(fr.policy_hash,'hex') "formulaPolicy",
 er.run_id "eligibilityRunId",ec.outcome_hash "eligibilityOutcomeHash",encode(er.policy_hash,'hex') "eligibilityPolicy",
 ec.pair_count::int "universeCount",fc.scored_count::int "candidateCount",fc.unscored_count::int "unscoredCount",
 sc.pair_count::int "shortlistCount",(ep.identity->>'selected')::int "automaticRequests",
 (SELECT count(*)::int FROM tendermatch_retrieval.escalation_request q WHERE q.tenant_id=ep.tenant_id AND q.plan_id=ep.plan_id AND q.kind='AUTOMATIC_REVIEW') "storedAutomaticRequests"
 FROM tendermatch_retrieval.escalation_plan ep
 JOIN tendermatch_retrieval.shortlist_run sr ON sr.tenant_id=ep.tenant_id AND sr.run_id=ep.shortlist_run_id
 JOIN tendermatch_retrieval.shortlist_completion sc ON sc.tenant_id=sr.tenant_id AND sc.run_id=sr.run_id
 JOIN tendermatch_retrieval.ranking_run rr ON rr.tenant_id=sr.tenant_id AND rr.run_id=sr.ranking_run_id
 JOIN tendermatch_retrieval.ranking_completion rc ON rc.tenant_id=rr.tenant_id AND rc.run_id=rr.run_id
 JOIN tendermatch_retrieval.formula_run fr ON fr.tenant_id=rr.tenant_id AND fr.run_id=rr.formula_run_id
 JOIN tendermatch_retrieval.formula_completion fc ON fc.tenant_id=fr.tenant_id AND fc.run_id=fr.run_id
 JOIN tendermatch_retrieval.eligibility_run er ON er.tenant_id=fr.tenant_id AND er.run_id=fr.stage3_run_id
 JOIN tendermatch_retrieval.eligibility_completion ec ON ec.tenant_id=er.tenant_id AND ec.run_id=er.run_id
 WHERE ep.tenant_id=$1 AND ep.plan_id=$2`;
const PIN_KEYS=['planId','shortlistRunId','shortlistOutcomeHash','rankingRunId','rankingOutcomeHash','formulaRunId','formulaOutcomeHash','eligibilityRunId','eligibilityOutcomeHash','methodHash','formulaPolicy','eligibilityPolicy'];
export function pinFromHeader(tenantId,h){return {tenantId,...Object.fromEntries(PIN_KEYS.map(k=>[k,h[k]])),planCodeHash:h.planIdentity.codeHash,allocationHash:h.planIdentity.allocationHash,automaticRequests:h.automaticRequests};}
export function bindPin(input){
  const pin=structuredClone(input);for(const key of [...PIN_KEYS,'planCodeHash','allocationHash'])digest(pin[key]);
  if(!/^[A-Za-z0-9._:@-]{3,128}$/.test(pin.tenantId)||!Number.isInteger(pin.automaticRequests)||pin.automaticRequests<0||pin.automaticRequests>500)throw new Error('Invalid explicit service pin');
  return Object.freeze({...pin,bindingId:hash({version:SERVICE_VERSION,pin})});
}
const bytes=h=>Buffer.from(h,'hex');
const dimensions=r=>{
  if(!r)return {state:'NOT_SCORED',formulaVersion:FORMULA,pairScore:null,dataCoverage:null,assessedFitScore:null,evidenceConfidence:null,denominator:100,mainLimitation:null};
  const f=rowResult(r),codes=criterionCodes(f.max[0]===25?'WORKS':'GOODS'),i=f.limitation;
  return {...f,state:'SCORED',formulaVersion:FORMULA,assessedFitState:f.dataCoverage?'ASSESSED_ONLY':'NO_ASSESSED_CRITERIA',evidenceConfidenceState:f.dataCoverage?'ASSESSED_ONLY':'NO_ASSESSED_CRITERIA',mainLimitation:{criterionIndex:i,criterion:codes[i],state:f.states[i]===0?'MISSING':'ASSESSED',limitations:CRITERION_LIMITATIONS.filter((_,bit)=>f.limitationMasks[i]&(1<<bit))}};
};
const human=()=>({value:null,state:'UNAVAILABLE_NO_COMPATIBLE_VERSIONED_HUMAN_CONTRACT',authority:'HUMAN_ONLY'});
const authorization=()=>({state:'NOT_IMPLIED',authorityGranted:false,actualAuthorization:'NOT_LOADED_USE_EXPLICIT_JOB_STATUS'});
const checkedPage=request=>{if(!request||!['supplier','tender'].includes(request.direction))fail(400,'INVALID_FOCUS_DIRECTION');uuid(request.focusId);if(!Number.isInteger(request.limit)||request.limit<1||request.limit>SERVICE_LIMITS.page)fail(400,'INVALID_PAGE_LIMIT');return request;};
const retrieval=r=>r?{methodVersion:METHOD,units:r.relevance_units,relevance:r.relevance_units/1000000,limitationMask:r.limitation_mask,semanticSimilarity:null,semanticState:'MISSING',valueClass:'CALCULATED'}:{methodVersion:METHOD,units:null,relevance:null,semanticSimilarity:null,state:'NOT_RANKED'};
const view=(r,overlay=null)=>({supplierId:r.supplier_id,tenderId:r.tender_id,eligibility:{state:'CANDIDATE_ELIGIBLE_WITH_LIMITATIONS'},formula:dimensions(r),retrieval:retrieval(r),shortlist:overlay?{state:'SHORTLISTED',tier:overlay.tier===1?'REVIEW_CANDIDATE':'AUDIT_ONLY',selection:overlay.selection}:{state:'NOT_STORED_IN_SHORTLIST',tier:null},escalation:overlay?{state:overlay.decision.state,reasons:overlay.decision.reasons,omissions:overlay.decision.omissions,position:overlay.decision.position}:{state:'EXPLICIT_TRIGGER_ONLY',reasons:[],omissions:['NOT_STORED_IN_SHORTLIST'],position:null},executionAuthorization:authorization(),humanDisposition:human(),aiTors:{state:'NOT_LOADED_USE_EXPLICIT_JOB_AND_ARTIFACT',value:null}});

export function rankingQuery(pin,focus,request,after){
  checkedPage(request);
  const direction=request.direction,opposite=direction==='supplier'?'tender':'supplier';
  if(!['supplier','tender'].includes(direction))fail(400,'INVALID_FOCUS_DIRECTION');
  return {text:`WITH page AS MATERIALIZED (
   SELECT r.* FROM tendermatch_retrieval.ranking_pair r JOIN tendermatch_retrieval.ranking_member m ON m.tenant_id=r.tenant_id AND m.run_id=$2 AND m.kind='${opposite}' AND m.profile_key=r.${opposite}_profile
   WHERE r.tenant_id=$1 AND r.method_hash=$3 AND r.formula_policy=$4 AND r.${direction}_profile=$5
   AND ($6::int IS NULL OR r.relevance_units<$6 OR (r.relevance_units=$6 AND r.${opposite}_id>$7::uuid))
   ORDER BY r.relevance_units DESC,r.${opposite}_id LIMIT $8)
   SELECT p.supplier_id::text,p.tender_id::text,encode(p.supplier_profile,'hex') supplier_profile,encode(p.tender_profile,'hex') tender_profile,
   p.relevance_units,p.limitation_mask,${resultColumns.split(',').map(x=>'f.'+x).join(',')}
   FROM page p JOIN LATERAL (SELECT ${resultColumns} FROM tendermatch_retrieval.formula_pair f WHERE f.tenant_id=p.tenant_id AND f.policy_hash=p.formula_policy AND f.supplier_key=p.supplier_key AND f.tender_key=p.tender_key LIMIT 1) f ON true
   ORDER BY p.relevance_units DESC,p.${opposite}_id`,values:[pin.tenantId,pin.rankingRunId,bytes(pin.methodHash),bytes(pin.formulaPolicy),focus,after?.units??null,after?.id??null,request.limit+1]};
}

export function createStage8Store({connect,pins,cursors,connectionLimit=2}){
  if(typeof connect!=='function'||!cursors||!Array.isArray(pins)||!pins.length||pins.length>1000||![1,2].includes(connectionLimit))throw new Error('Explicit bounded dependencies required');
  const configured=new Map(pins.map(p=>{const bound=bindPin(p);return [bound.tenantId,bound];}));if(configured.size!==pins.length)throw new Error('Duplicate tenant binding');let active=0;
  const metadata=(pin,h)=>({version:SERVICE_VERSION,bindingId:pin.bindingId,planId:pin.planId,shortlistRunId:pin.shortlistRunId,rankingRunId:pin.rankingRunId,formulaRunId:pin.formulaRunId,eligibilityRunId:pin.eligibilityRunId,population:{universe:h.universeCount,candidates:h.candidateCount,unscored:h.unscoredCount,shortlist:h.shortlistCount},capabilities:{provider:'UNCONFIGURED',intentBoundaryAvailable:true,requestScopeRequired:true,executionAuthority:false,automaticMatchDecision:false}});
  async function transaction(principal,bindingId,write,action){
    const pin=configured.get(principal.tenantId);if(!pin)fail(403,'TENANT_NOT_CONFIGURED');if(bindingId!==pin.bindingId)fail(409,'PINNED_VERSION_REQUIRED');if(active>=connectionLimit)fail(503,'BOUNDED_SERVICE_BUSY');active++;
    let c,began=false;try{
      c=await connect();await c.query(write?'BEGIN':'BEGIN READ ONLY');began=true;
      await c.query("SELECT set_config('tendermatch.tenant_id',$1,true),set_config('statement_timeout',$2,true)",[pin.tenantId,String(SERVICE_LIMITS.statementMs)]);
      const [role]=(await c.query('SELECT rolsuper,rolbypassrls FROM pg_roles WHERE rolname=current_user')).rows;if(!role||role.rolsuper||role.rolbypassrls)fail(503,'UNSAFE_BACKEND_ROLE');
      const relations=(await c.query('SELECT name,to_regclass($2||name)::text relation FROM unnest($1::text[]) name',[REQUIRED_TABLES,'tendermatch_retrieval.'])).rows;
      if(relations.some(r=>!r.relation))fail(503,'PINNED_SCHEMA_UNAVAILABLE');
      const markers=(await c.query('SELECT version FROM tendermatch_retrieval.schema_migration WHERE version=ANY($1::text[])',[REQUIRED_MARKERS])).rows;if(markers.length!==REQUIRED_MARKERS.length)fail(503,'REQUIRED_MIGRATION_UNAVAILABLE');
      const [h]=(await c.query(HEADER_SQL,[pin.tenantId,pin.planId])).rows;if(!h)fail(503,'PINNED_PIPELINE_INCOMPLETE');
      if(hash(h.planIdentity)!==pin.planId||h.planIdentity.codeHash!==pin.planCodeHash||h.planIdentity.allocationHash!==pin.allocationHash||PIN_KEYS.some(k=>h[k]!==pin[k])||h.formulaVersion!==FORMULA||h.methodVersion!==METHOD||h.automaticRequests!==pin.automaticRequests||h.storedAutomaticRequests!==pin.automaticRequests)fail(503,'PINNED_PIPELINE_IDENTITY_MISMATCH');
      const result=await action(c,pin,h);await c.query(write?'COMMIT':'ROLLBACK');began=false;return {context:metadata(pin,h),...result};
    }catch(error){if(began)await c.query('ROLLBACK').catch(()=>{});if(error instanceof ServiceError)throw error;if(error.message?.includes('Hard durable request budget exhausted'))fail(409,'REQUEST_BUDGET_EXHAUSTED');if(error.code==='23505')fail(409,'IMMUTABLE_INTENT_CONFLICT');fail(503,'SEALED_BACKEND_UNAVAILABLE');}
    finally{try{await c?.end?.();}finally{active--;}}
  }
  async function overlays(c,pin,supplierIds,tenderIds){return (await c.query(`SELECT d.supplier_id::text,d.tender_id::text,d.decision,p.selection,p.tier FROM tendermatch_retrieval.escalation_decision d JOIN tendermatch_retrieval.shortlist_pair p USING(tenant_id,pair_key) WHERE d.tenant_id=$1 AND d.plan_id=$2 AND d.supplier_id=ANY($3::uuid[]) AND d.tender_id=ANY($4::uuid[]) LIMIT 101`,[pin.tenantId,pin.planId,supplierIds,tenderIds])).rows;}
  async function selected(c,pin,supplierId,tenderId){
    uuid(supplierId);uuid(tenderId);
    const [e]=(await c.query(`SELECT p.state,p.reasons,p.hard_gate,p.scope_relation,p.service_potential FROM tendermatch_retrieval.eligibility_member s JOIN tendermatch_retrieval.eligibility_member t ON t.tenant_id=s.tenant_id AND t.run_id=s.run_id AND t.kind='tender' AND t.entity_id=$4 JOIN tendermatch_retrieval.eligibility_pair p ON p.tenant_id=s.tenant_id AND p.policy_hash=$5 AND p.supplier_key=s.input_key AND p.tender_key=t.input_key WHERE s.tenant_id=$1 AND s.run_id=$2 AND s.kind='supplier' AND s.entity_id=$3`,[pin.tenantId,pin.eligibilityRunId,supplierId,tenderId,bytes(pin.eligibilityPolicy)])).rows;
    if(!e)fail(404,'PAIR_NOT_IN_PINNED_UNIVERSE');const {scoringState,...eligibility}=decodeOutcome([e.state,e.reasons,e.hard_gate,e.scope_relation,e.service_potential]);void scoringState;eligibility.reasons=reasonCodes(e.reasons);
    if(e.state!==3)return {supplierId,tenderId,eligibility,formula:dimensions(null),retrieval:retrieval(null),shortlist:{state:'NOT_A_FORMULA_CANDIDATE',tier:null},escalation:{state:'NOT_REQUESTABLE',reasons:[],omissions:[eligibility.state]},executionAuthorization:authorization(),humanDisposition:human(),aiTors:{state:'NOT_LOADED',value:null},criteria:[]};
    const [r]=(await c.query(`SELECT r.supplier_id::text,r.tender_id::text,encode(r.supplier_profile,'hex') supplier_profile,encode(r.tender_profile,'hex') tender_profile,r.relevance_units,r.limitation_mask,${resultColumns.split(',').map(x=>'f.'+x).join(',')}
     FROM tendermatch_retrieval.ranking_member s JOIN tendermatch_retrieval.ranking_member t ON t.tenant_id=s.tenant_id AND t.run_id=s.run_id AND t.kind='tender' AND t.entity_id=$4
     JOIN tendermatch_retrieval.ranking_pair r ON r.tenant_id=s.tenant_id AND r.method_hash=$5 AND r.formula_policy=$6 AND r.supplier_profile=s.profile_key AND r.tender_profile=t.profile_key
     JOIN tendermatch_retrieval.formula_pair f ON f.tenant_id=r.tenant_id AND f.policy_hash=r.formula_policy AND f.supplier_key=r.supplier_key AND f.tender_key=r.tender_key
     WHERE s.tenant_id=$1 AND s.run_id=$2 AND s.kind='supplier' AND s.entity_id=$3`,[pin.tenantId,pin.rankingRunId,supplierId,tenderId,bytes(pin.methodHash),bytes(pin.formulaPolicy)])).rows;
    if(!r)fail(503,'PINNED_FORMULA_CANDIDATE_MISSING');const [overlay]=await overlays(c,pin,[supplierId],[tenderId]),projections=(await c.query(`SELECT p.kind,encode(p.profile_key,'hex') profile_key,encode(i.input_key,'hex') input_key,i.projection FROM tendermatch_retrieval.ranking_profile p JOIN tendermatch_retrieval.formula_input i ON i.tenant_id=p.tenant_id AND i.input_key=p.input_key WHERE p.tenant_id=$1 AND p.profile_key=ANY($2::bytea[])`,[pin.tenantId,[bytes(r.supplier_profile),bytes(r.tender_profile)]])).rows;
    if(projections.length!==2)fail(503,'PINNED_EVIDENCE_MISSING');const s=projections.find(p=>p.kind==='supplier'),t=projections.find(p=>p.kind==='tender');
    return {...view(r,overlay),eligibility,criteria:expandCriterionAudit(rowResult(r),s.projection,t.projection),_profiles:{supplier:r.supplier_profile,tender:r.tender_profile},_projections:[s,t]};
  }
  const publicDetail=p=>{const {_profiles,_projections,...out}=p;void _profiles;void _projections;return out;};
  const jobsSql=`SELECT j.job_id,j.request_id,j.input_hash,j.provider_version,j.model_version,j.prompt_version,j.schema_version,j.state,j.attempts,j.revision,j.last_error,j.artifact_id,j.input_tokens,j.output_tokens,j.cost_microusd FROM tendermatch_retrieval.escalation_job j WHERE j.tenant_id=$1 AND EXISTS(SELECT 1 FROM tendermatch_retrieval.escalation_request r WHERE r.tenant_id=j.tenant_id AND r.plan_id=$2 AND r.input_hash=j.input_hash) AND j.prompt_version=$3 AND j.schema_version=$4`;
  return {
    bindings:()=>[...configured.values()].map(p=>({...p})),
    health:(principal,binding)=>transaction(principal,binding,false,async()=>({state:'AVAILABLE_SEALED_BOUNDARY',modelCalls:0})),
    page:(principal,binding,request)=>transaction(principal,binding,false,async(c,pin)=>{
      checkedPage(request);
      const [focus]=(await c.query('SELECT profile_key FROM tendermatch_retrieval.ranking_member WHERE tenant_id=$1 AND run_id=$2 AND kind=$3 AND entity_id=$4',[pin.tenantId,pin.rankingRunId,request.direction,request.focusId])).rows;if(!focus)fail(404,'FOCUS_NOT_IN_PINNED_RUN');
      const scope=hash([SERVICE_VERSION,pin.tenantId,pin.bindingId,request.direction,request.focusId]),after=cursors.decode(request.cursor,scope),spec=rankingQuery(pin,focus.profile_key,request,after),raw=(await c.query(spec.text,spec.values)).rows,hasMore=raw.length>request.limit,rows=raw.slice(0,request.limit),layer=rows.length?await overlays(c,pin,[...new Set(rows.map(p=>p.supplier_id))],[...new Set(rows.map(p=>p.tender_id))]):[],map=new Map(layer.map(p=>[p.supplier_id+':'+p.tender_id,p])),last=rows.at(-1),opposite=request.direction==='supplier'?'tender':'supplier';
      return {direction:request.direction,focusId:request.focusId,results:rows.map(p=>view(p,map.get(p.supplier_id+':'+p.tender_id))),hasMore,nextCursor:hasMore?cursors.encode(scope,last.relevance_units,last[opposite+'_id']):null,ordering:'RETRIEVAL_UNITS_DESC_THEN_OPPOSITE_UUID',maximumPage:SERVICE_LIMITS.page};
    }),
    detail:(principal,binding,supplierId,tenderId)=>transaction(principal,binding,false,async(c,pin)=>({pair:publicDetail(await selected(c,pin,supplierId,tenderId))})),
    intent:(principal,binding,input)=>transaction(principal,binding,true,async(c,pin)=>{
      const {requestId:inputRequestId,...body}=input;intentInput(body,inputRequestId);if(!principal.scopes?.includes(input.kind==='AUDIT_REQUEST'?'request-audit':'request-review'))fail(403,'SCOPE_REQUIRED');
      const p=await selected(c,pin,input.supplierId,input.tenderId);if(p.eligibility.state!=='CANDIDATE_ELIGIBLE_WITH_LIMITATIONS')fail(409,'PAIR_NOT_REQUESTABLE');if(p.shortlist.tier==='AUDIT_ONLY'&&input.kind!=='AUDIT_REQUEST')fail(403,'AUDIT_TRIGGER_REQUIRED');
      const trigger=validateTrigger({kind:input.kind,actor:principal.subject,requestId:input.requestId,justification:input.justification},p.shortlist.tier==='AUDIT_ONLY'?2:p.shortlist.tier==='REVIEW_CANDIDATE'?1:null),identity=assessmentInputIdentity({supplierId:input.supplierId,tenderId:input.tenderId,supplierProfile:p._profiles.supplier,tenderProfile:p._profiles.tender,methodHash:pin.methodHash,formulaPolicy:pin.formulaPolicy}),evidence=p._projections.map(v=>({id:'formula-input:'+v.input_key,content:{kind:v.kind,projection:v.projection}})),frozen={identity,evidence,prompt:PROMPT,schemaVersion:TORS_SCHEMA},inputHash=hash(frozen),requestId=hash([pin.planId,input.supplierId,input.tenderId,trigger,inputHash]);
      if(Buffer.byteLength(JSON.stringify(frozen))>131072)fail(413,'FROZEN_INPUT_BUDGET_EXCEEDED');
      await c.query('SELECT pg_advisory_xact_lock(hashtextextended($1,0))',[pin.tenantId+pin.planId]);
      const prior=(await c.query(`SELECT request_id,input_hash,trigger FROM tendermatch_retrieval.escalation_request WHERE tenant_id=$1 AND plan_id=$2 AND trigger->>'actor'=$3 AND trigger->>'requestId'=$4 LIMIT 2`,[pin.tenantId,pin.planId,principal.subject,input.requestId])).rows;
      if(prior.length&&(prior.length!==1||prior[0].request_id!==requestId||prior[0].input_hash!==inputHash||hash(prior[0].trigger)!==hash(trigger)))fail(409,'IDEMPOTENCY_CONFLICT');
      if(!prior.length)await c.query(`INSERT INTO tendermatch_retrieval.escalation_request(tenant_id,request_id,plan_id,supplier_id,tender_id,method_hash,formula_policy,supplier_profile,tender_profile,kind,trigger,input_hash,input_json) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)`,[pin.tenantId,requestId,pin.planId,input.supplierId,input.tenderId,bytes(pin.methodHash),bytes(pin.formulaPolicy),bytes(p._profiles.supplier),bytes(p._profiles.tender),input.kind,JSON.stringify(trigger),inputHash,JSON.stringify(frozen)]);
      return {intent:{requestId,kind:input.kind,state:'RECORDED',actor:principal.subject,inputHash,reused:!!prior.length,executionAuthorization:'NOT_IMPLIED',queuedExecutions:0,modelCalls:0}};
    }),
    requestStatus:(principal,binding,requestId)=>transaction(principal,binding,false,async(c,pin)=>{
      digest(requestId);
      const [request]=(await c.query(`SELECT request_id,supplier_id::text,tender_id::text,kind,trigger,input_hash,created_at FROM tendermatch_retrieval.escalation_request WHERE tenant_id=$1 AND plan_id=$2 AND request_id=$3`,[pin.tenantId,pin.planId,requestId])).rows;if(!request)fail(404,'REQUEST_NOT_IN_PINNED_PLAN');
      const jobs=(await c.query(jobsSql+' AND j.input_hash=$5 ORDER BY j.job_id LIMIT 11',[pin.tenantId,pin.planId,PROMPT_VERSION,TORS_SCHEMA,request.input_hash])).rows;return {request:{...request,state:'RECORDED',executionAuthorization:'NOT_IMPLIED'},jobs:jobs.slice(0,10),moreJobs:jobs.length>10};
    }),
    job:(principal,binding,jobId)=>transaction(principal,binding,false,async(c,pin)=>{digest(jobId);const [job]=(await c.query(jobsSql+' AND j.job_id=$5',[pin.tenantId,pin.planId,PROMPT_VERSION,TORS_SCHEMA,jobId])).rows;if(!job)fail(404,'JOB_NOT_IN_PINNED_INPUTS');return {job};}),
    artifact:(principal,binding,jobId,artifactId)=>transaction(principal,binding,false,async(c,pin)=>{
      digest(jobId);digest(artifactId);
      const [job]=(await c.query(jobsSql+" AND j.job_id=$5 AND j.state='SUCCEEDED' AND j.artifact_id=$6",[pin.tenantId,pin.planId,PROMPT_VERSION,TORS_SCHEMA,jobId,artifactId])).rows;if(!job)fail(404,'ARTIFACT_NOT_IN_PINNED_INPUTS');const [artifact]=(await c.query('SELECT artifact_id,job_id,input_hash,output,validated_at FROM tendermatch_retrieval.escalation_artifact WHERE tenant_id=$1 AND job_id=$2 AND artifact_id=$3 AND input_hash=$4',[pin.tenantId,jobId,artifactId,job.input_hash])).rows;if(!artifact)fail(503,'COMPLETED_ARTIFACT_MISSING');return {job,artifact};
    }),
  };
}

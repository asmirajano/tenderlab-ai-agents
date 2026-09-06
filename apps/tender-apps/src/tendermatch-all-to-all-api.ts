/** Browser-only bounded Stage 8 transport. No DB, static snapshot or provider path. */
export const ALL_TO_ALL_VERSION = "tendermatch-sealed-service/1.0.0";
export const ALL_TO_ALL_FORMULA = "tendermatch-match-formula/1.1.0";
export const ALL_TO_ALL_PREFIX = "/api/tendermatch/all-to-all/v1";
export const ALL_TO_ALL_LIMITS = { page: 100, responseBytes: 524288, bodyBytes: 8192, timeoutMs: 8000 } as const;
export type DevelopmentSession = { schemaVersion: "tendermatch-browser-session/1.0.0"; sourceMode: "synthetic-local-postgresql" | "isolated-development-stage8"; bindingId: string; token: string; csrfToken: string; subject: string; scopes: string[]; expiresAt: number; initialSupplierId: string; initialTenderId: string };
export type Pair = {
  supplierId: string; tenderId: string; eligibility: { state: string; reasons?: string[] };
  formula: { state: "SCORED" | "NOT_SCORED"; formulaVersion: string; pairScore: number | null; dataCoverage: number | null; assessedFitScore: number | null; assessedFitState?: string; evidenceConfidence: number | null; evidenceConfidenceState?: string; denominator: 100; fit?: (number | null)[]; states?: number[]; points?: number[]; max?: number[]; mainLimitation: { criterion: string; state: string; limitations: string[] } | null };
  retrieval: { units: number | null; relevance: number | null; methodVersion: string; semanticSimilarity: null };
  shortlist: { state: string; tier: "REVIEW_CANDIDATE" | "AUDIT_ONLY" | null };
  escalation: { state: string; reasons: string[]; omissions: string[]; position?: number | null };
  executionAuthorization: { state: string; authorityGranted: false; actualAuthorization: string };
  humanDisposition: { value: null | string; state: string; authority: "HUMAN_ONLY" };
  aiTors: { state: string; value: null };
  criteria?: { code: string; state: "MISSING" | "ASSESSED"; fit: number | null; points: number; maxPoints: number; evidenceConfidence: number | null; references: { id: string; [key: string]: unknown }[]; limitations: string[]; mainLimitation: boolean }[];
};
export type Context = { version: string; bindingId: string; planId: string; formulaRunId: string; rankingRunId: string; shortlistRunId: string; eligibilityRunId: string; population: { universe: number; candidates: number; unscored: number; shortlist: number }; capabilities: { provider: string; executionAuthority: false; automaticMatchDecision: false } };
export type Page = { context: Context; direction: "supplier" | "tender"; focusId: string; results: Pair[]; hasMore: boolean; nextCursor: string | null; maximumPage: number };
export type IntentInput = { supplierId: string; tenderId: string; kind: "USER_REVIEW" | "REPORT_REQUEST" | "AUDIT_REQUEST"; justification: string };
export type IntentReceipt = { requestId: string; kind: IntentInput["kind"]; state: "RECORDED"; actor: string; inputHash: string; reused: boolean; executionAuthorization: "NOT_IMPLIED"; queuedExecutions: 0; modelCalls: 0 };
export type Job = { job_id: string; input_hash: string; state: string; provider_version: string; model_version: string; prompt_version: string; schema_version: string; artifact_id: string | null; input_tokens: number | null; output_tokens: number | null; cost_microusd: number | null };
export type Status = { context: Context; request: { request_id: string; kind: string; state: string; executionAuthorization: string }; jobs: Job[]; moreJobs: boolean };
export class AllToAllError extends Error { code: string; status: number; constructor(code: string, status = 0) { super(code); this.code = code; this.status = status; } }
const invalid = (): never => { throw new AllToAllError("INVALID_VERSIONED_RESPONSE"); };
export const canonicalId = (v: unknown): v is string => typeof v === "string" && /^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/.test(v);
const digest = (v: unknown): v is string => typeof v === "string" && /^[a-f0-9]{64}$/.test(v);
const number = (v: unknown): v is number => typeof v === "number" && Number.isFinite(v) && v >= 0 && v <= 100;
const text = (v: unknown): v is string => typeof v === 'string' && v.length > 0 && v.length <= 2000;
const textList = (v: unknown): v is string[] => Array.isArray(v) && v.length <= 64 && v.every(text);
export const readable = (value: string | null | undefined) => value ? value.replaceAll("_", " ").replaceAll("-", " ").toLowerCase().replace(/^./, s => s.toUpperCase()) : "Not available";
export const metric = (value: number | null | undefined, percent = false) => value === null || value === undefined ? "Not scored" : String(value) + (percent ? "%" : "");
export function validateDevelopmentSession(value: unknown, now = Date.now()): DevelopmentSession {
  const s = value as DevelopmentSession;
  if (!s || s.schemaVersion !== "tendermatch-browser-session/1.0.0" || !["synthetic-local-postgresql", "isolated-development-stage8"].includes(s.sourceMode) || !digest(s.bindingId) || !/^[A-Za-z0-9_-]{43,256}$/.test(s.token) || !/^[A-Za-z0-9_-]{43,256}$/.test(s.csrfToken) || s.token === s.csrfToken || !/^[A-Za-z0-9._:@-]{3,128}$/.test(s.subject) || !Array.isArray(s.scopes) || !s.scopes.includes("read") || s.scopes.some(v => !["read", "request-review", "request-audit", "assessment-read"].includes(v)) || !Number.isSafeInteger(s.expiresAt) || s.expiresAt <= now || s.expiresAt > now + 86400000 || !canonicalId(s.initialSupplierId) || !canonicalId(s.initialTenderId)) throw new AllToAllError("DEVELOPMENT_SESSION_UNAVAILABLE");
  return Object.freeze({ ...s, scopes: [...s.scopes] });
}
export function validatePair(value: unknown): Pair {
  const p = value as Pair, f = p?.formula;
  if (!p || !canonicalId(p.supplierId) || !canonicalId(p.tenderId) || !["OUTSIDE_FORMULA_V1_1_SCOPE", "NEEDS_EVIDENCE", "SCOPE_NOT_DEMONSTRATED", "CANDIDATE_ELIGIBLE_WITH_LIMITATIONS", "HARD_EXCLUDED"].includes(p.eligibility?.state) || !f || f.formulaVersion !== ALL_TO_ALL_FORMULA || f.denominator !== 100 || !p.retrieval || !p.shortlist || ![null, "REVIEW_CANDIDATE", "AUDIT_ONLY"].includes(p.shortlist.tier) || typeof p.escalation?.state !== "string" || !Array.isArray(p.escalation.reasons) || !Array.isArray(p.escalation.omissions) || p.executionAuthorization?.authorityGranted !== false || p.humanDisposition?.authority !== "HUMAN_ONLY" || p.aiTors?.value !== null || p.retrieval.semanticSimilarity !== null) return invalid();
  if (p.eligibility.state === "CANDIDATE_ELIGIBLE_WITH_LIMITATIONS") {
    if (f.state !== "SCORED" || ![f.pairScore, f.dataCoverage, f.assessedFitScore, f.evidenceConfidence].every(number) || !Number.isInteger(p.retrieval.units) || p.retrieval.units! < 0 || p.retrieval.units! > 1000000 || p.retrieval.relevance !== p.retrieval.units! / 1000000 || ![f.fit, f.states, f.points, f.max].every(a => Array.isArray(a) && a.length === 5) || f.max!.reduce((a,b)=>a+b,0) !== 100 || f.points!.reduce((a,b)=>a+b,0) !== f.pairScore) return invalid();
    for (let i=0;i<5;i++) if (!number(f.points![i]) || f.points![i] > f.max![i] || ![0,1].includes(f.states![i]) || f.states![i] === 0 && (f.fit![i] !== null || f.points![i] !== 0) || f.states![i] === 1 && (f.fit![i] === null || f.fit![i]! < 0 || f.fit![i]! > 5)) return invalid();
  } else if (f.state !== "NOT_SCORED" || [f.pairScore,f.dataCoverage,f.assessedFitScore,f.evidenceConfidence,p.retrieval.units,p.retrieval.relevance].some(v=>v!==null)) return invalid();
  if (!text(p.shortlist.state)||!text(p.humanDisposition.state)||p.humanDisposition.value!==null&&!text(p.humanDisposition.value)||!text(p.aiTors.state)||!textList(p.escalation.reasons)||!textList(p.escalation.omissions)||p.eligibility.reasons&&!textList(p.eligibility.reasons)||p.retrieval.methodVersion!=='tendermatch-pair-local-lexical-structured/1.0.0'||f.mainLimitation&&(!text(f.mainLimitation.criterion)||!textList(f.mainLimitation.limitations)))return invalid();
  if (p.criteria && (!Array.isArray(p.criteria) || p.criteria.length > 5 || p.criteria.some((c,i) => !text(c.code)||!['MISSING','ASSESSED'].includes(c.state)||!number(c.points)||!number(c.maxPoints)||c.evidenceConfidence!==null&&!number(c.evidenceConfidence)||!textList(c.limitations)||!Array.isArray(c.references)||c.references.length>1000||c.references.some(r=>!r||!text(r.id))||c.state === "MISSING" && (c.fit !== null || c.points !== 0)||f.state==='SCORED'&&(c.fit!==f.fit![i]||c.points!==f.points![i]||c.maxPoints!==f.max![i])))) return invalid();
  return p;
}
function context(value: unknown, session: DevelopmentSession): Context {
  const c = value as Context;
  if (!c || c.version !== ALL_TO_ALL_VERSION || c.bindingId !== session.bindingId || ![c.planId,c.formulaRunId,c.rankingRunId,c.shortlistRunId,c.eligibilityRunId].every(digest) || !c.population || [c.population.universe,c.population.candidates,c.population.unscored,c.population.shortlist].some(v=>!Number.isSafeInteger(v)||v<0) || c.population.candidates+c.population.unscored !== c.population.universe || c.capabilities?.executionAuthority !== false || c.capabilities?.automaticMatchDecision !== false) return invalid();
  return c;
}
export function validatePage(value: unknown, session: DevelopmentSession, direction: "supplier" | "tender", focusId: string, limit: number): Page {
  const p = value as Page; context(p?.context,session);
  if (p.direction!==direction||p.focusId!==focusId||!Array.isArray(p.results)||p.results.length>limit||p.maximumPage!==100||typeof p.hasMore!=="boolean"||p.hasMore!==(typeof p.nextCursor==="string")||p.nextCursor!==null&&p.nextCursor.length>1024) return invalid();
  const seen=new Set();let previous:Pair|undefined;for(const row of p.results){validatePair(row);if(row.eligibility.state!=="CANDIDATE_ELIGIBLE_WITH_LIMITATIONS"||row[direction+"Id" as "supplierId"|"tenderId"]!==focusId) return invalid();const key=row.supplierId+row.tenderId;if(seen.has(key))return invalid();seen.add(key);const opposite=direction==='supplier'?'tenderId':'supplierId';if(previous&&(previous.retrieval.units!<row.retrieval.units!||previous.retrieval.units===row.retrieval.units&&previous[opposite]>=row[opposite]))return invalid();previous=row;}
  return p;
}
export function createAllToAllClient(sessionInput: DevelopmentSession, fetcher: typeof fetch = fetch, timeoutMs: number = ALL_TO_ALL_LIMITS.timeoutMs) {
  const session=validateDevelopmentSession(sessionInput),keys=new Map<string,string>();
  async function request(path: string, signal?: AbortSignal, input?: IntentInput, key?: string) {
    if (Date.now()>=session.expiresAt) throw new AllToAllError("INVALID_OR_EXPIRED_SESSION",401);
    const controller=new AbortController(),abort=()=>controller.abort(),timer=setTimeout(()=>controller.abort(new AllToAllError("API_TIMEOUT")),timeoutMs);signal?.addEventListener('abort',abort,{once:true});if(signal?.aborted)abort();
    try {
      const body=input?JSON.stringify(input):undefined;if(body&&new TextEncoder().encode(body).length>8192)throw new AllToAllError('REQUEST_BODY_TOO_LARGE');
      const response=await fetcher(ALL_TO_ALL_PREFIX+path+(path.includes('?')?'&':'?')+'binding='+session.bindingId,{method:input?'POST':'GET',signal:controller.signal,credentials:'omit',cache:'no-store',redirect:'error',headers:{Authorization:'Bearer '+session.token,...(input?{'Content-Type':'application/json','X-CSRF-Token':session.csrfToken,'Idempotency-Key':key!}:{})},...(body?{body}:{})});
      if (!response.headers.get('content-type')?.includes('application/json')) throw new AllToAllError('API_UNAVAILABLE',response.status);
      if (Number(response.headers.get('content-length')??0)>524288)throw new AllToAllError('RESPONSE_BUDGET_EXCEEDED');
      const reader=response.body?.getReader();if(!reader)throw new AllToAllError('INVALID_VERSIONED_RESPONSE');const chunks:Uint8Array[]=[];let size=0;
      while(true){const next=await reader.read();if(next.done)break;size+=next.value.length;if(size>524288){await reader.cancel();throw new AllToAllError('RESPONSE_BUDGET_EXCEEDED');}chunks.push(next.value);}
      const combined=new Uint8Array(size);let offset=0;for(const chunk of chunks){combined.set(chunk,offset);offset+=chunk.length;}const value=JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(combined));
      if(!response.ok){const code=typeof value?.error?.code==='string'&&/^[A-Z_]{3,80}$/.test(value.error.code)?value.error.code:'API_UNAVAILABLE';throw new AllToAllError(code,response.status);}context(value.context,session);return value;
    } catch(error) {const timedOut=controller.signal.aborted;controller.abort();if(signal?.aborted)throw new AllToAllError('REQUEST_CANCELLED');if(timedOut)throw new AllToAllError('API_TIMEOUT');if(error instanceof AllToAllError)throw error;throw new AllToAllError('API_UNAVAILABLE');}
    finally{clearTimeout(timer);signal?.removeEventListener('abort',abort);}
  }
  return {
    health:async(signal?:AbortSignal)=>{const value=await request('/health',signal);if(value.state!=='AVAILABLE_SEALED_BOUNDARY'||value.modelCalls!==0)return invalid();return value.context as Context;},
    page:async(direction:'supplier'|'tender',focusId:string,cursor:string|null=null,limit=25,signal?:AbortSignal)=>{if(!['supplier','tender'].includes(direction)||!canonicalId(focusId)||!Number.isInteger(limit)||limit<1||limit>100||cursor!==null&&cursor.length>1024)throw new AllToAllError('INVALID_PAGE_QUERY');const q=new URLSearchParams({limit:String(limit)});if(cursor)q.set('cursor',cursor);return validatePage(await request('/'+direction+'s/'+focusId+'/results?'+q,signal),session,direction,focusId,limit);},
    detail:async(supplierId:string,tenderId:string,signal?:AbortSignal)=>{if(!canonicalId(supplierId)||!canonicalId(tenderId))throw new AllToAllError('INVALID_CANONICAL_ID');const value=await request('/pairs/'+supplierId+'/'+tenderId,signal),pair=validatePair(value.pair);if(pair.supplierId!==supplierId||pair.tenderId!==tenderId)return invalid();return pair;},
    intent:async(input:IntentInput)=>{if(!canonicalId(input.supplierId)||!canonicalId(input.tenderId)||!['USER_REVIEW','REPORT_REQUEST','AUDIT_REQUEST'].includes(input.kind)||input.justification.trim().length<3||input.justification.length>2000)throw new AllToAllError('ATTRIBUTED_INTENT_REQUIRED');const identity=JSON.stringify(input);let key=keys.get(identity);if(!key){key='stage9-'+crypto.randomUUID();keys.set(identity,key);while(keys.size>20)keys.delete(keys.keys().next().value!);}const value=await request('/intents',undefined,input,key),r=value.intent as IntentReceipt;if(!r||!digest(r.requestId)||!digest(r.inputHash)||r.kind!==input.kind||r.actor!==session.subject||r.state!=='RECORDED'||r.executionAuthorization!=='NOT_IMPLIED'||r.queuedExecutions!==0||r.modelCalls!==0||typeof r.reused!=='boolean')return invalid();return r;},
    status:async(requestId:string,signal?:AbortSignal)=>{if(!digest(requestId))throw new AllToAllError('INVALID_REQUEST_ID');const value=await request('/intents/'+requestId,signal) as Status;if(value.request?.request_id!==requestId||!Array.isArray(value.jobs)||value.jobs.length>10||typeof value.moreJobs!=='boolean'||value.jobs.some(j=>!digest(j.job_id)||!digest(j.input_hash)))return invalid();return value;},
  };
}
export type AllToAllClient=ReturnType<typeof createAllToAllClient>;
export function errorExplanation(error: unknown): { code: string; message: string; staleCursor: boolean } {
  const code=error instanceof AllToAllError?error.code:'API_UNAVAILABLE';
  const messages:Record<string,string>={DEVELOPMENT_SESSION_UNAVAILABLE:'An authenticated development session and exact version binding have not been provisioned. Ask the local runtime operator to configure them; database credentials never belong in this browser.',API_TIMEOUT:'The bounded API request timed out. Retry a read or the same attributed intent; a timeout does not prove that an intent was not recorded.',INVALID_OR_EXPIRED_SESSION:'This development session has expired. Ask the runtime operator for a new authenticated session.',SCOPE_REQUIRED:'This session does not have the required review or assessment permission.',REQUEST_BUDGET_EXHAUSTED:'The plan has reached its 100 on-demand intent cap. Existing exact requests can still be reused; additional execution is not authorized.',AUDIT_TRIGGER_REQUIRED:'This is an audit-only pair. Use an explicit audit request, not a promising-review label.',IDEMPOTENCY_CONFLICT:'This idempotency key already belongs to different intent content. No request was overwritten.',IMMUTABLE_INTENT_CONFLICT:'This pair and intent kind already have an immutable request in this plan. No duplicate was created.',FOCUS_NOT_IN_PINNED_RUN:'That entity is not in the pinned run. Use a canonical supplier or tender ID from the approved development environment.',PAIR_NOT_IN_PINNED_UNIVERSE:'That pair is not in the pinned original population.',PAIR_NOT_REQUESTABLE:'This original outcome is not an eligible Formula candidate. It remains inspectable but cannot use this escalation path.',INVALID_VERSIONED_RESPONSE:'The response did not satisfy the sealed version, identity or score contract. No records were substituted.',SESSION_RATE_LIMIT:'This session has reached its 120 requests per minute limit. Wait for the next minute and retry.',BOUNDED_SERVICE_BUSY:'The development service is at its bounded connection capacity. Retry without changing the intent key.'};
  const staleCursor=['INVALID_CURSOR','CURSOR_SCOPE_OR_EXPIRY','PINNED_VERSION_REQUIRED'].includes(code);
  return {code,staleCursor,message:staleCursor?'The cursor or version is stale or belongs to another focus. Start from the first page; no static data will be substituted.':messages[code]??'The sealed development environment is unavailable. The operator must install and verify Stage 7, its exact pinned plan and the authenticated Stage 8 API. No static snapshot or full matrix was loaded.'};
}

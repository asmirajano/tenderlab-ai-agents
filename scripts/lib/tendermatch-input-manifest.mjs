/** Stage 1: inventory only. No eligibility, feature extraction or scoring imports. */
import { createHash } from "node:crypto";
import { DEV_TARGET as T, assertManifest, assertRestrictedRole, profilePageQuery } from "./tendermatch-dev-contract.mjs";

export const VERSION = "tendermatch-input-manifest/1.0.0";
export const ADAPTER = "tendermatch-input-capture/1.0.0";
export const TENANT = "tendermatch-development-stage1";
export const TENDER = Object.freeze({ projectId: "solitary-darkness-82235346", project: "TenderLab", branch: "backup/pre-mvp-rc1-20260726", branchId: "br-morning-water-atqp6w7c", host: "ep-aged-feather-atm85iwd-pooler.c-9.us-east-1.aws.neon.tech", database: "neondb", role: "th_qa_readonly", predicate: 'status = \'OPEN\' AND "deletedAt" IS NULL' });
export const SOURCES = Object.freeze({
  supplier: { projectId: T.projectId, branchId: T.branchId, host: T.host, database: T.sourceDatabase, role: T.consumerLogin, schema: T.sourceSchema, contract: T.contractVersion, predicate: T.predicate, profilePins: T.profilePins, documentRole: "AUTHORITATIVE_SOURCE" },
  tender: { ...TENDER, table: "public.tenders", contract: "tendermatch-open-tender-input/1.0.0", documentRole: "AUTHORITATIVE_SOURCE" },
});
export const LIMITS = Object.freeze({ sourceDurationMs: 120000, sourceSkewMs: 900000, registrationAgeMs: 1800000, tenderMaximumRows: 1000000 });
export const HASH_FIELDS = ['id','feedId','sourceId','externalRef','sourceRef','sourceNoticeUrl','contentHash','dataVersion','title','sourceTitle','description','procurementType','status','buyer','financierName','originatingOrganization','primaryCountryId','budgetAmount','budgetCurrency','budgetUsd','publishedAt','deadlineAt','deadlineSourceText','sourceTimezone','sourceUpdatedAt','publishedAtPrecision','firstImportedAt','lastSyncedAt','createdAt','updatedAt','deletedAt'];
export function canonical(value) {
  if (value instanceof Date) return JSON.stringify(value.toISOString());
  if (Array.isArray(value)) return `[${value.map(canonical).join(",")}]`;
  if (value && typeof value === "object") return `{${Object.keys(value).sort().map(k => `${JSON.stringify(k)}:${canonical(value[k])}`).join(",")}}`;
  if (value === undefined || typeof value === "number" && !Number.isFinite(value)) throw new Error("Noncanonical value");
  return JSON.stringify(value);
}
export const sha = value => createHash("sha256").update(canonical(value)).digest("hex");
const md5Ids = ids => createHash("md5").update(ids.join(",")).digest("hex");
const uuid = value => typeof value === "string" && /^[a-f0-9]{8}(-[a-f0-9]{4}){3}-[a-f0-9]{12}$/.test(value);
const hash = value => typeof value === "string" && /^[a-f0-9]{64}$/.test(value);
const tally = values => Object.fromEntries([...new Set(values)].sort().map(v => [v, values.filter(x => x === v).length]));
const exactKeys = (value, keys) => canonical(Object.keys(value).sort()) === canonical([...keys].sort());

export function guardTenderUrl(value) {
  let u; try { u = new URL(value); } catch { throw new Error("Tender credential missing or invalid"); }
  if (!["postgres:","postgresql:"].includes(u.protocol) || u.hostname !== TENDER.host || u.pathname !== "/neondb" || decodeURIComponent(u.username) !== TENDER.role || !u.password || u.hash || u.port && u.port !== "5432") throw new Error("Wrong tender source target");
  if (!["require","verify-full"].includes(u.searchParams.get("sslmode")) || [...u.searchParams.keys()].some(k => !["sslmode","channel_binding"].includes(k)) || u.searchParams.has("channel_binding") && u.searchParams.get("channel_binding") !== "require") throw new Error("Unsafe tender connection option");
  u.searchParams.set("sslmode","verify-full"); u.searchParams.set("channel_binding","require");
  return u;
}

export async function traverse(queryPage, expected, { pageSize = 500, key = row => row.id } = {}) {
  if (!Number.isInteger(expected) || expected < 0 || expected > LIMITS.tenderMaximumRows || !Number.isInteger(pageSize) || pageSize < 1 || pageSize > 1000) throw new Error("Invalid bounded traversal");
  const rows = []; let cursor = null, pages = 0;
  do {
    const page = await queryPage(cursor, pageSize); pages++;
    if (page.length > pageSize) throw new Error("Oversized source page");
    for (const row of page) {
      const id = key(row);
      if (!uuid(id) || cursor !== null && id <= cursor) throw new Error("Duplicate or unordered source ID");
      rows.push(row); cursor = id;
    }
    if (rows.length > expected) throw new Error("Source population drift");
    if (page.length < pageSize) break;
  } while (pages <= Math.ceil(expected / pageSize));
  if (rows.length !== expected) throw new Error("Incomplete source pagination");
  return { rows, pages, pageSize };
}

export const TENDER_PAGE = `SELECT t.id::text id,t."dataVersion" version,t."contentHash" source_content_hash,
 t."sourceId"::text source_id,t."feedId"::text feed_id,t."primaryCountryId"::text country_id,
 t."procurementType"::text procurement_type,t.status::text status,t."deletedAt" IS NOT NULL deleted,
 to_char(t."deadlineAt",'YYYY-MM-DD"T"HH24:MI:SS.US') deadline,
 to_char(t."updatedAt",'YYYY-MM-DD"T"HH24:MI:SS.US') updated_at,
 encode(sha256(convert_to(jsonb_build_object(${HASH_FIELDS.map(k => `'${k}',t."${k}"`).join(",")})::text,'UTF8')),'hex') content_sha256
 FROM public.tenders t WHERE ${TENDER.predicate} AND ($1::uuid IS NULL OR t.id>$1::uuid) ORDER BY t.id LIMIT $2`;
const TENDER_COUNTS = `SELECT count(*)::int all_rows,count(*) FILTER(WHERE ${TENDER.predicate})::int count,
 md5(string_agg(id::text,',' ORDER BY id) FILTER(WHERE ${TENDER.predicate})) ids_md5,
 count(*) FILTER(WHERE ${TENDER.predicate} AND "deadlineAt"<current_timestamp)::int open_past_deadline,
 count(*) FILTER(WHERE ${TENDER.predicate} AND "deadlineAt" IS NULL)::int open_missing_deadline FROM public.tenders`;

export function supplierMembers(profiles, evidence) {
  const ids = new Set(profiles.map(p => p.canonical_entity_id)), claims = new Set();
  const byProfile = new Map(profiles.map(p => [p.canonical_entity_id, []]));
  for (const row of evidence) {
    if (!uuid(row.claim_id) || claims.has(row.claim_id) || !ids.has(row.canonical_entity_id)) throw new Error("Duplicate/orphan evidence");
    if (row.contract_version !== T.contractVersion || !uuid(row.source_record_id) || !["VERIFIED","STATED_UNVERIFIED","INFERRED","UNKNOWN"].includes(row.status) || !["SOURCE","MISSING"].includes(row.value_class)) throw new Error("Evidence source/version/status mismatch");
    if (typeof row.artifact_available !== "boolean" || row.artifact_available && (!uuid(row.source_artifact_id) || !hash(row.artifact_sha256)) || !row.artifact_available && !row.artifact_limitation) throw new Error("Artifact linkage mismatch");
    claims.add(row.claim_id); byProfile.get(row.canonical_entity_id).push(row);
  }
  return profiles.map(p => {
    const rows = byProfile.get(p.canonical_entity_id).sort((a,b) => a.claim_id.localeCompare(b.claim_id));
    if (p.contract_version !== T.contractVersion || p.entity_type_code !== "company" || !["PINNED","MISSING","AMBIGUOUS"].includes(p.profile_state)) throw new Error("Profile identity/version mismatch");
    if (p.profile_state === "PINNED" && (!uuid(p.profile_version_id) || p.profile_candidate_count !== 1 || !T.profilePins.some(pin => pin.batch === p.batch_code && pin.version === p.profile_version))) throw new Error("Unapproved profile version");
    if (p.profile_state !== "PINNED" && (p.profile_version_id !== null || rows.length)) throw new Error("Unresolved profile exposed evidence");
    if (rows.length !== p.evidence_count || rows.some(r => r.profile_version_id !== p.profile_version_id || r.batch_id !== p.batch_id || r.profile_version !== p.profile_version || r.batch_code !== p.batch_code)) throw new Error("Profile/evidence membership mismatch");
    if ((p.classification_claim_ids ?? []).some(id => !rows.some(r => r.claim_id === id && r.field === "classification"))) throw new Error("Classification evidence orphan");
    const profileSha = sha(p), evidenceSha = sha(rows);
    return { kind: "supplier", entity_id: p.canonical_entity_id, provenance: {
      contract: T.contractVersion, profile_id: p.profile_version_id, profile_version: p.profile_version, batch_id: p.batch_id,
      batch_code: p.batch_code, profile_state: p.profile_state, classification: p.classification,
      classification_value_class: p.classification_value_class, evidence_count: rows.length,
      profile_sha256: profileSha, evidence_sha256: evidenceSha, content_sha256: sha({ profileSha, evidenceSha }),
    } };
  });
}
export function tenderMember(row) {
  if (!exactKeys(row,['id','version','source_content_hash','source_id','feed_id','country_id','procurement_type','status','deleted','deadline','updated_at','content_sha256']) || !uuid(row.id) || !uuid(row.source_id) || !uuid(row.feed_id) || row.country_id !== null && !uuid(row.country_id) || !Number.isInteger(row.version) || row.version < 1 || !hash(row.content_sha256) || typeof row.source_content_hash !== "string" || !row.source_content_hash.length || row.source_content_hash.length > 256 || row.status !== "OPEN" || row.deleted !== false || !['GOODS','WORKS','CONSULTING','SERVICES','EOI','PREQUAL','OTHER'].includes(row.procurement_type)) throw new Error("Tender membership/version/source mismatch");
  const { id, ...provenance } = row;
  return { kind: "tender", entity_id: id, provenance };
}

/** Sources are independent REPEATABLE READ snapshots, never a global transaction. */
export async function captureSource(client, kind) {
  if (!['supplier','tender'].includes(kind)) throw new Error("Unknown source");
  const started = performance.now(); let queries = 0;
  const query = async (q,v) => { queries++; return (await client.query(q,v)).rows; };
  await query("BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY");
  try {
    await query("SET LOCAL statement_timeout='30s'");
    const [observation] = await query("SELECT current_database() database,current_user role,transaction_timestamp() started_at,pg_current_snapshot()::text snapshot,current_setting('transaction_read_only') read_only,current_setting('transaction_isolation') isolation,current_setting('TimeZone') timezone");
    if (observation.database !== SOURCES[kind].database || observation.role !== SOURCES[kind].role || observation.read_only !== "on" || observation.isolation !== "repeatable read") throw new Error("Source identity/transaction mismatch");
    let members, inventory, metrics, limitations;
    if (kind === "supplier") {
      inventory = assertManifest((await query("SELECT * FROM tendermatch_all_supplier_api.contract_manifest_v1"))[0] ?? {});
      const profiles = await traverse(async (after,limit) => { const q=profilePageQuery({after,limit}); return query(q.text,q.values); }, inventory.profile_count, {pageSize:100,key:p=>p.canonical_entity_id});
      if (md5Ids(profiles.rows.map(p=>p.canonical_entity_id)) !== inventory.source_id_checksum) throw new Error("Canonical supplier ID mismatch");
      const evidence = await traverse((after,limit) => query("SELECT * FROM tendermatch_all_supplier_api.current_supplier_evidence WHERE ($1::uuid IS NULL OR claim_id>$1::uuid) ORDER BY claim_id LIMIT $2",[after,limit]), inventory.evidence_count, {key:r=>r.claim_id});
      members = supplierMembers(profiles.rows,evidence.rows);
      for (const family of ['profiles','evidence']) {
        const [d] = await query(`SELECT count(*)::int count FROM ((SELECT * FROM tendermatch_all_supplier_api.current_supplier_${family} EXCEPT SELECT * FROM tendermatch_all_supplier_api.supplier_${family}_v1) UNION ALL (SELECT * FROM tendermatch_all_supplier_api.supplier_${family}_v1 EXCEPT SELECT * FROM tendermatch_all_supplier_api.current_supplier_${family})) d`);
        if (d.count) throw new Error("Source aliases differ");
      }
      const end = assertManifest((await query("SELECT * FROM tendermatch_all_supplier_api.contract_manifest_v1"))[0]);
      if (sha(end)!==sha(inventory)) throw new Error("Supplier snapshot drift");
      metrics = { profilePages:profiles.pages,profilePageSize:profiles.pageSize,evidencePages:evidence.pages,evidencePageSize:evidence.pageSize };
      limitations = { classification:tally(profiles.rows.map(p=>p.classification??'MISSING')), profileState:tally(profiles.rows.map(p=>p.profile_state)), readiness:tally(profiles.rows.map(p=>p.readiness_status??'MISSING')), evidenceStatus:tally(evidence.rows.map(e=>e.status)), evidenceValueClass:tally(evidence.rows.map(e=>e.value_class)), unavailableArtifacts:evidence.rows.filter(e=>!e.artifact_available).length };
    } else {
      [inventory] = await query(TENDER_COUNTS);
      const [orphans] = await query(`SELECT count(*)::int count FROM public.tenders t LEFT JOIN public.tender_sources s ON s.id=t."sourceId" LEFT JOIN public.ingestion_feeds f ON f.id=t."feedId" LEFT JOIN public.countries c ON c.id=t."primaryCountryId" WHERE t.status='OPEN' AND t."deletedAt" IS NULL AND (s.id IS NULL OR f.id IS NULL OR (t."primaryCountryId" IS NOT NULL AND c.id IS NULL))`);
      if (orphans.count) throw new Error("Tender source/feed/country orphan");
      const page = await traverse((after,limit)=>query(TENDER_PAGE,[after,limit]),inventory.count);
      if (md5Ids(page.rows.map(r=>r.id)) !== (inventory.ids_md5??md5Ids([]))) throw new Error("Tender ID reconciliation failed");
      members = page.rows.map(tenderMember);
      if (sha((await query(TENDER_COUNTS))[0]) !== sha(inventory)) throw new Error("Tender snapshot drift");
      metrics = {pages:page.pages,pageSize:page.pageSize,orphanSourceFeedCountry:0};
      limitations = {procurementType:tally(page.rows.map(r=>r.procurement_type)),openPastDeadline:inventory.open_past_deadline,openMissingDeadline:inventory.open_missing_deadline,timestampMeaning:'Source timestamp-without-time-zone preserved verbatim; past-deadline diagnostic uses reported database TimeZone. No deadline exclusion.'};
    }
    const [end] = await query("SELECT clock_timestamp() finished_at,pg_current_snapshot()::text snapshot");
    if (end.snapshot !== observation.snapshot) throw new Error("Source snapshot boundary changed");
    const elapsedMs = Math.round(performance.now()-started);
    if (elapsedMs > LIMITS.sourceDurationMs) throw new Error("Source capture duration limit exceeded");
    return {members,inventory,observation:{...observation,finished_at:end.finished_at,metrics:{...metrics,queries:queries+1,elapsedMs},limitations}};
  } finally { await client.query("ROLLBACK"); }
}

export function inventoryDigest(members) {
  const sorted = [...members].sort((a,b)=>a.entity_id.localeCompare(b.entity_id));
  if (sorted.some((r,i)=>!uuid(r.entity_id) || i && r.entity_id===sorted[i-1].entity_id)) throw new Error("Duplicate/invalid membership");
  return {count:sorted.length,idsSha256:sha(sorted.map(r=>r.entity_id)),contentSha256:sha(sorted)};
}
export function assemble(supplier,tender) {
  const identity = {version:VERSION,adapter:ADAPTER,sources:SOURCES,hashContract:{supplier:'canonical-json safe profile + all safe evidence rows; claims sorted by ID',tender:'PostgreSQL jsonb text SHA-256; explicit fields',tenderFields:HASH_FIELDS,excluded:'raw,metadata,embedding,searchVector,derived categories/sectors/tags; not a scoring-cache identity'},
    policyReferences:{formula:'tendermatch-match-formula/1.1.0',scoringPolicy:'tendermatch-coverage-adjusted-goods-works/1.1.0',feature:'tendermatch-normalized-features/1.0.0',retrieval:'tendermatch-hybrid-rrf/1.0.0',executed:false},supplier:inventoryDigest(supplier.members),tender:inventoryDigest(tender.members)};
  const manifestId = sha(identity);
  const observations = {supplier:supplier.observation,tender:tender.observation,inventory:{supplier:supplier.inventory,tender:tender.inventory},globalAtomicSnapshot:false};
  return {manifestId,captureId:sha({manifestId,observations}),identity,observations,members:[...supplier.members,...tender.members]};
}
export function validateCapture(capture, now = Date.now()) {
  const {identity,observations,members,manifestId,captureId}=capture;
  if (identity.version!==VERSION || identity.adapter!==ADAPTER || sha(identity.sources)!==sha(SOURCES) || sha(identity)!==manifestId || sha({manifestId,observations})!==captureId) throw new Error("Manifest source/hash identity mismatch");
  for(const kind of ['supplier','tender']) {
    if (sha(inventoryDigest(members.filter(m=>m.kind===kind)))!==sha(identity[kind])) throw new Error("Incomplete or changed membership");
    const o=observations[kind], start=+new Date(o.started_at), end=+new Date(o.finished_at);
    if (!Number.isFinite(start+end) || end<start || end-start>LIMITS.sourceDurationMs || now-end>LIMITS.registrationAgeMs || end>now+1000 || o.database!==SOURCES[kind].database || o.role!==SOURCES[kind].role || o.read_only!=='on' || o.isolation!=='repeatable read') throw new Error("Stale or wrong-source capture");
  }
  if (Math.abs(+new Date(observations.supplier.started_at)-+new Date(observations.tender.started_at))>LIMITS.sourceSkewMs) throw new Error("Cross-source capture skew exceeded");
  if(members.some(m=>!['supplier','tender'].includes(m.kind) || !exactKeys(m,['kind','entity_id','provenance']))) throw new Error("Unexpected membership payload");
  for(const member of members) {
    if(member.kind==='tender') tenderMember({id:member.entity_id,...member.provenance});
    else {
      const p=member.provenance;
      if(!exactKeys(p,['contract','profile_id','profile_version','batch_id','batch_code','profile_state','classification','classification_value_class','evidence_count','profile_sha256','evidence_sha256','content_sha256']) || p.contract!==T.contractVersion || !Number.isInteger(p.evidence_count) || p.evidence_count<0 || !hash(p.profile_sha256) || !hash(p.evidence_sha256) || !hash(p.content_sha256) || sha({profileSha:p.profile_sha256,evidenceSha:p.evidence_sha256})!==p.content_sha256) throw new Error("Unsafe supplier membership payload");
    }
  }
  return capture;
}

export async function validateWriter(client) {
  await assertRestrictedRole(client,T.writerLogin,T.writerRole,true);
  for(const table of ['input_manifest','input_member','input_capture']) {
    const [p]=(await client.query("SELECT has_table_privilege(current_user,$1,'SELECT') s,has_table_privilege(current_user,$1,'INSERT') i,has_table_privilege(current_user,$1,'UPDATE,DELETE,TRUNCATE,REFERENCES,TRIGGER') extra",[`tendermatch_retrieval.${table}`])).rows;
    if(!p.s || !p.i || p.extra) throw new Error("Unexpected manifest writer privilege");
  }
}
export async function readback(client,capture,tenant=TENANT) {
  const [row]=(await client.query("SELECT identity,supplier_count,tender_count,potential_pairs FROM tendermatch_retrieval.input_manifest WHERE tenant_id=$1 AND manifest_id=$2",[tenant,capture.manifestId])).rows;
  if(!row || sha(row.identity)!==capture.manifestId || row.supplier_count!==capture.identity.supplier.count || row.tender_count!==capture.identity.tender.count || Number(row.potential_pairs)!==row.supplier_count*row.tender_count) throw new Error("Manifest readback mismatch");
  const metrics={};
  for(const kind of ['supplier','tender']) {
    const page=await traverse((after,limit)=>client.query("SELECT kind,entity_id::text,provenance FROM tendermatch_retrieval.input_member WHERE tenant_id=$1 AND manifest_id=$2 AND kind=$3 AND ($4::uuid IS NULL OR entity_id>$4::uuid) ORDER BY entity_id LIMIT $5",[tenant,capture.manifestId,kind,after,limit]).then(r=>r.rows),row[`${kind}_count`],{key:r=>r.entity_id});
    if(sha(inventoryDigest(page.rows))!==sha(row.identity[kind])) throw new Error("Membership readback hash mismatch");
    metrics[kind]={count:page.rows.length,pages:page.pages,...row.identity[kind]};
  }
  const [obs]=(await client.query("SELECT observations FROM tendermatch_retrieval.input_capture WHERE tenant_id=$1 AND capture_id=$2 AND manifest_id=$3",[tenant,capture.captureId,capture.manifestId])).rows;
  if(!obs || sha({manifestId:capture.manifestId,observations:obs.observations})!==capture.captureId) throw new Error("Capture readback mismatch");
  return metrics;
}
export async function register(client,capture,{tenant=TENANT,now=Date.now()}={}) {
  validateCapture(capture,now);
  if(tenant!==TENANT) throw new Error("Unapproved registration tenant");
  const start=performance.now(); let queries=0;
  const q=async(sql,v)=>{queries++;return client.query(sql,v);};
  await q("BEGIN");
  try {
    await q("SET LOCAL statement_timeout='30s'");
    await q("SELECT set_config('tendermatch.tenant_id',$1,true)",[tenant]);
    const h=await q("INSERT INTO tendermatch_retrieval.input_manifest(tenant_id,manifest_id,contract_version,identity,supplier_count,tender_count) VALUES($1,$2,$3,$4,$5,$6) ON CONFLICT DO NOTHING RETURNING manifest_id",[tenant,capture.manifestId,VERSION,JSON.stringify(capture.identity),capture.identity.supplier.count,capture.identity.tender.count]);
    let insertedMembers=0;
    if(h.rows.length) for(let i=0;i<capture.members.length;i+=500) {
      const chunk=capture.members.slice(i,i+500);
      await q("INSERT INTO tendermatch_retrieval.input_member(tenant_id,manifest_id,kind,entity_id,provenance) SELECT $1,$2,kind,entity_id,provenance FROM jsonb_to_recordset($3::jsonb) AS x(kind text,entity_id uuid,provenance jsonb)",[tenant,capture.manifestId,JSON.stringify(chunk)]); insertedMembers+=chunk.length;
    }
    const c=await q("INSERT INTO tendermatch_retrieval.input_capture(tenant_id,capture_id,manifest_id,observations) VALUES($1,$2,$3,$4) ON CONFLICT DO NOTHING RETURNING capture_id",[tenant,capture.captureId,capture.manifestId,JSON.stringify(capture.observations)]);
    const verified=await readback({query:q},capture,tenant);
    await q("COMMIT");
    return {manifestId:capture.manifestId,captureId:capture.captureId,insertedManifest:h.rows.length,insertedMembers,insertedCapture:c.rows.length,readback:verified,queries,elapsedMs:Math.round(performance.now()-start)};
  } catch(error) {await client.query("ROLLBACK");throw error;}
}

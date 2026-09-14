import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";

export const DEV_TARGET = Object.freeze(JSON.parse(await readFile(new URL("../../db/tendermatch-dev/target.json", import.meta.url), "utf8")));
export const SOURCE_VIEWS = ["supplier_profiles_v1", "supplier_evidence_v1", "current_supplier_profiles", "current_supplier_evidence", "contract_manifest_v1"];
export const RESULT_TABLES = ["normalized_feature", "embedding_model", "feature_embedding", "evaluation_run", "run_feature", "pair_score", "run_pair", "retrieval_request", "retrieval_result", "scoring_batch", "assessment_job", "assessment_artifact", "human_disposition", "schema_migration", "universe_snapshot", "universe_pair", "criterion_audit"];
export const OWNER_VARIABLES = ["TENDERMATCH_SOURCE_OWNER_URL", "TENDERMATCH_RESULTS_OWNER_URL"];
export const CONTRACT_VERSION = DEV_TARGET.contractVersion;
const digest = (value) => createHash("sha256").update(value).digest("hex");
export const idDigest = (ids) => digest([...ids].sort().join("\n"));

/** URLs never enter errors, reports or CLI arguments. Exact direct endpoint only. */
export function guardUrl(value, kind, role = DEV_TARGET.owner) {
  if (!["source", "results"].includes(kind)) throw new Error("Unknown target kind");
  let url;
  try { url = new URL(value); } catch { throw new Error("Missing or invalid environment credential"); }
  const database = kind === "source" ? DEV_TARGET.sourceDatabase : DEV_TARGET.resultDatabase;
  if (url.protocol !== "postgresql:" && url.protocol !== "postgres:") throw new Error("Unexpected connection protocol");
  if (url.hostname !== DEV_TARGET.host || url.pathname !== `/${database}` || decodeURIComponent(url.username) !== role || !url.password || url.hash || url.port && url.port !== "5432") throw new Error("Development endpoint/database/role guard failed");
  if (url.searchParams.get("sslmode") !== "verify-full") throw new Error("TLS verify-full is required");
  for (const key of url.searchParams.keys()) if (!["sslmode", "channel_binding"].includes(key)) throw new Error("Unexpected connection option");
  if (url.searchParams.has("channel_binding") && url.searchParams.get("channel_binding") !== "require") throw new Error("Channel binding must not be weakened");
  return url;
}

export function executionAuthority(args, env) {
  if (!args.includes("--execute-approved") || env.TENDERMATCH_APPROVED_PROJECT_ID !== DEV_TARGET.projectId || env.TENDERMATCH_APPROVED_BRANCH_ID !== DEV_TARGET.branchId || env.TENDERMATCH_APPROVED_ENDPOINT !== DEV_TARGET.host) throw new Error("Explicit execution approval and fresh Console target attestation required");
}

export function assertManifest(manifest) {
  if (manifest.contract_version !== CONTRACT_VERSION || manifest.expected_company_count !== 117 || manifest.source_company_count !== 117 || manifest.profile_count !== 117 || !/^[a-f0-9]{32}$/.test(manifest.pinned_id_checksum ?? "") || manifest.pinned_id_checksum !== manifest.source_id_checksum) throw new Error("All-company contract/count/ID drift; fixture fallback prohibited");
  return manifest;
}

export function profilePageQuery({ after = null, limit = 50, contractVersion = CONTRACT_VERSION } = {}) {
  if (contractVersion !== CONTRACT_VERSION || !Number.isInteger(limit) || limit < 1 || limit > 100 || after !== null && !/^[a-f0-9-]{36}$/i.test(after)) throw new Error("Invalid profile contract/keyset request");
  return { text: "SELECT * FROM tendermatch_all_supplier_api.current_supplier_profiles WHERE ($1::uuid IS NULL OR canonical_entity_id>$1::uuid) AND contract_version=$2 ORDER BY canonical_entity_id LIMIT $3", values: [after, contractVersion, limit] };
}

export function evidencePageQuery({ supplierId, after = null, limit = 100 } = {}) {
  if (!/^[a-f0-9-]{36}$/i.test(supplierId ?? "") || !Number.isInteger(limit) || limit < 1 || limit > 100 || after !== null && (typeof after.field !== "string" || !/^[a-f0-9-]{36}$/i.test(after.claimId))) throw new Error("Invalid focused evidence keyset request");
  return { text: "SELECT * FROM tendermatch_all_supplier_api.current_supplier_evidence WHERE canonical_entity_id=$1::uuid AND ($2::text IS NULL OR (field,claim_id)>($2,$3::uuid)) ORDER BY field,claim_id LIMIT $4", values: [supplierId, after?.field ?? null, after?.claimId ?? null, limit] };
}

export async function querySpec(client, spec) { return client.query(spec.text, spec.values); }

/** Single repeatable-read snapshot, no timestamp-based profile selection. */
export async function validateSourceData(client) {
  const m = assertManifest((await client.query("SELECT * FROM tendermatch_all_supplier_api.contract_manifest_v1")).rows[0] ?? {});
  const ids = [], profiles = [], evidenceIds = new Set(); let after = null;
  do {
    const page = (await querySpec(client, profilePageQuery({ after }))).rows;
    if (!page.length) break;
    for (const row of page) {
      if (row.contract_version !== CONTRACT_VERSION || ids.includes(row.canonical_entity_id) || after && row.canonical_entity_id <= after) throw new Error("Duplicate/out-of-order/version-drift profile page");
      if (row.profile_state === "PINNED" && !DEV_TARGET.profilePins.some(pin => pin.batch === row.batch_code && pin.version === row.profile_version)) throw new Error("Unapproved profile pin");
      ids.push(row.canonical_entity_id); profiles.push(row);
    }
    after = page.at(-1).canonical_entity_id;
  } while (ids.length <= 117);
  if (ids.length !== 117) throw new Error("Incomplete full-company traversal");
  let unavailableArtifacts = 0;
  for (const profile of profiles) {
    let cursor = null, count = 0, more = true;
    do {
      const page = (await querySpec(client, evidencePageQuery({ supplierId: profile.canonical_entity_id, after: cursor }))).rows;
      if (!page.length) break;
      for (const row of page) {
        if (evidenceIds.has(row.claim_id) || row.canonical_entity_id !== profile.canonical_entity_id || row.profile_version_id !== profile.profile_version_id || row.contract_version !== CONTRACT_VERSION) throw new Error("Evidence identity/orphan/duplicate failure");
        if (!["VERIFIED", "STATED_UNVERIFIED", "INFERRED", "UNKNOWN"].includes(row.status) || typeof row.artifact_available !== "boolean" || !row.source_record_id) throw new Error("Evidence status/source contract failure");
        if (row.artifact_available && (!row.source_artifact_id || !row.artifact_sha256) || !row.artifact_available && !row.artifact_limitation) throw new Error("Artifact truth failure");
        if (!row.artifact_available) unavailableArtifacts++;
        evidenceIds.add(row.claim_id); count++;
      }
      cursor = { field: page.at(-1).field, claimId: page.at(-1).claim_id };
      more = page.length === 100;
      if (count > m.evidence_count) throw new Error("Evidence pagination did not terminate");
    } while (more);
    if (count !== profile.evidence_count) throw new Error("Profile/evidence count mismatch");
  }
  if (evidenceIds.size !== m.evidence_count) throw new Error("Global evidence count mismatch");
  for (const name of ["profiles", "evidence"]) {
    const difference = await client.query(`SELECT count(*)::int AS count FROM ((SELECT * FROM tendermatch_all_supplier_api.current_supplier_${name} EXCEPT SELECT * FROM tendermatch_all_supplier_api.supplier_${name}_v1) UNION ALL (SELECT * FROM tendermatch_all_supplier_api.supplier_${name}_v1 EXCEPT SELECT * FROM tendermatch_all_supplier_api.current_supplier_${name})) d`);
    if (difference.rows[0].count) throw new Error("Stable/versioned aliases differ");
  }
  return { contractVersion: CONTRACT_VERSION, companies: ids.length, companyIdsSha256: idDigest(ids), evidence: evidenceIds.size, unavailableArtifacts,
    profilesMissing: profiles.filter(p => p.profile_state === "MISSING").length, profilesAmbiguous: profiles.filter(p => p.profile_state === "AMBIGUOUS").length,
    classificationMissing: profiles.filter(p => p.classification === null).length };
}

export async function assertRestrictedRole(client, role, membership, canLogin) {
  const row = (await client.query("SELECT rolcanlogin,rolsuper,rolcreatedb,rolcreaterole,rolreplication,rolbypassrls,rolconnlimit FROM pg_roles WHERE rolname=$1", [role])).rows[0];
  if (!row || row.rolcanlogin !== canLogin || row.rolsuper || row.rolcreatedb || row.rolcreaterole || row.rolreplication || row.rolbypassrls || canLogin && row.rolconnlimit !== 3) throw new Error("Unsafe role attributes");
  const memberships = (await client.query("SELECT p.rolname FROM pg_auth_members m JOIN pg_roles p ON p.oid=m.roleid JOIN pg_roles c ON c.oid=m.member WHERE c.rolname=$1 ORDER BY p.rolname", [role])).rows.map(r => r.rolname);
  if (JSON.stringify(memberships) !== JSON.stringify(membership ? [membership] : [])) throw new Error("Unexpected role membership");
  const owned = (await client.query("SELECT count(*)::int AS count FROM pg_shdepend d JOIN pg_roles r ON r.oid=d.refobjid WHERE d.refclassid='pg_authid'::regclass AND d.deptype='o' AND r.rolname=$1", [role])).rows[0].count;
  if (owned) throw new Error("Application role owns database objects");
}

/** Expect denial and roll back even if a forbidden write unexpectedly succeeds. */
export async function expectDenied(client, sql, accepted = ["42501"]) {
  await client.query("BEGIN");
  let code = null;
  try { await client.query(sql); } catch (error) { code = error.code; }
  finally { await client.query("ROLLBACK"); }
  if (!accepted.includes(code)) throw new Error("Negative privilege test failed");
}

export async function validateLogin(client, kind) {
  const source = kind === "source";
  const role = source ? DEV_TARGET.consumerLogin : DEV_TARGET.writerLogin;
  const grant = source ? DEV_TARGET.readerRole : DEV_TARGET.writerRole;
  await assertRestrictedRole(client, role, grant, true);
  await assertRestrictedRole(client, grant, null, false);
  const permissions = (await client.query("SELECT has_database_privilege(current_user,current_database(),'CREATE') AS create_db_objects,has_schema_privilege(current_user,'public','CREATE') AS create_public")).rows[0];
  if (permissions.create_db_objects || permissions.create_public) throw new Error("Unexpected inherited database/schema CREATE privilege");
  await expectDenied(client, "CREATE ROLE tendermatch_forbidden_role_probe NOLOGIN");
  // Nontransactional denial is safe only after exact role/membership preflight.
  let denied = false;
  try { await client.query("CREATE DATABASE tendermatch_forbidden_database_probe"); } catch (error) { denied = error.code === "42501"; }
  if (!denied) throw new Error("Database-creation denial failed: inspect probe immediately");
  let data = {};
  if (source) {
    await expectDenied(client, "SELECT id FROM registry.entities LIMIT 1");
    await expectDenied(client, "SELECT raw_payload FROM registry.source_records LIMIT 1");
    await expectDenied(client, "SELECT public_business_contacts FROM registry.supplier_profile_versions LIMIT 1");
    await expectDenied(client, "SELECT * FROM tendermatch_all_supplier_api.approved_company_ids_v1 LIMIT 1");
    await expectDenied(client, "UPDATE tendermatch_all_supplier_api.current_supplier_profiles SET legal_name='forbidden' WHERE false", ["42501", "55000"]);
    const privileges = (await client.query("SELECT table_schema,table_name,privilege_type,grantee FROM information_schema.table_privileges WHERE grantee IN ($1,$2)", [role, grant])).rows;
    if (privileges.length !== SOURCE_VIEWS.length || privileges.some(p => p.grantee !== grant || p.table_schema !== DEV_TARGET.sourceSchema || !SOURCE_VIEWS.includes(p.table_name) || p.privilege_type !== "SELECT")) throw new Error("Unexpected direct or inherited table grants");
    await client.query("BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY");
    try { data = await validateSourceData(client); } finally { await client.query("ROLLBACK"); }
  } else {
    for (const table of RESULT_TABLES) await client.query(`SELECT * FROM tendermatch_retrieval.${table} LIMIT 0`);
    await expectDenied(client, "CREATE TABLE tendermatch_retrieval.forbidden_probe(id integer)");
    await expectDenied(client, "DELETE FROM tendermatch_retrieval.pair_score WHERE false");
    await expectDenied(client, "UPDATE tendermatch_retrieval.pair_score SET pair_score=0 WHERE false");
    await expectDenied(client, "INSERT INTO tendermatch_retrieval.embedding_model(model_version,dimensions,provider) VALUES ('forbidden',384,'none')");
    await client.query("BEGIN");
    try {
      await client.query("SELECT set_config('tendermatch.tenant_id','development-validation',true)");
      await client.query("INSERT INTO tendermatch_retrieval.evaluation_run(tenant_id,run_id,formula_version,feature_version,input_identity,evaluated_at) VALUES ('development-validation','role-probe','validation-only','validation-only','validation-only',now())");
      await client.query("UPDATE tendermatch_retrieval.evaluation_run SET status='FAILED' WHERE tenant_id='development-validation' AND run_id='role-probe'");
      await client.query("SELECT set_config('tendermatch.tenant_id','other-validation',true)");
      if ((await client.query("SELECT * FROM tendermatch_retrieval.evaluation_run WHERE run_id='role-probe'")).rows.length) throw new Error("RLS cross-tenant read failed");
      let code; try { await client.query("INSERT INTO tendermatch_retrieval.evaluation_run(tenant_id,run_id,formula_version,feature_version,input_identity,evaluated_at) VALUES ('development-validation','denied','x','x','x',now())"); } catch (e) { code = e.code; }
      if (code !== "42501") throw new Error("RLS cross-tenant write failed");
    } finally { await client.query("ROLLBACK"); }
    data = { resultTables: RESULT_TABLES.length, scoringExecuted: false, tenantBoundary: "trusted-service-setting-not-authentication" };
  }
  return { ...data, kind, role, negativePrivileges: "passed", database: source ? DEV_TARGET.sourceDatabase : DEV_TARGET.resultDatabase };
}

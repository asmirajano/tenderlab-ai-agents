import { readFile } from "node:fs/promises";
import pg from "pg";
import {
  TENDERMATCH_SUPPLIER_BATCH_CODE,
  TENDERMATCH_SUPPLIER_CONSUMER_ROLE,
  TENDERMATCH_SUPPLIER_CURRENT_EVIDENCE_VIEW,
  TENDERMATCH_SUPPLIER_CURRENT_PROFILE_VIEW,
  TENDERMATCH_SUPPLIER_EXPECTED_PROFILE_COUNT,
  TENDERMATCH_SUPPLIER_PROFILE_VERSION,
  TENDERMATCH_SUPPLIER_VERSIONED_EVIDENCE_VIEW,
  TENDERMATCH_SUPPLIER_VERSIONED_PROFILE_VIEW,
} from "../../packages/tendermatch/src/supplier-contract.ts";

const { Pool } = pg;
const API_SCHEMA = "tendermatch_supplier_api";
const EXPECTED_LOGIN = TENDERMATCH_SUPPLIER_CONSUMER_ROLE;
const EXPECTED_GRANT_ROLE = "tendermatch_supplier_reader";
const EXPECTED_HOST_FINGERPRINT = "ep-dark-dew-b15ctyr1";
const EXPECTED_DATABASE = "tender_entity_registry";
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const READINESS = new Set(["ready_for_exploratory_matching", "usable_with_limitations", "requires_enrichment", "exclude_from_current_matching_run"]);

export async function readSupplierConnectionString(envFile) {
  if (process.env.TENDERMATCH_SUPPLIER_DATABASE_URL) return process.env.TENDERMATCH_SUPPLIER_DATABASE_URL;
  if (!envFile) throw new Error("Set TENDERMATCH_SUPPLIER_DATABASE_URL or pass --env-file <local supplier secret file>.");
  const contents = await readFile(envFile, "utf8");
  const line = contents.split(/\r?\n/).find((entry) => entry.startsWith("TENDERMATCH_SUPPLIER_DATABASE_URL="));
  if (!line) throw new Error("The local supplier environment file does not contain TENDERMATCH_SUPPLIER_DATABASE_URL.");
  return line.slice(line.indexOf("=") + 1).trim();
}

function profileFromRow(row) {
  return {
    canonicalEntityId: row.canonical_entity_id,
    profileVersionId: row.profile_version_id,
    profileVersion: row.profile_version,
    batchId: row.batch_id,
    batchCode: row.batch_code,
    sourceCandidateId: row.source_candidate_id,
    legalName: row.legal_name,
    displayName: row.display_name,
    countryCode: row.country_code?.trim() || null,
    city: row.city,
    region: row.region,
    classification: row.classification,
    productFamilies: row.product_families,
    worksSpecializations: row.works_specializations,
    industriesServed: row.industries_served,
    materials: row.materials,
    certifications: row.certifications,
    operatingGeography: row.operating_geography,
    capacity: row.capacity,
    revenueOrTurnover: row.revenue_or_turnover,
    readinessStatus: row.readiness_status,
    readinessReasons: row.readiness_reasons,
    readinessGateResults: row.readiness_gate_results,
    readinessContractVersion: row.readiness_contract_version,
    verificationStatus: row.verification_status,
    coverageSummary: row.coverage_summary,
    evidenceClaimCount: row.evidence_claim_count,
    evidenceVerifiedCount: row.evidence_verified_count,
    evidenceInferredCount: row.evidence_inferred_count,
    evidenceStatedUnverifiedCount: row.evidence_stated_unverified_count,
    evidenceUnknownCount: row.evidence_unknown_count,
    claimsWithSavedArtifact: row.claims_with_saved_artifact,
    sourceRecordIds: row.source_record_ids ?? [],
    sourceArtifactIds: row.source_artifact_ids ?? [],
  };
}

function evidenceFromRow(row) {
  return {
    canonicalEntityId: row.canonical_entity_id,
    profileVersionId: row.profile_version_id,
    claimId: row.claim_id,
    externalClaimId: row.external_claim_id,
    field: row.field,
    value: row.display_value,
    normalizedValue: row.normalized_value,
    status: row.status,
    sourceSystem: row.source_system,
    sourceTitle: row.source_title,
    sourceUrl: row.source_url,
    retrievedAt: new Date(row.retrieved_at).toISOString(),
    sourceRecordId: row.source_record_id,
    sourceArtifactId: row.source_artifact_id,
    artifactAvailable: row.artifact_available,
    artifactStatus: row.artifact_status,
    artifactSha256: row.artifact_sha256,
    artifactLimitation: row.artifact_limitation,
  };
}

export function validateSupplierConnectionTarget(connectionString) {
  const target = new URL(connectionString);
  if (!target.hostname.includes(EXPECTED_HOST_FINGERPRINT) || target.pathname.replace(/^\//, "") !== EXPECTED_DATABASE) {
    throw new Error("Supplier read contract refused: the development target fingerprint does not match the approved release.");
  }
  if (target.searchParams.get("sslmode") !== "verify-full") throw new Error("Supplier read contract refused: TLS verify-full is required.");
  return true;
}

export function validateSupplierId(value) {
  if (!UUID.test(value ?? "")) throw Object.assign(new Error("A valid canonical supplier UUID is required."), { statusCode: 400 });
  return value;
}

export function parseSupplierListParameters(params) {
  const limit = Number(params.get("limit") ?? "50");
  if (!Number.isInteger(limit) || limit < 1 || limit > 100) throw Object.assign(new Error("limit must be an integer from 1 to 100."), { statusCode: 400 });
  const readiness = params.getAll("readiness").filter(Boolean);
  if (readiness.some((value) => !READINESS.has(value))) throw Object.assign(new Error("An unsupported readiness filter was supplied."), { statusCode: 400 });
  const country = params.get("country");
  if (country && !/^[A-Za-z]{2}$/.test(country)) throw Object.assign(new Error("country must be a two-letter ISO code."), { statusCode: 400 });
  const classification = params.get("classification");
  if (classification && classification !== "GOODS" && classification !== "WORKS") throw Object.assign(new Error("classification must be GOODS or WORKS."), { statusCode: 400 });
  const afterName = params.get("afterName");
  const afterId = params.get("afterId");
  if (Boolean(afterName) !== Boolean(afterId)) throw Object.assign(new Error("afterName and afterId must be supplied together."), { statusCode: 400 });
  if (afterId) validateSupplierId(afterId);
  return { limit, readiness, country: country?.toUpperCase() ?? null, classification: classification || null, afterName: afterName || null, afterId: afterId || null };
}

export function createSupplierStore(connectionString) {
  validateSupplierConnectionTarget(connectionString);
  const pool = new Pool({ connectionString, max: 3, idleTimeoutMillis: 10_000, connectionTimeoutMillis: 10_000 });

  async function readOnly(operation) {
    const client = await pool.connect();
    try {
      await client.query("begin transaction read only");
      await client.query("set local statement_timeout = '25s'");
      const context = await client.query("select current_user, current_setting('transaction_read_only') as read_only, pg_has_role(current_user, $1, 'member') as reader_member", [EXPECTED_GRANT_ROLE]);
      const row = context.rows[0];
      if (row.current_user !== EXPECTED_LOGIN || row.read_only !== "on" || row.reader_member !== true) throw new Error("Supplier read contract refused: expected development read-only identity is not active.");
      const result = await operation(client);
      await client.query("rollback");
      return result;
    } catch (error) {
      try { await client.query("rollback"); } catch { /* connection may be unusable */ }
      throw error;
    } finally {
      client.release();
    }
  }

  async function listSuppliers(filters) {
    const readiness = filters.readiness.length ? filters.readiness : null;
    const result = await readOnly((client) => client.query(`
      select * from ${API_SCHEMA}.${TENDERMATCH_SUPPLIER_CURRENT_PROFILE_VIEW}
      where profile_version = $1::text and batch_code = $2::text
        and ($3::text[] is null or readiness_status = any($3::text[]))
        and ($4::char(2) is null or country_code = $4::char(2))
        and ($5::text is null or classification = $5::text)
        and ($6::text is null or (lower(display_name), canonical_entity_id) > ($6::text, $7::uuid))
      order by lower(display_name), canonical_entity_id
      limit least($8::integer, 100)
    `, [TENDERMATCH_SUPPLIER_PROFILE_VERSION, TENDERMATCH_SUPPLIER_BATCH_CODE, readiness, filters.country, filters.classification, filters.afterName, filters.afterId, filters.limit]));
    const profiles = result.rows.map(profileFromRow);
    const final = profiles.at(-1);
    return {
      profiles,
      nextCursor: profiles.length === filters.limit && final ? { afterName: final.displayName.toLowerCase(), afterId: final.canonicalEntityId } : null,
    };
  }

  async function supplierDetail(id) {
    validateSupplierId(id);
    const result = await readOnly((client) => client.query(`select * from ${API_SCHEMA}.${TENDERMATCH_SUPPLIER_CURRENT_PROFILE_VIEW} where canonical_entity_id = $1::uuid and profile_version = $2::text and batch_code = $3::text`, [id, TENDERMATCH_SUPPLIER_PROFILE_VERSION, TENDERMATCH_SUPPLIER_BATCH_CODE]));
    return result.rows[0] ? profileFromRow(result.rows[0]) : null;
  }

  async function supplierEvidence(id) {
    validateSupplierId(id);
    const result = await readOnly((client) => client.query(`
      select canonical_entity_id, profile_version_id, claim_id, external_claim_id, field, display_value, normalized_value, status, source_system, source_title, source_url,
        retrieved_at, source_record_id, source_artifact_id, artifact_available, artifact_status, artifact_sha256,
        artifact_limitation
      from ${API_SCHEMA}.${TENDERMATCH_SUPPLIER_CURRENT_EVIDENCE_VIEW}
      where canonical_entity_id = $1::uuid
      order by field, claim_id
    `, [id]));
    return result.rows.map(evidenceFromRow);
  }

  async function loadAll() {
    const first = await listSuppliers({ limit: 100, readiness: [], country: null, classification: null, afterName: null, afterId: null });
    if (first.profiles.length !== TENDERMATCH_SUPPLIER_EXPECTED_PROFILE_COUNT) throw new Error(`Supplier contract expected ${TENDERMATCH_SUPPLIER_EXPECTED_PROFILE_COUNT} profiles; received ${first.profiles.length}.`);
    const aliasesPinned = await readOnly((client) => client.query(`
      select not exists (
        (select * from ${API_SCHEMA}.${TENDERMATCH_SUPPLIER_CURRENT_PROFILE_VIEW} except select * from ${API_SCHEMA}.${TENDERMATCH_SUPPLIER_VERSIONED_PROFILE_VIEW})
        union all
        (select * from ${API_SCHEMA}.${TENDERMATCH_SUPPLIER_VERSIONED_PROFILE_VIEW} except select * from ${API_SCHEMA}.${TENDERMATCH_SUPPLIER_CURRENT_PROFILE_VIEW})
      ) and not exists (
        (select * from ${API_SCHEMA}.${TENDERMATCH_SUPPLIER_CURRENT_EVIDENCE_VIEW} except select * from ${API_SCHEMA}.${TENDERMATCH_SUPPLIER_VERSIONED_EVIDENCE_VIEW})
        union all
        (select * from ${API_SCHEMA}.${TENDERMATCH_SUPPLIER_VERSIONED_EVIDENCE_VIEW} except select * from ${API_SCHEMA}.${TENDERMATCH_SUPPLIER_CURRENT_EVIDENCE_VIEW})
      ) as pinned
    `, [])).then((result) => result.rows[0]?.pinned === true);
    if (!aliasesPinned) throw new Error("Supplier contract refused: current aliases drifted from the approved immutable v1.3 views.");
    const evidence = await readOnly((client) => client.query(`
      select canonical_entity_id, profile_version_id, claim_id, external_claim_id, field, display_value, normalized_value, status, source_system, source_title, source_url,
        retrieved_at, source_record_id, source_artifact_id, artifact_available, artifact_status, artifact_sha256,
        artifact_limitation
      from ${API_SCHEMA}.${TENDERMATCH_SUPPLIER_CURRENT_EVIDENCE_VIEW}
      order by canonical_entity_id, field, claim_id
    `, [])).then((result) => result.rows.map(evidenceFromRow));
    return { profiles: first.profiles, evidence };
  }

  return { close: () => pool.end(), listSuppliers, loadAll, supplierDetail, supplierEvidence };
}

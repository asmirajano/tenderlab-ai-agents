import { readFile } from "node:fs/promises";
import pg from "pg";

const { Pool } = pg;
const API_SCHEMA = "tendermatch_supplier_api";
const EXPECTED_LOGIN = "tendermatch_supplier_consumer_dev";
const EXPECTED_GRANT_ROLE = "tendermatch_supplier_reader";
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
    canonicalMarketplaceProfileUrl: row.canonical_marketplace_profile_url,
    legalName: row.legal_name,
    displayName: row.display_name,
    countryCode: row.country_code?.trim() || null,
    operatingGeography: row.operating_geography,
    mainActivity: row.main_activity,
    productPortfolio: row.product_portfolio,
    productCategories: row.product_categories,
    materialsSpecifications: row.materials_specifications,
    capabilities: row.capabilities,
    capacity: row.capacity,
    certifications: row.certifications,
    exportMarkets: row.export_markets,
    localPresence: row.local_presence,
    serviceCapabilities: row.service_capabilities,
    commercialTerms: row.commercial_terms,
    comparableReferences: row.comparable_references,
    scaleIndicators: row.scale_indicators,
    complianceAndIntegrity: row.compliance_and_integrity,
    unresolvedChecks: row.unresolved_checks,
    readinessStatus: row.readiness_status,
    readinessReasons: row.readiness_reasons,
    readinessGateResults: row.readiness_gate_results,
    readinessContractVersion: row.readiness_contract_version,
    verificationStatus: row.verification_status,
    coverageSummary: row.coverage_summary,
    evidenceClaimCount: row.evidence_claim_count,
    evidenceVerifiedCount: row.evidence_verified_count,
    evidenceInferredCount: row.evidence_inferred_count,
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
    field: row.field,
    value: row.value,
    status: row.status,
    sourceTitle: row.source_title,
    sourceUrl: row.source_url,
    retrievedAt: new Date(row.retrieved_at).toISOString(),
    sourceRecordId: row.source_record_id,
    sourceArtifactId: row.source_artifact_id,
    artifactAvailable: row.artifact_available,
    artifactStatus: row.artifact_status,
    artifactSha256: row.artifact_sha256,
    artifactLimitation: row.artifact_limitation,
    supersedesClaimId: row.supersedes_claim_id,
    policyCorrectionCode: row.policy_correction_code,
  };
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
  const category = params.get("category");
  if (category && category.length > 120) throw Object.assign(new Error("category is too long."), { statusCode: 400 });
  const afterName = params.get("afterName");
  const afterId = params.get("afterId");
  if (Boolean(afterName) !== Boolean(afterId)) throw Object.assign(new Error("afterName and afterId must be supplied together."), { statusCode: 400 });
  if (afterId) validateSupplierId(afterId);
  return { limit, readiness, country: country?.toUpperCase() ?? null, category: category || null, afterName: afterName || null, afterId: afterId || null };
}

export function createSupplierStore(connectionString) {
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
    const category = filters.category ? JSON.stringify([filters.category]) : null;
    const result = await readOnly((client) => client.query(`
      select * from ${API_SCHEMA}.current_supplier_profiles
      where ($1::text[] is null or readiness_status = any($1::text[]))
        and ($2::char(2) is null or country_code = $2::char(2))
        and ($3::jsonb is null or product_categories @> $3::jsonb)
        and ($4::text is null or (lower(display_name), canonical_entity_id) > ($4::text, $5::uuid))
      order by lower(display_name), canonical_entity_id
      limit least($6::integer, 100)
    `, [readiness, filters.country, category, filters.afterName, filters.afterId, filters.limit]));
    const profiles = result.rows.map(profileFromRow);
    const final = profiles.at(-1);
    return {
      profiles,
      nextCursor: profiles.length === filters.limit && final ? { afterName: final.displayName.toLowerCase(), afterId: final.canonicalEntityId } : null,
    };
  }

  async function supplierDetail(id) {
    validateSupplierId(id);
    const result = await readOnly((client) => client.query(`select * from ${API_SCHEMA}.current_supplier_profiles where canonical_entity_id = $1::uuid`, [id]));
    return result.rows[0] ? profileFromRow(result.rows[0]) : null;
  }

  async function supplierEvidence(id) {
    validateSupplierId(id);
    const result = await readOnly((client) => client.query(`
      select canonical_entity_id, profile_version_id, claim_id, field, value, status, source_title, source_url,
        retrieved_at, source_record_id, source_artifact_id, artifact_available, artifact_status, artifact_sha256,
        artifact_limitation, supersedes_claim_id, policy_correction_code
      from ${API_SCHEMA}.current_supplier_evidence
      where canonical_entity_id = $1::uuid
      order by field, claim_id
    `, [id]));
    return result.rows.map(evidenceFromRow);
  }

  async function loadAll() {
    const first = await listSuppliers({ limit: 100, readiness: [], country: null, category: null, afterName: null, afterId: null });
    if (first.profiles.length !== 100) throw new Error(`Supplier contract expected 100 profiles; received ${first.profiles.length}.`);
    const evidence = await readOnly((client) => client.query(`
      select canonical_entity_id, profile_version_id, claim_id, field, value, status, source_title, source_url,
        retrieved_at, source_record_id, source_artifact_id, artifact_available, artifact_status, artifact_sha256,
        artifact_limitation, supersedes_claim_id, policy_correction_code
      from ${API_SCHEMA}.current_supplier_evidence
      order by canonical_entity_id, field, claim_id
    `, [])).then((result) => result.rows.map(evidenceFromRow));
    return { profiles: first.profiles, evidence };
  }

  return { close: () => pool.end(), listSuppliers, loadAll, supplierDetail, supplierEvidence };
}

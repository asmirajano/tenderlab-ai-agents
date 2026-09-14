import { readFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { pathToFileURL } from "node:url";
import pg from "pg";

// Read-only census, never an all-to-all scoring completion record. These are
// previously approved source targets, not authorization for a writable result DB.
export const SOURCE_TARGETS = Object.freeze({
  supplier: { host: "ep-dark-dew-b15ctyr1", database: "tender_entity_registry", role: "tendermatch_supplier_consumer_dev", project: "tender-entity-registry", branch: "development", variable: "TENDERMATCH_SUPPLIER_DATABASE_URL" },
  tender: { host: "ep-aged-feather-atm85iwd", database: "neondb", role: "th_qa_readonly", project: null, branch: "br-morning-water-atqp6w7c", variable: "TENDERMATCH_NEON_DATABASE_URL" },
});
export const OPEN_PREDICATE = 'status = \'OPEN\' AND "deletedAt" IS NULL';
export const OPEN_PAGE_SQL = `select id::text id, "dataVersion" version, "procurementType"::text scope from public.tenders
  where ${OPEN_PREDICATE} and ($1::uuid is null or id > $1::uuid) order by id limit $2`;

export function validateCensusTarget(kind, connectionString) {
  const expected = SOURCE_TARGETS[kind];
  if (!expected) throw new Error("Unknown census source kind.");
  let target;
  try { target = new URL(connectionString); } catch { throw new Error("Invalid source connection configuration."); }
  const prefix = target.hostname.split(".")[0];
  if (![expected.host, `${expected.host}-pooler`].includes(prefix) || !target.hostname.endsWith(".neon.tech") || target.pathname !== `/${expected.database}` || decodeURIComponent(target.username) !== expected.role) throw new Error("Source census target guard refused configuration.");
  if (!["require", "verify-full"].includes(target.searchParams.get("sslmode"))) throw new Error("Source census requires certificate-verifying TLS.");
  // Upgrade the older read-only tender URL in memory, without modifying its file.
  target.searchParams.set("sslmode", "verify-full");
  return { connectionString: target.toString(), identity: { hostFingerprint: expected.host, database: expected.database, role: expected.role, project: expected.project, documentedBranch: expected.branch, branchIdentityEvidence: "existing-source-handoff; not freshly verified with Neon control plane" } };
}

export async function censusSource(client, kind, { batchSize = 1000 } = {}) {
  if (!Number.isInteger(batchSize) || batchSize < 1 || batchSize > 2000) throw new Error("Census batch size must be 1–2000.");
  const expected = SOURCE_TARGETS[kind];
  if (!expected) throw new Error("Unknown census source kind.");
  const started = performance.now();
  let queries = 0;
  const query = async (sql, params) => { queries++; return (await client.query(sql, params)).rows; };
  await query("begin isolation level repeatable read read only");
  try {
    await query("set local statement_timeout = '30s'");
    const [identity] = await query("select current_database() database,current_user role,now() queried_at,current_setting('transaction_read_only') read_only,has_database_privilege(current_user,current_database(),'CREATE') can_create_schema");
    if (identity.database !== expected.database || identity.role !== expected.role || identity.read_only !== "on") throw new Error("Read-only source identity mismatch.");
    const result = { identity, status: "census-only", supplierUniverseVerified: false, scoringExecuted: false };
    if (kind === "supplier") {
      result.consumer = (await query("select count(*)::int count,count(distinct canonical_entity_id)::int distinct_entities from tendermatch_supplier_api.current_supplier_profiles"))[0];
      result.consumerReadiness = await query("select readiness_status,count(*)::int count from tendermatch_supplier_api.current_supplier_profiles group by 1 order by 1");
      result.access = (await query("select has_schema_privilege(current_user,'registry','USAGE') registry_usage,has_schema_privilege(current_user,'tendermatch_supplier_api','CREATE') api_create"))[0];
      result.visibleViews = await query("select table_name from information_schema.views where table_schema='tendermatch_supplier_api' order by 1");
      result.canonicalListedCount = null;
      result.blocker = "No approved full-listed supplier read contract; consumer projection is not the canonical universe.";
    } else {
      result.predicate = OPEN_PREDICATE;
      result.counts = (await query(`select count(*)::int all_rows,count(*) filter(where status='OPEN')::int status_open,
        count(*) filter(where ${OPEN_PREDICATE})::int listed_open,
        count(*) filter(where ${OPEN_PREDICATE} and "deadlineAt" < current_timestamp)::int open_past_deadline,
        count(*) filter(where ${OPEN_PREDICATE} and "deadlineAt" is null)::int open_missing_deadline from public.tenders`))[0];
      result.scopes = await query(`select "procurementType"::text type,count(*)::int count from public.tenders where ${OPEN_PREDICATE} group by 1 order by 1`);
      const digest = createHash("sha256");
      let cursor = null, traversed = 0, pages = 0;
      while (true) {
        const rows = await query(OPEN_PAGE_SQL, [cursor, batchSize]);
        pages++;
        for (const row of rows) {
          if (cursor !== null && row.id <= cursor) throw new Error("OPEN census duplicate or unordered identity.");
          digest.update(JSON.stringify(row) + "\n");
          cursor = row.id; traversed++;
        }
        if (rows.length < batchSize) break;
      }
      if (traversed !== result.counts.listed_open) throw new Error("OPEN traversal/count mismatch in one repeatable-read snapshot.");
      result.traversal = { count: traversed, pages, batchSize, identityVersionScopeSha256: digest.digest("hex"), duplicateIds: 0 };
      result.queryPlan = (await query(`explain (analyze, buffers, format json) select count(*) from public.tenders where ${OPEN_PREDICATE}`))[0]["QUERY PLAN"];
    }
    result.metrics = { queries, queryCountExcludesFinalRollback: true, elapsedMs: Math.round((performance.now() - started) * 100) / 100, heapUsedBytes: process.memoryUsage().heapUsed, modelCalls: 0, writes: 0 };
    return result;
  } finally { await client.query("rollback"); }
}

async function main() {
  const argument = name => process.argv[process.argv.indexOf(name) + 1];
  const output = { schemaVersion: "tendermatch-neon-source-census/1.0.0", startedAt: new Date().toISOString(), allToAllExecuted: false, sources: {} };
  for (const kind of ["supplier", "tender"]) {
    const flag = `--${kind}-env-file`;
    if (!process.argv.includes(flag)) throw new Error(`Required ${flag} is missing.`);
    const variable = SOURCE_TARGETS[kind].variable;
    const text = await readFile(argument(flag), "utf8");
    const raw = text.split(/\r?\n/).find(line => line.startsWith(variable + "="))?.slice(variable.length + 1).trim().replace(/^['"]|['"]$/g, "");
    const target = validateCensusTarget(kind, raw);
    const client = new pg.Client({ connectionString: target.connectionString, connectionTimeoutMillis: 15000 });
    try {
      await client.connect();
      output.sources[kind] = { target: target.identity, ...await censusSource(client, kind) };
    } catch (error) {
      output.sources[kind] = { target: target.identity, failureCode: /^[A-Z0-9]{5}$/.test(error.code ?? "") ? error.code : "CENSUS_FAILED" };
    } finally { await client.end(); }
  }
  output.endedAt = new Date().toISOString();
  console.log(JSON.stringify(output, null, 2));
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) main().catch(() => { console.error("Source census failed; no secret-bearing error details are logged."); process.exitCode = 1; });

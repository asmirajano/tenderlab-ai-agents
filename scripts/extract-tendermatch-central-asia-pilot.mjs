import { createHash } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import pg from "pg";

const { Client } = pg;
const EXPECTED_ROLE = "th_qa_readonly";
const SOURCE_BRANCH_ID = "br-morning-water-atqp6w7c";
const COUNTRY_CODES = ["KZ", "KG", "TJ", "TM", "UZ"];
const SNAPSHOT_PATH = resolve("packages/tendermatch/src/fixtures/central-asia-current-tenders.pilot.json");
const MANIFEST_PATH = resolve("packages/tendermatch/src/fixtures/central-asia-current-tenders.pilot.manifest.json");

function argument(name) {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : undefined;
}

async function connectionString() {
  if (process.env.TENDERMATCH_NEON_DATABASE_URL) return process.env.TENDERMATCH_NEON_DATABASE_URL;
  const envFile = argument("--env-file");
  if (!envFile) throw new Error("Set TENDERMATCH_NEON_DATABASE_URL or pass --env-file <local secret file>.");
  const line = (await readFile(resolve(envFile), "utf8")).split(/\r?\n/).find((entry) => entry.startsWith("TENDERMATCH_NEON_DATABASE_URL="));
  if (!line) throw new Error("The local env file does not contain TENDERMATCH_NEON_DATABASE_URL.");
  return line.slice(line.indexOf("=") + 1).trim();
}

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

function nonBlank(value) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function compactObject(value) {
  return Object.fromEntries(Object.entries(value).filter(([, item]) => item !== null && item !== undefined && item !== ""));
}

const selectionSql = `
select
  t.id::text as "neonId",
  t."externalRef",
  t."sourceRef",
  t."sourceNoticeUrl",
  t.title,
  t.description,
  t."procurementType"::text as "procurementType",
  t.status::text as status,
  t.buyer,
  t."financierName",
  c."isoAlpha2"::text as "countryCode",
  c.name as "countryName",
  c.region as "countryRegion",
  c."subRegion" as "countrySubRegion",
  t."budgetAmount"::text as "budgetAmount",
  trim(t."budgetCurrency"::text) as "budgetCurrency",
  t."budgetUsd"::text as "budgetUsd",
  to_char(t."publishedAt", 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') as "publishedAt",
  t."publishedAtPrecision"::text as "publishedAtPrecision",
  to_char(t."deadlineAt", 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') as "deadlineAt",
  t."deadlineSourceText",
  t."sourceTimezone",
  t."sourceId"::text as "sourceId",
  s.code as "sourceCode",
  s.name as "sourceName",
  s.type::text as "sourceType",
  t."feedId"::text as "feedId",
  f.code as "feedCode",
  f.name as "feedName",
  f."adapterType"::text as "feedAdapterType",
  t."contentHash",
  t."dataVersion",
  t."syncState"::text as "syncState",
  to_char(t."firstImportedAt", 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') as "firstImportedAt",
  to_char(t."lastSyncedAt", 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') as "lastSyncedAt",
  to_char(t."sourceUpdatedAt", 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') as "sourceUpdatedAt",
  t."originatingOrganization",
  coalesce((select jsonb_agg(jsonb_build_object('slug', tag.slug, 'label', tag.label, 'kind', tag.kind::text, 'origin', tt.origin::text) order by tag.slug)
    from public.tender_tags tt join public.tags tag on tag.id = tt."tagId" where tt."tenderId" = t.id), '[]'::jsonb) as tags,
  coalesce((select jsonb_agg(jsonb_build_object('code', sector.code, 'name', sector.name, 'confidence', ts.confidence, 'runId', ts."runId") order by sector.code)
    from public.tender_sectors ts join public.sectors sector on sector.id = ts."sectorId" where ts."tenderId" = t.id), '[]'::jsonb) as sectors,
  coalesce((select jsonb_agg(jsonb_build_object('code', category.code, 'name', category.name, 'family', category.family, 'provenance', tc.provenance::text, 'confidence', tc.confidence, 'runId', tc."runId") order by category.code)
    from public.tender_categories tc join public.categories category on category.id = tc."categoryId" where tc."tenderId" = t.id), '[]'::jsonb) as categories,
  jsonb_strip_nulls(jsonb_build_object(
    'noticeType', t.metadata->>'noticeType',
    'noticeTypeNormalized', t.metadata->>'noticeTypeNormalized',
    'procurementMethod', t.metadata->>'procurementMethod',
    'procurementMethodNormalized', t.metadata->>'procurementMethodNormalized',
    'sourceSector', t.metadata->>'sourceSector',
    'intelligenceStage', t.metadata->>'intelligenceStage',
    'projectName', t.metadata->>'projectName',
    'projectRef', t.metadata->>'projectRef',
    'officialLanguage', t.metadata->>'officialLanguage',
    'noticeState', t.metadata->>'noticeState',
    'recordCategory', t.metadata->>'recordCategory'
  )) as provenance
from public.tenders t
join public.countries c on c.id = t."primaryCountryId"
left join public.tender_sources s on s.id = t."sourceId"
left join public.ingestion_feeds f on f.id = t."feedId"
where c."isoAlpha2" in ('KZ', 'KG', 'TJ', 'TM', 'UZ')
  and t."deletedAt" is null
  and t.status = 'OPEN'
  and t."deadlineAt" >= current_timestamp
order by t."publishedAt" desc nulls last, t."lastSyncedAt" desc, t.id asc`;

const client = new Client({ connectionString: await connectionString() });
try {
  await client.connect();
  await client.query("begin transaction read only");
  await client.query("set local statement_timeout = '30s'");
  const context = await client.query("select current_user, current_setting('transaction_read_only') as read_only, current_timestamp as extracted_at");
  if (context.rows[0]?.current_user !== EXPECTED_ROLE || context.rows[0]?.read_only !== "on") {
    throw new Error("Extraction refused: the verified read-only role/transaction contract is not active.");
  }
  const result = await client.query(selectionSql);
  const extractedAt = new Date(context.rows[0].extracted_at).toISOString();
  const records = result.rows.map((row) => ({
    neonId: row.neonId,
    externalRef: row.externalRef,
    sourceRef: nonBlank(row.sourceRef),
    sourceNoticeUrl: nonBlank(row.sourceNoticeUrl),
    title: row.title,
    description: nonBlank(row.description),
    procurementType: row.procurementType,
    databaseStatus: row.status,
    buyer: nonBlank(row.buyer),
    financierName: nonBlank(row.financierName),
    country: {
      code: row.countryCode.trim(),
      name: row.countryName,
      region: nonBlank(row.countryRegion),
      subRegion: nonBlank(row.countrySubRegion),
    },
    budget: {
      amount: nonBlank(row.budgetAmount),
      currency: nonBlank(row.budgetCurrency),
      usd: nonBlank(row.budgetUsd),
      disclosure: row.budgetAmount === null ? "NOT_DISCLOSED" : "DISCLOSED",
    },
    publishedAt: row.publishedAt,
    publishedAtPrecision: nonBlank(row.publishedAtPrecision),
    deadlineAt: row.deadlineAt,
    deadlineSourceText: nonBlank(row.deadlineSourceText),
    sourceTimezone: nonBlank(row.sourceTimezone),
    source: {
      id: row.sourceId,
      code: row.sourceCode,
      name: row.sourceName,
      type: row.sourceType,
    },
    feed: {
      id: row.feedId,
      code: row.feedCode,
      name: row.feedName,
      adapterType: row.feedAdapterType,
    },
    contentHash: row.contentHash,
    dataVersion: row.dataVersion,
    syncState: row.syncState,
    firstImportedAt: row.firstImportedAt,
    lastSyncedAt: row.lastSyncedAt,
    sourceUpdatedAt: nonBlank(row.sourceUpdatedAt),
    originatingOrganization: nonBlank(row.originatingOrganization),
    tags: row.tags,
    sectors: row.sectors,
    categories: row.categories,
    provenance: compactObject(row.provenance ?? {}),
  }));
  if (records.length === 0) throw new Error("Extraction refused: the current-set predicate returned no records.");
  if (new Set(records.map((record) => record.neonId)).size !== records.length) throw new Error("Extraction refused: duplicate tender UUIDs were returned.");
  if (records.some((record) => !COUNTRY_CODES.includes(record.country.code) || record.databaseStatus !== "OPEN" || !record.deadlineAt)) {
    throw new Error("Extraction refused: a row violates the approved country/status/deadline contract.");
  }
  const snapshot = {
    schemaVersion: "tendermatch-tender-snapshot/1.0.0",
    snapshotId: `snapshot:TM-NEON-CURRENT-${extractedAt.slice(0, 10)}`,
    extractedAt,
    sourceBranchId: SOURCE_BRANCH_ID,
    selectionPolicyVersion: "tendermatch-central-asia-current/1.0.0",
    records,
  };
  const serializedSnapshot = `${JSON.stringify(snapshot, null, 2)}\n`;
  const countryDistribution = Object.fromEntries(COUNTRY_CODES.map((code) => [code, records.filter((record) => record.country.code === code).length]));
  const fieldCoverage = Object.fromEntries([
    "sourceRef", "sourceNoticeUrl", "description", "buyer", "financierName", "publishedAt", "deadlineAt", "sourceUpdatedAt", "originatingOrganization",
  ].map((field) => [field, records.filter((record) => record[field] !== null).length]));
  fieldCoverage.budgetAmount = records.filter((record) => record.budget.amount !== null).length;
  fieldCoverage.budgetCurrency = records.filter((record) => record.budget.currency !== null).length;
  const manifest = {
    schemaVersion: "tendermatch-extraction-manifest/1.0.0",
    snapshotId: snapshot.snapshotId,
    snapshotPath: "packages/tendermatch/src/fixtures/central-asia-current-tenders.pilot.json",
    snapshotSha256: sha256(serializedSnapshot),
    sourceBranchId: SOURCE_BRANCH_ID,
    sourceRole: "AUTHORITATIVE_SOURCE",
    databaseRole: EXPECTED_ROLE,
    transactionMode: "READ ONLY",
    extractedAt,
    selectionPolicyVersion: snapshot.selectionPolicyVersion,
    selectionPredicate: "primary country in KZ/KG/TJ/TM/UZ; deletedAt IS NULL; status OPEN; deadlineAt >= database CURRENT_TIMESTAMP",
    deterministicOrder: "publishedAt DESC NULLS LAST, lastSyncedAt DESC, tender UUID ASC",
    count: records.length,
    countryDistribution,
    statusDistribution: { OPEN: records.length },
    deadlineStateAtExtraction: { CURRENT: records.length, EXPIRED: 0, UNKNOWN: 0 },
    procurementTypeDistribution: Object.fromEntries([...new Set(records.map((record) => record.procurementType))].sort().map((type) => [type, records.filter((record) => record.procurementType === type).length])),
    sourceDistribution: Object.fromEntries([...new Set(records.map((record) => record.source.code))].sort().map((code) => [code, records.filter((record) => record.source.code === code).length])),
    fieldCoverage,
    exclusions: ["raw JSON", "embedding", "search vector", "contact details", "documents", "large binary or extracted text"],
    secretHandling: "The database credential is read only at extraction time and is never serialized.",
  };
  await writeFile(SNAPSHOT_PATH, serializedSnapshot, "utf8");
  await writeFile(MANIFEST_PATH, `${JSON.stringify(manifest, null, 2)}\n`, "utf8");
  await client.query("rollback");
  console.log(JSON.stringify({ snapshotPath: SNAPSHOT_PATH, manifestPath: MANIFEST_PATH, count: records.length, countryDistribution, snapshotSha256: manifest.snapshotSha256 }, null, 2));
} catch (error) {
  try { await client.query("rollback"); } catch { /* connection may already be closed */ }
  throw error;
} finally {
  await client.end();
}

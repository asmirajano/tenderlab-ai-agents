import test from "node:test";
import assert from "node:assert/strict";
import { censusSource, OPEN_PAGE_SQL, OPEN_PREDICATE, validateCensusTarget } from "../scripts/audit-tendermatch-neon-universe.mjs";

test("census target guard accepts only the existing source identity and upgrades TLS without exposing configuration", () => {
  const url = "postgresql://th_qa_readonly:synthetic-test-value@ep-aged-feather-atm85iwd-pooler.c-9.us-east-1.aws.neon.tech/neondb?sslmode=require";
  const target = validateCensusTarget("tender", url);
  assert.equal(new URL(target.connectionString).searchParams.get("sslmode"), "verify-full");
  assert.ok(!JSON.stringify(target.identity).includes("synthetic-test-value"));
  for (const altered of [url.replace("aged-feather", "other"), url.replace("/neondb", "/production"), url.replace("th_qa_readonly", "owner"), url.replace("sslmode=require", "sslmode=disable"), url.replace(".neon.tech", ".neon.tech.example")]) assert.throws(() => validateCensusTarget("tender", altered));
});

test("OPEN census does not import the pilot geography/deadline/limit restrictions", () => {
  assert.equal(OPEN_PREDICATE, 'status = \'OPEN\' AND "deletedAt" IS NULL');
  assert.match(OPEN_PAGE_SQL, /order by id limit \$2/);
  assert.doesNotMatch(OPEN_PAGE_SQL, /deadline|country|join|60|17/i);
});

test("canonical supplier count remains unknown when only the curated read projection is available", async () => {
  const sql = [];
  const client = { query: async statement => {
    sql.push(statement);
    if (statement.includes("current_database")) return { rows: [{ database: "tender_entity_registry", role: "tendermatch_supplier_consumer_dev", read_only: "on" }] };
    if (statement.includes("distinct canonical_entity_id")) return { rows: [{ count: 17, distinct_entities: 17 }] };
    if (statement.includes("registry_usage")) return { rows: [{ registry_usage: false, api_create: false }] };
    return { rows: [] };
  } };
  const result = await censusSource(client, "supplier");
  assert.equal(result.consumer.count, 17);
  assert.equal(result.canonicalListedCount, null);
  assert.equal(result.supplierUniverseVerified, false);
  assert.equal(result.scoringExecuted, false);
  assert.equal(sql[0], "begin isolation level repeatable read read only");
  assert.equal(sql.at(-1), "rollback");
  assert.ok(sql.every(q => !/\b(insert|update|delete|create|drop|alter|grant)\s/i.test(q)));
});

test("identity mismatch rolls back before any source population query", async () => {
  const statements = [];
  const client = { query: async sql => { statements.push(sql); return { rows: sql.includes("current_database") ? [{ database: "wrong", role: "owner", read_only: "off" }] : [] }; } };
  await assert.rejects(censusSource(client, "tender"), /identity mismatch/);
  assert.equal(statements.at(-1), "rollback");
  assert.ok(!statements.some(sql => sql.includes("from public.tenders")));
});

test("bounded traversal reconciles every OPEN ID and rejects duplicates", async () => {
  const run = async duplicate => {
    let page = 0;
    const client = { query: async sql => {
      if (sql.includes("current_database")) return { rows: [{ database: "neondb", role: "th_qa_readonly", read_only: "on" }] };
      if (sql.includes("all_rows")) return { rows: [{ listed_open: 2 }] };
      if (sql === OPEN_PAGE_SQL) return { rows: page++ === 0 ? [{ id: "a", version: 1, scope: "GOODS" }, { id: duplicate ? "a" : "b", version: 1, scope: "SERVICES" }] : [] };
      if (sql.startsWith("explain")) return { rows: [{ "QUERY PLAN": [] }] };
      return { rows: [] };
    } };
    return censusSource(client, "tender", { batchSize: 2 });
  };
  assert.equal((await run(false)).traversal.count, 2);
  await assert.rejects(run(true), /duplicate/);
});

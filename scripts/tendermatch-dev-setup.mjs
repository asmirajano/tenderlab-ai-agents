/** PREPARATION RUNNER. Default is a disconnected plan. No implicit dotenv reads. */
import { randomBytes } from "node:crypto";
import { readFile, open, realpath, access } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { execFileSync } from "node:child_process";
import { DEV_TARGET as T, OWNER_VARIABLES, RESULT_TABLES, guardUrl, executionAuthority, validateLogin, validateSourceData, assertRestrictedRole } from "./lib/tendermatch-dev-contract.mjs";

const root = fileURLToPath(new URL("..", import.meta.url));
const sqlRoot = new URL("../db/tendermatch-dev/", import.meta.url);
const sql = async name => readFile(new URL(name, sqlRoot), "utf8");
export const ACTIONS = ["plan", "source-up", "result-create", "result-up", "provision-source", "provision-results", "validate-source", "validate-results", "source-down", "result-down"];
export function plan() {
  return { state: "PREPARED_NOT_APPLIED", target: T, order: ["source-up", "result-create", "result-up", "provision-source", "provision-results", "validate-source", "validate-results"],
    sqlOrder: ["001-source-guard.sql + 010-source-up.sql", "020-create-result-database.sql (separate nontransactional connection)", "021-result-guard.sql + db/migrations/20260905_tendermatch_retrieval.sql body + 030-result-up.sql"],
    rollback: ["source-down: only new API and roles", "result-down: empty result store only; database/extension retained"],
    ownerVariables: OWNER_VARIABLES, requiresLaterApproval: true, connects: false };
}
export function transactionBody(text) {
  if (!/\bBEGIN;/.test(text) || !/COMMIT;\s*$/.test(text)) throw new Error("Unexpected base migration transaction shape");
  return text.replace(/\bBEGIN;/, "").replace(/COMMIT;\s*$/, "");
}

async function guardedConnection(Client, value, kind, role = T.owner) {
  guardUrl(value, kind, role);
  const client = new Client({ connectionString: value, connectionTimeoutMillis: 10000, query_timeout: 30000, enableChannelBinding: true });
  client.on?.("error", () => {}); // Never let a credential-bearing driver object reach stderr.
  try {
    await client.connect();
    const row = (await client.query("SELECT current_database() AS database,current_user AS role")).rows[0];
    if (row.database !== (kind === "source" ? T.sourceDatabase : T.resultDatabase) || row.role !== role) throw new Error("Connected identity mismatch");
    return client;
  } catch { await client.end().catch(() => {}); throw new Error("Connection or identity validation failed"); }
}

async function transaction(client, kind, work) {
  await client.query("BEGIN");
  try {
    await client.query("SELECT set_config('tendermatch.approved_branch_id',$1,true)", [T.branchId]);
    await client.query(await sql(kind === "source" ? "001-source-guard.sql" : "021-result-guard.sql"));
    const result = await work();
    await client.query("COMMIT");
    return result;
  } catch (error) { await client.query("ROLLBACK"); throw error; }
}

export async function checkedSecretPath(kind) {
  const name = kind === "source" ? T.consumerSecretFile : T.writerSecretFile;
  const directory = await realpath(root), target = path.join(directory, name);
  execFileSync("git", ["check-ignore", "--quiet", "--", target], { cwd: root, windowsHide: true, stdio: "pipe" });
  try { await access(target); } catch (error) { if (error.code === "ENOENT") return target; throw error; }
  throw new Error("Secret output exists; refusing overwrite or credential rotation");
}

async function storeSecret(target, variable, value) {
  // Exclusive create prevents symlink/pre-existing-file overwrite. No owner URL is written.
  const handle = await open(target, "wx", 0o600);
  try {
    if (process.platform === "win32") {
      const identity = execFileSync("whoami", [], { encoding: "utf8", windowsHide: true }).trim();
      execFileSync("icacls", [target, "/inheritance:r", "/grant:r", `${identity}:F`], { windowsHide: true, stdio: "pipe" });
    }
    await handle.writeFile(`${variable}=${value}\n`, "utf8");
  } finally { await handle.close(); }
}

async function provision(Client, owner, ownerValue, kind) {
  const source = kind === "source", role = source ? T.consumerLogin : T.writerLogin, grant = source ? T.readerRole : T.writerRole;
  const output = await checkedSecretPath(kind);
  await assertRestrictedRole(owner, grant, null, false);
  // Refuse weak inherited PUBLIC privileges before creating any credential.
  const effective = (await owner.query("SELECT has_database_privilege($1,current_database(),'CREATE') AS db_create,has_schema_privilege($1,'public','CREATE') AS public_create", [grant])).rows[0];
  if (effective.db_create || effective.public_create) throw new Error("PUBLIC privilege remediation needs separate authority");
  if (source && (await owner.query("SELECT has_schema_privilege($1,'registry','USAGE') AS access", [grant])).rows[0].access) throw new Error("Unexpected inherited source-schema access");
  let credential = new URL(ownerValue), password = randomBytes(32).toString("hex"), created = false;
  credential.username = role; credential.password = password;
  try {
    await transaction(owner, kind, async () => {
      // All identifiers are fixed in the reviewed manifest; password is generated hex.
      // No password SQL is returned or logged, including on failure.
      await owner.query(`CREATE ROLE ${role} LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS INHERIT CONNECTION LIMIT 3 PASSWORD '${password}'`);
      created = true;
      await owner.query(`GRANT ${grant} TO ${role}`);
      await owner.query(`GRANT CONNECT ON DATABASE ${source ? T.sourceDatabase : T.resultDatabase} TO ${role}`);
    });
    const consumer = await guardedConnection(Client, credential.href, kind, role);
    let report;
    try { report = await validateLogin(consumer, kind); } finally { await consumer.end(); }
    await assertRestrictedRole(owner, role, grant, true);
    await storeSecret(output, source ? T.consumerVariable : T.writerVariable, credential.href);
    return { ...report, secretFile: output, passwordDisclosed: false };
  } catch {
    if (created) await owner.query(`ALTER ROLE ${role} NOLOGIN PASSWORD NULL`);
    throw new Error("Provisioning failed; any newly committed login is disabled; inspect output path before a separately approved retry");
  } finally { password = ""; credential = null; }
}

async function removeLogin(client, kind) {
  const source = kind === "source", login = source ? T.consumerLogin : T.writerLogin, grant = source ? T.readerRole : T.writerRole;
  const exists = (await client.query("SELECT 1 FROM pg_roles WHERE rolname=$1", [login])).rows.length;
  if (!exists) return;
  const row = (await client.query("SELECT rolcanlogin FROM pg_roles WHERE rolname=$1", [login])).rows[0];
  await assertRestrictedRole(client, login, grant, row.rolcanlogin);
  await client.query(`REVOKE ${grant} FROM ${login}`);
  await client.query(`REVOKE CONNECT ON DATABASE ${source ? T.sourceDatabase : T.resultDatabase} FROM ${login}`);
  await client.query(`DROP ROLE ${login}`);
}

export async function main(args = process.argv.slice(2), env = process.env) {
  const action = args[0] ?? "plan";
  try {
    if (!ACTIONS.includes(action)) throw new Error("Unknown setup action");
    if (action === "plan") return plan();
    executionAuthority(args, env);
    const kind = action.endsWith("source") || action.startsWith("source-") || action === "result-create" ? "source" : "results";
    const role = kind === "source" ? T.consumerLogin : T.writerLogin;
    const validationOnly = action.startsWith("validate-");
    const variable = validationOnly ? (kind === "source" ? T.consumerVariable : T.writerVariable) : (kind === "source" ? OWNER_VARIABLES[0] : OWNER_VARIABLES[1]);
    guardUrl(env[variable], kind, validationOnly ? role : T.owner); // before loading pg/connecting
    const { default: pg } = await import("pg");
    const client = await guardedConnection(pg.Client, env[variable], kind, validationOnly ? role : T.owner);
    try {
      if (validationOnly) return await validateLogin(client, kind);
      if (action.startsWith("provision-")) return await provision(pg.Client, client, env[variable], kind);
      if (action === "result-create") {
        await transaction(client, "source", async () => {
          if ((await client.query("SELECT 1 FROM pg_database WHERE datname=$1", [T.resultDatabase])).rows.length) throw new Error("Result database exists; refusing adoption");
        });
        // CREATE DATABASE is deliberately outside a transaction and never automatic.
        await client.query(await sql("020-create-result-database.sql"));
        await client.query("COMMENT ON DATABASE tendermatch_results_dev IS 'TenderMatch development result store; prepared contract 20260906; branch br-polished-boat-b1qddx0m'");
        return { action, database: T.resultDatabase, state: "CREATED_EMPTY", next: "Reconnect to the result database, then result-up" };
      }
      return await transaction(client, kind, async () => {
        if (action === "source-up") {
          const before = (await client.query("SELECT md5(string_agg(viewname||definition,'' ORDER BY viewname)) AS hash FROM pg_views WHERE schemaname='tendermatch_supplier_api'")).rows[0].hash;
          await client.query(await sql("010-source-up.sql"));
          const report = await validateSourceData(client);
          const after = (await client.query("SELECT md5(string_agg(viewname||definition,'' ORDER BY viewname)) AS hash FROM pg_views WHERE schemaname='tendermatch_supplier_api'")).rows[0].hash;
          if (before !== after) throw new Error("Existing 17-profile API changed");
          return { action, ...report, preservedApiDefinitionHash: after };
        }
        if (action === "result-up") {
          const marker = (await client.query("SELECT shobj_description(oid,'pg_database') AS marker FROM pg_database WHERE datname=current_database()")).rows[0].marker;
          if (marker !== "TenderMatch development result store; prepared contract 20260906; branch br-polished-boat-b1qddx0m") throw new Error("Database was not created by the reviewed separate step");
          if ((await client.query("SELECT 1 FROM pg_namespace WHERE nspname='tendermatch_retrieval'")).rows.length) throw new Error("Result schema exists; refusing adoption");
          const base = await readFile(new URL("../db/migrations/20260905_tendermatch_retrieval.sql", import.meta.url), "utf8");
          await client.query(transactionBody(base));
          await client.query(await sql("030-result-up.sql"));
          return { action, tables: RESULT_TABLES.length, scoringExecuted: false };
        }
        if (action === "result-down") {
          const marker = (await client.query("SELECT shobj_description(oid,'pg_database') AS marker FROM pg_database WHERE datname=current_database()")).rows[0].marker;
          if (marker !== "TenderMatch development result store; prepared contract 20260906; branch br-polished-boat-b1qddx0m") throw new Error("Unknown database origin; refusing rollback");
          const versions = (await client.query("SELECT version FROM tendermatch_retrieval.schema_migration ORDER BY version")).rows.map(r => r.version);
          if (JSON.stringify(versions) !== JSON.stringify(["20260905-retrieval-v1", "20260906-all-to-all-dev-v1"])) throw new Error("Result schema version drift; refusing rollback");
          for (const table of RESULT_TABLES.filter(t => t !== "schema_migration")) if ((await client.query(`SELECT 1 FROM tendermatch_retrieval.${table} LIMIT 1`)).rows.length) throw new Error("Result data exists: export/retention approval required; refusing destructive rollback");
        }
        await removeLogin(client, kind);
        await client.query(await sql(kind === "source" ? "019-source-down.sql" : "039-result-down.sql"));
        return { action, state: "ROLLED_BACK", secretFiles: "Retained locally but revoked; remove explicitly", resultDatabase: "Retained; never automatically dropped" };
      });
    } finally { await client.end(); }
  } finally {
    // Child cannot clear its parent's environment: runbook has a shell finally too.
    for (const key of OWNER_VARIABLES) delete env[key];
  }
}

if (process.argv[1] && pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url) {
  main().then(result => console.log(JSON.stringify(result, null, 2))).catch(() => {
    console.error("TenderMatch development setup failed closed. No credentials or driver error details logged. Inspect target, approval, privileges and the runbook recovery step."); process.exitCode = 1;
  });
}

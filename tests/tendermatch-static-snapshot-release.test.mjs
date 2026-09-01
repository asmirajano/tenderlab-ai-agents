import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";

import { validateTenderMatchRuntimePayload } from "../apps/tender-apps/src/tendermatch-supplier-api.ts";

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const dataRoot = path.join(projectRoot, "apps/tender-apps/public/tendermatch/data");

async function fixture(name) {
  const contents = await readFile(path.join(dataRoot, name));
  return { contents, value: JSON.parse(contents.toString("utf8")) };
}

function sha256(contents) {
  return createHash("sha256").update(contents).digest("hex");
}

function collectKeys(value, keys = []) {
  if (Array.isArray(value)) {
    value.forEach((entry) => collectKeys(entry, keys));
  } else if (value && typeof value === "object") {
    for (const [key, entry] of Object.entries(value)) {
      keys.push(key);
      collectKeys(entry, keys);
    }
  }
  return keys;
}

test("binds the deployed supplier snapshot to manifest hashes and exact v1.3 counts", async () => {
  const [manifestFixture, runtimeFixture, evidenceFixture] = await Promise.all([
    fixture("supplier-snapshot-v1.3.manifest.json"),
    fixture("supplier-runtime-v1.3.json"),
    fixture("supplier-evidence-v1.3.json"),
  ]);
  const manifest = manifestFixture.value;
  const runtime = validateTenderMatchRuntimePayload(runtimeFixture.value);
  const evidence = evidenceFixture.value;

  assert.equal(manifest.releaseMode, "static-pinned-snapshot");
  assert.equal(manifest.files.runtime.sha256, sha256(runtimeFixture.contents));
  assert.equal(manifest.files.evidence.sha256, sha256(evidenceFixture.contents));
  assert.deepEqual(manifest.counts, { tenders: 60, suppliers: 17, evidence: 289, evaluations: 1020, numericEvaluations: 48, missingEvaluations: 972 });

  assert.equal(runtime.mode, "static-pinned-snapshot");
  assert.equal(runtime.suppliers.length, 17);
  assert.equal(runtime.evaluations.length, 1020);
  assert.equal(new Set(runtime.evaluations.map((entry) => entry.key)).size, 1020);
  assert.equal(runtime.evaluationSummary.numeric, 48);
  assert.equal(runtime.evaluationSummary.missing, 972);
  assert.deepEqual(runtime.evaluationSummary.byStatus, { BINGO_MATCH: 0, STRONG_CANDIDATE: 0, POTENTIAL_MATCH: 0, NEEDS_VERIFICATION: 3, NO_MATCH: 45, BLOCKED_INELIGIBLE: 37, UNASSESSED: 935 });
  assert.ok(runtime.evaluations.filter((entry) => entry.value === null).every((entry) => entry.valueClass === "MISSING"));
  assert.ok(runtime.evaluations.filter((entry) => entry.value !== null).every((entry) => entry.valueClass === "ESTIMATED"));
  assert.equal("consumerRole" in runtime.summary, false);
  assert.equal("views" in runtime.summary, false);

  assert.equal(evidence.mode, "static-pinned-snapshot");
  const supplierIds = new Set(runtime.suppliers.map((profile) => profile.canonicalEntityId));
  assert.deepEqual(new Set(Object.keys(evidence.evidenceBySupplier)), supplierIds);
  const evidenceRecords = Object.entries(evidence.evidenceBySupplier).flatMap(([supplierId, records]) => records.map((record) => ({ supplierId, record })));
  assert.equal(evidenceRecords.length, 289);
  assert.ok(evidenceRecords.every(({ supplierId, record }) => record.canonicalEntityId === supplierId));
});

test("keeps the public snapshot free of credentials, contacts and raw-source fields", async () => {
  const [runtimeFixture, evidenceFixture] = await Promise.all([
    fixture("supplier-runtime-v1.3.json"),
    fixture("supplier-evidence-v1.3.json"),
  ]);
  const combined = `${runtimeFixture.contents.toString("utf8")}\n${evidenceFixture.contents.toString("utf8")}`;
  assert.doesNotMatch(combined, /TENDERMATCH_SUPPLIER_DATABASE_URL|postgres(?:ql)?:\/\/|password=|tendermatch_supplier_consumer_dev/i);
  const forbidden = /^(contact|contacts|contactName|email|emails|phone|phones|mobile|whatsapp|wechat|person|people|rawSource|rawContent)$/i;
  assert.equal(collectKeys(runtimeFixture.value).some((key) => forbidden.test(key)), false);
  assert.equal(collectKeys(evidenceFixture.value).some((key) => forbidden.test(key)), false);
});

test("makes the Firebase snapshot path explicit without restoring historical fixture fallback", async () => {
  const [client, app, product, documentation, packageJson] = await Promise.all([
    readFile(path.join(projectRoot, "apps/tender-apps/src/tendermatch-supplier-api.ts"), "utf8"),
    readFile(path.join(projectRoot, "apps/tender-apps/src/tendermatch-app.tsx"), "utf8"),
    readFile(path.join(projectRoot, "packages/catalog-data/src/client-products.ts"), "utf8"),
    readFile(path.join(projectRoot, "docs/tendermatch-neon-supplier-matching-pilot.md"), "utf8"),
    readFile(path.join(projectRoot, "package.json"), "utf8"),
  ]);
  assert.match(client, /\/tendermatch\/data\/supplier-runtime-v1\.3\.json/);
  assert.match(client, /\/tendermatch\/data\/supplier-evidence-v1\.3\.json/);
  assert.match(client, /static-pinned-snapshot/);
  assert.match(app, /PINNED V1\.3 SNAPSHOT/);
  assert.match(product, /Pinned v1\.3 supplier snapshot/);
  assert.match(documentation, /Firebase static snapshot release/);
  assert.match(packageJson, /export:tendermatch-static-snapshot/);
  assert.doesNotMatch(`${client}\n${app}`, /demoSuppliers/);
});

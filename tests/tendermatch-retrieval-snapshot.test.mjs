import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { spawn } from "node:child_process";
import { once } from "node:events";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import test from "node:test";
import { createPinnedSnapshotStore, createTenderMatchLocalServer } from "../scripts/serve-tendermatch-local.mjs";

const root = resolve("apps/tender-apps/public/tendermatch/data");
const read = async (name, directory = root) => JSON.parse(await readFile(join(directory, name), "utf8"));
const hash = (bytes) => createHash("sha256").update(bytes).digest("hex");

test("pair snapshot hashes, bounded partitions and both indexes reconcile to every pinned Formula result", async () => {
  const manifest = await read("pair-snapshot-v2.manifest.json");
  const source = await read("supplier-runtime-v1.3.json");
  const originals = new Map(source.evaluations.map((row) => [row.key, row]));
  const catalog = await read("runtime-catalog-v2.json");
  const index = await read("pair-index-v2.json");
  assert.equal("evaluations" in catalog, false);
  assert.deepEqual(catalog.suppliers, source.suppliers);
  assert.deepEqual(catalog.evaluationSummary, source.evaluationSummary);
  assert.equal(catalog.scoreDistribution.reduce((sum, bin) => sum + bin.count, 0), 1020);
  assert.equal(Object.keys(catalog.pairLeadersBySupplier).length, 17);
  assert.equal(Object.keys(catalog.pairLeadersByTender).length, 60);
  assert.equal(manifest.counts.pairs, 1020);
  assert.equal(manifest.counts.modelCalls, 0);
  assert.equal(manifest.semanticEmbeddingState, "MISSING");
  for (const [name, metadata] of Object.entries(manifest.files)) {
    assert.ok(!name.includes(".."));
    const bytes = (await readFile(join(root, name), "utf8")).replace(/\r\n/g, "\n");
    assert.equal(hash(bytes), metadata.sha256, name);
    assert.equal(Buffer.byteLength(bytes), metadata.bytes, name);
    assert.doesNotMatch(bytes, /postgres(?:ql)?:\/\/|password=|TENDERMATCH_SUPPLIER_DATABASE_URL/i);
  }
  const seen = new Map();
  for (const [dimension, paths] of Object.entries({ suppliers: index.suppliers, tenders: index.tenders })) {
    const keys = new Set();
    for (const [id, path] of Object.entries(paths)) {
      assert.ok(path.startsWith("/tendermatch/data/pairs-v2/"));
      const page = await read(path.replace("/tendermatch/data/", ""));
      assert.equal(page.runId, manifest.runId);
      assert.equal(page.nextCursor, null);
      assert.equal(page.items.length, dimension === "suppliers" ? 60 : 17);
      assert.ok(page.items.length <= 100);
      for (const row of page.items) {
        assert.equal(row[dimension === "suppliers" ? "supplierId" : "tenderId"], id);
        assert.equal(keys.has(row.key), false); keys.add(row.key);
        const original = originals.get(row.key);
        assert.equal(row.pairScore, original.value);
        assert.equal(row.dataCoverage, original.dataCoverage);
        assert.equal(row.evidenceConfidence, original.evidenceConfidence);
        assert.equal(row.denominator, 100);
        assert.equal("criteria" in row, false);
        if (seen.has(row.key)) assert.equal(row.cacheKey, seen.get(row.key));
        seen.set(row.key, row.cacheKey);
      }
    }
    assert.equal(keys.size, 1020);
  }
});

test("static exporter consumes paginated catalog v2 without a verbose pair universe or live database", async (context) => {
  const pinned = await createPinnedSnapshotStore();
  // A read-only adapter test double exercises the exporter gate; no connection is opened.
  const app = await createTenderMatchLocalServer({ store: { ...pinned, sourceMode: undefined }, clock: () => "2026-09-01T11:09:44.745Z" });
  await app.ready; app.server.listen(0, "127.0.0.1"); await once(app.server, "listening");
  context.after(() => app.server.close());
  const directory = await mkdtemp(join(tmpdir(), "tendermatch-export-v2-"));
  context.after(() => rm(directory, { recursive: true, force: true }));
  const child = spawn(process.execPath, ["--experimental-strip-types", "scripts/export-tendermatch-static-snapshot.mjs", "--origin", `http://127.0.0.1:${app.server.address().port}`, "--output-dir", directory], { stdio: ["ignore", "pipe", "pipe"] });
  let output = ""; child.stdout.on("data", (bytes) => { output += bytes; }); child.stderr.on("data", (bytes) => { output += bytes; });
  const [code] = await once(child, "exit");
  assert.equal(code, 0, output);
  const exported = await read("runtime-catalog-v2.json", directory);
  assert.equal("evaluations" in exported, false);
  assert.equal("consumerRole" in exported.summary, false);
  assert.equal("views" in exported.summary, false);
  const manifest = await read("pair-snapshot-v2.manifest.json", directory);
  assert.equal(manifest.counts.pairs, 1020);
  for (const [name, metadata] of Object.entries(manifest.files)) {
    const bytes = await readFile(join(directory, name));
    assert.equal(hash(bytes), metadata.sha256, name);
  }
});

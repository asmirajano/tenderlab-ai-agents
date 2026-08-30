import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import {
  buildAllMatches,
  createCaseResult,
  demoSuppliers,
  pilotExtractionManifest,
  pilotSnapshot,
  runtimeTenders,
  tenderRadarCoordinate,
} from "../packages/tendermatch/src/index.ts";

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const allowedCountries = new Set(["KZ", "KG", "TJ", "TM", "UZ"]);

test("uses every and only qualifying Central Asia current tender from the pilot extraction", () => {
  assert.equal(runtimeTenders.length, pilotExtractionManifest.count);
  assert.equal(runtimeTenders.length, 60);
  assert.equal(new Set(runtimeTenders.map((record) => record.id)).size, runtimeTenders.length);
  assert.ok(runtimeTenders.every((record) => record.id.startsWith("tender:NEON:")));
  assert.ok(runtimeTenders.every((record) => allowedCountries.has(record.countryCode)));
  assert.ok(runtimeTenders.every((record) => record.databaseStatus === "OPEN"));
  assert.ok(runtimeTenders.every((record) => new Date(record.deadlineAt) >= new Date(pilotSnapshot.asOf)));
  assert.deepEqual(pilotExtractionManifest.countryDistribution, { KZ: 10, KG: 12, TJ: 16, TM: 0, UZ: 22 });
  assert.deepEqual(pilotExtractionManifest.deadlineStateAtExtraction, { CURRENT: 60, EXPIRED: 0, UNKNOWN: 0 });
});

test("retains deterministic order and reconciles the committed snapshot hash", async () => {
  for (let index = 1; index < runtimeTenders.length; index += 1) {
    const previous = runtimeTenders[index - 1];
    const current = runtimeTenders[index];
    const previousPublished = new Date(previous.publishedAt).getTime();
    const currentPublished = new Date(current.publishedAt).getTime();
    assert.ok(previousPublished >= currentPublished);
    if (previousPublished === currentPublished) {
      const previousSync = new Date(previous.lastSyncedAt).getTime();
      const currentSync = new Date(current.lastSyncedAt).getTime();
      assert.ok(previousSync > currentSync || (previousSync === currentSync && previous.id.localeCompare(current.id) <= 0));
    }
  }
  const snapshot = await readFile(path.join(projectRoot, pilotExtractionManifest.snapshotPath));
  assert.equal(createHash("sha256").update(snapshot).digest("hex"), pilotExtractionManifest.snapshotSha256);
});

test("preserves missing source values and traceable source identities without fabricating fields", () => {
  assert.equal(runtimeTenders.filter((record) => record.budget?.amount !== null).length, 0);
  assert.equal(runtimeTenders.filter((record) => record.sourceNoticeUrl === null).length, 16);
  assert.equal(runtimeTenders.filter((record) => record.buyer === "Unknown / not disclosed").length, 44);
  assert.ok(runtimeTenders.every((record) => record.budgetLabel === "Not disclosed"));
  assert.ok(runtimeTenders.every((record) => record.sourceIdentity?.id && record.feedIdentity?.id && record.contentHash && record.dataVersion));
  assert.equal(pilotExtractionManifest.fieldCoverage.budgetAmount, 0);
  assert.equal(pilotExtractionManifest.fieldCoverage.sourceNoticeUrl, 44);
});

test("keeps all pilot Supplier × Tender pairs explicitly unassessed and MISSING", () => {
  const matches = buildAllMatches(runtimeTenders, demoSuppliers, pilotSnapshot.asOf);
  assert.equal(matches.length, runtimeTenders.length * demoSuppliers.length);
  assert.equal(matches.length, 600);
  assert.ok(matches.every((match) => match.exactLegacyPair === false));
  assert.ok(matches.every((match) => match.matchScore.value === null && match.auditedMatch.value === null));
  assert.ok(matches.every((match) => match.matchScore.valueClass === "MISSING" && match.auditedMatch.valueClass === "MISSING"));
  assert.equal(matches.filter((match) => match.matchScore.value === 0).length, 0);
});

test("binds new Cases to the pilot snapshot and preserves the unassessed review blocker", () => {
  const result = createCaseResult("case:TM:PILOT:ONE", runtimeTenders[0], demoSuppliers[0], pilotSnapshot.asOf);
  assert.deepEqual(result.evidenceSnapshotIdentity, { id: pilotSnapshot.id, version: pilotSnapshot.asOf });
  assert.equal(result.match.matchScore.value, null);
  assert.equal(result.reviewSupport.readyForCurrentDecision, false);
  assert.ok(result.reviewSupport.findings.some((finding) => finding.code === "MATCH_UNASSESSED"));
  assert.match(result.knownLimitations.join(" "), /country-level placement/);
});

test("uses honest country-level map placement and runtime-derived counts", async () => {
  const first = tenderRadarCoordinate(runtimeTenders[0], 0);
  const second = tenderRadarCoordinate(runtimeTenders[0], 1);
  assert.equal(first.group, runtimeTenders[0].country);
  assert.notDeepEqual(first, second);
  const page = await readFile(path.join(projectRoot, "apps/tender-apps/src/tendermatch-app.tsx"), "utf8");
  assert.match(page, /COUNTRY-LEVEL PLACEMENT · VISUAL SPACING ONLY/);
  assert.match(page, /runtimeTenders\.length \* demoSuppliers\.length/);
  assert.doesNotMatch(page, /16 opportunities|10 × 16|142 source combinations|All sixteen/);
  assert.doesNotMatch(page, /demoTenders/);
});

test("keeps database access server-side/local and contains no credential material", async () => {
  const script = await readFile(path.join(projectRoot, "scripts/extract-tendermatch-central-asia-pilot.mjs"), "utf8");
  const snapshot = await readFile(path.join(projectRoot, pilotExtractionManifest.snapshotPath), "utf8");
  assert.match(script, /begin transaction read only/i);
  assert.match(script, /current_user/);
  assert.doesNotMatch(script, /VITE_/);
  assert.doesNotMatch(snapshot, /postgres(?:ql)?:\/\//i);
  assert.doesNotMatch(snapshot, /TENDERMATCH_NEON_DATABASE_URL/);
  assert.doesNotMatch(snapshot, /password/i);
});

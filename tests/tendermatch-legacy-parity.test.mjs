import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import {
  TENDERBOOST_DEMO_AS_OF,
  buildAllMatches,
  demoSuppliers,
  demoTenders,
  deriveTenderFreshness,
  paritySummary,
  tenderBoostParityManifest,
} from "../packages/tendermatch/src/index.ts";

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const snapshotNow = "2026-08-15T12:00:00+05:00";

test("accounts for every active frozen matching surface with no missing items", () => {
  assert.equal(tenderBoostParityManifest.length, 62);
  assert.deepEqual(paritySummary(), { preserved: 13, "adapted-to-tenderapps-design": 11, "truth-corrected": 38, missing: 0 });
  assert.equal(new Set(tenderBoostParityManifest.map((item) => item.id)).size, tenderBoostParityManifest.length);
  assert.equal(tenderBoostParityManifest.some((item) => item.status === "missing"), false);
  for (const source of ["01 Dashboard", "02 Market Radar / Tenders", "02 Market Radar / Suppliers", "03 Suppliers / Profiles", "03 Suppliers / Verification", "04 Tenders", "05 Full Match Matrix", "05 AutoMatch by Tenders", "05 AutoMatch by Suppliers"]) {
    assert.ok(tenderBoostParityManifest.some((item) => item.sourceSurface === source), source);
  }
  assert.equal(tenderBoostParityManifest.some((item) => /campaign|follow-up/i.test(`${item.id} ${item.targetSurface}`)), false);
  assert.equal(tenderBoostParityManifest.find((item) => item.id === "data-deadline-baseline-vector")?.sourceEvidence, "04b0b2a:app/tenderboost-ai/page.tsx:137-153 · tenders[].daysLeft");
  assert.equal(tenderBoostParityManifest.some((item) => item.sourceEvidence?.includes("tenderData")), false);
});
test("reconstructs the exact frozen relative-deadline vector from absolute end-of-day deadlines", () => {
  assert.deepEqual(demoTenders.map((tender) => deriveTenderFreshness(tender, TENDERBOOST_DEMO_AS_OF).daysRemaining), [1, 1, 2, 2, 5, 5, 8, 8, 8, 8, 9, 11, 15, 16, 116, 135]);
});

test("keeps the frozen fixture cardinalities and explicit MISSING matrix cells", () => {
  const matches = buildAllMatches(demoTenders, demoSuppliers, snapshotNow);
  assert.equal(demoTenders.length, 16);
  assert.equal(demoSuppliers.length, 10);
  assert.equal(matches.length, 160);
  assert.equal(matches.filter((item) => item.matchScore.value !== null).length, 18);
  assert.equal(matches.filter((item) => item.matchScore.value === null).length, 142);
  assert.equal(matches.filter((item) => item.matchScore.value === 0).length, 0);
});

test("renders every matching view and no Campaign Studio runtime or styling", async () => {
  const page = await readFile(path.join(projectRoot, "apps/tender-apps/src/tendermatch-app.tsx"), "utf8");
  const styles = await readFile(path.join(projectRoot, "apps/tender-apps/src/tendermatch.css"), "utf8");
  for (const label of ["Overview", "Market Radar", "Suppliers", "Profiles", "Verification", "Tenders", "Match Matrix", "Full Match Matrix", "Review by Tenders", "Review by Suppliers"]) assert.match(page, new RegExp(label));
  for (const content of ["Current Tender Radar", "Supplier Market", "Full Match Matrix", "Review by Tenders", "Review by Suppliers", "Case save failed"]) assert.match(page, new RegExp(content));
  assert.match(page, /Promotion and outreach belong to a separate future Marketing Agent/);
  assert.match(page, /role="alert"/);
  assert.match(page, /MISSING · insufficient evidence/);
  assert.match(page, /STATED_UNVERIFIED remains stated and INFERRED remains inferred\. UNKNOWN remains MISSING\. None becomes verified, zero, or negative evidence/);
  assert.doesNotMatch(page, /Outreach status|NOT[_ -]?SENT|local draft|campaign status|delivery state/);
  assert.match(page, /data-map-mode="local-geographic"/);
  assert.match(page, /data-map-snapshot=\{kind === "world" \? "current-pilot" : "neon-supplier-v1\.3"\}/);
  assert.match(page, /CENTRAL ASIA CURRENT-TENDER SNAPSHOT/);
  assert.match(page, /COUNTRY-LEVEL PLACEMENT · VISUAL SPACING ONLY/);
  assert.match(page, /GEOGRAPHIC SUPPLIER DENSITY · UNDER REVIEW/);
  assert.match(page, /Map geometry · Wikimedia Commons/);
  assert.match(page, /Use arrow keys or drag to pan after zooming/);
  assert.doesNotMatch(page, /<aside className="tb3-radar-detail"|Detailed Case Review/);
  assert.match(page, /tb3-radar-layout aggregate/);
  assert.match(styles, /url\("\/tendermatch\/maps\/world-map\.png"\)/);
  assert.match(styles, /\.tb3-geo-map-shell\.world \.tb3-geo-map-geometry, \.tb3-geo-map-shell\.supplier-world/);
  assert.doesNotMatch(page, /kind="china"|country-level China placement/);
  assert.match(styles, /\.tb3-directory-row\.tender[^}]+min-height: 112px/);
  assert.match(page, /viewSurfaceRef\.current\?\.focus\(\)/);
  assert.match(page, /role="region"[\s\S]+tabIndex=\{-1\}/);
  assert.doesNotMatch(page, /Legacy Campaign Studio|CampaignsView|FollowupsView|CampaignWorkspace|Create legacy local draft|SIMULATION_STARTED/);
  assert.doesNotMatch(styles, /tb3-(?:legacy|campaign|followup|response-actions|event-log|channel-list|copy-editor|sequence)/);
  assert.doesNotMatch(page, /Agent Command Center|tb-topbar|tb-sidebar/);
  assert.doesNotMatch(`${page}\n${styles}`, /tileLayer|openstreetmap|leaflet|Special:Redirect/i);
});

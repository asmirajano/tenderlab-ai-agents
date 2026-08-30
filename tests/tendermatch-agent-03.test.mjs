import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import {
  TENDERMATCH_SCHEMA_VERSION,
  assessMatch,
  buildAllMatches,
  createCaseResult,
  demoSuppliers,
  demoTenders,
  deriveTenderFreshness,
  evaluateConsultantReviewSupport,
  loadCaseResult,
  saveCaseResult,
  setConsultantDecision,
} from "../packages/tendermatch/src/index.ts";
import { agents } from "../packages/catalog-data/src/agents.ts";
import { clientProducts, tenderMatchProduct } from "../packages/catalog-data/src/client-products.ts";
import { realAgentImplementations } from "../packages/catalog-data/src/real-agent-development.ts";

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const snapshotNow = "2026-08-15T12:00:00+05:00";
const currentNow = "2026-08-30T12:00:00+05:00";

function read(relativePath) {
  return readFile(path.join(projectRoot, relativePath), "utf8");
}

function memoryStorage() {
  const values = new Map();
  return {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, String(value)),
    removeItem: (key) => values.delete(key),
    values,
  };
}

function fixturePair() {
  return {
    tender: demoTenders.find((item) => item.reference === "514122"),
    supplier: demoSuppliers.find((item) => item.id === "supplier:TB:yutong"),
  };
}

test("places TenderMatch as practical page 03 under TL-A031 without creating or implying Agent 003", () => {
  assert.equal(agents.length, 64);
  assert.equal(clientProducts.length, 3);
  assert.equal(tenderMatchProduct.catalogOrder, 3);
  assert.equal(tenderMatchProduct.ownerAgentId, "agent:TL-A031");
  assert.notEqual(tenderMatchProduct.ownerAgentId, "agent:TL-A003");
  assert.equal(tenderMatchProduct.name, "TenderMatch");
  assert.equal(tenderMatchProduct.clientRoute, "/tendermatch");
  assert.match(tenderMatchProduct.descriptor, /Company × Tender evaluation/);
  assert.doesNotMatch(tenderMatchProduct.descriptor, /TenderBoost/i);

  const owner = agents.find((item) => item.registryId === "agent:TL-A031");
  assert.equal(owner?.name, "Company-to-Tender Match Score Agent");
  assert.equal(owner?.output.primary, "Объяснимая оценка Company × Tender");

  const implementation = realAgentImplementations.find((item) => item.id === "implementation:TEA-RAI-TENDERBOOST");
  assert.equal(implementation?.name, "TenderMatch · TenderApps Agent 03");
  assert.equal(implementation?.slug, "tendermatch");
  assert.equal(implementation?.ownerAgentId, "agent:TL-A031");
  assert.doesNotMatch(implementation?.descriptor ?? "", /TenderBoost/i);
  assert.match(implementation?.primaryOutput ?? "", /evidence-gated audited result or explicit MISSING state/);
  assert.match(JSON.stringify(implementation), /separately versioned legacy Campaign Studio parity module/);
  assert.match(implementation?.tor ?? "", /without owning[\s\S]+legacy Campaign Studio/);
});

test("maps all 12 TenderMatch views exactly once into the restored six-family workflow", async () => {
  const page = await read("apps/tender-apps/src/tendermatch-app.tsx");
  const styles = await read("apps/tender-apps/src/tendermatch.css");
  const registry = page.match(/const navGroups: NavGroup\[\] = \[[\s\S]+?\n\];\n\nconst navItems/)?.[0] ?? "";
  const expectedViews = [
    ["dashboard", "Overview", "01"], ["radar-tenders", "Tenders", "02A"], ["radar-suppliers", "Suppliers", "02B"], ["suppliers", "Profiles", "03A"],
    ["verification", "Verification", "03B"], ["tenders", "Tenders", "04"], ["matrix", "Full Match Matrix", "05A"], ["match-tenders", "AutoMatch by Tenders", "05B"],
    ["match-suppliers", "AutoMatch by Suppliers", "05C"], ["audit", "Detailed Case Review", "05D"], ["campaigns", "Campaigns", "06A"], ["followups", "Follow-ups", "06B"],
  ];
  const expectedFamilies = [["overview", "Overview"], ["market", "Market Radar"], ["suppliers", "Suppliers"], ["tender-directory", "Tenders"], ["match", "Match Matrix"], ["legacy", "Legacy Campaign Studio"]];

  assert.ok(registry);
  for (const [view, label, short] of expectedViews) {
    assert.equal((registry.match(new RegExp(`id: "${view}", label: "${label}", short: "${short}"`, "g")) ?? []).length, 1, `${view} must appear exactly once in the navigation registry`);
  }
  let priorIndex = -1;
  for (const [id, family] of expectedFamilies) {
    const index = registry.indexOf(`id: "${id}", label: "${family}"`);
    assert.ok(index > priorIndex, `${family} must follow the approved workflow order`);
    priorIndex = index;
  }
  assert.match(registry, /Legacy Campaign Studio[\s\S]+Isolated parity module[\s\S]+Local drafts · NOT SENT[\s\S]+Simulation events only/);
  assert.match(page, /aria-controls=\{`tb3-nav-children-/);
  assert.match(page, /aria-expanded=\{isExpanded\}/);
  assert.match(page, /aria-current=\{view === item\.id \? "page" : undefined\}/);
  assert.match(page, /aria-controls="tb3-mobile-workflow-tree"/);
  assert.match(page, /setMobileNavOpen\(false\)/);
  assert.match(page, /activateNavigationFromKeyboard[\s\S]+event\.key !== "Enter"[\s\S]+event\.key !== " "/);
  assert.match(styles, /\.tb3-nav-family\.current/);
  assert.match(styles, /\.tb3-nav-children button\.active/);
  assert.match(styles, /\.tb3-mobile-workspace-nav > div \{[^}]*overflow-y: auto/);
});

test("keeps active paths TenderMatch-only and classifies every retained TenderBoost occurrence as protected lineage", async () => {
  const legacyTerm = "tender" + "boost";
  const trackedPaths = execFileSync("git", ["ls-files"], { cwd: projectRoot, encoding: "utf8" }).trim().split(/\r?\n/);
  assert.deepEqual(trackedPaths.filter((entry) => new RegExp(legacyTerm, "i").test(entry)), []);

  const textPath = /(?:^|\/)(?:[^/]+\.(?:css|html|json|md|mjs|toml|ts|tsx|yaml|yml)|AGENTS\.md)$/i;
  const occurrence = new RegExp(legacyTerm, "ig");
  const stableId = new RegExp(`(?:product:TA-|implementation:TEA-RAI-)${legacyTerm}`, "i");
  const compatibilityRoute = new RegExp(`/${legacyTerm}(?:-ai)?`, "i");
  const storageKey = new RegExp(`tenderapps:${legacyTerm}`, "i");
  const sourceLocator = new RegExp(`app/${legacyTerm}-ai/page\\.tsx`, "i");
  const historicalIdentifier = new RegExp(`${legacyTerm}-legacy-`, "i");
  const frozenSymbol = new RegExp(`${legacyTerm.toUpperCase()}_|${legacyTerm[0].toLowerCase()}${legacyTerm.slice(1, 6)}BoostParityManifest`);
  const qualifiedContext = /legacy|frozen|source|migration|historical|standalone|lineage|prior|protected|compatibility|qualified/i;
  const unclassified = [];

  for (const relativePath of trackedPaths.filter((entry) => textPath.test(entry))) {
    const content = await read(relativePath);
    for (const [index, line] of content.split(/\r?\n/).entries()) {
      occurrence.lastIndex = 0;
      while (occurrence.exec(line)) {
        const protectedOccurrence = stableId.test(line)
          || compatibilityRoute.test(line)
          || storageKey.test(line)
          || sourceLocator.test(line)
          || historicalIdentifier.test(line)
          || frozenSymbol.test(line)
          || qualifiedContext.test(line)
          || /sourceProductName|doesNotMatch|No active filesystem path/.test(line);
        if (!protectedOccurrence) unclassified.push(`${relativePath}:${index + 1}:${line.trim()}`);
      }
    }
  }

  assert.deepEqual(unclassified, []);
});

test("keeps 18 assessed pairs and 142 unassessed pairs as MISSING rather than zero", () => {
  const matches = buildAllMatches(demoTenders, demoSuppliers, snapshotNow);
  assert.equal(matches.length, 160);
  assert.equal(matches.filter((item) => item.matchScore.value !== null).length, 18);
  assert.equal(matches.filter((item) => item.matchScore.value === null).length, 142);
  assert.equal(matches.filter((item) => item.matchScore.value === 0).length, 0);

  const { tender, supplier } = fixturePair();
  const unassessedSupplier = demoSuppliers.find((item) => item.id === "supplier:TB:huawei");
  const unassessed = assessMatch(tender, unassessedSupplier, snapshotNow);
  assert.equal(unassessed.matchScore.value, null);
  assert.equal(unassessed.matchScore.valueClass, "MISSING");
  assert.equal(unassessed.auditedMatch.value, null);
  assert.deepEqual(unassessed.auditedMatch.reasonCodes, ["PAIR_UNASSESSED"]);

  const zeroSupplier = {
    ...supplier,
    legacyTenderMatches: supplier.legacyTenderMatches.map((item) => item.tenderReference === tender.reference ? { ...item, score: 0 } : item),
  };
  const genuineZero = assessMatch(tender, zeroSupplier, snapshotNow);
  assert.equal(genuineZero.exactLegacyPair, true);
  assert.equal(genuineZero.matchScore.value, 0);
  assert.equal(genuineZero.matchScore.valueClass, "ESTIMATED");
  assert.notEqual(genuineZero.matchScore.value, unassessed.matchScore.value);
});

test("keeps Match Support, readiness, evidence quality, deadline context, and consultant decision separate", () => {
  const { tender, supplier } = fixturePair();
  const base = assessMatch(tender, supplier, snapshotNow, "pending");
  const approved = assessMatch(tender, { ...supplier, readiness: { ...supplier.readiness, value: 1 } }, snapshotNow, "approved");
  assert.equal(base.auditedMatch.value, 100);
  assert.equal(approved.auditedMatch.value, base.auditedMatch.value);
  assert.equal(approved.verificationQuality.value, base.verificationQuality.value);
  assert.equal(approved.deadlineUrgency.value, base.deadlineUrgency.value);
  assert.notEqual(approved.supplierReadiness.value, base.supplierReadiness.value);
  assert.equal("campaignPriority" in base, false);
});

test("recomputes absolute deadline freshness with an injected clock", () => {
  const { tender } = fixturePair();
  const before = deriveTenderFreshness(tender, snapshotNow);
  const after = deriveTenderFreshness(tender, "2026-08-17T00:00:00+05:00");
  assert.equal(before.status, "urgent");
  assert.equal(after.status, "closed");
  assert.equal(after.daysRemaining, 0);
});

test("surfaces separately owned current-review findings without changing the score", () => {
  const { tender, supplier } = fixturePair();
  const current = assessMatch(tender, supplier, currentNow);
  const support = evaluateConsultantReviewSupport(current, supplier);
  const codes = new Set(support.findings.map((item) => item.code));
  assert.equal(current.auditedMatch.value, 100);
  assert.equal(support.readyForCurrentDecision, false);
  assert.ok(codes.has("TENDER_CLOSED"));
  assert.ok(codes.has("SNAPSHOT_STALE"));
  assert.ok(codes.has("EVIDENCE_REFRESH_REQUIRED"));
  assert.equal(support.findings.find((item) => item.code === "TENDER_CLOSED")?.ownerAgentId, "agent:TL-A017");
  assert.equal(support.findings.find((item) => item.code === "EVIDENCE_REFRESH_REQUIRED")?.ownerAgentId, "agent:TL-A003");

  const risky = { ...supplier, risks: [...supplier.risks, "Sanctions screening unresolved"] };
  const riskSupport = evaluateConsultantReviewSupport(assessMatch(tender, risky, snapshotNow), risky);
  assert.equal(riskSupport.findings.find((item) => item.code === "MATERIAL_RISK_HANDOFF")?.ownerAgentId, "agent:TL-A038");
});

test("records consultant decision revisions with actor, timestamp, and rationale without changing formula outputs", () => {
  const { tender, supplier } = fixturePair();
  const initial = createCaseResult("case:TM-DEMO:decision", tender, supplier, snapshotNow);
  const approved = setConsultantDecision(initial, "approved", "2026-08-15T13:00:00+05:00", {
    actorId: "consultant:one",
    rationale: "Reviewed both evidence components.",
  });
  assert.equal(approved.match.version, "v2");
  assert.equal(approved.caseIdentity.version, "v2");
  assert.equal(approved.match.consultantDecision, "approved");
  assert.equal(approved.match.decisionHistory.length, 1);
  assert.deepEqual(approved.match.decisionHistory[0], {
    id: "match-decision:TM:case-tm-demo-decision:1",
    version: "v1",
    decision: "approved",
    actorId: "consultant:one",
    decidedAt: "2026-08-15T13:00:00+05:00",
    rationale: "Reviewed both evidence components.",
    sourceRole: "USER_ASSERTION",
    valueClass: "SOURCE",
  });
  assert.equal(approved.match.auditedMatch.value, initial.match.auditedMatch.value);
  assert.equal(approved.match.deadlineUrgency.value, initial.match.deadlineUrgency.value);
});

test("reconstructs only an explicit TenderMatch Case and makes a saved pre-deadline Case closed after the deadline", () => {
  const { tender, supplier } = fixturePair();
  const storage = memoryStorage();
  const original = createCaseResult("case:TM-DEMO:stale-resume", tender, supplier, snapshotNow);
  saveCaseResult(storage, original);
  assert.ok(storage.values.has("tenderapps:tendermatch:case:case%3ATM-DEMO%3Astale-resume"));
  assert.equal(loadCaseResult(storage, "case:TM-DEMO:missing", { tender, supplier, nowIso: currentNow }), null);
  const resumed = loadCaseResult(storage, original.caseIdentity.id, { tender, supplier, nowIso: currentNow });
  assert.equal(resumed?.match.tenderFreshness.status, "closed");
  assert.equal(resumed?.match.tenderFreshness.freshness, "stale");
  assert.equal(resumed?.match.auditedMatch.value, original.match.auditedMatch.value);
  assert.ok(resumed?.reviewSupport.findings.some((item) => item.code === "TENDER_CLOSED"));
});

test("migrates legacy TenderBoost Cases into the matching-only schema without overwriting the legacy record", () => {
  const { tender, supplier } = fixturePair();
  const storage = memoryStorage();
  const caseId = "case:TB-DEMO:historical";
  const historical = createCaseResult(caseId, tender, supplier, snapshotNow);
  historical.schemaVersion = "2.0.0";
  historical.campaign = { id: "campaign:historical" };
  historical.campaignEvents = [{ id: "event:historical" }];
  const legacyKey = `tenderapps:tenderboost:case:${encodeURIComponent(caseId)}`;
  storage.setItem(legacyKey, JSON.stringify(historical));

  const migrated = loadCaseResult(storage, caseId, { tender, supplier, nowIso: currentNow });
  assert.equal(migrated?.schemaVersion, TENDERMATCH_SCHEMA_VERSION);
  assert.equal(migrated?.migration.status, "compatible-historical");
  assert.equal(migrated?.migration.fromSchemaVersion, "2.0.0");
  assert.equal(migrated?.migration.sourceProductName, "TenderBoost AI");
  assert.equal("campaign" in migrated, false);
  assert.equal("campaignEvents" in migrated, false);
  assert.ok(storage.values.has(legacyKey));
  assert.equal(storage.values.has(`tenderapps:tendermatch:case:${encodeURIComponent(caseId)}`), false);
  saveCaseResult(storage, migrated);
  assert.ok(storage.values.has(`tenderapps:tendermatch:case:${encodeURIComponent(caseId)}`));
  assert.ok(storage.values.has(legacyKey));
});

test("uses canonical and compatibility routes with a complete truthful parity surface", async () => {
  const [main, page, styles, registry, firebase] = await Promise.all([
    read("apps/tender-apps/src/main.tsx"),
    read("apps/tender-apps/src/tendermatch-app.tsx"),
    read("apps/tender-apps/src/tendermatch.css"),
    read("apps/tender-apps/src/practical-agent-registry.tsx"),
    read("firebase.json"),
  ]);
  assert.match(main, /import TenderMatchApp from "\.\/tendermatch-app"/);
  assert.match(main, /import "\.\/tendermatch\.css"/);
  assert.match(main, /"\/tendermatch": <TenderMatchApp/);
  assert.match(main, /"\/tenderboost": "\/tendermatch"/);
  assert.match(main, /"\/tenderboost-ai": "\/tendermatch"/);
  const tenderMatchDisplay = registry.match(/productId: "product:TA-TENDERBOOST"[\s\S]+?visual: "tendermatch"/)?.[0] ?? "";
  assert.match(tenderMatchDisplay, /displayName: "TenderMatch"/);
  assert.match(tenderMatchDisplay, /description: "(?=[^"]*TenderMatch)(?=[^"]*legacy TenderBoost source)[^"]+"/);
  assert.doesNotMatch(tenderMatchDisplay, /Complete TenderBoost migration|complete frozen TenderBoost workspace/);
  assert.match(page, /TENDERAPPS AGENT 03/);
  assert.match(page, /Tender<em>Match<\/em>/);
  assert.match(page, /SCHEMATIC · NON-GEOSPATIAL/);
  assert.match(page, /data-map-mode="schematic-non-geospatial"/);
  assert.match(page, /Campaign Studio/);
  assert.match(page, /isolated local legacy module/i);
  assert.match(page, /NOT SENT/);
  assert.match(page, /SIMULATION_STARTED/);
  assert.match(page, /Send \/ activate externally/);
  assert.match(page, /disabled title="No authorized delivery integration or event exists"/);
  assert.match(page, /aria-label="TenderMatch frozen-source dataset summary"/);
  assert.match(page, /LEGACY TENDERBOOST-SOURCE RECOMMENDATIONS/);
  assert.doesNotMatch(page, /aria-label="TenderBoost migration dataset summary"|TENDERBOOST LEGACY RECOMMENDATIONS/);
  assert.doesNotMatch(page, /Participation Boost proposal sent/);
  assert.doesNotMatch(page, /Command Center|\/products/);
  assert.doesNotMatch(`${page}\n${styles}`, /leaflet|openstreetmap|wikimedia/i);
  assert.doesNotMatch(firebase, /tenderboost-ai\.web\.app/);
});

test("orients the Overview around TenderLab's internal Company × Tender review outcome before migration evidence", async () => {
  const [page, styles] = await Promise.all([
    read("apps/tender-apps/src/tendermatch-app.tsx"),
    read("apps/tender-apps/src/tendermatch.css"),
  ]);
  const overviewStart = page.indexOf('<PracticalAgentOverview audience="consultant" className="tb3-overview-manifesto"');
  const evidenceStart = page.indexOf('<header className="tb3-demonstration-heading"');
  assert.ok(overviewStart > -1, "product Overview must exist");
  assert.ok(evidenceStart > overviewStart, "product orientation must precede migration evidence");
  const productShell = page.slice(page.indexOf('{view !== "dashboard" && <section className="tb3-product-intro"'), overviewStart);
  const orientation = page.slice(overviewStart, evidenceStart);
  const migrationEvidence = page.slice(evidenceStart, page.indexOf("function TenderRadarView"));

  assert.match(productShell, /TENDERAPPS AGENT 03 · INTERNAL MATCHING WORKSPACE/);
  assert.match(productShell, /Company × Tender evidence review for TenderLab Consultants/);
  assert.match(productShell, /MATCH SUPPORT · HUMAN DECISION · NO OUTREACH/);
  assert.match(productShell, /TenderMatch workspace/);
  assert.match(productShell, /view !== "dashboard" && caseControls/);
  assert.doesNotMatch(productShell, /COMPLETE MIGRATION BASELINE|SOURCE BASELINE|Complete frozen TenderBoost workspace/);

  for (const content of [
    "TENDERMATCH · TENDERLAB CONSULTANT WORKSPACE · AGENT 03",
    "reviewable match result",
    "WHAT YOU PROVIDE",
    "Tender snapshot",
    "Supplier profile",
    "Supporting records",
    "WHAT TENDERMATCH DOES",
    "WHAT YOU RECEIVE",
    "ILLUSTRATIVE FROZEN OUTPUT · NOT A LIVE DECISION",
    "AUDITED MATCH SUPPORT",
    "LINKED EVIDENCE",
    "MISSING / BLOCKERS",
    "DEADLINE FRESHNESS",
    "CONSULTANT DECISION",
    "Open existing match for review",
    "Open Full Matrix",
    "HOW IT WORKS",
    "DOWNSTREAM BOUNDARY",
  ]) assert.match(orientation, new RegExp(content.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")), content);

  assert.ok(orientation.indexOf("WHAT YOU PROVIDE") < orientation.indexOf("WHAT TENDERMATCH DOES"));
  assert.ok(orientation.indexOf("WHAT TENDERMATCH DOES") < orientation.indexOf("WHAT YOU RECEIVE"));
  assert.ok(orientation.indexOf('part="outcome-promise"') < orientation.indexOf('part="input"'));
  assert.ok(orientation.indexOf('part="input"') < orientation.indexOf('part="agent-transformation"'));
  assert.ok(orientation.indexOf('part="agent-transformation"') < orientation.indexOf('part="finished-output"'));
  assert.ok(orientation.indexOf('part="finished-output"') < orientation.indexOf('part="primary-action"'));
  assert.match(orientation, /MISSING<\/b>—never silently converted to zero/);
  assert.match(orientation, /onOpen\(previewAssessment, "match-tenders"\)/);
  assert.match(orientation, /onKeyDown=\{\(event\)[\s\S]+event\.key === "Enter"[\s\S]+event\.key === " "/);
  assert.match(orientation, /onView\("matrix"\)/);
  assert.match(orientation, /separate TenderMarketing or promotion capability/);
  assert.match(orientation, /No tender promotion, supplier contact, message delivery, CRM action, response tracking, participation authorization, or Bid\/No-Bid decision occurs in TenderMatch/);
  assert.match(orientation, /PracticalAgentOverviewBoundary[\s\S]+\{caseControls\}/);
  assert.doesNotMatch(orientation, /tb3-product-intro/);
  assert.doesNotMatch(orientation, /onView\("campaigns"\)|onView\("followups"\)/);

  assert.match(migrationEvidence, /className="tb3-demonstration-heading"[\s\S]+<h2>TenderMatch[^<]*frozen-source parity/);
  for (const retainedEvidence of [
    "DEMONSTRATION DATA AND MIGRATION EVIDENCE",
    "DATED DEMONSTRATION SNAPSHOT",
    "CONSULTANT QUEUE",
    "LOCAL WORKFLOW",
    "CAPABILITY HANDOFFS",
  ]) assert.match(migrationEvidence, new RegExp(retainedEvidence), retainedEvidence);

  assert.match(page, /sublabel: "Internal matching workspace"/);
  assert.match(styles, /\.tb3-overview-story \{[^}]*grid-template-columns:/);
  assert.match(styles, /\.tb3-page-overview \.tb3-overview-heading h1/);
  assert.match(styles, /\.tb3-page-overview \.tb3-overview-actions/);
  assert.match(styles, /@media \(max-width: 1200px\)[\s\S]*?\.tb3-overview-story \{ grid-template-columns: repeat\(2, minmax\(0, 1fr\)\); \}/);
  assert.match(styles, /@media \(max-width: 640px\)[\s\S]*?\.tb3-overview-story \{ grid-template-columns: 1fr; \}/);
});

test("renders Campaign Studio only as an unregistered legacy parity module and future capability candidate", async () => {
  const candidate = await read("docs/campaign-studio-future-capability-candidate.md");
  assert.match(candidate, /unplaced future capability candidate/i);
  assert.match(candidate, /outside TenderMatch's canonical Company × Tender responsibility and `agent:TL-A031`/);
  assert.match(candidate, /legacy parity module/);
  assert.match(candidate, /communicationStatus: NOT_SENT/);
  assert.match(candidate, /No assumption is made that it requires Agent 65/);
  assert.equal(clientProducts.some((item) => /campaign/i.test(`${item.name} ${item.descriptor}`)), false);
  assert.equal(realAgentImplementations.some((item) => item.ownerAgentId !== "agent:TL-A031" && /Campaign Studio/i.test(item.name)), false);
});

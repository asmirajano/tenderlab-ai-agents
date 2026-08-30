import pilotFixture from "./fixtures/central-asia-current-tenders.pilot.json" with { type: "json" };
import pilotManifestFixture from "./fixtures/central-asia-current-tenders.pilot.manifest.json" with { type: "json" };
import { TENDERMATCH_PILOT_SNAPSHOT_SCHEMA_VERSION, type TenderRecord } from "./types.ts";

type PilotFixture = {
  schemaVersion: typeof TENDERMATCH_PILOT_SNAPSHOT_SCHEMA_VERSION;
  snapshotId: string;
  extractedAt: string;
  sourceBranchId: string;
  selectionPolicyVersion: string;
  records: Array<{
    neonId: string;
    externalRef: string;
    sourceRef: string | null;
    sourceNoticeUrl: string | null;
    title: string;
    description: string | null;
    procurementType: string;
    databaseStatus: "OPEN" | "CLOSED" | "AWARDED" | "CANCELLED" | "UNKNOWN";
    buyer: string | null;
    financierName: string | null;
    country: { code: "KZ" | "KG" | "TJ" | "TM" | "UZ"; name: string; region: string | null; subRegion: string | null };
    budget: { amount: string | null; currency: string | null; usd: string | null; disclosure: "DISCLOSED" | "NOT_DISCLOSED" };
    publishedAt: string;
    deadlineAt: string;
    source: { id: string; code: string; name: string; type: string };
    feed: { id: string; code: string; name: string; adapterType: string };
    contentHash: string;
    dataVersion: number;
    lastSyncedAt: string;
    syncState: string;
    tags: Array<{ slug: string; label: string; kind: string; origin: string }>;
    sectors: Array<{ code: string; name: string; confidence: number; runId: string | null }>;
    categories: Array<{ code: string; name: string; family: string | null; provenance: string; confidence: number; runId: string | null }>;
    provenance: Record<string, string>;
  }>;
};

const fixture = pilotFixture as unknown as PilotFixture;

function budgetLabel(record: PilotFixture["records"][number]) {
  if (record.budget.amount && record.budget.currency) return `${record.budget.currency} ${record.budget.amount}`;
  if (record.budget.usd) return `USD ${record.budget.usd}`;
  return "Not disclosed";
}

export const runtimeTenders: TenderRecord[] = fixture.records.map((record) => ({
  id: `tender:NEON:${record.neonId}`,
  version: `data-v${record.dataVersion}`,
  reference: record.sourceRef ?? record.externalRef,
  externalRef: record.externalRef,
  sourceRef: record.sourceRef,
  sourceNoticeUrl: record.sourceNoticeUrl,
  title: record.title,
  object: record.procurementType,
  description: record.description,
  procurementType: record.procurementType,
  databaseStatus: record.databaseStatus,
  buyer: record.buyer ?? "Unknown / not disclosed",
  financierName: record.financierName,
  country: record.country.name,
  countryCode: record.country.code,
  region: "Central Asia",
  sourceLabel: record.source.name,
  sourceIdentity: record.source,
  feedIdentity: record.feed,
  budgetLabel: budgetLabel(record),
  budget: record.budget,
  publishedAt: record.publishedAt,
  deadlineAt: record.deadlineAt,
  snapshotId: fixture.snapshotId,
  snapshotAsOf: fixture.extractedAt,
  contentHash: record.contentHash,
  dataVersion: record.dataVersion,
  lastSyncedAt: record.lastSyncedAt,
  syncState: record.syncState,
  provenance: record.provenance,
  sourceRole: "AUTHORITATIVE_SOURCE",
  valueClass: "SOURCE",
  tags: [...record.tags.map((item) => item.label), ...record.sectors.map((item) => item.name), ...record.categories.map((item) => item.name)],
}));

export const pilotSnapshot = {
  id: fixture.snapshotId,
  asOf: fixture.extractedAt,
  sourceBranchId: fixture.sourceBranchId,
  selectionPolicyVersion: fixture.selectionPolicyVersion,
  classification: "BOUNDED READ-ONLY CURRENT-TENDER PILOT",
  tenderCount: runtimeTenders.length,
  supplierCount: 10,
  pairCount: runtimeTenders.length * 10,
} as const;

export const pilotExtractionManifest = pilotManifestFixture;

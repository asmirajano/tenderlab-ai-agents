# TenderMatch Central Asia current-tender pilot

Status: local bounded real-data pilot; matching remains unassessed. This record does not authorize deployment, canonical Dataset writes, a browser database connection, or any external action.

## Source and selection contract

- Source role: `AUTHORITATIVE_SOURCE` for the tender fields present in the verified Neon branch.
- Branch identity: `br-morning-water-atqp6w7c` (`backup/pre-mvp-rc1-20260726`).
- Access: `th_qa_readonly` inside an explicit read-only transaction. The credential is read from a local uncommitted env file and is never serialized.
- Countries: exactly KZ, KG, TJ, TM, and UZ, joined from `tenders.primaryCountryId` to `countries.id`.
- Predicate: `deletedAt IS NULL`, database `status = OPEN`, and `deadlineAt >= CURRENT_TIMESTAMP`.
- Order: `publishedAt DESC NULLS LAST`, `lastSyncedAt DESC`, tender UUID ASC.
- Reproduction: `npm run extract:tendermatch-pilot -- --env-file <local-secret-file>`.

The extraction at `2026-08-30T19:43:42.690Z` returned 60 unique rows: KZ 10, KG 12, TJ 16, TM 0, and UZ 22. The zero TM result is retained; no record is padded, substituted, or sourced outside the predicate. All 60 were database `OPEN` with a qualifying deadline at extraction. Runtime freshness is nevertheless recalculated from the saved absolute deadline and current/injected clock, so an expired snapshot record cannot remain current.

## Normalized contract

The sanitized snapshot preserves the Neon UUID, external and source references, notice URL, source title/description, procurement type, database status, buyer, country, financier, budget disclosure, publication/deadline, source and feed identities, content hash, data version, synchronization state/timestamps, and lightweight tags/sectors/categories/provenance when present. Raw JSON, embeddings, search vectors, contacts, documents, and large extracted payloads are excluded.

Missing source values stay explicit. In this extraction buyer is present for 16/60 rows, source notice URL for 44/60, and budget amount/currency for 0/60. The UI renders `Unknown / not disclosed` or `Not disclosed`; it does not infer buyer, location, value, requirements, or capability.

The runtime tender identity is `tender:NEON:<UUID>` with the source `dataVersion`. The evidence snapshot identity and extraction time flow into every new explicit Case. The ten supplier profiles remain the historical demonstration fixture. Every one of the 600 Supplier × Tender intersections is unassessed and therefore `MISSING`; no legacy reference collision can attach a historical score to a Neon tender.

## Geography and runtime boundary

The tender map uses the supplied country only. Country anchors and small deterministic visual offsets keep controls selectable; the UI labels the placement as country-level and non-precise. It does not claim city coordinates, tender-site location, distance, routing, or live tiles.

TenderApps remains a static Vite application. The committed JSON snapshot is the browser input; the database driver and credential are used only by the local extraction script. Browser-local Case storage is neither tenant-isolated persistence nor a canonical Dataset write.

## Actual-output audit and failure ledger

| What happened | Root cause | Correction | Reusable rule | Regression evidence |
| --- | --- | --- | --- | --- |
| The initial brief proposed selecting 100 recent records despite only a smaller genuinely current set. | Recency and current eligibility were conflated. | Select all and only OPEN, non-deleted, non-expired rows; do not target or pad a count. | Current-set predicates determine cardinality; product copy and tests derive counts from the artifact. | Snapshot predicate/distribution tests and manifest count reconciliation. |
| Historical scores could theoretically collide on a reused source reference. | Legacy lookup used the human-readable reference without checking snapshot lineage. | Legacy score lookup is gated to the frozen TenderBoost snapshot identity. | Match inputs require both record identity and evidence-snapshot lineage. | All 600 pilot pair assessments are MISSING while historical regression scores remain intact. |
| Existing map coordinates were tender-specific demonstration coordinates. | The old fixture supplied curated marker positions; Neon supplies country only. | Use labelled country-level anchors with visual spacing. | Never convert country membership into a precise tender coordinate. | Country-filter and coordinate-boundary tests plus browser map QA. |

## Evidence and maturity

The tender onboarding evidence is an isolated authorized realistic source snapshot. The overall TenderMatch product remains `concept-or-simulation` for matching because no pilot pair has been evaluated by a validated matching method. This stage proves deterministic read-only intake, normalized runtime rendering, explicit MISSING pairs, Case reconstruction, and truthful country/deadline handling—not production match accuracy, live synchronization, durable security, or enterprise runtime readiness.

Machine evidence:

- `packages/tendermatch/src/fixtures/central-asia-current-tenders.pilot.json`
- `packages/tendermatch/src/fixtures/central-asia-current-tenders.pilot.manifest.json`
- `scripts/extract-tendermatch-central-asia-pilot.mjs`

# TenderMatch Neon supplier v1.3 — browser QA evidence

Recorded on 2026-09-01 for `codex/tendermatch-final-integration`, from pre-commit base `02ba6f676b7507a2864068c1b617543fddd04b5d`, against the local production build and same-origin read-only runtime at `http://127.0.0.1:4177`.

## Rendered matrix

The in-app browser exercised every active TenderMatch view at four layout conditions:

- desktop Standard: 1440 × 900;
- desktop Wide: 1440 × 900;
- tablet: 834 × 1112;
- mobile: 390 × 844.

The nine views were Overview, Tender Radar, Supplier Radar, Supplier Profiles, Evidence Review, Tender Snapshot, Full Match Matrix, Review by Tenders and Review by Suppliers. All 36 combinations rendered their expected heading and view-region label, retained exactly five workflow families, exposed the active direct-load view, and had no page-level horizontal overflow, runtime alert, console warning or console error.

Additional interaction checks passed:

- the Overview primary action activated by keyboard and moved focus to `Review by Tenders workspace`;
- direct-load nested views expand the owning navigation family and expose the active child;
- the responsive workflow menu opened by keyboard, navigated to Supplier Radar, then closed with its active family/item updated;
- the local supplier world map loaded `world-map.png`, exposed 14 country clusters and 17 supplier markers, zoomed to 120%, and accepted keyboard pan;
- Evidence Review loaded 17 safe records for the sampled supplier: 1 INFERRED, 14 STATED_UNVERIFIED and 2 UNKNOWN, with `0 verified` visible and no contact/raw-content fields;
- explicit Case save and reload succeeded, and reload stated that deadline context was recomputed;
- `/tendermatch`, `/tenderboost` and `/tenderboost-ai` loaded the TenderMatch title and refreshed without horizontal overflow;
- a static-host/disconnected check rejected the malformed API body and rendered an accessible offline alert, retry control and `No fixture fallback was applied` message instead of a blank page.

## Practical-Agent callout refinement

TenderBalance and Tender Logistics Cost were checked at desktop Standard, desktop Wide, tablet and mobile (8 rendered combinations). Both callouts now begin on the first Overview heading row at desktop. Their local images load successfully; the TenderBalance image is an original generated Chinese male finance analyst visibly working with a calculator and statement. Tablet/mobile stacking remains readable, and no checked route has horizontal overflow.

## Runtime truth checked in the browser

- Supplier contract: `tendermatch-supplier-goods-works-v1.3`.
- Active suppliers: 17 (14 GOODS, 3 WORKS), all under review and usable with limitations.
- Safe evidence: 289 (0 VERIFIED, 17 INFERRED, 226 STATED_UNVERIFIED, 46 UNKNOWN).
- Pair inventory: 60 × 17 = 1,020 completed evaluations.
- Numeric exploratory results: 0.
- MISSING results: 1,020.

## Automated evidence paired with the browser review

- Focused regression set: 56 passed, 0 failed.
- Final full repository suite: 270 passed, 0 failed.
- Root lint: passed.
- Strict TenderMatch changed-surface TypeScript: passed.
- Full repository build: passed for Command Center/Firebase export, Ecosystem Atlas, unified TenderApps and 64 generated Agent specifications.
- Full TenderApps TypeScript baseline: 19 errors remain only in unchanged TenderBalance/Logistics Excel, PDF, FX and ES-lib surfaces; the changed TenderMatch and callout surfaces add none.
- Exact secret scan: 318 tracked/build files checked, 0 exact credential matches.

The evidence above was local-only at its original checkpoint; later release evidence is recorded separately below.

## Firebase-compatible snapshot correction

The later production correction preserves the local API evidence above and adds an intentionally public, sanitized static release of the same immutable v1.3 batch. The generated manifest records 17 suppliers, 289 non-contact evidence records, 1,020 unique evaluations, zero numeric results and 1,020 MISSING results, with SHA-256 identities for both data files.

The exact TenderApps production artifact was served without `/api/tendermatch/*`. Direct Overview and Evidence Review loads recovered through `/tendermatch/data/supplier-runtime-v1.3.json` and `/tendermatch/data/supplier-evidence-v1.3.json`; the browser displayed `PINNED V1.3 SNAPSHOT`, loaded evidence, showed no offline alert, had no horizontal overflow or broken image, and produced no console warning/error. Production publication remains bound to a separately recorded successful GitHub/Firebase release run.

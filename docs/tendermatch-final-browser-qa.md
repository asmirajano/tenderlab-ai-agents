# TenderMatch final integration browser QA

This is the durable browser record for the pre-commit integration candidate based on `573af695690a5e128f1264f9f70451a57d38a5bc`. Screenshot filenames, pixel dimensions, and hashes are recorded in [`evidence/tendermatch-final-integration/manifest.json`](evidence/tendermatch-final-integration/manifest.json). The final local checkpoint identity is recorded in the integration handoff because the screenshots necessarily predate that commit.

## Retained screenshot evidence

Six screenshots are retained: Overview at desktop Standard, desktop Wide, tablet, and mobile; Global Tender Demand at desktop Standard; and Supplier Footprint at desktop Standard. This evidence set does not claim a screenshot for every matrix combination.

Four additional corrective screenshots retain the user-approved `d2834b2` Overview composition at desktop Standard, desktop Wide, tablet, and mobile. They are identified by the `overview-corrected-` prefix and are tied to parent checkpoint `9e4bf6c65aa6ad4b8c679e17662f15f331b8c4be` in the manifest.

## Corrective Overview comparison

- The corrected Overview restores the `d2834b2` illustrated Tender × Company cards, evidence cues, central TenderMatch medallion and arrows, four terse action verbs, compact dark reviewable-result panel, supported/blocker cues, and concise action footer.
- The generic three-box input stack, explanatory missingness paragraph, four procedural description rows, and duplicate post-Overview “How it works” section are absent.
- Desktop Standard `1280 × 768`: the input, transformation, and output stages occupy `244 / 118 / 507 px`; the action and authority boundary finish at `663 px`, before the viewport bottom. The output is the dominant stage.
- Desktop Wide `1440 × 900`: the stage widths are `288 / 129 / 599 px`; the action and authority boundary finish at `643 px`.
- Tablet `834 × 1112`: input and transformation share a `375 / 375 px` row and the dark output occupies the full `750 px` story width below them.
- Mobile `390 × 844`: all three stages stack in semantic order at the full `345 px` story width. The page has no horizontal overflow; the compact illustrated input begins in the first screen rather than a long explanatory block.
- At all four widths, the illustrated pair and Agent medallion are present, the duplicate method section is absent, the primary action remains keyboard-operable, and the matching-only Marketing boundary remains visible after the action.
- A responsive-cascade defect found during rendered QA was corrected: the high-specificity desktop story grid now yields to explicit two-column tablet and one-column mobile rules instead of clipping internal panels.

## Overview placement correction

The subsequent placement correction removes the entire reader-facing block after the authority boundary. The retained screenshots use the `overview-compact-` prefix and are tied to parent checkpoint `5d2559884a40debd8733450a7a7f404b581f4f88` in the manifest.

- Desktop Standard and Wide, tablet, and mobile contain only the approved infographic Overview through its small authority boundary.
- `EXPLICIT CASE`, `AUDITED / LEGACY`, Save/Load Case, migration-evidence headings, dated snapshot banner, inventory metrics, Consultant Queue, evaluated-legacy list, and Evidence to decision panel are absent from Overview.
- The Case controls remain implemented and visible on the nine operational views; they were not deleted or relocated.
- No target viewport has page-level horizontal overflow, clipping, or browser-console warnings/errors.

## Interaction and responsive matrix

- Historical evidence at the referenced integration commit checked ten registered views before Detailed Case Review was removed. The current contract has nine views; this statement is retained only as provenance and must not be read as current-state evidence.
- Every view rendered its expected heading exactly once, with no page-level horizontal overflow and no browser console warning or error.
- At desktop Wide `1440 × 900`, the Overview retained its ordered product contract. The finished-output panel was wider than either the input or transformation panel, and the primary action remained visible before the trust boundary.
- The tender map rendered 23 clusters and 16 tender markers. The Africa filter reduced that view to five clusters and two markers; zoom reached 120%; the legend, frozen-state label, TenderLab focus signal, and Commons attribution remained visible.
- The supplier map rendered 15 clusters and 10 supplier markers. Zoom reached 120%, keyboard panning changed the map offset from `(0, 0)` to `(80, 80)`, and the legend, matching-target signal, frozen-state label, and Commons attribution remained visible.
- Direct load and refresh succeeded for `/tendermatch`, `/tenderboost`, and `/tenderboost-ai` with TenderMatch title and active navigation.
- Stale Campaign/Follow-up query, hash, and view values fell back to Overview. No active Campaign/Follow-up destination or current draft, outreach, delivery, CRM, response, or `NOT_SENT` state appeared.
- Keyboard `Enter` expanded the Market Radar family and activated Global demand. Focus moved into the main view surface while active and expanded states remained accurate.
- Saving and reloading the explicit Case produced `Loaded case:TM-DEMO:zr-space-252528-go-rfb:supplier-tb-chery · deadline context recomputed`, preserving the Case identity and clock-derived deadline semantics.
- At mobile width, the responsive workflow control expanded the five-family menu, expanded Match Matrix, activated Full Match Matrix, collapsed the menu, exposed the correct `05 · Match Matrix / Full Match Matrix` state, and retained zero page-level horizontal overflow.

## Validation tied to this evidence

- Focused tests: 47 passed, 0 failed, 0 skipped.
- Full repository tests: 254 passed, 0 failed.
- Original standalone TenderBoost static checks at `04b0b2a723223d11617837ee0e7562fa48168cd9`: 3 passed, 0 failed, 0 skipped.
- Targeted lint: passed.
- Strict TenderMatch changed-surface TypeScript: passed.
- TenderApps production build: passed.
- Full repository build: passed.
- Full-app TypeScript retained unrelated baseline errors in unchanged TenderBalance/Logistics files; no changed TenderMatch error was reported.

The local production preview used `http://127.0.0.1:4177/tendermatch`. No external map tile runtime was used.

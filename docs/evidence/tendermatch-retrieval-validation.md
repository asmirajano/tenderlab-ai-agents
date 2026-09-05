# TenderMatch retrieval/ranking completion evidence

Date: 2026-09-05. Implementation branch: `codex/tendermatch-retrieval-ranking`; base: `71176817cc8feda1e6e7fe0fbe5a0c5dfd41eb98`. The enclosing local checkpoint commit identifies the completed code. Production comparison: fetched `origin/main` at `aa0afce3ff9032b6bb96fb0ca7fa956a5c4616b0`. This is local validation, not a deployment record.

## Evidence reuse and final gate

The final correction round reused the completed full-suite, browser and benchmark evidence; it did not repeat the full implementation audit or scale experiment. No new production-code correction was needed in this round. Only the completion documentation was finalized.

| Check | Result | Evidence / command |
| --- | --- | --- |
| Full repository suite, completed preceding implementation turn | 368 passed; 0 failed/skipped | `node --experimental-strip-types --test` over every `tests/*.test.mjs`, with the transient PGlite module root explicitly set |
| Final focused retrieval and Formula gate | 62 passed; 0 failed/skipped | All `tests/tendermatch-retrieval-*.test.mjs`, `tendermatch-formula-page.test.mjs`, `tendermatch-match-formula-v1.test.mjs` with `TENDERMATCH_PGLITE_ROOT` |
| Actual local PostgreSQL/vector integration | Included, not skipped | PGlite 0.5.3 with pgvector 0.8.1; ephemeral in-memory database only; migration, scores, cache/restart, retrieval, assessment leases, tenant negatives and model isolation |
| Full production build, preceding turn | Passed | `npm run build`: Command Center/static export, Atlas, TenderApps and 64 generated specifications |
| Final TenderApps production build | Passed, 110 modules | `npm run build:tender-apps`; `index-B47XFTdH.js`, `index-CugebHFU.css` |
| Full lint / changed-surface strict TypeScript | Passed in preceding turn | Root ESLint and focused frontend/domain TypeScript checks; no dependency or compiler configuration change |
| Full-app TypeScript | Known baseline failure, unchanged | 24 diagnostics; final and clean-base outputs are byte-identical, in TenderBalance/Logistics surfaces |
| Frozen standalone static checks | 3/3 passed in preceding turn | `npm run test:static` in original `8964` worktree; original source remained clean at `04b0b2a723223d11617837ee0e7562fa48168cd9` |
| Artifact final read-only check | Passed | 79 manifested files, both input hashes, both pair-index directions, all 1,020 golden Formula records and all four benchmark source hashes |

Build warnings are the existing large-bundle warning and the earlier Command Center CSS output-name warning, not build failures. The transient single-connection database does not prove independent multi-session contention, deployed worker recovery, live Neon latency or production ANN recall.

The retained local logs are under ignored `tmp/` in the implementation worktree. Their SHA-256 identities are:

- `retrieval-full-tests.log`: `b09455baf72cbc04d5d182002ca420639c350db64fad6632bdacc4b76f88af82`
- `retrieval-build.log`: `cee2017da42fb76f39c4ca10ad8c5a43512db734592ac1ab12febc2731303eb9`
- `retrieval-final-focused.log`: `41157ba96060b812df65bd508b031292efeb734c66f18051d85235ec99c53121`
- Both `retrieval-full-app-types.log` and `formula-base-types.log`: `e5b45c0ea630571bc2dd1fb39dcd38f60961a8d3b4aa6e6d7eadb756d2394678`

The concise record is committed; machine-specific raw logs are not published as application assets.

## Generated artifacts and unchanged inputs

`pair-snapshot-v2.manifest.json` covers 79 files / 3,050,154 payload bytes. Including the manifest there are 80 new artifacts / 3,062,262 bytes. Catalog: 161,128 bytes. Index: 7,472 bytes. The 77 partitions total 2,881,554 bytes: 17 supplier partitions with 60 rows each and 60 tender partitions with 17 rows each. Their 2,040 indexed references represent exactly 1,020 unique pairs, not duplicate scoring executions.

All source hashes, output byte counts and hashes match. Both directions agree on score, coverage, confidence, assessed-only fit, limitation and immutable identities. Retrieval projections intentionally differ for 35 pairs because supplier-first and tender-first candidate ordering are distinct. The benchmark's four code hashes match after its explicitly documented CRLF-to-LF normalization.

The 60-tender fixture, 17-company v1.3 profiles, 289 evidence records, historical verbose snapshot/manifest, canonical Agent registry and Formula presentation are unchanged. No live source was collected and no model or embedding provider was called.

## Browser evidence retained from completed work

The browser checks below ran against the retrieval worktree's production bundle, with normal browser zoom. They are a scoped regression record, not a claim that every legacy page was re-audited in this final round.

| Surface / viewport | Observed evidence |
| --- | --- |
| Static matrix, 1440×900 Standard | 80 displayed cells; 1,425px document/client widths, no horizontal page overflow. Network inventory showed catalog-v2, index-v2, evidence and eight tender partitions, not the old all-pairs runtime. |
| Static matrix, 1440×900 Wide | Same bounded cell count and no page overflow; Next tenders changed the requested window; score-descending supplier sort changed the first supplier from Beko to Kossan. |
| Static matrix, 390×844 mobile | 80 cells with internal matrix scrolling; 375px document/client widths, no horizontal page overflow; selectors and pagination remained reachable. |
| Local API supplier-first review, 1440×900 Standard | 25-row response; Next loaded rows 26–50 of 60 using a focused request and opaque cursor; one selected-detail table. No full-universe runtime payload. |
| Local API review, 390×844 mobile | 25 rows, 375px document/client widths; keyboard Review opened the selected explicit pair. |
| Selected explanation | Formula v1.1 contribution display reconciled to 21, 12, Missing, 8, Missing, preserving the stored weighted numerators. Retrieval relevance displays RRF independently; absent ranking says Not ranked. |
| Assessment boundary | Keyboard request returned Disabled, no configured provider, no model call and no Formula or human-disposition mutation. |
| Explicit Case persistence | Hold → Save → route reload → Load restored the same Case, On hold and score 41; current detail freshness was recomputed. Case: `case:TM-PILOT:uz-inson-rfb-2-2-7-8:supplier-neon-642f4b66-fe6c-597d-a6ac-1746b1527cf6`. |
| Window exports | CSV and XLSX downloads contained 80 requested rows; all exported scores/coverage/confidence reconciled to the golden records. XLSX sheet: Requested matrix window, eight columns. |
| Console | No browser errors during the checked interactions. |

Browser download-event waiting timed out, so download success was not inferred from that event. The actual files in local Downloads were inspected: `tendermatch-requested-window.csv` (15,094 bytes) and `tendermatch-requested-window.xlsx` (9,047 bytes); the workbook was decoded and compared. Screenshots were visually inspected during those checks, but this checkpoint deliberately retains a compact evidence record rather than a large screenshot collection.

Final refresh smoke: `http://127.0.0.1:4175/tendermatch?view=matrix` served `index-B47XFTdH.js`, showed 80 cells at 1280×720, had equal 1,265px document/client widths and no browser errors. This confirms the reviewed local bundle identity; it does not promote it to production.

## Preview and release boundaries

- Static pinned retrieval preview: `http://127.0.0.1:4175/tendermatch?view=matrix` (Vite preview in the retrieval worktree).
- Local pinned API preview: `http://127.0.0.1:4185/tendermatch?view=match-suppliers` (`serve-tendermatch-local.mjs --snapshot`; no Neon connection).
- Preserved Formula preview: `http://127.0.0.1:4174/tendermatch?view=formula`, still served from the clean `e852` Formula checkpoint.

Final whitespace and intended-path checks passed. The credential/private-key scan covered all 116 intended files: its only matches were three pre-existing `user:redacted` connection-validation fixtures on `.example` hosts in a test file, verified identical to the base. No real credentials, private keys, environment files, Firebase/deployment configuration, lockfiles or registry changes were introduced. Formula-page CSS and protected input files match the base. Both the original `8964` worktree and Formula `e852` worktree remained clean at their stated commits.

No push, merge, deployment, publication, live database migration/write, external assessment, outreach, secret/billing change or canonical Agent change is authorized or performed by this checkpoint. The next decision is review of this local retrieval baseline and a separately scoped authenticated/durable-runtime rollout, not automatic activation.

# TenderMatch strict-parity browser QA

Evidence base: local checkpoint `b72dda2b03792f814ee3612320353febbcd9b451`, followed by the bounded desktop-objective CSS correction recorded with this summary. Production preview: `http://127.0.0.1:4174/tendermatch`. No deployed surface was tested or changed.

## Responsive view matrix

| Configuration | Viewport | Layout preference | Views exercised | Page-level overflow |
| --- | ---: | --- | ---: | ---: |
| Desktop Standard | 1440 × 900 | Standard | 12/12 | 0 |
| Desktop Wide | 1440 × 900 | Wide | 12/12 | 0 |
| Tablet | 1024 × 900 | Standard | 12/12 | 0 |
| Mobile | 390 × 844 | Standard | 12/12 | 0 |

The 48-state matrix covered Overview, both Radar views, Supplier Profiles, Verification, Tenders, all three Match views, Case Audit, Legacy Campaigns, and Legacy Follow-ups. Each state recorded its active navigation label, view-region label, focus state, viewport, layout, and overflow result in `matrix.json`.

Focus moved to the changed view region for 47/48 matrix transitions. The sole `false` entry was the already-active initial Overview load, where no view transition occurred and the page correctly did not steal initial focus. A later explicit Campaign navigation check focused the view region successfully.

## Restored-control evidence

- Campaign Workspace disclosure: `aria-expanded=false` removed the controlled body; re-expansion restored it.
- Objective recommendation: choosing a non-recommended objective exposed `Use recommendation`; using it restored the recommended objective and rationale.
- Channel and cadence: the recommended draft channel remained visible; cadence rendered explicit day, channel, and action values.
- Persistence: `Save changes` produced explicit local-save plus autosave feedback; the record remained `NOT_SENT`.
- Follow-ups: reset moved a local response to `follow-up-simulation`, created a versioned reset event, and displayed Next Action plus next-follow-up date. `Simulate response` then created an `interested-simulation`; the record remained `NOT_SENT`.
- Desktop polish: after removing the stray global CSS rule, the Campaign Objective, AI Recommendation, and Real Activation Gate rendered in three columns at 1440 × 900 (`373.837px 299.075px 299.087px`). At 820 × 900, the retained ≤860px rule produced one `697.6px` column. Neither state had page-level overflow.

## Route, history, focus, and console

- Direct loads passed for `/tendermatch`, `/tenderboost`, and `/tenderboost-ai`; each rendered title `Tender Apps — TenderMatch · Agent 03` with TenderMatch active.
- Browser history passed: Back moved `/tenderboost-ai` to `/tenderboost`; Forward returned to `/tenderboost-ai`.
- The final review returned to canonical `/tendermatch`, Standard layout, with Legacy Campaigns active and the Campaign Workspace expanded.
- Console error log: 0 errors during the matrix, restored-control exercise, alias-route checks, history check, and final desktop polish check.

## Retained local artifacts

The compact evidence record is this file. Non-committed visual artifacts remain outside the repository at:

`C:\Users\Cowork 2\.codex\visualizations\2026\08\29\01a04ec0-0c07-7170-aa35-8553b6848f92\tendermatch-parity-b72dda2`

That folder contains the 48 matrix captures, three restored-control/final-review captures, the matrix JSON, and one successor desktop-objective capture. The screenshots are supporting appearance evidence; interaction claims above come from the corresponding browser state checks.

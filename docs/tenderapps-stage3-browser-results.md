# Stage 3 browser validation — 14 September 2026

Historical first browser pass. Mobile acceptance was subsequently retested in `tenderapps-stage3-mobile-retest.md`; actual Excel receipt and spreadsheet upload were inspected in `tenderapps-stage3-checkpoint.md`. Remaining limitations below describe this original pass only.

User explicitly approved registering and starting Tender Logistics for synthetic browser testing. Controller assigned permanent app identity tender-logistics, port 6208, URL http://127.0.0.1:6208/. Source C:/CodexWork/tenderapps-boundaries-stage1/apps/tender-logistics; base HEAD 8f1c0556e72aa41ad3542cee6e25fae2418fc0c6 plus local uncommitted extraction/repairs. This is a development preview, not production.

Controller verified an owned loopback listener and matching source. Existing TenderApps definition still matches the recorded baseline; it was not repointed, stopped or restarted. No cloud deployment, database changes or real-record migration.

## Browser results

| Check | Result |
|---|---|
| Overview and illustration | Rendered |
| Methodology fixture | Rendered approximate USD 29,000 estimate, with explicit demo/benchmark warnings |
| Excel export | UI confirmed downloaded STAGE3-SYNTHETIC-Logistics-Browser-Test-calculation.xlsx; automation download-event capture timed out, so file receipt was not independently inspected in this browser run |
| New manual calculation | Completed all six steps with synthetic cargo, 100000 USD, Guangzhou to Tashkent, EXW to CIP, road, 20 cubic metres and 3000 kg |
| Approval boundary | Confirm-and-save disabled while special-cargo status unknown; preliminary save available |
| Save/reload | Saved STAGE3 SYNTHETIC Save Reload; page reload retained Saved cases 1 |
| Reopen | Retained preliminary status, input amount 100000, adjustment 14852.18, total 114852.18; canonical result dashboard reopened |
| Deep links | Both /landed-cost and /logistics-costing rendered the app and retained case count |
| Console | No captured error/warning logs during tested workflow |
| Desktop 1440x900 | Reopened result dashboard rendered |
| Mobile 390x844 | Main result rendered, but header controls/case tabs clipped or require horizontal scrolling; responsive acceptance remains OPEN |

Temporary viewport override was reset. The preview is left running for review. One clearly named synthetic case remains in this preview browser's local storage; it is not a production case. No existing user case was removed. The synthetic Excel export may remain in the browser download destination.

## Remaining limits

This was not a full accessibility or network trace audit, and no document-upload/PDF parsing replay was performed through the browser. Unit regressions provide separate evidence for extraction and Excel content. Mobile layout finding must be assessed/fixed and retested before responsive acceptance. Production origin transfer, off-device backup, frozen-pnpm installation and deployment cutover remain separate gates.

No further product extraction or production cutover is authorized by these results. Stage 3 has functional browser evidence but is not an unconditional release pass.

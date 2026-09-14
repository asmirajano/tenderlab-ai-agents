# TenderBalance standalone development app

Isolated application in the existing monorepo, not a separate repository or production deployment. Existing TenderApps source/routes remain intact.

- Controller identity: `tender-balance`, permanent URL http://127.0.0.1:6209/.
- Use `codex-localhost.cmd start tender-balance`, `stop tender-balance`, or `restart tender-balance`. Do not launch Vite directly or choose another port.
- Build: `npm --prefix apps/tender-balance run build`.
- Focused typecheck: `npm --prefix apps/tender-balance run typecheck`. Fourteen inherited domain diagnostics remain deferred; see the stage report.
- Routes: `/`, `/balance-sheet-review`, `/tenderbalance`, retaining existing query-based case navigation.
- Owned domain: `packages/tender-balance/src`; includes FIN-1/FIN-2, OCR, schemas/types and bundled historical FX JSON. Design tokens remain shared.
- OCR worker/core/language assets are served locally at `/ocr` in development and copied to `dist/ocr` during build. No sibling app supplies them.
- Existing storage keys and synthetic-case isolation are unchanged. A new origin starts with separate browser storage; old-origin records have not been migrated.

The 19 UI/helper copies are interim parity snapshots, enforced by `tests/balance-extraction.test.mjs`. Do not independently change those copies without deliberately updating their ownership/parity contract.

See `../../docs/tenderapps-stage4-balance.md` for source identity, comparison with Logistics, validation and rollback. Canonical localhost registry owns the current expected HEAD; `balance-localhost.json` is initial-registration evidence.

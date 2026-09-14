# TenderMatch sealed production-data boundary

This operator workflow prepares a dedicated production result store. It does not
deploy a Function, switch frontend/API configuration, change developer credentials,
run matching/scoring, or alter Balance/Logistics.

## Approved identities

- Source: Neon project `dry-union-87553313`, development branch
  `br-polished-boat-b1qddx0m`, database `tendermatch_results_dev`.
- Destination: the same Neon project, production branch
  `br-wispy-bird-b1fj8mih`, dedicated database `tendermatch_results_prod`.
- Dataset binding: `26e1bab78a38d8d520d59563e702bc4540405213f39cbb7b40a49ecbb03a4080`.
- Production login: `tendermatch_results_reader_prod`; NOLOGIN grant role:
  `tendermatch_results_reader`.
- Future server-only variable: `TENDERMATCH_PRODUCTION_READ_URL`.
- Existing protected release checkpoint: commit
  `8ac562342afcaf62c13f73037b693f253a3edbe0`, gateway revision
  `tenderappsaccess-00004-yan`. No development fallback is permitted.

These are an approved target and procedure, not evidence of completion. The
timestamped report referenced by `promotion-latest.json` and independent read-canary result determine actual
status. Do not run creation again if any prior attempt exists.

## Checkpoint and exactness

The source exporter uses only read-only transactions. One exported repeatable-read
snapshot pins every table read. Full original rows, including generated fields,
are saved as PostgreSQL binary COPY streams, hashed with SHA-256, compressed and
AES-256-GCM encrypted. The encryption key is protected by Windows CurrentUser DPAPI
in a separate ACL-restricted production operator vault outside the repository.

Only the approved result graph and its required lineage are selected: 32 tables.
Foreign-key parent closure is checked. Other development versions are not copied.
The historical `tendermatch-development-stage1` tenant label is data provenance;
it is deliberately preserved, not used to choose the runtime environment.

PostgreSQL has three stored generated columns: two pair-count products and a
`tsvector` text-search document. Their exact source expressions are allowlisted.
The import supplies their unchanged operands and PostgreSQL restores the stored
expressions. It does not run any scoring, retrieval, shortlist or AI generation.
Every field, including these stored generated values, participates in independent
source/destination canonical SHA-256 comparisons. Any mismatch blocks promotion.

The encrypted source stream's binary hash is checked before creation and again
during import. Committed destination counts, column types/defaults/generated
expressions, primary/foreign/check constraints and indexes are read back. Separate
server-side SHA-256 digests of all typed row values in deterministic primary-key
order compare destination with the source. Binary-stream hashes and canonical-row
hashes are different digest formats and must not be confused in reports.

## Production security is intentionally not a development writer clone

Tenant row-level policies are preserved. Development generation/job triggers are
not executed or deployed: some generate signatures, validate newly created runs,
or write job events. After import, production statement triggers reject INSERT,
UPDATE, DELETE and TRUNCATE on the sealed tables. Future writes require a separate
architectural decision and approved promotion process.

The runtime receives CONNECT and one NOLOGIN membership granting only USAGE and
SELECT on the narrow pinned API views. It has no ownership, raw/base-table access,
write permission, role/database creation, replication or RLS bypass. Its connection
limit is three; default transactions are read-only with bounded statement timeouts.
Denial probes explicitly use read-write transactions to test ACLs rather than merely
relying on the changeable read-only default.

Runtime credentials are generated in memory and stored only in
`%LOCALAPPDATA%\TenderMatch\production-results\runtime-readonly-v1.dpapi`.
No credential value belongs in Git, App Roadmap, logs, frontend files, or reports.
The existing operator credential is used transiently; no production owner URI is
saved. No live server receives the new runtime credential during this stage.

## Failure and rollback

Operator regression lessons recorded during preparation:

- Reusing the TLS connection for consecutive COPY OUT streams stalled. Fresh
  read-only readers importing the same exported snapshot avoid that problem.
- PostgreSQL 18 exposes NOT NULL entries (`contype=n`) and writer constraint
  triggers (`contype=t`) in `pg_constraint`. Their catalog descriptions are not
  ordinary `ALTER TABLE ADD CONSTRAINT` statements. NOT NULL is preserved in
  column DDL; writer triggers are replaced by the production immutable boundary.
  The entire data schema is now exercised transactionally before a bulk copy,
  and a regression test prevents these catalog entries being replayed incorrectly.

An interrupted/failed attempt is not automatically retried against an existing DB.
Reconcile its checkpoint, transaction outcome and recorded state first. Failed
runtime validation disables only the newly created production login. Preserve the
copied database and encrypted checkpoint for investigation; do not delete either.

If later explicitly authorized to withdraw access, use the attested production
owner connection to disable `tendermatch_results_reader_prod`, revoke its reader
membership, and revoke its CONNECT on `tendermatch_results_prod`. Do not drop data,
roles, databases or unrelated grants. This document does not authorize executing
that rollback now.

The live application remains on the existing protected snapshot until data,
privilege, environment and subsequent authenticated backend canary gates pass.
Never recover by pointing production at the development endpoint.

## Cost and coordination

This adds a database on an existing production branch/compute, not a new Neon plan,
branch or compute endpoint. Storage, transfer and compute usage can increase.
Actual billed cost must come from provider billing/Services Control, not a guess.
Communicate the resource and truthful readiness/monitoring state to the existing
Services Control task after creation. Do not duplicate its billing-monitoring work.

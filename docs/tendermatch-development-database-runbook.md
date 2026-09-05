# TenderMatch development database preparation — not applied

Prepared from `cda9ab646fe768600af455a340f5cd4538c05ca8` on `codex/tendermatch-neon-all-to-all`. The enclosing commit is a preparation checkpoint, not permission to execute. No Neon connection, source mutation, role/credential/database creation, scoring run or deployment was performed. Canonical owner remains TL-A031. The public 17×60 app is unchanged.

## Exact target

| Item | Value |
| --- | --- |
| Organization / project | TenderLab / `tender-entity-registry` |
| Project ID | `dry-union-87553313` |
| Branch | `development` / `br-polished-boat-b1qddx0m` |
| Direct TLS host | `ep-dark-dew-b15ctyr1.c-5.eu-central-1.aws.neon.tech` |
| Source database / schema | `tender_entity_registry` / `registry` |
| Temporary owner | `neondb_owner`, environment only |
| New read schema | `tendermatch_all_supplier_api` |
| Proposed result database / schema | `tendermatch_results_dev` / `tendermatch_retrieval` |
| Membership | All 117 canonical rows with `entity_type_code='company'`; currently `under_review` |
| Preserved API | Existing `tendermatch_supplier_api` and its 17-profile views/login |

Project/branch/database/count come from the orchestrator's 6 September 2026 Console audit. Endpoint fingerprint also comes from local registry `scripts/inspect-v1-3-consumer-target.mjs` (pooler sibling). Before later execution, confirm the **direct** host in `db/tendermatch-dev/target.json` belongs to this development branch. The runner rejects pooler/other hosts to retain session-bound guards during DDL. PostgreSQL cannot independently prove Neon branch identity: exact URL + connected DB/role + explicit Console attestation + transactional SQL guards are combined. The attestation is operational evidence, not cryptographic proof.

## Source/schema inspection

Local source root, read only: `C:/Users/Cowork 2/OneDrive/Projects/4_My Projects/24_Neon`.

| Migration | SHA-256 | Evidence used |
| --- | --- | --- |
| `003_supplier_quality_v2.sql` | `344cc18282755aaf8e5a4124a7ebec5b0477dc088d2b583e00873d8fafd24aa2` | Profile versions, claims, artifacts and private fields |
| `005_tendermatch_supplier_read_contract_v1.sql` | `ebaa2f0b312a55669bf7182e67d1eadc8686e33adbf8ccf88e66241c4feb308f` | Legacy v2.1 pin |
| `007_goods_works_staging_contract_v1.sql` | `8db4c4a6bcfdb375f932f3b4853e17610c574cb1255b00b550903029dd84be87` | Source assertion status, external claim ID |
| `009_tendermatch_goods_works_v1_3_consumer_release.sql` | `7488903a7af1f084cb62d5f871875f2b36603317acbbbaa0fb4c6cbf7b8a3396` | Canonical 17 activation, v1.3 fields and existing API |

Also inspected 002/004/008 lineage, previous census, and `packages/tendermatch/src/exploratory-matching.ts`. Do **not** rerun original registry migrations: 009 contains data activation and alias replacement and is not a setup input.

The existing local `quality_audit/v2_accio/corrected_claims_v2_1.json` was inspected for field names/counts only (24 fields × 100 claims). This confirmed that claim vocabulary differs from profile-table column names. The new allowlist uses the actual claim keys, not guessed profile-column aliases. No real claim values are copied into tests or this repository.

## Full-company read contract

Version `tendermatch-all-company-read/1.0.0`. Authorized apply captures all 117 company IDs into an owner-only membership table. No country, readiness, classification or UI-page filter reduces membership. The manifest compares pinned IDs with canonical IDs, detecting count drift and same-count replacements; validation emits sorted-ID SHA-256 and traverses every page once. Later population changes require a reviewed version, not a silent fallback.

Only these exact profile pins are allowed:

| Batch | Version |
| --- | --- |
| `accio-neutral-suppliers-2026-09-01-v2.1-policy-corrected` | `v2.1-policy-corrected-2026-09-01` |
| `accio-goods-works-suppliers-2026-09-01-v1.3-critical-evidence-corrected-db-staged` | `v1.3-critical-evidence-corrected-2026-09-01` |

No latest-by-time, implicit supersession or fixture fallback. Zero allowed profiles → `MISSING`; multiple → `AMBIGUOUS`; one → `PINNED`. All retain company identity; only an unambiguous pin exposes its profile/evidence. Real missing/ambiguous/evidence counts are **not yet measured**; synthetic test distributions are not real-source findings.

Versioned `supplier_profiles_v1`, `supplier_evidence_v1` and `contract_manifest_v1`, plus stable `current_supplier_profiles`/`current_supplier_evidence`, exist only in the new schema. These views pin identity/policy, not immutable source bytes: hash complete permitted inputs/evidence into each result run. Use repeatable-read for manifest + pagination. Underlying corrected values must invalidate their affected cached pairs.

### Column contract

| View/group | Columns (nullable marked ?) |
| --- | --- |
| Profiles/identity | `contract_version text`, `canonical_entity_id uuid`, `legal_name text`, `display_name text`, `country_code` (source character code), `entity_type_code text`, `verification_status text` |
| Profiles/version | `profile_version_id uuid?`, `profile_version text?`, `batch_id uuid?`, `batch_code text?`, `profile_candidate_count integer`, `profile_state text` |
| Profiles/authority | `readiness_status text?`, `readiness_contract_version text?`, `classification text?`, `classification_value_class text`, `classification_claim_ids uuid[]`, `classification_limitation text?`, `evidence_count integer` |
| Evidence/identity | `contract_version text`, `canonical_entity_id uuid`, `profile_version_id uuid`, `profile_version text`, `batch_id uuid`, `batch_code text`, `claim_id uuid`, `external_claim_id text?` |
| Evidence/meaning | `source_field text`, `field text`, `display_value text?`, `status text`, `value_class text`, `formula_role text` |
| Evidence/source | `source_record_id uuid`, `source_system text`, `retrieved_at timestamptz?` |
| Evidence/artifact | `source_artifact_id uuid?`, `artifact_available boolean`, `artifact_status text`, `artifact_sha256 text?`, `artifact_limitation text?` |
| Manifest | `contract_version text`, `expected_company_count integer`, `source_company_count integer`, `profile_count integer`, `evidence_count integer`, `pinned_id_checksum text`, `source_id_checksum text` |

No contacts, email/phone/messaging fields, street addresses, named contacts, notes, arbitrary nested JSON, raw pages/payloads/artifacts, local paths or credentials. URLs/titles are omitted to avoid credential-bearing URLs or unsafe text; exact source/artifact IDs and hashes retain traceability. `display_value` is allowlisted claim text, not raw page content. Field allowlisting is not universal free-text DLP: future intake must prevent private content in allowed business fields. This is a **server-side development consumer**, not a public export.

### Formula mapping

| Source field | Use |
| --- | --- |
| `classification` | Unique usable explicit Goods/Works claim; missing/conflicting → NULL, no name-based inference |
| `product_families`, `works_specializations`, `industries_served`, `materials` | Same technical Formula operands |
| `capacity` | Existing supplier capacity claim; no invented tender threshold |
| `geographic_markets` | Existing market-reach operand |
| Legacy `operating_geography` | Explicit mapping to `geographic_markets`; source field and claim ID retained |
| `financial`, `certifications`; legacy `main_activity`, `identity_company_type`, `manufacturing_capabilities_capacity`, `products_portfolio`, `product_categories`, `materials_specs`, `export_markets`, `installation_after_sales`, `local_presence`, `moq_lead_time_incoterms`, `project_references`, `turnover_scale`, `compliance_risks` | Supporting only, exact original field names. Mixed capacity/capability or scale/turnover claims are not silently relabelled as comparable Formula operands or clearance |

Status is `COALESCE(source_assertion_status,claim_status,'UNKNOWN')`. `SOURCE` denotes the reported claim text, not verified truth; inferred/unverified status stays independent. Empty/UNKNOWN/N/A or unknown-status values remain `MISSING`. Calculations belong to separate result artifacts. Artifact availability requires exact ID + batch + company linkage, not URL/date fallback. Evidence ordering is `(field,claim_id)` as in the existing consumer convention.

Older v2.1 data is not forced into the v1.3 frontend API. The later adapter must preserve missing/ambiguous profiles and classify eligibility before Formula 1.1, using `classifyAllToAllPair`. Full population ≠ full eligibility. No new classifier, scoring change or current frontend switch is part of preparation.

## Result schema and roles

The unchanged `db/migrations/20260905_tendermatch_retrieval.sql` supplies 14 tables: immutable reusable features/scores, runs/membership, batch leases/checkpoints, model-version-partitioned vector(384)/cosine HNSW, lexical/taxonomy indexes, retrieval shortlists, selective TORS jobs/artifacts, human disposition history. No model/provider is enabled by setup.

`030-result-up.sql` adds three tables:

- `universe_snapshot`: run-bound source versions/times/counts and ID SHA-256s;
- `universe_pair`: every considered pair, eligibility/reasons, `SCORED`/`NOT_SCORED`; non-scored score/cache values must be NULL;
- `criterion_audit`: five components, weights/Fit/points, operands and evidence IDs. Missing Fit/points remain NULL; a genuine scored zero stays zero. Deferred checks reconcile five weights totaling 100 with the immutable score and reject extra criteria.

Retrieval relevance, Formula points, evidence confidence, TORS artifacts and human disposition remain separate. The existing adapter is not automatically switched to this contract. Later run-completion validation must reconcile all memberships, metrics and source identities before COMPLETE. No universal model calls or real all-to-all run occur here.

| Role | Grants |
| --- | --- |
| `tendermatch_all_supplier_reader` | NOLOGIN, no ownership; new API USAGE and SELECT exactly five exposed views |
| `tendermatch_all_supplier_consumer_dev` | LOGIN; only reader membership, source CONNECT, connection limit 3 |
| `tendermatch_result_writer` | NOLOGIN, no ownership; result USAGE, SELECT 17 current tables; explicit INSERT list; UPDATE run status/batch/assessment state only |
| `tendermatch_result_writer_dev` | LOGIN; only writer membership, result CONNECT, connection limit 3 |

All: NOSUPERUSER/NOCREATEDB/NOCREATEROLE/NOREPLICATION/NOBYPASSRLS. Writer cannot DELETE, edit scores, run DDL, register models or write migration records. PUBLIC revokes affect only new objects/new result database. No existing source/other-DB ACL is changed. Role/schema collisions fail closed. RLS relies on a trusted service-set tenant; this is **not authentication** and the writer must never be given to a browser/end user.

## Exact future execution order — requires separate approval

1. In Neon Console select TenderLab → `tender-entity-registry` → `development` (`br-polished-boat-b1qddx0m`) → `tender_entity_registry` → `neondb_owner`. Confirm direct host, 117 company rows, 17 existing consumer profiles, expected schema, unused new role/schema/DB names. Verify effective PUBLIC access before provisioning; stop if unrelated users would need ACL changes.
2. Work in `C:/CodexWork/tendermatch-neon-all-to-all`. The safe disconnected command is `node scripts/tendermatch-dev-setup.mjs plan`.
3. Securely inject temporary `TENDERMATCH_SOURCE_OWNER_URL` into the session environment, never as a command-line value, logged text, file or chat message. Require `sslmode=verify-full` and `channel_binding=require`. After Console verification set these nonsecret attestations:

```powershell
$env:TENDERMATCH_APPROVED_PROJECT_ID='dry-union-87553313'
$env:TENDERMATCH_APPROVED_BRANCH_ID='br-polished-boat-b1qddx0m'
$env:TENDERMATCH_APPROVED_ENDPOINT='ep-dark-dew-b15ctyr1.c-5.eu-central-1.aws.neon.tech'
```

4. Source order: BEGIN → transaction-local branch setting → `001-source-guard.sql` → `010-source-up.sql` → full validation → COMMIT. Runner command:

```powershell
try {
  node scripts/tendermatch-dev-setup.mjs source-up --execute-approved
  if ($LASTEXITCODE -ne 0) { throw 'Setup failed; do not continue' }
} finally { Remove-Item Env:TENDERMATCH_SOURCE_OWNER_URL -ErrorAction SilentlyContinue }
```

5. Reinject source owner temporarily; execute **`result-create`** using the same try/finally pattern. It checks source identity/database absence, then runs `020-create-result-database.sql` **outside a transaction**, followed by an origin comment. This action is never bundled with source-up/result-up. If creation succeeds but comment fails, retain the empty DB and inspect; do not auto-adopt it. Explicit marker repair or empty-DB removal requires a bounded recovery decision.
6. In Console switch to **`tendermatch_results_dev` on the same branch**, role `neondb_owner`. Inject `TENDERMATCH_RESULTS_OWNER_URL` with that DB path. Execute **`result-up`**, with finally removing this exact variable. Order: BEGIN → `021-result-guard.sql` → fresh schema/DB-origin checks → unchanged 20260905 migration body **without its outer BEGIN/COMMIT** → `030-result-up.sql` → COMMIT. Never run the old migration alone on the source database. PostgreSQL ≥16 and pgvector ≥0.8 required; actual Neon extension availability remains a future preflight (Console reported PostgreSQL 18.6).
7. Reinject source owner for **`provision-source`**, result owner for **`provision-results`**, each with `--execute-approved` and shell finally cleanup. They generate 256-bit passwords in memory, create only the named new login, validate as that login, recheck role ownership/membership as owner, and exclusively write the ignored env file below. Existing roles/files are not adopted/rotated. No owner credential is saved.

| Exact relative secret output | Sole variable |
| --- | --- |
| `.env.tendermatch-all-suppliers-dev` | `TENDERMATCH_ALL_SUPPLIER_DATABASE_URL` |
| `.env.tendermatch-results-dev` | `TENDERMATCH_RESULT_DATABASE_URL` |

Both paths are inside this worktree and match `.gitignore`. Files use exclusive create/mode 0600 and, on Windows, disabled inheritance/current-user ACL before writing. No secret file is created during preparation. If validation/write fails after login creation, the new login is disabled and password cleared; a partial/empty file is retained for explicit private inspection, never overwritten automatically. JavaScript cannot guarantee memory zeroization. Parent environment cleanup is required because the child cannot erase it. Administrator-side PostgreSQL statement logging is outside the runner; review that policy before password provisioning.

8. Inject consumer/writer variables privately from their files; execute **`validate-source`** and **`validate-results`**, each with `--execute-approved` and target attestations. These checks include forbidden-operation probes and a rolled-back synthetic writer transaction, so are also later authorized actions—not run against Neon now. Reports include nonsecret counts/hashes/roles/verdicts only. No scoring command belongs in this setup sequence.

### Console verification queries (later)

In source database:

```sql
SELECT current_database(),current_user;
SELECT entity_type_code,verification_status,count(*) FROM registry.entities
 GROUP BY entity_type_code,verification_status;
SELECT * FROM tendermatch_all_supplier_api.contract_manifest_v1;
SELECT profile_state,classification,count(*) FROM tendermatch_all_supplier_api.current_supplier_profiles
 GROUP BY profile_state,classification;
SELECT status,artifact_available,count(*) FROM tendermatch_all_supplier_api.current_supplier_evidence
 GROUP BY status,artifact_available;
SELECT count(*) FROM tendermatch_supplier_api.current_supplier_profiles; -- still 17
```

In result database:

```sql
SELECT current_database(),current_user;
SELECT * FROM tendermatch_retrieval.schema_migration ORDER BY version;
SELECT extversion FROM pg_extension WHERE extname='vector';
SELECT tablename FROM pg_tables WHERE schemaname='tendermatch_retrieval' ORDER BY tablename;
SELECT count(*) FROM tendermatch_retrieval.evaluation_run; -- zero after setup/probe rollback
```

Automatic validation covers count/ID/pin continuity, stable aliases, unique claim/source/artifact linkage, read privilege, source/private/helper denials, API write denial, CREATE ROLE/DATABASE denials, sole membership/no ownership, writer DDL/delete/score-edit/model-registration denials and RLS. The new evidence count is derived, not assumed to equal the old 289.

## Rollback/recovery

- **`source-down`**: temporary source owner, same guard/approval. Revoke/drop only the new LOGIN, then `019-source-down.sql` removes aliases → profiles/evidence/helper → membership IDs → new schema → reader role. Canonical companies and the 17-profile API remain unchanged.
- **`result-down`**: temporary result owner, same guard/approval. Refuses if any business/model table has data. Empty store: revoke/drop new LOGIN, then `039-result-down.sql` drops only prepared tables/functions/schema/role in dependency order. Empty DB and vector extension remain. No CASCADE or automatic DROP DATABASE. Data-bearing rollback requires an export/retention decision.
- Schema changes are transactional; DB creation and credential publication are separate checkpoints, not globally atomic. Unknown objects, count drift, new dependencies or PUBLIC grants stop the runner. Do not repair with CASCADE, DROP OWNED, blanket PUBLIC revokes or production credentials.
- Revoked env files remain locally; remove only the two exact files after confirmed credential revocation. Clear temporary owner material in the parent shell even on failure.

## Evidence strength and next gate

Tests run actual SQL bodies in disposable PGlite/pgvector with a schema-compatible **synthetic** 117-company fixture. They include missing/ambiguous/future pins, private canaries, wrong artifact linkage, real role denials, RLS, NULL/zero, fixed-denominator audit and rollback. Shipped target guards correctly reject the transient `postgres` database; body tests do not weaken those guards. This does not prove actual Neon owner privileges/extension availability, real evidence completeness, multi-session performance, authenticated tenants or production isolation.

Next decision: approve **development setup only**, then fresh owner/consumer validation. Full-list adapter, actual all-to-all scoring, embeddings/TORS, frontend integration and deployment remain separate gates.

## Failure/correction ledger

| What happened | Root cause | Correction | Reusable rule | Regression |
| --- | --- | --- | --- | --- |
| 17 consumer profiles mistaken for 117 source companies | Population and version-specific projection conflated | Add independent all-company contract, preserve old API | Reconcile canonical and consumer membership first | 117 traversal, same-count ID drift, 17-fallback rejection |
| Older profiles lacked explicit modern classification | Profile existence conflated with eligibility | Retain missing/ambiguous identity and supporting claims | Full population is not full eligibility | Missing/ambiguous/future-pin SQL cases |
| Unassessed pairs could look like evaluated zero | Universe and scored-result storage conflated | Separate nullable NOT_SCORED ledger | Record consideration without fabricated scores | NULL/zero and five-criterion SQL cases |
| Source/setup/runtime authority could blur | Different transaction and credential boundaries hidden | Separate guarded steps, cleanup and rollback | Preparing, applying and scoring are different gates | Disconnected default, target guards, role probes, rollback |
| Legacy claim keys differed from profile-column names | Table schema alone was insufficient evidence of claim vocabulary | Inspect existing v2.1 claim-key inventory; expose exact safe keys as supporting-only | Verify semantic field names before mapping them | SQL fixtures retain five representative legacy keys without awarding points |

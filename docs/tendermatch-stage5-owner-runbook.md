# Stage 5 owner-only 080 handoff

Status: the orchestrator applied and committed the reviewed 080 DDL in the verified
target (25 statements including COMMIT). The Stage 5 writer did not execute DDL.
This runbook preserves the exact historical action and verification contract; do
not apply the migration again. Any new owner action requires fresh authorization.

| Target | Required identity |
| --- | --- |
| Project | `dry-union-87553313` |
| Branch | development `br-polished-boat-b1qddx0m` |
| Endpoint | `ep-dark-dew-b15ctyr1.c-5.eu-central-1.aws.neon.tech` |
| Database | `tendermatch_results_dev` |
| Owner | `neondb_owner` |
| Schema | `tendermatch_retrieval` |
| Migration file | `C:/CodexWork/tendermatch-neon-all-to-all/db/tendermatch-dev/080-ranking-up.sql` |

The branch identity must be confirmed in the authenticated Console; setting a
custom SQL variable alone does not prove which Neon branch the editor targets.
Do not reuse an old owner connection or substitute a source database.

Reviewed SQL canonical-LF SHA-256:
`fb6c91401508b348a8cb6715d71087e2f58b99aca6f76a3c6eaefb1bbe0b318b`.
Both complete real-data read-only passes and the synthetic persistence/index
benchmark bind the corresponding Stage 5 implementation. Full tests passed
556/556 with no skips at the owner gate. That checkpoint was staged and uncommitted.
The authorized writer continuation completed: 17,450 profiles, 707,660 ranked
pairs and one sealed completion. Full readback/cache replay and the independent
read-only audit passed. The final evidence report records the metrics and local
Git checkpoint. The historical empty-table expectations below apply only to the
pre-writer owner verification, not to the now-populated environment.

## Read-only preflight in that exact Console

```sql
SELECT current_database(), current_user,
  (SELECT shobj_description(oid,'pg_database')
   FROM pg_database WHERE datname=current_database()) AS database_identity;
SELECT version FROM tendermatch_retrieval.schema_migration ORDER BY version;
SELECT run_id,outcome_hash,scored_count,unscored_count
FROM tendermatch_retrieval.formula_completion;
SELECT name,default_version,installed_version
FROM pg_available_extensions WHERE name='vector';
SELECT amname FROM pg_am WHERE amname IN ('hnsw','ivfflat') ORDER BY amname;
SELECT to_regclass('tendermatch_retrieval.ranking_run') AS must_be_null_before_080;
```

Required Stage 4 completion: run
`8c60354ecfd613fab2edca21528fab8c22aeb275df7115590a5916847c78efc5`,
outcome hash `b7a12c75afc68f241ce740eaf557ada12abb79159406c1ebf6471e69ed6e5df6`,
707,660 scored and 1,320,301 unscored. Six prior migrations are expected, including
`20260906-formula-stage4-v1`; the exact ordered set is enforced in the file.

## Approved additive action

Execute the complete reviewed `080-ranking-up.sql` text between these statements:

```sql
BEGIN;
SET LOCAL tendermatch.approved_branch_id = 'br-polished-boat-b1qddx0m';
-- Entire reviewed 080-ranking-up.sql, unchanged.
COMMIT;
```

Do not execute migration 070 again. Do not create an extension, embedding model,
vector index or any credential/role/database. The installed vector extension is
unused by this fallback. Do not run the rollback file during this handoff.

## Verify owner action before authorizing writer continuation

```sql
SELECT version FROM tendermatch_retrieval.schema_migration
WHERE version='20260906-ranking-stage5-v1';
SELECT c.relname,c.relrowsecurity,pg_get_userbyid(c.relowner) AS owner
FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
WHERE n.nspname='tendermatch_retrieval' AND c.relname IN
 ('ranking_profile','ranking_run','ranking_member','ranking_pair','ranking_completion')
ORDER BY c.relname;
SELECT table_name,grantee,privilege_type FROM information_schema.table_privileges
WHERE table_schema='tendermatch_retrieval' AND table_name IN
 ('ranking_profile','ranking_run','ranking_member','ranking_pair','ranking_completion')
 AND grantee='tendermatch_result_writer' ORDER BY table_name,privilege_type;
SELECT indexname,indexdef FROM pg_indexes
WHERE schemaname='tendermatch_retrieval' AND tablename='ranking_pair' ORDER BY indexname;
SELECT 'profiles' kind,count(*) FROM tendermatch_retrieval.ranking_profile
UNION ALL SELECT 'runs',count(*) FROM tendermatch_retrieval.ranking_run
UNION ALL SELECT 'members',count(*) FROM tendermatch_retrieval.ranking_member
UNION ALL SELECT 'pairs',count(*) FROM tendermatch_retrieval.ranking_pair
UNION ALL SELECT 'completions',count(*) FROM tendermatch_retrieval.ranking_completion;
SELECT run_id,outcome_hash,scored_count,unscored_count
FROM tendermatch_retrieval.formula_completion;
```

Expected: new migration, five owner-owned/RLS-enabled empty tables, only SELECT
and INSERT for the writer, two focused ordering indexes plus the primary key,
and the identical Stage 4 completion. Record the actual identity/transaction result.

After successful owner verification and explicit orchestrator continuation,
the guarded results writer may run:

```powershell
$env:TENDERMATCH_APPROVED_PROJECT_ID='dry-union-87553313'
$env:TENDERMATCH_APPROVED_BRANCH_ID='br-polished-boat-b1qddx0m'
$env:TENDERMATCH_APPROVED_ENDPOINT='ep-dark-dew-b15ctyr1.c-5.eu-central-1.aws.neon.tech'
node --experimental-strip-types scripts/tendermatch-stage5.mjs execute --execute-approved
```

This command prepares profiles/run membership, persists the candidate ranking,
independently recalculates/readbacks every ranked pair, seals completion, verifies
unchanged cache reuse, negative privileges, focused queries and size evidence.
It does not execute DDL. A missing migration fails closed. A read-only `replay`
mode is also available; `inspect` is a read-only real-data experiment.

Owner-only rollback is in `080-ranking-down.sql`. It removes only Stage 5 history
and requires separate explicit destructive authorization. It is not a cache-refresh
mechanism and must never be used to alter or rebuild Stage 4.

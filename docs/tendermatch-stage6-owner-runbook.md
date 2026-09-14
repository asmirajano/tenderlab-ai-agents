# Stage 6 owner-only 090 handoff

Status: the orchestrator confirmed the unchanged migration was committed in the
verified development target; all 27 statements completed, including COMMIT.
The worker's subsequent read-only check found all five empty tables owned by
`neondb_owner`, RLS enabled and SELECT/INSERT-only writer grants. The migration
must not be rerun. Writer credentials never execute owner DDL. The action-time
procedure below is retained as an audit record, not permission to deploy or run
the destructive rollback.

| Target | Required identity |
| --- | --- |
| Project | `dry-union-87553313` |
| Branch | development `br-polished-boat-b1qddx0m` |
| Direct endpoint | `ep-dark-dew-b15ctyr1.c-5.eu-central-1.aws.neon.tech` |
| Database | `tendermatch_results_dev` |
| Owner | `neondb_owner` |
| Schema | `tendermatch_retrieval` |
| Exact SQL | `C:/CodexWork/tendermatch-neon-all-to-all/db/tendermatch-dev/090-shortlist-up.sql` |

Canonical-LF SHA-256 of the reviewed SQL:
`367a7131db5175d861d7410342bcf3878d5fb84dd7fbb7160181e71e39e2649c`.
The exact SQL has 24 top-level statements; BEGIN/SET/COMMIT makes 27. Full tests
passed 569/569 with no skips; builds, lint, strict module TypeScript and the local
SQL persistence/security benchmark passed at the owner gate. That checkpoint
preceded actual Neon persistence and the independent final audit recorded in
`docs/evidence/tendermatch-stage6-shortlist.md`.

The authenticated Console project/branch/database/role must be visually reconfirmed
at action time. A custom branch GUC alone does not attest the actual Console target.
Do not reuse a stale owner session or substitute any source database.

## Read-only action-time preflight

```sql
SELECT current_database(),current_user,
 (SELECT shobj_description(oid,'pg_database')
  FROM pg_database WHERE datname=current_database()) AS database_identity;
SELECT version FROM tendermatch_retrieval.schema_migration ORDER BY version;
SELECT run_id,outcome_hash,scored_count,unscored_count
FROM tendermatch_retrieval.formula_completion;
SELECT run_id,outcome_hash,pair_count,zero_count
FROM tendermatch_retrieval.ranking_completion;
SELECT to_regclass('tendermatch_retrieval.shortlist_run') AS must_be_null_before_090;
```

Required Stage 5 run:
`b0ba6e965bc81ef5f3d53466d815c1c7c4c4596bd21b16ff9342b4098b484c7d`;
outcome `1a7cc57af3cf1d06824700cfc4c367658b9abc67519d372a8e77fc1f4c123b47`;
707,660 pairs, 683,653 retrieval zeros.
Required Stage 4 run:
`8c60354ecfd613fab2edca21528fab8c22aeb275df7115590a5916847c78efc5`;
outcome `b7a12c75afc68f241ce740eaf557ada12abb79159406c1ebf6471e69ed6e5df6`;
707,660 scored, 1,320,301 unscored. The exact seven prior migration markers are
checked in the SQL. Database comment must identify this development result store
and branch exactly as checked in the file.

## Exact separately approved additive action

After action-time approval, execute the entire unchanged 090 SQL between:

```sql
BEGIN;
SET LOCAL tendermatch.approved_branch_id = 'br-polished-boat-b1qddx0m';
-- Entire reviewed 090-shortlist-up.sql, unchanged.
COMMIT;
```

Do not rerun 070/080, alter any prior data/table, enable extensions, create vectors,
models, roles or databases. The migration adds five Stage 6 tables, focused indexes,
SQL input/nomination validation, RLS/immutability and least-privilege grants.

## Verify before writer continuation

```sql
SELECT version FROM tendermatch_retrieval.schema_migration
WHERE version='20260907-shortlist-stage6-v1';
SELECT c.relname,c.relrowsecurity,pg_get_userbyid(c.relowner) AS owner
FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
WHERE n.nspname='tendermatch_retrieval' AND c.relname IN
 ('shortlist_context','shortlist_run','shortlist_member','shortlist_pair','shortlist_completion')
ORDER BY c.relname;
SELECT table_name,grantee,privilege_type FROM information_schema.table_privileges
WHERE table_schema='tendermatch_retrieval' AND grantee='tendermatch_result_writer'
 AND table_name IN ('shortlist_context','shortlist_run','shortlist_member','shortlist_pair','shortlist_completion')
ORDER BY table_name,privilege_type;
SELECT indexname,indexdef FROM pg_indexes
WHERE schemaname='tendermatch_retrieval' AND tablename='shortlist_pair' ORDER BY indexname;
SELECT 'contexts' kind,count(*) FROM tendermatch_retrieval.shortlist_context
UNION ALL SELECT 'runs',count(*) FROM tendermatch_retrieval.shortlist_run
UNION ALL SELECT 'members',count(*) FROM tendermatch_retrieval.shortlist_member
UNION ALL SELECT 'pairs',count(*) FROM tendermatch_retrieval.shortlist_pair
UNION ALL SELECT 'completions',count(*) FROM tendermatch_retrieval.shortlist_completion;
SELECT run_id,outcome_hash,pair_count,zero_count FROM tendermatch_retrieval.ranking_completion;
SELECT run_id,outcome_hash,scored_count,unscored_count FROM tendermatch_retrieval.formula_completion;
```

Expected immediately after owner action: five empty owner-owned RLS tables;
SELECT/INSERT-only writer grants; focused supplier/tender B-tree indexes plus
primary/uniqueness indexes; unchanged prior completions. Public function access
is revoked; writer EXECUTE is granted only on the two read-only focus helpers.
Record exact target and successful COMMIT, then authorize guarded writer continuation.

## Later guarded writer continuation

```powershell
$env:TENDERMATCH_APPROVED_PROJECT_ID='dry-union-87553313'
$env:TENDERMATCH_APPROVED_BRANCH_ID='br-polished-boat-b1qddx0m'
$env:TENDERMATCH_APPROVED_ENDPOINT='ep-dark-dew-b15ctyr1.c-5.eu-central-1.aws.neon.tech'
node --experimental-strip-types scripts/tendermatch-stage6.mjs execute --execute-approved
```

This prepares 17,450 contexts/members, one run, 28,034 selected pairs (18,531 review
candidates + 9,503 audit-only) and one completion; independently checks readback,
unchanged reuse, negative permissions, focused queries and sizes. It executes no
DDL and fails closed when 090 is absent. A separate read-only final audit follows
before the Stage 6 local commit and orchestrator review. No AI/TORS-ready state,
human decision, source write, frontend change or deployment is implied.

`090-shortlist-down.sql` removes Stage 6 history and requires separate explicit
destructive approval. It is not an incremental-refresh mechanism.

# Stage 7 owner-only 100 handoff

Status: owner-ready action gate. Final full suite 590/590, zero failures/skips,
20 focused tests, all three builds and 64 Agent Specifications, full lint and strict
Stage 7 TypeScript pass. No Stage 7 Neon DDL/DML has occurred. Writer credentials cannot and must not execute
this migration. The orchestrator must still reconfirm the action-time target and
owner approval before executing the unchanged SQL.

| Target | Required identity |
| --- | --- |
| Project | `dry-union-87553313` |
| Branch | development `br-polished-boat-b1qddx0m` |
| Direct endpoint | `ep-dark-dew-b15ctyr1.c-5.eu-central-1.aws.neon.tech` |
| Database | `tendermatch_results_dev` |
| Owner | `neondb_owner` |
| Schema | `tendermatch_retrieval` |
| Exact SQL | `C:/CodexWork/tendermatch-neon-all-to-all/db/tendermatch-dev/100-escalation-up.sql` |

Canonical-LF SHA-256 of the code-complete SQL:
`0a5bd329f7a562e98a35d2df7d632e45bd8544fcd32087b651a01db2a01a3757`.
Raw worktree-file SHA-256:
`6acc419c0da8f9ea9278eff485ccfafe0665ff32e446685f0a9eef758c3e0bb8`.
There are33 top-level statements; BEGIN/SET/COMMIT makes36. Any change invalidates
this handoff. The fixture executes every statement and tests actual PostgreSQL
trigger bodies, RLS and queue transitions locally. The final read-only gate found
`escalation_plan:null`, exact development DB/writer identity and zero legacy jobs/
artifacts. All configured remotes were fetched/pruned; origin/main and relevant
parallel worktrees remain unchanged. See `docs/evidence/tendermatch-stage7-escalation.md`.

Authenticated Console project/branch/database/role must be reconfirmed visually at
action time. A branch GUC alone is not target attestation. Do not reuse a stale
owner session or substitute a source database.

## Action-time read-only preflight

```sql
SELECT current_database(),current_user,
 (SELECT shobj_description(oid,'pg_database') FROM pg_database
 WHERE datname=current_database()) AS database_identity;
SELECT version FROM tendermatch_retrieval.schema_migration ORDER BY version;
SELECT run_id,outcome_hash,pair_count,review_count,audit_count
FROM tendermatch_retrieval.shortlist_completion;
SELECT run_id,outcome_hash,pair_count,zero_count
FROM tendermatch_retrieval.ranking_completion;
SELECT run_id,outcome_hash,scored_count,unscored_count
FROM tendermatch_retrieval.formula_completion;
SELECT to_regclass('tendermatch_retrieval.escalation_plan') AS must_be_null_before_100;
```

Required Stage 6 run `239ec961dd32138d4a224fb2925c0fdc47b7115298b355e1874b33aa5a388884`,
outcome `25811f4efab7676acd407d6145a58685b3c843bb27b5f3d78bc8c32b1b9fa137`,
28,034 pairs: 18,531 review and 9,503 audit. Stage 5 remains 707,660 ranked rows
including 683,653 zero retrieval; Stage 4 remains 707,660 scored/1,320,301 unscored.
The migration verifies the exact eight prior markers and exact development comment.

## Exact separately approved additive action

```sql
BEGIN;
SET LOCAL tendermatch.approved_branch_id = 'br-polished-boat-b1qddx0m';
-- Entire reviewed 100-escalation-up.sql, unchanged.
COMMIT;
```

It adds seven tables, focused/ready indexes, integrity/security functions and
triggers, RLS, immutable history and least-privilege grants. It does not create an
execution authorization, job, provider, role, database, extension, vector or model
call; it does not alter any prior row. Do not rerun prior migrations. All seven new
tables must be empty immediately after owner COMMIT.

## Verify before writer continuation

```sql
SELECT version FROM tendermatch_retrieval.schema_migration
WHERE version='20260907-escalation-stage7-v1';
SELECT c.relname,c.relrowsecurity,pg_get_userbyid(c.relowner) AS owner
FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
WHERE n.nspname='tendermatch_retrieval' AND c.relkind='r'
AND c.relname LIKE 'escalation_%' ORDER BY c.relname;
SELECT table_name,grantee,privilege_type FROM information_schema.table_privileges
WHERE table_schema='tendermatch_retrieval' AND grantee='tendermatch_result_writer'
AND table_name LIKE 'escalation_%' ORDER BY table_name,privilege_type;
SELECT table_name,column_name,privilege_type FROM information_schema.column_privileges
WHERE table_schema='tendermatch_retrieval' AND grantee='tendermatch_result_writer'
AND table_name='escalation_job' AND privilege_type='UPDATE' ORDER BY column_name;
SELECT 'plans' kind,count(*) FROM tendermatch_retrieval.escalation_plan
UNION ALL SELECT 'decisions',count(*) FROM tendermatch_retrieval.escalation_decision
UNION ALL SELECT 'requests',count(*) FROM tendermatch_retrieval.escalation_request
UNION ALL SELECT 'authorizations',count(*) FROM tendermatch_retrieval.escalation_authorization
UNION ALL SELECT 'jobs',count(*) FROM tendermatch_retrieval.escalation_job
UNION ALL SELECT 'artifacts',count(*) FROM tendermatch_retrieval.escalation_artifact
UNION ALL SELECT 'events',count(*) FROM tendermatch_retrieval.escalation_event;
SELECT indexname,indexdef FROM pg_indexes WHERE schemaname='tendermatch_retrieval'
AND tablename LIKE 'escalation_%' ORDER BY indexname;
SELECT run_id,outcome_hash,pair_count,review_count,audit_count
FROM tendermatch_retrieval.shortlist_completion;
```

Writer SELECT on all seven; INSERT only on plan, decision, request, job and artifact;
state-column UPDATE only on job. No writer INSERT on authorization/event, no identity
UPDATE, DELETE/TRUNCATE, DDL or direct definer-function access. Report verified
target and successful COMMIT to the worker; a Console success toast alone does not
replace the table/marker/completion checks.

## Guarded writer continuation after owner confirmation

```powershell
$env:TENDERMATCH_APPROVED_PROJECT_ID='dry-union-87553313'
$env:TENDERMATCH_APPROVED_BRANCH_ID='br-polished-boat-b1qddx0m'
$env:TENDERMATCH_APPROVED_ENDPOINT='ep-dark-dew-b15ctyr1.c-5.eu-central-1.aws.neon.tech'
node scripts/tendermatch-stage7.mjs execute --execute-approved
node scripts/tendermatch-stage7.mjs replay --execute-approved
node scripts/tendermatch-validate-stage7.mjs verify --execute-approved
```

Expected: one immutable plan, 28,034 decisions (500 planned review, 18,031 budget
deferred, 9,503 audit-explicit-only), 500 automatic request intents, **zero** execution
grants/jobs/artifacts/events and zero actual model calls/tokens/cost. Persisted intent
is blocked from execution by an absent adapter and absent owner authority; it is
not a silently queued AI batch. Full readback, deterministic replay, unchanged
protected state, security/index/size/performance evidence and the final full suite
must pass before a local commit. Stop for orchestrator review; no deployment.

The down migration destroys Stage 7 history and requires separate explicit
destructive approval. It is not an ordinary retry, refresh or rollback authorization.

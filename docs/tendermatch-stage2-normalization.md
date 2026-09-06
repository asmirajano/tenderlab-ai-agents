# Stage 2 — reusable source features (development only)

Owner: TL-A031. This is an isolated input-normalization experiment, not a scoring
run, readiness decision, deployment, or replacement of the deployed 17 × 60 pilot.
The approved Stage 1 manifest remains immutable. Read each complete source in its
own bounded repeatable-read transaction, reconcile every ID/version/content hash,
and fail before persistence on drift. Sources are not one global transaction.
Ordinary drift requires registering a new complete Stage 1 boundary first.

## Mapping fixed before persistence

| Input | Normalized field | Meaning and lineage |
| --- | --- | --- |
| Safe supplier profile canonical_entity_id, profile_version_id/version, batch_id/code, contract_version | identity + sourceVersion + sourceReferences | Exact pinned IDs; no name-based merging or latest-version selection |
| legal_name, display_name, country_code, entity_type_code | displayName, legalName, geography, entityType | Source identity, not independently verified capability |
| classification + classification_value_class + classification_claim_ids | procurementType nullable + classification evidence | Preserve 100 null classifications; never infer from name or products. SQL NOT NULL projection uses literal `MISSING`, while JSON retains null |
| profile_state; readiness_status/version; verification_status | sourceState | Report source state only; no new readiness/eligibility/Fit assignment |
| All 22 approved safe evidence fields | claims (one per claim, with field/source_field) | Keep status, value class, claim/profile/source-record/artifact IDs, artifact hash/availability, retrieval time; UNKNOWN produces null, not zero |
| product_families, works_specializations, industries_served, materials | formulaInputs.technical | Existing Formula v1.1 lexical/concept primitives only; no Fit/points. Other source fields are NOT silently aliased into Formula operands |
| capacity; geographic_markets | formulaInputs.capacity/market | Existing usable-claim and confidence-band primitives; source order explicitly field then claim ID. No tender comparison |
| main_activity, product_categories, products_portfolio, manufacturing_capabilities_capacity, materials_specs, installation_after_sales | capabilities (claim references) + general terms | Preserve original semantics; not automatic Formula compatibility |
| geographic_markets, export_markets, local_presence | locations (claim references) | Export reach, presence and identity country remain separate; no delivery feasibility inference |
| financial, turnover_scale, capacity, manufacturing_capabilities_capacity | quantities | Conservative named metric parsing. Retain source excerpt, qualifier, range, scale, currency, period, unit. Unsupported structure remains MISSING with reason; no annualization, FX, or metric substitution |
| certifications; project_references; moq_lead_time_incoterms; compliance_risks | credentials / experience / delivery / risk claim references | Source claims or MISSING, never approval/clearance or extracted requirements guessed from prose |
| Tender Stage 1 explicit HASH_FIELDS | member provenance + original base hash | Same server-side jsonb SHA and source version; original body never archived in feature store |
| title, procurementType | title + formulaInputs technical terms/concepts | Title and source scope only; no separately structured `object` exists in source, so it stays MISSING |
| tender_tags → tags (declared FK) | tags with id, label, slug, kind, origin; general lexical terms | Preserve derived/reference origin. Not promoted into Formula technical evidence until origin eligibility is separately approved |
| primaryCountryId → countries.id/name/isoAlpha2/isoAlpha3 | country + geography | Exact FK, nullable; add consumed lookup data to entity cache identity. No geocoding |
| budgetAmount/budgetCurrency/budgetUsd | budget fields with source refs | Exact decimal strings, zero preserved; USD field is source-reported derived amount, not a new conversion; no supplier turnover inference |
| deadlineAt, publishedAt, sourceTimezone, deadlineSourceText | sourceDates | Verbatim timestamp-without-time-zone plus source timezone; no invented UTC offset or clock-dependent freshness stored |
| sourceId/feedId/externalRef/sourceRef/sourceNoticeUrl/contentHash/dataVersion | sourceReferences | Stable source links, not proof of independent verification |
| description | bounded transient lexical input only | At most 12,000 source characters; no persisted raw body. Explicit truncation/structured-requirement limitation. Long descriptions do not enter Formula technical terms |

Supplier evidence may be SOURCE and INFERRED simultaneously: these dimensions are
orthogonal. Deterministic tokenization is CALCULATED, not verified evidence. Existing
Formula confidence bands (100/50/30/0, unavailable artifact capped at 30) are retained
only as prepared operand metadata; missing aggregate confidence is null, never a
positive trust claim. Full Formula behavior and weights are unchanged.

## Conservative quantities and gaps

Parse only a named metric followed by a colon and an unambiguous number/range;
recognize explicit scale thousand/million/billion/trillion, ISO currency, units and
period qualifiers (including an explicit crore scale and fiscal-year range). A
small unit-led grammar also recognizes employee ranges, floor space, plant-country
coverage, projects per year and manufacturing-experience years; compound statements
remain unparsed. Preserve both source decimal strings and calculated scaled
amounts as decimal strings. Production sites, plants, employees, throughput,
capacity, backlog, revenue, sales, profit and order book are different named
metrics. Ambiguous punctuation, multiple metrics, unsupported formats or missing
metric/unit/currency retain text and MISSING typed amounts with reasons. Missing
period is explicit and blocks cross-period comparison, not input preservation.
Certificates, experience, lead time and structured tender thresholds are not
invented from lexical overlap. No translation: Unicode tokens survive, but the
existing concept dictionary is English-only. This is a disclosed limitation.

Financial metrics require currency; marketplace annotations such as `(Verified)`
are never units, currencies or independent verification. Units use an explicit
allowlist. Financial metrics cannot be accepted merely because trailing words are
present. Source wording and status remain linked even when typed amounts are MISSING.

## Reuse and storage

`featureKey = SHA256(kind, entity ID, source version, Stage 1 base content hash,
all consumed projection/lookup hashes, normalizer/schema/adapter version,
normalizer dependency code hash)`. Manifest ID, capture time and execution time
are not cache operands. Related country/tag values AND relationship origin/IDs
are hashed per tender, unlike Stage 1's inventory-only hash. No other related
tables are consumed. Supplier profile and complete safe evidence hashes cover all
supplier inputs. One source-entity change invalidates that entity, not every pair.

Every manifest member receives one compact `normalized_feature` and exactly one
manifest association with NORMALIZED, LIMITED or QUARANTINED normalization state.
These states describe extraction completeness, not matching eligibility/readiness.
Malformed identity/association/hash boundaries fail the whole capture; semantic
gaps remain LIMITED; unresolved source profile identity is QUARANTINED. Each
feature retains reasons and explicit missing fields. No silent omission.

Reuse existing immutable normalized_feature, add only normalization_snapshot and
normalization_member in approved results development database. No fake
evaluation_run/run_feature is created. Writer inherits SELECT/INSERT only, with
tenant GUC isolation, immutable/sealed associations and same-transaction complete
membership. GUC is a trusted-service boundary, NOT end-user authentication.
Existing lexical indexes are maintained by PostgreSQL on insert; no search,
embedding model, ANN activation, shortlist or ranking is executed.

## Runbook

The Stage 2 runner defaults to a disconnected plan. Explicit `inspect` is read-only;
`execute` also persists features/associations and proves an unchanged second pass.
Both require the existing fresh Console attestations, `--execute-approved`,
explicit Stage 1 manifest identity and existing restricted secret files. `migrate`
accepts temporary existing owner credentials in memory only, applies the guarded
development-only additive SQL, and does not create/rotate roles or credentials.
Never load the writable tender `.env`. Never print driver errors or credentials.

Source loading, normalization and persistence are bounded by pages and payload
limits. All Stage 1 hashes are verified before any feature persistence; cached
features are revalidated against their content hash before reuse. Full readback
reconciles membership, feature key/content hash and outcome hash. A second execution
must insert zero features/associations. Synthetic tests prove one-entity and lookup
invalidation without mutating source data. Reports contain aggregate counts and
safe hashes, not source bodies or contacts. Stop after Stage 2 review evidence.

Commands (from the authoritative worktree, after fresh Console verification):

```text
node --experimental-strip-types scripts/tendermatch-normalize-inputs.mjs plan
node --experimental-strip-types scripts/tendermatch-normalize-inputs.mjs inspect --execute-approved
node --experimental-strip-types scripts/tendermatch-normalize-inputs.mjs execute --execute-approved
```

Set non-secret `TENDERMATCH_INPUT_MANIFEST_ID` to the exact approved manifest and
`TENDERMATCH_TENDER_ENV_FILE` to the existing read-only tender env file. Reuse
`TENDERMATCH_APPROVED_PROJECT_ID/BRANCH_ID/ENDPOINT`,
`TENDERMATCH_TENDER_PROJECT_ID/BRANCH_ID/ENDPOINT`, and
`TENDERMATCH_CONSOLE_VERIFIED_AT` attestations from the Stage 1 runbook. Set
`TENDERMATCH_STAGE2_REPORT=docs/evidence/<reviewable-report>.json` for a bounded safe
local report. The two supplier/result secrets remain in their ignored existing
files. Never put a credential in a command argument or report. A source-drift
`inspect` stops; an explicitly approved `execute` uses the unchanged Stage 1
registration function to preserve the prior manifest and register a complete new
boundary before feature writes. Other source/pin/contract failures stop outright.

Migration `050-normalization-up.sql` was executed once. Do not reapply it to an
installed schema: the base-version guard deliberately rejects that operation.
`050-normalization-down.sql` is an operator-reviewed rollback plan, not executed.
It would retire only the two new association tables/functions and preserve feature
history and Stage 1 manifests; archive association evidence before authorizing it.

Explicit-ID feature inspection as the restricted results login:

```sql
BEGIN READ ONLY;
SELECT set_config('tendermatch.tenant_id', 'tendermatch-development-stage1', true);
SELECT m.kind, m.entity_id, m.state, m.reasons, f.feature
FROM tendermatch_retrieval.normalization_member m
JOIN tendermatch_retrieval.normalized_feature f USING (tenant_id, feature_key)
WHERE m.tenant_id = 'tendermatch-development-stage1'
  AND m.normalization_id = $1 AND m.kind = $2 AND m.entity_id > $3::uuid
ORDER BY m.entity_id LIMIT 100;
ROLLBACK;
```

Use the exact normalization ID in the Stage 2 evidence; never select “latest”.

### Actual-output correction ledger

| What happened | Root cause / layer | Correction | Reusable rule | Regression evidence |
| --- | --- | --- | --- | --- |
| First full isolated pass parsed three currency-less export-revenue claims with `(Verified)` as their unit | Semantic mapping accepted arbitrary nonnumeric trailing text as a unit | Require currency for named financial metrics and whitelist physical units; preserve source annotation without trusting it | A marketplace label never supplies a missing monetary dimension or upgrades evidence status | Dedicated three-case annotation test; corrected full replay before any feature persistence |
| Ordinary source census changed from 17,323 to 17,333 OPEN tenders | Source ingestion continued after Stage 1, not an adapter discrepancy | Preserve the old manifest and register a new complete boundary using the unchanged Stage 1 runner | Validate bodies against an exact registered input boundary; never mix clocks/versions silently | Both immutable manifests, fresh full readback, zero duplicate rows on Stage 1 retry |

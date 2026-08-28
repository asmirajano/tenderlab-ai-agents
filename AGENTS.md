# Tender AI Agents project instructions

## Knowledge layers

Keep three layers separate:

1. **Agent Strategy & Simulation** — canonical 64-Agent identity, architecture, Case orchestration, and deterministic demonstrations. Preserve `AGENT_ARCHITECTURE_PLAN.md` unless a task explicitly changes that layer.
2. **Real Agent Development Methodology** — the empirical path from an approved capability to a tested practical Agent. Follow `docs/real-tender-agent-development-methodology.md` and its machine-readable policy for real client-facing Agent work.
3. **Agent-specific knowledge** — domain rules, schemas, fixtures, limitations, and regressions owned by the relevant package and documentation, such as TenderBalance/FIN-1 or TENDER LOGISTICS COST.

Do not solve a production-development problem by rewriting the canonical registry or by treating a simulation as operational evidence.

## Real practical-Agent changes

Before implementing uncertain extraction, classification, estimation, or decision logic:

- confirm canonical placement, TOR, real input, primary output, consumer, and human-authority boundary;
- test the method on authorized realistic evidence in an isolated experiment before adding it to production;
- inspect actual outputs and record failures as `What happened → Root cause → Correction → Reusable rule → Regression evidence`;
- separate source documents, structure-only templates, supporting material, and explicit user assertions before canonicalization;
- preserve `SOURCE`, `CALCULATED`, `ESTIMATED`, `ASSUMED`, and `MISSING` semantics even when an Agent uses more specific local vocabulary;
- recover format-aware structure before semantic mapping, and diagnose whether a failure belongs to loading, decoding, perception, structure, mapping, validation, review, persistence, or export;
- drive the primary result, saved Case, exports, visuals, and downstream forms from one complete canonical composite result model;
- keep Agent/global pages separate from Case-scoped outputs and retain explicit Case identity;
- treat recognition, structural, semantic, arithmetic/domain, and human-review confidence as distinct dimensions rather than presenting extraction confidence as overall trust;
- block only on semantically required information, and give the client an actionable next step for every blocker;
- keep persistence, review, approval, and release as distinct truthful states, including preliminary Case retention when the product contract permits it.

Use synthetic fixtures only when they are clearly labelled. Never commit or deploy confidential source documents for regression convenience. Run the relevant focused tests plus the production build and broader suite in proportion to the change. Bind release evidence to input/result identity, code or model version, generated artifacts, validation verdict, and current documentation. Deployment remains a separately authorized release gate and must be followed by an authorized deployed-equivalent representative replay when the claim requires it.

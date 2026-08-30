# Campaign Studio — unplaced future capability candidate

Status: historical knowledge retained from the TenderBoost migration. This is not a registered TenderApps product, practical product number, canonical Agent, implementation record, route, runtime, or development authorization.

Campaign Studio is explicitly outside TenderMatch and `agent:TL-A031`. Before any future implementation it must independently pass the canonical 64-Agent placement audit and receive one approved disposition. No assumption is made that it requires Agent 65 or any new canonical identity.

## Reusable historical policy

The retained design knowledge is:

- start from a versioned Supplier × Tender × Match × Verification result;
- exclude unassessed/MISSING, genuine zero, closed, suppressed, opted-out, legally blocked, and duplicate-open pairs;
- keep Match Score, company readiness, evidence quality, urgency, prioritization, and human decision separate;
- use only relevant reviewed evidence for external claims;
- keep objective, channel, and exact content under consultant control;
- represent one logical record linked to Supplier, Tender, Match, and Case;
- use an explicit lifecycle with approval provenance;
- derive follow-up or response state only from actual event records;
- never claim a message, call, CRM handoff, delivery, response, or no-response observation without the corresponding authorized integration or auditable manual event.

## Decisions required before placement or development

1. Canonical owner or multi-Agent workflow boundary.
2. Primary finished product and consumer.
3. Recommendation/drafting authority versus external activation authority.
4. Dataset ownership for drafts, events, suppression, consent, delivery, and responses.
5. Static workspace versus authenticated server-side runtime.
6. Tenant isolation, contact-data controls, retention, and authorization policy.
7. Approved evidence experiment and release gates.

Historical code remains recoverable through Git history at checkpoint `6db8a75` and the frozen standalone source. It is deliberately absent from the active TenderMatch Case/result contract and UI.

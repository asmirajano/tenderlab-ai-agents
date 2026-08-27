export const logisticsCostingProcessDefinition = {
  id: "process-definition:TL-PD-LOGISTICS-COSTING",
  version: "0.1.0",
  name: "Contract logistics and Incoterms costing",
  kind: "case-scoped" as const,
  canonicalOwnerAgentId: "agent:TL-A050",
  trigger: "A quotation, tender, purchase order, shipment or contract requires a logistics cost model, Incoterms conversion or scenario comparison.",
  stateModel: ["draft", "inputs-under-review", "calculable", "provisional", "ready-for-approval", "approved", "superseded"],
  executions: [
    { order: 1, agentId: "agent:TL-A021", role: "Optional document intake and source manifest" },
    { order: 2, agentId: "agent:TL-A046", role: "Optional quotation normalization" },
    { order: 3, agentId: "agent:TL-A050", role: "Required costing, responsibility logic and scenario calculation" },
    { order: 4, agentId: "agent:TL-A003", role: "Evidence and provenance packaging" },
    { order: 5, agentId: "agent:TL-A002", role: "Human approval of final cost basis when used commercially" },
  ],
  artifacts: [
    { id: "artifact:logistics-input-manifest", producer: "process-instance", consumers: ["agent:TL-A046", "agent:TL-A050"] },
    { id: "artifact:logistics-costing-scenario", producer: "process-instance", consumers: ["agent:TL-A036", "agent:TL-A037", "agent:TL-A049", "agent:TL-A051", "agent:TL-A054", "agent:TL-A062", "agent:TL-A063"] },
    { id: "artifact:logistics-costing-audit-pack", producer: "process-instance", consumers: ["agent:TL-A003", "agent:TL-A004", "agent:TL-A002"] },
  ],
  completion: "A versioned scenario reconciles source totals, records all inputs and overrides, has no blocking validation findings, and is either marked provisional or approved by the authorised human.",
  runtimeBoundary: "This version is a deterministic client-side prototype. It does not claim persistent Process Instance, Agent Execution journal, governed Artifact storage or approval enforcement.",
} as const;

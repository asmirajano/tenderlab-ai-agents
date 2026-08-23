import type { AgentRevision } from "../../catalog-schema/src/agent-specification";
import { agentSpecifications } from "./agents.ts";

const migrationRevisions: AgentRevision[] = agentSpecifications.map((agent) => ({
  id: `agent-revision:${agent.registryId.split(":")[1]}-1.0.0`,
  agentId: agent.registryId,
  toVersion: "1.0.0",
  date: "2026-08-23",
  changedFields: ["identity", "governance", "profile", "output", "platformRole"],
  summary: "Existing Agent definition migrated to Canonical Agent Specification schema.",
  rationale: "Faithful architectural migration; approved names, responsibilities, classifications, mappings and case assignments were not rewritten.",
  status: "recorded",
}));

const approvedReviewRevisions: AgentRevision[] = [{
  id: "agent-revision:TL-A013-1.1.0",
  agentId: "agent:TL-A013",
  fromVersion: "1.0.0",
  toVersion: "1.1.0",
  date: "2026-08-23",
  changedFields: ["profile.scope", "profile.activities", "profile.exclusions", "profile.boundary", "output", "handoffs"],
  summary: "Separated technical source-item typing from downstream tender business classification.",
  rationale: "Approved Agent-by-Agent review decision: Agent 13 owns technical publication typing for ingestion/routing; Agent 15 owns business taxonomy.",
  status: "approved",
}];

export const agentRevisions: AgentRevision[] = [...migrationRevisions, ...approvedReviewRevisions];

export function revisionsForAgent(agentId: string) {
  return agentRevisions.filter((revision) => revision.agentId === agentId);
}

for (const agent of agentSpecifications) {
  const latest = revisionsForAgent(agent.registryId).at(-1);
  if (!latest || latest.toVersion !== agent.governance.specificationVersion) {
    throw new Error(`${agent.registryId} governance version must match its latest revision.`);
  }
}

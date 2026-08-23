import type { AgentRelationship, AgentRelationshipEndpoint } from "../../catalog-schema/src/agent-specification";
import { agents, subagentParentIds } from "./agents.ts";

const normalizeName = (value: string) => value.toLowerCase().replace(/&/g, "and").replace(/\bagent\b/g, "").replace(/[^a-z0-9]+/g, " ").trim();
const agentByName = new Map<string, (typeof agents)[number]>();
for (const agent of agents) {
  for (const name of [agent.name, ...agent.previousNames]) agentByName.set(normalizeName(name), agent);
}

function endpoint(label: string, unresolvedKind: "external" | "process"): AgentRelationshipEndpoint {
  const resolved = agentByName.get(normalizeName(label));
  return resolved
    ? { kind: "agent", ref: resolved.registryId, label: resolved.name }
    : { kind: unresolvedKind, ref: `${unresolvedKind}:${normalizeName(label).replace(/ /g, "-") || "unresolved"}`, label };
}

const supports: AgentRelationship[] = Object.entries(subagentParentIds).flatMap(([childId, parentIds]) => {
  const child = agents.find((agent) => agent.id === Number(childId))!;
  return parentIds.map((parentId) => {
    const parent = agents.find((agent) => agent.id === parentId)!;
    return {
      id: `agent-relationship:supports-${child.registryId.split(":")[1]}-${parent.registryId.split(":")[1]}`,
      type: "supports",
      source: endpoint(child.name, "process"),
      target: endpoint(parent.name, "process"),
      rationale: `${child.name} поддерживает bounded responsibility ${parent.name} в канонической Hierarchy view.`,
      status: "validated",
    };
  });
});

const overlaps: AgentRelationship[] = agents.flatMap((agent) => agent.profile.potentialOverlaps.flatMap((finding, findingIndex) =>
  finding.agentIds.map((counterpartId, counterpartIndex) => {
    const counterpart = agents.find((candidate) => candidate.id === counterpartId);
    return {
      id: `agent-relationship:overlap-${agent.registryId.split(":")[1]}-${String(findingIndex + 1).padStart(2, "0")}-${String(counterpartIndex + 1).padStart(2, "0")}`,
      type: "overlaps",
      source: endpoint(agent.name, "process"),
      target: counterpart ? endpoint(counterpart.name, "process") : { kind: "external", ref: `agent-id:${counterpartId}`, label: `Agent ${counterpartId}` },
      rationale: finding.note,
      status: "working",
    };
  }),
));

const upstream: AgentRelationship[] = agents.flatMap((agent) =>
  agent.profile.upstream.map((label, index): AgentRelationship => ({
    id: `agent-relationship:upstream-${agent.registryId.split(":")[1]}-${String(index + 1).padStart(2, "0")}`,
    type: "upstream",
    source: endpoint(label, "external"),
    target: endpoint(agent.name, "process"),
    rationale: `Migrated from the approved upstream field of ${agent.name}; unresolved external labels remain explicit rather than being guessed.`,
    status: endpoint(label, "external").kind === "agent" ? "validated" : "working",
  })),
);

const handoffs: AgentRelationship[] = agents.flatMap((agent) =>
  agent.output.consumers
    .split("·")
    .map((label) => label.trim())
    .filter(Boolean)
    .map((label, index): AgentRelationship => ({
      id: `agent-relationship:handoff-${agent.registryId.split(":")[1]}-${String(index + 1).padStart(2, "0")}`,
      type: "handoff",
      source: endpoint(agent.name, "process"),
      target: endpoint(label, "process"),
      payload: agent.output.primary,
      artifacts: [...agent.output.artifacts],
      rationale: `Structured projection of the existing output consumer «${label}»; condition and approval remain unstructured until Agent-by-Agent review.`,
      status: endpoint(label, "process").kind === "agent" ? "validated" : "needs-review",
    })),
);

export const agentRelationships: AgentRelationship[] = [...supports, ...overlaps, ...upstream, ...handoffs];

export function relationshipsForAgent(agentId: string) {
  return agentRelationships.filter((relationship) => relationship.source.ref === agentId || relationship.target.ref === agentId);
}

const relationshipIds = new Set(agentRelationships.map((relationship) => relationship.id));
if (relationshipIds.size !== agentRelationships.length) throw new Error("Agent relationship IDs must be unique.");
if (agentRelationships.some((relationship) => !relationship.rationale.trim())) throw new Error("Every Agent relationship needs a rationale.");

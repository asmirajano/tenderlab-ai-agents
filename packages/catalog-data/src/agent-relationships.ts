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
      family: "capability",
      source: endpoint(child.name, "process"),
      target: endpoint(parent.name, "process"),
      requirement: "contextual",
      rationale: `${child.name} предоставляет ограниченную capability «${child.output.primary}», которая поддерживает более широкую ответственность ${parent.name} на этапе ${parent.profile.workflowStage}.`,
      evidence: [
        `Hierarchy: ${child.name} supports ${parent.name}`,
        `Child output: ${child.output.primary}`,
        `Parent scope: ${parent.profile.responsibilityScope}`,
      ],
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
      family: "boundary",
      source: endpoint(agent.name, "process"),
      target: counterpart ? endpoint(counterpart.name, "process") : { kind: "external", ref: `agent-id:${counterpartId}`, label: `Agent ${counterpartId}` },
      requirement: "review",
      rationale: finding.note,
      evidence: [
        `Boundary review: ${agent.profile.responsibilityBoundary}`,
        `Key distinction: ${agent.profile.keyDistinction}`,
      ],
      status: "working",
    };
  }),
));

const upstream: AgentRelationship[] = agents.flatMap((agent) =>
  agent.profile.upstream.map((label, index): AgentRelationship => ({
    id: `agent-relationship:upstream-${agent.registryId.split(":")[1]}-${String(index + 1).padStart(2, "0")}`,
    type: "upstream",
    family: "dependency",
    source: endpoint(label, "external"),
    target: endpoint(agent.name, "process"),
    requirement: endpoint(label, "external").kind === "agent" ? "required" : "review",
    rationale: endpoint(label, "external").kind === "agent"
      ? `${agent.name} указывает ${label} как upstream capability, необходимую до начала собственной bounded responsibility.`
      : `${label} указан как upstream input для ${agent.name}; источник остаётся внешним или требует отдельной архитектурной нормализации.`,
    evidence: [
      `Canonical upstream field: ${label}`,
      `Consumer trigger: ${agent.profile.trigger}`,
      `Consumer inputs: ${agent.profile.typicalInputs.join(" · ")}`,
    ],
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
      family: "sequence",
      source: endpoint(agent.name, "process"),
      target: endpoint(label, "process"),
      requirement: endpoint(label, "process").kind === "agent" ? "required" : "review",
      payload: agent.output.primary,
      artifacts: [...agent.output.artifacts],
      rationale: endpoint(label, "process").kind === "agent"
        ? `${agent.name} передаёт результат «${agent.output.primary}» в ${label}, который использует его как downstream input.`
        : `${agent.name} передаёт результат «${agent.output.primary}» в процесс или внешнего потребителя «${label}»; точная Agent-side граница требует review.`,
      evidence: [
        `Canonical output: ${agent.output.primary}`,
        `Output consumer: ${label}`,
        ...agent.output.artifacts.map((artifact) => `Artifact: ${artifact}`),
      ],
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
if (agentRelationships.some((relationship) => !relationship.evidence.length)) throw new Error("Every Agent relationship needs explicit evidence.");

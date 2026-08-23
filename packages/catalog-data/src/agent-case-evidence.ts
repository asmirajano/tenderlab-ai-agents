import type { AgentCaseEvidenceReference } from "../../catalog-schema/src/agent-specification";
import { agents } from "./agents.ts";

type CaseEvidenceGraphInput = {
  caseId: string;
  version: string;
  activities: Array<{ eventStep: number; title: string }>;
  agentExecutions: Array<{
    eventStep: number;
    agentId: number;
    role: string;
    input: string;
    output: string;
    handoff: string;
    evidence: string[];
    validationStatus: "confirmed" | "working" | "needs-review";
  }>;
};

/** Project case evidence without copying it into the reusable Agent definition. */
export function projectAgentCaseEvidence(graph: CaseEvidenceGraphInput): AgentCaseEvidenceReference[] {
  const eventTitleByStep = new Map(graph.activities.map((activity) => [activity.eventStep, activity.title]));
  return graph.agentExecutions.map((execution) => {
    const agent = agents.find((candidate) => candidate.id === execution.agentId);
    if (!agent) throw new Error(`Unknown Agent ${execution.agentId} in ${graph.caseId}.`);
    return {
      id: `agent-case-evidence:${graph.caseId}-E${String(execution.eventStep).padStart(2, "0")}-${agent.registryId.split(":")[1]}`,
      agentId: agent.registryId,
      caseId: graph.caseId,
      caseVersion: graph.version,
      eventStep: execution.eventStep,
      eventTitle: eventTitleByStep.get(execution.eventStep) ?? `Event ${execution.eventStep}`,
      role: execution.role,
      input: execution.input,
      output: execution.output,
      handoff: execution.handoff,
      evidence: [...execution.evidence],
      validationStatus: execution.validationStatus,
    };
  });
}

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
  processes: Array<{ id: string; name: string }>;
  processAgentExecutions: Array<{
    processId: string;
    agentId: number;
    role: string;
    input: string;
    output: string;
    handoff: string;
    validationStatus: "confirmed" | "working" | "needs-review";
  }>;
};

/** Project case evidence without copying it into the reusable Agent definition. */
export function projectAgentCaseEvidence(graph: CaseEvidenceGraphInput): AgentCaseEvidenceReference[] {
  const eventTitleByStep = new Map(graph.activities.map((activity) => [activity.eventStep, activity.title]));
  const eventEvidence = graph.agentExecutions.map((execution) => {
    const agent = agents.find((candidate) => candidate.id === execution.agentId);
    if (!agent) throw new Error(`Unknown Agent ${execution.agentId} in ${graph.caseId}.`);
    return {
      id: `agent-case-evidence:${graph.caseId}-E${String(execution.eventStep).padStart(2, "0")}-${agent.registryId.split(":")[1]}`,
      agentId: agent.registryId,
      caseId: graph.caseId,
      caseVersion: graph.version,
      nodeKind: "event" as const,
      nodeRef: `activity-${String(execution.eventStep).padStart(2, "0")}`,
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
  const processNames = new Map(graph.processes.map((process) => [process.id, process.name]));
  const processEvidence = graph.processAgentExecutions.map((execution) => {
    const agent = agents.find((candidate) => candidate.id === execution.agentId);
    if (!agent) throw new Error(`Unknown Agent ${execution.agentId} in ${graph.caseId}/${execution.processId}.`);
    return {
      id: `agent-case-evidence:${graph.caseId}-${execution.processId}-${agent.registryId.split(":")[1]}`,
      agentId: agent.registryId,
      caseId: graph.caseId,
      caseVersion: graph.version,
      nodeKind: "process" as const,
      nodeRef: execution.processId,
      eventTitle: processNames.get(execution.processId) ?? execution.processId,
      role: execution.role,
      input: execution.input,
      output: execution.output,
      handoff: execution.handoff,
      evidence: [`PROCESS ${execution.processId}: explicit Agent participation outside Event assignment.`],
      validationStatus: execution.validationStatus,
    };
  });
  return [...eventEvidence, ...processEvidence];
}

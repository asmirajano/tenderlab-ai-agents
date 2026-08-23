"use client";

import type { ReactNode } from "react";
import { agents, type Agent } from "../packages/catalog-data/src/agents";

type ReferenceSegment =
  | { type: "text"; value: string }
  | { type: "agent"; agent: Agent };

const explicitAliases: Record<number, string[]> = {
  1: ["Orchestrator", "TenderLab Orchestrator"],
  2: ["Human Approval", "human approval"],
  3: ["Evidence & Provenance", "Provenance", "Evidence"],
  4: ["Audit & Version Control", "Version Control"],
  5: ["Knowledge Graph", "Tender Knowledge Graph"],
  6: ["Company Profile"], 7: ["Product & Capability"], 8: ["Company Verification"],
  9: ["Tender Readiness Score", "Readiness"], 10: ["Credential & Certificate", "Credential Agent"],
  11: ["Supplier Intelligence"], 12: ["Partner Capability Graph"],
  13: ["Tender Source Acquisition", "Source Ingestion", "Source Acquisition"],
  14: ["Tender Discovery", "Discovery"], 15: ["Tender Classification", "Classification"],
  16: ["Tender Filtering", "Filtering"], 17: ["Tender Alert & Deadline", "Alerts"],
  18: ["Market Intelligence"], 19: ["Tender Award Intelligence", "Award Intelligence"],
  20: ["Buyer & Competitor Intelligence", "Buyer Intelligence"], 21: ["Document Intake"],
  22: ["Tender OCR & Translation", "OCR & Language", "OCR / Translation"], 23: ["Tender Structure"],
  24: ["Requirement Parser"], 25: ["Eligibility & Qualification", "Eligibility"],
  26: ["Evaluation Criteria"], 27: ["Deliverables & Forms", "Deliverables"],
  28: ["Specification Fidelity", "Strict-Spec"], 29: ["Amendment & Change", "Amendment"],
  30: ["Pre-Bid Clarification", "Ambiguity & Clarification", "Ambiguity Agent"],
  31: ["Company-to-Tender Match Score", "Match Score"],
  32: ["Participation Solution-Fit", "Solution-Based Matching", "Solution-Fit"],
  33: ["Participation Route"], 34: ["Tender Gap Remediation", "Gap Analysis", "Gap Remediation"],
  35: ["Bid / No-Bid Decision", "Bid / No-Bid", "Bid Decision"],
  36: ["Pre-Bid Execution Feasibility", "Capacity & Execution", "Execution Feasibility"],
  37: ["Commercial Attractiveness"], 38: ["Risk & Integrity"], 39: ["Solution Architecture"],
  40: ["Partner Discovery"], 41: ["JV & Consortium Optimization", "JV Optimization"],
  42: ["Local Service & Representation", "Local Representation"], 43: ["Supplier Discovery"],
  44: ["Supplier Verification"], 45: ["RFQ Orchestrator"], 46: ["Quotation Normalization"],
  47: ["Compliance Matrix"], 48: ["Technical Compliance"], 49: ["Commercial Compliance"],
  50: ["Cost & Landed-Price", "Cost & Landed Price"], 51: ["Pricing & BOQ"],
  52: ["Proposal Strategy"], 53: ["Technical Proposal"], 54: ["Commercial Proposal"],
  55: ["Bid Credentials & Experience", "Credentials & Experience"],
  56: ["Bid QA & Red Team", "Bid QA", "Red Team"], 57: ["Legal & Contract Review", "Legal Review"],
  58: ["Document Assembly & Submission", "Document Assembly", "Submission Agent"],
  59: ["Post-Bid Clarification Response", "Clarification Response"],
  60: ["Presentation & Negotiation"], 61: ["Award-to-Contract", "Award & Contract"],
  62: ["Execution & Logistics", "Execution Agent"],
  63: ["Payment & Contract Administration", "Contract Administration"],
  64: ["Tender Outcome Learning", "Outcome Learning"],
};

const aliases = agents.flatMap((agent) => {
  const names = [
    agent.name,
    agent.name.replace(/ Agent$/, ""),
    ...(agent.previousNames ?? []),
    ...(agent.previousNames ?? []).map((name) => name.replace(/ Agent$/, "")),
    ...(explicitAliases[agent.id] ?? []),
  ];
  return [...new Set(names)]
    .filter((alias) => alias.length >= 6)
    .map((alias) => ({ alias, agent }));
}).sort((left, right) => right.alias.length - left.alias.length);

function isWordCharacter(value: string | undefined) {
  return Boolean(value && /[A-Za-zА-Яа-яЁё0-9]/.test(value));
}

export function resolveAgentReferences(text: string, subjectAgentId?: number): ReferenceSegment[] {
  const matches: Array<{ start: number; end: number; agent: Agent }> = [];

  for (const { alias, agent } of aliases) {
    if (agent.id === subjectAgentId) continue;
    let start = text.indexOf(alias);
    while (start >= 0) {
      const end = start + alias.length;
      const overlaps = matches.some((match) => start < match.end && end > match.start);
      const bounded = !isWordCharacter(text[start - 1]) && !isWordCharacter(text[end]);
      if (!overlaps && bounded) matches.push({ start, end, agent });
      start = text.indexOf(alias, start + 1);
    }
  }

  matches.sort((left, right) => left.start - right.start || right.end - left.end);
  if (!matches.length) return [{ type: "text", value: text }];

  const segments: ReferenceSegment[] = [];
  let cursor = 0;
  for (const match of matches) {
    if (match.start < cursor) continue;
    if (match.start > cursor) segments.push({ type: "text", value: text.slice(cursor, match.start) });
    segments.push({ type: "agent", agent: match.agent });
    cursor = match.end;
  }
  if (cursor < text.length) segments.push({ type: "text", value: text.slice(cursor) });
  return segments;
}

export function AgentReferenceButton({ agent, onOpenAgent }: { agent: Agent; onOpenAgent?: (agent: Agent) => void }) {
  const label = `${agent.name} (${agent.id})`;
  if (!onOpenAgent) return <span className="agent-reference-label">{label}</span>;
  return (
    <a
      href={`#agent-${agent.id}`}
      className="agent-inline-reference"
      data-agent-reference-id={agent.id}
      onClick={(event) => {
        event.preventDefault();
        onOpenAgent(agent);
        window.dispatchEvent(new CustomEvent("tenderlab:open-agent-reference", { detail: { agentId: agent.id } }));
      }}
      aria-label={`Открыть профиль ${label}`}
      title={`Open ${label}`}
    >
      {label}<span aria-hidden="true">↗</span>
    </a>
  );
}

export function AgentReferenceText({
  text,
  subjectAgentId,
  onOpenAgent,
}: {
  text: string;
  subjectAgentId?: number;
  onOpenAgent?: (agent: Agent) => void;
}) {
  return <>{resolveAgentReferences(text, subjectAgentId).map((segment, index): ReactNode => segment.type === "text"
    ? <span key={`${index}-${segment.value}`}>{segment.value}</span>
    : <AgentReferenceButton key={`${index}-${segment.agent.id}`} agent={segment.agent} onOpenAgent={onOpenAgent} />)}</>;
}

export function AgentReferenceList({
  items,
  subjectAgentId,
  onOpenAgent,
  className,
}: {
  items: string[];
  subjectAgentId?: number;
  onOpenAgent?: (agent: Agent) => void;
  className?: string;
}) {
  return <ul className={className}>{items.map((item) => <li key={item}><AgentReferenceText text={item} subjectAgentId={subjectAgentId} onOpenAgent={onOpenAgent} /></li>)}</ul>;
}

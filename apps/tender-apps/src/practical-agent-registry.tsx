export type PracticalAgentVisualKind = "balance" | "logistics";

export type PracticalAgentDisplay = {
  id: `agent:${string}`;
  canonicalName: string;
  displayName: string;
  functionalSubtitle: string;
  description: string;
  href: `/${string}`;
  pageTitle: string;
  status: string;
  visual: PracticalAgentVisualKind;
};

export const practicalAgents: readonly PracticalAgentDisplay[] = [
  {
    id: "agent:TL-A008",
    canonicalName: "TenderBalance",
    displayName: "TenderBalance",
    functionalSubtitle: "Company Verification Agent",
    description: "Digitize, validate, review, approve, compare, and export balance-sheet evidence.",
    href: "/balance-sheet-review",
    pageTitle: "Tender Apps — TenderBalance",
    status: "MVP simulation",
    visual: "balance",
  },
  {
    id: "agent:TL-A050",
    canonicalName: "TENDER LOGISTICS COST",
    displayName: "Tender Logistics Cost",
    functionalSubtitle: "Transport, logistics and Incoterms cost estimation",
    description: "Estimate cargo, packing, transport requirements, freight, insurance and landed cost for tender shipments.",
    href: "/landed-cost",
    pageTitle: "Tender Apps — Tender Logistics Cost",
    status: "MVP simulation",
    visual: "logistics",
  },
] as const;

export function PracticalAgentVisual({ kind }: { kind: PracticalAgentVisualKind }) {
  if (kind === "balance") {
    return (
      <div className="client-agent-visual" aria-hidden="true">
        <svg viewBox="0 0 260 170" focusable="false">
          <rect className="agent-visual-sheet" x="41" y="19" width="150" height="132" rx="13" />
          <path className="agent-visual-fold" d="M159 19v31h32" />
          <path className="agent-visual-rule" d="M63 59h72M63 76h46M63 97h47M63 118h47M128 76v57" />
          <rect className="agent-visual-cell" x="139" y="70" width="31" height="13" rx="4" />
          <rect className="agent-visual-cell" x="139" y="91" width="31" height="13" rx="4" />
          <rect className="agent-visual-cell" x="139" y="112" width="31" height="13" rx="4" />
          <circle className="agent-visual-seal" cx="196" cy="120" r="28" />
          <path className="agent-visual-check" d="m183 120 9 9 18-21" />
        </svg>
        <span>Structured financial evidence</span>
      </div>
    );
  }

  return (
    <div className="client-agent-visual" aria-hidden="true">
      <svg viewBox="0 0 260 170" focusable="false">
        <path className="agent-visual-route" d="M31 45h51c24 0 25-20 49-20h62" />
        <circle className="agent-visual-node" cx="31" cy="45" r="7" />
        <circle className="agent-visual-node" cx="193" cy="25" r="7" />
        <rect className="agent-visual-trailer" x="34" y="72" width="133" height="57" rx="9" />
        <path className="agent-visual-cab" d="M167 88h31l24 24v17h-55z" />
        <path className="agent-visual-cargo" d="M46 83h45v35H46zM99 83h56v35H99z" />
        <circle className="agent-visual-wheel" cx="70" cy="136" r="13" />
        <circle className="agent-visual-wheel" cx="188" cy="136" r="13" />
        <circle className="agent-visual-seal" cx="214" cy="65" r="25" />
        <path className="agent-visual-cost" d="M214 49v32m10-25c-3-6-20-7-20 1 0 10 21 4 21 14 0 8-17 8-22 1" />
      </svg>
      <span>Cargo movement and cost</span>
    </div>
  );
}

import { clientProducts, type ClientProduct } from "../../../packages/catalog-data/src/client-products";

export type PracticalAgentVisualKind = "balance" | "logistics" | "tendermatch";

export type PracticalAgentDisplay = {
  id: `agent:${string}`;
  canonicalName: string;
  displayName: string;
  functionalSubtitle: string;
  description: string;
  href: `/${string}`;
  pageTitle: string;
  status: string;
  surfaceStatus: string;
  catalogOrder: number;
  productId: string;
  visual: PracticalAgentVisualKind;
};

type PracticalAgentDisplayMetadata = {
  productId: string;
  displayName: string;
  functionalSubtitle: string;
  description: string;
  pageTitle: string;
  visual: PracticalAgentVisualKind;
};

const displayMetadata: readonly PracticalAgentDisplayMetadata[] = [
  {
    productId: "product:TA-BALANCE",
    displayName: "TenderBalance",
    functionalSubtitle: "Company Verification Agent",
    description: "Digitize, validate, review, approve, compare, and export balance-sheet evidence.",
    pageTitle: "Tender Apps — TenderBalance",
    visual: "balance",
  },
  {
    productId: "product:TA-LANDED-COST",
    displayName: "Tender Logistics Cost",
    functionalSubtitle: "Transport, logistics and Incoterms cost estimation",
    description: "Estimate cargo, packing, transport requirements, freight, insurance and landed cost for tender shipments.",
    pageTitle: "Tender Apps — Tender Logistics Cost",
    visual: "logistics",
  },
  {
    productId: "product:TA-TENDERBOOST",
    displayName: "TenderMatch",
    functionalSubtitle: "Frozen-source parity · evidence-linked Company × Tender review",
    description: "Use TenderMatch to review frozen Company × Tender evidence, audited matching support, missing information, freshness, and a human-controlled consultant disposition.",
    pageTitle: "Tender Apps — TenderMatch · Agent 03",
    visual: "tendermatch",
  },
] as const;

function displayStatus(product: ClientProduct) {
  return product.status === "mvp-simulation" ? "MVP simulation" : product.status.replaceAll("-", " ");
}

export const practicalAgents: readonly PracticalAgentDisplay[] = displayMetadata
  .map((metadata) => {
    const product = clientProducts.find((candidate) => candidate.id === metadata.productId);
    if (!product) throw new Error(`Practical Agent display metadata references missing product ${metadata.productId}.`);
    return {
      ...metadata,
      id: product.ownerAgentId as `agent:${string}`,
      canonicalName: product.name,
      href: product.clientRoute as `/${string}`,
      status: displayStatus(product),
      surfaceStatus: product.surfaceStatus,
      catalogOrder: product.catalogOrder,
    };
  })
  .sort((left, right) => left.catalogOrder - right.catalogOrder);

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

  if (kind === "logistics") return (
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

  return (
    <div className="client-agent-visual" aria-hidden="true">
      <svg viewBox="0 0 260 170" focusable="false">
        <circle className="agent-visual-boost-ring" cx="78" cy="83" r="48" />
        <circle className="agent-visual-boost-company" cx="78" cy="83" r="17" />
        <path className="agent-visual-boost-link" d="M102 62 153 39M103 87l54 10M99 108l48 31" />
        <circle className="agent-visual-boost-node" cx="166" cy="34" r="15" />
        <circle className="agent-visual-boost-node" cx="174" cy="101" r="20" />
        <circle className="agent-visual-boost-node" cx="159" cy="144" r="12" />
        <rect className="agent-visual-boost-brief" x="194" y="68" width="48" height="64" rx="8" />
        <path className="agent-visual-boost-lines" d="M205 86h25m-25 11h25m-25 11h17" />
        <path className="agent-visual-boost-arrow" d="m207 119 7 7 15-19" />
      </svg>
      <span>Evidence-linked match explanation</span>
    </div>
  );
}

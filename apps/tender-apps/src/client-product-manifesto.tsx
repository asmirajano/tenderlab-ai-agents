import type { ReactNode } from "react";
import {
  PracticalAgentOverview,
  PracticalAgentOverviewPart,
  type PracticalAgentOverviewAudience,
} from "./practical-agent-overview.tsx";
import "./client-product-manifesto.css";

type ClientProductManifestoProps = {
  audience: PracticalAgentOverviewAudience;
  eyebrow: ReactNode;
  title: ReactNode;
  promise: ReactNode;
  input: ReactNode;
  transformation: ReactNode;
  output: ReactNode;
  actions: ReactNode;
  productId: string;
};

/**
 * TenderBalance compatibility composition over the audience-neutral practical-
 * Agent Overview contract. The existing client visual remains unchanged.
 */
export function ClientProductManifesto({
  audience,
  eyebrow,
  title,
  promise,
  input,
  transformation,
  output,
  actions,
  productId,
}: ClientProductManifestoProps) {
  return (
    <PracticalAgentOverview audience={audience} className="client-product-manifesto" productId={productId} aria-labelledby="client-product-manifesto-title">
      <PracticalAgentOverviewPart as="header" className="client-product-manifesto__header" part="outcome-promise">
        <div>{eyebrow}</div>
        <h1 id="client-product-manifesto-title">{title}</h1>
        <p>{promise}</p>
      </PracticalAgentOverviewPart>

      <div className="client-product-manifesto__story" aria-label="Client input, agent transformation, and finished product">
        <PracticalAgentOverviewPart className="client-product-manifesto__input" part="input">{input}</PracticalAgentOverviewPart>
        <PracticalAgentOverviewPart className="client-product-manifesto__transform" part="agent-transformation">{transformation}</PracticalAgentOverviewPart>
        <PracticalAgentOverviewPart className="client-product-manifesto__output" part="finished-output">{output}</PracticalAgentOverviewPart>
      </div>

      <PracticalAgentOverviewPart className="client-product-manifesto__actions" part="primary-action">{actions}</PracticalAgentOverviewPart>
    </PracticalAgentOverview>
  );
}

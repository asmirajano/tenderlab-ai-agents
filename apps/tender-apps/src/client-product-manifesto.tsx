import type { ReactNode } from "react";
import "./client-product-manifesto.css";

type ClientProductManifestoProps = {
  eyebrow: ReactNode;
  title: ReactNode;
  promise: ReactNode;
  input: ReactNode;
  transformation: ReactNode;
  output: ReactNode;
  actions: ReactNode;
};

/**
 * Shared first-screen pattern for practical client agents:
 * client material -> compact agent transformation -> tangible client product.
 */
export function ClientProductManifesto({
  eyebrow,
  title,
  promise,
  input,
  transformation,
  output,
  actions,
}: ClientProductManifestoProps) {
  return (
    <section className="client-product-manifesto" aria-labelledby="client-product-manifesto-title">
      <header className="client-product-manifesto__header">
        <div>{eyebrow}</div>
        <h1 id="client-product-manifesto-title">{title}</h1>
        <p>{promise}</p>
      </header>

      <div className="client-product-manifesto__story" aria-label="Client input, agent transformation, and finished product">
        <div className="client-product-manifesto__input">{input}</div>
        <div className="client-product-manifesto__transform">{transformation}</div>
        <div className="client-product-manifesto__output">{output}</div>
      </div>

      <div className="client-product-manifesto__actions">{actions}</div>
    </section>
  );
}

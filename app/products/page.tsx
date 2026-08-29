import TopNavigation from "../top-navigation";
import { clientProducts, type ClientProduct } from "../../packages/catalog-data/src/client-products";
import { realAgentImplementations } from "../../packages/catalog-data/src/real-agent-development";
import "./products.css";

const clientAppBaseUrl = process.env.NEXT_PUBLIC_TENDER_APPS_URL;

function clientProductUrl(product: ClientProduct) {
  const baseUrl = clientAppBaseUrl ?? product.localPreviewUrl;
  return new URL(product.clientRoute, baseUrl).toString();
}

export default function ClientProductsPage() {
  return (
    <main className="products-page">
      <TopNavigation active="products" />
      <section className="products-hero">
        <div>
          <p><span /> INTERNAL CONTROL PLANE · TEAM AND ADMIN ONLY</p>
          <h1>Client products,<br /><em>managed separately.</em></h1>
          <p>Open and govern client-facing Tender Apps here without exposing the Command Center, its strategy, or its administration routes to clients.</p>
        </div>
        <aside>
          <span>ACCESS BOUNDARY</span>
          <strong>One-way administration</strong>
          <p>Command Center → client product is allowed for authorized staff. Client product → Command Center is prohibited.</p>
          <div><b>Current policy</b><span>Separate origin · server authorization required</span></div>
        </aside>
      </section>

      <section className="products-register" aria-label="Client product register">
        <div className="products-register-head">
          <div><span>01 / TENDER APPS</span><h2>Product register</h2></div>
          <b>{clientProducts.length} products</b>
        </div>
        {[...clientProducts].sort((left, right) => left.catalogOrder - right.catalogOrder).map((product) => {
          const agentNumber = Number(product.ownerAgentId.match(/A(\d+)$/)?.[1] ?? 0);
          const anchor = product.commandCenterPath.split("#")[1] ?? product.id;
          const implementation = realAgentImplementations.find((item) => item.clientProductId === product.id);
          const isDeployed = implementation?.deploymentStatus !== "not-deployed";
          return <article id={anchor} className="product-card" key={product.id}>
            <div className="product-identity">
              <span>{String(product.catalogOrder).padStart(2, "0")} · {product.id}</span>
              <h2>{product.name}</h2>
              <p>{product.descriptor}</p>
              <div><b>{product.status.replaceAll("-", " ")}</b><small>{product.dataNotice}</small></div>
            </div>
            <div className="product-contract">
              <span>PRODUCT BOUNDARY</span>
              <dl>
                <div><dt>Umbrella</dt><dd>{product.family}</dd></div>
                <div><dt>Capability owner</dt><dd>{product.ownerAgentId}</dd></div>
                <div><dt>Client audience</dt><dd>Assigned client users and reviewers</dd></div>
                <div><dt>Command Center access</dt><dd>None</dd></div>
              </dl>
            </div>
            <div className="product-actions">
              <span>TEAM ACTIONS</span>
              {isDeployed
                ? <a className="product-open" href={clientProductUrl(product)} rel="noreferrer" target="_blank">Open {product.name} ↗</a>
                : <span className="product-open product-open-disabled">Local integration only · not deployed</span>}
              <a href={`/agents#agent-${agentNumber}`}>Open owner Agent</a>
              <span className="product-schema">{product.schemaPath}</span>
              <p>{product.surfaceStatus}. The client surface remains separate from internal routes and does not grant Command Center access.</p>
            </div>
          </article>;
        })}
      </section>

      <section className="products-access-grid" aria-label="Access model">
        <article><span>COMMAND CENTER</span><strong>Team + administrators</strong><p>Strategy, architecture, product governance, Agent and Dataset management.</p><b>Custom allowlist</b></article>
        <i aria-hidden="true">→</i>
        <article><span>CLIENT PRODUCT</span><strong>Assigned client users</strong><p>Document intake, extraction review, correction, approval, comparison, and export.</p><b>No internal routes</b></article>
      </section>
    </main>
  );
}

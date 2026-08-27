import TopNavigation from "../top-navigation";
import { clientProducts, landedCostProduct, tenderBalanceProduct } from "../../packages/catalog-data/src/client-products";
import "./products.css";

const clientAppUrl = process.env.NEXT_PUBLIC_TENDER_BALANCE_URL ?? tenderBalanceProduct.localPreviewUrl;
const landedCostAppUrl = process.env.NEXT_PUBLIC_TENDER_APPS_URL ?? landedCostProduct.localPreviewUrl;

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
        <article id="tenderbalance" className="product-card">
          <div className="product-identity">
            <span>{tenderBalanceProduct.id}</span>
            <h2>{tenderBalanceProduct.name}</h2>
            <p>{tenderBalanceProduct.descriptor}</p>
            <div><b>{tenderBalanceProduct.status.replaceAll("-", " ")}</b><small>Simulation data only</small></div>
          </div>
          <div className="product-contract">
            <span>PRODUCT BOUNDARY</span>
            <dl>
              <div><dt>Umbrella</dt><dd>{tenderBalanceProduct.family}</dd></div>
              <div><dt>Capability owner</dt><dd>{tenderBalanceProduct.ownerAgentId}</dd></div>
              <div><dt>Client audience</dt><dd>Assigned client users and reviewers</dd></div>
              <div><dt>Command Center access</dt><dd>None</dd></div>
            </dl>
          </div>
          <div className="product-actions">
            <span>TEAM ACTIONS</span>
            <a className="product-open" href={clientAppUrl} rel="noreferrer" target="_blank">Open TenderBalance ↗</a>
            <a href="/agents#agent-8">Open owner Agent</a>
            <span className="product-schema">Schema v1.0.0 · repository contract</span>
            <p>The app URL must resolve on a different origin in production. Do not add client identities to the Command Center allowlist.</p>
          </div>
        </article>
        <article id="landed-cost" className="product-card">
          <div className="product-identity">
            <span>{landedCostProduct.id}</span>
            <h2>{landedCostProduct.name}</h2>
            <p>{landedCostProduct.descriptor}</p>
            <div><b>{landedCostProduct.status.replaceAll("-", " ")}</b><small>Simulation data only</small></div>
          </div>
          <div className="product-contract">
            <span>PRODUCT BOUNDARY</span>
            <dl>
              <div><dt>Umbrella</dt><dd>{landedCostProduct.family}</dd></div>
              <div><dt>Capability owner</dt><dd>{landedCostProduct.ownerAgentId}</dd></div>
              <div><dt>Client audience</dt><dd>Assigned client users and reviewers</dd></div>
              <div><dt>Command Center access</dt><dd>None</dd></div>
            </dl>
          </div>
          <div className="product-actions">
            <span>TEAM ACTIONS</span>
            <a className="product-open" href={landedCostAppUrl} rel="noreferrer" target="_blank">Open Landed Cost Studio ↗</a>
            <a href="/agents#agent-50">Open owner Agent</a>
            <span className="product-schema">Audit schema v0.1 · repository contract</span>
            <p>The app remains separate from internal routes and does not grant Command Center access.</p>
          </div>
        </article>
      </section>

      <section className="products-access-grid" aria-label="Access model">
        <article><span>COMMAND CENTER</span><strong>Team + administrators</strong><p>Strategy, architecture, product governance, Agent and Dataset management.</p><b>Custom allowlist</b></article>
        <i aria-hidden="true">→</i>
        <article><span>CLIENT PRODUCT</span><strong>Assigned client users</strong><p>Document intake, extraction review, correction, approval, comparison, and export.</p><b>No internal routes</b></article>
      </section>
    </main>
  );
}

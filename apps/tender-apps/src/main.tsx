import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import LogisticsCostingApp from "./logistics-costing-app";
import "./client-shell.css";
import "./logistics-costing.css";

function TenderAppsProduct() {
  return (
    <div className="tender-apps-product">
      <header className="client-product-bar">
        <div className="client-brand" aria-label="TenderApps">
          <span className="client-brand-mark" aria-hidden="true"><i /><i /><i /></span>
          <span><strong>TenderApps</strong><small>by TenderLab.ai</small></span>
        </div>
        <nav aria-label="TenderApps modules">
          <span aria-current="page">Landed Cost Studio</span>
        </nav>
        <div className="client-surface-status">
          <i aria-hidden="true" />
          <span>Client workspace</span>
          <small>Phase 1 · under validation</small>
        </div>
      </header>
      <LogisticsCostingApp />
    </div>
  );
}

const root = document.getElementById("root");
if (!root) throw new Error("TenderApps root element is missing");

createRoot(root).render(
  <StrictMode>
    <TenderAppsProduct />
  </StrictMode>,
);

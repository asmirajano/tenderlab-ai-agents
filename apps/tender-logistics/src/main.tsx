import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import LogisticsCostingApp from "./logistics-costing-app";
import { LayoutSwitcher, useLayoutPreference } from "./layout-switcher";
import { installVitePreloadRecovery } from "./preload-recovery";
import "./client-shell.css";
import "./logistics-costing.css";
import "./logistics-responsive.css";

function LogisticsProduct() {
  const [layoutMode, setLayoutMode] = useLayoutPreference();
  const pathname = window.location.pathname.replace(/\/+$/, "") || "/";
  const supported = ["/", "/landed-cost", "/logistics-costing"].includes(pathname);
  return (
    <div className="tender-apps-product" data-layout={layoutMode}>
      <header className="client-product-bar">
        <div className="client-brand" aria-label="TenderApps">
          <span className="client-brand-mark" aria-hidden="true"><i /><i /><i /></span>
          <span><strong>TenderApps</strong><small>by TenderLab.ai</small></span>
        </div>
        <div className="client-header-controls">
          <nav className="client-agent-nav" aria-label="Tender Logistics navigation">
            <a href="https://tenderapps-ai.web.app/">Catalog</a>
            <a href="/landed-cost" aria-current={supported ? "page" : undefined}>Tender Logistics</a>
          </nav>
          <LayoutSwitcher value={layoutMode} onChange={setLayoutMode} />
        </div>
        <div className="client-surface-status"><i aria-hidden="true" /><span>Client workspace</span><small>Isolated development extraction · not deployed</small></div>
      </header>
      {supported ? <LogisticsCostingApp /> : <main style={{ padding: "140px 32px" }}><h1>Page not found</h1><a href="/landed-cost">Open Tender Logistics</a></main>}
    </div>
  );
}
const root = document.getElementById("root");
if (!root) throw new Error("Tender Logistics root element is missing");
installVitePreloadRecovery();
createRoot(root).render(<StrictMode><LogisticsProduct /></StrictMode>);

import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import TenderMatchApp from "./tendermatch-app";
import { LayoutSwitcher, useLayoutPreference } from "./layout-switcher";
import { installVitePreloadRecovery } from "./preload-recovery";
import "./client-shell.css";
import "./tendermatch.css";
import "./financial-data-typography.css";

function MatchProduct() {
  const [layoutMode, setLayoutMode] = useLayoutPreference();
  const pathname = window.location.pathname.replace(/\/+$/, "") || "/";
  const supported = ["/", "/tendermatch"].includes(pathname) || ["/tenderboost", "/tenderboost-ai", "/tendermatch/campaigns", "/tendermatch/followups", "/tenderboost/campaigns", "/tenderboost-ai/followups"].includes(pathname);
  const development = new URL(window.location.href).searchParams.get("mode") === "all-to-all-dev";
  return (
    <div className="tender-apps-product" data-layout={layoutMode}>
      <header className="client-product-bar">
        <div className="client-brand" aria-label="TenderApps">
          <span className="client-brand-mark" aria-hidden="true"><i /><i /><i /></span>
          <span><strong>TenderApps</strong><small>by TenderLab.ai</small></span>
        </div>
        <div className="client-header-controls">
          <nav className="client-agent-nav" aria-label="TenderMatch navigation">
            <a href="https://tenderapps-ai.web.app/">Catalog</a>
            <a href="/tendermatch" aria-current={supported ? "page" : undefined}>TenderMatch</a>
          </nav>
          <LayoutSwitcher value={layoutMode} onChange={setLayoutMode} />
        </div>
        <div className="client-surface-status"><i aria-hidden="true" /><span>Client workspace</span><small>{development ? "All-to-all development · Authenticated session required · No model execution" : "Isolated development extraction · Pinned snapshot · not deployed"}</small></div>
      </header>
      {supported ? <TenderMatchApp /> : <main style={{ padding: "140px 32px" }}><h1>Page not found</h1><a href="/tendermatch">Open TenderMatch</a></main>}
    </div>
  );
}
const root = document.getElementById("root");
if (!root) throw new Error("TenderMatch root element is missing");
installVitePreloadRecovery();
createRoot(root).render(<StrictMode><MatchProduct /></StrictMode>);

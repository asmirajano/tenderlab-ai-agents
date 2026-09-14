import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import BalanceSheetApp from "./balance-sheet-app";
import { LayoutSwitcher, useLayoutPreference } from "./layout-switcher";
import { installVitePreloadRecovery } from "./preload-recovery";
import "./balance-sheet.css";
import "./client-shell.css";
import "./financial-data-typography.css";

function BalanceProduct() {
  const [layoutMode, setLayoutMode] = useLayoutPreference();
  const pathname = window.location.pathname.replace(/\/+$/, "") || "/";
  const supported = ["/", "/balance-sheet-review", "/tenderbalance"].includes(pathname);
  return (
    <div className="tender-apps-product" data-layout={layoutMode}>
      <header className="client-product-bar">
        <div className="client-brand" aria-label="TenderApps">
          <span className="client-brand-mark" aria-hidden="true"><i /><i /><i /></span>
          <span><strong>TenderApps</strong><small>by TenderLab.ai</small></span>
        </div>
        <div className="client-header-controls">
          <nav className="client-agent-nav" aria-label="TenderBalance navigation">
            <a href="https://tenderapps-ai.web.app/">Catalog</a>
            <a href="/balance-sheet-review" aria-current={supported ? "page" : undefined}>TenderBalance</a>
          </nav>
          <LayoutSwitcher value={layoutMode} onChange={setLayoutMode} />
        </div>
<div className="client-surface-status"><i aria-hidden="true" /><span>Client workspace</span><small>{import.meta.env.PROD ? 'Independent application' : 'Isolated development extraction · not deployed'}</small></div>
      </header>
      {supported ? <BalanceSheetApp /> : <main style={{ padding: "140px 32px" }}><h1>Page not found</h1><a href="/balance-sheet-review">Open TenderBalance</a></main>}
    </div>
  );
}
const root = document.getElementById("root");
if (!root) throw new Error("TenderBalance root element is missing");
installVitePreloadRecovery();
createRoot(root).render(<StrictMode><BalanceProduct /></StrictMode>);

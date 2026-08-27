/* eslint-disable @next/next/no-html-link-for-pages -- this is a Vite SPA with Firebase rewrites */

import { StrictMode, useEffect } from "react";
import { createRoot } from "react-dom/client";
import BalanceSheetApp from "./balance-sheet-app";
import CatalogPage from "./catalog-page";
import { LayoutSwitcher, useLayoutPreference } from "./layout-switcher";
import LogisticsCostingApp from "./logistics-costing-app";
import "./balance-sheet.css";
import "./client-shell.css";
import "./logistics-costing.css";

const routes = {
  "/": { label: "Agent catalog", title: "Tender Apps — Practical Agent catalog", component: <CatalogPage /> },
  "/balance-sheet-review": { label: "TenderBalance", title: "Tender Apps — TenderBalance", component: <BalanceSheetApp /> },
  "/landed-cost": { label: "Landed Cost Studio", title: "Tender Apps — Landed Cost Studio", component: <LogisticsCostingApp /> },
} as const;

function normalizePath(pathname: string) {
  const normalized = pathname.replace(/\/+$/, "") || "/";
  return normalized === "/tenderbalance" ? "/balance-sheet-review" : normalized === "/logistics-costing" ? "/landed-cost" : normalized;
}

function TenderAppsProduct() {
  const path = normalizePath(window.location.pathname);
  const route = routes[path as keyof typeof routes] ?? routes["/"];
  const [layoutMode, setLayoutMode] = useLayoutPreference();

  useEffect(() => {
    document.title = route.title;
  }, [route.title]);

  return (
    <div className="tender-apps-product" data-layout={layoutMode}>
      <header className="client-product-bar">
        <div className="client-brand" aria-label="TenderApps">
          <span className="client-brand-mark" aria-hidden="true"><i /><i /><i /></span>
          <span><strong>TenderApps</strong><small>by TenderLab.ai</small></span>
        </div>
        <div className="client-header-controls">
          <nav aria-label="Tender Apps practical Agents">
            <a aria-current={path === "/" ? "page" : undefined} href="/">Catalog</a>
            <a aria-current={path === "/balance-sheet-review" ? "page" : undefined} href="/balance-sheet-review">TenderBalance</a>
            <a aria-current={path === "/landed-cost" ? "page" : undefined} href="/landed-cost">Landed Cost</a>
          </nav>
          <LayoutSwitcher value={layoutMode} onChange={setLayoutMode} />
        </div>
        <div className="client-surface-status">
          <i aria-hidden="true" />
          <span>Client workspace</span>
          <small>{route.label} · Phase 1</small>
        </div>
      </header>
      {route.component}
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

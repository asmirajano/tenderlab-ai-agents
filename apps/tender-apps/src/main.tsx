/* eslint-disable @next/next/no-html-link-for-pages -- this is a Vite SPA with Firebase rewrites */

import { StrictMode, useEffect, type ReactNode } from "react";
import { createRoot } from "react-dom/client";
import BalanceSheetApp from "./balance-sheet-app";
import CatalogPage from "./catalog-page";
import { LayoutSwitcher, useLayoutPreference } from "./layout-switcher";
import LogisticsCostingApp from "./logistics-costing-app";
import { installVitePreloadRecovery } from "./preload-recovery";
import { practicalAgents } from "./practical-agent-registry";
import TenderBoostApp from "./tenderboost-app";
import "./balance-sheet.css";
import "./client-shell.css";
import "./logistics-costing.css";
import "./tenderboost.css";

const pageComponents: Record<string, ReactNode> = {
  "/balance-sheet-review": <BalanceSheetApp />,
  "/landed-cost": <LogisticsCostingApp />,
  "/tenderboost": <TenderBoostApp />,
};

const routes: Record<string, { label: string; title: string; surfaceStatus: string; component: ReactNode }> = {
  "/": { label: "Agent catalog", title: "Tender Apps — Practical Agent catalog", surfaceStatus: "Product registry · no live processing", component: <CatalogPage /> },
  ...Object.fromEntries(practicalAgents.map((agent) => {
    const component = pageComponents[agent.href];
    if (!component) throw new Error(`Practical Agent ${agent.productId} has no routed page component.`);
    return [agent.href, { label: agent.displayName, title: agent.pageTitle, surfaceStatus: agent.surfaceStatus, component }];
  })),
};

const routeAliases: Record<string, string> = {
  "/tenderbalance": "/balance-sheet-review",
  "/logistics-costing": "/landed-cost",
  "/tenderboost-ai": "/tenderboost",
};

function normalizePath(pathname: string) {
  const normalized = pathname.replace(/\/+$/, "") || "/";
  return routeAliases[normalized] ?? normalized;
}

function TenderAppsProduct() {
  const path = normalizePath(window.location.pathname);
  const route = routes[path] ?? routes["/"];
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
          <div className="client-navigation-cluster">
            <a
              aria-current={path === "/" ? "page" : undefined}
              className="client-catalog-link"
              href="/"
            >
              <span aria-hidden="true" className="client-catalog-icon"><i /><i /><i /><i /></span>
              <span>Catalog</span>
            </a>
            <span aria-hidden="true" className="client-navigation-flow">→</span>
            <nav aria-label="Tender Apps practical Agents" className="client-agent-nav">
              {practicalAgents.map((agent) => (
                <a aria-current={path === agent.href ? "page" : undefined} href={agent.href} key={agent.id} title={agent.functionalSubtitle}>
                  <span aria-hidden="true" className="client-agent-link-index">{String(agent.catalogOrder).padStart(2, "0")}</span>
                  <span>{agent.displayName}</span>
                </a>
              ))}
            </nav>
          </div>
          <LayoutSwitcher value={layoutMode} onChange={setLayoutMode} />
        </div>
        <div className="client-surface-status">
          <i aria-hidden="true" />
          <span>Client workspace</span>
          <small>{route.label} · {route.surfaceStatus}</small>
        </div>
      </header>
      {route.component}
    </div>
  );
}

const root = document.getElementById("root");
if (!root) throw new Error("TenderApps root element is missing");

installVitePreloadRecovery();

createRoot(root).render(
  <StrictMode>
    <TenderAppsProduct />
  </StrictMode>,
);

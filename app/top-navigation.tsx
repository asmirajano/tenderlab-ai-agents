"use client";

/* eslint-disable @next/next/no-html-link-for-pages -- static Firebase pages use native route navigation */

import { useEffect, useRef } from "react";

export type PrimaryPage = "overview" | "architecture" | "agents" | "validation";

const navItems: Array<{ id: PrimaryPage; label: string; href: string }> = [
  { id: "overview", label: "Overview", href: "/" },
  { id: "architecture", label: "Architecture", href: "/architecture" },
  { id: "agents", label: "Agent Catalog", href: "/agents" },
  { id: "validation", label: "Validation", href: "/case-simulation" },
];

export default function TopNavigation({ active }: { active: PrimaryPage }) {
  const navRef = useRef<HTMLElement>(null);
  const activeLinkRef = useRef<HTMLAnchorElement>(null);

  useEffect(() => {
    const alignActiveLink = window.setTimeout(() => {
      const nav = navRef.current;
      const activeLink = activeLinkRef.current;
      if (!nav || !activeLink || nav.scrollWidth <= nav.clientWidth) return;
      nav.scrollTo({ left: activeLink.offsetLeft - (nav.clientWidth - activeLink.offsetWidth) / 2, behavior: "auto" });
    }, 0);
    return () => window.clearTimeout(alignActiveLink);
  }, [active]);

  return (
    <header className="topbar">
      <a className="brand" href="/" aria-label="TenderLab home">
        <span className="brand-mark"><i /><i /><i /></span>
        <span>TenderLab<span className="brand-dot">.ai</span></span>
      </a>
      <nav aria-label="Primary navigation" ref={navRef}>
        {navItems.map((item) => (
          <a
            aria-current={active === item.id ? "page" : undefined}
            className={active === item.id ? "nav-active" : undefined}
            href={item.href}
            key={item.id}
            ref={active === item.id ? activeLinkRef : undefined}
          >
            {item.label}
          </a>
        ))}
      </nav>
      <div className="product-jumps" aria-label="Related product surfaces">
        <a className="glossary-jump" href="https://tender-ecosystem-atlas.web.app/glossary?scope=tenderlab">Glossary <span>↗</span></a>
        <a className="atlas-jump" href="https://tender-ecosystem-atlas.web.app"><span className="atlas-long">Ecosystem Atlas</span><span className="atlas-short">Atlas</span><span>↗</span></a>
        <a className="core-jump" href="/agents"><span>●</span> 64 agents</a>
      </div>
    </header>
  );
}

/* eslint-disable @next/next/no-html-link-for-pages -- static Firebase pages use native route navigation */

export type PrimaryPage = "command-center" | "workflow" | "agents" | "main-run" | "case-simulation";

const navItems: Array<{ id: PrimaryPage; label: string; href: string }> = [
  { id: "command-center", label: "Command Center", href: "/" },
  { id: "workflow", label: "Workflow", href: "/workflow" },
  { id: "agents", label: "Agents", href: "/agents" },
  { id: "main-run", label: "Main Run", href: "/main-agents-run" },
  { id: "case-simulation", label: "Case Audit", href: "/case-simulation" },
];

export default function TopNavigation({ active }: { active: PrimaryPage }) {
  return (
    <header className="topbar">
      <a className="brand" href="/" aria-label="TenderLab home">
        <span className="brand-mark"><i /><i /><i /></span>
        <span>TenderLab<span className="brand-dot">.ai</span></span>
      </a>
      <nav aria-label="Primary navigation">
        {navItems.map((item) => (
          <a
            aria-current={active === item.id ? "page" : undefined}
            className={active === item.id ? "nav-active" : undefined}
            href={item.href}
            key={item.id}
          >
            {item.label}
          </a>
        ))}
      </nav>
      <a className="core-jump" href="/agents?mode=main"><span>●</span> Main 20</a>
    </header>
  );
}

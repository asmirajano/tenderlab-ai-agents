const practicalAgents = [
  {
    id: "agent:TL-A008",
    name: "TenderBalance",
    agent: "Company Verification Agent",
    description: "Digitize, validate, review, approve, compare, and export balance-sheet evidence.",
    href: "/balance-sheet-review",
    status: "MVP simulation",
  },
  {
    id: "agent:TL-A050",
    name: "Landed Cost Studio",
    agent: "Cost & Landed-Price Agent",
    description: "Model Incoterms conversion, logistics expenses, packing, routes, and landed-cost scenarios.",
    href: "/landed-cost",
    status: "MVP simulation",
  },
] as const;

export default function CatalogPage() {
  return (
    <main className="client-catalog">
      <section className="client-catalog-hero">
        <p><span /> UNIFIED CLIENT APPLICATION</p>
        <h1>Practical agents,<br /><em>one workspace.</em></h1>
        <div>
          <strong>{practicalAgents.length} available pages</strong>
          <p>Each practical Agent has a dedicated page inside Tender Apps. Internal Command Center routes and administration tools are not included.</p>
        </div>
      </section>

      <section className="client-agent-catalog" aria-label="Practical Agent catalog">
        {practicalAgents.map((item, index) => (
          <article key={item.id}>
            <span>{String(index + 1).padStart(2, "0")} · {item.id}</span>
            <h2>{item.name}</h2>
            <b>{item.agent}</b>
            <p>{item.description}</p>
            <footer><small>{item.status}</small><a href={item.href}>Open Agent page →</a></footer>
          </article>
        ))}
      </section>

      <section className="client-boundary-note">
        <span>ACCESS BOUNDARY</span>
        <strong>Client application only</strong>
        <p>Tender Apps contains practical workflows. TenderLab strategy, Agent administration, architecture, and validation remain in the separate team-only Command Center.</p>
      </section>
    </main>
  );
}

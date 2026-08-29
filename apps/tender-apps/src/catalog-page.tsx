import { PracticalAgentVisual, practicalAgents } from "./practical-agent-registry";

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
        {practicalAgents.map((item) => (
          <article className={`client-agent-card client-agent-card--${item.visual}`} key={item.id}>
            <header>
              <div className="client-agent-card-identity">
                <span>{String(item.catalogOrder).padStart(2, "0")} · {item.id}</span>
                <h2>{item.displayName}</h2>
                <b>{item.functionalSubtitle}</b>
              </div>
              <PracticalAgentVisual kind={item.visual} />
            </header>
            <p>{item.description}</p>
            <footer><small>{item.status}</small><a aria-label={`Open ${item.displayName}`} href={item.href}>Open Agent page →</a></footer>
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
